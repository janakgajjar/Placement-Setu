-- ============================================================================
-- V13 — Placement Drive PO Approval Workflow, Review Remarks & Enum Cleanup
-- Enforces:
--   DRAFT -> PENDING_APPROVAL -> PUBLISHED -> CLOSED
--   PENDING_APPROVAL -> REJECTED -> PENDING_APPROVAL
-- Adds review_remarks & submitted_at, migrates legacy OPEN rows to PUBLISHED,
-- removes obsolete OPEN enum value from drive_status, and sets default DRAFT.
-- ============================================================================

-- 1. Add general review_remarks and submission timestamp columns
ALTER TABLE placement_drives
    ADD COLUMN IF NOT EXISTS review_remarks TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Backfill review_remarks from legacy rejection_reason where present
UPDATE placement_drives
SET review_remarks = rejection_reason
WHERE review_remarks IS NULL
  AND rejection_reason IS NOT NULL;

-- 2. Migrate any legacy OPEN drives to PUBLISHED before removing OPEN
UPDATE placement_drives
SET status = 'PUBLISHED'
WHERE status::text = 'OPEN';

-- 3. Recreate drive_status enum with exact 5 approved values and set default DRAFT
ALTER TABLE placement_drives ALTER COLUMN status DROP DEFAULT;

CREATE TYPE drive_status_new AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'PUBLISHED',
    'REJECTED',
    'CLOSED'
);

ALTER TABLE placement_drives
    ALTER COLUMN status TYPE drive_status_new
    USING status::text::drive_status_new;

DROP TYPE IF EXISTS drive_status CASCADE;
ALTER TYPE drive_status_new RENAME TO drive_status;

ALTER TABLE placement_drives
    ALTER COLUMN status SET DEFAULT 'DRAFT';

-- 4. Add DRIVE_SUBMITTED to notification_type enum for PO submission alerts
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DRIVE_SUBMITTED';
