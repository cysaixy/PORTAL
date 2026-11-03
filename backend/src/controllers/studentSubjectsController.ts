import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * GET /api/student/subjects
 * Get the student's enrolled subjects
 */
export async function getStudentSubjects(req: Request, res: Response) {
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
                    subject: true,
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
      return res.json({
        subjects: [],
        section: 'Not enrolled',
        grade: '-',
        schoolYear: '-',
      });
    }

    // Group section subjects by subject
    const subjectMap: Record<string, any> = {};

    enrollment.section.subjects.forEach((ss) => {
      subjectMap[ss.subject.id] = {
        code: ss.subject.code,
        title: ss.subject.title,
        category: ss.subject.category,
        gradeLevel: enrollment.section.gradeLevel.name,
        teacher: `${ss.teacher.firstName} ${ss.teacher.lastName}`,
        semester: ss.subject.semester,
      };
    });

    res.json({
      subjects: Object.values(subjectMap),
      section: enrollment.section.name,
      grade: enrollment.section.gradeLevel.name,
      schoolYear: enrollment.section.schoolYear.label,
    });
  } catch (error) {
    logger.error('Get student subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

/**
 * GET /api/student/adviser
 * Get the student's class adviser
 */
export async function getStudentAdviser(req: Request, res: Response) {
  try {
    const studentId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                adviser: true,
                gradeLevel: true,
                schoolYear: true,
              },
            },
          },
        },
      },
    });

    if (!student || !student.enrollments[0]) {
      return res.status(404).json({ error: 'No adviser found' });
    }

    const section = student.enrollments[0].section;

    res.json({
      adviser: section.adviser
        ? {
            id: section.adviser.id,
            name: `${section.adviser.firstName} ${section.adviser.lastName}`,
            department: section.adviser.department,
          }
        : null,
      section: section.name,
      grade: section.gradeLevel.name,
      schoolYear: section.schoolYear.label,
    });
  } catch (error) {
    logger.error('Get student adviser error:', error);
    res.status(500).json({ error: 'Failed to fetch adviser' });
  }
}