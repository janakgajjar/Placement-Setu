import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './lib/routes';

// Layouts & Guards
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import RegisterCompanyPage from './pages/RegisterCompanyPage';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import ResumeUpload from './pages/student/ResumeUpload';
import BrowseDrives from './pages/student/BrowseDrives';
import MyApplications from './pages/student/MyApplications';

// Company Pages
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyProfile from './pages/company/CompanyProfile';
import DriveList from './pages/company/DriveList';
import CreateEditDrive from './pages/company/CreateEditDrive';

// Placement Officer & Admin Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ApprovalQueue from './pages/officer/ApprovalQueue';
import CompanyManagement from './pages/officer/CompanyManagement';

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER_STUDENT} element={<RegisterStudentPage />} />
      <Route path={ROUTES.REGISTER_COMPANY} element={<RegisterCompanyPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />

      {/* Authenticated Pages wrapped with AppLayout */}
      <Route element={<AppLayout />}>
        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path={ROUTES.STUDENT_DASHBOARD} element={<StudentDashboard />} />
          <Route path={ROUTES.STUDENT_PROFILE} element={<StudentProfile />} />
          <Route path={ROUTES.STUDENT_RESUME} element={<ResumeUpload />} />
          <Route path={ROUTES.STUDENT_DRIVES} element={<BrowseDrives />} />
          <Route path={ROUTES.STUDENT_APPLICATIONS} element={<MyApplications />} />
        </Route>

        {/* Company Routes */}
        <Route element={<ProtectedRoute allowedRoles={['COMPANY']} />}>
          <Route path={ROUTES.COMPANY_DASHBOARD} element={<CompanyDashboard />} />
          <Route path={ROUTES.COMPANY_PROFILE} element={<CompanyProfile />} />
          <Route path={ROUTES.COMPANY_DRIVES} element={<DriveList />} />
          <Route path={ROUTES.COMPANY_DRIVE_CREATE} element={<CreateEditDrive />} />
          <Route path="/company/drives/:id/edit" element={<CreateEditDrive />} />
        </Route>

        {/* Placement Officer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['PLACEMENT_OFFICER']} />}>
          <Route path={ROUTES.OFFICER_DASHBOARD} element={<OfficerDashboard />} />
          <Route path={ROUTES.OFFICER_COMPANIES} element={<CompanyManagement />} />
        </Route>

        {/* Approval Queue (accessible to both ADMIN and PLACEMENT_OFFICER) */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PLACEMENT_OFFICER']} />}>
          <Route path={ROUTES.OFFICER_APPROVALS} element={<ApprovalQueue />} />
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
