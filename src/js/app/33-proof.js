  /* ---------- proof (v59): a test whose lines are set before the results, then Go, Narrow or Stop ----------
     Desk research says what exists. Only a test says what people do. Building before a Go is allowed, but it is a recorded choice. */
  var PF_M = {
    talk: { l: 'Talk', d: 'Interviews about what people did, not what they would do.', unit: 'strong interviews', u1: 'strong interview', ok: 3, kill: 1, n: 5 },
    signup: { l: 'Sign-up', d: 'A landing page or a waitlist that asks for an email.', unit: 'sign-ups', u1: 'sign-up', ok: 20, kill: 7 },
    commit: { l: 'Commit', d: 'A pre-order, a deposit or a paid pilot.', unit: 'commitments', u1: 'commitment', ok: 3, kill: 0 },
    /* v137 (116): what a growth check counts after the launch check said it works */
    back: { l: 'Came back', d: 'People who used it again after their first week. Count them; do not estimate.', unit: 'who came back', u1: 'who came back', ok: 10, kill: 3 },
    paid: { l: 'Paying', d: 'People who paid at the price you are testing, not who said they would.', unit: 'paying customers', u1: 'paying customer', ok: 5, kill: 1 }
  };
  /* which counts each kind offers: before and at launch, what people say and commit to; after Grow, sign-ups, who comes back, who pays */
  function pfMs(kind) { return kind === 'grow' ? ['signup', 'back', 'paid'] : ['talk', 'signup', 'commit']; }
  function pfKindL(kind) { return kind === 'launch' ? 'Launch check' : kind === 'grow' ? 'Growth check' : 'Test'; }
  var PF_ST = ['idea', 'validate', 'build', 'launch', 'grow'], PF_STL = { idea: 'Idea', validate: 'Validate', build: 'Build', launch: 'Launch', grow: 'Grow', stopped: 'Stopped' };
  var PF_OUT = { go: 'Go', narrow: 'Narrow', stop: 'Stop', grow: 'Keep going', keep: 'Keep doing it', drop: 'Drop it' };
  function pfTests(p) { return (p.pv && p.pv.tests) || []; }
  function pfCur(p) { var t = pfTests(p).filter(function (x) { return x.st === 'run'; }); return t[t.length - 1] || null; }
  function pfLast(p, kind) { var t = pfTests(p).filter(function (x) { return !kind || x.kind === kind; }); return t[t.length - 1] || null; }
  function pfVal(t) { return t.m === 'talk' ? t.log.filter(function (e) { return e.rec && e.pay; }).length : t.log.reduce(function (s, e) { return s + (e.n || 0); }, 0); }
  function pfEnd(t) { return new Date(t.due + 'T23:59:59').getTime(); }
  function pfLeft(t) { return Math.ceil((pfEnd(t) - Date.now()) / PRV_DAY); }
  /* where a test stands: run (still going), pass (reached the go line), fail (ended at or under the stop line), mixed (ended between) */
  function pfRes(t) { var v = pfVal(t); if (v >= t.ok) return 'pass'; if (Date.now() <= pfEnd(t)) return 'run'; return v <= t.kill ? 'fail' : 'mixed'; }
  function pfSuggest(t, res) { return res === 'pass' ? (t.kind === 'launch' ? 'grow' : t.kind === 'grow' ? 'keep' : 'go') : res === 'fail' ? (t.kind === 'grow' ? 'drop' : 'stop') : res === 'mixed' ? 'narrow' : ''; }
  function pfUnit(t, n) { var m = PF_M[t.m]; return n === 1 ? m.u1 : m.unit; }
  /* the first moment something entered Now. Projects built before Proof existed are building, without any mark */
  function pfFirstIn(p) {
    var m = Infinity, pv = p.pv;
    pv.items.forEach(function (x) { x.lg.forEach(function (e) { if (e.to === 'in' && e.ts < m) m = e.ts; }); });
    if (pv.base && pv.base.ts < m) m = pv.base.ts;
    pv.ships.forEach(function (s) { if (s.ts < m) m = s.ts; });
    return m;
  }
  function pfLegacy(p) {
    var pv = p.pv; if (pv.go || pv.anyway) return false;
    var t0 = pfTests(p).length ? pfTests(p)[0].ts : Infinity, fi = pfFirstIn(p);
    return fi !== Infinity && fi < t0;
  }
  function pfStage(p) {
    if (pdMode(p) !== 'product' || !p.pv) return '';
    var pv = p.pv;
    if (pv.stop) return 'stopped';
    if (pv.go || pv.anyway || pfLegacy(p)) return !pv.ships.length ? 'build' : pv.grow ? 'grow' : 'launch';
    return pfTests(p).length ? 'validate' : 'idea';
  }
  function pfPhaseN(p) { var s = pfStage(p); return s === 'stopped' ? (p.pv.stop.n || 2) : PF_ST.indexOf(s) + 1; }
  /* Now is where you build: closed to a product until Go (or a recorded Build anyway), and to any stopped project */
  function prvLocked(p) { if (p.kind !== 'private' || !p.pv) return false; if (p.pv.stop) return true; var s = pfStage(p); return s === 'idea' || s === 'validate'; }
  function pfArr(pv, k) { return pv[k] || (pv[k] = []); }
  function pfResText(t, res) {
    var v = pfVal(t), u = pfUnit(t, v);
    if (res === 'pass') return v + ' ' + u + ', at or over the go line of ' + t.ok + '.';
    if (res === 'fail') return 'Ended with ' + v + ' ' + u + ', at or under the stop line of ' + t.kill + '.';
    if (res === 'mixed') return 'Ended with ' + v + ' ' + u + ', between the stop line (' + t.kill + ') and the go line (' + t.ok + ').';
    return v + ' of ' + t.ok + ' ' + PF_M[t.m].unit + ' so far.';
  }
  function pfProgress(t) {
    var v = pfVal(t), max = Math.max(t.ok, v, 1) * 1.15, pos = function (n) { return Math.min(100, n / max * 100).toFixed(1); }, res = pfRes(t);
    return '<div class="pq-bar" data-r="' + res + '" role="img" aria-label="' + esc(v + ' ' + pfUnit(t, v) + '. Go at ' + t.ok + ', stop at ' + t.kill + ' or fewer.') + '"><i class="pq-fill" style="width:' + pos(v) + '%"></i><span class="pq-mk kill" style="left:' + pos(t.kill) + '%" title="Stop at ' + t.kill + ' or fewer"></span><span class="pq-mk ok" style="left:' + pos(t.ok) + '%" title="Go at ' + t.ok + '"></span></div>' +
      '<div class="pq-nums"><span><b>' + v + '</b> ' + esc(pfUnit(t, v)) + (t.m === 'talk' ? ' · ' + t.log.length + ' of ' + (t.n || 5) + ' interviews done' : '') + '</span><span class="pq-lines"><i class="ok"></i>Go at ' + t.ok + '<i class="kill"></i>Stop at ' + t.kill + ' or fewer</span></div>';
  }
  /* ---------- the Proof card on Validate ---------- */
  function pfFormHTML(p, kind) {
    var last = pfLast(p, kind), ms = pfMs(kind), m = last && ms.indexOf(last.m) > -1 ? last.m : kind === 'launch' ? 'commit' : kind === 'grow' ? 'signup' : 'talk', M = PF_M[m], days = kind === 'validate' ? 14 : 30, due = prvIso(Date.now() + days * PRV_DAY);
    var ql = { launch: 'What has to be true for this release to count as working?', grow: 'What do you want to grow, and what result means it works?' }[kind] || 'What is the riskiest thing you believe?';
    var qp = { launch: 'For example, studios that try v1 pay for it within a month', grow: 'For example, a weekly post in r/freelance brings 30 sign-ups this month' }[kind];
    var chs = (p.pv.channels || []).map(function (c) { return '<option value="' + esc(c.n) + '">'; }).join('');
    return '<form class="prv-f pq-f" data-pd-form="pf:new" data-k="' + kind + '" novalidate>' +
      '<div class="fld"><label for="pq-q">' + ql + ' <span class="opt">Required</span></label><textarea id="pq-q" name="q" rows="2" maxlength="160" placeholder="' + (qp ? qp : 'For example, freelancers will pay to stop chasing late invoices') + '">' + (last && kind === 'validate' && last.dec === 'narrow' ? esc(last.q) : '') + '</textarea></div>' +
      '<fieldset class="prv-pick pq-ms"><legend>' + (kind === 'grow' ? 'What will you count?' : 'How will you test it?') + '</legend>' + ms.map(function (k) { return '<label class="pq-m"><input type="radio" name="pfm" value="' + k + '"' + (k === m ? ' checked' : '') + '><span><b>' + PF_M[k].l + '</b><small>' + esc(PF_M[k].d) + '</small></span></label>'; }).join('') + '</fieldset>' +
      '<div class="pq-g"><div class="fld"><label for="pq-ch">Where will you find people? <span class="opt">Optional</span></label><input id="pq-ch" name="ch" maxlength="80" list="pq-chl" placeholder="For example, r/freelance" autocomplete="off"><datalist id="pq-chl">' + chs + '</datalist></div>' +
      '<div class="fld pq-n"' + (m === 'talk' ? '' : ' hidden') + '><label for="pq-n">Interviews planned</label><input id="pq-n" name="n" type="number" min="1" max="50" value="' + (M.n || 5) + '" inputmode="numeric"></div>' +
      '<div class="fld"><label for="pq-due">Ends on</label><input id="pq-due" name="due" type="date" value="' + due + '" min="' + prvIso(Date.now()) + '"></div></div>' +
      '<div class="pq-g pq-lns"><div class="fld"><label for="pq-ok">Go if at least <span class="opt pq-u">' + esc(M.unit) + '</span></label><input id="pq-ok" name="ok" type="number" min="1" max="100000" value="' + M.ok + '" inputmode="numeric"></div>' +
      '<div class="fld"><label for="pq-kill">Stop if at most <span class="opt pq-u">' + esc(M.unit) + '</span></label><input id="pq-kill" name="kill" type="number" min="0" max="100000" value="' + M.kill + '" inputmode="numeric"></div></div>' +
      '<p class="prv-hint pq-talk"' + (m === 'talk' ? '' : ' hidden') + '>A strong interview is someone who had the problem in the last 30 days and already spends money or time on it. “I would use it” does not count.</p>' +
      '<p class="prv-hint">Set both lines now, before you see a single result. That is what keeps the result honest.</p>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (kind === 'grow' ? 'Start the growth check' : 'Start the test') + '</button></div>' + prvErrSpan() + '</form>';
  }
  function pfLogHTML(t) {
    var body = t.m === 'talk' ?
      '<div class="fld"><label for="pq-who">Who <span class="opt">Optional, a first name or a role</span></label><input id="pq-who" name="who" maxlength="60" autocomplete="off"></div>' +
      '<label class="pd-chk"><input type="checkbox" name="rec"><span>They had the problem in the last 30 days</span></label><label class="pd-chk"><input type="checkbox" name="pay"><span>They already spend money or time on it</span></label>' :
      '<div class="pq-g"><div class="fld"><label for="pq-ln">How many</label><input id="pq-ln" name="n" type="number" min="1" max="100000" value="1" inputmode="numeric"></div><div class="fld"><label for="pq-lu">Link <span class="opt">Optional</span></label><input id="pq-lu" name="u" maxlength="300" placeholder="https://…" inputmode="url" autocomplete="off"></div></div>';
    return '<form class="prv-f pq-lf" data-pd-form="pf:log" novalidate>' + body + '<div class="fld"><label for="pq-ln2">Note <span class="opt">Optional</span></label><input id="pq-ln2" name="note" maxlength="160" placeholder="' + (t.m === 'talk' ? 'What they did, in their words' : 'Where they came from') + '" autocomplete="off"></div>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Add</button></div>' + prvErrSpan() + '</form>';
  }
  function pfDecideHTML(p) {
    var t = pfCur(p) || null, res = t ? pfRes(t) : '', kind = t ? t.kind : pfStage(p) === 'launch' ? 'launch' : 'validate', sug = t ? pfSuggest(t, res) : 'narrow';
    var opts = pfOuts(kind, t).map(function (k) {
      var d = { go: 'Build it. Now opens in Scope.', grow: 'It works. Keep building on it.', keep: 'It works. Keep doing it, and check the next thing.', drop: 'Stop this way of growing. The product goes on.', narrow: kind === 'grow' ? 'Change one thing (the channel, the price, the message), then check again.' : kind === 'launch' ? 'Change what you ship or who it is for, then check again.' : 'Change the bet, then run another test.', stop: kind === 'launch' ? 'Stop working on it. The record stays.' : 'Do not build it. The record stays, and you can reopen it.' }[k];
      return '<label class="pq-m"><input type="radio" name="o" value="' + k + '"' + (k === sug ? ' checked' : '') + '><span><b>' + PF_OUT[k] + (k === sug ? ' <span class="chip quiet">Suggested</span>' : '') + '</b><small>' + esc(d) + '</small></span></label>';
    }).join('');
    var head = t ? '<p class="pq-rs" data-r="' + res + '">' + esc(res === 'run' ? 'Deciding early. ' + pfResText(t, res) : pfResText(t, res)) + '</p>' : '<p class="pq-rs">No test is running. Without one you can narrow the bet or stop, but not Go.</p>';
    return '<form class="prv-f pq-df" data-pd-form="pf:dec" novalidate><h4 class="pd-eb">Decide</h4>' + head + '<fieldset class="prv-pick pq-ms"><legend class="sr-only">Decision</legend>' + opts + '</fieldset>' +
      '<div class="fld"><label for="pq-why">Because <span class="opt">Required</span></label><textarea id="pq-why" name="why" rows="2" maxlength="300" placeholder="What the result told you, in a sentence"></textarea></div>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Record decision</button></div>' + prvErrSpan() + '</form>';
  }
  /* the choices a decision offers: a growth check never stops the product */
  function pfOuts(kind, t) { return kind === 'grow' ? ['keep', 'narrow', 'drop'] : kind === 'launch' ? ['grow', 'narrow', 'stop'] : t ? ['go', 'narrow', 'stop'] : ['narrow', 'stop']; }
  function pfTestHTML(p, t, q) {
    var res = pfRes(t), left = pfLeft(t), ended = res !== 'run' && res !== 'pass' ? true : Date.now() > pfEnd(t);
    var h = '<div class="pq-t"><span class="pd-eb">' + pfKindL(t.kind) + ' · ' + PF_M[t.m].l + '</span><p class="pq-q">' + esc(t.q) + '</p>' +
      '<p class="pq-meta">' + (t.ch ? esc(t.ch) + ' · ' : '') + (ended ? 'Ended ' + esc(prvDate(pfEnd(t))) : 'Ends ' + esc(prvDate(pfEnd(t))) + ' · ' + (left <= 0 ? 'last day' : prvDay(left) + ' left')) + '</p>' + pfProgress(t);
    if (res !== 'run') h += '<p class="pq-rs" data-r="' + res + '">' + esc(pfResText(t, res)) + ' Decide what happens next.</p>';
    if (q.pf === 'log') h += pfLogHTML(t);
    else if (q.pf !== 'dec') h += '<div class="pq-acts"><button type="button" class="' + (res === 'run' ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-pd="pf:log">' + IC('plus') + 'Log a result</button><button type="button" class="' + (res === 'run' ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-pd="pf:dec">' + (res === 'run' ? 'Decide early' : 'Decide') + '</button></div>';
    var lg = t.log.slice().sort(function (a, b) { return b.ts - a.ts; });
    if (lg.length) h += '<ul class="pq-log">' + lg.slice(0, q.pfAll ? lg.length : 5).map(function (e) {
      var what = t.m === 'talk' ? (e.who ? esc(e.who) : 'Interview') + ' · ' + (e.rec && e.pay ? '<span class="chip ok">Strong</span>' : '<span class="chip quiet">' + (e.rec ? 'Has it, does not pay' : e.pay ? 'Pays, not recently' : 'Not a fit') + '</span>') : '+' + e.n + ' ' + esc(pfUnit(t, e.n));
      return '<li><span class="pq-lw">' + what + (e.note ? '<small>' + esc(e.note) + '</small>' : '') + '</span>' + (e.u ? '<a class="link" href="' + esc(sdHref(e.u)) + '" target="_blank" rel="noopener noreferrer">Link</a>' : '') + '<time>' + esc(prvDate(e.ts)) + '</time><button type="button" class="icon-sm xs" data-pd="pf:logrm" data-id="' + e.id + '" aria-label="Remove this result">' + IC('x') + '</button></li>';
    }).join('') + '</ul>' + (lg.length > 5 ? '<button type="button" class="link pq-more" data-pd="pf:logall">' + (q.pfAll ? 'Show fewer' : 'Show all ' + lg.length) + '</button>' : '');
    return h + '</div>';
  }
  function pfPastHTML(p) {
    var done = pfTests(p).filter(function (t) { return t.st === 'done'; }).slice().reverse();
    if (!done.length) return '';
    return '<details class="pq-past"><summary>Earlier tests <span class="n">' + done.length + '</span></summary><ul>' + done.map(function (t) {
      return '<li><span class="t">' + esc(prvT(t.q, 80)) + '<small>' + pfKindL(t.kind) + ' · ' + PF_M[t.m].l + ' · ' + pfVal(t) + ' of ' + t.ok + ' ' + esc(PF_M[t.m].unit) + '</small></span><span class="chip ' + (t.dec === 'go' || t.dec === 'grow' || t.dec === 'keep' ? 'ok' : t.dec === 'stop' ? 'crit' : 'neutral') + '">' + (PF_OUT[t.dec] || 'Ended') + '</span><time>' + esc(prvDate(t.dts || t.ts)) + '</time></li>';
    }).join('') + '</ul></details>';
  }
  function pfDecOf(p, k) { var o = p.pv[k]; return o && o.did ? prvById(p.pv.dec, o.did) : null; }
  function pfCard(p) {
    var q = pd.pv, pv = p.pv, st = pfStage(p), t = pfCur(p), body = '', chip = '<span class="chip ' + (st === 'stopped' ? 'neutral' : st === 'idea' || st === 'validate' ? '' : 'ok') + '">' + PF_STL[st] + '</span>';
    if (q.pf === 'new' || q.pf === 'launch' || q.pf === 'grow') body = pfFormHTML(p, q.pf === 'new' ? 'validate' : q.pf);
    else if (q.pf === 'dec') body = (t ? pfTestHTML(p, t, { pf: 'dec' }) : '') + pfDecideHTML(p);
    else if (st === 'stopped') {
      var sd = pfDecOf(p, 'stop');
      body = '<div class="pq-e"><b>Stopped ' + esc(prvDate(pv.stop.ts)) + '</b><p>' + esc(pv.stop.why) + '</p><p class="prv-hint">Stopping before you build is the cheapest result there is. The record stays.</p><div class="pq-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:reopen">Reopen</button>' + (sd ? '<button type="button" class="link" data-pd="prv:hgo" data-tab="decisions" data-id="' + sd.id + '">See the decision</button>' : '') + '</div></div>';
    } else if (t) body = pfTestHTML(p, t, q);
    else if (st === 'idea') body = '<div class="pq-e"><b>No test yet</b><p>Before you build, test the riskiest thing you believe. Set the line that means go and the line that means stop, then go and find out.</p><p class="prv-hint">Market research shows what exists. Only a test shows what people do.</p><div class="pq-acts"><button type="button" class="btn-primary btn-sm" data-pd="pf:new">Start a test</button></div></div>';
    else if (st === 'validate') body = '<div class="pq-e"><b>You narrowed the bet</b><p>Run the next test with what you learned, or stop here.</p><div class="pq-acts"><button type="button" class="btn-primary btn-sm" data-pd="pf:new">Start the next test</button><button type="button" class="btn-ghost btn-sm" data-pd="pf:dec">Stop…</button></div></div>';
    else if (st === 'launch') body = '<div class="pq-e"><b>' + esc((pv.ships[pv.ships.length - 1] || {}).name || 'v1') + ' shipped</b><p>Set a launch check: what result means it is working, and when you will look.</p><div class="pq-acts"><button type="button" class="btn-primary btn-sm" data-pd="pf:launch">Set a launch check</button></div></div>';
    else {
      var gd = pfDecOf(p, st === 'grow' ? 'grow' : 'go');
      if (gd) body = '<div class="pq-e"><b>' + (st === 'grow' ? 'Working' : 'Go') + ' · ' + esc(prvDate(gd.dts)) + '</b><p>' + esc(gd.because) + '</p>' +
        /* v137 (116): after Grow, the same discipline for growing: a channel, a price, who comes back */
        (st === 'grow' ? '<p class="prv-hint">Next: check one way of growing at a time. Set what result means it works before you look.</p>' : '') +
        '<div class="pq-acts">' + (st === 'grow' ? '<button type="button" class="btn-primary btn-sm" data-pd="pf:grow">Start a growth check</button>' : '') + '<button type="button" class="link" data-pd="prv:hgo" data-tab="decisions" data-id="' + gd.id + '">See the decision</button></div></div>';
      else if (pv.anyway) body = '<div class="pq-e warn"><b>Built without proof · ' + esc(prvDate(pv.anyway.ts)) + '</b><p>' + esc(pv.anyway.why) + '</p><p class="prv-hint">A test can still run while you build. A Go clears this mark.</p><div class="pq-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:new">Start a test</button></div></div>';
      else body = '<div class="pq-e"><b>No test on record</b><p>This project was building before Proof existed. A test can still tell you whether it is worth the rest of the work.</p><div class="pq-acts"><button type="button" class="btn-ghost btn-sm" data-pd="pf:new">Start a test</button></div></div>';
    }
    return '<section class="card pd-card pq-card" aria-labelledby="pd-h-pf"><div class="card-h ruled"><div><span class="pd-eb">Proof</span><h3 id="pd-h-pf">' + (t ? (t.kind === 'launch' || t.kind === 'grow' ? pfKindL(t.kind) : 'Test running') : st === 'stopped' ? 'Stopped' : st === 'idea' ? 'Before you build' : st === 'validate' ? 'Next test' : st === 'launch' ? 'After launch' : 'Decided') + '</h3><p>What real people do, measured against lines you set first.</p></div><div class="h-actions">' + chip + '</div></div><div class="pq-b">' + body + '</div>' + (q.pf ? '' : pfPastHTML(p)) + '</section>';
  }
