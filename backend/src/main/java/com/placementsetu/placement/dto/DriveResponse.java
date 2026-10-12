package com.placementsetu.placement.dto;

import com.placementsetu.common.enums.DriveStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for a single placement drive.
 * Returned by GET /companies/me/drives/{driveId} and all drive CRUD endpoints.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriveResponse {

    private UUID id;
    private UUID companyId;
    private String jobTitle;
    private String description;
    private String location;
    private BigDecimal ctc;
    private Integer vacancies;
    private BigDecimal minimumCgpa;
    private Integer maximumBacklogs;
    private String requiredCourse;
    private Short graduationYear;
    private LocalDateTime registrationStart;
    private LocalDateTime registrationEnd;
    private DriveStatus status;

    /** Skill names associated with this drive. */
    private List<String> skills;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
