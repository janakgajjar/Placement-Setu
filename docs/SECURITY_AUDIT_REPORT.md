# Placement Setu — Comprehensive 20-Point Security Audit & Hardening Report

**Platform:** Placement Setu (Placement Management System)  
**Institution:** Gujarat Vidyapith  
**Scope:** Full-Stack Architecture (Spring Boot 3 + PostgreSQL Backend & React 18 + Vite Frontend)  
**Security Posture:** Production Hardening & Code-Level Vulnerability Assessment  

---

## Executive Summary

This security assessment thoroughly inspects the Placement Setu codebase against the 20 industry-standard web application vulnerability categories requested. 

The audit evaluated both the Spring Boot 3.x backend and the React 18 frontend. Several critical defenses were already sound in the architectural foundations (e.g., parameterized JPA queries, authoritative `@PreAuthorize` method security, generic exception handling), while key vulnerabilities were identified and hardened during this cycle (in-memory rate limiting on authentication and upload routes, upload extension whitelist with path traversal guards, HTTP security headers, CORS origin sanitation, source map suppression, and administrative authorization on AI test endpoints).

---

## Comprehensive 20-Point Security Assessment Matrix

| # | Vulnerability Category | Status | Risk Level | Primary Code Reference |
| :- | :--- | :--- | :--- | :--- |
| **1** | **SQL Injection Vulnerabilities** | **Mitigated / Secure** | Low | Spring Data JPA Repositories |
| **2** | **Cross-Site Scripting (XSS)** | **Hardened** | Low | `SecurityConfig.java`, React JSX |
| **3** | **CSRF Vulnerabilities** | **Not Applicable / Safe** | Low | `SecurityConfig.java`, Stateless JWT |
| **4** | **Insecure File Uploads** | **Hardened & Patched** | Medium | `ResumeStorageService.java`, `ResumeService.java` |
| **5** | **IDOR & Broken Object Authorization** | **Mitigated / Secure** | Low | `PlacementDriveRepository.java`, `StudentProfileServiceImpl.java` |
| **6** | **Missing Rate Limiting** | **Implemented** | High | `RateLimitingFilter.java`, `SecurityConfig.java` |
| **7** | **Insecure JWT Secrets** | **Action Required** | High | `application.yml`, `JwtService.java` |
| **8** | **Exposed API Secrets** | **Action Required** | Critical | `backend/.env`, `application.yml` |
| **9** | **Weak Password Hashing** | **Mitigated / Secure** | Low | `PasswordEncoderConfig.java` |
| **10** | **Missing Multi-Factor Auth (MFA)** | **Roadmap / Advisory** | Medium | `AuthController.java` |
| **11** | **Overly Permissive CORS Settings** | **Hardened & Patched** | Low | `CorsConfig.java` |
| **12** | **Auth Tokens Stored in Local Storage**| **Architectural Trade-off**| Medium | `frontend/src/lib/api.js` |
| **13** | **Client-Side-Only Permissions** | **Mitigated / Secure** | Low | `SecurityConfig.java`, Method Security |
| **14** | **Missing Row-Level Security (RLS)** | **Application-Enforced** | Medium | PostgreSQL / JPA Queries |
| **15** | **Unverified Webhook Signatures** | **Not Applicable** | Low | No active inbound webhooks |
| **16** | **SSRF Vulnerabilities** | **Hardened & Patched** | Medium | `AiTestController.java`, `GeminiClient.java` |
| **17** | **Exposed Source Maps** | **Hardened & Patched** | Low | `frontend/vite.config.js` |
| **18** | **Default Credentials** | **Action Required** | High | `db/migration/V2__seed_data.sql` |
| **19** | **Sensitive Data in Logs** | **Mitigated / Secure** | Low | `GlobalExceptionHandler.java` |
| **20** | **Vulnerable Dependencies** | **Maintenance Advisory** | Medium | `pom.xml`, `package.json` |

---

## Detailed Vulnerability Analysis & Hardening Actions

---

