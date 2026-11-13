-- ============================================================================
-- LOA Portal: reference + sample school data (SY 2026-2027)
--
-- * Idempotent: every insert uses ON CONFLICT DO NOTHING and later rows look up
--   their parents by natural key (email, LRN, code, label), so it merges with
--   any data that already exists.
-- * All people and grades below are FICTIONAL sample data.
-- ============================================================================

-- ----------------------------------------------------------------------------

BEGIN;
-- Settings
-- ----------------------------------------------------------------------------
INSERT INTO "Setting" ("id", "key", "value") VALUES
  ('seed-set-passing', 'passing_score', '75'),
  ('seed-set-school',  'school_name', 'Lyceum of Alcala'),
  ('seed-set-address', 'school_address', 'Alcala, Pangasinan'),
  ('seed-set-quarter', 'current_quarter', '2')
ON CONFLICT ("key") DO NOTHING;

-- ----------------------------------------------------------------------------
-- School years (2026-2027 becomes the current year)
-- ----------------------------------------------------------------------------
INSERT INTO "SchoolYear" ("id", "label", "startDate", "endDate", "isCurrent", "updatedAt") VALUES
  ('seed-sy-2025', '2025-2026', '2025-06-16', '2026-03-31', false, now()),
  ('seed-sy-2026', '2026-2027', '2026-06-15', '2027-03-31', false, now())
ON CONFLICT ("label") DO NOTHING;

UPDATE "SchoolYear" SET "isCurrent" = ("label" = '2026-2027'), "updatedAt" = now();

-- ----------------------------------------------------------------------------
-- Grade levels & strands
-- ----------------------------------------------------------------------------
INSERT INTO "GradeLevel" ("id", "number", "name", "isSeniorHigh") VALUES
  ('seed-gl-7',  7,  'Grade 7',  false),
  ('seed-gl-8',  8,  'Grade 8',  false),
  ('seed-gl-9',  9,  'Grade 9',  false),
  ('seed-gl-10', 10, 'Grade 10', false),
  ('seed-gl-11', 11, 'Grade 11', true),
  ('seed-gl-12', 12, 'Grade 12', true)
ON CONFLICT ("number") DO NOTHING;

INSERT INTO "Strand" ("id", "code", "name", "description") VALUES
  ('seed-st-stem',  'STEM',  'Science, Technology, Engineering and Mathematics', 'Academic track for science and engineering pathways'),
  ('seed-st-abm',   'ABM',   'Accountancy, Business and Management', 'Academic track for business and finance pathways'),
  ('seed-st-humss', 'HUMSS', 'Humanities and Social Sciences', 'Academic track for social science, education and law pathways'),
  ('seed-st-gas',   'GAS',   'General Academic Strand', 'Flexible academic track'),
  ('seed-st-ict',   'TVL-ICT', 'TVL — Information and Communications Technology', 'Technical-vocational track')
ON CONFLICT ("code") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Registrar account
-- ----------------------------------------------------------------------------
INSERT INTO "User" ("id", "email", "role", "isActive", "updatedAt") VALUES
  ('seed-usr-registrar', 'registrar@loa.edu.ph', 'ADMIN', true, now())
ON CONFLICT ("email") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Teachers
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _t (ord int, email text, first text, middle text, last text, dept text);
INSERT INTO _t VALUES
  (1,  'ana.reyes@loa.edu.ph',        'Ana',    'Lopez',   'Reyes',       'English'),
  (2,  'carlo.bautista@loa.edu.ph',   'Carlo',  'Mendoza', 'Bautista',    'English'),
  (3,  'liza.villanueva@loa.edu.ph',  'Liza',   'Cruz',    'Villanueva',  'Filipino'),
  (4,  'ramon.aquino@loa.edu.ph',     'Ramon',  'Torres',  'Aquino',      'Filipino'),
  (5,  'grace.dizon@loa.edu.ph',      'Grace',  'Ramos',   'Dizon',       'Mathematics'),
  (6,  'paolo.mercado@loa.edu.ph',    'Paolo',  'Garcia',  'Mercado',     'Mathematics'),
  (7,  'joy.navarro@loa.edu.ph',      'Joy',    'Flores',  'Navarro',     'Science'),
  (8,  'mark.castillo@loa.edu.ph',    'Mark',   'Rivera',  'Castillo',    'Science'),
  (9,  'elena.santiago@loa.edu.ph',   'Elena',  'Diaz',    'Santiago',    'Araling Panlipunan'),
  (10, 'noel.salazar@loa.edu.ph',     'Noel',   'Perez',   'Salazar',     'MAPEH'),
  (11, 'rose.pascual@loa.edu.ph',     'Rose',   'Aguilar', 'Pascual',     'TLE'),
  (12, 'jun.manalo@loa.edu.ph',       'Jun',    'Ocampo',  'Manalo',      'Values Education'),
  (13, 'celia.robles@loa.edu.ph',     'Celia',  'Tan',     'Robles',      'Senior High Core'),
  (14, 'victor.gatchalian@loa.edu.ph','Victor', 'Lim',     'Gatchalian',  'STEM'),
  (15, 'bea.delarosa@loa.edu.ph',     'Bea',    'Sison',   'Dela Rosa',   'ABM'),
  (16, 'ivan.soriano@loa.edu.ph',     'Ivan',   'Yap',     'Soriano',     'HUMSS');

