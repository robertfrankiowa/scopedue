  /* ---------- Overview: where the project stands, and the one next thing ---------- */
  function pfNext(p) {
    var pv = p.pv, st = pfStage(p), t = pfCur(p), res = t ? pfRes(t) : '', go = function (f, l, pri) { return '<button type="button" class="btn-' + (pri ? 'primary' : 'ghost') + ' btn-sm" data-pd="goto" data-tab="' + (f === 'scope' || f === 'late' ? 'scope' : 'market') + '" data-f="' + f + '">' + l + '</button>'; };
    if (st === 'stopped') return { t: 'Stopped ' + prvDate(pv.stop.ts) + ': ' + pv.stop.why, a: '<button type="button" class="btn-ghost btn-sm" data-pd="pf:reopen">Reopen</button>' };
    if (t && res !== 'run') return { t: (t.kind === 'launch' ? 'The launch check is over. ' : t.kind === 'grow' ? 'The growth check is over. ' : 'The test is over. ') + pfResText(t, res), a: go('pf:dec', 'Decide', true) };
    if (t) { var l = pfLeft(t); return { t: (t.kind === 'launch' ? 'Launch check: ' : t.kind === 'grow' ? 'Growth check: ' : 'Test: ') + pfVal(t) + ' of ' + t.ok + ' ' + PF_M[t.m].unit + ' · ' + (l <= 0 ? 'last day' : prvDay(l) + ' left'), a: go('pf:log', 'Log a result', true) }; }
    if (st === 'idea') return pv.jobs.length || pv.comps.length ? { t: 'Test the riskiest thing you believe before you build anything.', a: go('pf:new', 'Start a test', true) } :
      { t: 'Before you build: see who already does this, then test the riskiest thing you believe.', a: go('', 'Check the market', true) };
    if (st === 'validate') return { t: 'You narrowed the bet. Start the next test, or stop.', a: go('pf:new', 'Start the next test', true) };
    if (st === 'launch') return { t: ((pv.ships[pv.ships.length - 1] || {}).name || 'v1') + ' shipped. Decide what result means it is working.', a: go('pf:launch', 'Set a launch check', true) };
    var r = pv.rel, late = prvLate(p), ld = prvLoad(p);
    if (late) return { t: r.name + ' is ' + prvDay(late) + ' past its date. Cut, extend once, or stop.', a: go('late', 'Open Scope', true) };
    return { t: (st === 'grow' ? 'Working. ' : '') + r.name + ': ' + ld.days + (ld.cap ? ' of ' + ld.cap : '') + ' days planned' + (r.date ? ' · due ' + prvDate(new Date(r.date + 'T12:00:00').getTime()) : ' · no date yet') + (pv.anyway && !pv.go ? ' · built without proof' : ''), a: go('scope', 'Open Scope', false) };
  }
  function pfStrip(p) {
    var st = pfStage(p);
    if (pdMode(p) !== 'product') {
      if (!p.pv || !p.pv.stop) return '';
      return '<section class="card pq-strip stopped" aria-label="Stage"><div class="pq-nx"><span>' + esc('Stopped ' + prvDate(p.pv.stop.ts) + ': ' + p.pv.stop.why) + '</span><button type="button" class="btn-ghost btn-sm" data-pd="pf:reopen">Reopen</button></div></section>';
    }
    var cur = st === 'stopped' ? (p.pv.stop.n || 2) - 1 : PF_ST.indexOf(st), nx = pfNext(p);
    return '<section class="card pq-strip' + (st === 'stopped' ? ' stopped' : '') + '" aria-label="Stage"><ol class="pq-steps">' + PF_ST.map(function (k, i) {
      return '<li class="' + (i < cur ? 'done' : i === cur ? 'cur' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '><i aria-hidden="true">' + (i < cur ? IC('tick') : i + 1) + '</i><span>' + PF_STL[k] + '</span></li>';
    }).join('') + '</ol><div class="pq-nx"><span>' + esc(nx.t) + '</span>' + nx.a + '</div></section>';
  }
  /* ---------- Needs ---------- */
  function pfNeeds(p) {
    var out = [], st = pfStage(p), t = pfCur(p), res = t ? pfRes(t) : '';
    if (pdMode(p) !== 'product' || st === 'stopped') return out;
    if (t && res !== 'run') out.push({ t: t.kind === 'launch' ? 'Decide on the launch check' : t.kind === 'grow' ? 'Decide on the growth check' : 'Decide: go, narrow or stop', chip: res === 'pass' ? 'ok' : res === 'fail' ? 'crit' : 'warn', chipT: res === 'pass' ? 'Passed' : res === 'fail' ? 'Stop line' : 'Mixed', tab: 'market', f: 'pf:dec', p: pfResText(t, res) });
    else if (!t && st === 'idea') out.push({ t: 'Test it before you build', tab: 'market', f: 'pf:new', p: 'Write the riskiest thing you believe, set the lines for go and stop, then run a small test.' });
    else if (!t && st === 'validate') out.push({ t: 'Start the next test', tab: 'market', f: 'pf:new', p: 'You narrowed the bet. Test the new version, or stop.' });
    else if (!t && st === 'launch') out.push({ t: 'Set a launch check', tab: 'market', f: 'pf:launch', p: 'Decide what result after shipping means it works, and when you will look.' });
    return out;
  }
  /* ---------- actions ---------- */
  function pfFocus(sel) { setTimeout(function () { var el = pdPanel.querySelector('.pq-card'); if (el && !reduced) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); var f = sel && pdPanel.querySelector(sel); if (f) f.focus({ preventScroll: true }); }, 30); }
  function pfOpen(k, sel) { var q = pd.pv; prvReset(); q.pf = k; pdRerender(); pfFocus(sel); }
  function pfDecRec(p, title, outs, chosen, why, t, now) {
    var d = { id: prvId('d'), t: title, st: 'decided', au: 'You', ots: t ? t.ts : now, dts: now, sts: 0, because: why, opts: outs.map(function (k) { return { t: PF_OUT[k] || k, c: k === chosen, why: '' }; }), ev: [], rv: '', by: '', rep: '', typ: 'proof', it: '', tid: t ? t.id : '' };
    p.pv.dec.push(d); return d;
  }
  function pfAct(act, a) {
    var p = pd.p, q = pd.pv, pv = p.pv, snap, now = Date.now(), t;
    if (act === 'new') return pfOpen('new', '#pq-q');
    if (act === 'launch') return pfOpen('launch', '#pq-q');
    if (act === 'grow') return pfOpen('grow', '#pq-q');   /* v137 (116) */
    if (act === 'dec') return pfOpen('dec', 'input[name="o"]:checked');
    if (act === 'log') { q.pf = 'log'; pdRerender(); return pfFocus('.pq-lf input'); }
    if (act === 'cancel') { q.pf = null; pdRerender('[data-pd="pf:new"], [data-pd="pf:log"]'); return; }
    if (act === 'logall') { q.pfAll = !q.pfAll; pdRerender('[data-pd="pf:logall"]'); return; }
    if (act === 'logrm') {
      t = pfCur(p); if (!t) return; var e = prvById(t.log, a.getAttribute('data-id')); if (!e) return;
      snap = prvSnap(p); t.log.splice(t.log.indexOf(e), 1);
      return prvDone(p, snap, 'You removed a test result', 'Result removed', '[data-pd="pf:log"]');
    }
    if (act === 'reopen') {
      if (!pv.stop) return; snap = prvSnap(p);
      pfArr(pv, 'stops').push({ ts: pv.stop.ts, why: pv.stop.why, did: pv.stop.did, n: pv.stop.n, reo: now }); pv.stop = null;
      return prvDone(p, snap, 'You reopened the project', 'Reopened. It picks up where it stopped.', '.pq-card [data-pd]');
    }
  }
  function pfSubmit(kind, f) {
    var p = pd.p, q = pd.pv, pv = p.pv, now = Date.now(), snap, t;
    if (kind === 'new') {
      var tk = /^(launch|grow)$/.test(f.getAttribute('data-k')) ? f.getAttribute('data-k') : 'validate', qq = prvText(f.elements.q.value), m = (f.querySelector('input[name="pfm"]:checked') || {}).value || 'talk';
      var ok = parseInt(f.elements.ok.value, 10), kill = parseInt(f.elements.kill.value, 10), due = f.elements.due.value, n = parseInt(f.elements.n.value, 10);
      if (qq.length < 8) return prvErr(f, 'q', 'Write the belief you are testing, in a sentence.');
      if (isNaN(ok) || ok < 1) return prvErr(f, 'ok', 'The go line is a number of at least 1.');
      if (isNaN(kill) || kill < 0) return prvErr(f, 'kill', 'The stop line is a number, 0 or more.');
      if (kill >= ok) return prvErr(f, 'kill', 'The stop line has to be under the go line, or the result can never be clear.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < prvIso(now)) return prvErr(f, 'due', 'Pick an end date from today on.');
      if (m === 'talk' && (isNaN(n) || n < ok)) return prvErr(f, 'n', 'Plan at least as many interviews as the go line.');
      snap = prvSnap(p); q.pf = null;
      pfTests(p).forEach(function (x) { if (x.st === 'run') { x.st = 'done'; x.dts = now; x.dec = x.dec || ''; } });
      t = { id: prvId('t'), kind: tk, q: qq, m: m, ch: prvText(f.elements.ch.value), ok: ok, kill: kill, n: m === 'talk' ? n : 0, due: due, ts: now, log: [], st: 'run', dec: '', dts: 0, did: '', rel: tk === 'launch' ? ((pv.ships[pv.ships.length - 1] || {}).name || '') : '' };
      pfArr(pv, 'tests').push(t);
      return prvDone(p, snap, tk === 'launch' ? 'You set a launch check' : tk === 'grow' ? 'You started a growth check' : 'You started a test', (tk === 'launch' ? 'Launch check set' : tk === 'grow' ? 'Growth check started' : 'Test started') + '. It ends ' + prvDate(pfEnd(t)) + '. Go at ' + ok + ', stop at ' + kill + ' or fewer.', '[data-pd="pf:log"]');
    }
    if (kind === 'log') {
      t = pfCur(p); if (!t) return;
      var e = { id: prvId('e'), ts: now, n: 1, note: prvText(f.elements.note.value) };
      if (t.m === 'talk') { e.who = prvText(f.elements.who.value); e.rec = f.elements.rec.checked; e.pay = f.elements.pay.checked; }
      else {
        var nn = parseInt(f.elements.n.value, 10), u = prvText(f.elements.u.value);
        if (isNaN(nn) || nn < 1) return prvErr(f, 'n', 'How many, as a number of at least 1.');
        if (u && !/^https?:\/\/\S+\.\S+/.test(u)) return prvErr(f, 'u', 'Enter a full link, like https://…, or leave it empty.');
        e.n = nn; e.u = u;
      }
      snap = prvSnap(p); var before = pfRes(t); t.log.push(e); q.pf = null; var after = pfRes(t);
      return prvDone(p, snap, 'You logged a test result', after === 'pass' && before !== 'pass' ? 'That reaches the go line. Decide when you are ready.' : t.m === 'talk' ? (e.rec && e.pay ? 'Strong interview logged' : 'Interview logged') : 'Logged +' + e.n + '. ' + pfVal(t) + ' of ' + t.ok + ' so far.', '[data-pd="pf:log"]');
    }
    if (kind === 'dec') {
      var o = (f.querySelector('input[name="o"]:checked') || {}).value, why = prvText(f.elements.why.value);
      t = pfCur(p);
      if (!o) return prvErr(f, '', 'Choose what happens next.');
      if (why.length < 8) return prvErr(f, 'why', 'Say why, in a sentence. Future you will want to know.');
      if (o === 'go' && !t) return prvErr(f, '', 'A Go needs a test result.');
      snap = prvSnap(p); q.pf = null;
      var tl = t ? (t.kind === 'launch' ? 'Launch check: ' : t.kind === 'grow' ? 'Growth check: ' : 'Proof: ') + prvT(t.q, 60) : 'Proof: narrow or stop';
      var outs = pfOuts(t ? t.kind : 'validate', t);
      if (outs.indexOf(o) < 0) return prvErr(f, '', 'Choose what happens next.');
      if (t) { t.res = pfRes(t); t.st = 'done'; t.dec = o; t.dts = now; }
      var d = pfDecRec(p, tl, outs, o, why, t, now); if (t) t.did = d.id;
      if (o === 'go') pv.go = { ts: now, did: d.id };
      else if (o === 'grow') pv.grow = { ts: now, did: d.id };
      else if (o === 'stop') pv.stop = { ts: now, why: why, did: d.id, n: pfPhaseN(p) };
      /* v137 (116): keep and drop close a growth check and change nothing else: the product goes on either way */
      var gk = t && t.kind === 'grow', msg = o === 'go' ? 'Go. Now is open in Scope.' : o === 'grow' ? 'Working. On to growth.' : o === 'stop' ? 'Stopped. The record stays, and you can reopen it.' : o === 'keep' ? 'Kept. Check the next thing when you are ready.' : o === 'drop' ? 'Dropped. The product goes on.' : gk ? 'Changed. Set the next growth check.' : 'Narrowed. Write the next test.';
      prvDone(p, snap, 'You decided: ' + PF_OUT[o], msg, '.pq-card [data-pd]');
      if (o === 'narrow') { q.pf = gk ? 'grow' : 'new'; pdRerender(); pfFocus('#pq-q'); }
      return;
    }
  }
  function pfChange(el) {
    var f = el.closest('.pq-f'); if (!f || el.name !== 'pfm') return;
    var M = PF_M[el.value]; if (!M) return;
    f.elements.ok.value = M.ok; f.elements.kill.value = M.kill;
    [].forEach.call(f.querySelectorAll('.pq-u'), function (u) { u.textContent = M.unit; });
    f.querySelector('.pq-n').hidden = el.value !== 'talk'; f.querySelector('.pq-talk').hidden = el.value !== 'talk';
  }
  /* ---------- a release past its date: cut, extend once, or stop ---------- */
  function prvLate(p) {
    var r = p.pv.rel, left = prvBucket(p, 'in').filter(function (x) { return x.st !== 'done'; });
    if (!r.date || !left.length || p.pv.stop) return 0;
    var end = new Date(r.date + 'T23:59:59').getTime();
    return Date.now() > end ? Math.ceil((Date.now() - end) / PRV_DAY) : 0;
  }
  function prvLateHTML(p) {
    var q = pd.pv, r = p.pv.rel, late = prvLate(p); if (!late) return '';
    var left = prvBucket(p, 'in').filter(function (x) { return x.st !== 'done'; }), h = '<div class="prv-late" role="alert"><b>' + esc(r.name) + ' is ' + prvDay(late) + ' past its date</b><p>' + left.length + (left.length === 1 ? ' item in Now is' : ' items in Now are') + ' not done. A date that slips once slips again, so decide now.</p>';
    if (q.lt === 'cut') {
      h += '<form class="prv-f prv-lf" data-pd-form="prv:cut" novalidate><fieldset class="prv-pick prv-cutl"><legend>Move to Next</legend>' + left.map(function (x) { return '<label class="pd-chk"><input type="checkbox" name="c" value="' + x.id + '"' + (x.st === 'planned' ? ' checked' : '') + '><span>' + esc(x.t) + (x.size ? ' · ' + x.size : '') + '</span></label>'; }).join('') + '</fieldset>' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:ltx">Cancel</button><button type="submit" class="btn-primary btn-sm">Cut to Next</button></div>' + prvErrSpan() + '</form>';
    } else if (q.lt === 'ext') {
      h += '<form class="prv-f prv-lf" data-pd-form="prv:ext" novalidate><div class="pq-g"><div class="fld"><label for="prv-xd">New date</label><input id="prv-xd" name="d" type="date" min="' + prvIso(Date.now() + PRV_DAY) + '"></div><div class="fld"><label for="prv-xw">Why it slipped <span class="opt">Required</span></label><input id="prv-xw" name="w" maxlength="140" autocomplete="off"></div></div>' +
        '<p class="prv-hint">You get one extension per release. After that, the only answers are cut or stop.</p><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:ltx">Cancel</button><button type="submit" class="btn-primary btn-sm">Extend once</button></div>' + prvErrSpan() + '</form>';
    } else if (q.lt === 'stop') {
      h += '<form class="prv-f prv-lf" data-pd-form="prv:stop" novalidate><div class="fld"><label for="prv-sw">Why stop? <span class="opt">Required</span></label><input id="prv-sw" name="w" maxlength="200" autocomplete="off"></div><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:ltx">Cancel</button><button type="submit" class="btn-primary btn-sm">Stop the project</button></div>' + prvErrSpan() + '</form>';
    } else {
      h += '<div class="pq-acts"><button type="button" class="btn-primary btn-sm" data-pd="prv:lt" data-k="cut">Cut to fit</button><button type="button" class="btn-ghost btn-sm" data-pd="prv:lt" data-k="ext"' + (r.ext ? ' disabled title="Already extended once"' : '') + '>Extend once' + (r.ext ? ' · used' : '') + '</button><button type="button" class="btn-ghost btn-sm" data-pd="prv:lt" data-k="stop">Stop…</button></div>';
    }
    return h + '</div>';
  }
  function prvSubmitCut(f) {
    var p = pd.p, q = pd.pv, ids = prvChecked2(f, 'c'), snap;
    if (!ids.length) return prvErr(f, '', 'Tick what moves to Next.');
    snap = prvSnap(p); q.lt = null;
    ids.forEach(function (id) { var x = prvById(p.pv.items, id); if (x && x.sec === 'in') { prvMove(p, x, 'next', 'Cut to meet the date'); x.why = 'Cut to meet the date'; } });
    prvDone(p, snap, 'You cut ' + itemsLbl(ids.length) + ' to Next to meet the date', 'Cut ' + itemsLbl(ids.length) + ' to Next. Cutting never counts as drift.', '[data-pd="prv:rel"]');
  }
  function prvChecked2(f, name) { return [].map.call(f.querySelectorAll('input[name="' + name + '"]:checked'), function (el) { return el.value; }); }
  function prvSubmitExt(f) {
    var p = pd.p, q = pd.pv, pv = p.pv, r = pv.rel, d = f.elements.d.value, w = prvText(f.elements.w.value), now = Date.now(), snap;
    if (r.ext) return prvErr(f, '', 'This release was already extended once.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= prvIso(now)) return prvErr(f, 'd', 'Pick a date after today.');
    if (w.length < 6) return prvErr(f, 'w', 'Say why it slipped. It goes in Activity.');
    snap = prvSnap(p); q.lt = null;
    var prev = { name: r.name, ship: r.ship, date: r.date, cap: r.cap };
    pv.rel = { name: r.name, ship: r.ship, date: d, cap: r.cap, ext: 1 };
    pv.rl.push({ ts: now, name: r.name, ship: r.ship, date: d, cap: r.cap, prev: prev, ext: 1, why: w });
    prvDone(p, snap, 'You extended ' + r.name + ' once', r.name + ' now ends ' + prvDate(new Date(d + 'T12:00:00').getTime()) + '. This was its one extension.', '[data-pd="prv:rel"]');
  }
  function prvSubmitStop(f) {
    var p = pd.p, q = pd.pv, pv = p.pv, w = prvText(f.elements.w.value), now = Date.now(), snap;
    if (w.length < 8) return prvErr(f, 'w', 'Say why, in a sentence.');
    snap = prvSnap(p); q.lt = null;
    var prod = pdMode(p) === 'product', d = pfDecRec(p, 'Stop: ' + pv.rel.name + ' past its date', ['stop'], 'stop', w, null, now);
    if (!prod) { d.typ = 'product'; d.opts = [{ t: 'Stop the project', c: true, why: '' }]; }
    pv.stop = { ts: now, why: w, did: d.id, n: prod ? pfPhaseN(p) : p.phase };
    prvDone(p, snap, 'You stopped the project', 'Stopped. The record stays, and you can reopen it.', '[data-pd="pf:reopen"]');
  }

  /* decisions */
  function prvTyL(d) { var t = PRV_DT.filter(function (z) { return z[0] === d.typ; })[0]; return t ? t[1] : 'Product'; }
  /* v98 (46): who recorded a decision, or superseded it; nothing for a record from before */
  function prvDecWho(p, k) { return k ? '<span class="prv-dwho">' + esc('by ' + x7Name(p, k, 'you')) + '</span>' : ''; }
  function prvDecRow(d, sel) {
    var chip = d.st === 'open' ? '<span class="chip warn">Open</span>' : d.st === 'decided' ? '<span class="chip ok">Decided</span>' : '<span class="chip neutral">Superseded</span>';
    var ch = d.opts.filter(function (o) { return o.c; })[0], when = d.st === 'open' ? 'Opened ' + prvDate(d.ots) : prvDate(d.st === 'superseded' ? d.sts : d.dts);
    return '<li><button type="button" class="pd-cr" data-pd="prv:dsel" data-id="' + d.id + '"' + (sel ? ' aria-current="true"' : '') + '><span class="sd ' + (d.st === 'open' ? 'warn' : d.st === 'decided' ? 'ok' : '') + '" aria-hidden="true"></span><span class="tx"><b>' + esc(d.t) + '</b><span class="l2">' + chip + '<span class="prv-ty" data-t="' + esc(d.typ) + '">' + esc(prvTyL(d)) + '</span>' + (d.st === 'decided' && ch && d.typ !== 'scope' ? '<span>' + esc(ch.t) + '</span>' : '') + '</span></span><time>' + esc(when) + '</time></button></li>';
  }
  function prvDecList(p) { var q = pd.pv; return p.pv.dec.filter(function (d) { return q.dt === 'all' || d.typ === q.dt; }); }
  function prvDecSelected(p) {
    var q = pd.pv, pv = p.pv, d = q.ds && prvById(pv.dec, q.ds), pool = prvDecList(p);
    /* a decision asked for by name (Activity, Quick find, a new one) wins over a type filter that leaves it out. Changing the filter clears q.ds */
    if (d && pool.indexOf(d) < 0) q.dt = 'all';
    /* with nothing asked for, the first one shown is yours, not a Gate call (those are folded under All) */
    if (!d && q.dt === 'all' && pool.some(function (x) { return x.typ !== 'scope'; })) pool = pool.filter(function (x) { return x.typ !== 'scope'; });
    if (!d) { d = pool.filter(function (x) { return x.st === 'open'; }).sort(function (a, b) { return a.ots - b.ots; })[0] || pool.filter(function (x) { return x.st === 'decided'; }).sort(function (a, b) { return (b.dts || b.ots) - (a.dts || a.ots); })[0] || pool[0] || null; q.ds = d ? d.id : null; }
    return d;
  }
  function prvEvChips(p, d) {
    if (!d.ev.length) return '<p class="pde-small">No evidence linked.</p>';
    return '<div class="prv-evl">' + d.ev.map(function (n) { var s = prvSrc(p, n); return s ? '<button type="button" class="pd-crl" data-pd="prv:ref" data-n="' + n + '" data-go="1" title="' + esc(s.t) + '">Source [' + n + ']</button>' : ''; }).join('') + '</div>';
  }
  /* a link from a Gate call back to the item it was about */
  function prvOpenItem(p, x) {
    var inbox = x.sec === 'inbox', idea = inbox ? p.pv.park.filter(function (k) { return k.iid === x.id && k.st === 'parked'; })[0] : null;
    return '<button type="button" class="btn-ghost btn-sm" data-pd="prv:hgo" data-tab="' + (inbox ? 'parking' : 'scope') + '" data-id="' + (inbox ? (idea ? idea.id : '') : x.id) + '">' + (inbox ? 'Open in the Parking Lot' : 'Open in Scope') + '</button>';
  }
  /* a Gate call is sentences the app wrote one after another ("Answers “…”. Cannot ship without it. Size S…"). Shown one by one,
     each is translated on its own. A full stop inside quotes (someone's words) does not end a sentence */
  function prvSentences(s) {
    var out = [], cur = '', dq = 0, i, c;
    s = String(s || '');
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i); cur += c;
      if (c === '“') dq++; else if (c === '”' && dq) dq--;
      if (!dq && /[.!?]/.test(c) && s.charAt(i + 1) === ' ' && /[A-Z“]/.test(s.charAt(i + 2))) { out.push(cur); cur = ''; i++; }
    }
    if (cur) out.push(cur);
    return out;
  }
  function prvDecDetail(p, d) {
    var q = pd.pv, pv = p.pv, st = d.st, chip = st === 'open' ? '<span class="chip warn">Open</span><span>Opened ' + esc(prvDate(d.ots)) + ' · ' + esc(prvRuns(d.ots)) + '</span>' : st === 'decided' ? '<span class="chip ok">Decided</span><span>' + esc(prvDate(d.dts)) + '</span>' + prvDecWho(p, d.au) : '<span class="chip neutral">Superseded</span><span>' + esc(prvDate(d.sts)) + '</span>' + prvDecWho(p, d.su);
    var h = '<section class="card pd-card pd-cr-d prv-dd" aria-labelledby="pd-h-dd"><div class="card-h ruled"><div><span class="pd-eb">Decision</span><h3 id="pd-h-dd">' + esc(d.t) + '</h3><p>' + chip + '</p></div></div><div class="pde-b">';
    var rep = d.rep && prvById(pv.dec, d.rep), by = d.by && prvById(pv.dec, d.by), again = pv.dec.filter(function (x) { return x.st === 'open' && x.rep === d.id; })[0];
    if (rep) h += '<p class="pd-note">Replaces <button type="button" class="link" data-pd="prv:dsel" data-id="' + rep.id + '">' + esc(rep.t) + '</button>' + (d.st === 'open' ? ' once you record it.' : '.') + '</p>';
    if (by) h += '<p class="pd-note">Replaced by <button type="button" class="link" data-pd="prv:dsel" data-id="' + by.id + '">' + esc(by.t) + '</button>. This record stays as it was.</p>';
    if (again) h += '<p class="pd-note">Being reconsidered in <button type="button" class="link" data-pd="prv:dsel" data-id="' + again.id + '">' + esc(again.t) + '</button>.</p>';
    if (st === 'open') {
      h += '<div class="pde-sec"><h4 class="pd-eb">Options</h4>' + (d.opts.length ? '<ul class="prv-ops">' + d.opts.map(function (o, i) { return '<li><span>' + esc(o.t) + '</span><button type="button" class="icon-sm xs" data-pd="prv:doptrm" data-i="' + i + '" aria-label="Remove option ' + esc(o.t) + '">' + IC('x') + '</button></li>'; }).join('') + '</ul>' : '<p class="pde-small">No options listed. You can still record what you chose.</p>') +
        '<form class="prv-f prv-oa" data-pd-form="prv:dopt" novalidate><label class="sr-only" for="prv-oa">Add an option</label><input id="prv-oa" name="o" maxlength="80" placeholder="Add an option" autocomplete="off"><button type="submit" class="btn-ghost btn-sm">Add</button>' + prvErrSpan() + '</form></div>';
      h += '<form class="prv-f prv-rf pde-sec" data-pd-form="prv:record" novalidate><h4 class="pd-eb">Record the decision</h4>';
      if (d.opts.length) h += '<fieldset class="prv-pick"><legend>What did you choose?</legend>' + d.opts.map(function (o, i) { return prvOptChip('radio', 'c', i, esc(o.t), i === 0 && d.opts.length === 1); }).join('') + '</fieldset>';
      else h += '<div class="fld"><label for="prv-rc">What did you choose?</label><input id="prv-rc" name="choice" maxlength="80" autocomplete="off"></div>';
      h += '<div class="fld"><label for="prv-rb">Because <span class="opt">Required</span></label><textarea id="prv-rb" name="b" rows="3" maxlength="400" placeholder="Why this one? Write it while it is fresh."></textarea></div>';
      /* v112 (70): a reason for each option not chosen, so each says its own (one shared line was copied onto every option) */
      if (d.opts.length > 1) h += '<fieldset class="prv-why"><legend>Why not the others? <span class="opt">Optional</span></legend><p class="prv-hint">One line each. Leave the one you chose empty.</p>' + d.opts.map(function (o, i) { return '<div class="fld"><label for="prv-rn' + i + '">' + esc(o.t) + '</label><input id="prv-rn' + i + '" name="n' + i + '" maxlength="120" placeholder="One line is enough" autocomplete="off"></div>'; }).join('') + '</fieldset>';
      h += prvPicker(p, d.ev || [], 'ev') + '<div class="fld"><label for="prv-rv">Revisit if… <span class="opt">Optional</span></label><input id="prv-rv" name="rv" maxlength="100" placeholder="For example, Drive terms change" autocomplete="off"></div>' +
        '<div class="pde-acts"><button type="submit" class="btn-primary btn-sm">' + IC('tick') + '<span>Record decision</span></button><button type="button" class="btn-ghost btn-sm" data-pd="prv:ddel">Delete</button></div>' + prvErrSpan() + '</form>';
    } else {
      h += '<div class="pde-sec"><h4 class="pd-eb">Because</h4><p class="prv-bc">' + (d.typ === 'scope' ? prvSentences(d.because).map(function (s) { return '<span>' + esc(s) + '</span>'; }).join(' ') : esc(d.because)) + '</p></div>';
      if (d.opts.length) h += '<div class="pde-sec"><h4 class="pd-eb">Options considered</h4><ul class="prv-ops done">' + d.opts.map(function (o) { return '<li class="' + (o.c ? 'on' : '') + '"><span>' + esc(o.t) + (o.why ? '<small>' + (o.c ? '' : 'Rejected: ') + esc(o.why) + '</small>' : '') + '</span><span class="chip ' + (o.c ? 'ok' : 'quiet') + '">' + (o.c ? 'Chosen' : 'Rejected') + '</span></li>'; }).join('') + '</ul></div>';
      var dt = d.tid && prvById(pfTests(p), d.tid);
      if (dt) h += '<div class="pde-sec"><h4 class="pd-eb">' + pfKindL(dt.kind) + '</h4><p class="pd-note">' + esc(dt.q) + '</p><p class="pde-small">' + PF_M[dt.m].l + ' · ' + pfVal(dt) + ' of ' + dt.ok + ' ' + esc(PF_M[dt.m].unit) + ' · stop line ' + dt.kill + ' · ' + esc(prvDate(dt.ts)) + ' to ' + esc(prvDate(pfEnd(dt))) + '</p></div>';
      if (d.typ !== 'scope' && d.typ !== 'proof') h += '<div class="pde-sec"><h4 class="pd-eb">Evidence</h4>' + prvEvChips(p, d) + '</div>';
      if (d.rv) h += '<div class="pde-sec"><h4 class="pd-eb">Revisit if</h4><p class="pd-note">' + esc(d.rv) + '</p></div>';
      if (st === 'decided' && d.typ === 'scope') {
        var sit = d.it && prvById(pv.items, d.it);
        h += (sit ? '<p class="pd-note">“' + esc(prvT(sit.t, 60)) + '” is now in <b>' + (PRV_BN[sit.sec] || (sit.sec === 'inbox' ? 'the Parking Lot' : 'no list')) + '</b>.</p>' : '') + '<div class="pde-acts">' + (sit ? prvOpenItem(p, sit) : '<button type="button" class="btn-ghost btn-sm" data-pd="goto" data-tab="scope">Open Scope</button>') + '</div><p class="pde-small">The Scope Gate wrote this record and it is not edited. If you change your mind, move the item again and the Gate records a new call.</p>';
      } else if (st === 'decided' && d.typ === 'proof') h += '<p class="pde-small">Proof decisions are not replaced. A new test and a new decision follow them.</p>';
      else if (st === 'decided') h += '<div class="pde-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:drep" data-id="' + d.id + '">' + IC('swap') + 'Replace this decision</button></div><p class="pde-small">Decisions are not edited. If you change your mind, a new decision replaces this one and this record stays.</p>';
    }
    return h + '</div></section>';
  }
  function prvPrincCard(p) {
    var pr = prvPrinc(p), n = pr.length, h;
    h = '<section class="card pd-card prv-pr" aria-labelledby="pd-h-pr"><div class="card-h ruled"><div><span class="pd-eb">Principles</span><h3 id="pd-h-pr">What you will not compromise on</h3><p>' + PRV_PMIN + ' to ' + PRV_PMAX + ' non-negotiables. The Scope Gate checks every item against them.</p></div><div class="h-actions"><span class="count">' + n + ' / ' + PRV_PMAX + '</span></div></div>';
    /* a principle is reworded in place (the old words stay in Activity), and retired only with a reason, never below PRV_PMIN */
    var q = pd.pv, canRm = n > PRV_PMIN;
    h += n ? '<ol class="prv-prl">' + pr.map(function (x, i) {
      var num = '<span class="prv-pn" aria-hidden="true">' + (i + 1) + '</span>';
      if (q.pe === x.id) return '<li class="prv-pr-f">' + num + '<form class="prv-f prv-pe" data-pd-form="prv:pedit" data-id="' + x.id + '" novalidate><label class="sr-only" for="prv-pe">Reword principle ' + (i + 1) + '</label><input id="prv-pe" name="t" value="' + esc(x.t) + '" maxlength="90" autocomplete="off"><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div>' + prvErrSpan() + '</form></li>';
      var row = '<li' + (q.pr === x.id ? ' class="prv-pr-f"' : '') + '>' + num + '<span class="prv-pt">' + esc(x.t) + '</span><span class="prv-pa-b"><button type="button" class="icon-sm xs" data-pd="prv:pe" data-id="' + x.id + '" aria-label="Reword principle: ' + esc(x.t) + '">' + IC('edit') + '</button>' + (canRm ? '<button type="button" class="icon-sm xs" data-pd="prv:prm" data-id="' + x.id + '" aria-label="Retire principle: ' + esc(x.t) + '">' + IC('x') + '</button>' : '') + '</span>';
      if (q.pr === x.id) row += '<form class="prv-f prv-prw" data-pd-form="prv:pret" data-id="' + x.id + '" novalidate><label for="prv-prw">Why retire it? <span class="opt">Required</span></label><input id="prv-prw" name="w" maxlength="140" placeholder="What changed, so it no longer holds" autocomplete="off"><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Retire</button></div>' + prvErrSpan() + '</form>';
      return row + '</li>';
    }).join('') + '</ol>' :
      '<p class="pd-crs-e">No principles yet. Write the few things this project will never trade away, for example “Files stay in the user’s Drive”.</p>';
    if (n === PRV_PMIN) h += '<p class="prv-hint prv-pf">With three, a principle can be reworded but not retired. Add one first to retire another.</p>';
    if (n < PRV_PMAX) h += '<form class="prv-f prv-pa" data-pd-form="prv:princ" novalidate><label class="sr-only" for="prv-pa">Add a principle</label><input id="prv-pa" name="t" maxlength="90" placeholder="' + (n ? 'Add another principle' : 'Write the first principle') + '" autocomplete="off"><button type="submit" class="btn-ghost btn-sm">Add</button>' + prvErrSpan() + '</form>';
    else h += '<p class="prv-hint prv-pf">Seven is the limit. Keep the ones you would delay a release for.</p>';
    if (n && n < PRV_PMIN) h += '<p class="prv-hint prv-pf">Write ' + (PRV_PMIN - n) + ' more. With fewer than ' + PRV_PMIN + ', the Gate has little to check against.</p>';
    return h + '</section>';
  }
  /* one group of the list, newest first, PRV_DN rows at a time (more on asking). The selected decision is always among those shown */
  var PRV_DN = 12;
  function prvDecRows(key, ds, sel) {
    var q = pd.pv, n = (q.dn && q.dn[key]) || PRV_DN, at = sel ? ds.indexOf(sel) : -1;
    if (at >= n) n = Math.ceil((at + 1) / PRV_DN) * PRV_DN;
    return '<ul class="pd-crs" data-g="' + key + '">' + ds.slice(0, n).map(function (d) { return prvDecRow(d, d === sel); }).join('') + '</ul>' +
      (ds.length > n ? '<div class="pdh-more"><button type="button" class="btn-ghost btn-sm" data-pd="prv:dmore" data-g="' + key + '" data-n="' + n + '">Show earlier · ' + (ds.length - n) + ' more</button></div>' : '');
  }
  function prvDecisionsHTML(p) {
    var pv = p.pv, q = pd.pv, sel = prvDecSelected(p), cta = '<button type="button" class="btn-primary" data-pd="prv:dnew">' + IC('plus') + '<span>New decision</span></button>';
    var groups = [['open', 'Open'], ['decided', 'Decided'], ['superseded', 'Superseded']], pool = prvDecList(p), newest = function (a, b) { return (b.dts || b.ots) - (a.dts || a.ots); };
    /* v119 (87): internal work keeps what it is not sure of and its sources here: a question is answered by a decision that points at a source */
    var qs = pdMode(p) === 'internal' ? '<div class="pd-cols prv-mk"><div class="pd-col">' + prvQsCard(p) + '</div><div class="pd-col">' + prvSrcCard(p) + '</div></div>' : '';
    if (!pv.dec.length) return pdHeadHTML(p, 'decisions', cta) + prvPrincCard(p) + '<section class="card pd-card"><p class="pd-crs-e">No decisions yet. Record the next choice you would not want to argue twice. Scope calls from the Gate land here by themselves.</p></section>' + qs;
    /* a type with no decision has no button, unless it is the one chosen */
    var seg = '<div class="seg" role="group" aria-label="Decision type" data-seg="dtf">' + [['all', 'All', pv.dec.length]].concat(PRV_DT.map(function (t) { return [t[0], t[1], pv.dec.filter(function (d) { return d.typ === t[0]; }).length]; })).filter(function (s) { return s[0] === 'all' || s[2] || q.dt === s[0]; }).map(function (s) { return '<button type="button" data-f="' + s[0] + '" aria-pressed="' + (q.dt === s[0]) + '">' + s[1] + ' <span class="n">' + s[2] + '</span></button>'; }).join('') + '</div>';
    /* under All, the Gate's calls are one folded group after yours: they come with every move in Scope and would bury the rest */
    var fold = q.dt === 'all', mine = fold ? pool.filter(function (d) { return d.typ !== 'scope'; }) : pool, gate = fold ? pool.filter(function (d) { return d.typ === 'scope'; }).sort(newest) : [];
    var gOpen = gate.length && (q.gs || gate.indexOf(sel) > -1 || !mine.length);
    var gh = gate.length ? '<h4 class="pd-eb prv-gh"><button type="button" class="prv-gtg" data-pd="prv:dgate" aria-expanded="' + !!gOpen + '">Calls from the Scope Gate <span class="n">' + gate.length + '</span>' + IC('chev') + '</button></h4>' +
      (gOpen ? prvDecRows('gate', gate, sel) : '<p class="pde-small prv-gtn">Where each item went in Scope, and why. The Gate writes them; they are not edited.</p>') : '';
    var list = '<section class="card pd-card" aria-labelledby="pd-h-dl"><div class="card-h ruled"><div><h3 id="pd-h-dl">All decisions</h3><p>Open ones come first. Scope calls are written by the Gate.</p></div><div class="h-actions"><span class="count">' + pool.length + '</span></div></div><div class="prv-seg prv-seg-in">' + seg + '</div>' + (pool.length ? groups.map(function (g) {
      var ds = mine.filter(function (d) { return d.st === g[0]; }).sort(newest);
      return ds.length ? '<h4 class="pd-eb prv-gh">' + g[1] + ' <span class="n">' + ds.length + '</span></h4>' + prvDecRows(g[0], ds, sel) : '';
    }).join('') + gh : '<p class="pd-crs-e">No ' + esc((PRV_DT.filter(function (t) { return t[0] === q.dt; })[0] || ['', ''])[1].toLowerCase()) + ' decisions yet.</p>') + '</section>';
    return pdHeadHTML(p, 'decisions', cta) + prvPrincCard(p) + '<div class="pd-cols prv-dc"><div class="pd-col">' + list + '</div><div class="pd-col">' + (sel ? prvDecDetail(p, sel) : '') + '</div></div>' + qs;
  }
  /* history */
  /* the chart's track in pixels, as the panel is now: how close two marks may sit, and how many dates the axis has room for */
  function prvTrkPx() {
    var t = pdPanel && pdPanel.querySelector('.prv-trk'), w = t && t.getBoundingClientRect().width, gx;
    if (w) return w;
    /* not drawn yet: the panel, less the card's padding and the lane names (.prv-axis margin, 25-ai-research.css) */
    gx = parseFloat(getComputedStyle(pdPanel).getPropertyValue('--gx')) || 24;
    return Math.max(160, (pdPanel.clientWidth || 1000) - 2 * gx - (window.innerWidth <= 700 ? 76 : 88));
  }
  function prvEvoCard(p, all) {
    /* v122 (94): the chart shows a stretch of time, 7 days, 30 days or all of it. A project whose events sit in its last days was
       drawn from its first one, every mark crowded at the right; it opens on 7 days when the last week has any. What is older than
       the stretch is left off the chart (the list below still has it) */
    var q = pd.pv, now = Date.now(), oldest = all.length ? all[all.length - 1].ts : now;
    var hr = q.hr || (all.some(function (e) { return e.ts >= now - 7 * PRV_DAY; }) && oldest < now - 7 * PRV_DAY ? '7' : 'all');
    var tmin = hr === 'all' ? Math.min(oldest, now - 7 * PRV_DAY) : now - +hr * PRV_DAY;
    all = all.filter(function (e) { return e.ts >= tmin; });
    var span = now - tmin, pad = span * 0.03; tmin -= pad; span = now + pad - tmin;
    var rng = '<div class="seg prv-hr" role="group" aria-label="How far back" data-seg="hr">' + [['7', '7 days'], ['30', '30 days'], ['all', 'All']].map(function (o) { return '<button type="button" data-f="' + o[0] + '" aria-pressed="' + (hr === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    var x = function (ts) { return Math.max(0, Math.min(100, (ts - tmin) / span * 100)); }, px = prvTrkPx(), near = 22 / px * 100;
    /* marks closer than a mark's width are one mark, with how many events it holds. data-i lists them newest first */
    var lanes = prvLanes(p).map(function (l) {
      var cl = [], c = null;
      all.filter(function (e) { return e.ln === l[0]; }).reverse().forEach(function (e) {
        var ex = x(e.ts);
        if (c && ex - c.x0 < near) { c.e.unshift(e); c.x1 = ex; } else cl.push(c = { x0: ex, x1: ex, e: [e] });
      });
      return '<div class="prv-lane' + (q.hl[l[0]] ? '' : ' off') + '"><span class="prv-ln">' + l[1] + '</span><div class="prv-trk">' + cl.map(function (c) {
        var n = c.e.length, d0 = prvDate(c.e[n - 1].ts), d1 = prvDate(c.e[0].ts);
        return '<button type="button" class="prv-mrk" data-l="' + l[0] + '" data-pd="prv:hev" data-i="' + c.e.map(function (e) { return e.i; }).join(' ') + '" style="left:' + ((c.x0 + c.x1) / 2).toFixed(2) + '%" tabindex="-1" aria-hidden="true" title="' + esc(n > 1 ? n + ' events · ' + (d0 === d1 ? d1 : d0 + ' to ' + d1) : c.e[0].t + ' · ' + d1) + '">' + (n > 1 ? '<span class="prv-mn">' + n + '</span>' : '') + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    /* dates on the axis: days, every other day, Mondays, every other Monday, then months, whichever fits. None too close to Today */
    var ticks = '', room = Math.max(2, Math.floor(px / 72)), step = [1, 2, 7, 14].filter(function (s) { return span / (s * PRV_DAY) <= room; })[0], d = new Date(tmin);
    var tick = function (t, l) { if ((100 - x(t)) / 100 * px > 76) ticks += '<span style="left:' + x(t).toFixed(2) + '%">' + esc(l) + '</span>'; };
    d.setHours(0, 0, 0, 0);
    if (step) {
      d.setDate(d.getDate() + 1);
      if (step > 2) while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
      for (; d.getTime() < now; d.setDate(d.getDate() + step)) tick(d.getTime(), prvDate(d.getTime()));
    } else {
      var ms = [1, 2, 3, 6, 12].filter(function (s) { return span / (s * 30.4 * PRV_DAY) <= room; })[0] || 12;
      d.setDate(1); d.setMonth(d.getMonth() + 1);
      for (; d.getTime() < now; d.setMonth(d.getMonth() + 1)) if (d.getMonth() % ms === 0) tick(d.getTime(), MON[d.getMonth()] + (d.getMonth() === 0 ? ' ' + d.getFullYear() : ''));
    }
    return '<section class="card pd-card" aria-labelledby="pd-h-evo"><div class="card-h ruled"><div><h3 id="pd-h-evo">Evolution</h3><p>' + esc(prvDate(tmin + pad)) + ' to today. A number beside a mark counts the events it holds.</p></div><div class="h-actions">' + rng + '</div></div><div class="prv-evo"><p class="sr-only">Chart of ' + all.length + ' events across ' + prvLanes(p).length + ' lanes. The same events are listed below, with links.</p><div class="prv-lanes">' + lanes + '</div><div class="prv-axis" aria-hidden="true">' + ticks + '<span class="now">Today</span></div></div></section>';
  }
  function prvHistoryHTML(p) {
    var q = pd.pv, lanes = prvLanes(p), on = {}, all;
    lanes.forEach(function (l) { on[l[0]] = 1; });
    all = prvEvents(p).filter(function (e) { return on[e.ln]; });
    var chips = '<div class="prv-lts" role="group" aria-label="Show lanes">' + lanes.map(function (l) { var n = all.filter(function (e) { return e.ln === l[0]; }).length; return '<button type="button" class="prv-lt" data-pd="prv:lane" data-l="' + l[0] + '" aria-pressed="' + (q.hl[l[0]] ? 'true' : 'false') + '"><span class="prv-sh" data-l="' + l[0] + '" aria-hidden="true"></span>' + l[1] + ' <span class="n">' + n + '</span></button>'; }).join('') + '</div>';
    var list = all.filter(function (e) { return q.hl[e.ln]; }), shown = list.slice(0, q.hn), body = '', day = '', open = false, now = Date.now();
    shown.forEach(function (e) {
      var d = pdDayLabel(e.ts);
      if (d !== day) { if (open) body += '</ul>'; body += '<h4 class="pd-eb pdh-day">' + esc(d) + '</h4><ul class="pdh-l">'; day = d; open = true; }
      var lk = e.link ? '<button type="button" class="pd-crl" data-pd="prv:hgo" data-tab="' + e.link.tab + '"' + (e.link.id ? ' data-id="' + e.link.id + '"' : '') + (e.link.n ? ' data-n="' + e.link.n + '"' : '') + (e.link.f ? ' data-f="' + e.link.f + '"' : '') + ' aria-label="Open ' + esc(e.link.l) + '">' + esc(e.link.l) + '</button>' : '';
      var diff = e.diff && (e.diff.b || e.diff.a) ? '<span class="prv-diff">' + (e.diff.b ? '<del>' + esc(e.diff.b) + '</del> ' : '') + '<ins>' + esc(e.diff.a) + '</ins></span>' : '';
      var tm = now - e.ts < 2 * PRV_DAY ? pdClock(e.ts) : '';
      body += '<li class="pdh-e prv-e" data-ei="' + e.i + '"><span class="prv-eic"><span class="prv-sh" data-l="' + e.ln + '" aria-hidden="true"></span><span class="sr-only">' + esc(lanes.filter(function (l) { return l[0] === e.ln; })[0][1]) + '. </span></span><div class="pdh-t">' + esc(e.t) + (e.sub ? '<small>' + (Array.isArray(e.sub) ? e.sub.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('. ') : esc(e.sub)) + '</small>' : '') + diff + '</div><div class="pdh-r">' + lk + '<time>' + esc(tm) + '</time></div></li>';
    });
    if (open) body += '</ul>';
    if (!all.length) body = '<p class="pd-crs-e">Activity starts with your first Thesis.</p>';
    else if (!list.length) body = '<p class="pd-crs-e">No lanes are showing. Turn one on above.</p>';
    var more = list.length > shown.length ? '<div class="pdh-more"><button type="button" class="btn-ghost btn-sm" data-pd="prv:hmore">Show earlier · ' + (list.length - shown.length) + ' more</button></div>' : '';
    var main = '<section class="card pd-card" aria-labelledby="pd-h-act"><div class="card-h ruled"><div><h3 id="pd-h-act">All events</h3><p>Everything you did on this project, newest first.</p></div><div class="h-actions"><span class="count">' + list.length + '</span></div></div><div class="prv-lt-w">' + chips + '</div>' + body + more + '</section>';
    return pdHeadHTML(p, 'history') + '<div class="pd-col pdh-col">' + prvEvoCard(p, all) + prvShipsCard(p) + main + '</div>';
  }
  var PD_BUILD = {
    'client.workspace': pdWorkspaceHTML, 'private.workspace': pdWorkspaceHTML,
    'client.scope': pdScopeHTML, 'client.delivery': dlHTML, 'client.change': pdChangeHTML,
    'client.evidence': pdEvidenceHTML, 'client.history': pdHistoryHTML,
    'client.team': pdTeamHTML, 'private.team': pdTeamHTML,
    'private.market': prvMarketHTML, 'private.scope': prvScopeHTML, 'private.decisions': prvDecisionsHTML, 'private.history': prvHistoryHTML, 'private.feedback': fbHTML
  };

