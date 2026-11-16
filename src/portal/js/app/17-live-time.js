/* ───── the viewer's time: the server sends epoch ms, this is the one place that formats it ───── */
function fmtAt(ts) { var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()] + ' · ' + clock(d); }
function kindLbl(e) { return e.kindText || (typeof PDE_KIND !== 'undefined' && PDE_KIND[e.kind] ? PDE_KIND[e.kind][0] : 'File'); }

