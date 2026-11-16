  /* ---------- v96: deleting a project (CONTRACT.md 42) ----------
     The Owner of a private or client project deletes it from the project menu, after typing its name. An open Viewer portal is
     closed on the server first (as Close the portal, 32.6). A client project on the server leaves the client's portal at once; the
     server keeps its record 30 days for the client to download and emails them so (api.php 1.11.0). A project kept in Google Drive
     asks whether its folder goes to the Drive trash, the team's access taken away first (as someone leaving, 29.18), or stays as it
     is. Undo is offered only when nothing outside this device was touched; once the server or Drive has been asked, it is gone. */
  var PDEL = { p: null, busy: false };
  var pdelF = document.getElementById('pdel-f'), pdelB = document.getElementById('pdel-b'), pdelGo = document.getElementById('pdel-go'), pdelHint = document.getElementById('pdel-hint');
  function pdelCan(p) { return !!p && (p.kind === 'private' || p.kind === 'client') && !p.x8 && x8Role(p) === 'Owner'; }
  function pdelPortal(p) { return !!(p && p.vp && p.vp.on); }
  /* a client project the client portal has: sent to the server by an account (p.sy.slug) */
  function pdelServer(p) { return !!(p && p.kind === 'client' && p.sy && (p.sy.on || p.sy.slug)); }
  /* what stops it before anything is asked: '' when nothing */
  function pdelBlock(p) {
    if ((pdelPortal(p) || pdelServer(p)) && !vpOn()) return pdelServer(p) ? 'Sign in to your ScopeDue account first: the client portal can only be changed from there.' : 'Sign in to your ScopeDue account first: the Viewer portal can only be closed from there.';
    if (pdelServer(p) && p.sy.slug && SY.slug && p.sy.slug !== SY.slug) return 'This project’s client portal is on another ScopeDue account. Sign in to that account to delete it.';
    return '';
  }
  function pdelNorm(s) { return String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function pdelTrash() { var r = pdelF.querySelector('input[name="dv"]:checked'); return !!PDEL.p && !!PDEL.p.dv && (!r || r.value === 'trash'); }
  function pdelUndoable(p) { return !pdelPortal(p) && !pdelServer(p) && !(p.dv && pdelTrash()); }
  function pdelHTML(p) {
    var nn = notes.filter(function (n) { return n.pid === p.id; }).length, h = '<ul class="pdel-l">';
    h += '<li>Its scope, work, decisions, feedback and history are deleted from this device.</li>';
    if (pdelServer(p)) {
      var c = byId(p.cid) || {}, cn = c.name || 'The client';
      h += '<li>' + esc(cn) + ' no longer sees it in their portal, and can no longer reply, approve or accept anything in it.</li>' +
        '<li>Its record on the server (Scope versions, changes, quotes, approvals and deliveries) stays 30 days so they can download it, then it is deleted.</li>' +
        (c.email ? '<li>' + esc(given(c) || cn) + ' gets an email saying so, with a link to download it.</li>' : '');
    }
    if (pdelPortal(p)) h += '<li>The Viewer portal closes. Viewers’ links stop working, and what they sent that has not reached this device is deleted from the server. Approvals they gave stay there as a record.</li>';
    if (nn) h += '<li>' + (nn === 1 ? 'Your quick note about it is deleted, with its reminder.' : 'Your ' + nn + ' quick notes about it are deleted, with their reminders.') + '</li>';
    h += '</ul>';
    var bl = pdelBlock(p);
    if (bl) h += '<p class="pd-note warn">' + esc(bl) + '</p>' + (vpOn() ? '' : '<div class="pde-acts"><button type="button" class="btn-ghost btn-sm" data-pdel="signin">Sign in</button></div>');
    if (p.dv) {
      var tm = Object.keys(p.dv.slots || {}).length;
      h += '<fieldset class="pdel-dv"><legend>Its Google Drive folder</legend><p class="pde-small">ScopeDue / ' + esc(p.n) + '</p>' +
        '<label class="pdel-o"><input type="radio" name="dv" value="trash" checked><span><b>Move it to the Drive trash</b><small>' +
        (tm ? '<span>Everyone on the team loses access to Team · ' + esc(p.n) + '.</span> <span>Their ScopeDue keeps the copy it has, which no longer updates.</span> <span>Files an Editor added stay in their own Drive.</span> ' : '') +
        '<span>Private goes with it, with your own files of the project.</span> <span>Google empties the trash after 30 days.</span></small></span></label>' +
        '<label class="pdel-o"><input type="radio" name="dv" value="keep"><span><b>Leave the folder</b><small>' + (tm ? 'Nothing in Drive changes: the team keeps access, your other devices keep the project, and Settings › Google Drive can open it here again.' : 'Nothing in Drive changes: your other devices keep the project, and Settings › Google Drive can open it here again.') + '</small></span></label></fieldset>';
    }
    h += '<div class="fld st"><label for="pdel-n">Type the project name to confirm</label><input id="pdel-n" name="n" autocomplete="off" spellcheck="false" maxlength="200" placeholder="' + esc(p.n) + '"></div>';
    return h + '<p class="pd-note warn" id="pdel-err" role="alert" hidden></p>';
  }
  function pdelSay() {
    var p = PDEL.p; if (!p) return;
    var inp = document.getElementById('pdel-n'), blocked = !!pdelBlock(p);
    pdelGo.disabled = PDEL.busy || blocked || !inp || pdelNorm(inp.value) !== pdelNorm(p.n);
    pdelHint.textContent = pdelUndoable(p) ? 'You can undo it for a few seconds' : 'This cannot be undone';
  }
  function pdelErr(t) { var e = document.getElementById('pdel-err'); if (!e) return; e.textContent = t || ''; e.hidden = !t; }
  function pdelOnOpen() {
    var p = PDEL.p = pd.p; if (!p) return;
    PDEL.busy = false; pdelGo.textContent = 'Delete project';
    document.getElementById('pdel-title').textContent = 'Delete ' + p.n;
    document.getElementById('pdel-sub').textContent = 'Only you can do this, as its Owner.';
    pdelB.innerHTML = pdelHTML(p); pdelSay();
    return '#pdel-n';
  }
  function pdelOpen(p, trigger) { if (!pdelCan(p)) { x8No(p); return; } openDrawer('pdel', trigger); }
  /* the folder goes: the team's access first, then Team and the project's folder to the trash, the invitations with it (38).
     What Drive said when it could not, or '' */
  async function pdelDrive(p) {
    var d = p.dv, S = dvS();
    var job = S.q.then(async function () {
      var ems = Object.keys(d.slots || {});
      for (var i = 0; i < ems.length; i++) await drvUnshare(d.fid, ems[i]);
      var t = await drvTrash(d.fid);
      if (t.err && t.status !== 404) return t.err;
      if (d.root) { var r = await drvTrash(d.root); if (r.err && r.status !== 404) return r.err; }
      await x8Del('dv:' + d.pid); await x8Del('dvk:' + d.pid); delete S.recs[d.pid]; delete S.keys[d.pid];
      tiWithdraw(d.fid);
      return '';
    });
    S.q = job.catch(function () {});
    return job;
  }
  async function pdelRun() {
    var p = PDEL.p, inp = document.getElementById('pdel-n'); if (!p || PDEL.busy) return;
    if (!inp || pdelNorm(inp.value) !== pdelNorm(p.n)) { pdelErr('Type the project name as it is shown.'); if (inp) inp.focus(); return; }
    var portal = pdelPortal(p), server = pdelServer(p), trash = !!p.dv && pdelTrash(), bl = pdelBlock(p);
    if (bl) { pdelErr(bl); return; }
    PDEL.busy = true; pdelErr(''); pdelSay(); pdelGo.textContent = 'Deleting…';
    var stop = function (t) { PDEL.busy = false; pdelGo.textContent = 'Delete project'; pdelSay(); pdelErr(t); };
    /* Drive is checked before anything is asked of the server, so a missing connection stops it with nothing changed */
    if (trash) {
      if (!dvOn()) await drRefresh(true);
      if (!dvOn()) return stop('Connect Google Drive to move its folder to the trash, or choose Leave the folder. Nothing was deleted.');
      if (p.dv.owner && p.dv.owner !== dvMe()) return stop('Google Drive is connected to ' + dvMe() + ', and this folder is in the Drive of ' + p.dv.owner + '. Nothing was deleted.');
    }
    if (portal) {
      var r = await syCall('DELETE', '/v1/vprojects/' + vpRef(p));
      if (!syOk(r) && r.status !== 404) return stop(syMsg(r) + ' Nothing was deleted.');
      p.vp.on = false; p.vp.h = ''; p.vp.vw = {}; pdNote(p, 'You closed the Viewer portal'); SDB.soon(40);
    }
    if (server) {
      var rs = await syCall('DELETE', '/v1/projects/' + p.id);   /* 404: the server never had it */
      if (!syOk(rs) && rs.status !== 404) return stop(syMsg(rs) + ' Nothing was deleted.');
    }
    if (trash) {
      var e = await pdelDrive(p);
      if (e) return stop((portal ? 'The Viewer portal is closed. ' : server ? 'It has left the client portal. ' : '') + 'Could not move the folder to the Drive trash. ' + e + ' The project was not deleted.');
    }
    PDEL.busy = false;
    pdelDrop(p, !portal && !server && !trash, { portal: portal, server: server, trash: trash });
  }
  function pdelAfter() { pdRender(); dueRefresh(); dbRecent(); dbPriority(); mwBadge(); caBadge(); dbWaiting(); dbNotif(); renderNotes(); }
  function pdelDrop(p, canUndo, did) {
    var i = PROJECTS.indexOf(p); if (i < 0) return;
    var nm = p.n.length > 34 ? p.n.slice(0, 33) + '…' : p.n, linked = notes.filter(function (n) { return n.pid === p.id; });
    var c = p.kind === 'client' ? byId(p.cid) : null, ci = c ? c.projects.map(function (x) { return x.pid; }).indexOf(p.id) : -1, cp = ci > -1 ? c.projects[ci] : null;
    var was = { recent: RECENT.filter(function (x) { return x.id === p.id; }), td: TD.items.filter(function (x) { return x.pid === p.id; }) };
    if (cp) { c.projects.splice(ci, 1); refreshRow(c); }   /* the client stays, with its history; its page no longer lists the project */
    PROJECTS.splice(i, 1);
    RECENT = RECENT.filter(function (x) { return x.id !== p.id; });
    TD.items = TD.items.filter(function (x) { return x.pid !== p.id; });
    var at = linked.map(function (n) { return notes.indexOf(n); });   /* its quick notes go with it, and their reminders */
    for (var k = notes.length - 1; k >= 0; k--) if (notes[k].pid === p.id) notes.splice(k, 1);
    closeDrawer(true); PDEL.p = null;
    if (pd.p === p) { pd.p = null; pdGoBack(); }
    pdelAfter(); SDB.soon(40);
    if (!canUndo) {
      showToast('Project deleted · ' + nm + (did.server ? (did.trash ? '. It left the client portal, its record stays there 30 days, and its folder is in your Drive trash.' : '. It left the client portal; its record stays there 30 days.') :
        did.portal && did.trash ? '. Its portal is closed and its folder is in your Drive trash.' : did.portal ? '. Its portal is closed.' : '. Its folder is in your Drive trash.'));
      return;
    }
    showToast('Project deleted · ' + nm, function () {
      if (PROJECTS.indexOf(p) > -1) return;
      PROJECTS.splice(Math.min(i, PROJECTS.length), 0, p);
      RECENT = was.recent.concat(RECENT); TD.items = TD.items.concat(was.td);
      linked.forEach(function (n, j) { if (notes.indexOf(n) < 0) notes.splice(Math.min(at[j], notes.length), 0, n); });
      if (cp && c.projects.indexOf(cp) < 0) { c.projects.splice(Math.min(ci, c.projects.length), 0, cp); refreshRow(c); }
      pdelAfter(); SDB.soon(40); openProject(p.id, 'workspace', null);
    });
  }
  pdelF.addEventListener('input', function () { pdelErr(''); pdelSay(); });
  pdelF.addEventListener('change', pdelSay);
  pdelF.addEventListener('submit', function (e) { e.preventDefault(); pdelRun(); });
  pdelB.addEventListener('click', function (e) {
    var a = e.target.closest('[data-pdel="signin"]'); if (!a) return;
    closeDrawer(true); stGo('portal'); openDrawer('sync', pdMore);
  });
