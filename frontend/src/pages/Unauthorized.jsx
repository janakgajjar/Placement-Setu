import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import Button from '../components/ui/Button';

export default function Unauthorized() {
  const { user } = useAuth();
  const defaultDashboard = user?.role ? ROLE_DEFAULT_ROUTES[user.role] : ROUTES.HOME;

  return (
    <div className="error-page container">
      <div className="error-card">
        <span className="error-code error-code--warning">403</span>
        <h1 className="error-title">Access Restricted</h1>
        <p className="error-description">
          You do not have administrative or role-level permissions to access this section of Placement Setu.
        </p>
        <div className="error-actions">
          <Button to={defaultDashboard}>Go to Your Dashboard</Button>
          <Button variant="secondary" to={ROUTES.HOME}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
