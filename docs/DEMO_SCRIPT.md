# 🎓 Placement-Setu — HOD & Dean Live Demonstration Runbook

> **Platform:** Gujarat Vidyapith Campus Placement & Recruitment System (ગૂજરાત વિદ્યાપીઠ પ્લેસમેન્ટ સેતુ)  
> **Audience:** Head of Department (HOD), Placement Officers, Academic Council, Recruiters  
> **Activation Profile:** `demo` (Spring Boot 3.2 + PostgreSQL + React 18 / Vite)

---

## ⚡ 1. How to Launch in Demo Mode

### Step 1: Start Backend with `demo` Profile
Open a terminal in the repository root:
```powershell
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=demo
```
*(On Linux/macOS: `./mvnw spring-boot:run -Dspring-boot.run.profiles=demo`)*

> **Automatic Data Population:**  
> When the `demo` profile is activated, `DemoDataSeeder` automatically verifies and seeds all required demo entities using Spring Security's `PasswordEncoder` (BCrypt). It is **100% idempotent**—restarting the application will not duplicate records or cause constraint errors.

### Step 2: Start Frontend Application
In a second terminal:
```powershell
cd frontend
npm run dev
```
Open your browser to: **`http://localhost:5173`**

---

## 🔑 2. Seeded Demo Accounts Catalogue

All demo accounts share the single standardized demo password configured in `application-demo.yml`:  
**`Demo@12345`**

| Role | Email | Password | Persona & Key Attributes | Purpose in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Placement Officer** | `officer@vidyapith.edu` | `Demo@12345` | Head of University Placement Cell | Approves drives, provisions companies, monitors university statistics. |
| **Master Admin** | `admin@placementsetu.local` | `ChangeMe@123` | System Administrator (from `V2__seed_data.sql`) | System settings and top-level administrative operations. |
| **Company Recruiter** | `tcs@recruiter.com` | `Demo@12345` | Tata Consultancy Services (Rajesh Mehta) | Posts Java/AI drives, searches candidates, shortlists applicants. |
| **Company Recruiter** | `infosys@recruiter.com` | `Demo@12345` | Infosys Limited (Priya Nair) | Posts Full Stack drives, reviews candidate match scores. |
| **Student 1** | `student1@vidyapith.edu` | `Demo@12345` | **Aarav Patel** · MCA · CGPA 8.85 · Java/Spring/PostgreSQL specialist | Exhibits **100% Match** for Java Drive, status: `SHORTLISTED`. |
| **Student 2** | `student2@vidyapith.edu` | `Demo@12345` | **Diya Shah** · MCA · CGPA 8.50 · React/Node/Full Stack specialist | Exhibits **100% Match** for Infosys Full Stack, status: `INTERVIEW_SCHEDULED`. |
| **Student 3** | `student3@vidyapith.edu` | `Demo@12345` | **Rohan Joshi** · M.Sc. IT · CGPA 8.20 · Python/ML & SQL specialist | Exhibits placement success: status `SELECTED` (Offer Extended!). |
| **Student 4** | `student4@vidyapith.edu` | `Demo@12345` | **Neha Desai** · BCA · CGPA 7.60 · 1 Backlog · General software skills | Exhibits policy filtering and candidate match variations. |
| **Student 5** | `student5@vidyapith.edu` | `Demo@12345` | **Kavya Trivedi** · MCA · CGPA 9.10 · **Fresh Profile** (0 Applications, No Resume) | **Reserved for Live KYC & Resume Upload Demo!** |

---

## 📋 3. Seeded Placement Drives Summary

| Drive Title | Company | Status | CTC / Package | Eligibility Criteria | Purpose in Demo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Software Engineer - Java Backend** | TCS | `PUBLISHED` | ₹7.00 LPA | MCA · Min CGPA 7.0 · Max 1 Backlog · Skills: Java, Spring Boot, PostgreSQL, REST | Recruiter talent search & candidate ranking demo. |
| **Systems Associate - Full Stack Web** | Infosys | `PUBLISHED` | ₹6.50 LPA | MCA · Min CGPA 7.5 · 0 Backlogs · Skills: React, JavaScript, Node.js, SQL | Student drive exploration and one-click application demo. |
| **Data Analyst & AI Intern** | TCS | `PENDING_APPROVAL` | ₹5.00 LPA (₹25k/mo stipend) | M.Sc. IT · Min CGPA 7.5 · 0 Backlogs · Skills: Python, Machine Learning, SQL | **Live Officer Approval Queue demo.** |
| **Associate Cloud & DevOps Engineer** | Infosys | `DRAFT` | ₹8.00 LPA | MCA · Min CGPA 8.0 · 0 Backlogs · Skills: Docker, Kubernetes, AWS | **Company drive submission workflow demo.** |

