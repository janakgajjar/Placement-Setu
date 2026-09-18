package com.placementsetu.resume.service;

import com.placementsetu.common.enums.ResumeProcessingStatus;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.resume.ai.AiResumeParser;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.resume.storage.ResumeStorageService;
import com.placementsetu.student.entity.Project;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.entity.StudentSkill;
import com.placementsetu.student.repository.ProjectRepository;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.repository.StudentSkillRepository;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Section 6/15/21(6-9) of the workflow doc: upload -> extract text -> AI
 * parse (Gemini via Spring AI/MCP) -> map into the student's profile,
 * skills and projects. The approved schema has no resume_parsed_data table,
 * so nothing but file metadata is persisted on the Resume row itself — the
 * AI output is applied directly to StudentProfile/Skill/Project (Section 15:
 * "Structured Resume Data -> Student/Profile Service").
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SkillRepository skillRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ResumeStorageService resumeStorageService;
    private final FileTextExtractor fileTextExtractor;
    private final AiResumeParser aiResumeParser;
    private final ProfileValidationService profileValidationService;
    private final StudentProfileService studentProfileService;

    @Transactional
    public ResumeResponseDto uploadAndParse(UUID userId, MultipartFile file) throws Exception {
        StudentProfile profile = studentProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was uploaded");
        }

        String resumeText = fileTextExtractor.extractText(file);
        if (resumeText == null || resumeText.isBlank()) {
            throw new BadRequestException("No readable text found in the uploaded file: " + file.getOriginalFilename());
        }

        // One resume per student profile (resumes.student_profile_id is UNIQUE) — replace on re-upload.
        Resume resume = resumeRepository.findByStudentProfileId(profile.getId()).orElse(null);
        String previousStorageKey = resume == null ? null : resume.getStorageKey();

        String storageKey = resumeStorageService.store(file);

        if (resume == null) {
            resume = Resume.builder().studentProfileId(profile.getId()).build();
        }
        resume.setFileName(file.getOriginalFilename());
        resume.setFileType(file.getContentType());
        resume.setFileSize(file.getSize());
        resume.setStorageKey(storageKey);
        resume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
        resume = resumeRepository.save(resume);

        try {
            Map<String, Object> parsedData = aiResumeParser.parse(resumeText);
            applyParsedDataToProfile(profile, parsedData);

            resume.setProcessingStatus(ResumeProcessingStatus.COMPLETED);
            resume = resumeRepository.save(resume);

            if (previousStorageKey != null && !previousStorageKey.equals(storageKey)) {
                resumeStorageService.delete(previousStorageKey);
            }
        } catch (Exception e) {
            log.error("AI resume parsing failed for student profile {}: {}", profile.getId(), e.getMessage());
            resume.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(resume);
            // The file itself is stored either way — only the AI enrichment step failed.
        }

        profile.setProfileStatus(profileValidationService.computeProfileStatus(profile));
        profile = studentProfileRepository.save(profile);

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);

        return ResumeResponseDto.builder()
                .id(resume.getId())
                .fileName(resume.getFileName())
                .fileType(resume.getFileType())
                .fileSize(resume.getFileSize())
                .processingStatus(resume.getProcessingStatus())
                .uploadedAt(resume.getUploadedAt())
                .updatedProfile(studentProfileService.toResponse(profile, email))
                .build();
    }

    public ResumeResponseDto getMine(UUID userId) {
        StudentProfile profile = studentProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        Resume resume = resumeRepository.findByStudentProfileId(profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No resume uploaded yet"));

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);

        return ResumeResponseDto.builder()
                .id(resume.getId())
                .fileName(resume.getFileName())
                .fileType(resume.getFileType())
                .fileSize(resume.getFileSize())
                .processingStatus(resume.getProcessingStatus())
                .uploadedAt(resume.getUploadedAt())
                .updatedProfile(studentProfileService.toResponse(profile, email))
                .build();
    }

    @SuppressWarnings("unchecked")
    private void applyParsedDataToProfile(StudentProfile profile, Map<String, Object> parsedData) {
        if (parsedData == null || parsedData.containsKey("error")) {
            return; // AiResumeParser already fell back to a safe {error, raw_response} shape — nothing usable to map.
        }

        // Only fill in fields the student hasn't already provided themselves.
        if (isBlank(profile.getPhone()) && parsedData.get("phone") instanceof String phone && !phone.isBlank()) {
            profile.setPhone(phone);
        }
        if (isBlank(profile.getLinkedinUrl()) && parsedData.get("linkedin") instanceof String linkedin && !linkedin.isBlank()) {
            profile.setLinkedinUrl(linkedin);
        }
        if (isBlank(profile.getGithubUrl()) && parsedData.get("github") instanceof String github && !github.isBlank()) {
            profile.setGithubUrl(github);
        }

        Object skillsRaw = parsedData.get("skills");
        if (skillsRaw instanceof List<?> skillNames) {
            for (Object nameObj : skillNames) {
                if (nameObj == null) continue;
                String name = String.valueOf(nameObj).trim();
                if (name.isEmpty()) continue;

                Skill skill = skillRepository.findByNameIgnoreCase(name)
                        .orElseGet(() -> skillRepository.save(Skill.builder().name(name).build()));

                boolean alreadyLinked = studentSkillRepository.findByStudentProfileId(profile.getId()).stream()
                        .anyMatch(ss -> ss.getSkill().getId().equals(skill.getId()));
                if (!alreadyLinked) {
                    studentSkillRepository.save(new StudentSkill(profile, skill));
                }
            }
        }

        Object projectsRaw = parsedData.get("project");
        if (projectsRaw instanceof List<?> projectTitles) {
            List<Project> existing = projectRepository.findByStudentProfileId(profile.getId());
            for (Object titleObj : projectTitles) {
                if (titleObj == null) continue;
                String title = String.valueOf(titleObj).trim();
                if (title.isEmpty()) continue;

                boolean alreadyExists = existing.stream()
                        .anyMatch(p -> p.getTitle().equalsIgnoreCase(title));
                if (!alreadyExists) {
                    projectRepository.save(Project.builder()
                            .studentProfileId(profile.getId())
                            .title(title)
                            .build());
                }
            }
        }
        // "education" / "work_experience" summaries from the AI response are intentionally not
        // persisted — the approved schema has no columns for free-text summaries at profile level.
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
