  /* ---------- header: quick find ---------- */
  var qfIn = document.getElementById('q'), qfBox = document.getElementById('qf'), qfLive = document.getElementById('qf-live');
  var qfW = document.querySelector('.search-w'), qfTop = document.querySelector('.topbar');
  var qsBtn = document.getElementById('qs-btn'), qsX = document.getElementById('qs-x');
  var qfMQ = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  var qfOpen = false, qfSel = -1, qfRows = [];
  qfBox.innerHTML = '<div class="qf-body" id="qf-body"></div><div class="qf-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd>to move</span><span><kbd>↵</kbd>to open</span><span><kbd>Esc</kbd>to close</span></div>';
  var qfBody = document.getElementById('qf-body');
  if (!/Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''))) document.getElementById('k-cmd').textContent = 'Ctrl K';

  var QF_KIND = { support: 'Support', update: 'Update', feedback: 'Feedback', team: 'Team' };
  function qfThread(id, o) {
    showView('inbox');
    ibFilter = 'all'; setPressed(ibSeg, 'all'); ibQ.value = ''; ibRenderList();
    ibOpen(id, o || { show: true });
    var r = ibList.querySelector('[data-id="' + id + '"]'); if (r) r.scrollIntoView({ block: 'nearest' });
  }
  var QF_PAGES = [
    { t: 'Dashboard', s: 'What needs attention today', ic: 'home', k: 'home overview priority', go: function () { showView('dashboard'); } },
    { t: 'Projects', s: 'Private and client projects', ic: 'folder', k: 'work list', go: function () { showView('projects'); } },
    { t: 'Clients', s: 'Everyone you work with', ic: 'users', k: 'customers portal', go: function () { showView('clients'); } },
    { t: 'Help', s: 'What’s new, contact support and shortcuts', ic: 'help', k: 'support contact email updates whats new changelog release feedback idea suggest shortcuts keyboard keys', go: function () { showView('inbox'); } },
    { t: 'Profile', s: 'Name, photo and working hours', ic: 'user', k: 'account avatar me photo name', go: function () { showView('profile'); } },
    { t: 'Settings', s: 'Appearance, defaults, portal and storage', ic: 'sliders', k: 'preferences portal server notifications theme dark light sidebar defaults quote backup export data about version', go: function () { showView('settings'); } },
    { t: 'Team', s: 'The people a project can add', ic: 'users', k: 'members roster people collaborators editors viewers invite add settings', go: function () { stGo('team'); } },
    { t: 'Plan & billing', s: 'Free or paid, and billing', ic: 'tick', k: 'plan upgrade pay paid subscription billing stripe invoice receipt card cancel pro price settings', go: function () { stGo('plan'); } },   // api.php 1.27.0 (95)
    { t: 'GitHub', s: 'Link pull requests and issues to work', ic: 'pr', k: 'github pull request pr issue token private repository checks merge', go: function () { stGo('github'); } },
    { t: 'Google Drive', s: 'Your project files and Drive storage', ic: 'folder', k: 'drive google files folder storage space quota account settings', go: function () { stGo('drive'); } },
    { t: 'Storage & data', s: 'What ScopeDue keeps on this device', ic: 'shield', k: 'storage space size usage disk quota backup export import erase data settings', go: function () { stGo('storage'); } }
  ];
  function qfActs() {
    var u = nUnread();
    return x6QfActs().concat([
      { t: 'New project', s: 'Start a client or private project', ic: 'plus', k: 'add create start', go: function (tr) { openDrawer('npj', tr, '#npj-n'); } },
      { t: 'New client', s: 'Add a client and set up their portal', ic: 'plus', k: 'add create invite', go: function (tr) { openDrawer('client-new', tr, '#cf-name'); } },
      { t: 'Contact support', s: 'Send the ScopeDue team a message', ic: 'send', k: 'contact help support write message bug problem email', go: function () { xbGo('support'); } },
      { t: 'Change profile photo', s: 'Upload and crop a new picture', ic: 'camera', k: 'avatar picture image', go: function (tr) { showView('profile'); openDrawer('photo', tr); } },
      { t: 'Notifications', s: u ? u + ' unread' : 'All caught up', ic: 'bell', k: 'alerts bell', go: function () { openNotif(); } },
      { t: 'Add team member', s: 'Put someone on your team list', ic: 'plus', k: 'invite people collaborator editor viewer roster', go: function (tr) { stGo('team'); tmOpen(null, tr); } },
      { t: 'Export a copy', s: 'Download your projects, clients and notes', ic: 'doc', k: 'backup save data json', go: function () { ldExport(); } }
    ]).concat(!SY.key || SY.st === 'auth' ? [{ t: SY.key ? 'Sign in again' : 'Sign in', s: 'Google or email, so clients can approve', ic: 'lock', k: 'login log in google connect server sync api setup portal', go: function (tr) { stGo('portal'); openDrawer('sync', tr); } }] : [{ t: 'Sign out', s: 'End the portal sign-in on this browser', ic: 'arrow', k: 'logout log out disconnect', go: function () { sySignOut(); } }]);
  }
  function qfProjects() {
    return PROJECTS.map(function (p) {
      var c = p.cid && byId(p.cid);
      return { t: p.n, s: (p.kind === 'client' ? 'Client' : 'Private') + ' project · ' + (p.team.length ? 'Team' : 'Solo'), mk: p.m, x: p.kind + ' ' + (c ? c.name : '') + ' ' + (p.next || '') + ' ' + (p.focus || ''),
        go: function () { openProject(p.id, 'workspace', qfIn); } };
    });
  }
  function qfClients() {
    return CLIENTS.map(function (c) {
      return { t: c.name, s: [c.contact, c.role].filter(Boolean).join(' · '), mk: c.ini, x: c.contact + ' ' + (c.email || ''), go: function () { openClient(c.id, qfIn); } };
    });
  }
  function qfMessages() {
    return [];   // the old conversations are kept in the data, not shown (section 26)
    return THREADS.slice().sort(function (a, b) { return b.ord - a.ord; }).map(function (t) {
      return { t: t.title, s: QF_KIND[t.kind] + ' · ' + (t.since || '') + (t.unread ? ' · Unread' : ''), ic: 'chat', x: QF_KIND[t.kind], go: function () { qfThread(t.id, { show: true }); } };
    });
  }
  function qfScore(it, toks) {
    var lt = sdT(it.t), hay = fold(lt) + ' ' + fold(it.t) + ' ' + fold(sdT(it.s || '')) + ' ' + fold((it.k || '') + ' ' + (it.x || '')), sc = 0;
    for (var i = 0; i < toks.length; i++) {
      var at = hay.indexOf(toks[i]); if (at < 0) return -1;
      var ts = fold(lt), ti = ts.indexOf(toks[i]); if (ti < 0) { ts = fold(it.t); ti = ts.indexOf(toks[i]); }
      sc += ti === 0 ? 0 : ti > 0 && ts.charAt(ti - 1) === ' ' ? 1 : ti > 0 ? 3 : 6;
    }
    return sc;
  }
  function qfMark(txt, toks) {
    var f = '', map = [], i, j, c;
    for (i = 0; i < txt.length; i++) { c = fold(txt.charAt(i)); for (j = 0; j < c.length; j++) { f += c.charAt(j); map.push(i); } }
    var on = [];
    toks.forEach(function (t) { var at = f.indexOf(t); while (at > -1) { for (var k = at; k < at + t.length; k++) on[map[k]] = true; at = f.indexOf(t, at + t.length); } });
    var out = '', open = false;
    for (i = 0; i < txt.length; i++) {
      if (!!on[i] !== open) { out += open ? '</mark>' : '<mark>'; open = !open; }
      out += esc(txt.charAt(i));
    }
    return out + (open ? '</mark>' : '');
  }
  function qfGroups() {
    var toks = fold(qfIn.value.trim()).split(/\s+/).filter(Boolean);
    function pick(list, cap) {
      if (!toks.length) return list.slice(0, cap);
      return list.map(function (it, i) { return { it: it, sc: qfScore(it, toks), i: i }; })
        .filter(function (r) { return r.sc >= 0; }).sort(function (a, b) { return a.sc - b.sc || a.i - b.i; }).slice(0, cap).map(function (r) { return r.it; });
    }
    var q = toks.length, x6q = q ? x6Qf() : null, pfq = q ? pfQf() : null;   // v105 (62): what a client project's record holds
    return { toks: toks, groups: [
      { g: 'Pages', items: pick(QF_PAGES, q ? 3 : 5) },
      { g: 'Actions', items: pick(qfActs(), q ? 3 : 5) },
      { g: 'Projects', items: q ? pick(qfProjects(), 4) : [] },
      { g: 'Work', items: q ? pick(x6q.work, 4) : [] },
      { g: 'Notes', items: q ? pick(x6q.notes, 3) : [] },
      { g: 'Ideas and Later', items: q ? pick(x6q.ideas, 3) : [] },
      { g: 'Decisions', items: q ? pick(x6q.decs, 3) : [] },
      { g: 'Links', items: q ? pick(x6q.links, 3) : [] },
      { g: 'Scope', items: q ? pick(pfq.scope, 4) : [] },
      { g: 'Changes', items: q ? pick(pfq.changes, 4) : [] },
      { g: 'Delivery', items: q ? pick(pfq.delivery, 3) : [] },
      { g: 'Evidence', items: q ? pick(pfq.evidence, 3) : [] },
      { g: 'Clients', items: q ? pick(qfClients(), 4) : [] },
      { g: 'Messages', items: q ? pick(qfMessages(), 3) : [] }
    ] };
  }
  function qfRender() {
    var r = qfGroups(), n = 0;
    qfRows = [];
    var html = r.groups.filter(function (g) { return g.items.length; }).map(function (g) {
      return '<div role="group" aria-label="' + g.g + '"><div class="qf-g" aria-hidden="true">' + g.g + '</div>' + g.items.map(function (it) {
        qfRows.push(it);
        var ic = it.ic ? '<svg class="i" aria-hidden="true"><use href="#i-' + it.ic + '"/></svg>' : esc(it.mk || '');
        var id = n++;
        return '<div class="qf-i" role="option" id="qf-o-' + id + '" data-n="' + id + '" aria-selected="false"><span class="qf-ic" aria-hidden="true">' + ic + '</span><span class="qf-t"><b>' + qfMark(sdT(it.t), r.toks) + '</b>' + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</span><svg class="i qf-go" aria-hidden="true"><use href="#i-arrow"/></svg></div>';
      }).join('') + '</div>';
    }).join('');
    if (!qfRows.length) html = '<div class="qf-empty"><b>No matches for “' + esc(qfIn.value.trim()) + '”</b>Try a project, note, idea, decision, link, Scope line, change, delivery or evidence.</div>';
    qfBody.innerHTML = html;
    qfSel = -1; qfSet(r.toks.length && qfRows.length ? 0 : -1);
    qfBody.scrollTop = 0;
    qfLive.textContent = r.toks.length ? (qfRows.length ? qfRows.length + (qfRows.length === 1 ? ' result' : ' results') : 'No results') : '';
  }
  function qfSet(i, scroll) {
    var prev = qfBody.querySelector('[aria-selected="true"]'); if (prev) prev.setAttribute('aria-selected', 'false');
    qfSel = i;
    var cur = i > -1 ? document.getElementById('qf-o-' + i) : null;
    if (cur) {
      cur.setAttribute('aria-selected', 'true'); qfIn.setAttribute('aria-activedescendant', cur.id);
      if (scroll) { if (i === 0) qfBody.scrollTop = 0; else cur.scrollIntoView({ block: 'nearest' }); }
    } else qfIn.removeAttribute('aria-activedescendant');
  }
  function qfPlace() {
    qfBox.style.left = '';
    if (qfTop.classList.contains('qs')) return;
    var r = qfBox.getBoundingClientRect(), over = r.right - (root.clientWidth - 12);
    if (over > 0) qfBox.style.left = (-over) + 'px';
  }
  function qfShow() {
    if (qfOpen) return;
    closeNotif(true);
    qfOpen = true; qfRender(); qfPlace();
    qfBox.setAttribute('data-open', ''); qfIn.setAttribute('aria-expanded', 'true');
  }
  function qfHide() {
    if (!qfOpen) return;
    qfOpen = false; qfBox.removeAttribute('data-open'); qfIn.setAttribute('aria-expanded', 'false'); qfIn.removeAttribute('aria-activedescendant');
  }
  function qsOpen() {
    qfTop.classList.add('qs'); qsBtn.setAttribute('aria-expanded', 'true');
    qfIn.focus(); qfShow();
  }
  function qsClose(restore) {
    qfHide(); qfTop.classList.remove('qs'); qsBtn.setAttribute('aria-expanded', 'false'); qfIn.value = '';
    if (restore) qsBtn.focus({ preventScroll: true });
  }
  function qfShortcut() {
    if (qfMQ.matches) { qsOpen(); return; }
    qfIn.focus(); qfIn.select(); qfShow();
  }
  function qfGo(i) {
    var it = qfRows[i]; if (!it) return;
    var wasQs = qfTop.classList.contains('qs');
    qfHide(); qfIn.value = '';
    if (wasQs) qsClose(false);
    it.go(qfIn);
  }
  qfIn.addEventListener('input', function () { if (!qfOpen) qfShow(); else qfRender(); });
  qfIn.addEventListener('click', function () { qfShow(); });
  qfIn.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!qfOpen) { qfShow(); if (k === 'ArrowDown' && qfRows.length) qfSet(0, true); return; }
      if (!qfRows.length) return;
      var n = qfRows.length, nx = qfSel < 0 ? (k === 'ArrowDown' ? 0 : n - 1) : (qfSel + (k === 'ArrowDown' ? 1 : -1) + n) % n;
      qfSet(nx, true);
    } else if (k === 'Enter') {
      if (qfOpen && qfSel > -1) { e.preventDefault(); qfGo(qfSel); }
    } else if (k === 'Escape') {
      if (qfOpen) { e.preventDefault(); e.stopPropagation(); qfHide(); if (qfTop.classList.contains('qs')) qsClose(true); }
      else if (qfIn.value) { e.preventDefault(); qfIn.value = ''; }
      else if (qfTop.classList.contains('qs')) { e.preventDefault(); qsClose(true); }
      else qfIn.blur();
    }
  });
  qfBox.addEventListener('mousedown', function (e) { e.preventDefault(); });
  qfBox.addEventListener('mousemove', function (e) { var o = e.target.closest('.qf-i'); if (o) { var n = +o.getAttribute('data-n'); if (n !== qfSel) qfSet(n); } });
  qfBox.addEventListener('click', function (e) { var o = e.target.closest('.qf-i'); if (o) qfGo(+o.getAttribute('data-n')); });
  qfW.addEventListener('focusout', function (e) { if (qfOpen && !qfW.contains(e.relatedTarget)) { if (qfTop.classList.contains('qs') && e.relatedTarget === qsX) return; qfHide(); } });
  document.addEventListener('pointerdown', function (e) { if (qfOpen && !qfW.contains(e.target)) qfHide(); });
  qsBtn.addEventListener('click', qsOpen);
  qsX.addEventListener('click', function () { qsClose(true); });
  window.addEventListener('resize', function () { if (qfOpen) qfPlace(); });
  if (qfMQ.addEventListener) qfMQ.addEventListener('change', function () { if (!qfMQ.matches && qfTop.classList.contains('qs')) qsClose(false); });

