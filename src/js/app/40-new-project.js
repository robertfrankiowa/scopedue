  /* ---------- new project ---------- */
  var npjForm = document.getElementById('npj'), npjN = document.getElementById('npj-n'), npjC = document.getElementById('npj-c'), npjT = document.getElementById('npj-t');
  var npjD = document.getElementById('npj-d'), npjX = document.getElementById('npj-x'), npjKinds = document.getElementById('npj-kinds'), npjNote = document.getElementById('npj-note');
  var npjPrev = document.getElementById('npj-prev'), npjAv = document.getElementById('npj-av'), npjPn = document.getElementById('npj-pn'), npjPs = document.getElementById('npj-ps');
  var npjKind = 'client';
  /* v68: the client portal's theme for this project; a new one starts on the theme chosen last time */
  var npjPt = ptPicker(document.getElementById('npj-pt'), { compact: true, label: 'Portal theme' }), PT_LAST = 'sd-ptheme-last';
  /* v74: a private project's language (p.lang): what AI research writes its answers in. Starts on the language ScopeDue is in */
  var npjL = document.getElementById('npj-l');
  /* CONTRACT 101: a client project's currency; it starts on the one picked last (pdCurNext) */
  var npjCur = document.getElementById('npj-cur');
  function npjLang() { var b = npjL.querySelector('button[aria-pressed="true"]'); return b ? b.getAttribute('data-f') : appLang(); }
  npjL.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (b) setPressed(npjL, b.getAttribute('data-f')); });
  function ptLast() { var v = ''; try { v = localStorage.getItem(PT_LAST) || ''; } catch (e) {} return ptValid(v) ? v : ''; }
  function npjCl() { return CLIENTS.filter(function (c) { return c.status !== 'past'; }); }
  function npjFirst(t) { var m = t.match(/[\p{L}\p{N}]/u); return m ? m[0].toUpperCase() : '?'; }
  function npjErr(id, msg) {
    var f = document.getElementById(id), c = f.querySelector('input, select');
    if (msg) { f.setAttribute('data-err', ''); f.querySelector('.err').textContent = msg; c.setAttribute('aria-invalid', 'true'); }
    else { f.removeAttribute('data-err'); f.querySelector('.err').textContent = ''; c.removeAttribute('aria-invalid'); }
  }
  function npjPreview() {
    var n = npjN.value.replace(/\s+/g, ' ').trim(), c = npjKind === 'client' ? byId(npjC.value) : null;
    npjPrev.classList.toggle('empty', !n);
    npjPn.textContent = n || 'Project name';
    var ini = n ? npjFirst(n) : '?';
    if (npjAv.textContent !== ini) { npjAv.textContent = ini; if (!reduced) { npjAv.classList.add('tick'); setTimeout(function () { npjAv.classList.remove('tick'); }, 180); } }
    npjAv.classList.toggle('priv', npjKind !== 'client');
    npjPs.textContent = n ? (npjKind === 'client' ? 'Client project' : npjKind === 'internal' ? 'Internal project' : 'Product') + ' · Solo' + (c ? ' · ' + c.name : '') : 'Appears here as you type';
  }
  /* v76: a client project's portal is on ScopeDue's server, and it needs Google Drive: nothing is created before both (38.6) */
  function npjNeeds() { return npjKind === 'client' && !(drSyEmail() && dvOn()); }
  function npjGatePaint() {
    var g = document.getElementById('npj-gate'), need = npjNeeds();
    g.hidden = !need;
    if (need) {
      g.innerHTML = drGateHTML({ in: 'A client project has its portal on ScopeDue’s server: your client opens it, approves and asks for changes there. Sign in, then connect Google Drive.',
        ext: 'A client project needs your ScopeDue account and Google Drive. Google Drive connects in the ScopeDue extension in Chrome: create client projects there.',
        drive: 'A client project needs Google Drive as well as its portal on ScopeDue’s server. Connect the Google account you sign in to ScopeDue with (' + esc(drSyEmail()) + '), then create the project.' });
      document.getElementById('f-npj-c').hidden = true; document.getElementById('f-npj-pt').hidden = true; document.getElementById('f-npj-cur').hidden = true;
    }
    npjNote.hidden = need; document.getElementById('npj-go').disabled = need;
  }
  function npjSetKind(k, focus) {
    npjKind = k;
    [].forEach.call(npjKinds.querySelectorAll('.npj-kind'), function (b) {
      var on = b.getAttribute('data-k') === k;
      b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    document.getElementById('f-npj-c').hidden = k !== 'client';
    document.getElementById('f-npj-t').hidden = k === 'client';
    document.getElementById('f-npj-pt').hidden = k !== 'client';
    document.getElementById('f-npj-cur').hidden = k !== 'client';
    document.getElementById('f-npj-l').hidden = k === 'client';   /* a client project speaks its client's language */
    if (k !== 'client') moveThumb(npjL, false);   /* measured once it is shown */
    npjErr('f-npj-c', '');
    npjNote.textContent = k === 'client' ? 'Starts solo, with an empty Scope draft that stays on this device until you issue it.' : k === 'internal' ? 'Starts solo, with no validation step. Make it a product from the project menu if it ever needs one.' : 'Starts solo, with a test to run before you build. Add teammates from the project menu whenever you need them.';
    /* v69: a client project needs a client; with none yet, the way to add one is right here */
    if (k === 'client' && !npjCl().length) npjNote.insertAdjacentHTML('beforeend', '<br><button type="button" class="btn-ghost btn-sm npj-add" data-xa="newc">' + IC('plus') + 'Add a client</button>');
    npjGatePaint(); npjQtMsg = ''; npjQtPaint();
    npjPreview();
  }
  /* v69: someone working on their own projects sees their kinds first, and Client last */
  function npjOrder() {
    var cl = npjKinds.querySelector('[data-k="client"]'), own = sdFocus() === 'own';
    if (own) npjKinds.appendChild(cl); else npjKinds.insertBefore(cl, npjKinds.firstChild);
  }
  function npjOnOpen() {
    npjForm.reset();
    var cs = npjCl(), pre = curView === 'client' && cdCur && cs.indexOf(cdCur) > -1 ? cdCur.id : '';
    npjC.innerHTML = '<option value="">' + (cs.length ? 'Choose a client' : 'No current clients yet') + '</option>' + cs.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    npjC.disabled = !cs.length; npjC.value = pre;
    npjErr('f-npj-n', ''); npjErr('f-npj-c', '');
    npjPt.tone(ptTone()); npjPt.set(ptLast()); setPressed(npjL, appLang());
    npjCur.innerHTML = sdCurOptions(pdCurNext());
    npjOrder();
    /* opened from a client, or with clients and everything a client project needs: Client; else a Product, which works right away */
    npjSetKind(pre || (cs.length && sdFocus() !== 'own' && drSyEmail() && dvOn()) ? 'client' : 'private');
    if (blOn() && Date.now() - BL.at > 30000) blPull();   /* 1.28.0 (96): this month's count, for the line above Create */
    return '#npj-n';
  }
  function npjAt(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return 0;
    var d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  function npjDue(v) { var at = npjAt(v); return at ? dueInfo(at) : null; }
  function npjValidate() {
    var n = npjN.value.replace(/\s+/g, ' ').trim();
    var en = !n ? 'Give the project a name.' : PROJECTS.some(function (p) { return fold(p.n) === fold(n); }) ? 'You already have a project with this name.' : '';
    var ec = npjKind === 'client' && !npjC.value ? (npjCl().length ? 'Choose the client this project is for.' : 'Add a client first. Client projects are shared through their portal.') : '';
    npjErr('f-npj-n', en); npjErr('f-npj-c', ec);
    var first = en ? npjN : ec ? npjC : null;
    if (first) { if (!first.disabled) first.focus(); return false; }
    return true;
  }
  function npjCounts() {
    var pr = PROJECTS.filter(function (p) { return p.kind === 'private'; }).length, cl = PROJECTS.length - pr;
    var tm = PROJECTS.filter(function (p) { return p.team.length; }).length, so = PROJECTS.length - tm;
    function set(sel, n) { var el = document.querySelector(sel); if (el) tween(el, n); }
    set('#pl-type [data-f="all"] .n', PROJECTS.length);
    set('#pl-size [data-f="solo"] .n', so); set('#pl-size [data-f="team"] .n', tm);
    set('.kpi[data-open-drawer="projects"] .n', PROJECTS.length);
    var nb = document.querySelector('.nav-i[data-view="projects"] .badge'); if (nb) { nb.textContent = PROJECTS.length; nb.setAttribute('aria-label', PROJECTS.length + ' projects'); }
    /* v126: the three kinds by the names each project's own page uses (Client project, Product, Internal project), each part its own text */
    var sm = document.querySelector('.kpi[data-open-drawer="projects"] small');
    if (sm) {
      var kc = { client: 0, product: 0, internal: 0 }; PROJECTS.forEach(function (p) { kc[pdMode(p)]++; });
      sm.innerHTML = [['client', 'Client'], ['product', 'Product'], ['internal', 'Internal']].filter(function (k) { return kc[k[0]]; }).map(function (k) { return '<span>' + kc[k[0]] + ' ' + k[1] + '</span>'; }).join(' · ');
      sm.parentNode.parentNode.classList.toggle('is-zero', !PROJECTS.length);
    }
    var sub = document.getElementById('proj-sub'); if (sub) sub.textContent = PROJECTS.length + (PROJECTS.length === 1 ? ' project' : ' projects') + ', most recently updated first.';
    /* v129: the drawer filters by the three kinds; a kind with no project has no button; search shows from six projects */
    var km = { client: 0, product: 0, internal: 0 }; PROJECTS.forEach(function (p) { km[pdMode(p)]++; });
    set('#proj-seg [data-f="all"] .n', PROJECTS.length);
    /* the Projects page filters by the same three; a button that goes while pressed hands back to All */
    ['#proj-seg', '#pl-type'].forEach(function (sg) {
      ['client', 'product', 'internal'].forEach(function (k) {
        set(sg + ' [data-f="' + k + '"] .n', km[k]); var bt = document.querySelector(sg + ' [data-f="' + k + '"]'); if (!bt) return;
        bt.hidden = !km[k]; if (bt.hidden && bt.getAttribute('aria-pressed') === 'true') document.querySelector(sg + ' [data-f="all"]').click();
      });
    });
    var pse = document.querySelector('#drawer-projects .dr-search'); if (pse) { pse.hidden = PROJECTS.length < 6; if (pse.hidden && projQ.value) { projQ.value = ''; applyProj(); } }
    if (projDrawer) projCount();
    [].forEach.call(document.querySelectorAll('#pl-type, #pl-size, #proj-seg'), function (sg) { moveThumb(sg, false); });
  }
  function npjNewId(n) {
    var base = slug(n).slice(0, 48).replace(/-+$/, '') || 'project'; if (base === 'client') base = 'project';
    var id = base, k = 2; while (pdById(id)) id = base + '-' + (k++);
    return id;
  }
  /* api.php 1.28.0 (96): a client project takes one of the month's places on the free plan. The drawer says how many are left before
     Create, and why nothing was made when none is: the paid plan, or the next month */
  var npjQt = document.getElementById('npj-qt'), npjQtMsg = '', npjBusy = false;
  function npjQtPaint() {
    if (!npjQt) return;
    var q = npjKind === 'client' && !npjNeeds() ? qtLeft() : null, h = '';
    if (npjQtMsg === 'full' || (q && q.left === 0)) {
      h = '<span>' + esc(qtFullText(q)) + '</span>' + (BL.plan && BL.plan.buy ? '<span class="npj-qt-a"><button type="button" class="btn-primary btn-sm" data-npj-qt="buy">Upgrade for ' + blMoney(BL.plan) + ' a month</button><button type="button" class="btn-ghost btn-sm" data-npj-qt="plan">See your plan</button></span>' : '');
    } else if (npjQtMsg) h = '<span>' + esc(npjQtMsg) + '</span>';
    else if (q) h = '<span>' + (q.left === 1 ? 'This is the last of the 5 new client projects your free plan has this month.' : 'This takes 1 of the ' + q.left + ' new client projects your free plan has left this month.') + '</span>';
    npjQt.hidden = !h; npjQt.classList.toggle('bad', npjQtMsg !== '' || !!(q && q.left === 0));
    if (npjQt._h !== h) { npjQt._h = h; npjQt.innerHTML = h; }
  }
  if (npjQt) npjQt.addEventListener('click', function (e) {
    var b = e.target.closest('[data-npj-qt]'); if (!b) return;
    if (b.getAttribute('data-npj-qt') === 'buy') blGo('buy'); else { closeDrawer(); stGo('plan'); }
  });
  async function npjCreate() {
    if (npjBusy) return;
    if (npjNeeds()) { npjGatePaint(); return; }
    if (!npjValidate()) return;
    if (npjKind === 'client') {   /* the place first: nothing is made here unless the server has one for it */
      var go = document.getElementById('npj-go'), q;
      npjBusy = true; go.disabled = true; go.setAttribute('aria-busy', 'true'); npjQtMsg = ''; npjQtPaint();
      q = await qtClaim('own', npjNewId(npjN.value.replace(/\s+/g, ' ').trim()));
      npjBusy = false; go.disabled = false; go.removeAttribute('aria-busy');
      if (!q.ok) {
        npjQtMsg = q.full ? 'full' : q.out ? 'Sign in to ScopeDue first: a client project takes one of your account’s new client projects for the month.' : 'Could not reach ScopeDue, so nothing was created. Try again in a moment.';
        npjQtPaint(); return;
      }
    }
    npjMake();
  }
  function npjMake() {
    var n = npjN.value.replace(/\s+/g, ' ').trim(), kind = npjKind === 'client' ? 'client' : 'private', mode = npjKind === 'internal' ? 'internal' : 'product', c = kind === 'client' ? byId(npjC.value) : null;
    var thesis = kind === 'private' ? npjT.value.replace(/\s+/g, ' ').trim() : '', nx = npjX.value.replace(/\s+/g, ' ').trim();
    var id = npjNewId(n);
    var p = { id: id, n: n, m: npjFirst(n), kind: kind, team: [], phase: 1, dueAt: npjAt(npjD.value), due: npjDue(npjD.value), upd: 'just now', updT: Date.now(), focus: '', next: nx, nextAt: nx ? 'just now' : '', ctx: [], mentions: [] };
    p.log = []; if (kind === 'private') pdNote(p, 'You created ' + n);
    if (c) { p.cid = c.id; p.ptheme = npjPt.value(); try { localStorage.setItem(PT_LAST, p.ptheme); } catch (e) {} p.cur = sdCur(npjCur.value); pdCurKeep(p.cur); }
    else { p.mode = mode; p.lang = npjLang(); p.thesis = thesis; p.glance = { inn: 0, out: 0, parked: 0, drift: 0 }; p.gaps = 0; p.open = 0; p.local = []; }
    if (c) { pdInitClient(p); pdDerive(p); } else { prvInit(p); if (mode === 'product') p.pv.mk = 1; if (thesis) p.pv.th.push({ ts: Date.now(), before: '', after: thesis }); prvDerive(p); }
    var r = { p: p, c: c, needs: [] };
    PROJECTS.unshift(p);
    /* Projects list */
    lists.projects.stop(); pdRender(p); lists.projects.reset(false);
    /* client */
    if (c) {
      var act = c.projects.filter(function (x) { return !x.done; });
      if (act.length === 1) {
        c.needs.forEach(function (x) { if (!x.pj) { x.pj = act[0].pid; r.needs.push(x); } });
        var first = pdById(act[0].pid); r.logs = [];
        if (first) c.log.forEach(function (e) { if (!e[4]) { e[4] = first.id; r.logs.push(e); } });
      }
      r.cProj = { n: p.n, pid: p.id, m: p.m, step: 1, phase: PD_PHASES[0], date: p.due ? p.due.d : 'No deadline' };
      if (p.due && p.due.chip) { r.cProj.chip = p.due.chip; r.cProj.chipT = p.due.t; }
      c.projects.unshift(r.cProj);
      r.cLog = ['you', 'You created ' + n, 'Client project · Solo', 'Just now', id]; c.log.unshift(r.cLog);
      r.cAct = c.act; c.act = ['Just now', 'Project created'];
      refreshRow(c);
    }
    npjCounts(); dueRefresh();
    openProject(id, 'workspace', null);
    var undo = function () { npjUndo(r); };
    showToast('Project created · ' + (n.length > 34 ? n.slice(0, 33) + '…' : n), undo);
  }
  function npjUndo(r) {
    var p = r.p, i = PROJECTS.indexOf(p); if (i > -1) PROJECTS.splice(i, 1);
    RECENT = RECENT.filter(function (x) { return x.id !== p.id; });
    if (r.c) {
      var j = r.c.projects.indexOf(r.cProj); if (j > -1) r.c.projects.splice(j, 1);
      var l = r.c.log.indexOf(r.cLog); if (l > -1) r.c.log.splice(l, 1);
      r.c.act = r.cAct; r.needs.forEach(function (x) { delete x.pj; }); (r.logs || []).forEach(function (e) { e.length = 4; });
      refreshRow(r.c);
    }
    dueRefresh(); dbRecent(); dbPriority();
    if (pd.p === p) { pd.p = null; pdGoBack(); }
    else if (curView === 'client' && r.c && cdCur === r.c) renderClient(r.c, { still: true });
  }
  npjKinds.addEventListener('click', function (e) { var b = e.target.closest('.npj-kind'); if (b) npjSetKind(b.getAttribute('data-k')); });
  npjKinds.addEventListener('keydown', function (e) {
    var bs = [].slice.call(npjKinds.querySelectorAll('.npj-kind')), cur = bs.map(function (b) { return b.getAttribute('data-k'); }).indexOf(npjKind), d = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1; else return;
    e.preventDefault(); npjSetKind(bs[(cur + d + bs.length) % bs.length].getAttribute('data-k'), true);
  });
  npjN.addEventListener('input', function () { if (document.getElementById('f-npj-n').hasAttribute('data-err')) npjErr('f-npj-n', ''); npjPreview(); });
  npjC.addEventListener('change', function () { if (document.getElementById('f-npj-c').hasAttribute('data-err')) npjErr('f-npj-c', ''); npjPreview(); });
  npjForm.addEventListener('submit', function (e) { e.preventDefault(); npjCreate(); });
  npjForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); npjCreate(); } });

  /* ---------- v68: a project's portal theme, changed from its page (the client card) ---------- */
  var ptdPick, ptdSee = document.getElementById('ptd-see'), ptdP = null;
  function ptdLink() { var u = ptSeeUrl(ptdPick.value()); ptdSee.hidden = !u; if (u) ptdSee.setAttribute('href', u); }
  ptdPick = ptPicker(document.getElementById('ptd-pick'), { label: 'Portal theme', change: ptdLink });
  function ptdOnOpen() {
    ptdP = pd.p; if (!ptdP) return;
    ptdPick.tone(ptTone()); ptdPick.set(ptdP.ptheme || '');
    document.getElementById('ptd-sub').textContent = 'How the client portal looks for ' + ptdP.n + '.';
    ptdLink(); if (typeof syPortalBase === 'function') syPortalBase(ptdLink);
    return '#ptd-pick .pt-o[aria-checked="true"]';
  }
  document.getElementById('ptd-go').addEventListener('click', function () {
    var p = ptdP; if (!p) return closeDrawer();
    var was = p.ptheme || '', now = ptdPick.value();
    closeDrawer();
    if (was === now) return;
    var put = function (v) { p.ptheme = v; try { localStorage.setItem(PT_LAST, v); } catch (e) {} if (pd.p === p) pdRerender(); if (typeof syMetaSoon === 'function') syMetaSoon(); };
    put(now);
    showToast('Portal theme saved', function () { put(was); });
  });

  /* ---------- entry points ---------- */
  CLIENTS.forEach(function (c) { c.projects.forEach(function (x) { if (!x.done && !pdById(x.pid) && window.console) console.warn('ScopeDue: client project with no project behind it: ' + x.n); }); });
  viewEls.projects.addEventListener('click', function (e) {
    var a = e.target.closest('.pl-row'); if (!a) return;
    var li = a.closest('.pl-item'), id = li && li.getAttribute('data-id'); if (!id) return;
    e.preventDefault(); openProject(id, 'workspace', a);
  });
  document.addEventListener('click', function (e) {
    var s = e.target.closest('.proj-link[data-pj]');
    if (s) { e.preventDefault(); openProject(s.getAttribute('data-pj'), 'workspace', s); return; }
    var r = e.target.closest('.resume');
    if (r && r.getAttribute('data-pj') && pdById(r.getAttribute('data-pj'))) { e.preventDefault(); openProject(r.getAttribute('data-pj'), r.getAttribute('data-tab') || 'workspace', r); return; }
    var c = e.target.closest('a.cd-pj[data-pj]');
    if (c) { e.preventDefault(); openProject(c.getAttribute('data-pj'), 'workspace', c); return; }
    var nr = e.target.closest('a.row[data-need-pj]');
    if (nr && pdById(nr.getAttribute('data-need-pj'))) {
      e.preventDefault();
      var nt = nr.getAttribute('data-need-tab'), nf = nr.getAttribute('data-need-f'), nc = nr.getAttribute('data-need-cr');
      openProject(nr.getAttribute('data-need-pj'), nt, nr, nc);
      if (nf) pdGo(nt, nf, nc);
    }
  });
  dueRefresh();
