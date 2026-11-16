# Placement Setu — Frontend Manual Testing Guide

**Institution:** Gujarat Vidyapith  
**Target Environment:** Local Full-Stack Setup (React + Vite Frontend & Spring Boot Backend)  
**Notice:** In accordance with explicit project instructions, no automated test suites, build scripts, linter checks, or live API calls were executed during frontend development. This guide provides comprehensive, step-by-step manual testing instructions for the testing engineer.

---

## 1. Prerequisites & Environment Setup

### A. Backend Services
1. **PostgreSQL Database:**
   - Ensure PostgreSQL 14+ is running locally on port `5432`.
   - Create a database named `placement_setu`:
     ```sql
     CREATE DATABASE placement_setu;
     ```
2. **Backend Configuration & Secrets Warning:**
   > [!WARNING]
   > Sensitive credentials exist in `backend/.env` and default placeholders in `backend/src/main/resources/application.yml` (such as `DB_PASSWORD` and `gemini.api.key`).
   > - Do not commit real credentials to public source control.
   > - Set your local PostgreSQL credentials and Gemini API key in a non-tracked `backend/.env` or system environment variables (`DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY`).
   > - If real credentials were previously pushed, rotate them immediately.

3. **Start Spring Boot Backend:**
   - Open a terminal in the root or `backend/` directory:
     ```bash
     cd backend
     ./mvnw spring-boot:run
     # On Windows PowerShell:
     .\mvnw.cmd spring-boot:run
     ```
   - Verify that Spring Boot starts on `http://localhost:8080`.
   - Flyway will automatically run database migrations from `db/migration`.

---

### B. Frontend Setup
1. **Configure Environment File:**
   - In `frontend/`, copy `.env.example` to `.env`:
     ```bash
     cd frontend
     copy .env.example .env
     ```
   - Ensure `VITE_API_BASE_URL=http://localhost:8080` is set.

2. **Install Node Dependencies:**
   - Run `npm install` inside the `frontend/` directory to install dependencies (including `@vitejs/plugin-react`, `vite`, `react`, `react-dom`, and `react-router-dom`):
     ```bash
     npm install
     ```

3. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   - Open your browser to `http://localhost:5173`.

---

## 2. Step-by-Step Manual Test Workflows

---

### Test Suite 1: Public Landing Page & Navigation
- **Objective:** Verify landing page aesthetics, typography, responsiveness, and interactive route navigation.
- **Steps:**
  1. Open `http://localhost:5173/` in a desktop browser.
  2. Inspect the warm institutional palette: Cream (`#F5EDE0`), Deep Institutional Brown (`#6A3E1C`), Amber Accent (`#C17B3A`).
  3. Verify typography: Check that Playfair Display is used for headers and Hind for body text.
  4. Scroll through the page:
     - Hero section with live preview mockup.
     - "Designed around every placement journey" (3 audience cards).
     - "The Placement Setu Experience" (6 feature cards).
     - "A Clearer Way Forward" (4 sequential steps).
     - "Start Where You Are" (Student, Company, and Placement Team role cards).
  5. Click **"Get started →"** in the Hero section. Verify it navigates to `/register/student`.
  6. Return to Home. Click **"Join as student →"** on the Student card. Verify it navigates to `/register/student`.
  7. Click **"Register as company →"** on the Company card. Verify it navigates to `/register/company`.
  8. Click **"Placement dashboard →"** on the Placement Team card. Verify it navigates to `/login`.
  9. Click **"Login"** in the Header. Verify it navigates to `/login`.
  10. Resize the browser to mobile viewport (320px – 480px):
      - Ensure no horizontal scrolling occurs.
      - Click the hamburger menu icon in the header and verify nav links toggle.

---

### Test Suite 2: Student Registration & Validation
- **Objective:** Verify student onboarding form validation against backend DTO (`StudentRegisterRequest`).
- **Steps:**
  1. Navigate to `http://localhost:5173/register/student`.
  2. Test client-side validations:
     - Submit an empty form: Verify errors appear for Full Name, Email, and Password.
     - Enter an invalid email (e.g., `notanemail`): Verify "Please enter a valid email address" appears.
     - Enter a weak password (e.g., `pass`): Verify "Password must be at least 8 characters long" appears.
     - Enter 8 characters without uppercase or digits (e.g., `passwordtest`): Verify "Password must include uppercase, lowercase, and a number" appears.
     - Enter non-matching passwords: Verify "Passwords do not match" appears.
  3. Enter valid student details:
     - **Full Name:** `Ananya Sharma`
     - **Email:** `ananya.sharma@vidyapith.edu`
     - **Course:** `MCA`
     - **Phone:** `9876543210`
     - **Password:** `Vidyapith@2026`
     - **Confirm Password:** `Vidyapith@2026`
  4. Click **"Complete Registration"**.
  5. **Expected Observation:**
     - The submit button displays a loading spinner while the request is pending.
     - Upon HTTP 201 response, tokens are saved to localStorage (`ps_access_token`, `ps_refresh_token`).
     - The user is automatically redirected to `/student/dashboard`.

