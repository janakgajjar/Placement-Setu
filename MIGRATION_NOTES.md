# Migration Notes — Backend aligned to the approved database schema

This documents what changed in `backend/` to match
`Placement_Setu_Final_Database_Schema_v2.html` and
`Placement_Setu_Final_Architecture_Workflow.docx`, and the assumptions made
where those documents didn't spell out an implementation detail. Read this
before continuing development — several decisions here affect every module
built after this point.

## What changed and why

The previous identity schema (`colleges`, `roles`/`permissions` many-to-many,
`refresh_tokens`, a free-floating `resumes` table with a `parsed_data` JSON
blob) does not match the approved 16-table schema at all. Rather than layer
the new schema on top of the old one, `backend/src/main/resources/db/migration`
was replaced with two new migrations:

- **`V1__placement_setu_schema.sql`** — the full 16-table schema, transcribed
  directly from the approved ERD, including every constraint and index called
  out in that document's notes panel (composite FKs on `shortlist_items`,
  the `(id, placement_drive_id)` unique keys, CGPA/backlog check constraints,
  case-insensitive email uniqueness, etc).
- **`V2__seed_data.sql`** — bootstrap admin account + a starter skills list.

All Java entities, repositories, DTOs, services and controllers in `auth`,
`user`, `student`, `company`, `officer`, and `resume` were rewritten against
this schema. `placement`, `application`, `shortlist`, `notification`, and
`audit` packages got entities + repositories only (see "What's still a stub"
below) — they exist so the schema is fully represented, but no business
logic or endpoints use them yet.

## Assumptions made (schema didn't fully specify these — revisit if wrong)

- **No more email verification, password reset, or account lockout.** The
  approved `USERS` table has only `id, email, password_hash, role,
  account_status, created_at, updated_at` — no token/attempt-counter columns.
  Rather than invent columns the schema doesn't have, these features were
  dropped. If you want them back, they need their own small table (e.g.
  `password_reset_tokens`) rather than more columns on `users`.
- **No `refresh_tokens` table** means refresh tokens are now stateless
  signed JWTs (see `JwtService`), not DB-backed. This means: (a) logout is
  purely client-side (nothing to revoke), (b) a stolen refresh token stays
  valid until it expires. Acceptable for an MVP demo; flag this if you need
  real session revocation later — it would mean reintroducing a small
  denylist table.
- **`account_status` enum**: `PENDING, ACTIVE, REJECTED, SUSPENDED`. Students
  and Admins get `ACTIVE` immediately on registration. Companies start
  `PENDING` and cannot log in until an Officer/Admin approves them
  (`POST /api/v1/admin/companies/{id}/approve`) — this directly implements
  Section 8 of the workflow doc ("Only an approved/active company can log in").
- **`profile_status` / visibility is computed, not stored.** There's no
  `is_visible` column on `student_profiles` in the approved schema, so
  visibility (Section 7's rule: resume uploaded + profile complete) is
  computed on read by `ProfileValidationService`, not persisted as a flag.
- **AI-parsed resume fields with no matching column** (`education`,
  `work_experience` summaries from Gemini) are **not persisted** — the
  approved schema has no `resume_parsed_data` table and no free-text summary
  columns on `student_profiles`. They're computed by `AiResumeParser` but
  discarded after mapping the fields that do have a home (`skills`,
  `project` titles, `phone`, `linkedin`, `github`).
- **Resume storage** is local disk (`ResumeStorageService`, path configurable
  via `app.storage.resume-dir`) rather than S3/MinIO — the architecture doc
  doesn't mandate a specific object store, and Docker/object storage is a
  later item (Section 21, item 27).
- **Registration is split into two endpoints** —
  `POST /api/v1/auth/register/student` and `.../register/company` — instead
  of one generic endpoint with a `role` field, because the two forms collect
  completely different data (Sections 6 vs 8 of the workflow doc).
- **Officer self-registration isn't implemented.** The workflow doc doesn't
  describe how Officer accounts get created; for now the only Officer/Admin
  account is the seeded bootstrap admin. Add an admin-only "create officer"
  endpoint when you get to that part of the dev order.

## What's fully working now

- `POST /api/v1/auth/register/student`, `.../register/company`,
  `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- `GET /api/v1/users/me` — role-agnostic account summary
- `GET/PUT /api/v1/students/me` — dashboard (profile completeness + resume
  status + visibility) and profile updates
- `POST/DELETE /api/v1/students/me/skills/{id}`,
  `/projects`, `/projects/{id}`, `/certifications`, `/certifications/{id}`
- `POST /api/v1/resumes/me` (upload + AI parse + auto-fill profile/skills/
  projects), `GET /api/v1/resumes/me`
- `GET/PUT /api/v1/companies/me`
- `GET /api/v1/admin/companies/pending`,
  `POST /api/v1/admin/companies/{id}/approve|reject`

This covers Section 21 (dev order) items 1–13 functionally (foundation,
schema, auth, RBAC, student registration/dashboard, resume upload, AI
parsing, auto profile, profile validation/visibility, company registration,
company approval, company dashboard-equivalent).

## What's still a stub (entities/repos only, no service or API yet)

- `placement` (PlacementDrive, DriveSkill) — items 14–16
- `application` (Application) — item 24 (tracking) / candidate search+apply
- `shortlist` (Shortlist, ShortlistItem) — items 17–20
- `notification` (Notification) — items 21–23 (no real email sending wired
  up anywhere yet — company approval/rejection and profile-incomplete alerts
  currently do nothing but change `account_status`/`profile_status`)
- `audit` (AuditLog) — item 25 (not written to by any endpoint yet)
- Frontend integration, Docker, Postman collection — items 26–29

Build these in the dev-order sequence from Section 21 of the architecture
doc rather than jumping ahead — several of them (matching, approval) depend
on `placement_drives` existing first.

## Known things to fix before this is production-ready

- `AuditLog.ipAddress` is mapped as a plain `String` against a Postgres
  `inet` column — fine as an entity shell for now, but the first real write
  path (once Audit Service is built) will need an explicit cast or a
  different column type.
- No integration test hits an actual Postgres instance — `AuthServiceTest`
  is a pure Mockito unit test. Add a Testcontainers-based test once you're
  ready to verify the Flyway migration itself runs cleanly.
