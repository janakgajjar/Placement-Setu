package com.placementsetu.placement.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.placement.dto.CreateDriveRequest;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.dto.UpdateDriveRequest;
import com.placementsetu.placement.service.PlacementDriveService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for Company Placement Drive APIs (Section 12 of the API spec).
 *
 * Base path: /api/v1/companies/me/drives
 *
 * Drive lifecycle (enforced by the service layer):
 *   DRAFT ──[submit]──▶ PENDING_APPROVAL ──[PO approve]──▶ PUBLISHED ──[close]──▶ CLOSED
 *                              │
 *                         [PO reject]
 *                              ▼
 *                           REJECTED ──[edit & submit]──▶ PENDING_APPROVAL
 */
@Tag(name = "Company Drives", description = "Company-owned placement drive management")
@RestController
@RequestMapping("/api/v1/companies/me/drives")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COMPANY')")
public class PlacementDriveController {

    private final PlacementDriveService placementDriveService;
    private final CompanyRepository companyRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/companies/me/drives
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Create a new placement drive in DRAFT state")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DriveResponse> createDrive(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CreateDriveRequest request) {

        UUID companyId = resolveCompanyId(principal);
        DriveResponse response = placementDriveService.createDrive(companyId, request);
        return ApiResponse.success("Placement drive created successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/companies/me/drives
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "List company drives with pagination and optional status filter")
    @GetMapping
    public ApiResponse<Page<DriveResponse>> getCompanyDrives(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) DriveStatus status,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        UUID companyId = resolveCompanyId(principal);
        Page<DriveResponse> page = placementDriveService.getCompanyDrives(companyId, status, pageable);
        return ApiResponse.success("Drives fetched successfully", page);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/companies/me/drives/{driveId}
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "View a single placement drive owned by the company")
    @GetMapping("/{driveId}")
    public ApiResponse<DriveResponse> getDrive(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId) {

        UUID companyId = resolveCompanyId(principal);
        DriveResponse response = placementDriveService.getDrive(companyId, driveId);
        return ApiResponse.success("Drive fetched successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/v1/companies/me/drives/{driveId}
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Update a drive (only allowed while in DRAFT or REJECTED state)")
    @PutMapping("/{driveId}")
    public ApiResponse<DriveResponse> updateDrive(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId,
            @Valid @RequestBody UpdateDriveRequest request) {

        UUID companyId = resolveCompanyId(principal);
        DriveResponse response = placementDriveService.updateDrive(companyId, driveId, request);
        return ApiResponse.success("Drive updated successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/companies/me/drives/{driveId}/submit
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Submit a DRAFT or REJECTED drive for Placement Officer approval")
    @PostMapping("/{driveId}/submit")
    public ApiResponse<DriveResponse> submitDriveForApproval(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId) {

        UUID companyId = resolveCompanyId(principal);
        DriveResponse response = placementDriveService.submitDriveForApproval(companyId, driveId);
        return ApiResponse.success("Placement drive submitted for Placement Officer approval", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/companies/me/drives/{driveId}/close
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Close a PUBLISHED drive — transitions status to CLOSED")
    @PostMapping("/{driveId}/close")
    public ApiResponse<DriveResponse> closeDrive(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId) {

        UUID companyId = resolveCompanyId(principal);
        DriveResponse response = placementDriveService.closeDrive(companyId, driveId);
        return ApiResponse.success("Placement drive closed successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves the Company primary key (companies.id) from the authenticated user's ID (users.id).
     */
    private UUID resolveCompanyId(CustomUserDetails principal) {
        return companyRepository.findByUserId(principal.getId())
                .map(Company::getId)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found for user"));
    }
}
