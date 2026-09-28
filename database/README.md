# EduTrack Database Setup Guide

This database backend is built for **MySQL 5.7+ / MariaDB 10.3+** using **PHP (PDO)**.

---

## 1. Quick Database Setup (XAMPP / MySQL)

### Option A: Using Command Prompt / PowerShell
With your MySQL server running:
```bash
# 1. Create database and schema
mysql -u root -p < database/schema.sql

# 2. Populate seed data (14 departments, 8 semesters, 124 students, marks, attendance)
mysql -u root -p edutrack < database/seed.sql
```
*(If your root user has no password, you can omit `-p`)*

### Option B: Using phpMyAdmin
1. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
2. Click **Import** in the top navigation.
3. Choose `database/schema.sql` and click **Import**.
4. Select the `edutrack` database from the left sidebar.
5. Click **Import**, choose `database/seed.sql`, and click **Import**.

---

## 2. API Configuration

The database credentials are centrally configured in [`api/config.php`](file:///d:/APPS/website/student_port/api/config.php):
- **Host**: `127.0.0.1` (or via environment variable `DB_HOST`)
- **Port**: `3306` (or `DB_PORT`)
- **Database**: `edutrack` (or `DB_NAME`)
- **Username**: `root` (or `DB_USER`)
- **Password**: `""` (empty by default for XAMPP, or `DB_PASS`)

---

## 3. Endpoints Overview

| Endpoint | Method | Description |
|---|---|---|
| [`api/stats.php`](file:///d:/APPS/website/student_port/api/stats.php) | `GET` | Overall stats (total students, departments, average score, pass rate) |
| [`api/top-performers.php`](file:///d:/APPS/website/student_port/api/top-performers.php) | `GET` | Top 3 rank performers with CGPA, marks and department |
| [`api/students.php`](file:///d:/APPS/website/student_port/api/students.php) | `GET` | Filterable students list (`?search=`, `?dept=`, `?year=`, `?semester=`) |
| [`api/departments.php`](file:///d:/APPS/website/student_port/api/departments.php) | `GET` | 14 Departments with student counts, average score, sparkline, and HOD |
| [`api/results.php`](file:///d:/APPS/website/student_port/api/results.php) | `GET` | Exam results with rank, grade (O, A+, A, B+, B, C), and pass/fail status |
| [`api/analytics.php`](file:///d:/APPS/website/student_port/api/analytics.php) | `GET` | Monthly trends, grade distribution counts, and department benchmarks |
| [`api/student.php`](file:///d:/APPS/website/student_port/api/student.php) | `GET` | Full student profile (`?id=1` or `?roll=22CS001`) with CGPA/SGPA/rank, subjects, attendance, documents |
| [`api/student-update.php`](file:///d:/APPS/website/student_port/api/student-update.php) | `POST` | Update whitelisted profile fields (JSON body, requires `id` or `rollNo`) |
| [`api/student-photo.php`](file:///d:/APPS/website/student_port/api/student-photo.php) | `POST` | Upload student photo (multipart `photo`: jpg/png/webp, max 2MB) |

---

## 4. Student Profile Feature (migration + seed + APIs)

The student-profile feature adds 17 columns to `students` plus a new
`student_documents` table. Two setup paths are provided.

### Path A — Existing database (migrate what you already have)

Run the migration, then the profile seed, in this order:

```bash
# 1. Apply the migration (adds columns + student_documents table; idempotent, safe to re-run)
mysql -u root -p edutrack < database/migration_student_profile.sql

# 2. Back-fill profile data for all 124 students + their 496 documents (idempotent, safe to re-run)
mysql -u root -p edutrack < database/seed_student_profile.sql
```

`seed_student_profile.sql` is deterministic: it sets register_no, section, dob,
gender, course, admission_year, blood_group, category, address, languages_known,
guardian_name, guardian_phone, emergency_contact, relationship, credits, backlogs
for every student and inserts 3–5 documents each. `photo` stays `NULL` so the
frontend shows the initials avatar. Run it again any time to reset profile data.

### Path B — Fresh install (full rebuild)

`schema.sql` and `seed.sql` already include the profile columns and the
`student_documents` table, so a fresh install needs nothing extra:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p edutrack < database/seed.sql
```

### Local test instance (MariaDB on port 3307, no root password)

A throwaway instance was used while developing/testing this feature:

```bash
mariadb-install-db --basedir=/usr --datadir=./mysql-data --auth-root-authentication-method=normal --user=<user>
mariadbd --datadir=./mysql-data --basedir=/usr --user=<user> --port=3307 \
  --socket=./mysql-run/mysqld.sock --pid-file=./mysql-run/mysqld.pid \
  --log-error=./mysql-run/error.log --bind-address=127.0.0.1

mysql -h127.0.0.1 -P3307 -uroot < database/schema.sql
mysql -h127.0.0.1 -P3307 -uroot < database/seed.sql
mysql -h127.0.0.1 -P3307 -uroot edutrack < database/migration_student_profile.sql
mysql -h127.0.0.1 -P3307 -uroot edutrack < database/seed_student_profile.sql

# Serve the app against the test DB (config.php reads DB_PORT from env):
DB_PORT=3307 php -S localhost:8001 -t .
```
