import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import api from '../../lib/api';

export default function CompanyProfile() {
  const [profile, setProfile] = useState({
    companyName: '',
    gstin: '',
    phone: '',
    website: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.company.getProfile();
        if (res?.data) {
          setProfile({
            companyName: res.data.companyName || '',
            gstin: res.data.gstin || '',
            phone: res.data.phone || '',
            website: res.data.website || '',
            address: res.data.address || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.id]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.company.updateProfile({
        phone: profile.phone,
        website: profile.website,
        address: profile.address,
      });
      setShowSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Corporate Recruiter Profile"
      breadcrumbs={[{ label: 'Recruiter Workspace' }, { label: 'Corporate Profile' }]}
    >
      <Modal
        isOpen={showSuccess}
        title="Corporate Profile Saved"
        message="Your enterprise contact information and address have been updated."
        onConfirm={() => setShowSuccess(false)}
      />

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <Card title="Enterprise Profile &amp; Contact Details">
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormField
              id="companyName"
              label="Enterprise Legal Name"
              value={profile.companyName}
              disabled
              helpText="Verified by university placement administration"
            />

            <FormField
              id="gstin"
              label="Corporate GSTIN"
              value={profile.gstin}
              disabled
              helpText="Verified institutional tax identification"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormField
              id="phone"
              label="Recruiter Phone / Landline"
              value={profile.phone}
              onChange={handleChange}
              required
            />

            <FormField
              id="website"
              label="Corporate Website URL"
              type="url"
              value={profile.website}
              onChange={handleChange}
            />
          </div>

          <FormField
            id="address"
            label="Corporate Registered Address"
            as="textarea"
            rows={3}
            value={profile.address}
            onChange={handleChange}
          />

          <div style={{ marginTop: '20px' }}>
            <Button type="submit" variant="primary" loading={saving}>
              Save Profile Changes →
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
