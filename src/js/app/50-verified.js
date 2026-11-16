  /* ---------- v69: Done is not Verified (CONTRACT.md, section 31); v97: Tested is not Verified either (45) ----------
     Functions only, no top-level values: earlier files draw with these before this file has run.
     Done is what someone said. Tested is what the work was measured against: every "Done when" line checked, and the checks on its
     merged pull requests passed. Verified is a check someone recorded by hand (a checkpoint, u.cp): how they checked, what they found,
     who, when, against which lines. Nothing here blocks Done.
     Answers null when the work is not done, else { k, t, why, cp }, the first that applies:
       fail     Not verified: checks failed on a merged pull request
       open     Not verified: "Done when" lines still open
       cfail    Check failed: the last check someone recorded failed
       pending  Checks running on a merged pull request
       stale    Check again: the last check passed, but its "Done when" lines changed or a pull request was merged after it (113)
       ok       Verified: the last check someone recorded passed
       tested   Tested: every "Done when" line holds and/or checks passed, and nobody has recorded a check yet
       none     Done, with nothing to measure it against */
  function wkVer(p, u) {
    if (!u || u.st !== 'done') return null;
    var rec = x9Rec(p, u.id);
    return wkVer0(u.dod || [], (rec && rec.gh) || [], u.cp || []);
  }
  /* the same from the "Done when" lines, the linked GitHub items and the checks recorded (tests call it with ?test) */
  function wkVer0(dod, gh, cp) {
    var open = dod.filter(function (c) { return !c.ok; }).length, last = cp && cp.length ? cp[cp.length - 1] : null;
    var prs = gh.filter(function (e) { return e.k === 'pull' && e.st === 'merged'; });
    var fail = prs.filter(function (e) { return e.ck === 'fail'; }), run = prs.filter(function (e) { return e.ck === 'pending'; }), pass = prs.filter(function (e) { return e.ck === 'pass'; });
    var sx = wkCpStale(dod, prs, last), o = { n: dod.length, open: open, fail: fail.map(x9Short).join(', '), run: run.map(x9Short).join(', '), pass: pass.map(x9Short).join(', '), cp: last };
    if (fail.length) { o.k = 'fail'; o.t = 'Not verified'; o.why = 'checks failed on ' + o.fail; }
    else if (open) { o.k = 'open'; o.t = 'Not verified'; o.why = open + ' of ' + dod.length + ' done-when checks open'; }
    else if (last && last.r === 'fail') { o.k = 'cfail'; o.t = 'Check failed'; o.why = 'its last check failed'; }
    else if (run.length) { o.k = 'pending'; o.t = 'Checks running'; o.why = 'checks still running on ' + o.run; }
    else if (sx) { o.k = 'stale'; o.t = 'Check again'; o.lines = sx.lines; o.after = sx.after; o.why = sx.lines && sx.after ? 'its done-when lines changed and ' + sx.after + ' was merged after its last check' : sx.lines ? 'its done-when lines changed after its last check' : sx.after + ' was merged after its last check'; }
    else if (last) { o.k = 'ok'; o.t = 'Verified'; o.why = 'checked by hand'; }
    else if (!dod.length && !pass.length) { o.k = 'none'; o.t = 'Done'; o.why = 'nothing to check it against'; }
    else { o.k = 'tested'; o.t = 'Tested'; o.why = [dod.length ? (dod.length === 1 ? 'its done-when check' : 'all ' + dod.length + ' done-when checks') : '', o.pass ? 'checks passed on ' + o.pass : ''].filter(Boolean).join(' and '); }
    return o;
  }
  /* v136 (113): a passed check goes out of date, it is never rewritten. Answers null while it still holds, else { lines, after }:
     lines when the "Done when" lines now differ from the ones it was measured against (added, removed or reworded; ticking one is
     not a change), after the merged pull requests (as "PR #15, PR #16") merged after the check was recorded */
  function wkCpLn(s) { return String(s == null ? '' : s).replace(/^[✓○] /, '').replace(/\s+/g, ' ').trim(); }
  function wkCpStale(dod, prs, c) {
    if (!c || c.r !== 'pass') return null;
    var was = Array.isArray(c.dod) ? c.dod.map(wkCpLn).sort().join('\n') : null, now = dod.map(function (x) { return wkCpLn(x.t); }).sort().join('\n');
    var lines = was !== null && was !== now, after = prs.filter(function (e) { return e.mg && c.ts && e.mg > c.ts; }).map(x9Short).join(', ');
    return lines || after ? { lines: lines, after: after } : null;
  }
  /* what the chip says when pointed at: one whole sentence each, so the language layer has a line for every one */
  function wkVerTip(v, p) {
    if (v.k === 'stale') { var w = p ? x7Name(p, v.cp.by) : 'someone', d = prvDate(v.cp.ts);
      return v.lines && v.after ? 'Verified on ' + d + ' by ' + w + ', before its done-when lines changed and ' + v.after + ' was merged. Check it again.' :
        v.lines ? 'Verified on ' + d + ' by ' + w + ', before its done-when lines changed. Check it again.' : 'Verified on ' + d + ' by ' + w + ', before ' + v.after + ' was merged. Check it again.'; }
    if (v.k === 'fail') return 'Not verified: checks failed on ' + v.fail + '.';
    if (v.k === 'open') return 'Not verified: ' + v.open + ' of ' + v.n + ' done-when checks open.';
    if (v.k === 'pending') return 'Checks are still running on ' + v.run + '.';
    if (v.k === 'ok' || v.k === 'cfail') return wkCpSays(p, v.cp);
    var t = v.n && v.pass ? (v.n === 1 ? 'Tested: its done-when check holds, and checks passed on ' + v.pass : 'Tested: all ' + v.n + ' done-when checks hold, and checks passed on ' + v.pass) + '.' :
      v.n ? (v.n === 1 ? 'Tested: its done-when check holds.' : 'Tested: all ' + v.n + ' done-when checks hold.') : 'Tested: checks passed on ' + v.pass + '.';
    return t + ' Record a check to verify it.';
  }
  /* a checkpoint in one sentence: "Verified on 28 Oct by Lan Anh: “Tried it on a real phone”." */
  function wkCpSays(p, c) {
    if (!c) return '';
    var who = p ? x7Name(p, c.by) : 'someone', when = prvDate(c.ts);
    return (c.r === 'pass' ? 'Verified on ' + when + ' by ' + who + ': “' + c.m + '”.' : 'Check failed on ' + when + ' by ' + who + ': “' + c.m + '”.') + (c.n ? ' ' + (c.r === 'pass' ? 'Note' : 'What failed') + ': “' + c.n + '”.' : '');
  }
  /* the chip beside a piece of work that is done; nothing for Done with nothing to check, so a list does not shout */
  function wkVerChip(p, u) {
    var v = wkVer(p, u); if (!v || v.k === 'none') return '';
    return '<span class="chip ' + { ok: 'ok', open: 'warn', fail: 'crit', cfail: 'crit', stale: 'warn', pending: 'neutral', tested: 'neutral' }[v.k] + ' wk-ver ' + v.k + '" title="' + esc(wkVerTip(v, p)) + '">' + (v.k === 'ok' ? IC('tick') : '') + esc(v.t) + '</span>';
  }
  /* how many of the done pieces are verified: { done, ok, tested, not: [units not verified] } */
  function wkVerCount(p) {
    var r = { done: 0, ok: 0, tested: 0, not: [] };
    wkUnits(p).forEach(function (u) { var v = wkVer(p, u); if (!v) return; r.done++; if (v.k === 'ok') r.ok++; else if (v.k === 'tested') r.tested++; else if (v.k === 'open' || v.k === 'fail' || v.k === 'cfail' || v.k === 'stale') r.not.push({ u: u, v: v }); });
    return r;
  }
  /* Needs: work called done that what it was measured against does not back up yet */
  function wkVerNeeds(p) {
    if (!p.team.length && p.kind !== 'private') return [];
    var c = wkVerCount(p), n = c.not.length; if (!n) return [];
    var f = c.not[0], team = p.team.length > 0;
    var o = { t: n === 1 ? '1 item is done but not verified' : n + ' items are done but not verified', chip: c.not.some(function (x) { return x.v.k === 'fail' || x.v.k === 'cfail'; }) ? 'crit' : 'warn', chipT: 'Not verified', tab: team ? 'team' : 'scope',
      p: f.v.k === 'fail' ? '“' + prvT(f.u.t, 36) + '”: checks failed on ' + f.v.fail + '.' : f.v.k === 'cfail' ? '“' + prvT(f.u.t, 36) + '”: its last check failed.' : f.v.k === 'stale' ? '“' + prvT(f.u.t, 36) + '”: verified before a change. Check it again.' : '“' + prvT(f.u.t, 36) + '”: ' + f.v.open + ' of ' + f.v.n + ' done-when checks open.' };
    if (team) o.f = 'wk';
    return [o];
  }

  /* ---------- v97: recording a check (45). A checkpoint is only ever added; the last one is what counts ----------
     u.cp, on the work's record (a private Scope item, or p.work[id]) = [ { id, ts, by, m, r: 'pass'|'fail', n, dod: [the lines as they
     were, ✓ or ○], pr: 'PR #12, PR #14' (merged, with passing checks, then) } ] */
  function wkCpMax() { return 20; }
  /* the line under a done row: the last check, who and when */
  function wkCpLine(p, u) {
    var c = u.st === 'done' && u.cp && u.cp.length ? u.cp[u.cp.length - 1] : null; if (!c) return '';
    var old = c.r === 'pass' && (wkVer(p, u) || {}).k === 'stale';   /* 113: the check stands as it was, said to be from before a change */
    var more = u.cp.length > 1 ? ' <span class="wk-cpn">' + (u.cp.length === 2 ? '1 earlier check' : (u.cp.length - 1) + ' earlier checks') + '</span>' : '';
    return '<small class="wk-why ' + (old ? 'back' : c.r === 'pass' ? 'ok' : 'back') + ' wk-cpl"><b>' + (old ? 'Verified before a change.' : c.r === 'pass' ? 'Verified.' : 'Check failed.') + '</b> ' + esc(prvDate(c.ts) + ', ' + x7Name(p, c.by) + ': “' + prvT(c.m, 90) + '”') + (c.n ? ' <span class="wk-cpnote">' + esc('“' + prvT(c.n, 90) + '”') + '</span>' : '') + more + '</small>';
  }
  function wkCpBtn(p, u, mwr, cls) {
    if (u.st !== 'done' || !x9Can(p, u)) return '';
    return '<button type="button" class="' + (cls || 'x9-add') + ' wk-cpb' + (u.cp && u.cp.length ? ' has' : '') + '" ' + (mwr ? 'data-mw="cp" data-pj="' + esc(p.id) + '"' : 'data-pd="wk:cp"') + ' data-id="' + esc(u.id) + '" aria-label="Record a check on ' + esc(u.t) + '" title="Record a check">' + IC('tick') + '</button>';
  }
  function wkCpOpen(p, id, h) {
    var u = wkUnit(p, id); if (!u) return;
    if (!x9Can(p, u)) { x8No(p); return; }
    var q = h.q(); q.sk = h.key(p, id); q.sf = 'cp'; h.re(h.sr);
  }
  function wkCpPrs(p, u) { var rec = x9Rec(p, u.id); return ((rec && rec.gh) || []).filter(function (e) { return e.k === 'pull' && e.st === 'merged' && e.ck === 'pass'; }); }
  function wkCpForm(p, u, mwr) {
    var fa = mwr ? 'data-mw-form="cp" data-pj="' + esc(p.id) + '"' : 'data-pd-form="wk:cp"', cancel = mwr ? 'data-mw="cancel" data-pj="' + esc(p.id) + '"' : 'data-pd="wk:cancel"', sr = mwr ? 'mw-sr' : 'wk-sr', prs = wkCpPrs(p, u);
    var crit = u.dod.length ? '<ul class="wk-cpc">' + u.dod.map(function (c) { return '<li' + (c.ok ? ' class="ok"' : '') + '>' + (c.ok ? IC('tick') : '') + '<span>' + esc(c.t) + '</span></li>'; }).join('') + '</ul>' : '<p class="prv-hint">No Done when lines. Say what you checked it against.</p>';
    return '<li class="prv-fw"><form class="prv-f wk-sf wk-cpf" ' + fa + ' data-id="' + esc(u.id) + '" novalidate><p class="x7-fh">' + IC('shield') + '<span>Record a check on “' + esc(prvT(u.t, 60)) + '”. It is kept as it is: a later check is added, never written over.</span></p>' +
      '<div class="wk-cpk"><span class="pd-eb">Measured against</span>' + crit + (prs.length ? '<p class="prv-hint">Checks passed on ' + esc(prs.map(x9Short).join(', ')) + '.</p>' : '') + '</div>' +
      '<div class="fld" id="f-' + sr + '"><label for="' + sr + '">How did you check it? <span class="opt">Required</span></label><input id="' + sr + '" name="m" maxlength="140" placeholder="For example, tried it on a real phone with a new account" autocomplete="off"></div>' +
      '<fieldset class="prv-pick wk-cpr"><legend>Result</legend>' + prvOptChip('radio', 'r', 'pass', 'It works', false) + prvOptChip('radio', 'r', 'fail', 'It does not work', false) + '</fieldset>' +
      '<div class="fld"><label for="' + sr + '-n">What did you see? <span class="opt">Required if it does not work</span></label><input id="' + sr + '-n" name="n" maxlength="200" autocomplete="off"></div>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + cancel + '>Cancel</button><button type="submit" class="btn-primary btn-sm">Record check</button></div>' + prvErrSpan() + '</form></li>';
  }
  function wkCpSubmit(f, h, p, u) {
    var m = prvText(f.elements.m.value), rr = f.querySelector('input[name="r"]:checked'), r = rr ? rr.value : '', nt = prvText(f.elements.n.value), q = h.q(), ti = prvT(u.t, 40);
    if (m.length < 3) return prvErr(f, 'm', 'Say how you checked it, in a few words.');
    if (!r) return prvErr(f, 'r', 'Choose whether it works.');
    if (r === 'fail' && nt.length < 3) return prvErr(f, 'n', 'Say what does not work, so it can be fixed.');
    var c = { id: prvId('k'), ts: Date.now(), by: 'You', m: m, r: r, n: nt, dod: u.dod.map(function (x) { return (x.ok ? '✓ ' : '○ ') + x.t; }), pr: wkCpPrs(p, u).map(x9Short).join(', ') };
    var list = (u.cp || []).concat([c]).slice(-wkCpMax());
    q.sk = null; q.sf = '';
    wkApply(p, function () { wkSet(p, u.id, { cp: list }); }, r === 'pass' ? 'You verified “' + ti + '”: ' + m : 'You recorded a failed check on “' + ti + '”: ' + nt, r === 'pass' ? '“' + ti + '” is verified' : 'The check on “' + ti + '” failed', h.sel(p, u.id) + ' .wk-cpb', u.id, h);
  }

  /* v69: an empty next step offers the work that is already under way, one click from being the next step */
  function x6NextUnit0(p) { return wkUnits(p).filter(function (x) { return x.st !== 'done'; }).sort(function (a, b) { return (a.st === 'doing' ? 0 : 1) - (b.st === 'doing' ? 0 : 1); })[0] || null; }
  function x6NextPick(p) { var u = x6NextUnit0(p); return u ? '<p class="pd-sub x6-pick"><span>' + (u.st === 'doing' ? 'In progress' : 'First in Now') + '</span> <b>' + esc(prvT(u.t, 60)) + '</b></p>' : ''; }
  function x6NextPickBtn(p) { var u = x6NextUnit0(p); return u ? '<button type="button" class="btn-ghost btn-sm" data-pd="x6:nuse" data-id="' + esc(u.id) + '">Make it the next step</button>' : ''; }
  if (sdTest()) window.__ver = function (dod, gh, cp) { var v = wkVer0(dod || [], gh || [], cp || []); v.tip = v.k === 'none' ? '' : wkVerTip(v); delete v.cp; return v; };
