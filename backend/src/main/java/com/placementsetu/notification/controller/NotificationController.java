package com.placementsetu.notification.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for authenticated in-app notifications according to API Reference v2.0 Section 18.
 * No email dispatch or administrative send endpoints are exposed here.
 */
@Slf4j
@Tag(name = "Notifications", description = "User in-app notification management")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/notifications?page=0&size=20&unread=true
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Get current user's notifications with pagination and optional unread filter")
    @GetMapping
    public ApiResponse<PagedNotificationResponse> getNotifications(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) Boolean unread,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        UUID currentUserId = principal.getId();
        PagedNotificationResponse response = notificationService.getUserNotifications(currentUserId, unread, pageable);
        return ApiResponse.success("Notifications fetched successfully", response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /api/v1/notifications/{notificationId}/read
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "Mark a specific notification as read")
    @PatchMapping("/{notificationId}/read")
    public ApiResponse<NotificationResponseDto> markAsRead(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID notificationId) {

        UUID currentUserId = principal.getId();
        NotificationResponseDto response = notificationService.markAsRead(currentUserId, notificationId);
        return ApiResponse.success("Notification marked as read", response);
    }
}