---

### Test Suite 3: Student Login & Session Persistence
- **Objective:** Verify login authentication, session initialization, and logout.
- **Steps:**
  1. Click **"Sign Out"** in the header. Verify redirection to `/login`.
  2. In the login form, enter invalid credentials (`ananya.sharma@vidyapith.edu` / `WrongPass123`).
  3. Click **"Sign In"**. Verify that an error banner appears displaying the backend error message.
  4. Enter valid credentials (`ananya.sharma@vidyapith.edu` / `Vidyapith@2026`).
  5. Click **"Sign In"**.
  6. **Expected Observation:**
     - User is logged in and redirected to `/student/dashboard`.
     - Header displays: `Logged in as ananya.sharma@vidyapith.edu (STUDENT)`.
     - Refresh the browser page (`F5`): Verify the session persists without asking for login again.

---

### Test Suite 4: Student Dashboard & Recruiter Visibility
- **Objective:** Verify real data presentation on the student dashboard without fabricated metrics.
- **Steps:**
  1. Navigate to `/student/dashboard`.
  2. Inspect the **Recruiter Visibility Banner**:
     - If newly registered, verify it displays: **"Profile Incomplete: Hidden from Recruiters"**.
     - Verify the checklist of missing required items (e.g. CGPA, graduation year, resume).
  3. Inspect Academic & Resume cards:
     - Academic details show `MCA`, `Gujarat Vidyapith`.
     - CGPA displays `Not provided` (no fake numbers).
     - Resume status shows `Resume Required` / `Action Required`.
  4. Click each quick link card: "Complete Profile", "Resume Management", "Campus Drives", "My Applications".

---

### Test Suite 5: Student Profile View & Edit
- **Objective:** Verify updating student profile fields, APAAR ID, and academic records (`PUT /api/v1/students/me`).
- **Steps:**
  1. Navigate to `/student/profile`.
  2. Fill in the academic fields:
     - **Gender:** Select `Female`
     - **Institution:** `Gujarat Vidyapith, Sadra Campus`
     - **Graduation Year:** `2026`
     - **APAAR ID:** `GV-APAAR-2026-98124` (verify plain-text input without artificial verification)
     - **Current CGPA:** `8.65`
     - **Active Backlogs:** `0`
     - **Address:** `Hostel Block B, Gujarat Vidyapith, Sadra, Gandhinagar`
     - **LinkedIn URL:** `https://linkedin.com/in/ananya-sharma`
     - **GitHub URL:** `https://github.com/ananya-sharma`
  3. Click **"Save Academic Details"**.
  4. **Expected Observation:**
     - A green success alert appears: "Profile information saved successfully."
     - Reload the page: verify all saved values persist correctly.

---

### Test Suite 6: Student Technical Skills
- **Objective:** Verify adding skills and observing the backend skill deletion contract limitation.
- **Steps:**
  1. On `/student/profile`, scroll to **"Technical & Domain Skills"**.
  2. In the "Add Skill" field, type `Java` and click **"Add Skill"**.
  3. Verify `Java` appears in the skill tag cloud.
  4. Add additional skills: `Spring Boot`, `React`, `PostgreSQL`.
  5. Verify all tags appear in the cloud.
  6. **Limitation Check:** Observe the informational notice below the tags explaining that skills are displayed as verified tags and deletion requires skill IDs to be exposed in backend responses.

---

