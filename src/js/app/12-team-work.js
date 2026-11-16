  /* ---------- team: who is doing what ---------- */
  /* Work is not a second task list. It is the scope the project already holds: Now in a Private project, deliverables in a Client project.
     Every unit has one owner and one status. Both live beside the scope and never inside it, so an issued version never changes and a Client never sees them.
     Each field has one writer: the Owner sets who owns a unit, the owner of the unit sets its status. That keeps a shared folder free of conflicts */
  var WK_ST = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'In review'], ['done', 'Done'], ['stuck', 'Stuck'], ['wait', 'Waiting on client']];
  var WK_NM = { todo: 'To do', doing: 'Doing', review: 'In review', done: 'Done', stuck: 'Stuck', wait: 'Waiting on client' };
  var WK_SH = { wait: 'With client' };
  var WK_RANK = { stuck: 0, review: 1, doing: 2, todo: 3, wait: 4, done: 5 };
  /* Waiting on client is a note laid over a unit, like Stuck: the state under it (To do, Doing) stays, so when the client replies it is back where it was.
     It only exists in a Client project. The date is a nudge for when this device is open, never a rule */
  var WK_CHASE = [[1, 'Tomorrow'], [3, 'In 3 days'], [7, 'In 1 week'], [14, 'In 2 weeks'], [0, 'No date']];
  function wkUi() { return { seg: 'work', open: {}, dn: {}, sk: null, sf: '' }; }
  /* the people who can own work: the Owner and Editors. A Viewer reads and changes nothing */
  function wkCan(p) { return [ME].concat(p.team.filter(function (m) { return m.role !== 'Viewer'; })); }
  function wkKey(m) { return m === ME ? 'You' : m.e; }
  function wkName(m) { return m === ME ? 'You' : m.n; }
  function wkPerson(p, key) { return key ? (wkCan(p).filter(function (m) { return wkKey(m) === key; })[0] || null) : null; }
  function wkShow(u) { return u.st === 'done' ? 'done' : u.stk ? 'stuck' : u.wc ? 'wait' : u.st; }
  function wkWcDue(u) { return !!(u.wc && u.wc.cd > 0 && u.wc.cd <= Date.now()); }
  function wkAge(ts) { var d = Math.max(0, Math.floor((Date.now() - ts) / PRV_DAY)); return d === 0 ? 'today' : d === 1 ? '1 day' : d + ' days'; }
  function wkWaited(ts) { var a = wkAge(ts); return a === 'today' ? 'Waiting since today' : 'Waiting ' + a; }

  /* the units of work, read from the scope each kind of project already has */
  function wkUnits(p) {
    var out = wkUnits0(p), rec = function (id) { return p.kind === 'private' ? prvById(p.pv.items, id) : (p.work || {})[id]; };
    out.forEach(function (u) { var r = rec(u.id) || {}; u.due = r.due || ''; u.by = r.stk && r.by ? r.by : null; u.ho = r.ho || []; u.rb = r.rb || null; u.ap = r.ap || null; u.sn = r.sn || ''; u.dod = Array.isArray(r.dod) ? r.dod : []; u.cp = Array.isArray(r.cp) ? r.cp : []; });   /* v97: checks recorded (45) */
    out.forEach(function (u) {
      u.chg = !!(u.sn && u.sn !== u.t && u.st !== 'done');
      /* blocked by an item that is done: ready again, without anyone having to say so */
      if (u.by && u.by.k === 'u') { var v = out.filter(function (x) { return x.id === u.by.ref; })[0]; if (v && v.st === 'done') { u.freed = v.t; u.stk = ''; } }
    });
    return out;
  }
  function wkUnits0(p) {
    var out = [];
    if (p.kind === 'private') {
      prvBucket(p, 'in').forEach(function (x, i) {
        out.push({ i: i, id: x.id, t: x.t, st: x.st === 'doing' || x.st === 'review' || x.st === 'done' ? x.st : 'todo', stk: x.stk || '', as: x.as || '', cr: '', size: x.size || '', days: x.size ? prvSzD(p, x.size) : 0, out: false, base: false, wc: null });
      });
      return out;
    }
    var l = pdLatest(p), w = p.work || {};
    pdDraftRows(p).forEach(function (r, i) {
      var x = r.x; if (x.sec !== 'in' || x.rm) return;
      var rec = w[x.id] || {}, cr = x.cr ? pdCr(p, x.cr) : null, appr = !!cr && pdCrState(cr) === 'approved';
      out.push({ i: i, id: x.id, t: x.t, st: rec.st || 'todo', stk: rec.stk || '', as: rec.as || '', cr: x.cr || '', size: '', days: 0, out: !!(l && (r.k === 'add' || (r.k === 'mod' && !x.cr)) && !appr), base: !!(l && r.was && !x.cr), wc: rec.wc || null });
    });
    return out;
  }
  function wkUnit(p, id) { return wkUnits(p).filter(function (u) { return u.id === id; })[0]; }
  function wkSet(p, id, patch) {
    if (p.kind === 'private') {
      var x = prvById(p.pv.items, id), pk; if (!x) return;
      for (pk in patch) { if (pk === 'wc') continue; if (pk === 'st') x.st = patch.st === 'todo' ? 'planned' : patch.st; else x[pk] = patch[pk]; }
    } else {
      var w = p.work || (p.work = {}), r = w[id] || (w[id] = { as: '', st: 'todo', stk: '' }), k;
      for (k in patch) r[k] = patch[k];
    }
  }
  function wkStats(p) {
    var us = wkUnits(p), by = { todo: 0, doing: 0, review: 0, done: 0, stuck: 0, wait: 0 }, gs = wkCan(p).map(function (m) { return { m: m, key: wkKey(m), us: [] }; }), un = { m: null, key: 'none', us: [] };
    var s = { us: us, total: us.length, by: by, gs: gs, un: un, unOpen: 0, rv: [], stk: [], wc: [], chase: [], outStarted: [], over: [], base: { d: 0, n: 0 }, chg: { d: 0, n: 0 }, days: { d: 0, n: 0 } };
    us.forEach(function (u) {
      var k = wkShow(u), who = wkPerson(p, u.as), g = who && gs.filter(function (x) { return x.m === who; })[0];
      u.as = who ? wkKey(who) : ''; by[k]++;
      (g || un).us.push(u);
      if (k === 'review') s.rv.push(u);
      if (u.due && u.due < x6Iso() && u.st !== 'done') s.over.push(u);
      if (k === 'stuck') s.stk.push(u);
      if (k === 'wait') { s.wc.push(u); if (wkWcDue(u)) s.chase.push(u); }
      if (!g && k !== 'done') s.unOpen++;
      if (u.out && (u.st !== 'todo' || u.stk)) s.outStarted.push(u);
      if (u.cr) { s.chg.n++; if (u.st === 'done') s.chg.d++; } else if (u.base) { s.base.n++; if (u.st === 'done') s.base.d++; }
      if (u.days) { s.days.n += u.days; if (u.st === 'done') s.days.d += u.days; }
    });
    return s;
  }
  /* what the team needs from the Owner. Facts only: nothing here predicts anything */
  function wkNeeds(p) {
    var out = [], s, team = p.team.length > 0, t = function (u) { return '“' + caCut(String(u.title || u.t || ''), 40) + '”'; }, more = function (a) { return a.length > 1 ? ' and ' + (a.length - 1) + ' more' : ''; }, o;
    if (!team && p.kind !== 'client') return out;
    s = wkStats(p);
    if (s.outStarted.length) {
      o = { t: 'Work started outside the baseline', chip: 'crit', chipT: 'Unprotected', tab: team ? 'team' : 'scope', p: t(s.outStarted[0]) + more(s.outStarted) + (s.outStarted.length > 1 ? ' are' : ' is') + ' in progress, but not as the issued Scope says. Send it through Change, or put it back as it was.' };
      if (team) o.f = 'wk';
      out.push(o);
    }
    var late = caItems(p).filter(function (x) { return x.due && x.k !== 'pay'; });   /* v137 (115): a due payment has its own Needs row (19.4) */
    if (late.length) {
      o = { t: 'Chase ' + late[0].g + ' about ' + (late.length === 1 ? t(late[0]) : late.length + ' items'), chip: 'warn', chipT: 'Due', tab: late[0].go.tab, p: late[0].sub + '. ' + wkWaited(late[0].ts) + '.' + (late.length > 1 ? ' And ' + (late.length - 1) + ' more.' : '') };
      if (late[0].go.f) o.f = late[0].go.f;
      if (late[0].go.cr) o.cr = late[0].go.cr;
      out.push(o);
    }
    if (!team) return out;
    if (s.stk.length) out.push({ t: s.stk.length === 1 ? '1 item is stuck' : s.stk.length + ' items are stuck', chip: 'warn', chipT: 'Stuck', tab: 'team', f: 'wk', p: t(s.stk[0]) + ': ' + s.stk[0].stk + (s.stk.length > 1 ? ' And ' + (s.stk.length - 1) + ' more.' : '') });
    if (s.rv.length) out.push({ t: s.rv.length === 1 ? '1 item is waiting for your review' : s.rv.length + ' items are waiting for your review', tab: 'team', f: 'wk', p: t(s.rv[0]) + more(s.rv) + (s.rv.length > 1 ? ' are' : ' is') + ' ready. Approve ' + (s.rv.length > 1 ? 'each' : 'it') + ', or send it back with a note.' });
    if (s.unOpen) out.push({ t: s.unOpen === 1 ? '1 item has no owner' : s.unOpen + ' items have no owner', tab: 'team', f: 'wk', p: 'Give each one a single owner, or take them yourself.' });
    return out.concat(x7Needs(p, s));
  }
  /* a member who leaves, or becomes a Viewer, hands their open work back */
  function wkRelease(p, key) {
    var prev = [], open = 0;
    if (p.kind === 'private') p.pv.items.forEach(function (x) { if (x.as === key) { prev.push(x); if (x.sec === 'in' && x.st !== 'done') open++; x.as = ''; } });
    else { var w = p.work || {}; Object.keys(w).forEach(function (id) { if (w[id].as === key) { prev.push(w[id]); if (w[id].st !== 'done') open++; w[id].as = ''; } }); }
    return { n: open, undo: function () { prev.forEach(function (r) { r.as = key; }); } };
  }
  /* undo helpers: the snapshot a change restores from, and the redraw that follows putting it back */
  function snapOf(p) { return p.kind === 'private' ? prvSnap(p) : JSON.stringify(p.work || {}); }
  function snapBack(p, snap) { if (p.kind === 'private') p.pv = JSON.parse(snap); else p.work = JSON.parse(snap); }
  function undone(p, tab) { if (pd.p === p && (!tab || pd.tab === tab)) pdRerender(); if (curView === 'mywork') mwRender(); if (curView === 'actions') caRender(); }
  function wkAfter(p) { if (p.kind === 'private') prvAfter(p); else pdRefreshBadges(p); }
  /* one change: write it, note it in Recent, offer Undo. Private projects restore from their snapshot, Client projects from the work map */
  function wkApply(p, fn, note, toast, focus, flashId, h) {
    h = h || wkHostPd;
    var snap = snapOf(p), undoNote;
    fn(); undoNote = prvNote(p, note); wkAfter(p);
    var undo = function () { snapBack(p, snap); undoNote(); wkAfter(p); undone(p); };
    h.re(focus);
    if (flashId) prvFlash(h.root().querySelector(h.sel(p, flashId)), false);
    showToast(toast, undo);
  }
  /* Work is edited in two places: the Team tab of one project, and My work across all of them. A host says where the row lives */
  var wkHostPd = {
    p: function () { return pd.p; }, q: function () { return pd.wk; }, key: function (p, id) { return id; }, sel: function (p, id) { return '[data-it="' + id + '"]'; },
    sr: '#wk-sr', root: function () { return pdPanel; }, re: function (f) { pdRerender(f); }, reveal: function (k) { pd.wk.open[k] = true; }
  };

  /* views */
  function wkBar(c, n, lbl) {
    var order = [['done', 'd'], ['review', 'r'], ['doing', 'g'], ['wait', 'w'], ['stuck', 's'], ['todo', 't']], on = order.filter(function (o) { return c[o[0]]; });
    return '<span class="wk-bar' + (n ? '' : ' empty') + '" role="img" aria-label="' + esc(lbl + ': ' + (on.length ? on.map(function (o) { return c[o[0]] + ' ' + WK_NM[o[0]].toLowerCase(); }).join(', ') : 'nothing yet')) + '">' +
      on.map(function (o) { return '<i class="' + o[1] + '" style="flex:' + c[o[0]] + '"></i>'; }).join('') + '</span>';
  }
  function wkProgressCard(p, s) {
    var client = p.kind === 'client', l = client ? pdLatest(p) : null, nm = client ? '' : (p.pv.rel.name || 'v1'), facts = [], sig = [];
    var on = !client && prvRelOn(p);   /* v97 (43): a project without a release names none */
    var sub = client ? 'Counted against the issued Scope. Work for approved Change is kept apart.' : on ? 'Only what is in Now for ' + nm + ' counts. Next and Never are not work yet.' : 'Only what is in Now counts. Next and Never are not work yet.';
    if (client) { facts.push(['Baseline', l ? s.base.d + ' of ' + s.base.n : 'Not issued yet']); facts.push(['Approved change', s.chg.n ? s.chg.d + ' of ' + s.chg.n : 'None yet']); }
    else { if (on) facts.push(['Release', nm]); facts.push(['Sized work',s.days.n ? s.days.d + ' of ' + prvDay(s.days.n) : 'No sizes yet']); }
    facts.push(['Target', p.due ? p.due.d : 'No deadline']);
    /* v69: how much of what is done is verified (section 31) */
    var vcn = wkVerCount(p); if (vcn.done) facts.push(['Verified', vcn.ok + ' of ' + vcn.done + ' done']);
    if (vcn.tested) facts.push(['Tested', vcn.tested + ' of ' + vcn.done + ' done']);   /* v97 (45): measured, nobody checked yet */
    if (vcn.not.length) sig.push('<span class="chip warn">' + vcn.not.length + ' not verified</span>');
    if (s.outStarted.length) sig.push('<span class="chip crit">' + s.outStarted.length + ' outside the baseline</span>');
    if (s.by.stuck) sig.push('<span class="chip warn">' + s.by.stuck + ' stuck</span>');
    if (s.by.review) sig.push('<span class="chip">' + s.by.review + ' in review</span>');
    if (s.by.wait) sig.push('<span class="chip">' + s.by.wait + ' with client</span>');
    if (s.chase.length) sig.push('<span class="chip warn">' + s.chase.length + ' to chase</span>');
    if (s.unOpen) sig.push('<span class="chip warn">' + s.unOpen + ' without an owner</span>');
    if (s.over.length) sig.push('<span class="chip crit">' + s.over.length + ' past ' + (s.over.length === 1 ? 'its date' : 'their date') + '</span>');
    var x7c = s.us.filter(function (u) { return u.chg; }).length; if (x7c) sig.push('<span class="chip warn">' + x7c + ' changed after start</span>');
    if (!sig.length && s.total) sig.push('<span class="chip ok">No blockers</span>');
    var legend = [['done', 'd'], ['review', 'r'], ['doing', 'g'], ['wait', 'w'], ['stuck', 's'], ['todo', 't']].filter(function (o) { return s.by[o[0]]; }).map(function (o) { return '<li><i class="' + o[1] + '" aria-hidden="true"></i><b>' + s.by[o[0]] + '</b> ' + WK_NM[o[0]].toLowerCase() + '</li>'; }).join('');
    var h = '<section class="card pd-card" aria-labelledby="pd-h-wkp"><div class="card-h ruled"><div><h3 id="pd-h-wkp">Progress</h3><p>' + esc(sub) + '</p></div></div>';
    if (!s.total) return h + '<p class="pd-crs-e">' + (client ? 'No deliverables yet. Add them in Scope and they show up here, ready to give to someone.' : 'Nothing in Now yet. Items you add to Now show up here, ready to give to someone.') + '</p></section>';
    h += '<div class="wk-hero"><div class="wk-num"><b>' + s.by.done + '</b><span>of ' + s.total + ' done</span></div><div class="wk-hb">' + wkBar(s.by, s.total, 'Progress') + '<ul class="wk-lg">' + legend + '</ul></div></div>';
    h += '<div class="wk-sig">' + sig.join('') + '</div>';
    h += '<dl class="wk-facts">' + facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>';
    return h + '</section>';
  }
  /* Alone, a unit has three states. In review and Stuck are about other people, so they are not offered (a state a unit already has is still shown) */
  function wkStPill(u, pj, solo, client, nd) {
    var show = wkShow(u), opts = WK_ST.filter(function (s) { return (s[0] !== 'wait' || client || show === 'wait') && (!solo || (s[0] !== 'review' && s[0] !== 'stuck') || show === s[0]) && (s[0] !== 'done' || show === 'done' || !nd && (solo || !u.as || u.as === 'You')); });
    return '<span class="wk-pick wk-st ' + show + '"' + (show === 'wait' && u.wc ? ' title="' + esc('Waiting on the client: ' + u.wc.why) + '"' : '') + '><span class="wk-sl"><i aria-hidden="true"></i>' + WK_NM[show] + '</span><select data-wk="st" data-id="' + u.id + '"' + (pj || '') + ' aria-label="Status of ' + esc(u.t) + '">' +
      opts.map(function (s) { return '<option value="' + s[0] + '"' + (show === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>';
  }
  /* what a waiting unit shows under its title: how long, when to chase, and the two things you can do about it */
  function wkWcLine(p, u) {
    var w = u.wc; if (!w || wkShow(u) !== 'wait') return '';
    var da = function (a) { return 'data-pd="wk:' + a + '"'; }, due = wkWcDue(u), t = esc(u.t);
    return '<span class="wk-wc"><span class="wk-wa">' + wkWaited(w.ts) + '</span><button type="button" class="link wk-cl' + (due ? ' due' : '') + '" ' + da('wc') + ' data-id="' + u.id + '" aria-label="Change what you wait for, or the chase date, on ' + t + '">' + (!w.cd ? 'No chase date' : due ? 'Chase now' : 'Chase ' + prvDate(w.cd)) + '</button>' +
      '<button type="button" class="link" ' + da('replied') + ' data-id="' + u.id + '" aria-label="The client replied about ' + t + '">Client replied</button></span>';
  }
  /* the small form under a row: why it is stuck, or what it waits for and when to chase */
  function wkFormHTML(p, u, mwr) {
    var q = mwr ? mw : pd.wk, id = u.id, t = esc(u.t), pj = mwr ? ' data-pj="' + p.id + '"' : '', sr = mwr ? 'mw-sr' : 'wk-sr', wait = q.sf === 'wait', prev = wait ? u.wc : null;
    if (q.sf === 'ho' || q.sf === 'back') return x7FormHTML(p, u, mwr, q);
    if (q.sf === 'gh') return x9FormHTML(p, u, mwr, q);
    if (q.sf === 'dod') return wkDodForm(p, u, mwr);
    if (q.sf === 'cp') return wkCpForm(p, u, mwr);
    var fa = mwr ? 'data-mw-form="' + (wait ? 'wait' : 'stuck') + '"' : 'data-pd-form="wk:' + (wait ? 'wait' : 'stuck') + '"';
    var h = '<li class="prv-fw"><form class="prv-f wk-sf' + (wait ? ' wc' : '') + '" ' + fa + pj + ' data-id="' + id + '" novalidate><label class="sr-only" for="' + sr + '">' + (wait ? 'What are you waiting for on ' : 'What is blocking ') + t + '?</label>' +
      '<input id="' + sr + '" name="r" maxlength="140" placeholder="' + (wait ? 'What are you waiting for?' : 'What is blocking this?') + '" autocomplete="off"' + (prev ? ' value="' + esc(prev.why) + '"' : '') + '>';
    if (!wait && p.team.length) h += x7BySel(p, u);
    if (wait) h += '<span class="wk-fc"><span class="wk-fl" aria-hidden="true">Chase</span><span class="pd-sel"><select name="c" aria-label="Chase the client">' + (prev ? '<option value="keep" selected>' + (prev.cd ? 'Keep ' + prvDate(prev.cd) : 'Keep: no date') + '</option>' : '') +
      WK_CHASE.map(function (c) { return '<option value="' + c[0] + '"' + (!prev && c[0] === 3 ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></span>';
    return h + '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + (mwr ? 'data-mw="cancel"' : 'data-pd="wk:cancel"') + '>Cancel</button><button type="submit" class="btn-primary btn-sm">' + (wait ? (prev ? 'Save' : 'Mark waiting') : 'Mark stuck') + '</button></div>' + prvErrSpan() + '</form></li>';
  }
  function wkRowHTML(p, u, ppl, o) {
    o = o || {};
    var show = wkShow(u), who = wkPerson(p, u.as), q = o.q || pd.wk, id = u.id, t = esc(u.t), m = (o.pre || []).slice(), mwr = !!o.pj, ask = q.sk === (mwr ? p.id + '|' + id : id), pj = mwr ? ' data-pj="' + p.id + '"' : '';
    var act = function (a) { return (mwr ? 'data-mw="' + a + '" data-pj="' + p.id + '"' : 'data-pd="wk:' + a + '"') + ' data-id="' + id + '"'; };
    var as = o.solo ? '' :
      '<span class="wk-pick wk-as' + (who ? '' : ' none') + '"' + (o.mine ? ' title="Hand it over to someone"' : '') + '>' + (who ? pdAv(who) : '<span class="av none" aria-hidden="true">' + IC('plus') + '</span>') +
      '<select data-wk="as" data-id="' + id + '"' + pj + ' aria-label="Owner of ' + t + '"><option value=""' + (who ? '' : ' selected') + '>Unassigned</option>' +
      ppl.map(function (x) { return '<option value="' + esc(wkKey(x)) + '"' + (who === x ? ' selected' : '') + '>' + esc(wkName(x)) + '</option>'; }).join('') + '</select></span>';
    /* v131 (109): in My work a sample's status is yours to change, as its Owner (everything else in a sample stays as it is) */
    var sm = !!o.mine && sdSample(p), st = wkStPill(u, pj, o.solo, p.kind === 'client', (sm ? x8Seen(p) : x8Role(p)) !== 'Owner');
    if (u.out) m.push('<span class="chip crit" title="In the draft, but not in the issued Scope. Nothing protects work on it.">Outside baseline</span>');
    if (u.cr) m.push(mwr ? '<span class="chip neutral" title="Opened from ' + u.cr + '">' + u.cr + '</span>' : '<button type="button" class="pd-crl" data-pd="tocr" data-cr="' + u.cr + '" title="Opened from ' + u.cr + '">' + u.cr + '</button>');
    var ghc = x9Chips(p, u); if (ghc) m.push(ghc);
    var vc = wkVerChip(p, u); if (vc) m.push(vc);

    var lines = '';
    if (u.stk) lines += '<small class="wk-why"><b>' + esc(x7StuckHead(p, u)) + '</b> ' + esc(u.stk) + '</small>';
    if (u.freed && show !== 'done') lines += '<small class="wk-why ok"><b>Ready again.</b> “' + esc(prvT(u.freed, 40)) + '”, which it waited on, is done.</small>';
    if (show === 'wait' && u.wc) lines += '<small class="wk-why wc"><b>Waiting on client.</b> ' + esc(u.wc.why) + '</small>';
    if (u.rb && show !== 'done' && show !== 'review') lines += '<small class="wk-why back"><b>Sent back.</b> ' + esc(u.rb.why) + '</small>';
    if (u.chg) lines += '<small class="wk-why chg"><b>Changed since it was started.</b> It was “' + esc(prvT(u.sn, 70)) + '”. <button type="button" class="link" ' + act('ack') + '>' + (u.as && u.as !== 'You' ? esc(x7Name(p, u.as)) + ' knows' : 'Got it') + '</button></small>';
    lines += x7LastHo(p, u) + wkDodHTML(p, u, pj) + wkCpLine(p, u);
    var rv = show === 'review' && !o.solo && x8Role(p) !== 'Owner' ? x8ReviewLine(p) : show === 'review' && !o.solo ? '<span class="wk-rv"><button type="button" class="btn-primary btn-sm" ' + act('approve') + '>' + IC('tick') + 'Approve</button><button type="button" class="btn-ghost btn-sm" ' + act('back') + '>Send back</button></span>' : '';
    /* v131 (109): in My work your own rows lead with a circle that finishes the work, and their chips sit on the title's line */
    var ck = o.mine ? mwCkHTML(p, u, o.solo) : '', inl = o.mine && (m.length || o.nx) ? '<span class="wk-mt in">' + (o.nx ? '<span class="mw-nx">Next up</span>' : '') + m.join('') + '</span>' : '';
    if (o.mine) m = [];
    var h = '<li class="wk-r' + (show === 'done' ? ' done' : '') + (show === 'stuck' ? ' stuck' : '') + (show === 'wait' ? ' wait' + (wkWcDue(u) ? ' due' : '') : '') + (u.out ? ' out' : '') + (u.chg ? ' chg' : '') + (o.solo ? ' solo' : '') + (o.mine && !o.solo ? ' mine' : '') + (o.mine ? ' ck' : '') + (ask ? ' ask' : '') + '" data-it="' + id + '"' + pj + '>' + ck + as + '<span class="tx"><span class="t">' + t + (u.size ? '<span class="wk-sz" title="About ' + esc(prvDay(u.days)) + '">' + u.size + '</span>' : '') + inl + '</span>' +
      lines + (m.length ? '<span class="wk-mt">' + m.join('') + '</span>' : '') + (mwr ? '' : wkWcLine(p, u)) + rv + '</span><span class="wk-sd">' + wkCpBtn(p, u, mwr) + wkDodBtn(p, u, mwr) + x9AddBtn(p, u, mwr) + x7DueHTML(p, u, pj) + st + '</span></li>';
    if (x8Lock(p, u)) h = x8LockHTML(h, sm);
    if (ask) h += wkFormHTML(p, u, mwr);
    return h;
  }
  /* "Done when…": an optional checklist a piece of work can carry, so Done says what it was measured against. It never blocks a status:
     marking Done with checks still open is allowed, and the toast says how many */
  var WK_DOD_MAX = 8;
  function wkDodHTML(p, u, pj) {
    if (!u.dod.length) return '';
    var n = u.dod.filter(function (c) { return c.ok; }).length, ro = !x9Can(p, u);
    return '<span class="wk-dod"><span class="wk-dod-h">Done when · ' + n + ' of ' + u.dod.length + '</span>' + u.dod.map(function (c, i) {
      return '<label class="wk-dc' + (c.ok ? ' ok' : '') + '"><input type="checkbox" data-wk="dod" data-id="' + esc(u.id) + '" data-i="' + i + '"' + (pj || '') + (c.ok ? ' checked' : '') + (ro ? ' disabled' : '') + '><span>' + esc(c.t) + '</span></label>';
    }).join('') + '</span>';
  }
  function wkDodBtn(p, u, mwr) {
    if (!x9Can(p, u) || (u.st === 'done' && !u.dod.length)) return '';
    return '<button type="button" class="x9-add wk-dodb' + (u.dod.length ? ' has' : '') + '" ' + (mwr ? 'data-mw="dod" data-pj="' + esc(p.id) + '"' : 'data-pd="wk:dod"') + ' data-id="' + esc(u.id) + '" aria-label="' + (u.dod.length ? 'Change what done means for ' : 'Say what done means for ') + esc(u.t) + '" title="Done when…">' + IC('check') + '</button>';
  }
  function wkDodOpen(p, id, h) {
    var u = wkUnit(p, id); if (!u) return;
    if (!x9Can(p, u)) { x8No(p); return; }
    var q = h.q(); q.sk = h.key(p, id); q.sf = 'dod'; h.re(h.sr);
  }
  function wkDodForm(p, u, mwr) {
    var fa = mwr ? 'data-mw-form="dod" data-pj="' + esc(p.id) + '"' : 'data-pd-form="wk:dod"', cancel = mwr ? 'data-mw="cancel" data-pj="' + esc(p.id) + '"' : 'data-pd="wk:cancel"', sr = mwr ? 'mw-sr' : 'wk-sr';
    return '<li class="prv-fw"><form class="prv-f wk-sf wk-dodf" ' + fa + ' data-id="' + esc(u.id) + '" novalidate><p class="x7-fh">' + IC('check') + '<span>“' + esc(prvT(u.t, 60)) + '” is done when… One check per line, up to ' + WK_DOD_MAX + '. Optional.</span></p>' +
      '<label class="sr-only" for="' + sr + '">Done when, one check per line</label><textarea id="' + sr + '" name="d" rows="' + Math.max(3, u.dod.length + 1) + '" maxlength="1200" placeholder="Tests pass&#10;Works on a phone&#10;The client saw it">' + esc(u.dod.map(function (c) { return c.t; }).join('\n')) + '</textarea>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + cancel + '>Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div>' + prvErrSpan() + '</form></li>';
  }
  function wkDodSubmit(f, h, p, u) {
    var lines = f.elements.d.value.split('\n').map(function (s) { return prvText(s).slice(0, 120); }).filter(Boolean), was = {}, list, q = h.q(), ti = prvT(u.t, 40);
    if (lines.length > WK_DOD_MAX) return prvErr(f, 'd', 'Keep it to ' + WK_DOD_MAX + ' checks. What matters most?');
    u.dod.forEach(function (c) { was[c.t] = c.ok; });
    list = lines.map(function (t) { return { t: t, ok: !!was[t] }; });
    q.sk = null; q.sf = '';
    if (JSON.stringify(list) === JSON.stringify(u.dod.map(function (c) { return { t: c.t, ok: !!c.ok }; }))) return h.re(h.sel(p, u.id) + ' .wk-dodb');
    wkApply(p, function () { wkSet(p, u.id, { dod: list }); }, list.length ? 'You set what done means for “' + ti + '”' : 'You cleared what done means for “' + ti + '”', list.length ? '“' + ti + '” is done when ' + list.length + (list.length === 1 ? ' check is' : ' checks are') + ' met' : 'No done-when checks on “' + ti + '”', h.sel(p, u.id) + ' .wk-dodb', u.id, h);
  }
  function wkGroupHTML(p, g, i, ppl) {
    var q = pd.wk, k = g.key, c = { todo: 0, doing: 0, review: 0, done: 0, stuck: 0, wait: 0 };
    g.us.forEach(function (u) { c[wkShow(u)]++; });
    var op = g.us.length - c.done, who = g.m, nm = who ? wkName(who) : 'Unassigned';
    var open = q.open[k] === undefined ? op > 0 : !!q.open[k];
    var av = who ? pdAv(who) : '<span class="av none" aria-hidden="true">' + IC('user') + '</span>';
    var role = who ? pdRoleName(who === ME ? x8Seen(p) : who.role) : 'No owner yet';
    var sub = [role, g.us.length ? (op ? op + ' open' : 'All done') : 'Nothing assigned', c.done && op ? c.done + ' done' : ''].filter(Boolean).join(' · ');
    var chips = (c.stuck ? '<span class="chip warn">' + c.stuck + ' stuck</span>' : '') + (c.review ? '<span class="chip">' + c.review + ' in review</span>' : '') + (c.wait ? '<span class="chip">' + c.wait + ' with client</span>' : '');
    var h = '<section class="card wk-g' + (who ? '' : ' un') + '" aria-labelledby="wk-h-' + i + '"><div class="wk-gh"><button type="button" class="wk-tg" data-pd="wk:tog" data-who="' + k + '" aria-expanded="' + open + '" aria-controls="wk-b-' + i + '">' + av +
      '<span class="wk-gt"><b id="wk-h-' + i + '">' + esc(nm) + '</b><small>' + esc(sub) + '</small></span><span class="wk-gs">' + chips + '</span>' + wkBar(c, who ? g.us.length : 0, nm) + IC('chev') + '</button>' +
      (!who && op ? '<button type="button" class="btn-ghost btn-sm wk-all" data-pd="wk:all">Assign all to me</button>' : '') + '</div>';
    if (!open) return h + '</section>';
    var openU = g.us.filter(function (u) { return u.st !== 'done'; }).sort(function (a, b) { return (WK_RANK[wkShow(a)] - WK_RANK[wkShow(b)]) || (a.i - b.i); }), doneU = g.us.filter(function (u) { return u.st === 'done'; }), rows = '';
    rows += openU.map(function (u) { return wkRowHTML(p, u, ppl); }).join('');
    if (doneU.length) {
      var sd = !!q.dn[k] || !openU.length && q.dn[k] === undefined;
      rows += (sd ? doneU.map(function (u) { return wkRowHTML(p, u, ppl); }).join('') : '') + '<li class="wk-dn"><button type="button" class="link" data-pd="wk:dn" data-who="' + k + '" aria-expanded="' + sd + '">' + (sd ? 'Hide done' : 'Show ' + doneU.length + ' done') + '</button></li>';
    }
    if (!g.us.length) rows = '<li class="wk-e">Nothing assigned yet. Give ' + esc(who ? who.n : 'them') + ' work from any row, in this list.</li>';
    return h + '<div class="wk-gb" id="wk-b-' + i + '"><ul class="wk-rs">' + rows + '</ul></div></section>';
  }
  function wkWorkHTML(p) {
    var s = wkStats(p), ppl = wkCan(p), h = '<div class="wk">' + wkProgressCard(p, s) + x7ImpactCard(p, s), gs = s.gs.slice(), vw = p.team.filter(function (m) { return m.role === 'Viewer'; });
    if (s.total) {
      if (s.un.us.length) gs.splice(s.unOpen ? 0 : gs.length, 0, s.un);
      h += gs.map(function (g, i) { return wkGroupHTML(p, g, i, ppl); }).join('');
      if (vw.length) h += '<p class="pd-note wk-vn">' + esc(prvList(vw.map(function (m) { return m.n; }))) + (vw.length > 1 ? ' are Viewers' : ' is a Viewer') + (p.kind === 'private' ? ': they will use what you build. Record what they say in Feedback.</p>' : ': they can read all of this, but cannot own work.</p>');
    }
    return h + '</div>';
  }
  /* a small read-only tag on Scope rows: who has it, and where it stands */
  function wkTag(p, id) { return wkTag0(p, id) + x9Mini(p, id) + wkVerChip(p, wkUnit(p, id)); }
  function wkTag0(p, id) {
    if (!p.team.length) { var su = wkUnit(p, id); return su ? wkStPill(su, '', true, p.kind === 'client') : ''; }
    var u = wkUnit(p, id); if (!u) return '';
    var show = wkShow(u), who = wkPerson(p, u.as);
    return '<button type="button" class="wk-tag ' + show + '" data-pd="goto" data-tab="team" data-f="wk" title="Owner and status. Change them in Team.">' + (who ? pdAv(who) : '<span class="av none" aria-hidden="true">' + IC('plus') + '</span>') + '<span>' + (who ? '' : 'No owner · ') + (WK_SH[show] || WK_NM[show]) + '</span></button>';
  }
  function pdTeamHTML(p) {
    var cta = x8Role(p) === 'Owner' ? '<button type="button" class="btn-primary" data-pd="invite">' + IC('plus') + '<span>Add people</span></button>' : '';
    /* v122 (94): the people first, at the left, with who waits on whom and the work; how the project is shared and what Editors see at
       the right (it was one card at the left and six at the right). v122 (93): Google Drive is on Overview only */
    return pdHeadHTML(p, 'team', cta) + '<div class="pd-cols pd-team"><div class="pd-col">' + pdPeopleCards(p) + x7WaitCard(p) + wkWorkHTML(p) + '</div><div class="pd-col">' + (p.dv ? '' : x8Card(p)) + dvSeeCard(p) + '</div></div>';
  }

  /* actions */
  function wkChange(t, h) {
    h = h || wkHostPd;
    var p = h.p(t), kind = t.getAttribute('data-wk'), id = t.getAttribute('data-id'), u = p && wkUnit(p, id), v = t.value, ti, who, cur, lbl;
    if (!u) return;
    if (!(h === wkHostMw && kind === 'st' && sdSample(p)) && x8BlockWk(p, kind, u, v)) { h.re(''); return; }   /* v131 (109) */
    ti = prvT(u.t, 40);
    if (kind === 'as') {
      who = wkPerson(p, v); cur = wkPerson(p, u.as);
      if (v && !who) return;
      if (cur === who) return;
      if (cur && who && x7Started(u)) { var hq = h.q(); hq.sk = h.key(p, id); hq.sf = 'ho'; hq.hto = wkKey(who); h.re(h.sr); return; }
      h.reveal(who ? wkKey(who) : 'none');
      wkApply(p, function () { wkSet(p, id, { as: who ? wkKey(who) : '' }); },
        'You ' + (!who ? 'unassigned' : who === ME ? 'took' : 'assigned') + ' “' + ti + '”' + (who && who !== ME ? ' to ' + who.n : ''),
        !who ? '“' + ti + '” has no owner now' : who === ME ? 'You own “' + ti + '”' : '“' + ti + '” assigned to ' + who.n, h.sel(p, id) + ' [data-wk="as"]', id, h);
    } else if (kind === 'due') {
      var nd = /^\d{4}-\d\d-\d\d$/.test(v) ? v : '';
      if ((u.due || '') === nd) return;
      wkApply(p, function () { wkSet(p, id, { due: nd }); }, nd ? 'You set “' + ti + '” for ' + x6Lbl(nd) : 'You took the date off “' + ti + '”', nd ? '“' + ti + '” is due ' + x6Rel(nd) : 'No date on “' + ti + '”', h.sel(p, id) + ' [data-wk="due"]', id, h);
    } else if (kind === 'st') {
      if (v === 'stuck' || v === 'wait') { if (wkShow(u) === v) return; var fq = h.q(); fq.sk = h.key(p, id); fq.sf = v; h.re(h.sr); return; }
      if (wkShow(u) === v) return;
      lbl = WK_NM[v].toLowerCase();
      var open = v === 'done' ? u.dod.filter(function (c) { return !c.ok; }).length : 0;
      wkApply(p, function () { wkSet(p, id, { st: v, stk: '', wc: null, by: null, sn: u.sn || (v !== 'todo' ? u.t : '') }); }, 'You set “' + ti + '” to ' + lbl + (open ? ' with ' + open + ' of its done-when checks open' : ''), '“' + ti + '” is now ' + lbl + (open ? '. ' + open + ' of ' + u.dod.length + ' done-when checks are still open.' : ''), h.sel(p, id) + ' [data-wk="st"]', id, h);
    } else if (kind === 'dod') {
      var di = +t.getAttribute('data-i'), dl = u.dod.map(function (c) { return { t: c.t, ok: !!c.ok }; }), dc = dl[di];
      if (!dc) return;
      dc.ok = !!t.checked;
      wkApply(p, function () { wkSet(p, id, { dod: dl }); }, 'You ' + (dc.ok ? 'checked' : 'unchecked') + ' “' + prvT(dc.t, 40) + '” on “' + ti + '”', dl.filter(function (c) { return c.ok; }).length + ' of ' + dl.length + ' done-when checks on “' + ti + '”', h.sel(p, id) + ' [data-wk="dod"][data-i="' + di + '"]', '', h);
    }
  }
  function wkSubmit(k, f, h) {
    h = h || wkHostPd;
    var p = h.p(f), id = f.getAttribute('data-id'), u = p && wkUnit(p, id), r, ti, q, sel, patch, prev, cv, now = Date.now();
    if ((k === 'ho' || k === 'back') && u) return x7Submit(k, f, h, p, u);
    if (k === 'gh' && u) return x9Submit(f, h, p, u);
    if (k === 'dod' && u) return wkDodSubmit(f, h, p, u);
    if (k === 'cp' && u) return wkCpSubmit(f, h, p, u);
    if ((k !== 'stuck' && k !== 'wait') || !u) return;
    q = h.q(); sel = h.sel(p, id) + ' [data-wk="st"]'; r = prvText(f.elements.r.value); ti = prvT(u.t, 40);
    if (k === 'stuck') {
      if (!r) return prvErr(f, 'r', 'Say what is blocking it, in a few words.');
      q.sk = null; q.sf = '';
      /* a unit that was Done is open again the moment it is stuck, or the mark would change nothing */
      patch = { stk: r, wc: null, by: x7ByVal(f) }; if (!u.sn) patch.sn = u.t; if (u.st === 'done') patch.st = 'doing';
      wkApply(p, function () { wkSet(p, id, patch); }, 'You marked “' + ti + '” stuck', '“' + ti + '” marked stuck', sel, id, h);
      return;
    }
    if (!r) return prvErr(f, 'r', 'Say what you are waiting for, in a few words.');
    prev = u.wc; cv = f.elements.c.value;
    patch = { wc: { why: r, ts: prev ? prev.ts : now, cd: cv === 'keep' ? (prev ? prev.cd : 0) : +cv ? now + (+cv) * PRV_DAY : 0 }, stk: '' }; if (u.st === 'done') patch.st = 'doing';
    q.sk = null; q.sf = '';
    wkApply(p, function () { wkSet(p, id, patch); }, 'You ' + (prev ? 'changed the wait on' : 'marked') + ' “' + ti + '”' + (prev ? '' : ' as waiting on the client'), prev ? 'Wait on “' + ti + '” updated' : '“' + ti + '” is waiting on the client', sel, id, h);
  }
  function wkReplied(p, id, h) {
    var u = wkUnit(p, id); if (!u || !u.wc) return;
    var ti = prvT(u.t, 40), back = WK_NM[u.st === 'done' ? 'doing' : u.st].toLowerCase();
    wkApply(p, function () { wkSet(p, id, { wc: null }); }, 'The client replied about “' + ti + '”', '“' + ti + '” is now ' + back, h.sel(p, id) + ' [data-wk="st"]', id, h);
  }
  function wkAct(act, a) {
    var p = pd.p, q = pd.wk, k = a.getAttribute('data-who');
    if (act === 'tog') { q.open[k] = a.getAttribute('aria-expanded') !== 'true'; pdRerender('.wk-tg[data-who="' + k + '"]'); }
    else if (act === 'dn') { q.dn[k] = a.getAttribute('aria-expanded') !== 'true'; pdRerender('[data-pd="wk:dn"][data-who="' + k + '"]'); }
    else if (act === 'wc') { q.sk = a.getAttribute('data-id'); q.sf = 'wait'; pdRerender('#wk-sr'); }
    else if (act === 'dod') wkDodOpen(p, a.getAttribute('data-id'), wkHostPd);
    else if (act === 'cp') wkCpOpen(p, a.getAttribute('data-id'), wkHostPd);
    else if (act === 'replied') wkReplied(p, a.getAttribute('data-id'), wkHostPd);
    else if (act === 'approve' || act === 'back' || act === 'ack') x7Act(act, p, a.getAttribute('data-id'), wkHostPd);
    else if (act === 'cancel') { var id = q.sk; q.sk = null; q.sf = ''; pdRerender(id ? '[data-it="' + id + '"] [data-wk="st"]' : ''); }
    else if (act === 'all') {
      var ids = wkStats(p).un.us.filter(function (u) { return u.st !== 'done'; }).map(function (u) { return u.id; });
      if (!ids.length) return;
      q.open.You = true;
      wkApply(p, function () { ids.forEach(function (id2) { wkSet(p, id2, { as: 'You' }); }); }, 'You took ' + itemsLbl(ids.length), 'You own ' + itemsLbl(ids.length) + ' now', '.wk-tg[data-who="You"]');
    }
  }

