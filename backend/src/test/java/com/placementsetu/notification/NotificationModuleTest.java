package com.placementsetu.notification;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.NotificationStatus;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.controller.CompanyNotificationController;
import com.placementsetu.notification.dto.NotificationResponseDto;
import com.placementsetu.notification.dto.PagedNotificationResponse;
import com.placementsetu.notification.entity.EmailOutbox;
import com.placementsetu.notification.entity.Notification;
import com.placementsetu.notification.repository.EmailOutboxRepository;
import com.placementsetu.notification.repository.NotificationRepository;
import com.placementsetu.notification.service.EmailAgentService;
import com.placementsetu.notification.service.EmailOutboxDispatcher;
import com.placementsetu.notification.service.EmailTemplateService;
import com.placementsetu.notification.service.impl.NotificationServiceImpl;
import com.placementsetu.officer.controller.OfficerNotificationController;
import com.placementsetu.student.controller.StudentController;
import com.placementsetu.user.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationModuleTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailAgentService emailAgentService;
    @Mock private EmailTemplateService emailTemplateService;
    @Mock private AuditService auditService;
    @Mock private EmailOutboxRepository emailOutboxRepository;
    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private JavaMailSender javaMailSender;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private UUID userId;
    private UUID otherUserId;
    private UUID notificationId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();
        notificationId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Role-specific notification controllers enforce STUDENT, COMPANY, and PLACEMENT_OFFICER roles")
    void testRoleSpecificNotificationControllers() {
        assertEquals("hasRole('STUDENT')", StudentController.class.getAnnotation(PreAuthorize.class).value());
        assertEquals("hasRole('COMPANY')", CompanyNotificationController.class.getAnnotation(PreAuthorize.class).value());
        assertEquals("hasRole('PLACEMENT_OFFICER')", OfficerNotificationController.class.getAnnotation(PreAuthorize.class).value());
    }

    @Test
    @DisplayName("Notification creation persists record and skips duplicate idempotency keys")
    void testNotificationCreationAndDeduplication() {
        when(notificationRepository.existsByRecipientUserIdAndIdempotencyKey(userId, "KEY-1")).thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(notificationId);
            return n;
        });

        notificationService.notifyUser(userId, NotificationType.APPLICATION_SUBMITTED,
                "Submitted", "Body", "APPLICATION", UUID.randomUUID(), "KEY-1");
        verify(notificationRepository, times(1)).save(any(Notification.class));

        when(notificationRepository.existsByRecipientUserIdAndIdempotencyKey(userId, "KEY-1")).thenReturn(true);
        notificationService.notifyUser(userId, NotificationType.APPLICATION_SUBMITTED,
                "Submitted", "Body", "APPLICATION", UUID.randomUUID(), "KEY-1");
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("User retrieves only own notifications and cannot mark another user's notification as read")
    void testUserScopedRetrievalAndCrossUserMarkAsReadRejected() {
        Notification own = Notification.builder()
                .id(notificationId).recipientUserId(userId).type(NotificationType.GENERAL)
                .subject("Hello").status(NotificationStatus.SENT).isRead(false).build();

        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByRecipientUserId(userId, pageable)).thenReturn(new PageImpl<>(List.of(own)));
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(userId)).thenReturn(1L);

        PagedNotificationResponse page = notificationService.getUserNotifications(userId, null, pageable);
        assertEquals(1, page.getContent().size());
        assertEquals(1L, page.getUnreadCount());

        when(notificationRepository.findByIdAndRecipientUserId(notificationId, userId)).thenReturn(Optional.of(own));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));
        NotificationResponseDto readDto = notificationService.markAsRead(userId, notificationId);
        assertTrue(readDto.isRead());

        when(notificationRepository.findByIdAndRecipientUserId(notificationId, otherUserId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead(otherUserId, notificationId));
    }

    @Test
    @DisplayName("EmailOutboxDispatcher retries transient failures and marks FAILED after maxAttempts")
    void testEmailFailureAndRetryBehavior() {
        EmailOutboxDispatcher dispatcher = new EmailOutboxDispatcher(emailOutboxRepository, mailSenderProvider);
        ReflectionTestUtils.setField(dispatcher, "mailEnabled", true);
        ReflectionTestUtils.setField(dispatcher, "mailFrom", "noreply@vidyapith.edu");
        ReflectionTestUtils.setField(dispatcher, "baseRetryDelaySeconds", 30);

        when(mailSenderProvider.getIfAvailable()).thenReturn(javaMailSender);
        MimeMessage mime = new MimeMessage((jakarta.mail.Session) null);
        when(javaMailSender.createMimeMessage()).thenReturn(mime);
        doThrow(new MailSendException("SMTP timeout")).when(javaMailSender).send(any(MimeMessage.class));

        EmailOutbox item = EmailOutbox.builder()
                .id(UUID.randomUUID())
                .recipientEmail("student@vidyapith.edu")
                .subject("Test")
                .bodyText("Body")
                .status("PENDING")
                .attempts(0)
                .maxAttempts(2)
                .build();

        dispatcher.dispatchSingleItem(item);
        assertEquals("PENDING", item.getStatus());
        assertEquals(1, item.getAttempts());
        assertNotNull(item.getLastError());

        dispatcher.dispatchSingleItem(item);
        assertEquals("FAILED", item.getStatus());
        assertEquals(2, item.getAttempts());
    }
}
