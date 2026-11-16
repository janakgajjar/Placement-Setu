import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/routes';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';

export default function RegisterStudentPage() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    course: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
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
      await registerStudent({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        course: formData.course.trim() || null,
      });

      navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Student Registration"
      subtitle="Create your Gujarat Vidyapith placement profile to begin your placement journey."
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField
          id="student-name"
          label="Full Name"
          type="text"
          value={formData.fullName}
          onChange={handleChange('fullName')}
          placeholder="e.g. Ramesh Patel"
          required
          error={fieldErrors.fullName}
          disabled={loading}
          autoComplete="name"
        />

        <FormField
          id="student-email"
          label="Institutional / Personal Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="e.g. ramesh.patel@gujaratvidyapith.org"
          required
          error={fieldErrors.email}
          disabled={loading}
          autoComplete="email"
        />

        <div className="form-row-grid">
          <FormField
            id="student-course"
            label="Course / Program"
            type="text"
            value={formData.course}
            onChange={handleChange('course')}
            placeholder="e.g. MCA, M.Sc IT, MSW"
            disabled={loading}
          />

          <FormField
            id="student-phone"
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="e.g. +91 9876543210"
            disabled={loading}
            autoComplete="tel"
          />
        </div>

        <FormField
          id="student-password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange('password')}
          placeholder="At least 8 chars, 1 uppercase, 1 lowercase, 1 digit"
          hint="Minimum 8 characters with upper, lower, and numeric characters"
          required
          error={fieldErrors.password}
          disabled={loading}
          autoComplete="new-password"
        />

        <FormField
          id="student-confirm-password"
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

        <Button
          type="submit"
          className="button--full"
          loading={loading}
          disabled={loading}
        >
          Complete Registration
        </Button>
      </form>

      <div className="auth-links">
        <div className="auth-links__row">
          <span>Already registered?</span>
          <Link to={ROUTES.LOGIN}>Sign in to your account</Link>
        </div>
        <div className="auth-links__row">
          <span>Are you a company recruiter?</span>
          <Link to={ROUTES.REGISTER_COMPANY}>Register as Company</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
