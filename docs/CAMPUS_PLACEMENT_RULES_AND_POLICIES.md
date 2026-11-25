# Gujarat Vidyapith — Campus Placement Rules, Bylaws & Operational Policies

**Governing Body:** Central Placement Cell, Gujarat Vidyapith, Ahmedabad  
**Platform:** Placement Setu  
**Effective Date:** Academic Year 2026–2027  
**Scope:** Applies to all registered Students, Participating Companies/Recruiters, Faculty Coordinators, and Placement Officers.

---

## 1. Preamble & Guiding Principles

The campus recruitment program at Gujarat Vidyapith is governed by the principles of equity, transparency, academic discipline, and ethical conduct. Placement Setu serves as the unified digital bridge enforcing these policies programmatically through automated eligibility checks, transactional locking, officer drive approval, and auditable records.

---

## 2. Company Onboarding & Provisioning Bylaws

### 2.1 Placement Officer Provisioning Model
1. To ensure only accredited and verified corporate recruiters access university candidate profiles, **company self-registration is disabled**.
2. All participating corporate entities must be directly vetted and provisioned by the Placement Officer via `POST /api/v1/placement-officers/companies`.
3. The Placement Officer records:
   - Official Corporate Name & CIN/GSTIN
   - Point of Contact HR Email and Mobile
   - Official Corporate Domain / Website
   - Operational Office Address
4. Upon provisioning, the system creates the corporate account with an initial temporary password and flags the account with:
   $$\text{must\_change\_password} = \text{TRUE}$$

### 2.2 Mandatory First-Time Password Reset
- Upon initial sign-in at `/login`, the company user is immediately presented with a forced password update screen.
- Access to recruiter features (drive creation, candidate search, applicant review) remains restricted until the temporary password is replaced with a compliant corporate password via `POST /api/v1/auth/change-password`.

---

## 3. Placement Drive Officer Approval Flow

### 3.1 Non-Direct Publishing Policy
- A company recruiter may draft and configure placement drives at any time (`POST /api/v1/placement-drives`).
- A drive initially resides in status `DRAFT`.
- When the recruiter initiates publication (`POST /api/v1/placement-drives/{driveId}/publish`), the drive transitions strictly to:
  $$\text{DRAFT} \longrightarrow \text{PENDING\_APPROVAL}$$
- **A drive in `PENDING_APPROVAL` is strictly hidden from students and public explorers.**

### 3.2 Placement Officer Review Queue
- The Placement Officer reviews pending drives via `GET /api/v1/placement-officers/drives?status=PENDING_APPROVAL`.
- The Officer validates:
  1. Minimum stipend compliance for internships ($\ge \text{₹10,000/month}$).
  2. Equitable CTC compensation and job role descriptions.
  3. Proper course and minimum CGPA criteria.
- **Approval (`POST .../approve`):** Status moves to `PUBLISHED`. The drive becomes immediately visible to students and the public drive explorer, and automated in-app notifications are broadcast.
- **Rejection (`POST .../reject`):** Officer submits a structured `rejection_reason`. The status moves to `REJECTED`. The company receives feedback, can modify the parameters, and resubmit for approval.

---

## 4. Student Selection & Placement Policies

### 4.1 "One Student One Job" Core Rule
1. To ensure equitable employment opportunities across the entire student body, each registered student is eligible to secure **only ONE standard campus placement offer**.
2. As soon as a recruiter officially issues an offer and marks a candidate as `SELECTED`:
   - The student's application status is updated to `SELECTED`.
   - The student's profile flag `placement_locked` is set to `TRUE`.
   - The student is automatically excluded from applying to subsequent standard campus placement drives.

### 4.2 The "Dream Offer" Exception
A student who has already secured a standard offer is granted an exception to apply for a second drive only if the new drive qualifies as a **Dream Offer**:
- **CTC Threshold:** The drive must offer a Cost to Company (CTC) of **₹8,00,000 (8.0 LPA) or higher**, OR at least **1.5 times** the CTC of the student's existing offer.
- **Administrative Flag:** The drive must be tagged with `is_dream_offer = TRUE` by the Placement Officer during review.
- **Limit:** A student can secure at most **ONE Dream Offer**. Upon receiving a Dream Offer, the student must forfeit their initial offer in writing within 48 hours to release the position for fellow students.

