import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError, insensitive, paginate, str } from '../lib/http';
import { paginationSchema, studentSchema } from '../lib/validation';

/** GET /api/admin/students?sectionId=&gradeLevelId=&status=active|inactive&unassigned=1&search= */
export async function listStudents(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const sectionId = str(req.query.sectionId);
  const gradeLevelId = str(req.query.gradeLevelId);
  const status = str(req.query.status);
  const unassigned = str(req.query.unassigned) === '1';
  const sy = await getCurrentSchoolYear();

  const where: Prisma.StudentWhereInput = {
    ...(search && {
      OR: [{ lrn: { contains: search } }, { firstName: insensitive(search) }, { lastName: insensitive(search) }],
    }),
    ...(sectionId && { enrollments: { some: { sectionId } } }),
    ...(gradeLevelId && sy && { enrollments: { some: { section: { gradeLevelId, schoolYearId: sy.id } } } }),
    ...(unassigned && sy && { enrollments: { none: { section: { schoolYearId: sy.id } } } }),
    ...(status === 'active' && { user: { isActive: true } }),
    ...(status === 'inactive' && { user: { isActive: false } }),
  };

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        user: { select: { email: true, isActive: true } },
        enrollments: {
          where: sy ? { section: { schoolYearId: sy.id } } : undefined,
          include: { section: { include: { gradeLevel: true, strand: true } } },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({
    students: students.map(({ enrollments, ...s }) => ({
      ...s,
      currentSection: enrollments[0]?.section ?? null,
    })),
    pagination: paginate(page, limit, total),
  });
}

/** POST /api/admin/students — creates allowlist entry + profile (+ optional enrollment) */
export async function createStudent(req: Request, res: Response) {
  const data = studentSchema.parse(req.body);

  const [emailTaken, lrnTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.student.findUnique({ where: { lrn: data.lrn } }),
  ]);
  if (emailTaken) throw new HttpError(409, 'That email is already registered');
  if (lrnTaken) throw new HttpError(409, 'That LRN is already registered');

  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, role: Role.STUDENT, isActive: data.isActive ?? true } });
    const created = await tx.student.create({
      data: {
        userId: user.id,
        lrn: data.lrn,
        firstName: data.firstName,
        middleName: data.middleName ?? null,
        lastName: data.lastName,
        suffix: data.suffix ?? null,
        birthdate: new Date(data.birthdate),
        sex: data.sex,
        guardianName: data.guardianName,
        guardianContact: data.guardianContact,
        guardianEmail: data.guardianEmail,
        address: data.address,
      },
    });
    if (data.sectionId) {
      await tx.studentSection.create({ data: { studentId: created.id, sectionId: data.sectionId } });
    }
    return created;
  });

  await audit(req, 'CREATE', 'Student', student.id, undefined, { lrn: student.lrn, email: data.email });
  res.status(201).json({ student });
}

/** PUT /api/admin/students/:id */
export async function updateStudent(req: Request, res: Response) {
  const { id } = req.params;
  const data = studentSchema.partial().parse(req.body);
  const existing = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw new HttpError(404, 'Student not found');

  if (data.lrn && data.lrn !== existing.lrn) {
    if (await prisma.student.findUnique({ where: { lrn: data.lrn } })) throw new HttpError(409, 'That LRN is already registered');
  }
  if (data.email && data.email !== existing.user.email) {
    if (await prisma.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, 'That email is already registered');
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...(data.lrn && { lrn: data.lrn }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.middleName !== undefined && { middleName: data.middleName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.suffix !== undefined && { suffix: data.suffix }),
      ...(data.birthdate && { birthdate: new Date(data.birthdate) }),
      ...(data.sex && { sex: data.sex }),
      ...(data.guardianName && { guardianName: data.guardianName }),
      ...(data.guardianContact && { guardianContact: data.guardianContact }),
      ...(data.guardianEmail !== undefined && { guardianEmail: data.guardianEmail }),
      ...(data.address && { address: data.address }),
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

  await audit(req, 'UPDATE', 'Student', id, { lrn: existing.lrn, email: existing.user.email }, data);
  res.json({ student });
}

/** DELETE /api/admin/students/:id — only students without grades */
export async function deleteStudent(req: Request, res: Response) {
  const { id } = req.params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: { enrollments: { include: { _count: { select: { grades: true } } } } },
  });
  if (!student) throw new HttpError(404, 'Student not found');
  if (student.enrollments.some((e) => e._count.grades > 0)) {
    throw new HttpError(400, 'This student has recorded grades. Deactivate the account instead of deleting it.');
  }
  // Deleting the user cascades to the student profile and enrollments
  await prisma.user.delete({ where: { id: student.userId } });
  await audit(req, 'DELETE', 'Student', id, { lrn: student.lrn, name: `${student.firstName} ${student.lastName}` });
  res.json({ message: 'Student deleted' });
}
