# Placement Setu — Frontend Implementation Report

**Institution:** Gujarat Vidyapith  
**Project:** Placement Setu Web Platform  
**Architecture:** React 18 + Vite Frontend with Spring Boot 3 + PostgreSQL Backend  
**Role:** Lead Frontend Engineer  

---

## 1. Executive Summary & Verification Statement

The frontend for Placement Setu has been designed, implemented, and integrated in strict alignment with the actual backend Spring Boot source code and the existing institutional design system of Gujarat Vidyapith.

> [!IMPORTANT]
> **Explicit Verification Statement:**  
> In accordance with strict user operating instructions (Rules 4, 5, and 10), **no automated tests, test scripts, build commands (`npm run build`, `mvn package`), linters (`npm run lint`), development servers (`npm run dev`), browser automation, or live API calls were executed**. All verification is intentionally left to manual execution by the user, guided by the newly created [FRONTEND_MANUAL_TESTING_GUIDE.md](./FRONTEND_MANUAL_TESTING_GUIDE.md).

---

## 2. Pages and Routes Implemented

### A. Public & Authentication Pages
| Page | Route | Description |
| :--- | :--- | :--- |
| **Landing Page** | `/` | Preserved institutional landing page with Gujarat Vidyapith branding, hero preview, audience highlights, feature cards, workflow steps, and role-based action CTAs connected to live routes. |
| **Login** | `/login` | Email and password authentication with client-side validation, error banners, and automatic redirection to role-specific default dashboards. |
| **Student Registration** | `/register/student` | Student registration collecting Full Name, Email, Password (with uppercase/lowercase/digit pattern check), Phone, and Course. (Note: APAAR ID is not collected at registration as it is not part of `StudentRegisterRequest`). |
| **Company Registration** | `/register/company` | Recruiter registration collecting Company Name, Corporate Email, GSTIN, Phone, Website, and Address. Shows the post-submission verification pending notice. |
| **Access Restricted (403)** | `/unauthorized` | Institutional error page when an authenticated user attempts to access routes outside their role. |
| **Page Not Found (404)** | `*` | Catch-all error page with return navigation. |

### B. Student Portal (`STUDENT` Role)
| Page | Route | Description |
| :--- | :--- | :--- |
| **Student Dashboard** | `/student/dashboard` | Real-time recruiter visibility indicator, checklist of missing profile fields, academic summary, and resume status. Does not display fabricated metrics. |
| **Student Profile** | `/student/profile` | View and edit academic marks (CGPA 0.0–10.0, backlogs), graduation year, institution, course, APAAR ID, residential address, LinkedIn, and GitHub links. |
| **Skills Management** | `/student/profile` | Form to add technical skills (`POST /api/v1/students/me/skills`) and tag cloud display. (Includes documented notice regarding backend skill ID limitation for deletion). |
| **Projects & Certifications** | `/student/profile` | CRUD management for student projects and verified certifications with title, description, URLs, issue dates, and delete confirmation modals. |
| **Resume Upload & Status** | `/student/resume` | Synchronous resume upload with drag-and-drop, client-side format validation (PDF, DOC, DOCX), 10 MB file size limit enforcement, upload timestamp, and processing status. |
| **Browse Drives** | `/student/drives` | Graceful "Feature in Development" placeholder documenting that student drive discovery endpoints are not yet exposed by the backend. |
| **My Applications** | `/student/applications` | Graceful "Feature in Development" placeholder documenting that application submission/tracking controllers are not yet exposed by the backend. |

### C. Company Recruiter Portal (`COMPANY` Role)
| Page | Route | Description |
| :--- | :--- | :--- |
| **Company Dashboard** | `/company/dashboard` | Organization verification status banner (`PENDING` vs `ACTIVE`), official contact profile summary, drives count, and quick links. |
| **Company Profile** | `/company/profile` | View official registration records (Company Name, Email, GSTIN locked after onboarding) and update editable contact details (phone, website, address). |
| **Placement Drives Directory** | `/company/drives` | Paginated listing of company placement drives with status filters (`All`, `DRAFT`, `PUBLISHED`, `CLOSED`), drive details, and action buttons. |
| **Create Placement Drive** | `/company/drives/new` | Multi-field validated form to create a drive in `DRAFT` status: job title, description, location, CTC (LPA), vacancies, minimum CGPA, max backlogs, target graduation year, and registration dates. |
| **Edit Placement Drive** | `/company/drives/:id/edit`| Form to update draft placement drives. Enforces backend rule that drives can only be edited while in `DRAFT` state. |
| **Publish Drive Action** | `/company/drives` | Transitions drive status from `DRAFT` to `PUBLISHED` with confirmation modal. |
| **Close Drive Action** | `/company/drives` | Transitions drive status from `PUBLISHED` to `CLOSED` with confirmation modal. |

