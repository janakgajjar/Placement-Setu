package com.placementsetu.student.dto;

import com.placementsetu.common.enums.DriveStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDriveDto {
    private UUID id;
    private String companyName;
    private String companyWebsite;
    private String jobTitle;
    private String description;
    private String location;
    private BigDecimal ctc;
    private BigDecimal stipend;
    private Integer vacancies;
    private BigDecimal minimumCgpa;
    private Integer maximumBacklogs;
    private String requiredCourse;
    private Short graduationYear;
    private Integer maximumAge;
    private String driveType;
    private Boolean isDreamOffer;
    private List<String> requiredSkills;
    private DriveStatus status;
    private LocalDateTime registrationStart;
    private LocalDateTime registrationEnd;
    private boolean eligible;
    private List<String> ineligibilityReasons;
}
