import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/routes';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';

export default function RegisterCompanyPage() {
  const { registerCompany } = useAuth();

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    gstin: '',
    phone: '',
    website: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Official company email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.gstin.trim()) {
      errors.gstin = 'GSTIN registration number is required';
    }

    if (!formData.address.trim()) {
      errors.address = 'Registered office address is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must include uppercase, lowercase, and a number';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      await registerCompany({
        companyName: formData.companyName.trim(),
        email: formData.email.trim(),
        gstin: formData.gstin.trim(),
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        address: formData.address.trim(),
        password: formData.password,
      });

      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Company registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Registration Submitted"
        subtitle="Your company onboarding request has been received."
      >
        <div className="auth-success-card">
          <div className="auth-success-icon" aria-hidden="true">
            ✓
          </div>
          <h3>Verification in Progress</h3>
          <p>
            In accordance with Gujarat Vidyapith placement guidelines, all recruiter profiles are
            reviewed by the Placement Officer or Administrator before account activation.
          </p>
          <div className="info-box">
            <small>Organization Registered</small>
            <strong>{formData.companyName}</strong>
            <p>Once approved, your account will be marked active and you can publish placement drives.</p>
          </div>
          <div className="auth-actions">
            <Button to={ROUTES.LOGIN} className="button--full">
              Proceed to Sign In
            </Button>
            <Button to={ROUTES.HOME} variant="secondary" className="button--full">
              Return to Homepage
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Company Registration"
      subtitle="Partner with Gujarat Vidyapith to recruit graduating students."
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField
          id="company-name"
          label="Company / Organization Name"
          type="text"
          value={formData.companyName}
          onChange={handleChange('companyName')}
          placeholder="e.g. Acme Technologies Pvt Ltd"
          required
          error={fieldErrors.companyName}
          disabled={loading}
        />

        <div className="form-row-grid">
          <FormField
            id="company-email"
            label="Corporate Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="hr@acme.com"
            required
            error={fieldErrors.email}
            disabled={loading}
            autoComplete="email"
          />

          <FormField
            id="company-gstin"
            label="GSTIN"
            type="text"
            value={formData.gstin}
            onChange={handleChange('gstin')}
            placeholder="e.g. 24AAAAA0000A1Z5"
            required
            error={fieldErrors.gstin}
            disabled={loading}
          />
        </div>

        <div className="form-row-grid">
          <FormField
            id="company-phone"
            label="Contact Phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="+91 9876543210"
            disabled={loading}
            autoComplete="tel"
          />

          <FormField
            id="company-website"
            label="Company Website"
            type="url"
            value={formData.website}
            onChange={handleChange('website')}
            placeholder="https://acme.com"
            disabled={loading}
          />
        </div>

        <FormField
          id="company-address"
          label="Office Address"
          type="textarea"
          value={formData.address}
          onChange={handleChange('address')}
          placeholder="Registered office address and city"
          rows={2}
          required
          error={fieldErrors.address}
          disabled={loading}
        />

        <div className="form-row-grid">
          <FormField
            id="company-password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            hint="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit"
            required
            error={fieldErrors.password}
            disabled={loading}
            autoComplete="new-password"
          />

          <FormField
            id="company-confirm-password"
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Re-enter password"
            required
            error={fieldErrors.confirmPassword}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="button--full"
          loading={loading}
          disabled={loading}
        >
          Submit for Officer Approval
        </Button>
      </form>

      <div className="auth-links">
        <div className="auth-links__row">
          <span>Already registered?</span>
          <Link to={ROUTES.LOGIN}>Sign in to company portal</Link>
        </div>
        <div className="auth-links__row">
          <span>Are you a student?</span>
          <Link to={ROUTES.REGISTER_STUDENT}>Register as Student</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
