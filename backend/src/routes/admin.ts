import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { z } from 'zod';
import {
  listSchoolYears,
  getCurrentSchoolYear,
  createSchoolYear,
  setCurrentSchoolYear,
  startNewSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
} from '../controllers/schoolYearController';
import {
  listGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
  listStrands,
  createStrand,
  updateStrand,
  deleteStrand,
} from '../controllers/gradeLevelController';
import {
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  getSectionStats,
} from '../controllers/sectionController';
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectStats,
} from '../controllers/subjectController';
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTeacherLoad,
} from '../controllers/assignmentController';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsWithoutSection,
} from '../controllers/studentAdminController';
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
} from '../controllers/teacherAdminController';
import {
  listAllowedEmails,
  addAllowedEmail,
  updateAllowedEmail,
  deleteAllowedEmail,
} from '../controllers/allowedEmailController';
import {
  listIdAssets,
  getIdAssetStats,
  remindIdUpload,
} from '../controllers/idAssetController';
import {
  getLockedGrades,
  getUnlockRequests,
  reviewUnlockRequest,
  unlockGrade,
  getGradeSheet,
} from '../controllers/gradeController';
import {
  listAuditLogs,
  getAuditLogStats,
  getAuditLogActions,
  getAuditLogEntities,
} from '../controllers/auditLogController';
import {
  listAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
} from '../controllers/announcementController';
import {
  listSettings,
  upsertSetting,
  getPassingScore,
} from '../controllers/settingController';
import { getDashboardStats } from '../controllers/adminDashboardController';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  schoolYearSchema,
  gradeLevelSchema,
  strandSchema,
  sectionSchema,
  subjectSchema,
  teachingAssignmentSchema,
  studentSchema,
  teacherSchema,
  allowedEmailSchema,
  lockGradeSchema,
  unlockRequestSchema,
  reviewUnlockSchema,
  announcementSchema,
  settingSchema,
  idParamSchema,
  paginationSchema,
} from '../lib/validation';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(requireAuth, requireRole(Role.ADMIN));

// ============================================================================
// Dashboard
// ============================================================================
router.get('/dashboard/stats', getDashboardStats);

// ============================================================================
// School Years
// ============================================================================
router.get('/school-years', listSchoolYears);
router.get('/school-years/current', getCurrentSchoolYear);
router.post('/school-years', validateBody(schoolYearSchema), createSchoolYear);
router.post('/school-years/start-new', startNewSchoolYear);
router.post('/school-years/:id/set-current', validateParams(idParamSchema), setCurrentSchoolYear);
router.put('/school-years/:id', validateParams(idParamSchema), validateBody(schoolYearSchema.partial()), updateSchoolYear);
router.delete('/school-years/:id', validateParams(idParamSchema), deleteSchoolYear);

// ============================================================================
// Grade Levels & Strands
// ============================================================================
router.get('/grade-levels', listGradeLevels);
router.post('/grade-levels', validateBody(gradeLevelSchema), createGradeLevel);
router.put('/grade-levels/:id', validateParams(idParamSchema), validateBody(gradeLevelSchema.partial()), updateGradeLevel);
router.delete('/grade-levels/:id', validateParams(idParamSchema), deleteGradeLevel);

router.get('/strands', listStrands);
router.post('/strands', validateBody(strandSchema), createStrand);
router.put('/strands/:id', validateParams(idParamSchema), validateBody(strandSchema.partial()), updateStrand);
router.delete('/strands/:id', validateParams(idParamSchema), deleteStrand);

// ============================================================================
// Sections
// ============================================================================
router.get('/sections', validateQuery(paginationSchema), listSections);
router.get('/sections/:id', validateParams(idParamSchema), getSection);
router.post('/sections', validateBody(sectionSchema), createSection);
router.put('/sections/:id', validateParams(idParamSchema), validateBody(sectionSchema.partial()), updateSection);
router.delete('/sections/:id', validateParams(idParamSchema), deleteSection);
router.get('/sections/stats', getSectionStats);

