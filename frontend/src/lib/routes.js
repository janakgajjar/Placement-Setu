/**
 * Centralized Route Map for Placement Setu
 */
export const ROUTES = {
  // Public Pages
  HOME: '/',
  ABOUT: '/about',
  DRIVES_EXPLORER: '/drives',
  PARTNER_COMPANIES: '/companies',
  POLICIES: '/policies',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER_STUDENT: '/register/student',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',

  // Student Portal
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_PROFILE: '/student/profile',
  STUDENT_RESUME: '/student/resume',
  STUDENT_DRIVES: '/student/drives',
  STUDENT_APPLICATIONS: '/student/applications',

  // Company Portal
  COMPANY_DASHBOARD: '/company/dashboard',
  COMPANY_PROFILE: '/company/profile',
  COMPANY_DRIVES: '/company/drives',
  COMPANY_DRIVE_CREATE: '/company/drives/new',
  COMPANY_CANDIDATE_SEARCH: '/company/candidates',

  // Placement Officer & Admin Portal
  OFFICER_DASHBOARD: '/officer/dashboard',
  OFFICER_APPROVALS: '/officer/approvals',
  OFFICER_COMPANIES: '/officer/companies',
};

export const ROLE_DEFAULT_ROUTES = {
  STUDENT: ROUTES.STUDENT_DASHBOARD,
  COMPANY: ROUTES.COMPANY_DASHBOARD,
  PLACEMENT_OFFICER: ROUTES.OFFICER_DASHBOARD,
  ADMIN: ROUTES.OFFICER_DASHBOARD,
};
