import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const ROLE_COLORS = {
  admin: 'bg-brand',
  teacher: 'bg-gold',
  student: 'bg-emerald-500',
} as const;

const TEST_ACCOUNTS = [
  { role: 'Admin', email: 'admin@loa.edu.ph', colorKey: 'admin' as const },
  { role: 'Teacher', email: 'jdela.cruz@loa.edu.ph', colorKey: 'teacher' as const },
  { role: 'Student', email: 'student001@loa.edu.ph', colorKey: 'student' as const },
];

interface LoginPageProps {
  accessDenied?: boolean;
}

export default function LoginPage({ accessDenied }: LoginPageProps) {
  const { user, signInWithGoogle, devModeLogin } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(
    accessDenied ? 'Access denied. Please contact the administrator.' : null
  );

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.message?.includes('not registered')) {
        setError('Your email is not registered in the LOA Portal. Please contact the administrator.');
      } else {
        setError('Unable to sign in. Please try again or contact support.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDevSignIn = async (email: string) => {
    setError(null);
    setIsSigningIn(true);
    try {
      await devModeLogin(email);
    } catch (err: any) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <div className="lg:w-1/2 bg-brand-deep px-8 py-8 lg:px-14 lg:py-14 flex flex-col justify-between text-white">
        <div>
          <h1 className="text-[28px] font-extrabold">LOA Portal</h1>
        </div>
        
        <div className="mt-12 lg:mt-0">
          <h2 className="text-[40px] lg:text-[56px] font-extrabold leading-tight max-w-[520px]">
            Grades, subjects and announcements in one place.
          </h2>
          <p className="mt-6 text-[16px] text-brand-mist max-w-[440px]">
            For students, teachers and the registrar of Lyceum of Alcala.
          </p>
        </div>
        
        <div className="mt-12 lg:mt-0 hidden lg:block">
          <div className="w-24 h-2 bg-gold rounded-full"></div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="lg:w-1/2 bg-canvas flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-[30px] font-extrabold text-ink">Sign in</h2>
            {DEV_MODE && (
              <span className="px-2 py-1 bg-gold-soft text-gold-ink text-[11px] font-semibold rounded">
                Development mode
              </span>
            )}
          </div>
          
          <p className="text-[14px] text-muted mb-8">
            Use the Google account the school registered for you.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 bg-[#FBE0E0] border border-[#E9A9A9] rounded-xl text-[14px] text-[#7A0C10]"
            >
              <span className="font-bold">Access denied.</span> {error}
            </div>
          )}

          {DEV_MODE && (
            <>
              <div className="mb-6">
                <p className="text-[13px] text-muted mb-3">Development mode: sign in as</p>
                <div className="space-y-2">
                  {TEST_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleDevSignIn(account.email)}
                      disabled={isSigningIn}
                      className={clsx(
                        'w-full flex items-center gap-3 px-5 py-3 bg-white border border-line rounded-full transition-colors min-h-[44px]',
                        'hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', ROLE_COLORS[account.colorKey])}></div>
                      <div className="flex-1 text-left">
                        <span className="text-[14px] font-bold text-ink">{account.role}</span>
                        <span className="text-[14px] text-muted ml-2">{account.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line"></div>
                </div>
                <div className="relative flex justify-center text-[12px]">
                  <span className="px-3 bg-canvas text-muted">or</span>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className={clsx(
              'w-full flex items-center justify-center gap-3 px-6 h-[52px] bg-white border border-line rounded-full transition-colors',
              'hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand"></div>
                <span className="text-[15px] font-semibold text-ink">Signing in...</span>
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9.002c0 1.454.348 2.827.957 4.042l3.007-2.333z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.48 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-[15px] font-semibold text-ink">Sign in with Google</span>
              </>
            )}
          </button>

          <p className="mt-4 text-[13px] text-muted">
            Only registered email addresses can access this portal. Contact the administrator if you need access.
          </p>

          <p className="mt-12 text-[12px] text-muted text-center">
            Unofficial student project · sample data
          </p>
        </div>
      </div>
    </div>
  );
}
