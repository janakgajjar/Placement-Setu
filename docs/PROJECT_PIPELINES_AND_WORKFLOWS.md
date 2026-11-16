# Placement Setu: Project Pipelines & Workflow Architecture

**Platform:** Placement Setu (Gujarat Vidyapith Campus Placement Platform)  
**Document:** End-to-End Architecture Pipelines, Asynchronous Processing & Security Flows  

---

## 1. Overall Campus Placement Lifecycle Pipeline

The diagram below illustrates the end-to-end institutional workflow from student and company onboarding to placement drives, policy evaluation, shortlisting, and final job offer.

```mermaid
flowchart TD
    subgraph S1["1. Onboarding & Registration"]
        A1["Student Registers"] --> A2["Complete Profile & APAAR ID"]
        B1["Company Registers"] --> B2["Account in PENDING state"]
        B2 --> B3{"Placement Officer Review"}
        B3 -- Reject --> B4["Company Notified with Reason"]
        B3 -- Approve --> B5["Company Account ACTIVE"]
    end

    subgraph S2["2. Resume Ingestion & AI Parsing"]
        A2 --> C1["Upload Resume (PDF/DOCX/TXT)"]
        C1 --> C2{"Upload Mode"}
        C2 -- "Single (Async)" --> C3["Background Worker Pipeline"]
        C2 -- "Bulk Batch" --> C4["Batch Queue (Max 50 files)"]
        C3 & C4 --> C5["Text Extraction (PDFBox / POI)"]
        C5 --> C6["Gemini AI Parsing Engine"]
        C6 --> C7["Auto-populate Skills & Projects"]
        C7 --> C8["Compute Profile Status"]
        C8 --> C9{"Profile Complete?"}
        C9 -- Yes --> C10["visible_to_companies = true"]
        C9 -- No --> C11["Student Alerted (Missing Fields)"]
    end

    subgraph S3["3. Placement Drive Management"]
        B5 --> D1["Create Drive in DRAFT"]
        D1 --> D2["Set Criteria (CGPA, Backlogs, Age, Type, Stipend)"]
        D2 --> D3{"Paid Internship Check"}
        D3 -- "< ₹10,000/mo" --> D4["Blocked: Min Stipend Policy Violation"]
        D3 -- "Valid" --> D5["Publish Drive (Status: PUBLISHED)"]
        D5 --> D6["Broadcast Notification to Students"]
    end

    subgraph S4["4. Application & Policy Evaluation"]
        C10 & D6 --> E1["Student Applies to Drive"]
        E1 --> E2{"Placement Policy Engine"}
        E2 -- "Already Placed (No Dream Offer)" --> E3["Rejected: One Student One Job Policy"]
        E2 -- "Age > Max Age" --> E4["Rejected: Age Limit Exceeded"]
        E2 -- "CGPA/Backlog Mismatch" --> E5["Rejected: Academic Ineligible"]
        E2 -- "All Criteria Met" --> E6["Application Accepted (APPLIED)"]
    end

    subgraph S5["5. Shortlisting & Final Selection"]
        E6 --> F1["Recruiter Evaluates Applicants"]
        F1 --> F2["Sort by Merit (CGPA desc, Backlogs asc, Date asc)"]
        F2 --> F3["Finalize Shortlist (SHORTLISTED)"]
        F3 --> F4["Interviews / Assessments"]
        F4 --> F5{"Selection Outcome"}
        F5 -- Selected --> F6["Status: SELECTED -> Placement Locked"]
        F5 -- Rejected --> F7["Status: REJECTED -> Candidate Released"]
    end
```

---

## 2. Background Asynchronous & Batch Resume Parsing Pipeline

This pipeline details how student single uploads and officer batch uploads are processed without blocking web threads, complete with failure isolation, rate limits, and notifications.

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Placement Officer
    participant API as ResumeController
    participant Service as ResumeService
    participant Storage as ResumeStorageService
    participant Queue as Background Worker (Async)
    participant AI as Gemini AI Parser
    participant DB as PostgreSQL (V5 Schema)
    participant Notif as NotificationService
    participant Outbox as EmailOutboxDispatcher
    participant SMTP as SMTP Sink / Mailpit

    User->>API: POST /api/v1/resumes/me/async OR /batch
    API->>Service: uploadAndParseAsync() / submitBatchJob()
    Service->>Storage: Validate extension (.pdf/.docx/.txt) & store on disk
    Service->>DB: Save Resume (Status: PROCESSING) / BatchJob (PENDING)
    Service-->>API: Return HTTP 202 Accepted (Non-blocking response)
    API-->>User: Immediate response with tracking ID

    Note over Queue,AI: Asynchronous Background Execution
    Service-)Queue: Dispatch CompletableFuture async task
    Queue->>Queue: Extract text via PDFBox / Apache POI
    Queue->>AI: Send prompt to Gemini AI API
    AI-->>Queue: Structured JSON (skills, projects, socials)
    Queue->>DB: Update StudentProfile, Skills, and Projects
    Queue->>DB: Set Resume status = COMPLETED / BatchJob = COMPLETED
    
    Note over Queue,Outbox: Atomic Notification & Outbox Dispatch
    Queue->>Notif: notifyResumeProcessed() / notifyBatchCompleted()
    Notif->>DB: Insert in-app Notification record
    Notif->>DB: Insert email_outbox record (Status: PENDING)
    
    Note over Outbox,SMTP: Scheduled Email Outbox Worker (5s interval)
    Outbox->>DB: Poll due outbox items (Status = PENDING)
    Outbox->>SMTP: Deliver email with retry & exponential backoff
    SMTP-->>Outbox: 250 OK
    Outbox->>DB: Update email_outbox (Status: SENT, sent_at = now)
    User->>API: Bell icon queries /api/v1/notifications -> Displays update!
