/* ═══════════════════════════════════════════════
   modals.js — reusable modal system
═══════════════════════════════════════════════ */
const Modals = {

  open(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = html;
    root.querySelector('.modal-overlay')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) Modals.close();
    });
  },

  close() {
    document.getElementById('modal-root').innerHTML = '';
  },

  /* ── Confirm delete (with type-to-confirm for dangerous ops) ── */
  confirmDelete(itemName, onConfirm, typeToConfirm = false) {
    const phrase = typeToConfirm ? `delete ${itemName}` : null;
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal modal-sm">
          <div class="modal-head">
            <span class="modal-title">// confirm delete</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size:.9rem;color:var(--text-2);line-height:1.6;">
              Are you sure you want to delete <strong style="color:var(--text)">${esc(itemName)}</strong>?
              This action cannot be undone.
            </p>
            ${phrase ? `
              <div class="form-group">
                <label class="form-label">Type <code style="color:var(--red)">${esc(phrase)}</code> to confirm</label>
                <input id="confirm-input" class="form-input mono" placeholder="${esc(phrase)}" autocomplete="off"/>
              </div>
            ` : ''}
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-do-delete" class="btn btn-danger" ${phrase ? 'disabled' : ''}>delete</button>
          </div>
        </div>
      </div>
    `);

    if (phrase) {
      document.getElementById('confirm-input').addEventListener('input', e => {
        document.getElementById('btn-do-delete').disabled = e.target.value !== phrase;
      });
    }
    document.getElementById('btn-do-delete').addEventListener('click', () => {
      Modals.close();
      onConfirm();
    });
  },

  /* ── New / Edit Notebook ── */
  notebook(existing = null) {
    const title = existing?.title || '';
    const desc  = existing?.description || '';
    const isPublic = existing?.is_public || false;
    const isEdit = !!existing;

    Modals.open(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-head">
            <span class="modal-title">${isEdit ? '// edit notebook' : '// new notebook'}</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ title</label>
              <input id="nb-title" class="form-input" value="${esc(title)}" placeholder="e.g. Linux Mastery"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ description</label>
              <textarea id="nb-desc" class="form-input" placeholder="What is this notebook about?">${esc(desc)}</textarea>
            </div>
            <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
              <input type="checkbox" id="nb-public" style="accent-color:var(--accent)" ${isPublic ? 'checked' : ''}/>
              <label class="form-label" for="nb-public" style="margin:0">Make this notebook public</label>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-nb-save" class="btn btn-primary">${isEdit ? 'update' : 'create notebook'}</button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('btn-nb-save').addEventListener('click', async () => {
      const payload = {
        title: document.getElementById('nb-title').value.trim(),
        description: document.getElementById('nb-desc').value.trim(),
        is_public: document.getElementById('nb-public').checked,
        user_id: Auth.user.id,
      };
      if (!payload.title) { toast('Title is required', 'error'); return; }
      const btn = document.getElementById('btn-nb-save');
      btn.disabled = true; btn.textContent = '...';

      let err;
      if (isEdit) {
        ({ error: err } = await DB.updateNotebook(existing.id, payload));
      } else {
        const { error, data } = await DB.createNotebook(payload);
        err = error;
        if (!err && payload.is_public) {
          await DB.logFeedEvent(Auth.user.id, 'new_notebook', { title: payload.title, id: data.id }, true);
        }
      }

      if (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = isEdit ? 'update' : 'create notebook'; return; }
      Modals.close();
      toast(isEdit ? 'Notebook updated!' : 'Notebook created!');
      Views.notebooks();
    });
  },

  /* ── New / Edit Entry (inside notebook) ── */
  entry(notebookId, existing = null) {
    const types = ['note', 'command', 'definition', 'snippet', 'concept'];
    const type  = existing?.type || 'note';
    const isEdit = !!existing;

    Modals.open(`
      <div class="modal-overlay">
        <div class="modal modal-lg">
          <div class="modal-head">
            <span class="modal-title">${isEdit ? '// edit entry' : '// new entry'}</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ type</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" id="entry-type-picker">
                ${types.map(t => `
                  <button class="btn btn-sm ${t === type ? 'btn-primary' : 'btn-ghost'} entry-type-opt" data-type="${t}">${t}</button>
                `).join('')}
              </div>
              <input type="hidden" id="entry-type" value="${type}"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ title</label>
              <input id="entry-title" class="form-input" value="${esc(existing?.title || '')}" placeholder="Entry title..."/>
            </div>
            <div class="form-group" id="entry-content-group">
              <label class="form-label">$ content</label>
              <textarea id="entry-content" class="form-input" rows="5" placeholder="Write your content here...">${esc(existing?.content || '')}</textarea>
            </div>
            <div class="form-group" id="entry-code-group">
              <label class="form-label">$ code / command <span style="color:var(--text-3)">(optional)</span></label>
              <textarea id="entry-code" class="form-input mono" rows="3" placeholder="// code or command...">${esc(existing?.code || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ tags <span style="color:var(--text-3)">(comma-separated)</span></label>
              <input id="entry-tags" class="form-input" value="${esc((existing?.tags || []).join(', '))}" placeholder="linux, bash, networking"/>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-entry-save" class="btn btn-primary">${isEdit ? 'update' : 'save entry'}</button>
          </div>
        </div>
      </div>
    `);

    // Type picker
    document.getElementById('entry-type-picker').addEventListener('click', e => {
      const btn = e.target.closest('.entry-type-opt');
      if (!btn) return;
      document.querySelectorAll('.entry-type-opt').forEach(b => b.className = 'btn btn-sm btn-ghost entry-type-opt');
      btn.className = 'btn btn-sm btn-primary entry-type-opt';
      document.getElementById('entry-type').value = btn.dataset.type;
    });

    document.getElementById('btn-entry-save').addEventListener('click', async () => {
      const payload = {
        notebook_id: notebookId,
        user_id:     Auth.user.id,
        type:    document.getElementById('entry-type').value,
        title:   document.getElementById('entry-title').value.trim(),
        content: document.getElementById('entry-content').value.trim(),
        code:    document.getElementById('entry-code').value.trim(),
        tags:    document.getElementById('entry-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      };
      if (!payload.title) { toast('Title is required', 'error'); return; }
      const btn = document.getElementById('btn-entry-save');
      btn.disabled = true; btn.textContent = '...';

      let err;
      if (isEdit) ({ error: err } = await DB.updateEntry(existing.id, payload));
      else        ({ error: err } = await DB.createEntry(payload));

      if (err) { toast(err.message, 'error'); btn.disabled = false; return; }
      Modals.close();
      toast(isEdit ? 'Entry updated!' : 'Entry saved!');
      // Refresh notebook view
      if (Router.params?.notebookId === notebookId) Views._openNotebook(Router.params.notebook);
    });
  },

  /* ── New / Edit Command ── */
  command(existing = null) {
    const isEdit = !!existing;
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-head">
            <span class="modal-title">${isEdit ? '// edit command' : '// new command'}</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ title</label>
              <input id="cmd-title" class="form-input" value="${esc(existing?.title||'')}" placeholder="e.g. SSH tunnel"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ command</label>
              <input id="cmd-cmd" class="form-input mono" value="${esc(existing?.command||'')}" placeholder="ssh -L 8080:localhost:80 user@host"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ description</label>
              <textarea id="cmd-desc" class="form-input" rows="3" placeholder="What does this command do?">${esc(existing?.description||'')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ tags</label>
              <input id="cmd-tags" class="form-input" value="${esc((existing?.tags||[]).join(', '))}" placeholder="ssh, tunnel, networking"/>
            </div>
            <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
              <input type="checkbox" id="cmd-public" style="accent-color:var(--accent)" ${existing?.is_public ? 'checked' : ''}/>
              <label class="form-label" for="cmd-public" style="margin:0">Make public</label>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-cmd-save" class="btn btn-primary">${isEdit ? 'update' : 'save command'}</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-cmd-save').addEventListener('click', async () => {
      const payload = {
        user_id:     Auth.user.id,
        title:       document.getElementById('cmd-title').value.trim(),
        command:     document.getElementById('cmd-cmd').value.trim(),
        description: document.getElementById('cmd-desc').value.trim(),
        tags:        document.getElementById('cmd-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
        is_public:   document.getElementById('cmd-public').checked,
      };
      if (!payload.command) { toast('Command is required', 'error'); return; }
      const btn = document.getElementById('btn-cmd-save');
      btn.disabled = true;
      let err;
      if (isEdit) ({ error: err } = await DB.updateCommand(existing.id, payload));
      else        ({ error: err } = await DB.createCommand(payload));
      if (err) { toast(err.message, 'error'); btn.disabled = false; return; }
      Modals.close();
      toast(isEdit ? 'Command updated!' : 'Command saved!');
      Views.commands();
    });
  },

  /* ── New / Edit Idea ── */
  idea(existing = null) {
    const isEdit = !!existing;
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-head">
            <span class="modal-title">${isEdit ? '// edit idea' : '// new idea'}</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ title *</label>
              <input id="idea-title" class="form-input" value="${esc(existing?.title||'')}" placeholder="My awesome SaaS idea"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ description *</label>
              <textarea id="idea-desc" class="form-input" rows="4" placeholder="Describe the idea in detail...">${esc(existing?.description||'')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ problem it solves</label>
              <textarea id="idea-problem" class="form-input" rows="2" placeholder="What problem does this solve?">${esc(existing?.problem||'')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ status</label>
              <select id="idea-status" class="form-input">
                ${['exploring','planning','building','done','parked'].map(s =>
                  `<option value="${s}" ${(existing?.status||'exploring')===s?'selected':''}>${s}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
              <input type="checkbox" id="idea-public" style="accent-color:var(--accent)" ${existing?.is_public?'checked':''}/>
              <label class="form-label" for="idea-public" style="margin:0">Make public</label>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-idea-save" class="btn btn-primary">${isEdit ? 'update' : 'save idea'}</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-idea-save').addEventListener('click', async () => {
      const payload = {
        user_id:     Auth.user.id,
        title:       document.getElementById('idea-title').value.trim(),
        description: document.getElementById('idea-desc').value.trim(),
        problem:     document.getElementById('idea-problem').value.trim(),
        status:      document.getElementById('idea-status').value,
        is_public:   document.getElementById('idea-public').checked,
      };
      if (!payload.title || !payload.description) { toast('Title and description required', 'error'); return; }
      const btn = document.getElementById('btn-idea-save');
      btn.disabled = true;
      let err;
      if (isEdit) ({ error: err } = await DB.updateIdea(existing.id, payload));
      else        ({ error: err } = await DB.createIdea(payload));
      if (err) { toast(err.message, 'error'); btn.disabled = false; return; }
      Modals.close();
      toast(isEdit ? 'Idea updated!' : 'Idea saved!');
      Views.ideas();
    });
  },

  /* ── Promote Idea → Project ── */
  promoteIdea(idea) {
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-head">
            <span class="modal-title">// promote idea → project</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ project title</label>
              <input id="prj-title" class="form-input" value="${esc(idea.title)}"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ description</label>
              <textarea id="prj-desc" class="form-input" rows="3">${esc(idea.description)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ status</label>
              <select id="prj-status" class="form-input">
                ${['planning','in-progress','paused','done'].map(s =>
                  `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-promote" class="btn btn-primary">🚀 create project</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-promote').addEventListener('click', async () => {
      const payload = {
        user_id:     Auth.user.id,
        idea_id:     idea.id,
        title:       document.getElementById('prj-title').value.trim(),
        description: document.getElementById('prj-desc').value.trim(),
        status:      document.getElementById('prj-status').value,
        is_public:   false,
      };
      if (!payload.title) { toast('Title required', 'error'); return; }
      const { error } = await DB.createProject(payload);
      if (error) { toast(error.message, 'error'); return; }
      // Mark idea as converted
      await DB.updateIdea(idea.id, { status: 'building', converted_to_project: true });
      Modals.close();
      toast('Project created from idea! 🚀');
      Views.projects();
    });
  },

  /* ── New / Edit Project ── */
  project(existing = null) {
    const isEdit = !!existing;
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal modal-lg">
          <div class="modal-head">
            <span class="modal-title">${isEdit ? '// edit project' : '// new project'}</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ title</label>
              <input id="prj-title" class="form-input" value="${esc(existing?.title||'')}" placeholder="My Project"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ description</label>
              <textarea id="prj-desc" class="form-input" rows="3" placeholder="What are you building?">${esc(existing?.description||'')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">$ status</label>
              <select id="prj-status" class="form-input">
                ${['planning','in-progress','paused','done'].map(s =>
                  `<option value="${s}" ${(existing?.status||'planning')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">$ GitHub repo URL <span style="color:var(--text-3)">(optional)</span></label>
              <input id="prj-repo" class="form-input mono" value="${esc(existing?.github_repo||'')}" placeholder="https://github.com/user/repo"/>
            </div>
            <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
              <input type="checkbox" id="prj-public" style="accent-color:var(--accent)" ${existing?.is_public?'checked':''}/>
              <label class="form-label" for="prj-public" style="margin:0">Make public</label>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-prj-save" class="btn btn-primary">${isEdit ? 'update' : 'create project'}</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-prj-save').addEventListener('click', async () => {
      const payload = {
        user_id:     Auth.user.id,
        title:       document.getElementById('prj-title').value.trim(),
        description: document.getElementById('prj-desc').value.trim(),
        status:      document.getElementById('prj-status').value,
        github_repo: document.getElementById('prj-repo').value.trim(),
        is_public:   document.getElementById('prj-public').checked,
      };
      if (!payload.title) { toast('Title required', 'error'); return; }
      const btn = document.getElementById('btn-prj-save');
      btn.disabled = true;
      let err;
      if (isEdit) ({ error: err } = await DB.updateProject(existing.id, payload));
      else        ({ error: err } = await DB.createProject(payload));
      if (err) { toast(err.message, 'error'); btn.disabled = false; return; }
      Modals.close();
      toast(isEdit ? 'Project updated!' : 'Project created!');
      Views.projects();
    });
  },

  /* ── Add Milestone ── */
  milestone(projectId) {
    Modals.open(`
      <div class="modal-overlay">
        <div class="modal modal-sm">
          <div class="modal-head">
            <span class="modal-title">// add milestone</span>
            <button class="modal-close-btn" onclick="Modals.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">$ label</label>
              <input id="ms-label" class="form-input" placeholder="e.g. MVP launched"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ date</label>
              <input id="ms-date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}"/>
            </div>
            <div class="form-group">
              <label class="form-label">$ notes</label>
              <textarea id="ms-notes" class="form-input" rows="2" placeholder="Optional notes..."></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" onclick="Modals.close()">cancel</button>
            <button id="btn-ms-save" class="btn btn-primary">add milestone</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-ms-save').addEventListener('click', async () => {
      const payload = {
        project_id: projectId,
        label:  document.getElementById('ms-label').value.trim(),
        date:   document.getElementById('ms-date').value,
        notes:  document.getElementById('ms-notes').value.trim(),
      };
      if (!payload.label || !payload.date) { toast('Label and date required', 'error'); return; }
      const { error } = await DB.createMilestone(payload);
      if (error) { toast(error.message, 'error'); return; }
      Modals.close();
      toast('Milestone added!');
      // Re-render timeline in place
      Views._renderTimeline(projectId);
    });
  },
};