### D. Placement Officer & Admin Portal (`PLACEMENT_OFFICER` & `ADMIN` Roles)
| Page | Route | Description |
| :--- | :--- | :--- |
| **Officer Dashboard** | `/officer/dashboard` | Central coordination overview displaying pending company approval counts and total onboarded companies. |
| **Company Approvals Queue** | `/officer/approvals` | Review pending company onboarding requests with full details (Name, Email, GSTIN, Phone, Address) and Approve (`ACTIVE`) or Reject (`REJECTED`) actions with confirmation modals. |
| **Company Management Directory** | `/officer/companies` | Paginated listing of all registered companies with status filters, a modal to directly provision a company account with temporary credentials, and a modal to edit existing company records. |

---

## 3. Actual Backend Endpoints Used & Source File References

| Endpoint | Method | Backend Controller & Method | Request / Response DTO |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | `com.placementsetu.auth.controller.AuthController.login` | Req: `LoginRequest`<br>Res: `AuthResponse` |
| `/api/v1/auth/register/student` | `POST` | `com.placementsetu.auth.controller.AuthController.registerStudent` | Req: `StudentRegisterRequest`<br>Res: `AuthResponse` |
| `/api/v1/auth/register/company` | `POST` | `com.placementsetu.auth.controller.AuthController.registerCompany` | Req: `CompanyRegisterRequest`<br>Res: `AuthResponse` |
| `/api/v1/auth/refresh` | `POST` | `com.placementsetu.auth.controller.AuthController.refresh` | Req: `RefreshRequest`<br>Res: `AuthResponse` |
| `/api/v1/auth/logout` | `POST` | `com.placementsetu.auth.controller.AuthController.logout` | Res: `ApiResponse<Void>` |
| `/api/v1/users/me` | `GET` | `com.placementsetu.user.controller.UserController.me` | Res: `UserSummaryResponse` |
| `/api/v1/students/me` | `GET` | `com.placementsetu.student.controller.StudentController.dashboard` | Res: `StudentDashboardResponse` |
| `/api/v1/students/me` | `PUT` | `com.placementsetu.student.controller.StudentController.updateProfile` | Req: `UpdateStudentProfileRequest`<br>Res: `StudentProfileResponse` |
| `/api/v1/students/me/skills` | `POST` | `com.placementsetu.student.controller.StudentController.addSkill` | Req: `SkillRequest` (`name`)<br>Res: `StudentProfileResponse` |
| `/api/v1/students/me/skills/{skillId}` | `DELETE` | `com.placementsetu.student.controller.StudentController.removeSkill` | Res: `ApiResponse<Void>` |
| `/api/v1/students/me/projects` | `POST` | `com.placementsetu.student.controller.StudentController.addProject` | Req: `ProjectRequest`<br>Res: `ProjectResponse` |
| `/api/v1/students/me/projects/{projectId}` | `DELETE` | `com.placementsetu.student.controller.StudentController.removeProject` | Res: `ApiResponse<Void>` |
| `/api/v1/students/me/certifications` | `POST` | `com.placementsetu.student.controller.StudentController.addCertification` | Req: `CertificationRequest`<br>Res: `CertificationResponse` |
| `/api/v1/students/me/certifications/{certId}` | `DELETE` | `com.placementsetu.student.controller.StudentController.removeCertification` | Res: `ApiResponse<Void>` |
| `/api/v1/resumes/me` | `POST` | `com.placementsetu.resume.controller.ResumeController.upload` | Req: `MultipartFile file`<br>Res: `ResumeResponseDto` |
| `/api/v1/resumes/me` | `GET` | `com.placementsetu.resume.controller.ResumeController.getMine` | Res: `ResumeResponseDto` |
| `/api/v1/companies/me/profile` | `GET` | `com.placementsetu.company.controller.CompanyController.getProfile` | Res: `CompanyProfileResponse` |
| `/api/v1/companies/me/profile` | `PUT` | `com.placementsetu.company.controller.CompanyController.updateProfile` | Req: `UpdateCompanyProfileRequest`<br>Res: `CompanyProfileResponse` |
| `/api/v1/companies/me/drives` | `GET` | `com.placementsetu.placement.controller.PlacementDriveController.getCompanyDrives` | Params: `status`, `page`, `size`<br>Res: `Page<DriveResponse>` |
| `/api/v1/companies/me/drives` | `POST` | `com.placementsetu.placement.controller.PlacementDriveController.createDrive` | Req: `CreateDriveRequest`<br>Res: `DriveResponse` |
| `/api/v1/companies/me/drives/{driveId}` | `GET` | `com.placementsetu.placement.controller.PlacementDriveController.getDrive` | Res: `DriveResponse` |
| `/api/v1/companies/me/drives/{driveId}` | `PUT` | `com.placementsetu.placement.controller.PlacementDriveController.updateDrive` | Req: `UpdateDriveRequest`<br>Res: `DriveResponse` |
| `/api/v1/companies/me/drives/{driveId}/publish` | `POST` | `com.placementsetu.placement.controller.PlacementDriveController.publishDrive` | Res: `DriveResponse` |
| `/api/v1/companies/me/drives/{driveId}/close` | `POST` | `com.placementsetu.placement.controller.PlacementDriveController.closeDrive` | Res: `DriveResponse` |
| `/api/v1/admin/companies/pending` | `GET` | `com.placementsetu.approval.CompanyApprovalController.pending` | Res: `List<CompanyProfileResponse>` |
| `/api/v1/admin/companies/{companyId}/approve` | `POST` | `com.placementsetu.approval.CompanyApprovalController.approve` | Res: `CompanyProfileResponse` |
| `/api/v1/admin/companies/{companyId}/reject` | `POST` | `com.placementsetu.approval.CompanyApprovalController.reject` | Res: `CompanyProfileResponse` |
| `/api/v1/placement-officers/me/companies` | `GET` | `com.placementsetu.officer.controller.OfficerCompanyController.getCompanies` | Params: `status`, `page`, `size`<br>Res: `Page<CompanyProfileResponse>` |
| `/api/v1/placement-officers/me/companies` | `POST` | `com.placementsetu.officer.controller.OfficerCompanyController.provisionCompany` | Req: `ProvisionCompanyRequest`<br>Res: `CompanyProfileResponse` |
| `/api/v1/placement-officers/me/companies/{companyId}` | `GET` | `com.placementsetu.officer.controller.OfficerCompanyController.getCompany` | Res: `CompanyProfileResponse` |
| `/api/v1/placement-officers/me/companies/{companyId}` | `PUT` | `com.placementsetu.officer.controller.OfficerCompanyController.updateCompany` | Req: `UpdateCompanyByOfficerRequest`<br>Res: `CompanyProfileResponse` |

