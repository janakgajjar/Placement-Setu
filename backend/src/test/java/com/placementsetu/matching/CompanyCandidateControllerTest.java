package com.placementsetu.matching;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.matching.controller.CompanyCandidateController;
import com.placementsetu.matching.dto.CandidateProfileDto;
import com.placementsetu.matching.service.CompanyCandidateService;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.user.entity.User;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyCandidateControllerTest {

    @Mock
    private CompanyCandidateService candidateService;

    @InjectMocks
    private CompanyCandidateController candidateController;

    private CustomUserDetails companyUser;
    private UUID companyUserId;

    @BeforeEach
    void setUp() {
        companyUserId = UUID.randomUUID();
        User user = User.builder()
                .id(companyUserId)
                .email("recruiter@company.com")
                .passwordHash("hashedPass")
                .role(UserRole.COMPANY)
                .accountStatus(com.placementsetu.common.enums.AccountStatus.ACTIVE)
                .build();
        companyUser = new CustomUserDetails(user);
    }

    @Test
    @DisplayName("CompanyCandidateController has @PreAuthorize(\"hasRole('COMPANY')\") class-level guard")
    void testClassLevelSecurityAnnotation() {
        PreAuthorize preAuth = CompanyCandidateController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth, "Controller must be secured with @PreAuthorize");
        assertEquals("hasRole('COMPANY')", preAuth.value(), "Only COMPANY role can access talent search");
    }

    @Test
    @DisplayName("searchCandidates calls service with principal ID and query filters")
    void testSearchCandidatesSuccess() {
        CandidateProfileDto candidate = CandidateProfileDto.builder()
                .id(UUID.randomUUID())
                .fullName("Pooja Patel")
                .course("MCA")
                .cgpa(new BigDecimal("8.75"))
                .skills(List.of("Java", "Spring Boot", "React"))
                .applied(false)
                .build();

        Page<CandidateProfileDto> mockPage = new PageImpl<>(List.of(candidate));
        when(candidateService.searchCandidates(
                eq(companyUserId), eq("Java,React"), eq("MCA"), any(BigDecimal.class), eq(0), any()
        )).thenReturn(mockPage);

        ResponseEntity<ApiResponse<Page<CandidateProfileDto>>> response = candidateController.searchCandidates(
                companyUser, "Java,React", "MCA", new BigDecimal("7.0"), 0, PageRequest.of(0, 10)
        );

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
        assertEquals(1, response.getBody().getData().getContent().size());
        assertEquals("Pooja Patel", response.getBody().getData().getContent().get(0).getFullName());
        assertNull(response.getBody().getData().getContent().get(0).getEmail(), "Contact email must be masked for non-applicant");

        verify(candidateService, times(1)).searchCandidates(
                eq(companyUserId), eq("Java,React"), eq("MCA"), any(BigDecimal.class), eq(0), any()
        );
    }

    @Test
    @DisplayName("getDriveMatchedCandidates calls service with principal ID and drive ID")
    void testGetDriveMatchedCandidatesSuccess() {
        UUID driveId = UUID.randomUUID();
        CandidateProfileDto rankedCandidate = CandidateProfileDto.builder()
                .id(UUID.randomUUID())
                .fullName("Amit Shah")
                .course("MCA")
                .matchScore(100)
                .matchedSkills(List.of("Python", "SQL"))
                .missingSkills(Collections.emptyList())
                .eligible(true)
                .applied(true)
                .email("amit.shah@vidyapith.edu")
                .phone("9876543210")
                .build();

        Page<CandidateProfileDto> mockPage = new PageImpl<>(List.of(rankedCandidate));
        when(candidateService.getDriveMatchedCandidates(eq(companyUserId), eq(driveId), any()))
                .thenReturn(mockPage);

        ResponseEntity<ApiResponse<Page<CandidateProfileDto>>> response = candidateController.getDriveMatchedCandidates(
                companyUser, driveId, PageRequest.of(0, 10)
        );

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
        CandidateProfileDto result = response.getBody().getData().getContent().get(0);
        assertEquals(100, result.getMatchScore());
        assertTrue(Boolean.TRUE.equals(result.getEligible()));
        assertTrue(result.isApplied());
        assertEquals("amit.shah@vidyapith.edu", result.getEmail(), "Contact email exposed for applicant");

        verify(candidateService, times(1)).getDriveMatchedCandidates(eq(companyUserId), eq(driveId), any());
    }
}
