  /* ---------- my work: what is yours, across projects ---------- */
  /* Not a second list and nothing stored. It reads the same units Team › Work reads, in every project.
     Alone, every unit is yours. With a team, a unit is yours when it has your name on it.
     Two questions, in this order: what is waiting for you to decide, and what is yours to do */
  var mwBody = document.getElementById('mw-body'), mwSubEl = document.getElementById('mw-sub'), mwBadgeEl = document.getElementById('mw-badge');
  var mw = { dn: {}, sk: null, sf: '', at: -1, more: {}, fc: '' };
  var wkHostMw = {
    p: function (el) { return pdById(el.getAttribute('data-pj')); }, q: function () { return mw; }, key: function (p, id) { return p.id + '|' + id; },
    sel: function (p, id) { return '[data-pj="' + p.id + '"][data-it="' + id + '"]'; }, sr: '#mw-sr', root: function () { return mwBody; },
    re: function (f) { mwRerender(mw.fc || f); }, reveal: function () {}
  };
  function mwProjects() { return PROJECTS.slice(); }
  function mwCollect() {
    var out = { gs: [], wait: [], open: 0, done: 0 }, n = 0;
    mwProjects().forEach(function (p) {
      var solo = !p.team.length, mine = [];
      wkUnits(p).forEach(function (u) {
        var who = wkPerson(p, u.as), k;
        u.as = who ? wkKey(who) : ''; k = wkShow(u);
        /* with the client is nobody's to do until they reply, so it is not on this page at all. Waiting on clients has it */
        if (k === 'wait') return;
        if (solo || who === ME) mine.push(u);
        else if (x8Role(p) === 'Owner' ? (k === 'review' || k === 'stuck') : (k === 'stuck' && u.by && u.by.k === 'p' && u.by.ref === 'You')) out.wait.push({ p: p, u: u, who: who, n: n++ });
      });
      var open = mine.filter(function (u) { return u.st !== 'done'; });
      out.done += mine.length - open.length;
      if (!open.length) return;
      out.open += open.length;
      out.gs.push({ p: p, solo: solo, us: mine, open: open });
    });
    out.wait.sort(function (a, b) { return (WK_RANK[wkShow(a.u)] - WK_RANK[wkShow(b.u)]) || (a.n - b.n); });
    return out;
  }
  /* the sidebar count is what needs you: work waiting on you, and your own work that is due, stuck or sent back. The clients to chase count on Waiting on clients */
  function mwBadge() {
    if (!mwBadgeEl) return;
    /* what needs you: work waiting on you, and your own work that is due, stuck or sent back */
    var c = mwCollect(), td = x7Today(), urgent = 0;
    c.gs.forEach(function (g) { g.open.forEach(function (u) { if ((u.due && u.due <= td) || wkShow(u) === 'stuck' || u.rb) urgent++; }); });
    var n = c.wait.length + urgent;
    mwBadgeEl.textContent = n; mwBadgeEl.hidden = !n;
    mwBadgeEl.setAttribute('aria-label', n + (n === 1 ? ' item needs you' : ' items need you'));
  }
  /* v131 (109): the circle in front of your own row. One click takes the step the status menu would end on: Done for the Owner
     (or alone), In review for an Editor in a team, and back to To do from Done. It goes through the same status change, so the
     same rules, Recent line and Undo apply. Where the status cannot change (an Editor's lock on someone else's work) it only shows
     the state. A sample's status changes here, and only here (the user's ruling) */
  function mwCkTo(p, u, solo) {
    var show = wkShow(u);
    if (show === 'done') return 'todo';
    if (x8Seen(p) === 'Owner' && (solo || !u.as || u.as === 'You')) return 'done';
    return !solo && show !== 'review' ? 'review' : '';
  }
  function mwCkHTML(p, u, solo) {
    var show = wkShow(u), to = x8Lock(p, u) && !sdSample(p) ? '' : mwCkTo(p, u, solo), t = esc(u.t);   /* a sample's status changes here (109) */
    var lbl = to === 'todo' ? 'Reopen ' + t : to === 'done' ? 'Mark ' + t + ' done' : to === 'review' ? 'Send ' + t + ' for review' : '';
    var tip = to === 'todo' ? 'Reopen' : to === 'done' ? 'Mark done' : to === 'review' ? 'Send for review' : WK_NM[show];
    return '<button type="button" class="mw-ck ' + show + '" data-mw="ck" data-pj="' + p.id + '" data-id="' + esc(u.id) + '"' + (to ? ' data-to="' + to + '" aria-label="' + lbl + '"' : ' disabled aria-hidden="true" tabindex="-1"') + ' title="' + tip + '">' + IC('tick') + '</button>';
  }
  /* after the circle is pressed, focus stays on a circle: its own, or the one of the row that took its place */
  function mwCk(a) {
    var row = a.closest('li.wk-r'), sel = row && row.querySelector('select[data-wk="st"]'), to = a.getAttribute('data-to'), go;
    if (!sel || sel.disabled || !to || a.classList.contains('go')) return;
    go = function () {
      mw.at = [].indexOf.call(mwBody.querySelectorAll('li.wk-r'), row); mw.fc = '[data-pj="' + a.getAttribute('data-pj') + '"][data-it="' + a.getAttribute('data-id') + '"] .mw-ck';
      sel.value = to; wkChange(sel, wkHostMw); mw.at = -1; mw.fc = '';
    };
    if (to === 'todo' || matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
    a.classList.add('go'); setTimeout(go, 180);   /* the tick draws itself before the row moves */
  }
  function mwHold(p, who) { return '<span class="mw-ho' + (who ? '' : ' none') + '">' + (who ? esc(who.n) : 'No owner') + '</span>'; }
  function mwWaitHTML(list) {
    var rows = list.map(function (w) {
      var pre = ['<button type="button" class="mw-pj" data-mw="open" data-pj="' + w.p.id + '" title="Open ' + esc(w.p.n) + '"><span class="pm" aria-hidden="true">' + esc(w.p.m) + '</span>' + esc(w.p.n) + '</button>', mwHold(w.p, w.who)];
      return wkRowHTML(w.p, w.u, wkCan(w.p), { pj: true, q: mw, pre: pre });
    }).join('');
    return '<section class="card mw-card" aria-labelledby="mw-h-wait"><div class="card-h ruled"><div><h2 id="mw-h-wait">Waiting for you</h2><p>Work other people finished, or cannot move without you.</p></div><div class="h-actions"><span class="count">' + list.length + '</span></div></div>' +
      '<ul class="wk-rs">' + rows + '</ul></section>';
  }
  function mwGroupHTML(g) {
    var p = g.p, ppl = wkCan(p), c = { stuck: 0, doing: 0 }, open = g.open.slice().sort(function (a, b) { return (WK_RANK[wkShow(a)] - WK_RANK[wkShow(b)]) || (a.i - b.i); }), done = g.us.filter(function (u) { return u.st === 'done'; }), o = { pj: true, q: mw, mine: true, solo: g.solo }, rows;
    open.forEach(function (u) { var k = wkShow(u); if (k === 'stuck') c.stuck++; if (k === 'doing') c.doing++; });
    /* v131 (109): with nothing in progress, the first To do is what comes next */
    var nx = c.doing ? null : open.filter(function (u) { return wkShow(u) === 'todo'; })[0], nxo = { pj: true, q: mw, mine: true, solo: g.solo, nx: true };
    var sub = [p.kind === 'client' ? 'Client' : 'Private', p.team.length ? 'Team of\u00a0' + (p.team.length + 1) : 'Solo', p.due ? 'Target\u00a0' + p.due.d.replace(/ /g, '\u00a0') : 'No target date'].join(' · ');
    /* how far your part of it is, and how long is left when the date is near enough to matter (closer than three days has its own chip) */
    var dd = p.due && !p.due.chip && p.dueAt ? Math.round((dayStart(p.dueAt) - dayStart()) / DAY_MS) : 0, tot = g.us.length, pct = tot ? Math.round(done.length / tot * 100) : 0;
    var chips = '<span class="mw-pn">' + done.length + ' of ' + tot + ' done</span>' + (p.due && p.due.chip ? '<span class="chip ' + p.due.chip + '">' + esc(p.due.t) + '</span>' : dd > 2 && dd <= 30 ? '<span class="chip neutral">' + dd + ' days left</span>' : '') + (c.stuck ? '<span class="chip warn">' + c.stuck + ' stuck</span>' : '');
    /* a long list shows its first four, most urgent first; the rest is one click away */
    var cut = open.length > 5 && !mw.more[p.id] && !(mw.sk && mw.sk.indexOf(p.id + '|') === 0) ? 4 : open.length;
    rows = open.slice(0, cut).map(function (u) { return wkRowHTML(p, u, ppl, u === nx ? nxo : o); }).join('');
    if (cut < open.length) rows += '<li class="wk-dn mw-more"><button type="button" class="link" data-mw="more" data-pj="' + p.id + '">Show ' + (open.length - cut) + ' more</button></li>';
    if (done.length) {
      var sd = !!mw.dn[p.id];
      rows += (sd ? done.map(function (u) { return wkRowHTML(p, u, ppl, o); }).join('') : '') + '<li class="wk-dn"><button type="button" class="link" data-mw="dn" data-pj="' + p.id + '" aria-expanded="' + sd + '">' + (sd ? 'Hide done' : 'Show ' + done.length + ' done') + '</button></li>';
    }
    return '<section class="card wk-g mw-g" aria-labelledby="mw-g-' + p.id + '" data-pj="' + p.id + '"><div class="wk-gh mw-gh"><span class="pj-av' + (p.kind === 'private' ? ' priv' : '') + '" aria-hidden="true">' + esc(p.m) + '</span>' +
      '<span class="wk-gt"><b id="mw-g-' + p.id + '">' + esc(p.n) + '</b><small>' + esc(sub) + '</small></span><span class="wk-gs">' + chips + '</span>' +
      '<button type="button" class="btn-ghost btn-sm" data-mw="open" data-pj="' + p.id + '" aria-label="Open ' + esc(p.n) + '">Open</button><span class="mw-pg" aria-hidden="true"><i style="width:' + pct + '%"></i></span></div>' +
      '<div class="wk-gb"><ul class="wk-rs">' + rows + '</ul></div></section>';
  }
  function mwClearHTML(c) {
    return '<section class="card mw-clear" aria-labelledby="mw-h-clear"><span class="mw-ok" aria-hidden="true">' + IC('tick') + '</span><h2 id="mw-h-clear">You are clear</h2>' +
      '<p>Nothing is open for you, and nobody is waiting on you.' + (c.done ? ' ' + itemsLbl(c.done).replace(' ', '\u00a0') + ' done.' : '') + ' Work you own in any project shows up here.</p>' +
      '<button type="button" class="btn-ghost btn-sm" data-view="projects">Go to Projects</button></section>';
  }
  function mwSubText(c) {
    if (!c.gs.length && !c.wait.length) return 'Nothing is open for you across your projects.';
    var a = [];
    if (c.wait.length) a.push(c.wait.length + ' waiting for you');
    if (c.open) a.push(c.open + ' open in ' + c.gs.length + (c.gs.length === 1 ? ' project' : ' projects'));
    return a.join(', ') + '.';
  }
  function mwRender() {
    var c = mwCollect(), h = '';
    if (!c.gs.length && !c.wait.length) h = mwClearHTML(c);
    else {
      if (c.wait.length) h += mwWaitHTML(c.wait);
      /* v131 (109): "Yours" names a second list only when there is a first one (Waiting for you); alone, the page title says it */
      if (c.wait.length) h += '<div class="mw-sh"><h2 id="mw-h-yours">Yours</h2><span class="count">' + c.open + '</span></div>';
      h += c.gs.length ? c.gs.map(mwGroupHTML).join('') : '<p class="mw-none">Nothing open is assigned to you.</p>';
    }
    mwBody.innerHTML = h + x8GrabHTML();
    if (mw.sk && !mwBody.querySelector('.wk-sf')) { mw.sk = null; mw.sf = ''; }
    mwSubEl.textContent = mwSubText(c);
    mwBadge();
  }
  /* after a change the row may have left the page (done, handed over). Focus goes to the row that took its place */
  function mwRerender(focus) {
    var ae = document.activeElement, rows = mwBody.querySelectorAll('li.wk-r'), row = ae && ae.closest ? ae.closest('li.wk-r') : null, idx = mw.at > -1 ? mw.at : row ? [].indexOf.call(rows, row) : -1, f;
    mw.at = -1; mwRender();
    f = focus && mwBody.querySelector(focus);
    if (!f && idx > -1) { var r2 = mwBody.querySelectorAll('li.wk-r'), r = r2[Math.min(idx, r2.length - 1)]; f = r && ((/mw-ck/.test(focus || '') && r.querySelector('.mw-ck:not([disabled])')) || r.querySelector('[data-wk="st"]')); }
    if (!f) f = document.getElementById('mw-title');
    if (f) f.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-db-cr]'); if (!a) return;
    var k = a.getAttribute('data-db-cr').split('|');
    e.preventDefault(); closeDrawer(true); openProject(k[0], 'change', a, k[1]);
  });
