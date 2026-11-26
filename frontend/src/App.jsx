import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ROUTES } from './lib/routes';
import SplashScreen from './components/ui/SplashScreen';

// Layouts
import PublicLayout from './components/layout/PublicLayout';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import DrivesExplorer from './pages/DrivesExplorer';
import PartnerCompanies from './pages/PartnerCompanies';
import PoliciesBylaws from './pages/PoliciesBylaws';
import Contact from './pages/Contact';
import LoginPage from './pages/LoginPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// Student Portal Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentResume from './pages/student/StudentResume';
import StudentApplications from './pages/student/StudentApplications';

// Company Portal Pages
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyDrives from './pages/company/CompanyDrives';
import CreateDrive from './pages/company/CreateDrive';
import CompanyProfile from './pages/company/CompanyProfile';
import CandidateSearch from './pages/company/CandidateSearch';

// Officer / Admin Portal Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import CompanyApprovals from './pages/officer/CompanyApprovals';
import OfficerCompanies from './pages/officer/OfficerCompanies';

/**
 * Route Guard Component
 * Enforces role-based access control and handles history navigation (Back/Forward).
 * Uses replace navigation to prevent history pollution.
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F5' }}>
        <div style={{ textAlign: 'center', color: '#563828' }}>
          <img src="/images/gujarat-vidyapith-logo.png" alt="Gujarat Vidyapith" width="70" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 600 }}>Loading Gujarat Vidyapith Placement Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} state={{ attempted: location.pathname }} replace />;
  }

  return children;
}

function AppContent() {
  const handleSplashComplete = () => {
    // Splash completion callback: visitor stays directly on the active landing route
  };

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} />
      <Routes>
        {/* Public Institutional Routes wrapped in PublicLayout */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.ABOUT} element={<About />} />
          <Route path={ROUTES.DRIVES_EXPLORER} element={<DrivesExplorer />} />
          <Route path={ROUTES.PARTNER_COMPANIES} element={<PartnerCompanies />} />
          <Route path={ROUTES.POLICIES} element={<PoliciesBylaws />} />
          <Route path={ROUTES.CONTACT} element={<Contact />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER_STUDENT} element={<RegisterStudentPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Student Protected Portal Routes */}
        <Route
          path={ROUTES.STUDENT_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.STUDENT_PROFILE}
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.STUDENT_RESUME}
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentResume />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.STUDENT_APPLICATIONS}
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentApplications />
            </ProtectedRoute>
          }
        />

        {/* Company Protected Portal Routes */}
        <Route
          path={ROUTES.COMPANY_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['COMPANY']}>
              <CompanyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPANY_DRIVES}
          element={
            <ProtectedRoute allowedRoles={['COMPANY']}>
              <CompanyDrives />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPANY_DRIVE_CREATE}
          element={
            <ProtectedRoute allowedRoles={['COMPANY']}>
              <CreateDrive />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPANY_CANDIDATE_SEARCH}
          element={
            <ProtectedRoute allowedRoles={['COMPANY']}>
              <CandidateSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.COMPANY_PROFILE}
          element={
            <ProtectedRoute allowedRoles={['COMPANY']}>
              <CompanyProfile />
            </ProtectedRoute>
          }
        />

        {/* Officer & Admin Protected Portal Routes */}
        <Route
          path={ROUTES.OFFICER_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']}>
              <OfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.OFFICER_APPROVALS}
          element={
            <ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']}>
              <CompanyApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.OFFICER_COMPANIES}
          element={
            <ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']}>
              <OfficerCompanies />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
