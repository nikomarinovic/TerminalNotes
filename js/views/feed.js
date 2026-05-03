/* ═══════════════════════════════════════════════
   views/feed.js
═══════════════════════════════════════════════ */

Views.feed = async function() {
  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// community</div>
        <h1 class="page-title">Live Feed</h1>
        <p class="page-sub">See what developers are building and sharing right now.</p>
      </div>
    </div>
    <div id="feed-list">
      <div class="loading-page"><div class="spinner"></div> Loading feed...</div>
    </div>
  `);

  const { data: events } = await DB.getFeed(40);
  const list = document.getElementById('feed-list');

  if (!events?.length) {
    list.innerHTML = UI.empty('📡', 'Feed is quiet', 'Be the first to publish something public. Mark a notebook, idea, or project as public!', '', '');
    return;
  }

  const typeIcon  = { new_notebook:'📓', new_idea:'💡', new_project:'🚀', new_command:'$_' };
  const typeLabel = { new_notebook:'created a notebook', new_idea:'shared an idea', new_project:'started a project', new_command:'added a command' };

  list.innerHTML = `
    <div class="card-list">
      ${events.map(e => {
        const profile = e.profiles || {};
        const initials = (profile.username || '?')[0].toUpperCase();
        const avatar = profile.avatar_url;
        const content = e.content || {};
        return `
          <div class="feed-item">
            <div class="feed-header">
              <div class="feed-avatar">
                ${avatar ? `<img src="${esc(avatar)}" alt="${esc(profile.username||'')}"/>` : initials}
              </div>
              <div>
                <div class="feed-user">${esc(profile.username || 'unknown')}</div>
              </div>
              <div class="feed-time">${reltime(e.created_at)}</div>
            </div>
            <div class="feed-action">
              <span style="color:var(--text-3)">${typeIcon[e.type]||'📄'}</span>
              ${typeLabel[e.type]||'shared something'}
              ${content.title ? `<strong style="color:var(--text)"> "${esc(content.title)}"</strong>` : ''}
            </div>
            <div class="feed-actions">
              <button class="feed-btn" onclick="Views._starFeedItem(this,'${e.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                star
              </button>
              <button class="feed-btn" onclick="Views._followUser(this,'${esc(e.user_id)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                follow
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

Views._starFeedItem = async function(btn, itemId) {
  const { error } = await DB.starItem(Auth.user.id, 'feed_event', itemId);
  if (!error) { btn.classList.add('starred'); btn.innerHTML = '★ starred'; }
};

Views._followUser = async function(btn, userId) {
  if (userId === Auth.user.id) { toast('Cannot follow yourself', 'info'); return; }
  const { error } = await DB.follow(Auth.user.id, userId);
  if (!error) { btn.textContent = '✓ following'; btn.style.color = 'var(--accent)'; }
  else toast('Already following', 'info');
};


/* ═══════════════════════════════════════════════
   views/explore.js
═══════════════════════════════════════════════ */

Views.explore = async function() {
  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// explore</div>
        <h1 class="page-title">Explore</h1>
        <p class="page-sub">Discover public notebooks, command libraries, and developers.</p>
      </div>
    </div>

    <div style="max-width:520px;margin-bottom:28px">
      <div style="position:relative">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:1rem;pointer-events:none">⌕</span>
        <input id="explore-search" class="form-input" style="padding-left:36px" placeholder="Search users, notebooks, projects..."
          oninput="Views._exploreSearch(this.value)"/>
      </div>
    </div>

    <div id="explore-results">
      ${UI.empty('🔍', 'Search to explore', 'Find developers, public notebooks, and command libraries.', '', '')}
    </div>
  `);
};

Views._exploreSearch = debounce(async function(query) {
  if (!query.trim()) return;
  const el = document.getElementById('explore-results');
  el.innerHTML = '<div class="loading-page"><div class="spinner"></div> Searching...</div>';

  const results = await DB.searchAll(query);
  const total = results.notebooks.length + results.commands.length + results.ideas.length + results.projects.length;

  if (!total) {
    el.innerHTML = UI.empty('🔍', 'No results', `Nothing found for "${esc(query)}"`, '', '');
    return;
  }

  el.innerHTML = `
    ${results.notebooks.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// notebooks</div>
        <div class="card-list">
          ${results.notebooks.map(n => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">📓 ${esc(n.title)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    ${results.projects.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// projects</div>
        <div class="card-list">
          ${results.projects.map(p => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">🚀 ${esc(p.title)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    ${results.ideas.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// ideas</div>
        <div class="card-list">
          ${results.ideas.map(i => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">💡 ${esc(i.title)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}, 350);


/* ═══════════════════════════════════════════════
   views/profile.js
═══════════════════════════════════════════════ */

Views.profile = async function(tab = 'profile') {
  const p = Auth.profile;
  if (!p) { toast('Profile not loaded', 'error'); return; }

  const [nb, ideas, projects] = await Promise.all([
    DB.getNotebooks(Auth.user.id),
    DB.getIdeas(Auth.user.id),
    DB.getProjects(Auth.user.id),
  ]);

  const initials = (p.username||'?')[0].toUpperCase();
  const avatar   = p.avatar_url;

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// profile</div>
        <h1 class="page-title">My Profile</h1>
      </div>
    </div>

    <div class="profile-hero">
      <div class="profile-avatar-lg">
        ${avatar ? `<img src="${esc(avatar)}" alt="${esc(p.username||'')}"/>` : initials}
      </div>
      <div class="profile-info">
        <div class="profile-name">${esc(p.full_name || p.username || 'Developer')}</div>
        <div class="profile-handle">@${esc(p.username || Auth.user.id.slice(0,8))}</div>
        <div class="profile-bio">${esc(p.bio || 'No bio yet.')}</div>
        <div class="profile-stats">
          <div class="pstat"><div class="pstat-num">${(nb.data||[]).length}</div><div class="pstat-label">notebooks</div></div>
          <div class="pstat"><div class="pstat-num">${(ideas.data||[]).length}</div><div class="pstat-label">ideas</div></div>
          <div class="pstat"><div class="pstat-num">${(projects.data||[]).length}</div><div class="pstat-label">projects</div></div>
          <div class="pstat"><div class="pstat-num">${(nb.data||[]).filter(n=>n.is_public).length}</div><div class="pstat-label">public</div></div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Views._editProfile()" style="flex-shrink:0">Edit Profile</button>
    </div>

    <div class="page-tabs">
      <button class="ptab ${tab==='profile'?'active':''}" onclick="Views._profileTab(this,'published')">📚 Published</button>
      <button class="ptab ${tab==='settings'?'active':''}" onclick="Views._profileTab(this,'settings')">⚙️ Settings</button>
    </div>

    <div id="profile-tab-content">
      ${tab === 'settings' ? Views._settingsTab(p) : Views._publishedTab(nb.data||[], ideas.data||[], projects.data||[])}
    </div>
  `);
};

Views._publishedTab = function(notebooks, ideas, projects) {
  const pubNb = notebooks.filter(n => n.is_public);
  const pubIdeas = ideas.filter(i => i.is_public);
  const pubProj  = projects.filter(p => p.is_public);

  if (!pubNb.length && !pubIdeas.length && !pubProj.length) {
    return UI.empty('🔒', 'Nothing public yet', 'Mark notebooks, ideas, or projects as public to share them with the community.', '', '');
  }

  return `
    ${pubNb.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// public notebooks</div>
        <div class="grid-2">
          ${pubNb.map(n => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">📓 ${esc(n.title)}</span>
                <span class="badge badge-green">public</span>
              </div>
              ${n.description ? `<div class="card-body"><p style="font-size:.85rem;color:var(--text-2)">${esc(n.description)}</p></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    ${pubProj.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// public projects</div>
        <div class="grid-2">
          ${pubProj.map(p => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">🚀 ${esc(p.title)}</span>
                <span class="badge badge-amber">${esc(p.status)}</span>
              </div>
              ${p.description ? `<div class="card-body"><p style="font-size:.85rem;color:var(--text-2)">${esc(p.description)}</p></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    ${pubIdeas.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row-title" style="margin-bottom:10px">// public ideas</div>
        <div class="grid-2">
          ${pubIdeas.map(i => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">💡 ${esc(i.title)}</span>
                <span class="idea-status status-${esc(i.status)}">${esc(i.status)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
};

Views._settingsTab = function(p) {
  return `
    <div class="card" style="margin-top:8px">
      <div class="card-header"><span class="card-title">Account Settings</span></div>
      <div class="card-body">
        <div style="display:flex;flex-direction:column;gap:14px;max-width:480px">
          <div class="form-group">
            <label class="form-label">$ email</label>
            <input class="form-input" value="${esc(Auth.user?.email||'')}" disabled style="opacity:.5"/>
          </div>
          <div class="form-group">
            <label class="form-label">$ username</label>
            <input id="set-username" class="form-input" value="${esc(p.username||'')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">$ full name</label>
            <input id="set-fullname" class="form-input" value="${esc(p.full_name||'')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">$ bio</label>
            <textarea id="set-bio" class="form-input" rows="3">${esc(p.bio||'')}</textarea>
          </div>
          <button class="btn btn-primary" onclick="Views._saveSettings()" style="width:fit-content">Save Settings</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="card-header"><span class="card-title" style="color:var(--red)">Danger Zone</span></div>
      <div class="card-body">
        <p style="font-size:.88rem;color:var(--text-2);margin-bottom:12px">Sign out of your account on this device.</p>
        <button class="btn btn-danger" onclick="Auth.logout()">Sign out</button>
      </div>
    </div>
  `;
};

Views._profileTab = function(btn, tab) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('profile-tab-content');
  if (tab === 'settings') el.innerHTML = Views._settingsTab(Auth.profile);
  else {
    DB.getNotebooks(Auth.user.id).then(nb =>
    DB.getIdeas(Auth.user.id).then(ideas =>
    DB.getProjects(Auth.user.id).then(proj =>
      el.innerHTML = Views._publishedTab(nb.data||[], ideas.data||[], proj.data||[])
    )));
  }
};

Views._editProfile = function() {
  const p = Auth.profile || {};
  Modals.open(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">// edit profile</span>
          <button class="modal-close-btn" onclick="Modals.close()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">$ username</label>
            <input id="ep-username" class="form-input" value="${esc(p.username||'')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">$ full name</label>
            <input id="ep-fullname" class="form-input" value="${esc(p.full_name||'')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">$ bio</label>
            <textarea id="ep-bio" class="form-input" rows="3">${esc(p.bio||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">$ avatar URL</label>
            <input id="ep-avatar" class="form-input" value="${esc(p.avatar_url||'')}" placeholder="https://..."/>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
          <button id="btn-ep-save" class="btn btn-primary">save</button>
        </div>
      </div>
    </div>
  `);
  document.getElementById('btn-ep-save').addEventListener('click', async () => {
    const payload = {
      id:         Auth.user.id,
      username:   document.getElementById('ep-username').value.trim(),
      full_name:  document.getElementById('ep-fullname').value.trim(),
      bio:        document.getElementById('ep-bio').value.trim(),
      avatar_url: document.getElementById('ep-avatar').value.trim(),
    };
    const { data, error } = await DB.upsertProfile(payload);
    if (error) { toast(error.message, 'error'); return; }
    Auth.profile = data;
    UI.updateUserDisplay();
    Modals.close();
    toast('Profile updated!');
    Views.profile();
  });
};

Views._saveSettings = async function() {
  const payload = {
    id:        Auth.user.id,
    username:  document.getElementById('set-username')?.value.trim(),
    full_name: document.getElementById('set-fullname')?.value.trim(),
    bio:       document.getElementById('set-bio')?.value.trim(),
  };
  const { data, error } = await DB.upsertProfile(payload);
  if (error) { toast(error.message, 'error'); return; }
  Auth.profile = data;
  UI.updateUserDisplay();
  toast('Settings saved!');
};
