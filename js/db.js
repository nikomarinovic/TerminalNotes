/* ═══════════════════════════════════════════════
   db.js — Supabase client + all data helpers
═══════════════════════════════════════════════ */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

const GITHUB_CACHE_TTL_MS = 10 * 60 * 1000;

function makeGithubCacheKey(token) {
  const suffix = String(token || '').slice(-8) || 'anon';
  return `tn:gh:repos:${suffix}`;
}

function extFromFilename(name = '') {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : 'bin';
}

/* ─── Notebooks ─── */
const DB = {

  /* ── Notebooks ── */
  async getNotebooks(userId) {
    const { data, error } = await db.from('notebooks').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    return { data, error };
  },
  async createNotebook(payload) {
    const { data, error } = await db.from('notebooks').insert(payload).select().single();
    return { data, error };
  },
  async updateNotebook(id, payload) {
    const { data, error } = await db.from('notebooks').update(payload).eq('id', id).select().single();
    return { data, error };
  },
  async deleteNotebook(id) {
    return await db.from('notebooks').delete().eq('id', id);
  },

  /* ── Entries (notes, commands, etc inside notebooks) ── */
  async getEntries(notebookId) {
    const { data, error } = await db.from('entries').select('*')
      .eq('notebook_id', notebookId).order('created_at', { ascending: false });
    return { data, error };
  },
  async getPublicEntries(notebookId) {
    const { data: notebook, error: notebookError } = await db.from('notebooks')
      .select('id,user_id,is_public')
      .eq('id', notebookId)
      .single();
    if (notebookError || !notebook) return { data: null, error: notebookError || { message: 'Notebook not found' } };
    if (!notebook.is_public && notebook.user_id !== Auth.user?.id) {
      return { data: null, error: { message: 'This notebook is private' } };
    }
    const { data, error } = await db.from('entries').select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
  async createEntry(payload) {
    const { data, error } = await db.from('entries').insert(payload).select().single();
    return { data, error };
  },
  async updateEntry(id, payload) {
    const { data, error } = await db.from('entries').update(payload).eq('id', id).select().single();
    return { data, error };
  },
  async deleteEntry(id) {
    return await db.from('entries').delete().eq('id', id);
  },

  /* ── Commands ── */
  async getCommands(userId) {
    const { data, error } = await db.from('commands').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    return { data, error };
  },
  async createCommand(payload) {
    const { data, error } = await db.from('commands').insert(payload).select().single();
    return { data, error };
  },
  async updateCommand(id, payload) {
    const { data, error } = await db.from('commands').update(payload).eq('id', id).select().single();
    return { data, error };
  },
  async deleteCommand(id) {
    return await db.from('commands').delete().eq('id', id);
  },
  async getCommandById(id) {
    const { data, error } = await db.from('commands').select('*').eq('id', id).single();
    return { data, error };
  },

  /* ── Ideas ── */
  async getIdeas(userId) {
    const { data, error } = await db.from('ideas').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    return { data, error };
  },
  async createIdea(payload) {
    const { data, error } = await db.from('ideas').insert(payload).select().single();
    return { data, error };
  },
  async updateIdea(id, payload) {
    const { data, error } = await db.from('ideas').update(payload).eq('id', id).select().single();
    return { data, error };
  },
  async deleteIdea(id) {
    return await db.from('ideas').delete().eq('id', id);
  },
  async getIdeaById(id) {
    const { data, error } = await db.from('ideas').select('*').eq('id', id).single();
    return { data, error };
  },

  /* ── Projects ── */
  async getProjects(userId) {
    const { data, error } = await db.from('projects').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    return { data, error };
  },
  async createProject(payload) {
    const { data, error } = await db.from('projects').insert(payload).select().single();
    return { data, error };
  },
  async updateProject(id, payload) {
    const { data, error } = await db.from('projects').update(payload).eq('id', id).select().single();
    return { data, error };
  },
  async deleteProject(id) {
    return await db.from('projects').delete().eq('id', id);
  },
  async getProjectById(id) {
    const { data, error } = await db.from('projects').select('*').eq('id', id).single();
    return { data, error };
  },

  /* ── Timeline milestones ── */
  async getMilestones(projectId) {
    const { data, error } = await db.from('milestones').select('*')
      .eq('project_id', projectId).order('date', { ascending: true });
    return { data, error };
  },
  async createMilestone(payload) {
    const { data, error } = await db.from('milestones').insert(payload).select().single();
    return { data, error };
  },
  async deleteMilestone(id) {
    return await db.from('milestones').delete().eq('id', id);
  },

  /* ── Feed (public activity) ── */
  async getFeed(limit = 40) {
    const { data, error } = await db.from('feed_events')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return { data, error };
    // Attach profiles separately
    const userIds = [...new Set(data.map(e => e.user_id))];
    if (userIds.length) {
      const { data: profiles } = await db.from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      data.forEach(e => { e.profiles = profileMap[e.user_id] || {}; });
    }
    return { data, error };
  },

  async getPublicCollections(limit = 12) {
    const [notebooks, commands, ideas, projects] = await Promise.all([
      db.from('notebooks').select('id,title,description,user_id,created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
      db.from('commands').select('id,title,description,command,user_id,created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
      db.from('ideas').select('id,title,description,status,user_id,created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
      db.from('projects').select('id,title,description,status,github_repo,user_id,created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
    ]);
    return {
      notebooks: notebooks.data || [],
      commands: commands.data || [],
      ideas: ideas.data || [],
      projects: projects.data || [],
    };
  },

  async getUserFollows(userId) {
    const { data, error } = await db.from('follows').select('following_id').eq('follower_id', userId);
    return { data, error };
  },

  async getPosts({ limit = 20, offset = 0, mode = 'global', userId }) {
    let query = db.from('posts')
      .select('id,user_id,content,image_url,created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mode === 'following' && userId) {
      const { data: follows, error: followErr } = await this.getUserFollows(userId);
      if (followErr) return { data: null, error: followErr };
      const ids = (follows || []).map(f => f.following_id);
      if (!ids.length) return { data: [], error: null };
      query = query.in('user_id', ids);
    }

    const { data, error } = await query;
    if (error || !data) return { data, error };
    const userIds = [...new Set(data.map(p => p.user_id))];
    const profileMap = {};
    if (userIds.length) {
      const { data: profiles } = await db.from('profiles').select('id,username,avatar_url').in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    data.forEach(post => { post.profile = profileMap[post.user_id] || null; });
    return { data, error };
  },
  async getPostsByUser(userId, { limit = 20, offset = 0 } = {}) {
    const { data, error } = await db.from('posts')
      .select('id,user_id,content,image_url,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error || !data) return { data, error };
    const { data: profile } = await db.from('profiles').select('id,username,avatar_url').eq('id', userId).single();
    data.forEach(post => { post.profile = profile || null; });
    return { data, error };
  },

  async createPost(payload) {
    const { data, error } = await db.from('posts').insert(payload).select().single();
    return { data, error };
  },
  async updatePost(postId, payload) {
    const { data, error } = await db.from('posts')
      .update(payload)
      .eq('id', postId)
      .select()
      .single();
    return { data, error };
  },
  async deletePost(postId) {
    return await db.from('posts').delete().eq('id', postId);
  },

  async getPostLikes(postIds = [], userId) {
    if (!postIds.length) return { counts: {}, likedSet: {} };
    const { data, error } = await db.from('post_likes').select('post_id,user_id').in('post_id', postIds);
    if (error) return { counts: {}, likedSet: {} };
    const counts = {};
    const likedSet = {};
    (data || []).forEach(row => {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
      if (row.user_id === userId) likedSet[row.post_id] = true;
    });
    return { counts, likedSet };
  },

  async likePost(userId, postId) {
    const { data, error } = await db.from('post_likes').insert({ user_id: userId, post_id: postId }).select().single();
    return { data, error };
  },

  async unlikePost(userId, postId) {
    return await db.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
  },

  async getPostComments(postId, limit = 20) {
    const { data, error } = await db.from('post_comments')
      .select('id,post_id,user_id,content,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error || !data) return { data, error };
    const userIds = [...new Set(data.map(c => c.user_id))];
    const profileMap = {};
    if (userIds.length) {
      const { data: profiles } = await db.from('profiles').select('id,username,avatar_url').in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    data.forEach(c => { c.profile = profileMap[c.user_id] || null; });
    return { data, error };
  },

  async addPostComment(payload) {
    const { data, error } = await db.from('post_comments').insert(payload).select().single();
    return { data, error };
  },

  async getPostCommentsPreview(postIds = [], previewSize = 3) {
    if (!postIds.length) return { previewMap: {}, countsMap: {} };
    const { data, error } = await db.from('post_comments')
      .select('id,post_id,user_id,content,created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });
    if (error || !data) return { previewMap: {}, countsMap: {} };
    const userIds = [...new Set(data.map(c => c.user_id))];
    const profileMap = {};
    if (userIds.length) {
      const { data: profiles } = await db.from('profiles').select('id,username,avatar_url').in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    const groups = {};
    data.forEach(c => {
      c.profile = profileMap[c.user_id] || null;
      groups[c.post_id] = groups[c.post_id] || [];
      groups[c.post_id].push(c);
    });
    const previewMap = {};
    const countsMap = {};
    Object.keys(groups).forEach(postId => {
      countsMap[postId] = groups[postId].length;
      previewMap[postId] = groups[postId].slice(0, previewSize);
    });
    return { previewMap, countsMap };
  },

  async uploadPostImage(userId, file) {
    const ext = extFromFilename(file?.name || '');
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await db.storage.from('post-images').upload(path, file, { upsert: false });
    if (error) return { data: null, error };
    const { data } = db.storage.from('post-images').getPublicUrl(path);
    return { data, error: null };
  },
  async uploadAvatarImage(userId, file) {
    const ext = extFromFilename(file?.name || '');
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await db.storage.from('avatars').upload(path, file, { upsert: false });
    if (error) return { data: null, error };
    const { data } = db.storage.from('avatars').getPublicUrl(path);
    return { data, error: null };
  },

  /* ── Profiles ── */
  async getProfile(userId) {
    const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
    return { data, error };
  },
  async getProfilesByIds(ids = []) {
    if (!ids.length) return { data: [], error: null };
    const { data, error } = await db.from('profiles').select('*').in('id', ids);
    return { data, error };
  },
  async getUsersByQuery(query, limit = 20) {
    const q = query.trim();
    if (!q) return { data: [], error: null };
    const like = `%${q}%`;
    const { data, error } = await db.from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .or(`username.ilike.${like},full_name.ilike.${like}`)
      .order('username', { ascending: true })
      .limit(limit);
    return { data: data || [], error };
  },
  async upsertProfile(payload) {
    const { data, error } = await db.from('profiles').upsert(payload).select().single();
    return { data, error };
  },

  /* ── Stars ── */
  async starItem(userId, itemType, itemId) {
    const { data, error } = await db.from('stars')
      .insert({ user_id: userId, item_type: itemType, item_id: itemId }).select().single();
    return { data, error };
  },
  async unstarItem(userId, itemType, itemId) {
    return await db.from('stars')
      .delete().eq('user_id', userId).eq('item_type', itemType).eq('item_id', itemId);
  },
  async getStars(userId) {
    const { data, error } = await db.from('stars').select('*').eq('user_id', userId);
    return { data, error };
  },
  async getNotebookSaves(userId) {
    const { data, error } = await db.from('notebook_saves')
      .select('notebook_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      const starsFallback = await this.getStars(userId);
      const rows = (starsFallback.data || []).filter(s => s.item_type === 'notebook');
      return { data: rows.map(r => ({ notebook_id: r.item_id, created_at: r.created_at })), error: null };
    }
    return { data, error };
  },
  async saveNotebook(userId, notebookId) {
    const { data, error } = await db.from('notebook_saves')
      .insert({ user_id: userId, notebook_id: notebookId })
      .select()
      .single();
    if (error) {
      await this.starItem(userId, 'notebook', notebookId);
      return { data: { user_id: userId, notebook_id: notebookId }, error: null };
    }
    return { data, error };
  },
  async unsaveNotebook(userId, notebookId) {
    const { error } = await db.from('notebook_saves')
      .delete()
      .eq('user_id', userId)
      .eq('notebook_id', notebookId);
    if (error) {
      return await this.unstarItem(userId, 'notebook', notebookId);
    }
    return { error: null };
  },
  async isNotebookSaved(userId, notebookId) {
    const { data, error } = await db.from('notebook_saves')
      .select('notebook_id')
      .eq('user_id', userId)
      .eq('notebook_id', notebookId)
      .maybeSingle();
    if (error) {
      const stars = await this.getStars(userId);
      const found = (stars.data || []).some(s => s.item_type === 'notebook' && s.item_id === notebookId);
      return { data: found, error: null };
    }
    return { data: !!data, error: null };
  },

  /* ── Follows ── */
  async follow(followerId, followingId) {
    const { data, error } = await db.from('follows')
      .insert({ follower_id: followerId, following_id: followingId }).select().single();
    return { data, error };
  },
  async unfollow(followerId, followingId) {
    return await db.from('follows')
      .delete().eq('follower_id', followerId).eq('following_id', followingId);
  },
  async createFollowRequest(requesterId, targetId) {
    const { data, error } = await db.from('follow_requests')
      .insert({ requester_id: requesterId, target_id: targetId, status: 'pending' })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  },
  async getIncomingFollowRequests(userId) {
    const { data, error } = await db.from('follow_requests')
      .select('id, requester_id, status, created_at')
      .eq('target_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error || !data) return { data: [], error };
    const ids = data.map(row => row.requester_id);
    const { data: profiles } = await this.getProfilesByIds(ids);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
    return { data: data.map(row => ({ ...row, profile: profileMap[row.requester_id] || null })), error: null };
  },
  async respondFollowRequest(requestId, action) {
    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { data: req, error: getErr } = await db.from('follow_requests')
      .select('id,requester_id,target_id,status')
      .eq('id', requestId)
      .single();
    if (getErr || !req) return { error: getErr || { message: 'Request not found' } };
    const { error } = await db.from('follow_requests')
      .update({ status: nextStatus })
      .eq('id', requestId);
    if (error) return { error };
    if (nextStatus === 'accepted') {
      await this.follow(req.requester_id, req.target_id);
    }
    return { error: null };
  },
  async getFollowers(userId) {
    const { data, error } = await db.from('follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return { data, error };
    const ids = data.map(row => row.follower_id);
    const { data: profiles } = await this.getProfilesByIds(ids);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
    return { data: data.map(row => ({ ...row, profile: profileMap[row.follower_id] || null })), error: null };
  },
  async getFollowing(userId) {
    const { data, error } = await db.from('follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return { data, error };
    const ids = data.map(row => row.following_id);
    const { data: profiles } = await this.getProfilesByIds(ids);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
    return { data: data.map(row => ({ ...row, profile: profileMap[row.following_id] || null })), error: null };
  },
  async isFollowing(followerId, followingId) {
    const { data, error } = await db.from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return { data: !!data, error };
  },
  async getFollowCounts(userId) {
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      db.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      db.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);
    return { followers: followersCount || 0, following: followingCount || 0 };
  },
  async getFriends(userId) {
    const [{ data: followers }, { data: following }] = await Promise.all([
      db.from('follows').select('follower_id').eq('following_id', userId),
      db.from('follows').select('following_id').eq('follower_id', userId)
    ]);
    const followerSet = new Set((followers || []).map(r => r.follower_id));
    const friendIds = (following || []).map(r => r.following_id).filter(id => followerSet.has(id));
    const { data: profiles } = await this.getProfilesByIds(friendIds);
    return { data: profiles || [], error: null };
  },

  /* ── Search (uses Postgres ilike) ── */
  async searchAll(query) {
    const q = `%${query}%`;
    const [nb, cmd, idea, proj, users] = await Promise.all([
      db.from('notebooks').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('commands').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('ideas').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('projects').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('profiles').select('id,username,full_name,avatar_url').or(`username.ilike.${q},full_name.ilike.${q}`).limit(8),
    ]);
    return {
      notebooks: nb.data || [],
      commands:  cmd.data || [],
      ideas:     idea.data || [],
      projects:  proj.data || [],
      users:     users.data || [],
    };
  },

  /* ── GitHub repos (via GitHub API, token from Supabase session) ── */
  async getGithubRepos(token) {
    if (!token) {
      return { data: [], error: 'Missing GitHub token', source: 'none' };
    }
    const cacheKey = makeGithubCacheKey(token);
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Array.isArray(cached.data) && Date.now() - cached.ts < GITHUB_CACHE_TTL_MS) {
        return { data: cached.data, error: null, source: 'cache' };
      }
    } catch (_) {}

    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (!res.ok) {
        return { data: [], error: `GitHub request failed (${res.status})`, source: 'network' };
      }
      const data = await res.json();
      const repos = Array.isArray(data) ? data : [];
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: repos }));
      } catch (_) {}
      return { data: repos, error: null, source: 'network' };
    } catch {
      return { data: [], error: 'Network error while loading GitHub repos', source: 'network' };
    }
  },

  /* ── Log a public feed event ── */
  async logFeedEvent(userId, type, content, isPublic = false) {
    await db.from('feed_events').insert({
      user_id: userId, type, content, is_public: isPublic
    });
  },
};