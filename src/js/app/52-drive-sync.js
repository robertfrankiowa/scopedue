  /* ---------- v69: one person's devices on Drive (CONTRACT.md 29.16) ----------
     A private project kept in its Owner's Drive as ScopeDue/<name>/owner.sdteam, read and written by that person's devices.
     Functions only, no top-level values: other files draw with these before this one has run. dvS() holds the state.
     Each device keeps, in IndexedDB (the store of the device key): dv:<pid> { w, base, prevW, prevBase, mine, ver, rev, head },
     dvk:<pid> { gen: key }, dv:tok (the account's changes token) and dv:wait (projects asked for here, waiting for their key). */
  var DV0;
  function dvS() { return DV0 || (DV0 = { q: Promise.resolve(), busy: false, last: 0, msg: '', recs: {}, keys: {}, found: null, said: [], changed: false, again: false, ask: '' }); }
  /* one address per person (29.13, decision 5): the Drive account, or the ScopeDue one, which has to be the same */
  /* DR (46-google-drive) is set after the first draw: a project page opened by a reload draws before it, so read it guarded */
  function dvMe() { return String((typeof DR !== 'undefined' && DR && DR.email) || drSyEmail() || '').toLowerCase(); }
  function dvOn() { return typeof DR !== 'undefined' && !!DR && DR.st === 'on' && !DR.proto && drReady(); }
  /* v88 (29.21): private and client projects alike; a client project's portal stays on the server (32, 38.6) */
  function dvKind(p) { return !!p && (p.kind === 'private' || p.kind === 'client'); }
  function dvCan(p) { return dvKind(p) && !p.x8 && x8Role(p) === 'Owner'; }
  function dvWid() { return x8Hex(x8Rand(8)); }
  function dvAad(pid, gen, kid) { return pid + '|' + gen + '|' + kid; }
  function dvFolderUrl(fid) { return 'https://drive.google.com/drive/folders/' + encodeURIComponent(fid); }
  async function dvRec(pid) { var S = dvS(); if (!S.recs[pid]) S.recs[pid] = (await x8Get('dv:' + pid)) || { pid: pid, w: '', base: '', prevW: '', prevBase: '', mine: false, ver: 0, rev: 0, head: null }; return S.recs[pid]; }
  async function dvSaveRec(r) { dvS().recs[r.pid] = r; await x8Put('dv:' + r.pid, r); }
  async function dvKeys(pid) { var S = dvS(); if (!S.keys[pid]) S.keys[pid] = (await x8Get('dvk:' + pid)) || {}; return S.keys[pid]; }
  async function dvSaveKey(pid, gen, K) { var k = await dvKeys(pid); k[gen] = K; await x8Put('dvk:' + pid, k); }
  async function dvWait() { return (await x8Get('dv:wait')) || []; }
  /* the devices in a file joined with the ones known here: a kid keeps the key it was first seen with */
  function dvJoin(head, o) {
    var hg = (head && head.gen) || 0, og = o.gen || 0;
    var h = { devs: ((head && head.devs) || []).slice(), wrapped: og > hg ? {} : Object.assign({}, (head && head.wrapped) || {}), gen: Math.max(hg, og), owr: Object.assign({}, (head && head.owr) || {}, o.owr || {}) };
    (o.devs || []).forEach(function (d) { if (!h.devs.some(function (x) { return x.kid === d.kid; })) h.devs.push({ kid: d.kid, pub: { kty: 'EC', crv: 'P-256', x: d.pub.x, y: d.pub.y } }); });
    /* wraps belong to a generation: an older file's wraps never come back after a rotation (29.18) */
    if (og === h.gen) Object.keys(o.wrapped || {}).forEach(function (k) { if (!h.wrapped[k]) h.wrapped[k] = o.wrapped[k]; });
    return h;
  }
  async function dvKeyFor(pid, gen, o) { return (await dvKeyFile(pid, gen, o)).K; }
  /* v115 (79): the Owner's file is the word on the key of its own generation. Two devices of the Owner's that turned the key at the
     same time made two keys for one number; the file holds the one written last, wrapped for this device, and this device takes it
     (changed: it held the other one). Without a wrap here, the key kept here, as before */
  async function dvKeyFile(pid, gen, o) {
    var keys = await dvKeys(pid), dev = await x8Dev(), w = o && o.gen === gen && o.wrapped && o.wrapped[dev.kid], K;
    if (!w) return { K: keys[gen] || null, changed: false };
    try { K = await x8Unwrap(w, dvAad(pid, gen, dev.kid)); } catch (e) { return { K: keys[gen] || null, changed: false }; }
    var raw = async function (k) { return x8B64(new Uint8Array(await crypto.subtle.exportKey('raw', k))); };
    var old = keys[gen], changed = !!old && (await raw(old)) !== (await raw(K));
    if (!old || changed) await dvSaveKey(pid, gen, K);
    return { K: K, changed: changed };
  }

  /* ---- keep a project in Drive ---- */
  async function dvKeep(p, moving) {
    if (sdSample(p)) { sdSampleNo(); return; }   /* v125 (99): a sample never goes to Drive */
    var can = moving ? dvKind(p) && x8Role(p) === 'Owner' : dvCan(p);   /* moving: a project still on team sync (29.19) */
    if (!can || p.dv) return;
    if (!dvOn()) { await drRefresh(true); if (!dvOn()) return; }
    var S = dvS(); if (S.busy) { showToast('Google Drive is busy. Try again in a moment.'); return; }
    S.busy = true; dvPaint(p);
    try {
      var me = dvMe(), dev = await x8Dev(); S.kid = dev.kid;
      if (!(await x8Get('dv:tok'))) { var st = await drvStart(); if (st.ok) await x8Put('dv:tok', st.data); }
      var root = await drvRoot(); if (root.err) throw new Error(root.err);
      var pid = x8Hex(x8Rand(12)), K = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      /* v83 (38.13): ScopeDue/<project>/ is the Owner's alone; Team/ in it is the one folder shared with the team, Private/ is not */
      var pr = await drvSub(root.data.id, p.n, 'proot-' + pid); if (pr.err) throw new Error(pr.err);
      var fo = await drvFolder(dvTeamName(p.n), pr.data.id); if (fo.err) throw new Error(fo.err);
      var pv = await drvSub(pr.data.id, 'Private', 'priv-' + pid);
      p.dv = { fid: fo.data.id, root: pr.data.id, prv: pv.ok ? pv.data.id : '', tn: p.n, oid: '', pid: pid, gen: 1, owner: me, last: 0, st: 'ok', msg: '', name: p.n };
      var note = pdNote(p, 'You keep this project in Google Drive'); pdTouch(p);
      var out = x8Out(p), w = dvWid(), wrapped = {}; wrapped[dev.kid] = await x8Wrap(K, dev.pub, dvAad(pid, 1, dev.kid));
      var head = { devs: [{ kid: dev.kid, pub: dev.pub }], wrapped: wrapped, gen: 1 };
      var f = await drvCreate('owner.sdteam', fo.data.id, sdtFile({ pid: pid, rev: 1, who: me, gen: 1, w: w, on: '', devs: head.devs, wrapped: wrapped, body: await sdtSeal(K, pid, 1, me, out) }), { sd: 'team', v: '1' });
      if (f.err) { pdUnnote(p, note); p.dv = null; throw new Error(f.err); }
      p.dv.oid = f.data.id; p.dv.last = Date.now();
      await dvSaveKey(pid, 1, K);
      await dvSaveRec({ pid: pid, w: w, base: x8S(out), prevW: '', prevBase: '', mine: true, ver: +f.data.version || 1, rev: 1, head: head });
      showToast('Kept in your Google Drive: ScopeDue / ' + p.n);
    } catch (e) { if (p.dv && !p.dv.oid) p.dv = null; showToast('Could not keep it in Google Drive. ' + (e && e.message || '')); }
    S.busy = false; await SDB.save(); dvMenu(p); x8Paint(p);
  }
  /* the project menu offers Keep in Google Drive only while it is not kept */
  function dvMenu(p) { if (pd.p === p) pdMenu.innerHTML = pdMenuHTML(p); }
  /* stop: the folder goes to the Drive trash; every device keeps its copy, no longer synced */
  async function dvStop(p) {
    var d = p.dv; if (!d) return;
    var t = await drvTrash(d.fid);
    if (t.err && t.status !== 404) { showToast('Could not move the folder to the Drive trash. ' + t.err); return; }
    /* v83: Team/ goes to the trash; the project's folder too, unless Private/ holds files of the Owner's, which stay where they are */
    if (d.root) { var pl = d.prv ? await drvList(d.prv) : { ok: true, data: { files: [] } }; if (pl.ok && !(pl.data.files || []).length) await drvTrash(d.root); }
    await x8Del('dv:' + d.pid); await x8Del('dvk:' + d.pid); delete dvS().recs[d.pid]; delete dvS().keys[d.pid];
    tiWithdraw(d.fid);   /* v76: the invitations on the server go with it (38) */
    p.dv = null; pdNote(p, 'You stopped keeping this project in Google Drive'); pdTouch(p);
    await SDB.save(); dvMenu(p); x8Paint(p); showToast('Not kept in Drive any more. The folder is in your Drive trash; this copy stays here.');
  }

  /* ---- one project, one round (29.16, with people from 29.17) ----
     1. the other people's files: the Owner reads each member's, a member reads the Owner's and the members' it picked. Drive must
        name the file's own address as its last writer; the Owner's body is taken as it is, a member's filtered by their role;
     2. this person's own file: the w / on ids for their own devices, and on the Owner's the project key wrapped for every device */
  /* v83 (38.13): a project kept before v83 has its shared folder straight under ScopeDue/. On the Owner's devices it moves into a new
     ScopeDue/<project>/ as Team, keeping its id (every share, team file, invitation and link stays as it is), and the project's
     private folder (ScopeDue/<project> · private) moves in as Private. Found by tags, so another device of the Owner's (dv is per
     device) finds the same folders and moves nothing twice */
  /* v84: the folder shared with the team is named after the project, so a member who is on several projects tells them apart in
     Google's sharing email and in Drive's Shared with me */
  function dvTeamName(n) { return ('Team · ' + String(n || '')).slice(0, 120); }
  /* v84: Team · <project> follows the project's name, every round (not only when the project changed); a folder made by v83 as
     plain "Team" is renamed once */
  async function dvTeamTn(p) { var d = p.dv; if (!d.root || d.tn === p.n) return; var rt = await drvRename(d.fid, dvTeamName(p.n)); if (rt.ok) { d.tn = p.n; dvS().changed = true; } }
  async function dvLayout(p) {
    var d = p.dv; if (!d || d.root || dvRole(p) !== 'Owner') return;
    var root = await drvRoot(); if (root.err) return;
    var pr = await drvSub(root.data.id, d.name || p.n, 'proot-' + d.pid); if (pr.err) return;
    var par = await drvParents(d.fid); if (par.err) return;
    if (par.data.indexOf(pr.data.id) < 0) { var mv = await drvMove(d.fid, pr.data.id, par.data.join(',')); if (mv.err) return; }
    await drvRename(d.fid, dvTeamName(d.name || p.n)); d.tn = d.name || p.n;
    var pv = await drvFind(pr.data.id, 'priv-' + d.pid); if (pv.err) return;
    if (!pv.data) {
      var old = await drvFind(root.data.id, 'priv-' + d.pid); if (old.err) return;
      if (old.data) { var m2 = await drvMove(old.data.id, pr.data.id, root.data.id); if (m2.err) return; await drvRename(old.data.id, 'Private'); pv = { ok: true, data: { id: old.data.id } }; }
      else pv = await drvSub(pr.data.id, 'Private', 'priv-' + d.pid);
    }
    if (pv.err) return;
    d.root = pr.data.id; d.prv = d.fpid = pv.data.id; dvS().changed = true;
    pdNote(p, 'Its Google Drive folder now holds Team, shared with the team, and Private, for you alone');
  }
  function dvRole(p) { return (p.dv && p.dv.role) || 'Owner'; }
  /* v87 (37.3): on the device of the person who added a file the Owner removed: it is deleted from their Drive, once (rec.fdone) */
  async function dvFdel(p, rec) {
    var me = dvMe(), done = rec.fdone = rec.fdone || [], ch = false;
    var mine = (p.fdel || []).filter(function (f) { return f && f.by === me && done.indexOf(f.id) < 0; });
    for (var i = 0; i < mine.length; i++) {
      var r = await drvDelete(mine[i].id); if (r.err && r.status !== 404) continue;
      done.push(mine[i].id); ch = true;
      pdNote(p, (p.dv.oname || p.dv.owner || 'The owner') + ' removed your file “' + prvT(mine[i].t, 40) + '”; it was deleted from your Google Drive');
    }
    if (ch) { if (done.length > 400) rec.fdone = done.slice(-400); await dvSaveRec(rec); pdTouch(p); dvS().changed = true; }
  }
  function dvMine(p) { return p.dv.mine || p.dv.oid; }
  /* a member's copy leaves the team out: the Owner's team is the one that counts (team sync did the same, 22.4) */
  function dvNoTeam(o) { var c = x8Clone(o); if (c) delete c.team; return c; }
  /* the room's marker (29.19) is never written to Drive */
  function dvLocal(p) { var o = x8Out(p); delete o._moved; return dvRole(p) === 'Owner' ? o : dvNoTeam(o); }

  /* ---- what Editors see (v72): the Owner hides tabs (eh) and single items (oo: 1); what is hidden never reaches their devices ----
     On Drive the Owner's file then carries two bodies: body, the Editors' copy, sealed with the project key; pbody, the whole
     project, sealed with a key only the Owner's devices hold (owr). On team sync each version of the Owner's carries the whole
     project beside it the same way (blob.o, 25-team-sync). With nothing hidden there is one copy, as before.
     A tab kept from Editors empties these fields in their copy (pv.x: a private project's, the rest a client project's) */
  function dvEh() { return { market: ['pv.src', 'pv.comps', 'pv.wedge', 'pv.asm', 'pv.vd', 'pv.vlog', 'pv.imp', 'pv.ret', 'pv.channels', 'pv.kpre'], decisions: ['pv.dec', 'pv.princ'], change: ['crs'], evidence: ['evd'], delivery: ['mev'], history: [], feedback: [] }; }
  /* each field of the tabs h keeps: f(object holding it, its key, its blank value) */
  function dvEhEach(h, o, f) {
    var blank = prvBlank();
    /* v119 (87): an internal project's sources and open questions are on Decisions, so hiding Decisions hides them too (Validate hidden before stays hidden) */
    if (h.decisions && o && o.kind === 'private' && pdMode(o) === 'internal') h = Object.assign({}, h, { market: 1 });
    Object.keys(dvEh()).forEach(function (t) {
      if (h[t]) dvEh()[t].forEach(function (path) { var k = path.replace(/^pv\./, ''), at = path === k ? o : o.pv; if (at && k in at) f(at, k, path === k ? [] : k in blank ? blank[k] : Array.isArray(at[k]) ? [] : null); });
    });
  }
  /* an item only the Owner sees; one given to someone else stays in their copy, or they could not do it */
  function dvOO(x, me) { return x8IsObj(x) && x.oo === 1 && !(x.as && x.as !== me && x.as !== 'You'); }
  function dvStrip(v, me) {
    if (Array.isArray(v)) return v.filter(function (x) { return !dvOO(x, me); }).map(function (x) { return dvStrip(x, me); });
    if (x8IsObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { if (!dvOO(v[k], me)) o[k] = dvStrip(v[k], me); }); return o; }
    return v;
  }
  /* the Editors' copy of the Owner's whole project */
  /* v121 (CONTRACT.md 91): what team sync's nudges did (22), for a project kept in Drive: after this device writes, what its person
     did that is someone else's to act on is emailed to them (POST /v1/dvnudge; the server checks they share the project by its
     invitations, names who and the project, never the work). Only what this person did: the Owner gives work, sends it back or
     approves it; whoever has the work hands it over, sends it for review or says they wait on someone. Compared with what this device
     had at its last write (rec.nu), so the first write after the app opens only takes note */
  function dvAddrOf(p, who, me) {
    if (!who) return ''; if (who === 'You') return me;
    var w = String(who).toLowerCase(), m = (p.team || []).filter(function (x) { return x && (x.n === who || String(x.e || '').toLowerCase() === w); })[0];
    return m && m.e ? String(m.e).toLowerCase() : w.indexOf('@') > 0 ? w : '';
  }
  function dvNudgeSnap(p, me) {
    var o = {};
    wkUnits(p).forEach(function (u) { o[u.id] = { as: dvAddrOf(p, u.as, me), st: u.st, ho: (u.ho || []).length, by: u.by && u.by.k === 'p' ? dvAddrOf(p, u.by.ref, me) : '', rb: u.rb ? u.rb.ts || 1 : 0, ap: u.ap ? u.ap.ts || 1 : 0 }; });
    return o;
  }
  function dvNudges(p, d, rec, me, role) {
    var now, was = rec.nu, own = role === 'Owner', owner = String(d.owner || '').toLowerCase(), sent = {};
    try { now = dvNudgeSnap(p, me); } catch (e) { return; }
    rec.nu = now;
    if (!was || !d.fid || !me || role === 'Viewer' || !(p.team || []).length) return;
    var send = function (to, kind) { if (!to || to === me || sent[to + kind]) return; sent[to + kind] = 1; try { syCall('POST', '/v1/dvnudge', { fid: d.fid, to: to, kind: kind, project: String(p.n || '').slice(0, 80) }); } catch (e) {} };
    Object.keys(now).forEach(function (id) {
      var x = now[id], y = was[id] || {};
      if (x.as && x.as !== y.as && x.as !== me) { if (y.as === me && x.ho > (y.ho || 0)) send(x.as, 'handover'); else if (own) send(x.as, 'assigned'); }
      if (x.st === 'review' && y.st !== 'review' && x.as === me && !own) send(owner, 'review');
      if (x.by && x.by !== y.by && x.as === me) send(x.by, 'waiting');
      if (own && x.as && x.rb && x.rb !== y.rb) send(x.as, 'back');
      if (own && x.as && x.ap && !y.ap) send(x.as, 'approved');
    });
  }
  /* v121 (91): the Owner's device took what Viewers sent: the Editors hear of it too (they read it from the Owner's file) */
  function dvTellEditors(p) {
    if (!p || !p.dv || !p.dv.fid || x8Role(p) !== 'Owner' || !SY.key) return;
    (p.team || []).filter(function (m) { return m && m.role === 'Editor' && m.e; }).forEach(function (m) { try { syCall('POST', '/v1/dvnudge', { fid: p.dv.fid, to: String(m.e).toLowerCase(), kind: 'feedback', project: String(p.n || '').slice(0, 80) }); } catch (e) {} });
  }
  function dvView(o, me) {
    var v = dvStrip(o, me), h = o.eh || {};
    dvEhEach(h, v, function (at, k, b) { at[k] = x8Clone(b); });
    if (h.history) v.log = [];
    if (h.feedback) delete v.fb;
    return v;
  }
  /* what is hidden goes back where it was: v is worked out in the Editors' copy, full is the Owner's project before it */
  function dvBack(v, full, me) {
    if (Array.isArray(v) && Array.isArray(full)) {
      var out = v.map(function (x) { var f = x8IsObj(x) && x.id != null ? full.filter(function (y) { return x8IsObj(y) && y.id === x.id; })[0] : null; return f ? dvBack(x, f, me) : x; });
      full.forEach(function (y, i) { if (dvOO(y, me)) out.splice(Math.min(i, out.length), 0, y); });
      return out;
    }
    if (x8IsObj(v) && x8IsObj(full)) {
      var o = {}; Object.keys(v).forEach(function (k) { o[k] = k in full ? dvBack(v[k], full[k], me) : v[k]; });
      Object.keys(full).forEach(function (k) { if (!(k in v) && dvOO(full[k], me)) o[k] = full[k]; });
      return o;
    }
    return v;
  }
  function dvUnview(v, full, me) {
    var r = dvBack(v, full, me), h = full.eh || {};
    dvEhEach(h, full, function (at, k) { var to = at === full ? r : r.pv; if (to) to[k] = x8Clone(at[k]); });
    if (h.history) r.log = x8Merge([], full.log || [], v.log || [], 'log');   /* what Editors did is kept with what they never saw */
    if (h.feedback) { if ('fb' in full) r.fb = x8Clone(full.fb); else delete r.fb; }
    return r;
  }
  /* anything hidden from Editors in this copy */
  function dvHides(o, me) { return x8S(dvView(o, me)) !== x8S(o); }
  /* the Owner's own key (29.18 does not rotate it: Editors never had it) */
  async function dvOKey(pid, o, make) {
    var keys = await dvKeys(pid), dev = await x8Dev();
    if (keys.o) return keys.o;
    var w = o && o.owr && o.owr[dev.kid];
    if (w) { try { var K = await x8Unwrap(w, dvAad(pid, 'o', dev.kid)); await dvSaveKey(pid, 'o', K); return K; } catch (e) {} }
    if (!make) return null;
    var K2 = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); await dvSaveKey(pid, 'o', K2); return K2;
  }
  /* on a member's device, the team is the Owner's list without this person, and the Owner with them */
  function dvTeamFor(p, team) {
    var me = dvMe(), out = (team || []).filter(function (m) { return m && m.e && String(m.e).toLowerCase() !== me; }).map(function (m, i) { return { n: m.n || m.e.split('@')[0], e: m.e, role: m.role === 'Viewer' ? 'Viewer' : 'Editor', c: m.c || X8_COL[i % X8_COL.length], seen: '' }; });
    if (p.dv && p.dv.owner) out.unshift({ n: p.dv.oname || p.dv.owner.split('@')[0], e: p.dv.owner, role: 'Owner', c: X8_COL[0], seen: '' });
    return out;
  }
  function dvInMember(p, rec, v) {
    var w = x8Clone(v), cl = w._client; w.team = dvTeamFor(p, rec.oteam);   /* the team is in place before x8In works the project out again */
    x8In(p, w, null);
    dvClientIn(p, cl);
    p.team = dvTeamFor(p, rec.oteam);
    /* v72: Activity kept from Editors: what arrived before goes too; only their own lines stay (the log is otherwise only ever added to) */
    if (p.eh && p.eh.history) p.log = (p.log || []).filter(function (e) { return e && e.w === 'you'; });
    var mine = (rec.oteam || []).filter(function (m) { return String(m.e || '').toLowerCase() === dvMe(); })[0];
    p.dv.role = mine && mine.role === 'Editor' ? 'Editor' : 'Viewer';
  }
  /* v88 (29.21): a client project's client, as its Owner keeps it (x8Out's _client), kept on a member's device under its own id; the
     Owner's id goes back out unchanged (dv.cid0), so nothing looks changed to the Owner. On another device of the Owner's that has
     no client for it yet, the Owner's own id is used */
  function dvClientIn(p, cl) {
    if (p.kind !== 'client' || !p.dv) return;
    if (dvRole(p) === 'Owner') { if (cl && cl.id && !byId(p.cid || cl.id)) { var co = x8Clone(cl); co.id = p.cid || co.id; CLIENTS.push(co); p.cid = co.id; } return; }
    if (cl && cl.id) {
      var c = x8Clone(cl); p.dv.cid0 = c.id;
      c.id = 'dv-' + String(p.dv.pid).slice(0, 10) + '-' + c.id; c.dv = 1;
      var cur = byId(c.id);
      if (cur && cur.dv) Object.keys(c).forEach(function (q) { cur[q] = c[q]; }); else if (!cur) CLIENTS.push(c);
    }
    /* every merge here writes the Owner's id back into p.cid (what travels): this device's copy of the client is the one used */
    if (p.dv.cid0) p.cid = 'dv-' + String(p.dv.pid).slice(0, 10) + '-' + p.dv.cid0;
  }
  function dvRoleOf(p, rec, email) {
    if (email === p.dv.owner) return 'Owner';
    var list = dvRole(p) === 'Owner' ? p.team : rec.oteam || [], m = (list || []).filter(function (x) { return String(x.e || '').toLowerCase() === email; })[0];
    return m ? (m.role === 'Viewer' ? 'Viewer' : m.role === 'Owner' ? 'Owner' : 'Editor') : '';
  }
  async function dvOthers(p, rec, dev) {
    var d = p.dv, S = dvS(), me = dvMe(), role = dvRole(p), list = [];
    if (role === 'Owner') Object.keys(d.slots || {}).forEach(function (e) { if (dvRoleOf(p, rec, e)) list.push({ id: d.slots[e], who: e }); });
    else { list.push({ id: d.oid, who: d.owner, owner: true }); Object.keys(d.slots || {}).forEach(function (e) { if (e !== me && dvRoleOf(p, rec, e)) list.push({ id: d.slots[e], who: e }); }); }
    rec.files = rec.files || {};
    for (var i = 0; i < list.length; i++) {
      var f = list[i], rf = rec.files[f.id] || { ver: 0, allowed: '', devs: [] }, m = await drvMeta(f.id);
      if (m.err) { if (f.owner) { d.st = m.status === 404 ? 'gone' : 'err'; d.msg = m.status === 404 ? 'The project is no longer shared with you, or its folder is gone.' : 'Could not reach Google Drive. ' + m.err; return { stop: true }; } continue; }
      if (m.data.trashed) { if (f.owner) { d.st = 'gone'; d.msg = 'The Owner moved this project out of Drive.'; return { stop: true }; } continue; }
      var ver = +m.data.version || 0, by = String(((m.data.lastModifyingUser || {}).emailAddress) || '').toLowerCase();
      if (ver === rf.ver) continue;
      /* only its own person writes a file; a slot nobody has written yet is still the Owner's */
      if (by !== f.who && !(by === d.owner && !f.owner)) { S.warnf = (S.warnf || 0) + 1; continue; }
      if (!f.owner && m.data.name !== await sdtSlotName(f.who)) continue;
      var t = await drvText(f.id), o = t.ok ? sdtParse(t.data) : null;
      if (!o || o.pid !== d.pid || o.who !== f.who) continue;
      rf.devs = o.devs; rf.ver = ver; rf.wrapped = f.owner ? {} : o.wrapped || {}; rf.gen = o.gen; rec.files[f.id] = rf;
      if (by === d.owner && !f.owner) continue;   // the empty slot the Owner made: no body, no devices of the member's yet
      if (f.owner) {
        if (o.nm) d.oname = o.nm;
        /* the Owner's file names the generation: its key is unwrapped for this device, or this device has been left out */
        var Kh = await dvKeyFor(d.pid, o.gen, o);
        if (!Kh) { d.st = 'wait'; d.msg = 'Waiting for ' + (d.oname || d.owner) + ' to hand this device its key.'; return { stop: true }; }
        if (o.gen > d.gen) { d.gen = o.gen; S.changed = true; }
        /* a device of the Owner's with no wrap: the Owner asking for the key on a new device (29.18) */
        rec.asks = o.devs.filter(function (x) { return !o.wrapped[x.kid]; });   /* kept with the record, so the card still shows it after a reload */
        rec.oids = o.ids || {};   /* v81 (38.11): each member's file id, by file name */
      }
      var K = o.body ? (await dvKeys(d.pid))[o.body.g] || (f.owner ? null : await dvKeyFor(d.pid, o.body.g, null)) : null;
      if (!o.body || !K) continue;
      var nxt; try { nxt = await sdtOpen(K, d.pid, o.who, o.body); } catch (e) { continue; }
      nxt = await dvShIn(p, rec, nxt);   /* v73: the envelopes this device may open (37.2) */
      if (f.owner) { rec.oteam = x8Clone(nxt.team || []); nxt = dvNoTeam(nxt); rec.oslot = await dvOslot(rec); }
      /* a person's first body was built on the copy this device last wrote, not on what is here now: measured against that, an
         edit made here since is not taken for theirs */
      var local = dvLocal(p), prev = rf.allowed ? JSON.parse(rf.allowed) : rec.base ? JSON.parse(rec.base) : local, who = dvRoleOf(p, rec, f.who);
      /* v72: on the Owner's device a member's body is measured against the copy they were given, and what is hidden from them
         goes back afterwards: never seen there, so never taken as removed */
      var vw = role === 'Owner' && who !== 'Owner', mo = vw ? x8Me() : '';
      if (vw && !rf.allowed) prev = dvView(prev, mo);
      prev = dvBaseFill(prev, vw ? dvView(local, mo) : local, nxt);
      var allowed = who === 'Owner' ? nxt : x8Allow(prev, nxt, who, f.who, local);
      /* v96 (41): where this copy and theirs changed the same thing, the Owner's copy is used on every device, so all of them end up
         alike; the other copy is kept in p.cf to choose instead */
      var cx = { win: role !== 'Owner' && f.owner ? 'r' : 'l', out: [] };
      var merged = vw ? dvUnview(x8Merge(prev, dvView(local, mo), allowed, undefined, cx, []), local, mo) : x8Merge(prev, local, allowed, undefined, cx, []);
      if (x8S(merged) !== x8S(local) || f.owner) { if (role === 'Owner') x8In(p, merged, null); else dvInMember(p, rec, merged); S.changed = true; }
      if (cfAdd(p, cx, f.who, false)) S.changed = true;
      rf.allowed = x8S(allowed); rec.files[f.id] = rf;
    }
    return {};
  }
  /* v129 (105): a line or a piece of work this device added after a person's last copy, which their body now has too: their copy
     of it is measured against this device's, so what they changed in it is taken as theirs (before, it was dropped, or lost to
     this device's copy as a clash), and it stays in the copy kept for their next body */
  function dvBaseFill(prev, local, nxt) {
    if (!x8IsObj(prev) || !x8IsObj(local) || !x8IsObj(nxt)) return prev;
    var out = prev, own = function () { if (out === prev) out = x8Clone(prev); return out; };
    if (prev.pv && local.pv && nxt.pv) {
      var have = {}, lm = {};
      (prev.pv.items || []).forEach(function (x) { if (x8IsObj(x)) have[x.id] = 1; });
      (local.pv.items || []).forEach(function (x) { if (x8IsObj(x)) lm[x.id] = x; });
      var add = (nxt.pv.items || []).filter(function (x) { return x8IsObj(x) && !have[x.id] && lm[x.id]; }).map(function (x) { return x8Clone(lm[x.id]); });
      if (add.length) own().pv.items = (out.pv.items || []).concat(add);
    }
    if (x8IsObj(prev.work) && x8IsObj(local.work) && x8IsObj(nxt.work)) Object.keys(nxt.work).forEach(function (id) {
      if (!(id in prev.work) && id in local.work) own().work[id] = x8Clone(local.work[id]);
    });
    return out;
  }
  async function dvSync(p) {
    var d = p.dv, S = dvS(), me = dvMe(), dev = await x8Dev(), rec = await dvRec(d.pid), role = dvRole(p), mine = dvMine(p); S.kid = dev.kid;
    if (role === 'Owner' && d.owner !== me) { d.st = 'acct'; d.msg = 'Google Drive is connected to ' + me + ', and this project is kept in the Drive of ' + d.owner + '.'; return; }
    var fresh = role !== 'Owner';
    if (role === 'Owner') {
      await dvLayout(p); await dvTeamTn(p);
      /* v115 (78): who gets the folder follows the team this device has read. Another device of the Owner's may have changed it since
         (someone taken off there): until this device has read that, it shares with nobody and takes nobody off; its next round does */
      var m0 = await drvMeta(mine);
      fresh = m0.ok && !m0.data.trashed && (+m0.data.version || 0) === rec.ver;
      if (fresh) { await dvNoShares(p); await dvSlots(p); if (await dvLeavers(p, rec)) await dvRotate(p, rec); }
    }
    S.warnf = 0;
    var oth = await dvOthers(p, rec, dev); if (oth.stop) { await dvSaveRec(rec); return; }
    await dvShPrune(p);   /* v73: someone who left comes off what you shared with them (37.2, 37.3) */
    if (role === 'Owner' && !(await dvKeys(d.pid))[d.gen]) await dvRescue(p, rec, dev);
    var m = await drvMeta(mine);
    if (m.err) { d.st = m.status === 404 ? 'gone' : 'err'; d.msg = m.status === 404 ? (role === 'Owner' ? 'Its file is no longer in your Drive.' : 'Your file in this project is gone. Ask ' + (d.oname || 'the Owner') + ' to add you again.') : 'Could not reach Google Drive. ' + m.err; await dvSaveRec(rec); return; }
    if (m.data.trashed) { d.st = 'gone'; d.msg = 'Its folder is in your Drive trash.'; await dvSaveRec(rec); return; }
    var ver = +m.data.version || 0, by = String(((m.data.lastModifyingUser || {}).emailAddress) || '').toLowerCase();
    var local = dvLocal(p), sl = x8S(local), head = rec.head || { devs: [], wrapped: {}, gen: d.gen }, o = null, remote = null, warn = '';
    /* v81 (38.11): the Owner's file names every member's file; written again when that list changes */
    var ids = role === 'Owner' ? await dvSlotIds(p) : null, idsCh = role === 'Owner' && x8S(ids) !== x8S(rec.ids || {});
    /* the devices the Owner's file wraps the key for: the Owner's own, and every device in a member's file. v115 (79): a member's only
       from a device that has read the team as it is, or a device of the Owner's that missed a removal would wrap the key that
       turned for it for the very person taken off */
    var targets = head.devs.slice();
    if (role === 'Owner' && fresh) Object.keys(rec.files || {}).forEach(function (id) { var e = Object.keys(d.slots || {}).filter(function (k) { return d.slots[k] === id; })[0]; if (e && dvRoleOf(p, rec, e)) (rec.files[id].devs || []).forEach(function (x) { if (!targets.some(function (y) { return y.kid === x.kid; })) targets.push(x); }); });
    var needWrap = role === 'Owner' && targets.some(function (x) { return !head.wrapped[x.kid]; });
    if (ver === rec.ver && sl === rec.base && head.devs.some(function (x) { return x.kid === dev.kid; }) && !needWrap && !idsCh && !S.warnf) { if (d.st !== 'warn') { d.st = 'ok'; d.msg = ''; } d.last = Date.now(); await dvSaveRec(rec); return; }
    if (ver !== rec.ver || !rec.head) {
      /* a member's own file was made by the Owner: until the member writes it, the Owner is its writer */
      if (by && by !== me && !(role !== 'Owner' && by === d.owner)) warn = 'Someone else changed this project’s file in Drive. ScopeDue kept your last copy and wrote it back.';
      else {
        var t = await drvText(mine); if (t.err) { d.st = 'err'; d.msg = 'Could not read it from Google Drive. ' + t.err; return; }
        o = sdtParse(t.data);
        if (!o || o.pid !== d.pid || o.who !== me) { o = null; warn = 'The file in Drive is not one ScopeDue can read. Your copy was written back.'; }
        else {
          /* v115 (79): a device of the Owner's follows the generation another of them turned to, as a member's does (dvOthers): it
             never writes the file back under an older one, nor turns the key to a number that is taken */
          if (role === 'Owner') {
            head = dvJoin(head, o); if (o.gen > d.gen) { d.gen = o.gen; S.changed = true; }
            /* the key this device held for that number was not the file's: the wraps it made with it go too */
            if (o.gen === head.gen && (await dvKeyFile(d.pid, o.gen, o)).changed) head.wrapped = Object.assign({}, o.wrapped);
          } else head = { devs: dvJoin({ devs: head.devs, wrapped: {} }, o).devs, wrapped: {}, gen: d.gen };
          if (o.body && o.w !== rec.w) {
            var K0 = await dvKeyFor(d.pid, o.body.g, role === 'Owner' ? o : null);
            if (!K0) { d.st = 'wait'; d.msg = 'Waiting for one of your other devices to hand this one the key.'; rec.head = head; await dvSaveRec(rec); return; }
            /* v72: the Owner's devices read the whole project; a device that got the key from a teammate (29.18) has only the Editors' copy */
            var KO0 = role === 'Owner' && o.pbody ? await dvOKey(d.pid, o) : null;
            if (role === 'Owner' && o.pbody && !KO0 && !rec.rescued) { d.st = 'wait'; d.msg = 'Waiting for one of your other devices to hand this one the key.'; rec.head = head; await dvSaveRec(rec); return; }
            try { remote = KO0 ? await sdtOpen(KO0, d.pid, o.who, o.pbody) : await sdtOpen(K0, d.pid, o.who, o.body); if (role !== 'Owner') remote = dvNoTeam(remote); } catch (e) { remote = null; warn = 'The copy in Drive could not be opened. Your copy was written back.'; }
            if (remote) remote = await dvShIn(p, rec, remote);
          }
        }
      }
    }
    var merged = local, sm;
    if (remote) {
      /* which copy both sides last shared: the file built on my last write, or on the copy before it (my write was overwritten) */
      var b = o.on && o.on === rec.w ? rec.base : (rec.mine && o.on && o.on === rec.prevW && rec.prevBase ? rec.prevBase : rec.base);
      var cx0 = { win: 'l', out: [] };   /* v96 (41): two of this person's devices: the one writing now is used, the other kept to choose */
      merged = x8Merge(b ? JSON.parse(b) : remote, local, remote, undefined, cx0, []);
      if (x8S(merged) !== sl) { if (role === 'Owner') x8In(p, merged, null); else dvInMember(p, rec, merged); S.changed = true; }
      if (cfAdd(p, cx0, me, true)) S.changed = true;
      merged = dvLocal(p);
    }
    sm = x8S(merged);
    if (role === 'Owner' && p.n !== d.name) { var rn = await drvRename(d.root || d.fid, p.n); if (rn.ok) d.name = p.n; }   /* v83: the project's folder */
    var K = await dvKeyFor(d.pid, d.gen, role === 'Owner' ? o : null), headCh = false;
    if (!head.devs.some(function (x) { return x.kid === dev.kid; })) { head.devs.push({ kid: dev.kid, pub: dev.pub }); headCh = true; }
    /* v72: something is hidden from Editors: the whole project goes in pbody, under the Owner's own key. A new key is made only
       when the file has no pbody yet (or no device of the Owner's that held it is left): never one the other devices cannot open */
    var mo = x8Me(), hide = role === 'Owner' && !!K && dvHides(merged, mo), KO = null;
    if (role === 'Owner' && K) {
      if (!o && (hide || rec.pb)) { var t3 = await drvText(mine); o = t3.ok ? sdtParse(t3.data) : null; if (o && (o.pid !== d.pid || o.who !== me)) o = null; }
      KO = await dvOKey(d.pid, o, hide && (!(o && o.pbody) || !!rec.rescued));
      if (hide && !KO) { d.st = 'wait'; d.msg = 'Waiting for one of your other devices to hand this one the key.'; rec.head = head; await dvSaveRec(rec); return; }
      head.owr = head.owr || {};
      targets = head.devs.concat(targets.filter(function (x) { return !head.devs.some(function (y) { return y.kid === x.kid; }); }));
      for (var i = 0; i < targets.length; i++) { var x = targets[i]; if (!head.wrapped[x.kid]) { head.wrapped[x.kid] = await x8Wrap(K, x.pub, dvAad(d.pid, d.gen, x.kid)); headCh = true; } }
      if (KO) for (var j = 0; j < head.devs.length; j++) { var y = head.devs[j]; if (!head.owr[y.kid]) { head.owr[y.kid] = await x8Wrap(KO, y.pub, dvAad(d.pid, 'o', y.kid)); headCh = true; } }
    }
    /* a Viewer writes only their devices: their body would be ignored by everyone (29.4) */
    if (role !== 'Owner' && rec.giveDirty) headCh = true;
    if (idsCh) headCh = true;
    var bodyNew = !!K && role !== 'Viewer' && (rec.sgen !== d.gen || (remote ? sm !== x8S(remote) : sm !== rec.base || !!warn) || (role === 'Owner' && hide !== !!rec.pb));
    if (!bodyNew && !headCh && !warn) {
      if (remote) { rec.w = o.w; rec.base = sm; rec.prevW = ''; rec.prevBase = ''; rec.mine = false; }
      rec.ver = ver; rec.head = head; await dvSaveRec(rec);
      if (!fresh) S.again = true;   /* v115 (78): the team is read now: who gets the folder and the key, in a moment, not at the next round */
      d.st = S.warnf ? 'warn' : d.st === 'warn' ? 'warn' : 'ok'; d.msg = S.warnf ? 'A teammate’s file was changed by someone else. ScopeDue is using their last copy.' : d.st === 'warn' ? d.msg : ''; d.last = Date.now(); return;
    }
    if (!bodyNew && !o) { var t2 = await drvText(mine); o = t2.ok ? sdtParse(t2.data) : null; if (!o || o.pid !== d.pid) { o = null; if (!K || role === 'Viewer') { if (!warn) return; } else bodyNew = true; } }
    var rev = Math.max(rec.rev || 0, o ? o.rev : 0) + 1, w, on, body, pbody = null;
    if (bodyNew) {
      w = dvWid(); on = o ? o.w : rec.w;
      var wire = await dvShOut(p, rec, merged);   /* v73: what is not for everyone leaves sealed on its own (37.2) */
      if (hide) { body = await sdtSeal(K, d.pid, d.gen, me, dvView(wire, mo)); pbody = await sdtSeal(KO, d.pid, 0, me, wire); }
      else body = await sdtSeal(K, d.pid, d.gen, me, wire);
    }
    else { w = o ? o.w : rec.w; on = o ? o.on : ''; body = o ? o.body : null; pbody = o ? o.pbody || null : null; }
    var wr = await drvRewrite(mine, sdtFile({ pid: d.pid, rev: rev, who: me, gen: d.gen, w: w, on: on, nm: (pfSaved && pfSaved.name) || '', devs: head.devs, wrapped: role === 'Owner' ? head.wrapped : rec.give || {}, owr: role === 'Owner' ? head.owr : null, body: body, pbody: pbody, ids: ids }));
    if (wr.err) { d.st = 'err'; d.msg = 'Could not write to Google Drive. ' + wr.err; return; }
    plTell(Object.keys(d.slots || {}).concat([d.owner, me]));   /* v113 (72): the others read it within seconds, not at their next round */
    dvNudges(p, d, rec, me, role);   /* v121 (91): and hear by email what is theirs to do */
    if (role === 'Owner') rec.ids = ids;
    var nv = +wr.data.version || 0;
    if (bodyNew) { rec.prevW = on; rec.prevBase = remote ? x8S(remote) : rec.base; rec.w = w; rec.base = sm; rec.mine = true; rec.sgen = d.gen; rec.pb = !!pbody; }
    else if (remote) { rec.w = o.w; rec.base = sm; rec.prevW = ''; rec.prevBase = ''; rec.mine = false; }
    rec.giveDirty = false; rec.ver = nv; rec.rev = rev; rec.head = head; await dvSaveRec(rec);
    if (!fresh) S.again = true;
    if (nv > ver + 1) S.again = true;   // another device wrote in between: read again soon
    d.st = warn || S.warnf ? 'warn' : 'ok'; d.msg = warn || (S.warnf ? 'A teammate’s file was changed by someone else. ScopeDue is using their last copy.' : ''); d.last = Date.now();
  }

  /* ---- people leaving, and keys (29.18) ---- */
  /* on the Owner's device: a person with a file who is no longer on the team, 10 s after it was first seen (Undo still works) */
  async function dvLeavers(p, rec) {
    var d = p.dv, now = Date.now(), here = {}, rot = false; d.leaving = d.leaving || {};
    (p.team || []).forEach(function (m) { if (m && m.e && fbJoins(m)) here[String(m.e).toLowerCase()] = 1; });
    Object.keys(d.leaving).forEach(function (e) { if (here[e]) delete d.leaving[e]; });
    var gone = Object.keys(d.slots || {}).filter(function (e) { return !here[e]; });
    for (var i = 0; i < gone.length; i++) {
      var e = gone[i];
      if (!d.leaving[e]) { d.leaving[e] = now; dvS().again = true; continue; }
      if (now - d.leaving[e] < 10000) { dvS().again = true; continue; }
      var un = await drvUnshare(d.fid, e); if (un.err) { d.msg = 'Could not take ' + e + '’s access to the folder away. ' + un.err; continue; }
      var id = d.slots[e], jf = rec.files && rec.files[id];
      /* v115 (78, 79): another device of the Owner's took them off already: their file is in the trash, or gone (404). The Activity
         line is that device's; the withdraw (the server says it once) and a key turn still happen here, in case it was not that */
      var sm = await drvMeta(id), was = (sm.ok && sm.data.trashed) || sm.status === 404;
      /* v114 (73): someone who had joined (a device in their file) is emailed, and their devices take the project off */
      if (!was) await drvTrash(id);
      tiWithdraw(d.fid, e, jf && jf.devs && jf.devs.length ? p.n : '');
      delete d.slots[e]; delete d.leaving[e]; if (rec.files) delete rec.files[id];
      if (!was) pdNote(p, 'You stopped sharing ' + p.n + ' with ' + e).k = 'left|' + id;   /* two devices doing it at once: one line (79) */
      rot = true; dvS().changed = true;
    }
    return rot;
  }
  /* v115 (78): a project kept in Drive before v115: its team folder and this app's files in it, once, with writersCanShare off */
  async function dvNoShares(p) {
    var d = p.dv; if (d.nws) return;
    var r = await drvNoShare(d.fid); if (r.err) return;
    var ids = [d.oid].concat(Object.keys(d.slots || {}).map(function (e) { return d.slots[e]; }), d.ffid ? [d.ffid] : []);
    for (var i = 0; i < ids.length; i++) if (ids[i]) await drvNoShare(ids[i]);
    d.nws = 1; dvS().changed = true;
  }
  /* a new generation: a new key, wrapped by the round only for the devices of the people who stay, the Owner's body sealed with it */
  async function dvRotate(p, rec) {
    var d = p.dv, K = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    /* v115 (79): past every generation this device knows of, so two devices of the Owner's never make two keys for one number */
    var known = Object.keys(await dvKeys(d.pid)).map(Number).filter(function (g) { return g > 0; });
    d.gen = Math.max.apply(null, [d.gen || 1, (rec.head || {}).gen || 0].concat(known)) + 1; await dvSaveKey(d.pid, d.gen, K);
    rec.head = { devs: ((rec.head || {}).devs || []).slice(), wrapped: {}, gen: d.gen };
    rec.sgen = 0; dvS().changed = true;
  }
  /* on a new device of the Owner's with none of the Owner's devices left: a wrap a member handed over, in a file Drive confirms the member wrote */
  async function dvRescue(p, rec, dev) {
    var d = p.dv, files = rec.files || {};
    for (var id in files) {
      var f = files[id], w = f.wrapped && f.wrapped[dev.kid];
      if (!w) continue;
      try { var K = await x8Unwrap(w, dvAad(d.pid, d.gen, dev.kid)); await dvSaveKey(d.pid, d.gen, K); rec.rescued = true; return K; } catch (e) {}
    }
    return null;
  }
  /* on a member's device: hand the key to the Owner's new device, once the safety codes were compared outside ScopeDue */
  async function dvGive(p, kid) {
    var d = p.dv, rec = await dvRec(d.pid), x = (rec.asks || []).filter(function (a) { return a.kid === kid; })[0], K = (await dvKeys(d.pid))[d.gen];
    if (!x || !K) return;
    rec.give = rec.give || {};
    rec.give[kid] = await x8Wrap(K, x.pub, dvAad(d.pid, d.gen, kid)); rec.giveDirty = true; await dvSaveRec(rec);
    pdNote(p, 'You handed the project key to ' + (d.oname || 'the owner') + '’s new device');
    showToast('Handed over. ' + (d.oname || 'The owner') + '’s new device opens the project at its next sync.'); dvRun(true);
  }

  /* ---- people (29.17): on the Owner's device, each person on the team gets their file and the folder ---- */
  /* v80 (38.10): with the project's files (ids), the join page's Picker shows those files by id: Drive can list a shared folder as
     empty to the person it was shared with while each file opens for them. Without ids it opens the folder, as before */
  function dvJoinUrl(fid, ids) {
    var b = '', l = (ids || []).filter(function (x) { return typeof x === 'string' && /^[\w-]{6,80}$/.test(x); }).slice(0, 60);
    try { b = localStorage.getItem('sd-join-base') || ''; } catch (e) {}
    return (/^https?:\/\/[^\s#]+$/.test(b) ? b : 'https://scopedue.com/api/join.html') + '#f=' + encodeURIComponent(fid) + (l.length ? '&ids=' + l.join(',') : '');
  }
  /* on the Owner's device: the files a person joining confirms, the Owner's and every member's (the folder holds no others, 38.9) */
  /* v81 (38.11): on the Owner's device, each member's file by its file name (the Owner's file carries this); on a member's, the
     same read back by address, for the people on the Owner's team */
  async function dvSlotIds(p) { var d = p.dv, o = {}, ks = Object.keys(d.slots || {}).sort(); for (var i = 0; i < ks.length; i++) o[await sdtSlotName(ks[i])] = d.slots[ks[i]]; return o; }
  async function dvOslot(rec) { var o = {}, t = rec.oteam || []; for (var i = 0; i < t.length; i++) { var e = String((t[i] && t[i].e) || '').toLowerCase(), id = e && (rec.oids || {})[await sdtSlotName(e)]; if (id) o[e] = id; } return o; }
  function dvIds(p) { var d = p.dv, l = [d.oid]; Object.keys(d.slots || {}).sort().forEach(function (e) { l.push(d.slots[e]); }); return l.filter(Boolean); }
  async function dvSlots(p) {
    var d = p.dv, people = (p.team || []).filter(function (m) { return m && m.e && fbJoins(m); });   /* v70: a Viewer gets no file and no share (32.1) */ d.slots = d.slots || {};
    if (!people.length) return;
    if (!drSyEmail()) { d.msg = 'Sign in to ScopeDue to invite the people on this project.'; return; }
    for (var i = 0; i < people.length; i++) {
      /* A Viewer is intentionally still a Drive writer: they must publish their device key in their own slot.
         The app filters/ignores their project body, so this does not grant project-editing rights. (29.4, 29.13.) */
      var m = people[i], e = String(m.e).toLowerCase(), desired = 'writer', id = d.slots[e], made = false, name, f, who, sh;
      if (!id) {
        name = await sdtSlotName(e);
        f = await drvCreate(name, d.fid, sdtFile({ pid: d.pid, rev: 0, who: e, gen: d.gen, devs: [], wrapped: {}, body: null }), { sd: 'team', v: '1' });
        if (f.err) { d.msg = 'Could not make the file for ' + m.n + ' in Drive. ' + f.err; continue; }
        id = f.data.id; made = true;
      }
      who = (pfSaved && pfSaved.name) || 'Your teammate';
      sh = await drvShare(d.fid, e, desired, made ? who + ' added you to ' + p.n + ' in ScopeDue. Open it here: ' + dvJoinUrl(d.fid, dvIds(p).concat([id])) : '');
      if (sh.err) {
        if (made) await drvDelete(id);
        d.msg = 'Could not share the folder with ' + e + '. ' + sh.err;
        continue;
      }
      if (!d.slots[e]) { d.slots[e] = id; dvS().changed = true; pdNote(p, 'You shared ' + p.n + ' with ' + m.n + ' through Google Drive'); tiSend(p, m); }   /* v76: and in their bell (38) */
    }
  }
  /* Google does not offer a notification resend on permissions.update. Before a member has joined, remove and recreate
     the existing folder permission so permissions.create can send the invitation again with the same join link. */
  async function dvResend(p, email) {
    if (!p || !p.dv || dvRole(p) !== 'Owner' || !email || !p.dv.slots || !p.dv.slots[email]) return;
    if (!drReady()) { p.dv.msg = 'Reconnect Google Drive from the ScopeDue extension before resending the invitation.'; showToast(p.dv.msg); dvS().changed = true; await SDB.save(); dvPaint(p); return; }
    var rec = await dvRec(p.dv.pid), id = p.dv.slots[email], f = rec.files && rec.files[id];
    if (f && f.devs && f.devs.length) { showToast('This person has already joined. The invite is no longer resent.'); return; }
    var m = (p.team || []).filter(function (x) { return x && String(x.e || '').toLowerCase() === email; })[0]; if (!m) return;
    var who = (pfSaved && pfSaved.name) || 'Your teammate', sh = await drvShare(p.dv.fid, email, 'writer', who + ' added you to ' + p.n + ' in ScopeDue. Open it here: ' + dvJoinUrl(p.dv.fid, dvIds(p)), true, true);
    if (sh.err) { p.dv.msg = 'Could not resend the invitation to ' + email + '. ' + sh.err; showToast(p.dv.msg); }
    else { p.dv.msg = ''; await tiSend(p, m, true); showToast('Invitation resent to ' + email + '.'); }
    dvS().changed = true; await SDB.save(); dvPaint(p);
  }
  /* Add teammate on a private project: a ScopeDue account, Drive, the project in Drive, then the round does the rest */
  async function dvTeamStart(p) {
    if (sdSample(p)) return;   /* v125 (99) */
    if (!dvKind(p) || p.x8 || dvRole(p) !== 'Owner' || !(p.team || []).some(fbJoins)) return;
    if (!drSyEmail()) { showToast('Sign in to ScopeDue to share this project with them.'); openDrawer('sync'); return; }
    if (!p.dv) { await dvKeep(p); if (!p.dv) return; }
    dvRun(false);
  }

  /* ---- joining (29.17): what the join page handed the extension, kept until the project opens here ---- */
  async function dvJoins() { return (await x8Get('dv:join')) || []; }
  async function dvJoinAdd(msg) {
    if (!msg || typeof msg.fid !== 'string' || !/^[\w-]{6,80}$/.test(msg.fid) || !Array.isArray(msg.files)) return;
    var files = msg.files.slice(0, 60).filter(function (f) { return f && typeof f.id === 'string' && /^[\w-]{6,80}$/.test(f.id) && typeof f.name === 'string'; }).map(function (f) { return { id: f.id, name: f.name.slice(0, 80) }; });
    var all = await dvJoins(), was = all.filter(function (j) { return j.fid === msg.fid; })[0], list = all.filter(function (j) { return j.fid !== msg.fid; });
    list.push({ fid: msg.fid, files: files, ts: Date.now(), inv: was && was.inv ? was.inv : undefined });
    await x8Put('dv:join', list); dvS().jl = list; dvS().joinMsg = dvS().joinMsg || {}; dvS().joinMsg[msg.fid] = 'Opening the project you were added to…';    dvPaintAll(); dvRun(false);
    dvJnQuiet();
  }
  /* v77: the files were just picked on the join page, which granted drive.file to the same client: Google usually hands this device a
     token without a window, so the card's Drive step finishes by itself. If it will not, nothing changes and the step's button asks.
     The stand-in Google of the tests answers a quiet ask only when told to (__drv.quiet) */
  async function dvJnQuiet() {
    if (dvOn() || !drReady() || DR.busy || (DR.test && !DR.quiet)) return;
    var t = await drToken(false); if (t.err) return;
    await drRefresh(false); if (dvOn()) dvRun(false); dvJnPaint();
  }
  /* v82 (38.12): a joining card that no longer stands goes, with what it was waiting for */
  async function dvJoinDrop(fid) { var S = dvS(); S.jl = (await dvJoins()).filter(function (j) { return j.fid !== fid; }); await x8Put('dv:join', S.jl); if (S.joinMsg) delete S.joinMsg[fid]; dvJnPaint(); }
  /* v76: an invitation accepted in the bell (38): the joining card shows at once, its files still to be picked on the join page */
  async function dvJoinPend(x) {
    var list = await dvJoins(); if (list.some(function (j) { return j.fid === x.fid; })) return;
    /* v82 (38.12): who sent it and for which project, so a card can follow the same Owner's next invitation to that project */
    list.push({ fid: x.fid, files: [], ts: Date.now(), inv: { id: x.id, from: String(x.from_email || '').toLowerCase().slice(0, 190), project: String(x.project || '').slice(0, 120), who: String(x.from || x.from_email || '').slice(0, 80), files: (x.files || []).filter(function (v) { return typeof v === 'string' && /^[\w-]{6,80}$/.test(v); }).slice(0, 60) } });
    await x8Put('dv:join', list); dvS().jl = list; dvJnPaint(); dvRun(true);
  }
  async function dvTryJoin(j) {
    if (!j.files || !j.files.length) return;   /* accepted, not picked yet */
    var S = dvS(), me = dvMe(), dev = await x8Dev(); S.joinMsg = S.joinMsg || {};
    var done = async function () { S.jl = (await dvJoins()).filter(function (x) { return x.fid !== j.fid; }); await x8Put('dv:join', S.jl); delete S.joinMsg[j.fid]; };
    var have = PROJECTS.filter(function (p) { return p.dv && p.dv.fid === j.fid; })[0];
    if (have) {   // a later pick on a project already here: the files of people who joined later
      var rec0 = await dvRec(have.dv.pid), emails = (dvRole(have) === 'Owner' ? have.team : rec0.oteam || []).map(function (m) { return String(m.e || '').toLowerCase(); });
      for (var a = 0; a < emails.length; a++) { var nm = await sdtSlotName(emails[a]), f0 = j.files.filter(function (f) { return f.name === nm; })[0]; if (f0 && emails[a] !== me) { have.dv.slots = have.dv.slots || {}; have.dv.slots[emails[a]] = f0.id; S.changed = true; } }
      await done(); return;
    }
    var of = j.files.filter(function (f) { return f.name === 'owner.sdteam'; })[0], myName = await sdtSlotName(me), sf = j.files.filter(function (f) { return f.name === myName; })[0];
    if (!of || !sf) { S.joinMsg[j.fid] = !of ? 'The Owner’s file was not picked. Open the link from the email again and pick every file.' : 'Your own file was not picked, or Drive is connected to another account than the one invited.'; return; }
    var om = await drvMeta(of.id); if (om.err) { S.joinMsg[j.fid] = 'Could not open the shared folder. ' + om.err; return; }
    var owner = String(((om.data.lastModifyingUser || {}).emailAddress) || '').toLowerCase();
    var ot = await drvText(of.id), o = ot.ok ? sdtParse(ot.data) : null; if (!o || o.who !== owner) { S.joinMsg[j.fid] = 'The shared file is not one ScopeDue can read.'; return; }
    S.jon = S.jon || {}; S.jon[j.fid] = o.nm || owner;   /* who shared it, for the joining card */
    var st = await drvText(sf.id), s = st.ok ? sdtParse(st.data) : null; if (!s || s.who !== me || s.pid !== o.pid) { S.joinMsg[j.fid] = 'Your file in this project is not one ScopeDue can read.'; return; }
    if (!s.devs.some(function (x) { return x.kid === dev.kid; })) {   // this device's key, for the Owner's device to wrap
      s.devs.push({ kid: dev.kid, pub: dev.pub });
      var wr = await drvRewrite(sf.id, sdtFile({ pid: s.pid, rev: s.rev + 1, who: me, gen: s.gen, w: s.w, on: s.on, nm: (pfSaved && pfSaved.name) || '', devs: s.devs, wrapped: {}, body: s.body }));
      if (wr.err) { S.joinMsg[j.fid] = 'Could not write to your file in Drive. ' + wr.err; return; }
      s.rev++;
    }
    var K = await dvKeyFor(o.pid, o.gen, o);
    if (!K || !o.body) { S.joinMsg[j.fid] = 'Waiting for ' + (o.nm || owner) + ' to hand this device its key.'; return; }
    var snap; try { snap = await sdtOpen(K, o.pid, o.who, o.body); } catch (e) { S.joinMsg[j.fid] = 'The project could not be opened with the key it was given.'; return; }
    /* api.php 1.28.0 (96): a client project joined as an Editor takes one of the month's places on the free plan. With none left it
       waits on its card, and opens by itself once there is one (a paid plan, or the next month). A copy moving here from team sync
       was joined before */
    if (snap.kind === 'client' && !dvOldCopy(j.fid, owner)) {
      var qc = await qtClaim('drive', j.fid);
      if (!qc.ok) { S.joinMsg[j.fid] = qc.full ? qtFullText(qc.quota) : 'Could not reach ScopeDue to open this client project. It tries again by itself.'; return; }
    }
    var old = dvOldCopy(j.fid, owner), was = old ? await dvLeaveRoom(old) : null, p;
    if (old) p = old;
    else { var wid = String(snap.id || 'project'), id = wid, k = 2; while (pdById(id)) id = wid + '-' + (k++); p = { id: id, n: snap.n || 'Shared project', m: snap.m || 'S', kind: snap.kind === 'client' ? 'client' : 'private', team: [], ctx: [], log: [] }; }
    p.dv = { fid: j.fid, oid: of.id, pid: o.pid, gen: o.gen, owner: owner, oname: o.nm || owner, role: 'Viewer', mine: sf.id, slots: {}, last: Date.now(), st: 'ok', msg: '', name: snap.n || '' };
    if (was) p.dv.room0 = was.room;
    if (!old) p.dv.at = Date.now();   /* joined here: the Dashboard says it opened, the bell says so, the project says hello once */
    var rec = { pid: o.pid, w: s.w, base: '', prevW: '', prevBase: '', mine: false, ver: 0, rev: s.rev, head: { devs: s.devs, wrapped: {}, gen: o.gen }, files: {}, oteam: x8Clone(snap.team || []) };
    dvInMember(p, rec, dvNoTeam(snap));
    for (var b = 0; b < rec.oteam.length; b++) { var e2 = String(rec.oteam[b].e || '').toLowerCase(), n2 = await sdtSlotName(e2), f2 = j.files.filter(function (f) { return f.name === n2; })[0]; if (f2 && e2 !== me) p.dv.slots[e2] = f2.id; }
    rec.files[of.id] = { ver: +om.data.version || 0, allowed: x8S(dvNoTeam(snap)), devs: [] };
    rec.base = x8S(dvLocal(p)); var sm2 = await drvMeta(sf.id); rec.ver = sm2.ok ? +sm2.data.version || 0 : 0;
    /* what changed here since the room's last version goes out through Drive, filtered by the role as always */
    if (was && was.base) { var mg = x8Merge(dvNoTeam(was.base), dvNoTeam(was.loc), JSON.parse(rec.base)); if (x8S(mg) !== rec.base) dvInMember(p, rec, mg); }
    if (!old) PROJECTS.push(p);
    sdUTNow(); await dvSaveRec(rec); await done();
    S.said.push(old ? p.n + ' is on Google Drive now' : (o.nm || owner) + ' shared ' + p.n + ' with you'); S.changed = true; S.loud = true;
  }
  /* sw.js keeps what the join page sent as sdJoin; the app takes it from there */
  function dvJoinListen() {
    try {
      if (!(window.chrome && chrome.storage && chrome.storage.local)) return;
      var take = function () { chrome.storage.local.get('sdJoin', function (r) { if (r && r.sdJoin) { var m = r.sdJoin; chrome.storage.local.remove('sdJoin'); dvJoinAdd(m); } }); };
      chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.sdJoin && ch.sdJoin.newValue) take(); });
      take();
    } catch (e) {}
  }

  /* ---- another device of the same account: find, ask, and receive (29.16) ---- */
  async function dvScan() {
    await x8Dev();   /* this device's key, for the code shown while it waits */
    var S = dvS(), out = [], root = await drvRoot(); if (root.err) { S.found = []; return; }
    var fl = await drvList(root.data.id); if (fl.err) { S.found = []; return; }
    var here = {}, wait = await dvWait(); PROJECTS.forEach(function (p) { if (p.dv) here[p.dv.pid] = 1; });
    var folders = (fl.data.files || []).filter(function (f) { return f.mimeType ? f.mimeType === drvFolderType() : true; });
    for (var i = 0; i < folders.length && out.length < 50; i++) {
      var l = await drvList(folders[i].id), fid = folders[i].id; if (l.err) continue;
      var of = (l.data.files || []).filter(function (f) { return f.name === 'owner.sdteam'; })[0];
      /* v83 (38.13): ScopeDue/<project>/Team/owner.sdteam; before v83 it was straight in the project's folder */
      var tm = of ? null : (l.data.files || []).filter(function (f) { return f.mimeType === drvFolderType() && (f.appProperties || {}).sd === 'project'; })[0];
      if (tm) { var l2 = await drvList(tm.id); if (l2.ok) { of = (l2.data.files || []).filter(function (f) { return f.name === 'owner.sdteam'; })[0]; fid = tm.id; } }
      if (!of) continue;
      var t = await drvText(of.id), o = t.ok ? sdtParse(t.data) : null;
      if (!o || here[o.pid] || o.who !== dvMe()) continue;
      out.push({ pid: o.pid, name: folders[i].name, fid: fid, oid: of.id, waiting: wait.some(function (w) { return w.pid === o.pid; }) });
    }
    S.found = out;
  }
  async function dvOpenHere(f) {
    var wait = (await dvWait()).filter(function (w) { return w.pid !== f.pid; }); wait.push({ pid: f.pid, fid: f.fid, oid: f.oid, name: f.name });
    await x8Put('dv:wait', wait); f.waiting = true; dvPaintAll();
    dvRun(false);
  }
  async function dvTryOpen(wt) {
    var S = dvS(), me = dvMe(), dev = await x8Dev(), pdNote0 = '';
    var m = await drvMeta(wt.oid); if (m.err) return;
    if (String(((m.data.lastModifyingUser || {}).emailAddress) || '').toLowerCase() !== me) return;
    var t = await drvText(wt.oid), o = t.ok ? sdtParse(t.data) : null; if (!o || o.pid !== wt.pid || o.who !== me) return;
    if (!o.devs.some(function (x) { return x.kid === dev.kid; })) {   // ask: this device's key, for another device of mine to wrap
      o.devs.push({ kid: dev.kid, pub: dev.pub });
      await drvRewrite(wt.oid, sdtFile({ pid: o.pid, rev: o.rev + 1, who: me, gen: o.gen, w: o.w, on: o.on, nm: o.nm, devs: o.devs, wrapped: o.wrapped, owr: o.owr, body: o.body, pbody: o.pbody, ids: o.ids }));
      return;
    }
    var K = await dvKeyFor(o.pid, o.gen, o), l = await drvList(wt.fid), files = l.ok ? (l.data.files || []).filter(function (f) { return /^m-[0-9a-f]{8}\.sdteam$/.test(f.name); }) : [], rescued = false;
    if (!K) {   // none of the Owner's devices left to wrap it: a wrap a member handed over, in a file Drive confirms they wrote (29.18)
      for (var a = 0; a < files.length && !K; a++) {
        var by = String(((files[a].lastModifyingUser || {}).emailAddress) || '').toLowerCase(), ft = await drvText(files[a].id), fo = ft.ok ? sdtParse(ft.data) : null;
        if (!fo || fo.pid !== o.pid || fo.who !== by || files[a].name !== await sdtSlotName(by) || !fo.wrapped[dev.kid]) continue;
        try { K = await x8Unwrap(fo.wrapped[dev.kid], dvAad(o.pid, o.gen, dev.kid)); await dvSaveKey(o.pid, o.gen, K); rescued = true; } catch (e) { K = null; }
      }
    }
    if (!K || !o.body) return;
    /* v72: the whole project when another device of mine handed over the Owner's key too; from a teammate, only the Editors' copy */
    var KO = o.pbody ? await dvOKey(o.pid, o) : null;
    if (o.pbody && !KO && !rescued) return;
    var snap; try { snap = KO ? await sdtOpen(KO, o.pid, o.who, o.pbody) : await sdtOpen((await dvKeys(o.pid))[o.body.g] || K, o.pid, o.who, o.body); } catch (e) { return; }
    if (o.pbody && !KO) pdNote0 = 'What only you could see in this project could not be brought to this device: none of your devices that held it is left';
    var old = dvOldCopy(wt.fid, me), was = old ? await dvLeaveRoom(old) : null, p;
    if (old) p = old;
    else { var wid = String(snap.id || 'project'), id = wid, k = 2; while (pdById(id)) id = wid + '-' + (k++); p = { id: id, n: snap.n || wt.name, m: snap.m || 'P', kind: snap.kind === 'client' ? 'client' : 'private', team: [], ctx: [], log: [] }; }
    var cl0 = snap._client; x8In(p, snap, null);
    var base0 = x8S(x8Out(p));
    if (was && was.base) { var mg = x8Merge(was.base, was.loc, JSON.parse(base0)); if (x8S(mg) !== base0) x8In(p, mg, null); }
    p.dv = { fid: wt.fid, oid: wt.oid, pid: o.pid, gen: o.gen, owner: me, last: Date.now(), st: 'ok', msg: '', name: p.n, slots: {} };
    dvClientIn(p, cl0);
    if (was) p.dv.room0 = was.room;
    /* the people's files are already in the folder: this device knows them, and makes none again */
    for (var b = 0; b < (p.team || []).length; b++) { var e3 = String(p.team[b].e || '').toLowerCase(), n3 = await sdtSlotName(e3), f3 = files.filter(function (f) { return f.name === n3; })[0]; if (f3) p.dv.slots[e3] = f3.id; }
    if (!old) PROJECTS.push(p);
    sdUTNow();
    await dvSaveRec({ pid: o.pid, w: o.w, base: base0, prevW: '', prevBase: '', mine: false, ver: +m.data.version || 0, rev: o.rev, head: dvJoin(null, o), rescued: rescued, pb: !!KO });
    if (pdNote0) pdNote(p, pdNote0);
    await x8Put('dv:wait', (await dvWait()).filter(function (w) { return w.pid !== o.pid; }));
    if (S.found) S.found = S.found.filter(function (f) { return f.pid !== o.pid; });
    S.said.push(old ? p.n + ' is on Google Drive now' : p.n + ' is on this device now'); S.changed = true;
  }

  /* ---- moving from team sync (29.19) ---- */
  /* on the Owner's device: the project kept in Drive, the folder shared by the round, and the room told where it went */
  async function dvMove(p) {
    if (sdSample(p)) return;   /* v125 (99) */
    if (!p || !p.x8 || x8Role(p) !== 'Owner' || p.x8.moved || p.dv) return;
    if (!drSyEmail()) { showToast('Sign in to ScopeDue to move it.'); openDrawer('sync'); return; }
    await x8Sync(true);   // what the team saved last comes in first
    await dvKeep(p, true); if (!p.dv || !p.x8) return;
    p.x8.moved = { ts: Date.now(), fid: p.dv.fid, by: dvMe() };
    pdNote(p, 'You moved this project from team sync to Google Drive'); pdTouch(p);
    await SDB.save();
    await x8Sync(true);   // the marker goes into the room's next version
    await dvRun(true);    // the folder is shared with the people on the team
    showToast('Moved to your Google Drive. Google emails each person a link to join; until they do, team sync keeps them up to date.');
    x8Paint(p);
  }
  /* the copy team sync brought, whose room said it moved to this folder, by this Owner */
  function dvOldCopy(fid, owner) { return PROJECTS.filter(function (q) { var mv = x8Mv(q); return !q.dv && mv && mv.fid === fid && mv.by === owner; })[0] || null; }
  /* that copy leaves its room on this device: what it was, and what the room last had, for the merge */
  async function dvLeaveRoom(q) {
    var room = q.x8 ? q.x8.room : (q.x8mv || {}).room || '', loc = x8Out(q); delete loc._moved;
    /* the room's last version the Owner wrote: what came after it here may not have reached the Owner yet, so it goes out again through Drive */
    var rr = room ? await x8Get('room:' + room) : null, b0 = rr && (rr.oraw || rr.base), base = b0 ? JSON.parse(b0) : null; if (base) delete base._moved;
    if (room) { await x8Del('room:' + room); await x8Del('keys:' + room); delete X8.recs[room]; delete X8.keys[room]; }
    q.x8 = null; delete q.x8mv; delete q.x8gone;
    return { room: room, loc: loc, base: base };
  }
  /* on the Owner's device: the room goes once every person has a device in their Drive file, or 30 days after the move */
  async function dvBridgeEnd(p, rec) {
    var d = p.dv, files = rec.files || {}, room = p.x8.room, old = Date.now() - (+p.x8.moved.ts || 0) > 30 * 864e5;
    var all = (p.team || []).filter(fbJoins).every(function (m) { var id = (d.slots || {})[String(m.e || '').toLowerCase()]; return id && files[id] && (files[id].devs || []).length; });
    if (!all && !old) return;
    if (x8On()) await x8Sync(true);   /* the room's last versions come in first: what someone saved there just before joining is not lost */
    var job = X8.q.then(async function () {
      if (!p.x8 || p.x8.room !== room) return;
      if (x8On()) { var r = await x8Ask('DELETE', '/v1/rooms/' + room, null); if (!syOk(r) && r.status !== 404 && !old) return; }
      else if (!old) return;
      await x8Del('room:' + room); await x8Del('keys:' + room); delete X8.recs[room]; delete X8.keys[room];
      p.x8 = null; pdNote(p, 'Everyone is on Google Drive now. Team sync for this project is off and its copy on your server is gone.'); pdTouch(p);
      dvS().changed = true;
    });
    X8.q = job.catch(function () {}); await job;
  }

  /* ---- the rounds ---- */
  async function dvRound() {
    if (!dvOn()) return;
    var S = dvS(), kept = PROJECTS.filter(function (p) { return p.dv; }), wait = await dvWait(), joins = await dvJoins();
    if (!kept.length && !wait.length && !joins.length) return;
    var tok = await x8Get('dv:tok'), changed = null;
    if (tok) { var c = await drvChanges(tok); if (c.ok) { changed = {}; c.data.changes.forEach(function (x) { changed[x.id] = 1; }); await x8Put('dv:tok', c.data.next); } }
    else { var st = await drvStart(); if (st.ok) await x8Put('dv:tok', st.data); }
    for (var i = 0; i < kept.length; i++) {
      var p = kept[i]; if (!p.dv || !p.dv.oid) continue;
      var rec = await dvRec(p.dv.pid), d = p.dv;
      /* any file of the project changed, or this device changed it, or people are still waiting for files or keys */
      var ids = [d.oid, d.fid, d.mine].concat(Object.keys(d.slots || {}).map(function (e) { return d.slots[e]; })), hit = !changed || ids.some(function (id) { return id && changed[id]; });
      var emails = (p.team || []).filter(fbJoins).map(function (m) { return String(m.e || '').toLowerCase(); });
      /* people still to be given their file, or still to be let go (29.18) */
      var waiting = dvRole(p) === 'Owner' && (emails.some(function (e) { return e && !(d.slots || {})[e]; }) || Object.keys(d.slots || {}).some(function (e) { return emails.indexOf(e) < 0; }));
      /* v84: the Owner's folders still to lay out (38.13) or to name after the project, though nothing else changed */
      var folders = dvRole(p) === 'Owner' && (!d.root || d.tn !== p.n);
      if (hit || waiting || folders || x8S(dvLocal(p)) !== rec.base || d.st !== 'ok' || !rec.head) await dvSync(p);
      if (dvRole(p) !== 'Owner' && p.fdel) await dvFdel(p, rec);   /* v87: files the Owner removed that this person added */
      if (p.x8 && p.x8.moved && dvRole(p) === 'Owner' && p.dv.st === 'ok') await dvBridgeEnd(p, rec);
    }
    for (var j = 0; j < wait.length; j++) await dvTryOpen(wait[j]);
    for (var k = 0; k < joins.length; k++) await dvTryJoin(joins[k]);
    if (joins.length) S.jl = await dvJoins();
    S.last = Date.now();
  }
  function dvRun(quiet) {
    var S = dvS();
    var run = S.q.then(async function () {
      if (!dvOn()) return;
      /* CONTRACT 142: a tab that is behind another one cannot save what a round brings, and what is changed in it is not saved: it
         makes no round, so nothing typed there reaches Drive and other devices only to be taken back by the next tab */
      if (SDB.S.stale) { S.msg = 'This tab is behind another one. Reload it to keep syncing.'; return; }
      S.busy = true; S.said = []; S.changed = false; S.again = false; S.loud = false;
      var was = dvSig();
      try { await dvRound(); S.msg = ''; } catch (e) { S.msg = e && e.message ? e.message : String(e); }
      if (dvSig() !== was) S.changed = true;   /* a state or a word on a card is kept too */
      S.busy = false;
      if (S.changed) await SDB.save();   /* what arrived is saved before the round ends, not at the next tick */
      if (S.changed) x8Paint(); else if (pd.p && pd.p.dv && curView === 'project' && pd.tab === 'workspace' && !syTyping()) pdRerender();
      dvPaintAll();
      /* a project shared with this person is said even by a quiet round: it usually opens on one, when the Owner's key arrives */
      if ((!quiet || S.loud) && S.said.length && !pendingUndo) showToast(S.said.length === 1 ? S.said[0] : S.said.length + ' projects arrived from Google Drive');
      if (S.again) setTimeout(function () { dvRun(true); }, 1500);
    });
    S.q = run.catch(function () {});
    return run;
  }
  /* what every kept project's card says, to know whether a round changed it */
  function dvSig() { return JSON.stringify(PROJECTS.filter(function (p) { return p.dv; }).map(function (p) { return [p.id, p.dv.st, p.dv.msg, p.dv.name]; })); }
  /* within 3 s of a change here */
  function dvDirty() {
    if (!dvOn() || dvS().busy) return;
    var S = dvS();
    for (var i = 0; i < PROJECTS.length; i++) { var p = PROJECTS[i]; if (!p.dv || !p.dv.oid) continue; var r = S.recs[p.dv.pid]; if (!r || x8S(dvLocal(p)) !== r.base) { dvRun(true); return; } }
  }

  /* ---- what it looks like ---- */
  function dvCard(p) {
    if (!p.dv) return '';
    var d = p.dv, S = dvS(), rec = S.recs[d.pid], role = dvRole(p), own = role === 'Owner';
    if (!rec) dvRec(d.pid).then(function () { dvPaint(p); });   /* after a reload the record is read once, then the card is drawn with it */
    var chip = d.st === 'ok' ? '<span class="chip ok">' + (own ? 'In your Drive' : 'Shared with you') + '</span>' : d.st === 'wait' ? '<span class="chip neutral">Waiting for the key</span>' : '<span class="chip warn">' + (d.st === 'gone' ? 'Not in Drive' : d.st === 'acct' ? 'Other account' : 'Check this') + '</span>';
    var devs = rec && rec.head ? rec.head.devs : [], wrapped = rec && rec.head ? rec.head.wrapped || {} : {};
    /* v122 (93): a status line on Overview, not a block of settings: where it is and when it last synced, with Open in Drive. The
       folder, the device codes, Sync now and Stop are under Details, opened by itself only when something needs a hand */
    var h = '<section class="card pd-card dv-c" aria-labelledby="pd-h-dv"><div class="card-h"><div><h3 id="pd-h-dv">Google Drive</h3>' + (own ? '' : '<p>Shared by ' + esc(d.oname || d.owner) + ' through their Google Drive. You are ' + (role === 'Editor' ? 'an Editor.' : 'a Viewer.') + '</p>') + '</div><div class="h-actions">' + chip + '</div></div>';
    h += '<p class="dv-line"><span>' + (S.busy ? 'Syncing…' : 'Synced ' + esc(x8Ago(d.last))) + '</span><a class="link" href="' + esc(dvFolderUrl((own && d.root) || d.fid)) + '" target="_blank" rel="noopener noreferrer">Open in Drive ' + IC('ext') + '</a></p>';
    if (d.msg) h += '<p class="sy-p sy-bad" role="status">' + esc(d.msg) + '</p>';
    var more = '<dl class="cd-dl"><div><dt>Folder</dt><dd>ScopeDue / ' + esc(d.name || p.n) + '</dd></div></dl>';
    if (p.x8 && p.x8.moved) more += '<p class="sy-p dv-bridge">Moved from team sync. Team sync stays on for the people who have not joined here yet, and is deleted from your server once everyone has, or after 30 days.</p>';
    if (devs.length) more += '<ul class="dv-devs" aria-label="Your devices">' + devs.map(function (x) { return '<li><span>' + (x.kid === dvS().kid ? 'This device' : 'Another device') + '</span><code data-fp="' + esc(x.pub.x + '.' + x.pub.y) + '">…</code>' + (!own || wrapped[x.kid] ? '' : ' <small>waiting for the key</small>') + '</li>'; }).join('') + '</ul>';
    /* the people: on the Owner's device where each one stands is on their row in Members (dvMemLine); on a member's, who still has to be added */
    var asks = own || !rec ? [] : (rec.asks || []).filter(function (x) { return !(rec.give || {})[x.kid]; });
    if (asks.length) h += '<div class="dv-ask">' + asks.map(function (x) { return '<p class="sy-p"><b>' + esc(d.oname || 'The owner') + ' asks for the key on a new device.</b> Compare this code with them by phone or in person first: <code data-fp="' + esc(x.pub.x + '.' + x.pub.y) + '">…</code></p><div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-pd="dv:give" data-kid="' + esc(x.kid) + '">The codes match. Hand it over</button></div>'; }).join('') + '</div>';
    var later = own || !rec ? [] : (rec.oteam || []).filter(function (m) { var e = String(m.e || '').toLowerCase(); return e && e !== dvMe() && !(d.slots || {})[e]; });
    if (later.length) h += '<p class="sy-p">' + esc(later.map(function (m) { return m.n || m.e; }).join(', ')) + (later.length === 1 ? ' joined.' : ' joined.') + ' Add their file to see their work.</p>';
    if (later.length) h += '<div class="sy-acts"><a class="btn-ghost btn-sm" href="' + esc(dvJoinUrl(d.fid, later.map(function (m) { return (rec.oslot || {})[String(m.e || '').toLowerCase()]; })) + '&add=1') + '" target="_blank" rel="noopener noreferrer">Add their file</a></div>';   /* v81: by id when the Owner's file names it (38.11) */
    more += '<div class="sy-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dv:sync"' + (S.busy ? ' disabled' : '') + '>Sync now</button>' +
      (own ? '<button type="button" class="btn-ghost btn-sm' + (S.ask === d.pid ? ' danger' : '') + '" data-pd="dv:stop">' + (S.ask === d.pid ? 'Stop for every device?' : 'Stop keeping it in Drive') + '</button>' : '') + '</div>';
    return h + '<details class="dv-more"' + (S.ask === d.pid || (own && devs.some(function (x) { return !wrapped[x.kid]; })) ? ' open' : '') + '><summary>Details</summary>' + more + '</details></section>';
  }
  /* on the Owner's device, a third line on each person's row in Members: where they stand with the project in Drive, and their device codes */
  function dvMemLine(p, m) {
    if (!p || !p.dv || dvRole(p) !== 'Owner' || !fbJoins(m)) return '';
    var d = p.dv, rec = dvS().recs[d.pid], wrapped = rec && rec.head ? rec.head.wrapped || {} : {};
    var e = String(m.e || '').toLowerCase(), id = (d.slots || {})[e], f = id && rec && rec.files ? rec.files[id] : null, ds = f ? f.devs || [] : [];
    /* v76: their answer, from the server (38), until their device writes its key into their file */
    var iv = !ds.length && tiSent(p, e), acc = !!(iv && iv.accepted_at), dec = !!(iv && !acc && iv.declined_at);
    var ok = ds.length && ds.every(function (x) { return wrapped[x.kid]; }), st = !id ? 'Not invited yet' : !ds.length ? (acc ? 'Joined · opening it on their device' : dec ? 'Declined' : 'Invited') : ok ? 'Joined' : 'Joined · waiting for the key';
    return '<span class="pd-m-dv"><span' + (ok || acc ? ' class="ok"' : '') + '>' + st + '</span>' + ds.map(function (x) { return '<code data-fp="' + esc(x.pub.x + '.' + x.pub.y) + '">…</code>'; }).join('') +
      (!ds.length && id && !acc ? '<button type="button" class="link" data-pd="dv:resend" data-e="' + esc(e) + '" aria-label="Resend the invite to ' + esc(m.n) + '">Resend invite</button>' : '') +
      (!ds.length && id && !acc ? '<button type="button" class="link" data-pd="dv:uninv" data-e="' + esc(e) + '" aria-label="Cancel the invite to ' + esc(m.n) + '">Cancel invite</button>' : '') + '</span>';
  }
  function dvPaint(p) { if (pd.p && curView === 'project' && (!p || pd.p === p) && (pd.tab === 'workspace' || pd.tab === 'team') && !syTyping()) pdRerender(); }
  /* Settings › Google Drive: projects in ScopeDue/ that are not on this device */
  function dvFoundHTML() {
    var S = dvS(); if (DR.st !== 'on' || DR.proto) return '';
    var jm = S.joinMsg || {}, joins = Object.keys(jm).map(function (k) { return '<li><span>' + esc(jm[k]) + '</span></li>'; }).join('');
    if (joins) return '<div class="dv-found" id="dv-found"><h4>Joining</h4><ul>' + joins + '</ul></div>';
    if (!S.found) return '<div class="dv-found" id="dv-found"><p class="sy-p">Looking for projects in your Drive…</p></div>';
    if (!S.found.length) return '<div class="dv-found" id="dv-found"></div>';
    return '<div class="dv-found" id="dv-found"><h4>In your Drive</h4><p class="sy-p">Projects you keep in Google Drive that are not on this device yet.</p><ul>' + S.found.map(function (f) {
      /* the code to compare when a teammate hands the key over (29.18) */
      var fp = X8.dev ? ' <code data-fp="' + esc(X8.dev.pub.x + '.' + X8.dev.pub.y) + '">…</code>' : '';
      if (fp) setTimeout(x8Fps, 0);   /* worked out after drawing, as on the project card */
      return '<li><span>' + esc(f.name) + '</span>' + (f.waiting ? '<small>Waiting for one of your devices, or a teammate, to hand this one the key. This device’s safety code:' + fp + '</small>' : '<button type="button" class="btn-ghost btn-sm" data-dv-open="' + esc(f.pid) + '">Open here</button>') + '</li>';
    }).join('') + '</ul></div>';
  }
  function dvPaintAll() {
    var el = document.getElementById('dv-found'); if (el) { var h = dvFoundHTML(); if (h) el.outerHTML = h; }
    if (pd.p && pd.p.dv) dvPaint(pd.p);
    dvJnPaint();
  }

  /* ---- joining, as the person sees it (29.17): a card on the Dashboard for each project on its way, step by step ---- */
  function dvJnStep(n, st, title, text, acts) {
    return '<li class="' + st + '"' + (st === 'now' ? ' aria-current="step"' : '') + '><span class="dv-jn-n" aria-hidden="true">' + (st === 'done' ? IC('tick') : n) + '</span><div><b>' + title + '</b>' + (text ? '<p>' + text + '</p>' : '') + (acts ? '<div class="sy-acts">' + acts + '</div>' : '') + '</div></li>';
  }
  function dvJnCard(key, head, sub, steps, chip) {
    return '<section class="card dv-jn-c" aria-labelledby="dv-jn-h-' + key + '"><div class="card-h ruled"><div><h2 id="dv-jn-h-' + key + '">' + head + '</h2><p>' + sub + '</p></div><div class="h-actions">' + chip + '</div></div><ol class="dv-jn-s">' + steps.join('') + '</ol></section>';
  }
  function dvJnHTML() {
    var S = dvS(), jm = S.joinMsg || {}, out = [];
    var inOk = !!drSyEmail() || dvOn(), drOk = dvOn(), me = dvMe();
    (S.jl || []).forEach(function (j, i) {
      var who = (S.jon || {})[j.fid] || (j.inv && j.inv.who) || '', msg = jm[j.fid] || '', wait = /^Waiting for /.test(msg), opening = !msg || /^Opening /.test(msg);
      /* v77: picking the files on the join page and connecting Drive here are one step. The files come first (an invitation accepted
         in the bell, 38, has none yet); once they arrive Drive connects without a window when Google allows it (dvJnQuiet), else
         the step's button asks */
      var picked = !!(j.files && j.files.length), kn = 3;
      var at = !inOk ? 1 : !picked || !drOk ? 2 : kn, s = function (n) { return n < at ? 'done' : n === at ? 'now' : 'todo'; };
      /* v79 (38.9): the owner chose what this person opens (the folder's files, made by the owner's app); Google only wants them to
         confirm it once, in the Picker on the join page, so the step says that rather than "pick" */
      var gd = (who ? esc(who) + ' chose the files you can open.' : 'The person who added you chose the files you can open.');
      var steps = [
        dvJnStep(1, s(1), 'Sign in to ScopeDue', inOk ? 'Signed in as ' + esc(me) + '.' : 'Use the address the invitation was sent to.', inOk ? '' : '<button type="button" class="btn-primary btn-sm" data-dvj="in">Sign in</button>'),
        dvJnStep(2, s(2), 'Allow ScopeDue to open the project',
          picked && drOk ? 'Files confirmed. Connected as ' + esc(DR.email) + '.'
            : !picked ? gd + ' Google asks you to confirm them once: on the next page, sign in to Google with the invited address, select every file shown, then Select.'
            : 'Files confirmed. Now connect the same Google account you sign in to ScopeDue with.' + (DR.msg && at === 2 ? '</p><p class="sy-p sy-bad" role="status">' + esc(DR.msg) : ''),
          at !== 2 ? '' : !picked ? '<a class="btn-primary btn-sm" href="' + esc(dvJoinUrl(j.fid, j.inv && j.inv.files)) + '" target="_blank" rel="noopener noreferrer">Confirm with Google ' + IC('ext') + '</a>'
            : !drReady() ? '' : '<button type="button" class="btn-primary btn-sm" data-dvj="drive"' + (DR.busy ? ' disabled' : '') + '>' + (DR.busy ? 'Connecting…' : DR.st === 'again' ? 'Sign in to Google again' : 'Connect Google Drive') + '</button>'),
        dvJnStep(kn, s(kn), 'Get the project’s key', at < kn ? 'The person who added you hands it to this device. Nothing to do but wait.' : wait ? esc(msg) + ' It happens the next time their ScopeDue syncs. You can close this page in the meantime.' : opening ? 'Checking the shared folder…' : '</p><p class="sy-p sy-bad" role="status">' + esc(msg),
          at === kn && !wait && !opening ? '<a class="btn-ghost btn-sm" href="' + esc(dvJoinUrl(j.fid, j.inv && j.inv.files)) + '" target="_blank" rel="noopener noreferrer">Open the invitation again ' + IC('ext') + '</a>' : ''),
        dvJnStep(4, 'todo', 'Open the project', 'It opens here by itself once the key arrives.', '')
      ];
      out.push(dvJnCard('j' + i, 'Joining a shared project', who ? esc(who) + ' added you to a project in their Google Drive.' : 'Someone added you to a project in their Google Drive.', steps, '<span class="chip ' + (at === kn && !wait && !opening ? 'warn">Check this' : 'neutral">Step ' + at + ' of 4') + '</span>'));
    });
    /* projects that opened here and were not looked at yet */
    PROJECTS.forEach(function (p) {
      if (!p.dv || !p.dv.at || p.dv.seen || dvRole(p) === 'Owner') return;
      var who = esc(p.dv.oname || p.dv.owner), role = dvRole(p) === 'Editor' ? 'an Editor' : 'a Viewer';
      out.push(dvJnCard('p-' + esc(p.id), esc(p.n) + ' is ready', who + ' shared it with you. You are ' + role + '.', [
        dvJnStep(1, 'done', 'Sign in to ScopeDue', '', ''), dvJnStep(2, 'done', 'Allow ScopeDue to open the project', '', ''), dvJnStep(3, 'done', 'Get the project’s key', '', ''),
        dvJnStep(4, 'now', 'Open the project', 'Its work and its next step are on this device now, and stay in step with ' + who + ' through Google Drive.', '<button type="button" class="btn-primary btn-sm" data-dvj="open" data-pid="' + esc(p.id) + '">Open ' + esc(p.n) + '</button>')
      ], '<span class="chip ok">Shared with you</span>'));
    });
    return out.join('');
  }
  function dvJnPaint() {
    var el = document.getElementById('dv-jn'); if (!el) return;
    var h = dvJnHTML(); if (el._h === h) return;
    el._h = h; el.innerHTML = h; el.hidden = !h;
  }
  /* the first time a person opens a project shared with them: what their role lets them do, once */
  function dvHello(p) {
    if (!p.dv || !p.dv.at || p.dv.hi || dvRole(p) === 'Owner') return '';
    if (!p.dv.seen) { p.dv.seen = Date.now(); SDB.save(); dvJnPaint(); }
    var who = esc(p.dv.oname || p.dv.owner), ed = dvRole(p) === 'Editor';
    return '<section class="card pd-card dv-hi" aria-labelledby="pd-h-hi"><div class="card-h ruled"><div><h3 id="pd-h-hi">Welcome to ' + esc(p.n) + '</h3><p>' + who + ' shared this project with you. You are ' + (ed ? 'an Editor.' : 'a Viewer.') + '</p></div></div>' +
      (ed ? '<p class="sy-p">As an Editor you can:</p><ul><li>Take free work, and update and hand over your own.</li><li>Set the next step, add links and parked ideas.</li>' + (p.kind === 'client' ? '' : '<li>Record what Viewers say in Feedback.</li>') + '</ul><p class="sy-p">' + (p.kind === 'client' ? 'Scope, the agreement, the client and assigning work stay with ' : 'Scope, decisions and assigning work stay with ') + who + '. What you change reaches them through Google Drive.</p>'
        : '<p class="sy-p">You can read everything here. Changes are made by ' + who + ' and the Editors.</p>') +
      '<div class="sy-acts">' + (ed ? '<button type="button" class="btn-primary btn-sm" data-pd="goto" data-tab="team">See the work</button>' : '') + '<button type="button" class="btn-ghost btn-sm" data-pd="dv:hi">Got it</button></div></section>';
  }
  /* ---- what Editors see (v72), the Owner's card on Team: tabs, and single items kept for the Owner ---- */
  function dvSeeList(p, g) { return g === 'ctx' || g === 'crs' || g === 'evd' ? p[g] || [] : (p.pv && p.pv[g]) || []; }
  /* the groups of single items: a client project's Scope is the agreement, so its items are not kept one by one */
  function dvSeeGroups(p) { return p.kind === 'client' ? [['crs', 'Change requests'], ['evd', 'Evidence'], ['ctx', 'Links']] : [['items', 'Scope items'], ['dec', 'Decisions'], ['park', 'Parked ideas'], ['ctx', 'Links']]; }
  function dvSeeCard(p) {
    if ((p.kind !== 'private' && p.kind !== 'client') || x8Role(p) !== 'Owner' || !(p.team || []).some(function (m) { return m && m.role === 'Editor'; })) return '';
    var eh = p.eh || {}, open = pd.dvSee || (pd.dvSee = {});
    var tabs = pdVisible(p).filter(function (k) { return k in dvEh(); });
    /* v122 (94): one line that says what they see; the ticks open under Change */
    var hidT = tabs.filter(function (k) { return eh[k]; }).length, hidI = 0, allI = 0;
    dvSeeGroups(p).forEach(function (gg) { var list = dvSeeList(p, gg[0]); allI += list.length; hidI += list.filter(function (x) { return x && x.oo === 1 && !(gg[0] === 'items' && x.as && x.as !== 'You'); }).length; });
    var say = !hidT && !hidI ? 'Editors see everything you see.' : (hidT ? (hidT === 1 ? '1 tab' : hidT + ' tabs') + (hidI ? ' and ' : '') : '') + (hidI ? (hidI === 1 ? '1 item' : hidI + ' items') : '') + ' only you see.';
    var h = '<section class="card pd-card dv-see" aria-labelledby="pd-h-see"><div class="card-h"><div><h3 id="pd-h-see">What Editors see</h3><p>' + esc(say) + '</p></div></div>';
    h += '<details class="dv-see-d"><summary>Change what they see</summary><p class="sy-p dv-see-n">What you hide never reaches their devices: it is left out of the copy they open.</p><div class="dv-see-b"><h4>Tabs</h4><ul class="dv-see-l">' + tabs.map(function (k) {
      return '<li><label><input type="checkbox" data-pd="dv:eh" data-k="' + k + '"' + (eh[k] ? '' : ' checked') + '> ' + esc(PD_LABEL[k]) + '</label>' + (eh[k] ? '<span class="chip neutral">Only you</span>' : '') + '</li>';
    }).join('') + '</ul><p class="sy-p dv-see-n">' + (p.kind === 'client' ? 'Overview, Scope and Team always show: the agreement and their work are there.' : 'Overview, Scope and Team always show: that is where their work is.') + '</p>';
    h += '<h4>Single items</h4>' + dvSeeGroups(p).map(function (gg) {
      var g = gg[0], list = dvSeeList(p, g); if (!list.length) return '';
      var hid = list.filter(function (x) { return x && x.oo === 1; }).length;
      return '<details class="dv-see-g" data-dv-see="' + g + '"' + (open[g] ? ' open' : '') + '><summary>' + esc(gg[1]) + ' <small>' + (hid ? hid + ' of ' + list.length + ' only you' : 'Editors see all ' + list.length) + '</small></summary><ul class="dv-see-l">' + list.map(function (x, i) {
        var given = g === 'items' && x.as && x.as !== 'You', only = x.oo === 1 && !given;
        return '<li><label><input type="checkbox" data-pd="dv:oo" data-g="' + g + '" data-i="' + i + '"' + (only ? '' : ' checked') + (given ? ' disabled' : '') + '> <span>' + esc(prvT(x.t || x.title || x.n || '', 70)) + '</span></label>' + (given ? '<small>Given to ' + esc(x8NameOf(p, x.as)) + '</small>' : only ? '<span class="chip neutral">Only you</span>' : '') + '</li>';
      }).join('') + '</ul></details>';
    }).join('') + '<p class="sy-p dv-see-n">Ticked: Editors see it. Work you give to someone always shows to them.</p></div></details></section>';
    return h;
  }
  async function dvSeeSet(p, a, act) {
    if (!p || x8Role(p) !== 'Owner') return;
    if (act === 'eh') {
      var k = a.getAttribute('data-k'); if (!(k in dvEh())) return;
      p.eh = p.eh || {}; if (p.eh[k]) delete p.eh[k]; else p.eh[k] = 1;
      if (k === 'decisions' && pdMode(p) === 'internal') { if (p.eh.decisions) p.eh.market = 1; else delete p.eh.market; }   /* v119 (87) */
      if (!Object.keys(p.eh).length) delete p.eh;
      pdNote(p, (p.eh && p.eh[k] ? 'You hid ' : 'You showed ') + PD_LABEL[k] + (p.eh && p.eh[k] ? ' from Editors' : ' to Editors'));
    } else {
      var g = a.getAttribute('data-g'); if (!dvSeeGroups(p).some(function (gg) { return gg[0] === g; })) return;
      var x = dvSeeList(p, g)[+a.getAttribute('data-i')]; if (!x || (x.as && x.as !== 'You')) return;
      if (x.oo === 1) delete x.oo; else x.oo = 1;
    }
    pdTouch(p); await SDB.save(); pdRerender();
    if (p.dv) dvRun(true);
    if (p.x8) x8Sync(true);
  }

  /* the bell: a project someone shared opened on this device */
  function dvNotes(out) {
    PROJECTS.forEach(function (p) {
      if (!p.dv || !p.dv.at || dvRole(p) === 'Owner') return;
      out.push({ key: 'dvjn:' + p.id + ':' + p.dv.at, tone: '', title: (p.dv.oname || p.dv.owner) + ' shared a project with you', text: p.n + '. You are ' + (dvRole(p) === 'Editor' ? 'an Editor.' : 'a Viewer.'), meta: dbName(p), ts: p.dv.at, go: { pid: p.id, tab: 'workspace', f: '', cr: '' } });
    });
  }
  async function dvAct(act, a) {
    var p = pd.p; if (!p) return;
    if (act === 'sync') { dvRun(false); dvPaint(p); }
    else if (act === 'give') await dvGive(p, a.getAttribute('data-kid'));
    else if (act === 'resend') await dvResend(p, a.getAttribute('data-e'));
    else if (act === 'uninv') tiCancel(p, a.getAttribute('data-e'));   /* v76 */
    else if (act === 'hi') { if (p.dv) p.dv.hi = Date.now(); await SDB.save(); pdRerender(); }
    else if (act === 'eh' || act === 'oo') await dvSeeSet(p, a, act);
    else if (act === 'stop') {
      var S = dvS();
      if (S.ask !== p.dv.pid) { S.ask = p.dv.pid; dvPaint(p); setTimeout(function () { if (S.ask === (p.dv || {}).pid) { S.ask = ''; dvPaint(p); } }, 4000); return; }
      S.ask = ''; await dvStop(p);
    }
  }
  /* CONTRACT 143: a tab in the background makes its 5-minute round only while no ScopeDue tab is on screen, and one background tab
     at a time. Before, every background tab made it: when one of them took a change first and saved it, the tab being used was
     behind and had to be reloaded. A tab on screen holds the lock sd-tab-visible (shared, so every such tab holds it) for as long
     as it is; a background tab makes a round only if it can take that lock alone, and keeps it for the round. Where the browser
     has no Web Locks, the round is made as before */
  var DV_VIS = { on: false, rel: [] };
  function dvVisHold() {
    if (!(navigator.locks && navigator.locks.request)) return;
    var vis = document.visibilityState === 'visible';
    if (vis && !DV_VIS.on) {
      DV_VIS.on = true;
      try { navigator.locks.request('sd-tab-visible', { mode: 'shared' }, function () { return new Promise(function (res) { if (DV_VIS.on) DV_VIS.rel.push(res); else res(); }); }).catch(function () {}); } catch (e) {}
    } else if (!vis && DV_VIS.on) { DV_VIS.on = false; DV_VIS.rel.splice(0).forEach(function (f) { f(); }); }
  }
  function dvBgRound() {
    if (document.visibilityState === 'visible') return Promise.resolve(false);
    if (!(navigator.locks && navigator.locks.request)) return dvRun(true).then(function () { return true; });
    try { return navigator.locks.request('sd-tab-visible', { ifAvailable: true }, function (l) { return l ? dvRun(true).then(function () { return true; }) : false; }).catch(function () { return false; }); } catch (e) { return dvRun(true).then(function () { return true; }); }
  }
  function dvInit() {
    setInterval(function () { if (document.visibilityState === 'visible') { dvDirty(); dvJnPaint(); } }, 3000);   /* a sign-in elsewhere moves the joining card on */
    setInterval(function () { if (document.visibilityState === 'visible') dvRun(true); }, 30000);
    setInterval(dvBgRound, 300000);
    document.addEventListener('visibilitychange', function () { dvVisHold(); if (document.visibilityState === 'visible') dvRun(true); });
    dvVisHold();
    document.addEventListener('click', async function (e) {
      var j = e.target.closest('[data-dvj]');
      if (j && !j.disabled) {
        var ja = j.getAttribute('data-dvj');
        if (ja === 'in') openDrawer('sync');
        else if (ja === 'drive') { await drRefresh(true); if (dvOn()) dvRun(false); dvJnPaint(); }
        else if (ja === 'open') { var jp = pdById(j.getAttribute('data-pid')); if (jp) openProject(jp.id, 'workspace', j); }
        return;
      }
      var b = e.target.closest('[data-dv-open]'); if (!b) return;
      var f = (dvS().found || []).filter(function (x) { return x.pid === b.getAttribute('data-dv-open'); })[0]; if (f) dvOpenHere(f);
    });
    dvJoinListen();
    /* v72: which groups of What Editors see are open, kept across redraws */
    document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.matches && d.matches('details[data-dv-see]')) { pd.dvSee = pd.dvSee || {}; pd.dvSee[d.getAttribute('data-dv-see')] = d.open; } }, true);
    dvJoins().then(function (l) { if (!dvS().jl) dvS().jl = l; dvJnPaint(); }).catch(function () {});
    if (dvOn()) setTimeout(function () { dvRun(true); }, 1500);
    if (sdTest() && window.__drv) window.__drv.sync = { run: function () { return dvRun(true); }, /* 143 */ bg: function () { return dvBgRound(); }, /* v121 (91) */ dvset: function (id, dv) { var p = pdById(id); p.dv = dv; pdTouch(p); }, wk: function (id, iid, f) { var p = pdById(id), it = prvById(p.pv.items, iid); Object.keys(f).forEach(function (k) { if (f[k] === null) delete it[k]; else it[k] = f[k]; }); pdTouch(p); }, items: function (id) { return x8Clone(pdById(id).pv.items); }, nudge: function (id, d, was, role, me) { var p = pdById(id), rec = { nu: was }; dvNudges(p, d, rec, me || dvMe(), role); return rec.nu; }, tell: function (id) { dvTellEditors(pdById(id)); }, view: function (id, eh) { var p = pdById(id); if (!p) return null; var o = x8Clone(p); if (eh) o.eh = eh; return x8Clone(dvView(o, dvMe())); }, unlayout: function (id) { var d = pdById(id).dv; delete d.root; delete d.prv; delete d.fpid; delete d.tn; }, untn: function (id) { delete pdById(id).dv.tn; }, rename: function (id, n) { var p = pdById(id); p.n = n; pdTouch(p); }, add: function (id, m) { var p = pdById(id); if (!p) return false; p.team = (p.team || []).concat([m]); pdTouch(p); return true; }, join: function (m) { return dvJoinAdd(m); }, joins: function () { return dvS().joinMsg || {}; }, keep: function (id) { return dvKeep(pdById(id)); }, move: function (id) { return dvMove(pdById(id)); }, scan: function () { return dvScan().then(function () { dvPaintAll(); return dvS().found; }); }, open: function (pid) { var f = (dvS().found || []).filter(function (x) { return x.pid === pid; })[0]; return f ? dvOpenHere(f) : null; }, rec: function (pid) { return dvRec(pid); }, share: { allow: function (a, b, c) { return dvShAllow(a, b, c); } }, data: function (id) { return x8Out(pdById(id)); }, file: function (pid) { return dvRec(pid); }, state: function () { return { busy: dvS().busy, msg: dvS().msg, kept: PROJECTS.filter(function (p) { return p.dv; }).map(function (p) { return { id: p.id, n: p.n, dv: p.dv }; }) }; } };
  }
  dvInit();
