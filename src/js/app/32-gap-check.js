  /* ---------- gap check: everything below is computed on this device from the jobs, ratings and sources ---------- */
  function prvT(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function prvList(a) { return a.length < 2 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  /* fills in what a seed leaves out, so every project has the same shape */
  function prvNorm(pv) {
    pv.jobs = pv.jobs || []; pv.wedge = pv.wedge || { t: '', job: '' }; pv.asm = pv.asm || { win: [], weak: [], risk: [] }; pv.vlog = pv.vlog || []; pv.imp = pv.imp || []; pv.ret = pv.ret || [];
    pv.asm.q = pv.asm.q || [];   /* v97 (44): an internal project's open questions */
    pv.rel = pv.rel || { name: 'v1', ship: '', date: '', cap: 0 }; pv.rl = pv.rl || []; pv.princ = pv.princ || []; pv.ships = pv.ships || [];
    /* v111: before the price options had values, a rival priced Free in Vietnamese was saved as the word shown (Miễn phí) */
    var fr = window.SDI18N && SDI18N.to ? SDI18N.to('vi', 'Free') : '';
    if (fr && fr !== 'Free') (pv.comps || []).forEach(function (c) { if (c.price === fr) c.price = 'Free'; });
    return pv;
  }
  /* the pages of live, real rivals. A rival's own pricing page proves the market is served, not that a gap is open */
  function prvCompSrc(p) {
    var s = {}; if (!p) return s;
    p.pv.comps.forEach(function (c) { if (c.sub || c.dead) return; c.src.forEach(function (n) { s[n] = 1; }); Object.keys(c.cov).forEach(function (k) { if (c.cov[k].s) s[c.cov[k].s] = 1; }); });
    return s;
  }
  function prvDemand(j, p, cs) {
    cs = cs || prvCompSrc(p);
    var strong = 0, served = 0, unsrc = 0, kinds = [], hosts = [], srcs = [];
    j.dem.forEach(function (e) {
      if (!e.src) unsrc++;
      if ((e.k === 'paid' || e.k === 'workaround') && e.src) {
        if (cs[e.src]) { served++; return; }
        strong++; srcs.push(e.src); if (kinds.indexOf(e.k) < 0) kinds.push(e.k);
        var so = p && prvSrc(p, e.src), h = so ? so.host : String(e.src); if (hosts.indexOf(h) < 0) hosts.push(h);
      }
    });
    return { lv: strong ? 'strong' : served ? 'served' : j.dem.length ? 'weak' : 'none', strong: strong, served: served, unsrc: unsrc, n: j.dem.length, kinds: kinds, hosts: hosts, srcs: srcs };
  }
  /* two real rivals that each cover part of a job, or one that covers part of it for free, leave no gap worth the name */
  function prvContested(p, j) {
    var part = p.pv.comps.filter(function (c) { return !c.sub && !c.dead && c.cov[j.id] && c.cov[j.id].l === 'partial'; });
    return part.length >= 2 || part.some(function (c) { return c.price === 'Free'; });
  }
  function prvBest(p, j, real) {
    var best = -1, by = [], un = 0, names = ['none', 'partial', 'full'];
    p.pv.comps.forEach(function (c) {
      if (c.dead || (real && c.sub)) return;
      var v = c.cov[j.id];
      if (!v) { un++; return; }
      var r = PRV_RANK[v.l];
      if (r > best) { best = r; by = [c]; } else if (r === best) by.push(c);
    });
    return { best: best < 0 ? null : names[best], by: by, un: un };
  }
  function prvJobClass(p, j) {
    var d = prvDemand(j, p), b = prvBest(p, j);
    if (b.best === null) return 'unknown';
    /* only a real rival takes a job. A substitute that does it in full is what people work around with: the workaround is the
       demand, so it cannot cancel itself (the verdict warns about it instead) */
    if (d.lv === 'strong' || d.lv === 'served') return prvBest(p, j, true).best === 'full' || d.lv === 'served' || prvContested(p, j) ? 'taken' : 'gap';
    return b.best === 'none' ? 'empty' : 'minor';
  }
  function prvJobItems(p, j) { return p.pv.items.filter(function (x) { return x.sec === 'in' && j.items.indexOf(x.id) > -1; }); }
  function prvUnverified(p) {
    var pv = p.pv, seen = {}, out = [];
    function add(n) { var s = n && prvSrc(p, n); if (s && s.ai && !s.ver && !seen[n]) { seen[n] = 1; out.push(n); } }
    pv.jobs.forEach(function (j) { j.dem.forEach(function (e) { add(e.src); }); });
    pv.comps.forEach(function (c) { c.src.forEach(add); Object.keys(c.cov).forEach(function (k) { add(c.cov[k].s); }); });
    return out.sort(function (a, b) { return a - b; });
  }
  function prvVerdict(p) {
    var pv = p.pv, jobs = pv.jobs, comps = pv.comps.filter(function (c) { return !c.dead; }), real = comps.filter(function (c) { return !c.sub; }).length, subs = comps.length - real, cs = prvCompSrc(p);
    var rows = jobs.map(function (j) { return { j: j, cl: prvJobClass(p, j), d: prvDemand(j, p, cs), b: prvBest(p, j), rb: prvBest(p, j, true) }; });
    var by = { gap: [], taken: [], empty: [], minor: [], unknown: [] }, rated = 0, strong = 0, unsrc = 0, noRate = 0, fUn = null, fNr = null;
    rows.forEach(function (r) {
      by[r.cl].push(r); if (r.d.lv === 'strong') strong++;
      var u = r.d.unsrc;
      comps.forEach(function (c) { var v = c.cov[r.j.id]; if (v) { rated++; if (!v.s) u++; } else { noRate++; if (!fNr) fNr = r.j; } });
      if (u) { unsrc += u; if (!fUn) fUn = r.j; }
    });
    var cells = jobs.length * comps.length, k, why = '', st = prvStale(p), unv = prvUnverified(p), w = [], t0, subf = null;
    if (!jobs.length && !comps.length) k = 'none';
    else if (jobs.length < 2 || real < 2 || !rated || by.unknown.length === jobs.length) k = 'thin';
    else if (by.gap.length) k = 'open';
    else if (by.taken.length) k = 'crowded';
    else if (by.empty.length) k = 'empty';
    else k = 'thin';
    if (k === 'open') {
      t0 = by.gap[0].j.t;
      why = (by.gap.length === 1 ? 'One job has demand from outside the rivals’ own pages, and no rival covers it in full: “' + prvT(t0, 60) + '”.' : by.gap.length + ' jobs have demand from outside the rivals’ own pages, and no rival covers them in full, starting with “' + prvT(t0, 60) + '”.') + ' Worth a test, not proof.';
      /* a job is taken also when its demand is already served; only one a rival covers in full is said to be covered in full */
      var tf = by.taken.filter(function (r) { return r.rb.best === 'full'; })[0];
      if (tf) why += '\n' + prvList(tf.rb.by.slice(0, 2).map(function (c) { return c.n; })) + (tf.rb.by.length > 1 ? ' already cover “' : ' already covers “') + prvT(tf.j.t, 44) + '” in full.';
    } else if (k === 'crowded') {
      var owners = []; by.taken.forEach(function (r) { r.rb.by.forEach(function (c) { if (owners.indexOf(c.n) < 0) owners.push(c.n); }); });
      why = 'Every job with proven demand is already served' + (owners.length ? ' by ' + prvList(owners.slice(0, 3)) + (owners.length > 3 ? ' and others' : '') : '') + '. Unless your wedge changes that, this would be a me-too.';
    } else if (k === 'empty') {
      t0 = by.empty[0].j.t;
      why = (by.empty.length === 1 ? 'Nobody covers “' + prvT(t0, 60) + '”, and nothing proves anyone wants it.' : 'Nobody covers ' + by.empty.length + ' of your jobs, and nothing proves anyone wants them.') + ' This is how products nobody needs get built.';
    } else if (k === 'thin') {
      why = jobs.length < 2 ? 'Add at least 2 jobs: what your customer is trying to get done.' : real < 2 ? 'Track at least 2 real competitors, plus the do-it-yourself option.' : (!rated || by.unknown.length === jobs.length) ? 'Rate how well each competitor covers each job.' : 'No job has paid or workaround demand yet. Complaints alone do not prove a gap.';
    } else why = 'Start with the jobs your customer needs done. Then add who already does them.';
    var dec = k === 'open' || k === 'crowded' || k === 'empty';
    if (dec) {
      if (k === 'open') {
        var wj = pv.wedge.job && prvById(jobs, pv.wedge.job), wc = wj && prvJobClass(p, wj);
        if (!pv.wedge.t) w.push({ t: 'No wedge yet. Why would someone switch to you?', a: 'wedit' });
        else if (wj && wc !== 'gap') w.push({ t: 'Your wedge rests on “' + prvT(wj.t, 40) + '”, which is not an open gap', a: 'wedit' });
        /* the job is open, but people already get it done in full another way: that habit is the rival to beat */
        by.gap.some(function (r) { var s = comps.filter(function (c) { return c.sub && c.cov[r.j.id] && c.cov[r.j.id].l === 'full'; })[0]; if (s) subf = { c: s, j: r.j }; return !!s; });
        if (subf) w.push({ t: subf.c.n + ' already does “' + prvT(subf.j.t, 40) + '” in full. Your wedge has to say why people stop doing that', a: 'wedit' });
      }
      if (unv.length) w.push({ t: unv.length + (unv.length === 1 ? ' AI-reported source is' : ' AI-reported sources are') + ' not verified yet', a: 'goverify' });
      if (unsrc) w.push({ t: unsrc + (unsrc === 1 ? ' rating or note has' : ' ratings or notes have') + ' no source', a: 'gojob', id: fUn.id });
      if (noRate) w.push({ t: noRate + (noRate === 1 ? ' coverage cell is' : ' coverage cells are') + ' not rated', a: 'gojob', id: fNr.id });
      if (st.length) w.push({ t: prvList(st.map(function (c) { return c.n; })) + (st.length === 1 ? ' is' : ' are') + ' stale', a: 'gocomp' });
      if (!subs) w.push({ t: 'No substitute listed: a spreadsheet, Notion or doing it by hand', a: 'subadd' });
    }
    var pts = (real >= 3 ? 1 : 0) + (subs ? 1 : 0) + (cells && rated === cells ? 1 : 0) + (st.length ? 0 : 1) + (unv.length ? 0 : 1);
    /* the sources the open verdict rests on: demand for each open job, and every rating of it. Unverified AI sources among them leave it unconfirmed */
    var dsrc = {}, hosts = [];
    by.gap.forEach(function (r) { r.d.srcs.forEach(function (n) { dsrc[n] = 1; }); r.d.hosts.forEach(function (h) { if (hosts.indexOf(h) < 0) hosts.push(h); }); comps.forEach(function (c) { var v = c.cov[r.j.id]; if (v && v.s) dsrc[v.s] = 1; }); });
    var unc = k === 'open' ? Object.keys(dsrc).map(Number).filter(function (n) { var so = prvSrc(p, n); return so && so.ai && !so.ver; }) : [];
    /* "no rival covers it in full" holds only for the rivals that were rated on the job. A real rival not rated on an open job could
       cover it, so the open verdict stays Low until it is rated, and that rating is the first thing to do */
    var gunr = 0, g1 = null;
    if (k === 'open') by.gap.forEach(function (r) { var un = comps.filter(function (c) { return !c.sub && !c.cov[r.j.id]; }); gunr += un.length; if (un.length && !g1) g1 = { j: r.j, cs: un }; });
    if (g1) w.unshift({ t: 'Rate ' + (g1.cs.length > 2 ? g1.cs[0].n + ', ' + g1.cs[1].n + ' and ' + (g1.cs.length - 2) + ' more' : prvList(g1.cs.map(function (c) { return c.n; }))) + ' on “' + prvT(g1.j.t, 40) + '”. The gap rests on it', a: 'gojob', id: g1.j.id });
    /* evidence strength says how well the sources back the verdict, never that demand is proven. An AI-reported source nobody has
       checked yet, among the ones the verdict rests on, keeps it at Low until it is verified */
    var prov = dec && (k === 'open' ? unc.length > 0 : unv.length > 0);
    var lvl = ['low', 'medium', 'high'], conf = !dec ? '' : prov || gunr ? 'low' : k === 'open' ? lvl[hosts.length >= 3 ? 2 : hosts.length === 2 ? 1 : 0] : (pts >= 5 ? 'high' : pts >= 3 ? 'medium' : 'low');
    /* a gap people already fill in full by hand or with a free tool is harder to sell: never more than Medium */
    if (subf && conf === 'high') conf = 'medium';
    if (unc.length) why = 'Verify the ' + (unc.length === 1 ? 'AI-reported source' : unc.length + ' AI-reported sources') + ' behind this before you trust it.\n' + why;
    /* why is kept as sentences (ws), so each one is translated on its own; why joins them for anything that wants one line */
    var ws = why.split('\n'); why = ws.join(' ');
    return { k: k, why: why, ws: ws, dec: dec, warn: w, by: by, rows: rows, rated: rated, cells: cells, real: real, subs: subs, strong: strong, unv: unv, stale: st, unc: unc, hosts: hosts,
      conf: conf, prov: prov, gunr: gunr, subf: subf,
      steps: [[jobs.length >= 2, 'List the jobs your customer needs done'], [real >= 2, 'Track the competitors, and the do-it-yourself option'], [cells > 0 && rated === cells, 'Rate how well each one covers each job'], [strong > 0, 'Back demand with a source that is not a rival’s own page: someone pays, or works around it']] };
  }
  function prvNeeds(p) {
    if (p.pv.stop) return [];
    var mkt = pdMode(p) === 'product', pv = p.pv, out = pfNeeds(p), late = prvLate(p), inbox = pv.park.filter(function (x) { return x.st === 'parked'; }), rv = inbox.filter(prvRevisit), mu = inbox.filter(prvMust), st = prvStale(p), v = prvVerdict(p), un = pv.src.filter(function (s) { return s.ai && !s.ver; }).length, ld = prvLoad(p), dr = prvDrift(p);
    var ins = prvBucket(p, 'in'), due = prvBucket(p, 'out').filter(prvDue);
    if (late) out.push({ t: pv.rel.name + ' is ' + prvDay(late) + ' past its date', chip: 'crit', chipT: 'Late', tab: 'scope', f: 'late', p: 'Cut what is not done to Next, extend once with a reason, or stop.' });
    var on = prvRelOn(p);
    if (!pv.items.length && !pv.base && !(mkt && prvLocked(p))) out.push(on ? { t: 'Define what is in this release', p: 'Add what Now includes, and write down what you will never build.', tab: 'scope' } : { t: 'Decide what is in Now', p: 'Add what you are working on now, and write down what you will never build.', tab: 'scope' });
    if (on && ins.length && ins.every(function (x) { return x.st === 'done'; })) out.push({ t: 'Everything in Now is done', chip: 'ok', chipT: 'Ready', tab: 'scope', f: 'ship', p: 'Ship ' + pv.rel.name + ' to close it. What is on Next waits for ' + prvNextName(p) + '.' });
    if (ld.over) out.push({ t: 'Now is over budget by ' + prvDay(ld.over), chip: 'warn', chipT: 'Over', tab: 'scope', p: ld.days + ' of ' + prvDay(ld.cap) + ' are planned for ' + pv.rel.name + '. Move something to Next, or raise the capacity.' });
    else if (ld.cap && ld.un) out.push({ t: 'Size ' + ld.un + (ld.un === 1 ? ' item' : ' items') + ' in Now', tab: 'scope', p: 'Without a size, the ' + prvDay(ld.cap) + ' budget cannot tell you whether Now fits.' });
    wkNeeds(p).forEach(function (n) { out.push(n); });
    if (dr.lv === 3) out.push({ t: 'Scope drift is high', chip: 'crit', chipT: 'High', tab: 'scope', p: prvDriftText(dr) + '. Review what was added, or accept it with a new baseline.' });
    if (due.length) out.push({ t: 'Look again at ' + (due.length === 1 ? '1 item' : due.length + ' items') + ' in Never', chip: 'warn', chipT: 'Due', tab: 'scope', p: prvList(due.slice(0, 2).map(function (x) { return '“' + prvT(x.t, 30) + '”'; })) + (due.length > 2 ? ' and ' + (due.length - 2) + ' more' : '') + ' reached the date you set. Bring one back through the Gate, or say it is still no.' });
    if (rv.length || inbox.length >= 3) {
      var ages = rv.map(function (x) { return prvAge(prvClock(x)); }), mx = ages.length ? Math.max.apply(null, ages) : 0;
      out.push({ t: 'Decide ' + inbox.length + (inbox.length === 1 ? ' idea' : ' ideas'), chip: rv.length ? 'warn' : '', chipT: rv.length ? 'Revisit' : '', tab: 'parking', f: 'tri',
        p: mu.length ? mu.length + (mu.length === 1 ? ' idea has' : ' ideas have') + ' already been kept once. ' + (mu.length === 1 ? 'It goes' : 'They go') + ' to Next or Never now.' : rv.length ? (rv.length === 1 ? 'One idea has' : rv.length + ' ideas have') + ' waited ' + mx + ' days. Each one ends in Now, Next or Never.' : 'Each one ends in Now, Next or Never. Nothing stays parked for good.' });
    }
    if (pv.items.length && prvPrinc(p).length < PRV_PMIN) out.push({ t: 'Write your principles', tab: 'decisions', p: 'The Scope Gate checks every item against ' + PRV_PMIN + ' to ' + PRV_PMAX + ' things you will not compromise on.' });
    if (mkt && pv.mk && !pv.jobs.length && !pv.comps.length) out.unshift({ t: 'Check the market before you build', p: 'See who already does this and what customers need done. It takes minutes, a test takes weeks.', tab: 'market' });
    if (mkt && (v.k === 'crowded' || v.k === 'empty') && prvLocked(p)) out.push({ t: v.k === 'crowded' ? 'Gap check: me-too' : 'Gap check: no demand seen', chip: 'warn', chipT: v.k === 'crowded' ? 'Me-too' : 'No demand', tab: 'market', f: 'pf:dec',
      p: v.k === 'crowded' ? 'Every job with proven demand is already served. Narrow the bet, or stop before you build.' : 'Nothing proves anyone wants what nobody offers. Narrow the bet, or stop before you build.' });
    if (mkt && st.length) {
      var sa = st.map(function (c) { return prvCompAge(p, c); }), smx = Math.max.apply(null, sa), smn = Math.min.apply(null, sa);
      out.push({ t: 'Competitor data is stale', chip: 'warn', chipT: 'Stale', tab: 'market',
        p: (st.length === 1 ? st[0].n + ' was' : st.length === 2 ? 'Two competitors were' : st.length + ' competitors were') + ' last checked ' + (smn === smx ? smx : smn + ' to ' + smx) + ' days ago.' });
    }
    var cd = prvCad(p);
    if (mkt && cd.any && cd.due && !st.length && (pv.jobs.length || pv.comps.length)) out.push({ t: 'Refresh the market check', chip: 'warn', chipT: 'Due', tab: 'market', p: 'The last update was ' + prvRuns(cd.any) + ' ago. Run ' + (cd.mode === 'refresh_quarterly' ? 'a quarterly review' : cd.mode === 'discover' ? 'a research pass' : 'a monthly refresh') + ' so prices and rivals stay current.' });
    if (mkt && un) out.push({ t: un === 1 ? 'Verify 1 AI-reported source' : 'Verify ' + un + ' AI-reported sources', chip: 'warn', chipT: 'Unverified', tab: 'market', p: 'Open each link and compare it with the quote. The verdict stays provisional until you do.' });
    prvOpenDec(p).sort(function (a, b) { return a.ots - b.ots; }).forEach(function (d) {
      out.push({ t: 'Open decision: ' + prvLc(d.t), p: (prvAge(d.ots) === 0 ? 'Opened today.' : 'Open for ' + prvRuns(d.ots) + '.') + ' Record the choice and why.', tab: 'decisions', f: 'dec:' + d.id });
    });
    return out;
  }
  function prvDerive(p) {
    var pv = p.pv, g = p.glance || (p.glance = {}), d = prvDrift(p), v = prvVerdict(p), ld = prvLoad(p);
    g.inn = prvBucket(p, 'in').length; g.next = prvBucket(p, 'next').length; g.out = prvBucket(p, 'out').length;
    g.parked = pv.park.filter(function (x) { return x.st === 'parked'; }).length;
    g.days = ld.days; g.cap = ld.cap; g.over = ld.over; g.un = ld.un; g.ov = d.ov; g.pct = d.pct; g.add = d.add.length; g.cut = d.cut;
    g.drift = d.lv; g.ships = pv.ships.length; g.due = prvBucket(p, 'out').filter(prvDue).length;
    g.dl = pv.base && d.n === 0 ? 'On baseline' : pv.base && !d.add.length ? 'Trimmed' : '';
    p.vk = v.k; p.gaps = v.by.gap.length; p.open = prvOpenDec(p).length; p.local = prvNeeds(p);
  }
  /* the verdict is worked out, never stored by hand. Only moves between a decisive verdict and anything else are logged */
  function prvTrack(p) {
    var pv = p.pv, v = prvVerdict(p), now = Date.now(), dec = { open: 1, crowded: 1, empty: 1 };
    if (!pv.vd) { pv.vd = { k: v.k, ts: now }; return; }
    if (pv.vd.k !== v.k) {
      if (dec[pv.vd.k] || dec[v.k]) pv.vlog.push({ ts: now, from: pv.vd.k, to: v.k });
      pv.vd = { k: v.k, ts: now };
    }
  }
  function prvAfter(p) { prvTrack(p); prvDerive(p); pdRefreshBadges(p); }

  /* History: every event is read from the model, so undo needs no separate log */
  function prvEvents(p) {
    var pv = p.pv, out = [];
    /* Drift is only counted inside a release that has a baseline. Shipping starts a fresh one */
    function lastBefore(list, ts) { var m = 0; list.forEach(function (e) { if (e.ts <= ts && e.ts > m) m = e.ts; }); return m; }
    function inDrift(ts) { var b = lastBefore(pv.bls, ts), sh = lastBefore(pv.ships, ts); return b > 0 && b >= sh && ts > b; }
    function add(ln, ts, text, sub, link, diff) { out.push({ ln: ln, ts: ts, t: text, sub: sub || '', link: link || null, diff: diff || null, i: out.length }); }
    var thLink = { tab: 'workspace', l: 'Overview', f: 'thesis' }, scLink = { tab: 'scope', l: 'Scope' };
    pv.th.forEach(function (e) { add('thesis', e.ts, e.before ? 'You changed the Thesis' : 'You wrote the Thesis', '', thLink, { b: e.before, a: e.after }); });
    pv.bls.forEach(function (e, i) {
      var first = !pv.bls.some(function (o) { return o.ts < e.ts && o.ts >= lastBefore(pv.ships, e.ts); });
      add('scope', e.ts, first ? 'You committed the ' + (e.nm && pv.ships.length ? e.nm + ' ' : '') + 'baseline' : 'You set a new baseline', e.n + (e.n === 1 ? ' item' : ' items') + ' in Now. Drift is measured from here.' + (e.ov ? ' Accepted ' + e.ov + (e.ov === 1 ? ' override.' : ' overrides.') : '') + (e.why ? ' Reason: ' + e.why : ''), scLink);
    });
    pv.rl.forEach(function (e) {
      var pr = e.prev, bits = [];
      if (pr) { if (pr.name !== e.name) bits.push('Renamed from ' + pr.name); if (e.ext) bits.push('Extended once' + (e.why ? ': ' + e.why : '')); if ((pr.cap || 0) !== (e.cap || 0)) bits.push('Capacity ' + (pr.cap ? prvDay(pr.cap) : 'none') + ' → ' + (e.cap ? prvDay(e.cap) : 'none')); if ((pr.date || '') !== (e.date || '')) bits.push(e.date ? 'Target ' + e.date : 'Target date cleared'); if (e.why && !e.ext) bits.push('Reason: ' + e.why); }
      /* each change is its own sentence on the page, so each one is translated on its own */
      add('release', e.ts, pr ? 'You updated the ' + e.name + ' release' : 'You defined the ' + e.name + ' release', bits.length ? bits : '', scLink, (!pr || pr.ship !== e.ship) && e.ship ? { b: pr ? pr.ship : '', a: e.ship } : null);
    });
    pv.ships.forEach(function (e) {
      var m = PRV_MET[e.met], bits = [e.done + ' of ' + (e.done + e.carried + e.cut) + (e.done + e.carried + e.cut === 1 ? ' item' : ' items') + ' done'];
      if (e.carried) bits.push(e.carried + ' carried to Next'); if (e.cut) bits.push(e.cut + ' cut to Never');
      add('release', e.ts, 'You shipped ' + e.name, bits.join(', ') + (m ? '. ' + m[0] + ' the done-when line.' : '.') + (e.sum ? ' ' + e.sum : ''), scLink);
    });
    pv.items.forEach(function (x) {
      x.lg.forEach(function (e) {
        var to = e.to, fr = e.fr, on = to === 'in' || fr === 'in', ln = on && inDrift(e.ts) ? 'drift' : 'scope', q = '“' + x.t + '”', t, sub = e.why ? 'Reason: ' + e.why : '', lk = scLink;
        if (e.k === 'new') {
          if (to === 'in') { t = e.pr ? 'You promoted ' + q + ' from the Parking Lot to Now' : 'You added ' + q + ' to Now'; sub = e.why ? (e.pr ? 'Why now: ' : 'Why: ') + e.why : ''; }
          else if (to === 'next') { t = e.pr ? 'You promoted ' + q + ' from the Parking Lot to Next' : 'You put ' + q + ' on Next'; sub = e.why ? 'Why later: ' + e.why : ''; }
          else t = e.pr ? 'You ruled out ' + q + ' from the Parking Lot' : 'You ruled out ' + q;
        } else if (e.k === 'again') {
          add('scope', e.ts, 'You asked for “' + x.t + '” again. It stays in Never', e.why || '', scLink); return;
        } else if (e.k === 'ren') {
          add(inDrift(e.ts) ? 'drift' : 'scope', e.ts, 'You renamed “' + e.was + '” to “' + e.now + '”', e.b ? 'It was in the baseline as something else, so it counts as new work.' : '', scLink); return;
        } else if (e.k === 'rv') {
          add('scope', e.ts, 'You looked at “' + x.t + '” again and kept it in Never', e.why ? 'Reason: ' + e.why : '', scLink); return;
        } else if (e.k === 'mv') {
          if (to === 'shipped') return;
          if (e.sh) { add('release', e.ts, to === 'next' ? 'You carried “' + x.t + '” to Next when its release shipped' : 'You cut “' + x.t + '” when its release shipped', e.why ? 'Reason: ' + e.why : '', scLink); return; }
          if (to === 'in') t = e.rs ? 'You restored ' + q + ' to Now' : fr === 'out' ? 'You brought ' + q + ' back from Never' : fr === 'next' ? 'You pulled ' + q + ' from Next into Now' : 'You moved ' + q + ' into Now';
          else if (to === 'next') t = 'You moved ' + q + (fr === 'out' ? ' from Never to Next' : ' to Next');
          else if (to === 'out') t = 'You moved ' + q + ' to Never';
          else if (to === 'inbox') { t = 'You moved ' + q + ' back to the Parking Lot'; lk = { tab: 'parking', l: 'Scope' }; }
          else t = 'You removed ' + q + ' from Scope';
          if (fr === 'out' && to !== 'out') sub = e.why ? 'What changed: ' + e.why : '';
        } else return;
        if (e.ov) sub = (sub ? sub + ' · ' : '') + 'Override: ' + (e.ovw || 'no reason given');
        add(ln, e.ts, t, sub, lk);
      });
    });
    pv.park.forEach(function (x) {
      var lk = { tab: 'parking', l: 'Scope', id: x.id };
      x.lg.forEach(function (e) { if (e.k === 'park' && !e.from) add('scope', e.ts, 'You parked “' + x.t + '” in the Parking Lot', '', lk); });
    });
    var stab = prvSrcTab(p);   /* v119 (87): an internal project's sources are on Decisions */
    pv.src.forEach(function (s) { if (!s.imp) add('market', s.ts, 'You added source [' + s.n + '] · ' + s.t, s.host, { tab: stab, l: stab === 'market' ? 'Validate' : 'Decisions', n: s.n }); });
    pv.comps.forEach(function (c) { if (!c.imp) add('market', c.ts, 'You started tracking ' + c.n, c.pos, { tab: 'market', l: 'Validate' }); });
    pv.jobs.forEach(function (j) { if (!j.imp) add('market', j.ts, 'You added the job “' + j.t + '”', '', { tab: 'market', l: 'Validate' }); });
    pv.imp.forEach(function (e) {
      var n = e.n || {}, nw = (n.jn || 0) + (n.kn || 0), ch = (n.jc || 0) + (n.kc || 0) + (n.pl || 0), rt = (n.jr || 0) + (n.kr || 0), bits = [];
      if (e.mode === 'manual') return add('market', e.ts, 'You marked the market reviewed', '', { tab: 'market', l: 'Validate' });
      if (nw) bits.push(nw + ' new'); if (ch) bits.push(ch + ' changed'); if (rt) bits.push(rt + ' retired'); if (n.sn) bits.push(n.sn + (n.sn === 1 ? ' source' : ' sources') + ' to verify');
      add('market', e.ts, 'You applied an AI update · ' + (PRV_MODE[e.mode] || PRV_MODE.discover)[0], bits.join(', ') || 'No changes', { tab: 'market', l: 'Validate' });
    });
    pv.vlog.forEach(function (e) { add('market', e.ts, e.to === 'thin' || e.to === 'none' ? 'The verdict is no longer decisive' : 'The verdict moved to ' + PRV_VK[e.to][0], e.from ? 'It was ' + PRV_VK[e.from][0] : '', { tab: 'market', l: 'Validate' }); });
    pfTests(p).forEach(function (t) { add('proof', t.ts, (t.kind === 'launch' ? 'You set a launch check: “' : t.kind === 'grow' ? 'You started a growth check: “' : 'You started a test: “') + prvT(t.q, 70) + '”', PF_M[t.m].l + ' · go at ' + t.ok + ', stop at ' + t.kill + ' or fewer', { tab: 'market', l: 'Validate' }); });
    /* each result logged on a test, with where the count stood after it. Logging one adds no Overview line of its own (prvLogged) */
    pfTests(p).forEach(function (t) {
      var v = 0, nm = (t.kind === 'launch' ? 'Launch check: “' : t.kind === 'grow' ? 'Growth check: “' : 'Test: “') + prvT(t.q, 60) + '”';
      t.log.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) {
        var talk = t.m === 'talk', strong = e.rec && e.pay;
        v += talk ? (strong ? 1 : 0) : (e.n || 0);
        add('proof', e.ts, talk ? 'You logged an interview' : 'You logged +' + e.n + ' ' + pfUnit(t, e.n),
          [nm, talk ? e.who || '' : '', talk ? (strong ? 'Strong' : e.rec ? 'Has it, does not pay' : e.pay ? 'Pays, not recently' : 'Not a fit') : '', v + ' of ' + t.ok + ' ' + PF_M[t.m].unit + ' so far', e.note || ''].filter(Boolean), { tab: 'market', l: 'Validate' });
      });
    });
    (pv.stops || []).forEach(function (x) { if (x.reo) add('proof', x.reo, 'You reopened the project', 'It had stopped: ' + x.why, null); });
    pv.dec.forEach(function (d) {
      if (d.typ === 'scope') return;
      var lk = { tab: 'decisions', l: 'Decisions', id: d.id }, ch = d.opts.filter(function (o) { return o.c; })[0], ln = d.typ === 'proof' ? 'proof' : 'decisions';
      if (d.typ !== 'proof') add('decisions', d.ots, 'You opened a decision: ' + d.t, '', lk);
      if (d.dts) add(ln, d.dts, 'You decided: ' + d.t, ch ? 'Chose ' + ch.t + (d.typ === 'proof' && d.because ? '. ' + prvT(d.because, 90) : '') : '', lk);
      if (d.sts) { var by = prvById(pv.dec, d.by); add('decisions', d.sts, 'You superseded “' + d.t + '”', by ? 'Replaced by “' + by.t + '”' : '', lk); }
    });
    pv.princ.forEach(function (x) {
      var lk = { tab: 'decisions', l: 'Decisions' }, ed = x.ed || [];
      add('decisions', x.ts, 'You wrote a principle', ed.length ? ed[0].b : x.t, lk);
      ed.forEach(function (e) { add('decisions', e.ts, 'You reworded a principle', '', lk, { b: e.b, a: e.a }); });
      if (x.rm) add('decisions', x.rm, 'You retired a principle', x.rmw ? [x.t, 'Reason: ' + x.rmw] : x.t, lk);
    });
    /* p.log is newest first, so a tie in time goes to the later note */
    /* v122 (94): a setting changed again within ten minutes says only where it ended (English then Tiếng Việt, a product then
       internal work): the steps in between are not events anyone needs to read */
    var SET = [['lang', /^You set the project language to /], ['mode', /^You made this (project a product|an internal project)$/], ['phase', /^You moved the project to /]], kept = {};
    (p.log || []).forEach(function (e) {
      if (e.t === 'You logged a test result') return;   /* older notes: the result itself is in the Proof lane now */
      var st = SET.filter(function (x) { return x[1].test(e.t || ''); })[0], ets = e.ts || 0;
      if (st && ets) { if (kept[st[0]] && kept[st[0]] - ets <= 10 * 60000) return; kept[st[0]] = ets; }
      var w = e.ts ? null : pdParseWhen(e.at); add('work', e.ts || (w ? w.t : Date.now()), e.t, '', null);
    });
    out.sort(function (a, b) { return b.ts - a.ts || a.i - b.i; });
    return out;
  }

  /* ---------- builders ---------- */
  function prvErrSpan(msg) { return '<span class="err" role="alert">' + esc(msg || '') + '</span>'; }
  function prvSel(a) { var s = '[data-pd="' + a.getAttribute('data-pd') + '"]', id = a.getAttribute('data-id'), sec = a.getAttribute('data-sec'); return s + (id ? '[data-id="' + id + '"]' : '') + (sec ? '[data-sec="' + sec + '"]' : ''); }
  function prvOptChip(type, name, val, label, checked) { return '<label class="prv-opt"><input type="' + type + '" name="' + name + '" value="' + esc(val) + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>'; }
  function prvPicker(p, sel, name) {
    var pv = p.pv; if (!pv.src.length) return '<p class="prv-hint">No sources yet. <button type="button" class="link" data-pd="prv:srcadd">Add one</button> first.</p>';
    return '<fieldset class="prv-pick"><legend>Sources</legend>' + pv.src.map(function (s) { return prvOptChip('checkbox', name || 's', s.n, '<b>[' + s.n + ']</b> ' + esc(s.t.length > 28 ? s.t.slice(0, 27) + '…' : s.t), sel.indexOf(s.n) > -1); }).join('') + '</fieldset>';
  }
  function prvRefs(p, arr) {
    return arr.map(function (n) { var s = prvSrc(p, n); return s ? '<sup><button type="button" class="prv-ref" data-pd="prv:ref" data-n="' + n + '" aria-label="Source ' + n + ': ' + esc(s.t) + '">[' + n + ']</button></sup>' : ''; }).join('');
  }

  /* scope */
  function prvSzSel(name, val, label, p) {
    return '<span class="pd-sel prv-szs"><select name="' + name + '" aria-label="' + esc(label) + '"><option value="">No size</option>' + PRV_SZ.map(function (z) { return '<option value="' + z[0] + '"' + (val === z[0] ? ' selected' : '') + '>' + z[1] + ' · ' + prvSzText(p, z[0]) + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>';
  }
  function prvItemForm(p, sec, x) {
    var out = sec === 'out', id = x ? x.id : 'new-' + sec;
    return '<li class="prv-fw"><form class="prv-f prv-if' + (x ? ' sz' : '') + '" data-pd-form="prv:item" data-sec="' + sec + '"' + (x ? ' data-id="' + x.id + '"' : '') + ' novalidate>' +
      '<label class="sr-only" for="prv-t-' + id + '">' + (out ? 'What you will never build' : 'Item') + '</label><input id="prv-t-' + id + '" name="t" value="' + (x ? esc(x.t) : '') + '" maxlength="90" placeholder="' + (out ? 'What you will never build' : 'What this item is') + '" autocomplete="off">' +
      '<label class="sr-only" for="prv-w-' + id + '">' + (out ? 'Reason' : 'Why it is here') + '</label><input id="prv-w-' + id + '" name="w" value="' + (x ? esc(x.why) : '') + '" maxlength="140" placeholder="' + (out ? 'Reason (required)' : 'Why it is here (optional)') + '" autocomplete="off">' +
      (x && !out ? prvSzSel('z', x.size, 'Size of ' + x.t, p) : '') + (x && out ? '<span class="pd-sel prv-szs"><select name="l" aria-label="Look again">' + PRV_LOOKS.map(function (o) { return '<option value="' + o[0] + '"' + ((x.rvn || 0) === o[0] ? ' selected' : '') + '>Look again: ' + o[1].toLowerCase() + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>' : '') +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (x ? 'Save' : 'Add') + '</button></div>' +
      (!x && out ? '<p class="prv-hint">Never keeps its reason. Bringing it back later goes through the Scope Gate and has to say what changed.</p>' : '') + prvErrSpan() + '</form></li>';
  }
  function prvTakeForm(x) {
    var now = x.sec === 'in';
    return '<li class="prv-fw"><form class="prv-f prv-to" data-pd-form="prv:take" data-id="' + x.id + '" novalidate><fieldset class="prv-pick"><legend>Take “' + esc(x.t) + '” out of ' + (now ? 'Now' : 'Next') + '</legend>' +
      (now ? prvOptChip('radio', 'to', 'next', 'Move to Next', true) : '') + prvOptChip('radio', 'to', 'out', 'Never', !now) + prvOptChip('radio', 'to', 'inbox', 'Back to the Parking Lot', false) + '</fieldset>' +
      '<label class="sr-only" for="prv-tw-' + x.id + '">Reason</label><input id="prv-tw-' + x.id + '" name="w" maxlength="140" placeholder="Reason (required for Never)" autocomplete="off">' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Move</button></div>' + prvErrSpan() + '</form></li>';
  }
  /* what a row says about an item: its size, the job it answers and whether it got in on an override */
  function prvMeta(p, x) {
    var j = prvJobOf(p, x), b = [];
    if (x.sec === 'out') {
      if (prvDue(x)) b.push('<span class="chip warn" title="You set ' + esc(prvDate(x.rvd)) + ' to look at this again">Look again</span>');
      else b.push('<span class="prv-nm">' + (x.rvn ? 'Look again ' + esc(prvLookText(x)) : 'Only if a principle changes') + '</span>');
      if (x.rs) b.push('<span class="chip ' + (x.rs >= 2 ? 'warn' : 'neutral') + '" title="You asked for it again after ruling it out">Asked again ×' + x.rs + '</span>');
      return '<span class="prv-mt">' + b.join('') + '</span>';
    }
    b.push(x.size ? '<span class="chip neutral prv-sz" title="About ' + prvDay(prvSzD(p, x.size)) + '">' + x.size + '</span>' : '<span class="prv-nm">No size</span>');
    if (prvJobs(p).length) b.push(j ? '<span class="prv-jl" title="The job this item answers">' + IC('tick') + esc(prvT(j.t, 44)) + '</span>' : '<span class="prv-nm">' + (x.nj ? 'Answers no job' : 'No job linked') + '</span>');
    if (x.sec === 'in' && x.ov) b.push('<span class="chip warn prv-ovc" title="' + esc('Got into Now against the Gate' + (x.gate && x.gate.ovw ? ': ' + x.gate.ovw : '')) + '">Override</span>');
    return '<span class="prv-mt">' + b.join('') + '</span>';
  }
  function prvRow(p, x) {
    var q = pd.pv, base = p.pv.base, sec = x.sec, out = sec === 'out', now = sec === 'in', nx = sec === 'next', ren = now && prvRenamed(p, x), fresh = now && base && (base.ids.indexOf(x.id) < 0 || ren), h = '';
    if (q.se === x.id) return prvItemForm(p, sec, x);
    var note = '';
    if (out) note = x.why ? 'Reason: ' + esc(x.why) : '<span class="prv-mute">No reason yet</span>';
    else {
      if (x.nwhy) note = 'Back from Never. What changed: ' + esc(x.why || '—') + ' · It was out because: ' + esc(prvT(x.nwhy, 70));
      else note = x.why ? esc(x.why) : '';
      if (fresh && x.ov) note += (note ? ' · ' : '') + 'After the baseline, against the Gate';
      else if (fresh) note += (note ? ' · ' : '') + (ren ? 'Renamed after the baseline' : 'After the baseline');
    }
    var st = now ? '<span class="prv-stc">' + wkTag(p, x.id) + '</span>' : '';
    var wu = now && x.st === 'done' ? wkUnit(p, x.id) : null;   /* v97 (45): done work in Now can be checked here too, solo projects have no Team tab */
    var call = prvCall(p, x), main = out ? (prvDue(x) ? '<button type="button" class="btn-ghost btn-sm" data-pd="prv:still" data-id="' + x.id + '" aria-label="Still no to ' + esc(x.t) + '. Keep it in Never">Still no</button>' : '') + '<button type="button" class="btn-ghost btn-sm prv-bring" data-pd="prv:bring" data-id="' + x.id + '" aria-label="Bring ' + esc(x.t) + ' back through the Scope Gate">Bring in</button>' :
      nx ? '<button type="button" class="btn-ghost btn-sm prv-bring" data-pd="prv:pull" data-id="' + x.id + '" aria-label="Pull ' + esc(x.t) + ' into Now through the Scope Gate">Pull into Now</button>' : '';
    var acts = (call ? '<button type="button" class="icon-sm xs" data-pd="prv:hgo" data-tab="decisions" data-id="' + call.id + '" aria-label="See the Gate call for ' + esc(x.t) + '" title="Gate call">' + IC('shield') + '</button>' : '') + '<button type="button" class="icon-sm xs" data-pd="prv:sedit" data-id="' + x.id + '" aria-label="Edit ' + esc(x.t) + '">' + IC('edit') + '</button>' +
      (out ? '' : '<button type="button" class="icon-sm xs" data-pd="prv:stake" data-id="' + x.id + '" aria-label="Take ' + esc(x.t) + ' out of ' + (now ? 'Now' : 'Next') + '" title="Take out">' + IC('swap') + '</button><button type="button" class="icon-sm xs" data-pd="prv:srm" data-id="' + x.id + '" aria-label="Remove ' + esc(x.t) + '">' + IC('x') + '</button>');
    h = '<li class="prv-r' + (fresh ? (x.ov ? ' add ov' : ' add') : '') + (out ? ' out' : '') + (x.st === 'done' && now ? ' done' : '') + '" data-it="' + x.id + '"><span class="g" aria-hidden="true">' + (out ? '−' : fresh ? '+' : '') + '</span>' +
      '<span class="tx"><span class="t">' + (fresh ? '<span class="sr-only">Added after the baseline. </span>' : '') + esc(x.t) + '</span>' + (note ? '<small class="n">' + note + '</small>' : '') + prvMeta(p, x) + (wu ? wkCpLine(p, wu) : '') + '</span><span class="prv-sd">' + main + st + '<span class="acts">' + (wu ? wkCpBtn(p, wu, false, 'icon-sm xs') : '') + acts + '</span></span></li>';
    if (q.st === x.id) h += prvTakeForm(x);
    if (wu && pd.wk && pd.wk.sk === x.id && pd.wk.sf === 'cp') h += wkCpForm(p, wu, false);
    return h;
  }
  function prvInCard(p) {
    var q = pd.pv, ins = prvBucket(p, 'in'), d = prvDrift(p), nm = p.pv.rel.name || 'v1', on = prvRelOn(p), h;
    h = '<section class="card pd-card" aria-labelledby="pd-h-in"><div class="card-h ruled"><div><h3 id="pd-h-in">Now</h3><p>' + (on ? 'What ' + esc(nm) + ' ships. ' : 'What you are working on now. ') + 'Every item here passed the Scope Gate.</p></div><div class="h-actions"><span class="count">' + ins.length + '</span></div></div>';
    h += prvMarketNote(p);
    if (!ins.length) h += '<p class="pd-crs-e">' + (on ? 'Nothing in Now yet. Start with the one thing ' + esc(nm) + ' cannot ship without.' : 'Nothing in Now yet. Start with the one thing this project cannot do without.') + '</p>';
    else h += '<ul class="prv-rs">' + ins.map(function (x) { return prvRow(p, x); }).join('') + '</ul>';
    if (d.gone.length) {
      h += '<div class="prv-gone"><h4 class="pd-eb">Left Now since the baseline</h4><ul class="prv-rs">' + d.gone.map(function (x) {
        var where = x.sec === 'out' ? 'Moved to Never' : x.sec === 'next' ? 'Moved to Next' : x.sec === 'inbox' ? 'Moved back to the Parking Lot' : 'Removed';
        return '<li class="prv-r del" data-it="' + x.id + '"><span class="g" aria-hidden="true">−</span><span class="tx"><span class="t">' + esc(x.t) + '</span><small class="n">' + where + '. Cutting is not counted as drift.</small></span><span class="prv-sd"><button type="button" class="btn-ghost btn-sm" data-pd="prv:srest" data-id="' + x.id + '">Put back</button></span></li>';
      }).join('') + '</ul></div>';
    }
    return h + '</section>';
  }
  function prvNextCard(p) {
    var q = pd.pv, nx = prvBucket(p, 'next'), nm = prvNextName(p), on = prvRelOn(p);
    var h = '<section class="card pd-card" aria-labelledby="pd-h-nx"><div class="card-h ruled"><div><h3 id="pd-h-nx">' + (on ? 'Next · ' + esc(nm) : 'Next') + '</h3><p>Good ideas that can wait. Parked on purpose.</p></div><div class="h-actions"><span class="count">' + nx.length + '</span></div></div>';
    if (!nx.length) return h + '<p class="pd-crs-e">' + (on ? 'Nothing is waiting for ' + esc(nm) + '. Ideas that ship fine without them end up here.' : 'Nothing is waiting. Ideas that can wait end up here.') + '</p></section>';
    return h + '<ul class="prv-rs">' + nx.map(function (x) { return prvRow(p, x); }).join('') + '</ul></section>';
  }
  function prvOutCard(p) {
    var q = pd.pv, outs = prvBucket(p, 'out');
    var h = '<section class="card pd-card" aria-labelledby="pd-h-out"><div class="card-h ruled"><div><h3 id="pd-h-out">Never</h3><p>Decisions not to build, so they are not argued twice. Bringing one back goes through the Gate.</p></div><div class="h-actions"><span class="count">' + outs.length + '</span><button type="button" class="btn-ghost btn-sm" data-pd="prv:sadd" data-sec="out">' + IC('plus') + 'Add</button></div></div>';
    if (!outs.length && q.sa !== 'out') return h + '<p class="pd-crs-e">Nothing is ruled out yet. Write down what you will not build and why.</p></section>';
    return h + '<ul class="prv-rs">' + (q.sa === 'out' ? prvItemForm(p, 'out') : '') + outs.map(function (x) { return prvRow(p, x); }).join('') + '</ul></section>';
  }
  /* shipping closes a release. What is done leaves Now for good, and what is not has to go somewhere */
  function prvShipForm(p) {
    var q = pd.pv, pv = p.pv, r = pv.rel, nm = r.name || 'v1', ins = prvBucket(p, 'in'), done = ins.filter(function (x) { return x.st === 'done'; }), left = ins.filter(function (x) { return x.st !== 'done'; }), nx = prvNextName(p), h;
    if (!q.sh) return '';
    h = '<section class="card pd-card prv-shp" aria-labelledby="pd-h-shp"><div class="card-h ruled"><div><span class="pd-eb">Ship</span><h3 id="pd-h-shp">Ship ' + esc(nm) + '</h3><p>' + done.length + ' of ' + ins.length + (ins.length === 1 ? ' item is' : ' items are') + ' done. Shipping closes ' + esc(nm) + ' and opens ' + esc(nx) + '.</p></div></div>' +
      '<form class="prv-f prv-sf" data-pd-form="prv:ship" novalidate>';
    if (!done.length) h += '<p class="pd-note">Nothing in Now is marked done yet. Set the status of what is finished first. A release needs something that shipped.</p>';
    else {
      if (r.ship) h += '<fieldset class="prv-pick prv-met"><legend>Did ' + esc(nm) + ' deliver what you wrote? <q>' + esc(r.ship) + '</q></legend>' + [['yes', 'Yes'], ['mostly', 'Mostly'], ['no', 'Not really']].map(function (m) { return prvOptChip('radio', 'met', m[0], m[1], false); }).join('') + '</fieldset>';
      h += '<div class="fld"><label for="prv-sm">What shipped, in a line <span class="opt">Optional</span></label><input id="prv-sm" name="m" maxlength="140" placeholder="For example, the three core clauses are live" autocomplete="off"></div>';
      if (left.length) h += '<div class="prv-sl"><h4 class="pd-eb">Not done · ' + left.length + '</h4><p class="prv-hint">Each one has to go somewhere. Nothing stays behind in a release that has shipped.</p><ul>' + left.map(function (x) {
        return '<li><span class="t">' + esc(x.t) + '</span><span class="prv-cut"><span class="prv-pick">' + prvOptChip('radio', 'u-' + x.id, 'next', 'Carry to Next', true) + prvOptChip('radio', 'u-' + x.id, 'out', 'Cut to Never', false) + '</span><input name="r-' + x.id + '" maxlength="140" placeholder="Reason if cut" autocomplete="off" aria-label="Reason to cut ' + esc(x.t) + '"></span></li>';
      }).join('') + '</ul></div>';
      h += '<div class="fld"><label for="prv-sn">Next release <span class="opt">Name</span></label><input id="prv-sn" name="n" value="' + esc(nx) + '" maxlength="14" autocomplete="off"></div><p class="prv-hint">' + (r.cap ? 'Capacity stays at ' + prvDay(r.cap) + '. ' : '') + 'The baseline resets. What is on Next stays there until you pull it through the Gate.</p>';
    }
    return h + '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button>' + (done.length ? '<button type="submit" class="btn-primary btn-sm">Ship ' + esc(nm) + '</button>' : '') + '</div>' + prvErrSpan() + '</form></section>';
  }
  function prvShipsCard(p) {
    var sh = p.pv.ships; if (!sh.length) return '';
    return '<section class="card pd-card" aria-labelledby="pd-h-shd"><div class="card-h ruled"><div><h3 id="pd-h-shd">Shipped</h3><p>Releases you closed. The record stays.</p></div><div class="h-actions"><span class="count">' + sh.length + '</span><button type="button" class="btn-ghost btn-sm" data-pd="prv:vx" data-vk="s:' + sh[sh.length - 1].id + '">' + IC('clock') + 'All versions</button></div></div><div class="prv-shl">' +
      sh.slice().sort(function (a, b) { return b.ts - a.ts; }).map(function (e) {
        var m = PRV_MET[e.met], items = p.pv.items.filter(function (x) { return x.rid === e.id && x.sec === 'shipped'; });
        return '<details class="prv-shd"><summary><span class="t">' + esc(e.name) + '</span><time>' + esc(prvDate(e.ts)) + '</time>' + (m ? '<span class="chip ' + m[1] + '">' + m[0] + '</span>' : '') + '</summary><div class="prv-shb">' +
          (e.ship ? '<p class="prv-ship"><span>Done when</span> ' + esc(e.ship) + '</p>' : '') + (e.sum ? '<p class="prv-shs">' + esc(e.sum) + '</p>' : '') +
          '<p class="prv-hint">' + e.done + ' done' + (e.carried ? ' · ' + e.carried + ' carried to Next' : '') + (e.cut ? ' · ' + e.cut + ' cut' : '') + (e.cap ? ' · ' + e.planned + ' of ' + prvDay(e.cap) + ' planned' : '') + (e.add ? ' · +' + e.add + ' after the baseline' : '') + (e.took ? ' · took ' + prvDay(e.took) + (e.planD ? ' for ' + e.planD + ' planned (' + (e.took / e.planD).toFixed(1) + '×)' : '') : '') + '</p>' +
          (items.length ? '<ul>' + items.map(function (x) { return '<li>' + esc(x.t) + '</li>'; }).join('') + '</ul>' : '') + '</div></details>';
      }).join('') + '</div></section>';
  }
  function prvDueText(iso) {
    var t = new Date(iso + 'T12:00:00').getTime(), n = Math.round((t - Date.now()) / PRV_DAY);
    return { when: prvDate(t), n: n, cls: n < 0 ? 'crit' : n <= 7 ? 'warn' : 'neutral', t: n < 0 ? prvDay(-n) + ' late' : n === 0 ? 'Today' : 'In ' + prvDay(n) };
  }
  function prvRelForm(p) {
    var r = p.pv.rel;
    return '<section class="card pd-card prv-rel" aria-labelledby="pd-h-rel"><div class="card-h ruled"><div><span class="pd-eb">Release</span><h3 id="pd-h-rel">Define the release</h3><p>One open release at a time. Everything else waits on Next.</p></div></div>' +
      '<form class="prv-f prv-rf2" data-pd-form="prv:rel" novalidate>' +
      '<div class="fld"><label for="prv-rn">Name <span class="opt">For example, v1</span></label><input id="prv-rn" name="n" value="' + esc(r.name) + '" maxlength="14" autocomplete="off"></div>' +
      '<div class="fld wide"><label for="prv-rs">It is done when… <span class="opt">One sentence</span></label><textarea id="prv-rs" name="s" rows="2" maxlength="160" placeholder="A small studio can build and hand over a brand guide in one sitting.">' + esc(r.ship) + '</textarea></div>' +
      '<div class="fld"><label for="prv-rd">Target date <span class="opt">Optional</span></label><input id="prv-rd" name="d" type="date" value="' + esc(r.date) + '"></div>' +
      '<div class="fld"><label for="prv-rc2">Capacity in days <span class="opt">Optional</span></label><input id="prv-rc2" name="c" type="number" inputmode="numeric" min="0" max="365" step="1" value="' + (r.cap || '') + '" placeholder="For example, 25"></div>' +
      '<fieldset class="fld wide prv-szd"><legend>Days for each size <span class="opt">Your estimates</span></legend><div class="prv-szr">' + PRV_SZ.map(function (z) { return '<label><b>' + z[0] + '</b><input name="sz' + z[0] + '" type="number" inputmode="numeric" min="1" max="60" step="1" value="' + prvSzD(p, z[0]) + '" aria-label="Days for size ' + z[0] + '"></label>'; }).join('') + '</div></fieldset>' +
      (p.pv.base ? '<div class="fld wide"><label for="prv-rw">Why more room? <span class="opt">Needed for more days, cheaper sizes or a later date</span></label><input id="prv-rw" name="w" maxlength="140" placeholder="For example, the pilot studios need offline mode" autocomplete="off"></div>' : '') +
      '<p class="prv-hint wide"><span>Capacity is the days you can really give this release. Sizes are estimates: change what S, M and L cost if your work runs differently. With a capacity, Now can tell you when it is full.</span>' + (prvRatioHint(p) ? ' <span>' + prvRatioHint(p).trim() + '</span>' : '') + (p.pv.base ? ' <span>The baseline holds this appetite: more room after it needs a reason, and a later date is the release’s one extension.</span>' : '') + '</p>' +
      '<div class="f-acts wide"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save release</button></div>' + prvErrSpan() + '</form></section>';
  }
  /* the planning fallacy, measured on your own releases */
  function prvRatioHint(p) {
    var sh = p.pv.ships.filter(function (e) { return e.took && e.planD; }), e = sh[sh.length - 1]; if (!e) return '';
    var r = e.took / e.planD; return r > 1.1 ? ' Your last release took ' + r.toFixed(1) + '× its plan. Plan for that.' : r < 0.9 ? ' Your last release came in early.' : ' Your last release landed on its plan.';
  }
  function prvRelCard(p) {
    var q = pd.pv, r = p.pv.rel, ld = prvLoad(p), nm = r.name || 'v1', due = r.date ? prvDueText(r.date) : null, ins = prvBucket(p, 'in');
    if (q.re) return prvRelForm(p);
    var pct = ld.cap ? Math.min(100, Math.round(ld.days / ld.cap * 100)) : 0, load;
    /* v122 (94): said in words (0 / 25 days with 25 days free said one thing twice and never what the days were); the bar and what is
       free once something is planned */
    if (ld.cap) load = '<div class="prv-load' + (ld.over ? ' over' : !ld.left ? ' full' : '') + '"><div class="prv-load-h"><b>' + ld.days + ' of ' + ld.cap + ' days planned</b>' + (ld.over ? '<span class="chip crit">' + prvDay(ld.over) + ' over</span>' : !ld.left ? '<span class="chip warn">Full</span>' : ld.days ? '<span class="chip ok">' + prvDay(ld.left) + ' free</span>' : '') + '</div>' + (ld.days ? '<div class="prv-bar" role="img" aria-label="' + ld.days + ' of ' + ld.cap + ' days planned"><i style="width:' + pct + '%"></i></div>' : '') + '</div>';
    else load = '<div class="prv-load"><div class="prv-load-h"><b>' + ld.days + ' ' + (ld.days === 1 ? 'day' : 'days') + ' planned</b><button type="button" class="link" data-pd="prv:rel">Set a capacity</button></div><p class="prv-hint">With a capacity, Now can tell you when it is full and the Gate can ask what to swap out.</p></div>';
    return '<section class="card pd-card prv-rel" aria-labelledby="pd-h-rel"><div class="card-h ruled"><div><span class="pd-eb">Release</span><h3 id="pd-h-rel">' + esc(nm) + '</h3><p>' + (due ? 'Target ' + esc(due.when) + ' · <span class="prv-due ' + due.cls + '">' + esc(due.t) + '</span>' : 'No target date') + '</p></div><div class="h-actions">' + (ins.length ? '<button type="button" class="btn-' + (ins.every(function (x) { return x.st === 'done'; }) ? 'primary' : 'ghost') + ' btn-sm" data-pd="prv:ship">' + IC('send') + 'Ship ' + esc(nm) + '</button>' : '') + '<button type="button" class="btn-ghost btn-sm prv-vxb" data-pd="prv:vx">' + IC('clock') + 'All versions</button><button type="button" class="icon-sm xs" data-pd="prv:rel" aria-label="Edit the release">' + IC('edit') + '</button></div></div>' + prvLateHTML(p) + '<div class="prv-rel-b">' +
      (r.ship ? '<p class="prv-ship"><span>' + esc(nm) + ' is done when</span> ' + esc(r.ship) + '</p>' : '<p class="prv-ship mute">Write what “' + esc(nm) + ' is done” means. If it is not on that line, it does not belong in ' + esc(nm) + '.</p><div><button type="button" class="btn-ghost btn-sm" data-pd="prv:rel">Write the ship line</button></div>') +
      load + prvBaseMiss(p) + (ld.un ? '<p class="prv-hint prv-nudge">' + ld.un + (ld.un === 1 ? ' item in Now has' : ' items in Now have') + ' no size, so this total is too low.</p>' : '') + '</div></section>';
  }
  function prvRebaseForm(p, d) {
    return '<form class="prv-f prv-rb" data-pd-form="prv:rebase" novalidate><label for="prv-rbw">Why accept this drift? <span class="opt">Required</span></label><input id="prv-rbw" name="w" maxlength="140" placeholder="For example, the pilot studios need both" autocomplete="off">' +
      '<p class="prv-hint">This makes today’s Now the new baseline' + (d.ov ? ' and accepts ' + d.ov + (d.ov === 1 ? ' override' : ' overrides') : '') + '. History keeps the old baseline and your reason.</p>' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Set new baseline</button></div>' + prvErrSpan() + '</form>';
  }
  /* v122 (94): what the baseline still needs, said once on the release card, where it is set */
  function prvBaseMissing(p) { var pv = p.pv, miss = []; if (pv.base) return miss; if (!pv.rel.ship) miss.push('a done-when line'); if (!pv.rel.date) miss.push('a target date'); if (!pv.rel.cap) miss.push('a capacity in days'); return miss; }
  function prvBaseMiss(p) { var m = prvBaseMissing(p); return m.length ? '<p class="prv-hint prv-bmiss">A baseline needs ' + prvList(m) + ' first. With them, Drift and the date mean something.</p>' : ''; }
  function prvBaseCard(p) {
    if (prvBaseMissing(p).length) return '';   /* v122 (94): the release card says what is missing; no second card asking for it */
    var pv = p.pv, q = pd.pv, d = prvDrift(p), g = p.glance, lv = PD_DRIFT[g.drift] || PD_DRIFT[0], label = g.dl || lv[0], cls = g.dl ? '' : lv[1], gauge = '', i;
    for (i = 0; i < 3; i++) gauge += '<i' + (i < g.drift ? ' class="on"' : '') + '></i>';
    var ins = prvBucket(p, 'in').length;
    var h = '<section class="card pd-card" aria-labelledby="pd-h-base"><div class="card-h ruled"><div><h3 id="pd-h-base">Baseline</h3><p>' + (pv.base ? 'Committed ' + esc(prvDate(pv.base.ts)) + ' with ' + pv.base.ids.length + (pv.base.ids.length === 1 ? ' item.' : ' items.') : 'Not committed yet.') + '</p></div>' + '</div><div class="prv-bl">';
    var miss = []; if (!pv.rel.ship) miss.push('a done-when line'); if (!pv.rel.date) miss.push('a target date'); if (!pv.rel.cap) miss.push('a capacity in days');
    if (!pv.base && miss.length) h += '<p class="pd-note">A baseline needs an appetite first: ' + prvList(miss) + '. With them, Drift and the date mean something.</p><button type="button" class="btn-ghost btn-sm" data-pd="prv:rel">Set the release</button>';
    else if (!pv.base) {
      h += '<p class="pd-note">Commit a baseline when Now feels right. From then on, every change is measured against it. Nothing is blocked. Drift only shows what moved.</p><button type="button" class="btn-primary btn-sm" data-pd="prv:base"' + (ins ? '' : ' disabled') + '>' + IC('shield') + 'Commit baseline</button>' + (ins ? '' : '<p class="prv-hint">Add at least one item to Now first.</p>');
    } else {
      h += '<div class="pd-drift"><div><span>Drift since baseline</span><span class="chip' + (cls ? ' ' + cls : '') + '">' + esc(label) + '</span></div><div class="pd-gauge ' + cls + '" role="img" aria-label="Drift: ' + esc(label) + '">' + gauge + '</div></div>';
      h += '<p class="prv-dsum">' + esc(prvDriftText(d)) + '</p>';
      var ap = prvAppetite(p);
      if (d.n || ap.length) h += '<ul class="prv-dr">' + d.add.map(function (x) { return '<li><span class="g">+</span><span><b>' + esc(x.t) + '</b><small>' + (d.ren.indexOf(x) > -1 ? 'Renamed after the baseline. It was “' + esc(pv.base.t[x.id]) + '”' : x.ov ? '<span class="prv-ovt">Override</span> ' + esc((x.gate && x.gate.ovw) || 'No reason recorded') : x.gate ? 'Passed the Gate' : 'Added without a Gate record') + '</small></span></li>'; }).join('') + d.gone.map(function (x) { return '<li class="cut"><span class="g">−</span><span><b>' + esc(x.t) + '</b><small>' + (x.sec === 'out' ? 'Moved to Never' : x.sec === 'next' ? 'Moved to Next' : x.sec === 'inbox' ? 'Moved back to the Parking Lot' : 'Removed') + '</small></span></li>'; }).join('') + d.grow.map(function (g) { return '<li class="grew"><span class="g">↑</span><span><b>' + esc(g.x.t) + '</b><small>Grew ' + g.from + ' → ' + g.to + ', +' + prvDay(g.d) + '</small></span></li>'; }).join('') +
        ap.map(function (e) { return '<li class="grew"><span class="g">↗</span><span><b>' + esc(e.t) + '</b><small>' + (e.why ? 'Reason: ' + esc(e.why) : 'No reason recorded') + '</small></span></li>'; }).join('') + '</ul>';
      if (q.rb) h += prvRebaseForm(p, d);
      else h += '<button type="button" class="btn-ghost btn-sm" data-pd="prv:rebase"' + (d.n || ap.length ? '' : ' disabled') + '>Set a new baseline</button><p class="prv-hint">' + (d.n || ap.length ? 'Resets Drift to zero. It needs a reason, and History keeps the old baseline.' : 'Nothing has drifted, so there is nothing to reset.') + '</p>';
      h += '<p class="prv-hint prv-lvh">Drift counts days: what was added and what grew, against the days in the baseline. Low up to 15%, Moderate up to 35%, High above. Two overrides raise it one level. Cutting never counts against you.</p>';
    }
    return h + '</div></section>';
  }
  function prvScopeHTML(p) {
    var cta = '<button type="button" class="btn-ghost" data-pd="prv:gate" data-m="add">' + IC('plus') + '<span>Add item</span></button>';   /* v122 (93): parking an idea is the tab's solid button */
    /* v97 (43): without a release, no release card, no Ship and no baseline (it measures a release); one quiet way to start one */
    if (!prvRelOn(p)) {
      cta = '<div class="pd-ph-acts">' + (pd.pv.re ? '' : '<button type="button" class="btn-ghost" data-pd="prv:rel">' + IC('clock') + '<span>Plan a release</span></button>') + cta + '</div>';
      return pdHeadHTML(p, 'scope', cta) + '<div class="pd-cols prv-scp"><div class="pd-col">' + (pd.pv.re ? prvRelForm(p) : '') + prvInCard(p) + prvNextCard(p) + prvOutCard(p) + '</div><div class="pd-col">' + prvParkCard(p) + '</div></div>';
    }
    return pdHeadHTML(p, 'scope', cta) + '<div class="pd-cols prv-scp"><div class="pd-col">' + prvRelCard(p) + prvShipForm(p) + prvInCard(p) + prvNextCard(p) + prvOutCard(p) + '</div><div class="pd-col">' + prvParkCard(p) + prvBaseCard(p) + '</div></div>';
  }
  function prvMarketNote(p) {
    var pv = p.pv, ins = prvBucket(p, 'in'), linked = {}, un, one;
    if (!prvJobs(p).length || !ins.length) return '';
    pv.jobs.forEach(function (j) { j.items.forEach(function (id) { linked[id] = 1; }); });
    un = ins.filter(function (x) { return !linked[x.id]; }); one = un.length === 1;
    if (!un.length) return '';
    return '<div class="prv-ms in warn" role="note"><span class="pde-ic" aria-hidden="true">' + IC('search') + '</span><div><b>' + (one ? '1 item answers no job' : un.length + ' items answer no job') + '</b><small>' +
      esc(prvList(un.slice(0, 2).map(function (x) { return '“' + prvT(x.t, 30) + '”'; })) + (un.length > 2 ? ' and ' + (un.length - 2) + ' more' : '')) + '. Link ' + (one ? 'it' : 'them') + ' to a job in Validate, or ask whether ' + (one ? 'it belongs' : 'they belong') + '.</small></div><button type="button" class="btn-ghost btn-sm" data-pd="goto" data-tab="market">Open Validate</button></div>';
  }

  /* parking lot: ideas not yet decided. Next and Never live on Scope */
  function prvIdeaCard(p, x) {
    var q = pd.pv, rv = prvRevisit(x), must = prvMust(x), cls = 'prv-idea' + (rv ? ' rv' : '') + (must ? ' must' : ''), h;
    if (q.pke === x.id) {
      return '<li class="' + cls + ' editing"><form class="prv-f prv-ie" data-pd-form="prv:idea" data-id="' + x.id + '" novalidate><label class="sr-only" for="prv-it-' + x.id + '">Idea</label><input id="prv-it-' + x.id + '" name="t" value="' + esc(x.t) + '" maxlength="120" placeholder="Idea" autocomplete="off">' +
        '<label class="sr-only" for="prv-id-' + x.id + '">Detail</label><input id="prv-id-' + x.id + '" name="d" value="' + esc(x.d) + '" maxlength="160" placeholder="A line of detail (optional)" autocomplete="off">' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div>' + prvErrSpan() + '</form></li>';
    }
    h = '<li class="' + cls + '" data-k="' + x.id + '"><div class="prv-idea-h"><h3>' + esc(x.t) + '</h3><button type="button" class="icon-sm xs" data-pd="prv:pke" data-id="' + x.id + '" aria-label="Edit ' + esc(x.t) + '">' + IC('edit') + '</button></div>';
    if (x.d) h += '<p class="prv-idea-d">' + esc(x.d) + '</p>';
    if (x.u) h += '<a class="prv-idea-u" href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer">' + IC('link') + esc(pdHost(x.u)) + '</a>';
    var twn = x.sim && prvById(p.pv.items, x.sim);
    if (twn && twn.sec === 'out') h += '<p class="prv-idea-s">' + IC('shield') + '<span>Looks like “' + esc(prvT(twn.t, 40)) + '”, which you ruled out.' + (twn.why ? ' Reason: ' + esc(prvT(twn.why, 70)) : '') + '</span></p>';
    h += '<div class="prv-idea-m">' + (x.tag ? '<span class="chip quiet">#' + esc(x.tag) + '</span>' : '') + '<span>Parked ' + esc(prvShort(x.ts)) + (prvAge(x.ts) ? ' ago' : '') + '</span>' + (must ? '<span class="chip warn">Decide now</span>' : rv ? '<span class="chip warn">Revisit</span>' : '') + '</div>';
    if (q.drp === x.id) {
      h += '<form class="prv-f prv-ip" data-pd-form="prv:drop" data-id="' + x.id + '" novalidate><label for="prv-dw-' + x.id + '">Why never? <span class="opt">Required</span></label><input id="prv-dw-' + x.id + '" name="w" maxlength="140" placeholder="So nobody argues it twice" autocomplete="off"><p class="prv-hint">It moves to Never with this reason. Bringing it back later goes through the Scope Gate.</p>' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Rule it out</button></div>' + prvErrSpan() + '</form>';
    } else {
      h += '<div class="prv-idea-a"><button type="button" class="btn-ghost btn-sm prv-pro" data-pd="prv:gate" data-m="promote" data-id="' + x.id + '" aria-label="Put ' + esc(x.t) + ' through the Scope Gate for Now" title="The Scope Gate decides whether it fits Now">' + IC('shield') + 'Now</button><button type="button" class="btn-ghost btn-sm" data-pd="prv:inxt" data-id="' + x.id + '">Next</button><button type="button" class="btn-ghost btn-sm" data-pd="prv:idrp" data-id="' + x.id + '">Never</button>' +
        (rv && !must ? '<button type="button" class="link" data-pd="prv:ikeep" data-id="' + x.id + '">Keep parked once</button>' : '') + '</div>';
    }
    return h + '</li>';
  }
  function prvTrailHTML(done) {
    if (!done.length) return '';
    var list = done.slice().sort(function (a, b) { return b.xts - a.xts; });
    return '<details class="prv-trail"><summary><span>Decided</span><span class="n">' + list.length + '</span></summary><ul>' + list.map(function (x) {
      return '<li><span class="t">' + esc(x.t) + '</span><span class="chip ' + (x.to === 'in' ? 'ok' : x.to === 'out' ? 'crit' : 'neutral') + '">→ ' + (PRV_BN[x.to] || 'Now') + '</span><time>' + esc(prvDate(x.xts || x.ts)) + '</time></li>';
    }).join('') + '</ul></details>';
  }
  /* the Parking Lot is the inbox of Scope: ideas wait here until each one goes to Now (through the Gate), Next or Never */
  function prvParkCard(p) {
    var q = pd.pv, pk = p.pv.park, parked = pk.filter(function (x) { return x.st === 'parked'; }), done = pk.filter(function (x) { return x.st === 'promoted'; });
    var nvx = q.sim && prvById(p.pv.items, q.sim.id), sim = '';
    if (nvx && nvx.sec === 'out') sim = '<div class="prv-sim" role="alert"><span class="pde-ic" aria-hidden="true">' + IC('shield') + '</span><div><b>You already ruled this out: “' + esc(prvT(nvx.t, 50)) + '”</b><small>' + (nvx.why ? 'Reason: ' + esc(String(nvx.why).replace(/[.\s]+$/, '')) + '. ' : '') + (nvx.rs ? 'It has come up again ' + prvTimes(nvx.rs) + ' since. ' : '') + 'Keep it out, or park it as a new idea.</small></div><div class="prv-sim-a"><button type="button" class="btn-ghost btn-sm" data-pd="prv:simk">Keep it out</button><button type="button" class="btn-primary btn-sm" data-pd="prv:simc">Park anyway</button></div></div>';
    else q.sim = null;
    var qa = '<form class="prv-f prv-qa" data-pd-form="prv:padd" novalidate><span class="pde-ic" aria-hidden="true">' + IC('bulb') + '</span><label class="sr-only" for="prv-qa">Park an idea</label><input id="prv-qa" name="t" maxlength="120" placeholder="Park an idea. Add #tags if you like." autocomplete="off"><button type="submit" class="btn-primary btn-sm">Park</button>' + prvErrSpan() + '</form>';
    var list = parked.slice().sort(function (a, b) {
      var ma = prvMust(a), mb = prvMust(b); if (ma !== mb) return ma ? -1 : 1;
      var ra = prvRevisit(a), rb = prvRevisit(b); if (ra !== rb) return ra ? -1 : 1;
      return ra ? prvClock(a) - prvClock(b) : prvClock(b) - prvClock(a);
    }), body;
    if (q.tri && list.length) {
      list = list.slice().sort(function (a, b) { var sa = q.sk.indexOf(a.id), sb = q.sk.indexOf(b.id); if ((sa < 0) !== (sb < 0)) return sa < 0 ? -1 : 1; return sa - sb; });
      if (!q.trn || q.trn < list.length) q.trn = list.length;
      var dn = q.trn - list.length;
      body = '<div class="prv-tf"><div class="prv-tf-h"><b>Idea ' + (dn + 1) + ' of ' + q.trn + '</b><span class="prv-tf-bar" role="img" aria-label="' + dn + ' of ' + q.trn + ' decided"><i style="width:' + Math.round(dn / q.trn * 100) + '%"></i></span><button type="button" class="link" data-pd="prv:trix">Exit</button></div><p class="prv-hint">Decide each one: Now, Next or Never. Skip only moves it to the end.</p></div>' +
        '<ul class="prv-ideas prv-focus">' + prvIdeaCard(p, list[0]) + '</ul>' + (list.length > 1 ? '<div class="prv-tf-f"><button type="button" class="btn-ghost btn-sm" data-pd="prv:trisk" data-id="' + list[0].id + '">Skip for now</button></div>' : '');
    } else {
      q.tri = 0;
      body = list.length ? '<ul class="prv-ideas">' + list.map(function (x) { return prvIdeaCard(p, x); }).join('') + '</ul>' : '<p class="pd-crs-e prv-empty">' + (pk.length ? 'Nothing is parked. Every idea was decided.' : 'Park an idea here instead of adding it to Now.') + '</p>';
    }
    var tri = parked.length >= 2 && !q.tri ? '<div class="prv-pk-tri"><span>' + parked.length + ' ideas are waiting</span><button type="button" class="link" data-pd="prv:tri">Decide one by one</button></div>' : '';
    return '<section class="card pd-card prv-park" aria-labelledby="pd-h-park"><div class="card-h ruled"><div><h3 id="pd-h-park">Parking Lot</h3><p>Undecided ideas. Each ends in Now, Next or Never.</p></div><div class="h-actions"><span class="count" title="An idea that waits ' + PRV_REV + ' days comes back to revisit">' + parked.length + '</span></div></div>' +
      (q.tri && parked.length ? '' : qa + sim + tri) + body + prvTrailHTML(done) + '</section>';
  }
  /* market: the gap check */
  var PRV_DECIDE = 'Continue, narrow or stop?';
  function prvSelHTML(id, name, label, opts) { return '<span class="pd-sel"><select id="' + id + '" name="' + name + '" aria-label="' + esc(label) + '">' + opts + '</select>' + IC('chev') + '</span>'; }
  function prvSrcOpts(p, sel) {
    return '<option value="">No source</option>' + p.pv.src.map(function (s) { return '<option value="' + s.n + '"' + (sel === s.n ? ' selected' : '') + '>[' + s.n + '] ' + esc(prvT(s.t, 32)) + (s.ai && !s.ver ? ' · unverified' : '') + '</option>'; }).join('');
  }
  function prvGlyph(l) { return '<i class="prv-g" data-l="' + l + '" aria-hidden="true"></i>'; }
  function prvDemText(j, p) {
    var d = prvDemand(j, p);
    if (d.lv === 'none') return 'No demand evidence';
    if (d.lv === 'served') return 'Rivals’ own pages only · served';
    if (d.lv === 'strong') return d.kinds.map(function (k) { return PRV_DEM[k]; }).join(' · ') + (d.unsrc ? ' · ' + d.unsrc + ' without a source' : '');
    var top = j.dem.some(function (e) { return e.k === 'paid' || e.k === 'workaround'; }) ? 'Unsourced' : j.dem.some(function (e) { return e.k === 'complaint'; }) ? 'Complaints only' : 'Mentions only';
    return top + ' · weak';
  }

  function prvVerdictCard(p) {
    var v = prvVerdict(p), pv = p.pv, K = PRV_VK[v.k], h, MIX = [['gap', 'Worth a test'], ['taken', 'Served'], ['empty', 'No demand'], ['minor', 'Minor'], ['unknown', 'Not rated']];
    h = '<section class="card prv-vd" data-k="' + (v.unc.length ? 'unc' : v.k) + '" aria-labelledby="prv-vd-h"><div class="prv-vd-top"><div class="prv-vd-main"><span class="pd-eb">Gap check · desk research</span><h3 id="prv-vd-h"><span class="prv-vd-dot" aria-hidden="true"></span>' + (v.unc.length ? 'Unconfirmed' : K[0]) + '</h3><p class="prv-vd-why">' + v.ws.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join(' ') + '</p></div>';
    if (v.dec) h += '<div class="prv-vd-meta"><span class="chip ' + (v.conf === 'high' ? 'ok' : v.conf === 'low' ? 'warn' : 'neutral') + '" title="' + esc(v.prov ? 'Low until the AI-reported sources behind it are verified.' : v.gunr ? 'Low until every rival is rated on the open job.' : v.subf ? 'At most Medium: a substitute already does the open job in full.' : 'How well the sources back this verdict. It is desk research, not proof of demand.') + '">Evidence strength · ' + v.conf.charAt(0).toUpperCase() + v.conf.slice(1) + '</span>' + (v.prov ? '<span class="chip warn" title="Some decisive sources are AI-reported and not verified yet">Provisional</span>' : '') + '</div>';
    h += '</div>';
    if (pv.jobs.length) {
      var live = MIX.filter(function (m) { return v.by[m[0]].length; });
      h += '<div class="prv-mix" role="img" aria-label="Jobs: ' + esc(live.map(function (m) { return v.by[m[0]].length + ' ' + m[1].toLowerCase(); }).join(', ')) + '">' + live.map(function (m) { return '<i data-c="' + m[0] + '" style="flex-grow:' + v.by[m[0]].length + '"></i>'; }).join('') + '</div>' +
        '<ul class="prv-mix-l" aria-hidden="true">' + live.map(function (m) { return '<li><i data-c="' + m[0] + '"></i>' + v.by[m[0]].length + ' ' + m[1].toLowerCase() + '</li>'; }).join('') + '</ul>';
    }
    if (v.k === 'none' || v.k === 'thin') {
      h += '<ol class="prv-vd-steps">' + v.steps.map(function (s, i) { return '<li' + (s[0] ? ' class="on"' : '') + '><span class="prv-vd-n" aria-hidden="true">' + (s[0] ? IC('tick') : i + 1) + '</span><span>' + esc(s[1]) + (s[0] ? '<span class="sr-only"> (done)</span>' : '') + '</span></li>'; }).join('') + '</ol>';
    }
    if (v.warn.length) {
      h += '<ul class="prv-vd-w">' + v.warn.slice(0, 4).map(function (w) { return '<li><button type="button" class="prv-w" data-pd="prv:' + w.a + '"' + (w.id ? ' data-id="' + w.id + '"' : '') + '><i aria-hidden="true"></i><span>' + esc(w.t) + '</span>' + IC('chev') + '</button></li>'; }).join('') + '</ul>';
    }
    if ((v.k === 'crowded' || v.k === 'empty') && prvLocked(p) && !pv.stop) h += '<div class="prv-vd-a"><button type="button" class="btn-primary btn-sm" data-pd="pf:dec">Narrow or stop…</button></div>';
    return h + '<p class="prv-vd-foot">Worked out on this device from the jobs, ratings and sources below. AI research can only add sources, and you verify each one.</p></section>';
  }

  function prvJobForm(p, j) {
    var id = j ? j.id : 'new';
    return '<form class="prv-f prv-jf" data-pd-form="prv:job"' + (j ? ' data-id="' + j.id + '"' : '') + ' novalidate><label for="prv-jt-' + id + '">' + (j ? 'Job' : 'New job') + ' <span class="opt">What is the customer trying to get done?</span></label>' +
      '<input id="prv-jt-' + id + '" name="t" value="' + (j ? esc(j.t) : '') + '" maxlength="90" placeholder="For example, Keep brand files in the studio’s own Drive" autocomplete="off">' +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (j ? 'Save' : 'Add job') + '</button></div>' + prvErrSpan() + '</form>';
  }
  function prvCvCell(c, j) {
    var v = c.cov[j.id], l = v ? v.l : 'x', lbl = v ? PRV_LV[v.l] : 'Not rated';
    return '<button type="button" class="prv-cv" data-pd="prv:jx" data-id="' + j.id + '" data-m="' + c.id + '" aria-label="' + esc(c.n + ': ' + lbl + (v && !v.s ? ', no source' : '') + '. Edit coverage for ' + j.t) + '">' + prvGlyph(l) + '<span class="prv-cvn" aria-hidden="true">' + esc(c.n) + '</span>' + (v && !v.s ? '<b class="prv-nos" aria-hidden="true" title="No source"></b>' : '') + '</button>';
  }
  function prvJobDetail(p, j, fresh) {
    var q = pd.pv, pv = p.pv, h = '<div class="prv-jd' + (fresh ? ' fresh' : '') + '" id="prv-jd-' + j.id + '" data-j="' + j.id + '" role="group" aria-label="Details for ' + esc(j.t) + '">';
    h += q.je === j.id ? '<div class="prv-jd-s">' + prvJobForm(p, j) + '</div>' :
      '<div class="prv-jd-bar"><button type="button" class="btn-ghost btn-sm" data-pd="prv:jedit" data-id="' + j.id + '">' + IC('edit') + 'Rename</button><button type="button" class="btn-ghost btn-sm prv-dng" data-pd="prv:jrm" data-id="' + j.id + '">' + IC('x') + 'Remove job</button></div>';
    h += '<section class="prv-jd-s"><h4 class="pd-eb">Who needs it</h4>';
    h += j.dem.length ? '<ul class="prv-evs">' + j.dem.map(function (e) {
      return '<li class="prv-ev"><span class="chip neutral' + (e.k === 'paid' || e.k === 'workaround' ? ' strong' : '') + '">' + PRV_DEM[e.k] + '</span><span class="prv-evx">' + esc(e.x) + prvRefs(p, e.src ? [e.src] : []) + (e.src ? '' : ' <span class="pd-tag mini"><i></i>No source</span>') + '</span>' +
        '<button type="button" class="icon-sm xs" data-pd="prv:evrm" data-id="' + j.id + '" data-e="' + e.id + '" aria-label="Remove this note">' + IC('x') + '</button></li>';
    }).join('') + '</ul>' : '<p class="prv-hint">Nothing yet. Who wants this, and how do you know?</p>';
    h += '<form class="prv-f prv-evf" data-pd-form="prv:ev" data-id="' + j.id + '" novalidate><div class="prv-evg">' +
      '<div><label for="prv-ek-' + j.id + '">Kind</label>' + prvSelHTML('prv-ek-' + j.id, 'k', 'Kind of evidence', Object.keys(PRV_DEM).map(function (k) { return '<option value="' + k + '">' + PRV_DEM[k] + '</option>'; }).join('')) + '</div>' +
      '<div class="prv-evgx"><label for="prv-ex-' + j.id + '">What you found</label><input id="prv-ex-' + j.id + '" name="x" maxlength="160" placeholder="For example, three studios said they would pay once" autocomplete="off"></div>' +
      '<div><label for="prv-es-' + j.id + '">Source</label>' + prvSelHTML('prv-es-' + j.id, 's', 'Source', prvSrcOpts(p, 0)) + '</div></div>' +
      '<p class="prv-hint">Pays and Workaround count as proof, and only with a source. Complaints alone do not.</p>' +
      '<div class="f-acts"><button type="submit" class="btn-ghost btn-sm">' + IC('plus') + 'Add note</button></div>' + prvErrSpan() + '</form></section>';
    h += '<form class="prv-f prv-jc" data-pd-form="prv:jdet" data-id="' + j.id + '" novalidate><section class="prv-jd-s"><h4 class="pd-eb">Who already covers it</h4>';
    if (!pv.comps.length) h += '<p class="prv-hint">No competitors yet. <button type="button" class="link" data-pd="prv:knew">Add a competitor</button> to rate how well it covers this job.</p>';
    else h += '<ul class="prv-cvl">' + pv.comps.map(function (c) {
      var v = c.cov[j.id], cur = v ? v.l : '', nm = 'l-' + c.id;
      return '<li><span class="prv-cvl-n">' + esc(c.n) + (c.sub ? ' <span class="chip neutral">Substitute</span>' : '') + '</span><fieldset class="prv-pick prv-lv"><legend class="sr-only">' + esc(c.n) + ' covers this job</legend>' +
        [['', 'Not rated'], ['none', 'None'], ['partial', 'Partial'], ['full', 'Full']].map(function (o) { return prvOptChip('radio', nm, o[0], o[1], cur === o[0]); }).join('') + '</fieldset>' +
        prvSelHTML('prv-cs-' + j.id + '-' + c.id, 's-' + c.id, 'Source for ' + c.n, prvSrcOpts(p, v ? v.s : 0)) + '</li>';
    }).join('') + '</ul>';
    h += '</section><section class="prv-jd-s"><h4 class="pd-eb">Answered by</h4>';
    var ins = pv.items.filter(function (x) { return x.sec === 'in' || x.sec === 'next'; });
    h += ins.length ? '<fieldset class="prv-pick"><legend class="sr-only">Items in Now or Next that answer this job</legend>' + ins.map(function (x) { return prvOptChip('checkbox', 'it', x.id, esc(prvT(x.t, 40)) + (x.sec === 'next' ? ' <small>Next</small>' : ''), j.items.indexOf(x.id) > -1); }).join('') + '</fieldset>' : '<p class="prv-hint">Nothing in Now or Next yet. Add items on the Scope tab, then link them here.</p>';
    h += '</section><div class="f-acts"><button type="submit" class="btn-primary btn-sm">Save coverage</button></div>' + prvErrSpan() + '</form></div>';
    return h;
  }
  function prvJobRow(p, j) {
    var q = pd.pv, open = q.jx === j.id, cl = prvJobClass(p, j), sc = prvJobItems(p, j), CL = { gap: ['', 'Worth a test'], taken: ['neutral', 'Served'], empty: ['warn', 'No demand'], minor: ['neutral', 'Minor'], unknown: ['neutral', 'Not rated'] }[cl];
    return '<li class="prv-gm-j' + (open ? ' open' : '') + '" data-j="' + j.id + '" data-cl="' + cl + '"><div class="prv-gm-r">' +
      '<button type="button" class="prv-jb" data-pd="prv:jx" data-id="' + j.id + '" aria-expanded="' + open + '" aria-controls="prv-jd-' + j.id + '"><span class="prv-jt">' + esc(j.t) + '</span><span class="prv-jm"><span class="chip ' + CL[0] + '">' + CL[1] + '</span><span class="prv-dm">' + esc(prvDemText(j, p)) + '</span></span>' + IC('chev') + '</button>' +
      p.pv.comps.map(function (c) { return prvCvCell(c, j); }).join('') +
      '<span class="prv-sc" title="' + (sc.length ? esc(sc.map(function (x) { return x.t; }).join(', ')) : 'Nothing in Now answers this job') + '"><span class="prv-scl">In Now: </span>' + (sc.length ? '<b>' + sc.length + '</b>' : '<span aria-label="none">—</span>') + '</span></div>' +
      (open ? prvJobDetail(p, j, q.jan === j.id) : '') + '</li>';
  }
  function prvMapCard(p) {
    var q = pd.pv, pv = p.pv, nc = pv.comps.length, h, cols = 'minmax(210px,1.7fr)' + (nc ? ' repeat(' + nc + ',minmax(72px,1fr))' : '') + ' 64px';
    h = '<section class="card pd-card prv-gm" aria-labelledby="pd-h-gm"><div class="card-h ruled"><div><h3 id="pd-h-gm">Gap map</h3><p>What your customer needs done, and who already does it.</p></div><div class="h-actions"><span class="count">' + pv.jobs.length + '</span></div></div>';
    if (q.je === 'new') h += '<div class="prv-gm-nf">' + prvJobForm(p) + '</div>';
    if (!pv.jobs.length) return h + (q.je === 'new' ? '' : '<p class="pd-crs-e">No jobs yet. A job is something your customer is trying to get done, for example “Keep brand files in the studio’s own Drive”.</p>') + '</section>';
    h += '<div class="prv-gm-key" aria-hidden="true"><span><i class="prv-g" data-l="full"></i>Full</span><span><i class="prv-g" data-l="partial"></i>Partial</span><span><i class="prv-g" data-l="none"></i>None</span><span><i class="prv-g" data-l="x"></i>Not rated</span><span class="prv-gm-kn"><b class="prv-nos"></b>No source</span></div>';
    h += '<div class="prv-gm-w"><div class="prv-gm-t" style="--nc:' + nc + ';--gc:' + cols + '">';
    h += '<div class="prv-gm-r head" aria-hidden="true"><span>Job</span>' + pv.comps.map(function (c) { return '<span class="prv-gm-h" title="' + esc(c.n) + '">' + esc(c.n) + '</span>'; }).join('') + '<span class="prv-gm-hs">Scope</span></div>';
    h += '<ul class="prv-gm-l">' + pv.jobs.map(function (j) { return prvJobRow(p, j); }).join('') + '</ul></div></div>';
    if (!nc) h += '<p class="pd-crs-e prv-gm-hint">Track a competitor to rate how well it covers each job.</p>';
    return h + '</section>';
  }

  function prvWedgeBlock(p) {
    var q = pd.pv, pv = p.pv, w = pv.wedge, j = w.job && prvById(pv.jobs, w.job), cl = j && prvJobClass(p, j);
    if (q.we) {
      return '<form class="prv-f prv-wf" data-pd-form="prv:wedge" novalidate><label for="prv-wt">Your wedge <span class="opt">Why would someone switch?</span></label><textarea id="prv-wt" name="t" rows="2" maxlength="140" placeholder="One sentence: what you do that the others do not">' + esc(w.t) + '</textarea>' +
        '<label for="prv-wj">Backed by <span class="opt">Optional</span></label>' + prvSelHTML('prv-wj', 'j', 'The job this wedge rests on', '<option value="">No job yet</option>' + pv.jobs.map(function (x) { return '<option value="' + x.id + '"' + (w.job === x.id ? ' selected' : '') + '>' + esc(prvT(x.t, 52)) + '</option>'; }).join('')) +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div>' + prvErrSpan() + '</form>';
    }
    if (!w.t) return '<div class="prv-wg"><p class="prv-e0">No wedge yet. In one sentence: why would someone switch to you?</p><button type="button" class="btn-ghost btn-sm" data-pd="prv:wedit">Write the wedge</button></div>';
    return '<div class="prv-wg"><span class="pd-eb">Your wedge</span><p class="prv-wt">' + esc(w.t) + '</p><div class="prv-wm">' + (j ? '<span class="chip ' + (cl === 'gap' ? 'ok' : 'warn') + '">' + (cl === 'gap' ? 'Rests on a job worth testing' : 'Rests on a job that is ' + (cl === 'taken' ? 'served' : cl === 'empty' ? 'empty' : cl === 'minor' ? 'minor' : 'not rated')) + '</span><span class="prv-wj">' + esc(prvT(j.t, 56)) + '</span>' : '<span class="chip warn">Not tied to a job</span>') +
      '<button type="button" class="icon-sm xs" data-pd="prv:wedit" aria-label="Edit the wedge">' + IC('edit') + '</button></div></div>';
  }
  /* v121 (89): how long one line of these lists may be. The field used to stop at it (maxlength), so a pasted question was cut
     without a word; now it takes more, counts once you are near, and Add says it is too long */
  var PRV_ASM_MAX = 90;
  function prvAsmCount(inp) {
    var n = inp.closest('form') && inp.closest('form').querySelector('.prv-asn'); if (!n) return;
    var len = prvText(inp.value).length, max = +inp.getAttribute('data-max') || PRV_ASM_MAX;
    n.hidden = len < max - 20; n.textContent = len + ' / ' + max; n.classList.toggle('over', len > max);
  }
  function prvAsmList(p, k, title, ph) {
    var list = p.pv.asm[k], id = 'prv-a-' + k;
    return '<div class="prv-as"><h4 class="pd-eb">' + title + '</h4>' + (list.length ? '<ul class="prv-asl">' + list.map(function (x) { return '<li><span>' + esc(x.t) + '</span><button type="button" class="icon-sm xs" data-pd="prv:asmrm" data-k="' + k + '" data-id="' + x.id + '" aria-label="Remove ' + esc(x.t) + '">' + IC('x') + '</button></li>'; }).join('') + '</ul>' : '') +
      '<form class="prv-f prv-asf" data-pd-form="prv:asm" data-k="' + k + '" novalidate><label class="sr-only" for="' + id + '">' + title + '</label><input id="' + id + '" name="t" maxlength="400" data-max="' + PRV_ASM_MAX + '" aria-describedby="' + id + '-n" placeholder="' + esc(ph) + '" autocomplete="off"><span class="prv-asn" id="' + id + '-n" translate="no" hidden></span><button type="submit" class="btn-ghost btn-sm">Add</button>' + prvErrSpan() + '</form></div>';   /* v121 (89): a line too long is said, not cut */
  }
  function prvQsCard(p) {
    return '<section class="card pd-card" aria-labelledby="pd-h-qs"><div class="card-h ruled"><div><h3 id="pd-h-qs">Open questions</h3><p>What you are not sure of yet. When you find out, record it as a decision and point it at the source.</p></div><div class="h-actions"><span class="count">' + p.pv.asm.q.length + '</span></div></div><div class="prv-ed">' +
      prvAsmList(p, 'q', 'Still to find out', 'For example, does finance need the export as Excel?') + '</div></section>';
  }
  function prvEdgeCard(p) {
    return '<section class="card pd-card" aria-labelledby="pd-h-ed"><div class="card-h ruled"><div><h3 id="pd-h-ed">Your wedge and risks</h3><p>Where you win, where you are weak, and what could break the plan.</p></div></div><div class="prv-ed">' + prvWedgeBlock(p) +
      prvAsmList(p, 'win', 'Where you win', 'Add a strength') + prvAsmList(p, 'weak', 'Where you are weak', 'Add a weakness') + prvAsmList(p, 'risk', 'Risks', 'Add a risk') + '</div></section>';
  }

  function prvCompForm(p, c) {
    var id = c ? c.id : 'new', pre = !c && pd.pv.kpre === 'sub';
    return '<li class="prv-fw"><form class="prv-f prv-kf" data-pd-form="prv:comp"' + (c ? ' data-id="' + c.id + '"' : '') + ' novalidate>' +
      '<div class="prv-kg"><div><label for="prv-kn-' + id + '">Name</label><input id="prv-kn-' + id + '" name="n" value="' + (c ? esc(c.n) : pre ? 'Doing it by hand' : '') + '" maxlength="40" autocomplete="off"></div><div><label for="prv-kp-' + id + '">Positioning</label><input id="prv-kp-' + id + '" name="pos" value="' + (c ? esc(c.pos) : pre ? 'A spreadsheet, a folder or a PDF' : '') + '" maxlength="60" placeholder="What they sell" autocomplete="off"></div>' +
      '<div><label for="prv-kc-' + id + '">Price</label><span class="pd-sel"><select id="prv-kc-' + id + '" name="price">' + PRV_PRICE.map(function (x) { return '<option value="' + x + '"' + ((c && c.price === x) || (pre && x === 'Free') ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' + IC('chev') + '</span></div></div>' +
      '<label class="pd-chk prv-subchk"><input type="checkbox" name="sub"' + ((c && c.sub) || pre ? ' checked' : '') + '><span>This is a substitute, such as a spreadsheet, Notion or doing it by hand</span></label>' +
      '<label class="pd-chk prv-subchk"><input type="checkbox" name="clone"' + (c && c.clone ? ' checked' : '') + '><span>A clone: it does almost exactly what this project plans</span></label>' +
      '<label class="pd-chk prv-subchk"><input type="checkbox" name="dead"' + (c && c.dead ? ' checked' : '') + '><span>It shut down</span></label>' +
      '<div class="fld"><label for="prv-kd-' + id + '">Why it died <span class="opt">If it shut down</span></label><input id="prv-kd-' + id + '" name="died" value="' + (c ? esc(c.died || '') : '') + '" maxlength="160" autocomplete="off"></div>' +
      '<div class="prv-kg2"><div><label for="prv-ke-' + id + '">Where they beat you <span class="opt">One per line</span></label><textarea id="prv-ke-' + id + '" name="str" rows="2" maxlength="300">' + (c ? esc(c.str.join('\n')) : '') + '</textarea></div>' +
      '<div><label for="prv-kw-' + id + '">Where they are weak <span class="opt">One per line</span></label><textarea id="prv-kw-' + id + '" name="weak" rows="2" maxlength="300">' + (c ? esc(c.weak.join('\n')) : '') + '</textarea></div></div>' + prvPicker(p, c ? c.src : [], 's') +
      '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">' + (c ? 'Save' : 'Add competitor') + '</button></div>' + prvErrSpan() + '</form></li>';
  }
  function prvCompCard(p) {
    var q = pd.pv, pv = p.pv;
    var h = '<section class="card pd-card" aria-labelledby="pd-h-cp"><div class="card-h ruled"><div><h3 id="pd-h-cp">Competitors</h3><p>Include the do-it-yourself option. It is often the real rival.</p></div><div class="h-actions"><span class="count">' + pv.comps.length + '</span><button type="button" class="btn-ghost btn-sm" data-pd="prv:knew">' + IC('plus') + 'Add</button></div></div>';
    if (!pv.comps.length && q.ke !== 'new') return h + '<p class="pd-crs-e">No competitors tracked yet.</p></section>';
    var dead = pv.comps.filter(function (c) { return c.dead && q.ke !== c.id; });
    h += '<ul class="prv-cps">' + (q.ke === 'new' ? prvCompForm(p) : '') + pv.comps.filter(function (c) { return !c.dead || q.ke === c.id; }).map(function (c) {
      if (q.ke === c.id) return prvCompForm(p, c);
      var a = prvCompAge(p, c), stale = a !== null && a > PRV_STALE;
      return '<li class="prv-cp" data-m="' + c.id + '"><div class="prv-cp-n"><b>' + esc(c.n) + (c.sub ? ' <span class="chip neutral">Substitute</span>' : '') + (c.clone ? ' <span class="chip warn">Clone</span>' : '') + '</b><small>' + esc(c.pos) + ' · <span title="Price tier">' + esc(c.price) + '</span></small></div>' +
        '<div class="prv-cp-c">' + (a === null ? '' : '<span class="chip ' + (stale ? 'warn' : 'quiet') + '">' + (stale ? 'Stale · ' : '') + a + 'd</span>') + '</div>' +
        '<span class="acts"><button type="button" class="icon-sm xs" data-pd="prv:krecheck" data-id="' + c.id + '" aria-label="Mark ' + esc(c.n) + ' as checked today" title="Checked today">' + IC('clock') + '</button><button type="button" class="icon-sm xs" data-pd="prv:kedit" data-id="' + c.id + '" aria-label="Edit ' + esc(c.n) + '">' + IC('edit') + '</button><button type="button" class="icon-sm xs" data-pd="prv:krm" data-id="' + c.id + '" aria-label="Remove ' + esc(c.n) + '">' + IC('x') + '</button></span>' +
        '<div class="prv-cp-e">' + (c.str.length ? '<span><em>Beats you</em>' + esc(c.str.slice(0, 2).join('; ')) + '</span>' : '') + (c.weak.length ? '<span><em>Weak at</em>' + esc(c.weak.slice(0, 2).join('; ')) + '</span>' : '') + (!c.str.length && !c.weak.length ? '<span class="prv-mute">No notes yet</span>' : '') + '</div>' +
        '<div class="prv-cp-s">' + (c.src.length ? prvRefs(p, c.src) : '<span class="pd-tag mini"><i></i>No source</span>') + '</div></li>';
    }).join('') + '</ul>';
    if (dead.length) h += '<div class="prv-gy"><h4 class="pd-eb">Graveyard <span class="n">' + dead.length + '</span></h4><p class="prv-hint">Products like this one that shut down. Read why before you build the same thing.</p><ul>' + dead.map(function (c) {
      return '<li data-m="' + c.id + '"><div><b>' + esc(c.n) + (c.clone ? ' <span class="chip quiet">Clone</span>' : '') + '</b><small>' + esc(c.died || 'No reason recorded') + '</small></div>' + (c.src.length ? prvRefs(p, c.src) : '') + '<button type="button" class="icon-sm xs" data-pd="prv:kedit" data-id="' + c.id + '" aria-label="Edit ' + esc(c.n) + '">' + IC('edit') + '</button></li>';
    }).join('') + '</ul></div>';
    return h + '</section>';
  }
  function prvSrcCard(p) {
    var pv = p.pv, un = pv.src.filter(function (s) { return s.ai && !s.ver; }).length;
    var h = '<section class="card pd-card" aria-labelledby="pd-h-sr"><div class="card-h ruled"><div><h3 id="pd-h-sr">Sources</h3><p>Each one is a snapshot with a fingerprint, so it stays the same if the page changes.</p></div><div class="h-actions"><span class="count">' + pv.src.length + '</span><button type="button" class="btn-ghost btn-sm" data-pd="prv:srcadd">' + IC('plus') + 'Add</button></div></div>';
    if (!pv.src.length) return h + '<p class="pd-crs-e">No sources yet. Add one, then point a note or a rating at it.</p></section>';
    if (pv.src.some(function (s) { return s.sample; })) h += '<div class="pde-strip">' + IC('bulb') + '<span>The first seven are sample entries. Sources you add keep the text you paste and a real fingerprint.</span></div>';
    if (un) h += '<div class="pde-strip prv-unvs">' + IC('shield') + '<span>' + un + (un === 1 ? ' source was reported by an AI and is not verified.' : ' sources were reported by an AI and are not verified.') + ' Open the link, compare it with the quote, then mark it verified.</span></div>';
    var q = pd.pv, cut = pv.src.length > 4 && !q.srcAll, shown = cut ? pv.src.filter(function (s, i) { return i < 3 || (s.ai && !s.ver); }) : pv.src;
    var more = pv.src.length > 4 ? '<div class="prv-srcm"><button type="button" class="link" data-pd="prv:srcall" aria-expanded="' + !cut + '">' + (cut ? 'Show all ' + pv.src.length : 'Show fewer') + '</button></div>' : '';
    return h + '<ol class="prv-srcs">' + shown.map(function (s) {
      var u = prvUsed(p, s.n), unv = s.ai && !s.ver, snap = (s.txt ? '<details class="prv-snap"><summary>' + (s.ai ? 'AI-reported quote' : 'Snapshot') + '</summary><pre>' + esc(s.txt) + '</pre></details>' : '') + (s.ip ? '<p class="prv-take"><span>What you take from it</span> ' + esc(s.ip) + '</p>' : '');   /* v100 (54) */
      return '<li class="prv-src' + (unv ? ' unv' : '') + '" tabindex="-1" data-n="' + s.n + '"><span class="prv-n">[' + s.n + ']</span><div class="prv-st-t"><b title="Snapshot fingerprint ' + esc(pdeFpShow(s.fp)) + '">' + esc(s.t) + '</b><small>' + (s.u && !s.sample ? '<a href="' + esc(sdHref(s.u)) + '" target="_blank" rel="noopener noreferrer">' + esc(s.host) + '</a>' : esc(s.host)) + ' · added ' + esc(prvDate(s.ts)) + ' · ' + (u ? 'used ' + u + '×' : 'not used yet') + '</small>' +
        (s.ai ? '<span class="prv-ai"><span class="chip ' + (unv ? 'warn' : 'ok') + '">AI · ' + (unv ? 'unverified' : 'verified') + '</span>' + (unv ? '<button type="button" class="btn-ghost btn-sm" data-pd="prv:srcver" data-n="' + s.n + '">Mark verified</button>' : '') + '</span>' : '') +
        snap + '</div>' +
        '<button type="button" class="icon-sm xs" data-pd="prv:srcrm" data-n="' + s.n + '" aria-label="Remove source ' + s.n + '"' + (u ? ' disabled title="Used by ' + u + '. Detach it first."' : '') + '>' + IC('x') + '</button></li>';
    }).join('') + '</ol>' + more + '</section>';
  }
  /* where these customers gather: the places a test can find people */
  function prvChanCard(p) {
    var q = pd.pv, ch = p.pv.channels || [];
    var h = '<section class="card pd-card" aria-labelledby="pd-h-ch"><div class="card-h ruled"><div><h3 id="pd-h-ch">Channels</h3><p>Where these customers gather. A test needs a place to find people.</p></div><div class="h-actions"><span class="count">' + ch.length + '</span><button type="button" class="btn-ghost btn-sm" data-pd="prv:chadd">' + IC('plus') + 'Add</button></div></div>';
    if (q.cha) h += '<form class="prv-f prv-chf" data-pd-form="prv:chan" novalidate><div class="pq-g"><div class="fld"><label for="prv-chn">Name</label><input id="prv-chn" name="n" maxlength="60" placeholder="For example, r/freelance" autocomplete="off"></div><div class="fld"><label for="prv-chu">Link <span class="opt">Optional</span></label><input id="prv-chu" name="u" maxlength="300" placeholder="https://…" inputmode="url" autocomplete="off"></div></div>' +
      '<div class="fld"><label for="prv-chw">Why it fits <span class="opt">Optional</span></label><input id="prv-chw" name="w" maxlength="140" autocomplete="off"></div><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="prv:cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Add channel</button></div>' + prvErrSpan() + '</form>';
    if (!ch.length && !q.cha) return h + '<p class="pd-crs-e">No channels yet. An AI research pass lists them, or add the ones you know.</p></section>';
    return h + '<ul class="prv-chl">' + ch.map(function (c) {
      return '<li><div><b>' + (c.u ? '<a href="' + esc(sdHref(c.u)) + '" target="_blank" rel="noopener noreferrer">' + esc(c.n) + '</a>' : esc(c.n)) + '</b><small>' + esc([c.size, c.why].filter(Boolean).join(' · ') || 'No notes') + '</small></div>' + (c.src ? prvRefs(p, [c.src]) : '') + '<button type="button" class="icon-sm xs" data-pd="prv:chrm" data-id="' + c.id + '" aria-label="Remove ' + esc(c.n) + '">' + IC('x') + '</button></li>';
    }).join('') + '</ul></section>';
  }
  function prvSubmitChan(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, n = prvText(f.elements.n.value), u = prvText(f.elements.u.value), w = prvText(f.elements.w.value), snap, chs = pv.channels || [];
    if (n.length < 2) return prvErr(f, 'n', 'Give the channel a name.');
    if (u && !/^https?:\/\/\S+\.\S+/.test(u)) return prvErr(f, 'u', 'Enter a full link, like https://…, or leave it empty.');
    if (chs.some(function (c) { return c.n.toLowerCase() === n.toLowerCase(); })) return prvErr(f, 'n', 'Already listed.');
    snap = prvSnap(p); q.cha = null;
    pfArr(pv, 'channels').push({ id: prvId('h'), n: n, u: u, size: '', why: w, src: 0, ts: Date.now() });
    prvDone(p, snap, 'You added a channel', 'Channel added: ' + n, '[data-pd="prv:chadd"]');
  }
  function prvMarketHTML(p) {
    var cta = '<button type="button" class="btn-primary" data-pd="prv:jnew">' + IC('plus') + '<span>Add job</span></button>';
    return pdHeadHTML(p, 'market', cta) + pfCard(p) + prvRsCard(p) + prvVerdictCard(p) + prvMapCard(p) + '<div class="pd-cols prv-mk"><div class="pd-col">' + prvCompCard(p) + prvRetCard(p) + '</div><div class="pd-col">' + prvEdgeCard(p) + prvChanCard(p) + prvSrcCard(p) + '</div></div>';
  }


