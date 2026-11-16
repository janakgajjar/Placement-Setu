package com.placementsetu.resume.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.resume.dto.ResumeBatchResponseDto;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.service.ResumeService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Tag(name = "Resume", description = "Student resume upload, background async processing, and bulk batch AI ingestion")
@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    // ─────────────────────────────────────────────────────────────────────────
    // Student Single Resume Operations
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Upload and parse resume synchronously")
    @PostMapping(value = "/me", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<ResumeResponseDto> upload(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.success("Resume uploaded and processed successfully",
                resumeService.uploadAndParse(principal.getId(), file));
    }

    @Operation(summary = "Upload resume asynchronously in background (Non-blocking with notifications)")
    @PostMapping(value = "/me/async", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<ResumeResponseDto> uploadAsync(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.success("Resume accepted for background AI processing. You will receive an in-app and email notification upon completion.",
                resumeService.uploadAndParseAsync(principal.getId(), file));
    }

    @Operation(summary = "Get current student's resume metadata and parsed status")
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<ResumeResponseDto> getMine(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Resume fetched successfully", resumeService.getMine(principal.getId()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Officer / Admin Batch Resume Processing Operations
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Submit a batch of resumes for background asynchronous AI parsing")
    @PostMapping(value = "/batch", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAnyRole('PLACEMENT_OFFICER', 'ADMIN')")
    public ApiResponse<ResumeBatchResponseDto> submitBatch(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(value = "jobName", required = false) String jobName,
            @RequestParam("files") MultipartFile[] files) {
        ResumeBatchResponseDto response = resumeService.submitBatchJob(principal.getId(), jobName, files);
        return ApiResponse.success("Resume batch job enqueued successfully. Processing in background.", response);
    }

    @Operation(summary = "Get resume batch processing status and individual item outcomes")
    @GetMapping("/batch/{batchId}")
    @PreAuthorize("hasAnyRole('PLACEMENT_OFFICER', 'ADMIN')")
    public ApiResponse<ResumeBatchResponseDto> getBatch(
            @PathVariable UUID batchId) {
        return ApiResponse.success("Batch job fetched successfully", resumeService.getBatchJob(batchId));
    }
}
