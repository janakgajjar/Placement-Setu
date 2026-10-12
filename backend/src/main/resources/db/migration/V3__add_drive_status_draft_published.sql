-- ============================================================================
-- V3 — Add DRAFT and PUBLISHED values to the drive_status enum
-- The API spec (Section 12) introduces a company-managed drive lifecycle:
--   DRAFT → (publish) → PUBLISHED → (close) → CLOSED
-- Existing PENDING_APPROVAL, OPEN, CLOSED, REJECTED values are preserved.
-- ============================================================================

ALTER TYPE drive_status ADD VALUE IF NOT EXISTS 'DRAFT'     BEFORE 'PENDING_APPROVAL';
ALTER TYPE drive_status ADD VALUE IF NOT EXISTS 'PUBLISHED' AFTER  'DRAFT';