---

## 🎬 4. Ten-Step HOD Live Demonstration Script

Follow these 10 structured steps to present a comprehensive end-to-end walkthrough of Placement-Setu to the HOD:

```
[Public Portal] ──▶ [Officer Approval] ──▶ [Company Drive Submission] ──▶ [AI Resume Parsing] ──▶ [Candidate Matching & Shortlisting]
```

### Step 1: Public Institutional Landing & Drive Discovery
1. Navigate to `http://localhost:5173`.
2. Showcase the **Gujarat Vidyapith institutional palette** (Earth Brown `#563828`, Olive Green accents, Cream background).
3. Scroll through the **Live Placement Statistics** counter, partner corporate logos (TCS, Infosys), and the **Latest Placement Drives** preview.
4. Click **"Placement Drives"** in the top navigation:
   - Point out that visitors can browse published drives and view packages (e.g. ₹7.0 LPA, ₹6.5 LPA) without logging in.
   - Click "Apply Now" on any drive $\rightarrow$ Highlight that the portal gracefully redirects to `/login` with an action notice.

---

### Step 2: Officer Sign-In & Central Command Center
1. Navigate to `/login`.
2. Sign in as the University Placement Officer:
   - **Email:** `officer@vidyapith.edu`
   - **Password:** `Demo@12345`
3. Showcase the **Officer Command Center (`/officer/dashboard`)**:
   - Point out key metrics: Total Drives, Total Registered Students, Active Companies, and Total Offers.
   - Show the quick action shortcuts: "Review Pending Drives", "Manage Companies", and "Institutional Policy Rules".

---

### Step 3: Officer Provisions a Corporate Partner Account
1. From the Officer Sidebar, click **"Companies"** (`/officer/companies`).
2. Show existing corporate partners (Tata Consultancy Services, Infosys Limited) with their GSTIN, contact person, and ACTIVE status.
3. Click **"+ Add New Company"**:
   - Enter Company Name: `Wipro Technologies`
   - Recruiter Email: `campus@wipro-demo.com`
   - Contact Person: `Siddharth Rao`
   - Phone: `9876501234`
   - GSTIN: `24AAACW9999Z1Z8`
4. Click **"Provision Recruiter Account"**:
   - Highlight the modal that generates a secure, one-time temporary password.
   - Explain that corporate accounts do not self-register, upholding Gujarat Vidyapith's security policy.

---

### Step 4: Company Recruiter Logs In & Explores Portal
1. Click the top user pill $\rightarrow$ click **"Sign Out"**.
2. Sign in as TCS Corporate Recruiter:
   - **Email:** `tcs@recruiter.com`
   - **Password:** `Demo@12345`
3. The browser lands on the **Company Recruiter Dashboard (`/company/dashboard`)**.
4. Point out the recruiter greeting, company details (Tata Consultancy Services, Gandhinagar), and current active drive metrics.

---

### Step 5: Recruiter Creates & Submits Placement Drive
1. Click **"My Drives"** (`/company/drives`) in the recruiter sidebar.
2. Note the draft drive and published drive.
3. Click **"+ Create New Placement Drive"**:
   - **Job Title:** `Associate Mobile App Developer (Flutter)`
   - **Drive Type:** Full-Time (FTE)
   - **CTC:** `600000` (₹6.0 LPA)
   - **Vacancies:** `10`
   - **Required Course:** `Master of Computer Applications (MCA)`
   - **Min CGPA:** `7.0`
   - **Max Backlogs:** `1`
   - **Required Skills:** `Dart`, `Flutter`, `REST APIs`, `Git`
4. Click **"Submit for Approval"**:
   - Point out that the drive transitions directly to `PENDING_APPROVAL` with the badge *"Awaiting Officer Review"*.
   - Mention the compliance safeguard: A company cannot publish directly to students without university approval.

---

### Step 6: Placement Officer Reviews & Approves the Drive
1. Sign out of TCS and sign back in as Officer (`officer@vidyapith.edu` / `Demo@12345`).
2. Navigate to **"Drive Approvals"** (`/officer/approvals`).
3. Show the **"Pending Drives"** queue:
   - Find the seeded drive: **"Data Analyst & AI Intern"** by TCS (or the newly submitted Flutter drive).
   - Show the job description, CTC, stipend (₹25,000/mo), and eligibility criteria.
