/* ═══════════════════════════════════════════════
   app.js — bootstrap + global event wiring
═══════════════════════════════════════════════ */


document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth init ──
  await Auth.init();

  // ── Landing CTA buttons ──
  document.getElementById('btn-land-login')?.addEventListener('click', () => {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.querySelector('.atab[data-tab="login"]').click();
  });
  document.getElementById('btn-land-signup')?.addEventListener('click', () => {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.querySelector('.atab[data-tab="signup"]').click();
  });
  document.getElementById('btn-hero-start')?.addEventListener('click', () => {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.querySelector('.atab[data-tab="signup"]').click();
  });

  // ── Auth overlay close ──
  document.getElementById('auth-close')?.addEventListener('click', () => {
    document.getElementById('auth-overlay').classList.add('hidden');
  });

  // ── Auth tabs ──
  document.querySelectorAll('.atab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.aform').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('aform-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  // ── Login ──
  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const pass  = document.getElementById('l-pass').value;
    if (!email || !pass) { showAuthErr('l-err','Fill in all fields'); return; }
    const btn = document.getElementById('btn-login');
    btn.textContent = '...'; btn.disabled = true;
    const err = await Auth.loginEmail(email, pass);
    btn.textContent = 'Sign in'; btn.disabled = false;
    if (err) showAuthErr('l-err', err.message);
  });
  document.getElementById('l-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });

  // ── Signup ──
  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const email = document.getElementById('s-email').value.trim();
    const pass  = document.getElementById('s-pass').value;
    if (!email || !pass) { showAuthErr('s-err','Fill in all fields'); return; }
    if (pass.length < 6) { showAuthErr('s-err','Password must be 6+ characters'); return; }
    const btn = document.getElementById('btn-signup');
    btn.textContent = '...'; btn.disabled = true;
    const err = await Auth.signupEmail(email, pass);
    btn.textContent = 'Create account'; btn.disabled = false;
    if (err) showAuthErr('s-err', err.message);
    else {
      document.getElementById('auth-overlay').classList.add('hidden');
      toast('Check your email to confirm your account!', 'info');
    }
  });

  // ── GitHub OAuth ──
  document.getElementById('btn-gh-login')?.addEventListener('click',  () => Auth.loginGithub());
  document.getElementById('btn-gh-signup')?.addEventListener('click', () => Auth.loginGithub());

  // ── Logout ──
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

  // ── Sidebar navigation ──
  document.querySelectorAll('.sb-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => Router.navigate(item.dataset.nav));
  });
  document.querySelectorAll('[data-nav]').forEach(item => {
    if (!item.classList.contains('sb-item')) {
      item.addEventListener('click', () => Router.navigate(item.dataset.nav));
    }
  });

  // ── Sidebar toggle (mobile) ──
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // ── User dropdown ──
  document.getElementById('tb-avatar')?.addEventListener('click', () => {
    document.getElementById('user-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    const dd = document.getElementById('user-dropdown');
    if (dd && !dd.classList.contains('hidden') && !document.getElementById('tb-user-menu').contains(e.target)) {
      dd.classList.add('hidden');
    }
  });

  // ── Search bar → open overlay ──
  document.getElementById('global-search')?.addEventListener('click', () => Search.open());
  document.getElementById('global-search')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') Search.open();
  });

  // ── Search overlay ──
  document.getElementById('sm-input')?.addEventListener('input', e => _searchDebounced(e.target.value));
  document.getElementById('search-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'search-overlay') Search.close();
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd+K → search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      Search.open();
    }
    // Escape → close overlays / modals
    if (e.key === 'Escape') {
      Search.close();
      Modals.close();
      document.getElementById('user-dropdown')?.classList.add('hidden');
    }
    // N → new item (when app visible and no input focused)
    if (e.key === 'n' && !inputFocused() && !document.getElementById('app').classList.contains('hidden')) {
      const route = Router.current;
      if (route === 'notebooks') Modals.notebook();
      else if (route === 'commands') Modals.command();
      else if (route === 'ideas') Modals.idea();
      else if (route === 'projects') Modals.project();
    }
  });

  // ── Hamburger (mobile landing nav) ──
  document.getElementById('nav-hamburger')?.addEventListener('click', () => {
    const links = document.querySelector('.land-nav-links');
    if (links) {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '56px';
      links.style.right = '20px';
      links.style.background = 'var(--bg-1)';
      links.style.border = '1px solid var(--border)';
      links.style.borderRadius = 'var(--r-lg)';
      links.style.padding = '12px';
      links.style.gap = '4px';
      links.style.zIndex = '200';
    }
  });

});

/* ─── Helpers ─── */
function showAuthErr(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '// ' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function inputFocused() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}