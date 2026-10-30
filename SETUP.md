# LOA Portal Setup Guide

Complete setup instructions for the Lyceum of Alcala Portal.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm ([download](https://nodejs.org/))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))
- **Firebase Project** with Google OAuth enabled

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it (e.g., "LOA Portal")
4. Follow the setup wizard

### 1.2 Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Add authorized domains:
   - `localhost` (for development)
   - Your production domain (when deploying)

### 1.3 Create Web App

1. In Project Settings, click "Add app" → Web (</> icon)
2. Register app (name: "LOA Portal Frontend")
3. Copy the Firebase config object (you'll need this for frontend `.env`)

### 1.4 Generate Service Account Key (for Backend)

1. In Project Settings → **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. You'll extract values from this file for backend `.env`

## Part 2: Database Setup

### 2.1 Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE loa_portal;

# Create user (optional but recommended)
CREATE USER loa_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE loa_portal TO loa_admin;

# Exit
\q
```

### 2.2 Get Database URL

Your database URL format:
```
postgresql://username:password@localhost:5432/loa_portal?schema=public
```

Example:
```
postgresql://loa_admin:your_secure_password@localhost:5432/loa_portal?schema=public
```

## Part 3: Backend Setup

### 3.1 Install Dependencies

```bash
cd backend
npm install
```

### 3.2 Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values
```

Edit `backend/.env`:

```env
# Database - use your PostgreSQL URL
DATABASE_URL="postgresql://loa_admin:your_password@localhost:5432/loa_portal?schema=public"

# Server
PORT=3001
NODE_ENV=development

# Firebase Admin SDK - from service account JSON file
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour actual private key from service account JSON\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Session - generate a random 32+ character string
SESSION_SECRET=generate_a_very_long_random_string_here_min_32_characters

# CORS
FRONTEND_URL=http://localhost:5173
```

**Important Notes:**
- `FIREBASE_PRIVATE_KEY`: Copy the entire `private_key` value from the service account JSON, including the `\n` newline characters
- `SESSION_SECRET`: Generate using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3.3 Run Migrations and Seed Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed fake data
npm run prisma:seed
```

You should see output with test accounts created.

### 3.4 Start Backend Server

```bash
npm run dev
```

Server should start on http://localhost:3001

## Part 4: Frontend Setup

### 4.1 Install Dependencies

Open a **new terminal** (keep backend running):

```bash
cd frontend
npm install
```

### 4.2 Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your Firebase config
```

Edit `frontend/.env`:

```env
# Firebase Configuration (from Firebase Console → Project Settings → Web App)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# API Configuration
VITE_API_URL=http://localhost:3001/api
```

### 4.3 Start Frontend Development Server

```bash
npm run dev
```

Frontend should start on http://localhost:5173

## Part 5: Testing the Application

### 5.1 Add Your Email to Allowlist

The seed script creates fake accounts. To log in with your own Google account:

```bash
# In backend directory, open Prisma Studio
npm run prisma:studio
```

1. Navigate to the `User` model
2. Click "Add record"
3. Fill in:
   - `email`: your Google email (e.g., `youremail@gmail.com`)
   - `firebaseUid`: leave blank for now, will be set on first login attempt
   - `role`: Choose `STUDENT`, `TEACHER`, or `ADMIN`
   - `isActive`: `true`
4. Save

**OR** use one of the seeded test accounts (see console output from seed script).

### 5.2 Login Flow

1. Open http://localhost:5173
2. Click "Sign in with Google"
3. Select your Google account
4. If you added your email to the allowlist, you'll be redirected to your role's dashboard
5. If not in allowlist, you'll see an "Access denied" message

### 5.3 Test Accounts (from seed)

The seed script creates these test accounts:

- **Admin**: `admin@loa.edu.ph`
- **Teachers**:
  - `jdela.cruz@loa.edu.ph` (Juan Dela Cruz - Mathematics)
  - `msantos@loa.edu.ph` (Maria Santos - English)
- **Students**: `student001@loa.edu.ph` through `student030@loa.edu.ph`

**Note**: These are database records only. To actually sign in:
1. You need a real Google account
2. Add that Google email to the User table
3. Firebase will authenticate, backend will check allowlist

## Part 6: Development Workflow

### Running the Application

You need **two terminal windows**:

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

### Database Management

```bash
# Open Prisma Studio (GUI for database)
cd backend
npm run prisma:studio

# Create a new migration after schema changes
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Part 7: Next Steps

Now that the base is set up, you can:

1. **Implement API endpoints** in `backend/src/routes/`
2. **Build UI pages** in `frontend/src/pages/`
3. **Add grade encoding logic**
4. **Implement report card generation**

Refer to the project structure in `README.md` for guidance.

## Troubleshooting

### Backend won't start

- Check PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
- Verify `DATABASE_URL` in `.env`
- Check Firebase credentials are correct

### Frontend shows CORS errors

- Verify `FRONTEND_URL` in backend `.env` matches frontend port
- Restart backend server after changing `.env`

### "Access denied" after Google sign-in

- Check if your email is in the `User` table
- Verify `isActive` is `true`
- Check browser console for detailed error

### Database connection error

- Verify PostgreSQL is running
- Check username, password, and database name in `DATABASE_URL`
- Ensure database `loa_portal` exists

### Firebase authentication error

- Verify all Firebase config values are correct
- Check if Google sign-in is enabled in Firebase Console
- Ensure `localhost` is in authorized domains

## Security Reminders

⚠️ **Before going to production:**

1. Change `SESSION_SECRET` to a strong random value
2. Use environment-specific Firebase projects (dev/prod)
3. Restrict Firebase authorized domains to your production URL only
4. Enable PostgreSQL SSL in production
5. Review and test all role-based access controls
6. Set up proper backup strategy for the database
7. Never commit `.env` files to version control

## Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Review this setup guide step-by-step
3. Check Firebase Console for auth issues
4. Use Prisma Studio to inspect database state
5. Verify all environment variables are set correctly

---

**Good luck building the LOA Portal! 🚀**
