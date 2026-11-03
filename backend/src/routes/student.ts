import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { uploadFields } from '../middleware/upload';
import * as studentController from '../controllers/studentController';
import { getStudentGrades } from '../controllers/studentGradesController';
import { getStudentSubjects, getStudentAdviser } from '../controllers/studentSubjectsController';
import { getReportCard } from '../controllers/reportCardController';
import {
  listStudentAnnouncements,
  markAnnouncementRead,
} from '../controllers/announcementController';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../lib/validation';

const router = Router();

// All student routes require STUDENT role
router.use(requireAuth, requireRole(Role.STUDENT));

// ============================================================================
// Dashboard
// ============================================================================
router.get('/dashboard', studentController.getDashboard);

// ============================================================================
// Profile
// ============================================================================
router.get('/profile', studentController.getProfile);

// ============================================================================
// Upload photo and signature
// ============================================================================
router.post('/upload-id', uploadFields, studentController.uploadIdDocuments);

// ============================================================================
// Grades
// ============================================================================
router.get('/grades', studentController.getGrades);

// ============================================================================
// Subjects
// ============================================================================
router.get('/subjects', studentController.getSubjects);

// ============================================================================
// Adviser
// ============================================================================
router.get('/adviser', getStudentAdviser);

// ============================================================================
// Announcements
// ============================================================================
router.get('/announcements', listStudentAnnouncements);
router.post('/announcements/:id/read', validateParams(idParamSchema), markAnnouncementRead);

// ============================================================================
// Report card (Form 138)
// ============================================================================
router.get('/report-card', getReportCard);

export default router;