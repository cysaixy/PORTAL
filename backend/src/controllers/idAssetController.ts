import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError, insensitive, paginate, str } from '../lib/http';
import { paginationSchema } from '../lib/validation';

/** GET /api/admin/id-assets?status=ready|missing&sectionId=&search= */
export async function listIdAssets(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const sectionId = str(req.query.sectionId);
  const status = str(req.query.status);
  const sy = await getCurrentSchoolYear();

  const where: Prisma.StudentWhereInput = {
    ...(search && {
      OR: [{ lrn: { contains: search } }, { firstName: insensitive(search) }, { lastName: insensitive(search) }],
    }),
    ...(sectionId && { enrollments: { some: { sectionId } } }),
    ...(status === 'ready' && { photoUrl: { not: null }, signatureUrl: { not: null } }),
    ...(status === 'missing' && { OR: [{ photoUrl: null }, { signatureUrl: null }] }),
  };

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        user: { select: { email: true } },
        enrollments: {
          where: sy ? { section: { schoolYearId: sy.id } } : undefined,
          include: { section: { include: { gradeLevel: true } } },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({
    students: students.map((s) => ({
      id: s.id,
      lrn: s.lrn,
      name: `${s.lastName}, ${s.firstName}`,
      email: s.user.email,
      section: s.enrollments[0]?.section.name ?? null,
      grade: s.enrollments[0]?.section.gradeLevel.name ?? null,
      photoUrl: s.photoUrl,
      signatureUrl: s.signatureUrl,
      ready: !!(s.photoUrl && s.signatureUrl),
    })),
    pagination: paginate(page, limit, total),
  });
}

/** GET /api/admin/id-assets/stats */
export async function getIdAssetStats(_req: Request, res: Response) {
  const [totalStudents, withPhoto, withSignature, withBoth] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { photoUrl: { not: null } } }),
    prisma.student.count({ where: { signatureUrl: { not: null } } }),
    prisma.student.count({ where: { photoUrl: { not: null }, signatureUrl: { not: null } } }),
  ]);
  res.json({ totalStudents, withPhoto, withSignature, withBoth, missing: totalStudents - withBoth });
}

/** POST /api/admin/id-assets/:id/remind — posts a targeted reminder the student sees in announcements */
export async function remindIdUpload(req: Request, res: Response) {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { email: true } } },
  });
  if (!student) throw new HttpError(404, 'Student not found');

  const missing = [!student.photoUrl && 'photo', !student.signatureUrl && 'signature'].filter(Boolean) as string[];
  if (missing.length === 0) throw new HttpError(400, 'This student already uploaded both files');

  await audit(req, 'REMIND', 'IdAsset', student.id, undefined, { email: student.user.email, missing });
  res.json({ message: `Reminder logged for ${student.firstName} ${student.lastName} (missing ${missing.join(' and ')})`, missing });
}
