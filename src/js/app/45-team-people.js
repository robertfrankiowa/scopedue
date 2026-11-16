  /* ---------- team: the people a project can add ----------
     The list lives in Settings. A project adds people only from it (Add to this project shows nobody else), and a person leaves the list
     only by leaving every project first: removing someone here takes them off each project too, with Undo.
     A project keeps its own copy of the name, email, colour and role, so it still reads on its own; the email is what ties the two together.
     The list is saved with the projects (IndexedDB "meta", name "team"), so a copy holds it. Whoever is already on a project when this
     list first appears is put on it, so nothing that existed before is lost or left out. Nothing here is sent anywhere. */
  function tmKey(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
  function tmEmailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function tmName(n) { return String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 60); }
  function tmClean(m) {
    var n, e;
    if (!m || typeof m !== 'object') return null;
    n = tmName(m.n); e = tmKey(m.e).slice(0, 90);
    if (!n || n === 'You' || !tmEmailOk(e)) return null;
    return { n: n, e: e, role: m.role === 'Viewer' ? 'Viewer' : 'Editor', c: typeof m.c === 'string' && /^#[0-9a-f]{3,8}$/i.test(m.c) ? m.c : PD_COLORS[0] };
  }
  var TEAM = (function () {
    var out = [], seen = {};
    function add(m) { var r = tmClean(m); if (!r || seen[r.e]) return; seen[r.e] = 1; out.push(r); }
    sdList('team').forEach(add);
    PROJECTS.forEach(function (p) { p.team.forEach(add); });
    return out;
  })();
  function tmFind(e) { var k = tmKey(e), i; for (i = 0; i < TEAM.length; i++) if (TEAM[i].e === k) return TEAM[i]; return null; }
  function tmOnProject(p, e) { var k = tmKey(e); return p.team.some(function (x) { return tmKey(x.e) === k; }); }
  function tmProjects(m) { return PROJECTS.filter(function (p) { return tmOnProject(p, m.e); }); }
  function tmRekeyWork(p, a, b) {
    if (p.kind === 'private') ((p.pv && p.pv.items) || []).forEach(function (x) { if (x.as === a) x.as = b; });
    else { var w = p.work || {}; Object.keys(w).forEach(function (id) { if (w[id].as === a) w[id].as = b; }); }
  }
  /* takes someone off the list and off every project; returns how to put it all back */
  function tmDrop(m) {
    var i = TEAM.indexOf(m), hits = [], items = 0;
    if (i < 0) return { n: 0, p: 0, undo: function () {} };
    PROJECTS.forEach(function (p) {
      var j = -1, x, owner, back;
      p.team.forEach(function (y, k) { if (j < 0 && tmKey(y.e) === m.e) j = k; });
      if (j < 0) return;
      x = p.team[j]; owner = p.owner === x.n; back = wkRelease(p, x.e);
      p.team.splice(j, 1); if (owner) p.owner = 'You';
      items += back.n; hits.push({ p: p, j: j, x: x, owner: owner, back: back });
    });
    TEAM.splice(i, 1);
    hits.forEach(function (h) { wkAfter(h.p); });
    pdRender();
    return { n: items, p: hits.length, undo: function () {
      TEAM.splice(i, 0, m);
      hits.slice().reverse().forEach(function (h) { h.p.team.splice(h.j, 0, h.x); if (h.owner) h.p.owner = h.x.n; h.back.undo(); });
      hits.forEach(function (h) { wkAfter(h.p); });
      pdRender();
    } };
  }

  /* ---- the tab ---- */
  var tmEl = { list: pfId('tm-list'), note: pfId('tm-note') }, tmAsk = '';
  function tmRow(m, i) {
    var ps = tmProjects(m), n = ps.length, e = esc(m.e), nm = esc(m.n), role;
    if (tmAsk === m.e) {
      return '<li class="st-m ask" data-e="' + e + '">' + pdAv(m) + '<div class="st-m-t"><b>Remove ' + nm + '?</b><small>They leave ' + (n === 1 ? '1 project' : n + ' projects') + ' and the work assigned to them has no owner.</small></div>' +
        '<div class="st-m-a"><button type="button" class="btn-ghost btn-sm" data-tm="cancel">Cancel</button><button type="button" class="btn-primary btn-sm ld-crit" data-tm="rm-go">Remove</button></div></li>';
    }
    /* v111: each option carries its value, so the choice is not the word the language layer shows (Người xem) */
    role = '<span class="pd-sel"><select data-tm-role aria-label="Starting role for ' + nm + '">' + fbRoleOpts(null, m.role) + '</select>' + IC('chev') + '</span>';
    var open = !!tmOpenE[m.e];
    return '<li class="st-m' + (open ? ' open' : '') + '" data-e="' + e + '">' + pdAv(m) + '<div class="st-m-t"><b>' + nm + '</b><small>' + e + '</small></div>' +
      '<button type="button" class="st-m-n st-m-tg" data-tm="tog" aria-expanded="' + open + '" aria-controls="tm-p-' + i + '"><span>' + (n ? (n === 1 ? '1 project' : n + ' projects') : 'No projects') + '</span>' + IC('chev') + '</button>' + role +
      '<div class="st-m-a"><button type="button" class="icon-sm xs" data-tm="edit" aria-label="Edit ' + nm + '">' + IC('edit') + '</button><button type="button" class="icon-sm xs" data-tm="rm" aria-label="Remove ' + nm + '">' + IC('x') + '</button></div>' +
      (open ? tmPanel(m, i, ps) : '') + '</li>';
  }

  /* ---- where each person is: a row opens on their projects. On a project you own you change their role there, take them off it,
     or add them to another, exactly as the project's own Team tab does (the same Undo, the same Drive invitation).
     A project someone shared with you is shown, and stays theirs to change. */
  var tmOpenE = {};   /* the rows that are open, by email: a redraw keeps them open */
  function tmMine(p) { return x8Role(p) === 'Owner'; }
  function tmIdx(p, m) { var k = tmKey(m.e), j = -1; p.team.forEach(function (x, i) { if (j < 0 && tmKey(x.e) === k) j = i; }); return j; }
  function tmRoleSel(attr, label, role, p) {   /* p: the project, when the choice is for one (v92: Editor only on a client project) */
    return '<span class="pd-sel"><select ' + attr + ' aria-label="' + esc(label) + '">' + fbRoleOpts(p, role) + '</select>' + IC('chev') + '</span>';
  }
  function tmPanel(m, i, ps) {
    var free = PROJECTS.filter(function (p) { return tmMine(p) && !tmOnProject(p, m.e); }), h = '<div class="st-mp" id="tm-p-' + i + '">';
    h += ps.length ? '<ul class="st-mp-l" aria-label="' + esc('Projects ' + m.n + ' is on') + '">' + ps.map(function (p) {
      var x = p.team[tmIdx(p, m)], can = tmMine(p) && x.role !== 'Owner', pid = esc(p.id);
      return '<li class="st-mp-r"><span class="st-mp-m" aria-hidden="true">' + esc(p.m) + '</span><span class="st-mp-t"><button type="button" class="st-mp-o" data-tm="open" data-pj="' + pid + '" title="Open its Team tab">' + esc(p.n) + '</button>' +
        '<small>' + (p.kind === 'client' ? 'Client project' : 'Private project') + (tmMine(p) ? '' : ' · shared with you') + '</small></span>' +
        (can ? tmRoleSel('data-tm-pr="' + pid + '"', 'Role for ' + m.n + ' on ' + p.n, x.role, p) + '<button type="button" class="icon-sm xs" data-tm="leave" data-pj="' + pid + '" aria-label="' + esc('Remove ' + m.n + ' from ' + p.n) + '">' + IC('x') + '</button>'
          : '<span class="chip neutral">' + esc(pdRoleName(x.role)) + '</span><span class="st-mp-x" aria-hidden="true"></span>') + '</li>';
    }).join('') + '</ul>' : '<p class="st-mp-e">' + esc(m.n) + ' is not on a project yet.</p>';
    if (free.length) h += '<form class="st-mp-add" data-tm-add novalidate><label class="sr-only" for="tm-ap-' + i + '">Add ' + esc(m.n) + ' to a project</label>' +
      '<span class="pd-sel st-mp-pj"><select id="tm-ap-' + i + '" name="p"><option value="">Add to a project…</option>' + free.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.n) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>' +
      tmRoleSel('name="r"', 'Role on that project', m.role) + '<button type="submit" class="btn-primary btn-sm" disabled>' + IC('plus') + 'Add</button></form>';
    else if (!PROJECTS.some(tmMine)) h += '<p class="st-mp-e">Create a project first, then add ' + esc(m.n) + ' to it here.</p>';
    else h += '<p class="st-mp-e">' + esc(m.n) + ' is on every project you own.</p>';
    return h + '</div>';
  }
  /* after a change to one project's team: that project, the lists, and this tab */
  function tmAfter(p) { wkAfter(p); pdAfterTeam(p); tmPaint(); }
  function tmFocus(m, sel) { var f = tmEl.list.querySelector('[data-e="' + m.e + '"] ' + sel) || tmEl.list.querySelector('[data-e="' + m.e + '"] [data-tm="tog"]'); if (f) f.focus({ preventScroll: true }); }
  function tmJoin(p, m, role) {
    if (!p || !tmMine(p) || tmOnProject(p, m.e)) return;
    if (!fbRoleOk(p, role)) { fbNoVwSay(); return; }   /* v92 (32.1) */
    if (invNeeds(p)) { showToast(drSyEmail() ? 'Connect Google Drive first: a project is shared with your team through it.' : 'Sign in to ScopeDue first: a project is shared with your team through your Google Drive.'); stGo(drSyEmail() ? 'drive' : 'portal'); return; }   /* v76 */
    var t = { n: m.n, e: m.e, role: role === 'Viewer' ? 'Viewer' : 'Editor', seen: '', c: m.c, fresh: true }, note;
    p.team.push(t); note = pdNote(p, 'You added ' + t.n + ' to the project');
    tmAfter(p); tmFocus(m, '[data-tm="leave"][data-pj="' + p.id + '"]');
    if (dvKind(p) && !p.x8) dvTeamStart(p);   /* the same Drive invitation as Add people on the project */
    showToast('Added ' + m.n + ' to ' + p.n + vpAdded(p, [t]), function () { var j = p.team.indexOf(t); if (j > -1) p.team.splice(j, 1); pdUnnote(p, note); tmAfter(p); });
    setTimeout(function () { t.fresh = false; }, 2000);
  }
  function tmLeave(p, m) {
    var j = p ? tmIdx(p, m) : -1; if (j < 0 || !tmMine(p)) return;
    var x = p.team[j], back = wkRelease(p, x.e), owner = p.owner === x.n;
    p.team.splice(j, 1); if (owner) p.owner = 'You';
    tmAfter(p); tmFocus(m, '[data-tm="tog"]');
    showToast('Removed ' + m.n + ' from ' + p.n + (back.n ? '. ' + itemsLbl(back.n) + (back.n === 1 ? ' is' : ' are') + ' unassigned' : ''), function () { p.team.splice(j, 0, x); if (owner) p.owner = x.n; back.undo(); tmAfter(p); });
  }
  function tmProjRole(p, m, role) {
    var x = p ? p.team[tmIdx(p, m)] : null; if (!x || !tmMine(p) || x.role === role || x.role === 'Owner') return;
    if (!fbRoleOk(p, role)) { fbNoVwSay(); tmPaint(); return; }   /* v92 (32.1) */
    var old = x.role, back = role === 'Viewer' ? wkRelease(p, x.e) : { n: 0, undo: function () {} };
    x.role = role; tmAfter(p);
    var vw = role === 'Viewer' ? vpAdded(p, [x]) : '';   /* v112 (69) */
    showToast(m.n + ' is now ' + (role === 'Editor' ? 'an Editor' : 'a Viewer') + ' on ' + p.n + (back.n ? '. ' + itemsLbl(back.n) + (back.n === 1 ? ' is' : ' are') + ' unassigned' : '') + vw, function () { x.role = old; back.undo(); tmAfter(p); });
  }
  function tmPaint() {
    var h = '<li class="st-m me"><span class="av me" style="--c:' + ME.c + '">' + ME.ini + '</span><div class="st-m-t"><b>You</b>' + (x8Me() ? '<small>' + esc(x8Me()) + '</small>' : '') + '</div><span class="st-m-n"></span><span class="chip">Workspace owner</span><div class="st-m-a"></div></li>';
    h += TEAM.length ? TEAM.map(tmRow).join('') : '<li class="st-empty"><span class="st-empty-i" aria-hidden="true">' + IC('users') + '</span><b>Your team is just you</b><p>Add the people you work with. Then you can put them on a project.</p></li>';
    if (tmEl.list._h !== h) { tmEl.list._h = h; tmEl.list.innerHTML = h; }
    tmEl.note.textContent = TEAM.length ? 'The starting role is what someone gets when you add them to a project. You can change it on each project. This list is saved with your projects and goes into a copy you export. Adding someone here sends nothing. An Editor is invited by email and through Google Drive when you add them to a private project; a Viewer gets a link to the Viewer portal, which opens for the project.' : '';
    tmEl.note.hidden = !TEAM.length;
    stPaintTabs();
  }
  tmEl.list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tm]'), li, m, a, f;
    if (!b) return;
    li = b.closest('.st-m'); m = li && tmFind(li.getAttribute('data-e')); a = b.getAttribute('data-tm');
    if (a === 'cancel') { tmAsk = ''; tmPaint(); f = tmEl.list.querySelector('[data-e="' + (m ? m.e : '') + '"] [data-tm="rm"]'); if (f) f.focus({ preventScroll: true }); return; }
    if (!m) return;
    if (a === 'tog') { if (tmOpenE[m.e]) delete tmOpenE[m.e]; else tmOpenE[m.e] = 1; tmPaint(); tmFocus(m, '[data-tm="tog"]'); return; }
    if (a === 'open') { openProject(b.getAttribute('data-pj'), 'team', b); return; }
    if (a === 'leave') { tmLeave(pdById(b.getAttribute('data-pj')), m); return; }
    if (a === 'edit') tmOpen(m, b);
    else if (a === 'rm') {
      if (!tmProjects(m).length) { tmRemove(m); return; }
      tmAsk = m.e; tmPaint(); f = tmEl.list.querySelector('[data-tm="cancel"]'); if (f) f.focus({ preventScroll: true });
    } else if (a === 'rm-go') tmRemove(m);
  });
  tmEl.list.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-tm-add]'), li, m; if (!f) return;
    e.preventDefault();
    li = f.closest('.st-m'); m = li && tmFind(li.getAttribute('data-e'));
    if (m && f.elements.p.value) tmJoin(pdById(f.elements.p.value), m, f.elements.r.value);
  });
  tmEl.list.addEventListener('change', function (e) {
    var s = e.target.closest('[data-tm-role]'), li, m, old, pr = e.target.closest('[data-tm-pr]'), f = e.target.closest('[data-tm-add]');
    if (f) { f.querySelector('[type="submit"]').disabled = !f.elements.p.value; return; }
    if (pr) { li = pr.closest('.st-m'); m = li && tmFind(li.getAttribute('data-e')); if (m) tmProjRole(pdById(pr.getAttribute('data-tm-pr')), m, pr.value === 'Viewer' ? 'Viewer' : 'Editor'); return; }
    if (!s) return;
    li = s.closest('.st-m'); m = li && tmFind(li.getAttribute('data-e'));
    if (!m || m.role === s.value) return;
    old = m.role; m.role = s.value === 'Viewer' ? 'Viewer' : 'Editor';
    showToast(m.n + ' starts as ' + (m.role === 'Editor' ? 'an Editor' : 'a Viewer') + ' on new projects', function () { m.role = old; tmPaint(); });
  });
  function tmRemove(m) {
    var d = tmDrop(m), idx;
    tmAsk = ''; tmPaint();
    showToast('Removed ' + m.n + ' from your team' + (d.p ? ' and ' + (d.p === 1 ? '1 project' : d.p + ' projects') : '') + (d.n ? '. ' + itemsLbl(d.n) + (d.n === 1 ? ' is' : ' are') + ' unassigned' : ''), function () { d.undo(); tmPaint(); });
  }

  /* ---- the drawer: add or edit one person ---- */
  var tmForm = pfId('tm-form'), tmNameEl = pfId('tm-name'), tmEmailEl = pfId('tm-email'), tmRoleEl = pfId('tm-role'), tmRoleVal = 'Editor', tmEdit = null;
  var TM_DESC = { Editor: 'Editors draft and respond. Only the Owner issues Scope.', Viewer: 'Viewers will use what you build. They do not open ScopeDue: you record what they ask for, report, test and approve in Feedback.' };
  function tmPreview() {
    var n = tmName(tmNameEl.value), e = tmEmailEl.value.trim(), has = !!n;
    tmForm.querySelector('.cf-prev').classList.toggle('empty', !has);
    pfId('tm-av').textContent = has ? initials(n) : '?';
    pfId('tm-pn').textContent = has ? n : 'Teammate';
    pfId('tm-ps').textContent = has ? tmRoleVal + (e ? ' · ' + e : '') : 'Appears here as you type';
  }
  function tmOpen(m, trigger) {
    tmEdit = m || null; tmRoleVal = m ? m.role : 'Editor';
    tmForm.reset(); tmNameEl.value = m ? m.n : ''; tmEmailEl.value = m ? m.e : '';
    setPressed(tmRoleEl, tmRoleVal); pfId('tm-role-d').textContent = TM_DESC[tmRoleVal];
    syFErr('f-tm-name', ''); syFErr('f-tm-email', '');
    pfId('dtm-title').textContent = m ? 'Edit ' + m.n : 'Add to your team';
    pfId('tm-sub').textContent = m ? 'Changes reach every project this person is on.' : 'Once they are here, any project can add them.';
    pfId('tm-go').textContent = m ? 'Save' : 'Add to team';
    tmPreview();
    openDrawer('member', trigger || pfId('tm-add'), '#tm-name');
  }
  tmNameEl.addEventListener('input', function () { syFErr('f-tm-name', ''); tmPreview(); });
  tmEmailEl.addEventListener('input', function () { syFErr('f-tm-email', ''); tmPreview(); });
  tmRoleEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    tmRoleVal = b.getAttribute('data-f'); setPressed(tmRoleEl, tmRoleVal); pfId('tm-role-d').textContent = TM_DESC[tmRoleVal]; tmPreview();
  });
  function tmSave() {
    var n = tmName(tmNameEl.value), e = tmKey(tmEmailEl.value), en = '', ee = '', first = null;
    if (!n) en = 'Enter a name.';
    else if (fold(n) === 'you') en = 'Choose a name other than You.';
    else if (TEAM.some(function (x) { return x !== tmEdit && fold(x.n) === fold(n); })) en = 'Someone on your team already has that name.';
    if (!e) ee = 'Enter an email address.';
    else if (!tmEmailOk(e)) ee = 'That email does not look right.';
    else if (TEAM.some(function (x) { return x !== tmEdit && x.e === e; })) ee = 'Already on your team.';
    syFErr('f-tm-name', en); syFErr('f-tm-email', ee);
    first = en ? tmNameEl : ee ? tmEmailEl : null;
    if (first) { first.focus(); return; }
    if (tmEdit) tmApply(tmEdit, n, e, tmRoleVal);
    else {
      var m = { n: n, e: e, role: tmRoleVal, c: PD_COLORS[TEAM.length % PD_COLORS.length] };
      TEAM.push(m);
      showToast(n + ' is on your team', function () { tmDrop(m); tmPaint(); });
    }
    closeDrawer(); tmPaint();
  }
  /* a name or an email changed: every project that has this person says the new one */
  function tmApply(m, n, e, role) {
    var on = m.n, oe = m.e, same = on === n && oe === e && m.role === role;
    PROJECTS.forEach(function (p) {
      if (!tmOnProject(p, oe)) return;
      p.team.forEach(function (x) { if (tmKey(x.e) === oe) { x.n = n; x.e = e; } });
      if (on !== n) { if (p.owner === on) p.owner = n; (p.mentions || []).forEach(function (q) { if (q.who === on) q.who = n; }); }
      if (oe !== e) tmRekeyWork(p, oe, e);
    });
    m.n = n; m.e = e; m.role = role;
    if (!same) { pdRender(); showToast('Saved ' + n); }
  }
  tmForm.addEventListener('submit', function (e) { e.preventDefault(); tmSave(); });
  tmForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); tmSave(); } });
  pfId('tm-add').addEventListener('click', function (e) { tmOpen(null, e.currentTarget); });

  /* ---- add to a project: only the people on the list ---- */
  var invForm = pfId('inv'), invList = pfId('inv-list'), invNone = pfId('inv-none'), invGo = pfId('inv-go');
  function invCands() { var p = pd.p; return p ? TEAM.filter(function (m) { return !tmOnProject(p, m.e); }) : []; }
  function invCount() {
    var n = invList.querySelectorAll('input:checked').length;
    invGo.disabled = !n; invGo.textContent = n > 1 ? 'Add ' + n + ' people' : 'Add';
  }
  /* v76: a private project's team works through the Owner's Google Drive (29.17), so nobody is added before it is connected:
     signed in to ScopeDue first, then Drive. '' when the project needs neither, or has both */
  function invNeeds(p) { return dvKind(p) && !p.x8 && !(drSyEmail() && dvOn()); }   /* v88: client projects too (29.21) */
  /* the step itself, the same wherever it is asked for: t says why, for each of its three states (in: not signed in, ext: the web
     app, where Drive cannot connect, drive: Drive not connected). Its buttons are data-drg, answered below */
  function drGateHTML(t) {
    if (!drSyEmail()) return '<b>Sign in to ScopeDue first</b><p>' + t.in + '</p><button type="button" class="btn-primary btn-sm" data-drg="in">Sign in</button>';
    if (!drReady()) return '<b>Connect Google Drive in the extension</b><p>' + t.ext + '</p>';
    return '<b>Connect Google Drive first</b><p>' + t.drive + '</p>' + (DR.msg ? '<p class="sy-bad" role="status">' + esc(DR.msg) + '</p>' : '') +
      '<button type="button" class="btn-primary btn-sm" data-drg="drive"' + (DR.busy ? ' disabled' : '') + '>' + (DR.busy ? 'Connecting…' : DR.st === 'again' ? 'Sign in to Google again' : 'Connect Google Drive') + '</button>';
  }
  function invGateHTML() {
    return drGateHTML({ in: 'A project is shared with your team through your Google Drive, and the people you add are invited from your ScopeDue account.',
      ext: 'A project is shared with your team through your Google Drive, encrypted. Google Drive connects in the ScopeDue extension in Chrome: add your teammates there.',
      drive: 'A project is shared with your team through your Google Drive, encrypted. Connect the Google account you sign in to ScopeDue with (' + esc(drSyEmail()) + '), then choose who to add.' });
  }
  function invOnOpen() {
    var p = pd.p, c = invCands(), h = '', gate = pfId('inv-gate');
    pfId('inv-sub').textContent = (p ? p.n + '. ' : '') + 'Choose from your team.';
    gate.hidden = !invNeeds(p);
    if (!gate.hidden) {
      gate.innerHTML = invGateHTML(); invList.hidden = true; invNone.hidden = true; pfId('inv-more').hidden = true; invGo.disabled = true;
      return gate.querySelector('button') ? '#inv-gate button' : '#inv-gate';
    }
    pfId('inv-more').hidden = false;
    c.forEach(function (m) {
      h += '<li class="inv-row"><label class="inv-lb"><input type="checkbox" value="' + esc(m.e) + '"><span class="inv-box" aria-hidden="true">' + IC('tick') + '</span>' + pdAv(m) + '<span class="inv-t"><b>' + esc(m.n) + '</b><small>' + esc(m.e) + '</small></span></label>' +
        '<span class="pd-sel"><select data-inv-role aria-label="Role for ' + esc(m.n) + '">' + fbRoleOpts(pd.p, m.role) + '</select>' + IC('chev') + '</span></li>';
    });
    invList.innerHTML = h; invList.hidden = !c.length; invNone.hidden = !!c.length;
    pfId('inv-none-t').textContent = TEAM.length ? 'Everyone is already here' : 'Your team is empty';
    pfId('inv-none-d').textContent = TEAM.length ? 'Everyone on your team is already on this project.' : 'Add the people you work with in Settings. Then you can put them on any project.';
    pfId('inv-settings').textContent = TEAM.length ? 'Add them to your team in Settings' : 'Add your first member in Settings';
    pfId('inv-more').firstChild.nodeValue = TEAM.length ? 'Someone new? ' : '';
    invCount();
    return c.length ? '#inv-list input' : '#inv-settings';
  }
  invList.addEventListener('change', function (e) {
    var s = e.target.closest('[data-inv-role]'), cb;
    if (s) { cb = s.closest('li').querySelector('input'); cb.checked = true; }
    invCount();
  });
  pfId('inv-settings').addEventListener('click', function () { closeDrawer(true); stGo('team'); tmOpen(null, pfId('tm-add')); });
  /* the step's buttons, in Add to this project and in New project (a client project, 40) */
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-drg]'); if (!b || b.disabled) return;
    if (b.getAttribute('data-drg') === 'in') { closeDrawer(true); stGo('portal'); openDrawer('sync'); return; }
    b.disabled = true; b.textContent = 'Connecting…';
    await drRefresh(true);
    var f = null;
    if (openEl && openEl.id === 'drawer-invite') f = invOnOpen();
    else if (openEl && openEl.id === 'drawer-npj') { npjSetKind(npjKind); f = '#npj-go'; }
    var el = f && openEl.querySelector(f); if (el && !el.disabled) el.focus({ preventScroll: true });
  });
  function invSend() {
    var p = pd.p, picks = [], was, added, undo, names;
    if (!p) return;
    if (invNeeds(p)) { invOnOpen(); return; }
    [].forEach.call(invList.querySelectorAll('li'), function (li) {
      var cb = li.querySelector('input'), m;
      if (!cb.checked) return;
      m = tmFind(cb.value);   // the list is the only source
      if (m && !tmOnProject(p, m.e) && !picks.some(function (x) { return x.m === m; })) picks.push({ m: m, role: li.querySelector('select').value === 'Viewer' && fbRoleOk(p, 'Viewer') ? 'Viewer' : 'Editor' });
    });
    if (!picks.length) return;
    was = p.team.length;
    added = picks.map(function (x) {
      var t = { n: x.m.n, e: x.m.e, role: x.role, seen: '', c: x.m.c, fresh: true };
      p.team.push(t);
      return { t: t, note: pdNote(p, 'You added ' + t.n + ' to the project') };
    });
    closeDrawer(true);
    pdAfterTeam(p, was === 0);
    if (dvKind(p) && !p.x8) dvTeamStart(p);   /* v69: a team works through Google Drive (29.17); v88: client projects too */
    undo = function () { added.forEach(function (a) { var i = p.team.indexOf(a.t); if (i > -1) p.team.splice(i, 1); pdUnnote(p, a.note); }); pdAfterTeam(p); };
    names = picks.map(function (x) { return x.m.n; });
    showToast('Added ' + (names.length === 1 ? names[0] : names.length === 2 ? names[0] + ' and ' + names[1] : names[0] + ' and ' + (names.length - 1) + ' more') + vpAdded(p, added.map(function (a) { return a.t; })), undo);   /* v112 (69): a Viewer's link */
    setTimeout(function () { added.forEach(function (a) { a.t.fresh = false; }); }, 2000);
  }
  invForm.addEventListener('submit', function (e) { e.preventDefault(); invSend(); });
  invForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); invSend(); } });

