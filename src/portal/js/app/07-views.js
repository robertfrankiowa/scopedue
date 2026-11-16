/* ───────── Portal v2: views ───────── */
var PRIV = 'We record the time and your IP address with your approval.';
function cl() { return client(S.cid); }
function crChip(c) {
  var s = pdCrState(c), sn = studioName();
  if (pdDispute(c)) return '<span class="chip late">Disputed</span>';   // v108 (65)
  if (pdExpired(c)) return '<span class="chip late">Quote expired</span>';
  if (s === 'client') return '<span class="chip need">Needs your reply</span>';
  if (s === 'me') return '<span class="chip">With ' + esc(sn) + '</span>';
  if (s === 'approved') return '<span class="chip ok">Approved</span>';
  var d = c.entries[c.entries.length - 1], pq = c.entries[c.entries.length - 2];
  return '<span class="chip">' + (d.w === 'c' && !(pq && pq.w === 'y' && pq.amt != null) ? 'Withdrawn' : 'Declined') + '</span>';   // your own request taken back (82)
}
function amtTxt(amt, days) { return (amt ? '+' + money(amt) : 'No extra cost') + (days ? ' · +' + dayw(days) : ''); }
function mailLine(c) { return mask(c.email); }

/* header */
function paintHeader() {
  var c = cl(), sn = studioName();
  root.style.setProperty('--tone', TONES[STUDIO.tone] || TONES[0]);
  var lg = $('#logo'); lg.textContent = ini(STUDIO.name); lg.style.backgroundImage = photoUrl(STUDIO.photo) ? 'url("' + photoUrl(STUDIO.photo) + '")' : '';
  $('#brandB').textContent = sn;
  $('#brandS').textContent = STUDIO.biz ? STUDIO.name + (STUDIO.title ? ' · ' + STUDIO.title : '') : STUDIO.title;
  $('#whoAv').textContent = ini(c.name); $('#whoName').textContent = c.name; $('#whoBiz').textContent = c.biz;
  $('#helpBtn').setAttribute('aria-label', 'Need help? Contact ' + sn); langPaint(); applyTheme(); if (!$('#tmenu').hidden) paintThemeMenu();
  var n = notifs().filter(function (e) { return e.u; }).length, b = $('#bdg');
  b.setAttribute('data-n', n); b.textContent = n; $('#bellBtn').setAttribute('aria-label', 'Notifications, ' + n + ' unread');
  var items = '';
  if (c.projects.length > 1 || (c.gone || []).length) items += '<li><button type="button" class="am-i" data-a="home"' + (S.route.k === 'home' ? ' aria-current="true"' : '') + '><span>All projects</span>' + (S.route.k === 'home' ? IC('check', 16, 2.2) : '') + '</button></li>';
  c.projects.forEach(function (id) {
    var cur = S.route.k === 'p' && S.route.id === id;
    items += '<li><button type="button" class="am-i" data-a="project" data-pid="' + id + '"' + (cur ? ' aria-current="true"' : '') + '><span>' + esc(P[id].n) + '</span>' + (cur ? IC('check', 16, 2.2) : '<small>' + phN(P[id].phase - 1) + '</small>') + '</button></li>';
  });
  $('#acctMenu').innerHTML = '<div class="am-h"><b>' + esc(c.name) + '</b><span>' + esc(mailLine(c)) + '</span></div><p class="am-k">Projects</p><ul class="am-l" role="list">' + items + '</ul>' + (LIVEON ? '<div class="am-f"><button type="button" class="am-i" data-a="signout"><span>Sign out</span></button></div>' : '');
}

/* notifications */
function paintNotif() {
  var l = notifs(), un = l.filter(function (e) { return e.u; }).length;
  $('#nMark').disabled = !un; $('#nHist').hidden = S.route.k !== 'p';
  $('#nList').innerHTML = l.length ? l.map(function (e) {
    return '<li><button type="button" class="n-i" data-a="notif" data-k="' + esc(e.k) + '" data-u="' + (e.u ? 1 : 0) + '"><span class="n-dot"></span><span><b>' + esc(e.t) + '</b><span>' + esc(e.d) + '</span><time>' + esc(dayOf(e.ts)) + ' · ' + clockOf(e.ts) + '</time></span></button></li>';
  }).join('') : '<li class="n-e"><b>You’re all caught up</b>New updates from ' + esc(studioName()) + ' show up here.</li>';
}

/* hero + stepper */
function heroArt() {
  var s = '', i;
  for (i = 0; i < 12; i++) s += '<circle cx="610" cy="30" r="' + (50 + i * 34) + '" stroke-opacity="' + (0.5 - i * 0.035).toFixed(3) + '"/>';
  return '<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 700 190" preserveAspectRatio="xMaxYMid slice" fill="none" stroke="currentColor" stroke-width="1">' + s + '</svg></div>';
}
function words(t) { t = window.SDI18N ? SDI18N.t(t) : t; return t.split(' ').map(function (w, i) { return '<span class="w" aria-hidden="true" translate="no"><span style="--wi:' + i + '">' + esc(w) + '</span></span>'; }).join(' '); }
function stepsHTML(p) {
  if (msV2(p) && msM(p).gov) return msStepsHTML(p);
  var lines = '', li = '', i, ph = p.phase;
  for (i = 0; i < 4; i++) lines += '<span class="ln' + (i < ph - 1 ? ' on' : '') + '" style="--i:' + i + '"><i style="--ld:' + (0.7 + i * 0.7).toFixed(1) + 's"></i></span>';
  for (i = 0; i < 5; i++) {
    var st = i < ph - 1 ? 'done' : i === ph - 1 ? 'now' : '', sub = st === 'done' ? 'Completed' : st === 'now' ? 'In progress' : i === ph ? 'Next' : 'Upcoming';
    li += '<li' + (st ? ' class="' + st + '"' : '') + (st === 'now' ? ' aria-current="step"' : '') + ' style="--i:' + i + ';--cd:' + (0.45 + i * 0.45).toFixed(2) + 's"><span class="c">' + (st === 'done' ? IC('check', 14, 2.6) : '') + '</span><span class="t">' + phN(i) + '</span><span class="s">' + sub + '</span></li>';
  }
  return '<div class="steps" role="group" aria-label="Project progress"><div class="steps-in">' + lines + '<ol>' + li + '</ol></div></div>';
}

