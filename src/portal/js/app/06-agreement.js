/* ───────── v60: the agreement, deliveries and the clocks (CONTRACT.md, section 19). The model is the shared block (sm*) ───────── */
function msApprOf(v) { return v && v.appr ? { ts: (v.rec && v.rec.ts) || v.apts || v.ats || 0, by: String(v.appr).split(' · ')[0], ip: v.rec ? v.rec.ip : '', fp: v.fp } : null; }
function msM(p) { return smState({ ref: p.id, vers: p.vers, crs: p.crs, ev: p.mev || [], now: now(), appr: msApprOf }); }
function msV2(p) { return p.vers.some(smV2); }
function msAnyAppr(p) { return p.vers.some(function (v) { return !!v.appr; }) && !msEnded(p); }
function msEnded(p) { if (!msV2(p)) return null; var M = msM(p); return M.gov && M.cl ? M.cl : null; }
var MS_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function msWhen(ts) { var d = new Date(ts); return MS_WD[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ', ' + clock(d); }
function msDay(ts) { var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()]; }
function msNames() { return { client: cl().first || cl().name, studio: studioName(), money: money }; }
function msStText(m) {
  if (m.st === 'accepted') return (m.deemed ? 'Accepted by default ' : 'Accepted ') + msDay(m.at);
  if (m.st === 'review') return 'Your review until ' + msWhen(m.ends);
  if (m.st === 'back') return m.resp && m.resp.ty === 'notmet' ? 'Being fixed' : 'Changes in progress';
  if (m.st === 'late') return 'Late ' + dayw(m.late) + (m.notice && m.notice.open ? ' · flagged' : '');
  if (m.st === 'notdelivered') return 'Not delivered after notice';
  return 'Due ' + smIsoLbl(m.eff, true);
}
function msChip(m) {
  var c = m.st === 'accepted' ? 'ok' : m.st === 'review' ? 'need' : m.st === 'late' || m.st === 'notdelivered' ? 'late' : '';
  var t = m.st === 'accepted' ? (m.deemed ? 'Accepted by default' : 'Accepted') : m.st === 'review' ? 'Needs your review' : m.st === 'back' ? 'With ' + studioName() : m.st === 'late' ? (m.notice && m.notice.open ? 'Late · flagged' : 'Late') : m.st === 'notdelivered' ? 'Not delivered' : 'Upcoming';
  return '<span class="chip' + (c ? ' ' + c : '') + '">' + esc(t) + '</span>';
}
/* what the client can be asked for, on the delivery record */
function msActions(p) {
  var out = []; if (!msV2(p)) return out;
  var M = msM(p); if (!M.gov || M.cl) return out;
  M.ms.forEach(function (m) {
    if (m.st === 'review') out.push({ kind: 'review', pid: p.id, key: 'ms:' + p.id + ':' + m.id, m: m });
    else if (m.st === 'late' && smCan.flag(M, m.id)) out.push({ kind: 'late', pid: p.id, key: 'late:' + p.id + ':' + m.id, m: m });
  });
  if (smCan.end(M)) { var nd = M.ms.filter(function (m) { return m.st === 'notdelivered'; })[0]; out.push({ kind: 'nd', pid: p.id, key: 'nd:' + p.id + ':' + nd.id, m: nd }); }
  M.ins.forEach(function (n) { if ((n.st === 'late' || n.st === 'due') && smCan.sent(M, n.id)) out.push({ kind: 'input', pid: p.id, key: 'in:' + p.id + ':' + n.id, n: n }); });
  return out;
}
/* the stepper: the agreed milestones instead of five fixed phases */
function msStepsHTML(p) {
  var M = msM(p), ms = M.ms, n = ms.length, w = n > 1 ? 100 / (n - 1) : 0, lines = '', li = '';
  ms.forEach(function (m, i) {
    if (i < n - 1) lines += '<span class="ln' + (m.st === 'accepted' ? ' on' : '') + '" style="--i:' + i + ';left:calc(' + (i * w) + '% + 14px);width:calc(' + w + '% - 28px)"><i style="--ld:' + (0.7 + i * 0.7).toFixed(1) + 's"></i></span>';
    var st = m.st === 'accepted' ? 'done' : i === M.cur ? 'now' : '';
    li += '<li' + (st ? ' class="' + st + (m.st === 'late' || m.st === 'notdelivered' ? ' bad' : '') + '"' : '') + (st === 'now' ? ' aria-current="step"' : '') + ' style="--i:' + i + ';left:' + (n > 1 ? i * w : 50) + '%;--cd:' + (0.45 + i * 0.45).toFixed(2) + 's"><span class="c">' + (st === 'done' ? IC('check', 14, 2.6) : '') + '</span><span class="t">' + esc(m.t) + '</span><span class="s">' + esc(m.st === 'accepted' ? 'Accepted' : m.st === 'review' ? 'In review' : m.st === 'late' ? 'Late' : m.st === 'notdelivered' ? 'Not delivered' : m.st === 'back' ? 'In progress' : smIsoLbl(m.eff)) + '</span></li>';
  });
  return '<div class="steps ms-steps" role="group" aria-label="Milestones"><div class="steps-in">' + lines + '<ol>' + li + '</ol></div></div>';
}
/* v103 (CONTRACT 61): the delivery's capsule: the build, and each step with what the client answered on it */
function capHTML(p, m) {
  var c = m.cap; if (!c) return '';
  var done = c.res.filter(Boolean).length, can = !msBad(p);
  return '<div class="cap" id="cap-' + esc(m.id) + '"><div class="cap-h"><h3>What to check</h3>' + (c.b ? '<span class="mono cap-b">' + esc(c.b) + '</span>' : '') + '<span class="cap-n">' + done + ' of ' + c.steps.length + ' checked</span></div><ol class="cap-l">' + c.steps.map(function (t, i) {
    var r = c.res[i], st = !r ? '<span class="chip">Not checked yet</span>' : r.ok ? '<span class="chip ok">Works</span>' : '<span class="chip late">An issue</span>';
    var said = r && !r.ok ? '<p class="cap-tx">' + esc(r.e.tx) + '</p>' + picsHTML(r.e.pics, 'm|' + p.id + '|' + r.e.i) : '';
    var acts = can ? '<div class="cap-a"><button type="button" class="sbtn" data-a="ckok" data-pid="' + p.id + '" data-m="' + esc(m.id) + '" data-s="' + (i + 1) + '"' + (r && r.ok ? ' aria-pressed="true" disabled' : '') + '>Works</button><button type="button" class="sbtn quiet" data-a="ckissue" data-pid="' + p.id + '" data-m="' + esc(m.id) + '" data-s="' + (i + 1) + '">Report an issue</button></div>' : '';
    return '<li data-s="' + (i + 1) + '"><div class="cap-t"><span class="cap-i">' + (i + 1) + '</span><span>' + esc(t) + '</span>' + st + '</div>' + said + acts + '</li>';
  }).join('') + '</ol></div>';
}
/* Works on a step: one click, a check event on the record. v117 (84): once, while the step's last answer is Works and while one is on its way
   (two quick clicks recorded step 1 twice) */
