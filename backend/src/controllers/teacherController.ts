import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import {
  audit,
  avg,
  getCurrentSchoolYear,
  getPassingScore,
  HttpError,
  int,
  requireTeacher,
} from '../lib/http';
import { bulkGradesSchema, lockGradeSchema, unlockRequestSchema } from '../lib/validation';

const QUARTERS = [1, 2, 3, 4] as const;

async function currentQuarter(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: 'current_quarter' } });
  const q = s ? parseInt(s.value, 10) : 1;
  return q >= 1 && q <= 4 ? q : 1;
}

/** Load an assignment and make sure it belongs to the signed-in teacher. */
async function ownAssignment(req: Request, id: string) {
  const teacher = await requireTeacher(req);
  const assignment = await prisma.sectionSubject.findUnique({
    where: { id },
    include: {
      subject: true,
      section: { include: { gradeLevel: true, strand: true, schoolYear: true } },
    },
  });
  if (!assignment) throw new HttpError(404, 'Class not found');
  if (assignment.teacherId !== teacher.id) throw new HttpError(403, 'You are not assigned to this class');
  return { teacher, assignment };
}

/** Per-quarter status for a list of assignments. */
async function sheetStatuses(assignmentIds: string[]) {
  const [grades, enrolled, pending] = await Promise.all([
    prisma.grade.groupBy({
      by: ['sectionSubjectId', 'quarter', 'locked'],
      where: { sectionSubjectId: { in: assignmentIds } },
      _count: { _all: true },
    }),
    prisma.sectionSubject.findMany({
      where: { id: { in: assignmentIds } },
      select: { id: true, section: { select: { _count: { select: { students: true } } } } },
    }),
    prisma.unlockRequest.findMany({
      where: { status: 'pending', grade: { sectionSubjectId: { in: assignmentIds } } },
      select: { grade: { select: { sectionSubjectId: true, quarter: true } } },
    }),
  ]);

  const result = new Map<string, Record<number, { encoded: number; locked: number; total: number; pendingUnlock: boolean }>>();
  for (const a of enrolled) {
    const total = a.section._count.students;
    const perQ: Record<number, { encoded: number; locked: number; total: number; pendingUnlock: boolean }> = {};
    for (const q of QUARTERS) {
      const rows = grades.filter((g) => g.sectionSubjectId === a.id && g.quarter === q);
      perQ[q] = {
        total,
        encoded: rows.reduce((n, r) => n + r._count._all, 0),
        locked: rows.filter((r) => r.locked).reduce((n, r) => n + r._count._all, 0),
        pendingUnlock: pending.some((p) => p.grade.sectionSubjectId === a.id && p.grade.quarter === q),
      };
    }
    result.set(a.id, perQ);
  }
  return result;
}

function statusLabel(s: { encoded: number; locked: number; total: number }) {
  if (s.total > 0 && s.locked >= s.total) return 'Locked';
  if (s.encoded === 0) return 'Not started';
  if (s.encoded >= s.total) return 'Complete';
  return 'In progress';
}

/** GET /api/teacher/classes */
export async function listClasses(req: Request, res: Response) {
  const teacher = await requireTeacher(req);
  const sy = await getCurrentSchoolYear();
  const assignments = await prisma.sectionSubject.findMany({
    where: { teacherId: teacher.id, ...(sy && { section: { schoolYearId: sy.id } }) },
    include: {
      subject: true,
      section: { include: { gradeLevel: true, strand: true, _count: { select: { students: true } } } },
    },
    orderBy: [{ section: { gradeLevel: { number: 'asc' } } }, { section: { name: 'asc' } }, { subject: { code: 'asc' } }],
  });
  const statuses = await sheetStatuses(assignments.map((a) => a.id));

  res.json({
    currentQuarter: await currentQuarter(),
    classes: assignments.map((a) => ({
      id: a.id,
      subject: { id: a.subject.id, code: a.subject.code, title: a.subject.title, category: a.subject.category },
      section: {
        id: a.section.id,
        name: a.section.name,
        gradeLevel: a.section.gradeLevel.name,
        strand: a.section.strand?.code ?? null,
        studentCount: a.section._count.students,
      },
      quarters: Object.fromEntries(
        QUARTERS.map((q) => {
          const s = statuses.get(a.id)![q];
          return [q, { ...s, status: statusLabel(s) }];
        })
      ),
    })),
  });
}

