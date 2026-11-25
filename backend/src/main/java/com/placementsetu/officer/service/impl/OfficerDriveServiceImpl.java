package com.placementsetu.officer.service.impl;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.officer.service.OfficerDriveService;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OfficerDriveServiceImpl implements OfficerDriveService {

    private final PlacementDriveRepository driveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final SkillRepository skillRepository;
    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public Page<DriveResponse> getPendingDrives(Pageable pageable) {
        return driveRepository.findByStatus(DriveStatus.PENDING_APPROVAL, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public DriveResponse getDriveDetails(UUID driveId) {
        PlacementDrive drive = findDrive(driveId);
        return toResponse(drive);
    }

    @Override
    @Transactional
    public DriveResponse approveDrive(UUID officerUserId, UUID driveId, String remarks) {
        String trimmedRemarks = requireNonBlankRemarks(remarks);
        PlacementDrive drive = findDrive(driveId);

        if (drive.getStatus() != DriveStatus.PENDING_APPROVAL) {
            throw new BadRequestException(
                    "Only PENDING_APPROVAL drives can be approved. Current status: " + drive.getStatus());
        }

        drive.setStatus(DriveStatus.PUBLISHED);
        drive.setReviewRemarks(trimmedRemarks);
        drive.setRejectionReason(null);
        drive.setReviewedBy(officerUserId);
        drive.setReviewedAt(LocalDateTime.now());
        PlacementDrive saved = driveRepository.save(drive);

        if (auditService != null) {
            auditService.logEvent(officerUserId, "DRIVE_APPROVED", "PLACEMENT_DRIVE", saved.getId(),
                    Map.of(
                            "jobTitle", saved.getJobTitle(),
                            "companyId", saved.getCompanyId().toString(),
                            "status", saved.getStatus().name(),
                            "reviewRemarks", trimmedRemarks));
        }

        companyRepository.findById(saved.getCompanyId()).ifPresent(company ->
                notificationService.notifyDriveApproved(
                        saved.getId(), saved.getJobTitle(), company.getCompanyName(), company.getUserId(), trimmedRemarks));

        return toResponse(saved);
    }

    @Override
    @Transactional
    public DriveResponse rejectDrive(UUID officerUserId, UUID driveId, String remarks) {
        String trimmedRemarks = requireNonBlankRemarks(remarks);
        PlacementDrive drive = findDrive(driveId);

        if (drive.getStatus() != DriveStatus.PENDING_APPROVAL) {
            throw new BadRequestException(
                    "Only PENDING_APPROVAL drives can be rejected. Current status: " + drive.getStatus());
        }

        drive.setStatus(DriveStatus.REJECTED);
        drive.setReviewRemarks(trimmedRemarks);
        drive.setRejectionReason(trimmedRemarks);
        drive.setReviewedBy(officerUserId);
        drive.setReviewedAt(LocalDateTime.now());
        PlacementDrive saved = driveRepository.save(drive);

        if (auditService != null) {
            auditService.logEvent(officerUserId, "DRIVE_REJECTED", "PLACEMENT_DRIVE", saved.getId(),
                    Map.of(
                            "jobTitle", saved.getJobTitle(),
                            "companyId", saved.getCompanyId().toString(),
                            "status", saved.getStatus().name(),
                            "reviewRemarks", trimmedRemarks));
        }

        companyRepository.findById(saved.getCompanyId()).ifPresent(company ->
                notificationService.notifyDriveRejected(
                        saved.getId(), saved.getJobTitle(), company.getCompanyName(), company.getUserId(), trimmedRemarks));

        return toResponse(saved);
    }

    private PlacementDrive findDrive(UUID driveId) {
        return driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive not found"));
    }

    private String requireNonBlankRemarks(String remarks) {
        if (remarks == null || remarks.isBlank()) {
            throw new BadRequestException("Review remarks are required");
        }
        return remarks.trim();
    }

    private DriveResponse toResponse(PlacementDrive drive) {
        Company company = drive.getCompanyId() != null
                ? companyRepository.findById(drive.getCompanyId()).orElse(null)
                : null;

        List<String> skillNames = driveSkillRepository.findByDriveId(drive.getId())
                .stream()
                .map(ds -> skillRepository.findById(ds.getId().getSkillId())
                        .map(Skill::getName).orElse(null))
                .filter(Objects::nonNull)
                .toList();

        return DriveResponse.builder()
                .id(drive.getId())
                .companyId(drive.getCompanyId())
                .companyName(company != null ? company.getCompanyName() : null)
                .companyWebsite(company != null ? company.getWebsite() : null)
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
