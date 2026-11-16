# Placement Setu — Frontend to Backend API Mapping Document

**Version:** 1.0.0  
**Context:** Gujarat Vidyapith Placement Management Platform  
**Backend Framework:** Spring Boot 3.x with PostgreSQL, Flyway, and Stateless JWT Authentication  
**Frontend Framework:** React 18 + Vite (Vanilla CSS, Warm Institutional Palette)  

---

## 1. Overview & Architectural Principles

1. **Authoritative Backend:** The Spring Boot backend is the sole source of truth for permissions, business logic, and validation rules. Client-side route guards and validation improve user experience but never supersede server-side security.
2. **Stateless Authentication:** JWT Bearer tokens (`accessToken` and `refreshToken`) are obtained via `/api/v1/auth/login` and sent in the `Authorization: Bearer <token>` header for all authenticated requests.
3. **Institutional Design System:** Built using Gujarat Vidyapith's warm institutional palette (Cream `#F5EDE0`, Warm `#EDE0CC`, Dark Brown `#6A3E1C`, Accent `#C17B3A`, Dark Accent `#9E6128`, Text `#2C1A0A`, Muted `#5C3D1E`, Off-White `#FAF6F0`).
4. **Honest Availability States:** Where backend controllers/services are not yet implemented (e.g., student job discovery, application submissions, shortlisting), pages display a graceful "Not Available Yet" state rather than fabricated metrics or fake mock workflows.

---

## 2. Complete Route & API Matrix

