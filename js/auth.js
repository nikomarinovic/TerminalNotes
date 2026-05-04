/* ═══════════════════════════════════════════════
   auth.js — authentication logic
═══════════════════════════════════════════════ */
const Auth = {
  user: null,
  profile: null,
  githubToken: null,
  githubAvatarUrl: '',

  async init() {
    const { data: { session } } = await db.auth.getSession();
    if (session) await Auth._onSession(session);

    db.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await Auth._onSession(session);
        UI.showApp();
      } else {
        Auth.user = null;
        Auth.profile = null;
        Auth.githubToken = null;
        UI.showLanding();
      }
    });
  },

  async _onSession(session) {
    Auth.user = session.user;
    Auth.githubToken = session.provider_token || null;
    const meta = Auth.user.user_metadata || {};
    Auth.githubAvatarUrl = meta.avatar_url || '';

    // Upsert profile
    const { data: profile } = await DB.getProfile(Auth.user.id);
    if (!profile) {
      await DB.upsertProfile({
        id: Auth.user.id,
        username: meta.user_name || meta.full_name || Auth.user.email?.split('@')[0] || 'user',
        full_name: meta.full_name || '',
        avatar_url: meta.avatar_url || '',
        bio: '',
      });
      Auth.profile = (await DB.getProfile(Auth.user.id)).data;
    } else {
      Auth.profile = profile;
      const provider = Auth.user.app_metadata?.provider;
      if (provider === 'github' && Auth.githubAvatarUrl && !Auth.profile.avatar_url) {
        const { data: synced } = await DB.upsertProfile({
          id: Auth.user.id,
          username: Auth.profile.username,
          full_name: Auth.profile.full_name,
          bio: Auth.profile.bio,
          avatar_url: Auth.githubAvatarUrl,
        });
        if (synced) Auth.profile = synced;
      }
    }
    UI.updateUserDisplay();
  },

  async loginEmail(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    return error;
  },

  async signupEmail(email, password) {
    const { error } = await db.auth.signUp({ email, password });
    return error;
  },

  async loginGithub() {
    await db.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin, scopes: 'repo' }
    });
  },

  async logout() {
    await db.auth.signOut();
  }
};