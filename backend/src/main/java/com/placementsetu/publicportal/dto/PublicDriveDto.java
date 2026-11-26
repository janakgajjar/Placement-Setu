package com.placementsetu.publicportal.dto;

import com.placementsetu.common.enums.DriveStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicDriveDto {
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
    private String driveType;
    private Boolean isDreamOffer;
    private List<String> skills;
    private DriveStatus status;
    private LocalDateTime registrationStart;
    private LocalDateTime registrationEnd;
    private LocalDateTime createdAt;
}
