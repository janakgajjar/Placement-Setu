import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import api from '../../lib/api';

const STATUS_TABS = [
  { id: 'SUBMITTED', label: 'Pending Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { id: 'DRAFT', label: 'Draft' },
];

export default function OfficerStudents() {
  const [students, setStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Request Changes Modal
  const [changeModal, setChangeModal] = useState({ isOpen: false, student: null, remarks: '', error: null });
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      params.append('page', page);
      params.append('size', '15');

      const res = await api.officer.getStudentProfiles(`?${params.toString()}`);
      if (res?.data) {
        setStudents(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load student profiles:', err);
      setError(err.message || 'Failed to load student profiles from server.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleTabChange = (tabId) => {
    setStatusFilter(tabId);
    setPage(0);
  };

  const handleApprove = async (profileId) => {
    try {
      setActionLoading(true);
      await api.officer.approveStudentProfile(profileId);
      setFeedbackModal('Student profile approved successfully. Student is now verified for campus placements.');
      setSelectedStudent(null);
      await loadStudents();
    } catch (err) {
      alert(err.message || 'Failed to approve student profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChangesSubmit = async (e) => {
    e.preventDefault();
    if (!changeModal.remarks.trim()) {
      setChangeModal((prev) => ({ ...prev, error: 'Please specify the corrections or remarks required.' }));
      return;
    }

    try {
      setActionLoading(true);
      await api.officer.requestProfileChanges(changeModal.student.id, changeModal.remarks.trim());
      setChangeModal({ isOpen: false, student: null, remarks: '', error: null });
      setSelectedStudent(null);
      setFeedbackModal('Changes requested successfully. Student has been notified to revise their KYC details.');
      await loadStudents();
    } catch (err) {
      setChangeModal((prev) => ({ ...prev, error: err.message || 'Failed to request changes.' }));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Student Profile KYC Verification"
      breadcrumbs={[{ label: 'Officer Desk' }, { label: 'Student Profiles' }]}
    >
      <Modal
        isOpen={Boolean(feedbackModal)}
        title="Verification Updated"
        message={feedbackModal}
        onConfirm={() => setFeedbackModal(null)}
      />

      {/* Request Changes Modal */}
      {changeModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '8px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--gv-primary-brown)' }}>
              Request Changes: {changeModal.student?.fullName}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
              Specify the exact academic, APAAR ID, or KYC discrepancy that the student must correct.
            </p>

            {changeModal.error && (
              <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '8px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '0.85rem' }}>
                 {changeModal.error}
              </div>
            )}

            <form onSubmit={handleRequestChangesSubmit}>
              <textarea
                className="gv-input"
                rows={4}
                placeholder="e.g. Please verify APAAR ID formatting and upload latest semester mark sheet."
                value={changeModal.remarks}
                onChange={(e) => setChangeModal((prev) => ({ ...prev, remarks: e.target.value, error: null }))}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangeModal({ isOpen: false, student: null, remarks: '', error: null })}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Sending...' : 'Send Revision Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Inspection Modal */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '8px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--gv-primary-brown)' }}>
                {selectedStudent.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gv-text-subtle)' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div><strong>Email:</strong> {selectedStudent.email}</div>
              <div><strong>Phone:</strong> {selectedStudent.phone || 'N/A'}</div>
              <div><strong>Course:</strong> {selectedStudent.course} ({selectedStudent.graduationYear})</div>
              <div><strong>Institution:</strong> {selectedStudent.institution || 'Gujarat Vidyapith'}</div>
              <div><strong>APAAR / ABC ID:</strong> <code>{selectedStudent.apparId || 'N/A'}</code></div>
              <div><strong>CGPA:</strong> {selectedStudent.cgpa ?? 'N/A'}</div>
              <div><strong>Active Backlogs:</strong> {selectedStudent.backlogs ?? 0}</div>
              <div><strong>Gender:</strong> {selectedStudent.gender}</div>
              {selectedStudent.githubUrl && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>GitHub:</strong> <a href={selectedStudent.githubUrl} target="_blank" rel="noopener noreferrer">{selectedStudent.githubUrl}</a>
                </div>
              )}
              {selectedStudent.linkedinUrl && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>LinkedIn:</strong> <a href={selectedStudent.linkedinUrl} target="_blank" rel="noopener noreferrer">{selectedStudent.linkedinUrl}</a>
                </div>
              )}
            </div>

            {selectedStudent.skills?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>Skills:</strong>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedStudent.skills.map((s, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--gv-cream-warm)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--gv-border)' }}>
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent.reviewRemarks && (
              <div style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFE082', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <strong>Current Remarks:</strong> {selectedStudent.reviewRemarks}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
              <Button
                variant="outline"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </Button>
              {statusFilter === 'SUBMITTED' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setChangeModal({ isOpen: true, student: selectedStudent, remarks: '', error: null })}
                    disabled={actionLoading}
                  >
                    Request Changes 
                  </Button>
                  <Button
                    variant="sage"
                    onClick={() => handleApprove(selectedStudent.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Approving...' : 'Approve Profile ✓'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
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

      <Card title={`Student KYC Records (${totalElements})`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gv-text-muted)' }}>
            <span className="gv-spinner" style={{ marginRight: '8px' }}></span>
            Loading student records...
          </div>
        ) : (
          <>
            <div className="gv-table-responsive">
              <table className="gv-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course &amp; Batch</th>
                    <th>APAAR / ABC ID</th>
                    <th>CGPA / Backlogs</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong style={{ color: 'var(--gv-primary-brown)', fontSize: '0.92rem' }}>{s.fullName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)' }}>{s.email}</div>
                        </td>
                        <td>
                          {s.course} ({s.graduationYear || 2026})
                        </td>
                        <td>
                          <code>{s.apparId || 'N/A'}</code>
                        </td>
                        <td>
                          {s.cgpa ? `${s.cgpa} CGPA` : 'N/A'} • {s.backlogs ?? 0} backlogs
                        </td>
                        <td>
                          <Badge status={s.approvalStatus || 'DRAFT'} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedStudent(s)}
                            >
                              Inspect KYC 🔍
                            </Button>
                            {statusFilter === 'SUBMITTED' && (
                              <Button
                                size="sm"
                                variant="sage"
                                onClick={() => handleApprove(s.id)}
                                disabled={actionLoading}
                              >
                                Approve ✓
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gv-text-subtle)' }}>
                        No student profiles found under "{STATUS_TABS.find(t => t.id === statusFilter)?.label}".
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
