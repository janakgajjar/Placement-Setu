package com.placementsetu.matching.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.matching.dto.CandidateProfileDto;
import com.placementsetu.matching.service.CompanyCandidateService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@Tag(name = "Recruiter Candidate Search & Matching", description = "Candidate search and drive match ranking APIs for recruiters")
@RestController
@RequestMapping("/api/v1/companies/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COMPANY')")
public class CompanyCandidateController {

    private final CompanyCandidateService candidateService;

    @Operation(summary = "Search completed candidate profiles with criteria and skill matching")
    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<Page<CandidateProfileDto>>> searchCandidates(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) String skills,
            @RequestParam(required = false) String course,
            @RequestParam(required = false) BigDecimal minCgpa,
            @RequestParam(required = false) Integer maxBacklogs,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<CandidateProfileDto> page = candidateService.searchCandidates(
                principal.getId(), skills, course, minCgpa, maxBacklogs, pageable);

        return ResponseEntity.ok(ApiResponse.success("Candidates retrieved successfully", page));
    }

    @Operation(summary = "Get candidates ranked by match score for a company placement drive")
    @GetMapping("/drives/{driveId}/candidates")
    public ResponseEntity<ApiResponse<Page<CandidateProfileDto>>> getDriveMatchedCandidates(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID driveId,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<CandidateProfileDto> page = candidateService.getDriveMatchedCandidates(
                principal.getId(), driveId, pageable);

        return ResponseEntity.ok(ApiResponse.success("Drive matched candidates retrieved successfully", page));
    }
}
