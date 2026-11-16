  /* ---------- the Scope Gate: every verdict is worked out on this device from the answers, never by an AI ---------- */
  /* written without accents ("dang nhap") or with them ("đăng nhập"), it is the same idea */
  function prvNT(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }
  /* small words that say nothing about what an item is, in English and in Vietnamese (without accents, as prvNT leaves them) */
  var PRV_STOP = { the: 1, and: 1, for: 1, with: 1, from: 1, into: 1, that: 1, this: 1, your: 1, our: 1, its: 1, cho: 1, cua: 1, cac: 1, nhung: 1, voi: 1, trong: 1, mot: 1, duoc: 1, theo: 1, nay: 1, khi: 1, thi: 1 };
  function prvWords(s) { return s.split(' ').filter(function (w) { return w.length > 2 && !PRV_STOP[w]; }); }
  function prvSame(a, b) {
    a = prvNT(a); b = prvNT(b); if (!a || !b) return false; if (a === b) return true;
    if (Math.min(a.length, b.length) >= 8 && (a.indexOf(b) > -1 || b.indexOf(a) > -1)) return true;
    var ta = prvWords(a), tb = prvWords(b);
    if (ta.length < 2 || tb.length < 2) return false;
    var n = ta.filter(function (w) { return tb.indexOf(w) > -1; }).length;
    return n / (ta.length + tb.length - n) >= 0.7;
  }
  function prvNever(p, t, skip) { return p.pv.items.filter(function (x) { return x.sec === 'out' && x.id !== skip && prvSame(x.t, t); })[0] || null; }
  function prvPrinc(p) { return p.pv.princ.filter(function (x) { return !x.rm; }); }
  /* a = { t, job, ship, size, viol, swap, skip, th }  ->  { complete, v: in|next|out, why, need, over, swapOk, notes, ... }
     th (does it serve the thesis: yes | partly | no) and the market are advice: they add notes, never change where the item goes */
  function prvGate(p, a) {
    var pv = p.pv, hasJobs = prvJobs(p).length > 0, days = a.size ? prvSzD(p, a.size) : 0, ld = prvLoad(p), cap = pv.rel.cap || 0, on = prvRelOn(p);   /* v97 (43): without a release, the Gate asks whether the project needs it now */
    var viol = a.viol && a.viol !== 'none' ? prvById(pv.princ, a.viol) : null, job = a.job && a.job !== 'none' ? prvById(pv.jobs, a.job) : null, dup = prvNever(p, a.t, a.skip);
    var hasPr = prvPrinc(p).length > 0, asked = (hasJobs ? 1 : 0) + 2 + (hasPr ? 1 : 0), got = (hasJobs && a.job ? 1 : 0) + (a.ship ? 1 : 0) + (a.size ? 1 : 0) + (hasPr && a.viol ? 1 : 0);
    var r = { complete: got === asked, got: got, asked: asked, v: 'next', why: '', need: false, over: 0, swapOk: false, hold: false, dup: dup, viol: viol, job: job, days: days, load: ld.days, cap: cap };
    r.notes = [];
    if (!r.complete) return r;
    if (viol) { r.v = 'out'; r.why = 'It breaks a principle you wrote down: “' + prvT(viol.t, 70) + '”.'; }
    else if (dup) { r.v = 'out'; r.why = 'You already ruled this out: “' + prvT(dup.t, 60) + '”' + (dup.why ? ' (' + prvT(dup.why, 70) + ')' : '') + '.'; }
    else if (hasJobs && a.job === 'none' && a.size === 'L') { r.v = 'out'; r.why = 'It answers no job and costs ' + prvSzText(p, 'L') + '. That is how a side feature eats ' + (on ? 'a release.' : 'the work.'); }
    else if (a.ship === 'need' && (!hasJobs || job)) {
      var after = ld.days + days, base = (on ? 'The release cannot ship without it' : 'The project cannot do without it now') + (job ? ', and it answers “' + prvT(job.t, 50) + '”' : '') + '.';
      if (cap && after > cap) {
        r.need = true; r.hold = true; r.over = after - cap;
        var sw = a.swap && prvById(pv.items, a.swap), rest = sw && sw.sec === 'in' ? after - prvDays(sw, p) - cap : 0;
        if (sw && sw.sec === 'in' && rest <= 0) { r.v = 'in'; r.swapOk = true; r.hold = false; r.why = base + ' It fits once “' + prvT(sw.t, 40) + '” moves to Next.'; }
        else if (sw && sw.sec === 'in') { r.why = 'Even without “' + prvT(sw.t, 40) + '”, Now would still run ' + prvDay(rest) + ' over its budget of ' + prvDay(cap) + '.'; }
        else r.why = (ld.left ? 'Now has ' + prvDay(ld.left) + ' free of ' + cap + '.' : 'Now is full at ' + prvDay(cap) + '.') + ' This needs ' + days + ', and the release cannot ship without it. Swap one item to Next, or decide anyway and say why.';
      } else { r.v = 'in'; r.why = base + (cap ? ' It fits: ' + (after) + ' of ' + prvDay(cap) + '.' : ''); }
    }
    else if (a.ship === 'need') r.why = on ? 'It blocks the release but answers no job. Check that a customer needs it before it takes a slot.' : 'It is needed now but answers no job. Check that a customer needs it before it takes a slot.';
    else r.why = !on ? (a.ship === 'weak' ? 'The project manages without it for now, only weaker. It can wait in Next.' : 'The project manages fine without it for now. It can wait in Next.') : a.ship === 'weak' ? 'The release ships without it, only weaker. It can wait for the next version.' : 'The release ships fine without it. It can wait for the next version.';
    if (p.thesis && a.th === 'no') r.notes.push('It does not serve your thesis: “' + prvT(p.thesis, 70) + '”. Make sure that is deliberate.');
    if (job && prvJobClass(p, job) === 'taken') r.notes.push('Rivals already serve “' + prvT(job.t, 50) + '”. Unless your wedge changes that, this is catch-up work.');
    return r;
  }
  /* the sentence a Scope decision keeps */
  function prvGateWhy(p, a, g, bucket, ovw) {
    var pv = p.pv, bits = [], sz = prvSzD(p, a.size);
    if (prvJobs(p).length) bits.push(g.job ? 'Answers “' + prvT(g.job.t, 60) + '”.' : 'Answers no job.');
    bits.push((prvRelOn(p) ? { need: 'Cannot ship without it.', weak: 'Ships, but weaker without it.', fine: 'Ships fine without it.' } : { need: 'Needed now.', weak: 'Helps, but can wait.', fine: 'Can wait.' })[a.ship]);   /* v97 (43) */
    bits.push('Size ' + a.size + ' (about ' + prvDay(sz) + ').');
    bits.push(g.viol ? 'Breaks “' + prvT(g.viol.t, 60) + '”.' : (prvPrinc(p).length ? 'Breaks no principle.' : ''));
    if (p.thesis) bits.push({ yes: 'Serves the thesis.', partly: 'Partly serves the thesis.', no: 'Does not serve the thesis.' }[a.th] || 'Thesis not evaluated.');
    bits.push(g.hold ? 'Gate says Now is full.' : 'Gate says ' + PRV_BN[g.v] + '.');
    if (bucket !== g.v || g.hold) bits.push('Overridden to ' + PRV_BN[bucket] + ': ' + ovw);
    return bits.filter(Boolean).join(' ');
  }
  function prvCompAge(p, c) { var ts = c.chk || 0; c.src.forEach(function (n) { var s = prvSrc(p, n); if (s && s.ts > ts) ts = s.ts; }); return ts ? prvAge(ts) : null; }
  function prvStale(p) { return p.pv.comps.filter(function (c) { var a = prvCompAge(p, c); return a !== null && a > PRV_STALE; }); }
  function prvKeys(p) {
    var pv = p.pv, used = {}, jk = {}, ck = {};
    function key(base) { var b = slug(base), k = b, i = 2; while (used[k]) k = b + '-' + (i++); used[k] = 1; return k; }
    pv.jobs.forEach(function (j) { jk[j.id] = key(j.t); }); used = {};
    pv.comps.forEach(function (c) { ck[c.id] = key(c.n); });
    return { jk: jk, ck: ck };
  }
  /* how fresh the market work is: AI research and your own reviews both count */
  function prvCad(p) {
    var imp = p.pv.imp, any = 0, deep = 0, last = null, c;
    imp.forEach(function (e) { if (e.mode === 'challenge') return; if (e.ts > any) { any = e.ts; last = e; } if ((e.mode === 'discover' || e.mode === 'refresh_quarterly') && e.ts > deep) deep = e.ts; });
    c = { any: any, deep: deep, last: last, has: p.pv.jobs.length + p.pv.comps.length > 0, due: false, next: 0, mode: 'discover' };
    if (!any) return c;
    c.next = any + PRV_MONTH * PRV_DAY;
    c.mode = !deep ? 'discover' : c.next - deep >= PRV_QUARTER * PRV_DAY ? 'refresh_quarterly' : 'refresh_monthly';
    c.due = Date.now() >= c.next;
    return c;
  }
  function prvRsCard(p) {
    var c = prvCad(p), st, chip = '', t, sub, a;
    if (!c.any) {
      st = 'none'; t = c.has ? 'No AI research yet' : 'Start with an AI research pass';
      sub = c.has ? 'You built this map by hand. An AI pass with web search can find rivals and demand you missed.' : 'Copy a prompt into an AI model with web search. It returns the jobs, rivals and evidence that start your map.';
      a = '<button type="button" class="btn-primary btn-sm" data-pd="prv:mai">' + IC('search') + 'Research with AI</button>';
    } else if (c.due) {
      st = 'due'; chip = '<span class="chip warn">Review due</span>'; t = 'The market review is due';
      sub = 'Last update ' + prvRuns(c.any) + ' ago · ' + PRV_MODE[c.last.mode][0] + ', ' + prvDate(c.any) + '. Prices, features and rivals keep moving.';
      a = '<button type="button" class="btn-ghost btn-sm" data-pd="prv:mrev">Mark reviewed</button><button type="button" class="btn-primary btn-sm" data-pd="prv:mai">' + IC('search') + 'Refresh with AI</button>';
    } else {
      st = 'ok'; chip = '<span class="chip ok">Up to date</span>'; t = 'Last update ' + prvDate(c.any);
      sub = PRV_MODE[c.last.mode][0] + ' · next review due ' + prvDate(c.next) + '.';
      a = '<button type="button" class="btn-ghost btn-sm" data-pd="prv:mai">' + IC('search') + 'Research with AI</button>';
    }
    var lq = c.last && c.last.q && c.last.q.length ? '<details class="prv-qs"><summary>' + c.last.q.length + (c.last.q.length === 1 ? ' search' : ' searches') + ' in the last pass</summary><ul>' + c.last.q.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' : '';
    return '<section class="card prv-rcd" data-st="' + st + '" aria-label="AI research"><div class="prv-rcd-m"><span class="prv-rcd-ic" aria-hidden="true">' + IC(st === 'ok' ? 'check' : st === 'due' ? 'clock' : 'search') + '</span><div><b>' + esc(t) + chip + '</b><small>' + esc(sub) + '</small>' + lq + '</div></div><div class="prv-rcd-a">' + a + '</div></section>';
  }
  function prvRetCard(p) {
    var r = p.pv.ret; if (!r.length) return '';
    return '<section class="card pd-card" aria-labelledby="pd-h-rt"><div class="card-h ruled"><div><h3 id="pd-h-rt">Retired</h3><p>Set aside after an AI review. Nothing was deleted.</p></div><div class="h-actions"><span class="count">' + r.length + '</span></div></div><ul class="prv-rtl">' + r.map(function (x) {
      return '<li><div><b>' + esc(x.kind === 'job' ? x.d.t : x.d.n) + '</b><small>' + (x.kind === 'job' ? 'Job' : x.d.sub ? 'Substitute' : 'Competitor') + ' · ' + esc(prvDate(x.ts)) + (x.why ? ' · ' + esc(x.why) : '') + '</small></div><button type="button" class="btn-ghost btn-sm" data-pd="prv:retrest" data-id="' + x.id + '">' + IC('swap') + 'Restore</button></li>';
    }).join('') + '</ul></section>';
  }
  function prvOpenDec(p) { return p.pv.dec.filter(function (d) { return d.st === 'open'; }); }

