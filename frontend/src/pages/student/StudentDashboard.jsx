import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await api.student.getDashboard();
        if (isMounted) {
          setData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load student dashboard.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading placement profile..." />
      </div>
    );
  }

  const profile = data?.profile;
  const visibleToCompanies = data?.visibleToCompanies ?? false;
  const resumeRequired = data?.resumeUploadRequired ?? true;
  const missingFields = data?.missingFields || [];

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">STUDENT PORTAL</p>
          <h1 className="page-title">
            Welcome, {profile?.fullName || 'Student'}
          </h1>
          <p className="page-subtitle">
            Gujarat Vidyapith · {profile?.course || 'Placement Candidate'}
          </p>
        </div>
        <div className="page-actions">
          <Button to={ROUTES.STUDENT_PROFILE} variant="secondary">
            Edit Full Profile
          </Button>
          <Button to={ROUTES.STUDENT_RESUME}>
            {profile?.resumeUploaded ? 'Manage Resume' : 'Upload Resume'}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Recruiter Visibility Alert Banner */}
      <div
        className={`status-banner ${
          visibleToCompanies ? 'status-banner--success' : 'status-banner--warning'
        }`}
      >
        <div className="status-banner__icon">
          {visibleToCompanies ? '✓' : '⚠️'}
        </div>
        <div className="status-banner__body">
          <h3>
            {visibleToCompanies
              ? 'Your profile is Recruiter-Visible'
              : 'Profile Incomplete: Hidden from Recruiters'}
          </h3>
          <p>
            {visibleToCompanies
              ? 'Your profile satisfies minimum placement eligibility criteria and is visible to registered partner companies.'
              : 'Recruiters cannot view your profile until required fields are completed and a current resume is uploaded.'}
          </p>

          {!visibleToCompanies && missingFields.length > 0 && (
            <div className="missing-fields-box">
              <strong>Pending required items:</strong>
              <ul>
                {missingFields.map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Profile Overview Card Grid */}
      <div className="card-grid">
        <article className="card">
          <div className="card-header">
            <h3>Academic Information</h3>
            <StatusBadge status={profile?.profileStatus || 'PENDING'} />
          </div>
          <div className="data-list">
            <div className="data-row">
              <span className="data-label">Program / Course</span>
              <span className="data-value">{profile?.course || 'Not specified'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Institution / Campus</span>
              <span className="data-value">{profile?.institution || 'Gujarat Vidyapith'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Graduation Year</span>
              <span className="data-value">{profile?.graduationYear || 'Not specified'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Current CGPA</span>
              <span className="data-value">
                {profile?.cgpa !== null && profile?.cgpa !== undefined ? `${profile.cgpa} / 10.0` : 'Not provided'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Active Backlogs</span>
              <span className="data-value">{profile?.backlogs ?? '0'}</span>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Placement & Resume Status</h3>
            <StatusBadge
              status={
                profile?.resumeUploaded ? profile?.resumeProcessingStatus || 'COMPLETED' : 'PENDING'
              }
              label={profile?.resumeUploaded ? 'Resume Uploaded' : 'Resume Required'}
            />
          </div>
          <div className="data-list">
            <div className="data-row">
              <span className="data-label">Resume Upload Status</span>
              <span className="data-value">
                {profile?.resumeUploaded ? 'Uploaded & Synced' : 'Action Required'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Placement Lock</span>
              <span className="data-value">
                {profile?.placementLocked ? 'Locked (Placed)' : 'Open / Unlocked'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">APAAR ID</span>
              <span className="data-value">{profile?.apparId || 'Not provided'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Technical Skills</span>
              <span className="data-value">
                {profile?.skills && profile.skills.length > 0
                  ? `${profile.skills.length} skills recorded`
                  : 'No skills added yet'}
              </span>
            </div>
          </div>
          <div className="card-footer">
            <Link to={ROUTES.STUDENT_RESUME} className="text-link">
              Go to Resume Management →
            </Link>
          </div>
        </article>
      </div>

      {/* Quick Navigation Panels */}
      <div className="quick-links-section">
        <h2 className="section-title">Placement Navigation</h2>
        <div className="quick-grid">
          <Link to={ROUTES.STUDENT_PROFILE} className="quick-card">
            <span className="quick-icon">👤</span>
            <div>
              <h4>Complete Profile</h4>
              <p>Update academic marks, skills, projects, and certifications.</p>
            </div>
          </Link>

          <Link to={ROUTES.STUDENT_RESUME} className="quick-card">
            <span className="quick-icon">📄</span>
            <div>
              <h4>Resume Management</h4>
              <p>Upload your 10 MB max PDF/Word resume for recruiter access.</p>
            </div>
          </Link>

          <Link to={ROUTES.STUDENT_DRIVES} className="quick-card">
            <span className="quick-icon">🏢</span>
            <div>
              <h4>Campus Drives</h4>
              <p>View placement drive listings and recruiter requirements.</p>
            </div>
          </Link>

          <Link to={ROUTES.STUDENT_APPLICATIONS} className="quick-card">
            <span className="quick-icon">📋</span>
            <div>
              <h4>My Applications</h4>
              <p>Track your recruitment submissions and status.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
