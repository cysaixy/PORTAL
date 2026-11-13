import { Request, Response } from 'express';
import prisma from '../config/database';
import { audit, avg, getCurrentSchoolYear, HttpError, int, str } from '../lib/http';
import { reviewUnlockSchema, unlockSheetSchema } from '../lib/validation';

/**
 * GET /api/admin/grade-sheets?quarter=N&status=&search=
 * Every class (section × subject) in the current school year with its sheet status for a quarter.
 */
export async function listGradeSheets(req: Request, res: Response) {
  const quarter = int(req.query.quarter) ?? 1;
  const statusFilter = str(req.query.status);
  const search = str(req.query.search)?.toLowerCase();
  const sy = await getCurrentSchoolYear();

  const assignments = await prisma.sectionSubject.findMany({
    where: sy ? { section: { schoolYearId: sy.id } } : {},
    include: {
      subject: { select: { code: true, title: true } },
      teacher: { select: { firstName: true, lastName: true } },
      section: { select: { id: true, name: true, gradeLevel: { select: { number: true } }, _count: { select: { students: true } } } },
    },
    orderBy: [{ section: { gradeLevel: { number: 'asc' } } }, { section: { name: 'asc' } }, { subject: { code: 'asc' } }],
  });

  const ids = assignments.map((a) => a.id);
  const [grades, pending] = await Promise.all([
    prisma.grade.groupBy({
      by: ['sectionSubjectId', 'locked'],
      where: { sectionSubjectId: { in: ids }, quarter },
      _count: { _all: true },
      _max: { lockedAt: true, updatedAt: true },
    }),
    prisma.unlockRequest.findMany({
      where: { status: 'pending', grade: { sectionSubjectId: { in: ids }, quarter } },
      select: { id: true, grade: { select: { sectionSubjectId: true } } },
    }),
  ]);

  let sheets = assignments.map((a) => {
    const rows = grades.filter((g) => g.sectionSubjectId === a.id);
    const encoded = rows.reduce((n, r) => n + r._count._all, 0);
    const locked = rows.filter((r) => r.locked).reduce((n, r) => n + r._count._all, 0);
    const total = a.section._count.students;
    const status = total > 0 && locked >= total ? 'Locked' : encoded === 0 ? 'Not started' : encoded >= total ? 'Complete' : 'In progress';
    return {
      sectionSubjectId: a.id,
      section: a.section.name,
      gradeLevel: a.section.gradeLevel.number,
      subject: a.subject.code,
      subjectTitle: a.subject.title,
      teacher: `${a.teacher.firstName} ${a.teacher.lastName}`,
      total,
      encoded,
      locked,
      status,
      lockedAt: rows.find((r) => r.locked)?._max.lockedAt ?? null,
      pendingRequestId: pending.find((p) => p.grade.sectionSubjectId === a.id)?.id ?? null,
    };
  });

  const summary = {
    total: sheets.length,
    locked: sheets.filter((s) => s.status === 'Locked').length,
    complete: sheets.filter((s) => s.status === 'Complete').length,
    inProgress: sheets.filter((s) => s.status === 'In progress').length,
    notStarted: sheets.filter((s) => s.status === 'Not started').length,
    pendingRequests: pending.length,
  };

  if (statusFilter) sheets = sheets.filter((s) => s.status === statusFilter);
  if (search) {
    sheets = sheets.filter((s) => `${s.section} ${s.subject} ${s.subjectTitle} ${s.teacher}`.toLowerCase().includes(search));
  }

  res.json({ quarter, summary, sheets });
}

/** GET /api/admin/grade-sheets/:id?quarter=N — read-only view of one sheet */
export async function getGradeSheet(req: Request, res: Response) {
  const quarter = int(req.query.quarter) ?? 1;
  const assignment = await prisma.sectionSubject.findUnique({
    where: { id: req.params.id },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      section: {
        include: {
          students: {
            include: {
              student: { select: { lrn: true, firstName: true, lastName: true } },
              grades: { where: { sectionSubjectId: req.params.id, quarter } },
            },
            orderBy: [{ student: { lastName: 'asc' } }],
          },
        },
      },
    },
  });
  if (!assignment) throw new HttpError(404, 'Class not found');

  const rows = assignment.section.students.map((e) => ({
    lrn: e.student.lrn,
    name: `${e.student.lastName}, ${e.student.firstName}`,
    score: e.grades[0] ? Number(e.grades[0].score) : null,
    locked: e.grades[0]?.locked ?? false,
  }));
  const scores = rows.map((r) => r.score).filter((s): s is number => s !== null);

  res.json({
    section: assignment.section.name,
    subject: `${assignment.subject.code} — ${assignment.subject.title}`,
    teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
    quarter,
    rows,
    stats: { encoded: scores.length, total: rows.length, average: avg(scores) },
  });
}

