-- ============================================================================
-- V5 — Resume Batch Processing & Campus Placement Policy Schema
-- Adds support for:
-- 1. Batch resume parsing jobs and items tracking.
-- 2. Placement policies: Date of Birth (Age Limits), Drive Type (Paid Internship / FTE),
--    Stipend amounts, Dream Offer flags, and Shortlist constraints.
-- ============================================================================

-- 1. Create resume_batch_jobs table
CREATE TABLE IF NOT EXISTS resume_batch_jobs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name               VARCHAR(150) NOT NULL,
    submitted_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    total_resumes          INT NOT NULL DEFAULT 0,
    processed_count        INT NOT NULL DEFAULT 0,
    success_count          INT NOT NULL DEFAULT 0,
    failed_count           INT NOT NULL DEFAULT 0,
    status                 VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resume_batch_jobs_user 
    ON resume_batch_jobs(submitted_by_user_id, created_at DESC);

-- 2. Create resume_batch_items table
CREATE TABLE IF NOT EXISTS resume_batch_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_job_id     UUID NOT NULL REFERENCES resume_batch_jobs(id) ON DELETE CASCADE,
    file_name        VARCHAR(255) NOT NULL,
    student_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message    TEXT,
    processed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resume_batch_items_batch 
    ON resume_batch_items(batch_job_id, status);

-- 3. Policy fields for Student Profiles (Age Limit rule support)
ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 4. Policy fields for Placement Drives (Paid Internship, Age Limit, Dream Offer)
ALTER TABLE placement_drives
    ADD COLUMN IF NOT EXISTS drive_type VARCHAR(50) DEFAULT 'FULL_TIME',
    ADD COLUMN IF NOT EXISTS stipend NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS maximum_age INT,
    ADD COLUMN IF NOT EXISTS is_dream_offer BOOLEAN DEFAULT FALSE;
