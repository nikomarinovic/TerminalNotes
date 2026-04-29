/* ═══════════════════════════════════════════════════════════════
   TerminalNotes — script.js
   Full Supabase integration + vanilla JS SPA logic
═══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
//  SUPABASE CONFIG
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jvemzkjltzhhhujxithh.supabase.co';
const SUPABASE_ANON = 'sb_publishable_88AvNhqtgme9rfv5xcTv9Q_uv0eFfgm';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
const state = {
  user:              null,
  notebooks:         [],
  currentNotebook:   null,
  entries:           [],
  filteredEntries:   [],
  activeFilter:      'all',
  editingEntry:      null,
  pendingConfirm:    null,
  searchQuery:       '',
};

// ─────────────────────────────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const els = {
  authScreen:       $('auth-screen'),
  app:              $('app'),

  // Auth
  loginEmail:       $('login-email'),
  loginPassword:    $('login-password'),
  signupEmail:      $('signup-email'),
  signupPassword:   $('signup-password'),
  btnLogin:         $('btn-login'),
  btnSignup:        $('btn-signup'),
  btnGithubLogin:   $('btn-github-login'),
  btnGithubSignup:  $('btn-github-signup'),
  authErrorLogin:   $('auth-error-login'),
  authErrorSignup:  $('auth-error-signup'),

  // App
  userEmailDisplay: $('user-email-display'),
  btnLogout:        $('btn-logout'),
  searchInput:      $('search-input'),

  // Sidebar
  notebookList:     $('notebook-list'),
  btnNewNotebook:   $('btn-new-notebook'),

  // Content
  welcomeScreen:    $('welcome-screen'),
  notebookView:     $('notebook-view'),
  nbTitle:          $('nb-title'),
  nbDesc:           $('nb-desc'),
  btnDeleteNotebook:$('btn-delete-notebook'),
  btnNewEntry:      $('btn-new-entry'),
  entriesList:      $('entries-list'),
  entriesEmpty:     $('entries-empty'),

  // Modals
  modalNewNotebook: $('modal-new-notebook'),
  nbNewTitle:       $('nb-new-title'),
  nbNewDesc:        $('nb-new-desc'),
  btnCreateNotebook:$('btn-create-notebook'),

  modalEntry:       $('modal-entry'),
  modalEntryTitle:  $('modal-entry-title'),
  entryTitle:       $('entry-title'),
  entryCommand:     $('entry-command'),
  entryCmdDesc:     $('entry-cmd-desc'),
  entryTags:        $('entry-tags'),
  entryNoteContent: $('entry-note-content'),
  entryNoteCode:    $('entry-note-code'),
  entryIdeaDesc:    $('entry-idea-desc'),
  entryIdeaStatus:  $('entry-idea-status'),
  btnSaveEntry:     $('btn-save-entry'),

  modalConfirm:     $('modal-confirm'),
  confirmMsg:       $('confirm-msg'),
  btnConfirmYes:    $('btn-confirm-yes'),

  toast:            $('toast'),
};

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
async function init() {
  bindAuthEvents();
  bindAppEvents();

  // Check session
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    state.user = session.user;
    showApp();
  }

  // Listen for auth state changes
  db.auth.onAuthStateChange((_event, session) => {
    if (session) {
      state.user = session.user;
      showApp();
    } else {
      state.user = null;
      showAuth();
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  AUTH LOGIC
// ─────────────────────────────────────────────────────────────
function bindAuthEvents() {
  // Tab switching
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      $$('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      $('auth-form-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Login
  els.btnLogin.addEventListener('click', () => loginEmail());
  els.loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') loginEmail(); });

  // Signup
  els.btnSignup.addEventListener('click', () => signupEmail());
  els.signupPassword.addEventListener('keydown', e => { if (e.key === 'Enter') signupEmail(); });

  // GitHub OAuth
  els.btnGithubLogin.addEventListener('click',  () => loginGithub());
  els.btnGithubSignup.addEventListener('click', () => loginGithub());
}

async function loginEmail() {
  const email    = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) return showAuthError('login', 'Please fill in all fields.');

  setLoading(els.btnLogin, true);
  const { error } = await db.auth.signInWithPassword({ email, password });
  setLoading(els.btnLogin, false);

  if (error) showAuthError('login', error.message);
}

async function signupEmail() {
  const email    = els.signupEmail.value.trim();
  const password = els.signupPassword.value;
  if (!email || !password) return showAuthError('signup', 'Please fill in all fields.');
  if (password.length < 6)  return showAuthError('signup', 'Password must be at least 6 characters.');

  setLoading(els.btnSignup, true);
  const { error } = await db.auth.signUp({ email, password });
  setLoading(els.btnSignup, false);

  if (error) showAuthError('signup', error.message);
  else showToast('Check your email to confirm your account!');
}

async function loginGithub() {
  await db.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin }
  });
}

function showAuthError(form, msg) {
  const el = form === 'login' ? els.authErrorLogin : els.authErrorSignup;
  el.textContent = '// error: ' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ─────────────────────────────────────────────────────────────
//  SHOW / HIDE SCREENS
// ─────────────────────────────────────────────────────────────
async function showApp() {
  els.authScreen.classList.add('hidden');
  els.app.classList.remove('hidden');
  els.userEmailDisplay.textContent = state.user.email || state.user.user_metadata?.user_name || 'user';
  await loadNotebooks();
}

function showAuth() {
  els.app.classList.add('hidden');
  els.authScreen.classList.remove('hidden');
  state.notebooks = [];
  state.currentNotebook = null;
  state.entries = [];
}

// ─────────────────────────────────────────────────────────────
//  NOTEBOOKS
// ─────────────────────────────────────────────────────────────
async function loadNotebooks() {
  const { data, error } = await db
    .from('notebooks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { showToast('Failed to load notebooks', true); return; }
  state.notebooks = data || [];
  renderSidebar();
}

function renderSidebar() {
  const list = els.notebookList;
  list.innerHTML = '';

  if (!state.notebooks.length) {
    list.innerHTML = '<div class="nb-empty">no notebooks yet</div>';
    return;
  }

  state.notebooks.forEach(nb => {
    const div = document.createElement('div');
    div.className = 'nb-item' + (state.currentNotebook?.id === nb.id ? ' active' : '');
    div.dataset.id = nb.id;

    const entryCount = ''; // fetched lazily
    div.innerHTML = `
      <span class="nb-item-icon">&gt;</span>
      <span class="nb-item-name">${escHtml(nb.title)}</span>
    `;
    div.addEventListener('click', () => openNotebook(nb));
    list.appendChild(div);
  });
}

async function openNotebook(nb) {
  state.currentNotebook = nb;
  state.activeFilter = 'all';

  // Update sidebar active
  $$('.nb-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === nb.id);
  });

  // Update filter tabs
  $$('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));

  // Show notebook view
  els.welcomeScreen.classList.add('hidden');
  els.notebookView.classList.remove('hidden');

  els.nbTitle.textContent = nb.title;
  els.nbDesc.textContent  = nb.description || '';

  await loadEntries();
}

async function createNotebook() {
  const title = els.nbNewTitle.value.trim();
  const desc  = els.nbNewDesc.value.trim();
  if (!title) { els.nbNewTitle.focus(); return; }

  const { data, error } = await db
    .from('notebooks')
    .insert({ title, description: desc, user_id: state.user.id })
    .select()
    .single();

  if (error) { showToast('Failed to create notebook', true); return; }

  state.notebooks.push(data);
  renderSidebar();
  closeModal('modal-new-notebook');
  els.nbNewTitle.value = '';
  els.nbNewDesc.value  = '';
  showToast('Notebook created!');
  openNotebook(data);
}

async function deleteCurrentNotebook() {
  if (!state.currentNotebook) return;
  const nb = state.currentNotebook;

  confirm_action(`Delete notebook "${nb.title}" and all its entries?`, async () => {
    // Delete entries first (or rely on cascade if set in DB)
    await db.from('entries').delete().eq('notebook_id', nb.id);
    const { error } = await db.from('notebooks').delete().eq('id', nb.id);

    if (error) { showToast('Failed to delete notebook', true); return; }

    state.notebooks = state.notebooks.filter(n => n.id !== nb.id);
    state.currentNotebook = null;
    state.entries = [];
    renderSidebar();
    els.notebookView.classList.add('hidden');
    els.welcomeScreen.classList.remove('hidden');
    showToast('Notebook deleted');
  });
}

// ─────────────────────────────────────────────────────────────
//  ENTRIES
// ─────────────────────────────────────────────────────────────
async function loadEntries() {
  if (!state.currentNotebook) return;

  const { data, error } = await db
    .from('entries')
    .select('*')
    .eq('notebook_id', state.currentNotebook.id)
    .order('created_at', { ascending: false });

  if (error) { showToast('Failed to load entries', true); return; }
  state.entries = data || [];
  applyFilterAndRender();
  updateNotebookEntryCount();
}

function applyFilterAndRender() {
  let entries = [...state.entries];

  // Apply type filter
  if (state.activeFilter !== 'all') {
    entries = entries.filter(e => e.type === state.activeFilter);
  }

  // Apply search
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    entries = entries.filter(e => {
      const content = JSON.stringify(e.content || '').toLowerCase();
      return e.title.toLowerCase().includes(q) || content.includes(q) || (e.tags || []).join(' ').toLowerCase().includes(q);
    });
  }

  state.filteredEntries = entries;
  renderEntries();
}

function renderEntries() {
  const list = els.entriesList;
  // Keep empty state div, remove entry cards
  $$('.entry-card', list).forEach(el => el.remove());

  if (!state.filteredEntries.length) {
    els.entriesEmpty.classList.remove('hidden');
    return;
  }

  els.entriesEmpty.classList.add('hidden');
  state.filteredEntries.forEach(entry => {
    const card = buildEntryCard(entry);
    list.appendChild(card);
  });
}

function buildEntryCard(entry) {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.dataset.id = entry.id;

  const content = entry.content || {};
  const q = state.searchQuery;

  function hl(str) {
    if (!q || !str) return escHtml(str || '');
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escHtml(str).replace(re, '<mark>$1</mark>');
  }

  let typeLabel = '', typeBadge = '', bodyHtml = '';

  if (entry.type === 'command') {
    typeLabel = 'command';
    typeBadge = 'badge-command';
    const tags = (entry.tags || []).map(t => `<span class="tag">${hl(t)}</span>`).join('');
    bodyHtml = `
      <div class="command-body">
        <div class="command-terminal">
          <div class="terminal-bar">
            <div class="terminal-dots">
              <span class="dot-red"></span>
              <span class="dot-yellow"></span>
              <span class="dot-green"></span>
            </div>
            <button class="btn-copy" data-cmd="${escAttr(content.command || '')}">
              copy
            </button>
          </div>
          <div class="terminal-cmd">
            <span class="terminal-prompt">$</span>
            <span>${hl(content.command || '')}</span>
          </div>
        </div>
        ${content.description ? `<p class="cmd-desc">${hl(content.description)}</p>` : ''}
        ${entry.tags?.length ? `<div class="entry-tags">${tags}</div>` : ''}
      </div>
    `;
  }

  else if (entry.type === 'note') {
    typeLabel = 'note';
    typeBadge = 'badge-note';
    bodyHtml = `
      <div class="note-body">
        <p class="note-content">${hl(content.text || '')}</p>
        ${content.code ? `<pre class="note-code-block">${hl(content.code)}</pre>` : ''}
      </div>
    `;
  }

  else if (entry.type === 'idea') {
    typeLabel = 'idea';
    typeBadge = 'badge-idea';
    const statusMap = { idea: '💡 idea', planning: '📐 planning', building: '🔧 building', done: '✅ done' };
    const statusClass = 'status-' + (content.status || 'idea');
    bodyHtml = `
      <div class="idea-body">
        <p class="idea-desc">${hl(content.description || '')}</p>
        <span class="idea-status-badge ${statusClass}">${statusMap[content.status] || '💡 idea'}</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="entry-card-header">
      <span class="entry-type-badge ${typeBadge}">${typeLabel}</span>
      <span class="entry-title">${hl(entry.title)}</span>
      <div class="entry-actions">
        <button class="btn-icon" title="Edit" data-action="edit" data-id="${entry.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon danger" title="Delete" data-action="delete" data-id="${entry.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
    ${bodyHtml}
  `;

  // Copy button
  const copyBtn = card.querySelector('.btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(copyBtn.dataset.cmd).then(() => {
        copyBtn.textContent = 'copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'copy'; copyBtn.classList.remove('copied'); }, 1800);
      });
    });
  }

  // Action buttons
  card.querySelector('[data-action="edit"]')?.addEventListener('click', () => openEditEntry(entry));
  card.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteEntry(entry));

  return card;
}

function updateNotebookEntryCount() {
  const nb = state.currentNotebook;
  if (!nb) return;
  const item = document.querySelector(`.nb-item[data-id="${nb.id}"] .nb-item-count`);
  // count badge not shown initially, skip silently
}

// ─────────────────────────────────────────────────────────────
//  ENTRY MODAL — CREATE
// ─────────────────────────────────────────────────────────────
let currentEntryType = 'command';

function openNewEntryModal() {
  state.editingEntry = null;
  currentEntryType = 'command';
  els.modalEntryTitle.textContent = '// new entry';
  els.btnSaveEntry.textContent = 'save entry';

  // Reset
  els.entryTitle.value       = '';
  els.entryCommand.value     = '';
  els.entryCmdDesc.value     = '';
  els.entryTags.value        = '';
  els.entryNoteContent.value = '';
  els.entryNoteCode.value    = '';
  els.entryIdeaDesc.value    = '';
  els.entryIdeaStatus.value  = 'idea';

  setEntryType('command');
  openModal('modal-entry');
  setTimeout(() => els.entryTitle.focus(), 100);
}

function openEditEntry(entry) {
  state.editingEntry = entry;
  currentEntryType = entry.type;
  els.modalEntryTitle.textContent = '// edit entry';
  els.btnSaveEntry.textContent = 'update entry';

  const c = entry.content || {};
  els.entryTitle.value = entry.title || '';

  if (entry.type === 'command') {
    els.entryCommand.value = c.command || '';
    els.entryCmdDesc.value = c.description || '';
    els.entryTags.value    = (entry.tags || []).join(', ');
  } else if (entry.type === 'note') {
    els.entryNoteContent.value = c.text || '';
    els.entryNoteCode.value    = c.code || '';
  } else if (entry.type === 'idea') {
    els.entryIdeaDesc.value   = c.description || '';
    els.entryIdeaStatus.value = c.status || 'idea';
  }

  setEntryType(entry.type);
  openModal('modal-entry');
}

function setEntryType(type) {
  currentEntryType = type;
  $$('.entry-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
  $$('.type-fields').forEach(f => f.classList.add('hidden'));
  $('fields-' + type)?.classList.remove('hidden');
}

async function saveEntry() {
  const title = els.entryTitle.value.trim();
  if (!title) { els.entryTitle.focus(); return; }

  let content = {}, tags = [];

  if (currentEntryType === 'command') {
    content = {
      command:     els.entryCommand.value.trim(),
      description: els.entryCmdDesc.value.trim(),
    };
    tags = els.entryTags.value.split(',').map(t => t.trim()).filter(Boolean);
  } else if (currentEntryType === 'note') {
    content = {
      text: els.entryNoteContent.value.trim(),
      code: els.entryNoteCode.value.trim(),
    };
  } else if (currentEntryType === 'idea') {
    content = {
      description: els.entryIdeaDesc.value.trim(),
      status:      els.entryIdeaStatus.value,
    };
  }

  setLoading(els.btnSaveEntry, true);

  if (state.editingEntry) {
    // UPDATE
    const { data, error } = await db
      .from('entries')
      .update({ title, type: currentEntryType, content, tags })
      .eq('id', state.editingEntry.id)
      .select()
      .single();

    setLoading(els.btnSaveEntry, false);
    if (error) { showToast('Failed to update entry', true); return; }

    const idx = state.entries.findIndex(e => e.id === data.id);
    if (idx !== -1) state.entries[idx] = data;
    showToast('Entry updated!');
  } else {
    // INSERT
    const { data, error } = await db
      .from('entries')
      .insert({
        notebook_id: state.currentNotebook.id,
        user_id:     state.user.id,
        title, type: currentEntryType, content, tags
      })
      .select()
      .single();

    setLoading(els.btnSaveEntry, false);
    if (error) { showToast('Failed to save entry', true); return; }

    state.entries.unshift(data);
    showToast('Entry saved!');
  }

  closeModal('modal-entry');
  applyFilterAndRender();
}

async function deleteEntry(entry) {
  confirm_action(`Delete entry "${entry.title}"?`, async () => {
    const { error } = await db.from('entries').delete().eq('id', entry.id);
    if (error) { showToast('Failed to delete entry', true); return; }
    state.entries = state.entries.filter(e => e.id !== entry.id);
    applyFilterAndRender();
    showToast('Entry deleted');
  });
}

// ─────────────────────────────────────────────────────────────
//  APP EVENT BINDINGS
// ─────────────────────────────────────────────────────────────
function bindAppEvents() {
  // Logout
  els.btnLogout.addEventListener('click', async () => {
    await db.auth.signOut();
  });

  // Sidebar
  els.btnNewNotebook.addEventListener('click', () => {
    openModal('modal-new-notebook');
    setTimeout(() => els.nbNewTitle.focus(), 100);
  });

  // New Notebook modal
  els.btnCreateNotebook.addEventListener('click', createNotebook);
  els.nbNewTitle.addEventListener('keydown', e => { if (e.key === 'Enter') createNotebook(); });

  // Delete notebook
  els.btnDeleteNotebook.addEventListener('click', deleteCurrentNotebook);

  // New entry
  els.btnNewEntry.addEventListener('click', openNewEntryModal);

  // Save entry
  els.btnSaveEntry.addEventListener('click', saveEntry);

  // Entry type buttons
  $$('.entry-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setEntryType(btn.dataset.type));
  });

  // Filter tabs
  $$('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.dataset.filter;
      applyFilterAndRender();
    });
  });

  // Search
  els.searchInput.addEventListener('input', () => {
    state.searchQuery = els.searchInput.value.trim().toLowerCase();
    if (state.currentNotebook) applyFilterAndRender();
  });

  // Close modals via backdrop click or [data-modal] buttons
  document.addEventListener('click', (e) => {
    // Backdrop
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target.id);
    }
    // Close buttons
    if (e.target.classList.contains('modal-close') || e.target.dataset.modal) {
      const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
      if (modalId) closeModal(modalId);
    }
  });

  // Confirm delete modal
  els.btnConfirmYes.addEventListener('click', () => {
    if (state.pendingConfirm) {
      state.pendingConfirm();
      state.pendingConfirm = null;
    }
    closeModal('modal-confirm');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+K → focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }
    // Escape → close modals
    if (e.key === 'Escape') {
      ['modal-entry', 'modal-new-notebook', 'modal-confirm'].forEach(closeModal);
    }
    // N → new entry (when notebook open and no modal, no focus on input)
    if (e.key === 'n' && state.currentNotebook && !modalOpen() && !inputFocused()) {
      openNewEntryModal();
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  MODAL HELPERS
// ─────────────────────────────────────────────────────────────
function openModal(id) {
  $(id)?.classList.remove('hidden');
}

function closeModal(id) {
  $(id)?.classList.add('hidden');
  if (id === 'modal-entry') state.editingEntry = null;
}

function modalOpen() {
  return !$('modal-entry').classList.contains('hidden') ||
         !$('modal-new-notebook').classList.contains('hidden');
}

function inputFocused() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function confirm_action(msg, cb) {
  els.confirmMsg.textContent = msg;
  state.pendingConfirm = cb;
  openModal('modal-confirm');
}

// ─────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg, isError = false) {
  const t = els.toast;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '';
}

// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────
init();
