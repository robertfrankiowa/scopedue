  /* ---------- Dashboard: priority attention ---------- */
  /* Not a second list. It reads what every project's Workspace tab reads (pdNeeds) and puts it in one order:
     what is already unprotected, what is due, who is waiting on you, who you must chase, what is stuck, then the rest */
  function dbNeedRank(n) {
    if (n.chip === 'crit') return n.date ? 0 : 1;
    if (n.date) return 2;
    if (n.cr) return 3;
    if (/^Chase /.test(n.t)) return 4;
    if (n.chipT === 'Stuck') return 5;
    if (n.chip === 'warn') return 6;
    return 7;
  }
  function dbItems() {
    var out = [];
    PROJECTS.forEach(function (p, pi) {
      if (p.kind === 'client' && !p.sc) return;
      pdNeeds(p).forEach(function (n, ni) { out.push({ p: p, n: n, r: dbNeedRank(n), pi: pi, ni: ni, k: n.date ? 'due' : 'action' }); });
    });
    return out.sort(function (a, b) { return (a.r - b.r) || (a.pi - b.pi) || (a.ni - b.ni); });
  }
  function dbKind(p) { return { client: 'Client', product: 'Product', internal: 'Internal' }[pdMode(p)]; }
  function dbName(p) { var c = p.kind === 'client' && byId(p.cid); return c ? c.name : p.n; }
  function dbWhen(t) { return /today/i.test(t) ? 'today' : /^In 1 day/i.test(t) ? 'tomorrow' : String(t || '').toLowerCase(); }
  function dbRowHTML(it, withKind) {
    var n = it.n, tone = n.chip === 'crit' ? 'crit' : n.chip === 'warn' ? 'warn' : '';
    /* v130: the Change's code once, as a tag before the title (as Plan today shows it), and taken off the front of the line under it */
    var tag = n.cr && String(n.t).indexOf(n.cr) < 0 && !/ \d+ items$/.test(n.t) ? n.cr : '', np = String(n.p || '');
    if (tag && np.indexOf(tag + ' ') === 0) np = np.slice(tag.length + 1);
    return '<li' + (withKind ? ' data-kind="' + it.k + '"' : '') + '><a href="#" class="row' + (tone === 'crit' ? ' is-crit' : '') + '" data-db-go="' + it.p.id + '" data-tab="' + esc(n.tab || 'workspace') + '"' + (n.f ? ' data-f="' + esc(n.f) + '"' : '') + (n.cr ? ' data-cr="' + n.cr + '"' : '') + '>' +
      '<span class="sd' + (tone ? ' ' + tone : '') + '" aria-hidden="true"></span><span><h3>' + (tag ? '<span class="td-cr">' + esc(tag) + '</span>' : '') + esc(n.t) + '</h3><p>' + esc(np) + '</p></span>' +
      '<span class="meta"><span class="chip ' + (n.chip || 'quiet') + '">' + esc(n.chipT || 'Action needed') + '</span>' + (n.date ? '<span class="date">' + esc(n.date) + '</span>' : '') + '</span>' + IC('chev') + '</a></li>';
  }
  /* groups come out in the order of their most urgent item. all: the items of every project, so a group can say "3 of 8" */
  function dbGroupsHTML(list, all, withKind) {
    var order = [], by = {};
    list.forEach(function (it) { if (!by[it.p.id]) { by[it.p.id] = []; order.push(it.p); } by[it.p.id].push(it); });
    return order.map(function (p) {
      var mine = by[p.id], tot = all.filter(function (x) { return x.p === p; }), crit = tot.filter(function (x) { return x.n.chip === 'crit'; });
      var meta = '<span class="g-n">' + (mine.length < tot.length ? mine.length + ' of ' + itemsLbl(tot.length).replace(/^\d+ /, tot.length + ' ') : itemsLbl(tot.length)) + '</span>';   /* v130: the row under it says overdue; the head says how many */
      /* v126: the same mark as Continue your work and the Projects list, and the kind by the name a project page uses */
      return '<div class="group"><div class="g-h"><div class="g-name"><span class="pj-av g-av' + (p.kind === 'client' ? '' : ' priv') + '" aria-hidden="true">' + esc(p.m) + '</span><span class="t" title="' + esc(p.n) + '">' + esc(sideName(p)) + '</span><span class="tag">' + dbKind(p) + '</span></div><span class="g-meta">' + meta + '</span></div>' +
        '<ul class="rows">' + mine.map(function (it) { return dbRowHTML(it, withKind); }).join('') + '</ul></div>';
    }).join('');
  }
  var DB_TOP = 5;
  function dbPriority() {
    var every = dbItems(), all = every.filter(dbHard), soft = every.length - all.length, top = all.slice(0, DB_TOP), rest = all.slice(DB_TOP), due = all.filter(function (x) { return x.k === 'due'; });
    var box = document.getElementById('dash-prio'); if (!box) return;
    var projects = function (l) { var m = {}; l.forEach(function (x) { m[x.p.id] = 1; }); return Object.keys(m).length; };
    var more = document.getElementById('prio-more');
    box.innerHTML = all.length ? dbGroupsHTML(top, all, false) :
      '<div class="prio-clear"><span class="mw-ok" aria-hidden="true">' + IC('tick') + '</span><b>All clear</b><p>Nothing needs your attention across your projects.</p></div>';
    /* v126: no "3 of 3" and no second View all in the head; what is not shown is said once, under the list (prio-more) */
    document.getElementById('prio-count').textContent = top.length + ' of ' + all.length;
    document.getElementById('prio-count').hidden = document.getElementById('prio-all').hidden = true;
    more.hidden = !rest.length;
    if (rest.length) document.getElementById('prio-more-t').textContent = rest.length + (rest.length === 1 ? ' more item' : ' more items') + ' across ' + projects(rest) + (projects(rest) === 1 ? ' project' : ' projects');
    /* the Priority drawer: everything, with the filter the person had */
    document.getElementById('prio-groups').innerHTML = dbGroupsHTML(all, all, true) + (soft && all.length ? '<p class="prio-note">Smaller nudges stay on each project.</p>' : '');
    if (TD) tdRender();
    var pj = projects(all);
    document.getElementById('prio-sub').textContent = all.length ? all.length + (all.length === 1 ? ' item' : ' items') + ' across ' + pj + (pj === 1 ? ' project' : ' projects') + ', most urgent first.' : 'Nothing needs your attention.';
    document.getElementById('prio-n-all').textContent = all.length; document.getElementById('prio-n-due').textContent = due.length; document.getElementById('prio-n-action').textContent = all.length - due.length;
    document.getElementById('prio-empty').innerHTML = all.length ? '<b>All clear</b>Nothing matches this filter.' : '<b>All clear</b>Nothing needs your attention right now.';
    prioApply();
    /* "Due within 48 hours" and the line under the title say the same thing the Due soon filter does */
    var kd = document.getElementById('kpi-due'), lead = document.getElementById('dash-lead'), n = due.length, over = due.filter(function (x) { return x.n.chipT === 'Overdue'; }).length, soon = n - over;
    if (kd) {
      document.getElementById('kpi-due-l').textContent = over ? 'Overdue or due soon' : 'Due within 48 hours';
      var parts = due.slice(0, 2).map(function (x) { return dbName(x.p) + ' ' + dbWhen(x.n.chipT); });
      tween(kd.querySelector('.n'), n); kd.querySelector('.n').classList.toggle('hot', due.some(function (x) { return x.n.chip === 'crit'; }));
      kd.querySelector('small').textContent = n ? parts[0] + (n > 1 ? ', +' + (n - 1) + ' more' : '') : 'Nothing due';
      kd.classList.toggle('is-zero', !n);
    }
    /* v126: the line under the title says what the figures below do not: how much needs you, and where to start.
       Deadlines are the middle figure's to say, so they are named here only when one is already overdue */
    if (lead) {
      var first = due[0] || all[0], arrow = '<svg class="i" style="width:14px;height:14px;vertical-align:-2px"><use href="#i-arrow"/></svg>';
      var go = first ? ' <a href="#" class="inline" data-db-go="' + first.p.id + '" data-tab="' + esc(first.n.tab || 'workspace') + '"' + (first.n.f ? ' data-f="' + esc(first.n.f) + '"' : '') + (first.n.cr ? ' data-cr="' + first.n.cr + '"' : '') + '>Start with ' + esc(dbName(first.p)) + ' ' + arrow + '</a>' : '';
      var said = all.length === 1 ? (over ? '1 thing needs you, and it is overdue.' : '1 thing needs you.') : all.length + ' things need you' + (over ? ', ' + over + ' of them overdue.' : '.');
      lead.innerHTML = all.length ? '<span>' + said + '</span>' + go : '<span>Nothing needs you right now.</span>';
    }
  }
  function dbGo(pid, tab, f, cr, trigger) {
    closeDrawer(true); openProject(pid, tab || 'workspace', trigger, cr || null);
    if (f) pdGo(tab, f, cr || null);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-db-go]'); if (!a) return;
    e.preventDefault(); dbGo(a.getAttribute('data-db-go'), a.getAttribute('data-tab'), a.getAttribute('data-f'), a.getAttribute('data-cr'), a);
  });
  /* ---------- the date and the deadlines ---------- */
  function dueHTML(p) {
    return !p.due ? '<div class="c-due due none"><span>No deadline</span></div>' : '<div class="c-due due">' + (p.due.chip ? '<span class="chip ' + p.due.chip + '">' + esc(p.due.t) + '</span><span class="dt">' + esc(p.due.d) + '</span>' : '<span>' + esc(p.due.d) + '</span>') + '</div>';
  }
  /* one pass, from the real date: each project's deadline, then every place that shows a copy of it */
  function dueRefresh() {
    PROJECTS.forEach(function (p) { p.due = p.dueAt ? dueInfo(p.dueAt) : null; });
    pdRender();
    CLIENTS.forEach(function (c) {
      var moved = false, want = [];
      c.projects.forEach(function (x) {
        if (x.done) return;
        var q = pdById(x.pid); if (!q) return;
        var d = q.due ? q.due.d : 'No deadline', ch = q.due && q.due.chip || '', ct = q.due && q.due.t || '';
        if (x.date !== d || (x.chip || '') !== ch || (x.chipT || '') !== ct) { x.date = d; if (ch) { x.chip = ch; x.chipT = ct; } else { delete x.chip; delete x.chipT; } moved = true; }
        /* v130 (CONTRACT 130): a deadline already gone says so; it read "Project deadline approaching" a month after the date */
        var gone = ct === 'Overdue', late = gone ? Math.max(1, Math.round((dayStart() - dayStart(q.dueAt)) / DAY_MS)) : 0;
        if (ch) want.push({ t: gone ? 'Project deadline passed' : 'Project deadline approaching', p: gone ? 'Past the deadline by ' + x6Days(late) + '. Settle what is still open in Scope, or agree a new date with the client.' : 'Check what is still open in Scope before the deadline.', chip: ch, chipT: ct, date: d, pj: x.pid });
      });
      var DL = /^Project deadline (approaching|passed)$/, have = c.needs.filter(function (x) { return DL.test(x.t); });
      if (JSON.stringify(have) !== JSON.stringify(want)) {
        for (var i = c.needs.length - 1; i >= 0; i--) if (DL.test(c.needs[i].t)) c.needs.splice(i, 1);
        Array.prototype.unshift.apply(c.needs, want); moved = true;
      }
      if (moved) refreshRow(c);
    });
  }
  function dbToday() {
    var el = document.getElementById('dash-today'), d = new Date(); if (!el) return;
    /* v126: the month in full ("Saturday, 14 November", "Thứ Bảy, 14 tháng 11"), not the short form lists use */
    el.textContent = WDAY[d.getDay()] + ', ' + d.getDate() + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()];
  }
  var dayKey = '', dayReady = false;
  /* the page can stay open past midnight: the date, the chips and Priority attention follow */
  function dayTick() {
    if (!dayReady) return;
    var k = dayKeyNow(); if (k === dayKey) return;
    dayKey = k; dueRefresh(); dbToday(); dbPriority(); dbRecent(); dbNotif();
  }
  setInterval(dayTick, 6e4);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) dayTick(); });
  window.addEventListener('focus', dayTick);

  /* ---------- continue your work: the projects you opened last ---------- */
  var RECENT = [], REC_KEEP = 12, REC_SHOW = 3, REC_SIDE = 4;
  function recSeed() {
    RECENT = SDBOOT.restored ? sdList('recent').filter(function (r) { return r && typeof r.id === 'string' && isFinite(r.ts) && pdById(r.id); }) : [];
  }
  function recTouch(p, tab) {
    if (!p) return;
    RECENT = RECENT.filter(function (r) { return r.id !== p.id; });
    RECENT.unshift({ id: p.id, ts: Date.now(), tab: tab || 'workspace' });
    if (RECENT.length > REC_KEEP) RECENT.length = REC_KEEP;
    dbRecent();
  }
  /* where you were inside the project, so Resume lands there */
  function recTab(p, tab) { if (p && RECENT[0] && RECENT[0].id === p.id) RECENT[0].tab = tab; }
  function recAgo(ts) {
    var m = Math.floor((Date.now() - ts) / 6e4); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24); return d < 7 ? d + 'd ago' : Math.floor(d / 7) + 'w ago';
  }
  /* the projects that count as recent: Continue your work shows REC_SHOW of them, the sidebar REC_SIDE */
  function recList(n) { return RECENT.filter(function (r) { return pdById(r.id); }).slice(0, n || REC_SHOW); }
  /* the sidebar says the client's name when the client has only one project, and the project's own name when it has several */
  function sideName(p) {
    var c = p.kind === 'client' && byId(p.cid); if (!c) return p.n;
    return c.projects.filter(function (x) { return !x.done; }).length === 1 ? c.name : p.n;
  }
  function sideRecent() {
    var nav = document.getElementById('nav'), lab = document.getElementById('side-recent-l'); if (!nav || !lab) return;
    var old = {}, prev = lab;
    [].forEach.call(nav.querySelectorAll('.proj-link'), function (a) { old[a.getAttribute('data-pj')] = a; });
    recList(REC_SIDE).forEach(function (r) {
      var p = pdById(r.id), a = old[p.id], dot = p.due && p.due.chip || '';
      delete old[p.id];
      if (!a) { a = document.createElement('a'); a.className = 'nav-i proj-link'; a.setAttribute('data-pj', p.id); a.href = '#pj-' + p.id; }
      a.title = p.n; a.setAttribute('data-tip', p.n);
      var html = '<span class="pm" aria-hidden="true">' + esc(p.m) + '</span><span class="pname">' + esc(sideName(p)) + '</span>' + (dot ? '<span class="sdot ' + dot + '" aria-hidden="true"></span><span class="sr">, ' + esc(p.due.t) + '</span>' : '');
      if (a.__h !== html) { a.innerHTML = html; a.__h = html; }
      if (a.previousElementSibling !== prev) prev.parentNode.insertBefore(a, prev.nextSibling);
      prev = a;
    });
    Object.keys(old).forEach(function (k) { if (old[k].parentNode) old[k].parentNode.removeChild(old[k]); });
  }
  function dbRecent() {
    sideRecent();
    var box = document.getElementById('dash-recent'); if (!box) return;
    var list = recList();
    /* v126: the whole row resumes (the button's ::after covers it); when you were last in it sits on its own row, so the card needs no
       "Last opened" line under it */
    box.innerHTML = list.map(function (r) {
      var p = pdById(r.id);
      return '<article class="proj"><span class="pj-av' + (p.kind === 'client' ? '' : ' priv') + '" aria-hidden="true">' + esc(p.m) + '</span><div><h3 title="' + esc(p.n) + '">' + esc(p.n) + '</h3><div class="sub"><span>' + esc(pdSub(p)) + '</span><span class="ago">' + esc(recAgo(r.ts)) + '</span></div><p class="next"><b>Next step</b>' + esc(p.next || 'No next step yet') + '</p></div>' +
        '<button type="button" class="resume" data-pj="' + esc(p.id) + '" data-tab="' + esc(r.tab) + '"><span class="rl">Resume</span>' + IC('arrow') + '</button></article>';
    }).join('');
    if (!list.length) box.innerHTML = xaRecentEmpty();
    xaSide();
  }
  /* ---------- notifications: the same needs, as they arrive ----------
     Nothing is stored here but what you have read. The list is worked out from the projects: a deadline that is close, a Change
     that is waiting on you, a chase that has come due. Read stays read; when the day changes a deadline becomes a new one */
  var NT_READ = sdObj('ntread'), NT_SYNC = sdNum('ntsync', Date.now() - 3 * DAY_MS);
  var NT_CR = { question: 'Client question waiting', request: 'Change request opened', counter: 'Counter offer waiting', note: 'Client replied', quote: 'Quote to send' };
  function ntAgo(ts) {
    var m = Math.floor((Date.now() - ts) / 6e4); if (m < 1) return 'now'; if (m < 60) return m + ' min';
    var h = Math.floor(m / 60); if (h < 24) return h + ' hr';
    if (dayStart(ts) === dayAdd(-1)) return 'Yesterday';
    if (Date.now() - ts < 7 * DAY_MS) return WDAY[new Date(ts).getDay()].slice(0, 3);
    var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()];
  }
  function ntDerive() {
    var out = [], now = Date.now();
    dbItems().forEach(function (it) {
      var n = it.n, p = it.p; if (!n.date || !p.dueAt) return;
      var diff = Math.round((dayStart(p.dueAt) - dayStart()) / DAY_MS);
      out.push({ key: 'due:' + p.id + ':' + p.dueAt + ':' + (diff < 0 ? 'x' : diff), tone: diff <= 0 ? 'crit' : 'warn',
        title: diff < 0 ? 'Deadline passed' : diff === 0 ? 'Deadline is today' : diff === 1 ? 'Deadline tomorrow' : 'Deadline in ' + diff + ' days',
        text: n.p, meta: dbName(p), ts: diff < 0 ? dayStart(p.dueAt) + DAY_MS : dayStart(), go: { pid: p.id, tab: n.tab || 'workspace', f: n.f || '', cr: n.cr || '' } });
    });
    dbOwedList().forEach(function (o) {
      var w = pdParseWhen(o.at);
      out.push({ key: 'cr:' + o.p.id + ':' + o.c.id + ':' + o.at, tone: '', title: NT_CR[o.ty] || 'Client replied', text: o.c.id + ' ' + o.c.t + '. ' + o.why + '.', meta: dbName(o.p), ts: w ? w.t : now, go: { pid: o.p.id, tab: 'change', f: '', cr: o.c.id } });
    });
    PROJECTS.forEach(function (p) {
      caItems(p).forEach(function (it) {
        if (!it.due) return;
        out.push({ key: 'chase:' + p.id + ':' + it.id + ':' + it.dueAt, tone: 'warn', title: 'Time to chase ' + it.g, text: '“' + caCut(String(it.title || ''), 40) + '”: ' + it.sub + '. ' + wkWaited(it.ts) + '.', meta: dbName(p), ts: it.dueAt, go: { pid: p.id, tab: it.go.tab, f: it.go.f, cr: it.go.cr } });
      });
    });
    notes.forEach(function (n) {
      if (!x6NoteDue(n)) return;
      out.push({ key: 'rem:' + n.id + ':' + x6RemAt(n), tone: 'warn', title: n.rem < x6Iso() ? 'Reminder since ' + x6Lbl(n.rem) : 'Reminder for today', text: x6Cut(n.text, 120), meta: n.pid && pdById(n.pid) ? dbName(pdById(n.pid)) : 'Quick notes', ts: x6RemAt(n), go: n.pid && pdById(n.pid) ? { pid: n.pid, tab: 'workspace', f: '', cr: '' } : null });
    });
    if (!ldCopyNote(out)) out.push({ key: 'sys:sync', tone: '', title: 'Saved on this device', text: 'Projects, clients and notes are kept in this browser. Export a copy from Settings.', meta: 'Workspace', ts: NT_SYNC, go: null });
    x8Notes(out); x9Notes(out); xaNotes(out); dvNotes(out); tiNotes(out); fbNotes(out);   /* v121 (91): what Viewers sent */
    return out.map(function (x, i) { x.i = i; return x; }).sort(function (a, b) { return (b.ts - a.ts) || (a.i - b.i); });
  }
  function ntItemHTML(x) {
    var un = !NT_READ[x.key], g = x.go;
    return '<li class="n-item st"' + (un ? ' data-unread' : '') + (x.tone ? ' data-tone="' + x.tone + '"' : '') + ' data-nk="' + esc(x.key) + '"' +
      (g && g.view ? ' data-go="' + esc(g.view) + '" data-tab="' + esc(g.tab || '') + '"' : g ? ' data-go="project" data-pid="' + esc(g.pid) + '" data-tab="' + esc(g.tab) + '"' + (g.f ? ' data-f="' + esc(g.f) + '"' : '') + (g.cr ? ' data-cr="' + esc(g.cr) + '"' : '') : '') + '>' +
      '<button type="button" class="n-main"><span class="n-dot" aria-hidden="true"></span><span class="n-txt"><span class="n-title"><span class="sr">' + (un ? 'Unread. ' : '') + '</span>' + esc(x.title) + '</span><span class="n-text">' + esc(x.text) + '</span><span class="n-meta">' + esc(x.meta) + '</span></span><span class="n-time">' + esc(ntAgo(x.ts)) + '</span></button>' + (x.inv ? tiActsHTML(x.inv) : '') +
      '<button type="button" class="n-read" aria-label="Mark as read"' + (un ? '' : ' hidden') + '><svg class="i"><use href="#i-tick"/></svg></button></li>';
  }
  function dbNotif() {
    var list = ntDerive().filter(function (x) { return NT_READ[x.key] !== 'x'; }), t0 = dayStart();   /* v71: 'x' = cleared, gone until it changes (a new key) */
    var grp = function (label, l) { return l.length ? '<section class="n-group" aria-label="' + label + '"><div class="n-gh">' + label + '</div><ul class="n-list">' + l.map(ntItemHTML).join('') + '</ul></section>' : ''; };
    var had = notif.contains(document.activeElement), top = nBody.scrollTop;
    nBody.innerHTML = grp('Today', list.filter(function (x) { return x.ts >= t0; })) + grp('Earlier', list.filter(function (x) { return x.ts < t0; })) +
      '<div class="dr-empty" id="n-empty" hidden><b>You’re all caught up</b>New deadlines, client replies and change requests will show up here.</div>';
    document.getElementById('n-all').textContent = list.length;
    syncNotif(); applyNotif(false, true); nBody.scrollTop = top;
    if (had && nOpen) notif.focus({ preventScroll: true });
  }
  /* what was there before today has been seen. Everything that arrives after is new */
  function ntSeed() {
    var cut = Date.now() - DAY_MS;
    ntDerive().forEach(function (x) { if (x.ts < cut && !(x.key in NT_READ)) NT_READ[x.key] = true; });
    dbNotif();
  }
  var DB_WHY = { question: 'asked a question', counter: 'sent a counter offer', note: 'replied', request: 'opened a request' };
  function dbOwedList() {
    var out = [];
    PROJECTS.forEach(function (p) {
      if (p.kind !== 'client' || !p.sc) return;
      var g = given(byId(p.cid) || {}) || 'Client';
      pdCrList(p).forEach(function (c) {
        if (pdCrState(c) !== 'me') return;
        var e = c.entries[c.entries.length - 1];
        out.push({ p: p, c: c, at: e.at || '', ty: e.w === 'y' ? 'quote' : e.ty, why: e.w === 'y' ? 'Send a quote' : g + ' ' + (DB_WHY[e.ty] || 'wrote') });
      });
    });
    return out;
  }
  function dbOwedRow(o) {
    return '<li><button type="button" class="cp-ow" data-db-cr="' + o.p.id + '|' + o.c.id + '"><span class="cp-ow-t"><b><span class="id">' + o.c.id + '</span>' + esc(o.c.t) + '</b><small>' + esc(o.why) + ' · ' + esc(o.p.n) + '</small></span>' +
      (o.at ? '<span class="cp-ow-d">' + esc(o.at) + '</span>' : '<span></span>') + IC('chev') + '</button></li>';
  }
  function dbWaiting() {
    var cc = caCollect(), n = cc.n, due = cc.chase, list = dbOwedList(), owed = list.length;
    var sub = due ? due + ' to chase' : n ? 'Nothing to chase yet' : 'Nothing to chase', k = document.getElementById('kpi-wait'), ok = document.getElementById('cp-wait'), dn = document.getElementById('cp-wait-n'), dm = document.getElementById('dm-wait');
    /* v126: under the figure, not the figure again ("7 to chase") but who you have waited on longest */
    if (k) {
      tween(k.querySelector('.n'), n); k.classList.toggle('is-zero', !n);
      var old = null; cc.gs.forEach(function (g) { if (!old || g.since < old.since) old = g; });
      k.querySelector('small').innerHTML = old ? '<span>' + esc(old.items[0].g) + '</span> · <span>' + esc(wkWaited(old.since)) + '</span>' : esc(sub);
    }
    if (ok) { ok.textContent = n ? n + ' waiting on ' + (n === 1 ? 'a client' : 'clients') + (due ? ', ' + due + ' to chase' : '') : 'Nothing waiting on clients'; ok.classList.toggle('has', n > 0 && !due); ok.classList.toggle('due', due > 0); }
    if (dn) dn.textContent = n;
    if (dm) { tween(dm.querySelector('.mn'), n); dm.querySelector('.ms').textContent = sub; }
    var on = document.getElementById('cp-owed-n'), om = document.getElementById('dm-owed');
    if (on) on.textContent = owed;
    var cw = document.getElementById('cp-owe'), dw = document.getElementById('dr-owe'), mo = document.getElementById('cp-ow-more');
    if (cw) { cw.hidden = !owed; document.getElementById('cp-ow-l').innerHTML = list.slice(0, 3).map(dbOwedRow).join(''); mo.hidden = owed <= 3; mo.textContent = owed > 3 ? (owed - 3) + ' more' : ''; }
    if (dw) { dw.hidden = !owed; document.getElementById('dr-ow-l').innerHTML = list.map(dbOwedRow).join(''); }
    if (om) { tween(om.querySelector('.mn'), owed); om.querySelector('.ms').textContent = owed ? owed + (owed === 1 ? ' Change' : ' Changes') + ' waiting on you' : 'Nothing owed'; }
    var late = 0; PROJECTS.forEach(function (p) { if (agV2(p)) agM(p).ms.forEach(function (m) { if (m.st === 'late' || m.st === 'notdelivered') late++; }); });
    var ln = document.getElementById('cp-late-n'), lm = document.getElementById('dm-late');
    if (ln) ln.textContent = late;
    if (lm) { tween(lm.querySelector('.mn'), late); lm.querySelector('.ms').textContent = late ? 'Past their date' : 'Nothing late'; }
  }
  function mwEnter() { mw.sk = null; mw.sf = ''; mwRender(); }
  function mwOpen(id) {
    var p = pdById(id); if (!p) return;
    if (pd.p === p && pd.wk) { pd.wk.seg = 'work'; pd.wk.sk = null; pd.wk.sf = ''; }
    openProject(id, p.team.length ? 'team' : 'scope');
  }
  function mwAct(act, a) {
    var id = a.getAttribute('data-pj');
    if (act === 'open') mwOpen(id);
    else if (act === 'ck') mwCk(a);
    else if (act === 'dn') { mw.dn[id] = a.getAttribute('aria-expanded') !== 'true'; mwRerender('[data-mw="dn"][data-pj="' + id + '"]'); }
    else if (act === 'more') { mw.more[id] = true; mwRerender('[data-pj="' + id + '"] li.wk-r:nth-child(5) [data-wk="st"]'); }
    else if (act === 'approve' || act === 'back' || act === 'ack') x7Act(act, pdById(id), a.getAttribute('data-id'), wkHostMw);
    else if (act === 'take') x8Take(pdById(id), a.getAttribute('data-id'));
    else if (act === 'x9add') x9Open(pdById(id), a.getAttribute('data-id'), wkHostMw);
    else if (act === 'dod') wkDodOpen(pdById(id), a.getAttribute('data-id'), wkHostMw);
    else if (act === 'cp') wkCpOpen(pdById(id), a.getAttribute('data-id'), wkHostMw);
    else if (act === 'x9rm') x9Unlink(pdById(id), a.getAttribute('data-id'), +a.getAttribute('data-i'), wkHostMw);
    else if (act === 'cancel') { var k = mw.sk; mw.sk = null; mw.sf = ''; mwRerender(k ? '[data-pj="' + k.split('|')[0] + '"][data-it="' + k.split('|')[1] + '"] [data-wk="st"]' : ''); }
  }
  mwBody.addEventListener('click', function (e) {
    var a = e.target.closest('[data-mw]'); if (!a || !mwBody.contains(a)) return;
    e.preventDefault(); mwAct(a.getAttribute('data-mw'), a);
  });
  mwBody.addEventListener('change', function (e) {
    if (!e.target.hasAttribute('data-wk')) return;
    var r = e.target.closest('li.wk-r'); mw.at = r ? [].indexOf.call(mwBody.querySelectorAll('li.wk-r'), r) : -1;
    wkChange(e.target, wkHostMw); mw.at = -1;
  });
  mwBody.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-mw-form]'); if (!f) return;
    e.preventDefault(); wkSubmit(f.getAttribute('data-mw-form'), f, wkHostMw);
  });
  mwBody.addEventListener('input', function (e) { var f = e.target.closest('.prv-f'); if (f) f.removeAttribute('data-err'); });
  mwBody.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mw.sk) { e.preventDefault(); e.stopPropagation(); mwAct('cancel', e.target); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.closest('.prv-f')) { e.preventDefault(); var f = e.target.closest('.prv-f'); if (f.requestSubmit) f.requestSubmit(); }
  });

  function pdPeopleCards(p) {
    var cell = function (v, cls) { return '<td class="' + (cls ? cls + ' ' : '') + (v ? 'y' : 'n') + '"><span class="sr-only">' + (v ? 'Yes' : 'No') + '</span></td>'; };
    var vw = !fbNoVw(p);   /* v92 (32.1): a client project has no Viewers */
    var perm = '<details class="pd-perm"><summary>What each role can do</summary><div class="pd-mx-w"><table class="pd-mx"><thead><tr><th scope="col">Can</th><th scope="col" class="you">Project owner</th><th scope="col">Editor</th>' + (vw ? '<th scope="col">Viewer</th>' : '') + '</tr></thead><tbody>' +
      PD_PERMS[p.kind].map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th>' + cell(r[1], 'you') + cell(r[2]) + (vw ? cell(r[3]) : '') + '</tr>'; }).join('') + '</tbody></table></div>' +
      (p.kind === 'private' ? '<p class="pd-note pd-perm-n">Viewers do not use the extension or the web app. They open their own portal, portal.scopedue.com, from the link in their email.</p>' : '<p class="pd-note pd-perm-n">Client projects have no Viewers. The client’s people speak through the client portal.</p>') + '</details>';
    var mem = '<section class="card pd-card" aria-labelledby="pd-h-mem"><div class="card-h ruled"><div><h3 id="pd-h-mem">Members</h3><p>Who can open this project.</p></div><div class="h-actions"><span class="count">' + (p.team.length + 1) + '</span></div></div><ul class="pd-mem">' +
      x8MeRow(p) +
      p.team.map(pdMemberRow).join('') + '</ul>' + x8MemFoot(p) + perm + '</section>';
    var access = '';
    if (p.kind === 'client') {
      var c = byId(p.cid) || {};
      access = '<section class="card pd-card" aria-labelledby="pd-h-acc"><div class="card-h ruled"><div><h3 id="pd-h-acc">Client access</h3><p>What ' + esc(given(c)) + ' sees.</p></div><div class="h-actions"><span class="chip">Read and approve</span></div></div>' +
        '<div class="pd-acc"><span class="pa">' + esc(initials(c.contact || 'C')) + '</span><div><b>' + esc(c.contact || '') + '</b><small>' + esc([c.role, c.name].filter(Boolean).join(' · ')) + '</small></div></div>' +
        '<p class="pd-sec-p">Sees Scope, Change and the copies you share. Never sees Team, drafts or originals.</p><div class="pd-acc-f"><button type="button" class="btn-ghost btn-sm" data-pd="client">Open client page ' + IC('ext') + '</button></div></section>';
    }
    var drive = '<section class="card pd-card" aria-labelledby="pd-h-drv"><div class="card-h ruled"><div><h3 id="pd-h-drv">Google Drive</h3><p>Where this project’s files live.</p></div><div class="h-actions">' + ((DR && DR.st === 'on') ? '<span class="chip ok">Connected</span>' : '<span class="chip">Not connected</span>') + '</div></div><div class="pd-drv">' +
      ((DR && DR.st === 'on') ? '<p class="pd-note">Files stay in your own Drive. Add the ones this project needs to Working context, so everyone opens the same file. ScopeDue keeps no copy.</p><a class="btn-ghost btn-sm" href="' + PD_DRIVE + '" target="_blank" rel="noopener noreferrer">Open in Drive ' + IC('ext') + '</a>' :
        '<p class="pd-note">Connect Google Drive in Settings. Files stay in your own Drive; link the ones this project needs in Working context. ScopeDue keeps no copy.</p><button type="button" class="btn-ghost btn-sm" data-pd="drive">Connect in Settings</button>') + '</div></section>';
    var owners = '<option value="You"' + (p.owner === 'You' ? ' selected' : '') + '>You</option>' + p.team.map(function (m) { return '<option' + (p.owner === m.n ? ' selected' : '') + '>' + esc(m.n) + '</option>'; }).join('');
    var colab = '<section class="card pd-card" aria-labelledby="pd-h-col"><div class="card-h ruled"><div><h3 id="pd-h-col">Collaboration</h3><p>Who owns the next step.</p></div></div><ul class="pd-colab">' +
      '<li><div class="grow"><b>Next step owner</b><small>' + (p.next ? esc(p.next) : 'No next step yet') + '</small></div><span class="pd-sel"><select id="pd-owner" data-pd-owner aria-label="Next step owner"' + (x8Role(p) !== 'Owner' ? ' disabled' : '') + '>' + owners + '</select>' + IC('chev') + '</span></li>' +
      x8ColabLi(p) + '</ul></section>';
    return mem + access + colab + (p.dv ? '' : drive);   /* a project kept in Drive has its own Google Drive card at the top */
  }
