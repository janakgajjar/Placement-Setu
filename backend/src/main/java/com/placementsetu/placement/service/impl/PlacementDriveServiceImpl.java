package com.placementsetu.placement.service.impl;

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
                .status(DriveStatus.DRAFT)
                .build();

        drive = driveRepository.save(drive);

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

        if (drive.getStatus() != DriveStatus.DRAFT) {
            throw new BadRequestException("A drive can only be updated while it is in DRAFT state.");
        }

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

        LocalDateTime newStart = request.getRegistrationStart() != null
                ? request.getRegistrationStart() : drive.getRegistrationStart();
        LocalDateTime newEnd   = request.getRegistrationEnd()   != null
                ? request.getRegistrationEnd()   : drive.getRegistrationEnd();
        validateRegistrationWindow(newStart, newEnd, null);
        drive.setRegistrationStart(newStart);
        drive.setRegistrationEnd(newEnd);

        drive = driveRepository.save(drive);

        List<String> skillNames;
        if (request.getSkillIds() != null) {
            skillNames = syncDriveSkills(drive.getId(), request.getSkillIds());
        } else {
            skillNames = getSkillNames(drive.getId());
        }

        return toResponse(drive, skillNames);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /companies/me/drives/{driveId}/publish
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DriveResponse publishDrive(UUID companyId, UUID driveId) {
        PlacementDrive drive = requireOwnedDrive(companyId, driveId);

        if (drive.getStatus() != DriveStatus.DRAFT) {
            throw new BadRequestException(
                    "Only a DRAFT drive can be published. Current status: " + drive.getStatus());
        }

        drive.setStatus(DriveStatus.PUBLISHED);
        drive = driveRepository.save(drive);

        return toResponse(drive, getSkillNames(drive.getId()));
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
        drive = driveRepository.save(drive);

        return toResponse(drive, getSkillNames(drive.getId()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

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
        if (start != null && end != null && !end.isAfter(start)) {
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
        return DriveResponse.builder()
                .id(drive.getId())
                .companyId(drive.getCompanyId())
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
                .status(drive.getStatus())
                .skills(skillNames)
                .createdAt(drive.getCreatedAt())
                .updatedAt(drive.getUpdatedAt())
                .build();
    }
}