---

## 4. Backend API Gaps and Features Kept Unavailable

In adherence to Rule 8 ("Do not invent endpoints, DTO fields, enum values, role permissions, fake statistics, or successful workflows"):

1. **Student Job Discovery:**  
   The backend does not yet provide a student-authorized drive search endpoint. The student navigation provides an honest "Not Available Yet" notification on `/student/drives`.
2. **Student Applications & Tracking:**  
   The backend database entity exists, but no REST controller exists for students to submit or view applications. The page `/student/applications` clearly explains this technical status without simulated mock progress.
3. **Skill Deletion by ID:**  
   `DELETE /api/v1/students/me/skills/{skillId}` requires a skill UUID. However, `StudentProfileResponse` returns `skills: List<String>` (names only). The frontend informs the user of this contract gap.
4. **AI Diagnostic Route:**  
   `GET /api/v1/ai/test` is an internal backend diagnostic route and has not been exposed as a normal user-facing feature.

---

## 5. Files Created and Modified

### Documentation
- `docs/FRONTEND_BACKEND_MAPPING.md` *(New)*: Comprehensive API route mapping matrix.
- `docs/FRONTEND_MANUAL_TESTING_GUIDE.md` *(New)*: 15-suite manual verification guide.
- `docs/FRONTEND_IMPLEMENTATION_REPORT.md` *(New)*: Technical report and architecture overview.

### Configuration & Foundations
- `frontend/.env.example` *(New)*: Environment template with `VITE_API_BASE_URL=http://localhost:8080`.
- `frontend/package.json` *(Modified)*: Added `"react-router-dom": "^6.22.3"` to dependencies.
- `frontend/src/lib/routes.js` *(New)*: Centralized application route constants.
- `frontend/src/lib/api.js` *(New)*: Centralized API client with JWT storage, silent refresh, multipart handling, and error formatting.
- `frontend/src/context/AuthContext.jsx` *(New)*: Context managing authentication state, session sync, login, logout, and token dispatch.

