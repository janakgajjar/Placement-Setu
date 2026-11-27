import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import { DEPARTMENTS, BYLAWS } from '../../lib/constants';
import api from '../../lib/api';

export default function CreateDrive() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    jobTitle: '',
    description: '',
    location: 'Ahmedabad / Gandhinagar',
    driveType: 'FULL_TIME', // FULL_TIME, PAID_INTERNSHIP
    ctc: '',
    stipend: '',
    vacancies: 5,
    minimumCgpa: 6.5,
    maximumBacklogs: 0,
    requiredCourse: 'MCA',
    graduationYear: 2026,
    maximumAge: 26,
    isDreamOffer: false,
    registrationStart: new Date().toISOString().slice(0, 16),
    registrationEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateField = (field, val) => {
    switch (field) {
      case 'jobTitle':
        if (!val || !val.trim()) return 'Job / Role Title is mandatory.';
        if (val.trim().length < 2) return 'Job title must be at least 2 characters.';
        if (val.trim().length > 200) return 'Job title cannot exceed 200 characters.';
        return null;
      case 'location':
        if (!val || !val.trim()) return 'Work Location is mandatory.';
        if (val.trim().length > 150) return 'Location cannot exceed 150 characters.';
        return null;
      case 'ctc':
        if (form.driveType === 'FULL_TIME') {
          if (val === '' || val === null || val === undefined) return 'Annual CTC Package is required for full-time roles.';
          const num = Number(val);
          if (isNaN(num) || num <= 0) return 'Annual CTC must be a positive number.';
        }
        return null;
      case 'stipend':
        if (form.driveType === 'PAID_INTERNSHIP') {
          if (val === '' || val === null || val === undefined) return 'Monthly Stipend is required.';
          const num = Number(val);
          if (isNaN(num) || num <= 0) return 'Stipend must be a positive number.';
          if (num < BYLAWS.MIN_INTERNSHIP_STIPEND) {
            return `Gujarat Vidyapith Bylaw: Minimum monthly stipend is ₹${BYLAWS.MIN_INTERNSHIP_STIPEND.toLocaleString()}.`;
          }
        }
        return null;
      case 'vacancies':
        if (val === '' || val === null || val === undefined) return 'Number of vacancies is mandatory.';
        const vNum = Number(val);
        if (isNaN(vNum) || !Number.isInteger(vNum) || vNum < 1) return 'Vacancies must be a whole number >= 1.';
        return null;
      case 'minimumCgpa':
        if (val !== '' && val !== null && val !== undefined) {
          const cg = Number(val);
          if (isNaN(cg) || cg < 0 || cg > 10) return 'Minimum CGPA must be between 0.0 and 10.0.';
        }
        return null;
      case 'maximumBacklogs':
        if (val !== '' && val !== null && val !== undefined) {
          const bl = Number(val);
          if (isNaN(bl) || bl < 0 || !Number.isInteger(bl)) return 'Maximum Backlogs must be an integer >= 0.';
        }
        return null;
      case 'maximumAge':
        if (val !== '' && val !== null && val !== undefined) {
          const age = Number(val);
          if (isNaN(age) || age < 18) return 'Upper age limit must be at least 18 years.';
        }
        return null;
      case 'graduationYear':
        if (val !== '' && val !== null && val !== undefined) {
          const yr = Number(val);
          if (isNaN(yr) || yr < 2020 || yr > 2035) return 'Graduation Year must be between 2020 and 2035.';
        }
        return null;
      case 'registrationStart':
        if (!val) return 'Registration Start date & time is mandatory.';
        return null;
      case 'registrationEnd':
        if (!val) return 'Registration End date & time is mandatory.';
        if (form.registrationStart && new Date(val) <= new Date(form.registrationStart)) {
          return 'Registration End date must be after Registration Start date.';
        }
        return null;
      default:
        return null;
    }
  };

  const validateAll = () => {
    const errors = {};
    const fieldsToValidate = [
      'jobTitle',
      'location',
      'vacancies',
      'minimumCgpa',
      'maximumBacklogs',
      'maximumAge',
      'graduationYear',
      'registrationStart',
      'registrationEnd',
    ];

    if (form.driveType === 'FULL_TIME') {
      fieldsToValidate.push('ctc');
    } else {
      fieldsToValidate.push('stipend');
    }

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, form[f]);
      if (err) errors[f] = err;
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { id, type, checked, value } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [id]: val }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleBlur = (field) => {
    const err = validateField(field, form[field]);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateAll()) {
      setError('Please review the highlighted errors before saving the drive.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      await api.company.createDrive({
        jobTitle: form.jobTitle.trim(),
        description: form.description ? form.description.trim() : null,
        location: form.location.trim(),
        driveType: form.driveType,
        ctc: form.driveType === 'FULL_TIME' && form.ctc ? Number(form.ctc) : null,
        stipend: form.driveType === 'PAID_INTERNSHIP' && form.stipend ? Number(form.stipend) : null,
        vacancies: Number(form.vacancies),
        minimumCgpa: form.minimumCgpa ? Number(form.minimumCgpa) : null,
        maximumBacklogs: Number(form.maximumBacklogs || 0),
        requiredCourse: form.requiredCourse,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        maximumAge: form.maximumAge ? Number(form.maximumAge) : null,
        isDreamOffer: Boolean(form.isDreamOffer || (form.ctc && Number(form.ctc) >= BYLAWS.DREAM_OFFER_MIN_CTC)),
        registrationStart: form.registrationStart,
        registrationEnd: form.registrationEnd,
      });

      setShowSuccess(true);
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setError(err.message || 'Failed to create placement drive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Create Placement Drive"
      breadcrumbs={[{ label: 'Recruiter Workspace' }, { label: 'Placement Drives', to: ROUTES.COMPANY_DRIVES }, { label: 'New Drive' }]}
    >
      <Modal
        isOpen={showSuccess}
        title="Drive Created in DRAFT"
        message="Your placement opening has been saved. Review your requirements and click 'Publish' whenever you are ready to open registrations."
        onConfirm={() => navigate(ROUTES.COMPANY_DRIVES)}
        confirmText="View All Drives →"
      />

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <Card title="Job Details &amp; Gujarat Vidyapith Institutional Bylaws Compliance">
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormField
              id="jobTitle"
              label="Job / Role Title"
              value={form.jobTitle}
              onChange={handleChange}
              onBlur={() => handleBlur('jobTitle')}
              placeholder="e.g. Associate Software Engineer"
              error={fieldErrors.jobTitle}
              required
            />

            <FormField
              id="driveType"
              label="Opportunity Classification"
              as="select"
              value={form.driveType}
              onChange={handleChange}
              error={fieldErrors.driveType}
              required
            >
              <option value="FULL_TIME">Full-Time Career (FTE)</option>
              <option value="PAID_INTERNSHIP">Paid Internship (Bylaw: Min ₹10,000/mo)</option>
            </FormField>
          </div>

          <FormField
            id="description"
            label="Detailed Job Responsibilities &amp; Overview"
            as="textarea"
            rows={3}
            value={form.description}
            onChange={handleChange}
            error={fieldErrors.description}
            placeholder="Key responsibilities, team structure, tech stack, and location..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <FormField
              id="location"
              label="Work Location"
              value={form.location}
              onChange={handleChange}
              onBlur={() => handleBlur('location')}
              error={fieldErrors.location}
              required
            />

            {form.driveType === 'FULL_TIME' ? (
              <FormField
                id="ctc"
                label="Annual CTC Package (INR)"
                type="number"
                value={form.ctc}
                onChange={handleChange}
                onBlur={() => handleBlur('ctc')}
                error={fieldErrors.ctc}
                placeholder="e.g. 550000"
                helpText="Offers >= ₹8,00,000 automatically qualify as Dream Offers"
                required
              />
            ) : (
              <FormField
                id="stipend"
                label="Monthly Stipend (INR)"
                type="number"
                value={form.stipend}
                onChange={handleChange}
                onBlur={() => handleBlur('stipend')}
                error={fieldErrors.stipend}
                placeholder="e.g. 15000 (Min: ₹10,000)"
                required
                helpText="Institutional rule: Unpaid internships are strictly barred"
              />
            )}

            <FormField
              id="vacancies"
              label="Available Vacancies"
              type="number"
              value={form.vacancies}
              onChange={handleChange}
              onBlur={() => handleBlur('vacancies')}
              error={fieldErrors.vacancies}
              required
            />
          </div>

          <h4 style={{ color: 'var(--gv-primary-brown)', marginTop: '24px', marginBottom: '14px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '6px' }}>
            Candidate Eligibility Criteria
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <FormField
              id="requiredCourse"
              label="Target Faculty / Department"
              as="select"
              value={form.requiredCourse}
              onChange={handleChange}
              error={fieldErrors.requiredCourse}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
              <option value="All Departments">All Departments</option>
            </FormField>

            <FormField
              id="minimumCgpa"
              label="Minimum CGPA (out of 10)"
              type="number"
              step="0.1"
              value={form.minimumCgpa}
              onChange={handleChange}
              onBlur={() => handleBlur('minimumCgpa')}
              error={fieldErrors.minimumCgpa}
            />

            <FormField
              id="maximumBacklogs"
              label="Maximum Allowed Backlogs"
              type="number"
              value={form.maximumBacklogs}
              onChange={handleChange}
              onBlur={() => handleBlur('maximumBacklogs')}
              error={fieldErrors.maximumBacklogs}
            />

            <FormField
              id="maximumAge"
              label="Upper Age Limit (Years)"
              type="number"
              value={form.maximumAge}
              onChange={handleChange}
              onBlur={() => handleBlur('maximumAge')}
              error={fieldErrors.maximumAge}
              helpText="Validated against candidate Date of Birth (min: 18)"
            />

            <FormField
              id="graduationYear"
              label="Graduation Year"
              type="number"
              value={form.graduationYear}
              onChange={handleChange}
              onBlur={() => handleBlur('graduationYear')}
              error={fieldErrors.graduationYear}
            />
          </div>

          <h4 style={{ color: 'var(--gv-primary-brown)', marginTop: '24px', marginBottom: '14px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '6px' }}>
            Registration Timeline Window
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormField
              id="registrationStart"
              label="Registration Start Date &amp; Time"
              type="datetime-local"
              value={form.registrationStart}
              onChange={handleChange}
              onBlur={() => handleBlur('registrationStart')}
              error={fieldErrors.registrationStart}
              required
            />

            <FormField
              id="registrationEnd"
              label="Registration Deadline (End Date &amp; Time)"
              type="datetime-local"
              value={form.registrationEnd}
              onChange={handleChange}
              onBlur={() => handleBlur('registrationEnd')}
              error={fieldErrors.registrationEnd}
              required
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            <Button type="submit" variant="primary" loading={loading}>
              Create Placement Drive (Save as DRAFT) →
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
