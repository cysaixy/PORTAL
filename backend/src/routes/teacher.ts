import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All teacher routes require TEACHER role
router.use(requireAuth, requireRole(Role.TEACHER, Role.ADMIN));

/**
 * Get assigned sections
 */
router.get('/sections', (req, res) => {
  res.json({ message: 'Get teacher sections - TODO' });
});

/**
 * Get section details with students
 */
router.get('/sections/:id', (req, res) => {
  res.json({ message: 'Get section details - TODO' });
});

/**
 * Get advisory class (for advisers)
 */
router.get('/advisory', (req, res) => {
  res.json({ message: 'Get advisory class - TODO' });
});

/**
 * Encode grades
 */
router.post('/grades', (req, res) => {
  res.json({ message: 'Create/update grade - TODO' });
});

router.put('/grades/:id', (req, res) => {
  res.json({ message: 'Update grade - TODO' });
});

/**
 * Lock grades for a section-subject-quarter
 */
router.post('/grades/lock', (req, res) => {
  res.json({ message: 'Lock grades - TODO' });
});

/**
 * Announcements
 */
router.get('/announcements', (req, res) => {
  res.json({ message: 'Get announcements - TODO' });
});

router.post('/announcements', (req, res) => {
  res.json({ message: 'Create announcement - TODO' });
});

export default router;
