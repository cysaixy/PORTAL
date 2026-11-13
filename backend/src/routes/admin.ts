import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { asyncHandler as h } from '../lib/http';
import { idParamSchema, settingKeyParamSchema } from '../lib/validation';
import * as sy from '../controllers/schoolYearController';
import * as gl from '../controllers/gradeLevelController';
import * as sections from '../controllers/sectionController';
import * as subjects from '../controllers/subjectController';
import * as assignments from '../controllers/assignmentController';
import * as students from '../controllers/studentAdminController';
import * as teachers from '../controllers/teacherAdminController';
import * as emails from '../controllers/allowedEmailController';
import * as ids from '../controllers/idAssetController';
import * as grades from '../controllers/gradeController';
import * as auditLog from '../controllers/auditLogController';
import * as announcements from '../controllers/announcementController';
import * as settings from '../controllers/settingController';
import { getDashboardStats } from '../controllers/adminDashboardController';

const router = Router();
const id = validateParams(idParamSchema);

router.use(requireAuth, requireRole(Role.ADMIN));

router.get('/dashboard/stats', h(getDashboardStats));

// School years
router.get('/school-years', h(sy.listSchoolYears));
router.get('/school-years/current', h(sy.getCurrent));
router.post('/school-years', h(sy.createSchoolYear));
router.post('/school-years/:id/set-current', id, h(sy.setCurrentSchoolYear));
router.put('/school-years/:id', id, h(sy.updateSchoolYear));
router.delete('/school-years/:id', id, h(sy.deleteSchoolYear));

// Grade levels & strands
router.get('/grade-levels', h(gl.listGradeLevels));
router.post('/grade-levels', h(gl.createGradeLevel));
router.put('/grade-levels/:id', id, h(gl.updateGradeLevel));
router.delete('/grade-levels/:id', id, h(gl.deleteGradeLevel));
router.get('/strands', h(gl.listStrands));
router.post('/strands', h(gl.createStrand));
router.put('/strands/:id', id, h(gl.updateStrand));
router.delete('/strands/:id', id, h(gl.deleteStrand));

// Sections & enrollment
router.get('/sections', h(sections.listSections));
router.get('/sections/:id', id, h(sections.getSection));
router.post('/sections', h(sections.createSection));
router.put('/sections/:id', id, h(sections.updateSection));
router.delete('/sections/:id', id, h(sections.deleteSection));
router.post('/sections/:id/students', id, h(sections.enrollStudents));
router.delete('/sections/:id/students/:studentId', h(sections.unenrollStudent));

// Subjects
router.get('/subjects', h(subjects.listSubjects));
router.post('/subjects', h(subjects.createSubject));
router.put('/subjects/:id', id, h(subjects.updateSubject));
router.delete('/subjects/:id', id, h(subjects.deleteSubject));

// Teaching assignments
router.get('/teaching-assignments/teacher-load', h(assignments.getTeacherLoad));
router.get('/teaching-assignments', h(assignments.listAssignments));
router.post('/teaching-assignments', h(assignments.createAssignment));
router.put('/teaching-assignments/:id', id, h(assignments.updateAssignment));
router.delete('/teaching-assignments/:id', id, h(assignments.deleteAssignment));

// Students
router.get('/students', h(students.listStudents));
router.post('/students', h(students.createStudent));
router.put('/students/:id', id, h(students.updateStudent));
router.delete('/students/:id', id, h(students.deleteStudent));

// Teachers
router.get('/teachers', h(teachers.listTeachers));
router.post('/teachers', h(teachers.createTeacher));
router.put('/teachers/:id', id, h(teachers.updateTeacher));
router.delete('/teachers/:id', id, h(teachers.deleteTeacher));

// Allowlist
router.get('/allowed-emails', h(emails.listAllowedEmails));
router.post('/allowed-emails', h(emails.addAllowedEmail));
router.put('/allowed-emails/:id', id, h(emails.updateAllowedEmail));
router.delete('/allowed-emails/:id', id, h(emails.deleteAllowedEmail));

// ID assets
router.get('/id-assets/stats', h(ids.getIdAssetStats));
router.get('/id-assets', h(ids.listIdAssets));
router.post('/id-assets/:id/remind', id, h(ids.remindIdUpload));

// Grade sheets & unlock requests
router.get('/grade-sheets', h(grades.listGradeSheets));
router.post('/grade-sheets/unlock', h(grades.unlockSheet));
router.post('/grade-sheets/lock', h(grades.lockSheet));
router.get('/grade-sheets/:id', id, h(grades.getGradeSheet));
router.get('/unlock-requests', h(grades.listUnlockRequests));
router.post('/unlock-requests/:id/review', id, h(grades.reviewUnlockRequest));

// Audit log
router.get('/audit-logs/filters', h(auditLog.getAuditLogFilters));
router.get('/audit-logs', h(auditLog.listAuditLogs));

// Announcements
router.get('/announcements', h(announcements.listAdminAnnouncements));
router.post('/announcements', h(announcements.createAnnouncement));
router.put('/announcements/:id', id, h(announcements.updateAnnouncement));
router.delete('/announcements/:id', id, h(announcements.deleteAnnouncement));

// Settings
router.get('/settings', h(settings.listSettings));
router.put('/settings/:key', validateParams(settingKeyParamSchema), h(settings.upsertSetting));

export default router;
