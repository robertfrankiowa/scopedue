/* ───── loading ───── */
/* cb(true) once the model is fresh. On a dead session or a closed portal the wall is shown and cb(false) is called. */
function liveFetch(cb, quiet, fresh) {
  if (LIVE.loading) { setTimeout(function () { liveFetch(cb, quiet, fresh); }, 120); return; }
  LIVE.loading = true;
  apiCall('GET', '/v1/portal').then(function (r) {
    if (r.status !== 200) {
      LIVE.loading = false;
      if (quiet && (r.net || r.status >= 500)) return cb && cb(false);
      liveFail(r); if (cb) cb(false);
      return;
    }
    if (typeof r.data.pulse === 'number') { LIVE.pn = r.data.pulse; LIVE.due = false; }   // v113 (72): what this answer covers
    var sig = liveSig(r.data), np = null;
    try { np = liveMap(r.data); } catch (x) { np = null; }
    if (!np) { LIVE.loading = false; if (quiet) return cb && cb(false); wall('offline'); if (cb) cb(false); return; }   // an answer this page cannot read is not shown
    liveVerify(np, function () {
      P = np; LIVE.sig = sig + '#' + liveFlags(np); LIVE.loading = false;   // what was checked is part of what changed
      (fresh || []).forEach(function (f) { var p = P[f[0]], c = p && pdCr(p, f[1]), e = c && c.entries[f[2]]; if (e) e.fresh = true; });
      if (cb) cb(true);
      if ($('#dReq') && $('#dReq').open || $('#dScope') && $('#dScope').open) { try { refreshDrawers(); } catch (x) { } }
    });
  });
}
function liveFail(r) {
  var code = errCode(r);
  if (r.status === 401) { liveForget(); wall('ended'); }
  else if (r.status === 403 || code === 'portal_closed') wall('closed');
  else if (r.net || r.status >= 500) wall('offline');
  else wall('ended');
}
function liveUnwall() {
  LIVE.walled = false; root.classList.remove('wall'); clearInterval(LIVE.timer); LIVE.timer = setInterval(liveTick, 60000);
  clearInterval(LIVE.ptimer); LIVE.ptimer = setInterval(livePulse, 5000);
}
/* v113 (CONTRACT 72): every 5 seconds one number from the server, which moves when the studio wrote something for this client. The
   page loads again only then (and every minute anyway); a move seen while a dialog is open waits until the page can load */
function livePulse() {
  if (!LIVEON || LIVE.walled || document.hidden || LIVE.pb) return;
  if (LIVE.due) { if (liveTick() !== false) LIVE.due = false; return; }
  LIVE.pb = true;
  apiCall('GET', '/v1/cpulse').then(function (r) {
    LIVE.pb = false;
    if (r.status === 401 || r.status === 403) { liveTick(); return; }   // the session ended or the portal closed: the load shows the wall
    if (r.status !== 200 || typeof r.data.n !== 'number') return;   // an older server has no /v1/cpulse: the minute alone
    var was = LIVE.pn; LIVE.pn = r.data.n;
    if (was != null && was !== r.data.n && liveTick() === false) LIVE.due = true;
  });
}
function liveForget() { LIVE.session = ''; try { sessionStorage.removeItem('sd-live'); } catch (e) { } }
function liveSaveSession() { try { sessionStorage.setItem('sd-live', JSON.stringify({ slug: LIVE.slug, session: LIVE.session, exp: LIVE.exp, name: LIVE.name })); } catch (e) { } }

function liveBoot() {
  LIVEON = true; root.classList.add('live'); $('#dock').hidden = true;
  var link = BOOT.link || LIVE.link, sv = BOOT.saved;
  if (link) {
    LIVE.link = link; LIVE.slug = link.slug; lsSet('sd-slug', link.slug);
    apiCall('POST', '/v1/session', { token: link.token }).then(function (r) {
      if (r.net || r.status >= 500) return wall('offline');   // nothing was decided about the link: it stays, and Try again uses it
      if (r.status === 429) return wall('busy');
      LIVE.link = null; BOOT.link = null; window.SD_LINK = null;
      try { sessionStorage.removeItem('sd-link'); } catch (e) { }   // the server has decided about it: a reload does not try it again
      if (/^#s=/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search + '#/'); } catch (e) { }   // a page without boot.js: the token leaves the address bar now
      if (r.status === 200) { LIVE.session = r.data.session; LIVE.exp = r.data.expires_at; LIVE.name = r.data.studio.name; liveSaveSession(); liveFirst(); }
      else if (errCode(r) === 'portal_closed' || r.status === 403) wall('closed');
      else wall('expired');
    });
  } else if (sv) { LIVE.slug = sv.slug; LIVE.session = sv.session; LIVE.exp = sv.exp; LIVE.name = sv.name || ''; liveFirst(); }
  else wall('open');
}
function liveFirst() {
  liveFetch(function (ok) {
    if (!ok) return;
    liveLangReady(function () {
      S.read = liveReadLoad();
      start();
      liveUnwall();
    });
  });
}
/* Try again, from any wall that offers it */
function liveRetry() {
  if (BOOT.link || LIVE.link) return liveBoot();      // the link was never traded
  if (!LIVE.session) return wall('ended');
  liveFetch(function (ok) {
    if (!ok) return;
    if (!started) return liveFirst();
    liveUnwall(); render('soft');
  });
}
function liveReadLoad() { try { return JSON.parse(lsGet('sd-read:' + LIVE.slug + ':' + S.cid) || '{}') || {}; } catch (e) { return {}; } }
function liveReadSave() { lsSet('sd-read:' + LIVE.slug + ':' + S.cid, JSON.stringify(S.read)); }

/* the studio may have answered while the page was open: look again on a timer and when the tab comes back */
function liveTick() {
  if (!LIVEON || LIVE.walled || document.hidden || LIVE.loading || V.inVerify || S.done || document.querySelector('dialog[open]') || $('body').classList.contains('printing')) return false;
  var before = LIVE.sig, had = {};
  Object.keys(P).forEach(function (id) { P[id].crs.forEach(function (c) { had[id + '|' + c.id] = c.entries.length; }); had[id + '|mev'] = (P[id].mev || []).length; });
  liveFetch(function (ok) {
    if (!ok || LIVE.sig === before) return;
    var n = 0, who = '';
    Object.keys(P).forEach(function (id) { P[id].crs.forEach(function (c) { var k = had[id + '|' + c.id]; c.entries.forEach(function (e, i) { if ((k == null || i >= k) && e.w === 'y') { n++; S.fresh['e|' + id + '|' + c.id + '|' + i] = true; } }); }); });
    Object.keys(P).forEach(function (id) { var k = had[id + '|mev']; (P[id].mev || []).forEach(function (e, i) { if ((k == null || i >= k) && e.w === 'y') { n++; S.fresh['m|' + id + '|' + i] = true; } }); });
    if (S.route.k === 'p' && !P[S.route.id]) landing();
    render('soft');
    if (n) toast(studioName() + ' sent an update.');
  }, true);
}
window.addEventListener('hashchange', function () { if (/^#s=[a-z0-9]{6,20}&k=sdl_[\w-]+$/.test(location.hash)) location.reload(); });   // a link opened in this tab starts over with its own session
document.addEventListener('visibilitychange', function () { if (LIVEON && !document.hidden) liveTick(); });

