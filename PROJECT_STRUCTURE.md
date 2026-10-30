# LOA Portal - Project Structure

## Overview

```
loa-portal/
├── backend/                 # Express API + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Fake data seeder
│   └── src/
│       ├── config/         # Database, Firebase, Logger
│       ├── middleware/     # Auth, validation, errors
│       ├── routes/         # API endpoints
│       ├── controllers/    # Route handlers
│       ├── services/       # Business logic (TODO)
│       └── index.ts        # Express app entry
├── frontend/                # React + Vite app
│   ├── src/
│   │   ├── config/         # Firebase client config
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── lib/            # API client (axios)
│   │   ├── types/          # TypeScript types
│   │   ├── pages/          # Route pages
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   └── student/
│   │   ├── components/     # Reusable components
│   │   └── hooks/          # Custom hooks (TODO)
│   └── index.html
├── README.md               # Project overview
├── SETUP.md                # Detailed setup guide
└── PROJECT_STRUCTURE.md    # This file
```

## Backend Architecture

### Database Layer (Prisma)

**Location**: `backend/prisma/schema.prisma`

Core models:
- **Users & Auth**: `User`, `Student`, `Teacher` (with roles)
- **Academic Structure**: `SchoolYear`, `GradeLevel`, `Strand`, `Section`, `Subject`
- **Enrollment**: `StudentSection`, `SectionSubject`
- **Grading**: `Grade` (quarterly, lockable)
- **Communication**: `Announcement`, `AuditLog`

Key relationships:
- Students enroll in Sections via `StudentSection`
- Sections offer Subjects via `SectionSubject` (with assigned Teacher)
- Grades connect student enrollment + section subject + quarter
- Senior high (11-12): Sections have Strands, Subjects have semesters

### API Layer (Express)

**Entry point**: `backend/src/index.ts`

**Middleware stack**:
1. `helmet` - Security headers
2. `cors` - Cross-origin requests
3. `rateLimit` - DDoS protection
4. `express.json()` - Body parsing
5. `cookieParser` - Cookie support

**Route structure**:

```
/api/auth/*         # Authentication (verify, me, logout)
/api/student/*      # Student features (grades, subjects, report card)
/api/teacher/*      # Teacher features (sections, grade encoding, lock)
/api/admin/*        # Admin features (CRUD everything, unlock, audit)
```

**Auth flow**:
1. Frontend: User signs in with Google via Firebase
2. Frontend: Gets Firebase ID token
3. Frontend: Sends token to `POST /api/auth/verify`
4. Backend: Verifies token with Firebase Admin SDK
5. Backend: Checks if `firebaseUid` exists in `User` table (allowlist)
6. Backend: Returns user profile with role
7. Frontend: Stores user in AuthContext
8. Subsequent requests: Frontend includes `Authorization: Bearer <token>`
9. Backend middleware: `requireAuth` verifies token + loads user
10. Backend middleware: `requireRole` checks user role

### Middleware

**`requireAuth`** (`backend/src/middleware/auth.ts`)
- Extracts Bearer token from Authorization header
- Verifies with Firebase Admin SDK
- Loads user from database (allowlist check)
- Attaches `req.user` for downstream use
- Rejects if token invalid or user not found/inactive

**`requireRole(...roles)`**
- Must be used after `requireAuth`
- Checks if `req.user.role` is in allowed roles
- Returns 403 if insufficient permissions

**`validateBody/Query/Params(schema)`** (`backend/src/middleware/validate.ts`)
- Validates request data against Zod schemas
- Returns 400 with detailed errors if validation fails

**`errorHandler`** (`backend/src/middleware/errorHandler.ts`)
- Catches all errors
- Handles Prisma errors (unique constraint, not found, etc.)
- Logs to Winston
- Returns appropriate HTTP status

## Frontend Architecture

### Authentication Flow

**Context**: `frontend/src/contexts/AuthContext.tsx`

Provides:
- `user`: User object from backend (with role + profile)
- `firebaseUser`: Firebase auth user
- `loading`: Auth state loading
- `signInWithGoogle()`: Trigger Google OAuth popup
- `signOut()`: Clear session

**Firebase setup**: `frontend/src/config/firebase.ts`
- Initializes Firebase client SDK
- Exports `auth` and `googleProvider`

