  /* ---------- api.php 1.27.0: the plan (CONTRACT.md 95) ----------
     Free or Paid, as the server says it; the server reads it from Stripe. Upgrade opens Stripe Checkout in a new tab, Manage billing
     opens Stripe's own billing page: neither page is ScopeDue's, and no card ever reaches the app or the server. The new tab opens on
     the click itself (a browser lets a page open one only then) and goes to Stripe once the server answers. The app sees the paid
     plan by itself: Stripe tells the server, the server moves the pulse, and this tab asks again; also when the window gets focus. */
  var BL = { gen: -1, plan: null, err: '', busy: '', msg: '', wait: 0, at: 0 };
  var BL_WAIT = 2 * 3600000;   // after Upgrade, the plan is asked on every pulse for this long, wherever the app is
  function blOn() { return !!(SY.key && SY.url && SY.st !== 'auth'); }
  function blShown() { var v = pfId('view-settings'), p = pfId('st-p-plan'); return !!(v && !v.hidden && p && !p.hidden); }
  function blDate(ms) { var d = new Date(ms); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function blMoney(p) { var n = Number(p && p.price && p.price.usd); return '$' + (n > 0 ? n : 2.9).toFixed(2); }
  async function blPull() {
    if (!blOn()) { BL.plan = null; blPaint(); return; }
    var gen = SY.gen, r;
    BL.at = Date.now();
    r = await syCall('GET', '/v1/billing');
    if (gen !== SY.gen) return;
    if (syOk(r) && r.data && r.data.plan) {
      var was = BL.gen === gen && BL.plan ? BL.plan.name : '';
      BL.plan = r.data.plan; BL.gen = gen; BL.err = '';
      if (r.data.quota) BL.quota = r.data.quota;   /* 1.28.0 (96) */
      if (BL.wait && BL.plan.name === 'paid' && was !== 'paid') { BL.wait = 0; showToast('Your plan is paid. Thank you'); }
      /* paid now: a client project waiting for a place opens at once */
      if (BL.plan.name === 'paid' && was && was !== 'paid') { QT.no = {}; dvRun(true); }
    } else BL.err = r.status === 404 ? 'old' : 'net';
    blPaint();
  }
  /* ---------- api.php 1.28.0: 5 new client projects a month (CONTRACT.md 96; 3 until 125) ----------
     A free account starts or joins at most 5 new client projects in a calendar month (UTC), as Owner or Editor. The server counts:
     the app asks it for a place right before a client project is made here (own: its id), or opens here for the first time as an
     Editor (drive: its folder, room: its team sync room). The same project asked again in the same month is the same place. Without a
     place nothing is made or opened: the new-project drawer says why and offers Upgrade, a project someone shared waits on its joining
     card and opens by itself once there is a place (a paid plan, or the next month). A server before 1.28.0 counts nothing */
  var QT = { no: {}, said: {} };   // no: when the server last said there was no place for a project, so it is not asked every round
  var QT_AGAIN = 300000;
  function qtUtc(ms) { var d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function qtNext() { var d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
  function qtPaid() { return !!(BL.gen === SY.gen && BL.plan && (BL.plan.name === 'paid' || BL.plan.name === 'admin')); }   /* the admin account: no limit (96) */
  /* what the free plan has left this month, when known: null when unknown or unlimited */
  function qtLeft() { var q = BL.gen === SY.gen ? BL.quota : null; return q && q.limit != null && !qtPaid() ? q : null; }
  function qtFullText(q) { return 'You have started or joined 5 new client projects this month, the most the free plan has. The paid plan has no limit, or a new month starts on ' + qtUtc(q && q.resets ? q.resets : qtNext()) + '.'; }
  async function qtClaim(k, ref) {
    var key = k + ':' + ref, r, q;
    if (!blOn()) return { ok: false, out: true };
    if (QT.no[key] && Date.now() - QT.no[key] < QT_AGAIN) return { ok: false, full: true, quota: BL.quota };
    r = await syCall('POST', '/v1/quota/claim', { k: k, ref: ref });
    if (r.status === 404 || r.status === 405) return { ok: true, old: true };   /* a server before 1.28.0: nothing is counted */
    if (syOk(r)) { delete QT.no[key]; if (r.data && r.data.quota) { BL.quota = r.data.quota; blPaint(); } return { ok: true, quota: r.data.quota }; }
    if (syErr(r).code === 'quota_full') {
      QT.no[key] = Date.now(); q = (syErr(r).detail || {}).quota;
      if (q) { BL.quota = q; blPaint(); }
      return { ok: false, full: true, quota: q };
    }
    return { ok: false, net: !!r.net || r.status >= 500, msg: syMsg(r) };
  }
  /* the pulse moved: only when someone looks at the plan, or waits for Stripe */
  function blPulse() {
    if (BL.wait && Date.now() - BL.wait > BL_WAIT) BL.wait = 0;
    if (blOn() && (BL.wait || blShown())) blPull();
  }
  function blBtn(k, label, pri) { return '<button type="button" class="' + (pri ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-bl="' + k + '"' + (BL.busy ? ' disabled' : '') + '>' + (BL.busy === k ? 'Opening Stripe…' : label) + '</button>'; }
  function blPaint() {
    var body = pfId('bl-body'), pill = pfId('bl-pill'), sub = pfId('bl-sub'), p = BL.gen === SY.gen ? BL.plan : null, h, pt, acts = '';
    var msg = BL.msg ? '<p class="sy-p sy-bad" role="status">' + esc(BL.msg) + '</p>' : '';
    var priv = '<div><dt>Private projects</dt><dd>No limit</dd></div>', card = '<p class="sy-p">Payments go through Stripe. ScopeDue never sees your card.</p>';
    var q = p ? BL.quota : null, mo = '';   /* 1.28.0 (96): this month's count */
    if (q && (p.name === 'paid' || p.name === 'admin')) mo = '<div><dt>This month</dt><dd>' + (q.used === 1 ? '1 new client project' : q.used + ' new client projects') + '</dd></div>';
    else if (q) mo = '<div><dt>This month</dt><dd>' + (q.used > 5 ? q.used + ' new client projects (the free plan has 5)' : q.used + ' of 5 used') + '</dd></div><div><dt>Next month starts</dt><dd>' + qtUtc(q.resets) + '</dd></div>';
    if (!body) return;
    if (!blOn()) {
      pt = ['off', 'Not signed in']; sub.textContent = 'What your ScopeDue account includes.';
      h = '<p class="sy-p">Your plan goes with your ScopeDue account. Sign in under Client portal to see it.</p>';
    } else if (!p) {
      pt = ['off', BL.err ? 'Not known' : 'Checking…']; sub.textContent = 'What your ScopeDue account includes.';
      h = BL.err === 'old' ? '<p class="sy-p">Your server does not sell plans.</p>' : BL.err ? '<p class="sy-p sy-bad" role="status">Could not reach ScopeDue. Try again in a moment.</p><div class="sy-acts">' + blBtn('refresh', 'Try again') + '</div>' : '<p class="sy-p">Checking with ScopeDue…</p>';
    } else if (p.name === 'admin') {   /* the site's admin account: ScopeDue's own, never limited, nothing to pay (96) */
      pt = ['ok', 'Admin account']; sub.textContent = 'An admin account has no limits.';
      h = '<dl class="cd-dl"><div><dt>Your plan</dt><dd>No limits, nothing to pay</dd></div><div><dt>Client projects</dt><dd>No limit</dd></div>' + mo + priv + '</dl>' + msg +
        (p.manage ? '<div class="sy-acts">' + blBtn('portal', 'Billing history') + '</div>' : '');
    } else if (p.name === 'paid') {
      pt = p.late ? ['inv', 'Payment failed'] : ['ok', 'Paid plan']; sub.textContent = 'Thank you for paying for ScopeDue.';
      h = '<dl class="cd-dl"><div><dt>Your plan</dt><dd>Paid · ' + blMoney(p) + ' a month</dd></div>' +
        (p.until ? '<div><dt>' + (p.ends ? 'Ends on' : 'Renews on') + '</dt><dd>' + blDate(p.until) + '</dd></div>' : '') +
        '<div><dt>Client projects</dt><dd>No monthly limit</dd></div>' + mo + priv + '</dl>' +
        (p.late ? '<p class="sy-p sy-bad" role="status">Stripe could not take the last payment. Update your card in Manage billing, or the plan ends.</p>' :
          p.ends ? '<p class="sy-p">You cancelled. The plan stays paid until that day, then it is Free.</p>' : '');
      if (p.manage) acts = blBtn('portal', 'Manage billing', p.late);
      h += msg + (acts ? '<div class="sy-acts">' + acts + '</div>' : '') + card;
    } else {
      pt = ['off', 'Free']; sub.textContent = 'What your ScopeDue account includes.';
      h = '<dl class="cd-dl"><div><dt>Your plan</dt><dd>Free</dd></div><div><dt>Client projects</dt><dd>5 new each month, as Owner or Editor</dd></div>' + mo + priv + '</dl>' +
        (q && q.left === 0 ? '<p class="sy-p sy-bad" role="status">' + esc(qtFullText(q)) + '</p>' : '') +
        (p.buy ? '<p class="sy-p">The paid plan is ' + blMoney(p) + ' a month: client projects with no monthly limit. Cancel any time.</p>' : '<p class="sy-p">Paid plans are not open yet.</p>');
      if (p.buy) acts += blBtn('buy', 'Upgrade for ' + blMoney(p) + ' a month', true);
      if (p.manage) acts += blBtn('portal', 'Billing history');
      if (BL.wait && p.buy) acts += '<span class="sy-p">Waiting for Stripe…</span>';
      h += msg + (acts ? '<div class="sy-acts">' + acts + '</div>' : '') + (p.buy || p.manage ? card : '');
    }
    pill.innerHTML = '<i class="pd ' + pt[0] + '"></i>' + esc(pt[1]);
    if (body._h !== h) { body._h = h; body.innerHTML = h; }
    npjQtPaint();   /* the new-project drawer says the same count */
  }
  function blErr(r) {
    var c = syErr(r).code || '';
    if (c === 'billing_off') return 'Paid plans are not available right now. Try again later.';
    if (c === 'already') return 'Your plan is already paid.';
    if (c === 'admin') return 'An admin account has no limits and nothing to pay.';
    if (c === 'billing_unreachable' || c === 'billing_failed') return 'Stripe did not answer. Try again in a moment.';
    return r && r.msg ? r.msg : syMsg(r || { status: 0, data: {}, net: true });
  }
  /* Upgrade or Manage billing: a tab now, Stripe's page in it when the server answers (closed again if it does not) */
  async function blGo(k) {
    var w = null, gen = SY.gen, r, url;
    try { w = window.open('about:blank', '_blank'); } catch (e) {}
    if (w) { try { w.opener = null; w.document.title = 'Stripe'; w.document.body.style.font = '15px system-ui, sans-serif'; w.document.body.textContent = sdT('Opening Stripe…'); } catch (e) {} }
    BL.busy = k; BL.msg = ''; blPaint();
    r = await syQ(function () { return syCall('POST', k === 'buy' ? '/v1/billing/checkout' : '/v1/billing/portal', {}); });
    BL.busy = '';
    url = r && syOk(r) && r.data && typeof r.data.url === 'string' ? r.data.url : '';
    if (gen !== SY.gen || !(/^https:\/\//.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url))) {
      try { if (w) w.close(); } catch (e) {}
      if (gen === SY.gen) { BL.msg = url ? 'Stripe did not answer. Try again in a moment.' : blErr(r); if (syErr(r).code === 'already') blPull(); }
      blPaint(); return;
    }
    if (k === 'buy') BL.wait = Date.now();
    if (w && !w.closed) w.location.replace(url); else window.open(url, '_blank', 'noopener');
    blPaint();
  }
  function blEnter() { BL.msg = ''; blPaint(); if (Date.now() - BL.at > 3000) blPull(); }
  pfId('bl-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bl]'); if (!b || BL.busy) return;
    var k = b.getAttribute('data-bl');
    if (k === 'refresh') { BL.err = ''; blPaint(); blPull(); } else blGo(k);
  });
  /* back from Stripe's tab: ask at once, no need to wait for the pulse */
  window.addEventListener('focus', function () { if (blOn() && (BL.wait || blShown()) && Date.now() - BL.at > 3000) blPull(); });
  /* 1.28.0 (96): the month's count once at start, so Accept on an invitation and the new-project drawer know it before they ask */
  setTimeout(function () { if (blOn() && !BL.at) blPull(); }, 4000);
  if (sdTest()) window.__bl = { pull: function () { return blPull(); }, st: function () { return BL; }, qt: function () { return QT; }, claim: function (k, ref) { return qtClaim(k, ref); } };
