import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      
      // Determine destination
      const from = location.state?.from?.pathname;
      const destination = from || ROLE_DEFAULT_ROUTES[user.role] || ROUTES.HOME;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome to Placement Setu"
      subtitle="Sign in with your Gujarat Vidyapith credentials to access the placement portal."
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField
          id="login-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. yourname@gujaratvidyapith.org"
          required
          error={fieldErrors.email}
          disabled={loading}
          autoComplete="email"
        />

        <FormField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          error={fieldErrors.password}
          disabled={loading}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          className="button--full"
          loading={loading}
          disabled={loading}
        >
          Sign In
        </Button>
      </form>

      <div className="auth-links">
        <div className="auth-links__row">
          <span>New student?</span>
          <Link to={ROUTES.REGISTER_STUDENT}>Register as Student</Link>
        </div>
        <div className="auth-links__row">
          <span>Hiring organization?</span>
          <Link to={ROUTES.REGISTER_COMPANY}>Register Company</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
