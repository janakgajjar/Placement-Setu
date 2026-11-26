import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

const PIPELINE_STEPS = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
  { key: 'SELECTED', label: 'Selected / Offer' },
];

function getStepIndex(status) {
  switch (status) {
    case 'APPLIED':
      return 0;
    case 'UNDER_REVIEW':
      return 1;
    case 'SHORTLISTED':
      return 2;
    case 'INTERVIEW_SCHEDULED':
      return 3;
    case 'SELECTED':
      return 4;
    case 'REJECTED':
      return 4; // terminal
    case 'WITHDRAWN':
      return -1; // special
    default:
      return 0;
  }
}

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [withdrawingApp, setWithdrawingApp] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [processingWithdraw, setProcessingWithdraw] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);

  const fetchApplicationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appsRes, sumRes] = await Promise.allSettled([
        api.application.getMyApplications(),
        api.application.getMySummary(),
      ]);

      if (appsRes.status === 'fulfilled' && appsRes.value?.data) {
        setApplications(appsRes.value.data);
      }
      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load placement applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsData();
  }, []);

  const handleConfirmWithdraw = async () => {
    if (!withdrawingApp) return;

    setProcessingWithdraw(true);
    try {
      await api.application.withdraw(withdrawingApp.id);
      setSuccessMessage(`Application for ${withdrawingApp.jobTitle} at ${withdrawingApp.companyName} has been withdrawn.`);
      setWithdrawingApp(null);
      setShowSuccessModal(true);
      await fetchApplicationsData();
    } catch (err) {
      setError(err.message || 'Failed to withdraw application.');
    } finally {
      setProcessingWithdraw(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') {
      return ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status);
    }
    if (activeFilter === 'SHORTLISTED_INTERVIEW') {
      return ['SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status);
    }
    if (activeFilter === 'SELECTED') return app.status === 'SELECTED';
    if (activeFilter === 'REJECTED_WITHDRAWN') {
      return ['REJECTED', 'WITHDRAWN'].includes(app.status);
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPLIED':
        return <Badge status="INFO" text="APPLICATION SUBMITTED" />;
      case 'UNDER_REVIEW':
        return <Badge status="PENDING" text="UNDER REVIEW" />;
      case 'SHORTLISTED':
        return (
          <span style={{ backgroundColor: '#EDE7F6', color: '#512DA8', border: '1px solid #D1C4E9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
            ★ SHORTLISTED
          </span>
        );
      case 'INTERVIEW_SCHEDULED':
        return (
          <span style={{ backgroundColor: '#E0F7FA', color: '#00838F', border: '1px solid #80DEEA', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
            🗓 INTERVIEW SCHEDULED
          </span>
        );
      case 'SELECTED':
        return <Badge status="ACTIVE" text="🎉 SELECTED / OFFERED" />;
      case 'REJECTED':
        return <Badge status="REJECTED" text="NOT SHORTLISTED" />;
      case 'WITHDRAWN':
        return <Badge status="INACTIVE" text="WITHDRAWN" />;
      default:
        return <Badge status="INFO" text={status} />;
    }
  };

  return (
    <DashboardLayout
      title="Application Tracking Pipeline"
      breadcrumbs={[{ label: 'Student Workspace' }, { label: 'My Applications' }]}
    >
      {/* Success Popup Modal Matching Screenshot 2c1c4a48.png */}
      <Modal
        isOpen={showSuccessModal}
        title="Success"
        message={successMessage}
        type="success"
        confirmText="OK"
        onConfirm={() => setShowSuccessModal(false)}
      />

      {/* Confirmation Modal for Application Withdrawal */}
      {withdrawingApp && (
        <Modal
          isOpen={Boolean(withdrawingApp)}
          title="Withdraw Placement Application"
          maxWidth={500}
          showCancel={true}
          cancelText="Keep Application"
          confirmText={processingWithdraw ? 'Withdrawing...' : 'Yes, Withdraw Application'}
          onClose={() => setWithdrawingApp(null)}
          onConfirm={handleConfirmWithdraw}
        >
          <div style={{ fontSize: '0.88rem', color: 'var(--gv-text-main)' }}>
            <p>
              Are you sure you want to withdraw your application for{' '}
              <strong>{withdrawingApp.jobTitle}</strong> at <strong>{withdrawingApp.companyName}</strong>?
            </p>
            <div style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFE082', padding: '12px', borderRadius: '4px', color: '#B26A00', fontSize: '0.82rem' }}>
              ⚠️ You may re-apply before the registration deadline if you change your mind, subject to corporate eligibility criteria.
            </div>
          </div>
        </Modal>
      )}

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1.5px solid #EF5350', color: '#C62828', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 1. Summary Metric Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          label="Total Applied"
          value={summary?.totalApplied ?? applications.length}
          subtext="Placement Drives"
          color="var(--gv-primary-brown)"
        />
        <StatCard
          label="Under Review"
          value={summary?.underReview ?? 0}
          subtext="Recruiter Screening"
          color="var(--gv-portal-cyan-dark)"
        />
        <StatCard
          label="Shortlisted"
          value={summary?.shortlisted ?? 0}
          subtext="Cleared Round 1"
          color="#673AB7"
        />
        <StatCard
          label="Interviews"
          value={summary?.interviewScheduled ?? 0}
          subtext="Scheduled Rounds"
          color="#00838F"
        />
        <StatCard
          label="Offers Extended"
          value={summary?.selected ?? 0}
          subtext="Selected"
          color="var(--gv-sage-green-dark)"
        />
      </div>

      {/* 2. Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid var(--gv-border)', paddingBottom: '12px' }}>
        {[
          { key: 'ALL', label: `All Applications (${applications.length})` },
          { key: 'ACTIVE', label: 'Active Pipeline' },
          { key: 'SHORTLISTED_INTERVIEW', label: 'Shortlisted & Interviews' },
          { key: 'SELECTED', label: `Offers (${summary?.selected ?? 0})` },
          { key: 'REJECTED_WITHDRAWN', label: 'Withdrawn / Concluded' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: activeFilter === tab.key ? '2px solid var(--gv-primary-brown)' : '1px solid var(--gv-border)',
              backgroundColor: activeFilter === tab.key ? 'var(--gv-primary-brown)' : '#FFFFFF',
              color: activeFilter === tab.key ? '#FFFFFF' : 'var(--gv-primary-brown)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Applications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--gv-text-subtle)' }}>
          Loading application records...
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card title="No Applications Found">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💼</div>
            <h3 style={{ color: 'var(--gv-primary-brown)', margin: '0 0 8px' }}>
              No placement applications under this filter
            </h3>
            <p style={{ color: 'var(--gv-text-subtle)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Explore upcoming verified campus drives from Gujarat Vidyapith recruiting partners and submit your profile.
            </p>
            <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--primary">
              Browse Active Drives →
            </Link>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredApplications.map((app) => {
            const currentIdx = getStepIndex(app.status);
            const isTerminalNegative = app.status === 'REJECTED';
            const isWithdrawn = app.status === 'WITHDRAWN';
            const canWithdraw = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status);

            return (
              <div
                key={app.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--gv-border)',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--gv-primary-brown)', fontWeight: 700 }}>
                        {app.jobTitle}
                      </h3>
                      <span
                        style={{
                          backgroundColor: '#FAF6F5',
                          border: '1px solid var(--gv-border)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--gv-text-muted)',
                        }}
                      >
                        {app.driveType?.replace('_', ' ') || 'FULL TIME'}
                      </span>
                    </div>

                    <div style={{ marginTop: '4px', fontSize: '0.9rem', color: 'var(--gv-text-main)', fontWeight: 600 }}>
                      🏢 {app.companyName}
                    </div>

                    <div style={{ marginTop: '4px', fontSize: '0.82rem', color: 'var(--gv-text-subtle)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>📍 {app.location || 'Ahmedabad, Gujarat'}</span>
                      {app.ctc && <span>💰 ₹{app.ctc} LPA</span>}
                      {app.stipend && <span>💵 Stipend: ₹{app.stipend}/mo</span>}
                      <span>📅 Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {getStatusBadge(app.status)}
                    {app.withdrawnAt && (
                      <span style={{ fontSize: '0.75rem', color: '#757575' }}>
                        Withdrawn on {new Date(app.withdrawnAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Visual Pipeline Progress Stepper */}
                <div style={{ margin: '24px 0 20px', padding: '16px 20px', backgroundColor: '#FAF6F5', borderRadius: '6px', border: '1px solid var(--gv-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', fontWeight: 700 }}>
                    Application Tracking Pipeline
                  </div>

                  {isWithdrawn ? (
                    <div style={{ padding: '8px 12px', backgroundColor: '#EEEEEE', borderRadius: '4px', fontSize: '0.85rem', color: '#616161' }}>
                      ⛔ This application was withdrawn by you. You may re-apply before the registration window closes.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_STEPS.length}, 1fr)`, gap: '8px', position: 'relative' }}>
                      {PIPELINE_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentIdx || (idx === currentIdx && app.status === 'SELECTED');
                        const isCurrent = idx === currentIdx && app.status !== 'SELECTED' && !isTerminalNegative;
                        const isFailedTerminal = idx === 4 && isTerminalNegative;

                        return (
                          <div key={step.key} style={{ textAlign: 'center', position: 'relative' }}>
                            {/* Step Indicator Dot */}
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                margin: '0 auto 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                backgroundColor: isFailedTerminal
                                  ? '#D32F2F'
                                  : isCompleted
                                  ? 'var(--gv-sage-green-dark)'
                                  : isCurrent
                                  ? 'var(--gv-portal-cyan)'
                                  : '#E0E0E0',
                                color: isCompleted || isCurrent || isFailedTerminal ? '#FFFFFF' : '#757575',
                                boxShadow: isCurrent ? '0 0 0 3px rgba(23,162,184,0.3)' : 'none',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {isFailedTerminal ? '✕' : isCompleted ? '✓' : idx + 1}
                            </div>

                            {/* Step Label */}
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: isCurrent || isCompleted ? 700 : 500,
                                color: isFailedTerminal
                                  ? '#D32F2F'
                                  : isCurrent
                                  ? 'var(--gv-portal-cyan-dark)'
                                  : isCompleted
                                  ? 'var(--gv-primary-brown)'
                                  : 'var(--gv-text-subtle)',
                              }}
                            >
                              {idx === 4 && isTerminalNegative ? 'Not Selected' : step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action Bar & Audit History Expander */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(expandedHistoryId === app.id ? null : app.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gv-primary-brown)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {expandedHistoryId === app.id ? '▼ Hide Audit Log' : '▶ View Status History & Remarks'}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {canWithdraw && (
                      <button
                        type="button"
                        className="gv-btn gv-btn--secondary gv-btn--sm"
                        onClick={() => setWithdrawingApp(app)}
                        style={{ color: '#C62828' }}
                      >
                        Withdraw Application
                      </button>
                    )}
                    <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--secondary gv-btn--sm">
                      View Drive Details
                    </Link>
                  </div>
                </div>

                {/* Audit History Timeline Drawer */}
                {expandedHistoryId === app.id && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--gv-border)', fontSize: '0.84rem' }}>
                    <h5 style={{ margin: '0 0 10px', color: 'var(--gv-primary-brown)' }}>
                      Audit History Log:
                    </h5>
                    {app.history && app.history.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {app.history.map((hist) => (
                          <div
                            key={hist.id}
                            style={{
                              backgroundColor: '#FAF6F5',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <strong>{hist.toStatus?.replace('_', ' ')}</strong>
                              {hist.fromStatus && (
                                <span style={{ color: 'var(--gv-text-subtle)', marginLeft: '6px' }}>
                                  (from {hist.fromStatus.replace('_', ' ')})
                                </span>
                              )}
                              {hist.remarks && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--gv-text-main)', marginTop: '2px' }}>
                                  Remarks: {hist.remarks}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)' }}>
                              By: {hist.changedByName} • {new Date(hist.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--gv-text-subtle)', fontSize: '0.8rem' }}>
                        No audit history entries recorded.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
