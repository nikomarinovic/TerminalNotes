/* ═══════════════════════════════════════════════
   db.js — Supabase client + all data helpers
═══════════════════════════════════════════════ */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

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
      .select('*, profiles(username, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  /* ── Profiles ── */
  async getProfile(userId) {
    const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
    return { data, error };
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

  /* ── Search (uses Postgres ilike) ── */
  async searchAll(query) {
    const q = `%${query}%`;
    const [nb, cmd, idea, proj] = await Promise.all([
      db.from('notebooks').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('commands').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('ideas').select('id,title,user_id').ilike('title', q).limit(5),
      db.from('projects').select('id,title,user_id').ilike('title', q).limit(5),
    ]);
    return {
      notebooks: nb.data || [],
      commands:  cmd.data || [],
      ideas:     idea.data || [],
      projects:  proj.data || [],
    };
  },

  /* ── GitHub repos (via GitHub API, token from Supabase session) ── */
  async getGithubRepos(token) {
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  /* ── Log a public feed event ── */
  async logFeedEvent(userId, type, content, isPublic = false) {
    await db.from('feed_events').insert({
      user_id: userId, type, content, is_public: isPublic
    });
  },
};