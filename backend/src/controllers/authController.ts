import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Verify Firebase ID token and check if user is in allowlist
 */
export async function verifyToken(req: Request, res: Response) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify with Firebase
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Check if user exists in database (allowlist)
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn(`Allowlist check failed for ${decodedToken.email}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your email is not registered in the LOA Portal. Please contact the administrator.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    logger.info(`User authenticated: ${user.email} (${user.role})`);

    // Return user info
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.student || user.teacher || null,
      },
    });
  } catch (error) {
    logger.error('Token verification failed:', error);
    
    if ((error as any).code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        student: {
          select: {
            id: true,
            lrn: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            birthdate: true,
            sex: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            department: true,
          },
        },
      },
    });

    res.json({ user });
  } catch (error) {
    logger.error('Get current user failed:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Logout (primarily client-side, but can revoke Firebase tokens if needed)
 */
export async function logout(req: Request, res: Response) {
  try {
    // Optional: revoke Firebase refresh tokens
    // await auth.revokeRefreshTokens(req.user?.firebaseUid);
    
    logger.info(`User logged out: ${req.user?.email}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}
