import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INSTITUTION, DEPARTMENTS, BYLAWS } from '../lib/constants';
import { ROUTES, ROLE_DEFAULT_ROUTES } from '../lib/routes';
import { api } from '../lib/api';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [featuredDrives, setFeaturedDrives] = useState([]);
  const [drivesLoading, setDrivesLoading] = useState(true);
  const [partnerCompanies, setPartnerCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch live placement metrics
    api.public
      .getStats()
      .then((res) => {
        if (isMounted && res?.data) {
          setStats(res.data);
        }
      })
      .catch(() => {
        // Fallback: hide stats if not available
        if (isMounted) setStats(null);
      })
      .finally(() => {
        if (isMounted) setStatsLoading(false);
      });

    // 2. Fetch latest published placement drives (up to 4)
    api.public
      .getDrives('?page=0&size=4')
      .then((res) => {
        if (isMounted && res?.data?.content) {
          setFeaturedDrives(res.data.content);
        }
      })
      .catch(() => {
        if (isMounted) setFeaturedDrives([]);
      })
      .finally(() => {
        if (isMounted) setDrivesLoading(false);
      });

    // 3. Fetch verified partner companies (up to 6)
    api.public
      .getCompanies('?page=0&size=6')
      .then((res) => {
        if (isMounted && res?.data?.content) {
          setPartnerCompanies(res.data.content);
        }
      })
      .catch(() => {
        if (isMounted) setPartnerCompanies([]);
      })
      .finally(() => {
        if (isMounted) setCompaniesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyClick = (driveId) => {
    if (!isAuthenticated) {
      navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.DRIVES_EXPLORER)}`, {
        state: { message: 'Please login to your student account to apply for campus drives.' },
      });
      return;
    }
    if (user?.role === 'STUDENT') {
      navigate(ROUTES.DRIVES_EXPLORER);
    } else {
      navigate(ROLE_DEFAULT_ROUTES[user.role] || ROUTES.HOME);
    }
  };

  return (
    <div className="gv-landing">
      {/* =================================================================
          1. HERO SECTION (Gujarat Vidyapith Brand & Clear CTAs)
          ================================================================= */}
      <section className="gv-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src="/images/gujarat-vidyapith-white-logo.png"
          alt=""
          className="gv-hero__watermark"
          aria-hidden="true"
          onError={(e) => {
            e.target.src = '/images/gujarat-vidyapith-logo.png';
          }}
        />

        <div className="gv-container gv-hero__grid">
          <div>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FAF6F5',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                marginBottom: '16px',
                textTransform: 'uppercase',
              }}
            >
              Official University Placement Portal
            </div>

            <h1 className="gv-hero__title" style={{ fontFamily: 'serif', lineHeight: 1.2 }}>
              {INSTITUTION.GUJARATI_NAME}
              <br />
              <span style={{ fontSize: '0.85em', fontWeight: 400, opacity: 0.95 }}>
                Placement Setu · Empowering Careers
              </span>
            </h1>

            <p className="gv-hero__lead" style={{ fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '620px' }}>
              Founded by <strong>{INSTITUTION.FOUNDER}</strong> on 18th October, 1920. Placement Setu bridges Gujarat
              Vidyapith’s talented postgraduates and graduates with ethical recruiters, championing self-reliance, rural
              upliftment, and nation-building.
            </p>

            <div className="gv-hero__actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
              {isAuthenticated ? (
                <Link
                  to={ROLE_DEFAULT_ROUTES[user?.role] || ROUTES.STUDENT_DASHBOARD}
                  className="gv-btn gv-btn--sage gv-btn--lg"
                >
                  Go to Dashboard ({user?.role}) →
                </Link>
              ) : (
                <>
                  <Link to={ROUTES.LOGIN} className="gv-btn gv-btn--sage gv-btn--lg">
                    Login to Portal →
                  </Link>
                  <Link to={ROUTES.REGISTER_STUDENT} className="gv-btn gv-btn--outline-white gv-btn--lg">
                    Student Sign Up
                  </Link>
                </>
              )}
              <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--secondary gv-btn--lg">
                Explore Placement Drives
              </Link>
            </div>

            
          </div>

          {/* Quick Action Cards */}
          <div className="gv-quick-tiles" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link to={ROUTES.DRIVES_EXPLORER} className="gv-quick-tile gv-quick-tile--amber">
              <div className="gv-quick-tile__header">
                <span className="gv-quick-tile__tag">Live Opportunities</span>
                <span>↗</span>
              </div>
              <div className="gv-quick-tile__title">Campus Placement Drives 2026-27</div>
              <div className="gv-quick-tile__desc">
                Browse verified openings from audited recruiters with transparent CTC and requirements.
              </div>
            </Link>

            <Link to={ROUTES.POLICIES} className="gv-quick-tile gv-quick-tile--blue">
              <div className="gv-quick-tile__header">
                <span className="gv-quick-tile__tag">Institutional Bylaws</span>
                <span>↗</span>
              </div>
              <div className="gv-quick-tile__title">One Student One Job Policy</div>
              <div className="gv-quick-tile__desc">
                Ensuring equitable career opportunities with verified Dream Offer flexibility for high performers.
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* =================================================================
          2. PLACEMENT STATISTICS (Real numbers from GET /api/v1/public/stats)
          ================================================================= */}
      {stats && (stats.activeDrivesCount > 0 || stats.partnerCompaniesCount > 0 || stats.placedStudentsCount > 0) && (
        <section
          style={{
            backgroundColor: '#FAF6F5',
            borderBottom: '1px solid var(--gv-border, #D8D2C2)',
            padding: '36px 0',
          }}
        >
          <div className="gv-container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E6E1DC' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--gv-primary, #563828)' }}>
                  {stats.activeDrivesCount}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#555555', marginTop: '4px', fontWeight: 600 }}>
                  Active Campus Drives
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E6E1DC' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--gv-sage-green-dark, #4D5735)' }}>
                  {stats.partnerCompaniesCount}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#555555', marginTop: '4px', fontWeight: 600 }}>
                  Verified Partner Recruiters
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E6E1DC' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--gv-primary, #563828)' }}>
                  {stats.placedStudentsCount}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#555555', marginTop: '4px', fontWeight: 600 }}>
                  Placed Candidates
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E6E1DC' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--gv-portal-cyan-dark, #117A8B)' }}>
                  {stats.totalDrivesCount}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#555555', marginTop: '4px', fontWeight: 600 }}>
                  Total Drives Conducted
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================
          3. KEY PLATFORM FEATURES
          ================================================================= */}
      <section className="gv-section gv-section--white">
        <div className="gv-container">
          <div className="gv-section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p className="gv-section-eyebrow" style={{ color: 'var(--gv-sage-green-dark, #4D5735)', fontWeight: 700 }}>
              Autonomous Placement Architecture
            </p>
            <h2 className="gv-section-title" style={{ fontFamily: 'serif', color: 'var(--gv-primary, #563828)' }}>
              Key Institutional Capabilities
            </h2>
            <p className="gv-section-desc" style={{ maxWidth: '650px', margin: '0 auto', color: '#555555' }}>
              Built specifically for Gujarat Vidyapith to eliminate manual paperwork, protect student interests, and
              streamline recruiter engagement.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Feature 1 */}
            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-primary, #563828)' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}></div>
              <h3 className="gv-card__title" style={{ fontSize: '1.15rem', marginBottom: '8px' }}>
                AI-Powered Resume Parsing
              </h3>
              <p className="gv-card__body" style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                Upload PDF or DOCX resumes. Automated deep parsing extracts technical skills, academic history, projects,
                and certifications into structured JSON.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-sage-green, #7D8A58)' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}></div>
              <h3 className="gv-card__title" style={{ fontSize: '1.15rem', marginBottom: '8px' }}>
                Auto-Generated Student Profiles
              </h3>
              <p className="gv-card__body" style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                Parsed data automatically populates the candidate profile with zero manual re-entry. Students can review,
                edit, and verify their profile completion in real time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-portal-cyan, #17A2B8)' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}></div>
              <h3 className="gv-card__title" style={{ fontSize: '1.15rem', marginBottom: '8px' }}>
                Audited Recruiter Placement Drives
              </h3>
              <p className="gv-card__body" style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                Every campus drive is verified by the Placement Officer before publication. Includes transparent minimum
                CGPA, backlog limits, and Dream Offer flags.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="gv-card" style={{ borderTop: '4px solid #B8860B' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}></div>
              <h3 className="gv-card__title" style={{ fontSize: '1.15rem', marginBottom: '8px' }}>
                End-to-End Application Tracking
              </h3>
              <p className="gv-card__body" style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                Track applications through structured stages: Applied, Shortlisted, Technical Interview, and Selected,
                with automatic One-Student-One-Job enforcement.
              </p>
            </div>
          </div>
        </div>
      </section>

    

      {/* =================================================================
          5. LATEST PUBLISHED DRIVES PREVIEW (Read-Only)
          ================================================================= */}
      <section className="gv-section gv-section--white" style={{ borderTop: '1px solid var(--gv-border)' }}>
        <div className="gv-container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div>
              <p className="gv-section-eyebrow" style={{ color: 'var(--gv-sage-green-dark, #4D5735)', fontWeight: 700 }}>
                Campus Opportunities
              </p>
              <h2 className="gv-section-title" style={{ fontFamily: 'serif', color: 'var(--gv-primary, #563828)', margin: 0 }}>
                Latest Published Placement Drives
              </h2>
            </div>
            <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--outline gv-btn--sm">
              View All Drives 
            </Link>
          </div>

          {drivesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#777' }}>
              Loading published placement drives...
            </div>
          ) : featuredDrives.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FAF6F5',
                border: '1px dashed var(--gv-border, #D8D2C2)',
                borderRadius: '8px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              <p style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>
                Currently awaiting newly scheduled campus drives for the academic session.
              </p>
              <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--sage gv-btn--sm">
                Browse Archive &amp; Eligibility Criteria
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {featuredDrives.map((drive) => (
                <div
                  key={drive.id}
                  className="gv-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: drive.isDreamOffer
                      ? '4px solid #B8860B'
                      : '4px solid var(--gv-primary, #563828)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: drive.driveType === 'PAID_INTERNSHIP' ? '#E8F5E9' : '#FFF3E0',
                          color: drive.driveType === 'PAID_INTERNSHIP' ? '#2E7D32' : '#E65100',
                        }}
                      >
                        {drive.driveType === 'PAID_INTERNSHIP' ? 'Paid Internship' : 'Full-Time Job'}
                      </span>
                      {drive.isDreamOffer && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#FFF8E1',
                            color: '#F57F17',
                            border: '1px solid #FFE082',
                          }}
                        >
                           Dream Offer
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.15rem', color: 'var(--gv-primary, #563828)', marginBottom: '4px', fontWeight: 700 }}>
                      {drive.jobTitle}
                    </h3>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gv-sage-green-dark, #4D5735)', marginBottom: '10px' }}>
                      {drive.companyName}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Location: {drive.location || 'Gujarat'}</div>
                      <div>
                         Compensation:{' '}
                        {drive.ctc
                          ? `₹${(Number(drive.ctc) / 100000).toFixed(1)} LPA`
                          : drive.stipend
                          ? `₹${drive.stipend}/month Stipend`
                          : 'As per industry standard'}
                      </div>
                      <div> Min. CGPA: {drive.minimumCgpa ? `${drive.minimumCgpa} CGPA` : 'Open'}</div>
                    </div>

                    {drive.skills && drive.skills.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {drive.skills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.75rem',
                              backgroundColor: '#F0EAE1',
                              color: 'var(--gv-primary, #563828)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEBE9' }}>
                    <Link
                      to={ROUTES.DRIVES_EXPLORER}
                      className="gv-btn gv-btn--outline gv-btn--sm"
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      View Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleApplyClick(drive.id)}
                      className="gv-btn gv-btn--primary gv-btn--sm"
                      style={{ flex: 1 }}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =================================================================
          6. PARTNER COMPANIES DIRECTORY PREVIEW
          ================================================================= */}
      <section className="gv-section gv-section--sand" style={{ borderTop: '1px solid var(--gv-border)' }}>
        <div className="gv-container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div>
              <p className="gv-section-eyebrow" style={{ color: 'var(--gv-sage-green-dark, #4D5735)', fontWeight: 700 }}>
                Corporate Association
              </p>
              <h2 className="gv-section-title" style={{ fontFamily: 'serif', color: 'var(--gv-primary, #563828)', margin: 0 }}>
                Audited Partner Recruiters
              </h2>
            </div>
            <Link to={ROUTES.PARTNER_COMPANIES} className="gv-btn gv-btn--outline gv-btn--sm">
              All Partner Companies →
            </Link>
          </div>

          {companiesLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#777' }}>
              Loading verified companies...
            </div>
          ) : partnerCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#777' }}>
              Corporate recruiter directory is being updated for the current recruitment session.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px',
              }}
            >
              {partnerCompanies.map((c) => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid var(--gv-border, #D8D2C2)',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--gv-bg-sand, #F0EAE1)',
                      color: 'var(--gv-primary, #563828)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      margin: '0 auto 12px',
                    }}
                  >
                    
                  </div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--gv-primary, #563828)', marginBottom: '4px', fontWeight: 700 }}>
                    {c.companyName}
                  </h4>
                  {c.website && (
                    <a
                      href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: 'var(--gv-portal-cyan-dark, #117A8B)', textDecoration: 'underline' }}
                    >
                      Visit Website ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =================================================================
          7. INSTITUTIONAL PLACEMENT BYLAWS
          ================================================================= */}
      <section className="gv-section gv-section--white" style={{ borderTop: '1px solid var(--gv-border)' }}>
        <div className="gv-container">
          <div className="gv-section-header" style={{ textAlign: 'center', marginBottom: '36px' }}>
            <p className="gv-section-eyebrow" style={{ color: 'var(--gv-sage-green-dark, #4D5735)', fontWeight: 700 }}>
              Institutional Standards
            </p>
            <h2 className="gv-section-title" style={{ fontFamily: 'serif', color: 'var(--gv-primary, #563828)' }}>
              Campus Placement Bylaws
            </h2>
            <p className="gv-section-desc" style={{ maxWidth: '650px', margin: '0 auto', color: '#555555' }}>
              Gujarat Vidyapith adheres to high ethical standards protecting both student careers and corporate integrity.
            </p>
          </div>

          <div className="gv-card-grid">
            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-primary, #563828)' }}>
              <h3 className="gv-card__title">1. One Student One Job Rule</h3>
              <p className="gv-card__body">{BYLAWS.ONE_STUDENT_ONE_JOB}</p>
            </div>

            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-sage-green, #7D8A58)' }}>
              <h3 className="gv-card__title">2.Academic Eligibility Validation</h3>
              <p className="gv-card__body">{BYLAWS.ACADEMIC_ELIGIBILITY}</p>
            </div>

            <div className="gv-card" style={{ borderTop: '4px solid var(--gv-portal-cyan, #17A2B8)' }}>
              <h3 className="gv-card__title">3. Ethical Corporate Onboarding</h3>
              <p className="gv-card__body">{BYLAWS.ETHICAL_RECRUITMENT}</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '35px' }}>
            <Link to={ROUTES.POLICIES} className="gv-btn gv-btn--outline gv-btn--md">
              Read Complete Bylaws &amp; Regulations ↗
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