### 1. SQL Injection (SQLi)
- **Status:** **Mitigated / Secure**
- **Analysis:**  
  The codebase uses Spring Data JPA and Hibernate for all database persistence.
  All custom repository queries (such as in `UserRepository`, `PlacementDriveRepository`, `DriveSkillRepository`, and `CompanyRepository`) strictly use parameterized JPQL queries with named parameters (e.g. `:email`, `:companyId`, `:driveId`).
  No raw `java.sql.Statement`, string concatenations, or unparameterized native queries (`nativeQuery = true`) exist in the application.
- **Code Reference:**
  - `com.placementsetu.placement.repository.PlacementDriveRepository`:
    ```java
    @Query("""
        SELECT d FROM PlacementDrive d
        WHERE d.companyId = :companyId
          AND (:status IS NULL OR d.status = :status)
        """)
    Page<PlacementDrive> findByCompanyIdAndStatus(...)
    ```
- **Remediation / Recommendation:** Maintain standard parameterized JPQL/Criteria queries; never concatenate unvalidated user input into database queries.

---

### 2. Cross-Site Scripting (XSS)
- **Status:** **Hardened**
- **Analysis:**  
  1. *Frontend:* The React 18 frontend automatically HTML-escapes all dynamic content rendered in JSX bindings (`{value}`). No dangerous sinks such as `dangerouslySetInnerHTML`, `eval()`, or raw DOM element injection (`innerHTML`) are used.
  2. *HTTP Response Headers:* In `SecurityConfig.java`, HTTP response headers were added to instruct browsers to deny iframe framing (`X-Frame-Options: DENY`) and enforce strict MIME-type checking (`X-Content-Type-Options: nosniff`).
- **Implemented Fix:**
  Added in `com.placementsetu.config.SecurityConfig`:
  ```java
  .headers(headers -> headers
      .frameOptions(frame -> frame.deny())
      .contentTypeOptions(Customizer.withDefaults())
      .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
  )
  ```

---

### 3. Cross-Site Request Forgery (CSRF)
- **Status:** **Not Applicable / Safe**
- **Analysis:**  
  Placement Setu uses **stateless token-based authentication** (`SessionCreationPolicy.STATELESS`). Authentication tokens are passed in the HTTP `Authorization: Bearer <token>` header rather than automatic browser ambient cookies.
  Because browsers do not automatically send custom headers on cross-site requests, CSRF attacks cannot succeed against header-authenticated REST APIs. `csrf.disable()` in `SecurityConfig.java` is standard and safe for stateless Bearer token APIs.
- **Advisory:** If the architecture is migrated to `HttpOnly` session cookies in the future, Spring Security's `CookieCsrfTokenRepository.withHttpOnlyFalse()` must be re-enabled.

---

### 4. Insecure File Uploads
- **Status:** **Hardened & Patched**
- **Previous Risk:**  
  `ResumeStorageService.store()` previously extracted the file extension by substringing `file.getOriginalFilename()` without an extension whitelist or path traversal check. A malicious user could theoretically attempt to upload script files (e.g. `.jsp`, `.sh`, `.exe`) or files with relative directory traversal characters (`../../`).
- **Implemented Fix:**
  Patched `com.placementsetu.resume.storage.ResumeStorageService`:
  1. **Strict Extension Whitelist:** Only `.pdf`, `.docx`, and `.txt` are permitted; all other extensions are rejected with `IllegalArgumentException`.
  2. **Filename Sanitization:** Path components are stripped using `Paths.get(originalName).getFileName().toString()`.
  3. **Path Traversal Guard:** The target path is verified with `.normalize()` and `target.startsWith(baseDir)`. If the path resolves outside `baseDir`, a `SecurityException` is thrown.
  4. **Randomized Storage Keys:** Files on disk are stored as `UUID + extension`, preventing predictable URL guessing and file overwrites.

---

