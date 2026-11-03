import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * GET /api/student/report-card
 * Generate Form 138 report card data
 */
export async function getReportCard(req: Request, res: Response) {
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
                adviser: true,
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
      return res.status(404).json({ error: 'Student not enrolled in any section' });
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
          category: g.sectionSubject.subject.category,
          grades: { Q1: null, Q2: null, Q3: null, Q4: null },
        };
      }

      const subjectEntry = subjectGrades[key];
      subjectEntry.grades[`Q${g.quarter}` as const] = Number(g.score);
    });

    // Compute final grades and subject averages
    const subjects = Object.values(subjectGrades).map((s) => {
      const scores = Object.values(s.grades)
        .filter((score): score is number => score !== null);

      const finalGrade =
        scores.length === 4
          ? (scores.reduce((a, b) => a + b, 0) / 4).toFixed(2)
          : null;

      return {
        code: s.code,
        title: s.title,
        category: s.category,
        Q1: s.grades.Q1 || '-',
        Q2: s.grades.Q2 || '-',
        Q3: s.grades.Q3 || '-',
        Q4: s.grades.Q4 || '-',
        finalGrade: finalGrade || '-',
      };
    });

    // Compute general average
    const finals = subjects
      .filter((s) => s.finalGrade !== '-')
      .map((s) => Number(s.finalGrade));
    const generalAverage =
      finals.length > 0
        ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(2)
        : null;

    const allQuartersComplete = subjects.every((s) =>
      s.Q1 !== '-' && s.Q2 !== '-' && s.Q3 !== '-' && s.Q4 !== '-'
    );

    res.json({
      school: {
        name: 'Lyceum of Alcala',
        address: 'Alcala, Pangasinan',
      },
      student: {
        name: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}${student.suffix ? ' ' + student.suffix : ''}`,
        lrn: student.lrn,
        grade: enrollment.section.gradeLevel.name,
        section: enrollment.section.name,
        schoolYear: enrollment.section.schoolYear.label,
        adviser: enrollment.section.adviser
          ? `${enrollment.section.adviser.firstName} ${enrollment.section.adviser.lastName}`
          : '-',
      },
      subjects,
      generalAverage: generalAverage || '-',
      allQuartersComplete,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get report card error:', error);
    res.status(500).json({ error: 'Failed to generate report card' });
  }
}