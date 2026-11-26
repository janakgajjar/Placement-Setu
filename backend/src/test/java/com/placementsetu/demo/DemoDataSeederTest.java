package com.placementsetu.demo;

import com.placementsetu.application.entity.Application;
import com.placementsetu.application.entity.ApplicationStatusHistory;
import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.application.repository.ApplicationStatusHistoryRepository;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.placement.entity.DriveSkill;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.entity.Certification;
import com.placementsetu.student.entity.Project;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.*;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemoDataSeederTest {

    @Mock private UserRepository userRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private StudentSkillRepository studentSkillRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private CertificationRepository certificationRepository;
    @Mock private PlacementDriveRepository placementDriveRepository;
    @Mock private DriveSkillRepository driveSkillRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationStatusHistoryRepository statusHistoryRepository;
    @Mock private ResumeRepository resumeRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DemoDataSeeder seeder;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(seeder, "demoPassword", "Demo@12345");
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hashed-demo-password");

        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });

        lenient().when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company c = invocation.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });

        lenient().when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(invocation -> {
            StudentProfile s = invocation.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        lenient().when(placementDriveRepository.save(any(PlacementDrive.class))).thenAnswer(invocation -> {
            PlacementDrive d = invocation.getArgument(0);
            if (d.getId() == null) d.setId(UUID.randomUUID());
            return d;
        });

        lenient().when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application a = invocation.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });

        lenient().when(skillRepository.findByNameIgnoreCase(anyString())).thenAnswer(invocation -> {
            String name = invocation.getArgument(0);
            return Optional.of(Skill.builder().id(UUID.randomUUID()).name(name).build());
        });
    }

    @Test
    @DisplayName("Seeder populates 1 officer, 2 companies, 5 students with approval statuses, 4 drives (2 PUBLISHED, 1 CLOSED, 1 DRAFT), and applications")
    void testSeederPopulatesExpectedCounts() {
        when(userRepository.findByEmailIgnoreCase("officer@vidyapith.edu")).thenReturn(Optional.empty());

        seeder.run();

        // 1. Verify Users created: 1 Officer + 2 Companies + 5 Students = 8 Users
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(8)).save(userCaptor.capture());
        assertEquals(8, userCaptor.getAllValues().size());

        assertTrue(userCaptor.getAllValues().stream().anyMatch(u -> "officer@vidyapith.edu".equals(u.getEmail())));
        assertTrue(userCaptor.getAllValues().stream().anyMatch(u -> "tcs@recruiter.com".equals(u.getEmail())));
        assertTrue(userCaptor.getAllValues().stream().anyMatch(u -> "infosys@recruiter.com".equals(u.getEmail())));
        assertTrue(userCaptor.getAllValues().stream().anyMatch(u -> "student1@vidyapith.edu".equals(u.getEmail())));
        assertTrue(userCaptor.getAllValues().stream().anyMatch(u -> "student5@vidyapith.edu".equals(u.getEmail())));

        // 2. Verify Companies created: exactly 2
        verify(companyRepository, times(2)).save(any(Company.class));

        // 3. Verify Students created: exactly 5 with V12 approval statuses
        ArgumentCaptor<StudentProfile> studentCaptor = ArgumentCaptor.forClass(StudentProfile.class);
        verify(studentProfileRepository, times(5)).save(studentCaptor.capture());
        assertEquals(3, studentCaptor.getAllValues().stream().filter(s -> s.getApprovalStatus() == ProfileApprovalStatus.APPROVED).count());
        assertEquals(1, studentCaptor.getAllValues().stream().filter(s -> s.getApprovalStatus() == ProfileApprovalStatus.SUBMITTED).count());
        assertEquals(1, studentCaptor.getAllValues().stream().filter(s -> s.getApprovalStatus() == ProfileApprovalStatus.DRAFT).count());

        // 4. Verify exactly 4 Resumes created (Students 1 to 4; Student 5 left without resume for live upload demo)
        verify(resumeRepository, times(4)).save(any(Resume.class));

        // 5. Verify Placement Drives: exactly 6 drives covering all 5 statuses
        ArgumentCaptor<PlacementDrive> driveCaptor = ArgumentCaptor.forClass(PlacementDrive.class);
        verify(placementDriveRepository, times(6)).save(driveCaptor.capture());

        long publishedDrives = driveCaptor.getAllValues().stream()
                .filter(d -> d.getStatus() == DriveStatus.PUBLISHED).count();
        long closedDrives = driveCaptor.getAllValues().stream()
                .filter(d -> d.getStatus() == DriveStatus.CLOSED).count();
        long pendingDrives = driveCaptor.getAllValues().stream()
                .filter(d -> d.getStatus() == DriveStatus.PENDING_APPROVAL).count();
        long rejectedDrives = driveCaptor.getAllValues().stream()
                .filter(d -> d.getStatus() == DriveStatus.REJECTED).count();
        long draftDrives = driveCaptor.getAllValues().stream()
                .filter(d -> d.getStatus() == DriveStatus.DRAFT).count();

        assertEquals(2, publishedDrives, "Must create 2 PUBLISHED drives");
        assertEquals(1, closedDrives, "Must create 1 CLOSED drive");
        assertEquals(1, pendingDrives, "Must create 1 PENDING_APPROVAL drive");
        assertEquals(1, rejectedDrives, "Must create 1 REJECTED drive");
        assertEquals(1, draftDrives, "Must create 1 DRAFT drive");

        // 6. Verify Applications created: 6 applications across different statuses
        verify(applicationRepository, times(6)).save(any(Application.class));
        verify(statusHistoryRepository, times(6)).save(any(ApplicationStatusHistory.class));
    }

    @Test
    @DisplayName("Idempotence: Seeder safely skips duplicate execution when officer already exists")
    void testSeederIsIdempotent() {
        User existingOfficer = User.builder()
                .id(UUID.randomUUID())
                .email("officer@vidyapith.edu")
                .build();
        when(userRepository.findByEmailIgnoreCase("officer@vidyapith.edu")).thenReturn(Optional.of(existingOfficer));

        seeder.run();

        // Must not save any new entities on second execution
        verify(userRepository, never()).save(any(User.class));
        verify(companyRepository, never()).save(any(Company.class));
        verify(studentProfileRepository, never()).save(any(StudentProfile.class));
        verify(placementDriveRepository, never()).save(any(PlacementDrive.class));
        verify(applicationRepository, never()).save(any(Application.class));
    }
}
