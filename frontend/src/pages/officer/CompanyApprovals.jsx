import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import api from '../../lib/api';

export default function CompanyApprovals() {
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'companies'
  const [companies, setCompanies] = useState([]);
  const [pendingDrives, setPendingDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Rejection modal state for drives
  const [rejectModal, setRejectModal] = useState({ isOpen: false, drive: null, reason: '' });
  const [rejectError, setRejectError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadPendingData() {
    try {
      setLoading(true);
      const [compRes, driveRes] = await Promise.allSettled([
        api.officer.getPendingCompanies(),
        api.officer.getDrives('?status=PENDING_APPROVAL&size=50'),
      ]);

      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        setCompanies(compRes.value.data || []);
      }
      if (driveRes.status === 'fulfilled' && driveRes.value?.data) {
        setPendingDrives(driveRes.value.data.content || []);
      }
    } catch (err) {
      console.warn('Error loading pending approval queue:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendingData();
  }, []);

  // Company Approvals
  const handleApproveCompany = async (id, name) => {
    try {
      await api.officer.approveCompany(id);
      setFeedback(`Company "${name}" was successfully approved. Their account is now ACTIVE.`);
      await loadPendingData();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectCompany = async (id, name) => {
    const reason = window.prompt(`Enter rejection reason for "${name}":`, 'GSTIN verification failed');
    if (!reason) return;

    try {
      await api.officer.rejectCompany(id, reason);
      setFeedback(`Company "${name}" registration has been rejected.`);
      await loadPendingData();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  // Drive Approvals
  const handleApproveDrive = async (drive) => {
    try {
      setActionLoading(true);
      await api.officer.approveDrive(drive.id);
      setFeedback(`Placement Drive "${drive.jobTitle}" has been approved and published! Eligible students can now view and apply.`);
      await loadPendingData();
    } catch (err) {
      alert(err.message || 'Drive approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDriveModal = (drive) => {
    setRejectModal({ isOpen: true, drive, reason: '' });
    setRejectError('');
  };

  const handleConfirmRejectDrive = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason || rejectModal.reason.trim().length < 5) {
      setRejectError('Please provide a specific rejection reason (min 5 characters) so the recruiter can address it.');
      return;
    }

    try {
      setActionLoading(true);
      await api.officer.rejectDrive(rejectModal.drive.id, rejectModal.reason.trim());
      setRejectModal({ isOpen: false, drive: null, reason: '' });
      setFeedback(`Placement Drive "${rejectModal.drive.jobTitle}" has been rejected. The recruiter has been notified with your reason.`);
      await loadPendingData();
    } catch (err) {
      setRejectError(err.message || 'Failed to reject drive');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Placement Officer Review &amp; Approval Desk"
      breadcrumbs={[{ label: 'Officer Desk' }, { label: 'Approval Queue' }]}
    >
      <Modal
        isOpen={Boolean(feedback)}
        title="Action Completed"
        message={feedback}
        onConfirm={() => setFeedback(null)}
      />

      {/* Reject Drive Modal */}
      {rejectModal.isOpen && (
        <div
          className="gv-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="gv-modal-box"
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              borderTop: '5px solid #D32F2F',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#C62828', marginBottom: '8px' }}>
              Reject Placement Drive
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '16px' }}>
              Provide the specific reason for rejecting <strong>{rejectModal.drive?.jobTitle}</strong>. The company will see this note and can edit and resubmit their drive.
            </p>

            <form onSubmit={handleConfirmRejectDrive}>
              {rejectError && (
                <div
                  style={{
                    backgroundColor: '#FFEBEE',
                    color: '#C62828',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    marginBottom: '12px',
                    border: '1px solid #FFCDD2',
                  }}
                >
                   {rejectError}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="rejection-reason-input"
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '6px' }}
                >
                  Rejection Reason / Required Changes *
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={4}
                  className="gv-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="e.g. CTC breakdown is incomplete; minimum CGPA does not align with department guidelines; registration deadline is too short."
                  value={rejectModal.reason}
                  onChange={(e) => {
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }));
                    if (rejectError) setRejectError('');
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectModal({ isOpen: false, drive: null, reason: '' })}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{ backgroundColor: '#D32F2F', borderColor: '#D32F2F', color: '#fff' }}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Confirm Rejection 
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #E6E1DC', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('drives')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.95rem',
            fontWeight: activeTab === 'drives' ? 700 : 500,
            color: activeTab === 'drives' ? 'var(--gv-primary, #563828)' : 'var(--gv-text-subtle, #666)',
            borderBottom: activeTab === 'drives' ? '3px solid var(--gv-primary, #563828)' : '3px solid transparent',
            marginBottom: '-10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span> Pending Placement Drives</span>
          {pendingDrives.length > 0 && (
            <span
              style={{
                backgroundColor: '#D32F2F',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: '10px',
                padding: '1px 7px',
              }}
            >
              {pendingDrives.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.95rem',
            fontWeight: activeTab === 'companies' ? 700 : 500,
            color: activeTab === 'companies' ? 'var(--gv-primary, #563828)' : 'var(--gv-text-subtle, #666)',
            borderBottom: activeTab === 'companies' ? '3px solid var(--gv-primary, #563828)' : '3px solid transparent',
            marginBottom: '-10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span> Pending Company Registrations</span>
          {companies.length > 0 && (
            <span
              style={{
                backgroundColor: 'var(--gv-primary, #563828)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: '10px',
                padding: '1px 7px',
              }}
            >
              {companies.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Pending Drives */}
      {activeTab === 'drives' && (
        <Card title="Pending Placement Drives Awaiting Officer Approval" watermark>
          <p style={{ fontSize: '0.88rem', color: 'var(--gv-text-muted)', marginBottom: '18px' }}>
            Under Gujarat Vidyapith campus placement governance, recruiters submit drives for review. Only drives approved by the Placement Officer or Administrator become visible to eligible candidates.
          </p>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
              Loading pending drives queue...
            </div>
          ) : (
            <div className="gv-table-responsive">
              <table className="gv-table">
                <thead>
                  <tr>
                    <th>Job Title &amp; Recruiter</th>
                    <th>Compensation</th>
                    <th>Eligibility Criteria</th>
                    <th>Registration Window</th>
                    <th>Status</th>
                    <th>Officer Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDrives.length > 0 ? (
                    pendingDrives.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong style={{ color: 'var(--gv-primary-brown, #563828)', fontSize: '0.95rem' }}>
                            {d.jobTitle}
                          </strong>
                          <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '2px' }}>
                             {d.companyName || 'Corporate Partner'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle, #777)' }}>
                             {d.location || 'Gujarat'}
                          </div>
                        </td>
                        <td>
                          {d.ctc && <div style={{ fontWeight: 700 }}>₹{(d.ctc / 100000).toFixed(1)} LPA</div>}
                          {d.stipend && <div style={{ color: 'var(--gv-sage-green-dark, #2E7D32)', fontSize: '0.8rem' }}>₹{d.stipend.toLocaleString()}/mo</div>}
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            {d.driveType === 'PAID_INTERNSHIP' ? 'Paid Internship' : 'Full-Time (FTE)'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>
                            <strong>Course:</strong> {d.requiredCourse || 'Any'}
                          </div>
                          <div style={{ fontSize: '0.82rem' }}>
                            <strong>Min CGPA:</strong> {d.minimumCgpa || 'None'} | <strong>Max Backlogs:</strong> {d.maximumBacklogs ?? 'Any'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#555' }}>
                            Start: {d.registrationStart ? new Date(d.registrationStart).toLocaleDateString() : 'Immediate'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#D32F2F', fontWeight: 600 }}>
                            Deadline: {d.registrationEnd ? new Date(d.registrationEnd).toLocaleDateString() : 'Open'}
                          </div>
                        </td>
                        <td>
                          <Badge status={d.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                              size="sm"
                              variant="sage"
                              onClick={() => handleApproveDrive(d)}
                              disabled={actionLoading}
                            >
                              Approve &amp; Publish 
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: '#D32F2F', color: '#D32F2F' }}
                              onClick={() => openRejectDriveModal(d)}
                              disabled={actionLoading}
                            >
                              Reject 
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '35px', color: 'var(--gv-text-subtle, #777)' }}>
                         No pending drives awaiting officer approval. All company submissions are up to date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Pending Companies */}
      {activeTab === 'companies' && (
        <Card title="Pending Recruiter Applications (GSTIN &amp; Institutional Compliance)" watermark>
          <p style={{ fontSize: '0.88rem', color: 'var(--gv-text-muted)', marginBottom: '20px' }}>
            As per Section 8 of Gujarat Vidyapith Placement Guidelines, only approved recruiters with verified tax credentials can post drives and access candidate applications.
          </p>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
              Loading pending recruiters...
            </div>
          ) : (
            <div className="gv-table-responsive">
              <table className="gv-table">
                <thead>
                  <tr>
                    <th>Enterprise Name</th>
                    <th>Corporate GSTIN</th>
                    <th>HR Contact</th>
                    <th>Address &amp; Website</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length > 0 ? (
                    companies.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong style={{ color: 'var(--gv-primary-brown)', fontSize: '0.95rem' }}>
                            {c.companyName}
                          </strong>
                        </td>
                        <td>
                          <span style={{ backgroundColor: 'var(--gv-bg-sand)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.82rem' }}>
                            {c.gstin}
                          </span>
                        </td>
                        <td>
                          <div>{c.email || 'Email'}</div>
                          <small style={{ color: 'var(--gv-text-subtle)' }}>{c.phone || 'Phone'}</small>
                        </td>
                        <td>
                          <div>{c.address || 'Address'}</div>
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--gv-portal-cyan-dark)' }}>
                              {c.website} ↗
                            </a>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                              size="sm"
                              variant="sage"
                              onClick={() => handleApproveCompany(c.id, c.companyName)}
                            >
                              Approve ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectCompany(c.id, c.companyName)}
                            >
                              Reject ✕
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '35px', color: 'var(--gv-text-subtle)' }}>
                        ✓ No companies pending verification. All applications are up to date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}
