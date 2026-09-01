# Module 1 — Identity & Auth

Foundation module for Placement Setu. Every later module (Student, Company, Job, Application,
Placement, Notification, AI) depends on the `users`, `roles`, and `permissions` tables and the
JWT security wiring built here.

---

## 1. Folder Structure

```
placement-setu/
├── docker/
│   └── docker-compose.yml              # local Postgres for development
├── backend/
│   ├── pom.xml
│   ├── .env.example
│   └── src/
│       ├── main/
│       │   ├── java/com/placementsetu/
│       │   │   ├── PlacementSetuApplication.java
│       │   │   ├── common/
│       │   │   │   ├── BaseEntity.java
│       │   │   │   ├── ApiResponse.java
│       │   │   │   └── enums/UserStatus.java
│       │   │   ├── exception/
│       │   │   │   ├── GlobalExceptionHandler.java
│       │   │   │   ├── ResourceNotFoundException.java
│       │   │   │   ├── BadRequestException.java
│       │   │   │   ├── UnauthorizedException.java
│       │   │   │   └── AccountLockedException.java
│       │   │   ├── config/
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   ├── CorsConfig.java
│       │   │   │   ├── PasswordEncoderConfig.java
│       │   │   │   ├── JpaAuditingConfig.java
│       │   │   │   └── OpenApiConfig.java
│       │   │   ├── security/
│       │   │   │   ├── JwtService.java
│       │   │   │   ├── JwtFilter.java
│       │   │   │   ├── JwtAuthenticationEntryPoint.java
│       │   │   │   ├── CustomUserDetails.java
│       │   │   │   └── CustomUserDetailsService.java
│       │   │   ├── user/
│       │   │   │   ├── entity/{User, Role, Permission, RefreshToken}.java
│       │   │   │   ├── repository/{UserRepository, RoleRepository, RefreshTokenRepository}.java
│       │   │   │   ├── dto/{UserProfileResponse, UpdateProfileRequest}.java
│       │   │   │   ├── mapper/UserMapper.java
│       │   │   │   ├── service/UserService.java + service/impl/UserServiceImpl.java
│       │   │   │   └── controller/UserController.java
│       │   │   └── auth/
│       │   │       ├── dto/{RegisterRequest, LoginRequest, AuthResponse, RefreshTokenRequest, PasswordDtos}.java
│       │   │       ├── service/AuthService.java + service/impl/AuthServiceImpl.java
│       │   │       └── controller/AuthController.java
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/V1__identity_schema.sql
│       └── test/
│           ├── java/com/placementsetu/auth/AuthServiceTest.java
│           └── resources/application-test.yml
```

This is the module template every future module (`student/`, `company/`, `job/`, `application/`,
`placement/`, `notification/`, `ai/`) will repeat: `controller / service / repository / entity /
dto / mapper / validator / exception`.

---

## 2. File Explanations

| File | Purpose |
|---|---|
| `BaseEntity` | Adds `created_at/updated_at/created_by/updated_by/is_deleted/deleted_at` to every business entity. `created_at`/`updated_at` populate automatically via Spring Data JPA auditing. |
| `ApiResponse` | The one and only response shape every controller returns — `{ success, message, data, errors }`. |
| `GlobalExceptionHandler` | Converts every exception (validation, not-found, unauthorized, locked, access-denied, unexpected) into that same `ApiResponse` shape, so the frontend never special-cases error formats. |
| `User` entity | Central identity table. Holds auth fields, verification/reset tokens, lockout counters, and a `@ManyToMany` to `Role`. Domain logic (`isAccountLocked()`, `isActive()`) lives on the entity, not scattered across services. |
| `RefreshToken` entity | Stores only a SHA-256 hash of the refresh token, never the raw value — mirrors how passwords are stored. |
| `JwtService` | Issues short-lived (15 min default) signed JWT access tokens and generates opaque refresh tokens. Access tokens carry `email` and `roles` claims. |
| `JwtFilter` | Runs once per request. Validates the access token, then reloads the user fresh from the DB (not just from JWT claims) so a mid-session block/lock takes effect immediately, not just after the JWT expires. |
| `CustomUserDetails` / `CustomUserDetailsService` | Adapt `User` to Spring Security's `UserDetails` contract; roles become `ROLE_*` authorities for `hasRole()` checks. |
| `SecurityConfig` | Stateless session policy, public `/api/v1/auth/**` + Swagger endpoints, everything else requires a valid token. `@EnableMethodSecurity` is on, so later modules can use `@PreAuthorize("hasRole('ADMIN')")` directly. |
| `AuthServiceImpl` | All auth business rules: duplicate email/phone checks, BCrypt hashing, failed-login counting, account lockout, refresh-token rotation (old token revoked, new one issued on every refresh), password-reset token expiry, "don't reveal whether an email exists" on forgot-password. |
| `V1__identity_schema.sql` | Flyway migration creating the Identity domain tables, seeding the 4 baseline roles + their V1 permissions, and inserting a bootstrap Admin account (see Security Notes below). |

