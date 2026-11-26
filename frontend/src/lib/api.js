/**
 * Placement Setu — REST API Client
 * Connects to Spring Boot 3 Backend at /api/v1
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Token Storage
const ACCESS_TOKEN_KEY = 'ps_access_token';
const REFRESH_TOKEN_KEY = 'ps_refresh_token';
const USER_KEY = 'ps_user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Reset all auth-dependent and user-scoped caches
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('ps_applied_drives')) {
        localStorage.removeItem(key);
      }
    });
  } catch { }
}

// Request Helper
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Add Content-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Bearer Token if present
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized (Attempt Silent Refresh or Invalidate Session)
    if (response.status === 401) {
      const isAuthEndpoint = endpoint.includes('/auth/');
      const refreshToken = getRefreshToken();

      if (!options._retry && !isAuthEndpoint && refreshToken) {
        options._retry = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshJson = await refreshRes.json();
            const authData = refreshJson.data;
            if (authData?.accessToken) {
              setAuthSession({
                accessToken: authData.accessToken,
                refreshToken: authData.refreshToken || refreshToken,
              });
              headers.set('Authorization', `Bearer ${authData.accessToken}`);
              return request(endpoint, { ...options, headers });
            }
          }
        } catch {
          // Token refresh attempt failed
        }
      }

      const json = await response.json().catch(() => ({}));

      // For auth endpoints (login/register), preserve backend error message (e.g. "Invalid email or password")
      if (isAuthEndpoint) {
        const message = json.message || json.error || 'Invalid email or password';
        const err = new Error(message);
        err.status = 401;
        err.data = json;
        throw err;
      }

      clearAuthSession();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      const err = new Error(json.message || 'Session expired or unauthorized. Please sign in again.');
      err.status = 401;
      err.data = json;
      throw err;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true, data: null };
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      let message = json.message || json.error;
      if (response.status >= 500) {
        message = 'Server unavailable';
      } else if (!message) {
        message = `Request failed (${response.status})`;
      }
      const err = new Error(message);
      err.status = response.status;
      err.data = json;
      throw err;
    }

    return json;
  } catch (error) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      const err = new Error('Server unavailable');
      err.status = 0;
      throw err;
    }
    throw error;
  }
}

export const api = {
  // Public Portal (no auth required)
  public: {
    getDrives: (params = '') => request(`/public/drives${params}`),
    getDrive: (id) => request(`/public/drives/${id}`),
    getCompanies: (params = '') => request(`/public/companies${params}`),
    getStats: () => request('/public/stats'),
  },

  // Auth
  auth: {
    login: (credentials) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    registerStudent: (data) =>
      request('/auth/register/student', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    changePassword: (data) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    refresh: (refreshToken) =>
      request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: async () => {
      const refreshToken = getRefreshToken();
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (e) {
        // Silent ignore if network/offline during logout
      } finally {
        clearAuthSession();
      }
    },
    forgotPassword: (data) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPassword: (data) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Current User
  user: {
    getMe: () => request('/users/me'),
  },

  // Student Profile
  student: {
    getDashboard: () => request('/students/me'),
    getProfile: () => request('/students/me/profile'),
    updateProfile: (data) =>
      request('/students/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    addSkill: (skill) =>
      request('/students/me/skills', {
        method: 'POST',
        body: JSON.stringify(typeof skill === 'string' ? { name: skill } : { name: skill.name || skill.skillName }),
      }),
    deleteSkill: (skillId) =>
      request(`/students/me/skills/${skillId}`, {
        method: 'DELETE',
      }),
    addProject: (data) =>
      request('/students/me/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteProject: (projectId) =>
      request(`/students/me/projects/${projectId}`, {
        method: 'DELETE',
      }),
    addCertification: (data) =>
      request('/students/me/certifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteCertification: (certId) =>
      request(`/students/me/certifications/${certId}`, {
        method: 'DELETE',
      }),
    submitProfile: () =>
      request('/students/me/submit', {
        method: 'POST',
      }),
  },

  // Resume Service
  resume: {
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/resumes/me', {
        method: 'POST',
        body: formData,
      });
    },
    getMetadata: () => request('/resumes/me'),
  },

  // Applications Tracking Pipeline
  application: {
    apply: (driveId) =>
      request('/applications', {
        method: 'POST',
        body: JSON.stringify({ driveId }),
      }),
    getMyApplications: () => request('/applications/me'),
    getMySummary: () => request('/applications/me/summary'),
    withdraw: (id) =>
      request(`/applications/${id}/withdraw`, {
        method: 'POST',
      }),
    updateStatus: (id, data) =>
      request(`/applications/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDriveApplicants: (driveId) => request(`/applications/drive/${driveId}`),
  },

  // Company
  company: {
    getProfile: () => request('/companies/me/profile'),
    updateProfile: (data) =>
      request('/companies/me/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getDrives: (params = '') => request(`/companies/me/drives${params}`),
    getDrive: (driveId) => request(`/companies/me/drives/${driveId}`),
    createDrive: (data) =>
      request('/companies/me/drives', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateDrive: (driveId, data) =>
      request(`/companies/me/drives/${driveId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    publishDrive: (driveId) =>
      request(`/companies/me/drives/${driveId}/publish`, {
        method: 'POST',
      }),
    closeDrive: (driveId) =>
      request(`/companies/me/drives/${driveId}/close`, {
        method: 'POST',
      }),
    deleteDrive: (driveId) =>
      request(`/companies/me/drives/${driveId}`, {
        method: 'DELETE',
      }),
    searchCandidates: (params = '') => request(`/companies/me/candidates${params}`),
    getDriveCandidates: (driveId, params = '') => request(`/companies/me/drives/${driveId}/candidates${params}`),
  },

  // Placement Officer & Admin
  officer: {
    getDrives: (params = '') => request(`/placement-officers/drives${params}`),
    approveDrive: (driveId) =>
      request(`/placement-officers/drives/${driveId}/approve`, {
        method: 'POST',
      }),
    rejectDrive: (driveId, reason) =>
      request(`/placement-officers/drives/${driveId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getPendingCompanies: () => request('/admin/companies/pending'),
    approveCompany: (companyId) =>
      request(`/admin/companies/${companyId}/approve`, {
        method: 'POST',
      }),
    rejectCompany: (companyId, reason = '') =>
      request(`/admin/companies/${companyId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getAllCompanies: (params = '') =>
      request(`/placement-officers/me/companies${params}`),
    provisionCompany: (data) =>
      request('/placement-officers/me/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCompany: (companyId) =>
      request(`/placement-officers/me/companies/${companyId}`),
    updateCompany: (companyId, data) =>
      request(`/placement-officers/me/companies/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    activateCompany: (companyId) =>
      request(`/placement-officers/me/companies/${companyId}/activate`, {
        method: 'POST',
      }),
    deactivateCompany: (companyId) =>
      request(`/placement-officers/me/companies/${companyId}/deactivate`, {
        method: 'POST',
      }),
    resetCompanyPassword: (companyId, data = {}) =>
      request(`/placement-officers/me/companies/${companyId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteCompany: (companyId) =>
      request(`/placement-officers/me/companies/${companyId}`, {
        method: 'DELETE',
      }),
    getStudentProfiles: (params = '') =>
      request(`/placement-officers/students${params}`),
    approveStudentProfile: (profileId) =>
      request(`/placement-officers/students/${profileId}/approve`, {
        method: 'POST',
      }),
    requestProfileChanges: (profileId, remarks) =>
      request(`/placement-officers/students/${profileId}/request-changes`, {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      }),
  },

  // Admin Audit Logs
  admin: {
    getAuditLogs: (params = '') => request(`/admin/audit-logs${params}`),
    getAuditLog: (logId) => request(`/admin/audit-logs/${logId}`),
  },

  // In-App Notifications
  notifications: {
    list: (unreadOnly = false, page = 0, size = 15) =>
      request(`/notifications?unreadOnly=${unreadOnly}&page=${page}&size=${size}`),
    markAsRead: (notificationId) =>
      request(`/notifications/${notificationId}/read`, {
        method: 'POST',
      }),
  },
};

export default api;