| Page / Feature | Route | Allowed Roles | Backend Endpoint | HTTP Method | Payload / Response DTO & Source Files | Implementation Status | Limitations & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | `/` | Public | None | N/A | Static landing content (`src/pages/Home.jsx`) | **Implemented** | Preserves existing layout; all navigation and role action CTAs point to real application routes. |
| **Login** | `/login` | Public (Unauthenticated) | `/api/v1/auth/login` | `POST` | Req: `LoginRequest`<br>Res: `ApiResponse<AuthResponse>`<br>*File: `com.placementsetu.auth.controller.AuthController`* | **Implemented** | Re-directs to role-specific dashboard upon successful authentication. Supports pre-selected role tabs. |
| **Student Registration** | `/register/student` | Public (Unauthenticated) | `/api/v1/auth/register/student` | `POST` | Req: `StudentRegisterRequest`<br>Res: `ApiResponse<AuthResponse>`<br>*File: `com.placementsetu.auth.controller.AuthController`* | **Implemented** | Password requires ≥8 chars, 1 uppercase, 1 lowercase, 1 digit. APAAR ID is **not** collected here (backend DTO has no APAAR field). |
| **Company Registration** | `/register/company` | Public (Unauthenticated) | `/api/v1/auth/register/company` | `POST` | Req: `CompanyRegisterRequest`<br>Res: `ApiResponse<AuthResponse>`<br>*File: `com.placementsetu.auth.controller.AuthController`* | **Implemented** | Onboarding starts in `PENDING` status. Displays approval pending notice; company cannot access drives until approved. |
| **Token Refresh** | Background | Any authenticated | `/api/v1/auth/refresh` | `POST` | Req: `RefreshRequest`<br>Res: `ApiResponse<AuthResponse>` | **Implemented** | Managed silently by `apiClient` interceptor upon receiving 401 response. |
| **Logout** | Global action | Any authenticated | `/api/v1/auth/logout` | `POST` | Req: None<br>Res: `ApiResponse<Void>` | **Implemented** | Clears client-side tokens and user state from storage. |
| **User Profile Summary** | Global nav / guard | Any authenticated | `/api/v1/users/me` | `GET` | Res: `ApiResponse<UserSummaryResponse>`<br>*File: `com.placementsetu.user.controller.UserController`* | **Implemented** | Role-agnostic account summary (ID, email, role, account status, creation timestamp). |
| **Student Dashboard** | `/student/dashboard` | `STUDENT` | `/api/v1/students/me` | `GET` | Res: `ApiResponse<StudentDashboardResponse>`<br>*File: `com.placementsetu.student.controller.StudentController`* | **Implemented** | Displays recruiter-visibility indicator, profile completion status, missing fields checklist, and resume status. No fake stats. |
| **Student Profile View & Edit** | `/student/profile` | `STUDENT` | `/api/v1/students/me` | `GET`, `PUT` | Req: `UpdateStudentProfileRequest`<br>Res: `ApiResponse<StudentProfileResponse>`<br>*File: `com.placementsetu.student.controller.StudentController`* | **Implemented** | Supports APAAR ID (`apparId` in backend DTO), CGPA (0.0-10.0), backlogs, institution, course, graduation year, social links. |
| **Student Skills** | `/student/profile` | `STUDENT` | `/api/v1/students/me/skills`<br>`/api/v1/students/me/skills/{skillId}` | `POST`<br>`DELETE` | Req: `SkillRequest` (`name`)<br>Res: `ApiResponse<StudentProfileResponse>` | **Partially Limited by Backend** | Adding skills is fully supported. **GAP:** Backend `StudentProfileResponse` returns `skills: List<String>` (names only, no IDs), so deleting an existing skill via `DELETE /{skillId}` is blocked until the backend returns skill IDs. |
| **Student Projects** | `/student/profile` | `STUDENT` | `/api/v1/students/me/projects`<br>`/api/v1/students/me/projects/{projectId}` | `POST`<br>`DELETE` | Req: `ProjectRequest`<br>Res: `ApiResponse<ProjectResponse>` | **Implemented** | Add project with title, description, URL. Delete project by UUID. |
| **Student Certifications** | `/student/profile` | `STUDENT` | `/api/v1/students/me/certifications`<br>`/api/v1/students/me/certifications/{certId}` | `POST`<br>`DELETE` | Req: `CertificationRequest`<br>Res: `ApiResponse<CertificationResponse>` | **Implemented** | Add certification with name, organization, issue date, credential URL. Delete by UUID. |
| **Resume Upload & Status** | `/student/resume` | `STUDENT` | `/api/v1/resumes/me`<br>`/api/v1/resumes/me` | `POST` (multipart)<br>`GET` | Req: Multipart `file`<br>Res: `ApiResponse<ResumeResponseDto>`<br>*File: `com.placementsetu.resume.controller.ResumeController`* | **Implemented** | Synchronous upload. Validates client-side for PDF/DOC/DOCX and 10MB limit. Displays filename, upload time, and backend processing status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`). |
| **Student Browse Drives** | `/student/drives` | `STUDENT` | None (Backend gap) | N/A | N/A | **Graceful Placeholder** | Clearly labelled "Not available yet". Explains that student-facing drive discovery endpoint is pending in the backend. |
| **Student My Applications** | `/student/applications` | `STUDENT` | None (Backend gap) | N/A | N/A | **Graceful Placeholder** | Clearly labelled "Not available yet". Explains that application submission and tracking controllers are pending in the backend. |
| **Company Dashboard** | `/company/dashboard` | `COMPANY` | `/api/v1/companies/me/profile`<br>`/api/v1/companies/me/drives` | `GET` | Res: `CompanyProfileResponse`, `Page<DriveResponse>`<br>*Files: `CompanyController`, `PlacementDriveController`* | **Implemented** | Displays company verification status, profile overview, active placement drives count, and quick links. |
| **Company Profile** | `/company/profile` | `COMPANY` | `/api/v1/companies/me/profile` | `GET`, `PUT` | Req: `UpdateCompanyProfileRequest`<br>Res: `ApiResponse<CompanyProfileResponse>`<br>*File: `com.placementsetu.company.controller.CompanyController`* | **Implemented** | Editable fields: phone, website, address. Read-only fields: company name, email, GSTIN, verification status. |
| **Company Drive List** | `/company/drives` | `COMPANY` | `/api/v1/companies/me/drives` | `GET` | Params: `status`, `page`, `size`<br>Res: `ApiResponse<Page<DriveResponse>>`<br>*File: `com.placementsetu.placement.controller.PlacementDriveController`* | **Implemented** | Paginated drive table with status filter (`DRAFT`, `PUBLISHED`, `CLOSED`), drive details, and action buttons. |
| **Create Placement Drive** | `/company/drives/new` | `COMPANY` | `/api/v1/companies/me/drives` | `POST` | Req: `CreateDriveRequest`<br>Res: `ApiResponse<DriveResponse>`<br>*File: `com.placementsetu.placement.controller.PlacementDriveController`* | **Implemented** | Validated form: title, description, location, CTC, vacancies, minimum CGPA, max backlogs, course, graduation year, dates. Creates in `DRAFT` status. |
| **Edit Placement Drive** | `/company/drives/:id/edit` | `COMPANY` | `/api/v1/companies/me/drives/{driveId}` | `GET`, `PUT` | Req: `UpdateDriveRequest`<br>Res: `ApiResponse<DriveResponse>` | **Implemented** | Backend strictly restricts updates to `DRAFT` status drives. UI prevents editing non-draft drives. |
| **Publish Drive** | `/company/drives` | `COMPANY` | `/api/v1/companies/me/drives/{driveId}/publish` | `POST` | Res: `ApiResponse<DriveResponse>` | **Implemented** | Confirmed transition: `DRAFT` → `PUBLISHED`. |
| **Close Drive** | `/company/drives` | `COMPANY` | `/api/v1/companies/me/drives/{driveId}/close` | `POST` | Res: `ApiResponse<DriveResponse>` | **Implemented** | Confirmed transition: `PUBLISHED` → `CLOSED`. |
| **Officer Dashboard** | `/officer/dashboard` | `PLACEMENT_OFFICER` | `/api/v1/admin/companies/pending`<br>`/api/v1/placement-officers/me/companies` | `GET` | Res: `List<CompanyProfileResponse>`, `Page<CompanyProfileResponse>` | **Implemented** | Overview of pending approvals count, total provisioned companies, and quick action panels. |
| **Company Approvals Queue** | `/officer/approvals` | `ADMIN`, `PLACEMENT_OFFICER` | `/api/v1/admin/companies/pending`<br>`/api/v1/admin/companies/{id}/approve`<br>`/api/v1/admin/companies/{id}/reject` | `GET`<br>`POST`<br>`POST` | Res: `ApiResponse<List<CompanyProfileResponse>>`<br>*File: `com.placementsetu.approval.CompanyApprovalController`* | **Implemented** | Shows pending companies. Confirmation modal before Approve (`ACTIVE`) or Reject (`REJECTED`). |
| **Officer Company Management** | `/officer/companies` | `PLACEMENT_OFFICER` | `/api/v1/placement-officers/me/companies` | `GET`, `POST` | Req: `ProvisionCompanyRequest`<br>Res: `ApiResponse<Page<CompanyProfileResponse>>`<br>*File: `com.placementsetu.officer.controller.OfficerCompanyController`* | **Implemented** | Lists all companies with status filter. Includes modal to provision a new company with temporary credentials. |
| **Officer Edit Company** | `/officer/companies/:id/edit` | `PLACEMENT_OFFICER` | `/api/v1/placement-officers/me/companies/{id}` | `GET`, `PUT` | Req: `UpdateCompanyByOfficerRequest`<br>Res: `ApiResponse<CompanyProfileResponse>` | **Implemented** | Updates company name, GSTIN, phone, website, and address. |
| **Access Denied** | `/unauthorized` | Public | None | N/A | Static error view (`src/pages/Unauthorized.jsx`) | **Implemented** | Displayed when authenticated user attempts to access routes outside their role. |
| **Not Found** | `*` | Public | None | N/A | Static error view (`src/pages/NotFound.jsx`) | **Implemented** | Standard 404 page with return link. |

---

## 3. Confirmed Backend Enums & Constraints

### User Roles (`com.placementsetu.common.enums.UserRole`)
- `STUDENT`
- `COMPANY`
- `PLACEMENT_OFFICER`
- `ADMIN`

### Account Statuses (`com.placementsetu.common.enums.AccountStatus`)
- `PENDING` (Initial status for registered companies)
- `ACTIVE` (Approved and allowed to operate)
- `REJECTED` (Disapproved by officer/admin)
- `SUSPENDED`

### Drive Statuses (`com.placementsetu.common.enums.DriveStatus`)
- `DRAFT` (Initial editable state)
- `PUBLISHED` (Visible and active; cannot be edited, only closed)
- `CLOSED` (Terminal state)
- Legacy values: `PENDING_APPROVAL`, `OPEN`, `REJECTED`

### Resume Processing Statuses (`com.placementsetu.common.enums.ResumeProcessingStatus`)
- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

---

## 4. Backend Missing Endpoints & Blocked Features

The following features were thoroughly evaluated against the Spring Boot source code and found to have no active controller/service implementation:

1. **Student Drive Browsing / Discovery:**
   - Database has `placement_drives` table and company endpoints, but **no** student-accessible endpoint exists to query or search published drives (e.g., `GET /api/v1/students/drives`).
   - *Frontend Action:* A dedicated page `/student/drives` is provided with an honest "Feature in Development" notice.

2. **Student Job Applications & Tracking:**
   - An entity `Application` exists in the codebase, but **no** controller or service layer exists for students to submit applications (e.g., `POST /api/v1/students/drives/{id}/apply`) or view submitted applications (e.g., `GET /api/v1/students/applications`).
   - *Frontend Action:* A dedicated page `/student/applications` is provided with an honest "Feature in Development" notice.

3. **Shortlisting & Interview Scheduling:**
   - No company-facing endpoints exist to review student applications, shortlist candidates, or schedule interview rounds.
   - *Frontend Action:* Company dashboard notes this capability as scheduled for upcoming releases.

4. **Skill Deletion by ID for Students:**
   - `DELETE /api/v1/students/me/skills/{skillId}` exists, but `GET /api/v1/students/me` returns `skills` as `List<String>` rather than objects with IDs.
   - *Frontend Action:* Skills are displayed as tags. The limitation is documented and delete buttons are guarded to prevent invalid requests.

5. **AI Diagnostic Route (`GET /api/v1/ai/test`):**
   - Retained as internal test endpoint only. Not exposed to end-users.

---

## 5. Security & Sensitive Configuration Notice

The backend contains files that must **never** be exposed in the frontend or public version control:
- `backend/.env` contains credentials.
- `backend/src/main/resources/application.yml` contains default credentials in configuration placeholders.
- `backend/data/resumes/` contains sample/uploaded student PDFs.

**Recommendations:**
1. Ensure `backend/.env` and `*.pdf` files in data directories are strictly gitignored.
2. Rotate any database credentials or API keys that have been committed to git history.
3. Configure all sensitive values through system environment variables in production.
