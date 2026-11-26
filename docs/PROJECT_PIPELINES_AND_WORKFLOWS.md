# Placement Setu: Project Pipelines & Workflow Architecture

**Platform:** Placement Setu (Gujarat Vidyapith Campus Placement Platform)
**Document:** End-to-End Architecture Pipelines, Asynchronous Processing, Drive Approval & Security Flows

---

## 1. Overall Campus Placement Lifecycle Pipeline

The diagram below illustrates the end-to-end institutional workflow from student enrollment and company provisioning to placement drive approval, candidate matching, application evaluation, and final job offer locking.

```mermaid
flowchart TD
    subgraph S1["1. Onboarding & Provisioning"]
        A1["Student Self-Registers (/auth/register/student)"] --> A2["Complete Profile, Skills & APPAR ID"]
        B1["Placement Officer Provisions Company (/officer/companies)"] --> B2["Company Issued Temporary Password (must_change_password=true)"]
        B2 --> B3["Company Signs In (/auth/login)"]
        B3 --> B4["Mandatory First-Time Password Reset (/auth/change-password)"]
        B4 --> B5["Company Account ACTIVE"]
    end

    subgraph S2["2. Resume Ingestion & AI Parsing (Single Resume Flow)"]
        A2 --> C1["Upload Resume PDF/DOCX (Single File)"]
        C1 --> C2["ResumeStorageService validates file & stores securely"]
        C2 --> C3["Text Extraction (PDFBox / Apache POI)"]
        C3 --> C4["Gemini AI Parsing Engine"]
        C4 --> C5["Auto-populate Skills, Education, Projects & Socials"]
        C5 --> C6["Profile Completion % Calculated"]
        C6 --> C7{"Profile Completed?"}
        C7 -- Yes --> C8["Available for Candidate Search & Applications"]
        C7 -- No --> C9["Student Alerted with Missing Fields"]
    end

    subgraph S3["3. Placement Drive & Officer Approval Flow"]
        B5 --> D1["Company Creates Drive (Status: DRAFT)"]
        D1 --> D2["Set Criteria (Course, Min CGPA, Max Backlogs, Min Stipend, Skills)"]
        D2 --> D3["Company Submits for Review (POST /api/v1/companies/me/drives/{id}/submit)"]
        D3 --> D4["Status: PENDING_APPROVAL"]
        D4 --> D5{"Placement Officer Review\n(/api/v1/placement-officers/drives)"}
        D5 -- Reject with Remarks --> D6["Status: REJECTED (Company edits & resubmits)"]
        D6 --> D1
        D5 -- Approve --> D7["Status: PUBLISHED"]
        D7 --> D8["Visible to Students & Public Explorer (/public/drives)"]
        D7 --> D9["Broadcast In-App & Email Notifications Dispatched"]
    end

    subgraph S4["4. Candidate Search & Skill Match Ranking"]
        B5 & D7 --> M1["Company Searches Candidates (/companies/me/candidates)"]
        M1 --> M2["Filter by Skills, Course, Min CGPA, Max Backlogs"]
        M2 --> M3["Candidate Drive Match Score Engine (/companies/me/drives/{id}/candidates)"]
        M3 --> M4["Normalize Skills & Compute Match %"]
        M4 --> M5["Rank Candidates by Match Score & Eligibility"]
        M5 --> M6["Privacy Shield: Email & Phone Masked until Candidate Applies"]
    end

    subgraph S5["5. Application Pipeline & Policy Evaluation"]
        C8 & D7 --> E1["Student Applies to Drive (/drives/{id}/apply)"]
        E1 --> E2{"Placement Policy Engine"}
        E2 -- "Already Placed (No Dream Offer)" --> E3["Rejected: One Student One Job Policy"]
        E2 -- "Age > Max Age" --> E4["Rejected: Age Limit Exceeded"]
        E2 -- "CGPA < Min CGPA / Backlogs > Limit" --> E5["Rejected: Academic Criteria Not Met"]
        E2 -- "All Criteria Met" --> E6["Application Created: APPLIED"]
    end

    subgraph S6["6. Recruiter Pipeline & Final Selection"]
        E6 --> F1["Recruiter Evaluates Applicants (/applications)"]
        F1 --> F2["Status: UNDER_REVIEW"]
        F2 --> F3["Status: SHORTLISTED"]
        F3 --> F4["Status: INTERVIEW_SCHEDULED"]
        F4 --> F5{"Selection Decision"}
        F5 -- Selected --> F6["Status: SELECTED -> Student Profile placement_locked=true"]
        F5 -- Rejected --> F7["Status: REJECTED -> Candidate Released"]
        F1 & F2 & F3 & F4 & F5 --> F8["Every Transition Logged in application_status_history"]
    end
```

