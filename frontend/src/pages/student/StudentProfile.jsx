import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

const PRESET_DOMAINS = [
  'Full Stack Web Development',
  'Cloud Computing & DevOps',
  'AI & Machine Learning',
  'Data Science & Analytics',
  'Mobile Application Development',
  'Cybersecurity & Network Security',
  'Database Management & SQL',
  'Software Quality & Testing',
];

export default function StudentProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    course: 'MCA',
    institution: 'Gujarat Vidyapith',
    graduationYear: 2026,
    apparId: '',
    cgpa: '',
    backlogs: '0',
    address: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    experience: 'Fresher',
    skills: [],
    projects: [],
  });

  const [backupProfile, setBackupProfile] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [approvalStatus, setApprovalStatus] = useState('DRAFT');
  const [reviewRemarks, setReviewRemarks] = useState(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [newSkill, setNewSkill] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    projectUrl: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch both profile details and dashboard status to ensure zero stale metrics
      const [profRes, dashRes] = await Promise.allSettled([
        api.student.getProfile(),
        api.student.getDashboard(),
      ]);

      let d = null;
      if (profRes.status === 'fulfilled' && profRes.value?.data) {
        d = profRes.value.data;
      } else if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        d = dashRes.value.data.profile || dashRes.value.data;
      }

      if (d) {
        const mapped = {
          fullName: d.fullName || user?.fullName || '',
          email: d.email || user?.email || '',
          phone: d.phone || '',
          gender: d.gender || 'MALE',
          course: d.course || 'MCA',
          institution: d.institution || 'Gujarat Vidyapith',
          graduationYear: d.graduationYear || 2026,
          apparId: d.apparId || '',
          cgpa: d.cgpa !== null && d.cgpa !== undefined ? String(d.cgpa) : '',
          backlogs: d.backlogs !== null && d.backlogs !== undefined ? String(d.backlogs) : '0',
          address: d.address || '',
          linkedinUrl: d.linkedinUrl || '',
          githubUrl: d.githubUrl || '',
          portfolioUrl: d.address?.startsWith('http') ? d.address : '',
          experience: d.address?.includes('Exp:') ? d.address.split('Exp:')[1] : 'Fresher',
          skills: d.skills || [],
          projects: d.projects || [],
        };
        setProfile(mapped);
        setBackupProfile(mapped);
        setMissingFields(d.missingFields || (dashRes.status === 'fulfilled' ? dashRes.value?.data?.missingFields : []) || []);
        setCompletionPercentage(d.completionPercentage ?? (dashRes.status === 'fulfilled' ? dashRes.value?.data?.completionPercentage : 0) ?? 0);
        setApprovalStatus(d.approvalStatus || (dashRes.status === 'fulfilled' ? dashRes.value?.data?.approvalStatus : 'DRAFT') || 'DRAFT');
        setReviewRemarks(d.reviewRemarks || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Student Profile KYC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setProfile((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleStartEdit = () => {
    setBackupProfile({ ...profile });
    setFieldErrors({});
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (backupProfile) {
      setProfile({ ...backupProfile });
    }
    setFieldErrors({});
    setError(null);
    setIsEditing(false);
  };

  const handleSubmitForApproval = async () => {
    if (missingFields.length > 0 || completionPercentage < 100) {
      setError('Please complete all mandatory profile fields before submitting for Placement Officer verification.');
      return;
    }
    setSubmittingProfile(true);
    setError(null);
    try {
      const res = await api.student.submitProfile();
      if (res?.data) {
        setApprovalStatus(res.data.approvalStatus || 'SUBMITTED');
        setReviewRemarks(res.data.reviewRemarks || null);
      }
      setShowSuccess(true);
      await loadProfile();
    } catch (err) {
      setError(err.message || 'Failed to submit profile for officer verification.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleAddSkill = async (skillName) => {
    const trimmed = (skillName || newSkill).trim();
    if (!trimmed) return;

    const exists = profile.skills.some(
      (s) => (typeof s === 'string' ? s : s.name)?.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setNewSkill('');
      return;
    }

    try {
      await api.student.addSkill(trimmed).catch(() => null);
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setNewSkill('');
      if (fieldErrors.skills) {
        setFieldErrors((prev) => ({ ...prev, skills: null }));
      }
    } catch {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => (typeof s === 'string' ? s : s.name) !== skillToRemove),
    }));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) {
      setFieldErrors((prev) => ({ ...prev, projectTitle: 'Project title is mandatory' }));
      return;
    }

    try {
      const res = await api.student.addProject({
        title: newProject.title.trim(),
        description: newProject.description?.trim() || '',
        projectUrl: newProject.projectUrl?.trim() || '',
      });

      const added = res?.data || {
        id: `p-${Date.now()}`,
        title: newProject.title.trim(),
        description: newProject.description?.trim(),
        projectUrl: newProject.projectUrl?.trim(),
      };

      setProfile((prev) => ({
        ...prev,
        projects: [...prev.projects, added],
      }));
      setNewProject({ title: '', description: '', projectUrl: '' });
      if (fieldErrors.projects) {
        setFieldErrors((prev) => ({ ...prev, projects: null }));
      }
    } catch {
      setProfile((prev) => ({
        ...prev,
        projects: [
          ...prev.projects,
          {
            id: `p-${Date.now()}`,
            title: newProject.title.trim(),
            description: newProject.description?.trim(),
            projectUrl: newProject.projectUrl?.trim(),
          },
        ],
      }));
      setNewProject({ title: '', description: '', projectUrl: '' });
    }
  };

  const handleRemoveProject = async (projectId) => {
    try {
      await api.student.deleteProject(projectId).catch(() => null);
    } catch {}
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!profile.fullName?.trim()) {
      errors.fullName = 'Full Name is mandatory';
    }

    if (!profile.phone?.trim()) {
      errors.phone = 'Mobile Number is mandatory';
    } else if (!/^[0-9+ -]{8,15}$/.test(profile.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!profile.course?.trim()) {
      errors.course = 'Course / Discipline is mandatory';
    }

    if (!profile.institution?.trim()) {
      errors.institution = 'Institution is mandatory';
    }

    if (!profile.apparId?.trim()) {
      errors.apparId = 'ABC ID / APAAR ID is mandatory for academic verification';
    }

    if (profile.cgpa === '' || isNaN(Number(profile.cgpa))) {
      errors.cgpa = 'CGPA is mandatory';
    } else {
      const numCgpa = Number(profile.cgpa);
      if (numCgpa < 0 || numCgpa > 10) {
        errors.cgpa = 'CGPA must be between 0.0 and 10.0';
      }
    }

    if (profile.backlogs === '' || isNaN(Number(profile.backlogs)) || Number(profile.backlogs) < 0) {
      errors.backlogs = 'Active Backlogs count is mandatory (enter 0 if none)';
    }

    if (!profile.githubUrl?.trim()) {
      errors.githubUrl = 'GitHub Profile URL is mandatory';
    }

    if (!profile.linkedinUrl?.trim()) {
      errors.linkedinUrl = 'LinkedIn Profile URL is mandatory';
    }

    if (!profile.skills || profile.skills.length === 0) {
      errors.skills = 'Please add at least one Skill or Interest Domain';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      setError('Please resolve all highlighted errors before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const res = await api.student.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        gender: profile.gender,
        course: profile.course.trim(),
        institution: profile.institution.trim(),
        graduationYear: Number(profile.graduationYear) || 2026,
        apparId: profile.apparId.trim(),
        cgpa: Number(profile.cgpa),
        backlogs: Number(profile.backlogs) || 0,
        address: profile.portfolioUrl ? profile.portfolioUrl.trim() : `Exp:${profile.experience}`,
        linkedinUrl: profile.linkedinUrl.trim(),
        githubUrl: profile.githubUrl.trim(),
      });

      const updated = res?.data;
      if (updated) {
        setMissingFields(updated.missingFields || []);
        setCompletionPercentage(updated.completionPercentage ?? 100);
      }

      setBackupProfile({ ...profile });
      setIsEditing(false);
      setShowSuccess(true);

      // Invalidate cache and broadcast to all listening dashboard tabs/views
      window.dispatchEvent(new CustomEvent('student:profile-updated', { detail: updated }));
    } catch (err) {
      setError(err.message || 'Failed to update Student Profile KYC.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Student Profile KYC"
      breadcrumbs={[{ label: 'Student Workspace' }, { label: 'Student Profile KYC' }]}
    >
      {/* Success Popup Modal Matching Screenshot 2c1c4a48.png */}
      <Modal
        isOpen={showSuccess}
        title="Success"
        message={`Successfully updated profile for ${profile.fullName || user?.email}. All KYC details and standing are synchronized.`}
        type="success"
        confirmText="OK"
        onConfirm={() => setShowSuccess(false)}
      />

      {/* Profile Completion & Verification Summary Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid var(--gv-border)',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--gv-primary-brown)', fontWeight: 700 }}>
                {profile.fullName || 'Student Candidate'}
              </h2>
              {missingFields.length === 0 ? (
                <Badge status="ACTIVE" text="KYC VERIFIED & COMPLETE" />
              ) : (
                <span
                  style={{
                    backgroundColor: '#FFF3E0',
                    border: '1px solid #FFB74D',
                    color: '#E65100',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  ⚠️ {missingFields.length} REQUIREMENT{missingFields.length > 1 ? 'S' : ''} MISSING
                </span>
              )}
              {approvalStatus === 'APPROVED' && (
                <span style={{ backgroundColor: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                  ✓ OFFICER APPROVED
                </span>
              )}
              {approvalStatus === 'SUBMITTED' && (
                <span style={{ backgroundColor: '#E1F5FE', border: '1px solid #81D4FA', color: '#0277BD', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                  ⏳ PENDING OFFICER REVIEW
                </span>
              )}
              {approvalStatus === 'CHANGES_REQUESTED' && (
                <span style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF9A9A', color: '#C62828', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                  ⚠️ CHANGES REQUESTED
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--gv-text-subtle)' }}>
              Permanent Enrolment • ABC ID (APAAR):{' '}
              <strong style={{ fontFamily: 'monospace', color: 'var(--gv-primary-brown-dark)' }}>
                {profile.apparId || 'Pending Verification'}
              </strong>
            </p>
          </div>

          <div style={{ minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--gv-text-muted)' }}>Profile Completeness</span>
              <span style={{ fontWeight: 700, color: 'var(--gv-primary-brown)' }}>
                {completionPercentage}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#EDE7E3', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  backgroundColor: completionPercentage === 100 ? 'var(--gv-sage-green-dark)' : 'var(--gv-portal-cyan)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {missingFields.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: '#FFF8E1',
              border: '1px solid #FFE082',
              borderRadius: '4px',
              fontSize: '0.84rem',
              color: '#F57F17',
            }}
          >
            <strong>Pending Mandatory Fields:</strong> {missingFields.join(', ')}. Click <em>Edit Profile KYC</em> below to fulfill.
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#FFEBEE',
            border: '1.5px solid #EF5350',
            color: '#C62828',
            padding: '14px 18px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '0.9rem',
          }}
        >
          <strong>⚠️ Validation Notice:</strong> {error}
        </div>
      )}

      {/* ============================================================
          MODE 1: READ-ONLY VIEW (Default as requested by user)
          ============================================================ */}
      {!isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Candidate Identity & Contact KYC */}
          <Card title="Candidate Identity &amp; Contact KYC" watermark>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Full Candidate Name
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.fullName || <span style={{ color: '#E65100' }}>⚠️ Not Set</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Institutional / Registered Email
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.email || user?.email}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Primary Contact Number
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.phone || <span style={{ color: '#E65100' }}>⚠️ Missing</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Gender
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.gender || 'Not Specified'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ABC ID / APAAR ID (MANDATORY)
                </label>
                <div style={{ marginTop: '2px' }}>
                  {profile.apparId ? (
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        backgroundColor: '#FAF6F5',
                        border: '1px solid var(--gv-border)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        color: 'var(--gv-primary-brown-dark)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {profile.apparId}
                    </span>
                  ) : (
                    <span style={{ color: '#E65100', fontWeight: 600 }}>⚠️ Missing (Required for degree verification)</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Academic Standing */}
          <Card title="Academic Background &amp; Institutional Standing">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Enrolled Department / Program
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.course || 'MCA'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  University Institution
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.institution || 'Gujarat Vidyapith'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cumulative CGPA (Scale 10.0)
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gv-primary-brown)', marginTop: '2px' }}>
                  {profile.cgpa ? `${profile.cgpa} / 10.0` : <span style={{ color: '#E65100' }}>⚠️ Missing</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Academic Backlogs
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: Number(profile.backlogs) > 0 ? '#C62828' : '#2E7D32' }}>
                  {profile.backlogs} {Number(profile.backlogs) === 0 ? '(Clear Standing)' : 'Backlog(s)'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Graduation Batch Year
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '2px' }}>
                  {profile.graduationYear || '2026'}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Professional Portfolios & Links */}
          <Card title="Professional Profiles &amp; Web Repositories">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  LinkedIn Profile
                </label>
                <div style={{ marginTop: '4px' }}>
                  {profile.linkedinUrl ? (
                    <a
                      href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--gv-primary-brown)', fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}
                    >
                      🔗 {profile.linkedinUrl}
                    </a>
                  ) : (
                    <span style={{ color: '#E65100', fontSize: '0.88rem' }}>⚠️ Missing (Mandatory)</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  GitHub Profile / Organization
                </label>
                <div style={{ marginTop: '4px' }}>
                  {profile.githubUrl ? (
                    <a
                      href={profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--gv-primary-brown)', fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}
                    >
                      🐙 {profile.githubUrl}
                    </a>
                  ) : (
                    <span style={{ color: '#E65100', fontSize: '0.88rem' }}>⚠️ Missing (Mandatory)</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Experience / Standing Status
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gv-text-main)', marginTop: '4px' }}>
                  {profile.experience || 'Fresher'}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 4: Skills & Interest Domains */}
          <Card title="Candidate Skills &amp; Domain Areas">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((s, idx) => {
                  const name = typeof s === 'string' ? s : s.name;
                  return (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#FAF6F5',
                        border: '1px solid var(--gv-border)',
                        color: 'var(--gv-primary-brown-dark)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      ✦ {name}
                    </span>
                  );
                })
              ) : (
                <span style={{ color: '#E65100', fontSize: '0.88rem' }}>⚠️ No skills registered yet.</span>
              )}
            </div>
          </Card>

          {/* Section 5: Projects */}
          <Card title="Academic &amp; Applied Practical Projects">
            {profile.projects && profile.projects.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {profile.projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    style={{
                      border: '1px solid var(--gv-border)',
                      borderRadius: '6px',
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: 'var(--gv-primary-brown)' }}>
                      {proj.title}
                    </h4>
                    {proj.description && (
                      <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--gv-text-subtle)' }}>
                        {proj.description}
                      </p>
                    )}
                    {proj.projectUrl && (
                      <a
                        href={proj.projectUrl.startsWith('http') ? proj.projectUrl : `https://${proj.projectUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--gv-portal-cyan)', fontWeight: 600 }}
                      >
                        Project Link →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#E65100', fontSize: '0.88rem' }}>⚠️ No projects registered yet.</span>
            )}
          </Card>

          {/* Bottom Action Bar (Read-Only Mode) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '20px 24px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--gv-border)',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <strong style={{ display: 'block', color: 'var(--gv-primary-brown)', fontSize: '0.95rem' }}>
                Need to update your details or ABC ID?
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--gv-text-subtle)' }}>
                Only verified students may edit their placement KYC credentials.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to={ROUTES.STUDENT_RESUME} className="gv-btn gv-btn--secondary">
                📄 AI Resume Manager
              </Link>
              <button
                type="button"
                className="gv-btn gv-btn--primary"
                onClick={handleStartEdit}
                style={{ minWidth: '160px' }}
              >
                ✏️ Edit Profile KYC
              </button>
              {(approvalStatus === 'DRAFT' || approvalStatus === 'CHANGES_REQUESTED') && (
                <button
                  type="button"
                  className="gv-btn gv-btn--sage"
                  disabled={missingFields.length > 0 || completionPercentage < 100 || submittingProfile}
                  onClick={handleSubmitForApproval}
                  style={{ minWidth: '180px' }}
                  title={missingFields.length > 0 ? 'Complete all fields first' : 'Submit verified profile to Placement Officer'}
                >
                  {submittingProfile ? 'Submitting...' : 'Submit to Officer →'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================
           MODE 2: EDITABLE VIEW (Activated ONLY after clicking Edit)
           ============================================================ */
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#E0F7FA',
              border: '1.5px solid #26C6DA',
              borderRadius: '6px',
              color: '#006064',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>✏️ Edit Mode Active:</strong> Modify your academic credentials, contact info, or web links below.
            </div>
            <button
              type="button"
              className="gv-btn gv-btn--secondary gv-btn--sm"
              onClick={handleCancelEdit}
            >
              ✖ Discard &amp; Cancel
            </button>
          </div>

          {/* Section 1: Candidate Identity */}
          <Card title="Candidate Identity &amp; Contact KYC">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                {fieldErrors.fullName && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.fullName}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="fullName">
                  Full Candidate Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  className={`gv-input ${fieldErrors.fullName ? 'gv-input--error' : ''}`}
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Patel Rahul Kumar"
                />
              </div>

              <div>
                <label className="gv-form-label" htmlFor="email">
                  Registered Email Address (Locked)
                </label>
                <input
                  id="email"
                  type="email"
                  className="gv-input"
                  value={profile.email || user?.email}
                  disabled
                  style={{ backgroundColor: '#F0ECE9', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                {fieldErrors.phone && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.phone}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="phone">
                  Mobile Number <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`gv-input ${fieldErrors.phone ? 'gv-input--error' : ''}`}
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="10-digit Mobile Number"
                />
              </div>

              <div>
                <label className="gv-form-label" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  className="gv-input"
                  value={profile.gender}
                  onChange={handleChange}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                {fieldErrors.apparId && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.apparId}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="apparId">
                  ABC ID / APAAR ID (MANDATORY) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="apparId"
                  type="text"
                  className={`gv-input ${fieldErrors.apparId ? 'gv-input--error' : ''}`}
                  value={profile.apparId}
                  onChange={handleChange}
                  placeholder="12-digit Academic Bank of Credits ID"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Academic Standing */}
          <Card title="Academic Background &amp; Institutional Standing">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                {fieldErrors.course && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.course}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="course">
                  Education / Course <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  id="course"
                  className={`gv-input ${fieldErrors.course ? 'gv-input--error' : ''}`}
                  value={profile.course}
                  onChange={handleChange}
                >
                  <option value="MCA">Master of Computer Applications (MCA)</option>
                  <option value="BCA">Bachelor of Computer Applications (BCA)</option>
                  <option value="PGDCA">Post Graduate Diploma in Computer Applications (PGDCA)</option>
                  <option value="M.Sc IT">M.Sc. Information Technology</option>
                  <option value="MSW">Master of Social Work (MSW)</option>
                  <option value="MBA">Rural Management / MBA</option>
                  <option value="MA">Master of Arts</option>
                  <option value="BA">Bachelor of Arts</option>
                </select>
              </div>

              <div>
                {fieldErrors.institution && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.institution}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="institution">
                  Institution Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="institution"
                  type="text"
                  className={`gv-input ${fieldErrors.institution ? 'gv-input--error' : ''}`}
                  value={profile.institution}
                  onChange={handleChange}
                />
              </div>

              <div>
                {fieldErrors.cgpa && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.cgpa}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="cgpa">
                  Cumulative CGPA (0.0 to 10.0) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  className={`gv-input ${fieldErrors.cgpa ? 'gv-input--error' : ''}`}
                  value={profile.cgpa}
                  onChange={handleChange}
                  placeholder="e.g. 8.25"
                />
              </div>

              <div>
                {fieldErrors.backlogs && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.backlogs}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="backlogs">
                  Active Backlogs Count <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="backlogs"
                  type="number"
                  min="0"
                  className={`gv-input ${fieldErrors.backlogs ? 'gv-input--error' : ''}`}
                  value={profile.backlogs}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="gv-form-label" htmlFor="graduationYear">
                  Graduation Batch Year
                </label>
                <input
                  id="graduationYear"
                  type="number"
                  className="gv-input"
                  value={profile.graduationYear}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Professional Profiles & Links */}
          <Card title="Professional Profiles &amp; Web Repositories">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                {fieldErrors.linkedinUrl && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.linkedinUrl}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="linkedinUrl">
                  LinkedIn Profile URL <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="linkedinUrl"
                  type="url"
                  className={`gv-input ${fieldErrors.linkedinUrl ? 'gv-input--error' : ''}`}
                  value={profile.linkedinUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div>
                {fieldErrors.githubUrl && (
                  <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ {fieldErrors.githubUrl}
                  </div>
                )}
                <label className="gv-form-label" htmlFor="githubUrl">
                  GitHub Profile URL <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  id="githubUrl"
                  type="url"
                  className={`gv-input ${fieldErrors.githubUrl ? 'gv-input--error' : ''}`}
                  value={profile.githubUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />
              </div>

              <div>
                <label className="gv-form-label" htmlFor="portfolioUrl">
                  Portfolio / Personal Website URL (Optional)
                </label>
                <input
                  id="portfolioUrl"
                  type="url"
                  className="gv-input"
                  value={profile.portfolioUrl}
                  onChange={handleChange}
                  placeholder="https://myportfolio.dev"
                />
              </div>

              <div>
                <label className="gv-form-label" htmlFor="experience">
                  Experience Level
                </label>
                <select
                  id="experience"
                  className="gv-input"
                  value={profile.experience}
                  onChange={handleChange}
                >
                  <option value="Fresher">Fresher (Zero Industry Experience)</option>
                  <option value="Internship (3-6 Months)">Internship Experience (3-6 Months)</option>
                  <option value="Internship (6-12 Months)">Internship Experience (6-12 Months)</option>
                  <option value="1+ Year Full-Time">1+ Year Full-Time Experience</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Section 4: Skills & Interest Domains */}
          <Card title="Skills &amp; Interest Domains (Mandatory)">
            {fieldErrors.skills && (
              <div style={{ color: '#D32F2F', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                ⚠️ {fieldErrors.skills}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <input
                type="text"
                className="gv-input"
                placeholder="Enter skill (e.g. Java, React, Spring Boot, PostgreSQL)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <button
                type="button"
                className="gv-btn gv-btn--secondary"
                onClick={() => handleAddSkill()}
              >
                + Add Skill
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gv-text-subtle)', display: 'block', marginBottom: '6px' }}>
                Quick suggestions:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRESET_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => handleAddSkill(domain)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--gv-border)',
                      borderRadius: '16px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      color: 'var(--gv-primary-brown)',
                    }}
                  >
                    + {domain}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
              {profile.skills.map((s, idx) => {
                const name = typeof s === 'string' ? s : s.name;
                return (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#FAF6F5',
                      border: '1px solid var(--gv-border)',
                      color: 'var(--gv-primary-brown-dark)',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(name)}
                      style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </Card>

          {/* Section 5: Projects */}
          <Card title="Academic &amp; Practical Projects">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {profile.projects.map((proj, idx) => (
                <div
                  key={proj.id || idx}
                  style={{
                    border: '1px solid var(--gv-border)',
                    borderRadius: '6px',
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(proj.id)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#C62828',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ×
                  </button>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: 'var(--gv-primary-brown)' }}>
                    {proj.title}
                  </h4>
                  {proj.description && (
                    <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: 'var(--gv-text-subtle)' }}>
                      {proj.description}
                    </p>
                  )}
                  {proj.projectUrl && (
                    <a
                      href={proj.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--gv-portal-cyan)', fontWeight: 600 }}
                    >
                      Project Link →
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#FAF6F5', padding: '16px', borderRadius: '6px', border: '1px solid var(--gv-border)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--gv-primary-brown)' }}>
                Add New Project
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  className="gv-input"
                  placeholder="Project Title (e.g. Placement Setu Web Portal)"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
                <input
                  type="text"
                  className="gv-input"
                  placeholder="Brief description & tech stack used"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
                <input
                  type="url"
                  className="gv-input"
                  placeholder="GitHub / Live Demo URL"
                  value={newProject.projectUrl}
                  onChange={(e) => setNewProject({ ...newProject, projectUrl: e.target.value })}
                />
                <div style={{ textAlign: 'right' }}>
                  <button type="button" className="gv-btn gv-btn--secondary gv-btn--sm" onClick={handleAddProject}>
                    + Add Project to Profile
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Bottom Action Bar (Edit Mode) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '20px 24px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--gv-border)',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <button
              type="button"
              className="gv-btn gv-btn--secondary"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gv-btn gv-btn--primary"
              disabled={saving}
              style={{ minWidth: '180px' }}
            >
              {saving ? 'Saving...' : '💾 Save Profile Changes'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
