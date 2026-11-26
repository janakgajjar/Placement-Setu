package com.placementsetu.officer.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.officer.dto.ProvisionCompanyRequest;
import com.placementsetu.officer.dto.UpdateCompanyByOfficerRequest;
import com.placementsetu.officer.service.OfficerCompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for Placement Officer → Company APIs (Section 10 of the API spec).
 *
 * Base path: /api/v1/placement-officers/me/companies
 *
 * POST   /api/v1/placement-officers/me/companies              — Provision a company account.
 * GET    /api/v1/placement-officers/me/companies              — View companies (paginated + filtered).
 * GET    /api/v1/placement-officers/me/companies/{companyId}  — View a specific company.
 * PUT    /api/v1/placement-officers/me/companies/{companyId}  — Update company information.
 */
@Tag(name = "Officer — Company Management", description = "Placement Officer provisioning and management of company accounts")
@RestController
@RequestMapping("/api/v1/placement-officers/me/companies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public class OfficerCompanyController {

    private final OfficerCompanyService officerCompanyService;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/placement-officers/me/companies
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Provision a new company account (creates user + company profile)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CompanyProfileResponse> provisionCompany(
            @Valid @RequestBody ProvisionCompanyRequest request) {
        CompanyProfileResponse response = officerCompanyService.provisionCompany(request);
        return ApiResponse.success("Company account provisioned successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/placement-officers/me/companies
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "List all companies with pagination and optional account-status filter")
    @GetMapping
    public ApiResponse<Page<CompanyProfileResponse>> getCompanies(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "companyName") Pageable pageable) {
        Page<CompanyProfileResponse> page = officerCompanyService.getCompanies(status, pageable);
        return ApiResponse.success("Companies fetched successfully", page);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/placement-officers/me/companies/{companyId}
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "View a specific company's profile")
    @GetMapping("/{companyId}")
    public ApiResponse<CompanyProfileResponse> getCompany(
            @PathVariable UUID companyId) {
        CompanyProfileResponse response = officerCompanyService.getCompany(companyId);
        return ApiResponse.success("Company fetched successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/v1/placement-officers/me/companies/{companyId}
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Update a company's information")
    @PutMapping("/{companyId}")
    public ApiResponse<CompanyProfileResponse> updateCompany(
            @PathVariable UUID companyId,
            @Valid @RequestBody UpdateCompanyByOfficerRequest request) {
        CompanyProfileResponse response = officerCompanyService.updateCompany(companyId, request);
        return ApiResponse.success("Company updated successfully", response);
    }

    @Operation(summary = "Activate a company account")
    @PostMapping("/{companyId}/activate")
    public ApiResponse<CompanyProfileResponse> activateCompany(@PathVariable UUID companyId) {
        CompanyProfileResponse response = officerCompanyService.activateCompany(companyId);
        return ApiResponse.success("Company account activated successfully", response);
    }

    @Operation(summary = "Deactivate/suspend a company account")
    @PostMapping("/{companyId}/deactivate")
    public ApiResponse<CompanyProfileResponse> deactivateCompany(@PathVariable UUID companyId) {
        CompanyProfileResponse response = officerCompanyService.deactivateCompany(companyId);
        return ApiResponse.success("Company account deactivated successfully", response);
    }

    @Operation(summary = "Reset password for a company account")
    @PostMapping("/{companyId}/reset-password")
    public ApiResponse<CompanyProfileResponse> resetCompanyPassword(
            @PathVariable UUID companyId,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        String newPassword = null;
        if (body != null && body.get("newPassword") != null) {
            newPassword = String.valueOf(body.get("newPassword"));
        }
        CompanyProfileResponse response = officerCompanyService.resetCompanyPassword(companyId, newPassword);
        return ApiResponse.success("Password reset successfully", response);
    }

    @Operation(summary = "Delete a company account")
    @DeleteMapping("/{companyId}")
    public ApiResponse<Void> deleteCompany(@PathVariable UUID companyId) {
        officerCompanyService.deleteCompany(companyId);
        return ApiResponse.success("Company account deleted successfully", null);
    }
}
