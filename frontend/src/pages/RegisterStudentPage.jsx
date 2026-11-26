import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import { DEPARTMENTS } from '../lib/constants';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateFullName,
  getPasswordStrength,
} from '../utils/validation';

export default function RegisterStudentPage() {
  const { registerStudent, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(ROLE_DEFAULT_ROUTES[user.role] || ROUTES.STUDENT_DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    personalEmail: '',
    phone: '',
    course: 'MCA',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Field validator helper
  const validateField = (name, value, currentForm = form) => {
    switch (name) {
      case 'fullName':
        return validateFullName(value);
      case 'email':
        return validateEmail(value);
      case 'personalEmail':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'course':
        return !value ? 'Department / Program selection is required' : null;
      case 'password':
        return validatePassword(value, false, currentForm.email);
      case 'confirmPassword':
        if (!value) return 'Confirm password is required';
        if (value !== currentForm.password) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    const updatedForm = { ...form, [field]: val };
    setForm(updatedForm);
    setServerError('');

    if (touched[field] || fieldErrors[field]) {
      const err = validateField(field, val, updatedForm);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, [field]: null }));
      } else if (touched[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: err }));
      }
    }

    // If changing password, also re-validate confirmPassword if already touched
    if (field === 'password' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', form.confirmPassword, updatedForm);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const validateAll = () => {
    const errors = {};
    Object.keys(form).forEach((key) => {
      const err = validateField(key, form[key], form);
      if (err) errors[key] = err;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      personalEmail: true,
      phone: true,
      course: true,
      password: true,
      confirmPassword: true,
    });
    setServerError('');

    if (!validateAll()) {
      return;
    }

    setLoading(true);
    try {
      await registerStudent({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        personalEmail: form.personalEmail.trim().toLowerCase(),
        phone: form.phone.trim(),
        course: form.course,
        password: form.password,
      });
      setShowSuccess(true);
    } catch (err) {
      const status = err.status || err.response?.status;
      const data = err.data || err.response?.data || {};

      // Map backend field errors
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

      if (err.message?.includes('Server unavailable') || status === 0 || status >= 500) {
        setServerError('Server is currently unavailable. Please try again later.');
      } else if (err.message?.toLowerCase().includes('already exists') || data.message?.toLowerCase().includes('already exists')) {
        setFieldErrors((prev) => ({ ...prev, email: 'An account with this institutional email already exists' }));
      } else {
        setServerError(data.message || err.message || 'Registration could not be completed. Please review your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(form.password);
  const isFormValid =
    form.fullName.trim().length >= 2 &&
    form.email.trim().length >= 3 &&
    form.personalEmail.trim().length >= 3 &&
    form.phone.trim().length === 10 &&
    form.password.length >= 8 &&
    form.confirmPassword === form.password &&
    !Object.values(fieldErrors).some(Boolean);

  return (
    <AuthLayout
      title="Student Enrollment"
      subtitle="Register your Gujarat Vidyapith candidate profile"
    >
      <Modal
        isOpen={showSuccess}
        title="Profile Created!"
        message="Your student profile has been registered. You can now upload your resume and complete your KYC details."
        onConfirm={() => navigate(ROUTES.STUDENT_DASHBOARD)}
        confirmText="Go to Student Desk →"
      />

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
        {/* Legal Full Name */}
        <FormField
          id="fullName"
          label="Legal Full Name"
          value={form.fullName}
          maxLength={50}
          onBlur={() => handleBlur('fullName')}
          onChange={(e) => {
            const lettersAndSpaces = e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 50);
            setForm((prev) => ({ ...prev, fullName: lettersAndSpaces }));
            setServerError('');
            if (touched.fullName || fieldErrors.fullName) {
              const err = validateFullName(lettersAndSpaces);
              setFieldErrors((prev) => ({ ...prev, fullName: err }));
            }
          }}
          onKeyDown={(e) => {
            if (!/^[a-zA-Z ]$/.test(e.key) && e.key.length === 1) {
              e.preventDefault();
            }
          }}
          autoComplete="name"
          pattern="[a-zA-Z\s]+"
          placeholder="e.g. Janakkumar Gajjar"
          required
          error={fieldErrors.fullName}
        />

        {/* Institutional Email */}
        <FormField
          id="email"
          label="Institutional Email Address"
          type="email"
          value={form.email}
          maxLength={120}
          onBlur={() => handleBlur('email')}
          onChange={handleChange('email')}
          placeholder="e.g. 250160450021.gvp@gujaratvidyapith.org"
          required
          error={fieldErrors.email}
        />

        {/* Personal Email */}
        <FormField
          id="personalEmail"
          label="Personal Email Address"
          type="email"
          value={form.personalEmail}
          maxLength={120}
          onBlur={() => handleBlur('personalEmail')}
          onChange={handleChange('personalEmail')}
          placeholder="e.g. personal.name@gmail.com"
          required
          error={fieldErrors.personalEmail}
        />

        {/* Mobile Number */}
        <FormField
          id="phone"
          label="Mobile Phone Number"
          type="tel"
          value={form.phone}
          maxLength={10}
          inputMode="numeric"
          pattern="[0-9]{10}"
          autoComplete="tel"
          onBlur={() => handleBlur('phone')}
          onKeyDown={(e) => {
            if (!/^[0-9]$/.test(e.key) && e.key.length === 1) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
            setForm((prev) => ({ ...prev, phone: digits }));
            if (touched.phone || fieldErrors.phone) {
              const err = validatePhone(digits);
              if (!err) {
                setFieldErrors((prev) => ({ ...prev, phone: null }));
              } else if (touched.phone) {
                setFieldErrors((prev) => ({ ...prev, phone: err }));
              }
            }
          }}
          placeholder="e.g. 9876543210"
          required
          error={fieldErrors.phone}
        />

        {/* Course */}
        <FormField
          id="course"
          label="Enrolled Department / Program"
          as="select"
          value={form.course}
          onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}
          required
          error={fieldErrors.course}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
          <option value="Other Post-Graduate Program">Other Post-Graduate Program</option>
        </FormField>

        {/* Password */}
        <FormField
          id="password"
          label="Account Password"
          type="password"
          value={form.password}
          maxLength={128}
          onBlur={() => handleBlur('password')}
          onChange={handleChange('password')}
          placeholder="At least 8 characters (Aa1@)"
          required
          error={fieldErrors.password}
        />

        {/* Confirm Password */}
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={form.confirmPassword}
          maxLength={128}
          onBlur={() => handleBlur('confirmPassword')}
          onChange={handleChange('confirmPassword')}
          placeholder="Re-enter password"
          required
          error={fieldErrors.confirmPassword}
        />

        <div style={{ marginTop: '24px' }}>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || !isFormValid}
          >
            Complete Candidate Registration
          </Button>
        </div>
      </form>

      <div style={{ marginTop: '20px', fontSize: '0.84rem', color: 'var(--gv-text-subtle, #555555)', textAlign: 'center' }}>
        Already enrolled as a student?{' '}
        <Link to={ROUTES.LOGIN} style={{ color: 'var(--gv-primary, #563828)', fontWeight: 700 }}>
          Sign In Here
        </Link>
      </div>
    </AuthLayout>
  );
}
