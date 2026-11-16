# Antigravity Master Prompt --- Placement Setu Implementation

## How to use this prompt

1.  Open the existing `Placement-Setu` repository in Antigravity
    (expected local path previously used: `E:\Placement-Setu`).
2.  Make sure the correct project root is open and Git changes are
    visible.
3.  Copy the full prompt below into Antigravity.
4.  Allow it to inspect the repository before changing code. Review its
    proposed plan before accepting large edits.
5.  After implementation, follow the verification tutorial in the
    generated `IMPLEMENTATION_GUIDE.md` and review the final report.

------------------------------------------------------------------------

# COPY EVERYTHING BELOW INTO ANTIGRAVITY

You are a senior Java/Spring Boot, React, PostgreSQL, security, and
background-processing engineer working on the existing **Placement Setu
--- AI-Powered Campus Placement Portal** repository.

Your task is to inspect the actual repository, implement the
requirements below in small, testable changes, and produce detailed
documentation and a step-by-step testing tutorial. Do not merely
generate sample pages or a generic plan. Work with the existing code and
conventions.

## 1. Non-negotiable working rules

1.  **Inspect before editing.** Start by examining the repository tree,
    Git status/branch, `pom.xml`/Gradle files, frontend `package.json`,
    Spring configuration, controllers, services, repositories, entities,
    DTOs, Flyway migrations, tests, and existing resume upload endpoint.
    Produce a concise baseline report.
2.  Compare the actual source against the project status report and
    architecture documents available in the workspace. Mark each feature
    as `Confirmed implemented`, `Partially implemented`, `Missing`, or
    `Unable to verify`. Do not assume a status document is correct if
    code contradicts it.
3.  Do not invent filenames, endpoints, classes, dependencies, existing
    fields, or test results. Name exact files discovered in the
    repository in your implementation plan.
4.  Keep the existing **Spring Boot modular monolith**. Do not split the
    system into microservices.
5.  Preserve the existing project stack and naming conventions: React +
    Vite + Tailwind, Spring Boot/Java, Spring Security/JWT, PostgreSQL,
    Flyway, and Gemini through the current AI integration where
    applicable.
6.  Do not reset, force-push, rebase destructively, delete teammate
    branches, overwrite unrelated changes, or revert user work. Inspect
    `git status` first. Preserve all uncommitted work. Do not commit or
    push unless explicitly requested.
7.  Implement in small, logically separated steps. Before a broad
    change, explain the files to be changed, why, migration
    implications, and tests. Avoid unrelated refactors.
8.  Never place secrets, API keys, database passwords, personal identity
    data, or resume contents in source code or logs.
9.  Do not claim tests passed unless they were actually run. Record
    commands, outcomes, failures, and anything not run.
10. If the repository differs from assumptions in this prompt, adapt to
    the existing implementation and explain the difference instead of
    forcing a conflicting design.
11. First produce the audit and implementation plan. Then proceed with
    implementation in manageable phases, running tests after each phase.
    If an external credential/provider integration is unavailable,
    implement a safe interface/configuration boundary and document the
    remaining manual setup.
12. Do not ask for APAAR verification provider credentials or integrate
    an identity verification provider. APAAR verification is explicitly
    out of scope.

## 2. Requirement A --- APAAR ID: mandatory field only

The requirement is simple: **add an APAAR ID field to student
registration/profile and make it mandatory**.

-   Do not implement APAAR verification, DigiLocker integration,
    external verification APIs, OTP, QR verification, or verification
    status.
-   Do not add Aadhaar collection, Aadhaar document upload, Aadhaar
    verification, or Aadhaar database integration.
-   Inspect the current student registration and profile model, DTOs,
    frontend form, validation, and database schema before deciding where
    the field belongs.
-   Add the field to the appropriate student registration/profile form
    and backend request model.
-   Validate it as required on both frontend and backend. Frontend-only
    validation is insufficient.
-   Follow the existing naming, normalization, length, and validation
    conventions. Do not invent an official APAAR format or checksum
    unless the project already documents one. At minimum, reject null,
    empty, and whitespace-only values.
-   Apply a database constraint only if compatible with the existing
    schema and nullability/migration strategy. Make a safe Flyway
    migration if needed.
