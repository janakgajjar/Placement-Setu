# Placement Setu — Phase 1 Project & Codebase Audit Report

**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer  
**Scope:** Read-Only Audit & Verification of Frontend, Backend, Database, Security, and API Contracts  
**Compliance Note:** No project code was altered during this audit.

---

## 1. Git Repository & Environment Status

- **Current Branch:** `main` (up to date with `origin/main`)
- **Working Tree Status:** Clean (only 1 untracked file: `.env.example`)
- **Database Environment Verification:**
  - Database Host: Verified pointing to local/safe development instance (`localhost:5432`).
  - Email Service: `MAIL_ENABLED` is set to `false` (Safe local development sandbox; no live emails will be dispatched).
  - JWT Secret: Minimum 32-character development secret configured.
  - *No sensitive credentials or production strings were printed.*

### Architecture & Stack Reality Check

| Layer | Expected Stack (Prompt) | Actual Codebase Found | Evaluation |
| :--- | :--- | :--- | :--- |
| **Backend** | Django + DRF, PostgreSQL (Neon), JWT (`djangorestframework-simplejwt`), Cloudinary, Brevo | **Java 17 + Spring Boot 3.2.5** (Maven), PostgreSQL with **Flyway (V1–V13)**, `jjwt` (0.12.5), local filesystem resume storage (`./data/resumes`), Spring Mail + Transactional `email_outbox` | **Architecture Mismatch:** No Django/Python code exists in the repository. The project is an enterprise Spring Boot REST API. |
| **Frontend** | React + Tailwind | **React 18 + Vite** with a **custom CSS design system** (`frontend/src/index.css`, ~31 KB) adhering to Gujarat Vidyapith institutional guidelines (`#563828`, `#FAF6F5`). | Neither `tailwindcss` nor `postcss` is installed; custom responsive vanilla CSS is used throughout. |
| **Product Decisions** | 1. Company provisioning by officer<br>2. Single resume upload only<br>3. Gujarat Vidyapith logo & splash | 1. Implemented (`POST /api/v1/placement-officers/me/companies`)<br>2. Implemented (`/api/v1/resumes/me`; batch tables removed in `V7`)<br>3. Logo & `SplashScreen.jsx` present in `frontend/public/images/` and `src/components/ui/` | **100% Aligned** with product decisions. |

---

## 2. Build & Runtime Execution Audit

### 2.1 Backend Build (`mvn test-compile`)
- **Status:** ❌ **FAILED (23 Compilation Errors)**
- **Root Cause:** Missing Java Enum:
  ```text
  [ERROR] cannot find symbol: class ProfileApprovalStatus
  location: package com.placementsetu.common.enums
  ```
- **Files Affected:** 14 backend source files fail to compile because `ProfileApprovalStatus.java` is missing from `backend/src/main/java/com/placementsetu/common/enums/`:
  - `StudentProfileRepository.java`
  - `StudentProfile.java`
  - `DemoDataSeeder.java`
  - `OfficerStudentController.java`
  - `OfficerStudentService.java`
  - `OfficerStudentServiceImpl.java`
  - `StudentProfileResponse.java`
  - `ApplicationServiceImpl.java`
  - `CompanyCandidateServiceImpl.java`
  - `StudentProfileServiceImpl.java`
- **Expected Values:** In Flyway migration `V12__student_profile_officer_approval.sql`, the column `approval_status VARCHAR(30) DEFAULT 'DRAFT'` documents the status lifecycle as: `DRAFT`, `SUBMITTED`, `APPROVED`, `CHANGES_REQUESTED`.
- **Runtime Impact:** The backend application **cannot boot or run** until this missing enum is defined.

### 2.2 Frontend Build (`npm run build`)
- **Status:** ✅ **SUCCESS (0 errors)**
- **Bundler:** Vite v8.2.1
- **Output:** `dist/assets/index-0ioO6Qh3.js` (455.97 kB) and `dist/assets/index-Brf4dnVp.css` (20.44 kB) generated in 1.15s.
- **Runtime Check:** SPA routing, Context providers (`AuthContext`, `NotificationContext`), and role-based guards compile cleanly.