/** GET /api/teacher/classes/:id/sheet?quarter=N */
export async function getSheet(req: Request, res: Response) {
  const { assignment } = await ownAssignment(req, req.params.id);
  const quarter = int(req.query.quarter) ?? (await currentQuarter());
  if (quarter < 1 || quarter > 4) throw new HttpError(400, 'Quarter must be 1-4');

  const [enrollments, pending, passingScore] = await Promise.all([
    prisma.studentSection.findMany({
      where: { sectionId: assignment.sectionId },
      include: {
        student: { select: { id: true, lrn: true, firstName: true, middleName: true, lastName: true, sex: true } },
        grades: { where: { sectionSubjectId: assignment.id }, orderBy: { quarter: 'asc' } },
      },
      orderBy: [{ student: { sex: 'desc' } }, { student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    }),
    prisma.unlockRequest.findFirst({
      where: { status: 'pending', grade: { sectionSubjectId: assignment.id, quarter } },
    }),
    getPassingScore(),
  ]);

  const rows = enrollments.map((e) => {
    const byQ = Object.fromEntries(QUARTERS.map((q) => [q, e.grades.find((g) => g.quarter === q)]));
    return {
      studentSectionId: e.id,
      student: e.student,
      score: byQ[quarter] ? Number(byQ[quarter]!.score) : null,
      locked: byQ[quarter]?.locked ?? false,
      allQuarters: Object.fromEntries(QUARTERS.map((q) => [q, byQ[q] ? Number(byQ[q]!.score) : null])),
    };
  });

  const scores = rows.map((r) => r.score).filter((s): s is number => s !== null);
  const locked = rows.length > 0 && rows.every((r) => r.locked);

  res.json({
    assignment: {
      id: assignment.id,
      subject: { code: assignment.subject.code, title: assignment.subject.title },
      section: {
        id: assignment.section.id,
        name: assignment.section.name,
        gradeLevel: assignment.section.gradeLevel.name,
        strand: assignment.section.strand?.code ?? null,
      },
      schoolYear: assignment.section.schoolYear.label,
    },
    quarter,
    passingScore,
    locked,
    pendingUnlock: pending ? { id: pending.id, reason: pending.reason, createdAt: pending.createdAt } : null,
    rows,
    stats: {
      total: rows.length,
      encoded: scores.length,
      average: avg(scores),
      highest: scores.length ? Math.max(...scores) : null,
      lowest: scores.length ? Math.min(...scores) : null,
      failing: scores.filter((s) => s < passingScore).length,
    },
  });
}

/** PUT /api/teacher/classes/:id/sheet — bulk save (score: null clears a grade) */
export async function saveSheet(req: Request, res: Response) {
  const data = bulkGradesSchema.parse({ ...req.body, sectionSubjectId: req.params.id });
  const { assignment } = await ownAssignment(req, data.sectionSubjectId);
  const passingScore = await getPassingScore();

  const enrollments = await prisma.studentSection.findMany({
    where: { sectionId: assignment.sectionId, id: { in: data.grades.map((g) => g.studentSectionId) } },
    include: { grades: { where: { sectionSubjectId: assignment.id, quarter: data.quarter } } },
  });
  if (enrollments.length !== new Set(data.grades.map((g) => g.studentSectionId)).size) {
    throw new HttpError(400, 'Some students are not enrolled in this section');
  }
  if (enrollments.some((e) => e.grades[0]?.locked)) {
    throw new HttpError(423, 'This grade sheet is locked. Request an unlock from the registrar to make changes.');
  }

  const changes: { studentSectionId: string; before: number | null; after: number | null }[] = [];
  await prisma.$transaction(async (tx) => {
    for (const g of data.grades) {
      const existing = enrollments.find((e) => e.id === g.studentSectionId)!.grades[0];
      const before = existing ? Number(existing.score) : null;
      if (before === g.score) continue;

      if (g.score === null) {
        if (existing) await tx.grade.delete({ where: { id: existing.id } });
      } else {
        const remarks = g.score >= passingScore ? 'PASSED' : 'FAILED';
        await tx.grade.upsert({
          where: {
            studentSectionId_sectionSubjectId_quarter: {
              studentSectionId: g.studentSectionId,
              sectionSubjectId: assignment.id,
              quarter: data.quarter,
            },
          },
          update: { score: g.score, remarks },
          create: {
            studentSectionId: g.studentSectionId,
            sectionSubjectId: assignment.id,
            quarter: data.quarter,
            score: g.score,
            remarks,
          },
        });
      }
      changes.push({ studentSectionId: g.studentSectionId, before, after: g.score });
    }
  });

  if (changes.length) {
    await audit(req, 'ENCODE', 'GradeSheet', assignment.id, undefined, {
      section: assignment.section.name,
      subject: assignment.subject.code,
      quarter: data.quarter,
      changes,
    });
  }
  res.json({ saved: changes.length });
}

/** POST /api/teacher/classes/:id/lock — submit a complete sheet */
export async function lockSheet(req: Request, res: Response) {
  const { quarter } = lockGradeSchema.parse({ ...req.body, sectionSubjectId: req.params.id });
  const { assignment } = await ownAssignment(req, req.params.id);

  const [studentCount, gradeCount] = await Promise.all([
    prisma.studentSection.count({ where: { sectionId: assignment.sectionId } }),
    prisma.grade.count({ where: { sectionSubjectId: assignment.id, quarter } }),
  ]);
  if (studentCount === 0) throw new HttpError(400, 'There are no students in this class yet');
  if (gradeCount < studentCount) {
    throw new HttpError(400, `Encode all ${studentCount} grades before submitting (${studentCount - gradeCount} missing)`);
  }

  const result = await prisma.grade.updateMany({
    where: { sectionSubjectId: assignment.id, quarter, locked: false },
    data: { locked: true, lockedAt: new Date(), lockedById: req.user!.id },
  });
  await audit(req, 'LOCK', 'GradeSheet', assignment.id, undefined, {
    section: assignment.section.name,
    subject: assignment.subject.code,
    quarter,
    count: result.count,
  });
  logger.info(`Sheet locked: ${assignment.section.name} ${assignment.subject.code} Q${quarter}`);
  res.json({ lockedCount: result.count });
}

/** POST /api/teacher/classes/:id/unlock-request */
export async function requestUnlock(req: Request, res: Response) {
  const data = unlockRequestSchema.parse({ ...req.body, sectionSubjectId: req.params.id });
  const { assignment } = await ownAssignment(req, req.params.id);

  const anyLocked = await prisma.grade.findFirst({
    where: { sectionSubjectId: assignment.id, quarter: data.quarter, locked: true },
  });
  if (!anyLocked) throw new HttpError(400, 'This sheet is not locked');

  const existing = await prisma.unlockRequest.findFirst({
    where: { status: 'pending', grade: { sectionSubjectId: assignment.id, quarter: data.quarter } },
  });
  if (existing) throw new HttpError(409, 'You already have a pending unlock request for this sheet');

  const request = await prisma.unlockRequest.create({
    data: { gradeId: anyLocked.id, requestedBy: req.user!.email, reason: data.reason },
  });
  await audit(req, 'REQUEST_UNLOCK', 'GradeSheet', assignment.id, undefined, {
    section: assignment.section.name,
    subject: assignment.subject.code,
    quarter: data.quarter,
    reason: data.reason,
  });
  res.status(201).json({ request });
}

/** GET /api/teacher/advisory — advisory section roster with averages */
export async function getAdvisory(req: Request, res: Response) {
  const teacher = await requireTeacher(req);
  const sy = await getCurrentSchoolYear();
  const section = await prisma.section.findFirst({
    where: { adviserId: teacher.id, ...(sy && { schoolYearId: sy.id }) },
    include: {
      gradeLevel: true,
      strand: true,
      schoolYear: true,
      subjects: { include: { subject: true, teacher: { select: { firstName: true, lastName: true } } } },
      students: {
        include: {
          student: {
            select: {
              id: true,
              lrn: true,
              firstName: true,
              lastName: true,
              sex: true,
              photoUrl: true,
              signatureUrl: true,
              guardianName: true,
              guardianContact: true,
            },
          },
          grades: { select: { quarter: true, score: true } },
        },
        orderBy: [{ student: { sex: 'desc' } }, { student: { lastName: 'asc' } }],
      },
    },
  });

  if (!section) return res.json({ section: null });

  const passingScore = await getPassingScore();
  const students = section.students.map((e) => {
    const quarterAverages = Object.fromEntries(
      QUARTERS.map((q) => [q, avg(e.grades.filter((g) => g.quarter === q).map((g) => Number(g.score)))])
    );
    const overall = avg(e.grades.map((g) => Number(g.score)));
    return {
      ...e.student,
      quarterAverages,
      average: overall,
      atRisk: overall !== null && overall < passingScore,
      idReady: !!(e.student.photoUrl && e.student.signatureUrl),
    };
  });

  res.json({
    section: {
      id: section.id,
      name: section.name,
      gradeLevel: section.gradeLevel.name,
      strand: section.strand?.code ?? null,
      schoolYear: section.schoolYear.label,
      capacity: section.capacity,
      subjects: section.subjects.map((s) => ({
        code: s.subject.code,
        title: s.subject.title,
        teacher: `${s.teacher.firstName} ${s.teacher.lastName}`,
      })),
    },
    passingScore,
    students,
  });
}

/** GET /api/teacher/dashboard */
export async function getDashboard(req: Request, res: Response) {
  const teacher = await requireTeacher(req);
  const sy = await getCurrentSchoolYear();
  const quarter = await currentQuarter();

  const assignments = await prisma.sectionSubject.findMany({
    where: { teacherId: teacher.id, ...(sy && { section: { schoolYearId: sy.id } }) },
    include: { subject: true, section: { select: { id: true, name: true, _count: { select: { students: true } } } } },
    orderBy: [{ section: { name: 'asc' } }],
  });
  const statuses = await sheetStatuses(assignments.map((a) => a.id));

  const [advisory, announcements, pendingRequests] = await Promise.all([
    prisma.section.findFirst({
      where: { adviserId: teacher.id, ...(sy && { schoolYearId: sy.id }) },
      select: { id: true, name: true, _count: { select: { students: true } } },
    }),
    prisma.announcement.findMany({
      where: { audience: { in: ['ALL', 'TEACHERS'] } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 4,
      select: { id: true, title: true, body: true, createdAt: true, isPinned: true },
    }),
    prisma.unlockRequest.count({ where: { status: 'pending', requestedBy: req.user!.email } }),
  ]);

  const sectionIds = new Set(assignments.map((a) => a.section.id));
  const studentTotal = await prisma.studentSection.count({ where: { sectionId: { in: [...sectionIds] } } });

  const sheets = assignments.map((a) => {
    const s = statuses.get(a.id)![quarter];
    return {
      id: a.id,
      section: a.section.name,
      subject: a.subject.code,
      subjectTitle: a.subject.title,
      ...s,
      status: statusLabel(s),
    };
  });

  res.json({
    teacher: { firstName: teacher.firstName, lastName: teacher.lastName, department: teacher.department },
    quarter,
    stats: {
      classes: assignments.length,
      students: studentTotal,
      sheetsLocked: sheets.filter((s) => s.status === 'Locked').length,
      sheetsPending: sheets.filter((s) => s.status !== 'Locked').length,
      pendingRequests,
    },
    advisory: advisory ? { id: advisory.id, name: advisory.name, studentCount: advisory._count.students } : null,
    sheets,
    announcements,
  });
}

/** GET /api/teacher/targets — sections & grade levels this teacher may address */
export async function getAnnouncementTargets(req: Request, res: Response) {
  const teacher = await requireTeacher(req);
  const sy = await getCurrentSchoolYear();
  const sections = await prisma.section.findMany({
    where: {
      ...(sy && { schoolYearId: sy.id }),
      OR: [{ adviserId: teacher.id }, { subjects: { some: { teacherId: teacher.id } } }],
    },
    select: { id: true, name: true, gradeLevel: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  const gradeLevels = [...new Map(sections.map((s) => [s.gradeLevel.id, s.gradeLevel])).values()];
  res.json({ sections: sections.map((s) => ({ id: s.id, name: s.name })), gradeLevels });
}
