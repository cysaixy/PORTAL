import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { audit, HttpError, insensitive, paginate, str } from '../lib/http';
import { allowedEmailSchema, paginationSchema } from '../lib/validation';

/** GET /api/admin/allowed-emails?role=&search= */
export async function listAllowedEmails(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const role = str(req.query.role);

  const where: Prisma.UserWhereInput = {
    ...(role && Object.values(Role).includes(role as Role) && { role: role as Role }),
    ...(search && { email: insensitive(search) }),
  };

  const [users, total, counts] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      include: {
        student: { select: { id: true, lrn: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ['role'], orderBy: { role: 'asc' }, _count: { _all: true } }),
  ]);

  res.json({
    emails: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      hasSignedIn: !!u.firebaseUid,
      createdAt: u.createdAt,
      profile: u.student ?? u.teacher ?? null,
    })),
    counts: Object.fromEntries(counts.map((c) => [c.role, (c._count as { _all: number })._all])),
    pagination: paginate(page, limit, total),
  });
}

/** POST /api/admin/allowed-emails — used for admin accounts (students/teachers get one via their profile) */
export async function addAllowedEmail(req: Request, res: Response) {
  const data = allowedEmailSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, 'That email is already on the allowlist');
  }
  const user = await prisma.user.create({ data });
  await audit(req, 'CREATE', 'AllowedEmail', user.id, undefined, { email: user.email, role: user.role });
  res.status(201).json({ user });
}

/** PUT /api/admin/allowed-emails/:id — toggle active (role changes are blocked for linked profiles) */
export async function updateAllowedEmail(req: Request, res: Response) {
  const { id } = req.params;
  const data = allowedEmailSchema.partial().parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id }, include: { student: true, teacher: true } });
  if (!existing) throw new HttpError(404, 'Account not found');

  if (id === req.user!.id && data.isActive === false) throw new HttpError(400, 'You cannot deactivate your own account');
  if (data.role && data.role !== existing.role && (existing.student || existing.teacher)) {
    throw new HttpError(400, 'This account has a student/teacher profile; its role cannot be changed');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.email && data.email !== existing.email && { email: data.email, firebaseUid: null }),
      ...(data.role && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
  await audit(req, 'UPDATE', 'AllowedEmail', id, { isActive: existing.isActive, role: existing.role }, data);
  res.json({ user });
}

/** DELETE /api/admin/allowed-emails/:id — only for accounts without a profile */
export async function deleteAllowedEmail(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.user.findUnique({ where: { id }, include: { student: true, teacher: true } });
  if (!existing) throw new HttpError(404, 'Account not found');
  if (id === req.user!.id) throw new HttpError(400, 'You cannot remove your own account');
  if (existing.student || existing.teacher) {
    throw new HttpError(400, 'Remove this person from Students/Teachers instead, or deactivate the account');
  }
  await prisma.user.delete({ where: { id } });
  await audit(req, 'DELETE', 'AllowedEmail', id, { email: existing.email });
  res.json({ message: 'Removed from allowlist' });
}
