package com.placementsetu.student.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.student.dto.*;
import com.placementsetu.student.service.StudentProfileService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Section 21 item 5 (Student registration and dashboard) + item 9 (auto profile) endpoints. */
@Tag(name = "Student", description = "Student dashboard and placement profile")
@RestController
@RequestMapping("/api/v1/students/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentProfileService studentProfileService;
    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<StudentDashboardResponse> dashboard(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Dashboard fetched successfully", studentProfileService.getDashboard(principal.getId()));
    }

    @GetMapping("/drives")
    public ApiResponse<Page<StudentDriveDto>> getDrives(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success("Placement drives fetched successfully",
                studentProfileService.getEligibleDrives(principal.getId(), pageable));
    }

    @GetMapping("/profile")
    public ApiResponse<StudentProfileResponse> profile(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Profile fetched successfully", studentProfileService.getProfile(principal.getId()));
    }

    @PutMapping
    public ApiResponse<StudentProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateStudentProfileRequest request) {
        return ApiResponse.success("Profile updated successfully",
                studentProfileService.updateProfile(principal.getId(), request));
    }

    @PostMapping("/submit")
    public ApiResponse<StudentProfileResponse> submitProfile(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Profile submitted for Placement Officer review",
                studentProfileService.submitProfile(principal.getId()));
    }

    @PostMapping("/skills")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> addSkill(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Skill added successfully", studentProfileService.addSkill(principal.getId(), request)));
    }

    @DeleteMapping("/skills/{skillId}")
    public ApiResponse<Void> removeSkill(@AuthenticationPrincipal CustomUserDetails principal, @PathVariable UUID skillId) {
        studentProfileService.removeSkill(principal.getId(), skillId);
        return ApiResponse.success("Skill removed successfully");
    }

    @PostMapping("/projects")
    public ResponseEntity<ApiResponse<ProjectResponse>> addProject(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project added successfully", studentProfileService.addProject(principal.getId(), request)));
    }

    @DeleteMapping("/projects/{projectId}")
    public ApiResponse<Void> removeProject(@AuthenticationPrincipal CustomUserDetails principal, @PathVariable UUID projectId) {
        studentProfileService.removeProject(principal.getId(), projectId);
        return ApiResponse.success("Project removed successfully");
    }
    
    @PostMapping("/certifications")
    public ResponseEntity<ApiResponse<CertificationResponse>> addCertification(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CertificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Certification added successfully",
                        studentProfileService.addCertification(principal.getId(), request)));
    }

    @DeleteMapping("/certifications/{certificationId}")
    public ApiResponse<Void> removeCertification(
            @AuthenticationPrincipal CustomUserDetails principal, @PathVariable UUID certificationId) {
        studentProfileService.removeCertification(principal.getId(), certificationId);
        return ApiResponse.success("Certification removed successfully");
    }

    @GetMapping("/notifications")
    public ApiResponse<PagedNotificationResponse> getNotifications(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) Boolean unread,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Notifications fetched successfully",
                notificationService.getUserNotifications(principal.getId(), unread, pageable));
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public ApiResponse<NotificationResponseDto> markNotificationAsRead(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID notificationId) {
        return ApiResponse.success("Notification marked as read",
                notificationService.markAsRead(principal.getId(), notificationId));
    }
}