var CK_BUSY = {};
function msCheckOk(pid, mid, n) {
  var p = P[pid], M = msM(p), sn = studioName(), m = smMs(M, mid), r0 = m && m.cap ? m.cap.res[n - 1] : null, bk = pid + '|' + mid + '|' + n;
  if (!smCan.check(M, mid, n) || (r0 && r0.ok) || CK_BUSY[bk]) return;
  if (LIVEON) {
    CK_BUSY[bk] = 1;
    apiCall('POST', '/v1/respond', { action: 'check', project: p.id, m: mid, k: 's' + n + ':ok', n: (p.mev || []).length, key: liveKey() }).then(function (r) {
      delete CK_BUSY[bk];
      if (r.status === 201) { liveFetch(function (ok) { if (ok) { render('soft'); toast('Thanks. ' + sn + ' sees that step ' + n + ' works.'); } }); return; }
      if (r.status === 401 || r.status === 403) return liveFail(r);
      liveFetch(function (ok) { if (ok) { render('soft'); toast(errCode(r) === 'stale' ? sn + ' updated the project. Have a look, then try again.' : (errText(r) || 'We could not send that. Try again.')); } });
    });
    return;
  }
  p.mev = p.mev || []; p.mev.push({ i: p.mev.length, w: 'c', ty: 'check', m: mid, v: M.gov ? M.gov.v : 0, at: stamp(), ts: now(), tx: '', link: '', k: 's' + n + ':ok', fresh: true });
  msChain(p, function () { render('soft'); toast('Thanks. ' + sn + ' sees that step ' + n + ' works.'); });
}
/* the decision cards for the delivery record */
function msItemsOf(M, mid) { return smItemsOf(M.gov, mid); }
function reviewDec(p, a) {
  var M = msM(p), m = smMs(M, a.m.id) || a.m, sn = studioName(), R = M.rules, last = m.last, its = msItemsOf(M, m.id);
  var left = '<div class="dec-l">' + topRow(false, 'Needs your review', 'Answer by <b>' + esc(msWhen(m.ends)) + '</b>') +
    '<h2 id="dec-title">Review ' + esc(m.t) + '</h2>' + '<p class="lead">' + esc(sn) + ' delivered it ' + esc(msWhen(last.ts)) + '.' + (last.tx ? ' “' + esc(last.tx) + '”' : '') + '</p><hr>' +
    '<ul class="incl ms-ok">' + its.map(function (x) { return '<li><span class="ck">' + IC('check', 13, 2.6) + '</span><span><b>' + esc(x.t) + '</b>' + (x.ok ? '<small>Done when: ' + esc(x.ok) + '</small>' : '') + '</span></li>'; }).join('') + '</ul>' + capHTML(p, m) +
    '<div class="acts">' + (last.link ? '<div class="act">' + IC('arrow', 22) + '<a class="lk" href="' + esc(webUrl(last.link)) + '" target="_blank" rel="noopener noreferrer">Open the delivery</a></div>' : '') + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="scope"') + '</div>' +
    '<p class="opt">With no answer by ' + esc(msWhen(m.ends)) + ', it counts as accepted, as agreed in the Scope.</p></div>';
  var rows = [['Delivered', msWhen(last.ts)], ['Revisions', m.used + ' of ' + R.rpm + ' used']];
  if (m.pay) rows.push(['Its share', m.pay + '%' + (M.price != null ? ' · ' + money(m.amt) : '')]);
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">If you accept ' + esc(m.t) + '</h3>' + rowsHTML(rows) + '<div class="rule"></div>' +
    rowsHTML([].concat(m.pay ? [['Share due', R.pd ? dayw(R.pd) + ' after you accept' : 'When you accept']] : [], [['Expected delivery', smIsoLbl(M.expected)]]), 'b') +
    '<div class="spacer"></div>' + (msBad(p) ? badNote() : '<button type="button" class="btn p" id="approveBtn" data-a="approve">' + arrowBtnLabel('Accept ' + m.t) + '</button>') +
    '<div class="ms-two">' + (m.left > 0 ? '<button type="button" class="btn s" data-a="changes" data-pid="' + p.id + '" data-m="' + m.id + '">I’d like changes</button>' : '<button type="button" class="btn s" data-a="new">Request a change</button>') +
    (its.some(function (x) { return x.ok; }) ? '<button type="button" class="btn s" data-a="notmet" data-pid="' + p.id + '" data-m="' + m.id + '">Not as agreed</button>' : '') + '</div>' +
    '<p class="fine">' + (m.left > 0 ? 'Changes use round ' + (m.used + 1) + ' of ' + R.rpm + '. “Not as agreed” uses none. ' : 'No revision rounds are left on this milestone. ') + PRIV + '</p></div>';
  return left + panelShell(pa, a, p);
}
function lateDec(p, a) {
  var M = msM(p), m = smMs(M, a.m.id) || a.m, sn = studioName(), R = M.rules;
  var left = '<div class="dec-l">' + topRow(false, 'Late', 'Was due <b>' + esc(smIsoLbl(m.eff)) + '</b>', true) +
    '<h2 id="dec-title">' + esc(m.t) + ' is ' + dayw(m.late) + ' late</h2><p class="lead">It was due ' + esc(smIsoLbl(m.eff, true)) + ' and has not been delivered. You can flag it as missed: ' + esc(sn) + ' then has ' + dayw(R.cure) + ' to deliver it or agree a new date with you.</p><hr>' +
    peekHTML([['Agreed', smIsoLbl(m.base) + (m.eff !== m.base ? ', moved to ' + smIsoLbl(m.eff) + ' by approved changes, late items or a pause' : '')], ['Then', 'If it is still not delivered when the fix period ends, the record says so, and you can end the project.']]) +
    '<div class="acts">' + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="scope"') + '</div></div>';
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">Flag ' + esc(m.t) + ' as missed</h3>' + rowsHTML([['Due', smIsoLbl(m.eff)], ['Late', dayw(m.late)], ['Fix period', dayw(R.cure) + ' from your flag']]) +
    '<div class="spacer"></div><button type="button" class="btn p" data-a="flag" data-pid="' + p.id + '" data-m="' + m.id + '">' + arrowBtnLabel('Flag as missed') + '</button><p class="fine">' + esc(sn) + ' is emailed. Nothing is approved or paid by flagging.</p></div>';
  return left + panelShell(pa);
}
function ndDec(p, a) {
  var M = msM(p), m = smMs(M, a.m.id) || a.m, sn = studioName();
  var left = '<div class="dec-l">' + topRow(false, 'Not delivered', 'Fix period ended <b>' + esc(msDay(m.notice.ends)) + '</b>', true) +
    '<h2 id="dec-title">' + esc(m.t) + ' was not delivered after notice</h2><p class="lead">You flagged it ' + esc(msWhen(m.notice.e.ts)) + '. The fix period ended ' + esc(msWhen(m.notice.ends)) + ' without a delivery or a new date. You can end the project here, on the record.</p><hr>' +
    peekHTML([['As agreed', 'If the project ends early, you pay for accepted milestones, and payments for milestones not delivered are returned.'], ['The record', 'Download it any time. It has the agreed Scope, every delivery and every notice, with their fingerprints.']]) +
    '<div class="acts">' + actLink('print', 'Download the record', 'data-a="record" data-pid="' + p.id + '"') + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="scope"') + '</div></div>';
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">End the project</h3>' + rowsHTML([['Milestone', m.t], ['Flagged', msDay(m.notice.e.ts)], ['Fix period ended', msDay(m.notice.ends)]]) +
    '<div class="spacer"></div><button type="button" class="btn p" data-a="endp" data-pid="' + p.id + '">' + arrowBtnLabel('End the project') + '</button><p class="fine">' + esc(sn) + ' is told at once. You can still write to them.</p></div>';
  return left + panelShell(pa);
}
function inputDec(p, a) {
  var M = msM(p), n = smIn(M, a.n.id) || a.n, sn = studioName();
  var left = '<div class="dec-l">' + topRow(false, n.st === 'late' ? 'Late' : 'Due soon', 'Needed by <b>' + esc(smIsoLbl(n.due)) + '</b>', n.st === 'late') +
    '<h2 id="dec-title">Send ' + esc(n.t) + '</h2><p class="lead">' + esc(sn) + ' needs it by ' + esc(smIsoLbl(n.due, true)) + ', as agreed in the Scope. ' + (n.st === 'late' ? 'It is ' + dayw(n.late) + ' late: the dates after it have moved by that much.' : 'If it arrives late, the dates after it move by the days it is late.') + '</p><hr>' +
    '<div class="acts">' + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="scope"') + '</div></div>';
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">Already sent it?</h3>' + rowsHTML([['Needed by', smIsoLbl(n.due)], ['Status', n.st === 'late' ? 'Late ' + dayw(n.late) : 'Not sent yet']]) +
    '<div class="spacer"></div><button type="button" class="btn p" data-a="sent" data-pid="' + p.id + '" data-m="' + n.id + '">' + arrowBtnLabel('I’ve sent it') + '</button><p class="fine">Tell ' + esc(sn) + ' how you sent it. The late days stop counting from now.</p></div>';
  return left + panelShell(pa);
}
/* the milestones and what the client provides, below the record strip */
function msCardHTML(p) {
  if (!msV2(p)) return '';
  var M = msM(p), sn = studioName(); if (!M.gov) return '';
  var R = M.rules;
  var rows = M.ms.map(function (m) {
    /* each fact its own text, so the language layer reads each on its own (one string was taken for "{0} of {1} revisions used") */
    var bits = ['Due ' + smIsoLbl(m.eff, true)]; if (m.pay) bits.push(m.pay + '%' + (M.price != null ? ' · ' + money(m.amt) : '')); bits.push(m.used + ' of ' + R.rpm + ' revisions used');
    var note = m.st === 'review' ? 'Delivered ' + msWhen(m.last.ts) + '. ' : m.st === 'notdelivered' ? 'You flagged it ' + msDay(m.notice.e.ts) + '. The fix period ended ' + msWhen(m.notice.ends) + ' without a delivery or a new date.' : m.notice && m.notice.open && m.st !== 'accepted' ? 'You flagged it ' + msDay(m.notice.e.ts) + '. ' + sn + ' has until ' + msWhen(m.notice.ends) + '.' : m.st === 'accepted' ? (m.deemed ? 'No answer within ' + R.review + ' business days, so it counts as accepted.' : 'You accepted it with an email code.') : '';
    return '<li class="ms-r" data-st="' + m.st + '"><div class="ms-t"><b>' + esc(m.t) + '</b><span class="ms-m">' + bits.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('<i aria-hidden="true">·</i>') + '</span>' + (m.st === 'back' && m.resp && m.resp.pics ? picsHTML(m.resp.pics, 'm|' + p.id + '|' + m.resp.i) : '') + (note ? '<span class="ms-n">' + esc(note) + (m.st === 'review' && m.last.link ? ' <a class="lk" href="' + esc(webUrl(m.last.link)) + '" target="_blank" rel="noopener noreferrer">Open it</a>' : '') + '</span>' : '') + '</div>' + msChip(m) + '</li>';
  }).join('');
  var ins = M.ins.map(function (n) {
    var chip = n.got ? '<span class="chip ok">Received</span>' : n.sent ? '<span class="chip">Sent ' + esc(msDay(n.sent.ts)) + '</span>' : n.st === 'late' ? '<span class="chip late">Late ' + dayw(n.late) + '</span>' : '<span class="chip">By ' + esc(smIsoLbl(n.due)) + '</span>';
    return '<li class="ms-r"><div class="ms-t"><b>' + esc(n.t) + '</b><span class="ms-m"><span>Needed by ' + esc(smIsoLbl(n.due, true)) + '</span>' + (n.late && (n.got || n.sent) ? '<i aria-hidden="true">·</i><span>Arrived ' + dayw(n.late) + ' late</span>' : '') + '</span></div>' + chip + (smCan.sent(M, n.id) ? '<button type="button" class="ghostb" data-a="sent" data-pid="' + p.id + '" data-m="' + n.id + '">I’ve sent it</button>' : '') + '</li>';
  }).join('');
  var banner = M.cl ? '<div class="info' + (M.cl.by === 'c' ? ' late' : '') + '">' + IC('clock', 18) + '<span><b>' + (M.cl.by === 'c' ? 'You ended the project ' : esc(sn) + ' closed the project ') + esc(msWhen(M.cl.ts)) + '.</b> ' + esc(M.cl.e.tx || '') + '</span></div>' :
    M.pz ? '<div class="info warn">' + IC('clock', 18) + '<span><b>' + esc(sn) + ' paused the work ' + esc(msWhen(M.pz.ts)) + '.</b> ' + esc(M.pz.e.tx) + ' Dates move by the days the work is paused.</span></div>' : '';
  /* two columns that keep their own height (a grid row would stretch a short card to its neighbour, or leave a hole beside the
     last one): the long lists left, the short ones right; one column on a narrow screen, in reading order (CSS order) */
  var left = '<div class="bx ms-bx"><div class="bx-h">' + IC('list', 24) + '<h4 id="t-ms">Milestones</h4><button type="button" class="lk2" data-a="record" data-pid="' + p.id + '"><span>Download the record</span>' + IC('arrow', 15, 1.6) + '</button></div><ul class="ms-l">' + rows + '</ul></div>' + payHTML(p, M);
  var right = (M.ins.length ? '<div class="bx ci-bx"><div class="bx-h">' + IC('folder', 24) + '<h4>You provide</h4></div><ul class="ms-l">' + ins + '</ul><p class="bx-p" style="margin-top:10px">Late items move the dates after them, a day for each day late.</p></div>' : '') + hoHTML(p, M) + waHTML(p, M);
  return '<section class="msx rv" style="--d:1.15s" aria-labelledby="t-ms" id="ms-card">' + banner + '<div class="msx-g' + (right ? '' : ' one') + '"><div class="msx-c">' + left + '</div>' + (right ? '<div class="msx-c">' + right + '</div>' : '') + '</div></section>';
}
/* v107 (CONTRACT 64): the warranty, and problems after acceptance: Report a problem on an accepted milestone, where each stands,
   and It works now on a fix */
