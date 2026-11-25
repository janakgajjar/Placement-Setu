package com.placementsetu.application.dto;

import com.placementsetu.common.enums.ApplicationStatus;
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
public class ApplicationResponse {
    private UUID id;
    private UUID studentProfileId;
    private UUID driveId;
    private String companyName;
    private String jobTitle;
    private String location;
    private BigDecimal ctc;
    private BigDecimal stipend;
    private String driveType;
    private ApplicationStatus status;
    private LocalDateTime appliedAt;
    private LocalDateTime withdrawnAt;
    private LocalDateTime updatedAt;

    // Student Snapshot (for Recruiter/Officer views)
    private String studentName;
    private String studentEmail;
    private String studentPhone;
    private String studentCourse;
    private String studentInstitution;
    private BigDecimal studentCgpa;
    private Integer studentBacklogs;
    private String resumeUrl;

    // Pipeline History
    private List<ApplicationStatusHistoryDto> history;
}
