-- ============================================================================
-- V10 — Placement Drive Officer Approval Workflow & Audit Trail
-- Supports officer approval queue: PENDING_APPROVAL -> PUBLISHED or REJECTED
-- Adds rejection reason and officer review audit fields.
-- ============================================================================

ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_placement_drives_status ON placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_placement_drives_company_status ON placement_drives(company_id, status);
