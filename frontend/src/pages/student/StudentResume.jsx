import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { ROUTES } from '../../lib/routes';
import api from '../../lib/api';

export default function StudentResume() {
  const [resume, setResume] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [error, setError] = useState(null);

  async function loadResumeMeta() {
    try {
      const res = await api.resume.getMetadata();
      if (res?.data) {
        setResume(res.data);
      }
    } catch {
      // Ignored if no resume uploaded yet
    }
  }

  useEffect(() => {
    loadResumeMeta();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF or DOCX resume file.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await api.resume.upload(file);
      const data = res?.data;
      if (data) {
        setResume(data);
        const fields = data.autoFilledFields || [];
        setAutoFilledFields(fields);
        setShowSuccess(true);

        // Immediate single-source-of-truth broadcast to student profile & dashboard
        if (data.updatedProfile) {
          window.dispatchEvent(new CustomEvent('student:profile-updated', { detail: data.updatedProfile }));
        }
      }
      await loadResumeMeta();
    } catch (err) {
      setError(err.message || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout
      title="AI-Powered Resume Manager"
      breadcrumbs={[{ label: 'Student Workspace' }, { label: 'Resume' }]}
    >
      {/* Success Modal Matching Screenshot 2c1c4a48.png */}
      <Modal
        isOpen={showSuccess}
        title="Success"
        message={
          autoFilledFields.length > 0
            ? `Successfully parsed resume with Gemini AI! The following profile KYC fields were automatically populated: ${autoFilledFields.join(', ')}.`
            : 'Successfully uploaded resume! Your placement profile is now recruiter-visible.'
        }
        type="success"
        confirmText="View Profile KYC →"
        onConfirm={() => {
          setShowSuccess(false);
          window.location.href = ROUTES.STUDENT_PROFILE;
        }}
      />

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {autoFilledFields.length > 0 && !showSuccess && (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            border: '1.5px solid #81C784',
            borderRadius: '6px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}
        >
          <strong style={{ color: '#2E7D32', fontSize: '0.95rem' }}>
             AI Profile Auto-Fill Completed
          </strong>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#1B5E20' }}>
            Auto-populated from resume: <strong>{autoFilledFields.join(', ')}</strong>.
            Review your details in <Link to={ROUTES.STUDENT_PROFILE} style={{ textDecoration: 'underline', fontWeight: 600 }}>Student Profile KYC</Link>.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Upload Card */}
        <Card title="Upload New Resume Document">
          <p style={{ fontSize: '0.85rem', color: 'var(--gv-text-muted)', marginBottom: '20px' }}>
            Supported formats: <strong>PDF, DOCX, TXT</strong> (Max: 10MB). 
            Our institutional Gemini AI parser reads your resume securely to auto-populate your verified candidate profile.
          </p>

          <form onSubmit={handleUpload}>
            <div
              style={{
                border: '2px dashed var(--gv-border)',
                borderRadius: '6px',
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--gv-bg-ivory)',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}></div>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ fontSize: '0.85rem' }}
              />
              {file && (
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--gv-sage-green-dark)', fontWeight: 600 }}>
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" fullWidth loading={uploading}>
              Upload &amp; Analyze with Gemini AI 
            </Button>
          </form>
        </Card>

        {/* Current Parsed Status Card */}
        <Card title="Current Resume Extraction Overview">
          {resume ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.8rem' }}></span>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--gv-primary-brown)' }}>
                    {resume.fileName || 'Curriculum Vitae'}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)' }}>
                    Uploaded on: {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Active'}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--gv-bg-sand)', padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--gv-primary-brown)', marginBottom: '8px' }}>
                  Processing Status:
                </h4>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gv-sage-green-dark)' }}>
                   {resume.processingStatus || 'COMPLETED'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to={ROUTES.STUDENT_PROFILE} className="gv-btn gv-btn--primary gv-btn--sm">
                  View Student Profile KYC 
                </Link>
                <Link to={ROUTES.DRIVES_EXPLORER} className="gv-btn gv-btn--secondary gv-btn--sm">
                  Apply for Drives
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--gv-text-subtle)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}></div>
              <p>No active resume on file. Upload a document to unlock corporate visibility.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
