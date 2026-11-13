import { Request, Response } from 'express';
import prisma from '../config/database';
import { getCurrentSchoolYear } from '../lib/http';

function describe(log: { action: string; entity: string; after: unknown; before: unknown }) {
  const a = (log.after ?? log.before ?? {}) as Record<string, any>;
  const sheet = a.section && a.subject ? `${a.subject} · ${a.section}${a.quarter ? ` · Q${a.quarter}` : ''}` : null;
  switch (`${log.action}:${log.entity}`) {
    case 'ENCODE:GradeSheet':
      return `Encoded ${a.changes?.length ?? ''} grade(s) — ${sheet}`;
    case 'LOCK:GradeSheet':
      return `Submitted & locked ${sheet}`;
    case 'UNLOCK:GradeSheet':
      return `Unlocked ${sheet ?? `Q${a.quarter} sheet`}`;
    case 'REQUEST_UNLOCK:GradeSheet':
      return `Requested unlock — ${sheet}`;
    case 'REJECT_UNLOCK:GradeSheet':
      return `Rejected unlock request (Q${a.quarter})`;
    default:
      return `${log.action.toLowerCase().replace(/_/g, ' ')} ${log.entity}${a.name ? ` · ${a.name}` : a.title ? ` · ${a.title}` : a.code ? ` · ${a.code}` : ''}`;
  }
}

/** GET /api/admin/dashboard/stats */
export async function getDashboardStats(_req: Request, res: Response) {
  const sy = await getCurrentSchoolYear();
  if (!sy) {
    return res.json({ schoolYear: null });
  }
  const inYear = { schoolYearId: sy.id };

  const [gradeLevels, sections, teachersTotal, teachersTeaching, subjectsTotal, unassignedStudents, pendingRequests, idReady, studentsTotal, quarterSetting] =
    await Promise.all([
      prisma.gradeLevel.findMany({ orderBy: { number: 'asc' } }),
      prisma.section.findMany({
        where: inYear,
        select: {
          id: true,
          gradeLevelId: true,
          adviserId: true,
          _count: { select: { students: true, subjects: true } },
        },
      }),
      prisma.teacher.count({ where: { user: { isActive: true } } }),
      prisma.teacher.count({ where: { assignments: { some: { section: inYear } } } }),
      prisma.subject.count(),
      prisma.student.count({ where: { user: { isActive: true }, enrollments: { none: { section: inYear } } } }),
      prisma.unlockRequest.count({ where: { status: 'pending' } }),
      prisma.student.count({ where: { photoUrl: { not: null }, signatureUrl: { not: null } } }),
      prisma.student.count({ where: { user: { isActive: true } } }),
      prisma.setting.findUnique({ where: { key: 'current_quarter' } }),
    ]);
  const quarter = Number(quarterSetting?.value ?? 1);

  // Grade submission for the current quarter, per grade level
  const classes = await prisma.sectionSubject.findMany({
    where: { section: inYear },
    select: { id: true, section: { select: { gradeLevelId: true, _count: { select: { students: true } } } } },
  });
  const gradeCounts = await prisma.grade.groupBy({
    by: ['sectionSubjectId', 'locked'],
    where: { quarter, sectionSubject: { section: inYear } },
    _count: { _all: true },
  });

  const byGrade = gradeLevels.map((gl) => {
    const glSections = sections.filter((s) => s.gradeLevelId === gl.id);
    const glClasses = classes.filter((c) => c.section.gradeLevelId === gl.id);
    const needed = glClasses.reduce((n, c) => n + c.section._count.students, 0);
    const rows = gradeCounts.filter((g) => glClasses.some((c) => c.id === g.sectionSubjectId));
    return {
      grade: `G${gl.number}`,
      name: gl.name,
      isSeniorHigh: gl.isSeniorHigh,
      students: glSections.reduce((n, s) => n + s._count.students, 0),
      sections: glSections.length,
      encoded: rows.reduce((n, r) => n + r._count._all, 0),
      locked: rows.filter((r) => r.locked).reduce((n, r) => n + r._count._all, 0),
      needed,
    };
  });

  const recent = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { user: { select: { email: true, role: true, teacher: { select: { firstName: true, lastName: true } } } } },
  });

  const enrolled = byGrade.reduce((n, g) => n + g.students, 0);
  res.json({
    schoolYear: { id: sy.id, label: sy.label },
    quarter,
    students: {
      enrolled,
      juniorHigh: byGrade.filter((g) => !g.isSeniorHigh).reduce((n, g) => n + g.students, 0),
      seniorHigh: byGrade.filter((g) => g.isSeniorHigh).reduce((n, g) => n + g.students, 0),
      unassigned: unassignedStudents,
      total: studentsTotal,
    },
    teachers: { total: teachersTotal, teaching: teachersTeaching, withoutLoad: Math.max(0, teachersTotal - teachersTeaching) },
    sections: {
      total: sections.length,
      withoutAdviser: sections.filter((s) => !s.adviserId).length,
      withoutSubjects: sections.filter((s) => s._count.subjects === 0).length,
    },
    subjects: { total: subjectsTotal },
    idCards: { ready: idReady, total: studentsTotal },
    pendingUnlockRequests: pendingRequests,
    byGrade,
    recentActivity: recent.map((log) => ({
      id: log.id,
      actor: log.user.teacher ? `${log.user.teacher.firstName} ${log.user.teacher.lastName}` : log.user.email,
      role: log.user.role,
      action: log.action,
      description: describe(log),
      createdAt: log.createdAt,
    })),
  });
}
