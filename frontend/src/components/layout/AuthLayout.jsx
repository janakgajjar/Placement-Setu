import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-layout">
      <div className="auth-header">
        <Link to={ROUTES.HOME} className="brand brand--auth">
          <span className="brand__mark" aria-hidden="true">
            PS
          </span>
          <span>
            <strong>Placement Setu</strong>
            <small>Gujarat Vidyapith</small>
          </span>
        </Link>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          {title && <h1 className="auth-title">{title}</h1>}
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          <div className="auth-content">{children}</div>
        </div>
      </div>

      <div className="auth-footer">
        <Link to={ROUTES.HOME}>← Return to Home</Link>
        <span>·</span>
        <span>Gujarat Vidyapith Placement Cell</span>
      </div>
    </div>
  );
}
