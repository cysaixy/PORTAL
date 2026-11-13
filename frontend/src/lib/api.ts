import axios from 'axios';
import { auth } from '../config/firebase';

export const API_URL: string = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const user = auth?.currentUser;
  if (user) {
    config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  return config;
});

/** Called when the session is no longer valid (set by AuthProvider). */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** Resolve a server-relative upload path (e.g. /uploads/x.png) to a loadable URL. */
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  try {
    return new URL(path, new URL(API_URL, window.location.origin).origin).toString();
  } catch {
    return path;
  }
}

export default api;
