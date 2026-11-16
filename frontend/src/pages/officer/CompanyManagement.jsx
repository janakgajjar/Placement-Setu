import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Provisioning Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionData, setProvisionData] = useState({
    companyName: '',
    email: '',
    temporaryPassword: '',
    gstin: '',
    phone: '',
    website: '',
    address: '',
  });
  const [provisionErrors, setProvisionErrors] = useState({});

  // Edit Modal State
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({
    companyName: '',
    gstin: '',
    phone: '',
    website: '',
    address: '',
  });

  const fetchCompanies = async (page = 0, status = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.officer.getCompanies({
        status: status || undefined,
        page,
        size: 15,
      });
      const pageData = response.data;
      setCompanies(pageData?.content || []);
      setTotalPages(pageData?.totalPages || 1);
      setCurrentPage(pageData?.number || 0);
    } catch (err) {
      setError(err.message || 'Failed to load company directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(0, statusFilter);
  }, [statusFilter]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(0);
  };

  // Validate provisioning form
  const validateProvision = () => {
    const errs = {};
    if (!provisionData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!provisionData.email.trim()) errs.email = 'Corporate email is required';
    if (!provisionData.temporaryPassword || provisionData.temporaryPassword.length < 8) {
      errs.temporaryPassword = 'Temporary password must be at least 8 characters';
    }
    setProvisionErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle provision submit
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!validateProvision()) return;

    setProvisioning(true);
    setError(null);
    try {
      await api.officer.provisionCompany({
        companyName: provisionData.companyName.trim(),
        email: provisionData.email.trim(),
        temporaryPassword: provisionData.temporaryPassword,
        gstin: provisionData.gstin.trim() || null,
        phone: provisionData.phone.trim() || null,
        website: provisionData.website.trim() || null,
        address: provisionData.address.trim() || null,
      });

      setSuccessMessage(`Organization "${provisionData.companyName}" provisioned successfully.`);
      setShowProvisionModal(false);
      setProvisionData({
        companyName: '',
        email: '',
        temporaryPassword: '',
        gstin: '',
        phone: '',
        website: '',
        address: '',
      });
      await fetchCompanies(currentPage, statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to provision company.');
    } finally {
      setProvisioning(false);
    }
  };

  // Open edit modal
  const openEditModal = (company) => {
    setCompanyToEdit(company);
    setEditData({
      companyName: company.companyName || '',
      gstin: company.gstin || '',
      phone: company.phone || '',
      website: company.website || '',
      address: company.address || '',
    });
  };

  // Handle update submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!companyToEdit) return;

    setUpdating(true);
    setError(null);
    try {
      await api.officer.updateCompany(companyToEdit.id, {
        companyName: editData.companyName.trim() || null,
        gstin: editData.gstin.trim() || null,
        phone: editData.phone.trim() || null,
        website: editData.website.trim() || null,
        address: editData.address.trim() || null,
      });

      setSuccessMessage(`Company records updated for "${editData.companyName}".`);
      setCompanyToEdit(null);
      await fetchCompanies(currentPage, statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to update company.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">PLACEMENT CELL DIRECTORY</p>
          <h1 className="page-title">Company Management</h1>
          <p className="page-subtitle">
            Manage recruiter profiles, update details, or provision new accounts.
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setShowProvisionModal(true)}>+ Provision Company</Button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {successMessage && (
        <div className="alert-banner alert-banner--success" role="status">
          <span className="alert-banner__icon">✓</span>
          <p className="alert-banner__title">{successMessage}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-bar">
        <div className="tab-group" role="tablist">
          <button
            type="button"
            className={`tab-btn ${statusFilter === '' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('')}
          >
            All Organizations
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'ACTIVE' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('ACTIVE')}
          >
            Active
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'PENDING' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('PENDING')}
          >
            Pending
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'REJECTED' ? 'tab-btn--active' : ''}`}
            onClick={() => handleFilterChange('REJECTED')}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="table-loading-wrap">
          <Spinner text="Loading companies..." />
        </div>
      ) : companies.length > 0 ? (
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.companyName}</strong>
                    {company.address && (
                      <span className="table-subtext">{company.address.slice(0, 35)}...</span>
                    )}
                  </td>
                  <td>{company.email || '—'}</td>
                  <td>
                    <span className="gstin-badge">{company.gstin || 'None'}</span>
                  </td>
                  <td>{company.phone || '—'}</td>
                  <td>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="external-link"
                      >
                        Site ↗
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <StatusBadge status={company.accountStatus || 'PENDING'} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button-link"
                      onClick={() => openEditModal(company)}
                    >
                      Edit Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="pagination-buttons">
                <Button
                  variant="secondary"
                  className="button--sm"
                  disabled={currentPage === 0}
                  onClick={() => fetchCompanies(currentPage - 1, statusFilter)}
                >
                  ← Previous
                </Button>
                <Button
                  variant="secondary"
                  className="button--sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => fetchCompanies(currentPage + 1, statusFilter)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-panel card">
          <p>No companies found matching the selected filter.</p>
          <Button onClick={() => setShowProvisionModal(true)}>Provision an Organization</Button>
        </div>
      )}

      {/* Provision Company Modal */}
      {showProvisionModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--lg">
            <h3 className="modal-title">Provision New Company Account</h3>
            <p className="modal-message">
              Directly create a user account and verified company profile with temporary credentials.
            </p>

            <form onSubmit={handleProvisionSubmit} className="modal-form">
              <FormField
                id="prov-name"
                label="Company Name"
                value={provisionData.companyName}
                onChange={(e) =>
                  setProvisionData({ ...provisionData, companyName: e.target.value })
                }
                required
                error={provisionErrors.companyName}
                disabled={provisioning}
              />

              <div className="form-row-grid">
                <FormField
                  id="prov-email"
                  label="Official Account Email"
                  type="email"
                  value={provisionData.email}
                  onChange={(e) =>
                    setProvisionData({ ...provisionData, email: e.target.value })
                  }
                  required
                  error={provisionErrors.email}
                  disabled={provisioning}
                />

                <FormField
                  id="prov-pass"
                  label="Temporary Password"
                  type="text"
                  value={provisionData.temporaryPassword}
                  onChange={(e) =>
                    setProvisionData({ ...provisionData, temporaryPassword: e.target.value })
                  }
                  hint="At least 8 characters (share securely with recruiter)"
                  required
                  error={provisionErrors.temporaryPassword}
                  disabled={provisioning}
                />
              </div>

              <div className="form-row-grid">
                <FormField
                  id="prov-gstin"
                  label="GSTIN"
                  value={provisionData.gstin}
                  onChange={(e) =>
                    setProvisionData({ ...provisionData, gstin: e.target.value })
                  }
                  disabled={provisioning}
                />

                <FormField
                  id="prov-phone"
                  label="Phone Number"
                  type="tel"
                  value={provisionData.phone}
                  onChange={(e) =>
                    setProvisionData({ ...provisionData, phone: e.target.value })
                  }
                  disabled={provisioning}
                />
              </div>

              <FormField
                id="prov-website"
                label="Website"
                type="url"
                value={provisionData.website}
                onChange={(e) =>
                  setProvisionData({ ...provisionData, website: e.target.value })
                }
                disabled={provisioning}
              />

              <FormField
                id="prov-address"
                label="Office Address"
                type="textarea"
                rows={2}
                value={provisionData.address}
                onChange={(e) =>
                  setProvisionData({ ...provisionData, address: e.target.value })
                }
                disabled={provisioning}
              />

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setShowProvisionModal(false)}
                  disabled={provisioning}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={provisioning} disabled={provisioning}>
                  Provision Organization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {companyToEdit && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 className="modal-title">Edit Company Details</h3>
            <p className="modal-message">
              Update institutional records for "{companyToEdit.companyName}".
            </p>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <FormField
                id="edit-name"
                label="Company Name"
                value={editData.companyName}
                onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                disabled={updating}
              />

              <div className="form-row-grid">
                <FormField
                  id="edit-gstin"
                  label="GSTIN"
                  value={editData.gstin}
                  onChange={(e) => setEditData({ ...editData, gstin: e.target.value })}
                  disabled={updating}
                />

                <FormField
                  id="edit-phone"
                  label="Phone"
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  disabled={updating}
                />
              </div>

              <FormField
                id="edit-website"
                label="Website"
                type="url"
                value={editData.website}
                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                disabled={updating}
              />

              <FormField
                id="edit-address"
                label="Address"
                type="textarea"
                rows={2}
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                disabled={updating}
              />

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setCompanyToEdit(null)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={updating} disabled={updating}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