### Test Suite 7: Projects & Certifications
- **Objective:** Verify adding and deleting student projects and certifications with confirmation dialogs.
- **Steps:**
  1. On `/student/profile`, scroll to **"Projects"**.
  2. In "Add New Project", enter:
     - **Title:** `Rural Governance Web Portal`
     - **Description:** `Digitized village administrative records using React and PostgreSQL.`
     - **Project URL:** `https://github.com/example/rural-gov`
  3. Click **"Add Project"**.
  4. Verify the project card appears in the list with a working link.
  5. Click **"Delete"** on the project card:
     - A confirmation modal appears asking: "Are you sure you want to remove 'Rural Governance Web Portal'?"
     - Click **"Cancel"**: verify the project remains.
     - Click **"Delete"** again, then click **"Remove Project"**: verify the project is deleted.
  6. Repeat the same test for **Certifications**:
     - Name: `Oracle Certified Professional Java Developer`
     - Organization: `Oracle`
     - Date: Select any recent date
     - Credential URL: `https://example.com/cert/1234`
     - Add certification, verify listing, test modal delete.

---

### Test Suite 8: Resume Upload & File Validation
- **Objective:** Verify client-side 10MB limit enforcement, format restriction, and upload synchronization (`POST /api/v1/resumes/me`).
- **Steps:**
  1. Navigate to `/student/resume`.
  2. **Test File Size Limit (>10 MB):**
     - Attempt to select or drop a file larger than 10 MB.
     - **Expected Observation:** An error banner appears immediately stating: "Selected file (X MB) exceeds the maximum allowed limit of 10 MB." The file is not uploaded.
  3. **Test Unsupported Format:**
     - Attempt to upload an image (`.png` or `.jpg`) or executable (`.exe`).
     - **Expected Observation:** An error banner appears: "Invalid file type. Please upload a PDF (.pdf) or Word document (.doc, .docx)."
  4. **Test Valid Upload:**
     - Select a valid PDF resume file (<10 MB).
     - Verify the file preview displays the file name and size in KB/MB.
     - Click **"Upload & Synchronize"**.
  5. **Expected Observation:**
     - Upload progress button shows "Uploading & Processing...".
     - Success banner displays "Resume uploaded and synchronized successfully."
     - Active Resume card updates to show the uploaded file name, file size, timestamp, and processing status (`COMPLETED` or `PENDING`).
  6. Return to `/student/dashboard`:
     - Verify the Recruiter Visibility banner updates if all required fields are now satisfied.

---

### Test Suite 9: Feature Unavailable Placeholders
- **Objective:** Verify that missing backend endpoints show honest unavailable states.
- **Steps:**
  1. Click **"Drives"** in the student navigation or visit `/student/drives`.
  2. Verify the page displays a clear notice: **"Student Drive Discovery — Not Available Yet"**.
  3. Verify it explains that backend `PlacementDriveController` does not currently expose a student-facing listing endpoint.
  4. Click **"Applications"** in the student navigation or visit `/student/applications`.
  5. Verify the page displays: **"Application Management & Tracking — Not Available Yet"**.
  6. Verify neither page uses fake mock data or fabricated application stages.

---

### Test Suite 10: Company Registration & Onboarding
- **Objective:** Verify recruiter registration and the initial `PENDING` approval state (`POST /api/v1/auth/register/company`).
- **Steps:**
  1. Sign out of any active session.
  2. Navigate to `/register/company`.
  3. Fill out the form:
     - **Company Name:** `Tata Consultancy Services`
     - **Corporate Email:** `campus.recruitment@tcs-demo.com`
     - **GSTIN:** `24AAACT2727Q1ZW`
     - **Contact Phone:** `9825012345`
     - **Website:** `https://tcs.com`
     - **Office Address:** `Infocity Tower 1, Gandhinagar, Gujarat - 382007`
     - **Password:** `CampusRecruit@2026`
     - **Confirm Password:** `CampusRecruit@2026`
  4. Click **"Submit for Officer Approval"**.
  5. **Expected Observation:**
     - The page transitions to the "Registration Submitted — Verification in Progress" screen.
     - Explains that the account is in `PENDING` status awaiting placement team review.

---

### Test Suite 11: Admin / Officer Company Approval Queue
- **Objective:** Verify reviewing and approving/rejecting pending companies (`GET+POST /api/v1/admin/companies/...`).
- **Steps:**
  1. Sign in with an officer or admin account (or an account with `PLACEMENT_OFFICER` or `ADMIN` role).
  2. Navigate to `/officer/approvals`.
  3. **Expected Observation:**
     - The pending company `Tata Consultancy Services` is listed with its email, GSTIN (`24AAACT2727Q1ZW`), and address.
     - Status badge shows `PENDING`.
  4. Click **"Approve"**:
     - A confirmation modal opens: "Approve Company Onboarding for 'Tata Consultancy Services'?"
     - Click **"Approve & Activate"**.
  5. **Expected Observation:**
     - Success banner displays: `Organization "Tata Consultancy Services" approved successfully.`
     - The company disappears from the pending queue (status transitioned to `ACTIVE`).

