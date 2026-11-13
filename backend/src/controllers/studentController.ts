import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import logger from '../config/logger';
import { avg, fullName, getCurrentEnrollment, getPassingScore, HttpError, requireStudent } from '../lib/http';

const QUARTERS = [1, 2, 3, 4] as const;

/**
 * Build the per-subject grade table for an enrollment.
 * Students only see grades the teacher has submitted (locked); drafts stay private.
 */
async function buildGradeReport(enrollmentId: string, sectionId: string) {
  const [classes, grades, passingScore] = await Promise.all([
    prisma.sectionSubject.findMany({
      where: { sectionId },
      include: { subject: true, teacher: { select: { firstName: true, lastName: true } } },
      orderBy: { subject: { code: 'asc' } },
    }),
    prisma.grade.findMany({ where: { studentSectionId: enrollmentId, locked: true } }),
    getPassingScore(),
  ]);

  const subjects = classes.map((c) => {
    const quarters = Object.fromEntries(
      QUARTERS.map((q) => {
        const g = grades.find((x) => x.sectionSubjectId === c.id && x.quarter === q);
        return [q, g ? { score: Number(g.score), locked: g.locked } : null];
      })
    ) as Record<number, { score: number; locked: boolean } | null>;

    const scores = QUARTERS.map((q) => quarters[q]?.score).filter((s): s is number => s !== undefined);
    const complete = scores.length === 4;
    const finalGrade = complete ? Math.round(avg(scores)!) : null;
    return {
      sectionSubjectId: c.id,
      code: c.subject.code,
      title: c.subject.title,
      category: c.subject.category,
      semester: c.subject.semester,
      teacher: `${c.teacher.firstName} ${c.teacher.lastName}`,
      quarters,
      runningAverage: avg(scores),
      finalGrade,
      remarks: finalGrade === null ? null : finalGrade >= passingScore ? 'PASSED' : 'FAILED',
    };
  });

  const quarterAverages = Object.fromEntries(
    QUARTERS.map((q) => [q, avg(subjects.map((s) => s.quarters[q]?.score).filter((x): x is number => x !== undefined))])
  ) as Record<number, number | null>;

  const finals = subjects.map((s) => s.finalGrade).filter((x): x is number => x !== null);
  const generalAverage = finals.length === subjects.length && finals.length > 0 ? avg(finals) : null;

  return { subjects, quarterAverages, generalAverage, passingScore };
}

function sectionSummary(e: NonNullable<Awaited<ReturnType<typeof getCurrentEnrollment>>>) {
  return {
    id: e.section.id,
    name: e.section.name,
    gradeLevel: e.section.gradeLevel.name,
    strand: e.section.strand?.code ?? null,
    schoolYear: e.section.schoolYear.label,
    adviser: e.section.adviser ? fullName(e.section.adviser) : null,
  };
}

/** GET /api/student/dashboard */
export async function getDashboard(req: Request, res: Response) {
  const student = await requireStudent(req);
  const enrollment = await getCurrentEnrollment(student.id);

  const announcementsWhere = {
    OR: [
      { audience: 'ALL' as const },
      { audience: 'STUDENTS' as const },
      ...(enrollment
        ? [
            { audience: 'SECTION' as const, targetId: enrollment.sectionId },
            { audience: 'GRADE_LEVEL' as const, targetId: enrollment.section.gradeLevelId },
          ]
        : []),
    ],
  };
  const [announcements, unread] = await Promise.all([
    prisma.announcement.findMany({
      where: announcementsWhere,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 3,
      select: { id: true, title: true, body: true, createdAt: true, isPinned: true },
    }),
    prisma.announcement.count({ where: { ...announcementsWhere, reads: { none: { studentId: student.id } } } }),
  ]);

  const base = {
    student: {
      firstName: student.firstName,
      name: fullName(student),
      lrn: student.lrn,
      photoUrl: student.photoUrl,
      idReady: !!(student.photoUrl && student.signatureUrl),
    },
    announcements,
    unreadAnnouncements: unread,
  };

  if (!enrollment) return res.json({ ...base, section: null, report: null });

  const report = await buildGradeReport(enrollment.id, enrollment.sectionId);
  const latestQuarter = [...QUARTERS].reverse().find((q) => report.quarterAverages[q] !== null) ?? null;
  res.json({
    ...base,
    section: sectionSummary(enrollment),
    report: {
      subjectCount: report.subjects.length,
      quarterAverages: report.quarterAverages,
      latestQuarter,
      latestAverage: latestQuarter ? report.quarterAverages[latestQuarter] : null,
      generalAverage: report.generalAverage,
      passingScore: report.passingScore,
      atRisk: report.subjects.filter((s) => s.runningAverage !== null && s.runningAverage < report.passingScore).map((s) => s.code),
    },
  });
}

