-- Migration V8: Application Pipeline and Status Audit History
-- Convert applications.status from PostgreSQL enum to VARCHAR(50) for pipeline flexibility

ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'APPLIED';

-- Create application status audit trail table
CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history_app ON application_status_history(application_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_applications_student_status ON applications(student_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_drive_status ON applications(placement_drive_id, status);
