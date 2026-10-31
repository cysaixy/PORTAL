import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestUsers() {
  console.log('Adding test users...\n');

  // Test Admin
  const admin = await prisma.user.upsert({
    where: { email: 'testadmin@gmail.com' },
    update: {},
    create: {
      email: 'testadmin@gmail.com',
      firebaseUid: 'test-admin-uid',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Admin: testadmin@gmail.com');

  // Test Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'testteacher@gmail.com' },
    update: {},
    create: {
      email: 'testteacher@gmail.com',
      firebaseUid: 'test-teacher-uid',
      role: Role.TEACHER,
      isActive: true,
    },
  });

  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      firstName: 'Test',
      lastName: 'Teacher',
      department: 'Testing',
    },
  });
  console.log('✅ Teacher: testteacher@gmail.com');

  // Test Student
  const studentUser = await prisma.user.upsert({
    where: { email: 'teststudent@gmail.com' },
    update: {},
    create: {
      email: 'teststudent@gmail.com',
      firebaseUid: 'test-student-uid',
      role: Role.STUDENT,
      isActive: true,
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      lrn: '999999999999',
      firstName: 'Test',
      lastName: 'Student',
      birthdate: new Date('2008-01-15'),
      sex: 'M',
      guardianName: 'Test Guardian',
      guardianContact: '+639123456789',
      guardianEmail: 'guardian@test.com',
      address: 'Test Address, Alcala, Pangasinan',
    },
  });
  console.log('✅ Student: teststudent@gmail.com');

  console.log('\n🎉 Test users added successfully!');
  console.log('\nYou can use these emails to log in:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:    testadmin@gmail.com');
  console.log('Teacher:  testteacher@gmail.com');
  console.log('Student:  teststudent@gmail.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

addTestUsers()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
