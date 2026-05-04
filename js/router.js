/* ═══════════════════════════════════════════════
   router.js — client-side router
═══════════════════════════════════════════════ */
const Router = {
  current: 'dashboard',
  params: {},

  views: {
    dashboard: () => Views.dashboard(),
    notebooks:  () => Views.notebooks(),
    commands:   () => Views.commands(),
    ideas:      () => Views.ideas(),
    projects:   () => Views.projects(),
    feed:       () => Views.feed(),
    explore:    () => Views.explore(),
    profile:    () => Views.profile(),
    settings:   () => Views.profile('settings'),
  },

  navigate(name, params = {}) {
    this.current = name;
    this.params  = params;
    UI.setActiveNav(name);

    const view = this.views[name];
    if (view) {
      /* Don't let runtime errors freeze sidebar navigation */
      Promise.resolve(view()).catch(err => {
        console.error('View render failed:', name, err);
        toast('Failed to open view. Try again.', 'error');
      });
    }

    document.getElementById('sidebar')?.classList.remove('open');
  }
};