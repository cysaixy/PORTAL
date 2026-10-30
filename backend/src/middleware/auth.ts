import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import logger from '../config/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        firebaseUid: string;
      };
    }
  }
}

/**
 * Verify Firebase ID token and load user from database
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        email: true,
        role: true,
        firebaseUid: true,
        isActive: true,
      },
    });

    // Check if user exists in allowlist
    if (!user) {
      logger.warn(`Unauthorized access attempt: ${decodedToken.email}`);
      return res.status(403).json({ 
        error: 'Access denied. Your email is not in the allowlist.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    
    if ((error as any).code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized role access: ${req.user.email} (${req.user.role}) attempted ${req.path}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Optional auth - attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: {
        id: true,
        email: true,
        role: true,
        firebaseUid: true,
        isActive: true,
      },
    });

    if (user?.isActive) {
      req.user = user;
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error);
  }
  
  next();
}
