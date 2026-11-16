  /* ---------- terms: contract value and revision rounds ride inside an issued version, so they are in its fingerprint ---------- */
  function pdTermsOf(v) { return v && v.terms ? v.terms : { price: null, rev: null }; }
  function pdTermsSame(a, b) { return (a.price == null ? null : a.price) === (b.price == null ? null : b.price) && (a.rev == null ? null : a.rev) === (b.rev == null ? null : b.rev) && (a.fv || 0) === (b.fv || 0) && JSON.stringify(a.r || null) === JSON.stringify(b.r || null); }
  /* a milestone date points forward ("17 Oct"), so it is read as the nearest such day, unlike pdParseWhen, which reads the past */
  function pdMs(s) {
    var m = /^(\d+) ([A-Z][a-z]{2})(?: (\d{4}))?$/.exec(String(s || '')), mo, y, t, now = Date.now();
    if (!m || (mo = MON.indexOf(m[2])) < 0) return null;
    y = m[3] ? +m[3] : new Date().getFullYear(); t = new Date(y, mo, +m[1]).getTime();
    if (!m[3] && t < now - 200 * DAY_MS) t = new Date(y + 1, mo, +m[1]).getTime();
    return t;
  }
  /* expected delivery = the date of the last dated milestone */
  function pdDelivery(items) {
    var best = null; items.forEach(function (x) { if (x.sec !== 'tl' || x.rm) return; var t = pdMs(x.d); if (t != null && (best == null || t > best)) best = t; });
    return best;
  }
  function pdShift(t, days) { var d = new Date(t); d.setDate(d.getDate() + days); return d.getTime(); }
  /* approved, but not yet inside an issued version: counts in the new total and the delivery, stays outside the baseline */
  function pdPending(p) {
    var amt = 0, days = 0, ids = [];
    p.crs.forEach(function (c) {
      if (pdCrState(c) !== 'approved' || !c.adds || pdCrVer(p, c)) return;
      var t = pdTerms(c); if (!t) return;
      amt += t.amt || 0; days += t.days || 0; ids.push(c.id);
    });
    return { amt: amt, days: days, ids: ids };
  }
  function pdTotals(p) {
    var l = pdLatest(p); if (!l) return null;
    var t = pdTermsOf(l), pe = pdPending(p), dl = pdDelivery(l.items);
    return { price: t.price, rev: t.rev, delivery: dl, pend: pe, total: t.price == null ? null : t.price + pe.amt, newDelivery: dl == null ? null : pdShift(dl, pe.days) };
  }
  /* the studio's quote is good until its date. After that the client cannot accept it: the studio sends a new one */
  function pdQuoteEntry(c) { var i; for (i = c.entries.length - 1; i >= 0; i--) if (c.entries[i].amt != null) return c.entries[i]; return null; }
  function pdExpired(c) {
    if (pdCrState(c) !== 'client') return false;
    var q = pdQuoteEntry(c); return !!q && q.w === 'y' && !!q.vu && q.vu < Date.now();
  }
  function pdValidBit(c) { var q = pdQuoteEntry(c); return q && q.w === 'y' && q.vu ? ' · valid until ' + dayLbl(q.vu) : ''; }
  /* the approval record: how, when and from where. The client sees the same facts on the receipt */
  function pdRecNow() { return { via: 'email code', at: pdStamp(), ts: Date.now(), ip: pdIp('now' + Date.now() + Math.random()) }; }
  function pdRecLine(r) { return 'Email code · ' + esc(r.at) + ' · IP ' + esc(r.ip); }
  function pdRecHTML(r) { return r ? '<p class="pd-recl">' + IC('shield') + '<span>Verified with an email code<br>' + esc(r.at) + ' · IP ' + esc(r.ip) + '</span></p>' : ''; }
  function pdMoneyOrNone(n, cur) { return n == null ? '' : pdMoney(n, cur); }
  function pdDerive(p) {
    if (p.kind !== 'client' || !p.sc) return;
    var l = pdLatest(p), df = pdDiff(p), open = 0, outside = 0, wait = false;
    p.crs.forEach(function (c) {
      var s = pdCrState(c);
      if (s === 'me' || s === 'client') open++;
      if (s === 'me' && c.entries[c.entries.length - 1].w === 'c') wait = true;
      if (c.adds && (s === 'me' || s === 'client' || (s === 'approved' && !pdCrVer(p, c)))) outside++;
    });
    p.scope = { v: l ? l.v : 0, issued: l ? l.at : '', draft: !l || df.count > 0, changes: df.count };
    p.ch = open; p.outside = outside; p.wait = wait;
    if (p.evd) p.ev = p.evd.length;
    agDerive(p);
  }
  function pdLogClient(cl, kind, text, sub, fresh) {
    if (!cl || !cl.log) return;
    cl.log.unshift([kind, text, sub || '', 'Just now', null, Date.now()]);   // v116: r[5], when
    if (kind === 'client') {
      cl.act = ['Just now', text.length > 34 ? text.slice(0, 33) + '…' : text];
      if (cl.portal !== 'active' && cl.portal !== 'closed') { cl.portal = 'active'; cl.ptS = 'Seen just now'; cl.seenN = 'now'; cl.seenT = 'Just now'; }
    }
    refreshRow(cl);
  }

  /* what the client page and the workspace need from us */
  var PD_CRN = { 'Respond to change request question': 1, 'Respond to change request': 1, 'Review change request response': 1 };
  function pdSyncNeeds(p) {
    var c = p.cid && byId(p.cid); if (!c || p.kind !== 'client') return;
    var act = c.projects.filter(function (x) { return !x.done; });
    c.needs = c.needs.filter(function (x) {
      if (x.src === 'cr' && x.pjid === p.id) return false;
      if (PD_CRN[x.t] && !x.src && (x.pj ? x.pj === p.id : act.length === 1 && act[0].pid === p.id)) return false;
      return true;
    });
    var g = given(c);
    pdCrList(p).forEach(function (cr) {
      var e = cr.entries[cr.entries.length - 1];
      if (pdCrState(cr) !== 'me' || e.w !== 'c') return;
      var rev = e.ty === 'counter' || e.ty === 'note';
      c.needs.push({ t: rev ? 'Review change request response' : e.ty === 'request' ? 'Respond to change request' : 'Respond to change request question', p: cr.id + ' ' + cr.t + '. ' + (rev ? g + ' sent a reply to review.' : g + ' is waiting for your answer.'), pj: act.length > 1 ? p.id : '', src: 'cr', pjid: p.id, cr: cr.id });
    });
    refreshRow(c);
  }
  function pdLocalNeeds(p) {
    var out = [], l = pdLatest(p), df = pdDiff(p), n = (l ? l.v : 0) + 1;
    if (!l && !p.sc.items.length) out.push({ t: 'Draft the first scope', p: 'List what is included and what is not, then issue it to create the first trusted baseline.', tab: 'scope' });
    if (!l && p.sc.items.length) out.push({ t: 'Scope v1 is still a local draft', p: 'Issue it to create the first trusted baseline before design review.', chip: 'warn', chipT: 'Not issued', tab: 'scope' });
    else if (l && df.count) out.push({ t: 'Scope v' + n + ' draft has ' + df.count + ' unissued ' + (df.count === 1 ? 'change' : 'changes'), p: 'Review the draft, then issue it so the client sees the update.', tab: 'scope' });
    pdCrList(p).forEach(function (c) {
      if (pdExpired(c)) out.push({ t: 'Quote for ' + c.id + ' expired', p: c.t + '. ' + (given(byId(p.cid) || {}) || 'The client') + ' can no longer accept it. Send a revised quote.', chip: 'warn', chipT: 'Expired', tab: 'change', cr: c.id });
      if (pdCrState(c) === 'me' && c.entries[c.entries.length - 1].w === 'y') out.push({ t: 'Send a quote for ' + c.id, p: c.t + '. You logged it from ' + (PD_VIA[c.entries[0].via] || 'a conversation') + '.', tab: 'change', cr: c.id });
    });
    return out.concat(agNeeds(p), wkNeeds(p));
  }
  function pdNeeds(p) { var a = pdNeeds0(p); return x8Role(p) === 'Owner' || sdSample(p) ? a : x8MemberNeeds(p, a); }   /* v120 (88): a sample shows its owner's */
  function pdNeeds0(p) {
    var out = [];
    if (p.kind === 'client') {
      var c = byId(p.cid);
      if (c) c.needs.forEach(function (x) {
        if (x.pj && x.pj !== p.id) return;
        out.push({ t: x.t, p: x.p, chip: x.chip, chipT: x.chipT, date: x.date, cr: x.cr, tab: PD_NEED_TAB[x.t] || 'workspace', f: x.t === 'Review current focus' ? 'focus' : x.t === 'Assign next step' ? 'owner' : '' });
      });
      out = out.concat(pdLocalNeeds(p), pdDsNeeds(p));   // v108 (65)
    }
    out = out.concat(p.local || []);
    return out.concat(cfNeeds(p), x6Needs(p, out), x9Needs(p), wkVerNeeds(p));
  }
  function pdInitAll() {
    var cl = PROJECTS.filter(function (p) { return p.kind === 'client'; });
    cl.forEach(function (p) { if (!p.sc) pdInitClient(p); pdDerive(p); });
    cl.forEach(function (p) { pdSyncNeeds(p); });
    PROJECTS.filter(function (p) { return p.kind === 'private'; }).forEach(function (p) { if (!p.pv) prvInit(p); prvDerive(p); });
  }
  function pdAfterScope(p) { pdDerive(p); pdRefreshBadges(p); }
  function pdAfterChange(p) { pdDerive(p); pdSyncNeeds(p); pdRender(); pdRefreshBadges(p); }

  /* ---------- scope ---------- */
  var PD_GLYPH = { add: '+', mod: '~', del: '−' }, PD_KSR = { add: 'Added. ', mod: 'Changed. ', del: 'Removed. ' };
  var PD_SECIC = { out: 'x', ci: 'arrow', tl: 'clock', ho: 'share', wa: 'shield' };   // v116: what kind of line it is, at a glance
  function pdFpChip(p, v) { return '<span class="pd-fp' + (v.fp ? '' : ' pend') + '" data-fp="' + p.id + '|' + v.v + '" title="SHA-256 fingerprint of v' + v.v + '">' + (v.fp || PD_DOTS) + '</span>'; }
  function pdItemForm(sec, x) {
    if (pd.p && agDraftV2(pd.p)) return agItemForm(sec, x);
    var tl = sec === 'tl', ph = PD_SEC.filter(function (s) { return s[0] === sec; })[0][2];
    return '<li class="pd-itf-w"><form class="pd-itf' + (tl ? '' : ' no-d') + '" data-pd-form="' + (x ? 'itedit' : 'additem') + '" data-sec="' + sec + '"' + (x ? ' data-id="' + x.id + '"' : '') + ' novalidate>' +
      '<input name="t" value="' + (x ? esc(x.t) : '') + '" placeholder="' + esc(ph) + '" maxlength="90" aria-label="' + esc(x ? 'Item text' : ph) + '" autocomplete="off">' +
      (tl ? '<input name="d" value="' + (x ? esc(x.d) : '') + '" placeholder="Date or share" maxlength="24" aria-label="Date or share" autocomplete="off">' : '') +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="itcancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (x ? 'Save' : 'Add') + '</button></div><span class="err" role="alert">Write something for this item.</span></form></li>';
  }
  function pdRowHTML(r, ed) {
    var x = r.x, k = r.k;
    if (ed && pd.ie === x.id) return pdItemForm(x.sec, x);
    var note = '';
    if (k === 'add') note = ed ? 'Added in this draft' : 'Added in this version';
    else if (k === 'del') note = ed ? 'Removed in this draft' : 'Removed in this version';
    else if (k === 'mod' && r.was) note = agWas(r.was, x);
    var meta = agMeta(x) + (x.cr ? '<button type="button" class="pd-crl" data-pd="tocr" data-cr="' + x.cr + '" title="Opened from ' + x.cr + '">' + x.cr + '</button>' : '') + (ed && x.sec === 'in' && !x.rm ? wkTag(pd.p, x.id) : '');
    var wcl = '', wf = '';
    if (ed && x.sec === 'in' && !x.rm && pd.p.kind === 'client' && !pd.p.team.length) {
      var wu = wkUnit(pd.p, x.id);
      if (wu && wkShow(wu) === 'wait') wcl = '<span class="pd-wn"><small class="wk-why wc"><b>Waiting on client.</b> ' + esc(wu.wc.why) + '</small>' + wkWcLine(pd.p, wu) + '</span>';
      if (wu && pd.wk && pd.wk.sk === x.id) wf = wkFormHTML(pd.p, wu, false);
    }
    var acts = '';
    if (ed) acts = k === 'del' ? '<button type="button" class="link" data-pd="itundo" data-id="' + x.id + '">Restore</button>' :
      '<button type="button" class="icon-sm xs" data-pd="itedit" data-id="' + x.id + '" aria-label="Edit ' + esc(x.t) + '">' + IC('edit') + '</button><button type="button" class="icon-sm xs" data-pd="itrm" data-id="' + x.id + '" aria-label="Remove ' + esc(x.t) + '">' + IC('x') + '</button>';
    return '<li class="pd-it' + (k ? ' ' + k : '') + '" data-it="' + x.id + '" data-sec="' + x.sec + '"><span class="g" aria-hidden="true">' + (PD_GLYPH[k] || (PD_SECIC[x.sec] ? IC(PD_SECIC[x.sec]) : '')) + '</span><span class="tx"><span class="t">' + (k ? '<span class="sr-only">' + PD_KSR[k] + '</span>' : '') + esc(x.t) + '</span>' + agOkLine(x) + (note ? '<small class="n">' + esc(note) + '</small>' : '') + '</span><span class="meta">' + meta + '</span><span class="acts">' + acts + '</span>' + wcl + '</li>' + wf;
  }
  function pdPaperHTML(p) {
    var l = pdLatest(p), view = pd.view ? pdVer(p, pd.view) : null, df = pdDiff(p), next = (l ? l.v : 0) + 1;
    var cur = !view, rows = view ? pdVerRows(p, view) : pdDraftRows(p), draft = cur && (df.count > 0 || !l), shown = view || l;
    var cls = draft ? 'draft' : (view && view !== l ? 'sealed old' : 'sealed'), just = pd.just === 'sealed' && cur && !draft; pd.just = '';
    var stamp, sub, back = '';
    if (draft) {
      stamp = '<span class="pd-tag"><i></i>Draft v' + next + ' · Local</span>';
      sub = l ? 'Based on trusted v' + l.v + '. ' + df.count + ' unissued ' + (df.count === 1 ? 'change stays' : 'changes stay') + ' on this device until you issue them.' : 'Nothing is shared yet. Issue it to create the first trusted baseline.';
    } else {
      stamp = '<span class="pd-seal sm" aria-hidden="true">' + IC('tick') + '</span><span class="pd-stv" title="Sealed with a SHA-256 fingerprint. Versions shows it.">' + (view && view !== l ? 'Superseded' : 'Trusted') + ' v' + shown.v + '</span>';
      sub = view ? 'Viewing v' + shown.v + (shown === l ? ', the current trusted version.' : ', superseded. Read only.') : 'Issued ' + shown.at + '. Editing starts a local draft.';
    }
    if (view) back = '<button type="button" class="btn-ghost btn-sm" data-pd="viewcur">' + IC('chevl') + (draft ? 'Back to the draft' : 'Back to current') + '</button>';
    var v2 = view ? smV2(view) : agDraftV2(p);
    agCtx = { v2: v2, items: view ? view.items : p.sc.items, ed: cur, grp: v2, M: v2 && (!view || view === l) && p.kind === 'client' ? agM(p) : null };
    if (agCtx.M && !agCtx.M.gov) agCtx.M = null;
    var body = agSecs(p, view).map(function (s) {
      var list = rows.filter(function (r) { return r.x.sec === s[0]; }), n = list.filter(function (r) { return r.k !== 'del'; }).length, adding = cur && pd.as === s[0];
      var h = '<section class="pd-psec" data-sec="' + s[0] + '" aria-labelledby="pd-s-' + s[0] + '"><div class="pd-psec-h"><h4 id="pd-s-' + s[0] + '">' + s[1] + '</h4><span class="n">' + n + '</span>' + (cur ? '<button type="button" class="btn-ghost btn-sm pd-psec-add" data-pd="itadd" data-sec="' + s[0] + '">' + IC('plus') + 'Add</button>' : '') + '</div>';
      /* v116: deliverables and handover lines under their milestone, so the milestone is named once with its date, share and progress */
      if (v2 && (s[0] === 'in' || s[0] === 'ho') && list.length) {
        var gs = agGroups(list, agCtx.items, s[0]);
        h += gs.map(function (g) { return '<div class="ag-grp">' + agGroupHead(p, g, s[0], cur) + '<ul class="pd-items">' + g.rows.map(function (r) { return pdRowHTML(r, cur); }).join('') + '</ul></div>'; }).join('') + (adding ? '<ul class="pd-items ag-grp-add">' + pdItemForm(s[0]) + '</ul>' : '');
      } else if (list.length || adding) h += '<ul class="pd-items">' + list.map(function (r) { return pdRowHTML(r, cur); }).join('') + (adding ? pdItemForm(s[0]) : '') + '</ul>';
      else h += '<p class="pd-pe">Nothing here yet.</p>';
      return h + '</section>';
    }).join('');
    var foot = draft ? '<div class="pd-paper-f">' + IC('lock') + 'Saved on this device only. Nobody else sees a draft.</div>' : '';
    /* v116: the project's name is in the page header already; the card names what it is */
    return '<section class="card pd-paper ' + cls + (just ? ' just' : '') + '" aria-labelledby="pd-h-paper"><header class="pd-paper-h"><div><h3 id="pd-h-paper">Scope of work</h3><p>' + esc(sub) + '</p>' + back + '</div><div class="pd-stamp">' + stamp + '</div></header>' + body + foot + '</section>';
  }
  function pdVersionsCard(p) {
    var l = pdLatest(p), df = pdDiff(p), draft = df.count > 0 || !l, c = byId(p.cid) || { contact: 'the client' }, g = given(c), lis = [];
    if (draft) lis.push('<li class="draft"><b>v' + ((l ? l.v : 0) + 1) + ' · Draft</b><small>Local only' + (l ? ' · ' + df.count + (df.count === 1 ? ' change' : ' changes') : '') + '</small>' + (l && df.count ? '<div class="v-acts"><button type="button" class="link" data-pd="discard">Discard changes</button></div>' : '') + '</li>');
    p.sc.vers.slice().reverse().forEach(function (v) {
      var cur = v === l, showing = pd.view === v.v || (!pd.view && !draft && cur);
      lis.push('<li class="' + (cur ? (v.appr ? '' : 'wait') : 'old') + '"><b>v' + v.v + ' · ' + (cur ? 'Trusted' : 'Superseded') + '</b><small>Issued ' + esc(v.at) + ' · ' + esc(pdVerSum(p, v)) + '</small>' +
        /* v116: how it was approved (email code, time, IP) is in the record and on hover, not spelled out on every version */
        (v.appr ? '<small' + (v.rec ? ' title="' + esc('Email code · ' + v.rec.at + ' · IP ' + v.rec.ip) + '"' : '') + '>Approved by ' + esc(v.appr) + '</small>' : cur ? '<small>Awaiting ' + esc(c.contact || g) + '</small>' : '<small>Replaced before it was approved</small>') +
        '<div class="v-acts">' + pdFpChip(p, v) + (showing && !pd.view ? '<span class="v-now">Showing</span>' : '<button type="button" class="link" data-pd="viewver" data-v="' + v.v + '"' + (pd.view === v.v ? ' aria-pressed="true"' : '') + '>' + (pd.view === v.v ? 'Viewing' : 'View') + '</button>') + '</div></li>');
    });
    /* v116: once the latest version is approved, Approval has nothing to add: Versions says who approved it, and the record how */
    var l0 = pdLatest(p), ok = !!(l0 && l0.appr), extra = ok ? syApprovalExtra(p, 'ok') : '';
    if (/sy-note/.test(extra) === false) extra = '';
    return '<section class="card pd-card" aria-labelledby="pd-h-vers"><div class="card-h ruled"><div><h3 id="pd-h-vers">' + (ok ? 'Versions and approval' : 'Versions') + '</h3><p>' + (ok ? esc('Anything new goes through Changes. It never edits an approved version.') : 'Every issued version, newest first.') + '</p></div><div class="h-actions">' + (ok ? '<span class="chip ok">Approved</span>' : '') + (p.sc.vers.length ? '<button type="button" class="btn-ghost btn-sm" data-pd="dl:record">' + IC('doc') + 'Record</button>' : '') + '</div></div><ol class="pd-vers">' + lis.join('') + '</ol>' + (extra ? '<div class="pd-prot">' + extra + '</div>' : '') + '</section>';
  }
  /* Prototype tools stand in for the client portal, which is not connected yet. They are off by default:
     ?dev in the address, or Alt+Shift+D, turns them on (and off again) */
  var PD_DEV = false;
  try { PD_DEV = /[?&]dev\b/.test(location.search) || localStorage.getItem('sd-dev') === '1'; } catch (e) { PD_DEV = /[?&]dev\b/.test(location.search); }
  document.addEventListener('keydown', function (e) {
    if (!(e.altKey && e.shiftKey && e.code === 'KeyD') || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); PD_DEV = !PD_DEV;
    try { localStorage.setItem('sd-dev', PD_DEV ? '1' : '0'); } catch (x) {}
    if (curView === 'project' && pd.p) pdRerender();
    drPaint();
    showToast('Prototype tools ' + (PD_DEV ? 'on' : 'off'));
  });
  function pdSimOpen() { return pd.sim ? ' open' : ''; }
  function pdApprovalCard(p) {
    var c = byId(p.cid) || {}, l = pdLatest(p), g = given(c) || 'The client', who = c.contact || g, state = !l ? 'none' : l.appr ? 'ok' : 'wait';
    var chip = state === 'ok' ? '<span class="chip ok">Approved</span>' : state === 'wait' ? '<span class="chip">Awaiting ' + esc(g) + '</span>' : '<span class="chip warn">Not issued</span>';
    var h = '<section class="card pd-card" aria-labelledby="pd-h-appr"><div class="card-h ruled"><div><h3 id="pd-h-appr">Approval</h3><p>What ' + esc(g) + ' sees.</p></div><div class="h-actions">' + chip + '</div></div><div class="pd-prot">';
    if (state === 'none') h += '<div class="pd-prow"><span class="pd-seal off" aria-hidden="true"></span><div><b>Nothing shared yet</b><small>Scope v1 is a local draft</small></div></div><p class="pd-note">' + esc(g) + ' sees no scope until you issue it. Issuing sends the Client Action “Approve Scope v1”.</p>';
    else if (state === 'wait') h += '<div class="pd-prow"><span class="pd-seal wait" aria-hidden="true">' + IC('clock') + '</span><div><b>Waiting for ' + esc(who) + '</b><small>Client Action “Approve Scope v' + l.v + '”</small></div></div><p class="pd-note">' + (c.portal === 'active' ? 'It is in ' + esc(g) + '’s portal now.' : esc(g) + ' has not opened the portal yet, so nobody has approved this version.') + '</p>';
    else h += '<div class="pd-prow"><span class="pd-seal" aria-hidden="true">' + IC('tick') + '</span><div><b>Approved by ' + esc(l.appr.split(' · ')[0]) + '</b><small>Scope v' + l.v + ' · ' + esc(l.appr.split(' · ')[1] || l.at) + '</small></div></div><p class="pd-note">Anything new goes through Changes. It never edits this version. Versions keeps how it was approved.</p>';
    h += syApprovalExtra(p, state);
    h += '</div>';
    if (state === 'wait' && PD_DEV && !syLive(p)) h += '<details class="pd-proto"' + pdSimOpen() + '><summary>Prototype · simulate ' + esc(g) + '</summary><div class="pd-proto-b"><p>The client portal is not connected yet. This stands in for ' + esc(g) + ' approving in it.</p><div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-pd="simappr">Approve v' + l.v + ' as ' + esc(g) + '</button></div></div></details>';
    return h + '</section>';
  }
  function pdPips(used, total) {
    var h = '<span class="pd-pips" aria-hidden="true">', i;
    for (i = 0; i < total; i++) h += '<i' + (i < used ? ' class="on"' : '') + '></i>';
    return h + '</span>';
  }
  function pdTermsCard(p) {
    var l = pdLatest(p), view = pd.view ? pdVer(p, pd.view) : null, df = pdDiff(p), cur = !view, editing = cur && p.sc.te;
    var t = view ? pdTermsOf(view) : p.sc.terms, bt = pdTermsOf(l), items = view ? view.items : p.sc.items, dl = pdDelivery(items), tot = pdTotals(p), cl = byId(p.cid) || {}, g = given(cl) || 'the client';
    var chg = function (k) { return cur && !!l && t[k] !== bt[k] && !(t[k] == null && bt[k] == null); };
    var head = '<div class="card-h ruled"><div><h3 id="pd-h-terms">Terms</h3><p>' + (view ? 'As issued in v' + view.v + '.' : 'Part of every version’s fingerprint.') + '</p></div>' + (cur && !editing ? '<div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="termsedit">' + IC('edit') + 'Edit</button></div>' : '') + '</div>';
    var body;
    if (editing) {
      var pend = pdPending(p), extra = pend.amt && t.price != null && !!l ? '<button type="button" class="btn-ghost btn-sm pd-add-ap" data-pd="termsadd" data-amt="' + (bt.price == null ? 0 : bt.price + pend.amt) + '">Add ' + esc(pend.ids.join(', ')) + ' · +' + esc(pdMoney(pend.amt, p.cur)) + '</button>' : '';
      body = '<form class="pd-trf" data-pd-form="terms" novalidate><div class="pd-tr2"><div><label class="k" for="pd-trm-v">Contract value</label><label class="pd-money"><input id="pd-trm-v" name="price" inputmode="numeric" value="' + esc(t.price == null ? '' : String(t.price)) + '" placeholder="Optional" autocomplete="off"><span>' + p.cur + '</span></label></div>' +
        '<div><label class="k" for="pd-trm-r">Revision rounds</label><label class="pd-money"><input id="pd-trm-r" name="rev" inputmode="numeric" value="' + esc(t.rev == null ? '' : String(t.rev)) + '" placeholder="Optional" autocomplete="off"><span>rounds</span></label></div></div>' +
        extra + '<span class="err" role="alert"></span><span class="pd-hint">Expected delivery comes from the last milestone in Timeline and payment.</span>' +
        '<div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-pd="termscancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save to draft</button></div></form>';
    } else {
      body = '<dl class="pd-trm"><div><dt>Contract value</dt><dd' + (t.price == null ? ' class="mute"' : chg('price') ? ' class="chg"' : '') + '>' + (t.price == null ? 'Not set' : esc(pdMoney(t.price, p.cur))) + (chg('price') ? '<small>was ' + (bt.price == null ? 'not set' : esc(pdMoney(bt.price, p.cur))) + '</small>' : '') + '</dd></div>' +
        '<div><dt>Revision rounds</dt><dd' + (t.rev == null ? ' class="mute"' : chg('rev') ? ' class="chg"' : '') + '>' + (t.rev == null ? 'Not set' : t.rev) + (chg('rev') ? '<small>was ' + (bt.rev == null ? 'not set' : bt.rev) + '</small>' : '') + '</dd></div>' +
        '<div><dt>Expected delivery</dt><dd' + (dl == null ? ' class="mute"' : '') + '>' + (dl == null ? 'No dated milestone' : esc(dayLbl(dl))) + '</dd></div></dl>';
      if (cur && tot && (tot.pend.amt || tot.pend.days)) {
        body += '<div class="pd-scl">' + IC('swap') + '<span class="grow"><b>New total ' + (tot.total == null ? '' : esc(pdMoney(tot.total, p.cur))) + (tot.newDelivery != null && tot.pend.days ? (tot.total == null ? '' : ' · ') + 'delivery ' + esc(dayLbl(tot.newDelivery)) : '') + '</b><br>With ' + esc(tot.pend.ids.join(', ')) + (tot.pend.ids.length === 1 ? ', approved but not in a version yet.' : ', approved but not in a version yet.') + ' Set the new value when you issue the next version.</span></div>';
      }
    }
    if (cur && l && !editing) {
      var tr = pdTermsOf(l), used = p.rev.used, has = tr.rev != null, left = has ? tr.rev - used : 0;
      body += '<div class="pd-rev"><div class="pd-rev-h"><div><b>' + (has ? pdPips(used, tr.rev) + used + ' of ' + tr.rev + ' used' : used + (used === 1 ? ' round used' : ' rounds used')) + '</b><small>' + (has ? (left > 0 ? left + (left === 1 ? ' round left. ' : ' rounds left. ') + esc(g) + ' sees this count.' : 'All rounds used. Another round goes through Change.') : 'Set the rounds above to track the limit.') + '</small></div>' +
        '<button type="button" class="btn-ghost btn-sm" data-pd="revlog"' + (has && left <= 0 ? ' disabled' : '') + '>Log a round</button></div>' + (used ? '<button type="button" class="link" data-pd="revundo">Remove the last round</button>' : '') + '</div>';
    }
    return '<section class="card pd-card pd-terms" aria-labelledby="pd-h-terms">' + head + body + '</section>';
  }
  function pdTermsEdit() { var p = pd.p; p.sc.te = true; pdRerender('#pd-trm-v'); }
  function pdTermsCancel() { var p = pd.p; p.sc.te = false; pdRerender('[data-pd="termsedit"]'); }
  function pdTermsSave(form) {
    var p = pd.p, pr = pdParseNum(form.elements.price.value, 'amt'), rs = String(form.elements.rev.value).trim(), err = form.querySelector('.err'), rv = null;
    function bad(msg, el) { err.textContent = msg; form.setAttribute('data-err', ''); el.parentNode.setAttribute('data-bad', ''); el.focus(); }
    [].forEach.call(form.querySelectorAll('[data-bad]'), function (n) { n.removeAttribute('data-bad'); });
    if (pr.err) return bad(pr.err, form.elements.price);
    if (rs !== '') {
      if (!/^\d{1,2}$/.test(rs)) return bad('Rounds must be a whole number, like 3.', form.elements.rev);
      rv = +rs; if (rv < p.rev.used) return bad(p.rev.used + ' ' + (p.rev.used === 1 ? 'round is' : 'rounds are') + ' already used. Enter at least ' + p.rev.used + '.', form.elements.rev);
    }
    var old = p.sc.terms; p.sc.terms = { price: pr.n, rev: rv }; p.sc.te = false;
    pdAfterScope(p); pdRerender('[data-pd="termsedit"]');
    showToast('Terms saved to the draft', function () { p.sc.terms = old; pdAfterScope(p); undone(p, 'scope'); });
  }
  function pdTermsAdd(a) {
    var p = pd.p, f = pdPanel.querySelector('.pd-trf'); if (!f) return;
    f.elements.price.value = a.getAttribute('data-amt'); f.elements.price.focus();
  }
  function pdRevLog(dir) {
    var p = pd.p, l = pdLatest(p), tr = pdTermsOf(l), cl = byId(p.cid) || {}, ent;
    if (dir > 0) {
      if (tr.rev != null && p.rev.used >= tr.rev) return;
      p.rev.used++; pdTouch(p);
      pdLogClient(cl, 'you', 'You logged revision round ' + p.rev.used + (tr.rev != null ? ' of ' + tr.rev : ''), 'Revision rounds'); ent = cl.log && cl.log[0];
      pdRerender('[data-pd="revlog"]');
      showToast('Revision round ' + p.rev.used + (tr.rev != null ? ' of ' + tr.rev : '') + ' logged', function () { p.rev.used--; if (cl.log) { var i = cl.log.indexOf(ent); if (i > -1) cl.log.splice(i, 1); } undone(p, 'scope'); });
    } else {
      if (!p.rev.used) return;
      p.rev.used--; pdTouch(p); pdRerender('[data-pd="revlog"]');
      showToast('Removed the last round', function () { p.rev.used++; undone(p, 'scope'); });
    }
  }
  function pdScopeHTML(p) {
    var l = pdLatest(p), df = pdDiff(p), next = (l ? l.v : 0) + 1, n = p.sc.items.filter(function (x) { return !x.rm; }).length, cta = '';
    if (!pd.view && (df.count > 0 || !l)) cta = '<button type="button" class="btn-primary" data-pd="issue"' + (n ? '' : ' disabled') + '>' + IC('shield') + '<span>Issue Scope v' + next + '</span></button>';
    var vw = pd.view ? pdVer(p, pd.view) : null, tc = (vw ? smV2(vw) : agDraftV2(p)) ? agTermsCard(p) : pdTermsCard(p);
    var la = pdLatest(p), apc = la && la.appr ? '' : pdApprovalCard(p);   // v116: an approved version is told in Versions
    return pdHeadHTML(p, 'scope', cta) + '<div class="pd-cols pd-sc"><div class="pd-col">' + pdPaperHTML(p) + '</div><div class="pd-col">' + agUpgradeCard(p) + tc + pdVersionsCard(p) + apc + '</div></div>';
  }

  /* ---------- change ---------- */
  function pdSelCr(p) {
    var all = pdCrList(p);
    if (!pd.cr) {
      var pick = all.filter(function (c) { return pdCrState(c) === 'me'; })[0] || all.filter(pdCrOpen)[0] || all[0];
      pd.cr = pick ? pick.id : null; pd.crf = pick && !pdCrOpen(pick) ? 'closed' : 'open';
    }
    var g = pdCrGroup(p), c = pd.cr && pdCr(p, pd.cr);
    if (!c || g.indexOf(c) < 0) { c = g[0] || null; pd.cr = c ? c.id : null; }
    return c;
  }
  function pdCrGroup(p) { return pdCrList(p).filter(function (c) { return (pd.crf === 'open') === pdCrOpen(c); }); }
  /* v116: the last quote was declined, and the request is open again (the client asked to see it again, say) */
  function pdQuoteDeclined(c) {
    var i, q = -1; for (i = c.entries.length - 1; i >= 0; i--) if (c.entries[i].amt != null) { q = i; break; }
    if (q < 0 || pdCrState(c) === 'declined') return null;
    for (i = q + 1; i < c.entries.length; i++) if (c.entries[i].ty === 'decline') return c.entries[i];
    return null;
  }
  function pdImpactText(p, c) {
    var t = pdTerms(c), s = pdCrState(c);
    if (t) return (t.amt === 0 ? 'No extra cost' : pdMoney(t.amt, p.cur)) + (t.days ? ' · +' + pdDays(t.days) : '') + (pdQuoteDeclined(c) ? ' · declined' : '');
    return s === 'approved' ? 'No extra cost' : s === 'declined' ? '' : 'Not quoted yet';
  }
  function pdCrRow(p, c, sel, g) {
    var s = pdCrState(c), st = PD_ST[s], last = c.entries[c.entries.length - 1], imp = pdImpactText(p, c);
    return '<li><button type="button" class="pd-cr" data-pd="crsel" data-cr="' + c.id + '"' + (sel ? ' aria-current="true"' : '') + '><span class="sd ' + st[0] + '" aria-hidden="true"></span><span class="tx"><b><span class="id">' + c.id + '</span>' + esc(c.t) + '</b><span class="l2">' + (pdDispute(c) ? '<span class="chip warn">Disputed</span>' : '') + '<span class="chip ' + (s === 'client' && pdExpired(c) ? 'warn' : st[0]) + '">' + esc(s === 'client' ? (pdExpired(c) ? 'Quote expired' : 'Awaiting ' + g) : st[1]) + '</span>' + (imp ? '<span>' + esc(imp) + '</span>' : '') + (c.cmp && c.cmp.tx ? '<span class="pd-tag mini">Draft</span>' : '') + '</span>' + (last.tx ? '<span class="l3"><b>' + esc(last.w === 'y' ? 'You' : g) + '</b> ' + esc(prvT(last.tx, 90)) + '</span>' : '') + '</span><time>' + esc(last.at.split(' · ')[0]) + '</time></button></li>';
  }
  function pdEntHTML(p, c, e, i) {
    var cl = byId(p.cid) || {}, me = e.w === 'y', who = me ? 'You' : (cl.contact || 'Client');
    var av = me ? pdAv(ME) : pdAv({ n: who, c: '#5c6f94' });
    var via = e.via ? '<span>Logged from ' + PD_VIA[e.via] + '</span>' : '';
    var amt = e.amt != null ? '<div class="amt"><b>' + esc(e.amt === 0 ? 'No extra cost' : pdMoney(e.amt, p.cur)) + '</b>' + (e.days ? '<span>+' + pdDays(e.days) + '</span>' : '') + (e.vu ? '<span class="vu' + (e.vu < Date.now() ? ' gone' : '') + '">' + (e.vu < Date.now() ? 'Expired ' : 'Valid until ') + esc(dayLbl(e.vu)) + '</span>' : '') + agQuoteBits(e, p) + '</div>' : '';
    return '<li class="pd-ent' + (me ? ' me' : '') + (e.fresh ? ' fresh' : '') + '">' + av + '<div class="bubble"><div class="who"><b>' + esc(who) + '</b><span class="chip ' + PD_CRCHIP[e.ty] + '">' + PD_CRTY[e.ty] + '</span><time>' + esc(e.at) + '</time>' + via + '<span class="pd-h" data-h="' + p.id + '|' + c.id + '|' + i + '" title="' + (e.hx ? 'SHA-256 ' + pdGroup(e.hx, 12) + ', chained to the entry before it' : 'Fingerprint on its way') + '">' + IC('link') + (e.hx ? '<span class="pd-hc">' + pdCode(e.hx) + '</span>' : '<span class="sr-only">Fingerprinted</span>') + '</span></div>' + (e.ty === 'dispute' ? '<p class="pd-pos">' + esc((me ? 'You think it is: ' : who + ' thinks it is: ') + DS_POS[e.pos || 'fix']) + (e.ref ? '<span class="pd-ref">' + esc(dsRefText(p, e.ref)) + '</span>' : '') + '</p>' : '') + '<p>' + esc(e.tx) + '</p>' + cpHTML(e.pics) + amt + pdRecHTML(e.rec) + '</div></li>';
  }
  /* v102 (58): an entry's code, "#" and the first six of its chained hash in capitals: the same on the client's portal */
  function pdCode(hx) { return '#' + String(hx || '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase(); }
  function pdCmpTypes(c) {
    var t = pdTerms(c), mine = c.entries.some(function (e) { return e.w === 'y' && e.ty === 'quote'; }), out = [['quote', mine ? 'Revised quote' : 'Quote']];
    if (pd.p && !pd.p.sc.vers.some(function (v) { return v.appr; })) out = [];   // quotes start once the client approves a Scope: before that, change the draft
    if (!t || t.w === 'c') out.push(['accept', 'Accept']);
    out.push(['decline', 'Decline'], ['note', 'Note'], ['question', 'Ask a question'], ['dispute', 'We disagree']);   // dispute: v108 (65); question: CONTRACT 82, the one that waits on the client's answer
    return out;
  }
  /* v108 (CONTRACT 65): Disputed. What this side thinks it is and the Scope line it points at (shown only for a dispute); a card with
     both views, the line and its Done when, and where it came from */
  var DS_POS = { fix: 'A fix owed under the agreement', change: 'New or different work' };
  function dsGov(p) { for (var i = p.sc.vers.length - 1; i >= 0; i--) if (p.sc.vers[i].appr) return p.sc.vers[i]; return null; }
  function dsRefText(p, id) { var v = dsGov(p), x = v && v.items.filter(function (y) { return y.id === id; })[0]; return x ? (x.sec === 'out' ? 'Not included: ' : 'Scope: ') + x.t + (x.ok ? ' · Done when: ' + x.ok : '') : ''; }
  function pdDsFields(p) {
    var v = dsGov(p), lines = v ? v.items.filter(function (x) { return x.sec === 'in' || x.sec === 'out'; }) : [];
    return '<div class="pd-ds"><label class="pd-vf"><span>You think it is</span><span class="pd-sel"><select name="pos">' + Object.keys(DS_POS).map(function (k) { return '<option value="' + k + '">' + DS_POS[k] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></label>' +
      (lines.length ? '<label class="pd-vf"><span>Which part of the Scope</span><span class="pd-sel"><select name="ref"><option value="">None in particular</option>' + lines.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc((x.sec === 'out' ? 'Not included: ' : '') + prvT(x.t, 60)) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></label>' : '') + '</div>';
  }
  function pdDsCard(p, c) {
    var d = pdDispute(c); if (!d) return '';
    var g = given(byId(p.cid) || {}) || 'The client', side = function (who, e) { return '<div class="ds-s"><b>' + esc(who) + '</b>' + (e ? '<span>' + esc(DS_POS[e.pos || 'fix']) + '</span>' + (e.ref ? '<small>' + esc(dsRefText(p, e.ref)) + '</small>' : '') + '<p>' + esc(e.tx) + '</p>' : '<span class="mute">Has not said yet</span>') + '</div>'; };
    var b0 = c.entries[0] && c.entries[0].bug != null ? (p.mev || [])[c.entries[0].bug] : null;
    return '<div class="ds-card"><div class="ds-h"><span class="chip warn">Disputed</span><span>' + esc('ScopeDue decides nothing here. It ends when ' + g + ' accepts a quote (no extra cost means fixed under the agreement) or declines.') + '</span></div>' +
      (b0 ? '<p class="ds-bug">' + esc('From the problem ' + g + ' reported: “' + b0.tx + '”') + '</p>' : '') + '<div class="ds-g">' + side(g, d.c) + side('You', d.y) + '</div>' +
      '</div>';
  }
  function pdDsNeeds(p) {
    var g = given(byId(p.cid) || {}) || 'The client';
    return (p.crs || []).filter(function (c) { return pdDispute(c) && pdCrState(c) === 'me'; }).map(function (c) { var d = pdDispute(c); return { t: g + ' disagrees on ' + c.id, p: (d.c ? DS_POS[d.c.pos || 'fix'] + ': ' : '') + prvT((d.c || d.y || { tx: '' }).tx, 120), chip: 'warn', chipT: 'Disputed', tab: 'change', cr: c.id }; });
  }
  function pdComposerHTML(p, c) {
    var m = c.cmp = c.cmp || { ty: 'quote', tx: '', amt: '', days: '', vf: stQuoteDays() }, types = pdCmpTypes(c); if (!m.vf) m.vf = stQuoteDays();
    if (!types.some(function (t) { return t[0] === m.ty; })) m.ty = types[0][0];
    /* v116: a revised quote starts from your last one (amount, days, hours, the milestone it moves), once per request on this screen */
    var pq = pdQuoteEntry(c); pd.cmpPre = pd.cmpPre || {};
    if (pq && pq.w === 'y' && !pd.cmpPre[c.id] && !m.amt && !m.days && !m.hrs) { m.amt = String(pq.amt); m.days = pq.days ? String(pq.days) : ''; m.hrs = pq.hrs != null ? String(pq.hrs) : ''; if (pq.m) m.mv = pq.m; }
    pd.cmpPre[c.id] = 1;
    /* every field has its label above it, on one two-column grid: hours and amount, extra days and the milestone they move, how long it is valid and an included change */
    var qp = agQuoteParts(p, c, m), fld = function (k, inner) { return '<div class="pd-fld"><span class="k">' + k + '</span>' + inner + '</div>'; };
    var amt = fld('Amount', '<label class="pd-money"><input name="amt" inputmode="numeric" placeholder="0" value="' + esc(m.amt) + '" aria-label="Amount in ' + p.cur + '" autocomplete="off"><span>' + p.cur + '</span></label>');
    var days = fld('Extra days', '<label class="pd-money"><input name="days" inputmode="numeric" placeholder="0" value="' + esc(m.days) + '" aria-label="Extra days" autocomplete="off"><span>days</span></label>');
    var vf = fld('Valid for', '<span class="pd-sel"><select name="vf" aria-label="Valid for">' + [['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['0', 'No expiry']].map(function (o) { return '<option value="' + o[0] + '"' + (m.vf === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>');
    return '<form class="pd-compose" data-pd-form="send" data-ty="' + m.ty + '" data-n="' + c.entries.length + '" novalidate>' +
      (p.sc.vers.some(function (v) { return v.appr; }) ? '' : '<p class="pd-note ag-noq">' + IC('clock') + 'Quotes start once ' + esc(agG(p)) + ' approves Scope v1. Until then, change the draft and reissue it.</p>') +
      '<div class="pd-cmp-h"><span class="pd-eb">Your reply</span><span class="pd-tag mini"><i></i>Draft · ' + (syLive(p) ? 'Shared when sent' : 'Local') + '</span></div>' +
      '<div class="seg" role="group" aria-label="Reply type" data-seg="cty">' + types.map(function (t) { return '<button type="button" data-f="' + t[0] + '" aria-pressed="' + (t[0] === m.ty) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pd-q">' + (qp ? qp.hrs + amt + days + qp.mv + vf + (qp.inc ? '<div class="pd-fld pd-fld-c">' + qp.inc + '</div>' : '') : amt + days + vf) + '</div>' +
      pdDsFields(p) + '<p class="pd-cmp-help"></p><textarea name="tx" rows="3" maxlength="500" aria-label="Message">' + esc(m.tx) + '</textarea><span class="err" role="alert"></span>' +
      '<div class="pd-cmp-f"><span class="pd-chain" data-chain="' + p.id + '|' + c.id + '">Checking chain…</span><span class="pd-hint">Entries can’t be edited after sending.</span><button type="submit" class="btn-primary btn-sm">' + IC('send') + '<span data-go>Send quote</span></button></div></form>';
  }
  function pdSyncCompose(form) {
    var p = pd.p, c = pdSelCr(p); if (!c || !c.cmp) return;
    var ty = c.cmp.ty, cl = byId(p.cid) || {}, g = given(cl) || 'the client', t = pdTerms(c);
    var cfg = {
      quote: ['Explain what the quote covers.', 'Sent as a quote. ' + g + ' can accept, counter or decline it.', 'Send quote'],
      note: ['Reply to ' + g + '. This does not change the price.', c.adds ? 'A note keeps ' + g + ' informed. The request stays with you until you quote it: ' + g + ' is not asked to reply.' : 'A note keeps the conversation going without changing the terms.', 'Send note'],   // CONTRACT 82
      question: ['What do you need to know from ' + g + '?', 'Asks ' + g + ' to answer. The request waits on them until they do.', 'Send question'],
      accept: ['Optional message', t ? 'Agrees to ' + (t.amt === 0 ? 'no extra cost' : pdMoney(t.amt, p.cur)) + (t.days ? ' and +' + pdDays(t.days) : '') + ', as proposed by ' + (t.w === 'y' ? 'you' : g) + '. This settles the request.' : 'Agrees to do it at no extra cost. This settles the request.', 'Accept request'],
      decline: ['Optional reason', 'Closes the request. ' + g + ' sees your reason.', 'Decline request'],
      dispute: ['Why you see it this way', 'Says where you stand. ' + g + ' sees it beside their view. ScopeDue decides nothing: it ends with an accepted quote or a decline.', 'Send']
    }[ty];
    form.setAttribute('data-ty', ty);
    form.elements.tx.placeholder = cfg[0]; form.querySelector('.pd-cmp-help').textContent = cfg[1]; form.querySelector('[data-go]').textContent = cfg[2];
    if (ty === 'quote') agQuoteSync(form);
  }
  function pdSimHTML(p, c) {
    if (!PD_DEV || syLive(p)) return '';
    var cl = byId(p.cid) || {}, g = given(cl) || 'the client', open = c && pdCrOpen(c);
    var opts = (open ? [['question', 'Asks a question'], ['counter', 'Counter offer'], ['accept', 'Accepts'], ['decline', 'Declines'], ['note', 'Adds a note']] : c ? [['note', 'Asks to reopen']] : []).concat([['request', 'Opens a new request']]);
    return '<details class="pd-proto"' + pdSimOpen() + '><summary>Prototype · simulate ' + esc(g) + '</summary><form class="pd-proto-b" data-pd-form="sim" novalidate><p>The client portal is not connected yet. This stands in for ' + esc(g) + ' replying in it.</p>' +
      '<div class="pd-sim-r"><span class="pd-sel"><select name="ty" aria-label="What ' + esc(g) + ' does">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>' +
      '<label class="pd-money" data-sim-amt hidden><input name="amt" inputmode="numeric" placeholder="Counter amount" aria-label="Counter amount in ' + p.cur + '" autocomplete="off"><span>' + p.cur + '</span></label></div>' +
      '<input name="tx" placeholder="What does ' + esc(g) + ' write?" maxlength="300" aria-label="Message from ' + esc(g) + '" autocomplete="off"><div class="pd-s-acts"><button type="submit" class="btn-ghost btn-sm">Send as ' + esc(g) + '</button></div></form></details>';
  }
  function pdCrScopeRow(p, c) {
    var v = pdCrVer(p, c), l = pdLatest(p), nx = (l ? l.v : 0) + 1;
    if (v) return '<div class="pd-scl ok">' + IC('tick') + '<span class="grow">In trusted Scope v' + v + '. It is part of the baseline now.</span><button type="button" class="btn-ghost" data-pd="toscope">Open Scope</button></div>';
    if (pdCrInDraft(p, c)) return '<div class="pd-scl">' + IC('doc') + '<span class="grow">In the Scope v' + nx + ' draft. It stays outside the trusted baseline until you issue it.</span><button type="button" class="btn-ghost" data-pd="toscope">Open Scope</button></div>';
    return '<div class="pd-scl">' + IC('swap') + '<span class="grow">Agreed, but outside the trusted baseline. Add it to Scope so the next version covers it.</span><button type="button" class="btn-primary" data-pd="cr2sc">Add to Scope draft</button></div>';
  }
  function pdCrDetail(p, c) {
    var s = pdCrState(c), st = PD_ST[s], cl = byId(p.cid) || {}, g = given(cl) || 'Client', t = pdTerms(c), bv = pdVer(p, c.base), l = pdLatest(p), settled = s === 'approved' || s === 'declined';
    var xp = pdExpired(c), chip = '<span class="chip ' + (xp ? 'warn' : st[0]) + '">' + esc(s === 'client' ? (xp ? 'Quote expired' : 'Awaiting ' + g) : st[1]) + '</span>';
    /* v116: asked against an older version, it is worth a look (what it asks may be in the newer one already): amber, not a seal */
    var based = bv ? (l && l.v > bv.v ? '<span class="chip warn" title="' + esc('Compare it with v' + l.v + ' before you quote') + '">' + esc('Based on v' + bv.v + ' · v' + l.v + ' is now trusted') + '</span>' : 'Based on Scope v' + bv.v + ' <span class="pd-seal sm" aria-hidden="true" title="Sealed with a SHA-256 fingerprint">' + IC('tick') + '</span>') : 'No trusted baseline yet';
    var cost = t ? (t.amt === 0 ? 'None' : pdMoney(t.amt, p.cur)) : '—', time = t ? (t.days ? '+' + pdDays(t.days) : 'None') : '—';
    var touch = c.touches ? c.touches + (c.touches === 1 ? ' deliverable' : ' deliverables') : 'Nothing';
    var dq = pdQuoteDeclined(c), klab = s === 'approved' ? 'Agreed terms' : s === 'declined' ? 'Last quote' : dq ? 'Declined quote' : t ? 'Latest quote' : 'Not quoted yet';
    var outside = c.adds && s !== 'declined' && !pdCrVer(p, c) ? '<span class="chip warn">Adds to the Scope</span>' : !c.adds ? '<span class="chip quiet">Question only</span>' : '';
    /* what it touches: the milestone the quote moves, by name */
    var qe = pdQuoteEntry(c), qms = qe && qe.m && p.sc ? agMs(p, qe.m, (agM(p).gov || {}).items || p.sc.items) : null;
    var h = '<section class="card pd-card pd-cr-d" aria-labelledby="pd-h-cr"><div class="card-h ruled"><div><span class="pd-eb">' + c.id + '</span><h3 id="pd-h-cr" tabindex="-1">' + esc(c.t) + '</h3><p>' + based + '</p></div><div class="h-actions">' + chip + '</div></div>';
    h += '<div class="pd-imp-k"><span class="pd-eb">' + klab + '</span>' + outside + '</div>';
    h += '<div class="pd-imp' + (dq ? ' gone' : '') + '"><div><span>Cost</span><b' + (t ? '' : ' class="mute"') + '>' + esc(cost) + '</b></div><div><span>Time</span><b' + (t ? '' : ' class="mute"') + '>' + esc(time) + '</b></div><div><span>Touches</span><b>' + esc(touch) + '</b>' + (qms && qe.days ? '<small>' + esc('Moves ' + qms.t) + '</small>' : '') + '</div></div>';
    if (dq) h += '<div class="pd-scl warn">' + IC('x') + '<span class="grow"><b>' + esc(g + ' declined this quote ' + String(dq.at || '').split(' · ')[0]) + '</b>' + (dq.tx ? '<q class="dl-q">' + esc(dq.tx) + '</q>' : '') + '</span></div>';
    if (xp) h += '<div class="pd-scl">' + IC('clock') + '<span class="grow">This quote expired on ' + esc(dayLbl(pdQuoteEntry(c).vu)) + '. ' + esc(g) + ' can no longer accept it. Send a revised quote.</span></div>';
    if (s === 'approved' && c.adds) h += pdCrScopeRow(p, c);
    h += pdDsCard(p, c);   // v108 (65)
    h += '<ol class="pd-thread" aria-label="Negotiation history">' + c.entries.map(function (e, i) { return pdEntHTML(p, c, e, i); }).join('') + '</ol>';
    c.entries.forEach(function (e) { e.fresh = false; });
    if (settled) {
      var last = c.entries[c.entries.length - 1];
      h += '<div class="pd-settle ' + s + '">' + (s === 'approved' ? '<span class="pd-seal" aria-hidden="true">' + IC('tick') + '</span>' : '<span class="pd-seal off" aria-hidden="true"></span>') + '<div><b>' + (s === 'approved' ? 'Approved' : 'Declined') + '</b><small>' +
        (s === 'approved' ? 'Agreed ' + esc(t ? (t.amt === 0 ? 'at no extra cost' : 'at ' + pdMoney(t.amt, p.cur) + (t.days ? ' and +' + pdDays(t.days) : '')) : 'at no extra cost') : 'By ' + (last.w === 'y' ? 'you' : esc(g))) + ' · ' + esc(last.at) + '</small></div></div>';
      h += '<div class="pd-chain-f"><span class="pd-chain" data-chain="' + p.id + '|' + c.id + '">Checking chain…</span></div>';
    } else h += pdComposerHTML(p, c);
    h += pdSimHTML(p, c);
    return h + '</section>';
  }
  function pdChangeHTML(p) {
    var l = pdLatest(p), cl = byId(p.cid) || {}, g = given(cl) || 'the client';
    var cta = '<button type="button" class="btn-primary" data-pd="crnew"' + (l ? '' : ' disabled title="Issue Scope v1 first"') + '>' + IC('plus') + '<span>New request</span></button>';
    var head = pdHeadHTML(p, 'change', cta);
    if (!p.crs.length) {
      return head + '<div class="card pd-void"><span class="pd-void-i">' + IC('swap') + '</span>' + (l ?
        '<h3>No requests yet</h3><p>' + esc(g) + ' has not asked for anything outside Scope v' + l.v + '. If they do, it lands here. You can also log one yourself from an email or a call.</p>' :
        '<h3>Requests start from a trusted baseline</h3><p>Issue Scope v1 first. After that, anything ' + esc(g) + ' asks for outside it is logged here, quoted and agreed in a record that cannot be edited.</p><button type="button" class="btn-ghost" data-pd="goto" data-tab="scope">Open Scope</button>') + '</div>' + (l && PD_DEV ? '<div class="card pd-card pd-card-sim">' + pdSimHTML(p, null) + '</div>' : '');
    }
    var sel = pdSelCr(p), group = pdCrGroup(p), nOpen = p.crs.filter(pdCrOpen).length, nClosed = p.crs.length - nOpen;
    var seg = '<div class="seg" role="group" aria-label="Filter requests" data-seg="crf"><button type="button" data-f="open" aria-pressed="' + (pd.crf === 'open') + '">Open <span class="n">' + nOpen + '</span></button><button type="button" data-f="closed" aria-pressed="' + (pd.crf === 'closed') + '">Closed <span class="n">' + nClosed + '</span></button></div>';
    var waiting = p.crs.filter(function (c) { return pdCrState(c) === 'me'; }).length;
    var list = '<section class="card pd-card" aria-labelledby="pd-h-reqs"><div class="card-h ruled"><div><h3 id="pd-h-reqs">Requests</h3><p>' + (waiting ? waiting + ' waiting on you.' : nOpen ? 'Nothing waiting on you.' : 'All settled.') + '</p></div></div><div class="pd-crs-seg">' + seg + '</div>' +
      (group.length ? '<ul class="pd-crs">' + group.map(function (c) { return pdCrRow(p, c, c === sel, g); }).join('') + '</ul>' : '<p class="pd-crs-e">' + (pd.crf === 'open' ? 'Nothing is open. The next request from ' + esc(g) + ' lands here.' : 'No closed requests yet.') + '</p>') + '</section>';
    var detail = sel ? pdCrDetail(p, sel) : '<section class="card pd-card"><p class="pd-crs-e">Select a request to see its history.</p></section>';
    return head + '<div class="pd-cols pd-ms"><div class="pd-col">' + list + '</div><div class="pd-col">' + detail + '</div></div>';
  }
