import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import logger from '../config/logger';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firebaseUid: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const userSelect = { id: true, email: true, role: true, firebaseUid: true, isActive: true } as const;

export const isDevBypass = () =>
  process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true';

/**
 * Resolve the allow-listed user for a verified Firebase token.
 * Users are matched by UID first, then by email (first login binds the UID).
 */
export async function resolveFirebaseUser(uid: string, email?: string) {
  let user = await prisma.user.findUnique({ where: { firebaseUid: uid }, select: userSelect });
  if (!user && email) {
    const byEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: userSelect });
    if (byEmail) {
      user = await prisma.user.update({ where: { id: byEmail.id }, data: { firebaseUid: uid }, select: userSelect });
      logger.info(`Bound Firebase UID to ${byEmail.email}`);
    }
  }
  return user;
}

/**
 * Verify Firebase ID token (or the dev header) and load the user from the allowlist.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (isDevBypass()) {
      const testEmail = req.headers['x-test-user'];
      if (typeof testEmail === 'string' && testEmail) {
        const user = await prisma.user.findUnique({ where: { email: testEmail.toLowerCase() }, select: userSelect });
        if (!user) return res.status(401).json({ error: 'Unknown dev user' });
        if (!user.isActive) return res.status(403).json({ error: 'Account is inactive' });
        req.user = { id: user.id, email: user.email, role: user.role, firebaseUid: user.firebaseUid };
        return next();
      }
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await auth.verifyIdToken(authHeader.slice('Bearer '.length));
    const user = await resolveFirebaseUser(decoded.uid, decoded.email);

    if (!user) {
      logger.warn(`Unauthorized access attempt: ${decoded.email}`);
      return res.status(403).json({ error: 'Access denied. Your email is not in the allowlist.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = { id: user.id, email: user.email, role: user.role, firebaseUid: user.firebaseUid };
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    if ((error as any).code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized role access: ${req.user.email} (${req.user.role}) attempted ${req.path}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/** Attach the user if a valid token is present, never reject. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = await auth.verifyIdToken(authHeader.slice('Bearer '.length));
      const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid }, select: userSelect });
      if (user?.isActive) {
        req.user = { id: user.id, email: user.email, role: user.role, firebaseUid: user.firebaseUid };
      }
    }
  } catch (error) {
    logger.debug('Optional auth failed:', error);
  }
  next();
}
