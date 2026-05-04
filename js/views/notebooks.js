/* ═══════════════════════════════════════════════
   views/notebooks.js
═══════════════════════════════════════════════ */

Views._nbRegistry    = {};
Views._entryRegistry = {};
Views._nbPages       = {}; /* { sectionType: currentPage } */

const NB_PAGE_SIZE = 5; /* entries per section page */

Views._spineColor = function(id) {
  const colors = ['#00c896','#4da9ff','#b48eff','#f5a623','#26d0ce','#94a3b8'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

/* ─── Notebooks list ─── */
Views.notebooks = async function() {
  const { data: notebooks, error } = await DB.getNotebooks(Auth.user.id);
  if (error) { toast(error.message, 'error'); return; }

  Views._nbRegistry = {};
  (notebooks || []).forEach(nb => { Views._nbRegistry[nb.id] = nb; });

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// notebooks</div>
        <h1 class="page-title">Your Notebooks</h1>
        <p class="page-sub">Structured pages for commands, notes, and knowledge.</p>
      </div>
      <button class="btn btn-primary" onclick="Modals.notebook()">+ New Notebook</button>
    </div>
    ${!notebooks?.length
      ? UI.empty('📓', 'No notebooks yet', 'Create your first notebook.', '+ New Notebook', 'Modals.notebook()')
      : `<div class="nb-grid">${notebooks.map(nb => Views._notebookCard(nb)).join('')}</div>`
    }
  `);
};

Views._notebookCard = function(nb) {
  return `
    <div class="nb-book" onclick="Views._openNotebook('${nb.id}')">
      <div class="nb-book-cover">
        <div class="nb-book-cover-inner">
          <div class="nb-book-label">// notebook</div>
          <div class="nb-book-title">${esc(nb.title)}</div>
          ${nb.description ? `<div class="nb-book-desc">${esc(nb.description)}</div>` : ''}
        </div>
        <div class="nb-book-footer">
          <span class="nb-date">${reltime(nb.created_at)}</span>
          <div style="display:flex;gap:5px;align-items:center">
            ${nb.is_public ? '<span class="badge badge-green">public</span>' : '<span class="badge badge-gray">private</span>'}
            <div class="nb-book-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="Views._editNotebook('${nb.id}')" title="Edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon red" onclick="Views._confirmDeleteNotebook('${nb.id}')" title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
};

Views._editNotebook = function(id) { const nb = Views._nbRegistry[id]; if (nb) Modals.notebook(nb); };
Views._confirmDeleteNotebook = function(id) {
  const nb = Views._nbRegistry[id];
  if (nb) Modals.confirmDelete(nb.title, () => Views._deleteNotebook(id), true);
};

/* ─── Open notebook ─── */
Views._openNotebook = async function(idOrObj) {
  let nb;
  if (typeof idOrObj === 'string' && idOrObj.length <= 36) {
    nb = Views._nbRegistry[idOrObj];
    if (!nb) { const { data } = await db.from('notebooks').select('*').eq('id', idOrObj).single(); nb = data; }
  } else if (typeof idOrObj === 'object' && idOrObj !== null) {
    nb = idOrObj;
  } else { try { nb = JSON.parse(idOrObj); } catch(e) { return; } }
  if (!nb) { toast('Notebook not found', 'error'); return; }

  Views._nbRegistry[nb.id] = nb;
  Router.params = { notebook: nb, notebookId: nb.id };

  /* Render shell immediately — no loading flash */
  const color = Views._spineColor(nb.id);
  UI.renderMain(`
    <button class="btn btn-ghost btn-sm" onclick="Views.notebooks()" style="margin-bottom:20px">← back to notebooks</button>
    <div class="nb-page-wrap">
      <div class="nb-page-inner">
        <div class="nb-page-title-area">
          <div>
            <div style="font-family:var(--font-mono);font-size:.7rem;color:${color};margin-bottom:6px;opacity:.8">~/notebooks/${esc(nb.title)}</div>
            <h1 class="nb-page-heading">${esc(nb.title)}</h1>
            ${nb.description ? `<p class="nb-page-subheading">${esc(nb.description)}</p>` : ''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="Modals.entry('${nb.id}')">+ Add Entry</button>
        </div>
        <div class="nb-page-tabs">
          <button class="nb-ptab active" onclick="Views._filterEntries(this,'all')">all</button>
          <button class="nb-ptab" onclick="Views._filterEntries(this,'note')">notes</button>
          <button class="nb-ptab" onclick="Views._filterEntries(this,'command')">commands</button>
          <button class="nb-ptab" onclick="Views._filterEntries(this,'definition')">definitions</button>
          <button class="nb-ptab" onclick="Views._filterEntries(this,'snippet')">snippets</button>
          <button class="nb-ptab" onclick="Views._filterEntries(this,'concept')">concepts</button>
        </div>
        <div id="entries-container" class="nb-page-body">
          <div style="padding:32px;text-align:center;color:var(--text-3);font-family:var(--font-mono);font-size:.8rem">Loading entries...</div>
        </div>
      </div>
    </div>
  `);

  /* Fetch entries in background */
  const { data: entries } = await DB.getEntries(nb.id);
  Views._currentEntries = entries || [];
  Views._currentNb = nb;
  Views._entryRegistry = {};
  Views._nbPages = {};
  (entries || []).forEach(e => { Views._entryRegistry[e.id] = e; });

  const container = document.getElementById('entries-container');
  if (container) container.innerHTML = Views._renderGrouped(entries || [], color);
};

/* ─── Section constants ─── */
const NB_ORDER  = ['note','command','definition','snippet','concept'];
const NB_LABELS = { note:'Notes', command:'Commands', definition:'Definitions', snippet:'Snippets', concept:'Concepts' };
const NB_TC = {
  note:       { fg:'var(--blue)',   dot:'#4da9ff' },
  command:    { fg:'var(--accent)', dot:'#00c896' },
  definition: { fg:'var(--amber)',  dot:'#f5a623' },
  snippet:    { fg:'var(--purple)', dot:'#b48eff' },
  concept:    { fg:'var(--text-3)', dot:'#64748b' },
};

/* ─── Render entries grouped + paginated ─── */
Views._renderGrouped = function(entries) {
  if (!entries.length) return `
    <div class="nb-empty">
      <div class="nb-empty-icon">_</div>
      <div class="nb-empty-title">No entries yet</div>
      <div class="nb-empty-sub">Hit "+ Add Entry" to fill this notebook.</div>
    </div>`;

  const groups = {};
  entries.forEach(e => {
    const t = NB_ORDER.includes(e.type) ? e.type : 'concept';
    if (!groups[t]) groups[t] = [];
    groups[t].push(e);
  });

  return NB_ORDER
    .filter(t => groups[t]?.length)
    .map(type => {
      const tc = NB_TC[type];
      const all = groups[type];
      const page = Views._nbPages[type] || 0;
      const totalPages = Math.ceil(all.length / NB_PAGE_SIZE);
      const pageItems = all.slice(page * NB_PAGE_SIZE, (page + 1) * NB_PAGE_SIZE);

      return `
        <div class="nb-section" data-section="${type}">
          <div class="nb-section-heading">
            <div class="nb-section-line" style="background:${tc.dot}"></div>
            <span class="nb-section-label" style="color:${tc.dot}">${NB_LABELS[type]}</span>
            <span class="nb-section-count">${all.length}</span>
          </div>
          <div class="nb-section-entries" id="nb-entries-${type}">
            ${Views._renderEntryItems(pageItems, tc)}
          </div>
          ${totalPages > 1 ? `
            <div class="nb-pagination">
              <button class="nb-page-btn" onclick="Views._nbChangePage('${type}',-1)" ${page===0?'disabled':''}>← prev</button>
              <span class="nb-page-info">${page+1} / ${totalPages}</span>
              <button class="nb-page-btn" onclick="Views._nbChangePage('${type}',1)" ${page>=totalPages-1?'disabled':''}>next →</button>
            </div>
          ` : ''}
        </div>`;
    }).join('');
};

Views._renderEntryItems = function(items, tc) {
  return items.map(e => {
    Views._entryRegistry[e.id] = e;
    return `
      <div class="nb-entry" data-entry-type="${esc(e.type)}">
        <div class="nb-entry-dot" style="background:${tc.dot}"></div>
        <div class="nb-entry-body">
          <div class="nb-entry-header">
            <span class="nb-entry-title">${esc(e.title)}</span>
            <div class="nb-entry-actions">
              <button class="btn-icon" onclick="Views._editEntry('${e.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon red" onclick="Views._confirmDeleteEntry('${e.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
          ${e.content ? `<p class="nb-entry-content">${esc(e.content)}</p>` : ''}
          ${e.code ? `
            <div class="cmd-block" style="margin-top:10px">
              <div class="cmd-block-bar">
                <div class="cmd-dots"><span></span><span></span><span></span></div>
                <button class="btn-copy" onclick="copyCmd(this,${JSON.stringify(e.code)})">copy</button>
              </div>
              <div class="cmd-code" style="white-space:pre-wrap;overflow-x:auto"><span class="cmd-prompt">$</span>${esc(e.code)}</div>
            </div>` : ''}
          ${e.tags?.length ? `<div class="tags" style="margin-top:10px">${e.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="nb-entry-time">${reltime(e.created_at)}</div>
        </div>
      </div>`;
  }).join('');
};

Views._nbChangePage = function(type, dir) {
  const tc = NB_TC[type];
  if (!tc) return;
  const allOfType = Views._currentEntries.filter(e => (NB_ORDER.includes(e.type) ? e.type : 'concept') === type);
  const totalPages = Math.ceil(allOfType.length / NB_PAGE_SIZE);
  const cur = Views._nbPages[type] || 0;
  const next = Math.max(0, Math.min(totalPages - 1, cur + dir));
  Views._nbPages[type] = next;
  /* Re-render just this section's entries + pagination */
  const el = document.getElementById('nb-entries-' + type);
  if (!el) return;
  const pageItems = allOfType.slice(next * NB_PAGE_SIZE, (next + 1) * NB_PAGE_SIZE);
  el.innerHTML = Views._renderEntryItems(pageItems, tc);
  /* Update pagination controls */
  const section = el.closest('.nb-section');
  if (!section) return;
  const pag = section.querySelector('.nb-pagination');
  if (pag) {
    pag.querySelector('.nb-page-info').textContent = `${next+1} / ${totalPages}`;
    pag.querySelectorAll('.nb-page-btn')[0].disabled = next === 0;
    pag.querySelectorAll('.nb-page-btn')[1].disabled = next >= totalPages - 1;
  }
};

Views._renderEntries = function(entries) { return Views._renderGrouped(entries); };

Views._filterEntries = function(btn, type) {
  document.querySelectorAll('.nb-ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  Views._nbPages = {};
  const filtered = type === 'all' ? Views._currentEntries : Views._currentEntries.filter(e => e.type === type);
  const el = document.getElementById('entries-container');
  if (el) el.innerHTML = Views._renderGrouped(filtered);
};

Views._editEntry = function(id) {
  const e = Views._entryRegistry[id];
  if (e && Views._currentNb) Modals.entry(Views._currentNb.id, e);
};
Views._confirmDeleteEntry = function(id) {
  const e = Views._entryRegistry[id];
  if (e) Modals.confirmDelete(e.title, () => Views._deleteEntry(id));
};
Views._deleteNotebook = async function(id) {
  await db.from('entries').delete().eq('notebook_id', id);
  const { error } = await DB.deleteNotebook(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Notebook deleted');
  Views.notebooks();
};
Views._deleteEntry = async function(id) {
  const { error } = await DB.deleteEntry(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Entry deleted');
  delete Views._entryRegistry[id];
  Views._currentEntries = Views._currentEntries.filter(e => e.id !== id);
  const el = document.getElementById('entries-container');
  if (el) el.innerHTML = Views._renderGrouped(Views._currentEntries);
};