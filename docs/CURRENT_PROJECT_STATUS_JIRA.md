# Placement Setu — Current Project Status 

**Project:** Placement Setu (Gujarat Vidyapith Campus Placement Platform)  
**Architecture:** Spring Boot 3.2.5 Modular Monolith + React 18 / Vite + PostgreSQL  
**Current Milestone:** Sprint 1 & Sprint 2 Core Foundation & Production Readiness  

---

## 1. Project Overview & Team Structure

### 3-Member Engineering Team Allocation:
| Team Member | Primary Role | Domain Ownership |
| :--- | :--- | :--- |
| **Developer 1 (Dev-1)** | **Senior Backend & Security Lead** | Architecture, Spring Security/JWT, Database Schema/Flyway, Security Hardening, Notification Service, Email Outbox & Scheduled Dispatcher. |
| **Developer 2 (Dev-2)** | **Backend & AI Integration Engineer** | Resume Parsing Engine, Gemini AI Integration, Student Profile & Company Workflow Services, Placement Drive Lifecycle, Domain Event Triggers. |
| **Developer 3 (Dev-3)** | **Frontend & API Integration Lead** | React 18 + Vite Single Page Application, Responsive Institutional UI, Role-Based Routing, Dashboard Views, Header & Notification Bell Integration. |

---

## 2. Sprint Status & Velocity Summary

```
Total Epics:            8
Total User Stories:     26
Completed Stories:      23 (DONE)
In-Progress / Planned:  3 (Future Sprints / Policy Decisions)
Total Story Points:     115 SP
Completed Points:       104 SP (90.4% Completed)
```

---

## 3. Module-wise Jira Epics & User Stories

### EPIC-01: Authentication, RBAC & Core Architecture
*Owner: Dev-1 (Senior Backend & Security Lead)*

#### [PS-101] Stateless JWT Authentication & Refresh Mechanism
- **Assignee:** Dev-1
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a platform user (Student/Company/Officer/Admin), I want to authenticate using my email and password and receive secure JWT tokens so that I can access protected endpoints statelessly.*
- **Definition of Done (DoD):**
  - [x] Secure password hashing using BCrypt (cost factor 10+).
  - [x] Stateless JWT generation (15 min access token, 7 days refresh token).
  - [x] `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` implemented.
  - [x] Passwords never logged, returned in DTOs, or stored in plain-text.
  - [x] Verified via `CustomUserDetails` and `JwtAuthFilter`.

#### [PS-102] Multi-Role Authorization & Route Guarding (RBAC)
- **Assignee:** Dev-1
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a system administrator, I want role-based access control (STUDENT, COMPANY, PLACEMENT_OFFICER, ADMIN) enforced at both HTTP and method levels so that users cannot access unauthorized resources.*
- **Definition of Done (DoD):**
  - [x] PostgreSQL enum `user_role` mapped directly in `SecurityConfig`.
  - [x] Method security enabled (`@EnableMethodSecurity`, `@PreAuthorize`).
  - [x] Spring Security filter chain with 401 Unauthorized and 403 Forbidden envelopes.
  - [x] Frontend route guards preventing cross-role navigation.

---

### EPIC-02: Student Profile Management & Validation
*Owner: Dev-2 (Backend & AI Integration) & Dev-3 (Frontend)*

#### [PS-201] Student Profile Registration & Mandatory Academic Details
- **Assignee:** Dev-2
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a Gujarat Vidyapith student, I want to register and maintain my academic details (course, graduation year, CGPA, backlogs, APAAR ID) so that recruiters can review my qualifications.*
- **Definition of Done (DoD):**
  - [x] `StudentProfile` entity with 1-to-1 mapping to `users`.
  - [x] `GET /api/v1/students/me` and `PUT /api/v1/students/me` implemented.
  - [x] Academic validation rules (CGPA 0.0–10.0, backlogs >= 0).
  - [x] Profile status computation (`INCOMPLETE` vs `COMPLETE`).

#### [PS-202] Recruiter Visibility Toggle (`visibleToCompanies`)
- **Assignee:** Dev-2
- **Story Points:** 3
- **Priority:** Medium
- **Status:** `DONE`
- **User Story:** *As a student, I want my profile to only become visible to recruiters after all mandatory fields and resume parsing are complete so that recruiters only evaluate finalized profiles.*
- **Definition of Done (DoD):**
  - [x] `visibleToCompanies` flag calculated automatically.
  - [x] Recruiter applicant queries enforce `visible_to_companies = true`.
  - [x] Incomplete profile reason list returned in student dashboard.

