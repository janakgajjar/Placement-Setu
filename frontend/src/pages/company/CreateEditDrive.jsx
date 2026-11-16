import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function CreateEditDrive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [driveStatus, setDriveStatus] = useState(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    description: '',
    location: '',
    ctc: '',
    vacancies: '1',
    minimumCgpa: '',
    maximumBacklogs: '',
    requiredCourse: '',
    graduationYear: '',
    registrationStart: '',
    registrationEnd: '',
  });

  // Convert LocalDateTime ISO to datetime-local string (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (!isEditMode) return;

    async function loadDrive() {
      try {
        const response = await api.company.getDrive(id);
        const drive = response.data;
        if (drive) {
          setDriveStatus(drive.status);
          setFormData({
            jobTitle: drive.jobTitle || '',
            description: drive.description || '',
            location: drive.location || '',
            ctc: drive.ctc ? String(drive.ctc) : '',
            vacancies: drive.vacancies ? String(drive.vacancies) : '1',
            minimumCgpa: drive.minimumCgpa ? String(drive.minimumCgpa) : '',
            maximumBacklogs: drive.maximumBacklogs !== null && drive.maximumBacklogs !== undefined ? String(drive.maximumBacklogs) : '',
            requiredCourse: drive.requiredCourse || '',
            graduationYear: drive.graduationYear ? String(drive.graduationYear) : '',
            registrationStart: toDateTimeLocal(drive.registrationStart),
            registrationEnd: toDateTimeLocal(drive.registrationEnd),
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load drive details.');
      } finally {
        setLoading(false);
      }
    }

    loadDrive();
  }, [id, isEditMode]);

  const validate = () => {
    const errors = {};

    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }

    const vac = parseInt(formData.vacancies, 10);
    if (!formData.vacancies || isNaN(vac) || vac < 1) {
      errors.vacancies = 'Vacancies must be at least 1';
    }

    if (!formData.registrationStart) {
      errors.registrationStart = 'Registration start date & time is required';
    }

    if (!formData.registrationEnd) {
      errors.registrationEnd = 'Registration deadline is required';
    } else if (
      formData.registrationStart &&
      new Date(formData.registrationEnd) <= new Date(formData.registrationStart)
    ) {
      errors.registrationEnd = 'Registration deadline must be after the start date';
    }

    if (formData.minimumCgpa) {
      const cgpa = parseFloat(formData.minimumCgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        errors.minimumCgpa = 'Minimum CGPA must be between 0.0 and 10.0';
      }
    }

    if (formData.maximumBacklogs) {
      const bl = parseInt(formData.maximumBacklogs, 10);
      if (isNaN(bl) || bl < 0) {
        errors.maximumBacklogs = 'Maximum backlogs cannot be negative';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        jobTitle: formData.jobTitle.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        ctc: formData.ctc ? parseFloat(formData.ctc) : null,
        vacancies: parseInt(formData.vacancies, 10),
        minimumCgpa: formData.minimumCgpa ? parseFloat(formData.minimumCgpa) : null,
        maximumBacklogs: formData.maximumBacklogs !== '' ? parseInt(formData.maximumBacklogs, 10) : null,
        requiredCourse: formData.requiredCourse.trim() || null,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear, 10) : null,
        registrationStart: formData.registrationStart ? `${formData.registrationStart}:00` : null,
        registrationEnd: formData.registrationEnd ? `${formData.registrationEnd}:00` : null,
      };

      if (isEditMode) {
        await api.company.updateDrive(id, payload);
      } else {
        await api.company.createDrive(payload);
      }

      navigate(ROUTES.COMPANY_DRIVES);
    } catch (err) {
      setError(err.message || 'Failed to save drive.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading drive details..." />
      </div>
    );
  }

  // Backend rule: Drives can only be updated while in DRAFT status
  const isEditable = !isEditMode || driveStatus === 'DRAFT';

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">RECRUITER WORKSPACE</p>
          <h1 className="page-title">
            {isEditMode ? 'Edit Placement Drive' : 'Post New Placement Drive'}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? 'Update opportunity details and eligibility criteria for this draft drive.'
              : 'Define job requirements, eligibility rules, and registration windows.'}
          </p>
        </div>
        {driveStatus && (
          <div className="page-actions">
            <StatusBadge status={driveStatus} />
          </div>
        )}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {isEditMode && !isEditable && (
        <div className="status-banner status-banner--warning">
          <div className="status-banner__icon">🔒</div>
          <div className="status-banner__body">
            <h3>Drive is Locked (Status: {driveStatus})</h3>
            <p>
              In accordance with placement policy, placement drives can only be edited while in DRAFT status.
              Published or closed drives are read-only.
            </p>
          </div>
        </div>
      )}

      <div className="card profile-section">
        <form onSubmit={handleSubmit} className="profile-form">
          <FormField
            id="drive-title"
            label="Job / Opportunity Title"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            placeholder="e.g. Graduate Trainee Engineer / Full-Stack Developer"
            required
            error={fieldErrors.jobTitle}
            disabled={saving || !isEditable}
          />

          <FormField
            id="drive-desc"
            label="Role Description &amp; Responsibilities"
            type="textarea"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detail the job expectations, technical environment, and perks"
            disabled={saving || !isEditable}
          />

          <div className="form-row-grid">
            <FormField
              id="drive-location"
              label="Job Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Ahmedabad / Gandhinagar / Remote"
              disabled={saving || !isEditable}
            />

            <FormField
              id="drive-ctc"
              label="Compensation / CTC (LPA in ₹)"
              type="number"
              step="0.1"
              value={formData.ctc}
              onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
              placeholder="e.g. 6.5"
              disabled={saving || !isEditable}
            />

            <FormField
              id="drive-vacancies"
              label="Total Vacancies"
              type="number"
              min="1"
              value={formData.vacancies}
              onChange={(e) => setFormData({ ...formData, vacancies: e.target.value })}
              required
              error={fieldErrors.vacancies}
              disabled={saving || !isEditable}
            />
          </div>

          <hr className="form-divider" />
          <h4>Candidate Eligibility Criteria</h4>

          <div className="form-row-grid">
            <FormField
              id="drive-course"
              label="Required Degree / Course"
              value={formData.requiredCourse}
              onChange={(e) => setFormData({ ...formData, requiredCourse: e.target.value })}
              placeholder="e.g. MCA, M.Sc. IT, B.Tech CS"
              disabled={saving || !isEditable}
            />

            <FormField
              id="drive-gradyear"
              label="Target Graduation Year"
              type="number"
              value={formData.graduationYear}
              onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
              placeholder="e.g. 2026"
              disabled={saving || !isEditable}
            />
          </div>

          <div className="form-row-grid">
            <FormField
              id="drive-cgpa"
              label="Minimum CGPA (0.0 to 10.0)"
              type="number"
              step="0.01"
              value={formData.minimumCgpa}
              onChange={(e) => setFormData({ ...formData, minimumCgpa: e.target.value })}
              placeholder="e.g. 7.0"
              error={fieldErrors.minimumCgpa}
              disabled={saving || !isEditable}
            />

            <FormField
              id="drive-backlogs"
              label="Maximum Allowed Backlogs"
              type="number"
              min="0"
              value={formData.maximumBacklogs}
              onChange={(e) => setFormData({ ...formData, maximumBacklogs: e.target.value })}
              placeholder="e.g. 0"
              error={fieldErrors.maximumBacklogs}
              disabled={saving || !isEditable}
            />
          </div>

          <hr className="form-divider" />
          <h4>Registration Timeline</h4>

          <div className="form-row-grid">
            <FormField
              id="drive-start"
              label="Applications Open From"
              type="datetime-local"
              value={formData.registrationStart}
              onChange={(e) => setFormData({ ...formData, registrationStart: e.target.value })}
              required
              error={fieldErrors.registrationStart}
              disabled={saving || !isEditable}
            />

            <FormField
              id="drive-end"
              label="Application Deadline"
              type="datetime-local"
              value={formData.registrationEnd}
              onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
              required
              error={fieldErrors.registrationEnd}
              disabled={saving || !isEditable}
            />
          </div>

          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(ROUTES.COMPANY_DRIVES)}
            >
              Cancel
            </Button>
            {isEditable && (
              <Button type="submit" loading={saving} disabled={saving}>
                {isEditMode ? 'Update Draft Drive' : 'Create Draft Drive'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
