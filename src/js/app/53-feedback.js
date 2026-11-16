  /* ---------- v70: Feedback from Viewers (CONTRACT.md 32) ----------
     A Viewer is someone the software is for. They never open ScopeDue: the Owner or an Editor records what they said, in their name,
     in p.fb. Each entry: k (req, bug, cmt, test, appr), fr (the Viewers' emails), via, ts, t, ab (what it is about), by (who recorded
     it: an email, '' on a device with no account), and what happened to it. It travels with the project (x8Out) and an Editor's
     changes are filtered by fbAllow (22.4). Nothing here is sent anywhere. */
  /* the files run in number order, and a link to this tab can draw it before this file has run (42 reads the address): so these
     are set the first time they are needed, not where they are written */
  var FB_K, FB_KN, FB_VIA, FB_VN, FB;
  function fbInit() {
    if (FB_K) return;
    FB_K = [['req', 'Request'], ['bug', 'Bug'], ['test', 'Test result'], ['appr', 'Approval'], ['cmt', 'Comment']];
    FB_KN = { req: 'Request', bug: 'Bug', test: 'Test result', appr: 'Approval', cmt: 'Comment', chk: 'Request to check' };   /* v95: chk (40.1), made by its own form */
    FB_VIA = [['meeting', 'In a meeting'], ['email', 'By email'], ['chat', 'In a chat'], ['phone', 'On the phone'], ['person', 'In person']];
    FB_VN = { meeting: 'In a meeting', email: 'By email', chat: 'In a chat', phone: 'On the phone', person: 'In person', portal: 'On the Viewer portal' };
    FB = { pid: '', f: 'all', sel: '', form: false, k: 'req', ask: '', cg: '' };   /* the tab's state on this screen: filter, selected, the open form or question */
  }
  fbInit();
  function fbUi(p) { fbInit(); if (FB.pid !== p.id) { FB.pid = p.id; FB.f = 'all'; FB.sel = ''; FB.form = false; FB.k = 'req'; FB.ask = ''; FB.cg = ''; } return FB; }
  function fbList(p) { return Array.isArray(p.fb) ? p.fb : (p.fb = []); }
  function fbId() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function fbById(p, id) { return fbList(p).filter(function (e) { return e.id === id; })[0] || null; }

  /* ---- who: Viewers who use what is built, and old Viewers who still open the project (32.1) ---- */
  function fbJoins(m) { return !!m && (m.role !== 'Viewer' || !!m.join); }   /* gets a Drive file, a share and a key */
  function fbViewers(p) { return (p.team || []).filter(function (m) { return m && m.role === 'Viewer' && m.e; }); }
  function fbShow(p) { return p.kind === 'private' && (fbViewers(p).length > 0 || fbList(p).length > 0); }
  /* v100 (51, spec PP-15): before v70 a Viewer joined like an Editor and kept the whole project. No more: on the Owner's device such a
     Viewer loses the mark, once, with a note; the next round on Drive takes their share and turns the key, as for anyone who leaves
     (29.18), and team sync drops them from the room. From then on they see what the Owner shows on the Viewer portal (32.6) */
  function fbLegacyEnd() {
    var n = 0;
    PROJECTS.forEach(function (p) {
      if (p.kind !== 'private' || x8Role(p) !== 'Owner') return;
      (p.team || []).forEach(function (m) {
        if (!m || m.role !== 'Viewer' || !m.join) return;
        delete m.join; n++;
        pdNote(p, m.n + ' is a Viewer: the project in Drive is no longer shared with them. They see what you show on the Viewer portal');
      });
    });
    if (n) { SDB.soon(200); pdRender(); }
    return n;
  }
  setTimeout(fbLegacyEnd, 1500);
  /* v92 (32.1): client projects have no Viewers, decided 2026-10-27: the client's people speak through the client portal (12). Every
     role picker on a client project offers Editor only; on the Owner's device a Viewer still on one is taken off it, once, and noted
     (their Drive share goes at the next round, as for anyone taken off, 29.18) */
  function fbNoVw(p) { return !!p && p.kind === 'client'; }
  function fbRoleOk(p, role) { return role !== 'Viewer' || !fbNoVw(p); }
  function fbRoleOpts(p, role) { return (fbNoVw(p) ? ['Editor'] : ['Editor', 'Viewer']).map(function (r) { return '<option value="' + r + '"' + (role === r ? ' selected' : '') + '>' + r + '</option>'; }).join(''); }
  function fbNoVwSay() { showToast('Client projects have no Viewers. The client’s people speak through the client portal.'); }
  function fbNoVwClean() {
    var n = 0;
    PROJECTS.forEach(function (p) {
      if (!fbNoVw(p) || x8Role(p) !== 'Owner') return;
      var out = (p.team || []).filter(function (m) { return m && m.role === 'Viewer'; });
      if (!out.length) return;
      p.team = p.team.filter(function (m) { return out.indexOf(m) < 0; });
      out.forEach(function (m) { if (p.owner === m.n) p.owner = 'You'; pdNote(p, m.n + ' was a Viewer. Client projects have no Viewers, so they were taken off this project'); n++; });
      pdTouch(p);
    });
    if (n) { SDB.soon(200); pdRender(); }
    return n;
  }
  setTimeout(fbNoVwClean, 1500);
  function fbPerson(p, e) {
    var k = String(e || '').toLowerCase(), m = (p.team || []).filter(function (x) { return String(x.e || '').toLowerCase() === k; })[0];
    return m ? m.n : k.split('@')[0] || 'Someone';
  }
  /* the name to call them by (v93, as the portal and its emails): a Vietnamese name ends with it (Nguyễn Quốc Bảo: Bảo), others
     start with it. Vietnamese is told by letters only Vietnamese has, or a common family name written without its marks */
  function fbFirst(p, e) { var n = fbPerson(p, e); return sdCallName(n) || n; }   /* 08-clients.js: a title in front is skipped too */
  function fbFrom(p, fr) { return prvList((fr || []).map(function (e) { return fbPerson(p, e); })); }
  function fbMe() { return (typeof x8Me === 'function' && x8Me()) || ''; }
  function fbBy(p, by) { return !by || by === fbMe() ? 'You' : fbPerson(p, by); }

  /* ---- where each entry stands (32.2) ---- */
  function fbAbout(p, ab) {
    fbInit();
    if (!ab) return null;
    var pv = p.pv || {}, k = ab.charAt(0), id = ab.slice(2), x;
    if (k === 'i') { x = prvById(pv.items || [], id); return x ? { l: x.t, tab: 'scope' } : null; }
    if (k === 'r') return { l: 'Release ' + ((pv.rel && pv.rel.name) || ''), tab: 'scope' };
    if (k === 's') { x = (pv.ships || []).filter(function (s) { return s.id === id; })[0]; return x ? { l: 'Release ' + x.name + ' (shipped)', tab: 'history' } : null; }
    if (k === 'f') { x = fbById(p, id); return x ? { l: FB_KN[x.k] + ': ' + prvT(x.t, 50), fb: x.id } : null; }
    return null;
  }
  function fbAboutOpts(p) {
    var pv = p.pv || {}, out = [];
    (pv.items || []).filter(function (x) { return x.sec === 'in' || x.sec === 'next'; }).forEach(function (x) { out.push(['i:' + x.id, (x.sec === 'in' ? 'Now' : 'Next') + ': ' + prvT(x.t, 60)]); });
    if (pv.rel && pv.rel.name && prvRelOn(p)) out.push(['r:cur', 'Release ' + pv.rel.name]);   /* v97 (43): only a release that is planned */
    (pv.ships || []).slice(-3).reverse().forEach(function (s) { out.push(['s:' + s.id, 'Release ' + s.name + ' (shipped)']); });
    return out;
  }
  function fbIdea(p, e) { return e.kid ? prvById((p.pv && p.pv.park) || [], e.kid) : null; }
  /* v93 (32.2): an approval asked of several Viewers is answered by each of them for themself (e.as, by email: v, ts, via, t, by,
     code). Approved once every one of them has approved, Not approved as soon as one has not; e.st follows. An approval from before
     has one answer (e.ans), read as the first Viewer's. e.ans stays the last answer, for apps from before */
  function fbAs(e) {
    if (e.as) return e.as;
    var o = {}; if (e.ans && (e.st === 'yes' || e.st === 'nope') && (e.fr || [])[0]) o[e.fr[0]] = Object.assign({ v: e.st }, e.ans);
    return o;
  }
  function fbApSt(e) {
    if (!e.as) return e.st === 'yes' || e.st === 'nope' ? e.st : 'wait';
    var vs = (e.fr || []).map(function (x) { return e.as[x] && e.as[x].v; });
    return vs.indexOf('nope') > -1 ? 'nope' : vs.length && vs.every(function (v) { return v === 'yes'; }) ? 'yes' : 'wait';
  }
  /* who has not answered yet, while it is open */
  function fbApOpen(e) { var as = fbAs(e); return fbApSt(e) === 'wait' ? (e.fr || []).filter(function (x) { return !as[x]; }) : []; }
  function fbAnswer(e, who, a) { var as = Object.assign({}, fbAs(e)); as[who] = a; e.as = as; e.st = fbApSt(e); e.ans = a; }
  /* the Viewer who confirmed it works: the one who said so (v93), else the first */
  function fbCfWho(p, e) { var w = e.cf && e.cf.fr; return fbFirst(p, w && (e.fr || []).indexOf(w) > -1 ? w : (e.fr || [])[0]); }
  /* v95 (40.1): a request to check: each Viewer asked answers once (e.rs, by email: v pass|fail, ts, via, t, by, tid: the test result
     it made). Who has not answered, while it is open; closing it by hand ends it without them */
  function fbRs(e) { return e.rs && typeof e.rs === 'object' ? e.rs : {}; }
  function fbChkOpen(e) { var rs = fbRs(e); return e.st === 'closed' ? [] : (e.fr || []).filter(function (x) { return !rs[x]; }); }
  /* v95 (40.2): its date to answer by has gone (a request to check, an approval). Nothing passes or closes by itself */
  function fbLate(e) { return !!e.due && /^\d{4}-\d{2}-\d{2}$/.test(e.due) && e.due < prvIso(Date.now()); }
  function fbNames(p, fr) { return prvList((fr || []).map(function (x) { return fbFirst(p, x); })); }
  function fbStage(p, e) {
    var who = fbFirst(p, (e.fr || [])[0]), idea, it, ap;
    if (e.k === 'cmt') return { s: 'cmt', l: 'Comment', c: 'neutral', g: 'closed' };
    if (e.k === 'chk') {
      var rs = fbRs(e), all = e.fr || [], miss = all.filter(function (x) { return !rs[x]; }), bad = all.filter(function (x) { return rs[x] && rs[x].v === 'fail'; });
      if (e.st === 'closed' && miss.length) return { s: 'closed', l: miss.length === 1 ? 'Closed without ' + fbNames(p, miss) + '’s answer' : 'Closed without ' + fbNames(p, miss) + '’s answers', c: 'neutral', g: 'closed' };
      if (miss.length) return fbLate(e) ? { s: 'late', l: 'Overdue · waiting for ' + fbNames(p, miss), c: 'crit', g: 'needs' } : { s: 'wait', l: 'Waiting for ' + fbNames(p, miss), c: 'warn', g: 'wait' };
      if (all.length === 1) return bad.length ? { s: 'checked', l: 'Checked: it does not work for ' + who, c: 'crit', g: 'closed' } : { s: 'checked', l: 'Checked: it works for ' + who, c: 'ok', g: 'closed' };
      return bad.length ? { s: 'checked', l: 'Checked: ' + bad.length + ' of ' + all.length + ' say it does not work', c: 'crit', g: 'closed' } : { s: 'checked', l: 'Checked: works for everyone', c: 'ok', g: 'closed' };
    }
    if (e.k === 'appr') { ap = fbApSt(e); return ap === 'yes' ? { s: 'yes', l: 'Approved', c: 'ok', g: 'closed' } : ap === 'nope' ? { s: 'nope', l: 'Not approved', c: 'crit', g: 'closed' } : fbLate(e) ? { s: 'wait', l: 'Overdue · waiting for ' + fbNames(p, fbApOpen(e)), c: 'crit', g: 'needs' } : { s: 'wait', l: 'Waiting for ' + fbNames(p, fbApOpen(e)), c: 'warn', g: 'wait' }; }
    if (e.k === 'test') return e.res === 'pass' ? { s: 'pass', l: 'Pass', c: 'ok', g: 'closed' } : e.bid ? { s: 'failbug', l: 'Fail · bug opened', c: 'neutral', g: 'closed' } : { s: 'fail', l: 'Fail', c: 'crit', g: 'needs' };
    if (e.cf) return { s: 'conf', l: 'Confirmed by ' + fbCfWho(p, e), c: 'ok', g: 'closed' };
    /* v95 (40.3): a Viewer said it still does not work */
    if (e.k === 'bug' && e.st === 'open' && e.nf) return { s: 'reopen', l: 'Open again: ' + fbFirst(p, e.nf.fr) + ' says it still does not work', c: 'crit', g: 'needs' };
    if (e.k === 'bug') return e.st === 'notbug' ? { s: 'notbug', l: 'Not a bug', c: 'neutral', g: 'closed' } : e.st === 'fixed' ? { s: 'fixed', l: 'Fixed, not confirmed', c: 'warn', g: 'wait' } : { s: 'open', l: 'Open', c: 'crit', g: 'needs' };
    if (e.st === 'no') return { s: 'no', l: 'Declined', c: 'neutral', g: 'closed' };
    idea = fbIdea(p, e);
    if (idea && idea.st === 'parked') return { s: 'park', l: 'In the Parking Lot', c: 'neutral', g: 'wait' };
    if (idea && idea.st === 'promoted') {
      it = prvById((p.pv && p.pv.items) || [], idea.iid);
      if (it && it.st === 'done') return e.nf ? { s: 'reopen', l: 'Built, ' + fbFirst(p, e.nf.fr) + ' says it does not work yet', c: 'crit', g: 'needs' } : { s: 'built', l: 'Built, not confirmed', c: 'warn', g: 'wait' };
      if (it && it.sec === 'out') return { s: 'never', l: 'In Never', c: 'neutral', g: 'closed' };
      return { s: it && it.sec === 'next' ? 'next' : 'now', l: it && it.sec === 'next' ? 'In Next' : 'In Now', c: 'ok', g: 'wait' };
    }
    if (idea) return { s: 'drop', l: 'Not taken', c: 'neutral', g: 'closed' };
    return { s: 'open', l: 'New', c: 'warn', g: 'needs' };
  }
  function fbNeeds(p) { return p.kind === 'private' ? fbList(p).filter(function (e) { return fbStage(p, e).g === 'needs'; }) : []; }
  function fbBadge(p) {
    var n = fbNeeds(p).length; if (!n) return '';
    return '<span class="pd-b w" aria-hidden="true">' + n + '</span><span class="sr-only">, ' + n + ' waiting on you</span>';
  }

  /* v121 (CONTRACT.md 91): the bell, for the Owner and Editors: what Viewers sent from the portal (a request, a problem, a test, an
     answer to a request to check), that it works or still does not, and their approvals given with a code. Each once, by its key */
  function fbNotes(out) {
    fbInit();
    PROJECTS.forEach(function (p) {
      if (p.kind !== 'private' || x8Role(p) === 'Viewer' || !fbList(p).length) return;
      var nm = dbName(p), go = { pid: p.id, tab: 'feedback', f: '', cr: '' };
      fbList(p).forEach(function (e) {
        var who = fbFirst(p, (e.fr || [])[0]), what = prvT(fbTitle(p, e), 70);
        if (e.via === 'portal' && (e.k === 'req' || e.k === 'bug' || e.k === 'test')) {
          var ans = e.k === 'test' && e.rq;
          out.push({ key: 'fbv:' + p.id + ':' + e.id, tone: e.k === 'bug' || e.res === 'fail' ? 'warn' : '', title: e.k === 'req' ? who + ' sent a request' : e.k === 'bug' ? who + ' reported a problem' : ans ? (e.res === 'fail' ? who + ' says it does not work' : who + ' says it works') : who + ' tested it',
            text: '“' + what + '”', meta: nm, ts: e.ts || Date.now(), go: go });
        }
        if (e.cf && e.cf.via === 'portal') out.push({ key: 'fbcf:' + p.id + ':' + e.id + ':' + e.cf.ts, tone: '', title: fbFirst(p, e.cf.fr || (e.fr || [])[0]) + ' confirmed it works', text: '“' + what + '”', meta: nm, ts: e.cf.ts, go: go });
        if (e.nf && e.nf.via === 'portal') out.push({ key: 'fbnf:' + p.id + ':' + e.id + ':' + e.nf.ts, tone: 'warn', title: fbFirst(p, e.nf.fr) + ' says it still does not work', text: '“' + what + '”', meta: nm, ts: e.nf.ts, go: go });
        if (e.k === 'appr') { var as = fbAs(e); Object.keys(as).forEach(function (x) { var a = as[x]; if (a && a.code) out.push({ key: 'fbap:' + p.id + ':' + e.id + ':' + x, tone: a.v === 'yes' ? '' : 'warn', title: fbFirst(p, x) + (a.v === 'yes' ? ' approved it' : ' did not approve it'), text: '“' + what + '”', meta: nm, ts: a.ts || Date.now(), go: go }); }); }
      });
    });
  }
  /* ---- the tab ---- */
  function fbHTML(p) {
    fbInit();
    var q = fbUi(p), all = fbList(p), vw = fbViewers(p), cta = vw.length ? '<div class="fb-ctas"><button type="button" class="btn-ghost" data-pd="fb:chk">' + IC('check') + '<span>Ask to check</span></button><button type="button" class="btn-primary" data-pd="fb:new">' + IC('plus') + '<span>Record feedback</span></button></div>' : '';   /* v95: Ask to check (40.1) */
    /* v122 (94): what they said comes first; the Viewers and the portal follow it, in one card (fbPeopleCard only for what the portal
       card does not say: Viewers who still open the whole project, or no portal card on this device) */
    var vpc = vpCard(p), ppl = vpc && !fbViewers(p).some(function (m) { return m.join; }) ? '' : fbPeopleCard(p), foot = ppl + vpc;
    var h = pdHeadHTML(p, 'feedback', cta);
    if (!all.length && !q.form) {
      h += '<section class="card pd-card"><p class="pd-crs-e">' + (vw.length ? 'Nothing recorded yet. When a Viewer asks for something, reports a bug, tests a release or approves one, record it here in their words.' : 'Add the people who will use what you build as Viewers on the Team tab. They do not open ScopeDue: you record what they say here.') + '</p></section>';
      return h + foot;
    }
    /* v122 (94): the kinds the list can be narrowed to (comments sit under what they are about; requests to check and approvals are few) */
    var FILT = ['req', 'bug', 'test'];
    if (q.f !== 'all' && FILT.indexOf(q.f) < 0) q.f = 'all';
    var pool = all.filter(function (e) { return q.f === 'all' || e.k === q.f; }), sel = q.sel && fbById(p, q.sel);
    if (sel && pool.indexOf(sel) < 0 && !q.form) sel = null;
    /* v122 (94): what belongs to another entry is shown with it, not as a row of its own: a comment under what it is about, a test
       result under the bug opened from it, and an earlier request to check under the latest one about the same thing */
    var shown = pool.filter(function (e) { return !fbUnder(p, e); });
    if (!sel && !q.form) { sel = shown.filter(function (e) { return fbStage(p, e).g === 'needs'; })[0] || shown[0] || null; q.sel = sel ? sel.id : ''; }
    var selHome = sel ? fbHome(p, sel) : null;
    var kinds = [['all', 'All', shown.length]].concat(FB_K.filter(function (k) { return FILT.indexOf(k[0]) > -1; }).map(function (k) { return [k[0], k[1], all.filter(function (e) { return e.k === k[0] && !fbUnder(p, e); }).length]; }));
    var seg = '<div class="seg" role="group" aria-label="Kind of feedback" data-seg="fbf">' + kinds.filter(function (s) { return s[0] === 'all' || s[2]; }).map(function (s) { return '<button type="button" data-f="' + s[0] + '" aria-pressed="' + (q.f === s[0]) + '">' + s[1] + ' <span class="n">' + s[2] + '</span></button>'; }).join('') + '</div>';
    var groups = [['needs', 'Needs an answer'], ['wait', 'Under way'], ['closed', 'Closed']];
    var list = '<section class="card pd-card fb-lc" aria-labelledby="pd-h-fbl"><div class="card-h ruled"><div><h3 id="pd-h-fbl">What they said</h3><p>Newest first. Recorded in their words, by you or an Editor.</p></div><div class="h-actions"><span class="count">' + shown.length + '</span></div></div><div class="prv-seg prv-seg-in">' + seg + '</div>' +
      (shown.length ? groups.map(function (g) {
        var es = shown.filter(function (e) { return fbStage(p, e).g === g[0]; }).sort(function (a, b) { return b.ts - a.ts; });
        if (!es.length) return '';
        var ul = '<ul class="pd-crs">' + es.map(function (e) { return fbRow(p, e, !q.form && selHome && e.id === selHome.id); }).join('') + '</ul>';
        /* v122 (94): Closed starts folded, open while what is selected is in it */
        if (g[0] === 'closed') return '<details class="fb-gc"' + (selHome && es.indexOf(selHome) > -1 ? ' open' : '') + '><summary class="pd-eb prv-gh">' + g[1] + ' <span class="n">' + es.length + '</span></summary>' + ul + '</details>';
        return '<h4 class="pd-eb prv-gh">' + g[1] + ' <span class="n">' + es.length + '</span></h4>' + ul;
      }).join('') : '<p class="pd-crs-e">Nothing of this kind yet.</p>') + '</section>';
    return h + '<div class="pd-cols prv-dc fb-cols"><div class="pd-col">' + list + '</div><div class="pd-col fb-dcol">' + (q.form === 'chk' ? fbChkForm(p) : q.form ? fbForm(p) : sel ? fbDetail(p, sel) : '') + '</div></div>' + foot;
  }
  /* the entry another one is shown under, or null: a comment's subject, a test result's bug, the latest request to check about the
     same thing */
  function fbUnder(p, e) {
    if (e.k === 'cmt' && /^f:/.test(e.ab || '')) return fbById(p, e.ab.slice(2));
    if (e.k === 'test' && e.bid && e.bid !== e.id) return fbById(p, e.bid);
    if (e.k === 'chk' && e.ab) return fbList(p).filter(function (x) { return x !== e && x.k === 'chk' && x.ab === e.ab && (x.ts > e.ts || (x.ts === e.ts && x.id > e.id)); }).sort(function (a, b) { return b.ts - a.ts; })[0] || null;
    return null;
  }
  function fbHome(p, e) { var h = e, n = 0, u; while ((u = fbUnder(p, h)) && n++ < 5) h = u; return h; }
  /* the requests to check before this one about the same thing, newest first */
  function fbRounds(p, e) { return e.k === 'chk' && e.ab ? fbList(p).filter(function (x) { return x !== e && x.k === 'chk' && x.ab === e.ab && x.ts <= e.ts; }).sort(function (a, b) { return b.ts - a.ts; }) : []; }
  /* v95: what an entry is called: its words, else (a request to check, an answer given without words) what it is about */
  function fbTitle(p, e) {
    var ab = fbAbout(p, e.ab);
    if (e.k === 'chk') return ab ? ab.l : e.t || 'Request to check';
    if (e.t) return e.t;
    if (e.k === 'test' && ab) return (e.res === 'pass' ? 'Works: ' : 'Does not work: ') + ab.l;
    return FB_KN[e.k] || '';
  }
  /* v100 (55): the tracking code Viewers see on the portal, the same here */
  function fbCode(id) { return '#' + String(id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(); }
  function fbRow(p, e, sel) {
    var st = fbStage(p, e);
    return '<li><button type="button" class="pd-cr fb-r" data-pd="fb:sel" data-id="' + e.id + '"' + (sel ? ' aria-current="true"' : '') + '><span class="sd ' + (st.c === 'crit' ? 'crit' : st.c === 'warn' ? 'warn' : st.c === 'ok' ? 'ok' : '') + '" aria-hidden="true"></span><span class="tx"><b>' + esc(prvT(fbTitle(p, e), 90)) + '</b><span class="l2"><span class="chip ' + st.c + '">' + esc(st.l) + '</span><span class="fb-k">' + FB_KN[e.k] + '</span><span class="fb-code" translate="no">' + esc(fbCode(e.id)) + '</span><span>' + esc(fbFrom(p, e.fr)) + '</span>' + (e.k === 'req' && (e.vo || []).length ? '<span class="fb-vo">' + IC('users') + (e.vo.length === 1 ? '1 wants it' : e.vo.length + ' want it') + '</span>' : '') + fbRowMore(p, e) + '</span></span><time>' + esc(prvDate(e.ts)) + '</time></button></li>';
  }
  /* v122 (94): what sits under an entry, said on its row: comments, test results, earlier rounds of checking */
  function fbRowMore(p, e) {
    var cm = 0, ts = 0;
    fbList(p).forEach(function (x) { var u = fbUnder(p, x); if (u !== e) return; if (x.k === 'cmt') cm++; else if (x.k === 'test') ts++; });
    var rd = fbRounds(p, e).length, out = '';
    if (rd) out += '<span class="fb-more">' + (rd + 1) + ' rounds of checking</span>';
    if (ts) out += '<span class="fb-more">' + (ts === 1 ? 'From a test result' : 'From ' + ts + ' test results') + '</span>';
    if (cm) out += '<span class="fb-more">' + IC('chat') + cm + '</span>';
    return out;
  }
  /* the Viewers on this project, and old Viewers who still open it */
  function fbPeopleCard(p) {
    var vw = fbViewers(p), own = x8Role(p) === 'Owner';
    if (!vw.length) return '';
    var old = vw.filter(function (m) { return m.join; });
    var h = '<section class="card pd-card fb-ppl" aria-labelledby="pd-h-fbp"><div class="card-h ruled"><div><span class="pd-eb">Viewers</span><h3 id="pd-h-fbp">The people who will use it</h3><p>They do not open ScopeDue. What they say is recorded here in their name.</p></div><div class="h-actions"><span class="count">' + vw.length + '</span></div></div><ul class="fb-pl">';
    h += vw.map(function (m) {
      var n = fbList(p).filter(function (e) { return (e.fr || []).indexOf(String(m.e).toLowerCase()) > -1; }).length;
      return '<li>' + pdAv(m) + '<span class="fb-pn"><b>' + esc(m.n) + '</b><small>' + (n ? (n === 1 ? '1 entry' : n + ' entries') : 'Nothing recorded yet') + '</small></span>' +
        (m.join ? '<span class="chip warn" title="They were added before Viewers stopped opening the project, and still open it.">Still opens the project</span>' + (own ? '<button type="button" class="btn-ghost btn-sm" data-pd="fb:solo" data-e="' + esc(m.e) + '">Feedback only</button>' : '') : '') + '</li>';
    }).join('') + '</ul>';
    if (old.length && own) h += '<p class="pde-small fb-old">' + (old.length === 1 ? esc(old[0].n) + ' was added before Viewers stopped opening projects, so they can still read all of it.' : old.length + ' Viewers were added before Viewers stopped opening projects, so they can still read all of it.') + ' Feedback only stops sharing the project with them and changes its key.</p>';
    return h + '</section>';
  }
  function fbViaSel(name, val) { return '<span class="pd-sel"><select name="' + name + '" aria-label="How they said it">' + FB_VIA.map(function (v) { return '<option value="' + v[0] + '"' + (v[0] === val ? ' selected' : '') + '>' + v[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>'; }
  function fbForm(p) {
    var q = fbUi(p), vw = fbViewers(p), ab = fbAboutOpts(p);
    var h = '<section class="card pd-card pd-cr-d fb-new" aria-labelledby="pd-h-fbn"><div class="card-h ruled"><div><span class="pd-eb">Record feedback</span><h3 id="pd-h-fbn">What did they say?</h3><p>Write it in their words. It is recorded in their name, and as recorded by you.</p></div></div>' +
      '<form class="prv-f fb-f pde-b" data-pd-form="fb:new" data-k="' + q.k + '" novalidate>' +
      '<fieldset class="prv-pick fb-kinds"><legend>Kind</legend>' + FB_K.map(function (k) { return '<label class="prv-opt"><input type="radio" name="fbk" value="' + k[0] + '"' + (k[0] === q.k ? ' checked' : '') + '><span>' + k[1] + '</span></label>'; }).join('') + '</fieldset>' +
      '<fieldset class="prv-pick"><legend>From</legend>' + vw.map(function (m, i) { return prvOptChip(vw.length === 1 ? 'radio' : 'checkbox', 'fr', String(m.e).toLowerCase(), esc(m.n), vw.length === 1); }).join('') + '</fieldset>' +
      '<div class="fld"><label for="fb-t">What they said <span class="opt">Required</span></label><textarea id="fb-t" name="t" rows="4" maxlength="1200" placeholder="For example: The invoice list should show the customer’s tax code."></textarea></div>' +
      '<fieldset class="prv-pick fb-res"><legend>Result</legend>' + prvOptChip('radio', 'res', 'pass', 'Pass', false) + prvOptChip('radio', 'res', 'fail', 'Fail', false) + '</fieldset>' +
      '<div class="fld-row"><div class="fld"><label for="fb-ab">It is about <span class="opt fb-opt">Optional</span></label><span class="pd-sel"><select id="fb-ab" name="ab"><option value="">Nothing in particular</option>' + ab.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div>' +
      '<div class="fld"><label for="fb-via">How</label>' + fbViaSel('via', 'meeting').replace('<select ', '<select id="fb-via" ') + '</div></div>' +
      '<div class="fld fb-due"><label for="fb-due">Answer by <span class="opt">Optional</span></label><input id="fb-due" name="due" type="date"></div>' +   /* v95 (40.2): approvals only */
      '<div class="pde-acts"><button type="submit" class="btn-primary btn-sm">' + IC('tick') + '<span>Record it</span></button><button type="button" class="btn-ghost btn-sm" data-pd="fb:cancel">Cancel</button></div>' + prvErrSpan() + '</form></section>';
    return h;
  }
  /* v95 (40.1): ask Viewers to check something in Now or Next, or the release; its steps start as what it is "done when" */
  function fbChkOpts(p) { return fbAboutOpts(p).filter(function (o) { return o[0].charAt(0) !== 's'; }); }
  function fbSteps(p, ab) {
    var pv = p.pv || {}, x;
    if (ab === 'r:cur') return pv.rel && pv.rel.ship ? String(pv.rel.ship).split(/\n+/).filter(Boolean) : [];
    x = ab && ab.charAt(0) === 'i' ? prvById(pv.items || [], ab.slice(2)) : null;
    return x && Array.isArray(x.dod) ? x.dod.map(function (c) { return c.t; }).filter(Boolean) : [];
  }
  function fbChkForm(p) {
    var vw = fbViewers(p), ab = fbChkOpts(p), first = ab[0] ? ab[0][0] : '', st = esc(fbSteps(p, first).join('\n'));
    var h = '<section class="card pd-card pd-cr-d fb-new" aria-labelledby="pd-h-fbk"><div class="card-h ruled"><div><span class="pd-eb">Ask to check</span><h3 id="pd-h-fbk">What should they check?</h3><p>It comes first on their Viewer portal, with the steps and the link. Their answers come back here as test results.</p></div></div>';
    if (!ab.length) return h + '<div class="pde-b"><p class="pd-crs-e">' + (prvRelOn(p) ? 'Put something in Now or Next, or set the release, first: that is what Viewers check.' : 'Put something in Now or Next first: that is what Viewers check.') + '</p><div class="pde-acts"><button type="button" class="btn-ghost btn-sm" data-pd="fb:cancel">Cancel</button></div></div></section>';
    return h + '<form class="prv-f fb-f fb-chkf pde-b" data-pd-form="fb:chk" novalidate>' +
      '<div class="fld"><label for="fb-kab">What</label><span class="pd-sel"><select id="fb-kab" name="ab">' + ab.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div>' +
      '<fieldset class="prv-pick fb-kfr"><legend>Whom</legend>' + vw.map(function (m) { return prvOptChip('checkbox', 'fr', String(m.e).toLowerCase(), esc(m.n), true); }).join('') + '</fieldset>' +
      '<div class="fld"><label for="fb-ks">Steps <span class="opt">One step per line</span></label><textarea id="fb-ks" name="steps" rows="4" maxlength="2400" data-was="' + st + '" placeholder="Open the watering screen&#10;Add a plant&#10;See tomorrow’s reminder">' + st + '</textarea></div>' +
      '<div class="fld-row"><div class="fld"><label for="fb-ku">A link to try it <span class="opt">Optional</span></label><input id="fb-ku" name="url" type="url" inputmode="url" maxlength="500" autocomplete="off" placeholder="https://staging.example.com"></div>' +
      '<div class="fld"><label for="fb-kd">Answer by <span class="opt">Optional</span></label><input id="fb-kd" name="due" type="date"></div></div>' +
      '<div class="fld"><label for="fb-kt">A note <span class="opt">Optional</span></label><textarea id="fb-kt" name="t" rows="2" maxlength="600" placeholder="For example: on your phone, the way you would use it"></textarea></div>' +
      '<div class="pde-acts"><button type="submit" class="btn-primary btn-sm">' + IC('check') + '<span>Ask them</span></button><button type="button" class="btn-ghost btn-sm" data-pd="fb:cancel">Cancel</button></div>' + prvErrSpan() + '</form></section>';
  }
  /* the steps follow what is chosen, until they are changed by hand */
  function fbChkAb(t) {
    var f = t.closest('form'), s = f && f.elements.steps; if (!s || !pd.p) return;
    if (s.value !== s.getAttribute('data-was')) return;
    var v = fbSteps(pd.p, t.value).join('\n'); s.value = v; s.setAttribute('data-was', v);
  }
  /* ppl (v93): the Viewers it can be recorded for, when the entry is about more than one of them */
  function fbAsk(p, e, kind, label, cta, ph, ppl) {
    var from = ppl && ppl.length ? (ppl.length > 1 ? '<div class="fld"><label for="fb-afr">From</label><span class="pd-sel"><select id="fb-afr" name="fr">' + ppl.map(function (x) { return '<option value="' + esc(x) + '">' + esc(fbPerson(p, x)) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div>' : '<input type="hidden" name="fr" value="' + esc(ppl[0]) + '">') : '';
    return '<form class="prv-f fb-ask pde-sec" data-pd-form="fb:' + kind + '" data-id="' + e.id + '" novalidate><h4 class="pd-eb">' + label + '</h4>' +
      (kind === 'cf' || kind === 'ans' || kind === 'rs' ? '<div class="fld-row fb-askrow">' + from + '<div class="fld"><label for="fb-aw">Their words <span class="opt">Optional</span></label><input id="fb-aw" name="t" maxlength="300" autocomplete="off" placeholder="' + esc(ph) + '"></div><div class="fld"><label for="fb-av">How</label>' + fbViaSel('via', 'meeting').replace('<select ', '<select id="fb-av" ') + '</div></div>' :
        '<div class="fld"><label for="fb-aw">' + (kind === 'cm' || kind === 'nf' ? 'What they said' : 'Why') + ' <span class="opt">Required</span></label><textarea id="fb-aw" name="t" rows="2" maxlength="600" placeholder="' + esc(ph) + '"></textarea></div>' +
        (kind === 'cm' ? '<div class="fld-row"><div class="fld"><label for="fb-cf">From</label><span class="pd-sel"><select id="fb-cf" name="fr">' + fbViewers(p).map(function (m) { return '<option value="' + esc(String(m.e).toLowerCase()) + '">' + esc(m.n) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div><div class="fld"><label for="fb-cv">How</label>' + fbViaSel('via', 'meeting').replace('<select ', '<select id="fb-cv" ') + '</div></div>' :
          kind === 'nf' ? '<div class="fld-row">' + from + '<div class="fld"><label for="fb-nv">How</label>' + fbViaSel('via', 'meeting').replace('<select ', '<select id="fb-nv" ') + '</div></div>' : '')) +
      '<div class="pde-acts"><button type="submit" class="btn-primary btn-sm">' + cta + '</button><button type="button" class="btn-ghost btn-sm" data-pd="fb:nask">Cancel</button></div>' + prvErrSpan() + '</form>';
  }
  /* v93: whom an answer can be recorded for now: who has not answered; for the Owner also an answer recorded by hand, to change it
     (never one given on the portal with a code: the server keeps that one) */
  function fbApWho(p, e) {
    var as = fbAs(e), open = fbApOpen(e);
    return x8Role(p) !== 'Owner' ? open : open.concat((e.fr || []).filter(function (x) { return as[x] && !as[x].code; }));
  }
  /* v95 (40.1): a request to check: whom it asks, the steps, and each Viewer's answer */
  function fbDue(iso) { return iso ? prvDate(new Date(iso + 'T12:00:00').getTime()) : ''; }
  function fbChkDetail(p, e) {
    var q = fbUi(p), st = fbStage(p, e), ab = fbAbout(p, e.ab), rs = fbRs(e), op = fbChkOpen(e), own = x8Role(p) === 'Owner', who = fbFirst(p, op[0] || (e.fr || [])[0]);
    var h = '<section class="card pd-card pd-cr-d fb-d" aria-labelledby="pd-h-fbd"><div class="card-h ruled"><div><span class="pd-eb">Request to check</span><h3 id="pd-h-fbd" class="fb-dt">' + esc(prvT(fbTitle(p, e), 120)) + '</h3><p><span class="chip ' + st.c + '">' + esc(st.l) + '</span><span>' + esc(prvDate(e.ts)) + '</span></p></div></div><div class="pde-b">';
    if (e.t) h += '<blockquote class="fb-q">' + esc(e.t) + '</blockquote>';
    h += '<dl class="fb-meta"><dt>Asked</dt><dd>' + esc(fbFrom(p, e.fr)) + '</dd><dt>Asked by</dt><dd>' + esc(fbBy(p, e.by)) + '</dd>' +
      (ab ? '<dt>It is about</dt><dd><button type="button" class="link" data-pd="goto" data-tab="' + ab.tab + '">' + esc(ab.l) + '</button></dd>' : '') +
      (e.url ? '<dt>Link</dt><dd><a href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">' + esc(prvT(e.url.replace(/^https:\/\//, ''), 60)) + '</a></dd>' : '') +
      (e.due ? '<dt>Answer by</dt><dd>' + esc(fbDue(e.due)) + '</dd>' : '') + '</dl>';
    if ((e.steps || []).length) h += '<div class="pde-sec"><h4 class="pd-eb">Steps</h4><ol class="fb-steps">' + e.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
    h += '<div class="pde-sec"><h4 class="pd-eb">Answers <span class="n">' + Object.keys(rs).filter(function (x) { return (e.fr || []).indexOf(x) > -1; }).length + ' of ' + (e.fr || []).length + '</span></h4><ul class="fb-rs">' + (e.fr || []).map(function (x) {
      var a = rs[x], c = a ? (a.v === 'pass' ? '<span class="chip ok">Works</span>' : '<span class="chip crit">Does not work</span>') : '<span class="chip neutral">No answer yet</span>';
      return '<li><b>' + esc(fbFirst(p, x)) + '</b>' + c + (a ? '<small><span>' + esc(FB_VN[a.via] || FB_VN.meeting) + '</span><span class="fb-via">' + esc(prvDate(a.ts)) + '</span>' + (a.tid && fbById(p, a.tid) ? '<button type="button" class="link fb-via" data-pd="fb:sel" data-id="' + esc(a.tid) + '">Test result</button>' : '') + '</small>' + (a.t ? '<span class="fb-rst">' + esc(a.t) + '</span>' : '') : '') + '</li>';
    }).join('') + '</ul>';
    if (op.length && fbLate(e)) h += '<p class="pd-note warn">No answer is not a yes. Ask them again, or record what they said.</p>';
    h += '</div>';
    /* v122 (94): the earlier rounds about the same thing, which the list no longer shows as rows */
    var rds = fbRounds(p, e);
    if (rds.length) h += '<div class="pde-sec"><h4 class="pd-eb">Earlier rounds <span class="n">' + rds.length + '</span></h4><ul class="fb-cm fb-rds">' + rds.map(function (x) { var s2 = fbStage(p, x); return '<li><span class="chip ' + s2.c + '">' + esc(s2.l) + '</span><small><span>' + esc(prvDate(x.ts)) + '</span><button type="button" class="link fb-via" data-pd="fb:sel" data-id="' + x.id + '">Open</button></small></li>'; }).join('') + '</ul></div>';
    if (q.ask === 'rp:' + e.id || q.ask === 'rf:' + e.id) { var pass = q.ask.indexOf('rp') === 0; h += fbAsk(p, e, 'rs', op.length > 1 ? (pass ? 'It works, they say' : 'It does not work, they say') : pass ? 'It works for ' + who : 'It does not work for ' + who, 'Record it', pass ? 'For example: Works on my phone' : 'What went wrong', op).replace('data-pd-form="fb:rs"', 'data-pd-form="fb:rs" data-v="' + (pass ? 'pass' : 'fail') + '"'); }
    else if (op.length) h += '<div class="pde-acts fb-acts"><button type="button" class="btn-primary btn-sm" data-pd="fb:rp" data-id="' + e.id + '">' + IC('tick') + '<span>' + (op.length > 1 ? 'It works, they say' : 'It works for ' + esc(who)) + '</span></button><button type="button" class="btn-ghost btn-sm" data-pd="fb:rf" data-id="' + e.id + '">' + (op.length > 1 ? 'It does not work, they say' : 'It does not work for ' + esc(who)) + '</button>' +
      '<button type="button" class="btn-ghost btn-sm" data-pd="fb:tell" data-id="' + e.id + '">' + IC('copy') + '<span>Copy a message to ' + esc(who) + '</span></button><button type="button" class="btn-ghost btn-sm" data-pd="fb:kclose" data-id="' + e.id + '">Close the request</button></div>';
    if (own) h += '<div class="pde-acts fb-rm"><button type="button" class="btn-ghost btn-sm" data-pd="fb:rm" data-id="' + e.id + '">Delete</button></div>';
    return h + '</div></section>';
  }
  function fbDetail(p, e) {
    if (e.k === 'chk') return fbChkDetail(p, e);
    var q = fbUi(p), st = fbStage(p, e), ab = fbAbout(p, e.ab), own = x8Role(p) === 'Owner', idea = fbIdea(p, e);
    var apw = e.k === 'appr' ? fbApWho(p, e) : [], who = fbFirst(p, e.k === 'appr' ? fbApOpen(e)[0] || (e.fr || [])[0] : (e.fr || [])[0]);
    var h = '<section class="card pd-card pd-cr-d fb-d" aria-labelledby="pd-h-fbd"><div class="card-h ruled"><div><span class="pd-eb">' + FB_KN[e.k] + '</span><h3 id="pd-h-fbd" class="fb-dt">' + esc(prvT(fbTitle(p, e), 120)) + '</h3><p><span class="chip ' + st.c + '">' + esc(st.l) + '</span><span>' + esc(prvDate(e.ts)) + '</span></p></div></div><div class="pde-b">';
    if (e.t.length > 120) h += '<blockquote class="fb-q">' + esc(e.t) + '</blockquote>';
    /* v89 (32.3): a small copy opens its original in the project's Google Drive */
    if ((e.pics || []).length) h += '<div class="fb-pics">' + e.pics.filter(function (x) { return /^data:image\//.test(x.d); }).map(function (x) {
      var im = '<img src="' + x.d + '" alt="' + esc(x.n) + '" loading="lazy">';
      return /^https:\/\/(drive|docs)\.google\.com\//.test(x.u || '') ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener" title="' + esc(sdT('Open the original in Google Drive')) + '">' + im + '</a>' : im;
    }).join('') + '</div>';
    h += '<dl class="fb-meta"><dt>From</dt><dd>' + esc(fbFrom(p, e.fr)) + '<span class="fb-via">' + esc(FB_VN[e.via] || FB_VN.meeting) + '</span></dd><dt>Recorded by</dt><dd>' + esc(fbBy(p, e.by)) + '</dd>' +
      (ab ? '<dt>It is about</dt><dd>' + (ab.fb ? '<button type="button" class="link" data-pd="fb:sel" data-id="' + ab.fb + '">' + esc(ab.l) + '</button>' : '<button type="button" class="link" data-pd="goto" data-tab="' + ab.tab + '">' + esc(ab.l) + '</button>') + '</dd>' : '') +
      (e.k === 'test' && e.bid && fbById(p, e.bid) ? '<dt>Bug</dt><dd><button type="button" class="link" data-pd="fb:sel" data-id="' + e.bid + '">' + esc(prvT(fbById(p, e.bid).t, 60)) + '</button></dd>' : '') +
      (idea ? '<dt>Idea</dt><dd><button type="button" class="link" data-pd="goto" data-tab="scope">' + esc(prvT(idea.t, 60)) + '</button></dd>' : '') +
      (e.k === 'appr' && e.due ? '<dt>Answer by</dt><dd>' + esc(fbDue(e.due)) + '</dd>' : '') + '</dl>';   /* v95 (40.2) */
    if (e.why) h += '<div class="pde-sec"><h4 class="pd-eb">' + (st.s === 'notbug' ? 'Why it is not a bug' : 'Why it was declined') + '</h4><p class="prv-bc">' + esc(e.why) + '</p></div>';
    /* v93: each Viewer's own answer */
    if (e.k === 'appr') { var as = fbAs(e); (e.fr || []).filter(function (x) { return as[x]; }).forEach(function (x) {
      var a = as[x], nm = fbFirst(p, x);
      h += '<div class="pde-sec fb-an"><h4 class="pd-eb">' + esc(a.v === 'yes' ? nm + ' approved it' : nm + ' did not approve it') + '</h4><p class="pde-small fb-when"><span>' + esc(FB_VN[a.via] || FB_VN.meeting) + '</span><span class="fb-via">' + esc(prvDate(a.ts)) + '</span></p>' + (a.t ? '<p class="prv-bc">' + esc(a.t) + '</p>' : '') + (a.code ? '<p class="pde-small">' + esc(nm) + ' answered on the Viewer portal with a code sent to their email. It is kept on the server and cannot be changed there.</p></div>' : '<p class="pde-small">Recorded by ' + esc(fbBy(p, a.by)) + '. This is a record of what ' + esc(nm) + ' said, not a signature.</p></div>');
    }); }
    if (e.k === 'appr' && fbApSt(e) === 'wait' && fbLate(e)) h += '<p class="pd-note warn">No answer is not a yes. Ask them again, or record what they said.</p>';
    if (e.cf) h += '<div class="pde-sec"><h4 class="pd-eb">Confirmed by ' + esc(fbCfWho(p, e)) + '</h4><p class="pde-small fb-when"><span>' + esc(FB_VN[e.cf.via] || FB_VN.meeting) + '</span><span class="fb-via">' + esc(prvDate(e.cf.ts)) + '</span></p>' + (e.cf.t ? '<p class="prv-bc">' + esc(e.cf.t) + '</p>' : '') + '</div>';
    /* v95 (40.3) */
    if (e.nf) h += '<div class="pde-sec fb-nf"><h4 class="pd-eb">' + esc(fbFirst(p, e.nf.fr) + ' says it still does not work') + '</h4><p class="pde-small fb-when"><span>' + esc(FB_VN[e.nf.via] || FB_VN.meeting) + '</span><span class="fb-via">' + esc(prvDate(e.nf.ts)) + '</span></p>' + (e.nf.t ? '<p class="prv-bc">' + esc(e.nf.t) + '</p>' : '') + '</div>';
    /* what to do next, by kind and stage */
    var acts = [];
    if (q.ask === 'no:' + e.id) h += fbAsk(p, e, 'no', 'Decline the request', 'Decline', 'Say why, in a way you could tell ' + who);
    else if (q.ask === 'nb:' + e.id) h += fbAsk(p, e, 'nb', 'Not a bug', 'Close as not a bug', 'What is actually happening, so you can tell ' + who);
    else if (q.ask === 'cf:' + e.id) h += fbAsk(p, e, 'cf', (e.fr || []).length > 1 ? 'It works, they say' : 'Confirmed by ' + who, 'Record it', 'For example: Works now, thanks', e.fr || []);
    else if (q.ask === 'yes:' + e.id || q.ask === 'nope:' + e.id) h += fbAsk(p, e, 'ans', apw.length > 1 ? (q.ask.indexOf('yes') === 0 ? 'Approved' : 'Not approved') : q.ask.indexOf('yes') === 0 ? fbFirst(p, apw[0]) + ' approved it' : fbFirst(p, apw[0]) + ' did not approve it', 'Record it', q.ask.indexOf('yes') === 0 ? 'For example: Fine to release' : 'What they want changed first', apw).replace('data-pd-form="fb:ans"', 'data-pd-form="fb:ans" data-v="' + (q.ask.indexOf('yes') === 0 ? 'yes' : 'nope') + '"');
    else if (q.ask === 'cm:' + e.id) h += fbAsk(p, e, 'cm', 'Add a comment', 'Add', 'What they said about it');
    else if (q.ask === 'nf:' + e.id) h += fbAsk(p, e, 'nf', 'It still does not work, they say', 'Record it', 'What still goes wrong, in their words', e.fr || []);
    else {
      if (e.k === 'req' && st.s === 'open') { acts.push('<button type="button" class="btn-primary btn-sm" data-pd="fb:park" data-id="' + e.id + '">' + IC('plus') + '<span>Put in the Parking Lot</span></button>'); acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:no" data-id="' + e.id + '">Decline…</button>'); }
      if (e.k === 'bug' && (st.s === 'open' || st.s === 'reopen')) { acts.push('<button type="button" class="btn-primary btn-sm" data-pd="fb:fixed" data-id="' + e.id + '">' + IC('tick') + '<span>Mark fixed</span></button>'); acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:nb" data-id="' + e.id + '">Not a bug…</button>'); }
      if (e.k === 'test' && st.s === 'fail') acts.push('<button type="button" class="btn-primary btn-sm" data-pd="fb:tobug" data-id="' + e.id + '">' + IC('plus') + '<span>Open a bug</span></button>');
      /* v93: an answer for one Viewer at a time; once all have answered, the Owner may change one recorded by hand */
      if (e.k === 'appr' && apw.length) { var op = fbApOpen(e).length > 0; acts.push('<button type="button" class="' + (op ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-pd="fb:yes" data-id="' + e.id + '">' + (op ? 'Approved' : 'Change to approved') + '</button>'); acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:nope" data-id="' + e.id + '">' + (op ? 'Not approved' : 'Change to not approved') + '</button>'); }
      if (st.s === 'built' || st.s === 'fixed') { acts.push('<button type="button" class="btn-primary btn-sm" data-pd="fb:tell" data-id="' + e.id + '">' + IC('copy') + '<span>Copy a message to ' + esc(who) + '</span></button>'); acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:cf" data-id="' + e.id + '">' + IC('tick') + '<span>' + ((e.fr || []).length > 1 ? 'It works, they say' : 'Confirmed by ' + esc(who)) + '</span></button>'); }
      /* v95 (40.3): it still does not work, they say; a request answers with Ready to check again (a bug with Mark fixed, above) */
      if (st.s === 'built' || st.s === 'fixed') acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:nf" data-id="' + e.id + '">It still does not work, they say</button>');
      if (st.s === 'reopen' && e.k === 'req') acts.push('<button type="button" class="btn-primary btn-sm" data-pd="fb:again" data-id="' + e.id + '">' + IC('tick') + '<span>Ready to check again</span></button>');
      if (e.k === 'appr' && fbApSt(e) === 'wait') acts.push('<button type="button" class="btn-ghost btn-sm" data-pd="fb:tell" data-id="' + e.id + '">' + IC('copy') + '<span>Copy a message to ' + esc(who) + '</span></button>');
      if (acts.length) h += '<div class="pde-acts fb-acts">' + acts.join('') + '</div>';
      if (st.s === 'park' || st.s === 'now' || st.s === 'next') h += '<p class="pde-small">It follows its idea in Scope. When the work is done, this asks you to tell ' + esc(who) + ' and to record what they say.</p>';
    }
    /* votes: which Viewers want a request */
    if (e.k === 'req' && fbViewers(p).length > 1) {
      h += '<div class="pde-sec"><h4 class="pd-eb">Who wants it</h4><div class="fb-votes" role="group" aria-label="Who wants it">' + fbViewers(p).map(function (m) { var k = String(m.e).toLowerCase(), on = (e.vo || []).indexOf(k) > -1; return '<button type="button" class="prv-lt" data-pd="fb:vote" data-id="' + e.id + '" data-e="' + esc(k) + '" aria-pressed="' + on + '">' + esc(m.n) + '</button>'; }).join('') + '</div><p class="pde-small">A count to weigh priority, not a decision.</p></div>';
    }
    /* v122 (94): the test results this bug was opened from, here rather than as rows of their own */
    var tied = e.k === 'bug' ? fbList(p).filter(function (x) { return x.k === 'test' && x.bid === e.id; }).sort(function (a, b) { return a.ts - b.ts; }) : [];
    if (tied.length) h += '<div class="pde-sec"><h4 class="pd-eb">' + (tied.length === 1 ? 'From a test result' : 'From test results') + '</h4><ul class="fb-cm fb-tie">' + tied.map(function (x) {
      return '<li><b>' + esc(fbFrom(p, x.fr)) + '</b><span class="chip ' + (x.res === 'pass' ? 'ok' : 'crit') + '">' + (x.res === 'pass' ? 'Pass' : 'Fail') + '</span>' + (x.t && x.t.trim() !== String(e.t || '').trim() ? '<span>' + esc(x.t) + '</span>' : '') + '<small><span>' + esc(prvDate(x.ts)) + '</span><button type="button" class="link fb-via" data-pd="fb:sel" data-id="' + x.id + '">Open the test result</button></small></li>';
    }).join('') + '</ul></div>';
    /* comments */
    var cm = fbList(p).filter(function (x) { return x.k === 'cmt' && x.ab === 'f:' + e.id; }).sort(function (a, b) { return a.ts - b.ts; });
    if (e.k !== 'cmt') h += '<div class="pde-sec"><h4 class="pd-eb">Comments <span class="n">' + cm.length + '</span></h4>' + (cm.length ? '<ul class="fb-cm">' + cm.map(function (c) { return '<li><b>' + esc(fbFrom(p, c.fr)) + '</b><span>' + esc(c.t) + '</span><small><span>' + esc(prvDate(c.ts)) + '</span><span class="fb-via">' + esc(FB_VN[c.via] || FB_VN.meeting) + '</span><span class="fb-via">Recorded by ' + esc(fbBy(p, c.by)) + '</span></small></li>'; }).join('') + '</ul>' : '') + (q.ask === 'cm:' + e.id ? '' : '<button type="button" class="btn-ghost btn-sm" data-pd="fb:cm" data-id="' + e.id + '">' + IC('plus') + 'Add a comment</button>') + '</div>';
    if (own) h += '<div class="pde-acts fb-rm"><button type="button" class="btn-ghost btn-sm" data-pd="fb:rm" data-id="' + e.id + '">Delete</button></div>';
    return h + '</div></section>';
  }

  /* ---- changing it: every change is noted in Recent and can be undone ---- */
  function fbChange(p, fn, note, toast, focus) {
    var snapF = JSON.stringify(fbList(p)), snapP = p.pv ? JSON.stringify(p.pv) : null, rec = note ? pdNote(p, note) : null, oldU = p.upd, oldT = p.updT;
    fn();
    pdTouch(p); if (p.pv) prvAfter(p); pdRefreshBadges(p); pdRerender(focus); pdRender(); SDB.soon(40);
    showToast(toast, function () { p.fb = JSON.parse(snapF); if (snapP) p.pv = JSON.parse(snapP); pdUnnote(p, rec); p.upd = oldU; p.updT = oldT; if (p.pv) prvAfter(p); pdRefreshBadges(p); if (pd.p === p) pdRerender(); pdRender(); SDB.soon(40); });
  }
  /* 22.4 on this screen: an Editor records and moves feedback; declining, not-a-bug, changing an approval, deleting and the old
     Viewers are the Owner's. An old Viewer reads only */
  function fbBlock(p, act, a) {
    var r = x8Role(p); if (r === 'Owner') return false;
    var k = act.slice(3), e = fbById(p, a.getAttribute('data-id'));
    if (k === 'sel' || k === 'f' || k === 'cancel' || k === 'nask') return false;
    if (r === 'Editor' && !(/^(no|nb|rm|solo)$/.test(k) || /^(yes|nope)$/.test(k) && e && !fbApOpen(e).length)) return false;
    if (r === 'Editor') { showToast('Only ' + x8Own1(p) + ' can do that here. You can record feedback and move it on.'); return true; }
    x8No(p); return true;
  }
  function fbBlockForm(p, k) {
    var r = x8Role(p); if (r === 'Owner') return false;
    if (r === 'Editor' && /^fb:(new|cf|cm|ans|chk|rs|nf)$/.test(k)) return false;
    if (r === 'Editor') { showToast('Only ' + x8Own1(p) + ' can do that here. You can record feedback and move it on.'); return true; }
    x8No(p); return true;
  }
  function fbAct(act, a) {
    var p = pd.p, q = fbUi(p), id = a.getAttribute('data-id'), e = id ? fbById(p, id) : null, who = e ? fbFirst(p, (e.k === 'appr' && fbApOpen(e)[0]) || (e.fr || [])[0]) : '';
    switch (act) {
      case 'new': q.form = true; q.ask = ''; pdRerender('#fb-t'); break;
      case 'chk': q.form = 'chk'; q.ask = ''; pdRerender('#fb-kab'); break;   /* v95 (40.1) */
      case 'cancel': q.form = false; pdRerender('[data-pd="fb:new"]'); break;
      case 'sel': q.sel = id; q.form = false; q.ask = ''; pdRerender('.fb-r[data-id="' + id + '"]'); if (window.innerWidth <= 1100) { var d = pdPanel.querySelector('.fb-d'); if (d) d.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } break;
      case 'nask': q.ask = ''; pdRerender('.fb-d'); break;
      case 'no': case 'nb': case 'cf': case 'cm': case 'yes': case 'nope': case 'rp': case 'rf': case 'nf': q.ask = act + ':' + id; pdRerender('#fb-aw'); break;
      case 'kclose': if (e) fbChange(p, function () { e.st = 'closed'; }, 'You closed the request to check ' + fbTitle(p, e), 'Closed. Answers that come later are still recorded as test results.', '.fb-d'); break;
      case 'again': if (e) fbChange(p, function () { delete e.nf; e.rdy = Date.now(); }, 'You said ' + who + '’s request is ready to check again', 'Ready again. Tell ' + who + ' and record what they say.', '[data-pd="fb:tell"]'); break;
      case 'park':
        if (!e) return;
        fbChange(p, function () {
          var idea = prvIdea(prvT(e.t, 90), e.t.length > 90 ? e.t : '', 'feedback', 0); idea.ts = Date.now(); idea.lg[0].ts = idea.ts; idea.fb = e.id;
          p.pv.park.unshift(idea); e.kid = idea.id;
        }, 'You put ' + who + '’s request in the Parking Lot', 'In the Parking Lot. It is not in Now until it passes the Gate.', '.fb-d');
        break;
      case 'fixed': if (e) fbChange(p, function () { e.st = 'fixed'; e.fx = Date.now(); delete e.nf; }, 'You marked ' + who + '’s bug fixed', 'Marked fixed. Tell ' + who + ' and record what they say.', '[data-pd="fb:tell"]'); break;
      case 'tobug':
        if (!e) return;
        fbChange(p, function () {
          var b = { id: fbId(), k: 'bug', fr: (e.fr || []).slice(), via: e.via, ts: Date.now(), t: e.t, ab: e.ab || '', by: fbMe(), st: 'open' };
          if ((e.pics || []).length) b.pics = e.pics.map(function (x) { return Object.assign({}, x); });   /* v121 (89): the pictures of what failed go with the bug */
          fbList(p).unshift(b); e.bid = b.id; q.sel = b.id;
        }, 'You opened a bug from ' + who + '’s test', 'Bug opened from the failed test', '.fb-d');
        break;
      case 'vote':
        if (!e) return;
        var ve = a.getAttribute('data-e'), on = (e.vo || []).indexOf(ve) > -1;
        fbChange(p, function () { e.vo = (e.vo || []).filter(function (x) { return x !== ve; }); if (!on) e.vo.push(ve); }, '', on ? fbPerson(p, ve) + ' no longer counted' : fbPerson(p, ve) + ' wants it too', '[data-pd="fb:vote"][data-e="' + ve + '"]');
        break;
      case 'tell': if (e) { var m = fbMsg(p, e); copyText(m, function () { flashCopied(a); showToast('Message copied. Send it to ' + who + ' your usual way.'); }); } break;
      case 'rm':
        if (!e) return;
        fbChange(p, function () { p.fb = fbList(p).filter(function (x) { return x !== e && !(x.k === 'cmt' && x.ab === 'f:' + e.id); }); q.sel = ''; }, 'You deleted ' + (e.k === 'appr' ? 'an ' : 'a ') + FB_KN[e.k].toLowerCase() + ' from ' + who, 'Deleted', '[data-pd="fb:new"]');
        break;
      case 'solo':
        var se = String(a.getAttribute('data-e') || '').toLowerCase(), mm = (p.team || []).filter(function (x) { return String(x.e || '').toLowerCase() === se; })[0];
        if (!mm) return;
        fbChange(p, function () { delete mm.join; }, 'You made ' + mm.n + ' a Viewer who no longer opens the project', mm.n + ' no longer opens the project. Their share is removed and the key changes at the next sync.', '.fb-ppl');
        if (p.dv && typeof dvRun === 'function') dvRun(false);
        break;
    }
  }
  function fbSubmit(k, f) {
    var p = pd.p, q = fbUi(p), id = f.getAttribute('data-id'), e = id ? fbById(p, id) : null, t = prvText((f.elements.t || {}).value), via = (f.elements.via || {}).value || 'meeting', who = e ? fbFirst(p, (e.fr || [])[0]) : '';
    if (k === 'new') {
      var kind = (f.querySelector('input[name="fbk"]:checked') || {}).value || 'req', fr = [].map.call(f.querySelectorAll('input[name="fr"]:checked'), function (x) { return x.value; }), ab = f.elements.ab.value, res = (f.querySelector('input[name="res"]:checked') || {}).value || '';
      if (!fr.length) return prvErr(f, 'fr', 'Choose who said it.');
      if (t.length < 2) return prvErr(f, 't', 'Write what they said.');
      if (kind === 'test' && !res) return prvErr(f, 'res', 'Choose Pass or Fail.');
      if (kind === 'appr' && !ab) return prvErr(f, 'ab', 'Choose what they are asked to approve.');
      var n = { id: fbId(), k: kind, fr: fr, via: via, ts: Date.now(), t: t, ab: ab, by: fbMe() };
      if (kind === 'req' || kind === 'bug') n.st = 'open';
      if (kind === 'appr') n.st = 'wait';
      if (kind === 'test') n.res = res;
      if (kind === 'appr' && /^\d{4}-\d{2}-\d{2}$/.test((f.elements.due || {}).value || '')) n.due = f.elements.due.value;   /* v95 (40.2) */
      fbChange(p, function () { fbList(p).unshift(n); q.form = false; q.sel = n.id; q.f = q.f === 'all' || q.f === kind ? q.f : 'all'; }, 'You recorded ' + (kind === 'appr' ? 'an approval to ask for' : 'a ' + FB_KN[kind].toLowerCase()) + ' from ' + fbFrom(p, fr), 'Recorded in ' + fbFrom(p, fr) + '’s name', '.fb-r[data-id="' + n.id + '"]');
      return;
    }
    if (k === 'chk') {   /* v95 (40.1) */
      var cab = (f.elements.ab || {}).value || '', cfr = [].map.call(f.querySelectorAll('input[name="fr"]:checked'), function (x) { return x.value; }), url = String((f.elements.url || {}).value || '').trim(), due = (f.elements.due || {}).value || '';
      var steps = String((f.elements.steps || {}).value || '').split(/\n+/).map(function (x) { return prvText(x).slice(0, 200); }).filter(Boolean).slice(0, 12);
      if (!cab) return prvErr(f, 'ab', 'Choose what to check.');
      if (!cfr.length) return prvErr(f, 'fr', 'Choose who should check it.');
      if (url && !/^https:\/\/[^\s<>"]+$/i.test(url)) return prvErr(f, 'url', 'The link must start with https://');
      var c = { id: fbId(), k: 'chk', fr: cfr, ts: Date.now(), t: t, ab: cab, url: url.slice(0, 500), due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '', steps: steps, by: fbMe(), rs: {}, st: 'open' };
      fbChange(p, function () { fbList(p).unshift(c); q.form = false; q.sel = c.id; q.f = q.f === 'all' || q.f === 'chk' ? q.f : 'all'; }, 'You asked ' + fbFrom(p, cfr) + ' to check ' + fbTitle(p, c), vpLive(p) ? 'Asked. It is first on their Viewer portal.' : 'Asked. Open the Viewer portal so they see it, or send them a message.', '.fb-r[data-id="' + c.id + '"]');
      return;
    }
    if (!e) return;
    if (k === 'no' || k === 'nb') {
      if (t.length < 2) return prvErr(f, 't', k === 'no' ? 'Say why. ' + who + ' will ask.' : 'Say what is actually happening.');
      fbChange(p, function () { e.st = k === 'no' ? 'no' : 'notbug'; e.why = t; q.ask = ''; }, k === 'no' ? 'You declined ' + who + '’s request' : 'You closed ' + who + '’s bug as not a bug', k === 'no' ? 'Declined. Tell ' + who + ' why.' : 'Closed as not a bug', '.fb-d');
    } else if (k === 'cf') {
      var cw = (f.elements.fr || {}).value; if ((e.fr || []).indexOf(cw) < 0) cw = (e.fr || [])[0] || ''; who = fbFirst(p, cw);
      fbChange(p, function () { e.cf = { ts: Date.now(), via: via, t: t, by: fbMe(), fr: cw }; q.ask = ''; }, who + ' confirmed it works', 'Closed. ' + who + ' confirmed it.', '.fb-d');
    } else if (k === 'ans') {
      /* v93: the answer of the one Viewer chosen, among those it can be recorded for */
      var v = f.getAttribute('data-v') === 'yes' ? 'yes' : 'nope', aw = (f.elements.fr || {}).value, ok = fbApWho(p, e);
      if (ok.indexOf(aw) < 0) aw = ok[0]; if (!aw) return;
      who = fbFirst(p, aw);
      fbChange(p, function () { fbAnswer(e, aw, { v: v, ts: Date.now(), via: via, t: t, by: fbMe() }); q.ask = ''; }, v === 'yes' ? who + ' approved it' : who + ' did not approve it', v === 'yes' ? 'Recorded: ' + who + ' approved it' : 'Recorded: ' + who + ' did not approve it', '.fb-d');
    } else if (k === 'rs') {   /* v95 (40.1): one Viewer's answer to a request to check, recorded by hand */
      var rv = f.getAttribute('data-v') === 'pass' ? 'pass' : 'fail', rw = (f.elements.fr || {}).value, rop = fbChkOpen(e);
      if (rop.indexOf(rw) < 0) rw = rop[0]; if (!rw) return;
      who = fbFirst(p, rw);
      fbChange(p, function () { fbChkAnswer(p, e, rw, { v: rv, ts: Date.now(), via: via, t: t, by: fbMe() }); q.ask = ''; }, rv === 'pass' ? who + ' says it works' : who + ' says it does not work', rv === 'pass' ? 'Recorded: it works for ' + who : 'Recorded: it does not work for ' + who + '. Open a bug from the test result if it needs one.', '.fb-d');
    } else if (k === 'nf') {   /* v95 (40.3) */
      if (t.length < 2) return prvErr(f, 't', 'Write what they said.');
      var nw = (f.elements.fr || {}).value; if ((e.fr || []).indexOf(nw) < 0) nw = (e.fr || [])[0] || ''; who = fbFirst(p, nw);
      fbChange(p, function () { fbNotFixed(p, e, { ts: Date.now(), fr: nw, t: t, via: via, by: fbMe() }); q.ask = ''; }, who + ' says it still does not work', 'Recorded. It waits for you again.', '.fb-d');
    } else if (k === 'cm') {
      if (t.length < 2) return prvErr(f, 't', 'Write what they said.');
      var fr1 = f.elements.fr.value;
      fbChange(p, function () { fbList(p).push({ id: fbId(), k: 'cmt', fr: [fr1], via: via, ts: Date.now(), t: t, ab: 'f:' + e.id, by: fbMe() }); q.ask = ''; }, 'You recorded a comment from ' + fbPerson(p, fr1), 'Comment added', '[data-pd="fb:cm"]');
    }
  }
  /* v95 (40.1): an answer to a request to check is a test result about the same thing, in the Viewer's name */
  function fbChkAnswer(p, e, who, a, tid) {
    var n = fbById(p, tid || '');   /* from the portal it is already in Feedback */
    if (n) n.rq = e.id;
    else { n = { id: tid || fbId(), k: 'test', fr: [who], via: a.via, ts: a.ts, t: a.t || '', ab: e.ab || '', by: a.by, res: a.v, rq: e.id }; fbList(p).unshift(n); }
    var rs = Object.assign({}, fbRs(e)); rs[who] = { v: a.v, ts: a.ts, via: a.via, t: a.t || '', by: a.by, tid: n.id }; e.rs = rs;
    return n;
  }
  /* v95 (40.3): it still does not work: a bug opens again, a built request waits for Ready to check again; their words are a comment */
  function fbNotFixed(p, e, nf, cid) {
    e.nf = nf; if (e.k === 'bug') { e.st = 'open'; delete e.fx; }
    if (!fbById(p, cid || '')) fbList(p).push({ id: cid || fbId(), k: 'cmt', fr: [nf.fr], via: nf.via, ts: nf.ts, t: nf.t, ab: 'f:' + e.id, by: nf.by });
  }
  function fbKind(t) { var f = t.closest('.fb-f'); if (f) { f.setAttribute('data-k', t.value); FB.k = t.value; } }
  /* the message to send them: short, in the app's language, about their own words */
  function fbMsg(p, e) {
    var who = fbFirst(p, (e.k === 'appr' && fbApOpen(e)[0]) || (e.fr || [])[0]), what = '“' + prvT(e.t, 80) + '”', m;   /* v93: an approval, the next one to answer */
    if (e.k === 'chk') { who = fbFirst(p, fbChkOpen(e)[0] || (e.fr || [])[0]); return sdT('Hi ' + who + ', could you check ' + sdT(fbTitle(p, e)) + ' in ' + p.n + ' and tell me whether it works? It is first on your Viewer portal, with the steps.'); }   /* v95 */
    if (e.k === 'appr') { var ab = fbAbout(p, e.ab); m = sdT('Hi ' + who + ', could you look at ' + (ab ? sdT(ab.l) : what) + ' in ' + p.n + ' and tell me whether you approve it?'); }
    else m = sdT('Hi ' + who + ', about ' + what + ': it is ready in ' + p.n + '. Could you try it and tell me whether it works for you?');
    return m;
  }

  /* ---- 22.4 on what arrives: what an Editor may change in p.fb ---- */
  function fbAllow(prev, next, author) {
    var pm = {}, out = [], seen = {};
    (prev || []).forEach(function (x) { if (x && x.id) pm[x.id] = x; });
    (Array.isArray(next) ? next : []).forEach(function (x) {
      if (!x || !x.id || seen[x.id]) return; seen[x.id] = 1;
      var pr = pm[x.id], r = x8Clone(x);
      if (!pr) { r.by = author || r.by || ''; out.push(r); return; }   /* new: recorded by whoever wrote it */
      r.by = pr.by; r.ts = pr.ts; r.k = pr.k;
      if ((r.st === 'no' || r.st === 'notbug') && pr.st !== r.st) { r.st = pr.st; r.why = pr.why; }
      /* v93: an answer once given stays as it was given (each Viewer's, e.as); one not given yet an Editor may add */
      if (pr.k === 'appr' && (pr.as || r.as)) {
        var pa = fbAs(pr), na = r.as && typeof r.as === 'object' ? r.as : {}; r.as = {};
        Object.keys(na).forEach(function (w) { if ((r.fr || []).indexOf(w) > -1 && na[w] && !pa[w]) { r.as[w] = x8Clone(na[w]); delete r.as[w].code; } });   /* only the portal gives a code */
        Object.assign(r.as, pa); r.st = fbApSt(r); if (pr.ans && fbApSt(pr) !== 'wait') r.ans = pr.ans;
      }
      else if (pr.k === 'appr' && pr.st !== 'wait') { r.st = pr.st; r.ans = pr.ans; }
      /* v95 (40.1): an answer to a request to check once given stays; a closed request stays closed */
      if (pr.k === 'chk') {
        var prs = fbRs(pr), nrs = fbRs(r); r.rs = {};
        Object.keys(nrs).forEach(function (w) { if ((r.fr || []).indexOf(w) > -1 && nrs[w] && !prs[w]) r.rs[w] = x8Clone(nrs[w]); });
        Object.assign(r.rs, prs); if (pr.st === 'closed') r.st = 'closed';
      }
      out.push(r);
    });
    (prev || []).forEach(function (x) { if (x && x.id && !seen[x.id]) out.push(x8Clone(x)); });   /* an Editor does not delete */
    return out;
  }

  /* ---- Copy for AI (32.4) ---- */
  function fbHandoff(p, sec, li, L) {
    var all = fbList(p); if (!all.length) return;
    var open = all.filter(function (e) { var s = fbStage(p, e); return (e.k === 'req' || e.k === 'bug') && s.g !== 'closed'; });
    var fails = all.filter(function (e) { return e.k === 'test' && e.res === 'fail'; }).slice(0, 6), wait = all.filter(function (e) { return e.k === 'appr' && fbApSt(e) === 'wait'; });
    var chk = all.filter(function (e) { return e.k === 'chk' && fbChkOpen(e).length; });   /* v95 (40.1) */
    if (!open.length && !fails.length && !wait.length && !chk.length) return;
    sec('Feedback from the people who use it');
    open.forEach(function (e) { li('[' + FB_KN[e.k] + ', ' + fbStage(p, e).l.toLowerCase() + '] ' + x6Md(e.t) + ' (' + x6Md(fbFrom(p, e.fr)) + (e.k === 'req' && (e.vo || []).length ? ', ' + e.vo.length + ' want it' : '') + ')'); });
    fails.forEach(function (e) { var ab = fbAbout(p, e.ab); li('[Test failed' + (ab ? ': ' + x6Md(ab.l) : '') + '] ' + x6Md(e.t) + ' (' + x6Md(fbFrom(p, e.fr)) + ')'); });
    chk.forEach(function (e) { li('[Check asked' + (fbLate(e) ? ', overdue' : '') + '] ' + x6Md(fbTitle(p, e)) + ' (waiting for ' + x6Md(fbNames(p, fbChkOpen(e))) + ')'); });
    wait.forEach(function (e) { var ab = fbAbout(p, e.ab); li('[Approval waited for] ' + (ab ? x6Md(ab.l) : x6Md(e.t)) + ' (' + x6Md(fbFrom(p, e.fr)) + ')'); });
  }
  if (sdTest()) window.__fb = { allow: function (a, b, au) { return fbAllow(a, b, au); }, ai: function (id) { return x6Handoff(pdById(id)); }, joins: function (id) { return (pdById(id).team || []).map(function (m) { return { e: m.e, role: m.role, join: !!m.join, joins: fbJoins(m) }; }); }, msg: function (id, eid) { var p = pdById(id); return fbMsg(p, fbById(p, eid)); },
    /* a Viewer added before v70, who still joins (32.1) */
    legacy: function (id, e) { (pdById(id).team || []).forEach(function (m) { if (String(m.e).toLowerCase() === e && m.role === 'Viewer') m.join = 1; }); }, legacyEnd: function () { return fbLegacyEnd(); } };
