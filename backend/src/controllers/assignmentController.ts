import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { teachingAssignmentSchema, paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/teaching-assignments
 * List teaching assignments with pagination and search
 */
export async function listAssignments(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { section: { name: { contains: search, mode: 'insensitive' } } },
            { subject: { code: { contains: search, mode: 'insensitive' } } },
            { subject: { title: { contains: search, mode: 'insensitive' } } },
            { teacher: { firstName: { contains: search, mode: 'insensitive' } } },
            { teacher: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [assignments, total] = await prisma.$transaction([
      prisma.sectionSubject.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ section: { name: 'asc' } }, { subject: { code: 'asc' } }],
        include: {
          section: {
            include: {
              gradeLevel: true,
              strand: true,
            },
          },
          subject: {
            include: {
              gradeLevel: true,
            },
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true, department: true },
          },
          _count: {
            select: { grades: true },
          },
        },
      }),
      prisma.sectionSubject.count({ where }),
    ]);

    res.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch teaching assignments' });
  }
}

/**
 * POST /api/admin/teaching-assignments
 * Assign a teacher to a section-subject
 */
export async function createAssignment(req: Request, res: Response) {
  try {
    const data = teachingAssignmentSchema.parse(req.body);

    // Check if assignment already exists
    const existing = await prisma.sectionSubject.findFirst({
      where: {
        sectionId: data.sectionId,
        subjectId: data.subjectId,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'This subject is already assigned to this section',
      });
    }

    // Verify section and subject belong to same grade level
    const [section, subject] = await Promise.all([
      prisma.section.findUnique({ where: { id: data.sectionId } }),
      prisma.subject.findUnique({ where: { id: data.subjectId } }),
    ]);

    if (!section || !subject) {
      return res.status(404).json({ error: 'Section or subject not found' });
    }

    if (section.gradeLevelId !== subject.gradeLevelId) {
      return res.status(400).json({
        error: 'Section and subject must be in the same grade level',
      });
    }

    const assignment = await prisma.sectionSubject.create({
      data: {
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
      },
      include: {
        section: true,
        subject: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    logger.info(`Assignment created: ${assignment.section.name} - ${assignment.subject.code}`);

    res.status(201).json({ assignment });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Assignment already exists' });
    }
    logger.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create teaching assignment' });
  }
}

/**
 * PUT /api/admin/teaching-assignments/:id
 * Update a teaching assignment (change teacher)
 */
export async function updateAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = teachingAssignmentSchema.partial().parse(req.body);

    const assignment = await prisma.sectionSubject.update({
      where: { id },
      data: {
        ...(data.teacherId && { teacherId: data.teacherId }),
        ...(data.sectionId && { sectionId: data.sectionId }),
        ...(data.subjectId && { subjectId: data.subjectId }),
      },
      include: {
        section: true,
        subject: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    res.json({ assignment });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    logger.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update teaching assignment' });
  }
}

/**
 * DELETE /api/admin/teaching-assignments/:id
 * Delete a teaching assignment
 */
export async function deleteAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignment = await prisma.sectionSubject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { grades: true },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment._count.grades > 0) {
      return res.status(400).json({
        error: 'Cannot delete assignment with existing grades',
      });
    }

    await prisma.sectionSubject.delete({ where: { id } });

    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    logger.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete teaching assignment' });
  }
}

/**
 * GET /api/admin/teaching-assignments/teacher-load
 * Get teacher load statistics (for heavy load warnings)
 */
export async function getTeacherLoad(req: Request, res: Response) {
  try {
    const teacherLoads = await prisma.teacher.findMany({
      include: {
        _count: {
          select: { assignments: true },
        },
        user: {
          select: { email: true, isActive: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    const loads = teacherLoads.map((t) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.user?.email,
      department: t.department,
      classCount: t._count.assignments,
      isActive: t.user?.isActive,
      heavyLoad: t._count.assignments > 6, // Warning threshold
    }));

    res.json({ loads });
  } catch (error) {
    logger.error('Get teacher load error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher loads' });
  }
}