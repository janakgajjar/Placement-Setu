import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InstitutionalTopBar from '../components/layout/InstitutionalTopBar';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SocialPill from '../components/layout/SocialPill';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/routes';
import api from '../lib/api';

export default function DrivesExplorer() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [filter, setFilter] = useState('ALL'); // ALL, FULL_TIME, PAID_INTERNSHIP
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);

  // Student Profile state for eligibility checks
  const [studentProfile, setStudentProfile] = useState(null);

  // Application States: strictly scoped per logged-in Student user, cleared on role change or logout
  const [appliedDriveIds, setAppliedDriveIds] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'STUDENT' && user?.id) {
      try {
        const stored = localStorage.getItem(`ps_applied_drives_${user.id}`);
        setAppliedDriveIds(stored ? JSON.parse(stored) : []);
      } catch {
        setAppliedDriveIds([]);
      }
    } else {
      // Clear immediately on logout, unauthenticated view, or role change to Officer/Admin/Company
      setAppliedDriveIds([]);
    }
  }, [isAuthenticated, user?.id, user?.role]);

  const [selectedDrive, setSelectedDrive] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nonStudentNotice, setNonStudentNotice] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState(null);

  // Sample seed drives aligned with Gujarat Vidyapith departments if backend has no active drives yet
  const fallbackDrives = [
    {
      id: 'd1',
      jobTitle: 'Junior Software Engineer (Full Stack)',
      companyName: 'Tata Consultancy Services (TCS)',
      location: 'Gandhinagar / Ahmedabad',
      driveType: 'FULL_TIME',
      ctc: 450000,
      stipend: null,
      requiredCourse: 'MCA',
      minimumCgpa: 6.5,
      isDreamOffer: false,
      status: 'PUBLISHED',
      vacancies: 15,
      skills: ['Java', 'Spring Boot', 'React', 'SQL'],
    },
    {
      id: 'd2',
      jobTitle: 'Graduate Technology Trainee (Paid Internship)',
      companyName: 'Infosys Limited',
      location: 'Ahmedabad (Gift City)',
      driveType: 'PAID_INTERNSHIP',
      ctc: null,
      stipend: 18000,
      requiredCourse: 'MCA',
      minimumCgpa: 7.0,
      isDreamOffer: false,
      status: 'PUBLISHED',
      vacancies: 8,
      skills: ['Python', 'Cloud Computing', 'SQL'],
    },
    {
      id: 'd3',
      jobTitle: 'Associate Rural Development Officer',
      companyName: 'Aga Khan Rural Support Programme (AKRSP)',
      location: 'Patan / Mehsana',
      driveType: 'FULL_TIME',
      ctc: 380000,
      stipend: null,
      requiredCourse: 'Rural Management / MSW',
      minimumCgpa: 6.0,
      isDreamOffer: false,
      status: 'PUBLISHED',
      vacancies: 10,
      skills: ['Field Research', 'Community Mobilization', 'Reporting'],
    },
    {
      id: 'd4',
      jobTitle: 'Senior Cloud Consultant (Dream Offer)',
      companyName: 'Amazon Web Services (AWS)',
      location: 'Ahmedabad / Remote',
      driveType: 'FULL_TIME',
      ctc: 950000,
      stipend: null,
      requiredCourse: 'MCA',
      minimumCgpa: 8.0,
      isDreamOffer: true,
      status: 'PUBLISHED',
      vacancies: 4,
      skills: ['AWS', 'Docker', 'Linux', 'Distributed Systems'],
    },
  ];

  useEffect(() => {
    async function loadDrives() {
      try {
        setLoading(true);
        const res = await api.public.getDrives('?page=0&size=50').catch(() => null);
        if (res?.data?.content && res.data.content.length > 0) {
          setDrives(res.data.content);
        } else {
          setDrives(fallbackDrives);
        }
      } catch {
        setDrives(fallbackDrives);
      } finally {
        setLoading(false);
      }
    }
    loadDrives();
  }, []);

  // Fetch student profile if authenticated as student
  useEffect(() => {
    if (isAuthenticated && user?.role === 'STUDENT') {
      api.student
        .getProfile()
        .then((res) => {
          if (res?.data) {
            setStudentProfile(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  const handleApplyClick = (drive) => {
    if (!isAuthenticated) {
      // Direct unauthenticated users to login, keeping destination in redirect param
      navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`, {
        state: { message: 'Please login to continue' },
      });
      return;
    }

    if (user?.role !== 'STUDENT') {
      setNonStudentNotice(true);
      return;
    }

    setSelectedDrive(drive);
    setApplyError(null);
    setShowApplyModal(true);
  };

  const handleConfirmApplication = async () => {
    if (!selectedDrive) return;
    setSubmittingApply(true);
    setApplyError(null);

    try {
      if (selectedDrive.id && !String(selectedDrive.id).startsWith('d-')) {
        await api.application.apply(selectedDrive.id);
      }
      if (user?.role === 'STUDENT' && user?.id) {
        const updated = [...new Set([...appliedDriveIds, selectedDrive.id])];
        setAppliedDriveIds(updated);
        try {
          localStorage.setItem(`ps_applied_drives_${user.id}`, JSON.stringify(updated));
        } catch {}
      }
      setShowApplyModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End'];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      setSearchError(null);
      return;
    }

    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
      setSearchError('Only alphabets (A-Z, a-z) and spaces are allowed).');
      return;
    }

    if (search.length >= 25 && e.key.length === 1 && !e.ctrlKey) {
      e.preventDefault();
      setSearchError('Maximum 25 characters allowed.');
      return;
    }

    setSearchError(null);
  };

  const handleSearchChange = (e) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s]/g, '').slice(0, 25);
    if (raw !== sanitized) {
      setSearchError('Only alphabets are permitted. Non-alphabetic characters were removed.');
    } else {
      setSearchError(null);
    }
    setSearch(sanitized);
  };

  const isLocked = studentProfile?.placementLocked || studentProfile?.isPlacementLocked;
  const isOneStudentLockActive = isLocked && selectedDrive && !selectedDrive.isDreamOffer;

  const filteredDrives = drives.filter((d) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'FULL_TIME' && d.driveType === 'FULL_TIME') ||
      (filter === 'PAID_INTERNSHIP' && (d.driveType === 'PAID_INTERNSHIP' || d.driveType === 'INTERNSHIP_TO_PPO'));

    const matchesSearch =
      d.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
      d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      d.requiredCourse?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      {/* Non-student Role Modal */}
      <Modal
        isOpen={nonStudentNotice}
        title="Candidate Application Restricted"
        type="warning"
        message="Job applications are restricted to verified Student accounts. Company and Placement Officer accounts can review or manage drives in their respective portals."
        confirmText="Understood"
        onConfirm={() => setNonStudentNotice(false)}
      />

      {/* Application Confirmation Modal */}
      {selectedDrive && (
        <Modal
          isOpen={showApplyModal}
          title={`Apply for ${selectedDrive.jobTitle}`}
          maxWidth={540}
          showCancel={true}
          cancelText="Back to Drives"
          confirmText={submittingApply ? 'Submitting...' : isOneStudentLockActive ? 'Locked by Bylaws' : 'Submit Application →'}
          onConfirm={isOneStudentLockActive ? () => setShowApplyModal(false) : handleConfirmApplication}
          onClose={() => setShowApplyModal(false)}
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--gv-text-main)' }}>
            {applyError && (
              <div style={{ backgroundColor: '#FFEBEE', border: '1.5px solid #EF5350', color: '#C62828', padding: '10px 14px', borderRadius: '4px', marginBottom: '14px', fontSize: '0.84rem' }}>
                <strong>Application Failed:</strong> {applyError}
              </div>
            )}
            <div style={{ backgroundColor: '#FAF6F5', padding: '16px', borderRadius: '6px', border: '1px solid var(--gv-border)', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gv-primary-brown)', marginBottom: '4px' }}>
                {selectedDrive.companyName}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gv-text-muted)', marginBottom: '8px' }}>
                {selectedDrive.location || 'Gujarat'} &nbsp;|&nbsp; 🎓 Target Course: <strong>{selectedDrive.requiredCourse || 'Open to All'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                {selectedDrive.ctc && (
                  <span style={{ color: 'var(--gv-primary-brown-dark)', fontWeight: 700 }}>
                     CTC: ₹{(selectedDrive.ctc / 100000).toFixed(1)} LPA
                  </span>
                )}
                {selectedDrive.stipend && (
                  <span style={{ color: 'var(--gv-sage-green-dark)', fontWeight: 700 }}>
                     Stipend: ₹{selectedDrive.stipend.toLocaleString()}/month
                  </span>
                )}
                <span> Min CGPA: <strong>{selectedDrive.minimumCgpa ? `${selectedDrive.minimumCgpa} / 10` : 'No Bar'}</strong></span>
              </div>
            </div>

            {/* Bylaw / Lock Alert */}
            {isOneStudentLockActive ? (
              <div style={{ backgroundColor: '#FFEBEE', border: '1.5px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.84rem' }}>
                <strong>⛔ Application Locked by Placement Bylaws:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  You have already secured a placement offer. Under Gujarat Vidyapith's "One Student One Job" rule, secondary applications are locked unless applying to a verified <strong>Dream Offer (≥ ₹8.0 LPA)</strong>.
                </p>
              </div>
            ) : selectedDrive.isDreamOffer ? (
              <div style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082', color: '#B26A00', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem' }}>
                ⭐ <strong>Dream Offer Opportunity:</strong> This drive offers ₹8+ LPA and is exempt from standard placement locks.
              </div>
            ) : null}

            {/* Applicant Summary */}
            <div style={{ fontSize: '0.82rem', color: 'var(--gv-text-muted)', lineHeight: 1.5 }}>
              <div><strong>Applicant:</strong> {studentProfile?.fullName || user?.email}</div>
              <div><strong>Academic Institution:</strong> Gujarat Vidyapith</div>
              <div><strong>Recorded CGPA:</strong> {studentProfile?.cgpa ? `${studentProfile.cgpa} / 10` : 'Not Set'}</div>
              <p style={{ marginTop: '10px', color: 'var(--gv-text-subtle)' }}>
                By submitting this application, your verified KYC profile, Academic Bank of Credits (ABC ID), and parsed resume will be forwarded to the company recruiter and Gujarat Vidyapith placement cell.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Application Success Modal (Matching Screenshot 2c1c4a48.png) */}
      <Modal
        isOpen={showSuccessModal}
        title="Application Submitted!"
        message={`Successfully applied for ${selectedDrive?.jobTitle || 'Placement Drive'} at ${selectedDrive?.companyName || 'Corporate Partner'}. Your application has been logged with Gujarat Vidyapith Placement Cell.`}
        type="success"
        confirmText="Track in My Applications →"
        onConfirm={() => {
          setShowSuccessModal(false);
          setSelectedDrive(null);
          navigate(ROUTES.STUDENT_APPLICATIONS);
        }}
      />

      <div>
        <section
          style={{
            backgroundColor: 'var(--gv-primary-brown-dark)',
            color: '#FFFFFF',
            padding: '45px 0',
            borderBottom: '4px solid var(--gv-sage-green)',
          }}
        >
          <div className="gv-container">
            <div style={{ fontSize: '0.82rem', color: 'var(--gv-linen)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Home | Campus Recruitment Drives
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
              Placement Opportunities &amp; Drives
            </h1>
            <p style={{ color: '#E2D9D2', marginTop: '8px', fontSize: '1rem' }}>
              Browse verified corporate and developmental recruitment drives for Gujarat Vidyapith candidates.
            </p>
          </div>
        </section>

        <section className="gv-section gv-section--sand">
          <div className="gv-container">
            {/* Search & Filter Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid var(--gv-border)',
                marginBottom: '30px',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                {searchError && (
                  <div
                    className="gv-form-error"
                    style={{
                      fontSize: '0.8rem',
                      color: '#D32F2F',
                      fontWeight: 600,
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>⚠️</span>
                    <span>{searchError}</span>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="🔍 Search drives (Alphabets only, max 25 chars)..."
                  value={search}
                  maxLength={25}
                  onKeyDown={handleSearchKeyDown}
                  onChange={handleSearchChange}
                  className={`gv-input ${searchError ? 'gv-input--error' : ''}`}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`gv-btn gv-btn--sm ${filter === 'ALL' ? 'gv-btn--primary' : 'gv-btn--secondary'}`}
                  onClick={() => setFilter('ALL')}
                >
                  All Opportunities ({drives.length})
                </button>
                <button
                  type="button"
                  className={`gv-btn gv-btn--sm ${filter === 'FULL_TIME' ? 'gv-btn--primary' : 'gv-btn--secondary'}`}
                  onClick={() => setFilter('FULL_TIME')}
                >
                  Full-Time Careers
                </button>
              </div>
            </div>

            {/* Drives Grid */}
            <div className="gv-card-grid">
              {filteredDrives.map((drive) => {
                const isApplied = appliedDriveIds.includes(drive.id);

                return (
                  <article key={drive.id} className="gv-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <Badge status={drive.status} />
                      {drive.isDreamOffer && (
                        <span
                          style={{
                            backgroundColor: '#FFF8E1',
                            color: '#F57F17',
                            border: '1px solid #FFE082',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          ⭐ Dream Offer
                        </span>
                      )}
                    </div>

                    <h3 className="gv-card__title" style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
                      {drive.jobTitle}
                    </h3>

                    <p style={{ fontWeight: 600, color: 'var(--gv-primary-brown)', marginBottom: '8px' }}>
                      {drive.companyName || 'Verified Corporate Partner'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--gv-text-muted)', marginBottom: '16px' }}>
                      <div> <strong>Location:</strong> {drive.location || 'Gujarat'}</div>
                      <div> <strong>Target Course:</strong> {drive.requiredCourse || 'Open to All'}</div>
                      <div> <strong>Min CGPA:</strong> {drive.minimumCgpa ? `${drive.minimumCgpa} / 10` : 'No Bar'}</div>
                      {drive.ctc && (
                        <div style={{ color: 'var(--gv-primary-brown-dark)', fontWeight: 700 }}>
                           <strong>CTC Package:</strong> ₹{(drive.ctc / 100000).toFixed(1)} LPA
                        </div>
                      )}
                      {drive.stipend && (
                        <div style={{ color: 'var(--gv-sage-green-dark)', fontWeight: 700 }}>
                           <strong>Monthly Stipend:</strong> ₹{drive.stipend.toLocaleString()}/month
                        </div>
                      )}
                    </div>

                    {drive.skills && drive.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                        {drive.skills.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#EFE8DD',
                              color: 'var(--gv-primary-brown)',
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: 600,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="gv-card__footer">
                      <span>👥 {drive.vacancies || 5} Vacancies</span>
                      {/* Role-Specific Actions: Officer/Admin must NEVER see student-specific buttons */}
                      {isAuthenticated && (user?.role === 'PLACEMENT_OFFICER' || user?.role === 'ADMIN') ? (
                        <button
                          type="button"
                          className="gv-btn gv-btn--secondary gv-btn--sm"
                          onClick={() => navigate(ROUTES.OFFICER_DASHBOARD)}
                          title="Review drives in Placement Officer Desk"
                        >
                          Officer Desk →
                        </button>
                      ) : isAuthenticated && user?.role === 'COMPANY' ? (
                        <button
                          type="button"
                          className="gv-btn gv-btn--secondary gv-btn--sm"
                          onClick={() => navigate(ROUTES.COMPANY_DRIVES)}
                          title="Manage company drives"
                        >
                          Manage Drives →
                        </button>
                      ) : isApplied ? (
                        <span
                          style={{
                            backgroundColor: '#E8F5E9',
                            color: '#2E7D32',
                            border: '1px solid #81C784',
                            padding: '5px 12px',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          ✓ Applied
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="gv-btn gv-btn--primary gv-btn--sm"
                          onClick={() => handleApplyClick(drive)}
                        >
                          Apply via Portal →
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredDrives.length === 0 && (
              <div style={{ backgroundColor: '#FFFFFF', padding: '40px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--gv-border)' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--gv-text-muted)' }}>
                  No placement drives matched your search criteria.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