INSERT INTO "User" ("id", "email", "role", "isActive", "updatedAt")
SELECT 'seed-usr-t' || ord, email, 'TEACHER', true, now() FROM _t
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Teacher" ("id", "userId", "firstName", "middleName", "lastName", "department", "updatedAt")
SELECT 'seed-t' || _t.ord, u.id, _t.first, _t.middle, _t.last, _t.dept, now()
FROM _t JOIN "User" u ON u.email = _t.email
ON CONFLICT ("userId") DO NOTHING;

-- Resolved teacher rows with rank inside their department (for load balancing)
CREATE TEMP TABLE _teacher AS
SELECT t.id AS teacher_id, t."userId" AS user_id, _t.email, _t.dept,
       row_number() OVER (PARTITION BY _t.dept ORDER BY _t.ord) AS dept_rank,
       count(*)     OVER (PARTITION BY _t.dept)                  AS dept_count
FROM _t JOIN "User" u ON u.email = _t.email JOIN "Teacher" t ON t."userId" = u.id;

-- ----------------------------------------------------------------------------
-- Subjects (DepEd K-12 names; SHS first-semester load)
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _s (code text, title text, grade int, strand text, sem int, cat text, dept text);
INSERT INTO _s
SELECT x.prefix || g, x.title, g, NULL, NULL, 'CORE', x.dept
FROM generate_series(7, 10) AS g
CROSS JOIN (VALUES
  ('ENG',   'English',                              'English'),
  ('FIL',   'Filipino',                             'Filipino'),
  ('MATH',  'Mathematics',                          'Mathematics'),
  ('SCI',   'Science',                              'Science'),
  ('AP',    'Araling Panlipunan',                   'Araling Panlipunan'),
  ('ESP',   'Edukasyon sa Pagpapakatao',            'Values Education'),
  ('MAPEH', 'Music, Arts, PE and Health',           'MAPEH'),
  ('TLE',   'Technology and Livelihood Education',  'TLE')
) AS x(prefix, title, dept);

INSERT INTO _s VALUES
  ('OC11',       'Oral Communication in Context',                              11, NULL,    1, 'CORE',        'English'),
  ('KPWKP11',    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 11, NULL,    1, 'CORE',        'Filipino'),
  ('GEN-MATH',   'General Mathematics',                                        11, NULL,    1, 'CORE',        'Mathematics'),
  ('ELS11',      'Earth and Life Science',                                     11, NULL,    1, 'CORE',        'Science'),
  ('PERDEV11',   'Personal Development',                                       11, NULL,    1, 'CORE',        'Values Education'),
  ('PEH11',      'Physical Education and Health 1',                            11, NULL,    1, 'CORE',        'MAPEH'),
  ('PRECAL11',   'Pre-Calculus',                                               11, 'STEM',  1, 'SPECIALIZED', 'STEM'),
  ('ABM-OM11',   'Organization and Management',                                11, 'ABM',   1, 'SPECIALIZED', 'ABM'),
  ('21CLIT12',   '21st Century Literature from the Philippines and the World', 12, NULL,    1, 'CORE',        'English'),
  ('MIL12',      'Media and Information Literacy',                             12, NULL,    1, 'CORE',        'Senior High Core'),
  ('STATPROB12', 'Statistics and Probability',                                 12, NULL,    1, 'CORE',        'Mathematics'),
  ('PEH12',      'Physical Education and Health 3',                            12, NULL,    1, 'CORE',        'MAPEH'),
  ('GENPHYS12',  'General Physics 1',                                          12, 'STEM',  1, 'SPECIALIZED', 'STEM'),
  ('GENBIO12',   'General Biology 1',                                          12, 'STEM',  1, 'SPECIALIZED', 'Science'),
  ('CW12',       'Creative Writing',                                           12, 'HUMSS', 1, 'SPECIALIZED', 'HUMSS'),
  ('DIASS12',    'Disciplines and Ideas in the Applied Social Sciences',       12, 'HUMSS', 1, 'SPECIALIZED', 'HUMSS');

