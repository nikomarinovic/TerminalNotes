/* ═══════════════════════════════════════════════
   views/projects.js
═══════════════════════════════════════════════ */

Views.projects = async function() {
  const { data: projects, error } = await DB.getProjects(Auth.user.id);
  if (error) { toast(error.message, 'error'); return; }

  const statusColor = { planning:'badge-blue', 'in-progress':'badge-amber', paused:'badge-gray', done:'badge-green' };
  const statusEmoji = { planning:'📐', 'in-progress':'🔧', paused:'⏸', done:'✅' };

  UI.renderMain(`
    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// projects</div>
        <h1 class="page-title">Your Projects</h1>
        <p class="page-sub">Evolved ideas with timelines, notes, and GitHub integration.</p>
      </div>
      <button class="btn btn-primary" onclick="Modals.project()">+ New Project</button>
    </div>

    ${!projects?.length
      ? UI.empty('🚀', 'No projects yet', 'Create a project or promote an idea to get started.', '+ New Project', 'Modals.project()')
      : `<div class="card-list" id="projects-list">
          ${(projects||[]).map(p => Views._projectCard(p, statusColor, statusEmoji)).join('')}
        </div>`
    }
  `);
};

Views._projectCard = function(p, statusColor, statusEmoji) {
  const sc = statusColor || { planning:'badge-blue', 'in-progress':'badge-amber', paused:'badge-gray', done:'badge-green' };
  const se = statusEmoji  || { planning:'📐', 'in-progress':'🔧', paused:'⏸', done:'✅' };
  const pStr = JSON.stringify(JSON.stringify(p));
  return `
    <div class="card" style="cursor:pointer" onclick="Views._openProject(${pStr})">
      <div class="card-header">
        <span style="font-size:1.1rem">${se[p.status]||'📐'}</span>
        <span class="card-title" style="font-size:1rem">${esc(p.title)}</span>
        <div style="display:flex;gap:6px;align-items:center;margin-left:auto" onclick="event.stopPropagation()">
          <span class="badge ${sc[p.status]||'badge-gray'}">${esc(p.status)}</span>
          ${p.is_public ? '<span class="badge badge-green">public</span>' : ''}
          ${p.github_repo ? `<a href="${esc(p.github_repo)}" target="_blank" class="badge badge-gray" title="GitHub repo" onclick="event.stopPropagation()">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 10.07 3.633 9.7 3.633 9.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
            GitHub
          </a>` : ''}
          <button class="btn-icon" onclick="Modals.project(JSON.parse(${pStr}))" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon red" onclick="Modals.confirmDelete('${esc(p.title)}',()=>Views._deleteProject('${p.id}'),true)" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      ${p.description ? `
        <div class="card-body">
          <p style="font-size:.9rem;color:var(--text-2);line-height:1.6">${esc(p.description)}</p>
          <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--text-3);margin-top:8px">${reltime(p.created_at)} · click to open</div>
        </div>
      ` : ''}
    </div>
  `;
};

