  /* ---------- v73: saved tabs and files, shared in a team (CONTRACT.md 37) ----------
     Each saved tab (p.stabs) and file (p.files) has aud: 'all' (the Owner and every Editor), 'me' (the person who added it, by),
     or a list of addresses (by and the people ticked). 'all' travels in the body every Editor reads. The others never do as they
     are: on its way out each is sealed on its own (an envelope: a key per item, the item sealed with it, the key wrapped for each
     device of the people who see it), and on its way in each envelope this device has a wrap for is opened again. One it cannot
     open stays in the project as it came (env), passed on untouched and never shown.
     The item keys stay on this device (rec.ik: id -> { k, wk }), so a holder seals again with the same key and every wrap it could
     not make itself (a device it does not know) still opens. Only the person who added an item makes a new key: when someone is
     no longer among the people who see it. Functions only (hoisted), like 52-drive-sync. */
  var DV_SH = ['stabs', 'files'];
  /* the first paint can come before the Drive and team files have set their state up: then this is not known yet */
  function dvShMe() { var e = ''; try { e = dvMe(); } catch (er) {} if (!e) { try { e = x8Me(); } catch (er) {} } return String(e || '').toLowerCase(); }
  function dvShMine(x) { var me = dvShMe(); return !!x && (!x.by || x.by === me || x.by === 'You'); }
  function dvShOpen(x) { return !!x && !x.env; }
  function dvShHid(x) { return !!x && !!x.aud && x.aud !== 'all'; }
  /* the people an item is for: the one who added it, and the ones ticked who are still on the team */
  function dvShTo(p, x) {
    var by = String(x.by || dvShMe()).toLowerCase(), on = dvShTeam(p).map(function (m) { return m.e; }).concat([dvShMe()]), out = [by];   /* this person is on the team too */
    if (Array.isArray(x.aud)) x.aud.forEach(function (e) { e = String(e).toLowerCase(); if (out.indexOf(e) < 0 && on.indexOf(e) > -1) out.push(e); });
    return out;
  }
  /* the Owner and the Editors, as this device knows them (a member's p.team is the Owner's list without them, and the Owner) */
  function dvShTeam(p) {
    var me = dvShMe();
    return (p.team || []).filter(function (m) { return m && m.e && m.role !== 'Viewer' && String(m.e).toLowerCase() !== me && (m.role === 'Owner' || fbJoins(m)); })
      .map(function (m) { return { e: String(m.e).toLowerCase(), n: m.n || String(m.e).split('@')[0], role: m.role === 'Owner' ? 'Owner' : 'Editor' }; });
  }
  /* a project where sharing means something: kept in Drive, with someone else on it */
  function dvShOn(p) { return !!(p && p.dv) && !!dvShMe() && dvShTeam(p).length > 0; }   /* not knowing who this is, nothing can say "yours" or "From" */
  /* every device this device knows, by address: its own person's (head), the Owner's file, and the members' files it reads */
  function dvShDevs(p, rec) {
    var d = p.dv, out = {}, add = function (e, ds) { e = String(e || '').toLowerCase(); if (!e) return; out[e] = out[e] || []; (ds || []).forEach(function (x) { if (x && x.kid && x.pub && !out[e].some(function (y) { return y.kid === x.kid; })) out[e].push(x); }); };
    add(dvShMe(), (rec.head || {}).devs);
    var files = rec.files || {};
    if (d.oid && files[d.oid] && dvRole(p) !== 'Owner') add(d.owner, files[d.oid].devs);
    Object.keys(d.slots || {}).forEach(function (e) { var f = files[d.slots[e]]; if (f) add(e, f.devs); });
    return out;
  }
  function dvShAad(pid, id) { return 'sh|' + pid + '|' + id; }
  function dvShWAad(pid, id, kid) { return 'shw|' + pid + '|' + id + '|' + kid; }
  async function dvShKey(raw) { return crypto.subtle.importKey('raw', x8Unb64(raw), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); }
  /* what arrives: each envelope with a wrap for this device (or a key kept here) opened into the item it holds */
  async function dvShIn(p, rec, o) {
    if (!o || !p.dv) return o;
    var dev = await x8Dev(), pid = p.dv.pid, ik = rec.ik = rec.ik || {};
    for (var g = 0; g < DV_SH.length; g++) {
      var a = o[DV_SH[g]]; if (!Array.isArray(a)) continue;
      for (var i = 0; i < a.length; i++) {
        var x = a[i]; if (!x || !x.env) continue;
        var K = null, w = x.wk && x.wk[dev.kid];
        if (w) { try { K = await x8Unwrap(w.w, dvShWAad(pid, x.id, dev.kid)); } catch (e) { K = null; } }
        if (!K && ik[x.id]) { try { K = await dvShKey(ik[x.id].k); } catch (e) { K = null; } }
        if (!K) continue;
        try {
          var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(x.env.iv), additionalData: x8Utf(dvShAad(pid, x.id)) }, K, x8Unb64(x.env.ct));
          var it = JSON.parse(await x8Unzip(new Uint8Array(pt))), wk0 = x8Clone(x.wk || {});
          /* kept as it came: sealed again unchanged, it is this same envelope */
          ik[x.id] = { k: x8B64(await crypto.subtle.exportKey('raw', K)), wk: wk0, h: x8S(it) + '|' + Object.keys(wk0).sort().join(','), env: x.env, at: x.at || 0 };
          it.id = x.id; it.by = x.by; it.aud = x.aud;
          a[i] = it;
        } catch (e) {}
      }
    }
    return o;
  }
  /* what goes out: every open item that is not for everyone, sealed. The same item with the same people gives the same envelope
     (kept in rec.ik), so nothing looks changed to the others when nothing was */
  async function dvShOut(p, rec, o) {
    if (!o || !p.dv) return o;
    var out = x8Clone(o), pid = p.dv.pid, me = dvShMe(), ik = rec.ik = rec.ik || {}, devs = null;
    for (var g = 0; g < DV_SH.length; g++) {
      var a = out[DV_SH[g]]; if (!Array.isArray(a)) continue;
      for (var i = 0; i < a.length; i++) {
        var x = a[i]; if (!dvShOpen(x) || !dvShHid(x)) continue;
        devs = devs || dvShDevs(p, rec);
        var to = dvShTo(p, x), mine = String(x.by || me).toLowerCase() === me, c = ik[x.id], K = null, wk = {};
        if (c) { try { K = await dvShKey(c.k); } catch (e) { K = null; } wk = x8Clone(c.wk || {}); }
        /* someone is no longer among the people it is for: their wraps go; the one who added it also makes a new key */
        var gone = Object.keys(wk).filter(function (kid) { return to.indexOf(wk[kid].e) < 0; });
        if (gone.length) { gone.forEach(function (kid) { delete wk[kid]; }); if (mine) { K = null; wk = {}; } }
        if (!K) K = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        for (var t = 0; t < to.length; t++) {
          var ds = devs[to[t]] || [];
          for (var j = 0; j < ds.length; j++) if (!wk[ds[j].kid]) wk[ds[j].kid] = { e: to[t], w: await x8Wrap(K, ds[j].pub, dvShWAad(pid, x.id, ds[j].kid)) };
        }
        var body = x8Clone(x); delete body.id; delete body.by; delete body.aud;
        var h = x8S(body) + '|' + Object.keys(wk).sort().join(','), raw = x8B64(await crypto.subtle.exportKey('raw', K));
        var env = c && c.h === h && c.k === raw && c.env ? c.env : null, at = env ? c.at || 0 : Date.now();
        if (!env) { var iv = x8Rand(12); env = { iv: x8B64(iv), ct: x8B64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: x8Utf(dvShAad(pid, x.id)) }, K, await x8Zip(x8S(body)))) }; }
        ik[x.id] = { k: raw, wk: wk, h: h, env: env, at: at };
        a[i] = { id: x.id, by: x.by || me, aud: x.aud, env: env, wk: wk, at: at };
      }
    }
    return out;
  }
  /* what an Editor may change in these lists: their own items whole; someone else's only by adding notes (or, for an envelope
     they are among the people of, its new seal); nobody else's item is removed by them, and they add only their own.
     cur is this device's list now: an item that reached them after their last copy here is judged against it */
  function dvShAllow(prev, next, author, cur) {
    var pa = (Array.isArray(prev) ? prev : []).slice(), na = Array.isArray(next) ? next : [], nm = {}, out = [];
    (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id != null && !pa.some(function (y) { return y.id === x.id; }) && na.some(function (y) { return y && y.id === x.id; })) pa.push(x); });
    author = String(author || '').toLowerCase();
    na.forEach(function (x) { if (x && x.id != null) nm[x.id] = x; });
    pa.forEach(function (x) {
      var nx = nm[x.id], own = String(x.by || '').toLowerCase() === author;
      if (own) { if (nx) out.push(x8Clone(nx)); return; }
      if (!nx) { out.push(x); return; }
      if (x.env && nx.env) { out.push(Array.isArray(x.aud) && x.aud.map(function (e) { return String(e).toLowerCase(); }).indexOf(author) > -1 ? Object.assign(x8Clone(x), { env: nx.env, wk: nx.wk }) : x); return; }
      if (!x.env && !nx.env) { var r = x8Clone(x); if (Array.isArray(nx.n)) r.n = x8Clone(nx.n); out.push(r); return; }
      out.push(x);
    });
    na.forEach(function (x) { if (x && !pa.some(function (y) { return y.id === x.id; }) && String(x.by || '').toLowerCase() === author) out.push(x8Clone(x)); });
    return out;
  }
  /* someone left the team: on the device of the person who added an item, they come off its list, and off the file in Drive.
     The item's next seal leaves their devices out and makes a new key (dvShOut) */
  async function dvShPrune(p) {
    if (!p.dv || dvRole(p) === 'Viewer') return;
    var on = dvShTeam(p).map(function (m) { return m.e; }), ch = false;
    for (var g = 0; g < DV_SH.length; g++) {
      var a = p[DV_SH[g]] || [];
      for (var i = 0; i < a.length; i++) {
        var x = a[i]; if (!dvShOpen(x) || !dvShMine(x) || !Array.isArray(x.aud)) continue;
        var gone = x.aud.filter(function (e) { return on.indexOf(String(e).toLowerCase()) < 0; }); if (!gone.length) continue;
        if (DV_SH[g] === 'files') { var bad = false; for (var j = 0; j < gone.length; j++) { var un = await drvUnshare(x.id, gone[j]); if (un.err && un.status !== 404) bad = true; } if (bad) continue; }
        x.aud = x.aud.filter(function (e) { return gone.indexOf(e) < 0; }); if (!x.aud.length) x.aud = 'me'; ch = true;
      }
    }
    if (ch) pdTouch(p);
  }