4. Click **"Approve Drive"** $\rightarrow$ Confirm approval.
   - The drive status immediately transitions to `PUBLISHED`.
   - Point out that students and the public portal can now see this drive in real time.

---

### Step 7: Fresh Student Signs In & Uploads Resume (Live KYC Demo)
1. Sign out and sign in as the fresh student:
   - **Email:** `student5@vidyapith.edu`
   - **Password:** `Demo@12345`
2. Land on the **Student Dashboard (`/student/dashboard`)**:
   - Point out that Kavya's profile completion shows initial status, and no resume is uploaded yet.
3. Navigate to **"My Profile / KYC"** (`/student/profile`):
   - Click **"Upload Resume & Auto-Fill"**.
   - Drag & drop a sample PDF/DOCX resume file (or click to upload any document).
   - Highlight the **Google Gemini AI Entity Extraction** banner:
     - Automatically parses skills, projects, institutions, and dates.
     - Profile completion jumps to **100% COMPLETE**.

---

### Step 8: Student Browses & Applies for Drive
1. From the student sidebar, click **"Placement Drives"** (`/student/drives`).
2. Show the active published drives (TCS Java Backend, Infosys Full Stack Web, TCS AI Intern).
3. Select **"Software Engineer - Java Backend"**:
   - Review eligibility criteria (MCA, Min CGPA 7.0, Max 1 backlog).
   - Point out the institutional policy engine: Student meets CGPA (9.10) and has 0 backlogs $\rightarrow$ Green **"Eligible to Apply"** badge.
4. Click **"Confirm & Submit Application"**:
   - Instant confirmation popup appears.
   - Application status displays as `APPLIED`.
5. Click **"My Applications"** (`/student/applications`) to show the real-time application tracker.

---

### Step 9: Recruiter Searches & Ranks Candidates (Match Scoring & Privacy)
1. Sign out of student and sign back in as TCS Recruiter (`tcs@recruiter.com` / `Demo@12345`).
2. In the sidebar, click **"Find Candidates"** (`/company/candidates`):
   - **Search Mode 1: Talent Discovery Filter**
     - Click the skill chip **"Java"** and course **"Master of Computer Applications (MCA)"**.
     - Review candidate cards: Aarav Patel (8.85 CGPA), Kavya Trivedi (9.10 CGPA), Neha Desai (7.60 CGPA).
     - **Highlight Privacy Safeguard:** Notice that email addresses and phone numbers are safely masked with a privacy shield notice for candidates who haven't applied.
   - **Search Mode 2: Drive Match Ranking**
     - Click **"My Drives"** $\rightarrow$ on the **"Software Engineer - Java Backend"** drive, click **"Matched Candidates 🎯"**.
     - Notice the exact ranking:
       - **Aarav Patel:** **100% Match** (Green badge: matched Java, Spring Boot, PostgreSQL, REST APIs).
       - Full contact info (`aarav.patel@vidyapith.edu`, `9876543201`) is visible because Aarav applied!

---

### Step 10: Recruiter Shortlists Candidate & Updates Status
1. In the Drive Matched Candidates view for Aarav Patel:
   - Click the **"Shortlist Candidate"** action button.
   - Confirm shortlisting.
   - A success banner confirms: *"Candidate Aarav Patel has been successfully SHORTLISTED for this placement drive."*
2. Sign out and sign back in as **Aarav Patel** (`student1@vidyapith.edu` / `Demo@12345`):
   - Open **"My Applications"** (`/student/applications`).
   - Notice the status badge has updated to **`SHORTLISTED`** with recruiter remarks.
3. Conclude the demonstration by highlighting the complete automated loop between students, corporate recruiters, and the placement cell.

---

## 🛠️ 5. Troubleshooting & FAQ for Demo Presenter

* **Q: Can I reset the demo data back to clean state?**  
  *A:* Simply truncate or drop the database tables and re-run with `-Dspring-boot.run.profiles=demo`. Flyway will run all migrations and `DemoDataSeeder` will re-populate all 12 entities fresh.
* **Q: Does demo mode send real emails?**  
  *A:* No. Under demo/local profile, `MAIL_ENABLED` defaults to `false`. All outbound notification emails are safely queued in the `email_outbox` table and can be inspected without spamming external mail servers.
* **Q: Can other roles sign in with `Demo@12345`?**  
  *A:* Yes! Every seeded demo account (`officer@vidyapith.edu`, `tcs@recruiter.com`, `infosys@recruiter.com`, and `student1@vidyapith.edu` through `student5@vidyapith.edu`) uses `Demo@12345`.
