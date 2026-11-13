import { Request, Response } from 'express';
import prisma from '../config/database';
import { audit, HttpError } from '../lib/http';
import { gradeLevelSchema, strandSchema } from '../lib/validation';

// ============================================================================
// Grade levels
// ============================================================================

/** GET /api/admin/grade-levels (also used by teachers for announcement targets) */
export async function listGradeLevels(_req: Request, res: Response) {
  const gradeLevels = await prisma.gradeLevel.findMany({
    orderBy: { number: 'asc' },
    include: { _count: { select: { sections: true, subjects: true } } },
  });
  res.json({
    gradeLevels: gradeLevels.map(({ _count, ...gl }) => ({
      ...gl,
      sectionCount: _count.sections,
      subjectCount: _count.subjects,
    })),
  });
}

export async function createGradeLevel(req: Request, res: Response) {
  const data = gradeLevelSchema.parse(req.body);
  const gradeLevel = await prisma.gradeLevel.create({
    data: { ...data, isSeniorHigh: data.isSeniorHigh || data.number >= 11 },
  });
  await audit(req, 'CREATE', 'GradeLevel', gradeLevel.id, undefined, data);
  res.status(201).json({ gradeLevel });
}

export async function updateGradeLevel(req: Request, res: Response) {
  const data = gradeLevelSchema.partial().parse(req.body);
  const gradeLevel = await prisma.gradeLevel.update({ where: { id: req.params.id }, data });
  res.json({ gradeLevel });
}

export async function deleteGradeLevel(req: Request, res: Response) {
  const { id } = req.params;
  const gl = await prisma.gradeLevel.findUnique({
    where: { id },
    include: { _count: { select: { sections: true, subjects: true } } },
  });
  if (!gl) throw new HttpError(404, 'Grade level not found');
  if (gl._count.sections || gl._count.subjects) {
    throw new HttpError(400, `${gl.name} still has sections or subjects`);
  }
  await prisma.gradeLevel.delete({ where: { id } });
  await audit(req, 'DELETE', 'GradeLevel', id, { name: gl.name });
  res.json({ message: 'Grade level deleted' });
}

// ============================================================================
// Strands
// ============================================================================

export async function listStrands(_req: Request, res: Response) {
  const strands = await prisma.strand.findMany({
    orderBy: { code: 'asc' },
    include: { _count: { select: { sections: true, subjects: true } } },
  });
  res.json({
    strands: strands.map(({ _count, ...s }) => ({
      ...s,
      sectionCount: _count.sections,
      subjectCount: _count.subjects,
    })),
  });
}

export async function createStrand(req: Request, res: Response) {
  const data = strandSchema.parse(req.body);
  const strand = await prisma.strand.create({ data });
  await audit(req, 'CREATE', 'Strand', strand.id, undefined, { code: strand.code });
  res.status(201).json({ strand });
}

export async function updateStrand(req: Request, res: Response) {
  const data = strandSchema.partial().parse(req.body);
  const strand = await prisma.strand.update({ where: { id: req.params.id }, data });
  res.json({ strand });
}

export async function deleteStrand(req: Request, res: Response) {
  const { id } = req.params;
  const strand = await prisma.strand.findUnique({
    where: { id },
    include: { _count: { select: { sections: true, subjects: true } } },
  });
  if (!strand) throw new HttpError(404, 'Strand not found');
  if (strand._count.sections || strand._count.subjects) {
    throw new HttpError(400, `${strand.code} is still used by sections or subjects`);
  }
  await prisma.strand.delete({ where: { id } });
  await audit(req, 'DELETE', 'Strand', id, { code: strand.code });
  res.json({ message: 'Strand deleted' });
}
