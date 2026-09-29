/**
 * EduTrack — Absence Notifications
 *
 * The bell in the top nav opens a panel listing the students marked absent for
 * the requested day. From each row the admin can open the student's profile,
 * place a call, or open WhatsApp on that student's phone with a custom message
 * already typed into the composer.
 *
 * Sending is a simulation: nothing leaves the browser and no SMS/WhatsApp
 * provider is contacted. A centred glassmorphism toast confirms the attempt so
 * the flow can be tested end to end.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'edutrack_absentee_message';

  let panel = null;
  let button = null;
  let listEl = null;
  let composerEl = null;
  let dateEl = null;
  let sendBtn = null;
  let targetEl = null;

  let absentees = [];
  let selected = null;   // the row the composer acts on
  let loading = false;
  let badgeSeen = false;

  // ---------------------------------------------------------------- helpers
  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Digits only, with the country code intact. '+91 98765 43216' -> '919876543216',
  // which is what both tel: and wa.me need.
  function dialable(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    // Indian local numbers are 10 digits, sometimes written with a leading
    // trunk zero ('09876543210'). Strip it, then add the country code.
    if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    if (digits.length === 10) digits = '91' + digits;
    return digits;
  }

  function formatPhone(phone) {
    return String(phone || '').trim();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10);
    return parts[2] + ' ' + (months[m - 1] || parts[1]) + ' ' + parts[0];
  }

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------- markup
  function buildPanel() {
    const wrap = document.createElement('div');
    wrap.className = 'notif-panel';
    wrap.id = 'notifPanel';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Absent students');
    wrap.innerHTML = `
      <div class="notif-head">
        <i data-lucide="user-x" style="width:16px;height:16px;color:#f87171;"></i>
        <h4>Absent Students</h4>
        <span class="notif-date" id="notifDate">—</span>
        <button class="notif-refresh" id="notifRefresh" title="Reload absentees">
          <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>
        </button>
        <button class="notif-refresh" id="notifClose" title="Close">
          <i data-lucide="x" style="width:14px;height:14px;"></i>
        </button>
      </div>

      <div class="notif-list" id="notifList">
        <div class="notif-empty">
          <i data-lucide="loader-2" style="width:28px;height:28px;" class="spin"></i>
          <h4>Loading absentees…</h4>
        </div>
      </div>

      <div class="notif-composer" id="notifComposer" hidden>
        <label for="notifMessage">Custom message</label>
        <textarea id="notifMessage" maxlength="500"
          placeholder="Type the message to send to the selected student's mobile…"></textarea>
        <div class="notif-composer-row">
          <span class="notif-target" id="notifTarget">No student selected</span>
          <button class="notif-send" id="notifSend">
            <i data-lucide="send" style="width:14px;height:14px;"></i> Send
          </button>
        </div>
      </div>
    `;

    // Appended to <body>, not nested inside the bell button: a nested panel
    // would make every click inside it bubble into the button's toggle handler
    // and close the panel the instant a row was picked.
    document.body.appendChild(wrap);

    panel = wrap;
    listEl = wrap.querySelector('#notifList');
    composerEl = wrap.querySelector('#notifComposer');
    dateEl = wrap.querySelector('#notifDate');
    sendBtn = wrap.querySelector('#notifSend');
    targetEl = wrap.querySelector('#notifTarget');

    wrap.querySelector('#notifRefresh').addEventListener('click', function () {
      loadAbsentees(true);
    });
    wrap.querySelector('#notifClose').addEventListener('click', closePanel);

    const textarea = wrap.querySelector('#notifMessage');
    textarea.addEventListener('input', function () {
      try { localStorage.setItem(STORAGE_KEY, this.value); } catch (e) { /* storage disabled */ }
    });

    sendBtn.addEventListener('click', sendMessage);

    icons();
    return wrap;
  }

  // Keeps the panel pinned under the bell while the page scrolls or resizes.
  function positionPanel() {
    if (!panel || !button) return;
    const r = button.getBoundingClientRect();
    panel.style.top = (r.bottom + 10) + 'px';
    panel.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
  }

  // ---------------------------------------------------------------- data
  async function loadAbsentees(force) {
    if (loading) return;
    loading = true;

    const refresh = document.getElementById('notifRefresh');
    if (refresh) refresh.classList.add('spin');

    try {
      const data = await API.getAbsentees({});
      absentees = (data && Array.isArray(data.students)) ? data.students : [];

      render(data || {});

      // The badge reflects how many people are absent right now.
      if (!badgeSeen || force) {
        badgeSeen = true;
        updateBadge(absentees.length);
      }
    } catch (err) {
      renderError((err && err.message) || 'Could not load absentees.');
    } finally {
      loading = false;
      if (refresh) refresh.classList.remove('spin');
    }
  }

  function render(data) {
    if (!listEl) return;

    const date = data.date || todayIso();
    const fallback = data.isFallback === true;

    if (dateEl) {
      dateEl.textContent = fallback ? formatDate(date) + ' (latest)' : formatDate(date);
      dateEl.classList.toggle('fallback', fallback);
      dateEl.title = fallback
        ? 'No attendance session exists for today. Showing the most recent session instead.'
        : 'Absentees recorded for today.';
    }

    if (absentees.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty">
          <i data-lucide="check-circle-2" style="width:34px;height:34px;color:#10b981;"></i>
          <h4>No absentees</h4>
          <p>Every student was marked present for ${esc(formatDate(date))}.</p>
        </div>`;
      composerEl.hidden = true;
      icons();
      return;
    }

    listEl.innerHTML = absentees.map(function (s, i) {
      const phone = formatPhone(s.phone);
      const tel = dialable(s.phone);
      const wa = dialable(s.phone);
      const hasPhone = !!tel;

      return `
        <div class="notif-item" data-index="${i}">
          <div class="notif-item-avatar">
            ${studentImgHtml(s, '', 'loading="lazy"') || '<i data-lucide="user" style="width:18px;height:18px;"></i>'}
          </div>
          <div class="notif-item-info">
            <div class="nm">${esc(s.name)}</div>
            <div class="sub">${esc(s.rollNo)} · ${esc(s.dept)}</div>
            <div class="sub ${hasPhone ? '' : 'no-phone'}">${hasPhone ? esc(phone) : 'No mobile number on file'}</div>
          </div>
          <div class="notif-actions">
            <button class="notif-btn view" data-act="view" data-index="${i}" title="View student">
              <i data-lucide="eye" style="width:14px;height:14px;"></i>
            </button>
            <button class="notif-btn call" data-act="call" data-index="${i}" title="Call ${esc(phone)}" ${hasPhone ? '' : 'disabled'}>
              <i data-lucide="phone-call" style="width:14px;height:14px;"></i>
            </button>
            <button class="notif-btn wa" data-act="wa" data-index="${i}" title="WhatsApp ${esc(phone)}" ${hasPhone ? '' : 'disabled'}>
              <i data-lucide="message-circle" style="width:14px;height:14px;"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const action = btn.getAttribute('data-act');
        const student = absentees[idx];
        if (!student) return;
        if (action === 'view') viewStudent(student);
        if (action === 'call') callStudent(student);
        if (action === 'wa') openWhatsApp(student);
      });
    });

    // Selecting a row targets the composer at that student.
    listEl.querySelectorAll('.notif-item').forEach(function (row) {
      row.addEventListener('click', function () {
        selectStudent(absentees[parseInt(row.getAttribute('data-index'), 10)]);
      });
    });

    if (selected) selectStudent(selected, true);
    else composerEl.hidden = true;

    icons();
  }

  function renderError(message) {
    if (!listEl) return;
    listEl.innerHTML = `
      <div class="notif-empty">
        <i data-lucide="wifi-off" style="width:30px;height:30px;color:#f87171;"></i>
        <h4>Could not load absentees</h4>
        <p>${esc(message)}</p>
      </div>`;
    if (composerEl) composerEl.hidden = true;
    icons();
  }

  // -------------------------------------------------------------- actions
  function viewStudent(student) {
    window.location.href = 'student-profile.html?id=' + encodeURIComponent(student.studentId);
  }

  function callStudent(student) {
    const tel = dialable(student.phone);
    if (!tel) {
      showToast('error', 'No mobile number', student.name + ' has no phone number saved.');
      return;
    }
    window.location.href = 'tel:' + tel;
  }

  // Opens WhatsApp with the composed message already filled in, so the admin
  // can review it before actually sending.
  function openWhatsApp(student) {
    const wa = dialable(student.phone);
    if (!wa) {
      showToast('error', 'No mobile number', student.name + ' has no phone number saved.');
      return;
    }
    const text = currentMessage() || defaultMessage(student);
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  function currentMessage() {
    const box = document.getElementById('notifMessage');
    return box ? box.value.trim() : '';
  }

  function defaultMessage(student) {
    return 'Dear ' + student.name + ' (Roll No: ' + student.rollNo + '), you have been marked absent on ' +
      formatDate(student.sessionDate) + '. Please contact your class mentor. - NEX College';
  }

  function selectStudent(student, quiet) {
    if (!student) return;
    selected = student;
    composerEl.hidden = false;
    if (targetEl) {
      targetEl.textContent = 'To: ' + student.name + ' · ' + formatPhone(student.phone);
    }
    if (!quiet) {
      const box = document.getElementById('notifMessage');
      if (box && !box.value.trim()) box.value = defaultMessage(student);
      if (box) box.focus();
    }
  }

  function sendMessage() {
    if (!selected) {
      showToast('error', 'No student selected', 'Pick a student from the list first.');
      return;
    }
    const text = currentMessage();
    if (!text) {
      showToast('error', 'Message is empty', 'Type the message you want to send.');
      return;
    }
    const tel = dialable(selected.phone);
    if (!tel) {
      showToast('error', 'No mobile number', selected.name + ' has no phone number saved.');
      return;
    }

    sendBtn.disabled = true;

    // Deliberately a simulation: nothing is transmitted, no provider is called.
    // Swap this for a real API call when a messaging gateway is available.
    setTimeout(function () {
      sendBtn.disabled = false;
      showToast(
        'success',
        'Message Sent Successfully',
        'Delivered to ' + selected.name + ' on ' + formatPhone(selected.phone) + '.',
        'Test mode — nothing was actually transmitted',
        text
      );
    }, 700);
  }

  // ---------------------------------------------------------------- toast
  function showToast(type, title, message, tag, sub) {
    const existing = document.getElementById('centerToastOverlay');
    if (existing) existing.remove();

    const ok = type !== 'error';
    const overlay = document.createElement('div');
    overlay.id = 'centerToastOverlay';
    overlay.className = 'center-toast-overlay';
    overlay.innerHTML = `
      <div class="center-toast">
        <div class="center-toast-icon" style="${ok ? '' : 'background:linear-gradient(135deg,rgba(239,68,68,.28),rgba(220,38,38,.28));border-color:rgba(239,68,68,.55);color:#ef4444;'}">
          <i data-lucide="${ok ? 'check' : 'x'}"></i>
        </div>
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        ${sub ? `<p class="toast-sub">“${esc(sub)}”</p>` : ''}
        ${tag ? `<span class="toast-tag">${esc(tag)}</span>` : ''}
        <button class="toast-btn">OK</button>
      </div>`;

    document.body.appendChild(overlay);
    icons();

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    }

    overlay.querySelector('.toast-btn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    const onKey = function (e) {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    setTimeout(close, ok ? 4200 : 3000);
  }

  // ------------------------------------------------------------ panel open
  function openPanel() {
    if (!panel) buildPanel();
    panel.classList.add('open');
    positionPanel();

    let saved = '';
    const box = document.getElementById('notifMessage');
    if (box) {
      try { saved = localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { saved = ''; }
      box.value = saved;
    }

    loadAbsentees(false);
  }

  function closePanel() {
    if (panel) panel.classList.remove('open');
  }

  function updateBadge(count) {
    document.querySelectorAll('.btn-icon-notify').forEach(function (btn) {
      let badge = btn.querySelector('.notify-badge');
      if (!count) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notify-badge';
        btn.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : String(count);
    });
  }

  // ----------------------------------------------------------------- init
  let initialised = false;

  function init() {
    const btn = document.querySelector('.btn-icon-notify');
    if (!btn || initialised) return;
    initialised = true;
    button = btn;

    // The hardcoded "3" in the markup is replaced by the real absent count.
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel && panel.classList.contains('open')) closePanel();
      else openPanel();
    });

    document.addEventListener('click', function (e) {
      if (!panel || !panel.classList.contains('open')) return;
      if (panel.contains(e.target) || button.contains(e.target)) return;
      closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);

    loadAbsentees(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Notifications = { open: openPanel, close: closePanel, reload: loadAbsentees, showToast: showToast };
})();
