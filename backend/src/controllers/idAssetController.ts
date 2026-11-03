import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/id-assets
 * List students with photo/signature status, filterable by section
 */
export async function listIdAssets(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const { sectionId } = req.query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { lrn: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sectionId) {
      where.enrollments = {
        some: {
          sectionId: sectionId as string,
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
          enrollments: {
            include: {
              section: {
                include: {
                  gradeLevel: true,
                },
              },
            },
          },
          user: {
            select: { email: true },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students: students.map((s) => {
        const currentEnrollment = s.enrollments[0];
        return {
          id: s.id,
          lrn: s.lrn,
          name: `${s.firstName} ${s.lastName}`,
          section: currentEnrollment?.section.name || 'Not enrolled',
          grade: currentEnrollment?.section.gradeLevel?.name || '-',
          photoStatus: s.photoUrl ? 'Uploaded' : 'Missing',
          signatureStatus: s.signatureUrl ? 'Uploaded' : 'Missing',
          photoUrl: s.photoUrl,
          signatureUrl: s.signatureUrl,
          email: s.user?.email,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List ID assets error:', error);
    res.status(500).json({ error: 'Failed to fetch ID assets' });
  }
}

/**
 * GET /api/admin/id-assets/stats
 * Get ID card printing statistics
 */
export async function getIdAssetStats(req: Request, res: Response) {
  try {
    const totalStudents = await prisma.student.count();
    const withPhoto = await prisma.student.count({
      where: { photoUrl: { not: null } },
    });
    const withSignature = await prisma.student.count({
      where: { signatureUrl: { not: null } },
    });
    const withBoth = await prisma.student.count({
      where: {
        photoUrl: { not: null },
        signatureUrl: { not: null },
      },
    });

    res.json({
      totalStudents,
      withPhoto,
      withSignature,
      withBoth, // ready to print
      missing: totalStudents - withBoth,
    });
  } catch (error) {
    logger.error('Get ID asset stats error:', error);
    res.status(500).json({ error: 'Failed to fetch ID asset stats' });
  }
}

/**
 * POST /api/admin/id-assets/remind/:studentId
 * Send a reminder to a student to upload missing photo/signature
 */
export async function remindIdUpload(req: Request, res: Response) {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const missing: string[] = [];
    if (!student.photoUrl) missing.push('photo');
    if (!student.signatureUrl) missing.push('signature');

    if (missing.length === 0) {
      return res.status(400).json({
        error: 'Student already has both photo and signature uploaded',
      });
    }

    // In a real implementation, this would send an email/notification
    // For now, we log it as an audit action
    logger.info(`ID reminder sent to ${student.user?.email}: missing ${missing.join(', ')}`);

    res.json({
      message: `Reminder sent to ${student.user?.email} to upload missing ${missing.join(' and ')}`,
      missing,
    });
  } catch (error) {
    logger.error('Remind ID upload error:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
}