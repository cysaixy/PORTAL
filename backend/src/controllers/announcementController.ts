import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { audit, getCurrentEnrollment, getCurrentSchoolYear, HttpError, insensitive, paginate, requireStudent, requireTeacher } from '../lib/http';
import { announcementSchema, paginationSchema } from '../lib/validation';

const authorSelect = {
  select: {
    email: true,
    role: true,
    teacher: { select: { firstName: true, lastName: true } },
  },
} as const;

type WithAuthor = { author: { email: string; role: Role; teacher: { firstName: string; lastName: string } | null } };

function authorName(a: WithAuthor) {
  if (a.author.teacher) return `${a.author.teacher.firstName} ${a.author.teacher.lastName}`;
  return a.author.role === 'ADMIN' ? 'Registrar’s Office' : a.author.email;
}

async function targetLabels(items: { audience: string; targetId: string | null }[]) {
  const sectionIds = items.filter((i) => i.audience === 'SECTION' && i.targetId).map((i) => i.targetId!);
  const levelIds = items.filter((i) => i.audience === 'GRADE_LEVEL' && i.targetId).map((i) => i.targetId!);
  const [sections, levels] = await Promise.all([
    prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }),
    prisma.gradeLevel.findMany({ where: { id: { in: levelIds } }, select: { id: true, name: true } }),
  ]);
  const map = new Map<string, string>([...sections, ...levels].map((x) => [x.id, x.name]));
  return (i: { audience: string; targetId: string | null }) =>
    ({ ALL: 'Everyone', STUDENTS: 'All students', TEACHERS: 'All teachers' } as Record<string, string>)[i.audience] ??
    (i.targetId ? map.get(i.targetId) ?? 'Unknown target' : 'Unknown target');
}

async function validateTarget(data: { audience: string; targetId?: string | null }) {
  if (data.audience === 'SECTION') {
    if (!data.targetId || !(await prisma.section.findUnique({ where: { id: data.targetId } }))) {
      throw new HttpError(400, 'Choose a section for this announcement');
    }
  } else if (data.audience === 'GRADE_LEVEL') {
    if (!data.targetId || !(await prisma.gradeLevel.findUnique({ where: { id: data.targetId } }))) {
      throw new HttpError(400, 'Choose a grade level for this announcement');
    }
  }
}

// ============================================================================
// Admin
// ============================================================================

/** GET /api/admin/announcements */
export async function listAdminAnnouncements(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const where: Prisma.AnnouncementWhereInput = search
    ? { OR: [{ title: insensitive(search) }, { body: insensitive(search) }] }
    : {};

  const [announcements, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: { author: authorSelect, _count: { select: { reads: true } } },
    }),
    prisma.announcement.count({ where }),
  ]);
  const label = await targetLabels(announcements);

  res.json({
    announcements: announcements.map((a) => ({
      ...a,
      authorName: authorName(a),
      targetLabel: label(a),
      readCount: a._count.reads,
      canEdit: true,
    })),
    pagination: paginate(page, limit, total),
  });
}

/** POST /api/{admin|teacher}/announcements */
export async function createAnnouncement(req: Request, res: Response) {
  const data = announcementSchema.parse(req.body);
  await validateTarget(data);

  if (req.user!.role === Role.TEACHER) {
    await assertTeacherMayTarget(req, data);
  }

  const announcement = await prisma.announcement.create({
    data: {
      authorId: req.user!.id,
      title: data.title,
      body: data.body,
      audience: data.audience,
      targetId: data.audience === 'SECTION' || data.audience === 'GRADE_LEVEL' ? data.targetId ?? null : null,
      // Only admins may pin
      isPinned: req.user!.role === Role.ADMIN ? data.isPinned : false,
    },
  });
  await audit(req, 'CREATE', 'Announcement', announcement.id, undefined, { title: data.title, audience: data.audience });
  res.status(201).json({ announcement });
}

async function assertTeacherMayTarget(req: Request, data: { audience: string; targetId?: string | null }) {
  if (data.audience === 'ALL' || data.audience === 'TEACHERS') {
    throw new HttpError(403, 'Teachers can post to their own sections, grade levels or all students');
  }
  if (data.audience === 'SECTION' || data.audience === 'GRADE_LEVEL') {
    const teacher = await requireTeacher(req);
    const sy = await getCurrentSchoolYear();
    const allowed = await prisma.section.findFirst({
      where: {
        ...(sy && { schoolYearId: sy.id }),
        ...(data.audience === 'SECTION' ? { id: data.targetId! } : { gradeLevelId: data.targetId! }),
        OR: [{ adviserId: teacher.id }, { subjects: { some: { teacherId: teacher.id } } }],
      },
    });
    if (!allowed) throw new HttpError(403, 'You can only post to sections or grade levels you teach');
  }
}