### 4.3 Offer Acceptance & Placement Freeze
- Once selected, the student must confirm acceptance through Placement Setu within 3 working days.
- Failure to respond or unjustified refusal of a standard offer results in automatic debarment from all remaining campus placement drives for that academic year.

---

## 5. Paid Internship Policy

Gujarat Vidyapith strictly upholds fair labor standards and student welfare. Unpaid internships during campus placement are strictly prohibited.

### 5.1 Mandatory Stipend Minimum
- All campus internship opportunities posted on Placement Setu under `drive_type = PAID_INTERNSHIP` or `drive_type = INTERNSHIP_TO_PPO` must provide a minimum monthly stipend of:
  $$\text{Minimum Stipend} \ge \text{₹10,000 per month}$$
- Any placement drive submitted with a stipend below this threshold will be automatically rejected by the `PlacementPolicyService` upon drive creation.

### 5.2 Internship Duration & Academic Balance
- Full-semester internships (6 months) are permitted only in the final semester for programs with curricular internship requirements (e.g., MCA, M.Sc. IT).
- Students undergoing internships must submit monthly progress reports signed by their corporate mentor to the Placement Cell.

### 5.3 Pre-Placement Offer (PPO) Conversion
- If an internship recruiter extends a Pre-Placement Offer (PPO) for full-time employment:
  - The offer must be officially routed through Placement Setu.
  - The student has 7 calendar days to accept or decline.
  - Acceptance transitions the student into the `SELECTED` state with `placement_locked = TRUE`.

---

## 6. Student Resume Management & KYC

### 6.1 Individual Student Resume Upload
- In line with university data governance, bulk or batch resume uploads by third parties are disabled.
- Each student uploads their own single resume (`.pdf`, `.docx`, `.txt`) directly at `/api/v1/resumes/me`.
- Text is extracted and parsed using the Gemini AI Parsing Engine to populate verified skills, projects, and academic histories.
- Each student is responsible for validating their parsed profile before applying to drives.

---

## 7. Recruiter Candidate Search & Skill Match Scoring

### 7.1 Candidate Search Directory
- Authorized recruiters may search university candidates via `GET /api/v1/companies/me/candidates`.
- Search filters include: `skills`, `course`, `minCgpa`, `maxBacklogs`, and pagination.
- Only candidates with complete profiles are surfaced.

### 7.2 Skill Matching Algorithm
When viewing candidates for a specific drive (`GET /api/v1/companies/me/drives/{driveId}/candidates`):
1. **Skill Normalization:** Skills are trimmed, lowercased, and mapped through alias dictionaries (e.g. `js` $\to$ `javascript`, `reactjs` $\to$ `react`).
2. **Match Score Calculation:**
   $$\text{MatchScore} = \left(\frac{\text{Matched Required Skills}}{\text{Total Required Skills}}\right) \times 100$$
3. **Eligibility Verification:** Checks `minCgpa`, `maxBacklogs`, and course eligibility.
4. **Privacy Shield:** To prevent unauthorized contact, student email, phone number, and street addresses remain masked in search results until the candidate formally submits an application to that company's drive.

---

## 8. Application Pipeline & Audit Logging

### 8.1 Formal Pipeline Stages
Applications progress sequentially through defined states:
$$\text{APPLIED} \longrightarrow \text{UNDER\_REVIEW} \longrightarrow \text{SHORTLISTED} \longrightarrow \text{INTERVIEW\_SCHEDULED} \longrightarrow \text{SELECTED / REJECTED}$$

### 8.2 Immutable Audit Trail
- Every status update is recorded in `application_status_history`.
- Stores the originating status, terminating status, reviewer user ID, optional feedback notes, and timestamp.

---

## 9. Disciplinary Penalties & Governance

| Infraction | Consequence / Disciplinary Action |
| :--- | :--- |
| **No-show for Interview** | Debarred from the next **2 consecutive placement drives**. |
| **False Academic Data** (Forged CGPA/APPAR) | Immediate cancellation of placement registration, revocation of active offers, and reporting to the University Academic Council. |
| **Direct Contact with Recruiter** | Contacting corporate HR outside the Placement Setu channel leads to a **30-day suspension** from the portal. |
| **Refusal of Accepted Offer** | Disqualification from participating in any further placement activities; official notice issued to student dossier. |