// ============================================================================
// Subjects
// ============================================================================
router.get('/subjects', validateQuery(paginationSchema), listSubjects);
router.post('/subjects', validateBody(subjectSchema), createSubject);
router.put('/subjects/:id', validateParams(idParamSchema), validateBody(subjectSchema.partial()), updateSubject);
router.delete('/subjects/:id', validateParams(idParamSchema), deleteSubject);
router.get('/subjects/stats', getSubjectStats);

// ============================================================================
// Teaching Assignments
// ============================================================================
router.get('/teaching-assignments', validateQuery(paginationSchema), listAssignments);
router.post('/teaching-assignments', validateBody(teachingAssignmentSchema), createAssignment);
router.put('/teaching-assignments/:id', validateParams(idParamSchema), validateBody(teachingAssignmentSchema.partial()), updateAssignment);
router.delete('/teaching-assignments/:id', validateParams(idParamSchema), deleteAssignment);
router.get('/teaching-assignments/teacher-load', getTeacherLoad);

// ============================================================================
// Students
// ============================================================================
router.get('/students', validateQuery(paginationSchema), listStudents);
router.post('/students', validateBody(studentSchema), createStudent);
router.put('/students/:id', validateParams(idParamSchema), validateBody(studentSchema.partial()), updateStudent);
router.delete('/students/:id', validateParams(idParamSchema), deleteStudent);
router.get('/students/no-section', getStudentsWithoutSection);

// ============================================================================
// Teachers
// ============================================================================
router.get('/teachers', validateQuery(paginationSchema), listTeachers);
router.post('/teachers', validateBody(teacherSchema), createTeacher);
router.put('/teachers/:id', validateParams(idParamSchema), validateBody(teacherSchema.partial()), updateTeacher);
router.delete('/teachers/:id', validateParams(idParamSchema), deleteTeacher);
router.get('/teachers/stats', getTeacherStats);

// ============================================================================
// Allowed Emails
// ============================================================================
router.get('/allowed-emails', validateQuery(paginationSchema), listAllowedEmails);
router.post('/allowed-emails', validateBody(allowedEmailSchema), addAllowedEmail);
router.put('/allowed-emails/:id', validateParams(idParamSchema), validateBody(allowedEmailSchema.partial()), updateAllowedEmail);
router.delete('/allowed-emails/:id', validateParams(idParamSchema), deleteAllowedEmail);

// ============================================================================
// ID Cards
// ============================================================================
router.get('/id-assets', validateQuery(paginationSchema), listIdAssets);
router.get('/id-assets/stats', getIdAssetStats);
router.post('/id-assets/remind/:studentId', validateParams(idParamSchema), remindIdUpload);

// ============================================================================
// Grade Locks & Unlock Requests
// ============================================================================
router.get('/grade-locks', getLockedGrades);
router.get('/grade-sheet', getGradeSheet);
router.post('/grades/:id/unlock', validateParams(idParamSchema), unlockGrade);
router.get('/unlock-requests', getUnlockRequests);
router.post('/unlock-requests/:id/review', validateParams(idParamSchema), validateBody(reviewUnlockSchema), reviewUnlockRequest);

// ============================================================================
// Audit Log
// ============================================================================
router.get('/audit-logs', validateQuery(paginationSchema), listAuditLogs);
router.get('/audit-logs/stats', getAuditLogStats);
router.get('/audit-logs/actions', getAuditLogActions);
router.get('/audit-logs/entities', getAuditLogEntities);

// ============================================================================
// Announcements
// ============================================================================
router.get('/announcements', validateQuery(paginationSchema), listAdminAnnouncements);
router.post('/announcements', validateBody(announcementSchema), createAdminAnnouncement);
router.put('/announcements/:id', validateParams(idParamSchema), validateBody(announcementSchema.partial()), updateAdminAnnouncement);
router.delete('/announcements/:id', validateParams(idParamSchema), deleteAdminAnnouncement);

// ============================================================================
// Settings
// ============================================================================
router.get('/settings', listSettings);
router.put('/settings/:key', validateParams(idParamSchema), validateBody(settingSchema), upsertSetting);
router.get('/settings/passing-score', getPassingScore);

export default router;