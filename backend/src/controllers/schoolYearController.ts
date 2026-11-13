import { Request, Response } from 'express';
import prisma from '../config/database';
import { audit, getCurrentSchoolYear, HttpError } from '../lib/http';
import { schoolYearSchema, schoolYearUpdateSchema } from '../lib/validation';

/** GET /api/admin/school-years */
export async function listSchoolYears(_req: Request, res: Response) {
  const schoolYears = await prisma.schoolYear.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { sections: true } } },
  });

  const studentCounts = await prisma.studentSection.groupBy({
    by: ['sectionId'],
    _count: { _all: true },
  });
  const sections = await prisma.section.findMany({ select: { id: true, schoolYearId: true } });
  const perYear = new Map<string, number>();
  for (const s of sections) {
    const c = studentCounts.find((x) => x.sectionId === s.id)?._count._all ?? 0;
    perYear.set(s.schoolYearId, (perYear.get(s.schoolYearId) ?? 0) + c);
  }

  res.json({
    schoolYears: schoolYears.map((sy) => ({
      ...sy,
      sectionCount: sy._count.sections,
      studentCount: perYear.get(sy.id) ?? 0,
    })),
  });
}

/** GET /api/admin/school-years/current */
export async function getCurrent(_req: Request, res: Response) {
  const schoolYear = await getCurrentSchoolYear();
  if (!schoolYear) throw new HttpError(404, 'No school year has been set up yet');
  res.json({ schoolYear });
}

/** POST /api/admin/school-years */
export async function createSchoolYear(req: Request, res: Response) {
  const data = schoolYearSchema.parse(req.body);
  const schoolYear = await prisma.$transaction(async (tx) => {
    if (data.isCurrent) await tx.schoolYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return tx.schoolYear.create({
      data: {
        label: data.label,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent,
      },
    });
  });
  await audit(req, 'CREATE', 'SchoolYear', schoolYear.id, undefined, { label: schoolYear.label });
  res.status(201).json({ schoolYear });
}

/** POST /api/admin/school-years/:id/set-current */
export async function setCurrentSchoolYear(req: Request, res: Response) {
  const { id } = req.params;
  const target = await prisma.schoolYear.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, 'School year not found');

  await prisma.$transaction([
    prisma.schoolYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
    prisma.schoolYear.update({ where: { id }, data: { isCurrent: true } }),
  ]);
  await audit(req, 'UPDATE', 'SchoolYear', id, undefined, { isCurrent: true, label: target.label });
  res.json({ message: `${target.label} is now the current school year` });
}

/** PUT /api/admin/school-years/:id */
export async function updateSchoolYear(req: Request, res: Response) {
  const { id } = req.params;
  const data = schoolYearUpdateSchema.parse(req.body);
  const schoolYear = await prisma.schoolYear.update({
    where: { id },
    data: {
      ...(data.label && { label: data.label }),
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    },
  });
  res.json({ schoolYear });
}

/** DELETE /api/admin/school-years/:id */
export async function deleteSchoolYear(req: Request, res: Response) {
  const { id } = req.params;
  const sy = await prisma.schoolYear.findUnique({ where: { id }, include: { _count: { select: { sections: true } } } });
  if (!sy) throw new HttpError(404, 'School year not found');
  if (sy.isCurrent) throw new HttpError(400, 'You cannot delete the current school year');
  if (sy._count.sections > 0) throw new HttpError(400, 'Remove this year’s sections before deleting it');
  await prisma.schoolYear.delete({ where: { id } });
  await audit(req, 'DELETE', 'SchoolYear', id, { label: sy.label });
  res.json({ message: 'School year deleted' });
}
