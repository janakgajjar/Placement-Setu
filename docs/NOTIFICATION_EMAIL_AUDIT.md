# Placement Setu: Notification Service & Email Agent Audit

**Date:** October 2026  
**Auditor:** Senior Backend Engineer (Placement Setu)  
**Scope:** Current codebase inspection against API Reference v2.0 Section 18, System Architecture, and Workflow Reference documents.

---

## 1. Executive Summary

Placement Setu requires a production-grade, reliable, and user-scoped in-app notification system and an internal, outbox-driven Email Agent. A thorough audit of the active Spring Boot 3.2.5 backend and React 18 frontend reveals the foundational database tables and entity skeletons exist, but the notification service layer, REST endpoints, email dispatching mechanism, transactional outbox, and frontend consumption components are missing or incomplete.

This audit documents the current state, identifies critical gaps, resolves discrepancies between the API specification and workflow documents, and outlines the precise migration and architectural pathway to achieve production readiness without introducing heavy external infrastructure (such as Kafka, RabbitMQ, or Redis).

---

## 2. Source Code Audit & Current State

### 2.1 Backend Package Structure & Existing Classes

| Package / File | Existing State | Findings & Gaps |
| :--- | :--- | :--- |
| `com.placementsetu.notification.entity.Notification` | Minimal entity with `id`, `recipientUserId`, `type`, `subject`, `status`, `sentAt`, `failureReason`, `relatedEntityType`, `relatedEntityId`. | **Gaps:** Missing `isRead` (or `is_read`), `readAt`, `message` (notification body), and `idempotencyKey`. It treats notifications purely as delivery logs rather than an interactive in-app user feed. |
| `com.placementsetu.notification.repository.NotificationRepository` | Interface extends `JpaRepository<Notification, UUID>`. Contains only `List<Notification> findByRecipientUserId(UUID recipientUserId)`. | **Gaps:** Lacks pagination (`Pageable`), unread filtering (`findByRecipientUserIdAndIsRead`), sorting, and existence/idempotency checks. |
| `com.placementsetu.common.enums.NotificationType` | Enum with values: `PROFILE_INCOMPLETE`, `COMPANY_APPROVED`, `COMPANY_REJECTED`, `DRIVE_APPROVED`, `DRIVE_REJECTED`, `SHORTLIST_APPROVED`, `INTERVIEW_SCHEDULED`, `GENERAL`. | **Adequacy:** Covers major business states. Can be expanded for `PROFILE_SUBMITTED`, `PROFILE_APPROVED`, `PROFILE_CHANGES_REQUESTED`, `COMPANY_SUBMITTED`, `APPLICATION_SUBMITTED`, `APPLICATION_WITHDRAWN`, `APPLICATION_SELECTED`, `APPLICATION_REJECTED`, `RESUME_PROCESSED`, `RESUME_FAILED`. |
| `com.placementsetu.common.enums.NotificationStatus` | Enum: `PENDING`, `SENT`, `FAILED`. | **Adequacy:** Needs `SKIPPED` status for local development or disabled mail mode. |
| `com.placementsetu.notification.service.*` | **Non-existent.** | No service exists to create, query, mark read, or manage notifications. |
| `com.placementsetu.notification.controller.*` | **Non-existent.** | No controller exists for `/api/v1/notifications`. |
| `com.placementsetu.notification.dto.*` | **Non-existent.** | No response/request DTOs exist. Entities must never be returned directly. |
| Mail Configuration | `pom.xml` lacks `spring-boot-starter-mail`. `application.yml` has no `spring.mail` or `app.mail` properties. | Missing mail starter, credentials configuration, and local sandbox toggles. |

### 2.2 Database Migrations (Flyway)

