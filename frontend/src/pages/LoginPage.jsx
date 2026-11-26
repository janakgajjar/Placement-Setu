import { useState, useId, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import { validateEmail, validatePassword } from '../utils/validation';

export default function LoginPage() {
  const { login, user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // If already authenticated, redirect to role dashboard immediately
  useEffect(() => {
    if (isAuthenticated && currentUser?.role) {
      navigate(ROLE_DEFAULT_ROUTES[currentUser.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Validate internal safe redirect (reject open-redirect exploits)
  const getSafeRedirect = (path) => {
    if (!path || typeof path !== 'string') return null;
    const trimmed = path.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':') && !trimmed.includes('\\')) {
      return trimmed;
    }
    return null;
  };

  const redirectParam = searchParams.get('redirect');
  const safeRedirect = getSafeRedirect(redirectParam) || getSafeRedirect(typeof location.state?.from === 'string' ? location.state.from : location.state?.from?.pathname);
  const infoNotice = location.state?.message || (safeRedirect ? 'Please login to continue' : null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTouched, setForgotTouched] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Email validation on blur and live change once touched
  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const err = validateEmail(email);
    setFieldErrors((prev) => ({ ...prev, email: err }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setServerError('');
    if (touched.email || fieldErrors.email) {
      const err = validateEmail(val);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, email: null }));
      } else if (touched.email) {
        setFieldErrors((prev) => ({ ...prev, email: err }));
      }
    }
  };

  // Password validation on blur and live change once touched
  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const err = validatePassword(password, true);
    setFieldErrors((prev) => ({ ...prev, password: err }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setServerError('');
    if (touched.password || fieldErrors.password) {
      const err = validatePassword(val, true);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, password: null }));
      } else if (touched.password) {
        setFieldErrors((prev) => ({ ...prev, password: err }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setServerError('');

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password, true);

    if (emailErr || passwordErr) {
      setFieldErrors({ email: emailErr, password: passwordErr });
      return;
    }

    setLoading(true);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
      setLoggedInUser(user);
      setShowSuccessModal(true);
    } catch (err) {
      const data = err.data || err.response?.data || {};
      const status = err.status || err.response?.status || data.status;
      const isLocked = status === 423 || 
        String(err.message || '').toLowerCase().includes('locked') || 
        String(data.message || '').toLowerCase().includes('locked');

      // 1. Map backend field errors if provided
      if (data.fieldErrors?.length) {
        const mapped = {};
        data.fieldErrors.forEach((fe) => {
          mapped[fe.field] = fe.message;
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      } else if (data.errors?.length) {
        const mapped = {};
        data.errors.forEach((fe) => {
          mapped[fe.field] = fe.message;
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }

      // 2. Set specific banner/server error
      if (isLocked) {
        const msg = data.message || err.message || 'Account is locked for 15 minutes due to 5 consecutive failed login attempts.';
        setServerError(msg);
        setLockoutMessage(msg);
        setShowLockoutModal(true);
      } else if (status === 429) {
        setServerError(data.message || 'Too many authentication attempts. Please wait 1 minute before trying again.');
      } else if (status === 401) {
        let msg = data.message || err.message;
        if (!msg || msg.includes('Session expired') || msg.includes('unauthorized') || msg.toLowerCase().includes('unauthorized')) {
          msg = 'Invalid email or password';
        }
        setServerError(msg);
        setFieldErrors({
          email: 'Invalid email or password',
          password: 'Invalid email or password',
        });
      } else if (err.message?.includes('Server unavailable') || status === 0 || status >= 500) {
        setServerError('Server is temporarily unavailable. Please try again in a few moments.');
      } else {
        setServerError(data.message || err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowSuccessModal(false);
    const role = loggedInUser?.role;
    const defaultDestination = (role && ROLE_DEFAULT_ROUTES[role]) || ROUTES.HOME;

    if (safeRedirect) {
      // Validate that role is authorized for redirect destination
      if (role === 'STUDENT' && (safeRedirect.startsWith('/student') || safeRedirect.startsWith('/drives') || safeRedirect.startsWith('/companies') || safeRedirect.startsWith('/about') || safeRedirect.startsWith('/contact') || safeRedirect.startsWith('/policies'))) {
        navigate(safeRedirect, { replace: true });
        return;
      }
      if (role === 'COMPANY' && (safeRedirect.startsWith('/company') || safeRedirect.startsWith('/drives') || safeRedirect.startsWith('/policies'))) {
        navigate(safeRedirect, { replace: true });
        return;
      }
      if ((role === 'PLACEMENT_OFFICER' || role === 'ADMIN') && (safeRedirect.startsWith('/officer') || safeRedirect.startsWith('/drives') || safeRedirect.startsWith('/companies'))) {
        navigate(safeRedirect, { replace: true });
        return;
      }
    }

    navigate(defaultDestination, { replace: true });
  };

  // Forgot password submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotTouched(true);
    const err = validateEmail(forgotEmail);
    if (err) {
      setForgotError(err);
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await api.auth.forgotPassword({ email: forgotEmail.trim().toLowerCase() });
      setForgotSuccess('If an account exists for this email, a password reset link has been dispatched.');
    } catch (apiErr) {
      setForgotError(apiErr.data?.message || apiErr.message || 'Failed to request password reset. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.trim().length > 0 && !fieldErrors.email && !fieldErrors.password;
  const isSessionExpired = new URLSearchParams(location.search).get('sessionExpired') === 'true' || Boolean(location.state?.sessionExpired);

  return (
    <AuthLayout
      title="Placement Portal Sign In"
      subtitle="Enter your Gujarat Vidyapith university credentials"
    >
      <Modal
        isOpen={showSuccessModal}
        title="Success"
        message={`Successfully authenticated as ${loggedInUser?.email}`}
        onConfirm={handleModalConfirm}
        confirmText="Continue to Portal →"
      />

      {/* Action Redirect Info Notice */}
      {infoNotice && !serverError && (
        <div
          className="gv-alert gv-alert--info"
          role="status"
          style={{
            backgroundColor: '#E8F4FD',
            border: '1px solid #90CAF9',
            color: '#0D47A1',
            padding: '12px 14px',
            borderRadius: '4px',
            fontSize: '0.88rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            lineHeight: 1.4,
          }}
        >
          <span>ℹ️</span>
          <div>{infoNotice}</div>
        </div>
      )}

      {isSessionExpired && (
        <div
          className="gv-alert gv-alert--warning"
          style={{
            backgroundColor: '#FFF8E1',
            color: '#E65100',
            border: '1px solid #FFE082',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '0.86rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {/* Top Banner Alert for Server / Lockout / Rate-limit errors */}
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
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>
              {serverError.toLowerCase().includes('locked') ? 'Account Locked' : 'Authentication Error'}
            </div>
            <div>{serverError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email Field with real-time inline validation */}
        <FormField
          id="email"
          label="Registered Email Address"
          type="email"
          value={email}
          maxLength={120}
          onBlur={handleEmailBlur}
          onChange={handleEmailChange}
          placeholder="e.g. student@gujaratvidyapith.org"
          required
          error={fieldErrors.email}
        />

        {/* Password Field with eye toggle & real-time inline validation */}
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          maxLength={128}
          onBlur={handlePasswordBlur}
          onChange={handlePasswordChange}
          placeholder="Enter your account password"
          required
          error={fieldErrors.password}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px', marginBottom: '18px' }}>
          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotError('');
              setForgotSuccess('');
              setShowForgotModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '0.82rem',
              color: 'var(--gv-primary, #563828)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Forgot Password?
          </button>
        </div>

        <div style={{ marginTop: '10px' }}>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || !isFormValid}
          >
            Sign In to Portal
          </Button>
        </div>
      </form>

      <div style={{ marginTop: '22px', fontSize: '0.84rem', color: 'var(--gv-text-subtle, #555555)', textAlign: 'center' }}>
        New candidate student?{' '}
        <Link to={ROUTES.REGISTER_STUDENT} style={{ color: 'var(--gv-primary, #563828)', fontWeight: 700 }}>
          Register Student Account
        </Link>
      </div>

      <div
        style={{
          marginTop: '18px',
          padding: '12px 14px',
          backgroundColor: '#FAF6F5',
          borderRadius: '4px',
          border: '1px solid #E6E1DC',
          fontSize: '0.82rem',
          color: '#555555',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        <strong>Recruiter Notice:</strong> Companies do not self-register. Please use the credentials provided by the Gujarat Vidyapith Placement Officer.
      </div>

      {/* Account Lockout Popup Window */}
      {showLockoutModal && (
        <div
          className="gv-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="gv-modal-box"
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              padding: '28px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
              borderTop: '5px solid #D32F2F',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FFEBEE',
                color: '#D32F2F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px auto',
                border: '2px solid #FFCDD2',
              }}
            >
              🔒
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#C62828', marginBottom: '8px' }}>
              Account Temporarily Locked
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#555', marginBottom: '18px', lineHeight: 1.5 }}>
              {lockoutMessage}
            </p>
            <div
              style={{
                backgroundColor: '#FFF8E1',
                border: '1px solid #FFE082',
                color: '#E65100',
                padding: '10px 12px',
                borderRadius: '4px',
                fontSize: '0.82rem',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              ℹ️ <strong>Security Protection:</strong> Your account is protected against unauthorized brute-force attempts. Please wait 15 minutes before retrying, or click <strong>Forgot Password</strong> to recover access.
            </div>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={() => setShowLockoutModal(false)}
            >
              Close Window
            </Button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="gv-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="gv-modal-box"
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '4px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              borderTop: '5px solid var(--gv-primary, #563828)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '8px' }}>
              Reset Your Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '18px', lineHeight: 1.4 }}>
              Enter your registered email address below. If an account is found, we will dispatch a secure 30-minute password reset link.
            </p>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2rem', color: '#2E7D32', marginBottom: '8px' }}>✓</div>
                <div style={{ fontSize: '0.9rem', color: '#2E7D32', fontWeight: 600, marginBottom: '16px' }}>
                  {forgotSuccess}
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowForgotModal(false)}
                >
                  Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} noValidate>
                <FormField
                  id="forgot-email"
                  label="Registered Email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotTouched) setForgotError(validateEmail(e.target.value));
                  }}
                  onBlur={() => {
                    setForgotTouched(true);
                    setForgotError(validateEmail(forgotEmail));
                  }}
                  placeholder="e.g. user@gujaratvidyapith.org"
                  required
                  error={forgotError}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForgotModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={forgotLoading}
                    disabled={forgotLoading || Boolean(forgotError) || !forgotEmail}
                    style={{ flex: 1 }}
                  >
                    Send Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
