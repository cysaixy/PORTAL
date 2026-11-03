import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { announcementSchema, paginationSchema } from '../lib/validation';

// ============================================================================
// Admin: Manage all announcements
// ============================================================================

/**
 * GET /api/admin/announcements
 * List all announcements with pagination
 */
export async function listAdminAnnouncements(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: {
            select: { email: true, role: true },
          },
          _count: {
            select: { reads: true },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List admin announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * POST /api/admin/announcements
 * Create an announcement (admin)
 */
export async function createAdminAnnouncement(req: Request, res: Response) {
  try {
    const data = announcementSchema.parse(req.body);
    const authorId = req.user!.id;

    // Validate targetId for SECTION/GRADE_LEVEL audiences
    if ((data.audience === 'SECTION' || data.audience === 'GRADE_LEVEL') && !data.targetId) {
      return res.status(400).json({
        error: 'Target ID is required for section or grade level audience',
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        authorId,
        title: data.title,
        body: data.body,
        audience: data.audience,
        targetId: data.targetId || null,
        isPinned: data.isPinned,
      },
      include: {
        author: {
          select: { email: true, role: true },
        },
      },
    });

    logger.info(`Announcement created: ${announcement.title} by ${req.user!.email}`);

    res.status(201).json({ announcement });
  } catch (error: any) {
    logger.error('Create admin announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
}

/**
 * PUT /api/admin/announcements/:id
 * Update an announcement (admin)
 */
export async function updateAdminAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = announcementSchema.partial().parse(req.body);

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.body && { body: data.body }),
        ...(data.audience && { audience: data.audience }),
        ...(data.targetId !== undefined && { targetId: data.targetId }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      },
      include: {
        author: {
          select: { email: true, role: true },
        },
      },
    });

    res.json({ announcement });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    logger.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
}

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement (admin)
 */
export async function deleteAdminAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({ where: { id } });

    res.json({ message: 'Announcement deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    logger.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

// ============================================================================
// Teacher: Manage own announcements
// ============================================================================

/**
 * GET /api/teacher/announcements
 * List teacher's announcements
 */
export async function listTeacherAnnouncements(req: Request, res: Response) {
  try {
    const teacherId = req.user!.id;

    const announcements = await prisma.announcement.findMany({
      where: { authorId: teacherId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { reads: true },
        },
      },
    });

    res.json({ announcements });
  } catch (error) {
    logger.error('List teacher announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * POST /api/teacher/announcements
 * Create an announcement (teacher)
 */
export async function createTeacherAnnouncement(req: Request, res: Response) {
  try {
    const data = announcementSchema.parse(req.body);
    const authorId = req.user!.id;

    if ((data.audience === 'SECTION' || data.audience === 'GRADE_LEVEL') && !data.targetId) {
      return res.status(400).json({
        error: 'Target ID is required for section or grade level audience',
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        authorId,
        title: data.title,
        body: data.body,
        audience: data.audience,
        targetId: data.targetId || null,
        isPinned: data.isPinned,
      },
      include: {
        author: {
          select: { email: true, role: true },
        },
      },
    });

    res.status(201).json({ announcement });
  } catch (error: any) {
    logger.error('Create teacher announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
}

/**
 * PUT /api/teacher/announcements/:id
 * Update a teacher's own announcement
 */
export async function updateTeacherAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const teacherId = req.user!.id;
    const data = announcementSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (existing.authorId !== teacherId) {
      return res.status(403).json({
        error: 'You can only edit your own announcements',
      });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.body && { body: data.body }),
        ...(data.audience && { audience: data.audience }),
        ...(data.targetId !== undefined && { targetId: data.targetId }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      },
    });

    res.json({ announcement });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    logger.error('Update teacher announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
}

/**
 * DELETE /api/teacher/announcements/:id
 * Delete a teacher's own announcement
 */
export async function deleteTeacherAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const teacherId = req.user!.id;

    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (existing.authorId !== teacherId) {
      return res.status(403).json({
        error: 'You can only delete your own announcements',
      });
    }

    await prisma.announcement.delete({ where: { id } });

    res.json({ message: 'Announcement deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    logger.error('Delete teacher announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

// ============================================================================
// Student: View announcements
// ============================================================================

/**
 * GET /api/student/announcements
 * List announcements for a student (based on audience)
 */
export async function listStudentAnnouncements(req: Request, res: Response) {
  try {
    const studentId = req.user!.id;

    // Get the student's section
    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const sectionId = student.enrollments[0]?.sectionId;
    const gradeLevelId = student.enrollments[0]?.section.gradeLevelId;

    // Get all announcements that apply to this student
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          {
            audience: 'SECTION',
            targetId: sectionId || null,
          },
          {
            audience: 'GRADE_LEVEL',
            targetId: gradeLevelId || null,
          },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: { email: true, role: true },
        },
        reads: {
          where: { studentId: student.id },
          select: { readAt: true },
        },
      },
    });

    // Mark as read counts
    const unreadCount = announcements.filter(a => a.reads.length === 0).length;

    res.json({
      announcements: announcements.map(a => ({
        ...a,
        isRead: a.reads.length > 0,
      })),
      unreadCount,
    });
  } catch (error) {
    logger.error('List student announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * POST /api/student/announcements/:id/read
 * Mark an announcement as read
 */
export async function markAnnouncementRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const studentId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.announcementRead.upsert({
      where: {
        announcementId_studentId: {
          announcementId: id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        announcementId: id,
        studentId: student.id,
      },
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    logger.error('Mark announcement read error:', error);
    res.status(500).json({ error: 'Failed to mark announcement as read' });
  }
}