#### [PS-203] Student Profile UI & Academic Data Management
- **Assignee:** Dev-3
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a student, I want an accessible and responsive profile page to edit my details, view missing fields, and track completion progress.*
- **Definition of Done (DoD):**
  - [x] Responsive React form with input validation and feedback alerts.
  - [x] Visual badge displaying profile completeness.
  - [x] Integration with `api.students.getProfile` and `updateProfile`.

---

### EPIC-03: Resume Parsing & AI Intelligence
*Owner: Dev-2 (Backend & AI Integration)*

#### [PS-301] Secure Resume Upload & Multi-Format Text Extraction
- **Assignee:** Dev-2
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a student, I want to upload my resume in PDF, DOCX, or TXT format (up to 10MB) so that the platform can extract my professional background.*
- **Definition of Done (DoD):**
  - [x] Multipart file upload endpoint `POST /api/v1/resumes/me` with 10MB limit.
  - [x] Whitelist extension and MIME type validation (`.pdf`, `.docx`, `.txt`).
  - [x] File path traversal guard preventing directory escape.
  - [x] Apache PDFBox & Apache POI text extraction pipeline.

#### [PS-302] Google Gemini AI Resume Parsing & Profile Auto-Fill
- **Assignee:** Dev-2
- **Story Points:** 8
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a student, I want AI to automatically extract my skills, GitHub, LinkedIn, and projects from my resume so that I don't have to re-enter them manually.*
- **Definition of Done (DoD):**
  - [x] Gemini API integration with structured JSON extraction prompt.
  - [x] Auto-population of skills into `skills` and `student_skills` tables.
  - [x] Safe fallback: if AI service is unavailable, raw file remains stored.
  - [x] AI test controller secured with `@PreAuthorize("hasRole('ADMIN')")`.

#### [PS-303] Resume Batch Processing & Background Async Upload Engine
- **Assignee:** Dev-2
- **Story Points:** 8
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a student and placement officer, I want resumes processed asynchronously in background workers and in batches with automated notifications so that the UI never blocks and bulk uploads are streamlined.*
- **Definition of Done (DoD):**
  - [x] Migration `V5__resume_batch_processing_and_policies.sql` creating `resume_batch_jobs` and `resume_batch_items`.
  - [x] `POST /api/v1/resumes/me/async`: returns HTTP 202 Accepted, executes text extract + Gemini AI in background.
  - [x] `POST /api/v1/resumes/batch`: accepts multi-part resume arrays (up to 50 files), tracks live progress.
  - [x] `GET /api/v1/resumes/batch/{batchId}`: retrieves status, counts, and per-item results.
  - [x] Automated in-app and email notification on async/batch completion via `NotificationService`.

---

### EPIC-04: Recruiter & Company Onboarding Workflow
*Owner: Dev-1 (Backend) & Dev-3 (Frontend)*

#### [PS-401] Recruiter Registration & Admin Approval Queue
- **Assignee:** Dev-1
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a company recruiter, I want to register my company so that Placement Officers can review and approve our credentials before we post placement drives.*
- **Definition of Done (DoD):**
  - [x] `POST /api/v1/auth/register/company` creates account in `PENDING` state.
  - [x] Unapproved companies are strictly blocked from logging in to recruitment features.
  - [x] Placement Officer/Admin endpoints `GET /api/v1/admin/companies/pending`.
  - [x] Endpoints `POST .../{id}/approve` and `POST .../{id}/reject`.

#### [PS-402] Officer Approval Dashboard & Management UI
- **Assignee:** Dev-3
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a Placement Officer, I want an approvals dashboard to review company GSTIN, contact details, and approve or reject recruiters with a single click.*
- **Definition of Done (DoD):**
  - [x] Dedicated "Approvals Queue" tab in officer portal.
  - [x] Real-time approve/reject actions with loading spinners and feedback.
  - [x] Filter by status (PENDING, ACTIVE, REJECTED).

---

### EPIC-05: Placement Drive Lifecycle Management
*Owner: Dev-2 (Backend) & Dev-3 (Frontend)*

