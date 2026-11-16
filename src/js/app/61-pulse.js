  /* ---------- v113: the pulse (CONTRACT.md 72) ----------
     Every 5 seconds while the app is on screen (every 30 after ten minutes without a click or a key), one number from the server.
     It goes up when a client, a Viewer, an invitation, a teammate's save in Google Drive or in team sync changed something for this
     account; only then do the usual pulls run, at once, instead of waiting for their own minute. The open tabs of the app share one
     ask through localStorage. A device that wrote a project's file in Drive moves the number for the project's people (plTell).
     An older server answers 404: the pulls keep their own minutes, as before. */
  var PL = { n: -1, slug: '', busy: false, act: Date.now(), tm: 0, no: 0, last: 0, to: {}, tt: 0 };
  var PL_LS = 'sd-pulse', PL_FAST = 5000, PL_SLOW = 30000, PL_IDLE = 600000;
  function plOn() { return !!(SY.key && SY.url && SY.st !== 'auth'); }
  function plCached() { try { var o = JSON.parse(localStorage.getItem(PL_LS) || 'null'); return o && o.slug === SY.slug ? o : null; } catch (e) { return null; } }
  function plSave(n) { try { localStorage.setItem(PL_LS, JSON.stringify({ slug: SY.slug, n: n, at: Date.now() })); } catch (e) {} }
  function plGot(n) {
    if (PL.slug !== SY.slug) { PL.slug = SY.slug; PL.n = -1; }   /* another account: its first number is where it starts */
    /* the pulls at start cover what came before; a number this browser saw on an earlier visit that moved since is pulled once more */
    if (PL.n < 0) { var seen = PL.seen; PL.n = n; if (seen != null && seen !== n) plRun(); return; }
    if (n === PL.n) return;
    PL.n = n; plRun();
  }
  /* what may have changed: each pull keeps its own guards, and one busy now is asked again a moment later */
  function plRun() {
    var again = VP.busy || tiS().busy || (CP && CP.busy);
    PL.last = Date.now();
    syPullSoon(); vpPull(); tiPull(); cpPull(); dvRun(true); blPulse();
    if (x8On() && PROJECTS.some(function (p) { return p.x8; })) x8Sync(false);
    if (again) setTimeout(function () { vpPull(); tiPull(); cpPull(); }, 4000);
  }
  async function plAsk() {
    if (!plOn() || PL.busy || document.visibilityState !== 'visible' || SDB.S.stale || Date.now() - PL.no < 600000) return;
    var c = plCached(); if (c && Date.now() - c.at < PL_FAST - 800) { plGot(c.n); return; }
    if (PL.n < 0 && PL.seen === undefined) PL.seen = c ? c.n : null;
    PL.busy = true;
    var r = await syCall('GET', '/v1/pulse');
    PL.busy = false;
    if (r.status === 404 || r.status === 405) { PL.no = Date.now(); return; }
    if (!syOk(r) || typeof r.data.n !== 'number') return;
    plSave(r.data.n); plGot(r.data.n);
  }
  function plLoop() {
    clearTimeout(PL.tm);
    PL.tm = setTimeout(function () { plAsk().then(plLoop, plLoop); }, Date.now() - PL.act > PL_IDLE ? PL_SLOW : PL_FAST);
  }
  /* after a write to Drive: the project's people, and this person (their other devices). Gathered for 4 seconds, so typing sends one */
  function plTell(emails) {
    if (!plOn()) return;
    (emails || []).forEach(function (e) { e = String(e || '').toLowerCase(); if (e.indexOf('@') > 0) PL.to[e] = 1; });
    if (PL.tt) return;
    PL.tt = setTimeout(function () {
      PL.tt = 0; var to = Object.keys(PL.to).slice(0, 60); PL.to = {};
      if (to.length && Date.now() - PL.no >= 600000) syCall('POST', '/v1/pulse', { to: to });
    }, 4000);
  }
  ['pointerdown', 'keydown'].forEach(function (t) { document.addEventListener(t, function () { var idle = Date.now() - PL.act > PL_IDLE; PL.act = Date.now(); if (idle) plLoop(); }, true); });
  /* another tab of the app asked: what it got counts here too, at once */
  window.addEventListener('storage', function (e) { if (e.key === PL_LS && e.newValue) { var c = plCached(); if (c) plGot(c.n); } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') plAsk(); });
  window.addEventListener('focus', function () { plAsk(); });
  setTimeout(function () { plAsk().then(plLoop, plLoop); }, 3000);
  if (sdTest()) window.__pl = { ask: function () { return plAsk(); }, n: function () { return PL.n; }, runs: function () { return PL.last; }, tell: function (e) { plTell(e); } };
