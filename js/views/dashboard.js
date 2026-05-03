/* ═══════════════════════════════════════════════
   views/dashboard.js
═══════════════════════════════════════════════ */
Views.dashboard = async function() {
  const uid = Auth.user.id;
  const [nb, cmd, ideas, proj] = await Promise.all([
    DB.getNotebooks(uid), DB.getCommands(uid),
    DB.getIdeas(uid),     DB.getProjects(uid),
  ]);

  const username = Auth.profile?.username || 'dev';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// dashboard</div>
        <h1 class="page-title">${greeting}, <em style="font-style:italic;color:var(--accent)">${esc(username)}</em></h1>
        <p class="page-sub">Here's your developer brain at a glance.</p>
      </div>
      <button class="btn btn-primary" onclick="Modals.notebook()">+ New Notebook</button>
    </div>

    <div class="stats-row">
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('notebooks')">
        <div class="stat-num">${(nb.data||[]).length}</div>
        <div class="stat-label">📓 notebooks</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('commands')">
        <div class="stat-num">${(cmd.data||[]).length}</div>
        <div class="stat-label">$_ commands</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('ideas')">
        <div class="stat-num">${(ideas.data||[]).length}</div>
        <div class="stat-label">💡 ideas</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('projects')">
        <div class="stat-num">${(proj.data||[]).length}</div>
        <div class="stat-label">🚀 projects</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Recent Notebooks -->
      <div>
        <div class="section-row">
          <div class="section-row-title">// recent notebooks</div>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('notebooks')">view all</button>
        </div>
        <div class="card-list">
          ${(nb.data||[]).slice(0,4).map(n => `
            <div class="card" style="cursor:pointer" onclick="Views._openNotebook(${JSON.stringify(JSON.stringify(n))})">
              <div class="card-header">
                <span class="card-title">📓 ${esc(n.title)}</span>
                ${n.is_public ? '<span class="badge badge-green">public</span>' : '<span class="badge badge-gray">private</span>'}
              </div>
              ${n.description ? `<div class="card-body"><p style="font-size:.85rem;color:var(--text-2)">${esc(n.description)}</p></div>` : ''}
            </div>
          `).join('') || '<div class="card"><div class="card-body" style="padding:20px;text-align:center;color:var(--text-3);font-size:.85rem">No notebooks yet</div></div>'}
        </div>
      </div>

      <!-- Recent Ideas -->
      <div>
        <div class="section-row">
          <div class="section-row-title">// recent ideas</div>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('ideas')">view all</button>
        </div>
        <div class="card-list">
          ${(ideas.data||[]).slice(0,4).map(i => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">💡 ${esc(i.title)}</span>
                <span class="idea-status status-${esc(i.status)}">${esc(i.status)}</span>
              </div>
              ${i.description ? `<div class="card-body"><p style="font-size:.85rem;color:var(--text-2);line-height:1.55">${esc(i.description.substring(0,100))}${i.description.length>100?'…':''}</p></div>` : ''}
            </div>
          `).join('') || '<div class="card"><div class="card-body" style="padding:20px;text-align:center;color:var(--text-3);font-size:.85rem">No ideas yet</div></div>'}
        </div>
      </div>
    </div>

    <!-- Recent Commands -->
    <div style="margin-top:28px">
      <div class="section-row">
        <div class="section-row-title">// recent commands</div>
        <button class="btn btn-ghost btn-sm" onclick="Router.navigate('commands')">view all</button>
      </div>
      <div class="grid-2">
        ${(cmd.data||[]).slice(0,4).map(c => `
          <div class="card">
            <div class="card-header">
              <span class="card-title">${esc(c.title)}</span>
              <div style="display:flex;gap:6px">
                <button class="btn-icon" onclick="Modals.command(${JSON.stringify(JSON.stringify(c))})" title="Edit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="cmd-block">
                <div class="cmd-block-bar">
                  <div class="cmd-dots"><span></span><span></span><span></span></div>
                  <button class="btn-copy" onclick="copyCmd(this,'${esc(c.command)}')">copy</button>
                </div>
                <div class="cmd-code"><span class="cmd-prompt">$</span>${esc(c.command)}</div>
              </div>
              ${c.tags?.length ? `<div class="tags" style="margin-top:8px">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-3);font-size:.85rem">No commands saved yet.</p>'}
      </div>
    </div>
  `);
};