#### [PS-501] Company-Managed Drive Lifecycle (DRAFT -> PUBLISHED -> CLOSED)
- **Assignee:** Dev-2
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a verified recruiter, I want to create placement drives in DRAFT, define eligibility criteria, publish them when ready, and close them after deadlines.*
- **Definition of Done (DoD):**
  - [x] Flyway migration `V3__add_drive_status_draft_published.sql`.
  - [x] CRUD operations: `POST`, `GET`, `PUT /api/v1/companies/me/drives`.
  - [x] State transition endpoints: `/publish` and `/close`.
  - [x] Validation: Only DRAFT drives can be updated or published.

#### [PS-502] Drive Publishing UI & Student Application Explorer
- **Assignee:** Dev-3
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a recruiter and student, I want dedicated screens to post jobs, review job openings, and check applicant lists.*
- **Definition of Done (DoD):**
  - [x] Recruiter "Post Drive" form with eligibility thresholds (CGPA, Course, Year).
  - [x] Student "Placement Drives" explorer with search and filter.
  - [x] Status indicators for DRAFT, PUBLISHED, and CLOSED drives.

#### [PS-503] Institutional Placement Policy & Rules Engine
- **Assignee:** Dev-2
- **Story Points:** 8
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a Placement Cell, I want automated enforcement of "One Student One Job", Dream Offers, mandatory minimum stipend for paid internships (>= ₹10,000/mo), age limits, and shortlist ranking rules.*
- **Definition of Done (DoD):**
  - [x] Service `PlacementPolicyService` created and integrated with drive creation and applicant screening.
  - [x] Schema extensions in `V5` for `date_of_birth`, `drive_type`, `stipend`, `maximum_age`, and `is_dream_offer`.
  - [x] Automatic validation of minimum ₹10,000/month stipend on paid internships.
  - [x] Age limit enforcement dynamically computed from candidate Date of Birth.
  - [x] Comprehensive institutional policy documented in `docs/CAMPUS_PLACEMENT_RULES_AND_POLICIES.md`.

---

### EPIC-06: In-App Notification Service & Email Agent
*Owner: Dev-1 (Senior Backend Lead)*

#### [PS-601] User-Scoped In-App Notification REST API
- **Assignee:** Dev-1
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As an authenticated user, I want to receive and view my notifications with unread filtering, pagination, and mark-as-read actions so that I am alerted to critical placement updates.*
- **Definition of Done (DoD):**
  - [x] Flyway migration `V4__notification_and_email_outbox.sql` with `is_read`, `read_at`, `message`.
  - [x] `GET /api/v1/notifications?page=0&size=20&unread=true` scoped to `SecurityContext`.
  - [x] `PATCH /api/v1/notifications/{id}/read` with strict user ownership validation.
  - [x] DTO boundary: JPA entities are never leaked to controllers.

#### [PS-602] Transactional Outbox Pattern & Scheduled Email Dispatcher
- **Assignee:** Dev-1
- **Story Points:** 8
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a backend system, I want to decouple business transactions from SMTP network calls using an outbox table and scheduled worker so that email delivery failures never roll back core business actions.*
- **Definition of Done (DoD):**
  - [x] Table `email_outbox` created with retry counts, status, and error logs.
  - [x] Atomic commit: Business entity mutation + outbox record save in single local transaction.
  - [x] Scheduled background worker `EmailOutboxDispatcher` polling every 5s.
  - [x] Bounded exponential backoff with jitter (max 3 retries).
  - [x] Development mode: `app.mail.enabled: false` records status as `SKIPPED`.
  - [x] Recipient email masking in logs (`j***e@domain.com`).

#### [PS-603] Deterministic Email Templates & Domain Event Wiring
- **Assignee:** Dev-1 & Dev-2
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a user, I want clear, branded HTML and text emails for company approval/rejection, drive publishing, and resume parsing with zero HTML injection vulnerabilities.*
- **Definition of Done (DoD):**
  - [x] `EmailTemplateService` with Gujarat Vidyapith branding.
  - [x] Strict escaping of all dynamic values with `HtmlUtils.htmlEscape`.
  - [x] Domain events wired: Company Registration, Approval/Rejection, Resume Parse Complete/Failed, Drive Publish/Close.

#### [PS-604] Frontend Notification Bell & Popover Feed
- **Assignee:** Dev-3
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As an authenticated user, I want a notification bell in the navigation bar with an unread badge counter and popover list so that I can see and clear notifications without leaving the page.*
- **Definition of Done (DoD):**
  - [x] `NotificationBell.jsx` integrated into `Header.jsx`.
  - [x] Dynamic unread count badge (shows 99+ on overflow).
  - [x] Interactive dropdown with relative timestamps ("Just now", "5m ago").
  - [x] "Unread only" filter toggle and instant optimistic "Mark read" button.
  - [x] Keyboard accessible (Escape key to close, outside-click detection).

