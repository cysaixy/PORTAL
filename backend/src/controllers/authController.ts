import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/database';
import logger from '../config/logger';
import { isDevBypass, resolveFirebaseUser } from '../middleware/auth';
import { getCurrentSchoolYear, HttpError } from '../lib/http';

async function loadSessionUser(userId: string) {
  const [user, schoolYear] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
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
            photoUrl: true,
            signatureUrl: true,
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
            photoUrl: true,
          },
        },
      },
    }),
    getCurrentSchoolYear(),
  ]);
  if (!user) throw new HttpError(404, 'User not found');
  return {
    ...user,
    schoolYear: schoolYear ? { id: schoolYear.id, label: schoolYear.label } : null,
  };
}

/** POST /api/auth/verify — verify a Firebase ID token against the allowlist. */
export async function verifyToken(req: Request, res: Response) {
  const { idToken } = req.body ?? {};
  if (!idToken) throw new HttpError(400, 'ID token is required');

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch (error: any) {
    logger.warn('Token verification failed', { code: error?.code });
    if (error?.code === 'auth/id-token-expired') throw new HttpError(401, 'Token expired');
    if (error?.code === 'auth/not-configured') throw new HttpError(503, 'Google sign-in is not configured on the server');
    throw new HttpError(401, 'Invalid token');
  }

  const user = await resolveFirebaseUser(decoded.uid, decoded.email);
  if (!user) {
    logger.warn(`Allowlist check failed for ${decoded.email}`);
    throw new HttpError(403, 'Your email is not registered in the LOA Portal. Please contact the registrar.');
  }
  if (!user.isActive) throw new HttpError(403, 'Your account has been deactivated. Please contact the registrar.');

  logger.info(`User authenticated: ${user.email} (${user.role})`);
  res.json({ user: await loadSessionUser(user.id) });
}

/** GET /api/auth/me */
export async function getCurrentUser(req: Request, res: Response) {
  res.json({ user: await loadSessionUser(req.user!.id) });
}

/** POST /api/auth/logout — client clears its token; nothing to revoke server-side. */
export async function logout(req: Request, res: Response) {
  if (req.user) logger.info(`User logged out: ${req.user.email}`);
  res.json({ message: 'Logged out successfully' });
}

/** GET /api/auth/dev-accounts — sample accounts for the dev login screen (dev bypass only). */
export async function listDevAccounts(_req: Request, res: Response) {
  if (!isDevBypass()) throw new HttpError(404, 'Route not found');

  const pick = (role: 'ADMIN' | 'TEACHER' | 'STUDENT', take: number) =>
    prisma.user.findMany({
      where: { role, isActive: true },
      take,
      orderBy: { email: 'asc' },
      select: {
        email: true,
        role: true,
        student: { select: { firstName: true, lastName: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

  const [admins, teachers, students] = await Promise.all([pick('ADMIN', 2), pick('TEACHER', 4), pick('STUDENT', 4)]);
  const accounts = [...admins, ...teachers, ...students].map((u) => {
    const p = u.student ?? u.teacher;
    return { email: u.email, role: u.role, name: p ? `${p.firstName} ${p.lastName}` : 'Registrar' };
  });
  res.json({ accounts });
}
