import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { sectionSchema, paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/sections
 * List sections with pagination and search
 */
export async function listSections(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { gradeLevel: { name: { contains: search, mode: 'insensitive' } } },
            { strand: { name: { contains: search, mode: 'insensitive' } } },
            { adviser: { firstName: { contains: search, mode: 'insensitive' } } },
            { adviser: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [sections, total] = await prisma.$transaction([
      prisma.section.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          gradeLevel: true,
          strand: true,
          adviser: {
            select: { id: true, firstName: true, lastName: true, department: true },
          },
          schoolYear: true,
          _count: {
            select: { students: true, subjects: true },
          },
        },
      }),
      prisma.section.count({ where }),
    ]);

    res.json({
      sections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List sections error:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
}

/**
 * GET /api/admin/sections/:id
 * Get section details
 */
export async function getSection(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        gradeLevel: true,
        strand: true,
        adviser: true,
        schoolYear: true,
        students: {
          include: {
            student: {
              select: { id: true, lrn: true, firstName: true, lastName: true, sex: true },
            },
          },
        },
        subjects: {
          include: {
            subject: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true, department: true },
            },
          },
        },
      },
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ section });
  } catch (error) {
    logger.error('Get section error:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
}

/**
 * POST /api/admin/sections
 * Create a new section
 */
export async function createSection(req: Request, res: Response) {
  try {
    const data = sectionSchema.parse(req.body);

    // Check if section name already exists for this school year
    const existing = await prisma.section.findFirst({
      where: {
        name: data.name,
        schoolYearId: data.schoolYearId,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Section with this name already exists in this school year',
      });
    }

    const section = await prisma.section.create({
      data: {
        name: data.name,
        gradeLevelId: data.gradeLevelId,
        strandId: data.strandId || null,
        adviserId: data.adviserId || null,
        schoolYearId: data.schoolYearId,
        capacity: data.capacity,
      },
      include: {
        gradeLevel: true,
        strand: true,
        adviser: true,
        schoolYear: true,
      },
    });

    logger.info(`Section created: ${section.name}`);

    res.status(201).json({ section });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Section already exists' });
    }
    logger.error('Create section error:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
}

/**
 * PUT /api/admin/sections/:id
 * Update a section
 */
export async function updateSection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = sectionSchema.partial().parse(req.body);

    // Check name uniqueness if name is being changed
    if (data.name) {
      const existing = await prisma.section.findFirst({
        where: {
          name: data.name,
          schoolYearId: data.schoolYearId || undefined,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: 'Section with this name already exists in this school year',
        });
      }
    }

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
      include: {
        gradeLevel: true,
        strand: true,
        adviser: true,
        schoolYear: true,
      },
    });

    res.json({ section });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Section not found' });
    }
    logger.error('Update section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
}

/**
 * DELETE /api/admin/sections/:id
 * Delete a section
 */
export async function deleteSection(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, subjects: true },
        },
      },
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section._count.students > 0 || section._count.subjects > 0) {
      return res.status(400).json({
        error: 'Cannot delete section with existing enrollments or subjects',
      });
    }

    await prisma.section.delete({ where: { id } });

    res.json({ message: 'Section deleted' });
  } catch (error) {
    logger.error('Delete section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
}

/**
 * GET /api/admin/sections/stats
 * Get section statistics for dashboard
 */
export async function getSectionStats(req: Request, res: Response) {
  try {
    const totalSections = await prisma.section.count();
    const juniorHigh = await prisma.section.count({
      where: { gradeLevel: { number: { lte: 10 } } },
    });
    const seniorHigh = await prisma.section.count({
      where: { gradeLevel: { number: { gt: 10 } } },
    });
    const withAdviser = await prisma.section.count({
      where: { adviserId: { not: null } },
    });
    const withoutAdviser = totalSections - withAdviser;

    res.json({
      totalSections,
      juniorHigh,
      seniorHigh,
      withAdviser,
      withoutAdviser,
    });
  } catch (error) {
    logger.error('Get section stats error:', error);
    res.status(500).json({ error: 'Failed to fetch section stats' });
  }
}