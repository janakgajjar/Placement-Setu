package com.placementsetu.application.controller;

import com.placementsetu.application.dto.*;
import com.placementsetu.application.service.ApplicationService;
import com.placementsetu.common.ApiResponse;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Applications", description = "Application tracking pipeline and management")
@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @Operation(summary = "Apply for a placement drive (Student only)")
    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ApplicationResponse>> apply(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ApplicationRequest request) {
        ApplicationResponse response = applicationService.apply(principal.getId(), request.getDriveId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application submitted successfully", response));
    }

    @Operation(summary = "Get all applications submitted by logged-in student")
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<List<ApplicationResponse>> getMyApplications(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Applications retrieved successfully",
                applicationService.getMyApplications(principal.getId()));
    }

    @Operation(summary = "Get application pipeline summary counts for logged-in student")
    @GetMapping("/me/summary")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<ApplicationSummaryResponse> getMySummary(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Summary retrieved successfully",
                applicationService.getMySummary(principal.getId()));
    }

    @Operation(summary = "Withdraw an application (Student only)")
    @PostMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<ApplicationResponse> withdraw(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID id) {
        return ApiResponse.success("Application withdrawn successfully",
                applicationService.withdraw(principal.getId(), id));
    }

    @Operation(summary = "Update application status (Company only)")
    @PostMapping("/{id}/status")
    @PreAuthorize("hasRole('COMPANY')")
    public ApiResponse<ApplicationResponse> updateStatus(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationStatusUpdateRequest request) {
        return ApiResponse.success("Application status updated successfully",
                applicationService.updateStatus(id, principal.getId(), request));
    }

    @Operation(summary = "Get all applicants for a drive (Company or Placement Officer)")
    @GetMapping("/drive/{driveId}")
    @PreAuthorize("hasAnyRole('COMPANY', 'PLACEMENT_OFFICER', 'ADMIN')")
    public ApiResponse<List<ApplicationResponse>> getDriveApplicants(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId) {
        return ApiResponse.success("Applicants retrieved successfully",
                applicationService.getDriveApplications(driveId, principal.getId()));
    }
}
