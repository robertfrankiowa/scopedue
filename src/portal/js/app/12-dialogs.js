/* ───── Dialogs: the actions that need no code ───── */
var DL = null;
function openDlg(type, ctx) {
  var d = $('#dDlg'), p = P[ctx.pid || (S.route.k === 'p' ? S.route.id : '')], c = ctx.cid && p ? pdCr(p, ctx.cid) : null, sn = studioName(), t, sub = '', ref = '', f = '', go = 'Send', cls = 'solid';
  DL = { type: type, pid: p ? p.id : null, cid: c ? c.id : null, on: ctx.on || '', busy: false, seen: c ? c.entries.length - 1 : 0, key: LIVEON ? liveKey() : '', pics: [] };
  if (type === 'counter') {
    var q = pdQuoteEntry(c); DL.q = q;
    t = 'Suggest different terms'; sub = 'Send ' + sn + ' the amount or timing you would be comfortable with. ' + sn + ' can accept it or reply with a new quote.';
    ref = '<div class="ref"><span>' + (q.ty === 'counter' ? 'Counter offer' : 'Quote') + ' on <b>' + c.id + '</b></span><b>' + esc(amtTxt(q.amt, q.days).replace('+', '')) + '</b></div>';
    f = '<div class="two2"><label class="fld" id="fa"><span>Amount <em translate="no">(' + esc(pCur()) + ')</em></span><input id="f-amt" inputmode="numeric" autocomplete="off" value="' + (q.amt || 0) + '"><i class="em" hidden></i></label><label class="fld" id="fd"><span>Extra days</span><input id="f-days" inputmode="numeric" autocomplete="off" value="' + (q.days || 0) + '"><i class="em" hidden></i></label></div>' +
      '<label class="fld"><span>Message <em>(optional)</em></span><textarea id="f-tx" maxlength="1000" placeholder="For example: we can drop the email reminders if that lowers the price."></textarea></label>';
    go = 'Send suggestion';
  } else if (type === 'decline') {
    DL.wd = !isQuote(c);   // CONTRACT 82: with no quote on the table, it is your own request you take back
    t = DL.wd ? 'Withdraw this request' : 'Decline this change'; sub = DL.wd ? 'You take back ' + c.id + '. Your Scope and delivery stay as agreed. You can still write to ' + sn + ' afterwards.' : 'Your Scope and delivery stay as agreed. This closes ' + c.id + '. You can still write to ' + sn + ' afterwards.';
    f = '<label class="fld"><span>Reason <em>(optional)</em></span><textarea id="f-tx" maxlength="1000" placeholder="A line is enough."></textarea></label>'; go = DL.wd ? 'Withdraw' : 'Decline'; cls = 'solid danger';
  } else if (type === 'ask') {
    var onS = !c; t = 'Ask a question';
    var l = p ? pdLatest(p) : null; if (onS && !l) { toast('There is nothing to ask about yet.'); return; }
    sub = 'It goes on ' + (c ? c.id : 'Scope v' + l.v) + ' so the answer stays on record.';
    ref = '<div class="ref"><span>On</span><b>' + esc(c ? c.id + ' · ' + c.t : 'Scope v' + l.v) + '</b></div>';
    f = '<label class="fld"><span>Your question</span><textarea id="f-tx" maxlength="1000" placeholder="What would you like to know?" required></textarea></label>' + picFld(); go = 'Send question';
  } else if (type === 'note') {
    t = c && pdCrState(c) === 'client' ? 'Reply to ' + sn : 'Write to ' + sn; sub = 'It goes on ' + c.id + '.' + (pdCrState(c) === 'declined' ? ' Writing here reopens the request for ' + sn + '.' : '');
    ref = '<div class="ref"><span>On</span><b>' + esc(c.id + ' · ' + c.t) + '</b></div>';
    f = '<label class="fld"><span>Your message</span><textarea id="f-tx" maxlength="1000" required></textarea></label>' + picFld(); go = 'Send';
  } else if (type === 'dispute') {   // v108 (65): where you stand, on a request or on a warranty problem answered Not covered
    var gvv = dsGov(p), lines = gvv ? gvv.items.filter(function (x) { return x.sec === 'in' || x.sec === 'out'; }) : [];
    DL.bug = ctx.bug != null ? ctx.bug : null;
    t = DL.bug != null ? 'I think it is covered' : 'We disagree'; sub = 'Say what you think it is and why. ' + sn + ' sees it beside their view. ScopeDue decides nothing: it ends when you accept a quote or decline.';
    if (c) ref = '<div class="ref"><span>On</span><b>' + esc(c.id + ' · ' + c.t) + '</b></div>';
    f = (DL.bug != null ? '' : '<fieldset class="fld ms-pick"><span>What do you think it is?</span><label class="ms-opt"><input type="radio" name="f-pos" value="fix" checked><span><b>A fix owed under the agreement</b><small>It was promised, so it is done at no extra cost.</small></span></label><label class="ms-opt"><input type="radio" name="f-pos" value="change"><span><b>New or different work</b><small>It was not promised, so it is a change.</small></span></label></fieldset>') +
      (lines.length ? '<label class="fld"><span>Which part of the Scope? <em>(optional)</em></span><select id="f-ref" class="fsel"><option value="">None in particular</option>' + lines.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc((x.sec === 'out' ? 'Not included: ' : '') + x.t) + '</option>'; }).join('') + '</select></label>' : '') +
      '<label class="fld"><span>Why?</span><textarea id="f-tx" maxlength="1000" required></textarea></label>' + picFld(); go = 'Send';
  } else if (type === 'newquote') {
    t = 'Ask for a new quote'; sub = 'The quote on ' + c.id + ' has expired. ' + sn + ' will be asked to send a new one.';
    f = '<label class="fld"><span>Message <em>(optional)</em></span><textarea id="f-tx" maxlength="1000" placeholder="Anything that has changed since the first quote?"></textarea></label>'; go = 'Ask for a new quote';
  } else {
    t = 'Request a change'; sub = 'Describe what you would like added or changed. ' + sn + ' will reply with a quote or a question. Nothing is agreed until you approve it.';
    f = '<label class="fld" id="fn"><span>What do you need?</span><input id="f-ti" maxlength="80" placeholder="A few words, for example: Gift cards"><i class="em" hidden></i></label><label class="fld"><span>Details</span><textarea id="f-tx" maxlength="1000" placeholder="Tell us what you have in mind and why."></textarea></label>' + picFld(); go = 'Send request';
  }
  d.innerHTML = '<div class="dlg-in"><button type="button" class="dlg-x" data-a="dclose" aria-label="Close">' + IC('x', 18, 1.8) + '</button><h3 class="dlg-t" id="dlgT">' + esc(t) + '</h3><p class="sub">' + esc(sub) + '</p>' + ref + '<form id="dform" novalidate>' + f + '<p class="dlg-e" id="dErr" role="alert" hidden></p><div class="dlg-f"><button type="button" class="ghost" data-a="dclose">Cancel</button><button type="submit" class="' + cls + '" id="dgo">' + esc(go) + '</button></div></form></div>';
  d.setAttribute('aria-labelledby', 'dlgT'); openD(d); picPaint(); syncDlg();
  var first = $('textarea,input', d); if (first && type !== 'counter') setTimeout(function () { first.focus(); }, 60);
}
function numOf(v, max) { v = String(v).trim().replace(/[\u00a0\u202f]/g, ' '); if (v === '') return { n: 0 }; var g = /^\d{1,3}([,. ])\d{3}(\1\d{3})*$/.exec(v); if (g) v = v.split(g[1]).join('');   /* 101: 12.000.000 is twelve million */
  if (!/^\d+$/.test(v)) return { err: 'Whole numbers only' }; if (+v > max) return { err: 'Too large' }; return { n: +v }; }
