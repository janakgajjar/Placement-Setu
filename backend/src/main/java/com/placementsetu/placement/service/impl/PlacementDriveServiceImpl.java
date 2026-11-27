package com.placementsetu.placement.service.impl;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.placement.dto.CreateDriveRequest;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.dto.UpdateDriveRequest;
import com.placementsetu.placement.entity.DriveSkill;
import com.placementsetu.placement.entity.DriveSkillId;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.placement.service.PlacementDriveService;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlacementDriveServiceImpl implements PlacementDriveService {

    private final PlacementDriveRepository driveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final SkillRepository skillRepository;
    private final com.placementsetu.company.repository.CompanyRepository companyRepository;
    private final com.placementsetu.notification.service.NotificationService notificationService;
    private final com.placementsetu.policy.service.PlacementPolicyService policyService;
    private final AuditService auditService;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /companies/me/drives
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DriveResponse createDrive(UUID companyId, CreateDriveRequest request) {
        validateRegistrationWindow(request.getRegistrationStart(), request.getRegistrationEnd(), null);

        PlacementDrive drive = PlacementDrive.builder()
                .companyId(companyId)
                .jobTitle(request.getJobTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .ctc(request.getCtc())
                .vacancies(request.getVacancies())
                .minimumCgpa(request.getMinimumCgpa())
                .maximumBacklogs(request.getMaximumBacklogs())
                .requiredCourse(request.getRequiredCourse())
                .graduationYear(request.getGraduationYear())
                .registrationStart(request.getRegistrationStart())
                .registrationEnd(request.getRegistrationEnd())
                .driveType(request.getDriveType() != null ? request.getDriveType() : "FULL_TIME")
                .stipend(request.getStipend())
                .maximumAge(request.getMaximumAge())
                .isDreamOffer(request.getIsDreamOffer() != null ? request.getIsDreamOffer() : false)
                .status(DriveStatus.DRAFT)
                .build();

        policyService.validatePaidInternshipPolicy(drive);

        drive = driveRepository.save(drive);

        if (auditService != null) {
            UUID userId = resolveUserIdForCompany(companyId);
            auditService.logEvent(userId, "DRIVE_CREATED", "PLACEMENT_DRIVE", drive.getId(),
                    java.util.Map.of("jobTitle", drive.getJobTitle(), "status", drive.getStatus().name()));
        }

        List<String> skillNames = syncDriveSkills(drive.getId(), request.getSkillIds());

        return toResponse(drive, skillNames);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /companies/me/drives
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<DriveResponse> getCompanyDrives(UUID companyId, DriveStatus status, Pageable pageable) {
        return driveRepository
                .findByCompanyIdAndStatus(companyId, status, pageable)
                .map(d -> toResponse(d, getSkillNames(d.getId())));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /companies/me/drives/{driveId}
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DriveResponse getDrive(UUID companyId, UUID driveId) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);
        return toResponse(drive, getSkillNames(driveId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /companies/me/drives/{driveId}
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DriveResponse updateDrive(UUID companyId, UUID driveId, UpdateDriveRequest request) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);

        if (drive.getStatus() != DriveStatus.DRAFT && drive.getStatus() != DriveStatus.REJECTED) {
            throw new BadRequestException(
                    "A drive can only be updated while it is in DRAFT or REJECTED state. Current status: " + drive.getStatus());
        }

        boolean wasRejected = drive.getStatus() == DriveStatus.REJECTED;

        // Apply partial updates (patch semantics — only non-null values)
        if (request.getJobTitle() != null)       drive.setJobTitle(request.getJobTitle());
        if (request.getDescription() != null)    drive.setDescription(request.getDescription());
        if (request.getLocation() != null)       drive.setLocation(request.getLocation());
        if (request.getCtc() != null)            drive.setCtc(request.getCtc());
        if (request.getVacancies() != null)      drive.setVacancies(request.getVacancies());
        if (request.getMinimumCgpa() != null)    drive.setMinimumCgpa(request.getMinimumCgpa());
        if (request.getMaximumBacklogs() != null) drive.setMaximumBacklogs(request.getMaximumBacklogs());
        if (request.getRequiredCourse() != null) drive.setRequiredCourse(request.getRequiredCourse());
        if (request.getGraduationYear() != null) drive.setGraduationYear(request.getGraduationYear());
        if (request.getDriveType() != null)      drive.setDriveType(request.getDriveType());
        if (request.getStipend() != null)        drive.setStipend(request.getStipend());
        if (request.getMaximumAge() != null)     drive.setMaximumAge(request.getMaximumAge());
        if (request.getIsDreamOffer() != null)   drive.setIsDreamOffer(request.getIsDreamOffer());

        LocalDateTime newStart = request.getRegistrationStart() != null
                ? request.getRegistrationStart() : drive.getRegistrationStart();
        LocalDateTime newEnd   = request.getRegistrationEnd()   != null
                ? request.getRegistrationEnd()   : drive.getRegistrationEnd();
        validateRegistrationWindow(newStart, newEnd, null);
        drive.setRegistrationStart(newStart);
        drive.setRegistrationEnd(newEnd);

        policyService.validatePaidInternshipPolicy(drive);

        if (wasRejected) {
            drive.setRejectionReason(null);
            drive.setReviewRemarks(null);
            drive.setReviewedBy(null);
            drive.setReviewedAt(null);
        }

        drive = driveRepository.save(drive);

        if (auditService != null) {
            UUID userId = resolveUserIdForCompany(companyId);
            auditService.logEvent(userId, "DRIVE_UPDATED", "PLACEMENT_DRIVE", drive.getId(),
                    java.util.Map.of("jobTitle", drive.getJobTitle(), "status", drive.getStatus().name()));
        }

        List<String> skillNames;
        if (request.getSkillIds() != null) {
            skillNames = syncDriveSkills(drive.getId(), request.getSkillIds());
        } else {
            skillNames = getSkillNames(drive.getId());
        }

        return toResponse(drive, skillNames);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /companies/me/drives/{driveId}/submit
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DriveResponse submitDriveForApproval(UUID companyId, UUID driveId) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);

        if (drive.getStatus() != DriveStatus.DRAFT && drive.getStatus() != DriveStatus.REJECTED) {
            throw new BadRequestException(
                    "Only a DRAFT or REJECTED drive can be submitted for approval. Current status: " + drive.getStatus());
        }

        if (drive.getJobTitle() == null || drive.getJobTitle().isBlank()) {
            throw new BadRequestException("Job title is required before submitting for approval.");
        }
        if (drive.getVacancies() == null || drive.getVacancies() <= 0) {
            throw new BadRequestException("Vacancies must be greater than zero before submitting for approval.");
        }
        validateRegistrationWindow(drive.getRegistrationStart(), drive.getRegistrationEnd(), drive.getId());
        policyService.validatePaidInternshipPolicy(drive);

        drive.setStatus(DriveStatus.PENDING_APPROVAL);
        drive.setSubmittedAt(LocalDateTime.now());
        drive.setRejectionReason(null);
        drive.setReviewRemarks(null);
        drive.setReviewedBy(null);
        drive.setReviewedAt(null);
        final PlacementDrive submittedDrive = driveRepository.save(drive);

        if (auditService != null) {
            UUID userId = resolveUserIdForCompany(companyId);
            auditService.logEvent(userId, "DRIVE_SUBMITTED_FOR_APPROVAL", "PLACEMENT_DRIVE", submittedDrive.getId(),
                    java.util.Map.of("jobTitle", submittedDrive.getJobTitle(), "status", submittedDrive.getStatus().name()));
        }

        String companyName = companyRepository.findById(submittedDrive.getCompanyId())
                .map(com.placementsetu.company.entity.Company::getCompanyName)
                .orElse("Partner Company");
        notificationService.notifyDriveSubmittedForApproval(
                submittedDrive.getId(), submittedDrive.getJobTitle(), companyName);

        return toResponse(submittedDrive, getSkillNames(submittedDrive.getId()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /companies/me/drives/{driveId}/close
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DriveResponse closeDrive(UUID companyId, UUID driveId) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);

        if (drive.getStatus() != DriveStatus.PUBLISHED) {
            throw new BadRequestException(
                    "Only a PUBLISHED drive can be closed. Current status: " + drive.getStatus());
        }

        drive.setStatus(DriveStatus.CLOSED);
        final PlacementDrive closedDrive = driveRepository.save(drive);

        if (auditService != null) {
            UUID userId = resolveUserIdForCompany(companyId);
            auditService.logEvent(userId, "DRIVE_CLOSED", "PLACEMENT_DRIVE", closedDrive.getId(),
                    java.util.Map.of("jobTitle", closedDrive.getJobTitle()));
        }

        companyRepository.findById(companyId).ifPresent(c -> {
            notificationService.notifyDriveClosed(closedDrive.getId(), closedDrive.getJobTitle(), c.getCompanyName(), c.getUserId());
        });

        return toResponse(closedDrive, getSkillNames(closedDrive.getId()));
    }

    @Override
    @Transactional
    public void deleteDrive(UUID companyId, UUID driveId) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);
        if (drive.getStatus() == DriveStatus.PUBLISHED) {
            throw new BadRequestException("Cannot delete a PUBLISHED drive. Please close the drive instead.");
        }
        driveSkillRepository.deleteByDriveId(driveId);
        driveRepository.delete(drive);

        if (auditService != null) {
            UUID userId = resolveUserIdForCompany(companyId);
            auditService.logEvent(userId, "DRIVE_DELETED", "PLACEMENT_DRIVE", driveId,
                    java.util.Map.of("jobTitle", drive.getJobTitle()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    private UUID resolveUserIdForCompany(UUID companyId) {
        if (companyId == null) return null;
        return companyRepository.findById(companyId)
                .map(com.placementsetu.company.entity.Company::getUserId)
                .orElse(null);
    }

    private PlacementDrive requireOwnedDrive(UUID companyId, UUID driveId) {
        return driveRepository.findByIdAndCompanyId(driveId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Placement drive not found or does not belong to your company."));
    }

    /**
     * Validates that registrationEnd is strictly after registrationStart.
     * The {@code driveId} parameter is reserved for future use in update validations.
     */
    private void validateRegistrationWindow(
            LocalDateTime start,
            LocalDateTime end,
            @SuppressWarnings("unused") UUID driveId) {
        if (start == null || end == null) {
            throw new BadRequestException("Registration start and end dates are required.");
        }
        if (!end.isAfter(start)) {
            throw new BadRequestException("Registration end date must be after the start date.");
        }
    }

    /**
     * Replaces all drive_skills rows for the given drive with the provided skill IDs.
     * Silently ignores unknown skill IDs.
     */
    @Transactional
    private List<String> syncDriveSkills(UUID driveId, List<UUID> skillIds) {
        driveSkillRepository.deleteByDriveId(driveId);

        if (skillIds == null || skillIds.isEmpty()) {
            return List.of();
        }

        List<String> names = new ArrayList<>();
        for (UUID skillId : skillIds) {
            skillRepository.findById(skillId).ifPresent(skill -> {
                driveSkillRepository.save(new DriveSkill(new DriveSkillId(driveId, skill.getId())));
                names.add(skill.getName());
            });
        }
        return names;
    }

    /** Fetches skill names for the given drive from the drive_skills junction. */
    private List<String> getSkillNames(UUID driveId) {
        return driveSkillRepository.findByDriveId(driveId)
                .stream()
                .map(ds -> skillRepository.findById(ds.getId().getSkillId())
                        .map(Skill::getName).orElse(null))
                .filter(name -> name != null)
                .toList();
    }

    private DriveResponse toResponse(PlacementDrive drive, List<String> skillNames) {
        String companyName = null;
        String companyWebsite = null;
        if (drive.getCompanyId() != null) {
            var optCompany = companyRepository.findById(drive.getCompanyId());
            if (optCompany.isPresent()) {
                companyName = optCompany.get().getCompanyName();
                companyWebsite = optCompany.get().getWebsite();
            }
        }

        return DriveResponse.builder()
                .id(drive.getId())
                .companyId(drive.getCompanyId())
                .companyName(companyName)
                .companyWebsite(companyWebsite)
                .jobTitle(drive.getJobTitle())
                .description(drive.getDescription())
                .location(drive.getLocation())
                .ctc(drive.getCtc())
                .vacancies(drive.getVacancies())
                .minimumCgpa(drive.getMinimumCgpa())
                .maximumBacklogs(drive.getMaximumBacklogs())
                .requiredCourse(drive.getRequiredCourse())
                .graduationYear(drive.getGraduationYear())
                .registrationStart(drive.getRegistrationStart())
                .registrationEnd(drive.getRegistrationEnd())
                .driveType(drive.getDriveType())
                .stipend(drive.getStipend())
                .maximumAge(drive.getMaximumAge())
                .isDreamOffer(drive.getIsDreamOffer())
                .status(drive.getStatus())
                .rejectionReason(drive.getRejectionReason())
                .reviewRemarks(drive.getReviewRemarks())
                .submittedAt(drive.getSubmittedAt())
                .reviewedBy(drive.getReviewedBy())
                .reviewedAt(drive.getReviewedAt())
                .skills(skillNames)
                .createdAt(drive.getCreatedAt())
                .updatedAt(drive.getUpdatedAt())
                .build();
    }
}
