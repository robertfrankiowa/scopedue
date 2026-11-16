  /* ---------- settings: the page ----------
     Tabs down the left: General, Team, Plan (95), Client portal, GitHub, Google Drive, Storage & data, About. One tab is open at a time and the page
     remembers which until it reloads. The Client portal and Data on this device cards live here (they used to sit in Profile).
     Profile is who you are and is saved with a button; Settings is how the app behaves and applies at once.
     Notices are the server's own switch: while connected the server holds the answer and this page asks it, so a second computer never shows a stale one. */
  var stEl = { vf: pfId('st-vf'), ln: pfId('st-ln'), theme: pfId('st-theme'), side: pfId('st-side'), lang: pfId('st-lang'), n: pfId('st-sw-n'), nd: pfId('st-n-d'), ver: pfId('st-ver') };
  var ST_TABS = ['general', 'team', 'plan', 'portal', 'github', 'drive', 'storage', 'about'], stCur = 'general', stBar = pfId('st-tabs');
  var stN = null, stBusy = false;   // stN: what the server said about notices ({ v } or { err }), for the connection it was asked on ({ gen })

  function stVersion() { try { return window.chrome && chrome.runtime && chrome.runtime.getManifest ? String(chrome.runtime.getManifest().version || '') : ''; } catch (e) { return ''; } }
  function stPaintLook() {
    if (!stEl || !thSw) return;
    setPressed(stEl.theme, thSw.getAttribute('data-t') || 'system');
    setPressed(stEl.side, app.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    if (stEl.lang) setPressed(stEl.lang, window.SDI18N ? SDI18N.lang : 'en');
  }
  /* true or false when known; null while the server has not answered yet */
  function stNotifyVal() {
    if (!SY.key) return ST.notify != null ? ST.notify : true;
    return stN && stN.gen === SY.gen && typeof stN.v === 'boolean' ? stN.v : null;
  }
  function stPaintNotify() {
    var v, d;
    if (!stEl) return;
    v = stNotifyVal();
    stEl.n.setAttribute('aria-checked', v === false ? 'false' : 'true');
    stEl.n.disabled = v === null || stBusy || (!!SY.key && SY.st === 'auth');
    if (SY.key && SY.st === 'auth') d = 'Sign in to the portal again to change this.';
    else if (v === null) d = stN && stN.gen === SY.gen && stN.err ? 'Could not reach your server. Open Settings again in a moment.' : 'Checking with your server…';
    else if (!v) d = 'Off. Client activity still shows up in ScopeDue.';
    else if (!SY.key) d = 'Approvals, replies, questions and change requests. This starts when you sign in to the portal.';
    else d = 'Approvals, replies, questions and change requests are emailed to ' + SY.email + '.';
    stEl.nd.textContent = d;
  }
  /* the small marks on the tabs: how many people are on the team, and whether the portal and Drive are connected */
  function stPaintTabs() {
    var b = pfId('st-bd-team'), p = pfId('st-pd-portal'), d = pfId('st-pd-drive');
    if (!b || !TEAM || !DR) return;   // the portal card paints once before the lists below exist
    b.textContent = TEAM.length ? String(TEAM.length) : '';
    p.className = 'pd st-pd ' + (SY.key && SY.st !== 'auth' ? 'ok' : 'off'); d.className = 'pd st-pd ' + (DR.st === 'on' ? 'ok' : 'off');
    pfId('st-t-portal').title = SY.key && SY.st !== 'auth' ? 'Connected' : 'Not connected'; pfId('st-t-drive').title = DR.st === 'on' ? 'Connected' : 'Not connected';
  }
  function stPaint() {
    setPressed(stEl.vf, stQuoteDays());
    setPressed(stEl.ln, String(stLinkDays()));
    stPaintLook(); stPaintNotify(); stPaintTabs();
    stEl.ver.textContent = SD_VERSION;
  }
  /* connected: ask the server, or send the choice made before connecting (once); not connected: nothing leaves this device */
  async function stSyncNotify() {
    var gen = SY.gen, r;
    if (!SY.key || SY.st === 'auth') { stPaintNotify(); return; }
    if (ST.notify != null) {
      var want = ST.notify;
      r = await syQ(function () { return syCall('PUT', '/v1/studio', { notify: want }); });
      if (gen !== SY.gen) return;
      if (r && syOk(r)) { stN = { gen: gen, v: want }; delete ST.notify; stSave(); }
      else stN = { gen: gen, err: true };
    } else {
      r = await syQ(function () { return syCall('GET', '/v1/studio'); });
      if (gen !== SY.gen) return;
      stN = r && syOk(r) && typeof r.data.notify === 'boolean' ? { gen: gen, v: r.data.notify } : { gen: gen, err: true };
    }
    stPaintNotify();
  }

  /* ---- tabs ---- */
  function stEnterTab(name) {
    if (name === 'general') { stPaint(); [stEl.vf, stEl.ln, stEl.theme, stEl.side, stEl.lang].forEach(function (s) { if (s) moveThumb(s, false); }); }
    else if (name === 'team') tmPaint();
    else if (name === 'plan') blEnter();   // api.php 1.27.0 (95)
    else if (name === 'portal') { syPaint(); stPaintNotify(); stSyncNotify(); }
    else if (name === 'drive') drEnter();
    else if (name === 'github') x9StPaint();
    else if (name === 'storage') { ldPaint(); stoEnter(); xaSamplePaint(); }
    else if (name === 'about') stPaint();
  }
  function stTab(name, focus) {
    if (ST_TABS.indexOf(name) < 0) name = 'general';
    stCur = name;
    ST_TABS.forEach(function (k) {
      var t = pfId('st-t-' + k), on = k === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      pfId('st-p-' + k).hidden = !on;
    });
    stEnterTab(name);
    if (focus) pfId('st-t-' + name).focus({ preventScroll: true });
    xbTabIn(name); xbFade();
  }
  /* go to a tab from anywhere: Quick find, a project, a button */
  function stGo(name) { stCur = ST_TABS.indexOf(name) < 0 ? 'general' : name; showView('settings'); stTab(stCur); }
  function stEnter() { stPaintTabs(); stTab(stCur); }

  /* the tabs run down the left; on a narrow screen they run along the top, and the arrow keys follow */
  var stMq = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  function stOrient() { stBar.setAttribute('aria-orientation', stMq && stMq.matches ? 'horizontal' : 'vertical'); }
  stOrient(); if (stMq && stMq.addEventListener) stMq.addEventListener('change', stOrient);
  stBar.addEventListener('click', function (e) { var b = e.target.closest('[role="tab"]'); if (b) stTab(b.getAttribute('data-tab')); });
  stBar.addEventListener('keydown', function (e) {
    var i = ST_TABS.indexOf(stCur), k = e.key, n = -1;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % ST_TABS.length;
    else if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + ST_TABS.length) % ST_TABS.length;
    else if (k === 'Home') n = 0;
    else if (k === 'End') n = ST_TABS.length - 1;
    if (n < 0) return;
    e.preventDefault(); stTab(ST_TABS[n], true);
  });

  stEl.vf.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    ST.vf = b.getAttribute('data-f'); stSave(); setPressed(stEl.vf, stQuoteDays());
  });
  stEl.ln.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    ST.link = +b.getAttribute('data-f'); stSave(); setPressed(stEl.ln, String(stLinkDays()));
  });
  stEl.theme.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (b) thSwitch(b.getAttribute('data-f'), b); });
  /* v68: the language, on this device. The page changes in place; what people wrote is left as it is. v111 (67): a sample in the
     workspace is swapped for the new language's */
  if (stEl.lang) stEl.lang.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b || !window.SDI18N) return;
    var l = b.getAttribute('data-f'); if (l === SDI18N.lang) return;
    SDI18N.set(l); setPressed(stEl.lang, l);
    showToast(l === 'vi' ? 'Đã chuyển sang tiếng Việt' : 'ScopeDue is in English now');
    xaLangSwap(l);
  });
  stEl.side.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    if ((b.getAttribute('data-f') === 'collapsed') !== app.classList.contains('collapsed')) document.getElementById('side-toggle').click();
  });
  if (window.MutationObserver) new MutationObserver(stPaintLook).observe(app, { attributes: true, attributeFilter: ['class'] });
  stEl.n.addEventListener('click', function () {
    var cur = stNotifyVal(), next, gen;
    if (cur === null || stBusy) return;
    next = !cur;
    if (!SY.key) { ST.notify = next; stSave(); stPaintNotify(); return; }
    gen = SY.gen; stBusy = true; stPaintNotify();
    syQ(function () { return syCall('PUT', '/v1/studio', { notify: next }); }).then(function (r) {
      stBusy = false;
      if (gen === SY.gen) {
        if (r && syOk(r)) { stN = { gen: gen, v: next }; showToast(next ? 'Email notices are on' : 'Email notices are off'); }
        else showToast(r && r.msg ? r.msg : syMsg(r || { status: 0, data: {}, net: true }));
      }
      stPaintNotify();
    });
  });
  (function () {
    var mod = /Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || '')) ? '⌘' : 'Ctrl';
    [].forEach.call(document.querySelectorAll('.st-mod'), function (n) { n.textContent = mod; });
  })();

