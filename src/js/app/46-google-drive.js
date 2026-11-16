  /* ---------- google drive ----------
     Connecting is the studio's own choice and the only thing on these tabs that talks to Google. Nothing is asked before it, and opening
     Settings while Drive is not connected makes no request. v69 (CONTRACT.md 29.15): the sign-in is Google's own window, opened with
     chrome.identity.launchWebAuthFlow for the same OAuth client the ScopeDue Google sign-in uses (drClientId: the one the server
     handed over at the last Google sign-in, else SD_GOOGLE_CLIENT, "Scopedue Client"; public, no secret), so one client lists the
     extension's redirect address (29.15). It works in any Chromium
     browser. ScopeDue never sees a password; the token it gets back lives in memory only (DR.tok) and is asked for again, without a
     window, when it runs out. Only the account's address is remembered here (sd-drive), so the page knows to look again.
     The one scope is drive.file: the files and folders ScopeDue itself creates or that a person picks, nothing else in the Drive. */
  var SD_GOOGLE_CLIENT = '457402936368-140h20t9gujc53tgplt5ec6s3paagv1e.apps.googleusercontent.com';
  var DR_LS = 'sd-drive', DR_ABOUT = 'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress,displayName)';
  var DR_SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
  var DR = { st: 'off', email: '', name: '', q: null, at: 0, msg: '', busy: false, ask: false, proto: false, gen: 0, tok: '', exp: 0, test: false };
  /* one client for sign-in and Drive: the server's, remembered at the last Google sign-in (sd-gcid, a public id), else the same constant */
  function drClientId() { var c = ''; try { c = localStorage.getItem('sd-gcid') || ''; } catch (e) {} return /^[\w.-]+\.apps\.googleusercontent\.com$/.test(c) ? c : SD_GOOGLE_CLIENT; }
  /* the ScopeDue account's address, when one is signed in (41-portal-sync keeps it in SY) */
  function drSyEmail() { try { return SY && SY.key && SY.email ? String(SY.email).toLowerCase() : ''; } catch (e) { return ''; } }
  function drInExt() { try { return !!(window.chrome && chrome.runtime && chrome.runtime.id); } catch (e) { return false; } }
  function drReady() { try { return DR.test || !!(drInExt() && chrome.identity && chrome.identity.launchWebAuthFlow && chrome.identity.getRedirectURL); } catch (e) { return false; } }
  /* ?test: a page hands the app a token for the stand-in Drive of the browser tests (29.15); never otherwise */
  if (sdTest()) window.__drv = { token: function (t, email) { DR.test = true; DR.tok = String(t || ''); DR.exp = DR.tok ? Date.now() + 3600e3 : 0; if (email) DR.email = email; try { var o = JSON.parse(localStorage.getItem(DR_LS) || 'null'); if (DR.st === 'off' && o && o.on === 1) DR.st = 'on'; } catch (e) {} },   /* a reloaded test page is as connected as it was, like the extension at start */ state: function () { return { st: DR.st, email: DR.email, hasTok: !!DR.tok }; }, quiet: function (on) { DR.quiet = !!on; }, client: function () { return drClientId(); } };
  (function () {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(DR_LS) || 'null'); } catch (e) { o = null; }
    if (o && o.on === 1 && typeof o.email === 'string' && drReady()) { DR.st = 'on'; DR.email = o.email.slice(0, 120); }
    if (DR.st === 'on' && curView === 'project' && pd.p && pd.tab === 'team') pdRerender();
  })();
  function drSave() { try { if (DR.st === 'on' && !DR.proto) localStorage.setItem(DR_LS, JSON.stringify({ on: 1, email: DR.email })); else localStorage.removeItem(DR_LS); } catch (e) {} }
  /* a token for Drive: the one in memory while it lasts, else Google's window (interactive) or a silent ask (prompt=none) */
  function drToken(interactive) {
    if (DR.tok && Date.now() < DR.exp - 60000) return Promise.resolve({ token: DR.tok });
    if (DR.test) return Promise.resolve({ err: 'No token' });
    return new Promise(function (res) {
      var done = false, rd, url;
      function fin(r) { if (!done) { done = true; res(r); } }
      try {
        rd = chrome.identity.getRedirectURL();
        var q = [['client_id', drClientId()], ['response_type', 'token'], ['redirect_uri', rd], ['scope', DR_SCOPE], ['include_granted_scopes', 'true'], ['prompt', interactive ? 'select_account' : 'none']];
        var hint = DR.email || drSyEmail(); if (hint) q.push(['login_hint', hint]);   /* v77: Drive has to be the ScopeDue account anyway */
        url = 'https://accounts.google.com/o/oauth2/v2/auth?' + q.map(function (kv) { return kv[0] + '=' + encodeURIComponent(kv[1]); }).join('&');
        chrome.identity.launchWebAuthFlow({ url: url, interactive: !!interactive }, function (back) {
          var er = chrome.runtime.lastError, p;
          if (er || !back) { fin({ err: (er && er.message) || 'No sign-in' }); return; }
          try { p = new URLSearchParams(new URL(back).hash.replace(/^#/, '')); } catch (e) { p = new URLSearchParams(''); }
          if (p.get('error')) { fin({ err: p.get('error') === 'access_denied' ? 'The user did not approve access' : p.get('error') }); return; }
          if (!p.get('access_token') || !/drive\.file/.test(p.get('scope') || '')) { fin({ err: 'Google did not allow access to Drive' }); return; }
          DR.tok = p.get('access_token'); DR.exp = Date.now() + (+p.get('expires_in') || 3600) * 1000;
          fin({ token: DR.tok });
        });
      } catch (e) { fin({ err: String(e && e.message || e) }); }
    });
  }
  /* the account and its room, or why not: { ok, q, email, name } | { auth } | { net } */
  async function drAbout(token) {
    var r, j;
    try { r = await fetch(DR_ABOUT, { headers: { Authorization: 'Bearer ' + token } }); } catch (e) { return { net: true }; }
    if (r.status === 401 || r.status === 403) return { auth: true };
    if (!r.ok) return { net: true };
    try { j = await r.json(); } catch (e) { return { net: true }; }
    return { ok: true, q: j.storageQuota || {}, email: (j.user && j.user.emailAddress) || '', name: (j.user && j.user.displayName) || '' };
  }
  function drForget() { DR.tok = ''; DR.exp = 0; }
  function drPaintAll() { drPaint(); stoPaint(); stPaintTabs(); }
  /* interactive: the person pressed Connect (a Google window may open). Otherwise Chrome answers without one, or not at all */
  async function drRefresh(interactive) {
    var gen = ++DR.gen, t, a;
    if (DR.proto) return;
    DR.busy = true; DR.msg = ''; drPaint();
    t = await drToken(interactive);
    if (gen !== DR.gen) return;
    if (t.err) {
      DR.busy = false;
      if (interactive) DR.msg = /not approve|cancel|closed|denied|user/i.test(t.err) ? 'Sign-in was cancelled. Nothing was connected.' : 'Google would not connect. ' + t.err;
      else { DR.st = 'again'; DR.msg = 'Sign in to Google again to keep using Drive.'; }
      drSave(); drPaintAll(); return;
    }
    a = await drAbout(t.token);
    if (gen !== DR.gen) return;
    if (a.auth && !interactive) drForget();
    DR.busy = false;
    /* v69: one address per person (29.13, decision 5): Drive has to be the account signed in to ScopeDue */
    var sye = drSyEmail();
    if (a.ok && sye && String(a.email || '').toLowerCase() !== sye) {
      try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.token), { method: 'POST' }); } catch (e) {}
      drForget(); DR.st = 'off'; DR.email = ''; DR.name = ''; DR.q = null;
      DR.msg = 'Google Drive has to be the account you sign in to ScopeDue with (' + sye + '). You chose ' + (a.email || 'another account') + '.';
      drSave(); drPaintAll(); return;
    }
    if (a.ok) { DR.st = 'on'; DR.email = a.email || DR.email; DR.name = a.name; DR.q = a.q; DR.at = Date.now(); DR.msg = ''; if (interactive) showToast('Google Drive connected'); }
    else if (a.auth) { DR.st = interactive ? 'off' : 'again'; DR.msg = interactive ? 'Google did not allow access to Drive. Try again.' : 'Sign in to Google again to keep using Drive.'; if (interactive) drForget(); }
    else DR.msg = 'Could not reach Google. ' + (DR.st === 'on' ? 'What is shown may be out of date.' : 'Try again in a moment.');
    drSave(); drPaintAll();
  }
  async function drDisconnect() {
    var t, gen = ++DR.gen;
    DR.ask = false;
    /* the token in memory is revoked; without one there is nothing to revoke, and no window is opened to get one */
    if (!DR.proto && (t = DR.tok)) { try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t), { method: 'POST' }); } catch (e) {} }
    drForget();
    DR.st = 'off'; DR.email = ''; DR.name = ''; DR.q = null; DR.msg = ''; DR.proto = false; DR.busy = false;
    drSave(); drPaintAll(); showToast('Google Drive disconnected. Your files stay where they are.');
  }
  function drSize(b) {
    b = +b || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
    if (b < 1099511627776) return (b / 1073741824).toFixed(b < 10737418240 ? 1 : 0) + ' GB';
    return (b / 1099511627776).toFixed(1) + ' TB';
  }
  /* the room in the account: { used, limit (0 when unlimited) } */
  function drRoom() { var q = DR.q; return q && q.usage != null ? { used: +q.usage || 0, limit: q.limit ? +q.limit : 0 } : null; }
  function drBar(used, limit, label) {
    var pc = limit ? Math.min(100, used / limit * 100) : 0;
    return '<div class="sto-bar' + (pc > 90 ? ' hot' : '') + '" role="img" aria-label="' + esc(label) + '"><i style="width:' + (limit ? Math.max(pc, used ? 1.5 : 0) : 0).toFixed(1) + '%"></i></div>';
  }
  function drPaint() {
    var body = pfId('dr-body'), pill = pfId('dr-pill'), sub = pfId('dr-sub'), h = '', pt, rm, msg = DR.msg ? '<p class="sy-p sy-bad" role="status">' + esc(DR.msg) + '</p>' : '';
    if (!body) return;
    if (DR.st === 'on') {
      pt = ['ok', 'Connected']; sub.textContent = 'Projects can keep their files in your own Drive.';
      rm = drRoom();
      h = '<dl class="cd-dl"><div><dt>Account</dt><dd>' + esc(DR.email || 'Google account') + (DR.proto ? ' <span class="chip neutral">Sample</span>' : '') + '</dd></div>' +
        '<div><dt>Storage</dt><dd>' + (rm ? esc(drSize(rm.used) + (rm.limit ? ' of ' + drSize(rm.limit) + ' used' : ' used · no limit')) : 'Checking…') + '</dd></div>' +
        '<div><dt>ScopeDue can reach</dt><dd>Only the files and folders it creates</dd></div></dl>' +
        (rm && rm.limit ? '<div class="sto-wrap">' + drBar(rm.used, rm.limit, drSize(rm.used) + ' of ' + drSize(rm.limit) + ' used') + '</div>' : '') + msg +
        '<p class="sy-p">Files stay in your own Drive and ScopeDue keeps no copy. ' + (PROJECTS.some(function (p) { return p.dv; }) ? 'Projects you keep in Drive are in the ScopeDue folder, encrypted.' : 'Nothing has been created in your Drive yet.') + '</p>' +
        dvFoundHTML() + '<div class="sy-acts"><button type="button" class="btn-ghost btn-sm" data-dr="refresh"' + (DR.busy ? ' disabled' : '') + '>' + (DR.busy ? 'Checking…' : 'Refresh') + '</button><button type="button" class="btn-ghost btn-sm" data-dr="out">' + (DR.ask ? 'Disconnect Drive?' : 'Disconnect') + '</button></div>';
    } else if (DR.st === 'again') {
      pt = ['inv', 'Sign in again']; sub.textContent = 'Google needs you to sign in again.';
      h = '<dl class="cd-dl"><div><dt>Account</dt><dd>' + esc(DR.email || 'Google account') + '</dd></div></dl>' + msg +
        '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-dr="connect"' + (DR.busy ? ' disabled' : '') + '>' + (DR.busy ? 'Connecting…' : 'Sign in') + '</button><button type="button" class="btn-ghost btn-sm" data-dr="out">' + (DR.ask ? 'Disconnect Drive?' : 'Disconnect') + '</button></div>';
    } else if (drReady()) {
      pt = ['off', 'Not connected']; sub.textContent = 'Where a project keeps its files, in your own Drive.';
      h = '<p class="sy-p">Connect your Google account so a project can keep its files in a folder in your own Drive. ScopeDue asks only for the files and folders it creates itself. It cannot see the rest of your Drive, and it keeps no copy. Connecting changes nothing in your Drive.</p>' + msg +
        '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-dr="connect"' + (DR.busy ? ' disabled' : '') + '>' + (DR.busy ? 'Connecting…' : 'Connect Google Drive') + '</button></div>';
    } else {
      pt = ['off', 'Not available']; sub.textContent = 'Where a project keeps its files, in your own Drive.';
      h = '<p class="sy-p">' + (drInExt() ? 'Google sign-in is not set up in this version of ScopeDue yet.' : 'Google Drive connects from the ScopeDue extension in Chrome. This preview cannot sign in to Google.') + ' Your files can still live in any Drive folder you link to from a project.</p>' +
        (PD_DEV ? '<details class="pd-proto"><summary>Prototype · sample Drive</summary><div class="pd-proto-b"><p>Google sign-in needs the extension, the <code>identity</code> permission and an OAuth client id in its manifest (CONTRACT.md, section 15.5). This stands in for a connected account so the rest of the page can be reviewed.</p><div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-dr="sample">Use a sample Drive</button></div></div></details>' : '');
    }
    pill.innerHTML = '<i class="pd ' + pt[0] + '"></i>' + pt[1];
    if (body._h !== h) { body._h = h; body.innerHTML = h; }
  }
  function drEnter() {
    drPaint();
    if (DR.st === 'on' && !DR.proto) dvScan().then(dvPaintAll);   /* v69: projects in ScopeDue/ not on this device (29.16) */
    if (DR.st === 'on' && !DR.proto && !DR.busy && Date.now() - DR.at > 60000) drRefresh(false);
  }
  pfId('dr-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-dr]'), a;
    if (!b || b.disabled) return;
    a = b.getAttribute('data-dr');
    if (a === 'connect') drRefresh(true);
    else if (a === 'refresh') drRefresh(false);
    else if (a === 'sample') {
      DR.st = 'on'; DR.proto = true; DR.email = 'studio@example.com'; DR.name = 'Sample studio'; DR.q = { limit: '16106127360', usage: '4509715660' }; DR.at = Date.now(); DR.msg = '';
      drPaintAll();
    } else if (a === 'out') {
      if (!DR.ask) { DR.ask = true; drPaint(); clearTimeout(DR.askT); DR.askT = setTimeout(function () { DR.ask = false; drPaint(); }, 4000); return; }
      clearTimeout(DR.askT); drDisconnect();
    }
  });

