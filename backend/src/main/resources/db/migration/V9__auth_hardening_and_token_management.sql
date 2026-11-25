-- ============================================================================
-- V9: Auth Hardening, Account Lockout, Refresh Token & Password Reset Management
-- Security enhancement:
-- 1. Account lockout tracking (consecutive failed attempts & lockout duration)
-- 2. Server-side database-backed refresh tokens with rotation and revocation
-- 3. Secure single-use password reset tokens with expiration
-- 4. Email verification status tracking
-- ============================================================================

-- 1. Add lockout and verification columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS failed_attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Refresh tokens table for rotation, reuse detection, and server-side revocation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash              VARCHAR(255) NOT NULL UNIQUE,
    expires_at              TIMESTAMPTZ NOT NULL,
    revoked                 BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at              TIMESTAMPTZ NULL,
    replaced_by_token_hash  VARCHAR(255) NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- 3. Password reset tokens table for single-use recovery flow
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash              VARCHAR(255) NOT NULL UNIQUE,
    expires_at              TIMESTAMPTZ NOT NULL,
    used                    BOOLEAN NOT NULL DEFAULT FALSE,
    used_at                 TIMESTAMPTZ NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
