-- V6: Company Onboarding Architecture & Password Policy
-- Task 7: Officer-driven provisioning, contact person tracking, and forced password rotation on first login

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE companies 
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
