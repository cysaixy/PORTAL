import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Quick script to add teachers and students
 * Just edit the arrays below and run: npx tsx backend/quick-add-users.ts
 */

const TEACHERS = [
  {
    email: 'teacher1@loa.edu.ph',
    firstName: 'Anna',
    lastName: 'Rodriguez',
    department: 'Mathematics',
  },
  {
    email: 'teacher2@loa.edu.ph',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    department: 'Science',
  },
  // Add more teachers here...
];

const STUDENTS = [
  {
    email: 'student101@loa.edu.ph',
    lrn: '120240000101',
    firstName: 'John',
    lastName: 'Dela Cruz',
    birthdate: '2009-05-15',
    sex: 'M' as const,
    guardianName: 'Maria Dela Cruz',
    guardianContact: '+639171234567',
    guardianEmail: 'maria.delacruz@example.com',
    address: '123 Main St, Alcala, Pangasinan',
  },
  {
    email: 'student102@loa.edu.ph',
    lrn: '120240000102',
    firstName: 'Maria',
    lastName: 'Santos',
    birthdate: '2009-08-20',
    sex: 'F' as const,
    guardianName: 'Pedro Santos',
    guardianContact: '+639187654321',
    guardianEmail: 'pedro.santos@example.com',
    address: '456 Rizal Ave, Alcala, Pangasinan',
  },
  // Add more students here...
];

async function main() {
  console.log('🚀 Quick Add Users\n');

  let teacherCount = 0;
  let studentCount = 0;

  // Add Teachers
  for (const teacher of TEACHERS) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: teacher.email },
      });

      if (existing) {
        console.log(`⏭️  Teacher ${teacher.email} already exists, skipping...`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          email: teacher.email,
          firebaseUid: `quick-teacher-${Date.now()}-${teacherCount}`,
          role: Role.TEACHER,
          isActive: true,
        },
      });

      await prisma.teacher.create({
        data: {
          userId: user.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          department: teacher.department,
        },
      });

      console.log(`✅ Added teacher: ${teacher.firstName} ${teacher.lastName} (${teacher.email})`);
      teacherCount++;
    } catch (error: any) {
      console.error(`❌ Failed to add teacher ${teacher.email}:`, error.message);
    }
  }

  // Add Students
  for (const student of STUDENTS) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: student.email },
      });

      if (existing) {
        console.log(`⏭️  Student ${student.email} already exists, skipping...`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          email: student.email,
          firebaseUid: `quick-student-${Date.now()}-${studentCount}`,
          role: Role.STUDENT,
          isActive: true,
        },
      });

      await prisma.student.create({
        data: {
          userId: user.id,
          lrn: student.lrn,
          firstName: student.firstName,
          lastName: student.lastName,
          birthdate: new Date(student.birthdate),
          sex: student.sex,
          guardianName: student.guardianName,
          guardianContact: student.guardianContact,
          guardianEmail: student.guardianEmail,
          address: student.address,
        },
      });

      console.log(`✅ Added student: ${student.firstName} ${student.lastName} (${student.email})`);
      studentCount++;
    } catch (error: any) {
      console.error(`❌ Failed to add student ${student.email}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`   Teachers added: ${teacherCount}/${TEACHERS.length}`);
  console.log(`   Students added: ${studentCount}/${STUDENTS.length}`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
