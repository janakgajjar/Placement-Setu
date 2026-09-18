-- ============================================================================
-- SEED DATA — bootstrap admin account + a baseline skills catalogue.
-- Password hash below is BCrypt for "ChangeMe@123" — rotate immediately after
-- first login in any real deployment.
-- ============================================================================

INSERT INTO users (email, password_hash, role, account_status)
VALUES (
    'admin@placementsetu.local',
    '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5m3P1J1a9v1yhBt4C7CVVU2yBGfKa',
    'ADMIN',
    'ACTIVE'
);

INSERT INTO skills (name) VALUES
    ('Java'), ('Spring Boot'), ('React'), ('Python'), ('SQL'), ('PostgreSQL'),
    ('JavaScript'), ('TypeScript'), ('HTML'), ('CSS'), ('Docker'), ('AWS'),
    ('Git'), ('MySQL'), ('MongoDB'), ('C++'), ('C'), ('Node.js'),
    ('REST APIs'), ('Machine Learning');
