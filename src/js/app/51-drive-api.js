  /* ---------- v69: Drive itself (CONTRACT.md 29.15): the calls and the file format the team on Drive stands on ----------
     Functions only, no top-level values: earlier files may call these before this file has run.
     Every call answers { ok: true, data } or { err, status }, never throws. A 401 asks for a new token once and tries again;
     a rate limit waits a moment and tries once more. Tokens come from drToken (46): in memory only. */
  function drvApi() { return 'https://www.googleapis.com/drive/v3'; }
  function drvUp() { return 'https://www.googleapis.com/upload/drive/v3'; }
  function drvFolderType() { return 'application/vnd.google-apps.folder'; }
  function drvQ(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function drvMetaFields() { return 'id,name,mimeType,version,modifiedTime,owners(emailAddress),lastModifyingUser(emailAddress),appProperties,trashed'; }
  function drvSleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* one request. raw: answer the body as text instead of JSON */
  async function drvReq(method, url, body, type, raw, interactive) {
    if (url.charAt(0) === '/') url = drvApi() + url;
    var payload = body;
    if (body != null && !type) payload = JSON.stringify(body);
    for (var tries = 0; tries < 3; tries++) {
      var t = await drToken(!!interactive);
      if (!t.token) { if (DR.st === 'on') { DR.st = 'again'; DR.msg = 'Sign in to Google again to keep using Drive.'; drSave(); drPaintAll(); } return { err: 'auth', status: 401 }; }
      var h = { Authorization: 'Bearer ' + t.token }, r, txt, j = null;
      if (body != null && !type) h['Content-Type'] = 'application/json';
      else if (type) h['Content-Type'] = type;
      try { r = await fetch(url, { method: method, headers: h, body: payload == null ? undefined : payload }); } catch (e) { return { err: 'net', status: 0 }; }
      txt = await r.text();
      if (r.ok) { if (raw) return { ok: true, data: txt }; try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = {}; } return { ok: true, data: j }; }
      try { j = JSON.parse(txt); } catch (e) { j = null; }
      var reason = (((j || {}).error || {}).errors || [{}])[0].reason || '', msg = ((j || {}).error || {}).message || ('HTTP ' + r.status);
      if (r.status === 401 && tries === 0) { drForget(); continue; }
      if ((r.status === 403 || r.status === 429) && /rateLimit/i.test(reason) && tries < 2) { await drvSleep(1500); continue; }
      return { err: msg, status: r.status, reason: reason };
    }
    return { err: 'auth', status: 401 };
  }

  /* ScopeDue/ at the top of the Drive: the one this app made (drive.file sees no other), or a new one */
  async function drvRoot() {
    var q = "name='ScopeDue' and mimeType='" + drvFolderType() + "' and 'root' in parents and trashed=false";
    var l = await drvReq('GET', '/files?q=' + encodeURIComponent(q) + '&fields=' + encodeURIComponent('files(id,name)') + '&pageSize=10');
    if (l.err) return l;
    if (l.data.files && l.data.files.length) return { ok: true, data: l.data.files[0] };
    return drvReq('POST', '/files?fields=id,name', { name: 'ScopeDue', mimeType: drvFolderType(), appProperties: { sd: 'root' } });
  }
  /* v115 (78): everything this app makes in Drive has writersCanShare off: only its owner shares it, so an Editor cannot share the
     team's folder or a file in it on with another account (Drive's own share dialog included), which would outlast their removal */
  async function drvFolder(name, parent) { return drvReq('POST', '/files?fields=id,name', { name: String(name).slice(0, 120), mimeType: drvFolderType(), parents: [parent], appProperties: { sd: 'project' }, writersCanShare: false }); }
  /* the same, for one made before v115 */
  async function drvNoShare(id) { return drvReq('PATCH', '/files/' + encodeURIComponent(id) + '?fields=id', { writersCanShare: false }); }
  async function drvRename(id, name) { return drvReq('PATCH', '/files/' + encodeURIComponent(id) + '?fields=id,name', { name: String(name).slice(0, 120) }); }
  /* a new file, made by this app, with its first content */
  async function drvCreate(name, parent, text, props) {
    var bd = 'sd' + x8Hex(x8Rand(8)), meta = { name: name, parents: [parent], mimeType: 'application/octet-stream', appProperties: props || {}, writersCanShare: false };
    var body = '--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + bd + '\r\nContent-Type: application/octet-stream\r\n\r\n' + text + '\r\n--' + bd + '--';
    return drvReq('POST', drvUp() + '/files?uploadType=multipart&fields=' + encodeURIComponent('id,name,version'), body, 'multipart/related; boundary=' + bd);
  }
  /* the same file, new content: a member's grant on it carries over (29.2) */
  async function drvRewrite(id, text) { return drvReq('PATCH', drvUp() + '/files/' + encodeURIComponent(id) + '?uploadType=media&fields=' + encodeURIComponent('id,name,version,modifiedTime'), text, 'application/octet-stream'); }
  async function drvMeta(id) { return drvReq('GET', '/files/' + encodeURIComponent(id) + '?fields=' + encodeURIComponent(drvMetaFields())); }
  async function drvText(id) { return drvReq('GET', '/files/' + encodeURIComponent(id) + '?alt=media', null, null, true); }
  async function drvList(folder) {
    var q = drvQ(folder) + ' in parents and trashed=false';
    return drvReq('GET', '/files?q=' + encodeURIComponent(q) + '&fields=' + encodeURIComponent('files(' + drvMetaFields() + ')') + '&pageSize=200');
  }
  /* v83 (38.13): a folder this app made, found by its tag, or null (nothing is made) */
  async function drvFind(parent, tag) {
    var q = drvQ(parent) + " in parents and mimeType='" + drvFolderType() + "' and appProperties has { key='sd' and value=" + drvQ(tag) + ' } and trashed=false';
    var l = await drvReq('GET', '/files?q=' + encodeURIComponent(q) + '&fields=' + encodeURIComponent('files(id,name)') + '&pageSize=10');
    return l.err ? l : { ok: true, data: (l.data.files || [])[0] || null };
  }
  async function drvParents(id) { var r = await drvReq('GET', '/files/' + encodeURIComponent(id) + '?fields=' + encodeURIComponent('id,parents')); return r.err ? r : { ok: true, data: r.data.parents || [] }; }
  /* a subfolder this app made, found by its tag (appProperties sd), or made now: e.g. <project>/Files */
  async function drvSub(parent, name, tag) {
    var q = drvQ(parent) + " in parents and mimeType='" + drvFolderType() + "' and appProperties has { key='sd' and value=" + drvQ(tag) + ' } and trashed=false';
    var l = await drvReq('GET', '/files?q=' + encodeURIComponent(q) + '&fields=' + encodeURIComponent('files(id,name)') + '&pageSize=10');
    if (l.err) return l;
    if (l.data.files && l.data.files.length) return { ok: true, data: l.data.files[0] };
    return drvReq('POST', '/files?fields=id,name', { name: name, mimeType: drvFolderType(), parents: [parent], appProperties: { sd: tag }, writersCanShare: false });
  }
  /* a file picked on this computer, as it is (not encrypted, so it opens in Drive): one request up to 5 MB, a resumable session above */
  function drvFileFields() { return 'id,name,mimeType,size,webViewLink'; }
  /* v85: one XMLHttpRequest, for its upload progress (fetch reports none): { ok, data } | { err, status } | { cancelled }.
     o.progress(loaded, total) as the bytes go; o.on(xhr) hands the request over, so the person can stop it */
  function drvXhr(method, url, headers, body, o) {
    return new Promise(function (res) {
      var x = new XMLHttpRequest(); x.open(method, url, true);
      Object.keys(headers).forEach(function (k) { x.setRequestHeader(k, headers[k]); });
      if (o && o.progress && x.upload) x.upload.onprogress = function (e) { if (e.lengthComputable) o.progress(e.loaded, e.total); };
      x.onload = function () {
        var j = null; try { j = x.responseText ? JSON.parse(x.responseText) : {}; } catch (e) { j = null; }
        res(x.status >= 200 && x.status < 300 ? { ok: true, data: j || {} } : { err: ((j || {}).error || {}).message || 'HTTP ' + x.status, status: x.status });
      };
      x.onerror = function () { res({ err: 'net', status: 0 }); };
      x.onabort = function () { res({ err: 'cancelled', status: 0, cancelled: true }); };
      if (o && o.on) o.on(x);
      x.send(body);
    });
  }
  /* a file picked on this computer, as it is: one request up to 5 MB, a resumable session above (37.3). v85: o.progress(bytes of
     the file sent) while it goes, o.on(xhr) to stop it; o.stop set by the caller before the request starts stops it too */
  async function drvUpload(file, parent, props, o) {
    var type = file.type || 'application/octet-stream', meta = { name: String(file.name || 'File').slice(0, 200), parents: [parent], mimeType: type, appProperties: props || {}, writersCanShare: false };
    var po = { progress: function (l, tot) { if (o && o.progress) o.progress(tot ? Math.round(l / tot * file.size) : l); }, on: function (x) { if (o && o.on) o.on(x); } };
    for (var tries = 0; tries < 2; tries++) {
      var t = await drToken(false); if (!t.token) return { err: 'auth', status: 401 };
      if (o && o.stop) return { err: 'cancelled', status: 0, cancelled: true };
      var r;
      if (file.size <= 5 * 1024 * 1024) {
        var bd = 'sd' + x8Hex(x8Rand(8));
        var body = new Blob(['--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + bd + '\r\nContent-Type: ' + type + '\r\n\r\n', file, '\r\n--' + bd + '--']);
        r = await drvXhr('POST', drvUp() + '/files?uploadType=multipart&fields=' + encodeURIComponent(drvFileFields()), { Authorization: 'Bearer ' + t.token, 'Content-Type': 'multipart/related; boundary=' + bd }, body, po);
      } else {
        var s;
        try { s = await fetch(drvUp() + '/files?uploadType=resumable&fields=' + encodeURIComponent(drvFileFields()), { method: 'POST', headers: { Authorization: 'Bearer ' + t.token, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(file.size) }, body: JSON.stringify(meta) }); } catch (e) { return { err: 'net', status: 0 }; }
        if (s.status === 401 && tries === 0) { drForget(); continue; }
        if (!s.ok || !s.headers.get('Location')) return { err: 'HTTP ' + s.status, status: s.status };
        if (o && o.stop) return { err: 'cancelled', status: 0, cancelled: true };
        r = await drvXhr('PUT', s.headers.get('Location'), { 'Content-Type': type }, file, po);
      }
      if (r.status === 401 && tries === 0) { drForget(); continue; }
      if ((r.status === 403 || r.status === 429) && tries === 0 && /rate/i.test(r.err || '')) { await drvSleep(1500); continue; }
      return r;
    }
    return { err: 'auth', status: 401 };
  }
  /* v73 (37.3): one file shared with one person, no email; and a file moved between folders */
  async function drvShareQuiet(id, email) {
    var e = String(email).trim().toLowerCase();
    return drvReq('POST', '/files/' + encodeURIComponent(id) + '/permissions?sendNotificationEmail=false&fields=id,role,emailAddress', { type: 'user', role: 'reader', emailAddress: e });
  }
  async function drvMove(id, to, from) { return drvReq('PATCH', '/files/' + encodeURIComponent(id) + '?addParents=' + encodeURIComponent(to) + (from ? '&removeParents=' + encodeURIComponent(from) : '') + '&fields=' + encodeURIComponent('id,parents'), {}); }
  async function drvDelete(id) { return drvReq('DELETE', '/files/' + encodeURIComponent(id)); }
  /* to the Drive trash, where its owner can take it back for 30 days (files.delete would skip the trash) */
  async function drvTrash(id) { return drvReq('PATCH', '/files/' + encodeURIComponent(id) + '?fields=id,trashed', { trashed: true }); }
  /* changes since a token: { changes: [{ id, removed, file }], next } (next is the token to keep) */
  async function drvStart() { var r = await drvReq('GET', '/changes/startPageToken'); return r.err ? r : { ok: true, data: r.data.startPageToken }; }
  async function drvChanges(token) {
    var all = [], tok = token, f = 'nextPageToken,newStartPageToken,changes(fileId,removed,file(' + drvMetaFields() + '))';
    for (var i = 0; i < 20 && tok; i++) {
      var r = await drvReq('GET', '/changes?pageToken=' + encodeURIComponent(tok) + '&pageSize=200&includeRemoved=true&fields=' + encodeURIComponent(f));
      if (r.err) return r;
      (r.data.changes || []).forEach(function (c) { all.push({ id: c.fileId, removed: !!c.removed, file: c.file || null }); });
      if (r.data.newStartPageToken) return { ok: true, data: { changes: all, next: r.data.newStartPageToken } };
      tok = r.data.nextPageToken;
    }
    return { ok: true, data: { changes: all, next: tok || token } };
  }
  /* Permissions are eventually consistent in the real Drive API. Keep the read-back in one place so a
     successful POST is not mistaken for an invitation that Google has actually installed. */
  async function drvPerms(id, interactive) {
    return drvReq('GET', '/files/' + encodeURIComponent(id) + '/permissions?supportsAllDrives=true&fields=' + encodeURIComponent('permissions(id,type,emailAddress,role)'), null, null, false, interactive);
  }
  function drvPermFor(data, email) {
    var e = String(email).trim().toLowerCase();
    return ((data && data.permissions) || []).filter(function (x) { return x && String(x.emailAddress || '').toLowerCase() === e && (!x.type || x.type === 'user') && x.role !== 'owner'; })[0] || null;
  }
  async function drvPermissionReadback(id, email, wanted, interactive) {
    var last = null;
    for (var i = 0; i < 4; i++) {
      last = await drvPerms(id, interactive);
      if (last.err) return last;
      var p = drvPermFor(last.data, email);
      if (p && p.role === wanted) return { ok: true, data: p };
      if (i < 3) await drvSleep(500 * (i + 1));
    }
    return { err: 'Google Drive did not confirm access for ' + String(email).trim().toLowerCase() + '.', status: 409, reason: 'permissionReadback' };
  }
  /* share a folder with one person; Google sends its own email with the message (29.8). role: writer | reader.
     force is used only by the explicit Resend invite action, before a member has joined. */
  async function drvShare(id, email, role, message, force, interactive) {
    var e = String(email).trim().toLowerCase(), wanted = role === 'reader' ? 'reader' : 'writer', l = await drvPerms(id, interactive);
    if (l.err) return l;
    var p = drvPermFor(l.data, e);
    if (p && force) {
      var gone = await drvReq('DELETE', '/files/' + encodeURIComponent(id) + '/permissions/' + encodeURIComponent(p.id) + '?supportsAllDrives=true', null, null, false, interactive);
      if (gone.err) return gone;
      p = null;
    }
    if (p) {
      if (p.role === wanted) return { ok: true, data: p, existing: true };
      var up = await drvReq('PATCH', '/files/' + encodeURIComponent(id) + '/permissions/' + encodeURIComponent(p.id) + '?supportsAllDrives=true&fields=id,role,emailAddress', { role: wanted }, null, false, interactive);
      if (up.err) return up;
      return drvPermissionReadback(id, e, wanted, interactive);
    }
    var q = '?supportsAllDrives=true&sendNotificationEmail=true&fields=id,role,emailAddress' + (message ? '&emailMessage=' + encodeURIComponent(String(message).slice(0, 900)) : '');
    var made = await drvReq('POST', '/files/' + encodeURIComponent(id) + '/permissions' + q, { type: 'user', role: wanted, emailAddress: e }, null, false, interactive);
    if (made.err) return made;
    return drvPermissionReadback(id, e, wanted, interactive);
  }
  async function drvUnshare(id, email) {
    var l = await drvPerms(id);
    if (l.err) return l;
    var e = String(email).trim().toLowerCase(), p = drvPermFor(l.data, e);
    if (!p) return { ok: true, data: { gone: true } };
    return drvReq('DELETE', '/files/' + encodeURIComponent(id) + '/permissions/' + encodeURIComponent(p.id) + '?supportsAllDrives=true');
  }

  /* ---------- the file format (29.3): one file per person per project ----------
     { f: "sdteam", v: 1, pid, rev, who, gen, w, on, devs, wrapped, body }: w is this write's id, on the one it was built on (29.5). body is the writer's copy of the project, sealed as team sync seals
     a snapshot, with the writer inside the AAD so a body cannot be moved into someone else's file */
  function sdtAad(pid, gen, who) { return 'sd|' + pid + '|' + gen + '|' + String(who).toLowerCase(); }
  async function sdtSeal(K, pid, gen, who, obj) {
    var iv = x8Rand(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: x8Utf(sdtAad(pid, gen, who)) }, K, await x8Zip(x8S(obj)));
    return { g: gen, iv: x8B64(iv), ct: x8B64(ct) };
  }
  async function sdtOpen(K, pid, who, body) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: x8Unb64(body.iv), additionalData: x8Utf(sdtAad(pid, body.g, who)) }, K, x8Unb64(body.ct));
    return JSON.parse(await x8Unzip(new Uint8Array(pt)));
  }
  function sdtFile(o) {
    var f = { f: 'sdteam', v: 1, pid: o.pid, rev: o.rev || 0, who: String(o.who || '').toLowerCase(), gen: o.gen || 0, w: o.w || '', on: o.on || '', nm: String(o.nm || '').slice(0, 80), devs: o.devs || [], wrapped: o.wrapped || {}, body: o.body || null };
    /* v72: the Owner's file, when something is hidden from Editors: the whole project, and its key for the Owner's devices only */
    if (o.pbody) f.pbody = o.pbody;
    if (o.owr && Object.keys(o.owr).length) f.owr = o.owr;
    /* v81 (38.11): the Owner's file names each member's file by its id, keyed by its file name (a hash, no address), so a member
       can confirm the file of someone who joined later by id */
    if (o.ids && Object.keys(o.ids).length) f.ids = o.ids;
    return JSON.stringify(f);
  }
  /* a file's text, checked for shape; null when it is not a ScopeDue team file */
  function sdtParse(text) {
    var o; try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || o.f !== 'sdteam' || o.v !== 1 || typeof o.pid !== 'string' || typeof o.who !== 'string') return null;
    if (typeof o.rev !== 'number' || typeof o.gen !== 'number' || !Array.isArray(o.devs) || typeof o.wrapped !== 'object' || o.wrapped === null) return null;
    if (o.body !== null && !(o.body && typeof o.body.g === 'number' && typeof o.body.iv === 'string' && typeof o.body.ct === 'string')) return null;
    if (!(o.pbody && typeof o.pbody.g === 'number' && typeof o.pbody.iv === 'string' && typeof o.pbody.ct === 'string')) o.pbody = null;
    if (!o.owr || typeof o.owr !== 'object' || Array.isArray(o.owr)) o.owr = {};
    o.w = typeof o.w === 'string' ? o.w.slice(0, 40) : ''; o.on = typeof o.on === 'string' ? o.on.slice(0, 40) : '';
    o.nm = typeof o.nm === 'string' ? o.nm.slice(0, 80) : '';
    var ids = {}; if (o.ids && typeof o.ids === 'object' && !Array.isArray(o.ids)) Object.keys(o.ids).slice(0, 60).forEach(function (k) { if (/^m-[0-9a-f]{8}\.sdteam$/.test(k) && typeof o.ids[k] === 'string' && /^[\w-]{6,80}$/.test(o.ids[k])) ids[k] = o.ids[k]; });
    o.ids = ids;
    o.devs = o.devs.filter(function (d) { return d && /^[a-f0-9]{16,32}$/.test(d.kid || '') && d.pub && typeof d.pub.x === 'string' && typeof d.pub.y === 'string'; });
    return o;
  }
  /* the member's file name: no name or email in it (29.3) */
  async function sdtSlotName(email) { var h = new Uint8Array(await crypto.subtle.digest('SHA-256', x8Utf(String(email).trim().toLowerCase()))); return 'm-' + x8Hex(h).slice(0, 8) + '.sdteam'; }

  /* ?test: the calls and the format, for the stand-in Drive of the browser tests (29.15) */
  if (sdTest() && window.__drv) {
    window.__drv.api = { root: drvRoot, folder: drvFolder, create: drvCreate, rewrite: drvRewrite, meta: drvMeta, text: drvText, list: drvList, start: drvStart, changes: drvChanges, share: drvShare, unshare: drvUnshare, rename: drvRename, del: drvDelete, trash: drvTrash };
    window.__drv.fmt = { seal: sdtSeal, open: sdtOpen, file: sdtFile, parse: sdtParse, slot: sdtSlotName, key: function () { return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); } };
  }
