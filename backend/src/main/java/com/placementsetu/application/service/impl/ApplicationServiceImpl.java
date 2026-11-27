package com.placementsetu.application.service.impl;

import com.placementsetu.application.dto.*;
import com.placementsetu.application.entity.Application;
import com.placementsetu.application.entity.ApplicationStatusHistory;
import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.application.repository.ApplicationStatusHistoryRepository;
import com.placementsetu.application.service.ApplicationService;
import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.ApplicationStatus;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.policy.dto.PolicyValidationResult;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.repository.StudentSkillRepository;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> ALLOWED_TRANSITIONS = Map.of(
            ApplicationStatus.APPLIED, EnumSet.of(ApplicationStatus.UNDER_REVIEW),
            ApplicationStatus.UNDER_REVIEW, EnumSet.of(ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED),
            ApplicationStatus.SHORTLISTED, EnumSet.of(ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.SELECTED, ApplicationStatus.REJECTED),
            ApplicationStatus.INTERVIEW_SCHEDULED, EnumSet.of(ApplicationStatus.SELECTED, ApplicationStatus.REJECTED)
    );

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PlacementDriveRepository driveRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ProfileValidationService profileValidationService;
    private final PlacementPolicyService policyService;
    private final DriveSkillRepository driveSkillRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final SkillRepository skillRepository;
    private final AuditService auditService;

    @Override
    @Transactional
    public ApplicationResponse apply(UUID studentUserId, UUID driveId) {
        StudentProfile profile = studentProfileRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        PlacementDrive drive = driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive not found"));

        if (drive.getStatus() != DriveStatus.PUBLISHED) {
            throw new BadRequestException("This placement drive is not currently accepting applications");
        }

        if (drive.getRegistrationStart() != null && LocalDateTime.now().isBefore(drive.getRegistrationStart())) {
            throw new BadRequestException("Registration for this drive has not started yet");
        }

        if (drive.getRegistrationEnd() != null && LocalDateTime.now().isAfter(drive.getRegistrationEnd())) {
            throw new BadRequestException("The registration deadline for this drive has passed");
        }

        if (!profileValidationService.isProfileComplete(profile)) {
            List<String> missing = profileValidationService.missingFields(profile);
            throw new BadRequestException("Your student profile is incomplete. Please complete mandatory fields: " + String.join(", ", missing));
        }

        if (!profileValidationService.hasCompletedResumeUpload(profile)) {
            throw new BadRequestException("You must upload a resume and wait for processing to complete in the My Resume section before applying.");
        }

        if (profile.getApprovalStatus() == ProfileApprovalStatus.DRAFT) {
            throw new BadRequestException("Your profile is in DRAFT status. Please open your Profile page and click 'Submit Profile for Verification'.");
        }

        if (profile.getApprovalStatus() == ProfileApprovalStatus.SUBMITTED) {
            throw new BadRequestException("Your profile is currently pending review by the Placement Officer. It must be approved before you can apply.");
        }

        if (profile.getApprovalStatus() == ProfileApprovalStatus.CHANGES_REQUESTED) {
            String remarks = profile.getReviewRemarks() != null ? " (" + profile.getReviewRemarks() + ")" : "";
            throw new BadRequestException("The Placement Officer has requested changes on your profile" + remarks + ". Please update and re-submit.");
        }

        List<String> candidateSkills = studentSkillRepository.findByStudentProfileId(profile.getId()).stream()
                .map(ss -> ss.getSkill().getName())
                .collect(Collectors.toList());
        List<String> requiredSkills = driveSkillRepository.findByDriveId(driveId).stream()
                .map(ds -> skillRepository.findById(ds.getId().getSkillId()).map(Skill::getName).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        PolicyValidationResult policyResult = policyService.evaluateStudentApplication(profile, drive, candidateSkills, requiredSkills);
        if (!policyResult.isEligible()) {
            throw new BadRequestException(String.join("; ", policyResult.getRejectionReasons()));
        }

        Optional<Application> existing = applicationRepository.findByStudentProfileIdAndPlacementDriveId(profile.getId(), driveId);
        if (existing.isPresent()) {
            if (existing.get().getStatus() == ApplicationStatus.WITHDRAWN) {
                // Allow re-applying if previously withdrawn before deadline
                Application app = existing.get();
                app.setStatus(ApplicationStatus.APPLIED);
                app.setWithdrawnAt(null);
                app.setAppliedAt(LocalDateTime.now());
                app = applicationRepository.save(app);

                recordHistory(app.getId(), studentUserId, ApplicationStatus.WITHDRAWN.name(), ApplicationStatus.APPLIED.name(), "Re-applied by student");
                dispatchNotification(studentUserId, drive, app.getId(), NotificationType.APPLICATION_SUBMITTED, "Application Re-submitted",
                        "You successfully re-applied for " + drive.getJobTitle());
                return mapToResponse(app, drive, profile);
            }
            throw new BadRequestException("You have already applied for this placement drive.");
        }

        Application application = Application.builder()
                .studentProfileId(profile.getId())
                .placementDriveId(driveId)
                .status(ApplicationStatus.APPLIED)
                .appliedAt(LocalDateTime.now())
                .build();
        application = applicationRepository.save(application);

        recordHistory(application.getId(), studentUserId, null, ApplicationStatus.APPLIED.name(), "Application submitted by student");

        if (auditService != null) {
            auditService.logEvent(studentUserId, "APPLICATION_SUBMITTED", "APPLICATION", application.getId(),
                    Map.of("driveId", driveId.toString()));
        }

        dispatchNotification(studentUserId, drive, application.getId(), NotificationType.APPLICATION_SUBMITTED, "Application Submitted",
                "You successfully applied for " + drive.getJobTitle());

        return mapToResponse(application, drive, profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getMyApplications(UUID studentUserId) {
        StudentProfile profile = studentProfileRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        List<Application> applications = applicationRepository.findByStudentProfileIdOrderByAppliedAtDesc(profile.getId());
        return applications.stream()
                .map(app -> {
                    PlacementDrive drive = driveRepository.findById(app.getPlacementDriveId()).orElse(null);
                    return mapToResponse(app, drive, profile);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationSummaryResponse getMySummary(UUID studentUserId) {
        StudentProfile profile = studentProfileRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        UUID pid = profile.getId();
        long total = applicationRepository.countByStudentProfileId(pid);
        long underReview = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.UNDER_REVIEW);
        long shortlisted = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.SHORTLISTED);
        long interview = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.INTERVIEW_SCHEDULED);
        long selected = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.SELECTED);
        long rejected = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.REJECTED);
        long withdrawn = applicationRepository.countByStudentProfileIdAndStatus(pid, ApplicationStatus.WITHDRAWN);

        return ApplicationSummaryResponse.builder()
                .totalApplied(total)
                .underReview(underReview)
                .shortlisted(shortlisted)
                .interviewScheduled(interview)
                .selected(selected)
                .rejected(rejected)
                .withdrawn(withdrawn)
                .build();
    }

    @Override
    @Transactional
    public ApplicationResponse withdraw(UUID studentUserId, UUID applicationId) {
        StudentProfile profile = studentProfileRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (!app.getStudentProfileId().equals(profile.getId())) {
            throw new BadRequestException("Unauthorized access to this application");
        }

        if (app.getStatus() == ApplicationStatus.SELECTED || app.getStatus() == ApplicationStatus.REJECTED || app.getStatus() == ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException("Cannot withdraw application currently in status: " + app.getStatus());
        }

        String previousStatus = app.getStatus().name();
        app.setStatus(ApplicationStatus.WITHDRAWN);
        app.setWithdrawnAt(LocalDateTime.now());
        app = applicationRepository.save(app);

        recordHistory(app.getId(), studentUserId, previousStatus, ApplicationStatus.WITHDRAWN.name(), "Withdrawn by student");

        if (auditService != null) {
            auditService.logEvent(studentUserId, "APPLICATION_WITHDRAWN", "APPLICATION", app.getId(),
                    Map.of("previousStatus", previousStatus));
        }

        PlacementDrive drive = driveRepository.findById(app.getPlacementDriveId()).orElse(null);
        dispatchNotification(studentUserId, drive, app.getId(), NotificationType.APPLICATION_WITHDRAWN, "Application Withdrawn",
                "You withdrew your application for " + (drive != null ? drive.getJobTitle() : "the drive"));

        return mapToResponse(app, drive, profile);
    }

    @Override
    @Transactional
    public ApplicationResponse updateStatus(UUID applicationId, UUID changedByUserId, ApplicationStatusUpdateRequest request) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        PlacementDrive drive = driveRepository.findById(app.getPlacementDriveId()).orElse(null);
        verifyCompanyCanManageDrive(changedByUserId, drive);

        ApplicationStatus previousStatus = app.getStatus();
        ApplicationStatus newStatus = request.getStatus();

        Set<ApplicationStatus> allowedNext = ALLOWED_TRANSITIONS.getOrDefault(previousStatus, Set.of());
        if (!allowedNext.contains(newStatus)) {
            throw new BadRequestException("Invalid application status transition from " + previousStatus + " to " + newStatus);
        }

        app.setStatus(newStatus);
        app = applicationRepository.save(app);

        recordHistory(app.getId(), changedByUserId, previousStatus.name(), newStatus.name(), request.getRemarks());

        if (auditService != null) {
            auditService.logEvent(changedByUserId, "APPLICATION_STATUS_UPDATED", "APPLICATION", app.getId(),
                    Map.of("fromStatus", previousStatus.name(), "toStatus", newStatus.name()));
        }

        StudentProfile profile = studentProfileRepository.findById(app.getStudentProfileId()).orElse(null);

        if (profile != null) {
            if (newStatus == ApplicationStatus.SELECTED || previousStatus == ApplicationStatus.SELECTED) {
                recalculatePlacementLock(profile);
            }
            if (newStatus == ApplicationStatus.SELECTED && !isDreamOffer(drive)) {
                closeOtherActiveApplications(profile.getId(), app.getId(), changedByUserId);
            }

            // Notification to student
            NotificationType type = switch (newStatus) {
                case SELECTED -> NotificationType.APPLICATION_SELECTED;
                case REJECTED -> NotificationType.APPLICATION_REJECTED;
                case SHORTLISTED -> NotificationType.SHORTLIST_APPROVED;
                case INTERVIEW_SCHEDULED -> NotificationType.INTERVIEW_SCHEDULED;
                default -> NotificationType.GENERAL;
            };

            String driveTitle = drive != null ? drive.getJobTitle() : "drive";
            String msg = "Your application for " + driveTitle + " has been updated to: " + newStatus.name().replace('_', ' ');
            if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
                msg += ". Remarks: " + request.getRemarks();
            }

            dispatchNotification(profile.getUserId(), drive, app.getId(), type, "Application Status: " + newStatus.name().replace('_', ' '), msg);
        }

        return mapToResponse(app, drive, profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getDriveApplications(UUID driveId, UUID requesterUserId) {
        PlacementDrive drive = driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive not found"));

        verifyCompanyDriveOwnershipIfCompany(requesterUserId, drive);

        List<Application> apps = applicationRepository.findByPlacementDriveIdOrderByAppliedAtDesc(driveId);
        return apps.stream()
                .map(app -> {
                    StudentProfile profile = studentProfileRepository.findById(app.getStudentProfileId()).orElse(null);
                    return mapToResponse(app, drive, profile);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void recalculatePlacementLock(UUID studentProfileId) {
        StudentProfile profile = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        recalculatePlacementLock(profile);
    }

    private void recalculatePlacementLock(StudentProfile profile) {
        List<Application> applications = applicationRepository.findByStudentProfileId(profile.getId());
        boolean hasActiveNonDreamSelection = applications.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.SELECTED)
                .anyMatch(a -> {
                    PlacementDrive selectedDrive = driveRepository.findById(a.getPlacementDriveId()).orElse(null);
                    return !isDreamOffer(selectedDrive);
                });

        if (profile.isPlacementLocked() != hasActiveNonDreamSelection) {
            profile.setPlacementLocked(hasActiveNonDreamSelection);
            studentProfileRepository.save(profile);
        }
    }

    private boolean isDreamOffer(PlacementDrive drive) {
        if (drive == null) {
            return false;
        }
        return Boolean.TRUE.equals(drive.getIsDreamOffer())
                || (drive.getCtc() != null && drive.getCtc().compareTo(PlacementPolicyService.DREAM_OFFER_MINIMUM_CTC) >= 0);
    }

    private void closeOtherActiveApplications(UUID studentProfileId, UUID selectedApplicationId, UUID changedByUserId) {
        List<Application> applications = applicationRepository.findByStudentProfileId(studentProfileId);
        for (Application other : applications) {
            if (other.getId().equals(selectedApplicationId)) {
                continue;
            }
            ApplicationStatus st = other.getStatus();
            if (st == ApplicationStatus.APPLIED
                    || st == ApplicationStatus.UNDER_REVIEW
                    || st == ApplicationStatus.SHORTLISTED
                    || st == ApplicationStatus.INTERVIEW_SCHEDULED) {
                other.setStatus(ApplicationStatus.WITHDRAWN);
                other.setWithdrawnAt(LocalDateTime.now());
                applicationRepository.save(other);
                recordHistory(other.getId(), changedByUserId, st.name(), ApplicationStatus.WITHDRAWN.name(),
                        "Closed automatically upon selection in another placement drive");
            }
        }
    }

    private void verifyCompanyCanManageDrive(UUID userId, PlacementDrive drive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != UserRole.COMPANY) {
            throw new AccessDeniedException("Only companies can update application status");
        }
        Company company = companyRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
        if (drive == null || !drive.getCompanyId().equals(company.getId())) {
            throw new AccessDeniedException("You do not have permission to access applications for this drive");
        }
        ensureRegistrationClosedForCompanyAccess(drive);
    }

    private void verifyCompanyDriveOwnershipIfCompany(UUID userId, PlacementDrive drive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() == UserRole.COMPANY) {
            Company company = companyRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
            if (drive == null || !drive.getCompanyId().equals(company.getId())) {
                throw new AccessDeniedException("You do not have permission to access applications for this drive");
            }
            ensureRegistrationClosedForCompanyAccess(drive);
        }
    }

    private void ensureRegistrationClosedForCompanyAccess(PlacementDrive drive) {
        if (drive.getStatus() != DriveStatus.CLOSED
                && drive.getRegistrationEnd() != null
                && LocalDateTime.now().isBefore(drive.getRegistrationEnd())) {
            throw new BadRequestException("Applicants can only be accessed after registration closes.");
        }
    }

    private void recordHistory(UUID appId, UUID userId, String from, String to, String remarks) {
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
                .applicationId(appId)
                .changedByUserId(userId)
                .fromStatus(from)
                .toStatus(to)
                .remarks(remarks)
                .createdAt(LocalDateTime.now())
                .build();
        historyRepository.save(history);
    }

    private void dispatchNotification(UUID recipientUserId, PlacementDrive drive, UUID appId, NotificationType type, String subject, String message) {
        try {
            notificationService.notifyUser(
                    recipientUserId,
                    type,
                    subject,
                    message,
                    "APPLICATION",
                    appId,
                    "app-status-" + appId + "-" + type.name() + "-" + System.currentTimeMillis()
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch notification for application {}: {}", appId, e.getMessage());
        }
    }

    private ApplicationResponse mapToResponse(Application app, PlacementDrive drive, StudentProfile profile) {
        String companyName = "Unknown Company";
        if (drive != null) {
            Company company = companyRepository.findById(drive.getCompanyId()).orElse(null);
            if (company != null) {
                companyName = company.getCompanyName();
            }
        }

        String studentEmail = null;
        if (profile != null) {
            studentEmail = userRepository.findById(profile.getUserId()).map(User::getEmail).orElse(null);
        }

        List<ApplicationStatusHistory> historyEntities = historyRepository.findByApplicationIdOrderByCreatedAtAsc(app.getId());
        List<ApplicationStatusHistoryDto> historyDtos = historyEntities.stream()
                .map(h -> {
                    String changedByName = "System";
                    if (h.getChangedByUserId() != null) {
                        changedByName = userRepository.findById(h.getChangedByUserId())
                                .map(User::getEmail)
                                .orElse("User");
                    }
                    return ApplicationStatusHistoryDto.builder()
                            .id(h.getId())
                            .fromStatus(h.getFromStatus())
                            .toStatus(h.getToStatus())
                            .remarks(h.getRemarks())
                            .changedByName(changedByName)
                            .createdAt(h.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());

        return ApplicationResponse.builder()
                .id(app.getId())
                .studentProfileId(app.getStudentProfileId())
                .driveId(app.getPlacementDriveId())
                .companyName(companyName)
                .jobTitle(drive != null ? drive.getJobTitle() : "Position")
                .location(drive != null ? drive.getLocation() : null)
                .ctc(drive != null ? drive.getCtc() : null)
                .stipend(drive != null ? drive.getStipend() : null)
                .driveType(drive != null ? drive.getDriveType() : null)
                .status(app.getStatus())
                .appliedAt(app.getAppliedAt())
                .withdrawnAt(app.getWithdrawnAt())
                .updatedAt(app.getUpdatedAt())
                .studentName(profile != null ? profile.getFullName() : null)
                .studentEmail(studentEmail)
                .studentPhone(profile != null ? profile.getPhone() : null)
                .studentCourse(profile != null ? profile.getCourse() : null)
                .studentInstitution(profile != null ? profile.getInstitution() : null)
                .studentCgpa(profile != null ? profile.getCgpa() : null)
                .studentBacklogs(profile != null ? profile.getBacklogs() : null)
                .history(historyDtos)
                .build();
    }
}