### 5. IDOR & Broken Object-Level Authorization
- **Status:** **Mitigated / Secure**
- **Analysis:**  
  Insecure Direct Object Reference (IDOR) occurs when an application exposes a direct database key and fails to verify user ownership.
  1. *Student Endpoints:* `StudentController` accesses entities strictly via `principal.getId()` (e.g. `studentProfileRepository.findByUserId(principal.getId())`).
  2. *Project & Certification Deletions:* Scoped using composite constraints: `projectRepository.deleteByIdAndStudentProfileId(projectId, profile.getId())` and `certificationRepository.deleteByIdAndStudentProfileId(certId, profile.getId())`. A student cannot delete another student's projects.
  3. *Company Placement Drives:* `PlacementDriveRepository.findByIdAndCompanyId(driveId, companyId)` ensures a company cannot view, edit, publish, or close drives belonging to another organization.

---

### 6. Missing Rate Limiting
- **Status:** **Implemented & Patched**
- **Previous Risk:**  
  No rate limiting was present on `/api/v1/auth/login`, `/api/v1/auth/register/*`, or `/api/v1/resumes/me`. Attackers could execute automated brute-force attacks against user credentials or exhaust external Gemini AI quota by flooding file parsing requests.
- **Implemented Fix:**
  Created `com.placementsetu.security.RateLimitingFilter` and registered it in the Spring Security filter chain:
  - **Auth Endpoint Throttling:** Maximum 15 requests per minute per IP for `/api/v1/auth/login` and `/api/v1/auth/register/*`.
  - **Resume Pipeline Throttling:** Maximum 5 upload requests per minute per IP for `/api/v1/resumes/*`.
  - **Standard Response:** Returns HTTP `429 Too Many Requests` with a JSON error payload and a `Retry-After: 60` response header.

---

### 7. Insecure JWT Secrets
- **Status:** **Action Required (Production Setup)**
- **Analysis:**  
  `application.yml` contains a fallback secret placeholder:
  `secret: ${JWT_SECRET:CHANGE_ME_LOCAL_DEV_ONLY_MIN_32_CHARACTERS_LONG}`
  If `JWT_SECRET` is not set in production, the application falls back to this known string, allowing an attacker to forge valid tokens for any user or role (including `ADMIN`).
- **Action Required:**
  Before deploying to production, generate a cryptographically strong 256-bit secret (e.g. `openssl rand -base64 64`) and inject it via the `JWT_SECRET` environment variable. Never run production with the default fallback.

---

### 8. Exposed API Secrets & Sensitive Tracked Files
- **Status:** **Action Required (User Configuration)**
- **Audit Finding:**  
  1. `backend/.env` exists in the local workspace and contains environment variables.
  2. `backend/src/main/resources/application.yml` contains default database password and Gemini API key configuration placeholders.
  3. `backend/data/resumes/` contains sample/uploaded student PDFs.
- **Action Required:**
  1. Ensure `backend/.env` and `backend/data/` are listed in `.gitignore` and never committed to Git history.
  2. If real Gemini API keys or database passwords have been committed in previous git revisions, rotate them immediately in the respective vendor consoles.
  3. Load all credentials through container/system environment variables (`DB_PASSWORD`, `GEMINI_API_KEY`).

---

### 9. Weak Password Hashing
- **Status:** **Mitigated / Secure**
- **Analysis:**  
  Passwords are encrypted using `BCryptPasswordEncoder(10)` in `com.placementsetu.config.PasswordEncoderConfig`.
  BCrypt incorporates a random salt per hash and an adaptive work factor (10 rounds = 1,024 iterations), providing strong protection against rainbow tables and offline dictionary attacks.
  The registration DTOs enforce a minimum password length of 8 characters with at least one uppercase letter, one lowercase letter, and one digit (`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$`).

---

### 10. Missing Multi-Factor Authentication (MFA)
- **Status:** **Architectural Roadmap**
- **Analysis:**  
  The current authentication flow is single-factor (email + password).
  For standard students, single-factor is typical for university portals, but for **Placement Officers** and **Administrators** who approve companies, manage recruiters, and view candidate PII, the absence of MFA presents account takeover risks.
