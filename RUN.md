# Running Placement Setu locally (backend)

## Prerequisites
- Java 17
- Maven (or use the wrapper if the repo has one)
- PostgreSQL 14+ running locally
- A Gemini API key (for resume AI parsing) — one is already in
  `application.yml` for dev use; replace it with your own for anything beyond
  quick local testing.

## 1. Create the database
```sql
CREATE DATABASE placement_setu;
```

## 2. Set environment variables (or edit application.yml directly)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=placement_setu
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=some_random_string_at_least_32_characters_long
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## 3. Run the backend
```bash
cd backend
mvn spring-boot:run
```

Flyway runs automatically on startup and creates all 16 tables plus the seed
data (bootstrap admin + starter skills). Watch the startup log for
`Successfully applied 2 migrations` — if that doesn't appear, Flyway failed
and the app won't have a schema.

The API is served at `http://localhost:8080`. Swagger UI is at
`http://localhost:8080/swagger-ui.html`.

## 4. Smoke-test the flow (curl or Postman)

**Register a student**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@test.com","password":"Passw0rd1","fullName":"Test Student","phone":"9876543210","course":"MCA"}'
```
Copy the `accessToken` from the response.

**Check the dashboard**
```bash
curl http://localhost:8080/api/v1/students/me \
  -H "Authorization: Bearer <accessToken>"
```
You should see `"visibleToCompanies": false` and a list of `missingFields`
(institution, graduationYear, cgpa — since registration only collects
name/phone/course).

**Complete the profile**
```bash
curl -X PUT http://localhost:8080/api/v1/students/me \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"institution":"Gujarat Vidyapith","graduationYear":2026,"cgpa":8.5}'
```

**Upload a resume** (PDF/DOCX/TXT)
```bash
curl -X POST http://localhost:8080/api/v1/resumes/me \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@/path/to/resume.pdf"
```
This triggers text extraction + Gemini parsing + auto-fill of
phone/linkedin/github/skills/projects. Check `/api/v1/students/me` again —
`visibleToCompanies` should now be `true` once graduation year/CGPA/etc are
all set and the resume finishes processing.

**Register + approve a company**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register/company \
  -H "Content-Type: application/json" \
  -d '{"email":"acme@test.com","password":"Passw0rd1","companyName":"Acme Corp","gstin":"22AAAAA0000A1Z5","address":"123 Main St"}'
```
Login as the seeded admin (`admin@placementsetu.local` /
`ChangeMe@123` — rotate this immediately in any real deployment) and approve:
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@placementsetu.local","password":"ChangeMe@123"}'

curl -X POST http://localhost:8080/api/v1/admin/companies/{companyId}/approve \
  -H "Authorization: Bearer <admin_accessToken>"
```
The company can now log in (`account_status` was `PENDING`, is now `ACTIVE`).

## Resetting the database during development
Flyway won't let you edit an already-applied migration file. If you need to
change the schema while iterating locally, either add a new
`V3__something.sql` migration, or drop and recreate the database:
```sql
DROP DATABASE placement_setu;
CREATE DATABASE placement_setu;
```
then restart the app so Flyway reapplies from scratch.

## What's not wired up yet
See `MIGRATION_NOTES.md` — placement drives, applications, shortlisting,
real email notifications, and the frontend are the next pieces per the
Section 21 dev order.
