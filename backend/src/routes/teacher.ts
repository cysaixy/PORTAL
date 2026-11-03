import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import prisma from '../config/database';
import {
  getTeacherGrades,
  upsertGrade,
  lockGrades,
  requestUnlock,
} from '../controllers/gradeController';
import {
  listTeacherAnnouncements,
  createTeacherAnnouncement,
  updateTeacherAnnouncement,
  deleteTeacherAnnouncement,
} from '../controllers/announcementController';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  gradeSchema,
  lockGradeSchema,
  unlockRequestSchema,
  announcementSchema,
  paginationSchema,
  idParamSchema,
} from '../lib/validation';

const router = Router();

// All teacher routes require TEACHER role (ADMIN also allowed for oversight)
router.use(requireAuth, requireRole(Role.TEACHER, Role.ADMIN));

// ============================================================================
// Sections assigned to teacher
// ============================================================================
router.get('/sections', async (req, res) => {
  try {
    const teacherId = req.user!.id;

    const assignments = await prisma.sectionSubject.findMany({
      where: { teacherId },
      include: {
        section: {
          include: {
            gradeLevel: true,
            strand: true,
            _count: {
              select: { students: true },
            },
          },
        },
        subject: {
          include: {
            gradeLevel: true,
          },
        },
        _count: {
          select: { grades: true },
        },
      },
      orderBy: [{ section: { name: 'asc' } }, { subject: { code: 'asc' } }],
    });

    res.json({ assignments });
  } catch (error) {
    console.error('Get teacher sections error:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

router.get('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user!.id;

    const assignment = await prisma.sectionSubject.findFirst({
      where: { id, teacherId },
      include: {
        section: {
          include: {
            gradeLevel: true,
            strand: true,
            schoolYear: true,
            students: {
              include: {
                student: {
                  select: { id: true, lrn: true, firstName: true, lastName: true, sex: true },
                },
                grades: {
                  orderBy: { quarter: 'asc' },
                },
              },
            },
          },
        },
        subject: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get section details error:', error);
    res.status(500).json({ error: 'Failed to fetch section details' });
  }
});

// ============================================================================
// Advisory class
// ============================================================================
router.get('/advisory', async (req, res) => {
  try {
    const teacherId = req.user!.id;

    const advisorySections = await prisma.section.findMany({
      where: { adviserId: teacherId },
      include: {
        gradeLevel: true,
        strand: true,
        schoolYear: true,
        _count: {
          select: { students: true },
        },
        students: {
          include: {
            student: {
              select: { id: true, lrn: true, firstName: true, lastName: true, sex: true, photoUrl: true, signatureUrl: true },
            },
            grades: {
              orderBy: { quarter: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ advisorySections });
  } catch (error) {
    console.error('Get advisory class error:', error);
    res.status(500).json({ error: 'Failed to fetch advisory class' });
  }
});

// ============================================================================
// Encode grades
// ============================================================================
router.get('/grades', getTeacherGrades);
router.post('/grades', validateBody(gradeSchema), upsertGrade);

router.put('/grades/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    if (score === undefined || score === null || score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    const teacherId = req.user!.id;

    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        sectionSubject: true,
      },
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    if (grade.sectionSubject.teacherId !== teacherId) {
      return res.status(403).json({
        error: 'You are not assigned to teach this subject',
      });
    }

    if (grade.locked) {
      return res.status(400).json({
        error: 'This grade is locked. Only an administrator can unlock it.',
      });
    }

    const remarks = score >= 75 ? 'PASSED' : 'FAILED';

    const updated = await prisma.grade.update({
      where: { id },
      data: {
        score,
        remarks,
        updatedAt: new Date(),
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

    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'UPDATE',
        entity: 'Grade',
        entityId: id,
        before: { score: grade.score, remarks: grade.remarks },
        after: { score, remarks },
      },
    });

    res.json({ grade: updated });
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

router.post('/grades/lock', validateBody(lockGradeSchema), lockGrades);
router.post('/grades/unlock-request', validateBody(unlockRequestSchema), requestUnlock);

// ============================================================================
// Announcements
// ============================================================================
router.get('/announcements', listTeacherAnnouncements);
router.post('/announcements', validateBody(announcementSchema), createTeacherAnnouncement);
router.put(
  '/announcements/:id',
  validateParams(idParamSchema),
  validateBody(announcementSchema.partial()),
  updateTeacherAnnouncement
);
router.delete('/announcements/:id', validateParams(idParamSchema), deleteTeacherAnnouncement);

export default router;