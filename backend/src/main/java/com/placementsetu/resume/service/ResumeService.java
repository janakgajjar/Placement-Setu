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
import org.springframework.web.multipart.MultipartFile;

import com.placementsetu.resume.dto.ResumeBatchResponseDto;
import com.placementsetu.resume.entity.ResumeBatchJob;
import com.placementsetu.resume.entity.ResumeBatchItem;
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
    private final com.placementsetu.resume.repository.ResumeBatchJobRepository resumeBatchJobRepository;
    private final com.placementsetu.resume.repository.ResumeBatchItemRepository resumeBatchItemRepository;

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

        boolean parseSuccess = false;
        String failureReason = null;
        try {
            Map<String, Object> parsedData = aiResumeParser.parse(resumeText);
            applyParsedDataToProfile(profile, parsedData);

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
        resume.setFileType(file.getContentType());
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

    // ─────────────────────────────────────────────────────────────────────────
    // Batch Resume Processing for Officers / Admins
    // ─────────────────────────────────────────────────────────────────────────

    public ResumeBatchResponseDto submitBatchJob(UUID submitterUserId, String jobName, MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new BadRequestException("At least one resume file must be provided for batch processing.");
        }
        if (files.length > 50) {
            throw new BadRequestException("Batch limit exceeded: Maximum 50 resumes allowed per batch job.");
        }

        ResumeBatchJob batchJob = ResumeBatchJob.builder()
                .jobName(jobName != null && !jobName.isBlank() ? jobName : "Batch Resume Processing (" + files.length + " files)")
                .submittedByUserId(submitterUserId)
                .totalResumes(files.length)
                .status("PROCESSING")
                .build();
        batchJob = resumeBatchJobRepository.save(batchJob);

        List<ResumeBatchItem> items = new java.util.ArrayList<>();
        List<byte[]> filePayloads = new java.util.ArrayList<>();
        List<String> fileNames = new java.util.ArrayList<>();

        for (MultipartFile file : files) {
            ResumeBatchItem item = ResumeBatchItem.builder()
                    .batchJobId(batchJob.getId())
                    .fileName(file.getOriginalFilename())
                    .status("PENDING")
                    .build();
            item = resumeBatchItemRepository.save(item);
            items.add(item);
            try {
                filePayloads.add(file.getBytes());
                fileNames.add(file.getOriginalFilename());
            } catch (Exception e) {
                filePayloads.add(new byte[0]);
                fileNames.add(file.getOriginalFilename());
            }
        }

        final UUID batchId = batchJob.getId();

        // Process batch in background worker
        CompletableFuture.runAsync(() -> executeBatchProcessing(batchId, submitterUserId, items, filePayloads, fileNames));

        List<ResumeBatchResponseDto.ResumeBatchItemDto> itemDtos = items.stream()
                .map(i -> ResumeBatchResponseDto.ResumeBatchItemDto.builder()
                        .itemId(i.getId())
                        .fileName(i.getFileName())
                        .status(i.getStatus())
                        .build())
                .collect(Collectors.toList());

        return ResumeBatchResponseDto.fromEntity(batchJob, itemDtos);
    }

    private void executeBatchProcessing(UUID batchId, UUID submitterUserId, List<ResumeBatchItem> items, List<byte[]> payloads, List<String> fileNames) {
        log.info("Starting background execution for Resume Batch Job [{}] ({} items)", batchId, items.size());
        int success = 0;
        int failed = 0;

        for (int i = 0; i < items.size(); i++) {
            ResumeBatchItem item = items.get(i);
            byte[] bytes = payloads.get(i);
            String fileName = fileNames.get(i);

            try {
                String resumeText = fileTextExtractor.extractTextFromBytes(bytes, fileName);
                if (resumeText == null || resumeText.isBlank()) {
                    throw new RuntimeException("No readable text found in document: " + fileName);
                }

                Map<String, Object> parsed = aiResumeParser.parse(resumeText);
                item.setStatus("COMPLETED");
                item.setProcessedAt(LocalDateTime.now());
                resumeBatchItemRepository.save(item);
                success++;
            } catch (Exception ex) {
                log.warn("Batch item [{}] failed: {}", fileName, ex.getMessage());
                item.setStatus("FAILED");
                item.setErrorMessage(ex.getMessage());
                item.setProcessedAt(LocalDateTime.now());
                resumeBatchItemRepository.save(item);
                failed++;
            }

            // Update running progress in batch job
            ResumeBatchJob currentJob = resumeBatchJobRepository.findById(batchId).orElse(null);
            if (currentJob != null) {
                currentJob.setProcessedCount(i + 1);
                currentJob.setSuccessCount(success);
                currentJob.setFailedCount(failed);
                resumeBatchJobRepository.save(currentJob);
            }
        }

        // Finalize batch job
        ResumeBatchJob finalJob = resumeBatchJobRepository.findById(batchId).orElse(null);
        if (finalJob != null) {
            finalJob.setStatus("COMPLETED");
            finalJob.setCompletedAt(LocalDateTime.now());
            resumeBatchJobRepository.save(finalJob);

            // Notify submitter via NotificationService (In-app + Email Outbox)
            String subject = "Resume Batch Job Completed: " + finalJob.getJobName();
            String msg = "Batch processing finished: " + finalJob.getTotalResumes() + " total, "
                    + success + " succeeded, " + failed + " failed.";
            notificationService.notifyUser(submitterUserId,
                    com.placementsetu.common.enums.NotificationType.GENERAL,
                    subject, msg, "RESUME_BATCH", batchId, "BATCH_JOB:" + batchId);
        }
        log.info("Finished Resume Batch Job [{}] with {} succeeded, {} failed", batchId, success, failed);
    }

    public ResumeBatchResponseDto getBatchJob(UUID batchId) {
        ResumeBatchJob job = resumeBatchJobRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume batch job not found: " + batchId));

        List<ResumeBatchItem> items = resumeBatchItemRepository.findByBatchJobId(batchId);
        List<ResumeBatchResponseDto.ResumeBatchItemDto> itemDtos = items.stream()
                .map(i -> ResumeBatchResponseDto.ResumeBatchItemDto.builder()
                        .itemId(i.getId())
                        .fileName(i.getFileName())
                        .studentUserId(i.getStudentUserId())
                        .status(i.getStatus())
                        .errorMessage(i.getErrorMessage())
                        .processedAt(i.getProcessedAt())
                        .build())
                .collect(Collectors.toList());

        return ResumeBatchResponseDto.fromEntity(job, itemDtos);
    }
}
