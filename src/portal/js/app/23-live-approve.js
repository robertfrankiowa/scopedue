/* ───── approving with the emailed code ───── */
function liveSendCode(resend) {
  var a = curAction(); if (!a) return;
  if (badRecord(a)) { cancelVerify(); render('soft'); return; }
  var p = P[a.pid], b = a.kind === 'scope' ? { kind: 'scope', project: p.id, v: a.v.v } : a.kind === 'review' ? { kind: 'delivery', project: p.id, m: a.m.id, n: (p.mev || []).length } : { kind: 'quote', project: p.id, cr: a.c.id, on: a.c.entries.length - 1 };
  V.challenge = ''; V.attempts = 0; V.locked = false; resetOtp(); clearInterval(V.tId); $('#vTimer').hidden = true; $('#vResend').hidden = true;
  setTone('Sending the code…', 'info');
  apiCall('POST', '/v1/code', b).then(function (r) {
    if (!V.inVerify) return;
    if (r.status === 201) {
      V.challenge = r.data.challenge;
      startTimer(Math.max(5, Math.min(59, Math.ceil((r.data.resend_after - now()) / 1000))));
      setTone(resend ? 'New code sent. The previous one no longer works.' : 'Code sent. It can take a few seconds to arrive.', 'info');
      return;
    }
    $('#vResend').hidden = false;
    var code = errCode(r);
    if (r.status === 401 || r.status === 403) return liveFail(r);
    if (code === 'superseded' || code === 'expired' || code === 'already_approved' || code === 'not_allowed') return liveMoved(code, a, r);
    if (r.status === 429) {
      var ms = errDetail(r).retry_after_ms || 30000, mins = Math.ceil(ms / 60000);
      if (ms <= 90000) { startTimer(Math.max(1, Math.ceil(ms / 1000))); $('#vTimer').textContent = 'Send a code in 0:' + String(V.secs).padStart(2, '0'); return setTone('A code was sent a moment ago. You can ask for a new one shortly.', 'info'); }
      return setTone(ms > 2 * 3600000 ? 'Too many codes have been sent today. Try again tomorrow, or ask ' + studioName() + ' to help.' : ms > 90000 ? 'You have asked for several codes. Try again in about ' + plural(mins, 'minute') + '.' : 'Wait a moment before asking for another code.', 'err');
    }
    setTone(r.net || r.status >= 500 ? 'We could not send the code. Check your connection and try again.' : (errText(r) || 'We could not send the code.'), 'err');
  });
}
/* what was being approved is not what it was: look again and say so */
function liveMoved(code, a, r) {
  var sn = studioName(), what = a.kind === 'scope' ? 'Scope v' + a.v.v : a.kind === 'review' ? a.m.t : a.c.id, id = a.pid, cid = a.kind === 'scope' || a.kind === 'review' ? null : a.c.id;
  cancelVerify(); S.sel = null;
  liveFetch(function (ok) {
    if (!ok) return;
    var l = P[id] && pdLatest(P[id]);
    render('soft');
    if (code === 'superseded') toast(a.kind === 'scope' && l ? sn + ' shared Scope v' + l.v + ' while you were reading. Review it before you approve.' : what + ' changed while you were reading. Review it before you approve.');
    else if (code === 'expired') toast('That quote has expired. You can ask ' + sn + ' for a new one.');
    else if (code === 'already_approved') toast(what + ' is already approved.');
    else toast('There is nothing to approve on ' + what + ' right now.');
    refreshDrawers();
  });
}
function liveSubmitCode() {
  var inp = $('#otpIn'); if (!inp || V.busy || V.locked || inp.value.length < 6 || !V.challenge) return;
  var a = curAction();
  V.busy = true; inp.readOnly = true; $('#otp').dataset.state = 'verifying'; $('#confirmBtn').setAttribute('data-busy', ''); setTone('Verifying…', 'info'); paintCells();
  apiCall('POST', '/v1/approve', { challenge: V.challenge, code: inp.value }).then(function (r) {
    $('#confirmBtn').removeAttribute('data-busy');
    if (r.status === 200) { $('#otp').dataset.state = 'ok'; setTone('Code confirmed.', 'ok'); setTimeout(function () { finishApprove(r.data); }, wait(900)); return; }
    var code = errCode(r), retry = function (msg) { $('#otp').dataset.state = 'err'; setTone(msg, 'err'); setTimeout(function () { inp.value = ''; $('#otp').dataset.state = ''; inp.readOnly = false; V.busy = false; paintCells(); inp.focus({ preventScroll: true }); }, wait(950)); };
    var spent = function (msg) { V.locked = true; V.busy = false; clearInterval(V.tId); $('#vTimer').hidden = true; $('#vResend').hidden = false; $('#otp').dataset.state = 'err'; setTone(msg, 'err'); paintCells(); };
    if (code === 'code_wrong') { var left = errDetail(r).tries_left; retry('That code didn’t match. ' + left + (left === 1 ? ' try left.' : ' tries left.')); }
    else if (code === 'code_locked') spent('Too many attempts. Request a new code to continue.');
    else if (code === 'code_expired') spent('This code has expired. Request a new one to continue.');
    else if (code === 'code_invalid') spent('This code can no longer be used. Request a new one to continue.');
    else if (r.status === 401 || r.status === 403) liveFail(r);
    else if (a && (code === 'superseded' || code === 'expired' || code === 'already_approved' || code === 'not_allowed')) liveMoved(code, a, r);
    else {   // the network: the code may still be good
      V.busy = false; inp.readOnly = false; $('#otp').dataset.state = ''; setTone(r.net || r.status >= 500 ? 'We could not reach the server. Check your connection and confirm again.' : (errText(r) || 'Something went wrong. Try again.'), 'err'); paintCells();
    }
  });
}