### UI & Layout Components
- `frontend/src/components/ui/Button.jsx` *(Modified)*: Enhanced with router `to` prop, loading spinner, and disabled states.
- `frontend/src/components/ui/Spinner.jsx` *(New)*: Institutional spinner with size variants.
- `frontend/src/components/ui/FormField.jsx` *(New)*: Accessible form input, select, and textarea component with error and hint messaging.
- `frontend/src/components/ui/StatusBadge.jsx` *(New)*: Color-coded badge for Account, Drive, Resume, and Profile statuses.
- `frontend/src/components/ui/ErrorBanner.jsx` *(New)*: Alert component displaying user-friendly error banners.
- `frontend/src/components/ui/ConfirmModal.jsx` *(New)*: Modal dialog for destructive/irreversible actions.
- `frontend/src/components/ui/EmptyState.jsx` *(New)*: Reusable empty state view.
- `frontend/src/components/layout/Header.jsx` *(Modified)*: Role-aware navigation, user indicator, sign out action, and responsive mobile menu.
- `frontend/src/components/layout/AppLayout.jsx` *(New)*: Authenticated app shell with header, main container, and footer.
- `frontend/src/components/layout/AuthLayout.jsx` *(New)*: Centered layout for login and registration screens.
- `frontend/src/components/shared/ProtectedRoute.jsx` *(New)*: Role-based client-side route guard.

### Pages
- `frontend/src/pages/Home.jsx` *(Modified)*: Preserved landing page connected to live route actions.
- `frontend/src/pages/LoginPage.jsx` *(New)*: Unified login page.
- `frontend/src/pages/RegisterStudentPage.jsx` *(New)*: Student onboarding page.
- `frontend/src/pages/RegisterCompanyPage.jsx` *(New)*: Recruiter onboarding page with verification notice.
- `frontend/src/pages/NotFound.jsx` *(New)*: 404 page.
- `frontend/src/pages/Unauthorized.jsx` *(New)*: 403 access restricted page.
- `frontend/src/pages/student/StudentDashboard.jsx` *(New)*: Student dashboard.
- `frontend/src/pages/student/StudentProfile.jsx` *(New)*: Profile, skills, projects, and certifications management.
- `frontend/src/pages/student/ResumeUpload.jsx` *(New)*: Resume management and upload with 10MB limit enforcement.
- `frontend/src/pages/student/BrowseDrives.jsx` *(New)*: Honest "Not available yet" placeholder.
- `frontend/src/pages/student/MyApplications.jsx` *(New)*: Honest "Not available yet" placeholder.
- `frontend/src/pages/company/CompanyDashboard.jsx` *(New)*: Company recruiter dashboard.
- `frontend/src/pages/company/CompanyProfile.jsx` *(New)*: Company profile view and update.
- `frontend/src/pages/company/DriveList.jsx` *(New)*: Company drives table with publish and close actions.
- `frontend/src/pages/company/CreateEditDrive.jsx` *(New)*: Drive creation and draft editing form.
- `frontend/src/pages/officer/OfficerDashboard.jsx` *(New)*: Placement officer dashboard.
- `frontend/src/pages/officer/ApprovalQueue.jsx` *(New)*: Admin/Officer company approval and rejection queue.
- `frontend/src/pages/officer/CompanyManagement.jsx` *(New)*: Company directory, provisioning, and edit modals.

### Entry Files & Styling
- `frontend/src/App.jsx` *(Modified)*: Complete route hierarchy and guards.
- `frontend/src/main.jsx` *(Modified)*: Wrapped with `BrowserRouter` and `AuthProvider`.
- `frontend/src/index.css` *(Modified)*: Added portal styling classes utilizing the warm institutional palette.

---

## 6. Dependency Justification

- **`react-router-dom` (`^6.22.3`)**: Added to `package.json` dependencies. Required for client-side SPA routing, parameterized routes (`/company/drives/:id/edit`), route protection guards, and browser history management.
- No other external libraries or component frameworks (such as TailwindCSS or component libraries) were introduced. All styles use Vanilla CSS variables already present in `index.css`.

---

## 7. Environment Configuration Required

The user must provide the following environment variables (names only):

### Frontend (`frontend/.env`):
- `VITE_API_BASE_URL` (Defaults to `http://localhost:8080` if omitted)

### Backend (`backend/.env` or system environment):
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS` (Must include `http://localhost:5173` for local Vite development)
- `RESUME_STORAGE_DIR`
- `GEMINI_API_KEY`

---

## 8. Sensitive Data & Security Advisory

During repository inspection, configuration files were identified that contain default or tracked credentials:
1. `backend/.env`
2. `backend/src/main/resources/application.yml` (e.g. database credentials, Gemini API key placeholders)
3. `backend/data/resumes/` (local directory for PDF storage)

**Recommendations:**
- Ensure `backend/.env` and `*.pdf` files in `backend/data/` are strictly excluded in `.gitignore`.
- Remove any hardcoded secrets from `application.yml` and substitute them with system environment variable references.
- Rotate any API keys or database passwords that have been exposed in git commit history.
