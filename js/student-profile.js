/**
 * EduTrack — Student Profile Page
 * Loads api/student.php?id=... and renders the full profile with
 * tabs (Overview / Academic / Attendance / Results / Documents).
 * Everything comes from the API — no inline/hardcoded student data.
 */
(function () {
  'use strict';

  // ===================================================================
  // Config / state
  // ===================================================================
  const params = new URLSearchParams(window.location.search);
  const studentId = (params.get('id') || '').trim();

  let student = null;
  let currentTab = 'overview';
  let photoInputBound = false;
  let dropdownBound = false;
  const chartInstances = { sgpa: null, monthly: null };

  const TABS = ['overview', 'academic', 'attendance', 'results', 'documents'];

  // Bright grade text tints (badge backgrounds stay translucent)
  const gradeTints = {
    O: '#6ee7b7',
    'A+': '#7dd3fc',
    A: '#e9d5ff',
    'B+': '#fde68a',
    B: '#fed7aa',
    C: '#fca5a5'
  };

  const docTypeIcons = {
    identity: 'id-card',
    academic: 'file-text',
    certificate: 'award',
    fee: 'receipt'
  };

  // ===================================================================
  // Helpers
  // ===================================================================
  function esc(value) {
    const d = document.createElement('div');
    d.textContent = value === null || value === undefined ? '' : String(value);
    return d.innerHTML;
  }

  function romanNumeral(num) {
    const table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let n = num;
    let out = '';
    for (const [value, symbol] of table) {
      while (n >= value) { out += symbol; n -= value; }
    }
    return out;
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function fmtNumber(value, decimals) {
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toFixed(decimals === undefined ? 0 : decimals);
  }

  function attendanceColor(pct) {
    if (pct >= 90) return '#10b981';
    if (pct >= 75) return '#38bdf8';
    return '#ef4444';
  }

  function gradeColor(grade) {
    return gradeTints[grade] || '#fed7aa';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return esc(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return (isNaN(m) || isNaN(d) || !months[m]) ? esc(iso) : `${d} ${months[m]} ${parts[0]}`;
  }

  function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    toast.innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px;flex-shrink:0;"></i><span>${esc(message)}</span>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 350);
    }, 3400);
  }

  // Count-up animation for stat values
  function animateCount(el, target, decimals, suffix) {
    const duration = 900;
    const start = performance.now();
    el.textContent = (0).toFixed(decimals);
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + (suffix || '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ===================================================================
  // Load / error / skeleton handling
  // ===================================================================
  function showSkeleton() {
    document.getElementById('profileSkeleton').style.display = '';
    document.getElementById('profileError').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
  }

  function showError(title, message) {
    document.getElementById('profileSkeleton').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('profileError').style.display = '';
  }

  async function loadProfile() {
    showSkeleton();
    if (!studentId) {
      showError('No student selected', 'Add a student id to the URL, e.g. student-profile.html?id=1');
      return;
    }
    try {
      student = await API.getStudent(studentId);
      currentTab = normalizeTab(window.location.hash);
      renderProfile();
    } catch (err) {
      showError('Unable to load profile', err.message || 'Something went wrong while fetching this student.');
    }
  }

  function normalizeTab(hash) {
    const name = hash ? hash.replace('#', '').toLowerCase() : '';
    return TABS.indexOf(name) !== -1 ? name : 'overview';
  }

  // ===================================================================
  // Main render
  // ===================================================================
  function renderProfile() {
    const leftCol = buildLeftColumn();
    const rightCol = buildRightColumn();
    document.getElementById('profileContent').innerHTML = `
      <div class="profile-side">${leftCol}</div>
      <div>${rightCol}</div>
    `;
    document.getElementById('profileSkeleton').style.display = 'none';
    document.getElementById('profileError').style.display = 'none';
    document.getElementById('profileContent').style.display = '';

    // Wire up interactions
    bindTabs();
    bindCameraButton();
    bindBacklogsTile();
    bindDropdown();
    bindPhotoInput();
    bindResultsAndDocs();
    switchTab(currentTab, false);
    if (window.lucide) lucide.createIcons();
  }

  // Generic per-field display helper
  function statTile(icon, label, id, accentClass, iconColor) {
    return `
      <div class="quick-stat-tile ${accentClass}">
        <div class="quick-stat-head">
          <span class="quick-stat-icon" style="background:${iconColor || 'linear-gradient(135deg, #2563eb, #38bdf8)'};">
            <i data-lucide="${icon}" style="width:13px;height:13px;"></i>
          </span>
          <span class="quick-stat-label">${esc(label)}</span>
        </div>
        <div class="quick-stat-value" id="${id}">0</div>
      </div>
    `;
  }

  function buildLeftColumn() {
    const s = student;
    const photoSrc = s.avatar || s.photo;
    const avatarHtml = photoSrc
      ? `<div class="initials-avatar">${esc(initials(s.name))}</div><img src="${esc(photoSrc)}" alt="${esc(s.name)}" class="profile-avatar-img" onerror="this.remove();">`
      : `<div class="initials-avatar">${esc(initials(s.name))}</div>`;

    const backlogs = (s.stats && s.stats.backlogs) || 0;

    return `
      <!-- Identity card -->
      <div class="glass-panel profile-card">
        <div class="avatar-ring" id="avatarRing">
          ${avatarHtml}
        </div>
        <button type="button" class="camera-btn" id="cameraBtn" title="Change photo">
          <i data-lucide="camera" style="width:16px;height:16px;"></i>
        </button>

        <div class="profile-name">${esc(s.name)}</div>
        <span class="roll-chip">
          <i data-lucide="hash" style="width:12px;height:12px;"></i>
          ${esc(s.rollNo)}
        </span>
        <div class="profile-course">${esc(s.course || s.dept)}</div>

        <div class="year-sem-row">
          <span class="year-sem-chip">
            <i data-lucide="calendar" style="width:13px;height:13px;color:#7dd3fc;"></i>
            ${esc(romanNumeral(s.year))} Year
          </span>
          <span class="year-sem-chip">
            <i data-lucide="book-open" style="width:13px;height:13px;color:#a78bfa;"></i>
            Semester ${esc(romanNumeral(s.semester))}
          </span>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="glass-panel" style="padding:18px;">
        <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); text-shadow:var(--text-shadow-glass); margin-bottom:14px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="gauge" style="width:17px;height:17px;color:#38bdf8;"></i> Quick Stats
        </div>
        <div class="quick-stats-grid">
          ${statTile('trending-up', 'CGPA', 'qStatCgpa', 'qs-blue', 'linear-gradient(135deg, #2563eb, #38bdf8)')}
          ${statTile('award', 'SGPA', 'qStatSgpa', 'qs-purple', 'linear-gradient(135deg, #7c3aed, #a855f7)')}
          ${statTile('shield-check', 'Attendance', 'qStatAtt', 'qs-teal', 'linear-gradient(135deg, #059669, #10b981)')}
          ${statTile('layers', 'Credits', 'qStatCredits', 'qs-orange', 'linear-gradient(135deg, #ea580c, #f97316)')}
          <div class="backlogs-tile ${backlogs === 0 ? 'ok' : ''}" id="backlogsTile" title="View academic details">
            <div class="backlogs-info">
              <span class="quick-stat-icon" style="background:${backlogs === 0 ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #b91c1c, #ef4444)'};">
                <i data-lucide="${backlogs === 0 ? 'check-circle' : 'alert-triangle'}" style="width:15px;height:15px;"></i>
              </span>
              <span>
                <span class="bl-label">${backlogs === 0 ? 'No Backlogs' : 'Backlogs'}</span>
                <div class="quick-stat-value" id="qStatBacklogs" style="font-size:1.15rem;">0</div>
              </span>
            </div>
            <i data-lucide="arrow-right" class="bl-arrow" style="width:17px;height:17px;"></i>
          </div>
        </div>
      </div>
    `;
  }

  function buildRightColumn() {
    return `
      <div class="profile-tabs" id="profileTabs">
        <button class="profile-tab" data-tab="overview"><i data-lucide="id-card" style="width:15px;height:15px;"></i> Overview</button>
        <button class="profile-tab" data-tab="academic"><i data-lucide="book-open" style="width:15px;height:15px;"></i> Academic</button>
        <button class="profile-tab" data-tab="attendance"><i data-lucide="calendar-check" style="width:15px;height:15px;"></i> Attendance</button>
        <button class="profile-tab" data-tab="results"><i data-lucide="file-text" style="width:15px;height:15px;"></i> Results</button>
        <button class="profile-tab" data-tab="documents"><i data-lucide="folder" style="width:15px;height:15px;"></i> Documents</button>
      </div>

      <div class="tab-panel" data-panel="overview">${renderOverviewTab()}</div>
      <div class="tab-panel" data-panel="academic">${renderAcademicTab()}</div>
      <div class="tab-panel" data-panel="attendance">${renderAttendanceTab()}</div>
      <div class="tab-panel" data-panel="results">${renderResultsTab()}</div>
      <div class="tab-panel" data-panel="documents">${renderDocumentsTab()}</div>
    `;
  }

  // ===================================================================
  // Overview tab
  // ===================================================================
  function renderOverviewTab() {
    const s = student;

    const personalRows = [
      ['Full Name', s.name],
      ['Roll Number', s.rollNo],
      ['Register No', s.registerNo],
      ['Department', s.dept],
      ['Course', s.course],
      ['Section', s.section],
      ['Date of Birth', formatDate(s.dob)],
      ['Gender', s.gender],
      ['Email', s.email],
      ['Phone', s.phone]
    ];

    const contactRows = [
      ['Parent/Guardian', s.guardianName],
      ['Emergency Contact', s.emergencyContact],
      ['Parent Phone', s.guardianPhone],
      ['Relationship', s.relationship]
    ];

    const additionalRows = [
      ['Blood Group', s.bloodGroup],
      ['Category', s.category],
      ['Address', s.address],
      ['Languages Known', s.languages]
    ];

    return `
      <div class="info-grid-2col">
        <div class="glass-panel info-card">
          <div class="info-card-head">
            <div class="info-card-title"><i data-lucide="user" style="width:17px;height:17px;color:#38bdf8;"></i> Personal Information</div>
            <button class="edit-btn" data-edit="personal"><i data-lucide="pen-line" style="width:13px;height:13px;"></i> Edit</button>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${personalRows.map(([label, value]) => `
              <div class="info-item">
                <span class="info-item-label">${esc(label)}</span>
                <span class="info-item-value">${value === null || value === undefined || value === '' ? '—' : esc(value)}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="glass-panel info-card">
          <div class="info-card-head">
            <div class="info-card-title"><i data-lucide="graduation-cap" style="width:17px;height:17px;color:#a855f7;"></i> Academic Information</div>
          </div>
          <div class="academic-cols">
            ${[
              ['calendar', 'Academic Year', s.academicYear],
              ['layers', 'Current Semester', 'Sem ' + (s.semester || '—')],
              ['clock', 'Admission Year', s.admissionYear],
              ['hourglass', 'Course Duration', s.courseDuration]
            ].map(([icon, label, value]) => `
              <div class="academic-col">
                <div class="academic-col-icon"><i data-lucide="${icon}" style="width:16px;height:16px;"></i></div>
                <div class="academic-col-value">${value === null ? '—' : esc(value)}</div>
                <div class="academic-col-label">${esc(label)}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="glass-panel info-card">
          <div class="info-card-head">
            <div class="info-card-title"><i data-lucide="phone-call" style="width:17px;height:17px;color:#10b981;"></i> Contact / Emergency</div>
            <button class="edit-btn" data-edit="contact"><i data-lucide="pen-line" style="width:13px;height:13px;"></i> Edit</button>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${contactRows.map(([label, value]) => `
              <div class="info-item">
                <span class="info-item-label">${esc(label)}</span>
                <span class="info-item-value">${value === null || value === undefined || value === '' ? '—' : esc(value)}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="glass-panel info-card">
          <div class="info-card-head">
            <div class="info-card-title"><i data-lucide="info" style="width:17px;height:17px;color:#eab308;"></i> Additional Details</div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${additionalRows.map(([label, value]) => `
              <div class="info-item">
                <span class="info-item-label">${esc(label)}</span>
                <span class="info-item-value">${value === null || value === undefined || value === '' ? '—' : esc(value)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ===================================================================
  // Academic tab
  // ===================================================================
  function renderAcademicTab() {
    const s = student;
    const subjects = s.subjects || [];
    const semesters = s.semesters || [];
    const stats = s.stats || {};

    let subjectsHtml;
    if (subjects.length === 0) {
      subjectsHtml = `
        <tr><td colspan="5" style="text-align:center; padding:28px; color:var(--text-secondary);">No subject marks recorded for the current semester.</td></tr>`;
    } else {
      subjectsHtml = subjects.map(sub => `
        <tr>
          <td><code>${esc(sub.code)}</code></td>
          <td style="font-weight:700; color:var(--text-primary);">${esc(sub.name)}</td>
          <td><strong style="color:var(--text-primary);">${fmtNumber(sub.marks, 1)}</strong> <span style="color:rgba(255,255,255,0.85);">/ 100</span></td>
          <td>
            <span class="badge-grade" style="background:rgba(255,255,255,0.08); color:${gradeColor(sub.grade)}; border:1px solid rgba(255,255,255,0.18);">
              ${esc(sub.grade || '—')}
            </span>
          </td>
          <td style="color:${sub.status === 'Passed' ? '#6ee7b7' : '#fca5a5'}; font-weight:700;">
            ${esc(sub.status || '—')}
          </td>
        </tr>`).join('');
    }

    return `
      <div class="glass-panel info-card" style="margin-bottom:18px;">
        <div class="panel-section-title">
          <i data-lucide="book-open" style="width:17px;height:17px;color:#38bdf8;"></i>
          Current Semester Subjects — Semester ${esc(romanNumeral(s.semester))}
        </div>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Code</th><th>Subject</th><th>Marks</th><th>Grade</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${subjectsHtml}</tbody>
          </table>
        </div>
      </div>

      <div class="glass-panel info-card" style="margin-bottom:18px;">
        <div class="panel-section-title">
          <i data-lucide="line-chart" style="width:17px;height:17px;color:#a855f7;"></i>
          Semester-wise SGPA
        </div>
        <div class="chart-wrap">
          <canvas id="sgpaChart"></canvas>
        </div>
      </div>

      <div class="glass-panel info-card">
        <div class="panel-section-title">
          <i data-lucide="pie-chart" style="width:17px;height:17px;color:#10b981;"></i>
          Summary
        </div>
        <div class="summary-strips">
          <div class="summary-strip">
            <div class="summary-strip-value" id="acadCgpa">${fmtNumber(stats.cgpa, 2)}</div>
            <div class="summary-strip-label">CGPA</div>
          </div>
          <div class="summary-strip">
            <div class="summary-strip-value" id="acadCredits">${fmtNumber(stats.credits)}</div>
            <div class="summary-strip-label">Credits Earned</div>
          </div>
          <div class="summary-strip">
            <div class="summary-strip-value" id="acadBacklogs">${fmtNumber(stats.backlogs)}</div>
            <div class="summary-strip-label">Backlogs</div>
          </div>
          <div class="summary-strip">
            <div class="summary-strip-value">#${fmtNumber(stats.rank)}</div>
            <div class="summary-strip-label">Class Rank</div>
          </div>
        </div>
      </div>
    `;
  }

  // ===================================================================
  // Attendance tab
  // ===================================================================
  function renderAttendanceTab() {
    const s = student;
    const stats = s.stats || {};
    const overall = Number(stats.attendance) || 0;
    const attColor = attendanceColor(overall);
    const bySem = s.attendanceBySemester || [];
    const below75 = bySem.some(r => r.percentage < 75);
    const months = s.attendanceMonthly || [];

    let perClass = x => {
      if (x >= 90) return 'good';
      if (x >= 75) return 'warn';
      return 'bad';
    };

    // Ring geometry: r=72 -> circumference = 2*PI*72
    const ringCircumference = 2 * Math.PI * 72;
    const ringOffset = ringCircumference - (Math.max(0, Math.min(100, overall)) / 100) * ringCircumference;

    return `
      <div class="glass-panel info-card" style="margin-bottom:18px;">
        <div class="panel-section-title">
          <i data-lucide="calendar-check" style="width:17px;height:17px;color:#10b981;"></i>
          Overall Attendance
        </div>
        <div class="attendance-overview">
          <div class="ring-wrap">
            <svg width="168" height="168" viewBox="0 0 168 168">
              <circle cx="84" cy="84" r="72" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="13"></circle>
              <circle id="attRingFill" cx="84" cy="84" r="72" fill="none" stroke="${attColor}" stroke-width="13"
                stroke-linecap="round" stroke-dasharray="${ringCircumference} ${ringCircumference}"
                stroke-dashoffset="${ringOffset}" style="transition:stroke-dashoffset 1.2s ease;"></circle>
            </svg>
            <div class="ring-center">
              <div class="ring-value" id="ringValue">${fmtNumber(overall, 0)}%</div>
              <div class="ring-label">Overall</div>
            </div>
          </div>
          <div class="attendance-side">
            <div class="att-measure"><span class="att-dot" style="background:#10b981;"></span> 90% and above — Excellent</div>
            <div class="att-measure"><span class="att-dot" style="background:#38bdf8;"></span> 75% – 89% — Good</div>
            <div class="att-measure"><span class="att-dot" style="background:#ef4444;"></span> Below 75% — At risk</div>
          </div>
        </div>

        ${below75 ? `
        <div class="att-note">
          <i data-lucide="triangle-alert" style="width:16px;height:16px;"></i>
          Attendance in one or more semesters is below 75% — required minimum for exams.
        </div>` : ''}
      </div>

      <div class="glass-panel info-card" style="margin-bottom:18px;">
        <div class="panel-section-title">
          <i data-lucide="bar-chart" style="width:17px;height:17px;color:#38bdf8;"></i>
          Monthly Attendance
        </div>
        <div class="chart-wrap">
          <canvas id="monthlyChart"></canvas>
        </div>
      </div>

      <div class="glass-panel info-card">
        <div class="panel-section-title">
          <i data-lucide="list" style="width:17px;height:17px;color:#a855f7;"></i>
          Semester-wise Attendance
        </div>
        <div>
          ${bySem.map(r => `
            <div class="sem-att-row">
              <div class="sem-att-name">Semester ${esc(romanNumeral(r.semester))}</div>
              <div class="progress-track"><div class="progress-fill ${perClass(r.percentage)}" style="width:${Math.max(0, Math.min(100, r.percentage))}%;"></div></div>
              <div class="sem-att-pct" style="color:${attendanceColor(r.percentage)};">${fmtNumber(r.percentage, 1)}%</div>
            </div>`).join('') || '<p style="color:var(--text-secondary); font-size:0.85rem;">No attendance recorded.</p>'}
        </div>
      </div>
    `;
  }

  // ===================================================================
  // Results tab
  // ===================================================================
  function renderResultsTab() {
    const s = student;
    const results = s.results || [];

    if (results.length === 0) {
      return `
        <div class="glass-panel info-card">
          <div class="panel-section-title">
            <i data-lucide="file-text" style="width:17px;height:17px;color:#38bdf8;"></i>
            Examination Results
          </div>
          <div style="padding:40px 20px; text-align:center; color:var(--text-secondary); font-weight:600;">
            <i data-lucide="calendar-x" style="width:42px;height:42px;color:#64748b; margin-bottom:10px;"></i>
            <p>Results for semester ${esc(romanNumeral(s.semester))} are not published yet.</p>
          </div>
        </div>`;
    }

    const latest = results[results.length - 1];
    const selectedSemester = latest.semester;

    return `
      <div id="resultsPrintArea">
        <div class="glass-panel info-card">
          <div class="info-card-head" style="flex-wrap:wrap; gap:10px;">
            <div class="info-card-title">
              <i data-lucide="file-text" style="width:17px;height:17px;color:#38bdf8;"></i>
              Examination Results — ${esc(s.name)}
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <select id="resultsSemSelect" class="select-filter" title="Semester">
                ${results.map(r => `<option value="${esc(r.semester)}" ${r.semester === selectedSemester ? 'selected' : ''}>Semester ${esc(romanNumeral(r.semester))}</option>`).join('')}
              </select>
              <button class="btn-primary" id="btnPrintResults" style="padding:8px 16px; font-size:0.82rem; border-radius:10px; cursor:pointer;">
                <i data-lucide="download" style="width:15px;height:15px;"></i> Download PDF
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="glass-table">
              <thead>
                <tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Status</th></tr>
              </thead>
              <tbody id="resultsTableBody"></tbody>
            </table>
          </div>

          <div class="results-meta-grid" id="resultsMeta">
            <div class="summary-strip">
              <div class="summary-strip-value" id="resTotal">0</div>
              <div class="summary-strip-label">Total Marks</div>
            </div>
            <div class="summary-strip">
              <div class="summary-strip-value" id="resPct">0%</div>
              <div class="summary-strip-label">Percentage</div>
            </div>
            <div class="summary-strip">
              <div class="summary-strip-value" id="resGrade">—</div>
              <div class="summary-strip-label">Grade</div>
            </div>
            <div class="summary-strip">
              <div class="summary-strip-value" id="resRank">—</div>
              <div class="summary-strip-label">Rank</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderResultsForSemester(sem) {
    const s = student;
    const results = s.results || [];
    const row = results.find(r => String(r.semester) === String(sem)) || results[results.length - 1];
    if (!row) return;

    const tbody = document.getElementById('resultsTableBody');
    const subjects = row.subjects || [];
    tbody.innerHTML = subjects.length === 0
      ? `<tr><td colspan="4" style="text-align:center; padding:26px; color:var(--text-secondary);">No marks recorded for this semester.</td></tr>`
      : subjects.map(sub => `
        <tr>
          <td style="font-weight:700; color:var(--text-primary);">${esc(sub.name)}</td>
          <td><strong style="color:var(--text-primary);">${fmtNumber(sub.marks, 1)}</strong> <span style="color:rgba(255,255,255,0.85);">/ 100</span></td>
          <td>
            <span class="badge-grade" style="background:rgba(255,255,255,0.08); color:${gradeColor(sub.grade)}; border:1px solid rgba(255,255,255,0.18);">
              ${esc(sub.grade || '—')}
            </span>
          </td>
          <td style="color:${sub.status === 'Passed' ? '#6ee7b7' : '#fca5a5'}; font-weight:700;">
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
              ${esc(sub.status || '—')}
            </span>
          </td>
        </tr>`).join('');

    document.getElementById('resTotal').textContent = fmtNumber(row.total, 1);
    document.getElementById('resPct').textContent = fmtNumber(row.percentage, 1) + '%';
    document.getElementById('resGrade').textContent = row.grade || '—';
    document.getElementById('resRank').textContent = row.rank ? '#' + row.rank : '—';
  }

  // ===================================================================
  // Documents tab
  // ===================================================================
  function renderDocumentsTab() {
    const docs = (student && student.documents) || [];
    if (docs.length === 0) {
      return `
        <div class="glass-panel info-card">
          <div class="panel-section-title"><i data-lucide="folder" style="width:17px;height:17px;color:#38bdf8;"></i> Documents</div>
          <div style="padding:40px 20px; text-align:center; color:var(--text-secondary); font-weight:600;">No documents uploaded.</div>
        </div>`;
    }

    return `
      <div class="glass-panel info-card">
        <div class="panel-section-title"><i data-lucide="folder" style="width:17px;height:17px;color:#38bdf8;"></i> Documents</div>
        ${docs.map(doc => {
          const icon = docTypeIcons[doc.type] || 'file';
          const verified = String(doc.status).toLowerCase() === 'verified';
          return `
          <div class="doc-row">
            <div class="doc-icon"><i data-lucide="${icon}" style="width:18px;height:18px;"></i></div>
            <div class="doc-info">
              <div class="doc-name">${esc(doc.name)}</div>
              <div class="doc-date"><i data-lucide="calendar" style="width:12px;height:12px;display:inline;"></i> Uploaded ${formatDate(doc.uploadedOn)}</div>
            </div>
            <span class="status-badge ${verified ? 'status-verified' : 'status-pending'}">${esc(doc.status)}</span>
            <button class="view-doc-btn" data-doc="${esc(doc.id)}"><i data-lucide="eye" style="width:14px;height:14px;"></i> View</button>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  // ===================================================================
  // Tabs / hash
  // ===================================================================
  function bindTabs() {
    document.querySelectorAll('.profile-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'), true);
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditModal(btn.getAttribute('data-edit'));
      });
    });
  }

  function switchTab(name, updateHash) {
    currentTab = normalizeTab('#' + name);
    destroyCharts();

    document.querySelectorAll('.profile-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === currentTab);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.getAttribute('data-panel') === currentTab);
    });
    if (window.lucide) lucide.createIcons();

    if (updateHash && window.location.hash !== '#' + currentTab) {
      history.replaceState(null, '', '#' + currentTab);
    }

    // Animations dependent on the visible tab
    if (currentTab === 'academic') initSgpaChart();
    if (currentTab === 'attendance') initMonthlyChart();
    if (currentTab === 'results') renderResultsForSemester(student.results && student.results.length
      ? (document.getElementById('resultsSemSelect') ? document.getElementById('resultsSemSelect').value : student.results[student.results.length - 1].semester)
      : null);

    // Lazy count-ups on first show
    if (currentTab === 'overview') animateOverviewStats();
  }

  function destroyCharts() {
    Object.keys(chartInstances).forEach(key => {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
        chartInstances[key] = null;
      }
    });
  }

  // ===================================================================
  // Charts (Chart.js)
  // ===================================================================
  function initSgpaChart() {
    const canvas = document.getElementById('sgpaChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstances.sgpa) return;

    const semesters = student.semesters || [];
    const labels = semesters.map(r => 'Sem ' + r.semester);
    const data = semesters.map(r => r.sgpa);

    chartInstances.sgpa = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'SGPA',
          data,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          y: { suggestedMin: 0, suggestedMax: 10, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'rgba(255,255,255,0.92)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.92)' } }
        }
      }
    });
  }

  function initMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstances.monthly) return;

    const monthly = student.attendanceMonthly || [];
    const labels = monthly.map(r => r.month);
    const values = monthly.map(r => r.percentage);
    const colors = monthly.map(r => attendanceColor(r.percentage));

    chartInstances.monthly = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Attendance %',
          data: values,
          backgroundColor: colors,
          borderRadius: 6,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          y: { suggestedMin: 0, suggestedMax: 100, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'rgba(255,255,255,0.92)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.92)' } }
        }
      }
    });
  }

  // ===================================================================
  // Animations
  // ===================================================================
  function animateOverviewStats() {
    const stats = student.stats || {};

    const cgpa = Number(stats.cgpa) || 0;
    const sgpa = Number(stats.sgpa) || 0;
    const att = Number(stats.attendance) || 0;
    const credits = Number(stats.credits) || 0;
    const backlogs = Number(stats.backlogs) || 0;

    const elCgpa = document.getElementById('qStatCgpa');
    const elSgpa = document.getElementById('qStatSgpa');
    const elAtt = document.getElementById('qStatAtt');
    const elCredits = document.getElementById('qStatCredits');
    const elBacklogs = document.getElementById('qStatBacklogs');

    if (elCgpa) animateCount(elCgpa, cgpa, 2);
    if (elSgpa) animateCount(elSgpa, sgpa, 2);
    if (elAtt) animateCount(elAtt, att, 0, '%');
    if (elCredits) animateCount(elCredits, credits, 0);
    if (elBacklogs) animateCount(elBacklogs, backlogs, 0);

    // Academic summary strips
    const acadCgpa = document.getElementById('acadCgpa');
    if (acadCgpa) animateCount(acadCgpa, cgpa, 2);

    // Attendance ring
    const ringFill = document.getElementById('attRingFill');
    const ringValue = document.getElementById('ringValue');
    const circumference = 2 * Math.PI * 72;
    if (ringFill && ringValue) {
      ringValue.textContent = '0%';
      animateCount(ringValue, att, 0, '%');
      const targetOffset = circumference - (Math.max(0, Math.min(100, att)) / 100) * circumference;
      setTimeout(() => { ringFill.style.strokeDashoffset = targetOffset; }, 60);
    }
  }

  // ===================================================================
  // Photo upload
  // ===================================================================
  function bindCameraButton() {
    const btn = document.getElementById('cameraBtn');
    if (btn) {
      btn.addEventListener('click', () => { document.getElementById('photoInput').click(); });
    }
  }

  function bindPhotoInput() {
    const input = document.getElementById('photoInput');
    if (photoInputBound || !input) return;
    photoInputBound = true;

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast('Photo must be 2MB or smaller.', 'error');
        input.value = '';
        return;
      }

      const ring = document.getElementById('avatarRing');
      const originalHtml = ring ? ring.innerHTML : '';
      const initialsFallback = `<div class="initials-avatar">${esc(initials(student.name))}</div>`;

      // Instant preview
      const previewUrl = URL.createObjectURL(file);
      if (ring) ring.innerHTML = initialsFallback + `<img src="${previewUrl}" alt="Preview" class="profile-avatar-img" onerror="this.remove();">`;

      try {
        const res = await API.uploadStudentPhoto(studentId, file);
        student.photo = res.photo;
        // Re-render just the avatar with the persisted URL
        if (ring) ring.innerHTML = initialsFallback + `<img src="${esc(res.photo)}" alt="${esc(student.name)}" class="profile-avatar-img" onerror="this.remove();">`;
        showToast(res.message || 'Photo updated successfully.', 'success');
      } catch (err) {
        ring.innerHTML = originalHtml;
        showToast(err.message || 'Photo upload failed.', 'error');
      } finally {
        URL.revokeObjectURL(previewUrl);
        input.value = '';
      }
    });
  }

  // ===================================================================
  // Backlogs tile -> Academic tab
  // ===================================================================
  function bindBacklogsTile() {
    const tile = document.getElementById('backlogsTile');
    if (tile) {
      tile.addEventListener('click', () => switchTab('academic', true));
    }
  }

  // ===================================================================
  // Results select + print
  // ===================================================================
  function bindResultsAndDocs() {
    const sel = document.getElementById('resultsSemSelect');
    if (sel) {
      sel.addEventListener('change', () => renderResultsForSemester(sel.value));
    }
    const printBtn = document.getElementById('btnPrintResults');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
    // View document buttons
    document.querySelectorAll('.view-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast('Preview not available in demo', 'info');
      });
    });
  }

  // ===================================================================
  // Admin dropdown
  // ===================================================================
  function bindDropdown() {
    const pill = document.getElementById('adminPill');
    const dd = document.getElementById('adminDropdown');
    if (!pill || !dd || dropdownBound) return;
    dropdownBound = true;

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
  }

  // ===================================================================
  // Edit modal (personal / contact) with validation
  // ===================================================================
  const fieldConfigs = {
    personal: {
      title: 'Edit Personal Information',
      fields: [
        { key: 'course', label: 'Course', type: 'text' },
        { key: 'section', label: 'Section', type: 'text', validate: v => !v || /^[A-Z]{1,3}$/.test(v) ? '' : 'Section must be 1-3 letters (e.g. A, B).' },
        { key: 'dob', label: 'Date of Birth', type: 'date', validate: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? '' : 'Use YYYY-MM-DD format.' },
        { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
        { key: 'email', label: 'Email', type: 'email', validate: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.' },
        { key: 'phone', label: 'Phone', type: 'tel', validate: v => !v || /^\+?[0-9\s\-]{8,20}$/.test(v) ? '' : 'Enter a valid phone number.' }
      ]
    },
    contact: {
      title: 'Edit Contact / Emergency',
      fields: [
        { key: 'guardianName', label: 'Parent / Guardian Name', type: 'text' },
        { key: 'emergencyContact', label: 'Emergency Contact', type: 'tel', validate: v => !v || /^\+?[0-9\s\-]{8,20}$/.test(v) ? '' : 'Enter a valid phone number.' },
        { key: 'guardianPhone', label: 'Parent Phone', type: 'tel', validate: v => !v || /^\+?[0-9\s\-]{8,20}$/.test(v) ? '' : 'Enter a valid phone number.' },
        { key: 'relationship', label: 'Relationship', type: 'text' }
      ]
    }
  };

  function openEditModal(section) {
    const config = fieldConfigs[section];
    if (!config) return;

    const modal = document.getElementById('editModal');
    const fieldsHtml = config.fields.map(f => {
      const value = student[f.key] === null || student[f.key] === undefined ? '' : String(student[f.key]);
      let control = '';
      if (f.type === 'select') {
        control = `
          <select data-field="${esc(f.key)}">
            ${f.options.map(opt => `<option value="${esc(opt)}" ${opt === value ? 'selected' : ''}>${esc(opt)}</option>`).join('')}
          </select>`;
      } else {
        control = `<input type="${f.type}" data-field="${esc(f.key)}" value="${esc(value)}">`;
      }
      return `
        <div class="form-field" data-formfield="${esc(f.key)}">
          <label>${esc(f.label)}</label>
          ${control}
          <div class="form-hint"></div>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="modal-card" style="max-width:460px;">
        <button class="modal-close-btn" id="editModalClose">&times;</button>
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-primary); margin-bottom:18px; display:flex; align-items:center; gap:8px; text-shadow:var(--text-shadow-glass);">
          <i data-lucide="pen-line" style="width:17px;height:17px;color:#38bdf8;"></i> ${esc(config.title)}
        </h3>
        <form id="editForm" novalidate>${fieldsHtml}</form>
        <div class="modal-actions">
          <button class="btn-secondary" id="editCancel" style="padding:9px 18px; cursor:pointer;">Cancel</button>
          <button class="btn-primary" id="editSave" style="padding:9px 20px; cursor:pointer;">
            <i data-lucide="save" style="width:15px;height:15px;"></i> Save Changes
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
    if (window.lucide) lucide.createIcons();

    document.getElementById('editModalClose').addEventListener('click', closeEditModal);
    document.getElementById('editCancel').addEventListener('click', closeEditModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });

    document.getElementById('editForm').addEventListener('submit', (e) => e.preventDefault());
    document.getElementById('editSave').addEventListener('click', () => saveEditModal(section, config));
  }

  function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }

  function saveEditModal(section, config) {
    const payload = { id: student.id };
    let hasError = false;

    config.fields.forEach(f => {
      const input = document.querySelector(`[data-field="${f.key}"]`);
      const wrap = document.querySelector(`[data-formfield="${f.key}"]`);
      const value = input.value.trim();
      payload[f.key] = value;

      let err = '';
      if (f.required && !value) err = 'This field is required.';
      else if (f.validate) err = f.validate(value);

      if (wrap) {
        wrap.classList.toggle('is-invalid', !!err);
        const hint = wrap.querySelector('.form-hint');
        if (hint) hint.textContent = err;
      }
      if (err) hasError = true;
    });

    if (hasError) return;

    const saveBtn = document.getElementById('editSave');
    const original = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:15px;height:15px;"></i> Saving...';
    if (window.lucide) lucide.createIcons();

    API.updateStudent(payload)
      .then(res => {
        if (res && res.student) {
          Object.assign(student, res.student);
        }
        closeEditModal();
        renderProfile();
        showToast(res.message || 'Profile updated successfully.', 'success');
      })
      .catch(err => {
        showToast(err.message || 'Update failed.', 'error');
      })
      .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
      });
  }

  // ===================================================================
  // Back link fallback + init
  // ===================================================================
  function bindBackLink() {
    const backLink = document.getElementById('backLink');
    if (!backLink) return;
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'students.html';
      }
    });
  }

  function bindRetryBtn() {
    const retry = document.getElementById('retryBtn');
    if (retry) retry.addEventListener('click', () => loadProfile());
  }

  window.addEventListener('hashchange', () => {
    if (student) switchTab(normalizeTab(window.location.hash), false);
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Match analytics page Chart.js text styling before any chart draws
    if (typeof Chart !== 'undefined') {
      Chart.defaults.color = 'rgba(255,255,255,0.92)';
      Chart.defaults.backgroundColor = 'transparent';
      Chart.defaults.font.family = 'Poppins';
      Chart.defaults.font.weight = 500;
    }

    bindBackLink();
    bindRetryBtn();
    loadProfile();
  });
})();