```

---

## 3. Universal Multi-Tier Rate Limiting Pipeline

All incoming requests entering the Placement Setu platform pass through the unified `RateLimitingFilter`:

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> F1{"Path starts with /api/v1/?"}
    F1 -- No --> PassThrough["Pass to Security Filter Chain (Swagger, static, etc.)"]
    F1 -- Yes --> IP["Resolve Client IP (X-Forwarded-For or RemoteAddr)"]

    IP --> T1{"Global Tier Check\nMax 120 req/min per IP"}
    T1 -- Exceeded --> R429["Return HTTP 429 Too Many Requests\nRetry-After: 60\nX-RateLimit-Limit: 120\nX-RateLimit-Remaining: 0"]

    T1 -- Allowed --> T2{"Target Path Scope"}

    T2 -- "/api/v1/auth/*" --> A1{"Auth Limit: 15 req/min"}
    A1 -- Exceeded --> R429A["Return HTTP 429: Too many authentication attempts"]
    A1 -- Allowed --> HeadersA["Set X-RateLimit Headers (Limit: 15)"] --> NextFilter

    T2 -- "/api/v1/resumes/*" --> B1{"Upload Limit: 5 req/min"}
    B1 -- Exceeded --> R429B["Return HTTP 429: Resume upload rate limit exceeded"]
    B1 -- Allowed --> HeadersB["Set X-RateLimit Headers (Limit: 5)"] --> NextFilter

    T2 -- "POST / PUT / PATCH / DELETE" --> C1{"Mutation Limit: 40 req/min"}
    C1 -- Exceeded --> R429C["Return HTTP 429: State mutation rate limit exceeded"]
    C1 -- Allowed --> HeadersC["Set X-RateLimit Headers (Limit: 40)"] --> NextFilter

    T2 -- "Standard GET Request" --> NextFilter["Proceed to Spring Security & Controller"]
```

---

## 4. Institutional Policy Engine Evaluation Pipeline

Before any student application is persisted or placement drive is authorized, it passes through the `PlacementPolicyService`:

```mermaid
flowchart TD
    Start["Student Clicks 'Apply'"] --> P1["Fetch StudentProfile & PlacementDrive"]
    
    P1 --> P2{"Is student already placed?\n(placement_locked == true)"}
    P2 -- Yes --> P3{"Is Drive a Dream Offer?\n(is_dream_offer == true OR CTC >= 8.0 LPA)"}
    P3 -- No --> Reject1["REJECT: One Student One Job Policy\n(Secondary offers restricted)"]
    P3 -- Yes --> P4
    P2 -- No --> P4{"Is Age Limit specified?\n(drive.maximum_age > 0)"}

    P4 -- Yes --> P5{"Has Date of Birth in profile?"}
    P5 -- No --> Reject2["REJECT: Date of birth missing\n(Required for age limit check)"]
    P5 -- Yes --> P6{"Age <= maximum_age?"}
    P6 -- No --> Reject3["REJECT: Age limit exceeded"]
    P6 -- Yes --> P7
    P4 -- No --> P7{"CGPA >= minimum_cgpa?"}

    P7 -- No --> Reject4["REJECT: Minimum CGPA criteria not met"]
    P7 -- Yes --> P8{"Active Backlogs <= maximum_backlogs?"}
    P8 -- No --> Reject5["REJECT: Backlog threshold exceeded"]
    P8 -- Yes --> P9{"Course & Graduation Year Match?"}
    P9 -- No --> Reject6["REJECT: Course or batch ineligible"]
    P9 -- Yes --> Accept["ELIGIBILITY APPROVED\nApplication Created -> In-app Notification Sent"]
```

---

## 5. Security & Build Quality Pipeline

```mermaid
flowchart LR
    subgraph Dev["Development & Code Hygiene"]
        D1["Java 17 / Spring Boot 3.2.5"] --> D2["Modular Monolith Architecture"]
        D2 --> D3["Versioned Flyway Migrations (V1-V5)"]
    end

    subgraph Security["Security Verification"]
        D3 --> S1["Parameterized SQL (No SQLi)"]
        S1 --> S2["XSS Escaping (HtmlUtils)"]
        S2 --> S3["Directory Traversal Guard"]
        S3 --> S4["Rate Limiting Filter"]
        S4 --> S5["Disabled Sourcemaps (Vite)"]
    end

    subgraph Ops["Operational Reliability"]
        S5 --> O1["Transactional Outbox (No Lost Emails)"]
        O1 --> O2["Bounded Exponential Backoff"]
        O2 --> O3["Safe Dev Sandbox (SKIPPED Status)"]
    end
```
