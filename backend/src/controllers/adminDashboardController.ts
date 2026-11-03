import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * GET /api/admin/dashboard/stats
 * Get comprehensive dashboard statistics for admin
 */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get current school year
    const currentSchoolYear = await prisma.schoolYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentSchoolYear) {
      return res.status(404).json({ error: 'No current school year found' });
    }

    // Count students by grade level
    const studentsByGrade = await prisma.$queryRaw<
      Array<{ gradeLevelId: number; count: bigint }>
    >`
      SELECT ss."sectionId", COUNT(DISTINCT ss."studentId")::bigint as count
      FROM "StudentSection" ss
      INNER JOIN "Section" s ON ss."sectionId" = s.id
      WHERE s."schoolYearId" = ${currentSchoolYear.id}
      GROUP BY ss."sectionId"
    `;

    // Get grade level breakdown
    const gradeLevels = await prisma.gradeLevel.findMany({
      orderBy: { number: 'asc' },
    });

    const gradeCounts = await Promise.all(
      gradeLevels.map(async (gl) => {
        const count = await prisma.studentSection.count({
          where: {
            section: {
              gradeLevelId: gl.id,
              schoolYearId: currentSchoolYear.id,
            },
          },
        });
        return {
          grade: `G${gl.number}`,
          count: count,
          isSeniorHigh: gl.isSeniorHigh,
        };
      })
    );

    // Count total students
    const totalStudents = gradeCounts.reduce((sum, g) => sum + g.count, 0);
    const juniorHighCount = gradeCounts
      .filter((g) => !g.isSeniorHigh)
      .reduce((sum, g) => sum + g.count, 0);
    const seniorHighCount = gradeCounts
      .filter((g) => g.isSeniorHigh)
      .reduce((sum, g) => sum + g.count, 0);

    // Count teachers
    const totalTeachers = await prisma.teacher.count();
    const teachersWithLoad = await prisma.sectionSubject.groupBy({
      by: ['teacherId'],
      where: {
        section: {
          schoolYearId: currentSchoolYear.id,
        },
      },
    });
    const teachersTeaching = teachersWithLoad.length;
    const teachersWithoutLoad = totalTeachers - teachersTeaching;

    // Count sections
    const totalSections = await prisma.section.count({
      where: { schoolYearId: currentSchoolYear.id },
    });

    // Count subjects and subjects without teachers
    const totalSubjects = await prisma.subject.count();
    const subjectsWithTeachers = await prisma.sectionSubject.groupBy({
      by: ['subjectId'],
      where: {
        section: {
          schoolYearId: currentSchoolYear.id,
        },
      },
    });
    const subjectsWithoutTeacher = totalSubjects - subjectsWithTeachers.length;

    // Grade submission by grade level
    const submissionByGrade = await Promise.all(
      gradeLevels.map(async (gl) => {
        // Get all section subjects for this grade level
        const sectionSubjects = await prisma.sectionSubject.findMany({
          where: {
            section: {
              gradeLevelId: gl.id,
              schoolYearId: currentSchoolYear.id,
            },
          },
          include: {
            section: {
              include: {
                students: true,
              },
            },
          },
        });

        let totalGradeSlotsNeeded = 0;
        let totalGradesSubmitted = 0;

        for (const ss of sectionSubjects) {
          const studentCount = ss.section.students.length;
          // Assuming 4 quarters per year
          totalGradeSlotsNeeded += studentCount * 4;

          // Count actual grades submitted
          const gradesSubmitted = await prisma.grade.count({
            where: {
              sectionSubjectId: ss.id,
              studentSection: {
                section: {
                  gradeLevelId: gl.id,
                },
              },
            },
          });
          totalGradesSubmitted += gradesSubmitted;
        }

        return {
          grade: `G${gl.number}`,
          submitted: totalGradesSubmitted,
          total: totalGradeSlotsNeeded,
        };
      })
    );

    // Recent grade activity (last 10 audit logs related to grades)
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['GRADE_UPDATE', 'GRADE_LOCK', 'GRADE_UNLOCK'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          include: {
            teacher: true,
          },
        },
      },
    });

    const gradeActivity = recentActivity.map((log) => {
      const actorName = log.user.teacher
        ? `${log.user.teacher.firstName} ${log.user.teacher.lastName}`
        : log.user.email;

      let actionLabel: 'LOCK' | 'UPDATE' | 'UNLOCK' = 'UPDATE';
      if (log.action === 'GRADE_LOCK') actionLabel = 'LOCK';
      if (log.action === 'GRADE_UNLOCK') actionLabel = 'UNLOCK';

      const now = new Date();
      const createdAt = new Date(log.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let timeLabel: string;
      if (diffHours < 24) {
        timeLabel = createdAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      } else if (diffDays < 2) {
        timeLabel = 'Yesterday';
      } else {
        timeLabel = createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      return {
        id: log.id,
        actor: actorName,
        action: actionLabel,
        entity: log.entity || '',
        detail: `${log.action} on ${log.entityId}`,
        time: timeLabel,
      };
    });

    res.json({
      schoolYear: {
        id: currentSchoolYear.id,
        label: currentSchoolYear.label,
        isCurrent: currentSchoolYear.isCurrent,
      },
      students: {
        total: totalStudents,
        juniorHigh: juniorHighCount,
        seniorHigh: seniorHighCount,
        byGrade: gradeCounts,
      },
      teachers: {
        total: totalTeachers,
        teaching: teachersTeaching,
        withoutLoad: teachersWithoutLoad,
      },
      sections: {
        total: totalSections,
      },
      subjects: {
        total: totalSubjects,
        withoutTeacher: subjectsWithoutTeacher,
      },
      gradeSubmission: submissionByGrade,
      recentActivity: gradeActivity,
    });
  } catch (error) {
    logger.error('Error fetching admin dashboard stats:', error);
    next(error);
  }
};
