/* ───── server -> the model the views already know ───── */
/* Whatever the server sends is parsed here, once: numbers become numbers in range, ids and hashes keep only their own shape.
   Text stays text; the views escape it. What does not parse turns into something the checks below will refuse. */
function nI(x, lo, hi) { x = +x; return isFinite(x) && x >= lo && x <= hi ? Math.floor(x) : lo; }
function nN(x, lo, hi) { return x == null ? null : nI(x, lo, hi); }
function idS(x) { return String(x == null ? '' : x).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64); }
function crS(x) { return /^CR-\d{1,4}$/.test(String(x)) ? String(x) : ''; }
function hxS(x) { return /^[0-9a-f]{64}$/.test(String(x)) ? String(x) : ''; }
function fpS(x) { return /^[0-9a-f]{4}·[0-9a-f]{4}·[0-9a-f]{4}$/.test(String(x)) ? String(x) : ''; }
var T_MAX = 8.64e15;
/* the name to greet the client by, as the app and the emails do (api.php given_name): a title in front is not a name (BS. Lê Ngọc
   Hân, Dr. Ann Lee), a Vietnamese name ends with it (Lê Ngọc Hân: Hân), others start with it */
function callName(n) {
  var w = String(n || '').trim().split(/\s+/).filter(Boolean);
  while (w.length > 1 && (/^(bs|bsck|bscki|bsckii|ts|ths|pgs|gs|ks|ls|ds|dr|mr|mrs|ms|mx|miss|prof|sir|anh|chị|chi|ông|ong|bà|cô|chú|em)\.?$/i.test(w[0]) || /^[A-Za-zÀ-ỹ]{1,5}\.$/.test(w[0]))) w.shift();
  if (w.length < 2) return w[0] || '';
  var fam = ['nguyen', 'nguyễn', 'tran', 'trần', 'le', 'lê', 'pham', 'phạm', 'hoang', 'hoàng', 'huynh', 'huỳnh', 'phan', 'vu', 'vũ', 'vo', 'võ', 'dang', 'đặng', 'bui', 'bùi', 'do', 'đỗ', 'ho', 'hồ', 'ngo', 'ngô', 'duong', 'dương', 'ly', 'lý', 'doan', 'đoàn', 'trinh', 'trịnh', 'dinh', 'đinh', 'truong', 'trương', 'luong', 'lương', 'quach', 'quách', 'lam', 'lâm', 'dao', 'đào', 'luu', 'lưu', 'cao'], isFam = function (x) { return fam.indexOf(x.toLowerCase()) > -1; };
  if (isFam(w[w.length - 1]) && !isFam(w[0])) return w[0];   // the given name written first (Phát Nguyễn)
  return /[ăđơưĩũạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(w.join(' ')) || isFam(w[0]) ? w[w.length - 1] : w[0];
}
/* v68: the portal speaks the client's language: their own choice (the button at the top), else the studio's (from ScopeDue's
   setting), else the browser's. Everything the studio and the client wrote is handed to the language layer as people's words,
   so it is never translated: names, the Scope, requests, replies, delivery notes, shared copies. Codes, times and fingerprints
   are not words. The demo's sample studio is the portal's own, and is translated. */
/* what the server itself writes on a record, in English: the page shows it in the client's language */
var SERVER_TX = { 'Approved.': 1, 'Accepted.': 1 };
/* and the title the server gives a question asked on the Scope itself (api.php h_respond) */
var SERVER_T = /^Question about Scope v\d+$/;
var LW_SKIP = { at: 1, at0: 1, ts: 1, fp: 1, hx: 1, ip: 1, via: 1, ty: 1, w: 1, k: 1, ref: 1, kind: 1, date: 1, tz: 1, from: 1, to: 1, reply: 1, cur: 1, id: 1, m: 1, slug: 1, st: 1, sec: 1, prev: 1, link: 1 };
function liveWords(d, s) {
  if (!window.SDI18N) return;
  var out = [];
  (function walk(o, key) {
    if (typeof o === 'string') { if (key === 'tx' && SERVER_TX[o]) return; if (key === 't' && SERVER_T.test(o)) return; if (key === 't' && /^Not covered: ./.test(o)) { out.push(o.slice(13)); return; }   /* v128 (104): "Not covered:" is the portal's word, what follows the client's */ if (o && !LW_SKIP[key] && !/^[a-z0-9_:.#\/@+-]*$/.test(o) && !/^https?:\/\//.test(o)) out.push(o); return; }
    if (Array.isArray(o)) { o.forEach(function (x) { walk(x, key); }); return; }
    if (o && typeof o === 'object') for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && !(k === 'studio' && !LIVEON)) walk(o[k], k);   // v120 (88): the demo's studio is the portal's own sample, and is translated
  })(d, '');
  SDI18N.userText(out);
  /* the language the studio set for this client, else the studio's own; the client's own choice (the header button) wins over both */
  var want = d.client && (d.client.lang === 'vi' || d.client.lang === 'en') ? d.client.lang : s.lang;
  if (want === 'vi' || want === 'en') { liveHint('lang', want); if (!SDI18N.chosen) { LIVE.lang = want; if (want !== SDI18N.lang) SDI18N.set(want, { keep: false }); } }
}
/* v68: what the portal remembers for the next visit in this browser (boot.js reads it before the first frame): the language the
   studio set and the studio's theme. Nothing about the client or the project. */
function liveHint(k, v) {
  var h = {}; try { h = JSON.parse(lsGet('sd-portal') || '{}') || {}; } catch (e) { }
  if (h[k] === v) return; h[k] = v; lsSet('sd-portal', JSON.stringify(h));
}
/* the first page waits for the dictionary of the studio's language (a file of its own), so it is never drawn twice */
function liveLangReady(go) { if (window.SDI18N && LIVE.lang && LIVE.lang !== 'en') SDI18N.load(LIVE.lang, go); else go(); }
/* another language: the header now; the page again, unless the client is typing a code (the runtime has already turned the texts) */
if (window.SDI18N) SDI18N.onChange(function () { langPaint(); try { if (!V.inVerify && view && view.firstChild) render('soft'); } catch (e) { } });
function langPaint() {
  var b = $('#langBtn'); if (!b) return;
  if (!window.SDI18N) { b.hidden = true; return; }
  var other = SDI18N.lang === 'vi' ? 'en' : 'vi';
  b.innerHTML = '<span class="lf">' + (other === 'vi' ? 'Tiếng Việt' : 'English') + '</span><span class="ls" aria-hidden="true">' + other.toUpperCase() + '</span>'; b.setAttribute('lang', other);
  b.setAttribute('aria-label', other === 'vi' ? 'Xem cổng bằng tiếng Việt' : 'View the portal in English');
}
function liveMap(d) {
  var s = d.studio, c = d.client, first = callName(c.contact || c.name) || String(c.name || '');
  OFFSET = nI(d.now, 0, T_MAX) - Date.now();   // one clock with the server, so "expired" here is "expired" there
  liveWords(d, s); THEME_STUDIO = typeof s.theme === 'string' ? s.theme : '';
  STUDIO = { name: s.name, title: s.title, biz: s.biz, email: s.email, phone: s.phone, city: s.city, tz: s.tz, bio: s.bio, days: Array.isArray(s.days) ? s.days.slice(0, 7).map(function (x) { return nI(x, 0, 6); }).filter(function (x, i, l) { return l.indexOf(x) === i; }) : [0, 1, 2, 3, 4],   /* v68: was a number, and About crashed */ from: s.from, to: s.to, reply: s.reply, se: !!s.se, sp: !!s.sp, sl: !!s.sl, tone: nI(s.tone, 0, 9), photo: '' };
  LIVE.name = studioName();
  var cref = idS(c.ref);
  /* v96 (CONTRACT 42): a project the studio deleted is not one of the client's projects any more; only its record is kept, to download, until removed.until */
  var live = d.projects.filter(function (p) { return !p.removed; }), gone = d.projects.filter(function (p) { return p.removed; });
  CLIENTS = [{ id: cref, name: c.contact, first: first, biz: c.name, email: c.email, projects: live.map(function (p) { return idS(p.ref); }),
    gone: gone.map(function (p) { return { id: idS(p.ref), at: nI(p.removed.at, 0, T_MAX), until: nI(p.removed.until, 0, T_MAX) }; }) }];
  S.cid = cref;
  var np = {};
  d.projects.forEach(function (sp) {
    var pid = idS(sp.ref), p = { id: pid, n: sp.name, theme: typeof sp.theme === 'string' ? sp.theme : '', cid: cref, phase: nI(sp.phase || 1, 1, 9), cur: sdCur(sp.cur), rev: { used: nI(sp.rev ? sp.rev.used : 0, 0, 99) }, evd: liveCopies(sp.shared), vers: [], crs: [] };
    sp.vers.forEach(function (v) {
      var a = v.approval, ts = nI(v.ts, 0, T_MAX), t = v.terms || {};
      p.vers.push({ v: nI(v.v, 1, 9999), at: fmtAt(ts), ats: ts, at0: String(v.at), fp: fpS(v.fp),
        items: (v.items || []).map(function (x) { var o = { id: idS(x.id), sec: idS(x.sec), t: String(x.t == null ? '' : x.t), d: x.d == null ? x.d : String(x.d),   /* null and "" stay apart: both are inside the fingerprint */ cr: x.cr == null || x.cr === '' ? x.cr : crS(x.cr) }; if (t.fv === 2) { o.ok = String(x.ok == null ? '' : x.ok); o.m = idS(x.m); o.pay = x.pay == null ? null : nI(x.pay, 0, 100); } return o; }),
        terms: t.fv === 2 && t.r && typeof t.r === 'object' ? { price: nN(t.price, 0, 1e12), rev: nN(t.rev, 0, 99), fv: 2, r: liveRules(t.r) } : { price: nN(t.price, 0, 1e12), rev: nN(t.rev, 0, 99) },
        appr: a ? String(a.by) + ' · ' + dayLbl(nI(a.at, 0, T_MAX)) : '', rec: a ? { via: String(a.via), at: fmtAt(nI(a.at, 0, T_MAX)), ts: nI(a.at, 0, T_MAX), ip: String(a.ip), by: String(a.by), fp: fpS(a.fp) } : undefined });
    });
    sp.crs.forEach(function (cr) {
      var cid = crS(cr.id), adds = cr.adds ? 1 : 0;
      p.crs.push({ id: cid, t: cr.t, base: nI(cr.base, 0, 9999), adds: adds, touches: adds, cmp: null, entries: cr.entries.map(function (e) {
        var ts = nI(e.ts, 0, T_MAX), o = { w: e.w === 'c' ? 'c' : 'y', ty: idS(e.ty), at: fmtAt(ts), at0: String(e.at), ts: ts, tx: String(e.tx == null ? '' : e.tx), hx: hxS(e.hx), idx: nI(e.idx, 0, 999) };
        if (e.amt != null) { o.amt = nI(e.amt, 0, 1e12); o.days = nI(e.days, 0, 3650); }
        if (e.vu) o.vu = nI(e.vu, 0, T_MAX);
        if (e.via) o.via = idS(e.via);
        if (e.rec) o.rec = { via: String(e.rec.via), ip: String(e.rec.ip), at: nI(e.rec.at, 0, T_MAX), by: String(e.rec.by), fp: fpS(e.rec.fp) };
        if (e.hrs != null) o.hrs = nI(e.hrs, 0, 999); if (e.inc) o.inc = 1; if (e.m) o.m = idS(e.m);
        if (e.pos === 'fix' || e.pos === 'change') o.pos = e.pos; if (e.ref) o.ref = idS(e.ref); if (e.bug != null) o.bug = nI(e.bug, 0, 9999);   // v108 (65)
        if (Array.isArray(e.pics) && e.pics.length) o.pics = livePics(e.pics);   // v102 (59)
        return o;
      }) });
    });
    p.mev = (sp.ev || []).map(function (e) {
      var ts = nI(e.ts, 0, T_MAX), o = { i: nI(e.i, 0, 9999), w: e.w === 'c' ? 'c' : 'y', ty: idS(e.ty), m: idS(e.m), v: nI(e.v, 0, 9999), at: fmtAt(ts), at0: String(e.at), ts: ts, tx: String(e.tx == null ? '' : e.tx), link: /^https?:\/\//i.test(String(e.link || '')) ? String(e.link) : '', k: /^s[1-5]:(ok|issue)$/.test(String(e.k)) ? String(e.k) : idS(e.k), hx: hxS(e.hx) };   // v103 (61): a check's k keeps its colon
      if (e.rec) o.rec = { via: String(e.rec.via), ip: String(e.rec.ip), at: nI(e.rec.at, 0, T_MAX), by: String(e.rec.by), fp: fpS(e.rec.fp) };
      if (Array.isArray(e.pics) && e.pics.length) o.pics = livePics(e.pics);
      if (e.cap && Array.isArray(e.cap.steps) && e.cap.steps.length) o.cap = { b: String(e.cap.b == null ? '' : e.cap.b).slice(0, 60), steps: e.cap.steps.slice(0, 5).map(function (x) { return String(x == null ? '' : x).slice(0, 160); }) };   // v103 (61): checked in 19
      return o;
    });
    np[pid] = p;
  });
  return np;
}
function livePics(a) { return a.slice(0, 6).map(function (x) { x = x || {}; return { n: String(x.n == null ? 'picture' : x.n).slice(0, 120), type: idS(x.type), size: nI(x.size, 0, 1e7), sha: hxS(x.sha), st: x.st === 'held' || x.st === 'taken' ? x.st : 'gone' }; }); }
function liveRules(r) { var o = {}; SM_KEYS.forEach(function (k) { o[k] = k === 'meth' || k === 'doc' ? String(r[k] == null ? '' : r[k]) : nI(r[k], SM_LIM[k][0], SM_LIM[k][1]); }); return o; }
function liveCopies(shared) {
  return (shared || []).map(function (s, i) {
    var fp = String(s.fp || '').replace(/·/g, '');
    return { id: 'sc' + i, title: s.title, kind: KIND_IC[s.kind] ? s.kind : 'doc', kindText: s.kind, at: s.date, ref: '', fp: fp, name: '', size: 0, txt: '', sample: false,
      copy: { at: s.date, fp: fp, txt: '', name: '', hidden: 0, title: s.title } };
  });
}
function liveFlags(M) { return Object.keys(M).map(function (id) { return M[id].vers.map(function (v) { return v.fpOk === false ? 0 : 1; }).join('') + M[id].crs.map(function (c) { return c.chainOk === false ? 0 : 1; }).join(''); }).join('.'); }
/* a cheap fingerprint of what the server sent, to know whether anything changed */
function liveSig(d) { return d.projects.map(function (p) { return p.ref + (p.removed ? '!' : '') + ':' + p.vers.length + ':' + p.vers.map(function (v) { return v.approval ? 1 : 0; }).join('') + ':' + p.crs.map(function (c) { return c.id + '=' + c.entries.length; }).join(',') + ':' + p.phase + ':' + (p.rev ? p.rev.used : 0) + ':' + (p.shared || []).length + ':' + (p.ev || []).length + ':' + livePicSig(p); }).join('|'); }
/* v102 (59): a picture taken by the studio, or deleted after 30 days, changes what the page says */
function livePicSig(p) { var o = ''; p.crs.forEach(function (c) { c.entries.forEach(function (e) { (e.pics || []).forEach(function (x) { o += (x.st || '').charAt(0); }); }); }); (p.ev || []).forEach(function (e) { (e.pics || []).forEach(function (x) { o += (x.st || '').charAt(0); }); }); return o; }

