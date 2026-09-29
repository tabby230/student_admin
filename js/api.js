/**
 * EduTrack API Client
 * Connects directly to backend endpoints (api/*.php)
 * Prepared with error reporting and direct query parameter support
 */

const API = {
  // Base endpoint - relative path works for localhost
  baseUrl: 'api/',

  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    const response = await fetch(url, options);
    if (!response.ok) {
      let errMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) {
          errMsg = errorJson.message;
        }
      } catch (e) {
        // Not a JSON response
      }
      throw new Error(errMsg);
    }
    return await response.json();
  },

  // 1. Overview Stats (Total students, Departments, Avg score, Pass rate)
  async getStats() {
    return this.request('stats.php');
  },

  // 2. Top Performers for Hero/Home
  async getTopPerformers() {
    return this.request('top-performers.php');
  },

  // 3. Students list with search, dept, year, semester, page, per_page
  async getStudents(filters = {}) {
    const cleanFilters = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        cleanFilters[key] = val;
      }
    }
    const queryParams = new URLSearchParams(cleanFilters).toString();
    const endpoint = queryParams ? `students.php?${queryParams}` : 'students.php';
    return this.request(endpoint);
  },

  // 4. Departments list with student counts and average scores
  async getDepartments() {
    return this.request('departments.php');
  },

  // 5. Results data with department, semester, grade, and search filters
  async getResults(filters = {}) {
    const cleanFilters = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        cleanFilters[key] = val;
      }
    }
    const queryParams = new URLSearchParams(cleanFilters).toString();
    const endpoint = queryParams ? `results.php?${queryParams}` : 'results.php';
    return this.request(endpoint);
  },

  // 6. Analytics data with filters (department, semester, year, date range)
  async getAnalytics(filters = {}) {
    const cleanFilters = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        cleanFilters[key] = val;
      }
    }
    const queryParams = new URLSearchParams(cleanFilters).toString();
    const endpoint = queryParams ? `analytics.php?${queryParams}` : 'analytics.php';
    return this.request(endpoint);
  },

  // 7. Export Results as CSV
  getExportUrl(filters = {}) {
    const cleanFilters = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        cleanFilters[key] = val;
      }
    }
    const queryParams = new URLSearchParams(cleanFilters).toString();
    return `${this.baseUrl}export.php${queryParams ? '?' + queryParams : ''}`;
  },

  // 8. Import Students via CSV file upload
  async importStudents(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('import.php', {
      method: 'POST',
      body: formData
    });
  },

  // 9. Complete single-student profile (by numeric id)
  async getStudent(id) {
    return this.request(`student.php?id=${encodeURIComponent(id)}`);
  },

  // 10. Update a student's personal/contact details (JSON POST)
  async updateStudent(data) {
    return this.request('student-update.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // 11. Upload a student profile photo (multipart/form-data). `idOrRoll` may be
  //     a numeric id or a roll number; a brand new student has no id yet, so it
  //     is addressed by roll number until the next edit.
  async uploadStudentPhoto(idOrRoll, file) {
    const key = String(idOrRoll === null || idOrRoll === undefined ? '' : idOrRoll).trim();
    if (!key) throw new Error('A student id or roll number is required to save a photo.');
    const formData = new FormData();
    if (/^\d+$/.test(key)) formData.append('id', Number(key));
    else formData.append('roll', key.toUpperCase());
    formData.append('photo', file);
    return this.request('student-photo.php', {
      method: 'POST',
      body: formData
    });
  },

  // ------------------------------------------------------------------
  // Student CRUD. Every field is validated server-side against the live
  // `students` schema (see api/student-fields.php), so the UI can send a
  // partial or complete profile without guessing column names.
  // ------------------------------------------------------------------

  // 12. Create a student. `data` is keyed by API field names (rollNo, name,
  //     departmentId, semesterId, ...). Every field is validated server-side
  //     against the live `students` schema by api/student-fields.php, which is
  //     an include-only library rather than an HTTP endpoint. Returns the
  //     persisted row.
  async createStudent(data) {
    return this.request('create-student.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // 13. Update a student, addressed by numeric id or roll number.
  async updateStudentFull(idOrRoll, data) {
    const key = typeof idOrRoll === 'number' ? { id: idOrRoll } : { rollNo: idOrRoll };
    return this.request('update-student.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...key, ...data })
    });
  },

  // 14. Delete a student. `confirmRollNo` must match the stored roll number so
  //     an accidental call cannot remove the wrong record.
  async deleteStudent(id, confirmRollNo) {
    return this.request('delete-student.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, confirmRollNo })
    });
  },

  // ------------------------------------------------------------------
  // Attendance. Percentages are always derived from attendance_records:
  //   (present + late) / (present + late + absent) * 100  [excused excluded]
  // ------------------------------------------------------------------

  // 15. Roster of students that can be marked for a session.
  async getAttendanceRoster(semesterId, departmentId) {
    const q = new URLSearchParams({ action: 'roster', semesterId });
    if (departmentId) q.append('departmentId', departmentId);
    return this.request(`attendance.php?${q.toString()}`);
  },

  // 16. One student's real attendance: totals, percentage, monthly series,
  //     per-semester breakdown and their own record history.
  async getStudentAttendance(studentId) {
    return this.request(`attendance.php?action=student&studentId=${encodeURIComponent(studentId)}`);
  },

  // 17. Paginated session list, newest first by default.
  async getAttendanceSessions(filters = {}) {
    const clean = { action: 'sessions' };
    for (const key of ['semesterId', 'subjectId', 'source', 'date', 'studentId', 'page', 'perPage', 'sort', 'dir']) {
      const val = filters[key];
      if (val !== undefined && val !== null && val !== '') clean[key] = val;
    }
    return this.request(`attendance.php?${new URLSearchParams(clean).toString()}`);
  },

  // 18. Mark (or re-mark) a session. Re-marking the same
  //     subject+semester+date updates the existing session, so this is
  //     idempotent rather than duplicating rows.
  //     records: [{ studentId, status: 'present'|'absent'|'late'|'excused' }]
  async markAttendance(payload) {
    return this.request('mark-attendance.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  // 19. Amend individual statuses inside an existing session.
  async updateAttendance(sessionId, records) {
    return this.request('update-attendance.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, records })
    });
  },

  // 20. Delete a session and its records. Migrated legacy sessions are
  //     protected unless onlyLegacy is explicitly true.
  async deleteAttendanceSession(sessionId, onlyLegacy = false) {
    return this.request('delete-session.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, onlyLegacy })
    });
  },

  // 21. Reference data for the admin forms: the real semesters (with live
  //     student counts) and, for one semester, its real subjects.
  async getSemesters(semesterId = 0) {
    const q = new URLSearchParams({ withSubjects: '1' });
    if (semesterId > 0) q.set('semesterId', String(semesterId));
    return this.request('semesters.php?' + q.toString());
  },

  // 22. Students marked absent, for the notification bell. Defaults to today;
  //     the endpoint falls back to the most recent dated session and says so
  //     via `isFallback`, because the database has no session for today until
  //     an admin marks one.
  async getAbsentees(filters = {}) {
    const q = new URLSearchParams();
    if (filters.date) q.set('date', filters.date);
    if (filters.semesterId) q.set('semesterId', String(filters.semesterId));
    if (filters.departmentId) q.set('departmentId', String(filters.departmentId));
    return this.request('absentees.php' + (q.toString() ? '?' + q.toString() : ''));
  }
};

window.API = API;