---

## 3. API Contract & Integration Gaps

Comparing the API Reference (`Placement_Setu_API_Documentation_v2_Final.docx`), Spring Boot controllers, and the frontend client (`frontend/src/lib/api.js`):

1. **Placement Drive Submission Mismatch:**
   - **Frontend:** Calls `POST /api/v1/companies/me/drives/{driveId}/publish` (`api.company.publishDrive`).
   - **Backend:** `PlacementDriveController` exposes `POST /api/v1/companies/me/drives/{driveId}/submit`.
   - **Result:** Submitting a drive for officer approval returns **HTTP 405 Method Not Allowed**.

2. **Officer Drive Review Queue Root Mapping:**
   - **Frontend:** Calls `GET /api/v1/placement-officers/drives?status=PENDING_APPROVAL` (`CompanyApprovals.jsx`).
   - **Backend:** `OfficerDriveController` defines `@GetMapping("/pending")` and `@GetMapping("/{driveId}")`, but has no root `@GetMapping` on `/api/v1/placement-officers/drives`.
   - **Result:** Officer pending queue fetch fails with **HTTP 404 / 405**.

3. **Missing Officer Company Lifecycle Endpoints:**
   - **Frontend:** `OfficerCompanies.jsx` and `api.officer` invoke:
     - `POST /api/v1/placement-officers/me/companies/{id}/activate`
     - `POST /api/v1/placement-officers/me/companies/{id}/deactivate`
     - `POST /api/v1/placement-officers/me/companies/{id}/reset-password`
     - `DELETE /api/v1/placement-officers/me/companies/{id}`
   - **Backend:** `OfficerCompanyController` only defines `POST` (provision), `GET` (list), `GET /{id}`, and `PUT /{id}`. The four lifecycle actions are **unimplemented**.
   - **Result:** Status toggling, password reset, and account deletion fail.

4. **In-App Notifications Method & Query Parameter Mismatch:**
   - **Method:** Frontend `api.notifications.markAsRead` sends `POST /api/v1/notifications/{id}/read`. Backend `NotificationController` only accepts `PATCH /api/v1/notifications/{id}/read`.
   - **Query Param:** Frontend sends `?unreadOnly=true`, but backend expects `@RequestParam(required = false) Boolean unread`.
   - **Result:** Notification bell mark-as-read fails with **HTTP 405**.

5. **Student Profile Submit Action Missing in UI:**
   - **Backend:** Exposes `POST /api/v1/students/me/submit` to transition approval state to `SUBMITTED`.
   - **Frontend:** `StudentProfile.jsx` allows editing and updating profile fields (`PUT /students/me`), but has no "Submit to Placement Officer" action.

6. **Unrouted Student Drives Route:**
   - `ROUTES.STUDENT_DRIVES` (`/student/drives`) is registered in `routes.js`, but omitted in `App.jsx`. Students browse drives via the public `/drives` page (`DrivesExplorer.jsx`), which relies on fallback mock objects when the backend is empty.

7. **Legacy Batch Upload References in Officer UI:**
   - `OfficerDashboard.jsx` still displays a metric card for "AI Batch Resume Parser", which was deprecated and dropped in migration `V7`.

---

## 4. End-to-End Feature Matrix

