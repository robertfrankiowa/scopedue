/* ───── Copies, history, about ───── */
function openCopies(pid) {
  var p = P[pid], l = copies(p);
  fill($('#dCopies'), dHead('folder', 'Shared copies', plural(l.length, 'copy', 'copies') + ' shared by ' + esc(studioName())) + '<div class="dr-body"><p class="hlp">These are copies ' + esc(studioName()) + ' chose to share. Each has a fingerprint, so you can check later that a copy has not changed.</p><ul class="cp-l">' + l.map(function (e) {
    return '<li class="cp-r"><span class="cpi">' + IC(KIND_IC[e.kind] || 'doc', 18) + '</span><div><b>' + esc(e.copy.title || e.title) + '</b><span>' + esc(kindLbl(e)) + ' · ' + esc(e.copy.at) + (e.ref ? ' · ' + esc(pdeRefLabel(e.ref)) : '') + '</span><span><span class="fpc">' + shortFp(e.copy.fp) + '</span></span></div>' + (LIVEON ? '' : '<button type="button" class="cp-open" data-a="cpopen">Open</button>') + '</li>';
  }).join('') + '</ul></div>');
  openD($('#dCopies'));
}
function openHist(pid) {
  var p = P[pid], ev = projEvents(p).concat(msEvents(p)).sort(function (a, b) { return b.ts - a.ts; }), g = '', last = '';
  ev.forEach(function (e) {
    var dl = dayOf(e.ts); if (dl !== last) { if (last) g += '</ul>'; g += '<p class="hg">' + esc(dl) + '</p><ul class="hl">'; last = dl; }
    g += '<li><time>' + clockOf(e.ts) + '</time><button type="button" data-a="evgo" data-k="' + esc(e.k) + '"><b>' + esc(e.t) + '</b><span>' + esc(e.d) + '</span></button></li>';
  });
  if (last) g += '</ul>';
  fill($('#dHist'), dHead('clock', 'History', esc(p.n)) + '<div class="dr-body">' + (g || '<p class="bx-p">Nothing yet.</p>') + '</div><div class="dr-f"><button type="button" class="sbtn" data-a="record" data-pid="' + p.id + '">' + IC('print', 16, 1.6) + '<span>Download the record</span></button><p class="fine2">Everything agreed and delivered, with fingerprints. Print it or save it as a PDF.</p></div>');
  openD($('#dHist'));
}
function pfDays(d) {
  d = d.slice().sort(function (a, b) { return a - b; });
  if (d.length === 7) return 'Every day';
  var out = [], i = 0;
  while (i < d.length) { var j = i; while (j + 1 < d.length && d[j + 1] === d[j] + 1) j++; out.push(j - i >= 2 ? PF_DN[d[i]] + '–' + PF_DN[d[j]] : d.slice(i, j + 1).map(function (x) { return PF_DN[x]; }).join(', ')); i = j + 1; }
  return out.join(', ');
}
function hhmm(s) { var h = +s.slice(0, 2); return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); }
function intlLoc() { return window.SDI18N && SDI18N.lang === 'vi' ? 'vi-VN' : 'en-US'; }
function localTime(tz) { try { return new Intl.DateTimeFormat(intlLoc(), { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date()); } catch (e) { return ''; } }
function openAbout(help) {
  var sn = studioName(), s = STUDIO, rows = [['Availability', pfDays(s.days) + ' · ' + hhmm(s.from) + '–' + hhmm(s.to)], ['Replies', PF_REPLY[s.reply].replace('Usually replies ', '')]];
  if (s.sl && s.city) rows.push(['Location', s.city + (localTime(s.tz) ? ' · ' + localTime(s.tz) + ' there' : '')]);
  if (s.se && s.email) rows.push(['Email', s.email]);
  if (s.sp && s.phone) rows.push(['Phone', s.phone]);
  var p = S.route.k === 'p' ? P[S.route.id] : null;
  fill($('#dAbout'), dHead('user', help ? 'Need help?' : 'About ' + esc(sn), esc(sn)) + '<div class="dr-body">' +
    (help ? '<p class="hlp"><b>Questions about the project</b> are best asked on the item itself, so the answer stays on record. For anything else, write to ' + esc(s.name) + ' directly.</p>' : '') +
    '<div class="ab"><span class="av"' + (photoUrl(s.photo) ? ' style="background-image:url(\'' + photoUrl(s.photo) + '\')"' : '') + '>' + esc(ini(s.name)) + '</span><div><h3>' + esc(s.name) + '</h3><p class="sub">' + esc([s.title, s.biz].filter(Boolean).join(' · ')) + '</p></div>' + (s.bio ? '<p>' + esc(s.bio) + '</p>' : '') +
    '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></div></div>' +
    (s.email ? '<div class="dr-f"><a class="pbtn" style="text-decoration:none" href="mailto:' + esc(s.email) + '?subject=' + encodeURIComponent(p ? p.n : 'Hello') + '">' + IC('mail', 17, 1.6) + '<span>Email ' + esc(s.name.split(' ')[0]) + '</span></a></div>' : ''));
  openD($('#dAbout'));
}

