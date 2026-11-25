package com.placementsetu.officer.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.officer.dto.ProfileChangesRequest;
import com.placementsetu.officer.service.OfficerStudentService;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.student.dto.StudentProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Officer — Student Profiles", description = "Placement Officer review and approval of student profiles")
@RestController
@RequestMapping("/api/v1/placement-officers/students")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public class OfficerStudentController {

    private final OfficerStudentService officerStudentService;

    @Operation(summary = "List student profiles filtered by approval status")
    @GetMapping
    public ApiResponse<Page<StudentProfileResponse>> getStudentProfiles(
            @RequestParam(required = false, defaultValue = "SUBMITTED") ProfileApprovalStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success("Student profiles fetched successfully",
                officerStudentService.getStudentProfiles(status, pageable));
    }

    @Operation(summary = "Approve a submitted student profile")
    @PostMapping("/{profileId}/approve")
    public ApiResponse<StudentProfileResponse> approveStudentProfile(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Student profile approved successfully",
                officerStudentService.approveStudentProfile(principal.getId(), profileId));
    }

    @Operation(summary = "Request changes on a submitted student profile")
    @PostMapping("/{profileId}/request-changes")
    public ApiResponse<StudentProfileResponse> requestProfileChanges(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ProfileChangesRequest request) {
        return ApiResponse.success("Changes requested on student profile",
                officerStudentService.requestProfileChanges(principal.getId(), profileId, request.getRemarks()));
    }
}
