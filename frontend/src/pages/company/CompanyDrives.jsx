import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

export default function CompanyDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDrive, setActionDrive] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'publish', driveId: null });
  const [modalFeedback, setModalFeedback] = useState(null);

  async function loadDrives() {
    try {
      setLoading(true);
      const res = await api.company.getDrives();
      if (res?.data) {
        setDrives(res.data.content || []);
      }
    } catch (err) {
      console.warn('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrives();
  }, []);

  const handlePublish = async (driveId) => {
    try {
      await api.company.publishDrive(driveId);
      setModalFeedback('Placement drive submitted to the Gujarat Vidyapith Placement Office for review and approval.');
      await loadDrives();
    } catch (err) {
      alert(err.message || 'Failed to submit drive for approval.');
    } finally {
      setConfirmModal({ isOpen: false, type: '', driveId: null });
    }
  };

  const handleClose = async (driveId) => {
    try {
      await api.company.closeDrive(driveId);
      setModalFeedback('Placement drive closed. No further applications will be accepted.');
      await loadDrives();
    } catch (err) {
      alert(err.message || 'Failed to close drive.');
    } finally {
      setConfirmModal({ isOpen: false, type: '', driveId: null });
    }
  };

  return (
    <DashboardLayout
      title="Manage Corporate Placement Drives"
      breadcrumbs={[{ label: 'Recruiter Workspace' }, { label: 'Placement Drives' }]}
    >
      <Modal
        isOpen={Boolean(modalFeedback)}
        title="Status Updated"
        message={modalFeedback}
        onConfirm={() => setModalFeedback(null)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--gv-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Workflow: <strong>DRAFT</strong> → <em>Submit for Approval</em> → <strong>PENDING APPROVAL</strong> → <em>Officer Review</em> → <strong>PUBLISHED / REJECTED</strong>
        </p>

        <Link to={ROUTES.COMPANY_DRIVE_CREATE} className="gv-btn gv-btn--primary gv-btn--sm">
          + Create New Placement Drive
        </Link>
      </div>

      <Card title="Corporate Placement Drives &amp; Approval Status">
        <div className="gv-table-responsive">
          <table className="gv-table">
            <thead>
              <tr>
                <th>Job Title &amp; Role</th>
                <th>Type</th>
                <th>Compensation / Stipend</th>
                <th>Eligibility Criteria</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drives.length > 0 ? (
                drives.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong style={{ color: 'var(--gv-primary-brown)', fontSize: '0.92rem' }}>{d.jobTitle}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)' }}>📍 {d.location || 'Ahmedabad'}</div>
                      {d.status === 'REJECTED' && d.rejectionReason && (
                        <div
                          style={{
                            marginTop: '6px',
                            backgroundColor: '#FFEBEE',
                            border: '1px solid #FFCDD2',
                            color: '#C62828',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            maxWidth: '320px',
                            lineHeight: 1.3,
                          }}
                        >
                          <strong>Reason:</strong> {d.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {d.driveType === 'PAID_INTERNSHIP' ? 'Paid Internship' : 'Full-Time (FTE)'}
                      </span>
                    </td>
                    <td>
                      {d.ctc && <div>₹{(d.ctc / 100000).toFixed(1)} LPA</div>}
                      {d.stipend && <div style={{ color: 'var(--gv-sage-green-dark)', fontWeight: 600 }}>₹{d.stipend.toLocaleString()}/mo</div>}
                    </td>
                    <td>
                      <small style={{ display: 'block', color: 'var(--gv-text-muted)' }}>
                        Course: {d.requiredCourse || 'Any'} | Min CGPA: {d.minimumCgpa || 'None'}
                      </small>
                    </td>
                    <td>
                      <Badge status={d.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Link
                          to={`${ROUTES.COMPANY_CANDIDATE_SEARCH}?driveId=${d.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--gv-cream-warm)',
                            border: '1px solid var(--gv-border)',
                            color: 'var(--gv-primary)',
                            textDecoration: 'none',
                          }}
                          title="View students ranked by skill & eligibility match for this drive"
                        >
                          Matched Candidates 🎯
                        </Link>
                        {d.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="sage"
                            onClick={() => handlePublish(d.id)}
                          >
                            Submit for Approval →
                          </Button>
                        )}
                        {d.status === 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handlePublish(d.id)}
                          >
                            Resubmit for Approval ⟳
                          </Button>
                        )}
                        {d.status === 'PENDING_APPROVAL' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)', fontStyle: 'italic', padding: '4px 0' }}>
                            Awaiting Officer Review
                          </span>
                        )}
                        {d.status === 'PUBLISHED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClose(d.id)}
                          >
                            Close Drive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gv-text-subtle)' }}>
                    No placement drives created yet. Click "+ Create New Placement Drive" to post your first opening.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
