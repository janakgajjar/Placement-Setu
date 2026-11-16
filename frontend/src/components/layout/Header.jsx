import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../lib/routes';
import Button from '../ui/Button';
import NotificationBell from '../notifications/NotificationBell';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const isCurrent = (path) => location.pathname === path;

  return (
    <>
      <div className="institutional-bar">
        <div className="container institutional-bar__inner">
          <span>Gujarat Vidyapith · Placement Cell</span>
          <div className="institutional-bar__right">
            {isAuthenticated ? (
              <span className="user-indicator">
                Logged in as <strong>{user?.email}</strong> ({user?.role})
              </span>
            ) : (
              <a href="#footer">Support &amp; Contact</a>
            )}
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="brand" to={ROUTES.HOME} aria-label="Placement Setu home">
            <span className="brand__mark" aria-hidden="true">
              PS
            </span>
            <span>
              <strong>Placement Setu</strong>
              <small>Gujarat Vidyapith</small>
            </span>
          </Link>

          {/* Role-aware navigation links */}
          <nav
            className={`main-nav ${mobileMenuOpen ? 'main-nav--open' : ''}`}
            aria-label="Primary navigation"
          >
            {!isAuthenticated && (
              <>
                <Link to={ROUTES.HOME} className={isCurrent(ROUTES.HOME) ? 'active' : ''}>
                  Home
                </Link>
                <a href="/#about">About</a>
                <a href="/#how-it-works">How It Works</a>
                <a href="/#features">Features</a>
              </>
            )}

            {isAuthenticated && user?.role === 'STUDENT' && (
              <>
                <Link
                  to={ROUTES.STUDENT_DASHBOARD}
                  className={isCurrent(ROUTES.STUDENT_DASHBOARD) ? 'active' : ''}
                >
                  Dashboard
                </Link>
                <Link
                  to={ROUTES.STUDENT_PROFILE}
                  className={isCurrent(ROUTES.STUDENT_PROFILE) ? 'active' : ''}
                >
                  My Profile
                </Link>
                <Link
                  to={ROUTES.STUDENT_RESUME}
                  className={isCurrent(ROUTES.STUDENT_RESUME) ? 'active' : ''}
                >
                  Resume
                </Link>
                <Link
                  to={ROUTES.STUDENT_DRIVES}
                  className={isCurrent(ROUTES.STUDENT_DRIVES) ? 'active' : ''}
                >
                  Drives
                </Link>
                <Link
                  to={ROUTES.STUDENT_APPLICATIONS}
                  className={isCurrent(ROUTES.STUDENT_APPLICATIONS) ? 'active' : ''}
                >
                  Applications
                </Link>
              </>
            )}

            {isAuthenticated && user?.role === 'COMPANY' && (
              <>
                <Link
                  to={ROUTES.COMPANY_DASHBOARD}
                  className={isCurrent(ROUTES.COMPANY_DASHBOARD) ? 'active' : ''}
                >
                  Dashboard
                </Link>
                <Link
                  to={ROUTES.COMPANY_PROFILE}
                  className={isCurrent(ROUTES.COMPANY_PROFILE) ? 'active' : ''}
                >
                  Company Profile
                </Link>
                <Link
                  to={ROUTES.COMPANY_DRIVES}
                  className={isCurrent(ROUTES.COMPANY_DRIVES) ? 'active' : ''}
                >
                  Placement Drives
                </Link>
                <Link
                  to={ROUTES.COMPANY_DRIVE_CREATE}
                  className={isCurrent(ROUTES.COMPANY_DRIVE_CREATE) ? 'active' : ''}
                >
                  Post Drive
                </Link>
              </>
            )}

            {isAuthenticated && (user?.role === 'PLACEMENT_OFFICER' || user?.role === 'ADMIN') && (
              <>
                {user.role === 'PLACEMENT_OFFICER' && (
                  <Link
                    to={ROUTES.OFFICER_DASHBOARD}
                    className={isCurrent(ROUTES.OFFICER_DASHBOARD) ? 'active' : ''}
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to={ROUTES.OFFICER_APPROVALS}
                  className={isCurrent(ROUTES.OFFICER_APPROVALS) ? 'active' : ''}
                >
                  Approvals Queue
                </Link>
                <Link
                  to={ROUTES.OFFICER_COMPANIES}
                  className={isCurrent(ROUTES.OFFICER_COMPANIES) ? 'active' : ''}
                >
                  Companies
                </Link>
              </>
            )}
          </nav>

          {/* Action buttons */}
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Button variant="secondary" onClick={handleLogout} className="button--sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link className="login-link" to={ROUTES.LOGIN}>
                  Login
                </Link>
                <Button to={ROUTES.REGISTER_STUDENT} className="nav-register">
                  Register
                </Button>
              </>
            )}

            <button
              className="mobile-nav-toggle"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
