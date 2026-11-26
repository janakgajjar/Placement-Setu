# Placement Setu: Notification Service & Email Agent Implementation Plan

**Date:** October 2026  
**Status:** Approved for Implementation  
**Target:** Spring Boot 3.2.5 Backend, Flyway Migrations, React 18 Frontend  

---

## 1. Overview & Objectives

This implementation plan defines the step-by-step technical architecture for:
1. **Notification Service:** User-scoped, authenticated, in-app notification management with pagination, unread filtering, and read-state management under `/api/v1/notifications`.
2. **Email Agent:** An internal, non-public transactional email engine utilizing the Transactional Outbox pattern, deterministic templating with XSS/HTML injection protection, bounded retries with exponential backoff, and a safe development mode.
3. **Domain Event Wiring:** Integration into existing workflow services (Company Approval, Student Registration, Drive Publishing, Resume Parsing).
4. **Frontend Integration:** Notification Bell, unread counter badge, popover feed, mark-as-read interactivity, and responsive UI.

---

## 2. Architecture & Design Principles

```
  +---------------------------------------------------------------------------------+
  |                             Domain Business Service                             |
  | (AuthServiceImpl / CompanyApprovalController / ResumeService / DriveServiceImpl)|
  +---------------------------------------------------------------------------------+
                                       |
                   Calls event helper in local transaction
                                       v
  +---------------------------------------------------------------------------------+
  |                       Notification & Outbox Dispatcher                          |
  |  - Persists In-App Notification (table: notifications)                          |
  |  - Persists Outbox Email Task   (table: email_outbox)                           |
  |  - Deduplicates via Idempotency Keys                                            |
  +---------------------------------------------------------------------------------+
                                       |
                   Committed atomically in Postgres DB
                                       v
                 +-------------------------------------------+
                 | PostgreSQL Database (Flyway V4 Migration) |
                 +-------------------------------------------+
                       ^                               ^
                       | (GET/PATCH)                   | (Polls due outbox items)
                       |                               |
  +--------------------+-------+       +---------------+----------------------------+
  |    NotificationController  |       |       EmailOutboxDispatcher (Worker)       |
  |  GET /api/v1/notifications |       | - Checks status='PENDING' & next_retry<=now|
  |  PATCH .../{id}/read       |       | - Renders deterministic HTML/text template |
  +----------------------------+       | - Checks app.mail.enabled (SENT / SKIPPED) |
               ^                       | - Transient SMTP error -> Exponential retry|
               |                       | - Max attempts reached -> FAILED           |
  +------------+---------------+       +--------------------------------------------+
  |    React 18 Frontend       |                               |
  | Header Bell + Popover Feed |                               v
  +----------------------------+                     [SMTP Provider / Mailpit]
```

---

## 3. Implementation Phases

