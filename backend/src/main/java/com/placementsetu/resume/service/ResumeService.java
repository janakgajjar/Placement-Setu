package com.placementsetu.resume.service;

import org.springframework.transaction.annotation.Transactional;
import com.placementsetu.common.enums.ResumeProcessingStatus;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.resume.ai.AiResumeParser;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.resume.storage.ResumeStorageService;
import com.placementsetu.student.entity.Certification;
import com.placementsetu.student.entity.Project;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.entity.StudentSkill;
import com.placementsetu.student.repository.CertificationRepository;
import com.placementsetu.student.repository.ProjectRepository;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.repository.StudentSkillRepository;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

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
    private final com.placementsetu.notification.service.NotificationService notificationService;
    private final CertificationRepository certificationRepository;

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
        String contentType = file.getContentType();
        if (contentType != null && contentType.length() > 255) {
            contentType = contentType.substring(0, 255);
        }
        resume.setFileType(contentType != null ? contentType : "application/octet-stream");
        resume.setFileSize(file.getSize());
        resume.setStorageKey(storageKey);
        resume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
        resume = resumeRepository.save(resume);

        boolean parseSuccess = false;
        String failureReason = null;
        List<String> autoFilledFields = new java.util.ArrayList<>();
        try {
            Map<String, Object> parsedData = aiResumeParser.parse(resumeText);
            autoFilledFields = applyParsedDataToProfile(profile, parsedData);

            resume.setProcessingStatus(ResumeProcessingStatus.COMPLETED);
            resume = resumeRepository.save(resume);
            parseSuccess = true;

            if (previousStorageKey != null && !previousStorageKey.equals(storageKey)) {
                resumeStorageService.delete(previousStorageKey);
            }
        } catch (Exception e) {
            log.error("AI resume parsing failed for student profile {}: {}", profile.getId(), e.getMessage());
            failureReason = e.getMessage();
            resume.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(resume);
            // The file itself is stored either way — only the AI enrichment step failed.
        }

        profile.setProfileStatus(profileValidationService.computeProfileStatus(profile));
        profile = studentProfileRepository.save(profile);

        if (parseSuccess) {
            boolean hasMissingFields = (profile.getProfileStatus() == com.placementsetu.common.enums.ProfileStatus.INCOMPLETE);
            notificationService.notifyResumeProcessed(userId, profile.getFullName(), hasMissingFields);
        } else {
            notificationService.notifyResumeFailed(userId, profile.getFullName(), failureReason);
        }

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);

        return ResumeResponseDto.builder()
                .id(resume.getId())
                .fileName(resume.getFileName())
                .fileType(resume.getFileType())
                .fileSize(resume.getFileSize())
                .processingStatus(resume.getProcessingStatus())
                .uploadedAt(resume.getUploadedAt())
                .updatedProfile(studentProfileService.toResponse(profile, email))
                .autoFilledFields(autoFilledFields)
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
    private List<String> applyParsedDataToProfile(StudentProfile profile, Map<String, Object> parsedData) {
        List<String> autoFilled = new java.util.ArrayList<>();
        if (parsedData == null || parsedData.containsKey("error")) {
            return autoFilled; // AiResumeParser already fell back to a safe {error, raw_response} shape — nothing usable to map.
        }

        // Only fill in fields the student hasn't already provided themselves.
        if (isBlank(profile.getFullName()) && parsedData.get("name") instanceof String name && !name.isBlank()) {
            profile.setFullName(name.trim());
            autoFilled.add("Full Name");
        }
        if (isBlank(profile.getPhone()) && parsedData.get("phone") instanceof String phone && !phone.isBlank()) {
            profile.setPhone(phone.trim());
            autoFilled.add("Phone Number");
        }
        if (isBlank(profile.getCourse()) && parsedData.get("course") instanceof String course && !course.isBlank()) {
            profile.setCourse(course.trim());
            autoFilled.add("Course");
        }
        if (isBlank(profile.getInstitution()) && parsedData.get("institution") instanceof String inst && !inst.isBlank()) {
            profile.setInstitution(inst.trim());
            autoFilled.add("Institution");
        }
        if (profile.getCgpa() == null && parsedData.get("cgpa") != null) {
            try {
                String cgpaStr = String.valueOf(parsedData.get("cgpa")).replaceAll("[^0-9.]", "").trim();
                if (!cgpaStr.isEmpty()) {
                    profile.setCgpa(new java.math.BigDecimal(cgpaStr));
                    autoFilled.add("CGPA");
                }
            } catch (Exception ignored) {}
        }
        if (isBlank(profile.getLinkedinUrl()) && parsedData.get("linkedin") instanceof String linkedin && !linkedin.isBlank()) {
            profile.setLinkedinUrl(linkedin.trim());
            autoFilled.add("LinkedIn Profile");
        }
        if (isBlank(profile.getGithubUrl()) && parsedData.get("github") instanceof String github && !github.isBlank()) {
            profile.setGithubUrl(github.trim());
            autoFilled.add("GitHub Profile");
        }

        Object skillsRaw = parsedData.get("skills");
        if (skillsRaw instanceof List<?> skillNames) {
            int newSkillsCount = 0;
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
                    newSkillsCount++;
                }
            }
            if (newSkillsCount > 0) {
                autoFilled.add("Skills (" + newSkillsCount + " added)");
            }
        }

        Object projectsRaw = parsedData.get("project");
        if (projectsRaw instanceof List<?> projectTitles) {
            List<Project> existing = projectRepository.findByStudentProfileId(profile.getId());
            int newProjCount = 0;
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
                    newProjCount++;
                }
            }
            if (newProjCount > 0) {
                autoFilled.add("Projects (" + newProjCount + " added)");
            }
        }

        Object certsRaw = parsedData.get("certifications");
        if (certsRaw instanceof List<?> certList) {
            List<Certification> existingCerts = certificationRepository.findByStudentProfileId(profile.getId());
            int newCertsCount = 0;
            for (Object certObj : certList) {
                if (certObj == null) continue;
                String certName = String.valueOf(certObj).trim();
                if (certName.isEmpty()) continue;

                boolean alreadyExists = existingCerts.stream()
                        .anyMatch(c -> c.getName().equalsIgnoreCase(certName));
                if (!alreadyExists) {
                    certificationRepository.save(Certification.builder()
                            .studentProfileId(profile.getId())
                            .name(certName)
                            .build());
                    newCertsCount++;
                }
            }
            if (newCertsCount > 0) {
                autoFilled.add("Certifications (" + newCertsCount + " added)");
            }
        }

        return autoFilled;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Background Asynchronous Single Resume Upload (Non-blocking)
    // ─────────────────────────────────────────────────────────────────────────

    public ResumeResponseDto uploadAndParseAsync(UUID userId, MultipartFile file) throws Exception {
        StudentProfile profile = studentProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was uploaded");
        }

        // Validate and store file immediately
        String storageKey = resumeStorageService.store(file);

        Resume resume = resumeRepository.findByStudentProfileId(profile.getId()).orElse(null);
        if (resume == null) {
            resume = Resume.builder().studentProfileId(profile.getId()).build();
        }
        resume.setFileName(file.getOriginalFilename());
        String contentType = file.getContentType();
        if (contentType != null && contentType.length() > 255) {
            contentType = contentType.substring(0, 255);
        }
        resume.setFileType(contentType != null ? contentType : "application/octet-stream");
        resume.setFileSize(file.getSize());
        resume.setStorageKey(storageKey);
        resume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
        resume = resumeRepository.save(resume);

        final UUID studentId = profile.getId();
        final String origFileName = file.getOriginalFilename();
        final byte[] fileBytes = file.getBytes();

        // Process in background worker thread so student HTTP connection returns immediately
        CompletableFuture.runAsync(() -> {
            try {
                String resumeText = fileTextExtractor.extractTextFromBytes(fileBytes, origFileName);
                StudentProfile freshProfile = studentProfileRepository.findById(studentId).orElse(null);
                if (freshProfile != null && resumeText != null && !resumeText.isBlank()) {
                    Map<String, Object> parsedData = aiResumeParser.parse(resumeText);
                    applyParsedDataToProfile(freshProfile, parsedData);

                    Resume freshResume = resumeRepository.findByStudentProfileId(studentId).orElse(null);
                    if (freshResume != null) {
                        freshResume.setProcessingStatus(ResumeProcessingStatus.COMPLETED);
                        resumeRepository.save(freshResume);
                    }

                    freshProfile.setProfileStatus(profileValidationService.computeProfileStatus(freshProfile));
                    studentProfileRepository.save(freshProfile);

                    boolean hasMissing = freshProfile.getProfileStatus() == com.placementsetu.common.enums.ProfileStatus.INCOMPLETE;
                    notificationService.notifyResumeProcessed(userId, freshProfile.getFullName(), hasMissing);
                }
            } catch (Exception ex) {
                log.error("Async background resume parsing failed for student {}: {}", userId, ex.getMessage());
                Resume freshResume = resumeRepository.findByStudentProfileId(studentId).orElse(null);
                if (freshResume != null) {
                    freshResume.setProcessingStatus(ResumeProcessingStatus.FAILED);
                    resumeRepository.save(freshResume);
                }
                notificationService.notifyResumeFailed(userId, profile.getFullName(), ex.getMessage());
            }
        });

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
}