INSERT INTO "Subject" ("id", "code", "title", "gradeLevelId", "strandId", "semester", "category", "updatedAt")
SELECT 'seed-sub-' || lower(_s.code), _s.code, _s.title, gl.id, st.id, _s.sem, _s.cat::"SubjectCategory", now()
FROM _s
JOIN "GradeLevel" gl ON gl.number = _s.grade
LEFT JOIN "Strand" st ON st.code = _s.strand
ON CONFLICT ("code") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Sections for SY 2026-2027
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _sec (ord int, name text, grade int, strand text, cap int, n int, adviser text);
INSERT INTO _sec VALUES
  (1,  '7-Rizal',      7,  NULL,    40, 24, 'ana.reyes@loa.edu.ph'),
  (2,  '7-Bonifacio',  7,  NULL,    40, 24, 'liza.villanueva@loa.edu.ph'),
  (3,  '8-Mabini',     8,  NULL,    40, 22, 'grace.dizon@loa.edu.ph'),
  (4,  '8-Luna',       8,  NULL,    40, 22, 'joy.navarro@loa.edu.ph'),
  (5,  '9-Silang',     9,  NULL,    40, 22, 'elena.santiago@loa.edu.ph'),
  (6,  '10-Aquino',    10, NULL,    40, 22, 'paolo.mercado@loa.edu.ph'),
  (7,  '11-STEM-A',    11, 'STEM',  35, 18, 'victor.gatchalian@loa.edu.ph'),
  (8,  '11-ABM-A',     11, 'ABM',   35, 16, 'bea.delarosa@loa.edu.ph'),
  (9,  '12-STEM-A',    12, 'STEM',  35, 16, 'mark.castillo@loa.edu.ph'),
  (10, '12-HUMSS-A',   12, 'HUMSS', 35, 16, 'ivan.soriano@loa.edu.ph');

INSERT INTO "Section" ("id", "name", "gradeLevelId", "strandId", "adviserId", "schoolYearId", "capacity", "updatedAt")
SELECT 'seed-sec-' || _sec.ord, _sec.name, gl.id, st.id, tch.teacher_id, sy.id, _sec.cap, now()
FROM _sec
JOIN "GradeLevel" gl ON gl.number = _sec.grade
JOIN "SchoolYear" sy ON sy.label = '2026-2027'
LEFT JOIN "Strand" st ON st.code = _sec.strand
LEFT JOIN _teacher tch ON tch.email = _sec.adviser
ON CONFLICT ("name", "schoolYearId") DO NOTHING;

CREATE TEMP TABLE _section AS
SELECT s.id AS section_id, _sec.*, sum(_sec.n) OVER (ORDER BY _sec.ord) - _sec.n AS start_at
FROM _sec
JOIN "SchoolYear" sy ON sy.label = '2026-2027'
JOIN "Section" s ON s.name = _sec.name AND s."schoolYearId" = sy.id;