/** GET /api/student/grades */
export async function getGrades(req: Request, res: Response) {
  const student = await requireStudent(req);
  const enrollment = await getCurrentEnrollment(student.id);
  if (!enrollment) return res.json({ section: null, subjects: [], quarterAverages: {}, generalAverage: null, passingScore: await getPassingScore() });
  const report = await buildGradeReport(enrollment.id, enrollment.sectionId);
  res.json({ section: sectionSummary(enrollment), ...report });
}

/** GET /api/student/subjects */
export async function getSubjects(req: Request, res: Response) {
  const student = await requireStudent(req);
  const enrollment = await getCurrentEnrollment(student.id);
  if (!enrollment) return res.json({ section: null, subjects: [] });

  const classes = await prisma.sectionSubject.findMany({
    where: { sectionId: enrollment.sectionId },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true, department: true, photoUrl: true } },
    },
    orderBy: { subject: { code: 'asc' } },
  });
  res.json({
    section: sectionSummary(enrollment),
    subjects: classes.map((c) => ({
      id: c.subject.id,
      code: c.subject.code,
      title: c.subject.title,
      category: c.subject.category,
      semester: c.subject.semester,
      units: c.subject.units,
      teacher: { name: `${c.teacher.firstName} ${c.teacher.lastName}`, department: c.teacher.department },
    })),
  });
}

/** GET /api/student/report-card — Form 138 data */
export async function getReportCard(req: Request, res: Response) {
  const student = await requireStudent(req);
  const enrollment = await getCurrentEnrollment(student.id);
  if (!enrollment) throw new HttpError(404, 'You are not enrolled in a section yet');

  const [report, schoolName, schoolAddress] = await Promise.all([
    buildGradeReport(enrollment.id, enrollment.sectionId),
    prisma.setting.findUnique({ where: { key: 'school_name' } }),
    prisma.setting.findUnique({ where: { key: 'school_address' } }),
  ]);

  res.json({
    school: {
      name: schoolName?.value ?? 'Lyceum of Alcala',
      address: schoolAddress?.value ?? 'Alcala, Pangasinan',
    },
    student: {
      name: `${student.lastName}, ${student.firstName}${student.middleName ? ' ' + student.middleName : ''}${student.suffix ? ' ' + student.suffix : ''}`,
      lrn: student.lrn,
      sex: student.sex,
      birthdate: student.birthdate,
    },
    section: sectionSummary(enrollment),
    ...report,
    complete: report.subjects.every((s) => s.finalGrade !== null),
    generatedAt: new Date().toISOString(),
  });
}

/** GET /api/student/profile */
export async function getProfile(req: Request, res: Response) {
  const student = await requireStudent(req);
  const enrollment = await getCurrentEnrollment(student.id);
  const { userId, ...profile } = student;
  res.json({ student: profile, section: enrollment ? sectionSummary(enrollment) : null });
}

function removeUpload(url: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  const file = path.join(__dirname, '../../uploads', path.basename(url));
  fs.promises.unlink(file).catch(() => undefined);
}

/** POST /api/student/upload-id — multipart photo and/or signature */
export async function uploadIdDocuments(req: Request, res: Response) {
  const student = await requireStudent(req);
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  if (!files.photo?.[0] && !files.signature?.[0]) throw new HttpError(400, 'Choose a photo or signature to upload');

  const data: { photoUrl?: string; signatureUrl?: string } = {};
  if (files.photo?.[0]) {
    data.photoUrl = `/uploads/${files.photo[0].filename}`;
    removeUpload(student.photoUrl);
  }
  if (files.signature?.[0]) {
    data.signatureUrl = `/uploads/${files.signature[0].filename}`;
    removeUpload(student.signatureUrl);
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data,
    select: { id: true, photoUrl: true, signatureUrl: true },
  });
  logger.info(`ID documents uploaded for student ${student.id}`);
  res.json({ message: 'Upload saved', student: updated });
}