/* reel for the New total */
function reelHTML(from, to) {
  var T = money(to), digs = T.replace(/\D/g, ''), F = ('0000000000000000' + Math.round(from)).slice(-digs.length), html = '', di = 0, i, ch;
  for (i = 0; i < T.length; i++) {
    ch = T.charAt(i);
    if (!/\d/.test(ch)) { html += '<span class="rs" aria-hidden="true">' + ch + '</span>'; continue; }
    var strip = '', k;
    for (k = 0; k < 30; k++) strip += '<i>' + (k % 10) + '</i>';
    html += '<span class="rd" aria-hidden="true"><span class="rd-g">0</span><span class="rd-s" data-f="' + F.charAt(di) + '" data-t="' + ch + '" style="--dur:' + (1.5 + di * 0.12).toFixed(2) + 's;--dl:' + (di * 0.1).toFixed(2) + 's;--i:' + F.charAt(di) + '">' + strip + '</span></span>';
    di++;
  }
  return html + '<span class="sr">' + T + '</span>';
}
function playReel(instant) {
  var el = $('.total.reel'); if (!el) return;
  var strips = $$('.rd-s', el);
  if (instant || RM.matches) { strips.forEach(function (s) { s.style.transition = 'none'; s.style.setProperty('--i', s.getAttribute('data-t')); }); return; }
  el.classList.add('rolling');
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    strips.forEach(function (s) { var f = +s.getAttribute('data-f'), t = +s.getAttribute('data-t'); s.style.setProperty('--i', String(f + ((t - f + 10) % 10) + 10)); });
  }); });
  setTimeout(function () { el.classList.remove('rolling'); }, 2700);
}

/* decision card */
function topRow(ok, label, right, late) {
  return '<div class="dec-top"><span class="bellc' + (ok ? ' ok' : '') + '">' + IC(ok ? 'check' : 'bell', 21, ok ? 2.2 : 1.5) + '</span><span class="dr' + (ok ? ' ok' : '') + '">' + esc(label) + '</span><span class="reply' + (late ? ' late' : '') + '">' + right + '</span></div>';
}
function peekHTML(rows) { return '<ul class="peek">' + rows.map(function (r) { return '<li><span>' + esc(r[0]) + '</span><div><p>' + esc(r[1]) + '</p>' + (r[2] ? '<time>' + esc(r[2]) + '</time>' : '') + '</div></li>'; }).join('') + '</ul>'; }
function actLink(icon, label, attrs) { return '<div class="act">' + IC(icon, 22) + '<button type="button" class="lk" ' + attrs + '>' + esc(label) + '</button></div>'; }
function entryPeek(c) {
  var sn = studioName();
  return peekHTML(c.entries.slice(-2).map(function (e) {
    var who = e.w === 'c' ? 'You' : sn, via = e.via ? { email: 'Email', chat: 'Chat', call: 'Call', meeting: 'Meeting' }[e.via] || '' : '';
    var t = e.at + (via ? ' · ' + via : '') + (e.amt != null ? ' · ' + amtTxt(e.amt, e.days) : '');   // how it came goes with the time: the label stays one line
    return [who, e.tx || (TYL[e.ty] || ''), t];
  }));
}
function arrowBtnLabel(t) { return '<span class="lab"><span>' + esc(t) + '</span>' + IC('arrow', 16, 1.6) + '</span><span class="spin" aria-hidden="true"></span>'; }
function verifyHTML(a, p) {
  var c = cl(), what;
  if (a.kind === 'scope') what = 'approve <b>Scope v' + a.v.v + '</b>';
  else if (a.kind === 'review') what = 'accept <b>' + esc(a.m.t) + '</b>';
  else { var q = pdQuoteEntry(a.c), tot = pdTotals(p), nd = tot && tot.newDelivery != null && q.days ? pdShift(tot.newDelivery, q.days) : null; what = 'approve <b>' + (q.amt ? '+' + money(q.amt) : 'this change') + '</b>' + (nd ? ' and move delivery to <b>' + dayLbl(nd) + '</b>' : ''); }
  var cells = '', i; for (i = 0; i < 6; i++) { cells += '<span class="cell" style="--c:' + i + '"><span class="d"></span><i class="cr"></i></span>'; if (i === 2) cells += '<span class="dash"></span>'; }
  return '<div class="pv pv-b" id="pvB" inert aria-hidden="true">' +
    '<button type="button" class="vb vi" style="--k:0" data-a="vback">' + IC('back', 15, 1.7) + '<span>Back</span></button>' +
    '<h3 class="vt vi" style="--k:1">Check your email</h3>' +
    '<p class="vs vi" style="--k:2">We sent a 6-digit code to <b>' + esc(mailLine(c)) + '</b>. Enter it to ' + what + '.</p>' +
    '<div class="otp vi" style="--k:3" id="otp"><input id="otpIn" inputmode="numeric" autocomplete="one-time-code" enterkeyhint="done" aria-label="6-digit approval code" aria-describedby="vMsg"><div class="cells" aria-hidden="true">' + cells + '</div></div>' +
    '<p class="vm vi" style="--k:4" id="vMsg" role="status" aria-live="polite"></p>' +
    '<div class="vr vi" style="--k:5"><span id="vTimer">Resend code in 0:30</span><button type="button" id="vResend" data-a="resend" hidden>Resend code</button></div>' +
    '<div class="vi vcw" style="--k:6"><button type="button" class="btn p" id="confirmBtn" data-a="confirm" disabled>' + arrowBtnLabel('Confirm approval') + '</button></div>' +
    '<p class="vf vi" style="--k:7">' + PRIV + '</p></div>';
}
function panelShell(inner, a, p) { return '<aside class="dec-r" id="panel" data-view="default"><span class="spot" aria-hidden="true"></span>' + inner + (a ? verifyHTML(a, p) : '') + '</aside>'; }
/* a value given as [from, to] is two texts with an arrow between, so each date is read (and translated) on its own */
function rowsHTML(rows, cls) { return '<dl class="rows' + (cls ? ' ' + cls : '') + '">' + rows.map(function (r) { return '<div class="row"><dt>' + esc(r[0]) + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + (Array.isArray(r[1]) ? '<span>' + esc(r[1][0]) + '</span><i class="to" aria-hidden="true">→</i><span>' + esc(r[1][1]) + '</span>' : esc(r[1])) + '</dd></div>'; }).join('') + '</dl>'; }
function totalHTML(label, from, to) { return '<div class="rule"></div><div class="total reel"><span>' + esc(label) + '</span><strong>' + reelHTML(from, to) + '</strong></div><div class="rule" style="margin:0"></div>'; }
function counts(v) { var n = { in: 0, out: 0, tl: 0, ci: 0 }; v.items.forEach(function (x) { if (!x.rm) n[x.sec]++; }); return n; }