Views._openProject = async function(p) {
  if (typeof p === 'string') p = JSON.parse(p);
  Router.params = { project: p, projectId: p.id };
  UI.renderMain(UI.loading());

  const { data: milestones } = await DB.getMilestones(p.id);
  const pStr = JSON.stringify(JSON.stringify(p));

  let reposHtml = '';
  if (Auth.githubToken && p.github_repo) {
    reposHtml = `
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px;margin-top:16px">
        <div style="font-family:var(--font-mono);font-size:.75rem;color:var(--text-3);margin-bottom:8px">// connected repo</div>
        <a href="${esc(p.github_repo)}" target="_blank" class="repo-name">${esc(p.github_repo.replace('https://github.com/',''))}</a>
      </div>
    `;
  }

  UI.renderMain(`
    <div style="margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="Views.projects()">← back to projects</button>
    </div>

    <div class="page-header">
      <div class="page-title-block">
        <div class="page-label">// project</div>
        <h1 class="page-title">${esc(p.title)}</h1>
        ${p.description ? `<p class="page-sub">${esc(p.description)}</p>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="Modals.project(JSON.parse(${pStr}))">Edit</button>
        <button class="btn btn-primary btn-sm" onclick="Modals.milestone('${p.id}')">+ Milestone</button>
      </div>
    </div>

    ${reposHtml}

    <!-- Timeline -->
    <div style="margin:28px 0 20px">
      <div class="section-row">
        <div class="section-row-title">// timeline</div>
        <button class="btn btn-ghost btn-sm" onclick="Modals.milestone('${p.id}')">+ add milestone</button>
      </div>
      <div id="timeline-wrap">
        ${Views._buildTimeline(milestones || [])}
      </div>
    </div>

    <!-- Notes / linked ideas tabs -->
    <div class="page-tabs" style="margin-top:24px">
      <button class="ptab active" onclick="Views._projectTab(this,'notes')">📝 Notes</button>
      <button class="ptab" onclick="Views._projectTab(this,'repos')">🔗 Repos</button>
    </div>

    <div id="project-tab-content">
      ${Views._projectNotesTab(p)}
    </div>

    <div style="margin-top:24px">
      <button class="btn btn-danger btn-sm" onclick="Modals.confirmDelete('${esc(p.title)}',()=>Views._deleteProject('${p.id}'),true)">Delete project</button>
    </div>
  `);
};

Views._buildTimeline = function(milestones) {
  if (!milestones.length) {
    return `<div style="font-family:var(--font-mono);font-size:.82rem;color:var(--text-3);padding:20px 0">No milestones yet. Add one to track your progress.</div>`;
  }
  const today = new Date();
  return `
    <div class="timeline">
      <div class="timeline-track">
        ${milestones.map(m => {
          const past = new Date(m.date) <= today;
          return `
            <div class="tl-point">
              <div style="font-family:var(--font-mono);font-size:.68rem;color:var(--text-3);margin-bottom:8px">${m.date}</div>
              <div class="tl-dot${past?' past':''}"></div>
              <div class="tl-label">
                <div style="font-weight:500;margin-bottom:2px">${esc(m.label)}</div>
                ${m.notes ? `<div style="font-size:.75rem;color:var(--text-3);margin-top:4px">${esc(m.notes)}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

Views._renderTimeline = async function(projectId) {
  const { data: milestones } = await DB.getMilestones(projectId);
  const wrap = document.getElementById('timeline-wrap');
  if (wrap) wrap.innerHTML = Views._buildTimeline(milestones || []);
};

Views._projectNotesTab = function(p) {
  return `
    <div class="card" style="margin-top:8px">
      <div class="card-body" style="padding:18px">
        <p style="font-size:.9rem;color:var(--text-2);line-height:1.65">
          Use notebooks to attach notes to this project. Link a notebook by tagging it with
          <span class="tag">${esc(p.title.toLowerCase().replace(/\s+/g,'-'))}</span>
        </p>
        <div style="margin-top:12px">
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('notebooks')">Go to Notebooks</button>
        </div>
      </div>
    </div>
  `;
};

Views._projectTab = function(btn, tab) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const p = Router.params?.project;
  if (!p) return;
  const content = document.getElementById('project-tab-content');
  if (tab === 'notes') content.innerHTML = Views._projectNotesTab(p);
  else if (tab === 'repos') {
    content.innerHTML = `
      <div class="card" style="margin-top:8px">
        <div class="card-body" style="padding:18px">
          ${p.github_repo
            ? `<div class="repo-card"><div class="repo-name">${esc(p.github_repo)}</div></div>`
            : `<p style="font-size:.9rem;color:var(--text-2)">No repository linked. Edit the project to add a GitHub repo URL.</p>`}
          ${Auth.githubToken ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="Views._showRepos()">Browse my repos</button>` : ''}
          <div id="repos-list" style="margin-top:14px"></div>
        </div>
      </div>
    `;
  }
};

Views._showRepos = async function() {
  const el = document.getElementById('repos-list');
  el.innerHTML = '<div class="loading-page"><div class="spinner"></div> Loading repos...</div>';
  const repos = await DB.getGithubRepos(Auth.githubToken);
  if (!repos.length) { el.innerHTML = '<p style="color:var(--text-3);font-size:.85rem">No repos found.</p>'; return; }
  el.innerHTML = `
    <div class="section-row-title" style="margin-bottom:10px">// your repositories</div>
    <div class="grid-2">
      ${repos.slice(0,12).map(r => `
        <div class="repo-card">
          <div class="repo-name">${esc(r.full_name)}</div>
          <div class="repo-desc">${esc(r.description||'No description')}</div>
          <div class="repo-meta">
            ${r.language ? `<span class="repo-lang">● ${esc(r.language)}</span>` : ''}
            <span class="repo-stars">★ ${r.stargazers_count}</span>
            <button class="btn btn-sm btn-ghost" onclick="Views._linkRepo('${esc(r.html_url)}')">Link to project</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

Views._linkRepo = async function(url) {
  const p = Router.params?.project;
  if (!p) return;
  const { error } = await DB.updateProject(p.id, { github_repo: url });
  if (error) { toast(error.message, 'error'); return; }
  toast('Repository linked!');
  Router.params.project.github_repo = url;
  Views._openProject(Router.params.project);
};

Views._deleteProject = async function(id) {
  await db.from('milestones').delete().eq('project_id', id);
  const { error } = await DB.deleteProject(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Project deleted');
  Views.projects();
};
