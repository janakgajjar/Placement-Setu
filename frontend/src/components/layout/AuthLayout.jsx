import { Link } from 'react-router-dom';
import { INSTITUTION } from '../../lib/constants';

/**
 * Institutional Authentication Card
 * Matches screenshot 3454cea4.png:
 * - Gujarat Vidyapith Circular Emblem Logo
 * - GUJARAT VIDYAPITH Header
 * - Clean white card on soft ivory background
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="gv-auth-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="gv-auth-card">
        <Link to="/" title="Return to Gujarat Vidyapith Placement Setu">
          <img
            src="/images/gujarat-vidyapith-logo.png"
            alt="Gujarat Vidyapith Official Emblem"
            className="gv-auth-card__logo"
          />
        </Link>
        <h2 className="gv-auth-card__univ">{INSTITUTION.NAME}</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--gv-sage-green-dark)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
          {INSTITUTION.MOTTO_SANSKRIT}
        </p>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary-brown)', marginBottom: '4px' }}>
          {title}
        </h1>
        {subtitle && <p className="gv-auth-card__subtitle">{subtitle}</p>}

        {children}
      </div>
    </div>
  );
}
