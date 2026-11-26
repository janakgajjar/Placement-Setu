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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.id]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Gujarat Vidyapith Bylaw Client Validation
    if (form.driveType === 'PAID_INTERNSHIP') {
      if (!form.stipend || Number(form.stipend) < BYLAWS.MIN_INTERNSHIP_STIPEND) {
        setError(`Institutional Bylaw Violation: Gujarat Vidyapith requires a minimum monthly stipend of ₹${BYLAWS.MIN_INTERNSHIP_STIPEND.toLocaleString()} for all campus internships.`);
        return;
      }
    }

    setLoading(true);
    try {
      await api.company.createDrive({
        jobTitle: form.jobTitle.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        driveType: form.driveType,
        ctc: form.ctc ? Number(form.ctc) : null,
        stipend: form.stipend ? Number(form.stipend) : null,
        vacancies: Number(form.vacancies),
        minimumCgpa: form.minimumCgpa ? Number(form.minimumCgpa) : null,
        maximumBacklogs: Number(form.maximumBacklogs),
        requiredCourse: form.requiredCourse,
        graduationYear: Number(form.graduationYear),
        maximumAge: form.maximumAge ? Number(form.maximumAge) : null,
        isDreamOffer: Boolean(form.isDreamOffer || (form.ctc && Number(form.ctc) >= BYLAWS.DREAM_OFFER_MIN_CTC)),
        registrationStart: form.registrationStart,
        registrationEnd: form.registrationEnd,
      });

      setShowSuccess(true);
    } catch (err) {
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
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormField
              id="jobTitle"
              label="Job / Role Title"
              value={form.jobTitle}
              onChange={handleChange}
              placeholder="e.g. Associate Software Engineer"
              required
            />

            <FormField
              id="driveType"
              label="Opportunity Classification"
              as="select"
              value={form.driveType}
              onChange={handleChange}
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
            placeholder="Key responsibilities, team structure, tech stack, and location..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <FormField
              id="location"
              label="Work Location"
              value={form.location}
              onChange={handleChange}
              required
            />

            {form.driveType === 'FULL_TIME' ? (
              <FormField
                id="ctc"
                label="Annual CTC Package (INR)"
                type="number"
                value={form.ctc}
                onChange={handleChange}
                placeholder="e.g. 550000"
                helpText="Offers >= ₹8,00,000 automatically qualify as Dream Offers"
              />
            ) : (
              <FormField
                id="stipend"
                label="Monthly Stipend (INR)"
                type="number"
                value={form.stipend}
                onChange={handleChange}
                placeholder="e.g. 15000 (Min: ₹10,000)"
                required
                helpText="Institutional rule: Unpaid internships are barred"
              />
            )}

            <FormField
              id="vacancies"
              label="Available Vacancies"
              type="number"
              value={form.vacancies}
              onChange={handleChange}
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
            />

            <FormField
              id="maximumBacklogs"
              label="Maximum Allowed Backlogs"
              type="number"
              value={form.maximumBacklogs}
              onChange={handleChange}
            />

            <FormField
              id="maximumAge"
              label="Upper Age Limit (Years)"
              type="number"
              value={form.maximumAge}
              onChange={handleChange}
              helpText="Validated against candidate Date of Birth"
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
