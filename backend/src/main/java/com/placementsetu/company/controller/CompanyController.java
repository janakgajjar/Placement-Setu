package com.placementsetu.company.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.dto.UpdateCompanyProfileRequest;
import com.placementsetu.company.service.CompanyProfileService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for Company Profile APIs (Section 11 of the API spec).
 *
 * GET  /api/v1/companies/me/profile — View company profile.
 * PUT  /api/v1/companies/me/profile — Update company profile.
 */
@Tag(name = "Company Profile", description = "Company's own profile management")
@RestController
@RequestMapping("/api/v1/companies/me/profile")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COMPANY')")
public class CompanyController {

    private final CompanyProfileService companyProfileService;

    @Operation(summary = "View the authenticated company's profile")
    @GetMapping
    public ApiResponse<CompanyProfileResponse> getProfile(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success(
                "Company profile fetched successfully",
                companyProfileService.getMyProfile(principal.getId()));
    }

    @Operation(summary = "Update the authenticated company's profile")
    @PutMapping
    public ApiResponse<CompanyProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateCompanyProfileRequest request) {
        return ApiResponse.success(
                "Company profile updated successfully",
                companyProfileService.updateProfile(principal.getId(), request));
    }
}
