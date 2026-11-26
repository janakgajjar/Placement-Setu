import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../lib/routes';
import NotificationBell from '../ui/NotificationBell';
import ForcedPasswordChangeModal from '../auth/ForcedPasswordChangeModal';

/**
 * Gujarat Vidyapith Campus Portal Shell
 * Matches the official GUJVIDYAPITH Portal (emli) visual reference in screenshot c173f0c9.png:
 * - Vivid Cyan/Teal Header Bar (#17A2B8)
 * - Gold Student ID badge (#F5B041)
 * - Left Collapsible Menu Sidebar
 * - Breadcrumb Navigation (emali / Pages / Home style)
 * - Watermark Vidyapith Emblem Background
 */
export default function DashboardLayout({ title, breadcrumbs = [], children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavLinks = () => {
    if (!user) return [];

    if (user.role === 'STUDENT') {
      return [
        { label: 'Academic & Placement Home', to: ROUTES.STUDENT_DASHBOARD },
        { label: 'Student Profile KYC', to: ROUTES.STUDENT_PROFILE },
        { label: 'My Applications', to: ROUTES.STUDENT_APPLICATIONS },
        { label: 'AI Resume Manager', to: ROUTES.STUDENT_RESUME},
        { label: 'Browse Placement Drives', to: ROUTES.DRIVES_EXPLORER},
        { label: 'Campus Placement Bylaws', to: ROUTES.POLICIES},
      ];
    }

    if (user.role === 'COMPANY') {
      return [
        { label: 'Recruiter Dashboard', to: ROUTES.COMPANY_DASHBOARD },
        { label: 'Corporate Profile', to: ROUTES.COMPANY_PROFILE },
        { label: 'Manage Drives & Postings', to: ROUTES.COMPANY_DRIVES },
        { label: 'Find Candidates', to: ROUTES.COMPANY_CANDIDATE_SEARCH },
        { label: 'Create New Drive', to: ROUTES.COMPANY_DRIVE_CREATE },
        { label: 'Vidyapith Internship Bylaws', to: ROUTES.POLICIES },
      ];
    }

    // PLACEMENT_OFFICER & ADMIN
    return [
      { label: 'Placement Officer Desk', to: ROUTES.OFFICER_DASHBOARD },
      { label: 'Pending Company Approvals', to: ROUTES.OFFICER_APPROVALS },
      { label: 'Partner Recruiters Directory', to: ROUTES.OFFICER_COMPANIES },
      { label: 'Placement Drives Explorer', to: ROUTES.DRIVES_EXPLORER },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <div className="gv-portal">
      {/* Forced Password Change Modal for Provisioned Companies */}
      <ForcedPasswordChangeModal isOpen={Boolean(user?.mustChangePassword)} />

      {/* 1. Vivid Cyan/Teal Header Bar (From GujVidyapith ERP Screenshot) */}
      <header className="gv-portal__header">
        <div className="gv-portal__brand">
          <button
            type="button"
            className="gv-portal__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Navigation Sidebar"
          >
            ☰
          </button>
          <Link to={ROUTES.HOME} className="gv-portal__logo-text">
            GUJVIDYAPITH · PLACEMENT SETU
          </Link>
        </div>

        <div className="gv-portal__actions">
          {/* Yellow ID Badge (matching 250160450021 badge in screenshot) */}
          <span className="gv-portal__id-badge">
            {user?.role === 'STUDENT' ? (user.email.split('@')[0]) : user?.role}
          </span>

          {/* In-app Notification Dropdown */}
          <NotificationBell />

          {/* User Avatar & Logout */}
          <div className="gv-portal__user-menu">
            <div className="gv-portal__avatar" title={user?.email}>
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate(ROUTES.LOGIN, { replace: true });
              }}
              className="gv-btn gv-btn--sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '4px 10px',
                fontSize: '0.75rem',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* 2. Portal Workspace (Sidebar + Main Content Canvas) */}
      <div className="gv-portal__body">
        {/* Left Menu Sidebar */}
        <aside className={`gv-portal__sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="gv-portal__sidebar-header">
            {user?.role} PORTAL NAVIGATION
          </div>
          <ul className="gv-portal__nav">
            {navLinks.map((item) => (
              <li key={item.to} className="gv-portal__nav-item">
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
            <li className="gv-portal__nav-item" style={{ marginTop: 'auto', borderTop: '1px solid var(--gv-border)' }}>
              <Link to={ROUTES.HOME} onClick={() => setSidebarOpen(false)}>
                <span>🌐</span>
                <span>Public University Website</span>
              </Link>
            </li>
          </ul>
        </aside>

        {/* Workspace Canvas with Watermark */}
        <main className="gv-portal__main">
          {/* Breadcrumb Header (emali / Pages / Home style) */}
          <div className="gv-portal__breadcrumb">
            <div>
              <div className="gv-portal__trail">
                <Link to={ROUTES.HOME}>emali</Link>
                <span>/</span>
                <span>Pages</span>
                {breadcrumbs.map((b, i) => (
                  <span key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>/</span>
                    {b.to ? <Link to={b.to}>{b.label}</Link> : <span>{b.label}</span>}
                  </span>
                ))}
              </div>
              <h1>{title}</h1>
            </div>
          </div>

          {/* Main Page Slot */}
          {children}

          {/* Subdued Footer Note */}
          <div style={{ marginTop: '40px', padding: '16px 0', borderTop: '1px solid var(--gv-border)', fontSize: '0.78rem', color: 'var(--gv-text-subtle)', textAlign: 'center' }}>
            {new Date().getFullYear()} © Gujarat Vidyapith · emli Placement Setu System · Founded by Mahatma Gandhi
          </div>
        </main>
      </div>
    </div>
  );
}
