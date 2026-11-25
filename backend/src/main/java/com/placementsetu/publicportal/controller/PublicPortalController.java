package com.placementsetu.publicportal.controller;

import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.ApplicationStatus;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.publicportal.dto.PublicCompanyDto;
import com.placementsetu.publicportal.dto.PublicDriveDto;
import com.placementsetu.publicportal.dto.PublicStatsDto;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.repository.SkillRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Publicly accessible read-only endpoints (no JWT authentication required).
 * Exposes strictly non-sensitive placement drives, company directory, and placement metrics.
 */
@Tag(name = "Public Portal", description = "Public read-only drives, companies, and placement stats")
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicPortalController {

    private final PlacementDriveRepository placementDriveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final SkillRepository skillRepository;
    private final CompanyRepository companyRepository;
    private final ApplicationRepository applicationRepository;

    @Operation(summary = "Get paginated published placement drives for public visitor exploration")
    @GetMapping("/drives")
    public ApiResponse<Page<PublicDriveDto>> getPublicDrives(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<PlacementDrive> drivesPage = (search != null && !search.trim().isEmpty())
                ? placementDriveRepository.searchByStatus(DriveStatus.PUBLISHED, search.trim(), pageable)
                : placementDriveRepository.findByStatus(DriveStatus.PUBLISHED, pageable);

        // Batch lookup companies for response enrichment
        List<UUID> companyIds = drivesPage.getContent().stream()
                .map(PlacementDrive::getCompanyId)
                .distinct()
                .toList();

        Map<UUID, Company> companyMap = companyRepository.findAllById(companyIds).stream()
                .collect(Collectors.toMap(Company::getId, c -> c));

        Page<PublicDriveDto> dtoPage = drivesPage.map(drive -> {
            Company company = companyMap.get(drive.getCompanyId());
            List<String> skills = getSkillNames(drive.getId());

            return PublicDriveDto.builder()
                    .id(drive.getId())
                    .companyName(company != null ? company.getCompanyName() : "Verified Partner Recruiter")
                    .companyWebsite(company != null ? company.getWebsite() : null)
                    .jobTitle(drive.getJobTitle())
                    .description(drive.getDescription())
                    .location(drive.getLocation())
                    .ctc(drive.getCtc())
                    .stipend(drive.getStipend())
                    .vacancies(drive.getVacancies())
                    .minimumCgpa(drive.getMinimumCgpa())
                    .maximumBacklogs(drive.getMaximumBacklogs())
                    .requiredCourse(drive.getRequiredCourse())
                    .graduationYear(drive.getGraduationYear())
                    .driveType(drive.getDriveType())
                    .isDreamOffer(drive.getIsDreamOffer())
                    .skills(skills)
                    .status(drive.getStatus())
                    .registrationStart(drive.getRegistrationStart())
                    .registrationEnd(drive.getRegistrationEnd())
                    .createdAt(drive.getCreatedAt())
                    .build();
        });

        return ApiResponse.success("Public published drives fetched successfully", dtoPage);
    }

    @Operation(summary = "Get single published placement drive details")
    @GetMapping("/drives/{id}")
    public ApiResponse<PublicDriveDto> getPublicDriveById(@PathVariable UUID id) {
        PlacementDrive drive = placementDriveRepository.findByIdAndStatus(id, DriveStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive not found or has not been published"));

        Company company = companyRepository.findById(drive.getCompanyId()).orElse(null);
        List<String> skills = getSkillNames(drive.getId());

        PublicDriveDto dto = PublicDriveDto.builder()
                .id(drive.getId())
                .companyName(company != null ? company.getCompanyName() : "Verified Partner Recruiter")
                .companyWebsite(company != null ? company.getWebsite() : null)
                .jobTitle(drive.getJobTitle())
                .description(drive.getDescription())
                .location(drive.getLocation())
                .ctc(drive.getCtc())
                .stipend(drive.getStipend())
                .vacancies(drive.getVacancies())
                .minimumCgpa(drive.getMinimumCgpa())
                .maximumBacklogs(drive.getMaximumBacklogs())
                .requiredCourse(drive.getRequiredCourse())
                .graduationYear(drive.getGraduationYear())
                .driveType(drive.getDriveType())
                .isDreamOffer(drive.getIsDreamOffer())
                .skills(skills)
                .status(drive.getStatus())
                .registrationStart(drive.getRegistrationStart())
                .registrationEnd(drive.getRegistrationEnd())
                .createdAt(drive.getCreatedAt())
                .build();

        return ApiResponse.success("Public drive details fetched successfully", dto);
    }

    @Operation(summary = "Get active verified partner companies directory")
    @GetMapping("/companies")
    public ApiResponse<Page<PublicCompanyDto>> getPublicCompanies(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 12, sort = "companyName", direction = Sort.Direction.ASC) Pageable pageable) {

        Page<Company> companiesPage = companyRepository.findActiveCompanies(search != null ? search.trim() : null, pageable);

        Page<PublicCompanyDto> dtoPage = companiesPage.map(company -> PublicCompanyDto.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .website(company.getWebsite())
                .address(company.getAddress())
                .createdAt(company.getCreatedAt())
                .build());

        return ApiResponse.success("Active partner companies directory fetched successfully", dtoPage);
    }

    @Operation(summary = "Get public placement aggregate metrics and statistics")
    @GetMapping("/stats")
    public ApiResponse<PublicStatsDto> getPublicStats() {
        long activeDrives = placementDriveRepository.countByStatus(DriveStatus.PUBLISHED);
        long activeCompanies = companyRepository.countActiveCompanies();
        long placedStudents = applicationRepository.countByStatus(ApplicationStatus.SELECTED);
        long totalDrives = placementDriveRepository.count();

        PublicStatsDto stats = PublicStatsDto.builder()
                .activeDrivesCount(activeDrives)
                .partnerCompaniesCount(activeCompanies)
                .placedStudentsCount(placedStudents)
                .totalDrivesCount(totalDrives)
                .build();

        return ApiResponse.success("Public placement statistics fetched successfully", stats);
    }

    private List<String> getSkillNames(UUID driveId) {
        return driveSkillRepository.findByDriveId(driveId).stream()
                .map(ds -> skillRepository.findById(ds.getId().getSkillId()).map(Skill::getName).orElse(null))
                .filter(name -> name != null)
                .toList();
    }
}
