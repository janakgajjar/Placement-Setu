import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid var(--gv-border, #D8D2C2)',
          padding: '40px 32px',
          boxShadow: '0 4px 16px rgba(86, 56, 40, 0.08)',
        }}
      >
        <img
          src="/images/gujarat-vidyapith-logo.png"
          alt="Gujarat Vidyapith"
          style={{ width: '80px', height: '80px', margin: '0 auto 20px' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h1
          style={{
            fontSize: '3rem',
            color: 'var(--gv-primary, #563828)',
            margin: '0 0 10px',
            fontFamily: 'serif',
            fontWeight: 700,
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: '1.35rem',
            color: '#2B2B2B',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#555555',
            lineHeight: 1.6,
            marginBottom: '28px',
          }}
        >
          The resource or institutional page you are attempting to visit does not exist, has been archived, or requires authentication.
        </p>
        <Link
          to={ROUTES.HOME}
          className="gv-btn gv-btn--primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            textDecoration: 'none',
          }}
        >
          ← Return to Placement Setu Home
        </Link>
      </div>
    </div>
  );
}
