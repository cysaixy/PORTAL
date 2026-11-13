import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { asyncHandler as h } from '../lib/http';
import { idParamSchema } from '../lib/validation';
import * as teacher from '../controllers/teacherController';
import * as announcements from '../controllers/announcementController';

const router = Router();
const id = validateParams(idParamSchema);

router.use(requireAuth, requireRole(Role.TEACHER));

router.get('/dashboard', h(teacher.getDashboard));

// Classes & grade sheets
router.get('/classes', h(teacher.listClasses));
router.get('/classes/:id/sheet', id, h(teacher.getSheet));
router.put('/classes/:id/sheet', id, h(teacher.saveSheet));
router.post('/classes/:id/lock', id, h(teacher.lockSheet));
router.post('/classes/:id/unlock-request', id, h(teacher.requestUnlock));

// Advisory
router.get('/advisory', h(teacher.getAdvisory));

// Announcements
router.get('/announcements/targets', h(teacher.getAnnouncementTargets));
router.get('/announcements', h(announcements.listTeacherAnnouncements));
router.post('/announcements', h(announcements.createAnnouncement));
router.put('/announcements/:id', id, h(announcements.updateAnnouncement));
router.delete('/announcements/:id', id, h(announcements.deleteAnnouncement));

export default router;
