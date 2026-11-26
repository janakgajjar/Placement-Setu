-- ============================================================================
-- V7 — Remove Resume Batch Processing Tables
-- Students upload and manage their own resumes individually.
-- Bulk / batch resume ingestion feature has been deprecated and removed.
-- ============================================================================

DROP TABLE IF EXISTS resume_batch_items CASCADE;
DROP TABLE IF EXISTS resume_batch_jobs CASCADE;