function syncDlg() {
  var d = $('#dDlg'), go = $('#dgo'), tx = $('#f-tx'), ok = true, T = DL.type;
  if (!go) return;
  if (DL.busy || DL.picBusy) { go.disabled = true; return; }   // while it is sending, typing cannot send it again; v102: nor before the pictures are ready
  if (MS_DLG[T]) { go.disabled = !msDlgOk(); return; }
  if (T === 'counter') {
    var a = numOf($('#f-amt').value, 1e12), dd = numOf($('#f-days').value, 365);
    [['fa', a], ['fd', dd]].forEach(function (x) { var el = $('#' + x[0]), em = $('.em', el); el.classList.toggle('err', !!x[1].err); em.hidden = !x[1].err; em.textContent = x[1].err || ''; });
    ok = !a.err && !dd.err && (a.n !== (DL.q.amt || 0) || dd.n !== (DL.q.days || 0));
  } else if (T === 'new') ok = $('#f-ti').value.trim().length > 1 && tx.value.trim().length > 1;
  else if (T === 'ask' || T === 'note') ok = tx.value.trim().length > 0;
  else if (T === 'dispute') ok = tx.value.trim().length > 1;
  go.disabled = !ok;
}
/* v102 (59): the demo's last entry carries what the client added, as the server's would */
function picDemo(p, c) { var e = c.entries[c.entries.length - 1], ps = picMeta(); if (!ps.length) return; e.pics = ps; picKeep('e|' + p.id + '|' + c.id + '|' + (c.entries.length - 1)); }
function closeDlg(after) { closeD($('#dDlg'), after); }
function addEntry(p, c, e) { e.at = stamp(); e.ts = now(); e.fresh = true; c.entries.push(e); }
/* what the client is told after each action; the same words in the demo and against the server */
function dlgMsgs(T, c, x) {
  var sn = studioName();
  if (T === 'counter') return { msg: 'Sent to ' + sn + '. They will reply on ' + c.id + '.', last: { t: 'You suggested ' + (x.a ? money(x.a) : 'no extra cost') + (x.dd ? ' and +' + dayw(x.dd) : ''), d: 'On ' + c.id + '. ' + sn + ' will reply there.' } };
  if (T === 'decline' && DL && DL.wd) return { msg: 'Withdrawn. Your Scope and delivery stay as agreed.', last: { t: 'You withdrew ' + c.id, d: 'Your Scope and delivery stay as agreed. If you change your mind, write to ' + sn + ' on the request.' } };
  if (T === 'decline') return { msg: 'Declined. Your Scope and delivery stay as agreed.', last: { t: 'You declined ' + c.id, d: 'Your Scope and delivery stay as agreed. If you change your mind, write to ' + sn + ' on the request.' } };
  if (T === 'ask') return { msg: 'Question sent. ' + sn + ' will answer on ' + x.id + '.', last: { t: 'You asked a question', d: 'On ' + x.id + '. ' + sn + ' will answer there.' } };
  if (T === 'note') return { msg: x.reopen ? 'Sent. ' + c.id + ' is open again for ' + sn + '.' : 'Sent to ' + sn + '.', last: { t: x.reopen ? 'You reopened ' + c.id : 'You replied on ' + c.id, d: sn + ' will answer there.' } };
  if (T === 'dispute') return { msg: 'Sent. ' + sn + ' sees where you stand.', last: { t: 'You said where you stand on ' + x.id, d: 'It ends when you accept a quote or decline.' } };
  if (T === 'newquote') return { msg: 'Asked. ' + sn + ' will send a new quote on ' + c.id + '.', last: { t: 'You asked for a new quote', d: 'On ' + c.id + '. ' + sn + ' will reply there.' } };
  return { msg: 'Request sent. ' + sn + ' will reply with a quote or a question.', last: { t: 'You asked for a change', d: x.id + ' · ' + x.title + '. ' + sn + ' will reply with a quote or a question.' } };
}
function submitDlg() {
  if (MS_DLG[DL.type]) return msSubmit();
  if (LIVEON) return liveSubmit();
  var T = DL.type, p = P[DL.pid], c = DL.cid ? pdCr(p, DL.cid) : null, tx = ($('#f-tx') || {}).value, m, x = {};
  tx = tx ? tx.trim() : '';
  if (T === 'counter') {
    x.a = numOf($('#f-amt').value, 1e12).n; x.dd = numOf($('#f-days').value, 365).n;
    addEntry(p, c, { w: 'c', ty: 'counter', tx: tx, amt: x.a, days: x.dd });
  } else if (T === 'decline') {
    addEntry(p, c, { w: 'c', ty: 'decline', tx: tx || 'Declined.' });
  } else if (T === 'ask') {
    if (c) addEntry(p, c, { w: 'c', ty: 'question', tx: tx });
    else {
      var l = pdLatest(p), n = p.crs.reduce(function (mx, y) { return Math.max(mx, pdCrNum(y)); }, 0) + 1;
      c = { id: 'CR-' + ('00' + n).slice(-3), t: 'Question about Scope v' + l.v, base: l.v, adds: false, touches: 0, entries: [{ w: 'c', ty: 'question', at: stamp(), ts: now(), tx: tx, fresh: true }], cmp: null }; p.crs.push(c);
    }
    picDemo(p, c);
    x.id = c.id;
  } else if (T === 'note') {
    x.reopen = pdCrState(c) === 'declined'; addEntry(p, c, { w: 'c', ty: 'note', tx: tx }); picDemo(p, c);
  } else if (T === 'dispute') {   // v108 (65): the demo writes it as the server would
    var pos = (document.querySelector('input[name="f-pos"]:checked') || {}).value || 'fix', rf = ($('#f-ref') || {}).value || '';
    if (DL.bug != null) {
      var l3 = pdLatest(p), n3 = p.crs.reduce(function (mx, y) { return Math.max(mx, pdCrNum(y)); }, 0) + 1, bev = (p.mev || [])[DL.bug] || { tx: '' };
      c = { id: 'CR-' + ('00' + n3).slice(-3), t: ('Not covered: ' + bev.tx).slice(0, 80), base: l3 ? l3.v : 0, adds: 1, touches: 1, entries: [{ w: 'c', ty: 'dispute', at: stamp(), ts: now(), tx: tx, pos: 'fix', bug: DL.bug, fresh: true }], cmp: null };
      if (rf) c.entries[0].ref = rf; p.crs.push(c);
    } else { var de = { w: 'c', ty: 'dispute', tx: tx, pos: pos }; if (rf) de.ref = rf; addEntry(p, c, de); }
    picDemo(p, c); x.id = c.id;
  } else if (T === 'newquote') {
    addEntry(p, c, { w: 'c', ty: 'note', tx: (tx ? tx + '\n\n' : '') + 'The quote has expired. Could you send a new one?' });
  } else {
    var title = $('#f-ti').value.trim(), l2 = pdLatest(p), n2 = p.crs.reduce(function (mx, y) { return Math.max(mx, pdCrNum(y)); }, 0) + 1;
    c = { id: 'CR-' + ('00' + n2).slice(-3), t: title, base: l2 ? l2.v : 0, adds: true, touches: 1, entries: [{ w: 'c', ty: 'request', at: stamp(), ts: now(), tx: tx, fresh: true }], cmp: null }; p.crs.push(c); picDemo(p, c);
    x.id = c.id; x.title = title;
  }
  m = dlgMsgs(T, c, x);
  S.last[p.id] = m.last; S.sel = null; S.done = null;
  closeDlg(function () {
    ensureHashes(function () {
      render('soft'); toast(m.msg);
      var dr = $('#dReq'); if (dr.open) { if (S.dr.req) reqDrawer(p, S.dr.req); else reqDrawer(p, null); }
    });
  });
}

