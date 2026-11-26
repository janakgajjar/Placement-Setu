import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

export default function CompanyDashboard() {
  const [profile, setProfile] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        const [profRes, drivesRes] = await Promise.allSettled([
          api.company.getProfile(),
          api.company.getDrives(),
        ]);

        if (profRes.status === 'fulfilled' && profRes.value?.data) {
          setProfile(profRes.value.data);
        }
        if (drivesRes.status === 'fulfilled' && drivesRes.value?.data) {
          setDrives(drivesRes.value.data.content || []);
        }
      } catch (err) {
        console.warn('Company dashboard warning:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, []);

  const publishedCount = drives.filter((d) => d.status === 'PUBLISHED').length;
  const draftCount = drives.filter((d) => d.status === 'DRAFT').length;

  return (
    <DashboardLayout
      title="Corporate Recruiter Workspace"
      breadcrumbs={[{ label: 'Recruiter Workspace' }, { label: 'Dashboard' }]}
    >
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <StatCard
          label="Total Drives Created"
          value={drives.length}
          icon="📢"
          color="var(--gv-primary-brown)"
        />

        <StatCard
          label="Published &amp; Active"
          value={publishedCount}
          icon="🟢"
          subtext="Accepting candidate applications"
          color="var(--gv-sage-green-dark)"
        />

        <StatCard
          label="Draft Openings"
          value={draftCount}
          icon="📝"
          subtext="Ready for publishing"
          color="var(--gv-warm-taupe)"
        />

        <StatCard
          label="GSTIN Accreditation"
          value={profile?.gstin ? 'Verified' : 'Pending'}
          icon="🏛️"
          subtext={profile?.gstin || 'Gujarat Vidyapith Compliance'}
          color="var(--gv-portal-cyan-dark)"
        />
      </div>

      {/* Recruiter Overview Card */}
      <Card title={profile?.companyName || 'Corporate Recruiter Profile'} watermark>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gv-text-subtle)' }}>Corporate GSTIN</div>
            <strong>{profile?.gstin || '24AAAAA0000A1Z5'}</strong>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gv-text-subtle)' }}>Headquarters Address</div>
            <strong>{profile?.address || 'Ahmedabad, Gujarat'}</strong>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gv-text-subtle)' }}>Official Website</div>
            <a href={profile?.website || '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gv-portal-cyan-dark)', fontWeight: 600 }}>
              {profile?.website || 'https://www.company.com'} ↗
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to={ROUTES.COMPANY_DRIVE_CREATE} className="gv-btn gv-btn--primary gv-btn--sm">
            + Post New Placement Drive
          </Link>
          <Link to={ROUTES.COMPANY_DRIVES} className="gv-btn gv-btn--sage gv-btn--sm">
            Manage Existing Drives ({drives.length})
          </Link>
        </div>
      </Card>
    </DashboardLayout>
  );
}