### Phase 1: Database Migration (Flyway V4)
- **File:** `backend/src/main/resources/db/migration/V4__notification_and_email_outbox.sql`
- **Schema Changes:**
  - Alter `notifications` table to add:
    - `is_read BOOLEAN NOT NULL DEFAULT FALSE`
    - `read_at TIMESTAMPTZ`
    - `message TEXT`
    - `idempotency_key VARCHAR(255)`
  - Create table `email_outbox`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `recipient_email VARCHAR(255) NOT NULL`
    - `recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
    - `subject VARCHAR(255) NOT NULL`
    - `body_text TEXT NOT NULL`
    - `body_html TEXT`
    - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` (`PENDING`, `SENT`, `FAILED`, `SKIPPED`)
    - `attempts INT NOT NULL DEFAULT 0`
    - `max_attempts INT NOT NULL DEFAULT 3`
    - `next_retry_at TIMESTAMPTZ`
    - `sent_at TIMESTAMPTZ`
    - `last_error TEXT`
    - `idempotency_key VARCHAR(255)`
    - `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
  - Create performance indexes on `notifications(recipient_user_id, is_read, created_at)` and `email_outbox(status, next_retry_at)`.
  - Add unique indexes for idempotency: `notifications(recipient_user_id, idempotency_key)` and `email_outbox(recipient_email, idempotency_key)`.

### Phase 2: Dependency & Configuration Setup
- **File:** `backend/pom.xml`
  - Add `org.springframework.boot:spring-boot-starter-mail`.
- **File:** `backend/src/main/resources/application.yml`
  - Add `app.mail` properties:
    - `enabled: ${MAIL_ENABLED:false}` (safe default to avoid crashing local dev without SMTP)
    - `from: ${MAIL_FROM:noreply@placementsetu.gujaratvidyapith.edu}`
    - `max-retries: ${MAIL_MAX_RETRIES:3}`
    - `poll-interval-ms: ${MAIL_POLL_INTERVAL_MS:5000}`
    - `base-retry-delay-seconds: ${MAIL_BASE_RETRY_DELAY:30}`
    - `app-base-url: ${APP_BASE_URL:http://localhost:5173}`
  - Standard `spring.mail` host, port, username, password, and JavaMail properties.

### Phase 3: Entities & Repositories
- Update `com.placementsetu.notification.entity.Notification`.
- Create `com.placementsetu.notification.entity.EmailOutbox`.
- Update `com.placementsetu.common.enums.NotificationType` (add needed business event types).
- Create `com.placementsetu.notification.repository.NotificationRepository` methods:
  - `findByRecipientUserId(UUID recipientUserId, Pageable pageable)`
  - `findByRecipientUserIdAndIsRead(UUID recipientUserId, boolean isRead, Pageable pageable)`
  - `countByRecipientUserIdAndIsReadFalse(UUID recipientUserId)`
  - `findByIdAndRecipientUserId(UUID id, UUID recipientUserId)`
  - `existsByRecipientUserIdAndIdempotencyKey(UUID recipientUserId, String idempotencyKey)`
- Create `com.placementsetu.notification.repository.EmailOutboxRepository` methods:
  - `findByStatusAndNextRetryAtLessThanEqual(String status, Instant nextRetryAt, Pageable pageable)`
  - `existsByRecipientEmailAndIdempotencyKey(String recipientEmail, String idempotencyKey)`

### Phase 4: Data Transfer Objects (DTOs)
- `NotificationResponseDto`: `id`, `type`, `subject`, `message`, `isRead`, `readAt`, `relatedEntityType`, `relatedEntityId`, `createdAt`.
- `PagedNotificationResponse`: `content`, `page`, `size`, `totalElements`, `totalPages`, `unreadCount`.

### Phase 5: Notification Service & Internal Email Agent
- **`NotificationService`**:
  - `PagedNotificationResponse getNotifications(UUID currentUserId, Boolean unreadOnly, Pageable pageable)`
  - `NotificationResponseDto markAsRead(UUID currentUserId, UUID notificationId)`
  - `void createNotification(...)` with idempotency guard.
- **`EmailTemplateService`**:
  - HTML & Text template generators with strict `HtmlUtils.htmlEscape` on all user-supplied data (student names, company names, rejection reasons, drive titles).
  - Institutional Gujarat Vidyapith branding.
- **`EmailAgentService`**:
  - Internal dispatch queueing: `queueEmail(String recipientEmail, UUID recipientUserId, String subject, String bodyText, String bodyHtml, String idempotencyKey)`.
- **`EmailOutboxDispatcher`**:
  - Scheduled worker polling every 5s for pending due outbox records.
  - Safe concurrency handling with lease/claim update.
  - If `app.mail.enabled` is false, marks `SKIPPED` with note.
  - On SMTP success: status `SENT`, `sent_at = now()`.
  - On SMTP exception: increment `attempts`, calculate exponential backoff + jitter; mark `FAILED` if `attempts >= maxAttempts`.

### Phase 6: REST Controller
- **File:** `com.placementsetu.notification.controller.NotificationController`
  - `GET /api/v1/notifications`:
    - Resolves user from `SecurityContext` / `Authentication.getPrincipal()`.
    - Accepts `page`, `size`, `unread` parameters.
    - Returns `ResponseEntity<ApiResponse<PagedNotificationResponse>>`.
  - `PATCH /api/v1/notifications/{notificationId}/read`:
    - Validates ownership (`findByIdAndRecipientUserId`). Returns 404/403 if unauthorized.
    - Updates `isRead = true`, `readAt = now()`.
    - Returns updated `NotificationResponseDto`.

### Phase 7: Domain Event Wiring
- In `AuthServiceImpl`: Trigger officer & admin notification on new company registration.
- In `CompanyApprovalController`: Trigger notification & email to company contact email upon approval or rejection.
- In `ResumeService`: Trigger student notification & email on resume extraction success or failure.
- In `PlacementDriveServiceImpl`: Trigger notification on drive publishing and closing.

### Phase 8: Frontend UI & Client Integration
- Update `frontend/src/lib/api.js` with `notificationApi.getNotifications(params)` and `notificationApi.markAsRead(id)`.
- Update `frontend/src/components/layout/Header.jsx`:
  - Notification bell with unread badge counter.
  - Popover dropdown showing latest notifications, formatted relative timestamps, read/unread status, and quick mark-as-read buttons.
  - Filter toggle for "Unread only".

### Phase 9: Documentation & Manual Testing Deliverables
- `docs/NOTIFICATION_EMAIL_MANUAL_TEST_GUIDE.md`: Comprehensive step-by-step test manual covering all user roles, security, outbox retries, and frontend UI.
- `docs/NOTIFICATION_EMAIL_IMPLEMENTATION_REPORT.md`: Full architectural summary, changed files, schema evolution, and explicit compliance verification.
- Update `RUN.md` with mail environment variable configuration.
