# Placement Setu — Full-Stack Deployment & Environment Configuration Guide

**Platform:** Placement Setu (Spring Boot 3.2.5 Backend + React 18 / Vite Frontend + PostgreSQL)  
**Deployment Target:** Frontend on **Vercel**, Backend on **Render / Railway / Cloud VM**, Database on **Neon.tech / Supabase / Render PostgreSQL**.

---

## 1. Important Architecture Note (Vercel vs. Spring Boot)

> [!IMPORTANT]
> **Vercel Compatibility:**
> - **Frontend (React + Vite):** Fully supported on Vercel. It builds static assets (`dist/`) and serves them via Vercel's global CDN.
> - **Backend (Spring Boot / Java 17):** Vercel is a serverless platform built for Node.js/Python/Go serverless functions; it does **not** natively host long-running Java Spring Boot containers or background scheduled workers (`EmailOutboxDispatcher`).
> - **Standard Production Architecture:**
>   - **Frontend:** Hosted on **Vercel** (e.g. `https://placement-setu.vercel.app`)
>   - **Backend API:** Hosted on **Render.com** or **Railway.app** (e.g. `https://placement-setu-api.onrender.com`)
>   - **Database:** Hosted on **Neon.tech** or **Supabase** (Managed PostgreSQL)

---

## 2. File-by-File Configuration Values & Sources

### 2.1 Backend Configuration

#### File 1: `backend/src/main/resources/application.yml`
This file reads all credentials from Environment Variables with safe local defaults.