-- ----------------------------------------------------------------------------
-- Teaching assignments: every section gets each subject of its grade (and strand)
-- ----------------------------------------------------------------------------
INSERT INTO "SectionSubject" ("id", "sectionId", "subjectId", "teacherId")
SELECT 'seed-ss-' || sec.ord || '-' || lower(_s.code), sec.section_id, sub.id, tch.teacher_id
FROM _section sec
JOIN _s ON _s.grade = sec.grade AND (_s.strand IS NULL OR _s.strand = sec.strand)
JOIN "Subject" sub ON sub.code = _s.code
JOIN _teacher tch ON tch.dept = _s.dept AND tch.dept_rank = (sec.ord % tch.dept_count) + 1
ON CONFLICT ("sectionId", "subjectId") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Students (fictional names) + enrollment
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _stu AS
WITH names AS (
  SELECT
    ARRAY['Juan','Jose','Miguel','Gabriel','Rafael','Carlos','Daniel','Joshua','Paolo','Marco',
          'Andres','Luis','Adrian','Kenneth','Nathan','Ivan','Lorenzo','Diego','Enzo','Bryan'] AS male,
    ARRAY['Maria','Andrea','Sofia','Isabella','Angela','Bianca','Camille','Patricia','Nicole','Kristine',
          'Jasmine','Alyssa','Danica','Erika','Hannah','Leah','Mika','Trisha','Aira','Joanna'] AS female,
    ARRAY['Dela Cruz','Garcia','Reyes','Ramos','Mendoza','Santos','Flores','Gonzales','Bautista','Villanueva',
          'Fernandez','Cruz','De Guzman','Lopez','Perez','Castillo','Francisco','Rivera','Aquino','Castro',
          'Sanchez','Torres','De Leon','Domingo','Martinez','Rodriguez','Santiago','Soriano','Delos Santos','Diaz',
          'Hernandez','Tolentino','Valdez','Ramirez','Morales','Mercado','Tan','Aguilar','Navarro','Manalo'] AS last,
    ARRAY['Poblacion East','Poblacion West','Bersamin','Bugyao','Canarvacanan','Caranglaan','Gualsic',
          'Laoac','Pindangan','San Juan','San Pedro Apartado','San Vicente','Sinabaan','Vacante'] AS brgy
)
SELECT
  gs.n AS n,
  sec.section_id,
  sec.grade,
  CASE WHEN gs.n % 2 = 0 THEN 'F' ELSE 'M' END                                         AS sex,
  CASE WHEN gs.n % 2 = 0 THEN female[(gs.n * 7) % 20 + 1] ELSE male[(gs.n * 7) % 20 + 1] END  AS first,
  last[(gs.n * 17 + 5) % 40 + 1]                                                        AS middle,
  last[(gs.n * 13) % 40 + 1]                                                            AS lastname,
  brgy[(gs.n * 3) % 14 + 1]                                                             AS barangay,
  '10882026' || lpad(gs.n::text, 4, '0')                                                AS lrn,
  'stu' || lpad(gs.n::text, 4, '0') || '@loa.edu.ph'                                    AS email,
  make_date(2026 - sec.grade - 6 + CASE WHEN gs.n % 5 = 0 THEN -1 ELSE 0 END,
            (gs.n % 12) + 1, (gs.n % 27) + 1)                                              AS birthdate
FROM names, generate_series(1, (SELECT sum(_sec.n) FROM _sec)::int) AS gs(n)
JOIN _section sec ON gs.n > sec.start_at AND gs.n <= sec.start_at + sec.n;

INSERT INTO "User" ("id", "email", "role", "isActive", "updatedAt")
SELECT 'seed-usr-s' || n, email, 'STUDENT', true, now() FROM _stu
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Student" ("id", "userId", "lrn", "firstName", "middleName", "lastName", "birthdate", "sex",
                       "guardianName", "guardianContact", "guardianEmail", "address", "updatedAt")
SELECT 'seed-s' || _stu.n, u.id, _stu.lrn, _stu.first, _stu.middle, _stu.lastname, _stu.birthdate, _stu.sex,
       CASE WHEN _stu.n % 3 = 0 THEN 'Rosario ' ELSE 'Roberto ' END || _stu.lastname,
       '09' || lpad(((_stu.n * 7919 + 1234567) % 1000000000)::text, 9, '0'),
       CASE WHEN _stu.n % 4 = 0 THEN 'guardian' || lpad(_stu.n::text, 4, '0') || '@example.com' END,
       'Brgy. ' || _stu.barangay || ', Alcala, Pangasinan',
       now()
FROM _stu JOIN "User" u ON u.email = _stu.email
ON CONFLICT ("lrn") DO NOTHING;

