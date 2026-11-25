package com.placementsetu.policy;

import com.placementsetu.exception.BadRequestException;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.policy.dto.PolicyValidationResult;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.student.entity.StudentProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PlacementPolicyServiceTest {

    private PlacementPolicyService policyService;
    private StudentProfile eligibleStudent;
    private PlacementDrive strictDrive;

    @BeforeEach
    void setUp() {
        policyService = new PlacementPolicyService();

        eligibleStudent = StudentProfile.builder()
                .fullName("Aarav Patel")
                .cgpa(new BigDecimal("8.20"))
                .backlogs(0)
                .course("MCA")
                .graduationYear((short) 2026)
                .dateOfBirth(LocalDate.now().minusYears(22))
                .placementLocked(false)
                .build();

        strictDrive = PlacementDrive.builder()
                .jobTitle("Backend Engineer")
                .ctc(new BigDecimal("600000.00"))
                .minimumCgpa(new BigDecimal("7.50"))
                .maximumBacklogs(1)
                .requiredCourse("MCA")
                .graduationYear((short) 2026)
                .maximumAge(24)
                .isDreamOffer(false)
                .build();
    }

    @Test
    @DisplayName("Eligible student with matching skills passes all deterministic policy checks")
    void testEligibleStudentPasses() {
        PolicyValidationResult res = policyService.evaluateStudentApplication(
                eligibleStudent, strictDrive, List.of("Java", "Spring Boot"), List.of("java", "springboot"));
        assertTrue(res.isEligible());
        assertTrue(res.getRejectionReasons().isEmpty());
    }

    @Test
    @DisplayName("Every eligibility criterion (CGPA, backlogs, age, course, gradYear, skills) rejects non-compliant students")
    void testEveryEligibilityCriterion() {
        // CGPA
        eligibleStudent.setCgpa(new BigDecimal("7.00"));
        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
        eligibleStudent.setCgpa(new BigDecimal("8.20"));

        // Backlogs
        eligibleStudent.setBacklogs(2);
        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
        eligibleStudent.setBacklogs(0);

        // Age limit
        eligibleStudent.setDateOfBirth(LocalDate.now().minusYears(26));
        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
        eligibleStudent.setDateOfBirth(LocalDate.now().minusYears(22));

        // Course
        eligibleStudent.setCourse("BCA");
        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
        eligibleStudent.setCourse("MCA");

        // Graduation year
        eligibleStudent.setGraduationYear((short) 2025);
        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
        eligibleStudent.setGraduationYear((short) 2026);

        // Required skills
        PolicyValidationResult skillFail = policyService.evaluateStudentApplication(
                eligibleStudent, strictDrive, List.of("Java"), List.of("Java", "Docker"));
        assertFalse(skillFail.isEligible());
        assertTrue(skillFail.getRejectionReasons().stream().anyMatch(r -> r.contains("Docker")));
    }

    @Test
    @DisplayName("One-Student-One-Job blocks ordinary drives when locked, allows Dream Offer (>= 8 LPA)")
    void testOneStudentOneJobAndDreamOfferException() {
        eligibleStudent.setPlacementLocked(true);

        assertFalse(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());

        // Dream offer by CTC >= 8 LPA
        strictDrive.setCtc(new BigDecimal("800000.00"));
        assertTrue(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());

        // Dream offer by explicit flag
        strictDrive.setCtc(new BigDecimal("600000.00"));
        strictDrive.setIsDreamOffer(true);
        assertTrue(policyService.evaluateStudentApplication(eligibleStudent, strictDrive).isEligible());
    }

    @Test
    @DisplayName("Paid internship policy requires minimum monthly stipend of 10,000")
    void testPaidInternshipMinimumStipend() {
        PlacementDrive lowStipend = PlacementDrive.builder()
                .driveType("PAID_INTERNSHIP")
                .stipend(new BigDecimal("9999.00"))
                .build();
        assertThrows(BadRequestException.class, () -> policyService.validatePaidInternshipPolicy(lowStipend));

        PlacementDrive validStipend = PlacementDrive.builder()
                .driveType("PAID_INTERNSHIP")
                .stipend(new BigDecimal("10000.00"))
                .build();
        assertDoesNotThrow(() -> policyService.validatePaidInternshipPolicy(validStipend));
    }
}
