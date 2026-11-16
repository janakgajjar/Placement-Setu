package com.placementsetu.notification.service;

import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationService {

    /**
     * Lists notifications for the authenticated user with pagination and optional unread filtering.
     */
    PagedNotificationResponse getUserNotifications(UUID currentUserId, Boolean unreadOnly, Pageable pageable);

    /**
     * Marks a notification as read, verifying that it belongs to the authenticated user.
     */
    NotificationResponseDto markAsRead(UUID currentUserId, UUID notificationId);

    /**
     * Creates an in-app notification and dispatches an outbox email for a specific recipient.
     */
    void notifyUser(
            UUID recipientUserId,
            NotificationType type,
            String subject,
            String message,
            String relatedEntityType,
            UUID relatedEntityId,
            String idempotencyKey);

    /**
     * Role-wide notification for PLACEMENT_OFFICER and ADMIN roles.
     */
    void notifyOfficersAndAdmins(
            NotificationType type,
            String subject,
            String message,
            String relatedEntityType,
            UUID relatedEntityId,
            String idempotencyKey);

    // Typed Domain Event Helpers
    void notifyCompanyApproved(UUID companyUserId, String companyName);

    void notifyCompanyRejected(UUID companyUserId, String companyName, String reason);

    void notifyCompanySubmitted(String companyName, UUID companyUserId);

    void notifyResumeProcessed(UUID studentUserId, String studentName, boolean hasMissingFields);

    void notifyResumeFailed(UUID studentUserId, String studentName, String failureReason);

    void notifyDrivePublished(UUID driveId, String driveTitle, String companyName, UUID companyUserId);

    void notifyDriveClosed(UUID driveId, String driveTitle, String companyName, UUID companyUserId);
}
