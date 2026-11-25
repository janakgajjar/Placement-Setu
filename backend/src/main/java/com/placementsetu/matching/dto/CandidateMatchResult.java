package com.placementsetu.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateMatchResult {
    private int matchScore; // 0 to 100
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private boolean eligible;
    private boolean meetsMinCgpa;
    private boolean backlogsWithinLimit;
    private boolean courseEligible;
}
