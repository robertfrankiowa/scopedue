  /* ---------- scope + change: actions ---------- */
  function pdSegs() { [].forEach.call(pdPanel.querySelectorAll('.seg'), function (s) { moveThumb(s, false); }); }
  function pdItById(p, id) { return p.sc.items.filter(function (x) { return x.id === id; })[0]; }
  function pdItCancel() {
    var id = pd.ie, sec = pd.as; pd.ie = null; pd.as = null;
    pdRerender(id ? '[data-it="' + id + '"] [data-pd="itedit"]' : '[data-pd="itadd"][data-sec="' + sec + '"]');
  }
  function pdItSave(form) {
    var p = pd.p, id = form.getAttribute('data-id'), sec = form.getAttribute('data-sec');
    var t = form.elements.t.value.replace(/\s+/g, ' ').trim(), d = form.elements.d ? form.elements.d.value.replace(/\s+/g, ' ').trim() : '';
    if (!t) { form.setAttribute('data-err', ''); form.elements.t.focus(); return; }
    if (agDraftV2(p)) {   // an item on the agreement: dates, shares, Done when and its milestone are part of it
      var cur0 = id ? pdItById(p, id) : null; if (id && !cur0) return;
      var tmp = cur0 ? JSON.parse(JSON.stringify(cur0)) : { id: '', sec: sec, t: t, d: '', cr: '', ok: '', m: '', pay: null }; tmp.t = t;
      if (agItRead(form, sec, tmp)) return;
      var w7v = cur0 && cur0.t !== t ? x7Warn(p, id) : '';
      var xv = cur0 || pdsIt(sec, t, ''); Object.keys(tmp).forEach(function (k) { if (k !== 'id') xv[k] = tmp[k]; });
      if (w7v) setTimeout(function () { showToast(w7v); }, 0);
      if (!cur0) p.sc.items.push(xv);
      if (sec === 'tl') agSortMs(p);
      pd.ie = null; pdAfterScope(p); pdRerender(cur0 ? '[data-it="' + id + '"] [data-pd="itedit"]' : null);
      return;
    }
    if (id) {
      var x = pdItById(p, id), w7 = x && x.t !== t ? x7Warn(p, id) : ''; if (x) { x.t = t; if (form.elements.d) x.d = d; }
      pd.ie = null; pdAfterScope(p); pdRerender('[data-it="' + id + '"] [data-pd="itedit"]');
      if (w7) showToast(w7);
    } else {
      p.sc.items.push(pdsIt(sec, t, d)); pdAfterScope(p); pdRerender();
    }
  }
  function pdItRm(id) {
    var p = pd.p, i = p.sc.items.map(function (x) { return x.id; }).indexOf(id), x = p.sc.items[i]; if (!x) return;
    var inBase = pdBaseItems(p).some(function (b) { return b.id === id; });
    var w7r = x7Warn(p, id, 'rm');
    if (inBase) { x.rm = true; pdAfterScope(p); pdRerender('[data-it="' + id + '"] [data-pd="itundo"]'); if (w7r) showToast(w7r); return; }
    p.sc.items.splice(i, 1); pdAfterScope(p); pdRerender('[data-pd="itadd"][data-sec="' + x.sec + '"]');
    var undo = function () { p.sc.items.splice(i, 0, x); pdAfterScope(p); undone(p, 'scope'); };
    showToast(w7r || 'Removed from the draft', undo);
  }
  function pdItUndo(id) {
    var x = pdItById(pd.p, id); if (!x) return;
    x.rm = false; pdAfterScope(pd.p); pdRerender('[data-it="' + id + '"] [data-pd="itedit"]');
  }
  function pdDiscard() {
    var p = pd.p, old = p.sc.items, oldT = p.sc.terms, bt = pdTermsOf(pdLatest(p)); p.sc.items = pdsCl(pdBaseItems(p)); p.sc.terms = JSON.parse(JSON.stringify(bt)); p.sc.te = false; pd.ie = null; pd.as = null;
    pdAfterScope(p); pdRerender();
    var undo = function () { p.sc.items = old; p.sc.terms = oldT; pdAfterScope(p); undone(p, 'scope'); };
    showToast('Draft changes discarded', undo);
  }
  /* folding an approved change into the draft carries its extra days onto the milestones it moves, so Expected delivery does not shrink */
  function pdCrToScope(c) {
    var p = pd.p, l = pdLatest(p), item = pdsIt('in', c.t, '', c.id), q = smPriced(c), before = JSON.stringify(p.sc.items), moved = agFoldDates(p, c);
    if (agDraftV2(p)) { item.ok = ''; item.m = (q && q.m) || ''; item.pay = null; }
    p.sc.items.push(item); pdAfterScope(p); pdRerender('[data-pd="toscope"]');
    var undo = function () { p.sc.items = JSON.parse(before); pdAfterScope(p); undone(p, 'change'); };
    showToast('Added to the Scope v' + ((l ? l.v : 0) + 1) + ' draft' + (moved ? '. ' + moved : ''), undo);
  }
  function agFoldDates(p, c) {
    var q = smPriced(c), days = q ? q.days || 0 : 0, tl = p.sc.items.filter(function (x) { return x.sec === 'tl' && !x.rm; }), i, t = -1, names = [];
    if (!days || !tl.length) return '';
    if (agDraftV2(p)) {
      tl.forEach(function (x, j) { if (x.id === q.m) t = j; }); if (t < 0) t = tl.length - 1;
      for (i = t; i < tl.length; i++) if (smIsoOk(tl[i].d)) { tl[i].d = smAddDays(tl[i].d, days); names.push(tl[i].t); }
      return names.length ? names.join(', ') + (names.length === 1 ? ' moves ' : ' move ') + agDaysW(days) + '.' : '';
    }
    for (i = tl.length - 1; i >= 0; i--) { var ms = pdMs(tl[i].d); if (ms != null) { tl[i].d = dayLbl(pdShift(ms, days)); return tl[i].t + ' moves to ' + tl[i].d + '.'; } }
    return '';
  }
  function agSortMs(p) {
    var idx = [], tl = [];
    p.sc.items.forEach(function (x, i) { if (x.sec === 'tl') { idx.push(i); tl.push(x); } });
    tl.sort(function (a, b) { return (smIsoOk(a.d) ? a.d : '9') < (smIsoOk(b.d) ? b.d : '9') ? -1 : (smIsoOk(a.d) ? a.d : '9') > (smIsoOk(b.d) ? b.d : '9') ? 1 : 0; });
    idx.forEach(function (i, j) { p.sc.items[i] = tl[j]; });
  }

  /* issue */
  var disD = document.getElementById('drawer-issue'), disOk = document.getElementById('dis-ok'), disGo = document.getElementById('dis-go');
  function isOnOpen() {
    var p = pd.p, l = pdLatest(p), n = (l ? l.v : 0) + 1, c = byId(p.cid) || {}, g = given(c) || 'The client';
    var cnt = function (sec) { return p.sc.items.filter(function (x) { return !x.rm && x.sec === sec; }).length; };
    document.getElementById('dis-title').textContent = 'Issue Scope v' + n;
    document.getElementById('dis-sub').textContent = g + ' gets a Client Action to approve it.';
    document.getElementById('dis-pn').textContent = 'Scope v' + n;
    document.getElementById('dis-ps').textContent = cnt('in') + ' deliverables · ' + cnt('out') + ' exclusions · ' + (agDraftV2(p) ? cnt('ci') + ' from ' + g + ' · ' : '') + cnt('tl') + ' milestones';
    document.getElementById('dis-go').textContent = 'Issue Scope v' + n;
    var dfi = pdDiff(p), rows = dfi.rows, html = '';
    if (!l) html = '<li class="none"><span class="g"></span><span>First version. Everything in the draft becomes the baseline.</span></li>';
    else rows.slice(0, 6).forEach(function (r) {
      html += '<li class="' + r.k + '"><span class="g" aria-hidden="true">' + PD_GLYPH[r.k] + '</span><span><span class="sr-only">' + PD_KSR[r.k] + '</span>' + esc(r.x.t) +
        (r.k === 'mod' && r.was ? '<small>' + esc(r.was.t !== r.x.t ? 'was “' + r.was.t + '”' : 'was ' + (r.was.d || 'no date')) + '</small>' : '') + '</span></li>';
    });
    if (rows.length > 6) html += '<li class="more"><span class="g"></span><span>and ' + (rows.length - 6) + ' more</span></li>';
    if (dfi.terms && agDraftV2(p)) html += '<li class="mod"><span class="g" aria-hidden="true">~</span><span>Agreement<small>' + (smV2(l) ? 'Terms changed' : 'Milestones with shares, Done when lines, and the clocks') + '</small></span></li>';
    else if (dfi.terms) { var tn = p.sc.terms, to = pdTermsOf(l); html += '<li class="mod"><span class="g" aria-hidden="true">~</span><span>Terms<small>' + esc([tn.price !== to.price ? 'value ' + (tn.price == null ? 'cleared' : pdMoney(tn.price, p.cur)) : '', tn.rev !== to.rev ? 'rounds ' + (tn.rev == null ? 'cleared' : tn.rev) : ''].filter(Boolean).join(' · ')) + '</small></span></li>'; }
    document.getElementById('dis-diff').innerHTML = html;
    var steps = ['Creates trusted v' + n + ' with a SHA-256 fingerprint. It cannot be edited afterwards.'];
    if (l) steps.push('v' + l.v + ' becomes superseded and stays in Versions.');
    steps.push(syIssueStep(p, g, n));
    var moving = p.crs.filter(function (cr) { return pdCrState(cr) === 'approved' && !pdCrVer(p, cr) && pdCrInDraft(p, cr); }).map(function (cr) { return cr.id; });
    if (moving.length) steps.push(moving.join(', ') + (moving.length === 1 ? ' moves' : ' move') + ' inside the baseline.');
    document.getElementById('dis-steps').innerHTML = steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    disOk.checked = false; disGo.disabled = true; document.getElementById('dis-err').hidden = true;
    disD.setAttribute('data-blk', agIssueCheck(p) ? '1' : '');
    return '#dis-ok';
  }
  /* On the portal, the server takes the version first. If it refuses, nothing changes here and the drawer says why. */
  function pdIssue() {
    var p = pd.p; if (!p || disGo.disabled || disD.getAttribute('data-blk') === '1') return;
    var l = pdLatest(p), items = p.sc.items.filter(function (x) { return !x.rm; }); if (!items.length) return;
    var n = (l ? l.v : 0) + 1, ver = { v: n, at: today(), ts: Date.now(), by: 'You', appr: '', items: pdsCl(items), terms: JSON.parse(JSON.stringify(p.sc.terms)) };
    var k = syStatus(p).k, er = document.getElementById('dis-err');
    if (k === 'portal' || k === 'join') { syBusy(disGo, true, 'Sharing…'); er.hidden = true; }
    syGateIssue(p, ver, function () { syBusy(disGo, false); pdIssueDone(p, ver, items, n); },
      function (m) { syBusy(disGo, false); disGo.disabled = !disOk.checked; er.textContent = m; er.hidden = false; });
  }
  function pdIssueDone(p, ver, items, n) {
    var cl = byId(p.cid) || {}, g = given(cl) || 'The client';
    p.sc.vers.push(ver); p.sc.te = false;
    p.sc.items = pdsCl(items);
    pdTouch(p);
    pdLogClient(cl, 'you', 'You issued Scope v' + n, 'Trusted version');
    if (pd.p === p) { pd.view = null; pd.ie = null; pd.as = null; pd.just = 'sealed'; }
    closeDrawer(true);
    pdAfterChange(p); if (pd.p === p) pdRerender(); pdFp(p);
    if (pd.p === p) pdPanel.focus({ preventScroll: true });
    pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = 'Scope v' + n + ' issued. ' + g + ' can now approve it.'; }, 40);
    showToast('Scope v' + n + ' issued. ' + g + ' can approve it now.');
  }
  disOk.addEventListener('change', function () { disGo.disabled = !disOk.checked || syBlocked(pd.p) || disD.getAttribute('data-blk') === '1'; });
  disGo.addEventListener('click', pdIssue);
  disD.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && disOk.checked) { e.preventDefault(); pdIssue(); } });

  /* change: send, simulate, log */
  /* v117: every kind a studio entry can be has its words; an unknown one says "wrote on" (a studio dispute read "undefinedCR-005").
     v118 (85): a studio question (CONTRACT 82) says so */
  var PD_ME_LINE = { quote: 'You sent a quote on ', note: 'You replied on ', accept: 'You accepted ', decline: 'You declined ', dispute: 'You disagreed on ', question: 'You asked a question on ' };
  /* v118 (85): rows written before 84 as "undefinedCR-005" (a studio dispute or question) get their words back, once, when the app opens.
     The log is newest first; so are the studio's dispute and question entries matched to them, request by request */
  function pdFixUndefinedLines() {
    var n = 0;
    CLIENTS.forEach(function (cl) {
      var used = {};
      (cl.log || []).forEach(function (r) {
        var id, es = [];
        if (!Array.isArray(r) || r[0] !== 'you' || typeof r[1] !== 'string' || !/^undefinedCR-\d{3}$/.test(r[1])) return;
        id = r[1].slice(9);
        PROJECTS.forEach(function (p) { var c = p.cid === cl.id && p.crs ? pdCr(p, id) : null; if (c) c.entries.forEach(function (e) { if (e.w === 'y' && (e.ty === 'dispute' || e.ty === 'question')) es.push(e); }); });
        es.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        var e = es[used[id] || 0]; used[id] = (used[id] || 0) + 1;
        r[1] = ((e && PD_ME_LINE[e.ty]) || 'You wrote on ') + id; n++;
      });
    });
    return n;
  }
  function pdPush(p, c, e) {
    var cl = byId(p.cid) || {}, g = given(cl) || 'Client', me = e.w === 'y';
    c.entries.push(e); c.ok = false; c.cmp = null;
    var line = me ? (PD_ME_LINE[e.ty] || 'You wrote on ') + c.id :
      g + ({ question: ' asked a question on ', counter: ' sent a counter offer on ', accept: ' accepted ', decline: ' declined ', note: ' replied on ', dispute: ' disagreed on ', request: ' asked for a change on ' }[e.ty] || ' replied on ') + c.id;
    pdTouch(p);
    if (pd.p === p) { pd.cr = c.id; pd.crf = pdCrOpen(c) ? 'open' : 'closed'; }
    pdLogClient(cl, me ? 'you' : 'client', line, 'Change request');
    pdAfterChange(p); if (pd.p === p) pdRerender(); pdChain(p, c);
    return line;
  }
  function pdAfterSend(c, msg) {
    if (!pd.p || pd.p.crs.indexOf(c) < 0) { pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = msg; }, 40); return; }
    var h = pdPanel.querySelector('.pd-compose textarea') || pdPanel.querySelector('#pd-h-cr');
    if (h) h.focus({ preventScroll: true });
    var last = pdPanel.querySelector('.pd-ent:last-child');
    if (last && last.getBoundingClientRect().bottom > window.innerHeight) last.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = msg; }, 40);
  }
  function pdSend(form) {
    var p = pd.p, c = pdSelCr(p); if (!c || !pdCrOpen(c) || !c.cmp) return;
    var ty = c.cmp.ty, tx = form.elements.tx.value.trim(), err = form.querySelector('.err'), amt = null, days = null;
    function bad(msg, el) { err.textContent = msg; form.setAttribute('data-err', ''); el.setAttribute('aria-invalid', 'true'); el.focus(); }
    if (ty === 'quote') {
      var qa = pdParseNum(form.elements.amt.value, 'amt'), qd = pdParseNum(form.elements.days.value, 'days');
      if (qa.err) return bad(qa.err, form.elements.amt);
      if (qa.n === null) return bad('Enter an amount. Use 0 for no extra cost.', form.elements.amt);
      if (qd.err) return bad(qd.err, form.elements.days);
      if (qd.n === null) return bad('Enter the extra days. Use 0 for none.', form.elements.days);
      if (!tx) return bad('Say what the quote covers.', form.elements.tx);
      amt = qa.n; days = qd.n;
    } else if ((ty === 'note' || ty === 'question') && !tx) return bad(ty === 'question' ? 'Write the question first.' : 'Write a message first.', form.elements.tx);
    else if (ty === 'dispute' && tx.length < 2) return bad('Say why you see it this way.', form.elements.tx);   // v108 (65)
    var e = { w: 'y', ty: ty, at: pdStamp(), ts: Date.now(), tx: tx || (ty === 'accept' ? 'Accepted.' : 'Declined.'), fresh: true };
    if (ty === 'dispute') { e.pos = form.elements.pos ? form.elements.pos.value : 'fix'; if (form.elements.ref && form.elements.ref.value) e.ref = form.elements.ref.value; }   // v108 (65)
    if (ty === 'quote') { e.amt = amt; e.days = days; var vf = +(form.elements.vf ? form.elements.vf.value : 14); if (vf > 0) e.vu = Date.now() + vf * DAY_MS; }
    if (ty === 'quote' && form.elements.hrs) {   // on an agreement: the hours behind the price, an included change, the milestone the days move
      var hs = String(form.elements.hrs.value).trim();
      if (hs !== '') { if (!/^\d{1,3}$/.test(hs)) return bad('Hours must be a whole number.', form.elements.hrs); e.hrs = +hs; }
      if (form.elements.inc && form.elements.inc.checked) { if (amt !== 0) return bad('An included change has no price. Set the amount to 0.', form.elements.amt); e.inc = 1; }
      if (form.elements.mv && form.elements.mv.value) e.m = form.elements.mv.value;
    }
    var g = given(byId(p.cid) || {}) || 'the client', sb = form.querySelector('button[type="submit"]');
    if (c.sending) return;
    if (syStatus(p).k === 'portal') { c.sending = true; syBusy(sb, true, 'Sending…'); err.textContent = ''; form.removeAttribute('data-err'); }
    /* on the portal the server takes the entry first; if it refuses, the reply stays a draft and the form says why */
    syGateEntry(p, c, e, null, function () {
      c.sending = false;
      pdPush(p, c, e);
      var msg = ty === 'quote' ? 'Quote sent to ' + g + (e.vu ? ', valid until ' + dayLbl(e.vu) : '') + '. Entries can’t be edited.' : ty === 'note' ? 'Note sent. Entries can’t be edited.' : ty === 'question' ? 'Question sent to ' + g + '. Entries can’t be edited.' : ty === 'dispute' ? 'Sent. ' + g + ' sees where you stand. Entries can’t be edited.' : ty === 'accept' ? c.id + ' approved.' + (c.adds ? ' It sits outside the baseline until you add it to Scope.' : '') : c.id + ' declined.';
      pdAfterSend(c, msg);
      showToast(msg);
    }, function (m) {
      c.sending = false;
      var f2 = pdPanel.querySelector('.pd-compose') || form, e2 = f2.querySelector('.err');
      syBusy(f2.querySelector('button[type="submit"]'), false); syBusy(sb, false);
      e2.textContent = m; f2.setAttribute('data-err', '');
    }, form.hasAttribute('data-n') ? +form.getAttribute('data-n') : null);
  }
  function pdNextCr(p) { var n = p.crs.reduce(function (m, c) { return Math.max(m, pdCrNum(c)); }, 0) + 1; return 'CR-' + ('00' + n).slice(-3); }
  function pdNewCr(p, title, e, adds) {
    var l = pdLatest(p);
    var c = { id: pdNextCr(p), t: title, base: l ? l.v : 0, adds: adds, touches: adds ? 1 : 0, entries: [e], cmp: null };
    p.crs.push(c); if (pd.p === p) { pd.cr = c.id; pd.crf = 'open'; }
    return c;
  }
  function pdLogNew(p, c, me) {
    var cl = byId(p.cid) || {}, g = given(cl) || 'Client', line = me ? 'You logged ' + c.id : g + ' opened ' + c.id;
    pdTouch(p);
    pdLogClient(cl, me ? 'you' : 'client', line, 'Change request');
  }
  function pdSim(form) {
    if (syLive(pd.p)) return;
    var p = pd.p, cl = byId(p.cid) || {}, g = given(cl) || 'Client', ty = form.elements.ty.value, tx = form.elements.tx.value.trim(), c = pdSelCr(p), l = pdLatest(p);
    function bad(el) { form.setAttribute('data-err', ''); el.setAttribute('aria-invalid', 'true'); el.focus(); }
    if (ty === 'request') {
      if (!tx || !l) return bad(form.elements.tx);
      var title = tx.length > 48 ? tx.slice(0, 45).trim() + '…' : tx.replace(/[.?!]+$/, '');
      var nc = pdNewCr(p, title, { w: 'c', ty: 'request', at: pdStamp(), ts: Date.now(), tx: tx, fresh: true }, true);
      pdLogNew(p, nc, false); pdAfterChange(p);
      if (pd.tab !== 'change') pdSelect('change'); else pdRerender();
      pdChain(p, nc); pdAfterSend(nc, nc.id + ' opened by ' + g + '.');
      showToast(g + ' opened ' + nc.id + ' (simulated)'); return;
    }
    if (!c || (!pdCrOpen(c) && ty !== 'note')) return;
    if (ty === 'accept' && pdExpired(c)) { showToast('This quote expired. Send a revised quote first.'); return; }
    if ((ty === 'question' || ty === 'note' || ty === 'counter') && !tx) return bad(form.elements.tx);
    var reopen = !pdCrOpen(c), e = { w: 'c', ty: ty, at: pdStamp(), ts: Date.now(), tx: tx || (ty === 'accept' ? 'Accepted.' : 'Declined.'), fresh: true };
    if (ty === 'counter') {
      var sa = pdParseNum(form.elements.amt.value, 'amt'), t = pdTerms(c);
      if (sa.err || sa.n === null) return bad(form.elements.amt);
      e.amt = sa.n; e.days = t ? t.days : 0;
    }
    if (ty === 'accept') e.rec = pdRecNow();
    pdPush(p, c, e); pdAfterSend(c, g + (reopen ? ' asked to reopen ' : ' replied on ') + c.id + '.');
    showToast(g + (reopen ? ' asked to reopen ' : ' replied on ') + c.id + ' (simulated)');
  }
  function pdSimApprove() {
    if (syLive(pd.p)) return;
    var p = pd.p, l = pdLatest(p), cl = byId(p.cid) || {}, g = given(cl) || 'Client'; if (!l || l.appr) return;
    l.appr = (cl.contact || g) + ' · ' + today(); l.apts = Date.now(); l.rec = pdRecNow();
    pdTouch(p);
    pdLogClient(cl, 'client', g + ' approved Scope v' + l.v, 'Trusted version');
    pdAfterChange(p); pdRerender();
    pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = g + ' approved Scope v' + l.v + '.'; }, 40);
    showToast(g + ' approved Scope v' + l.v + ' (simulated)');
  }

  /* new request drawer */
  var ncrForm = document.getElementById('ncr'), ncrT = document.getElementById('ncr-t'), ncrD = document.getElementById('ncr-d'), ncrSrc = document.getElementById('ncr-src'), ncrKind = document.getElementById('ncr-kind');
  var ncrSrcVal = 'email', ncrKindVal = 'adds', crPend = null;
  var NCR_KIND_D = { adds: 'It sits outside the trusted baseline until it is agreed and added to Scope.', ask: 'A question does not change the trusted baseline.' };
  function crOnOpen() {
    ncrForm.reset(); ncrSrcVal = 'email'; ncrKindVal = 'adds'; setPressed(ncrSrc, 'email'); setPressed(ncrKind, 'adds');
    document.getElementById('ncr-kind-d').textContent = NCR_KIND_D.adds;
    ['f-ncr-t', 'f-ncr-d'].forEach(function (id) { document.getElementById(id).removeAttribute('data-err'); });
    var l = pd.p && pdLatest(pd.p);
    document.getElementById('dcr-sub').textContent = l ? 'Based on trusted Scope v' + l.v + '. The client’s original words stay in the record.' : 'Log something the client asked for outside the agreed Scope.';
    crPend = crPrefill; crPrefill = null;
    if (crPend && crPend.later) { ncrT.value = crPend.t; ncrD.value = crPend.d; document.getElementById('dcr-sub').textContent = 'From Later. Check the wording, then log it. You quote it next, and it stays out of the Scope until ' + agG(pd.p) + ' accepts.'; return '#ncr-t'; }
    if (crPend) { ncrT.value = crPend.t; ncrD.value = crPend.d; document.getElementById('dcr-sub').textContent = 'Log it, then quote the extra days at no cost. Once ' + agG(pd.p) + ' accepts, the milestone moves and the flag is answered.'; return '#ncr-d'; }
    return '#ncr-t';
  }
  ncrSrc.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; ncrSrcVal = b.getAttribute('data-f'); setPressed(ncrSrc, ncrSrcVal); });
  ncrKind.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; ncrKindVal = b.getAttribute('data-f'); setPressed(ncrKind, ncrKindVal); document.getElementById('ncr-kind-d').textContent = NCR_KIND_D[ncrKindVal]; });
  ncrT.addEventListener('input', function () { document.getElementById('f-ncr-t').removeAttribute('data-err'); });
  ncrD.addEventListener('input', function () { document.getElementById('f-ncr-d').removeAttribute('data-err'); });
  function crCreate() {
    var p = pd.p, l = pdLatest(p), t = ncrT.value.replace(/\s+/g, ' ').trim(), tx = ncrD.value.trim();
    function bad(id, eid, m, el) { document.getElementById(eid).textContent = m; document.getElementById(id).setAttribute('data-err', ''); el.focus(); }
    if (!l) return;
    if (t.length < 3) return bad('f-ncr-t', 'e-ncr-t', 'Give the request a short title.', ncrT);
    if (!tx) return bad('f-ncr-d', 'e-ncr-d', 'Write what was asked.', ncrD);
    if (ncrBusy) return;
    var e0 = { w: 'y', ty: 'request', at: pdStamp(), ts: Date.now(), tx: tx, via: ncrSrcVal, fresh: true }, adds0 = ncrKindVal === 'adds', go = document.getElementById('ncr-go');
    var plan = { id: pdNextCr(p), base: l ? l.v : 0, entries: [] };
    if (syStatus(p).k === 'portal') { ncrBusy = true; syBusy(go, true, 'Logging…'); }
    syGateEntry(p, plan, e0, { title: t, adds: adds0, base: plan.base }, function () {
      ncrBusy = false; syBusy(go, false);
      var c = pdNewCr(p, t, e0, adds0);
      if (crPend && crPend.m) c.cmp = { ty: 'quote', tx: '', amt: '0', days: '', vf: stQuoteDays(), mv: crPend.m };
      if (crPend && crPend.later) { var lx = (p.later || []).filter(function (y) { return y.id === crPend.later; })[0]; if (lx) { lx.st = 'cr'; lx.cr = c.id; lx.dts = Date.now(); } }
      crPend = null;
      pdLogNew(p, c, true);
      closeDrawer(true);
      pdAfterChange(p);
      if (pd.p === p) { if (pd.tab !== 'change') pdSelect('change'); else pdRerender(); }
      pdChain(p, c);
      pdAfterSend(c, c.id + ' logged.');
      showToast(c.id + ' logged. Send a quote when you are ready.');
    }, function (m) { ncrBusy = false; syBusy(go, false); bad('f-ncr-d', 'e-ncr-d', m, ncrD); });
  }
  ncrForm.addEventListener('submit', function (e) { e.preventDefault(); crCreate(); });
  ncrForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); crCreate(); } });

