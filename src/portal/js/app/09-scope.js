/* ───── Scope ───── */
function itemRows(p, v, sec) {
  var prev = pdVer(p, v.v - 1), pm = {}, vm = {}, h = '';
  if (prev) prev.items.forEach(function (x) { pm[x.id] = x; });
  v.items.forEach(function (x) { vm[x.id] = x; });
  v.items.filter(function (x) { return x.sec === sec; }).forEach(function (x) {
    var b = pm[x.id], tag = prev ? (!b ? '<span class="tag new">New</span>' : (b.t !== x.t || b.d !== x.d) ? '<span class="tag mod">Changed</span>' : '') : '';
    var cr = x.cr ? '<button type="button" class="tag" data-a="req" data-pid="' + p.id + '" data-cid="' + x.cr + '" title="Open ' + x.cr + '">' + x.cr + '</button>' : '';
    h += '<li><span class="mk' + (sec === 'out' ? ' x' : sec === 'tl' ? ' tl' : '') + '">' + (sec === 'out' ? IC('x', 11, 2.4) : sec === 'tl' ? IC('clock', 11, 2) : IC('check', 11, 2.6)) + '</span><span class="tx">' + esc(x.t) + '</span>' + tag + cr + (sec === 'tl' && x.d ? '<span class="dd">' + esc(x.d) + '</span>' : '') + '</li>';
  });
  if (prev) prev.items.filter(function (x) { return x.sec === sec && !vm[x.id]; }).forEach(function (x) { h += '<li class="rm"><span class="mk x">' + IC('x', 11, 2.4) + '</span><span class="tx">' + esc(x.t) + '</span><span class="tag">Removed</span></li>'; });
  return h;
}
function scopeDrawer(p, vn) {
  var l = pdLatest(p), sn = studioName(), c = cl(); if (!l) return;
  var v = pdVer(p, vn) || l, isL = v === l, t = pdTermsOf(v), dl = pdDelivery(v.items), tot = pdTotals(p), prev = pdVer(p, v.v - 1);
  var sub = (v.appr ? '<span class="chip ok">Approved</span>' : '<span class="chip need">Needs your reply</span>') + '<span>Shared ' + esc(v.at.split(' · ')[0]) + '</span>';
  var tools = p.vers.length > 1 ? '<div class="dr-tools"><div class="seg" role="group" aria-label="Scope versions">' + p.vers.map(function (x) { return '<button type="button" data-a="sv" data-pid="' + p.id + '" data-v="' + x.v + '" aria-pressed="' + (x === v) + '">v' + x.v + (x === l ? ' · latest' : '') + '</button>'; }).join('') + '</div></div>' : '';
  var kv = [];
  if (t.price != null) kv.push(['Contract value', money(t.price)]);
  if (t.rev != null) kv.push(['Revision rounds', plural(t.rev, 'round') + (isL ? ' · ' + p.rev.used + ' used' : '')]);
  if (dl != null) kv.push(['Expected delivery', dayLbl(isL && tot && tot.newDelivery != null ? tot.newDelivery : dl) + (isL && tot && tot.pend.days ? ' (+' + dayw(tot.pend.days) + ' approved)' : '')]);
  kv.push(['Fingerprint', v.fp || '', 'fp']);
  var body = '';
  if (LIVEON && v.fpOk === false) body += '<div class="info warn">' + IC('x', 18) + '<span><b>This version does not match its fingerprint.</b> It has been changed since it was issued. Do not rely on it or approve it. Contact ' + esc(sn) + '.</span></div>';
  if (isL && tot && tot.pend.ids.length) body += '<div class="info warn">' + IC('swap', 18) + '<span><b>Approved, not in this version yet:</b> ' + tot.pend.ids.map(function (id) { var cr = pdCr(p, id); return esc(id + ' ' + cr.t); }).join(', ') + ' (' + amtTxt(tot.pend.amt, tot.pend.days) + '). ' + esc(sn) + ' will add ' + (tot.pend.ids.length > 1 ? 'them' : 'it') + ' to Scope v' + (l.v + 1) + '. You will be asked to approve that version too.</span></div>';
  if (smV2(v)) { body += '<section class="card3"><h4>Fingerprint</h4><dl class="kv"><div><dt>Scope v' + v.v + '</dt><dd class="fp">' + esc(v.fp || '') + '</dd></div></dl></section>' + msScopeBody(p, v); }
  else {
  body += '<section class="card3"><h4>Terms</h4><dl class="kv">' + kv.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></section>';
  SEC.forEach(function (s) { var rows = itemRows(p, v, s[0]); if (!rows) return; body += '<section class="sc-sec"><h4>' + s[1] + '<span>' + (prev ? 'compared with v' + prev.v : '') + '</span></h4><ul class="sc-l">' + rows + '</ul></section>'; });
  }
  if (v.rec) {
    var by = String(v.appr || '').split(' · ')[0] || c.name;
    body += '<section class="card3" style="margin-top:22px"><h4>Approval record</h4><div class="rcd"><span class="sh">' + IC('shield', 16) + 'Verified with an email code</span><span>Approved by ' + esc(by) + ' · ' + esc(mailLine(c)) + '</span><span>' + esc(v.rec.at) + ' · IP ' + esc(v.rec.ip) + '</span><small>The fingerprint above identifies exactly this version. ' + esc(sn) + ' holds the same record.</small></div><div style="margin-top:12px"><button type="button" class="ghostb" data-a="receipt" data-r="v|' + p.id + '|' + v.v + '">' + IC('print', 16, 1.6) + '<span>Print receipt</span></button></div></section>';
  }
  var foot = !v.appr && isL && !(LIVEON && v.fpOk === false) ? '<div class="dr-f"><button type="button" class="pbtn" data-a="approve-from" data-key="scope:' + p.id + ':' + v.v + '"><span>Approve Scope v' + v.v + '</span>' + IC('arrow', 16, 1.6) + '</button><p class="fine2">' + PRIV + '</p></div>' : '';
  fill($('#dScope'), dHead('doc', 'Scope v' + v.v, sub) + tools + '<div class="dr-body">' + body + '</div>' + foot, S.dr.scopeV === v.v && S.dr.scopeP === p.id);
  S.dr.scopeV = v.v; S.dr.scopeP = p.id;
}
function openScope(pid, vn) { var p = P[pid]; if (!pdLatest(p)) return; scopeDrawer(p, vn); openD($('#dScope')); }

