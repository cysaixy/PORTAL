import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { schoolYearSchema, paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/school-years
 * List all school years
 */
export async function listSchoolYears(req: Request, res: Response) {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: [{ isCurrent: 'desc' }, { label: 'desc' }],
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });

    res.json({ schoolYears });
  } catch (error) {
    logger.error('List school years error:', error);
    res.status(500).json({ error: 'Failed to fetch school years' });
  }
}

/**
 * GET /api/admin/school-years/current
 * Get the current school year
 */
export async function getCurrentSchoolYear(req: Request, res: Response) {
  try {
    const schoolYear = await prisma.schoolYear.findFirst({
      where: { isCurrent: true },
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });

    if (!schoolYear) {
      return res.status(404).json({ error: 'No current school year found' });
    }

    res.json({ schoolYear });
  } catch (error) {
    logger.error('Get current school year error:', error);
    res.status(500).json({ error: 'Failed to fetch current school year' });
  }
}

/**
 * POST /api/admin/school-years
 * Create a new school year
 */
export async function createSchoolYear(req: Request, res: Response) {
  try {
    const data = schoolYearSchema.parse(req.body);

    // If this is set as current, unset any other current year
    if (data.isCurrent) {
      await prisma.schoolYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const schoolYear = await prisma.schoolYear.create({
      data: {
        label: data.label,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent,
      },
    });

    logger.info(`School year created: ${schoolYear.label} (current: ${schoolYear.isCurrent})`);

    res.status(201).json({ schoolYear });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'School year with this label already exists' });
    }
    logger.error('Create school year error:', error);
    res.status(500).json({ error: 'Failed to create school year' });
  }
}

/**
 * POST /api/admin/school-years/:id/set-current
 * Set a school year as current (unset all others)
 */
export async function setCurrentSchoolYear(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verify the school year exists
    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id },
    });

    if (!schoolYear) {
      return res.status(404).json({ error: 'School year not found' });
    }

    // Unset all current years, then set this one
    await prisma.$transaction([
      prisma.schoolYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.schoolYear.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    logger.info(`School year set as current: ${schoolYear.label}`);

    res.json({ message: 'School year set as current' });
  } catch (error) {
    logger.error('Set current school year error:', error);
    res.status(500).json({ error: 'Failed to set current school year' });
  }
}

/**
 * POST /api/admin/school-years/start-new
 * Start a new school year (creates new year, marks it current, leaves old grades attached)
 */
export async function startNewSchoolYear(req: Request, res: Response) {
  try {
    const { label, startDate, endDate } = req.body;

    if (!label || !startDate || !endDate) {
      return res.status(400).json({ error: 'Label, start date, and end date are required' });
    }

    const newYear = await prisma.$transaction(async (tx) => {
      // Unset any current year
      await tx.schoolYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      // Create new school year as current
      return await tx.schoolYear.create({
        data: {
          label,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isCurrent: true,
        },
      });
    });

    logger.info(`New school year started: ${newYear.label}`);

    res.status(201).json({ schoolYear: newYear });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'School year with this label already exists' });
    }
    logger.error('Start new school year error:', error);
    res.status(500).json({ error: 'Failed to start new school year' });
  }
}

/**
 * PUT /api/admin/school-years/:id
 * Update a school year
 */
export async function updateSchoolYear(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = schoolYearSchema.partial().parse(req.body);

    // If setting as current, unset others
    if (data.isCurrent) {
      await prisma.schoolYear.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const schoolYear = await prisma.schoolYear.update({
      where: { id },
      data: {
        ...(data.label && { label: data.label }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      },
    });

    res.json({ schoolYear });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'School year with this label already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'School year not found' });
    }
    logger.error('Update school year error:', error);
    res.status(500).json({ error: 'Failed to update school year' });
  }
}

/**
 * DELETE /api/admin/school-years/:id
 * Delete a school year (only if no sections reference it)
 */
export async function deleteSchoolYear(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });

    if (!schoolYear) {
      return res.status(404).json({ error: 'School year not found' });
    }

    if (schoolYear._count.sections > 0) {
      return res.status(400).json({
        error: 'Cannot delete school year with existing sections',
      });
    }

    await prisma.schoolYear.delete({ where: { id } });

    res.json({ message: 'School year deleted' });
  } catch (error) {
    logger.error('Delete school year error:', error);
    res.status(500).json({ error: 'Failed to delete school year' });
  }
}