import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { audit, HttpError, insensitive, paginate, str } from '../lib/http';
import { paginationSchema, subjectSchema } from '../lib/validation';

/** GET /api/admin/subjects?gradeLevelId=&search= */
export async function listSubjects(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const gradeLevelId = str(req.query.gradeLevelId);

  const where: Prisma.SubjectWhereInput = {
    ...(gradeLevelId && { gradeLevelId }),
    ...(search && { OR: [{ code: insensitive(search) }, { title: insensitive(search) }] }),
  };

  const [subjects, total] = await prisma.$transaction([
    prisma.subject.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ gradeLevel: { number: 'asc' } }, { code: 'asc' }],
      include: { gradeLevel: true, strand: true, _count: { select: { sections: true } } },
    }),
    prisma.subject.count({ where }),
  ]);

  res.json({ subjects, pagination: paginate(page, limit, total) });
}

export async function createSubject(req: Request, res: Response) {
  const data = subjectSchema.parse(req.body);
  const subject = await prisma.subject.create({
    data: {
      code: data.code,
      title: data.title,
      gradeLevelId: data.gradeLevelId,
      strandId: data.strandId ?? null,
      semester: data.semester ?? null,
      category: data.category,
      units: data.units ?? null,
    },
    include: { gradeLevel: true, strand: true },
  });
  await audit(req, 'CREATE', 'Subject', subject.id, undefined, { code: subject.code });
  res.status(201).json({ subject });
}

export async function updateSubject(req: Request, res: Response) {
  const data = subjectSchema.partial().parse(req.body);
  const subject = await prisma.subject.update({
    where: { id: req.params.id },
    data: {
      ...(data.code && { code: data.code }),
      ...(data.title && { title: data.title }),
      ...(data.gradeLevelId && { gradeLevelId: data.gradeLevelId }),
      ...(data.strandId !== undefined && { strandId: data.strandId }),
      ...(data.semester !== undefined && { semester: data.semester }),
      ...(data.category && { category: data.category }),
      ...(data.units !== undefined && { units: data.units }),
    },
    include: { gradeLevel: true, strand: true },
  });
  res.json({ subject });
}

export async function deleteSubject(req: Request, res: Response) {
  const { id } = req.params;
  const subject = await prisma.subject.findUnique({ where: { id }, include: { _count: { select: { sections: true } } } });
  if (!subject) throw new HttpError(404, 'Subject not found');
  if (subject._count.sections) throw new HttpError(400, `${subject.code} is assigned to sections; remove those first`);
  await prisma.subject.delete({ where: { id } });
  await audit(req, 'DELETE', 'Subject', id, { code: subject.code });
  res.json({ message: 'Subject deleted' });
}
