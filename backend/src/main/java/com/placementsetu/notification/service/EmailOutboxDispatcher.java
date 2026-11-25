package com.placementsetu.notification.service;

import com.placementsetu.notification.entity.EmailOutbox;
import com.placementsetu.notification.repository.EmailOutboxRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static com.placementsetu.notification.service.EmailAgentService.maskEmail;

/**
 * Scheduled background worker that reliably claims and dispatches due email records
 * from the email_outbox table. Implements bounded retries with exponential backoff and jitter.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailOutboxDispatcher {

    private final EmailOutboxRepository emailOutboxRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from:noreply@placementsetu.gujaratvidyapith.edu}")
    private String mailFrom;

    @Value("${app.mail.max-retries:3}")
    private int maxRetries;

    @Value("${app.mail.base-retry-delay-seconds:30}")
    private int baseRetryDelaySeconds;

    @Scheduled(fixedDelayString = "${app.mail.poll-interval-ms:5000}")
    public void processDueOutboxItems() {
        LocalDateTime now = LocalDateTime.now();
        List<EmailOutbox> dueItems = emailOutboxRepository.findDueRecords("PENDING", now, PageRequest.of(0, 20));

        if (dueItems.isEmpty()) {
            return;
        }

        log.debug("Found {} due email outbox records to process", dueItems.size());

        for (EmailOutbox item : dueItems) {
            dispatchSingleItem(item);
        }
    }

    @Transactional
    public void dispatchSingleItem(EmailOutbox item) {
        // Safe Development / Mail Disabled Mode
        if (!mailEnabled) {
            item.setStatus("SKIPPED");
            item.setLastError("Mail delivery disabled via app.mail.enabled=false. Recorded in development sandbox mode.");
            item.setSentAt(LocalDateTime.now());
            emailOutboxRepository.save(item);
            log.info("Email [{}] to [{}] marked SKIPPED (development mode)", item.getId(), maskEmail(item.getRecipientEmail()));
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("JavaMailSender bean is unavailable. Marking outbox item [{}] as SKIPPED", item.getId());
            item.setStatus("SKIPPED");
            item.setLastError("JavaMailSender bean is not configured in the Spring context.");
            emailOutboxRepository.save(item);
            return;
        }

        item.setAttempts(item.getAttempts() + 1);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom, "Placement Setu - Gujarat Vidyapith");
            helper.setTo(item.getRecipientEmail());
            helper.setSubject(item.getSubject());

            if (item.getBodyHtml() != null && !item.getBodyHtml().isBlank()) {
                helper.setText(item.getBodyText(), item.getBodyHtml());
            } else {
                helper.setText(item.getBodyText(), false);
            }

            mailSender.send(message);

            item.setStatus("SENT");
            item.setSentAt(LocalDateTime.now());
            item.setLastError(null);
            emailOutboxRepository.save(item);

            log.info("Email [{}] successfully sent to [{}] on attempt {}",
                    item.getId(), maskEmail(item.getRecipientEmail()), item.getAttempts());

        } catch (Exception ex) {
            int attempt = item.getAttempts();
            String sanitizedError = sanitizeErrorMessage(ex.getMessage());

            if (attempt >= item.getMaxAttempts() || isPermanentFailure(ex)) {
                item.setStatus("FAILED");
                item.setLastError("Permanent failure or max retries reached (" + attempt + "/" + item.getMaxAttempts() + "): " + sanitizedError);
                emailOutboxRepository.save(item);
                log.error("Email [{}] to [{}] permanently FAILED after {} attempts: {}",
                        item.getId(), maskEmail(item.getRecipientEmail()), attempt, sanitizedError);
            } else {
                // Exponential backoff with jitter: delay = base * 2^(attempt-1) + [0..5]s jitter
                long backoffSeconds = (long) (baseRetryDelaySeconds * Math.pow(2, attempt - 1)) + (long) (Math.random() * 5);
                item.setNextRetryAt(LocalDateTime.now().plusSeconds(backoffSeconds));
                item.setLastError("Transient failure on attempt " + attempt + ": " + sanitizedError);
                emailOutboxRepository.save(item);
                log.warn("Email [{}] to [{}] delivery failed (attempt {}). Rescheduled in {}s: {}",
                        item.getId(), maskEmail(item.getRecipientEmail()), attempt, backoffSeconds, sanitizedError);
            }
        }
    }

    private boolean isPermanentFailure(Exception ex) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        return msg.contains("invalid addresses")
                || msg.contains("user unknown")
                || msg.contains("mailbox not found")
                || msg.contains("syntax error in parameters");
    }

    private String sanitizeErrorMessage(String error) {
        if (error == null) return "Unknown delivery exception";
        // Strip out passwords or internal paths if present
        return error.replaceAll("password=[^,\\s]+", "password=***")
                .replaceAll("[\r\n]+", " ")
                .trim();
    }
}
