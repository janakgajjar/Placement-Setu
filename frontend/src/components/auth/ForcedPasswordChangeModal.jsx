import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../lib/routes';
import FormField from '../ui/FormField';
import Button from '../ui/Button';

export default function ForcedPasswordChangeModal({ isOpen }) {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.oldPassword) {
      errs.oldPassword = 'Temporary password is required.';
    }

    if (!formData.newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long.';
    } else if (formData.newPassword.length > 128) {
      errs.newPassword = 'Password cannot exceed 128 characters.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,128}$/.test(formData.newPassword)) {
      errs.newPassword = 'Must contain uppercase, lowercase, digit, and special character (@$!%*?&).';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm password is required.';
    } else if (formData.confirmPassword !== formData.newPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (formData.oldPassword && formData.newPassword && formData.oldPassword === formData.newPassword) {
      errs.newPassword = 'New password must be different from temporary password.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    try {
      await changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password. Please verify current credentials.';
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          borderRadius: '4px',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          borderTop: '5px solid var(--gv-primary, #563828)',
        }}
      >
        {success ? (
          /* Success Screen matching Vidyapith Screenshot 2c1c4a48.png */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              className="gv-modal-success-icon"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '3px solid #66BB6A',
                backgroundColor: '#E8F5E9',
                color: '#2E7D32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px auto',
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '8px' }}>
              Success
            </h3>
            <p style={{ color: 'var(--gv-text-subtle, #555555)', fontSize: '0.92rem', marginBottom: '24px' }}>
              Password updated successfully! You can now access your corporate dashboard.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                // Modal will close automatically because mustChangePassword is now false in AuthContext
                window.location.reload();
              }}
              style={{ minWidth: '120px' }}
            >
              OK
            </Button>
          </div>
        ) : (
          /* Mandatory First-Time Password Change Form */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF3E0',
                  color: '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  margin: '0 auto 12px auto',
                  border: '2px solid #FFE0B2',
                }}
              >
                🔒
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '6px' }}>
                Mandatory Password Change
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gv-text-subtle, #666666)', lineHeight: '1.4' }}>
                Welcome to <strong>Gujarat Vidyapith Placement Setu</strong>. As a newly provisioned account,
                you must set a new secure password before entering the portal.
              </p>
            </div>

            {errors.form && (
              <div
                className="gv-form-error"
                role="alert"
                style={{
                  backgroundColor: '#FFEBEE',
                  color: '#C62828',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #EF9A9A',
                }}
              >
                <span>⚠️</span>
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <FormField
                id="oldPassword"
                label="Temporary / Current Password"
                type="password"
                required
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="Enter temporary password"
                error={errors.oldPassword}
                maxLength={128}
              />

              <FormField
                id="newPassword"
                label="New Password"
                type="password"
                required
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 8 characters (Aa1@)"
                error={errors.newPassword}
                maxLength={128}
                helpText="At least 8 characters with Uppercase, Lowercase, Digit and Special Symbol (@$!%*?&)"
              />

              <FormField
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                error={errors.confirmPassword}
                maxLength={128}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    logout();
                    navigate(ROUTES.LOGIN, { replace: true });
                  }}
                  style={{ flex: 1 }}
                >
                  Logout
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  disabled={submitting}
                  style={{ flex: 2 }}
                >
                  {submitting ? 'Updating...' : 'Set Password & Enter'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
