-- ============================================================================
-- V12 — Student Profile Placement Officer Approval Workflow
-- Supports DRAFT -> SUBMITTED -> APPROVED / CHANGES_REQUESTED
-- ============================================================================

ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS review_remarks TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_student_profiles_approval_status ON student_profiles(approval_status);
