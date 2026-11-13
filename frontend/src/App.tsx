import { lazy, ReactNode, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { Spinner } from './components/ui';
import { Role } from './types';
import LoginPage from './pages/LoginPage';

const page = (load: () => Promise<{ default: React.ComponentType }>) => lazy(load);

const AdminDashboard = page(() => import('./pages/admin/Dashboard'));
const SchoolYears = page(() => import('./pages/admin/SchoolYears'));
const GradeLevels = page(() => import('./pages/admin/GradeLevels'));
const Sections = page(() => import('./pages/admin/Sections'));
const Subjects = page(() => import('./pages/admin/Subjects'));
const TeachingAssignments = page(() => import('./pages/admin/TeachingAssignments'));
const AdminStudents = page(() => import('./pages/admin/Students'));
const AdminTeachers = page(() => import('./pages/admin/Teachers'));
const AllowedEmails = page(() => import('./pages/admin/AllowedEmails'));
const IdCards = page(() => import('./pages/admin/IdCards'));
const GradeLocks = page(() => import('./pages/admin/GradeLocks'));
const AdminAnnouncements = page(() => import('./pages/admin/Announcements'));
const AuditLog = page(() => import('./pages/admin/AuditLog'));
const Settings = page(() => import('./pages/admin/Settings'));

const TeacherDashboard = page(() => import('./pages/teacher/Dashboard'));
const MySections = page(() => import('./pages/teacher/MySections'));
const EncodeGrades = page(() => import('./pages/teacher/EncodeGrades'));
const AdvisoryClass = page(() => import('./pages/teacher/AdvisoryClass'));
const TeacherAnnouncements = page(() => import('./pages/teacher/Announcements'));

const StudentDashboard = page(() => import('./pages/student/Dashboard'));
const MyGrades = page(() => import('./pages/student/MyGrades'));
const MySubjects = page(() => import('./pages/student/MySubjects'));
const StudentAnnouncements = page(() => import('./pages/student/Announcements'));
const ReportCard = page(() => import('./pages/student/ReportCard'));
const MyId = page(() => import('./pages/student/MyId'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error: any) => count < 1 && !(error?.response?.status >= 400 && error?.response?.status < 500),
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-brand-800">
      <Spinner size={28} />
    </div>
  );
}

const HOME: Record<Role, string> = {
  [Role.ADMIN]: '/admin',
  [Role.TEACHER]: '/teacher',
  [Role.STUDENT]: '/student',
};

function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Outlet />
    </Suspense>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/student" element={<RequireRole role={Role.STUDENT} />}>
            <Route index element={<StudentDashboard />} />
            <Route path="my-grades" element={<MyGrades />} />
            <Route path="my-subjects" element={<MySubjects />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="report-card" element={<ReportCard />} />
            <Route path="my-id" element={<MyId />} />
          </Route>

          <Route path="/teacher" element={<RequireRole role={Role.TEACHER} />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="my-sections" element={<MySections />} />
            <Route path="encode-grades" element={<EncodeGrades />} />
            <Route path="advisory" element={<AdvisoryClass />} />
            <Route path="announcements" element={<TeacherAnnouncements />} />
          </Route>

          <Route path="/admin" element={<RequireRole role={Role.ADMIN} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="school-years" element={<SchoolYears />} />
            <Route path="grade-levels" element={<GradeLevels />} />
            <Route path="sections" element={<Sections />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="teaching-assignments" element={<TeachingAssignments />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="allowed-emails" element={<AllowedEmails />} />
            <Route path="id-cards" element={<IdCards />} />
            <Route path="grade-locks" element={<GradeLocks />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
