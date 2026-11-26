package com.placementsetu.application;

import com.placementsetu.application.controller.ApplicationController;
import com.placementsetu.application.dto.ApplicationRequest;
import com.placementsetu.application.dto.ApplicationResponse;
import com.placementsetu.application.dto.ApplicationStatusUpdateRequest;
import com.placementsetu.application.entity.Application;
import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.application.repository.ApplicationStatusHistoryRepository;
import com.placementsetu.application.service.impl.ApplicationServiceImpl;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.ApplicationStatus;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationManagementTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository historyRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private PlacementDriveRepository driveRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private ProfileValidationService profileValidationService;
    @Mock private PlacementPolicyService policyService;

    @InjectMocks
    private ApplicationServiceImpl applicationService;

    private UUID companyUserId;
    private UUID otherCompanyUserId;
    private UUID officerUserId;
    private UUID adminUserId;
    private UUID companyId;
    private UUID otherCompanyId;
    private UUID driveId;
    private UUID dreamDriveId;
    private UUID otherNonDreamDriveId;
    private UUID studentUserId;
    private UUID studentProfileId;
    private UUID applicationId;

    private User companyUser;
    private User otherCompanyUser;
    private User officerUser;
    private User adminUser;
    private Company company;
    private Company otherCompany;
    private PlacementDrive nonDreamDrive;
    private PlacementDrive dreamDrive;
    private PlacementDrive otherNonDreamDrive;
    private StudentProfile studentProfile;

    @BeforeEach
    void setUp() {
        companyUserId = UUID.randomUUID();
        otherCompanyUserId = UUID.randomUUID();
        officerUserId = UUID.randomUUID();
        adminUserId = UUID.randomUUID();
        companyId = UUID.randomUUID();
        otherCompanyId = UUID.randomUUID();
        driveId = UUID.randomUUID();
        dreamDriveId = UUID.randomUUID();
        otherNonDreamDriveId = UUID.randomUUID();
        studentUserId = UUID.randomUUID();
        studentProfileId = UUID.randomUUID();
        applicationId = UUID.randomUUID();

        companyUser = User.builder().id(companyUserId).email("hr@acme.com").passwordHash("x").role(UserRole.COMPANY).accountStatus(AccountStatus.ACTIVE).build();
        otherCompanyUser = User.builder().id(otherCompanyUserId).email("hr@other.com").passwordHash("x").role(UserRole.COMPANY).accountStatus(AccountStatus.ACTIVE).build();
        officerUser = User.builder().id(officerUserId).email("officer@uni.edu").passwordHash("x").role(UserRole.PLACEMENT_OFFICER).accountStatus(AccountStatus.ACTIVE).build();
        adminUser = User.builder().id(adminUserId).email("admin@uni.edu").passwordHash("x").role(UserRole.ADMIN).accountStatus(AccountStatus.ACTIVE).build();

        company = Company.builder().id(companyId).userId(companyUserId).companyName("Acme Corp").build();
        otherCompany = Company.builder().id(otherCompanyId).userId(otherCompanyUserId).companyName("Other Corp").build();

        nonDreamDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Software Engineer")
                .ctc(new BigDecimal("600000"))
                .isDreamOffer(false)
                .build();

        dreamDrive = PlacementDrive.builder()
                .id(dreamDriveId)
                .companyId(companyId)
                .jobTitle("Principal Architect")
                .ctc(new BigDecimal("1200000"))
                .isDreamOffer(true)
                .build();

        otherNonDreamDrive = PlacementDrive.builder()
                .id(otherNonDreamDriveId)
                .companyId(otherCompanyId)
                .jobTitle("Backend Developer")
                .ctc(new BigDecimal("500000"))
                .isDreamOffer(false)
                .build();

        studentProfile = StudentProfile.builder()
                .id(studentProfileId)
                .userId(studentUserId)
                .fullName("Aarav Shah")
                .placementLocked(false)
                .build();
    }

    @Test
    @DisplayName("Role permissions: ApplicationController restricts updateStatus to COMPANY, allows Officer/Admin view, and preserves Student endpoints")
    void testControllerRolePermissions() throws NoSuchMethodException {
        Method updateStatus = ApplicationController.class.getMethod(
                "updateStatus", CustomUserDetails.class, UUID.class, ApplicationStatusUpdateRequest.class);
        PreAuthorize updateAuth = updateStatus.getAnnotation(PreAuthorize.class);
        assertNotNull(updateAuth);
        assertEquals("hasRole('COMPANY')", updateAuth.value());

        Method getDriveApplicants = ApplicationController.class.getMethod(
                "getDriveApplicants", CustomUserDetails.class, UUID.class);
        PreAuthorize viewAuth = getDriveApplicants.getAnnotation(PreAuthorize.class);
        assertNotNull(viewAuth);
        assertEquals("hasAnyRole('COMPANY', 'PLACEMENT_OFFICER', 'ADMIN')", viewAuth.value());

        Method apply = ApplicationController.class.getMethod("apply", CustomUserDetails.class, ApplicationRequest.class);
        assertEquals("hasRole('STUDENT')", apply.getAnnotation(PreAuthorize.class).value());

        Method withdraw = ApplicationController.class.getMethod("withdraw", CustomUserDetails.class, UUID.class);
        assertEquals("hasRole('STUDENT')", withdraw.getAnnotation(PreAuthorize.class).value());
    }

    @Test
    @DisplayName("Role permissions: PLACEMENT_OFFICER and ADMIN cannot update application status at service layer")
    void testOfficerAndAdminCannotUpdateStatus() {
        Application app = Application.builder()
                .id(applicationId)
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.APPLIED)
                .build();

        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(app));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));

        when(userRepository.findById(officerUserId)).thenReturn(Optional.of(officerUser));
        assertThrows(AccessDeniedException.class, () -> applicationService.updateStatus(
                applicationId, officerUserId, new ApplicationStatusUpdateRequest(ApplicationStatus.UNDER_REVIEW, null)));

        when(userRepository.findById(adminUserId)).thenReturn(Optional.of(adminUser));
        assertThrows(AccessDeniedException.class, () -> applicationService.updateStatus(
                applicationId, adminUserId, new ApplicationStatusUpdateRequest(ApplicationStatus.UNDER_REVIEW, null)));

        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Company drive ownership: Company cannot view or update applications belonging to another company's drive")
    void testCompanyDriveOwnershipEnforced() {
        Application app = Application.builder()
                .id(applicationId)
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.APPLIED)
                .build();

        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(app));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));
        when(userRepository.findById(otherCompanyUserId)).thenReturn(Optional.of(otherCompanyUser));
        when(companyRepository.findByUserId(otherCompanyUserId)).thenReturn(Optional.of(otherCompany));

        assertThrows(AccessDeniedException.class, () -> applicationService.updateStatus(
                applicationId, otherCompanyUserId, new ApplicationStatusUpdateRequest(ApplicationStatus.UNDER_REVIEW, null)));

        assertThrows(AccessDeniedException.class, () -> applicationService.getDriveApplications(driveId, otherCompanyUserId));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Company drive ownership: Officer and Admin can view drive applicants")
    void testOfficerAndAdminCanViewDriveApplicants() {
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));
        when(applicationRepository.findByPlacementDriveIdOrderByAppliedAtDesc(driveId)).thenReturn(List.of());

        when(userRepository.findById(officerUserId)).thenReturn(Optional.of(officerUser));
        assertDoesNotThrow(() -> applicationService.getDriveApplications(driveId, officerUserId));

        when(userRepository.findById(adminUserId)).thenReturn(Optional.of(adminUser));
        assertDoesNotThrow(() -> applicationService.getDriveApplications(driveId, adminUserId));
    }

    @Test
    @DisplayName("Status transitions: verifies every allowed and disallowed transition matrix")
    void testAllAllowedAndDisallowedStatusTransitions() {
        Map<ApplicationStatus, Set<ApplicationStatus>> expectedAllowed = Map.of(
                ApplicationStatus.APPLIED, EnumSet.of(ApplicationStatus.UNDER_REVIEW),
                ApplicationStatus.UNDER_REVIEW, EnumSet.of(ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED),
                ApplicationStatus.SHORTLISTED, EnumSet.of(ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.SELECTED, ApplicationStatus.REJECTED),
                ApplicationStatus.INTERVIEW_SCHEDULED, EnumSet.of(ApplicationStatus.SELECTED, ApplicationStatus.REJECTED),
                ApplicationStatus.SELECTED, EnumSet.noneOf(ApplicationStatus.class),
                ApplicationStatus.REJECTED, EnumSet.noneOf(ApplicationStatus.class),
                ApplicationStatus.WITHDRAWN, EnumSet.noneOf(ApplicationStatus.class)
        );

        lenient().when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));
        lenient().when(userRepository.findById(companyUserId)).thenReturn(Optional.of(companyUser));
        lenient().when(companyRepository.findByUserId(companyUserId)).thenReturn(Optional.of(company));
        lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
        lenient().when(studentProfileRepository.findById(studentProfileId)).thenReturn(Optional.of(studentProfile));
        lenient().when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        lenient().when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        for (ApplicationStatus from : ApplicationStatus.values()) {
            for (ApplicationStatus to : ApplicationStatus.values()) {
                studentProfile.setPlacementLocked(false);
                Application app = Application.builder()
                        .id(applicationId)
                        .studentProfileId(studentProfileId)
                        .placementDriveId(driveId)
                        .status(from)
                        .build();

                when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(app));
                lenient().when(applicationRepository.findByStudentProfileId(studentProfileId)).thenReturn(List.of(app));

                boolean shouldSucceed = expectedAllowed.get(from).contains(to);
                if (shouldSucceed) {
                    ApplicationResponse response = applicationService.updateStatus(
                            applicationId, companyUserId, new ApplicationStatusUpdateRequest(to, "ok"));
                    assertEquals(to, response.getStatus(), "Expected transition " + from + " -> " + to + " to succeed");
                } else {
                    assertThrows(BadRequestException.class,
                            () -> applicationService.updateStatus(applicationId, companyUserId, new ApplicationStatusUpdateRequest(to, "bad")),
                            "Expected transition " + from + " -> " + to + " to fail");
                }
            }
        }
    }

    @Test
    @DisplayName("Placement lock: selecting student for non-Dream Offer locks profile; Dream Offer does not")
    void testSelectionLockingForNonDreamVsDreamOffer() {
        Application nonDreamApp = Application.builder()
                .id(applicationId)
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.SHORTLISTED)
                .build();

        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(nonDreamApp));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));
        when(userRepository.findById(companyUserId)).thenReturn(Optional.of(companyUser));
        when(companyRepository.findByUserId(companyUserId)).thenReturn(Optional.of(company));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(studentProfileRepository.findById(studentProfileId)).thenReturn(Optional.of(studentProfile));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.findByStudentProfileId(studentProfileId)).thenReturn(List.of(nonDreamApp));

        applicationService.updateStatus(applicationId, companyUserId,
                new ApplicationStatusUpdateRequest(ApplicationStatus.SELECTED, "Offer extended"));

        assertTrue(studentProfile.isPlacementLocked());
        verify(studentProfileRepository).save(argThat(StudentProfile::isPlacementLocked));

        // Now test Dream Offer on an unlocked student
        studentProfile.setPlacementLocked(false);
        UUID dreamAppId = UUID.randomUUID();
        Application dreamApp = Application.builder()
                .id(dreamAppId)
                .studentProfileId(studentProfileId)
                .placementDriveId(dreamDriveId)
                .status(ApplicationStatus.INTERVIEW_SCHEDULED)
                .build();

        when(applicationRepository.findById(dreamAppId)).thenReturn(Optional.of(dreamApp));
        when(driveRepository.findById(dreamDriveId)).thenReturn(Optional.of(dreamDrive));
        when(applicationRepository.findByStudentProfileId(studentProfileId)).thenReturn(List.of(dreamApp));

        applicationService.updateStatus(dreamAppId, companyUserId,
                new ApplicationStatusUpdateRequest(ApplicationStatus.SELECTED, "Dream offer"));

        assertFalse(studentProfile.isPlacementLocked());
    }

    @Test
    @DisplayName("Placement lock: reversing selection recalculates lock across remaining selected applications and Dream Offers")
    void testSelectionReversalRecalculatesPlacementLock() {
        studentProfile.setPlacementLocked(true);
        when(studentProfileRepository.findById(studentProfileId)).thenReturn(Optional.of(studentProfile));

        Application reversedNonDreamApp = Application.builder()
                .id(UUID.randomUUID())
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.REJECTED)
                .build();

        Application activeDreamApp = Application.builder()
                .id(UUID.randomUUID())
                .studentProfileId(studentProfileId)
                .placementDriveId(dreamDriveId)
                .status(ApplicationStatus.SELECTED)
                .build();

        Application activeOtherNonDreamApp = Application.builder()
                .id(UUID.randomUUID())
                .studentProfileId(studentProfileId)
                .placementDriveId(otherNonDreamDriveId)
                .status(ApplicationStatus.SELECTED)
                .build();

        // Case 1: Reversed non-Dream selection, but another active non-Dream selection exists -> stay locked
        when(applicationRepository.findByStudentProfileId(studentProfileId))
                .thenReturn(List.of(reversedNonDreamApp, activeDreamApp, activeOtherNonDreamApp));
        lenient().when(driveRepository.findById(dreamDriveId)).thenReturn(Optional.of(dreamDrive));
        when(driveRepository.findById(otherNonDreamDriveId)).thenReturn(Optional.of(otherNonDreamDrive));

        applicationService.recalculatePlacementLock(studentProfileId);
        assertTrue(studentProfile.isPlacementLocked(), "Must remain locked when another active non-Dream selection exists");

        // Case 2: Only Dream Offer selection remains -> unlock student
        when(applicationRepository.findByStudentProfileId(studentProfileId))
                .thenReturn(List.of(reversedNonDreamApp, activeDreamApp));

        applicationService.recalculatePlacementLock(studentProfileId);
        assertFalse(studentProfile.isPlacementLocked(), "Must unlock when only Dream Offer selection remains");
        verify(studentProfileRepository).save(argThat(p -> !p.isPlacementLocked()));
    }

    @Test
    @DisplayName("Company cannot view or update applicants before registration closes")
    void testCompanyCannotAccessApplicantsBeforeRegistrationCloses() {
        PlacementDrive openDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .status(DriveStatus.PUBLISHED)
                .registrationEnd(java.time.LocalDateTime.now().plusDays(3))
                .build();

        when(driveRepository.findById(driveId)).thenReturn(Optional.of(openDrive));
        when(userRepository.findById(companyUserId)).thenReturn(Optional.of(companyUser));
        when(companyRepository.findByUserId(companyUserId)).thenReturn(Optional.of(company));

        assertThrows(BadRequestException.class, () -> applicationService.getDriveApplications(driveId, companyUserId));

        Application app = Application.builder()
                .id(applicationId)
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.APPLIED)
                .build();
        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class, () -> applicationService.updateStatus(
                applicationId, companyUserId, new ApplicationStatusUpdateRequest(ApplicationStatus.UNDER_REVIEW, null)));
    }

    @Test
    @DisplayName("Non-Dream selection closes other active applications in the same transaction")
    void testNonDreamSelectionClosesOtherActiveApplications() {
        Application selectedApp = Application.builder()
                .id(applicationId)
                .studentProfileId(studentProfileId)
                .placementDriveId(driveId)
                .status(ApplicationStatus.SHORTLISTED)
                .build();

        Application otherActiveApp = Application.builder()
                .id(UUID.randomUUID())
                .studentProfileId(studentProfileId)
                .placementDriveId(otherNonDreamDriveId)
                .status(ApplicationStatus.UNDER_REVIEW)
                .build();

        when(applicationRepository.findById(applicationId)).thenReturn(Optional.of(selectedApp));
        when(driveRepository.findById(driveId)).thenReturn(Optional.of(nonDreamDrive));
        when(userRepository.findById(companyUserId)).thenReturn(Optional.of(companyUser));
        when(companyRepository.findByUserId(companyUserId)).thenReturn(Optional.of(company));
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(studentProfileRepository.findById(studentProfileId)).thenReturn(Optional.of(studentProfile));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.findByStudentProfileId(studentProfileId))
                .thenReturn(List.of(selectedApp, otherActiveApp));

        applicationService.updateStatus(applicationId, companyUserId,
                new ApplicationStatusUpdateRequest(ApplicationStatus.SELECTED, "Hired"));

        assertEquals(ApplicationStatus.WITHDRAWN, otherActiveApp.getStatus());
        assertNotNull(otherActiveApp.getWithdrawnAt());
        verify(applicationRepository).save(otherActiveApp);
    }
}
