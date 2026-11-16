/* ───── Receipt ───── */
function tzLong() { try { var p = new Intl.DateTimeFormat(intlLoc(), { timeZoneName: 'long' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : ''; } catch (e) { return ''; } }
function receiptHTML(rk) {
  var q = rk.split('|'), p = P[q[1]], c = cl(), sn = studioName(), rec, title, what, fp, fpl, by, rows;
  if (q[0] === 'm') {
    var ev = (p.mev || [])[+q[2]], M = msM(p), ms = ev ? smMs(M, ev.m) : null, dv = null, j; for (j = +q[2] - 1; j >= 0; j--) if (p.mev[j].ty === 'deliver' && p.mev[j].m === ev.m) { dv = p.mev[j]; break; }
    rec = { at: fmtAt(ev.ts), ip: ev.rec ? ev.rec.ip : '', ts: ev.ts }; title = (ms ? ms.t : 'Milestone') + ' accepted'; by = c.name; fp = (ev.rec && ev.rec.fp) || (dv && dv.hx ? pdGroup(dv.hx, 12) : ''); fpl = 'Fingerprint of the accepted delivery';
    what = (ms ? ms.t : 'A milestone') + ', delivered ' + (dv ? fmtAt(dv.ts) : '') + (dv && dv.link ? ' (' + dv.link + ')' : '') + '. Accepted under Scope v' + ev.v + '.';
  } else if (q[0] === 'v') {
    var v = pdVer(p, +q[2]), t = pdTermsOf(v), n = counts(v), dl = pdDelivery(v.items);
    rec = v.rec; title = 'Scope v' + v.v + ' approved'; by = String(v.appr || '').split(' · ')[0] || c.name; fp = v.fp; fpl = 'Scope fingerprint';
    what = 'Scope v' + v.v + ': ' + plural(n.in, 'deliverable') + ', ' + n.out + ' not included, ' + plural(n.tl, 'milestone') + (t.price != null ? '. Contract value ' + money(t.price) : '') + (t.rev != null ? '. ' + plural(t.rev, 'revision round') : '') + (dl != null ? '. Expected delivery ' + dayLbl(dl) : '') + '.';
  } else {
    var cr = pdCr(p, q[2]), e = cr.entries[+q[3]], qt = null, i; for (i = +q[3] - 1; i >= 0; i--) if (cr.entries[i].amt != null) { qt = cr.entries[i]; break; }
    rec = { at: e.at, ip: e.rec.ip, ts: e.ts }; title = cr.id + ' approved'; by = c.name; fp = (e.rec && e.rec.fp) || pdGroup(e.hx || '', 12); fpl = 'Fingerprint of the approved quote';
    what = 'Quote on ' + cr.id + ' (' + cr.t + '): ' + (qt ? (qt.amt ? money(qt.amt) : 'No extra cost') + (qt.days ? ', +' + dayw(qt.days) : '') : '') + '. Counted in the new total and expected delivery; added to the Scope in the next version.';
  }
  rows = [['Project', p.n], ['Client', by + ' (' + mask(c.email) + ')'], ['Studio', sn + (STUDIO.email && STUDIO.se ? ' · ' + STUDIO.email : '')], ['What was approved', what], ['Approved with', 'An emailed code'], ['Time', rec.at + (tzLong() ? ' · ' + tzLong() : '')], ['IP address', rec.ip]];
  return '<p class="rk">Approval receipt · ScopeDue</p><h1>' + esc(title) + '</h1><p class="rl">' + esc(p.n) + ' for ' + esc(c.biz) + '</p><table>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table><p class="rk" style="margin-bottom:2pt">' + fpl + '</p><span class="fpb">' + esc(fp) + '</span><p class="rn">ScopeDue keeps this fingerprint, the time and the IP address. ' + esc(sn) + ' holds the same record. Neither holds your project files. Keep this receipt: the fingerprint lets either of you show later exactly what was approved.</p>';
}
function printReceipt(rk) {
  $('#receipt').innerHTML = receiptHTML(rk); document.body.classList.add('printing');
  var done = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch (e) { done(); }
  setTimeout(function () { if (!document.hasFocus || document.hasFocus()) done(); }, 1500);
}

