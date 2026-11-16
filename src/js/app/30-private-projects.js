  /* ---------- private projects (prefix prv) ---------- */
  var PRV_DAY = 864e5, PRV_T0 = Date.now(), PRV_REV = 10, PRV_STALE = 30, prvN = sdCtr('prvN', 0);
  var PRV_STATUS = [['planned', 'To do'], ['doing', 'Doing'], ['review', 'In review'], ['done', 'Done']];
  /* In review only exists where someone else can be asked to look */
  function prvStatuses(p, x) { return PRV_STATUS.filter(function (s) { return s[0] !== 'review' || p.team.length || x.st === 'review'; }); }
  var PRV_LANES = [['thesis', 'Thesis'], ['scope', 'Scope'], ['release', 'Release'], ['market', 'Market'], ['decisions', 'Decisions'], ['drift', 'Drift'], ['work', 'Project']];   /* v122 (93): Project, not Overview: that is a tab's name (and in Vietnamese the Dashboard's) */
  PRV_LANES.splice(1, 0, ['proof', 'Proof']);
  function prvLanes(p) {
    var md = pdMode(p);
    return PRV_LANES.filter(function (l) { return l[0] === 'market' ? md !== 'client' : l[0] !== 'proof' || md === 'product';   /* v97 (44): internal work has sources too */ })
      .map(function (l) { return l[0] === 'market' && md === 'internal' ? ['market', 'Sources'] : l; });   /* v119 (87): it has no market */
  }
  var PRV_PRICE = ['$', '$$', '$$$', 'Free'];
  var PRV_DEM = { paid: 'Pays', workaround: 'Workaround', complaint: 'Complaint', mention: 'Mention' };
  var PRV_LV = { full: 'Full', partial: 'Partial', none: 'None' };
  var PRV_RANK = { none: 0, partial: 1, full: 2 };
  var PRV_MODE = { challenge: ['Challenge', 'shield', 'Argue against it: the strongest reasons this will fail, with sources.'], discover: ['Discover', 'search', 'First scan of the market: jobs, rivals, demand and ratings.'], refresh_monthly: ['Refresh · monthly', 'clock', 'What changed lately: prices, features, new rivals and new evidence.'], refresh_quarterly: ['Refresh · quarterly', 'sliders', 'A deep review of every job, rating and your wedge. It can propose retiring what no longer holds.'], manual: ['Reviewed by you', 'check', ''] };
  var PRV_MONTH = 30, PRV_QUARTER = 90;
  var PRV_VK = { none: ['No research yet'], thin: ['Not enough evidence'], open: ['Worth a test'], crowded: ['Me-too'], empty: ['No demand seen'] };
  var PRV_SIZE = { S: 1, M: 3, L: 7 }, PRV_PMIN = 3, PRV_PMAX = 7;
  var PRV_SZ = [['S', 'S', 'about 1 day'], ['M', 'M', 'about 3 days'], ['L', 'L', 'about a week']];
  /* what S, M and L cost in this project. They are estimates the person sets on the release (pv.szd), not facts: the defaults are
     PRV_SIZE. Changing them re-reads every size already given, the baseline included, because the letters are what was decided */
  function prvSzD(p, s) { var o = p && p.pv && p.pv.szd; return (o && o[s]) || PRV_SIZE[s] || 0; }
  function prvSzText(p, s) { var d = prvSzD(p, s); return d === 7 ? 'about a week' : 'about ' + prvDay(d); }
  function prvSzOwn(p) { var o = p && p.pv && p.pv.szd; return !!(o && (o.S !== PRV_SIZE.S || o.M !== PRV_SIZE.M || o.L !== PRV_SIZE.L)); }
  var PRV_SHIP = [['need', 'Cannot ship without it'], ['weak', 'Ships, but weaker'], ['fine', 'Ships fine']];
  var PRV_NEED = [['need', 'Needed now'], ['weak', 'Helps, but can wait'], ['fine', 'Can wait']];   /* v97 (43): the same answers, for a project without a release */
  var PRV_BN = { 'in': 'Now', next: 'Next', out: 'Never' };
  var PRV_DT = [['proof', 'Proof'], ['scope', 'Scope'], ['product', 'Product'], ['tech', 'Tech'], ['market', 'Market']];
  var PRV_LOOK = 90, PRV_LOOKS = [[30, 'In 1 month'], [90, 'In 3 months'], [180, 'In 6 months'], [0, 'Only if a principle changes']];
  var PRV_MET = { yes: ['Met', 'ok'], mostly: ['Mostly met', 'warn'], no: ['Not met', 'crit'] };
  function prvId(k) { return k + (++prvN); }
  function prvAt(d) { return PRV_T0 - d * PRV_DAY; }
  function prvAge(ts) { return Math.max(0, Math.floor((Date.now() - ts) / PRV_DAY)); }
  function prvDate(ts) { var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function prvShort(ts) { var a = prvAge(ts); return a === 0 ? 'today' : a + 'd'; }
  function prvRuns(ts) { var a = prvAge(ts); return a === 0 ? 'less than a day' : a === 1 ? '1 day' : a + ' days'; }
  function prvLc(t) { return t.length > 1 && t.charAt(1) === t.charAt(1).toUpperCase() && /[A-Z]/.test(t.charAt(1)) ? t : t.charAt(0).toLowerCase() + t.slice(1); }
  function prvClock(x) { return x.kept || x.ts; }

  function prvIdea(t, d, tag, age, o) {
    var ts = prvAt(age), x = { id: prvId('k'), t: t, d: d || '', tag: tag || '', st: 'parked', ts: ts, kept: 0, kc: 0, why: '', xts: 0, job: '', size: '', to: '', iid: '', sim: '', lg: [{ ts: ts, k: 'park' }] }, k;
    for (k in o) x[k] = o[k];
    return x;
  }
  function prvOpt(t, c, why) { return { t: t, c: !!c, why: why || '' }; }
  /* v98 (46): au is who opened or recorded it, su who superseded it ('You' here, an address as it travels) */
  function prvDec(t, st, ots, o) { var x = { id: prvId('d'), t: t, st: st, ots: prvAt(ots), dts: 0, sts: 0, because: '', opts: [], ev: [], rv: '', by: '', rep: '', typ: 'product', it: '', au: 'You' }, k; for (k in o) x[k] = o[k]; return x; }
  /* a Scope decision, as the Gate writes it */
  function prvSDec(x, bucket, ago, because) {
    var o = ['in', 'next', 'out'].map(function (b) { return prvOpt(PRV_BN[b], b === bucket); });
    return prvDec('“' + prvT(x.t, 60) + '” → ' + PRV_BN[bucket], 'decided', ago, { typ: 'scope', it: x.id, dts: prvAt(ago), because: because, opts: o });
  }
  function prvBlank() { return { th: [], items: [], base: null, bls: [], park: [], src: [], sn: 1, jobs: [], comps: [], dec: [], wedge: { t: '', job: '' }, asm: { win: [], weak: [], risk: [], q: [] }, vd: null, vlog: [], imp: [], ret: [], rel: { name: 'v1', ship: '', date: '', cap: 0 }, rl: [], princ: [], ships: [] }; }
  function prvInit(p) {
    p.pv = prvNorm(prvBlank());
    var k = prvVerdict(p).k; if (!p.pv.vd) p.pv.vd = { k: k, ts: Date.now() }; else p.pv.vd.k = k;
  }
  function prvSrc(p, n) { return p.pv.src.filter(function (s) { return s.n === n; })[0]; }
  function prvById(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function prvUsed(p, n) {
    var pv = p.pv, u = 0;
    pv.jobs.forEach(function (j) { j.dem.forEach(function (e) { if (e.src === n) u++; }); });
    pv.comps.forEach(function (c) { if (c.src.indexOf(n) > -1) u++; Object.keys(c.cov).forEach(function (k) { if (c.cov[k].s === n) u++; }); });
    pv.dec.forEach(function (c) { if (c.ev.indexOf(n) > -1) u++; });
    return u;
  }

  /* derived figures */
  function prvRevisit(x) { return x.st === 'parked' && prvAge(prvClock(x)) >= PRV_REV; }
  /* an idea may be kept parked once. After that it has to go to Next or Never */
  function prvMust(x) { return prvRevisit(x) && x.kc >= 1; }
  function prvBucket(p, sec) { return p.pv.items.filter(function (x) { return x.sec === sec; }); }
  function prvDays(x, p) { return x.size ? prvSzD(p, x.size) : 0; }
  function prvLoad(p) {
    var l = 0, un = 0, cap = p.pv.rel.cap || 0;
    prvBucket(p, 'in').forEach(function (x) { if (x.size) l += prvSzD(p, x.size); else un++; });
    return { days: l, un: un, cap: cap, over: cap ? Math.max(0, l - cap) : 0, left: cap ? Math.max(0, cap - l) : 0 };
  }
  function prvJobOf(p, x) { return p.pv.jobs.filter(function (j) { return j.items.indexOf(x.id) > -1; })[0] || null; }
  /* v97 (43): a release is optional. A project plans one once its Owner saves the release (on), or has a ship line, a target date,
     a capacity, a baseline or a shipped release. Without one, Scope, the Gate and the Overview say nothing of releases */
  function prvRelOn(p) { var pv = p.pv, r = pv && pv.rel; return !!pv && !!(r && (r.on || r.ship || r.date || r.cap) || pv.base || pv.ships.length); }
  function prvNextName(p) { var m = /^(\D*)(\d+)(\D*)$/.exec(p.pv.rel.name || ''); return m ? m[1] + (+m[2] + 1) + m[3] : 'Next'; }
  function prvDay(n) { return n + (n === 1 ? ' day' : ' days'); }
  function prvTimes(n) { return n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times'; }
  /* a Never item has a date to look again. It is a nudge, never a rule */
  function prvLook(x, days) { x.rvn = days; x.rvd = days ? Date.now() + days * PRV_DAY : 0; }
  function prvDue(x) { return x.sec === 'out' && x.rvd > 0 && x.rvd <= Date.now(); }
  function prvLookText(x) { return !x.rvn ? 'Only if a principle changes' : prvDate(x.rvd) + (new Date(x.rvd).getFullYear() !== new Date().getFullYear() ? ' ' + new Date(x.rvd).getFullYear() : ''); }
  /* the Gate call that put an item where it is */
  function prvCall(p, x) { return p.pv.dec.filter(function (d) { return d.typ === 'scope' && d.it === x.id; }).sort(function (a, b) { return (b.dts || b.ots) - (a.dts || a.ots); })[0] || null; }
  /* a new item, the same shape wherever it is made */
  function prvMk(sec, t, why, now, o) {
    var x = { id: prvId('i'), sec: sec, t: t, why: why || '', st: 'planned', ts: now, size: '', nj: 0, ov: 0, nwhy: '', gate: null, rvn: 0, rvd: 0, rs: 0, rsl: 0, rid: '', as: '', stk: '', lg: [{ ts: now, k: 'new', to: sec, why: why || '' }] }, k;
    for (k in o) x.lg[0][k] = o[k];
    if (sec === 'out') prvLook(x, PRV_LOOK);
    return x;
  }
  /* Drift is how far Now has moved from the baseline. Cutting is never penalised. Two or more overrides raise the level by one */
  /* Drift is counted in days: what was added, plus what grew, against the days the baseline held. Cutting never counts */
  function prvSzOf(list) { var o = {}; list.forEach(function (x) { if (x.size) o[x.id] = x.size; }); return o; }
  /* what a size cost when the baseline was committed. Drift is measured with these, so changing the estimates later cannot shrink it */
  function prvSzB(p, s) { var o = p.pv.base && p.pv.base.szd; return (o && o[s]) || prvSzD(p, s); }
  /* the baseline as it is committed: what is in Now, each item's size and title, and the appetite (capacity, date, what sizes cost) */
  function prvBaseNow(p, now) {
    var ins = prvBucket(p, 'in'), t = {};
    ins.forEach(function (x) { t[x.id] = x.t; });
    return { ts: now, ids: ins.map(function (x) { return x.id; }), sz: prvSzOf(ins), t: t, cap: p.pv.rel.cap || 0, date: p.pv.rel.date || '', szd: { S: prvSzD(p, 'S'), M: prvSzD(p, 'M'), L: prvSzD(p, 'L') } };
  }
  /* an item of the baseline whose title now names something else. It counts as new work */
  function prvRenamed(p, x) { var b = p.pv.base, was = b && b.t && b.t[x.id]; return !!(was && x.sec === 'in' && !prvSame(was, x.t)); }
  /* how the appetite grew since the baseline: more days, a later date, cheaper sizes. Each one needed a reason */
  function prvAppetite(p) {
    var b = p.pv.base, r = p.pv.rel, out = [];
    if (!b || !b.szd) return out;
    /* the reason given with the last change of that one thing */
    function why(k) { var w = ''; p.pv.rl.forEach(function (e) { if (e.ts > b.ts && e.why && e.prev && (k === 'szd' ? e.szd : (e[k] || '') !== (e.prev[k] || ''))) w = e.why; }); return w; }
    if (b.cap && (!r.cap || r.cap > b.cap)) out.push({ t: 'Capacity ' + prvDay(b.cap) + ' → ' + (r.cap ? prvDay(r.cap) : 'no limit'), why: why('cap') });
    if (b.date && (!r.date || r.date > b.date)) out.push({ t: r.date ? 'Target ' + prvDate(new Date(b.date + 'T12:00:00').getTime()) + ' → ' + prvDate(new Date(r.date + 'T12:00:00').getTime()) : 'Target date cleared', why: why('date') });
    if (PRV_SZ.some(function (z) { return prvSzD(p, z[0]) < b.szd[z[0]]; })) out.push({ t: 'S, M and L now cost ' + prvSzD(p, 'S') + ', ' + prvSzD(p, 'M') + ' and ' + prvSzD(p, 'L') + ' days (were ' + b.szd.S + ', ' + b.szd.M + ' and ' + b.szd.L + ')', why: why('szd') });
    return out;
  }
  /* anything a new baseline would reset: drift in Now, or an appetite that grew */
  function prvMoved(p) { return prvDrift(p).n + prvAppetite(p).length; }
  function prvDrift(p) {
    var pv = p.pv, z = { add: [], gone: [], grow: [], ren: [], n: 0, pct: 0, ov: 0, cut: 0, lv: 0, base: 0, bd: 0, ad: 0 };
    if (!pv.base) return z;
    var ids = pv.base.ids, sz = pv.base.sz || null, dd = function (x) { return x.size ? prvSzB(p, x.size) : 1; };
    z.ren = pv.items.filter(function (x) { return ids.indexOf(x.id) > -1 && prvRenamed(p, x); });
    z.add = pv.items.filter(function (x) { return x.sec === 'in' && ids.indexOf(x.id) < 0; }).concat(z.ren);
    z.gone = pv.items.filter(function (x) { return x.sec !== 'in' && ids.indexOf(x.id) > -1; });
    pv.items.forEach(function (x) {
      var i = ids.indexOf(x.id); if (i < 0) return;
      z.bd += sz && sz[x.id] ? prvSzB(p, sz[x.id]) : dd(x);
      if (sz && sz[x.id] && x.sec === 'in' && x.size && z.ren.indexOf(x) < 0 && prvSzB(p, x.size) > prvSzB(p, sz[x.id])) z.grow.push({ x: x, from: sz[x.id], to: x.size, d: prvSzB(p, x.size) - prvSzB(p, sz[x.id]) });
    });
    z.ad = z.add.reduce(function (s, x) { return s + dd(x); }, 0) + z.grow.reduce(function (s, g) { return s + g.d; }, 0);
    z.base = ids.length; z.cut = z.gone.length; z.n = z.add.length + z.gone.length + z.grow.length;
    z.pct = z.bd ? Math.round(z.ad / z.bd * 100) : (z.ad ? 100 : 0);
    z.ov = z.add.filter(function (x) { return x.ov; }).length;
    z.lv = !z.ad ? 0 : z.pct <= 15 ? 1 : z.pct <= 35 ? 2 : 3;
    if (z.add.length && z.ov >= 2) z.lv = Math.min(3, z.lv + 1);
    return z;
  }
  function prvDriftText(d) {
    if (!d.n) return 'No changes since the baseline';
    return (d.ad ? '+' + prvDay(d.ad) + ' on ' + d.bd + ' (+' + d.pct + '%)' : 'Nothing added') + (d.add.length ? ' · ' + d.add.length + ' added' : '') + (d.grow.length ? ' · ' + d.grow.length + ' grew' : '') + (d.ov ? ' · ' + d.ov + (d.ov === 1 ? ' override' : ' overrides') : '') + (d.cut ? ' · cut ' + d.cut : '');
  }
