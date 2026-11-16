  /* ---------- v75: every version of a private project, in one overlay (prefix vx) ----------
     A version shows only what it had at its time: what shipped in it and before it, what it carried on, what was ruled out while it was
     open. Nothing from a later version is in it. Everything is read from pv.ships, pv.bls and each item's log */
  var vx = { sel: 'open', p: null };
  var vxD = document.getElementById('drawer-versions'), vxRailEl = document.getElementById('vx-rail'), vxBody = document.getElementById('vx-body'), vxStrip = document.getElementById('vx-strip'), vxGo = document.getElementById('vx-go');
  function vxShips(p) { return (p.pv.ships || []).slice().sort(function (a, b) { return a.ts - b.ts; }); }
  /* the baseline a version was measured against: the last one set while it was open */
  function vxBaseTs(pv, from, to) { var m = 0; (pv.bls || []).forEach(function (e) { if (e.ts > from && e.ts <= to && e.ts > m) m = e.ts; }); return m; }
  /* the versions, oldest first: each shipped one, the one open now, and the one after it */
  function vxList(p) {
    var pv = p.pv, out = [], prev = 0;
    vxShips(p).forEach(function (s) { out.push({ k: 's:' + s.id, kind: 'shipped', name: s.name, s: s, from: prev, to: s.ts, base: vxBaseTs(pv, prev, s.ts) }); prev = s.ts; });
    out.push({ k: 'open', kind: 'open', name: pv.rel.name || 'v1', from: prev, to: Infinity, base: pv.base ? pv.base.ts : 0 });
    out.push({ k: 'next', kind: 'next', name: prvNextName(p) });
    return out;
  }
  function vxLate(x, v) { return !!v.base && x.lg.some(function (e) { return e.to === 'in' && e.ts > v.base && e.ts <= v.to; }); }
  /* what was ruled out while a version was open, apart from what was cut as it shipped */
  function vxRuled(p, v) {
    var out = [];
    p.pv.items.forEach(function (x) { x.lg.forEach(function (e) { if (e.ts > v.from && e.ts <= v.to && e.to === 'out' && !e.sh && (e.k === 'new' || e.k === 'mv')) out.push({ x: x, why: e.why || x.why }); }); });
    return out;
  }
  function vxShipped(p, s) { return p.pv.items.filter(function (x) { return x.rid === s.id && x.sec === 'shipped'; }); }
  function vxAtShip(p, s, to) {
    var out = [];
    p.pv.items.forEach(function (x) { x.lg.forEach(function (e) { if (e.sh && e.rid === s.id && e.to === to) out.push({ x: x, why: to === 'out' ? e.why : '' }); }); });
    return out;
  }
  /* what earlier versions had shipped: the product as it stood before this one */
  function vxBefore(p, v) { var ids = vxShips(p).filter(function (s) { return s.ts < (v.kind === 'shipped' ? v.s.ts : Infinity); }).map(function (s) { return s.id; }); return p.pv.items.filter(function (x) { return x.sec === 'shipped' && ids.indexOf(x.rid) > -1; }); }
  function vxDate(ts) { var d = new Date(ts); return prvDate(ts) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function vxRatio(s) { return s.took && s.planD ? s.took / s.planD : 0; }
  function vxRatioText(r) { return r > 1.1 ? r.toFixed(1) + '× its plan' : r < 0.9 ? 'Ahead of plan' : 'On plan'; }
  var VX_ST = { planned: 'To do', doing: 'Doing', review: 'In review', done: 'Done' };

  /* ---- pieces ---- */
  function vxItems(p, rows, o) {
    if (!rows.length) return '<p class="vx-e">' + esc(o.empty) + '</p>';
    return '<ul class="vx-il">' + rows.map(function (r) {
      var x = r.x || r, st = o.st ? '<span class="chip ' + (x.st === 'done' ? 'ok' : x.st === 'doing' || x.st === 'review' ? 'neutral' : 'quiet') + '">' + (VX_ST[x.st] || 'To do') + '</span>' : '';
      return '<li class="vx-i" data-k="' + o.k + '"><span class="vx-g" aria-hidden="true"></span><span class="vx-it"><b>' + esc(x.t) + '</b>' + (r.why ? '<small>' + esc(r.why) + '</small>' : '') + '</span><span class="vx-im">' +
        (o.v && vxLate(x, o.v) ? '<span class="chip warn">After the baseline</span>' : '') + st + (x.size ? '<span class="chip neutral prv-sz" title="Size ' + x.size + ', about ' + prvDay(prvSzD(p, x.size)) + '">' + x.size + '</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  function vxSec(title, n, body, cls) { return '<section class="vx-s' + (cls ? ' ' + cls : '') + '"><h4 class="vx-sh"><span>' + esc(title) + '</span><span class="vx-n">' + n + '</span></h4>' + body + '</section>'; }
  function vxPrior(p, v) {
    var b = vxBefore(p, v); if (!b.length) return '';
    return '<details class="vx-s vx-prior"><summary class="vx-sh"><span>Already there from earlier versions</span><span class="vx-n">' + b.length + '</span>' + IC('chev') + '</summary>' + vxItems(p, b, { k: 'prior', empty: '' }) + '</details>';
  }
  function vxTiles(t) {
    return '<div class="vx-tl">' + t.map(function (x) {
      return '<div class="vx-tile' + (x.c ? ' ' + x.c : '') + '"><span class="vx-tk">' + esc(x.k) + '</span><b class="vx-tv">' + esc(x.v) + '</b>' + (x.s ? '<small>' + esc(x.s) + '</small>' : '') +
        (x.bar != null ? '<span class="vx-bar" aria-hidden="true"><i style="width:' + Math.max(0, Math.min(100, x.bar)) + '%"></i></span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function vxHead(eb, name, chip, sub) {
    return '<header class="vx-dh"><div><span class="vx-eb">' + eb + '</span><h3 id="vx-h">' + esc(name) + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (chip || '') + '</header>';
  }
  function vxQuote(label, t) { return t ? '<blockquote class="vx-q"><span>' + esc(label) + '</span>' + esc(t) + '</blockquote>' : ''; }

  /* ---- one version ---- */
  function vxShippedHTML(p, v, L) {
    var s = v.s, m = PRV_MET[s.met], all = s.done + s.carried + s.cut, r = vxRatio(s), i = L.indexOf(v), nx = L[i + 1];
    var drift = s.dd != null ? (s.dd ? '+' + prvDay(s.dd) : 'None') : s.add ? '+' + itemsLbl(s.add) : 'None', dsub = s.dd != null ? (s.dd ? '+' + s.dp + '% on the baseline' : 'Nothing added after the baseline') : s.add ? 'Added after the baseline' : 'Nothing added after the baseline';
    var h = vxHead('<span class="vx-dot" data-k="shipped"></span>Shipped · ' + esc(prvDate(s.ts)), s.name, m ? '<span class="chip ' + m[1] + '">' + m[0] + '</span>' : '', s.date ? 'Target was ' + esc(vxDate(new Date(s.date + 'T12:00:00').getTime())) + (s.ext ? ' · extended once' : '') : '');
    h += vxQuote('Done when', s.ship) + (s.sum ? '<p class="vx-sum">' + esc(s.sum) + '</p>' : '');
    h += vxTiles([
      { k: 'Done', v: s.done + ' / ' + all, s: all === s.done ? 'Everything planned shipped' : (s.carried ? s.carried + ' carried on' : '') + (s.carried && s.cut ? ' · ' : '') + (s.cut ? s.cut + ' cut' : ''), bar: all ? s.done / all * 100 : 0 },
      { k: 'Time', v: s.took ? prvDay(s.took) : '—', s: r ? (s.planD ? prvDay(s.planD) + ' planned · ' : '') + vxRatioText(r) : 'No target date', c: r > 1.1 ? 'warn' : '' },
      { k: 'Days planned', v: s.cap ? s.planned + ' / ' + s.cap : prvDay(s.planned), s: s.cap ? 'of the time it had' : 'No time budget set', bar: s.cap ? s.planned / s.cap * 100 : null },
      { k: 'Drift', v: drift, s: dsub, c: s.dd || s.add ? 'warn' : 'ok' }
    ]);
    h += vxSec('Shipped in ' + s.name, vxShipped(p, s).length, vxItems(p, vxShipped(p, s), { k: 'shipped', v: v, empty: 'Nothing is recorded for this version.' }));
    var car = vxAtShip(p, s, 'next'), cut = vxAtShip(p, s, 'out'), ru = vxRuled(p, v);
    if (car.length) h += vxSec('Carried on to ' + (nx ? nx.name : 'the next version'), car.length, vxItems(p, car, { k: 'carried', v: v, empty: '' }));
    if (cut.length) h += vxSec('Cut when it shipped', cut.length, vxItems(p, cut, { k: 'cut', empty: '' }));
    if (ru.length) h += vxSec('Ruled out while it was open', ru.length, vxItems(p, ru, { k: 'never', empty: '' }));
    return h + vxPrior(p, v);
  }
  function vxOpenHTML(p, v) {
    var pv = p.pv, r = pv.rel, ins = prvBucket(p, 'in'), done = ins.filter(function (x) { return x.st === 'done'; }).length, ld = prvLoad(p), due = r.date ? prvDueText(r.date) : null, d = prvDrift(p), late = prvLate(p);
    var h = vxHead('<span class="vx-dot" data-k="open"></span>In progress', v.name, late ? '<span class="chip crit">' + prvDay(late) + ' late</span>' : pv.base ? '<span class="chip neutral">Baseline set</span>' : '<span class="chip quiet">No baseline yet</span>', due ? 'Target ' + esc(due.when) + ' · ' + esc(due.t) : 'No target date');
    h += vxQuote('Done when', r.ship) || '<p class="vx-sum vx-mute">No done-when line yet.</p>';
    h += vxTiles([
      { k: 'Done', v: done + ' / ' + ins.length, s: ins.length ? (ins.length - done) + ' to go' : 'Nothing in Now yet', bar: ins.length ? done / ins.length * 100 : 0 },
      { k: 'Days planned', v: ld.cap ? ld.days + ' / ' + ld.cap : prvDay(ld.days), s: ld.cap ? (ld.over ? prvDay(ld.over) + ' over' : prvDay(ld.left) + ' free') : 'No time budget set', bar: ld.cap ? ld.days / ld.cap * 100 : null, c: ld.over ? 'crit' : '' },
      { k: 'Target', v: due ? due.when : '—', s: due ? due.t : 'No target date', c: due && due.n < 0 ? 'crit' : due && due.n <= 7 ? 'warn' : '' },
      { k: 'Drift', v: pv.base ? (d.ad ? '+' + prvDay(d.ad) : 'None') : '—', s: pv.base ? (d.ad ? '+' + d.pct + '% on the baseline' : 'No changes since the baseline') : 'Not committed yet', c: d.lv >= 3 ? 'crit' : d.lv ? 'warn' : pv.base ? 'ok' : '' }
    ]);
    h += vxSec('In ' + v.name, ins.length, vxItems(p, ins, { k: 'open', st: true, v: v, empty: 'Nothing in Now yet. Put the first item through the Gate.' }));
    var ru = vxRuled(p, v);
    if (ru.length) h += vxSec('Ruled out while it is open', ru.length, vxItems(p, ru, { k: 'never', empty: '' }));
    return h + vxPrior(p, v);
  }
  function vxNextHTML(p, v) {
    var nx = prvBucket(p, 'next'), days = 0, un = 0;
    nx.forEach(function (x) { if (x.size) days += prvSzD(p, x.size); else un++; });
    var h = vxHead('<span class="vx-dot" data-k="next"></span>Next', v.name, '<span class="chip quiet">Not started</span>', 'Opens when ' + esc(p.pv.rel.name || 'v1') + ' ships');
    h += '<p class="vx-sum vx-mute">Nothing here is planned yet. Each item reaches ' + esc(v.name) + ' only through the Gate.</p>';
    h += vxTiles([
      { k: 'Waiting', v: String(nx.length), s: nx.length === 1 ? 'item on Next' : 'items on Next' },
      { k: 'Estimate', v: prvDay(days), s: un ? un + ' without a size' : 'From their sizes' }
    ]);
    return h + vxSec('Waiting for ' + v.name, nx.length, vxItems(p, nx, { k: 'next', empty: 'Nothing is waiting. Ideas that ship fine without them end up here.' }));
  }

  /* ---- the overlay ---- */
  function vxStripHTML(p, L) {
    var sh = vxShips(p), rs = sh.map(vxRatio).filter(Boolean), avg = rs.length ? rs.reduce(function (a, b) { return a + b; }, 0) / rs.length : 0, feats = p.pv.items.filter(function (x) { return x.sec === 'shipped'; }).length;
    var f = function (v, k) { return '<div class="vx-st"><b>' + esc(v) + '</b><span>' + esc(k) + '</span></div>'; };
    return f(String(sh.length), sh.length === 1 ? 'version shipped' : 'versions shipped') + f(String(feats), feats === 1 ? 'item shipped' : 'items shipped') +
      f(avg ? (avg > 1.1 ? avg.toFixed(1) + '×' : avg < 0.9 ? 'Ahead' : 'On plan') : '—', avg ? 'time against the plan, on average' : 'no timing yet') + f(p.pv.rel.name || 'v1', 'in progress now');
  }
  function vxRailHTML(p, L) {
    return L.slice().reverse().map(function (v, i) {
      var on = v.k === vx.sel, st, meter = null;
      if (v.kind === 'shipped') { var all = v.s.done + v.s.carried + v.s.cut; st = vxDate(v.s.ts); meter = all ? v.s.done / all : 0; }
      else if (v.kind === 'open') { var ins = prvBucket(p, 'in'), dn = ins.filter(function (x) { return x.st === 'done'; }).length; st = 'In progress'; meter = ins.length ? dn / ins.length : 0; }
      else st = 'Next';
      return '<button type="button" role="tab" class="vx-r" id="vx-t-' + i + '" data-vx="' + esc(v.k) + '" data-kind="' + v.kind + '" aria-selected="' + on + '" aria-controls="vx-body" tabindex="' + (on ? '0' : '-1') + '">' +
        '<span class="vx-dot" data-k="' + v.kind + '" aria-hidden="true"></span><span class="vx-rn">' + esc(v.name) + '</span><span class="vx-rs">' + esc(st) + '</span>' +
        (meter != null ? '<span class="vx-rm" aria-hidden="true"><i style="width:' + Math.round(meter * 100) + '%"></i></span>' : '') + '</button>';
    }).join('');
  }
  /* the whole overlay, once when it opens: the figures and the rail do not change while you move along it */
  function vxPaint() {
    var p = vx.p; vx.L = vxList(p);
    if (!vx.L.some(function (x) { return x.k === vx.sel; })) vx.sel = 'open';
    document.getElementById('vx-sub').textContent = p.n;
    vxStrip.innerHTML = vxStripHTML(p, vx.L);
    vxRailEl.innerHTML = vxRailHTML(p, vx.L);
    vxPick(vx.sel, false, 0);
  }
  /* moving along the rail: only the selection and the version beside it are drawn again. dir: 1 older, -1 newer, 0 none */
  function vxPick(k, focus, dir) {
    var p = vx.p, L = vx.L, v = L.filter(function (x) { return x.k === k; })[0] || L[L.length - 2], t = null;
    vx.sel = v.k;
    [].forEach.call(vxRailEl.querySelectorAll('[data-vx]'), function (b) { var on = b.getAttribute('data-vx') === v.k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on) t = b; });
    vxBody.innerHTML = '<div class="vx-pane"' + (dir ? ' data-dir="' + (dir > 0 ? 'older' : 'newer') + '"' : '') + '>' + (v.kind === 'shipped' ? vxShippedHTML(p, v, L) : v.kind === 'open' ? vxOpenHTML(p, v) : vxNextHTML(p, v)) + '</div>';
    vxBody.setAttribute('aria-labelledby', t ? t.id : 'vx-title');
    vxBody.scrollTop = 0;
    vxGo.hidden = v.kind === 'shipped';
    /* the language layer translates what was just drawn on its own (the overlay is shown, so it is watched): nothing to call here */
    if (t) {
      /* keep the chosen version in view: in the middle of the rail when it runs across (a phone), at its nearest edge when it runs down.
         Everything is read first and written after, so the page is laid out once */
      var R = vxRailEl, across = R.scrollWidth > R.clientWidth + 1, top = t.offsetTop, h = t.offsetHeight, st = R.scrollTop, ch = R.clientHeight, left = t.offsetLeft, w = t.offsetWidth, cw = R.clientWidth;
      if (R.getAttribute('aria-orientation') !== (across ? 'horizontal' : 'vertical')) R.setAttribute('aria-orientation', across ? 'horizontal' : 'vertical');
      if (across) R.scrollLeft = left - (cw - w) / 2;
      else if (top < st + 8 || top + h > st + ch - 8) R.scrollTop = top - (ch - h) / 2;
      if (focus) t.focus({ preventScroll: true });
    }
  }
  function vxIdx(k) { for (var i = 0; i < vx.L.length; i++) if (vx.L[i].k === k) return i; return -1; }
  function vxMove(k, focus) { if (k === vx.sel) { if (focus) { var t = vxRailEl.querySelector('[aria-selected="true"]'); if (t) t.focus(); } return; } vxPick(k, focus, vxIdx(k) < vxIdx(vx.sel) ? 1 : -1); }
  /* k: the version to show first ('s:<ship id>', 'open' or 'next'); the one in progress when none is given */
  function vxOpen(trigger, k) { vx.want = k || 'open'; openDrawer('versions', trigger); }
  function vxOnOpen() {
    vx.p = pd.p; vx.sel = vx.want || 'open';
    vxPaint();
    return '.vx-r[aria-selected="true"]';
  }
  vxRailEl.addEventListener('click', function (e) { var b = e.target.closest('[data-vx]'); if (!b) return; vxMove(b.getAttribute('data-vx'), true); });
  vxRailEl.addEventListener('keydown', function (e) {
    var tabs = [].slice.call(vxRailEl.querySelectorAll('[data-vx]')), i = tabs.indexOf(document.activeElement), j = -1;
    if (i < 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(tabs.length - 1, i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
    if (j < 0) return;
    e.preventDefault(); vxMove(tabs[j].getAttribute('data-vx'), true);
  });
  vxGo.addEventListener('click', function () { var k = vx.sel; closeDrawer(true); pdSelect('scope'); var el = pdPanel.querySelector(k === 'next' ? '#pd-h-nx' : '#pd-h-in'); if (el) prvFlash(el.closest('.card'), true); });
