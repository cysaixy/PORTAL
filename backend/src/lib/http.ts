import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';

/** Error with an HTTP status, rendered by the error handler. */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Wrap an async route so thrown errors reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Read a single string from a query/param value. */
export function str(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return str(val[0]);
  const s = String(val).trim();
  return s === '' ? undefined : s;
}

export function int(val: unknown): number | undefined {
  const s = str(val);
  if (s === undefined) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

export const insensitive = (value: string) => ({ contains: value, mode: Prisma.QueryMode.insensitive });

export function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getCurrentSchoolYear() {
  return (
    (await prisma.schoolYear.findFirst({ where: { isCurrent: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startDate: 'desc' } }))
  );
}

/** Teacher profile for the authenticated user (throws 403 if none). */
export async function requireTeacher(req: Request) {
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
  if (!teacher) throw new HttpError(403, 'No teacher profile is linked to this account');
  return teacher;
}

/** Student profile for the authenticated user (throws 404 if none). */
export async function requireStudent(req: Request) {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
  if (!student) throw new HttpError(404, 'No student profile is linked to this account');
  return student;
}

/** The student's enrollment for the current school year (falls back to the latest one). */
export async function getCurrentEnrollment(studentId: string) {
  const sy = await getCurrentSchoolYear();
  const include = {
    section: {
      include: {
        gradeLevel: true,
        strand: true,
        schoolYear: true,
        adviser: true,
      },
    },
  } as const;
  if (sy) {
    const current = await prisma.studentSection.findFirst({
      where: { studentId, section: { schoolYearId: sy.id } },
      include,
    });
    if (current) return current;
  }
  return prisma.studentSection.findFirst({
    where: { studentId },
    orderBy: { section: { schoolYear: { startDate: 'desc' } } },
    include,
  });
}

export async function getPassingScore(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: 'passing_score' } });
  const n = setting ? Number(setting.value) : NaN;
  return Number.isFinite(n) ? n : 75;
}

export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown
) {
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action,
      entity,
      entityId,
      before: before === undefined ? undefined : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
      after: after === undefined ? undefined : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue),
      ipAddress: req.ip,
    },
  });
}

export function fullName(p: { firstName: string; middleName?: string | null; lastName: string; suffix?: string | null }) {
  const mi = p.middleName ? ` ${p.middleName.charAt(0)}.` : '';
  return `${p.firstName}${mi} ${p.lastName}${p.suffix ? ' ' + p.suffix : ''}`;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const avg = (xs: number[]) => (xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
