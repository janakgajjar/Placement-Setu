package com.placementsetu.notification.service;

import com.placementsetu.notification.entity.EmailOutbox;
import com.placementsetu.notification.repository.EmailOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Internal Email Agent orchestrator.
 * Not exposed as a public API.
 * Dispatches emails durably by enqueuing them into the Transactional Email Outbox.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailAgentService {

    private final EmailOutboxRepository emailOutboxRepository;

    /**
     * Enqueues an email into the outbox within the caller's active database transaction.
     * Guaranteed durability: if the business transaction succeeds, the email task is persisted.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueEmail(
            String recipientEmail,
            UUID recipientUserId,
            String subject,
            String bodyText,
            String bodyHtml,
            String idempotencyKey) {

        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot enqueue email: recipient email address is null or empty");
            return;
        }

        // Idempotency check: avoid double-enqueuing for retried events
        if (idempotencyKey != null && emailOutboxRepository.existsByRecipientEmailAndIdempotencyKey(recipientEmail, idempotencyKey)) {
            log.info("Email already queued for recipient [{}] with idempotencyKey [{}]. Skipping duplicate.",
                    maskEmail(recipientEmail), idempotencyKey);
            return;
        }

        EmailOutbox outbox = EmailOutbox.builder()
                .recipientEmail(recipientEmail.trim())
                .recipientUserId(recipientUserId)
                .subject(subject)
                .bodyText(bodyText)
                .bodyHtml(bodyHtml)
                .status("PENDING")
                .attempts(0)
                .maxAttempts(3)
                .nextRetryAt(LocalDateTime.now())
                .idempotencyKey(idempotencyKey)
                .build();

        emailOutboxRepository.save(outbox);
        log.info("Email enqueued in outbox for [{}] with subject [{}] (IdempotencyKey: {})",
                maskEmail(recipientEmail), subject, idempotencyKey != null ? idempotencyKey : "NONE");
    }

    /**
     * Masks email addresses for privacy and security logging compliance.
     * Example: "john.doe@example.com" -> "j***e@example.com"
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        String[] parts = email.split("@", 2);
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }
}
