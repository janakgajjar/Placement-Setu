/**
 * Placement Setu — Centralized API Client
 *
 * Communicates with the Spring Boot backend REST endpoints.
 * - Manages JWT access and refresh tokens via localStorage
 * - Automatically attaches Authorization Bearer headers
 * - Handles silent refresh on 401 Unauthorized
 * - Handles multipart/form-data correctly (browser-managed boundary)
 * - Structured error handling with user-facing messages
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const TOKEN_STORAGE_KEY = 'ps_access_token';
export const REFRESH_STORAGE_KEY = 'ps_refresh_token';
export const USER_STORAGE_KEY = 'ps_user';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Token helper methods
export const getAccessToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_STORAGE_KEY);
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthSession = ({ accessToken, refreshToken, user }) => {
  if (accessToken) localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Base HTTP request function
 */
export async function request(path, options = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type if body is FormData (browser will set multipart/form-data with boundary)
  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to Placement Setu server. Please verify your backend is running at ' + BASE_URL,
      0,
      networkError
    );
  }

  // Handle 401 Unauthorized with token refresh (for non-auth endpoints)
  if (response.status === 401 && !path.includes('/auth/')) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthSession();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshResponse.ok && refreshData.success && refreshData.data?.accessToken) {
          const newAccessToken = refreshData.data.accessToken;
          const newRefreshToken = refreshData.data.refreshToken || refreshToken;
          localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
          localStorage.setItem(REFRESH_STORAGE_KEY, newRefreshToken);
          isRefreshing = false;
          onRefreshed(newAccessToken);

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          return request(path, { ...options, headers });
        } else {
          isRefreshing = false;
          clearAuthSession();
          window.dispatchEvent(new Event('auth:unauthorized'));
          throw new ApiError('Session expired. Please log in again.', 401);
        }
      } catch (err) {
        isRefreshing = false;
        clearAuthSession();
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new ApiError('Session expired. Please log in again.', 401);
      }
    } else {
      // If already refreshing, wait for new token
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          resolve(request(path, { ...options, headers }));
        });
      });
    }
  }

  // Parse JSON response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred while processing your request.';
    let details = null;

    if (typeof data === 'object' && data !== null) {
      errorMessage = data.message || data.error || errorMessage;
      details = data.errors || data.details || null;
    } else if (typeof data === 'string' && data.length > 0) {
      errorMessage = data;
    }

    if (response.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (response.status === 404) {
      errorMessage = data.message || 'Requested resource not found.';
    } else if (response.status === 409) {
      errorMessage = data.message || 'A conflict occurred. The resource may already exist.';
    } else if (response.status === 413) {
      errorMessage = 'File too large. Maximum allowed size is 10 MB.';
    } else if (response.status === 415) {
      errorMessage = 'Unsupported media type.';
    }

    throw new ApiError(errorMessage, response.status, details);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Specific API Modules
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // Auth endpoints
  auth: {
    login: (credentials) =>
      request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    registerStudent: (payload) =>
      request('/api/v1/auth/register/student', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    registerCompany: (payload) =>
      request('/api/v1/auth/register/company', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    refresh: (refreshToken) =>
      request('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    logout: () =>
      request('/api/v1/auth/logout', {
        method: 'POST',
      }),
  },

  // Role-agnostic User endpoint
  user: {
    getMe: () => request('/api/v1/users/me'),
  },

  // Student profile and sections
  student: {
    getDashboard: () => request('/api/v1/students/me'),

    updateProfile: (data) =>
      request('/api/v1/students/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    addSkill: (name) =>
      request('/api/v1/students/me/skills', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),

    removeSkill: (skillId) =>
      request(`/api/v1/students/me/skills/${skillId}`, {
        method: 'DELETE',
      }),

    addProject: (data) =>
      request('/api/v1/students/me/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removeProject: (projectId) =>
      request(`/api/v1/students/me/projects/${projectId}`, {
        method: 'DELETE',
      }),

    addCertification: (data) =>
      request('/api/v1/students/me/certifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removeCertification: (certId) =>
      request(`/api/v1/students/me/certifications/${certId}`, {
        method: 'DELETE',
      }),
  },

  // Resume upload and view
  resume: {
    uploadResume: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/api/v1/resumes/me', {
        method: 'POST',
        body: formData,
      });
    },

    uploadResumeAsync: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/api/v1/resumes/me/async', {
        method: 'POST',
        body: formData,
      });
    },

    submitBatchResumes: (files, jobName) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      if (jobName) formData.append('jobName', jobName);
      return request('/api/v1/resumes/batch', {
        method: 'POST',
        body: formData,
      });
    },

    getBatchJob: (batchId) => request(`/api/v1/resumes/batch/${batchId}`),

    getMyResume: () => request('/api/v1/resumes/me'),
  },

  // Company profile and drives
  company: {
    getProfile: () => request('/api/v1/companies/me/profile'),

    updateProfile: (data) =>
      request('/api/v1/companies/me/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getDrives: ({ status, page = 0, size = 10 } = {}) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page);
      params.append('size', size);
      return request(`/api/v1/companies/me/drives?${params.toString()}`);
    },

    getDrive: (driveId) => request(`/api/v1/companies/me/drives/${driveId}`),

    createDrive: (data) =>
      request('/api/v1/companies/me/drives', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateDrive: (driveId, data) =>
      request(`/api/v1/companies/me/drives/${driveId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    publishDrive: (driveId) =>
      request(`/api/v1/companies/me/drives/${driveId}/publish`, {
        method: 'POST',
      }),

    closeDrive: (driveId) =>
      request(`/api/v1/companies/me/drives/${driveId}/close`, {
        method: 'POST',
      }),
  },

  // Placement Officer - Company management
  officer: {
    getCompanies: ({ status, page = 0, size = 20 } = {}) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page);
      params.append('size', size);
      return request(`/api/v1/placement-officers/me/companies?${params.toString()}`);
    },

    getCompany: (companyId) => request(`/api/v1/placement-officers/me/companies/${companyId}`),

    provisionCompany: (data) =>
      request('/api/v1/placement-officers/me/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCompany: (companyId, data) =>
      request(`/api/v1/placement-officers/me/companies/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Admin & Placement Officer - Company approvals
  admin: {
    getPendingCompanies: () => request('/api/v1/admin/companies/pending'),

    approveCompany: (companyId) =>
      request(`/api/v1/admin/companies/${companyId}/approve`, {
        method: 'POST',
      }),

    rejectCompany: (companyId) =>
      request(`/api/v1/admin/companies/${companyId}/reject`, {
        method: 'POST',
      }),
  },

  // In-app Notifications (Section 18)
  notifications: {
    getNotifications: ({ unread, page = 0, size = 20 } = {}) => {
      const params = new URLSearchParams();
      if (unread !== undefined && unread !== null) {
        params.append('unread', unread);
      }
      params.append('page', page);
      params.append('size', size);
      return request(`/api/v1/notifications?${params.toString()}`);
    },

    markAsRead: (notificationId) =>
      request(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),
  },
};

export default api;
