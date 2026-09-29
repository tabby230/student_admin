/**
 * EduTrack Shared Application Logic
 */

// Custom Alert Function with Glassmorphism
function showCustomAlert(message, type = 'success', title = '') {
  // Remove existing alert if any
  const existing = document.getElementById('customAlertOverlay');
  if (existing) existing.remove();
  
  // Determine title and icon
  const alertTitle = title || (type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Notice');
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'customAlertOverlay';
  overlay.className = 'custom-alert-overlay';
  
  overlay.innerHTML = `
    <div class="custom-alert-box">
      <div class="custom-alert-icon ${type}">
        ${icon}
      </div>
      <h3 class="custom-alert-title">${alertTitle}</h3>
      <p class="custom-alert-message">${message}</p>
      <button class="custom-alert-button" onclick="closeCustomAlert()">OK</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Focus on button for keyboard accessibility
  setTimeout(() => {
    const btn = overlay.querySelector('.custom-alert-button');
    if (btn) btn.focus();
  }, 500);
  
  // Close on ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeCustomAlert();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  return new Promise((resolve) => {
    window._customAlertResolve = resolve;
  });
}

function closeCustomAlert() {
  const overlay = document.getElementById('customAlertOverlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      overlay.remove();
      if (window._customAlertResolve) {
        window._customAlertResolve();
        delete window._customAlertResolve;
      }
    }, 200);
  }
}

// Override native alert
window.alert = function(message) {
  return showCustomAlert(message, 'success');
};

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

// Resolves a student's image with the correct precedence: an uploaded photo
// always wins, the stored avatar is only a fallback, and a bundled default
// image is the last resort. Uploaded paths get a cache-busting query string so
// a freshly saved photo is never served from the browser cache.
function resolveStudentImage(st) {
  if (!st) return null;
  const raw = st.photo || st.avatar || null;
  if (!raw) return null;
  return bustImageCache(raw, st.updatedAt || st.updated_at);
}

// Appends ?t=<timestamp> for locally uploaded images only. Remote URLs
// (Cloudinary) manage their own versioning and are left untouched.
function bustImageCache(url, stamp) {
  if (!url) return url;
  if (typeof url !== 'string' || !/^(\.?\/?)?assets\/uploads\//i.test(url)) return url;
  const t = stamp || Date.now();
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + encodeURIComponent(t);
}

// Escapes a value for safe interpolation into an HTML attribute.
function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Renders the <img> markup for a student, or '' when there is no image.
function studentImgHtml(st, extraClass, extraAttrs) {
  const src = resolveStudentImage(st);
  if (!src) return '';
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(st.name || '')}" class="${escapeAttr(extraClass || 'student-avatar-img')}" ${extraAttrs || ''} onerror="this.remove();">`;
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

/* ------------------------------------------------------------------
   Responsive navigation — hamburger button + off-canvas drawer
   The markup is built once from the navigation that already exists in the
   page (`.nav-links`, the brand and the sidebar promo card) and moved in and
   out of the drawer as the viewport crosses the breakpoint. Nothing is
   duplicated, so the drawer can never drift from the desktop navigation.
   ------------------------------------------------------------------ */
const NAV_BREAKPOINT = '(max-width: 1180px)';
// Below this width the global search no longer fits beside the brand, so it
// is lifted out of `.nav-actions` and given its own full-width navbar row.
const SEARCH_BREAKPOINT = '(max-width: 900px)';

function buildMobileNav() {
  const navbar = document.querySelector('.top-navbar');
  if (!navbar || document.getElementById('mobileNav')) return null;

  const navLinks = navbar.querySelector('.nav-links');
  const navActions = navbar.querySelector('.nav-actions');
  const brand = navbar.querySelector('.brand-logo');
  const search = navbar.querySelector('.search-bar-nav');

  // ---- hamburger (first child so it sits left of the logo on mobile) ----
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'navToggle';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobileNav');
  toggle.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true">' +
                     '<span></span><span></span><span></span></span>';
  navbar.insertBefore(toggle, navbar.firstChild);

  // ---- scrim behind the drawer ----
  const scrim = document.createElement('div');
  scrim.className = 'nav-scrim';
  scrim.hidden = true;

  // ---- drawer ----
  const drawer = document.createElement('aside');
  drawer.id = 'mobileNav';
  drawer.className = 'mobile-nav';
  drawer.setAttribute('aria-label', 'Site navigation');
  drawer.setAttribute('aria-hidden', 'true');

  const promoSource = document.querySelector('.sidebar-promo-card');
  const promo = promoSource ? promoSource.cloneNode(true) : null;

  drawer.innerHTML =
    '<div class="mobile-nav-head">' +
      '<span class="mobile-nav-brand">' +
        '<span class="mobile-nav-logo"></span>' +
        '<span class="mobile-nav-name">NEX College</span>' +
      '</span>' +
      '<button type="button" class="mobile-nav-close" aria-label="Close navigation menu">&times;</button>' +
    '</div>' +
    '<nav class="mobile-nav-menu"></nav>' +
    '<div class="mobile-nav-foot"></div>';

  if (promo) {
    promo.classList.add('mobile-nav-promo');
    drawer.querySelector('.mobile-nav-foot').appendChild(promo);
  }

  // Brand lock-up inside the drawer header, built from the real navbar brand.
  const lockup = drawer.querySelector('.mobile-nav-brand');
  if (brand) {
    const logo = brand.querySelector('img');
    if (logo) {
      const img = document.createElement('img');
      img.className = 'mobile-nav-logo-img';
      img.src = logo.getAttribute('src');
      img.alt = '';
      lockup.querySelector('.mobile-nav-logo').appendChild(img);
    }
  }

  // Read-only profile summary so the account stays reachable from the drawer.
  // It is a static label, not a second control — the live profile pill (which
  // owns ids and the admin dropdown) stays in the header exactly as before.
  const sourceProfile = document.querySelector('.nav-actions .user-profile-nav');
  if (sourceProfile) {
    const name = sourceProfile.querySelector('.user-name');
    const role = sourceProfile.querySelector('.user-role');
    const row = document.createElement('div');
    row.className = 'mobile-nav-profile';
    const avatar = sourceProfile.querySelector('img');
    if (avatar) {
      const img = document.createElement('img');
      img.className = 'mobile-nav-avatar';
      img.src = avatar.getAttribute('src');
      img.alt = '';
      row.appendChild(img);
    }
    const text = document.createElement('div');
    text.className = 'mobile-nav-profile-text';
    text.innerHTML = '<span class="mnp-name"></span><span class="mnp-role"></span>';
    text.querySelector('.mnp-name').textContent = name ? name.textContent.trim() : '';
    text.querySelector('.mnp-role').textContent = role ? role.textContent.trim() : '';
    row.appendChild(text);
    drawer.querySelector('.mobile-nav-foot').insertBefore(row, promo || null);
  }

  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  // Remember where the pill bar lives so it can be put back on desktop.
  const home = { parent: navLinks.parentNode, next: navLinks.nextSibling };
  const searchHome = search ? { parent: search.parentNode, next: search.nextSibling } : null;

  let open = false;

  function setOpen(state) {
    if (open === state) return;
    open = state;
    navbar.classList.toggle('nav-open', state);
    drawer.classList.toggle('open', state);
    scrim.hidden = !state;
    document.body.classList.toggle('nav-locked', state);
    toggle.setAttribute('aria-expanded', state ? 'true' : 'false');
    toggle.setAttribute('aria-label', state ? 'Close navigation menu' : 'Open navigation menu');
    if (state) {
      const first = drawer.querySelector('.mobile-nav-menu a, .mobile-nav-close');
      if (first) first.focus({ preventScroll: true });
    } else {
      toggle.focus({ preventScroll: true });
    }
  }

  function applyMode() {
    if (navLinks) {
      if (MOBILE_NAV.matches) {
        if (navLinks.parentNode !== drawer.querySelector('.mobile-nav-menu')) {
          drawer.querySelector('.mobile-nav-menu').appendChild(navLinks);
        }
      } else if (navLinks.parentNode !== home.parent) {
        home.parent.insertBefore(navLinks, home.next);
      }
    }
    // The search gets its own row inside the navbar on narrow screens.
    if (search && searchHome) {
      if (SEARCH_ROW.matches) {
        if (search.parentNode !== navbar) navbar.appendChild(search);
      } else if (search.parentNode !== searchHome.parent) {
        searchHome.parent.insertBefore(search, searchHome.next);
      }
    }
    // A drawer left open while the window grows would leave the page locked.
    if (!MOBILE_NAV.matches && open) setOpen(false);
  }

  toggle.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  drawer.querySelector('.mobile-nav-close').addEventListener('click', () => setOpen(false));
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });
  if (MOBILE_NAV.addEventListener) MOBILE_NAV.addEventListener('change', applyMode);
  else if (MOBILE_NAV.addListener) MOBILE_NAV.addListener(applyMode);
  if (SEARCH_ROW.addEventListener) SEARCH_ROW.addEventListener('change', applyMode);
  else if (SEARCH_ROW.addListener) SEARCH_ROW.addListener(applyMode);

  applyMode();

  return { setOpen, isOpen: () => open };
}

