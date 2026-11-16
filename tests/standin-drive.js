// A stand-in Google Drive for the browser tests (CONTRACT.md 29.15). It answers googleapis.com for a Playwright context and keeps
// the rules the real Drive showed with two accounts (29.2):
//   - a file is visible to the account whose app made it, and to an account that picked it (drive.file);
//   - picking a folder does not make the files in it visible;
//   - writing needs the file's owner, or a writer permission on its folder;
//   - lastModifyingUser is the account that wrote last, set here, never by the caller;
//   - changes.list reports changes, after a start token, to files the account can see.
//   - a file is reached only while the account can access it: unsharing a folder takes its files away too;
// Tokens name accounts: drive.accounts = { tokenA: 'a@example.com', ... }. drive.pick(email, id) stands for the Picker.
module.exports = function standinDrive(accounts) {
  let seq = 1, change = 0;
  const files = {}, grants = {}, log = [], mails = [], revoked = [], calls = [];
  const D = { accounts: accounts || {}, files, grants, log, mails, revoked, calls, expired: {} };
  const now = () => new Date(Date.UTC(2026, 9, 17, 9, 0, 0) + seq * 1000).toISOString();
  const grant = (email, id) => { (grants[email] = grants[email] || new Set()).add(id); };
  /* access is the file's owner, or a permission on the file or a folder above it; a pick (drive.file) only lets the app reach what
     the account can already access: once a folder is unshared, its files are gone for that account too (404, as Drive answers) */
  const access = (email, f) => { for (let x = f, i = 0; x && i < 20; x = files[(x.parents || [])[0]], i++) { if (x.owner === email || (x.perms || []).some(p => p.email === email)) return true; } return false; };
  const sees = (email, f) => !!f && !f.trashed && !!(grants[email] && grants[email].has(f.id)) && access(email, f);
  const perm = (email, f) => { const p = f.parents && files[f.parents[0]]; return p ? (p.perms.find(x => x.email === email) || null) : null; };
  const canWrite = (email, f) => f.owner === email || (perm(email, f) || {}).role === 'writer';
  const canMakeIn = (email, pid) => { const p = files[pid]; return !!p && !p.trashed && (p.owner === email || !!p.perms.find(x => x.email === email && x.role === 'writer')); };
  const touch = (f, who) => { f.version++; f.modifiedTime = now(); f.lmu = who; change++; log.push({ n: change, id: f.id }); };
  const meta = f => ({ id: f.id, name: f.name, parents: f.parents, mimeType: f.mimeType, version: String(f.version), modifiedTime: f.modifiedTime, owners: [{ emailAddress: f.owner }], lastModifyingUser: { emailAddress: f.lmu }, appProperties: f.appProperties, trashed: !!f.trashed, parents: f.parents, webViewLink: 'https://drive.google.com/file/d/' + f.id + '/view' });
  const make = (email, o) => { const id = 'f' + (seq++).toString(36) + 'x' + Math.random().toString(36).slice(2, 8); const f = Object.assign({ id, version: 0, perms: [], parents: [], appProperties: {}, content: '', owner: email, trashed: false }, o); files[id] = f; grant(email, id); touch(f, email); return f; };
  D.pick = (email, id) => grant(email, id);
  D.byName = name => Object.values(files).filter(f => f.name === name);
  /* the whole stand-in Drive as JSON and back, for a long script that resumes from a checkpoint (tests/sample-saobac-vi.js) */
  const enc = v => Buffer.isBuffer(v) ? { b64: v.toString('base64') } : v, dec = v => v && typeof v === 'object' && v.b64 != null ? Buffer.from(v.b64, 'base64') : v;
  D.dump = () => JSON.stringify({ seq, change, files: Object.values(files).map(f => Object.assign({}, f, { content: enc(f.content) })), grants: Object.keys(grants).map(e => [e, [...grants[e]]]), log, revoked, expired: D.expired });
  D.load = s => {
    const o = JSON.parse(s); seq = o.seq; change = o.change;
    Object.keys(files).forEach(k => delete files[k]); o.files.forEach(f => { files[f.id] = Object.assign({}, f, { content: dec(f.content) }); });
    Object.keys(grants).forEach(k => delete grants[k]); o.grants.forEach(([e, ids]) => { grants[e] = new Set(ids); });
    log.length = 0; log.push(...o.log); revoked.length = 0; revoked.push(...o.revoked); Object.assign(D.expired, o.expired || {});
  };

  D.route = async (route) => {
    const req = route.request(), u = new URL(req.url()), path = u.pathname, m = req.method();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE', 'content-type': 'application/json' };
    const send = (s, j) => route.fulfill({ status: s, headers: H, body: j === undefined ? '' : (typeof j === 'string' ? j : JSON.stringify(j)) });
    const err = (s, msg, reason) => send(s, { error: { code: s, message: msg, errors: [{ reason: reason || 'x' }] } });
    if (m === 'OPTIONS') return send(204);
    if (u.host === 'oauth2.googleapis.com' && path === '/revoke') { revoked.push(u.searchParams.get('token')); return send(200, {}); }
    const tok = (req.headers()['authorization'] || '').replace(/^Bearer /, ''), me = D.accounts[tok];
    calls.push(m + ' ' + path + (u.search ? u.search.slice(0, 80) : ''));
    if (!me || D.expired[tok]) return err(401, 'Invalid Credentials', 'authError');
    const body = req.postData() || '';
    let mm;
    if (path === '/drive/v3/about') return send(200, { user: { emailAddress: me, displayName: me.split('@')[0] }, storageQuota: { limit: '16106127360', usage: String(1048576 * 42) } });
    if (path === '/drive/v3/changes/startPageToken') return send(200, { startPageToken: String(change) });
    if (path === '/drive/v3/changes') {
      const from = +u.searchParams.get('pageToken'), seen = {}, out = [];
      log.filter(x => x.n > from).forEach(x => { if (seen[x.id]) return; seen[x.id] = 1; const f = files[x.id]; if (f && (grants[me] || new Set()).has(f.id)) out.push({ fileId: f.id, removed: !!f.trashed, file: meta(f) }); });
      return send(200, { changes: out, newStartPageToken: String(change) });
    }
    if (path === '/drive/v3/files' && m === 'GET') {
      const q = u.searchParams.get('q') || '';
      let list = Object.values(files).filter(f => sees(me, f));
      if ((mm = q.match(/'([^']+)' in parents/))) list = list.filter(f => f.parents.includes(mm[1]) || (mm[1] === 'root' && f.parents.length === 0));
      if ((mm = q.match(/name='([^']+)'/))) list = list.filter(f => f.name === mm[1]);
      if (/mimeType='application\/vnd\.google-apps\.folder'/.test(q)) list = list.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      if ((mm = q.match(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/))) list = list.filter(f => (f.appProperties || {})[mm[1]] === mm[2]);   // v73
      return send(200, { files: list.map(meta) });
    }
    if (path === '/drive/v3/files' && m === 'POST') {
      const o = JSON.parse(body || '{}'), parent = (o.parents || [])[0];
      if (parent && !canMakeIn(me, parent)) return err(404, 'File not found: ' + parent, 'notFound');
      const f = make(me, { name: o.name, mimeType: o.mimeType || 'application/octet-stream', parents: parent ? [parent] : [], appProperties: o.appProperties || {} });
      return send(200, meta(f));
    }
    if (path === '/upload/drive/v3/files' && m === 'POST') {
      if (D.slow) await new Promise(r => setTimeout(r, D.slow));   /* v85: a large file, for the upload progress and Stop */
      if (D.failUp && D.failUp()) return err(500, 'Backend Error', 'backendError');   /* v89: an upload that fails */
      const bd = (req.headers()['content-type'] || '').split('boundary=')[1], parts = body.split('--' + bd).filter(p => p.trim() && p.trim() !== '--');
      const o = JSON.parse(parts[0].split('\r\n\r\n').slice(1).join('\r\n\r\n')), content = parts[1].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
      const parent = (o.parents || [])[0];
      if (parent && !canMakeIn(me, parent)) return err(404, 'File not found: ' + parent, 'notFound');
      /* v89: the bytes as sent, for a picture (postData() is text) */
      const raw = (req.postDataBuffer() || Buffer.alloc(0)).toString('latin1'), rp = raw.split('--' + bd).filter(p => p.trim() && p.trim() !== '--');
      const bin = Buffer.from(rp[1].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''), 'latin1');
      const f = make(me, { name: o.name, mimeType: o.mimeType, parents: parent ? [parent] : [], appProperties: o.appProperties || {}, content, bin });
      return send(200, meta(f));
    }
    if ((mm = path.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/)) && m === 'PATCH') {
      const f = files[mm[1]]; if (!sees(me, f)) return err(404, 'File not found: ' + mm[1], 'notFound');
      if (!canWrite(me, f)) return err(403, 'The user does not have sufficient permissions for this file.', 'insufficientFilePermissions');
      f.content = body; touch(f, me); return send(200, meta(f));
    }
    if ((mm = path.match(/^\/drive\/v3\/files\/([^/]+)\/permissions$/))) {
      const f = files[mm[1]]; if (!sees(me, f)) return err(404, 'File not found', 'notFound');
      if (m === 'GET') return send(200, { permissions: [{ id: 'own', emailAddress: f.owner, role: 'owner' }].concat(f.perms.map(p => ({ id: p.id, emailAddress: p.email, role: p.role }))) });
      if (f.owner !== me) return err(403, 'Only the owner can share', 'forbidden');
      const o = JSON.parse(body || '{}'), p = { id: 'p' + (seq++), email: String(o.emailAddress).toLowerCase(), role: o.role };
      f.perms = f.perms.filter(x => x.email !== p.email).concat([p]);
      if (u.searchParams.get('sendNotificationEmail') === 'true') mails.push({ to: p.email, from: me, file: f.name, message: u.searchParams.get('emailMessage') || '' });
      return send(200, { id: p.id, role: p.role, emailAddress: p.email });
    }
    if ((mm = path.match(/^\/drive\/v3\/files\/([^/]+)\/permissions\/([^/]+)$/)) && m === 'DELETE') {
      const f = files[mm[1]]; if (!f || f.owner !== me) return err(403, 'forbidden', 'forbidden');
      f.perms = f.perms.filter(p => p.id !== mm[2]); return send(204);
    }
    if ((mm = path.match(/^\/drive\/v3\/files\/([^/]+)$/))) {
      const f = files[mm[1]]; if (!sees(me, f)) return err(404, 'File not found: ' + mm[1], 'notFound');
      if (m === 'GET') return u.searchParams.get('alt') === 'media' ? route.fulfill({ status: 200, headers: Object.assign({}, H, { 'content-type': 'application/octet-stream' }), body: f.content }) : send(200, meta(f));
      if (m === 'PATCH') { if (!canWrite(me, f)) return err(403, 'insufficient permissions', 'insufficientFilePermissions'); const o = JSON.parse(body || '{}'); if (o.name) f.name = o.name;
        /* v73: moved between folders (37.3): the new folder must be one this account can put files in */
        const ap = u.searchParams.get('addParents'), rp = u.searchParams.get('removeParents');
        if (ap) { if (!canMakeIn(me, ap)) return err(404, 'File not found: ' + ap, 'notFound'); f.parents = f.parents.filter(x => x !== rp).concat(f.parents.includes(ap) ? [] : [ap]); } if (o.trashed === true) { if (f.owner !== me) return err(403, 'insufficient permissions', 'insufficientFilePermissions'); f.trashed = true; Object.values(files).filter(x => x.parents.includes(f.id)).forEach(x => { x.trashed = true; touch(x, me); }); } touch(f, me); return send(200, meta(f)); }
      if (m === 'DELETE') { if (f.owner !== me) return err(403, 'insufficient permissions', 'insufficientFilePermissions'); f.trashed = true; touch(f, me); return send(204); }
    }
    return err(400, 'The stand-in Drive does not answer ' + m + ' ' + path, 'badRequest');
  };
  return D;
};
