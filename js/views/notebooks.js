/* ═══════════════════════════════════════════════
   views/notebooks.js
═══════════════════════════════════════════════ */

/* Safe data registry — avoids inline JSON escaping bugs */
Views._nbRegistry = {};
Views._entryRegistry = {};

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
      ? UI.empty('📓', 'No notebooks yet', 'Create your first notebook to start organising your developer knowledge.', '+ New Notebook', 'Modals.notebook()')
      : `<div class="grid-2" id="notebook-grid">
          ${notebooks.map(nb => Views._notebookCard(nb)).join('')}
        </div>`
    }
  `);
};

Views._notebookCard = function(nb) {
  return `
    <div class="notebook-page" style="position:relative;cursor:pointer" onclick="Views._openNotebook('${nb.id}')">
      <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--accent);border-radius:12px 0 0 12px;"></div>
      <div class="notebook-page-header" style="padding-left:22px">
        <div>
          <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--accent);margin-bottom:4px">// notebook</div>
          <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:400;color:var(--text)">${esc(nb.title)}</div>
          ${nb.description ? `<div style="font-size:.82rem;color:var(--text-2);margin-top:4px">${esc(nb.description)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center" onclick="event.stopPropagation()">
          ${nb.is_public ? '<span class="badge badge-green">public</span>' : '<span class="badge badge-gray">private</span>'}
          <button class="btn-icon" onclick="Views._editNotebook('${nb.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon red" onclick="Views._confirmDeleteNotebook('${nb.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="notebook-page-body" style="padding-left:22px">
        <p style="font-family:var(--font-mono);font-size:.75rem;color:var(--text-3)">
          created ${reltime(nb.created_at)} · click to open
        </p>
      </div>
    </div>
  `;
};

Views._editNotebook = function(id) {
  const nb = Views._nbRegistry[id];
  if (nb) Modals.notebook(nb);
};

Views._confirmDeleteNotebook = function(id) {
  const nb = Views._nbRegistry[id];
  if (nb) Modals.confirmDelete(nb.title, () => Views._deleteNotebook(id), true);
};

Views._openNotebook = async function(idOrObj) {
  let nb;
  if (typeof idOrObj === 'string' && idOrObj.length <= 36) {
    nb = Views._nbRegistry[idOrObj];
    if (!nb) {
      const { data } = await db.from('notebooks').select('*').eq('id', idOrObj).single();
      nb = data;
    }
  } else if (typeof idOrObj === 'object' && idOrObj !== null) {
    nb = idOrObj;
  } else {
    try { nb = JSON.parse(idOrObj); } catch(e) { return; }
  }
  if (!nb) { toast('Notebook not found', 'error'); return; }

  Views._nbRegistry[nb.id] = nb;
  Router.params = { notebook: nb, notebookId: nb.id };
  UI.renderMain(UI.loading());

  const { data: entries } = await DB.getEntries(nb.id);
  Views._currentEntries = entries || [];
  Views._currentNb = nb;
  Views._entryRegistry = {};
  (entries || []).forEach(e => { Views._entryRegistry[e.id] = e; });

  UI.renderMain(`
    <div style="margin-bottom:8px">
      <button class="btn btn-ghost btn-sm" onclick="Views.notebooks()">← back to notebooks</button>
    </div>

    <div class="notebook-page" style="position:relative;margin-bottom:28px">
      <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--accent);border-radius:12px 0 0 12px;"></div>
      <div class="notebook-page-header" style="padding-left:22px">
        <div>
          <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--accent);margin-bottom:2px">~/notebooks/${esc(nb.title)}</div>
          <h1 style="font-family:var(--font-display);font-size:1.6rem;font-weight:300;color:var(--text)">${esc(nb.title)}</h1>
          ${nb.description ? `<p style="font-size:.9rem;color:var(--text-2);margin-top:6px">${esc(nb.description)}</p>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="Modals.entry('${nb.id}')">+ Add Entry</button>
      </div>
    </div>

    <div class="page-tabs">
      <button class="ptab active" data-ptab="all" onclick="Views._filterEntries(this,'all')">all (${(entries||[]).length})</button>
      <button class="ptab" data-ptab="note" onclick="Views._filterEntries(this,'note')">notes</button>
      <button class="ptab" data-ptab="command" onclick="Views._filterEntries(this,'command')">commands</button>
      <button class="ptab" data-ptab="definition" onclick="Views._filterEntries(this,'definition')">definitions</button>
      <button class="ptab" data-ptab="snippet" onclick="Views._filterEntries(this,'snippet')">snippets</button>
    </div>

    <div id="entries-container" class="card-list">
      ${Views._renderEntries(entries || [])}
    </div>
  `);
};

Views._renderEntries = function(entries) {
  if (!entries.length) return UI.empty('_', 'No entries yet', 'Add notes, commands, or definitions to this notebook.', '', '');
  const typeColors = { note:'badge-blue', command:'badge-green', definition:'badge-amber', snippet:'badge-purple', concept:'badge-gray' };
  return entries.map(e => {
    Views._entryRegistry[e.id] = e;
    return `
      <div class="card" data-entry-type="${esc(e.type)}">
        <div class="card-header">
          <span class="badge ${typeColors[e.type]||'badge-gray'}">${esc(e.type)}</span>
          <span class="card-title" style="font-size:.95rem">${esc(e.title)}</span>
          <div style="display:flex;gap:4px;margin-left:auto">
            <button class="btn-icon" onclick="Views._editEntry('${e.id}')" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon red" onclick="Views._confirmDeleteEntry('${e.id}')" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
        <div class="card-body">
          ${e.content ? `<p style="font-size:.9rem;color:var(--text-2);line-height:1.65;white-space:pre-wrap;margin-bottom:${e.code?'10px':'0'}">${esc(e.content)}</p>` : ''}
          ${e.code ? `
            <div class="cmd-block">
              <div class="cmd-block-bar">
                <div class="cmd-dots"><span></span><span></span><span></span></div>
                <button class="btn-copy" onclick="copyCmd(this,${JSON.stringify(e.code)})">copy</button>
              </div>
              <div class="cmd-code" style="white-space:pre-wrap;overflow-x:auto"><span class="cmd-prompt">$</span>${esc(e.code)}</div>
            </div>
          ` : ''}
          ${e.tags?.length ? `<div class="tags" style="margin-top:10px">${e.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          <div style="margin-top:8px;font-family:var(--font-mono);font-size:.7rem;color:var(--text-3)">${reltime(e.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
};

Views._editEntry = function(id) {
  const e = Views._entryRegistry[id];
  const nb = Views._currentNb;
  if (e && nb) Modals.entry(nb.id, e);
};

Views._confirmDeleteEntry = function(id) {
  const e = Views._entryRegistry[id];
  if (e) Modals.confirmDelete(e.title, () => Views._deleteEntry(id));
};

Views._filterEntries = function(btn, type) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all'
    ? Views._currentEntries
    : Views._currentEntries.filter(e => e.type === type);
  document.getElementById('entries-container').innerHTML = Views._renderEntries(filtered);
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
  document.getElementById('entries-container').innerHTML = Views._renderEntries(Views._currentEntries);
};