const MOBILE_NAV = window.matchMedia(NAV_BREAKPOINT);
const SEARCH_ROW = window.matchMedia(SEARCH_BREAKPOINT);

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
          ${studentImgHtml(student, 'student-avatar-img')}
        </div>
        <div>
          <h3 style="font-size:1.25rem; font-weight:700; color:#fff;">${student.name}</h3>
          <p style="font-size:0.85rem; color:rgba(255,255,255,0.90);">Roll No: <span style="color:#fff; font-weight:700;">${student.rollNo}</span></p>
          <span class="dept-tag" style="${getDeptTagStyle(student.dept)} margin-top:4px;">
            ${student.dept}
          </span>
        </div>
      </div>

      <div class="rp-tiles" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
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
        <label style="font-size:0.75rem; color:rgba(255,255,255,0.90); display:block; margin-bottom:8px; font-weight:600;">Student Photo</label>
        <button class="btn-primary" style="padding:10px 16px; font-size:0.82rem; border-radius:10px; cursor:pointer; font-weight:700;" onclick="document.getElementById('modalPhotoInput').click()">
          <i data-lucide="camera" style="width:15px;height:15px;"></i> Change photo
        </button>
        <input type="file" id="modalPhotoInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="onModalPhotoPicked(this, ${student.id})">
        <p style="font-size:0.7rem; color:rgba(255,255,255,0.80); margin-top:8px;">Select an image, crop it, then save.</p>
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

  // A photo cropped in a previous visit must never leak into this one.
  clearPendingStudentPhoto();

  if (editing) {
    const profile = await API.getStudent(id);
    student = profile.student || profile;
    if (!student || !student.id) { alert('Could not load that student.'); return; }
  }

  if (_studentFormDepartments.length === 0) {
    const d = await API.getDepartments();
    _studentFormDepartments = Array.isArray(d) ? d : (d.departments || []);
  }
  if (_studentFormSemesters.length === 0) {
    const s = await API.getSemesters();
    _studentFormSemesters = Array.isArray(s) ? s : (s.semesters || []);
  }

  let modal = document.getElementById('studentFormModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'studentFormModal';
    modal.className = 'sf-page';
    document.body.appendChild(modal);
  }

  // Department is returned by student.php as a name, so match on that.
  const v = (key) => (student && student[key] !== null && student[key] !== undefined) ? String(student[key]) : '';
  const deptOptions = _studentFormDepartments
    .map(d => `<option value="${escAttr(d.dbId || d.id)}" ${student && String(student.dept) === String(d.name) ? 'selected' : ''}>${esc(d.name)}</option>`)
    .join('');
  const semOptions = _studentFormSemesters
    .map(s => `<option value="${escAttr(s.id)}" ${student && Number(student.semester) === Number(s.semesterNumber) ? 'selected' : ''}>Semester ${s.semesterNumber}${s.academicYear ? ' (' + esc(s.academicYear) + ')' : ''}</option>`)
    .join('');

  const field = (label, inner, nameKey) => {
    const errId = nameKey ? `sf_err_${nameKey}` : '';
    return `<div ${nameKey ? `data-field="${nameKey}"` : ''}>
      <label>${label}</label>
      ${inner}
      ${errId ? `<div class="sf-field-error" id="${errId}"></div>` : ''}
    </div>`;
  };

  const input = (id, name, value, type = 'text', placeholder = '', attrs = '') => `
    <input type="${type}" id="sf_${id}" name="${name}" value="${escAttr(value)}" placeholder="${escAttr(placeholder)}" ${attrs}>`;

  const phoneInput = (id, name, value, placeholder = '') => `
    <input type="tel" id="sf_${id}" name="${name}" value="${escAttr(value)}" placeholder="${escAttr(placeholder)}" pattern="[0-9]{10}" maxlength="10" inputmode="numeric" title="Enter exactly 10 digits">`;

  // Digits only. The value the form opens with is kept in data-initial so a
  // stored roll number from before the digits-only rule (22CS001) survives
  // untouched until the admin deliberately replaces it.
  const rollInput = (id, name, value) => `
    <input type="text" id="sf_${id}" name="${name}" value="${escAttr(value)}" placeholder="e.g. 22001"
      inputmode="numeric" maxlength="25" data-initial="${escAttr(value)}" title="Digits only (e.g. 22001)">`;

  const select = (id, name, options) => `
    <select id="sf_${id}" name="${name}">
      ${options}
    </select>`;

  modal.innerHTML = `
    <div class="sf-wrap">
      <div class="sf-header">
        <button type="button" class="sf-back" onclick="closeStudentFormModal()">&larr; Back to Students</button>
        <h2 class="sf-title">${editing ? 'Edit Student' : 'Add Student'}</h2>
        <p class="sf-sub">
          ${editing ? 'Changes are saved straight to the database.' : 'The new student is written to the database immediately.'}
        </p>
      </div>

      <form id="studentForm" class="sf-grid" onsubmit="submitStudentForm(event, ${editing ? student.id : 0})">
        <div style="grid-column: 1 / -1; margin-bottom: 20px;">
          <div class="photo-upload-section">
            <div class="photo-preview-container">
              <div class="photo-preview" id="studentPhotoPreview">
                <i data-lucide="user" style="width:48px;height:48px;color:rgba(255,255,255,0.4);"></i>
              </div>
              <input type="file" id="studentPhotoInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
              <button type="button" class="btn-upload-photo" onclick="document.getElementById('studentPhotoInput').click()">
                <i data-lucide="camera" style="width:16px;height:16px;"></i>
                <span>Upload Photo</span>
              </button>
              <p style="font-size:0.7rem; color:rgba(255,255,255,0.80); text-align:center;">JPG, PNG or WEBP up to 2MB. You can crop it before saving.</p>
            </div>
          </div>
        </div>
        ${field('Full Name *', input('name', 'name', v('name'), 'text', 'e.g. Arun Kumar'), 'name')}
        ${field('Roll Number *', rollInput('rollNo', 'rollNo', v('rollNo')), 'rollNo')}
        ${field('Email', input('email', 'email', v('email'), 'email', 'name@example.com'), 'email')}
        ${field('Phone', phoneInput('phone', 'phone', v('phone'), '10-digit mobile number'), 'phone')}
        ${field('Department *', select('departmentId', 'departmentId',
            _studentFormDepartments.length ? deptOptions : '<option value="">No departments in database</option>'), 'departmentId')}
        ${field('Semester *', select('semesterId', 'semesterId',
            _studentFormSemesters.length ? semOptions : '<option value="">No semesters in database</option>'), 'semesterId')}
        ${field('Section', input('section', 'section', v('section'), 'text', 'e.g. A'), 'section')}
        ${field('Year of Study *', select('year', 'year',
            [1, 2, 3, 4].map(y =>
              `<option value="${y}" ${v('year') === String(y) ? 'selected' : ''}>Year ${y}</option>`).join('')), 'year')}
        ${field('Course', input('course', 'course', v('course'), 'text', 'e.g. B.Sc Computer Science'), 'course')}
        ${field('Date of Birth', input('dob', 'dob', v('dob'), 'date'), 'dob')}
        ${field('Gender', select('gender', 'gender',
            ['', 'Male', 'Female', 'Other'].map(g =>
              `<option value="${g}" ${v('gender') === g ? 'selected' : ''}>${g || 'Not specified'}</option>`).join('')), 'gender')}
        ${field('Blood Group', select('bloodGroup', 'bloodGroup',
            ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b =>
              `<option value="${b}" ${v('bloodGroup') === b ? 'selected' : ''}>${b || 'Not specified'}</option>`).join('')), 'bloodGroup')}
        ${field('Address', input('address', 'address', v('address'), 'text'), 'address')}
        ${field('Guardian Name', input('guardianName', 'guardianName', v('guardianName'), 'text'), 'guardianName')}
        ${field('Guardian Phone', phoneInput('guardianPhone', 'guardianPhone', v('guardianPhone'), '10-digit number'), 'guardianPhone')}
        ${field('Emergency Contact', phoneInput('emergencyContact', 'emergencyContact', v('emergencyContact'), '10-digit number'), 'emergencyContact')}
        ${field('Relationship To Guardian', input('relationship', 'relationship', v('relationship'), 'text', 'e.g. Father'), 'relationship')}
        ${field('Languages Known', input('languages', 'languages', v('languages'), 'text', 'e.g. English, Tamil'), 'languages')}
        <div id="sf_error" style="grid-column:1 / -1; display:none; background:rgba(255,80,80,0.12); border:1px solid rgba(255,120,120,0.35); border-radius:12px; padding:12px 14px; font-size:0.78rem; color:#ffc9c9;"></div>
        <div class="sf-actions">
          <button type="button" class="btn-secondary" onclick="closeStudentFormModal()">Cancel</button>
          <button type="submit" id="sf_submit" class="btn-primary">
            <i data-lucide="save" style="width:15px;height:15px;"></i> ${editing ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  `;

  modal.classList.add('open');
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  
  // Existing photo first, so the admin can see what they are about to replace.
  const existingPhoto = student ? resolveStudentImage(student) : null;
  if (existingPhoto) setStudentFormPhotoPreview(existingPhoto);

  // Initialize photo upload handler
  const photoInput = document.getElementById('studentPhotoInput');
  if (photoInput) {
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      // Cleared so picking the same file twice still fires a change event.
      e.target.value = '';
      if (file) {
        openPhotoCropperForNewStudent(file);
      }
    });
  }
  
  // Ensure critical styles are applied with multiple approaches
  if (!document.getElementById('sfModalStyles')) {
    const style = document.createElement('style');
    style.id = 'sfModalStyles';
    style.textContent = `
      #studentForm input,
      #studentForm select,
      #studentForm.sf-grid > div input,
      #studentForm.sf-grid > div select {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        border-radius: 12px !important;
        padding: 14px 16px !important;
        color: #fff !important;
        font-size: 0.9rem !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      }
      #studentForm input:focus,
      #studentForm select:focus,
      #studentForm.sf-grid > div input:focus,
      #studentForm.sf-grid > div select:focus {
        border-color: #38bdf8 !important;
        background: rgba(15, 23, 42, 0.8) !important;
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2), 0 4px 16px rgba(56, 189, 248, 0.15) !important;
      }
      #studentForm label,
      #studentForm.sf-grid > div label {
        font-size: 0.8rem !important;
        color: rgba(255, 255, 255, 0.95) !important;
        font-weight: 600 !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
      }
      #studentForm select,
      #studentForm.sf-grid > div select {
        appearance: none !important;
        -webkit-appearance: none !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 16px center !important;
        padding-right: 40px !important;
      }
      #studentForm select option {
        background: #0f172a !important;
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Force apply styles directly to elements after a brief delay
  setTimeout(function() {
    const inputs = document.querySelectorAll('#studentForm input, #studentForm select');
    inputs.forEach(function(el) {
      el.style.setProperty('background', 'rgba(15, 23, 42, 0.6)', 'important');
      el.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.25)', 'important');
      el.style.setProperty('color', '#fff', 'important');
      el.style.setProperty('backdrop-filter', 'blur(16px)', 'important');
      el.style.setProperty('border-radius', '12px', 'important');
      el.style.setProperty('padding', '14px 16px', 'important');
    });
  }, 50);
  
  if (window.lucide) lucide.createIcons();

  // Attach live clear on edit/change for every form control
  setTimeout(function() {
    document.querySelectorAll('#studentForm input, #studentForm select, #studentForm textarea').forEach(function(el) {
      el.addEventListener('input', function() { clearFieldError(el.name); });
      el.addEventListener('change', function() { clearFieldError(el.name); });
    });
    
    // Enforce numeric-only input for phone fields
    document.querySelectorAll('#studentForm input[type="tel"]').forEach(function(el) {
      el.addEventListener('input', function(e) {
        // Remove any non-digit characters
        this.value = this.value.replace(/\D/g, '');
        // Limit to 10 digits
        if (this.value.length > 10) {
          this.value = this.value.slice(0, 10);
        }
      });
      
      // Prevent non-numeric keypress
      el.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Tab') {
          e.preventDefault();
        }
      });
      
      // Prevent paste of non-numeric content
      el.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numericOnly = pastedText.replace(/\D/g, '').slice(0, 10);
        this.value = numericOnly;
      });
    });

    // Roll number accepts digits only. While the field still holds the value it
    // opened with, nothing is stripped, so a pre-existing 22CS001 stays editable;
    // as soon as the admin changes it, every non-digit is dropped.
    const rollEl = document.getElementById('sf_rollNo');
    if (rollEl) {
      const initial = rollEl.getAttribute('data-initial') || '';
      rollEl.addEventListener('input', function() {
        if (this.value === initial) return;
        this.value = this.value.replace(/\D/g, '');
      });

      rollEl.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Tab' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      });

      rollEl.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        this.value = pastedText.replace(/\D/g, '');
      });
    }
  }, 100);
}

function closeStudentFormModal() {
  const modal = document.getElementById('studentFormModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const m = document.getElementById('studentFormModal');
    if (m && m.classList.contains('open')) closeStudentFormModal();
  }
});

function showFieldError(name, msg) {
  const div = document.getElementById('sf_err_' + name);
  if (div) { div.style.display = 'block'; div.textContent = msg; }
  const inp = document.querySelector('#studentForm [name="' + name + '"]');
  if (inp) { inp.classList.add('sf-invalid'); inp.focus(); }
}
function clearFieldError(name) {
  const div = document.getElementById('sf_err_' + name);
  if (div) { div.style.display = 'none'; div.textContent = ''; }
  const inp = document.querySelector('#studentForm [name="' + name + '"]');
  if (inp) inp.classList.remove('sf-invalid');
}
function mapServerErrorToField(msg) {
  const m = (msg || '').toLowerCase();
  if (m.indexOf('departmentid') !== -1 || m.indexOf('department') !== -1 && m.indexOf('integer') !== -1) return 'departmentId';
  if (m.indexOf('rollno') !== -1 || m.indexOf('roll number') !== -1 || m.indexOf('roll') !== -1) return 'rollNo';
  if (m.indexOf('email') !== -1 && m.indexOf('duplicate') !== -1) return 'email';
  if (m.indexOf('semester') !== -1 && (m.indexOf('integer') !== -1 || m.indexOf('positive') !== -1)) return 'semesterId';
  if (m.indexOf('year') !== -1 && (m.indexOf('integer') !== -1 || m.indexOf('positive') !== -1)) return 'year';
  const fields = ['name','rollNo','email','phone','section','course','dob','gender','bloodGroup','address','guardianName','guardianPhone','emergencyContact','relationship','languages'];
  for (let f of fields) if (m.indexOf(f.toLowerCase()) !== -1) return f;
  return '';
}
function scrollToFirstInvalid() {
  const first = document.querySelector('#studentForm .sf-invalid');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // Numeric checks
  const deptVal = value('departmentId');
  const semVal = value('semesterId');
  const yrVal = value('year');
  if (!deptVal || deptVal === '0') { showFieldError('departmentId', 'Please select a department'); scrollToFirstInvalid(); return; }
  if (!semVal || !/^[0-9]+$/.test(semVal)) { showFieldError('semesterId', 'Please select a semester'); scrollToFirstInvalid(); return; }
  if (!yrVal || !/^[0-9]+$/.test(yrVal)) { showFieldError('year', 'Please select a year'); scrollToFirstInvalid(); return; }
  const deptNum = parseInt(deptVal, 10);
  const semNum = parseInt(semVal, 10);
  if (isNaN(deptNum) || deptNum <= 0) { showFieldError('departmentId', 'Please select a department'); scrollToFirstInvalid(); return; }
  if (isNaN(semNum) || semNum <= 0) { showFieldError('semesterId', 'Please select a semester'); scrollToFirstInvalid(); return; }

  // Client-side validation
  const nameVal = value('name').trim();
  const rollVal = value('rollNo').trim();
  if (!nameVal) { showFieldError('name', 'Name is required'); scrollToFirstInvalid(); return; }
  if (!rollVal) { showFieldError('rollNo', 'Roll number is required'); scrollToFirstInvalid(); return; }
  // Digits only, except a stored roll number left exactly as it was loaded.
  const rollInitial = (document.getElementById('sf_rollNo') || {}).getAttribute
    ? String(document.getElementById('sf_rollNo').getAttribute('data-initial') || '').trim()
    : '';
  if (!/^[0-9]+$/.test(rollVal) && rollVal !== rollInitial) {
    showFieldError('rollNo', 'Roll number must contain digits only'); scrollToFirstInvalid(); return;
  }
  const emailVal = value('email').trim();
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { showFieldError('email', 'Enter a valid email'); scrollToFirstInvalid(); return; }
  const phoneVal = value('phone').trim();
  if (phoneVal && !/^\d{10,15}$/.test(phoneVal)) { showFieldError('phone', 'Enter 10-15 digits'); scrollToFirstInvalid(); return; }
  const guardianPhoneVal = value('guardianPhone').trim();
  if (guardianPhoneVal && !/^\d{10,15}$/.test(guardianPhoneVal)) { showFieldError('guardianPhone', 'Enter 10-15 digits'); scrollToFirstInvalid(); return; }
  const emergencyVal = value('emergencyContact').trim();
  if (emergencyVal && !/^\d{10,15}$/.test(emergencyVal)) { showFieldError('emergencyContact', 'Enter 10-15 digits'); scrollToFirstInvalid(); return; }
  const dobVal = value('dob').trim();
  if (dobVal) {
    const d = new Date(dobVal);
    if (d > new Date()) { showFieldError('dob', 'Date of birth cannot be in the future'); scrollToFirstInvalid(); return; }
  }

  // Clear old errors
  document.querySelectorAll('#studentForm .sf-invalid').forEach(el => el.classList.remove('sf-invalid'));
  document.querySelectorAll('.sf-field-error').forEach(el => { el.style.display = 'none'; el.textContent = ''; });
  if (errBox) errBox.style.display = 'none';

  const payload = {
    name: nameVal,
    rollNo: rollVal,
    email: emailVal,
    phone: phoneVal,
    departmentId: deptNum,
    semesterId: semNum,
    section: value('section').trim(),
    year: parseInt(yrVal, 10) || 0,
    course: value('course').trim(),
    dob: dobVal,
    gender: value('gender').trim(),
    bloodGroup: value('bloodGroup').trim(),
    address: value('address').trim(),
    guardianName: value('guardianName').trim(),
    guardianPhone: guardianPhoneVal,
    emergencyContact: emergencyVal,
    relationship: value('relationship').trim(),
    languages: value('languages').trim()
  };

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:15px;height:15px;"></i> Saving...';
  if (window.lucide) lucide.createIcons();

  try {
    let created = null;
    if (Number(id) > 0) {
      await API.updateStudentFull(Number(id), payload);
    } else {
      const res = await API.createStudent(payload);
      created = (res && res.student) ? res.student : null;
    }

    // The photo goes up only once the row exists, addressed by id when we have
    // one and by roll number immediately after a create.
    let photoWarning = '';
    if (pendingStudentPhotoFile) {
      const photo = pendingStudentPhotoFile;
      pendingStudentPhotoFile = null;
      try {
        await API.uploadStudentPhoto(created ? created.id : payload.rollNo, photo);
      } catch (photoErr) {
        photoWarning = ' The photo could not be saved: ' + ((photoErr && photoErr.message) || 'Unknown error');
      }
    }

    closeStudentFormModal();
    closeStudentModal();
    if (typeof loadStudents === 'function') loadStudents();
    showCustomAlert(
      (Number(id) > 0 ? 'Student updated.' : 'Student created.') + photoWarning,
      photoWarning ? 'error' : 'success'
    );
  } catch (err) {
    const msg = (err && err.message) ? err.message : 'Unknown error';
    const fieldName = mapServerErrorToField(msg);
    if (fieldName && document.getElementById('sf_err_' + fieldName)) {
      showFieldError(fieldName, (fieldName === 'departmentId') ? 'Please select a department' : (fieldName === 'rollNo') ? 'This roll number already exists' : msg);
      scrollToFirstInvalid();
      if (errBox) errBox.style.display = 'none';
    } else {
      if (errBox) { errBox.style.display = 'block'; errBox.textContent = msg; }
      else alert('Save failed: ' + msg);
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

// ---------------------------------------------------------------------------
// Photo crop inside the Add / Edit Student form
// ---------------------------------------------------------------------------
// The cropped result is held as a File until the form is submitted, because a
// brand new student has no id to upload against yet. submitStudentForm() then
// pushes it through api/student-photo.php, which stores the path in
// students.photo.
let pendingStudentPhotoFile = null;
let studentPhotoPreviewUrl = null;

function clearPendingStudentPhoto() {
  pendingStudentPhotoFile = null;
  if (studentPhotoPreviewUrl) {
    URL.revokeObjectURL(studentPhotoPreviewUrl);
    studentPhotoPreviewUrl = null;
  }
}

// Renders an image inside the round preview slot of the student form.
function setStudentFormPhotoPreview(src) {
  const preview = document.getElementById('studentPhotoPreview');
  if (!preview) return;
  if (!src) {
    preview.innerHTML = '<i data-lucide="user" style="width:48px;height:48px;color:rgba(255,255,255,0.4);"></i>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  preview.innerHTML = `<img src="${escAttr(src)}" alt="Student Photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
}

