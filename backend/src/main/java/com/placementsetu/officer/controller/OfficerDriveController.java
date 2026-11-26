package com.placementsetu.officer.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.officer.dto.OfficerDriveDecisionRequest;
import com.placementsetu.officer.service.OfficerDriveService;
import com.placementsetu.placement.dto.DriveResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.placementsetu.security.CustomUserDetails;

import java.util.UUID;

/**
 * REST controller for Placement Officer review & approval of company placement drives.
 * Base path: /api/v1/placement-officers/drives
 */
@Tag(name = "Officer — Placement Drives", description = "Placement Officer approval queue and review of placement drives")
@RestController
@RequestMapping("/api/v1/placement-officers/drives")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public class OfficerDriveController {

    private final OfficerDriveService officerDriveService;

    @Operation(summary = "List placement drives with optional status filter")
    @GetMapping
    public ApiResponse<Page<DriveResponse>> getDrives(
            @RequestParam(required = false) DriveStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Placement drives fetched successfully",
                officerDriveService.getDrives(status, pageable));
    }

    @Operation(summary = "List placement drives awaiting Placement Officer approval")
    @GetMapping("/pending")
    public ApiResponse<Page<DriveResponse>> getPendingDrives(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Pending placement drives fetched successfully",
                officerDriveService.getPendingDrives(pageable));
    }

    @Operation(summary = "View full details of a submitted placement drive")
    @GetMapping("/{driveId}")
    public ApiResponse<DriveResponse> getDriveDetails(@PathVariable UUID driveId) {
        return ApiResponse.success("Placement drive details fetched successfully",
                officerDriveService.getDriveDetails(driveId));
    }

    @Operation(summary = "Approve a PENDING_APPROVAL drive with remarks (publishes to students)")
    @PostMapping("/{driveId}/approve")
    public ApiResponse<DriveResponse> approveDrive(
            @PathVariable UUID driveId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody OfficerDriveDecisionRequest request) {
        return ApiResponse.success("Placement drive approved and published successfully",
                officerDriveService.approveDrive(principal.getId(), driveId, request.getRemarks()));
    }

    @Operation(summary = "Reject a PENDING_APPROVAL drive with remarks")
    @PostMapping("/{driveId}/reject")
    public ApiResponse<DriveResponse> rejectDrive(
            @PathVariable UUID driveId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody OfficerDriveDecisionRequest request) {
        return ApiResponse.success("Placement drive rejected successfully",
                officerDriveService.rejectDrive(principal.getId(), driveId, request.getRemarks()));
    }
}
