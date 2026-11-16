/* ───── the dialogs: the actions that need no code ───── */
function dlgErr(msg, tone) { var e = $('#dErr'); if (!e) return; e.hidden = !msg; e.textContent = msg || ''; e.dataset.tone = tone || ''; }
function dlgBusy(on) { var go = $('#dgo'); if (DL) DL.busy = on; if (!go) return; if (on) { go.dataset.label = go.textContent; go.textContent = 'Sending…'; go.disabled = true; } else { if (go.dataset.label) go.textContent = go.dataset.label; syncDlg(); } }
function dlgStillOk(T, p, c) {
  if (T === 'new') return true;
  if (T === 'ask' && !DL.cid) return !!pdLatest(p);
  if (!c) return false;
  var st = pdCrState(c);
  if (T === 'counter') return st === 'client' && !!pdQuoteEntry(c) && isQuote(c);
  if (T === 'decline') return st === 'client' || st === 'me';   // with the studio: withdrawing (82)
  if (T === 'newquote') return pdExpired(c);
  if (T === 'dispute') return DL.bug != null || st !== 'approved';
  if (T === 'ask') return st === 'client' || st === 'me';
  return st !== 'approved';
}
function liveSubmit() {
  if (DL.busy) return;
  var T = DL.type, p = P[DL.pid], c = DL.cid ? pdCr(p, DL.cid) : null, tx = ($('#f-tx') || {}).value, b = { project: p.id }, draft = {}, x = {};
  tx = tx ? tx.trim() : '';
  var on = DL.seen;   // the last entry she saw when she opened this dialog, not whatever has arrived since
  if (T === 'counter') { x.a = numOf($('#f-amt').value, 1e12).n; x.dd = numOf($('#f-days').value, 365).n; b = { action: 'counter', project: p.id, cr: c.id, on: on, amt: x.a, days: x.dd, tx: tx }; draft = { amt: $('#f-amt').value, days: $('#f-days').value, tx: tx }; }
  else if (T === 'decline') { b = { action: 'decline', project: p.id, cr: c.id, on: on, tx: tx }; draft = { tx: tx }; }
  else if (T === 'ask') { b = c ? { action: 'question', project: p.id, cr: c.id, on: on, tx: tx } : { action: 'question', project: p.id, v: pdLatest(p).v, tx: tx }; draft = { tx: tx }; }
  else if (T === 'note') { x.reopen = pdCrState(c) === 'declined'; b = { action: 'note', project: p.id, cr: c.id, on: on, tx: tx }; draft = { tx: tx }; }
  else if (T === 'newquote') { b = { action: 'newquote', project: p.id, cr: c.id, on: on, tx: tx }; draft = { tx: tx }; }
  else if (T === 'dispute') {   // v108 (65)
    var dpos = (document.querySelector('input[name="f-pos"]:checked') || {}).value || 'fix', dref = ($('#f-ref') || {}).value || '';
    b = DL.bug != null ? { action: 'dispute', project: p.id, bug: DL.bug, tx: tx } : { action: 'dispute', project: p.id, cr: c.id, on: on, tx: tx, pos: dpos };
    if (dref) b.ref = dref; draft = { tx: tx };
  }
  else { x.title = $('#f-ti').value.trim(); b = { action: 'request', project: p.id, title: x.title, tx: tx }; draft = { ti: x.title, tx: tx }; }
  b.key = DL.key;   // if the answer is lost and she sends again, the server sees the same write
  if (DL.pics && DL.pics.length) b.files = picBody();   // v102 (59)
  dlgErr(''); dlgBusy(true);
  apiCall('POST', '/v1/respond', b).then(function (r) {
    if (r.status === 201) {
      var cid = r.data.cr.id; x.id = cid;
      var m = dlgMsgs(T, c || { id: cid }, x), idx = r.data.entry.idx;
      picKeep('e|' + p.id + '|' + cid + '|' + idx);
      S.last[p.id] = m.last; S.sel = null; S.done = null;
      closeDlg(function () {
        liveFetch(function (ok) {
          if (!ok) return;
          render('soft'); toast(m.msg);
          var dr = $('#dReq'); if (dr.open) { if (S.dr.req) reqDrawer(P[p.id], S.dr.req); else reqDrawer(P[p.id], null); }
        }, false, [[p.id, cid, idx]]);
      });
      return;
    }
    var code = errCode(r);
    if (r.status === 401 || r.status === 403) { closeDlg(); return liveFail(r); }
    if (code === 'stale' || code === 'not_allowed' || code === 'superseded') return liveStale(T, p, c, draft, r);
    dlgBusy(false);
    if (r.status === 429) dlgErr('You have sent a lot of messages. Try again in a little while.');
    else if (code === 'no_change') dlgErr('That is the same as the current offer. Change the amount or the days.');
    else if (r.net || r.status >= 500) dlgErr('We could not send that. Check your connection and try again. Your message is still here.');
    else dlgErr(errText(r) || 'Something went wrong. Try again.');
  });
}
/* the thread moved while the client was writing: show the new thread, keep her words */
function liveStale(T, p, c, draft, r) {
  liveFetch(function (ok) {
    if (!ok) return;
    var p2 = P[p.id], c2 = c ? pdCr(p2, c.id) : null, sn = studioName();
    render('soft');
    var dr = $('#dReq'); if (dr.open) { if (S.dr.req) reqDrawer(p2, S.dr.req); else reqDrawer(p2, null); }
    if (!dlgStillOk(T, p2, c2)) { closeDlg(); toast((c ? c.id : 'This request') + ' changed while you were writing. We have updated it.'); return; }
    openDlg(T, { pid: p.id, cid: c ? c.id : null });
    if (draft.tx && $('#f-tx')) $('#f-tx').value = draft.tx;   // her words stay; the amounts start again from the new quote
    if (draft.ti && $('#f-ti')) $('#f-ti').value = draft.ti;
    syncDlg(); dlgErr(c ? sn + ' wrote on ' + c.id + ' while you were typing. Have a look at the thread, then send again.' : 'Things changed while you were typing. Check, then send again.', 'info');
  });
}

