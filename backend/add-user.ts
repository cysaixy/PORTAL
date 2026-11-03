import { PrismaClient, Role } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function addTeacher() {
  console.log('\n📚 Add New Teacher\n');
  
  const email = await question('Email: ');
  const firstName = await question('First Name: ');
  const lastName = await question('Last Name: ');
  const department = await question('Department (optional): ');

  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firebaseUid: `manual-teacher-${Date.now()}`,
        role: Role.TEACHER,
        isActive: true,
      },
    });

    // Create teacher profile
    await prisma.teacher.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        department: department || undefined,
      },
    });

    console.log('\n✅ Teacher added successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}\n`);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

async function addStudent() {
  console.log('\n🎓 Add New Student\n');
  
  const email = await question('Email: ');
  const lrn = await question('LRN (12 digits): ');
  const firstName = await question('First Name: ');
  const lastName = await question('Last Name: ');
  const birthdate = await question('Birthdate (YYYY-MM-DD): ');
  const sex = await question('Sex (M/F): ');
  const guardianName = await question('Guardian Name: ');
  const guardianContact = await question('Guardian Contact: ');
  const guardianEmail = await question('Guardian Email: ');
  const address = await question('Address: ');

  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firebaseUid: `manual-student-${Date.now()}`,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    // Create student profile
    await prisma.student.create({
      data: {
        userId: user.id,
        lrn,
        firstName,
        lastName,
        birthdate: new Date(birthdate),
        sex: sex.toUpperCase() as 'M' | 'F',
        guardianName,
        guardianContact,
        guardianEmail,
        address,
      },
    });

    console.log('\n✅ Student added successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   LRN: ${lrn}\n`);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    LOA Portal - Add User Utility');
  console.log('═══════════════════════════════════════════\n');
  console.log('1. Add Teacher');
  console.log('2. Add Student');
  console.log('3. Exit\n');

  const choice = await question('Choose an option (1-3): ');

  switch (choice.trim()) {
    case '1':
      await addTeacher();
      break;
    case '2':
      await addStudent();
      break;
    case '3':
      console.log('\nGoodbye! 👋\n');
      rl.close();
      await prisma.$disconnect();
      return;
    default:
      console.log('\n❌ Invalid option\n');
  }

  // Ask if they want to add another
  const again = await question('\nAdd another user? (y/n): ');
  if (again.toLowerCase() === 'y') {
    await main();
  } else {
    console.log('\nGoodbye! 👋\n');
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
