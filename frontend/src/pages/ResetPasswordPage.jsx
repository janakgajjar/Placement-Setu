import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { ROUTES } from '../lib/routes';
import { validatePassword, getPasswordStrength } from '../utils/validation';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setServerError('Missing or invalid reset token. Please request a new link from the sign-in page.');
    }
  }, [token]);

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const err = validatePassword(password, false);
    setErrors((prev) => ({ ...prev, password: err }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setServerError('');
    if (touched.password) {
      const err = validatePassword(val, false);
      setErrors((prev) => ({ ...prev, password: err }));
    }
    if (touched.confirmPassword) {
      const confirmErr = val !== confirmPassword ? 'Passwords do not match' : null;
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleConfirmBlur = () => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    const err = !confirmPassword ? 'Confirm password is required' : confirmPassword !== password ? 'Passwords do not match' : null;
    setErrors((prev) => ({ ...prev, confirmPassword: err }));
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setServerError('');
    if (touched.confirmPassword) {
      const err = !val ? 'Confirm password is required' : val !== password ? 'Passwords do not match' : null;
      setErrors((prev) => ({ ...prev, confirmPassword: err }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    setServerError('');

    const passErr = validatePassword(password, false);
    const confErr = !confirmPassword ? 'Confirm password is required' : confirmPassword !== password ? 'Passwords do not match' : null;

    if (passErr || confErr) {
      setErrors({ password: passErr, confirmPassword: confErr });
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setServerError(err.data?.message || err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const isFormValid = token && password.length >= 8 && confirmPassword === password && !errors.password && !errors.confirmPassword;

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Gujarat Vidyapith Placement Portal Password Recovery"
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.4rem', color: '#2E7D32', marginBottom: '10px' }}>✓</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '8px' }}>
            Password Reset Successfully!
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '22px', lineHeight: 1.4 }}>
            Your account credentials have been updated. You can now sign in with your new password.
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
          >
            Go to Sign In
          </Button>
        </div>
      ) : (
        <>
          {serverError && (
            <div
              className="gv-alert gv-alert--error"
              role="alert"
              style={{
                backgroundColor: '#FFEBEE',
                border: '1px solid #EF5350',
                color: '#C62828',
                padding: '12px 14px',
                borderRadius: '4px',
                fontSize: '0.88rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              id="password"
              label="New Password"
              type="password"
              value={password}
              maxLength={128}
              onBlur={handlePasswordBlur}
              onChange={handlePasswordChange}
              placeholder="At least 8 characters (Aa1@)"
              required
              disabled={!token}
              error={errors.password}
              helpText={!errors.password ? 'Must include uppercase, lowercase, digit, and special symbol' : null}
            />

            {password && (
              <div style={{ marginTop: '-10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#666' }}>Strength:</span>
                  <span style={{ fontWeight: 700, color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#EEEEEE', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      backgroundColor: passwordStrength.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}

            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              maxLength={128}
              onBlur={handleConfirmBlur}
              onChange={handleConfirmChange}
              placeholder="Re-enter new password"
              required
              disabled={!token}
              error={errors.confirmPassword}
            />

            <div style={{ marginTop: '20px' }}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                disabled={loading || !isFormValid}
              >
                Set New Password
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '20px', fontSize: '0.84rem', color: '#666', textAlign: 'center' }}>
            Remembered your password?{' '}
            <Link to={ROUTES.LOGIN} style={{ color: 'var(--gv-primary, #563828)', fontWeight: 700 }}>
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
