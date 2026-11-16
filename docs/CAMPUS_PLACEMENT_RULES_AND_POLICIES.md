# Gujarat Vidyapith — Campus Placement Rules, Bylaws & Operational Policies

**Governing Body:** Central Placement Cell, Gujarat Vidyapith, Ahmedabad  
**Platform:** Placement Setu  
**Effective Date:** Academic Year 2026–2027  
**Scope:** Applies to all registered Students, Participating Companies/Recruiters, Faculty Coordinators, and Placement Officers.

---

## 1. Preamble & Guiding Principles

The campus recruitment program at Gujarat Vidyapith is governed by the principles of equity, transparency, academic discipline, and ethical conduct. Placement Setu serves as the unified digital bridge enforcing these policies programmatically through automated eligibility checks, transaction locking, and auditable records.

---

## 2. Student Selection Rules

### 2.1 "One Student One Job" Core Rule
1. To ensure equitable employment opportunities across the entire student body, each registered student is eligible to secure **only ONE standard campus placement offer**.
2. As soon as a recruiter officially issues an offer and selects a candidate via the platform:
   - The student's application status is updated to `SELECTED`.
   - The student's profile flag `placement_locked` is set to `TRUE`.
   - The student is automatically excluded from applying to subsequent standard campus placement drives.

### 2.2 The "Dream Offer" Exception
A student who has already secured a standard offer is granted an exception to apply for a second drive only if the new drive qualifies as a **Dream Offer**:
- **CTC Threshold:** The drive must offer a Cost to Company (CTC) of **₹8,00,000 (8.0 LPA) or higher**, OR at least **1.5 times** the CTC of the student's existing offer.
- **Administrative Flag:** The drive must be tagged with `is_dream_offer = TRUE` by the Placement Officer during review.
- **Limit:** A student can secure at most **ONE Dream Offer**. Upon receiving a Dream Offer, the student must forfeit their initial offer in writing within 48 hours to release the position for fellow students.

### 2.3 Offer Acceptance & Placement Freeze
- Once selected, the student must confirm acceptance through Placement Setu within 3 working days.
- Failure to respond or unjustified refusal of a standard offer results in automatic debarment from all remaining campus placement drives for that academic year.

---

## 3. Paid Internship Policy

Gujarat Vidyapith strictly upholds fair labor standards and student welfare. Unpaid internships during campus placement are strictly prohibited.

### 3.1 Mandatory Stipend Minimum
- All campus internship opportunities posted on Placement Setu under `drive_type = PAID_INTERNSHIP` or `drive_type = INTERNSHIP_TO_PPO` must provide a minimum monthly stipend of:
  $$\text{Minimum Stipend} \ge \text{₹10,000 per month}$$
- Any placement drive submitted with a stipend below this threshold will be automatically rejected by the `PlacementPolicyService` upon drive creation.

### 3.2 Internship Duration & Academic Balance
- Full-semester internships (6 months) are permitted only in the final semester for programs with curricular internship requirements (e.g., MCA, M.Sc. IT).
- Students undergoing internships must submit monthly progress reports signed by their corporate mentor to the Placement Cell.

### 3.3 Pre-Placement Offer (PPO) Conversion
- If an internship recruiter extends a Pre-Placement Offer (PPO) for full-time employment:
  - The offer must be officially routed through Placement Setu.
  - The student has 7 calendar days to accept or decline.
  - Acceptance transitions the student into the `SELECTED` state with `placement_locked = TRUE`.

---

## 4. Student Shortlisting & Screening Rules

### 4.1 Shortlist Ratios
To respect corporate interviewer time and maintain rigorous standards:
- The maximum number of students shortlisted for technical/HR interviews shall not exceed **5 to 10 candidates per declared vacancy** ($5\times$ to $10\times$ vacancy ratio).

### 4.2 Automated Merit-Based Ranking Algorithm
When applicant pools exceed interview capacity, shortlists are generated using the following deterministic tie-breaking hierarchy:
1. **Academic Merit:** Cumulative Grade Point Average (CGPA) in descending order.
2. **Backlog Clearance:** Candidates with zero active backlogs receive absolute precedence over candidates with backlogs.
3. **Skill Match Score:** Percentage match between the student's verified skills and the drive's required skills.
4. **Application Timestamp:** In the event of an identical score, the student who applied earlier receives priority (First-Come, First-Served tie-breaker).

### 4.3 Direct Finalization Contract (API v2.0 Section 29)
- In accordance with API Reference v2.0 Section 29, the recruiting company finalizes shortlists directly within the portal.
- All shortlisted candidates receive immediate automated in-app alerts and outbox-queued transactional emails.

---

## 5. Age Limit & Academic Continuity Bylaws

### 5.1 Age Limit Policy
- Certain corporate recruiters and government-affiliated partners enforce maximum age limits based on statutory or apprenticeship norms.
- When a drive specifies a `maximum_age` threshold (e.g., 25 years):
  - The student's age is calculated dynamically from their verified `date_of_birth`:
    $$\text{Age} = \text{Current Year} - \text{Birth Year}$$
  - If a student profile lacks a registered Date of Birth, the system will prevent application submission until the student updates their profile.
  - Candidates exceeding the declared age limit on the date of drive registration are barred by the policy engine.

### 5.2 Academic Backlog Criteria
- **Active Backlogs:** Unless explicitly permitted by the company, students with more than the drive's `maximum_backlogs` (typically 0 or 1) cannot apply.
- **Dead Backlogs:** Cleared past backlogs are permissible provided the student's aggregate CGPA meets the drive's `minimum_cgpa`.

### 5.3 Academic Gap Limits
- A maximum academic gap of **up to 2 years** between Higher Secondary (12th/Diploma) and Graduation/Post-Graduation is permissible. Gaps exceeding 2 years require an affidavit and Placement Officer approval.

---

## 6. Student Code of Conduct & Disciplinary Penalties

| Infraction | Consequence / Disciplinary Action |
| :--- | :--- |
| **No-show for Interview** | Debarred from the next **2 consecutive placement drives**. |
| **False Academic Data** (Forged CGPA/APAAR) | Immediate cancellation of placement registration, revocation of active offers, and disciplinary reporting to the University Academic Council. |
| **Direct Contact with Recruiter** | Contacting corporate HR outside the Placement Setu channel leads to a **30-day suspension** from the portal. |
| **Refusal of Accepted Offer** | Disqualification from participating in any further placement activities; official notice issued to student dossier. |

---

## 7. Programmatic Enforcement Summary

All policies defined above are directly hardcoded and enforced by:
- **Backend Enforcement:** [PlacementPolicyService.java](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/policy/service/PlacementPolicyService.java)
- **Database Schema:** [V5__resume_batch_processing_and_policies.sql](file:///e:/Placement-Setu/backend/src/main/resources/db/migration/V5__resume_batch_processing_and_policies.sql)
- **Rate Limit Safeguards:** [RateLimitingFilter.java](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/security/RateLimitingFilter.java)
- **Notifications & Communication:** [NotificationService.java](file:///e:/Placement-Setu/backend/src/main/java/com/placementsetu/notification/service/NotificationService.java)
