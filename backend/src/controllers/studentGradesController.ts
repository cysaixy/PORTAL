import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * GET /api/student/grades
 * Get the student's grades across all subjects
 */
export async function getStudentGrades(req: Request, res: Response) {
  try {
    const studentId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                gradeLevel: true,
                schoolYear: true,
              },
            },
            grades: {
              include: {
                sectionSubject: {
                  include: {
                    subject: {
                      include: {
                        gradeLevel: true,
                      },
                    },
                    teacher: {
                      select: { firstName: true, lastName: true },
                    },
                  },
                },
              },
              orderBy: { quarter: 'asc' },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const enrollment = student.enrollments[0];
    if (!enrollment) {
      return res.json({ grades: [], subjects: [], quarterlyAverages: [], generalAverage: null });
    }

    // Group grades by subject
    const subjectGrades: Record<string, any> = {};

    enrollment.grades.forEach((g) => {
      const key = g.sectionSubject.subject.id;
      if (!subjectGrades[key]) {
        subjectGrades[key] = {
          subjectId: g.sectionSubject.subject.id,
          code: g.sectionSubject.subject.code,
          title: g.sectionSubject.subject.title,
          teacher: `${g.sectionSubject.teacher.firstName} ${g.sectionSubject.teacher.lastName}`,
          category: g.sectionSubject.subject.category,
          grades: { Q1: null, Q2: null, Q3: null, Q4: null },
          quarterlyAverage: null,
          finalGrade: null,
        };
      }

      const subjectEntry = subjectGrades[key];
      subjectEntry.grades[`Q${g.quarter}` as const] = {
        score: Number(g.score),
        remarks: g.remarks,
        locked: g.locked,
      };
    });

    // Compute quarterly averages and final grades
    const subjects = Object.values(subjectGrades).map((s) => {
      const scores = Object.values(s.grades)
        .filter((g): g is { score: number } => g !== null)
        .map((g) => g.score);

      const quarterlyAverage =
        scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
      const finalGrade =
        scores.length === 4
          ? (scores.reduce((a, b) => a + b, 0) / 4).toFixed(2)
          : null; // Final appears only after Q4

      return {
        ...s,
        quarterlyAverage,
        finalGrade,
        hasAllQuarters: scores.length === 4,
      };
    });

    // Compute general average (average of all subject finals)
    const finals = subjects.filter((s) => s.finalGrade !== null).map((s) => Number(s.finalGrade));
    const generalAverage =
      finals.length > 0 ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(2) : null;

    // Compute quarterly averages across all subjects
    const quarterlyAverages: Record<string, number | null> = {};
    for (let q = 1; q <= 4; q++) {
      const quarterScores = subjects.flatMap((s) =>
        s.grades[`Q${q}` as const] ? [Number(s.grades[`Q${q}` as const].score)] : []
      );
      quarterlyAverages[`Q${q}`] =
        quarterScores.length > 0
          ? (quarterScores.reduce((a, b) => a + b, 0) / quarterScores.length).toFixed(2)
          : null;
    }

    res.json({
      student: {
        id: student.id,
        lrn: student.lrn,
        name: `${student.firstName} ${student.lastName}`,
        section: enrollment.section.name,
        grade: enrollment.section.gradeLevel.name,
        schoolYear: enrollment.section.schoolYear.label,
      },
      subjects,
      quarterlyAverages,
      generalAverage,
    });
  } catch (error) {
    logger.error('Get student grades error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
}