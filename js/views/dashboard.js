/* ═══════════════════════════════════════════════
   views/dashboard.js
═══════════════════════════════════════════════ */

/* Data registries for safe onclick handlers */
Views._dashCmdRegistry = {};

Views.dashboard = async function() {
  const uid = Auth.user.id;
  const [nb, cmd, ideas, proj, postsRes, savesRes] = await Promise.all([
    DB.getNotebooks(uid), DB.getCommands(uid),
    DB.getIdeas(uid),     DB.getProjects(uid),
    DB.getPostsByUser(uid, { limit: 6, offset: 0 }),
    DB.getNotebookSaves(uid),
  ]);

  /* Populate registries */
  Views._nbRegistry = Views._nbRegistry || {};
  Views._dashCmdRegistry = {};
  (nb.data || []).forEach(n => { Views._nbRegistry[n.id] = n; });
  (cmd.data || []).forEach(c => { Views._dashCmdRegistry[c.id] = c; });
  const myPosts = postsRes.data || [];
  const savedNotebookIds = (savesRes.data || []).map(s => s.notebook_id);
  let savedNotebooks = [];
  if (savedNotebookIds.length) {
    const { data } = await db.from('notebooks')
      .select('id,title,description,user_id,is_public,created_at')
      .in('id', savedNotebookIds);
    savedNotebooks = (data || []);
  }

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
        <div class="stat-label">${Icons.svg('notebook','ui-icon')} notebooks</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('commands')">
        <div class="stat-num">${(cmd.data||[]).length}</div>
        <div class="stat-label">${Icons.svg('command','ui-icon')} commands</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('ideas')">
        <div class="stat-num">${(ideas.data||[]).length}</div>
        <div class="stat-label">${Icons.svg('idea','ui-icon')} ideas</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('projects')">
        <div class="stat-num">${(proj.data||[]).length}</div>
        <div class="stat-label">${Icons.svg('project','ui-icon')} projects</div>
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
            <div class="card" style="cursor:pointer" onclick="Views._openNotebook('${n.id}')">
              <div class="card-header">
                <span class="card-title">${Icons.svg('notebook','ui-icon')} ${esc(n.title)}</span>
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
                <span class="card-title">${Icons.svg('idea','ui-icon')} ${esc(i.title)}</span>
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
                <button class="btn-icon" onclick="Views._dashEditCmd('${c.id}')" title="Edit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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
              ${c.tags?.length ? `<div class="tags" style="margin-top:8px">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-3);font-size:.85rem">No commands saved yet.</p>'}
      </div>
    </div>

    <div style="margin-top:28px">
      <div class="section-row">
        <div class="section-row-title">// my posts</div>
        <button class="btn btn-ghost btn-sm" onclick="Router.navigate('feed')">open feed</button>
      </div>
      <div class="card-list">
        ${myPosts.map(post => `
          <div class="feed-item">
            <div class="feed-action">${renderRichText(post.content || '')}</div>
            ${post.image_url ? `<img src="${esc(post.image_url)}" class="feed-image" alt="post image"/>` : ''}
            <div class="feed-actions">
              <button class="feed-btn" onclick="Views._editPost('${post.id}')">${Icons.svg('edit','ui-icon')} edit</button>
              <button class="feed-btn" onclick="Views._confirmDeletePost('${post.id}')">${Icons.svg('trash','ui-icon')} delete</button>
            </div>
          </div>
        `).join('') || '<div class="card"><div class="card-body" style="padding:20px;text-align:center;color:var(--text-3);font-size:.85rem">No posts yet</div></div>'}
      </div>
    </div>

    <div style="margin-top:28px">
      <div class="section-row">
        <div class="section-row-title">// saved notebooks</div>
      </div>
      <div class="card-list">
        ${savedNotebooks.map(n => `
          <div class="card" style="cursor:pointer" onclick="Views._openNotebook('${n.id}')">
            <div class="card-header">
              <span class="card-title">${Icons.svg('notebook','ui-icon')} ${esc(n.title)}</span>
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Views._toggleNotebookSave('${n.id}')">unsave</button>
            </div>
            ${n.description ? `<div class="card-body"><p style="font-size:.85rem;color:var(--text-2)">${esc(n.description)}</p></div>` : ''}
          </div>
        `).join('') || '<div class="card"><div class="card-body" style="padding:20px;text-align:center;color:var(--text-3);font-size:.85rem">No saved notebooks yet</div></div>'}
      </div>
    </div>
  `);
};

Views._dashEditCmd = function(id) {
  const c = Views._dashCmdRegistry[id];
  if (c) Modals.command(c);
};