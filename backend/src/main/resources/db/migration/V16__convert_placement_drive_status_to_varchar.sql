-- ============================================================================
-- V16 — Convert placement_drives.status to VARCHAR(30)
-- Resolves PostgreSQL enum type casting mismatch and improves JPA portability.
-- ============================================================================

ALTER TABLE placement_drives
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE VARCHAR(30) USING status::text,
    ALTER COLUMN status SET DEFAULT 'DRAFT';
