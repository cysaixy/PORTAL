import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError, insensitive, paginate, str } from '../lib/http';
import { enrollStudentsSchema, paginationSchema, sectionSchema } from '../lib/validation';

/** GET /api/admin/sections?schoolYearId=&gradeLevelId=&search= */
export async function listSections(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const gradeLevelId = str(req.query.gradeLevelId);
  let schoolYearId = str(req.query.schoolYearId);
  if (!schoolYearId) schoolYearId = (await getCurrentSchoolYear())?.id;

  const where: Prisma.SectionWhereInput = {
    ...(schoolYearId && schoolYearId !== 'all' && { schoolYearId }),
    ...(gradeLevelId && { gradeLevelId }),
    ...(search && {
      OR: [
        { name: insensitive(search) },
        { gradeLevel: { name: insensitive(search) } },
        { strand: { code: insensitive(search) } },
        { adviser: { lastName: insensitive(search) } },
        { adviser: { firstName: insensitive(search) } },
      ],
    }),
  };

  const [sections, total] = await prisma.$transaction([
    prisma.section.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ gradeLevel: { number: 'asc' } }, { name: 'asc' }],
      include: {
        gradeLevel: true,
        strand: true,
        adviser: { select: { id: true, firstName: true, lastName: true, department: true } },
        schoolYear: true,
        _count: { select: { students: true, subjects: true } },
      },
    }),
    prisma.section.count({ where }),
  ]);

  res.json({ sections, pagination: paginate(page, limit, total) });
}

/** GET /api/admin/sections/:id */
export async function getSection(req: Request, res: Response) {
  const section = await prisma.section.findUnique({
    where: { id: req.params.id },
    include: {
      gradeLevel: true,
      strand: true,
      adviser: { select: { id: true, firstName: true, lastName: true, department: true } },
      schoolYear: true,
      students: {
        include: {
          student: { select: { id: true, lrn: true, firstName: true, lastName: true, sex: true } },
        },
        orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
      },
      subjects: {
        include: {
          subject: true,
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { subject: { code: 'asc' } },
      },
    },
  });
  if (!section) throw new HttpError(404, 'Section not found');
  res.json({ section });
}

async function assertAdviserFree(adviserId: string | null | undefined, schoolYearId: string, exceptSectionId?: string) {
  if (!adviserId) return;
  const clash = await prisma.section.findFirst({
    where: { adviserId, schoolYearId, ...(exceptSectionId && { id: { not: exceptSectionId } }) },
  });
  if (clash) throw new HttpError(409, `That teacher already advises ${clash.name} this school year`);
}

/** POST /api/admin/sections */
export async function createSection(req: Request, res: Response) {
  const data = sectionSchema.parse(req.body);
  await assertAdviserFree(data.adviserId, data.schoolYearId);
  const section = await prisma.section.create({
    data: {
      name: data.name,
      gradeLevelId: data.gradeLevelId,
      strandId: data.strandId ?? null,
      adviserId: data.adviserId ?? null,
      schoolYearId: data.schoolYearId,
      capacity: data.capacity,
    },
    include: { gradeLevel: true, strand: true, adviser: true, schoolYear: true },
  });
  await audit(req, 'CREATE', 'Section', section.id, undefined, { name: section.name });
  res.status(201).json({ section });
}

/** PUT /api/admin/sections/:id */
export async function updateSection(req: Request, res: Response) {
  const { id } = req.params;
  const data = sectionSchema.partial().parse(req.body);
  const existing = await prisma.section.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Section not found');
  await assertAdviserFree(data.adviserId, data.schoolYearId ?? existing.schoolYearId, id);

  const section = await prisma.section.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.gradeLevelId && { gradeLevelId: data.gradeLevelId }),
      ...(data.strandId !== undefined && { strandId: data.strandId }),
      ...(data.adviserId !== undefined && { adviserId: data.adviserId }),
      ...(data.schoolYearId && { schoolYearId: data.schoolYearId }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
    },
    include: { gradeLevel: true, strand: true, adviser: true, schoolYear: true },
  });
  await audit(req, 'UPDATE', 'Section', id, { name: existing.name, adviserId: existing.adviserId }, data);
  res.json({ section });
}

/** DELETE /api/admin/sections/:id */
export async function deleteSection(req: Request, res: Response) {
  const { id } = req.params;
  const section = await prisma.section.findUnique({
    where: { id },
    include: { _count: { select: { students: true, subjects: true } } },
  });
  if (!section) throw new HttpError(404, 'Section not found');
  if (section._count.students || section._count.subjects) {
    throw new HttpError(400, 'Remove the students and subject assignments from this section first');
  }
  await prisma.section.delete({ where: { id } });
  await audit(req, 'DELETE', 'Section', id, { name: section.name });
  res.json({ message: 'Section deleted' });
}

/** POST /api/admin/sections/:id/students — enroll students */
export async function enrollStudents(req: Request, res: Response) {
  const { id } = req.params;
  const { studentIds } = enrollStudentsSchema.parse(req.body);
  const section = await prisma.section.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!section) throw new HttpError(404, 'Section not found');

  if (section._count.students + studentIds.length > section.capacity) {
    throw new HttpError(400, `${section.name} only has ${section.capacity - section._count.students} seat(s) left`);
  }

  // A student can only be in one section per school year
  const conflicts = await prisma.studentSection.findMany({
    where: { studentId: { in: studentIds }, section: { schoolYearId: section.schoolYearId } },
    include: { student: true, section: true },
  });
  if (conflicts.length) {
    const c = conflicts[0];
    throw new HttpError(
      409,
      `${c.student.firstName} ${c.student.lastName} is already enrolled in ${c.section.name} this school year`
    );
  }

  const result = await prisma.studentSection.createMany({
    data: studentIds.map((studentId) => ({ studentId, sectionId: id })),
    skipDuplicates: true,
  });
  await audit(req, 'ENROLL', 'Section', id, undefined, { count: result.count, studentIds });
  res.status(201).json({ enrolled: result.count });
}

/** DELETE /api/admin/sections/:id/students/:studentId — drop a student */
export async function unenrollStudent(req: Request, res: Response) {
  const { id, studentId } = req.params;
  const enrollment = await prisma.studentSection.findUnique({
    where: { studentId_sectionId: { studentId, sectionId: id } },
    include: { _count: { select: { grades: true } } },
  });
  if (!enrollment) throw new HttpError(404, 'Student is not enrolled in this section');
  if (enrollment._count.grades > 0) {
    throw new HttpError(400, 'This student already has grades in this section and cannot be removed');
  }
  await prisma.studentSection.delete({ where: { id: enrollment.id } });
  await audit(req, 'UNENROLL', 'Section', id, { studentId });
  res.json({ message: 'Student removed from section' });
}
