import { z } from 'zod';

// ============================================================================
// Shared schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return 1;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  limit: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return 20;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

// ============================================================================
// Auth
// ============================================================================

export const verifyTokenSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

// ============================================================================
// School Year
// ============================================================================

export const schoolYearSchema = z.object({
  label: z.string().min(1, 'School year label is required'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  isCurrent: z.boolean().optional().default(false),
});

// ============================================================================
// Grade Level
// ============================================================================

export const gradeLevelSchema = z.object({
  number: z.number().int().min(7).max(12, 'Grade level must be between 7 and 12'),
  name: z.string().min(1, 'Grade level name is required'),
  isSeniorHigh: z.boolean().optional().default(false),
});

// ============================================================================
// Strand
// ============================================================================

export const strandSchema = z.object({
  code: z.string().min(1, 'Strand code is required').toUpperCase(),
  name: z.string().min(1, 'Strand name is required'),
  description: z.string().optional(),
});

// ============================================================================
// Section
// ============================================================================

export const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  gradeLevelId: z.string().cuid('Invalid grade level'),
  strandId: z.string().cuid('Invalid strand').optional().nullable(),
  adviserId: z.string().cuid('Invalid adviser').optional().nullable(),
  schoolYearId: z.string().cuid('Invalid school year'),
  capacity: z.number().int().min(1).max(100).default(40),
});

// ============================================================================
// Subject
// ============================================================================

export const subjectSchema = z.object({
  code: z.string().min(1, 'Subject code is required').toUpperCase(),
  title: z.string().min(1, 'Subject title is required'),
  gradeLevelId: z.string().cuid('Invalid grade level'),
  strandId: z.string().cuid('Invalid strand').optional().nullable(),
  semester: z.number().int().min(1).max(2).optional().nullable(),
  category: z.enum(['CORE', 'APPLIED', 'SPECIALIZED']).default('CORE'),
  units: z.number().int().positive().optional().nullable(),
});

// ============================================================================
// Teaching Assignment
// ============================================================================

export const teachingAssignmentSchema = z.object({
  sectionId: z.string().cuid('Invalid section'),
  subjectId: z.string().cuid('Invalid subject'),
  teacherId: z.string().cuid('Invalid teacher'),
});

// ============================================================================
// Student
// ============================================================================

export const studentSchema = z.object({
  lrn: z.string().min(1, 'LRN is required'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional().nullable(),
  birthdate: z.string().datetime('Invalid birthdate'),
  sex: z.enum(['M', 'F']),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianContact: z.string().min(1, 'Guardian contact is required'),
  guardianEmail: z.string().email('Invalid email').optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  sectionId: z.string().cuid('Invalid section').optional().nullable(),
  schoolYearId: z.string().cuid('Invalid school year').optional().nullable(),
  email: z.string().email('Invalid email'),
  role: z.enum(['STUDENT']).default('STUDENT'),
});

// ============================================================================
// Teacher
// ============================================================================

export const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  email: z.string().email('Invalid email'),
  role: z.enum(['TEACHER']).default('TEACHER'),
});

// ============================================================================
// Allowed Email
// ============================================================================

export const allowedEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  isActive: z.boolean().optional().default(true),
});

// ============================================================================
// Grade
// ============================================================================

export const gradeSchema = z.object({
  studentSectionId: z.string().cuid('Invalid student section'),
  sectionSubjectId: z.string().cuid('Invalid section subject'),
  quarter: z.number().int().min(1).max(4, 'Quarter must be 1-4'),
  score: z.number().int().min(0).max(100, 'Score must be 0-100'),
});

// ============================================================================
// Lock / Unlock Grade
// ============================================================================

export const lockGradeSchema = z.object({
  sectionSubjectId: z.string().cuid('Invalid section subject'),
  quarter: z.number().int().min(1).max(4, 'Quarter must be 1-4'),
});

export const unlockRequestSchema = z.object({
  gradeId: z.string().cuid('Invalid grade'),
  reason: z.string().min(1, 'Reason is required'),
});

export const reviewUnlockSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().optional(),
});

// ============================================================================
// Announcement
// ============================================================================

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'SECTION', 'GRADE_LEVEL']),
  targetId: z.string().cuid('Invalid target').optional().nullable(),
  isPinned: z.boolean().optional().default(false),
});

// ============================================================================
// Setting
// ============================================================================

export const settingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
});