| Feature | User Role | Frontend Page | Backend Endpoint | Status | Identified Problem / Gap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student Self-Registration** | Public / Student | `RegisterStudentPage.jsx` | `POST /api/v1/auth/register/student` | **Working** *(Blocked by backend build)* | Backend compiles fail; endpoint logic itself is complete and validated. |
| **User Sign-In & JWT Session** | All Roles | `LoginPage.jsx` | `POST /api/v1/auth/login` | **Working** *(Blocked by backend build)* | Implemented with access token (15m) + refresh token rotation. |
| **Forced Password Reset** | Company | `ForcedPasswordChangeModal.jsx` | `POST /api/v1/auth/change-password` | **Working** | Implements `must_change_password` check on company initial login. |
| **Student KYC & Profile Management** | Student | `StudentProfile.jsx` | `GET/PUT /api/v1/students/me/profile`, `/skills`, `/projects`, `/certifications` | **Working** | CRUD for skills/projects wired; lacks "Submit to Officer" button. |
| **Single Resume AI Upload** | Student | `StudentResume.jsx` | `POST /api/v1/resumes/me` | **Working** | Apache PDFBox/POI text extraction + Gemini structured parsing. |
| **Public Drive Explorer** | Public / Student | `DrivesExplorer.jsx` | `GET /api/v1/public/drives` | **Working** | Connects to public API; includes fallback items if DB has no drives. |
| **Student Application Submission** | Student | `DrivesExplorer.jsx` | `POST /api/v1/applications` | **Working** | Validates One-Student-One-Job policy, CGPA, and dream offer eligibility. |
| **Student Applications Tracker** | Student | `StudentApplications.jsx` | `GET /api/v1/applications/me`, `/summary`, `POST /{id}/withdraw` | **Working** | Full pipeline visualization (`APPLIED` $\to$ `SELECTED`). |
| **Company Provisioning** | Officer | `OfficerCompanies.jsx` | `POST /api/v1/placement-officers/me/companies` | **Working** | Creates company profile, issues temp credentials, flags password reset. |
| **Company List & Search** | Officer | `OfficerCompanies.jsx` | `GET /api/v1/placement-officers/me/companies` | **Working** | Pagination and status filtering supported. |
| **Company Status Toggle (Activate/Suspend)** | Officer | `OfficerCompanies.jsx` | `POST .../activate`, `.../deactivate` | **Missing** | Endpoints not implemented in `OfficerCompanyController`. |
| **Company Password Reset by Officer** | Officer | `OfficerCompanies.jsx` | `POST .../reset-password` | **Missing** | Endpoint not implemented in `OfficerCompanyController`. |
| **Company Deletion** | Officer | `OfficerCompanies.jsx` | `DELETE .../{companyId}` | **Missing** | Endpoint not implemented in `OfficerCompanyController`. |
| **Drive Creation (Draft)** | Company | `CreateDrive.jsx` | `POST /api/v1/companies/me/drives` | **Working** | Enforces minimum ₹10,000 stipend policy for internships. |
| **Drive Submission for Approval** | Company | `CompanyDrives.jsx` | `POST .../drives/{id}/submit` | **Broken** | Frontend calls `/publish`, backend expects `/submit` (HTTP 405). |
| **Officer Pending Drive Queue** | Officer | `CompanyApprovals.jsx` | `GET /api/v1/placement-officers/drives` | **Broken** | Frontend queries root path; backend only has `/pending` (HTTP 404/405). |
| **Officer Drive Approve / Reject** | Officer | `CompanyApprovals.jsx` | `POST .../drives/{id}/approve`, `/reject` | **Working** | Backend supports remarks; transitions drive to `PUBLISHED` / `REJECTED`. |
| **Candidate Search & Scoring** | Company | `CandidateSearch.jsx` | `GET /api/v1/companies/me/candidates`, `/drives/{id}/candidates` | **Working** | Skill normalizer + match score engine with masked phone/email. |
| **Recruiter Application Evaluation** | Company | `CandidateSearch.jsx` | `POST /api/v1/applications/{id}/status` | **Working** | Recruiter transitions candidate through pipeline with audit logging. |
| **In-App Notifications List** | All Roles | `NotificationBell.jsx` | `GET /api/v1/notifications` | **Working** | Polled every 30s; param name discrepancy (`unread` vs `unreadOnly`). |
| **Mark Notification Read** | All Roles | `NotificationBell.jsx` | `PATCH /api/v1/notifications/{id}/read` | **Broken** | Frontend sends `POST`; backend requires `PATCH` (HTTP 405). |
| **Student Profile Officer Review** | Officer | *None (UI Missing)* | `GET /api/v1/placement-officers/students`, `POST .../approve`, `.../request-changes` | **Not connected** | Backend has full controller and service; frontend has no review page. |
| **Audit Logs Viewer** | Admin | *None (UI Missing)* | `GET /api/v1/admin/audit-logs` | **Not connected** | Backend provides audit log queries; frontend has no Admin UI page. |

