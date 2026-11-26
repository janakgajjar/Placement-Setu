import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import InstitutionalTopBar from '../components/layout/InstitutionalTopBar';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function Unauthorized() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleDashboardRedirect = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const target = ROLE_DEFAULT_ROUTES[user?.role] || ROUTES.HOME;
    navigate(target, { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 16px' }}>
      <div
        className="gv-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '36px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          borderTop: '5px solid #C62828',
        }}
      >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 16px',
              border: '2px solid #FFCDD2',
            }}
          >
            🛡️
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#C62828', marginBottom: '8px' }}>
            403 · Access Restricted
          </h2>

          <p style={{ color: 'var(--gv-text-subtle, #555)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px' }}>
            You do not have permission or role clearance to access this portal page.
            {isAuthenticated && user && (
              <span style={{ display: 'block', marginTop: '8px', fontSize: '0.85rem', color: '#777' }}>
                Signed in as: <strong>{user.email}</strong> (Role: <code style={{ backgroundColor: '#F0EAE6', padding: '2px 6px', borderRadius: '4px' }}>{user.role}</code>)
              </span>
            )}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="gv-btn gv-btn--primary"
                  onClick={handleDashboardRedirect}
                >
                  Go to My Dashboard →
                </button>
                <button
                  type="button"
                  className="gv-btn gv-btn--secondary"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to={ROUTES.LOGIN} replace className="gv-btn gv-btn--primary">
                Sign In →
              </Link>
            )}
            <Link to={ROUTES.HOME} className="gv-btn gv-btn--secondary">
              Back to Home
            </Link>
          </div>
        </div>
    </div>
  );
}
