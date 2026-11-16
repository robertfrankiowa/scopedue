  /* ================================================================== the next step, tied to a piece of work */
  /* how long the next step has stood: the stored moment, or what its "Set 3d ago" label says */
  var X6_UN = { m: 6e4, h: 36e5, d: X6_DAY, w: 7 * X6_DAY, mo: 30 * X6_DAY };
  function x6NextAge(p) {
    if (!p.next) return 0;
    if (p.nextTs) return Date.now() - p.nextTs;
    var s = String(p.nextAt || ''), m = /(\d{1,3})\s*(mo|m|h|d|w)\b/.exec(s);
    return m ? +m[1] * X6_UN[m[2]] : /yesterday/i.test(s) ? X6_DAY : 0;
  }
  function x6NextUnit(p) { return p.nextU ? wkUnit(p, p.nextU) : null; }
  function x6NextSug(p) {
    var us = wkUnits(p).filter(function (u) { return u.st !== 'done' && u.id !== p.nextU; }).sort(function (a, b) { return (a.st === 'doing' ? 0 : 1) - (b.st === 'doing' ? 0 : 1); }).slice(0, 4);
    if (!us.length) return '';
    return '<div class="x6-sug"><span>Or pick from the work</span>' + us.map(function (u) { return '<button type="button" data-pd="x6:nsug" data-id="' + esc(u.id) + '">' + esc(prvT(u.t, 48)) + '</button>'; }).join('') + '</div>';
  }
  /* v100 (52, spec PP-05): the current focus can be one of the things in Now (p.focusU), as the next step can be a piece of work */
  function x6FocusUnit(p) { return p.focusU ? wkUnit(p, p.focusU) : null; }
  function x6FocusSug(p) {
    var us = wkUnits(p).filter(function (u) { return u.st !== 'done' && u.id !== p.focusU; }).sort(function (a, b) { return (a.st === 'doing' ? 0 : 1) - (b.st === 'doing' ? 0 : 1); }).slice(0, 4);
    if (!us.length) return '';
    return '<div class="x6-sug"><span>Or pick from ' + (p.kind === 'private' ? 'Now' : 'the work') + '</span>' + us.map(function (u) { return '<button type="button" data-pd="x6:fsug" data-id="' + esc(u.id) + '">' + esc(prvT(u.t, 48)) + '</button>'; }).join('') + '</div>';
  }
  function x6FocusMeta(p) {
    if (!p.focusU) return '';
    var u = x6FocusUnit(p);
    if (!u) return '<p class="pd-sub"><span class="x6-nu off">' + IC('check') + 'No longer in ' + (p.kind === 'private' ? 'Now' : 'the work') + '</span></p>';
    return '<p class="pd-sub"><span class="x6-nu' + (u.st === 'done' ? ' ok' : '') + '">' + IC('check') + (p.kind === 'private' ? 'In Now' : 'In the work') + ' · ' + esc(WK_NM[wkShow(u)]) + '</span>' + (u.st === 'done' ? ' · Done: choose the next focus.' : '') + '</p>';
  }
  function x6NextMeta(p) {
    var u = x6NextUnit(p), bits = ['Set ' + esc(p.nextAt || 'just now')];
    if (u) bits.push('<span class="x6-nu">' + IC('check') + 'In the work · ' + esc(WK_NM[wkShow(u)]) + '</span>');
    if (p.owner && p.owner !== 'You') bits.push(esc(p.owner) + ' owns it');
    return bits.join(' · ');
  }
  /* completing the next step also completes the work it points at. Returns the undo */
  function x6NextDone(p) {
    var old = { next: p.next, nextAt: p.nextAt, nextU: p.nextU || '', nextTs: p.nextTs || 0, upd: p.upd, updT: p.updT }, u = x6NextUnit(p), snap = u ? snapOf(p) : null;
    if (u && u.st !== 'done') wkSet(p, u.id, x8Role(p) === 'Owner' ? { st: 'done', stk: '', wc: null } : { st: 'review', stk: '', wc: null, sn: u.sn || u.t });
    p.next = ''; p.nextAt = ''; p.nextU = ''; p.nextTs = 0;
    var note = pdNote(p, u ? 'You completed a next step and “' + prvT(u.t, 40) + '”' : 'You completed a next step');
    pdTouch(p);
    var tk = tdFind('next:' + p.id); if (tk && tk.t === old.next && !tk.done) { tk.done = 1; tk.dts = Date.now(); }
    if (u) wkAfter(p); else pdRefreshBadges(p);
    tdRender(); dbRecent();
    return function () { var k; for (k in old) p[k] = old[k]; if (snap) snapBack(p, snap); pdUnnote(p, note); if (tk) { tk.done = 0; tk.dts = 0; } if (u) wkAfter(p); else pdRefreshBadges(p); tdRender(); dbRecent(); };
  }
  function x6ToToday(p, b) {
    var key = 'next:' + p.id;
    if (tdIs(key)) return;
    if (TD.d !== x6Iso()) { tdClose(); TD.d = x6Iso(); TD.items = TD.items.filter(function (x) { return !x.done; }).slice(0, TD_MAX); }
    if (TD.items.length >= TD_MAX) { openDrawer('today', b); showToast('Today already has three. Swap one out.'); return; }
    var x = { key: key, k: 'next', pid: p.id, ref: p.id, t: p.next, tab: '', f: '', cr: '', done: 0, dts: 0 };
    TD.items.push(x); tdRender(); pdRerender('[data-pd="x6:today"]');
    showToast('Added to Today', function () { var i = TD.items.indexOf(x); if (i > -1) TD.items.splice(i, 1); tdRender(); if (pd.p === p) pdRerender(); });
  }
  /* facts only: a next step nobody touched for a week, and a live project with none at all */
  function x6Needs(p, have) {
    var out = [], now = Date.now();
    if (!x6Live(p)) return out;
    if (p.next && x6NextAge(p) >= 7 * X6_DAY) {
      var d = Math.floor(x6NextAge(p) / X6_DAY);
      out.push({ t: 'Next step unchanged for ' + x6Days(d), p: '“' + prvT(p.next, 60) + '”. Still the right one? Do it, change it, or mark it done.', chip: 'warn', chipT: 'Stale', tab: 'workspace', f: 'next' });
    } else if (!p.next && !have.some(function (x) { return x.t === 'Assign next step'; })) out.push({ t: 'No next step', p: 'Pick the one thing that moves this project forward.', chip: '', chipT: '', tab: 'workspace', f: 'next' });
    var od = wkUnits(p).filter(function (u) { return u.due && u.due < x6Iso() && u.st !== 'done'; });
    if (od.length) out.push({ t: od.length === 1 ? '1 item is past its date' : od.length + ' items are past their date', p: '“' + prvT(od[0].t, 40) + '” was due ' + x6Lbl(od[0].due) + (od.length > 1 ? ', and ' + (od.length - 1) + ' more' : '') + '. Do it, or move the date.', chip: 'crit', chipT: 'Overdue', tab: p.team.length ? 'team' : 'scope', f: p.team.length ? 'wk' : '' });
    if (p.kind === 'client') {
      var old = (p.later || []).filter(function (x) { return x.st === 'open' && now - x.ts >= 14 * X6_DAY; });
      if (old.length) out.push({ t: 'Decide ' + old.length + (old.length === 1 ? ' item' : ' items') + ' in Later', p: 'Make ' + (old.length === 1 ? 'it a change request or drop it' : 'them change requests or drop them') + ', so nothing is promised by silence.', chip: '', chipT: '', tab: 'workspace', f: 'later' });
    }
    return out;
  }

  /* ================================================================== client projects: Later and Decisions */
  function x6LaterCard(p) {
    var l = p.later || [], open = l.filter(function (x) { return x.st === 'open'; }), shut = l.filter(function (x) { return x.st !== 'open'; }), g = given(byId(p.cid) || {}) || 'the client';
    var h = '<section class="card pd-card" aria-labelledby="pd-h-later" id="x6-later"><div class="card-h ruled"><div><h3 id="pd-h-later">Later</h3><p>Asked for, not in the Scope. Nothing here is promised to ' + esc(g) + '.</p></div><div class="h-actions">' + (open.length ? '<span class="count">' + open.length + '</span>' : '') + '<button type="button" class="btn-ghost btn-sm" data-pd="x6:ladd">' + IC('plus') + 'Add</button></div></div>';
    if (pd.x6la) h += '<form class="pd-add x6-laf" data-pd-form="x6:later" novalidate><input name="t" maxlength="140" placeholder="What was asked for, or what you thought of" aria-label="What goes in Later" autocomplete="off"><input name="u" maxlength="300" placeholder="Link (optional)" aria-label="Link" inputmode="url" autocomplete="off"><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="x6:lcancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Add to Later</button></div><span class="err" role="alert"></span></form>';
    if (!l.length) return h + (pd.x6la ? '' : '<div class="cd-empty is-quiet">Nothing parked. When something comes up mid-project, put it here instead of doing it.</div>') + '</section>';
    h += '<ul class="x6-ll">' + open.map(function (x) {
      var age = Math.floor((Date.now() - x.ts) / X6_DAY);
      return '<li><div class="grow"><b>' + esc(x.t) + '</b><small>' + (age < 1 ? 'Today' : x6Days(age) + ' ago') + (x.u ? ' · <a href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer">' + esc(pdHost(x.u)) + '</a>' : '') + (age >= 14 ? ' · <span class="x6-old">waiting a while</span>' : '') + '</small></div>' +
        '<div class="x6-la"><button type="button" class="link" data-pd="x6:lcr" data-id="' + x.id + '">' + IC('swap') + 'Make it a change request</button><button type="button" class="link" data-pd="x6:ldrop" data-id="' + x.id + '">Drop</button></div></li>';
    }).join('') + '</ul>';
    if (shut.length) {
      h += '<div class="x6-lsh"><button type="button" class="link" data-pd="x6:lshow" aria-expanded="' + !!pd.x6ls + '">' + (pd.x6ls ? 'Hide decided' : shut.length + ' decided') + '</button></div>';
      if (pd.x6ls) h += '<ul class="x6-ll shut">' + shut.map(function (x) { return '<li><div class="grow"><b>' + esc(x.t) + '</b><small>' + (x.st === 'cr' ? 'Became ' + esc(x.cr) : 'Dropped') + '</small></div>' + (x.st === 'cr' ? '<button type="button" class="link" data-pd="goto" data-tab="change" data-cr="' + esc(x.cr) + '">Open ' + esc(x.cr) + '</button>' : '') + '</li>'; }).join('') + '</ul>';
    }
    return h + '</section>';
  }
  function x6DecCard(p) {
    var l = (p.cdec || []).slice().reverse(), all = pd.x6da || l.length <= 3, pre = pd.x6dec;
    var h = '<section class="card pd-card" aria-labelledby="pd-h-cdec" id="x6-dec"><div class="card-h ruled"><div><h3 id="pd-h-cdec">Decisions</h3><p>What was decided inside the studio, and why. Entries can’t be edited.</p></div><div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="x6:dadd">' + IC('plus') + 'Log decision</button></div></div>';
    if (pd.x6df || pre) {
      var crs = (p.crs || []).slice().reverse();
      h += '<form class="x6-decf" data-pd-form="x6:dec" novalidate><label class="dn-fl"><span>What was decided</span><input name="t" maxlength="160" value="' + esc(pre ? pre.t : '') + '" placeholder="For example, Use Stripe Checkout, not a custom form" autocomplete="off"></label>' +
        '<label class="dn-fl"><span>Why <em>Required</em></span><textarea name="b" rows="2" maxlength="600" placeholder="The reason, so nobody argues it again"></textarea></label>' +
        (crs.length ? '<label class="dn-fl"><span>About <em>Optional</em></span><span class="pd-sel"><select name="cr"><option value="">Not about a change request</option>' + crs.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.id + ' · ' + c.t) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></label>' : '') +
        '<span class="err" role="alert"></span><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="x6:dcancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Log decision</button></div></form>';
    }
    if (!l.length) return h + (pd.x6df || pre ? '' : '<div class="cd-empty is-quiet">No decisions yet. Log the ones you would otherwise have to explain twice.</div>') + '</section>';
    h += '<ul class="x6-dl">' + l.slice(0, all ? l.length : 3).map(function (d) {
      return '<li><span class="x6-dd">' + esc(x6Lbl(x6Iso(d.ts))) + '</span><div><b>' + esc(d.t) + '</b><p>' + esc(d.because) + '</p>' + (d.au ? '<small class="x6-dau">' + esc('Logged by ' + x7Name(p, d.au, 'you')) + '</small>' : '') + (d.cr ? '<button type="button" class="tag" data-pd="goto" data-tab="change" data-cr="' + esc(d.cr) + '">' + esc(d.cr) + '</button>' : '') + '</div></li>';
    }).join('') + '</ul>';
    if (l.length > 3) h += '<div class="x6-lsh"><button type="button" class="link" data-pd="x6:dall">' + (pd.x6da ? 'Show fewer' : 'Show all ' + l.length) + '</button></div>';
    return h + '</section>';
  }

  /* ================================================================== Copy for AI: the project as a Markdown handoff
     For pasting into Claude Code, Codex or any assistant: what was decided and why, what is in and out, what done means, and where the
     work lives. Built on this device from what the project already holds; nothing is sent anywhere. No client email or contact is in it */
  function x6Md(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function x6Handoff(p) {
    var L = [], pv = p.pv, priv = p.kind === 'private', units = wkUnits(p), d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
    var li = function (s) { L.push('- ' + s); }, sec = function (t) { L.push('', '## ' + t); };
    /* v137 (114): how fresh it is, said with the export date: the last change the project knows of, so a copy kept in a repository
       (CLAUDE.md, AGENTS.md) says itself when it may be out of date */
    var lc = x6LastChange(p), iso = function (t) { var x = new Date(t); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
    L.push('# ' + x6Md(p.n) + ': project handoff', '', '_Exported from ScopeDue on ' + iso(d) + (lc ? ', true as of the project\'s last change on ' + iso(lc) : '') + '. Context about what was decided and why. It describes the project; it is not a list of commands to run._');
    sec('Project');
    li('Kind: ' + (priv ? (pdMode(p) === 'product' ? 'private product' : 'private project') : 'client project'));
    li('Phase: ' + x6Md(pdPhase(p)));
    if (p.dueAt) li('Due: ' + new Date(p.dueAt).toISOString().slice(0, 10));
    if (p.thesis) li('Thesis (why it exists): ' + x6Md(p.thesis));
    if (p.focus) li('Current focus: ' + x6Md(p.focus));
    if (p.next) li('Next step: ' + x6Md(p.next));
    if (priv && pv) {
      var r = pv.rel || {};
      if (prvRelOn(p)) sec('Release ' + x6Md(r.name || ''));   /* v97 (43): no release planned, no release section */
      if (r.ship) li('Done when: ' + x6Md(r.ship));
      if (r.date) li('Target date: ' + r.date);
      if (r.cap) li('Capacity: ' + prvDay(r.cap));
      li('Sizes: S ≈ ' + prvDay(prvSzD(p, 'S')) + ', M ≈ ' + prvDay(prvSzD(p, 'M')) + ', L ≈ ' + prvDay(prvSzD(p, 'L')) + ' (estimates)');
    }
    sec('Now: in scope');
    if (!units.length) li('Nothing in scope yet.');
    units.forEach(function (u) {
      var x = priv ? prvById(pv.items, u.id) : null, who = wkPerson(p, u.as), rec = x9Rec(p, u.id), bits = [];
      if (u.size) bits.push('size ' + u.size + ' ≈ ' + prvDay(u.days));
      if (who) bits.push('owner ' + (who === ME ? x6Md(pfSaved.name) || 'me' : x6Md(who.n)));
      if (u.due) bits.push('due ' + u.due);
      if (u.out) bits.push('outside the agreed baseline');
      /* v69: Done says whether it is verified (section 31) */
      var vr = wkVer(p, u), stl = !vr ? WK_NM[wkShow(u)] : vr.k === 'ok' ? 'Done, verified by hand: ' + vr.cp.m : vr.k === 'tested' ? 'Done, tested, not verified: ' + vr.why : vr.k === 'cfail' ? 'Done, but its last check failed: ' + (vr.cp.n || vr.cp.m) : vr.k === 'stale' ? 'Done, verified before a change, check it again: ' + vr.why : vr.k === 'none' ? 'Done' : vr.k === 'pending' ? 'Done, checks running' : 'Done, not verified: ' + vr.why;   /* v97 (45) */
      li('[' + stl + '] ' + x6Md(u.t) + (bits.length ? ' (' + bits.join(', ') + ')' : ''));
      if (x && x.why) L.push('  - Why: ' + x6Md(x.why));
      if (u.stk) L.push('  - Blocked: ' + x6Md(u.stk));
      u.dod.forEach(function (c, i) { if (!i) L.push('  - Done when:'); L.push('    - [' + (c.ok ? 'x' : ' ') + '] ' + x6Md(c.t)); });
      ((rec && rec.gh) || []).forEach(function (e) { L.push('  - GitHub: ' + e.o + '/' + e.r + '#' + e.n + ' (' + (e.k === 'pull' ? 'pull request' : 'issue') + (e.st ? ', ' + (X9_NM[e.st] || e.st).toLowerCase() : '') + (e.ck === 'fail' ? ', checks failing' : e.ck === 'pass' ? ', checks passing' : '') + ') ' + x9Url(e)); });
    });
    if (priv && pv) {
      var nx = prvBucket(p, 'next'), nv = prvBucket(p, 'out');
      if (nx.length) { sec('Next: later, not now'); nx.forEach(function (x) { li(x6Md(x.t) + (x.why ? ': ' + x6Md(x.why) : '')); }); }
      if (nv.length) { sec('Never: do not build'); nv.forEach(function (x) { li(x6Md(x.t) + (x.why ? ': ' + x6Md(x.why) : '')); }); }
      /* v69: ideas parked for later, so an assistant knows they are known and not yet decided */
      var pk = (pv.park || []).filter(function (x) { return x.st === 'parked'; }).slice(0, 12);
      if (pk.length) { sec('Parking Lot: ideas, not decided'); pk.forEach(function (x) { li(x6Md(x.t) + (x.d ? ': ' + x6Md(x.d) : '')); }); }
      var pr = prvPrinc(p); if (pr.length) { sec('Principles'); pr.forEach(function (x) { li(x6Md(x.t)); }); }
      var od = prvOpenDec(p); if (od.length) { sec('Open decisions'); od.forEach(function (x) { li(x6Md(x.t)); }); }
      /* v137 (114): what is not known yet, so an assistant asks instead of assuming */
      var oq = (pv.asm && pv.asm.q) || []; if (oq.length) { sec('Open questions: not known yet'); oq.forEach(function (x) { li(x6Md(x.t)); }); }
      var cd = pv.dec.filter(function (x) { return x.st !== 'open' && x.because; }).sort(function (a, b) { return (b.dts || b.ots || 0) - (a.dts || a.ots || 0); }).slice(0, 8);
      if (cd.length) {
        sec('Recent decisions');
        cd.forEach(function (x) {
          li(x6Md(x.t) + ': ' + x6Md(x.because));
          /* v69: what was weighed and turned down, so it is not proposed again without a new reason */
          var no = (x.opts || []).filter(function (o) { return !o.c && o.t; }).map(function (o) { return x6Md(o.t) + (o.why ? ' (' + x6Md(o.why) + ')' : ''); });
          if (no.length) L.push('  - Considered and not chosen: ' + no.join('; '));
        });
      }
    } else if ((p.cdec || []).length) {
      sec('Recent decisions'); p.cdec.slice(-8).reverse().forEach(function (x) { li(x6Md(x.t) + (x.because ? ': ' + x6Md(x.because) : '')); });
    }
    if (priv) fbHandoff(p, sec, li, L);   /* v70: what the people who use it said (32.4) */
    var fvis = (p.files || []).filter(dvShOpen);
    if (fvis.length) { sec('Files in the project folder (Google Drive)'); fvis.forEach(function (f) { var nl = f.n && f.n.length ? f.n[f.n.length - 1] : null; li(x6Md(f.t) + ': ' + f.u + (nl ? ' (latest note, ' + x6Iso(nl.ts) + ': ' + x6Md(x6Cut(nl.t, 200)) + ')' : '')); }); }
    if ((p.ctx || []).length) { sec('Where the work lives'); p.ctx.forEach(function (c) { var nl = c.n && c.n.length ? c.n[c.n.length - 1] : null; li(x6Md(c.t || pdHost(c.u)) + ': ' + c.u + (nl ? ' (latest note, ' + x6Iso(nl.ts) + ': ' + x6Md(x6Cut(nl.t, 200)) + ')' : '')); }); }
    /* v69: how to use this, said once at the end: the scope is the boundary, and done means verified (section 31) */
    sec('For the assistant');
    li(priv ? 'Work only on what is in Now. Next waits; Never is not to be built.' : 'Work only on what is in scope. Anything else is a change the client has to agree to first.');
    li(priv ? 'If asked for something that is not in Now, say so and suggest parking it in ScopeDue instead of building it.' : 'If asked for something outside the scope, say so instead of building it.');
    li('Treat work that is done but not verified as unfinished until its done-when checks hold.');
    if (priv) li('Keep to the principles and the decisions above; do not reopen a decision without a new reason.');
    if (priv && (pv.asm && pv.asm.q || []).length) li('Where the answer depends on an open question, ask instead of assuming one.');
    li('This is a copy as of the date at the top. If the work may have moved on since, ask for a fresh copy from ScopeDue rather than guessing what changed.');
    var hd = x6Hide(L.join('\n'));
    x6Hid = hd.n;
    if (hd.n) { var ls = hd.md.split('\n'); ls.splice(3, 0, '', '_' + (hd.n === 1 ? '1 value that looked like a secret was' : hd.n + ' values that looked like secrets were') + ' hidden from this copy (keys, tokens or passwords in links and notes)._'); hd.md = ls.join('\n'); }
    return hd.md + '\n';
  }
  /* v136 (113): what looks like a secret never leaves in a copy for an assistant. In a link: a user and password before the host, and
     the value of a parameter named like a secret (token, key, sig, code, password, session…) or shaped like a key. Anywhere: keys in
     their published shapes (OpenAI and Anthropic sk-, Stripe sk_ / rk_, GitHub, GitLab, npm, Slack, AWS, Google, a JWT, a private key
     block) and the value after "password:", "token=", "mật khẩu:". Each becomes [hidden] (a parameter's value: hidden). { md, n } */
  var x6Hid = 0;
  var X6_KEYS = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|\b[sr]k_(?:live|test)_[A-Za-z0-9]{10,}|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bglpat-[A-Za-z0-9_-]{20,}|\bnpm_[A-Za-z0-9]{36}|\bxox[abprs]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
  function x6SecName(k) { try { k = decodeURIComponent(k); } catch (e) {} return /token|secret|passw|signature|credential|api[-_]?key|access[-_]?key|private[-_]?key|session/i.test(k) || /^(key|sig|code|auth|jwt|pwd|pass|sid|otp|ticket)$/i.test(k); }
  function x6KeyLike(v) { X6_KEYS.lastIndex = 0; var r = X6_KEYS.test(v); X6_KEYS.lastIndex = 0; return r; }
  function x6Hide(md) {
    var n = 0;
    md = md.replace(/https?:\/\/[^\s)<>"']+/g, function (u) {
      u = u.replace(/^(https?:\/\/)[^\/?#@\s]+@/, function (m, s) { n++; return s; });
      return u.replace(/([?&#;])([^=&#;\s]+)=([^&#;\s]*)/g, function (m, sep, k, v) {
        if (!v || v === 'hidden' || !(x6SecName(k) || x6KeyLike(v))) return m;
        n++; return sep + k + '=hidden';
      });
    });
    md = md.replace(X6_KEYS, function () { n++; return '[hidden]'; });
    /* after a password word, any value; after "token", "secret" or "API key", only one that looks made by a machine (12 or more
       characters with a digit), so "token: short-lived" in a decision stays as it was written */
    md = md.replace(/(^|[\s("'“])((password|passwd|passcode|api[ _-]?key|secret|token|mật khẩu|mat khau)\s*[:=]\s*)([^\s,;)"'”]+)/gi, function (m, a, b, w, v) {
      if (v === '[hidden]' || v === 'hidden') return m;
      var end = /[.!?:]+$/.exec(v); end = end ? end[0] : ''; v = v.slice(0, v.length - end.length);   /* a full stop ends the sentence */
      if (!v || (!/pass|mật|mat/i.test(w) && !(v.length >= 12 && /\d/.test(v)))) return m;
      n++; return a + b + '[hidden]' + end;
    });
    return { md: md, n: n };
  }
  if (sdTest()) window.__hide = function (s) { return x6Hide(s); };
  /* v137 (114): the last change this device knows of on the project (pdTouch keeps it), 0 when none */
  function x6LastChange(p) { var t = +p.updT || 0; return t > 0 && t <= Date.now() + 6e4 ? t : 0; }
  /* v137 (114): the same Markdown saved as a file an assistant reads by itself: CLAUDE.md (Claude Code) or AGENTS.md (Codex, Cursor
     and others). Nothing is written anywhere but the browser's downloads; where it goes in the code is the person's choice */
  function x6Save(p, name) {
    var md = x6Handoff(p), hn = x6Hid, a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    showToast(!hn ? 'Saved ' + name + ' to your downloads. Put it in the top folder of the code.' : hn === 1 ? 'Saved ' + name + ' to your downloads, with 1 secret hidden. Put it in the top folder of the code.' : 'Saved ' + name + ' to your downloads, with ' + hn + ' secrets hidden. Put it in the top folder of the code.');
  }
  /* ================================================================== Working context: links you can edit, notes, tabs */
  /* notes on a saved tab or a link: short updates kept as a timeline (x.n, oldest first; shown newest first).
     The open one is pd.x6nt: 't3' is the fourth saved tab, 'l0' the first link, 'f1' the second file */
  function x6NtItem(p, k) { var m = /^([tlf])(\d+)$/.exec(k || ''); if (!m || pd.x6ntp !== p.id) return null; var it = m[1] === 't' ? x6Stabs(p)[+m[2]] || null : m[1] === 'f' ? (p.files || [])[+m[2]] || null : p.ctx[+m[2]] || null; return it && dvShOpen(it) ? it : null; }
  function x6NtWhen(ts) { var d = new Date(ts); return x6Rel(x6Iso(ts)) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function x6NtLast(x) { var n = x.n && x.n.length ? x.n[x.n.length - 1] : null; return n ? '<span class="x6-nl"><span>' + esc(x6Cut(n.t, 90)) + '</span><i>' + esc(x6Rel(x6Iso(n.ts))) + '</i></span>' : ''; }
  function x6NtBtn(p, k, x) {
    var c = (x.n || []).length, on = !!x6NtItem(p, k) && pd.x6nt === k;
    return '<button type="button" class="x6-nb' + (c ? ' has' : '') + '" data-pd="x6:nt" data-k="' + k + '" aria-expanded="' + on + '"' + (on ? ' aria-controls="x6-nt"' : '') + ' aria-label="Notes on ' + esc(x.t || pdHost(x.u)) + '" title="' + (c ? c + (c === 1 ? ' note' : ' notes') : 'Add a note') + '">' + IC('edit') + (c ? '<span>' + c + '</span>' : '') + '</button>';
  }
  function x6NtPanel(p, k, x) {
    var ns = (x.n || []).slice().reverse();
    return '<div class="x6-nt" id="x6-nt" role="region" aria-label="Notes on ' + esc(x.t || pdHost(x.u)) + '">' +
      '<form class="x6-ntf" data-pd-form="x6:note" data-k="' + k + '" novalidate><textarea name="t" rows="2" maxlength="600" placeholder="Add an update: what changed, what to remember" aria-label="New note"></textarea>' +
      '<div class="x6-ntb"><span class="err" role="alert"></span><button type="button" class="btn-ghost btn-sm" data-pd="x6:ntx" data-k="' + k + '">Close</button><button type="submit" class="btn-primary btn-sm">Add update</button></div></form>' +
      (ns.length ? '<ol class="x6-tml">' + ns.map(function (n) {
        return '<li><time datetime="' + new Date(n.ts).toISOString() + '">' + esc(x6NtWhen(n.ts)) + (n.by && n.by !== dvShMe() ? ' · ' + esc(x8NameOf(p, n.by)) : '') + '</time><p>' + esc(n.t) + '</p><button type="button" class="icon-sm" data-pd="x6:nrm" data-k="' + k + '" data-id="' + esc(n.id) + '" aria-label="Remove this note" title="Remove this note">' + IC('x') + '</button></li>';
      }).join('') + '</ol>' : '<p class="x6-nte">No notes yet. The first one starts the timeline.</p>') + '</div>';
  }
  function x6Ext() { try { return typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id && chrome.windows && chrome.tabs); } catch (e) { return false; } }
  function x6CtxCard(p) {
    var ed = pd.x6le && p.ctx.length, h = '<section class="card pd-card" aria-labelledby="pd-h-ctx"><div class="card-h ruled"><div><h3 id="pd-h-ctx">Working context</h3><p>The links, notes and tabs you need to pick this back up.</p></div><div class="h-actions">' +
      (ed ? '' : '<button type="button" class="btn-ghost btn-sm" data-pd="x6:ai" title="Copy this project as Markdown for an AI assistant: decisions, scope, what done means and where the work lives">' + IC('doc') + 'Copy for AI</button>') +
      (p.ctx.length ? '<button type="button" class="btn-ghost btn-sm" data-pd="x6:led" aria-pressed="' + !!ed + '">' + (ed ? 'Done' : 'Edit') + '</button>' : '') + (ed ? '' : '<button type="button" class="btn-ghost btn-sm" data-pd="addlink">' + IC('plus') + 'Add link</button>') + '</div></div>';
    if (x6Ext()) {
      var tl = x6Stabs(p), vis = tl.filter(dvShOpen), last = vis.reduce(function (m, x) { return Math.max(m, x.ts || 0); }, 0), mineN = vis.filter(dvShMine).length;
      if (!vis.length) pd.x6tl = false;
      h += '<div class="x6-tabs"><span class="pd-tile-i">' + IC('copy') + '</span><div class="grow">' + (vis.length ? '<button type="button" class="x6-tt" data-pd="x6:tlist" aria-expanded="' + !!pd.x6tl + '" aria-controls="x6-tl" title="' + (pd.x6tl ? 'Hide the saved tabs' : 'Show the saved tabs') + '"><b>' + vis.length + (vis.length === 1 ? ' tab saved' : ' tabs saved') + '</b>' + IC('chev') + '</button>' : '<b>Tabs</b>') + '<small>' + (vis.length ? 'Saved ' + esc(x6Rel(x6Iso(last))) + ' · ' + esc(vis.slice(0, 3).map(function (x) { return pdHost(x.u); }).join(', ')) + (vis.length > 3 ? '…' : '') : 'Save the tabs open in this window, and open them again in one click.') + '</small></div>' +
        (vis.length ? '<button type="button" class="btn-ghost btn-sm" data-pd="x6:tsave">' + (mineN ? 'Update' : 'Save open tabs') + '</button><button type="button" class="btn-primary btn-sm" data-pd="x6:topen">Open tabs</button>' : '<button type="button" class="btn-ghost btn-sm" data-pd="x6:tsave">Save open tabs</button>') + '</div>';
      /* the saved tabs, shown on a click: yours first, then the ones shared with you (37.5) */
      if (vis.length && pd.x6tl) {
        var rows = tl.map(function (x, i) { return { x: x, i: i }; }).filter(function (r) { return dvShOpen(r.x); });
        rows = rows.filter(function (r) { return dvShMine(r.x); }).concat(rows.filter(function (r) { return !dvShMine(r.x); }));
        h += '<div class="x6-tl" id="x6-tl"><ul>' + rows.map(function (r) {
          var x = r.x, i = r.i, k = 't' + i, on = pd.x6nt === k && x6NtItem(p, k), au = x6AuOpen(p, k), own = dvShMine(x);
          return '<li' + (on || au ? ' class="on"' : '') + '><div class="x6-tr"><a href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(x.u) + '"><span class="pd-tile-i">' + IC('link') + '</span><span class="pd-tile-t"><b>' + esc(x.t || pdHost(x.u)) + '</b><small>' + esc(pdHost(x.u)) + '</small>' + x6NtLast(x) + '</span></a>' +
            x6AuChip(p, k, x) + x6NtBtn(p, k, x) + (own ? '<button type="button" class="icon-sm" data-pd="x6:trm" data-i="' + i + '" aria-label="Remove ' + esc(x.t || pdHost(x.u)) + '" title="Remove this tab">' + IC('x') + '</button>' : '') + '</div>' +
            (au ? x6AuPanel(p, k, x) : '') + (on ? x6NtPanel(p, k, x) : '') + '</li>';
        }).join('') + '</ul>' + (mineN ? '<div class="x6-tlf"><button type="button" class="link" data-pd="x6:tclr">' + (mineN < vis.length ? 'Remove your saved tabs' : 'Remove all saved tabs') + '</button></div>' : '') + '</div>';
      }
    }
    h += x6FilesHTML(p);
    /* the links come after the tabs and the files, so adding one opens here, where they show */
    if (pd.adding) h += '<form class="pd-add" data-pd-form="addlink" novalidate><input name="t" placeholder="Name (optional)" maxlength="60" aria-label="Link name" autocomplete="off"><input name="u" placeholder="https://…" maxlength="300" aria-label="Link address" inputmode="url" autocomplete="off"><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Add</button></div><span class="err" role="alert">Enter a full link, like https://drive.google.com/…</span></form>';
    if (!p.ctx.length) { /* nothing: Add link is in the header */ }
    else if (ed) {
      h += '<form class="x6-led" data-pd-form="x6:links" novalidate><ul>' + p.ctx.map(function (x, i) {
        return '<li data-i="' + i + '"><span class="pd-tile-i">' + IC(PD_CTX_IC[x.k] || 'link') + '</span><input name="t' + i + '" value="' + esc(x.t) + '" maxlength="60" aria-label="Name"><input name="u' + i + '" value="' + esc(x.u) + '" maxlength="300" aria-label="Address" inputmode="url">' +
          '<span class="x6-lmv"><button type="button" class="icon-sm" data-pd="x6:lup" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + IC('up') + '</button><button type="button" class="icon-sm" data-pd="x6:lrm" data-i="' + i + '" aria-label="Remove ' + esc(x.t) + '">' + IC('x') + '</button></span></li>';
      }).join('') + '</ul><span class="err" role="alert"></span><div class="f-acts"><button type="submit" class="btn-primary btn-sm">Save links</button></div></form>';
    } else {
      h += '<div class="pd-res">';
      p.ctx.forEach(function (x, i) { h += '<div class="x6-lk' + (pd.x6nt === 'l' + i && x6NtItem(p, 'l' + i) ? ' on' : '') + '"><a class="pd-tile' + (x.fresh ? ' fresh' : '') + '" href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer"><span class="pd-tile-i">' + IC(PD_CTX_IC[x.k] || 'link') + '</span><span class="pd-tile-t"><b>' + esc(x.t) + '</b><small>' + esc(pdHost(x.u)) + '</small>' + x6NtLast(x) + '</span>' + IC('ext') + '</a>' + x6NtBtn(p, 'l' + i, x) + '</div>'; });
      p.ctx.forEach(function (x) { x.fresh = false; });
      h += '</div>';
      var ol = /^l/.test(pd.x6nt || '') && x6NtItem(p, pd.x6nt);
      if (ol) h += '<div class="x6-ntw"><div class="x6-nth">' + IC('edit') + '<b>' + esc(ol.t || pdHost(ol.u)) + '</b><small>' + esc(pdHost(ol.u)) + '</small></div>' + x6NtPanel(p, pd.x6nt, ol) + '</div>';
    }
    var ns = notes.filter(function (n) { return n.pid === p.id; });
    if (ns.length) h += '<div class="x6-pn"><h4>Notes</h4><ul>' + ns.slice(0, 3).map(function (n) { return '<li>' + IC('doc') + '<span>' + esc(x6Cut(n.text, 120)) + '</span>' + (n.rem ? '<small class="' + (x6NoteDue(n) ? 'due' : '') + '">' + esc(x6Rel(n.rem)) + '</small>' : '') + '</li>'; }).join('') + '</ul>' + '<button type="button" class="link" data-pd="x6:notes">' + (ns.length > 3 ? 'All ' + ns.length + ' notes' : 'Open notes') + '</button></div>';
    return h + '</section>';
  }
  /* ================================================================== Files: picked on this computer, kept in <project>/Files in the
     project's Google Drive folder (p.files: { id, t, u, sz, mt, ts, by }, plus notes in n). Removing one deletes it from Drive for good;
     the copy on the computer is never touched. The Owner and Editors of a project kept in Drive add files, from the extension for now;
     only the one who added a file deletes it or changes who sees it (37.3) */
  var X6_FMAX = 100 * 1024 * 1024;
  function x6Size(b) { b = +b || 0; return b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB'; }
  function x6FilesWhy(p) {
    if (!drReady()) return { t: 'Adding files needs Google Drive, which works in the ScopeDue extension for now.' };
    if (!p.dv) return dvCan(p) ? { t: 'Files are kept in this project’s folder in your Google Drive. Keep the project in Google Drive first, then pick the files.', keep: 1 } : { t: 'Only the owner can keep this project in Google Drive.' };   /* v88: client projects as private ones */
    if (dvRole(p) === 'Viewer') return { t: 'Viewers read this project; they do not add files.' };
    if (!dvOn()) return { t: 'Google Drive is not connected on this device. Connect it in Settings, then add the files.' };
    if (p.dv.st !== 'ok') return { t: 'Google Drive needs attention first. See the Google Drive card on this page.' };
    return null;
  }
  /* where a file goes: for everyone, the project folder's Files (an Editor's own Files · <name>); for the others, the project's
     private folder in this person's own ScopeDue/ (37.3). Their ids are kept per device in p.dv */
  async function x6FilesDir(p, all) {
    var d = p.dv, nm = (pfSaved && pfSaved.name) || dvShMe().split('@')[0] || 'me';
    if (all) {
      if (d.ffid) return { ok: true, data: { id: d.ffid } };
      var r = await drvSub(d.fid, dvRole(p) === 'Owner' ? 'Files' : 'Files · ' + nm, 'files'); if (r.ok) d.ffid = r.data.id; return r;
    }
    if (d.fpid) return { ok: true, data: { id: d.fpid } };
    /* v83 (38.13): the Owner's are in the project's own Private/ */
    if (dvRole(p) === 'Owner' && d.root) { var pv = d.prv ? { ok: true, data: { id: d.prv } } : await drvSub(d.root, 'Private', 'priv-' + d.pid); if (pv.ok) d.prv = d.fpid = pv.data.id; return pv; }
    var root = await drvRoot(); if (root.err) return root;
    var q = await drvSub(root.data.id, (d.name || p.n) + ' · private', 'priv-' + d.pid); if (q.ok) d.fpid = q.data.id; return q;
  }
  function x6FilesHTML(p) {
    var fs = p.files || [], q = x6Q(p), g = pd.x6fgp === p.id ? pd.x6fg : null, dst = pd.x6dst === p.id && !g;
    var vis = fs.filter(dvShOpen);
    var h = '<div class="x6-tabs x6-fh" data-x6drop="' + esc(p.id) + '"><span class="pd-tile-i">' + IC('folder') + '</span><div class="grow">' + (vis.length ? '<button type="button" class="x6-tt" data-pd="x6:flist" aria-expanded="' + !!pd.x6fl + '" aria-controls="x6-fl" title="' + (pd.x6fl ? 'Hide the files' : 'Show the files') + '"><b>' + vis.length + (vis.length === 1 ? ' file' : ' files') + '</b>' + IC('chev') + '</button>' : '<b>Files</b>') + '<small>' +
      (p.dv ? 'In Google Drive · ScopeDue / ' + esc(p.dv.name || p.n) + (p.dv.root ? ' / Team · ' + esc(p.dv.name || p.n) : '') + ' / Files' : 'Pick the files this project uses from your computer. They are kept in the project’s Google Drive folder.') + '</small></div>' +
      '<input type="file" class="x6-fin" multiple hidden tabindex="-1" aria-hidden="true"><button type="button" class="btn-ghost btn-sm" data-pd="x6:fadd" aria-expanded="' + dst + '">' + IC('plus') + 'Add files</button><span class="x6-drop" aria-hidden="true">' + IC('up') + 'Drop to add</span></div>';
    if (g) h += '<div class="x6-fg" role="status"><p>' + esc(g.t) + '</p><div>' + (g.keep ? '<button type="button" class="btn-primary btn-sm" data-pd="x6:fkeep">' + IC('folder') + 'Keep in Google Drive</button>' : '') + '<button type="button" class="btn-ghost btn-sm" data-pd="x6:fgx">' + (g.keep ? 'Not now' : 'OK') + '</button></div></div>';
    if (dst) h += x6DestHTML(p);
    if (q.length) h += x6QueueHTML(p, q);
    if (!vis.length) pd.x6fl = false;
    /* like the saved tabs: the list opens on a click (and once files have gone up, so they show) */
    if (!(vis.length && pd.x6fl)) return h;
    var rows = fs.map(function (x, i) { return { x: x, i: i }; }).filter(function (r) { return dvShOpen(r.x); });
    rows = rows.filter(function (r) { return dvShMine(r.x); }).concat(rows.filter(function (r) { return !dvShMine(r.x); }));
    h += '<div class="x6-tl x6-fl" id="x6-fl"><ul>' + rows.map(function (r) {
      var x = r.x, i = r.i, k = 'f' + i, on = pd.x6nt === k && x6NtItem(p, k), au = x6AuOpen(p, k), ask = pd.x6fx === x.id, busy = pd.x6fb === x.id, own = dvShMine(x), rm = own || x6FileRmAny(p);
      return '<li' + (on || au ? ' class="on"' : '') + '><div class="x6-tr"><a href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer" title="Open in Google Drive"><span class="pd-tile-i">' + IC(/^image\//.test(x.mt || '') ? 'image' : 'doc') + '</span><span class="pd-tile-t"><b>' + esc(x.t) + '</b><small>' + esc(x6Size(x.sz)) + ' · ' + esc(x6Rel(x6Iso(x.ts))) + '</small>' + x6NtLast(x) + '</span></a>' +
        x6AuChip(p, k, x) + x6NtBtn(p, k, x) + (rm ? '<button type="button" class="icon-sm" data-pd="x6:frm" data-id="' + esc(x.id) + '" aria-label="' + (own ? 'Delete ' : 'Remove ') + esc(x.t) + '" title="' + (own ? 'Delete from Google Drive' : 'Remove from the project') + '"' + (busy ? ' disabled' : '') + '>' + IC('x') + '</button>' : '') + '</div>' +
        (au ? x6AuPanel(p, k, x) : '') +
        (ask && own ? '<div class="x6-fx" role="alert"><p><b>Delete “' + esc(x6Cut(x.t, 60)) + '” from Google Drive?</b> It cannot be brought back from Drive. The copy on your computer stays as it is.</p><div><button type="button" class="btn-ghost btn-sm" data-pd="x6:fno">Cancel</button><button type="button" class="btn-sm x6-fdel" data-pd="x6:fdel" data-id="' + esc(x.id) + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Deleting…' : 'Delete from Drive') + '</button></div></div>' : '') +
        (ask && !own ? '<div class="x6-fx" role="alert"><p><b>Remove “' + esc(x6Cut(x.t, 60)) + '” from the project?</b> ' + esc(x8NameOf(p, x.by)) + ' added it, so it is in their Google Drive: their ScopeDue deletes it there at its next sync. Until then it stays in Drive.</p><div><button type="button" class="btn-ghost btn-sm" data-pd="x6:fno">Cancel</button><button type="button" class="btn-sm x6-fdel" data-pd="x6:fdel" data-id="' + esc(x.id) + '"' + (busy ? ' disabled' : '') + '>Remove</button></div></div>' : '') +
        (on ? x6NtPanel(p, k, x) : '') + '</li>';
    }).join('') + '</ul></div>';
    return h;
  }

  /* ================================================================== v85 (37.3): adding files. Where they go is asked first (Team for
     everyone, Private for the person adding them), then each file goes up with its own progress, two at a time, and can be stopped.
     The queue lives in pd.x6q: { j, pid, f, n, sz, mt, to: all|me, own, st: wait|up|ok|err, done, x (its request), o, e } */
  var X6_PAR = 2, X6_SEQ = 0, X6_TICK = 0;
  function x6Q(p) { return (pd.x6q || []).filter(function (j) { return j.pid === p.id; }); }
  function x6QBy(id) { return (pd.x6q || []).filter(function (j) { return j.j === id; })[0] || null; }
  function x6DestHTML(p) {
    var own = dvRole(p) === 'Owner', n = p.dv ? p.dv.name || p.n : p.n, pend = pd.x6pendp === p.id ? (pd.x6pend || []).length : 0, last = pd.x6to === 'me' ? 'me' : 'all';
    var opt = function (to, ic, t, d) { return '<button type="button" class="x6-fdo' + (to === last ? ' last' : '') + '" data-pd="x6:fto" data-to="' + to + '"><span class="x6-fdi">' + IC(ic) + '</span><span class="x6-fdt"><b>' + t + '</b><small>' + d + '</small></span></button>'; };
    return '<div class="x6-fd" role="group" aria-labelledby="x6-fdh"><p class="x6-fdh" id="x6-fdh">' + (pend === 1 ? 'Where does this file go?' : pend ? 'Where do these ' + pend + ' files go?' : 'Where do the files go?') + '</p><div class="x6-fdg">' +
      opt('all', 'users', '<span translate="no">Team · ' + esc(n) + '</span>', 'Everyone on the team sees them.') +
      opt('me', 'lock', own ? '<span translate="no">Private</span>' : 'Only me', own ? 'Only you see them. They stay in the project’s Private folder.' : 'Only you see them. They stay in your own Google Drive.') +
      '</div><button type="button" class="link x6-fdx" data-pd="x6:fdx">Cancel</button></div>';
  }
  function x6QSum(q) {
    var t = { n: q.length, sz: 0, done: 0, up: 0, wait: 0, ok: 0, err: 0 };
    q.forEach(function (j) { t.sz += j.sz; t.done += j.st === 'ok' ? j.sz : j.done; t[j.st] = (t[j.st] || 0) + 1; });
    t.pc = t.sz ? Math.min(100, Math.floor(t.done / t.sz * 100)) : (t.ok ? 100 : 0); t.busy = t.up + t.wait > 0;
    return t;
  }
  /* about how long is left: the speed is smoothed, and said only once it means something (after a few seconds, more than 4 left) */
  function x6QEta(p, t) {
    var v = (pd.x6qv || {})[p.id]; if (!v || !v.s || Date.now() - v.t0 < 2500) return '';
    var s = (t.sz - t.done) / v.s, m = Math.ceil(s / 60); if (!isFinite(s) || s < 4) return '';
    return s < 60 ? ' · about ' + Math.max(5, Math.ceil(s / 5) * 5) + ' seconds left' : m === 1 ? ' · about 1 minute left' : ' · about ' + m + ' minutes left';
  }
  function x6QSpeed(p, t) {
    var now = Date.now(), all = pd.x6qv = pd.x6qv || {}, v = all[p.id];
    if (!v || !t.busy) { all[p.id] = { t: now, b: t.done, s: 0, t0: now }; return; }
    var dt = (now - v.t) / 1000; if (dt < 0.4) return;
    var inst = Math.max(0, (t.done - v.b) / dt); v.s = v.s ? v.s * 0.7 + inst * 0.3 : inst; v.t = now; v.b = t.done;
  }
  function x6QHead(p, t) {
    if (t.busy) return [t.n === 1 ? 'Uploading 1 file' : 'Uploading ' + t.n + ' files', x6Size(t.done) + ' of ' + x6Size(t.sz) + ' · ' + t.pc + '%' + x6QEta(p, t)];
    if (t.err) return [t.ok ? t.ok + ' of ' + t.n + ' files added' : t.err === 1 ? 'The file could not be uploaded' : 'The files could not be uploaded', 'Try again, or dismiss what did not go up.'];
    return [t.ok === 1 ? '1 file added' : t.ok + ' files added', 'In Google Drive · ' + x6Size(t.sz)];
  }
  function x6QLine(j) {
    return j.st === 'wait' ? 'Waiting · ' + x6Size(j.sz) : j.st === 'up' ? (j.done ? x6Size(j.done) + ' of ' + x6Size(j.sz) : 'Starting · ' + x6Size(j.sz)) : j.st === 'ok' ? 'Added · ' + x6Size(j.sz) : j.e || 'Could not be uploaded';
  }
  function x6QPc(j) { return j.st === 'ok' ? 100 : j.sz ? Math.min(100, Math.floor(j.done / j.sz * 100)) : 0; }
  function x6QRow(j) {
    var pc = x6QPc(j), ic = j.st === 'ok' ? 'tick' : j.st === 'err' ? 'x' : /^image\//.test(j.mt || '') ? 'image' : 'doc';
    return '<li class="x6-uqr is-' + j.st + '" data-j="' + j.j + '"><span class="x6-uqi">' + IC(ic) + '</span><span class="x6-uqn"><b translate="no">' + esc(j.n) + '</b><small class="x6-uqm">' + esc(x6QLine(j)) + '</small></span>' +
      '<span class="x6-uqto" title="' + (j.to === 'me' ? 'Only you see it' : 'Everyone on the team sees it') + '">' + IC(j.to === 'me' ? 'lock' : 'users') + (j.to === 'me' ? (j.own ? '<span translate="no">Private</span>' : '<span>Only me</span>') : '<span translate="no">Team</span>') + '</span>' +
      (j.st === 'err' ? '<button type="button" class="btn-ghost btn-sm" data-pd="x6:fre" data-j="' + j.j + '">Try again</button>' : '') +
      (j.st === 'ok' ? '' : '<button type="button" class="icon-sm" data-pd="' + (j.st === 'err' ? 'x6:fdis' : 'x6:fcan') + '" data-j="' + j.j + '" aria-label="' + (j.st === 'err' ? 'Dismiss ' : 'Stop uploading ') + esc(j.n) + '" title="' + (j.st === 'err' ? 'Dismiss' : 'Stop') + '">' + IC('x') + '</button>') +
      '<span class="x6-uqb" role="progressbar" aria-label="' + esc(j.n) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pc + '"><i style="width:' + pc + '%"></i></span></li>';
  }
  function x6QueueHTML(p, q) {
    var t = x6QSum(q), hd = x6QHead(p, t), say = (pd.x6qsay || {})[p.id] || '';
    return '<div class="x6-uq ' + (t.busy ? 'busy' : t.err ? 'bad' : 'done') + '" data-uq="' + esc(p.id) + '"><div class="x6-uqh"><span class="x6-uqhi">' + (t.busy ? '<span class="x6-ring" style="--p:' + t.pc + '"></span>' : IC(t.err ? 'x' : 'tick')) + '</span>' +
      '<span class="x6-uqht"><b class="x6-uqtt">' + esc(hd[0]) + '</b><small class="x6-uqst">' + esc(hd[1]) + '</small></span>' +
      (t.busy ? '<button type="button" class="link x6-uqall" data-pd="x6:fcall">Stop all</button>' : '') + '</div>' +
      '<div class="x6-uqbar" role="progressbar" aria-label="All files" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + t.pc + '"><i style="width:' + t.pc + '%"></i></div>' +
      '<ul>' + q.map(x6QRow).join('') + '</ul><span class="sr-only" role="status">' + esc(say) + '</span></div>';
  }
  function x6QPaint(p) { dvPaint(p); }
  /* bytes going up move the bars and the numbers in place, once a frame: the card is not drawn again for that */
  function x6QTick(p) {
    if (X6_TICK) return;
    X6_TICK = requestAnimationFrame(function () {
      X6_TICK = 0;
      var q = x6Q(p), t = x6QSum(q); x6QSpeed(p, t);
      var box = [].filter.call(document.querySelectorAll('.x6-uq[data-uq]'), function (b) { return b.getAttribute('data-uq') === p.id; })[0]; if (!box) return;
      var hd = x6QHead(p, t), st = box.querySelector('.x6-uqst'), bar = box.querySelector('.x6-uqbar'), ring = box.querySelector('.x6-ring');
      if (st) st.textContent = sdT(hd[1]);
      if (bar) { bar.setAttribute('aria-valuenow', t.pc); bar.firstChild.style.width = t.pc + '%'; }
      if (ring) ring.style.setProperty('--p', t.pc);
      q.forEach(function (j) {
        if (j.st !== 'up') return;
        var li = box.querySelector('[data-j="' + j.j + '"]'); if (!li) return;
        var pc = x6QPc(j), m = li.querySelector('.x6-uqm'), b = li.querySelector('.x6-uqb');
        if (m) m.textContent = sdT(x6QLine(j));
        if (b) { b.setAttribute('aria-valuenow', pc); b.firstChild.style.width = pc + '%'; }
      });
    });
  }
  function x6FilesUp(p, list, to) {
    var why = x6FilesWhy(p); if (why) { showToast(why.t); return; }
    var fs = [].slice.call(list || []), big = fs.filter(function (f) { return f.size > X6_FMAX; });
    fs = fs.filter(function (f) { return f.size <= X6_FMAX; }).slice(0, 50);
    if (big.length) showToast(big.length === 1 ? '“' + x6Cut(big[0].name, 40) + '” is larger than 100 MB. Put it in the Drive folder yourself.' : big.length + ' files are larger than 100 MB. Put them in the Drive folder yourself.');
    if (!fs.length) return;
    var own = dvRole(p) === 'Owner'; to = own && to === 'me' ? 'me' : 'all';   /* v86: Private is the Owner's alone */
    /* a new batch: what the last one added already said so; the card counts only these */
    pd.x6q = (pd.x6q || []).filter(function (j) { return j.pid !== p.id || j.st !== 'ok' || !j.noted; });
    if (!x6Q(p).some(function (j) { return j.st === 'up' || j.st === 'wait'; })) (pd.x6qv = pd.x6qv || {})[p.id] = null;
    pd.x6q = (pd.x6q || []).concat(fs.map(function (f) { return { j: 'u' + (++X6_SEQ), pid: p.id, f: f, n: f.name, sz: f.size, mt: f.type || '', to: to, own: own, st: 'wait', done: 0 }; }));
    x6QPaint(p); x6QRun(p);
  }
  function x6QRun(p) {
    var q = x6Q(p), act = q.filter(function (j) { return j.st === 'up'; }).length;
    q.filter(function (j) { return j.st === 'wait'; }).slice(0, Math.max(0, X6_PAR - act)).forEach(function (j) { x6QOne(p, j); });
  }
  async function x6QOne(p, j) {
    j.st = 'up'; j.done = 0; j.e = ''; x6QPaint(p);
    var dir = await x6FilesDir(p, j.to === 'all');
    if (j.st !== 'up') return;   /* stopped while the folder was being found */
    if (dir.err) return x6QFail(p, j, dir.err);
    var o = j.o = { progress: function (b) { j.done = Math.min(b, j.sz); x6QTick(p); }, on: function (x) { j.x = x; } };
    var r = await drvUpload(j.f, dir.data.id, { sd: 'file', pid: p.dv.pid }, o);
    if (r.err && r.status === 404 && !j.re && j.st === 'up') {   /* the folder was deleted in Drive: found or made again, once */
      j.re = 1; if (j.to === 'all') p.dv.ffid = ''; else { p.dv.fpid = ''; p.dv.prv = ''; }
      var d2 = await x6FilesDir(p, j.to === 'all'); if (d2.ok && j.st === 'up') r = await drvUpload(j.f, d2.data.id, { sd: 'file', pid: p.dv.pid }, o);
    }
    j.x = null;
    if (r.cancelled || j.st !== 'up') { x6QDrop(p, j); return; }
    if (r.err) return x6QFail(p, j, r.err);
    j.st = 'ok'; j.done = j.sz;
    (p.files = p.files || []).push({ id: r.data.id, t: String(r.data.name || j.n).slice(0, 200), u: r.data.webViewLink || 'https://drive.google.com/file/d/' + encodeURIComponent(r.data.id) + '/view', sz: +r.data.size || j.sz, mt: r.data.mimeType || j.mt || '', ts: Date.now(), by: dvShMe(), aud: j.to === 'me' ? 'me' : 'all' });
    j.f = null; pd.x6fl = true;
    x6QPaint(p); x6QRun(p); x6QEnd(p);
  }
  function x6QFail(p, j, e) {
    j.st = 'err'; j.x = null; j.done = 0;
    j.e = e === 'net' ? 'The connection dropped.' : e === 'auth' ? 'Sign in to Google again, then try again.' : 'Google Drive said: ' + String(e).slice(0, 120);
    x6QPaint(p); x6QRun(p); x6QEnd(p);
  }
  function x6QDrop(p, j) { pd.x6q = (pd.x6q || []).filter(function (y) { return y !== j; }); x6QPaint(p); x6QRun(p); x6QEnd(p); }
  function x6QStop(p, j) {
    if (!j) return;
    if (j.st === 'up') { j.st = 'x'; if (j.o) j.o.stop = 1; if (j.x) j.x.abort(); }
    if (j.st === 'wait' || j.st === 'x') x6QDrop(p, j);
  }
  /* the queue is still: what went up is noted once and saved; the card says so for a moment, then leaves (what failed stays) */
  async function x6QEnd(p) {
    var q = x6Q(p), t = x6QSum(q); if (t.busy) return;
    var fresh = q.filter(function (j) { return j.st === 'ok' && !j.noted; }); if (!fresh.length && !t.err) return;
    fresh.forEach(function (j) { j.noted = 1; });
    (pd.x6qsay = pd.x6qsay || {})[p.id] = x6QHead(p, t)[0];
    if (fresh.length) {
      pdNote(p, fresh.length === 1 ? 'You added the file “' + prvT(fresh[0].n, 40) + '”' : 'You added ' + fresh.length + ' files'); pdTouch(p); await SDB.save();
      if (!document.querySelector('.x6-uq[data-uq]')) showToast(fresh.length === 1 ? 'Added to Google Drive' : fresh.length + ' files added to Google Drive');
      x6QPaint(p);
    }
    if (t.err) return;
    setTimeout(function () {
      if (x6Q(p).some(function (j) { return j.st !== 'ok'; })) return;
      var box = [].filter.call(document.querySelectorAll('.x6-uq[data-uq]'), function (b) { return b.getAttribute('data-uq') === p.id; })[0];
      var gone = function () { pd.x6q = (pd.x6q || []).filter(function (j) { return j.pid !== p.id || j.st !== 'ok'; }); x6QPaint(p); };
      if (box && !matchMedia('(prefers-reduced-motion: reduce)').matches) { box.classList.add('out'); setTimeout(gone, 260); } else gone();
    }, 2400);
  }
  /* files dropped on the Files line: asked where they go, as for picked ones */
  function x6DropZone(e) { var z = e.target && e.target.closest ? e.target.closest('[data-x6drop]') : null; return z && pd.p && z.getAttribute('data-x6drop') === pd.p.id && e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') > -1 ? z : null; }
  document.addEventListener('dragover', function (e) { var z = x6DropZone(e); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; z.classList.add('drop'); });
  document.addEventListener('dragleave', function (e) { var z = x6DropZone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('drop'); });
  document.addEventListener('drop', function (e) {
    var z = x6DropZone(e); if (!z) return; e.preventDefault(); z.classList.remove('drop');
    var p = pd.p, why = x6FilesWhy(p), fs = [].slice.call(e.dataTransfer.files || []); if (!fs.length) return;
    if (why) { pd.x6fg = why; pd.x6fgp = p.id; pdRerender(why.keep ? '[data-pd="x6:fkeep"]' : '[data-pd="x6:fgx"]'); return; }
    if (dvRole(p) !== 'Owner') { x6FilesUp(p, fs, 'all'); return; }   /* v86: an Editor's files go to Team */
    pd.x6pend = fs; pd.x6pendp = p.id; pd.x6dst = p.id; pdRerender('.x6-fdo.last');
  });
  /* closing the page stops what is going up: the browser asks first */
  window.addEventListener('beforeunload', function (e) { if ((pd.x6q || []).some(function (j) { return j.st === 'up' || j.st === 'wait'; })) { e.preventDefault(); e.returnValue = ''; } });
  /* v87 (37.3): an Editor deletes only what they added; the Owner removes any file. Someone else's file is theirs in Drive (and
     out of reach of the Owner's app under drive.file), so it leaves the project here and now, and p.fdel asks the device of the
     person who added it to delete it in Drive at its next sync (dvFdel) */
  function x6FileRmAny(p) { return !!p.dv && dvRole(p) === 'Owner'; }
  async function x6FileDel(p, id) {
    var x = (p.files || []).filter(function (y) { return y.id === id; })[0]; if (!x) return;
    if (!dvShMine(x)) {
      if (!x6FileRmAny(p)) return;
      p.files = p.files.filter(function (y) { return y !== x; }); if (!p.files.length) delete p.files;
      var keep = Date.now() - 180 * 864e5;
      p.fdel = (p.fdel || []).filter(function (f) { return f && f.id !== x.id && (f.at || 0) > keep; }).concat([{ id: x.id, by: String(x.by || '').toLowerCase(), t: String(x.t || '').slice(0, 200), at: Date.now() }]).slice(-200);
      pd.x6fx = null; pd.x6nt = null;
      pdNote(p, 'You removed the file “' + prvT(x.t, 40) + '” added by ' + x8NameOf(p, x.by)); pdTouch(p); await SDB.save(); dvPaint(p);
      showToast('Removed from the project. ' + x8NameOf(p, x.by) + '’s ScopeDue deletes it from their Google Drive at its next sync.');
      return;
    }
    pd.x6fb = id; dvPaint(p);
    var r = await drvDelete(id);
    pd.x6fb = null;
    if (r.err && r.status !== 404) { dvPaint(p); showToast('Could not delete it from Google Drive. ' + (r.err === 'net' ? 'Check the connection.' : r.err)); return; }
    p.files = p.files.filter(function (y) { return y !== x; }); if (!p.files.length) delete p.files;
    pd.x6fx = null; pd.x6nt = null;
    pdNote(p, 'You deleted the file “' + prvT(x.t, 40) + '” from Google Drive'); pdTouch(p); await SDB.save(); dvPaint(p);
    showToast('Deleted from Google Drive. The copy on your computer is untouched.');
  }
  /* ================================================================== who sees a saved tab or a file (37.1) */
  function x6AuOf(x, k) { return x.aud || (k.charAt(0) === 'f' ? 'all' : 'me'); }
  function x6AuOpen(p, k) { return pd.x6au === k && pd.x6aup === p.id && dvShOn(p); }
  function x6AuLabel(p, a) { return a === 'all' ? 'Everyone' : a === 'me' ? 'Only me' : (function (n) { return n === 1 ? '1 person' : n + ' people'; })(a.filter(function (e) { return dvShTeam(p).some(function (m) { return m.e === String(e).toLowerCase(); }); }).length); }
  function x6AuChip(p, k, x) {
    if (!dvShOn(p) || dvRole(p) === 'Viewer') return '';
    if (!dvShMine(x)) return '<span class="x6-from" title="Shared with you">From ' + esc(x8NameOf(p, x.by)) + '</span>';
    var a = x6AuOf(x, k), on = x6AuOpen(p, k);
    /* v86: an Editor's file stays with the team: a chip that says so, nothing to choose */
    if (k.charAt(0) === 'f' && dvRole(p) !== 'Owner' && a === 'all') return '<span class="x6-au sh fixed" title="Files you add go to the team">' + IC('users') + '<span>Everyone</span></span>';
    return '<button type="button" class="x6-au' + (a === 'me' ? '' : ' sh') + '" data-pd="x6:aud" data-k="' + k + '" aria-expanded="' + on + '" aria-label="Who sees ' + esc(x.t || pdHost(x.u)) + ': ' + esc(x6AuLabel(p, a)) + '" title="Who sees it">' + IC(a === 'me' ? 'lock' : 'users') + '<span>' + esc(x6AuLabel(p, a)) + '</span></button>';
  }
  function x6AuPanel(p, k, x) {
    var a = x6AuOf(x, k), tm = dvShTeam(p), pick = Array.isArray(a) ? a.map(function (e) { return String(e).toLowerCase(); }) : [], busy = pd.x6fb === x.id;
    var opt = function (v, t, d) { return '<label class="x6-auo"><input type="radio" name="a" value="' + v + '"' + ((v === 'some' ? Array.isArray(a) : a === v) ? ' checked' : '') + '><span><b>' + t + '</b><small>' + d + '</small></span></label>'; };
    var teamOnly = k.charAt(0) === 'f' && dvRole(p) !== 'Owner';   /* v86: an Editor's files are the team's; one kept apart before can come back */
    return '<form class="x6-aup" data-pd-form="x6:aud" data-k="' + k + '" novalidate><fieldset><legend>Who sees it</legend>' +
      (teamOnly ? '' : opt('me', 'Only me', 'You, on each of your devices.')) +
      opt('all', 'Everyone on the team', 'The owner and every Editor, now and later.') +
      (teamOnly ? '' : opt('some', 'Chosen people', 'You and the people you tick.')) +
      '<div class="x6-aus">' + tm.map(function (m) { return '<label><input type="checkbox" name="e" value="' + esc(m.e) + '"' + (pick.indexOf(m.e) > -1 ? ' checked' : '') + '><span>' + esc(m.n) + '</span><small>' + esc(pdRoleName(m.role)) + '</small></label>'; }).join('') + '</div></fieldset>' +
      (k.charAt(0) === 't' ? '<p class="x6-auh">A shared tab is a link: each person opens it with their own sign-in to the site.</p>' : '<p class="x6-auh">Google Drive shares the file itself with the same people.</p>') +
      '<div class="x6-ntb"><span class="err" role="alert"></span><button type="button" class="btn-ghost btn-sm" data-pd="x6:audx" data-k="' + k + '">Cancel</button><button type="submit" class="btn-primary btn-sm"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Saving…' : 'Save') + '</button></div></form>';
  }
  function x6AuSay(p, a) { return a === 'all' ? 'Now everyone on the team sees it' : a === 'me' ? 'Now only you see it' : 'Now ' + (a.length === 1 ? x8NameOf(p, a[0]) : a.length + ' people') + ' and you see it'; }
  /* a file's place and its Drive permissions follow who sees it; nothing changes here until Drive has done it */
  async function x6FileAud(p, x, aud) {
    var was = x6AuOf(x, 'f'), toAll = aud === 'all', fromAll = was === 'all', before = Array.isArray(was) ? was : [], after = Array.isArray(aud) ? aud : [], er = '';
    pd.x6fb = x.id; dvPaint(p);
    if (toAll !== fromAll) {
      var dt = await x6FilesDir(p, toAll), df = await x6FilesDir(p, fromAll);
      if (dt.err || df.err) er = (dt.err || df.err);
      else { var mv = await drvMove(x.id, dt.data.id, df.data.id); if (mv.err) er = mv.err; }
    }
    for (var i = 0; !er && i < after.length; i++) if (before.indexOf(after[i]) < 0) { var sh = await drvShareQuiet(x.id, after[i]); if (sh.err) er = sh.err; }
    for (var j = 0; !er && j < before.length; j++) if (after.indexOf(before[j]) < 0) { var un = await drvUnshare(x.id, before[j]); if (un.err) er = un.err; }
    pd.x6fb = null;
    if (er) { dvPaint(p); showToast('Could not change who sees it in Google Drive. ' + (er === 'net' ? 'Check the connection.' : er)); return; }
    x.aud = aud; pd.x6au = null;
    pdNote(p, 'You changed who sees the file “' + prvT(x.t, 40) + '”'); pdTouch(p); await SDB.save(); dvPaint(p);
    showToast(x6AuSay(p, aud));
  }
  function x6LinksSave(f) {
    var p = pd.p, old = JSON.stringify(p.ctx), bad = -1;
    var next = p.ctx.map(function (x, i) {
      var u = x6Url(f.elements['u' + i].value), t = f.elements['t' + i].value.replace(/\s+/g, ' ').trim();
      if (!u && bad < 0) bad = i;
      var o = { k: x.k, t: t || (u ? pdHost(u) : x.t), u: u || x.u }; if (x.n) o.n = x.n; return o;
    });
    if (bad > -1) { var e = f.querySelector('.err'); e.textContent = 'Enter a full link, like https://drive.google.com/…'; f.setAttribute('data-err', ''); f.elements['u' + bad].focus(); return; }
    var changed = JSON.stringify(next) !== old;
    p.ctx = next; pd.x6le = false; if (changed) { pdNote(p, 'You edited the links'); pdTouch(p); }
    pdRerender('[data-pd="x6:led"]');
    if (changed) showToast('Links saved', function () { p.ctx = JSON.parse(old); undone(p, 'workspace'); });
  }
  /* saved tabs live in the project (p.stabs); the tabs saved on this device before v73 come in once, as Only me */
  function x6Stabs(p) {
    if (p.tabs && Array.isArray(p.tabs.l)) {
      var me = dvShMe(), ts = p.tabs.ts || Date.now();
      p.stabs = (p.stabs || []).concat(p.tabs.l.map(function (x) { var o = { id: x6Id('s'), t: x.t, u: x.u, ts: ts, by: me, aud: 'me' }; if (x.n) o.n = x.n; return o; }));
      delete p.tabs;
    }
    return p.stabs || [];
  }
  function x6TabsSave(p) {
    var go = function () {
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        var me = location.href.split('#')[0], l = (tabs || []).filter(function (t) { return t.url && /^https?:/.test(t.url) && t.url.split('#')[0] !== me; }).slice(0, 40).map(function (t) { return { t: String(t.title || pdHost(t.url)).slice(0, 120), u: t.url }; });
        if (!l.length) { showToast('No web pages are open in this window'); return; }
        /* your Only me tabs are replaced by what is open (a tab still open keeps its notes); what you shared, and what others
           shared with you, stays until it is removed */
        var cur = x6Stabs(p), old = x8Clone(cur), now = Date.now(), who = dvShMe();
        var solo = function (x) { return dvShOpen(x) && dvShMine(x) && x6AuOf(x, 't') === 'me'; };
        var keep = cur.filter(function (x) { return !solo(x); }), mineSolo = cur.filter(solo);
        var next = l.filter(function (t) { return !keep.some(function (y) { return dvShOpen(y) && dvShMine(y) && y.u === t.u; }); }).map(function (t) {
          var was = mineSolo.filter(function (y) { return y.u === t.u; })[0];
          return was ? Object.assign(x8Clone(was), { t: t.t, ts: now }) : { id: x6Id('s'), t: t.t, u: t.u, ts: now, by: who, aud: 'me' };
        });
        p.stabs = keep.concat(next); pd.x6nt = null; pd.x6au = null;
        var note = pdNote(p, 'You saved ' + l.length + (l.length === 1 ? ' tab' : ' tabs')); pdTouch(p);
        pdRerender('[data-pd="x6:topen"]');
        showToast(l.length + (l.length === 1 ? ' tab saved' : ' tabs saved') + ' to ' + p.n, function () { p.stabs = old; pdUnnote(p, note); undone(p, 'workspace'); });
      });
    };
    try {
      if (chrome.permissions && chrome.permissions.request) chrome.permissions.request({ permissions: ['tabs'] }, function (ok) { if (ok) go(); else showToast('Saving tabs needs permission to read the open tabs. Nothing was saved.'); });
      else go();
    } catch (e) { showToast('Tabs can be saved in the ScopeDue extension.'); }
  }
  /* v100 (53, spec PP-02): Continue work, one button for what the project keeps to work in: its saved tabs (yours, and those shared
     with you), then its links, in the order they were saved, each address once. The extension opens them in a new window; a web
     page may open one tab per click, so there it lists them to open */
  function x6CwList(p) {
    var seen = {}, out = [];
    x6Stabs(p).filter(dvShOpen).concat(p.ctx || []).forEach(function (x) { if (!x || !/^https?:\/\//i.test(x.u || '') || seen[x.u]) return; seen[x.u] = 1; out.push({ t: x.t || pdHost(x.u), u: x.u }); });
    return out;
  }
  function x6CwHTML(p) {
    var l = x6CwList(p); if (!l.length) return '';
    var open = pd.x6cw === p.id && !x6Ext();
    return '<div class="pd-now-s x6-cw"><button type="button" class="btn-primary btn-sm" data-pd="x6:cw" aria-expanded="' + open + '">' + IC('ext') + '<span>Continue work</span></button><span class="pd-sub">' + (l.length === 1 ? '1 saved tab or link' : l.length + ' saved tabs and links') + '</span>' +
      (open ? '<ol class="x6-cwl">' + l.map(function (x) { return '<li><a href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer">' + esc(x.t) + '</a><small>' + esc(pdHost(x.u)) + '</small></li>'; }).join('') + '</ol><p class="pd-sub">Your browser opens one tab per click here; the extension opens them all at once.</p>' : '') + '</div>';
  }
  function x6CwOpen(p) {
    var l = x6CwList(p); if (!l.length) return;
    if (!x6Ext()) { pd.x6cw = pd.x6cw === p.id ? null : p.id; pdRerender('[data-pd="x6:cw"]'); return; }
    try { chrome.windows.create({ url: l.map(function (x) { return x.u; }), focused: true }); pdNote(p, 'You continued work: ' + (l.length === 1 ? '1 tab opened' : l.length + ' tabs opened')); pdTouch(p); showToast('Opened ' + l.length + (l.length === 1 ? ' tab' : ' tabs') + ' in a new window'); }
    catch (e) { pd.x6cw = p.id; pdRerender('[data-pd="x6:cw"]'); }
  }
  function x6TabsOpen(p) {
    var l = x6Stabs(p).filter(dvShOpen); if (!l.length) return;
    try { chrome.windows.create({ url: l.map(function (x) { return x.u; }), focused: true }); pdNote(p, 'You opened the saved tabs'); pdTouch(p); showToast('Opened ' + l.length + (l.length === 1 ? ' tab' : ' tabs') + ' in a new window'); } catch (e) { showToast('The tabs could not be opened here.'); }
  }

  /* ================================================================== clicks and forms on the project page */
  function x6Act(act, a) {
    var p = pd.p, id = a.getAttribute('data-id'), i = +a.getAttribute('data-i');
    if (act === 'ai') { var md = x6Handoff(p), hn = x6Hid; copyText(md, function () { showToast(!hn ? 'Copied as Markdown. Paste it into your AI assistant.' : hn === 1 ? 'Copied as Markdown, with 1 secret hidden. Paste it into your AI assistant.' : 'Copied as Markdown, with ' + hn + ' secrets hidden. Paste it into your AI assistant.'); }); return; }
    /* v69: the suggestion on an empty next step, taken in one click (saved like a typed one, with Undo) */
    if (act === 'nuse') { var nu = wkUnit(p, id); if (nu) { pd.x6nu = nu.id; pdSave('next', nu.t); } return; }
    if (act === 'nsug') { var u = wkUnit(p, id), t = pdPanel.querySelector('.pd-edit textarea'); if (u && t) { t.value = u.t; pd.x6nu = u.id; t.focus(); } }
    else if (act === 'fsug') { var fu = wkUnit(p, id), ft = pdPanel.querySelector('.pd-edit textarea'); if (fu && ft) { ft.value = fu.t; pd.x6fu = fu.id; ft.focus(); } }
    else if (act === 'today') x6ToToday(p, a);
    else if (act === 'ladd') { pd.x6la = !pd.x6la; pdRerender(pd.x6la ? '.x6-laf input' : '[data-pd="x6:ladd"]'); }
    else if (act === 'lcancel') { pd.x6la = false; pdRerender('[data-pd="x6:ladd"]'); }
    else if (act === 'lshow') { pd.x6ls = !pd.x6ls; pdRerender('[data-pd="x6:lshow"]'); }
    else if (act === 'ldrop' || act === 'lcr') {
      var x = (p.later || []).filter(function (y) { return y.id === id; })[0]; if (!x) return;
      if (act === 'lcr') { crPrefill = { t: x6Cut(x.t, 90), d: x.t + (x.u ? '\n' + x.u : ''), later: x.id }; openDrawer('cr', a); return; }
      var note = pdNote(p, 'You dropped “' + prvT(x.t, 40) + '” from Later'); x.st = 'drop'; x.dts = Date.now(); pdTouch(p); pdRefreshBadges(p);
      pdRerender('[data-pd="x6:ladd"]');
      showToast('Dropped from Later. It is kept under Decided.', function () { x.st = 'open'; x.dts = 0; pdUnnote(p, note); pdRefreshBadges(p); undone(p, 'workspace'); });
    }
    else if (act === 'dadd') { pd.x6df = !pd.x6df; pd.x6dec = null; pdRerender(pd.x6df ? '.x6-decf input' : '[data-pd="x6:dadd"]'); }
    else if (act === 'dcancel') { pd.x6df = false; pd.x6dec = null; pdRerender('[data-pd="x6:dadd"]'); }
    else if (act === 'dall') { pd.x6da = !pd.x6da; pdRerender('[data-pd="x6:dall"]'); }
    else if (act === 'led') { if (pd.x6le) { var lf = pdPanel.querySelector('.x6-led'); if (lf) return x6LinksSave(lf); } pd.x6le = !pd.x6le; pd.adding = false; pdRerender('[data-pd="x6:led"]'); }
    else if (act === 'lup' || act === 'lrm') {
      var old = JSON.stringify(p.ctx);
      if (act === 'lup' && i > 0) { var m = p.ctx.splice(i, 1)[0]; p.ctx.splice(i - 1, 0, m); pdRerender('[data-pd="x6:lup"][data-i="' + (i - 1) + '"]'); }
      if (act === 'lrm') { pd.x6nt = null; var gone = p.ctx.splice(i, 1)[0]; var nt = pdNote(p, 'You removed the link “' + prvT(gone.t, 40) + '”'); pdTouch(p); if (!p.ctx.length) pd.x6le = false; pdRerender('[data-pd="x6:led"]'); showToast('Link removed', function () { p.ctx = JSON.parse(old); pdUnnote(p, nt); undone(p, 'workspace'); }); }
    }
    else if (act === 'tsave') x6TabsSave(p);
    else if (act === 'topen') x6TabsOpen(p);
    else if (act === 'cw') x6CwOpen(p);
    else if (act === 'fadd') {
      var why = x6FilesWhy(p);
      if (why) { pd.x6fg = why; pd.x6fgp = p.id; pdRerender(why.keep ? '[data-pd="x6:fkeep"]' : '[data-pd="x6:fgx"]'); return; }
      /* v85: where the files go is asked first, of the Owner; an Editor's files go to Team (v86) */
      pd.x6fg = null; pd.x6pend = null;
      if (dvRole(p) !== 'Owner') { pd.x6dst = null; pd.x6to = 'all'; var fin0 = pdPanel.querySelector('.x6-fin'); if (fin0) { fin0.value = ''; fin0.click(); } return; }
      pd.x6dst = pd.x6dst === p.id ? null : p.id; pdRerender(pd.x6dst ? '.x6-fdo.last' : '[data-pd="x6:fadd"]');
    }
    else if (act === 'fto') {
      var to = a.getAttribute('data-to') === 'me' ? 'me' : 'all', pend = pd.x6pendp === p.id ? pd.x6pend : null;
      pd.x6to = to; pd.x6dst = null; pd.x6pend = null;
      pdRerender('[data-pd="x6:fadd"]');
      if (pend && pend.length) { x6FilesUp(p, pend, to); return; }
      var fin = pdPanel.querySelector('.x6-fin'); if (fin) { fin.value = ''; fin.click(); }   /* still the person's click: the picker may open */
    }
    else if (act === 'fdx') { pd.x6dst = null; pd.x6pend = null; pdRerender('[data-pd="x6:fadd"]'); }
    else if (act === 'fcan') x6QStop(p, x6QBy(a.getAttribute('data-j')));
    else if (act === 'fcall') x6Q(p).filter(function (j) { return j.st === 'up' || j.st === 'wait'; }).forEach(function (j) { x6QStop(p, j); });
    else if (act === 'fre') { var rj = x6QBy(a.getAttribute('data-j')); if (rj && rj.f) { rj.st = 'wait'; rj.done = 0; rj.e = ''; rj.re = 0; x6QPaint(p); x6QRun(p); } }
    else if (act === 'fdis') { var dj = a.getAttribute('data-j'); pd.x6q = (pd.x6q || []).filter(function (j) { return j.j !== dj; }); x6QPaint(p); }
    else if (act === 'fgx') { pd.x6fg = null; pdRerender('[data-pd="x6:fadd"]'); }
    else if (act === 'fkeep') { pd.x6fg = null; pdRerender(); dvKeep(p); }
    else if (act === 'frm') { var fw = x6FilesWhy(p); if (fw) { showToast(fw.t); return; } pd.x6au = null; pd.x6fx = pd.x6fx === id ? null : id; pdRerender(pd.x6fx ? '[data-pd="x6:fno"]' : '[data-pd="x6:frm"][data-id="' + id + '"]'); }
    else if (act === 'fno') { var fx = pd.x6fx; pd.x6fx = null; pdRerender('[data-pd="x6:frm"][data-id="' + fx + '"]'); }
    else if (act === 'fdel') { if (!pd.x6fb) x6FileDel(p, id); }
    else if (act === 'nt' || act === 'ntx') {
      var nk = a.getAttribute('data-k'), nOpen = act === 'nt' && !(pd.x6nt === nk && x6NtItem(p, nk));
      pd.x6nt = nOpen ? nk : null; pd.x6ntp = p.id; if (nOpen) pd.x6au = null;
      pdRerender(nOpen ? '.x6-ntf textarea' : '[data-pd="x6:nt"][data-k="' + nk + '"]');
    }
    else if (act === 'nrm') {
      var rk = a.getAttribute('data-k'), rx = x6NtItem(p, rk), rn = rx && (rx.n || []).filter(function (y) { return y.id === id; })[0]; if (!rn) return;
      var rold = rx.n.slice(); rx.n = rx.n.filter(function (y) { return y !== rn; }); if (!rx.n.length) delete rx.n;
      pdTouch(p); pdRerender('.x6-ntf textarea');
      showToast('Note removed', function () { rx.n = rold; undone(p, 'workspace'); });
    }
    else if (act === 'flist') { pd.x6fl = !pd.x6fl; pdRerender('[data-pd="x6:flist"]'); }
    else if (act === 'tlist') { pd.x6tl = !pd.x6tl; pdRerender('[data-pd="x6:tlist"]'); }
    else if (act === 'trm' || act === 'tclr') {
      var sl = x6Stabs(p), was = x8Clone(sl), mineOpen = function (y) { return dvShOpen(y) && dvShMine(y); };
      var tg = act === 'trm' ? sl[i] : null; if (act === 'trm' && !(tg && mineOpen(tg))) return;
      var left = act === 'tclr' ? sl.filter(function (y) { return !mineOpen(y); }) : sl.filter(function (y, j) { return j !== i; });
      if (left.length === sl.length) return;
      var all = !left.some(dvShOpen);
      p.stabs = left; pd.x6nt = null; pd.x6au = null;
      var tn = pdNote(p, act === 'tclr' ? 'You removed your saved tabs' : 'You removed the saved tab “' + prvT(tg.t || pdHost(tg.u), 40) + '”'); pdTouch(p);
      if (all) pd.x6tl = false;
      var nx = left.map(function (y, j) { return j; }).filter(function (j) { return mineOpen(left[j]); });
      pdRerender(all ? '[data-pd="x6:tsave"]' : act === 'trm' && nx.length ? '[data-pd="x6:trm"][data-i="' + (nx.filter(function (j) { return j >= i; })[0] != null ? nx.filter(function (j) { return j >= i; })[0] : nx[nx.length - 1]) + '"]' : '[data-pd="x6:tlist"]');
      showToast(act === 'tclr' ? 'Your saved tabs removed' : 'Tab removed', function () { p.stabs = was; pdUnnote(p, tn); undone(p, 'workspace'); });
    }
    else if (act === 'aud' || act === 'audx') {
      var ak = a.getAttribute('data-k'), aOpen = act === 'aud' && !x6AuOpen(p, ak);
      pd.x6au = aOpen ? ak : null; pd.x6aup = p.id; pd.x6ntp = p.id; if (aOpen) pd.x6nt = null;
      pdRerender(aOpen ? '.x6-aup input:checked' : '[data-pd="x6:aud"][data-k="' + ak + '"]');
    }
    else if (act === 'notes') { X6N.ed = 0; X6N.mv = 0; openDrawer('notes', a); }
  }
  function x6Submit(k, f) {
    var p = pd.p, err = function (m, fld) { var e = f.querySelector('.err'); if (e) e.textContent = m; f.setAttribute('data-err', ''); if (fld && f.elements[fld]) f.elements[fld].focus(); };
    if (k === 'links') return x6LinksSave(f);
    if (k === 'aud') {
      var ak = f.getAttribute('data-k'), ax = x6NtItem(p, ak), ch = f.querySelector('input[name="a"]:checked'), v = ch ? ch.value : '';
      if (!ax || !dvShMine(ax) || !v) return;
      if (ak.charAt(0) === 'f' && dvRole(p) !== 'Owner' && v !== 'all') return;   /* v86 */
      var aud = v === 'some' ? [].slice.call(f.querySelectorAll('input[name="e"]:checked')).map(function (c) { return c.value; }) : v;
      if (v === 'some' && !aud.length) return err('Tick at least one person, or choose Only me.');
      if (x8S(aud) === x8S(x6AuOf(ax, ak))) { pd.x6au = null; pdRerender('[data-pd="x6:aud"][data-k="' + ak + '"]'); return; }
      if (ak.charAt(0) === 'f') { var fw2 = x6FilesWhy(p); if (fw2) return err(fw2.t); if (!pd.x6fb) x6FileAud(p, ax, aud); return; }
      var aw = x8Clone(ax.aud); ax.aud = aud; pd.x6au = null;
      var an = pdNote(p, 'You changed who sees the saved tab “' + prvT(ax.t || pdHost(ax.u), 40) + '”'); pdTouch(p);
      pdRerender('[data-pd="x6:aud"][data-k="' + ak + '"]');
      showToast(x6AuSay(p, aud), function () { if (aw === undefined) delete ax.aud; else ax.aud = aw; pdUnnote(p, an); undone(p, 'workspace'); });
      return;
    }
    if (k === 'note') {
      var nk = f.getAttribute('data-k'), x = x6NtItem(p, nk), nt = f.elements.t.value.replace(/[ \t]+\n/g, '\n').trim();
      if (!x) return;
      if (!nt) return err('Write the update first.', 't');
      var en = { id: x6Id('n'), ts: Date.now(), t: nt.slice(0, 600) }; if (dvShMe()) en.by = dvShMe(); (x.n = x.n || []).push(en);
      var nr = pdNote(p, 'You added a note to “' + prvT(x.t || pdHost(x.u), 40) + '”'); pdTouch(p);
      pdRerender('.x6-ntf textarea');
      showToast('Note added', function () { x.n = x.n.filter(function (y) { return y !== en; }); if (!x.n.length) delete x.n; pdUnnote(p, nr); undone(p, 'workspace'); });
      return;
    }
    if (k === 'later') {
      var t = f.elements.t.value.replace(/\s+/g, ' ').trim(), u = x6Url(f.elements.u.value);
      if (t.length < 2) return err('Write what it is.', 't');
      if (u === null) return err('Enter a full link, or leave it empty.', 'u');
      var r = cxApply({ kind: 'later', pid: p.id, t: t, u: u || '' }); pd.x6la = false; pdRerender('[data-pd="x6:ladd"]');
      showToast(r.msg, function () { r.undo(); undone(p, 'workspace'); });
      return;
    }
    if (k === 'dec') {
      var dt = f.elements.t.value.replace(/\s+/g, ' ').trim(), b = f.elements.b.value.replace(/\s+/g, ' ').trim(), cr = f.elements.cr ? f.elements.cr.value : '';
      if (dt.length < 4) return err('Say what was decided.', 't');
      if (b.length < 8) return err('Say why. A decision without its reason gets argued again.', 'b');
      var d = { id: x6Id('d'), t: dt, because: b, ts: Date.now(), cr: cr, au: 'You' };   /* v98 (46): who logged it */
      (p.cdec = p.cdec || []).push(d);
      var note = pdNote(p, 'You logged a decision: ' + prvT(dt, 50)); pdTouch(p);
      pd.x6df = false; pd.x6dec = null; pdRerender('[data-pd="x6:dadd"]');
      showToast('Decision logged. It can’t be edited.', function () { var i = p.cdec.indexOf(d); if (i > -1) p.cdec.splice(i, 1); pdUnnote(p, note); undone(p, 'workspace'); });
    }
  }

