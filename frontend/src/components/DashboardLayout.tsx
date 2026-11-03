import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  nav: ReadonlyArray<{ href: string; label: string; enabled: boolean; role?: 'ADMIN' | 'TEACHER' | 'STUDENT' }>;
  schoolYear?: string;
}

export function DashboardLayout({ children, title, subtitle, nav, schoolYear = 'SY 2024–2025 · Current' }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role ?? 'STUDENT';
  const userName = user?.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : user?.teacher
    ? `${user.teacher.firstName} ${user.teacher.lastName}`
    : 'User';
  const userEmail = user?.email ?? '';
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F4F2EF]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-39 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        nav={nav}
        role={role}
        userName={userName}
        userEmail={userEmail}
        initials={initials}
      />

      <div className="flex flex-col lg:pl-[215px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          schoolYear={schoolYear}
          onMenuToggle={() => setSidebarOpen(true)}
        />

        <main className="container-custom py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E8E2DE] bg-white px-6 py-3 text-[10px] text-[#6B6B6B]">
          Unofficial student project · all data shown is sample data
        </footer>
      </div>
    </div>
  );
}
