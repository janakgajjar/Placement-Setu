import { INSTITUTION } from '../lib/constants';

export default function Contact() {
  return (
    <div>
      <section
        style={{
          backgroundColor: 'var(--gv-primary-brown-dark)',
          color: '#FFFFFF',
          padding: '45px 0',
          borderBottom: '4px solid var(--gv-sage-green)',
        }}
      >
        <div className="gv-container">
          <div style={{ fontSize: '0.82rem', color: 'var(--gv-linen)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Home | Contact Placement Cell
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
            Career Guidance &amp; Placement Cell
          </h1>
          <p style={{ color: '#E2D9D2', marginTop: '8px', fontSize: '1rem' }}>
            Connect with Gujarat Vidyapith’s placement coordination team.
          </p>
        </div>
      </section>

      <section className="gv-section gv-section--white">
        <div className="gv-container gv-container--narrow">
          <div className="gv-card" style={{ padding: '32px', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--gv-primary-brown)', marginBottom: '16px' }}>
              Central Placement Office Location
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.95rem' }}>
              <div>
                <strong> Campus Address:</strong>
                <p style={{ color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {INSTITUTION.CAMPUS_ADDRESS}
                </p>
              </div>

              <div>
                <strong> Telephones:</strong>
                <p style={{ color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {INSTITUTION.HELPLINE} (Mon - Sat: 10:30 AM to 5:30 PM)
                </p>
              </div>

              <div>
                <strong>Email Address:</strong>
                <p style={{ color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  <a href={`mailto:${INSTITUTION.EMAIL}`}>{INSTITUTION.EMAIL}</a>
                </p>
              </div>

              <div>
                <strong> Key Officers:</strong>
                <p style={{ color: 'var(--gv-text-muted)', marginTop: '2px' }}>
                  {INSTITUTION.OFFICER_NAME}
                </p>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--gv-bg-sand)', padding: '24px', borderRadius: '6px', border: '1px solid var(--gv-border)' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--gv-primary-brown)', marginBottom: '8px' }}>
              Recruiter Assistance &amp; On-Campus Facilities
            </h3>
            <p style={{ color: 'var(--gv-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Gujarat Vidyapith provides dedicated auditorium facilities, seminar halls, high-speed computer labs for coding assessments, and interview rooms for visiting recruitment panels.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
