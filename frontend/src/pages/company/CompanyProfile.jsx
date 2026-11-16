import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    phone: '',
    website: '',
    address: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await api.company.getProfile();
        if (response?.data) {
          setProfile(response.data);
          setFormData({
            phone: response.data.phone || '',
            website: response.data.website || '',
            address: response.data.address || '',
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load company profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const response = await api.company.updateProfile({
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        address: formData.address.trim() || null,
      });

      setProfile(response.data);
      setSuccessMessage('Company profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading company profile..." />
      </div>
    );
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">RECRUITER SETTINGS</p>
          <h1 className="page-title">Company Profile</h1>
          <p className="page-subtitle">
            Manage your organization's verified contact details and location.
          </p>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {successMessage && (
        <div className="alert-banner alert-banner--success" role="status">
          <span className="alert-banner__icon">✓</span>
          <p className="alert-banner__title">{successMessage}</p>
        </div>
      )}

      <div className="card profile-section">
        <div className="card-header">
          <div>
            <h3>Official Organization Records</h3>
            <p className="section-desc">
              Legal registration fields (Company Name, Email, and GSTIN) are locked following institutional verification.
            </p>
          </div>
          <StatusBadge status={profile?.accountStatus} />
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row-grid">
            <FormField
              id="comp-name"
              label="Company Name"
              value={profile?.companyName || ''}
              disabled
              hint="Legal company name verified by Placement Officer"
            />

            <FormField
              id="comp-email"
              label="Corporate Email"
              value={profile?.email || ''}
              disabled
              hint="Account authentication email"
            />
          </div>

          <FormField
            id="comp-gstin"
            label="GSTIN Number"
            value={profile?.gstin || ''}
            disabled
            hint="Tax registration identifier submitted during onboarding"
          />

          <hr className="form-divider" />

          <h4>Editable Contact Details</h4>

          <div className="form-row-grid">
            <FormField
              id="comp-phone"
              label="Contact Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 9876543210"
              disabled={saving}
            />

            <FormField
              id="comp-website"
              label="Official Website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://acme.com"
              disabled={saving}
            />
          </div>

          <FormField
            id="comp-address"
            label="Registered Address"
            type="textarea"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Complete office address"
            disabled={saving}
          />

          <div className="form-actions">
            <Button type="submit" loading={saving} disabled={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
