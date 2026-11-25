# Placement Setu: Notification Service & Email Agent Manual Testing Guide

**Target Application:** Placement Setu (Spring Boot 3.2.5 Backend, React 18 Frontend, PostgreSQL, Mailpit/SMTP)  
**Audience:** QA Engineers, Backend Developers, System Administrators  
**Notice:** Automated test commands, builds, migrations, and live SMTP dispatches were not executed during implementation. All instructions in this document are prepared for manual execution by testing personnel.

---

## 1. Safety & Environment Rules

> [!CAUTION]
> **Production Safety Warning:**
> - Never use real student or recruiter email addresses during manual verification.
> - Configure local SMTP sinks (e.g. [Mailpit](https://github.com/axllent/mailpit) on port 1025) or set `MAIL_ENABLED=false` to verify the Transactional Outbox without transmitting network packets.
> - Avoid bulk email testing. Always use isolated test accounts.

### 1.1 Local Mailpit Setup (Recommended)
To inspect plain-text and HTML emails with clickable links without contacting an actual external mail server:
```bash
# Option A: Run Mailpit via Docker
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit

# Option B: Run Mailpit standalone executable (download from GitHub)
./mailpit
```
- SMTP port: `1025`
- Web UI: `http://localhost:8025`

### 1.2 Environment Variables for Manual Testing
Create or export these in your backend terminal session:
```bash
export MAIL_ENABLED=true
export MAIL_HOST=localhost
export MAIL_PORT=1025
export MAIL_FROM=noreply@placementsetu.gujaratvidyapith.edu
export MAIL_MAX_RETRIES=3
export MAIL_POLL_INTERVAL_MS=3000
export APP_BASE_URL=http://localhost:5173
```

---

## 2. Notification REST API Verification (cURL / Postman)

### 2.1 Unauthenticated Access Check (Security Boundary)
Verify unauthenticated requests cannot access notifications:
```bash
curl -i -X GET http://localhost:8080/api/v1/notifications
```
- **Expected Outcome:** `HTTP 401 Unauthorized`.
- **Expected Envelope:** `{"success":false,"message":"Full authentication is required to access this resource"}`.

### 2.2 Verify Absence of Public Email Send Endpoint
Verify that no client can trigger raw emails through REST:
```bash
curl -i -X POST http://localhost:8080/api/v1/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test"}'
```
- **Expected Outcome:** `HTTP 404 Not Found` or `401 Unauthorized`. Demonstrates Rule 8 compliance.

### 2.3 User Isolation & Scoped Retrieval
1. Log in as Student A (`student1@test.com`):
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"student1@test.com","password":"Passw0rd1"}'
   ```
   Save the returned `accessToken` as `TOKEN_A`.

2. Retrieve notifications for Student A:
   ```bash
   curl -s -X GET "http://localhost:8080/api/v1/notifications?page=0&size=10" \
     -H "Authorization: Bearer $TOKEN_A"
   ```
   - **Expected Outcome:** `HTTP 200 OK`.
   - **Response Payload:** Contains `data.content[]`, `data.unreadCount`, `data.totalElements`.
   - **Verification:** Ensure returned items only belong to Student A's internal user ID. No records belonging to other students or companies are visible.

3. Unread filter check:
   ```bash
   curl -s -X GET "http://localhost:8080/api/v1/notifications?unread=true" \
     -H "Authorization: Bearer $TOKEN_A"
   ```
   - **Expected Outcome:** Only items with `"isRead": false` are returned.

### 2.4 Mark Notification as Read
1. Copy a `notificationId` from Student A's feed.
2. Mark as read:
   ```bash
   curl -s -X PATCH "http://localhost:8080/api/v1/notifications/<notificationId>/read" \
     -H "Authorization: Bearer $TOKEN_A"
   ```
   - **Expected Outcome:** `HTTP 200 OK`. `"isRead": true`, `"readAt"` populated with timestamp.
3. Re-query `/api/v1/notifications`:
   - `data.unreadCount` decreases by 1.

### 2.5 Ownership Enforcement / Cross-User Access Guard (IDOR Check)
1. Log in as Student B to obtain `TOKEN_B`.
2. Attempt to mark Student A's notification as read using `TOKEN_B`:
   ```bash
   curl -i -X PATCH "http://localhost:8080/api/v1/notifications/<notificationId_from_Student_A>/read" \
     -H "Authorization: Bearer $TOKEN_B"
   ```
   - **Expected Outcome:** `HTTP 404 Not Found` with message `"Notification not found with ID: <id>"`.
   - **Security Guarantee:** User B cannot infer existence or mutate read state of User A's notifications.

---

## 3. Domain Event & Notification Generation Testing

### 3.1 Company Registration Event
1. Register a new company via POST `/api/v1/auth/register/company`:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/auth/register/company \
     -H "Content-Type: application/json" \
     -d '{"email":"recruiter@techcorp.com","password":"Passw0rd1","companyName":"TechCorp Global","gstin":"24AAACT1234F1Z5","address":"Ahmedabad"}'
   ```
2. Log in as Admin (`admin@placementsetu.local` / `ChangeMe@123`):
   ```bash
   curl -s -X GET http://localhost:8080/api/v1/notifications \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
   - **Expected In-App Notification:**
     - Type: `COMPANY_SUBMITTED`
     - Subject: `"New Company Registration: TechCorp Global"`
     - Message: `"Recruiter profile for TechCorp Global has been submitted and is pending verification."`
3. Inspect `email_outbox` table in PostgreSQL:
   ```sql
   SELECT id, recipient_email, subject, status, attempts FROM email_outbox ORDER BY created_at DESC LIMIT 5;
   ```
   - **Expected Outbox Record:** Recipient is admin's email, subject contains `TechCorp Global`, status is `PENDING` (or `SENT` if worker dispatched it).

### 3.2 Company Approval / Rejection Event
1. Using `$ADMIN_TOKEN`, approve the company:
   ```bash
   curl -s -X POST "http://localhost:8080/api/v1/admin/companies/<companyId>/approve" \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
2. Query database for notifications created for the company user:
   ```sql
   SELECT n.subject, n.type, n.is_read, u.email 
   FROM notifications n 
   JOIN users u ON n.recipient_user_id = u.id 
   WHERE u.email = 'recruiter@techcorp.com';
   ```
   - **Expected:** In-app notification with `type = 'COMPANY_APPROVED'`.
3. Check Mailpit Web UI (`http://localhost:8025`):
   - Email received at `recruiter@techcorp.com`.
   - Subject: `"[Placement Setu] Company Account Approved - TechCorp Global"`.
   - Contains clean HTML card with Gujarat Vidyapith branding and button linking to `${APP_BASE_URL}/login`.

### 3.3 Resume Upload & AI Processing Events
1. Upload a valid text-based resume (PDF/DOCX) as Student A:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/resumes/me \
     -H "Authorization: Bearer $TOKEN_A" \
     -F "file=@test-resume.pdf"
   ```
2. Query `/api/v1/notifications`:
   - Notification created with type `RESUME_PROCESSED`.
   - In Mailpit: Email received with subject `"[Placement Setu] Resume Processing Completed"`.
3. Upload an unparseable or corrupted file:
   - Notification created with type `RESUME_FAILED`.
   - In Mailpit: Email received with retry instructions.

### 3.4 Placement Drive Lifecycle Events
1. As approved recruiter, create and publish a placement drive:
   ```bash
   curl -s -X POST "http://localhost:8080/api/v1/companies/me/drives/<driveId>/publish" \
     -H "Authorization: Bearer $COMPANY_TOKEN"
   ```
2. Verify notifications:
   - Recruiter gets in-app confirmation: `"Placement Drive Published: <Title>"`.
   - Registered students receive broadcast notification: `"New Drive: <Title> (<Company>)"`.

---

## 4. Email Agent & Reliability Testing

### 4.1 Development Sandbox Mode (`MAIL_ENABLED=false`)
1. Set `MAIL_ENABLED=false` and restart backend.
2. Trigger an action (e.g. approve a company).
3. Inspect `email_outbox` table:
   ```sql
   SELECT id, recipient_email, status, last_error FROM email_outbox ORDER BY created_at DESC LIMIT 1;
   ```
   - **Expected Outcome:**
     - `status`: `'SKIPPED'` (Never falsely reported as `'SENT'`).
     - `last_error`: Mentions `app.mail.enabled=false. Recorded in development sandbox mode.`

### 4.2 SMTP Transient Failure & Exponential Backoff
1. Set `MAIL_ENABLED=true` with a non-existent or temporarily blocked SMTP port:
   ```bash
   export MAIL_PORT=9999
   ```
2. Trigger an email event.
3. Observe backend application logs:
   - Worker attempts delivery, catches connection exception.
   - Logs: `delivery failed (attempt 1). Rescheduled in ...`
   - In Postgres:
     - `attempts` becomes `1`.
     - `status` remains `'PENDING'`.
     - `next_retry_at` is scheduled into the future (`now + 30s + jitter`).
4. Wait for retry interval:
   - Attempt 2 runs with doubled backoff.
   - Once `attempts == 3` (max retries), `status` transitions to `'FAILED'`.

### 4.3 Resilience to Application Restart
1. Enqueue an outbox record with `status = 'PENDING'`.
2. Stop the Spring Boot application immediately before the worker polls.
3. Restart the Spring Boot application.
4. Verify:
   - The pending item in `email_outbox` is preserved.
   - Upon restart, `EmailOutboxDispatcher` detects the record and executes delivery without message loss.

### 4.4 HTML Injection & XSS Guard
1. Register a company with HTML injection payload:
   - Company Name: `<script>alert('xss')</script><b>Injected Corp</b>`
2. Inspect the rendered email in Mailpit Web UI:
   - View Source: Value must be escaped as `&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&lt;b&gt;Injected Corp&lt;/b&gt;`.
   - Browser renders the exact literal string rather than executing script or HTML tags.

---

## 5. Frontend Notification UI Verification

Open `http://localhost:5173` in a browser and test across all four roles:

| Step | Action | Expected UI Behavior |
| :--- | :--- | :--- |
| **5.1** | Unauthenticated visit | Header shows login & register buttons. No notification bell is displayed. |
| **5.2** | Log in as Student | Notification bell appears in header right next to "Sign Out". If unread items exist, red counter badge displays count. |
| **5.3** | Click Notification Bell | Popover dropdown opens showing: header ("Notifications"), unread count, "Unread only" toggle, and scrollable notification list. |
| **5.4** | Mark as Read | Click "Mark read" button on an unread card. Card background transitions from light blue highlight to white; badge count immediately decrements. |
| **5.5** | Toggle "Unread only" | Checkbox filters list to show only unread notifications. Unchecking restores the full feed. |
| **5.6** | Outside Click / Escape | Clicking anywhere outside the popover or pressing `Escape` closes the dropdown. |
| **5.7** | Empty Feed State | For a user with zero notifications, friendly empty state displays: "No notifications yet. Important platform updates and alerts will appear here." |
| **5.8** | Multi-Role Verification | Repeat steps 5.2–5.5 with `COMPANY`, `PLACEMENT_OFFICER`, and `ADMIN` accounts. Verify role-appropriate event feeds. |
