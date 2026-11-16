import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { ROUTES } from '../../lib/routes';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function OfficerDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const [pendingRes, companiesRes] = await Promise.allSettled([
          api.admin.getPendingCompanies(),
          api.officer.getCompanies({ size: 1 }),
        ]);

        if (!isMounted) return;

        if (pendingRes.status === 'fulfilled') {
          setPendingCount(pendingRes.value.data?.length || 0);
        }

        if (companiesRes.status === 'fulfilled') {
          setTotalCompanies(companiesRes.value.data?.totalElements || 0);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Error loading dashboard');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading placement administration..." />
      </div>
    );
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">PLACEMENT CELL ADMINISTRATION</p>
          <h1 className="page-title">Officer Overview</h1>
          <p className="page-subtitle">
            Gujarat Vidyapith · Central Placement Coordination &amp; Recruiter Onboarding
          </p>
        </div>
        <div className="page-actions">
          <Button to={ROUTES.OFFICER_APPROVALS}>
            Review Approvals {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button to={ROUTES.OFFICER_COMPANIES} variant="secondary">
            Manage Companies
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Metrics Row */}
      <div className="card-grid">
        <article className="card stat-card">
          <div className="stat-card__icon stat-card__icon--warning">⏳</div>
          <div className="stat-card__data">
            <span className="stat-card__number">{pendingCount}</span>
            <span className="stat-card__label">Pending Company Approvals</span>
            <p className="stat-card__subtext">Organizations awaiting credential verification</p>
          </div>
          <div className="card-footer">
            <Link to={ROUTES.OFFICER_APPROVALS} className="text-link">
              Go to Approval Queue →
            </Link>
          </div>
        </article>

        <article className="card stat-card">
          <div className="stat-card__icon stat-card__icon--success">🏢</div>
          <div className="stat-card__data">
            <span className="stat-card__number">{totalCompanies}</span>
            <span className="stat-card__label">Total Onboarded Companies</span>
            <p className="stat-card__subtext">Registered recruitment partners in system</p>
          </div>
          <div className="card-footer">
            <Link to={ROUTES.OFFICER_COMPANIES} className="text-link">
              Browse Directory →
            </Link>
          </div>
        </article>
      </div>

      {/* Administration Panels */}
      <div className="quick-links-section">
        <h2 className="section-title">Administrative Actions</h2>
        <div className="quick-grid">
          <Link to={ROUTES.OFFICER_APPROVALS} className="quick-card">
            <span className="quick-icon">📋</span>
            <div>
              <h4>Pending Company Approvals</h4>
              <p>Review new recruiter registrations, verify GSTINs, and approve or reject accounts.</p>
            </div>
          </Link>

          <Link to={ROUTES.OFFICER_COMPANIES} className="quick-card">
            <span className="quick-icon">🏢</span>
            <div>
              <h4>Company Directory &amp; Provisioning</h4>
              <p>Directly provision new partner companies with temporary credentials or update details.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
