-- ============================================================================
-- V15 — Convert audit_logs.ip_address to VARCHAR(45) and users enums to VARCHAR(30)
-- Resolves:
--   1. INET vs VARCHAR expression mismatch during audit logging on student profile update
--   2. Operator does not exist (account_status = accountstatus) during company queries
-- ============================================================================

-- 1. Convert audit_logs.ip_address from INET to VARCHAR(45)
ALTER TABLE audit_logs
    ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::text;

-- 2. Convert users.account_status from enum to VARCHAR(30)
ALTER TABLE users
    ALTER COLUMN account_status DROP DEFAULT,
    ALTER COLUMN account_status TYPE VARCHAR(30) USING account_status::text,
    ALTER COLUMN account_status SET DEFAULT 'PENDING';

-- 3. Convert users.role from enum to VARCHAR(30)
ALTER TABLE users
    ALTER COLUMN role DROP DEFAULT,
    ALTER COLUMN role TYPE VARCHAR(30) USING role::text,
    ALTER COLUMN role SET DEFAULT 'STUDENT';
