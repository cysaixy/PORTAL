export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export interface StudentProfile {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  birthdate: string;
  sex: 'M' | 'F';
  photoUrl?: string | null;
  signatureUrl?: string | null;
}

export interface TeacherProfile {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  department?: string | null;
  photoUrl?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  student?: StudentProfile | null;
  teacher?: TeacherProfile | null;
  schoolYear?: { id: string; label: string } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GradeLevel {
  id: string;
  number: number;
  name: string;
  isSeniorHigh: boolean;
  sectionCount?: number;
  subjectCount?: number;
}

export interface Strand {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sectionCount?: number;
  subjectCount?: number;
}

export interface SchoolYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  sectionCount?: number;
  studentCount?: number;
}

export interface TeacherLite {
  id: string;
  firstName: string;
  lastName: string;
  department?: string | null;
}

export interface Section {
  id: string;
  name: string;
  capacity: number;
  gradeLevelId: string;
  strandId: string | null;
  adviserId: string | null;
  schoolYearId: string;
  gradeLevel: GradeLevel;
  strand: Strand | null;
  adviser: TeacherLite | null;
  schoolYear: SchoolYear;
  _count: { students: number; subjects: number };
}

export type SubjectCategory = 'CORE' | 'APPLIED' | 'SPECIALIZED';

export interface Subject {
  id: string;
  code: string;
  title: string;
  gradeLevelId: string;
  strandId: string | null;
  semester: number | null;
  category: SubjectCategory;
  units: number | null;
  gradeLevel: GradeLevel;
  strand: Strand | null;
  _count?: { sections: number };
}

export type Audience = 'ALL' | 'STUDENTS' | 'TEACHERS' | 'SECTION' | 'GRADE_LEVEL';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  targetId: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  targetLabel: string;
  readCount?: number;
  isRead?: boolean;
  canEdit?: boolean;
}
