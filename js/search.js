/* ═══════════════════════════════════════════════
   search.js — global search overlay
═══════════════════════════════════════════════ */

const Search = {
  open() {
    document.getElementById('search-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('sm-input').focus(), 50);
  },

  close() {
    document.getElementById('search-overlay').classList.add('hidden');
    document.getElementById('sm-input').value = '';
    document.getElementById('sm-results').innerHTML = '<div class="sm-empty">Start typing to search...</div>';
  },

  async run(query) {
    if (!query.trim()) {
      document.getElementById('sm-results').innerHTML = '<div class="sm-empty">Start typing to search...</div>';
      return;
    }

    document.getElementById('sm-results').innerHTML = '<div class="sm-empty"><div class="spinner" style="margin:0 auto"></div></div>';

    const results = await DB.searchAll(query);
    const items = [
      ...results.users.map(r    => ({ type: 'user', ...r })),
      ...results.notebooks.map(r => ({ type: 'notebook', ...r })),
      ...results.commands.map(r  => ({ type: 'command', ...r })),
      ...results.ideas.map(r    => ({ type: 'idea', ...r })),
      ...results.projects.map(r => ({ type: 'project', ...r })),
    ];

    const typeColor = { user:'badge-purple', notebook:'badge-blue', command:'badge-green', idea:'badge-amber', project:'badge-purple' };
    const typeNav   = { notebook:'notebooks', command:'commands', idea:'ideas', project:'projects' };

    if (!items.length) {
      document.getElementById('sm-results').innerHTML = `<div class="sm-empty">No results for "${esc(query)}"</div>`;
      return;
    }

    document.getElementById('sm-results').innerHTML = items.map(item => `
      <div class="sm-result" onclick="${item.type === 'user' ? `Search.close();Router.navigate('profile',{userId:'${item.id}'})` : `Search.close();Router.navigate('${typeNav[item.type]}')`}">
        <span class="sm-result-type badge ${typeColor[item.type]||'badge-gray'}">${item.type}</span>
        <div>
          <div class="sm-result-title">${esc(item.type === 'user' ? ('@' + (item.username || 'user')) : item.title)}</div>
          ${item.type === 'user' && item.full_name ? `<div class="sm-result-sub">${esc(item.full_name)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
};

const _searchDebounced = debounce(q => Search.run(q), 300);