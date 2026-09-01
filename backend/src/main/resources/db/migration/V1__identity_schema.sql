-- ============================================================================
-- MODULE 1: IDENTITY & AUTH — colleges, users, roles, permissions, RBAC, tokens
-- Mirrors the "Identity Domain" section of the approved V1 database schema.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING');

CREATE TABLE colleges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    domain      VARCHAR(150),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO colleges (name) VALUES ('Default College');

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id              UUID REFERENCES colleges(id),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password                VARCHAR(255) NOT NULL,
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    phone                   VARCHAR(15) UNIQUE,
    profile_photo           TEXT,
    status                  user_status NOT NULL DEFAULT 'PENDING',
    email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token       VARCHAR(255),
    email_verification_expires_at  TIMESTAMP,
    password_reset_token           VARCHAR(255),
    password_reset_expires_at      TIMESTAMP,
    failed_login_attempts   INT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMP,
    last_login              TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP
);
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_phone  ON users(phone);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name   VARCHAR(100) NOT NULL UNIQUE,
    module            VARCHAR(50) NOT NULL,
    description       TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================================
-- SEED DATA — baseline roles and permissions
-- ============================================================================

INSERT INTO roles (name, description) VALUES
    ('STUDENT', 'Candidate seeking placement'),
    ('COMPANY', 'Recruiting organization'),
    ('PLACEMENT_OFFICER', 'College placement staff'),
    ('ADMIN', 'System administrator');

INSERT INTO permissions (permission_name, module, description) VALUES
    ('APPLY_JOB', 'JOB', 'Student can apply for jobs'),
    ('UPLOAD_RESUME', 'STUDENT', 'Student can upload resume'),
    ('UPDATE_PROFILE', 'STUDENT', 'Student can update profile'),
    ('VIEW_APPLICATIONS', 'APPLICATION', 'View own applications'),
    ('CREATE_JOB', 'JOB', 'Company can create job postings'),
    ('UPDATE_JOB', 'JOB', 'Company can update job postings'),
    ('VIEW_APPLICATION', 'APPLICATION', 'Company can view applications to their jobs'),
    ('SHORTLIST_STUDENT', 'APPLICATION', 'Company can shortlist a candidate'),
    ('VERIFY_COMPANY', 'COMPANY', 'Placement Officer can approve/reject companies'),
    ('MANAGE_PLACEMENT', 'PLACEMENT', 'Placement Officer can manage placement records'),
    ('VIEW_REPORT', 'PLACEMENT', 'View placement statistics/reports'),
    ('SEND_NOTIFICATION', 'NOTIFICATION', 'Send manual notifications'),
    ('CREATE_USER', 'USER', 'Admin can create users'),
    ('DELETE_USER', 'USER', 'Admin can delete users'),
    ('MANAGE_ROLE', 'USER', 'Admin can manage roles/permissions'),
    ('SYSTEM_SETTINGS', 'SYSTEM', 'Admin can configure system settings'),
    ('VIEW_AUDIT_LOG', 'SYSTEM', 'Admin can view audit logs');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'STUDENT' AND p.permission_name IN
    ('APPLY_JOB', 'UPLOAD_RESUME', 'UPDATE_PROFILE', 'VIEW_APPLICATIONS');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'COMPANY' AND p.permission_name IN
    ('CREATE_JOB', 'UPDATE_JOB', 'VIEW_APPLICATION', 'SHORTLIST_STUDENT');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PLACEMENT_OFFICER' AND p.permission_name IN
    ('VERIFY_COMPANY', 'MANAGE_PLACEMENT', 'VIEW_REPORT', 'SEND_NOTIFICATION');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.permission_name IN
    ('CREATE_USER', 'DELETE_USER', 'MANAGE_ROLE', 'SYSTEM_SETTINGS', 'VIEW_AUDIT_LOG');

-- ============================================================================
-- BOOTSTRAP ADMIN (Improvement #9 — solves the "who creates the first admin" problem)
-- Password is BCrypt for "ChangeMe@123" — MUST be rotated immediately after first login.
-- ============================================================================
INSERT INTO users (email, password, first_name, last_name, status, email_verified)
VALUES (
    'admin@placementsetu.local',
    '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5m3P1J1a9v1yhBt4C7CVVU2yBGfKa',
    'System',
    'Admin',
    'ACTIVE',
    TRUE
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@placementsetu.local' AND r.name = 'ADMIN';