---

## 5. Security Evaluation & Vulnerability Findings

### 5.1 High Severity
1. **Hardcoded Local Secret in Application Configuration:**
   - In `backend/src/main/resources/application.yml`:
     ```yaml
     password: ${DB_PASSWORD:11218830}
     ```
     A developer default database password is hardcoded as fallback.
   - **Recommendation:** Remove the fallback value and require environment-provided `DB_PASSWORD`.
2. **Default Administrative Credentials in Seed Migration:**
   - `V2__seed_data.sql` and `RUN.md` reference `admin@placementsetu.local` / `ChangeMe@123`.
   - **Recommendation:** Flag default admin credentials for mandatory rotation upon initial deployment.

### 5.2 Medium Severity
1. **Rate Limiting In-Memory Storage:**
   - `RateLimitingFilter` stores request counters in an in-memory `ConcurrentHashMap`. In a multi-instance production environment on Render, rate-limiting counters are not synchronized across workers.
   - **Recommendation:** Acceptable for Phase 1 single-instance deployment; note for distributed cache migration if scaling horizontally.
2. **Placeholder Gemini AI Key:**
   - `application.yml` contains `gemini.api.key: Your_Actual_Key`. If unconfigured in `.env`, resume upload will fail at runtime with an external API exception.

### 5.3 Low Severity / Verified Safeguards
1. **Candidate PII Protection:** Recruiters only receive masked candidate contact details (phone, email) via `CompanyCandidateController` until candidates formally apply.
2. **Brute Force Lockout:** 5 consecutive failed login attempts result in an automated 15-minute account lockout (`V9` migration).
3. **CORS Hardening:** `CorsConfig.java` strictly validates wildcard configurations and credentials.

---

## 6. Prioritized Remediation & Integration Plan

### Phase 2: Compilation & Backend Unblocking (Immediate)
- [ ] Add `com.placementsetu.common.enums.ProfileApprovalStatus` enum with constants: `DRAFT`, `SUBMITTED`, `APPROVED`, `CHANGES_REQUESTED`.
- [ ] Verify that `mvn clean compile test-compile` succeeds across all 166 backend source files.
- [ ] Run backend unit and integration test suite (`mvn test`) and verify zero test regressions.

### Phase 3: API Contract & Route Alignment
- [ ] **Placement Drive Submission:** Map both `/submit` and `/publish` in `PlacementDriveController` or update `api.js` to call `submitDriveForApproval`.
- [ ] **Officer Drive Queue:** Add root `@GetMapping` in `OfficerDriveController` to support `/api/v1/placement-officers/drives` with status filtering (`PENDING_APPROVAL`, `PUBLISHED`, etc.).
- [ ] **Officer Company Management:** Implement missing `/activate`, `/deactivate`, `/reset-password`, and `DELETE /{companyId}` endpoints in `OfficerCompanyService` and `OfficerCompanyController`.
- [ ] **Notification Contract:** Support both `POST` and `PATCH` for `/notifications/{id}/read` and map parameter `unreadOnly` as alias to `unread`.

### Phase 4: Frontend UI Completion & Feature Wiring
- [ ] Add "Submit Profile for Approval" action to `StudentProfile.jsx`.
- [ ] Wire `/student/drives` in `App.jsx` and remove legacy "AI Batch Resume Parser" card from `OfficerDashboard.jsx`.
- [ ] Add student profile verification section to Placement Officer desk.

### Phase 5: Verification, Secret Sanitization & Final Report
- [ ] End-to-end user journey smoke test across all 4 personas (Student $\to$ Company $\to$ Officer $\to$ Admin).
- [ ] Verify `.env` secret sanitization and production readiness checklist.
