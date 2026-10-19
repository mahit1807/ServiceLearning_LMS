import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import DashboardLayout from './layouts/DashboardLayout';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import { NotFound, Unauthorized } from './pages/ErrorPages';

// Student pages
import StudentDashboard from './pages/student/Dashboard';

// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import AdminSettings from './pages/admin/Settings';

// Shared pages & Merged Modules
import CoursesAssignmentsModule from './pages/shared/CoursesAssignmentsModule';
import LiveClassesAttendanceModule from './pages/shared/LiveClassesAttendanceModule';
import Courses from './pages/shared/Courses';
import CourseDetail from './pages/shared/CourseDetail';
import Sessions from './pages/shared/Sessions';
import Assignments from './pages/shared/Assignments';
import Submissions from './pages/shared/Submissions';
import Attendance from './pages/shared/Attendance';
import Profile from './pages/shared/Profile';

import { PageLoader } from './components/common/EmptyState';

function AuthRedirect() {
  const { profile, loading, isAuthenticated } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${profile?.role || 'student'}/dashboard`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/dashboard" element={<AuthRedirect />} />

            {/* Student routes */}
            <Route element={<DashboardLayout allowedRoles={['student']} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/courses-assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/student/live-classes" element={<LiveClassesAttendanceModule />} />
              <Route path="/student/courses" element={<CoursesAssignmentsModule />} />
              <Route path="/student/courses/:courseId" element={<CourseDetail />} />
              <Route path="/student/sessions" element={<LiveClassesAttendanceModule />} />
              <Route path="/student/assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/student/attendance" element={<LiveClassesAttendanceModule />} />
              <Route path="/student/profile" element={<Profile />} />
            </Route>

            {/* Instructor routes */}
            <Route element={<DashboardLayout allowedRoles={['instructor']} />}>
              <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
              <Route path="/instructor/courses-assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/instructor/live-classes" element={<LiveClassesAttendanceModule />} />
              <Route path="/instructor/courses" element={<CoursesAssignmentsModule />} />
              <Route path="/instructor/courses/:courseId" element={<CourseDetail />} />
              <Route path="/instructor/sessions" element={<LiveClassesAttendanceModule />} />
              <Route path="/instructor/assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/instructor/assignments/:assignmentId/submissions" element={<Submissions />} />
              <Route path="/instructor/attendance" element={<LiveClassesAttendanceModule />} />
              <Route path="/instructor/profile" element={<Profile />} />
            </Route>

            {/* Admin routes */}
            <Route element={<DashboardLayout allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses-assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/admin/live-classes" element={<LiveClassesAttendanceModule />} />
              <Route path="/admin/courses" element={<CoursesAssignmentsModule />} />
              <Route path="/admin/courses/:courseId" element={<CourseDetail />} />
              <Route path="/admin/sessions" element={<LiveClassesAttendanceModule />} />
              <Route path="/admin/assignments" element={<CoursesAssignmentsModule />} />
              <Route path="/admin/assignments/:assignmentId/submissions" element={<Submissions />} />
              <Route path="/admin/attendance" element={<LiveClassesAttendanceModule />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
