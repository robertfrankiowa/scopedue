/* ───────── Portal v2: render, routing, events, prototype dock ───────── */
var SEEN = false; try { SEEN = !!sessionStorage.getItem('sd-portal-seen'); } catch (e) { }
function render(mode) {
  mode = mode || 'soft';
  if (V.inVerify) cancelVerify();
  var html = S.route.k === 'home' ? homeHTML() : projHTML(S.route.id);
  view.innerHTML = html + footHTML();
  root.classList.toggle('seen', mode !== 'intro');
  root.classList.toggle('nodelay', mode === 'soft');
  paintHeader(); paintNotif(); paintDock();
  var p = S.route.k === 'p' ? P[S.route.id] : null;
  document.title = (p ? p.n : 'Your projects') + ' · Client portal · ' + studioName();
  if (mode === 'soft') playReel(true); else setTimeout(playReel, mode === 'intro' && !SEEN ? 1850 : 600);
  if (S.sealNext) { S.sealNext = false; var pn = $('#panel'); if (pn) { pn.classList.add('sealed'); setTimeout(function () { pn.classList.remove('sealed'); }, 1600); } }
}
function landing() { var c = cl(); S.route = c.projects.length === 1 && !(c.gone || []).length ? { k: 'p', id: c.projects[0] } : { k: 'home' }; }   /* v96: what was removed is said on Home */
function hashFor(r) { return r.k === 'home' ? '#/' : '#/p/' + r.id; }
function nav(route, opts) {
  opts = opts || {}; closeAllD(); closeMenus(); S.route = route; S.done = null; S.sel = opts.sel || null;
  try { history.replaceState(null, '', hashFor(route)); } catch (e) { }
  render('nav'); window.scrollTo(0, 0);
}
function closeMenus() { $('#acctMenu').hidden = true; $('#whoBtn').setAttribute('aria-expanded', 'false'); $('#tmenu').hidden = true; $('#thmBtn').setAttribute('aria-expanded', 'false'); $('#notif').classList.remove('open'); $('#bellBtn').setAttribute('aria-expanded', 'false'); }
function toggleMenu(which) {
  if (which === 'theme') { var th = !$('#tmenu').hidden; closeMenus(); if (!th) { paintThemeMenu(); $('#tmenu').hidden = false; $('#thmBtn').setAttribute('aria-expanded', 'true'); var f = $('#tmenu [aria-checked="true"]'); if (f) f.focus({ preventScroll: true }); } return; }
  if (which === 'acct') { var h = !$('#acctMenu').hidden; closeMenus(); if (!h) { $('#acctMenu').hidden = false; $('#whoBtn').setAttribute('aria-expanded', 'true'); } }
  else { var o = $('#notif').classList.contains('open'); closeMenus(); if (!o) { paintNotif(); $('#notif').classList.add('open'); $('#bellBtn').setAttribute('aria-expanded', 'true'); } }
}
function goEvent(k) {
  var e = clientEvents(client(S.cid)).filter(function (x) { return x.k === k; })[0]; if (!e) return;
  S.read[k] = true; if (LIVEON) liveReadSave(); closeMenus(); paintHeader(); paintNotif();
  var go = e.go; if (S.route.k !== 'p' || S.route.id !== go.pid) { S.route = { k: 'p', id: go.pid }; S.done = null; S.sel = null; render('nav'); }
  if (go.a === 'scope') openScope(go.pid, go.v); else if (go.a === 'ms') msGo(); else openReq(go.pid, go.cid);
}
function msGo() { var el = $('#ms-card'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: RM.matches ? 'auto' : 'smooth' }); }

