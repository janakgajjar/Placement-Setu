package com.placementsetu.officer;

import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.application.repository.ApplicationStatusHistoryRepository;
import com.placementsetu.application.service.impl.ApplicationServiceImpl;
import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.officer.controller.OfficerDriveController;
import com.placementsetu.officer.service.impl.OfficerDriveServiceImpl;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.*;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.student.service.impl.StudentProfileServiceImpl;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficerDriveApprovalTest {

    @Mock private PlacementDriveRepository driveRepository;
    @Mock private DriveSkillRepository driveSkillRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditService auditService;

    @InjectMocks
    private OfficerDriveServiceImpl officerDriveService;

    private UUID officerUserId;
    private UUID companyId;
    private UUID companyUserId;
    private UUID driveId;
    private Company mockCompany;
    private PlacementDrive pendingDrive;

    @BeforeEach
    void setUp() {
        officerUserId = UUID.randomUUID();
        companyId = UUID.randomUUID();
        companyUserId = UUID.randomUUID();
        driveId = UUID.randomUUID();

        mockCompany = Company.builder()
                .id(companyId)
                .userId(companyUserId)
                .companyName("Infosys Ltd")
                .website("https://infosys.com")
                .build();

        pendingDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Systems Engineer")
                .description("Full Stack Java/React")
                .location("Gandhinagar")
                .ctc(new BigDecimal("650000"))
                .vacancies(10)
                .requiredCourse("Master of Computer Applications (MCA)")
                .status(DriveStatus.PENDING_APPROVAL)
                .submittedAt(LocalDateTime.now().minusHours(2))
                .registrationStart(LocalDateTime.now().plusDays(1))
                .registrationEnd(LocalDateTime.now().plusDays(15))
                .build();
    }

    @Test
    @DisplayName("PO retrieves pending approval queue")
    void testGetPendingDrives() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(driveRepository.findByStatus(DriveStatus.PENDING_APPROVAL, pageable))
                .thenReturn(new PageImpl<>(List.of(pendingDrive)));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        Page<DriveResponse> page = officerDriveService.getPendingDrives(pageable);
        assertEquals(1, page.getTotalElements());
        assertEquals(DriveStatus.PENDING_APPROVAL, page.getContent().get(0).getStatus());
        assertEquals("Infosys Ltd", page.getContent().get(0).getCompanyName());
    }

    @Test
    @DisplayName("PO approves PENDING_APPROVAL drive with remarks -> PUBLISHED, records review metadata, notifies & audits")
    void testApprovePendingDriveWithRemarks() {
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(pendingDrive));
        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        DriveResponse res = officerDriveService.approveDrive(officerUserId, driveId, "  Approved for MCA 2026 batch  ");

        assertEquals(DriveStatus.PUBLISHED, res.getStatus());
        assertEquals("Approved for MCA 2026 batch", res.getReviewRemarks());
        assertNull(res.getRejectionReason());
        assertEquals(officerUserId, res.getReviewedBy());
        assertNotNull(res.getReviewedAt());

        verify(notificationService).notifyDriveApproved(
                driveId, "Systems Engineer", "Infosys Ltd", companyUserId, "Approved for MCA 2026 batch");
        verify(auditService).logEvent(eq(officerUserId), eq("DRIVE_APPROVED"), eq("PLACEMENT_DRIVE"), eq(driveId), any());
    }

    @Test
    @DisplayName("PO rejects PENDING_APPROVAL drive with remarks -> REJECTED, records remarks & reason, notifies & audits")
    void testRejectPendingDriveWithRemarks() {
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(pendingDrive));
        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        DriveResponse res = officerDriveService.rejectDrive(officerUserId, driveId, "Course mismatch with department");

        assertEquals(DriveStatus.REJECTED, res.getStatus());
        assertEquals("Course mismatch with department", res.getReviewRemarks());
        assertEquals("Course mismatch with department", res.getRejectionReason());
        assertEquals(officerUserId, res.getReviewedBy());
        assertNotNull(res.getReviewedAt());

        verify(notificationService).notifyDriveRejected(
                driveId, "Systems Engineer", "Infosys Ltd", companyUserId, "Course mismatch with department");
        verify(auditService).logEvent(eq(officerUserId), eq("DRIVE_REJECTED"), eq("PLACEMENT_DRIVE"), eq(driveId), any());
    }

    @Test
    @DisplayName("PO cannot approve or reject without nonblank remarks")
    void testApproveOrRejectRequiresNonBlankRemarks() {
        assertThrows(BadRequestException.class, () -> officerDriveService.approveDrive(officerUserId, driveId, "   "));
        assertThrows(BadRequestException.class, () -> officerDriveService.approveDrive(officerUserId, driveId, null));
        assertThrows(BadRequestException.class, () -> officerDriveService.rejectDrive(officerUserId, driveId, ""));
        verify(driveRepository, never()).save(any());
    }

    @Test
    @DisplayName("PO cannot approve or reject a non-PENDING_APPROVAL drive")
    void testCannotApproveOrRejectNonPendingDrive() {
        for (DriveStatus status : List.of(DriveStatus.DRAFT, DriveStatus.PUBLISHED, DriveStatus.REJECTED, DriveStatus.CLOSED)) {
            pendingDrive.setStatus(status);
            when(driveRepository.findById(driveId)).thenReturn(Optional.of(pendingDrive));
            assertThrows(BadRequestException.class, () -> officerDriveService.approveDrive(officerUserId, driveId, "Valid remarks"));
            assertThrows(BadRequestException.class, () -> officerDriveService.rejectDrive(officerUserId, driveId, "Valid remarks"));
        }
    }

    @Test
    @DisplayName("PO controller enforces PLACEMENT_OFFICER role and exposes no edit endpoints")
    void testOfficerControllerSecurityAndReadOnlyCompanyFields() {
        PreAuthorize auth = OfficerDriveController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(auth);
        assertEquals("hasRole('PLACEMENT_OFFICER')", auth.value());

        boolean hasEditEndpoint = Arrays.stream(OfficerDriveController.class.getDeclaredMethods())
                .anyMatch(m -> m.isAnnotationPresent(PutMapping.class) || m.isAnnotationPresent(PatchMapping.class));
        assertFalse(hasEditEndpoint, "PO must not have PUT/PATCH endpoints to modify company drive details");
    }

    @Test
    @DisplayName("Student listing queries only PUBLISHED drives and application rejects non-PUBLISHED drives")
    void testStudentVisibilityAndApplicationRestriction() {
        StudentProfileRepository studentRepo = mock(StudentProfileRepository.class);
        StudentSkillRepository studentSkillRepo = mock(StudentSkillRepository.class);
        PlacementPolicyService policyService = mock(PlacementPolicyService.class);
        ApplicationRepository appRepo = mock(ApplicationRepository.class);
        ApplicationStatusHistoryRepository historyRepo = mock(ApplicationStatusHistoryRepository.class);
        ProfileValidationService profileValidationService = mock(ProfileValidationService.class);

        UUID studentUserId = UUID.randomUUID();
        StudentProfile student = StudentProfile.builder()
                .id(UUID.randomUUID())
                .userId(studentUserId)
                .approvalStatus(ProfileApprovalStatus.APPROVED)
                .build();

        UserRepository userRepo = mock(UserRepository.class);

        // 1. Student drive listing only queries DriveStatus.PUBLISHED
        StudentProfileServiceImpl studentService = new StudentProfileServiceImpl(
                studentRepo, mock(SkillRepository.class), studentSkillRepo,
                mock(ProjectRepository.class), mock(CertificationRepository.class),
                mock(ResumeRepository.class), userRepo, profileValidationService,
                appRepo, notificationService, driveRepository, driveSkillRepository,
                companyRepository, policyService, auditService);

        when(studentRepo.findByUserId(studentUserId)).thenReturn(Optional.of(student));
        when(studentSkillRepo.findByStudentProfileId(student.getId())).thenReturn(List.of());
        when(driveRepository.findByStatus(eq(DriveStatus.PUBLISHED), any())).thenReturn(Page.empty());

        studentService.getEligibleDrives(studentUserId, PageRequest.of(0, 10));
        verify(driveRepository).findByStatus(eq(DriveStatus.PUBLISHED), any());
        verify(driveRepository, never()).findByStatus(eq(DriveStatus.DRAFT), any());
        verify(driveRepository, never()).findByStatus(eq(DriveStatus.PENDING_APPROVAL), any());
        verify(driveRepository, never()).findByStatus(eq(DriveStatus.REJECTED), any());

        // 2. Student cannot apply to DRAFT, PENDING_APPROVAL, REJECTED, or CLOSED drives
        ApplicationServiceImpl appService = new ApplicationServiceImpl(
                appRepo, historyRepo, studentRepo, driveRepository,
                companyRepository, userRepo, notificationService,
                profileValidationService, policyService, driveSkillRepository,
                studentSkillRepo, skillRepository, auditService);

        when(studentRepo.findByUserId(studentUserId)).thenReturn(Optional.of(student));
        for (DriveStatus nonPublished : List.of(DriveStatus.DRAFT, DriveStatus.PENDING_APPROVAL, DriveStatus.REJECTED, DriveStatus.CLOSED)) {
            PlacementDrive d = PlacementDrive.builder().id(driveId).status(nonPublished).build();
            when(driveRepository.findById(driveId)).thenReturn(Optional.of(d));
            assertThrows(BadRequestException.class, () -> appService.apply(studentUserId, driveId));
        }
    }
}
