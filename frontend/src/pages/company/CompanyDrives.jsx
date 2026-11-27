import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import { DEPARTMENTS, BYLAWS } from '../../lib/constants';
import api from '../../lib/api';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Drives' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function CompanyDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', driveId: null, title: '', message: '' });
  const [modalFeedback, setModalFeedback] = useState(null);
  const [editingDrive, setEditingDrive] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    jobTitle: '',
    description: '',
    location: '',
    driveType: 'FULL_TIME',
    ctc: '',
    stipend: '',
    vacancies: 1,
    minimumCgpa: 6.0,
    maximumBacklogs: 0,
    requiredCourse: 'MCA',
    graduationYear: 2026,
    maximumAge: 26,
    isDreamOffer: false,
    registrationStart: '',
    registrationEnd: '',
  });

  const loadDrives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', page);
      params.append('size', '10');

      const queryString = `?${params.toString()}`;
      const res = await api.company.getDrives(queryString);
      if (res?.data) {
        setDrives(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      console.warn('Failed to load drives:', err);
      setError(err.message || 'Failed to load drives from server.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  const handleTabChange = (tabId) => {
    setStatusFilter(tabId);
    setPage(0);
  };

  const handlePublish = async (driveId) => {
    try {
      await api.company.publishDrive(driveId);
      setModalFeedback('Placement drive submitted to the Gujarat Vidyapith Placement Office for review and approval.');
      await loadDrives();
    } catch (err) {
      alert(err.message || 'Failed to submit drive for approval.');
    } finally {
      setConfirmModal({ isOpen: false, type: '', driveId: null, title: '', message: '' });
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
      setConfirmModal({ isOpen: false, type: '', driveId: null, title: '', message: '' });
    }
  };

  const handleDelete = async (driveId) => {
    try {
      await api.company.deleteDrive(driveId);
      setModalFeedback('Placement drive has been successfully deleted.');
      await loadDrives();
    } catch (err) {
      alert(err.message || 'Failed to delete drive.');
    } finally {
      setConfirmModal({ isOpen: false, type: '', driveId: null, title: '', message: '' });
    }
  };

  const openEditModal = (drive) => {
    setEditingDrive(drive);
    setEditError(null);
    setEditForm({
      jobTitle: drive.jobTitle || '',
      description: drive.description || '',
      location: drive.location || '',
      driveType: drive.driveType || 'FULL_TIME',
      ctc: drive.ctc || '',
      stipend: drive.stipend || '',
      vacancies: drive.vacancies || 1,
      minimumCgpa: drive.minimumCgpa || 6.0,
      maximumBacklogs: drive.maximumBacklogs != null ? drive.maximumBacklogs : 0,
      requiredCourse: drive.requiredCourse || 'MCA',
      graduationYear: drive.graduationYear || 2026,
      maximumAge: drive.maximumAge || 26,
      isDreamOffer: Boolean(drive.isDreamOffer),
      registrationStart: drive.registrationStart ? drive.registrationStart.slice(0, 16) : '',
      registrationEnd: drive.registrationEnd ? drive.registrationEnd.slice(0, 16) : '',
    });
  };

  const handleEditChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditForm({ ...editForm, [e.target.id]: val });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);

    if (editForm.driveType === 'PAID_INTERNSHIP') {
      if (!editForm.stipend || Number(editForm.stipend) < BYLAWS.MIN_INTERNSHIP_STIPEND) {
        setEditError(`Institutional Bylaw Violation: Gujarat Vidyapith requires a minimum monthly stipend of ₹${BYLAWS.MIN_INTERNSHIP_STIPEND.toLocaleString()} for all campus internships.`);
        return;
      }
    }

    setEditLoading(true);
    try {
      await api.company.updateDrive(editingDrive.id, {
        jobTitle: editForm.jobTitle.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        driveType: editForm.driveType,
        ctc: editForm.ctc ? Number(editForm.ctc) : null,
        stipend: editForm.stipend ? Number(editForm.stipend) : null,
        vacancies: Number(editForm.vacancies),
        minimumCgpa: editForm.minimumCgpa ? Number(editForm.minimumCgpa) : null,
        maximumBacklogs: Number(editForm.maximumBacklogs),
        requiredCourse: editForm.requiredCourse,
        graduationYear: Number(editForm.graduationYear),
        maximumAge: editForm.maximumAge ? Number(editForm.maximumAge) : null,
        isDreamOffer: Boolean(editForm.isDreamOffer || (editForm.ctc && Number(editForm.ctc) >= BYLAWS.DREAM_OFFER_MIN_CTC)),
        registrationStart: editForm.registrationStart ? editForm.registrationStart : null,
        registrationEnd: editForm.registrationEnd ? editForm.registrationEnd : null,
      });

      setEditingDrive(null);
      setModalFeedback('Placement drive details updated successfully.');
      await loadDrives();
    } catch (err) {
      setEditError(err.message || 'Failed to update placement drive.');
    } finally {
      setEditLoading(false);
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.type === 'publish') handlePublish(confirmModal.driveId);
          else if (confirmModal.type === 'close') handleClose(confirmModal.driveId);
          else if (confirmModal.type === 'delete') handleDelete(confirmModal.driveId);
        }}
        onCancel={() => setConfirmModal({ isOpen: false, type: '', driveId: null, title: '', message: '' })}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Proceed'}
        cancelText="Cancel"
      />

      {/* Edit Drive Modal */}
      {editingDrive && (
        <div className="gv-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="gv-modal-box" style={{
            background: '#fff', borderRadius: '8px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--gv-primary-brown)' }}>Edit Placement Drive</h3>
              <button
                type="button"
                onClick={() => setEditingDrive(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gv-text-subtle)' }}
              >
                &times;
              </button>
            </div>

            {editError && (
              <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="Job Title / Role Designation *" id="jobTitle" required>
                    <input
                      type="text"
                      id="jobTitle"
                      className="gv-input"
                      value={editForm.jobTitle}
                      onChange={handleEditChange}
                      required
                    />
                  </FormField>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="Role Overview & Requirements" id="description">
                    <textarea
                      id="description"
                      className="gv-input"
                      rows={3}
                      value={editForm.description}
                      onChange={handleEditChange}
                    />
                  </FormField>
                </div>

                <FormField label="Job Location *" id="location" required>
                  <input
                    type="text"
                    id="location"
                    className="gv-input"
                    value={editForm.location}
                    onChange={handleEditChange}
                    required
                  />
                </FormField>

                <FormField label="Drive Engagement Type *" id="driveType" required>
                  <select
                    id="driveType"
                    className="gv-input"
                    value={editForm.driveType}
                    onChange={handleEditChange}
                  >
                    <option value="FULL_TIME">Full-Time Employment (FTE)</option>
                    <option value="PAID_INTERNSHIP">Paid Internship</option>
                  </select>
                </FormField>

                {editForm.driveType === 'FULL_TIME' ? (
                  <FormField label="Annual CTC (in ₹) *" id="ctc" help="e.g. 600000 for 6.0 LPA">
                    <input
                      type="number"
                      id="ctc"
                      className="gv-input"
                      value={editForm.ctc}
                      onChange={handleEditChange}
                      min="100000"
                      step="50000"
                    />
                  </FormField>
                ) : (
                  <FormField label="Monthly Stipend (in ₹) *" id="stipend" help="Min ₹10,000 as per Vidyapith bylaw">
                    <input
                      type="number"
                      id="stipend"
                      className="gv-input"
                      value={editForm.stipend}
                      onChange={handleEditChange}
                      min={BYLAWS.MIN_INTERNSHIP_STIPEND}
                      step="1000"
                    />
                  </FormField>
                )}

                <FormField label="Number of Vacancies *" id="vacancies" required>
                  <input
                    type="number"
                    id="vacancies"
                    className="gv-input"
                    value={editForm.vacancies}
                    onChange={handleEditChange}
                    min="1"
                    required
                  />
                </FormField>

                <FormField label="Eligible Academic Course *" id="requiredCourse" required>
                  <select
                    id="requiredCourse"
                    className="gv-input"
                    value={editForm.requiredCourse}
                    onChange={handleEditChange}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Graduation Batch Year *" id="graduationYear" required>
                  <input
                    type="number"
                    id="graduationYear"
                    className="gv-input"
                    value={editForm.graduationYear}
                    onChange={handleEditChange}
                    min="2024"
                    max="2030"
                    required
                  />
                </FormField>

                <FormField label="Minimum Required CGPA" id="minimumCgpa" help="Scale: 0.0 - 10.0">
                  <input
                    type="number"
                    id="minimumCgpa"
                    className="gv-input"
                    value={editForm.minimumCgpa}
                    onChange={handleEditChange}
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </FormField>

                <FormField label="Max Permitted Active Backlogs" id="maximumBacklogs">
                  <input
                    type="number"
                    id="maximumBacklogs"
                    className="gv-input"
                    value={editForm.maximumBacklogs}
                    onChange={handleEditChange}
                    min="0"
                    max="10"
                  />
                </FormField>

                <FormField label="Registration Start Date & Time" id="registrationStart">
                  <input
                    type="datetime-local"
                    id="registrationStart"
                    className="gv-input"
                    value={editForm.registrationStart}
                    onChange={handleEditChange}
                  />
                </FormField>

                <FormField label="Registration Deadline" id="registrationEnd">
                  <input
                    type="datetime-local"
                    id="registrationEnd"
                    className="gv-input"
                    value={editForm.registrationEnd}
                    onChange={handleEditChange}
                  />
                </FormField>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDrive(null)}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving Changes...' : 'Save Drive Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Banner and Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--gv-text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Workflow: <strong>DRAFT</strong> → <em>Submit for Approval</em> → <strong>PENDING APPROVAL</strong> → <em>Officer Review</em> → <strong>PUBLISHED / REJECTED</strong>
        </p>

        <Link to={ROUTES.COMPANY_DRIVE_CREATE} className="gv-btn gv-btn--primary gv-btn--sm">
          + Create New Placement Drive
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gv-border)', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: statusFilter === tab.id ? 'var(--gv-primary)' : 'var(--gv-text-muted)',
              borderBottom: statusFilter === tab.id ? '2px solid var(--gv-primary)' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
           {error}
        </div>
      )}

      <Card title={`Corporate Placement Drives (${totalElements})`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gv-text-muted)' }}>
            <span className="gv-spinner" style={{ marginRight: '8px' }}></span>
            Loading placement drives...
          </div>
        ) : (
          <>
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                              Candidates 
                            </Link>

                            {(d.status === 'DRAFT' || d.status === 'REJECTED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(d)}
                              >
                                Edit 
                              </Button>
                            )}

                            {d.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="sage"
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  type: 'publish',
                                  driveId: d.id,
                                  title: 'Submit Drive for Approval',
                                  message: 'Are you sure you want to submit this placement drive for review by the Gujarat Vidyapith Placement Office?'
                                })}
                              >
                                Submit 
                              </Button>
                            )}

                            {d.status === 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  type: 'publish',
                                  driveId: d.id,
                                  title: 'Resubmit Drive for Approval',
                                  message: 'Have you addressed the rejection remarks? Submitting will queue the drive for re-evaluation.'
                                })}
                              >
                                Resubmit 
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
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  type: 'close',
                                  driveId: d.id,
                                  title: 'Close Placement Drive',
                                  message: 'Are you sure you want to close this placement drive? No further student applications will be accepted.'
                                })}
                              >
                                Close Drive
                              </Button>
                            )}

                            {(d.status === 'DRAFT' || d.status === 'REJECTED') && (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#C62828',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                }}
                                title="Delete Drive"
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  type: 'delete',
                                  driveId: d.id,
                                  title: 'Delete Placement Drive',
                                  message: 'Are you sure you want to delete this placement drive? This action cannot be undone.'
                                })}
                              >
                                 Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gv-text-subtle)' }}>
                        {statusFilter === 'ALL'
                          ? 'No placement drives created yet. Click "+ Create New Placement Drive" to post your first opening.'
                          : `No placement drives found with status "${statusFilter}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--gv-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gv-text-muted)' }}>
                  Page {page + 1} of {totalPages} ({totalElements} total)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next 
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
