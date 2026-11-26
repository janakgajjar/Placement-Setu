package com.placementsetu.matching.service;

import com.placementsetu.matching.dto.CandidateMatchResult;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.student.entity.StudentProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CandidateMatchingService {

    private final SkillNormalizer skillNormalizer;

    /**
     * Calculates deterministic match score and eligibility between a candidate's skills/profile
     * and a placement drive's requirements.
     */
    public CandidateMatchResult calculateMatch(
            List<String> candidateSkills,
            List<String> requiredSkills,
            StudentProfile profile,
            PlacementDrive drive) {

        Set<String> normalizedCandidateSkills = skillNormalizer.normalizeAll(candidateSkills);
        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        if (requiredSkills != null && !requiredSkills.isEmpty()) {
            for (String req : requiredSkills) {
                if (req == null || req.isBlank()) continue;
                String normReq = skillNormalizer.normalize(req);
                if (normalizedCandidateSkills.contains(normReq)) {
                    matched.add(req.trim());
                } else {
                    missing.add(req.trim());
                }
            }
        }

        int totalRequired = (requiredSkills != null) ? requiredSkills.size() : 0;
        int matchScore;
        if (totalRequired == 0) {
            matchScore = 100;
        } else {
            matchScore = (int) Math.round(((double) matched.size() / totalRequired) * 100.0);
        }

        boolean meetsMinCgpa = true;
        if (drive != null && drive.getMinimumCgpa() != null && profile != null) {
            BigDecimal cgpa = profile.getCgpa();
            meetsMinCgpa = (cgpa != null && cgpa.compareTo(drive.getMinimumCgpa()) >= 0);
        }

        boolean backlogsWithinLimit = true;
        if (drive != null && drive.getMaximumBacklogs() != null && profile != null) {
            Integer backlogs = profile.getBacklogs();
            backlogsWithinLimit = (backlogs != null && backlogs <= drive.getMaximumBacklogs());
        }

        boolean courseEligible = true;
        if (drive != null && drive.getRequiredCourse() != null && !drive.getRequiredCourse().isBlank() && profile != null) {
            String course = profile.getCourse();
            courseEligible = (course != null && course.trim().equalsIgnoreCase(drive.getRequiredCourse().trim()));
        }

        boolean graduationYearEligible = true;
        if (drive != null && drive.getGraduationYear() != null && profile != null) {
            Short gradYear = profile.getGraduationYear();
            graduationYearEligible = (gradYear != null && drive.getGraduationYear().equals(gradYear));
        }

        boolean ageEligible = true;
        if (drive != null && drive.getMaximumAge() != null && drive.getMaximumAge() > 0 && profile != null) {
            LocalDate dob = profile.getDateOfBirth();
            if (dob == null) {
                ageEligible = false;
            } else {
                int age = Period.between(dob, LocalDate.now()).getYears();
                ageEligible = age <= drive.getMaximumAge();
            }
        }

        boolean skillsEligible = (requiredSkills == null || requiredSkills.isEmpty() || missing.isEmpty());

        boolean eligible = meetsMinCgpa && backlogsWithinLimit && courseEligible
                && graduationYearEligible && ageEligible && skillsEligible;

        return CandidateMatchResult.builder()
                .matchScore(matchScore)
                .matchedSkills(matched)
                .missingSkills(missing)
                .eligible(eligible)
                .meetsMinCgpa(meetsMinCgpa)
                .backlogsWithinLimit(backlogsWithinLimit)
                .courseEligible(courseEligible)
                .build();
    }

    /**
     * Calculates match score for arbitrary skill queries against a candidate's skills.
     */
    public CandidateMatchResult calculateSkillSearchMatch(
            List<String> candidateSkills,
            List<String> queriedSkills) {

        return calculateMatch(candidateSkills, queriedSkills, null, null);
    }
}