async function ownAnnouncement(req: Request) {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!announcement) throw new HttpError(404, 'Announcement not found');
  if (req.user!.role !== Role.ADMIN && announcement.authorId !== req.user!.id) {
    throw new HttpError(403, 'You can only change your own announcements');
  }
  return announcement;
}

/** PUT /api/{admin|teacher}/announcements/:id */
export async function updateAnnouncement(req: Request, res: Response) {
  const existing = await ownAnnouncement(req);
  const data = announcementSchema.partial().parse(req.body);
  const merged = { audience: data.audience ?? existing.audience, targetId: data.targetId !== undefined ? data.targetId : existing.targetId };
  await validateTarget(merged);
  if (req.user!.role === Role.TEACHER) await assertTeacherMayTarget(req, merged);

  const announcement = await prisma.announcement.update({
    where: { id: existing.id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.body && { body: data.body }),
      audience: merged.audience,
      targetId: merged.audience === 'SECTION' || merged.audience === 'GRADE_LEVEL' ? merged.targetId : null,
      ...(req.user!.role === Role.ADMIN && data.isPinned !== undefined && { isPinned: data.isPinned }),
    },
  });
  await audit(req, 'UPDATE', 'Announcement', existing.id, { title: existing.title }, { title: announcement.title });
  res.json({ announcement });
}

/** DELETE /api/{admin|teacher}/announcements/:id */
export async function deleteAnnouncement(req: Request, res: Response) {
  const existing = await ownAnnouncement(req);
  await prisma.announcement.delete({ where: { id: existing.id } });
  await audit(req, 'DELETE', 'Announcement', existing.id, { title: existing.title });
  res.json({ message: 'Announcement deleted' });
}

// ============================================================================
// Teacher
// ============================================================================

/** GET /api/teacher/announcements — my posts + school-wide posts for teachers */
export async function listTeacherAnnouncements(req: Request, res: Response) {
  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ authorId: req.user!.id }, { audience: { in: ['ALL', 'TEACHERS'] } }] },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: { author: authorSelect, _count: { select: { reads: true } } },
    take: 100,
  });
  const label = await targetLabels(announcements);
  res.json({
    announcements: announcements.map((a) => ({
      ...a,
      authorName: authorName(a),
      targetLabel: label(a),
      readCount: a._count.reads,
      canEdit: a.authorId === req.user!.id,
    })),
  });
}

// ============================================================================
// Student
// ============================================================================

async function studentAudienceWhere(studentId: string): Promise<Prisma.AnnouncementWhereInput> {
  const enrollment = await getCurrentEnrollment(studentId);
  return {
    OR: [
      { audience: 'ALL' },
      { audience: 'STUDENTS' },
      ...(enrollment
        ? [
            { audience: 'SECTION' as const, targetId: enrollment.sectionId },
            { audience: 'GRADE_LEVEL' as const, targetId: enrollment.section.gradeLevelId },
          ]
        : []),
    ],
  };
}

/** GET /api/student/announcements */
export async function listStudentAnnouncements(req: Request, res: Response) {
  const student = await requireStudent(req);
  const announcements = await prisma.announcement.findMany({
    where: await studentAudienceWhere(student.id),
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: authorSelect,
      reads: { where: { studentId: student.id }, select: { readAt: true } },
    },
    take: 100,
  });
  const label = await targetLabels(announcements);

  const items = announcements.map(({ reads, ...a }) => ({
    ...a,
    authorName: authorName(a),
    targetLabel: label(a),
    isRead: reads.length > 0,
  }));
  res.json({ announcements: items, unreadCount: items.filter((a) => !a.isRead).length });
}

/** POST /api/student/announcements/:id/read */
export async function markAnnouncementRead(req: Request, res: Response) {
  const student = await requireStudent(req);
  const visible = await prisma.announcement.findFirst({
    where: { id: req.params.id, ...(await studentAudienceWhere(student.id)) },
  });
  if (!visible) throw new HttpError(404, 'Announcement not found');
  await prisma.announcementRead.upsert({
    where: { announcementId_studentId: { announcementId: visible.id, studentId: student.id } },
    update: {},
    create: { announcementId: visible.id, studentId: student.id },
  });
  res.json({ message: 'Marked as read' });
}

/** POST /api/student/announcements/read-all */
export async function markAllAnnouncementsRead(req: Request, res: Response) {
  const student = await requireStudent(req);
  const visible = await prisma.announcement.findMany({
    where: { ...(await studentAudienceWhere(student.id)), reads: { none: { studentId: student.id } } },
    select: { id: true },
  });
  await prisma.announcementRead.createMany({
    data: visible.map((a) => ({ announcementId: a.id, studentId: student.id })),
    skipDuplicates: true,
  });
  res.json({ marked: visible.length });
}
