import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { ROUTES } from '../lib/routes';

const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>;

const highlights = [
  ['◒', 'For Students', 'Build your profile, share your resume, discover roles and follow every application.'],
  ['▦', 'For Companies', 'Present your organisation, publish opportunities and review prospective talent.'],
  ['⌘', 'For Placement Teams', 'Bring placement activity into focus with organised visibility across the platform.'],
];
const features = [
  ['◉', 'Complete student profile', 'Capture education, skills, projects, certificates and a current resume in one place.'],
  ['↗', 'Opportunity discovery', 'Browse published openings and submit applications through a clear, guided flow.'],
  ['✓', 'Application tracking', 'Keep students informed as their applications move through the process.'],
  ['▤', 'Company workspace', 'Create a company profile, post roles and manage applicants with confidence.'],
  ['◌', 'Placement oversight', 'Support company approvals and monitor core placement activity from one system.'],
  ['✦', 'Timely notifications', 'Stay connected to important application and platform updates.'],
];

function Preview() {
  return (
    <div className="preview-shell" aria-label="Illustrative Placement Setu dashboard preview">
      <div className="preview-top">
        <span className="preview-logo">PS</span>
        <span>Placement Setu</span>
        <i />
      </div>
      <div className="preview-body">
        <aside>
          <span className="active" />
          <span />
          <span />
          <span />
        </aside>
        <main>
          <div className="preview-greeting">
            <div>
              <small>PLACEMENT OVERVIEW</small>
              <strong>Welcome back, Student</strong>
            </div>
            <span className="mini-avatar">GV</span>
          </div>
          <div className="stat-grid">
            <article>
              <small>Profile Status</small>
              <b>Active</b>
              <em>Recruiter visible</em>
            </article>
            <article>
              <small>Resume Status</small>
              <b>Synced</b>
              <em>10 MB verified</em>
            </article>
            <article>
              <small>Drives Active</small>
              <b>Campus</b>
              <em>Gujarat Vidyapith</em>
            </article>
          </div>
          <section className="opportunities">
            <div className="preview-heading">
              <b>Featured Partner Roles</b>
              <a href="#features">View details</a>
            </div>
            <div className="job-row">
              <span className="job-logo">M</span>
              <div>
                <b>Software Engineer</b>
                <small>Technology · Ahmedabad</small>
              </div>
              <em>Verified</em>
            </div>
            <div className="job-row">
              <span className="job-logo">D</span>
              <div>
                <b>Data Analyst</b>
                <small>Analytics · Gandhinagar</small>
              </div>
              <em>Verified</em>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div id="top">
      <Header />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">GUJARAT VIDYAPITH PLACEMENT PLATFORM</p>
              <h1>
                Building <em>stronger careers</em>, together.
              </h1>
              <p className="hero-text">
                Placement Setu brings students, recruiters and placement teams together through one
                thoughtful, streamlined digital platform.
              </p>
              <div className="hero-actions">
                <Button to={ROUTES.REGISTER_STUDENT}>
                  Get started <span>→</span>
                </Button>
                <Button variant="secondary" href="#about">
                  Explore platform
                </Button>
              </div>
              <div className="hero-note">
                <span>✦</span>
                <p>A simpler, more connected path from potential to opportunity.</p>
              </div>
            </div>
            <Preview />
          </div>
        </section>

        <section className="highlights" id="about">
          <div className="container">
            <div className="section-intro section-intro--center">
              <p className="eyebrow">ONE PLATFORM, THREE PERSPECTIVES</p>
              <h2>Designed around every placement journey.</h2>
            </div>
            <div className="highlight-grid">
              {highlights.map(([icon, title, text]) => (
                <article className="highlight-card" key={title}>
                  <Icon>{icon}</Icon>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="features section-cream" id="features">
          <div className="container">
            <div className="section-intro">
              <p className="eyebrow">THE PLACEMENT SETU EXPERIENCE</p>
              <h2>Everything you need for a better placement journey.</h2>
              <p>
                Purpose-built essentials keep each step clear, organised and connected — without
                adding complexity.
              </p>
            </div>
            <div className="feature-grid">
              {features.map(([icon, title, text]) => (
                <article className="feature-card" key={title}>
                  <Icon>{icon}</Icon>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="container">
            <div className="section-intro section-intro--center">
              <p className="eyebrow">A CLEARER WAY FORWARD</p>
              <h2>How Placement Setu works.</h2>
            </div>
            <div className="steps">
              {[
                ['01', 'Create your profile', 'Students and companies introduce themselves with the details that matter.'],
                ['02', 'Discover opportunities', 'Companies share openings while students explore relevant roles.'],
                ['03', 'Apply & manage', 'Applications move through one organised, transparent workflow.'],
                ['04', 'Connect with clarity', 'The placement team can oversee activity across the journey.'],
              ].map(([num, title, text]) => (
                <article className="step" key={num}>
                  <span>{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="role-section" id="roles">
          <div className="container">
            <div className="role-heading">
              <p className="eyebrow">START WHERE YOU ARE</p>
              <h2>A platform made for your next step.</h2>
            </div>
            <div className="role-grid">
              <article>
                <p className="role-label">STUDENT</p>
                <h3>Ready to take the next step in your career?</h3>
                <Button to={ROUTES.REGISTER_STUDENT} variant="secondary">
                  Join as student <span>→</span>
                </Button>
              </article>
              <article className="role-card--featured">
                <p className="role-label">COMPANY</p>
                <h3>Looking for the right talent?</h3>
                <Button to={ROUTES.REGISTER_COMPANY}>
                  Register as company <span>→</span>
                </Button>
              </article>
              <article>
                <p className="role-label">PLACEMENT TEAM</p>
                <h3>Manage placements with clarity.</h3>
                <Button to={ROUTES.LOGIN} variant="secondary">
                  Placement dashboard <span>→</span>
                </Button>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
