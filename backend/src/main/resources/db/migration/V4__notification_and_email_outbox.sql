-- ============================================================================
-- V4 — Notification Service & Durable Email Outbox Schema
-- Enhances in-app notifications with read state, message body, and idempotency.
-- Adds email_outbox table for asynchronous, durable email delivery with retries.
-- ============================================================================

-- 1. Extend notification_type ENUM with domain event types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PROFILE_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PROFILE_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PROFILE_CHANGES_REQUESTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMPANY_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DRIVE_PUBLISHED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DRIVE_CLOSED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPLICATION_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPLICATION_WITHDRAWN';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPLICATION_SELECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPLICATION_REJECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RESUME_PROCESSED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RESUME_FAILED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SECURITY_ALERT';

-- 2. Extend notification_status ENUM with SKIPPED for non-delivery / dev mode
ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'SKIPPED';

-- 3. Update existing notifications table with read tracking, body, and idempotency
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Indexes for efficient querying by recipient and read state
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
    ON notifications(recipient_user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
    ON notifications(recipient_user_id, created_at DESC);

-- Unique partial index to prevent duplicate notifications for the same event key
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_idempotency 
    ON notifications(recipient_user_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- 4. Create email_outbox table for the Transactional Outbox pattern
CREATE TABLE IF NOT EXISTS email_outbox (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email      VARCHAR(255) NOT NULL,
    recipient_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    subject              VARCHAR(255) NOT NULL,
    body_text            TEXT NOT NULL,
    body_html            TEXT,
    status               VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts             INT NOT NULL DEFAULT 0,
    max_attempts         INT NOT NULL DEFAULT 3,
    next_retry_at        TIMESTAMPTZ DEFAULT now(),
    sent_at              TIMESTAMPTZ,
    last_error           TEXT,
    idempotency_key      VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for scheduled worker polling
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_retry 
    ON email_outbox(status, next_retry_at);

-- Unique index to prevent duplicate queued emails for the same event key
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_outbox_recipient_idempotency 
    ON email_outbox(recipient_email, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
