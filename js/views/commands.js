/* ═══════════════════════════════════════════════
   views/commands.js
═══════════════════════════════════════════════ */

Views.commands = async function() {
  const { data: commands, error } = await DB.getCommands(Auth.user.id);
  if (error) { toast(error.message, 'error'); return; }

  const grouped = {};
  (commands || []).forEach(c => {
    const key = (c.tags && c.tags[0]) ? c.tags[0] : 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

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

    <div id="cmd-list">
      ${!commands?.length
        ? UI.empty('$_', 'No commands yet', 'Save your first command to start building your personal cheatsheet.', '+ New Command', 'Modals.command()')
        : Object.entries(grouped).map(([group, cmds]) => `
          <div class="cmd-group" data-group="${esc(group)}" style="margin-bottom:28px">
            <div class="section-row">
              <div class="section-row-title">// ${esc(group)}</div>
              <span style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-3)">${cmds.length} command${cmds.length!==1?'s':''}</span>
            </div>
            <div class="card-list">
              ${cmds.map(c => Views._commandCard(c)).join('')}
            </div>
          </div>
        `).join('')
      }
    </div>
  `);

  Views._allCommands = commands || [];
};

Views._commandCard = function(c) {
  const cStr = JSON.stringify(JSON.stringify(c));
  return `
    <div class="card cmd-card" data-search="${esc((c.title+' '+c.command+' '+(c.tags||[]).join(' ')).toLowerCase())}">
      <div class="card-header">
        <span class="card-title">${esc(c.title)}</span>
        <div style="display:flex;gap:6px;align-items:center">
          ${c.is_public ? '<span class="badge badge-green">public</span>' : ''}
          <button class="btn-icon" onclick="Modals.command(JSON.parse(${cStr}))" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon red" onclick="Modals.confirmDelete('${esc(c.title)}',()=>Views._deleteCmd('${c.id}'))" title="Delete">
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

Views._filterCmds = function(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.cmd-card').forEach(el => {
    const match = !q || el.dataset.search.includes(q);
    el.style.display = match ? '' : 'none';
  });
  document.querySelectorAll('.cmd-group').forEach(g => {
    const visible = [...g.querySelectorAll('.cmd-card')].some(c => c.style.display !== 'none');
    g.style.display = visible ? '' : 'none';
  });
};

Views._deleteCmd = async function(id) {
  const { error } = await DB.deleteCommand(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Command deleted');
  Views.commands();
};
