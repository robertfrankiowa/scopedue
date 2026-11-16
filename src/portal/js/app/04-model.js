/* ───────── Model (the same rules as the dev app) ───────── */
function pdLatest(p) { return p.vers[p.vers.length - 1] || null; }
function pdVer(p, v) { return p.vers.filter(function (x) { return x.v === v; })[0]; }
function pdCrNum(c) { return +c.id.replace(/\D/g, ''); }
function pdCrList(p) { return p.crs.slice().sort(function (a, b) { return pdCrNum(b) - pdCrNum(a); }); }
function pdCr(p, id) { return p.crs.filter(function (c) { return c.id === id; })[0]; }
function pdCrState(c) {
  var e = c.entries[c.entries.length - 1];
  if (e.ty === 'accept') return 'approved';
  if (e.ty === 'decline') return 'declined';
  if (e.w === 'c') return 'me';
  return e.ty === 'request' || (e.ty === 'note' && c.adds) ? 'me' : 'client';   /* CONTRACT 82: the studio's note on a request that adds work leaves it with the studio, which still owes a quote; to have the client answer, it asks (a question) */
}
function pdTerms(c) { for (var i = c.entries.length - 1; i >= 0; i--) { var e = c.entries[i]; if (e.amt != null) return { amt: e.amt, days: e.days, w: e.w, at: e.at, ty: e.ty, vu: e.vu }; } return null; }
function pdCrVer(p, c) { var vs = p.vers.filter(function (v) { return v.items.some(function (x) { return x.cr === c.id; }); }); return vs.length ? vs[0].v : 0; }
function pdTermsOf(v) { return v && v.terms ? v.terms : { price: null, rev: null }; }
function pdMs(s) {
  var m = /^(\d+) ([A-Z][a-z]{2})(?: (\d{4}))?$/.exec(String(s || '')), mo, y, t, n = Date.now();
  if (!m || (mo = MON.indexOf(m[2])) < 0) return null;
  y = m[3] ? +m[3] : new Date().getFullYear(); t = new Date(y, mo, +m[1]).getTime();
  if (!m[3] && t < n - 200 * DAY_MS) t = new Date(y + 1, mo, +m[1]).getTime();
  return t;
}
function pdDelivery(items) { var best = null; items.forEach(function (x) { if (x.sec !== 'tl' || x.rm) return; var t = pdMs(x.d); if (t != null && (best == null || t > best)) best = t; }); return best; }
function pdShift(t, days) { var d = new Date(t); d.setDate(d.getDate() + days); return d.getTime(); }
function pdPending(p) {
  var amt = 0, days = 0, ids = [];
  p.crs.forEach(function (c) { if (pdCrState(c) !== 'approved' || !c.adds || pdCrVer(p, c)) return; var t = pdTerms(c); if (!t) return; amt += t.amt || 0; days += t.days || 0; ids.push(c.id); });
  return { amt: amt, days: days, ids: ids };
}
function pdTotals(p) {
  var l = pdLatest(p); if (!l) return null;
  var t = pdTermsOf(l), pe = pdPending(p), dl = pdDelivery(l.items);
  return { price: t.price, rev: t.rev, delivery: dl, pend: pe, total: t.price == null ? null : t.price + pe.amt, newDelivery: dl == null ? null : pdShift(dl, pe.days) };
}
function pdQuoteEntry(c) { var i; for (i = c.entries.length - 1; i >= 0; i--) if (c.entries[i].amt != null) return c.entries[i]; return null; }
function pdExpired(c) { if (pdCrState(c) !== 'client') return false; var q = pdQuoteEntry(c); return !!q && q.w === 'y' && !!q.vu && q.vu < now(); }
function lastE(c) { return c.entries[c.entries.length - 1]; }
function isQuote(c) { var l = lastE(c); return l.w === 'y' && l.amt != null; }

/* what the client can be asked for, newest first */
function actionsFor(p) {
  var out = [], l = pdLatest(p);
  if (l && !l.appr) out.push({ kind: 'scope', pid: p.id, key: 'scope:' + p.id + ':' + l.v, v: l });
  var ma = msActions(p);
  ma.forEach(function (a) { if (a.kind === 'review') out.push(a); });
  pdCrList(p).forEach(function (c) {
    if (pdCrState(c) !== 'client') return;
    out.push({ kind: isQuote(c) ? 'quote' : 'reply', pid: p.id, key: 'cr:' + p.id + ':' + c.id, c: c, expired: pdExpired(c) });
  });
  ma.forEach(function (a) { if (a.kind !== 'review') out.push(a); });
  return out;
}
function allActions(c) { var o = []; c.projects.forEach(function (id) { o = o.concat(actionsFor(P[id])); }); return o; }

/* fingerprints and the entry chain: identical to the dev app, so a receipt can be matched */
function ensureHashes(done) {
  var jobs = 0, fin = false;
  function end() { if (!jobs && fin) { fin = false; done && done(); } }
  Object.keys(P).forEach(function (id) {
    var p = P[id];
    p.vers.forEach(function (v) {
      if (v.fp || v.fpBusy) return; v.fpBusy = true; jobs++;
      pdSha(smFpRaw(p.id, v), function (hex) { v.fp = pdGroup(hex, 12); v.fpBusy = false; jobs--; end(); });
    });
    if ((p.mev || []).some(function (e) { return !e.hx; })) { jobs++; msChain(p, function () { jobs--; end(); }); }
    p.crs.forEach(function (c) {
      if (c.busy) return;
      if (c.entries.every(function (e) { return e.hx; })) return;
      c.busy = true; jobs++;
      var gen = p.id + '|' + c.id + '|v' + c.base, i = 0;
      (function next() {
        if (i >= c.entries.length) { c.busy = false; jobs--; end(); return; }
        var e = c.entries[i];
        if (e.hx) { i++; return next(); }
        pdSha([c.id, i ? c.entries[i - 1].hx : gen, e.w, e.ty, e.at, e.tx, e.amt == null ? '' : e.amt, e.days == null ? '' : e.days, e.vu || ''].join('|'), function (hex) { e.hx = hex; i++; next(); });
      })();
    });
  });
  fin = true; end();
}

