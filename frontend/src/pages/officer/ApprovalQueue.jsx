import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function ApprovalQueue() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Approval/Rejection modal state
  const [targetCompany, setTargetCompany] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [processing, setProcessing] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.admin.getPendingCompanies();
      setCompanies(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async () => {
    if (!targetCompany || !actionType) return;

    setProcessing(true);
    setError(null);
    try {
      if (actionType === 'approve') {
        await api.admin.approveCompany(targetCompany.id);
        setSuccessMessage(`Organization "${targetCompany.companyName}" approved successfully.`);
      } else {
        await api.admin.rejectCompany(targetCompany.id);
        setSuccessMessage(`Organization "${targetCompany.companyName}" has been rejected.`);
      }

      setTargetCompany(null);
      setActionType(null);
      await fetchPending();
    } catch (err) {
      setError(err.message || `Failed to ${actionType} company.`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION &amp; VERIFICATION</p>
          <h1 className="page-title">Company Approval Queue</h1>
          <p className="page-subtitle">
            Review onboarding requests submitted by prospective campus recruiters.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={fetchPending} disabled={loading}>
            ↻ Refresh Queue
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {successMessage && (
        <div className="alert-banner alert-banner--success" role="status">
          <span className="alert-banner__icon">✓</span>
          <p className="alert-banner__title">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="table-loading-wrap">
          <Spinner text="Fetching pending registrations..." />
        </div>
      ) : companies.length > 0 ? (
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Address</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.companyName}</strong>
                  </td>
                  <td>{company.email || '—'}</td>
                  <td>
                    <span className="gstin-badge">{company.gstin || 'Not Provided'}</span>
                  </td>
                  <td>{company.phone || '—'}</td>
                  <td>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="external-link"
                      >
                        Visit ↗
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className="table-subtext" title={company.address}>
                      {company.address ? `${company.address.slice(0, 45)}...` : '—'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={company.accountStatus || 'PENDING'} />
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="button-link button-link--primary"
                        onClick={() => {
                          setTargetCompany(company);
                          setActionType('approve');
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="button-link button-link--danger"
                        onClick={() => {
                          setTargetCompany(company);
                          setActionType('reject');
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-panel card">
          <span className="empty-icon" aria-hidden="true">
            ✓
          </span>
          <h3>All Caught Up</h3>
          <p>There are no pending company registrations awaiting approval.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(targetCompany && actionType)}
        title={
          actionType === 'approve'
            ? 'Approve Company Onboarding'
            : 'Reject Company Registration'
        }
        message={
          actionType === 'approve'
            ? `Are you sure you want to approve "${targetCompany?.companyName}"? This will activate their recruiter account and permit them to publish placement drives.`
            : `Are you sure you want to reject "${targetCompany?.companyName}"? Their account status will be set to REJECTED.`
        }
        confirmLabel={actionType === 'approve' ? 'Approve & Activate' : 'Reject Account'}
        confirmVariant={actionType === 'approve' ? 'primary' : 'danger'}
        onConfirm={handleAction}
        onCancel={() => {
          setTargetCompany(null);
          setActionType(null);
        }}
        loading={processing}
      />
    </div>
  );
}