---

## 2. Drive Approval Workflow Pipeline

To safeguard students against substandard or unauthorized job postings, companies cannot publish drives directly to students:

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Company Recruiter
    participant Web as Recruiter Portal
    participant DC as PlacementDriveController
    participant DS as PlacementDriveService
    participant DB as PostgreSQL
    actor Officer as Placement Officer
    participant OC as OfficerDriveController
    participant NS as NotificationService

    Recruiter->>Web: Create job drive details
    Web->>DC: POST /api/v1/placement-drives (Status: DRAFT)
    DC->>DS: createDrive()
    DS->>DB: Save PlacementDrive (status = DRAFT)

    Recruiter->>Web: Click "Submit for Approval"
    Web->>DC: POST /api/v1/placement-drives/{driveId}/publish
    DC->>DS: submitForApproval(driveId)
    DS->>DB: Update PlacementDrive (status = PENDING_APPROVAL)
    DS-->>Web: Drive submitted for institutional review

    Note over Officer,DB: Placement Officer Review Queue
    Officer->>OC: GET /api/v1/placement-officers/drives?status=PENDING_APPROVAL
    OC->>DB: Fetch pending drives with company profiles
    DB-->>Officer: Display pending drive queue

    alt Officer Approves
        Officer->>OC: POST /api/v1/placement-officers/drives/{driveId}/approve
        OC->>DS: approveDrive(driveId, officerUser)
        DS->>DB: Update status = PUBLISHED, reviewed_by = officerId, reviewed_at = now()
        DS->>NS: Broadcast new drive notification to eligible students
        OC-->>Officer: Drive approved and published
    else Officer Rejects
        Officer->>OC: POST /api/v1/placement-officers/drives/{driveId}/reject body: { reason }
        OC->>DS: rejectDrive(driveId, reason, officerUser)
        DS->>DB: Update status = REJECTED, rejection_reason = reason, reviewed_at = now()
        DS->>NS: Send notification to Company with feedback
        OC-->>Officer: Drive rejected (Company can edit and resubmit)
    end
```

---

## 3. Application Pipeline & Audit History

All student applications progress through explicit pipeline stages. Every status change creates an immutable audit row in `application_status_history`:

```mermaid
stateDiagram-v2
    [*] --> APPLIED: Student applies via portal
    APPLIED --> UNDER_REVIEW: Recruiter begins reviewing profile & resume
    UNDER_REVIEW --> SHORTLISTED: Candidate meets initial screening criteria
    UNDER_REVIEW --> REJECTED: Candidate does not meet requirements
    SHORTLISTED --> INTERVIEW_SCHEDULED: Interview date/link assigned
    SHORTLISTED --> REJECTED: Candidate rejected during technical review
    INTERVIEW_SCHEDULED --> SELECTED: Candidate passes interview & receives offer
    INTERVIEW_SCHEDULED --> REJECTED: Candidate rejected after interview
    SELECTED --> [*]: Profile placement_locked=true
    REJECTED --> [*]: Candidate available for other drives
