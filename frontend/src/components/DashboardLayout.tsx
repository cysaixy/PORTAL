import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { NAV_BY_ROLE } from '../constants/navigation';
import { assetUrl } from '../lib/api';
import { Role } from '../types';
import { Icon } from './Icon';
import { Avatar } from './ui';

interface DashboardLayoutProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Kept for backwards compatibility; nav is derived from the signed-in role. */
  nav?: unknown;
  schoolYear?: string;
}

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: 'Registrar',
  [Role.TEACHER]: 'Teacher',
  [Role.STUDENT]: 'Student',
};

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const groups = user ? NAV_BY_ROLE[user.role] : [];
  const profile = user?.student ?? user?.teacher;
  const name = profile ? `${profile.firstName} ${profile.lastName}` : user?.role === Role.ADMIN ? 'Registrar' : 'User';
  const rootPaths = ['/admin', '/teacher', '/student'];

  return (
    <div className="flex h-full flex-col bg-brand-900 text-white">
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400 text-brand-900 font-extrabold text-sm">LA</span>
        <div className="leading-tight">
          <p className="font-extrabold tracking-tight">LOA Portal</p>
          <p className="text-[11px] text-brand-200">Lyceum of Alcala</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5" aria-label="Main">
        {groups.map((g, i) => (
          <div key={i}>
            {g.label && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-300/80">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={rootPaths.includes(item.href)}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center gap-3 rounded-lg px-3 h-9 text-[13px] font-medium transition-colors',
                        isActive ? 'bg-white/10 text-white' : 'text-brand-100/75 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} size={17} className={clsx(isActive ? 'text-gold-400' : 'text-brand-200/70 group-hover:text-brand-100')} />
                        <span className="truncate">{item.label}</span>
                        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={name} src={assetUrl(profile?.photoUrl)} size={34} className="bg-gold-400 text-brand-900" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate">{name}</p>
            <p className="text-[11px] text-brand-200/80 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-200 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.title = `${title} · LOA Portal`;
  }, [title]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30 no-print">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop animate-slide-up">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur border-b border-line no-print">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5"
              aria-label="Open menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="flex-1" />
            {user?.schoolYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-900 ring-1 ring-inset ring-gold-700/15">
                <Icon name="calendar" size={13} />
                SY {user.schoolYear.label}
              </span>
            )}
            <span className="hidden sm:inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line">
              {user ? ROLE_LABEL[user.role] : ''}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full max-w-[1400px]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-ink">{title}</h1>
              {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
          </div>
          {children}
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-muted no-print">
          Unofficial student project · all names and grades are sample data
        </footer>
      </div>
    </div>
  );
}
