/* ───── check what the server sent, in this browser ───── */
function liveVerify(M, done) {
  var jobs = 0, fin = false;
  if (!(window.crypto && crypto.subtle && window.TextEncoder)) { if (done) done(); return; }   // no real SHA-256 here: say nothing rather than something false
  function end() { if (!jobs && fin) { fin = false; if (done) done(); } }
  Object.keys(M).forEach(function (id) {
    var p = M[id];
    p.vers.forEach(function (v) {
      jobs++;
      pdSha(smFpRaw(p.id, v), function (hex) { v.fpOk = pdGroup(hex, 12) === v.fp; jobs--; end(); });
    });
    if ((p.mev || []).length) {   // the delivery record: each event chained to the one before it
      jobs++;
      var ok2 = true, k2 = 0;
      (function nx() {
        if (k2 >= p.mev.length) { p.mevOk = ok2; jobs--; end(); return; }
        var e = p.mev[k2];
        pdSha(smEvRaw(p.id, k2 ? p.mev[k2 - 1].hx : smEvGen(p.id), { w: e.w, ty: e.ty, m: e.m, v: e.v, at: e.at0, tx: e.tx, link: e.link, k: e.k }), function (hex) {
          if (hex !== e.hx || e.i !== k2) ok2 = false;
          if (!e.cap) { k2++; nx(); return; }
          pdSha(smCapRaw(e.cap), function (h2) { if ('c' + h2.slice(0, 12) !== e.k) delete e.cap; k2++; nx(); });   // v103 (61)
        });
      })();
    }
    p.crs.forEach(function (c) {
      jobs++;
      var ok = true, i = 0, gen = p.id + '|' + c.id + '|v' + c.base;
      (function next() {
        if (i >= c.entries.length) { c.chainOk = ok; jobs--; end(); return; }
        var e = c.entries[i];
        pdSha([c.id, i ? c.entries[i - 1].hx : gen, e.w, e.ty, e.at0, e.tx, e.amt == null ? '' : e.amt, e.days == null ? '' : e.days, e.vu || ''].join('|'), function (hex) { if (hex !== e.hx) ok = false; i++; next(); });
      })();
    });
  });
  fin = true; end();
}
function liveChainLine(c) {
  if (c.chainOk === true) return '<p class="chainf">' + IC('check', 15, 2.2) + 'Chain intact · ' + plural(c.entries.length, 'entry', 'entries') + ' · checked in this browser</p>';
  if (c.chainOk === false) return '<p class="chainf bad">' + IC('x', 15, 2.2) + 'This record does not match its fingerprints. Do not approve anything here. Contact ' + esc(studioName()) + '.</p>';
  return '';
}

/* Nothing is approved on a record this browser could not verify. "Unknown" (no crypto.subtle) is not "bad". */
function badRecord(a) {
  if (!LIVEON || !a) return false;
  if (a.kind === 'scope') return a.v.fpOk === false;
  if (a.kind === 'review') return msBad(P[a.pid]);
  var l = a.c && P[a.pid] ? pdLatest(P[a.pid]) : null;
  return a.kind === 'quote' && (a.c.chainOk === false || !!(l && l.fpOk === false));
}
function badNote() { return '<p class="pnote late">This record does not match its fingerprint, so it cannot be approved here. Contact <b>' + esc(studioName()) + '</b>.</p>'; }

