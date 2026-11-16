/* ───── Approve with an email code ───── */
var V = { code: '', attempts: 0, secs: 0, tId: 0, mailT: 0, busy: false, locked: false, inVerify: false };
var wait = function (ms) { return RM.matches ? 0 : ms; };
function curAction() { if (S.route.k !== 'p') return null; var p = P[S.route.id]; return actionsFor(p).filter(function (a) { return a.key === S.sel; })[0] || null; }
function cells() { return $$('.cell', $('#otp')); }
function setTone(msg, tone) { var m = $('#vMsg'); m.dataset.tone = tone || ''; m.textContent = msg; m.classList.remove('in'); void m.offsetWidth; m.classList.add('in'); }
function paintCells() {
  var inp = $('#otpIn'), v = inp.value, foc = document.activeElement === inp;
  cells().forEach(function (c, i) {
    var dEl = $('.d', c), had = c.classList.contains('f'), filled = i < v.length;
    dEl.textContent = filled ? v[i] : ''; c.classList.toggle('f', filled);
    c.classList.toggle('on', foc && !V.locked && !V.busy && i === Math.min(v.length, 5) && v.length < 6);
    if (filled && !had && dEl.animate && !RM.matches) dEl.animate([{ transform: 'translateY(10px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.5,.64,1)' });
  });
  $('#confirmBtn').disabled = v.length < 6 || V.busy || V.locked;
}
function mailWhat() { var a = curAction(), p = P[S.route.id]; if (!a) return ''; return a.kind === 'scope' ? 'approve Scope v' + a.v.v + ' for ' + p.n : a.kind === 'review' ? 'accept ' + a.m.t + ' for ' + p.n : 'approve ' + a.c.id + ' (' + a.c.t + ')'; }
function showMail() {
  var m = $('#mail'); clearTimeout(V.mailT);
  $('#mailCode').textContent = V.code.slice(0, 3) + ' ' + V.code.slice(3); $('#mailFor').textContent = 'Use it to ' + mailWhat() + '.';
  $('#mailTo').textContent = 'To ' + mailLine(cl());
  m.classList.remove('show'); void m.offsetWidth; setTimeout(function () { m.classList.add('show'); }, wait(1100)); V.mailT = setTimeout(hideMail, wait(18000) + 1100);
}
function hideMail() { clearTimeout(V.mailT); $('#mail').classList.remove('show'); }
function startTimer(n) {
  clearInterval(V.tId); V.secs = n || 30; var t = $('#vTimer'), r = $('#vResend'); t.hidden = false; r.hidden = true;
  var paint = function () { t.textContent = 'Resend code in 0:' + String(V.secs).padStart(2, '0'); }; paint();
  V.tId = setInterval(function () { V.secs--; if (V.secs <= 0) { clearInterval(V.tId); t.hidden = true; r.hidden = false; } else paint(); }, 1000);
}
function resetOtp() { var inp = $('#otpIn'); if (!inp) return; inp.value = ''; $('#otp').dataset.state = ''; inp.readOnly = false; V.busy = false; $('#confirmBtn').removeAttribute('data-busy'); paintCells(); }
function sendCode(resend) { if (LIVEON) return liveSendCode(resend); V.code = String(Math.floor(100000 + Math.random() * 900000)); V.attempts = 0; V.locked = false; resetOtp(); startTimer(); showMail(); setTone(resend ? 'New code sent. The previous one no longer works.' : 'Code sent. It can take a few seconds to arrive.', 'info'); }
function enterVerify() {
  var panel = $('#panel'); if (!panel || !$('#pvB')) return;
  V.inVerify = true; panel.dataset.view = 'verify'; $('#pvA').setAttribute('inert', ''); $('#pvB').removeAttribute('inert'); $('#pvB').removeAttribute('aria-hidden');
  sendCode(false); setTimeout(function () { var i = $('#otpIn'); if (i) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } paintCells(); } }, wait(520));
}
function leaveVerify(focusBack) {
  var panel = $('#panel'); V.inVerify = false; clearInterval(V.tId); hideMail();
  if (!panel) return; panel.dataset.view = 'default'; $('#pvB').setAttribute('inert', ''); $('#pvB').setAttribute('aria-hidden', 'true'); $('#pvA').removeAttribute('inert');
  setTimeout(resetOtp, wait(500)); if (focusBack) setTimeout(function () { var b = $('#approveBtn'); if (b) b.focus({ preventScroll: true }); }, wait(300));
}
function cancelVerify() { V.inVerify = false; clearInterval(V.tId); hideMail(); }
function startApprove() {
  var b = $('#approveBtn'); if (!b || b.hasAttribute('data-busy')) return;
  b.setAttribute('data-busy', ''); setTimeout(function () { b.removeAttribute('data-busy'); enterVerify(); }, wait(700));
}
function submitCode() {
  if (LIVEON) return liveSubmitCode();
  var inp = $('#otpIn'); if (V.busy || V.locked || inp.value.length < 6) return;
  V.busy = true; inp.readOnly = true; $('#otp').dataset.state = 'verifying'; $('#confirmBtn').setAttribute('data-busy', ''); setTone('Verifying…', 'info'); paintCells();
  setTimeout(function () {
    $('#confirmBtn').removeAttribute('data-busy');
    if (inp.value === V.code) { $('#otp').dataset.state = 'ok'; setTone('Code confirmed.', 'ok'); setTimeout(finishApprove, wait(900)); }
    else {
      V.attempts++; $('#otp').dataset.state = 'err'; var left = 3 - V.attempts;
      if (left > 0) { setTone('That code didn’t match. ' + left + (left === 1 ? ' try left.' : ' tries left.'), 'err'); setTimeout(function () { inp.value = ''; $('#otp').dataset.state = ''; inp.readOnly = false; V.busy = false; paintCells(); inp.focus({ preventScroll: true }); }, wait(950)); }
      else { V.locked = true; V.busy = false; clearInterval(V.tId); $('#vTimer').hidden = true; $('#vResend').hidden = false; setTone('Too many attempts. Request a new code to continue.', 'err'); paintCells(); }
    }
  }, wait(1000));
}
function finishApprove(srv) {
  var a = curAction(); if (!a) return cancelVerify();
  var p = P[a.pid], c = cl(), tot = pdTotals(p), rec = srv ? { via: 'email code', at: fmtAt(srv.record.at), ts: srv.record.at, ip: srv.record.ip } : { via: 'email code', at: stamp(), ts: now(), ip: pdIp('now' + Date.now() + Math.random()) };
  cancelVerify();
  if (a.kind === 'scope') {
    if (!srv) { a.v.appr = c.name + ' · ' + today(); a.v.rec = rec; }
    S.done = { kind: 'scope', pid: p.id, v: a.v.v, rec: rec, rk: 'v|' + p.id + '|' + a.v.v };
  } else if (a.kind === 'review') {
    var Mr = msM(p), mr = smMs(Mr, a.m.id), ei = (p.mev || []).length;
    if (srv) ei = srv.event.i;
    else { p.mev = p.mev || []; p.mev.push({ i: ei, w: 'c', ty: 'accept', m: a.m.id, v: Mr.gov.v, at: stamp(), ts: rec.ts, tx: 'Accepted.', link: '', k: '', rec: { by: c.name, via: 'email code', at: rec.ts, ip: rec.ip, fp: mr && mr.last && mr.last.hx ? pdGroup(mr.last.hx, 12) : '' }, fresh: true }); }
    S.done = { kind: 'review', pid: p.id, m: a.m.id, t: a.m.t, rec: rec, rk: 'm|' + p.id + '|' + ei, pay: mr ? mr.pay : 0, amt: mr ? mr.amt : 0, pd: Mr.rules.pd, price: Mr.price };
  } else {
    var q = pdQuoteEntry(a.c), idx = a.c.entries.length;
    if (srv) idx = srv.entry.idx; else a.c.entries.push({ w: 'c', ty: 'accept', at: rec.at, ts: rec.ts, tx: 'Approved.', rec: { via: 'email code', ip: rec.ip }, fresh: true });
    S.done = { kind: 'quote', pid: p.id, cid: a.c.id, rec: rec, rk: 'e|' + p.id + '|' + a.c.id + '|' + idx, amt: q.amt || 0, days: q.days || 0, price: tot ? tot.price : null, before: tot ? tot.pend.amt : 0,
      total: tot && tot.total != null ? tot.total + (q.amt || 0) : null, delivery: tot && tot.newDelivery != null ? pdShift(tot.newDelivery, q.days || 0) : null, nextV: pdLatest(p).v + 1 };
  }
  S.sel = null; S.sealNext = true;
  var shown = function () { render('soft'); toast('Approved. ' + studioName() + ' has been notified.'); };
  if (srv) liveFetch(function (ok) { if (ok) shown(); }); else ensureHashes(shown);
}
function reviewDoneParts(p, d) {
  var sn = studioName();
  return { line: d.t + ' is accepted. ' + (d.pay ? 'Its share (' + d.pay + '%' + (d.price != null ? ', ' + money(d.amt) : '') + ') is due ' + (d.pd ? dayw(d.pd) + ' from today' : 'now') + ', as agreed. You pay ' + sn + ' directly; ScopeDue never handles money.' : 'Nothing else is needed from you for it.'),
    peek: [['Now', d.t + ' is done. ' + sn + ' has been notified.'], ['Next', 'The next milestone is delivered here, and you review it the same way.']] };
}
function beginApprove(key) {
  var pid = key.split(':')[1]; closeAllD();
  S.done = null; S.sel = key; S.route = { k: 'p', id: pid };
  setTimeout(function () { render('soft'); var el = $('#decision'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: RM.matches ? 'auto' : 'smooth' }); setTimeout(startApprove, wait(450)); }, wait(320));
}

