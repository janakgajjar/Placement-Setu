package com.placementsetu.matching.dto;

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
public class CandidateProfileDto {
    private UUID id; // student profile id
    private UUID userId;
    private String fullName;
    private String course;
    private String institution;
    private Short graduationYear;
    private BigDecimal cgpa;
    private Integer backlogs;
    private String gender;
    private String linkedinUrl;
    private String githubUrl;
    private List<String> skills;
    private List<CandidateProjectDto> topProjects;
    private int profileCompletionPercentage;

    // Contact details: exposed ONLY if student applied to this company's drive
    private boolean applied;
    private String email;
    private String phone;
    private String address;

    // Drive-specific match criteria & score (populated when queried in drive context)
    private Integer matchScore;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private Boolean eligible;
    private Boolean meetsMinCgpa;
    private Boolean backlogsWithinLimit;
    private Boolean courseEligible;

    // Existing application details if student applied
    private UUID applicationId;
    private String applicationStatus;
}
