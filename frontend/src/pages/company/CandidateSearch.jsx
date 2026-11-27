import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

const POPULAR_SKILLS = [
  'Java', 'Spring Boot', 'Python', 'React', 'Node.js',
  'JavaScript', 'TypeScript', 'SQL', 'PostgreSQL', 'Docker',
  'Kubernetes', 'AWS', 'Tailwind CSS', 'C++', 'Git'
];

const COURSES = [
  'All Courses',
  'Master of Computer Applications (MCA)',
  'M.Sc. Information Technology',
  'Bachelor of Computer Applications (BCA)',
  'B.Sc. Computer Science',
  'Post Graduate Diploma in Computer Applications (PGDCA)'
];

export default function CandidateSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const driveIdParam = searchParams.get('driveId');

  // Filter States
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [maxBacklogs, setMaxBacklogs] = useState('');

  // Data States
  const [candidates, setCandidates] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Drive details (if in Drive Match mode)
  const [driveDetails, setDriveDetails] = useState(null);

  // Feedback modal
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Drive Details if driveId present
  useEffect(() => {
    if (driveIdParam) {
      api.company.getDrive(driveIdParam)
        .then((res) => {
          if (res?.data) {
            setDriveDetails(res.data);
          }
        })
        .catch((err) => console.warn('Could not load drive info:', err));
    } else {
      setDriveDetails(null);
    }
  }, [driveIdParam]);

  // Load Candidates
  const loadCandidates = async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      if (driveIdParam) {
        // Mode 1: Drive Matched & Ranked
        const res = await api.company.getDriveCandidates(driveIdParam, `?page=${page}&size=10`);
        if (res?.data) {
          setCandidates(res.data.content || []);
          setTotalElements(res.data.totalElements || 0);
          setTotalPages(res.data.totalPages || 0);
          setCurrentPage(page);
        }
      } else {
        // Mode 2: Multi-criteria Search
        const params = new URLSearchParams();
        if (selectedSkills.length > 0) params.append('skills', selectedSkills.join(','));
        if (selectedCourse && selectedCourse !== 'All Courses') params.append('course', selectedCourse);
        if (minCgpa) params.append('minCgpa', minCgpa);
        if (maxBacklogs !== '') params.append('maxBacklogs', maxBacklogs);
        params.append('page', page);
        params.append('size', 10);

        const res = await api.company.searchCandidates(`?${params.toString()}`);
        if (res?.data) {
          setCandidates(res.data.content || []);
          setTotalElements(res.data.totalElements || 0);
          setTotalPages(res.data.totalPages || 0);
          setCurrentPage(page);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch candidate profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates(0);
  }, [driveIdParam, selectedSkills, selectedCourse, minCgpa, maxBacklogs]);

  // Skill Chip toggles
  const handleToggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = (e) => {
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setCustomSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleResetFilters = () => {
    setSelectedSkills([]);
    setSelectedCourse('');
    setMinCgpa('');
    setMaxBacklogs('');
    if (driveIdParam) {
      setSearchParams({});
    }
  };

  // Shortlist action
  const handleShortlist = async (candidate) => {
    if (!candidate.applicationId) {
      alert('This candidate has not applied to this drive yet.');
      return;
    }
    try {
      setActionLoading(true);
      await api.application.updateStatus(candidate.applicationId, {
        status: 'SHORTLISTED',
        remarks: 'Candidate shortlisted by recruiter based on drive match profile',
      });
      setFeedback(`Candidate "${candidate.fullName}" has been successfully SHORTLISTED for this placement drive.`);
      await loadCandidates(currentPage);
    } catch (err) {
      alert(err.message || 'Failed to shortlist candidate');
    } finally {
      setActionLoading(false);
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' };
    if (score >= 50) return { bg: '#FFF8E1', text: '#E65100', border: '#FFE082' };
    return { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' };
  };

  return (
    <DashboardLayout
      title={driveIdParam ? `Drive Candidate Matches · ${driveDetails?.jobTitle || 'Drive Match'}` : 'Talent Discovery & Candidate Matching'}
      breadcrumbs={[
        { label: 'Recruiter Workspace' },
        { label: 'Candidate Search' },
        ...(driveIdParam ? [{ label: driveDetails?.jobTitle || 'Drive Ranking' }] : []),
      ]}
    >
      <Modal
        isOpen={Boolean(feedback)}
        title="Candidate Shortlisted"
        message={feedback}
        onConfirm={() => setFeedback(null)}
      />

      {/* Header Banner */}
      {driveDetails ? (
        <div
          style={{
            backgroundColor: '#FAF6F5',
            border: '1px solid #E6E1DC',
            borderLeft: '5px solid var(--gv-primary, #563828)',
            padding: '16px 20px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', textTransform: 'uppercase' }}>
              Drive Match Mode
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '4px 0', color: '#333' }}>
              {driveDetails.jobTitle}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span> {driveDetails.location || 'Gujarat'}</span>
              <span> {driveDetails.ctc ? `₹${(driveDetails.ctc / 100000).toFixed(1)} LPA` : 'Competitive'}</span>
              <span>Min CGPA: <strong>{driveDetails.minimumCgpa || 'None'}</strong></span>
              <span>Max Backlogs: <strong>{driveDetails.maximumBacklogs ?? 'Any'}</strong></span>
              <span>Course: <strong>{driveDetails.requiredCourse || 'Any'}</strong></span>
            </div>
            {driveDetails.skills?.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#555', fontWeight: 600 }}>Required Skills:</span>
                {driveDetails.skills.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '0.74rem',
                      backgroundColor: '#E8F5E9',
                      color: '#2E7D32',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to={ROUTES.COMPANY_DRIVES} className="gv-btn gv-btn--outline gv-btn--sm">
              ← Back to Drives
            </Link>
            <Button size="sm" variant="outline" onClick={handleResetFilters}>
              Clear Drive Match
            </Button>
          </div>
        </div>
      ) : (
        <Card title="Search &amp; Filter Verified Candidates" style={{ marginBottom: '22px' }}>
          {/* Skill Filter Chips */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#444', marginBottom: '8px' }}>
              Filter by Skills &amp; Technologies:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {POPULAR_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #563828' : '1px solid #D1D5DB',
                      backgroundColor: isSelected ? 'var(--gv-primary, #563828)' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#374151',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <form onSubmit={handleAddCustomSkill} style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
              <input
                type="text"
                className="gv-input"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                placeholder="Add other skill (e.g. Next.js, FastAPI)"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
              />
              <Button type="submit" size="sm" variant="outline">
                Add
              </Button>
            </form>

            {/* Selected Skills Pills */}
            {selectedSkills.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#666' }}>Active skill filters:</span>
                {selectedSkills.map((s) => (
                  <span
                    key={s}
                    style={{
                      backgroundColor: '#FAF6F5',
                      border: '1px solid #563828',
                      color: '#563828',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Academic & Eligibility Criteria Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                Course / Program:
              </label>
              <select
                className="gv-select"
                style={{ fontSize: '0.84rem' }}
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {COURSES.map((c) => (
                  <option key={c} value={c === 'All Courses' ? '' : c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                Minimum CGPA:
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="gv-input"
                style={{ fontSize: '0.84rem' }}
                placeholder="e.g. 7.0"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                Maximum Active Backlogs:
              </label>
              <select
                className="gv-select"
                style={{ fontSize: '0.84rem' }}
                value={maxBacklogs}
                onChange={(e) => setMaxBacklogs(e.target.value)}
              >
                <option value="">Any Backlogs</option>
                <option value="0">Zero Backlogs (Clear Only)</option>
                <option value="1">At most 1 Backlog</option>
                <option value="2">At most 2 Backlogs</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="outline" onClick={handleResetFilters} style={{ width: '100%' }}>
                Reset Filters ⟳
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Candidate List Count & Notice */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#444' }}>
          Showing <strong>{candidates.length}</strong> of <strong>{totalElements}</strong> verified candidates
          {driveIdParam && <span style={{ color: 'var(--gv-primary, #563828)' }}> (Ranked by Match Score)</span>}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#666' }}>
          Privacy Safeguard: Contact info visible only for applicants
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#FFEBEE',
            border: '1px solid #FFCDD2',
            color: '#C62828',
            padding: '14px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
           {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
          <p style={{ fontWeight: 600 }}>Analyzing candidate profiles and computing skill match scores...</p>
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🔍</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
              No Candidates Found Matching Your Criteria
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 16px auto', color: '#777' }}>
              Try loosening your skill or CGPA filters, or select a different academic course to discover more Gujarat Vidyapith candidates.
            </p>
            <Button size="sm" variant="primary" onClick={handleResetFilters}>
              Reset All Filters
            </Button>
          </div>
        </Card>
      ) : (
        /* Result Cards Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {candidates.map((cand) => {
            const scoreStyle = cand.matchScore !== null && cand.matchScore !== undefined
              ? getMatchScoreColor(cand.matchScore)
              : null;

            return (
              <div
                key={cand.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #E6E1DC',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Top Row: Name, Score, Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', margin: 0 }}>
                        {cand.fullName}
                      </h3>
                      {cand.gender && (
                        <span style={{ fontSize: '0.74rem', backgroundColor: '#F3F4F6', color: '#555', padding: '1px 7px', borderRadius: '4px' }}>
                          {cand.gender}
                        </span>
                      )}
                      {cand.profileCompletionPercentage && (
                        <span style={{ fontSize: '0.74rem', backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          ✓ {cand.profileCompletionPercentage}% Profile
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                       <strong>{cand.course || 'Degree Program'}</strong> · {cand.institution || 'Gujarat Vidyapith'}
                      {cand.graduationYear && ` (Class of ${cand.graduationYear})`}
                    </div>
                  </div>

                  {/* Match Score Badge (Color Coded) */}
                  {cand.matchScore !== null && cand.matchScore !== undefined && (
                    <div
                      style={{
                        backgroundColor: scoreStyle.bg,
                        color: scoreStyle.text,
                        border: `1px solid ${scoreStyle.border}`,
                        borderRadius: '6px',
                        padding: '6px 14px',
                        textAlign: 'center',
                        minWidth: '100px',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>
                        {cand.matchScore}%
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                        Match Score
                      </div>
                    </div>
                  )}
                </div>

                {/* Academic Metrics & Eligibility Flags */}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.84rem' }}>
                  <div style={{ backgroundColor: '#FAF6F5', padding: '4px 10px', borderRadius: '4px' }}>
                    CGPA: <strong>{cand.cgpa ? cand.cgpa.toFixed(2) : 'N/A'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#FAF6F5', padding: '4px 10px', borderRadius: '4px' }}>
                    Backlogs: <strong>{cand.backlogs ?? 0}</strong>
                  </div>

                  {/* Drive Eligibility Indicator */}
                  {driveIdParam && (
                    cand.eligible ? (
                      <span style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '3px 9px', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>
                        ✓ Meets Drive Criteria
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#FFEBEE', color: '#C62828', padding: '3px 9px', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>
                        ✕ Criteria Mismatch ({!cand.meetsMinCgpa ? 'CGPA below cut-off' : !cand.backlogsWithinLimit ? 'Backlogs exceed limit' : 'Course mismatch'})
                      </span>
                    )
                  )}

                  {/* Application Status if applied */}
                  {cand.applied && (
                    <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '3px 9px', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>
                      📋 {cand.applicationStatus ? `Applied: ${cand.applicationStatus}` : 'Applied to your Drive'}
                    </span>
                  )}
                </div>

                {/* Skills Analysis: Matched vs Missing (when in drive context) */}
                {driveIdParam && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', backgroundColor: '#FDFCFB', padding: '10px', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32', marginBottom: '4px' }}>
                        ✓ Matched Skills ({cand.matchedSkills?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {cand.matchedSkills?.length > 0 ? (
                          cand.matchedSkills.map((s) => (
                            <span key={s} style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontSize: '0.74rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 600 }}>
                              {s}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#999', fontStyle: 'italic' }}>None matched</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C62828', marginBottom: '4px' }}>
                        ✕ Missing Skills ({cand.missingSkills?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {cand.missingSkills?.length > 0 ? (
                          cand.missingSkills.map((s) => (
                            <span key={s} style={{ backgroundColor: '#FFEBEE', color: '#C62828', fontSize: '0.74rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 600 }}>
                              {s}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#2E7D32', fontWeight: 600 }}>All required skills present!</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* All Candidate Skills */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                    Candidate Technical Skills:
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {cand.skills?.length > 0 ? (
                      cand.skills.map((s) => (
                        <span key={s} style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>No skills listed yet</span>
                    )}
                  </div>
                </div>

                {/* Top Projects */}
                {cand.topProjects?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                      Key Showcase Projects:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {cand.topProjects.map((p) => (
                        <div key={p.id} style={{ fontSize: '0.8rem', color: '#444' }}>
                          <strong>{p.title}</strong>
                          {p.description && <span style={{ color: '#666' }}> — {p.description.slice(0, 110)}...</span>}
                          {p.projectUrl && (
                            <a href={p.projectUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', color: 'var(--gv-primary, #563828)', fontSize: '0.75rem' }}>
                              View Project ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer / Privacy & Actions Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F0ECE9', paddingTop: '12px', marginTop: '4px', flexWrap: 'wrap', gap: '10px' }}>
                  {/* Contact Info (Exposed ONLY if student applied to this company) */}
                  {cand.applied ? (
                    <div style={{ fontSize: '0.82rem', color: '#333', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ Verified Applicant:</span>
                      {cand.email && <span> <strong>{cand.email}</strong></span>}
                      {cand.phone && <span><strong>{cand.phone}</strong></span>}
                      {cand.linkedinUrl && (
                        <a href={cand.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gv-primary, #563828)' }}>
                          LinkedIn ↗
                        </a>
                      )}
                      {cand.githubUrl && (
                        <a href={cand.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gv-primary, #563828)' }}>
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#888', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span></span>
                      <span>Contact details (email, phone, address) protected per Vidyapith privacy policy. Revealed upon application submission.</span>
                    </div>
                  )}

                  {/* Shortlist Action */}
                  {cand.applicationId && cand.applicationStatus === 'APPLIED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleShortlist(cand)}
                      loading={actionLoading}
                      disabled={actionLoading}
                    >
                      Shortlist Candidate ★
                    </Button>
                  )}
                  {cand.applicationStatus === 'SHORTLISTED' && (
                    <span style={{ fontSize: '0.82rem', color: '#2E7D32', fontWeight: 700 }}>
                      ✓ Candidate Shortlisted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 0 || loading}
            onClick={() => loadCandidates(currentPage - 1)}
          >
            ← Previous
          </Button>
          <span style={{ fontSize: '0.86rem', color: '#555' }}>
            Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages - 1 || loading}
            onClick={() => loadCandidates(currentPage + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
