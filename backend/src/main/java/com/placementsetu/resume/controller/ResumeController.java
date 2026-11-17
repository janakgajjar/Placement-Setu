package com.placementsetu.resume.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.service.ResumeService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Resume", description = "Student resume upload + AI parsing (Section 6/15 of the workflow doc)")
@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping(value = "/me", consumes = "multipart/form-data")
    public ApiResponse<ResumeResponseDto> upload(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.success("Resume uploaded and processed successfully",
                resumeService.uploadAndParse(principal.getId(), file));
    }

    @GetMapping("/me")
    public ApiResponse<ResumeResponseDto> getMine(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Resume fetched successfully", resumeService.getMine(principal.getId()));
    }
}
