import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const TEST_ACCOUNTS = [
  { email: 'testadmin@gmail.com', role: 'Admin', color: 'red' },
  { email: 'testteacher@gmail.com', role: 'Teacher', color: 'blue' },
  { email: 'teststudent@gmail.com', role: 'Student', color: 'green' },
];

export default function LoginPage() {
  const { user, signInWithGoogle, devModeLogin, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleDevModeLogin = async (email: string) => {
    setError(null);
    setIsSigningIn(true);
    
    try {
      await devModeLogin(email);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="inline-block p-3 bg-primary-100 rounded-full">
                <svg
                  className="w-12 h-12 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">LOA Portal</h1>
            <p className="mt-2 text-sm text-gray-600">Lyceum of Alcala</p>
            <p className="mt-1 text-xs text-gray-500">Student Project - Unofficial</p>
            {DEV_MODE && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                🔧 Development Mode
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Dev Mode Test Accounts */}
          {DEV_MODE && (
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3 font-medium">Login as:</p>
              <div className="space-y-2">
                {TEST_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleDevModeLogin(account.email)}
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full bg-${account.color}-500`}></div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{account.role}</div>
                        <div className="text-xs text-gray-500">{account.email}</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                <span className="text-sm font-medium text-gray-700">Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {DEV_MODE ? 'Sign in with Google (Production)' : 'Sign in with Google'}
                </span>
              </>
            )}
          </button>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {DEV_MODE 
                ? 'Development mode: Use test accounts above or sign in with Google'
                : 'Only registered email addresses can access this portal.'
              }
            </p>
            {!DEV_MODE && (
              <p className="text-xs text-gray-500 mt-1">
                Contact the administrator if you need access.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600">
          This is an unofficial student project for educational purposes.
        </p>
      </div>
    </div>
  );
}
