import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import api from '../../lib/api';
import {
  validateFullName,
  validatePhone,
  validateWebsite,
} from '../../utils/validation';

export default function CompanyProfile() {
  const [profile, setProfile] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    gstin: '',
    phone: '',
    website: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.company.getProfile();
        if (res?.data) {
          setProfile({
            companyName: res.data.companyName || '',
            contactPerson: res.data.contactPerson || '',
            email: res.data.email || '',
            gstin: res.data.gstin || '',
            phone: res.data.phone || '',
            website: res.data.website || '',
            address: res.data.address || '',
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load company profile.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const validateField = (field, value) => {
    switch (field) {
      case 'contactPerson':
        return validateFullName(value);
      case 'phone':
        return validatePhone(value);
      case 'website':
        return validateWebsite(value);
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, profile[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'contactPerson') {
      val = val.replace(/[^a-zA-Z\s]/g, '').slice(0, 50);
    }

    const updated = { ...profile, [field]: val };
    setProfile(updated);

    if (touched[field] || fieldErrors[field]) {
      const err = validateField(field, val);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, [field]: null }));
      } else if (touched[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: err }));
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setTouched({ contactPerson: true, phone: true, website: true });

    const errs = {};
    const cpErr = validateField('contactPerson', profile.contactPerson);
    if (cpErr) errs.contactPerson = cpErr;

    const phoneErr = validateField('phone', profile.phone);
    if (phoneErr) errs.phone = phoneErr;

    if (profile.website?.trim()) {
      const webErr = validateField('website', profile.website);
      if (webErr) errs.website = webErr;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.company.updateProfile({
        contactPerson: profile.contactPerson.trim(),
        phone: profile.phone.trim(),
        website: profile.website?.trim() || null,
        address: profile.address?.trim() || null,
      });
      setShowSuccess(true);
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
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
           {error}
        </div>
      )}

      <Card title="Enterprise Profile &amp; Contact Details">
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gv-text-muted)' }}>
            Loading enterprise profile...
          </div>
        ) : (
          <form onSubmit={handleSave} noValidate>
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
                id="email"
                label="Registered HR Email"
                value={profile.email}
                disabled
                helpText="Primary login identifier"
              />

              <FormField
                id="contactPerson"
                label="Primary Contact Person / HR Lead"
                value={profile.contactPerson}
                maxLength={50}
                pattern="[a-zA-Z\s]+"
                onKeyDown={(e) => {
                  if (!/^[a-zA-Z ]$/.test(e.key) && e.key.length === 1) {
                    e.preventDefault();
                  }
                }}
                onBlur={() => handleBlur('contactPerson')}
                onChange={handleChange('contactPerson')}
                placeholder="e.g. Ramesh Patel"
                error={fieldErrors.contactPerson}
                helpText="Letters and spaces only (max 50 chars)"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <FormField
                id="phone"
                label="Recruiter Phone / Landline"
                type="tel"
                value={profile.phone}
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]{10}"
                onKeyDown={(e) => {
                  if (!/^[0-9]$/.test(e.key) && e.key.length === 1) {
                    e.preventDefault();
                  }
                }}
                onBlur={() => handleBlur('phone')}
                onChange={handleChange('phone')}
                placeholder="10-digit mobile number"
                error={fieldErrors.phone}
                required
                helpText="Exactly 10 digits"
              />

              <FormField
                id="website"
                label="Corporate Website URL"
                type="url"
                value={profile.website}
                maxLength={255}
                onBlur={() => handleBlur('website')}
                onChange={handleChange('website')}
                placeholder="https://company.com"
                error={fieldErrors.website}
                helpText="Optional"
              />
            </div>

            <FormField
              id="address"
              label="Corporate Registered Address"
              as="textarea"
              rows={3}
              value={profile.address}
              maxLength={255}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="Full postal address"
            />

            <div style={{ marginTop: '20px' }}>
              <Button type="submit" variant="primary" loading={saving}>
                Save Profile Changes →
              </Button>
            </div>
          </form>
        )}
      </Card>
    </DashboardLayout>
  );
}
