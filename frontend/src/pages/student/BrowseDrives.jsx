import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import Button from '../../components/ui/Button';

export default function BrowseDrives() {
  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">CAMPUS PLACEMENT DRIVES</p>
          <h1 className="page-title">Placement Openings</h1>
          <p className="page-subtitle">
            Explore recruitment opportunities posted by Gujarat Vidyapith partner organizations.
          </p>
        </div>
      </div>

      <div className="feature-unavailable-card">
        <div className="unavailable-icon" aria-hidden="true">
          🚧
        </div>
        <h2>Student Drive Discovery — Not Available Yet</h2>
        <p className="unavailable-text">
          The backend API currently provides placement drive management endpoints for hiring
          companies (<code>/api/v1/companies/me/drives</code>), but the student-facing drive
          search, eligibility filtering, and discovery endpoints are currently in development.
        </p>

        <div className="gap-explanation">
          <h4>Technical Status:</h4>
          <ul>
            <li><strong>Backend API:</strong> No student-accessible drive listing endpoint is currently exposed in <code>PlacementDriveController</code>.</li>
            <li><strong>Required Backend Change:</strong> Implementation of a student-authorized drive discovery endpoint (e.g. <code>GET /api/v1/students/drives</code> with filtering by course, CGPA, and batch).</li>
          </ul>
        </div>

        <div className="unavailable-actions">
          <Button to={ROUTES.STUDENT_DASHBOARD}>Return to Student Dashboard</Button>
          <Button to={ROUTES.STUDENT_PROFILE} variant="secondary">
            Ensure Profile is Ready
          </Button>
        </div>
      </div>
    </div>
  );
}
