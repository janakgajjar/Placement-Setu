import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states for profile fields
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    course: '',
    institution: '',
    graduationYear: '',
    apparId: '',
    cgpa: '',
    backlogs: '',
    address: '',
    linkedinUrl: '',
    githubUrl: '',
  });

  // Skills state
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // Projects state
  const [newProject, setNewProject] = useState({ title: '', description: '', projectUrl: '' });
  const [addingProject, setAddingProject] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Certifications state
  const [newCert, setNewCert] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    credentialUrl: '',
  });
  const [addingCert, setAddingCert] = useState(false);
  const [certToDelete, setCertToDelete] = useState(null);
  const [deletingCert, setDeletingCert] = useState(false);

  const loadProfile = async () => {
    try {
      const response = await api.student.getDashboard();
      const p = response.data?.profile;
      if (p) {
        setProfile(p);
        setFormData({
          fullName: p.fullName || '',
          phone: p.phone || '',
          gender: p.gender || '',
          course: p.course || '',
          institution: p.institution || '',
          graduationYear: p.graduationYear !== null && p.graduationYear !== undefined ? String(p.graduationYear) : '',
          apparId: p.apparId || '',
          cgpa: p.cgpa !== null && p.cgpa !== undefined ? String(p.cgpa) : '',
          backlogs: p.backlogs !== null && p.backlogs !== undefined ? String(p.backlogs) : '',
          address: p.address || '',
          linkedinUrl: p.linkedinUrl || '',
          githubUrl: p.githubUrl || '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSavingProfile(true);

    try {
      const payload = {
        fullName: formData.fullName.trim() || null,
        phone: formData.phone.trim() || null,
        gender: formData.gender.trim() || null,
        course: formData.course.trim() || null,
        institution: formData.institution.trim() || null,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear, 10) : null,
        apparId: formData.apparId.trim() || null,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
        backlogs: formData.backlogs !== '' ? parseInt(formData.backlogs, 10) : null,
        address: formData.address.trim() || null,
        linkedinUrl: formData.linkedinUrl.trim() || null,
        githubUrl: formData.githubUrl.trim() || null,
      };

      const response = await api.student.updateProfile(payload);
      setProfile(response.data);
      setSuccessMessage('Profile information saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Add skill
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    setAddingSkill(true);
    setError(null);
    try {
      const response = await api.student.addSkill(newSkill.trim());
      setProfile(response.data);
      setNewSkill('');
      setSuccessMessage('Skill added successfully.');
    } catch (err) {
      setError(err.message || 'Failed to add skill.');
    } finally {
      setAddingSkill(false);
    }
  };

  // Add project
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;

    setAddingProject(true);
    setError(null);
    try {
      await api.student.addProject({
        title: newProject.title.trim(),
        description: newProject.description.trim() || null,
        projectUrl: newProject.projectUrl.trim() || null,
      });
      setNewProject({ title: '', description: '', projectUrl: '' });
      await loadProfile();
      setSuccessMessage('Project added successfully.');
    } catch (err) {
      setError(err.message || 'Failed to add project.');
    } finally {
      setAddingProject(false);
    }
  };

  // Delete project
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeletingProject(true);
    try {
      await api.student.removeProject(projectToDelete.id);
      setProjectToDelete(null);
      await loadProfile();
      setSuccessMessage('Project removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove project.');
    } finally {
      setDeletingProject(false);
    }
  };

  // Add certification
  const handleAddCert = async (e) => {
    e.preventDefault();
    if (!newCert.name.trim()) return;

    setAddingCert(true);
    setError(null);
    try {
      await api.student.addCertification({
        name: newCert.name.trim(),
        issuingOrganization: newCert.issuingOrganization.trim() || null,
        issueDate: newCert.issueDate || null,
        credentialUrl: newCert.credentialUrl.trim() || null,
      });
      setNewCert({ name: '', issuingOrganization: '', issueDate: '', credentialUrl: '' });
      await loadProfile();
      setSuccessMessage('Certification added successfully.');
    } catch (err) {
      setError(err.message || 'Failed to add certification.');
    } finally {
      setAddingCert(false);
    }
  };

  // Delete certification
  const handleConfirmDeleteCert = async () => {
    if (!certToDelete) return;
    setDeletingCert(true);
    try {
      await api.student.removeCertification(certToDelete.id);
      setCertToDelete(null);
      await loadProfile();
      setSuccessMessage('Certification removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove certification.');
    } finally {
      setDeletingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <Spinner size="lg" text="Loading student profile..." />
      </div>
    );
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">STUDENT PORTAL</p>
          <h1 className="page-title">Placement Profile</h1>
          <p className="page-subtitle">
            Keep your academic records, technical skills, and portfolio up to date.
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

      {/* 1. Academic & Personal Information */}
      <section className="profile-section card">
        <div className="card-header">
          <div>
            <h3>Academic &amp; Personal Details</h3>
            <p className="section-desc">Essential records verified by the Placement Cell.</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="profile-form">
          <div className="form-row-grid">
            <FormField
              id="prof-fullname"
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              disabled={savingProfile}
            />

            <FormField
              id="prof-email"
              label="Account Email"
              value={profile?.email || ''}
              disabled
              hint="Account email cannot be modified directly"
            />
          </div>

          <div className="form-row-grid">
            <FormField
              id="prof-phone"
              label="Contact Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 9876543210"
              disabled={savingProfile}
            />

            <FormField
              id="prof-gender"
              label="Gender"
              type="select"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              disabled={savingProfile}
              options={[
                { value: '', label: 'Select gender' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <div className="form-row-grid">
            <FormField
              id="prof-course"
              label="Course / Program"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              placeholder="e.g. Master of Computer Applications (MCA)"
              disabled={savingProfile}
            />

            <FormField
              id="prof-institution"
              label="Institution / Department"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g. Gujarat Vidyapith, Sadra / Randheja"
              disabled={savingProfile}
            />
          </div>

          <div className="form-row-grid">
            <FormField
              id="prof-gradyear"
              label="Graduation Year"
              type="number"
              value={formData.graduationYear}
              onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
              placeholder="e.g. 2026"
              disabled={savingProfile}
            />

            <FormField
              id="prof-appar"
              label="APAAR ID"
              value={formData.apparId}
              onChange={(e) => setFormData({ ...formData, apparId: e.target.value })}
              placeholder="Automated Permanent Academic Account Registry ID"
              hint="Plain text input as supported by current backend; no third-party verification"
              disabled={savingProfile}
            />
          </div>

          <div className="form-row-grid">
            <FormField
              id="prof-cgpa"
              label="Current CGPA (0.0 to 10.0)"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={formData.cgpa}
              onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
              placeholder="e.g. 8.45"
              disabled={savingProfile}
            />

            <FormField
              id="prof-backlogs"
              label="Active Backlogs"
              type="number"
              min="0"
              value={formData.backlogs}
              onChange={(e) => setFormData({ ...formData, backlogs: e.target.value })}
              placeholder="0"
              disabled={savingProfile}
            />
          </div>

          <FormField
            id="prof-address"
            label="Residential Address"
            type="textarea"
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Address for placement communications"
            disabled={savingProfile}
          />

          <div className="form-row-grid">
            <FormField
              id="prof-linkedin"
              label="LinkedIn Profile URL"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              disabled={savingProfile}
            />

            <FormField
              id="prof-github"
              label="GitHub Profile URL"
              type="url"
              value={formData.githubUrl}
              onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
              placeholder="https://github.com/username"
              disabled={savingProfile}
            />
          </div>

          <div className="form-actions">
            <Button type="submit" loading={savingProfile} disabled={savingProfile}>
              Save Academic Details
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Technical Skills */}
      <section className="profile-section card">
        <div className="card-header">
          <div>
            <h3>Technical &amp; Domain Skills</h3>
            <p className="section-desc">Highlight technologies, frameworks, and tools you know.</p>
          </div>
        </div>

        <form onSubmit={handleAddSkill} className="inline-add-form">
          <FormField
            id="new-skill-input"
            label="Add Skill"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="e.g. React, Spring Boot, PostgreSQL, Java"
            disabled={addingSkill}
          />
          <Button type="submit" loading={addingSkill} disabled={addingSkill || !newSkill.trim()}>
            Add Skill
          </Button>
        </form>

        <div className="skills-container">
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="tag-cloud">
              {profile.skills.map((skill, index) => (
                <span className="skill-tag" key={index}>
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-hint">No skills listed yet. Add skills to improve recruiter matches.</p>
          )}

          <div className="info-callout">
            <small>
              ℹ️ <strong>Note on Skill Management:</strong> Adding skills is saved directly to your
              profile. The current backend returns skills as name values; deleting specific skills
              will be supported when individual skill identifiers are returned in the response.
            </small>
          </div>
        </div>
      </section>

      {/* 3. Academic & Personal Projects */}
      <section className="profile-section card">
        <div className="card-header">
          <div>
            <h3>Projects</h3>
            <p className="section-desc">Practical coursework, capstone, or personal software work.</p>
          </div>
        </div>

        {/* Existing Projects List */}
        {profile?.projects && profile.projects.length > 0 ? (
          <div className="item-list">
            {profile.projects.map((proj) => (
              <div className="item-card" key={proj.id}>
                <div className="item-content">
                  <h4>{proj.title}</h4>
                  {proj.description && <p>{proj.description}</p>}
                  {proj.projectUrl && (
                    <a
                      href={proj.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="external-link"
                    >
                      View Project Repository / Live URL ↗
                    </a>
                  )}
                </div>
                <div className="item-actions">
                  <button
                    className="button-link button-link--danger"
                    type="button"
                    onClick={() => setProjectToDelete(proj)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-hint">No projects added yet.</p>
        )}

        {/* Add Project Form */}
        <div className="add-subform">
          <h4>Add New Project</h4>
          <form onSubmit={handleAddProject} className="subform">
            <FormField
              id="proj-title"
              label="Project Title"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              placeholder="e.g. Gujarati Sentiment Analysis Model"
              required
              disabled={addingProject}
            />

            <FormField
              id="proj-desc"
              label="Description"
              type="textarea"
              rows={2}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Key technologies, problem statement, and outcomes"
              disabled={addingProject}
            />

            <FormField
              id="proj-url"
              label="Project URL / Repository"
              type="url"
              value={newProject.projectUrl}
              onChange={(e) => setNewProject({ ...newProject, projectUrl: e.target.value })}
              placeholder="https://github.com/..."
              disabled={addingProject}
            />

            <Button
              type="submit"
              variant="secondary"
              loading={addingProject}
              disabled={addingProject || !newProject.title.trim()}
            >
              Add Project
            </Button>
          </form>
        </div>
      </section>

      {/* 4. Certifications */}
      <section className="profile-section card">
        <div className="card-header">
          <div>
            <h3>Certifications</h3>
            <p className="section-desc">Course certifications and verified achievements.</p>
          </div>
        </div>

        {profile?.certifications && profile.certifications.length > 0 ? (
          <div className="item-list">
            {profile.certifications.map((cert) => (
              <div className="item-card" key={cert.id}>
                <div className="item-content">
                  <h4>{cert.name}</h4>
                  <p>
                    {cert.issuingOrganization && (
                      <span>Issued by: {cert.issuingOrganization}</span>
                    )}
                    {cert.issueDate && <span> · Date: {cert.issueDate}</span>}
                  </p>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="external-link"
                    >
                      Verify Credential ↗
                    </a>
                  )}
                </div>
                <div className="item-actions">
                  <button
                    className="button-link button-link--danger"
                    type="button"
                    onClick={() => setCertToDelete(cert)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-hint">No certifications recorded yet.</p>
        )}

        <div className="add-subform">
          <h4>Add Certification</h4>
          <form onSubmit={handleAddCert} className="subform">
            <div className="form-row-grid">
              <FormField
                id="cert-name"
                label="Certification Name"
                value={newCert.name}
                onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                placeholder="e.g. AWS Certified Cloud Practitioner"
                required
                disabled={addingCert}
              />

              <FormField
                id="cert-org"
                label="Issuing Organization"
                value={newCert.issuingOrganization}
                onChange={(e) => setNewCert({ ...newCert, issuingOrganization: e.target.value })}
                placeholder="e.g. Amazon Web Services, NPTEL, Coursera"
                disabled={addingCert}
              />
            </div>

            <div className="form-row-grid">
              <FormField
                id="cert-date"
                label="Issue Date"
                type="date"
                value={newCert.issueDate}
                onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                disabled={addingCert}
              />

              <FormField
                id="cert-url"
                label="Credential Verification URL"
                type="url"
                value={newCert.credentialUrl}
                onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                placeholder="https://..."
                disabled={addingCert}
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              loading={addingCert}
              disabled={addingCert || !newCert.name.trim()}
            >
              Add Certification
            </Button>
          </form>
        </div>
      </section>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        message={`Are you sure you want to remove "${projectToDelete?.title}" from your profile?`}
        confirmLabel="Remove Project"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
        loading={deletingProject}
      />

      <ConfirmModal
        isOpen={!!certToDelete}
        title="Delete Certification"
        message={`Are you sure you want to remove "${certToDelete?.name}"?`}
        confirmLabel="Remove Certification"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteCert}
        onCancel={() => setCertToDelete(null)}
        loading={deletingCert}
      />
    </div>
  );
}
