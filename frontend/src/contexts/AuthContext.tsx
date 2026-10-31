import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import api from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  devModeLogin: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEV MODE: Skip Firebase and check localStorage
    if (DEV_MODE) {
      const savedEmail = localStorage.getItem('dev_user_email');
      if (savedEmail) {
        // Set custom header for API client
        api.defaults.headers.common['x-test-user'] = savedEmail;
        
        // Fetch user from backend
        api.get('/auth/me')
          .then(response => setUser(response.data.user))
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    // PRODUCTION: Use Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Get ID token and verify with backend
          const idToken = await firebaseUser.getIdToken();
          const response = await api.post('/auth/verify', { idToken });
          setUser(response.data.user);
        } catch (error: any) {
          console.error('Auth verification failed:', error);
          
          // If user is not in allowlist, sign them out
          if (error.response?.status === 403) {
            await firebaseSignOut(auth);
            alert('Access denied. Your email is not registered in the LOA Portal.');
          }
          
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Verify with backend
      const idToken = await result.user.getIdToken();
      const response = await api.post('/auth/verify', { idToken });
      setUser(response.data.user);
    } catch (error: any) {
      console.error('Sign in failed:', error);
      
      if (error.response?.status === 403) {
        await firebaseSignOut(auth);
        throw new Error('Access denied. Your email is not registered in the LOA Portal.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      if (DEV_MODE) {
        localStorage.removeItem('dev_user_email');
        delete api.defaults.headers.common['x-test-user'];
      } else {
        await firebaseSignOut(auth);
      }
      setUser(null);
    }
  };

  const devModeLogin = async (email: string) => {
    try {
      setLoading(true);
      localStorage.setItem('dev_user_email', email);
      api.defaults.headers.common['x-test-user'] = email;
      
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error: any) {
      console.error('Dev mode login failed:', error);
      localStorage.removeItem('dev_user_email');
      delete api.defaults.headers.common['x-test-user'];
      throw new Error('Login failed. User not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle,
        signOut,
        devModeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
