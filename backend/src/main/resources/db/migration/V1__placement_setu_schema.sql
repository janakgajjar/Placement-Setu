-- ============================================================================
-- PLACEMENT SETU — FINAL APPROVED DATABASE SCHEMA (V1)
-- Mirrors Placement_Setu_Final_Database_Schema_v2.html exactly: 16 tables,
-- UUID primary keys, PostgreSQL native enums, plus the constraints/indexes
-- called out in that document's "implementation constraints & indexes" panel.
-- Replaces the earlier identity/resume migrations, which used a different
-- (roles/permissions/colleges) model that the approved schema does not have.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
CREATE TYPE user_role                 AS ENUM ('STUDENT', 'COMPANY', 'PLACEMENT_OFFICER', 'ADMIN');
CREATE TYPE account_status            AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');
CREATE TYPE profile_status            AS ENUM ('INCOMPLETE', 'COMPLETE');
CREATE TYPE resume_processing_status  AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE drive_status              AS ENUM ('PENDING_APPROVAL', 'OPEN', 'CLOSED', 'REJECTED');
CREATE TYPE application_status        AS ENUM ('APPLIED', 'WITHDRAWN', 'SHORTLISTED', 'REJECTED', 'SELECTED');
CREATE TYPE shortlist_status          AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE notification_type         AS ENUM ('PROFILE_INCOMPLETE', 'COMPANY_APPROVED', 'COMPANY_REJECTED',
                                                'DRIVE_APPROVED', 'DRIVE_REJECTED', 'SHORTLIST_APPROVED',
                                                'INTERVIEW_SCHEDULED', 'GENERAL');
CREATE TYPE notification_status       AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ---------------------------------------------------------------------------
-- USERS  (identity + auth + RBAC — no separate roles/permissions tables)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    account_status  account_status NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Case-insensitive unique email, per the schema notes.
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));

-- ---------------------------------------------------------------------------
-- STUDENT_PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE student_profiles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    appar_id          VARCHAR(50) UNIQUE,
    full_name         VARCHAR(150) NOT NULL,
    phone             VARCHAR(15),
    gender            VARCHAR(20),
    course            VARCHAR(100),
    institution       VARCHAR(200),
    graduation_year   SMALLINT,
    cgpa              NUMERIC(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
    backlogs          INT CHECK (backlogs >= 0),
    address           TEXT,
    linkedin_url      VARCHAR(255),
    github_url        VARCHAR(255),
    profile_status    profile_status NOT NULL DEFAULT 'INCOMPLETE',
    placement_locked  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- PLACEMENT_OFFICERS
-- ---------------------------------------------------------------------------
CREATE TABLE placement_officers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name    VARCHAR(150) NOT NULL,
    phone        VARCHAR(15),
    designation  VARCHAR(100),
    department   VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- SKILLS + STUDENT_SKILLS (junction)
-- ---------------------------------------------------------------------------
CREATE TABLE skills (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE student_skills (
    student_profile_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (student_profile_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- PROJECTS / CERTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    project_url         VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_student_profile ON projects(student_profile_id);

CREATE TABLE certifications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id    UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    name                  VARCHAR(200) NOT NULL,
    issuing_organization  VARCHAR(200),
    issue_date            DATE,
    credential_url        VARCHAR(255),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certifications_student_profile ON certifications(student_profile_id);

-- ---------------------------------------------------------------------------
-- RESUMES (one per student profile — file metadata/reference only)
-- ---------------------------------------------------------------------------
CREATE TABLE resumes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id   UUID NOT NULL UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
    file_name            VARCHAR(255) NOT NULL,
    file_type            VARCHAR(50),
    file_size            BIGINT,
    storage_key          VARCHAR(255) NOT NULL UNIQUE,
    processing_status    resume_processing_status NOT NULL DEFAULT 'PENDING',
    uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name  VARCHAR(200) NOT NULL,
    gstin         VARCHAR(20) UNIQUE,
    phone         VARCHAR(15),
    website       VARCHAR(255),
    address       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- PLACEMENT_DRIVES + DRIVE_SKILLS (junction)
-- ---------------------------------------------------------------------------
CREATE TABLE placement_drives (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    job_title           VARCHAR(200) NOT NULL,
    description         TEXT,
    location            VARCHAR(150),
    ctc                 NUMERIC(12,2),
    vacancies           INT NOT NULL CHECK (vacancies > 0),
    minimum_cgpa        NUMERIC(4,2) CHECK (minimum_cgpa >= 0 AND minimum_cgpa <= 10),
    maximum_backlogs    INT CHECK (maximum_backlogs >= 0),
    required_course     VARCHAR(100),
    graduation_year     SMALLINT,
    registration_start  TIMESTAMPTZ NOT NULL,
    registration_end    TIMESTAMPTZ NOT NULL,
    status              drive_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_drive_registration_window CHECK (registration_end > registration_start),
    -- Lets APPLICATIONS/SHORTLISTS enforce "same drive" composite FKs below.
    CONSTRAINT uq_placement_drives_id UNIQUE (id, company_id)
);
CREATE INDEX idx_placement_drives_company ON placement_drives(company_id);

CREATE TABLE drive_skills (
    placement_drive_id  UUID NOT NULL,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (placement_drive_id, skill_id),
    FOREIGN KEY (placement_drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- APPLICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id   UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    placement_drive_id   UUID NOT NULL REFERENCES placement_drives(id) ON DELETE RESTRICT,
    status               application_status NOT NULL DEFAULT 'APPLIED',
    applied_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at         TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_applications_student_drive UNIQUE (student_profile_id, placement_drive_id),
    -- Lets SHORTLIST_ITEMS enforce "application belongs to this drive" below.
    CONSTRAINT uq_applications_id_drive UNIQUE (id, placement_drive_id)
);
CREATE INDEX idx_applications_student_profile ON applications(student_profile_id);
CREATE INDEX idx_applications_placement_drive ON applications(placement_drive_id);
CREATE INDEX idx_applications_drive_status ON applications(placement_drive_id, status);

-- ---------------------------------------------------------------------------
-- SHORTLISTS + SHORTLIST_ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE shortlists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_drive_id  UUID NOT NULL UNIQUE REFERENCES placement_drives(id) ON DELETE RESTRICT,
    status              shortlist_status NOT NULL DEFAULT 'DRAFT',
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shortlists_id_drive UNIQUE (id, placement_drive_id)
);

CREATE TABLE shortlist_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlist_id         UUID NOT NULL REFERENCES shortlists(id) ON DELETE RESTRICT,
    application_id       UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE RESTRICT,
    placement_drive_id   UUID NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Composite FKs: a shortlist item can only reference an application from
    -- the same drive as its shortlist (per the schema's integrity notes).
    FOREIGN KEY (shortlist_id, placement_drive_id) REFERENCES shortlists(id, placement_drive_id),
    FOREIGN KEY (application_id, placement_drive_id) REFERENCES applications(id, placement_drive_id)
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 notification_type NOT NULL,
    subject              VARCHAR(255) NOT NULL,
    status               notification_status NOT NULL DEFAULT 'PENDING',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at              TIMESTAMPTZ,
    failure_reason       TEXT,
    related_entity_type  VARCHAR(50),
    related_entity_id    UUID
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    UUID,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address   INET,
    metadata     JSONB
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
