/* ═══════════════════════════════════════════════
   views/ideas.js
═══════════════════════════════════════════════ */

Views._ideaRegistry = {};

Views.ideas = async function() {
  const { data: ideas, error } = await DB.getIdeas(Auth.user.id);
  if (error) { toast(error.message, 'error'); return; }

  Views._ideaRegistry = {};
  (ideas || []).forEach(i => { Views._ideaRegistry[i.id] = i; });

  const statuses = ['exploring','planning','building','done','parked'];
  const statusEmoji = { exploring:Icons.svg('idea','ui-icon'), planning:Icons.svg('settings','ui-icon'), building:Icons.svg('command','ui-icon'), done:Icons.svg('project','ui-icon'), parked:Icons.svg('comment','ui-icon') };

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// ideas</div>
        <h1 class="page-title">Your Ideas</h1>
        <p class="page-sub">Early concepts and sparks. Promote any idea to a full project.</p>
      </div>
      <button class="btn btn-primary" onclick="Modals.idea()">+ New Idea</button>
    </div>

    <div class="page-tabs">
      <button class="ptab active" onclick="Views._filterIdeas(this,'all')">all (${(ideas||[]).length})</button>
      ${statuses.map(s => {
        const count = (ideas||[]).filter(i=>i.status===s).length;
        return count > 0 ? `<button class="ptab" onclick="Views._filterIdeas(this,'${s}')">${statusEmoji[s]} ${s} (${count})</button>` : '';
      }).join('')}
    </div>

    ${!ideas?.length
      ? UI.empty(Icons.svg('idea','ui-icon'), 'No ideas yet', 'Capture your first idea — every great project starts with a spark.', '+ New Idea', 'Modals.idea()')
      : `<div class="grid-2" id="ideas-grid">
          ${(ideas||[]).map(i => Views._ideaCard(i)).join('')}
        </div>`
    }
  `);

  Views._allIdeas = ideas || [];
};

Views._ideaCard = function(i) {
  const statusEmoji = { exploring:Icons.svg('idea','ui-icon'), planning:Icons.svg('settings','ui-icon'), building:Icons.svg('command','ui-icon'), done:Icons.svg('project','ui-icon'), parked:Icons.svg('comment','ui-icon') };
  return `
    <div class="card idea-card" data-status="${esc(i.status)}" style="display:flex;flex-direction:column">
      <div class="card-header">
        <span style="font-size:1.2rem">${statusEmoji[i.status] || Icons.svg('idea','ui-icon')}</span>
        <span class="card-title">${esc(i.title)}</span>
        <div style="display:flex;gap:5px;margin-left:auto">
          ${i.is_public ? '<span class="badge badge-green">public</span>' : ''}
          <button class="btn-icon" onclick="Views._editIdea('${i.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon red" onclick="Views._confirmDeleteIdea('${i.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="card-body" style="flex:1">
        <p style="font-size:.9rem;color:var(--text-2);line-height:1.65;margin-bottom:10px">${esc(i.description)}</p>
        ${i.problem ? `
          <div style="background:var(--bg-3);border-left:3px solid var(--amber);padding:8px 12px;border-radius:0 var(--r) var(--r) 0;margin-bottom:10px">
            <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--amber);margin-bottom:3px">// problem solved</div>
            <p style="font-size:.85rem;color:var(--text-2)">${esc(i.problem)}</p>
          </div>
        ` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:8px">
          <span class="idea-status status-${esc(i.status)}">${esc(i.status)}</span>
          <div style="display:flex;gap:6px">
            ${!i.converted_to_project ? `
              <button class="btn btn-sm btn-secondary" onclick="Views._promoteIdea('${i.id}')">
                ${Icons.svg('project','ui-icon')} Create Project
              </button>
            ` : '<span class="badge badge-purple">converted</span>'}
          </div>
        </div>
        <div style="margin-top:8px;font-family:var(--font-mono);font-size:.7rem;color:var(--text-3)">${reltime(i.created_at)}</div>
      </div>
    </div>
  `;
};

Views._editIdea = function(id) {
  const i = Views._ideaRegistry[id];
  if (i) Modals.idea(i);
};

Views._confirmDeleteIdea = function(id) {
  const i = Views._ideaRegistry[id];
  if (i) Modals.confirmDelete(i.title, () => Views._deleteIdea(id));
};

Views._promoteIdea = function(id) {
  const i = Views._ideaRegistry[id];
  if (i) Modals.promoteIdea(i);
};

Views._filterIdeas = function(btn, status) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.idea-card').forEach(el => {
    el.style.display = (status === 'all' || el.dataset.status === status) ? '' : 'none';
  });
};

Views._deleteIdea = async function(id) {
  const { error } = await DB.deleteIdea(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Idea deleted');
  Views.ideas();
};