/* ═══════════════════════════════════════════════
   views/feed.js
═══════════════════════════════════════════════ */

Views._feedState = {
  mode: 'global',
  page: 0,
  pageSize: 5,
  posts: [],
  events: [],
  followSet: {},
  likeCounts: {},
  likedSet: {},
  commentsPreview: {},
  commentsCount: {},
  uploadUrl: '',
};

Views.feed = async function() {
  Views._feedState.page = 0;
  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// community</div>
        <h1 class="page-title">Feed</h1>
        <p class="page-sub">Social notebook feed for posts, tips, and dev updates.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-body" style="padding:16px 18px">
        <div class="form-group">
          <label class="form-label">$ new post</label>
          <div class="feed-editor-tools">
            <button class="btn btn-ghost btn-sm" onclick="Views._feedApplyFormat('bold')"><strong>B</strong></button>
            <button class="btn btn-ghost btn-sm" onclick="Views._feedApplyFormat('link')">Link</button>
          </div>
          <textarea id="feed-post-content" class="form-input" rows="3" maxlength="500" placeholder="Share something useful for developers..."></textarea>
        </div>
        <div class="form-group" style="margin-top:8px">
          <label class="form-label">$ image</label>
          <div id="feed-dropzone" class="feed-dropzone" onclick="document.getElementById('feed-image-file').click()">
            ${Icons.svg('upload','ui-icon')}
            <span>Drag & drop image or click to upload</span>
          </div>
          <input id="feed-image-file" type="file" accept="image/*" style="display:none" onchange="Views._handlePostImageSelect(this.files)"/>
          <div id="feed-upload-meta" class="feed-upload-meta"></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button class="btn btn-primary" onclick="Views._createPost()">Publish</button>
        </div>
      </div>
    </div>

    <div class="page-tabs">
      <button class="ptab active" data-feed-mode="global" onclick="Views._setFeedMode(this,'global')">Global Feed</button>
      <button class="ptab" data-feed-mode="following" onclick="Views._setFeedMode(this,'following')">Following</button>
    </div>

    <div id="feed-list">${UI.loading()}</div>
  `);
  const dz = document.getElementById('feed-dropzone');
  if (dz) {
    ['dragenter', 'dragover'].forEach(evt => dz.addEventListener(evt, e => {
      e.preventDefault();
      dz.classList.add('active');
    }));
    ['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, e => {
      e.preventDefault();
      dz.classList.remove('active');
    }));
    dz.addEventListener('drop', e => {
      const files = e.dataTransfer?.files;
      if (files && files.length) Views._handlePostImageSelect(files);
    });
  }
  await Views._loadFeed();
};

Views._setFeedMode = async function(btn, mode) {
  document.querySelectorAll('[data-feed-mode]').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  Views._feedState.mode = mode;
  Views._feedState.page = 0;
  await Views._loadFeed();
};

Views._loadFeed = async function() {
  const list = document.getElementById('feed-list');
  if (!list) return;
  list.innerHTML = UI.loading();
  const st = Views._feedState;
  const offset = st.page * st.pageSize;

  const [{ data: posts, error: postErr }, { data: follows }, { data: events }] = await Promise.all([
    DB.getPosts({ limit: st.pageSize, offset, mode: st.mode, userId: Auth.user.id }),
    DB.getUserFollows(Auth.user.id),
    DB.getFeed(10),
  ]);
  if (postErr) {
    list.innerHTML = UI.empty(Icons.svg('comment','ui-icon'), 'Feed failed to load', postErr.message || 'Try again.', '', '');
    return;
  }

  st.posts = posts || [];
  st.events = events || [];
  st.followSet = {};
  (follows || []).forEach(f => { st.followSet[f.following_id] = true; });

  const ids = st.posts.map(p => p.id);
  const { counts, likedSet } = await DB.getPostLikes(ids, Auth.user.id);
  const { previewMap, countsMap } = await DB.getPostCommentsPreview(ids, 3);
  st.likeCounts = counts;
  st.likedSet = likedSet;
  st.commentsPreview = previewMap;
  st.commentsCount = countsMap;
  list.innerHTML = Views._renderFeedPosts();
};

Views._renderFeedPosts = function() {
  const st = Views._feedState;
  if (!st.posts.length) {
    return UI.empty(Icons.svg('comment','ui-icon'), 'No posts yet', st.mode === 'following'
      ? 'Follow other users to build your personalized feed.'
      : 'Be the first to publish a post.', '', '');
  }

  return `
    <div class="card-list">
      ${st.posts.map(post => {
        const profile = post.profile || {};
        const username = profile.username || 'unknown';
        const initials = username[0].toUpperCase();
        const followLabel = st.followSet[post.user_id] ? 'following' : 'follow';
        return `
          <div class="feed-item">
            <div class="feed-header">
              <div class="feed-avatar">${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="${esc(username)}"/>` : initials}</div>
              <div class="feed-user">@${esc(username)}</div>
              <div class="feed-time">${reltime(post.created_at)}</div>
            </div>
            <div class="feed-action">${renderRichText(post.content || '')}</div>
            ${post.image_url ? `<img src="${esc(post.image_url)}" class="feed-image" alt="post image"/>` : ''}
            <div class="feed-actions">
              <button class="feed-btn feed-like-btn ${st.likedSet[post.id] ? 'starred' : ''}" onclick="Views._toggleLike('${post.id}')">${Icons.svg('heart','ui-icon')} <span>${st.likeCounts[post.id] || 0}</span></button>
              ${post.user_id !== Auth.user.id ? `<button class="feed-btn" onclick="Views._toggleFollow('${post.user_id}')">${followLabel}</button>` : ''}
              <button class="feed-btn" onclick="Views._openComments('${post.id}')">${Icons.svg('comment','ui-icon')} comment</button>
            </div>
            <div class="feed-comments-preview">
              ${(st.commentsPreview[post.id] || []).map(c => `
                <div class="feed-comment-line"><strong>@${esc(c.profile?.username || 'unknown')}</strong> ${esc(c.content || '')}</div>
              `).join('')}
              ${(st.commentsCount[post.id] || 0) > 3 ? `<button class="feed-btn" onclick="Views._openComments('${post.id}')">See more comments (${(st.commentsCount[post.id] || 0) - 3})</button>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${st.events.length ? `
      <div style="margin-top:18px">
        <div class="section-row"><div class="section-row-title">Public notebook activity</div></div>
        <div class="card-list">
          ${st.events.slice(0, 6).map(e => `
            <div class="card">
              <div class="card-header">
                <span class="card-title">${esc((e.profiles?.username || 'unknown'))}</span>
                <span class="badge badge-gray">${esc(e.type || 'activity')}</span>
              </div>
              <div class="card-body">
                <p style="color:var(--text-2)">${esc(e.content?.title || 'Shared update')}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="nb-pagination">
      <button class="nb-page-btn" onclick="Views._feedPage(-1)" ${st.page === 0 ? 'disabled' : ''}>← prethodna stranica</button>
      <span class="nb-page-info">Stranica ${st.page + 1}</span>
      <button class="nb-page-btn" onclick="Views._feedPage(1)" ${st.posts.length < st.pageSize ? 'disabled' : ''}>sljedeća stranica →</button>
    </div>
  `;
};

Views._feedApplyFormat = function(type) {
  const el = document.getElementById('feed-post-content');
  if (!el) return;
  const start = el.selectionStart || 0;
  const end = el.selectionEnd || 0;
  const selected = el.value.slice(start, end);
  if (type === 'bold') {
    const insert = `**${selected || 'bold text'}**`;
    el.setRangeText(insert, start, end, 'end');
  } else if (type === 'link') {
    const label = selected || 'link text';
    const insert = `[${label}](https://example.com)`;
    el.setRangeText(insert, start, end, 'end');
  }
  el.focus();
};

Views._handlePostImageSelect = async function(files) {
  const file = files && files[0];
  if (!file) return;
  const meta = document.getElementById('feed-upload-meta');
  if (meta) meta.textContent = 'Uploading image...';
  const { data, error } = await DB.uploadPostImage(Auth.user.id, file);
  if (error) {
    if (meta) meta.textContent = '';
    toast(error.message || 'Image upload failed', 'error');
    return;
  }
  Views._feedState.uploadUrl = data.publicUrl;
  if (meta) meta.textContent = `Uploaded: ${file.name}`;
  toast('Image uploaded');
};

Views._feedPage = async function(dir) {
  Views._feedState.page = Math.max(0, Views._feedState.page + dir);
  await Views._loadFeed();
};

Views._createPost = async function() {
  const content = document.getElementById('feed-post-content')?.value.trim();
  const imageUrl = Views._feedState.uploadUrl || '';
  if (!content) {
    toast('Post content is required', 'error');
    return;
  }
  const payload = { user_id: Auth.user.id, content, image_url: imageUrl || null };
  const { error } = await DB.createPost(payload);
  if (error) {
    if (String(error.message || '').includes('relation "posts" does not exist')) {
      toast('Posts table missing. Run supabase_social_repair.sql', 'error');
    } else {
      toast(error.message, 'error');
    }
    return;
  }
  const st = Views._feedState;
  const profile = Auth.profile || {};
  st.posts.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}`,
    user_id: Auth.user.id,
    content,
    image_url: imageUrl || null,
    created_at: new Date().toISOString(),
    profile: { username: profile.username, avatar_url: profile.avatar_url },
  });
  st.posts = st.posts.slice(0, st.pageSize);
  document.getElementById('feed-post-content').value = '';
  Views._feedState.uploadUrl = '';
  const meta = document.getElementById('feed-upload-meta');
  if (meta) meta.textContent = '';
  toast('Post published');
  const list = document.getElementById('feed-list');
  if (list) list.innerHTML = Views._renderFeedPosts();
  Views._feedState.page = 0;
  setTimeout(() => Views._loadFeed(), 100);
};

Views._toggleFollow = async function(userId) {
  const st = Views._feedState;
  const wasFollowing = !!st.followSet[userId];
  if (wasFollowing) delete st.followSet[userId];
  else st.followSet[userId] = true;
  const list = document.getElementById('feed-list');
  if (list) list.innerHTML = Views._renderFeedPosts();
  if (wasFollowing) {
    const { error } = await DB.unfollow(Auth.user.id, userId);
    if (error) {
      st.followSet[userId] = true;
      if (list) list.innerHTML = Views._renderFeedPosts();
      return toast(error.message, 'error');
    }
  } else {
    const { error } = await DB.follow(Auth.user.id, userId);
    if (error) {
      delete st.followSet[userId];
      if (list) list.innerHTML = Views._renderFeedPosts();
      return toast('Unable to follow user', 'error');
    }
  }
};

Views._toggleLike = async function(postId) {
  const st = Views._feedState;
  const wasLiked = !!st.likedSet[postId];
  if (wasLiked) {
    st.likedSet[postId] = false;
    st.likeCounts[postId] = Math.max(0, (st.likeCounts[postId] || 1) - 1);
  } else {
    st.likedSet[postId] = true;
    st.likeCounts[postId] = (st.likeCounts[postId] || 0) + 1;
  }
  const list = document.getElementById('feed-list');
  if (list) list.innerHTML = Views._renderFeedPosts();
  if (wasLiked) {
    const { error } = await DB.unlikePost(Auth.user.id, postId);
    if (error) {
      st.likedSet[postId] = true;
      st.likeCounts[postId] = (st.likeCounts[postId] || 0) + 1;
      if (list) list.innerHTML = Views._renderFeedPosts();
      return toast(error.message, 'error');
    }
  } else {
    const { error } = await DB.likePost(Auth.user.id, postId);
    if (error) {
      st.likedSet[postId] = false;
      st.likeCounts[postId] = Math.max(0, (st.likeCounts[postId] || 1) - 1);
      if (list) list.innerHTML = Views._renderFeedPosts();
      return toast('Already liked', 'info');
    }
  }
};

Views._openComments = async function(postId) {
  const { data: comments, error } = await DB.getPostComments(postId);
  if (error) {
    toast(error.message, 'error');
    return;
  }
  Modals.open(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">// comments</span>
          <button class="modal-close-btn" onclick="Modals.close()">✕</button>
        </div>
        <div class="modal-body">
          <div id="feed-comments-list">
            ${(comments || []).slice(0, 50).map(c => `
              <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-3)">@${esc(c.profile?.username || 'unknown')} · ${reltime(c.created_at)}</div>
                <div style="font-size:.9rem;color:var(--text-2);margin-top:4px;white-space:pre-wrap">${esc(c.content || '')}</div>
              </div>
            `).join('') || '<div style="color:var(--text-3)">No comments yet.</div>'}
          </div>
          <div class="form-group" style="margin-top:10px">
            <label class="form-label">$ add comment</label>
            <textarea id="feed-comment-input" class="form-input" rows="3" placeholder="Write a comment..."></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="Modals.close()">close</button>
          <button class="btn btn-primary" onclick="Views._submitComment('${postId}')">send</button>
        </div>
      </div>
    </div>
  `);
};

Views._submitComment = async function(postId) {
  const content = document.getElementById('feed-comment-input')?.value.trim();
  if (!content) {
    toast('Comment cannot be empty', 'error');
    return;
  }
  const { error } = await DB.addPostComment({ post_id: postId, user_id: Auth.user.id, content });
  if (error) {
    toast(error.message, 'error');
    return;
  }
  toast('Comment posted');
  Modals.close();
  await Views._loadFeed();
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

    <div id="explore-results">${UI.loading()}</div>
  `);
  await Views._loadExplorePublic();
};

Views._loadExplorePublic = async function() {
  const el = document.getElementById('explore-results');
  if (!el) return;
  const collections = await DB.getPublicCollections(8);
  const total = collections.notebooks.length + collections.commands.length + collections.ideas.length + collections.projects.length;
  if (!total) {
    el.innerHTML = UI.empty(Icons.svg('globe','ui-icon'), 'No public content yet', 'Switch an item to public and it will appear here.', '', '');
    return;
  }
  el.innerHTML = Views._renderExploreCollections(collections);
};

Views._renderExploreCollections = function(results) {
  return `
    ${results.notebooks.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row"><div class="section-row-title">Notebooks</div></div>
        <div class="card-list">
          ${results.notebooks.map(n => `<div class="card" style="cursor:pointer" onclick="Views._openPublicItem('notebook','${n.id}')"><div class="card-header"><span class="card-title">${Icons.svg('notebook','ui-icon')} ${esc(n.title)}</span></div>${n.description ? `<div class="card-body"><p style="font-size:.86rem;color:var(--text-2)">${esc(n.description)}</p></div>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
    ${results.commands.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row"><div class="section-row-title">Commands</div></div>
        <div class="card-list">
          ${results.commands.map(c => `<div class="card" style="cursor:pointer" onclick="Views._openPublicItem('command','${c.id}')"><div class="card-header"><span class="card-title">${Icons.svg('command','ui-icon')} ${esc(c.title)}</span></div>${c.description ? `<div class="card-body"><p style="font-size:.86rem;color:var(--text-2)">${esc(c.description)}</p></div>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
    ${results.ideas.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row"><div class="section-row-title">Ideas</div></div>
        <div class="card-list">
          ${results.ideas.map(i => `<div class="card" style="cursor:pointer" onclick="Views._openPublicItem('idea','${i.id}')"><div class="card-header"><span class="card-title">${Icons.svg('idea','ui-icon')} ${esc(i.title)}</span></div>${i.description ? `<div class="card-body"><p style="font-size:.86rem;color:var(--text-2)">${esc(i.description)}</p></div>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
    ${results.projects.length ? `
      <div style="margin-bottom:24px">
        <div class="section-row"><div class="section-row-title">Projects</div></div>
        <div class="card-list">
          ${results.projects.map(p => `<div class="card" style="cursor:pointer" onclick="Views._openPublicItem('project','${p.id}')"><div class="card-header"><span class="card-title">${Icons.svg('project','ui-icon')} ${esc(p.title)}</span></div>${p.description ? `<div class="card-body"><p style="font-size:.86rem;color:var(--text-2)">${esc(p.description)}</p></div>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
  `;
};

Views._exploreSearch = debounce(async function(query) {
  if (!query.trim()) {
    await Views._loadExplorePublic();
    return;
  }
  const el = document.getElementById('explore-results');
  el.innerHTML = '<div class="loading-page"><div class="spinner"></div> Searching...</div>';

  const results = await DB.searchAll(query);
  const total = results.notebooks.length + results.commands.length + results.ideas.length + results.projects.length;

  if (!total) {
    el.innerHTML = UI.empty(Icons.svg('search','ui-icon'), 'No results', `Nothing found for "${esc(query)}"`, '', '');
    return;
  }

  el.innerHTML = Views._renderExploreCollections(results);
}, 350);

Views._openPublicItem = async function(type, id) {
  if (type === 'notebook') return Views._openNotebook(id);
  if (type === 'project') return Views._openProject(id);
  if (type === 'command') {
    const { data, error } = await DB.getCommandById(id);
    if (error || !data) return toast('Cannot open command', 'error');
    return Modals.open(`
      <div class="modal-overlay"><div class="modal"><div class="modal-head"><span class="modal-title">// command</span><button class="modal-close-btn" onclick="Modals.close()">✕</button></div>
      <div class="modal-body"><h3 style="font-size:1rem">${esc(data.title)}</h3><div class="cmd-block"><div class="cmd-code"><span class="cmd-prompt">$</span>${esc(data.command)}</div></div>${data.description ? `<p style="margin-top:10px;color:var(--text-2)">${esc(data.description)}</p>` : ''}</div></div></div>
    `);
  }
  if (type === 'idea') {
    const { data, error } = await DB.getIdeaById(id);
    if (error || !data) return toast('Cannot open idea', 'error');
    return Modals.open(`
      <div class="modal-overlay"><div class="modal"><div class="modal-head"><span class="modal-title">// idea</span><button class="modal-close-btn" onclick="Modals.close()">✕</button></div>
      <div class="modal-body"><h3 style="font-size:1rem">${esc(data.title)}</h3><p style="color:var(--text-2);line-height:1.6">${esc(data.description || '')}</p></div></div></div>
    `);
  }
};


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