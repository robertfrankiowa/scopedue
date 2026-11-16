  /* ---------- scope + change: model ---------- */
  var PD_SEC = [['in', 'Deliverables', 'Add a deliverable'], ['out', 'Exclusions', 'Add an exclusion'], ['tl', 'Timeline & payment', 'Add a milestone']];
  var PD_CRTY = { request: 'Request', question: 'Question', quote: 'Quote', counter: 'Counter offer', accept: 'Accepted', decline: 'Declined', note: 'Note', dispute: 'Disagrees' };
  var PD_CRCHIP = { request: 'neutral', question: 'neutral', quote: '', counter: 'warn', accept: 'ok', decline: 'crit', note: 'neutral', dispute: 'warn' };   // v116: a decline reads as one
  var PD_VIA = { email: 'an email', chat: 'a chat', call: 'a call', meeting: 'a meeting' };
  var PD_ST = { me: ['warn', 'Waiting on you'], client: ['neutral', 'Awaiting client'], approved: ['ok', 'Approved'], declined: ['neutral', 'Declined'] };
  var PD_DOTS = '···· ···· ····';
  function pdMoney(n, cur) { return sdMoney(n, cur); }   /* CONTRACT 101: in the project's own currency (src/js/money.js) */
  function pdDays(n) { return n + (n === 1 ? ' day' : ' days'); }
  function pdStamp() { var d = new Date(); return today() + ' · ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  /* CONTRACT 101: an amount may be in a currency with small units (VND, IDR), so the ceiling is wide: a million million */
  var PD_NUM = { amt: { max: 1e12, label: 'Amount' }, days: { max: 365, label: 'Extra days' } };
  /* Strict whole-number parse. Returns { n } (n is null when empty) or { err }. It never guesses:
     "$12.50" is refused, not read as 1250. A sign or a code around the number goes ("$1,200", "12.000.000 ₫", "1 200 EUR"), and
     thousands may be grouped with commas, dots or spaces, the same mark all through: "12.000.000" is twelve million */
  function pdParseNum(v, kind) {
    var cfg = PD_NUM[kind], isAmt = kind === 'amt', s = String(v).trim(), t, f, n, m;
    s = (isAmt ? s.replace(/^[^\d\-−]+/, '').replace(/[^\d]+$/, '') : s.replace(/\s*days?$/i, '')).trim();
    if (s === '') return String(v).trim() === '' ? { n: null } : { err: isAmt ? 'Amount must be a number, like 1,200.' : 'Extra days must be a whole number.' };
    if (s.charAt(0) === '-' || s.charAt(0) === '−') return { err: cfg.label + ' can’t be negative.' };
    s = s.replace(/[\u00a0\u202f]/g, ' ');
    m = /^\d{1,3}([,. ])\d{3}(\1\d{3})*$/.exec(s);
    t = m ? s.split(m[1]).join('') : /^\d{1,2}(,\d{2})+,\d{3}$/.test(s) ? s.replace(/,/g, '') /* 1,20,000: lakhs, as India writes */ : /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/^(\d+),(\d{1,2})$/, '$1.$2');
    if (!/^\d+(\.\d+)?$/.test(t)) return { err: isAmt ? 'Amount must be a number, like 1,200.' : 'Extra days must be a whole number.' };
    f = t.split('.');
    if (f[1] && /[1-9]/.test(f[1])) return { err: isAmt ? 'Use a whole amount, without cents.' : 'Use whole days.' };
    n = parseInt(f[0], 10);
    if (n > cfg.max) return { err: cfg.label + ' can’t be over ' + String(cfg.max).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' };
    return { n: n };
  }

  /* ---------- v60 shared model: the agreement (Scope packet v2), delivery events and the clocks ----------
     The same code runs in the dev app and in the client portal, and api.php mirrors the rules, so all three agree on
     what is late, what was accepted and what each side may do next. ScopeDue keeps the work half of the record;
     money is paid outside it, so there is no "paid" state anywhere. CONTRACT.md, section 19. */
  var SM_DAY = 864e5;
  var SM_KEYS = ['dep', 'pd', 'rpm', 'free', 'rate', 'min', 'review', 'silence', 'dormant', 'cure', 'own', 'meth', 'doc'];
  var SM_LIM = { dep: [0, 100], pd: [0, 60], rpm: [0, 9], free: [0, 20], rate: [0, 1e9], min: [0, 40], review: [1, 20], silence: [3, 60], dormant: [7, 180], cure: [3, 60], own: [0, 1], meth: [0, 80], doc: [0, 300] };
  function smDefaults() { return { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' }; }
  function smRulesArr(r) { return SM_KEYS.map(function (k) { var v = r ? r[k] : null; return k === 'meth' || k === 'doc' ? String(v == null ? '' : v) : (v == null ? 0 : +v); }); }
  function smRulesOk(r) {
    if (!r || typeof r !== 'object') return false;
    return SM_KEYS.every(function (k) {
      var v = r[k], l = SM_LIM[k];
      if (k === 'meth' || k === 'doc') return typeof v === 'string' && v.length <= l[1];
      return typeof v === 'number' && v === Math.floor(v) && v >= l[0] && v <= l[1];
    });
  }
  function smV2(v) { return !!(v && v.terms && v.terms.fv === 2); }
  function smRules(v) { return smV2(v) && v.terms.r ? v.terms.r : null; }
  /* the exact text that is hashed. Version 1 keeps its formula forever, so every approval ever given still checks out */
  function smFpRaw(ref, v) {
    var t = v.terms || { price: null, rev: null }, price = t.price == null ? null : t.price, rev = t.rev == null ? null : t.rev;
    if (!smV2(v)) return JSON.stringify([ref, v.v, v.items.map(function (x) { return [x.sec, x.t, x.d, x.cr]; }), price, rev]);
    return JSON.stringify([ref, v.v, v.items.map(function (x) { return [x.sec, x.t, x.d, x.cr, x.ok || '', x.m || '', x.pay == null ? null : x.pay]; }), price, rev, smRulesArr(t.r), 2]);
  }
  function smEvGen(ref) { return ref + '|events'; }
  function smEvRaw(ref, prev, e) { return JSON.stringify([ref, prev, e.w, e.ty, e.m || '', e.v || 0, e.at, e.tx || '', e.link || '', e.k || '']); }

  /* ---- calendar: milestone and input dates are whole days (YYYY-MM-DD) that end at midnight UTC; review windows count weekdays ---- */
  function smIsoOk(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function smIso(ts) { var d = new Date(ts), z = function (n) { return ('0' + n).slice(-2); }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function smIsoLocal(ts) { var d = new Date(ts), z = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function smDayEnd(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999) : 0; }
  function smAddDays(iso, n) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? smIso(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)) : iso; }
  function smIsoLbl(iso, withDay) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); if (!m) return String(iso || '');
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
    return (withDay ? wd + ' ' : '') + (+m[3]) + ' ' + MON[+m[2] - 1] + (+m[1] !== new Date().getFullYear() ? ' ' + m[1] : '');
  }
  function smBizEnd(ts, n) { var d = ts, w; while (n > 0) { d += SM_DAY; w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n--; } return d; }
  function smBizCount(a, b) { var n = 0, d = a, w, guard = 0; while (d + SM_DAY <= b && guard++ < 4000) { d += SM_DAY; w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n++; } return n; }
  function smCeilDays(ms) { return ms <= 0 ? 0 : Math.ceil(ms / SM_DAY); }

  /* ---- change requests, the same rules as the rest of the app ---- */
  function smCrState(c) {
    var e = c.entries[c.entries.length - 1]; if (!e) return 'me';
    if (e.ty === 'accept') return 'approved';
    if (e.ty === 'decline') return 'declined';
    if (e.w === 'c') return 'me';
    return e.ty === 'request' || (e.ty === 'note' && c.adds) ? 'me' : 'client';   /* CONTRACT 82: the studio's note on a request that adds work leaves it with the studio, which still owes a quote; to have the client answer, it asks (a question) */
  }
  function smPriced(c) { for (var i = c.entries.length - 1; i >= 0; i--) if (c.entries[i].amt != null) return c.entries[i]; return null; }
  /* v108 (CONTRACT 65): a request is disputed from its first dispute entry until an accept or a decline comes after it; each side's
     latest position in the meantime */
  function pdDispute(c) {
    var on = false, y = null, k = null;
    (c.entries || []).forEach(function (e) { if (e.ty === 'dispute') { on = true; if (e.w === 'y') y = e; else k = e; } else if (on && (e.ty === 'accept' || e.ty === 'decline')) { on = false; y = null; k = null; } });
    return on ? { y: y, c: k } : null;
  }
  function smFolded(vers, c) { return vers.some(function (v) { return v.items.some(function (x) { return x.cr === c.id; }); }); }

  /* ---- the whole picture of a client project at one moment ----
     ctx: { ref, vers, crs, ev, now, appr(v) -> { ts } | null } */
  function smState(ctx) {
    var vers = ctx.vers || [], crs = ctx.crs || [], ev = (ctx.ev || []).slice().sort(function (a, b) { return a.i - b.i; }), now = ctx.now == null ? Date.now() : ctx.now;
    var G = null, first = null, i;
    for (i = vers.length - 1; i >= 0; i--) if (smV2(vers[i]) && ctx.appr(vers[i])) { G = vers[i]; break; }
    for (i = 0; i < vers.length; i++) if (smV2(vers[i]) && ctx.appr(vers[i])) { first = vers[i]; break; }
    var latest = vers[vers.length - 1] || null;
    var M = { gov: G, v2: smV2(latest) || !!G, rules: G ? smRules(G) : (smV2(latest) ? smRules(latest) : null), ms: [], ins: [], pz: null, cl: null, expected: '', inc: { used: 0, left: 0, total: 0 }, sched: [], silent: 0, since: 0, waits: [], cur: -1, price: G ? G.terms.price : null, startTs: first ? ctx.appr(first).ts : 0 };
    if (!G) return M;
    var R = M.rules;
    /* pause, resume, close, end: the last one says where the project stands */
    var pauses = [], open = null;
    ev.forEach(function (e) {
      if (e.ty === 'pause') { if (!open) { open = { e: e, ts: e.ts, end: 0 }; pauses.push(open); } }
      else if (e.ty === 'resume') { if (open) { open.end = e.ts; open = null; } M.cl = null; }
      else if (e.ty === 'close' || e.ty === 'end') { M.cl = { e: e, ts: e.ts, by: e.w }; }
    });
    if (open) M.pz = open;
    if (M.cl && open) open.end = 0;   // closed while paused: the pause never ended
    /* approved changes not yet folded into a version move dates */
    var mls = G.items.filter(function (x) { return x.sec === 'tl'; }), cis = G.items.filter(function (x) { return x.sec === 'ci'; });
    var crMoves = [];
    crs.forEach(function (c) {
      if (!c.adds || smCrState(c) !== 'approved' || smFolded(vers, c)) return;
      var q = smPriced(c); if (!q || !q.days) return;
      var t = -1; mls.forEach(function (x, j) { if (x.id === q.m) t = j; }); if (t < 0) t = mls.length - 1;
      crMoves.push({ c: c, t: t, days: q.days, ts: c.entries[c.entries.length - 1].ts || 0, m: mls[t] ? mls[t].id : '' });
    });
    /* client inputs */
    M.ins = cis.map(function (x) {
      var sent = null, got = null;
      ev.forEach(function (e) { if (e.m !== x.id) return; if (e.ty === 'sent' && !sent) sent = e; if (e.ty === 'got' && !got) got = e; });
      var dueEnd = smDayEnd(x.d), stop = sent && got ? Math.min(sent.ts, got.ts) : sent ? sent.ts : got ? got.ts : 0;
      var late = stop ? smCeilDays(stop - dueEnd) : smCeilDays(now - dueEnd);
      return { id: x.id, t: x.t, due: x.d, dueEnd: dueEnd, late: late, sent: sent, got: got, st: got ? 'got' : sent ? 'sent' : now > dueEnd ? 'late' : dueEnd - now < 2 * SM_DAY ? 'due' : 'up' };
    });
    /* v106 (CONTRACT 63): what is handed over, each with the milestone it goes with (default the last), and the last time the
       studio handed it over and the client said they received it */
    var lastMs = mls.length ? mls[mls.length - 1].id : '';
    M.ho = G.items.filter(function (x) { return x.sec === 'ho'; }).map(function (x) { return { id: x.id, t: x.t, m: x.m && mls.some(function (y) { return y.id === x.m; }) ? x.m : lastMs, gave: null, recv: null }; });
    ev.forEach(function (e) { var h = smHo(M, e.m); if (!h) return; if (e.ty === 'gave') h.gave = e; if (e.ty === 'recv') h.recv = e; });
    /* milestones, in order */
    var acceptedAt = {}, SS = {};
    mls.forEach(function (x) {
      var evs = ev.filter(function (e) { return e.m === x.id; }), acc = evs.filter(function (e) { return e.ty === 'accept'; })[0], dels = evs.filter(function (e) { return e.ty === 'deliver'; }), last = dels[dels.length - 1] || null, resp = null;
      if (last) evs.forEach(function (e) { if (!resp && e.i > last.i && /^(accept|changes|notmet)$/.test(e.ty)) resp = e; });
      var at = 0, deemed = false, ends = 0;
      if (acc) at = acc.ts;
      else if (last && !resp) { ends = smBizEnd(last.ts, R.review); if (now >= ends) { at = ends; deemed = true; } }
      acceptedAt[x.id] = at;
      SS[x.id] = { evs: evs, acc: acc, dels: dels, last: last, resp: resp, at: at, deemed: deemed, ends: ends };
    });
    mls.forEach(function (x, j) {
      var s = SS[x.id];
      var cr = 0, cl = 0, pz = 0;
      crMoves.forEach(function (m) { if (m.t <= j) cr += m.days; });
      M.ins.forEach(function (n) { if (n.due < x.d) cl += n.late; });
      pauses.forEach(function (p) { var a = acceptedAt[x.id]; if (a && a <= p.ts) return; pz += smCeilDays((p.end || (M.cl ? M.cl.ts : now)) - p.ts); });
      var eff = smAddDays(x.d, cr + cl + pz), effEnd = smDayEnd(eff), st;
      if (s.at) st = 'accepted';
      else if (s.last && !s.resp) st = 'review';
      else if (s.last) st = 'back';
      else st = now > effEnd ? 'late' : 'upcoming';
      /* a notice (a flag on a missed date, or "not as agreed" on a delivery) starts the fix period */
      var nt = null;
      s.evs.forEach(function (e) { if (e.ty === 'flag' || e.ty === 'notmet') nt = e; });
      var notice = null;
      if (nt && st !== 'accepted') {
        var after = s.dels.some(function (d) { return d.i > nt.i; });
        var moved = nt.ty === 'flag' && crMoves.some(function (m) { return m.m === x.id && m.ts > nt.ts; });
        var nEnds = nt.ts + R.cure * SM_DAY;
        notice = { e: nt, ends: nEnds, open: !after && !moved };
        if (notice.open && now > nEnds && st !== 'review') st = 'notdelivered';
      }
      var used = s.evs.filter(function (e) { return e.ty === 'changes'; }).length;
      /* v103 (61): the latest delivery's capsule and the last answer on each of its steps */
      var cap = null;
      if (s.last && s.last.cap && (s.last.cap.steps || []).length) {
        cap = { b: s.last.cap.b || '', steps: s.last.cap.steps, res: s.last.cap.steps.map(function () { return null; }) };
        s.evs.forEach(function (e) { if (e.ty !== 'check' || e.i <= s.last.i) return; var ck = smCk(e); if (ck.n >= 1 && ck.n <= cap.steps.length) cap.res[ck.n - 1] = { ok: ck.ok, e: e }; });
      }
      M.ms.push({ id: x.id, t: x.t, i: j, base: x.d, eff: eff, effEnd: effEnd, shift: { cr: cr, cl: cl, pz: pz }, pay: x.pay || 0, amt: 0, st: st, deemed: s.deemed, at: s.at, acc: s.acc, ends: s.ends, last: s.last, resp: s.resp, dels: s.dels, notice: notice,
        late: st === 'late' || st === 'notdelivered' ? smCeilDays(now - effEnd) : 0, used: used, left: Math.max(0, R.rpm - used), cap: cap });
    });
    M.ms.forEach(function (m, j) { if (M.cur < 0 && m.st !== 'accepted') M.cur = j; });
    /* v107 (CONTRACT 64): the warranty, from the day the last milestone is accepted, and the problems reported after acceptance */
    var wl = G.items.filter(function (x) { return x.sec === 'wa'; })[0], lm = M.ms[M.ms.length - 1];
    M.wa = wl ? { t: wl.t, days: +wl.d || 0, start: lm && lm.st === 'accepted' ? lm.at : 0, ends: 0, on: false } : null;
    if (M.wa && M.wa.start) { M.wa.ends = M.wa.start + M.wa.days * SM_DAY; M.wa.on = now < M.wa.ends; }
    M.bugs = [];
    ev.forEach(function (e) {
      if (e.ty === 'bug') { M.bugs.push({ i: e.i, e: e, m: e.m, covered: !!(M.wa && (!M.wa.start || e.ts <= M.wa.ends)), st: 'open', ans: null, ok: null }); return; }
      var bm = /^b(\d+)$/.exec(String(e.k || '')); if (!bm || !/^(fixed|notbug|fixok)$/.test(e.ty)) return;
      var b = smBug(M, +bm[1]); if (!b) return;
      if (e.ty === 'fixok') { b.st = 'confirmed'; b.ok = e; } else { b.st = e.ty; b.ans = e; }
    });
    M.expected = M.ms.length ? M.ms[M.ms.length - 1].eff : '';
    /* included small changes */
    M.inc.total = R.free;
    crs.forEach(function (c) { var q = smPriced(c); if (smCrState(c) === 'approved' && q && q.inc && !q.amt) M.inc.used++; });
    M.inc.left = Math.max(0, R.free - M.inc.used);
    /* the payment schedule, for information: who owes what, and from when. Nothing here says whether it was paid */
    var price = M.price, sum = 0;
    if (price != null) {
      var dep = Math.round(price * R.dep / 100); sum = dep;
      if (R.dep) M.sched.push({ k: 'dep', t: 'Due at start', pct: R.dep, amt: dep, due: M.startTs || 0 });
      M.ms.forEach(function (m, j) {
        var a = j === M.ms.length - 1 ? price - sum : Math.round(price * m.pay / 100); if (j < M.ms.length - 1) sum += a;
        m.amt = m.pay ? a : 0;
        if (m.pay) M.sched.push({ k: 'm', id: m.id, t: m.t, pct: m.pay, amt: m.amt, due: m.at ? m.at + R.pd * SM_DAY : 0 });
      });
    }
    crs.forEach(function (c) {
      var q = smPriced(c); if (!c.adds || smCrState(c) !== 'approved' || !q || !q.amt) return;
      var ts = c.entries[c.entries.length - 1].ts || 0, w = null;
      /* CONTRACT 83: it goes with the milestone its quote names (or its Scope lines are on), when that one was not accepted before
         the approval; otherwise with the first milestone not accepted by then */
      var fx = G.items.filter(function (x) { return x.cr === c.id && x.m; })[0], at = q.m || (fx ? fx.m : ''), wm = at ? M.ms.filter(function (m) { return m.id === at; })[0] : null;
      if (wm && (!wm.at || wm.at > ts)) w = wm;
      M.ms.forEach(function (m) { if (!w && (!m.at || m.at > ts)) w = m; });
      M.sched.push({ k: 'cr', id: c.id, t: c.id + ' · ' + c.t, amt: q.amt, with: w ? w.t : '', due: w && w.at ? w.at + R.pd * SM_DAY : 0 });
    });
    /* v104 (60): each line's key, and the last time the client said they paid it or the studio answered Not received yet */
    M.sched.forEach(function (s) { s.key = s.k === 'dep' ? 'dep' : s.id; s.rep = null; });
    ev.forEach(function (e) { if (e.ty !== 'paid' && e.ty !== 'nopay') return; var s = smLine(M, e.m); if (s) s.rep = { ty: e.ty, e: e }; });
    /* silence: something waits on the client and nothing came back */
    var lastC = 0;
    vers.forEach(function (v) { var a = ctx.appr(v); if (a && a.ts > lastC) lastC = a.ts; });
    crs.forEach(function (c) { c.entries.forEach(function (e) { if (e.w === 'c' && e.ts > lastC) lastC = e.ts; }); });
    ev.forEach(function (e) { if (e.w === 'c' && e.ts > lastC) lastC = e.ts; });
    if (latest && !ctx.appr(latest)) M.waits.push({ k: 'scope', t: 'Scope v' + latest.v, since: latest.ts || 0 });
    crs.forEach(function (c) {
      if (smCrState(c) !== 'client') return; var l = c.entries[c.entries.length - 1];
      if (l.amt != null && l.vu && l.vu < now) return;
      M.waits.push({ k: 'cr', t: c.id, since: l.ts || 0 });
    });
    M.ins.forEach(function (n) { if (n.st === 'late') M.waits.push({ k: 'ci', t: n.t, since: n.dueEnd }); });
    if (M.waits.length) {
      var since = Math.min.apply(null, M.waits.map(function (w) { return w.since; }));
      M.since = Math.max(since, lastC); M.silent = smBizCount(M.since, now);
    }
    M.lastClient = lastC;
    return M;
  }
  function smMs(M, id) { return M.ms.filter(function (m) { return m.id === id; })[0] || null; }
  function smBug(M, i) { return (M.bugs || []).filter(function (b) { return b.i === i; })[0] || null; }   // v107 (64)
  function smHo(M, id) { return (M.ho || []).filter(function (h) { return h.id === id; })[0] || null; }   // v106 (63)
  function smIn(M, id) { return M.ins.filter(function (n) { return n.id === id; })[0] || null; }
  /* what each side may do now. api.php applies the same rules */
  var smCan = {
    deliver: function (M, id) { var m = smMs(M, id); return !!(M.gov && m && !M.cl && !M.pz && /^(upcoming|late|back|notdelivered)$/.test(m.st)); },
    review: function (M, id) { var m = smMs(M, id); return !!(M.gov && m && !M.cl && m.st === 'review'); },
    changes: function (M, id) { var m = smMs(M, id); return smCan.review(M, id) && m.left > 0; },
    flag: function (M, id) { var m = smMs(M, id); return !!(M.gov && m && !M.cl && !M.pz && m.st === 'late' && !(m.notice && m.notice.open)); },
    sent: function (M, id) { var n = smIn(M, id); return !!(M.gov && n && !M.cl && !n.sent && !n.got); },
    got: function (M, id) { var n = smIn(M, id); return !!(M.gov && n && !M.cl && !n.got); },
    pause: function (M) { return !!(M.gov && !M.pz && !M.cl); },
    resume: function (M) { return !!(M.gov && (M.pz && !M.cl || M.cl && M.cl.by === 'y')); },
    close: function (M, now) { return !!(M.gov && M.pz && !M.cl && (now == null ? Date.now() : now) - M.pz.ts >= M.rules.dormant * SM_DAY); },
    end: function (M) { return !!(M.gov && !M.cl && M.ms.some(function (m) { return m.st === 'notdelivered'; })); },
    bug: function (M, id) { var m = smMs(M, id); return !!(M.gov && m && m.st === 'accepted'); },   // v107 (64): on an accepted milestone
    fixed: function (M, i) { var b = smBug(M, i); return !!(b && b.st !== 'confirmed'); },
    notbug: function (M, i) { var b = smBug(M, i); return !!(b && b.st === 'open'); },
    fixok: function (M, i) { var b = smBug(M, i); return !!(b && b.st === 'fixed'); },
    gave: function (M, id) { var h = smHo(M, id); return !!(M.gov && h && !h.recv); },   // v106 (63): again too, until it is received
    recv: function (M, id) { var h = smHo(M, id); return !!(M.gov && h && h.gave && !h.recv); },
    paid: function (M, key) { var s = smLine(M, key); return !!(M.gov && s && s.due && !(s.rep && s.rep.ty === 'paid')); },   // v104 (60): due, and not already said
    nopay: function (M, key) { var s = smLine(M, key); return !!(M.gov && s && s.rep && s.rep.ty === 'paid'); },
    check: function (M, id, n) { var m = smMs(M, id); return !!(smCan.review(M, id) && m.cap && (n == null || (n >= 1 && n <= m.cap.steps.length))); }   // v103 (61)
  };
  /* deliverables that belong to a milestone: those that name it, and for the last milestone also those that name none */
  function smItemsOf(v, mid) {
    var mls = v.items.filter(function (x) { return x.sec === 'tl'; }), last = mls.length ? mls[mls.length - 1].id : '', ids = mls.map(function (x) { return x.id; });
    return v.items.filter(function (x) { return x.sec === 'in' && (x.m === mid || (mid === last && (!x.m || ids.indexOf(x.m) < 0))); });
  }
  /* a draft that cannot be issued says why. block: cannot issue; warn: can, but the client will see the gap */
  function smCheck(items, terms) {
    var out = [], mls = items.filter(function (x) { return x.sec === 'tl' && !x.rm; }), r = terms.r, prev = '', sum = 0;
    if (!mls.length) out.push({ k: 'ms', block: true, t: 'Add at least one milestone with a date.' });
    mls.forEach(function (x) {
      if (!smIsoOk(x.d)) out.push({ k: 'ms', block: true, t: '“' + x.t + '” needs a date.' });
      else { if (prev && x.d < prev) out.push({ k: 'ms', block: true, t: 'Milestone dates go forward: “' + x.t + '” is before the one above it.' }); prev = x.d; }
      sum += x.pay || 0;
    });
    items.forEach(function (x) { if (x.sec === 'ci' && !x.rm && !smIsoOk(x.d)) out.push({ k: 'ci', block: true, t: '“' + x.t + '” needs the date you need it by.' }); });
    if (!smRulesOk(r)) out.push({ k: 'terms', block: true, t: 'Some agreement terms are out of range.' });
    else if (terms.price != null && mls.length && r.dep + sum !== 100) out.push({ k: 'pay', block: true, t: 'Payments add up to ' + (r.dep + sum) + '%, not 100%. Set the share due at start and each milestone’s share.' });
    var nok = items.filter(function (x) { return x.sec === 'in' && !x.rm && !String(x.ok || '').trim(); }).length;
    if (nok) out.push({ k: 'ok', block: false, t: nok + (nok === 1 ? ' deliverable has' : ' deliverables have') + ' no “Done when” line. Without one, “not as agreed” has nothing to point at.' });
    if (terms.price == null) out.push({ k: 'price', block: false, t: 'No contract value: the payment schedule will show shares, not amounts.' });
    return out;
  }
  /* the agreement in plain words. you: the client is reading (the portal); otherwise the client is named */
  function smTermsText(r, price, names, you) {
    var c = you ? 'you' : names.client, C = you ? 'You' : names.client, s = names.studio, has = you ? 'have' : 'has', out = [];
    var dep = price != null ? ' (' + names.money(Math.round(price * r.dep / 100)) + ')' : '';
    out.push(['Payment', (r.dep ? r.dep + '%' + dep + ' is due when work starts. ' : '') + 'Each milestone’s share is due ' + (r.pd ? r.pd + (r.pd === 1 ? ' day' : ' days') + ' after it is accepted' : 'when it is accepted') + '. Approved changes are added to the next milestone. Payments are made outside ScopeDue' + (r.meth ? ': ' + r.meth : '') + '.']);
    out.push(['Revisions', r.rpm + (r.rpm === 1 ? ' round' : ' rounds') + ' per milestone. A round is one list of changes sent on a delivery. Anything that does not meet a “Done when” line is fixed without using a round.']);
    out.push(['Changes', 'New or different work is quoted as a change request' + (r.rate ? ', at ' + names.money(r.rate) + ' an hour' + (r.min ? ', at least ' + r.min + (r.min === 1 ? ' hour' : ' hours') + ' each' : '') : '') + '. ' + (r.free ? r.free + ' small ' + (r.free === 1 ? 'change is' : 'changes are') + ' included.' : 'No changes are included.')]);
    out.push(['Reviews', C + ' ' + has + ' ' + r.review + ' business days to accept a delivery, ask for changes, or say what is not as agreed. With no answer by then, it counts as accepted.']);
    out.push(['Silence', 'If something ' + c + ' need' + (you ? '' : 's') + ' to approve or provide is waiting and there is no reply for ' + r.silence + ' business days, ' + s + ' may pause the work. Dates move by the days paused. After ' + r.dormant + ' days paused, ' + s + ' may close the project.']);
    out.push(['Missed dates', 'If a milestone is late, ' + c + ' can flag it. ' + s + ' then has ' + r.cure + ' days to deliver or agree a new date. Late items ' + c + ' provide' + (you ? '' : 's') + ' move later dates by the days they were late.']);
    out.push(['Ending early', 'If the project ends early, ' + c + ' pay' + (you ? '' : 's') + ' for accepted milestones, and payments for milestones not delivered are returned.']);
    if (r.own) out.push(['Ownership', 'The work belongs to ' + c + ' once it is paid in full.']);
    if (r.doc) out.push(['Contract', r.doc]);
    return out;
  }
  /* ---- the project record: everything agreed and delivered, with fingerprints, for printing or saving as a PDF.
     Both sides get the same record. o: { title, studio, client, money(n), fmt(ts), vers, crs, ev, M, appr(v) -> { by, ts, ip, fp } | null, now, esc } */
  var SM_EVW = { deliver: 'delivered', got: 'marked received', pause: 'paused the work', resume: 'resumed the work', close: 'closed the project', accept: 'accepted', changes: 'asked for changes on', notmet: 'said this is not as agreed:', flag: 'flagged as missed:', sent: 'sent', end: 'ended the project', check: 'checked', paid: 'said they paid', nopay: 'has not received', gave: 'handed over', recv: 'received', bug: 'reported a problem in', fixed: 'fixed a problem in', notbug: 'said a problem is not covered in', fixok: 'confirmed the fix in' };
  /* v103 (CONTRACT 61): a check on a step of a delivery's capsule: k is s<n>:ok or s<n>:issue */
  function smCk(e) { var m = /^s([1-5]):(ok|issue)$/.exec(String(e.k || '')); return m ? { n: +m[1], ok: m[2] === 'ok' } : { n: 0, ok: false }; }
  /* the text a capsule's fingerprint is made of; its first 12 hex, after a c, are the delivery's k */
  function smCapRaw(cap) { return JSON.stringify([String(cap.b || ''), (cap.steps || []).map(String)]); }
  /* v104 (CONTRACT 60): a line of the payment schedule, by its key (dep, a milestone id, a CR id), and what it is called */
  function smLine(M, key) { return (M.sched || []).filter(function (s) { return s.key === key; })[0] || null; }
  function smPayName(M, key) { if (key === 'dep') return 'the share due at start'; var m = smMs(M, key); return m ? m.t + '’s share' : String(key || ''); }
  function smEvText(e, M, names) {
    var who = e.w === 'y' ? names.studio : names.client, t = e.m ? (smMs(M, e.m) || smIn(M, e.m) || smHo(M, e.m) || { t: e.m }).t : '';
    if (e.ty === 'paid' || e.ty === 'nopay') { var pn = smPayName(M, e.m), you = who === 'You'; return e.ty === 'paid' ? who + (you ? ' said you paid ' : ' says they paid ') + pn : who + (you ? ' have not received ' : ' has not received ') + pn + ' yet'; }   // v104 (60)
    if (e.ty === 'check') { var ck = smCk(e); return ck.ok ? who + ' says step ' + ck.n + ' of ' + t + ' works' : who + ' reported an issue on step ' + ck.n + ' of ' + t; }   // v103 (61)
    return who + ' ' + SM_EVW[e.ty] + (t ? ' ' + t : '') + (e.ty === 'accept' && e.rec ? ' with an email code' : '');
  }
  function smStLabel(m, fmt) {
    if (m.st === 'accepted') return (m.deemed ? 'Accepted by default ' : 'Accepted ') + fmt(m.at);
    if (m.st === 'review') return 'In review until ' + fmt(m.ends);
    if (m.st === 'back') return m.resp && m.resp.ty === 'notmet' ? 'Not as agreed, back with the studio' : 'Changes asked, back with the studio';
    if (m.st === 'late') return 'Late ' + m.late + (m.late === 1 ? ' day' : ' days') + (m.notice && m.notice.open ? ', flagged' : '');
    if (m.st === 'notdelivered') return 'Not delivered after notice';
    return 'Due ' + smIsoLbl(m.eff);
  }
  function smRecordHTML(o) {
    var E = o.esc, M = o.M, G = M.gov, names = { studio: o.studio, client: o.client, money: o.money }, h = [], fpv = function (s) { return '<code>' + E(s || '') + '</code>'; };
    h.push('<article class="rq"><header class="rq-h"><p class="rq-k">Project record</p><h1>' + E(o.title) + '</h1><p>' + E(o.studio) + ' and ' + E(o.client) + '</p><p class="rq-m">Made ' + E(o.fmt(o.now)) + ' · ' + o.vers.length + (o.vers.length === 1 ? ' version' : ' versions') + ' · ' + o.crs.length + (o.crs.length === 1 ? ' change request' : ' change requests') + ' · ' + (o.ev || []).length + ' delivery events</p></header>');
    if (G) {
      var R = M.rules, rows = M.ms.map(function (m) { return '<tr><td>' + E(m.t) + '</td><td>' + E(smIsoLbl(m.eff)) + (m.eff !== m.base ? '<small>agreed ' + E(smIsoLbl(m.base)) + '</small>' : '') + '</td><td>' + (m.pay ? m.pay + '%' + (M.price != null ? ' · ' + E(o.money(m.amt)) : '') : '—') + '</td><td>' + E(smStLabel(m, o.fmt)) + '</td></tr>'; }).join('');
      h.push('<section><h2>Where it stands</h2>' + (M.cl ? '<p class="rq-n">' + E((M.cl.by === 'c' ? o.client + ' ended the project ' : o.studio + ' closed the project ') + o.fmt(M.cl.ts)) + (M.cl.e.tx ? ': ' + E(M.cl.e.tx) : '') + '</p>' : M.pz ? '<p class="rq-n">' + E(o.studio + ' paused the work ' + o.fmt(M.pz.ts)) + (M.pz.e.tx ? ': ' + E(M.pz.e.tx) : '') + '</p>' : '') +
        '<table><thead><tr><th>Milestone</th><th>Date</th><th>Share</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        (M.ins.length ? '<table><thead><tr><th>' + E(o.client) + ' provides</th><th>Needed by</th><th colspan="2">Status</th></tr></thead><tbody>' + M.ins.map(function (n) { return '<tr><td>' + E(n.t) + '</td><td>' + E(smIsoLbl(n.due)) + '</td><td colspan="2">' + E(n.got ? 'Received ' + o.fmt(n.got.ts) : n.sent ? 'Sent ' + o.fmt(n.sent.ts) : n.st === 'late' ? 'Late ' + n.late + (n.late === 1 ? ' day' : ' days') : 'Not yet') + (n.late && (n.got || n.sent) ? E(' (' + n.late + (n.late === 1 ? ' day' : ' days') + ' late)') : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '') + '</section>');
      var a = o.appr(G);
      h.push('<section><h2>The agreement</h2><p>Scope v' + G.v + (a ? ', approved by ' + E(a.by) + ' ' + E(o.fmt(a.ts)) + ' with an email code' + (a.ip ? ' from IP ' + E(a.ip) : '') : '') + '. Fingerprint ' + fpv(G.fp) + '.</p>');
      var sec = function (s, label, f) { var l = G.items.filter(function (x) { return x.sec === s; }); return l.length ? '<h3>' + E(label) + '</h3><ul>' + l.map(f).join('') + '</ul>' : ''; };
      var mt = function (id) { var m = smMs(M, id); return m ? m.t : (M.ms.length ? M.ms[M.ms.length - 1].t : ''); };
      h.push(sec('in', 'Deliverables', function (x) { return '<li><b>' + E(x.t) + '</b>' + (x.ok ? '<small>Done when: ' + E(x.ok) + '</small>' : '') + '<small>Milestone: ' + E(mt(x.m)) + '</small></li>'; }));
      h.push(sec('out', 'Not included', function (x) { return '<li>' + E(x.t) + '</li>'; }));
      h.push(sec('ci', o.client + ' provides', function (x) { return '<li>' + E(x.t) + '<small>By ' + E(smIsoLbl(x.d)) + '</small></li>'; }));
      h.push(sec('wa', 'Warranty', function (x) { return '<li>' + E(x.t) + '<small>' + E(x.d) + ' days after the last milestone is accepted</small></li>'; }));   // v107 (64)
      h.push(sec('ho', 'Handed over', function (x) { return '<li>' + E(x.t) + '<small>With ' + E(mt(x.m)) + '</small></li>'; }));   // v106 (63)
      h.push(sec('tl', 'Milestones', function (x) { return '<li><b>' + E(x.t) + '</b><small>' + E(smIsoLbl(x.d)) + (x.pay ? ' · ' + x.pay + '%' : '') + '</small></li>'; }));
      h.push('<h3>Terms</h3><dl>' + (M.price != null ? '<dt>Contract value</dt><dd>' + E(o.money(M.price)) + '</dd>' : '') + smTermsText(R, M.price, names, false).map(function (r) { return '<dt>' + E(r[0]) + '</dt><dd>' + E(r[1]) + '</dd>'; }).join('') + '</dl></section>');
    }
    h.push('<section><h2>Versions</h2><ul>' + o.vers.map(function (v) { var a = o.appr(v); return '<li><b>Scope v' + v.v + '</b><small>Issued ' + E(v.ts ? o.fmt(v.ts) : v.at) + ' · ' + fpv(v.fp) + ' · ' + (a ? 'approved by ' + E(a.by) + ' ' + E(o.fmt(a.ts)) + ' (email code' + (a.ip ? ', IP ' + E(a.ip) : '') + ')' : 'not approved') + '</small></li>'; }).join('') + '</ul></section>');
    if (o.crs.length) h.push('<section><h2>Change requests</h2>' + o.crs.map(function (c) {
      var st = smCrState(c);
      return '<h3>' + E(c.id + ' · ' + c.t) + ' <small>' + E((st === 'approved' ? 'Approved' : st === 'declined' ? 'Declined' : 'Open') + (pdDispute(c) ? ' · Disputed' : '')) + '</small></h3><ol>' + c.entries.map(function (e) {
        return '<li><small>' + E(e.ts ? o.fmt(e.ts) : e.at) + ' · ' + E(e.w === 'y' ? o.studio : o.client) + ' · ' + E(e.ty) + (e.amt != null ? ' · ' + (e.amt ? E(o.money(e.amt)) : e.inc ? 'included change' : 'no extra cost') + (e.days ? ' · +' + e.days + ' days' : '') : '') + (e.hx ? ' · ' + fpv(e.hx.slice(0, 12)) : '') + '</small>' + E(e.tx) + (e.rec ? '<small>Accepted with an email code' + (e.rec.ip ? ' from IP ' + E(e.rec.ip) : '') + '</small>' : '') + '</li>';
      }).join('') + '</ol>';
    }).join('') + '</section>');
    if ((o.ev || []).length) h.push('<section><h2>Delivery record</h2><ol>' + o.ev.map(function (e) {
      return '<li><small>' + E(o.fmt(e.ts)) + (e.hx ? ' · ' + fpv(e.hx.slice(0, 12)) : '') + '</small>' + E(smEvText(e, M, names)) + (e.tx ? '<small>' + E(e.tx) + '</small>' : '') + (e.link ? '<small>' + E(e.link) + '</small>' : '') + (e.cap && (e.cap.steps || []).length ? '<small>' + E((e.cap.b ? 'Build ' + e.cap.b + '. ' : '') + 'To check: ' + e.cap.steps.join(' · ')) + '</small>' : '') + (e.rec && e.rec.ip ? '<small>Email code, IP ' + E(e.rec.ip) + '</small>' : '') + '</li>';
    }).join('') + '</ol></section>');
    h.push('<footer class="rq-f"><p>Every Scope version has a SHA-256 fingerprint of exactly what was approved. Every change request entry and every delivery event is chained to the one before it, so nothing can be changed without it showing. Payments are made outside ScopeDue and are not part of this record.</p></footer></article>');
    return h.join('');
  }

  var pdN = sdCtr('pdN', 0);
  function pdsIt(sec, t, d, cr) { return { id: 'i' + (++pdN), sec: sec, t: t, d: d || '', cr: cr || '' }; }
  function pdsCp(x, o) { var y = { id: x.id, sec: x.sec, t: x.t, d: x.d, cr: x.cr }, k; if (x.ok != null) y.ok = x.ok; if (x.m != null) y.m = x.m; if (x.pay !== undefined) y.pay = x.pay; if (o) for (k in o) y[k] = o[k]; return y; }
  function pdsCl(list) { return list.map(function (x) { return pdsCp(x); }); }
  function pdHash(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; }
  /* documentation ranges only (RFC 5737): sample IPs never point at a real address */
  function pdIp(s) { var h = pdHash(s); return (h & 1 ? '203.0.113.' : '198.51.100.') + (20 + (h >>> 8) % 200); }
  /* CONTRACT 101: a new client project's currency. The one picked last (on this device), else the newest client project's,
     else where this device is (its time zone, then its language's region), else USD */
  var PD_CUR_LAST = 'sd-cur-last';
  function pdCurNext() {
    var v = '', i, q;
    try { v = localStorage.getItem(PD_CUR_LAST) || ''; } catch (e) {}
    if (sdCurOk(v)) return v;
    for (i = 0; i < PROJECTS.length; i++) { q = PROJECTS[i]; if (q && q.kind === 'client' && !q.sample && sdCurOk(q.cur)) return q.cur; }
    return sdCurGuess();
  }
  function pdCurKeep(c) { if (sdCurOk(c)) { try { localStorage.setItem(PD_CUR_LAST, c); } catch (e) {} } }
  /* the currency is the client's to see from the first Scope issued: from then on it stays (an approval was given in it) */
  function pdCurLocked(p) { return !!(p && p.sc && p.sc.vers && p.sc.vers.length); }
  function pdInitClient(p) {
    p.cur = sdCurOk(p.cur) ? p.cur : pdCurNext();   /* CONTRACT 101: the one chosen when it was made, else the next one's */
    /* a new client project starts on the agreement (v2) */
    p.sc = { items: [], vers: [], terms: agTermsBlank(), te: false }; p.rev = { used: 0 }; p.crs = []; p.evd = []; p.mev = []; p.dis = {};
    if (p.dueAt) { var hm = pdsIt('tl', 'Handoff', smIsoLocal(p.dueAt)); hm.ok = ''; hm.m = ''; hm.pay = 70; p.sc.items.push(hm); }
    p.work = {};
  }

  /* hashing: SHA-256 of an issued version, and a chain over every Change entry */
  function pdSha(s, cb) {
    function fallback() { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } var g = (h.toString(16) + '00000000').slice(0, 8), g2 = (Math.imul(h, 2654435761) >>> 0).toString(16); cb(g + g2 + g + g2 + g + g2 + g + g2); }
    try {
      if (window.crypto && crypto.subtle && window.TextEncoder) crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { cb([].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('')); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function pdGroup(hex, n) { var o = [], i; for (i = 0; i < n; i += 4) o.push(hex.slice(i, i + 4)); return o.join('·'); }
  /* the exact text that is hashed: the same formula api.php uses, so the server can refuse a fingerprint that is not ours */
  function pdFpRaw(p, v) { return smFpRaw(p.id, v); }
  function pdHxRaw(crId, prev, e) { return [crId, prev, e.w, e.ty, e.at, e.tx, e.amt == null ? '' : e.amt, e.days == null ? '' : e.days, e.vu || ''].join('|'); }
  function pdHxGen(p, c) { return p.id + '|' + c.id + '|v' + c.base; }
  function pdFp(p) {
    if (p.kind !== 'client' || !p.sc) return;
    p.sc.vers.forEach(function (v) {
      if (v.fp || v.fpBusy) return; v.fpBusy = true;
      pdSha(pdFpRaw(p, v), function (hex) {
        v.fp = pdGroup(hex, 12); v.fpBusy = false;
        [].forEach.call(document.querySelectorAll('[data-fp="' + p.id + '|' + v.v + '"]'), function (n) { n.textContent = v.fp; n.classList.remove('pend'); });
      });
    });
  }
  function pdChain(p, c, cb) {
    c.q = c.q || []; if (cb) c.q.push(cb);
    if (c.busy) return; c.busy = true;
    var gen = pdHxGen(p, c), i = 0;
    (function next() {
      if (i >= c.entries.length) { c.busy = false; c.ok = true; var q = c.q; c.q = []; pdChainPaint(p, c); q.forEach(function (f) { f(); }); return; }
      var e = c.entries[i];
      if (e.hx) { i++; return next(); }
      pdSha(pdHxRaw(c.id, i ? c.entries[i - 1].hx : gen, e), function (hex) { e.hx = hex; i++; next(); });
    })();
  }
  function pdChainPaint(p, c) {
    var key = p.id + '|' + c.id;
    c.entries.forEach(function (e, i) {
      [].forEach.call(document.querySelectorAll('[data-h="' + key + '|' + i + '"]'), function (n) {
        if (!e.hx) return; n.title = 'SHA-256 ' + pdGroup(e.hx, 12) + ', chained to the entry before it';
        var sr = n.querySelector('.sr-only'); if (sr) { sr.className = 'pd-hc'; sr.textContent = pdCode(e.hx); }   /* v102 (58) */
      });
    });
    [].forEach.call(document.querySelectorAll('[data-chain="' + key + '"]'), function (n) { n.innerHTML = IC('tick') + 'Chain intact · ' + c.entries.length + (c.entries.length === 1 ? ' entry' : ' entries'); });
  }

  /* derived state */
  function pdLatest(p) { return p.sc.vers[p.sc.vers.length - 1] || null; }
  function pdVer(p, v) { return p.sc.vers.filter(function (x) { return x.v === v; })[0]; }
  function pdBaseItems(p) { var l = pdLatest(p); return l ? l.items : []; }
  function pdChanged(a, b) { return a.t !== b.t || a.d !== b.d || (a.ok || '') !== (b.ok || '') || (a.m || '') !== (b.m || '') || (a.pay == null ? null : a.pay) !== (b.pay == null ? null : b.pay); }
  function pdDraftRows(p) {
    var base = {}, has = !!pdLatest(p); pdBaseItems(p).forEach(function (x) { base[x.id] = x; });
    return p.sc.items.map(function (x) { var b = base[x.id]; return { x: x, was: b, k: !has ? '' : x.rm ? 'del' : !b ? 'add' : pdChanged(b, x) ? 'mod' : '' }; });
  }
  function pdVerRows(p, v) {
    var prev = pdVer(p, v.v - 1), pm = {}, vm = {}, rows = [];
    if (prev) prev.items.forEach(function (x) { pm[x.id] = x; });
    v.items.forEach(function (x) { vm[x.id] = 1; var b = pm[x.id]; rows.push({ x: x, was: b, k: !prev ? '' : !b ? 'add' : pdChanged(b, x) ? 'mod' : '' }); });
    if (prev) prev.items.forEach(function (x) { if (!vm[x.id]) rows.push({ x: x, k: 'del' }); });
    return rows;
  }
  function pdDiff(p) {
    var r = pdDraftRows(p).filter(function (x) { return x.k; }), l = pdLatest(p), tc = !!l && !pdTermsSame(p.sc.terms, pdTermsOf(l));
    return { rows: r, count: r.length + (tc ? 1 : 0), terms: tc };
  }
  function pdVerSum(p, v) {
    var prev = pdVer(p, v.v - 1); if (!prev) return v.items.length + (v.items.length === 1 ? ' item' : ' items');
    var rows = pdVerRows(p, v), n = function (k) { return rows.filter(function (r) { return r.k === k; }).length; }, a = n('add'), m = n('mod'), d = n('del');
    if (!a && !m && !d) return 'No changes';
    return [a ? '+' + a : '', d ? '−' + d : '', m ? '~' + m : ''].filter(Boolean).join(' ') + ' vs v' + prev.v;
  }
  function pdCr(p, id) { return p.crs.filter(function (c) { return c.id === id; })[0]; }
  function pdCrNum(c) { return +c.id.replace(/\D/g, ''); }
  function pdCrList(p) { return p.crs.slice().sort(function (a, b) { return pdCrNum(b) - pdCrNum(a); }); }
  function pdCrState(c) {
    var e = c.entries[c.entries.length - 1];
    if (e.ty === 'accept') return 'approved';
    if (e.ty === 'decline') return 'declined';
    if (e.w === 'c') return 'me';
    return e.ty === 'request' || (e.ty === 'note' && c.adds) ? 'me' : 'client';   /* CONTRACT 82: the studio's note on a request that adds work leaves it with the studio, which still owes a quote; to have the client answer, it asks (a question) */
  }
  function pdCrOpen(c) { var s = pdCrState(c); return s === 'me' || s === 'client'; }
  function pdTerms(c) {
    for (var i = c.entries.length - 1; i >= 0; i--) { var e = c.entries[i]; if (e.amt != null) return { amt: e.amt, days: e.days, w: e.w, at: e.at }; }
    return null;
  }
  function pdCrVer(p, c) {
    var vs = p.sc.vers.filter(function (v) { return v.items.some(function (x) { return x.cr === c.id; }); });
    return vs.length ? vs[0].v : 0;
  }
  function pdCrInDraft(p, c) { return p.sc.items.some(function (x) { return x.cr === c.id && !x.rm; }); }
