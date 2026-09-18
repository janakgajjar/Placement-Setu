package com.placementsetu.company.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.dto.UpdateCompanyProfileRequest;
import com.placementsetu.company.service.CompanyProfileService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.placementsetu.security.CustomUserDetails;

@Tag(name = "Company", description = "Company's own profile")
@RestController
@RequestMapping("/api/v1/companies/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COMPANY')")
public class CompanyController {

    private final CompanyProfileService companyProfileService;

    @GetMapping
    public ApiResponse<CompanyProfileResponse> myProfile(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Company profile fetched successfully", companyProfileService.getMyProfile(principal.getId()));
    }

    @PutMapping
    public ApiResponse<CompanyProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateCompanyProfileRequest request) {
        return ApiResponse.success("Company profile updated successfully",
                companyProfileService.updateProfile(principal.getId(), request));
    }
}
