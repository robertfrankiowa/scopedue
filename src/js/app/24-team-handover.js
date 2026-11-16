  /* ───────── v62: the team, on this device: a date per item, who is waiting on whom, handovers with what is needed to go on,
     a real review, and what a change to the scope touches (CONTRACT.md, section 21) ───────── */
  function x7Today() { return x6Iso(); }
  function x7Started(u) { return u.st === 'doing' || u.st === 'review' || !!u.stk; }
  function x7Name(p, key, you) { if (!key) return 'No owner'; var m = wkPerson(p, key) || (key === 'You' ? ME : (p.team.filter(function (x) { return x.e === key; })[0] || null)); return m ? (m === ME ? (you || 'You') : m.n) : 'Someone who left'; }
  function x7Av(p, key) { var m = key ? (wkPerson(p, key) || (key === 'You' ? ME : p.team.filter(function (x) { return x.e === key; })[0])) : null; return m ? pdAv(m) : '<span class="av none" aria-hidden="true">' + IC('user') + '</span>'; }
  /* what a stuck item says it waits on */
  function x7StuckHead(p, u) {
    var b = u.by;
    if (b && b.k === 'p') return b.ref === 'You' ? 'Waiting on you.' : 'Waiting on ' + x7Name(p, b.ref) + '.';
    if (b && b.k === 'u') { var v = wkUnit(p, b.ref); if (v) return 'Blocked by “' + prvT(v.t, 40) + '”' + (v.as ? ' (' + x7Name(p, v.as) + ')' : '') + '.'; }
    return 'Stuck.';
  }
  function x7LastHo(p, u) {
    var l = u.ho || [], h = l[l.length - 1]; if (!h || h.to !== u.as || u.st === 'done') return '';
    return '<small class="wk-ho"><b>Handed over by ' + esc(x7Name(p, h.from)) + ', ' + esc(wkAge(h.ts) === 'today' ? 'today' : wkAge(h.ts) + ' ago') + '.</b>' + (h.done ? ' Done: ' + esc(h.done) + '.' : '') + ' Next: ' + esc(h.next) + (h.where ? ' · Where: ' + esc(h.where) : '') + '</small>';
  }
  function x7DueHTML(p, u, pj) {
    var show = wkShow(u), d = u.due || '', td = x7Today();
    if (show === 'done' && !d) return '';
    var cls = !d ? ' none' : show === 'done' ? ' past' : d < td ? ' crit' : x6Ts(d) - x6Ts(td) <= 2 * X6_DAY ? ' warn' : '';
    var lbl = !d ? 'Date' : show !== 'done' && d < td ? 'Overdue · ' + x6Lbl(d) : (function (r) { return r.charAt(0).toUpperCase() + r.slice(1); })(x6Rel(d));
    return '<span class="wk-due' + cls + '">' + IC('clock') + '<span>' + esc(lbl) + '</span><input type="date" data-wk="due" data-id="' + u.id + '"' + (pj || '') + ' value="' + esc(d) + '" aria-label="' + esc((d ? 'Due ' + x6Lbl(d) + '. Change the date of ' : 'Set a date for ') + u.t) + '"></span>';
  }
  /* the stuck form: what it waits on, besides why */
  function x7BySel(p, u) {
    var ppl = wkCan(p).filter(function (m) { return wkKey(m) !== u.as; }), others = wkUnits(p).filter(function (v) { return v.id !== u.id && v.st !== 'done'; }), cur = u.by ? u.by.k + ':' + u.by.ref : '';
    return '<span class="wk-fc x7-by"><span class="wk-fl" aria-hidden="true">Waiting on</span><span class="pd-sel"><select name="by" aria-label="What it is waiting on"><option value="">Something else</option>' +
      (ppl.length ? '<optgroup label="A person">' + ppl.map(function (m) { var k = 'p:' + wkKey(m); return '<option value="' + esc(k) + '"' + (cur === k ? ' selected' : '') + '>' + esc(m === ME ? 'You' : m.n) + '</option>'; }).join('') + '</optgroup>' : '') +
      (others.length ? '<optgroup label="Another item">' + others.map(function (v) { var k = 'u:' + v.id; return '<option value="' + esc(k) + '"' + (cur === k ? ' selected' : '') + '>' + esc(prvT(v.t, 44)) + '</option>'; }).join('') + '</optgroup>' : '') +
      '</select>' + IC('chev') + '</span></span>';
  }
  function x7ByVal(f) { var v = f.elements.by ? f.elements.by.value : ''; if (!v) return null; var i = v.indexOf(':'); return { k: v.slice(0, i), ref: v.slice(i + 1) }; }
  /* the two forms Phase 3 adds under a row: a handover, and sending work back from review */
  function x7FormHTML(p, u, mwr, q) {
    var id = u.id, t = esc(u.t), pj = mwr ? ' data-pj="' + p.id + '"' : '', fa = mwr ? 'data-mw-form="' + q.sf + '"' : 'data-pd-form="wk:' + q.sf + '"', cancel = mwr ? 'data-mw="cancel"' : 'data-pd="wk:cancel"', sr = mwr ? 'mw-sr' : 'wk-sr';
    if (q.sf === 'ho') {
      var to = x7Name(p, q.hto), ho = (u.ho || [])[(u.ho || []).length - 1];
      return '<li class="prv-fw"><form class="prv-f wk-sf x7-hof" ' + fa + pj + ' data-id="' + id + '" data-to="' + esc(q.hto) + '" novalidate><p class="x7-fh">' + IC('swap') + '<span>Hand “' + t + '” over to <b>' + esc(to) + '</b>. Leave what they need to go on.</span></p>' +
        '<label class="x7-fl wide"><span>What to do next <em>Required</em></span><input id="' + sr + '" name="next" maxlength="200" placeholder="The first thing to do, so nobody has to ask" autocomplete="off"></label>' +
        '<label class="x7-fl"><span>What is done</span><input name="done" maxlength="200" placeholder="What is finished so far" autocomplete="off"></label>' +
        '<label class="x7-fl"><span>Where things are</span><input name="where" maxlength="200" placeholder="Files, branches, links" autocomplete="off" value="' + esc(ho && ho.where ? ho.where : '') + '"></label>' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + cancel + '>Cancel</button><button type="submit" class="btn-primary btn-sm">Hand over</button></div>' + prvErrSpan() + '</form></li>';
    }
    return '<li class="prv-fw"><form class="prv-f wk-sf" ' + fa + pj + ' data-id="' + id + '" novalidate><label class="sr-only" for="' + sr + '">What has to change on ' + t + '?</label><input id="' + sr + '" name="r" maxlength="200" placeholder="What has to change before it is done?" autocomplete="off">' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + cancel + '>Cancel</button><button type="submit" class="btn-primary btn-sm">Send back</button></div>' + prvErrSpan() + '</form></li>';
  }
  function x7Submit(k, f, h, p, u) {
    var q = h.q(), id = u.id, ti = prvT(u.t, 40), sel = h.sel(p, id) + ' [data-wk="as"]';
    if (k === 'ho') {
      var to = f.getAttribute('data-to'), who = wkPerson(p, to), from = u.as, nx = prvText(f.elements.next.value), dn = prvText(f.elements.done.value), wh = prvText(f.elements.where.value);
      if (!who) { q.sk = null; q.sf = ''; return h.re(); }
      if (nx.length < 3) return prvErr(f, 'next', 'Say what to do next, so ' + who.n + ' can start without asking.');
      q.sk = null; q.sf = ''; q.hto = '';
      h.reveal(wkKey(who));
      wkApply(p, function () { wkSet(p, id, { as: wkKey(who), ho: (u.ho || []).concat([{ ts: Date.now(), from: from, to: wkKey(who), done: dn, next: nx, where: wh }]) }); },
        'You handed “' + ti + '” from ' + x7Name(p, from) + ' to ' + wkName(who), '“' + ti + '” handed over to ' + wkName(who) + ', with a note', sel, id, h);
      return;
    }
    if (k === 'back') {
      var r = prvText(f.elements.r.value);
      if (r.length < 3) return prvErr(f, 'r', 'Say what has to change, so it comes back right.');
      q.sk = null; q.sf = '';
      wkApply(p, function () { wkSet(p, id, { st: 'doing', rb: { why: r, ts: Date.now() } }); }, 'You sent “' + ti + '” back: ' + r, '“' + ti + '” sent back to ' + x7Name(p, u.as), h.sel(p, id) + ' [data-wk="st"]', id, h);
    }
  }
  function x7Act(act, p, id, h) {
    var u = p && wkUnit(p, id); if (!u) return;
    var ti = prvT(u.t, 40), q = h.q();
    if ((act === 'approve' || act === 'back') && x8Role(p) !== 'Owner') { x8No(p); return; }
    if (act === 'approve') wkApply(p, function () { wkSet(p, id, { st: 'done', rb: null, ap: { ts: Date.now() }, stk: '', wc: null }); }, 'You approved “' + ti + '”', '“' + ti + '” approved and done', h.sel(p, id) + ' [data-wk="st"]', id, h);
    else if (act === 'back') { q.sk = h.key(p, id); q.sf = 'back'; h.re(h.sr); }
    else if (act === 'ack') wkApply(p, function () { wkSet(p, id, { sn: u.t }); }, x7Name(p, u.as) + ' saw what changed on “' + ti + '”', 'Marked as seen', h.sel(p, id) + ' [data-wk="st"]', id, h);
  }
  /* work on something that is no longer in the plan: removed from the Scope, or moved out of Now, while it was being done */
  function x7Orphans(p) {
    var out = [];
    if (p.kind === 'private') { if (p.pv) p.pv.items.forEach(function (x) { if (x.sec !== 'in' && x.as && (x.st === 'doing' || x.st === 'review' || x.stk)) out.push({ id: x.id, t: x.t, as: x.as, where: PRV_BN[x.sec] || 'out of Now' }); }); return out; }
    var w = p.work || {}, live = {};
    wkUnits(p).forEach(function (u) { live[u.id] = 1; });
    Object.keys(w).forEach(function (id) { var r = w[id]; if (!live[id] && r && r.as && (r.st === 'doing' || r.st === 'review' || r.stk)) out.push({ id: id, t: r.sn || 'A removed deliverable', as: r.as, where: 'removed from the Scope' }); });
    return out;
  }
  function x7StopOrphan(p, id) {
    var snap = snapOf(p), o = x7Orphans(p).filter(function (x) { return x.id === id; })[0]; if (!o) return;
    if (p.kind === 'private') { var x = prvById(p.pv.items, id); x.st = 'planned'; x.stk = ''; x.by = null; x.as = ''; }
    else delete p.work[id];
    var un = prvNote(p, 'You stopped the work on “' + prvT(o.t, 40) + '”, which left the plan'); wkAfter(p);
    pdRerender('.wk');
    showToast('Work stopped on “' + prvT(o.t, 30) + '”. Tell ' + x7Name(p, o.as) + '.', function () { snapBack(p, snap); un(); wkAfter(p); undone(p); });
  }
  /* the card: what changed after work started, and work on things no longer in the plan */
  function x7ImpactCard(p, s) {
    var ch = s.us.filter(function (u) { return u.chg; }), orph = x7Orphans(p);
    if (!ch.length && !orph.length) return '';
    var h = '<section class="card pd-card x7-imp" aria-labelledby="pd-h-imp"><div class="card-h ruled"><div><h3 id="pd-h-imp">Changed after work started</h3><p>The scope changed after work started. Make sure the person doing it knows.</p></div><div class="h-actions"><span class="chip warn">' + (ch.length + orph.length) + '</span></div></div><ul class="x7-il">';
    ch.forEach(function (u) {
      h += '<li>' + x7Av(p, u.as) + '<div class="grow"><b>' + esc(u.t) + '</b><small>' + esc(x7Name(p, u.as)) + ' started it as “' + esc(prvT(u.sn, 70)) + '”</small></div><button type="button" class="btn-ghost btn-sm" data-pd="wk:ack" data-id="' + u.id + '">' + esc(u.as === 'You' ? 'Got it' : x7Name(p, u.as) + ' knows') + '</button></li>';
    });
    orph.forEach(function (o) {
      h += '<li>' + x7Av(p, o.as) + '<div class="grow"><b>' + esc(o.t) + '</b><small>' + esc(x7Name(p, o.as)) + ' was working on it when it was ' + esc(/^removed/.test(o.where) ? o.where : 'moved to ' + o.where) + '</small></div><button type="button" class="btn-ghost btn-sm" data-pd="x7:stop" data-id="' + esc(o.id) + '">Stop the work</button></li>';
    });
    return h + '</ul></section>';
  }
  /* who cannot move until someone else does */
  function x7Edges(p) {
    var us = wkUnits(p).filter(function (u) { return u.st !== 'done'; }), out = [];
    var target = function (u, depth) {
      var show = wkShow(u);
      if (show === 'review') return { to: x8RevTo(p), why: 'to review it' };
      if (show === 'wait') return { to: 'client', why: u.wc ? u.wc.why : 'the client' };
      if (u.stk && u.by && u.by.k === 'p') return { to: u.by.ref, why: u.stk };
      if (u.stk && u.by && u.by.k === 'u') {
        var v = us.filter(function (x) { return x.id === u.by.ref; })[0];
        if (!v) return null;
        var t = { to: v.as || '', via: v, why: u.stk }, nx = depth < 3 ? target(v, depth + 1) : null;
        if (nx) t.then = nx;
        return t;
      }
      if (u.stk) return { to: '', why: u.stk };
      return null;
    };
    us.forEach(function (u) { var t = target(u, 0); if (t) out.push({ u: u, from: u.as || '', t: t }); });
    out.sort(function (a, b) { return (a.t.to === 'You' ? 0 : 1) - (b.t.to === 'You' ? 0 : 1); });
    return out;
  }
  function x7Party(p, k) {
    if (k === 'client') { var c = byId(p.cid); return '<span class="x7-pt"><span class="av cl" aria-hidden="true">' + esc(initials((c && c.contact) || 'C')) + '</span>' + esc(c ? given(c) : 'The client') + '</span>'; }
    if (!k) return '<span class="x7-pt none">' + x7Av(p, '') + 'Nobody named</span>';
    return '<span class="x7-pt">' + x7Av(p, k) + esc(x7Name(p, k)) + '</span>';
  }
  function x7WaitCard(p) {
    var e = x7Edges(p), you = e.filter(function (x) { return x.t.to === 'You'; }).length;
    var h = '<section class="card pd-card" aria-labelledby="pd-h-wow"><div class="card-h ruled"><div><h3 id="pd-h-wow">Who is waiting on whom</h3><p>' + (e.length ? (you ? (you === 1 ? 'One item waits on you.' : you + ' items wait on you.') + ' Start there.' : 'Nothing waits on you.') : 'Nobody is waiting on anyone.') + '</p></div>' + (e.length ? '<div class="h-actions"><span class="count">' + e.length + '</span></div>' : '') + '</div>';
    if (!e.length) return h + '<div class="cd-empty">' + IC('tick') + 'Everyone can move. Stuck items and reviews show up here, with who they wait on.</div></section>';
    h += '<ul class="x7-wl">' + e.map(function (x) {
      var t = x.t, chain = '';
      for (var n = t.then; n; n = n.then) chain += '<span class="x7-ar" aria-hidden="true">→</span>' + x7Party(p, n.to);
      return '<li class="' + (t.to === 'You' ? 'you' : '') + '"><div class="x7-flow">' + x7Party(p, x.from) + '<span class="x7-ar" aria-label="waits on">→</span>' + x7Party(p, t.to) + chain + '</div>' +
        '<p><b>“' + esc(prvT(x.u.t, 50)) + '”</b> ' + esc(t.via ? 'is blocked by “' + prvT(t.via.t, 40) + '”' + (t.then ? ', which waits too' : '') + '. ' + t.why : t.why.charAt(0).toUpperCase() + t.why.slice(1)) + '</p></li>';
    }).join('') + '</ul></section>';
    return h;
  }
  /* facts for Needs: changed under someone, work on removed items, items ready again */
  function x7Needs(p, s) {
    var out = [], t = function (u) { return '“' + prvT(u.t, 36) + '”'; };
    var ch = s.us.filter(function (u) { return u.chg; }), orph = x7Orphans(p), fr = s.us.filter(function (u) { return u.freed && u.st !== 'done'; });
    if (ch.length) out.push({ t: ch.length === 1 ? '1 item changed after work started' : ch.length + ' items changed after work started', chip: 'warn', chipT: 'Changed', tab: 'team', f: 'wk', p: t(ch[0]) + ' (' + x7Name(p, ch[0].as) + ') is not what was started. Make sure they know.' });
    if (orph.length) out.push({ t: orph.length === 1 ? 'Work on 1 item that left the plan' : 'Work on ' + orph.length + ' items that left the plan', chip: 'warn', chipT: 'Left the plan', tab: 'team', f: 'wk', p: '“' + prvT(orph[0].t, 36) + '” (' + x7Name(p, orph[0].as) + ') was ' + orph[0].where + '. Stop the work, or put it back.' });
    if (fr.length) out.push({ t: fr.length === 1 ? '1 item is ready again' : fr.length + ' items are ready again', chip: '', chipT: '', tab: 'team', f: 'wk', p: t(fr[0]) + ': what it waited on is done.' });
    return out;
  }
  /* a scope edit or removal under work someone started: say so where it happens */
  function x7Warn(p, id, how) {
    var r = p.kind === 'private' ? (p.pv ? prvById(p.pv.items, id) : null) : (p.work || {})[id];
    if (!r || !r.as || !(r.st === 'doing' || r.st === 'review' || r.stk)) return '';
    var n = x7Name(p, r.as);
    if (how === 'rm') return 'Removed. ' + (r.as === 'You' ? 'You were' : n + ' was') + ' working on it. Stop the work in Team.';
    return r.as === 'You' ? '' : 'Updated. ' + n + ' is working on it and will see what changed.';
  }
  function x7Init() {
    /* what each started item was started as, from now on (older records had no such field) */
    PROJECTS.forEach(function (p) {
      if ((p.kind === 'client' && !p.sc) || (p.kind === 'private' && !p.pv)) return;
      wkUnits0(p).forEach(function (u) {
        if (!x7Started(u)) return;
        var r = p.kind === 'private' ? prvById(p.pv.items, u.id) : (p.work || {})[u.id];
        if (r && !r.sn) r.sn = u.t;
      });
    });
    document.addEventListener('click', function (e) { var i = e.target.closest && e.target.closest('input[data-wk="due"]'); if (i && i.showPicker) { try { i.showPicker(); } catch (x) {} } });
  }

