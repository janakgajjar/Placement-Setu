import { Link } from 'react-router-dom';
import InstitutionalTopBar from '../components/layout/InstitutionalTopBar';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SocialPill from '../components/layout/SocialPill';
import { INSTITUTION } from '../lib/constants';
import { ROUTES } from '../lib/routes';

export default function About() {
  return (
    <div>
      {/* Banner with Gandhiji Spinning Wheel Theme (Matching Screenshot c7acf691.jpg) */}
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
              Home | About Gujarat Vidyapith
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: 0 }}>
              About Gujarat Vidyapith &amp; Placement Setu
            </h1>
            <p style={{ color: '#E2D9D2', marginTop: '10px', fontSize: '1.05rem', maxWidth: '700px' }}>
              {INSTITUTION.STATUS} · {INSTITUTION.NAAC_GRADE}
            </p>
          </div>
        </section>

        <section className="gv-section gv-section--white">
          <div className="gv-container gv-container--narrow">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <img
                src="/images/gujarat-vidyapith-logo.png"
                alt="Gujarat Vidyapith Seal"
                style={{ width: '84px', height: '84px', objectFit: 'contain' }}
              />
              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--gv-primary-brown)', margin: 0 }}>
                  Founded on Truth, Non-Violence &amp; Self-Reliance
                </h2>
                <p style={{ color: 'var(--gv-sage-green-dark)', fontWeight: 600, fontSize: '0.9rem', margin: '4px 0 0' }}>
                  {INSTITUTION.MOTTO_SANSKRIT} — "{INSTITUTION.MOTTO_TRANSLATION}"
                </p>
              </div>
            </div>

            <div style={{ fontSize: '1.02rem', lineHeight: 1.8, color: 'var(--gv-text-main)' }}>
              <p style={{ marginBottom: '20px' }}>
                <strong>Gujarat Vidyapith</strong> was established on <strong>18th October, 1920</strong> by <strong>Mahatma Gandhi</strong>, 
                who served as its life-long Chancellor. Born out of the Non-Cooperation Movement, the university was founded to prepare youth 
                for the national reconstruction of India through education grounded in character building, rural service, and vocational craftsmanship.
              </p>

              <p style={{ marginBottom: '20px' }}>
                In 1963, the Government of India conferred the status of <strong>Deemed-to-be-University</strong> under Section 3 of the UGC Act, 1956. 
                Today, the institution is accredited with Grade <strong>'B++'</strong> by the National Assessment and Accreditation Council (NAAC), 
                imparting quality postgraduate, doctoral, and undergraduate degrees across Computer Applications (MCA), Information Technology, 
                Rural Management, Social Work, Education, and Languages.
              </p>

              <h3 style={{ fontSize: '1.35rem', color: 'var(--gv-primary-brown)', marginTop: '40px', marginBottom: '14px' }}>
                About Placement Setu
              </h3>

              <p style={{ marginBottom: '20px' }}>
                <strong>Placement Setu</strong> ("The Placement Bridge") is Gujarat Vidyapith’s institutional campus recruitment portal. 
                It centralizes student profile verification, AI-assisted resume parsing, corporate recruiter accreditation, placement drive scheduling, 
                and transactional notification delivery.
              </p>

              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--primary gv-btn--lg">
                  Explore Current Placement Drives →
                </Link>
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}
