/**
 * EduTrack Shared Application Logic
 */

// Helper: Department Color Maps
const DeptColors = {
  "Computer Science": { color: "#67e8f9", bg: "rgba(56, 189, 248, 0.15)", icon: "laptop" },
  "Electronics": { color: "#d8b4fe", bg: "rgba(168, 85, 247, 0.15)", icon: "cpu" },
  "Mechanical": { color: "#fdba74", bg: "rgba(249, 115, 22, 0.15)", icon: "cog" },
  "Civil": { color: "#67e8f9", bg: "rgba(6, 182, 212, 0.15)", icon: "building" },
  "AI & Data Science": { color: "#67e8f9", bg: "rgba(56, 189, 248, 0.15)", icon: "sparkles" },
  "Biotechnology": { color: "#fbcfe8", bg: "rgba(236, 72, 153, 0.15)", icon: "dna" },
  "Electrical": { color: "#fde68a", bg: "rgba(234, 179, 8, 0.15)", icon: "zap" },
  "Information Technology": { color: "#67e8f9", bg: "rgba(99, 102, 241, 0.15)", icon: "database" },
  "Mathematics": { color: "#6ee7b7", bg: "rgba(20, 184, 166, 0.15)", icon: "calculator" },
  "Physics": { color: "#d8b4fe", bg: "rgba(139, 92, 246, 0.15)", icon: "atom" },
  "Chemistry": { color: "#6ee7b7", bg: "rgba(16, 185, 129, 0.15)", icon: "flask" },
  "Commerce": { color: "#fdba74", bg: "rgba(245, 158, 11, 0.15)", icon: "trending-up" },
  "BSc Computer Science": { color: "#67e8f9", bg: "rgba(34, 211, 238, 0.15)", icon: "laptop" },
  "BA English": { color: "#fbcfe8", bg: "rgba(244, 63, 94, 0.15)", icon: "book-open" }
};

function getDeptStyle(deptName) {
  return DeptColors[deptName] || { color: "#67e8f9", bg: "rgba(56, 189, 248, 0.15)", icon: "book-open" };
}

// Bright tint per department tag text (backgrounds come from getDeptStyle)
const DeptColorsBright = {
  "Computer Science": "#7dd3fc",
  "Electronics": "#e9d5ff",
  "Mechanical": "#fed7aa",
  "Civil": "#a5f3fc",
  "AI & Data Science": "#bae6fd",
  "Biotechnology": "#fbcfe8",
  "Electrical": "#fde68a",
  "Information Technology": "#c7d2fe",
  "Mathematics": "#99f6e4",
  "Physics": "#ddd6fe",
  "Chemistry": "#6ee7b7",
  "Commerce": "#fde68a",
  "BSc Computer Science": "#7dd3fc",
  "BA English": "#fecaca"
};

function getDeptColorBright(deptName) {
  return DeptColorsBright[deptName] || "#7dd3fc";
}

function getDeptTagStyle(deptName) {
  const base = getDeptStyle(deptName);
  return `background:${base.bg}; color:${getDeptColorBright(deptName)};`;
}

// Generate circular SVG ring
function createProgressRingSvg(percent, strokeColor = "#10b981", radius = 14, strokeWidth = 3) {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return `
    <svg height="${radius * 2}" width="${radius * 2}" style="transform: rotate(-90deg);">
      <circle
        stroke="rgba(255, 255, 255, 0.12)"
        fill="transparent"
        stroke-width="${strokeWidth}"
        r="${normalizedRadius}"
        cx="${radius}"
        cy="${radius}"
      />
      <circle
        stroke="${strokeColor}"
        fill="transparent"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference} ${circumference}"
        style="stroke-dashoffset: ${strokeDashoffset}; stroke-linecap: round;"
        r="${normalizedRadius}"
        cx="${radius}"
        cy="${radius}"
      />
    </svg>
  `;
}

