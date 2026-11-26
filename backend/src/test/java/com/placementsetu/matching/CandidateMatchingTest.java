package com.placementsetu.matching;

import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.common.enums.ProfileStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.matching.dto.CandidateMatchResult;
import com.placementsetu.matching.dto.CandidateProfileDto;
import com.placementsetu.matching.service.CandidateMatchingService;
import com.placementsetu.matching.service.SkillNormalizer;
import com.placementsetu.matching.service.impl.CompanyCandidateServiceImpl;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.ProjectRepository;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.repository.StudentSkillRepository;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateMatchingTest {

    private SkillNormalizer skillNormalizer;
    private CandidateMatchingService candidateMatchingService;

    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private StudentSkillRepository studentSkillRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private SkillRepository skillRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private PlacementDriveRepository driveRepository;
    @Mock
    private DriveSkillRepository driveSkillRepository;
    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProfileValidationService profileValidationService;

    private CompanyCandidateServiceImpl companyCandidateService;

    @BeforeEach
    void setUp() {
        skillNormalizer = new SkillNormalizer();
        candidateMatchingService = new CandidateMatchingService(skillNormalizer);
        companyCandidateService = new CompanyCandidateServiceImpl(
                studentProfileRepository,
                studentSkillRepository,
                projectRepository,
                skillRepository,
                companyRepository,
                driveRepository,
                driveSkillRepository,
                applicationRepository,
                userRepository,
                candidateMatchingService,
                profileValidationService
        );
    }

    @Test
    @DisplayName("SkillNormalizer correctly normalizes aliases and common variations")
    void testSkillNormalizerAliases() {
        assertEquals("javascript", skillNormalizer.normalize("  js  "));
        assertEquals("react", skillNormalizer.normalize("ReactJS"));
        assertEquals("nodejs", skillNormalizer.normalize("Node.js"));
        assertEquals("python", skillNormalizer.normalize("py"));
        assertEquals("kubernetes", skillNormalizer.normalize("k8s"));
        assertEquals("postgresql", skillNormalizer.normalize("postgres"));
        assertEquals("docker", skillNormalizer.normalize("DOCKER"));
        assertEquals("unknown-tech", skillNormalizer.normalize("unknown-tech"));
    }

    @Test
    @DisplayName("Matching score 100% when all required skills match (including aliases)")
    void testFullSkillMatch() {
        List<String> candidateSkills = List.of("JavaScript", "ReactJS", "Node.js", "SQL");
        List<String> requiredSkills = List.of("js", "react", "node");

        CandidateMatchResult result = candidateMatchingService.calculateMatch(
                candidateSkills, requiredSkills, null, null
        );

        assertEquals(100, result.getMatchScore());
        assertEquals(3, result.getMatchedSkills().size());
        assertTrue(result.getMissingSkills().isEmpty());
    }

    @Test
    @DisplayName("Matching score 25% when 1 of 4 required skills match")
    void testPartialSkillMatch() {
        List<String> candidateSkills = List.of("Python", "Django");
        List<String> requiredSkills = List.of("python", "react", "docker", "aws");

        CandidateMatchResult result = candidateMatchingService.calculateMatch(
                candidateSkills, requiredSkills, null, null
        );

        assertEquals(25, result.getMatchScore());
        assertEquals(1, result.getMatchedSkills().size());
        assertEquals(3, result.getMissingSkills().size());
    }

    @Test
    @DisplayName("Matching score 0% when no skills match")
    void testZeroSkillMatch() {
        List<String> candidateSkills = List.of("C++", "Embedded");
        List<String> requiredSkills = List.of("Java", "Spring Boot");

        CandidateMatchResult result = candidateMatchingService.calculateMatch(
                candidateSkills, requiredSkills, null, null
        );

        assertEquals(0, result.getMatchScore());
        assertTrue(result.getMatchedSkills().isEmpty());
        assertEquals(2, result.getMissingSkills().size());
    }

    @Test
    @DisplayName("Matching score 100% when no required skills specified")
    void testEmptyRequiredSkills() {
        CandidateMatchResult result = candidateMatchingService.calculateMatch(
                List.of("Java"), Collections.emptyList(), null, null
        );

        assertEquals(100, result.getMatchScore());
    }

    @Test
    @DisplayName("Eligibility calculation validates minCgpa, backlogs, and course")
    void testEligibilityChecks() {
        PlacementDrive drive = PlacementDrive.builder()
                .minimumCgpa(new BigDecimal("7.50"))
                .maximumBacklogs(1)
                .requiredCourse("MCA")
                .build();

        StudentProfile eligibleProfile = StudentProfile.builder()
                .cgpa(new BigDecimal("8.20"))
                .backlogs(0)
                .course("MCA")
                .build();

        CandidateMatchResult res1 = candidateMatchingService.calculateMatch(
                List.of("Java"), List.of("Java"), eligibleProfile, drive
        );
        assertTrue(res1.isEligible());
        assertTrue(res1.isMeetsMinCgpa());
        assertTrue(res1.isBacklogsWithinLimit());
        assertTrue(res1.isCourseEligible());

        StudentProfile lowCgpaProfile = StudentProfile.builder()
                .cgpa(new BigDecimal("6.90"))
                .backlogs(0)
                .course("MCA")
                .build();
        CandidateMatchResult res2 = candidateMatchingService.calculateMatch(
                List.of("Java"), List.of("Java"), lowCgpaProfile, drive
        );
        assertFalse(res2.isEligible());
        assertFalse(res2.isMeetsMinCgpa());

        StudentProfile highBacklogProfile = StudentProfile.builder()
                .cgpa(new BigDecimal("8.00"))
                .backlogs(3)
                .course("MCA")
                .build();
        CandidateMatchResult res3 = candidateMatchingService.calculateMatch(
                List.of("Java"), List.of("Java"), highBacklogProfile, drive
        );
        assertFalse(res3.isEligible());
        assertFalse(res3.isBacklogsWithinLimit());

        StudentProfile diffCourseProfile = StudentProfile.builder()
                .cgpa(new BigDecimal("8.00"))
                .backlogs(0)
                .course("B.Tech")
                .build();
        CandidateMatchResult res4 = candidateMatchingService.calculateMatch(
                List.of("Java"), List.of("Java"), diffCourseProfile, drive
        );
        assertFalse(res4.isEligible());
        assertFalse(res4.isCourseEligible());
    }

    @Test
    @DisplayName("IDOR Protection: Access denied if drive does not belong to logged-in company")
    void testIdorProtectionOnDriveCandidates() {
        UUID companyAId = UUID.randomUUID();
        UUID companyBId = UUID.randomUUID();
        UUID driveId = UUID.randomUUID();

        Company companyA = Company.builder()
                .id(companyAId)
                .userId(companyAId)
                .companyName("Company Alpha")
                .build();

        PlacementDrive driveOfCompanyB = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyBId)
                .jobTitle("Software Engineer")
                .build();

        when(companyRepository.findByUserId(companyAId)).thenReturn(Optional.of(companyA));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(driveOfCompanyB));

        assertThrows(AccessDeniedException.class, () ->
                companyCandidateService.getDriveMatchedCandidates(companyAId, driveId, PageRequest.of(0, 10))
        );
    }

    @Test
    @DisplayName("Privacy Safeguard: Contact info masked unless student applied to company")
    void testContactInfoPrivacyMasking() {
        UUID companyId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
        UUID studentUserId = UUID.randomUUID();

        User studentUser = User.builder()
                .id(studentUserId)
                .email("student.private@example.com")
                .build();

        StudentProfile profile = StudentProfile.builder()
                .id(profileId)
                .userId(studentUserId)
                .fullName("Rahul Verma")
                .phone("9876543210")
                .address("123 Street, Ahmedabad")
                .course("MCA")
                .cgpa(new BigDecimal("8.50"))
                .backlogs(0)
                .profileStatus(ProfileStatus.COMPLETE)
                .approvalStatus(ProfileApprovalStatus.APPROVED)
                .build();

        Company company = Company.builder()
                .id(companyId)
                .userId(companyId)
                .companyName("Test Corp")
                .build();

        when(companyRepository.findByUserId(companyId)).thenReturn(Optional.of(company));
        when(studentProfileRepository.findAll(any(Specification.class))).thenReturn(List.of(profile));
        when(applicationRepository.findByStudentProfileIdAndCompanyId(profileId, companyId))
                .thenReturn(Collections.emptyList());
        when(studentSkillRepository.findByStudentProfileId(profileId)).thenReturn(Collections.emptyList());
        when(projectRepository.findByStudentProfileId(profileId)).thenReturn(Collections.emptyList());

        Page<CandidateProfileDto> candidates = companyCandidateService.searchCandidates(
                companyId, null, null, null, null, PageRequest.of(0, 10)
        );

        assertNotNull(candidates);
        assertEquals(1, candidates.getContent().size());
        CandidateProfileDto candidate = candidates.getContent().get(0);

        assertNull(candidate.getEmail(), "Email must be masked for non-applicant");
        assertNull(candidate.getPhone(), "Phone must be masked for non-applicant");
        assertNull(candidate.getAddress(), "Address must be masked for non-applicant");
        assertFalse(candidate.isApplied());
    }

    @Test
    @DisplayName("Company cannot access drive matched candidates before registration closes; unapproved/ineligible filtered out")
    void testRegistrationCloseAndApprovalFilteringOnDriveCandidates() {
        UUID companyId = UUID.randomUUID();
        UUID driveId = UUID.randomUUID();
        Company company = Company.builder().id(companyId).userId(companyId).companyName("Test Corp").build();

        PlacementDrive openDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .status(DriveStatus.PUBLISHED)
                .registrationEnd(java.time.LocalDateTime.now().plusDays(5))
                .build();

        when(companyRepository.findByUserId(companyId)).thenReturn(Optional.of(company));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(openDrive));

        assertThrows(BadRequestException.class, () ->
                companyCandidateService.getDriveMatchedCandidates(companyId, driveId, PageRequest.of(0, 10)));

        PlacementDrive closedDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .status(DriveStatus.CLOSED)
                .minimumCgpa(new BigDecimal("7.50"))
                .build();

        StudentProfile approvedEligible = StudentProfile.builder()
                .id(UUID.randomUUID()).userId(UUID.randomUUID()).fullName("Eligible Approved")
                .cgpa(new BigDecimal("8.50")).backlogs(0).profileStatus(ProfileStatus.COMPLETE)
                .approvalStatus(ProfileApprovalStatus.APPROVED).build();
        StudentProfile unapproved = StudentProfile.builder()
                .id(UUID.randomUUID()).userId(UUID.randomUUID()).fullName("Unapproved")
                .cgpa(new BigDecimal("9.00")).backlogs(0).profileStatus(ProfileStatus.COMPLETE)
                .approvalStatus(ProfileApprovalStatus.SUBMITTED).build();

        when(driveRepository.findById(driveId)).thenReturn(Optional.of(closedDrive));
        when(driveSkillRepository.findByDriveId(driveId)).thenReturn(Collections.emptyList());
        when(studentProfileRepository.findAll()).thenReturn(List.of(approvedEligible, unapproved));
        when(studentSkillRepository.findByStudentProfileId(any())).thenReturn(Collections.emptyList());
        when(projectRepository.findByStudentProfileId(any())).thenReturn(Collections.emptyList());
        when(applicationRepository.findByStudentProfileIdAndPlacementDriveId(any(), eq(driveId))).thenReturn(Optional.empty());
        when(applicationRepository.findByStudentProfileIdAndCompanyId(any(), eq(companyId))).thenReturn(Collections.emptyList());

        Page<CandidateProfileDto> result = companyCandidateService.getDriveMatchedCandidates(companyId, driveId, PageRequest.of(0, 10));
        assertEquals(1, result.getTotalElements());
        assertEquals("Eligible Approved", result.getContent().get(0).getFullName());
    }
}
