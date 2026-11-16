  /* ---------- private projects: actions ---------- */
  function prvUi() { return { dt: 'all', sh: null, tri: 0, trn: 0, sk: [], sim: null, re: null, rb: null, sa: null, se: null, st: null, pro: null, drp: null, pke: null, je: null, jx: null, jan: null, we: null, kpre: null, preset: null, ke: null, ds: null, dn: {}, gs: 0, pe: null, pr: null, repId: '', hl: { thesis: 1, proof: 1, scope: 1, release: 1, market: 1, decisions: 1, drift: 1, work: 1 }, hn: 12, back: '', srcAll: 0 }; }
  function prvReset() { var q = pd.pv; if (q) q.pf = q.lt = q.cha = q.sa = q.se = q.st = q.pro = q.drp = q.pke = q.je = q.jx = q.jan = q.we = q.kpre = q.ke = q.re = q.rb = q.sh = q.pe = q.pr = null; }
  function prvEditing() { var q = pd.pv; return !!(q && pd.p && pd.p.kind === 'private' && (q.pf || q.lt || q.cha || q.sa || q.se || q.st || q.pro || q.drp || q.pke || q.je || q.jx || q.we || q.ke || q.re || q.rb || q.sh || q.pe || q.pr)); }
  function prvSnap(p) { return JSON.stringify(p.pv); }
  /* A change History already shows (a parked idea, a decision, a baseline) needs no second line. One it does not show
     (a re-check, a size, a removal) is noted, so Recent and History both say it happened */
  /* The count before is the one worked out after the last change, kept with the model's text then: when that text is the snapshot
     (nothing changed in between), it is reused, so a change works the events out once and never reads its snapshot back */
  var prvEvMemo = { s: '', n: 0 };
  function prvEvN(pv) { return prvEvents({ pv: pv, log: [] }).length; }
  function prvLogged(p, snap) {
    var before = prvEvMemo.s === snap ? prvEvMemo.n : prvEvN(JSON.parse(snap)), after = prvEvN(p.pv);
    prvEvMemo = { s: JSON.stringify(p.pv), n: after };
    return after > before;
  }
  function prvNote(p, text, snap) {
    var rec = snap && prvLogged(p, snap) ? null : pdNote(p, text), oldUpd = p.upd, oldT = p.updT;
    pdTouch(p); pdRender();
    return function () { pdUnnote(p, rec); p.upd = oldUpd; p.updT = oldT; pdRender(); };
  }
  /* one change: derive, note it in Recent, offer Undo (the whole model is restored from its snapshot) */
  function prvDone(p, snap, text, toast, focusSel, flashSel) {
    var undoNote = prvNote(p, text, snap);
    prvAfter(p);
    var undo = function () { snapBack(p, snap); undoNote(); prvAfter(p); undone(p); };
    pdRerender(focusSel);
    if (flashSel) prvFlash(pdPanel.querySelector(flashSel), false);
    showToast(toast, undo);
  }
  function prvFlash(el, scroll) {
    if (!el) return;
    if (scroll) el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    el.classList.remove('cd-flash'); void el.offsetWidth; el.classList.add('cd-flash');
    if (scroll) { if (!el.hasAttribute('tabindex') && !/^(BUTTON|INPUT|A)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    setTimeout(function () { el.classList.remove('cd-flash'); }, 1700);
  }
  function prvErr(form, field, msg) {
    var e = form.querySelector('.err'); if (e) e.textContent = msg;
    form.setAttribute('data-err', field || '');
    var f = field && form.querySelector('[name="' + field + '"]'); if (f) f.focus();
  }
  function prvOpen(key, val, a, focusSel) { var q = pd.pv; prvReset(); q[key] = val; q.back = a ? prvSel(a) : ''; pdRerender(focusSel); prvReveal(focusSel); }
  /* a form that opens away from its button (Add job in the page header opens in the Gap map, further down) is brought into
     view and flashed once; one already on screen does not move */
  function prvReveal(sel) {
    var f = sel && pdPanel.querySelector(sel); if (!f) return;
    var box = f.closest('form') || f, r = box.getBoundingClientRect(), top = (document.querySelector('.topbar') || { offsetHeight: 0 }).offsetHeight;
    if (r.top >= top && r.bottom <= window.innerHeight) return;
    box.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    prvFlash(box, false);
  }
  function prvText(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function prvChecked(f, name) { return [].map.call(f.querySelectorAll('input[name="' + name + '"]:checked'), function (el) { return +el.value; }).sort(function (a, b) { return a - b; }); }

  function prvAct(act, a) {
    var p = pd.p, q = pd.pv, pv = p.pv, id = a.getAttribute('data-id'), x, snap, now = Date.now();
    switch (act) {
      case 'cancel': { var b = q.back; prvReset(); pdRerender(b); break; }
      /* scope */
      case 'gate': gateOpen(a.getAttribute('data-m'), id, a); break;
      case 'bring': gateOpen('bring', id, a); break;
      case 'pull': gateOpen('pull', id, a); break;
      case 'vx': vxOpen(a, a.getAttribute('data-vk')); break;
      case 'sadd': prvOpen('sa', a.getAttribute('data-sec'), a, '.prv-if input[name="t"]'); break;
      case 'sedit': prvOpen('se', id, a, '.prv-if input[name="t"]'); break;
      case 'stake': prvOpen('st', id, a, '.prv-to input[name="w"]'); break;
      case 'rel': prvOpen('re', true, a, '#prv-rn'); break;
      case 'ship': { prvOpen('sh', true, a, '#prv-sm'); var shp = pdPanel.querySelector('.prv-shp'); if (shp) shp.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); break; }
      case 'srm': {
        x = prvById(pv.items, id); if (!x) break; snap = prvSnap(p);
        var from = x.sec; prvMove(p, x, 'gone', '');
        prvDone(p, snap, 'You removed an item from ' + PRV_BN[from], 'Removed “' + x.t + '”', '[data-pd="prv:gate"]'); break;
      }
      case 'srest': {
        x = prvById(pv.items, id); if (!x) break; snap = prvSnap(p);
        if (x.sec === 'inbox') { var back = pv.park.filter(function (k) { return k.iid === x.id && k.st === 'parked'; })[0]; if (back) { back.st = 'promoted'; back.to = 'in'; back.xts = now; back.lg.push({ ts: now, k: 'promote', to: 'in' }); } }
        prvMove(p, x, 'in', '', { rs: 1 });
        prvDone(p, snap, 'You put an item back in Now', 'Put back “' + x.t + '”. It was in the baseline, so it is not new drift.', '[data-pd="prv:gate"]', '[data-it="' + x.id + '"]'); break;
      }
      case 'base': {
        var ids = prvBucket(p, 'in').map(function (i) { return i.id; }); if (!ids.length || !pv.rel.ship || !pv.rel.date || !pv.rel.cap) break; snap = prvSnap(p);
        pv.base = prvBaseNow(p, now); pv.bls.push({ ts: now, n: ids.length, ov: 0, why: '' });
        prvDone(p, snap, 'You committed a baseline', 'Baseline committed. Changes from now on count as Drift.', '[data-pd="prv:rebase"]'); break;
      }
      case 'rebase': { if (!prvMoved(p)) break; prvOpen('rb', true, a, '#prv-rbw'); break; }
      case 'lt': { var lk = a.getAttribute('data-k'); prvReset(); q.lt = lk; pdRerender(lk === 'cut' ? '.prv-cutl input' : lk === 'ext' ? '#prv-xd' : '#prv-sw'); break; }
      case 'ltx': { q.lt = null; pdRerender('[data-pd="prv:lt"]'); break; }
      case 'chadd': prvOpen('cha', true, a, '#prv-chn'); break;
      case 'chrm': {
        var chs = pv.channels || [], ch = prvById(chs, id); if (!ch) break; snap = prvSnap(p); chs.splice(chs.indexOf(ch), 1);
        prvDone(p, snap, 'You removed a channel', 'Removed ' + ch.n, '[data-pd="prv:chadd"]'); break;
      }
      /* parking lot */
      case 'pke': prvOpen('pke', id, a, '.prv-ie input[name="t"]'); break;
      case 'idrp': prvOpen('drp', id, a, '.prv-ip input[name="w"]'); break;
      case 'ikeep': {
        x = prvById(pv.park, id); if (!x || x.kc >= 1) break; snap = prvSnap(p); x.kept = now; x.kc = (x.kc || 0) + 1; if (q.tri) q.sk.push(x.id);
        prvDone(p, snap, 'You kept an idea parked', 'Kept once. In ' + PRV_REV + ' days it has to go to Next or Never.', '#prv-qa'); break;
      }
      case 'isz': {
        x = prvById(pv.park, id); if (!x) break; snap = prvSnap(p); var z = a.getAttribute('data-z'); x.size = x.size === z ? '' : z;
        prvDone(p, snap, 'You sized an idea', x.size ? 'Sized ' + x.size + ', ' + prvSzText(p, x.size) + '. The Gate starts from it.' : 'Size cleared', '[data-k="' + x.id + '"] .prv-szb[data-z="' + z + '"]'); break;
      }
      case 'still': {
        x = prvById(pv.items, id); if (!x || x.sec !== 'out') break; snap = prvSnap(p);
        prvLook(x, x.rvn || PRV_LOOK); x.lg.push({ ts: now, k: 'rv', why: '' });
        prvDone(p, snap, 'You kept an item in Never', 'Still no. “' + prvT(x.t, 40) + '” stays in Never. Look again ' + prvLookText(x) + '.', '[data-it="' + x.id + '"] [data-pd="prv:bring"]', '[data-it="' + x.id + '"]'); break;
      }
      case 'tri': { q.tri = 1; q.trn = 0; q.sk = []; pdRerender('.prv-focus .prv-pro'); break; }
      case 'trix': { q.tri = 0; pdRerender('[data-pd="prv:tri"]'); break; }
      case 'trisk': { q.sk = q.sk.filter(function (k) { return k !== id; }); q.sk.push(id); pdRerender('.prv-focus .prv-pro'); break; }
      case 'simk': {
        x = q.sim && prvById(pv.items, q.sim.id); if (!x) { q.sim = null; pdRerender(); break; } snap = prvSnap(p);
        x.rs = (x.rs || 0) + 1; x.rsl = now; x.lg.push({ ts: now, k: 'again', why: '' }); q.sim = null;
        prvDone(p, snap, 'You asked for something in Never', 'Kept out. “' + prvT(x.t, 40) + '” has come up again ' + prvTimes(x.rs) + ' since you ruled it out.', '#prv-qa'); break;
      }
      case 'simc': { var sm = q.sim; if (!sm) break; prvCapture(p, sm.t, sm.tag, prvById(pv.items, sm.id)); break; }
      case 'inxt': {
        x = prvById(pv.park, id); if (!x) break;
        if (prvNever(p, x.t)) { gateOpen('promote', id, a); break; }
        snap = prvSnap(p);
        var ni = prvIdeaToItem(p, x, 'next', '');
        prvDone(p, snap, 'You moved an idea to Next', '“' + ni.t + '” will wait for ' + prvNextName(p) + '. It has left the Parking Lot.', '#prv-qa'); break;
      }
      /* market */
      case 'jnew': prvOpen('je', 'new', a, '#prv-jt-new'); break;
      case 'jedit': q.je = id; q.back = prvSel(a); pdRerender('#prv-jt-' + id); break;
      case 'jx': {
        var mid = a.getAttribute('data-m'), was = q.jx === id;
        if (was && !mid) { q.jx = null; q.je = null; pdRerender('.prv-jb[data-id="' + id + '"]'); break; }
        if (!was) { prvReset(); q.jx = id; q.jan = id; }
        pdRerender(mid ? '.prv-jd[data-j="' + id + '"] input[name="l-' + mid + '"]:checked' : '.prv-jb[data-id="' + id + '"]');
        q.jan = null;
        var jd = pdPanel.querySelector('.prv-jd[data-j="' + id + '"]'); if (jd && mid) jd.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        break;
      }
      case 'jrm': {
        x = prvById(pv.jobs, id); if (!x) break; snap = prvSnap(p);
        pv.jobs.splice(pv.jobs.indexOf(x), 1); pv.comps.forEach(function (c) { delete c.cov[id]; }); if (pv.wedge.job === id) pv.wedge.job = '';
        q.jx = null; q.je = null;
        prvDone(p, snap, 'You removed a job', prvVMsg(p, 'Removed “' + prvT(x.t, 40) + '”'), '[data-pd="prv:jnew"]'); break;
      }
      case 'evrm': {
        x = prvById(pv.jobs, id); var ei2 = x ? x.dem.map(function (e) { return e.id; }).indexOf(a.getAttribute('data-e')) : -1; if (ei2 < 0) break; snap = prvSnap(p);
        x.dem.splice(ei2, 1);
        prvDone(p, snap, 'You removed a demand note', prvVMsg(p, 'Note removed'), '#prv-ex-' + id); break;
      }
      case 'asmrm': {
        var ak = a.getAttribute('data-k'), al = pv.asm[ak]; x = al && prvById(al, id); if (!x) break; snap = prvSnap(p);
        al.splice(al.indexOf(x), 1);
        prvDone(p, snap, ak === 'q' ? 'You removed an open question' : 'You edited your wedge and risks', 'Removed', '#prv-a-' + ak); break;
      }
      case 'wedit': prvOpen('we', true, a, '#prv-wt'); break;
      case 'knew': prvOpen('ke', 'new', a, '#prv-kn-new'); break;
      case 'subadd': prvReset(); q.ke = 'new'; q.kpre = 'sub'; q.back = prvSel(a); pdRerender('#prv-kn-new'); break;
      case 'kedit': prvOpen('ke', id, a, '#prv-kn-' + id); break;
      case 'krm': {
        x = prvById(pv.comps, id); if (!x) break; snap = prvSnap(p);
        pv.comps.splice(pv.comps.indexOf(x), 1);
        prvDone(p, snap, 'You stopped tracking a competitor', prvVMsg(p, 'Stopped tracking ' + x.n), '[data-pd="prv:knew"]'); break;
      }
      case 'krecheck': {
        x = prvById(pv.comps, id); if (!x) break; snap = prvSnap(p); x.chk = now;
        prvDone(p, snap, 'You re-checked a competitor', x.n + ' marked as checked today', '[data-m="' + x.id + '"] [data-pd="prv:krecheck"]', '[data-m="' + x.id + '"]'); break;
      }
      case 'srcadd': openDrawer('msrc', a); break;
      case 'srcrm': {
        var n = +a.getAttribute('data-n'), s = prvSrc(p, n); if (!s || prvUsed(p, n)) break; snap = prvSnap(p);
        pv.src.splice(pv.src.indexOf(s), 1);
        prvDone(p, snap, pdMode(p) === 'internal' ? 'You removed a source' : 'You removed a market source', 'Source [' + n + '] removed', '[data-pd="prv:srcadd"]'); break;
      }
      case 'srcver': {
        var vn = +a.getAttribute('data-n'), vs = prvSrc(p, vn); if (!vs || !vs.ai || vs.ver) break; snap = prvSnap(p); vs.ver = true;
        prvDone(p, snap, 'You verified a market source', prvVMsg(p, 'Source [' + vn + '] marked verified'), '.prv-src[data-n="' + vn + '"]'); break;
      }
      case 'ref': {
        var rn = a.getAttribute('data-n');
        if (a.hasAttribute('data-go')) pdGo(prvSrcTab(p));
        prvFlash(pdPanel.querySelector('.prv-src[data-n="' + rn + '"]'), true); break;
      }
      case 'gojob': { prvReset(); q.jx = id; q.jan = id; pdRerender(); q.jan = null; prvFlash(pdPanel.querySelector('.prv-gm-j[data-j="' + id + '"] .prv-gm-r'), true); break; }
      case 'gocomp': { var sc0 = prvStale(p)[0]; if (sc0) prvFlash(pdPanel.querySelector('.prv-cp[data-m="' + sc0.id + '"]'), true); break; }
      case 'goverify': { var uv = pv.src.filter(function (z) { return z.ai && !z.ver; })[0]; if (uv) prvFlash(pdPanel.querySelector('.prv-src[data-n="' + uv.n + '"]'), true); break; }
      case 'decide': {
        var vv = prvVerdict(p), crowded = vv.k === 'crowded', ev = [];
        (crowded ? vv.by.taken : vv.by.empty).forEach(function (r) {
          r.j.dem.forEach(function (e) { if (e.src && ev.indexOf(e.src) < 0) ev.push(e.src); });
          pv.comps.forEach(function (c) { var cv = c.cov[r.j.id]; if (cv && cv.s && ev.indexOf(cv.s) < 0) ev.push(cv.s); });
        });
        q.preset = { t: PRV_DECIDE, typ: 'market', o: crowded ? ['Continue and compete on the wedge', 'Narrow to one job', 'Stop'] : ['Find proof of demand first', 'Narrow to one job', 'Stop'], ev: ev.sort(function (m1, m2) { return m1 - m2; }).slice(0, 6) };
        q.repId = ''; openDrawer('ndec', a); break;
      }
      case 'mexp': openDrawer('mexp', a); break;
      case 'srcall': q.srcAll = !q.srcAll; pdRerender('[data-pd="prv:srcall"]'); break;
      case 'mai': openDrawer('mai', a); break;
      case 'mrev': {
        snap = prvSnap(p); pv.imp.push({ id: prvId('a'), ts: now, mode: 'manual', model: '', as_of: prvIso(now), sample: false, n: {} });
        prvDone(p, snap, 'You marked the market reviewed', 'Marked as reviewed. Next review due ' + prvDate(now + PRV_MONTH * PRV_DAY) + '.', '.prv-rcd [data-pd="prv:mai"]', '.prv-rcd'); break;
      }
      case 'retrest': {
        var ri = prvById(pv.ret, id); if (!ri) break;
        var rnm = ri.kind === 'job' ? ri.d.t : ri.d.n, rdup = (ri.kind === 'job' ? pv.jobs : pv.comps).some(function (z) { return maiNorm(ri.kind === 'job' ? z.t : z.n) === maiNorm(rnm); });
        if (rdup) { showToast('“' + prvT(rnm, 40) + '” is already on your map'); break; }
        snap = prvSnap(p);
        if (ri.kind === 'job') { pv.jobs.push(ri.d); Object.keys(ri.cov || {}).forEach(function (cid) { var cc = prvById(pv.comps, cid); if (cc) cc.cov[ri.d.id] = ri.cov[cid]; }); if (ri.wedge && !pv.wedge.job) pv.wedge.job = ri.d.id; }
        else pv.comps.push(ri.d);
        pv.ret.splice(pv.ret.indexOf(ri), 1);
        prvDone(p, snap, 'You restored a retired ' + (ri.kind === 'job' ? 'job' : 'competitor'), prvVMsg(p, 'Restored “' + prvT(rnm, 40) + '”'), ri.kind === 'job' ? '[data-pd="prv:jnew"]' : '[data-pd="prv:knew"]', ri.kind === 'job' ? '.prv-gm-j[data-j="' + ri.d.id + '"] .prv-gm-r' : '.prv-cp[data-m="' + ri.d.id + '"]'); break;
      }
      /* decisions */
      case 'dsel': {
        q.ds = id; pdRerender('.pd-cr[data-id="' + id + '"]');
        if (window.innerWidth <= 1100) { var dd = pdPanel.querySelector('.prv-dd'); if (dd) dd.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
        break;
      }
      case 'dmore': {
        var dg = a.getAttribute('data-g'), dn0 = +a.getAttribute('data-n') || PRV_DN; q.dn = q.dn || {}; q.dn[dg] = dn0 + PRV_DN;
        pdRerender('.pd-crs[data-g="' + dg + '"] li:nth-child(' + (dn0 + 1) + ') button'); break;
      }
      case 'dgate': { var gsel = q.ds && prvById(pv.dec, q.ds); q.gs = q.gs ? 0 : 1; if (!q.gs && gsel && gsel.typ === 'scope') q.ds = null; pdRerender('[data-pd="prv:dgate"]'); break; }
      case 'dnew': q.repId = ''; openDrawer('ndec', a); break;
      case 'drep': q.repId = id; openDrawer('ndec', a); break;
      case 'doptrm': {
        var d = prvDecSelected(p), oi = +a.getAttribute('data-i'); if (!d || d.st !== 'open' || !d.opts[oi]) break; snap = prvSnap(p);
        var ot = d.opts[oi].t; d.opts.splice(oi, 1);
        prvDone(p, snap, 'You removed an option from a decision', 'Option removed: ' + ot, '#prv-oa'); break;
      }
      /* a principle: reword it, or say why it is retired (prvSubmitPrincEdit, prvSubmitPrincRetire) */
      case 'pe': case 'prm': {
        var pp = prvById(pv.princ, id); if (!pp || pp.rm) break;
        if (act === 'prm' && prvPrinc(p).length <= PRV_PMIN) break;
        prvReset(); q[act === 'pe' ? 'pe' : 'pr'] = id; q.back = '[data-pd="' + (act === 'pe' ? 'prv:pe' : 'prv:prm') + '"][data-id="' + id + '"]';
        pdRerender(act === 'pe' ? '#prv-pe' : '#prv-prw'); break;
      }
      case 'ddel': {
        var dl = prvDecSelected(p); if (!dl || dl.st !== 'open') break; snap = prvSnap(p);
        pv.dec.splice(pv.dec.indexOf(dl), 1); q.ds = null;
        prvDone(p, snap, 'You deleted an open decision', 'Deleted “' + dl.t + '”', '[data-pd="prv:dnew"]'); break;
      }
      /* history */
      case 'lane': { var l = a.getAttribute('data-l'); q.hl[l] = q.hl[l] ? 0 : 1; q.hn = 12; pdRerender('.prv-lt[data-l="' + l + '"]'); break; }
      case 'hmore': { var h0 = q.hn; q.hn += 12; pdRerender(); var rows = pdPanel.querySelectorAll('.prv-e'); if (rows[h0]) { var hb = rows[h0].querySelector('button'); if (hb) hb.focus({ preventScroll: true }); } break; }
      /* a mark holds one event or several close together (newest first). The list is opened once, far enough to show them all.
         A lane that is turned off has no rows to show */
      case 'hev': {
        var eis = (a.getAttribute('data-i') || '').split(' '), ln = a.getAttribute('data-l'), deep = -1, lon = {};
        if (!q.hl[ln]) break;
        prvLanes(p).forEach(function (l) { lon[l[0]] = 1; });
        prvEvents(p).filter(function (e) { return lon[e.ln] && q.hl[e.ln]; }).forEach(function (e, k) { if (eis.indexOf(String(e.i)) > -1) deep = k; });
        if (deep < 0) break;
        if (deep >= q.hn) { q.hn = Math.ceil((deep + 1) / 12) * 12; pdRerender(); }
        eis.forEach(function (ei, k) { prvFlash(pdPanel.querySelector('.prv-e[data-ei="' + ei + '"]'), k === 0); });
        break;
      }
      case 'hgo': {
        var tab = a.getAttribute('data-tab'), hid = a.getAttribute('data-id'), hn = a.getAttribute('data-n'), hf = a.getAttribute('data-f');
        if (hn) q.srcAll = 1;
        if (tab === 'decisions' && hid) q.ds = hid;
        if (tab === 'parking' && hid) { var idea = prvById(pv.park, hid), gone = idea && idea.st === 'promoted' && idea.iid && prvById(pv.items, idea.iid); if (gone && (gone.sec === 'in' || gone.sec === 'next' || gone.sec === 'out')) { tab = 'scope'; hid = gone.id; } }
        pdGo(tab, hf);
        if (hn) prvFlash(pdPanel.querySelector('.prv-src[data-n="' + hn + '"]'), true);
        else if (tab === 'parking' && hid) prvFlash(pdPanel.querySelector('[data-k="' + hid + '"]'), true);
        else if (tab === 'scope' && hid) prvFlash(pdPanel.querySelector('[data-it="' + hid + '"]'), true);
        break;
      }
    }
  }

  function prvSubmit(kind, f) {
    if (kind === 'item') prvSubmitItem(f);
    else if (kind === 'take') prvSubmitTake(f);
    else if (kind === 'padd') prvSubmitPark(f);
    else if (kind === 'drop') prvSubmitDrop(f);
    else if (kind === 'rel') prvSubmitRel(f);
    else if (kind === 'rebase') prvSubmitRebase(f);
    else if (kind === 'princ') prvSubmitPrinc(f);
    else if (kind === 'pedit') prvSubmitPrincEdit(f);
    else if (kind === 'pret') prvSubmitPrincRetire(f);
    else if (kind === 'ship') prvSubmitShip(f);
    else if (kind === 'idea') prvSubmitIdea(f);
    else if (kind === 'job') prvSubmitJob(f);
    else if (kind === 'ev') prvSubmitEv(f);
    else if (kind === 'jdet') prvSubmitJdet(f);
    else if (kind === 'wedge') prvSubmitWedge(f);
    else if (kind === 'asm') prvSubmitAsm(f);
    else if (kind === 'comp') prvSubmitComp(f);
    else if (kind === 'dopt') prvSubmitOpt(f);
    else if (kind === 'record') prvSubmitRecord(f);
    else if (kind === 'cut') prvSubmitCut(f);
    else if (kind === 'ext') prvSubmitExt(f);
    else if (kind === 'stop') prvSubmitStop(f);
    else if (kind === 'chan') prvSubmitChan(f);
  }
  /* one place where an item changes list, so the log always knows where it came from */
  function prvMove(p, x, to, why, o) {
    var e = { ts: Date.now(), k: 'mv', fr: x.sec, to: to, why: why || '' }, k;
    for (k in o) e[k] = o[k];
    x.lg.push(e); x.sec = to; if (to !== 'in') x.ov = 0;
    if (to === 'out') prvLook(x, PRV_LOOK); else x.rvd = 0;
    return e;
  }
  /* a call about scope is kept as a decision, written the way the Gate writes it */
  function prvLogScope(p, x, bucket, because) {
    var d = prvSDec(x, bucket, 0, because); d.ots = d.dts = Date.now(); p.pv.dec.push(d); return d;
  }
  /* an idea leaves the Parking Lot for Now, Next or Never. The idea keeps a trail, and an item that came from Now is revived rather than copied */
  function prvIdeaToItem(p, k, bucket, why, o) {
    var pv = p.pv, now = Date.now(), x = k.iid && prvById(pv.items, k.iid), e, j;
    if (x && x.sec === 'inbox') { prvMove(p, x, bucket, why, { pr: 1 }); x.why = why || x.why; }
    else { x = prvMk(bucket, k.t, why, now, { pr: 1 }); pv.items.push(x); }
    if (!x.size) x.size = k.size || '';
    if (k.job === 'none') x.nj = 1; else if (k.job && (j = prvById(pv.jobs, k.job)) && j.items.indexOf(x.id) < 0) j.items.push(x.id);
    k.st = 'promoted'; k.to = bucket; k.xts = now; k.iid = x.id; k.lg.push({ ts: now, k: 'promote', to: bucket });
    return x;
  }
  function prvSubmitItem(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, sec = f.getAttribute('data-sec'), id = f.getAttribute('data-id'), t = prvText(f.elements.t.value), w = prvText(f.elements.w.value), snap, now = Date.now(), x;
    if (t.length < 2) return prvErr(f, 't', sec === 'out' ? 'Write what you will never build.' : 'Write what this item is.');
    if (sec === 'out' && !w) return prvErr(f, 'w', 'Say why. A Never without a reason gets argued again.');
    var z = f.elements.z ? f.elements.z.value : null, lk = f.elements.l ? parseInt(f.elements.l.value, 10) : null;
    snap = prvSnap(p);
    if (id) {
      x = prvById(pv.items, id); if (!x) return;
      if (x.t === t && x.why === w && (z === null || x.size === z) && (lk === null || lk === (x.rvn || 0))) { q.se = null; return pdRerender(q.back); }
      /* a new title on an item of the baseline is noted: if it now names something else, Drift counts it as new work */
      var was = x.t, inB = !!(pv.base && pv.base.t && pv.base.t[x.id] && x.sec === 'in' && was !== t), ren;
      x.t = t; x.why = w; if (z !== null) x.size = z; if (lk !== null && lk !== (x.rvn || 0)) prvLook(x, lk); q.se = null;
      ren = inB && prvRenamed(p, x);
      if (inB) x.lg.push({ ts: now, k: 'ren', was: was, now: t, b: ren ? 1 : 0 });
      return prvDone(p, snap, 'You edited a Scope item', x7Warn(p, id) || (ren ? 'Renamed. In the baseline it was “' + prvT(pv.base.t[x.id], 40) + '”, so Drift counts it as new work.' : inB ? 'Renamed. It is still the same item, so Drift is unchanged.' : 'Item updated'), '[data-it="' + id + '"] [data-pd="prv:sedit"]');
    }
    var dup = prvNever(p, t);
    if (dup) return prvErr(f, 't', 'Already in Never: “' + prvT(dup.t, 50) + '”.');
    x = prvMk('out', t, w, now);
    pv.items.push(x); q.sa = null;
    prvLogScope(p, x, 'out', 'Ruled out directly. Reason: ' + w);
    prvDone(p, snap, 'You ruled something out', 'Ruled out. It keeps its reason and will not come back unasked.', '[data-pd="prv:sadd"][data-sec="out"]', '[data-it="' + x.id + '"]');
  }
  function prvSubmitTake(f) {
    var p = pd.p, pv = p.pv, x = prvById(pv.items, f.getAttribute('data-id')), to = f.querySelector('input[name="to"]:checked').value, w = prvText(f.elements.w.value), snap, now = Date.now(), fr;
    if (!x) return;
    if (to === 'out' && !w) return prvErr(f, 'w', 'Say why it is never. A Never without a reason gets argued again.');
    snap = prvSnap(p); pd.pv.st = null; fr = x.sec;
    if (to === 'next') {
      prvMove(p, x, 'next', w);
      return prvDone(p, snap, 'You moved an item to Next', '“' + x.t + '” moved to Next. Cutting is not counted as drift.', '[data-pd="prv:gate"]', '[data-it="' + x.id + '"]');
    }
    if (to === 'out') {
      x.nwhy = ''; x.why = w; prvMove(p, x, 'out', w);
      prvLogScope(p, x, 'out', 'Moved from ' + PRV_BN[fr] + ' to Never. Reason: ' + w);
      return prvDone(p, snap, 'You moved an item to Never', '“' + x.t + '” is now Never. It keeps its reason.', '[data-pd="prv:gate"]', '[data-it="' + x.id + '"]');
    }
    prvMove(p, x, 'inbox', w);
    pv.park.unshift({ id: prvId('k'), t: x.t, d: x.why || w, tag: '', st: 'parked', ts: now, kept: 0, kc: 0, why: '', xts: 0, job: '', size: x.size, to: '', iid: x.id, lg: [{ ts: now, k: 'park', from: true }] });
    prvDone(p, snap, 'You moved an item back to the Parking Lot', '“' + x.t + '” is back in the Parking Lot. Restoring it from the baseline list will not duplicate it.', '[data-pd="prv:gate"]');
  }
  function prvCapture(p, t, tag, nv) {
    var pv = p.pv, q = pd.pv, now = Date.now(), snap = prvSnap(p), idea = prvIdea(t, '', tag, 0);
    idea.ts = now; idea.lg[0].ts = now;
    if (nv) { idea.sim = nv.id; nv.rs = (nv.rs || 0) + 1; nv.rsl = now; nv.lg.push({ ts: now, k: 'again', why: '' }); }
    pv.park.unshift(idea); q.sim = null;
    prvDone(p, snap, 'You parked an idea', nv ? 'Parked. It looks like “' + prvT(nv.t, 36) + '”, which you ruled out. That one has come up again ' + prvTimes(nv.rs) + '.' : 'Parked. It is not in Now until it passes the Gate.', '#prv-qa', '[data-k="' + idea.id + '"]');
  }
  function prvSubmitPark(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, raw = prvText(f.elements.t.value), tag = '', t;
    t = prvText(raw.replace(/(^|\s)#([^\s#]{1,24})/g, function (m, sp, g) { var c = g.toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, ''); if (!tag && c) tag = c; return ' '; }));
    q.sim = null;
    if (t.length < 2) return prvErr(f, 't', 'Write a few words for the idea.');
    var twin = pv.items.filter(function (z) { return (z.sec === 'in' || z.sec === 'next') && prvSame(z.t, t); })[0];
    if (twin) return prvErr(f, 't', 'Already in ' + PRV_BN[twin.sec] + ': “' + prvT(twin.t, 40) + '”.');
    var wait = pv.park.filter(function (k) { return k.st === 'parked' && prvSame(k.t, t); })[0];
    if (wait) return prvErr(f, 't', 'Already in the Parking Lot: “' + prvT(wait.t, 40) + '”.');
    var nv = prvNever(p, t);
    /* something like this was ruled out. Ask before it comes back, and count that it did */
    if (nv) { q.sim = { t: t, tag: tag, id: nv.id }; return pdRerender('[data-pd="prv:simk"]'); }
    prvCapture(p, t, tag, null);
  }
  function prvSubmitDrop(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, x = prvById(pv.park, f.getAttribute('data-id')), w = prvText(f.elements.w.value), snap;
    if (!x) return;
    if (w.length < 4) return prvErr(f, 'w', 'Say why. A Never without a reason gets argued again.');
    var dup = prvNever(p, x.t);
    if (dup) return prvErr(f, 'w', 'It matches “' + prvT(dup.t, 40) + '”, which is already in Never.');
    snap = prvSnap(p); q.drp = null;
    var it = prvIdeaToItem(p, x, 'out', w); it.why = w;
    prvLogScope(p, it, 'out', 'Ruled out from the Parking Lot. Reason: ' + w);
    prvDone(p, snap, 'You ruled out an idea', '“' + it.t + '” moved to Never. It keeps its reason.', '#prv-qa');
  }
  function prvSubmitRel(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, r = pv.rel, b = pv.base, n = prvText(f.elements.n.value), s = prvText(f.elements.s.value), d = f.elements.d.value, c = parseInt(f.elements.c.value, 10), w = f.elements.w ? prvText(f.elements.w.value) : '', snap, now = Date.now(), prev;
    if (!n) return prvErr(f, 'n', 'Give the release a short name, like v1.');
    if (n.toLowerCase() !== (r.name || '').toLowerCase() && pv.ships.some(function (e) { return e.name.toLowerCase() === n.toLowerCase(); })) return prvErr(f, 'n', n + ' has already shipped. Give this release another name.');
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return prvErr(f, 'd', 'Pick a date, or clear the field.');
    if (d && d !== (r.date || '') && d < prvIso(now)) return prvErr(f, 'd', 'Pick today or a later date.');
    if (f.elements.c.value && (isNaN(c) || c < 0 || c > 365)) return prvErr(f, 'c', 'Capacity is a number of days, up to 365.');
    c = isNaN(c) ? 0 : c;
    var szd = {}, szBad = '';
    PRV_SZ.forEach(function (z) { var el = f.elements['sz' + z[0]], v = el ? parseInt(el.value, 10) : prvSzD(p, z[0]); if (isNaN(v) || v < 1 || v > 60) szBad = szBad || 'sz' + z[0]; szd[z[0]] = v; });
    if (szBad) return prvErr(f, szBad, 'Each size is a whole number of days, from 1 to 60.');
    if (!(szd.S <= szd.M && szd.M <= szd.L)) return prvErr(f, 'szM', 'Keep S no bigger than M, and M no bigger than L.');
    var szSame = szd.S === prvSzD(p, 'S') && szd.M === prvSzD(p, 'M') && szd.L === prvSzD(p, 'L');
    var was = prvRelOn(p);
    if (n === r.name && s === r.ship && d === (r.date || '') && c === (r.cap || 0) && szSame && was) { q.re = null; return pdRerender(q.back); }
    /* the open release is the same release whatever it is called: a new name keeps its date rules and its one extension */
    var later = !!r.date && (!d || d > r.date), more = (!c && r.cap > 0) || c > (r.cap || 0) || PRV_SZ.some(function (z) { return szd[z[0]] < prvSzD(p, z[0]); }), grow = !!b && (later || more);
    if (later && r.ext) return prvErr(f, 'd', r.name + ' already used its one extension. Cut to fit, or ship what is done.');
    if (later && prvLate(p)) return prvErr(f, 'd', r.name + ' is past its date. Use Extend once, so the slip is on record.');
    /* after the baseline, more room is a decision: it needs a reason, and a later date is the release's one extension */
    if (grow && w.length < 6) return prvErr(f, 'w', later ? 'A later date after the baseline is this release’s one extension. Say why it slips.' : 'Say why this release gets more room. It goes in Activity.');
    snap = prvSnap(p); prev = { name: r.name, ship: r.ship, date: r.date, cap: r.cap };
    pv.rel = { name: n, ship: s, date: d, cap: c, on: 1 }; if (r.ext || (b && later)) pv.rel.ext = 1; q.re = null;   /* v97 (43): saved once, the project plans releases */
    if (szd.S === PRV_SIZE.S && szd.M === PRV_SIZE.M && szd.L === PRV_SIZE.L) delete pv.szd; else pv.szd = szd;
    var le = { ts: now, name: n, ship: s, date: d, cap: c, prev: !pv.rl.length && !r.ship && !r.cap && !r.date ? null : prev };
    if (grow) le.why = w; if (b && later) le.ext = 1; if (!szSame) le.szd = szd;
    pv.rl.push(le);
    prvDone(p, snap, szSame ? 'You updated the release' : 'You changed what S, M and L cost: ' + szd.S + ', ' + szd.M + ' and ' + szd.L + ' days', b && later ? 'Release saved. That was the one extension of ' + n + '.' : c ? 'Release saved. Now has ' + prvDay(c) + '.' : 'Release saved', '[data-pd="prv:rel"]');
  }
  function prvSubmitRebase(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, w = prvText(f.elements.w.value), d = prvDrift(p), snap, now = Date.now();
    if (!prvMoved(p)) { q.rb = null; return pdRerender(q.back); }
    if (w.length < 6) return prvErr(f, 'w', 'Say why you accept this drift. It goes in History.');
    snap = prvSnap(p); q.rb = null;
    var ids = prvBucket(p, 'in').map(function (i) { return i.id; });
    pv.base = prvBaseNow(p, now); pv.bls.push({ ts: now, n: ids.length, ov: d.ov, why: w });
    prvDone(p, snap, 'You set a new baseline', 'New baseline set' + (d.ov ? ', accepting ' + d.ov + (d.ov === 1 ? ' override' : ' overrides') : '') + '. Drift starts again from zero.', '[data-pd="prv:rebase"]');
  }
  function prvSubmitShip(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, r = pv.rel, now = Date.now(), ins = prvBucket(p, 'in'), done = ins.filter(function (x) { return x.st === 'done'; }), left = ins.filter(function (x) { return x.st !== 'done'; });
    var nm = f.elements.n ? prvText(f.elements.n.value) : '', met = f.querySelector('input[name="met"]:checked'), sum = f.elements.m ? prvText(f.elements.m.value) : '', plan = [], snap, ld = prvLoad(p), dr = prvDrift(p), i, x, to, w, ship, sid, carry = 0, cut = 0;
    if (!done.length) return prvErr(f, '', 'Nothing in Now is marked done.');
    if (r.ship && !met) return prvErr(f, '', 'Say whether ' + r.name + ' delivered what you wrote.');
    for (i = 0; i < left.length; i++) {
      x = left[i]; to = f.querySelector('input[name="u-' + x.id + '"]:checked'); to = to ? to.value : 'next'; w = prvText(f.elements['r-' + x.id].value);
      if (to === 'out' && w.length < 4) return prvErr(f, 'r-' + x.id, 'Say why “' + prvT(x.t, 30) + '” is cut. A Never without a reason gets argued again.');
      plan.push([x, to, w]);
    }
    if (!nm) return prvErr(f, 'n', 'Give the next release a short name, like v2.');
    if (nm.toLowerCase() === (r.name || '').toLowerCase() || pv.ships.some(function (s) { return s.name.toLowerCase() === nm.toLowerCase(); })) return prvErr(f, 'n', 'That name is taken. Try ' + prvNextName(p) + '.');
    snap = prvSnap(p); sid = prvId('s');
    done.forEach(function (d) { prvMove(p, d, 'shipped', '', { sh: 1, rid: sid }); d.rid = sid; });
    plan.forEach(function (c) {
      x = c[0];
      if (c[1] === 'out') { cut++; x.nwhy = ''; prvMove(p, x, 'out', c[2], { sh: 1, rid: sid }); x.why = c[2]; prvLogScope(p, x, 'out', 'Cut when ' + r.name + ' shipped. Reason: ' + c[2]); }
      else { carry++; prvMove(p, x, 'next', 'Not done when ' + r.name + ' shipped', { sh: 1, rid: sid }); }
    });
    var start = pv.base ? pv.base.ts : ((pv.rl.filter(function (e) { return e.name === r.name; })[0] || {}).ts || now), took = Math.max(1, Math.round((now - start) / PRV_DAY)), planD = r.date ? Math.max(1, Math.round((new Date(r.date + 'T12:00:00').getTime() - new Date(new Date(start).toDateString() + ' 12:00').getTime()) / PRV_DAY)) : 0;
    ship = { id: sid, ts: now, name: r.name, ship: r.ship, date: r.date, cap: r.cap, planned: ld.days, done: done.length, carried: carry, cut: cut, met: met ? met.value : '', sum: sum, ids: done.map(function (d) { return d.id; }), add: dr.add.length, ov: dr.ov, dd: pv.base ? dr.ad : null, dp: pv.base ? dr.pct : null, start: start, took: took, planD: planD, ext: r.ext || 0 };
    pv.ships.push(ship);
    pv.rel = { name: nm, ship: '', date: '', cap: r.cap || 0 };
    pv.rl.push({ ts: now, name: nm, ship: '', date: '', cap: r.cap || 0, prev: null, sh: sid });
    pv.base = null; q.sh = null;
    prvDone(p, snap, 'You shipped ' + ship.name, 'Shipped ' + ship.name + ': ' + done.length + ' done' + (carry ? ', ' + carry + ' carried to Next' : '') + (cut ? ', ' + cut + ' cut' : '') + '. Took ' + prvDay(took) + (planD ? ' for ' + planD + ' planned' : '') + '. ' + nm + ' is open.', '[data-pd="prv:rel"]');
  }
  function prvSubmitPrinc(f) {
    var p = pd.p, pv = p.pv, t = prvText(f.elements.t.value), cur = prvPrinc(p), snap;
    if (t.length < 4) return prvErr(f, 't', 'Write it as a rule you will keep, in a few words.');
    if (cur.length >= PRV_PMAX) return prvErr(f, 't', 'Seven is the limit. Retire one first.');
    if (cur.some(function (x) { return x.t.toLowerCase() === t.toLowerCase(); })) return prvErr(f, 't', 'That principle is already written.');
    snap = prvSnap(p); pv.princ.push({ id: prvId('p'), t: t, ts: Date.now(), rm: 0 });
    prvDone(p, snap, 'You wrote a principle', 'Principle added. The Gate checks it from now on.', '#prv-pa');
  }
  /* new words for a principle: its id stays (the Gate's past calls keep the words they quoted), the old words go in x.ed for Activity */
  function prvSubmitPrincEdit(f) {
    var p = pd.p, q = pd.pv, x = prvById(p.pv.princ, f.getAttribute('data-id')), t = prvText(f.elements.t.value), snap;
    if (!x || x.rm) return;
    if (t.length < 4) return prvErr(f, 't', 'Write it as a rule you will keep, in a few words.');
    if (t === x.t) { prvReset(); return pdRerender(q.back); }
    if (prvPrinc(p).some(function (o) { return o !== x && o.t.toLowerCase() === t.toLowerCase(); })) return prvErr(f, 't', 'That principle is already written.');
    snap = prvSnap(p); prvReset();
    (x.ed = x.ed || []).push({ ts: Date.now(), b: x.t, a: t }); x.t = t;
    prvDone(p, snap, 'You reworded a principle', 'Principle reworded. The Gate checks the new words.', '[data-pd="prv:pe"][data-id="' + x.id + '"]');
  }
  function prvSubmitPrincRetire(f) {
    var p = pd.p, x = prvById(p.pv.princ, f.getAttribute('data-id')), w = prvText(f.elements.w.value), snap;
    if (!x || x.rm) return;
    if (prvPrinc(p).length <= PRV_PMIN) return prvErr(f, 'w', 'Keep at least ' + PRV_PMIN + '. Add one first, or reword this one.');
    if (w.length < 6) return prvErr(f, 'w', 'Say why it no longer holds. It goes in Activity.');
    snap = prvSnap(p); prvReset();
    x.rm = Date.now(); x.rmw = w;
    prvDone(p, snap, 'You retired a principle', 'Principle retired. The Gate no longer checks it.', '#prv-pa');
  }
  function prvSubmitIdea(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, x = prvById(pv.park, f.getAttribute('data-id')), t = prvText(f.elements.t.value), d = prvText(f.elements.d.value), snap;
    if (!x) return;
    if (t.length < 2) return prvErr(f, 't', 'Write a few words for the idea.');
    if (x.t === t && x.d === d) { q.pke = null; return pdRerender(q.back); }
    snap = prvSnap(p); q.pke = null; x.t = t; x.d = d;
    prvDone(p, snap, 'You edited a parked idea', 'Idea updated', '[data-k="' + x.id + '"] [data-pd="prv:pke"]');
  }
  function prvVMsg(p, msg) {
    var v = prvVerdict(p), vd = p.pv.vd;
    return vd && v.k !== vd.k && v.dec ? msg.replace(/\.$/, '') + '. Verdict: ' + PRV_VK[v.k][0] + '.' : msg;
  }
  function prvLines(v) { return String(v || '').split(/\r?\n/).map(prvText).filter(Boolean).slice(0, 6).map(function (s) { return s.slice(0, 80); }); }
  function prvSubmitJob(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, id = f.getAttribute('data-id'), t = prvText(f.elements.t.value), snap, x, now = Date.now();
    if (t.length < 4) return prvErr(f, 't', 'Describe the job in a few words: what is the customer trying to get done?');
    if (pv.jobs.some(function (j) { return j.id !== id && j.t.toLowerCase() === t.toLowerCase(); })) return prvErr(f, 't', 'That job is already on the map.');
    if (id) {
      x = prvById(pv.jobs, id); if (!x) return;
      if (x.t === t) { q.je = null; return pdRerender('.prv-jb[data-id="' + id + '"]'); }
      snap = prvSnap(p); x.t = t; q.je = null;
      return prvDone(p, snap, 'You renamed a job', 'Job renamed', '.prv-jb[data-id="' + id + '"]');
    }
    snap = prvSnap(p); x = { id: prvId('j'), t: t, ts: now, dem: [], items: [] }; pv.jobs.push(x); q.je = null; q.jx = x.id; q.jan = x.id;
    prvDone(p, snap, 'You added a job', prvVMsg(p, 'Job added. Say who needs it and who already covers it.'), '#prv-ex-' + x.id, '.prv-gm-j[data-j="' + x.id + '"] .prv-gm-r');
    q.jan = null;
  }
  function prvSubmitEv(f) {
    var p = pd.p, pv = p.pv, j = prvById(pv.jobs, f.getAttribute('data-id')), k = f.elements.k.value, x = prvText(f.elements.x.value), s = +f.elements.s.value || 0, snap;
    if (!j) return;
    if (x.length < 4) return prvErr(f, 'x', 'Say what you found, in a few words.');
    snap = prvSnap(p); j.dem.push({ id: prvId('e'), k: k, x: x, src: s });
    prvDone(p, snap, 'You added a demand note', (k === 'paid' || k === 'workaround') && !s ? 'Note added. Without a source it does not count as proof.' : prvVMsg(p, 'Note added'), '#prv-ex-' + j.id);
  }
  function prvSubmitJdet(f) {
    var p = pd.p, pv = p.pv, j = prvById(pv.jobs, f.getAttribute('data-id')), snap;
    if (!j) return;
    snap = prvSnap(p);
    pv.comps.forEach(function (c) {
      var r = f.querySelector('input[name="l-' + c.id + '"]:checked'), l = r ? r.value : '', se = f.elements['s-' + c.id], s = se ? +se.value || 0 : 0;
      if (!l) delete c.cov[j.id]; else c.cov[j.id] = { l: l, s: s };
    });
    var chk = [].map.call(f.querySelectorAll('input[name="it"]:checked'), function (el) { return el.value; });
    var keep = j.items.filter(function (id) { var it = prvById(pv.items, id); return it && (it.sec !== 'in' && it.sec !== 'next' || chk.indexOf(id) > -1); });
    chk.forEach(function (id) { if (keep.indexOf(id) < 0) keep.push(id); });
    j.items = keep;
    if (prvSnap(p) === snap) return prvErr(f, '', 'Nothing has changed.');
    prvDone(p, snap, 'You updated the coverage of a job', prvVMsg(p, 'Coverage saved'), '.prv-jb[data-id="' + j.id + '"]', '.prv-gm-j[data-j="' + j.id + '"] .prv-gm-r');
  }
  function prvSubmitWedge(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, t = prvText(f.elements.t.value), j = f.elements.j.value, snap;
    if (t && t.length < 8) return prvErr(f, 't', 'Say it in a full sentence, or clear the field to remove the wedge.');
    if (t === pv.wedge.t && j === (pv.wedge.job || '')) { q.we = null; return pdRerender(q.back); }
    snap = prvSnap(p); q.we = null; pv.wedge = { t: t, job: t ? j : '' };
    prvDone(p, snap, t ? 'You wrote the wedge' : 'You cleared the wedge', t ? prvVMsg(p, 'Wedge saved') : 'Wedge cleared', '[data-pd="prv:wedit"]');
  }
  function prvSubmitAsm(f) {
    var p = pd.p, pv = p.pv, k = f.getAttribute('data-k'), list = pv.asm[k], t = prvText(f.elements.t.value), snap;
    if (!list) return;
    if (t.length < 3) return prvErr(f, 't', 'Write a few words.');
    if (t.length > PRV_ASM_MAX) return prvErr(f, 't', 'At most ' + PRV_ASM_MAX + ' characters: this one has ' + t.length + '. Make it shorter.');   /* v121 (89) */
    if (list.length >= (k === 'q' ? 12 : 6)) return prvErr(f, 't', k === 'q' ? 'Twelve is plenty. Answer or remove one first.' : 'Six is plenty. Remove one first.');
    if (list.some(function (x) { return x.t.toLowerCase() === t.toLowerCase(); })) return prvErr(f, 't', 'That is already listed.');
    snap = prvSnap(p); list.push({ id: prvId('w'), t: t });
    prvDone(p, snap, k === 'q' ? 'You added an open question: ' + t : 'You edited your wedge and risks', 'Added', '#prv-a-' + k);
  }
  function prvSubmitComp(f) {
    var p = pd.p, pv = p.pv, q = pd.pv, id = f.getAttribute('data-id'), n = prvText(f.elements.n.value), s = prvChecked(f, 's'), snap, x, now = Date.now();
    if (n.length < 2) return prvErr(f, 'n', 'Give the competitor a name.');
    if (pv.comps.some(function (c) { return c.id !== id && c.n.toLowerCase() === n.toLowerCase(); })) return prvErr(f, 'n', 'You already track ' + n + '.');
    snap = prvSnap(p); q.ke = null; q.kpre = null;
    var o = { n: n, pos: prvText(f.elements.pos.value), price: f.elements.price.value, sub: f.elements.sub.checked, clone: f.elements.clone.checked, dead: f.elements.dead.checked, died: prvText(f.elements.died.value), str: prvLines(f.elements.str.value), weak: prvLines(f.elements.weak.value), src: s };
    if (id) { x = prvById(pv.comps, id); if (!x) return; for (var k in o) x[k] = o[k]; }
    else { o.id = prvId('m'); o.ts = now; o.cov = {}; o.chk = 0; x = o; pv.comps.push(x); }
    prvDone(p, snap, id ? 'You edited a competitor' : 'You started tracking a competitor', prvVMsg(p, id ? n + ' updated' : 'Tracking ' + n), '[data-pd="prv:knew"]', '[data-m="' + x.id + '"]');
  }
  function prvSubmitOpt(f) {
    var p = pd.p, d = prvDecSelected(p), t = prvText(f.elements.o.value), snap;
    if (!d || d.st !== 'open') return;
    if (t.length < 2) return prvErr(f, 'o', 'Write the option.');
    if (d.opts.length >= 6) return prvErr(f, 'o', 'Six options is plenty. Remove one first.');
    if (d.opts.some(function (o) { return o.t.toLowerCase() === t.toLowerCase(); })) return prvErr(f, 'o', 'That option is already listed.');
    snap = prvSnap(p); d.opts.push(prvOpt(t));
    prvDone(p, snap, 'You added an option to a decision', 'Option added', '#prv-oa');
  }
  function prvSubmitRecord(f) {
    var p = pd.p, pv = p.pv, d = prvDecSelected(p), snap, now = Date.now(), b = prvText(f.elements.b.value), ci = -1, choice = '';
    if (!d || d.st !== 'open') return;
    if (d.opts.length) { var r = f.querySelector('input[name="c"]:checked'); if (!r) return prvErr(f, '', 'Pick the option you chose.'); ci = +r.value; }
    else { choice = prvText(f.elements.choice.value); if (choice.length < 2) return prvErr(f, 'choice', 'Say what you chose.'); }
    if (b.length < 8) return prvErr(f, 'b', 'Write why you chose it. A decision without a reason cannot be recorded.');
    snap = prvSnap(p);
    if (d.opts.length) d.opts.forEach(function (o, i) { var w = f.elements['n' + i] ? prvText(f.elements['n' + i].value) : ''; o.c = i === ci; if (i !== ci && w) o.why = w; });
    else d.opts = [prvOpt(choice, true)];
    d.st = 'decided'; d.dts = now; d.because = b; d.ev = prvChecked(f, 'ev'); d.rv = prvText(f.elements.rv.value); d.au = 'You';   /* v98 (46): who recorded it */
    var old = d.rep && prvById(pv.dec, d.rep);
    if (old && old.st === 'decided') { old.st = 'superseded'; old.sts = now; old.by = d.id; old.su = 'You'; }
    prvDone(p, snap, 'You recorded a decision', old ? 'Decision recorded. “' + old.t + '” is now superseded.' : 'Decision recorded', '.pd-cr[data-id="' + d.id + '"]');
  }
  function prvChange(t) {
    var p = pd.p, kind = t.getAttribute('data-prv'), id = t.getAttribute('data-id'), x, snap, label;
    if (kind === 'ijob') {
      x = prvById(p.pv.park, id); if (!x || x.job === t.value) return;
      snap = prvSnap(p); x.job = t.value;
      return prvDone(p, snap, 'You linked an idea to a job', t.value ? 'Job saved. The Gate starts from it.' : 'Job cleared', '[data-k="' + x.id + '"] select');
    }
  }

  /* drawer: add a market source */
  var msForm = document.getElementById('msrc'), msT = document.getElementById('msrc-t'), msU = document.getElementById('msrc-u'), msX = document.getElementById('msrc-x'), msC = document.getElementById('msrc-c'), msFpv = document.getElementById('msrc-fpv'), msGo = document.getElementById('msrc-go'), msCnt = document.getElementById('msrc-cnt');
  var ms = { hex: '', gen: 0, tm: 0 };
  function msOnOpen() {
    var p = pd.p, pv = p.pv, o = '<option value="">Nothing yet</option>', ev = [], cv = [], cp = pv.comps.filter(function (c) { return !c.src.length; });
    pv.jobs.forEach(function (j) {
      j.dem.forEach(function (e) { if (!e.src) ev.push('<option value="e:' + j.id + ':' + e.id + '">' + esc(prvT(j.t, 24) + ' · ' + PRV_DEM[e.k] + ': ' + prvT(e.x, 30)) + '</option>'); });
      pv.comps.forEach(function (c) { var v = c.cov[j.id]; if (v && !v.s) cv.push('<option value="v:' + c.id + ':' + j.id + '">' + esc(c.n + ' · ' + prvT(j.t, 32) + ' (' + PRV_LV[v.l] + ')') + '</option>'); });
    });
    msForm.reset(); ms.gen++; ms.hex = ''; clearTimeout(ms.tm); msGo.disabled = true; msCnt.textContent = '0 / 4000';
    if (ev.length) o += '<optgroup label="Demand notes without a source">' + ev.slice(0, 40).join('') + '</optgroup>';
    if (cv.length) o += '<optgroup label="Ratings without a source">' + cv.slice(0, 40).join('') + '</optgroup>';
    if (cp.length) o += '<optgroup label="Competitors without a source">' + cp.map(function (c) { return '<option value="m:' + c.id + '">' + esc(c.n) + '</option>'; }).join('') + '</optgroup>';
    msC.innerHTML = o;
    ['f-msrc-t', 'f-msrc-u'].forEach(function (i) { document.getElementById(i).removeAttribute('data-err'); });
    pdeFpv(msFpv, 'idle', '', 'Give the source a title. The SHA-256 of what you save appears here.');
    return '#msrc-t';
  }
  function msBody() { return msT.value.trim() + '\n' + msU.value.trim() + '\n' + msX.value; }
  function msHash() {
    var gen = ++ms.gen; ms.hex = ''; msGo.disabled = true;
    if (msT.value.trim().length < 2) return pdeFpv(msFpv, 'idle', '', 'Give the source a title. The SHA-256 of what you save appears here.');
    pdeFpv(msFpv, 'busy', '', 'Computing SHA-256…');
    pdeShaText(msBody(), function (hex) { if (gen !== ms.gen) return; ms.hex = hex; pdeFpv(msFpv, 'ok', hex, 'SHA-256 of the title, link and text you saved. Change one character and it changes.'); msGo.disabled = false; },
      function () { if (gen === ms.gen) pdeFpv(msFpv, 'err', '', 'This browser could not compute the fingerprint here.'); });
  }
  function msKick() { ms.gen++; ms.hex = ''; msGo.disabled = true; clearTimeout(ms.tm); ms.tm = setTimeout(msHash, 220); }
  msT.addEventListener('input', function () { document.getElementById('f-msrc-t').removeAttribute('data-err'); msKick(); });
  msU.addEventListener('input', function () { document.getElementById('f-msrc-u').removeAttribute('data-err'); msKick(); });
  msX.addEventListener('input', function () { msCnt.textContent = msX.value.length + ' / 4000'; msKick(); });
  function msSubmit() {
    if (msGo.disabled || !ms.hex) return;
    var p = pd.p, pv = p.pv, t = prvText(msT.value), u = msU.value.trim(), host = 'Your notes', now = Date.now();
    if (t.length < 2) { document.getElementById('e-msrc-t').textContent = 'Give the source a short title.'; document.getElementById('f-msrc-t').setAttribute('data-err', ''); msT.focus(); return; }
    if (u) {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
      var ok = false; try { var uo = new URL(u); if (/^https?:$/.test(uo.protocol) && uo.hostname.indexOf('.') > 0) { u = uo.href; host = uo.hostname.replace(/^www\./, ''); ok = true; } } catch (e) {}
      if (!ok) { document.getElementById('e-msrc-u').textContent = 'Enter a full link, like https://example.com/page, or leave it empty.'; document.getElementById('f-msrc-u').setAttribute('data-err', ''); msU.focus(); return; }
    }
    var snap = prvSnap(p), n = pv.sn++, s = { n: n, t: t, u: u, host: host, txt: msX.value.trim(), ts: now, fp: ms.hex, sample: false, ai: false, ver: true }, ip = prvText((document.getElementById('msrc-i') || {}).value || '');
    if (ip) s.ip = ip.slice(0, 600);   /* v100 (54, spec PP-06): what the person takes from it, apart from what it says */
    pv.src.push(s);
    var cite = msC.value, tgt = '';
    if (cite) {
      var pa = cite.split(':'), jb, cm, en;
      if (pa[0] === 'e') { jb = prvById(pv.jobs, pa[1]); en = jb && prvById(jb.dem, pa[2]); if (en && !en.src) { en.src = n; tgt = 'a demand note'; } }
      else if (pa[0] === 'v') { cm = prvById(pv.comps, pa[1]); if (cm && cm.cov[pa[2]] && !cm.cov[pa[2]].s) { cm.cov[pa[2]].s = n; tgt = cm.n; } }
      else if (pa[0] === 'm') { cm = prvById(pv.comps, pa[1]); if (cm && cm.src.indexOf(n) < 0) { cm.src.push(n); tgt = cm.n; } }
    }
    closeDrawer(true);
    if (pd.tab !== prvSrcTab(p)) pdSelect(prvSrcTab(p));
    prvDone(p, snap, pdMode(p) === 'internal' ? 'You added a source' : 'You added a market source', 'Source [' + n + '] added' + (tgt ? ' and cited in ' + tgt : '') + '. ScopeDue keeps the snapshot and fingerprint.', '[data-pd="prv:srcadd"]', '.prv-src[data-n="' + n + '"]');
  }
  msForm.addEventListener('submit', function (e) { e.preventDefault(); msSubmit(); });
  msForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); msSubmit(); } });

  /* drawer: new decision */
  var ndForm = document.getElementById('ndec'), ndTy = document.getElementById('ndec-ty'), ndT = document.getElementById('ndec-t'), ndO = document.getElementById('ndec-o'), ndGo = document.getElementById('ndec-go'), ndRep = document.getElementById('ndec-rep'), nd = { rep: '', ev: [] };
  function ndecOnOpen() {
    var p = pd.p, old = pd.pv.repId && prvById(p.pv.dec, pd.pv.repId);
    var pre = !old && pd.pv.preset; pd.pv.preset = null;
    ndForm.reset(); ndTy.value = old && old.typ !== 'scope' ? old.typ : pre && pre.typ ? pre.typ : 'product'; nd.rep = old ? old.id : ''; nd.ev = pre ? pre.ev.slice() : []; pd.pv.repId = '';
    document.getElementById('f-ndec-t').removeAttribute('data-err'); document.getElementById('f-ndec-o').removeAttribute('data-err');
    ndRep.hidden = !old;
    if (old) { document.getElementById('ndec-rep-t').textContent = old.t; ndO.value = old.opts.map(function (o) { return o.t; }).join('\n'); }
    document.getElementById('ndec-title').textContent = old ? 'Replace a decision' : 'New decision';
    document.getElementById('ndec-sub').textContent = old ? 'The old record stays exactly as it is. It becomes Superseded once you record this one.' : 'State what has to be decided. Record the choice and the reason when you are ready.';
    if (pre) { ndT.value = pre.t; ndO.value = pre.o.join('\n'); document.getElementById('ndec-sub').textContent = 'Filled in from your Validate evidence. Edit it, then open the decision.'; }
    ndGo.textContent = old ? 'Open replacement' : 'Open decision';
    return '#ndec-t';
  }
  function ndecSubmit() {
    var p = pd.p, pv = p.pv, t = prvText(ndT.value), lines = ndO.value.split(/\r?\n/).map(prvText).filter(Boolean), seen = {}, opts = [], snap, now = Date.now();
    if (t.length < 3) { document.getElementById('e-ndec-t').textContent = 'Write the question in a few words.'; document.getElementById('f-ndec-t').setAttribute('data-err', ''); ndT.focus(); return; }
    lines.forEach(function (l) { var k = l.toLowerCase(); if (!seen[k]) { seen[k] = 1; opts.push(prvOpt(l.slice(0, 80))); } });
    if (opts.length > 6) { document.getElementById('e-ndec-o').textContent = 'Six options is plenty. Remove ' + (opts.length - 6) + '.'; document.getElementById('f-ndec-o').setAttribute('data-err', ''); ndO.focus(); return; }
    snap = prvSnap(p);
    var d = prvDec(t, 'open', 0, { opts: opts, rep: nd.rep, typ: ndTy.value }); d.ots = now; d.ev = nd.ev.slice(); nd.ev = []; pv.dec.push(d); pd.pv.ds = d.id;
    closeDrawer(true);
    if (pd.tab !== 'decisions') pdSelect('decisions');
    prvDone(p, snap, 'You opened a decision', 'Decision opened. Record the choice and why when you are ready.', '#prv-rb');
  }
  ndForm.addEventListener('submit', function (e) { e.preventDefault(); ndecSubmit(); });
  ndForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); ndecSubmit(); } });
  ndT.addEventListener('input', function () { document.getElementById('f-ndec-t').removeAttribute('data-err'); });
  ndO.addEventListener('input', function () { document.getElementById('f-ndec-o').removeAttribute('data-err'); });

  /* drawer: the Scope Gate. Four questions, a verdict worked out here, and a decision written for you */
  var gForm = document.getElementById('gate'), gBody = document.getElementById('gate-body'), gGo = document.getElementById('gate-go'), gSub = document.getElementById('gate-sub');
  var gt = { mode: 'add', iid: '', kid: '', ovr: false, a: null, vs: '', ss: '' };
  var GT_NUM = ['No', 'One', 'Two', 'Three', 'Four'];
  function gateAsked(p) { return (prvJobs(p).length ? 1 : 0) + 2 + (prvPrinc(p).length ? 1 : 0); }
  var GT_VERB = { add: 'Add to ', promote: 'Promote to ', bring: 'Bring into ', pull: 'Pull into ' };
  var GT_SUB = {
    add: '{n} questions decide whether this goes to Now, Next or Never.',
    promote: '{n} questions decide where this idea goes: Now, Next or Never.',
    bring: 'Never has a memory. Say what has changed, then answer the questions again.',
    pull: 'Next to Now. The Gate asks again, because Now has a budget.'
  };
  function gateOpen(mode, id, trigger) {
    var p = pd.p, pv = p.pv, a = { t: '', w: '', chg: '', job: '', ship: '', size: '', viol: '', swap: '', bk: '', ow: '', lk: '', any: '', th: '' }, x, j;
    gt.mode = mode; gt.iid = ''; gt.kid = ''; gt.ovr = false; gt.vs = ''; gt.ss = ''; gt.ls = ''; gt.ds = null;
    if (mode === 'promote') { x = prvById(pv.park, id); if (!x || x.st !== 'parked') return; gt.kid = id; gt.iid = x.iid || ''; a.t = x.t; a.size = x.size; a.job = x.job; }
    else if (mode === 'bring' || mode === 'pull') {
      x = prvById(pv.items, id); if (!x || x.sec !== (mode === 'bring' ? 'out' : 'next')) return;
      gt.iid = id; a.t = x.t; a.size = x.size; j = prvJobOf(p, x); a.job = j ? j.id : x.nj ? 'none' : '';
    } else if (mode !== 'add') return;
    if (a.job && a.job !== 'none' && !prvById(pv.jobs, a.job)) a.job = '';
    gt.a = a; openDrawer('gate', trigger);
  }
  function gateOnOpen() {
    var p = pd.p, a = gt.a, hasJobs = prvJobs(p).length > 0, hasPr = prvPrinc(p).length > 0, x = gt.iid && prvById(p.pv.items, gt.iid);
    gateRender();
    gSub.textContent = (gt.mode === 'promote' ? 'Promoting “' + prvT(a.t, 50) + '”. ' + GT_SUB.promote : GT_SUB[gt.mode]).replace('{n}', GT_NUM[gateAsked(p)]);
    document.getElementById('gate-title').textContent = gt.mode === 'bring' ? 'Bring back from Never' : 'Scope Gate';
    gateUpdate();
    if (gt.mode === 'add') return '#gate-t';
    if (gt.mode === 'bring') return '#gate-c';
    return hasJobs && !a.job ? 'input[name="job"]' : !a.ship ? 'input[name="ship"]' : !a.size ? 'input[name="size"]' : hasPr && !a.viol ? 'input[name="viol"]' : '#gate-go';
  }
  function gateRender() {
    var p = pd.p, pv = p.pv, a = gt.a, mode = gt.mode, hasJobs = prvJobs(p).length > 0, pr = prvPrinc(p), fixed = mode === 'bring' || mode === 'pull', x = gt.iid && prvById(pv.items, gt.iid), n = 0, h = '';
    if (mode === 'bring' && x) {
      var was = x.lg.filter(function (e) { return e.to === 'out'; }).pop();
      h += '<div class="cf-prev st gt-was"><span class="pde-ic" aria-hidden="true"><svg class="i"><use href="#i-swap"/></svg></span><div><b>Ruled out' + (was ? ' ' + esc(prvDate(was.ts)) : '') + '</b><small>' + esc(x.why || 'No reason was recorded.') + (x.rs ? ' It has come up again ' + prvTimes(x.rs) + ' since.' : '') + '</small></div></div>';
    }
    h += fixed ? '<div class="fld st gt-fixed"><span class="gt-k">Item</span><b>' + esc(a.t) + '</b></div>' :
      '<div class="fld st" id="f-gate-t"><label for="gate-t">What is it? <span class="opt">Required</span></label><input id="gate-t" type="text" maxlength="90" value="' + esc(a.t) + '" placeholder="For example, Export guidelines to PDF" aria-describedby="e-gate-t"><span class="err" id="e-gate-t"></span></div>';
    /* v112 (70): said as soon as the name matches something in Never, before any question is answered */
    if (!fixed) h += '<div id="gate-dup" class="st" aria-live="polite"></div>';
    h += mode === 'bring' ? '<div class="fld st" id="f-gate-c"><label for="gate-c">What has changed since you ruled it out? <span class="opt">Required</span></label><input id="gate-c" type="text" maxlength="140" value="' + esc(a.chg) + '" placeholder="For example, three studios now ask for it" aria-describedby="e-gate-c"><span class="err" id="e-gate-c"></span></div>' :
      '<div class="fld st" id="f-gate-w"><label for="gate-w">Why? <span class="opt">Optional</span></label><input id="gate-w" type="text" maxlength="140" value="' + esc(a.w) + '" placeholder="One line, for future you"></div>';
    if (hasJobs) h += '<fieldset class="prv-pick gt-q st" data-q="job"><legend>' + (++n) + ' · Which job does it answer?</legend>' + pv.jobs.map(function (j) { return prvOptChip('radio', 'job', j.id, esc(prvT(j.t, 46)), a.job === j.id); }).join('') + prvOptChip('radio', 'job', 'none', 'No job', a.job === 'none') + '</fieldset>';
    var rel = prvRelOn(p), SH = rel ? PRV_SHIP : PRV_NEED;   /* v97 (43) */
    h += '<fieldset class="prv-pick gt-q st" data-q="ship"><legend>' + (++n) + (rel ? ' · Can the release ship without it?' : ' · Does the project need it now?') + '</legend>' + SH.map(function (s) { return prvOptChip('radio', 'ship', s[0], s[1], a.ship === s[0]); }).join('') + '</fieldset>';
    h += '<fieldset class="prv-pick gt-q st" data-q="size"><legend>' + (++n) + ' · How big is it?</legend>' + PRV_SZ.map(function (z) { return prvOptChip('radio', 'size', z[0], '<b>' + z[1] + '</b> ' + prvSzText(p, z[0]), a.size === z[0]); }).join('') + '</fieldset>';
    h += !pr.length ? '<p class="prv-hint st">No principles yet. Write ' + PRV_PMIN + ' to ' + PRV_PMAX + ' on the Decisions tab and the Gate will check every item against them.</p>' : '<fieldset class="prv-pick gt-q st" data-q="viol"><legend>' + (++n) + ' · Does it break a principle?</legend>' + prvOptChip('radio', 'viol', 'none', 'No', a.viol === 'none') + pr.map(function (x2) { return prvOptChip('radio', 'viol', x2.id, esc(prvT(x2.t, 50)), a.viol === x2.id); }).join('') + '</fieldset>';
    /* advice, not a question the verdict waits for: an item can serve the release and still drift from why the project exists */
    h += !p.thesis ? '<p class="prv-hint st">No thesis yet, so the Gate cannot check items against it. Write one on the project page.</p>' : '<fieldset class="prv-pick gt-q st" data-q="th"><legend>Does it serve your thesis? <span class="opt">Optional</span></legend><p class="prv-hint gt-sh">“' + esc(prvT(p.thesis, 120)) + '”</p>' + [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']].map(function (o) { return prvOptChip('radio', 'th', o[0], o[1], a.th === o[0]); }).join('') + '</fieldset>';
    h += '<div id="gate-swap" class="st"></div><div id="gate-vd" class="st" aria-live="polite"></div><div id="gate-lock" class="st" aria-live="polite"></div>';
    gBody.innerHTML = h;
  }
  /* what the form says right now */
  function gateRead() {
    var a = gt.a, v = function (nm) { var r = gForm.querySelector('input[name="' + nm + '"]:checked'); return r ? r.value : ''; }, el;
    if ((el = gForm.querySelector('#gate-t'))) a.t = el.value;
    if ((el = gForm.querySelector('#gate-w'))) a.w = el.value;
    if ((el = gForm.querySelector('#gate-c'))) a.chg = el.value;
    if ((el = gForm.querySelector('#gate-ow'))) a.ow = el.value;
    a.job = gForm.querySelector('input[name="job"]') ? v('job') : '';
    a.ship = v('ship'); a.size = v('size'); a.viol = v('viol'); a.th = v('th');
    if (gForm.querySelector('input[name="swap"]')) a.swap = v('swap');
    if (gForm.querySelector('input[name="bk"]')) a.bk = v('bk');
    if (gForm.querySelector('input[name="lk"]')) a.lk = v('lk');
    if ((el = gForm.querySelector('#gate-any'))) a.any = el.value;
  }
  function gateLockHTML(p, a) {
    var stopped = !!p.pv.stop;
    return '<div class="gt-lock"><b>' + (stopped ? 'This project is stopped' : 'No Go decision yet') + '</b><p>' + (stopped ? 'Reopen it before you build anything. You can still put this on Next.' : 'Now is where you build, and Validate has no Go yet. Put this on Next until you decide, or build anyway and say why.') + '</p>' +
      '<fieldset class="prv-pick gt-ovf"><legend class="sr-only">Instead</legend>' + prvOptChip('radio', 'lk', 'next', 'Put it on Next', a.lk === 'next') + (stopped ? '' : prvOptChip('radio', 'lk', 'any', 'Build anyway', a.lk === 'any')) + '</fieldset>' +
      (a.lk === 'any' && !stopped ? '<div class="fld" id="f-gate-any"><label for="gate-any">Why build before a Go? <span class="opt">Required</span></label><input id="gate-any" type="text" maxlength="140" value="' + esc(a.any) + '" placeholder="It is kept as a decision, and the project shows it." aria-describedby="e-gate-any"><span class="err" id="e-gate-any"></span></div>' : '') + '</div>';
  }
  function gateAns() { var a = gt.a; return { t: prvText(a.t), job: a.job, ship: a.ship, size: a.size, viol: a.viol, swap: a.swap, skip: gt.iid, th: a.th }; }
  function gateBucket(g) { return gt.ovr && gt.a.bk ? gt.a.bk : g.v; }
  /* a call that goes against the Gate, or that the Gate could not make because Now has no room */
  function gateOv(g, bucket) { return bucket !== g.v || g.hold; }
  function gateSwapHTML(p, g, a) {
    var now = prvBucket(p, 'in').filter(function (x) { return x.size; }).sort(function (u, w) { return prvDays(w, p) - prvDays(u, p); });
    if (!now.length) return '<p class="prv-hint">Now is over budget and nothing in it has a size, so there is nothing to swap. Size the items in Now first.</p>';
    return '<fieldset class="prv-pick gt-q"><legend>' + (g.asked + 1) + ' · Now is full. Swap one item to Next?</legend><p class="prv-hint gt-sh">Now holds ' + prvDay(g.load) + ' of ' + g.cap + '. This needs ' + g.days + ', which is ' + prvDay(g.over) + ' too many. Moving one item to Next makes room.</p>' +
      prvOptChip('radio', 'swap', '', 'Keep Now as it is', !a.swap) + now.map(function (x) { return prvOptChip('radio', 'swap', x.id, esc(prvT(x.t, 34)) + ' · ' + x.size, a.swap === x.id); }).join('') + '</fieldset>';
  }
  function gateVdHTML(p, g, a) {
    if (!g.complete) return '<div class="gt-vd idle"><span class="gt-vd-k">The Gate says</span><p>Answer all ' + g.asked + ' questions to see where this belongs. ' + g.got + ' of ' + g.asked + ' so far.</p></div>';
    var bucket = gateBucket(g), ov = gateOv(g, bucket), h = '<div class="gt-vd" data-v="' + (g.hold ? 'hold' : g.v) + '"><span class="gt-vd-k">The Gate says</span><b class="gt-vd-v">' + (g.hold ? 'No room' : PRV_BN[g.v]) + '</b><p class="gt-vd-w">' + esc(g.why) + '</p>' + (g.notes.length ? '<ul class="gt-vd-n">' + g.notes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '');
    if (!gt.ovr) return h + '<button type="button" class="link gt-ov" data-gate="ovr">' + (g.hold ? 'Decide anyway…' : 'Put it somewhere else…') + '</button></div>';
    h += '<fieldset class="prv-pick gt-ovf"><legend>Put it in</legend>' + ['in', 'next', 'out'].map(function (b) { return prvOptChip('radio', 'bk', b, PRV_BN[b] + (b === g.v && !g.hold ? ' · Gate' : ''), bucket === b); }).join('') + '</fieldset>';
    if (ov) h += '<div class="fld" id="f-gate-ow"><label for="gate-ow">Why override the Gate? <span class="opt">Required</span></label><input id="gate-ow" type="text" maxlength="140" value="' + esc(a.ow) + '" placeholder="One line. It is kept with the decision." aria-describedby="e-gate-ow"><span class="err" id="e-gate-ow"></span></div>' +
      (bucket === 'in' ? '<p class="prv-hint gt-oh">Going into Now against the Gate is labelled Override, and it counts as unjustified Drift.</p>' : '');
    return h + '<button type="button" class="link gt-ov" data-gate="noovr">Use the Gate’s verdict</button></div>';
  }
  function gateUpdate() {
    var p = pd.p, a = gt.a, g = prvGate(p, gateAns()), bucket = gateBucket(g), mode = gt.mode;
    var ss = [g.need, g.over, g.load, a.swap].join('|'), vs = [g.complete, g.got, g.v, g.why, gt.ovr, bucket, g.need, g.hold, g.notes.join('|')].join('|');
    if (ss !== gt.ss) { gt.ss = ss; document.getElementById('gate-swap').innerHTML = g.need ? gateSwapHTML(p, g, a) : ''; }
    if (vs !== gt.vs) { gt.vs = vs; document.getElementById('gate-vd').innerHTML = gateVdHTML(p, g, a); }
    var dEl = document.getElementById('gate-dup'), ds = g.dup ? g.dup.id : '';
    if (dEl && ds !== gt.ds) { gt.ds = ds; dEl.innerHTML = g.dup ? '<p class="prv-hint gt-dup"><b>Already in Never: “' + esc(prvT(g.dup.t, 60)) + '”.</b>' + (g.dup.why ? ' ' + esc(prvT(g.dup.why, 90)) : '') + '</p>' : ''; }
    var held = g.complete && g.hold && !gt.ovr, lock = g.complete && !held && bucket === 'in' && prvLocked(p), ls = lock + '|' + a.lk + '|' + !!p.pv.stop;
    if (ls !== gt.ls) { gt.ls = ls; document.getElementById('gate-lock').innerHTML = lock ? gateLockHTML(p, a) : ''; }
    gGo.textContent = held ? 'Make room first' : lock ? (!a.lk ? 'Choose one above' : a.lk === 'next' ? GT_VERB[mode] + 'Next' : 'Build anyway') : bucket === 'out' ? (mode === 'bring' ? 'Keep it in Never' : g.dup && !gt.ovr ? 'Keep it out' : 'Rule it out') : GT_VERB[mode] + PRV_BN[bucket];
    gGo.disabled = !g.complete || held || (lock && !a.lk);
  }
  function gateErr(field, msg) {
    var f = document.getElementById('f-gate-' + field), e = document.getElementById('e-gate-' + field), i = document.getElementById(field === 't' ? 'gate-t' : field === 'c' ? 'gate-c' : field === 'any' ? 'gate-any' : 'gate-ow');
    if (e) e.textContent = msg; if (f) f.setAttribute('data-err', ''); if (i) i.focus();
  }
  function gateSubmit() {
    if (gGo.disabled) return;
    gateRead();
    var p = pd.p, pv = p.pv, a = gt.a, ans = gateAns(), g = prvGate(p, ans), bucket = gateBucket(g), mode = gt.mode, now = Date.now(), t = ans.t, ov = gateOv(g, bucket), ovw = prvText(a.ow), w = prvText(a.w), chg = prvText(a.chg), x, idea, snap, ex, reason;
    if (!g.complete) return;
    var lockd = bucket === 'in' && prvLocked(p), anyw = '';
    if (lockd) {
      if (a.lk === 'next') { bucket = 'next'; ov = false; if (!w) w = 'Waiting for a Go decision'; }
      else if (a.lk === 'any' && !pv.stop) { anyw = prvText(a.any); if (anyw.length < 6) return gateErr('any', 'Say why you build before a Go. It is kept as a decision.'); }
      else return;
    }
    if (t.length < 2) return gateErr('t', 'Write what it is, in a few words.');
    if (mode === 'bring' && chg.length < 8) return gateErr('c', 'Say what has changed. Without a reason it stays out.');
    if (ov && ovw.length < 6) return gateErr('ow', 'Say why you are overriding the Gate. It is kept with the decision.');
    if (mode === 'bring' && bucket === 'out') { closeDrawer(); showToast('Left in Never. Nothing changed.'); return; }
    if (mode === 'add' || mode === 'promote') {
      var twin = pv.items.filter(function (z) { return (z.sec === 'in' || z.sec === 'next') && z.id !== gt.iid && prvSame(z.t, t); })[0];
      if (twin) return gateErr('t', 'Already in ' + PRV_BN[twin.sec] + ': “' + prvT(twin.t, 40) + '”.');
    }
    if (g.dup && bucket === 'out' && (mode === 'add' || mode === 'promote')) {
      /* it is the same thing as something already in Never. Count the request instead of ruling it out twice */
      var dp = g.dup, lk;
      snap = prvSnap(p); dp.rs = (dp.rs || 0) + 1; dp.rsl = now; dp.lg.push({ ts: now, k: 'again', why: t.toLowerCase() === dp.t.toLowerCase() ? '' : 'Asked as “' + prvT(t, 50) + '”' });
      if (mode === 'promote') {
        idea = prvById(pv.park, gt.kid);
        if (idea) { lk = idea.iid && prvById(pv.items, idea.iid); if (lk && lk.sec === 'inbox') prvMove(p, lk, 'gone', 'Merged into “' + prvT(dp.t, 40) + '” in Never'); idea.st = 'promoted'; idea.to = 'out'; idea.xts = now; idea.iid = dp.id; idea.lg.push({ ts: now, k: 'promote', to: 'out' }); }
      }
      closeDrawer(true);
      return prvDone(p, snap, 'You asked for something already in Never', 'Already in Never. “' + prvT(dp.t, 40) + '” has come up again ' + prvTimes(dp.rs) + ' since you ruled it out.', pd.tab === 'parking' ? '#prv-qa' : '[data-pd="prv:gate"][data-m="add"]', '[data-it="' + dp.id + '"]');
    }
    snap = prvSnap(p);
    if (anyw) { var dA = pfDecRec(p, 'Build without proof', ['anyway'], 'anyway', anyw, null, now); dA.opts = [{ t: 'Build anyway', c: true, why: '' }]; pv.anyway = { ts: now, why: anyw, did: dA.id }; }
    ex = { v: g.v }; if (mode === 'promote') ex.pr = 1; if (ov) { ex.ov = 1; ex.ovw = ovw; }
    var sw = g.swapOk && bucket === 'in' ? prvById(pv.items, a.swap) : null;
    if (sw) prvMove(p, sw, 'next', 'Made room for “' + prvT(t, 50) + '”');
    reason = mode === 'bring' ? chg : w;
    if (bucket === 'out' && !reason) reason = g.why;
    if (mode === 'add' || mode === 'promote') {
      idea = mode === 'promote' ? prvById(pv.park, gt.kid) : null; x = idea && idea.iid ? prvById(pv.items, idea.iid) : null;
      if (x && x.sec === 'inbox') { prvMove(p, x, bucket, reason, ex); x.t = t; }
      else { x = prvMk(bucket, t, reason, now, ex); pv.items.push(x); }
      x.why = reason;
      if (idea) { idea.st = 'promoted'; idea.to = bucket; idea.xts = now; idea.iid = x.id; idea.lg.push({ ts: now, k: 'promote', to: bucket }); }
    } else {
      x = prvById(pv.items, gt.iid); if (!x) return;
      if (mode === 'bring') { x.nwhy = x.why; x.why = chg; } else if (w) x.why = w;
      prvMove(p, x, bucket, mode === 'bring' ? chg : w, ex);
      if (bucket === 'out') x.why = reason;
    }
    x.size = a.size; x.gate = { ship: a.ship, viol: a.viol, th: p.thesis ? a.th || '' : '', v: g.v, ov: ov ? 1 : 0, ovw: ov ? ovw : '', ts: now }; x.ov = bucket === 'in' && ov ? 1 : 0;
    if (bucket === 'out' && g.viol) prvLook(x, 0);
    if (bucket === 'in' && x.st === 'done') x.st = 'planned';
    pv.jobs.forEach(function (j) { var i = j.items.indexOf(x.id); if (i > -1) j.items.splice(i, 1); });
    if (a.job && a.job !== 'none') { var jb = prvById(pv.jobs, a.job); if (jb) jb.items.push(x.id); x.nj = 0; } else x.nj = a.job === 'none' ? 1 : 0;
    prvLogScope(p, x, bucket, prvGateWhy(p, ans, g, bucket, ovw));
    var msg = bucket === 'in' ? (mode === 'pull' ? 'Pulled into Now.' : mode === 'bring' ? 'Brought back into Now.' : 'Added to Now.') + (pv.base ? (ov ? ' Override: it counts as drift.' : ' Passed the Gate. Drift +' + prvDay(prvSzB(p, a.size) || 1) + '.') : '') + (sw ? ' “' + prvT(sw.t, 30) + '” moved to Next.' : '') :
      bucket === 'next' ? 'On Next. It waits for ' + prvNextName(p) + '.' : 'Ruled out. It keeps its reason and a decision was recorded.';
    if (anyw) msg = 'Building without proof. ' + msg;
    closeDrawer(true);
    prvDone(p, snap, bucket === 'in' ? 'You put an item in Now through the Scope Gate' : bucket === 'next' ? 'You put an item on Next through the Scope Gate' : 'You ruled out an item through the Scope Gate', msg, pd.tab === 'parking' ? '#prv-qa' : '[data-pd="prv:gate"][data-m="add"]', '[data-it="' + x.id + '"]');
  }
  gForm.addEventListener('submit', function (e) { e.preventDefault(); gateSubmit(); });
  gForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); gateSubmit(); } });
  gForm.addEventListener('input', function (e) {
    var f = e.target.closest('.fld'); if (f) f.removeAttribute('data-err');
    gateRead(); gateUpdate();
  });
  gForm.addEventListener('change', function () { gateRead(); gateUpdate(); });
  gForm.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gate]'); if (!b) return;
    e.preventDefault(); gateRead();
    if (b.getAttribute('data-gate') === 'ovr') { gt.ovr = true; gt.a.bk = ''; gt.vs = ''; gateUpdate(); var f1 = gForm.querySelector('input[name="bk"]:checked'); if (f1) f1.focus(); }
    else { gt.ovr = false; gt.a.bk = ''; gt.vs = ''; gateUpdate(); var f2 = gForm.querySelector('[data-gate="ovr"]'); if (f2) f2.focus(); }
  });

  /* drawer: export market data */
  var mxTa = document.getElementById('mexp-json'), mxCnt = document.getElementById('mexp-cnt'), mxCopy = document.getElementById('mexp-copy');
  function prvIso(ts) { var d = new Date(ts); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function prvExportObj(p) {
    var pv = p.pv, K = prvKeys(p), jk = K.jk, ck = K.ck;
    var sid = function (n) { return n ? 's' + n : null; }, txt = function (x) { return x.t; }, wj = pv.wedge.job && prvById(pv.jobs, pv.wedge.job);
    return {
      schema: 'scopedue.market.v1',
      meta: { mode: 'export', model: '', browsing: false, as_of: prvIso(Date.now()), project: p.n },
      project: { thesis: p.thesis || '', wedge: pv.wedge.t, wedge_job: wj ? jk[wj.id] : null, strengths: pv.asm.win.map(txt), weaknesses: pv.asm.weak.map(txt), risks: pv.asm.risk.map(txt) },
      jobs: pv.jobs.map(function (j) { return { key: jk[j.id], title: j.t, demand: j.dem.map(function (e) { return { kind: e.k, note: e.x, source: sid(e.src) }; }) }; }),
      competitors: pv.comps.map(function (c) {
        return { key: ck[c.id], name: c.n, positioning: c.pos, price: c.price, substitute: c.sub, strengths: c.str.slice(), weaknesses: c.weak.slice(),
          coverage: pv.jobs.filter(function (j) { return c.cov[j.id]; }).map(function (j) { return { job: jk[j.id], level: c.cov[j.id].l, source: sid(c.cov[j.id].s) }; }),
          sources: c.src.map(sid), last_checked: c.chk ? prvIso(c.chk) : null, status: 'active', clone: !!c.clone, dead: !!c.dead, died: c.died || null };
      }),
      /* the flags and channels travel too, so a refresh sees them and does not bring a dead rival back or list a channel twice */
      channels: (pv.channels || []).map(function (c) { return { name: c.n, url: c.u || null, size: c.size || null, why: c.why || null, source: sid(c.src) }; }),
      sources: pv.src.map(function (s) { return { id: sid(s.n), title: s.t, url: s.u || '', quote: s.txt || '', accessed: prvIso(s.ts), origin: s.ai ? 'ai' : 'user', verified: !!s.ver }; }),
      retired: pv.ret.map(function (r) { return { kind: r.kind, key: r.key, title: r.kind === 'job' ? r.d.t : r.d.n, reason: r.why || '', retired_on: prvIso(r.ts) }; }),
      notes: []
    };
  }
  function mexpOnOpen() {
    var pv = pd.p.pv;
    mxTa.value = JSON.stringify(prvExportObj(pd.p), null, 2); mxTa.scrollTop = 0;
    mxCnt.textContent = pv.jobs.length + (pv.jobs.length === 1 ? ' job' : ' jobs') + ' · ' + pv.comps.length + (pv.comps.length === 1 ? ' competitor' : ' competitors') + ' · ' + pv.src.length + (pv.src.length === 1 ? ' source' : ' sources');
    mxCopy.textContent = 'Copy JSON';
    return '#mexp-copy';
  }
  mxCopy.addEventListener('click', function () {
    copyText(mxTa.value, function () { mxCopy.textContent = 'Copied'; clearTimeout(mxCopy._t); mxCopy._t = setTimeout(function () { mxCopy.textContent = 'Copy JSON'; }, 1600); showToast('Market JSON copied'); });
  });
  mxTa.addEventListener('click', function () { mxTa.select(); });

