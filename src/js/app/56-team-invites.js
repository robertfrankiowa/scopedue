  /* ---------- v76: invitations kept on the server (CONTRACT.md 38) ----------
     Google's sharing email used to be the only trace of an invitation: the invited person's ScopeDue knew nothing of it, and
     showed nothing until they found that email and the link in it. Now the Owner's app also tells the server (api.php 1.6.0:
     the folder id, the project's name, the role) and the invited person's app shows the invitation in the bell, with Accept and
     Decline. Accept records the answer, puts the joining card on the Dashboard and opens the join page for the one step Google
     still needs: picking the shared files (29.2, drive.file). On the Owner's device the person's row in Members follows the
     answer: Invited (Resend invite), Declined (Resend invite), Joined.
     Functions only, apart from the start at the end: earlier files call these before this one has run. tiS() holds the state. */
  var TI0, TI_NOKIND = false;   // TI_NOKIND: the server is older than 1.28.0 and does not take an invitation's kind
  function tiS() { return TI0 || (TI0 = { mine: [], sent: {}, busy: false }); }
  function tiOn() { return !!(SY.key && SY.url && SY.st !== 'auth'); }
  function tiK(fid, email) { return fid + '|' + String(email || '').toLowerCase(); }
  /* the server's record of one person's invitation to a project kept in Drive, or null */
  function tiSent(p, email) { return p && p.dv && p.dv.fid ? tiS().sent[tiK(p.dv.fid, email)] || null : null; }
  /* v115 (75): a project in Drive this device holds but someone else owns. A member's copy, or an Owner's copy whose Owner is not this
     device's account (a backup brought in, or the device used by the Owner before): Drive's card says "connected to … kept in the
     Drive of …", and it is that Owner's, not this account's */
  function tiTheirs(p) {
    if (!p || !p.dv) return false;
    var me = dvMe(), own = String(p.dv.owner || '').toLowerCase();
    return dvRole(p) !== 'Owner' || !!(me && own && own !== me);
  }
  /* on the Owner's device: the invitation, written when the folder is shared with someone, and again on Resend invite */
  async function tiSend(p, m, resend) {
    if (!tiOn() || !p || !p.dv || !p.dv.fid || !m || !m.e || tiTheirs(p)) return null;   /* v115 (75): never in another account's name */
    var me = pfSaved && pfSaved.name && pfSaved.name !== PF_DEF.name ? pfSaved.name : '';   /* no name yet: the server uses the account's */
    var b = { fid: p.dv.fid, email: String(m.e).toLowerCase(), project: String(p.n || 'Project').slice(0, 120), role: m.role === 'Viewer' ? 'Viewer' : 'Editor', name: String(me).slice(0, 80), resend: !!resend, files: dvIds(p) };   /* v80: the project's files, for the join page (38.10) */
    if (!TI_NOKIND) b.kind = p.kind === 'client' ? 'client' : 'private';   /* api.php 1.28.0 (96) */
    var r = await syCall('PUT', '/v1/invites', b);
    if (!syOk(r) && r.status === 422 && b.kind && /"kind"/.test(syErr(r).message || '')) { TI_NOKIND = true; delete b.kind; r = await syCall('PUT', '/v1/invites', b); }   /* a server before 1.28.0 */
    if (syOk(r) && r.data.invite) { var x = r.data.invite; tiS().sent[tiK(x.fid, x.email)] = x; }
    /* 1.28.0 (96): they have no new client project left this month on the free plan, so the project cannot open for them yet: said
       once per person and project, on this device */
    if (syOk(r) && r.data.full && !QT.said[tiK(p.dv.fid, m.e)]) {
      QT.said[tiK(p.dv.fid, m.e)] = 1;
      showToast((m.n || m.e) + ' has used the 5 new client projects of the free plan this month. ' + p.n + ' opens for them once they upgrade, or on ' + qtUtc(qtNext()) + '.');
    }
    return r;
  }
  /* someone taken off the project (no email: everyone, when the project leaves Drive).
     v114 (73): `left` is the project's name when the person had joined: the server emails them and keeps the invitation as removed, so
     each of their devices takes the project off. That one is kept here until the server has it (ti:left), so going offline loses no email */
  function tiWithdraw(fid, email, left) {
    if (!fid) return;
    var S = tiS(), b = { fid: fid };
    if (email) b.email = String(email).toLowerCase();
    Object.keys(S.sent).forEach(function (k) { if (email ? k === tiK(fid, email) : k.indexOf(fid + '|') === 0) delete S.sent[k]; });
    if (email && left) {
      var me = pfSaved && pfSaved.name && pfSaved.name !== PF_DEF.name ? pfSaved.name : '';   /* no name yet: the server uses the account's */
      b.left = true; b.project = String(left).slice(0, 120); if (me) b.name = String(me).slice(0, 80);
      tiLeftAdd(b); return;
    }
    if (tiOn()) syCall('POST', '/v1/invites/withdraw', b);
  }
  async function tiLeftAdd(b) {
    var q = ((await x8Get('ti:left')) || []).filter(function (x) { return !(x.fid === b.fid && x.email === b.email); });
    q.push(b); await x8Put('ti:left', q); tiLeftSend();
  }
  async function tiLeftSend() {
    var S = tiS(); if (!tiOn() || S.lbusy) return;
    S.lbusy = true;
    try {
      var q = (await x8Get('ti:left')) || [], keep = [];
      for (var i = 0; i < q.length; i++) {
        var r = await syCall('POST', '/v1/invites/withdraw', q[i]);
        if (!syOk(r) && !(r.status >= 400 && r.status < 500 && r.status !== 429)) keep.push(q[i]);   /* refused for good: not asked again */
      }
      await x8Put('ti:left', keep);
    } catch (e) {} finally { S.lbusy = false; }
  }
  /* Cancel invite, on the row of someone who has not joined: they come off the project as with ✕ (the Drive round takes the folder
     and their file back 10 s later, 29.18), and the invitation leaves their bell now. Undo puts both back */
  function tiCancel(p, email) {
    if (!p || !p.dv || x8Role(p) !== 'Owner') return;
    var e = String(email || '').toLowerCase(), i = (p.team || []).map(function (m) { return String(m.e || '').toLowerCase(); }).indexOf(e), m = p.team[i];
    if (!m) return;
    var back = wkRelease(p, m.e), fid = p.dv.fid;
    p.team.splice(i, 1);
    var wasOwner = p.owner === m.n; if (wasOwner) p.owner = 'You';
    var note = pdNote(p, 'You cancelled the invite to ' + m.n);
    pdAfterTeam(p); wkAfter(p); tiWithdraw(fid, e); tiPaint();
    showToast('Invite to ' + m.n + ' cancelled', function () {
      p.team.splice(i, 0, m); if (wasOwner) p.owner = m.n; back.undo(); pdUnnote(p, note);
      pdAfterTeam(p, p.team.length === 1); wkAfter(p);
      if (p.dv && p.dv.fid === fid) tiSend(p, m).then(tiPaint);
    });
  }
  async function tiPull() {
    var S = tiS(); if (!tiOn() || S.busy) return;
    S.busy = true;
    try {
      var r = await syCall('GET', '/v1/invites');
      if (!syOk(r)) return;
      var was = JSON.stringify([S.mine, S.sent]), sent = {};
      (r.data.sent || []).forEach(function (x) { if (x && x.fid && x.email) sent[tiK(x.fid, x.email)] = x; });
      S.sent = sent;
      S.mine = (r.data.to_me || []).filter(function (x) { return x && x.id && /^[\w-]{6,80}$/.test(x.fid || ''); });
      if (Array.isArray(r.data.accepted)) await tiStale(r.data.accepted);   /* api.php 1.7.1 and later */
      if (Array.isArray(r.data.removed)) { var gw = JSON.stringify(S.gone || []); await tiGone(r.data.removed); if (JSON.stringify(S.gone) !== gw) was = ''; }   /* 1.20.0 */
      await tiCatchUp();
      tiLeftSend();
      if (JSON.stringify([S.mine, S.sent]) !== was) tiPaint();
    } catch (e) {} finally { S.busy = false; }
  }
  /* what the server does not know yet. An invitation to a project already here (joined from Google's email) is answered for the
     person. On the Owner's device, someone shared with before 1.6.0 who has not joined yet is invited here too */
  async function tiCatchUp() {
    var S = tiS();
    for (var i = S.mine.length - 1; i >= 0; i--) {
      var x = S.mine[i];
      if (PROJECTS.some(function (p) { return p.dv && p.dv.fid === x.fid; })) { S.mine.splice(i, 1); syCall('POST', '/v1/invites/' + x.id + '/accept'); }
    }
    for (var j = 0; j < PROJECTS.length; j++) {
      var p = PROJECTS[j], d = p.dv; if (!d || !d.fid || tiTheirs(p) || !d.slots) continue;
      var rec = await dvRec(d.pid);
      for (var k = 0; k < (p.team || []).length; k++) {
        var m = p.team[k], e = String((m && m.e) || '').toLowerCase(), id = d.slots[e], f = id && rec.files ? rec.files[id] : null;
        /* v80: also when the files it names are not the project's files now (written before 1.7.0, or someone added since) */
        var sx = S.sent[tiK(d.fid, e)];
        if (id && fbJoins(m) && !(f && f.devs && f.devs.length) && (!sx || (sx.files || []).join(',') !== dvIds(p).join(','))) await tiSend(p, m);
      }
    }
  }
  /* v82 (38.12): on the invited person's device. A joining card whose invitation no longer stands (the Owner took it back, or
     stopped keeping the project in Drive) goes. When the same Owner has since invited them to the same project again (the folder
     made anew), the card moves to that invitation, accepted for them: they had already said yes to that project */
  async function tiStale(acc) {
    var S = tiS(), list = await dvJoins(), stand = {}, gone = [];
    acc.concat(S.mine).forEach(function (x) { if (x && x.fid) stand[x.fid] = 1; });
    list.forEach(function (j) { if (j.inv && !stand[j.fid]) gone.push(j); });
    for (var i = 0; i < gone.length; i++) {
      var j = gone[i], who = j.inv.who || 'The owner', nx = j.inv.from && j.inv.project ? S.mine.filter(function (x) { return String(x.from_email || '').toLowerCase() === j.inv.from && x.project === j.inv.project; })[0] : null;
      await dvJoinDrop(j.fid);
      if (nx) {
        var r = await syCall('POST', '/v1/invites/' + nx.id + '/accept');
        if (syOk(r)) { S.mine = S.mine.filter(function (v) { return v.id !== nx.id; }); await dvJoinPend(nx); showToast(who + ' set up ' + nx.project + ' again. Your joining card now follows the new invitation.'); continue; }
      }
      showToast(who + ' took back the invitation' + (j.inv.project ? ' to ' + j.inv.project : '') + '.');
    }
    if (gone.length) tiPaint();
  }
  /* v114 (73): on the device of someone taken off a project kept in Drive. The server lists it once the Owner's device has taken their
     access away; the project, its keys and its record go from this device, and the bell says who stopped sharing it. The list is taken
     as the Owner's word only when the Owner's account is the one that said so, or Google Drive no longer lets this device read the
     Owner's file: anyone else's list takes nothing off */
  async function tiGone(list) {
    var S = tiS();
    S.gone = list.filter(function (x) { return x && x.id && /^[\w-]{6,80}$/.test(x.fid || ''); });
    for (var i = 0; i < S.gone.length; i++) {
      var x = S.gone[i], ps = PROJECTS.filter(function (p) { return p.dv && p.dv.fid === x.fid && tiTheirs(p); });   /* v115 (75): an Owner's copy of someone else's too */
      for (var j = 0; j < ps.length; j++) if (await tiGoneSure(ps[j], x)) await tiDrop(ps[j], x);
      if (!ps.length && (await dvJoins()).some(function (jn) { return jn.fid === x.fid; })) await dvJoinDrop(x.fid);
    }
  }
  async function tiGoneSure(p, x) {
    if (x.from_email && x.from_email === String(p.dv.owner || '').toLowerCase()) return true;
    if (!dvOn() || !p.dv.oid) return false;
    var m = await drvMeta(p.dv.oid);
    return !!m.err && (m.status === 404 || m.status === 403);
  }
  /* in the Drive round's queue, so a round under way does not write the record back */
  function tiDrop(p, x) {
    var D = dvS(), job = D.q.then(async function () {
      var i = PROJECTS.indexOf(p); if (i < 0) return;
      var pid = p.dv.pid, c = p.cid ? byId(p.cid) : null, nm = p.n || x.project || 'The project';
      PROJECTS.splice(i, 1);
      RECENT = RECENT.filter(function (r) { return r.id !== p.id; });
      TD.items = TD.items.filter(function (t) { return t.pid !== p.id; });
      notes.forEach(function (n) { if (n.pid === p.id) delete n.pid; });
      if (c) {
        var ci = (c.projects || []).map(function (y) { return y.pid; }).indexOf(p.id); if (ci > -1) { c.projects.splice(ci, 1); refreshRow(c); }
        if (c.dv && !PROJECTS.some(function (q) { return q.cid === c.id; })) removeClient(c.id);   /* the client came with the project */
      }
      delete D.recs[pid]; delete D.keys[pid]; await x8Del('dv:' + pid); await x8Del('dvk:' + pid);
      await dvJoinDrop(x.fid);
      if (pd.p === p) { pd.p = null; pdGoBack(); }
      pdelAfter(); await SDB.save();
      showToast((x.from || x.from_email || 'The owner') + ' stopped sharing ' + nm + ' with you. It is no longer on this device.');
    });
    D.q = job.catch(function () {});
    return job;
  }
  /* v82: accepting an invitation replaces an older card for the same Owner's same project (the folder made anew) */
  async function tiSupersede(x) {
    var from = String(x.from_email || '').toLowerCase(), list = await dvJoins();
    for (var i = 0; i < list.length; i++) { var j = list[i]; if (j.fid !== x.fid && j.inv && j.inv.from && j.inv.from === from && j.inv.project === x.project) await dvJoinDrop(j.fid); }
  }
  function tiPaint() {
    dbNotif();
    if (pd.p && pd.p.dv) dvPaint(pd.p);
    dvJnPaint();
  }
  /* Accept: the join page opens now, while the click still counts as one (a page opened after waiting on the server is blocked) */
  async function tiAccept(id, btn) {
    var S = tiS(), x = S.mine.filter(function (v) { return v.id === id; })[0]; if (!x) return;
    /* api.php 1.28.0 (96): known to have no new client project left this month, and not in this one yet: the plan first, not Google */
    var ql = qtLeft();
    if (x.kind === 'client' && x.role !== 'Viewer' && ql && ql.left === 0 && !PROJECTS.some(function (p) { return p.dv && p.dv.fid === x.fid; })) { showToast(qtFullText(ql)); stGo('plan'); return; }
    if (btn) btn.disabled = true;
    try { window.open(dvJoinUrl(x.fid, x.files), '_blank', 'noopener'); } catch (e) {}
    var r = await syCall('POST', '/v1/invites/' + id + '/accept');
    if (!syOk(r) && r.status !== 404) { if (btn) btn.disabled = false; showToast(syMsg(r)); return; }
    S.mine = S.mine.filter(function (v) { return v.id !== id; });
    await tiSupersede(x);
    await dvJoinPend(x);
    tiPaint();
    showToast('Accepted. In the page that opened, sign in to Google and pick the project’s files.');
  }
  async function tiDecline(id, btn) {
    var S = tiS(), x = S.mine.filter(function (v) { return v.id === id; })[0]; if (!x) return;
    if (btn) btn.disabled = true;
    var r = await syCall('POST', '/v1/invites/' + id + '/decline');
    if (!syOk(r) && r.status !== 404) { if (btn) btn.disabled = false; showToast(syMsg(r)); return; }
    S.mine = S.mine.filter(function (v) { return v.id !== id; });
    tiPaint();
    showToast('Declined. ' + (x.from || x.from_email) + ' can invite you again.');
  }
  /* the bell: an invitation waiting for an answer, with its buttons; on the Owner's device, each answer */
  function tiNotes(out) {
    tiS().mine.forEach(function (x) {
      out.push({ key: 'inv:' + x.id + ':' + x.sent_at, tone: '', title: (x.from || x.from_email) + ' invited you to ' + (x.project || 'a project'), text: (x.role === 'Viewer' ? 'You would join as a Viewer. ' : 'You would join as an Editor. ') + 'Sent from ' + x.from_email + '.', meta: 'Team', ts: x.sent_at, go: null, inv: x.id });
    });
    /* v114 (73): taken off a project */
    (tiS().gone || []).forEach(function (x) {
      out.push({ key: 'invgone:' + x.id + ':' + x.at, tone: 'warn', title: (x.from || x.from_email) + ' stopped sharing ' + (x.project || 'a project') + ' with you', text: 'You can no longer open it, and it is no longer on your devices. Sent from ' + x.from_email + '.', meta: 'Team', ts: x.at, go: null });
    });
    PROJECTS.forEach(function (p) {
      if (!p.dv || dvRole(p) !== 'Owner') return;
      (p.team || []).forEach(function (m) {
        var x = m && m.e && tiSent(p, m.e); if (!x) return;
        if (x.accepted_at) out.push({ key: 'invok:' + p.dv.fid + ':' + x.email + ':' + x.accepted_at, tone: '', title: m.n + ' accepted your invitation', text: p.n + '. They open it on their device next.', meta: dbName(p), ts: x.accepted_at, go: { pid: p.id, tab: 'team', f: '', cr: '' } });
        else if (x.declined_at) out.push({ key: 'invno:' + p.dv.fid + ':' + x.email + ':' + x.declined_at, tone: 'warn', title: m.n + ' declined your invitation', text: p.n + '. You can resend it from Team.', meta: dbName(p), ts: x.declined_at, go: { pid: p.id, tab: 'team', f: '', cr: '' } });
      });
    });
  }
  function tiActsHTML(id) {
    return '<div class="n-ans"><button type="button" class="btn-primary btn-sm" data-ti="acc" data-id="' + id + '">Accept</button><button type="button" class="btn-ghost btn-sm" data-ti="dec" data-id="' + id + '">Decline</button></div>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ti]'); if (!b || b.disabled) return;
    var id = +b.getAttribute('data-id');
    if (b.getAttribute('data-ti') === 'acc') tiAccept(id, b); else tiDecline(id, b);
  });
  /* when the app starts, every minute while it is in view, when it comes back into view, and when the bell opens */
  setTimeout(tiPull, 2500);
  setInterval(function () { if (document.visibilityState === 'visible') tiPull(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tiPull(); });
  document.getElementById('bell').addEventListener('click', function () { tiPull(); });
  if (sdTest()) window.__ti = { pull: tiPull, state: function () { return tiS(); }, withdraw: tiWithdraw };
