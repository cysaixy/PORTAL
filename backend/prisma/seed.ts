import { PrismaClient, Role, SubjectCategory, AnnouncementAudience } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data in correct order (respect foreign keys)
  await prisma.auditLog.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.sectionSubject.deleteMany();
  await prisma.studentSection.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.strand.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // ============================================================================
  // 1. Create Users (Admin, Teachers, Students)
  // ============================================================================

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@loa.edu.ph',
      firebaseUid: 'firebase-admin-uid-001',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const teacherUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'jdela.cruz@loa.edu.ph',
        firebaseUid: 'firebase-teacher-uid-001',
        role: Role.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'msantos@loa.edu.ph',
        firebaseUid: 'firebase-teacher-uid-002',
        role: Role.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'preyes@loa.edu.ph',
        firebaseUid: 'firebase-teacher-uid-003',
        role: Role.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'rgarcia@loa.edu.ph',
        firebaseUid: 'firebase-teacher-uid-004',
        role: Role.TEACHER,
      },
    }),
  ]);

  const studentUsers = await Promise.all(
    Array.from({ length: 30 }, (_, i) => 
      prisma.user.create({
        data: {
          email: `student${String(i + 1).padStart(3, '0')}@loa.edu.ph`,
          firebaseUid: `firebase-student-uid-${String(i + 1).padStart(3, '0')}`,
          role: Role.STUDENT,
        },
      })
    )
  );

  console.log(`✅ Created ${1 + teacherUsers.length + studentUsers.length} users`);

  // ============================================================================
  // 2. Create Teacher Profiles
  // ============================================================================

  const teachers = await Promise.all([
    prisma.teacher.create({
      data: {
        userId: teacherUsers[0].id,
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        department: 'Mathematics',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teacherUsers[1].id,
        firstName: 'Maria',
        lastName: 'Santos',
        department: 'English',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teacherUsers[2].id,
        firstName: 'Pedro',
        lastName: 'Reyes',
        department: 'Science',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teacherUsers[3].id,
        firstName: 'Rosa',
        lastName: 'Garcia',
        department: 'Filipino',
      },
    }),
  ]);

  console.log(`✅ Created ${teachers.length} teachers`);

  // ============================================================================
  // 3. Create Student Profiles
  // ============================================================================

  const filipinoFirstNames = [
    'Jose', 'Maria', 'Juan', 'Ana', 'Pedro', 'Sofia', 'Miguel', 'Isabel',
    'Carlos', 'Luz', 'Ramon', 'Teresa', 'Antonio', 'Elena', 'Luis',
    'Carmen', 'Diego', 'Rosa', 'Gabriel', 'Lourdes', 'Rafael', 'Dolores',
    'Fernando', 'Cristina', 'Manuel', 'Patricia', 'Ricardo', 'Angela',
    'Roberto', 'Veronica'
  ];

  const filipinoLastNames = [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres',
    'Gonzales', 'Lopez', 'Ramos', 'Flores', 'Rivera', 'Gomez', 'Fernandez'
  ];

  const students = await Promise.all(
    studentUsers.map((user, i) =>
      prisma.student.create({
        data: {
          userId: user.id,
          lrn: `1${String(2024000000 + i).padStart(11, '0')}`,
          firstName: filipinoFirstNames[i % filipinoFirstNames.length],
          lastName: filipinoLastNames[i % filipinoLastNames.length],
          birthdate: new Date(2008 + Math.floor(i / 5), (i % 12), 1 + (i % 28)),
          sex: i % 2 === 0 ? 'M' : 'F',
          guardianName: `Guardian of ${filipinoFirstNames[i % filipinoFirstNames.length]}`,
          guardianContact: `+639${String(100000000 + i).padStart(9, '0')}`,
          guardianEmail: `guardian${String(i + 1).padStart(3, '0')}@example.com`,
          address: `${i + 1} Rizal Street, Alcala, Pangasinan`,
        },
      })
    )
  );

  console.log(`✅ Created ${students.length} students`);

  // ============================================================================
  // 4. Create School Year
  // ============================================================================

  const schoolYear = await prisma.schoolYear.create({
    data: {
      label: '2024-2025',
      startDate: new Date('2024-06-03'),
      endDate: new Date('2025-03-28'),
      isCurrent: true,
    },
  });

  console.log('✅ Created school year 2024-2025');

  // ============================================================================
  // 5. Create Grade Levels
  // ============================================================================

  const gradeLevels = await Promise.all([
    prisma.gradeLevel.create({ data: { number: 7, name: 'Grade 7', isSeniorHigh: false } }),
    prisma.gradeLevel.create({ data: { number: 8, name: 'Grade 8', isSeniorHigh: false } }),
    prisma.gradeLevel.create({ data: { number: 9, name: 'Grade 9', isSeniorHigh: false } }),
    prisma.gradeLevel.create({ data: { number: 10, name: 'Grade 10', isSeniorHigh: false } }),
    prisma.gradeLevel.create({ data: { number: 11, name: 'Grade 11', isSeniorHigh: true } }),
    prisma.gradeLevel.create({ data: { number: 12, name: 'Grade 12', isSeniorHigh: true } }),
  ]);

  console.log('✅ Created grade levels 7-12');

  // ============================================================================
  // 6. Create Strands (Senior High only)
  // ============================================================================

  const strands = await Promise.all([
    prisma.strand.create({
      data: {
        code: 'STEM',
        name: 'Science, Technology, Engineering and Mathematics',
        description: 'For students interested in engineering, medicine, and sciences',
      },
    }),
    prisma.strand.create({
      data: {
        code: 'ABM',
        name: 'Accountancy, Business and Management',
        description: 'For students interested in business and finance',
      },
    }),
    prisma.strand.create({
      data: {
        code: 'HUMSS',
        name: 'Humanities and Social Sciences',
        description: 'For students interested in journalism, law, and social work',
      },
    }),
  ]);

  console.log('✅ Created 3 senior high strands');

  // ============================================================================
  // 7. Create Sections
  // ============================================================================

  const sections = await Promise.all([
    // Junior High (Grades 7-10) - no strand
    prisma.section.create({
      data: {
        name: '7-Einstein',
        gradeLevelId: gradeLevels[0].id,
        adviserId: teachers[0].id,
        schoolYearId: schoolYear.id,
        capacity: 40,
      },
    }),
    prisma.section.create({
      data: {
        name: '8-Newton',
        gradeLevelId: gradeLevels[1].id,
        adviserId: teachers[1].id,
        schoolYearId: schoolYear.id,
        capacity: 40,
      },
    }),
    // Senior High (Grades 11-12) - with strands
    prisma.section.create({
      data: {
        name: '11-STEM-A',
        gradeLevelId: gradeLevels[4].id,
        strandId: strands[0].id,
        adviserId: teachers[2].id,
        schoolYearId: schoolYear.id,
        capacity: 40,
      },
    }),
    prisma.section.create({
      data: {
        name: '12-ABM-A',
        gradeLevelId: gradeLevels[5].id,
        strandId: strands[1].id,
        adviserId: teachers[3].id,
        schoolYearId: schoolYear.id,
        capacity: 40,
      },
    }),
  ]);

  console.log(`✅ Created ${sections.length} sections`);

  // ============================================================================
  // 8. Create Subjects
  // ============================================================================

  const subjects = await Promise.all([
    // Grade 7 subjects
    prisma.subject.create({
      data: {
        code: 'ENG7',
        title: 'English 7',
        gradeLevelId: gradeLevels[0].id,
        category: SubjectCategory.CORE,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'MATH7',
        title: 'Mathematics 7',
        gradeLevelId: gradeLevels[0].id,
        category: SubjectCategory.CORE,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'SCI7',
        title: 'Science 7',
        gradeLevelId: gradeLevels[0].id,
        category: SubjectCategory.CORE,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'FIL7',
        title: 'Filipino 7',
        gradeLevelId: gradeLevels[0].id,
        category: SubjectCategory.CORE,
      },
    }),
    // Grade 8 subjects
    prisma.subject.create({
      data: {
        code: 'ENG8',
        title: 'English 8',
        gradeLevelId: gradeLevels[1].id,
        category: SubjectCategory.CORE,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'MATH8',
        title: 'Mathematics 8',
        gradeLevelId: gradeLevels[1].id,
        category: SubjectCategory.CORE,
      },
    }),
    // Grade 11 STEM subjects (Semester 1)
    prisma.subject.create({
      data: {
        code: 'GEN-MATH',
        title: 'General Mathematics',
        gradeLevelId: gradeLevels[4].id,
        strandId: strands[0].id,
        semester: 1,
        category: SubjectCategory.CORE,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'BASIC-CALC',
        title: 'Basic Calculus',
        gradeLevelId: gradeLevels[4].id,
        strandId: strands[0].id,
        semester: 1,
        category: SubjectCategory.SPECIALIZED,
      },
    }),
    // Grade 12 ABM subjects (Semester 1)
    prisma.subject.create({
      data: {
        code: 'BUS-MATH',
        title: 'Business Mathematics',
        gradeLevelId: gradeLevels[5].id,
        strandId: strands[1].id,
        semester: 1,
        category: SubjectCategory.SPECIALIZED,
      },
    }),
    prisma.subject.create({
      data: {
        code: 'ACCT-1',
        title: 'Fundamentals of Accountancy 1',
        gradeLevelId: gradeLevels[5].id,
        strandId: strands[1].id,
        semester: 1,
        category: SubjectCategory.SPECIALIZED,
      },
    }),
  ]);

  console.log(`✅ Created ${subjects.length} subjects`);

  // ============================================================================
  // 9. Assign Subjects to Sections (with Teachers)
  // ============================================================================

  const sectionSubjects = await Promise.all([
    // 7-Einstein subjects
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[0].id,
        subjectId: subjects[0].id, // ENG7
        teacherId: teachers[1].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[0].id,
        subjectId: subjects[1].id, // MATH7
        teacherId: teachers[0].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[0].id,
        subjectId: subjects[2].id, // SCI7
        teacherId: teachers[2].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[0].id,
        subjectId: subjects[3].id, // FIL7
        teacherId: teachers[3].id,
      },
    }),
    // 8-Newton subjects
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[1].id,
        subjectId: subjects[4].id, // ENG8
        teacherId: teachers[1].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[1].id,
        subjectId: subjects[5].id, // MATH8
        teacherId: teachers[0].id,
      },
    }),
    // 11-STEM-A subjects
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[2].id,
        subjectId: subjects[6].id, // GEN-MATH
        teacherId: teachers[0].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[2].id,
        subjectId: subjects[7].id, // BASIC-CALC
        teacherId: teachers[0].id,
      },
    }),
    // 12-ABM-A subjects
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[3].id,
        subjectId: subjects[8].id, // BUS-MATH
        teacherId: teachers[0].id,
      },
    }),
    prisma.sectionSubject.create({
      data: {
        sectionId: sections[3].id,
        subjectId: subjects[9].id, // ACCT-1
        teacherId: teachers[0].id,
      },
    }),
  ]);

  console.log(`✅ Assigned ${sectionSubjects.length} subjects to sections`);

  // ============================================================================
  // 10. Enroll Students
  // ============================================================================

  const studentEnrollments = [];
  
  // Enroll first 10 students in 7-Einstein
  for (let i = 0; i < 10; i++) {
    studentEnrollments.push(
      prisma.studentSection.create({
        data: {
          studentId: students[i].id,
          sectionId: sections[0].id,
        },
      })
    );
  }

  // Enroll next 10 students in 8-Newton
  for (let i = 10; i < 20; i++) {
    studentEnrollments.push(
      prisma.studentSection.create({
        data: {
          studentId: students[i].id,
          sectionId: sections[1].id,
        },
      })
    );
  }

  // Enroll next 5 students in 11-STEM-A
  for (let i = 20; i < 25; i++) {
    studentEnrollments.push(
      prisma.studentSection.create({
        data: {
          studentId: students[i].id,
          sectionId: sections[2].id,
        },
      })
    );
  }

  // Enroll last 5 students in 12-ABM-A
  for (let i = 25; i < 30; i++) {
    studentEnrollments.push(
      prisma.studentSection.create({
        data: {
          studentId: students[i].id,
          sectionId: sections[3].id,
        },
      })
    );
  }

  const enrollments = await Promise.all(studentEnrollments);
  console.log(`✅ Enrolled ${enrollments.length} students`);

  // ============================================================================
  // 11. Create Sample Grades (Quarter 1 only)
  // ============================================================================

  const grades = [];

  // Generate grades for enrolled students
  for (const enrollment of enrollments) {
    const sectionId = enrollment.sectionId;
    const relevantSubjects = sectionSubjects.filter(ss => ss.sectionId === sectionId);

    for (const sectionSubject of relevantSubjects) {
      // Random grade between 75 and 98
      const score = Math.floor(Math.random() * 24) + 75;
      
      grades.push(
        prisma.grade.create({
          data: {
            studentSectionId: enrollment.id,
            sectionSubjectId: sectionSubject.id,
            quarter: 1,
            score: score,
            remarks: score >= 75 ? 'PASSED' : 'FAILED',
            locked: false, // Not locked yet for demo purposes
          },
        })
      );
    }
  }

  const createdGrades = await Promise.all(grades);
  console.log(`✅ Created ${createdGrades.length} sample grades (Quarter 1)`);

  // ============================================================================
  // 12. Create Sample Announcements
  // ============================================================================

  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        authorId: adminUser.id,
        title: 'Welcome to School Year 2024-2025',
        body: 'We are excited to start a new school year. Please check your schedules and attend the orientation on June 5, 2024.',
        audience: AnnouncementAudience.ALL,
        isPinned: true,
      },
    }),
    prisma.announcement.create({
      data: {
        authorId: teachers[0].id,
        title: 'Quarter 1 Grading Deadline',
        body: 'All teachers must submit and lock Quarter 1 grades by September 30, 2024.',
        audience: AnnouncementAudience.TEACHERS,
      },
    }),
    prisma.announcement.create({
      data: {
        authorId: teachers[1].id,
        title: 'English Department Meeting',
        body: 'All English teachers are invited to the department meeting on Friday, 3 PM at the faculty room.',
        audience: AnnouncementAudience.TEACHERS,
      },
    }),
  ]);

  console.log(`✅ Created ${announcements.length} announcements`);

  // ============================================================================
  // 13. Create Sample Audit Log
  // ============================================================================

  await prisma.auditLog.create({
    data: {
      userId: teachers[0].id,
      action: 'CREATE',
      entity: 'Grade',
      entityId: createdGrades[0].id,
      after: { quarter: 1, score: 88 },
      ipAddress: '192.168.1.100',
    },
  });

  console.log('✅ Created sample audit log entry');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:    admin@loa.edu.ph');
  console.log('Teacher:  jdela.cruz@loa.edu.ph');
  console.log('Teacher:  msantos@loa.edu.ph');
  console.log('Student:  student001@loa.edu.ph');
  console.log('Student:  student002@loa.edu.ph');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nData Summary:');
  console.log(`- ${students.length} students across 4 sections`);
  console.log(`- ${teachers.length} teachers`);
  console.log(`- ${subjects.length} subjects`);
  console.log(`- ${createdGrades.length} grades (Quarter 1)`);
  console.log(`- School Year: ${schoolYear.label}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
