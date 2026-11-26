import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

export default function OfficerDashboard() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.officer.getPendingCompanies();
        if (res?.data) {
          setPendingCompanies(res.data || []);
        }
      } catch (err) {
        console.warn('Officer dashboard fetch:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <DashboardLayout
      title="Placement Officer &amp; University Admin Desk"
      breadcrumbs={[{ label: 'Officer Desk' }, { label: 'Overview' }]}
    >
      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <StatCard
          label="Pending Company Approvals"
          value={pendingCompanies.length}
          subtext="GSTIN verification required"
          color="var(--gv-primary-brown)"
        />

        <StatCard
          label="Corporate Partners"
          value="Managed"
          subtext="Credentials & compliance"
          color="var(--gv-warm-taupe)"
        />
      </div>

      {/* Pending Approvals Card */}
      <Card title={`Pending Recruiter Registrations (${pendingCompanies.length})`} watermark>
        {pendingCompanies.length > 0 ? (
          <div className="gv-table-responsive">
            <table className="gv-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>GSTIN</th>
                  <th>Registered Email</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCompanies.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.companyName}</strong></td>
                    <td><code>{c.gstin}</code></td>
                    <td>{c.email || 'HR Email'}</td>
                    <td>{c.address || 'Gujarat'}</td>
                    <td>
                      <Link to={ROUTES.OFFICER_APPROVALS} className="gv-btn gv-btn--sage gv-btn--sm">
                        Review &amp; Approve →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gv-text-subtle)' }}>
            ✓ All corporate registrations have been reviewed. No pending approvals at this time.
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to={ROUTES.OFFICER_APPROVALS} className="gv-btn gv-btn--primary gv-btn--sm">
            Open Approvals Desk →
          </Link>
          <Link to={ROUTES.OFFICER_STUDENTS} className="gv-btn gv-btn--sage gv-btn--sm">
            Student KYC Verification 🎓
          </Link>
          <Link to={ROUTES.OFFICER_COMPANIES} className="gv-btn gv-btn--secondary gv-btn--sm">
            View All Corporate Partners
          </Link>
          <Link to={ROUTES.ADMIN_AUDIT_LOGS} className="gv-btn gv-btn--outline gv-btn--sm">
            System Audit Trail 📋
          </Link>
        </div>
      </Card>
    </DashboardLayout>
  );
}
