import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="error-page container">
      <div className="error-card">
        <span className="error-code">404</span>
        <h1 className="error-title">Page Not Found</h1>
        <p className="error-description">
          The page you requested does not exist or may have been relocated.
        </p>
        <div className="error-actions">
          <Button to={ROUTES.HOME}>Return to Homepage</Button>
        </div>
      </div>
    </div>
  );
}
