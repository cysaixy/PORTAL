# LOA Portal

**Unofficial student project** for Lyceum of Alcala high school portal system.

## Overview

A role-based portal for students (view grades), teachers (encode grades), and admins (manage school year). Built with PERN stack + Firebase Auth during sem break.

## Tech Stack

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Backend:** Node.js + Express + TypeScript
- **Auth:** Firebase Authentication (Google OAuth)
- **Validation:** Zod
- **Frontend:** React + Vite + TypeScript
- **Routing:** React Router
- **Data Fetching:** TanStack Query
- **Styling:** Tailwind CSS
- **PDF:** Puppeteer (Form 138 report cards)

## Project Structure

```
loa-portal/
├── backend/          # Express API server
│   ├── prisma/       # Schema, migrations, seed
│   └── src/
│       ├── routes/   # auth, admin, teacher, student
│       ├── controllers/
│       ├── middleware/  # requireAuth, requireRole, validate
│       └── services/    # grades, reports, audit
└── frontend/         # React + Vite
    └── src/
        ├── pages/    # admin, teacher, student
        ├── components/
        └── hooks/
```

## Features (v1 MVP)

### Student
- View enrolled subjects and quarterly grades
- View final grade and remarks
- Read announcements
- Print report card (Form 138 style)

### Teacher / Adviser
- View assigned sections
- Encode grades per quarter
- Lock grades after submission
- Post announcements
- Advisers see their advisory class

### Admin / Registrar
- Manage school years, grade levels, sections
- Manage subjects, students, teachers
- Assign teachers to sections
- Unlock grades (logged)
- View audit log

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Firebase project with Google OAuth enabled

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and Firebase credentials
npm run db:migrate   # creates the schema AND loads the sample school (SY 2026-2027)
npm run dev
```

The sample data lives in the migration `prisma/migrations/20261113180000_seed_school_data`
(10 sections, 16 teachers, 202 students, Q1 grades locked, Q2 in progress). It is idempotent
and merges with existing rows. `npm run db:reset` rebuilds the database from migrations.
The old `prisma/seed.ts` is no longer run automatically — it wipes all data.

**Developer sign-in:** with `DEV_BYPASS_AUTH=true` (backend) and `VITE_DEV_MODE=true` (frontend)
the login page lists sample accounts, e.g. `registrar@loa.edu.ph`, `grace.dizon@loa.edu.ph`
(teacher/adviser), `stu0001@loa.edu.ph` (student). Google sign-in works for any email on the
access list; the first sign-in links the Google account automatically.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Firebase config
npm run dev
```

## Security Notes

⚠️ **This is a student project using fake data.**

- Do not use real student records without school approval
- Do not use official school logo without permission
- Complies with Data Privacy Act of 2012 requirements
- All grade changes are audit-logged
- Role-based access control on all routes
- Grades are locked after submission (admin unlock only)

## Open Decisions

Before starting development, confirm:

1. **Strands:** Which senior high strands does LOA offer? (STEM, ABM, HUMSS, GAS, TVL, others?)
2. **Grading:** Store final quarterly grades directly, or implement initial → transmuted conversion?
3. **Audience:** Portfolio project only, or pitch to school administration later?

## License

Educational project - not for commercial use.