```

### Audit Log Schema (`application_status_history`)
Every transition captures:
- `id`: UUID (Primary Key)
- `application_id`: UUID (FK to `applications`)
- `from_status`: Previous `ApplicationStatus` (nullable for initial creation)
- `to_status`: New `ApplicationStatus`
- `changed_by`: UUID (FK to `users`, the recruiter or officer who transitioned the status)
- `feedback`: String (Optional interview feedback, rejection reason, or score notes)
- `changed_at`: Timestamp (UTC)

---

## 4. Candidate Search & Match Score Pipeline

Recruiters (`ROLE_COMPANY`) can search the university candidate database and inspect match scores against specific job drives:

```mermaid
flowchart TD
    Start["Company opens Candidate Search"] --> Query["GET /api/v1/companies/me/candidates\n(skills, course, minCgpa, maxBacklogs)"]
    Query --> SearchService["CandidateMatchingService"]
    SearchService --> Filter["Filter Students with Completed Profile"]
    Filter --> Privacy["Privacy Mask: Mask email, phone, and address"]
    Privacy --> ReturnList["Return Paginated Candidates List"]

    ReturnList --> DriveMatch["GET /api/v1/companies/me/drives/{driveId}/candidates"]
    DriveMatch --> IDOR["IDOR Verification: Verify Drive belongs to authenticated Company"]
    IDOR -- Unauthorized --> Forbidden["HTTP 403 Forbidden"]
    IDOR -- Authorized --> MatchEngine["Execute Skill Match & Eligibility Engine"]

    subgraph MatchEngine["Skill Matching Engine"]
        Normalize["Normalize Skills (lowercase, trim, alias mapping:\n'js' -> 'javascript', 'reactjs' -> 'react', 'py' -> 'python')"]
        CalcScore["MatchScore = (Matched Required Skills / Total Required Skills) * 100"]
        CheckEligible["Check Academic Criteria:\nCGPA >= Min CGPA\nBacklogs <= Max Backlogs\nCourse in Eligible Courses"]
    end

    MatchEngine --> Response["Return Candidates Ranked by Match Score:\n- matchScore (%)\n- matchedSkills\n- missingSkills\n- eligible (boolean)\n- Masked Contact Details"]
```

---

## 5. Single Resume Ingestion & Asynchronous AI Parsing

Batch resume uploads are fully removed; each student manages their own individual resume:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as ResumeController
    participant Service as ResumeService
    participant Storage as ResumeStorageService
    participant AI as GeminiAiParser
    participant DB as PostgreSQL
    participant Notif as NotificationService

    Student->>API: POST /api/v1/resumes/me (Multipart: .pdf / .docx / .txt)
    API->>Service: uploadResume(studentId, file)
    Service->>Storage: Validate extension & save to local storage
    Service->>DB: Save Resume metadata (status: PROCESSING)

    Service->>AI: Extract raw text via Apache PDFBox / POI
    AI->>AI: Call Google Gemini API (structured extraction)
    AI-->>Service: Structured JSON (skills, experience, projects, education)

    Service->>DB: Upsert StudentProfile skills, projects, and summary
    Service->>DB: Update Resume record (status: COMPLETED)
    Service->>Notif: Dispatch in-app notification to student
    Service-->>API: Return ResumeResponseDto
    API-->>Student: HTTP 200 OK with parsed profile summary
```

---

## 6. Multi-Tier Security & Rate Limiting Pipeline

All incoming HTTP requests pass through the unified `RateLimitingFilter`:

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> F1{"Path starts with /api/v1/?"}
    F1 -- No --> PassThrough["Pass to Security Filter Chain (Swagger, static, etc.)"]
    F1 -- Yes --> IP["Resolve Client IP (X-Forwarded-For or RemoteAddr)"]

    IP --> T1{"Global Tier Check\nMax 120 req/min per IP"}
    T1 -- Exceeded --> R429["Return HTTP 429: Global API limit exceeded"]
    T1 -- Allowed --> T2{"Target Path Scope"}

    T2 -- "/api/v1/auth/*" --> A1{"Auth Limit: 15 req/min"}
    A1 -- Exceeded --> R429A["Return HTTP 429: Too many auth attempts"]
    A1 -- Allowed --> HeadersA["Set X-RateLimit Headers (Limit: 15)"] --> SecurityChain

    T2 -- "/api/v1/resumes/*" --> B1{"Upload Limit: 5 req/min"}
    B1 -- Exceeded --> R429B["Return HTTP 429: Resume upload limit exceeded"]
    B1 -- Allowed --> HeadersB["Set X-RateLimit Headers (Limit: 5)"] --> SecurityChain

    T2 -- "Mutation (POST/PUT/PATCH/DELETE)" --> C1{"Mutation Limit: 40 req/min"}
    C1 -- Exceeded --> R429C["Return HTTP 429: Mutation rate limit exceeded"]
    C1 -- Allowed --> HeadersC["Set X-RateLimit Headers (Limit: 40)"] --> SecurityChain

    T2 -- "Public Browsing (/api/v1/public/*)" --> D1{"Public Limit: 60 req/min"}
    D1 -- Exceeded --> R429D["Return HTTP 429: Public browsing limit exceeded"]
    D1 -- Allowed --> HeadersD["Set X-RateLimit Headers (Limit: 60)"] --> SecurityChain

    SecurityChain["Proceed to Spring Security Filter Chain"]
```
