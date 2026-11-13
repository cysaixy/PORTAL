import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth, googleProvider, hasConfig } from '../config/firebase';
import api, { setUnauthorizedHandler } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  devMode: boolean;
  signInWithGoogle: () => Promise<void>;
  devModeLogin: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
const DEV_KEY = 'dev_user_email';

function setDevHeader(email: string | null) {
  if (email) api.defaults.headers.common['x-test-user'] = email;
  else delete api.defaults.headers.common['x-test-user'];
}

function messageFrom(error: any): string {
  return error?.response?.data?.error ?? error?.message ?? 'Sign-in failed';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    localStorage.removeItem(DEV_KEY);
    setDevHeader(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    const savedEmail = DEV_MODE ? localStorage.getItem(DEV_KEY) : null;
    if (savedEmail) {
      setDevHeader(savedEmail);
      api
        .get('/auth/me')
        .then((r) => setUser(r.data.user))
        .catch(() => clearSession())
        .finally(() => setLoading(false));
      return;
    }

    if (!hasConfig || !auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        const r = await api.post('/auth/verify', { idToken });
        setUser(r.data.user);
      } catch {
        await firebaseSignOut(auth!);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, [clearSession]);

  const signInWithGoogle = async () => {
    if (!hasConfig || !auth || !googleProvider) {
      throw new Error('Google sign-in is not configured. Add your Firebase keys to frontend/.env.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    try {
      const r = await api.post('/auth/verify', { idToken: await result.user.getIdToken() });
      setUser(r.data.user);
    } catch (error) {
      await firebaseSignOut(auth);
      throw new Error(messageFrom(error));
    }
  };

  const devModeLogin = async (email: string) => {
    setDevHeader(email);
    try {
      const r = await api.get('/auth/me');
      localStorage.setItem(DEV_KEY, email);
      queryClient.clear();
      setUser(r.data.user);
    } catch (error) {
      setDevHeader(null);
      throw new Error(messageFrom(error));
    }
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    if (hasConfig && auth?.currentUser) await firebaseSignOut(auth);
    clearSession();
  };

  const refreshUser = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, devMode: DEV_MODE, signInWithGoogle, devModeLogin, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
