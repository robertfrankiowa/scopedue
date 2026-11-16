/* ───────── Events: one list drives History and the bell ───────── */
function parseAt(s, ts) {
  if (ts) return ts;
  var m = /^(\d+) ([A-Z][a-z]{2})(?: · (\d\d):(\d\d))?$/.exec(String(s || '')), mo;
  if (!m || (mo = MON.indexOf(m[2])) < 0) return 0;
  var y = new Date().getFullYear(), d = new Date(y, mo, +m[1], m[3] ? +m[3] : 12, m[4] ? +m[4] : 0);
  if (d.getTime() > Date.now() + DAY_MS) d = new Date(y - 1, mo, +m[1], m[3] ? +m[3] : 12, m[4] ? +m[4] : 0);
  return d.getTime();
}
function dayOf(ts) { var d = new Date(ts), n = new Date(); if (d.toDateString() === n.toDateString()) return 'Today'; if (d.toDateString() === new Date(n.getTime() - DAY_MS).toDateString()) return 'Yesterday'; return d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? ' ' + d.getFullYear() : ''); }
function clockOf(ts) { return clock(new Date(ts)); }
function projEvents(p) {
  var ev = [], sn = studioName();
  p.vers.forEach(function (v, i) {
    ev.push({ k: 'v|' + p.id + '|' + v.v, pid: p.id, ts: parseAt(v.at, v.ats), who: 'y', t: sn + ' shared Scope v' + v.v, d: i ? 'See what changed from v' + (v.v - 1) + '.' : 'The first version of your Scope.', go: { a: 'scope', pid: p.id, v: v.v }, live: !v.appr });
    if (v.rec) ev.push({ k: 'va|' + p.id + '|' + v.v, pid: p.id, ts: parseAt(v.rec.at, v.rec.ts), who: 'c', t: 'You approved Scope v' + v.v, d: 'Verified with an email code.', go: { a: 'scope', pid: p.id, v: v.v } });
  });
  p.crs.forEach(function (c) {
    c.entries.forEach(function (e, i) {
      var me = e.w === 'c', t, d = c.id + ' · ' + c.t, tm = pdQuoteEntry(c), live = false;
      if (e.ty === 'request') t = me ? 'You asked for a change' : sn + ' logged a request for you';
      else if (e.ty === 'question') t = me ? 'You asked a question' : sn + ' asked you a question';
      else if (e.ty === 'quote') { t = sn + ' sent a quote'; d += ' · ' + (e.amt ? money(e.amt) : 'No extra cost') + (e.days ? ' · +' + dayw(e.days) : ''); }
      else if (e.ty === 'counter') { t = me ? 'You suggested different terms' : sn + ' sent a counter offer'; d += ' · ' + (e.amt ? money(e.amt) : 'No extra cost') + (e.days ? ' · +' + dayw(e.days) : ''); }
      else if (e.ty === 'accept') t = me ? 'You approved a quote' : sn + ' recorded your agreement';
      else if (e.ty === 'decline') t = me ? 'You declined a change' : sn + ' closed a request';
      else if (e.ty === 'dispute') t = me ? 'You said where you stand' : sn + ' disagrees';   // v108 (65)
      else t = me ? 'You added a note' : sn + ' wrote to you';
      if (!me && i === c.entries.length - 1 && pdCrState(c) === 'client') live = true;
      ev.push({ k: 'e|' + p.id + '|' + c.id + '|' + i, pid: p.id, ts: parseAt(e.at, e.ts), who: me ? 'c' : 'y', t: t, d: d, go: { a: 'req', pid: p.id, cid: c.id }, live: live });
    });
  });
  return ev;
}
function clientEvents(cl) { var o = []; cl.projects.forEach(function (id) { o = o.concat(projEvents(P[id]), msEvents(P[id])); }); return o.sort(function (a, b) { return b.ts - a.ts; }); }
var S = { route: { k: 'home' }, sel: null, done: null, last: {}, read: {}, fresh: {}, cid: 'lotus-wellness', verify: null };
function notifs() { return clientEvents(client(S.cid)).filter(function (e) { return e.who === 'y'; }).slice(0, 8).map(function (e) { e.u = !S.read[e.k] && (e.live || !!S.fresh[e.k]); return e; }); }