function waHTML(p, M) {
  var acc = M.ms.filter(function (m) { return m.st === 'accepted'; }); if (!M.wa && !acc.length && !(M.bugs || []).length) return '';
  var sn = studioName(), can = !msBad(p), w = M.wa;
  var head = !w ? 'The agreement has no warranty. ' + sn + ' decides on each problem.' : !w.start ? w.t + '. ' + w.days + ' days, from when the last milestone is accepted.' : w.on ? w.t + '. Until ' + dayLbl(w.ends) + '.' : w.t + '. It ended ' + dayLbl(w.ends) + '.';
  var rows = (M.bugs || []).slice().reverse().map(function (b) {
    var m = smMs(M, b.m), st = b.st === 'confirmed' ? '<span class="chip ok">Fixed, you confirmed it</span>' : b.st === 'fixed' ? '<span class="chip need">Fixed: check it</span>' : b.st === 'notbug' ? '<span class="chip">Not covered</span>' : '<span class="chip">With ' + esc(sn) + '</span>';
    var said = b.ans ? '<span class="ms-n">' + esc(b.ans.tx || '') + (b.ans.link ? ' ' : '') + (b.ans.link ? '<a class="lk" href="' + esc(webUrl(b.ans.link)) + '" target="_blank" rel="noopener noreferrer">Open it</a>' : '') + '</span>' : '';
    var cov = w && !b.covered ? '<span class="ms-n">Reported after the warranty ended.</span>' : '';
    var btn = can && b.st === 'fixed' ? '<button type="button" class="ghostb" data-a="fixok" data-pid="' + p.id + '" data-m="' + esc(b.m) + '" data-b="' + b.i + '">It works now</button>' : '';
    if (b.st === 'notbug') { var dc = (p.crs || []).filter(function (x) { return x.entries[0] && x.entries[0].bug === b.i; })[0]; btn = dc ? '<button type="button" class="ghostb" data-a="req" data-pid="' + p.id + '" data-cid="' + dc.id + '">Disputed: ' + dc.id + '</button>' : can ? '<button type="button" class="ghostb" data-a="bugdispute" data-pid="' + p.id + '" data-b="' + b.i + '">I think it is covered</button>' : ''; }   // v108 (65)
    return '<li class="ms-r" data-bug="' + b.i + '"><div class="ms-t"><b>' + esc(b.e.tx) + '</b><span>' + esc((m ? m.t : '') + ' · ' + msDay(b.e.ts)) + '</span>' + picsHTML(b.e.pics, 'm|' + p.id + '|' + b.i) + said + cov + '</div>' + st + btn + '</li>';
  }).join('');
  var rep = can && acc.length ? '<div class="bx-f wa-f"><button type="button" class="ghostb" data-a="bug" data-pid="' + p.id + '">Report a problem</button></div>' : '';
  return '<div class="bx wa-bx"><div class="bx-h">' + IC('check', 24) + '<h4>Warranty</h4></div><p class="bx-p">' + esc(head) + '</p>' + (rows ? '<ul class="ms-l">' + rows + '</ul>' : '') + rep + '<p class="bx-p" style="margin-top:10px">' + esc('Something new or different is a change: request it, and ' + sn + ' replies with a quote.') + '</p></div>';
}
function msFixOk(pid, mid, bi) {
  var p = P[pid], M = msM(p), sn = studioName(); if (!smCan.fixok(M, bi)) return;
  if (LIVEON) {
    apiCall('POST', '/v1/respond', { action: 'fixok', project: p.id, m: mid, k: 'b' + bi, n: (p.mev || []).length, key: liveKey() }).then(function (r) {
      if (r.status === 201) { liveFetch(function (ok) { if (ok) { render('soft'); toast('Thanks. ' + sn + ' sees that the fix works.'); } }); return; }
      if (r.status === 401 || r.status === 403) return liveFail(r);
      liveFetch(function (ok) { if (ok) { render('soft'); toast(errText(r) || 'We could not send that. Try again.'); } });
    });
    return;
  }
  p.mev = p.mev || []; p.mev.push({ i: p.mev.length, w: 'c', ty: 'fixok', m: mid, v: M.gov ? M.gov.v : 0, at: stamp(), ts: now(), tx: '', link: '', k: 'b' + bi, fresh: true });
  msChain(p, function () { render('soft'); toast('Thanks. ' + sn + ' sees that the fix works.'); });
}
/* v106 (CONTRACT 63): what you receive at handoff: each line of the Scope, whether it was handed over, and I received it */
function hoHTML(p, M) {
  if (!(M.ho || []).length) return '';
  var sn = studioName(), can = !msBad(p);
  var lastWith = null;
  var rows = M.ho.map(function (h) {
    var m = smMs(M, h.m), st, note = '', head = '';
    if (h.recv) st = '<span class="chip ok">Received ' + esc(msDay(h.recv.ts)) + '</span>';
    else if (h.gave) { st = '<span class="chip need">Handed over ' + esc(msDay(h.gave.ts)) + '</span>'; note = (h.gave.tx ? '<span class="ms-n">' + esc(h.gave.tx) + '</span>' : '') + (h.gave.link ? '<span class="ms-n"><a class="lk" href="' + esc(webUrl(h.gave.link)) + '" target="_blank" rel="noopener noreferrer">Open it</a></span>' : ''); }
    else { var w = m ? m.t : 'the last milestone'; st = ''; if (w !== lastWith) head = '<li class="ms-gh">Handed over with ' + esc(w) + '</li>'; lastWith = w; }
    if (st) lastWith = null;
    var btn = can && smCan.recv(M, h.id) ? '<button type="button" class="ghostb" data-a="recv" data-pid="' + p.id + '" data-m="' + esc(h.id) + '">I received it</button>' : '';
    return head + '<li class="ms-r" data-ho="' + esc(h.id) + '"><div class="ms-t"><b>' + esc(h.t) + '</b>' + note + '</div>' + st + btn + '</li>';
  }).join('');
  return '<div class="bx ho-bx"><div class="bx-h">' + IC('arrow', 24) + '<h4>You receive</h4></div><ul class="ms-l">' + rows + '</ul><p class="bx-p" style="margin-top:10px">' + esc(sn + ' hands each of these over as agreed in the Scope. Say when you have it, so the record shows it.') + '</p></div>';
}
/* I received it: one click, a recv event on the record */
function msRecv(pid, id) {
  var p = P[pid], M = msM(p), sn = studioName(), h = smHo(M, id); if (!smCan.recv(M, id)) return;
  if (LIVEON) {
    apiCall('POST', '/v1/respond', { action: 'recv', project: p.id, m: id, n: (p.mev || []).length, key: liveKey() }).then(function (r) {
      if (r.status === 201) { liveFetch(function (ok) { if (ok) { render('soft'); toast('Thanks. ' + sn + ' sees that you received ' + h.t + '.'); } }); return; }
      if (r.status === 401 || r.status === 403) return liveFail(r);
      liveFetch(function (ok) { if (ok) { render('soft'); toast(errCode(r) === 'stale' ? sn + ' updated the project. Have a look, then try again.' : (errText(r) || 'We could not send that. Try again.')); } });
    });
    return;
  }
  p.mev = p.mev || []; p.mev.push({ i: p.mev.length, w: 'c', ty: 'recv', m: id, v: M.gov ? M.gov.v : 0, at: stamp(), ts: now(), tx: '', link: '', k: '', fresh: true });
  msChain(p, function () { render('soft'); toast('Thanks. ' + sn + ' sees that you received ' + h.t + '.'); });
}
/* v104 (CONTRACT 60): the payment schedule, and on a line that is due, I've paid this. What the client says is their words on the
   record; ScopeDue never confirms a payment */
