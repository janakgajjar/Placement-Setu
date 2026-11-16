import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import Button from '../../components/ui/Button';

export default function MyApplications() {
  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">APPLICATION TRACKING</p>
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">
            Track your recruitment stages, interview schedules, and placement offers.
          </p>
        </div>
      </div>

      <div className="feature-unavailable-card">
        <div className="unavailable-icon" aria-hidden="true">
          ⏳
        </div>
        <h2>Application Management &amp; Tracking — Not Available Yet</h2>
        <p className="unavailable-text">
          Application submission and status tracking controllers are currently pending in the
          Placement Setu backend. While the database schema contains the foundation for applications,
          the corresponding REST controllers (<code>ApplicationController</code>) have not yet been exposed.
        </p>

        <div className="gap-explanation">
          <h4>Technical Status:</h4>
          <ul>
            <li><strong>Backend API:</strong> No endpoints exist for students to apply to drives (e.g. <code>POST /api/v1/students/drives/&#123;id&#125;/apply</code>) or fetch applications (e.g. <code>GET /api/v1/students/applications</code>).</li>
            <li><strong>Integrity Rule:</strong> In accordance with project standards, this page provides an honest unavailable status rather than mocking fake applications or simulated stages.</li>
          </ul>
        </div>

        <div className="unavailable-actions">
          <Button to={ROUTES.STUDENT_DASHBOARD}>Return to Student Dashboard</Button>
          <Button to={ROUTES.STUDENT_RESUME} variant="secondary">
            Verify Resume Status
          </Button>
        </div>
      </div>
    </div>
  );
}