| Environment Variable | Where to get the Value | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **`DB_HOST`** | Your PostgreSQL Server IP or Cloud Provider (Neon.tech / Supabase / Render) | `ep-dry-pond-123.ap-southeast-1.aws.neon.tech` (or `localhost`) | Database server hostname. |
| **`DB_PORT`** | PostgreSQL Port | `5432` | Standard PostgreSQL port. |
| **`DB_NAME`** | Database Name | `placement_setu` (or `neondb`) | Database instance name. |
| **`DB_USERNAME`** | Database Username | `postgres` (or cloud DB user) | PostgreSQL user. |
| **`DB_PASSWORD`** | Database Password | Your actual DB password | Kept secret; never committed to git. |
| **`JWT_SECRET`** | Generate any random 256-bit string (min 32 chars) | `G7k9#mP2$vL5xR8*wQ1@tY4!nE6^bV9z` | Secret key used to sign and verify JWT authentication tokens. |
| **`CORS_ALLOWED_ORIGINS`**| Your Vercel domain & local frontend | `http://localhost:5173,https://placement-setu.vercel.app` | Comma-separated allowed frontend origins. |
| **`GEMINI_API_KEY`** | Google AI Studio ([aistudio.google.com](https://aistudio.google.com/app/apikey)) | `AIzaSyD-YourActualGeminiApiKey` | Used by `AiResumeParser` to extract skills and projects from resumes. |
| **`MAIL_ENABLED`** | Set to `true` for live emails, `false` for dev mode | `true` (prod) or `false` (dev) | If `false`, emails are saved in DB with status `SKIPPED` without connecting to SMTP. |
| **`MAIL_HOST`** | SMTP Provider Host (Gmail, Brevo, SendGrid, Mailpit) | `smtp.gmail.com` (or `smtp-relay.brevo.com` or `localhost`) | SMTP mail server. |
| **`MAIL_PORT`** | SMTP Port | `587` (TLS) or `465` (SSL) or `1025` (Mailpit) | SMTP port. |
| **`MAIL_USERNAME`** | SMTP Account Email / Username | `your.college.placement@gmail.com` | Email account username. |
| **`MAIL_PASSWORD`** | SMTP App Password (NOT personal password) | `abcd efgh ijkl mnop` (Gmail 16-char App Password) | App password generated in Google Account -> Security -> App passwords. |
| **`MAIL_FROM`** | Official sender address | `noreply@placementsetu.gujaratvidyapith.edu` | From header shown to recipients. |
| **`MAIL_SMTP_AUTH`** | SMTP Authentication | `true` (for Gmail/Brevo) | Set to `true` when using credentials. |
| **`MAIL_SMTP_STARTTLS`**| TLS Encryption | `true` (for port 587) | Encrypts SMTP traffic. |
| **`APP_BASE_URL`** | Your Live Frontend URL | `https://placement-setu.vercel.app` | Included in email templates for clickable login/review links. |

---

### 2.2 Frontend Configuration

#### File 2: `frontend/.env` (and Vercel Dashboard Settings)

| Environment Variable | Where to get the Value | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **`VITE_API_BASE_URL`** | The public URL of your deployed Spring Boot Backend | Local: `http://localhost:8080`<br>Production: `https://placement-setu-api.onrender.com` | Tells the React application where to send REST API requests. |

---

## 3. Step-by-Step Setup Guide

### Step 1: Get Your Free PostgreSQL Database (Cloud)
If you want to test online or deploy:
1. Go to **[Neon.tech](https://neon.tech/)** or **[Supabase.com](https://supabase.com/)** (Free tier available).
2. Create a new project called `placement_setu`.
3. Copy your Connection Details:
   - Host: e.g., `ep-cold-rain-123.ap-southeast-1.aws.neon.tech`
   - Port: `5432`
   - Database: `neondb` or `placement_setu`
   - User: `neondb_owner`
   - Password: `[YOUR_PASSWORD]`

### Step 2: Get a Free Gemini API Key
1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Sign in with your Google Account and click **"Create API key"**.
3. Copy the key (starts with `AIzaSy...`).

### Step 3: Get an SMTP Mail Password (Gmail)
1. Go to your Google Account -> **Security** -> **2-Step Verification** (Enable it if off).
2. Scroll to the bottom and click **App passwords**.
3. App name: `Placement Setu` -> Click **Create**.
4. Copy the generated 16-character password (e.g. `xyza bcde fghi jklm`).

---

## 4. Local Testing Configuration (`.env`)

Create a `.env` file in the root `e:\Placement-Setu\.env`:

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=placement_setu
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password

# Security & CORS
JWT_SECRET=super_secret_jwt_key_minimum_32_characters_long_12345
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Gemini AI Key
GEMINI_API_KEY=AIzaSyYourActualKeyHere

# Email Agent (Set to false for safe sandbox testing)
MAIL_ENABLED=false
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@placementsetu.gujaratvidyapith.edu
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS=false
APP_BASE_URL=http://localhost:5173
```

---

## 5. Deploying to Vercel (Frontend)

1. **Push your code to GitHub / GitLab:**
   ```bash
   git add .
   git commit -m "feat: complete notification service, rate limits, and placement policies"
   git push origin main
   ```
2. **Import Project into Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your repository.
3. **Configure Project Settings in Vercel:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and set to `frontend` (Click *Edit* next to Root Directory and select the `frontend` folder).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Add Environment Variables in Vercel:**
   - Add Name: `VITE_API_BASE_URL`
   - Value: `https://your-backend-api-url.onrender.com` (or your cloud backend URL).
5. Click **Deploy**. Vercel will build and assign you a live URL: `https://placement-setu.vercel.app`.

---

## 6. Deploying the Backend (Spring Boot on Render.com)

1. Go to **[Render.com](https://render.com/)** and click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure:
   - **Name:** `placement-setu-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Java` (or `Docker`)
   - **Build Command:** `./mvnw clean package -DskipTests` (or `mvn clean package -DskipTests`)
   - **Start Command:** `java -jar target/placement-setu-backend-1.0.0.jar`
4. In **Environment Variables** on Render, add:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (from your Neon/Supabase DB)
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `MAIL_ENABLED=true`
   - `MAIL_HOST=smtp.gmail.com`
   - `MAIL_PORT=587`
   - `MAIL_USERNAME=your.email@gmail.com`
   - `MAIL_PASSWORD=your_16_digit_app_password`
   - `MAIL_SMTP_AUTH=true`
   - `MAIL_SMTP_STARTTLS=true`
   - `CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`
   - `APP_BASE_URL=https://your-vercel-domain.vercel.app`
5. Click **Deploy Web Service**. Flyway will automatically run all migrations (`V1` to `V5`), create all tables, and start the API!
