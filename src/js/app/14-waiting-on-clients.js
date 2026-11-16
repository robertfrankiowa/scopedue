  /* ---------- Waiting on clients: what a client was asked to do, and has not done yet ---------- */
  /* One derivation, read everywhere: this page, the Dashboard counts, the sidebar badge, the notifications and each project's Needs.
     Three things can wait on a client: a Scope you issued that is not approved, a Change whose next move is theirs, and work you marked as waiting on them.
     Scope and Change are due a chase CA_DAYS after they were sent, or after your last reminder. Work is chased on the date you chose for it.
     The only thing kept here is when you last reminded someone (p.nudge for Scope and Change, wc.rem for work) */
  var CA_DAYS = 3;
  var caBody = document.getElementById('ca-body'), caSubEl = document.getElementById('ca-sub'), caBadgeEl = document.getElementById('ca-badge');
  var caUi = { cid: '' };
  function caAt(ts, s) { var w = ts || (s ? (pdParseWhen(s) || {}).t : 0); return w || Date.now(); }
  /* v132 (110): a client's question gets the server's title "Question about Scope v1", so two questions read the same. Here it is
     named by its own words: the start of what the client asked */
  function caCrQ(cr) {
    var e = cr.entries[0];
    return /^Question about Scope v\d+$/.test(cr.t) && e && e.w === 'c' && e.tx ? String(e.tx).replace(/\s+/g, ' ').trim() : '';
  }
  function caCrName(cr) { var q = caCrQ(cr); return q ? caCut(q, 96) : cr.t; }
  /* v133 (110): a long text is cut where a phrase ends (a comma, a full stop) if one is near the end, else where a word ends;
     never inside a word ("bắt buộc p…") */
  function caCut(s, n) {
    if (s.length <= n) return s;
    var c = s.slice(0, n + 1), m, p = -1, re = /[,.;:!?](?=\s)/g, i = c.lastIndexOf(' ');
    while ((m = re.exec(s)) && m.index <= n) p = m.index;
    return (p > n * 0.6 ? c.slice(0, p) : i > n * 0.6 ? c.slice(0, i) : c.slice(0, n)).replace(/[\s,.;:!?–—-]+$/, '') + '…';
  }
  function caItems(p) {
    var out = [], c = p.kind === 'client' && p.sc ? byId(p.cid) : null, g, l, nz, now = Date.now();
    if (!c) return out;
    g = given(c) || 'the client'; nz = p.nudge || {}; l = pdLatest(p);
    function add(it) {
      it.p = p; it.c = c; it.g = g; it.n = out.length;
      it.title = it.lead ? it.lead + ' ' + it.name : it.name;
      if (it.dueAt == null) it.dueAt = (it.rem || it.ts) + CA_DAYS * DAY_MS;
      it.due = it.dueAt > 0 && it.dueAt <= now;
      out.push(it);
    }
    if (l && !l.appr) {
      var prev = pdVer(p, l.v - 1);
      add({ k: 'sc', id: 'sc' + l.v, v: l.v, lead: '', name: 'Approve Scope v' + l.v, short: 'Scope v' + l.v, lbl: 'Scope approval', ts: caAt(l.ts, l.at), rem: nz['sc' + l.v] || 0, atS: l.at,
        sub: prev && prev.appr ? 'The trusted baseline stays v' + prev.v + ' until ' + g + ' approves it' : 'Nothing is protected until ' + g + ' approves it', go: { tab: 'scope', f: '', cr: '' } });
    }
    pdCrList(p).forEach(function (cr) {
      if (pdCrState(cr) !== 'client' || pdExpired(cr)) return;
      var last = cr.entries[cr.entries.length - 1], q = pdQuoteEntry(cr);
      /* v132 (110): said as what the client has to do. The quote's last day is a field of its own (vu), shown apart on this page */
      add({ k: 'cr', id: cr.id, lead: cr.id, name: caCrName(cr), full: caCrQ(cr), short: cr.id, lbl: 'Change request', ty: last.ty, ts: caAt(last.ts, last.at), rem: nz[cr.id] || 0, atS: String(last.at || '').split(' · ')[0],
        sub: last.ty === 'quote' ? g + ' needs to accept or decline your quote' : g + ' owes you an answer', vu: q && q.w === 'y' && q.vu ? q.vu : 0, go: { tab: 'change', f: '', cr: cr.id } });
    });
    /* v137 (115): a share of the agreed price that is due, not marked Handled, and not reported paid by the client. It is chased on
       its due day, then CA_DAYS after each reminder. The studio sends the reminder; ScopeDue sends nothing about money by itself */
    if (agV2(p)) {
      var M = agM(p), meth = M.gov ? String((M.rules || {}).meth || '').trim() : '';
      (M.gov ? M.sched : []).forEach(function (s) {
        var key = 'pay:' + (s.k === 'dep' ? 'dep' : s.id), rp = s.rep;
        if (!s.due || s.due > now || (p.dis && p.dis[key]) || (rp && rp.ty === 'paid')) return;
        var amt = M.price != null && s.amt != null ? pdMoney(s.amt, p.cur) : '', nm = s.k === 'dep' ? 'The share due at start' : s.k === 'cr' ? 'Payment for ' + s.t : s.t + '’s share';
        add({ k: 'pay', id: key, lead: '', name: nm, short: s.k === 'dep' ? 'the share due at start' : s.k === 'cr' ? s.id : s.t + '’s share', dn: s.k === 'dep' ? 'the share due at start' : s.k === 'cr' ? s.t : s.t + '’s share', lbl: 'Payment', ts: s.due, rem: nz[key] || 0, atS: prvDate(s.due), amt: amt, meth: meth,
          sub: amt ? g + ' owes you ' + amt + ', due since ' + prvDate(s.due) : g + ' owes you this payment, due since ' + prvDate(s.due),
          dueAt: nz[key] ? nz[key] + CA_DAYS * DAY_MS : s.due, go: { tab: 'delivery', f: '', cr: '' } });
      });
    }
    wkUnits(p).forEach(function (u) {
      if (wkShow(u) !== 'wait') return;
      add({ k: 'wk', id: u.id, u: u, lead: '', name: u.t, short: '“' + prvT(u.t, 28) + '”', lbl: 'Needed from ' + g, ts: u.wc.ts, rem: u.wc.rem || 0, atS: prvDate(u.wc.ts), sub: String(u.wc.why).replace(/[.\s]+$/, ''), dueAt: u.wc.cd || 0,
        go: { tab: p.team.length ? 'team' : 'scope', f: p.team.length ? 'wk' : '', cr: '' } });
    });
    return out;
  }
  /* grouped by client, because a reminder goes to a person: the ones to chase first, then whoever has waited longest */
  function caCollect() {
    var by = {}, gs = [], out = { gs: gs, n: 0, chase: 0, next: null }, now = Date.now();
    PROJECTS.forEach(function (p) {
      caItems(p).forEach(function (it) {
        var g = by[it.c.id];
        if (!g) { g = by[it.c.id] = { c: it.c, items: [], due: 0, ord: gs.length, since: it.ts }; gs.push(g); }
        g.items.push(it); out.n++;
        if (it.ts < g.since) g.since = it.ts;
        if (it.due) { g.due++; out.chase++; } else if (it.dueAt > now && (!out.next || it.dueAt < out.next.dueAt)) out.next = it;
      });
    });
    gs.forEach(function (g) { g.items.sort(function (a, b) { return (b.due - a.due) || (a.ts - b.ts) || (a.n - b.n); }); });
    gs.sort(function (a, b) { return ((b.due > 0) - (a.due > 0)) || (a.since - b.since) || (a.ord - b.ord); });
    return out;
  }
  function caGroup(cid) { return caCollect().gs.filter(function (g) { return g.c.id === cid; })[0] || null; }
  function caBadge() {
    if (!caBadgeEl) return;
    var n = caCollect().chase;
    caBadgeEl.textContent = n; caBadgeEl.hidden = !n;
    caBadgeEl.setAttribute('aria-label', n + (n === 1 ? ' client item to chase' : ' client items to chase'));
  }
  function caSub(c) {
    if (!c.n) return 'Nothing is waiting on a client.';
    var cl = c.gs.length + (c.gs.length === 1 ? ' client' : ' clients');
    /* v132 (110): when everything is due, the count is said once */
    if (c.chase === c.n) return c.n + (c.n === 1 ? ' item' : ' items') + ' to chase from ' + cl + '.';
    return c.n + (c.n === 1 ? ' item' : ' items') + ' with ' + cl +
      (c.chase ? ', ' + c.chase + ' to chase.' : '. Nothing to chase yet' + (c.next ? ', next on ' + prvDate(c.next.dueAt) : '') + '.');
  }
  function caAgo(ts) { var a = wkAge(ts); return a === 'today' ? 'today' : a + ' ago'; }
  /* the right-hand column: how long, as one figure, and under it only what is worth saying.
     v132 (110): "Chase now" only where a group holds rows that are not due yet; when all are, the dot and the button say it */
  function caState(it, mixed) {
    var d = Math.max(0, Math.floor((Date.now() - it.ts) / DAY_MS)), ch = it.due ? (mixed ? 'Chase now' : '') : it.dueAt > 0 ? 'Chase ' + prvDate(it.dueAt) : 'No chase date';
    var h = '<span class="ca-age" title="' + esc('Since ' + prvDate(it.ts)) + '">' + (d ? '<b>' + d + '</b><small>' + (d === 1 ? 'day waiting' : 'days waiting') + '</small>' : '<b class="tw">Today</b><small>Sent</small>') + '</span>';
    if (ch) h += '<span class="ca-ch' + (it.due ? ' due' : '') + '">' + ch + '</span>';
    if (it.rem) h += '<span class="ca-rm">Reminded ' + caAgo(it.rem) + '</span>';
    return h;
  }
  /* v132 (110): no kind line over a Change (its CR number says it); the project's name only when a client has more than one */
  function caRowHTML(it, multi, mixed) {
    var go = it.go, k = [it.k !== 'cr' ? it.lbl : '', multi ? it.p.n : ''].filter(Boolean).join(' · ');
    return '<li class="ca-r' + (it.due ? ' due' : '') + '" data-pj="' + it.p.id + '" data-it="' + it.id + '"><span class="tx">' + (k ? '<span class="ca-k">' + esc(k) + '</span>' : '') +
      '<a href="#" class="ca-t" data-db-go="' + it.p.id + '" data-tab="' + go.tab + '"' + (it.full && it.full !== it.name ? ' title="' + esc(it.full) + '"' : '') + (go.f ? ' data-f="' + go.f + '"' : '') + (go.cr ? ' data-cr="' + go.cr + '"' : '') + '>' + (it.due ? '<i class="ca-dot" aria-hidden="true"></i><span class="sr-only">Time to chase: </span>' : '') + (it.lead ? '<span class="id">' + esc(it.lead) + '</span>' : '') + esc(it.name) + '</a>' +
      '<small class="ca-why"><span>' + esc(it.sub) + '</span>' + (it.vu ? '<span class="ca-vu">Valid until ' + esc(prvDate(it.vu)) + '</span>' : '') + '</small>' +
      (it.k === 'wk' ? '<span class="ca-wc"><button type="button" class="link" data-ca="replied" data-pj="' + it.p.id + '" data-id="' + it.id + '" aria-label="' + esc(it.g + ' replied about ' + it.name) + '">Client replied</button></span>' : '') +
      '</span><span class="ca-st">' + caState(it, mixed) + '</span>' + IC('chev') + '</li>';
  }
  /* v132 (110): the portal said as a fact with a date. The dot is green only when the client opened it after the last thing sent there */
  function caPortalHTML(c, g) {
    var pt = PORTAL[c.portal] || PORTAL.draft, sent = 0, st, dot = pt[0], tip = '';
    g.items.forEach(function (it) { if (it.k !== 'wk' && it.k !== 'pay' && it.ts > sent) sent = it.ts; });   /* a payment's day is not something sent */
    if (c.portal === 'active' && c.seenTs) {
      st = 'Opened the portal ' + (dayStart(c.seenTs) === dayStart() ? 'today' : prvDate(c.seenTs));
      if (sent && sent > c.seenTs) { dot = 'warn'; tip = 'Not opened since you last sent something there'; }
    } else st = c.portal === 'active' ? (c.ptS || pt[1]) : pt[1];
    return '<span class="ca-pt"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><i class="pd ' + dot + '" aria-hidden="true"></i>' + esc(st) + (tip ? '<span class="sr-only">' + esc(tip) + '</span>' : '') + '</span>';
  }
  function caGroupHTML(g) {
    var c = g.c, gv = given(c) || 'the client', pjs = {}, np = 0, portal = 0, note = '', mixed = g.due > 0 && g.due < g.items.length;
    g.items.forEach(function (it) { if (!pjs[it.p.id]) { pjs[it.p.id] = 1; np++; } if (it.k !== 'wk') portal++; });
    /* Scope and Change reach a client through the portal. If they never opened it, nothing sent there has been seen */
    if (portal && c.portal === 'invited') note = gv + ' has not opened the portal yet, so nothing you sent there has been seen.';
    else if (portal && c.portal === 'draft') note = gv + ' is not invited to the portal, so the Scope and Changes below cannot be seen.';
    return '<section class="card ca-g" aria-labelledby="ca-g-' + c.id + '"><div class="ca-gh"><span class="ca-av" aria-hidden="true">' + esc(c.ini) + '</span>' +
      '<span class="ca-gt"><h2 id="ca-g-' + c.id + '">' + esc(c.name) + '</h2><small>' + esc([c.contact, c.role].filter(Boolean).join(' · ')) + '</small>' + caPortalHTML(c, g) + '</span>' +
      (mixed ? '<span class="chip warn ca-gs">' + g.due + ' to chase</span>' : '') +
      '<button type="button" class="' + (g.due ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-ca="remind" data-cid="' + c.id + '" aria-label="' + esc('Write a reminder to ' + (c.contact || c.name) + ' about ' + itemsLbl(g.items.length)) + '">Remind ' + esc(gv) + '</button></div>' +
      (note ? '<p class="ca-note">' + esc(note) + '</p>' : '') +
      '<ul class="ca-rs">' + g.items.map(function (it) { return caRowHTML(it, np > 1, mixed); }).join('') + '</ul></section>';
  }
  function caClearHTML() {
    return '<section class="card mw-clear" aria-labelledby="ca-h-clear"><span class="mw-ok" aria-hidden="true">' + IC('tick') + '</span><h2 id="ca-h-clear">Nothing is waiting on a client</h2>' +
      '<p>A Scope you issue, a quote you send and work you are waiting on a client for all show up here until they answer.</p>' +
      '<button type="button" class="btn-ghost btn-sm" data-view="clients">Go to Clients</button></section>';
  }
  function caRender() {
    var c = caCollect();
    caBody.innerHTML = c.n ? c.gs.map(caGroupHTML).join('') : caClearHTML();
    caSubEl.textContent = caSub(c);
    caBadge();
  }
  /* after a change the row may have left the page. Focus goes to the row that took its place */
  function caRerender(focus) {
    var ae = document.activeElement, rows = caBody.querySelectorAll('li.ca-r'), row = ae && ae.closest ? ae.closest('li.ca-r') : null, idx = row ? [].indexOf.call(rows, row) : -1, f;
    caRender();
    f = focus && caBody.querySelector(focus);
    if (!f && idx > -1) { var r2 = caBody.querySelectorAll('li.ca-r'), r = r2[Math.min(idx, r2.length - 1)]; f = r && r.querySelector('.ca-t'); }
    if (!f) f = document.getElementById('ca-title');
    if (f) f.focus({ preventScroll: true });
  }
  function caEnter() { caRender(); }
  var wkHostCa = {
    p: function (el) { return pdById(el.getAttribute('data-pj')); }, q: function () { return { sk: null, sf: '' }; }, key: function (p, id) { return p.id + '|' + id; },
    sel: function (p, id) { return '[data-pj="' + p.id + '"][data-it="' + id + '"]'; }, sr: '', root: function () { return caBody; },
    re: function (f) { caRerender(f); }, reveal: function () {}
  };
  caBody.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ca]'); if (!a || !caBody.contains(a)) return;
    e.preventDefault();
    var act = a.getAttribute('data-ca');
    if ((act === 'remind' && sdSampleC(byId(a.getAttribute('data-cid')))) || (act === 'replied' && sdSample(pdById(a.getAttribute('data-pj'))))) { sdSampleNo(); return; }   // v120 (88)
    if (act === 'remind') { caUi.cid = a.getAttribute('data-cid'); if (caGroup(caUi.cid)) openDrawer('remind', a); }
    else if (act === 'replied') wkReplied(pdById(a.getAttribute('data-pj')), a.getAttribute('data-id'), wkHostCa);
  });

  /* the reminder: one message to one person, about everything they owe you. You send it; ScopeDue writes it and keeps the record */
  var rmT = document.getElementById('rm-t'), rmMail = document.getElementById('rm-mail'), rmGo = document.getElementById('rm-go');
  var CA_N = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  function caLower(s) { return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  /* work is noted from your side: "photos from Phát" reads oddly when it is sent to Phát */
  function caYou(s, gv) { return s.replace(new RegExp('\\b(from|by|for) ' + gv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), '$1 you'); }
  function caSubject(g) {
    var pj = {}, names = [];
    g.items.forEach(function (it) { if (!pj[it.p.id]) { pj[it.p.id] = 1; names.push(it.p.n); } });
    return sdTo(clLang(g.c), 'Following up: ' + (names.length === 1 ? names[0] : 'your projects'));
  }
  function caDraft(g) {
    var c = g.c, gv = given(c) || 'there', its = g.items, n = its.length, pj = {}, names = [], multi, portal = 0, h = [];
    its.forEach(function (it) { if (!pj[it.p.id]) { pj[it.p.id] = 1; names.push(it.p.n); } if (it.k !== 'wk') portal++; });
    multi = names.length > 1;
    h.push('Hi ' + gv + ',', '', 'A quick follow-up on ' + (multi ? 'your projects' : names[0]) + '. ' + (n === 1 ? 'One thing is' : (CA_N[n] || n) + ' things are') + ' still waiting on you:', '');
    its.forEach(function (it) {
      var t = it.k === 'sc' ? 'Approve Scope v' + it.v + ' (sent ' + it.atS + ')'
        : it.k === 'cr' ? (it.ty === 'quote' ? 'Accept or decline my quote for ' + it.id + ', ' + it.name + ' (sent ' + it.atS + ')' : 'Reply on ' + it.id + ', ' + it.name)
        : it.k === 'pay' ? (it.amt ? it.amt + ' for ' + it.dn + ', due ' + it.atS : it.name + ', due ' + it.atS)   /* v137 (115): "$1,200 for the share due at start, due 12 Nov" */
        : it.name + ': ' + caLower(caYou(it.sub, gv));
      h.push('• ' + (multi ? it.p.n + ': ' : '') + t);
    });
    h.push('');
    /* v137 (115): how to pay, as the agreement says it, once when every payment here says the same; and the portal's "I've paid this" */
    var pays = its.filter(function (it) { return it.k === 'pay'; }), mt = pays.length && pays.every(function (it) { return it.meth === pays[0].meth; }) ? pays[0].meth : '';
    if (mt) h.push('How to pay: ' + mt, '');
    if (pays.length) h.push(c.portal === 'active' ? 'If you have already paid, you can say so in your project portal and I will check it.' : 'If you have already paid, just tell me and I will check it.', '');
    if (portal && c.portal === 'active') h.push('You can approve and reply in your project portal.', '');
    else if (portal && c.portal === 'invited') h.push('It all happens in your project portal. If you cannot find the invitation, tell me and I will send it again.', '');
    h.push('Thank you!');
    /* v68: written in the client's language (set on the client); it stays editable before it is sent */
    var cl = clLang(c);
    return h.map(function (l) { var m = /^(• )(.*)$/.exec(l); return !l ? l : m ? m[1] + sdTo(cl, m[2]) : sdTo(cl, l); }).join('\n');
  }
  /* the box grows with the message, so the whole of it is in view before it is copied */
  function rmFit() { rmT.style.height = 'auto'; rmT.style.height = Math.min(rmT.scrollHeight + 2, 460) + 'px'; }
  function rmMailSync() {
    var g = caGroup(caUi.cid), c = g && g.c, t = rmT.value;
    rmMail.hidden = !c || !c.email;
    if (c && c.email) rmMail.href = 'mailto:' + c.email + '?subject=' + encodeURIComponent(caSubject(g)) + '&body=' + encodeURIComponent(t.replace(/\n/g, '\r\n'));
    rmGo.disabled = !t.trim();
  }
  function rmOnOpen() {
    var g = caGroup(caUi.cid), c; if (!g) return null;
    c = g.c;
    document.getElementById('rm-title').textContent = 'Remind ' + (given(c) || 'the client');
    document.getElementById('rm-av').textContent = initials(c.contact || c.name);
    document.getElementById('rm-pn').textContent = c.contact || c.name;
    document.getElementById('rm-ps').textContent = [c.name, c.email].filter(Boolean).join(' · ');
    document.getElementById('rm-cov').innerHTML = g.items.map(function (it) {
      return '<li><span>' + (it.lead ? '<span class="id">' + esc(it.lead) + '</span>' : '') + esc(it.name) + '</span><small>' + esc(wkWaited(it.ts)) + '</small></li>';
    }).join('');
    rmT.value = caDraft(g); rmFit(); rmT.scrollTop = 0;
    /* v68: a client who reads Vietnamese while ScopeDue is in English: the dictionary comes once, then the draft is written again (if untouched) */
    var d0 = rmT.value; if (window.SDI18N && SDI18N.load) SDI18N.load(clLang(c), function () { var g2 = caGroup(caUi.cid); if (g2 && g2.c === c && rmT.value === d0) { rmT.value = caDraft(g2); rmFit(); rmMailSync(); } });
    rmMailSync();
    return '#rm-t';
  }
  /* what a reminder changes: Scope and Change remember when, work moves its chase date on. Each project gets a line in History */
  function caLog(cid, how) {
    var g = caGroup(cid); if (!g) return;
    var now = Date.now(), byP = {}, undos = [], gv = given(g.c) || 'the client';
    g.items.forEach(function (it) { (byP[it.p.id] = byP[it.p.id] || { p: it.p, its: [] }).its.push(it); });
    var ps = Object.keys(byP).map(function (id) { return byP[id].p; });
    ps.forEach(function (p) {
      var its = byP[p.id].its, snap = snapOf(p), nz0 = JSON.stringify(p.nudge || {}), undoNote;
      its.forEach(function (it) {
        if (it.k === 'wk') { var w = it.u.wc; wkSet(p, it.id, { wc: { why: w.why, ts: w.ts, cd: w.cd > 0 ? now + CA_DAYS * DAY_MS : w.cd, rem: now } }); }
        else (p.nudge || (p.nudge = {}))[it.id] = now;
      });
      undoNote = prvNote(p, 'You reminded ' + gv + ' about ' + (its.length > 3 ? itemsLbl(its.length) : prvList(its.map(function (it) { return it.short; }))));
      undos.push(function () { snapBack(p, snap); p.nudge = JSON.parse(nz0); undoNote(); });
    });
    closeDrawer(true);
    ps.forEach(pdRefreshBadges);
    if (curView === 'actions') caRerender('[data-ca="remind"][data-cid="' + cid + '"]');
    showToast((how === 'copy' ? 'Copied. ' : '') + 'Reminder logged for ' + gv, function () {
      undos.forEach(function (u) { u(); });
      ps.forEach(pdRefreshBadges);
      if (curView === 'actions') caRender();
    });
  }
  function rmCopy() {
    var t = rmT.value; if (!t.trim()) return;
    copyText(t, function () { caLog(caUi.cid, 'copy'); });
  }
  rmT.addEventListener('input', function () { rmFit(); rmMailSync(); });
  rmT.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); rmCopy(); } });
  rmGo.addEventListener('click', rmCopy);
  rmMail.addEventListener('click', function (e) {
    if (rmMail.hidden || !rmT.value.trim()) { e.preventDefault(); return; }
    caLog(caUi.cid, 'mail');
  });

  /* the Dashboard counts what is with a client from the same derivation as Waiting on clients, and what a client is waiting on you for.
     A Change is waiting on you when the next move is yours, the count Change shows per project */
