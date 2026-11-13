import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp: admin.app.App | undefined;

function loadCredential(): admin.credential.Credential | null {
  const { FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;

  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const file = path.resolve(process.cwd(), FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(file)) {
      return admin.credential.cert(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
    console.warn(`⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not found: ${file}`);
  }

  if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL && !FIREBASE_PROJECT_ID.includes('your-')) {
    return admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: FIREBASE_CLIENT_EMAIL,
    });
  }
  return null;
}

try {
  const credential = loadCredential();
  if (credential) {
    firebaseApp = admin.initializeApp({ credential });
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️  Firebase credentials not configured - only DEV_BYPASS_AUTH logins will work');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

const notConfigured = {
  verifyIdToken: async () => {
    throw Object.assign(new Error('Firebase is not configured on the server'), { code: 'auth/not-configured' });
  },
} as unknown as admin.auth.Auth;

export const auth: admin.auth.Auth = firebaseApp ? admin.auth(firebaseApp) : notConfigured;
export default firebaseApp;
