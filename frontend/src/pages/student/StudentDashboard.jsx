import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, resumeRes] = await Promise.allSettled([
        api.student.getDashboard(),
        api.resume.getMetadata(),
      ]);

      let hasResume = false;
      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        const d = dashRes.value.data;
        setDashboardData(d);
        const p = d.profile || d;
        setProfile(p);
        if (p.resumeUploaded) {
          hasResume = true;
        }
      }
      if (resumeRes.status === 'fulfilled' && resumeRes.value?.data) {
        setResumeMeta(resumeRes.value.data);
        if (resumeRes.value.data.fileName) {
          hasResume = true;
        }
      }

      // Check if student needs resume prompt on login
      const isDismissed = sessionStorage.getItem('ps_resume_prompt_dismissed');
      if (!hasResume && isDismissed !== 'true') {
        setShowResumePrompt(true);
      }
    } catch (err) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();

    // Re-fetch immediately when profile is saved or resume parsed anywhere in app
    const handleProfileUpdate = () => {
      fetchStudentData();
    };
    window.addEventListener('student:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('student:profile-updated', handleProfileUpdate);
  }, [fetchStudentData]);

  const missingFields = dashboardData?.missingFields || profile?.missingFields || [];
  const completionPercentage = dashboardData?.completionPercentage ?? profile?.completionPercentage ?? (missingFields.length === 0 ? 100 : Math.max(20, 100 - missingFields.length * 15));
  const isLocked = profile?.isPlacementLocked || profile?.placementLocked;
  const appliedCount = dashboardData?.totalAppliedDrives ?? 0;

  const handleDismissPromptToResume = () => {
    sessionStorage.setItem('ps_resume_prompt_dismissed', 'true');
    setShowResumePrompt(false);
    navigate(ROUTES.STUDENT_RESUME);
  };

  const handleDismissPromptToProfile = () => {
    sessionStorage.setItem('ps_resume_prompt_dismissed', 'true');
    setShowResumePrompt(false);
    navigate(ROUTES.STUDENT_PROFILE);
  };

  return (
    <DashboardLayout
      title="Academic & Placement Workspace"
      breadcrumbs={[{ label: 'Home' }]}
    >
      {/* 1. Mandatory First-Login Warning Popup (Matching Screenshot 2c1c4a48.png modal style) */}
      <Modal
        isOpen={showResumePrompt}
        title="Action Required: Upload Resume"
        type="warning"
        message="Welcome to Gujarat Vidyapith Placement Portal. Your profile is currently hidden from recruiters. Upload your resume to enable Gemini AI auto-parsing and activate campus placement applications."
        showCancel={true}
        cancelText="Fill Profile Manually"
        confirmText="Upload Resume Now →"
        onClose={handleDismissPromptToProfile}
        onConfirm={handleDismissPromptToResume}
      />

      {/* 2. Placement Lock / Status Alert Banner */}
      {isLocked ? (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            border: '1.5px solid #81C784',
            borderRadius: '6px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <strong style={{ color: '#2E7D32', fontSize: '1rem', display: 'block' }}>
              🎉 Placement Confirmed — "One Student One Job" Rule Active
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#1B5E20' }}>
              Congratulations! You are officially placed. As per Gujarat Vidyapith placement bylaws, secondary applications are locked unless applying to verified <strong>Dream Offers (≥ ₹8.0 LPA)</strong>.
            </p>
          </div>
          <Badge status="ACTIVE" text="PLACED & LOCKED" />
        </div>
      ) : missingFields.length > 0 ? (
        <div
          style={{
            backgroundColor: '#FFF3E0',
            border: '1.5px solid #FFB74D',
            borderRadius: '6px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <strong style={{ color: '#E65100', fontSize: '0.95rem' }}>
               Candidate Profile Incomplete — Not Visible to Recruiters
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#B26A00' }}>
              Missing requirements: <strong>{missingFields.join(', ')}</strong>. Complete your profile KYC or upload your resume to unlock campus applications.
            </p>
          </div>
          <Link to={ROUTES.STUDENT_PROFILE} className="gv-btn gv-btn--primary gv-btn--sm">
            Complete Profile KYC 
          </Link>
        </div>
      ) : null}

      {/* 3. Key Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '25px' }}>
        <StatCard
          label="Profile KYC Status"
          value={`${completionPercentage}%`}
          subtext={missingFields.length === 0 ? 'Verified & Complete' : `${missingFields.length} field(s) pending`}
          color="var(--gv-primary-brown)"
        />

        <StatCard
          label="Applications Submitted"
          value={appliedCount}
          subtext="Active Pipeline →"
          color="var(--gv-portal-cyan-dark)"
        />

        <StatCard
          label="Active Resume"
          value={resumeMeta?.fileName ? 'Uploaded' : 'None'}
          subtext={resumeMeta?.fileName ? resumeMeta.fileName : 'Upload PDF/DOCX for AI scan'}
          color="var(--gv-sage-green-dark)"
        />

        <StatCard
          label="Placement Status"
          value={isLocked ? 'Placed' : 'Eligible'}
          subtext={isLocked ? 'Locked (1 Offer Secured)' : 'Active Applicant'}
          color="#673AB7"
        />

        <StatCard
          label="Enrolled Department"
          value={profile?.course || 'MCA'}
          subtext={profile?.institution || 'Gujarat Vidyapith'}
          color="var(--gv-warm-taupe)"
        />
      </div>

      {/* 4. Watermark Overview Card (Matching ERP Screenshot c173f0c9.png) */}
      <Card title="Candidate Placement Summary" watermark>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div>
            <h4 style={{ color: 'var(--gv-primary-brown)', marginBottom: '8px' }}>Personal Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
              <div><strong>Full Name:</strong> {profile?.fullName || user?.email}</div>
              <div><strong>Registered Email:</strong> {user?.email}</div>
              <div><strong>Mobile Phone:</strong> {profile?.phone || <span style={{ color: '#E65100' }}> Missing</span>}</div>
              <div>
                <strong>LinkedIn:</strong>{' '}
                {profile?.linkedinUrl ? (
                  <a href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gv-primary-brown)', fontWeight: 600 }}>
                    {profile.linkedinUrl}
                  </a>
                ) : (
                  <span style={{ color: '#E65100', fontSize: '0.82rem' }}> Missing (Mandatory)</span>
                )}
              </div>
              <div>
                <strong>GitHub:</strong>{' '}
                {profile?.githubUrl ? (
                  <a href={profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gv-primary-brown)', fontWeight: 600 }}>
                    {profile.githubUrl}
                  </a>
                ) : (
                  <span style={{ color: '#E65100', fontSize: '0.82rem' }}> Missing (Mandatory)</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--gv-primary-brown)', marginBottom: '8px' }}>Academic Standing &amp; KYC</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
              <div><strong>Institution:</strong> {profile?.institution || 'Gujarat Vidyapith'}</div>
              <div><strong>Course:</strong> {profile?.course || 'MCA'}</div>
              <div>
                <strong>ABC ID (APAAR ID):</strong>{' '}
                {profile?.apparId ? (
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gv-primary-brown-dark)' }}>
                    {profile.apparId}
                  </span>
                ) : (
                  <span style={{ color: '#E65100', fontWeight: 600, fontSize: '0.82rem' }}>
                    Missing (Mandatory)
                  </span>
                )}
              </div>
              <div><strong>Current CGPA:</strong> {profile?.cgpa ? `${profile.cgpa} / 10.0` : <span style={{ color: '#E65100' }}>Not Set</span>}</div>
              <div><strong>Active Backlogs:</strong> {profile?.backlogs ?? 0}</div>
              <div><strong>Graduation Year:</strong> {profile?.graduationYear || '2026'}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to={ROUTES.STUDENT_PROFILE} className="gv-btn gv-btn--primary gv-btn--sm">
            Student Profile KYC 
          </Link>
          <Link to={ROUTES.STUDENT_APPLICATIONS} className="gv-btn gv-btn--cyan gv-btn--sm">
            My Applications Pipeline 
          </Link>
          <Link to={ROUTES.STUDENT_RESUME} className="gv-btn gv-btn--sage gv-btn--sm">
            AI Resume Parser 
          </Link>
          <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--secondary gv-btn--sm">
            Browse Campus Drives
          </Link>
        </div>
      </Card>
    </DashboardLayout>
  );
}