// Injects the crop dialog styles once per page. Both cropper entry points call
// this, otherwise the first dialog opened from the student form renders with no
// layout, background or button styling at all.
function ensurePhotoCropperStyles() {
  if (document.getElementById('pcStyles')) return;
  const st = document.createElement('style');
  st.id = 'pcStyles';
  st.textContent = `
    .pc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px}
    .pc-box{background:#0f172a;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:18px;width:100%;max-width:520px;color:#fff;max-height:95vh;overflow:auto}
    .pc-box h3{margin:0 0 10px;font-size:1.05rem}
    .pc-stage{width:100%;height:320px;background:#000;border-radius:10px;overflow:hidden}
    .pc-stage img{display:block;max-width:100%}
    .pc-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
    .pc-row span{font-size:.72rem;opacity:.75;margin-right:4px;min-width:48px}
    .pc-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;font-family:inherit;font-size:.8rem}
    .pc-btn.active{background:#2563eb;border-color:#2563eb}
    .pc-btn.pc-save{background:#2563eb;border-color:#2563eb;font-weight:700}
    .pc-btn:disabled{opacity:.6;cursor:wait}
    .pc-round .cropper-view-box,.pc-round .cropper-face{border-radius:50%}
    .pc-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}
  `;
  document.head.appendChild(st);
}

