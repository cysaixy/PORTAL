import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { subjectSchema, paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/subjects
 * List subjects with pagination and search
 */
export async function listSubjects(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { gradeLevel: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [subjects, total] = await prisma.$transaction([
      prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          gradeLevel: true,
          strand: true,
          _count: {
            select: { sections: true },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);

    res.json({
      subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

/**
 * POST /api/admin/subjects
 * Create a new subject
 */
export async function createSubject(req: Request, res: Response) {
  try {
    const data = subjectSchema.parse(req.body);

    const subject = await prisma.subject.create({
      data: {
        code: data.code,
        title: data.title,
        gradeLevelId: data.gradeLevelId,
        strandId: data.strandId || null,
        semester: data.semester || null,
        category: data.category,
        units: data.units || null,
      },
      include: {
        gradeLevel: true,
        strand: true,
      },
    });

    logger.info(`Subject created: ${subject.code}`);

    res.status(201).json({ subject });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Subject with this code already exists' });
    }
    logger.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
}

/**
 * PUT /api/admin/subjects/:id
 * Update a subject
 */
export async function updateSubject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = subjectSchema.partial().parse(req.body);

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.title && { title: data.title }),
        ...(data.gradeLevelId && { gradeLevelId: data.gradeLevelId }),
        ...(data.strandId !== undefined && { strandId: data.strandId }),
        ...(data.semester !== undefined && { semester: data.semester }),
        ...(data.category && { category: data.category }),
        ...(data.units !== undefined && { units: data.units }),
      },
      include: {
        gradeLevel: true,
        strand: true,
      },
    });

    res.json({ subject });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subject not found' });
    }
    logger.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
}

/**
 * DELETE /api/admin/subjects/:id
 * Delete a subject
 */
export async function deleteSubject(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (subject._count.sections > 0) {
      return res.status(400).json({
        error: 'Cannot delete subject with existing section assignments',
      });
    }

    await prisma.subject.delete({ where: { id } });

    res.json({ message: 'Subject deleted' });
  } catch (error) {
    logger.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
}

/**
 * GET /api/admin/subjects/stats
 * Get subject statistics for dashboard
 */
export async function getSubjectStats(req: Request, res: Response) {
  try {
    const totalSubjects = await prisma.subject.count();
    const withoutTeacher = await prisma.sectionSubject.count({
      where: { teacher: { isActive: false } },
    });
    // Subjects with no teacher assigned
    const subjectsWithoutTeacher = await prisma.subject.findMany({
      where: {
        sections: {
          none: {},
        },
      },
      include: {
        gradeLevel: true,
      },
    });

    res.json({
      totalSubjects,
      withoutTeacher: subjectsWithoutTeacher.length,
      subjectsWithoutTeacher,
    });
  } catch (error) {
    logger.error('Get subject stats error:', error);
    res.status(500).json({ error: 'Failed to fetch subject stats' });
  }
}