---

### Test Suite 12: Officer Company Management & Direct Provisioning
- **Objective:** Verify company directory, provisioning with temporary credentials, and editing company information (`/api/v1/placement-officers/me/companies`).
- **Steps:**
  1. Navigate to `/officer/companies`.
  2. Verify all organizations are listed in the table with pagination and status filters (All, Active, Pending, Rejected).
  3. Click **"+ Provision Company"**:
     - A modal appears to provision a company directly.
     - Enter Company Name: `Infosys Ltd`
     - Email: `recruitment@infosys-demo.com`
     - Temporary Password: `TempPass@2026`
     - GSTIN: `29AAACI4818H1ZQ`
     - Address: `Electronics City, Bengaluru`
     - Click **"Provision Organization"**.
  4. **Expected Observation:**
     - Success message appears: `Organization "Infosys Ltd" provisioned successfully.`
     - Infosys Ltd appears in the company table.
  5. On the Infosys row, click **"Edit Info"**:
     - Update the Phone to `080-28520261`.
     - Click **"Save Changes"**.
     - Verify the updated phone displays in the directory.

---

### Test Suite 13: Company Dashboard & Placement Drives
- **Objective:** Verify company drive creation, lifecycle transitions (Draft → Published → Closed), and editing rules.
- **Steps:**
  1. Sign out and log in as the approved company (`campus.recruitment@tcs-demo.com` / `CampusRecruit@2026`).
  2. Navigate to `/company/dashboard`:
     - Verify Company Profile card displays: Status `ACTIVE`, GSTIN `24AAACT2727Q1ZW`.
     - Verify Drives overview card displays drive statistics.
  3. Navigate to `/company/drives/new`:
     - **Job Title:** `Assistant System Engineer - Trainee`
     - **Description:** `Development and testing of enterprise cloud applications.`
     - **Location:** `Ahmedabad / Gandhinagar`
     - **CTC:** `7.2`
     - **Vacancies:** `25`
     - **Required Course:** `MCA / M.Sc. IT`
     - **Target Graduation Year:** `2026`
     - **Minimum CGPA:** `7.0`
     - **Maximum Backlogs:** `0`
     - **Applications Open From:** Set to current date/time
     - **Application Deadline:** Set to date 14 days in future
     - Click **"Create Draft Drive"**.
  4. Verify redirection to `/company/drives`:
     - The drive appears with status badge `DRAFT`.
  5. Click **"Edit"** on the draft drive:
     - Change CTC from `7.2` to `7.5`.
     - Click **"Update Draft Drive"**.
     - Verify CTC updates to `₹7.5 LPA`.
  6. **Publish Drive:**
     - In the actions column, click **"Publish"**.
     - A modal prompts: "Once published, the drive cannot be edited and will become active for candidates."
     - Click **"Publish Drive"**.
     - Verify status transitions to `PUBLISHED`.
     - Verify the "Edit" button is now hidden (backend does not allow editing published drives).
  7. **Close Drive:**
     - Click **"Close Drive"**.
     - Confirm in modal.
     - Verify status transitions to `CLOSED`.

---

### Test Suite 14: Route Guards & Access Control
- **Objective:** Verify role-based routing protection and unauthorized handling.
- **Steps:**
  1. While logged in as `COMPANY`, attempt to manually enter `/student/dashboard` in the browser address bar.
  2. **Expected Observation:**
     - Access is blocked. The user is redirected to `/unauthorized` (HTTP 403 Access Restricted).
     - Page displays: "You do not have administrative or role-level permissions to access this section."
     - Click "Go to Your Dashboard": redirected to `/company/dashboard`.
  2. While logged in as `STUDENT`, attempt to access `/officer/approvals`.
     - Redirected to `/unauthorized`.
  3. Sign out completely and attempt to access `/student/profile`.
     - Redirected to `/login` with return location preserved in state.

---

### Test Suite 15: Token Refresh & Sign Out
- **Objective:** Verify silent JWT refresh on 401 and clean logout cleanup.
- **Steps:**
  1. Open Developer Tools (`F12`) → Application → Local Storage.
  2. Inspect `ps_access_token`, `ps_refresh_token`, and `ps_user`.
  3. Click **"Sign Out"** in the header.
  4. Verify that:
     - `ps_access_token`, `ps_refresh_token`, and `ps_user` are completely removed from Local Storage.
     - User is redirected to `/login`.
