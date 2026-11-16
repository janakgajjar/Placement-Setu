import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function CompanyDashboard() {
  const [profile, setProfile] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [profileRes, drivesRes] = await Promise.allSettled([
          api.company.getProfile(),
          api.company.getDrives({ page: 0, size: 5 }),
        ]);

        if (!isMounted) return;

        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data);
        } else {
          setError(profileRes.reason?.message || 'Could not load company profile');
        }

        if (drivesRes.status === 'fulfilled') {
          setDrives(drivesRes.value.data?.content || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Error loading dashboard');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading company portal..." />
      </div>
    );
  }

  const isApproved = profile?.accountStatus === 'ACTIVE';

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">RECRUITER WORKSPACE</p>
          <h1 className="page-title">{profile?.companyName || 'Company Portal'}</h1>
          <p className="page-subtitle">
            Recruitment management for Gujarat Vidyapith campus drives.
          </p>
        </div>
        <div className="page-actions">
          <Button to={ROUTES.COMPANY_PROFILE} variant="secondary">
            Edit Profile
          </Button>
          <Button to={ROUTES.COMPANY_DRIVE_CREATE} disabled={!isApproved}>
            + Post Placement Drive
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Account Verification Status Banner */}
      {!isApproved && (
        <div className="status-banner status-banner--warning">
          <div className="status-banner__icon">⏳</div>
          <div className="status-banner__body">
            <h3>Company Account Status: {profile?.accountStatus || 'PENDING'}</h3>
            <p>
              Your company registration is currently being verified by Gujarat Vidyapith Placement Officers.
              Posting new placement drives is available once your account status becomes Active.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="card-grid">
        <article className="card">
          <div className="card-header">
            <h3>Organization Profile</h3>
            <StatusBadge status={profile?.accountStatus || 'PENDING'} />
          </div>
          <div className="data-list">
            <div className="data-row">
              <span className="data-label">Company Name</span>
              <span className="data-value font-medium">{profile?.companyName}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Official Email</span>
              <span className="data-value">{profile?.email}</span>
            </div>
            <div className="data-row">
              <span className="data-label">GSTIN</span>
              <span className="data-value">{profile?.gstin || 'Not provided'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Contact Phone</span>
              <span className="data-value">{profile?.phone || 'Not provided'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Website</span>
              <span className="data-value">
                {profile?.website ? (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="external-link">
                    {profile.website} ↗
                  </a>
                ) : (
                  'Not provided'
                )}
              </span>
            </div>
          </div>
          <div className="card-footer">
            <Link to={ROUTES.COMPANY_PROFILE} className="text-link">
              Update Contact Details →
            </Link>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Placement Drives Overview</h3>
            <Link to={ROUTES.COMPANY_DRIVES} className="text-link">
              View All Drives →
            </Link>
          </div>
          <div className="data-list">
            <div className="data-row">
              <span className="data-label">Total Drives Posted</span>
              <span className="data-value font-medium">{drives.length}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Active / Published</span>
              <span className="data-value">
                {drives.filter((d) => d.status === 'PUBLISHED').length}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Draft Drives</span>
              <span className="data-value">
                {drives.filter((d) => d.status === 'DRAFT').length}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Closed Drives</span>
              <span className="data-value">
                {drives.filter((d) => d.status === 'CLOSED').length}
              </span>
            </div>
          </div>
          <div className="card-footer">
            <Button to={ROUTES.COMPANY_DRIVE_CREATE} className="button--sm" disabled={!isApproved}>
              Create New Drive
            </Button>
          </div>
        </article>
      </div>

      {/* Recent Drives Table */}
      <section className="section-block">
        <div className="section-header-row">
          <div>
            <h2>Recent Placement Drives</h2>
            <p className="section-desc">Manage draft, active, and completed placement opportunities.</p>
          </div>
          <Link to={ROUTES.COMPANY_DRIVES} className="text-link">
            See all drives ({drives.length})
          </Link>
        </div>

        {drives.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Location</th>
                  <th>CTC</th>
                  <th>Vacancies</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id}>
                    <td>
                      <strong>{drive.jobTitle}</strong>
                      {drive.requiredCourse && (
                        <span className="table-subtext">{drive.requiredCourse}</span>
                      )}
                    </td>
                    <td>{drive.location || 'Not specified'}</td>
                    <td>{drive.ctc ? `₹${drive.ctc} LPA` : 'As per norms'}</td>
                    <td>{drive.vacancies}</td>
                    <td>
                      <StatusBadge status={drive.status} />
                    </td>
                    <td>
                      {drive.status === 'DRAFT' ? (
                        <Link
                          to={ROUTES.COMPANY_DRIVE_EDIT(drive.id)}
                          className="table-action-link"
                        >
                          Edit Draft
                        </Link>
                      ) : (
                        <Link to={ROUTES.COMPANY_DRIVES} className="table-action-link">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel card">
            <p>No placement drives created yet.</p>
            <Button to={ROUTES.COMPANY_DRIVE_CREATE} disabled={!isApproved}>
              Post Your First Drive
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
