import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError, insensitive, paginate, str } from '../lib/http';
import { paginationSchema, teachingAssignmentSchema } from '../lib/validation';

const HEAVY_LOAD = 6;

const include = {
  section: { include: { gradeLevel: true, strand: true } },
  subject: true,
  teacher: { select: { id: true, firstName: true, lastName: true, department: true } },
  _count: { select: { grades: true } },
} satisfies Prisma.SectionSubjectInclude;

/** GET /api/admin/teaching-assignments?teacherId=&sectionId=&search= (current school year) */
export async function listAssignments(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const sy = await getCurrentSchoolYear();
  const teacherId = str(req.query.teacherId);
  const sectionId = str(req.query.sectionId);

  const where: Prisma.SectionSubjectWhereInput = {
    ...(sy && { section: { schoolYearId: sy.id } }),
    ...(teacherId && { teacherId }),
    ...(sectionId && { sectionId }),
    ...(search && {
      OR: [
        { section: { name: insensitive(search) } },
        { subject: { code: insensitive(search) } },
        { subject: { title: insensitive(search) } },
        { teacher: { lastName: insensitive(search) } },
        { teacher: { firstName: insensitive(search) } },
      ],
    }),
  };

  const [assignments, total] = await prisma.$transaction([
    prisma.sectionSubject.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ section: { gradeLevel: { number: 'asc' } } }, { section: { name: 'asc' } }, { subject: { code: 'asc' } }],
      include,
    }),
    prisma.sectionSubject.count({ where }),
  ]);

  res.json({ assignments, pagination: paginate(page, limit, total) });
}

async function validatePair(sectionId: string, subjectId: string, teacherId: string) {
  const [section, subject, teacher] = await Promise.all([
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.teacher.findUnique({ where: { id: teacherId } }),
  ]);
  if (!section) throw new HttpError(404, 'Section not found');
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (!teacher) throw new HttpError(404, 'Teacher not found');
  if (section.gradeLevelId !== subject.gradeLevelId) {
    throw new HttpError(400, 'The subject belongs to a different grade level than the section');
  }
  if (subject.strandId && section.strandId && subject.strandId !== section.strandId) {
    throw new HttpError(400, 'The subject belongs to a different strand than the section');
  }
}

/** POST /api/admin/teaching-assignments */
export async function createAssignment(req: Request, res: Response) {
  const data = teachingAssignmentSchema.parse(req.body);
  await validatePair(data.sectionId, data.subjectId, data.teacherId);

  const existing = await prisma.sectionSubject.findUnique({
    where: { sectionId_subjectId: { sectionId: data.sectionId, subjectId: data.subjectId } },
  });
  if (existing) throw new HttpError(409, 'This subject already has a teacher in that section — edit it instead');

  const assignment = await prisma.sectionSubject.create({ data, include });
  await audit(req, 'CREATE', 'TeachingAssignment', assignment.id, undefined, {
    section: assignment.section.name,
    subject: assignment.subject.code,
    teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
  });
  res.status(201).json({ assignment });
}

/** PUT /api/admin/teaching-assignments/:id — usually to reassign the teacher */
export async function updateAssignment(req: Request, res: Response) {
  const { id } = req.params;
  const data = teachingAssignmentSchema.partial().parse(req.body);
  const current = await prisma.sectionSubject.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, 'Assignment not found');

  const next = { ...current, ...data };
  await validatePair(next.sectionId, next.subjectId, next.teacherId);

  const assignment = await prisma.sectionSubject.update({
    where: { id },
    data: { sectionId: next.sectionId, subjectId: next.subjectId, teacherId: next.teacherId },
    include,
  });
  await audit(req, 'UPDATE', 'TeachingAssignment', id, { teacherId: current.teacherId }, { teacherId: next.teacherId });
  res.json({ assignment });
}

/** DELETE /api/admin/teaching-assignments/:id */
export async function deleteAssignment(req: Request, res: Response) {
  const { id } = req.params;
  const assignment = await prisma.sectionSubject.findUnique({ where: { id }, include });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  if (assignment._count.grades > 0) {
    throw new HttpError(400, 'Grades have been encoded for this class; reassign the teacher instead of deleting');
  }
  await prisma.sectionSubject.delete({ where: { id } });
  await audit(req, 'DELETE', 'TeachingAssignment', id, { section: assignment.section.name, subject: assignment.subject.code });
  res.json({ message: 'Assignment removed' });
}

/** GET /api/admin/teaching-assignments/teacher-load */
export async function getTeacherLoad(_req: Request, res: Response) {
  const sy = await getCurrentSchoolYear();
  const teachers = await prisma.teacher.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      user: { select: { email: true, isActive: true } },
      assignments: { where: sy ? { section: { schoolYearId: sy.id } } : {}, select: { id: true } },
    },
  });
  res.json({
    loads: teachers.map((t) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.user.email,
      department: t.department,
      classCount: t.assignments.length,
      isActive: t.user.isActive,
      heavyLoad: t.assignments.length > HEAVY_LOAD,
    })),
  });
}