function payHTML(p, M) {
  if (!M.sched.length) return '';
  var sn = studioName(), can = !msBad(p);
  var rows = M.sched.map(function (s) {
    var name = s.k === 'dep' ? 'Due at start' : s.k === 'm' ? s.t + '’s share' : s.t, bits = [];
    if (s.amt) bits.push(money(s.amt)); else if (s.pct) bits.push(s.pct + '%');
    bits.push(s.due ? 'due ' + dayLbl(s.due) : s.k === 'cr' ? 'with ' + (s.with || 'the next milestone') : s.k === 'm' ? 'once it is accepted' : 'once work starts');
    var note = '', r = s.rep;
    if (r && r.ty === 'paid') note = '<span class="ms-n">You said you paid this ' + esc(msDay(r.e.ts)) + (r.e.tx ? ': “' + esc(r.e.tx) + '”' : '') + '. ' + esc(sn) + ' confirms it outside ScopeDue.</span>';
    else if (r && r.ty === 'nopay') note = '<span class="ms-n">' + esc(sn) + ' has not received it yet: “' + esc(r.e.tx) + '”</span>';
    var chip = r && r.ty === 'paid' ? '<span class="chip">You said you paid it</span>' : '';
    var btn = can && smCan.paid(M, s.key) ? '<button type="button" class="ghostb" data-a="paid" data-pid="' + p.id + '" data-m="' + esc(s.key) + '">I’ve paid this</button>' : '';
    return '<li class="ms-r" data-pay="' + esc(s.key) + '"><div class="ms-t"><b>' + esc(name) + '</b><span>' + esc(bits.join(' · ')) + '</span>' + note + '</div>' + chip + btn + '</li>';
  }).join('');
  return '<div class="bx pay-bx"><div class="bx-h">' + IC('clock', 24) + '<h4>Payments</h4></div><ul class="ms-l">' + rows + '</ul><p class="bx-p" style="margin-top:10px">' + esc('Payments are made outside ScopeDue. What you say here goes on the record; ' + sn + ' confirms it where they receive payments.') + '</p></div>';
}
/* History: the delivery record */
function msEvents(p) {
  if (!msV2(p)) return [];
  var M = msM(p), sn = studioName(), out = [];
  (p.mev || []).forEach(function (e, i) {
    var t = e.m ? (smMs(M, e.m) || smIn(M, e.m) || smHo(M, e.m) || { t: '' }).t : '', me = e.w === 'c';
    var text = { deliver: sn + ' delivered ' + t, got: sn + ' received “' + t + '”', pause: sn + ' paused the work', resume: sn + ' resumed the work', close: sn + ' closed the project', accept: 'You accepted ' + t, changes: 'You asked for changes on ' + t, notmet: 'You said ' + t + ' is not as agreed', flag: 'You flagged ' + t + ' as missed', sent: 'You sent “' + t + '”', end: 'You ended the project', check: smCk(e).ok ? 'You said step ' + smCk(e).n + ' of ' + t + ' works' : 'You reported an issue on step ' + smCk(e).n + ' of ' + t, paid: 'You said you paid ' + smPayName(M, e.m), nopay: sn + ' has not received ' + smPayName(M, e.m) + ' yet', gave: sn + ' handed over ' + t, recv: 'You received ' + t, bug: 'You reported a problem in ' + t, fixed: sn + ' fixed a problem in ' + t, notbug: sn + ' said a problem in ' + t + ' is not covered', fixok: 'You confirmed the fix in ' + t }[e.ty];
    var live = !me && e.ty === 'deliver' && (smMs(M, e.m) || {}).st === 'review' && (smMs(M, e.m) || {}).last === e;
    out.push({ k: 'm|' + p.id + '|' + i, pid: p.id, ts: e.ts, who: me ? 'c' : 'y', t: text, d: e.tx ? (e.tx.length > 90 ? e.tx.slice(0, 88) + '…' : e.tx) : e.ty === 'accept' ? 'Verified with an email code.' : '', go: { a: 'ms', pid: p.id }, live: live });
  });
  M.ms.forEach(function (m) { if (m.st === 'accepted' && m.deemed) out.push({ k: 'md|' + p.id + '|' + m.id, pid: p.id, ts: m.at, who: 'y', t: m.t + ' was accepted by default', d: 'No answer within ' + M.rules.review + ' business days of the delivery, as agreed.', go: { a: 'ms', pid: p.id } }); });
  return out;
}
/* the Scope drawer for an agreement: Done when lines, what you provide, milestones with their shares, and the terms in plain words */
function msScopeBody(p, v) {
  var R = v.terms.r, M = msM(p), prev = pdVer(p, v.v - 1), pm = {}, body = '';
  if (prev) prev.items.forEach(function (x) { pm[x.id] = x; });
  var mt = function (id) { var l = v.items.filter(function (x) { return x.sec === 'tl'; }), m = l.filter(function (x) { return x.id === id; })[0]; return (m || l[l.length - 1] || { t: '' }).t; };
  var sec = function (s, label, row) {
    var l = v.items.filter(function (x) { return x.sec === s; }); if (!l.length) return '';
    return '<section class="sc-sec"><h4>' + esc(label) + '<span>' + (prev ? 'compared with v' + prev.v : '') + '</span></h4><ul class="sc-l">' + l.map(function (x) {
      var b = pm[x.id], tag = prev ? (!b ? '<span class="tag new">New</span>' : (b.t !== x.t || b.d !== x.d || (b.ok || '') !== (x.ok || '') || (b.pay || 0) !== (x.pay || 0)) ? '<span class="tag mod">Changed</span>' : '') : '';
      var cr = x.cr ? '<button type="button" class="tag" data-a="req" data-pid="' + p.id + '" data-cid="' + x.cr + '">' + x.cr + '</button>' : '';
      return '<li>' + row(x) + tag + cr + '</li>';
    }).join('') + '</ul></section>';
  };
  body += sec('in', 'Deliverables', function (x) { return '<span class="mk">' + IC('check', 11, 2.6) + '</span><span class="tx">' + esc(x.t) + (x.ok ? '<small class="okl">Done when: ' + esc(x.ok) + '</small>' : '') + '<small><span>With</span> ' + esc(mt(x.m)) + '</small></span>'; });
  body += sec('out', 'Not included', function (x) { return '<span class="mk x">' + IC('x', 11, 2.4) + '</span><span class="tx">' + esc(x.t) + '</span>'; });
  body += sec('wa', 'Warranty', function (x) { return '<span class="mk tl">' + IC('check', 11, 2.6) + '</span><span class="tx">' + esc(x.t) + '<small>' + esc(x.d + ' days after the last milestone is accepted') + '</small></span>'; });   // v107 (64)
  body += sec('ho', 'You receive at handoff', function (x) { return '<span class="mk tl">' + IC('arrow', 11, 2) + '</span><span class="tx">' + esc(x.t) + '<small><span>With</span> ' + esc(mt(x.m)) + '</small></span>'; });   // v106 (63)
  body += sec('ci', 'You provide', function (x) { return '<span class="mk tl">' + IC('folder', 11, 2) + '</span><span class="tx">' + esc(x.t) + '</span><span class="dd">By ' + esc(smIsoLbl(x.d)) + '</span>'; });
  var tlh = sec('tl', 'Milestones', function (x) { return '<span class="mk tl">' + IC('clock', 11, 2) + '</span><span class="tx">' + esc(x.t) + '</span><span class="dd">' + esc(smIsoLbl(x.d)) + (x.pay ? ' · ' + x.pay + '%' + (v.terms.price != null ? ' · ' + money(Math.round(v.terms.price * x.pay / 100)) : '') : '') + '</span>'; });
  if (tlh && R.dep) tlh = tlh.replace('<ul class="sc-l">', '<ul class="sc-l"><li><span class="mk tl">' + IC('clock', 11, 2) + '</span><span class="tx">Due at start<small>Paid to ' + esc(studioName()) + ' outside ScopeDue, when work starts</small></span><span class="dd">' + R.dep + '%' + (v.terms.price != null ? ' · ' + money(Math.round(v.terms.price * R.dep / 100)) : '') + '</span></li>');
  body += tlh;
  body += '<section class="card3" style="margin-top:22px"><h4>What we agreed</h4><dl class="ms-terms">' + (v.terms.price != null ? '<dt>Contract value</dt><dd>' + money(v.terms.price) + '</dd>' : '') +
    smTermsText(R, v.terms.price, msNames(), true).map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + (r[0] === 'Contract' ? '<a class="lk" href="' + esc(webUrl(r[1])) + '" target="_blank" rel="noopener noreferrer">' + esc(r[1]) + '</a>' : esc(r[1])) + '</dd>'; }).join('') + '</dl></section>';
  void M;
  return body;
}
/* a quote on an agreement: hours, an included change, and the milestone it moves */
function msQuoteBits(p, e) {
  if (e.ty !== 'quote') return '';
  var M = msM(p), b = [];
  if (e.inc) b.push('Included change' + (M.gov ? ' · ' + M.inc.total + ' in the agreement' : ''));
  if (e.hrs != null && e.hrs !== '') b.push(e.hrs + ' h' + (M.gov && M.rules.rate ? ' at ' + money(M.rules.rate) + ' an hour' : ''));
  if (e.m && e.days && M.gov) { var m = smMs(M, e.m); if (m) b.push('Moves ' + m.t + ' and what follows'); }
  return b.length ? '<p class="en-x">' + esc(b.join(' · ')) + '</p>' : '';
}
/* is the delivery record intact? (live: checked in this browser) */
function msBad(p) { return LIVEON && p.mevOk === false; }

