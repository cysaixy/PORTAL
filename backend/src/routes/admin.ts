import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole(Role.ADMIN));

/**
 * School Year Management
 */
router.get('/school-years', (req, res) => {
  res.json({ message: 'List school years - TODO' });
});

router.post('/school-years', (req, res) => {
  res.json({ message: 'Create school year - TODO' });
});

/**
 * Student Management
 */
router.get('/students', (req, res) => {
  res.json({ message: 'List students - TODO' });
});

router.post('/students', (req, res) => {
  res.json({ message: 'Create student - TODO' });
});

/**
 * Teacher Management
 */
router.get('/teachers', (req, res) => {
  res.json({ message: 'List teachers - TODO' });
});

router.post('/teachers', (req, res) => {
  res.json({ message: 'Create teacher - TODO' });
});

/**
 * Section Management
 */
router.get('/sections', (req, res) => {
  res.json({ message: 'List sections - TODO' });
});

router.post('/sections', (req, res) => {
  res.json({ message: 'Create section - TODO' });
});

/**
 * Subject Management
 */
router.get('/subjects', (req, res) => {
  res.json({ message: 'List subjects - TODO' });
});

router.post('/subjects', (req, res) => {
  res.json({ message: 'Create subject - TODO' });
});

/**
 * Grade Management (unlock)
 */
router.post('/grades/:id/unlock', (req, res) => {
  res.json({ message: 'Unlock grade - TODO' });
});

/**
 * Audit Logs
 */
router.get('/audit-logs', (req, res) => {
  res.json({ message: 'List audit logs - TODO' });
});

export default router;
