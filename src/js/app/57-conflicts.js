  /* ---------- v96: changes that crossed (CONTRACT.md 41) ----------
     Functions only: the Overview and Drive sync call these. Where a merge on Drive found that this copy and another changed the same
     thing (x8Merge's cx), the copy in use and the other one are kept on this device in p.cf, which never travels (X8_SKIP):
       { id, ts, pa, use, alt, here, who, dev }
     pa: the path in the project as it travels; use: the copy in use; alt: the other; here: the copy in use is this device's;
     who: the other side's address (this person's own on dev, two of their devices). Only the places cfWhat names are kept: the
     commitments, decisions, people and Done when lines. An entry goes by itself once what is in use there has changed again */
  function cfWhat(p, pa) {
    var k = pa[0], f = typeof pa[3] === 'string' ? pa[3] : '', id = pa[2] && pa[2].id, x;
    var top = { n: 'Project name', thesis: 'Thesis', focus: 'Current focus', next: 'Next step', dueAt: 'Deadline', team: 'Team and roles', eh: 'What Editors can see' };
    var item = { t: 'Name', sec: 'Where it sits', st: 'Status', as: 'Who has it', why: 'Why', size: 'Size', stk: 'Stuck because', due: 'Due', dod: 'Done when' };
    if (k === 'eh') return { h: top.eh, f: '' };
    if (top[k] && pa.length === 1) return { h: top[k], f: '' };
    if (k === 'pv' && pa[1] === 'items' && id != null) {
      if (pa.length > 3 && !item[f]) return null;
      x = prvById(p.pv.items, id);
      return { h: x ? 'Scope item “' + prvT(x.t, 48) + '”' : 'Scope item', f: item[f] || '' };
    }
    if (k === 'pv' && pa[1] === 'dec' && id != null) {
      var dec = { t: 'Decision', because: 'Reason', st: 'Status', opts: 'Options', ev: 'Evidence', rv: 'Look again when', by: 'Replaced by' };
      if (pa.length > 3 && !dec[f]) return null;
      x = prvById(p.pv.dec, id);
      return { h: x ? 'Decision “' + prvT(x.t, 48) + '”' : 'Decision', f: dec[f] || '' };
    }
    if (k === 'pv' && pa[1] === 'princ' && id != null) {
      if (pa.length > 3 && f !== 't' && f !== 'rm') return null;
      x = prvById(p.pv.princ, id);
      return { h: x ? 'Principle “' + prvT(x.t, 48) + '”' : 'Principle', f: f === 'rm' ? 'Removed' : '' };
    }
    if (k === 'pv' && pa[1] === 'rel') {
      var rel = { name: 'Name', date: 'Target date', cap: 'Capacity', ship: 'What ships' }, rf = typeof pa[2] === 'string' ? pa[2] : '';
      if (pa.length > 2 && !rel[rf]) return null;
      return { h: 'Release', f: rel[rf] || '' };
    }
    if (k === 'pv' && pa[1] === 'wedge' && pa[2] === 't') return { h: 'Why someone switches', f: '' };
    if (k === 'work' && typeof pa[1] === 'string') {
      var wf = typeof pa[2] === 'string' ? pa[2] : '';
      if (pa.length > 2 && !item[wf]) return null;
      x = wkUnits(p).filter(function (u) { return u.id === pa[1]; })[0];
      return { h: x ? 'Work “' + prvT(x.t, 48) + '”' : 'Work', f: item[wf] || '' };
    }
    /* v102 (58): a client Scope draft's commitments: what a line is called, its date, its Done when line, a milestone's share, the price */
    if (k === 'sc' && pa[1] === 'items' && id != null) {
      var sci = { t: 'Name', d: 'Date', ok: 'Done when', pay: 'Share' };
      if (pa.length > 3 && !sci[f]) return null;
      x = ((p.sc || {}).items || []).filter(function (y) { return y.id === id; })[0];
      return { h: x ? 'Scope item “' + prvT(x.t, 48) + '”' : 'Scope item', f: sci[f] || '' };
    }
    if (k === 'sc' && pa[1] === 'terms' && pa[2] === 'price' && pa.length === 3) return { h: 'Contract value', f: '' };
    return null;
  }
  function cfHead(w) { return w.h + (w.f ? ' · ' + w.f : ''); }
  /* the project as it travels from this device: what a path points into */
  function cfCur(p) { return p.dv ? dvLocal(p) : x8Out(p); }
  function cfWho(p, e) {
    e = String(e || '').toLowerCase(); if (!e) return 'Someone';
    if (e === dvMe()) return 'You';
    if (p.dv && e === p.dv.owner && p.dv.oname) return p.dv.oname;
    var m = (p.team || []).filter(function (x) { return String(x.e || '').toLowerCase() === e; })[0];
    return m ? m.n : e.split('@')[0];
  }
  /* a copy, in words */
  function cfVal(p, pa, v) {
    var f = typeof pa[pa.length - 1] === 'string' ? pa[pa.length - 1] : '';
    if (v === undefined || v === null || v === '') return 'Nothing';
    if (f === 'sec') return { 'in': 'Now', next: 'Next', out: 'Never', inbox: 'Parking Lot', shipped: 'Shipped' }[v] || String(v);
    if (f === 'st') return WK_NM[v] || { planned: 'Planned', open: 'Open', decided: 'Decided', superseded: 'Superseded' }[v] || String(v);
    if (f === 'as') return cfWho(p, v);
    if (pa[0] === 'sc' && f === 'pay' && typeof v === 'number') return v + '%';   /* v102 (58) */
    if (pa[0] === 'sc' && f === 'price' && typeof v === 'number') return pdMoney(v, p.cur);
    if (pa[0] === 'sc' && f === 'd' && /^\d{4}-\d\d-\d\d$/.test(String(v))) return dayLbl(new Date(v + 'T00:00:00').getTime());
    if (f === 'ok' && pa[0] !== 'sc') return v ? 'Checked' : 'Not checked';
    if (f === 'rm') return v ? 'Removed' : 'Kept';
    if (typeof v === 'number' && (f === 'dueAt' || f === 'due' || f === 'date')) return prvDate(v);
    if (typeof v === 'string' || typeof v === 'number') return '“' + prvT(String(v), 90) + '”';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) {
      if (!v.length) return 'Nothing';
      if (f === 'team') return v.map(function (m) { return (m.n || String(m.e || '').split('@')[0]) + ' (' + (m.role || 'Editor') + ')'; }).join(', ');
      return v.map(function (x) { return x8IsObj(x) ? (x.t ? (f === 'dod' ? (x.ok ? '✓ ' : '○ ') : '') + x.t : '…') : String(x); }).join(' · ');
    }
    if (x8IsObj(v) && v.t) return '“' + prvT(String(v.t), 90) + '”';
    return 'Changed';
  }
  /* where each copy came from */
  function cfSrc(p, c, inUse) {
    var mine = inUse === c.here;
    if (c.dev) return mine ? 'This device' : 'Your other device';
    return mine ? 'Yours' : 'From ' + cfWho(p, c.who);
  }

  /* called by Drive sync after a merge: keeps what crossed, one entry per place, newest first, at most 20 */
  function cfAdd(p, cx, who, dev) {
    if (!cx.out.length) return false;
    var list = (p.cf || []).slice(), n = 0;
    cx.out.forEach(function (c) {
      if (!cfWhat(p, c.pa)) return;
      var k = x8S(c.pa);
      list = list.filter(function (x) { return x8S(x.pa) !== k; });
      list.unshift({ id: 'cf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), pa: c.pa, use: cx.win === 'r' ? c.r : c.l, alt: cx.win === 'r' ? c.l : c.r, here: cx.win === 'l', who: String(who || '').toLowerCase(), dev: !!dev });
      n++;
    });
    if (!n) return false;
    p.cf = list.slice(0, 20);
    return true;
  }
  /* the entries still true: what is in use there is still the copy that was used */
  function cfOpen(p) {
    if (!p.dv || !p.cf || !p.cf.length || !DR) return [];   /* the first draw (42-local-data) comes before Drive's state exists */
    var cur = cfCur(p), keep = p.cf.filter(function (c) { return cfWhat(p, c.pa) && x8S(x8At(cur, c.pa)) === x8S(c.use); });
    if (keep.length !== p.cf.length) p.cf = keep;
    return keep;
  }
  /* may this person put the other copy in use: an Editor only where what they may change would carry it (x8Allow) */
  function cfCan(p, c) {
    var r = x8Role(p); if (r === 'Owner') return true; if (r !== 'Editor') return false;
    var cur = cfCur(p), t = x8Clone(cur);
    if (!x8Set(t, c.pa, c.alt)) return false;
    return x8S(x8At(x8Allow(cur, t, 'Editor', dvMe(), cur), c.pa)) === x8S(c.alt);
  }
  /* a copy put in use, through the same way in as what arrives from Drive */
  async function cfPut(p, pa, val) {
    var o = cfCur(p); if (!x8Set(o, pa, val)) return false;
    if (x8Role(p) === 'Owner') x8In(p, o, null);
    else if (p.dv) dvInMember(p, await dvRec(p.dv.pid), o);
    else return false;
    return true;
  }

  /* ---- what it looks like ---- */
  function cfCard(p) {
    var l = cfOpen(p); if (!l.length) return '';
    var h = '<section class="card pd-card cf-card" id="cf-card" aria-labelledby="pd-h-cf"><div class="card-h ruled"><div><h3 id="pd-h-cf">Changes that crossed</h3>' +
      '<p>Two changes to the same thing met before either side saw the other. The Owner’s copy is used, or the latest of your own devices; the other is kept here until someone chooses.</p></div>' +
      '<div class="h-actions"><span class="count">' + l.length + '</span></div></div><ul class="cf-l">';
    l.forEach(function (c) {
      var w = cfWhat(p, c.pa), id = esc(c.id);
      h += '<li data-id="' + id + '"><h4>' + esc(w.h) + (w.f ? '<small>' + esc(w.f) + '</small>' : '') + '</h4><dl class="cf-dl">' +
        '<div class="cf-use"><dt>In use</dt><dd><span class="cf-v">' + esc(cfVal(p, c.pa, c.use)) + '</span><small>' + esc(cfSrc(p, c, true)) + '</small></dd></div>' +
        '<div class="cf-alt"><dt>Not used</dt><dd><span class="cf-v">' + esc(cfVal(p, c.pa, c.alt)) + '</span><small>' + esc(cfSrc(p, c, false)) + '</small></dd></div></dl>' +
        '<div class="pd-s-acts">' + (cfCan(p, c) ? '<button type="button" class="btn-ghost btn-sm" data-pd="cf:use" data-id="' + id + '">Use the other copy</button>' : '<span class="pd-hint">Only ' + esc(x8Own1(p)) + ' can change this here.</span>') +
        '<button type="button" class="btn-primary btn-sm" data-pd="cf:keep" data-id="' + id + '">Keep the one in use</button></div></li>';
    });
    return h + '</ul></section>';
  }
  function cfNeeds(p) {
    var l = cfOpen(p); if (!l.length) return [];
    return [{ t: l.length === 1 ? '1 change crossed another' : l.length + ' changes crossed others', p: cfHead(cfWhat(p, l[0].pa)), chip: 'warn', chipT: 'Choose a copy', tab: 'workspace', f: 'cf' }];
  }
  async function cfAct(act, a) {
    var p = pd.p, id = a.getAttribute('data-id'), c = (p.cf || []).filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var what = cfHead(cfWhat(p, c.pa) || { h: '', f: '' }), back = function () { p.cf = [c].concat((p.cf || []).filter(function (x) { return x.id !== c.id; })); };
    if (act === 'keep') {
      p.cf = p.cf.filter(function (x) { return x !== c; });
      var note = pdNote(p, 'You kept the copy in use: ' + what); pdTouch(p);
      pdRerender(); pdRefreshBadges(p);
      showToast('Kept', function () { pdUnnote(p, note); back(); pdRerender(); pdRefreshBadges(p); });
    } else if (act === 'use') {
      if (!cfCan(p, c)) { x8No(p); return; }
      a.disabled = true;
      if (!(await cfPut(p, c.pa, c.alt))) { a.disabled = false; showToast('That place has changed since. Nothing was replaced.'); return; }
      p.cf = (p.cf || []).filter(function (x) { return x.id !== c.id; });
      var note2 = pdNote(p, 'You used the other copy: ' + what); pdTouch(p);
      pdRerender(); pdRefreshBadges(p);
      showToast('The other copy is in use', async function () { if (await cfPut(p, c.pa, c.use)) { pdUnnote(p, note2); back(); } pdRerender(); pdRefreshBadges(p); });
    }
  }
  /* the project opened from the address before Drive's state existed: drawn again, with the card */
  if (curView === 'project' && pd.p && pd.p.cf && pd.p.cf.length) pdRerender();
  if (sdTest() && window.__drv && window.__drv.sync) window.__drv.sync.cf = function (id) { var p = pdById(id); return p ? x8Clone(cfOpen(p)) : null; };
  /* v102 (58), tests only: change a client Scope draft's line (iid) or its terms (no iid) as the Scope editor would */
  if (sdTest() && window.__drv && window.__drv.sync) window.__drv.sync.scSet = function (id, iid, f, v) { var p = pdById(id), x = p && p.sc && (iid ? (p.sc.items || []).filter(function (y) { return y.id === iid; })[0] : p.sc.terms); if (!x) return false; x[f] = v; pdTouch(p); return true; };
