-- ============================================================================
-- V11: Candidate Matching and Recruiter Search Performance Indexes
-- Adds indexes to accelerate recruiter searches by CGPA, course, profile status,
-- backlogs, and project linkages.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_student_profiles_status_cgpa ON student_profiles(profile_status, cgpa);
CREATE INDEX IF NOT EXISTS idx_student_profiles_course ON student_profiles(course);
CREATE INDEX IF NOT EXISTS idx_student_profiles_backlogs ON student_profiles(backlogs);
CREATE INDEX IF NOT EXISTS idx_projects_student_profile_id ON projects(student_profile_id);
