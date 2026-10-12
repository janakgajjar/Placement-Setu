package com.placementsetu.placement.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for updating a placement drive (PUT /companies/me/drives/{driveId}).
 * All fields are optional — only non-null values are applied.
 * Updates are only permitted while the drive is in DRAFT state.
 */
@Getter
@Setter
public class UpdateDriveRequest {

    @Size(max = 200, message = "Job title must not exceed 200 characters")
    private String jobTitle;

    private String description;

    @Size(max = 150, message = "Location must not exceed 150 characters")
    private String location;

    @DecimalMin(value = "0.0", inclusive = false, message = "CTC must be positive")
    private BigDecimal ctc;

    @Min(value = 1, message = "Vacancies must be at least 1")
    private Integer vacancies;

    @DecimalMin(value = "0.0", message = "Minimum CGPA must be >= 0")
    @DecimalMax(value = "10.0", message = "Minimum CGPA must be <= 10")
    private BigDecimal minimumCgpa;

    @Min(value = 0, message = "Maximum backlogs must be >= 0")
    private Integer maximumBacklogs;

    @Size(max = 100)
    private String requiredCourse;

    private Short graduationYear;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationEnd;

    /** Replaces all skill associations when provided. */
    private List<UUID> skillIds;
}
