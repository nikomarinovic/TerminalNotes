/* ═══════════════════════════════════════════════
   ui.js — shared UI utilities
═══════════════════════════════════════════════ */
const UI = {

  showLanding() {
    document.getElementById('landing').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    Router.navigate(Router.current || 'dashboard');
  },

  updateUserDisplay() {
    const p = Auth.profile;
    if (!p) return;
    const initials = (p.username || '?')[0].toUpperCase();
    const avatar = p.avatar_url;

    const tbAvatar = document.getElementById('tb-avatar');
    tbAvatar.innerHTML = avatar ? `<img src="${avatar}" alt="${p.username}"/>` : initials;

    document.getElementById('udd-name').textContent  = p.full_name || p.username || '';
    document.getElementById('udd-email').textContent = Auth.user?.email || '';

    const sbAv = document.getElementById('sb-avatar');
    sbAv.innerHTML = avatar ? `<img src="${avatar}" alt="${p.username}"/>` : initials;
    document.getElementById('sb-name').textContent = p.username || 'Profile';
  },

  setActiveNav(name) {
    document.querySelectorAll('.sb-item').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === name);
    });
  },

  renderMain(html) {
    document.getElementById('main-content').innerHTML = html;
  },

  loading() {
    return `<div class="loading-page"><div class="spinner"></div> Loading...</div>`;
  },

  empty(icon, title, sub, btnLabel, btnAction) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${sub}</p>
        ${btnLabel ? `<button class="btn btn-primary" onclick="${btnAction}">${btnLabel}</button>` : ''}
      </div>
    `;
  },
};

/* ─── Toast ─── */
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ─── Escape HTML ─── */
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ─── Relative time ─── */
function reltime(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
}

/* ─── Copy to clipboard ─── */
function copyCmd(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}

/* ─── Debounce ─── */
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
