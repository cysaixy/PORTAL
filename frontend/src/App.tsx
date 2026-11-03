import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Role } from './types';

// Pages
import LoginPage from './pages/LoginPage';

// Role dashboards
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';

// Admin sub-pages
import SchoolYears from './pages/admin/SchoolYears';
import GradeLevels from './pages/admin/GradeLevels';
import Sections from './pages/admin/Sections';
import Subjects from './pages/admin/Subjects';
import TeachingAssignments from './pages/admin/TeachingAssignments';
import AdminStudents from './pages/admin/Students';
import AdminTeachers from './pages/admin/Teachers';
import AllowedEmails from './pages/admin/AllowedEmails';
import IdCards from './pages/admin/IdCards';
import GradeLocks from './pages/admin/GradeLocks';
import AuditLog from './pages/admin/AuditLog';

// Teacher sub-pages
import MySections from './pages/teacher/MySections';
import EncodeGrades from './pages/teacher/EncodeGrades';
import AdvisoryClass from './pages/teacher/AdvisoryClass';
import TeacherAnnouncements from './pages/teacher/Announcements';

// Student sub-pages
import MyGrades from './pages/student/MyGrades';
import MySubjects from './pages/student/MySubjects';
import StudentAnnouncements from './pages/student/Announcements';
import ReportCard from './pages/student/ReportCard';
import MyId from './pages/student/MyId';
import LoadingSpinner from './components/LoadingSpinner';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route wrapper
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Dashboard router based on role
function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case Role.STUDENT:
      return <StudentDashboard />;
    case Role.TEACHER:
      return <TeacherDashboard />;
    case Role.ADMIN:
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <LoginPage
                  accessDenied={new URLSearchParams(window.location.search).get('denied') === '1'}
                />
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/my-grades"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <MyGrades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/my-subjects"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <MySubjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/announcements"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <StudentAnnouncements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/report-card"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <ReportCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/my-id"
              element={
                <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                  <MyId />
                </ProtectedRoute>
              }
            />

            {/* Teacher routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/my-sections"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <MySections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/encode-grades"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <EncodeGrades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/advisory"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <AdvisoryClass />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/announcements"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <TeacherAnnouncements />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/school-years"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <SchoolYears />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/grade-levels"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <GradeLevels />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sections"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <Sections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <Subjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teaching-assignments"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <TeachingAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AdminStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AdminTeachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/allowed-emails"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AllowedEmails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/id-cards"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <IdCards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/grade-locks"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <GradeLocks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
