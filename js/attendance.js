// js/attendance.js
// Attendance marking admin.
//
// Everything rendered here comes from MariaDB through api/attendance.php and
// api/semesters.php. There are no student lists, dates or tallies baked into
// this file: if the database has no roster for a semester, the page says so.

(function () {
  'use strict';

  const STATUSES = ['present', 'late', 'absent', 'excused'];

  // Marks currently staged in the form: studentId -> status
  let marks = {};
  let semesters = [];
  let sessionPage = 1;
  const SESSION_PER_PAGE = 10;

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showMessage(text, kind) {
    const box = $('attMessage');
    if (!box) return;
    if (!text) { box.style.display = 'none'; return; }
    const styles = {
      error: 'background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.35); color:#ffc9c9;',
      ok:    'background:rgba(74,222,128,0.12); border:1px solid rgba(74,222,128,0.35); color:#bbf7d0;',
      info:  'background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#bae6fd;'
    };
    box.setAttribute('style', 'display:block; ' + (styles[kind] || styles.info));
    box.textContent = text;
  }

  function updateSummary() {
    const tally = { present: 0, late: 0, absent: 0, excused: 0 };
    Object.values(marks).forEach((s) => { if (tally[s] !== undefined) tally[s]++; });
    $('sumTotal').textContent = Object.keys(marks).length;
    $('sumPresent').textContent = tally.present;
    $('sumLate').textContent = tally.late;
    $('sumAbsent').textContent = tally.absent;
    $('sumExcused').textContent = tally.excused;
  }

  // ---------------------------------------------------------------------
  // Roster
  // ---------------------------------------------------------------------
  async function loadReferenceData() {
    try {
      const data = await API.getSemesters();
      semesters = data.semesters || [];
      const sel = $('attSemester');
      const chosen = sel.value;
      sel.innerHTML = '<option value="">Semester: choose&hellip;</option>' + semesters
        .map(s => `<option value="${s.id}">Semester ${s.semesterNumber}${s.academicYear ? ' (' + esc(s.academicYear) + ')' : ''} &middot; ${s.studentCount} students</option>`)
        .join('');
      if (chosen) sel.value = chosen;
    } catch (err) {
      showMessage('Could not load semesters: ' + (err.message || 'unknown error'), 'error');
    }
  }

  async function loadSubjects() {
    const semesterId = parseInt($('attSemester').value, 10) || 0;
    const sel = $('attSubject');
    sel.innerHTML = '<option value="">Subject: not specified</option>';
    if (!semesterId) return;
    try {
      const data = await API.getSemesters(semesterId);
      const subjects = data.subjects || [];
      if (subjects.length === 0) {
        showMessage('This semester has no subjects in the database, so the session will be saved without one.', 'info');
        return;
      }
      sel.innerHTML = '<option value="">Subject: not specified</option>' + subjects
        .map(s => `<option value="${s.id}">${esc(s.code)} &middot; ${esc(s.name)}</option>`)
        .join('');
    } catch (err) {
      showMessage('Could not load subjects: ' + (err.message || 'unknown error'), 'error');
    }
  }

  async function loadRoster() {
    const semesterId = parseInt($('attSemester').value, 10) || 0;
    if (!semesterId) {
      showMessage('Choose a semester first.', 'error');
      return;
    }

    const container = $('attRoster');
    container.innerHTML = '<p style="color:rgba(255,255,255,0.85); font-size:0.85rem;">Loading roster&hellip;</p>';
    showMessage('', null);

    try {
      const data = await API.getAttendanceRoster(semesterId);
      const roster = data.roster || [];

      if (roster.length === 0) {
        marks = {};
        $('attSummary').style.display = 'none';
        container.innerHTML = '<p style="color:rgba(255,255,255,0.85); font-size:0.85rem;">No students are enrolled in this semester, so there is nothing to mark.</p>';
        return;
      }

      // Pre-select anything already recorded for this semester/date/subject so
      // re-opening a session shows what is stored rather than blank rows.
      marks = {};
      const date = $('attDate').value;
      const subjectId = parseInt($('attSubject').value, 10) || 0;
      if (date) {
        try {
          const existing = await API.getAttendanceSessions({ semesterId, subjectId, date, perPage: 1 });
          const found = (existing.sessions || [])[0];
          if (found) {
            const recs = await API.request('attendance.php?action=history&sessionId=' + encodeURIComponent(found.sessionId) + '&perPage=500');
            (recs.records || []).forEach(r => { marks[r.studentId] = r.status; });
            showMessage('Loaded the ' + recs.records.length + ' record(s) already saved for ' + date + '. Change what you need and save again.', 'info');
          }
        } catch (e) {
          // No stored session for this date yet - that is the normal case.
        }
      }

      container.innerHTML = roster.map(s => {
        const current = marks[s.studentId] || '';
        return `
          <div class="att-row" data-student-id="${s.studentId}" style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); flex-wrap:wrap;">
            <div style="min-width:180px; flex:1;">
              <div style="color:#fff; font-size:0.88rem; font-weight:600;">${esc(s.name)}</div>
              <div style="color:rgba(255,255,255,0.80); font-size:0.74rem;">${esc(s.rollNo)}${s.dept ? ' &middot; ' + esc(s.dept) : ''}</div>
            </div>
            <div class="att-choices" style="display:flex; gap:6px; flex-wrap:wrap;">
              ${STATUSES.map(st => `
                <button type="button" class="att-choice" data-status="${st}" data-student-id="${s.studentId}"
                  style="padding:6px 11px; font-size:0.75rem; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.05); color:#fff;">
                  ${st === 'present' ? 'Present' : st === 'late' ? 'Late' : st === 'absent' ? 'Absent' : 'Excused'}
                </button>`).join('')}
            </div>
          </div>`;
      }).join('');

      $('attSummary').style.display = 'flex';
      paintChoices();
      updateSummary();
    } catch (err) {
      container.innerHTML = '';
      showMessage('Could not load the roster: ' + (err.message || 'unknown error'), 'error');
    }
  }

  // Reflect the staged marks in the button styling.
  function paintChoices() {
    document.querySelectorAll('.att-choice').forEach(btn => {
      const active = marks[btn.dataset.studentId] === btn.dataset.status;
      const colours = {
        present: ['rgba(74,222,128,0.30)', 'rgba(74,222,128,0.85)'],
        late:    ['rgba(250,204,21,0.30)', 'rgba(250,204,21,0.85)'],
        absent:  ['rgba(248,113,113,0.30)', 'rgba(248,113,113,0.85)'],
        excused: ['rgba(56,189,248,0.30)', 'rgba(56,189,248,0.85)']
      };
      const pair = colours[btn.dataset.status];
      btn.style.background = active ? pair[0] : 'rgba(255,255,255,0.05)';
      btn.style.borderColor = active ? pair[1] : 'rgba(255,255,255,0.18)';
      btn.style.fontWeight = active ? '700' : '400';
    });
  }

  // ---------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------
  async function saveAttendance() {
    const semesterId = parseInt($('attSemester').value, 10) || 0;
    const date = $('attDate').value;
    if (!semesterId || !date) {
      showMessage('Choose a semester and a date before saving.', 'error');
      return;
    }

    const records = Object.keys(marks)
      .map(id => ({ studentId: parseInt(id, 10), status: marks[id] }))
      .filter(r => r.status);

    if (records.length === 0) {
      showMessage('Mark at least one student before saving.', 'error');
      return;
    }

    const btn = $('btnSaveAttendance');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:15px;height:15px;"></i> Saving...';
    if (window.lucide) lucide.createIcons();

    try {
      const res = await API.markAttendance({
        semesterId,
        subjectId: parseInt($('attSubject').value, 10) || 0,
        sessionDate: date,
        takenBy: $('attTakenBy').value.trim(),
        records
      });
      const sid = res.session ? res.session.id : null;
      const tally = res.tally || {};
      showMessage(
        'Saved ' + (res.markedCount || records.length) + ' record(s) to session ' + sid +
        ' (present ' + (tally.present || 0) + ', late ' + (tally.late || 0) +
        ', absent ' + (tally.absent || 0) + ', excused ' + (tally.excused || 0) + ').',
        'ok'
      );
      sessionPage = 1;
      loadSessions();
    } catch (err) {
      showMessage('Save failed: ' + (err.message || 'unknown error'), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
      if (window.lucide) lucide.createIcons();
    }
  }

  // ---------------------------------------------------------------------
  // Session list
  // ---------------------------------------------------------------------
  async function loadSessions() {
    const box = $('attSessions');
    const source = $('attSourceFilter').value;
    try {
      const data = await API.getAttendanceSessions({
        page: sessionPage,
        perPage: SESSION_PER_PAGE,
        source
      });
      const sessions = data.sessions || [];

      if (sessions.length === 0) {
        box.innerHTML = '<p style="color:rgba(255,255,255,0.85); font-size:0.85rem;">No sessions match this filter.</p>';
        $('attPager').innerHTML = '';
        return;
      }

      box.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
          <thead>
            <tr style="text-align:left; color:rgba(255,255,255,0.80); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em;">
              <th style="padding:8px;">Date</th>
              <th style="padding:8px;">Sem</th>
              <th style="padding:8px;">Subject</th>
              <th style="padding:8px;">Source</th>
              <th style="padding:8px;">P / A / L / E</th>
              <th style="padding:8px;">%</th>
              <th style="padding:8px;">Taken by</th>
              <th style="padding:8px;"></th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(s => {
              const legacy = s.source === 'legacy';
              return `
              <tr style="border-top:1px solid rgba(255,255,255,0.08);">
                <td style="padding:8px; color:#fff;">${esc(s.sessionDate)}</td>
                <td style="padding:8px; color:rgba(255,255,255,0.90);">${s.semester}</td>
                <td style="padding:8px; color:rgba(255,255,255,0.90);">${s.subjectCode ? esc(s.subjectCode) : '&mdash;'}</td>
                <td style="padding:8px;">
                  <span style="padding:2px 8px; border-radius:999px; font-size:0.68rem; font-weight:700;
                    background:${legacy ? 'rgba(148,163,184,0.18)' : 'rgba(56,189,248,0.16)'};
                    color:${legacy ? '#cbd5e1' : '#bae6fd'};">${esc(s.source)}</span>
                </td>
                <td style="padding:8px; color:rgba(255,255,255,0.90); white-space:nowrap;">${s.present} / ${s.absent} / ${s.late} / ${s.excused}</td>
                <td style="padding:8px; color:#fff; font-weight:700;">${s.percentage === null ? '&mdash;' : s.percentage + '%'}</td>
                <td style="padding:8px; color:rgba(255,255,255,0.85);">${esc(s.takenBy || '')}</td>
                <td style="padding:8px; text-align:right;">
                  ${legacy
                    ? '<span title="Migrated history is immutable" style="font-size:0.7rem; color:rgba(255,255,255,0.60);">protected</span>'
                    : `<button class="btn-del-session" data-session-id="${s.sessionId}" style="padding:5px 9px; font-size:0.72rem; border-radius:8px; cursor:pointer; border:1px solid rgba(248,113,113,0.35); background:rgba(248,113,113,0.10); color:#ffc9c9;">Delete</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;

      // Pager
      const total = data.total || 0;
      const pages = Math.max(1, Math.ceil(total / SESSION_PER_PAGE));
      $('attPager').innerHTML = `
        <span style="font-size:0.75rem; color:rgba(255,255,255,0.85);">Page ${data.page} of ${pages} &middot; ${total} session(s)</span>
        <button id="attPrev" class="page-btn" ${data.page <= 1 ? 'disabled style="opacity:0.4;cursor:default;"' : ''} style="padding:6px 12px;">Prev</button>
        <button id="attNext" class="page-btn" ${data.page >= pages ? 'disabled style="opacity:0.4;cursor:default;"' : ''} style="padding:6px 12px;">Next</button>`;

      const prev = $('attPrev');
      const next = $('attNext');
      if (prev) prev.addEventListener('click', () => { sessionPage--; loadSessions(); });
      if (next) next.addEventListener('click', () => { sessionPage++; loadSessions(); });
    } catch (err) {
      box.innerHTML = '<p style="color:#ffc9c9; font-size:0.85rem;">Could not load sessions: ' + esc(err.message || 'unknown error') + '</p>';
    }
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date();
    $('attDate').value = today.toISOString().slice(0, 10);

    await loadReferenceData();

    $('btnLoadRoster').addEventListener('click', loadRoster);
    $('attSemester').addEventListener('change', loadSubjects);
    $('btnSaveAttendance').addEventListener('click', saveAttendance);
    $('btnReloadSessions').addEventListener('click', loadSessions);
    $('attSourceFilter').addEventListener('change', () => { sessionPage = 1; loadSessions(); });

    // Per-student status buttons (event delegation, roster is re-rendered).
    $('attRoster').addEventListener('click', (e) => {
      const btn = e.target.closest('.att-choice');
      if (!btn) return;
      const id = btn.dataset.studentId;
      if (marks[id] === btn.dataset.status) {
        delete marks[id];
      } else {
        marks[id] = btn.dataset.status;
      }
      paintChoices();
      updateSummary();
    });

    // Bulk actions.
    document.querySelectorAll('[data-bulk]').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.bulk;
        document.querySelectorAll('.att-row').forEach(row => {
          marks[row.dataset.studentId] = status;
        });
        paintChoices();
        updateSummary();
      });
    });

    $('btnClearMarks').addEventListener('click', () => {
      marks = {};
      paintChoices();
      updateSummary();
    });

    // Session deletion.
    $('attSessions').addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-del-session');
      if (!btn) return;
      const id = btn.dataset.sessionId;
      if (!confirm('Delete session ' + id + ' and all of its attendance records?')) return;
      btn.disabled = true;
      try {
        await API.deleteAttendanceSession(parseInt(id, 10));
        loadSessions();
      } catch (err) {
        alert('Delete failed: ' + (err.message || 'unknown error'));
        btn.disabled = false;
      }
    });

    loadSessions();
  });
})();
