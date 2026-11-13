import { z } from 'zod';

// ============================================================================
// Shared
// ============================================================================

const cuid = (msg: string) => z.string().min(1, msg);
const optionalId = (msg: string) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.string().min(1, msg).nullable().optional());

/** Accepts YYYY-MM-DD or a full ISO timestamp. */
const dateString = (msg: string) =>
  z
    .string()
    .min(1, msg)
    .refine((v) => !Number.isNaN(Date.parse(v)), msg);

const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (typeof v === 'string' ? v.trim() || null : v));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  search: z.string().trim().optional().transform((v) => v || undefined),
});

export const idParamSchema = z.object({ id: cuid('Invalid ID') });

// ============================================================================
// Academic structure
// ============================================================================

export const schoolYearSchema = z
  .object({
    label: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Use the format 2026-2027'),
    startDate: dateString('Invalid start date'),
    endDate: dateString('Invalid end date'),
    isCurrent: z.boolean().optional().default(false),
  })
  .refine((d) => Date.parse(d.endDate) > Date.parse(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const schoolYearUpdateSchema = z.object({
  label: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Use the format 2026-2027').optional(),
  startDate: dateString('Invalid start date').optional(),
  endDate: dateString('Invalid end date').optional(),
});

export const gradeLevelSchema = z.object({
  number: z.coerce.number().int().min(7).max(12, 'Grade level must be between 7 and 12'),
  name: z.string().trim().min(1, 'Grade level name is required'),
  isSeniorHigh: z.boolean().optional().default(false),
});

export const strandSchema = z.object({
  code: z.string().trim().min(1, 'Strand code is required').toUpperCase(),
  name: z.string().trim().min(1, 'Strand name is required'),
  description: optionalText,
});

export const sectionSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required'),
  gradeLevelId: cuid('Grade level is required'),
  strandId: optionalId('Invalid strand'),
  adviserId: optionalId('Invalid adviser'),
  schoolYearId: cuid('School year is required'),
  capacity: z.coerce.number().int().min(1).max(100).default(40),
});

export const subjectSchema = z.object({
  code: z.string().trim().min(1, 'Subject code is required').toUpperCase(),
  title: z.string().trim().min(1, 'Subject title is required'),
  gradeLevelId: cuid('Grade level is required'),
  strandId: optionalId('Invalid strand'),
  semester: z.coerce.number().int().min(1).max(2).optional().nullable(),
  category: z.enum(['CORE', 'APPLIED', 'SPECIALIZED']).default('CORE'),
  units: z.coerce.number().int().positive().optional().nullable(),
});

export const teachingAssignmentSchema = z.object({
  sectionId: cuid('Section is required'),
  subjectId: cuid('Subject is required'),
  teacherId: cuid('Teacher is required'),
});

export const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, 'Select at least one student'),
});

// ============================================================================
// People
// ============================================================================

export const studentSchema = z.object({
  lrn: z.string().trim().regex(/^\d{12}$/, 'LRN must be 12 digits'),
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: optionalText,
  lastName: z.string().trim().min(1, 'Last name is required'),
  suffix: optionalText,
  birthdate: dateString('Invalid birthdate'),
  sex: z.enum(['M', 'F']),
  guardianName: z.string().trim().min(1, 'Guardian name is required'),
  guardianContact: z.string().trim().min(7, 'Guardian contact is required'),
  guardianEmail: z
    .union([z.string().trim().email('Invalid guardian email'), z.literal(''), z.null()])
    .optional()
    .transform((v) => v || null),
  address: z.string().trim().min(1, 'Address is required'),
  sectionId: optionalId('Invalid section'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  isActive: z.boolean().optional(),
});

export const teacherSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: optionalText,
  lastName: z.string().trim().min(1, 'Last name is required'),
  suffix: optionalText,
  department: optionalText,
  email: z.string().trim().toLowerCase().email('Invalid email'),
  isActive: z.boolean().optional(),
});

export const allowedEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  isActive: z.boolean().optional().default(true),
});

// ============================================================================
// Grades
// ============================================================================

const score = z.coerce.number().min(60, 'Lowest transmuted grade is 60').max(100, 'Score must be at most 100');

export const gradeSchema = z.object({
  studentSectionId: cuid('Invalid student'),
  sectionSubjectId: cuid('Invalid class'),
  quarter: z.coerce.number().int().min(1).max(4, 'Quarter must be 1-4'),
  score,
});

export const bulkGradesSchema = z.object({
  sectionSubjectId: cuid('Invalid class'),
  quarter: z.coerce.number().int().min(1).max(4),
  grades: z
    .array(z.object({ studentSectionId: cuid('Invalid student'), score: score.nullable() }))
    .min(1, 'Nothing to save'),
});

export const lockGradeSchema = z.object({
  sectionSubjectId: cuid('Invalid class'),
  quarter: z.coerce.number().int().min(1).max(4, 'Quarter must be 1-4'),
});

export const unlockRequestSchema = z.object({
  sectionSubjectId: cuid('Invalid class'),
  quarter: z.coerce.number().int().min(1).max(4),
  reason: z.string().trim().min(10, 'Please explain why (at least 10 characters)'),
});

export const unlockSheetSchema = lockGradeSchema;

export const reviewUnlockSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: optionalText,
});

// ============================================================================
// Communication & settings
// ============================================================================

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  body: z.string().trim().min(1, 'Body is required'),
  audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'SECTION', 'GRADE_LEVEL']),
  targetId: optionalId('Invalid target'),
  isPinned: z.boolean().optional().default(false),
});

export const settingSchema = z.object({
  value: z.string().trim().min(1, 'Value is required'),
});

export const settingKeyParamSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/, 'Invalid setting key'),
});
