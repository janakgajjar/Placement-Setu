import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../../lib/routes';
import { INSTITUTION } from '../../lib/constants';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePortalRedirect = () => {
    if (user && ROLE_DEFAULT_ROUTES[user.role]) {
      navigate(ROLE_DEFAULT_ROUTES[user.role]);
    } else {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <header className="gv-header">
      <div className="gv-container gv-header__inner">
        {/* Gujarat Vidyapith Logo & Identity */}
        <Link to={ROUTES.HOME} className="gv-brand" aria-label="Gujarat Vidyapith Placement Setu Home">
          <img
            src="/images/gujarat-vidyapith-logo.png"
            alt="Gujarat Vidyapith Official Emblem"
            className="gv-brand__logo"
          />
          <div className="gv-brand__text">
            <span className="gv-brand__sanskrit">{INSTITUTION.MOTTO_SANSKRIT}</span>
            <span className="gv-brand__title">{INSTITUTION.NAME}</span>
            <span className="gv-brand__subtitle">Placement Setu · Career Guidance &amp; Placement Cell</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="gv-nav" aria-label="Main Navigation">
          <NavLink to={ROUTES.HOME} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`} end>
            Home
          </NavLink>
          <NavLink to={ROUTES.ABOUT} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`}>
            About
          </NavLink>
          <NavLink to={ROUTES.PARTNER_COMPANIES} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`}>
            Companies
          </NavLink>
          <NavLink to={ROUTES.DRIVES_EXPLORER} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`}>
            Placement Drives
          </NavLink>
          <NavLink to={ROUTES.POLICIES} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`}>
            How it works
          </NavLink>
          <NavLink to={ROUTES.CONTACT} className={({ isActive }) => `gv-nav__link ${isActive ? 'active' : ''}`}>
            Contact
          </NavLink>
        </nav>

        {/* Action Controls */}
        <div className="gv-header__actions">
          {isAuthenticated ? (
            <div className="gv-flex gv-gap-sm">
              <button
                type="button"
                onClick={handlePortalRedirect}
                className="gv-btn gv-btn--sage gv-btn--sm"
              >
                Go to Dashboard →
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate(ROUTES.HOME, { replace: true });
                }}
                className="gv-btn gv-btn--outline gv-btn--sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="gv-flex gv-gap-sm">
              <Link to={ROUTES.LOGIN} className="gv-btn gv-btn--outline gv-btn--sm">
                Login
              </Link>
              <Link to={ROUTES.REGISTER_STUDENT} className="gv-btn gv-btn--primary gv-btn--sm">
                Sign Up
              </Link>
            </div>
          )}

          <button
            type="button"
            className="gv-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile navigation menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{ backgroundColor: '#FAF6F5', borderTop: '1px solid var(--gv-border)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to={ROUTES.HOME} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>Home</Link>
            <Link to={ROUTES.ABOUT} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>About</Link>
            <Link to={ROUTES.PARTNER_COMPANIES} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>Companies</Link>
            <Link to={ROUTES.DRIVES_EXPLORER} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>Placement Drives</Link>
            <Link to={ROUTES.POLICIES} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>How it works</Link>
            <Link to={ROUTES.CONTACT} onClick={() => setMobileOpen(false)} style={{ fontWeight: 600 }}>Contact</Link>
            <hr style={{ borderColor: 'var(--gv-border)' }} />
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); handlePortalRedirect(); }}
                  className="gv-btn gv-btn--sage gv-btn--sm"
                  style={{ width: '100%' }}
                >
                  Go to Dashboard →
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                    navigate(ROUTES.HOME, { replace: true });
                  }}
                  className="gv-btn gv-btn--outline gv-btn--sm"
                  style={{ width: '100%' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileOpen(false)}
                  className="gv-btn gv-btn--outline gv-btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER_STUDENT}
                  onClick={() => setMobileOpen(false)}
                  className="gv-btn gv-btn--primary gv-btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
