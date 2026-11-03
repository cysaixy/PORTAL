import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { teacherSchema, paginationSchema } from '../lib/validation';

const asString = (val: string | string[] | undefined): string | undefined => {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
};

/**
 * GET /api/admin/teachers
 * List teachers with pagination and search
 */
export async function listTeachers(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: asString(search)!, mode: 'insensitive' } },
        { lastName: { contains: asString(search)!, mode: 'insensitive' } },
        { department: { contains: asString(search)!, mode: 'insensitive' } },
      ];
    }

    const [teachers, total] = await prisma.$transaction([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          user: {
            select: { email: true, isActive: true, role: true },
          },
          advisorySections: {
            include: {
              schoolYear: true,
            },
          },
          assignments: {
            include: {
              section: {
                include: {
                  gradeLevel: true,
                },
              },
              subject: true,
            },
          },
        },
      }),
      prisma.teacher.count({ where }),
    ]);

    res.json({
      teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
}

/**
 * POST /api/admin/teachers
 * Create a new teacher
 */
export async function createTeacher(req: Request, res: Response) {
  try {
    const data = teacherSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          role: data.role,
          isActive: true,
          firebaseUid: `dev-teacher-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      });

      return await tx.teacher.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          suffix: data.suffix || null,
          department: data.department || null,
        },
        include: {
          user: true,
        },
      });
    });

    logger.info(`Teacher created: ${teacher.firstName} ${teacher.lastName}`);

    res.status(201).json({ teacher });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    logger.error('Create teacher error:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
}

/**
 * PUT /api/admin/teachers/:id
 */
export async function updateTeacher(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = teacherSchema.partial().parse(req.body);

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email },
        include: { teacher: { where: { id: { not: id } } } },
      });
      if (existing && existing.teacher && existing.teacher.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.middleName !== undefined && { middleName: data.middleName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.suffix !== undefined && { suffix: data.suffix }),
        ...(data.department !== undefined && { department: data.department }),
        user: data.email
          ? {
              update: {
                email: data.email,
                ...(data.role && { role: data.role }),
              },
            }
          : undefined,
      },
      include: {
        user: true,
      },
    });

    res.json({ teacher });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    logger.error('Update teacher error:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
}

/**
 * DELETE /api/admin/teachers/:id
 */
export async function deleteTeacher(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        advisorySections: true,
        assignments: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.advisorySections.length > 0 || teacher.assignments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete teacher with existing sections or assignments',
      });
    }

    await prisma.teacher.delete({ where: { id } });

    res.json({ message: 'Teacher deleted' });
  } catch (error) {
    logger.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
}

/**
 * GET /api/admin/teachers/stats
 */
export async function getTeacherStats(req: Request, res: Response) {
  try {
    const totalTeachers = await prisma.teacher.count();
    const activeTeachers = await prisma.teacher.count({
      where: { user: { isActive: true } },
    });

    const teachersWithLoad = await prisma.teacher.count({
      where: {
        assignments: {
          some: {},
        },
      },
    });

    res.json({
      totalTeachers,
      activeTeachers,
      teaching: teachersWithLoad,
      withoutLoad: totalTeachers - teachersWithLoad,
    });
  } catch (error) {
    logger.error('Get teacher stats error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher stats' });
  }
}