-   Determine whether the field must be unique from existing
    institutional requirements. Do not silently add a unique constraint
    that may reject legitimate records; explain the decision.
-   Display the field as a normal required field, with clear helper text
    that entering an APAAR ID does **not** mean it has been verified.
-   Do not log or expose the full identifier in debug/error logs. Mask
    it wherever operational display is necessary.
-   Update relevant DTOs, API documentation, tests, and the
    implementation guide.
-   Existing records may not have APAAR IDs. Handle migration/backfill
    safely: do not make an existing populated database migration fail by
    blindly adding a non-null column without a backfill strategy.
    Explain whether the field is required at registration only or also
    required to complete an existing profile, and implement consistently
    with the product requirement.

Acceptance criteria: - Registration cannot succeed without a non-empty
APAAR ID. - Backend rejects missing/blank APAAR ID even if frontend
validation is bypassed. - A valid submission persists and returns the
field only where needed. - No verification workflow or Aadhaar
functionality is present. - Tests cover missing, blank, and valid
values.

## 3. Requirement B --- Secure resume upload and durable asynchronous processing

Current project context indicates resume upload and Gemini parsing may
already exist. Inspect the actual implementation first and extend it; do
not create a duplicate resume module or duplicate endpoint.

### Required upload behavior

For a single resume: 1. Authenticate the caller and verify that they may
upload for the target student. Prefer the authenticated student's own
account; do not trust a client-supplied student ID without
authorization. 2. Validate size and allowed formats: PDF, DOCX, TXT. 3.
Set a configurable default maximum file size of **5 MB per file**. 4.
Validate actual file content/signature and parseability where practical;
do not trust the extension or browser MIME type alone. 5. Protect
against path traversal, unsafe filenames, malformed files, and
decompression/resource-exhaustion attacks. Use generated storage names,
private storage, and safe parser limits. 6. Calculate a SHA-256 hash of
the original bytes. Use it for integrity/deduplication where
appropriate, not as a substitute for authorization. 7. Store the file in
private storage. For the current MVP, use the project's existing storage
mechanism if safe; do not add cloud object storage unless the current
architecture requires it. 8. In a database transaction, persist resume
metadata and create a durable processing job. Ensure the job is not
visible to a worker before the transaction commits. Use a
transaction-safe design, such as after-commit dispatch or a
database-backed job queue. 9. Return **HTTP 202 Accepted** only after
the file and job have been durably recorded. Return a job ID and current
status. Never wait for Gemini parsing to complete in the upload request.
10. Show the student this exact or equivalent message: **"Your resume
has been uploaded. Processing is in progress."** 11. Provide a status
endpoint and frontend progress/status view. Poll every **3--5 seconds**
while the job is active, with a maximum polling duration and cleanup
when the page unmounts. Do not poll indefinitely. 12. The worker
extracts text, calls Gemini, validates the structured result, and
updates the profile only after validation. 13. Store a safe processing
status and error code. Never return stack traces, local filesystem
paths, raw resume content, prompt text, or secrets to the frontend. 14.
Create notification/outbox events after successful processing or
terminal failure if the current notification architecture supports it.
If notification delivery is not yet implemented, keep the job status
authoritative and document the remaining integration.

### Initial configurable settings

Use central application configuration/environment variables, not
hard-coded values spread throughout the code.

-   Accepted formats: PDF, DOCX, TXT.
-   Maximum individual file size: 5 MB.
-   Maximum batch size: 5 files per request.
-   Worker concurrency: default 2--4 jobs, configurable; choose a safe
    default consistent with provider limits and available resources.
-   AI attempts: maximum 3 attempts for retryable failures.
-   Retry delay: exponential backoff with jitter; respect provider
    `Retry-After` if present.
-   Status polling: every 3--5 seconds, capped by a maximum duration.
-   Stuck-job investigation threshold: configurable; initially flag jobs
    processing longer than 5 minutes.
-   Batch size, file size, worker concurrency, retry count, retry delay,
    polling interval, and stuck-job threshold must be configurable
    through application properties/environment variables where
    appropriate.

Do not assume all jobs exceeding five minutes are safe to cancel.
Identify them, check lease/heartbeat state, and recover them safely.

### Durable queue/worker design

