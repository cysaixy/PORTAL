import admin from 'firebase-admin';

// Initialize Firebase Admin SDK only if credentials are provided
let firebaseApp;
let auth: admin.auth.Auth;

try {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    !process.env.FIREBASE_PROJECT_ID.includes('your-')
  ) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    auth = admin.auth(firebaseApp);
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️  Firebase credentials not configured - running in dev bypass mode');
    // Create a mock auth object for development
    auth = {} as admin.auth.Auth;
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('⚠️  Running in dev bypass mode');
  auth = {} as admin.auth.Auth;
}

export { auth };
export default firebaseApp;
