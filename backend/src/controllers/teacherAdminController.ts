import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError, insensitive, paginate } from '../lib/http';
import { paginationSchema, teacherSchema } from '../lib/validation';

/** GET /api/admin/teachers?search= */
export async function listTeachers(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const sy = await getCurrentSchoolYear();
  const syFilter = sy ? { schoolYearId: sy.id } : {};

  const where: Prisma.TeacherWhereInput = search
    ? {
        OR: [
          { firstName: insensitive(search) },
          { lastName: insensitive(search) },
          { department: insensitive(search) },
          { user: { email: insensitive(search) } },
        ],
      }
    : {};

  const [teachers, total] = await prisma.$transaction([
    prisma.teacher.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        user: { select: { email: true, isActive: true } },
        advisorySections: { where: syFilter, select: { id: true, name: true } },
        assignments: {
          where: { section: syFilter },
          select: { id: true, section: { select: { name: true } }, subject: { select: { code: true } } },
        },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  res.json({ teachers, pagination: paginate(page, limit, total) });
}

/** POST /api/admin/teachers */
export async function createTeacher(req: Request, res: Response) {
  const data = teacherSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, 'That email is already registered');
  }

  const teacher = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, role: Role.TEACHER, isActive: data.isActive ?? true } });
    return tx.teacher.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        middleName: data.middleName ?? null,
        lastName: data.lastName,
        suffix: data.suffix ?? null,
        department: data.department ?? null,
      },
    });
  });
  await audit(req, 'CREATE', 'Teacher', teacher.id, undefined, { email: data.email });
  res.status(201).json({ teacher });
}

/** PUT /api/admin/teachers/:id */
export async function updateTeacher(req: Request, res: Response) {
  const { id } = req.params;
  const data = teacherSchema.partial().parse(req.body);
  const existing = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw new HttpError(404, 'Teacher not found');

  if (data.email && data.email !== existing.user.email) {
    if (await prisma.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, 'That email is already registered');
  }

  const teacher = await prisma.teacher.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.middleName !== undefined && { middleName: data.middleName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.suffix !== undefined && { suffix: data.suffix }),
      ...(data.department !== undefined && { department: data.department }),
      ...((data.email || data.isActive !== undefined) && {
        user: {
          update: {
            ...(data.email && { email: data.email, firebaseUid: null }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        },
      }),
    },
    include: { user: { select: { email: true, isActive: true } } },
  });
  await audit(req, 'UPDATE', 'Teacher', id, { email: existing.user.email }, data);
  res.json({ teacher });
}

/** DELETE /api/admin/teachers/:id — only teachers with no classes */
export async function deleteTeacher(req: Request, res: Response) {
  const { id } = req.params;
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { _count: { select: { advisorySections: true, assignments: true } } },
  });
  if (!teacher) throw new HttpError(404, 'Teacher not found');
  if (teacher._count.advisorySections || teacher._count.assignments) {
    throw new HttpError(400, 'This teacher still has classes or an advisory section. Reassign them or deactivate the account.');
  }
  await prisma.user.delete({ where: { id: teacher.userId } });
  await audit(req, 'DELETE', 'Teacher', id, { name: `${teacher.firstName} ${teacher.lastName}` });
  res.json({ message: 'Teacher deleted' });
}