-   Prefer PostgreSQL-backed durable jobs for the MVP, because
    PostgreSQL is already part of the project. Do not add Redis,
    RabbitMQ, Kafka, or a new queue service without demonstrating why it
    is necessary.
-   Use the existing schema and migration conventions. Inspect the
    current `resumes` table and status fields before proposing
    columns/tables.
-   If a job table is needed, implement it through a new Flyway
    migration; never edit an already-applied migration in a way that
    breaks deployed databases.
-   Use atomic job claiming, such as a safe `FOR UPDATE SKIP LOCKED`
    approach or an equivalent locking strategy. Prevent two workers from
    processing the same job concurrently.
-   Keep provider calls outside long database transactions.
-   Add lease/heartbeat or a reliable equivalent so jobs can be
    recovered after worker/server restart.
-   Retry only transient failures: rate limits, temporary network
    errors, provider 5xx/timeouts where appropriate.
-   Do not retry permanent errors such as invalid/corrupt files,
    unsupported format, validation failures, or malformed input that
    cannot improve on retry.
-   Cap attempts at 3. After the final retry, set a terminal failed
    state and provide an authorized/manual retry path if appropriate.
-   Use idempotency/duplicate protection for submissions and job
    execution. Do not create multiple active jobs for the same upload
    without an explicit reason.
-   Handle a crash between file storage and database commit. Explain and
    implement a safe cleanup/reconciliation strategy for orphaned files
    or metadata.