---

## 3. Database Changes

This module owns the **Identity domain** of the full V1 schema you approved earlier:

- `colleges` *(placeholder scaffolding for the future multi-college SaaS roadmap — one seeded row, unused otherwise in V1)*
- `users`
- `roles`
- `permissions`
- `user_roles` (junction)
- `role_permissions` (junction)
- `refresh_tokens`

Managed entirely through Flyway (`V1__identity_schema.sql`). Hibernate is set to
`ddl-auto: validate` — it will **never** auto-generate or alter schema; Flyway is the single
source of truth for DB structure, exactly as decided in the blueprint.

Seed data included in the migration:
- 4 roles: `STUDENT`, `COMPANY`, `PLACEMENT_OFFICER`, `ADMIN`
- 17 baseline permissions, wired to roles via `role_permissions`
- 1 bootstrap Admin user (`admin@placementsetu.local`) — solves the "who creates the first admin"
  bootstrap problem flagged in the blueprint's Risks section

---

## 4. API Endpoints

All prefixed `/api/v1`. Full request/response schemas are in Swagger UI once running (see below).

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Self-registration for STUDENT or COMPANY only (Admin/Placement Officer accounts are provisioned separately, never self-registered) |
| POST | `/auth/login` | No | Returns access + refresh token. Locks account for 15 min after 3 failed attempts |
| POST | `/auth/refresh` | No (refresh token in body) | Rotates the refresh token and issues a new access token |
| POST | `/auth/logout` | No (refresh token in body) | Revokes the given refresh token |
| POST | `/auth/verify-email` | No | Consumes the email verification token |
| POST | `/auth/forgot-password` | No | Issues a password reset token (always returns the same message, regardless of whether the email exists) |
| POST | `/auth/reset-password` | No | Consumes the reset token, updates password, revokes all existing sessions for that user |
| GET | `/users/profile` | Yes | Returns the authenticated user's profile |
| PUT | `/users/profile` | Yes | Updates name/phone/photo for the authenticated user |

---

## 5. Testing

`AuthServiceTest` (JUnit 5 + Mockito, no Spring context — fast, pure unit tests) covers:

- Registration rejects duplicate email
- Registration hashes the password and never stores it raw
- Login increments `failed_login_attempts` on wrong password
- Login locks the account for `account-lock-minutes` after the 3rd failed attempt
- Login rejects immediately (without even checking the password) if the account is currently locked
- Successful login resets the failure counter and issues both tokens
- Refresh rejects unknown or expired tokens
- Refresh rotates the token: the old one is marked revoked, a new pair is issued

An `application-test.yml` with an in-memory H2 database is included for when integration-level
tests (full Spring context, real HTTP calls through `AuthController`) are added — not included yet
to keep this module fast to review; happy to add them next if you want deeper coverage before
Module 2.

**Run tests:**
```bash
cd backend
mvn test
```

---

## 6. Best Practices Applied

- **Passwords never stored or logged in plaintext** — BCrypt (strength 10) throughout.
- **Refresh tokens stored as SHA-256 hashes**, not raw values — a DB leak doesn't leak usable tokens.
- **Token rotation on every refresh** — a stolen refresh token has a one-time shelf life.
- **Fresh-from-DB authorization on every request** — a blocked/locked user is rejected on their
  very next API call, not just after their JWT naturally expires.
- **No email enumeration** — `forgot-password` always returns the same response.
- **DTOs never leak the password hash** — `UserMapper` only ever builds `UserProfileResponse`,
  which has no password field at all.
- **Global exception handling** — no controller has its own try/catch; one handler, one response
  shape, everywhere.
- **Schema owned by Flyway, not Hibernate** — `ddl-auto: validate` prevents silent, undocumented
  schema drift between environments.
- **Constants over magic strings** — role names live as constants on the `Role` entity
  (`Role.STUDENT`, `Role.ADMIN`, etc.) instead of being retyped across the codebase.

---

## 7. Running Module 1 Locally

```bash
# 1. Start Postgres
cd docker
docker compose up -d

# 2. Configure environment
cd ../backend
cp .env.example .env
# edit .env if needed — defaults match docker-compose.yml

# 3. Run
mvn spring-boot:run

# 4. Explore the API
open http://localhost:8080/swagger-ui.html
```

**⚠️ Not yet verified by an actual build in this environment** — the sandbox this was built in
doesn't have Maven installed and can't reach Maven Central, so `mvn clean install` has not been
run against this code. Please run it as your first step and send me any compiler errors — they'll
be quick to fix, but I want to flag this rather than imply it's been tested end-to-end.

---

## 8. Next Module

**Module 2: Student & Company** — `students`, `companies`, plus the company approval workflow
(`PENDING → APPROVED/REJECTED`, gated behind the `PLACEMENT_OFFICER`/`ADMIN` roles built in this
module). This will be the first module to actually exercise the RBAC wiring end-to-end.
