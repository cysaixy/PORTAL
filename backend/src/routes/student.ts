import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadFields } from '../middleware/upload';
import { validateParams } from '../middleware/validate';
import { asyncHandler as h } from '../lib/http';
import { idParamSchema } from '../lib/validation';
import * as student from '../controllers/studentController';
import * as announcements from '../controllers/announcementController';

const router = Router();

router.use(requireAuth, requireRole(Role.STUDENT));

router.get('/dashboard', h(student.getDashboard));
router.get('/profile', h(student.getProfile));
router.get('/grades', h(student.getGrades));
router.get('/subjects', h(student.getSubjects));
router.get('/report-card', h(student.getReportCard));

// Multer errors (size/type) become 400s instead of 500s
router.post(
  '/upload-id',
  (req: Request, res: Response, next: NextFunction) =>
    uploadFields(req, res, (err: unknown) => {
      if (err) return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      next();
    }),
  h(student.uploadIdDocuments)
);

router.get('/announcements', h(announcements.listStudentAnnouncements));
router.post('/announcements/read-all', h(announcements.markAllAnnouncementsRead));
router.post('/announcements/:id/read', validateParams(idParamSchema), h(announcements.markAnnouncementRead));

export default router;