-   Keep processing statuses consistent with the project's conventions.
    If new states are needed, use a documented lifecycle such as
    `QUEUED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, and optionally
    `CANCELLED`.
-   Do not use an in-memory-only `@Async` task as the sole durable
    queue. A managed executor may run the worker, but persisted jobs
    must be the source of truth.

### Batch upload behavior

-   Add batch upload only if it fits the existing API conventions.
-   Maximum 5 files per request.
-   Each file gets its own processing job and status; one invalid file
    must not fail all valid files.
-   Return a batch ID and per-file results (accepted/rejected and
    reason).
-   Provide a batch status endpoint or an equivalent response that
    allows UI to show total, queued, processing, succeeded, and failed
    counts.
-   Protect the endpoint with authorization and limits.
-   Make partial success explicit.
-   Ensure duplicate files and duplicate requests are handled
    idempotently.

### Suggested API contract --- adapt after repository inspection

Do not duplicate routes if equivalent endpoints already exist. Keep
existing route conventions and document the final actual endpoints.

-   Existing single upload route, if present: keep compatible and change
    behavior to return `202 Accepted` plus `jobId`.
-   Batch upload: proposed `POST /api/v1/resume-batches`.
-   Processing status: proposed `GET /api/v1/resume-jobs/{jobId}`.
-   Batch status: proposed `GET /api/v1/resume-batches/{batchId}`.
-   Optional cancellation: `POST /api/v1/resume-jobs/{jobId}/cancel`,
    only if cancellation is safe and useful.

A response may resemble: { "jobId": "uuid", "status": "QUEUED",
"message": "Your resume has been uploaded. Processing is in progress." }

This is illustrative. Use the project's existing API response envelope
if it has one.

## 4. Requirement C --- Gemini is the first provider behind an interface

-   Keep Google Gemini as the primary provider.
-   Introduce or reuse an interface such as `ResumeParser` or a suitable
    separation between resume extraction/orchestration and the Gemini
    implementation.
-   The service/worker should depend on the interface, not directly on
    Gemini-specific implementation details.
-   Keep provider configuration and API keys server-side and
    externalized.
-   Validate Gemini output using a typed DTO/schema and business
    validation. Treat resume content as untrusted input and ignore
    instructions embedded in resumes.
-   Track safe metrics such as provider, duration, token usage when
    available, outcome, retry count, and error category. Do not log the
    resume text or sensitive personal data.
-   Classify failures as retryable, permanent/input-related,
    quota/rate-limited, or configuration/authentication failures.
-   **Do not automatically fall back to another paid provider.** First
    measure Gemini quality, cost, latency, and failure behavior. Add
    another provider only in a later, explicitly approved phase after a
    comparison.
-   Do not change to a different Gemini model just because it is newer.
    Inspect current configuration and tests; preserve the configured
    model unless a change is necessary and documented.
-   Add unit tests using a mocked `ResumeParser`, plus tests for the
    Gemini adapter with mocked provider responses. Do not require a live
    paid API key for ordinary automated tests.
-   If Gemini credentials are unavailable, implement and test the
    interface boundary and clearly document the manual live API
    verification step.

## 5. Requirement D --- API limits and provider quota handling

Do not invent or hard-code a promised RPM/RPD quota. Quotas depend on
the selected Gemini model, Google project, account tier, and current
provider policy.

Implement: - Configurable worker concurrency and a bounded number of
in-flight AI calls. - Rate-limit/429 detection and retry-after
handling. - Exponential backoff with jitter for retryable failures. - A
maximum of 3 attempts, including the initial attempt, unless existing
project conventions define a clearer equivalent. - Queue backpressure
and a safe response when the queue/batch limit is reached. - Separate
permanent failure from transient quota/rate-limit failure. - Avoid retry
storms and simultaneous retries from all workers. - Timeouts for
external calls and safe error classification. - Configuration and
documentation describing where a developer can check the active
model/project limits in Google AI Studio/Google Cloud, without claiming
the project has a specific quota. - Metrics/logging for queue depth, job
age, success/failure, retry count, provider latency, 429s, and token
usage where available. - Tests that simulate HTTP 429, `Retry-After`,
timeout, provider 5xx, malformed output, invalid input, and exhausted
retries. - Never create multiple API keys in the same project to bypass
project-level quotas. Do not rotate keys to evade provider limits.

Do not add Redis or a second AI provider solely to work around quota
limits. First measure and apply bounded concurrency, batching where
suitable, prompt/output reduction, and retry/backpressure.

## 6. Data privacy and logging

-   APAAR is a mandatory input field only in this task; no verification
    is performed.
-   No Aadhaar field, number, image upload or verification integration
    should be added as part of these requirements.
-   Do not add identity verification provider references, identity
    verification tables, or identity verification status workflows
    unless an equivalent feature already exists and is outside this
    task's change scope.
-   Treat resumes and APAAR identifiers as personal data. Collect only
    what the application needs.
-   Never log full APAAR identifiers, resume text, raw file bytes,
    passwords, OTPs, access tokens or API keys.
-   Mask identifiers in any operational UI/logging where they must
    appear.
-   Restrict resume download/view access to authorized owners and roles;
    recruiters should see only information permitted by placement
    policy.
-   Keep uploaded files private and prevent public static serving.
-   Document a retention/deletion policy as a configurable policy
    decision, but do not invent a legal retention period.
-   Use safe exception messages in API responses; detailed diagnostics
    belong in protected logs with sensitive values redacted.

## 7. Required documentation/tutorial files

Create or update these files in a suitable `docs/` directory (inspect
existing structure first; reuse existing documentation conventions):

1.  `docs/IMPLEMENTATION_PLAN.md`
    -   Baseline repository audit.
    -   Current vs desired status matrix.
    -   Exact existing files to modify and new files to add.
    -   Ordered implementation phases and dependencies.
    -   Database migration plan.
    -   API contract and status codes.
    -   Risks, assumptions and unresolved questions.
    -   Clear out-of-scope list.
2.  `docs/IMPLEMENTATION_GUIDE.md`
    -   Plain-language explanation of how the feature works.
    -   Architecture and request/job flow.
    -   Explanation of each new/modified class and file.
    -   Configuration reference with safe example values and environment
        variable names.
    -   Database migration instructions.
    -   How to run backend, frontend and worker locally.
    -   How to configure Gemini securely.
    -   Troubleshooting for 400, 401, 403, 413, 415, 429, 500, and stuck
        jobs.
    -   Security and privacy notes.
    -   Limitations and manual setup still required.
3.  `docs/TESTING_TUTORIAL.md`
    -   Step-by-step testing guide for a beginner.
    -   Prerequisites and commands.
    -   Database/migration checks.
    -   APAAR required-field test cases.
    -   Postman/cURL steps for single upload, batch upload, and status
        polling.
    -   How to check HTTP 202 and verify the job exists in the database.
    -   How to observe `QUEUED -> PROCESSING -> SUCCEEDED/FAILED`.
    -   How to test 5 MB file limit, unsupported format, corrupt
        PDF/DOCX, duplicate upload, batch partial failure, unauthorized
        access, and another student's job ID.
    -   How to simulate provider 429/timeout/5xx without a paid API call
        where possible.
    -   How to test retry limits, worker restart recovery, stuck-job
        recovery and idempotency.
    -   How to run automated tests and interpret output.
    -   Expected result for each step and common fixes.
    -   Clearly distinguish commands that were actually run from
        commands the developer must run.
4.  `docs/IMPLEMENTATION_REPORT.md`
    -   Exact files changed.
    -   What was implemented and what was not.
    -   Migration names and implications.
    -   Tests/commands actually run and results.
    -   Known limitations, risks, manual configuration and follow-up
        tasks.
5.  Update README/API documentation only where necessary, without
    duplicating the full tutorial.

## 8. Implementation phases

### Phase 0 --- Repository audit and plan

-   Inspect Git status and current branch.
-   Inspect backend/frontend structure, existing resume code, database
    migrations, security rules and tests.
-   Identify the current upload route and existing AI parser.
-   Write `docs/IMPLEMENTATION_PLAN.md` with exact file paths and
    migration dependencies.
-   Do not make broad edits before the plan is clear.

### Phase 1 --- Mandatory APAAR field only

-   Add field, frontend/backend validation, persistence and tests.
-   No identity verification or Aadhaar work.
-   Add a safe migration if required.

### Phase 2 --- Resume parser abstraction

-   Refactor only as needed so the worker uses a `ResumeParser`
    interface and Gemini remains the primary implementation.
-   Preserve current parsing behavior unless a bug or test demonstrates
    a required change.
-   Add unit tests with mocked provider responses.

### Phase 3 --- Durable job model and single-upload flow

-   Add migration and job entity/repository/service/worker as needed.
-   Secure upload and storage.
-   Return 202 only after durable persistence.
-   Add job status endpoint and frontend status UI.
-   Add recovery, retries and idempotency.

### Phase 4 --- Batch upload (maximum five files)

-   Add batch model/endpoint/UI if needed.
-   Per-file job status and partial success.
-   Test the 5-file limit and batch-level authorization.

### Phase 5 --- API quota controls and observability

-   Add bounded concurrency, retry classification, backoff/jitter,
    timeout, backpressure and safe metrics.
-   Add simulated provider failure tests.

### Phase 6 --- Integration, documentation and final verification

-   Connect frontend to actual backend endpoints.
-   Run relevant backend/frontend tests and builds.
-   Update all required documentation.
-   Produce a concise final report with exact results and any blockers.

If the task scope is too large for one pass, finish a coherent phase
with passing tests, document remaining work, and continue in the next
phase. Do not mark unfinished phases complete.

## 9. Testing acceptance criteria

At minimum, verify: - APAAR ID missing, blank, valid and persisted. - No
APAAR verification or Aadhaar workflow was introduced. - Valid resume
upload returns 202 and a job ID. - Job exists durably before response is
returned. - Worker processes a job after the upload request has
completed. - A worker/application restart does not silently lose queued
jobs. - Only authorized users can upload, view or poll their own jobs. -
File limit, type validation, malformed document and batch maximum
work. - Batch can partially succeed. - Duplicate requests are idempotent
or safely rejected. - Gemini output validation prevents invalid data
from corrupting profiles. - 429/timeout/5xx failures are classified and
retried appropriately. - Permanent input failures are not needlessly
retried. - Retry attempts stop at the configured maximum. - No automatic
second-provider fallback occurs. - Frontend displays progress, success
and actionable failure states. - Existing auth, profile, resume and
placement-drive behavior remains intact. - Database migrations pass from
a clean database and are compatible with the existing migration history.

## 10. Final response format

At completion, report: 1. Repository baseline and branch/status safety.
2. Summary of changes. 3. Exact files added/modified. 4. Database
migration details. 5. API endpoints and response behavior. 6. How to run
the feature. 7. Step-by-step verification guide location. 8. Tests
actually run, with exact results. 9. Tests not run and why. 10.
Remaining manual configuration and risks. 11. Confirmation that APAAR is
only a mandatory field and no APAAR verification/Aadhaar functionality
was added. 12. Confirmation that Gemini remains primary and no automatic
paid-provider fallback was introduced.

Be precise, honest and incremental. Do not claim completion without
evidence.