function scopeDec(p, a) {
  var v = a.v, t = pdTermsOf(v), n = counts(v), dl = pdDelivery(v.items), sn = studioName(), sent = v.at.split(' · ')[0];
  var v2 = smV2(v), R2 = v2 ? t.r : null, lastMs = v2 ? v.items.filter(function (x) { return x.sec === 'tl'; }).pop() : null;
  if (v2) dl = null;
  var incl = v2 ? [plural(n.in, 'deliverable') + ', each with a “Done when” line', plural(n.out, 'thing') + ' not included', plural(n.tl, 'milestone') + (lastMs ? ', the last on ' + smIsoLbl(lastMs.d) : ''), n.ci ? plural(n.ci, 'thing') + ' you provide' : '', plural(R2.rpm, 'revision round') + ' per milestone', R2.review + ' business days to review each delivery', t.price != null ? 'Contract value ' + money(t.price) + (R2.dep ? ', ' + R2.dep + '% at start' : '') : ''].filter(Boolean) :
    [plural(n.in, 'deliverable'), plural(n.out, 'thing') + ' not included', plural(n.tl, 'milestone'), dl != null ? 'Expected delivery ' + dayLbl(dl) : '', t.rev != null ? plural(t.rev, 'revision round') : '', t.price != null ? 'Contract value ' + money(t.price) : ''].filter(Boolean);
  var left = '<div class="dec-l">' + topRow(false, 'Needs your reply', 'Sent <b>' + esc(sent) + '</b>') +
    '<h2 id="dec-title">Approve Scope v' + v.v + '</h2>' +
    '<p class="lead">This is what ' + esc(sn) + ' will deliver, what is left out, and when. Your approval is recorded against exactly this version.</p><hr>' +
    '<ul class="incl">' + incl.map(function (x) { return '<li><span class="ck">' + IC('check', 13, 2.6) + '</span>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<div class="acts">' + actLink('doc', 'Read the full Scope', 'data-a="scope" data-pid="' + p.id + '" data-v="' + v.v + '"') + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="scope"') + '</div>' +
    '<p class="opt">' + (msAnyAppr(p) ? 'Not ready? Ask a question or request a change.' : 'Not ready? Ask a question. Changes start once a Scope is approved.') + ' Nothing is approved until you enter the code we email you.</p></div>';
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">If you approve Scope v' + v.v + '</h3>' +
    rowsHTML([['Deliverables', String(n.in)], ['Not included', String(n.out)], ['Milestones', String(n.tl)]].concat(v2 && n.ci ? [['You provide', String(n.ci)]] : [])) +
    (t.price != null ? '<div class="rule"></div><div class="total"><span>Contract value</span><strong>' + money(t.price) + '</strong></div><div class="rule" style="margin:0"></div>' : '<div class="rule"></div>') +
    rowsHTML([].concat(t.rev != null ? [['Revision rounds', String(t.rev)]] : [], v2 ? [['Revisions', R2.rpm + ' per milestone'], ['Expected delivery', lastMs ? smIsoLbl(lastMs.d) : '']] : [], dl != null ? [['Expected delivery', dayLbl(dl)]] : [], [['Fingerprint', v.fp || '···· ···· ····', 'fp']]), 'b') +
    '<div class="spacer"></div>' + (badRecord(a) ? badNote() : '<button type="button" class="btn p" id="approveBtn" data-a="approve">' + arrowBtnLabel('Approve Scope v' + v.v) + '</button>') +
    (msAnyAppr(p) ? '<button type="button" class="btn s" data-a="new">Request a change</button>' : '<button type="button" class="btn s" data-a="ask" data-pid="' + p.id + '" data-on="scope">Ask a question</button>') + '<p class="fine">' + PRIV + '</p></div>';
  return left + panelShell(pa, a, p);
}
function quoteDec(p, a) {
  var c = a.c, sn = studioName(), q = pdQuoteEntry(c), kind = q.ty === 'counter' ? 'counter offer' : 'quote', tot = pdTotals(p), amt = q.amt || 0, days = q.days || 0;
  var right = q.vu ? (a.expired ? 'Expired <b>' + dayLbl(q.vu) + '</b>' : 'Valid until <b>' + dayLbl(q.vu) + '</b>') : 'Sent <b>' + esc(q.at.split(' · ')[0]) + '</b>';
  var delTxt = tot && tot.newDelivery != null ? ' and the ' + dayLbl(tot.newDelivery) + ' delivery' : '';
  var left = '<div class="dec-l">' + topRow(false, 'Needs your reply', right, a.expired) +
    '<h2 id="dec-title">' + esc(c.t) + '</h2>' + (q.tx ? '<p class="lead">' + esc(q.tx) + '</p>' : '') + '<hr>' + entryPeek(c) +
    '<div class="acts">' + actLink('chat', 'Read the full thread', 'data-a="req" data-pid="' + p.id + '" data-cid="' + c.id + '"') + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-cid="' + c.id + '"') + '</div>' +
    '<p class="opt">Optional. If you don’t approve, your Scope' + esc(delTxt) + (delTxt ? ' stay' : ' stays') + ' as agreed. <button type="button" class="lk" data-a="decline" data-pid="' + p.id + '" data-cid="' + c.id + '">Decline this change</button></p></div>';
  var r1 = [];
  if (tot && tot.price != null) r1.push(['Contract value', money(tot.price)]);
  if (tot && tot.pend.amt) r1.push(['Already approved', '+' + money(tot.pend.amt)]);
  r1.push(['This change', amt ? '+' + money(amt) : 'No extra cost']);
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">If you approve this ' + kind + '</h3>' + rowsHTML(r1);
  if (tot && tot.total != null) pa += totalHTML('New total', tot.total, tot.total + amt); else pa += '<div class="rule"></div>';
  var MQ = msV2(p) ? msM(p) : null;
  if (MQ && MQ.gov) {
    var mm = smMs(MQ, q.m) || MQ.ms[MQ.ms.length - 1];
    var pw = amt ? MQ.ms.filter(function (m) { return !m.at; })[0] : null;   // as agreed, an approved change is paid with the next milestone (smState's sched)
    pa += rowsHTML([].concat(q.inc ? [['Included change', (MQ.inc.left - 1) + ' of ' + MQ.inc.total + ' left after this']] : [], pw ? [['Paid with', pw.t]] : [], days && mm ? [[mm.t, [smIsoLbl(mm.eff), smIsoLbl(smAddDays(mm.eff, days))]], ['Expected delivery', [smIsoLbl(MQ.expected), smIsoLbl(smAddDays(MQ.expected, days))]]] : [['Expected delivery', smIsoLbl(MQ.expected) + ' (unchanged)']]), 'b');
  } else if (tot && tot.newDelivery != null) {
    pa += days ? rowsHTML([['Current delivery', dayLbl(tot.newDelivery)], ['New delivery', dayLbl(pdShift(tot.newDelivery, days))], ['Change', '+' + dayw(days)]], 'b') : rowsHTML([['Expected delivery', dayLbl(tot.newDelivery) + ' (unchanged)']], 'b');
  }
  pa += '<div class="spacer"></div>';
  if (a.expired) pa += '<p class="pnote late">This ' + kind + ' expired on <b>' + dayLbl(q.vu) + '</b>. ' + esc(sn) + ' needs to send a new one. You can ask for it, or suggest your own terms.</p><button type="button" class="btn p" data-a="newquote" data-pid="' + p.id + '" data-cid="' + c.id + '">' + arrowBtnLabel('Ask for a new quote') + '</button>';
  else if (badRecord(a)) pa += badNote();
  else pa += '<button type="button" class="btn p" id="approveBtn" data-a="approve">' + arrowBtnLabel('Approve · ' + (amt ? '+' + money(amt) : 'no extra cost')) + '</button>';
  pa += '<button type="button" class="btn s" data-a="counter" data-pid="' + p.id + '" data-cid="' + c.id + '">Suggest different terms</button>' + (a.expired ? '' : '<p class="fine">' + PRIV + '</p>') + '</div>';
  return left + panelShell(pa, a.expired ? null : a, p);
}
function replyDec(p, a) {
  var c = a.c, sn = studioName(), l = lastE(c);
  var left = '<div class="dec-l">' + topRow(false, 'Needs your reply', 'Sent <b>' + esc(l.at.split(' · ')[0]) + '</b>') +
    '<h2 id="dec-title">' + esc(c.t) + '</h2>' + (l.tx ? '<p class="lead">' + esc(l.tx) + '</p>' : '') + '<hr>' + entryPeek(c) +
    '<div class="acts">' + actLink('chat', 'Read the full thread', 'data-a="req" data-pid="' + p.id + '" data-cid="' + c.id + '"') + '</div></div>';
  /* what the request is and where it stands, so the panel says something beside the two buttons */
  var f0 = c.entries[0], tm = pdTerms(c);
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">' + esc(sn) + ' is waiting for your reply</h3>' +
    rowsHTML([['Request', c.id], ['Opened', String(f0.at).split(' · ')[0]], ['Last from ' + sn, l.at]].concat(tm ? [['On the table', amtTxt(tm.amt, tm.days)]] : [])) + '<div class="rule"></div>' +
    rowsHTML([['Your Scope', c.adds ? 'Unchanged until you approve a quote' : 'Unchanged: this is a question']], 'b') +
    '<p class="vs" style="margin-top:14px">Your answer goes on this request, so it stays on record with everything else.</p><div class="spacer"></div>' +
    '<button type="button" class="btn p" data-a="note" data-pid="' + p.id + '" data-cid="' + c.id + '">' + arrowBtnLabel('Reply to ' + sn) + '</button><button type="button" class="btn s" data-a="decline" data-pid="' + p.id + '" data-cid="' + c.id + '">Withdraw this request</button></div>';
  return left + panelShell(pa);
}
function doneDec(p, d) {
  var sn = studioName(), c = d.kind === 'quote' ? pdCr(p, d.cid) : null, v = d.kind === 'scope' ? pdVer(p, d.v) : null, tot = pdTotals(p), line, title, peek, rows, ptitle, when = d.rec.at.split(' · ')[0];
  if (d.kind === 'review') {
    var rp = reviewDoneParts(p, d); line = rp.line; title = d.t + ' accepted'; peek = rp.peek; ptitle = 'You accepted ' + d.t;
  } else if (d.kind === 'quote') {
    line = 'Approved. ' + sn + ' will add it to Scope v' + d.nextV + '. You will be asked to approve that version too.';
    title = c.t;
    peek = [['Now', 'This change counts in your New total and Expected delivery. It stays outside the agreed Scope for now.'], ['Next', sn + ' sends Scope v' + d.nextV + '. When you approve it, the change becomes part of the Scope.']];
    ptitle = 'You approved this quote';
  } else {
    line = 'Scope v' + v.v + ' is now your baseline. Any change you ask for from here is measured against it.';
    title = 'Scope v' + v.v + ' approved';
    peek = [['Now', 'Everything in Scope v' + v.v + ' is agreed, and ' + sn + ' has been notified.'], ['Next', 'Ask for changes any time. Each one is quoted and approved on its own.']];
    ptitle = 'You approved Scope v' + v.v;
  }
  var left = '<div class="dec-l">' + topRow(true, 'Decision recorded', 'Approved <b>' + esc(when) + '</b>') + '<h2 id="dec-title">' + esc(title) + '</h2><p class="lead" id="doneLine">' + esc(line) + '</p><hr>' + peekHTML(peek) +
    '<div class="acts">' + actLink('print', 'Print receipt', 'data-a="receipt" data-r="' + esc(d.rk) + '"') + (d.kind === 'review' ? actLink('doc', 'Download the record', 'data-a="record" data-pid="' + p.id + '"') : d.kind === 'quote' ? actLink('chat', 'Read the full thread', 'data-a="req" data-pid="' + p.id + '" data-cid="' + d.cid + '"') : actLink('doc', 'Read the full Scope', 'data-a="scope" data-pid="' + p.id + '" data-v="' + d.v + '"')) + '</div></div>';
  var rr;
  if (d.kind === 'review') {
    rr = rowsHTML([['Milestone', d.t]].concat(d.pay ? [['Its share', d.pay + '%' + (d.price != null ? ' · ' + money(d.amt) : '')]] : [])) + '<div class="rule"></div>' + rowsHTML([['Accepted with', 'An emailed code']], 'b');
  } else if (d.kind === 'quote') {
    var r1 = []; if (d.price != null) r1.push(['Contract value', money(d.price)]); if (d.before) r1.push(['Already approved', '+' + money(d.before)]); r1.push(['This change', d.amt ? '+' + money(d.amt) : 'No extra cost']);
    rr = rowsHTML(r1) + (d.total != null ? totalHTML('New total', d.total, d.total) : '<div class="rule"></div>') + (d.delivery != null ? rowsHTML([['Expected delivery', dayLbl(d.delivery)], ['Change', d.days ? '+' + dayw(d.days) : 'None']], 'b') : '');
  } else {
    var t = pdTermsOf(v), dl = pdDelivery(v.items);
    rr = rowsHTML([['Version', 'Scope v' + v.v]].concat(t.price != null ? [['Contract value', money(t.price)]] : [])) + '<div class="rule"></div>' + rowsHTML([].concat(t.rev != null ? [['Revision rounds', String(t.rev)]] : [], dl != null ? [['Expected delivery', dayLbl(dl)]] : [], [['Fingerprint', v.fp || '', 'fp']]), 'b');
  }
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">' + esc(ptitle) + '</h3>' + rr + '<div class="spacer"></div><div class="done-b"><svg class="rg" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24.5" pathLength="1"/><path pathLength="1" d="M16 26.5l7 7 13.5-14"/></svg><div class="done-t"><b>Approved</b><span>Verified with an email code · ' + esc(d.rec.at) + '</span><span>' + esc(sn) + ' has been notified.</span></div></div><button type="button" class="btn s" data-a="contdone" style="margin-top:16px">Continue</button></div>';
  return '<section class="decision rv" id="decision" data-state="done" aria-labelledby="dec-title" style="--d:.1s">' + left + panelShell(pa) + '</section>';
}
function idleDec(p) {
  var sn = studioName(), l = pdLatest(p), tot = pdTotals(p), withMe = pdCrList(p).filter(function (c) { return pdCrState(c) === 'me'; }), ph = p.phase;
  var lead = withMe.length ? sn + ' has ' + plural(withMe.length, 'request') + ' to answer. We’ll tell you here, and by email, as soon as something needs your reply.' : l ? sn + ' is working on it. We’ll tell you here, and by email, as soon as something needs your reply.' : sn + ' is preparing Scope v1. You will be asked to approve it here.';
  var MI = msV2(p) ? msM(p) : null, mi = MI && MI.gov ? MI.ms : null, ci = MI ? MI.cur : -1;
  if (MI && MI.gov && MI.pz) lead = sn + ' paused the work ' + msWhen(MI.pz.ts) + ': ' + MI.pz.e.tx + ' Dates move by the days it is paused.';
  else if (MI && MI.cl) lead = (MI.cl.by === 'c' ? 'You ended the project ' : sn + ' closed the project ') + msWhen(MI.cl.ts) + '. The record keeps everything that was agreed and delivered.';
  var rows = withMe.length ? withMe.slice(0, 3).map(function (c) { var e = lastE(c); return [c.id, c.t, (e.w === 'c' ? 'You ' + ({ question: 'asked a question', counter: 'suggested ' + amtTxt(e.amt, e.days), note: 'added a note', request: 'asked for this' }[e.ty] || '') : sn + ' logged this') + ' · ' + e.at]; }) :
    mi ? [ci >= 0 ? ['Now', mi[ci].t + ' · ' + msStText(mi[ci])] : ['Done', 'Every milestone is accepted'], ci >= 0 && mi[ci + 1] ? ['Next', mi[ci + 1].t + ' · due ' + smIsoLbl(mi[ci + 1].eff)] : null].filter(Boolean) :
    [['Now', phN(ph - 1)], ph < 5 ? ['Next', phN(ph)] : null, ph < 4 ? ['Then', phN(ph + 1)] : null].filter(Boolean);
  var left = '<div class="dec-l">' + topRow(true, 'Up to date', 'Nothing is waiting on you') + '<h2 id="dec-title">Nothing needed from you right now</h2><p class="lead">' + esc(lead) + '</p><hr>' + peekHTML(rows) +
    '<div class="acts">' + actLink('chat', 'Ask a question', 'data-a="ask" data-pid="' + p.id + '" data-on="' + (l ? 'scope' : '') + '"') + (l ? actLink('doc', 'View Scope', 'data-a="scope" data-pid="' + p.id + '"') : '') + '</div></div>';
  var r = [['Current stage', mi && MI.cl ? (MI.cl.by === 'c' ? 'Ended ' : 'Closed ') + msDay(MI.cl.ts) : mi && MI.pz ? 'Paused' : mi ? (ci >= 0 ? mi[ci].t : 'Delivered') : MI ? 'Scoping' : phN(ph - 1)], ['Expected delivery', mi ? smIsoLbl(MI.expected) : tot && tot.newDelivery != null ? dayLbl(tot.newDelivery) : 'Not set yet'], ['Scope', l ? 'v' + l.v + ' · ' + (l.appr ? 'Approved ' + String(l.appr).split(' · ')[1] : 'Needs your reply') : 'Not shared yet']];
  /* the fingerprint is in View Scope and on the record: not here, where it only reads as code */
  if (mi && MI.inc.total) r.push(['Included changes', MI.inc.used + ' of ' + MI.inc.total + ' used']);
  else if (tot && tot.rev != null) r.push(['Revision rounds', P[p.id].rev.used + ' of ' + tot.rev + ' used']);
  r.push(['With ' + sn, withMe.length ? plural(withMe.length, 'request') : 'Nothing']);
  var last = S.last[p.id], note = last ? '<div class="idn"><b>' + esc(last.t) + '</b><span>' + esc(last.d) + '</span></div>' : '';
  var pa = '<div class="pv pv-a" id="pvA"><h3 id="sum-title">At a glance</h3>' + rowsHTML(r) + note + '<div class="spacer"></div>' + (msAnyAppr(p) ? '<button type="button" class="btn s" data-a="new" style="margin-top:18px">Request a change</button>' : '<button type="button" class="btn s" data-a="ask" data-pid="' + p.id + '" data-on="scope" style="margin-top:18px">Ask a question</button>') + '</div>';
  return '<section class="decision rv" id="decision" data-state="idle" aria-labelledby="dec-title" style="--d:.8s">' + left + panelShell(pa) + '</section>';
}
function decisionHTML(p) {
  var acts = actionsFor(p), a, d = S.done && S.done.pid === p.id ? S.done : null;
  if (d) return doneDec(p, d);
  a = acts.filter(function (x) { return x.key === S.sel; })[0] || acts[0];
  if (!a) { S.sel = null; return idleDec(p); }
  S.sel = a.key;
  var inner = a.kind === 'scope' ? scopeDec(p, a) : a.kind === 'quote' ? quoteDec(p, a) : a.kind === 'review' ? reviewDec(p, a) : a.kind === 'late' ? lateDec(p, a) : a.kind === 'nd' ? ndDec(p, a) : a.kind === 'input' ? inputDec(p, a) : replyDec(p, a);
  return '<section class="decision rv" id="decision" data-state="' + a.kind + '" data-key="' + esc(a.key) + '" aria-labelledby="dec-title" style="--d:.8s">' + inner + '</section>';
}
function alsoHTML(p) {
  if (S.done && S.done.pid === p.id) return '';
  var acts = actionsFor(p), cur = acts.filter(function (x) { return x.key === S.sel; })[0] || acts[0], rest = acts.filter(function (x) { return x !== cur; });
  if (!cur || !rest.length) return '';
  return '<div class="also rv" style="--d:1s"><span class="al-h">Also waiting on you · ' + rest.length + '</span><ul>' + rest.map(function (a) {
    var t = a.kind === 'scope' ? 'Approve Scope v' + a.v.v : a.kind === 'review' ? 'Review ' + a.m.t : a.kind === 'late' ? a.m.t + ' is late' : a.kind === 'nd' ? a.m.t + ' was not delivered' : a.kind === 'input' ? 'Send ' + a.n.t : a.c.t;
    var m = a.kind === 'scope' ? 'Scope' : a.kind === 'review' ? 'Answer by ' + msDay(a.m.ends) : a.kind === 'late' ? 'You can flag it' : a.kind === 'nd' ? 'You can end the project' : a.kind === 'input' ? 'Needed by ' + smIsoLbl(a.n.due) : a.expired ? 'Quote expired' : a.kind === 'quote' ? 'Quote' + (pdQuoteEntry(a.c).vu ? ' · valid until ' + dayLbl(pdQuoteEntry(a.c).vu) : '') : 'Reply';
    return '<li><button type="button" class="al-b" data-a="pick" data-key="' + esc(a.key) + '"><span>' + esc(t) + '</span><em>' + esc(m) + '</em>' + IC('arrow', 16, 1.6) + '</button></li>';
  }).join('') + '</ul></div>';
}
function pips(used, total) { var s = '', i; for (i = 0; i < total; i++) s += '<i' + (i < used ? ' class="on"' : '') + '></i>'; return '<span class="pips" aria-hidden="true">' + s + '</span>'; }
function recHTML(p) {
  var l = pdLatest(p), tot = pdTotals(p), h = '<div class="rec rv" style="--d:1.1s" role="group" aria-label="Record">';
  if (l && l.appr) h += '<span class="rec-i"><b>Scope v' + l.v + '</b> approved ' + IC('check', 14, 2.4) + '<button type="button" class="lk" data-a="scope" data-pid="' + p.id + '">View</button></span>';   // the fingerprint is in View and on the record
  else if (l) h += '<span class="rec-i"><b>Scope v' + l.v + '</b> needs your reply<button type="button" class="lk" data-a="scope" data-pid="' + p.id + '">View</button></span>';
  else h += '<span class="rec-i"><b>Scope</b> not shared yet</span>';
  var M3 = msV2(p) ? msM(p) : null;
  if (M3 && M3.gov) {
    h += '<span class="rec-i"><b>Revisions</b>' + plural(M3.rules.rpm, 'round') + ' per milestone</span>';
    if (M3.inc.total) h += '<span class="rec-i"><b>Included changes</b>' + M3.inc.used + ' of ' + M3.inc.total + ' used ' + pips(M3.inc.used, M3.inc.total) + '</span>';
    h += '<span class="rec-i"><b>Expected delivery</b>' + esc(smIsoLbl(M3.expected)) + (M3.expected !== M3.ms[M3.ms.length - 1].base ? ' <span class="rec-n">agreed ' + esc(smIsoLbl(M3.ms[M3.ms.length - 1].base)) + '</span>' : '') + '</span>';
  } else {
  if (tot && tot.rev != null) h += '<span class="rec-i"><b>Revision rounds</b>' + p.rev.used + ' of ' + tot.rev + ' used ' + pips(p.rev.used, tot.rev) + '</span>';
  if (tot && tot.newDelivery != null) h += '<span class="rec-i"><b>Expected delivery</b>' + esc(dayLbl(tot.newDelivery)) + (tot.pend.days ? ' <span class="rec-n">+' + dayw(tot.pend.days) + ' approved</span>' : '') + '</span>';
  }
  return h + '<button type="button" class="lk rec-i rec-r" data-a="hist" data-pid="' + p.id + '">History</button></div>';
}
function cardsHTML(p) {
  var l = pdLatest(p), tot = pdTotals(p), sn = studioName(), crs = pdCrList(p), n = l ? counts(l) : null;
  var open = crs.filter(function (c) { var s = pdCrState(c); return s === 'client' || s === 'me'; }), shown = open.concat(crs.filter(function (c) { return open.indexOf(c) < 0; })).slice(0, 3);
  var sc = '<section class="bx" style="--b:0" aria-labelledby="t-sc"><div class="bx-h">' + IC('doc', 24) + '<h4 id="t-sc">Scope</h4>' + (l ? '<button type="button" class="lk2" data-a="scope" data-pid="' + p.id + '"><span>View Scope</span>' + IC('arrow', 15, 1.6) + '</button>' : '') + '</div><div class="bx-b">' +
    (l ? '<dl class="kv"><div><dt>Version</dt><dd>v' + l.v + ' · ' + (l.appr ? 'Approved' : 'Needs your reply') + '</dd></div><div><dt>Deliverables</dt><dd>' + n.in + '</dd></div><div><dt>Not included</dt><dd>' + n.out + '</dd></div><div><dt>Milestones</dt><dd>' + n.tl + '</dd></div>' + (tot && tot.price != null ? '<div><dt>Contract value</dt><dd>' + money(tot.price) + '</dd></div>' : '') + '</dl>' : '<p class="bx-p">Not shared yet. ' + esc(sn) + ' is preparing Scope v1.</p>') + '</div></section>';
  var ch = '<section class="bx" style="--b:1" aria-labelledby="t-ch"><div class="bx-h">' + IC('swap', 24) + '<h4 id="t-ch">Changes</h4>' + (crs.length ? '<button type="button" class="lk2" data-a="req" data-pid="' + p.id + '"><span>All changes</span>' + IC('arrow', 15, 1.6) + '</button>' : '') + '</div><div class="bx-b">' +
    (shown.length ? '<ul class="crl">' + shown.map(function (c) { return '<li><button type="button" data-a="req" data-pid="' + p.id + '" data-cid="' + c.id + '"><span class="cid">' + c.id + '</span><span class="ct">' + esc(c.t) + '</span>' + crChip(c) + '</button></li>'; }).join('') + '</ul>' : '<p class="bx-p">Nothing outside the Scope yet. Anything you want added is asked for here, quoted, and approved on its own.</p>') +
    (msAnyAppr(p) ? '<div class="bx-f"><button type="button" class="ghostb" data-a="new">' + IC('plus', 16, 1.8) + '<span>Request a change</span></button></div>' : '<p class="bx-p" style="margin-top:12px">' + (msEnded(p) ? 'The project has ended. You can still ask a question.' : 'Changes start once you approve the Scope. Until then, ask a question about it.') + '</p>') + '</div></section>';
  var cps = copies(p), cp = !cps.length ? '' : '<section class="bx" style="--b:2" aria-labelledby="t-cp"><div class="bx-h">' + IC('folder', 24) + '<h4 id="t-cp">Shared copies</h4>' + (cps.length ? '<button type="button" class="lk2" data-a="copies" data-pid="' + p.id + '"><span>View all</span>' + IC('arrow', 15, 1.6) + '</button>' : '') + '</div><div class="bx-b">' +
    '<ul class="cpl">' + cps.slice(0, 2).map(copyRow).join('') + '</ul></div></section>';
  return '<div class="trio' + (cp ? '' : ' two') + '">' + sc + ch + cp + '</div>';
}
function copies(p) { return (p.evd || []).filter(function (e) { return e.copy; }); }
var KIND_IC = { email: 'mail', shot: 'image', chat: 'chat', build: 'folder', doc: 'doc', text: 'doc' };
function shortFp(hex) { return pdGroup(hex.slice(0, 12), 12); }
function copyRow(e) { return '<li><div class="cpr"><span class="cpi">' + IC(KIND_IC[e.kind] || 'doc', 18) + '</span><div><b>' + esc(e.copy.title || e.title) + '</b><span>' + esc(kindLbl(e)) + ' · ' + esc(e.copy.at) + '</span><span class="mono">' + shortFp(e.copy.fp) + '</span></div></div></li>'; }
function footHTML() {
  return '<footer class="foot"><svg class="mk" width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><rect width="17" height="17" rx="4.5" fill="currentColor" style="color:var(--seed)"/><path d="M5 8.7l2.4 2.4L12 6.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Recorded with</span><span class="nm">ScopeDue</span><span class="fsep"></span><span class="tg">Approvals are kept with their time and a fingerprint.</span><span class="fsep"></span><button type="button" class="fabout" data-a="about">About ' + esc(studioName()) + '</button></footer>';
}
function projHTML(id) {
  var p = P[id], c = cl(), l = pdLatest(p), tot = pdTotals(p), acts = actionsFor(p), need = acts.length && !(S.done && S.done.pid === id), sn = studioName();
  var stat = need ? '<span class="st2 need"><i></i>Needs your reply</span>' : (pdCrList(p).some(function (x) { return pdCrState(x) === 'me'; }) ? '<span class="st2 wait"><i></i>With ' + esc(sn) + '</span>' : '<span class="st2"><i></i>Up to date</span>');
  var M2 = msV2(p) ? msM(p) : null, exp = M2 && M2.gov ? smIsoLbl(M2.expected) : tot && tot.newDelivery != null ? dayLbl(tot.newDelivery) : '';
  /* the status line is in groups (.sg): one line in most themes (display: contents), separate figures where a theme lays them out */
  var dl = M2 && M2.gov && M2.cl ? '<span class="sep"></span><span class="sg sg-b"><span class="s2">' + (M2.cl.by === 'c' ? 'Ended' : 'Closed') + '<span class="cl">:</span></span><b>' + esc(msDay(M2.cl.ts)) + '</b></span>' : '<span class="sep"></span><span class="sg sg-b"><span class="s2">Expected delivery<span class="cl">:</span></span><b>' + esc(exp || 'Not set yet') + '</b></span>';
  var stage = M2 && M2.gov ? (M2.cl ? (M2.cl.by === 'c' ? 'Ended' : 'Closed') : M2.pz ? 'Paused' : M2.ms[M2.cur] ? M2.ms[M2.cur].t : 'Delivered') : M2 ? 'Scoping' : phN(p.phase - 1);
  return '<section class="hero">' + heroArt() + '<div class="hero-in"><p class="kicker rv" style="--d:.5s">Client portal</p><h1 aria-label="' + esc(p.n) + '">' + words(p.n) + '</h1>' + (c.biz && String(p.n).toLowerCase().indexOf(String(c.biz).toLowerCase()) < 0 ? '<p class="for rv" style="--d:.7s">for ' + esc(c.biz) + '</p>' : '') +   /* not when the name already says it */
    '<p class="status rv" style="--d:.85s"><span class="sg sg-a"><span class="sdot"></span><span>' + esc(stage) + '</span></span>' + dl + '<span class="sep"></span><span class="sg sg-c">' + stat + '</span></p></div></section>' +
    stepsHTML(p) + '<main>' + decisionHTML(p) + alsoHTML(p) + recHTML(p) + msCardHTML(p) + cardsHTML(p) + '</main>';
}
function homeHTML() {
  var c = cl(), sn = studioName(), acts = allActions(c), live = acts.filter(function (a) { return true; });
  var wait = 0; c.projects.forEach(function (id) { wait += pdCrList(P[id]).filter(function (x) { return pdCrState(x) === 'me'; }).length; });
  var head = '<section class="hero s">' + heroArt() + '<div class="hero-in"><p class="kicker rv" style="--d:.5s">Client portal</p><h1 aria-label="Your projects">' + words('Your projects') + '</h1><p class="for rv" style="--d:.7s">for ' + esc(c.biz) + '</p>' +
    '<p class="status rv" style="--d:.85s"><span class="sg sg-a"><span class="sdot"></span>' + (acts.length ? '<span class="st2 need"><i></i>' + plural(acts.length, 'thing') + ' ' + (acts.length === 1 ? 'needs' : 'need') + ' your reply</span>' : '<span class="st2"><i></i>Nothing needs your reply</span>') + '</span><span class="sep"></span><span class="sg sg-b"><span class="s2">With ' + esc(sn) + '<span class="cl">:</span></span><b>' + plural(wait, 'request') + '</b></span></p></div></section>';
  var rows = acts.map(function (a) {
    var p = P[a.pid], t, m, r;
    if (a.kind === 'scope') { t = 'Approve Scope v' + a.v.v; var tt = pdTermsOf(a.v); m = [tt.price != null ? money(tt.price) : '', tt.rev != null ? plural(tt.rev, 'revision round') : '', counts(a.v).in + ' deliverables'].filter(Boolean).join(' · '); r = 'Sent ' + a.v.at.split(' · ')[0]; }
    else if (a.kind === 'review') { t = 'Review ' + a.m.t; m = studioName() + ' delivered it ' + msWhen(a.m.last.ts); r = 'Answer by ' + msDay(a.m.ends); }
    else if (a.kind === 'late') { t = a.m.t + ' is ' + dayw(a.m.late) + ' late'; m = 'It was due ' + smIsoLbl(a.m.eff) + '. You can flag it as missed.'; r = '<span class="late">Late</span>'; }
    else if (a.kind === 'nd') { t = a.m.t + ' was not delivered'; m = 'The fix period ended. You can end the project.'; r = '<span class="late">Not delivered</span>'; }
    else if (a.kind === 'input') { t = 'Send ' + a.n.t; m = studioName() + ' needs it by ' + smIsoLbl(a.n.due, true); r = a.n.st === 'late' ? '<span class="late">Late ' + dayw(a.n.late) + '</span>' : 'Due ' + smIsoLbl(a.n.due); }
    else { t = a.c.t; var q = pdQuoteEntry(a.c) || {}; m = (a.kind === 'quote' ? (a.c.id + ' · ' + (q.ty === 'counter' ? 'Counter offer ' : 'Quote ') + amtTxt(q.amt, q.days)) : a.c.id + ' · ' + sn + ' wrote to you'); r = a.expired ? '<span class="late">Quote expired</span>' : q.vu ? 'Valid until ' + dayLbl(q.vu) : 'Sent ' + lastE(a.c).at.split(' · ')[0]; }
    return '<li><button type="button" class="nrow" data-a="open" data-pid="' + a.pid + '" data-key="' + esc(a.key) + '"><span class="bellc">' + IC('bell', 21) + '</span><span class="nt"><span class="np">' + esc(p.n) + '</span><span class="nn" style="display:block">' + esc(t) + '</span><span class="nm" style="display:block">' + esc(m) + '</span></span><span class="nr"><span>' + r + '</span><span class="gob">Review' + IC('arrow', 15, 1.7) + '</span></span></button></li>';
  }).join('');
  var needs = '<section class="sec rv" style="--d:.9s" aria-labelledby="h-needs"><div class="sec-h"><h2 id="h-needs">Needs you</h2><span>' + (acts.length ? plural(acts.length, 'item') : '') + '</span></div>' +
    (acts.length ? '<ul class="nl">' + rows + '</ul>' : '<div class="nl"><div class="nempty"><span class="bellc ok">' + IC('check', 21, 2.2) + '</span><div><b>You’re all caught up</b><span>' + esc(sn) + ' will tell you here, and by email, when something needs your reply.</span></div></div></div>') + '</section>';
  var cards = c.projects.map(function (id) {
    var p = P[id], tot = pdTotals(p), a = actionsFor(p), l = pdLatest(p), i, ph = '';
    for (i = 0; i < 5; i++) ph += '<i class="' + (i < p.phase - 1 ? 'on' : i === p.phase - 1 ? 'now' : '') + '"></i>';
    var st = a.length ? '<span class="chip need">' + plural(a.length, 'item') + ' to reply</span>' : pdCrList(p).some(function (x) { return pdCrState(x) === 'me'; }) ? '<span class="chip">With ' + esc(sn) + '</span>' : l ? '<span class="chip ok">Up to date</span>' : '<span class="chip">Scope not shared yet</span>';
    return '<button type="button" class="pcard" data-a="project" data-pid="' + id + '"><h3>' + esc(p.n) + '</h3><div class="ph" aria-hidden="true">' + ph + '</div><div class="pm"><span>' + phN(p.phase - 1) + '</span><span>' + (tot && tot.newDelivery != null ? 'Expected delivery ' + esc(dayLbl(tot.newDelivery)) : 'Delivery not set yet') + '</span></div><div class="pc-f">' + st + '<span class="lk2" style="margin-left:0"><span>Open</span>' + IC('arrow', 15, 1.6) + '</span></div></button>';
  }).join('');
  /* v96 (CONTRACT 42): what the studio deleted, with its record to download until it goes */
  var gone = (c.gone || []).filter(function (g) { return P[g.id]; }).map(function (g) {
    return '<li class="nempty rmv"><span class="bellc">' + IC('doc', 21) + '</span><div><b>' + esc(sn) + ' removed ' + esc(P[g.id].n) + ' from your portal on ' + esc(dayLbl(g.at)) + '</b><span>Its record is kept until ' + esc(dayLbl(g.until)) + ', then deleted. Download it to keep a copy.</span></div>' +
      '<button type="button" class="ghostb" data-a="record" data-pid="' + g.id + '">' + IC('print', 16, 1.6) + '<span>Download the record</span></button></li>';
  }).join('');
  if (gone) gone = '<section class="sec rv" style="--d:.95s" aria-labelledby="h-gone"><div class="sec-h"><h2 id="h-gone">Removed from your portal</h2><span>' + c.gone.length + '</span></div><ul class="nl">' + gone + '</ul></section>';
  return head + '<main>' + needs + gone + (c.projects.length || !gone ? '<section class="sec rv" style="--d:1.05s" aria-labelledby="h-proj"><div class="sec-h"><h2 id="h-proj">Projects</h2><span>' + c.projects.length + '</span></div><div class="pgrid">' + cards + '</div></section>' : '') + '</main>';
}

