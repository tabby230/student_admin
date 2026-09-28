# EduTrack - Higher Education Analytics & Student Information System

EduTrack is an institutional analytics and student management platform featuring a glassmorphic dashboard frontend and a PHP PDO / MariaDB backend.

**MariaDB is the only source of truth.** Every student, mark and attendance figure rendered anywhere in this application is read from the database. There are no hardcoded student lists, no sample datasets and no "fallback" numbers: if the database is unreachable the API returns a clear HTTP `503` and the UI shows an error instead of inventing data.

---

## 🛠️ Setup

Quickstart for a fresh clone. Full detail is in [How to Run](#-how-to-run) and [Database Configuration](#-database-configuration) below.

**1. Create the database and import the schema + seed**

```bash
mysql -u root < database/schema.sql            # creates the `edutrack` database and its tables
mysql -u root edutrack < database/seed.sql     # sample students, subjects, marks, attendance
```

Or import both through phpMyAdmin. `./start.sh` (step 4) does this automatically on first run.

**2. Apply the migrations** (idempotent; safe to re-run)

```bash
mysql -u root edutrack < database/migration_attendance.sql
mysql -u root edutrack < database/migration_student_profile.sql
```

**3. Create your local config**

```bash
cp api/config.local.example.php api/config.local.php
```

Then edit `api/config.local.php` and fill in your own `host` / `port` / `name` / `user` / `pass`. The example file ships with placeholders only - `config.local.php` is git-ignored and must never be committed.

**4. Run it**

```bash
./start.sh
```

This initialises a local MariaDB on `127.0.0.1:3307`, imports the schema and seed if the `edutrack` database is empty, and serves the app at <http://127.0.0.1:8001/>. If you'd rather use an existing MySQL/MariaDB server or XAMPP, see [How to Run](#-how-to-run).

---

## 📁 System Architecture

```text
index/
├── api/
│   ├── config.php           # PDO connection, CORS & JSON headers, error handling, 503 on DB loss
│   ├── config.local.php     # Optional local DB credentials (not for version control)
│   ├── stats.php            # Overall metrics (total students, departments, avg score, pass rate)
│   ├── students.php         # Filterable student records (search, dept, year, sem, page, perPage)
│   ├── student.php          # Full single-student profile by ?id= or ?roll=
│   ├── student-fields.php   # Shared field map + validation (include-only library, not an endpoint)
│   ├── create-student.php   # POST - create a student with full validation
│   ├── update-student.php   # POST - update every student field
│   ├── delete-student.php   # POST - delete a student (hard delete, cascades)
│   ├── student-update.php   # POST - narrow personal/contact update
│   ├── student-photo.php    # Student photo helpers
│   ├── avatar.php           # Avatar URL updates
│   ├── avatar-map-lookup.php# Avatar mapping helper
│   ├── departments.php      # Department stats (student count, average score)
│   ├── semesters.php        # Real semesters (+ subjects) for the admin forms
│   ├── results.php          # Rankings, grades and pass/fail status
│   ├── analytics.php        # Real attendance-derived trends and department benchmarking
│   ├── top-performers.php   # Top ranking students with marks & avatars
│   ├── export.php           # Download results as formatted CSV
│   ├── import.php           # CSV import of students, marks and dated attendance columns
│   ├── attendance.php       # action=roster | history | sessions
│   ├── mark-attendance.php  # POST - create/re-mark a session (transactional, idempotent)
│   ├── update-attendance.php# POST - amend individual statuses
│   └── delete-session.php   # POST - delete a session and its records
├── database/
│   ├── schema.sql                    # Full schema, including attendance_sessions/records
│   ├── seed.sql                      # 14 depts, 8 semesters, 124 students, subjects, marks, attendance
│   └── migration_attendance.sql      # Attendance migration for pre-existing installs
├── js/
│   ├── api.js          # Client API library (students, departments, semesters, attendance, CRUD)
│   ├── app.js          # Shared UI helpers, student create/edit/delete modals, reference filters
│   ├── attendance.js   # Attendance marking page logic
│   ├── student-profile.js
│   └── moon-widget.js
├── index.html          # Institutional overview dashboard & hero section
├── students.html       # Students directory (grid/list toggle, search, filters, add/edit/delete, CSV import)
├── attendance.html     # Mark a class for a semester/subject, and browse/delete sessions
├── student-profile.html# Individual student profile
├── departments.html    # Academic departments grid
├── results.html        # Exam results table, rank badges & CSV export
└── analytics.html      # Charts built from real attendance and marks
```

---

## 🔌 Database Configuration

Credentials are resolved in this order, so an environment variable always wins over a checked-in file:

1. **Environment variables** - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
2. **`api/config.local.php`** - optional local overrides
3. **Built-in defaults** - `127.0.0.1:3307`, database `edutrack`

```bash
# Example: point the app at a different port for one run
DB_PORT=9999 php -S 127.0.0.1:8001
```

The default port is **3307** (the local MariaDB instance), not the MySQL/XAMPP default of 3306. If the port is wrong the app does not silently switch servers - it reports the connection failure.

---

## 🚀 How to Run

### Option 1: XAMPP

1. Copy this directory into your XAMPP web root (e.g. `C:\xampp\htdocs\student_port`).
2. Start **Apache** and **MySQL** from the XAMPP Control Panel.
3. Import the database:
   - Open `http://localhost/phpmyadmin/`
   - **Import** → `database/schema.sql` (creates the `edutrack` database and tables)
   - Select the `edutrack` database → **Import** → `database/seed.sql`
4. Browse to `http://localhost/student_port/`.

```bash
# Or from the command line
mysql -u root < database/schema.sql
mysql -u root edutrack < database/seed.sql
```

### Option 2: PHP built-in server (current setup)

```bash
php -S 127.0.0.1:8001
```

Then open `http://127.0.0.1:8001/`.

### Upgrading an existing install

`database/migration_attendance.sql` is idempotent and can be run against a database that already holds the original summary-only `attendance` table. See [Attendance model](#-attendance-model) below.

---

## 🔌 API Reference

All endpoints return JSON. Errors use `{ "error": true, "message": "...", "field": "..." }`.

### Students

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `students.php?search=&dept=&year=&semester=&page=&perPage=` | Filtered, paginated student list |
| GET | `student.php?id=` or `student.php?roll=` | Full student profile |
| GET | `departments.php` | Departments with live student counts |
| GET | `semesters.php` | Semesters with live student counts |
| GET | `semesters.php?withSubjects=1&semesterId=` | Semesters plus that semester's subjects |
| POST | `create-student.php` | Create a student |
| POST | `update-student.php` | Update every student field |
| POST | `delete-student.php` | Delete a student by `id` or `rollNo` |

### Attendance

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `attendance.php?action=roster&semesterId=` | Students to mark for a semester |
| GET | `attendance.php?action=sessions&semesterId=&subjectId=&date=&source=&studentId=&page=&perPage=&sort=&dir=` | Paginated session list with tallies |
| GET | `attendance.php?action=history&studentId=&sessionId=&page=&perPage=` | Flat record history |
| POST | `mark-attendance.php` | Create or re-mark a session (idempotent) |
| POST | `update-attendance.php` | Amend individual statuses |
| POST | `delete-session.php` | Delete a session and its records |

Status values are `present`, `late`, `absent`, `excused`. Attendance percentage is
`(present + late) / (present + late + absent) * 100`; excused students are excluded from the denominator.

`ORDER BY` values are whitelisted server-side, so `sort` can never inject SQL. `perPage` is clamped to 1-500.

---

## 📅 Attendance model

The original project stored a single whole-number attendance percentage per student per semester. That number cannot tell you *when* a student was absent, so the migration reconstructs a real session/record structure while **preserving every original percentage exactly**.

- `attendance_sessions` - one row per class event (subject, date, who took it). Intentionally has **no** `student_id`.
- `attendance_records` - one status per `(session_id, student_id)`, enforced by a unique key.
- `source` records provenance: `legacy` (reconstructed by the migration), `manual` (marked in the UI) or `import` (from CSV).

Reconstruction detail: for each student-semester with percentage `p` out of 100 reconstructed sessions, exactly `100 - p` are marked absent and the rest present, which reproduces the original figure with no rounding drift. **All 124 migrated percentages match their originals with zero mismatches.**

Because the reconstruction is derived data, it is treated as immutable history:

- Migrated (`legacy`) sessions **cannot be deleted** through the API. There is deliberately no override flag - with no authentication layer in front of the endpoint, an override is indistinguishable from an accident.
- Migrated records **cannot be amended**. Correct history by importing a new session instead.

---

## 🔒 Security & Data Integrity

- **Prepared statements everywhere**: all API queries use parameterized PDO statements, preventing SQL injection.
- **Whitelisted sorting**: `ORDER BY` columns are chosen from a fixed map, never from client input.
- **Server-side validation**: every writable student field is validated against the live `students` schema by `api/student-fields.php`, which the create, update and import endpoints all share.
- **Case normalisation**: `gender`, `category` and `section` are normalised before validation, so `female` and `Female` both work but only one form is ever stored.
- **Referential integrity**: foreign keys with `ON UPDATE CASCADE` and delete constraints, plus composite indexes for fast lookups.
- **No fabricated data**: if MariaDB is unavailable every endpoint returns HTTP `503` with a readable message. Nothing is ever faked to keep the UI populated.
- **Reference data is loaded, not hardcoded**: department and semester filter dropdowns are populated from the database, so they cannot drift out of sync.

### Known limitations

- **No authentication.** The app has no login, so the API cannot distinguish an administrator from any other caller. Every endpoint is currently open, including the destructive ones. Adding real `401` handling requires an authentication/session model first.
- **`delete-student.php` performs a hard delete**, cascading to marks, results and attendance records. There is no soft-delete/archived flag in the schema.

---

## 📤 CSV Import & Export

### Export (`api/export.php`)
Open the **Results** page, filter as desired, then click **Export CSV**. The browser downloads `edutrack_results_YYYYMMDD_HHMMSS.csv`, formatted with a UTF-8 BOM for Microsoft Excel.

### Import (`api/import.php`)
Open the **Students** page and click **Import CSV**. Supported columns:

- `Roll Number` (e.g. `22CS050`)
- `Name` (e.g. `Ananya Sharma`)
- `Department` (e.g. `Computer Science` or `CS`)
- `Year` (1 to 4)
- `Semester` (1 to 8)
- `Attendance` (e.g. `92`)
- `Marks` (e.g. `88.5`)

A bare `Attendance` column is a semester summary: it is stored in the legacy `attendance` table and is **never** expanded into invented sessions.

To import real dated attendance instead, add per-date columns:

- `att:YYYY-MM-DD` (e.g. `att:2026-09-26`) - status for that day: `present`, `late`, `absent` or `excused`

Each dated column creates a real `attendance_sessions` row with `source = 'import'` plus one record per student. Re-importing the same file is idempotent: sessions are matched by their key and records are upserted, so nothing is duplicated.
