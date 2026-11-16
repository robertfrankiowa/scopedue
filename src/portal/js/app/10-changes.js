/* ───── Changes ───── */
function entryHTML(p, c, e, i) {
  var sn = studioName(), me = e.w === 'c', tyc = e.ty === 'accept' ? ' ok' : e.ty === 'counter' ? ' warn' : '';
  var av = me ? '<span class="av" style="background:var(--seed);opacity:.75">' + esc(ini(cl().name)) + '</span>' : '<span class="av"' + (photoUrl(STUDIO.photo) ? ' style="background-image:url(\'' + photoUrl(STUDIO.photo) + '\')"' : '') + '>' + esc(ini(STUDIO.name)) + '</span>';
  var ek = p.id + '|' + c.id + '|' + i;
  var h = '<li class="en' + (me ? ' you' : '') + (S.enMark === ek ? ' mark' : '') + '" data-en="' + esc(ek) + '"><div class="en-h">' + av + '<b>' + esc(me ? 'You' : sn) + '</b><span class="en-ty' + tyc + '">' + (e.ty === 'quote' && c.entries.slice(0, i).some(function (x) { return x.ty === 'counter'; }) ? 'Quote' : TYL[e.ty]) + '</span><time>' + esc(e.at) + '</time></div>';
  if (e.ty === 'dispute') h += '<p class="en-pos">' + esc((me ? 'You think it is ' : sn + ' thinks it is ') + DS_POS[e.pos || 'fix'] + '.') + (e.ref ? ' <span class="en-ref">' + esc(dsRefText(p, e.ref)) + '</span>' : '') + '</p>';   // v108 (65)
  if (e.tx) h += '<p class="en-tx">' + esc(e.tx) + '</p>';
  if (e.pics) h += picsHTML(e.pics, 'e|' + ek);   // v102 (59)
  if (e.amt != null && (e.ty === 'quote' || e.ty === 'counter')) h += '<div class="en-amt"><b>' + (e.amt ? money(e.amt) : 'No extra cost') + '</b>' + (e.days ? '<span>+' + dayw(e.days) + '</span>' : '') + (e.vu ? '<span>' + (e.vu < now() && c.entries[c.entries.length - 1] === e ? 'Expired ' : 'Valid until ') + dayLbl(e.vu) + '</span>' : '') + '</div>';
  h += msQuoteBits(p, e);
  if (e.via) h += '<p class="en-via">Logged by ' + esc(sn) + ' from ' + ({ email: 'an email', chat: 'a chat', call: 'a call', meeting: 'a meeting' }[e.via] || 'a conversation') + '</p>';
  if (e.rec) h += '<p class="en-rec">' + IC('shield', 15) + '<span>Verified with an email code · ' + esc(e.at) + ' · IP ' + esc(e.rec.ip) + ' · <button type="button" class="lk" style="font-size:12.5px" data-a="receipt" data-r="e|' + p.id + '|' + c.id + '|' + i + '">Print receipt</button></span></p>';
  /* v102 (58): the entry's code, the same in the studio's app; on what you sent, a link back to it */
  if (e.hx) h += '<div class="en-hx"><span title="SHA-256 ' + pdGroup(e.hx, 12) + ', chained to the entry before it">' + enCode(e.hx) + '</span>' +
    (me ? '<button type="button" class="lk" data-a="cpl" data-key="' + esc(ek) + '">' + (S.cpl === ek ? 'Copied' : 'Copy link') + '</button>' : '') + '</div>';
  return h + '</li>';
}
function enCode(hx) { return '#' + String(hx || '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase(); }
/* the address that opens this entry: the project, then the code. Opened in a tab with a session, the entry comes into view, marked */
function enLink(pid, hx) { return location.origin + location.pathname + '#/p/' + pid + '/e/' + enCode(hx).slice(1); }
function enGo(pid, code) {
  var p = P[pid], hit = null; if (!p) return false;
  pdCrList(p).forEach(function (c) { c.entries.forEach(function (e, i) { if (!hit && e.hx && enCode(e.hx) === '#' + code.toUpperCase()) hit = { c: c, i: i }; }); });
  if (!hit) return false;
  S.enMark = pid + '|' + hit.c.id + '|' + hit.i; openReq(pid, hit.c.id);
  var el = document.querySelector('#dReq [data-en="' + S.enMark + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  try { history.replaceState(null, '', '#/p/' + pid); } catch (e) { }
  return true;
}
/* v108 (CONTRACT 65): Disputed. Both views side by side, with the Scope line each points at and its Done when line; nothing here
   decides: it ends with an accepted quote or a decline */
var DS_POS = { fix: 'a fix owed under the agreement', change: 'new or different work' };
function dsGov(p) { for (var i = p.vers.length - 1; i >= 0; i--) if (p.vers[i].appr) return p.vers[i]; return null; }
function dsRefText(p, id) { var v = dsGov(p), x = v && v.items.filter(function (y) { return y.id === id; })[0]; return x ? (x.sec === 'out' ? 'Not included: ' : 'Scope: ') + x.t + (x.ok ? ' · Done when: ' + x.ok : '') : ''; }
function dsCardHTML(p, c) {
  var d = pdDispute(c); if (!d) return '';
  var sn = studioName(), side = function (who, e) { return '<div class="ds-s"><b>' + esc(who) + '</b>' + (e ? '<span>' + esc(DS_POS[e.pos || 'fix']) + '</span>' + (e.ref ? '<small>' + esc(dsRefText(p, e.ref)) + '</small>' : '') + '<p>' + esc(e.tx) + '</p>' : '<span class="mute">Has not said yet</span>') + '</div>'; };
  var b0 = c.entries[0] && c.entries[0].bug != null ? (p.mev || [])[c.entries[0].bug] : null;
  return '<div class="ds-card"><div class="ds-h"><span class="chip late">Disputed</span><span>' + esc('ScopeDue decides nothing here. It ends when you accept a quote from ' + sn + ' (no extra cost means it is fixed under the agreement) or decline.') + '</span></div>' +
    (b0 ? '<p class="ds-bug">' + esc('From the problem you reported: “' + b0.tx + '”') + '</p>' : '') + '<div class="ds-g">' + side('You', d.c) + side(sn, d.y) + '</div></div>';
}
function reqFoot(p, c) {
  var st = pdCrState(c), sn = studioName(), ex = pdExpired(c), ids = 'data-pid="' + p.id + '" data-cid="' + c.id + '"';
  var dis = '<button type="button" class="sbtn quiet" data-a="dispute" ' + ids + '>We disagree</button>';   // v108 (65)
  if (st === 'client' && isQuote(c)) {
    var q = pdQuoteEntry(c);
    if (ex) return '<div class="dr-f"><button type="button" class="pbtn" data-a="newquote" ' + ids + '>Ask for a new quote</button><div class="row2"><button type="button" class="sbtn" data-a="counter" ' + ids + '>Suggest different terms</button><button type="button" class="sbtn quiet" data-a="decline" ' + ids + '>Decline</button>' + dis + '</div></div>';
    if (badRecord({ kind: 'quote', c: c, pid: p.id })) return '<div class="dr-f">' + badNote() + '<div class="row2"><button type="button" class="sbtn" data-a="ask" ' + ids + '>Ask a question</button></div></div>';
    return '<div class="dr-f"><button type="button" class="pbtn" data-a="approve-from" data-key="cr:' + p.id + ':' + c.id + '"><span>Approve · ' + (q.amt ? '+' + money(q.amt) : 'no extra cost') + '</span>' + IC('arrow', 16, 1.6) + '</button><div class="row2"><button type="button" class="sbtn" data-a="counter" ' + ids + '>Suggest different terms</button><button type="button" class="sbtn" data-a="ask" ' + ids + '>Ask a question</button><button type="button" class="sbtn quiet" data-a="decline" ' + ids + '>Decline</button>' + dis + '</div><p class="fine2">' + PRIV + '</p></div>';
  }
  /* CONTRACT 82: with no quote on the table, closing it is taking your own request back */
  var wd = '<button type="button" class="sbtn quiet" data-a="decline" ' + ids + '>Withdraw this request</button>';
  if (st === 'client') return '<div class="dr-f"><button type="button" class="pbtn" data-a="note" ' + ids + '>Reply to ' + esc(sn) + '</button><div class="row2">' + wd + dis + '</div></div>';
  if (st === 'me') return '<div class="dr-f"><div class="row2"><button type="button" class="sbtn" data-a="note" ' + ids + '>Add a note</button><button type="button" class="sbtn" data-a="ask" ' + ids + '>Ask a question</button>' + wd + dis + '</div><p class="fine2">' + esc(sn) + ' will reply here.</p></div>';
  if (st === 'approved') return '<div class="dr-f"><p class="fine2">An approved request takes no more entries. To change something, ask for a new change.</p><div class="row2"><button type="button" class="sbtn" data-a="new">Request a change</button></div></div>';
  return '<div class="dr-f"><div class="row2"><button type="button" class="sbtn" data-a="note" ' + ids + '>Write to ' + esc(sn) + '</button>' + dis + '</div><p class="fine2">Writing here reopens this request for ' + esc(sn) + '.</p></div>';
}
function reqDrawer(p, cid) {
  var sn = studioName(), d = $('#dReq'), l = pdLatest(p);
  if (!cid) {
    var crs = pdCrList(p), isOpen = function (c) { var s = pdCrState(c); return s === 'client' || s === 'me'; }, o = crs.filter(isOpen), cl2 = crs.filter(function (c) { return !isOpen(c); }), list = S.crf === 'open' ? o : cl2;
    var tools = '<div class="dr-tools"><div class="seg" role="group" aria-label="Filter changes"><button type="button" data-a="crf" data-f="open" aria-pressed="' + (S.crf === 'open') + '">Open · ' + o.length + '</button><button type="button" data-a="crf" data-f="closed" aria-pressed="' + (S.crf === 'closed') + '">Closed · ' + cl2.length + '</button></div></div>';
    var rows = list.length ? '<ul class="crl card3" style="padding:6px 14px">' + list.map(function (c) { var q = pdTerms(c); return '<li><button type="button" data-a="req" data-pid="' + p.id + '" data-cid="' + c.id + '"><span class="cid">' + c.id + '</span><span class="ct">' + esc(c.t) + (q ? '<br><span style="font-size:12.5px;color:var(--muted2)">' + esc(amtTxt(q.amt, q.days)) + '</span>' : '') + '</span>' + crChip(c) + '</button></li>'; }).join('') + '</ul>' : '<div class="card3"><p class="bx-p">' + (S.crf === 'open' ? 'Nothing is open. Anything you ask for shows up here.' : 'No closed changes yet.') + '</p></div>';
    fill(d, dHead('swap', 'Changes', plural(o.length, 'open change') + ' · ' + cl2.length + ' closed') + tools + '<div class="dr-body">' + rows + '</div><div class="dr-f"><button type="button" class="pbtn" data-a="new">' + IC('plus', 16, 1.8) + '<span>Request a change</span></button></div>');
    S.dr.req = null; return;
  }
  var c = pdCr(p, cid), st = pdCrState(c), q = pdTerms(c), ex = pdExpired(c), ver = pdCrVer(p, c), info = '';
  if (st === 'approved' && c.adds) info = ver ? '<div class="info">' + IC('check', 18, 2) + '<span><b>In Scope v' + ver + '.</b> This change is part of the agreed Scope.</span></div>' : '<div class="info warn">' + IC('swap', 18) + '<span><b>Approved, outside the Scope for now.</b> ' + esc(sn) + ' will add it to Scope v' + (l.v + 1) + '. You will be asked to approve that version too.</span></div>';
  else if (st === 'declined') info = '<div class="info">' + IC('check', 18, 2) + '<span><b>Declined.</b> Your Scope' + (pdTotals(p) && pdTotals(p).newDelivery != null ? ' and the ' + dayLbl(pdTotals(p).newDelivery) + ' delivery stay' : ' stays') + ' as agreed.</span></div>';
  if (ex) info = '<div class="info late">' + IC('clock', 18) + '<span><b>This quote expired on ' + dayLbl(pdQuoteEntry(c).vu) + '.</b> ' + esc(sn) + ' needs to send a new one. You can ask for it below.</span></div>';
  var thr = dsCardHTML(p, c) + '<ol class="thr">' + c.entries.map(function (e, i) { return entryHTML(p, c, e, i); }).join('') + '</ol>';
  var chain = LIVEON ? liveChainLine(c) : c.entries.every(function (e) { return e.hx; }) ? '<p class="chainf">' + IC('check', 15, 2.2) + 'Chain intact · ' + plural(c.entries.length, 'entry', 'entries') + '</p>' : '';
  var sub = '<span class="mono">' + c.id + '</span>' + crChip(c) + (q ? '<span>' + esc(amtTxt(q.amt, q.days)) + '</span>' : '');
  var tools2 = '<div class="dr-tools"><button type="button" class="lk2" style="margin-left:0" data-a="req" data-pid="' + p.id + '">' + IC('back', 15, 1.6) + '<span>All changes</span></button></div>';
  fill(d, dHead('swap', esc(c.t), sub) + tools2 + '<div class="dr-body">' + info + thr + chain + '</div>' + reqFoot(p, c), S.dr.req === c.id);
  S.dr.req = c.id;
}
function openReq(pid, cid) { reqDrawer(P[pid], cid || null); S.dr.reqP = pid; openD($('#dReq')); }

