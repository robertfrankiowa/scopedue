  /* ───────── v63: team sync. A shared project travels between the people in it, encrypted on their devices; the server relays
     what it cannot read (CONTRACT.md, section 22). Each device has an ECDH P-256 key pair; the project key (AES-GCM 256) is wrapped
     by the owner for every member device. Every save is a whole encrypted snapshot on top of the latest version, and every device
     replays versions author by author, keeping only what that author's role allows ───────── */
  var X8 = { st: 'off', msg: '', last: 0, busy: false, q: Promise.resolve(), dev: null, recs: {}, keys: {}, list: [], devOk: '', stop: {}, timer: 0, dirty: 0 };
  var X8_SKIP = { sy: 1, tabs: 1, dis: 1, local: 1, glance: 1, due: 1, q: 1, mevq: 1, x8: 1, x8gone: 1, mentions: 1, dv: 1, cf: 1, lv: 1, lvs: 1 };   /* dv: the project's Drive record, one per device (29.16); cf: changes that crossed here (41) */
  var X8_COL = ['#2f4a7a', '#3d5a8f', '#5b4a8a', '#3f6b5e', '#7a4a3a', '#4b6a9f', '#6a4a6f'];
  function x8Role(p) { return sdSample(p) ? 'Viewer' : p && p.x8 ? p.x8.role : p && p.dv && p.dv.role ? p.dv.role : 'Owner'; }   /* v120 (88): a sample reads as a Viewer's */   /* v69: a member's role in a project on Drive (29.17) */
  /* v130 (107): the role said beside "You". A sample is the person's own project, so they are its Owner there, while x8Role still
     gates it as a Viewer's (88): nothing in a sample can be changed */
  function x8Seen(p) { return sdSample(p) ? 'Owner' : x8Role(p); }
  function x8Me() { return (X8.me || SY.email || '').toLowerCase(); }
  function x8On() { return !!(SY.key && SY.url && SY.st !== 'auth' && window.crypto && crypto.subtle && window.indexedDB); }

  /* ---- bytes ---- */
  function x8B64(buf) { var s = '', b = new Uint8Array(buf), i; for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function x8Unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function x8Utf(s) { return new TextEncoder().encode(s); }
  function x8Rand(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  function x8Hex(u) { return Array.prototype.map.call(u, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  async function x8Zip(s) { if (!window.CompressionStream) return x8Utf(s); return new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
  async function x8Unzip(u) { if (!window.DecompressionStream) return new TextDecoder().decode(u); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  /* the same JSON for the same data, whatever order the keys were written in */
  function x8S(v) {
    if (v === undefined) return 'null';
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(x8S).join(',') + ']';
    return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ':' + x8S(v[k]); }).join(',') + '}';
  }
  function x8Clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* ---- storage on this device: the key pair, the project keys, and the last version seen of each project ---- */
  var x8DbP = null;
  function x8Db() {
    if (!x8DbP) x8DbP = new Promise(function (res, rej) { var r = indexedDB.open('scopedue-team', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; });
    return x8DbP;
  }
  async function x8Get(k) { var db = await x8Db(); return new Promise(function (res) { var t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = function () { res(t.result); }; t.onerror = function () { res(undefined); }; }); }
  async function x8Put(k, v) { var db = await x8Db(); return new Promise(function (res) { var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }
  async function x8Del(k) { var db = await x8Db(); return new Promise(function (res) { var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }

  /* ---- keys ---- */
  async function x8Dev() {
    if (X8.dev) return X8.dev;
    var d = await x8Get('dev');
    if (!d) {
      var kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      var j = await crypto.subtle.exportKey('jwk', kp.publicKey);
      d = { kid: x8Hex(x8Rand(8)), priv: kp.privateKey, pub: { kty: 'EC', crv: 'P-256', x: j.x, y: j.y } };
      await x8Put('dev', d);
    }
    X8.dev = d; X8.devFp = await x8Fp(d.pub);
    return d;
  }
  async function x8Fp(pub) { var h = new Uint8Array(await crypto.subtle.digest('SHA-256', x8Utf(pub.x + '.' + pub.y))); var x = x8Hex(h); return x.slice(0, 4) + '·' + x.slice(4, 8) + '·' + x.slice(8, 12); }
  async function x8Wrap(K, pub, aad) {
    var eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    var them = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    var kek = await crypto.subtle.deriveKey({ name: 'ECDH', public: them }, eph.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var raw = await crypto.subtle.exportKey('raw', K), iv = x8Rand(12);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: x8Utf(aad) }, kek, raw);
    var e = await crypto.subtle.exportKey('jwk', eph.publicKey);
    return { e: { kty: 'EC', crv: 'P-256', x: e.x, y: e.y }, iv: x8B64(iv), ct: x8B64(ct) };
  }
  async function x8Unwrap(w, aad) {
    var d = await x8Dev();
    var eph = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: w.e.x, y: w.e.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    var kek = await crypto.subtle.deriveKey({ name: 'ECDH', public: eph }, d.priv, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(w.iv), additionalData: x8Utf(aad) }, kek, x8Unb64(w.ct));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function x8Seal(obj, room, gen) {
    var K = X8.keys[room] && X8.keys[room][gen]; if (!K) throw new Error('no key');
    var iv = x8Rand(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: x8Utf(room + '|' + gen) }, K, await x8Zip(x8S(obj)));
    return { g: gen, iv: x8B64(iv), ct: x8B64(ct) };
  }
  async function x8Open(blob, room) {
    var K = X8.keys[room] && X8.keys[room][blob.g]; if (!K) throw new Error('no key for generation ' + blob.g);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(blob.iv), additionalData: x8Utf(room + '|' + blob.g) }, K, x8Unb64(blob.ct));
    return JSON.parse(await x8Unzip(new Uint8Array(pt)));
  }
  /* ---- v72: what Editors see on team sync (29.20) ----
     A version of the Owner's is the Editors' copy (dvView, 52-drive-sync) in blob, and, when something is kept from them, the whole
     project beside it in blob.o: sealed with the Owner's own key (X8.keys[room].o, AAD room|o), which o.w wraps for the Owner's
     devices only. The server hands o to the Owner alone (api.php 1.5.1); without the key it is unreadable anyway. */
  var X8_WAITO = { waito: 1 };
  function x8ODevs(rm) { var o = (rm.members || []).filter(function (m) { return m.role === 'Owner'; })[0]; return (o && o.devs) || []; }
  async function x8OKey(rm, o, make) {
    await x8LoadKeys(rm.id); if (X8.keys[rm.id].o) return X8.keys[rm.id].o;
    var d = await x8Dev(), w = o && o.w && o.w[d.kid];
    if (w) { try { var K = await x8Unwrap(w, rm.id + '|o|' + d.kid); await x8SaveKey(rm.id, 'o', K); return K; } catch (e) {} }
    if (!make) return null;
    var K2 = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); await x8SaveKey(rm.id, 'o', K2); return K2;
  }
  /* what a version of mine carries: blob, and the Owner's devices o.w wraps the key for (ow) */
  async function x8Blob(rm, out, gen, rec) {
    var me = x8Me();
    if (rm.role !== 'Owner' || !dvHides(out, me)) return { blob: await x8Seal(out, rm.id, gen), ow: null };
    /* a new Owner's key only when no version of mine carried one yet, or no device of mine that held it is left */
    var KO = await x8OKey(rm, null, !rec.ho || !!rec.olost); if (!KO) throw X8_WAITO;
    var blob = await x8Seal(dvView(out, me), rm.id, gen), iv = x8Rand(12), w = {}, devs = x8ODevs(rm), d = await x8Dev();
    if (!devs.some(function (x) { return x.kid === d.kid; })) devs = devs.concat([{ kid: d.kid, pub: d.pub }]);
    for (var i = 0; i < devs.length; i++) w[devs[i].kid] = await x8Wrap(KO, devs[i].pub, rm.id + '|o|' + devs[i].kid);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: x8Utf(rm.id + '|o') }, KO, await x8Zip(x8S(out)));
    blob.o = { iv: x8B64(iv), ct: x8B64(ct), w: w };
    return { blob: blob, ow: Object.keys(w) };
  }
  /* a version as this device may read it: the Owner's devices take the whole project from o */
  async function x8OpenV(rm, v, rec) {
    if (rm.role === 'Owner' && v.role === 'Owner' && v.blob && v.blob.o) {
      rec.ho = true;
      var KO = await x8OKey(rm, v.blob.o, false);
      if (KO) { var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(v.blob.o.iv), additionalData: x8Utf(rm.id + '|o') }, KO, x8Unb64(v.blob.o.ct)); return JSON.parse(await x8Unzip(new Uint8Array(pt))); }
      var d = await x8Dev();
      if (x8ODevs(rm).some(function (x) { return x.kid !== d.kid; })) throw X8_WAITO;   /* another device of mine can hand it over */
      rec.olost = true;   /* none left: the Editors' copy is all there is */
    }
    return x8Open(v.blob, rm.id);
  }
  async function x8LoadKeys(room) { if (!X8.keys[room]) X8.keys[room] = (await x8Get('keys:' + room)) || {}; return X8.keys[room]; }
  async function x8SaveKey(room, gen, K) { await x8LoadKeys(room); X8.keys[room][gen] = K; await x8Put('keys:' + room, X8.keys[room]); }

  /* ---- what travels: the project, with "You" meaning whoever wrote it, turned into addresses ---- */
  function x8Mem(rm, email) { return (rm && rm.members || []).filter(function (m) { return m.email === email; })[0] || null; }
  function x8NameOf(p, email) {
    if (!email) return '';
    var r = X8.list.filter(function (x) { return p.x8 && x.id === p.x8.room; })[0], m = x8Mem(r, email);
    if (m && m.name) return m.name;
    var t = (p.team || []).filter(function (x) { return x.e === email; })[0];
    return t ? t.n : email.split('@')[0];
  }
  function x8MapPeople(o, f) {
    var fix = function (r) {
      if (!r) return;
      if (typeof r.as === 'string' && r.as) r.as = f(r.as);
      if (r.by && r.by.k === 'p' && r.by.ref) r.by.ref = f(r.by.ref);
      if (Array.isArray(r.ho)) r.ho.forEach(function (h) { if (h.from) h.from = f(h.from); if (h.to) h.to = f(h.to); });
      if (Array.isArray(r.cp)) r.cp.forEach(function (c) { if (c.by) c.by = f(c.by); });   /* v97: who recorded a check (45) */
    };
    if (o.work) Object.keys(o.work).forEach(function (k) { fix(o.work[k]); });
    if (o.pv && Array.isArray(o.pv.items)) o.pv.items.forEach(fix);
    /* v98 (46): who recorded or superseded a decision */
    var who = function (d) { if (!d) return; if (typeof d.au === 'string' && d.au) d.au = f(d.au); if (typeof d.su === 'string' && d.su) d.su = f(d.su); };
    if (o.pv && Array.isArray(o.pv.dec)) o.pv.dec.forEach(who);
    if (Array.isArray(o.cdec)) o.cdec.forEach(who);
  }
  function x8Strip(v) { if (Array.isArray(v)) v.forEach(x8Strip); else if (v && typeof v === 'object') { delete v.fresh; delete v.fpBusy; Object.keys(v).forEach(function (k) { x8Strip(v[k]); }); } return v; }
  function x8Out(p) {
    var me = x8Me(), o = {}, k;
    for (k in p) if (!X8_SKIP[k]) o[k] = x8Clone(p[k]);
    x8Strip(o);
    x8MapPeople(o, function (key) { return key === 'You' ? me : key; });
    if (o.owner) o.owner = o.owner === 'You' ? me : (((p.team || []).filter(function (m) { return m.n === o.owner; })[0] || {}).e || o.owner);
    o.log = (o.log || []).map(function (e) {
      var x = x8Clone(e), by = e.by_e || (e.w === 'you' ? me : ((p.team || []).filter(function (m) { return m.n === e.by; })[0] || {}).e || '');
      x.by_e = by; if (e.t0) x.t = e.t0; delete x.t0; delete x.w; delete x.by; return x;
    });
    if (p.kind === 'client' && x8Role(p) === 'Owner') {
      var c = byId(p.cid);
      if (c) { var cc = x8Clone(c); cc.projects = (cc.projects || []).filter(function (x) { return x.pid === p.id; }); cc.needs = (cc.needs || []).filter(function (x) { return !x.pj || x.pj === p.id; }); cc.log = []; delete cc.note; delete cc.notes; delete cc.sy; o._client = cc; }
    }
    /* the team travels as the owner wrote it; a member's device keeps sending back what it received */
    if (x8Role(p) !== 'Owner') { if (p.x8 && p.x8.team0 !== undefined) o.team = x8Clone(p.x8.team0); else delete o.team; }
    if (p.x8 && p.x8.wid) o.id = p.x8.wid;
    if (p.x8 && !p.dv) delete o.stabs;   /* v73: saved tabs are shared only on Drive (37); team sync leaves them on the device */
    if (p.x8 && p.x8.cid0) o.cid = p.x8.cid0;
    if (!p.x8 && p.dv && p.dv.cid0 && x8Role(p) !== 'Owner') o.cid = p.dv.cid0;   /* v88: a member's device sends back the Owner's client id */
    /* v69: the Owner moved it to Google Drive; the room's next versions say where (29.19) */
    if (p.x8 && p.x8.moved && x8Role(p) === 'Owner') o._moved = x8Clone(p.x8.moved);
    return o;
  }
  /* what arrives, written into the project on this device */
  function x8In(p, o, rm) {
    var me = x8Me(), v = x8Clone(o), k;
    x8MapPeople(v, function (key) { return key === me ? 'You' : key; });
    if (v.owner) v.owner = v.owner === me ? 'You' : x8NameOf(p, v.owner);
    v.log = (v.log || []).map(function (e) {
      if (!e.by_e || e.by_e === me) { e.w = 'you'; return e; }
      var nm = x8NameOf(p, e.by_e); e.w = 'team'; e.by = nm; e.t0 = e.t; e.t = String(e.t).replace(/^You\b/, nm).replace(/\byour\b/, 'their'); return e;
    });
    /* v72: Activity kept from Editors (29.20): only a member's own lines stay; the log is otherwise only ever added to */
    if (x8Role(p) !== 'Owner' && v.eh && v.eh.history) v.log = v.log.filter(function (e) { return e.w === 'you'; });
    var cl = v._client; delete v._client;
    var mv = v._moved; delete v._moved;   /* kept with the room, never in the project (29.19) */
    if (mv && p.x8 && typeof mv.fid === 'string') p.x8.mv = { ts: +mv.ts || 0, fid: mv.fid, by: String(mv.by || '').toLowerCase() };
    if (p.x8 && x8Role(p) !== 'Owner' && v.cid) p.x8.cid0 = v.cid;
    var keep = {}; for (k in p) if (X8_SKIP[k] || k === 'id') keep[k] = p[k];
    if (p.x8 && !p.dv && p.stabs && !('stabs' in v)) keep.stabs = p.stabs;
    for (k in p) delete p[k];
    for (k in v) p[k] = v[k];
    for (k in keep) p[k] = keep[k];
    if (rm && x8Role(p) !== 'Owner') {   // on a member's device, the team is who is in the room
      p.x8.team0 = v.team === undefined ? undefined : x8Clone(v.team);
      p.team = rm.members.filter(function (m) { return m.email !== me; }).map(function (m, i) { return { n: m.name || m.email.split('@')[0], e: m.email, role: m.role, c: X8_COL[i % X8_COL.length], seen: '' }; });
      if (cl && p.kind === 'client') {
        cl.id = 'x8-' + p.x8.room.slice(0, 10) + '-' + cl.id; cl.x8 = 1; var cur = byId(cl.id);
        if (cur && cur.x8) { Object.keys(cl).forEach(function (q) { cur[q] = cl[q]; }); }
        else if (!cur) CLIENTS.push(cl);
        p.cid = cl.id;
      }
    }
    /* v72: another device of the Owner's had the project and no client to go with it (the client came only to members) */
    if (rm && x8Role(p) === 'Owner' && cl && p.kind === 'client' && p.cid && !byId(p.cid)) { cl.id = p.cid; CLIENTS.push(cl); }
    if (p.kind === 'client' && p.sc) pdDerive(p); else if (p.pv) prvDerive(p);
    p.due = p.dueAt ? dueInfo(p.dueAt) : null;
  }

  /* ---- merging: what both sides changed since the last version both saw ---- */
  function x8IsObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function x8IdArr(a) { return a.length > 0 && a.every(function (x) { return x8IsObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'); }); }
  /* v96 (41): cx, when given, is { win: 'l'|'r', out: [] }: where both sides changed the same value, cx.win's copy is used and the
     place is listed in cx.out with both copies ({ pa, l, r }; pa is the path, an { id } for an item of a list). Without cx: as before */
  function x8Merge(b, l, r, key, cx, pa) {
    var sl = x8S(l), sr = x8S(r), sb = x8S(b);
    if (sl === sr) return l;
    if (sb === sl) return r;
    if (sb === sr) return l;
    /* v73: an envelope (37.2) is one sealed whole: the later seal wins, never a mix of two */
    if (x8IsObj(l) && x8IsObj(r) && l.env && r.env) return (+r.at || 0) >= (+l.at || 0) ? r : l;
    if (x8IsObj(l) && x8IsObj(r)) {
      var out = {}, bb = x8IsObj(b) ? b : {}, ks = Object.keys(r).concat(Object.keys(l).filter(function (q) { return !(q in r); }));
      ks.forEach(function (q) {
        var inL = q in l, inR = q in r;
        if (inL && inR) out[q] = x8Merge(bb[q], l[q], r[q], q, cx, cx && pa.concat([q]));
        else if (inR) { if (!(q in bb) || x8S(bb[q]) !== x8S(r[q])) out[q] = r[q]; }   // gone here: gone, unless the other side changed it
        else { if (!(q in bb) || x8S(bb[q]) !== x8S(l[q])) out[q] = l[q]; }
      });
      return out;
    }
    if (Array.isArray(l) && Array.isArray(r)) {
      var ba = Array.isArray(b) ? b : [];
      if ((x8IdArr(l) || !l.length) && (x8IdArr(r) || !r.length) && (l.length || r.length)) {
        var bm = {}, lm = {}, rm = {}, res = [];
        ba.forEach(function (x) { if (x8IsObj(x)) bm[x.id] = x; }); l.forEach(function (x) { lm[x.id] = x; }); r.forEach(function (x) { rm[x.id] = x; });
        r.forEach(function (x) {
          if (x.id in lm) res.push(x8Merge(bm[x.id], lm[x.id], x, undefined, cx, cx && pa.concat([{ id: x.id }])));
          else if (!(x.id in bm) || x8S(bm[x.id]) !== x8S(x)) res.push(x);
        });
        l.forEach(function (x, i) {
          if (x.id in rm) return;
          if (x.id in bm && x8S(bm[x.id]) === x8S(x)) return;   // removed there, untouched here
          res.splice(Math.min(i, res.length), 0, x);
        });
        return res;
      }
      if (key === 'log') {
        /* v115 (79): a line with a key (k) is one event however many devices wrote it: the earliest stays, on every device alike */
        var seen = {}, all = [], first = function (a, c) { return (a.ts || 0) - (c.ts || 0) || (x8S(a) < x8S(c) ? -1 : 1); };
        r.concat(l).forEach(function (e) { var kk = e && e.k ? 'k|' + e.k : x8S(e); if (!(kk in seen)) { seen[kk] = all.length; all.push(e); } else if (e.k && first(e, all[seen[kk]]) < 0) all[seen[kk]] = e; });
        return all.sort(function (a, c) { return (c.ts || 0) - (a.ts || 0); }).slice(0, 400);
      }
      var pre = function (a) { return ba.length <= a.length && ba.every(function (x, i) { return x8S(x) === x8S(a[i]); }); };
      if (pre(l) && pre(r)) {   // both only added at the end: keep both additions
        var tail = r.slice(ba.length), ts = tail.map(x8S);
        return ba.concat(tail).concat(l.slice(ba.length).filter(function (x) { return ts.indexOf(x8S(x)) < 0; }));
      }
      return x8Cross(l, r, cx, pa);
    }
    return x8Cross(l, r, cx, pa);   // both changed the same value
  }
  /* without cx, this device's latest wins, as before v96 */
  function x8Cross(l, r, cx, pa) {
    if (!cx) return l;
    cx.out.push({ pa: pa.slice(), l: x8Clone(l), r: x8Clone(r) });
    return cx.win === 'r' ? r : l;
  }
  /* v96: a value inside a project as it travels, by a path from x8Merge; and the same place set (false when it is not there) */
  function x8At(o, pa) {
    var v = o;
    for (var i = 0; i < pa.length; i++) {
      var s = pa[i]; if (v === null || typeof v !== 'object') return undefined;
      v = x8IsObj(s) ? (Array.isArray(v) ? v.filter(function (x) { return x8IsObj(x) && x.id === s.id; })[0] : undefined) : v[s];
    }
    return v;
  }
  function x8Set(o, pa, val) {
    if (!pa.length) return false;
    var at = x8At(o, pa.slice(0, -1)), s = pa[pa.length - 1];
    if (at === null || typeof at !== 'object') return false;
    if (x8IsObj(s)) { if (!Array.isArray(at)) return false; var i = at.map(function (x) { return x8IsObj(x) ? x.id : null; }).indexOf(s.id); if (i < 0) return false; at[i] = x8Clone(val); return true; }
    if (Array.isArray(at)) return false;
    if (val === undefined) delete at[s]; else at[s] = x8Clone(val);
    return true;
  }
  /* what one author may change, by role. Owner: everything. Viewer: nothing. Editor: their work and what belongs to everyone */
  var X8_ED_TOP = ['next', 'nextAt', 'nextTs', 'nextU', 'ctx', 'files', 'stabs', 'later', 'log', 'cdec', 'upd', 'updT'];
  var X8_ED_WORK = ['st', 'stk', 'by', 'due', 'ho', 'sn', 'wc', 'gh', 'dod', 'cp'];   /* v97: cp, the checks recorded (45) */
  function x8Allow(prev, next, role, author, cur) {
    if (role === 'Owner') return next;
    if (role !== 'Editor' || !prev) return prev || next;
    var out = x8Clone(prev);
    X8_ED_TOP.forEach(function (k) {
      if (k === 'stabs' || k === 'files') { var sa = dvShAllow(prev[k], next[k], author, cur && cur[k]); if (sa.length) out[k] = sa; else delete out[k]; return; }   /* v73: 37.1 */
      if (k in next) out[k] = x8Clone(next[k]); else delete out[k];
    });
    /* v129 (105): whose work it is now is read on this device (cur), not in the copy the Editor last had: work given to them or
       handed over to them since is theirs to change, and work taken from them since is not */
    var unit = function (pr, nx, cu) {
      var r = x8Clone(pr || {}), as0 = cu ? cu.as || '' : (pr || {}).as || '';
      if (as0 && as0 !== author) return r;   // someone else's work is not an Editor's to change
      X8_ED_WORK.forEach(function (k) { if (k in nx) r[k] = x8Clone(nx[k]); });
      if (nx.st === 'done' && (pr || {}).st !== 'done') r.st = (pr || {}).st || r.st;   // done comes from the owner's review
      if (r.st === 'done' && nx.st !== 'done' && (pr || {}).st === 'done') r.st = nx.st;
      var was = (pr || {}).as || '', now = nx.as || '';
      if (now !== was && (was === '' && now === author || was === author)) r.as = now;
      if (r.st === 'planned' && nx.st === 'todo') r.st = 'planned';
      return r;
    };
    if (next.work && prev.work) { out.work = x8Clone(prev.work); Object.keys(next.work).forEach(function (id) { out.work[id] = unit(prev.work[id], next.work[id], cur && cur.work ? cur.work[id] : null); }); }
    if (next.pv && prev.pv) {
      var cm = {}; ((cur && cur.pv && cur.pv.items) || []).forEach(function (x) { if (x8IsObj(x)) cm[x.id] = x; });
      out.pv.items = (prev.pv.items || []).map(function (x) { var nx = (next.pv.items || []).filter(function (y) { return y.id === x.id; })[0]; return nx ? Object.assign(x8Clone(x), unit(x, nx, cur ? cm[x.id] || null : null)) : x; });
      if (next.pv.park) out.pv.park = x8Clone(next.pv.park);
    }
    if ('fb' in next) out.fb = fbAllow(prev.fb, next.fb, author);   /* v70: Feedback, 32.2 */
    return out;
  }

  /* ---- one project's room on this device ---- */
  async function x8Rec(room) { if (!X8.recs[room]) X8.recs[room] = (await x8Get('room:' + room)) || { id: room, ver: 0, gen: 1, raw: '', base: '', pid: '' }; return X8.recs[room]; }
  async function x8SaveRec(rec) { X8.recs[rec.id] = rec; await x8Put('room:' + rec.id, rec); }
  function x8ByRoom(room) { return PROJECTS.filter(function (p) { return p.x8 && p.x8.room === room; })[0] || null; }
  function x8Paint(p) {
    xaPaint();
    if (pd.p && curView === 'project' && (!p || pd.p === p)) { if (!syTyping()) pdRerender(); pdRefreshBadges(pd.p); }
    dbPriority(); dbRecent(); mwBadge(); dbNotif(); tdRender();
    if (curView === 'mywork') mwRender();
    if (curView === 'projects') { lists.projects.stop(); pdRender(); lists.projects.reset(false); }
  }
  /* a project someone shared arrives on this device */
  function x8Adopt(rm, snap) {
    var wid = String(snap.id || 'shared'), id = wid, k = 2;
    while (pdById(id)) id = wid + '-' + (k++);
    var owner = (rm.members.filter(function (m) { return m.role === 'Owner'; })[0] || {});
    var p = { id: id, n: snap.n || 'Shared project', m: snap.m || 'S', kind: snap.kind === 'client' ? 'client' : 'private', team: [], ctx: [], log: [], x8: { room: rm.id, role: rm.role, wid: wid, owner: owner.email || '', oname: owner.name || '' } };
    x8In(p, snap, rm);
    if (rm.role === 'Owner') {   // another device of the owner's: the team comes with the project, or from the room when an older version did not carry it
      p.x8.oname = 'You'; p.x8.owner = x8Me();
      if (!p.team || !p.team.length) p.team = rm.members.filter(function (m) { return m.email !== x8Me(); }).map(function (m, i) { return { n: m.name || m.email.split('@')[0], e: m.email, role: m.role, c: X8_COL[i % X8_COL.length], seen: '' }; });
    }
    PROJECTS.push(p);
    return p;
  }
  async function x8Ask(method, path, body) { return syCall(method, path, body); }
  async function x8EnsureDev() {
    var d = await x8Dev();
    if (X8.devOk === SY.slug + '|' + d.kid) return d;
    var r = await x8Ask('PUT', '/v1/devkey', { kid: d.kid, pub: d.pub });
    if (syOk(r)) X8.devOk = SY.slug + '|' + d.kid;
    return d;
  }
  /* get a room's key for its current generation */
  async function x8KeyFor(rm) {
    await x8LoadKeys(rm.id);
    for (var i = 0; i < rm.keys.length; i++) {
      var w = rm.keys[i]; if (X8.keys[rm.id][w.gen]) continue;
      try { await x8SaveKey(rm.id, w.gen, await x8Unwrap(w.wrapped, rm.id + '|' + w.gen + '|' + w.kid)); } catch (e) {}
    }
    return X8.keys[rm.id][rm.gen] || null;
  }
  /* the owner: hand the key to devices that do not have it, and keep the room's people in step with the project's team */
  async function x8OwnerDuties(rm, p) {
    var K = X8.keys[rm.id][rm.gen], handed = false;
    if (rm.need && rm.need.length && K) {
      var w = {}; for (var i = 0; i < rm.need.length; i++) { var n = rm.need[i]; w[n.kid] = await x8Wrap(K, n.pub, rm.id + '|' + rm.gen + '|' + n.kid); }
      var kr = await x8Ask('POST', '/v1/rooms/' + rm.id + '/keys', { gen: rm.gen, wrapped: w });
      handed = syOk(kr);
    }
    if (!p) return handed;
    var me = x8Me(), team = (p.team || []).filter(function (m) { return p.kind !== 'private' || fbJoins(m); }), srv = rm.members.filter(function (m) { return m.email !== me; }), changed = handed;
    for (var j = 0; j < team.length; j++) {
      var t = team[j], s = srv.filter(function (m) { return m.email === t.e.toLowerCase(); })[0];
      if (!s || s.role !== t.role) { await x8Ask('POST', '/v1/rooms/' + rm.id + '/members', { email: t.e, name: t.n, role: t.role === 'Viewer' ? 'Viewer' : 'Editor' }); changed = true; }
    }
    var gone = srv.filter(function (m) { return !team.some(function (t) { return t.e.toLowerCase() === m.email; }); });
    if (gone.length) { await x8Rotate(rm, p, gone.map(function (m) { return m.email; })); changed = true; }
    return changed;
  }
  /* someone leaves: a new key for the people who stay, and the project written again with it */
  async function x8Rotate(rm, p, remove) {
    var rec = await x8Rec(rm.id), gen = rm.gen + 1, K = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']), w = {}, d = await x8Dev();
    w[d.kid] = await x8Wrap(K, d.pub, rm.id + '|' + gen + '|' + d.kid);
    for (var i = 0; i < rm.members.length; i++) { var m = rm.members[i]; if (remove.indexOf(m.email) > -1) continue; for (var j = 0; j < m.devs.length; j++) if (m.devs[j].kid !== d.kid) w[m.devs[j].kid] = await x8Wrap(K, m.devs[j].pub, rm.id + '|' + gen + '|' + m.devs[j].kid); }
    await x8SaveKey(rm.id, gen, K);
    var out = x8Out(p), bb;
    try { bb = await x8Blob(rm, out, gen, rec); } catch (e) { if (e === X8_WAITO) return false; throw e; }
    var r = await x8Ask('POST', '/v1/rooms/' + rm.id + '/rotate', { remove: remove, gen: gen, wrapped: w, base: rec.ver, blob: bb.blob });
    if (syOk(r)) { rec.ver = r.data.ver; rec.gen = gen; rec.raw = rec.base = x8S(out); rec.ow = bb.ow; if (bb.ow) rec.ho = true; await x8SaveRec(rec); return true; }
    return false;
  }
  /* bring a room up to date: replay what others saved, author by author, then merge in what changed here */
  async function x8Pull(rm, p) {
    try { return await x8Pull1(rm, p); }
    catch (e) { if (e !== X8_WAITO) throw e; if (p) p.x8.wait = true; return p; }   /* v72: waiting for another device of mine to hand over the Owner's key */
  }
  async function x8Pull1(rm, p) {
    var rec = await x8Rec(rm.id);
    if (rm.ver <= rec.ver && p) return p;
    var r = await x8Ask('GET', '/v1/rooms/' + rm.id, null), vs;
    if (!syOk(r)) throw new Error(syMsg(r));
    vs = (r.data.versions || []).filter(function (v) { return v.ver > rec.ver; });
    if (!vs.length) return p;
    var oldBase = rec.base ? JSON.parse(rec.base) : null, raw = rec.raw ? JSON.parse(rec.raw) : null, base = oldBase;
    if (!raw || vs[0].ver !== rec.ver + 1) {   // first time, or away for too long: start from the newest version the owner wrote, and replay what came after it
      var at = vs.length - 1; for (var j = vs.length - 1; j >= 0; j--) if (vs[j].role === 'Owner') { at = j; break; }
      raw = await x8OpenV(rm, vs[at], rec); base = x8Clone(raw); rec.ver = vs[at].ver; if (vs[at].role === 'Owner') rec.oraw = x8S(raw); vs = vs.slice(at + 1);
      if (!oldBase) oldBase = x8Clone(raw);
    }
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i], nxt = await x8OpenV(rm, v, rec), ok;
      /* v72: on the Owner's devices a member's version is measured against the copy they were given; what is kept from them goes back */
      if (rm.role === 'Owner' && v.role !== 'Owner') { var me0 = x8Me(), pv0 = dvView(raw, me0); ok = x8Allow(pv0, nxt, v.role, v.by); base = dvUnview(x8Merge(pv0, dvView(base, me0), ok), base, me0); }
      else { ok = v.by === x8Me() ? nxt : x8Allow(raw, nxt, v.role, v.by); base = x8Merge(raw, base, ok); }
      raw = nxt; rec.ver = v.ver;
      if (v.role === 'Owner') rec.oraw = x8S(nxt);   /* v69: the Owner's last version, the common ground when this copy moves to Drive (29.19) */
    }
    /* api.php 1.28.0 (96): a client project someone shares through team sync takes one of the month's places on the free plan. None
       left: nothing is adopted and this round's reading is dropped, so a later round reads it again (once there is a place) */
    if (!p && rm.role !== 'Owner' && base && base.kind === 'client') {
      var qc = await qtClaim('room', rm.id);
      if (!qc.ok) {
        delete X8.recs[rm.id];
        if (qc.full && !QT.said['room:' + rm.id]) { QT.said['room:' + rm.id] = 1; showToast((base.n || 'A client project') + ' was shared with you. ' + qtFullText(qc.quota)); }
        return null;
      }
    }
    rec.raw = x8S(raw); rec.base = x8S(base); rec.gen = rm.gen;
    if (!p) { p = x8Adopt(rm, base); sdUTNow(); rec.pid = p.id; await x8SaveRec(rec); X8.said = (X8.said || []).concat([p.x8.role === 'Owner' ? p.n + ' is on this device now' : (p.x8.oname || 'Someone') + ' shared ' + p.n + ' with you']); return p; }
    var loc = x8Out(p), merged = x8Merge(oldBase || base, loc, base);
    x8In(p, merged, rm); sdUTNow();
    if (rec.olost && !rec.olostN) { rec.olostN = 1; pdNote(p, 'What only you could see in this project could not be brought to this device: none of your devices that held it is left'); }
    await x8SaveRec(rec);
    X8.changed = true;
    return p;
  }
  /* save what changed here. A save that lost the race is merged with the newer version and tried again */
  async function x8Push(rm, p, tries) {
    var rec = await x8Rec(rm.id), out = x8Out(p), s = x8S(out);
    /* v72: a new device of mine has no wrap of the Owner's key yet: the next version carries one */
    var needO = rm.role === 'Owner' && rec.ow && x8ODevs(rm).some(function (x) { return rec.ow.indexOf(x.kid) < 0; });
    if ((s === rec.base && !needO) || x8Role(p) === 'Viewer') return;
    var before = rec.base ? JSON.parse(rec.base) : null, bb;
    try { bb = await x8Blob(rm, out, rm.gen, rec); } catch (e) { if (e === X8_WAITO) { p.x8.wait = true; return; } throw e; }
    var r = await x8Ask('PUT', '/v1/rooms/' + rm.id, { base: rec.ver, blob: bb.blob });
    if (syOk(r)) { rec.ver = r.data.ver; rec.raw = rec.base = s; rec.ow = bb.ow; if (bb.ow) rec.ho = true; await x8SaveRec(rec); x8Nudge(rm, before, out); return; }
    var code = syErr(r).code;
    if (bb.blob.o && r.status === 422) throw new Error('To keep parts of this project from Editors, your server needs api.php 1.5.1 or later. Nothing was sent.');
    if ((code === 'stale' || code === 'stale_key') && (tries || 0) < 3) {
      var fresh = await x8Ask('GET', '/v1/rooms', null);
      var nrm = syOk(fresh) ? (fresh.data.rooms || []).filter(function (x) { return x.id === rm.id; })[0] : null; if (!nrm) throw new Error('This project is no longer shared with you');
      await x8KeyFor(nrm); await x8Pull(nrm, p); return x8Push(nrm, p, (tries || 0) + 1);
    }
    throw new Error(r.status === 413 ? 'This project is larger than your server accepts. Raise post_max_size to 2M on the server.' : syMsg(r));
  }
  /* tell someone, without saying what, that something waits for them */
  function x8Nudge(rm, b, a) {
    if (!b) return;
    var me = x8Me(), owner = (rm.members.filter(function (m) { return m.role === 'Owner'; })[0] || {}).email, sent = {};
    var send = function (to, kind) { if (!to || to === me || sent[to + kind]) return; sent[to + kind] = 1; x8Ask('POST', '/v1/rooms/' + rm.id + '/nudge', { to: to, kind: kind }); };
    var each = function (bm, am) {
      Object.keys(am).forEach(function (id) {
        var x = am[id], y = bm[id] || {};
        if (x.as && x.as !== (y.as || '')) send(x.as, (x.ho || []).length > (y.ho || []).length ? 'handover' : 'assigned');
        if (x.st === 'review' && y.st !== 'review' && x.as === me) send(owner, 'review');
        if (x.by && x.by.k === 'p' && (!y.by || y.by.ref !== x.by.ref)) send(x.by.ref, 'waiting');
        if (x.rb && (!y.rb || y.rb.ts !== x.rb.ts)) send(x.as, 'back');
        if (x.ap && !y.ap) send(x.as, 'approved');
      });
    };
    if (a.work) each(b.work || {}, a.work);
    if (a.pv && a.pv.items) { var bm = {}, am = {}; ((b.pv || {}).items || []).forEach(function (x) { bm[x.id] = x; }); a.pv.items.forEach(function (x) { am[x.id] = x; }); each(bm, am); }
  }
  /* one round: my device key, the rooms I am in, keys, people, then each project in and out */
  async function x8Round() {
    if (!x8On()) { X8.st = 'off'; return; }
    await x8EnsureDev();
    var r = await x8Ask('GET', '/v1/rooms', null);
    if (!syOk(r)) throw new Error(syMsg(r));
    X8.list = r.data.rooms || []; X8.said = []; X8.lost = []; X8.wm = []; if (r.data.me) X8.me = String(r.data.me).toLowerCase();
    var seen = {};
    for (var i = 0; i < X8.list.length; i++) {
      var rm = X8.list[i], p = x8ByRoom(rm.id); seen[rm.id] = 1;
      if (X8.stop[rm.id] || x8OnDrive(rm.id)) continue;
      var K = await x8KeyFor(rm);
      if (p) { p.x8.role = rm.role; p.x8.gen = rm.gen; p.x8.wait = !K; p.x8.ver = rm.ver; }
      if (!K) { xaNoKey(rm, p); continue; }   // the owner has not handed this device the key yet
      if (rm.role === 'Owner' && await x8OwnerDuties(rm, p)) { var rr = await x8Ask('GET', '/v1/rooms', null); if (syOk(rr)) { X8.list = rr.data.rooms || []; rm = X8.list.filter(function (x) { return x.id === rm.id; })[0] || rm; } }
      p = await x8Pull(rm, p); sdUTNow();   // a teammate's words, before they are drawn
      if (p && !p.x8.wait) { p.x8.ver = rm.ver; await x8Push(rm, p); p.x8.ver = (await x8Rec(rm.id)).ver; p.x8.last = Date.now(); }
    }
    /* projects no longer shared with me */
    PROJECTS.forEach(function (p) {
      if (!p.x8 || seen[p.x8.room] || p.x8.role === 'Owner' && X8.made && X8.made[p.x8.room] > Date.now() - 5000) return;
      if (p.x8.mv) p.x8mv = Object.assign({ room: p.x8.room, oname: p.x8.oname || '' }, p.x8.mv);   /* joining on Drive later still takes over this copy (29.19) */
      else if (p.x8.role !== 'Owner') { p.x8gone = { ts: Date.now(), by: p.x8.oname || 'The owner' }; X8.said.push('You are no longer in ' + p.n + '. Your copy stays on this device.'); }
      if (!p.x8mv) x8Del('room:' + p.x8.room);   /* a moved copy keeps the room's record: joining on Drive merges against it, then deletes it */
      p.x8 = null;
    });
    X8.st = 'ok'; X8.msg = ''; X8.last = Date.now();
  }
  function x8Sync(quiet) {
    var run = X8.q.then(async function () {
      if (!x8On() || SDB.S.stale) return;   /* CONTRACT 142: no round in a tab that is behind another one (as 52-drive-sync) */
      X8.busy = true;
      try { X8.changed = false; await x8Round(); }
      catch (e) { X8.st = 'err'; X8.msg = e && e.message ? e.message : String(e); }
      X8.busy = false; sdUTNow();
      if (X8.changed || (X8.said && X8.said.length)) await SDB.save();   /* v69: what arrived (a move marker too, 29.19) is kept before a reload */
      x8Paint();
      if (!quiet && X8.said && X8.said.length && !pendingUndo) showToast(X8.said.length === 1 ? X8.said[0] : X8.said.length + ' updates from your team');
    });
    X8.q = run.catch(function () {});
    return run;
  }
  /* local changes go out within a few seconds */
  async function x8Dirty() {
    if (!x8On() || X8.busy) return;
    for (var i = 0; i < PROJECTS.length; i++) {
      var p = PROJECTS[i]; if (!p.x8 || p.x8.role === 'Viewer' || p.x8.wait || sdSample(p)) continue;   /* a sample never syncs (99), even after My work changed it (109) */
      var rec = X8.recs[p.x8.room]; if (!rec) continue;
      if (x8S(x8Out(p)) !== rec.base) { x8Sync(true); return; }
    }
  }

  /* ---- turning it on and off (the owner) ---- */
  async function x8Start(p) {
    if (sdSample(p)) { sdSampleNo(); return; }   /* v125 (99) */
    if (!x8On()) { openDrawer('sync'); return; }
    var hl = await x8Ask('GET', '/v1/health', null);
    if (syOk(hl) && hl.data.limits && hl.data.limits.team === false) showToast('Your server takes requests up to ' + Math.round(hl.data.limits.body / 1024) + ' KB. Large projects may not sync: raise post_max_size to 2M.');
    var d = await x8EnsureDev(), id = x8B64(x8Rand(16)), K = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']), w = {};
    w[d.kid] = await x8Wrap(K, d.pub, id + '|1|' + d.kid);
    var r = await x8Ask('POST', '/v1/rooms', { id: id, name: pfSaved && pfSaved.name ? String(pfSaved.name).slice(0, 80) : 'Owner', wrapped: w, members: (p.team || []).filter(function (m) { return p.kind !== 'private' || fbJoins(m); }).map(function (m) { return { email: m.e, name: m.n, role: m.role === 'Viewer' ? 'Viewer' : 'Editor' }; }) });
    if (!syOk(r)) { showToast(syMsg(r)); return; }
    await x8SaveKey(id, 1, K);
    p.x8 = { room: id, role: 'Owner', wid: p.id, owner: x8Me(), oname: 'You', gen: 1 };
    X8.made = X8.made || {}; X8.made[id] = Date.now();
    await x8SaveRec({ id: id, ver: 0, gen: 1, raw: '', base: '', pid: p.id });
    pdNote(p, 'You turned on team sync'); pdTouch(p);
    await x8Sync(true);
    pdRerender('[data-pd="x8:sync"]');
    showToast((p.team.length ? 'Team sync is on. ' + prvList(p.team.map(function (m) { return m.n.split(' ')[0]; })) + (p.team.length === 1 ? ' is' : ' are') + ' invited by email.' : 'Team sync is on. Add people to share it.'));
  }
  async function x8Stop(p) {
    if (!p.x8) return;
    var room = p.x8.room;
    if (x8Role(p) === 'Owner') { var r = await x8Ask('DELETE', '/v1/rooms/' + room, null); if (!syOk(r) && r.status !== 404) { showToast(syMsg(r)); return; } }
    await x8Del('room:' + room); await x8Del('keys:' + room); delete X8.recs[room]; delete X8.keys[room];
    p.x8 = null; pdNote(p, 'You turned off team sync'); pdTouch(p);
    pdRerender(); showToast('Team sync is off. The project stays on this device; the server copy is gone.');
  }

  /* ---- moving to Google Drive (29.19) ---- */
  /* where the room said the project went: still in the room, or kept after the room was gone */
  function x8Mv(p) { return (p && p.x8 && p.x8.mv) || (p && p.x8mv) || null; }
  /* a room whose project is on Drive on this device now: skipped, so it is not adopted again */
  function x8OnDrive(room) { return PROJECTS.some(function (q) { return !q.x8 && q.dv && q.dv.room0 === room; }); }

  /* ---- what the team tab shows ---- */
  function x8Ago(ts) { if (!ts) return 'not yet'; var s = Math.round((Date.now() - ts) / 1000); return s < 10 ? 'just now' : s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago'; }
  function x8Card(p) {
    var smp = sdSample(p);   /* v125 (99): a sample shows the card as a project would, with its button locked: it stays on this device */
    var h = '<section class="card pd-card x8-c" aria-labelledby="pd-h-x8"><div class="card-h ruled"><div><h3 id="pd-h-x8">Team sync</h3>';
    var mv = x8Mv(p);
    if (mv && !(p.x8 && p.x8.moved)) {   /* someone moved it to Google Drive (29.19) */
      var mine = mv.by === x8Me();
      h += '<p>' + (mine ? 'You moved this project to Google Drive. Open it on this device from Settings › Google Drive.' : esc((p.x8 && p.x8.oname) || mv.oname || 'The owner') + (p.x8 ? ' moved this project to Google Drive. Join it there; until you do, team sync keeps this copy up to date.' : ' moved this project to Google Drive. Join it there to keep working together; this copy stays here.')) + '</p></div><div class="h-actions"><span class="chip neutral">Moved to Drive</span></div></div>';
      h += '<div class="x8-f">' + (mine ? '<button type="button" class="btn-primary btn-sm" data-pd="x8:drive">Open Settings › Google Drive</button>' : '<a class="btn-primary btn-sm" data-x8-join href="' + esc(dvJoinUrl(mv.fid)) + '" target="_blank" rel="noopener noreferrer">Join on Google Drive ' + IC('ext') + '</a>') + (p.x8 ? '<button type="button" class="btn-ghost btn-sm" data-pd="x8:sync">Sync now</button>' : '') + '</div>';
      return h + '</section>';
    }
    if (p.x8gone && !p.x8) return h + '<p>' + esc(p.x8gone.by) + ' stopped sharing this project with you. This copy stays on your device and no longer updates.</p></div><div class="h-actions"><span class="chip neutral">Not shared</span></div></div></section>';
    if (!p.x8) {
      /* v125 (99): each by what they are called (08-clients sdCallName): Hà and Tuấn, not Phạm and Lê */
      var names = (p.team || []).map(function (m) { return sdCallName(m.n) || m.n.split(' ')[0]; });
      h += '<p>' + (names.length ? 'Work on this with ' + esc(prvList(names)) + ', each on their own device.' : 'Share this project with the people on it.') + '</p></div><div class="h-actions"><span class="chip neutral">This device only</span></div></div>';
      h += '<div class="x8-why">' + IC('lock') + '<p>It is encrypted on each device before it leaves. Your server only passes it along, and cannot read it.</p></div>';
      if (smp) h += '<div class="x8-f x8-smp"><button type="button" class="btn-primary btn-sm" disabled aria-describedby="x8-smp">' + IC('lock') + 'Turn on team sync</button><small id="x8-smp">A sample stays on this device. It is never synced.</small></div>';
      else h += '<div class="x8-f">' + (x8On() ? '<button type="button" class="btn-primary btn-sm" data-pd="x8:on">' + IC('users') + 'Turn on team sync</button>' : '<button type="button" class="btn-ghost btn-sm" data-pd="x8:signin">Sign in to your server first</button>') + '</div>';
      return h + '</section>';
    }
    var rm = X8.list.filter(function (x) { return x.id === p.x8.room; })[0], own = x8Role(p) === 'Owner';
    var mvH = !own ? '' : dvKind(p) ? '<div class="x8-why">' + IC('ext') + '<p>Move it to Google Drive. Team sync through your server is going away; Drive keeps it in your own Google account, encrypted the same way.</p></div><div class="x8-f"><button type="button" class="btn-primary btn-sm" data-pd="x8:move">Move to Google Drive</button></div>' : '<div class="x8-why">' + IC('ext') + '<p>Client projects stay on team sync until they can be kept in Google Drive.</p></div>';
    var chip = p.x8.wait ? '<span class="chip warn">Waiting for the key</span>' : X8.st === 'err' ? '<span class="chip crit">Not synced</span>' : X8.busy ? '<span class="chip">Syncing…</span>' : '<span class="chip ok">Synced</span>';
    h += '<p>' + (own ? 'Shared with the people below. Encrypted on each device.' : 'Shared by ' + esc(p.x8.oname || 'the owner') + '. You are ' + (p.x8.role === 'Viewer' ? 'a Viewer: you can read everything here.' : 'an Editor: your work, dates, notes and links are yours to change. Scope and the client are the owner’s.')) + '</p></div><div class="h-actions">' + chip + '</div></div>';
    h += mvH;
    if (p.x8.wait) h += '<div class="x8-why warn">' + IC('clock') + '<p>' + esc(p.x8.oname || 'The owner') + ' has to open ScopeDue once to hand this device its key. It arrives on its own after that.</p></div>';
    if (X8.st === 'err' && X8.msg) h += '<div class="x8-why crit">' + IC('x') + '<p>' + esc(X8.msg) + '</p></div>';
    h += xaAskHTML(p);
    if (rm) {
      var me = x8Me();
      var rank = function (m) { return m.email === me ? 0 : m.role === 'Owner' ? 1 : m.role === 'Editor' ? 2 : 3; };
      h += '<ul class="x8-ml">' + rm.members.slice().sort(function (a, b) { return rank(a) - rank(b); }).map(function (m) {
        var mine = m.email === me, hasKey = m.role === 'Owner' || (m.devs.length && !(rm.need || []).some(function (n) { return n.email === m.email; }));
        var state = mine ? '' : !m.joined ? (m.devs.length && hasKey ? 'Invited · has the key, has not opened it yet' : 'Invited · has not signed in yet') : !m.devs.length ? 'Signed in · setting up' : own && !hasKey ? 'Getting the key' : 'Ready';
        var fp = m.devs.length ? '<span class="x8-fp" title="Safety code. Compare it with ' + esc(mine ? 'what your teammates see for you' : (m.name || m.email)) + ' to be sure nobody is in between.">' + IC('shield') + '<span data-fp="' + esc(m.devs[0].pub.x + '.' + m.devs[0].pub.y) + '">····</span></span>' : '';
        return '<li><span class="av" style="--c:' + X8_COL[Math.abs(m.email.length * 7) % X8_COL.length] + '">' + esc(initials(m.name || m.email)) + '</span><div class="grow"><b>' + esc(mine ? 'You' : m.name || m.email) + '</b><small>' + esc(m.email) + (state ? ' · ' + esc(state) : '') + '</small>' + fp + '</div><span class="chip ' + (m.role === 'Owner' ? '' : 'neutral') + '">' + esc(m.role) + '</span></li>';
      }).join('') + '</ul>';
    }
    h += '<div class="x8-foot"><small>' + (p.x8.last ? 'Synced ' + x8Ago(p.x8.last) : 'Not synced yet') + (p.x8.ver ? ' · version ' + p.x8.ver : '') + '</small><span class="x8-acts"><button type="button" class="btn-ghost btn-sm" data-pd="x8:sync">Sync now</button>' +
      (own ? '<button type="button" class="link x8-stop" data-pd="x8:off"' + (pd.x8off ? ' data-arm' : '') + '>' + (pd.x8off ? 'Stop for everyone?' : 'Stop syncing') + '</button>' : '') + '</span></div>';
    return h + '</section>';
  }
  /* safety codes are worked out after the card is drawn */
  function x8Fps() {
    [].forEach.call(document.querySelectorAll('[data-fp]'), function (el) {
      /* only a device key ("x.y"): evidence hashes and Scope version chips use data-fp too, and must keep their own text */
      var s = el.getAttribute('data-fp'); if (!/^[\w-]+\.[\w-]+$/.test(s)) return;
      var v = s.split('.');
      x8Fp({ x: v[0], y: v[1] }).then(function (f) { el.textContent = f; });
    });
  }
  function x8Act(act, a) {
    var p = pd.p;
    if (act === 'on') { a.disabled = true; x8Start(p).then(function () { a.disabled = false; }); }
    else if (act === 'signin') { stGo('portal'); openDrawer('sync', a); }
    else if (act === 'move') { a.disabled = true; dvMove(p).then(function () { a.disabled = false; }); }
    else if (act === 'drive') stGo('drive');
    else if (act === 'sync') { x8Sync(false).then(function () { pdRerender('[data-pd="x8:sync"]'); showToast(X8.st === 'err' ? 'Could not sync: ' + X8.msg : 'Synced'); }); }
    else if (act === 'off') { if (!pd.x8off) { pd.x8off = true; pdRerender('[data-pd="x8:off"]'); setTimeout(function () { if (pd.x8off) { pd.x8off = false; if (pd.p === p) pdRerender(); } }, 4000); return; } pd.x8off = false; x8Stop(p); }
  }

  /* ---- what each person may do here: the screen follows the role, and every device re-checks it on what arrives ---- */
  var X8_ED_ACTS = { 'dv:sync': 1, 'dv:give': 1, 'dv:hi': 1, goto: 1, needsall: 1, hgo: 1, hmore: 1, hagr: 1, tocr: 1, cancel: 1, done: 1, addlink: 1, 'dl:record': 1, 'x8:sync': 1,
    'x6:today': 1, 'x6:ladd': 1, 'x6:lcancel': 1, 'x6:lshow': 1, 'x6:led': 1, 'x6:lup': 1, 'x6:lrm': 1, 'x6:tsave': 1, 'x6:topen': 1, 'x6:notes': 1, 'x6:dadd': 1, 'x6:dcancel': 1, 'x6:dall': 1, 'x6:nsug': 1, 'x6:nuse': 1, 'x6:tlist': 1, 'x6:flist': 1, 'x6:trm': 1, 'x6:tclr': 1, 'x6:nt': 1, 'x6:ntx': 1, 'x6:nrm': 1, 'x6:fadd': 1, 'x6:fgx': 1, 'x6:fto': 1, 'x6:fdx': 1, 'x6:fcan': 1, 'x6:fcall': 1, 'x6:fre': 1, 'x6:fdis': 1, 'x6:aud': 1, 'x6:audx': 1, 'x6:frm': 1, 'x6:fno': 1, 'x6:fdel': 1,
    'x6:ldrop': 1, 'x9:add': 1, 'x9:rm': 1, 'wk:tog': 1, 'wk:dn': 1, 'wk:cancel': 1, 'wk:all': 1, 'wk:wc': 1, 'wk:replied': 1, 'wk:ack': 1, 'wk:dod': 1, 'x6:ai': 1, 'cf:keep': 1, 'cf:use': 1, 'wk:cp': 1, 'sv:off': 1, 'sv:all': 1, 'x6:cw': 1 };
  var X8_VW_ACTS = { 'cf:keep': 1, 'sv:off': 1, 'sv:all': 1, 'x6:cw': 1, 'dv:sync': 1, 'dv:give': 1, 'dv:hi': 1, goto: 1, needsall: 1, hgo: 1, hmore: 1, hagr: 1, tocr: 1, cancel: 1, 'dl:record': 1, 'x8:sync': 1, 'x6:today': 1, 'x6:lshow': 1, 'x6:tsave': 1, 'x6:topen': 1, 'x6:notes': 1, 'x6:dall': 1, 'x6:tlist': 1, 'x6:flist': 1, 'x6:trm': 1, 'x6:tclr': 1, 'x6:nt': 1, 'x6:ntx': 1, 'x6:fadd': 1, 'x6:fgx': 1, 'wk:tog': 1, 'wk:dn': 1, 'x6:ai': 1 };
  /* CONTRACT 119: what only looks: choosing a row to read, showing more, opening an older version, going to another tab, a drawer
     that only shows, copying, checking a fingerprint. Every role may, a sample too (the user's ruling: a sample is to look around in,
     so only what changes it is stopped) */
  var X8_LOOK = { crsel: 1, evsel: 1, evmore: 1, evgoto: 1, evfpcopy: 1, evcheck: 1, evverify: 1, viewver: 1, viewcur: 1, toscope: 1, clreq: 1, preview: 1, client: 1, roster: 1, drive: 1,
    'prv:dsel': 1, 'prv:dmore': 1, 'prv:dgate': 1, 'prv:gocomp': 1, 'prv:gojob': 1, 'prv:goverify': 1, 'prv:hev': 1, 'prv:hgo': 1, 'prv:hmore': 1, 'prv:lane': 1, 'prv:jx': 1, 'prv:ref': 1,
    'prv:srcall': 1, 'prv:vx': 1, 'prv:mai': 1, 'prv:mexp': 1, 'prv:tri': 1, 'prv:trix': 1, 'prv:trisk': 1, 'prv:cancel': 1,
    sdportal: 1, vpdemo: 1 };   /* CONTRACT 120: a sample's client portal and Viewer portal, as demos */
  var X8_ED_FORMS = { addlink: 1, 'x6:later': 1, 'x6:dec': 1, 'x6:links': 1, 'wk:stuck': 1, 'wk:wait': 1, 'wk:ho': 1, 'wk:gh': 1, 'wk:dod': 1, 'prv:padd': 1, 'x6:note': 1, 'x6:aud': 1, 'wk:cp': 1 };
  /* the share a project is in: team sync (x8) or, from v69, Drive (dv); both carry owner and oname */
  function x8O(p) { return (p && (p.x8 || p.dv)) || null; }
  function x8Own1(p) { return ((x8O(p) && x8O(p).oname) || 'the owner').split(' ')[0]; }
  function x8No(p) { if (sdSample(p)) return sdSampleNo(); showToast(x8Role(p) === 'Viewer' ? 'You are a Viewer here. You can read everything, not change it.' : 'Only ' + x8Own1(p) + ' can do that here. You are an Editor.'); }
  function x8Block(p, act, a) {
    /* v125 (99): a sample never syncs: no team sync, no Drive, no Viewer portal, not even Sync now, which a Viewer may press */
    if (sdSample(p) && /^(x8|dv|vp):/.test(act)) { sdSampleNo(); return true; }
    if (act.indexOf('fb:') === 0) return fbBlock(p, act, a);   /* v70 (32.2) */
    var r = x8Role(p); if (r === 'Owner' || X8_LOOK[act]) return false;
    var ok = r === 'Viewer' ? X8_VW_ACTS[act] : X8_ED_ACTS[act] || (act === 'edit' && a.getAttribute('data-f') === 'next');
    if (ok) return false;
    x8No(p); return true;
  }
  function x8BlockForm(p, k, f) {
    if (k.indexOf('fb:') === 0) return fbBlockForm(p, k);
    var r = x8Role(p); if (r === 'Owner') return false;
    if (r === 'Editor' && (X8_ED_FORMS[k] || (k === 'edit' && f.getAttribute('data-f') === 'next'))) return false;
    x8No(p); return true;
  }
  /* work: an Editor changes their own items, takes free ones, and hands their own on. Done comes from the owner's review */
  function x8BlockWk(p, kind, u, v) {
    var r = x8Role(p); if (r === 'Owner') return false;
    if (r === 'Viewer') { x8No(p); return true; }
    var mine = u.as === 'You', free = !u.as;
    if (kind === 'as') { if (free && v === 'You' || mine) return false; showToast('You can take free work, or hand on your own. Other people’s work is ' + x8Own1(p) + '’s to move.'); return true; }
    if (!mine && !free) { showToast('That is ' + x8NameOf(p, u.as) + '’s. You can change your own work.'); return true; }
    if (kind === 'st' && v === 'done') { showToast('Send it for review. ' + x8Own1(p) + ' approves it.'); return true; }
    return false;
  }
  /* My work: free work in shared projects, for anyone to take */
  function x8Grabs() {
    var out = [];
    PROJECTS.forEach(function (p) { if (!p.x8 || x8Role(p) !== 'Editor' || p.x8.wait) return; wkUnits(p).forEach(function (u) { if (!u.as && u.st !== 'done') out.push({ p: p, u: u }); }); });
    return out;
  }
  function x8GrabHTML() {
    var l = x8Grabs(); if (!l.length) return '';
    return '<div class="mw-sh"><h2 id="mw-h-grab">Up for grabs</h2><span class="count">' + l.length + '</span></div><section class="card x8-grab" aria-labelledby="mw-h-grab"><p class="x8-gp">Free work in projects shared with you. Take what fits; ' + (l.length === 1 ? 'it is' : 'each one is') + ' yours the moment you do.</p><ul class="x8-gl">' +
      l.map(function (x) { return '<li><span class="pj-av' + (x.p.kind === 'private' ? ' priv' : '') + '" aria-hidden="true">' + esc(x.p.m) + '</span><div class="grow"><b>' + esc(x.u.t) + '</b><small>' + esc(x.p.n) + (x.u.due ? ' · due ' + esc(x6Rel(x.u.due)) : '') + (x.u.size ? ' · ' + esc(x.u.size) : '') + '</small></div><button type="button" class="btn-ghost btn-sm" data-mw="take" data-pj="' + esc(x.p.id) + '" data-id="' + esc(x.u.id) + '">Take it</button></li>'; }).join('') + '</ul></section>';
  }
  function x8Take(p, id) {
    var u = p && wkUnit(p, id); if (!u || u.as) return;
    wkApply(p, function () { wkSet(p, id, { as: 'You' }); }, 'You took “' + prvT(u.t, 40) + '”', 'It is yours: “' + prvT(u.t, 40) + '”', '', id, wkHostMw);
    x8Sync(true);
  }
  /* notifications: only what a person has to act on, in projects shared with them */
  function x8Notes(out) {
    PROJECTS.forEach(function (p) {
      /* v121 (91): a project kept in Google Drive with a team has the same notes (they were team sync's only) */
      if (p.x8 ? p.x8.wait : !(p.dv && (p.team || []).length)) return;
      var own = x8Role(p) === 'Owner', tab = p.team.length ? 'team' : 'scope', go = { pid: p.id, tab: tab, f: 'wk', cr: '' }, nm = dbName(p), last = (p.x8 && p.x8.last) || (p.dv && p.dv.last) || Date.now();
      wkUnits(p).forEach(function (u) {
        var ho = u.ho && u.ho.length ? u.ho[u.ho.length - 1] : null;
        if (u.as === 'You' && u.st !== 'done' && !own) out.push({ key: 'x8as:' + p.id + ':' + u.id + ':' + (u.ho || []).length, tone: '', title: ho && ho.to === 'You' && ho.from !== 'You' ? 'Handed over to you' : 'Assigned to you', text: '“' + prvT(u.t, 60) + '”' + (ho && ho.to === 'You' ? '. Next: ' + ho.next : '.'), meta: nm, ts: ho ? ho.ts : (last), go: go });
        if (own && u.st === 'review' && u.as && u.as !== 'You') out.push({ key: 'x8rv:' + p.id + ':' + u.id + ':' + (u.rb ? u.rb.ts : 0), tone: '', title: 'Waiting for your review', text: x8NameOf(p, u.as) + ': “' + prvT(u.t, 60) + '”.', meta: nm, ts: last, go: go });
        if (u.stk && u.by && u.by.k === 'p' && u.by.ref === 'You') out.push({ key: 'x8wt:' + p.id + ':' + u.id + ':' + u.stk, tone: 'warn', title: x8NameOf(p, u.as) + ' is waiting on you', text: '“' + prvT(u.t, 50) + '”: ' + u.stk, meta: nm, ts: last, go: go });
        if (u.as === 'You' && u.rb && u.st !== 'done') out.push({ key: 'x8rb:' + p.id + ':' + u.id + ':' + u.rb.ts, tone: 'warn', title: 'Sent back to you', text: '“' + prvT(u.t, 50) + '”: ' + u.rb.why, meta: nm, ts: u.rb.ts, go: go });
        if (u.as === 'You' && u.ap) out.push({ key: 'x8ap:' + p.id + ':' + u.id + ':' + u.ap.ts, tone: '', title: 'Approved', text: '“' + prvT(u.t, 60) + '” is done.', meta: nm, ts: u.ap.ts, go: go });
      });
    });
  }
  /* on a member's device, Needs are about their own work, not the client or the scope */
  function x8MemberNeeds(p, all) {
    var keep = /^(Next step unchanged|No next step)|past (its|their) date|stuck|ready again|changed after work started|pull request|checks failing|crossed/i;
    return all.filter(function (x) { return keep.test(x.t); });
  }
  /* small pieces the existing screens call */
  function x8Lock(p, u) { var r = x8Role(p); return r === 'Viewer' || (r === 'Editor' && !!u.as && u.as !== 'You'); }
  function x8LockHTML(h, st) { return h.replace(st ? /<select data-wk=(?!"st")/g : /<select data-wk=/g, '<select disabled data-wk=')   /* st: the status stays open (a sample in My work, 109) */.replace(/<input type="date" data-wk=/g, '<input type="date" disabled data-wk='); }
  function x8Chip(p) {
    if (!p.x8) return '';
    var own = x8Role(p) === 'Owner';
    return '<span class="pd-pill x8-hc' + (p.x8.wait ? ' wait' : '') + '" title="' + (own ? 'Team sync is on. Encrypted on each device.' : 'Shared with you. Encrypted on each device.') + '">' + IC('lock') + (own ? 'Synced' : 'Shared by ' + esc((p.x8.oname || 'the owner').split(' ')[0]) + ' · ' + esc(p.x8.role)) + '</span>';
  }
  function x8MemberRow(m) {
    return '<li class="pd-m">' + pdAv(m) + '<div class="pd-m-t"><b>' + esc(m.n) + '</b><small>' + esc(m.e) + '</small></div><div class="pd-m-r"><span class="chip' + (m.role === 'Owner' ? '' : ' neutral') + '">' + esc(pdRoleName(m.role)) + '</span></div><span></span></li>';
  }
  function x8MeRow(p) {
    var r = x8Seen(p);
    return '<li class="pd-m"><span class="av me" style="--c:' + ME.c + '">' + ME.ini + '</span><div class="pd-m-t"><b>You</b><small>' + (r === 'Owner' ? 'Workspace owner' : esc(x8Me())) + '</small></div><div class="pd-m-r"><span class="chip' + (r === 'Owner' ? '' : ' neutral') + '">' + pdRoleName(r) + '</span></div><span></span></li>';
  }
  function x8MemFoot(p) {
    if (x8Seen(p) === 'Owner') return '<p class="pd-note pd-mem-f">People come from your team list. <button type="button" class="link" data-pd="roster">Manage it in Settings</button>' + (p.x8 ? ' Adding or removing someone here changes who gets the project.' : '') + '</p>';
    return '<p class="pd-note pd-mem-f">' + esc((x8O(p) || {}).oname || 'The owner') + ' decides who is in this project.</p>';
  }
  function x8ColabLi(p) {
    if (p.x8) return '<li><div class="grow"><b>Shared with team sync</b><small>Encrypted on each device. The server passes it along and cannot read it.</small></div>' + IC('lock') + '</li>';
    return '<li><div class="grow"><b>Drafts stay on each device</b><small>Nothing is shared until the Owner issues it.</small></div>' + IC('lock') + '</li>';
  }
  /* a review waits on the project's owner: on a member's device, that is not "You" */
  function x8RevTo(p) { return x8O(p) && x8Role(p) !== 'Owner' ? (x8O(p).owner || '') : 'You'; }
  function x8ReviewLine(p) { return x8O(p) && x8Role(p) !== 'Owner' ? '<small class="wk-why">With ' + esc((x8O(p).oname || 'the owner').split(' ')[0]) + ' for review.</small>' : ''; }
  function x8Init() {
    if (pfSaved && pfSaved.name && pfSaved.name !== PF_DEF.name) ME.ini = initials(pfSaved.name);   // your own initials, not the placeholder's
    setInterval(function () { if (document.visibilityState === 'visible') x8Dirty(); }, 3000);
    setInterval(function () { if (document.visibilityState === 'visible' && x8On()) x8Sync(false); }, 20000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && x8On()) x8Sync(false); });
    if (x8On()) setTimeout(function () { x8Sync(true); }, 1200);
    new MutationObserver(function () { if (document.querySelector('[data-fp]')) x8Fps(); }).observe(pdPanel, { childList: true, subtree: false });
    if (sdTest()) window.__x8 = { sync: function () { return x8Sync(true); }, state: function () { return { st: X8.st, msg: X8.msg, list: X8.list, fp: X8.devFp || '' }; }, rec: function (r) { return x8Rec(r); }, out: function (id) { return x8Out(pdById(id)); }, dev: function () { return x8Dev().then(function (d) { return { kid: d.kid, fp: X8.devFp }; }); } };
  }

