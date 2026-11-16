/* ───── prototype dock: stands in for the studio and the server ───── */
function waitingCr() { var out = null; client(S.cid).projects.forEach(function (id) { var p = P[id]; if (!msAnyAppr(p)) return; pdCrList(p).slice().reverse().forEach(function (c) { if (!out && pdCrState(c) === 'me') out = { p: p, c: c }; }); }); return out; }
function foldable() { return client(S.cid).projects.map(function (id) { return P[id]; }).filter(function (p) { return pdLatest(p) && pdLatest(p).appr && pdPending(p).ids.length; })[0] || null; }
function paintDock() {
  var d = $('#dockP'), w = waitingCr(), f = foldable(), dv = deliverable();
  d.innerHTML = '<h5>Viewing as</h5><div class="seg" role="group" aria-label="Client">' + CLIENTS.map(function (c) { return '<button type="button" data-a="as" data-cid="' + c.id + '" aria-pressed="' + (c.id === S.cid) + '">' + esc(c.first) + '</button>'; }).join('') + '</div>' +
    '<p>' + esc(client(S.cid).biz) + (client(S.cid).projects.length > 1 ? ' · two projects' : '') + '</p>' +
    '<h5>What the studio does</h5>' +
    '<button type="button" class="dock-a" data-a="dq"' + (w ? '' : ' disabled') + '><span>Reply with a quote<br><small>' + (w ? esc(w.c.id + ' · ' + w.c.t) : 'Nothing is waiting on the studio') + '</small></span></button>' +
    '<button type="button" class="dock-a" data-a="df"' + (f ? '' : ' disabled') + '><span>Issue the next Scope<br><small>' + (f ? esc(f.n + ' · adds ' + pdPending(f).ids.join(', ')) : 'No approved change to add') + '</small></span></button>' +
    '<button type="button" class="dock-a" data-a="dd"' + (dv ? '' : ' disabled') + '><span>Deliver a milestone<br><small>' + (dv ? esc(dv.p.n + ' · ' + dv.m.t) : 'Nothing to deliver right now') + '</small></span></button>' +
    '<h5>Time</h5><button type="button" class="dock-a" data-a="dff"><span>Fast-forward 8 days<br><small>Quotes expire, reviews end, dates pass</small></span></button>' +
    '<button type="button" class="dock-a" data-a="dreset"><span>Reset the prototype</span></button>' +
    '<p>Stands in for the studio and the server. Nothing here is saved.</p>';
}
function refreshDrawers() {
  var p = S.route.k === 'p' ? P[S.route.id] : null; if (!p) return;
  if ($('#dReq').open) reqDrawer(p, S.dr.req || null);
  if ($('#dScope').open && S.dr.scopeV) scopeDrawer(p, S.dr.scopeV);
}
function studioQuote() {
  var w = waitingCr(); if (!w) return toast('Nothing is waiting on the studio.');
  var p = w.p, c = w.c, ctr = c.entries.filter(function (e) { return e.w === 'c' && e.ty === 'counter'; }).pop(), q = c.entries.filter(function (e) { return e.w === 'y' && e.amt != null; }).pop(), amt = ctr ? Math.round(((ctr.amt + (q ? q.amt : ctr.amt)) / 2) / 10) * 10 : 600;
  var e = { w: 'y', ty: 'quote', tx: ctr ? 'We can meet in the middle, with the same timeline.' : 'Fixed price for the extra work, delivered inside the same timeline.', amt: amt, days: q && q.days ? q.days : 2, vu: now() + 7 * DAY_MS };
  addEntry(p, c, e); S.fresh['e|' + p.id + '|' + c.id + '|' + (c.entries.length - 1)] = true; S.sel = 'cr:' + p.id + ':' + c.id;
  ensureHashes(function () { S.done = null; render('soft'); toast(studioName() + ' sent a quote on ' + c.id + '.'); refreshDrawers(); });
}
function studioFold() {
  var p = foldable(); if (!p) return toast('No approved change to add.');
  var l = pdLatest(p), pe = pdPending(p), items = l.items.map(function (x) { return pdsCp(x); }), t = pdTermsOf(l), at = -1;
  pe.ids.forEach(function (id) { var c = pdCr(p, id), li = -1; items.forEach(function (x, i) { if (x.sec === 'in') li = i; }); items.splice(li + 1, 0, pdsIt('in', c.t, '', c.id)); });
  var best = null; items.forEach(function (x) { if (x.sec !== 'tl') return; var m = pdMs(x.d); if (m != null && (best == null || m > pdMs(best.d))) best = x; });
  if (best && pe.days) best.d = dayLbl(pdShift(pdMs(best.d), pe.days));
  var v = { v: l.v + 1, at: stamp(), ats: now(), appr: '', items: items, terms: { price: t.price == null ? null : t.price + pe.amt, rev: t.rev } };
  p.vers.push(v); S.fresh['v|' + p.id + '|' + v.v] = true; S.sel = 'scope:' + p.id + ':' + v.v;
  ensureHashes(function () { S.done = null; render('soft'); toast(studioName() + ' shared Scope v' + v.v + '. It needs your approval.'); refreshDrawers(); });
}
function resetProto() {
  closeAllD(); OFFSET = 0; buildData(); S.read = {}; S.fresh = {}; S.last = {}; S.done = null; S.sel = null; S.crf = 'open'; S.dr = {};
  ensureHashes(function () { landing(); render('nav'); window.scrollTo(0, 0); toast('Prototype reset.'); });
}