// Generate SVG Sparklines
function createSparklineSvg(dataPoints, strokeColor = "#38bdf8", width = 80, height = 24) {
  if (!dataPoints || dataPoints.length < 2) return '';
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;
  const step = width / (dataPoints.length - 1);

  const points = dataPoints.map((val, idx) => {
    const x = idx * step;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
      <polyline
        fill="none"
        stroke="${strokeColor}"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        points="${points}"
      />
    </svg>
  `;
}

// Highlight active top nav and sidebar links based on URL
function setupNavigation() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  // student-profile.html is part of the Students section
  const activePath = currentPath === 'student-profile.html' ? 'students.html' : currentPath;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === activePath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  document.querySelectorAll('.sidebar-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href === activePath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Global search input handling
  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = globalSearch.value.trim();
        if (val) {
          window.location.href = `students.html?search=${encodeURIComponent(val)}`;
        }
      }
    });
  }
}

// Common Student Modal
function openStudentModal(student) {
  let modal = document.getElementById('studentDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'studentDetailModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const deptStyle = getDeptStyle(student.dept);

  modal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close-btn" onclick="closeStudentModal()">&times;</button>
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div class="student-avatar-icon" style="width:60px; height:60px; font-size:1.4rem;">
          <i data-lucide="user"></i>
          ${student.avatar ? `<img src="${student.avatar}" alt="${student.name}" class="student-avatar-img" onerror="this.remove();">` : ``}
        </div>
        <div>
          <h3 style="font-size:1.25rem; font-weight:700; color:#fff;">${student.name}</h3>
          <p style="font-size:0.85rem; color:rgba(255,255,255,0.90);">Roll No: <span style="color:#fff; font-weight:700;">${student.rollNo}</span></p>
          <span class="dept-tag" style="${getDeptTagStyle(student.dept)} margin-top:4px;">
            ${student.dept}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block;">Overall Marks</span>
          <span style="font-size:1.25rem; font-weight:700; color:#fff;">${student.marks === null || student.marks === undefined ? '—' : student.marks + '%'}</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block;">Attendance</span>
          <span style="font-size:1.25rem; font-weight:700; color:#fff;">${student.attendance}%</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block;">Academic Year</span>
          <span style="font-size:1.1rem; font-weight:700; color:#fff;">${student.year === null || student.year === undefined ? 'Year —' : 'Year ' + student.year}</span>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block;">Current Semester</span>
          <span style="font-size:1.1rem; font-weight:700; color:#fff;">${student.semester === null || student.semester === undefined ? 'Semester —' : 'Semester ' + student.semester}</span>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.05); padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); margin-bottom:20px;">
        <label for="avatarUrlInput" style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block; margin-bottom:8px; font-weight:600;">Student Photo URL (Cloudinary)</label>
        <div style="display:flex; gap:8px;">
          <input type="text" id="avatarUrlInput" value="${student.avatar || ''}" placeholder="https://res.cloudinary.com/..." style="flex:1; background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.20); border-radius:10px; padding:10px 12px; color:#fff; font-size:0.82rem; font-family:inherit; outline:none;">
          <button id="btnSaveAvatar" class="btn-primary" style="padding:10px 16px; font-size:0.82rem; border-radius:10px; cursor:pointer; font-weight:700;" onclick="saveStudentAvatar(${student.id})">
            <i data-lucide="save" style="width:15px;height:15px;"></i> Save
          </button>
        </div>
        <p style="font-size:0.7rem; color:rgba(255,255,255,0.80); margin-top:8px;">Paste the Cloudinary image URL — it is saved to this student's avatar.</p>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button class="btn-secondary" style="padding:8px 16px; font-size:0.82rem; cursor:pointer; border:none;" onclick="openStudentFormModal(${student.id})">
          <i data-lucide="pencil" style="width:15px;height:15px;"></i> Edit
        </button>
        <button class="btn-secondary" style="padding:8px 16px; font-size:0.82rem; cursor:pointer; border:none; color:#ffb4b4;" onclick="deleteStudent(${student.id}, '${String(student.rollNo).replace(/'/g, "\\'")}')">
          <i data-lucide="trash-2" style="width:15px;height:15px;"></i> Delete
        </button>
        <a class="btn-secondary" href="student-profile.html?id=${student.id}" style="padding:8px 16px; text-decoration:none; font-size:0.82rem;">
          <i data-lucide="user" style="width:15px;height:15px;"></i> View Profile
        </a>
        <button class="btn-primary" style="padding:8px 20px;" onclick="closeStudentModal()">Done</button>
      </div>
    </div>
  `;

  modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function closeStudentModal() {
  const modal = document.getElementById('studentDetailModal');
  if (modal) modal.classList.remove('open');
}

// ---------------------------------------------------------------------------
// Create / edit student
// ---------------------------------------------------------------------------
// HTML-escaping helpers, so database text can never inject markup.
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(value) {
  return esc(value).replace(/'/g, '&#39;');
}

// Builds the create or edit form. `id === 0` creates a new student, otherwise
// the student is loaded and updated in place. Values come from the database
// via api/students.php + api/semesters.php + api/departments.php; nothing here
// invents a department or semester.
let _studentFormDepartments = [];
let _studentFormSemesters = [];

async function openStudentFormModal(id = 0) {
  const editing = Number(id) > 0;
  let student = null;

  if (editing) {
    const profile = await API.getStudent(id);
    student = profile.student || profile;
    if (!student || !student.id) { alert('Could not load that student.'); return; }
  }

  if (_studentFormDepartments.length === 0) {
    const d = await API.getDepartments();
    _studentFormDepartments = d.departments || [];
  }
  if (_studentFormSemesters.length === 0) {
    const s = await API.getSemesters();
    _studentFormSemesters = s.semesters || [];
  }

  let modal = document.getElementById('studentFormModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'studentFormModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  // Department is returned by student.php as a name, so match on that.
  const v = (key) => (student && student[key] !== null && student[key] !== undefined) ? String(student[key]) : '';
  const deptOptions = _studentFormDepartments
    .map(d => `<option value="${escAttr(d.id)}" ${student && String(student.dept) === String(d.name) ? 'selected' : ''}>${esc(d.name)}</option>`)
    .join('');
  const semOptions = _studentFormSemesters
    .map(s => `<option value="${escAttr(s.id)}" ${student && Number(student.semester) === Number(s.semesterNumber) ? 'selected' : ''}>Semester ${s.semesterNumber}${s.academicYear ? ' (' + esc(s.academicYear) + ')' : ''}</option>`)
    .join('');

  const field = (label, inner) => `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <label style="font-size:0.72rem; color:rgba(255,255,255,0.90); font-weight:600;">${label}</label>
      ${inner}
    </div>`;

  const input = (id, name, value, type = 'text', placeholder = '') => `
    <input type="${type}" id="sf_${id}" name="${name}" value="${escAttr(value)}" placeholder="${escAttr(placeholder)}"
      style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.20); border-radius:10px; padding:10px 12px; color:#fff; font-size:0.82rem; font-family:inherit; outline:none; width:100%;">`;

  const select = (id, name, options) => `
    <select id="sf_${id}" name="${name}"
      style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.20); border-radius:10px; padding:10px 12px; color:#fff; font-size:0.82rem; font-family:inherit; outline:none; width:100%;">
      ${options}
    </select>`;

  modal.innerHTML = `
    <div class="modal-card" style="max-width:720px; max-height:88vh; overflow-y:auto;">
      <button class="modal-close-btn" onclick="closeStudentFormModal()">&times;</button>
      <h3 style="font-size:1.15rem; font-weight:700; color:#fff; margin-bottom:4px;">
        ${editing ? 'Edit Student' : 'Add Student'}
      </h3>
      <p style="font-size:0.75rem; color:rgba(255,255,255,0.80); margin-bottom:18px;">
        ${editing ? 'Changes are saved straight to the database.' : 'The new student is written to the database immediately.'}
      </p>

      <form id="studentForm" onsubmit="submitStudentForm(event, ${editing ? student.id : 0})"
            style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        ${field('Full Name *', input('name', 'name', v('name'), 'text', 'e.g. Arun Kumar'))}
        ${field('Roll Number *', input('rollNo', 'rollNo', v('rollNo'), 'text', 'e.g. 24CS101'))}
        ${field('Email', input('email', 'email', v('email'), 'email', 'name@example.com'))}
        ${field('Phone', input('phone', 'phone', v('phone'), 'tel', '10-digit mobile number'))}
        ${field('Department *', select('departmentId', 'departmentId',
            _studentFormDepartments.length ? deptOptions : '<option value="">No departments in database</option>'))}
        ${field('Semester *', select('semesterId', 'semesterId',
            _studentFormSemesters.length ? semOptions : '<option value="">No semesters in database</option>'))}
        ${field('Section', input('section', 'section', v('section'), 'text', 'e.g. A'))}
        ${field('Year of Study *', select('year', 'year',
            [1, 2, 3, 4].map(y =>
              `<option value="${y}" ${v('year') === String(y) ? 'selected' : ''}>Year ${y}</option>`).join('')))}
        ${field('Course', input('course', 'course', v('course'), 'text', 'e.g. B.Sc Computer Science'))}
        ${field('Date of Birth', input('dob', 'dob', v('dob'), 'date'))}
        ${field('Gender', select('gender', 'gender',
            ['', 'Male', 'Female', 'Other'].map(g =>
              `<option value="${g}" ${v('gender') === g ? 'selected' : ''}>${g || 'Not specified'}</option>`).join('')))}
        ${field('Category', select('category', 'category',
            ['', 'General', 'OBC', 'BC', 'MBC', 'SC', 'ST', 'EWS'].map(c =>
              `<option value="${c}" ${v('category') === c ? 'selected' : ''}>${c || 'Not specified'}</option>`).join('')))}
        ${field('Blood Group', select('bloodGroup', 'bloodGroup',
            ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b =>
              `<option value="${b}" ${v('bloodGroup') === b ? 'selected' : ''}>${b || 'Not specified'}</option>`).join('')))}
        ${field('Address', input('address', 'address', v('address'), 'text'))}
        ${field('Guardian Name', input('guardianName', 'guardianName', v('guardianName'), 'text'))}
        ${field('Guardian Phone', input('guardianPhone', 'guardianPhone', v('guardianPhone'), 'tel'))}
        ${field('Emergency Contact', input('emergencyContact', 'emergencyContact', v('emergencyContact'), 'tel'))}
        ${field('Relationship To Guardian', input('relationship', 'relationship', v('relationship'), 'text', 'e.g. Father'))}
        ${field('Languages Known', input('languages', 'languages', v('languages'), 'text', 'e.g. English, Tamil'))}
        <div id="sf_error" style="grid-column:1 / -1; display:none; background:rgba(255,80,80,0.12); border:1px solid rgba(255,120,120,0.35); border-radius:10px; padding:10px 12px; font-size:0.78rem; color:#ffc9c9;"></div>
        <div style="grid-column:1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
          <button type="button" class="btn-secondary" style="padding:9px 18px; cursor:pointer; border:none; font-size:0.82rem;" onclick="closeStudentFormModal()">Cancel</button>
          <button type="submit" id="sf_submit" class="btn-primary" style="padding:9px 22px; font-size:0.82rem; cursor:pointer;">
            <i data-lucide="save" style="width:15px;height:15px;"></i> ${editing ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  `;

  modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function closeStudentFormModal() {
  const modal = document.getElementById('studentFormModal');
  if (modal) modal.classList.remove('open');
}

async function submitStudentForm(event, id) {
  event.preventDefault();

  const btn = document.getElementById('sf_submit');
  const errBox = document.getElementById('sf_error');
  const original = btn.innerHTML;

  const value = (name) => {
    const el = document.querySelector('#studentForm [name="' + name + '"]');
    return el ? el.value.trim() : '';
  };

  const payload = {
    name: value('name'),
    rollNo: value('rollNo'),
    email: value('email'),
    phone: value('phone'),
    departmentId: value('departmentId'),
    semesterId: value('semesterId'),
    section: value('section'),
    year: value('year'),
    course: value('course'),
    dob: value('dob'),
    gender: value('gender'),
    category: value('category'),
    bloodGroup: value('bloodGroup'),
    address: value('address'),
    guardianName: value('guardianName'),
    guardianPhone: value('guardianPhone'),
    emergencyContact: value('emergencyContact'),
    relationship: value('relationship'),
    languages: value('languages')
  };

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:15px;height:15px;"></i> Saving...';
  if (window.lucide) lucide.createIcons();

  try {
    if (Number(id) > 0) {
      await API.updateStudentFull(Number(id), payload);
      alert('Student updated.');
    } else {
      await API.createStudent(payload);
      alert('Student created.');
    }
    closeStudentFormModal();
    closeStudentModal();
    if (typeof loadStudents === 'function') loadStudents();
  } catch (err) {
    const msg = (err && err.message) ? err.message : 'Unknown error';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = msg;
    } else {
      alert('Save failed: ' + msg);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    if (window.lucide) lucide.createIcons();
  }
}

// ---------------------------------------------------------------------------
// Delete student
// ---------------------------------------------------------------------------
// This calls api/delete-student.php, which removes the student row and cascades
// to marks, results and attendance. It is a hard delete, so the roll number
// must be typed back to confirm.
async function deleteStudent(id, rollNo) {
  const typed = prompt(
    'Permanently delete student ' + rollNo + '?\n\n' +
    'This also deletes their marks, results and every attendance record.\n' +
    'Type the roll number to confirm:'
  );
  if (typed === null) return;
  if (typed.trim() !== String(rollNo)) {
    alert('Roll number did not match. Nothing was deleted.');
    return;
  }

  try {
    await API.deleteStudent(Number(id));
    closeStudentModal();
    if (typeof loadStudents === 'function') loadStudents();
    alert('Student deleted.');
  } catch (err) {
    alert('Delete failed: ' + ((err && err.message) || 'Unknown error'));
  }
}

// Save a student's avatar (Cloudinary URL) via the backend
async function saveStudentAvatar(id) {
  const input = document.getElementById('avatarUrlInput');
  const btn = document.getElementById('btnSaveAvatar');
  const url = input ? input.value.trim() : '';
  if (!btn) return;

  if (url && url.indexOf('://') === -1) {
    alert('Photo URL must be a full URL (e.g. https://res.cloudinary.com/...).');
    return;
  }

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:15px;height:15px;"></i> Saving...';
  if (window.lucide) lucide.createIcons();

  try {
    await API.request('avatar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, avatar: url })
    });
    if (typeof loadStudents === 'function') loadStudents();
    alert('Photo saved successfully!');
  } catch (err) {
    alert('Save failed: ' + (err.message || 'Unknown error'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    if (window.lucide) lucide.createIcons();
  }
}

// ---------------------------------------------------------------------------
// Reference-data filters
// ---------------------------------------------------------------------------
// Fills a <select> with the real departments from the database. Nothing is
// hardcoded, so a department that is renamed, added or removed in MariaDB shows
// up here automatically.
async function populateDepartmentFilter(selectId, allLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const all = select.options.length ? select.options[0].textContent : (allLabel || 'All');
  try {
    const data = await API.getDepartments();
    const departments = data.departments || [];
    select.innerHTML = `<option value="All">${all}</option>` + departments
      .map(d => `<option value="${escAttr(d.name)}">${esc(d.name)}</option>`)
      .join('');
  } catch (err) {
    // Leave the "All" option in place; the list simply stays unfiltered.
    console.warn('Could not load departments:', err && err.message);
  }
}

// Same idea for semesters, using the real semester rows and their live student
// counts.
async function populateSemesterFilter(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const all = select.options.length ? select.options[0].textContent : 'All Semesters';
  try {
    const data = await API.getSemesters();
    const semesters = data.semesters || [];
    select.innerHTML = `<option value="All">${all}</option>` + semesters
      .map(s => `<option value="${s.semesterNumber}">Semester ${s.semesterNumber}${s.academicYear ? ' (' + esc(s.academicYear) + ')' : ''}</option>`)
      .join('');
  } catch (err) {
    console.warn('Could not load semesters:', err && err.message);
  }
}

// Every filter dropdown that must mirror a database table. Each entry is
// [select id, 'dept' | 'semester']. Whichever of these exist on the current page
// get populated; the rest are ignored.
const REFERENCE_FILTERS = [
  ['filterDept', 'dept'],
  ['analyticsDeptFilter', 'dept'],
  ['filterResultDept', 'dept'],
  ['filterSemester', 'semester'],
  ['filterResultSemester', 'semester']
];

async function populateReferenceFilters() {
  await Promise.all(REFERENCE_FILTERS.map(([id, kind]) => {
    if (!document.getElementById(id)) return Promise.resolve();
    return kind === 'dept' ? populateDepartmentFilter(id) : populateSemesterFilter(id);
  }));
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  if (window.lucide) {
    lucide.createIcons();
  }
  // Fill the department/semester filters from MariaDB. Until this resolves the
  // dropdowns hold only their "All" option, which is the correct unfiltered
  // default, so it is safe to start loading data immediately.
  populateReferenceFilters();
});
