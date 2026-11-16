  /* ---------- v70: the Viewer portal, the app's side (CONTRACT.md 32.6) ----------
     On the Owner's device, with a ScopeDue account: the Feedback tab opens the portal for the project (p.vp.on), chooses what
     Viewers see (p.vp.sh), and invites each Viewer. The showcase, the entries with their state and the list of Viewers go to the
     server whenever they change (PUT /v1/vprojects/<ref>); what Viewers send comes back from /v1/vinbox into p.fb, in their
     name, and is then taken off the server. Nothing else of the project leaves the device. */
  var VP = { busy: false, pulled: 0, last: '', wait: {}, lock: {}, kok: {}, left: {}, nm: {} };
  function vpOn() { return !!(SY.key && SY.url && SY.st !== 'auth'); }
  function vpRef(p) { return String(p.id || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 64) || 'p'; }
  function vpOwn(p) { return p && p.kind === 'private' && x8Role(p) === 'Owner'; }
  function vpLive(p) { return vpOwn(p) && p.vp && p.vp.on && fbViewers(p).length > 0; }
  /* v93: the names other Viewers read: someone no longer on the team has none (fbPerson would give the start of their email), and
     the portal says "someone who left" */
  function vpNames(p, fr) {
    return prvList((fr || []).map(function (e) { var k = String(e || '').toLowerCase(), m = (p.team || []).filter(function (x) { return String(x.e || '').toLowerCase() === k; })[0]; return m ? m.n : ''; }).filter(Boolean));
  }
  /* what goes to the server: only what the dev turned on, and the entries Viewers may read */
  function vpOut(p) {
    var pv = p.pv || {}, sh = (p.vp && p.vp.sh) || {}, show = {};
    if (sh.rel && pv.rel && prvRelOn(p)) show.rel = { name: pv.rel.name || '', date: pv.rel.date || '', ship: pv.rel.ship || '' };
    if (sh.items) show.items = (pv.items || []).filter(function (x) { return x.sec === 'in' || x.sec === 'next'; }).map(function (x) { return { id: x.id, t: x.t, sec: x.sec, st: x.st === 'done' ? 'done' : x.st === 'review' ? 'review' : x.st === 'doing' ? 'doing' : 'planned' }; });
    if (sh.ships) show.ships = (pv.ships || []).slice(-5).map(function (s) { return { id: s.id, name: s.name, date: s.ts ? new Date(s.ts).toISOString().slice(0, 10) : '', sum: s.sum || '' }; });
    if (pdMode(p) === 'internal') show.use = 'internal';   /* CONTRACT 121: the portal says it is made for internal use, not for the Viewer (api.php 1.30.1) */
    var entries = fbList(p).filter(function (e) { return e.k !== 'cmt'; }).map(function (e) {
      var st = fbStage(p, e), ab = fbAbout(p, e.ab), o;
      o = { id: e.id, k: e.k, fr: (e.fr || []).slice(), names: vpNames(p, e.fr), t: e.t, st: st.s, why: e.why || '', res: e.res || '', ab: ab ? ab.l : '', vo: (e.vo || []).slice(), ts: e.ts,
        cm: fbList(p).filter(function (c) { return c.k === 'cmt' && c.ab === 'f:' + e.id; }).map(function (c) { return { names: vpNames(p, c.fr), t: c.t, ts: c.ts }; }) };
      /* v93 (32.2): who has answered an approval, and how; the server tells each Viewer only their own (api.php 1.9.2) */
      if (e.k === 'appr') { var as = fbAs(e); o.an = {}; Object.keys(as).forEach(function (w) { if (as[w] && (as[w].v === 'yes' || as[w].v === 'nope')) o.an[w] = as[w].v; }); }
      /* v95 (40.1, 40.2): a request to check is open while someone asked has not answered; its link, date and steps; who has answered */
      if (e.k === 'chk') { var rs = fbRs(e); o.st = fbChkOpen(e).length ? 'open' : 'closed'; o.url = e.url || ''; o.steps = (e.steps || []).slice(0, 12); o.an = {}; Object.keys(rs).forEach(function (w) { if (rs[w] && (rs[w].v === 'pass' || rs[w].v === 'fail')) o.an[w] = rs[w].v; }); }
      if ((e.k === 'chk' || e.k === 'appr') && e.due) o.due = e.due;
      /* v122 (92): a test result that opened a bug names it, so the portal shows the two as one (api.php 1.26.1) */
      if (e.k === 'test' && e.bid && fbById(p, e.bid)) o.bid = e.bid;
      return o;
    });
    /* v94: the portal and its emails speak the project's language */
    var lv = vpLeaving(p), vs = fbViewers(p).map(function (m) { var e = String(m.e).toLowerCase(); VP.nm[e] = m.n; return { email: e, name: m.n, lang: pjLang(p) }; });
    lv.keep.forEach(function (e) { vs.push({ email: e, name: VP.nm[e] || e.split('@')[0].slice(0, 80) || 'Viewer', lang: pjLang(p) }); });
    var o = { name: p.n, show: show, entries: entries, viewers: vs };
    if (lv.gone.length) o.gone = lv.gone.slice(0, 50);
    return o;
  }
  /* v114 (73): someone the server still lets in who is no longer a Viewer here. For 6 s (the toast's Undo) they are sent as before;
     then they leave the list, and `gone` names those taken off the team (not those made an Editor), whom the server emails */
  function vpLeaving(p) {
    var now = Date.now(), vw = (p.vp && p.vp.vw) || {}, L = VP.left[p.id] = VP.left[p.id] || {}, out = { keep: [], gone: [] };
    var cur = fbViewers(p).map(function (m) { return String(m.e).toLowerCase(); });
    Object.keys(L).forEach(function (e) { if (cur.indexOf(e) > -1 || !vw[e]) delete L[e]; });
    Object.keys(vw).forEach(function (e) {
      if (cur.indexOf(e) > -1) return;
      if (!L[e]) L[e] = now;
      if (now - L[e] < 6000) out.keep.push(e);
      else if (!(p.team || []).some(function (m) { return String(m.e || '').toLowerCase() === e; })) out.gone.push(e);
    });
    return out;
  }
  async function vpPush(p, force) {
    if (sdSample(p)) return null;   /* v125 (99): a sample's Viewers are made up; nothing goes to the portal */
    if (!vpOn() || !vpOwn(p) || !p.vp) return null;
    if (!p.vp.on) return null;
    var out = vpOut(p), h = JSON.stringify(out);
    if (!VP.kok[p.id]) force = true;   /* v90 (32.7): each device gives its public key once a session, so the portal seals for it */
    if (!force && h === p.vp.h) return null;
    var dev = await x8Dev(); out.keys = [{ kid: dev.kid, pub: dev.pub }];
    var r = await syCall('PUT', '/v1/vprojects/' + vpRef(p), out);
    if (syOk(r)) { VP.kok[p.id] = 1; p.vp.h = h; p.vp.msg = ''; p.vp.vw = (r.data.viewers || []).reduce(function (a, v) { a[v.email] = { inv: v.invited_at || 0, seen: v.seen_at || 0 }; return a; }, {}); SDB.soon(200); }
    else p.vp.msg = syMsg(r);
    return r;
  }
  /* v114 (73): also once its last Viewer is gone, while the server still lets someone in, so they are taken off there too */
  async function vpPushAll() { for (var i = 0; i < PROJECTS.length; i++) { var p = PROJECTS[i]; if (vpLive(p) || (vpOwn(p) && p.vp && p.vp.on && Object.keys(p.vp.vw || {}).length)) await vpPush(p); } }
  /* v112 (69): someone added as a Viewer, or made one. Once the toast's Undo has passed (and they are still a Viewer, not invited
     yet), the portal opens if it was closed, as Open the portal does, and their link goes out: inviting a Viewer is what opens it.
     Signed out of ScopeDue, the toast says so. Returns what the toast adds */
  function vpAdded(p, ms) {
    var vs = (ms || []).filter(function (m) { return m && m.role === 'Viewer' && m.e; });
    if (!vs.length || !vpOwn(p)) return '';
    if (!vpOn()) return '. Sign in to ScopeDue to send the link.';
    setTimeout(function () { vpSendNew(p, vs.map(function (m) { return String(m.e).toLowerCase(); })); }, 6000);
    return '';
  }
  async function vpSendNew(p, es) {
    if (!vpOwn(p) || !vpOn()) return;
    var now = fbViewers(p).map(function (m) { return String(m.e).toLowerCase(); });
    es = es.filter(function (e) { return now.indexOf(e) > -1; });
    if (!es.length || !(await vpOpenFor(p))) return;
    for (var i = 0; i < es.length; i++) if (!((p.vp.vw || {})[es[i]] || {}).inv) await vpInvite(p, es[i]);
    SDB.soon(40); vpPaint(p);
  }
  /* the portal open before a link goes out: closed, it opens as Open the portal does. False (with a toast) when it cannot */
  async function vpOpenFor(p) {
    p.vp = p.vp || { on: false, sh: { rel: 1, items: 1, ships: 1 } };
    if (p.vp.on) { await vpPush(p); return true; }
    p.vp.on = true; var o = await vpPush(p, true);
    if (!o || !syOk(o)) { p.vp.on = false; showToast((o && syMsg(o)) || 'Could not open the portal'); SDB.soon(40); return false; }
    pdNote(p, 'You opened the Viewer portal'); return true;
  }
  async function vpInvite(p, e) {
    var r = await syCall('POST', '/v1/vprojects/' + vpRef(p) + '/invite', { email: e });
    if (syOk(r)) { p.vp.vw = p.vp.vw || {}; p.vp.vw[e] = Object.assign({}, p.vp.vw[e], { inv: Date.now() }); pdNote(p, 'You sent ' + fbPerson(p, e) + ' a link to the Viewer portal'); showToast('Link sent to ' + fbPerson(p, e)); }
    else showToast(syMsg(r));
    return r;
  }
  function vpPaint(p) { if (pd.p === p && curView === 'project' && (pd.tab === 'team' || pd.tab === 'feedback') && !syTyping()) pdRerender(); }
  /* v112 (69): a Viewer's row in Members says where their invitation stands, as an Editor's does (dvMemLine): Not invited yet, Invited,
     Opened the portal, from what the server answers each push (p.vp.vw); Invite opens the portal if it is closed */
  function vpMemLine(p, m) {
    if (!p || !vpOwn(p) || !m || m.role !== 'Viewer' || fbJoins(m)) return '';
    var e = String(m.e || '').toLowerCase(), w = ((p.vp && p.vp.on && p.vp.vw) || {})[e] || {};
    var st = w.seen ? 'Opened the portal ' + prvDate(w.seen) : w.inv ? 'Invited ' + prvDate(w.inv) : 'Not invited yet';
    return '<span class="pd-m-dv"><span' + (w.seen ? ' class="ok"' : '') + '>' + esc(st) + '</span>' + (vpOn() ? '<button type="button" class="link" data-pd="vp:inv" data-e="' + esc(e) + '" aria-label="Send ' + esc(m.n) + ' a link to the Viewer portal">' + (w.inv ? 'Send the link again' : 'Invite') + '</button>' : '') + '</span>';
  }
  /* while Members or Feedback is in view, what the server knows of the Viewers is asked once a minute, so Opened shows */
  function vpFresh() {
    var p = pd.p; if (!p || !vpLive(p) || !vpOn() || curView !== 'project' || (pd.tab !== 'team' && pd.tab !== 'feedback')) return;
    if (Date.now() - (VP.fresh || 0) < 60000) return;
    VP.fresh = Date.now(); var was = JSON.stringify(p.vp.vw || {});
    vpPush(p, true).then(function (r) { if (r && syOk(r) && JSON.stringify(p.vp.vw || {}) !== was) vpPaint(p); });
  }
  /* what Viewers sent, into Feedback; then it is taken off the server */
  function vpAb(p, ab) { if (!ab) return ''; if (ab === 'rel') return 'r:cur'; return prvById((p.pv && p.pv.items) || [], ab) ? 'i:' + ab : ''; }
  async function vpPull() {
    if (!vpOn() || VP.busy || !PROJECTS.some(vpLive)) return;
    VP.busy = true;
    try {
      var r = await syCall('GET', '/v1/vinbox/sealed'); if (!syOk(r)) return;   /* v90: sealed ones too (32.7) */
      var items = r.data.items || [], took = [], said = [], touched = [], wait = {}, lock = {}, spoke = [], spk = function (q) { if (spoke.indexOf(q) < 0) spoke.push(q); };   /* v121 (91): spoke, the projects Viewers spoke on */
      for (var i = 0; i < items.length; i++) {
        var x = items[i], p = PROJECTS.filter(function (q) { return vpOwn(q) && q.vp && vpRef(q) === x.project; })[0];
        if (!p) continue;
        /* v90 (32.7): sealed for the Owner's devices; one this device has no key for stays on the server for the others */
        if (x.enc && !(await vpUnseal(x))) { lock[p.id] = (lock[p.id] || 0) + 1; continue; }
        var who = String(x.from || '').toLowerCase(), nm = fbPerson(p, who), e = x.on ? fbById(p, x.on) : null;
        if (x.k === 'req' || x.k === 'bug' || x.k === 'test') {
          var n = fbById(p, 'v' + x.id), was = !!n;
          if (!n) {
            n = { id: 'v' + x.id, k: x.k, fr: [who], via: 'portal', ts: x.at, t: String(x.t || ''), ab: vpAb(p, x.ab), by: who };
            if (x.k !== 'test') n.st = 'open'; else n.res = x.res === 'fail' ? 'fail' : 'pass';
            if ((x.files || []).length) n.pics = await vpThumbs(x.files);
            fbList(p).unshift(n);
            /* v95 (40.1): the answer to a request to check that asks them */
            if (x.k === 'test' && e && e.k === 'chk' && fbChkOpen(e).indexOf(who) > -1) { if (!n.ab) n.ab = e.ab || ''; fbChkAnswer(p, e, who, { v: n.res, ts: x.at, via: 'portal', t: n.t, by: who }, n.id); } spk(p), said.push(nm + ' sent ' + (x.k === 'req' ? 'a request' : x.k === 'bug' ? 'a bug' : 'a test result') + ' on ' + p.n); pdNote(p, nm + ' sent ' + (x.k === 'req' ? 'a request' : x.k === 'bug' ? 'a bug' : 'a test result') + ' from the Viewer portal');
          }
          /* v89 (32.3): the server lets go of its pictures only once their originals are in the project's Drive */
          if ((x.files || []).length) {
            var got = await vpOriginals(p, n, x);
            if (got.up || !was) { if (touched.indexOf(p) < 0) touched.push(p); }
            if (!got.all) { wait[p.id] = (wait[p.id] || 0) + 1; continue; }
          }
        } else if (x.k === 'cmt' && e) {
          if (!fbById(p, 'v' + x.id)) fbList(p).push({ id: 'v' + x.id, k: 'cmt', fr: [who], via: 'portal', ts: x.at, t: String(x.t || ''), ab: 'f:' + e.id, by: who });
        } else if (x.k === 'vote' && e && e.k === 'req') {
          var on = (e.vo || []).indexOf(who) > -1; e.vo = (e.vo || []).filter(function (v) { return v !== who; }); if (!on) e.vo.push(who);
        } else if (x.k === 'cf' && e) {
          e.cf = { ts: x.at, via: 'portal', t: String(x.t || ''), by: who, fr: who }; spk(p), said.push(nm + ' confirmed it works on ' + p.n); pdNote(p, nm + ' confirmed it works, from the Viewer portal');
        } else if (x.k === 'nf' && e && (e.k === 'bug' || e.k === 'req')) {
          /* v95 (40.3): it still does not work */
          fbNotFixed(p, e, { ts: x.at, fr: who, t: String(x.t || ''), via: 'portal', by: who }, 'v' + x.id);
          spk(p), said.push(nm + ' says it still does not work on ' + p.n); pdNote(p, nm + ' said it still does not work, from the Viewer portal');
        } else if (x.k === 'appr' && e && e.k === 'appr') {
          /* v93 (32.2): this Viewer's own answer; the entry is approved once all of them have approved */
          var av = x.v === 'yes' ? 'yes' : 'nope';
          fbAnswer(e, who, { v: av, ts: x.at, via: 'portal', t: String(x.t || ''), by: who, code: true });
          spk(p), said.push(nm + (av === 'yes' ? ' approved it on ' : ' did not approve it on ') + p.n); pdNote(p, nm + (av === 'yes' ? ' approved it' : ' did not approve it') + ' with an emailed code');
        }
        took.push(x.id); if (touched.indexOf(p) < 0) touched.push(p);
      }
      var wch = JSON.stringify([wait, lock]) !== JSON.stringify([VP.wait, VP.lock]); VP.wait = wait; VP.lock = lock;
      if (touched.length) {
        touched.forEach(function (p) { pdTouch(p); pdRefreshBadges(p); });
        SDB.soon(40); await SDB.save();   /* kept here before the server lets go of it */
        if (took.length) await syCall('POST', '/v1/vinbox/ack', { ids: took });
        spoke.forEach(dvTellEditors);   /* v121 (91) */
        if (pd.p && touched.indexOf(pd.p) > -1 && curView === 'project') pdRerender();
        pdRender();
        if (said.length && !pendingUndo) showToast(said.length === 1 ? said[0] : said.length + ' new from the Viewer portal');
      } else if (wch && pd.p && curView === 'project') pdRerender();
      VP.pulled = Date.now();
    } finally { VP.busy = false; }
  }
  /* v90 (32.7): what the portal sealed, opened with this device's private key: the entry's key is wrapped for each of the Owner's
     devices (ECDH P-256, as x8Wrap), its words and pictures are AES-GCM bound to the project, the kind and the portal's own key
     for the entry. In place: x.t, x.ab and x.files as an entry sent in the clear has them. False when it is not for this device */
  function vpB64(buf) { var b = new Uint8Array(buf), s = '', i; for (i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  async function vpUnseal(x) {
    try {
      var dev = await x8Dev(), ref = x.project, w = (x.enc.keys || []).filter(function (k) { return k.kid === dev.kid; })[0];
      if (!w) return false;
      var K = await x8Unwrap(w, 'sdv|' + ref + '|' + dev.kid);
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(x.enc.iv), additionalData: x8Utf('sdv|' + ref + '|' + x.k + '|' + x.key) }, K, x8Unb64(x.enc.ct));
      var o = JSON.parse(new TextDecoder().decode(pt)), fs = [];
      for (var i = 0; i < (x.files || []).length; i++) {
        var c = x8Unb64(x.files[i].data), m = (o.f || [])[i] || {};
        var raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: c.slice(0, 12), additionalData: x8Utf('sdv|' + ref + '|f' + i + '|' + x.key) }, K, c.slice(12));
        fs.push({ name: String(m.n || 'picture').slice(0, 80), type: /^image\/(jpeg|png|webp)$/.test(m.y) ? m.y : 'image/jpeg', data: vpB64(raw) });
      }
      x.t = String(o.t || ''); x.ab = typeof o.ab === 'string' ? o.ab : ''; x.files = fs; delete x.enc;
      return true;
    } catch (e) { return false; }
  }
  /* v89 (32.3): the originals go to Team · <project>/Pictures/Requests|Bugs|Tests, uploaded by the Owner's device; each small copy
     in the app keeps the id and link of its original. { all: every original is in Drive, up: one went up now } */
  var VP_PIC = { req: 'Requests', bug: 'Bugs', test: 'Tests' };
  async function vpPicDir(p, k) {
    var d = p.dv, c = d.pics = d.pics || {};
    if (c[k]) return { ok: true, data: { id: c[k] } };
    if (!c.top) { var t = await drvSub(d.fid, 'Pictures', 'pics'); if (t.err) return t; c.top = t.data.id; }
    var r = await drvSub(c.top, VP_PIC[k], 'pics-' + k); if (r.ok) c[k] = r.data.id; return r;
  }
  function vpFile(f) {
    var b = atob(f.data || ''), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    /* the portal sends a JPEG of at most 1600 px (32.6.3): its name says so */
    var nm = String(f.name || 'picture').slice(0, 120); if (f.type === 'image/jpeg' && !/\.jpe?g$/i.test(nm)) nm = nm.replace(/\.[a-z0-9]{1,5}$/i, '') + '.jpg';
    return new File([a], nm, { type: f.type || 'application/octet-stream' });
  }
  async function vpOriginals(p, n, x) {
    var fs = (x.files || []).slice(0, 6), up = false;
    if (!p.dv || !dvOn() || dvRole(p) !== 'Owner' || !VP_PIC[n.k]) return { all: false, up: up };
    n.pics = n.pics || [];
    for (var i = 0; i < fs.length; i++) {
      var pic = n.pics[i] = n.pics[i] || { n: String(fs[i].name || 'picture').slice(0, 80), d: '' };
      if (pic.id) continue;
      var dir = await vpPicDir(p, n.k); if (dir.err) return { all: false, up: up };
      var props = { sd: 'pic', pid: p.dv.pid, fb: n.id }, r = await drvUpload(vpFile(fs[i]), dir.data.id, props);
      if (r.err && r.status === 404) {   /* the folder was deleted in Drive: found or made again, once */
        p.dv.pics = {}; dir = await vpPicDir(p, n.k); if (dir.err) return { all: false, up: up };
        r = await drvUpload(vpFile(fs[i]), dir.data.id, props);
      }
      if (r.err) return { all: false, up: up };
      pic.id = r.data.id; pic.u = r.data.webViewLink || ('https://drive.google.com/file/d/' + encodeURIComponent(r.data.id) + '/view'); up = true;
    }
    return { all: true, up: up };
  }
  /* small copies to show in the app (32.3); each links to its original in Drive (v89) */
  function vpThumbs(files) {
    return Promise.all(files.slice(0, 6).map(function (f) {
      return new Promise(function (res) {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var d = c.toDataURL('image/webp', 0.7); if (d.length > 60000) d = c.toDataURL('image/jpeg', 0.6);
          res({ n: String(f.name || 'picture').slice(0, 80), d: d });
        };
        img.onerror = function () { res({ n: String(f.name || 'picture').slice(0, 80), d: '' }); };
        img.src = 'data:' + f.type + ';base64,' + f.data;
      });
    }));
  }

  /* ---- the card on the Feedback tab ---- */
  function vpCard(p) {
    if (sdSample(p)) return sdpVpCard(p);   /* CONTRACT 120: a sample's portal opens as a demo */
    if (!vpOwn(p) || !fbViewers(p).length) return '';
    var v = p.vp || {}, sh = v.sh || {}, h = '<section class="card pd-card vp-card" aria-labelledby="pd-h-vp"><div class="card-h ruled"><div><span class="pd-eb">portal.scopedue.com</span><h3 id="pd-h-vp">Viewer portal</h3><p>Viewers open it from a link in their email: they see what you choose here and send what they have to say. It lands in this tab.</p></div>' +
      '<div class="h-actions"><span class="chip ' + (v.on ? 'ok' : 'neutral') + '">' + (v.on ? 'Open' : 'Closed') + '</span></div></div><div class="pde-b">';
    if (!vpOn()) return h + '<p class="pd-note">Sign in to your ScopeDue account to open the portal. It keeps only what you choose to show, and what Viewers send until this device takes it.</p><div class="pde-acts"><button type="button" class="btn-primary btn-sm" data-pd="vp:signin">Sign in</button></div></div></section>';
    if (!v.on) return h + '<div class="pde-acts"><button type="button" class="btn-primary btn-sm" data-pd="vp:open">Open the portal</button></div><p class="pde-small">Nothing of this project goes to the server until you open it or invite a Viewer.</p></div></section>';
    h += '<fieldset class="vp-sh"><legend>What Viewers see</legend>' + [['rel', 'The release and its target date'], ['items', 'What is in Now and Next (titles and progress)'], ['ships', 'Released versions']].filter(function (o) { return o[0] !== 'rel' || prvRelOn(p); }).map(function (o) {
      /* v122 (94): a switch that says whether it shows, not a pill that looks the same either way */
      return '<label class="vp-sw"><input type="checkbox" role="switch" data-vp-sh="' + o[0] + '"' + (sh[o[0]] ? ' checked' : '') + '><span class="vp-swt">' + o[1] + '</span><span class="vp-sws"><span class="on">Shown</span><span class="off">Hidden</span></span><span class="vp-swk" aria-hidden="true"></span></label>';
    }).join('') + '</fieldset><p class="pde-small">They always see what Viewers said and where each entry stands. Never your thesis, decisions, work or Parking Lot.</p>';
    h += '<ul class="vp-ppl">' + fbViewers(p).map(function (m) {
      var e = String(m.e).toLowerCase(), w = (v.vw || {})[e] || {};
      var n = fbList(p).filter(function (x) { return x.k !== 'cmt' && (x.fr || []).indexOf(e) > -1; }).length;   /* v122 (94): what they sent, as the card above it used to say */
      return '<li>' + pdAv(m) + '<span class="fb-pn"><b>' + esc(m.n) + '</b><small>' + (w.seen ? 'Opened it ' + esc(prvDate(w.seen)) : w.inv ? 'Invited ' + esc(prvDate(w.inv)) : 'Not invited yet') + (n ? ' · ' + (n === 1 ? '1 entry' : n + ' entries') : '') + '</small></span><button type="button" class="btn-ghost btn-sm" data-pd="vp:inv" data-e="' + esc(e) + '">' + (w.inv ? 'Send the link again' : 'Invite') + '</button></li>';
    }).join('') + '</ul>';
    if (v.msg) h += '<p class="pd-note warn">' + esc(v.msg) + '</p>';
    /* v89 (32.3): what Viewers sent with pictures waits on the server until its originals can go to the project's Drive */
    /* v95: a link to this tab draws it before this file has run (42 reads the address): VP is not set yet */
    var wn = (VP && VP.wait[p.id]) || 0, wb = '';
    if (wn) {
      var wc = wn === 1 ? '1 entry from Viewers has pictures.' : wn + ' entries from Viewers have pictures.', wt = '';
      if (!p.dv) { wt += dvCan(p) ? 'They stay on the server until this project is kept in Google Drive, where their originals go.' : 'They stay on the server until the project is in Google Drive.'; if (dvCan(p)) wb = '<button type="button" class="btn-primary btn-sm" data-pd="vp:keep">' + IC('folder') + 'Keep in Google Drive</button>'; }
      else if (!dvOn()) { wt += 'They stay on the server until Google Drive is connected on this device, so their originals can go to the project’s folder.'; wb = '<button type="button" class="btn-primary btn-sm" data-pd="vp:drive">Connect in Settings</button>'; }
      else wt += 'Their originals could not go to Google Drive yet. ScopeDue tries again every minute.';
      h += '<p class="pd-note warn vp-wait" role="status"><b>' + esc(wc) + '</b> <span>' + esc(wt) + '</span> <span>' + esc('The server keeps them 30 days.') + '</span></p>';   /* v91 (39) */
    }
    /* v90 (32.7): sealed for another of the Owner's devices only (sent before this one gave its key) */
    var ln = (VP && VP.lock[p.id]) || 0;
    if (ln) h += '<p class="pd-note vp-lock" role="status"><b>' + esc(ln === 1 ? '1 entry from Viewers is sealed for another of your devices.' : ln + ' entries from Viewers are sealed for another of your devices.') + '</b> <span>' + esc(ln === 1 ? 'Open ScopeDue there to take it. It stays on the server, unreadable, until then.' : 'Open ScopeDue there to take them. They stay on the server, unreadable, until then.') + '</span> <span>' + esc('The server keeps them 30 days.') + '</span></p>';
    return h + '<div class="pde-acts">' + wb + '<button type="button" class="btn-ghost btn-sm" data-pd="vp:sync">' + IC('swap') + 'Check now</button><button type="button" class="btn-ghost btn-sm" data-pd="vp:close">Close the portal</button></div></div></section>';
  }
  async function vpAct(act, a) {
    var p = pd.p; if (!p) return;
    if (act === 'signin') { stGo('portal'); openDrawer('sync', a); return; }
    if (x8Role(p) !== 'Owner') { x8No(p); return; }
    p.vp = p.vp || { on: false, sh: { rel: 1, items: 1, ships: 1 } };
    if (act === 'open') {
      a.disabled = true; p.vp.on = true; var r = await vpPush(p, true);
      if (!r || !syOk(r)) { p.vp.on = false; showToast((r && syMsg(r)) || 'Could not open the portal'); }
      else { pdNote(p, 'You opened the Viewer portal'); showToast('The portal is open. Invite each Viewer to send them their link.'); }
      SDB.soon(40); pdRerender('[data-pd="vp:inv"]');
    } else if (act === 'close') {
      if (!pd.vpClose) { pd.vpClose = true; a.textContent = 'Close it? Viewers lose access'; setTimeout(function () { pd.vpClose = false; if (pd.p === p) pdRerender(); }, 4000); return; }
      pd.vpClose = false; a.disabled = true;
      var d = await syCall('DELETE', '/v1/vprojects/' + vpRef(p));
      if (syOk(d) || d.status === 404) { p.vp.on = false; p.vp.h = ''; p.vp.vw = {}; pdNote(p, 'You closed the Viewer portal'); showToast('The portal is closed. Their links no longer work.'); }
      else showToast(syMsg(d));
      SDB.soon(40); pdRerender('[data-pd="vp:open"]');
    } else if (act === 'inv') {
      var e = a.getAttribute('data-e'); a.disabled = true;
      if (await vpOpenFor(p)) await vpInvite(p, e);   /* v112 (69): from Members too, where the portal may still be closed */
      a.disabled = false; SDB.soon(40); pdRerender('[data-pd="vp:inv"][data-e="' + e + '"]');
    } else if (act === 'keep') { a.disabled = true; await dvKeep(p); if (p.dv) await vpPull(); pdRerender('[data-pd="vp:sync"]'); }
    else if (act === 'drive') stGo('drive');
    else if (act === 'sync') { a.disabled = true; await vpPush(p, true); await vpPull(); a.disabled = false; pdRerender('[data-pd="vp:sync"]'); showToast(p.vp.msg || (VP.wait[p.id] ? 'Pictures from Viewers wait for Google Drive' : 'Up to date')); }
  }
  function vpShChange(t) {
    var p = pd.p; if (!p || !p.vp) return;
    if (x8Role(p) !== 'Owner') { x8No(p); pdRerender(); return; }
    p.vp.sh = p.vp.sh || {}; p.vp.sh[t.getAttribute('data-vp-sh')] = t.checked ? 1 : 0; SDB.soon(40); vpPush(p);
  }
  /* changes go up within seconds; what Viewers sent comes in every minute while the app is open, and when Feedback opens */
  setInterval(function () { if (document.visibilityState === 'visible' && vpOn()) { vpPushAll(); vpFresh(); } }, 8000);
  setInterval(function () { if (document.visibilityState === 'visible') vpPull(); }, 60000);
  setTimeout(function () { vpPull(); }, 4000);
  /* v112 (70): with a project's Feedback open, every 15 seconds; and on coming back to the window (two windows side by side are
     both visible, so focus counts too), at most every 10 seconds */
  setInterval(function () { if (document.visibilityState === 'visible' && curView === 'project' && pd.p && pd.tab === 'feedback' && Date.now() - VP.pulled > 12000) vpPull(); }, 15000);
  var vpBack = function () { if (document.visibilityState === 'visible' && Date.now() - VP.pulled > 10000) vpPull(); };
  document.addEventListener('visibilitychange', vpBack); window.addEventListener('focus', vpBack);
  if (sdTest()) window.__vp = { out: function (id) { return vpOut(pdById(id)); }, pull: function () { return vpPull(); }, push: function (id) { return vpPush(pdById(id), true); }, ref: function (id) { return vpRef(pdById(id)); }, wait: function (id) { return VP.wait[id] || 0; }, lock: function (id) { return VP.lock[id] || 0; }, rekey: function () { VP.kok = {}; } };
