// User and Authentication Types
export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  student?: StudentProfile;
  teacher?: TeacherProfile;
}

export interface StudentProfile {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  birthdate: string;
  sex: string;
}

export interface TeacherProfile {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  department?: string;
}

// Academic Types
export interface SchoolYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface GradeLevel {
  id: string;
  number: number;
  name: string;
  isSeniorHigh: boolean;
}

export interface Strand {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Section {
  id: string;
  name: string;
  gradeLevelId: string;
  strandId?: string;
  adviserId?: string;
  schoolYearId: string;
  capacity: number;
  gradeLevel?: GradeLevel;
  strand?: Strand;
  adviser?: TeacherProfile;
}

export enum SubjectCategory {
  CORE = 'CORE',
  APPLIED = 'APPLIED',
  SPECIALIZED = 'SPECIALIZED',
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  gradeLevelId: string;
  strandId?: string;
  semester?: number;
  category: SubjectCategory;
  units?: number;
}

export interface Grade {
  id: string;
  quarter: number;
  score: number;
  remarks?: string;
  locked: boolean;
  encodedAt: string;
  updatedAt: string;
  subject?: Subject;
  teacher?: TeacherProfile;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  isPinned: boolean;
  createdAt: string;
  author?: User;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  createdAt: string;
  user?: User;
}
