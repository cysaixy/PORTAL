import type { IconName } from '../components/Icon';
import { Role } from '../types';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const STUDENT_NAV: NavGroup[] = [
  {
    items: [
      { href: '/student', label: 'Dashboard', icon: 'home' },
      { href: '/student/my-grades', label: 'My grades', icon: 'chart' },
      { href: '/student/my-subjects', label: 'My subjects', icon: 'book' },
      { href: '/student/announcements', label: 'Announcements', icon: 'megaphone' },
      { href: '/student/report-card', label: 'Report card', icon: 'printer' },
      { href: '/student/my-id', label: 'My ID', icon: 'idcard' },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    items: [
      { href: '/teacher', label: 'Dashboard', icon: 'home' },
      { href: '/teacher/my-sections', label: 'My classes', icon: 'layers' },
      { href: '/teacher/encode-grades', label: 'Encode grades', icon: 'pencil' },
      { href: '/teacher/advisory', label: 'Advisory class', icon: 'users' },
      { href: '/teacher/announcements', label: 'Announcements', icon: 'megaphone' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ href: '/admin', label: 'Dashboard', icon: 'home' }] },
  {
    label: 'Academic setup',
    items: [
      { href: '/admin/school-years', label: 'School years', icon: 'calendar' },
      { href: '/admin/grade-levels', label: 'Grade levels & strands', icon: 'layers' },
      { href: '/admin/sections', label: 'Sections', icon: 'users' },
      { href: '/admin/subjects', label: 'Subjects', icon: 'book' },
      { href: '/admin/teaching-assignments', label: 'Teaching loads', icon: 'link' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/students', label: 'Students', icon: 'graduation' },
      { href: '/admin/teachers', label: 'Teachers', icon: 'user' },
      { href: '/admin/allowed-emails', label: 'Access list', icon: 'mail' },
      { href: '/admin/id-cards', label: 'ID photos', icon: 'idcard' },
    ],
  },
  {
    label: 'Records',
    items: [
      { href: '/admin/grade-locks', label: 'Grade sheets', icon: 'lock' },
      { href: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
      { href: '/admin/audit-log', label: 'Audit log', icon: 'history' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  [Role.ADMIN]: ADMIN_NAV,
  [Role.TEACHER]: TEACHER_NAV,
  [Role.STUDENT]: STUDENT_NAV,
};
