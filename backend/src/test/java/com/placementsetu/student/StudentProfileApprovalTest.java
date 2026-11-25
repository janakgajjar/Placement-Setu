package com.placementsetu.student;

import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.common.enums.ProfileStatus;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.officer.controller.OfficerStudentController;
import com.placementsetu.officer.service.impl.OfficerStudentServiceImpl;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.dto.ProjectRequest;
import com.placementsetu.student.dto.SkillRequest;
import com.placementsetu.student.dto.StudentProfileResponse;
import com.placementsetu.student.dto.UpdateStudentProfileRequest;
import com.placementsetu.student.entity.Project;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.*;
import com.placementsetu.student.service.impl.StudentProfileServiceImpl;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentProfileApprovalTest {

    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private StudentSkillRepository studentSkillRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private CertificationRepository certificationRepository;
    @Mock private ResumeRepository resumeRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private NotificationService notificationService;
    @Mock private PlacementDriveRepository placementDriveRepository;
    @Mock private DriveSkillRepository driveSkillRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private AuditService auditService;

    private ProfileValidationService profileValidationService;
    private StudentProfileServiceImpl studentProfileService;
    private OfficerStudentServiceImpl officerStudentService;

    private UUID studentUserId;
    private UUID officerUserId;
    private UUID profileId;
    private StudentProfile completeProfile;

    @BeforeEach
    void setUp() {
        profileValidationService = new ProfileValidationService(resumeRepository);
        studentProfileService = new StudentProfileServiceImpl(
                studentProfileRepository, skillRepository, studentSkillRepository,
                projectRepository, certificationRepository, resumeRepository,
                userRepository, profileValidationService, applicationRepository, notificationService,
                placementDriveRepository, driveSkillRepository, companyRepository, new PlacementPolicyService(), auditService);
        officerStudentService = new OfficerStudentServiceImpl(
                studentProfileRepository, userRepository, studentProfileService, notificationService, auditService);

        studentUserId = UUID.randomUUID();
        officerUserId = UUID.randomUUID();
        profileId = UUID.randomUUID();

        completeProfile = StudentProfile.builder()
                .id(profileId)
                .userId(studentUserId)
                .fullName("Riya Patel")
                .phone("9876543210")
                .course("MCA")
                .institution("Gujarat Vidyapith")
                .graduationYear((short) 2026)
                .cgpa(new BigDecimal("8.50"))
                .apparId("APAAR12345")
                .linkedinUrl("https://linkedin.com/in/riya")
                .githubUrl("https://github.com/riya")
                .profileStatus(ProfileStatus.COMPLETE)
                .approvalStatus(ProfileApprovalStatus.DRAFT)
                .build();
    }

    @Test
    @DisplayName("OfficerStudentController enforces PLACEMENT_OFFICER role")
    void testOfficerStudentControllerRoleGuard() {
        PreAuthorize preAuth = OfficerStudentController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth);
        assertEquals("hasRole('PLACEMENT_OFFICER')", preAuth.value());
    }

    @Test
    @DisplayName("Student profile workflow: DRAFT -> SUBMITTED -> CHANGES_REQUESTED -> resubmit -> SUBMITTED -> APPROVED")
    void testFullProfileApprovalAndResubmissionWorkflow() {
        when(studentProfileRepository.findByUserId(studentUserId)).thenReturn(Optional.of(completeProfile));
        when(studentProfileRepository.findById(profileId)).thenReturn(Optional.of(completeProfile));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(studentUserId)).thenReturn(Optional.of(User.builder().id(studentUserId).email("riya@uni.edu").build()));

        StudentProfileResponse submitted = studentProfileService.submitProfile(studentUserId);
        assertEquals(ProfileApprovalStatus.SUBMITTED, submitted.getApprovalStatus());
        verify(notificationService).notifyOfficersAndAdmins(
                eq(NotificationType.PROFILE_SUBMITTED), anyString(), anyString(), eq("STUDENT_PROFILE"), eq(profileId), anyString());

        StudentProfileResponse changesRequested = officerStudentService.requestProfileChanges(
                officerUserId, profileId, "Please update your GitHub URL");
        assertEquals(ProfileApprovalStatus.CHANGES_REQUESTED, changesRequested.getApprovalStatus());
        assertEquals("Please update your GitHub URL", changesRequested.getReviewRemarks());
        assertEquals(officerUserId, changesRequested.getReviewedBy());
        assertNotNull(changesRequested.getReviewedAt());

        // Student edits and resubmits
        UpdateStudentProfileRequest editReq = new UpdateStudentProfileRequest();
        editReq.setGithubUrl("https://github.com/riya-patel");
        studentProfileService.updateProfile(studentUserId, editReq);

        StudentProfileResponse resubmitted = studentProfileService.submitProfile(studentUserId);
        assertEquals(ProfileApprovalStatus.SUBMITTED, resubmitted.getApprovalStatus());
        assertNull(resubmitted.getReviewRemarks());

        StudentProfileResponse approved = officerStudentService.approveStudentProfile(officerUserId, profileId);
        assertEquals(ProfileApprovalStatus.APPROVED, approved.getApprovalStatus());
        assertEquals(officerUserId, approved.getReviewedBy());
        assertNotNull(approved.getReviewedAt());
    }

    @Test
    @DisplayName("Incomplete profile cannot be submitted and officer requires meaningful remarks for changes")
    void testSubmitIncompleteAndOfficerValidation() {
        completeProfile.setCgpa(null);
        when(studentProfileRepository.findByUserId(studentUserId)).thenReturn(Optional.of(completeProfile));

        assertThrows(BadRequestException.class, () -> studentProfileService.submitProfile(studentUserId));
        assertThrows(BadRequestException.class, () -> officerStudentService.requestProfileChanges(officerUserId, profileId, "bad"));

        completeProfile.setApprovalStatus(ProfileApprovalStatus.DRAFT);
        when(studentProfileRepository.findById(profileId)).thenReturn(Optional.of(completeProfile));
        assertThrows(BadRequestException.class, () -> officerStudentService.approveStudentProfile(officerUserId, profileId));
    }

    @Test
    @DisplayName("Modifying profile, skill, project, or resume invalidates APPROVED status and requires resubmission")
    void testModificationsInvalidateApprovedProfile() {
        completeProfile.setApprovalStatus(ProfileApprovalStatus.APPROVED);
        completeProfile.setReviewedBy(officerUserId);

        when(studentProfileRepository.findByUserId(studentUserId)).thenReturn(Optional.of(completeProfile));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(studentUserId)).thenReturn(Optional.of(User.builder().id(studentUserId).email("riya@uni.edu").build()));

        // 1. Editing profile invalidates approval
        UpdateStudentProfileRequest req = new UpdateStudentProfileRequest();
        req.setPhone("9999999999");
        studentProfileService.updateProfile(studentUserId, req);
        assertEquals(ProfileApprovalStatus.DRAFT, completeProfile.getApprovalStatus());
        assertNull(completeProfile.getReviewedBy());

        // 2. Adding a skill invalidates approval
        completeProfile.setApprovalStatus(ProfileApprovalStatus.APPROVED);
        when(skillRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(Skill.builder().id(UUID.randomUUID()).name("Java").build()));
        when(studentSkillRepository.findByStudentProfileId(profileId)).thenReturn(List.of());
        SkillRequest skillReq = new SkillRequest();
        skillReq.setName("Java");
        studentProfileService.addSkill(studentUserId, skillReq);
        assertEquals(ProfileApprovalStatus.DRAFT, completeProfile.getApprovalStatus());

        // 3. Adding a project invalidates approval
        completeProfile.setApprovalStatus(ProfileApprovalStatus.APPROVED);
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));
        ProjectRequest projectReq = new ProjectRequest();
        projectReq.setTitle("PlacementSetu");
        studentProfileService.addProject(studentUserId, projectReq);
        assertEquals(ProfileApprovalStatus.DRAFT, completeProfile.getApprovalStatus());

        // 4. Resume parsing calling computeProfileStatus invalidates approval
        completeProfile.setApprovalStatus(ProfileApprovalStatus.APPROVED);
        profileValidationService.computeProfileStatus(completeProfile);
        assertEquals(ProfileApprovalStatus.DRAFT, completeProfile.getApprovalStatus());
    }
}
