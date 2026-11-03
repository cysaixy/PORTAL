import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Get student dashboard data
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                gradeLevel: true,
                strand: true,
                schoolYear: true,
              },
            },
            grades: {
              include: {
                sectionSubject: {
                  include: {
                    subject: true,
                    teacher: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Calculate statistics
    const allGrades = student.enrollments.flatMap(e => e.grades);
    const quarters = [1, 2, 3, 4];
    const quarterAverages = quarters.map(q => {
      const quarterGrades = allGrades.filter(g => g.quarter === q);
      if (quarterGrades.length === 0) return null;
      const sum = quarterGrades.reduce((acc, g) => acc + Number(g.score), 0);
      return Number((sum / quarterGrades.length).toFixed(2));
    });

    // Overall average (only from quarters with grades)
    const validAverages = quarterAverages.filter(a => a !== null) as number[];
    const overallAverage = validAverages.length > 0
      ? Number((validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(2))
      : 0;

    // Count subjects
    const subjectIds = new Set(allGrades.map(g => g.sectionSubject.subjectId));
    const subjectCount = subjectIds.size;

    res.json({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        lrn: student.lrn,
      },
      enrollments: student.enrollments,
      statistics: {
        subjectCount,
        quarterAverages,
        overallAverage,
      },
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

/**
 * Get student grades
 */
export async function getGrades(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const enrollments = await prisma.studentSection.findMany({
      where: { studentId: student.id },
      include: {
        section: {
          include: {
            gradeLevel: true,
            strand: true,
            schoolYear: true,
          },
        },
        grades: {
          include: {
            sectionSubject: {
              include: {
                subject: true,
                teacher: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            quarter: 'asc',
          },
        },
      },
    });

    // Group grades by subject
    const gradesBySubject = enrollments.flatMap(enrollment => {
      const subjectMap = new Map();
      
      enrollment.grades.forEach(grade => {
        const subjectId = grade.sectionSubject.subject.id;
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subject: grade.sectionSubject.subject,
            teacher: grade.sectionSubject.teacher,
            quarters: {},
          });
        }
        subjectMap.get(subjectId).quarters[`q${grade.quarter}`] = {
          score: Number(grade.score),
          locked: grade.locked,
          remarks: grade.remarks,
        };
      });

      return Array.from(subjectMap.values());
    });

    res.json({ grades: gradesBySubject });
  } catch (error) {
    logger.error('Get grades error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
}

/**
 * Get student subjects
 */
export async function getSubjects(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const enrollments = await prisma.studentSection.findMany({
      where: { studentId: student.id },
      include: {
        section: {
          include: {
            subjects: {
              include: {
                subject: true,
                teacher: {
                  select: {
                    firstName: true,
                    lastName: true,
                    department: true,
                  },
                },
              },
            },
            gradeLevel: true,
            strand: true,
          },
        },
      },
    });

    const subjects = enrollments.flatMap(e => 
      e.section.subjects.map(ss => ({
        id: ss.subject.id,
        code: ss.subject.code,
        title: ss.subject.title,
        category: ss.subject.category,
        semester: ss.subject.semester,
        teacher: ss.teacher,
        section: e.section.name,
      }))
    );

    res.json({ subjects });
  } catch (error) {
    logger.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

/**
 * Get student profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        lrn: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        birthdate: true,
        sex: true,
        photoUrl: true,
        signatureUrl: true,
        guardianName: true,
        guardianContact: true,
        guardianEmail: true,
        address: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ student });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Upload photo and signature
 */
export async function uploadIdDocuments(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || (!files.photo && !files.signature)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const updateData: any = {};

    // Handle photo upload
    if (files.photo && files.photo[0]) {
      const photoPath = `/uploads/${files.photo[0].filename}`;
      updateData.photoUrl = photoPath;
      logger.info(`Photo uploaded for student ${student.id}: ${photoPath}`);
    }

    // Handle signature upload
    if (files.signature && files.signature[0]) {
      const signaturePath = `/uploads/${files.signature[0].filename}`;
      updateData.signatureUrl = signaturePath;
      logger.info(`Signature uploaded for student ${student.id}: ${signaturePath}`);
    }

    // Update student record
    const updatedStudent = await prisma.student.update({
      where: { userId: req.user.id },
      data: updateData,
      select: {
        id: true,
        photoUrl: true,
        signatureUrl: true,
      },
    });

    res.json({
      message: 'Files uploaded successfully',
      student: updatedStudent,
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
}