INSERT INTO "StudentSection" ("id", "studentId", "sectionId", "enrolledAt")
SELECT 'seed-enr-' || _stu.n, st.id, _stu.section_id, '2026-06-15'
FROM _stu JOIN "Student" st ON st.lrn = _stu.lrn
ON CONFLICT ("studentId", "sectionId") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Grades
--   Q1: complete and locked for every class.
--   Q2: a realistic mix per class — not started / in progress / complete / locked.
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _class AS
SELECT ss.id AS ss_id, ss."sectionId" AS section_id, t."userId" AS teacher_user,
       abs(hashtext(ss.id)) % 4 AS q2_state   -- 0 none, 1 partial, 2 complete, 3 locked
FROM "SectionSubject" ss
JOIN _section sec ON sec.section_id = ss."sectionId"
JOIN "Teacher" t ON t.id = ss."teacherId";

CREATE TEMP TABLE _roster AS
SELECT e.id AS enr_id, e."sectionId" AS section_id, e."studentId" AS student_id,
       row_number() OVER (PARTITION BY e."sectionId" ORDER BY e.id) AS pos,
       count(*)     OVER (PARTITION BY e."sectionId")              AS size,
       abs(hashtext(e."studentId")) % 15                           AS ability
FROM "StudentSection" e JOIN _section sec ON sec.section_id = e."sectionId";

CREATE TEMP TABLE _g AS
SELECT r.enr_id, c.ss_id, q.quarter, c.teacher_user,
       LEAST(99, 72 + r.ability + abs(hashtext(r.student_id || c.ss_id || q.quarter::text)) % 10
                 + CASE WHEN q.quarter = 2 THEN 1 ELSE 0 END) AS score,
       CASE WHEN q.quarter = 1 THEN true ELSE c.q2_state = 3 END AS locked,
       CASE WHEN q.quarter = 1 THEN timestamp '2026-08-28 16:00' ELSE timestamp '2026-11-07 15:30' END AS locked_at
FROM _class c
JOIN _roster r ON r.section_id = c.section_id
CROSS JOIN (VALUES (1), (2)) AS q(quarter)
WHERE q.quarter = 1
   OR (c.q2_state IN (2, 3))
   OR (c.q2_state = 1 AND r.pos <= ceil(r.size * 0.6));

INSERT INTO "Grade" ("id", "studentSectionId", "sectionSubjectId", "quarter", "score", "remarks",
                     "locked", "lockedAt", "lockedById", "encodedAt", "updatedAt")
SELECT 'seed-g-' || substr(md5(enr_id || ss_id || quarter::text), 1, 20),
       enr_id, ss_id, quarter, score,
       CASE WHEN score >= 75 THEN 'PASSED' ELSE 'FAILED' END,
       locked,
       CASE WHEN locked THEN locked_at END,
       CASE WHEN locked THEN teacher_user END,
       locked_at - interval '3 days',
       locked_at - interval '3 days'
FROM _g
ON CONFLICT ("studentSectionId", "sectionSubjectId", "quarter") DO NOTHING;

-- ----------------------------------------------------------------------------
-- A pending unlock request (8-Mabini Mathematics, Q1)
-- ----------------------------------------------------------------------------
INSERT INTO "UnlockRequest" ("id", "gradeId", "requestedBy", "reason", "status", "createdAt")
SELECT 'seed-unlock-1', g.id, 'grace.dizon@loa.edu.ph',
       'Two students submitted late performance tasks with an approved excuse letter; their Q1 grades need to be recomputed.',
       'pending', timestamp '2026-11-10 09:15'
FROM "Grade" g
JOIN "SectionSubject" ss ON ss.id = g."sectionSubjectId"
JOIN "Subject" sub ON sub.id = ss."subjectId" AND sub.code = 'MATH8'
JOIN _section sec ON sec.section_id = ss."sectionId" AND sec.name = '8-Mabini'
WHERE g.quarter = 1 AND g.locked
ORDER BY g.id
LIMIT 1
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Announcements
-- ----------------------------------------------------------------------------
INSERT INTO "Announcement" ("id", "authorId", "title", "body", "audience", "targetId", "isPinned", "createdAt", "updatedAt")
SELECT v.id, u.id, v.title, v.body, v.audience::"AnnouncementAudience",
       CASE v.target WHEN 'G11' THEN (SELECT id FROM "GradeLevel" WHERE number = 11)
                     WHEN '7-Rizal' THEN (SELECT section_id FROM _section WHERE name = '7-Rizal') END,
       v.pinned, v.created, v.created
