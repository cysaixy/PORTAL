import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Alert, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';
import { Role } from '../types';

interface DevAccount {
  email: string;
  role: Role;
  name: string;
}

const ROLE_STYLE: Record<Role, { label: string; dot: string }> = {
  [Role.ADMIN]: { label: 'Registrar', dot: 'bg-brand-500' },
  [Role.TEACHER]: { label: 'Teacher', dot: 'bg-gold-400' },
  [Role.STUDENT]: { label: 'Student', dot: 'bg-success-600' },
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, devMode, signInWithGoogle, devModeLogin } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Sign in · LOA Portal';
  }, []);

  const { data: devAccounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['dev-accounts'],
    queryFn: () => api.get<{ accounts: DevAccount[] }>('/auth/dev-accounts').then((r) => r.data.accounts),
    enabled: devMode,
    retry: false,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-800">
        <Spinner size={28} />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const run = async (key: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError(null);
      } else {
        setError(err?.message ?? 'Unable to sign in. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative overflow-hidden bg-brand-900 text-white px-8 py-10 lg:px-16 lg:py-14 flex flex-col justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/50 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-brand-900 font-extrabold">LA</span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">LOA Portal</p>
            <p className="text-xs text-brand-200">Lyceum of Alcala</p>
          </div>
        </div>

        <div className="relative mt-14 lg:mt-0">
          <h1 className="text-4xl lg:text-[52px] font-extrabold leading-[1.05] tracking-tight max-w-xl">
            Grades, classes and announcements — <span className="text-gold-400">in one place.</span>
          </h1>
          <ul className="mt-8 space-y-3 text-brand-100/90 text-sm max-w-md">
            {[
              ['chart', 'Students see quarterly grades and their report card as soon as they’re submitted.'],
              ['pencil', 'Teachers encode grades class by class, then submit and lock each quarter.'],
              ['lock', 'The registrar manages sections, loads and unlock requests with a full audit trail.'],
            ].map(([icon, text]) => (
              <li key={text} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-gold-400">
                  <Icon name={icon as any} size={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs text-brand-200/70">Unofficial student project · sample data only</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use the Google account the school registered for you.</p>

          {error && (
            <div className="mt-6">
              <Alert tone="danger" title="Couldn’t sign you in">
                {error}
              </Alert>
            </div>
          )}

          <button
            onClick={() => run('google', signInWithGoogle)}
            disabled={!!busy}
            className="mt-6 w-full h-12 inline-flex items-center justify-center gap-3 rounded-xl bg-white border border-line shadow-card font-semibold text-ink hover:bg-white/60 hover:border-line-strong transition-colors disabled:opacity-60"
          >
            {busy === 'google' ? <Spinner /> : <GoogleMark />}
            Continue with Google
          </button>

          <p className="mt-3 text-xs text-muted">Only emails on the school’s access list can sign in. Contact the registrar if you need access.</p>

          {devMode && (
            <div className="mt-8">
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 py-0.5 font-semibold text-gold-900">Developer mode</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <p className="mt-3 mb-2 text-xs text-muted">Sign in instantly as a sample account:</p>

              {loadingAccounts ? (
                <div className="flex justify-center py-4 text-muted">
                  <Spinner />
                </div>
              ) : devAccounts?.length ? (
                <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {devAccounts.map((a) => (
                    <li key={a.email}>
                      <button
                        onClick={() => run(a.email, () => devModeLogin(a.email))}
                        disabled={!!busy}
                        className={clsx(
                          'w-full flex items-center gap-3 rounded-xl bg-white border border-line px-3 py-2.5 text-left transition-colors',
                          'hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60'
                        )}
                      >
                        <span className={clsx('h-2 w-2 rounded-full shrink-0', ROLE_STYLE[a.role].dot)} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink truncate">{a.name}</span>
                          <span className="block text-xs text-muted truncate">{a.email}</span>
                        </span>
                        {busy === a.email ? <Spinner size={16} /> : <span className="text-[11px] font-semibold text-muted">{ROLE_STYLE[a.role].label}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Alert tone="warn">Dev accounts are unavailable. Make sure the API is running with DEV_BYPASS_AUTH=true.</Alert>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
