/* ───── start ───── */
var started = false;
function start() {
  if (started) return; started = true;
  var m = /^#\/p\/([\w-]+)(?:\/e\/([0-9A-Fa-f]{6}))?$/.exec(location.hash), c = cl();
  if (m && c.projects.indexOf(m[1]) > -1) S.route = { k: 'p', id: m[1] }; else landing();
  var enAt = m && m[2] && S.route.k === 'p' ? m[2] : '';   /* v102 (58): an entry's link */
  if (!LIVEON) {
    var qc = /[?&]as=([\w-]+)/.exec(location.search); if (qc && client(qc[1])) { S.cid = qc[1]; landing(); }
    var pj = /[?&]project=([\w-]+)/.exec(location.search); if (pj && P[pj[1]] && client(S.cid).projects.indexOf(pj[1]) > -1) S.route = { k: 'p', id: pj[1] };
  }
  if (LIVEON || DEMO || /[?&]clean\b/.test(location.search)) $('#dock').hidden = true;   // v120 (88): the sample's demo has no prototype dock
  if (DEMO && !LIVEON) { root.classList.add('demo-ro'); $('#demoRo').hidden = false; }   // and says it is a sample, to look at
  if (SEEN) { root.classList.add('go'); render('nav'); }
  else {
    render('intro');
    var go = function () { if (root.classList.contains('go')) return; root.classList.add('go'); try { sessionStorage.setItem('sd-portal-seen', '1'); } catch (e) { } };
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 1400); })]).then(function () { requestAnimationFrame(go); });
    setTimeout(go, 2600);
  }
  if (enAt) setTimeout(function () { if (!enGo(S.route.id, enAt)) try { history.replaceState(null, '', '#/p/' + S.route.id); } catch (e) { } }, SEEN ? 0 : 1500);
  if (/[?&]test\b/.test(location.search) && (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) window.__portal = { get S() { return S; }, get P() { return P; }, get STUDIO() { return STUDIO; }, get LIVE() { return LIVE; }, liveFetch: liveFetch, liveTick: liveTick, apiCall: apiCall, fmtAt: fmtAt, CLIENTS: CLIENTS, actionsFor: actionsFor, pdTotals: pdTotals, pdLatest: pdLatest, pdCrState: pdCrState, pdExpired: pdExpired, pdPending: pdPending, pdCr: pdCr, receiptHTML: receiptHTML, ensureHashes: ensureHashes, now: now, render: render, msDlg: msDlg, crChip: crChip, openScope: openScope, allActions: allActions, msM: msM, msActions: msActions, smRecordHTML: smRecordHTML };
}
if (BOOT.mode === 'live') liveBoot();
else if (BOOT.mode === 'wall') wall('open');
else { buildData(); ensureHashes(start); setTimeout(start, 900); }