FROM (VALUES
  ('seed-ann-1', 'registrar@loa.edu.ph', 'Second quarter grade encoding is open',
   'Teachers may encode Q2 grades until November 28. Please submit (lock) each sheet once complete so advisers can prepare report cards.',
   'TEACHERS', NULL, true, timestamp '2026-11-03 08:00'),
  ('seed-ann-2', 'registrar@loa.edu.ph', 'Upload your ID photo and signature',
   'Student IDs for SY 2026-2027 will be printed next month. Go to My ID and upload a clear 2x2 photo with a white background and your signature.',
   'STUDENTS', NULL, true, timestamp '2026-11-05 10:30'),
  ('seed-ann-3', 'registrar@loa.edu.ph', 'No classes on November 30 (Bonifacio Day)',
   'Classes and office transactions are suspended on Monday, November 30, in observance of Bonifacio Day.',
   'ALL', NULL, false, timestamp '2026-11-09 14:00'),
  ('seed-ann-4', 'victor.gatchalian@loa.edu.ph', 'Grade 11 research orientation',
   'All Grade 11 students: research orientation on Friday, 1:00 PM at the AVR. Bring your proposed topics.',
   'GRADE_LEVEL', 'G11', false, timestamp '2026-11-11 07:45'),
  ('seed-ann-5', 'ana.reyes@loa.edu.ph', '7-Rizal: parent-teacher conference',
   'Parents and guardians of 7-Rizal are invited to the Q1 card distribution and conference on Saturday, 9:00 AM, Room 104.',
   'SECTION', '7-Rizal', false, timestamp '2026-11-12 16:20')
) AS v(id, author, title, body, audience, target, pinned, created)
JOIN "User" u ON u.email = v.author
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AnnouncementRead" ("id", "announcementId", "studentId", "readAt")
SELECT 'seed-read-' || st.id, 'seed-ann-3', st.id, timestamp '2026-11-10 07:00'
FROM "Student" st
JOIN "StudentSection" e ON e."studentId" = st.id
JOIN _section sec ON sec.section_id = e."sectionId"
WHERE abs(hashtext(st.id)) % 3 = 0
  AND EXISTS (SELECT 1 FROM "Announcement" WHERE id = 'seed-ann-3')
ON CONFLICT ("announcementId", "studentId") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Audit trail for the sample activity
-- ----------------------------------------------------------------------------
INSERT INTO "AuditLog" ("id", "userId", "action", "entity", "entityId", "after", "createdAt")
SELECT 'seed-log-' || substr(md5(c.ss_id || x.action), 1, 16), c.teacher_user, x.action, 'GradeSheet', c.ss_id,
       jsonb_build_object('section', sec.name, 'subject', sub.code, 'quarter', x.quarter,
                          'count', (SELECT count(*) FROM _roster r WHERE r.section_id = c.section_id)),
       x.at
FROM _class c
JOIN "SectionSubject" ss ON ss.id = c.ss_id
JOIN "Subject" sub ON sub.id = ss."subjectId"
JOIN _section sec ON sec.section_id = c.section_id
JOIN LATERAL (VALUES
  ('LOCK', 1, timestamp '2026-08-28 16:00' + (abs(hashtext(c.ss_id)) % 300) * interval '1 minute'),
  ('LOCK', 2, timestamp '2026-11-07 15:30' + (abs(hashtext(c.ss_id)) % 600) * interval '1 minute')
) AS x(action, quarter, at) ON x.quarter = 1 OR c.q2_state = 3
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AuditLog" ("id", "userId", "action", "entity", "entityId", "after", "createdAt")
SELECT 'seed-log-unlockreq', u.id, 'REQUEST_UNLOCK', 'GradeSheet', g."sectionSubjectId",
       jsonb_build_object('section', '8-Mabini', 'subject', 'MATH8', 'quarter', 1,
                          'reason', 'Late performance tasks with approved excuse letter'),
       timestamp '2026-11-10 09:15'
FROM "UnlockRequest" ur
JOIN "Grade" g ON g.id = ur."gradeId"
JOIN "User" u ON u.email = ur."requestedBy"
WHERE ur.id = 'seed-unlock-1'
ON CONFLICT ("id") DO NOTHING;

DROP TABLE IF EXISTS _t, _teacher, _s, _sec, _section, _stu, _class, _roster, _g;

COMMIT;
