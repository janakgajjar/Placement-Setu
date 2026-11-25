package com.placementsetu.placement;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.placement.controller.PlacementDriveController;
import com.placementsetu.placement.dto.CreateDriveRequest;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.dto.UpdateDriveRequest;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.placement.service.impl.PlacementDriveServiceImpl;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DriveApprovalWorkflowTest {

    @Mock private PlacementDriveRepository driveRepository;
    @Mock private DriveSkillRepository driveSkillRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private NotificationService notificationService;
    @Mock private PlacementPolicyService policyService;
    @Mock private AuditService auditService;

    @InjectMocks
    private PlacementDriveServiceImpl driveService;

    private UUID companyId;
    private UUID driveId;
    private PlacementDrive draftDrive;
    private PlacementDrive pendingDrive;
    private PlacementDrive rejectedDrive;
    private PlacementDrive publishedDrive;
    private PlacementDrive closedDrive;
    private Company mockCompany;

    @BeforeEach
    void setUp() {
        companyId = UUID.randomUUID();
        driveId = UUID.randomUUID();

        mockCompany = Company.builder()
                .id(companyId)
                .companyName("Tata Consultancy Services")
                .website("https://tcs.com")
                .userId(UUID.randomUUID())
                .build();

        draftDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .description("Java Full Stack role")
                .location("Gandhinagar")
                .ctc(new BigDecimal("700000"))
                .vacancies(5)
                .status(DriveStatus.DRAFT)
                .registrationStart(LocalDateTime.now())
                .registrationEnd(LocalDateTime.now().plusDays(10))
                .build();

        pendingDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .vacancies(5)
                .status(DriveStatus.PENDING_APPROVAL)
                .registrationStart(LocalDateTime.now())
                .registrationEnd(LocalDateTime.now().plusDays(10))
                .build();

        rejectedDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .vacancies(5)
                .status(DriveStatus.REJECTED)
                .reviewRemarks("Please update required course to MCA")
                .rejectionReason("Please update required course to MCA")
                .reviewedBy(UUID.randomUUID())
                .reviewedAt(LocalDateTime.now().minusHours(2))
                .registrationStart(LocalDateTime.now())
                .registrationEnd(LocalDateTime.now().plusDays(10))
                .build();

        publishedDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .description("Java Full Stack role")
                .location("Gandhinagar")
                .ctc(new BigDecimal("700000"))
                .vacancies(5)
                .status(DriveStatus.PUBLISHED)
                .registrationStart(LocalDateTime.now())
                .registrationEnd(LocalDateTime.now().plusDays(10))
                .build();

        closedDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .vacancies(5)
                .status(DriveStatus.CLOSED)
                .registrationStart(LocalDateTime.now().minusDays(10))
                .registrationEnd(LocalDateTime.now().minusDays(1))
                .build();
    }

    @Test
    @DisplayName("DriveStatus enum contains exact 5 approved statuses without OPEN")
    void testDriveStatusEnumValues() {
        Set<String> names = Arrays.stream(DriveStatus.values()).map(Enum::name).collect(Collectors.toSet());
        assertEquals(Set.of("DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "CLOSED"), names);
    }

    @Test
    @DisplayName("Company creates drive -> saved in DRAFT status")
    void testCreateDriveStartsAsDraft() {
        CreateDriveRequest req = new CreateDriveRequest();
        req.setJobTitle("Backend Engineer");
        req.setVacancies(4);
        req.setRegistrationStart(LocalDateTime.now());
        req.setRegistrationEnd(LocalDateTime.now().plusDays(10));

        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(inv -> {
            PlacementDrive d = inv.getArgument(0);
            d.setId(driveId);
            return d;
        });
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        DriveResponse res = driveService.createDrive(companyId, req);
        assertEquals(DriveStatus.DRAFT, res.getStatus());
        verify(auditService).logEvent(eq(companyId), eq("DRIVE_CREATED"), eq("PLACEMENT_DRIVE"), eq(driveId), any());
    }

    @Test
    @DisplayName("Company submits DRAFT drive -> transitions to PENDING_APPROVAL, records submittedAt, notifies PO")
    void testCompanySubmitDraftDriveMovesToPendingApproval() {
        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(draftDrive));
        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        DriveResponse response = driveService.submitDriveForApproval(companyId, driveId);

        assertNotNull(response);
        assertEquals(DriveStatus.PENDING_APPROVAL, response.getStatus());
        assertNotNull(response.getSubmittedAt());
        verify(notificationService).notifyDriveSubmittedForApproval(driveId, "Associate Software Engineer", "Tata Consultancy Services");
        verify(auditService).logEvent(eq(companyId), eq("DRIVE_SUBMITTED_FOR_APPROVAL"), eq("PLACEMENT_DRIVE"), eq(driveId), any());
    }

    @Test
    @DisplayName("Company cannot directly publish a drive (no publishDrive endpoint on PlacementDriveController)")
    void testCompanyCannotDirectlyPublish() {
        boolean hasPublishMethod = Arrays.stream(PlacementDriveController.class.getDeclaredMethods())
                .anyMatch(m -> m.getName().toLowerCase().contains("publish"));
        assertFalse(hasPublishMethod, "PlacementDriveController must not expose a direct publish endpoint");
    }

    @Test
    @DisplayName("Company cannot edit another company's drive")
    void testCannotEditAnotherCompanysDrive() {
        UUID otherCompanyId = UUID.randomUUID();
        when(driveRepository.findByIdAndCompanyId(driveId, otherCompanyId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> driveService.updateDrive(otherCompanyId, driveId, new UpdateDriveRequest()));
    }

    @Test
    @DisplayName("Company can edit a REJECTED drive (clearing review metadata) and resubmit it")
    void testEditRejectedDriveAndResubmit() {
        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(rejectedDrive));
        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        UpdateDriveRequest update = new UpdateDriveRequest();
        update.setRequiredCourse("Master of Computer Applications (MCA)");

        DriveResponse updated = driveService.updateDrive(companyId, driveId, update);
        assertEquals(DriveStatus.REJECTED, updated.getStatus());
        assertNull(updated.getReviewRemarks());
        assertNull(updated.getRejectionReason());
        assertNull(updated.getReviewedBy());
        assertNull(updated.getReviewedAt());

        DriveResponse resubmitted = driveService.submitDriveForApproval(companyId, driveId);
        assertEquals(DriveStatus.PENDING_APPROVAL, resubmitted.getStatus());
        assertNotNull(resubmitted.getSubmittedAt());
    }

    @Test
    @DisplayName("Company cannot edit PENDING_APPROVAL, PUBLISHED, or CLOSED drives")
    void testCannotEditNonEditableDrives() {
        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(pendingDrive));
        assertThrows(BadRequestException.class, () -> driveService.updateDrive(companyId, driveId, new UpdateDriveRequest()));

        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(publishedDrive));
        assertThrows(BadRequestException.class, () -> driveService.updateDrive(companyId, driveId, new UpdateDriveRequest()));

        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(closedDrive));
        assertThrows(BadRequestException.class, () -> driveService.updateDrive(companyId, driveId, new UpdateDriveRequest()));
    }

    @Test
    @DisplayName("Controller role permissions and company ID resolution from principal userId")
    void testControllerPermissionsAndCompanyIdResolution() {
        PreAuthorize companyAuth = PlacementDriveController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(companyAuth);
        assertEquals("hasRole('COMPANY')", companyAuth.value());

        UUID companyUserId = mockCompany.getUserId();
        User companyUser = User.builder()
                .id(companyUserId)
                .email("hr@tcs.com")
                .passwordHash("x")
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        CustomUserDetails principal = new CustomUserDetails(companyUser);

        when(companyRepository.findByUserId(companyUserId)).thenReturn(Optional.of(mockCompany));
        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(draftDrive));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        PlacementDriveController controller = new PlacementDriveController(driveService, companyRepository);
        var response = controller.getDrive(principal, driveId);
        assertTrue(response.isSuccess());
        assertEquals(companyId, response.getData().getCompanyId());
    }

    @Test
    @DisplayName("Create drive validates dates and enforces paid internship policy")
    void testCreateDriveValidationAndPaidInternshipPolicy() {
        CreateDriveRequest badDates = new CreateDriveRequest();
        badDates.setJobTitle("Intern");
        badDates.setVacancies(2);
        badDates.setRegistrationStart(LocalDateTime.now().plusDays(5));
        badDates.setRegistrationEnd(LocalDateTime.now().plusDays(2));

        assertThrows(BadRequestException.class, () -> driveService.createDrive(companyId, badDates));

        CreateDriveRequest internshipReq = new CreateDriveRequest();
        internshipReq.setJobTitle("Backend Intern");
        internshipReq.setVacancies(3);
        internshipReq.setDriveType("PAID_INTERNSHIP");
        internshipReq.setStipend(new BigDecimal("5000"));
        internshipReq.setRegistrationStart(LocalDateTime.now());
        internshipReq.setRegistrationEnd(LocalDateTime.now().plusDays(7));

        doThrow(new BadRequestException("Institutional Internship Policy Violation"))
                .when(policyService).validatePaidInternshipPolicy(any(PlacementDrive.class));

        assertThrows(BadRequestException.class, () -> driveService.createDrive(companyId, internshipReq));
        verify(driveRepository, never()).save(any());
    }

    @Test
    @DisplayName("Closing drive transitions PUBLISHED -> CLOSED and notifies company; invalid close/submit fail")
    void testCloseDriveAndInvalidTransitions() {
        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(publishedDrive));
        when(driveRepository.save(any(PlacementDrive.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));

        DriveResponse closed = driveService.closeDrive(companyId, driveId);
        assertEquals(DriveStatus.CLOSED, closed.getStatus());
        verify(notificationService).notifyDriveClosed(driveId, "Associate Software Engineer", "Tata Consultancy Services", mockCompany.getUserId());

        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(draftDrive));
        assertThrows(BadRequestException.class, () -> driveService.closeDrive(companyId, driveId));

        when(driveRepository.findByIdAndCompanyId(driveId, companyId)).thenReturn(Optional.of(publishedDrive));
        assertThrows(BadRequestException.class, () -> driveService.submitDriveForApproval(companyId, driveId));
    }
}
