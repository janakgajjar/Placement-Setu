-- ============================================================================
-- MODULE: RESUME SERVICE — resumes table
-- Mirrors the Resume entity (com.placementsetu.resume.entity.Resume).
-- Moves resume storage from the standalone H2 file database into the single
-- shared PostgreSQL database, per Section 18 of the architecture document.
-- ============================================================================

CREATE TABLE resumes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_file_name   VARCHAR(255),
    parsed_data          TEXT,
    raw_text             TEXT,
    uploaded_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_resumes_uploaded_at ON resumes(uploaded_at);
