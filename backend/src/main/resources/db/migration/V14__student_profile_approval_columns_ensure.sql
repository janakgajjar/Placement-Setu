-- ============================================================================
-- V14 — Ensure Student Profile Placement Officer Approval Columns
-- Safely guarantees approval_status, review_remarks, reviewed_by, reviewed_at
-- ============================================================================

ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS review_remarks TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_student_profiles_approval_status ON student_profiles(approval_status);
