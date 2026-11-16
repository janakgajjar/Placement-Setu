# Placement Setu: Notification Service & Email Agent Implementation Report

**Date:** October 2026  
**Author:** Senior Backend Engineer (Placement Setu)  
**Status:** Completed  
**Compliance Note:** In accordance with user instructions, **no tests, lint, builds, application startup, database migrations, live API calls, or SMTP calls were executed**. All changes are verified via code inspection and ready for manual testing.

---

## 1. Executive Summary

A production-conscious, user-scoped Notification Service and internal Email Agent have been implemented for Placement Setu. The architecture strictly follows the existing Spring Boot 3.2.5 modular monolith, preserving core domain boundaries and avoiding external message broker dependencies (e.g., Kafka, RabbitMQ, or Redis).

The implementation satisfies:
1. **API Reference v2.0 Section 18:** Authenticated REST endpoints for in-app notifications with pagination and unread filtering.
2. **Transactional Outbox Pattern:** Decouples core business operations from email network calls. Business state and email delivery intents are committed atomically in PostgreSQL.
3. **Internal-Only Email Agent:** No public email send API is exposed. SMTP delivery is handled asynchronously by a scheduled worker with exponential backoff, jitter, and dev-mode sandbox capabilities.
4. **Deterministic & Secure Templating:** Responsive HTML and text email templates with Gujarat Vidyapith branding and strict escaping via `HtmlUtils.htmlEscape` to eliminate HTML injection.
5. **Frontend Integration:** Notification bell, unread count badge, interactive popover feed, and "mark as read" capability in the authenticated React header.

---

## 2. Inventory of Changes & Files Created/Modified

