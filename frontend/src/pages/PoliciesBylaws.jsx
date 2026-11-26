import { Link } from 'react-router-dom';
import { BYLAWS } from '../lib/constants';
import { ROUTES } from '../lib/routes';

export default function PoliciesBylaws() {
  return (
    <div>
      <section
        style={{
          backgroundColor: 'var(--gv-primary-brown-dark)',
          color: '#FFFFFF',
          padding: '50px 0',
          borderBottom: '4px solid var(--gv-sage-green)',
        }}
      >
        <div className="gv-container">
          <div style={{ fontSize: '0.82rem', color: 'var(--gv-linen)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Home | Institutional Bylaws
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: 0 }}>
            Campus Placement Rules &amp; Policies
          </h1>
          <p style={{ color: '#E2D9D2', marginTop: '10px', fontSize: '1.05rem', maxWidth: '700px' }}>
            Institutional guidelines established by the Gujarat Vidyapith Career Guidance &amp; Placement Cell.
          </p>
        </div>
      </section>

      <section className="gv-section gv-section--white">
        <div className="gv-container gv-container--narrow">
          <div className="gv-card" style={{ marginBottom: '30px', borderLeft: '5px solid var(--gv-primary-brown)' }}>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--gv-primary-brown)', marginBottom: '12px' }}>
              1. "One Student One Job" Policy &amp; Dream Offer Rules
            </h2>
            <p style={{ color: 'var(--gv-text-main)', lineHeight: 1.7, marginBottom: '14px' }}>
              {BYLAWS.ONE_STUDENT_ONE_JOB}
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--gv-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Once a candidate receives a formal Letter of Intent (LOI) or Offer Letter, their profile status transitions to <code>PLACEMENT_LOCKED</code>.</li>
              <li>Secondary applications are automatically disabled by the platform policy engine.</li>
            </ul>
          </div>

          <div className="gv-card" style={{ marginBottom: '30px', borderLeft: '5px solid var(--gv-portal-cyan)' }}>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--gv-portal-cyan-dark)', marginBottom: '12px' }}>
              2. Age &amp; Academic Eligibility Validation
            </h2>
            <p style={{ color: 'var(--gv-text-main)', lineHeight: 1.7, marginBottom: '14px' }}>
              Candidate applications are automatically matched against recruiter specifications:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--gv-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Date of Birth Verification:</strong> If a drive specifies a maximum age (e.g. 25 years), candidate age is computed from the profile date of birth.</li>
              <li><strong>Backlog Restrictions:</strong> Candidates exceeding the recruiter's maximum active backlog threshold are barred from registering.</li>
              <li><strong>Course Specificity:</strong> Drives restricted to MCA or MSW scholars will only admit applications from respective verified students.</li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to={ROUTES.LOGIN} className="gv-btn gv-btn--primary gv-btn--lg">
              Proceed to Portal Login →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
