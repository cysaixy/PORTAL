// Quick setup checker for LOA Portal backend
const fs = require('fs');
const path = require('path');

console.log('\n🔍 LOA Portal Backend Setup Checker\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('   Run: cp .env.example .env');
  console.log('   Then edit .env with your actual values\n');
  process.exit(1);
}

// Load .env
require('dotenv').config();

const checks = [
  { name: 'DATABASE_URL', value: process.env.DATABASE_URL, required: true },
  { name: 'FIREBASE_PROJECT_ID', value: process.env.FIREBASE_PROJECT_ID, required: true },
  { name: 'FIREBASE_PRIVATE_KEY', value: process.env.FIREBASE_PRIVATE_KEY, required: true },
  { name: 'FIREBASE_CLIENT_EMAIL', value: process.env.FIREBASE_CLIENT_EMAIL, required: true },
  { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET, required: true },
  { name: 'FRONTEND_URL', value: process.env.FRONTEND_URL, required: false },
];

let hasErrors = false;

checks.forEach(check => {
  const isEmpty = !check.value || check.value === '' || check.value.includes('your-') || check.value === 'generate-a-random-secret-here-min-32-chars';
  
  if (isEmpty && check.required) {
    console.log(`❌ ${check.name} is not set properly`);
    hasErrors = true;
  } else if (isEmpty) {
    console.log(`⚠️  ${check.name} is using default value`);
  } else {
    console.log(`✅ ${check.name} is set`);
  }
});

if (hasErrors) {
  console.log('\n❌ Setup incomplete. Please edit backend/.env with your actual values.');
  console.log('\nQuick Setup Guide:');
  console.log('1. Firebase: https://console.firebase.google.com/');
  console.log('2. PostgreSQL: Create database "loa_portal"');
  console.log('3. Generate SESSION_SECRET: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('\nSee SETUP.md for detailed instructions.\n');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set!');
console.log('\nNext steps:');
console.log('1. Run migrations: npm run prisma:migrate');
console.log('2. Seed database: npm run prisma:seed');
console.log('3. Start server: npm run dev\n');
