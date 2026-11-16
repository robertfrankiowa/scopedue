  /* ---------- v102: pictures from the client (CONTRACT.md 59) ----------
     On a request, a question, a note, I'd like changes or Not as agreed, the client portal can send up to 6 pictures. The record
     lists each one (n, type, size, sha) on the entry or delivery event, outside its hash, and comes with it through pull; the server
     holds the bytes until the Owner's device has them. Here that device takes them (GET /v1/cfiles), checks each against the sha on
     the record, puts the original in Team · <project>/Pictures/Client in Drive, keeps a small copy on the record (d, with the
     original's id and link u, so Editors see it through Drive sync), saves, and only then lets the server delete it
     (POST /v1/cfiles/ack). What cannot be taken yet stays on the server, at most 30 days, and the client card says why. */
  var CP = { busy: false, wait: {}, bad: {} };
  /* the record's list, as the server sends it */
  function cpSan(a) {
    if (!Array.isArray(a) || !a.length) return null;
    return a.slice(0, 6).map(function (x) { x = x || {}; return { n: syS(x.n, 120) || 'picture', type: /^image\/(jpeg|png|webp)$/.test(x.type) ? x.type : 'image/jpeg', size: syI(x.size), sha: /^[0-9a-f]{64}$/.test(x.sha) ? x.sha : '', st: x.st === 'taken' || x.st === 'gone' ? x.st : 'held' }; });
  }
  function cpSha(b64) {
    try {
      var b = atob(b64 || ''), a = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
      return crypto.subtle.digest('SHA-256', a).then(function (h) { return [].map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }, function () { return ''; });
    } catch (e) { return Promise.resolve(''); }
  }
  async function cpDir(p) {
    var d = p.dv, c = d.pics = d.pics || {};
    if (c.client) return { ok: true, data: { id: c.client } };
    if (!c.top) { var t = await drvSub(d.fid, 'Pictures', 'pics'); if (t.err) return t; c.top = t.data.id; }
    var r = await drvSub(c.top, 'Client', 'pics-client'); if (r.ok) c.client = r.data.id; return r;
  }
  /* the picture a held file belongs to: its entry or event must already be here */
  function cpPicOf(p, f) {
    var e = f.cr ? ((pdCr(p, String(f.cr)) || { entries: [] }).entries[syI(f.idx)]) : (p.mev || [])[syI(f.ev)];
    return e && e.pics ? e.pics[syI(f.pos)] || null : null;
  }
  async function cpPull() {
    if (!CP || !SY.key || SY.st === 'auth' || CP.busy || SDB.S.stale) return;   // the first draw and pull can come before this file has run
    if (!PROJECTS.some(function (p) { return p.kind === 'client' && syMine(p); })) return;
    CP.busy = true;
    var wait = {}, bad = {}, touched = [], rounds = 0, more = true;
    try {
      while (more && rounds++ < 5) {
        var r = await syCall('GET', '/v1/cfiles'); if (!syOk(r)) return;
        var fs = Array.isArray(r.data.files) ? r.data.files : [], took = [];
        more = !!r.data.more;
        for (var i = 0; i < fs.length; i++) {
          var f = fs[i], p = pdById(syS(f.project, 64)); if (!p || !syMine(p)) continue;
          var pic = cpPicOf(p, f); if (!pic) continue;   // its entry has not reached this device yet: the next round
          if (pic.id) { took.push(f.id); continue; }     // already in Drive; the server had not heard
          if (!pic.sha || (await cpSha(f.data)) !== pic.sha) { bad[p.id] = (bad[p.id] || 0) + 1; continue; }   // not what the record says arrived
          if (!p.dv || !dvOn() || dvRole(p) !== 'Owner') { wait[p.id] = (wait[p.id] || 0) + 1; continue; }
          if (!pic.d) pic.d = (await vpThumbs([{ name: pic.n, type: pic.type, data: f.data }]))[0].d;
          var file = { name: pic.n, type: pic.type, data: f.data }, props = { sd: 'pic', pid: p.dv.pid, cr: f.cr ? syS(f.cr, 12) + '/' + syI(f.idx) : 'ev/' + syI(f.ev) };
          var dir = await cpDir(p), u = dir.err ? dir : await drvUpload(vpFile(file), dir.data.id, props);
          if (u.err && u.status === 404) { p.dv.pics = {}; dir = await cpDir(p); u = dir.err ? dir : await drvUpload(vpFile(file), dir.data.id, props); }   // the folder was deleted in Drive: made again, once
          if (u.err) { wait[p.id] = (wait[p.id] || 0) + 1; continue; }
          pic.id = u.data.id; pic.u = u.data.webViewLink || ('https://drive.google.com/file/d/' + encodeURIComponent(u.data.id) + '/view'); pic.st = 'taken';
          took.push(f.id); if (touched.indexOf(p) < 0) touched.push(p);
        }
        if (touched.length) { touched.forEach(function (p) { pdTouch(p); }); SDB.soon(40); await SDB.save(); }   // kept here before the server lets go of it
        if (took.length) await syCall('POST', '/v1/cfiles/ack', { ids: took });
        if (!took.length) break;
      }
    } finally {
      var ch = JSON.stringify([wait, bad]) !== JSON.stringify([CP.wait, CP.bad]); CP.wait = wait; CP.bad = bad; CP.busy = false;
      if ((touched.length || ch) && pd.p && curView === 'project' && pd.p.kind === 'client') pdRerender();
    }
  }
  setInterval(function () { if (document.visibilityState === 'visible') cpPull(); }, 60000);

  /* the pictures on an entry or a delivery answer: a small copy that opens the original in Drive, or the name and where it is */
  function cpHTML(ps) {
    if (!ps || !ps.length) return '';
    return '<div class="fb-pics cp-pics">' + ps.map(function (x) {
      if (/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/]+=*$/.test(x.d || '')) {
        var im = '<img src="' + x.d + '" alt="' + esc(x.n) + '" loading="lazy">';
        return /^https:\/\/(drive|docs)\.google\.com\//.test(x.u || '') ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener" title="' + esc(sdT('Open the original in Google Drive')) + '">' + im + '</a>' : im;
      }
      return '<span class="cp-pic" title="' + esc(x.sha ? 'SHA-256 ' + x.sha : '') + '"><b>' + esc(x.n) + '</b><small>' + esc(x.st === 'gone' ? 'Not received: deleted after 30 days' : 'On its way from the server') + '</small></span>';
    }).join('') + '</div>';
  }
  /* on the client card: what waits on the server, and why */
  function cpWaitNote(p) {
    if (!CP) return '';   // drawn from the address before this file has run (42)
    var wn = CP.wait[p.id] || 0, bn = CP.bad[p.id] || 0, h = '';
    if (wn) {
      var wt = !p.dv ? 'They stay on the server until this project is kept in Google Drive, where their originals go.' : !dvOn() ? 'They stay on the server until Google Drive is connected on this device.' : 'They could not go to Google Drive yet. ScopeDue tries again every minute.';
      var wb = !p.dv && dvCan(p) ? '<button type="button" class="btn-primary btn-sm" data-pd="cp:keep">' + IC('folder') + 'Keep in Google Drive</button>' : p.dv && !dvOn() ? '<button type="button" class="btn-primary btn-sm" data-pd="cp:drive">Connect in Settings</button>' : '';
      h += '<div class="cp-wait" role="status"><p class="pd-note"><b>' + esc(wn === 1 ? '1 picture from the client is waiting.' : wn + ' pictures from the client are waiting.') + '</b> <span>' + esc(wt) + '</span> <span>' + esc('The server keeps them 30 days.') + '</span></p>' + wb + '</div>';
    }
    if (bn) h += '<div class="cp-wait cp-bad" role="status"><p class="pd-note"><b>' + esc(bn === 1 ? '1 picture from the client did not match its fingerprint.' : bn + ' pictures from the client did not match their fingerprints.') + '</b> <span>' + esc('It was not taken. Ask the client to send it again.') + '</span></p></div>';
    return h;
  }
  async function cpAct(act, a) {
    var p = pd.p; if (!p) return;
    if (act === 'drive') { stGo('drive'); return; }
    if (act === 'keep') { if (x8Role(p) !== 'Owner') { x8No(p); return; } a.disabled = true; await dvKeep(p); if (p.dv) await cpPull(); pdRerender(); }
  }
  if (sdTest()) window.__cp = { pull: function () { return cpPull(); }, state: function () { return JSON.parse(JSON.stringify({ wait: CP.wait, bad: CP.bad })); } };
