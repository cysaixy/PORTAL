import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { gradeSchema, lockGradeSchema, unlockRequestSchema, reviewUnlockSchema } from '../lib/validation';

const PASSING_SCORE = 75;

/**
 * GET /api/teacher/grades
 * Get grades for a teacher's assigned sections
 */
export async function getTeacherGrades(req: Request, res: Response) {
  try {
    const teacherId = req.user!.id;
    const { sectionSubjectId, quarter } = req.query;

    // Get teacher's assignments
    const assignments = await prisma.sectionSubject.findMany({
      where: {
        teacherId,
        ...(sectionSubjectId && { id: sectionSubjectId as string }),
      },
      include: {
        section: {
          include: {
            gradeLevel: true,
            strand: true,
            students: {
              include: {
                student: {
                  select: { id: true, lrn: true, firstName: true, lastName: true },
                },
                grades: {
                  where: quarter ? { quarter: parseInt(quarter as string) } : {},
                  orderBy: { quarter: 'asc' },
                },
              },
            },
          },
          subject: true,
        },
      },
      orderBy: [{ section: { name: 'asc' } }, { subject: { code: 'asc' } }],
    });

    res.json({ assignments });
  } catch (error) {
    logger.error('Get teacher grades error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
}

/**
 * POST /api/teacher/grades
 * Create or update a grade (autosave)
 */
export async function upsertGrade(req: Request, res: Response) {
  try {
    const data = gradeSchema.parse(req.body);
    const teacherId = req.user!.id;

    // Verify the teacher is assigned to this section-subject
    const assignment = await prisma.sectionSubject.findUnique({
      where: { id: data.sectionSubjectId },
      include: {
        section: {
          include: {
            students: {
              where: { studentSectionId: data.studentSectionId },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject in this section',
      });
    }

    // Check if the sheet is locked
    const existingGrade = await prisma.grade.findUnique({
      where: {
        studentSectionId_sectionSubjectId_quarter: {
          studentSectionId: data.studentSectionId,
          sectionSubjectId: data.sectionSubjectId,
          quarter: data.quarter,
        },
      },
    });

    if (existingGrade?.locked) {
      return res.status(400).json({
        error: 'This grade sheet is locked. Only an administrator can unlock it.',
      });
    }

    const remarks = data.score >= PASSING_SCORE ? 'PASSED' : 'FAILED';

    const grade = await prisma.grade.upsert({
      where: {
        studentSectionId_sectionSubjectId_quarter: {
          studentSectionId: data.studentSectionId,
          sectionSubjectId: data.sectionSubjectId,
          quarter: data.quarter,
        },
      },
      update: {
        score: data.score,
        remarks,
        updatedAt: new Date(),
      },
      create: {
        studentSectionId: data.studentSectionId,
        sectionSubjectId: data.sectionSubjectId,
        quarter: data.quarter,
        score: data.score,
        remarks,
      },
      include: {
        studentSection: {
          include: {
            student: {
              select: { lrn: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: existingGrade ? 'UPDATE' : 'CREATE',
        entity: 'Grade',
        entityId: grade.id,
        before: existingGrade
          ? { score: existingGrade.score, remarks: existingGrade.remarks }
          : undefined,
        after: { score: data.score, remarks },
      },
    });

    res.json({ grade });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Student section or assignment not found' });
    }
    logger.error('Upsert grade error:', error);
    res.status(500).json({ error: 'Failed to save grade' });
  }
}

/**
 * POST /api/teacher/grades/lock
 * Lock all grades for a section-subject-quarter
 */
export async function lockGrades(req: Request, res: Response) {
  try {
    const data = lockGradeSchema.parse(req.body);
    const teacherId = req.user!.id;

    // Verify the teacher is assigned to this section-subject
    const assignment = await prisma.sectionSubject.findUnique({
      where: { id: data.sectionSubjectId },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject in this section',
      });
    }

    // Lock all grades for this assignment and quarter
    const result = await prisma.grade.updateMany({
      where: {
        sectionSubjectId: data.sectionSubjectId,
        quarter: data.quarter,
        locked: false,
      },
      data: {
        locked: true,
        lockedAt: new Date(),
        lockedById: teacherId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'LOCK',
        entity: 'GradeSheet',
        entityId: data.sectionSubjectId,
        after: { quarter: data.quarter, lockedCount: result.count },
      },
    });

    logger.info(`Grades locked: section-subject ${data.sectionSubjectId}, quarter ${data.quarter}, count ${result.count}`);

    res.json({ lockedCount: result.count });
  } catch (error) {
    logger.error('Lock grades error:', error);
    res.status(500).json({ error: 'Failed to lock grades' });
  }
}

/**
 * POST /api/teacher/grades/unlock-request
 * Request an unlock for a locked grade sheet
 */
export async function requestUnlock(req: Request, res: Response) {
  try {
    const data = unlockRequestSchema.parse(req.body);
    const teacherId = req.user!.id;

    // Verify the grade exists and is locked
    const grade = await prisma.grade.findUnique({
      where: { id: data.gradeId },
      include: {
        sectionSubject: true,
      },
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    if (!grade.locked) {
      return res.status(400).json({ error: 'This grade is not locked' });
    }

    // Check if there's already a pending request
    const existing = await prisma.unlockRequest.findFirst({
      where: {
        gradeId: data.gradeId,
        status: 'pending',
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'An unlock request is already pending for this grade' });
    }

    const unlockRequest = await prisma.unlockRequest.create({
      data: {
        gradeId: data.gradeId,
        requestedBy: req.user!.email,
        reason: data.reason,
        status: 'pending',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'REQUEST_UNLOCK',
        entity: 'Grade',
        entityId: data.gradeId,
        after: { reason: data.reason },
      },
    });

    logger.info(`Unlock request created: grade ${data.gradeId} by ${req.user!.email}`);

    res.status(201).json({ unlockRequest });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Grade not found' });
    }
    logger.error('Request unlock error:', error);
    res.status(500).json({ error: 'Failed to create unlock request' });
  }
}

/**
 * POST /api/admin/grades/:id/unlock
 * Admin unlocks a grade sheet
 */
export async function unlockGrade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    const grade = await prisma.grade.findUnique({
      where: { id },
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    if (!grade.locked) {
      return res.status(400).json({ error: 'This grade is not locked' });
    }

    await prisma.$transaction([
      prisma.grade.update({
        where: { id },
        data: {
          locked: false,
          lockedAt: null,
          lockedById: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'UNLOCK',
          entity: 'Grade',
          entityId: id,
          after: { unlockedBy: req.user!.email },
        },
      }),
    ]);

    logger.info(`Grade unlocked: ${id} by admin ${req.user!.email}`);

    res.json({ message: 'Grade unlocked successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Grade not found' });
    }
    logger.error('Unlock grade error:', error);
    res.status(500).json({ error: 'Failed to unlock grade' });
  }
}

/**
 * GET /api/admin/grade-locks
 * Get all locked grade sheets
 */
export async function getLockedGrades(req: Request, res: Response) {
  try {
    const lockedGrades = await prisma.grade.findMany({
      where: { locked: true },
      include: {
        studentSection: {
          include: {
            student: {
              select: { lrn: true, firstName: true, lastName: true },
            },
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
        sectionSubject: {
          include: {
            subject: true,
            teacher: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        lockedBy: {
          select: { email: true },
        },
      },
      orderBy: { lockedAt: 'desc' },
    });

    res.json({ lockedGrades });
  } catch (error) {
    logger.error('Get locked grades error:', error);
    res.status(500).json({ error: 'Failed to fetch locked grades' });
  }
}

/**
 * GET /api/admin/unlock-requests
 * Get pending unlock requests
 */
export async function getUnlockRequests(req: Request, res: Response) {
  try {
    const requests = await prisma.unlockRequest.findMany({
      where: { status: 'pending' },
      include: {
        grade: {
          include: {
            studentSection: {
              include: {
                student: {
                  select: { lrn: true, firstName: true, lastName: true },
                },
              },
            },
            sectionSubject: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    logger.error('Get unlock requests error:', error);
    res.status(500).json({ error: 'Failed to fetch unlock requests' });
  }
}

/**
 * POST /api/admin/unlock-requests/:id/review
 * Admin reviews an unlock request (approve or reject)
 */
export async function reviewUnlockRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = reviewUnlockSchema.parse(req.body);
    const adminId = req.user!.id;

    const request = await prisma.unlockRequest.findUnique({
      where: { id },
      include: { grade: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Unlock request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been reviewed' });
    }

    await prisma.$transaction([
      prisma.unlockRequest.update({
        where: { id },
        data: {
          status: data.status,
          adminNote: data.adminNote || null,
          reviewedAt: new Date(),
          reviewedById: adminId,
        },
      }),
      data.status === 'approved'
        ? prisma.grade.update({
            where: { id: request.gradeId },
            data: {
              locked: false,
              lockedAt: null,
              lockedById: null,
            },
          })
        : null,
      prisma.auditLog.create({
        data: {
          userId: adminId,
          action: data.status === 'approved' ? 'UNLOCK' : 'UPDATE',
          entity: 'Grade',
          entityId: request.gradeId,
          after: {
            review: data.status,
            note: data.adminNote,
            reviewedBy: req.user!.email,
          },
        },
      }),
    ]);

    logger.info(`Unlock request ${data.status}: ${id} by admin ${req.user!.email}`);

    res.json({ message: `Unlock request ${data.status}` });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Unlock request not found' });
    }
    logger.error('Review unlock request error:', error);
    res.status(500).json({ error: 'Failed to review unlock request' });
  }
}

/**
 * GET /api/admin/student-grade-sheet
 * Get a full grade sheet for a section-subject-quarter (for admin viewing)
 */
export async function getGradeSheet(req: Request, res: Response) {
  try {
    const { sectionSubjectId, quarter } = req.query;

    if (!sectionSubjectId || !quarter) {
      return res.status(400).json({ error: 'sectionSubjectId and quarter are required' });
    }

    const assignment = await prisma.sectionSubject.findUnique({
      where: { id: sectionSubjectId as string },
      include: {
        section: {
          include: {
            gradeLevel: true,
            students: {
              include: {
                student: {
                  select: { id: true, lrn: true, firstName: true, lastName: true },
                },
                grades: {
                  where: { quarter: parseInt(quarter as string) },
                },
              },
            },
          },
        },
        subject: true,
        teacher: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Compute statistics
    const students = assignment.section.students.map((ss) => {
      const grade = ss.grades[0];
      return {
        lrn: ss.student.lrn,
        name: `${ss.student.firstName} ${ss.student.lastName}`,
        score: grade?.score || null,
        remarks: grade?.remarks || '-',
        locked: grade?.locked || false,
      };
    });

    const scores = students.filter(s => s.score !== null).map(s => s.score as number);
    const average = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      : '0.00';
    const highest = scores.length > 0 ? Math.max(...scores) : '-';
    const lowest = scores.length > 0 ? Math.min(...scores) : '-';
    const lockedCount = students.filter(s => s.locked).length;

    res.json({
      assignment: {
        section: assignment.section.name,
        subject: assignment.subject.code,
        subjectTitle: assignment.subject.title,
        teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
      },
      quarter: parseInt(quarter as string),
      students,
      stats: {
        total: students.length,
        encoded: scores.length,
        average,
        highest,
        lowest,
        lockedCount,
      },
    });
  } catch (error) {
    logger.error('Get grade sheet error:', error);
    res.status(500).json({ error: 'Failed to fetch grade sheet' });
  }
}