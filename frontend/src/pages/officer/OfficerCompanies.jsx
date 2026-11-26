import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import api from '../../lib/api';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Partners' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING', label: 'Pending Review' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export default function OfficerCompanies() {
  const [companies, setCompanies] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [provisionedCreds, setProvisionedCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  const [editingCompany, setEditingCompany] = useState(null);
  const [resettingCompany, setResettingCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Provision Form state
  const [provisionForm, setProvisionForm] = useState({
    companyName: '',
    email: '',
    contactPerson: '',
    phone: '',
    gstin: '',
    website: '',
    address: '',
    temporaryPassword: '',
    sendEmail: true,
  });
  const [provisionErrors, setProvisionErrors] = useState({});

  // Edit Form state
  const [editForm, setEditForm] = useState({
    companyName: '',
    email: '',
    contactPerson: '',
    phone: '',
    gstin: '',
    website: '',
    address: '',
  });
  const [editErrors, setEditErrors] = useState({});

  // Reset Password Form state
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    sendEmail: true,
  });
  const [resetErrors, setResetErrors] = useState({});
  const [resetSuccessCreds, setResetSuccessCreds] = useState(null);

  // Fetch Companies
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.append('status', filter);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', page);
      params.append('size', '10');

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.officer.getAllCompanies(queryString);

      if (res?.data) {
        setCompanies(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError('Server is currently unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Handle Search input validation (Keyboard check: only alphabets and spaces, max 25 chars)
  const handleSearchKeyDown = (e) => {
    // Allow control keys (backspace, delete, tab, arrows, enter)
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      return;
    }
    // Block anything except letters and spaces
    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 25);
    setSearch(val);
    setPage(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Provisioning Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const validateProvisionForm = () => {
    const errs = {};
    if (!provisionForm.companyName.trim()) {
      errs.companyName = 'Company name is required.';
    } else if (provisionForm.companyName.length > 100) {
      errs.companyName = 'Company name cannot exceed 100 characters.';
    }

    if (!provisionForm.email.trim()) {
      errs.email = 'Corporate email address is required.';
    } else if (provisionForm.email.length > 30) {
      errs.email = 'Email address cannot exceed 30 characters.';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(provisionForm.email)) {
      errs.email = 'Please provide a valid corporate email format.';
    }

    if (!provisionForm.contactPerson.trim()) {
      errs.contactPerson = 'Contact person name is required.';
    }

    if (!provisionForm.phone.trim()) {
      errs.phone = '10-digit contact mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(provisionForm.phone.trim())) {
      errs.phone = 'Must be a valid 10-digit Indian mobile number.';
    }

    if (provisionForm.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(provisionForm.gstin.trim())) {
      errs.gstin = 'Must be a valid 15-character GSTIN format (e.g. 24AAAAA0000A1Z5).';
    }

    if (provisionForm.temporaryPassword.trim()) {
      if (provisionForm.temporaryPassword.length !== 8) {
        errs.temporaryPassword = 'Password must be exactly 8 characters.';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8}$/.test(provisionForm.temporaryPassword)) {
        errs.temporaryPassword = 'Must contain uppercase, lowercase, digit, and special char (@$!%*?&).';
      }
    }

    setProvisionErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!validateProvisionForm()) return;

    setActionLoading(true);
    try {
      const payload = {
        companyName: provisionForm.companyName.trim(),
        email: provisionForm.email.trim().toLowerCase(),
        contactPerson: provisionForm.contactPerson.trim(),
        phone: provisionForm.phone.trim(),
        gstin: provisionForm.gstin.trim() ? provisionForm.gstin.trim().toUpperCase() : null,
        website: provisionForm.website.trim() || null,
        address: provisionForm.address.trim() || null,
        temporaryPassword: provisionForm.temporaryPassword.trim() || null,
        sendEmail: provisionForm.sendEmail,
      };

      const res = await api.officer.provisionCompany(payload);
      setIsProvisionOpen(false);
      setProvisionForm({
        companyName: '',
        email: '',
        contactPerson: '',
        phone: '',
        gstin: '',
        website: '',
        address: '',
        temporaryPassword: '',
        sendEmail: true,
      });

      // Display generated credentials popup
      setProvisionedCreds({
        companyName: res.data.companyName,
        email: res.data.email,
        temporaryPassword: res.data.temporaryPassword,
      });
      setIsCredentialsOpen(true);
      loadCompanies();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to provision company account.';
      setProvisionErrors({ form: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Edit Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const openEditModal = (comp) => {
    setEditingCompany(comp);
    setEditForm({
      companyName: comp.companyName || '',
      email: comp.email || '',
      contactPerson: comp.contactPerson || '',
      phone: comp.phone || '',
      gstin: comp.gstin || '',
      website: comp.website || '',
      address: comp.address || '',
    });
    setEditErrors({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.companyName.trim()) {
      setEditErrors({ companyName: 'Company name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      await api.officer.updateCompany(editingCompany.id, editForm);
      setEditingCompany(null);
      loadCompanies();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update company details.';
      setEditErrors({ form: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Status & Reset Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleActivate = async (companyId) => {
    try {
      setActionLoading(true);
      await api.officer.activateCompany(companyId);
      loadCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to activate company.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (companyId) => {
    if (!window.confirm('Are you sure you want to suspend/deactivate this company account?')) return;
    try {
      setActionLoading(true);
      await api.officer.deactivateCompany(companyId);
      loadCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate company.');
    } finally {
      setActionLoading(false);
    }
  };

  const openResetModal = (comp) => {
    setResettingCompany(comp);
    setResetForm({ newPassword: '', sendEmail: true });
    setResetErrors({});
    setResetSuccessCreds(null);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (resetForm.newPassword.trim()) {
      if (resetForm.newPassword.length !== 8) {
        setResetErrors({ newPassword: 'Password must be exactly 8 characters.' });
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8}$/.test(resetForm.newPassword)) {
        setResetErrors({ newPassword: 'Must contain uppercase, lowercase, digit, and special char (@$!%*?&).' });
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await api.officer.resetCompanyPassword(resettingCompany.id, {
        newPassword: resetForm.newPassword.trim() || null,
        sendEmail: resetForm.sendEmail,
      });

      setResetSuccessCreds({
        email: resettingCompany.email,
        temporaryPassword: res.data.temporaryPassword,
      });
      loadCompanies();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      setResetErrors({ form: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCompany) return;
    try {
      setActionLoading(true);
      await api.officer.deleteCompany(deletingCompany.id);
      setDeletingCompany(null);
      loadCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete company.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout
      title="Corporate Partners & Recruiter Directory"
      breadcrumbs={[{ label: 'Officer Desk' }, { label: 'Recruiters Directory' }]}
    >
      {/* Top Action & Summary Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', margin: 0 }}>
            Managed Corporate Recruiters ({totalElements})
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gv-text-subtle, #666666)' }}>
            Companies are onboarded and managed directly by the Placement Office.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setProvisionErrors({});
            setIsProvisionOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>➕</span>
          <span>Add / Provision Company</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: '4px',
          border: '1px solid var(--gv-border, #E0D7D3)',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`gv-btn gv-btn--sm ${filter === tab.id ? 'gv-btn--primary' : 'gv-btn--secondary'}`}
              onClick={() => {
                setFilter(tab.id);
                setPage(0);
              }}
              style={{
                fontSize: '0.82rem',
                padding: '6px 12px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field with strict 25-char alphabet limit */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <input
            type="text"
            className="gv-input"
            value={search}
            onKeyDown={handleSearchKeyDown}
            onChange={handleSearchChange}
            placeholder="Search company (max 25 letters)..."
            maxLength={25}
            style={{
              padding: '6px 32px 6px 10px',
              fontSize: '0.84rem',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(0);
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Corporate Listing Card */}
      <Card title="Corporate Recruiter Directory" watermark>
        {error && (
          <div
            className="gv-alert gv-alert--danger"
            style={{
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gv-text-subtle)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            <div>Loading corporate partners directory...</div>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gv-text-subtle)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏢</div>
            <h4 style={{ color: 'var(--gv-primary)', marginBottom: '6px' }}>No Recruiters Found</h4>
            <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 18px auto' }}>
              {search
                ? `No company matches the search term "${search}".`
                : `There are no corporate accounts under status "${filter}".`}
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setProvisionErrors({});
                setIsProvisionOpen(true);
              }}
            >
              + Provision First Recruiter
            </Button>
          </div>
        ) : (
          <>
            <div className="gv-table-responsive">
              <table className="gv-table">
                <thead>
                  <tr>
                    <th>Company Name & Website</th>
                    <th>Contact Person</th>
                    <th>Email & Phone</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                    <th>Drives</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.companyName}</strong>
                        {c.website && (
                          <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--gv-portal-cyan-dark, #0f6674)', textDecoration: 'none' }}
                            >
                              {c.website} ↗
                            </a>
                          </div>
                        )}
                      </td>
                      <td>{c.contactPerson || '—'}</td>
                      <td>
                        <div>{c.email || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gv-text-subtle)' }}>{c.phone || '—'}</div>
                      </td>
                      <td>
                        {c.gstin ? (
                          <code style={{ fontSize: '0.8rem', backgroundColor: '#F5F5F5', padding: '2px 6px', borderRadius: '3px' }}>
                            {c.gstin}
                          </code>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <Badge
                          variant={
                            c.accountStatus === 'ACTIVE'
                              ? 'success'
                              : c.accountStatus === 'PENDING'
                                ? 'warning'
                                : c.accountStatus === 'REJECTED'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {c.accountStatus}
                        </Badge>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#E0F2F1',
                            color: '#00695C',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {c.numberOfDrives ?? 0} Drives
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--gv-text-subtle)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="gv-btn gv-btn--sm gv-btn--secondary"
                            onClick={() => openEditModal(c)}
                            title="Edit Company Details"
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="gv-btn gv-btn--sm gv-btn--secondary"
                            onClick={() => openResetModal(c)}
                            title="Reset Temporary Password"
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            🔑 Pwd
                          </button>
                          {c.accountStatus === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="gv-btn gv-btn--sm"
                              onClick={() => handleDeactivate(c.id)}
                              disabled={actionLoading}
                              title="Suspend / Deactivate"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.78rem',
                                backgroundColor: '#FFF3E0',
                                color: '#E65100',
                                border: '1px solid #FFE0B2',
                              }}
                            >
                              ⏸ Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="gv-btn gv-btn--sm"
                              onClick={() => handleActivate(c.id)}
                              disabled={actionLoading}
                              title="Activate Account"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.78rem',
                                backgroundColor: '#E8F5E9',
                                color: '#2E7D32',
                                border: '1px solid #C8E6C9',
                              }}
                            >
                              ▶ Activate
                            </button>
                          )}
                          <button
                            type="button"
                            className="gv-btn gv-btn--sm"
                            onClick={() => setDeletingCompany(c)}
                            title="Delete Company"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.78rem',
                              backgroundColor: '#FFEBEE',
                              color: '#C62828',
                              border: '1px solid #FFCDD2',
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--gv-border)',
                }}
              >
                <div style={{ fontSize: '0.84rem', color: 'var(--gv-text-subtle)' }}>
                  Page {page + 1} of {totalPages} ({totalElements} companies)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((p) => p + 1)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Provision Company Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {
        isProvisionOpen && (
          <div
            className="gv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gv-modal-box"
              style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                padding: '24px',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderTop: '5px solid var(--gv-primary, #563828)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)' }}>
                  Provision Corporate Recruiter Account
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}
                >
                  ✕
                </button>
              </div>

              {provisionErrors.form && (
                <div
                  className="gv-form-error"
                  style={{
                    backgroundColor: '#FFEBEE',
                    color: '#C62828',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontSize: '0.84rem',
                    marginBottom: '16px',
                    border: '1px solid #EF9A9A',
                  }}
                >
                  ⚠️ {provisionErrors.form}
                </div>
              )}

              <form onSubmit={handleProvisionSubmit} noValidate>
                <FormField
                  id="companyName"
                  label="Company Name"
                  required
                  value={provisionForm.companyName}
                  onChange={(e) => {
                    setProvisionForm({ ...provisionForm, companyName: e.target.value });
                    if (provisionErrors.companyName) setProvisionErrors({ ...provisionErrors, companyName: '' });
                  }}
                  placeholder="e.g. Tata Consultancy Services"
                  error={provisionErrors.companyName}
                  maxLength={100}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField
                    id="email"
                    label="Recruiter Login Email"
                    type="email"
                    required
                    value={provisionForm.email}
                    onChange={(e) => {
                      setProvisionForm({ ...provisionForm, email: e.target.value });
                      if (provisionErrors.email) setProvisionErrors({ ...provisionErrors, email: '' });
                    }}
                    placeholder="campus@company.com"
                    error={provisionErrors.email}
                    maxLength={30}
                  />

                  <FormField
                    id="contactPerson"
                    label="Contact Person Name"
                    required
                    value={provisionForm.contactPerson}
                    onChange={(e) => {
                      setProvisionForm({ ...provisionForm, contactPerson: e.target.value });
                      if (provisionErrors.contactPerson) setProvisionErrors({ ...provisionErrors, contactPerson: '' });
                    }}
                    placeholder="e.g. Ramesh Patel"
                    error={provisionErrors.contactPerson}
                    maxLength={60}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField
                    id="phone"
                    label="Contact Phone"
                    required
                    value={provisionForm.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setProvisionForm({ ...provisionForm, phone: val });
                      if (provisionErrors.phone) setProvisionErrors({ ...provisionErrors, phone: '' });
                    }}
                    placeholder="10-digit mobile number"
                    error={provisionErrors.phone}
                    maxLength={10}
                  />

                  <FormField
                    id="gstin"
                    label="GSTIN (15 characters)"
                    value={provisionForm.gstin}
                    onChange={(e) => {
                      setProvisionForm({ ...provisionForm, gstin: e.target.value.toUpperCase() });
                      if (provisionErrors.gstin) setProvisionErrors({ ...provisionErrors, gstin: '' });
                    }}
                    placeholder="24AAAAA0000A1Z5"
                    error={provisionErrors.gstin}
                    maxLength={15}
                  />
                </div>

                <FormField
                  id="website"
                  label="Official Website URL"
                  value={provisionForm.website}
                  onChange={(e) => setProvisionForm({ ...provisionForm, website: e.target.value })}
                  placeholder="https://www.company.com"
                />

                <FormField
                  id="address"
                  as="textarea"
                  label="Corporate Address / Location"
                  value={provisionForm.address}
                  onChange={(e) => setProvisionForm({ ...provisionForm, address: e.target.value })}
                  placeholder="Ahmedabad, Gujarat"
                  rows={2}
                />

                <FormField
                  id="temporaryPassword"
                  label="Temporary Password (Optional)"
                  type="password"
                  value={provisionForm.temporaryPassword}
                  onChange={(e) => {
                    setProvisionForm({ ...provisionForm, temporaryPassword: e.target.value });
                    if (provisionErrors.temporaryPassword) setProvisionErrors({ ...provisionErrors, temporaryPassword: '' });
                  }}
                  placeholder="Leave blank to auto-generate (e.g. Gv@abc12)"
                  error={provisionErrors.temporaryPassword}
                  maxLength={8}
                  helpText="If blank, system generates an 8-char password. Recruiter MUST change it on first login."
                />

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={provisionForm.sendEmail}
                    onChange={(e) => setProvisionForm({ ...provisionForm, sendEmail: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="sendEmail" style={{ fontSize: '0.88rem', cursor: 'pointer', margin: 0 }}>
                    Dispatch credentials directly to corporate email via Brevo Outbox
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsProvisionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    Provision &amp; Create Account
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Provisioning Credentials Popup (Screenshot 2c1c4a48.png) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {
        isCredentialsOpen && provisionedCreds && (
          <div
            className="gv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gv-modal-box"
              style={{
                maxWidth: '460px',
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                padding: '28px',
                textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
                borderTop: '5px solid #28A745',
              }}
            >
              {/* Green Circular Checkmark Icon */}
              <div
                className="gv-modal-success-icon"
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  border: '3px solid #66BB6A',
                  backgroundColor: '#E8F5E9',
                  color: '#2E7D32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 16px auto',
                }}
                aria-hidden="true"
              >
                ✓
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '8px' }}>
                Company Account Provisioned!
              </h3>
              <p style={{ color: 'var(--gv-text-subtle)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Account for <strong>{provisionedCreds.companyName}</strong> has been created.
              </p>

              {/* Credentials Card Box */}
              <div
                style={{
                  backgroundColor: '#F9FBFD',
                  border: '1px dashed #90CAF9',
                  borderRadius: '6px',
                  padding: '16px',
                  textAlign: 'left',
                  marginBottom: '20px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                    Portal Login Email:
                  </span>
                  <div style={{ fontWeight: 700, color: '#1565C0', fontSize: '0.95rem' }}>
                    {provisionedCreds.email}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.78rem', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                    Temporary Password:
                  </span>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#C62828',
                      fontSize: '1.1rem',
                      letterSpacing: '1px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {provisionedCreds.temporaryPassword}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#E65100', marginBottom: '20px', backgroundColor: '#FFF3E0', padding: '8px', borderRadius: '4px' }}>
                ⚠️ The recruiter will be required to change this temporary password upon first login.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    copyToClipboard(
                      `Placement Setu Login Credentials\nCompany: ${provisionedCreds.companyName}\nEmail: ${provisionedCreds.email}\nTemporary Password: ${provisionedCreds.temporaryPassword}\nLogin URL: ${window.location.origin}/login`
                    )
                  }
                >
                  {copied ? 'Copied! ✓' : '📋 Copy Credentials'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setIsCredentialsOpen(false);
                    setProvisionedCreds(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Edit Company Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {
        editingCompany && (
          <div
            className="gv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gv-modal-box"
              style={{
                maxWidth: '520px',
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                padding: '24px',
                borderTop: '5px solid var(--gv-primary, #563828)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--gv-primary, #563828)' }}>
                  Edit Company: {editingCompany.companyName}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}
                >
                  ✕
                </button>
              </div>

              {editErrors.form && (
                <div
                  className="gv-form-error"
                  style={{
                    backgroundColor: '#FFEBEE',
                    color: '#C62828',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '0.84rem',
                    marginBottom: '16px',
                  }}
                >
                  ⚠️ {editErrors.form}
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                <FormField
                  id="editCompanyName"
                  label="Company Name"
                  required
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  error={editErrors.companyName}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField
                    id="editContactPerson"
                    label="Contact Person"
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  />
                  <FormField
                    id="editPhone"
                    label="Contact Phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField
                    id="editGstin"
                    label="GSTIN"
                    value={editForm.gstin}
                    onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                  />
                  <FormField
                    id="editWebsite"
                    label="Website URL"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  />
                </div>

                <FormField
                  id="editAddress"
                  as="textarea"
                  label="Address / Location"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={2}
                />

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingCompany(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Reset Password Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {
        resettingCompany && (
          <div
            className="gv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gv-modal-box"
              style={{
                maxWidth: '460px',
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                padding: '24px',
                borderTop: '5px solid #FF9800',
              }}
            >
              {resetSuccessCreds ? (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: '#E8F5E9',
                      color: '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      margin: '0 auto 12px auto',
                    }}
                  >
                    ✓
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gv-primary, #563828)', marginBottom: '8px' }}>
                    Password Reset Successful
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px' }}>
                    Temporary password generated for <strong>{resetSuccessCreds.email}</strong>.
                  </p>

                  <div
                    style={{
                      backgroundColor: '#F5F5F5',
                      padding: '12px',
                      borderRadius: '4px',
                      marginBottom: '16px',
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#C62828',
                    }}
                  >
                    {resetSuccessCreds.temporaryPassword}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(resetSuccessCreds.temporaryPassword)}
                    >
                      {copied ? 'Copied! ✓' : '📋 Copy Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setResettingCompany(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gv-primary, #563828)' }}>
                    Reset Password for {resettingCompany.companyName}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px' }}>
                    Account: <strong>{resettingCompany.email}</strong>. The company will be forced to rotate this password on login.
                  </p>

                  {resetErrors.form && (
                    <div
                      className="gv-form-error"
                      style={{
                        backgroundColor: '#FFEBEE',
                        color: '#C62828',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '0.84rem',
                        marginBottom: '14px',
                      }}
                    >
                      ⚠️ {resetErrors.form}
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit}>
                    <FormField
                      id="newPassword"
                      label="Specific 8-Char Password (Optional)"
                      type="password"
                      value={resetForm.newPassword}
                      onChange={(e) => {
                        setResetForm({ ...resetForm, newPassword: e.target.value });
                        if (resetErrors.newPassword) setResetErrors({ ...resetErrors, newPassword: '' });
                      }}
                      placeholder="Leave empty for auto-generated"
                      error={resetErrors.newPassword}
                      maxLength={8}
                      helpText="Leave empty to auto-generate a secure 8-character password."
                    />

                    <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="resetSendEmail"
                        checked={resetForm.sendEmail}
                        onChange={(e) => setResetForm({ ...resetForm, sendEmail: e.target.checked })}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="resetSendEmail" style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                        Send new temporary credentials via Brevo Email
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setResettingCompany(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={actionLoading}
                        disabled={actionLoading}
                      >
                        Reset Password
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: Delete Confirmation */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {
        deletingCompany && (
          <div
            className="gv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gv-modal-box"
              style={{
                maxWidth: '420px',
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                padding: '24px',
                textAlign: 'center',
                borderTop: '5px solid #D32F2F',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#C62828', marginBottom: '8px' }}>
                Confirm Company Deletion
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '20px' }}>
                Are you sure you want to delete corporate account <strong>{deletingCompany.companyName}</strong>?
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeletingCompany(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  style={{ backgroundColor: '#D32F2F', color: '#FFF' }}
                  onClick={handleDeleteConfirm}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Delete Permanently
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </DashboardLayout >
  );
}
