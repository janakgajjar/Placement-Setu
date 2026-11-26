import { Link } from 'react-router-dom';
import { INSTITUTION } from '../../lib/constants';
import { ROUTES } from '../../lib/routes';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="gv-footer" role="contentinfo">
      <div className="gv-container">
        <div className="gv-footer__grid">
          {/* Brand & Address (Matching Official Vidyapith Footer) */}
          <div className="gv-footer__brand-col">
            <div className="gv-footer__logo-wrap">
              <img
                src="/images/gujarat-vidyapith-white-logo.png"
                alt="Gujarat Vidyapith Crest"
                className="gv-footer__logo"
                onError={(e) => {
                  e.target.src = '/images/gujarat-vidyapith-logo.png';
                }}
              />
              <div className="gv-footer__brand-text">
                <h3>{INSTITUTION.NAME}</h3>
                <p>Founded by {INSTITUTION.FOUNDER} (1920)</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.85 }}>{INSTITUTION.STATUS}</p>
              </div>
            </div>

            <p className="gv-footer__address">
              {INSTITUTION.CAMPUS_ADDRESS}
            </p>

            <div className="gv-footer__contact">
              <span>📞 {INSTITUTION.HELPLINE}</span>
              <span>✉️ <a href={`mailto:${INSTITUTION.EMAIL}`}>{INSTITUTION.EMAIL}</a></span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="gv-footer__col">
            <h4>Placement Portal</h4>
            <ul className="gv-footer__links">
              <li><Link to={ROUTES.HOME}>Home</Link></li>
              <li><Link to={ROUTES.DRIVES_EXPLORER}>Current Placement Drives</Link></li>
              <li><Link to={ROUTES.PARTNER_COMPANIES}>Recruiting Partners</Link></li>
              <li><Link to={ROUTES.POLICIES}>One Student One Job Policy</Link></li>
              <li><Link to={ROUTES.POLICIES}>Paid Internship Standards</Link></li>
              <li><Link to={ROUTES.LOGIN}>Student &amp; Recruiter Login</Link></li>
            </ul>
          </div>

          {/* University ERP & Portals (From Vidyapith Website Footer) */}
          <div className="gv-footer__col">
            <h4>Campus Services</h4>
            <ul className="gv-footer__links">
              <li><a href="https://gujaratvidyapith.samarth.edu.in/" target="_blank" rel="noopener noreferrer">Samarth Portal ↗</a></li>
              <li><a href="https://gujaratvidyapith.org/erplogin" target="_blank" rel="noopener noreferrer">Campus ERP (emli) ↗</a></li>
              <li><a href="https://mail.gujaratvidyapith.org/" target="_blank" rel="noopener noreferrer">Webmail Login ↗</a></li>
              <li><a href="https://gujaratvidyapith.org/fees" target="_blank" rel="noopener noreferrer">Online Fees Payment ↗</a></li>
              <li><a href="https://gujaratvidyapith.org/tender" target="_blank" rel="noopener noreferrer">Tenders &amp; Notices ↗</a></li>
              <li><Link to={ROUTES.ABOUT}>About Placement Cell</Link></li>
            </ul>
          </div>

          {/* Recruitment Onboarding */}
          <div className="gv-footer__col">
            <h4>Recruiters &amp; Support</h4>
            <ul className="gv-footer__links">
              <li><Link to={ROUTES.REGISTER_COMPANY}>Corporate Registration</Link></li>
              <li><Link to={ROUTES.CONTACT}>Officer Contact &amp; Desk</Link></li>
              <li><a href="https://www.ugc.gov.in/" target="_blank" rel="noopener noreferrer">UGC Guidelines ↗</a></li>
              <li><a href="https://www.naac.gov.in/" target="_blank" rel="noopener noreferrer">{INSTITUTION.NAAC_GRADE} ↗</a></li>
            </ul>
            <div style={{ marginTop: '20px' }}>
              <Link to={ROUTES.REGISTER_COMPANY} className="gv-btn gv-btn--sage gv-btn--sm">
                Hire from Vidyapith →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar (Dark Chocolate as seen in screenshot 28067734.jpg) */}
      <div className="gv-footer__bottom">
        <div className="gv-container gv-footer__bottom-inner">
          <p>
            Copyright © {new Date().getFullYear()}, Gujarat Vidyapith. All Rights Reserved.
          </p>
          <p>
            {INSTITUTION.NAAC_GRADE} · Placement Setu v2.0
          </p>
        </div>
      </div>

      {/* Back to top button */}
      <button
        type="button"
        onClick={scrollToTop}
        className="gv-back-to-top"
        aria-label="Back to top"
      >
        ↑
      </button>
    </footer>
  );
}