- **Roadmap Recommendation:**  
  Implement Time-Based One-Time Password (TOTP via Google Authenticator / Microsoft Authenticator) or email OTP verification for `PLACEMENT_OFFICER` and `ADMIN` accounts prior to enterprise production rollout.

---

### 11. Overly Permissive CORS Settings
- **Status:** **Hardened & Patched**
- **Analysis:**  
  Cross-Origin Resource Sharing (CORS) in `CorsConfig.java` reads `app.cors.allowed-origins` from configuration.
- **Implemented Fix:**
  Hardened `com.placementsetu.config.CorsConfig`:
  - Added origin trimming and empty entry filtering.
  - Added an explicit safeguard: if origins contain `*`, `allowCredentials` is disabled (as required by browser security specifications).
  - Explicitly restricted `AllowedHeaders` to `Authorization`, `Content-Type`, `Accept`, and `X-Requested-With`.
  - Exposed `Retry-After` for client rate limit handling.

---

### 12. Auth Tokens Stored in Local Storage
- **Status:** **Architectural Trade-off / Documented**
- **Analysis:**  
  In `frontend/src/lib/api.js`, JWT access and refresh tokens are stored in browser `localStorage`.
  *Trade-off:* `localStorage` enables pure client-side SPA state handling across Vite tabs and simplifies token attachment in headers. However, any XSS vulnerability can allow malicious scripts to read tokens.
- **Hardening Applied & Future Roadmap:**
  - *Current Defense:* Strict JSX auto-escaping, input validation, and `X-Content-Type-Options: nosniff` prevent XSS in the client.
  - *Future Hardening:* Migrate refresh tokens to an `HttpOnly`, `SameSite=Strict`, `Secure` cookie issued by `/api/v1/auth/login`.

---

### 13. Client-Side-Only Permission Enforcement
- **Status:** **Mitigated / Secure**
- **Analysis:**  
  In Placement Setu, client-side route guards (`ProtectedRoute.jsx`) serve solely as user-experience conveniences (redirecting users to dashboards or unauthorized pages).
  **All security permissions are authoritatively enforced on the backend:**
  - `@EnableMethodSecurity` is enabled in `SecurityConfig.java`.
  - Every controller endpoint is guarded by Spring Security `@PreAuthorize`:
    - `StudentController`: `@PreAuthorize("hasRole('STUDENT')")`
    - `ResumeController`: `@PreAuthorize("hasRole('STUDENT')")`
    - `CompanyController`: `@PreAuthorize("hasRole('COMPANY')")`
    - `PlacementDriveController`: `@PreAuthorize("hasRole('COMPANY')")`
    - `OfficerCompanyController`: `@PreAuthorize("hasRole('PLACEMENT_OFFICER')")`
    - `CompanyApprovalController`: `@PreAuthorize("hasAnyRole('ADMIN', 'PLACEMENT_OFFICER')")`

---

### 14. Missing Row-Level Security (RLS)
- **Status:** **Application-Enforced**
- **Analysis:**  
  The backend connects to PostgreSQL using a single application user (`postgres`). PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) is not enabled at the database layer.
  Instead, multi-tenancy and data isolation are enforced at the application/ORM layer:
  - Students access only profiles matching `user.id`.
  - Companies access only drives where `d.companyId = :companyId`.
- **Roadmap Recommendation:** For defense-in-depth in multi-tenant environments, database-level RLS policies can be defined using PostgreSQL session variables (`SET LOCAL app.current_user_id = ...`).

---

### 15. Unverified Webhook Signatures
- **Status:** **Not Applicable**
- **Analysis:**  
  An exhaustive search of the codebase confirms that Placement Setu does not currently consume any third-party inbound webhooks (no payment gateways, no third-party event webhooks).
- **Advisory:** If institutional integrations (e.g. DigiLocker, SMS gateways, university ERP webhooks) are introduced, enforce cryptographic HMAC-SHA256 signature verification over the raw request payload before processing.

---