---

### EPIC-07: Security Hardening & Penetration Defense
*Owner: Dev-1 (Senior Backend & Security Lead)*

#### [PS-701] 20-Point Security Hardening & Rate Limiting Defense
- **Assignee:** Dev-1
- **Story Points:** 8
- **Priority:** Critical
- **Status:** `DONE`
- **User Story:** *As a system administrator, I want comprehensive protection against SQLi, XSS, CSRF, IDOR, brute-force auth attacks, and upload exploits so that institutional student data is secure.*
- **Definition of Done (DoD):**
  - [x] `RateLimitingFilter`: 10 req/min for auth endpoints, 5 req/min for resume uploads.
  - [x] Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
  - [x] Safe CORS configuration with credentials whitelist.
  - [x] Vite production source maps disabled (`build: { sourcemap: false }`).
  - [x] Comprehensive 20-point audit documented in `docs/SECURITY_AUDIT_REPORT.md`.

#### [PS-702] Universal Multi-Tier Rate Limiting Across Every API Request
- **Assignee:** Dev-1
- **Story Points:** 5
- **Priority:** Critical
- **Status:** `DONE`
- **User Story:** *As a security officer, I want universal rate limiting applied to every single request on the platform with tiered thresholds for auth, upload, and mutations to safeguard institutional infrastructure.*
- **Definition of Done (DoD):**
  - [x] Universal `RateLimitingFilter` upgraded to throttle every request under `/api/v1/*`.
  - [x] Tier 1: Global per-IP rate limit of 120 req/minute across all endpoints.
  - [x] Tier 2: Specific throttles (15 req/min for auth, 5 req/min for resumes, 40 req/min for mutations).
  - [x] Informative HTTP headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After: 60`).
  - [x] Safe sliding-window eviction preventing in-memory unbounded growth.

---

### EPIC-08: Policy & Architecture Visualization
*Owner: Dev-1, Dev-2 & Dev-3*

#### [PS-804] Visual Architecture Pipelines & Mermaid Workflow Charts
- **Assignee:** Dev-1 & Dev-3
- **Story Points:** 5
- **Priority:** High
- **Status:** `DONE`
- **User Story:** *As a developer and stakeholder, I want clear visual architecture pipeline charts detailing the placement lifecycle, async background processing, rate limits, and policy evaluation.*
- **Definition of Done (DoD):**
  - [x] Documented in `docs/PROJECT_PIPELINES_AND_WORKFLOWS.md`.
  - [x] Rich Mermaid charts for end-to-end placement, background async resume ingestion, rate limits, and policy engine.

#### [PS-801] Placement Officer Shortlist Approval Workflow (Policy Alignment)
- **Assignee:** Dev-2
- **Story Points:** 5
- **Priority:** Medium
- **Status:** `BLOCKED / PENDING PRODUCT DECISION`
- **User Story:** *As a Placement Officer, I want to review candidate shortlists before students are notified if institutional policy mandates administrative approval.*
- **Reason:** API Reference v2.0 Section 29 states companies finalize shortlists directly without intermediary officer approval. Awaiting institutional stakeholder signoff.

#### [PS-802] Bulk Student Application Export & CSV Generator
- **Assignee:** Dev-2
- **Story Points:** 3
- **Priority:** Low
- **Status:** `BACKLOG`
- **User Story:** *As a Placement Officer, I want to export applicant lists to CSV/Excel for external reporting.*

#### [PS-803] Real-time Push Notifications (WebSocket / STOMP)
- **Assignee:** Dev-1 & Dev-3
- **Story Points:** 5
- **Priority:** Low
- **Status:** `BACKLOG`
- **User Story:** *As an active user, I want instant push notifications over WebSockets instead of 60-second polling.*

---

## 4. Current Work Distribution & Assignment Matrix (By Team Member)

### Developer 1: Backend Architecture & Security Lead
- **Total Points Owned:** 44 SP
- **Completed Points:** 44 SP (100% On-Track)
- **Stories Delivered:**
  - `PS-101`: Stateless JWT Authentication & Refresh (`DONE`)
  - `PS-102`: Multi-Role RBAC & Method Security (`DONE`)
  - `PS-401`: Recruiter Registration & Admin Approval Backend (`DONE`)
  - `PS-601`: User-Scoped In-App Notification REST API (`DONE`)
  - `PS-602`: Transactional Outbox & Scheduled Email Dispatcher (`DONE`)
  - `PS-701`: 20-Point Security Hardening & Rate Limiter (`DONE`)
  - `PS-702`: Universal Multi-Tier Rate Limiting (`DONE`)
  - `PS-804`: Visual Architecture Pipelines & Security Charts (`DONE`)

### Developer 2: Backend & AI Integration Engineer
- **Total Points Owned:** 44 SP
- **Completed Points:** 39 SP (5 SP Blocked/Policy)
- **Stories Delivered:**
  - `PS-201`: Student Profile & Academic Validation (`DONE`)
  - `PS-202`: Recruiter Visibility Logic (`DONE`)
  - `PS-301`: Secure Multi-Format Resume Upload Pipeline (`DONE`)
  - `PS-302`: Gemini AI Parser & Profile Auto-Fill (`DONE`)
  - `PS-303`: Resume Batch Processing & Background Async Upload Engine (`DONE`)
  - `PS-501`: Company Drive Lifecycle (`DONE`)
  - `PS-503`: Institutional Placement Policy & Rules Engine (`DONE`)
  - `PS-603`: Domain Event Triggers (`DONE`)
  - `PS-801`: Officer Shortlist Approval (`BLOCKED`)

### Developer 3: Frontend Lead & API Integration
- **Total Points Owned:** 27 SP
- **Completed Points:** 27 SP (100% On-Track)
- **Stories Delivered:**
  - `PS-203`: Student Profile UI & Academic Data Management (`DONE`)
  - `PS-402`: Officer Approvals & Company Review UI (`DONE`)
  - `PS-502`: Drive Posting & Student Explorer Views (`DONE`)
  - `PS-604`: Notification Bell, Badge & Popover Feed (`DONE`)
  - `PS-804`: Pipeline UX Integration (`DONE`)
  - Full React 18 + Vite responsive design system & navigation (`DONE`)

---

## 5. Universal Definition of Done (DoD) Checklist for Placement Setu

For any User Story to transition from `IN PROGRESS` to `DONE`, it must meet this rigorous criteria:

1. **Architecture & Standards:**
   - Follows Spring Boot modular monolith; no new external infrastructure (e.g., Redis, Kafka) added without architectural review.
   - Thin controllers, business logic encapsulated in services, strict DTO boundaries (JPA entities are never returned directly from controllers).
2. **Database & Schema Integrity:**
   - Schema modifications are managed exclusively via versioned Flyway migrations (`V1` to `V4`). No manual database changes.
   - Idempotency keys used where duplicated requests could trigger redundant records.
3. **Security & Data Protection:**
   - All endpoints enforce authentication and `@PreAuthorize` role rules.
   - OWASP safeguards verified: SQL injection protection (JPA parameterized queries), XSS escaping (`HtmlUtils.htmlEscape`), path traversal guards, and in-memory rate limiting.
   - No credentials, JWT secrets, SMTP passwords, or sensitive PII hardcoded or exposed in logs.
4. **Decoupling & Non-Blocking Design:**
   - External dependencies (AI parsing, SMTP mail delivery) are fault-tolerant. Network timeouts or SMTP crashes never fail the primary database transaction.
5. **Frontend UX & Accessibility:**
   - Responsive UI tested across desktop, tablet, and mobile breakpoints.
   - Screen-reader labels (`aria-label`, `aria-expanded`), keyboard navigation (Escape to close modals/popovers), loading states, and error alerts implemented.
6. **Documentation & Manual Testing:**
   - Comprehensive documentation and manual testing guides created under `docs/`.

---

## 6. Project Health & Next Steps

| Health Metric | Rating | Comments |
| :--- | :--- | :--- |
| **Code Completeness** | 🟢 **90%** | All core workflows (Auth, Student, Resume AI, Drives, Companies, Notifications, Email Outbox) are fully implemented. |
| **Security Posture** | 🟢 **High** | 20 security checkpoints audited and hardened. |
| **Delivery Reliability** | 🟢 **High** | Transactional Outbox guarantees zero email loss upon application restart. |
| **Next Action Item** | 🟡 **Manual QA** | Execute manual end-to-end verification following `docs/NOTIFICATION_EMAIL_MANUAL_TEST_GUIDE.md`. |
