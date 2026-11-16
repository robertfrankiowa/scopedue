  /* ---------- client portal sync ----------
     The dev app stays the only place project data is written. The thin server keeps just what a client needs to decide:
     issued Scope versions, change requests, the client's replies and the approval record (CONTRACT.md, sections 11 and 13).

     A project goes on the portal when its first Scope version is issued, and only if it has no history yet, because the server
     numbers versions from v1 and requests from CR-001 without gaps. Everything the portal holds is written server first and
     here second, so a record that exists on one side exists on the other. A project that is not on the portal never touches the network.
     The projects themselves are saved on this device (store.js); the connection (address and key) is kept beside them in this browser. */
  var SY_LS = 'sd-sync';
  var SY = { url: '', key: '', slug: '', email: '', via: '', st: 'off', cursor: 0, last: 0, msg: '', fails: 0, tm: 0, q: Promise.resolve(), first: !SDBOOT.restored,
    pend: null, profLast: '', profMsg: '', warn: '', bad: {}, look: {}, gen: 0, metaT: 0, defer: false };
  var ncrBusy = false;
  function syLoad() {
    try {
      var o = JSON.parse(localStorage.getItem(SY_LS) || 'null');
      if (o && typeof o.url === 'string' && /^sdk_[\w-]+$/.test(o.key || '') && /\.php$/i.test(o.url)) { SY.url = o.url; SY.key = o.key; SY.slug = String(o.slug || ''); SY.email = String(o.email || ''); SY.via = o.via === 'google' ? 'google' : 'email'; SY.st = 'ok'; }
    } catch (e) {}
    syMirror();
  }
  function syStore() {
    try { if (SY.key) localStorage.setItem(SY_LS, JSON.stringify({ url: SY.url, key: SY.key, slug: SY.slug, email: SY.email, via: SY.via })); else localStorage.removeItem(SY_LS); } catch (e) {}
    syMirror();
  }
  /* v78: in the extension, the account's address for sw.js, which tells the join page only whether its Google account is this one */
  function syMirror() {
    try { if (window.chrome && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) chrome.storage.local.set({ sdAcct: SY.key ? String(SY.email || '').trim().toLowerCase() : '' }); } catch (e) {}
  }
  function syCanHash() { return !!(window.crypto && crypto.subtle && window.TextEncoder); }
  function syShaP(s) { return new Promise(function (res) { pdSha(s, res); }); }
  function syHost() { try { return new URL(SY.url).host; } catch (e) { return SY.url; } }

  /* the address you type may be a folder or the file itself; the file is what we keep */
  function syNorm(raw) {
    var s = String(raw || '').trim().replace(/#.*$/, ''), u, local;
    if (!s) return { err: 'Enter the address of your server.' };
    local = /^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(s);
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = (local ? 'http://' : 'https://') + s;
    try { u = new URL(s); } catch (e) { return { err: 'That address does not look right.' }; }
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname))) return { err: 'Use an https address. Plain http only works on this computer.' };
    if (!/\.php$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/+$/, '') + '/api.php';
    u.search = ''; u.hash = '';
    return { url: u.href };
  }
  function syUrl(base, path, q) {
    var ps = '';
    if (q) Object.keys(q).forEach(function (k) { ps += '&' + k + '=' + encodeURIComponent(q[k]); });
    return base + '?r=' + path + ps;
  }
  /* always answers {status, data, net}; a dead network is status 0, never an exception */
  function syCall(method, path, body, o) {
    o = o || {};
    var h = { 'Accept': 'application/json' }, ac = window.AbortController ? new AbortController() : null, to = 0, key = SY.key, gen = SY.gen;
    var gone = function (res) { return !o.anon && gen !== SY.gen ? { status: 0, data: {}, net: true } : res; };   // connected, disconnected or switched account meanwhile: what comes back belongs to the old connection
    if (body) h['Content-Type'] = 'application/json';
    if (key && !o.anon) { h['Authorization'] = 'Bearer ' + key; h['X-SD-Key'] = key; }   // the second one is for hosts that drop Authorization
    if (ac) to = setTimeout(function () { ac.abort(); }, method === 'GET' ? 20000 : 45000);   // a write may wait on the server's mail
    return fetch(syUrl(o.base || SY.url, path, o.q), { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac ? ac.signal : undefined }).then(function (r) {
      return r.text().then(function (t) { clearTimeout(to); var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return gone({ status: r.status, data: j && typeof j === 'object' ? j : {}, net: false }); });
    }).catch(function () { clearTimeout(to); return gone({ status: 0, data: {}, net: true }); });
  }
  function syOk(r) { return r.status >= 200 && r.status < 300; }
  function syErr(r) { return r && r.data && r.data.error ? r.data.error : {}; }
  /* one sentence the studio can act on; the server's own wording is kept when it already says what to do */
  function syMsg(r, who) {
    var e = syErr(r), c = e.code || '';
    if (r.net) return 'Could not reach your server. Nothing was sent.';
    if (r.status === 401) { SY.st = 'auth'; syPaint(); return 'You were signed out of your server. Sign in again from Settings.'; }
    if (c === 'stale') return (who || 'The client') + ' sent something new while you were writing. It is on screen now. Read it, then send yours again.';
    if (r.status >= 500) return 'Your server had a problem. Try again in a moment.';
    if (/in the future/.test(e.message || '')) return 'This computer’s clock is ahead of the server’s. Fix the date and time, then try again.';
    return e.message || 'The server refused this (' + r.status + ').';
  }
  /* unsure: the write may have reached the server even though no answer came back */
  function syBad(r, who) { return { ok: false, msg: syMsg(r, who), stale: syErr(r).code === 'stale', net: r.net, unsure: !!r.net || r.status >= 500 }; }
  /* a version or a reply is a write that may have landed even though no answer came back: say so, and the next look at the project settles it */
  function syBadW(r, who, ver) {
    var b = syBad(r, who), lead = r.net ? 'No answer from your server. ' : 'Your server had a problem. ';
    if (b.unsure) b.msg = lead + (ver ? 'Try again in a moment. If the version did get through, trying again does not share it twice.' : 'If this got through it shows up here shortly. If not, send it again.');
    return b;
  }
  /* every call to the server runs one at a time, so a pull never lands in the middle of a write */
  function syQ(fn) {
    var run = SY.q.then(function () { return fn(); }).catch(function (e) { return { ok: false, msg: 'Sync hit a problem: ' + (e && e.message ? e.message : e) }; });
    SY.q = run; return run;
  }
  function syRefOk(s) { return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(String(s)); }

  /* ---- what is on the portal ---- */
  function syMine(p) { return !!(SY.key && p && p.sy && p.sy.on && p.sy.slug === SY.slug); }
  /* the project lives on a server (whether or not this app is connected to it right now): the stand-in client never touches it */
  function syLive(p) { return !!(p && p.sy && p.sy.on); }
  /* portal: it is there. join: its first version will put it there. local: it has history from before the portal. blocked: something to fix first. off: no portal in play */
  function syStatus(p) {
    var c, g;
    if (!p || p.kind !== 'client') return { k: 'off' };
    /* a project that is on a server only changes while this app is connected to that server: otherwise the two would drift apart */
    if (syLive(p)) {
      if (!SY.key) return { k: 'blocked', why: 'This project is on your portal. Sign in to the portal in Settings first.' };
      if (p.sy.slug !== SY.slug) return { k: 'blocked', why: 'This project is on a different portal account. Sign in to that one in Settings first.' };
      return SY.st === 'auth' ? { k: 'blocked', why: 'Sign in to the portal again in Settings first.' } : { k: 'portal' };
    }
    if (!SY.key) return { k: 'off' };
    c = byId(p.cid); if (!c) return { k: 'off' };
    g = given(c) || 'the client';
    if (p.sc.vers.length || p.crs.length) return { k: 'local', why: 'This project’s history started before the portal, so it stays on this device.' };
    if (SY.st === 'auth') return { k: 'blocked', why: 'Sign in to the portal again in Settings first.' };
    if (!c.email) return { k: 'blocked', why: 'Add ' + g + '’s email first. The portal needs it to send the link and the approval code.' };
    if (c.portal === 'closed') return { k: 'blocked', why: 'The portal is closed for ' + c.name + '. Reopen it first.' };
    if (!syRefOk(p.id) || !syRefOk(c.id)) return { k: 'blocked', why: 'This name cannot be used as a portal address. Rename it.' };
    return { k: 'join' };
  }
  function syBlocked(p) { return syStatus(p).k === 'blocked'; }

  /* ---- bodies we send ---- */
  function syProfileBody() {
    var p = pfSaved, b = { tz: pfZone(p.tz), biz: p.biz, title: p.title, phone: p.phone, city: p.city, bio: p.bio, tone: p.tone, days: p.days.slice().sort(), from: p.from, to: p.to, reply: p.reply, se: p.se, sp: p.sp, sl: p.sl };
    if (p.name.trim().length >= 2) b.name = p.name.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) b.email = p.email;
    if (window.SDI18N && !SY.noLang) b.lang = SDI18N.lang;   /* v68: the portal and the client emails speak the studio's language */
    return b;
  }
  function syClientBody(c) { var b = { name: c.name, contact: c.contact, email: c.email, role: c.role || '', portal: c.portal === 'closed' ? 'off' : 'on' }; if ((c.lang === 'en' || c.lang === 'vi') && !SY.noLang) b.lang = c.lang; return b; }
  /* a server older than 1.4.1 does not know "lang": send the rest, as before */
  async function syPutClient(id, b) {
    var r = await syCall('PUT', '/v1/clients/' + id, b);
    if (!syOk(r) && r.status === 422 && b.lang && /"lang"/.test(syErr(r).message || '')) { SY.noLang = true; delete b.lang; r = await syCall('PUT', '/v1/clients/' + id, b); }
    return r;
  }
  /* the redacted copies you prepared for the client: title, kind, date and a short fingerprint. Nothing else leaves */
  function syShared(p) {
    return (p.evd || []).filter(function (x) { return x.copy; }).slice(0, 50).map(function (x) {
      var h = String(x.copy.fp || '').replace(/[^0-9a-f]/g, '');
      return { title: String(x.copy.title || x.title || 'Copy').slice(0, 120), kind: String(x.kind || 'doc').slice(0, 30), date: String(x.copy.at || '').slice(0, 24), fp: h.length >= 12 ? pdGroup(h.slice(0, 12), 12) : '' };
    });
  }
  function syProjBody(p) {
    var b = { client: p.cid, name: p.n, phase: Math.min(5, Math.max(1, p.phase | 0 || 1)), rev_used: p.rev ? Math.min(99, Math.max(0, p.rev.used | 0)) : 0, shared: syShared(p) };
    if (!SY.noTheme) b.theme = ptValid(p.ptheme || '') ? p.ptheme || '' : '';   /* v68: this project's portal theme ('' = automatic) */
    if (!SY.noCur) b.cur = sdCur(p.cur);   /* CONTRACT 101: what its amounts are in */
    return b;
  }

  async function syPushProfile(force) {
    var b = syProfileBody(), j = JSON.stringify(b), r;
    if (!force && j === SY.profLast) return { ok: true };
    r = await syCall('PUT', '/v1/studio', b);
    /* a server older than 1.4.1 does not know "lang": send the rest, as before */
    for (var tries = 0; tries < 2 && !syOk(r) && r.status === 422; tries++) {
      var em = syErr(r).message || '';
      if (b.lang && /"lang"/.test(em)) SY.noLang = true; else break;
      b = syProfileBody(); j = JSON.stringify(b); r = await syCall('PUT', '/v1/studio', b);
    }
    if (!syOk(r)) { SY.profMsg = r.net ? '' : syMsg(r); return { ok: false, net: r.net, msg: syMsg(r) }; }
    SY.profLast = j; SY.profMsg = ''; return { ok: true };
  }
  /* client and project are plain "current state" writes: sending them again is harmless, so they are only sent when they changed */
  async function syEnsure(p, over) {
    var c = byId(p.cid), cb, r, co, po, pb;
    if (!c) return { ok: false, msg: 'This project has no client.' };
    if (!c.email) return { ok: false, msg: 'Add ' + (given(c) || 'the client') + '’s email first.' };
    if (!syRefOk(c.id) || !syRefOk(p.id)) return { ok: false, msg: 'This name cannot be used as a portal address. Rename it.' };
    co = c.sy = c.sy || {}; cb = JSON.stringify(Object.assign(syClientBody(c), over || {}));
    if (co.slug !== SY.slug || co.last !== cb) {
      r = await syPutClient(c.id, JSON.parse(cb));
      if (!syOk(r)) return syBad(r, given(c));
      co.last = cb; co.slug = SY.slug;
    }
    if (p) {
      po = p.sy = p.sy || {}; pb = JSON.stringify(syProjBody(p));
      if (po.slug !== SY.slug || po.last !== pb) {
        r = await syCall('PUT', '/v1/projects/' + p.id, JSON.parse(pb));
        /* a server older than 1.4.1 does not know "theme": the project goes without it */
        if (!syOk(r) && r.status === 422 && /"theme"/.test(syErr(r).message || '')) { SY.noTheme = true; pb = JSON.stringify(syProjBody(p)); r = await syCall('PUT', '/v1/projects/' + p.id, JSON.parse(pb)); }
        /* a server older than 1.30.0 does not know "cur" (CONTRACT 101): the project goes without it */
        if (!syOk(r) && r.status === 422 && /"cur"/.test(syErr(r).message || '')) { SY.noCur = true; pb = JSON.stringify(syProjBody(p)); r = await syCall('PUT', '/v1/projects/' + p.id, JSON.parse(pb)); }
        if (!syOk(r)) return syBad(r, given(c));
        po.last = pb; po.slug = SY.slug;
      }
    }
    return { ok: true };
  }
  /* quiet upkeep: profile, client details, phase, revision rounds, shared copies */
  async function syFlushMeta() {
    var r;
    if (!SY.key || SY.st === 'auth') return { ok: false, msg: 'Not signed in.' };
    r = await syQ(async function () {
      var x = await syPushProfile(false), list = PROJECTS.filter(syMine), i, first = null;
      if (!x.ok && x.net) return x;   // a profile the server refuses is shown on the card; it does not hold the projects back
      for (i = 0; i < list.length; i++) {
        x = await syEnsure(list[i]);
        if (x.ok) { syBadClear('meta|' + list[i].id); continue; }
        if (x.net || x.unsure || SY.st === 'auth') return x;   // the server is not answering: the rest would fail the same way
        syBadSet('meta|' + list[i].id, (list[i].n || list[i].id) + ' could not be updated on the portal. ' + x.msg);   // a refusal belongs to this project only
        first = first || x;
      }
      return first || { ok: true };
    });
    if (r && !r.ok && r.net) { SY.st = 'err'; SY.fails++; SY.msg = r.msg; }
    return r;
  }
  function syMetaSoon() { clearTimeout(SY.metaT); SY.metaT = setTimeout(function () { if (SY.key) syFlushMeta().then(syPaint); }, 900); }
  function syProfileSoon() { if (SY.key) syMetaSoon(); }
  /* where the server's client portal is (GET /v1/health → portal, api.php 1.4.1): asked once, for the Profile's "See it" link */
  function syPortalBase(then) {
    if (!SY.url || SY.portal !== undefined) { then(); return; }
    SY.portal = '';
    syCall('GET', '/v1/health', null, { base: SY.url, anon: true }).then(function (h) { if (syOk(h) && h.data && /^https?:\/\/[^\s"'<>]+$/.test(h.data.portal || '')) SY.portal = h.data.portal; then(); }, function () { then(); });
  }
  if (window.SDI18N) SDI18N.onChange(function () { syProfileSoon(); });

  /* ---- writes the studio makes: server first, then this app ---- */
  async function syPushVersion(p, ver) {
    var e = await syEnsure(p), fp, r, c = byId(p.cid);
    if (!e.ok) return e;
    fp = pdGroup(await syShaP(pdFpRaw(p, ver)), 12);
    r = await syCall('POST', '/v1/projects/' + p.id + '/versions', {
      v: ver.v, items: ver.items.map(function (x) { var o = { id: x.id, sec: x.sec, t: x.t, d: x.d, cr: x.cr }; if (smV2(ver)) { o.ok = x.ok || ''; o.m = x.m || ''; if (x.sec === 'tl') o.pay = x.pay || 0; } return o; }),
      terms: smV2(ver) ? { price: pdTermsOf(ver).price, rev: null, fv: 2, r: pdTermsOf(ver).r } : { price: pdTermsOf(ver).price, rev: pdTermsOf(ver).rev }, at: ver.at, ts: ver.ts, fp: fp });
    if (!syOk(r)) return syBadW(r, given(c), true);
    if (!r.data.version || r.data.version.fp !== fp) return { ok: false, msg: 'The server stored a different fingerprint than this app computed. Nothing was shared.' };
    return { ok: true, fp: fp, at: syS(r.data.version.at, 24), ts: syI(r.data.version.ts) };
  }
  function syGateIssue(p, ver, onOk, onErr) {
    var s = syStatus(p), k = s.k;
    if (k === 'blocked') { onErr(s.why); return; }
    if (k !== 'portal' && k !== 'join') { onOk(); return; }
    if (SDB.S.stale) { onErr('This tab is behind another one. Reload it, then try again.'); return; }
    syQ(function () { return syStatus(p).k === k ? syPushVersion(p, ver) : { ok: false, msg: 'The connection changed while this was waiting. Try again.' }; }).then(function (r) {
      if (!r.ok) { onErr(r.msg); if (r.unsure) SY.look[p.id] = 1; return; }
      p.sy = p.sy || {}; p.sy.on = true; p.sy.slug = SY.slug; ver.fp = r.fp;
      if (r.at) ver.at = r.at; if (r.ts) ver.ts = r.ts;   // a retry after a lost answer is a replay: the first time stands
      onOk(); syPaint(); SDB.soon(40); setTimeout(syPullSoon, 400);
    });
  }
  /* cr: the request (or the plan for a new one). n: how many entries the studio saw, so the server can tell if the client replied meanwhile */
  async function syPushEntry(p, cr, n, e, extra) {
    var en = await syEnsure(p), prev, hx, b, r, c = byId(p.cid);
    if (!en.ok) return en;
    if (n === 0) prev = pdHxGen(p, cr);
    else { await new Promise(function (res) { pdChain(p, cr, res); }); prev = cr.entries[n - 1].hx; }
    hx = await syShaP(pdHxRaw(cr.id, prev, e));
    b = { n: n, ty: e.ty, tx: e.tx, at: e.at, ts: e.ts, hx: hx };
    if (e.ty === 'quote') { b.amt = e.amt; b.days = e.days; if (e.vu) b.vu = e.vu; if (e.hrs != null && e.hrs !== '') b.hrs = +e.hrs; if (e.inc) b.inc = true; if (e.m) b.m = e.m; }
    if (e.ty === 'dispute') { b.pos = e.pos || 'fix'; if (e.ref) b.ref = e.ref; }   // v108 (65)
    if (extra) { b.title = extra.title; b.adds = extra.adds; b.base = extra.base; b.via = e.via; }
    r = await syCall('POST', '/v1/projects/' + p.id + '/requests/' + cr.id + '/entries', b);
    if (!syOk(r)) return syBadW(r, given(c));
    if (!r.data.entry || r.data.entry.hx !== hx) return { ok: false, msg: 'The server stored a different record than this app computed. Nothing was sent.' };
    return { ok: true, hx: hx, ts: syI(r.data.entry.ts) };
  }
  /* seen: how many entries the screen showed when the button was pressed. A reply can sit in the model while the screen waits for you to stop typing; it must not slip under your words unseen */
  function syGateEntry(p, cr, e, extra, onOk, onErr, seen) {
    var n, s = syStatus(p), k = s.k, who;
    if (k === 'blocked' && syLive(p)) { onErr(s.why); return; }
    if (k !== 'portal') { onOk(); return; }
    if (SDB.S.stale) { onErr('This tab is behind another one. Reload it, then try again.'); return; }
    n = cr.entries.length;
    if (seen != null && !isNaN(seen) && seen !== n) {
      who = given(byId(p.cid) || {}) || 'The client';
      var last = cr.entries[n - 1], m = last && last.w === 'y' ? 'Your earlier message did get through. It is on screen now. Read it, then send again if you still need to.' : who + ' sent something new while you were writing. It is on screen now. Read it, then send yours again.';
      if (curView === 'project' && pd.p === p) syRepaint(true);   // the new text first, so the form below it can say why
      onErr(m); showToast(m); return;
    }
    syQ(function () { return syStatus(p).k === k ? syPushEntry(p, cr, n, e, extra) : { ok: false, msg: 'The connection changed while this was waiting. Try again.' }; }).then(function (r) {
      if (r.ok) { e.hx = r.hx; if (r.ts) e.ts = r.ts; onOk(); syPaint(); SDB.soon(40); return; }
      if (r.unsure) SY.look[p.id] = 1;   // the answer may have been lost on the way back: the next look at the project settles it
      if (!r.stale) { onErr(r.msg); return; }
      /* the thread moved on: read the project now, so what is said is true. The new entry may be the client's, or your own that got through after all */
      syQ(function () { return syReconcile(p); }).then(function (rc) {
        var late = cr.entries.slice(n), theirs = late.some(function (x) { return x.w === 'c'; }), mine = late.some(function (x) { return x.w === 'y'; }), plan = !cr.entries.length && !late.length && pdCr(p, cr.id), m = r.msg;
        if (rc.ok) delete SY.look[p.id];
        if (plan && plan.entries[0] && plan.entries[0].w === 'y') m = 'Your earlier try did get through: it is logged as ' + cr.id + '. Close this and open it from the list.';
        else if (mine && !theirs) m = 'Your earlier message did get through. It is on screen now. Read it, then send again if you still need to.';
        if (curView === 'project' && pd.p === p) syRepaint(true);
        onErr(m); showToast(m); syPullSoon();
      });
    });
  }

  /* ---- what the client did: pulled, checked, then added to the model ---- */
  function syS(x, max) { return String(x == null ? '' : x).slice(0, max || 4000); }
  function syI(x) { return typeof x === 'number' && isFinite(x) ? Math.floor(x) : 0; }
  function syStampMs(ms) { var d = new Date(ms), z = function (n) { return ('0' + n).slice(-2); }; return d.getDate() + ' ' + MON[d.getMonth()] + ' · ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
  function syAgo(ts) {
    var s = (Date.now() - ts) / 1000;
    if (s < 90) return 'Just now';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    if (s < 172800) return 'Yesterday';
    return dayLbl(ts);
  }
  function syLocalEntry(se, fresh) {
    var e = { w: se.w === 'y' ? 'y' : 'c', ty: syS(se.ty, 12), at: syS(se.at, 24), ts: syI(se.ts), tx: syS(se.tx, 4000), hx: syS(se.hx, 64), fresh: !!fresh }, r = se.rec;
    if (se.amt != null) { e.amt = syI(se.amt); e.days = syI(se.days); }
    if (se.vu != null) e.vu = syI(se.vu);
    if (se.via) e.via = syS(se.via, 10);
    if (se.hrs != null) e.hrs = syI(se.hrs); if (se.inc) e.inc = 1; if (se.m) e.m = syS(se.m, 40);
    if (se.pos === 'fix' || se.pos === 'change') e.pos = se.pos; if (se.ref) e.ref = syS(se.ref, 40); if (se.bug != null) e.bug = syI(se.bug);   // v108 (65)
    var pics = cpSan(se.pics); if (pics) e.pics = pics;   // v102 (59): not in the hash
    if (r && typeof r === 'object') e.rec = { via: syS(r.via, 20), at: syStampMs(syI(r.at)), ts: syI(r.at), ip: syS(r.ip, 64), fp: syS(r.fp, 20), by: syS(r.by, 100), email: syS(r.email, 120) };
    return e;
  }
  /* things the server sent that did not check out. They stay on the Client portal card until a fresh look at the project shows them right */
  function syBadSet(k, msg) { SY.bad[k] = msg; SY.warn = SY.bad[Object.keys(SY.bad)[0]] || ''; }
  function syBadClear(k) { delete SY.bad[k]; SY.warn = SY.bad[Object.keys(SY.bad)[0]] || ''; }
  var SY_REFUSED = 'Something from the portal did not verify and was not added';
  var SY_LINE = { question: ' asked a question on ', counter: ' sent a counter offer on ', accept: ' accepted ', decline: ' declined ', note: ' replied on ', request: ' asked for a change on ', dispute: ' disagreed on ' };   // v117: a client's dispute read "replied on"
  /* the hash of an entry must follow from the one before it. This is the check behind "Chain intact" */
  async function syChainOk(p, c, e, hx) {
    var prev;
    if (c.entries.length) { await new Promise(function (res) { pdChain(p, c, res); }); prev = c.entries[c.entries.length - 1].hx; } else prev = pdHxGen(p, c);
    return (await syShaP(pdHxRaw(c.id, prev, e))) === hx;
  }
  /* who may write what (CONTRACT.md, entryRules). A client's reply carries no "via"; a client's approval of a quote carries the record of the emailed code */
  var SY_TYW = { y: /^(request|quote|note|accept|decline|dispute)$/, c: /^(request|question|counter|accept|decline|note|dispute)$/ };   // dispute: v108 (65)
  function syEntryOk(c, e, se, o, made) {
    var prev = c.entries[c.entries.length - 1];
    if (se.w !== 'y' && se.w !== 'c') return false;
    if (!SY_TYW[e.w].test(e.ty)) return false;
    if (e.w === 'y' && !o.full) return false;   // the pull carries only what the client did; the studio's own entries come back only when a whole project is read
    /* a request opens with the client's request, or (asked on a Scope version) with their question: CONTRACT.md, Ask a question */
    if (made && e.ty !== 'request' && !(e.ty === 'question' && e.w === 'c' && !c.adds) && !(e.ty === 'dispute' && e.w === 'c' && e.bug != null)) return false;   // v108: a dispute opened from a warranty problem
    if (e.w === 'c') {
      if (se.via != null) return false;
      if (e.ty === 'accept') {
        if (!e.rec || e.rec.via !== 'email code' || !prev || prev.w !== 'y' || prev.ty !== 'quote' || !prev.hx) return false;
        if (e.rec.fp !== pdGroup(prev.hx, 12) || (prev.vu && e.rec.ts > prev.vu)) return false;   // the code was for this quote, and the quote was still open
      }
    }
    return true;
  }
  /* returns a short line for the toast, '' when nothing new, null when there is a gap before it, false when it did not verify */
  async function syApplyEntry(ev, o) {
    var crId = syS(ev.cr, 12), p = pdById(syS(ev.project, 64)), se = ev.entry, c, made = false, e, cl, g, me, loud = !o.quiet;
    if (!p || !syMine(p) || !se || typeof se !== 'object' || !/^CR-\d{3}$/.test(crId)) return '';
    cl = byId(p.cid) || {}; g = given(cl) || 'Client';
    c = pdCr(p, crId);
    if (!c) {
      if (syI(se.idx) !== 0) return o.noGap ? '' : null;
      c = { id: crId, t: syS(ev.title, 90), base: syI(ev.base), adds: !!ev.adds, touches: ev.adds ? 1 : 0, entries: [], cmp: null }; made = true;
    }
    if (syI(se.idx) < c.entries.length) return '';
    if (syI(se.idx) > c.entries.length) return o.noGap ? '' : null;
    if (typeof se.hx !== 'string' || !/^[0-9a-f]{64}$/.test(se.hx)) return false;
    e = syLocalEntry(se, loud);   // the copy that is checked is the copy that is kept
    if (!(await syChainOk(p, c, e, se.hx)) || !syEntryOk(c, e, se, o, made)) return false;
    me = e.w === 'y';
    if (made) p.crs.push(c);
    c.entries.push(e); c.ok = false;   // a draft you are writing stays: c.cmp is left alone, unless it is the very text that just turned out to have been sent
    if (me && c.cmp && c.cmp.ty === e.ty && String(c.cmp.tx || '').trim() === e.tx) c.cmp = null;
    pdTouch(p);
    if (made) pdLogNew(p, c, me);
    else pdLogClient(cl, me ? 'you' : 'client', me ? 'You wrote on ' + c.id : g + (SY_LINE[e.ty] || ' replied on ') + c.id, 'Change request');
    if (loud && cl.log && cl.log[0]) cl.log[0][3] = syAgo(e.ts);
    pdAfterChange(p);
    pdChain(p, c);
    return me ? 'Your message to ' + g + ' on ' + c.id + ' is in' : made ? g + ' opened ' + c.id : g + (SY_LINE[e.ty] || ' replied on ') + c.id;
  }
  function syApplyApproval(p, v, r, quiet) {
    var l = pdVer(p, v), cl = byId(p.cid) || {}, g = given(cl) || 'Client';
    if (!l || l.appr || !r || typeof r !== 'object') return '';
    if (!l.fp || !r.fp || l.fp !== r.fp || r.via !== 'email code') return false;   // an approval is for one exact fingerprint; anything else is not this approval
    l.appr = syS(r.by, 100) + ' · ' + dayLbl(syI(r.at)); l.apts = syI(r.at);
    l.rec = { via: syS(r.via, 20), at: syStampMs(syI(r.at)), ts: syI(r.at), ip: syS(r.ip, 64), fp: syS(r.fp, 20), email: syS(r.email, 120) };
    pdTouch(p);
    pdLogClient(cl, 'client', g + ' approved Scope v' + v, 'Trusted version');
    if (!quiet && cl.log && cl.log[0]) cl.log[0][3] = syAgo(syI(r.at));
    pdAfterChange(p);
    return g + ' approved Scope v' + v;
  }
  /* the server's whole picture of one project, used when an event arrives that does not follow from what we hold */
  function syRecMsg(p) { return 'Something on ' + (p.n || p.id) + ' did not match its record, so it was not added. Sync again in a moment.'; }
  async function syReconcile(p) {
    var r = await syCall('GET', '/v1/projects/' + p.id), sp, out = [], i, j, t, refused = 0, crs, vers, ens;
    if (!syOk(r)) return syBad(r);
    sp = r.data.project && typeof r.data.project === 'object' ? r.data.project : {};
    crs = Array.isArray(sp.crs) ? sp.crs : []; vers = Array.isArray(sp.vers) ? sp.vers : [];
    for (i = 0; i < crs.length; i++) {
      ens = crs[i] && Array.isArray(crs[i].entries) ? crs[i].entries : [];
      for (j = 0; j < ens.length; j++) {
        try { t = await syApplyEntry({ project: p.id, cr: crs[i].id, title: crs[i].t, base: crs[i].base, adds: crs[i].adds, entry: ens[j] }, { noGap: true, quiet: true, full: true }); } catch (x) { t = false; }
        if (t === false) refused++; else if (t) out.push(t);
        if (t === false) break;   // what follows hangs on this one
      }
    }
    vers.forEach(function (v) { if (v && v.approval) { try { t = syApplyApproval(p, syI(v.v), v.approval, true); } catch (x) { t = false; } if (t === false) refused++; else if (t) out.push(t); } });
    var evs = Array.isArray(sp.ev) ? sp.ev : [];
    for (i = 0; i < evs.length; i++) {   // the delivery record, both sides, in order
      try { t = await syApplyMev(p.id, evs[i], { noGap: true, full: true }); } catch (x) { t = false; }
      if (t === false) { refused++; break; } else if (t) out.push(t);
    }
    if (refused) syBadSet('rec|' + p.id, syRecMsg(p)); else syBadClear('rec|' + p.id);
    return { ok: true, out: out, refused: refused };
  }
  function syOpened(c, ts) {
    var g = given(c) || 'Client';
    if (!c || c.portal === 'closed' || ts <= (c.seenTs || 0)) return false;   // a replay of the same visit says nothing new
    c.seenTs = ts;
    c.portal = 'active'; c.ptS = 'Seen ' + syAgo(ts).toLowerCase(); c.seenN = Date.now() - ts < 9e4 ? 'now' : syAgo(ts).replace(' ago', ''); c.seenT = syAgo(ts);
    pdLogClient(c, 'client', g + ' opened the portal', 'Client portal');
    if (c.log && c.log[0]) c.log[0][3] = syAgo(ts);
    c.act = [syAgo(ts), g + ' opened the portal'];
    refreshRow(c);
    return true;
  }
  function syTouchedUI(ps, cs) {
    ps.forEach(function (p) { if (curView === 'project' && pd.p === p) syRepaint(); });
    cs.forEach(function (c) { if (curView === 'client' && cdCur === c && !document.querySelector('#cd-mail-f input:focus')) renderClient(c, { still: true, fresh: true }); });
    if (cs.length) { updateCounts(); lists.clients.refresh(); }
  }
  async function syPullOnce() {
    var done = 0, guard = 0, said = [], ps = [], cs = [], opens = {}, looked = {}, r, evs, i, ev, t, p, c, rc, gapped, ks, stop = null, gen = SY.gen;
    function fold(rc, p) {   // what a whole-project read added, in the same round
      rc.out.forEach(function (x) { said.push(x); });
      if (rc.out.length && ps.indexOf(p) < 0) ps.push(p);
      if (rc.refused && said.indexOf(SY_REFUSED) < 0) said.push(SY_REFUSED);
      return rc.out.length > 0;
    }
    while (!stop && guard++ < 40) {
      r = await syCall('GET', '/v1/pull', null, { q: { after: SY.cursor, limit: 100 } });
      if (!syOk(r)) return syBad(r);
      evs = Array.isArray(r.data.events) ? r.data.events : [];
      for (i = 0; i < evs.length; i++) {
        ev = evs[i]; t = ''; gapped = false;
        if (gen !== SY.gen) { stop = { ok: false, net: true, unsure: true, msg: '' }; break; }   // connected or disconnected meanwhile: this round belongs to the old connection
        if (!ev || typeof ev !== 'object') continue;
        try {
          if (ev.type === 'open') {
            c = byId(syS(ev.client, 64));
            if (c) { if (!opens[c.id] || opens[c.id].ts < ev.ts) opens[c.id] = { c: c, ts: syI(ev.ts) }; }
          } else if (ev.type === 'entry') {
            t = await syApplyEntry(ev, { quiet: SY.first });
            if (t === null || t === false) {   // a gap, or a reply that did not verify: ask for the whole project once and carry on
              p = pdById(syS(ev.project, 64)); t = '';
              if (p && syMine(p)) {
                rc = await syReconcile(p); looked[p.id] = 1;
                if (rc.ok) gapped = fold(rc, p);
                else if (rc.unsure) { stop = rc; break; }   // no answer: this event stays in the queue and is read again
                else syBadSet('rec|' + p.id, syRecMsg(p));
              }
            }
            p = pdById(syS(ev.project, 64)); if (p && ps.indexOf(p) < 0 && (t || gapped)) ps.push(p);
          } else if (ev.type === 'mev') {
            t = await syApplyMev(ev.project, ev.ev, { quiet: SY.first });
            if (t === null || t === false) {
              p = pdById(syS(ev.project, 64)); t = '';
              if (p && syMine(p)) {
                rc = await syReconcile(p); looked[p.id] = 1;
                if (rc.ok) gapped = fold(rc, p);
                else if (rc.unsure) { stop = rc; break; }
                else syBadSet('rec|' + p.id, syRecMsg(p));
              }
            }
            p = pdById(syS(ev.project, 64)); if (p && ps.indexOf(p) < 0 && (t || gapped)) ps.push(p);
          } else if (ev.type === 'approval' && ev.kind === 'scope') {
            p = pdById(syS(ev.project, 64));
            if (p && syMine(p)) {
              t = syApplyApproval(p, syI(ev.v), ev.record, SY.first);
              if (t === false) {
                rc = await syReconcile(p); looked[p.id] = 1; t = '';
                if (rc.ok) fold(rc, p);
                else if (rc.unsure) { stop = rc; break; }
                else syBadSet('rec|' + p.id, syRecMsg(p));
              } else if (t && ps.indexOf(p) < 0) ps.push(p);
            }
          }
        } catch (x) {   // one event nobody can read must not stop the ones after it
          t = ''; p = pdById(syS(ev.project, 64));
          if (p && syMine(p)) syBadSet('rec|' + p.id, syRecMsg(p));
          if (said.indexOf(SY_REFUSED) < 0) said.push(SY_REFUSED);
        }
        if (t) said.push(t);
        SY.cursor = Math.max(SY.cursor, syI(ev.seq)); done++;
      }
      if (evs.length < 100) break;
    }
    if (!stop) {
      /* a project with something that did not verify is looked at again every time, until it checks out */
      ks = Object.keys(SY.bad).filter(function (k) { return /^rec\|/.test(k); });
      for (i = 0; !stop && i < ks.length; i++) {
        p = pdById(ks[i].slice(4));
        if (!p || !syMine(p)) { syBadClear(ks[i]); continue; }
        if (looked[p.id]) continue;
        rc = await syReconcile(p); looked[p.id] = 1;
        if (rc.ok) fold(rc, p); else if (rc.unsure) stop = rc;
      }
      /* a write whose answer never came back may have landed: one look at the project settles it */
      ks = Object.keys(SY.look);
      for (i = 0; !stop && i < ks.length; i++) {
        delete SY.look[ks[i]]; p = pdById(ks[i]);
        if (!p || !syMine(p) || looked[p.id]) continue;
        rc = await syReconcile(p); looked[p.id] = 1;
        if (rc.ok) fold(rc, p); else if (rc.unsure) { SY.look[p.id] = 1; stop = rc; }
      }
    }
    Object.keys(opens).forEach(function (id) {
      var o = opens[id];
      if (SY.first && Date.now() - o.ts > 7 * 864e5) return;
      if (syOpened(o.c, o.ts) && cs.indexOf(o.c) < 0) cs.push(o.c);
    });
    ps.forEach(function (x) { var cc = byId(x.cid); if (cc && cs.indexOf(cc) < 0) cs.push(cc); });
    sdUTNow(); syTouchedUI(ps, cs);
    if (ps.length || cs.length) SDB.soon(100);
    return stop ? { ok: false, net: stop.net, unsure: true, msg: stop.msg, said: said, n: done } : { ok: true, said: said, n: done };
  }
  async function syPull() {
    if (!SY.key || SY.st === 'auth') return { ok: false, msg: 'Not signed in.' };
    if (SDB.S.stale) return { ok: false, msg: 'This tab is behind another one. Reload it to keep syncing.' };   // what came back could not be saved here
    var gen = SY.gen, r = await syQ(syPullOnce);
    if (gen !== SY.gen) return r;   // connected or disconnected while it ran: the state below is not this round's to set
    if (r && r.said && r.said.length && !SY.first && !pendingUndo) showToast(r.said.length === 1 ? r.said[0] : r.said.length + ' updates from your clients');   // never over a toast that offers Undo
    if (r && r.ok) {
      SY.st = 'ok'; SY.fails = 0; SY.last = Date.now(); SY.msg = ''; SY.first = false;
    } else if (r && SY.st !== 'auth') { SY.st = 'err'; SY.fails++; SY.msg = r.msg || 'Could not sync.'; }
    syPaint(); return r;
  }
  function syPullSoon() { if (SY.key && SY.st !== 'auth') syPull(); }
  async function syTick() {
    if (!SY.key || SY.st === 'auth' || document.visibilityState === 'hidden' || SDB.S.stale) return;
    var m = await syFlushMeta();
    if (m && !m.ok && m.net) { SY.st = 'err'; SY.fails++; SY.msg = m.msg; syPaint(); return; }
    await syPull();
    cpPull();   // v102 (59): the client's pictures, into Drive
  }
  function syStart() {
    clearTimeout(SY.tm);
    if (!SY.key || SY.st === 'auth') return;
    SY.tm = setTimeout(function () { syTick().then(syStart, syStart); }, SY.fails ? Math.min(300000, 30000 * Math.pow(2, SY.fails - 1)) : 30000);
  }

  /* a panel that is repainted while you type in it would lose your caret, so it waits until you stop. An empty box is not typing:
     after you send, the cursor stays in the empty reply box, and what the client just wrote must still appear */
  var syDown = false;
  document.addEventListener('pointerdown', function () { syDown = true; }, true);
  document.addEventListener('pointerup', function () { syDown = false; }, true);
  document.addEventListener('pointercancel', function () { syDown = false; }, true);
  function syTyping() {
    var a = document.activeElement;
    return !!(syDown || (a && pdPanel.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && (a.tagName === 'SELECT' || a.value)));
  }
  function syRepaint(force) {   // force: the person pressed Send and is waiting to be told why nothing was sent
    var a, box;
    if (!force && syTyping()) { if (!SY.defer) { SY.defer = true; setTimeout(syRepaintTry, 900); } return; }
    SY.defer = false;
    a = document.activeElement; box = !!(a && a.tagName === 'TEXTAREA' && pdPanel.contains(a) && a.closest('.pd-compose'));
    pdRerender();
    if (box) { a = pdPanel.querySelector('.pd-compose textarea'); if (a) { a.focus({ preventScroll: true }); try { a.setSelectionRange(a.value.length, a.value.length); } catch (x) {} } }
  }
  function syRepaintTry() {
    if (!SY.defer) return;
    if (syTyping()) { setTimeout(syRepaintTry, 900); return; }
    SY.defer = false; if (curView === 'project' && pd.p) syRepaint();
  }

  /* ---- links for the client ---- */
  async function syMint(c, send, p, over) {
    var e = p && syMine(p) ? await syEnsure(p, over) : await syEnsureClient(c, over), r, lb;
    if (!e.ok) return e;
    lb = { client: c.id, send: !!send, project: p && syMine(p) ? p.id : undefined };
    if (stLinkDays() !== 14) lb.ttl_days = stLinkDays();   // 14 is what the server does on its own; anything else is the studio's choice (Settings)
    r = await syCall('POST', '/v1/links', lb);
    if (!syOk(r)) return syBad(r, given(c));
    return { ok: true, days: Math.round((syI(r.data.expires_at) - Date.now()) / 864e5) };   /* api.php 1.31.4 (CONTRACT 136): the link is in the client's inbox only */
  }
  async function syEnsureClient(c, over) {
    var co, cb, r;
    if (!c.email) return { ok: false, msg: 'Add ' + (given(c) || 'the client') + '’s email first.' };
    if (!syRefOk(c.id)) return { ok: false, msg: 'This name cannot be used as a portal address. Rename it.' };
    co = c.sy = c.sy || {}; cb = JSON.stringify(Object.assign(syClientBody(c), over || {}));
    if (co.slug !== SY.slug || co.last !== cb) {
      r = await syPutClient(c.id, JSON.parse(cb));
      if (!syOk(r)) return syBad(r, given(c));
      co.last = cb; co.slug = SY.slug;
    }
    return { ok: true };
  }
  function syOnPortal(c) { return PROJECTS.some(function (p) { return p.cid === c.id && syLive(p); }); }
  function syLiveProjects(c) { return PROJECTS.filter(function (p) { return p.cid === c.id && syMine(p); }); }
  /* Invite, resend and reopen: the email goes first. Only if it was sent does the client page say so */
  function syIntercept(c, a) {
    var ps, p, btn;
    if (a !== 'invite' && a !== 'resend' && a !== 'reopen') return false;
    if (!SY.key) { if (!syOnPortal(c)) return false; showToast('Sign in to the portal in Settings first.'); return true; }   // the real email cannot go from here, so nothing may say it did
    if (SY.st === 'auth') { showToast('Sign in to the portal again in Settings first.'); return true; }
    if (!c.email) { syAskMail(c); showToast('Add ' + (given(c) || 'the client') + '’s email first.'); return true; }
    ps = syLiveProjects(c).filter(function (x) { return !c.projects.some(function (y) { return y.pid === x.id && y.done; }); }); p = ps.length === 1 ? ps[0] : null;
    btn = cdHost.querySelector('.cd-next .btn-primary'); if (btn) { btn.disabled = true; btn.setAttribute('data-label', btn.textContent); btn.textContent = 'Sending…'; }
    syQ(function () { return syMint(c, true, p, { portal: 'on' }); }).then(function (r) {
      if (btn) { btn.disabled = false; if (btn.getAttribute('data-label')) btn.textContent = btn.getAttribute('data-label'); }
      if (!r.ok) { showToast(r.msg); return; }
      doAct(c, a, true); syPaint();
    });
    return true;
  }
  /* api.php 1.31.4 (CONTRACT 136): a portal link only ever goes to the client's own inbox. Copy portal link is Email portal link: the
     studio never holds a link that opens the client's portal (it could answer there as the client). The server sends at most 5 a day
     to one address, and none to a domain that takes no mail */
  function syMailLink(c, b, p) {
    if (!SY.key) { showToast('Sign in to the portal in Settings first.'); return; }
    if (SY.st === 'auth') { showToast('Sign in to the portal again in Settings first.'); return; }
    if (!c.email) { syAskMail(c); showToast('Add ' + (given(c) || 'the client') + '’s email first.'); return; }
    var ps = syLiveProjects(c); p = p || (ps.length === 1 ? ps[0] : null);
    if (b) b.disabled = true;
    syQ(function () { return syMint(c, true, p); }).then(function (r) {
      if (b) b.disabled = false;
      if (!r.ok) { showToast(r.msg); return; }
      c.act = ['Just now', 'Portal link sent']; pdLogClient(c, 'you', 'You emailed the portal link to ' + (given(c) || c.name), 'Client portal'); refreshRow(c);
      showToast('Link emailed to ' + (given(c) || c.name));
    });
  }
  /* the project's own button: email the link */
  function syPanelAct(act, p, b) {
    var c = byId(p.cid); if (!c || !syMine(p)) return;
    syMailLink(c, b, p);
  }
  /* a client with no email cannot be reached; this is the one place it is added */
  var syMailFor = null;
  function syAskMail(c) { syMailFor = c.id; if (curView === 'client' && cdCur === c) { renderClient(c, { still: true }); var i = document.querySelector('#cd-mail-f input'); if (i) i.focus({ preventScroll: false }); } }
  function syMailHTML(c) {
    if (syMailFor === c.id) return '<form class="sy-mail" id="cd-mail-f" data-sy-mail novalidate><div class="fld"><input type="email" inputmode="email" placeholder="name@company.com" maxlength="90" aria-label="Email for ' + esc(c.contact) + '" autocomplete="off"><span class="err" role="alert"></span></div><button type="submit" class="btn-primary btn-sm">Save</button><button type="button" class="btn-ghost btn-sm" data-sy="mailx">Cancel</button></form>';
    return '<button type="button" class="btn-ghost btn-sm" data-sy="mail">Add email</button>';
  }
  cdHost.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-sy-mail]'); if (!f || !cdCur) return;
    e.preventDefault();
    var i = f.querySelector('input'), v = i.value.trim(), er = f.querySelector('.err'), fl = f.querySelector('.fld');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { er.textContent = 'That email address does not look right.'; fl.setAttribute('data-err', ''); i.setAttribute('aria-invalid', 'true'); i.focus(); return; }
    cdCur.email = v; syMailFor = null;
    cdCur.log.unshift(['you', 'You added ' + (given(cdCur) || cdCur.name) + '’s email', '', 'Just now', null, Date.now()]);
    renderClient(cdCur, { still: true, fresh: true }); showToast('Email saved');
  });
  cdHost.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sy]'); if (!b || !cdCur) return;
    e.preventDefault();
    if (b.getAttribute('data-sy') === 'mail') syAskMail(cdCur);
    else if (b.getAttribute('data-sy') === 'mailx') { syMailFor = null; renderClient(cdCur, { still: true }); }
  });

  /* ---- pieces of the existing screens that change when a project is on the portal ---- */
  function syIssueStep(p, g, n) {
    var s = syStatus(p);
    if (s.k === 'join') return 'Puts this project on your portal. ' + g + ' opens it with a private link and approves Scope v' + n + ' with a code we email.';
    if (s.k === 'portal') return g + ' sees Scope v' + n + ' in the portal and approves it with a code we email.';
    if (s.k === 'local' || s.k === 'blocked') return s.why;
    return g + ' gets the Client Action “Approve Scope v' + n + '” in the portal.';
  }
  function syApprovalExtra(p, state) {
    var s = syStatus(p), c = byId(p.cid) || {}, g = given(c) || 'the client';
    if (s.k === 'portal' && state === 'wait') return '<div class="pd-s-acts sy-acts"><button type="button" class="btn-primary btn-sm" data-pd="sylink">Email link to ' + esc(g) + '</button></div>';
    if (s.k === 'portal' && state === 'ok') return '<p class="pd-note">The record is on your server too: time, IP address and the fingerprint of what was approved.</p>';
    if (s.k === 'local' || s.k === 'blocked') return '<p class="pd-note sy-note">' + esc(s.why) + '</p>';
    return '';
  }
  function syBusy(btn, on, label) {
    var t;
    if (!btn) return;
    t = btn.querySelector('[data-go]') || btn;   // the composer button keeps its icon; only the words change
    if (on) { if (!btn.hasAttribute('data-l')) btn.setAttribute('data-l', t.textContent); btn.disabled = true; t.textContent = label; }
    else { btn.disabled = false; if (btn.hasAttribute('data-l')) { t.textContent = btn.getAttribute('data-l'); btn.removeAttribute('data-l'); } }
  }

  /* ---- sign in and out: the Client portal card (Settings), the drawer, and the account menu ----
     Two ways in, one account per email address. Google comes first: the extension asks Google (chrome.identity.launchWebAuthFlow) for an
     ID token that only this sign-in can use, and the server checks it against Google's published keys. No Google token is kept here, only the
     server's key, and Google is asked to show its account chooser every time. Email is the other way: a 6-digit code, and the server refuses
     throw-away addresses when it makes a new account. Signing out ends the key on the server first, then clears it here; projects, clients and
     notes stay on this device. */
  var syCard = document.getElementById('sy-body'), syPill = document.getElementById('sy-pill'), sySub = document.getElementById('sy-sub');
  function syWhen() { return !SY.last ? 'Not yet' : Date.now() - SY.last < 90000 ? 'Just now' : syAgo(SY.last); }
  function syViaName() { return SY.via === 'google' ? 'Google' : 'Email'; }
  function syHasSession() { return !!(SY && SY.key && SY.st !== 'auth'); }
  function syRequireProfileSignIn() {
    acctClose(true);
    openDrawer('sync', pfUser, '#sy-google');
  }
  function syPaint() {
    var h = '', pt;
    if (!syHasSession() && curView === 'profile') showView('dashboard');
    if (!syCard) return;
    if (!SY.key) {
      pt = ['off', 'Not signed in']; sySub.textContent = 'Where clients approve Scope and changes.';
      h = '<p class="sy-p">Sign in to your ScopeDue server so clients can open a private link and approve. The server keeps only Scope versions, change requests, replies and approval records. Everything else stays on this device, unless you turn on team sync for a project: it is encrypted before it leaves, and the server cannot read it.</p>' +
        '<p class="sy-p">Your ScopeDue account is the same one you use on scopedue.com. Sign in with Google or your email, or create an account.</p>' +
        '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-open-drawer="sync" data-focus="#sy-google">Sign in</button></div>';
    } else if (SY.st === 'auth') {
      pt = ['off', 'Signed out']; sySub.textContent = 'Your server no longer accepts the key saved here.';
      h = '<p class="sy-p">The key saved here was replaced or removed on the server, for example by signing in on another computer. Nothing was lost on the server. Sign in again to carry on.</p><div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-open-drawer="sync" data-focus="#sy-google">Sign in again</button><button type="button" class="btn-ghost btn-sm" data-sy="out">Clear this sign-in</button></div>';
    } else {
      pt = SY.st === 'err' ? ['inv', 'Offline'] : ['ok', 'Signed in']; sySub.textContent = SY.st === 'err' ? 'Changes to projects on the portal wait until the server answers.' : 'Clients open a private link; you see what they do here.';
      h = '<dl class="cd-dl"><div><dt>Server</dt><dd>' + esc(syHost()) + '</dd></div><div><dt>Account</dt><dd>' + esc(SY.email) + ' <span class="sy-via">' + esc(syViaName()) + '</span></dd></div>' +
        '<div><dt>Clients see</dt><dd><button type="button" class="st-who" data-view="profile" title="Change in Profile"><i class="st-dot" style="background:' + (PF_TONES[pfSaved.tone] || PF_TONES[0]) + '"></i>' + esc((pfSaved.biz || '').trim() || pfSaved.name) + '</button></dd></div>' +
        '<div><dt>Last sync</dt><dd id="sy-when" class="' + (SY.st === 'err' ? 'sy-bad' : '') + '">' + (SY.st === 'err' ? esc(SY.msg || 'Could not reach the server') : esc(syWhen())) + '</dd></div>' +
        (SY.profMsg ? '<div><dt>Profile</dt><dd class="sy-bad">' + esc(SY.profMsg) + '</dd></div>' : '') + (SY.warn ? '<div><dt>Needs a look</dt><dd class="sy-bad">' + esc(SY.warn) + '</dd></div>' : '') +
        '<div><dt>On the portal</dt><dd>' + (function () { var n = PROJECTS.filter(syMine).length; return n ? n + (n === 1 ? ' project' : ' projects') : 'Nothing yet'; })() + '</dd></div></dl>' +
        '<p class="sy-p">The sign-in key for ' + esc(syHost()) + ' is kept in this browser, not in your computer’s password store. Anyone who can use this browser profile can use it. Sign out ends it on the server at once.</p>' +
        '<div class="sy-acts"><button type="button" class="btn-ghost btn-sm" data-sy="sync">Sync now</button><button type="button" class="btn-ghost btn-sm" data-sy="out">Sign out</button></div>';
    }
    syPill.innerHTML = '<i class="pd ' + pt[0] + '"></i>' + pt[1];
    if (syCard._h !== h) { syCard._h = h; syCard.innerHTML = h; }
    stPaintNotify(); stPaintTabs(); acctPaint(); xsAuth();   // the notices row, the portal mark, the account menu and Help › Contact support follow the sign-in
    if (curView === 'client' && cdCur) { var pc = cdHost.querySelector('[aria-labelledby="cd-h-portal"]'), tmp; if (pc) { tmp = htmlEl(portalHTML(cdCur)); if (pc.outerHTML !== tmp.outerHTML) pc.replaceWith(tmp); } }
  }
  syCard.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sy]'); if (!b) return;
    var a = b.getAttribute('data-sy');
    if (a === 'sync') { syBusy(b, true, 'Syncing…'); syFlushMeta().then(function () { return syPull(); }).then(function (r) { syBusy(b, false); syPaint(); showToast(SDB.S.stale ? 'Reload this tab first.' : SY.st === 'ok' ? 'Synced' : (SY.msg || 'Could not sync')); }); }
    else if (a === 'out') sySignOut(b);
  });

  /* Local only: forget the key, the address and everything in flight. The server is told first by sySignOut. */
  function syDisconnect() {
    SY.gen++; SY.look = {}; SY.fails = 0; clearTimeout(SY.metaT);
    clearTimeout(SY.tm); SY.key = ''; SY.url = ''; SY.slug = ''; SY.email = ''; SY.via = ''; SY.st = 'off'; SY.cursor = 0; SY.last = 0; SY.msg = ''; SY.profLast = ''; SY.profMsg = ''; SY.warn = ''; SY.bad = {}; SY.first = true; SY.pend = null;
    syStore(); syPaint();
  }
  /* Sign out ends the key on the server (so a lost laptop cannot keep syncing), waits a few seconds at most, then clears it here either way. */
  var syOutBusy = false;
  /* asks the server to end this browser's key; answers its reply, or null when there was nothing to end, or a dead answer after `ms` */
  function syEndKey(ms) {
    if (!SY.key || SY.st === 'auth') return Promise.resolve(null);   // a key the server already refused needs no goodbye
    return Promise.race([syQ(function () { return syCall('DELETE', '/v1/studio/key'); }), new Promise(function (res) { setTimeout(function () { res({ status: 0, net: true, data: {} }); }, ms || 6000); })]);
  }
  async function sySignOut(btn) {
    var gen = SY.gen, r, ended;
    if (!SY.key || syOutBusy) return;
    syOutBusy = true; if (btn) syBusy(btn, true, 'Signing out…');
    r = await syEndKey(6000);
    syOutBusy = false;
    if (gen !== SY.gen) return;   // signed in or out some other way meanwhile
    ended = !r || r.status === 200 || r.status === 401;
    syDisconnect();
    showToast(ended ? 'Signed out. Your projects stay on this device.' : 'Signed out on this device. Your server could not be reached, so the old key still works there until you sign in again.');
    xaGate();   /* v72: the web app asks to sign in again */
  }

  /* drawer: Google first; or an address, a name and an email -> a code by email -> signed in */
  var syDr = document.getElementById('drawer-sync'), syForm = document.getElementById('sy-form'), syGo = document.getElementById('sy-go'), syStep = 1, syCool = 0;
  var syWork = false;
  var syMode = 'signin';
  function sySetMode(mode) {
    if (syWork) return;
    syMode = mode === 'signup' ? 'signup' : 'signin';
    var signup = syMode === 'signup';
    syDr.classList.toggle('sy-signin', !signup);
    document.getElementById('f-sy-name').hidden = !signup;
    document.getElementById('f-sy-confirm').hidden = !signup;
    document.getElementById('sy-password-hint').hidden = !signup;
    document.getElementById('sy-signup-note').hidden = !signup;
    syEl.password.autocomplete = signup ? 'new-password' : 'current-password';
    syEl.confirm.autocomplete = signup ? 'new-password' : 'off';
    syEl.confirm.required = signup;
    syEl.password.value = ''; syEl.confirm.value = ''; syEl.code.value = ''; SY.pend = null;
    document.getElementById('sy-switch-note').textContent = signup ? 'Already have an account?' : "Don't have an account?";
    document.getElementById('sy-mode').textContent = signup ? 'Sign in' : 'Sign up';
    sySend.textContent = signup ? 'Create account' : 'Sign in';
    syClearErrs(); syStepTo(1);
  }
  var syGB = document.getElementById('sy-google'), sySend = document.getElementById('sy-send'), syGN = document.getElementById('sy-gnote');
  var syEl = { url: document.getElementById('sy-url'), name: document.getElementById('sy-name'), email: document.getElementById('sy-email'), code: document.getElementById('sy-code') };
  syEl.password = document.getElementById('sy-password'); syEl.confirm = document.getElementById('sy-confirm');
  function syFErr(id, msg, el) {
    var f = document.getElementById(id), er = f.querySelector('.err'), i = f.querySelector('input');
    if (msg) { f.setAttribute('data-err', ''); er.textContent = msg; if (i) i.setAttribute('aria-invalid', 'true'); if (el) el.focus(); }
    else { f.removeAttribute('data-err'); er.textContent = ''; if (i) i.removeAttribute('aria-invalid'); }
  }
  /* the address alone (never a key) is remembered after signing out, so signing in again is one click */
  /* the ScopeDue server every copy of the extension signs in to: people only sign in or sign up, they never type an address */
  var SD_SERVER = 'https://scopedue.com/api/api.php';
  function syLastUrl() { try { var u = localStorage.getItem('sd-server') || ''; return /\.php$/i.test(u) ? u : ''; } catch (e) { return ''; } }
  function syGoogleCan() { try { return !!(window.chrome && chrome.identity && chrome.identity.launchWebAuthFlow && chrome.identity.getRedirectURL); } catch (e) { return false; } }
  function syRedirect() { try { return syGoogleCan() ? chrome.identity.getRedirectURL() : ''; } catch (e) { return ''; } }
  var syGHint = '';   // under the button: why Google could not be used, or what to look at after a closed window
  function syGPaint() {
    var can = syGoogleCan(), rd = syRedirect();
    syGB.disabled = !can;
    syGN.textContent = can ? syGHint : 'Google sign-in works in the ScopeDue extension. On this page, choose Continue with email.';
    document.getElementById('sy-redirect').textContent = rd || 'Open ScopeDue from the extension to see it';
    document.getElementById('sy-redirect-copy').hidden = !rd;
  }
  function syStepTo(n) {
    syStep = n;
    document.getElementById('sy-s1').hidden = n !== 1; document.getElementById('sy-s2').hidden = n !== 2;
    document.getElementById('sy-title').textContent = n === 1 ? (syMode === 'signup' ? 'Sign up' : 'Sign in') : 'Verify your email';
    syDr.querySelector('.dr-x').setAttribute('aria-label', syMode === 'signup' ? 'Close sign up' : 'Close sign in');
    document.getElementById('sy-dsub').textContent = n === 1 ? 'Clients open a private link on scopedue.com and approve there. Nothing else leaves this device.' : 'We emailed a 6-digit code to ' + (SY.pend ? SY.pend.email : '') + '. It works for 10 minutes.';
    syGo.hidden = n !== 2; syGo.textContent = 'Create account';
    document.getElementById('sy-hint').innerHTML = n === 1 ? '' : '<button type="button" class="pf-link" id="sy-again">Send a new code</button>';
    var ag = document.getElementById('sy-again'); if (ag) ag.addEventListener('click', syAgain);
  }
  function syOnOpen() {
    syForm.reset(); ['f-sy-url', 'f-sy-name', 'f-sy-email', 'f-sy-code', 'f-sy-password', 'f-sy-confirm'].forEach(function (id) { syFErr(id, ''); });
    syGlobalErr('');
    syEl.url.value = (SY.url || SD_SERVER).replace(/\?.*$/, '');
    syEl.name.value = pfSaved.name && pfSaved.name !== 'ScopeDue user' ? pfSaved.name : '';
    syEl.email.value = SY.email || pfSaved.email || '';
    SY.pend = null; syWork = false; syGHint = ''; syStepTo(1); syBusy(syGo, false); syBusy(sySend, false); syBusy(syGB, false); syGPaint();
    sySetMode('signin');
    document.getElementById('sy-email-option').open = false;
    return syGoogleCan() ? '#sy-google' : '#sy-email-toggle';
  }
  /* the name typed to sign in becomes the Profile's name while that is still the placeholder: it is the name clients see in their emails */
  function syAdoptName(name) {
    var s, d;
    if (name.length < 2 || (pfSaved.name && pfSaved.name !== 'ScopeDue user')) return;
    s = pfClone(pfSaved); d = pfClone(pfDraft); s.name = name; if (!d.name || d.name === 'ScopeDue user') d.name = name;
    pfApplyState(s, d);
  }
  function syGlobalErr(msg) { var g = document.getElementById('sy-gerr'); g.textContent = msg; g.hidden = !msg; }
  function syClearErrs() { ['f-sy-url', 'f-sy-name', 'f-sy-email', 'f-sy-password', 'f-sy-confirm'].forEach(function (id) { syFErr(id, ''); }); syGlobalErr(''); syGHint = ''; syGPaint(); }
  /* does the address answer like a ScopeDue server, and does it offer Google? */
  async function syProbe(n) {
    var h = await syCall('GET', '/v1/health', null, { base: n.url, anon: true });
    if (h.net) return { err: 'Could not reach ScopeDue. Check your connection and try again.' };
    if (!(h.data && h.data.ok === true)) return { err: 'ScopeDue is not answering right now. Try again in a moment.' };
    return { google: h.data.google === true };
  }

  /* ---- Google ---- */
  function syRand(n) { var a = new Uint8Array(n), s = '', i; crypto.getRandomValues(a); for (i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16); return s; }
  /* Opens Google's account chooser in a browser window. The answer comes back on the extension's own redirect address and never loads a page. */
  function syGoogleAuth(clientId, nonce) {
    return new Promise(function (res) {
      var rd = syRedirect(), state = syRand(16), url;
      if (!rd) { res({ ok: false, msg: 'Google sign-in is not available here.' }); return; }
      url = 'https://accounts.google.com/o/oauth2/v2/auth?' + [['client_id', clientId], ['response_type', 'id_token'], ['scope', 'openid email profile'], ['redirect_uri', rd], ['nonce', nonce], ['state', state], ['prompt', 'select_account']].map(function (kv) { return kv[0] + '=' + encodeURIComponent(kv[1]); }).join('&');
      try {
        chrome.identity.launchWebAuthFlow({ url: url, interactive: true }, function (back) {
          var err = chrome.runtime && chrome.runtime.lastError ? String(chrome.runtime.lastError.message || 'x') : '', p;
          if (err || !back) {
            if (/did not approve|cancel|closed|denied/i.test(err)) res({ ok: false, cancelled: true });
            else res({ ok: false, msg: 'Google would not open its sign-in page. If this is your own server, check that ' + rd + ' is an authorised redirect address for its Google client.' });
            return;
          }
          try { p = new URLSearchParams(new URL(back).hash.replace(/^#/, '')); } catch (e) { p = new URLSearchParams(''); }
          if (p.get('error') === 'access_denied') { res({ ok: false, cancelled: true }); return; }
          if (p.get('state') !== state || !p.get('id_token')) { res({ ok: false, msg: 'Google did not send a sign-in back. Try again.' }); return; }
          res({ ok: true, token: p.get('id_token') });
        });
      } catch (e) { res({ ok: false, msg: 'Google sign-in is not available here.' }); }
    });
  }
  async function syGoogle() {
    var n, pr, st, au, r, er;
    if (syGB.disabled || syWork) return;
    syClearErrs();
    n = syNorm(syEl.url.value); if (n.err) return syGlobalErr(n.err);
    if (!syGoogleCan()) return syGlobalErr('Google sign-in works in the ScopeDue extension. On this page, choose Continue with email.');
    if (!syCanHash()) return syGlobalErr('This page cannot compute fingerprints here. Open ScopeDue from the extension or over https.');
    syWork = true; syBusy(syGB, true, 'Connecting to ScopeDue…');
    try {
      pr = await syProbe(n);
      if (pr.err) return syGlobalErr(pr.err);
      if (!pr.google) { syGlobalErr('Google sign-in is not available right now. Choose Continue with email.'); document.getElementById('sy-email-toggle').focus(); return; }
      st = await syCall('POST', '/v1/studios/google/start', {}, { base: n.url, anon: true });
      if (st.net) return syGlobalErr('Could not reach ScopeDue. Nothing was sent.');
      if (st.status !== 200 || !/^[\w-]{16,64}$/.test(syS(st.data.nonce, 80)) || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(syS(st.data.client_id, 200))) return syGlobalErr(syErr(st).message || 'The server did not start a Google sign-in (' + st.status + ').');
      syGB.textContent = 'Waiting for Google…';
      /* v69: Drive asks the same client for its token (29.15), so the extension's redirect address is listed in one place */
      try { localStorage.setItem('sd-gcid', syS(st.data.client_id, 200)); } catch (e) {}
      au = await syGoogleAuth(st.data.client_id, st.data.nonce);
      if (!au.ok) { if (au.cancelled) { syGHint = 'Google sign-in was closed before it finished. Try again, or choose Continue with email.'; syGPaint(); } else syGlobalErr(au.msg); return; }
      syGB.textContent = 'Signing in…';
      r = await syCall('POST', '/v1/studios/google', { id_token: au.token, nonce: st.data.nonce, tz: pfZone(pfSaved.tz), lang: syLang() }, { base: n.url, anon: true });
      if (r.status !== 200 || !/^sdk_/.test(syS(r.data.key, 80))) {
        er = syErr(r);
        if (r.net) return syGlobalErr('Could not reach ScopeDue. Nothing was changed.');
        if (er.code === 'disposable_email') return syGlobalErr(er.message);
        return syGlobalErr(er.message || 'The server refused this sign-in (' + r.status + ').');
      }
      await syConnected(n.url, r.data, syS(r.data.email, 120), syS(r.data.name, 80), 'google');
    } finally { syWork = false; syBusy(syGB, false); syGPaint(); }
  }

  /* 1.32.0 (CONTRACT 145): the server writes the welcome email in the app's language */
  function syLang() { return window.SDI18N && SDI18N.lang === 'vi' ? 'vi' : 'en'; }

  /* ---- email ---- */
  async function syEmailSubmit() {
    if (syMode === 'signup') return syRequestCode();
    if (syWork) return;
    syClearErrs();
    var n = syNorm(syEl.url.value), em = syEl.email.value.trim().toLowerCase(), password = syEl.password.value, r;
    if (n.err) return syGlobalErr(n.err);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return syFErr('f-sy-email', 'That email address does not look right.', syEl.email);
    if (Array.from(password).length < 8 || Array.from(password).length > 64) return syFErr('f-sy-password', 'Use 8–64 characters for your password.', syEl.password);
    syWork = true; syBusy(sySend, true, 'Signing in…');
    try {
      r = await syCall('POST', '/v1/studios/login', { email: em, password: password, lang: syLang() }, { base: n.url, anon: true });
      if (r.status !== 200 || !/^sdk_/.test(syS(r.data.key, 80))) return syGlobalErr(r.net ? 'Could not reach ScopeDue.' : (syErr(r).message || 'Could not sign in with these details. Check your email and password.'));
      await syConnected(n.url, r.data, em, syS(r.data.name, 80), 'email');
    } finally { syWork = false; syBusy(sySend, false); }
  }
  async function syRequestCode() {
    var n = syNorm(syEl.url.value), name = syEl.name.value.trim(), em = syEl.email.value.trim().toLowerCase(), pr, r, er;
    if (syWork) return;
    syClearErrs();
    if (n.err) return syGlobalErr(n.err);
    if (name.length < 2) return syFErr('f-sy-name', 'Enter your name.', syEl.name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return syFErr('f-sy-email', 'That email address does not look right.', syEl.email);
    var password = syEl.password.value;
    if (Array.from(password).length < 8 || Array.from(password).length > 64) return syFErr('f-sy-password', 'Use 8–64 characters for your password.', syEl.password);
    if (password !== syEl.confirm.value) return syFErr('f-sy-confirm', 'Passwords do not match.', syEl.confirm);
    if (!syCanHash()) return syGlobalErr('This page cannot compute fingerprints here. Open ScopeDue from the extension or over https.');
    syWork = true; syBusy(sySend, true, 'Checking…');
    pr = await syProbe(n);
    if (pr.err) { syWork = false; syBusy(sySend, false); return syGlobalErr(pr.err); }
    sySend.textContent = 'Sending…';
    r = await syCall('POST', '/v1/studios', { name: name, email: em, tz: pfZone(pfSaved.tz), password: password, password_confirm: syEl.confirm.value, lang: syLang() }, { base: n.url, anon: true });
    syWork = false; syBusy(sySend, false);
    if (r.status !== 202) {
      er = syErr(r);
      if (r.net) return syGlobalErr('Could not reach ScopeDue. Nothing was sent.');
      if (er.code === 'disposable_email') return syFErr('f-sy-email', er.message, syEl.email);   // the server's own words: they already say what to do
      return syGlobalErr(er.message || 'The server refused this (' + r.status + ').');
    }
    SY.pend = { url: n.url, challenge: syS(r.data.challenge, 64), email: em, left: syI(r.data.tries) };
    syEl.code.value = ''; syFErr('f-sy-code', ''); syStepTo(2); setTimeout(function () { syEl.code.focus(); }, 60);
  }
  async function syAgain() {
    if (!SY.pend) return;
    var b = document.getElementById('sy-again'), r;
    b.disabled = true;
    r = await syCall('POST', '/v1/studios', { name: syEl.name.value.trim() || 'ScopeDue user', email: SY.pend.email, tz: pfZone(pfSaved.tz), password: syEl.password.value, password_confirm: syEl.confirm.value, lang: syLang() }, { base: SY.pend.url, anon: true });
    b.disabled = false;
    if (r.status === 202) { SY.pend.challenge = syS(r.data.challenge, 64); syFErr('f-sy-code', ''); syEl.code.value = ''; syEl.code.focus(); showToast('A new code is on its way'); }
    else syFErr('f-sy-code', r.net ? 'Could not reach ScopeDue.' : (syErr(r).message || 'Could not send a new code.'), syEl.code);
  }
  async function syVerifyCode() {
    var code = syEl.code.value.replace(/\s+/g, ''), r;
    syFErr('f-sy-code', ''); syGlobalErr('');
    if (!/^\d{6}$/.test(code)) return syFErr('f-sy-code', 'Enter the 6-digit code from your email.', syEl.code);
    syBusy(syGo, true, 'Signing in…');
    r = await syCall('POST', '/v1/studios/verify', { challenge: SY.pend.challenge, code: code }, { base: SY.pend.url, anon: true });
    if (r.status !== 200 || !/^sdk_/.test(syS(r.data.key, 80))) {
      syBusy(syGo, false);
      var er = syErr(r), c = er.code || '';
      if (r.net) return syFErr('f-sy-code', 'Could not reach ScopeDue.', syEl.code);
      if (c === 'code_locked' || c === 'code_expired' || c === 'code_invalid') { syFErr('f-sy-code', (er.message || 'This code no longer works.') + ' Send a new code.', syEl.code); return; }
      return syFErr('f-sy-code', er.message || 'That code did not work.', syEl.code);
    }
    await syConnected(SY.pend.url, r.data, SY.pend.email, syEl.name.value.trim(), 'email');
  }

  /* both ways end here: the server has given us a key */
  async function syConnected(base, d, email, name, via) {
    SY.gen++; SY.bad = {}; SY.warn = ''; SY.look = {}; SY.fails = 0; clearTimeout(SY.metaT);   // whatever was in flight belongs to the old sign-in
    SY.url = base; SY.key = d.key; SY.slug = syS(d.studio, 24); SY.email = email; SY.via = via; SY.st = 'ok'; SY.cursor = 0; SY.first = true; SY.profLast = ''; SY.profMsg = '';
    syStore(); SY.pend = null; try { localStorage.setItem('sd-server', base); } catch (e) {}
    syEl.password.value = ''; syEl.confirm.value = '';
    syAdoptName(name);
    syPaint();   // the card says Signed in at once; the first round trips follow
    await syQ(function () { return syPushProfile(true); });
    await stSyncNotify();
    closeDrawer(true);
    await syPull(); syStart(); syPaint();
    showToast('Signed in · ' + email);
  }
  function syPrimary() { if (syStep === 2) { if (!syGo.disabled) syVerifyCode(); } else if (document.getElementById('sy-email-option').open) syEmailSubmit(); else syGoogle(); }
  syForm.addEventListener('submit', function (e) { e.preventDefault(); syPrimary(); });
  syForm.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); syPrimary(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || !t || t.tagName !== 'INPUT') return;
    e.preventDefault();
    syPrimary();
  });
  syGB.addEventListener('click', syGoogle);
  document.getElementById('sy-mode').addEventListener('click', function () { sySetMode(syMode === 'signup' ? 'signin' : 'signup'); });
  document.getElementById('sy-email-option').addEventListener('toggle', function () {
    if (this.open && window.SDI18N && SDI18N.reveal) SDI18N.reveal(this);
  });
  document.getElementById('sy-redirect-copy').addEventListener('click', function (e) { var rd = syRedirect(); if (rd) copyText(rd, function () { flashCopied(e.currentTarget); showToast('Redirect address copied'); }); });
  [syEl.url, syEl.name, syEl.email, syEl.code, syEl.password, syEl.confirm].forEach(function (i) { i.addEventListener('input', function () { var f = i.closest('.fld'); if (f.hasAttribute('data-err')) syFErr(f.id, ''); syGlobalErr(''); }); });

  /* ---- the account menu: the chip at the bottom of the sidebar ---- */
  var acctEl = document.getElementById('acct'), acctItems = [];
  function acctSub() { return SY.key ? (SY.st === 'auth' ? 'Sign in again' : SY.email) : 'On this device'; }
  function acctPaint() {
    var s;
    if (!acctEl) return;
    s = pfUser.querySelector('.user-txt small'); if (s) s.textContent = acctSub();
    pfUser.setAttribute('aria-label', 'Account menu: ' + pfSaved.name + ', ' + acctSub());
    if (acctEl.hasAttribute('data-open')) acctRender();
  }
  function acctRender() {
    var out = !SY.key, au = !!SY.key && SY.st === 'auth', h, av;
    h = '<div class="acct-id"><span class="avatar" id="acct-av"><span class="pf-ini"></span></span><div class="acct-t"><b>' + esc(pfSaved.name) + '</b><small>' + esc(out ? 'On this device' : SY.email) + '</small></div></div>';
    if (out) h += '<p class="acct-st"><i class="pd off"></i><span>Not signed in. Your work stays on this device.</span></p>';
    else if (au) h += '<p class="acct-st"><i class="pd off"></i><span>You were signed out of ' + esc(syHost()) + '</span></p>';
    else h += '<p class="acct-st"><i class="pd ' + (SY.st === 'err' ? 'inv' : 'ok') + '"></i><span>' + (SY.via === 'google' ? 'Signed in with Google' : 'Signed in with email') + ' · ' + esc(syHost()) + '</span></p>';
    h += '<button type="button" role="menuitem" data-a="profile">' + IC('user') + 'Profile</button><button type="button" role="menuitem" data-a="settings">' + IC('sliders') + 'Settings</button><hr>';
    h += out || au ? '<button type="button" role="menuitem" data-a="in">' + IC('lock') + (au ? 'Sign in again' : 'Sign in') + '</button>' : '<button type="button" role="menuitem" data-a="out">' + IC('arrow') + 'Sign out</button>';
    acctEl.innerHTML = h;
    av = document.getElementById('acct-av'); pfPaint(av, pfSaved);
  }
  function acctPlace() {
    var r = pfUser.getBoundingClientRect(), w = acctEl.offsetWidth || 276, col = app.classList.contains('collapsed'), left, bottom;
    left = col ? r.right + 10 : r.left + 12;
    bottom = col ? window.innerHeight - r.bottom : window.innerHeight - r.top + 8;
    acctEl.style.left = Math.max(8, Math.min(left, window.innerWidth - w - 8)) + 'px';
    acctEl.style.bottom = Math.max(8, bottom) + 'px';
    acctEl.style.transformOrigin = col ? 'bottom left' : 'bottom left';
  }
  function acctOpen() {
    var f;
    if (openEl) closeDrawer(true);
    acctRender(); acctPlace();
    acctEl.setAttribute('data-open', ''); pfUser.setAttribute('aria-expanded', 'true');
    f = acctEl.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function acctClose(silent) {
    if (!acctEl.hasAttribute('data-open')) return;
    acctEl.removeAttribute('data-open'); pfUser.setAttribute('aria-expanded', 'false');
    if (!silent) pfUser.focus({ preventScroll: true });
  }
  pfUser.setAttribute('aria-haspopup', 'menu'); pfUser.setAttribute('aria-expanded', 'false');
  pfUser.addEventListener('click', function (e) {   // the chip opens the menu; Profile is the first item in it
    e.preventDefault(); e.stopPropagation();
    if (acctEl.hasAttribute('data-open')) acctClose(); else acctOpen();
  }, true);
  acctEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'), a;
    if (!b) return;
    a = b.getAttribute('data-a'); acctClose(a === 'in');
    if (document.getElementById('side').hasAttribute('data-open')) document.getElementById('menu-btn').click();   // on a phone the sidebar is a drawer: put it away first
    if (a === 'profile') showView('profile');
    else if (a === 'settings') stGo('general');
    else if (a === 'in') openDrawer('sync', pfUser);
    else if (a === 'out') sySignOut();
  });
  acctEl.addEventListener('keydown', function (e) {
    var items = [].slice.call(acctEl.querySelectorAll('button')), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); acctClose(); }
    else if (e.key === 'Tab') acctClose(true);
  });
  document.addEventListener('click', function (e) { if (acctEl.hasAttribute('data-open') && !e.target.closest('#acct')) acctClose(true); });
  window.addEventListener('resize', function () { acctClose(true); });
  window.addEventListener('scroll', function () { acctClose(true); }, true);

  /* ---- start ---- */
  syLoad();
  syPaint();
  /* the app was closed and opened again: answers that were lost on the way, or writes the browser did not finish saving, are settled by one look at each project on the portal */
  if (SY.key && SDBOOT.restored) PROJECTS.forEach(function (p) { if (syMine(p)) SY.look[p.id] = 1; });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && SY.key && SY.st !== 'auth') { syTick(); syStart(); } });
  window.addEventListener('online', function () { if (SY.key && SY.st === 'err') { SY.fails = 0; syTick(); syStart(); } });
  if (SY.key) setTimeout(function () { syTick().then(syStart, syStart); }, 500);
  if (/^(localhost|127\.0\.0\.1|)$/.test(location.hostname) && sdTest()) window.__sy = { tick: syTick, pull: syPull, state: SY, status: function (id) { var p = pdById(id); return p ? syStatus(p) : null; },
    proj: function (id) { var p = pdById(id); return p ? JSON.parse(JSON.stringify({ n: p.n, vers: p.sc.vers, crs: p.crs, sy: p.sy, upd: p.upd })) : null; },
    open: function (id) { openClient(id); },
    body: function (id) { var p = pdById(id); return p ? syProjBody(p) : null; },
    raw: function (id) { var p = pdById(id); return p ? JSON.parse(JSON.stringify(p, function (k, v) { return k === 'q' || k === 'mevq' ? undefined : v; })) : null; },
    pd: function () { return { id: pd.p ? pd.p.id : '', cr: pd.cr, crf: pd.crf, tab: pd.tab }; },
    patchProject: function (id, patch) { var p = pdById(id); if (p) Object.assign(p, patch); },
    toast: function (m, undo) { showToast(m, undo ? function () {} : undefined); },
    patchClient: function (id, patch) { var c = byId(id); if (c) Object.assign(c, patch); },
    client: function (id) { var c = byId(id); return c ? JSON.parse(JSON.stringify({ portal: c.portal, ptS: c.ptS, seenN: c.seenN, seenT: c.seenT, act: c.act, log: c.log.slice(0, 80), needs: c.needs, email: c.email })) : null; } };

  function syPortalRows(c) {
    if (!SY.key) return '';
    var n = syLiveProjects(c).length;
    return '<div><dt>On the portal</dt><dd>' + (n ? n + (n === 1 ? ' project' : ' projects') : 'Nothing shared yet') + '</dd></div>';
  }