**API client**: `frontend/src/lib/api.ts`
- Axios instance with interceptors
- Automatically attaches Firebase ID token to all requests
- Redirects to login on 401 responses

### Routing

**App**: `frontend/src/App.tsx`

Routes:
- `/login` - Public login page
- `/` - Redirects to role-specific dashboard
- `/student/*` - Student pages (protected, STUDENT role)
- `/teacher/*` - Teacher pages (protected, TEACHER role)
- `/admin/*` - Admin pages (protected, ADMIN role)

**ProtectedRoute** component:
- Shows loading spinner while auth state loads
- Redirects to `/login` if not authenticated
- Checks role if `allowedRoles` provided
- Renders children if authorized

### Pages Structure

Each role has a dashboard:

**Student** (`frontend/src/pages/student/Dashboard.tsx`)
- View enrolled subjects
- View quarterly grades
- Download report card (Form 138)
- Read announcements

**Teacher** (`frontend/src/pages/teacher/Dashboard.tsx`)
- View assigned sections
- Encode/edit grades per quarter
- Lock grades after completion
- Post announcements
- View advisory class

**Admin** (`frontend/src/pages/admin/Dashboard.tsx`)
- Manage school years
- Manage students, teachers, sections, subjects
- Assign teachers to sections
- Unlock grades (with audit log)
- View audit logs

## Data Flow Examples

### Example 1: Student Views Grades

1. Student logs in → AuthContext stores user
2. StudentDashboard renders
3. Component calls `useQuery` to fetch `/api/student/grades`
4. API client intercepts, adds Firebase token
5. Backend `requireAuth` verifies token, loads user
6. Backend `requireRole(STUDENT)` checks role
7. Controller queries Prisma for student's grades
8. Returns grades with subject info
9. Frontend displays in grade table

### Example 2: Teacher Encodes Grade

1. Teacher navigates to section → grade entry form
2. Teacher enters grade (e.g., 88) for a student + subject + quarter
3. Form submits `POST /api/teacher/grades`
4. Body validated with Zod schema
5. Backend checks teacher is assigned to that section-subject
6. Backend checks grade isn't locked
7. Prisma creates/updates `Grade` record
8. Audit log created (CREATE/UPDATE action)
9. Returns success
10. Frontend shows success toast, refetches grades

### Example 3: Admin Unlocks Grade

1. Admin searches for locked grade
2. Clicks "Unlock" button
3. Confirmation modal appears
4. Submits `POST /api/admin/grades/:id/unlock`
5. Backend `requireRole(ADMIN)` passes
6. Backend sets `locked: false`
7. Audit log created (UNLOCK action with reason)
8. Returns success
9. Frontend updates UI

## Key Design Decisions

### 1. Allowlist-based Access

- Only emails in `User` table can log in
- Role comes from database, never from Firebase token
- Admin manually adds users

**Why**: Prevents unauthorized access even if someone has school domain email.

### 2. Grades Attach to Enrollment + Assignment

- `Grade` references `StudentSection` (enrollment) and `SectionSubject` (teacher assignment)
- Not directly to student or subject

**Why**: Supports historical data across school years. Student's Grade 7 grades remain even after they move to Grade 8.

### 3. Grade Locking

- Teachers lock grades after completion
- Only admins can unlock
- All lock/unlock actions are audit-logged

**Why**: Prevents accidental changes after submission, maintains data integrity.

### 4. Firebase for Auth, Prisma for Authorization

- Firebase handles Google OAuth flow
- Backend checks allowlist (Prisma) for authorization
- Role enforcement happens in backend middleware

**Why**: Decouples identity provider from access control. Can switch providers without changing authorization logic.

### 5. Quarterly Grading with Semester Calculation

- Store quarterly grades (1-4)
- For senior high: Semester 1 = avg(Q1, Q2), Semester 2 = avg(Q3, Q4)
- Computed at query time, not stored

**Why**: Matches DepEd policy, simplifies data entry.

## Security Checklist

Before v1 is "done", verify:

