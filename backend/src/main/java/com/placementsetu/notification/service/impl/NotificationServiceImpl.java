package com.placementsetu.notification.service.impl;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.NotificationStatus;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import com.placementsetu.notification.entity.Notification;
import com.placementsetu.notification.repository.NotificationRepository;
import com.placementsetu.notification.service.EmailAgentService;
import com.placementsetu.notification.service.EmailTemplateService;
import com.placementsetu.notification.service.EmailTemplateService.RenderedEmail;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailAgentService emailAgentService;
    private final EmailTemplateService emailTemplateService;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public PagedNotificationResponse getUserNotifications(UUID currentUserId, Boolean unreadOnly, Pageable pageable) {
        Page<Notification> page;
        if (Boolean.TRUE.equals(unreadOnly)) {
            page = notificationRepository.findByRecipientUserIdAndIsRead(currentUserId, false, pageable);
        } else {
            page = notificationRepository.findByRecipientUserId(currentUserId, pageable);
        }

        long unreadCount = notificationRepository.countByRecipientUserIdAndIsReadFalse(currentUserId);

        List<NotificationResponseDto> content = page.getContent().stream()
                .map(NotificationResponseDto::fromEntity)
                .collect(Collectors.toList());

        return PagedNotificationResponse.builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .unreadCount(unreadCount)
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional
    public NotificationResponseDto markAsRead(UUID currentUserId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipientUserId(notificationId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
            log.debug("Marked notification [{}] as read for user [{}]", notificationId, currentUserId);
        }

        return NotificationResponseDto.fromEntity(notification);
    }

    @Override
    @Transactional
    public void notifyUser(
            UUID recipientUserId,
            NotificationType type,
            String subject,
            String message,
            String relatedEntityType,
            UUID relatedEntityId,
            String idempotencyKey) {

        if (recipientUserId == null) {
            log.warn("Cannot create notification: recipientUserId is null");
            return;
        }

        // Idempotency: skip if already notified for this event
        if (idempotencyKey != null && notificationRepository.existsByRecipientUserIdAndIdempotencyKey(recipientUserId, idempotencyKey)) {
            log.info("In-app notification already exists for recipient [{}] with key [{}]. Skipping duplicate.",
                    recipientUserId, idempotencyKey);
            return;
        }

        Notification notification = Notification.builder()
                .recipientUserId(recipientUserId)
                .type(type)
                .subject(subject)
                .message(message)
                .status(NotificationStatus.SENT) // in-app delivery is immediate upon commit
                .sentAt(LocalDateTime.now())
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .idempotencyKey(idempotencyKey)
                .isRead(false)
                .build();

        notification = notificationRepository.save(notification);
        log.info("In-app notification persisted for recipient [{}] - type [{}]", recipientUserId, type);
        if (auditService != null) {
            auditService.logEvent(recipientUserId, "NOTIFICATION_SENT", "NOTIFICATION", notification.getId(),
                    java.util.Map.of("type", type.name()));
        }
    }

    @Override
    @Transactional
    public void notifyOfficersAndAdmins(
            NotificationType type,
            String subject,
            String message,
            String relatedEntityType,
            UUID relatedEntityId,
            String idempotencyKey) {

        List<User> recipients = new ArrayList<>();
        recipients.addAll(userRepository.findByRole(UserRole.PLACEMENT_OFFICER));
        recipients.addAll(userRepository.findByRole(UserRole.ADMIN));

        for (User officer : recipients) {
            String scopedKey = idempotencyKey != null ? idempotencyKey + ":" + officer.getId() : null;
            notifyUser(officer.getId(), type, subject, message, relatedEntityType, relatedEntityId, scopedKey);

            RenderedEmail email = emailTemplateService.renderGeneral(
                    "Officer",
                    subject,
                    message,
                    "/admin/companies",
                    "View Placement Portal"
            );
            emailAgentService.enqueueEmail(officer.getEmail(), officer.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), scopedKey);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Typed Domain Event Implementations
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void notifyCompanyApproved(UUID companyUserId, String companyName) {
        String key = "COMPANY_APPROVED:" + companyUserId;
        String subject = "Company Account Approved - " + companyName;
        String message = "Congratulations! Your recruiter account for " + companyName + " has been approved by Gujarat Vidyapith Placement Cell. You can now post placement drives.";

        notifyUser(companyUserId, NotificationType.COMPANY_APPROVED, subject, message, "COMPANY", companyUserId, key);

        Optional<User> userOpt = userRepository.findById(companyUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            RenderedEmail email = emailTemplateService.renderCompanyApproved(companyName, user.getEmail());
            emailAgentService.enqueueEmail(user.getEmail(), user.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        }
    }

    @Override
    @Transactional
    public void notifyCompanyRejected(UUID companyUserId, String companyName, String reason) {
        String key = "COMPANY_REJECTED:" + companyUserId;
        String subject = "Company Registration Status - " + companyName;
        String message = "Your recruiter registration for " + companyName + " could not be approved at this time. Note: " + (reason != null ? reason : "Contact Placement Cell.");

        notifyUser(companyUserId, NotificationType.COMPANY_REJECTED, subject, message, "COMPANY", companyUserId, key);

        Optional<User> userOpt = userRepository.findById(companyUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            RenderedEmail email = emailTemplateService.renderCompanyRejected(companyName, user.getEmail(), reason);
            emailAgentService.enqueueEmail(user.getEmail(), user.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        }
    }

    @Override
    @Transactional
    public void notifyCompanySubmitted(String companyName, UUID companyUserId) {
        String key = "COMPANY_SUBMITTED:" + companyUserId;
        String subject = "New Company Registration: " + companyName;
        String message = "Recruiter profile for " + companyName + " has been submitted and is pending verification.";

        notifyOfficersAndAdmins(NotificationType.COMPANY_SUBMITTED, subject, message, "COMPANY", companyUserId, key);
    }

    @Override
    @Transactional
    public void notifyResumeProcessed(UUID studentUserId, String studentName, boolean hasMissingFields) {
        String key = "RESUME_PROCESSED:" + studentUserId + ":" + System.currentTimeMillis();
        String subject = "Resume Processing Completed";
        String message = hasMissingFields
                ? "Your resume was parsed, but some fields require manual review in your student profile."
                : "Your resume was successfully parsed and applied to your student profile.";

        notifyUser(studentUserId, NotificationType.RESUME_PROCESSED, subject, message, "RESUME", null, key);

        Optional<User> userOpt = userRepository.findById(studentUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            RenderedEmail email = emailTemplateService.renderResumeProcessed(studentName, hasMissingFields);
            emailAgentService.enqueueEmail(user.getEmail(), user.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        }
    }

    @Override
    @Transactional
    public void notifyResumeFailed(UUID studentUserId, String studentName, String failureReason) {
        String key = "RESUME_FAILED:" + studentUserId + ":" + System.currentTimeMillis();
        String subject = "Resume Processing Error";
        String message = "Automated processing of your resume encountered an issue: " + (failureReason != null ? failureReason : "File could not be parsed");

        notifyUser(studentUserId, NotificationType.RESUME_FAILED, subject, message, "RESUME", null, key);

        Optional<User> userOpt = userRepository.findById(studentUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            RenderedEmail email = emailTemplateService.renderResumeFailed(studentName, failureReason);
            emailAgentService.enqueueEmail(user.getEmail(), user.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        }
    }

    @Override
    @Transactional
    public void notifyDriveSubmittedForApproval(UUID driveId, String driveTitle, String companyName) {
        String key = "DRIVE_SUBMITTED:" + driveId + ":" + System.currentTimeMillis();
        String subject = "Placement Drive Awaiting Approval: " + driveTitle;
        String message = "Company '" + companyName + "' submitted placement drive '" + driveTitle + "' for Placement Officer review.";

        notifyOfficersAndAdmins(NotificationType.DRIVE_SUBMITTED, subject, message, "DRIVE", driveId, key);
    }

    @Override
    @Transactional
    public void notifyDriveApproved(UUID driveId, String driveTitle, String companyName, UUID companyUserId, String remarks) {
        String key = "DRIVE_APPROVED:" + driveId;
        String subject = "Placement Drive Approved & Published: " + driveTitle;
        String message = "Your placement drive '" + driveTitle + "' has been approved by the Placement Officer and is now live for students."
                + (remarks != null && !remarks.isBlank() ? " Remarks: " + remarks : "");

        notifyUser(companyUserId, NotificationType.DRIVE_APPROVED, subject, message, "DRIVE", driveId, key + ":COMPANY");

        userRepository.findById(companyUserId).ifPresent(companyUser -> {
            RenderedEmail email = emailTemplateService.renderGeneral(
                    companyName, subject, message, "/company/drives", "View Placement Drive");
            emailAgentService.enqueueEmail(
                    companyUser.getEmail(), companyUser.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key + ":COMPANY");
        });

        List<User> students = userRepository.findByRole(UserRole.STUDENT);
        for (User student : students) {
            String studentKey = "DRIVE_PUBLISHED:" + driveId + ":STUDENT:" + student.getId();
            notifyUser(student.getId(), NotificationType.DRIVE_PUBLISHED,
                    "New Drive: " + driveTitle + " (" + companyName + ")",
                    "A new campus placement drive has been announced by " + companyName + ". Check your eligibility to apply.",
                    "DRIVE", driveId, studentKey);
        }
    }

    @Override
    @Transactional
    public void notifyDriveRejected(UUID driveId, String driveTitle, String companyName, UUID companyUserId, String remarks) {
        String key = "DRIVE_REJECTED:" + driveId + ":" + System.currentTimeMillis();
        String subject = "Placement Drive Rejected: " + driveTitle;
        String message = "Your placement drive '" + driveTitle + "' was rejected by the Placement Officer. Remarks: "
                + (remarks != null && !remarks.isBlank() ? remarks : "Please review and resubmit.");

        notifyUser(companyUserId, NotificationType.DRIVE_REJECTED, subject, message, "DRIVE", driveId, key);

        userRepository.findById(companyUserId).ifPresent(companyUser -> {
            RenderedEmail email = emailTemplateService.renderGeneral(
                    companyName, subject, message, "/company/drives", "Edit & Resubmit Drive");
            emailAgentService.enqueueEmail(
                    companyUser.getEmail(), companyUser.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        });
    }

    @Override
    @Transactional
    public void notifyDrivePublished(UUID driveId, String driveTitle, String companyName, UUID companyUserId) {
        String key = "DRIVE_PUBLISHED:" + driveId;
        String subject = "Placement Drive Published: " + driveTitle;
        String message = "Your placement drive '" + driveTitle + "' is now live for eligible students to view and apply.";

        // In-app for company owner
        notifyUser(companyUserId, NotificationType.DRIVE_PUBLISHED, subject, message, "DRIVE", driveId, key + ":COMPANY");

        userRepository.findById(companyUserId).ifPresent(companyUser -> {
            RenderedEmail email = emailTemplateService.renderGeneral(
                    companyName, subject, message, "/company/drives", "View Placement Drive");
            emailAgentService.enqueueEmail(
                    companyUser.getEmail(), companyUser.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key + ":COMPANY");
        });

        // Role-wide alert to all students
        List<User> students = userRepository.findByRole(UserRole.STUDENT);
        for (User student : students) {
            String studentKey = key + ":STUDENT:" + student.getId();
            notifyUser(student.getId(), NotificationType.DRIVE_PUBLISHED,
                    "New Drive: " + driveTitle + " (" + companyName + ")",
                    "A new campus placement drive has been announced by " + companyName + ". Check your eligibility to apply.",
                    "DRIVE", driveId, studentKey);
        }
    }

    @Override
    @Transactional
    public void notifyDriveClosed(UUID driveId, String driveTitle, String companyName, UUID companyUserId) {
        String key = "DRIVE_CLOSED:" + driveId;
        String subject = "Placement Drive Closed: " + driveTitle;
        String message = "Applications for placement drive '" + driveTitle + "' have concluded.";

        notifyUser(companyUserId, NotificationType.DRIVE_CLOSED, subject, message, "DRIVE", driveId, key);

        userRepository.findById(companyUserId).ifPresent(companyUser -> {
            RenderedEmail email = emailTemplateService.renderGeneral(
                    companyName, subject, message, "/company/drives", "View Closed Drive");
            emailAgentService.enqueueEmail(
                    companyUser.getEmail(), companyUser.getId(), email.getSubject(), email.getTextBody(), email.getHtmlBody(), key);
        });
    }
}
