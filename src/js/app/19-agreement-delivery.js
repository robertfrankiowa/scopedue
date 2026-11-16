  /* ---------- v60: the agreement and the delivery record on client projects (CONTRACT.md, section 19) ----------
     The model is the shared block (sm*). Here: the Scope sections and Agreement card of a v2 draft, the Delivery tab, Needs,
     the header, the record, and writing delivery events (to the server first when the project is on the portal). */
  var AG_SEC = [['in', 'Deliverables', 'Add a deliverable'], ['out', 'Exclusions', 'Add an exclusion'], ['ci', 'Client provides', 'Add something the client provides'], ['tl', 'Milestones', 'Add a milestone'], ['ho', 'To hand over', 'Add something you hand over'], ['wa', 'Warranty', 'Add what the warranty covers']];   // wa: v107 (64)   // ho: v106 (63)
  var AG_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function agDraftV2(p) { return !!(p && p.sc && p.sc.terms && p.sc.terms.fv === 2); }
  function agV2(p) { return !!(p && p.kind === 'client' && p.sc && (agDraftV2(p) || p.sc.vers.some(smV2))); }
  function agApprOf(v) { return v && v.appr ? { ts: v.apts || (v.rec && v.rec.ts) || v.ts || 0, by: String(v.appr).split(' · ')[0], ip: v.rec ? v.rec.ip : '', fp: v.fp } : null; }
  function agM(p, now) { return smState({ ref: p.id, vers: p.sc.vers, crs: p.crs, ev: p.mev || [], now: now == null ? Date.now() : now, appr: agApprOf }); }
  function agG(p) { return given(byId(p.cid) || {}) || 'The client'; }
  function agStudio() { return (pfSaved.biz || '').trim() || pfSaved.name || 'Your studio'; }
  function agIsoMs(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null; }
  function agWhen(ts) { var d = new Date(ts); return AG_WD[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ', ' + pdClock(ts); }
  function agDay(ts) { var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function agDaysW(n) { return n + (n === 1 ? ' day' : ' days'); }
  function agMs(p, id, items) { var l = (items || p.sc.items).filter(function (x) { return x.sec === 'tl' && !x.rm; }), m = l.filter(function (x) { return x.id === id; })[0]; return m || l[l.length - 1] || null; }
  function agSecs(p, view) { return (view ? smV2(view) : agDraftV2(p)) ? AG_SEC : PD_SEC; }
  function agTermsBlank() { return { price: null, rev: null, fv: 2, r: smDefaults() }; }

  /* hashes on the delivery record, computed when missing (the sample is written without them) */
  function agChain(p, cb) {
    var ev = p.mev || [], i = 0;
    p.mevq = p.mevq || []; if (cb) p.mevq.push(cb);
    if (p.mevBusy) return; p.mevBusy = true;
    (function next() {
      if (i >= ev.length) { p.mevBusy = false; var q = p.mevq; p.mevq = []; q.forEach(function (f) { f(); }); return; }
      var e = ev[i], prev = i ? ev[i - 1].hx : smEvGen(p.id);
      if (e.ty === 'accept' && e.rec && !e.rec.fp) { for (var j = i - 1; j >= 0; j--) if (ev[j].ty === 'deliver' && ev[j].m === e.m) { if (ev[j].hx) e.rec.fp = pdGroup(ev[j].hx, 12); break; } }
      if (e.hx) { i++; return next(); }
      pdSha(smEvRaw(p.id, prev, e), function (hex) { e.hx = hex; i++; next(); });
    })();
  }

  /* ---- Scope: rows, item form, and what changed ---- */
  var agCtx = null;   // the items the rows on screen belong to, for milestone names
  /* v116: a row says what its section needs. The warranty its days; what the client provides whether it came (from the record, on
     the current version); a milestone whether it is accepted. Deliverables and handover lines sit under their milestone (agGroups),
     so they no longer repeat its name */
  function agMeta(x) {
    var h = '', M = agCtx && agCtx.M, st = null;
    if (x.sec === 'wa' && /^\d+$/.test(x.d || '')) return '<span>' + esc(agDaysW(+x.d)) + '</span>';
    if (x.sec === 'ci' && M && !x.rm) {
      var n = M.ins.filter(function (y) { return y.id === x.id; })[0];
      if (n) st = n.got ? ['ok', 'Received ' + agDay(n.got.ts)] : n.sent ? ['', 'Sent ' + agDay(n.sent.ts)] : n.st === 'late' ? ['crit', 'Late ' + agDaysW(n.late)] : n.st === 'due' ? ['warn', 'Due soon'] : null;
    }
    if (x.sec === 'tl' && M && !x.rm) { var ms = smMs(M, x.id); if (ms && ms.at && ms.id === x.id && ms.st === 'accepted') st = ['ok', 'Accepted ' + agDay(ms.at)]; }
    if (smIsoOk(x.d)) h += '<span' + (st ? ' class="ag-when"' : '') + '>' + esc(smIsoLbl(x.d)) + '</span>'; else if (x.d) h += '<span>' + esc(x.d) + '</span>';
    if (st) h += '<span class="chip ' + st[0] + '">' + esc(st[1]) + '</span>';
    if (x.sec === 'tl' && x.pay != null && agCtx && agCtx.v2) h += '<span class="ag-pay">' + x.pay + '%</span>';
    if ((x.sec === 'in' || x.sec === 'ho') && agCtx && agCtx.v2 && !agCtx.grp) { var m = agMs(null, x.m, agCtx.items); if (m) h += '<span class="ag-mc" title="Delivered with this milestone">' + esc(m.t) + '</span>'; }
    return h;
  }
  /* the deliverables (or handover lines) of a v2 Scope, under the milestone each goes with, in the milestones' order */
  function agGroups(list, items, sec) {
    var tl = items.filter(function (x) { return x.sec === 'tl' && !x.rm; }), by = {}, out = [], none = [];
    list.forEach(function (r) { var m = r.x.m && tl.some(function (t) { return t.id === r.x.m; }) ? r.x.m : ''; if (m) (by[m] = by[m] || []).push(r); else none.push(r); });
    tl.forEach(function (t) { if (by[t.id]) out.push({ m: t, rows: by[t.id] }); });
    if (none.length) out.push({ m: null, rows: none });
    return out;
  }
  function agGroupHead(p, g, sec, ed) {
    var m = g.m, bits = [], live = g.rows.filter(function (r) { return r.k !== 'del'; }), done = 0, known = 0;
    if (m && smIsoOk(m.d)) bits.push(smIsoLbl(m.d));
    if (m && m.pay) bits.push(m.pay + '%');
    if (sec === 'in' && ed && p) live.forEach(function (r) { var u = wkUnit(p, r.x.id); if (u) { known++; if (wkShow(u) === 'done') done++; } });
    var n = known ? done + ' of ' + live.length + ' done' : live.length + (live.length === 1 ? ' line' : ' lines');
    return '<div class="ag-gh"><b>' + esc(m ? m.t : 'Not on a milestone') + '</b>' + (bits.length ? '<small>' + esc(bits.join(' · ')) + '</small>' : '') + '<span class="ag-gn">' + esc(n) + '</span>' + (known ? '<i class="ag-gbar" aria-hidden="true"><i style="width:' + Math.round(done / Math.max(1, live.length) * 100) + '%"></i></i>' : '') + '</div>';
  }
  function agOkLine(x) {
    if (x.sec !== 'in' || !agCtx || !agCtx.v2) return '';
    return x.ok ? '<small class="ag-ok"><b>Done when</b> ' + esc(x.ok) + '</small>' : (agCtx.ed ? '<small class="ag-ok none">No “Done when” line yet</small>' : '');
  }
  function agWas(was, x) {
    if (was.t !== x.t) return 'was “' + was.t + '”';
    if ((was.ok || '') !== (x.ok || '')) return was.ok ? 'Done when was “' + was.ok + '”' : 'Done when added';
    if ((was.m || '') !== (x.m || '')) { var m = agMs(null, was.m, agCtx ? agCtx.items : []); return 'was with ' + (m ? m.t : 'another milestone'); }
    if ((was.pay == null ? null : was.pay) !== (x.pay == null ? null : x.pay)) return 'share was ' + (was.pay || 0) + '%';
    return 'was ' + (was.d ? (smIsoOk(was.d) ? smIsoLbl(was.d) : was.d) : 'no date');
  }
  function agItemForm(sec, x) {
    var p = pd.p, ph = AG_SEC.filter(function (s) { return s[0] === sec; })[0][2], ms = p.sc.items.filter(function (y) { return y.sec === 'tl' && !y.rm; });
    var h = '<li class="pd-itf-w"><form class="pd-itf ag-itf" data-pd-form="' + (x ? 'itedit' : 'additem') + '" data-sec="' + sec + '"' + (x ? ' data-id="' + x.id + '"' : '') + ' novalidate>' +
      '<input name="t" value="' + (x ? esc(x.t) : '') + '" placeholder="' + esc(ph) + '" maxlength="90" aria-label="' + esc(x ? 'Item text' : ph) + '" autocomplete="off">';
    if (sec === 'in') h += '<label class="ag-f wide"><span>Done when</span><input name="ok" value="' + (x ? esc(x.ok || '') : '') + '" placeholder="What the client can check, for example “Live on staging, test orders work”" maxlength="160" autocomplete="off"></label>' +
      '<label class="ag-f"><span>Milestone</span><span class="pd-sel"><select name="m">' + (ms.length ? ms.map(function (m, i) { var sel = x ? (x.m === m.id || (!x.m && i === ms.length - 1)) : i === ms.length - 1; return '<option value="' + m.id + '"' + (sel ? ' selected' : '') + '>' + esc(m.t) + '</option>'; }).join('') : '<option value="">Add a milestone first</option>') + '</select>' + IC('chev') + '</span></label>';
    if (sec === 'ho') h += '<label class="ag-f"><span>Handed over with</span><span class="pd-sel"><select name="m">' + (ms.length ? ms.map(function (m, i) { var sel = x ? (x.m === m.id || (!x.m && i === ms.length - 1)) : i === ms.length - 1; return '<option value="' + m.id + '"' + (sel ? ' selected' : '') + '>' + esc(m.t) + '</option>'; }).join('') : '<option value="">Add a milestone first</option>') + '</select>' + IC('chev') + '</span></label>';   // v106 (63)
    if (sec === 'wa') h += '<label class="ag-f sm"><span>Days</span><input name="d" inputmode="numeric" value="' + (x && /^\d+$/.test(x.d || '') ? x.d : '30') + '" maxlength="4" autocomplete="off"></label><span class="pd-hint">From when the last milestone is accepted.</span>';   // v107 (64)
    if (sec === 'ci' || sec === 'tl') h += '<label class="ag-f"><span>' + (sec === 'ci' ? 'Needed by' : 'Date') + '</span><input name="d" type="date" value="' + (x && smIsoOk(x.d) ? x.d : '') + '"></label>';
    if (sec === 'tl') h += '<label class="ag-f sm"><span>Share</span><span class="pd-money"><input name="pay" inputmode="numeric" value="' + (x && x.pay != null ? x.pay : '') + '" placeholder="0" maxlength="3" autocomplete="off"><span>%</span></span></label>';
    return h + '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="itcancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (x ? 'Save' : 'Add') + '</button></div><span class="err" role="alert">Write something for this item.</span></form></li>';
  }
  /* returns an error message, or '' when the form is fine and the item was written */
  function agItRead(form, sec, x) {
    var e = form.elements, err = function (m, el) { form.querySelector('.err').textContent = m; form.setAttribute('data-err', ''); if (el) el.focus(); return m; };
    var d = e.d ? String(e.d.value || '').trim() : '', pay = null;
    if ((sec === 'ci' || sec === 'tl') && !smIsoOk(d)) return err(sec === 'tl' ? 'Give the milestone a date.' : 'Say when you need it by.', e.d);
    if (sec === 'tl') { var ps = String(e.pay.value).trim().replace(/%$/, ''); if (ps === '') ps = '0'; if (!/^\d{1,3}$/.test(ps) || +ps > 100) return err('The share is a whole percent from 0 to 100.', e.pay); pay = +ps; }
    if (sec === 'wa') { if (!/^[1-9]\d{0,3}$/.test(d) || +d > 3650) return err('The warranty runs 1 to 3650 days.', e.d); if (pd.p.sc.items.some(function (y) { return y.sec === 'wa' && !y.rm && y !== x && y.id !== x.id; })) return err('A Scope has one warranty line. Edit the one there is.', e.t); }   // v107 (64)
    x.d = sec === 'ci' || sec === 'tl' || sec === 'wa' ? d : '';
    if (sec === 'in') { x.ok = String(e.ok.value).replace(/\s+/g, ' ').trim(); x.m = e.m ? e.m.value : ''; } else if (x.ok == null) x.ok = '';
    if (sec === 'ho') { x.ok = ''; x.m = e.m ? e.m.value : ''; }   // v106 (63)
    if (x.m == null) x.m = '';
    x.pay = sec === 'tl' ? pay : null;
    return '';
  }

  /* ---- Scope: the Agreement card (replaces Terms on a v2 draft or version) ---- */
  var AG_F = [['dep', 'Due at start', '%'], ['pd', 'Pay within', 'days of acceptance'], ['rpm', 'Revisions', 'rounds per milestone'], ['free', 'Included changes', 'small changes'], ['rate', 'Change rate', 'an hour'], ['min', 'Minimum', 'hours per change'],
    ['review', 'Review window', 'business days'], ['silence', 'Pause after', 'business days of silence'], ['dormant', 'Close after', 'days paused'], ['cure', 'Fix period', 'days after a notice']];
  function agTermsCard(p) {
    var l = pdLatest(p), view = pd.view ? pdVer(p, pd.view) : null, cur = !view, editing = cur && p.sc.te, t = view ? pdTermsOf(view) : p.sc.terms, r = t.r || smDefaults(), bt = l ? pdTermsOf(l) : null, bR = bt && bt.r;
    var g = agG(p), names = { client: g, studio: agStudio(), money: function (n) { return pdMoney(n, p.cur); } };
    var head = '<div class="card-h ruled"><div><h3 id="pd-h-terms">Agreement</h3><p>' + (view ? 'As issued in v' + view.v + '.' : esc(g) + ' approves it with the Scope.') + '</p></div>' + (cur && !editing ? '<div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="termsedit">' + IC('edit') + 'Edit</button></div>' : '') + '</div>';
    var body;
    if (editing) {
      /* CONTRACT 101: the currency sits by the contract value; once a Scope was issued it stays as the client saw it */
      var lk = pdCurLocked(p), cy = sdCur(p.cur);
      body = '<form class="pd-trf ag-trf" data-pd-form="terms" novalidate><div class="ag-g"><div class="ag-f"><label class="k" for="pd-trm-v">Contract value</label><label class="pd-money"><input id="pd-trm-v" name="price" inputmode="numeric" value="' + esc(t.price == null ? '' : String(t.price)) + '" placeholder="Optional" autocomplete="off"><span translate="no">' + cy + '</span></label></div>' +
        '<div class="ag-f"><label class="k" for="ag-cur">Currency</label><select id="ag-cur" name="cur" translate="no"' + (lk ? ' disabled aria-describedby="ag-cur-h"' : '') + '>' + sdCurOptions(cy) + '</select>' + (lk ? '<small class="pd-hint" id="ag-cur-h">Stays as issued in v1.</small>' : '') + '</div>' +
        AG_F.map(function (f) { return '<div class="ag-f"><label class="k" for="ag-' + f[0] + '">' + f[1] + '</label><label class="pd-money"><input id="ag-' + f[0] + '" name="' + f[0] + '" inputmode="numeric" value="' + esc(String(r[f[0]])) + '" autocomplete="off"><span>' + (f[0] === 'rate' ? '<span translate="no">' + cy + '</span> ' : '') + f[2] + '</span></label></div>'; }).join('') +
        '<div class="ag-f wide"><label class="k" for="ag-meth">How to pay <span class="opt">Optional</span></label><input id="ag-meth" name="meth" maxlength="80" value="' + esc(r.meth) + '" placeholder="For example, bank transfer or card" autocomplete="off"></div>' +
        '<div class="ag-f wide"><label class="k" for="ag-doc">Your contract <span class="opt">Optional link</span></label><input id="ag-doc" name="doc" maxlength="300" value="' + esc(r.doc) + '" placeholder="https://…" autocomplete="off"></div>' +
        '<label class="pd-chk ag-f wide" for="ag-own"><input type="checkbox" id="ag-own" name="own"' + (r.own ? ' checked' : '') + '><span class="box" aria-hidden="true">' + IC('tick') + '</span><span>The work belongs to the client once it is paid in full</span></label></div>' +
        '<span class="err" role="alert"></span><span class="pd-hint">Milestone shares are set on each milestone. With a contract value, the share due at start and the milestones add up to 100%.</span>' +
        '<div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-pd="termscancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save to draft</button></div></form>';
    } else {
      var items = view ? view.items : p.sc.items.filter(function (x) { return !x.rm; }), sum = r.dep;
      items.forEach(function (x) { if (x.sec === 'tl') sum += x.pay || 0; });
      var chg = function (k) { return cur && bR && JSON.stringify(r[k]) !== JSON.stringify(bR[k]); };
      /* v116: the contract value leads, as the figure the rest is about; each term reads label over value, left to right */
      body = '<div class="ag-hero"><span>Contract value</span><b' + (t.price == null ? ' class="mute"' : '') + '>' + (t.price == null ? 'Not set' : esc(pdMoney(t.price, p.cur))) + '</b></div><dl class="pd-trm ag-trm">' +
        '<div><dt>Payment</dt><dd' + (chg('dep') || chg('pd') ? ' class="chg"' : '') + '>' + (r.dep ? r.dep + '% at start, ' : '') + 'then each milestone’s share' + (r.pd ? ' within ' + agDaysW(r.pd) + ' of acceptance' : ' on acceptance') + (t.price != null && sum !== 100 ? '<small class="warn">Shares add up to ' + sum + '%, not 100%</small>' : '') + '</dd></div>' +
        '<div><dt>Revisions</dt><dd' + (chg('rpm') ? ' class="chg"' : '') + '>' + r.rpm + (r.rpm === 1 ? ' round' : ' rounds') + ' per milestone</dd></div>' +
        '<div><dt>Changes</dt><dd' + (chg('rate') || chg('free') || chg('min') ? ' class="chg"' : '') + '>' + (r.rate ? esc(pdMoney(r.rate, p.cur)) + ' an hour' + (r.min ? ', ' + r.min + ' h minimum' : '') : 'Quoted one by one') + '<small>' + (r.free ? r.free + ' small ' + (r.free === 1 ? 'change' : 'changes') + ' included' : 'No changes included') + '</small></dd></div>' +
        '<div><dt>Reviews</dt><dd' + (chg('review') ? ' class="chg"' : '') + '>' + r.review + ' business days<small>Then accepted by default</small></dd></div>' +
        '<div><dt>Silence</dt><dd' + (chg('silence') || chg('dormant') ? ' class="chg"' : '') + '>Pause after ' + r.silence + ' business days<small>Close after ' + r.dormant + ' days paused</small></dd></div>' +
        '<div><dt>Missed dates</dt><dd' + (chg('cure') ? ' class="chg"' : '') + '>' + agDaysW(r.cure) + ' to fix after a flag</dd></div>' +
        (r.own ? '<div><dt>Ownership</dt><dd>On full payment</dd></div>' : '') + (r.doc ? '<div><dt>Contract</dt><dd class="ag-doc">' + esc(r.doc) + '</dd></div>' : '') + '</dl>' +
        '<details class="ag-plain"><summary>What ' + esc(g) + ' reads</summary><dl>' + smTermsText(r, t.price, names, false).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl></details>' +
        '<p class="pd-note ag-out">' + IC('shield') + 'Payments happen outside ScopeDue. It never says whether something was paid.</p>';
    }
    return '<section class="card pd-card pd-terms ag-terms" aria-labelledby="pd-h-terms">' + head + body + '</section>';
  }
  function agTermsSave(form) {
    var p = pd.p, e = form.elements, err = form.querySelector('.err'), pr = pdParseNum(e.price.value, 'amt'), r = {}, i, f, s, lim;
    function bad(msg, el) { err.textContent = msg; form.setAttribute('data-err', ''); if (el.parentNode) el.parentNode.setAttribute('data-bad', ''); el.focus(); }
    [].forEach.call(form.querySelectorAll('[data-bad]'), function (n) { n.removeAttribute('data-bad'); });
    if (pr.err) return bad(pr.err, e.price);
    for (i = 0; i < AG_F.length; i++) {
      f = AG_F[i][0]; s = String(e[f].value).trim(); lim = SM_LIM[f];
      if (f === 'rate') { var rt = pdParseNum(s, 'amt'); s = rt.err ? 'x' : String(rt.n == null ? 0 : rt.n); }   /* CONTRACT 101: written as money ("150.000") */
      if (!/^\d{1,13}$/.test(s) || +s < lim[0] || +s > lim[1]) return bad(AG_F[i][1] + ' must be a whole number from ' + lim[0] + ' to ' + String(lim[1]).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.', e[f]);
      r[f] = +s;
    }
    r.own = e.own.checked ? 1 : 0; r.meth = String(e.meth.value).replace(/\s+/g, ' ').trim(); r.doc = String(e.doc.value).trim();
    if (r.doc && !/^https?:\/\/\S{3,}$/i.test(r.doc)) return bad('The contract link must start with https://', e.doc);
    var old = p.sc.terms, oc = p.cur, nc = e.cur && !e.cur.disabled && !pdCurLocked(p) ? sdCur(e.cur.value) : p.cur;
    p.sc.terms = { price: pr.n, rev: null, fv: 2, r: r }; p.sc.te = false;
    if (nc !== oc) { p.cur = nc; pdCurKeep(nc); }   /* CONTRACT 101: the next project starts on it too */
    pdAfterScope(p); pdRerender('[data-pd="termsedit"]');
    showToast('Agreement saved to the draft', function () { p.sc.terms = old; p.cur = oc; pdAfterScope(p); undone(p, 'scope'); });
  }
  /* an older Scope moves to the agreement in its next version: dated milestones with shares, Done when lines, and the clocks */
  function agUpgradeCard(p) {
    if (agDraftV2(p) || pd.view) return '';
    return '<section class="card pd-card ag-up" aria-labelledby="pd-h-up"><div class="card-h ruled"><div><h3 id="pd-h-up">Set up the agreement</h3><p>The next version can carry the rules both sides work by.</p></div></div><ul class="ag-upl">' +
      '<li>' + IC('clock') + 'Milestones with dates and payment shares</li><li>' + IC('tick') + 'A “Done when” line for each deliverable</li><li>' + IC('swap') + 'Revisions per milestone, a change rate and included changes</li><li>' + IC('shield') + 'Review windows, pauses and a fix period for missed dates</li></ul>' +
      '<div class="pd-s-acts"><button type="button" class="btn-primary btn-sm" data-pd="ag:upgrade">Set up the agreement</button></div><p class="pd-note">Your current Scope stays exactly as approved. The change lands in the draft, and ' + esc(agG(p)) + ' approves it with the next version.</p></section>';
  }
  function agUpgrade(p) {
    var oldI = p.sc.items, oldT = p.sc.terms, items = pdsCl(p.sc.items), r = smDefaults(), t = p.sc.terms || {};
    if (t.rev != null) r.rpm = Math.min(9, t.rev);
    var tl = items.filter(function (x) { return x.sec === 'tl'; }), pays = 0;
    items.forEach(function (x) {
      x.ok = x.ok || ''; x.m = x.m || ''; x.pay = null;
      if (x.sec !== 'tl') { if (x.sec !== 'ci') x.d = ''; return; }
      var m = /\s*·\s*(\d{1,3})%\s*$/.exec(x.t); if (m) { x.pay = Math.min(100, +m[1]); x.t = x.t.slice(0, m.index).trim(); } else x.pay = 0;
      pays += x.pay;
      var ms = pdMs(x.d); x.d = ms != null ? smIsoLocal(ms) : (smIsoOk(x.d) ? x.d : '');
    });
    r.dep = Math.max(0, Math.min(100, 100 - pays));
    if (!tl.length) items.push(Object.assign(pdsIt('tl', 'Handoff', p.dueAt ? smIsoLocal(p.dueAt) : ''), { ok: '', m: '', pay: 100 - r.dep }));
    p.sc.items = items; p.sc.terms = { price: t.price == null ? null : t.price, rev: null, fv: 2, r: r }; p.sc.te = false;
    pdAfterScope(p); pdRerender();
    showToast('The draft now carries the agreement. Check the dates and shares, then issue it.', function () { p.sc.items = oldI; p.sc.terms = oldT; pdAfterScope(p); undone(p, 'scope'); });
  }
  /* what stops a v2 draft from being issued, shown in the Issue drawer */
  function agIssueCheck(p) {
    var box = document.getElementById('dis-chk'); if (!box) return false;
    if (!agDraftV2(p)) { box.hidden = true; box.innerHTML = ''; return false; }
    var list = smCheck(p.sc.items.filter(function (x) { return !x.rm; }), p.sc.terms), block = list.some(function (x) { return x.block; });
    box.hidden = !list.length;
    box.innerHTML = list.length ? '<h3 class="sec" style="margin:0 0 10px">' + (block ? 'Fix before issuing' : 'Worth a look') + '</h3><ul class="ag-chk">' + list.map(function (x) { return '<li class="' + (x.block ? 'b' : 'w') + '">' + IC(x.block ? 'x' : 'clock') + '<span>' + esc(x.t) + '</span></li>'; }).join('') + '</ul>' : '';
    return block;
  }

  /* ---- Changes: quotes on an agreement carry hours, an included change, and the milestone they move ---- */
  /* v116: the agreement's parts of a quote as separate fields (hours, the milestone it moves, an included change), so the composer
     lays them on one grid with the amount and the days. A draft that remembers a milestone accepted since then moves the next open one */
  function agQuoteParts(p, c, m) {
    var M = agM(p); if (!M.gov) return null;
    var R = M.rules, open = function (id) { return M.ms.some(function (x) { return x.id === id && x.st !== 'accepted'; }); }, ms = M.ms.filter(function (x) { return x.st !== 'accepted'; });
    var cur = open(m.mv) ? m.mv : (ms[0] ? ms[0].id : (M.ms[M.ms.length - 1] || {}).id);
    return {
      hrs: '<div class="pd-fld"><span class="k">Hours</span><label class="pd-money ag-hrs"><input name="hrs" inputmode="numeric" placeholder="0" value="' + esc(m.hrs || '') + '" aria-label="Hours" autocomplete="off"><span>' + (R.rate ? '× ' + esc(pdMoney(R.rate, p.cur)) : 'h') + '</span></label></div>',
      mv: '<div class="pd-fld"><span class="k">Moves milestone</span><span class="pd-sel"><select name="mv" aria-label="Milestone the extra days move">' + M.ms.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + (x.st === 'accepted' ? ' disabled' : '') + '>' + esc(x.t) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div>',
      inc: R.free ? '<label class="pd-chk ag-inc" for="ag-inc"><input type="checkbox" id="ag-inc" name="inc"' + (m.inc ? ' checked' : '') + (M.inc.left < 1 ? ' disabled' : '') + '><span class="box" aria-hidden="true">' + IC('tick') + '</span><span>Included change · ' + M.inc.left + ' of ' + M.inc.total + ' left</span></label>' : ''
    };
  }
  function agQuoteSync(form) {
    var p = pd.p, M = agM(p), e = form.elements, c = pdSelCr(p); if (!M.gov || !e.hrs || !c || !c.cmp) return;
    var R = M.rules, h = String(e.hrs.value).trim(), inc = e.inc && e.inc.checked;
    c.cmp.hrs = h; c.cmp.inc = !!inc; c.cmp.mv = e.mv.value;
    if (inc) { e.amt.value = '0'; e.amt.readOnly = true; } else e.amt.readOnly = false;
    if (!inc && R.rate && /^\d{1,3}$/.test(h)) { var bill = Math.max(+h, R.min); e.amt.value = String(bill * R.rate); c.cmp.amt = e.amt.value; }
    var help = form.querySelector('.pd-cmp-help');
    if (help && c.cmp.ty === 'quote') help.textContent = inc ? 'Included at no extra cost. ' + (M.inc.left - 1) + ' of ' + M.inc.total + ' left after this one.' : R.rate && /^\d{1,3}$/.test(h) ? Math.max(+h, R.min) + ' h × ' + pdMoney(R.rate, p.cur) + (+h < R.min ? ' (the agreed minimum)' : '') + ' = ' + pdMoney(Math.max(+h, R.min) * R.rate, p.cur) + '.' : 'Sent as a quote. ' + agG(p) + ' can accept, counter or decline it.';
  }
  function agQuoteBits(e, p) {
    var b = '';
    if (e.inc) b += '<span class="chip quiet">Included change</span>';
    if (e.hrs != null && e.hrs !== '') { var R0 = (agM(p).rules || {}); b += '<span>' + esc(R0.rate ? e.hrs + ' h × ' + pdMoney(R0.rate, p.cur) : e.hrs + ' h') + '</span>'; }   // v116: the rate with the hours
    if (e.m && p.sc) { var ms = agMs(p, e.m, (agM(p).gov || {}).items || p.sc.items); if (ms && e.days) b += '<span>Moves ' + esc(ms.t) + '</span>'; }
    return b;
  }

  /* ---- the Delivery tab ---- */
  var DL_ST = { upcoming: ['', 'Upcoming'], review: ['', 'In review'], back: ['warn', 'Back with you'], accepted: ['ok', 'Accepted'], late: ['crit', 'Late'], notdelivered: ['crit', 'Not delivered after notice'] };
  function dlOn(p) { return syLive(p); }
  function dlHTML(p) {
    var M = agM(p), g = agG(p), head = pdHeadHTML(p, 'delivery', M.gov ? '<button type="button" class="btn-ghost" data-pd="dl:record">' + IC('doc') + '<span>Project record</span></button>' : '');
    if (!M.gov) {
      var l = pdLatest(p), wait = l && smV2(l) && !l.appr;
      return head + '<div class="card pd-void"><span class="pd-void-i">' + IC('clock') + '</span><h3>' + (wait ? 'Waiting for ' + esc(g) + ' to approve Scope v' + l.v : 'Delivery starts from an approved agreement') + '</h3><p>' + (wait ? 'Once ' + esc(g) + ' approves it, each milestone gets its date, its review window and its share of the payment here.' : 'Set up the agreement in Scope: milestones with dates and shares, and a “Done when” line for each deliverable. Issue it; delivery starts once ' + esc(g) + ' approves it.') + '</p><button type="button" class="btn-ghost" data-pd="goto" data-tab="scope">Open Scope</button></div>';
    }
    agChain(p);
    return head + '<div class="pd-cols dl-cols"><div class="pd-col">' + dlStatusCard(p, M) + dlMsCard(p, M) + '</div><div class="pd-col">' + dlInsCard(p, M) + dlHoCard(p, M) + dlWaCard(p, M) + dlPayCard(p, M) + '</div></div>';
  }
  function dlStatusCard(p, M) {
    var g = agG(p), R = M.rules, h = '', cls = '', acts = '', cur = M.ms[M.cur];
    if (M.cl) {
      cls = M.cl.by === 'c' ? 'crit' : 'off';
      h = '<b>' + (M.cl.by === 'c' ? esc(g) + ' ended the project' : 'You closed the project') + ' ' + esc(agDay(M.cl.ts)) + '</b><small>' + esc(M.cl.e.tx || '') + '</small>';
      if (M.cl.by === 'y' && smCan.resume(M)) acts = '<button type="button" class="btn-ghost btn-sm" data-pd="dl:resume">Reopen</button>';
    } else if (M.pz) {
      cls = 'wait'; var d = Math.max(1, smCeilDays(Date.now() - M.pz.ts)), canClose = smCan.close(M);
      h = '<b>Paused since ' + esc(agDay(M.pz.ts)) + '</b><small>' + esc(M.pz.e.tx) + ' · Dates have moved ' + agDaysW(d) + ' so far.' + (canClose ? '' : ' You can close it after ' + R.dormant + ' days paused, from ' + esc(agDay(M.pz.ts + R.dormant * 864e5)) + '.') + '</small>';
      acts = '<button type="button" class="btn-primary btn-sm" data-pd="dl:resume">Resume</button>' + (canClose ? '<button type="button" class="btn-ghost btn-sm" data-pd="dl:close">Close as dormant…</button>' : '');
    } else {
      var all = M.ms.every(function (m) { return m.st === 'accepted'; });
      if (all) { cls = 'ok'; h = '<b>Every milestone is accepted</b><small>Expected delivery was ' + esc(smIsoLbl(M.expected)) + '. The record has everything both sides agreed and did.</small>'; }
      else if (cur) {
        /* v116: the milestone under way, large, with how long is left; then three figures; Deliver is here, not under the list */
        cls = cur.st === 'late' || cur.st === 'notdelivered' ? 'crit' : cur.st === 'back' ? 'warn' : '';
        var left = cur.st === 'upcoming' ? Math.ceil((cur.effEnd - Date.now()) / 864e5) : null;
        h = '<div class="dl-hero"><b class="dl-hero-t">' + esc(cur.t) + '</b><span class="dl-hero-s">' + esc(dlStText(p, cur)) + '</span>' + (left != null && left >= 0 ? '<span class="dl-hero-d">' + esc(left === 0 ? 'Due today' : left === 1 ? '1 day left' : left + ' days left') + '</span>' : '') + '</div>' +
          '<small>Expected delivery ' + esc(smIsoLbl(M.expected, true)) + (M.expected !== M.ms[M.ms.length - 1].base ? ', agreed ' + esc(smIsoLbl(M.ms[M.ms.length - 1].base)) : '') + '.</small>';
      }
      var nAcc = M.ms.filter(function (m) { return m.st === 'accepted'; }).length, now0 = Date.now(), dueAmt = 0, lateIn = M.ins.filter(function (n) { return n.st === 'late' && !n.got && !n.sent; }).length;
      M.sched.forEach(function (s) { if (s.due && s.due <= now0 && s.amt != null) dueAmt += s.amt; });
      h += '<ul class="dl-kpis"><li><b>' + nAcc + '/' + M.ms.length + '</b><small>milestones accepted</small></li>' + (M.price != null ? '<li><b>' + esc(pdMoney(dueAmt, p.cur)) + '</b><small>due so far</small></li>' : '') + (M.ins.length ? '<li' + (lateIn ? ' class="crit"' : '') + '><b>' + (lateIn ? lateIn : M.ins.filter(function (n) { return n.got; }).length + '/' + M.ins.length) + '</b><small>' + esc(lateIn ? (lateIn === 1 ? 'item late from ' : 'items late from ') + g : 'received from ' + g) + '</small></li>' : '') + '</ul>';
      if (M.silent >= R.silence) h += '<p class="dl-sil">' + IC('clock') + '<span>' + esc(g) + ' has not replied for ' + M.silent + ' business days while ' + esc(M.waits.map(function (w) { return w.t; }).slice(0, 2).join(' and ')) + (M.waits.length > 1 ? ' wait' : ' waits') + '. The agreement lets you pause the work.</span></p>';
      if (cur && !all && smCan.deliver(M, cur.id) && pd.dl !== 'deliver:' + cur.id) acts += '<button type="button" class="btn-primary btn-sm" data-pd="dl:deliver" data-m="' + cur.id + '">' + IC('send') + esc((cur.dels.length ? 'Deliver again: ' : 'Deliver ') + cur.t) + '</button>';
      acts += '<button type="button" class="' + (M.silent >= R.silence ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-pd="dl:pause">Pause the work…</button>';
    }
    var form = '';
    if (pd.dl === 'pause') form = '<form class="prv-f dl-f" data-pd-form="dl:pause" novalidate><div class="seg" role="group" aria-label="Why" data-seg="dlk">' + [['silence', 'No reply'], ['payment', 'Payment due'], ['other', 'Other']].map(function (o) { return '<button type="button" data-f="' + o[0] + '" aria-pressed="' + ((pd.dlk || 'silence') === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="fld"><label for="dl-pw">Reason ' + esc(g) + ' sees</label><textarea id="dl-pw" name="tx" rows="2" maxlength="500" placeholder="' + esc((pd.dlk || 'silence') === 'payment' ? 'For example: the Wireframes share was due 7 days after acceptance, as agreed.' : 'For example: we need the logo and brand colors to continue.') + '"></textarea></div>' +
      '<p class="pd-hint">' + esc(g) + ' is emailed. Milestone dates move by the days paused. Delivery clocks stop; review windows already running do not.</p><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Pause the work</button></div><span class="err" role="alert"></span></form>';
    if (pd.dl === 'close') form = '<form class="prv-f dl-f" data-pd-form="dl:close" novalidate><div class="fld"><label for="dl-cw">Why close it</label><textarea id="dl-cw" name="tx" rows="2" maxlength="500" placeholder="For example: no reply for 30 days while paused."></textarea></div><p class="pd-hint">The record stays in both portals. You can reopen it later.</p><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Close the project</button></div><span class="err" role="alert"></span></form>';
    var note = !syLive(p) ? '<p class="pd-note dl-loc">' + IC('lock') + esc(g) + ' is not on the portal for this project, so ScopeDue cannot tell them about deliveries. Review windows count only once they are told: share the portal from the client page.</p>' : '';
    return '<section class="card pd-card dl-st ' + cls + '" aria-labelledby="pd-h-dst"><div class="card-h ruled"><div><h3 id="pd-h-dst">Where it stands</h3></div></div><div class="dl-st-b">' + h + '</div>' + (form || (acts ? '<div class="pd-s-acts">' + acts + '</div>' : '')) + note + '</section>';
  }
  function dlStText(p, m) {
    if (m.st === 'accepted') return (m.deemed ? 'accepted by default ' : 'accepted ') + agDay(m.at);
    if (m.st === 'review') return 'in review until ' + agWhen(m.ends);
    if (m.st === 'back') return m.resp && m.resp.ty === 'notmet' ? agG(p) + ' says it is not as agreed' : agG(p) + ' asked for changes';
    if (m.st === 'late') return 'late ' + agDaysW(m.late) + (m.notice && m.notice.open ? ', flagged' : '');
    if (m.st === 'notdelivered') return 'not delivered after notice';
    return 'due ' + smIsoLbl(m.eff, true);
  }
  function dlShift(p, M, m) {
    if (m.eff === m.base || m.st === 'accepted') return '';
    var b = [];
    if (m.shift.cl) b.push('+' + agDaysW(m.shift.cl) + ' for late items from ' + agG(p));
    if (m.shift.cr) b.push('+' + agDaysW(m.shift.cr) + ' for approved changes');
    if (m.shift.pz) b.push('+' + agDaysW(m.shift.pz) + ' paused');
    return '<small class="dl-shift">Agreed ' + esc(smIsoLbl(m.base)) + ' → now ' + esc(smIsoLbl(m.eff)) + ': ' + esc(b.join(' · ')) + '</small>';
  }
  function dlMsCard(p, M) {
    var g = agG(p), R = M.rules, rows = M.ms.map(function (m, j) {
      var st = DL_ST[m.st], chip = '<span class="chip ' + st[0] + '">' + esc(m.st === 'accepted' && m.deemed ? 'Accepted by default' : m.st === 'late' && m.notice && m.notice.open ? 'Late · flagged' : st[1]) + '</span>';
      var it = smItemsOf(M.gov, m.id), lines = [], last = m.last, resp = m.resp;
      if (last) lines.push('<li class="y">' + IC('send') + '<span><b>You delivered ' + esc(agWhen(last.ts)) + '</b>' + (last.tx ? '<small>' + esc(last.tx) + '</small>' : '') + (last.link ? '<a class="link" href="' + esc(sdHref(last.link)) + '" target="_blank" rel="noopener noreferrer">' + esc(pdHost(last.link)) + '</a>' : '') + '</span></li>');
      if (m.cap) lines.push(dlCapHTML(p, m, g));   // v103 (61)
      var dfc = dlDrvChanged(p, m); if (dfc) lines.push(dlDrvHTML(p, m, g, dfc, smCan.deliver(M, m.id)));   // v137 (117)
      if (m.st === 'review') lines.push('<li>' + IC('clock') + '<span><b>' + esc(g) + ' has until ' + esc(agWhen(m.ends)) + '</b><small>To accept it, ask for changes, or say what is not as agreed. With no answer by then, it counts as accepted.</small></span></li>');
      if (resp && resp.ty === 'changes') lines.push('<li class="c">' + IC('edit') + '<span><b>' + esc(g) + ' asked for changes ' + esc(agWhen(resp.ts)) + '</b><small>' + esc(resp.tx) + '</small>' + cpHTML(resp.pics) + '</span></li>');
      if (resp && resp.ty === 'notmet') { var ok = it.filter(function (x) { return x.id === resp.k; })[0]; lines.push('<li class="c crit">' + IC('x') + '<span><b>' + esc(g) + ' says it is not as agreed</b><small>' + (ok ? 'Done when: “' + esc(ok.ok) + '”. ' : '') + esc(resp.tx) + '</small>' + cpHTML(resp.pics) + '</span></li>'); }
      /* v116: each sentence its own line (each is translated whole); the IP address is on hover and in the record */
      var issues = m.cap ? m.cap.res.filter(function (x) { return x && !x.ok; }).length : 0, rip = m.acc && m.acc.rec && m.acc.rec.ip ? m.acc.rec.ip : '';
      if (m.st === 'accepted') lines.push('<li class="ok">' + IC('tick') + '<span><b>' + (m.deemed ? 'Accepted by default ' + esc(agWhen(m.at)) : esc(g) + ' accepted it ' + esc(agWhen(m.at))) + '</b><small' + (rip ? ' title="IP ' + esc(rip) + '"' : '') + '>' + (m.deemed ? 'No answer within ' + R.review + ' business days of the delivery, as agreed.' : 'With an email code.') + '</small>' + (issues ? '<small class="dl-warn">' + esc(issues === 1 ? 'Accepted with 1 step marked as an issue.' : 'Accepted with ' + issues + ' steps marked as an issue.') + '</small>' : '') + (m.pay ? '<small>' + esc(M.price != null ? 'Its share (' + m.pay + '%, ' + pdMoney(m.amt, p.cur) + ') is due ' + agDay(m.at + R.pd * 864e5) + '.' : 'Its share (' + m.pay + '%) is due ' + agDay(m.at + R.pd * 864e5) + '.') + '</small>' : '') + '</span></li>');
      if (m.notice && m.notice.open && m.st !== 'accepted') lines.push('<li class="c crit">' + IC('clock') + '<span><b>' + esc(g) + (m.notice.e.ty === 'flag' ? ' flagged it as missed ' : ' gave notice ') + esc(agWhen(m.notice.e.ts)) + '</b><small>' + (m.st === 'notdelivered' ? 'The fix period ended ' + esc(agWhen(m.notice.ends)) + '. ' + esc(g) + ' can end the project.' : 'Deliver it, or agree a new date with a change request, by ' + esc(agWhen(m.notice.ends)) + '.') + (m.notice.e.tx ? ' “' + esc(m.notice.e.tx) + '”' : '') + '</small></span></li>');
      var acts = '';
      if (smCan.deliver(M, m.id) && !(j === M.cur && !M.cl && !M.pz)) acts += '<button type="button" class="btn-primary btn-sm" data-pd="dl:deliver" data-m="' + m.id + '">' + IC('send') + (m.dels.length ? 'Deliver again' : 'Deliver') + '</button>';
      if ((m.st === 'late' || m.st === 'notdelivered') && !M.cl) acts += '<button type="button" class="btn-ghost btn-sm" data-pd="dl:redate" data-m="' + m.id + '">Propose a new date</button>';
      var form = pd.dl === 'deliver:' + m.id ? '<form class="prv-f dl-f" data-pd-form="dl:deliver" data-m="' + m.id + '" novalidate><div class="fld"><label for="dl-lk">Link to the work <span class="opt">Optional</span></label><input id="dl-lk" name="link" maxlength="300" placeholder="https://…" autocomplete="off">' + (dlDrvOn() ? '<p class="pd-hint">A Google Drive file in the project folder is delivered with its version number.</p>' : '') + '</div><div class="fld"><label for="dl-nt">Note for ' + esc(g) + ' <span class="opt">Optional</span></label><textarea id="dl-nt" name="tx" rows="2" maxlength="2000"></textarea></div>' +
        '<div class="fld"><label for="dl-b">Build or version <span class="opt">Optional</span></label><input id="dl-b" name="b" maxlength="60" placeholder="v1.4 · a1b2c3d" autocomplete="off"></div>' +
        '<div class="fld"><label for="dl-st">What to check <span class="opt">Optional, one step per line, up to 5</span></label><textarea id="dl-st" name="steps" rows="3" maxlength="900" placeholder="Open the home page on a phone: three best sellers show"></textarea></div>' +
        '<p class="pd-hint">' + esc(g) + ' has ' + R.review + ' business days to answer, until ' + esc(agWhen(smBizEnd(Date.now(), R.review))) + '. ' + (m.left ? m.left + (m.left === 1 ? ' revision round is' : ' revision rounds are') + ' left on this milestone.' : 'No revision rounds are left: more changes become a change request.') + '</p>' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Deliver ' + esc(m.t) + '</button></div><span class="err" role="alert"></span></form>' : '';
      var sim = '';
      if (PD_DEV && !syLive(p)) {
        if (m.st === 'review') sim = '<button type="button" class="btn-ghost btn-sm" data-pd="dl:sim" data-k="accept" data-m="' + m.id + '">Accept as ' + esc(g) + '</button>' + (m.left ? '<button type="button" class="btn-ghost btn-sm" data-pd="dl:sim" data-k="changes" data-m="' + m.id + '">Ask changes as ' + esc(g) + '</button>' : '') + (it.some(function (x) { return x.ok; }) ? '<button type="button" class="btn-ghost btn-sm" data-pd="dl:sim" data-k="notmet" data-m="' + m.id + '">Not as agreed</button>' : '');
        else if (smCan.flag(M, m.id)) sim = '<button type="button" class="btn-ghost btn-sm" data-pd="dl:sim" data-k="flag" data-m="' + m.id + '">Flag as ' + esc(g) + '</button>';
        if (sim) sim = '<details class="pd-proto"' + pdSimOpen() + '><summary>Prototype · simulate ' + esc(g) + '</summary><div class="pd-proto-b"><div class="pd-s-acts">' + sim + '</div></div></details>';
      }
      /* v116: the line under the name is one piece per fact, so each is translated on its own */
      var bits = [m.st === 'accepted' ? 'Due ' + smIsoLbl(m.eff) : smIsoLbl(m.eff, true)];
      if (m.pay) { bits.push(m.pay + '%'); if (M.price != null) bits.push(pdMoney(m.amt, p.cur)); }
      bits.push(m.used + ' of ' + R.rpm + ' revisions used');
      /* the deliverables with where each stands (solo: the status set in Scope), and how many are done */
      var done = 0, known = 0, its = it.map(function (x) { var u = wkUnit(p, x.id), s = u ? wkShow(u) : ''; if (u) { known++; if (s === 'done') done++; } return '<li' + (s ? ' class="' + s + '"' : '') + '><i class="dl-dot" aria-hidden="true"></i><span>' + esc(x.t) + (s ? '<span class="sr-only"> · ' + esc(WK_NM[s]) + '</span>' : '') + (x.ok ? '<small>Done when: ' + esc(x.ok) + '</small>' : x.cr && m.st !== 'accepted' ? '<small class="dl-warn">No “Done when” line yet</small>' : '') + '</span></li>'; }).join('');
      var itHTML = it.length ? (known && m.st !== 'accepted' ? '<div class="dl-itp"><span>' + esc(done + ' of ' + it.length + ' done') + '</span><i class="ag-gbar" aria-hidden="true"><i style="width:' + Math.round(done / it.length * 100) + '%"></i></i></div>' : '') + '<ul class="dl-it">' + its + '</ul>' : '';
      var tlHTML = lines.length ? '<ul class="dl-tl">' + lines.join('') + '</ul>' : '';
      /* an accepted milestone folds to its header; what was delivered, checked and said opens on demand */
      var body = m.st === 'accepted' ? '<details class="dl-more"><summary>' + esc(m.cap ? 'What was delivered and checked' : 'What was delivered') + '</summary>' + itHTML + tlHTML + '</details>' : itHTML + tlHTML;
      return '<li class="dl-m" data-st="' + m.st + '"><div class="dl-mh"><span class="dl-n" aria-hidden="true">' + (m.st === 'accepted' ? IC('tick') : j + 1) + '</span><div class="dl-mt"><b>' + esc(m.t) + '</b><small class="dl-bits">' + bits.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('') + '</small>' + dlShift(p, M, m) + '</div>' + chip + '</div>' +
        body + (form || (acts ? '<div class="pd-s-acts">' + acts + '</div>' : '')) + sim + '</li>';
    }).join('');
    return '<section class="card pd-card" aria-labelledby="pd-h-dms"><div class="card-h ruled"><div><h3 id="pd-h-dms">Milestones</h3><p>' + esc('Dates move with approved changes, late items from ' + g + ' and pauses.') + '</p></div></div><ol class="dl-ms">' + rows + '</ol></section>';
  }
  function dlInsCard(p, M) {
    var g = agG(p);
    if (!M.ins.length) return '<section class="card pd-card" aria-labelledby="pd-h-din"><div class="card-h ruled"><div><h3 id="pd-h-din">' + esc(g) + ' provides</h3><p>Nothing is listed in the approved Scope.</p></div></div></section>';
    var rows = M.ins.map(function (n) {
      var chip = n.got ? '<span class="chip ok">Received ' + esc(agDay(n.got.ts)) + '</span>' : n.sent ? '<span class="chip">Sent ' + esc(agDay(n.sent.ts)) + '</span>' : n.st === 'late' ? '<span class="chip crit">Late ' + agDaysW(n.late) + '</span>' : n.st === 'due' ? '<span class="chip warn">Due soon</span>' : '<span class="chip quiet">Not yet</span>';
      var lateTx = n.late && (n.got || n.sent) ? '<small class="dl-late">' + agDaysW(n.late) + ' late: later dates moved by that much</small>' : n.st === 'late' ? '<small class="dl-late">Dates after it move a day for each day it is late</small>' : '';
      var acts = (smCan.got(M, n.id) ? '<button type="button" class="btn-ghost btn-sm" data-pd="dl:got" data-m="' + n.id + '">Received</button>' : '') + (PD_DEV && !syLive(p) && smCan.sent(M, n.id) ? '<button type="button" class="link" data-pd="dl:sim" data-k="sent" data-m="' + n.id + '">Sent as ' + esc(g) + '</button>' : '');
      return '<li class="dl-in"><div><b>' + esc(n.t) + '</b><small>Needed by ' + esc(smIsoLbl(n.due, true)) + (n.sent && n.sent.tx ? ' · “' + esc(n.sent.tx) + '”' : '') + '</small>' + lateTx + '</div><div class="dl-in-r">' + chip + acts + '</div></li>';
    }).join('');
    return '<section class="card pd-card" aria-labelledby="pd-h-din"><div class="card-h ruled"><div><h3 id="pd-h-din">' + esc(g) + ' provides</h3><p>Late items move the dates after them.</p></div></div><ul class="dl-ins">' + rows + '</ul></section>';
  }
  /* v106 (CONTRACT 63): what is handed over. Nothing is locked: a line can be handed over before its milestone is accepted, which
     the card says; the client says when they have it */
  /* v107 (CONTRACT 64): the warranty and the problems reported after acceptance. Fixed takes how and a link (the release it is
     in); Not covered takes why, and offers a change request for it */
  function dlWaCard(p, M) {
    var acc = M.ms.some(function (m) { return m.st === 'accepted'; }); if (!M.wa && !(M.bugs || []).length && !acc) return '';
    var g = agG(p), w = M.wa;
    var head = !w ? 'The agreement has no warranty: you decide on each problem.' : !w.start ? w.t + '. ' + w.days + ' days from when the last milestone is accepted.' : w.on ? w.t + '. Until ' + agDay(w.ends) + '.' : w.t + '. It ended ' + agDay(w.ends) + '.';
    var rows = (M.bugs || []).slice().reverse().map(function (b) {
      var m = smMs(M, b.m), st = b.st === 'confirmed' ? '<span class="chip ok">' + esc(g + ' confirmed the fix') + '</span>' : b.st === 'fixed' ? '<span class="chip warn">' + esc('Fixed, waiting for ' + g) + '</span>' : b.st === 'notbug' ? '<span class="chip neutral">Not covered</span>' : '<span class="chip ' + (b.covered ? 'crit' : 'warn') + '">' + (b.covered ? 'Covered: to fix' : 'After the warranty') + '</span>';
      var said = b.ans ? '<small>' + esc((b.st === 'notbug' ? 'Not covered: ' : 'Fixed: ') + (b.ans.tx || '')) + (b.ans.link ? ' ' + esc(b.ans.link) : '') + '</small>' : '';
      var form = pd.dl === 'fix:' + b.i ? '<form class="prv-f dl-f" data-pd-form="dl:fixed" data-b="' + b.i + '" novalidate><div class="fld"><label for="dl-fx">What you fixed <span class="opt">Optional</span></label><textarea id="dl-fx" name="tx" rows="2" maxlength="2000"></textarea></div><div class="fld"><label for="dl-fl">The release it is in <span class="opt">Optional link</span></label><input id="dl-fl" name="link" maxlength="300" placeholder="https://…" autocomplete="off"></div>' +
          '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Fixed</button></div><span class="err" role="alert"></span></form>'
        : pd.dl === 'nobug:' + b.i ? '<form class="prv-f dl-f" data-pd-form="dl:notbug" data-b="' + b.i + '" novalidate><div class="fld"><label for="dl-nb">Why it is not covered</label><textarea id="dl-nb" name="tx" rows="2" maxlength="2000" placeholder="For example: this is new work, not something the agreement promised"></textarea></div>' +
          '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Not covered</button></div><span class="err" role="alert"></span></form>' : '';
      var acts = form ? '' : (smCan.fixed(M, b.i) ? '<button type="button" class="link" data-pd="dl:fix" data-b="' + b.i + '">' + (b.st === 'fixed' ? 'Fixed again' : 'Fixed') + '</button>' : '') + (smCan.notbug(M, b.i) ? '<button type="button" class="link" data-pd="dl:nobug" data-b="' + b.i + '">Not covered</button>' : '') + (b.st === 'notbug' ? (function () { var dc = (p.crs || []).filter(function (x) { return x.entries[0] && x.entries[0].bug === b.i; })[0]; return dc ? '<button type="button" class="link" data-pd="tocr" data-cr="' + dc.id + '">Disputed: ' + dc.id + '</button>' : '<button type="button" class="link" data-pd="dl:bugcr" data-b="' + b.i + '">Open a change request</button>'; })() : '');   // v108 (65)
      return '<li class="dl-pay"><div><b>' + esc(b.e.tx) + '</b><small>' + esc((m ? m.t : '') + ' · ' + agDay(b.e.ts) + (b.covered ? '' : w ? ' · after the warranty' : '')) + '</small>' + cpHTML(b.e.pics) + said + form + '</div><div class="dl-pay-r">' + st + acts + '</div></li>';
    }).join('');
    /* v116: with no problem reported, the warranty is one line: how long, from when, and that nothing is open */
    if (!rows) {
      var wl = !w ? '' : !w.start ? agDaysW(w.days) : w.on ? 'Until ' + agDay(w.ends) : 'Ended ' + agDay(w.ends);
      return '<section class="card pd-card" aria-labelledby="pd-h-dwa"><div class="card-h ruled"><div><h3 id="pd-h-dwa">Warranty</h3><p>' + esc(w ? w.t : 'The agreement has no warranty: you decide on each problem.') + '</p></div></div><div class="dl-wa1">' + (wl ? '<b>' + esc(wl) + '</b>' : '') + (w && !w.start ? '<span>' + esc('Starts when the last milestone is accepted') + '</span>' : '') + '<span>' + esc('No problems reported') + '</span></div></section>';
    }
    return '<section class="card pd-card" aria-labelledby="pd-h-dwa"><div class="card-h ruled"><div><h3 id="pd-h-dwa">Warranty</h3><p>' + esc(head) + '</p></div></div><ul class="dl-pays">' + rows + '</ul>' +
      '<p class="pd-note ag-out">' + IC('shield') + esc('A problem in what the agreement promised is fixed, not quoted. Something new is a change request.') + '</p></section>';
  }
  function dlHoCard(p, M) {
    if (!(M.ho || []).length) return '';
    var g = agG(p), R = M.rules;
    /* v116: when every line goes with the same milestone, the card says it once instead of on each line */
    var one = M.ho.every(function (h) { return h.m === M.ho[0].m; }) ? smMs(M, M.ho[0].m) : null;
    var rows = M.ho.map(function (h) {
      var m = smMs(M, h.m), st = h.recv ? '<span class="chip ok">' + esc(g + ' received it ' + agDay(h.recv.ts)) + '</span>' : h.gave ? '<span class="chip warn">' + esc('Handed over ' + agDay(h.gave.ts) + ', waiting for ' + g) + '</span>' : one ? '' : '<span class="chip neutral">' + esc('With ' + (m ? m.t : 'the last milestone')) + '</span>';
      var said = h.gave ? '<small>' + esc(h.gave.tx || '') + (h.gave.link ? ' ' + h.gave.link : '') + '</small>' : '';
      var early = m && m.st !== 'accepted' ? '<p class="pd-hint">' + esc(m.t + ' is not accepted yet. Handing it over early is your call; ScopeDue locks nothing.') + '</p>' : '';
      var form = pd.dl === 'gave:' + h.id ? '<form class="prv-f dl-f" data-pd-form="dl:gave" data-k="' + esc(h.id) + '" novalidate><div class="fld"><label for="dl-gv">How you handed it over <span class="opt">Optional</span></label><textarea id="dl-gv" name="tx" rows="2" maxlength="2000" placeholder="For example: ownership of the repository moved to Linh"></textarea></div><div class="fld"><label for="dl-gl">Link <span class="opt">Optional</span></label><input id="dl-gl" name="link" maxlength="300" placeholder="https://…" autocomplete="off"></div>' + early +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Mark handed over</button></div><span class="err" role="alert"></span></form>' : '';
      var act = !form && smCan.gave(M, h.id) ? '<button type="button" class="link" data-pd="dl:gave" data-k="' + esc(h.id) + '">' + (h.gave ? 'Hand over again' : 'Mark handed over') + '</button>' : '';
      return '<li class="dl-pay"><div><b>' + esc(h.t) + '</b>' + said + form + '</div><div class="dl-pay-r">' + st + act + '</div></li>';
    }).join('');
    return '<section class="card pd-card" aria-labelledby="pd-h-dho"><div class="card-h ruled"><div><h3 id="pd-h-dho">What you hand over</h3><p>' + esc(one ? 'Goes with ' + one.t + '.' : 'What the Scope says you hand over, and whether ' + g + ' has it.') + '</p></div></div><ul class="dl-pays">' + rows + '</ul>' +
      (R.own ? '<p class="pd-note ag-out">' + IC('shield') + esc('The agreement says the work belongs to ' + g + ' once it is paid in full. ScopeDue does not hold anything back or lock it.') + '</p>' : '') + '</section>';
  }
  function dlPayCard(p, M) {
    var R = M.rules, now = Date.now(), g = agG(p);
    if (!M.sched.length) return '';
    var rows = M.sched.map(function (s) {
      var key = 'pay:' + (s.k === 'dep' ? 'dep' : s.id), due = s.due && s.due <= now, done = p.dis && p.dis[key];
      var when = s.k === 'dep' ? (s.due ? 'Due since ' + agDay(s.due) : 'Due at start') : s.k === 'cr' ? (s.with ? 'With ' + s.with + (s.due ? ', due ' + agDay(s.due) : '') : 'With the next milestone') : s.due ? 'Due ' + agDay(s.due) : 'Due ' + agDaysW(R.pd) + ' after it is accepted';
      /* v104 (60): what the client said about paying it, and the studio's answer */
      /* v116: their words as a quote under the line; that ScopeDue confirms nothing is said once, at the foot of the card */
      var rp = s.rep, said = !rp ? '' : rp.ty === 'paid' ? '<small class="dl-rep">' + esc(g + ' says they paid it ' + agDay(rp.e.ts)) + '</small>' + (rp.e.tx ? '<q class="dl-q">' + esc(rp.e.tx) + '</q>' : '') : '<small class="dl-rep">' + esc('You told ' + g + ' you have not received it yet') + '</small><q class="dl-q">' + esc(rp.e.tx) + '</q>';
      var np = rp && rp.ty === 'paid' && !done ? (pd.dl === 'nopay:' + s.key ? dlNopayForm(p, s, g) : '<button type="button" class="btn-ghost btn-sm dl-np" data-pd="dl:nopay" data-k="' + esc(s.key) + '">Not received yet</button>') : '';
      return '<li class="dl-pay' + (due && !done ? ' due' : '') + '"><div><b>' + esc(s.t) + '</b><small>' + esc(when) + '</small>' + said + np + '</div><div class="dl-pay-r"><b>' + (s.pct ? s.pct + '%' : '') + (s.amt != null && M.price != null || s.k === 'cr' ? (s.pct ? ' · ' : '') + esc(pdMoney(s.amt, p.cur)) : '') + '</b>' + (due ? (done ? '<small>Handled</small>' : '<button type="button" class="link" data-pd="dl:paydone" data-k="' + key + '">Mark handled</button>') : '') + '</div></li>';
    }).join('');
    /* v116: the whole schedule in three figures and one bar: what it adds up to, what is due by now, what the client says they paid */
    var tot = 0, dueS = 0, saidS = 0, segs = '';
    M.sched.forEach(function (s) { if (s.amt != null) tot += s.amt; });
    M.sched.forEach(function (s) {
      if (s.amt == null || !tot) return;
      var d = s.due && s.due <= now, pa = s.rep && s.rep.ty === 'paid';
      if (d) dueS += s.amt; if (pa) saidS += s.amt;
      segs += '<i class="' + (pa ? 'paid' : d ? 'due' : '') + '" style="flex-grow:' + s.amt + '" title="' + esc(s.t + ' · ' + pdMoney(s.amt, p.cur)) + '"></i>';
    });
    var sum = tot ? '<div class="dl-ptot"><div><b>' + esc(pdMoney(tot, p.cur)) + '</b><small>in the schedule</small></div><div><b>' + esc(pdMoney(dueS, p.cur)) + '</b><small>due so far</small></div><div><b>' + esc(pdMoney(saidS, p.cur)) + '</b><small>' + esc(g + ' says paid') + '</small></div><span class="dl-pbar" aria-hidden="true">' + segs + '</span></div>' : '';
    return '<section class="card pd-card" aria-labelledby="pd-h-dpay"><div class="card-h ruled"><div><h3 id="pd-h-dpay">Payment schedule</h3><p>What the agreement says is due, and from when.</p></div></div>' + sum + '<ul class="dl-pays">' + rows + '</ul><p class="pd-note ag-out">' + IC('shield') + 'Payments happen outside ScopeDue, which confirms none of them. “Mark handled” only quiets the reminder on this device.</p></section>';
  }

  /* v103 (CONTRACT 61): the capsule of the latest delivery and the last answer on each step */
  function dlCapHTML(p, m, g) {
    var c = m.cap, done = c.res.filter(Boolean).length;
    return '<li class="cap">' + IC('tick') + '<span><b>What to check' + (c.b ? ' · ' + esc(c.b) : '') + '</b><small>' + done + ' of ' + c.steps.length + ' checked by ' + esc(g) + '</small><ol class="dl-cap">' + c.steps.map(function (t, i) {
      var x = c.res[i], st = !x ? '<span class="chip neutral">Not checked yet</span>' : x.ok ? '<span class="dl-cw">' + IC('tick') + '<span>Works</span></span>' : '<span class="chip warn">An issue</span>';
      return '<li><span class="dl-cap-t">' + esc(t) + '</span>' + st + (x && !x.ok ? '<small>' + esc(x.e.tx) + '</small>' + cpHTML(x.e.pics) : '') + '</li>';
    }).join('') + '</ol></span></li>';
  }
  /* ---- writing on the delivery record ---- */
  function dlWrite(p, e, btn, ok, fail) {
    var M = agM(p); if (!M.gov) return fail('There is no approved agreement yet.');
    p.mev = p.mev || [];
    e.v = M.gov.v; e.at = pdStamp(); e.ts = Date.now(); e.m = e.m || ''; e.tx = e.tx || ''; e.link = e.link || ''; e.k = e.k || '';
    var k = syStatus(p).k;
    if (k === 'portal') {
      if (btn) syBusy(btn, true, 'Saving…');
      syGateMev(p, e, function () { if (btn) syBusy(btn, false); dlLanded(p, e); ok(); }, function (m) { if (btn) syBusy(btn, false); fail(m); });
      return;
    }
    if (k === 'blocked' && syLive(p)) return fail(syStatus(p).why);
    e.i = p.mev.length; p.mev.push(e); dlLanded(p, e); agChain(p); ok();
  }
  function dlLanded(p, e) {
    var cl = byId(p.cid) || {}, M = agM(p), t = e.m ? (smMs(M, e.m) || smIn(M, e.m) || { t: '' }).t : '';
    pdTouch(p);
    pdLogClient(cl, e.w === 'y' ? 'you' : 'client', smEvText(e, M, { studio: 'You', client: agG(p) }).replace(/^You (\w)/, function (a, b) { return 'You ' + b; }), 'Delivery');
    pdAfterChange(p);
  }
  /* v104 (CONTRACT 60): Not received yet, on a line the client said they paid */
  function dlNopayForm(p, s, g) {
    return '<form class="prv-f dl-f" data-pd-form="dl:nopay" data-k="' + esc(s.key) + '" novalidate><div class="fld"><label for="dl-np">What you see on your side</label><textarea id="dl-np" name="tx" rows="2" maxlength="500" placeholder="For example: nothing on the account yet, as of this morning"></textarea></div>' +
      '<p class="pd-hint">' + esc(g) + ' sees it on the portal and can say again that they paid. Nothing else changes.</p><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="dl:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Not received yet</button></div><span class="err" role="alert"></span></form>';
  }
  function dlAct(act, a) {
    var p = pd.p, m = a.getAttribute('data-m') || '', M = agM(p), g = agG(p);
    if (act === 'deliver') { pd.dl = 'deliver:' + m; pdRerender('#dl-lk'); }
    else if (act === 'cancel') { var was = pd.dl; pd.dl = null; pdRerender(was && was.indexOf('deliver:') === 0 ? '[data-pd="dl:deliver"][data-m="' + was.slice(8) + '"]' : '[data-pd="dl:pause"]'); }
    else if (act === 'pause') { pd.dl = 'pause'; pd.dlk = pd.dlk || 'silence'; pdRerender('#dl-pw'); }
    else if (act === 'close') { pd.dl = 'close'; pdRerender('#dl-cw'); }
    else if (act === 'resume') dlWrite(p, { w: 'y', ty: 'resume' }, a, function () { pdRerender(); showToast(M.cl ? 'Project reopened. ' + g + ' is told.' : 'Work resumed. ' + g + ' is told.'); }, function (msg) { showToast(msg); });
    else if (act === 'got') dlWrite(p, { w: 'y', ty: 'got', m: m }, a, function () { pdRerender(); showToast('Marked received'); }, function (msg) { showToast(msg); });
    else if (act === 'record') agRecordOpen(p, a);
    else if (act === 'nopay') { pd.dl = 'nopay:' + a.getAttribute('data-k'); pdRerender('#dl-np'); }
    else if (act === 'gave') { pd.dl = 'gave:' + a.getAttribute('data-k'); pdRerender('#dl-gv'); }   // v106 (63)
    else if (act === 'fix') { pd.dl = 'fix:' + a.getAttribute('data-b'); pdRerender('#dl-fx'); }   // v107 (64)
    else if (act === 'nobug') { pd.dl = 'nobug:' + a.getAttribute('data-b'); pdRerender('#dl-nb'); }
    else if (act === 'bugcr') { var bb = smBug(M, +a.getAttribute('data-b')); crPrefill = { t: prvT(bb ? bb.e.tx : 'A change', 80), d: (bb ? bb.e.tx : '') + (bb && bb.ans ? '\n\n' + sdT('Not covered') + ': ' + bb.ans.tx : '')   /* v128 (104): in the words the studio writes in, as it becomes theirs */, m: bb ? bb.m : '' }; openDrawer('cr', a); }
    else if (act === 'paydone') { p.dis = p.dis || {}; var key = a.getAttribute('data-k'); p.dis[key] = Date.now();   /* v104 (60): when, so a report that comes after it still shows */ pdTouch(p); pdAfterChange(p); pdRerender(); showToast('Reminder quieted on this device', function () { delete p.dis[key]; pdAfterChange(p); undone(p, 'delivery'); }); }
    else if (act === 'redate') { var ms = smMs(M, m); crPrefill = { t: 'New date for ' + (ms ? ms.t : 'a milestone'), d: 'A new date for ' + (ms ? ms.t : 'this milestone') + ', agreed with ' + g + '.', m: m }; openDrawer('cr', a); }
    else if (act === 'sim') {
      if (syLive(p)) return;
      var k = a.getAttribute('data-k'), e = { w: 'c', ty: k, m: m };
      if (k === 'accept') e.rec = { by: (byId(p.cid) || {}).contact || g, via: 'email code', at: Date.now(), ip: pdIp('sim' + Date.now()), fp: '' }, e.tx = 'Accepted.';
      if (k === 'changes') e.tx = 'Simulated: a few small changes, please.';
      if (k === 'notmet') { var okI = smItemsOf(M.gov, m).filter(function (x) { return x.ok; })[0]; e.k = okI ? okI.id : ''; e.tx = 'Simulated: this does not meet the Done when line.'; }
      dlWrite(p, e, null, function () { pdRerender(); showToast(g + ' ' + SM_EVW[k] + ' (simulated)'); }, function (msg) { showToast(msg); });
    }
  }
  function dlDeliver(p, e, f, ms, g, drv) {
    var bad = function (msg) { var err = f.querySelector('.err'); err.textContent = msg; f.setAttribute('data-err', ''); };
    dlWrite(p, e, f.querySelector('button[type="submit"]'), function () {
      if (drv) { p.dlf = p.dlf || {}; p.dlf[e.m] = drv; pdAfterChange(p); }   /* v137 (117): the version delivered, to see later whether the file moved on */
      pd.dl = null; pdRerender('[data-pd="dl:record"]'); showToast((ms ? ms.t : 'Milestone') + ' delivered. ' + g + ' has ' + agM(p).rules.review + ' business days to answer.');
    }, function (msg) { bad(msg); });
  }
  /* ---- v137 (117): a Google Drive file delivered as the link ----
     ScopeDue reads Drive with drive.file: the files it made or that someone picked, which is every file in the project's folder. When
     the link is such a file, the delivery's note says its version and when it was last edited (in the client's language), so the
     event's hash holds which version was delivered and the portal shows it. This device keeps { fid, v, mt, ts } in p.dlf[milestone]
     and reads the file again when the Delivery tab is drawn (at most once a minute): a later version is said to the studio, with the
     version the client reviewed or accepted. The portal cannot read the studio's Drive, so it is never told by itself. */
  var DL_DRV;   // fid -> { v, mt, n, at }: what this device last read, kept in memory only
  function dlDrvC() { return DL_DRV || (DL_DRV = {}); }
  if (sdTest()) window.__dlDrv = { forget: function () { DL_DRV = {}; }, id: function (l) { return dlDrvId(l); } };
  function dlDrvId(link) { link = String(link || ''); if (!/^https:\/\/(?:docs|drive)\.google\.com\//.test(link) || /\/folders\//.test(link)) return ''; var m = /\/d\/([A-Za-z0-9_-]{20,})/.exec(link) || /[?&]id=([A-Za-z0-9_-]{20,})/.exec(link); return m ? m[1] : ''; }
  function dlDrvOn() { try { return DR.st === 'on'; } catch (e) { return false; } }
  function dlDrvRead(fid) {
    return drvMeta(fid).then(function (r) {
      if (!r || !r.ok || !r.data || r.data.trashed) return null;
      var o = { v: +r.data.version || 0, mt: Date.parse(r.data.modifiedTime) || 0, n: String(r.data.name || ''), at: Date.now() };
      dlDrvC()[fid] = o; return o;
    });
  }
  function dlDrvIso(t) { var d = new Date(t), z = function (n) { return ('0' + n).slice(-2); }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()) + ' ' + z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()); }
  function dlDrvSays(p, o) { return sdTo(clLang(byId(p.cid) || {}), 'File as delivered: Google Drive version ' + o.v + ', last edited ' + dlDrvIso(o.mt) + ' UTC.'); }
  /* the file of a milestone's latest delivery, when it is the one whose version was kept, and a later version this device has read;
     reads it again in the background when the last read is over a minute old */
  function dlDrvChanged(p, m) {
    var kept = p.dlf && p.dlf[m.id], last = m.last;
    if (!kept || !last || dlDrvId(last.link) !== kept.fid || last.ts < kept.ts - 3e5) return null;
    var now = dlDrvC()[kept.fid];
    if (dlDrvOn() && (!now || Date.now() - now.at > 6e4)) {
      if (!now) dlDrvC()[kept.fid] = now = { v: kept.v, mt: kept.mt, n: '', at: Date.now() }; else now.at = Date.now();
      var was = now.v;
      dlDrvRead(kept.fid).then(function (o) { if (o && o.v !== was && curView === 'project' && pd.p === p && pd.tab === 'delivery' && !pd.dl) pdRerender(); }, function () {});
    }
    return now && now.v > kept.v ? { kept: kept, now: now } : null;
  }
  function dlDrvHTML(p, m, g, c, canDeliver) {
    return '<li class="c">' + IC('edit') + '<span><b>The file changed after you delivered it</b>' +
      '<small>' + esc('Google Drive version ' + c.now.v + ', edited ' + dlDrvIso(c.now.mt) + ' UTC.') + '</small>' +
      '<small>' + esc((m.st === 'accepted' ? g + ' accepted version ' : g + ' was sent version ') + c.kept.v + '.') + '</small>' +
      (m.st === 'accepted' ? '<small>Drive keeps the earlier versions in its version history.</small>' : canDeliver ? '<small>' + esc('Deliver again if ' + g + ' should review the change.') + '</small>' :
        '<small>' + esc('Tell ' + g + ' if they should review the new version.') + '</small>') + '</span></li>';   /* in review, a delivery waits for the answer (19.3) */
  }
  function dlSubmit(k, f) {
    var p = pd.p, g = agG(p), err = f.querySelector('.err'), bad = function (m, el) { err.textContent = m; f.setAttribute('data-err', ''); if (el) el.focus(); };
    if (k === 'deliver') {
      var m = f.getAttribute('data-m'), link = f.elements.link.value.trim(), tx = f.elements.tx.value.trim(), ms = smMs(agM(p), m);
      if (link && !/^https?:\/\/\S{3,}$/i.test(link)) return bad('A link starts with https://', f.elements.link);
      /* v103 (61): a capsule: the build and the steps to check; its fingerprint is the event's k */
      var bv = f.elements.b.value.trim(), steps = f.elements.steps.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (steps.length > 5) return bad('Up to 5 steps. Keep the ones that matter most.', f.elements.steps);
      if (steps.some(function (x) { return x.length < 2 || x.length > 160; })) return bad('Each step is a short line, at most 160 characters.', f.elements.steps);
      if (bv && !steps.length) return bad('Add what to check with this build, or leave the build out.', f.elements.steps);
      var dlE = { w: 'y', ty: 'deliver', m: m, link: link, tx: tx }, drv = null;
      var go = function () {
        if (steps.length) { dlE.cap = { b: bv, steps: steps }; return pdSha(smCapRaw(dlE.cap), function (h) { dlE.k = 'c' + h.slice(0, 12); dlDeliver(p, dlE, f, ms, g, drv); }); }
        dlDeliver(p, dlE, f, ms, g, drv);
      };
      /* v137 (117): a Google Drive file of the project goes with its version, said in the note, so the chain holds which one it was */
      var fid = dlDrvId(link);
      if (fid && dlDrvOn()) {
        var sb = f.querySelector('button[type="submit"]'); syBusy(sb, true, 'Reading the file…');
        dlDrvRead(fid).then(function (o) {
          syBusy(sb, false);
          if (o && o.v) { var ln = dlDrvSays(p, o); if (tx.length + ln.length + 2 <= 2000) { dlE.tx = (tx ? tx + '\n\n' : '') + ln; drv = { fid: fid, v: o.v, mt: o.mt, ts: Date.now() }; } }
          go();
        }, function () { syBusy(sb, false); go(); });
        return;
      }
      go(); return;
    } else if (k === 'fixed' || k === 'notbug') {   // v107 (64)
      var bi = +f.getAttribute('data-b'), bg = smBug(agM(p), bi), bt = f.elements.tx.value.trim(), bl = f.elements.link ? f.elements.link.value.trim() : '';
      if (!bg) return bad('This problem is not on the record any more.');
      if (k === 'notbug' && bt.length < 2) return bad('Say why it is not covered. ' + g + ' sees it.', f.elements.tx);
      if (bl && !/^https?:\/\/\S{3,}$/i.test(bl)) return bad('A link starts with https://', f.elements.link);
      dlWrite(p, { w: 'y', ty: k, m: bg.m, k: 'b' + bi, tx: bt, link: bl }, f.querySelector('button[type="submit"]'), function () { pd.dl = null; pdRerender(); showToast(k === 'fixed' ? g + ' is told it is fixed, and asked to check it.' : g + ' is told it is not covered, and why.'); }, function (msg) { bad(msg); });
    } else if (k === 'gave') {
      var hk = f.getAttribute('data-k'), hl = f.elements.link.value.trim(), ht = f.elements.tx.value.trim(), hh = smHo(agM(p), hk);
      if (hl && !/^https?:\/\/\S{3,}$/i.test(hl)) return bad('A link starts with https://', f.elements.link);
      dlWrite(p, { w: 'y', ty: 'gave', m: hk, tx: ht, link: hl }, f.querySelector('button[type="submit"]'), function () { pd.dl = null; pdRerender(); showToast((hh ? hh.t : 'It') + ' is marked handed over. ' + g + ' is told.'); }, function (msg) { bad(msg); });
    } else if (k === 'nopay') {
      var nk = f.getAttribute('data-k'), nt = f.elements.tx.value.trim(); if (nt.length < 2) return bad('Say what you see on your side. ' + g + ' sees it.', f.elements.tx);
      dlWrite(p, { w: 'y', ty: 'nopay', m: nk, tx: nt }, f.querySelector('button[type="submit"]'), function () { pd.dl = null; pdRerender(); showToast(g + ' is told you have not received it yet.'); }, function (msg) { bad(msg); });
    } else if (k === 'pause') {
      var why = f.elements.tx.value.trim(); if (why.length < 4) return bad('Say why the work is paused. ' + g + ' sees it.', f.elements.tx);
      dlWrite(p, { w: 'y', ty: 'pause', k: pd.dlk || 'silence', tx: why }, f.querySelector('button[type="submit"]'), function () { pd.dl = null; pdRerender('[data-pd="dl:resume"]'); showToast('Work paused. ' + g + ' is told, and dates move while it is paused.'); }, function (msg) { bad(msg); });
    } else if (k === 'close') {
      var cw = f.elements.tx.value.trim(); if (cw.length < 4) return bad('Say why the project is closed.', f.elements.tx);
      dlWrite(p, { w: 'y', ty: 'close', tx: cw }, f.querySelector('button[type="submit"]'), function () { pd.dl = null; pdRerender(); showToast('Project closed. The record stays.'); }, function (msg) { bad(msg); });
    }
  }

  /* ---- what needs you, on a project with an agreement ---- */
  function agNeeds(p) {
    var out = [], M = agM(p), g = agG(p), now = Date.now(); if (!M.gov) return out;
    var R = M.rules;
    if (M.cl && M.cl.by === 'c') return [{ t: g + ' ended the project', chip: 'crit', chipT: 'Ended', tab: 'delivery', p: (M.cl.e.tx ? '“' + M.cl.e.tx + '” ' : '') + 'The record shows the milestone that was not delivered after notice.' }];
    if (M.cl) return out;
    M.ms.forEach(function (m) {
      if (m.st === 'notdelivered') out.push({ t: m.t + ' was not delivered after notice', chip: 'crit', chipT: 'Notice ended', tab: 'delivery', p: g + ' can end the project now. Deliver it, or agree a new date with a change request.' });
      else if (m.st === 'late' && m.notice && m.notice.open) out.push({ t: g + ' flagged ' + m.t + ' as missed', chip: 'crit', chipT: 'Fix by ' + agDay(m.notice.ends), tab: 'delivery', p: 'Deliver it, or agree a new date with a change request, by ' + agWhen(m.notice.ends) + '.' });
      else if (m.st === 'late') out.push({ t: m.t + ' is ' + agDaysW(m.late) + ' late', chip: 'crit', chipT: 'Late', tab: 'delivery', p: 'It was due ' + smIsoLbl(m.eff) + '. Deliver it, or agree a new date with ' + g + '.' });
      else if (m.st === 'review' && m.cap && m.cap.res.some(function (x) { return x && !x.ok; })) { var iss = m.cap.res.filter(function (x) { return x && !x.ok; }); out.push({ t: g + ' reported an issue on ' + m.t, chip: 'warn', chipT: iss.length === 1 ? 'An issue' : iss.length + ' issues', tab: 'delivery', p: iss[0].e.tx }); }   // v103 (61)
      else if (m.st === 'back' && m.resp) out.push(m.resp.ty === 'notmet' ? { t: g + ' says ' + m.t + ' is not as agreed', chip: 'crit', chipT: 'Fix by ' + agDay(m.notice ? m.notice.ends : now), tab: 'delivery', p: m.resp.tx } : { t: g + ' asked for changes on ' + m.t, chip: 'warn', chipT: m.used + ' of ' + R.rpm + ' rounds', tab: 'delivery', p: m.resp.tx });
      else if (m.st === 'upcoming' && m.effEnd - now < 2 * 864e5 && !M.pz) out.push({ t: m.t + ' is due ' + smIsoLbl(m.eff, true), chip: 'warn', chipT: 'Due soon', tab: 'delivery', p: 'Deliver it from the Delivery tab. ' + g + ' then has ' + R.review + ' business days to answer.' });
    });
    M.ins.forEach(function (n) { if (n.st === 'late') out.push({ t: n.t + ' from ' + g + ' is ' + agDaysW(n.late) + ' late', chip: 'warn', chipT: 'Client late', tab: 'delivery', p: 'Later milestones move a day for each day it is late. Mark it received when it arrives.' }); });
    if (!M.pz && M.silent >= R.silence) out.push({ t: g + ' has not replied for ' + M.silent + ' business days', chip: 'warn', chipT: 'Silent', tab: 'delivery', p: 'The agreement lets you pause the work. Dates move by the days paused.' });
    if (M.pz && smCan.close(M)) out.push({ t: 'Paused for ' + agDaysW(smCeilDays(now - M.pz.ts)), tab: 'delivery', p: 'The agreement lets you close it as dormant, or resume when ' + g + ' is back.' });
    (M.bugs || []).forEach(function (b) { if (b.st !== 'open') return; out.push({ t: g + ' reported a problem in ' + (smMs(M, b.m) || { t: '' }).t, chip: b.covered ? 'crit' : 'warn', chipT: b.covered ? 'Warranty' : 'After warranty', tab: 'delivery', p: prvT(b.e.tx, 120) }); });   // v107 (64)
    M.ms.forEach(function (m) {   // v137 (117)
      var c = dlDrvChanged(p, m); if (!c) return;
      out.push({ t: 'The file for ' + m.t + ' changed after you delivered it', chip: 'warn', chipT: 'File changed', tab: 'delivery', p: (m.st === 'accepted' ? g + ' accepted version ' + c.kept.v + '.' : g + ' was sent version ' + c.kept.v + '.') + ' Google Drive is now at version ' + c.now.v + '.' });
    });
    (M.ho || []).forEach(function (h) { var hm = smMs(M, h.m); if (hm && hm.st === 'accepted' && !h.gave) out.push({ t: 'Hand over ' + h.t, chip: 'warn', chipT: 'Handoff', tab: 'delivery', p: hm.t + ' is accepted. Mark it handed over when ' + g + ' has it.' }); });   // v106 (63)
    M.sched.forEach(function (s) {
      var key = 'pay:' + (s.k === 'dep' ? 'dep' : s.id);
      if (s.rep && s.rep.ty === 'paid' && !(p.dis && +p.dis[key] > s.rep.e.ts)) { out.push({ t: g + ' says they paid ' + smPayName(M, s.key), chip: 'neutral', chipT: 'Not confirmed', tab: 'delivery', p: (s.rep.e.tx ? '“' + s.rep.e.tx + '” ' : '') + 'ScopeDue does not check payments: confirm it where you receive them, then mark it handled.' }); return; }   // v104 (60)
      if (s.due && s.due <= now && !(p.dis && p.dis[key]) && s.k !== 'cr') out.push({ t: (s.k === 'dep' ? 'The share due at start' : s.t + '’s share') + (M.price != null ? ' (' + pdMoney(s.amt, p.cur) + ')' : '') + ' is due', chip: 'warn', chipT: 'Payment', tab: 'delivery', p: 'Due since ' + agDay(s.due) + ', as agreed. If it is not paid, the agreement lets you pause the work. Mark it handled to quiet this.' });
    });
    return out;
  }

  /* ---- Overview: the agreement at a glance (replaces Protection on a project with an agreement) ---- */
  function agProtCard(p) {
    var M = agM(p), g = agG(p), l = pdLatest(p), chip, rows = [];
    if (!M.gov) return pdProtCard(p);
    var acc = M.ms.filter(function (m) { return m.st === 'accepted'; }).length, cur = M.ms[M.cur], late = M.ins.filter(function (n) { return n.st === 'late'; }).length, bad = M.ms.some(function (m) { return m.st === 'late' || m.st === 'notdelivered'; });
    chip = M.cl ? '<span class="chip neutral">Closed</span>' : M.pz ? '<span class="chip warn">Paused</span>' : bad ? '<span class="chip crit">Late</span>' : l && !l.appr ? '<span class="chip">Awaiting ' + esc(g) + '</span>' : '<span class="chip ok">Protected</span>';
    rows.push(['Agreement', 'Scope v' + M.gov.v + ' approved' + (l && l !== M.gov ? (l.appr ? '' : ' · v' + l.v + ' waits for ' + g) : ''), 'scope']);
    /* the milestone under way, and the agreed date when it moved, go on a second line: the count and the date stay easy to scan */
    var cs = cur ? (cur.st === 'late' || cur.st === 'notdelivered' ? 'crit' : cur.st === 'back' ? 'warn' : '') : '';
    rows.push(['Milestones', acc + ' of ' + M.ms.length + ' accepted', 'delivery', cur ? '<span>' + esc(cur.t) + '</span> · <span>' + esc(dlStText(p, cur)) + '</span>' : '', cs]);
    rows.push(['Expected delivery', smIsoLbl(M.expected, true), 'delivery', M.expected !== M.ms[M.ms.length - 1].base ? esc('agreed ' + smIsoLbl(M.ms[M.ms.length - 1].base)) : '']);
    if (M.ins.length) {   // what the client still owes, named on the second line when it is late
      var lt = M.ins.filter(function (n) { return n.st === 'late'; });
      rows.push([g + ' provides', M.ins.filter(function (n) { return n.got || n.sent; }).length + ' of ' + M.ins.length + ' in', 'delivery', lt.length === 1 ? '<span>' + esc(lt[0].t) + '</span> · <span>' + esc('late ' + agDaysW(lt[0].late)) + '</span>' : lt.length ? esc(lt.length + ' items late') : '', lt.length ? 'warn' : '']);
    }
    rows.push(['Included changes', M.inc.used + ' of ' + M.inc.total + ' used', 'change']);
    return '<section class="card pd-card" aria-labelledby="pd-h-prot"><div class="card-h ruled"><div><h3 id="pd-h-prot">Agreement</h3><p>What was agreed, and where delivery stands.</p></div><div class="h-actions">' + chip + '</div></div><dl class="ag-gl">' +
      rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd><button type="button" class="link" data-pd="goto" data-tab="' + r[2] + '">' + esc(r[1]) + '</button>' + (r[3] ? '<small class="ag-gl-s' + (r[4] ? ' ' + r[4] : '') + '">' + r[3] + '</small>' : '') + '</dd></div>'; }).join('') + '</dl></section>';
  }
  /* the header: milestones instead of hand-set phases */
  function agPhaseHTML(p) {
    var M = agM(p), n = M.ms.length, acc = M.ms.filter(function (m) { return m.st === 'accepted'; }).length, cur = M.ms[M.cur], t;
    if (!M.gov) { var dm = p.sc.items.filter(function (x) { return x.sec === 'tl' && !x.rm; }); n = dm.length || 1; t = 'Scoping'; acc = 0; }
    else t = M.cl ? (M.cl.by === 'c' ? 'Ended' : 'Closed') : M.pz ? 'Paused' : !cur ? 'Delivered' : cur.t;
    var ticks = ''; for (var i = 0; i < Math.min(n, 8); i++) ticks += '<i' + (i < acc ? ' class="on"' : '') + '></i>';
    return '<span class="pd-phase ag-ph" role="img" aria-label="' + esc(t + (M.gov ? ', ' + acc + ' of ' + n + ' milestones accepted' : '')) + '"><span class="ticks" style="--n:' + Math.min(n, 8) + '" aria-hidden="true">' + ticks + '</span><span>' + esc(t) + (M.gov ? '<em>' + acc + ' of ' + n + ' milestones accepted</em>' : '') + '</span></span>';
  }
  function agPhaseN(p) { var M = agM(p); if (!M.gov) return 1; if (M.ms.every(function (m) { return m.st === 'accepted'; })) return 5; return M.ms.some(function (m) { return m.st === 'review'; }) ? 4 : 3; }
  function agPhaseT(p) { var M = agM(p); if (!M.gov) return 'Scoping'; if (M.cl) return M.cl.by === 'c' ? 'Ended' : 'Closed'; if (M.pz) return 'Paused'; var c = M.ms[M.cur]; return c ? c.t : 'Delivered'; }
  /* one date: the project's deadline is the agreement's expected delivery */
  function agDerive(p) {
    if (!agV2(p)) return;
    var M = agM(p), iso = M.gov ? M.expected : '';
    if (!iso) { var dm = p.sc.items.filter(function (x) { return x.sec === 'tl' && !x.rm && smIsoOk(x.d); }); iso = dm.length ? dm[dm.length - 1].d : ''; }
    if (iso) { p.dueAt = agIsoMs(iso); p.due = dueInfo(p.dueAt); }
    var c = byId(p.cid), cp = c && c.projects.filter(function (x) { return x.pid === p.id; })[0];
    if (cp) { cp.phase = agPhaseT(p); cp.step = agPhaseN(p); if (p.due) { cp.date = p.due.d; if (p.due.chip) { cp.chip = p.due.chip; cp.chipT = p.due.t; } else { delete cp.chip; delete cp.chipT; } } }
  }
  /* Activity: the delivery record, in the same list */
  function agEvents(p, add) {
    var M = agM(p), g = agG(p);
    (p.mev || []).forEach(function (e) {
      var t = e.m ? (smMs(M, e.m) || smIn(M, e.m) || { t: '' }).t : '', me = e.w === 'y', text;
      text = { deliver: 'You delivered ' + t, got: 'You marked “' + t + '” received', pause: 'You paused the work', resume: 'You resumed the work', close: 'You closed the project', accept: g + ' accepted ' + t, changes: g + ' asked for changes on ' + t, notmet: g + ' said ' + t + ' is not as agreed', flag: g + ' flagged ' + t + ' as missed', sent: g + ' sent “' + t + '”', end: g + ' ended the project', check: smEvText(e, M, { studio: 'You', client: g }), paid: smEvText(e, M, { studio: 'You', client: g }), nopay: smEvText(e, M, { studio: 'You', client: g }), gave: smEvText(e, M, { studio: 'You', client: g }), recv: smEvText(e, M, { studio: 'You', client: g }), bug: smEvText(e, M, { studio: 'You', client: g }), fixed: smEvText(e, M, { studio: 'You', client: g }), notbug: smEvText(e, M, { studio: 'You', client: g }), fixok: smEvText(e, M, { studio: 'You', client: g }) }[e.ty];
      var lv = { accept: 'ok', fixok: 'ok', recv: 'ok', paid: 'ok', notmet: 'crit', flag: 'crit', end: 'crit', bug: 'crit', changes: 'warn', nopay: 'warn', pause: 'warn', close: 'warn' }[e.ty] || (e.ty === 'check' ? (smCk(e).ok ? 'minor' : 'warn') : '');   // v116
      add(e.at, e.ts, me ? 'you' : 'client', text, e.ty !== 'got' && e.ty !== 'sent', { tab: 'delivery', l: 'Delivery' }, e.tx ? prvT(e.tx, 90) : (e.ty === 'accept' && e.rec ? 'With an email code' : ''), '', lv);
    });
    M.ms.forEach(function (m) { if (m.st === 'accepted' && m.deemed) add('', m.at, 'client', m.t + ' was accepted by default', true, { tab: 'delivery', l: 'Delivery' }, 'No answer within ' + M.rules.review + ' business days of the delivery'); });
  }

  /* ---- the project record: print it, or save it as a PDF ---- */
  var crPrefill = null;
  function agRecordOpen(p, trigger) {
    var M = agM(p), cl = byId(p.cid) || {}, ov = document.getElementById('rq-view');
    agChain(p, function () {
      var html = smRecordHTML({ title: p.n, studio: agStudio(), client: cl.contact || cl.name || 'Client', money: function (n) { return pdMoney(n, p.cur); }, fmt: function (ts) { return ts ? agWhen(ts) : ''; },
        vers: p.sc.vers, crs: pdCrList(p).slice().reverse(), ev: p.mev || [], M: agM(p), appr: agApprOf, now: Date.now(), esc: esc });
      ov.querySelector('.rq-body').innerHTML = html;
      ov.hidden = false; document.body.classList.add('rq-open'); ov.querySelector('.rq-x').focus();
      ov.rqBack = trigger || null;
    });
    void M;
  }
  function agRecordClose() { var ov = document.getElementById('rq-view'); ov.hidden = true; document.body.classList.remove('rq-open'); if (ov.rqBack && ov.rqBack.focus) ov.rqBack.focus(); }

  /* ---- sync: delivery events go to the server first; the client's come back through pull ---- */
  async function syPushMev(p, n, e) {
    var en = await syEnsure(p), prev, hx, r, c = byId(p.cid);
    if (!en.ok) return en;
    await new Promise(function (res) { agChain(p, res); });
    prev = n ? p.mev[n - 1].hx : smEvGen(p.id);
    hx = await syShaP(smEvRaw(p.id, prev, e));
    var b = { n: n, ty: e.ty, at: e.at, ts: e.ts, hx: hx };
    if (e.m) b.m = e.m; if (e.tx) b.tx = e.tx; if (e.link) b.link = e.link; if (e.k) b.k = e.k; if (e.cap) b.cap = e.cap;
    r = await syCall('POST', '/v1/projects/' + p.id + '/events', b);
    if (!syOk(r)) return syBadW(r, given(c));
    if (!r.data.event || r.data.event.hx !== hx) return { ok: false, msg: 'The server stored a different record than this app computed. Nothing was sent.' };
    return { ok: true, hx: hx, i: syI(r.data.event.i) };
  }
  function syGateMev(p, e, onOk, onErr) {
    if (SDB.S.stale) { onErr('This tab is behind another one. Reload it, then try again.'); return; }
    var n = (p.mev || []).length, k = syStatus(p).k;
    syQ(function () { return syStatus(p).k === k ? syPushMev(p, n, e) : { ok: false, msg: 'The connection changed while this was waiting. Try again.' }; }).then(function (r) {
      if (r.ok) { e.hx = r.hx; e.i = n; p.mev = p.mev || []; p.mev.push(e); onOk(); syPaint(); SDB.soon(40); return; }
      if (r.unsure) SY.look[p.id] = 1;
      if (!r.stale) { onErr(r.msg); return; }
      syQ(function () { return syReconcile(p); }).then(function () { if (curView === 'project' && pd.p === p) syRepaint(true); var m = agG(p) + ' did something on this project meanwhile. It is on screen now. Look, then try again.'; onErr(m); showToast(m); syPullSoon(); });
    });
  }
  var SY_EVW = { y: /^(deliver|got|pause|resume|close|nopay|gave|fixed|notbug)$/, c: /^(accept|changes|notmet|flag|sent|end|check|paid|recv|bug|fixok)$/ };   // fixed, notbug, bug, fixok: v107 (64)   // gave, recv: v106 (63)   // v103 check (61), v104 paid and nopay (60)
  function syLocalEv(se) {
    var e = { i: syI(se.i), w: se.w === 'y' ? 'y' : 'c', ty: syS(se.ty, 12), m: syS(se.m, 40), v: syI(se.v), at: syS(se.at, 24), ts: syI(se.ts), tx: syS(se.tx, 2000), link: syS(se.link, 300), k: syS(se.k, 20), hx: syS(se.hx, 64) }, r = se.rec;
    if (r && typeof r === 'object') e.rec = { by: syS(r.by, 100), via: syS(r.via, 20), at: syI(r.at), ip: syS(r.ip, 64), fp: syS(r.fp, 20), email: syS(r.email, 120) };
    var pics = cpSan(se.pics); if (pics) e.pics = pics;   // v102 (59): not in the hash
    if (se.cap && Array.isArray(se.cap.steps) && se.cap.steps.length) e.cap = { b: syS(se.cap.b, 60), steps: se.cap.steps.slice(0, 5).map(function (x) { return syS(x, 160); }) };   // v103 (61): checked in syApplyMev
    return e;
  }
  /* '' nothing new, null a gap, false did not verify, otherwise a line for the toast */
  async function syApplyMev(pref, se, o) {
    var p = pdById(syS(pref, 64)), e, prev, hx;
    if (!p || !syMine(p) || !se || typeof se !== 'object') return '';
    p.mev = p.mev || [];
    if (syI(se.i) < p.mev.length) return '';
    if (syI(se.i) > p.mev.length) return o.noGap ? '' : null;
    if (typeof se.hx !== 'string' || !/^[0-9a-f]{64}$/.test(se.hx)) return false;
    e = syLocalEv(se);
    if (!SY_EVW[e.w].test(e.ty) || (e.w === 'y' && !o.full)) return false;
    await new Promise(function (res) { agChain(p, res); });
    prev = p.mev.length ? p.mev[p.mev.length - 1].hx : smEvGen(p.id);
    hx = await syShaP(smEvRaw(p.id, prev, e));
    if (hx !== se.hx) return false;
    if (e.cap && 'c' + (await syShaP(smCapRaw(e.cap))).slice(0, 12) !== e.k) delete e.cap;   // v103 (61): a capsule that is not the one the chain names is not kept
    if (e.ty === 'accept') {   // an acceptance is for one exact delivery, with the emailed code
      var d = null; for (var j = p.mev.length - 1; j >= 0; j--) if (p.mev[j].ty === 'deliver' && p.mev[j].m === e.m) { d = p.mev[j]; break; }
      if (!e.rec || e.rec.via !== 'email code' || !d || e.rec.fp !== pdGroup(d.hx, 12)) return false;
    }
    p.mev.push(e);
    if (e.w === 'c') dlLanded(p, e); else { pdTouch(p); pdAfterChange(p); }
    var M = agM(p);
    return smEvText(e, M, { studio: 'You', client: agG(p) });
  }

  document.getElementById('rq-print').addEventListener('click', function () { window.print(); });
  document.getElementById('rq-x').addEventListener('click', agRecordClose);
  document.getElementById('rq-view').addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); agRecordClose(); } });

  /* ───────── v61: Today, a next step tied to the work, Later and Decisions on client projects, notes that become work,
     the weekly review, links that can be edited, tabs per project, and capture from the web (CONTRACT.md, section 20) ───────── */
  var X6_DAY = 864e5, X6_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], X6_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function x6Iso(ts) { var d = new Date(ts == null ? Date.now() : ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function x6Ts(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : 0; }
  function x6Lbl(iso, wd) { var t = x6Ts(iso); if (!t) return ''; var d = new Date(t); return (wd ? X6_WD[d.getDay()] + ' ' : '') + d.getDate() + ' ' + X6_MON[d.getMonth()]; }
  function x6Rel(iso) { var t = x6Ts(iso), n = x6Ts(x6Iso()); if (!t) return ''; var k = Math.round((t - n) / X6_DAY); return k === 0 ? 'today' : k === 1 ? 'tomorrow' : k === -1 ? 'yesterday' : x6Lbl(iso, Math.abs(k) < 7); }
  function x6Days(n) { return n + (n === 1 ? ' day' : ' days'); }
  function x6Id(k) { return k + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function x6Cut(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function x6Url(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u; try { var x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.indexOf('.') > 0 ? x.href : null; } catch (e) { return null; } }
  /* a project that still moves: not stopped, not closed or ended on the record */
  function x6Live(p) { if (!p) return false; if (p.pv && p.pv.stop) return false; if (p.kind === 'client' && agV2(p) && agM(p).cl) return false; return true; }
  /* when it last changed: the stored moment, or what the "3d ago" label says */
  function x6Upd(p) { return p.updT || (Date.now() - pdAge(p) * 6e4); }
  function x6Order() {
    var seen = {}, out = [];
    RECENT.forEach(function (r) { var p = pdById(r.id); if (p && !seen[p.id]) { seen[p.id] = 1; out.push(p); } });
    PROJECTS.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }).forEach(function (p) { if (!seen[p.id]) { seen[p.id] = 1; out.push(p); } });
    return out;
  }
  function x6ProjOpts(sel, none) {
    return (none ? '<option value="">' + esc(none) + '</option>' : '') + x6Order().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.n) + '</option>'; }).join('');
  }
  function x6After(p) {
    if (p.kind === 'private') prvAfter(p); else { pdDerive(p); pdRefreshBadges(p); }
    if (pd.p === p && curView === 'project') pdRerender();
    dbRecent(); tdRender();
    if (curView === 'mywork') mwRender();
  }

