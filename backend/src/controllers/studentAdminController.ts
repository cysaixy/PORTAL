import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { studentSchema, paginationSchema } from '../lib/validation';

const asString = (val: string | string[] | undefined): string | undefined => {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
};

/**
 * GET /api/admin/students
 * List students with pagination, search, and section filter
 */
export async function listStudents(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const { sectionId } = req.query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { lrn: { contains: asString(search)!, mode: 'insensitive' } },
        { firstName: { contains: asString(search)!, mode: 'insensitive' } },
        { lastName: { contains: asString(search)!, mode: 'insensitive' } },
      ];
    }

    if (sectionId) {
      where.enrollments = {
        some: {
          sectionId: asString(sectionId)!,
        },
      };
    }

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          user: {
            select: { email: true, isActive: true, role: true },
          },
          enrollments: {
            include: {
              section: {
                include: {
                  gradeLevel: true,
                  schoolYear: true,
                },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

/**
 * POST /api/admin/students
 * Create a new student (creates user allowlist entry + student profile)
 */
export async function createStudent(req: Request, res: Response) {
  try {
    const data = studentSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if LRN already exists
    const existingStudent = await prisma.student.findUnique({
      where: { lrn: data.lrn },
    });

    if (existingStudent) {
      return res.status(409).json({ error: 'LRN already registered' });
    }

    const student = await prisma.$transaction(async (tx) => {
      // Create user allowlist entry
      const user = await tx.user.create({
        data: {
          email: data.email,
          role: data.role,
          isActive: true,
          firebaseUid: `dev-student-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      });

      // Create student profile
      return await tx.student.create({
        data: {
          userId: user.id,
          lrn: data.lrn,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          suffix: data.suffix || null,
          birthdate: new Date(data.birthdate),
          sex: data.sex,
          guardianName: data.guardianName,
          guardianContact: data.guardianContact,
          guardianEmail: data.guardianEmail || null,
          address: data.address,
        },
        include: {
          user: true,
        },
      });
    });

    // Enroll in section if provided
    if (data.sectionId && data.schoolYearId) {
      await prisma.studentSection.create({
        data: {
          studentId: student.id,
          sectionId: data.sectionId,
        },
      });
    }

    logger.info(`Student created: ${student.lrn} - ${student.firstName} ${student.lastName}`);

    res.status(201).json({ student });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email or LRN already exists' });
    }
    logger.error('Create student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
}

/**
 * PUT /api/admin/students/:id
 * Update a student
 */
export async function updateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = studentSchema.partial().parse(req.body);

    // Check LRN uniqueness if changing
    if (data.lrn) {
      const existing = await prisma.student.findFirst({
        where: { lrn: data.lrn, id: { not: id } },
      });
      if (existing) {
        return res.status(409).json({ error: 'LRN already exists' });
      }
    }

    // Check email uniqueness if changing
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email },
        include: { student: { where: { id: { not: id } } } },
      });
      if (existing && existing.student && existing.student.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(data.lrn && { lrn: data.lrn }),
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.middleName !== undefined && { middleName: data.middleName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.suffix !== undefined && { suffix: data.suffix }),
        ...(data.birthdate && { birthdate: new Date(data.birthdate) }),
        ...(data.sex && { sex: data.sex }),
        ...(data.guardianName && { guardianName: data.guardianName }),
        ...(data.guardianContact && { guardianContact: data.guardianContact }),
        ...(data.guardianEmail !== undefined && { guardianEmail: data.guardianEmail }),
        ...(data.address && { address: data.address }),
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

    res.json({ student });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Student not found' });
    }
    logger.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
}

/**
 * DELETE /api/admin/students/:id
 * Delete a student
 */
export async function deleteStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: true,
        grades: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.enrollments.length > 0 || student.grades.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete student with existing enrollments or grades',
      });
    }

    await prisma.student.delete({ where: { id } });

    res.json({ message: 'Student deleted' });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
}

/**
 * GET /api/admin/students/no-section
 * Get students not enrolled in any section
 */
export async function getStudentsWithoutSection(req: Request, res: Response) {
  try {
    const currentYear = await prisma.schoolYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentYear) {
      return res.json({ students: [] });
    }

    const students = await prisma.student.findMany({
      where: {
        user: { isActive: true },
        enrollments: {
          none: {
            section: {
              schoolYearId: currentYear.id,
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        user: { select: { email: true } },
      },
    });

    res.json({ students });
  } catch (error) {
    logger.error('Get students without section error:', error);
    res.status(500).json({ error: 'Failed to fetch students without section' });
  }
}