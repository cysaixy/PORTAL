# LOA Portal - Quick Start

Get up and running in 10 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Firebase project (for Google OAuth)

## 1. Clone & Install (2 min)

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 2. Firebase Setup (3 min)

1. Create Firebase project at https://console.firebase.google.com/
2. Enable Google Authentication (Authentication → Sign-in method)
3. Create a Web app, copy the config
4. Go to Project Settings → Service accounts → Generate new private key

## 3. Database Setup (2 min)

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE loa_portal;"
```

## 4. Configure Backend (2 min)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/loa_portal?schema=public"

PORT=3001
NODE_ENV=development

# From Firebase service account JSON
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-long-random-secret-here

FRONTEND_URL=http://localhost:5173
```

## 5. Configure Frontend (1 min)

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# From Firebase web app config
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

VITE_API_URL=http://localhost:3001/api
```

## 6. Initialize Database (1 min)

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with fake data
npm run prisma:seed
```

## 7. Run the App (1 min)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 8. Test Login

1. Open http://localhost:5173
2. Note the test accounts from the seed output
3. Add your own Google email to the allowlist:

```bash
# Open Prisma Studio
cd backend
npm run prisma:studio
```

In Prisma Studio:
- Go to `User` model
- Add record with your email, choose a role, set `isActive: true`
- Leave `firebaseUid` blank (will be filled on first login)

4. Click "Sign in with Google" and select your account
5. You should see the dashboard for your role!

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env

**"Access denied" after login:**
- Add your Google email to the User table in Prisma Studio

**CORS errors:**
- Restart backend after changing .env
- Verify FRONTEND_URL matches frontend port

## Next Steps

Read the full docs:
- `SETUP.md` - Detailed setup instructions
- `PROJECT_STRUCTURE.md` - Architecture and code organization
- `README.md` - Project overview and features

Start building:
1. Implement student grade view API
2. Build teacher grade encoding UI
3. Add report card PDF generation

**Good luck! 🚀**