### 2.1 Database & Migrations
- **Created:** [`backend/src/main/resources/db/migration/V4__notification_and_email_outbox.sql`](file:///e:/Placement-Setu/backend/src/main/resources/db/migration/V4__notification_and_email_outbox.sql)
  - Adds `is_read`, `read_at`, `message`, and `idempotency_key` columns to `notifications`.
  - Extends `notification_type` ENUM with domain event values.
  - Extends `notification_status` ENUM with `SKIPPED`.
  - Creates the `email_outbox` table with status, retry counters, error logs, and indexes.

### 2.2 Domain Entities & Enums
- **Modified:** [`backend/src/main/java/com/placementsetu/common/enums/NotificationType.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/common/enums/NotificationType.java)
  - Added types: `PROFILE_SUBMITTED`, `PROFILE_APPROVED`, `PROFILE_CHANGES_REQUESTED`, `COMPANY_SUBMITTED`, `DRIVE_PUBLISHED`, `DRIVE_CLOSED`, `APPLICATION_SUBMITTED`, `APPLICATION_WITHDRAWN`, `APPLICATION_SELECTED`, `APPLICATION_REJECTED`, `RESUME_PROCESSED`, `RESUME_FAILED`, `SECURITY_ALERT`.
- **Modified:** [`backend/src/main/java/com/placementsetu/common/enums/NotificationStatus.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/common/enums/NotificationStatus.java)
  - Added `SKIPPED`.
- **Modified:** [`backend/src/main/java/com/placementsetu/notification/entity/Notification.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/entity/Notification.java)
  - Added `message`, `isRead`, `readAt`, and `idempotencyKey` mappings.
- **Created:** [`backend/src/main/java/com/placementsetu/notification/entity/EmailOutbox.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/entity/EmailOutbox.java)
  - Full entity mapping for outbox records with auditing listeners.

### 2.3 Repositories
- **Modified:** [`backend/src/main/java/com/placementsetu/notification/repository/NotificationRepository.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/repository/NotificationRepository.java)
  - Added `findByRecipientUserId(UUID, Pageable)`, `findByRecipientUserIdAndIsRead(UUID, boolean, Pageable)`, `findByIdAndRecipientUserId(UUID, UUID)`, `countByRecipientUserIdAndIsReadFalse(UUID)`, and `existsByRecipientUserIdAndIdempotencyKey(UUID, String)`.
- **Created:** [`backend/src/main/java/com/placementsetu/notification/repository/EmailOutboxRepository.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/repository/EmailOutboxRepository.java)
  - Added `findDueRecords(String status, LocalDateTime cutoffTime, Pageable)` and idempotency check.
- **Modified:** [`backend/src/main/java/com/placementsetu/user/repository/UserRepository.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/user/repository/UserRepository.java)
  - Added `findByRole(UserRole)`.

### 2.4 DTOs
- **Created:** [`backend/src/main/java/com/placementsetu/notification/dto/NotificationResponseDto.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/dto/NotificationResponseDto.java)
- **Created:** [`backend/src/main/java/com/placementsetu/notification/dto/PagedNotificationResponse.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/dto/PagedNotificationResponse.java)

### 2.5 Services & Internal Workers
- **Created:** [`backend/src/main/java/com/placementsetu/notification/service/NotificationService.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/NotificationService.java)
- **Created:** [`backend/src/main/java/com/placementsetu/notification/service/impl/NotificationServiceImpl.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/impl/NotificationServiceImpl.java)
- **Created:** [`backend/src/main/java/com/placementsetu/notification/service/EmailTemplateService.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/EmailTemplateService.java)
- **Created:** [`backend/src/main/java/com/placementsetu/notification/service/EmailAgentService.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/EmailAgentService.java)
- **Created:** [`backend/src/main/java/com/placementsetu/notification/service/EmailOutboxDispatcher.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/EmailOutboxDispatcher.java)

### 2.6 REST Controllers
- **Created:** [`backend/src/main/java/com/placementsetu/notification/controller/NotificationController.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/controller/NotificationController.java)

### 2.7 Application Configuration & Build
- **Modified:** [`backend/pom.xml`](file:///e:/Placement-Setu/backend/pom.xml)
  - Added `spring-boot-starter-mail`.
- **Modified:** [`backend/src/main/resources/application.yml`](file:///e:/Placement-Setu/backend/src/main/resources/application.yml)
  - Added `spring.mail.*` and `app.mail.*` configuration.
- **Modified:** [`backend/src/main/java/com/placementsetu/PlacementSetuApplication.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/PlacementSetuApplication.java)
  - Added `@EnableScheduling`.

### 2.8 Workflow Event Wiring
- **Modified:** [`backend/src/main/java/com/placementsetu/auth/service/impl/AuthServiceImpl.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/auth/service/impl/AuthServiceImpl.java)
  - Wires `COMPANY_SUBMITTED` notification to officers/admins on company registration.
- **Modified:** [`backend/src/main/java/com/placementsetu/approval/CompanyApprovalController.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/approval/CompanyApprovalController.java)
  - Wires `COMPANY_APPROVED` and `COMPANY_REJECTED` in-app notifications and emails.
- **Modified:** [`backend/src/main/java/com/placementsetu/resume/service/ResumeService.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/resume/service/ResumeService.java)
  - Wires `RESUME_PROCESSED` and `RESUME_FAILED` in-app notifications and emails.
- **Modified:** [`backend/src/main/java/com/placementsetu/placement/service/impl/PlacementDriveServiceImpl.java`](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/placement/service/impl/PlacementDriveServiceImpl.java)
  - Wires `DRIVE_PUBLISHED` and `DRIVE_CLOSED` notifications.

### 2.9 Frontend Components & Client
- **Modified:** [`frontend/src/lib/api.js`](file:///e:/Placement-Setu/frontend/src/lib/api.js)
  - Added `api.notifications.getNotifications` and `api.notifications.markAsRead`.
- **Created:** [`frontend/src/components/notifications/NotificationBell.jsx`](file:///e:/Placement-Setu/frontend/src/components/notifications/NotificationBell.jsx)
  - Notification bell with unread badge, interactive popover feed, relative timestamp formatting, unread filter toggle, and mark-as-read action.
- **Modified:** [`frontend/src/components/layout/Header.jsx`](file:///e:/Placement-Setu/frontend/src/components/layout/Header.jsx)
  - Embedded `NotificationBell` in authenticated navigation actions.
- **Modified:** [`frontend/src/index.css`](file:///e:/Placement-Setu/frontend/src/index.css)
  - Added styling rules for notification bell, items, and scrollbar.

### 2.10 Documentation
- **Created:** [`docs/NOTIFICATION_EMAIL_AUDIT.md`](file:///e:/Placement-Setu/docs/NOTIFICATION_EMAIL_AUDIT.md)
- **Created:** [`docs/NOTIFICATION_EMAIL_IMPLEMENTATION_PLAN.md`](file:///e:/Placement-Setu/docs/NOTIFICATION_EMAIL_IMPLEMENTATION_PLAN.md)
- **Created:** [`docs/NOTIFICATION_EMAIL_MANUAL_TEST_GUIDE.md`](file:///e:/Placement-Setu/docs/NOTIFICATION_EMAIL_MANUAL_TEST_GUIDE.md)
- **Created:** [`docs/NOTIFICATION_EMAIL_IMPLEMENTATION_REPORT.md`](file:///e:/Placement-Setu/docs/NOTIFICATION_EMAIL_IMPLEMENTATION_REPORT.md)
- **Modified:** [`RUN.md`](file:///e:/Placement-Setu/RUN.md)

---

## 3. Endpoints Implemented

| Method | Route | Security | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications?page=0&size=20&unread=true` | `isAuthenticated()` | Fetches authenticated user's notifications. Identity is resolved strictly from `SecurityContext`. Supports pagination, sorting, and unread filtering. |
| `PATCH` | `/api/v1/notifications/{notificationId}/read` | `isAuthenticated()` | Marks a specific notification as read. Enforces strict ownership check; unauthorized access returns HTTP 404. |

---

## 4. Event-to-Recipient Matrix Actually Wired

| Business Event | Trigger Location | In-App Recipient | Email Recipient | Template & Content |
| :--- | :--- | :--- | :--- | :--- |
| **Company Submitted** | `AuthServiceImpl.registerCompany` | Placement Officers & Admins | Placement Officers & Admins | Informs administration that a new recruiter has registered and requires verification. |
| **Company Approved** | `CompanyApprovalController.approve` | Company Account | Company Contact Email | Congratulates recruiter, confirms account activation, and provides portal login link. |
| **Company Rejected** | `CompanyApprovalController.reject` | Company Account | Company Contact Email | Communicates decision with reviewer notes and guidance. |
| **Resume Processed** | `ResumeService.uploadAndParse` | Student | Student Email | Notifies student that extraction completed; indicates if manual review is needed. |
| **Resume Processing Failed** | `ResumeService.uploadAndParse` | Student | Student Email | Explains parsing error and provides retry guidance for valid PDF/DOCX files. |
| **Drive Published** | `PlacementDriveServiceImpl.publishDrive` | Company & All Students | Role broadcast | Alerts students that a new drive is live and prompts them to check eligibility. |
| **Drive Closed** | `PlacementDriveServiceImpl.closeDrive` | Company Account | Company Account | Confirms application window closure and transition to evaluation. |

---

## 5. Email Agent Design & Delivery Behavior

1. **Transactional Outbox:**
   - Invocations of `notifyCompanyApproved`, `notifyResumeProcessed`, etc. persist both the in-app `Notification` and an `EmailOutbox` record inside the active transaction. If the transaction rolls back, no email is queued.
2. **Asynchronous Polling Worker:**
   - `EmailOutboxDispatcher` runs on a scheduled interval (default 5,000ms), claiming pending due records (`status = 'PENDING'` and `next_retry_at <= now()`).
3. **Development / Safe Mode:**
   - When `app.mail.enabled: false`, outbox records are marked `SKIPPED` with a clear explanation. The system never falsely reports skipped emails as `SENT`.
4. **Retry Mechanism & Backoff:**
   - Configurable max retries (default 3).
   - Transient failures apply exponential backoff + random jitter (`baseDelay * 2^(attempt-1) + jitter`).
   - Permanent errors (e.g. invalid recipient syntax) immediately transition to `FAILED` without endless retries.
5. **Security & Privacy:**
   - Recipient emails are masked in application logs (`j***@example.com`).
   - Passwords and secret values are scrubbed from error logs.
   - All dynamic template placeholders are strictly escaped with `HtmlUtils.htmlEscape`.

---

## 6. Configuration Keys & Local Setup

Configure these via environment variables or in `application.yml`:

```properties
# Toggle real SMTP delivery vs. development sandbox simulation
MAIL_ENABLED=false

# SMTP Server details (e.g. Mailpit for local testing)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@placementsetu.gujaratvidyapith.edu
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS=false

# Dispatcher Tuning
MAIL_MAX_RETRIES=3
MAIL_POLL_INTERVAL_MS=5000
MAIL_BASE_RETRY_DELAY=30
APP_BASE_URL=http://localhost:5173
```

---

## 7. Known Gaps & Unresolved Workflow Ambiguity

### Shortlist Approval Workflow Discrepancy
- **Document Discrepancy:** The *Workflow Reference* document mentions Placement Officer review of shortlisted candidates before student notification. Conversely, *API Reference v2.0 Section 29* explicitly states there is **no separate Placement Officer shortlist approval endpoint** in the approved API design; companies finalize the shortlist directly.
- **Resolution:** In strict compliance with prompt constraints, no synthetic approval endpoint was created. Only workflows supported by the current codebase (`DRAFT` → `PUBLISHED` → `CLOSED`) were wired. The officer shortlist review remains an open product policy question.

---

## 8. Verification Confirmation

> **Explicit Confirmation:**  
> I did not run tests, lint, build, application startup, migrations, live API calls, or SMTP delivery. The user will perform manual testing according to `docs/NOTIFICATION_EMAIL_MANUAL_TEST_GUIDE.md`.