- **`V1__placement_setu_schema.sql`**:
  Contains the initial table definition:
  ```sql
  CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      sent_at TIMESTAMPTZ,
      failure_reason TEXT,
      related_entity_type VARCHAR(50),
      related_entity_id UUID,
      created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- **`V2__security_audit_fixes.sql`** & **`V3__add_drive_status_draft_published.sql`**:
  Handle audit fixes and drive lifecycle.
- **Migration Need (Flyway V4):**
  A migration script `V4__notification_and_email_outbox.sql` is required to:
  1. Add `is_read BOOLEAN NOT NULL DEFAULT FALSE`, `read_at TIMESTAMPTZ`, `message TEXT`, and `idempotency_key VARCHAR(255)` to `notifications`.
  2. Create an `email_outbox` table for durable email queueing and bounded retries.
  3. Establish indexes on `notifications(recipient_user_id, is_read, created_at)` and `email_outbox(status, next_retry_at)`.

### 2.3 Frontend Notification UI & Client

- **`frontend/src/lib/api.js`**: Lacks notification endpoints (`getNotifications`, `markAsRead`).
- **`frontend/src/components/layout/Header.jsx`**: Displays role badges and navigation, but has no notification bell, unread count badge, or notification dropdown/popover.
- **Frontend State**: Real token handling (`localStorage.getItem('token')`) and role switching are present; notifications must seamlessly integrate into the authenticated header.

---

## 3. Discrepancies & Architecture Decisions

### 3.1 Company Shortlist Workflow Discrepancy
- **Reference Doc Conflict:**
  - *Workflow Reference Document* mentions an administrative Placement Officer review step for company shortlists before students are notified.
  - *API Reference v2.0 Section 29* explicitly states: there is **no separate Placement Officer shortlist approval endpoint** in the API design. The company submits/finalizes the shortlist, which directly transitions applicant status to shortlisted/interview-scheduled.
  - *Current Codebase:* `com.placementsetu.drives.entity.PlacementDrive` supports `DRAFT`, `PUBLISHED`, `CLOSED`. No intermediary officer shortlist approval endpoint exists in the controllers.
- **Resolution:**
  In accordance with Rule 2 (Live repository is implementation source of truth) and Rule 3 (Workflow constraint), we will:
  1. Not invent or fake an unapproved officer shortlist approval endpoint.
  2. Implement notifications for workflows that actually exist: Drive publication, Drive closure, Company registration approval/rejection, Resume parsing complete/failed, and Profile validation.
  3. Flag the shortlist officer review step as an open product policy question.

### 3.2 Public API vs. Email Agent Boundary
- **Rule Enforcement:**
  - Absolute Rule 8 strictly dictates: **Do NOT expose a public Email Agent API.**
  - The frontend communicates only with the notification service via `/api/v1/notifications`.
  - Email dispatch is completely internal, triggered by transactional domain events via an `email_outbox` table.

### 3.3 Reliability & Transactional Integrity
- **Transactional Outbox Pattern:**
  - Direct synchronous SMTP delivery inside business transactions is strictly prohibited. SMTP timeouts or connection errors would roll back valid business actions (such as student applications or officer approvals).
  - Using `@Async` alone is insufficient because application restarts or unhandled errors would silently drop emails.
  - An `email_outbox` table guarantees delivery persistence. Business mutations commit the domain state, the in-app `Notification`, and the `EmailOutbox` record in the **same local database transaction**.
  - A scheduled Spring background worker claims pending outbox records, attempts delivery with bounded exponential backoff and jitter, and marks rows as `SENT`, `FAILED`, or `SKIPPED`.

---

## 4. Summary of Gaps & Actions

1. **Database:** Create `V4__notification_and_email_outbox.sql` with schema additions and the `email_outbox` table.
2. **Dependencies:** Add `spring-boot-starter-mail` to `backend/pom.xml`.
3. **Configuration:** Add `app.mail.*` configuration keys to `application.yml` supporting enabled toggle, SMTP details, retry limits, and dev-mode fallback.
4. **Entities & Repositories:** Update `Notification.java` and create `EmailOutbox.java`, `NotificationRepository.java`, and `EmailOutboxRepository.java`.
5. **Services & Templates:** Create `NotificationService`, `EmailAgentService`, `EmailTemplateService` (with HTML escaping and Gujarat Vidyapith branding), and `EmailOutboxDispatcher`.
6. **Controllers & DTOs:** Create `NotificationController` implementing `GET /api/v1/notifications` and `PATCH /api/v1/notifications/{id}/read` with strictly typed DTOs.
7. **Workflow Integration:** Wire domain events in `AuthServiceImpl`, `CompanyApprovalController`, `ResumeService`, and `PlacementDriveServiceImpl`.
8. **Frontend:** Add API methods in `api.js` and an accessible, responsive Notification Bell with dropdown popover in `Header.jsx`.
