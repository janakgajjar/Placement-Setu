import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB as configured in Spring Boot application.yml
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function ResumeUpload() {
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchResume = async () => {
    try {
      const response = await api.resume.getMyResume();
      if (response && response.data) {
        setResumeData(response.data);
      }
    } catch (err) {
      // 404 is normal if no resume uploaded yet
      if (err.status !== 404) {
        setError(err.message || 'Could not load existing resume.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
  }, []);

  const validateFile = (file) => {
    if (!file) return 'Please select a file to upload';

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return `Selected file (${sizeMB} MB) exceeds the maximum allowed limit of 10 MB.`;
    }

    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      return 'Invalid file type. Please upload a PDF (.pdf) or Word document (.doc, .docx).';
    }

    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.resume.uploadResume(selectedFile);
      setResumeData(response.data);
      setSelectedFile(null);
      setSuccessMessage('Resume uploaded and synchronized successfully.');
    } catch (err) {
      setError(err.message || 'Failed to upload resume. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Checking resume records..." />
      </div>
    );
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">STUDENT PORTAL</p>
          <h1 className="page-title">Resume Management</h1>
          <p className="page-subtitle">
            Upload your official curriculum vitae for placement drives and recruiter review.
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

      {/* Current Resume Status Card */}
      <div className="resume-grid">
        <article className="card resume-status-card">
          <div className="card-header">
            <h3>Current Active Resume</h3>
            {resumeData ? (
              <StatusBadge status={resumeData.processingStatus || 'COMPLETED'} />
            ) : (
              <StatusBadge status="PENDING" label="No Resume on File" />
            )}
          </div>

          {resumeData ? (
            <div className="data-list">
              <div className="data-row">
                <span className="data-label">File Name</span>
                <span className="data-value font-medium">{resumeData.fileName}</span>
              </div>
              <div className="data-row">
                <span className="data-label">File Type</span>
                <span className="data-value">{resumeData.fileType || 'Document'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">File Size</span>
                <span className="data-value">{formatFileSize(resumeData.fileSize)}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Upload Timestamp</span>
                <span className="data-value">{formatDate(resumeData.uploadedAt)}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Processing Status</span>
                <span className="data-value">{resumeData.processingStatus}</span>
              </div>
            </div>
          ) : (
            <div className="empty-resume-box">
              <span className="empty-icon" aria-hidden="true">
                📄
              </span>
              <p>You have not uploaded a placement resume yet.</p>
              <small>Uploading your resume is required to make your profile visible to hiring partners.</small>
            </div>
          )}
        </article>

        {/* Upload / Replace Resume Form */}
        <article className="card resume-upload-card">
          <div className="card-header">
            <h3>{resumeData ? 'Replace / Update Resume' : 'Upload Resume File'}</h3>
          </div>

          <form onSubmit={handleUpload} className="upload-form">
            <div
              className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="resume-file-input"
                type="file"
                className="dropzone-input"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="resume-file-input" className="dropzone-label">
                <span className="dropzone-icon" aria-hidden="true">
                  ⬆️
                </span>
                <span className="dropzone-prompt">
                  <strong>Click to select a file</strong> or drag and drop here
                </span>
                <span className="dropzone-hint">
                  PDF (.pdf) or Word (.doc, .docx) · Maximum size: 10 MB
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="selected-file-preview">
                <div className="selected-file-info">
                  <span className="file-icon">📎</span>
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <small>{formatFileSize(selectedFile.size)}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="button-link button-link--danger"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            )}

            <div className="upload-actions">
              <Button
                type="submit"
                className="button--full"
                loading={uploading}
                disabled={uploading || !selectedFile}
              >
                {uploading ? 'Uploading & Processing...' : 'Upload & Synchronize'}
              </Button>
            </div>

            <div className="institutional-notice">
              <small>
                Institutional Placement Standard: Resumes are stored on secure Gujarat Vidyapith servers
                and shared solely with authorized placement partners for verification and drive shortlisting.
              </small>
            </div>
          </form>
        </article>
      </div>
    </div>
  );
}
