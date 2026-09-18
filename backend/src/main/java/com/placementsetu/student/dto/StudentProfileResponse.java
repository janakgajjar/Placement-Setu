package com.placementsetu.student.dto;

import com.placementsetu.common.enums.ProfileStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfileResponse {
    private UUID id;
    private String apparId;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private String course;
    private String institution;
    private Short graduationYear;
    private BigDecimal cgpa;
    private Integer backlogs;
    private String address;
    private String linkedinUrl;
    private String githubUrl;
    private ProfileStatus profileStatus;
    private boolean placementLocked;
    private List<String> skills;
    private List<ProjectResponse> projects;
    private List<CertificationResponse> certifications;
    private boolean resumeUploaded;
    private String resumeProcessingStatus;
}