function openPhotoCropperForNewStudent(file) {
  if (typeof Cropper === 'undefined') {
    showCustomAlert('Crop tool failed to load. Check internet and refresh the page.', 'error');
    return;
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    showCustomAlert('Only JPG, PNG or WEBP images are allowed.', 'error');
    return;
  }

  ensurePhotoCropperStyles();

  const url = URL.createObjectURL(file);
  const ov = document.createElement('div');
  ov.className = 'pc-overlay';
  ov.innerHTML = `
    <div class="pc-box">
      <h3>Crop Student Photo</h3>
      <div class="pc-stage pc-round" id="pcStage"><img id="pcImg" src="${url}" alt="Crop"></div>
      <div class="pc-row" id="pcRatios">
        <span>Shape</span>
        <button type="button" class="pc-btn active" data-r="1">Square</button>
        <button type="button" class="pc-btn" data-r="1.3333333">4:3</button>
        <button type="button" class="pc-btn" data-r="0.75">3:4</button>
        <button type="button" class="pc-btn" data-r="free">Free</button>
      </div>
      <div class="pc-row">
        <span>Tools</span>
        <button type="button" class="pc-btn" id="pcZoomIn">Zoom +</button>
        <button type="button" class="pc-btn" id="pcZoomOut">Zoom -</button>
        <button type="button" class="pc-btn" id="pcRotL">Rotate left</button>
        <button type="button" class="pc-btn" id="pcRotR">Rotate right</button>
        <button type="button" class="pc-btn" id="pcFlip">Flip</button>
        <button type="button" class="pc-btn" id="pcReset">Reset</button>
      </div>
      <div class="pc-actions">
        <button type="button" class="pc-btn" id="pcCancel">Cancel</button>
        <button type="button" class="pc-btn pc-save" id="pcSave">Save Photo</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const cropper = new Cropper(document.getElementById('pcImg'), {
    aspectRatio: 1, 
    viewMode: 1, 
    dragMode: 'move',
    autoCropArea: 0.9, 
    background: false
  });
  
  let flip = 1;
  const stage = document.getElementById('pcStage');

  function close() {
    cropper.destroy();
    URL.revokeObjectURL(url);
    ov.remove();
  }

  document.querySelectorAll('#pcRatios .pc-btn').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('#pcRatios .pc-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      const r = b.getAttribute('data-r');
      cropper.setAspectRatio(r === 'free' ? NaN : parseFloat(r));
      stage.classList.toggle('pc-round', r === '1');
    };
  });
  
  document.getElementById('pcZoomIn').onclick  = function () { cropper.zoom(0.1); };
  document.getElementById('pcZoomOut').onclick = function () { cropper.zoom(-0.1); };
  document.getElementById('pcRotL').onclick    = function () { cropper.rotate(-90); };
  document.getElementById('pcRotR').onclick    = function () { cropper.rotate(90); };
  document.getElementById('pcFlip').onclick    = function () { flip = -flip; cropper.scaleX(flip); };
  document.getElementById('pcReset').onclick   = function () { flip = 1; cropper.reset(); };
  document.getElementById('pcCancel').onclick  = close;

  document.getElementById('pcSave').onclick = function () {
    const btn = document.getElementById('pcSave');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 512, 
      maxHeight: 512, 
      fillColor: '#fff', 
      imageSmoothingQuality: 'high'
    });
    
    canvas.toBlob(function (blob) {
      if (!blob) {
        showCustomAlert('Could not crop image.', 'error');
        btn.disabled = false;
        btn.textContent = 'Save Photo';
        return;
      }

      // Kept until submit: api/student-photo.php takes a real multipart file,
      // not a data URL, and students.photo stores a short path.
      pendingStudentPhotoFile = new File([blob], 'student-photo.jpg', { type: 'image/jpeg' });

      if (studentPhotoPreviewUrl) URL.revokeObjectURL(studentPhotoPreviewUrl);
      studentPhotoPreviewUrl = URL.createObjectURL(blob);
      setStudentFormPhotoPreview(studentPhotoPreviewUrl);

      close();
      showCustomAlert('Photo cropped. It is saved when you save the student.', 'success');
    }, 'image/jpeg', 0.9);
  };
}

// Photo crop (shared by students popup + student profile page)
// ---------------------------------------------------------------------------
function onModalPhotoPicked(input, studentId) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  openPhotoCropper(studentId, file, function (photoUrl) {
    const box = document.querySelector('.modal-card .student-avatar-icon');
    if (box) {
      const old = box.querySelector('.student-avatar-img');
      if (old) old.remove();
      const img = document.createElement('img');
      img.className = 'student-avatar-img';
      img.alt = 'Student photo';
      img.src = bustImageCache(photoUrl);
      img.onerror = function () { this.remove(); };
      box.appendChild(img);
    }
    if (typeof loadStudents === 'function') loadStudents();
  });
}

function openPhotoCropper(studentId, file, onDone) {
  if (typeof Cropper === 'undefined') {
    alert('Crop tool failed to load. Check internet and refresh the page.');
    return;
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    alert('Only JPG, PNG or WEBP images are allowed.');
    return;
  }

  ensurePhotoCropperStyles();

  const url = URL.createObjectURL(file);
  const ov = document.createElement('div');
  ov.className = 'pc-overlay';
  ov.innerHTML = `
    <div class="pc-box">
      <h3>Crop photo</h3>
      <div class="pc-stage pc-round" id="pcStage"><img id="pcImg" src="${url}" alt="Crop"></div>
      <div class="pc-row" id="pcRatios">
        <span>Shape</span>
        <button type="button" class="pc-btn active" data-r="1">Square</button>
        <button type="button" class="pc-btn" data-r="1.3333333">4:3</button>
        <button type="button" class="pc-btn" data-r="0.75">3:4</button>
        <button type="button" class="pc-btn" data-r="free">Free</button>
      </div>
      <div class="pc-row">
        <span>Tools</span>
        <button type="button" class="pc-btn" id="pcZoomIn">Zoom +</button>
        <button type="button" class="pc-btn" id="pcZoomOut">Zoom -</button>
        <button type="button" class="pc-btn" id="pcRotL">Rotate left</button>
        <button type="button" class="pc-btn" id="pcRotR">Rotate right</button>
        <button type="button" class="pc-btn" id="pcFlip">Flip</button>
        <button type="button" class="pc-btn" id="pcReset">Reset</button>
      </div>
      <div class="pc-actions">
        <button type="button" class="pc-btn" id="pcCancel">Cancel</button>
        <button type="button" class="pc-btn pc-save" id="pcSave">Save photo</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const cropper = new Cropper(document.getElementById('pcImg'), {
    aspectRatio: 1, viewMode: 1, dragMode: 'move',
    autoCropArea: 0.9, background: false
  });
  let flip = 1;
  const stage = document.getElementById('pcStage');

  function close() {
    cropper.destroy();
    URL.revokeObjectURL(url);
    ov.remove();
  }

  document.querySelectorAll('#pcRatios .pc-btn').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('#pcRatios .pc-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      const r = b.getAttribute('data-r');
      cropper.setAspectRatio(r === 'free' ? NaN : parseFloat(r));
      stage.classList.toggle('pc-round', r === '1');
    };
  });
  document.getElementById('pcZoomIn').onclick  = function () { cropper.zoom(0.1); };
  document.getElementById('pcZoomOut').onclick = function () { cropper.zoom(-0.1); };
  document.getElementById('pcRotL').onclick    = function () { cropper.rotate(-90); };
  document.getElementById('pcRotR').onclick    = function () { cropper.rotate(90); };
  document.getElementById('pcFlip').onclick    = function () { flip = -flip; cropper.scaleX(flip); };
  document.getElementById('pcReset').onclick   = function () { flip = 1; cropper.reset(); };
  document.getElementById('pcCancel').onclick  = close;

  document.getElementById('pcSave').onclick = function () {
    const btn = document.getElementById('pcSave');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 512, maxHeight: 512, fillColor: '#fff', imageSmoothingQuality: 'high'
    });
    canvas.toBlob(async function (blob) {
      try {
        if (!blob) throw new Error('Could not crop image.');
        const out = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        const res = await API.uploadStudentPhoto(studentId, out);
        close();
        if (onDone) onDone(res.photo);
      } catch (err) {
        alert('Save failed: ' + ((err && err.message) || 'Unknown error'));
        btn.disabled = false;
        btn.textContent = 'Save photo';
      }
    }, 'image/jpeg', 0.9);
  };
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
    const departments = Array.isArray(data) ? data : (data.departments || []);
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
  buildMobileNav();
  if (window.lucide) {
    lucide.createIcons();
  }
  // Fill the department/semester filters from MariaDB. Until this resolves the
  // dropdowns hold only their "All" option, which is the correct unfiltered
  // default, so it is safe to start loading data immediately.
  populateReferenceFilters();
});

