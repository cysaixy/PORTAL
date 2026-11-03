import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export interface NavItem {
  href: string;
  label: string;
  enabled: boolean;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

interface SidebarProps {
  nav: ReadonlyArray<NavItem>;
  role: string;
  userName?: string;
  userEmail?: string;
  initials?: string;
}

export function Sidebar({ nav, role, userName, userEmail, initials }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const roleLabel = role === 'ADMIN' ? 'Admin / Registrar' : role === 'TEACHER' ? 'Teacher / Adviser' : 'Student';

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[215px] bg-[#6B0A0F] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0">
      <div className="flex flex-col h-full">
        {/* Logo + role */}
        <div className="p-6 border-b border-[#C8161D]/30 flex flex-col gap-3 shrink-0">
          <span className="text-[20px] font-800 tracking-tight">LOA Portal</span>
          <span className="text-[11px] text-[#F0BDBD] font-semibold tracking-wider">
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const isActive = location.pathname === item.href;
            const matchesRole = !item.role || item.role === role;

            if (!matchesRole) return null;

            return (
              <div key={item.href} className="relative">
                {!item.enabled ? (
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#F0BDBD]/40 rounded-[8px] cursor-not-allowed focus-visible:outline-none focus-visible:ring-0"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-[13px] rounded-[8px] transition-colors',
                      isActive
                        ? 'bg-[#FFD21F] text-[#1B1F3B] font-semibold'
                        : 'text-[#F0BDBD]/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="p-4 shrink-0 border-t border-[#C8161D]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8161D] flex items-center justify-center text-[#FFD21F] text-[13px] font-bold shadow-sm">
              {initials ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{userName ?? 'User'}</div>
              <div className="text-[11px] text-[#F0BDBD]/80 truncate">{userEmail ?? ''}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-3 py-2 rounded-[8px] border border-[#FFD21F]/50 text-[#FFD21F] text-[12px] font-semibold hover:bg-[#FFD21F]/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#FFD21F]"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
