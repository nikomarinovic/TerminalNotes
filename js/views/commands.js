/* ═══════════════════════════════════════════════
   views/commands.js
═══════════════════════════════════════════════ */

Views._cmdRegistry = {};
Views._cmdFiltered = [];
Views._cmdPage = 0;
const CMD_PAGE_SIZE = 5;

Views.commands = async function() {
  const { data: commands, error } = await DB.getCommands(Auth.user.id);
  if (error) { toast(error.message, 'error'); return; }

  Views._cmdRegistry = {};
  (commands || []).forEach(c => { Views._cmdRegistry[c.id] = c; });

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// commands</div>
        <h1 class="page-title">Command Library</h1>
        <p class="page-sub">Your personal developer cheatsheet. One-click copy.</p>
      </div>
      <button class="btn btn-primary" onclick="Modals.command()">+ New Command</button>
    </div>

    <div style="margin-bottom:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <input id="cmd-filter" class="form-input" style="max-width:280px" placeholder="Filter commands..." oninput="Views._filterCmds(this.value)"/>
      <span style="font-family:var(--font-mono);font-size:.78rem;color:var(--text-3)">${(commands||[]).length} total</span>
    </div>

    <div id="cmd-list"></div>
  `);

  Views._allCommands = commands || [];
  Views._cmdFiltered = commands || [];
  Views._cmdPage = 0;
  Views._renderCommandsPage();
};

Views._commandCard = function(c) {
  return `
    <div class="card cmd-card" data-search="${esc((c.title+' '+c.command+' '+(c.tags||[]).join(' ')).toLowerCase())}">
      <div class="card-header">
        <span class="card-title">${esc(c.title)}</span>
        <div style="display:flex;gap:6px;align-items:center">
          ${c.is_public ? '<span class="badge badge-green">public</span>' : ''}
          <button class="btn-icon" onclick="Views._editCmd('${c.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon red" onclick="Views._confirmDeleteCmd('${c.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="cmd-block">
          <div class="cmd-block-bar">
            <div class="cmd-dots"><span></span><span></span><span></span></div>
            <button class="btn-copy" onclick="copyCmd(this,${JSON.stringify(c.command)})">copy</button>
          </div>
          <div class="cmd-code"><span class="cmd-prompt">$</span>${esc(c.command)}</div>
        </div>
        ${c.description ? `<p class="cmd-desc">${esc(c.description)}</p>` : ''}
        ${c.tags?.length ? `<div class="tags" style="margin-top:10px">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `;
};

Views._editCmd = function(id) {
  const c = Views._cmdRegistry[id];
  if (c) Modals.command(c);
};

Views._confirmDeleteCmd = function(id) {
  const c = Views._cmdRegistry[id];
  if (c) Modals.confirmDelete(c.title, () => Views._deleteCmd(id));
};

Views._filterCmds = function(query) {
  const q = query.toLowerCase().trim();
  Views._cmdFiltered = (Views._allCommands || []).filter(c => {
    const haystack = `${c.title || ''} ${c.command || ''} ${(c.tags || []).join(' ')}`.toLowerCase();
    return !q || haystack.includes(q);
  });
  Views._cmdPage = 0;
  Views._renderCommandsPage();
};

Views._changeCmdPage = function(dir) {
  const totalPages = Math.max(1, Math.ceil((Views._cmdFiltered || []).length / CMD_PAGE_SIZE));
  Views._cmdPage = Math.max(0, Math.min(totalPages - 1, Views._cmdPage + dir));
  Views._renderCommandsPage();
};

Views._renderCommandsPage = function() {
  const list = document.getElementById('cmd-list');
  if (!list) return;
  const items = Views._cmdFiltered || [];
  if (!items.length) {
    list.innerHTML = UI.empty(Icons.svg('command','ui-icon'), 'No commands found', 'Try another filter or add a new command.', '+ New Command', 'Modals.command()');
    return;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / CMD_PAGE_SIZE));
  const page = Math.min(Views._cmdPage, totalPages - 1);
  Views._cmdPage = page;
  const pageItems = items.slice(page * CMD_PAGE_SIZE, (page + 1) * CMD_PAGE_SIZE);

  list.innerHTML = `
    <div class="section-row">
      <div class="section-row-title">Commands</div>
      <span style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-3)">page ${page + 1} / ${totalPages}</span>
    </div>
    <div class="card-list">
      ${pageItems.map(c => Views._commandCard(c)).join('')}
    </div>
    <div class="nb-pagination">
      <button class="nb-page-btn" onclick="Views._changeCmdPage(-1)" ${page === 0 ? 'disabled' : ''}>← prethodna stranica</button>
      <span class="nb-page-info">${page + 1} / ${totalPages}</span>
      <button class="nb-page-btn" onclick="Views._changeCmdPage(1)" ${page >= totalPages - 1 ? 'disabled' : ''}>sljedeća stranica →</button>
    </div>
  `;
};

Views._deleteCmd = async function(id) {
  const { error } = await DB.deleteCommand(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Command deleted');
  Views.commands();
};