- [ ] All routes have `requireAuth` middleware
- [ ] Role-specific routes use `requireRole`
- [ ] All request bodies validated with Zod
- [ ] Firebase tokens verified on every request
- [ ] User comes from database, not token claims
- [ ] Grades can only be unlocked by admin
- [ ] All grade changes are audit-logged
- [ ] CORS restricted to frontend URL
- [ ] Rate limiting on auth routes
- [ ] Helmet security headers enabled
- [ ] Secrets in `.env`, not hardcoded
- [ ] `.env` files in `.gitignore`
- [ ] No SQL string concatenation (only Prisma queries)

## Development Workflow

### Adding a New Feature

Example: "Teacher can view student attendance"

1. **Schema** (if needed): Update `prisma/schema.prisma`, migrate
2. **Backend route**: Add to `backend/src/routes/teacher.ts`
3. **Backend controller**: Implement in `backend/src/controllers/teacherController.ts`
4. **Backend service** (optional): Business logic in `backend/src/services/attendance.ts`
5. **Frontend type**: Add to `frontend/src/types/index.ts`
6. **Frontend hook**: Create `frontend/src/hooks/api/useAttendance.ts` (React Query)
7. **Frontend component**: Build UI in `frontend/src/pages/teacher/Attendance.tsx`
8. **Test**: Manually test with seeded data

### Database Changes

```bash
# 1. Edit schema.prisma
# 2. Create migration
cd backend
npx prisma migrate dev --name add_attendance

# 3. Update seed if needed
# Edit prisma/seed.ts

# 4. Test migration
npx prisma migrate reset  # WARNING: deletes data
npm run prisma:seed
```

### API Testing

Use tools like:
- **Postman** or **Insomnia** (manual testing)
- **curl** (quick checks)

Example:
```bash
# Get auth token from browser DevTools (Application → IndexedDB → firebaseLocalStorage)
TOKEN="your-firebase-id-token"

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/student/grades
```

## Next Steps (Implementation Roadmap)

### Phase 1: Core Features (MVP)

1. **Student Grade View**
   - API: `GET /api/student/grades`
   - UI: Grade table with filters (quarter, subject)

2. **Teacher Grade Encoding**
   - API: `POST /api/teacher/grades`, `PUT /api/teacher/grades/:id`
   - UI: Editable grade table for each section-subject-quarter

3. **Grade Locking**
   - API: `POST /api/teacher/grades/lock` (teacher), `POST /api/admin/grades/:id/unlock` (admin)
   - UI: Lock button in teacher view, unlock in admin audit log

4. **Report Card PDF**
   - API: `GET /api/student/report-card` (generates PDF via Puppeteer)
   - UI: "Download Report Card" button

5. **Admin Management**
   - API: CRUD endpoints for students, teachers, sections, subjects
   - UI: Admin tables with add/edit/delete actions

### Phase 2: Enhancements

- Announcements (create, pin, filter by audience)
- Advisory class view for teachers
- Bulk grade upload (CSV)
- Grade remarks (PASSED, FAILED, INC, DROPPED)
- Email notifications (grade posted, announcement)

### Phase 3: Advanced

- Attendance tracking
- Document requests (Form 137)
- Parent/guardian portal (read-only)
- Analytics dashboard (grade distribution, pass rates)
- Per-strand subject templates

## Common Gotchas

### Backend

- **Forgot to add `requireAuth`**: Route is publicly accessible
- **Wrong role in `requireRole`**: User gets 403 even though they should access
- **Didn't validate input**: Malformed data crashes server or corrupts database
- **Leaked sensitive data**: Always `select` specific fields, never return full user with password-like data

### Frontend

- **Forgot `await` on async functions**: UI doesn't update
- **Called API without auth context**: Token not attached, 401 error
- **Didn't handle loading state**: UI flashes or shows stale data
- **Hard-coded role checks in UI**: Still need backend role enforcement (never trust frontend)

### Database

- **Forgot foreign key constraints**: Orphaned records
- **Didn't use transactions**: Race conditions in concurrent requests
- **Didn't index frequently queried fields**: Slow queries as data grows
- **Mixed up student vs enrollment**: Grades attach to enrollment (StudentSection), not Student directly

## Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **React Router**: https://reactrouter.com
- **TanStack Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com
- **DepEd Grading Guidelines**: Search for "DepEd Order on Grading System"

---

**Happy coding! Build something amazing for LOA. 🚀**
