package com.placementsetu.officer.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Officer Notifications", description = "Placement Officer in-app notification endpoints")
@RestController
@RequestMapping("/api/v1/placement-officers/me/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PLACEMENT_OFFICER', 'ADMIN')")
public class OfficerNotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Get authenticated placement officer's notifications")
    @GetMapping
    public ApiResponse<PagedNotificationResponse> getNotifications(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) Boolean unread,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Notifications fetched successfully",
                notificationService.getUserNotifications(principal.getId(), unread, pageable));
    }

    @Operation(summary = "Mark an officer notification as read")
    @PatchMapping("/{notificationId}/read")
    public ApiResponse<NotificationResponseDto> markAsRead(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable UUID notificationId) {
        return ApiResponse.success("Notification marked as read",
                notificationService.markAsRead(principal.getId(), notificationId));
    }
}