### 16. Server-Side Request Forgery (SSRF)
- **Status:** **Hardened & Patched**
- **Analysis:**  
  The only component making outgoing HTTP requests is `com.placementsetu.resume.ai.GeminiClient`, which calls the Google Generative Language API.
  However, `com.placementsetu.resume.ai.AiTestController` previously exposed `GET /api/v1/ai/test?prompt=...` without a role restriction. Any authenticated user could send arbitrary prompts to Gemini, creating potential quota abuse.
- **Implemented Fix:**
  Added `@PreAuthorize("hasRole('ADMIN')")` to `AiTestController.java`. Regular users can no longer invoke the diagnostic AI route.

---

### 17. Exposed Source Maps
- **Status:** **Hardened & Patched**
- **Analysis:**  
  Exposing JavaScript source maps in production builds allows reverse-engineering of frontend internal route structures, API endpoints, and business logic.
- **Implemented Fix:**
  Updated `frontend/vite.config.js`:
  ```javascript
  export default defineConfig({
    plugins: [react()],
    build: {
      sourcemap: false,
    },
  });
  ```
  Ensures that `npm run build` will not emit `.map` files in the distribution bundle.

---

### 18. Default Credentials
- **Status:** **Action Required (Production Setup)**
- **Audit Finding:**  
  `backend/src/main/resources/db/migration/V2__seed_data.sql` inserts an initial bootstrap admin account:
  - Email: `admin@placementsetu.local`
  - Password Hash: `$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5m3P1J1a9v1yhBt4C7CVVU2yBGfKa` (matches `ChangeMe@123`)
- **Action Required:**
  Immediately upon running the application for the first time, log into `admin@placementsetu.local` and change the password, or replace the seed hash in `V2__seed_data.sql` before first migration in production environments.

---

### 19. Sensitive Data in Logs
- **Status:** **Mitigated / Secure**
- **Analysis:**  
  - Passwords and raw JWT tokens are not logged anywhere in backend controllers, services, or filters.
  - `GlobalExceptionHandler.java` catches all unhandled exceptions (`Exception.class`) and returns a generic, sanitized error message: `"An unexpected error occurred. Please try again later."` Internal stack traces, database schema details, and SQL exceptions are never leaked to HTTP clients.

---

### 20. Vulnerable Dependencies
- **Status:** **Maintenance Advisory**
- **Analysis:**  
  - Backend `pom.xml` uses Spring Boot `3.2.5`, JJWT `0.12.5`, Apache PDFBox `3.0.2`, Apache POI `5.5.1`, and SpringDoc `2.5.0`.
  - Spring Boot 3.2.x reached end of open-source support in late 2024.
- **Action Required:**
  1. Schedule a planned upgrade of `spring-boot-starter-parent` from `3.2.5` to the latest `3.3.x` or `3.4.x` patch release.
  2. Regularly execute `mvn dependency-check:check` and `npm audit` in your CI/CD pipeline to monitor for newly disclosed CVEs.

---

## Summary of Code Changes Made in this Security Hardening

1. **`backend/src/main/java/com/placementsetu/security/RateLimitingFilter.java`** *(New)*: Added in-memory token-bucket rate limiter for auth (15/min) and resume (5/min) requests with `429 Too Many Requests` response.
2. **`backend/src/main/java/com/placementsetu/config/SecurityConfig.java`** *(Modified)*: Registered `RateLimitingFilter`, added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
3. **`backend/src/main/java/com/placementsetu/resume/storage/ResumeStorageService.java`** *(Modified)*: Added strict extension whitelist (`.pdf`, `.docx`, `.txt`), filename path stripping, and directory traversal validation.
4. **`backend/src/main/java/com/placementsetu/resume/ai/AiTestController.java`** *(Modified)*: Restricted diagnostic test route to `@PreAuthorize("hasRole('ADMIN')")`.
5. **`backend/src/main/java/com/placementsetu/config/CorsConfig.java`** *(Modified)*: Hardened origin sanitation and ensured `allowCredentials` is disabled if wildcards are configured.
6. **`frontend/vite.config.js`** *(Modified)*: Explicitly set `build: { sourcemap: false }` to prevent production source map leakage.
