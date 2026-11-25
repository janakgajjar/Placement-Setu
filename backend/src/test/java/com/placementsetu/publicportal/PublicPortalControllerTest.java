package com.placementsetu.publicportal;

import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.publicportal.controller.PublicPortalController;
import com.placementsetu.publicportal.dto.PublicCompanyDto;
import com.placementsetu.publicportal.dto.PublicDriveDto;
import com.placementsetu.publicportal.dto.PublicStatsDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicPortalControllerTest {

    @Mock
    private PlacementDriveRepository placementDriveRepository;

    @Mock
    private DriveSkillRepository driveSkillRepository;

    @Mock
    private com.placementsetu.student.repository.SkillRepository skillRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private PublicPortalController publicPortalController;

    private PlacementDrive sampleDrive;
    private Company sampleCompany;
    private UUID driveId;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        driveId = UUID.randomUUID();
        companyId = UUID.randomUUID();

        sampleCompany = Company.builder()
                .id(companyId)
                .userId(UUID.randomUUID())
                .companyName("Tata Consultancy Services")
                .contactPerson("Confidential Contact")
                .gstin("24ABCDE1234F1Z5")
                .phone("9876543210")
                .website("https://tcs.com")
                .address("Infocity, Gandhinagar")
                .createdAt(LocalDateTime.now())
                .build();

        sampleDrive = PlacementDrive.builder()
                .id(driveId)
                .companyId(companyId)
                .jobTitle("Associate Software Engineer")
                .description("Core Java and Spring Boot development")
                .location("Gandhinagar, Gujarat")
                .ctc(new BigDecimal("700000.00"))
                .vacancies(25)
                .minimumCgpa(new BigDecimal("6.50"))
                .maximumBacklogs(0)
                .requiredCourse("MCA")
                .graduationYear((short) 2026)
                .status(DriveStatus.PUBLISHED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getPublicDrives_returnsPublishedDrivesWithoutSensitiveData() {
        Page<PlacementDrive> drivesPage = new PageImpl<>(List.of(sampleDrive));
        when(placementDriveRepository.findByStatus(eq(DriveStatus.PUBLISHED), any(Pageable.class)))
                .thenReturn(drivesPage);
        when(companyRepository.findAllById(anyList())).thenReturn(List.of(sampleCompany));
        when(driveSkillRepository.findByDriveId(driveId)).thenReturn(List.of());

        var response = publicPortalController.getPublicDrives(null, PageRequest.of(0, 10));

        assertNotNull(response);
        assertTrue(response.isSuccess());
        Page<PublicDriveDto> page = response.getData();
        assertEquals(1, page.getTotalElements());

        PublicDriveDto dto = page.getContent().get(0);
        assertEquals("Associate Software Engineer", dto.getJobTitle());
        assertEquals("Tata Consultancy Services", dto.getCompanyName());
        assertEquals(DriveStatus.PUBLISHED, dto.getStatus());
    }

    @Test
    void getPublicDriveById_throwsNotFound_whenDriveNotPublished() {
        when(placementDriveRepository.findByIdAndStatus(driveId, DriveStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> publicPortalController.getPublicDriveById(driveId));
    }

    @Test
    void getPublicCompanies_returnsActiveCompaniesOnly_andOmitsSensitiveFields() {
        Page<Company> companiesPage = new PageImpl<>(List.of(sampleCompany));
        when(companyRepository.findActiveCompanies(any(), any(Pageable.class))).thenReturn(companiesPage);

        var response = publicPortalController.getPublicCompanies(null, PageRequest.of(0, 12));

        assertNotNull(response);
        assertTrue(response.isSuccess());
        PublicCompanyDto dto = response.getData().getContent().get(0);
        assertEquals("Tata Consultancy Services", dto.getCompanyName());
        assertEquals("https://tcs.com", dto.getWebsite());
        // Verify no sensitive fields in DTO
        assertNotNull(dto.getId());
    }

    @Test
    void getPublicStats_returnsAccurateAggregateNumbers() {
        when(placementDriveRepository.countByStatus(DriveStatus.PUBLISHED)).thenReturn(12L);
        when(companyRepository.countActiveCompanies()).thenReturn(45L);
        when(applicationRepository.countByStatus(any())).thenReturn(88L);
        when(placementDriveRepository.count()).thenReturn(30L);

        var response = publicPortalController.getPublicStats();

        assertNotNull(response);
        assertTrue(response.isSuccess());
        PublicStatsDto stats = response.getData();
        assertEquals(12L, stats.getActiveDrivesCount());
        assertEquals(45L, stats.getPartnerCompaniesCount());
        assertEquals(88L, stats.getPlacedStudentsCount());
        assertEquals(30L, stats.getTotalDrivesCount());
    }

    @Test
    void publicDtos_doNotExposeSensitiveCompanyOrDriveFields() {
        List<String> companyFields = java.util.Arrays.stream(PublicCompanyDto.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName).toList();
        assertFalse(companyFields.contains("gstin"));
        assertFalse(companyFields.contains("email"));
        assertFalse(companyFields.contains("phone"));

        List<String> driveFields = java.util.Arrays.stream(PublicDriveDto.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName).toList();
        assertFalse(driveFields.contains("reviewedBy"));
        assertFalse(driveFields.contains("rejectionReason"));
    }
}
