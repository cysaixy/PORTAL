export const STUDENT_NAV = [
  { href: '/student', label: 'Dashboard', enabled: true, role: 'STUDENT' as const },
  { href: '/student/my-grades', label: 'My grades', enabled: true, role: 'STUDENT' as const },
  { href: '/student/my-subjects', label: 'My subjects', enabled: true, role: 'STUDENT' as const },
  { href: '/student/announcements', label: 'Announcements', enabled: true, role: 'STUDENT' as const },
  { href: '/student/report-card', label: 'Report card', enabled: true, role: 'STUDENT' as const },
  { href: '/student/my-id', label: 'My ID', enabled: true, role: 'STUDENT' as const },
];

export const TEACHER_NAV = [
  { href: '/teacher', label: 'Dashboard', enabled: true, role: 'TEACHER' as const },
  { href: '/teacher/my-sections', label: 'My sections', enabled: true, role: 'TEACHER' as const },
  { href: '/teacher/encode-grades', label: 'Encode grades', enabled: true, role: 'TEACHER' as const },
  { href: '/teacher/advisory', label: 'Advisory class', enabled: true, role: 'TEACHER' as const },
  { href: '/teacher/announcements', label: 'Announcements', enabled: true, role: 'TEACHER' as const },
];

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/school-years', label: 'School years', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/grade-levels', label: 'Grade levels', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/sections', label: 'Sections', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/subjects', label: 'Subjects', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/teaching-assignments', label: 'Teaching assignments', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/students', label: 'Students', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/teachers', label: 'Teachers', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/allowed-emails', label: 'Allowed emails', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/id-cards', label: 'ID assets', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/grade-locks', label: 'Grade locks', enabled: true, role: 'ADMIN' as const },
  { href: '/admin/audit-log', label: 'Audit log', enabled: true, role: 'ADMIN' as const },
];
