import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { uploadFields } from '../middleware/upload';
import * as studentController from '../controllers/studentController';

const router = Router();

// All student routes require STUDENT role
router.use(requireAuth, requireRole(Role.STUDENT, Role.ADMIN));

/**
 * Get student dashboard
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * Get student profile
 */
router.get('/profile', studentController.getProfile);

/**
 * Upload photo and signature
 */
router.post('/upload-id', uploadFields, studentController.uploadIdDocuments);

/**
 * Get enrolled subjects
 */
router.get('/subjects', (req, res) => {
  res.json({ message: 'Get student subjects - TODO' });
});

/**
 * Get grades
 */
router.get('/grades', (req, res) => {
  res.json({ message: 'Get student grades - TODO' });
});

/**
 * Get announcements
 */
router.get('/announcements', (req, res) => {
  res.json({ message: 'Get announcements - TODO' });
});

/**
 * Generate report card (Form 138)
 */
router.get('/report-card', (req, res) => {
  res.json({ message: 'Generate report card PDF - TODO' });
});

export default router;