async function setSheetLock(req: Request, lock: boolean) {
  const { sectionSubjectId, quarter } = unlockSheetSchema.parse(req.body);
  const assignment = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: { section: true, subject: true },
  });
  if (!assignment) throw new HttpError(404, 'Class not found');

  const result = await prisma.grade.updateMany({
    where: { sectionSubjectId, quarter, locked: !lock },
    data: lock
      ? { locked: true, lockedAt: new Date(), lockedById: req.user!.id }
      : { locked: false, lockedAt: null, lockedById: null },
  });
  if (result.count === 0) throw new HttpError(400, lock ? 'Nothing to lock on this sheet' : 'This sheet is not locked');

  if (!lock) {
    // Any pending request for this sheet is now moot
    await prisma.unlockRequest.updateMany({
      where: { status: 'pending', grade: { sectionSubjectId, quarter } },
      data: { status: 'approved', reviewedAt: new Date(), reviewedById: req.user!.id, adminNote: 'Unlocked directly by registrar' },
    });
  }
  await audit(req, lock ? 'LOCK' : 'UNLOCK', 'GradeSheet', sectionSubjectId, undefined, {
    section: assignment.section.name,
    subject: assignment.subject.code,
    quarter,
    count: result.count,
  });
  return result.count;
}

/** POST /api/admin/grade-sheets/unlock */
export async function unlockSheet(req: Request, res: Response) {
  const count = await setSheetLock(req, false);
  res.json({ message: `Unlocked ${count} grade(s)` });
}

/** POST /api/admin/grade-sheets/lock */
export async function lockSheet(req: Request, res: Response) {
  const count = await setSheetLock(req, true);
  res.json({ message: `Locked ${count} grade(s)` });
}

/** GET /api/admin/unlock-requests?status=pending|approved|rejected */
export async function listUnlockRequests(req: Request, res: Response) {
  const status = str(req.query.status) ?? 'pending';
  const requests = await prisma.unlockRequest.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      reviewedBy: { select: { email: true } },
      grade: {
        select: {
          quarter: true,
          sectionSubject: {
            select: {
              id: true,
              section: { select: { name: true } },
              subject: { select: { code: true, title: true } },
              teacher: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  res.json({
    requests: requests.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      adminNote: r.adminNote,
      requestedBy: r.requestedBy,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy?.email ?? null,
      quarter: r.grade.quarter,
      sectionSubjectId: r.grade.sectionSubject.id,
      section: r.grade.sectionSubject.section.name,
      subject: r.grade.sectionSubject.subject.code,
      subjectTitle: r.grade.sectionSubject.subject.title,
      teacher: `${r.grade.sectionSubject.teacher.firstName} ${r.grade.sectionSubject.teacher.lastName}`,
    })),
  });
}

/** POST /api/admin/unlock-requests/:id/review — approving unlocks the whole sheet */
export async function reviewUnlockRequest(req: Request, res: Response) {
  const data = reviewUnlockSchema.parse(req.body);
  const request = await prisma.unlockRequest.findUnique({
    where: { id: req.params.id },
    include: { grade: { select: { sectionSubjectId: true, quarter: true } } },
  });
  if (!request) throw new HttpError(404, 'Unlock request not found');
  if (request.status !== 'pending') throw new HttpError(400, 'This request has already been reviewed');
  if (data.status === 'rejected' && !data.adminNote) throw new HttpError(400, 'Please give a reason for rejecting');

  const { sectionSubjectId, quarter } = request.grade;
  await prisma.$transaction([
    prisma.unlockRequest.update({
      where: { id: request.id },
      data: { status: data.status, adminNote: data.adminNote ?? null, reviewedAt: new Date(), reviewedById: req.user!.id },
    }),
    ...(data.status === 'approved'
      ? [
          prisma.grade.updateMany({
            where: { sectionSubjectId, quarter },
            data: { locked: false, lockedAt: null, lockedById: null },
          }),
        ]
      : []),
  ]);

  await audit(req, data.status === 'approved' ? 'UNLOCK' : 'REJECT_UNLOCK', 'GradeSheet', sectionSubjectId, undefined, {
    quarter,
    requestedBy: request.requestedBy,
    note: data.adminNote,
  });
  res.json({ message: data.status === 'approved' ? 'Request approved — sheet unlocked' : 'Request rejected' });
}
