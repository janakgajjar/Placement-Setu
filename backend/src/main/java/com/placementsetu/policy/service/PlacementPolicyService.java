package com.placementsetu.policy.service;

import com.placementsetu.exception.BadRequestException;
import com.placementsetu.matching.service.SkillNormalizer;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.policy.dto.PolicyValidationResult;
import com.placementsetu.student.entity.StudentProfile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Institutional Campus Placement Rules & Policy Engine.
 * Enforces Gujarat Vidyapith placement bylaws:
 * 1. Student Selection Rules ("One Student One Job" and Dream Offer policy)
 * 2. Paid Internship Standards (Mandatory stipend threshold >= ₹10,000/month)
 * 3. Age Limit Validation (Candidate age calculated from Date of Birth)
 * 4. Shortlisting & Ranking Policy
 */
@Slf4j
@Service
public class PlacementPolicyService {

    public static final BigDecimal MINIMUM_PAID_INTERNSHIP_STIPEND = new BigDecimal("10000.00");
    public static final BigDecimal DREAM_OFFER_MINIMUM_CTC = new BigDecimal("800000.00"); // 8 LPA base for Dream Offer

    private final SkillNormalizer skillNormalizer = new SkillNormalizer();

    /**
     * Validates whether a student satisfies all selection, academic, and age rules for a drive.
     */
    public PolicyValidationResult evaluateStudentApplication(StudentProfile student, PlacementDrive drive) {
        return evaluateStudentApplication(student, drive, Collections.emptyList(), Collections.emptyList());
    }

    /**
     * Validates whether a student satisfies all selection, academic, age, and required-skill rules for a drive.
     */
    public PolicyValidationResult evaluateStudentApplication(
            StudentProfile student,
            PlacementDrive drive,
            Collection<String> candidateSkills,
            Collection<String> requiredSkills) {
        List<String> violations = new ArrayList<>();

        // 1. "One Student One Job" Policy & Dream Offer Rule
        if (student.isPlacementLocked()) {
            boolean isDreamOffer = Boolean.TRUE.equals(drive.getIsDreamOffer())
                    || (drive.getCtc() != null && drive.getCtc().compareTo(DREAM_OFFER_MINIMUM_CTC) >= 0);

            if (!isDreamOffer) {
                violations.add("Policy Violation: Student is already placed and locked under 'One Student One Job' policy. Only verified Dream Offers (>= 8.0 LPA) permit secondary applications.");
            }
        }

        // 2. Age Limit Policy Check
        if (drive.getMaximumAge() != null && drive.getMaximumAge() > 0) {
            if (student.getDateOfBirth() == null) {
                violations.add("Age Policy: Date of birth is required in student profile to verify compliance with maximum age limit (" + drive.getMaximumAge() + " years).");
            } else {
                int studentAge = Period.between(student.getDateOfBirth(), LocalDate.now()).getYears();
                if (studentAge > drive.getMaximumAge()) {
                    violations.add("Age Policy Violation: Candidate age (" + studentAge + " years) exceeds the maximum allowed age of " + drive.getMaximumAge() + " years for this drive.");
                }
            }
        }

        // 3. Minimum CGPA Policy Check
        if (drive.getMinimumCgpa() != null) {
            if (student.getCgpa() == null) {
                violations.add("Academic Eligibility: CGPA is required to verify minimum CGPA requirement (" + drive.getMinimumCgpa() + ").");
            } else if (student.getCgpa().compareTo(drive.getMinimumCgpa()) < 0) {
                violations.add("Academic Eligibility: Minimum CGPA required is " + drive.getMinimumCgpa() + ", but student's CGPA is " + student.getCgpa() + ".");
            }
        }

        // 4. Maximum Active Backlogs Policy Check
        if (drive.getMaximumBacklogs() != null) {
            if (student.getBacklogs() == null) {
                violations.add("Backlog Eligibility: Active backlog count is required to verify maximum allowed backlogs (" + drive.getMaximumBacklogs() + ").");
            } else if (student.getBacklogs() > drive.getMaximumBacklogs()) {
                violations.add("Backlog Eligibility: Maximum allowed backlogs is " + drive.getMaximumBacklogs() + ", but student has " + student.getBacklogs() + " active backlogs.");
            }
        }

        // 5. Course & Graduation Year Check
        if (drive.getRequiredCourse() != null && !drive.getRequiredCourse().isBlank()) {
            if (student.getCourse() == null || !drive.getRequiredCourse().trim().equalsIgnoreCase(student.getCourse().trim())) {
                violations.add("Course Eligibility: This drive is exclusively open to " + drive.getRequiredCourse() + " students.");
            }
        }

        if (drive.getGraduationYear() != null) {
            if (student.getGraduationYear() == null || !drive.getGraduationYear().equals(student.getGraduationYear())) {
                violations.add("Graduation Year Eligibility: Open only to " + drive.getGraduationYear() + " graduating batch.");
            }
        }

        // 6. Required Skills Check
        if (requiredSkills != null && !requiredSkills.isEmpty()) {
            Set<String> normalizedCandidate = skillNormalizer.normalizeAll(candidateSkills);
            List<String> missingSkills = new ArrayList<>();
            for (String req : requiredSkills) {
                if (req == null || req.isBlank()) continue;
                if (!normalizedCandidate.contains(skillNormalizer.normalize(req))) {
                    missingSkills.add(req.trim());
                }
            }
            if (!missingSkills.isEmpty()) {
                violations.add("Skill Eligibility: Missing required skills: " + String.join(", ", missingSkills) + ".");
            }
        }

        if (!violations.isEmpty()) {
            return PolicyValidationResult.builder()
                    .eligible(false)
                    .rejectionReasons(violations)
                    .policyCategory("SELECTION_AND_ELIGIBILITY")
                    .build();
        }

        return PolicyValidationResult.pass();
    }

    /**
     * Enforces Institutional Paid Internship Bylaws when a company registers an internship drive.
     */
    public void validatePaidInternshipPolicy(PlacementDrive drive) {
        String type = drive.getDriveType() != null ? drive.getDriveType().toUpperCase() : "FULL_TIME";

        if ("PAID_INTERNSHIP".equals(type) || "INTERNSHIP_TO_PPO".equals(type)) {
            if (drive.getStipend() == null || drive.getStipend().compareTo(MINIMUM_PAID_INTERNSHIP_STIPEND) < 0) {
                throw new BadRequestException("Institutional Internship Policy Violation: Gujarat Vidyapith requires a minimum monthly stipend of ₹"
                        + MINIMUM_PAID_INTERNSHIP_STIPEND + " for all campus internships. Unpaid internships are strictly prohibited.");
            }
        }
    }
}
