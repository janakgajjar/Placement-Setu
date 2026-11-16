/**
 * Centralized Application Route Definitions for Placement Setu
 */
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER_STUDENT: '/register/student',
  REGISTER_COMPANY: '/register/company',
  UNAUTHORIZED: '/unauthorized',

  // Student
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_PROFILE: '/student/profile',
  STUDENT_RESUME: '/student/resume',
  STUDENT_DRIVES: '/student/drives',
  STUDENT_APPLICATIONS: '/student/applications',

  // Company
  COMPANY_DASHBOARD: '/company/dashboard',
  COMPANY_PROFILE: '/company/profile',
  COMPANY_DRIVES: '/company/drives',
  COMPANY_DRIVE_CREATE: '/company/drives/new',
  COMPANY_DRIVE_EDIT: (id = ':id') => `/company/drives/${id}/edit`,

  // Officer / Admin
  OFFICER_DASHBOARD: '/officer/dashboard',
  OFFICER_APPROVALS: '/officer/approvals',
  OFFICER_COMPANIES: '/officer/companies',
  OFFICER_COMPANY_EDIT: (id = ':id') => `/officer/companies/${id}/edit`,
};

export const ROLE_DEFAULT_ROUTES = {
  STUDENT: ROUTES.STUDENT_DASHBOARD,
  COMPANY: ROUTES.COMPANY_DASHBOARD,
  PLACEMENT_OFFICER: ROUTES.OFFICER_DASHBOARD,
  ADMIN: ROUTES.OFFICER_APPROVALS,
};