/* ── the client's answers on the delivery record ── */
function msDlg(type, ctx) {
  var d = $('#dDlg'), p = P[ctx.pid || S.route.id], M = msM(p), sn = studioName(), m = ctx.m ? (smMs(M, ctx.m) || smIn(M, ctx.m)) : null, t, sub = '', ref = '', f = '', go = 'Send', cls = 'solid';
  DL = { type: type, pid: p.id, m: ctx.m || '', n: (p.mev || []).length, busy: false, key: LIVEON ? liveKey() : '', pics: [] };
  if (type === 'changes') {
    t = 'I’d like changes'; sub = 'One list of everything you would like changed on ' + m.t + '. This uses revision round ' + (m.used + 1) + ' of ' + M.rules.rpm + '. If something does not meet a “Done when” line, choose “Not as agreed” instead: that uses no round.';
    f = '<label class="fld"><span>What should change?</span><textarea id="f-tx" maxlength="2000" placeholder="For example: bigger time slots on mobile; show the price next to each service." required></textarea></label>' + picFld(); go = 'Send changes';
  } else if (type === 'notmet') {
    var its = msItemsOf(M, m.id).filter(function (x) { return x.ok; });
    t = 'Not as agreed'; sub = 'Choose the “Done when” line ' + m.t + ' does not meet, and say what is missing. ' + sn + ' then has ' + dayw(M.rules.cure) + ' to fix it. It uses no revision round.';
    f = '<fieldset class="fld ms-pick"><span>Which line is not met?</span>' + its.map(function (x, i) { return '<label class="ms-opt"><input type="radio" name="f-k" value="' + esc(x.id) + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + esc(x.t) + '</b><small>Done when: ' + esc(x.ok) + '</small></span></label>'; }).join('') + '</fieldset>' +
      '<label class="fld"><span>What does not match?</span><textarea id="f-tx" maxlength="2000" required></textarea></label>' + picFld(); go = 'Send';
  } else if (type === 'bug') {   // v107 (64): a problem after acceptance
    var acc = M.ms.filter(function (x) { return x.st === 'accepted'; }), w = M.wa;
    t = 'Report a problem'; sub = (w ? (w.on || !w.start ? 'It is covered by the warranty: ' + w.t + '. ' : 'The warranty ended ' + dayLbl(w.ends) + ': ' + sn + ' decides whether it is covered. ') : 'The agreement has no warranty: ' + sn + ' decides whether it is covered. ') + 'Something new or different is a change: request it instead.';
    f = '<label class="fld"><span>In which part?</span><select id="f-m" class="fsel">' + acc.map(function (x, i) { return '<option value="' + esc(x.id) + '"' + (i === acc.length - 1 ? ' selected' : '') + '>' + esc(x.t) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>What does not work?</span><textarea id="f-tx" maxlength="2000" required placeholder="What you did, what happened, what you expected."></textarea></label>' + picFld(); go = 'Send';
  } else if (type === 'paid') {   // v104 (60): their words on the record, never a payment
    var ln = smLine(M, ctx.m), lname = !ln ? '' : ln.k === 'dep' ? 'the share due at start' : ln.k === 'm' ? ln.t + '’s share' : ln.t;
    t = 'I’ve paid this'; sub = 'Tell ' + sn + ' you paid ' + lname + (ln && ln.amt ? ' (' + money(ln.amt) + ')' : '') + '. It goes on the record with the time. ScopeDue does not check payments: ' + sn + ' confirms it where they receive it.';
    f = '<label class="fld"><span>How and when did you pay? <em>(optional)</em></span><textarea id="f-tx" maxlength="200" placeholder="For example: bank transfer, reference 4471, 3 Nov"></textarea></label>'; go = 'Tell ' + sn;
  } else if (type === 'check') {   // v103 (61): an issue on one step of the capsule
    var cs = (m && m.cap && m.cap.steps[ctx.s - 1]) || ''; DL.s = ctx.s;
    t = 'Report an issue'; sub = 'Step ' + ctx.s + ': ' + cs + ' Say what happens instead. ' + sn + ' sees it with this build. It does not answer the delivery: you still accept it, ask for changes or say it is not as agreed.';
    f = '<label class="fld"><span>What happens instead?</span><textarea id="f-tx" maxlength="2000" required></textarea></label>' + picFld(); go = 'Send';
  } else if (type === 'flag') {
    t = 'Flag ' + m.t + ' as missed'; sub = 'It was due ' + smIsoLbl(m.eff, true) + '. ' + sn + ' is emailed and has ' + dayw(M.rules.cure) + ' to deliver it or agree a new date with you.';
    f = '<label class="fld"><span>Anything to add? <em>(optional)</em></span><textarea id="f-tx" maxlength="500" placeholder="For example: we planned our launch around this date."></textarea></label>'; go = 'Flag as missed';
  } else if (type === 'sent') {
    t = 'I’ve sent ' + m.t; sub = 'Tell ' + sn + ' how you sent it. The late days stop counting now.';
    f = '<label class="fld"><span>How did you send it? <em>(optional)</em></span><textarea id="f-tx" maxlength="500" placeholder="For example: emailed to Maya this morning."></textarea></label>'; go = 'Tell ' + sn;
  } else {
    t = 'End the project'; sub = 'This is recorded with the time, and ' + sn + ' is told. As agreed, you pay for accepted milestones, and payments for milestones not delivered are returned.';
    f = '<label class="fld"><span>Why are you ending it?</span><textarea id="f-tx" maxlength="1000" required></textarea></label>'; go = 'End the project'; cls = 'solid danger';
  }
  d.innerHTML = '<div class="dlg-in"><button type="button" class="dlg-x" data-a="dclose" aria-label="Close">' + IC('x', 18, 1.8) + '</button><h3 class="dlg-t" id="dlgT">' + esc(t) + '</h3><p class="sub">' + esc(sub) + '</p>' + ref + '<form id="dform" novalidate>' + f + '<p class="dlg-e" id="dErr" role="alert" hidden></p><div class="dlg-f"><button type="button" class="ghost" data-a="dclose">Cancel</button><button type="submit" class="' + cls + '" id="dgo">' + esc(go) + '</button></div></form></div>';
  d.setAttribute('aria-labelledby', 'dlgT'); openD(d); picPaint(); syncDlg();
  var first = $('textarea', d); if (first) setTimeout(function () { first.focus(); }, 60);
}
var MS_DLG = { changes: 1, notmet: 1, flag: 1, sent: 1, endp: 1, check: 1, paid: 1, bug: 1 };
function msDlgOk() { var T = DL.type, tx = ($('#f-tx') || {}).value || ''; if (T === 'changes' || T === 'notmet' || T === 'check' || T === 'bug') return tx.trim().length > 1; if (T === 'endp') return tx.trim().length > 3; return true; }
function msMsgs(T, t) {
  var sn = studioName();
  return {
    changes: { msg: 'Sent. ' + sn + ' will deliver ' + t + ' again.', last: { t: 'You asked for changes on ' + t, d: sn + ' will deliver it again. You review it the same way.' } },
    notmet: { msg: 'Sent. ' + sn + ' has to fix ' + t + '.', last: { t: 'You said ' + t + ' is not as agreed', d: sn + ' fixes it and delivers it again. No revision round was used.' } },
    flag: { msg: 'Flagged. ' + sn + ' is told and has a fixed time to deliver.', last: { t: 'You flagged ' + t + ' as missed', d: sn + ' has to deliver it or agree a new date with you.' } },
    sent: { msg: 'Thanks. ' + sn + ' is told.', last: { t: 'You sent “' + t + '”', d: 'The late days stopped counting.' } },
    endp: { msg: 'The project is ended. ' + sn + ' is told.', last: { t: 'You ended the project', d: 'The record keeps everything that was agreed and delivered.' } },
    bug: { msg: 'Sent. ' + sn + ' is told and answers on the Warranty card.', last: { t: 'You reported a problem', d: sn + ' fixes it, or says why it is not covered.' } },
    paid: { msg: 'Thanks. ' + sn + ' is told, and confirms it outside ScopeDue.', last: { t: 'You said you paid', d: sn + ' confirms payments where they receive them. ScopeDue does not check them.' } },
    check: { msg: 'Sent. ' + sn + ' sees the issue on this build.', last: { t: 'You reported an issue on ' + t, d: 'You can still accept it, ask for changes or say it is not as agreed.' } }
  }[T];
}
function msSubmit() {
  var T = DL.type, p = P[DL.pid], M = msM(p), tx = (($('#f-tx') || {}).value || '').trim(), k = '', ki = $('input[name="f-k"]:checked');
  if (ki) k = ki.value;
  if (T === 'check') k = 's' + DL.s + ':issue';   // v103 (61)
  if (T === 'bug') DL.m = ($('#f-m') || {}).value || DL.m;   // v107 (64): the milestone chosen in the dialog
  var ty = T === 'endp' ? 'end' : T, t = DL.m ? (smMs(M, DL.m) || smIn(M, DL.m) || { t: '' }).t : '', m = msMsgs(T, t);
  if (LIVEON) {
    var b = { action: ty, project: p.id, n: DL.n, key: DL.key }; if (DL.m) b.m = DL.m; if (tx) b.tx = tx; if (k) b.k = k; if (DL.pics && DL.pics.length) b.files = picBody();
    dlgErr(''); dlgBusy(true);
    apiCall('POST', '/v1/respond', b).then(function (r) {
      if (r.status === 201) { if (r.data.event) picKeep('m|' + p.id + '|' + r.data.event.i); S.last[p.id] = m.last; S.sel = null; S.done = null; closeDlg(function () { liveFetch(function (ok) { if (ok) { render('soft'); toast(m.msg); } }); }); return; }
      var code = errCode(r);
      if (r.status === 401 || r.status === 403) { closeDlg(); return liveFail(r); }
      if (code === 'stale' || code === 'not_allowed') { closeDlg(function () { liveFetch(function (ok) { if (ok) { render('soft'); toast(code === 'stale' ? studioName() + ' updated the project while you were writing. Have a look, then try again.' : (errText(r) || 'That is not possible right now.')); } }); }); return; }
      dlgBusy(false);
      dlgErr(r.status === 429 ? 'You have sent a lot of messages. Try again in a little while.' : r.net || r.status >= 500 ? 'We could not send that. Check your connection and try again. Your message is still here.' : (errText(r) || 'Something went wrong. Try again.'));
    });
    return;
  }
  var gv = M.gov ? M.gov.v : 0, e = { i: (p.mev || []).length, w: 'c', ty: ty, m: DL.m, v: gv, at: stamp(), ts: now(), tx: tx, link: '', k: k, fresh: true };
  if (DL.pics && DL.pics.length) { e.pics = picMeta(); picKeep('m|' + p.id + '|' + e.i); }
  p.mev = p.mev || []; p.mev.push(e);
  S.last[p.id] = m.last; S.sel = null; S.done = null;
  closeDlg(function () { msChain(p, function () { render('soft'); toast(m.msg); }); });
}
/* hashes on the delivery record, computed where missing (the sample) */
function msChain(p, cb) {
  var ev = p.mev || [], i = 0;
  (function next() {
    if (i >= ev.length) { if (cb) cb(); return; }
    var e = ev[i], prev = i ? ev[i - 1].hx : smEvGen(p.id);
    if (e.ty === 'accept' && e.rec && !e.rec.fp) { for (var j = i - 1; j >= 0; j--) if (ev[j].ty === 'deliver' && ev[j].m === e.m) { if (ev[j].hx) e.rec.fp = pdGroup(ev[j].hx, 12); break; } }
    if (e.hx) { i++; return next(); }
    pdSha(smEvRaw(p.id, prev, e), function (hex) { e.hx = hex; i++; next(); });
  })();
}
/* the record, printed or saved as a PDF from the print dialog */
function printRecord(pid) {
  var p = P[pid], c = cl();
  msChain(p, function () {
    $('#receipt').innerHTML = smRecordHTML({ title: p.n, studio: studioName(), client: c.name, money: money, fmt: function (ts) { return ts ? msWhen(ts) : ''; }, vers: p.vers, crs: pdCrList(p).slice().reverse(), ev: p.mev || [], M: msM(p), appr: msApprOf, now: now(), esc: esc });
    document.body.classList.add('printing');
    var done = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); }
    setTimeout(function () { if (!document.hasFocus || document.hasFocus()) done(); }, 1500);
  });
}
/* prototype dock: the studio delivers the next milestone */
function deliverable() {
  var out = null;
  client(S.cid).projects.forEach(function (id) { var p = P[id]; if (out || !msV2(p)) return; var M = msM(p); if (!M.gov) return; var m = M.ms.filter(function (x) { return smCan.deliver(M, x.id); })[0]; if (m) out = { p: p, m: m, M: M }; });
  return out;
}
function studioDeliver() {
  var w = deliverable(); if (!w) return toast('Nothing can be delivered right now.');
  var p = w.p, m = w.m, e = { i: (p.mev || []).length, w: 'y', ty: 'deliver', m: m.id, v: w.M.gov.v, at: stamp(), ts: now(), tx: m.dels.length ? 'Here it is again, with your changes.' : 'Here is ' + m.t + '. Everything in the Scope for it is in this link.', link: 'https://staging.example.com/' + p.id + '/' + m.id, k: '' };
  p.mev = p.mev || []; p.mev.push(e); S.fresh['m|' + p.id + '|' + e.i] = true; S.sel = 'ms:' + p.id + ':' + m.id;
  msChain(p, function () { S.done = null; if (S.route.k !== 'p' || S.route.id !== p.id) S.route = { k: 'p', id: p.id }; render('soft'); toast(studioName() + ' delivered ' + m.t + '.'); });
}

