import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function DriveList() {
  const [drives, setDrives] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal actions
  const [driveToPublish, setDriveToPublish] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [driveToClose, setDriveToClose] = useState(null);
  const [closing, setClosing] = useState(false);

  const fetchDrives = async (page = 0, status = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.company.getDrives({
        status: status || undefined,
        page,
        size: 10,
      });

      const pageData = response.data;
      setDrives(pageData?.content || []);
      setTotalPages(pageData?.totalPages || 1);
      setCurrentPage(pageData?.number || 0);
    } catch (err) {
      setError(err.message || 'Failed to load placement drives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives(0, statusFilter);
  }, [statusFilter]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(0);
  };

  const handlePublish = async () => {
    if (!driveToPublish) return;
    setPublishing(true);
    setError(null);
    try {
      await api.company.publishDrive(driveToPublish.id);
      setSuccessMessage(`Drive "${driveToPublish.jobTitle}" is now published and active.`);
      setDriveToPublish(null);
      await fetchDrives(currentPage, statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to publish drive.');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!driveToClose) return;
    setClosing(true);
    setError(null);
    try {
      await api.company.closeDrive(driveToClose.id);
      setSuccessMessage(`Drive "${driveToClose.jobTitle}" has been closed.`);
      setDriveToClose(null);
      await fetchDrives(currentPage, statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to close drive.');
    } finally {
      setClosing(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">RECRUITER WORKSPACE</p>
          <h1 className="page-title">Placement Drives</h1>
          <p className="page-subtitle">
            Create, publish, and manage campus recruitment drives for Gujarat Vidyapith.
          </p>
        </div>
        <div className="page-actions">
          <Button to={ROUTES.COMPANY_DRIVE_CREATE}>+ Post New Drive</Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {successMessage && (
        <div className="alert-banner alert-banner--success" role="status">
          <span className="alert-banner__icon">✓</span>
          <p className="alert-banner__title">{successMessage}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-bar">
        <div className="tab-group" role="tablist">
          <button
            type="button"
            className={`tab-btn ${statusFilter === '' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('')}
          >
            All Drives
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'DRAFT' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('DRAFT')}
          >
            Drafts
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'PUBLISHED' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('PUBLISHED')}
          >
            Published / Active
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'CLOSED' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('CLOSED')}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Drives Table */}
      {loading ? (
        <div className="table-loading-wrap">
          <Spinner text="Fetching drives..." />
        </div>
      ) : drives.length > 0 ? (
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job Title &amp; Course</th>
                <th>Location</th>
                <th>CTC (LPA)</th>
                <th>Vacancies</th>
                <th>Min CGPA</th>
                <th>Reg. Window</th>
                <th>Status</th>
                <th>Actions</th>
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
                  <td>{drive.location || 'Gujarat'}</td>
                  <td>{drive.ctc ? `₹${drive.ctc} LPA` : 'As per norms'}</td>
                  <td>{drive.vacancies}</td>
                  <td>{drive.minimumCgpa ? `${drive.minimumCgpa}` : 'Any'}</td>
                  <td>
                    <span className="date-range">
                      {formatDate(drive.registrationStart)} – {formatDate(drive.registrationEnd)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={drive.status} />
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      {drive.status === 'DRAFT' && (
                        <>
                          <Link
                            to={ROUTES.COMPANY_DRIVE_EDIT(drive.id)}
                            className="button-link"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="button-link button-link--primary"
                            onClick={() => setDriveToPublish(drive)}
                          >
                            Publish
                          </button>
                        </>
                      )}

                      {drive.status === 'PUBLISHED' && (
                        <button
                          type="button"
                          className="button-link button-link--danger"
                          onClick={() => setDriveToClose(drive)}
                        >
                          Close Drive
                        </button>
                      )}

                      {drive.status === 'CLOSED' && (
                        <span className="text-muted text-sm">Archived</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="pagination-buttons">
                <Button
                  variant="secondary"
                  className="button--sm"
                  disabled={currentPage === 0}
                  onClick={() => fetchDrives(currentPage - 1, statusFilter)}
                >
                  ← Previous
                </Button>
                <Button
                  variant="secondary"
                  className="button--sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => fetchDrives(currentPage + 1, statusFilter)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-panel card">
          <p>
            {statusFilter
              ? `No placement drives found with status "${statusFilter}".`
              : 'You have not created any placement drives yet.'}
          </p>
          <Button to={ROUTES.COMPANY_DRIVE_CREATE}>Create Drive Now</Button>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmModal
        isOpen={!!driveToPublish}
        title="Publish Placement Drive"
        message={`Are you sure you want to publish "${driveToPublish?.jobTitle}"? Once published, the drive cannot be edited and will become active for candidates.`}
        confirmLabel="Publish Drive"
        confirmVariant="primary"
        onConfirm={handlePublish}
        onCancel={() => setDriveToPublish(null)}
        loading={publishing}
      />

      <ConfirmModal
        isOpen={!!driveToClose}
        title="Close Placement Drive"
        message={`Are you sure you want to close "${driveToClose?.jobTitle}"? Applications will be closed and the drive will transition to CLOSED state.`}
        confirmLabel="Close Drive"
        confirmVariant="danger"
        onConfirm={handleClose}
        onCancel={() => setDriveToClose(null)}
        loading={closing}
      />
    </div>
  );
}
