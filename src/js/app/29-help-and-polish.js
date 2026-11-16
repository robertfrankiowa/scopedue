  /* ───────── v66: what the Dashboard calls urgent. A date, the client, work at risk or blocked, or someone waiting on you.
     Housekeeping (ideas to decide, stale data, principles, owners to assign) stays in each project's Needs ───────── */
  function dbHard(it) {
    var n = it.n, t = n.t || '';
    if (it.k === 'due' || n.date || n.chip === 'crit' || n.cr) return true;
    if (/^Chase |stuck|waiting for your review|waiting on you|past (its|their) date|outside the baseline|pull request was closed|Checks failing|changed after work started|left the plan|asks for the project key/i.test(t)) return true;
    return /^(Stuck|Changed|Left the plan|PR closed|Checks|Overdue|Unprotected)$/.test(n.chipT || '');
  }

  /* ---------- Help (prefix xb): what changed, how to reach us, the shortcuts ----------
     It takes the place of the Support Inbox, which looked like a line to the ScopeDue team and to teammates but sent nothing anywhere.
     Conversations saved before stay in the data (an export still holds them); they are not shown.
     v69: Contact support is a form for someone signed in (49-support.js); it goes to the ScopeDue team's Messages page and the
     answers come back here. It sends only what the person wrote. A feature idea is one kind of message
     in that form; the separate "Suggest a feature" card is gone. SD_HELP.email must be the real address before release (DEPLOY-CHECKLIST.md). */
  /* 1.0.0 (CONTRACT 138): one version for the extension, the web app and the page, set once in build.py (VERSION) */
  var SD_VERSION = /*SD_VERSION*/'0', SD_HELP = { email: 'info@scopedue.com' };
  var XB_NEWS = [
    { id: 'n100', d: 'November 2026', t: 'ScopeDue 1.0', p: [
      'ScopeDue is on the Chrome Web Store. This is its first release, version 1.0.0.',
      'The extension and the web app at app.scopedue.com are one version and change together. Settings › About shows yours.',
      'When you contact support, the details say the version and whether you wrote from the extension or the web app.'] },
    { id: 'n69', d: 'October 2026', t: 'Safer copies, clearer decisions', p: [
      'Export an encrypted copy with a passphrase. The bell reminds you when your last copy is a week old.',
      'Importing a copy checks it more deeply first, and says when something in it points at nothing.',
      'The Scope Gate asks whether an item serves your thesis. The Gap check says Evidence strength, and stays Low until AI-reported sources are verified.',
      'Give any piece of work a Done when… checklist, and set what S, M and L cost in each project.',
      'Copy for AI turns a project into Markdown for Claude Code, Codex or any assistant.',
      'Signed in, you can contact support from Help and read the answers there.'] },
    { id: 'n68', t: 'ScopeDue in Vietnamese', p: [
      'The first run asks for your language before anything else: English or Tiếng Việt.',
      'Change it any time in Settings › General › Appearance. The page switches at once.',
      'Menus, messages, dates, the side panel and the right-click menu follow it. What you write stays as you wrote it.',
      'Quick find matches the Vietnamese names too, with or without accents.'] },
    { id: 'n67', t: 'Help, Settings and Profile, tidied', p: [
      'Help takes the place of Support Inbox: what changed, how to reach us, and the keyboard shortcuts.',
      'Settings are grouped into Studio, Connections, Data and App, and say each thing once.',
      'Shortcuts read Ctrl on Windows and Linux.'] },
    { id: 'n66', t: 'A calmer Dashboard and My work', p: [
      'Priority attention lists only what needs you now; smaller nudges stay on each project.',
      'Client Actions is now Waiting on clients.',
      'A long project in My work shows its four most urgent items first.'] },
    { id: 'n65', t: 'A first run that asks', p: [
      'A new browser asks your name, then starts empty or with sample projects.',
      'Clear the sample data in Settings › Storage & data. Your own work stays.',
      'An owner who loses every device can get a shared project’s key back from a teammate.'] },
    { id: 'n64', t: 'GitHub on your work', p: [
      'Link a pull request or an issue to a work item and see its state and checks beside it.',
      'An opened pull request moves the work to Doing; a merged one marks it Done.',
      'Your GitHub token stays on this device.'] },
    { id: 'n63', t: 'Team sync', p: [
      'Share a project with your team. It is encrypted on your device before it leaves; the server cannot read it.',
      'Owners, Editors and Viewers, and a safety code to check each new device.'] }
  ];
  var XB_SEEN = 'sd-help-seen';
  var XB_MAC = /Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''));
  function xbSeen() { try { return localStorage.getItem(XB_SEEN) === XB_NEWS[0].id; } catch (e) { return true; } }
  function xbDot() { var d = document.getElementById('xb-dot'); if (d) d.hidden = xbSeen(); }

  /* the details a support email carries: what runs where, nothing about the work */
  function xbBrowser() {
    var u = navigator.userAgent || '', m;
    if ((m = u.match(/Edg\/(\d+)/))) return 'Edge ' + m[1];
    if ((m = u.match(/OPR\/(\d+)/))) return 'Opera ' + m[1];
    if ((m = u.match(/Firefox\/(\d+)/))) return 'Firefox ' + m[1];
    if ((m = u.match(/Chrome\/(\d+)/))) return 'Chrome ' + m[1];
    if ((m = u.match(/Version\/(\d+).*Safari/))) return 'Safari ' + m[1];
    return 'Unknown';
  }
  function xbOS() {
    var s = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '', u = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(u)) return 'iOS';
    if (/Android/.test(u)) return 'Android';
    if (/CrOS/.test(u)) return 'ChromeOS';
    if (/Mac/.test(s + u)) return 'macOS';
    if (/Win/.test(s + u)) return 'Windows';
    if (/Linux/.test(s + u)) return 'Linux';
    return 'Unknown';
  }
  function xbDiag() {
    var S = SDB.S || {}, gh = typeof X9 !== 'undefined' && !!X9.tok;
    return [
      ['Version', SD_VERSION + (stVersion() ? ' · extension' : ' · web')],
      ['Browser', xbBrowser() + ' on ' + xbOS()],
      ['Saving', S.mode === 'idb' && !S.why ? (S.fail ? 'In this browser, last save failed' : 'In this browser') : 'Not saving' + (S.why ? ' (' + S.why + ')' : '')],
      ['Portal', SY.key ? (SY.st === 'auth' ? 'Signed out by the server' : 'Signed in') : 'Not signed in'],
      ['Language', window.SDI18N ? SDI18N.langs[SDI18N.lang] : 'English'],
      ['Connections', [x8On() && PROJECTS.some(function (p) { return p.x8 && p.x8.room; }) ? 'team sync' : '', DR.st === 'on' ? 'Google Drive' : '', gh ? 'GitHub' : ''].filter(Boolean).join(', ') || 'None']
    ];
  }
  function xbDiagText() { return xbDiag().map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'); }
  function xbMailto(subject, body) { return 'mailto:' + SD_HELP.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
  function xbSupportHref() {
    /* v68: the questions are in the person's language; the details stay in English, for whoever answers */
    return xbMailto(sdT('ScopeDue support'), sdT('What happened:') + '\n\n\n' + sdT('What you expected:') + '\n\n\n— ' + sdT('Details from ScopeDue (no project or client data)') + ' —\n' + xbDiagText() + '\n');
  }
  function xbMail() { location.href = xbSupportHref(); }

  function xbKey(k) { return '<span class="st-k">' + k.map(function (x) { return '<kbd>' + (x === 'mod' ? (XB_MAC ? '⌘' : 'Ctrl') : x) + '</kbd>'; }).join('') + '</span>'; }
  function xbPaint() {
    var box = document.getElementById('xb'); if (!box) return;
    var fresh = !xbSeen(), news = XB_NEWS.map(function (n, i) {
      return '<li class="xb-r' + (i ? '' : ' top') + '"><div class="xb-rh"><b>' + esc(n.t) + '</b>' + (i ? '' : '<span class="xb-d">' + esc(n.d) + '</span>' + (fresh ? '<span class="chip">New</span>' : '')) + '</div>' +
        '<ul>' + n.p.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></li>';
    });
    var h = '<div class="xb-grid">' +
      '<section class="card xb-news" id="xb-news" aria-labelledby="xb-h-news" tabindex="-1"><div class="card-h ruled"><div><h2 id="xb-h-news">What’s new</h2><p>Changes to ScopeDue, newest first.</p></div><span class="chip neutral xb-b">Build ' + esc(SD_HELP.build) + '</span></div>' +
        '<ol class="xb-rel">' + news[0] + '</ol><h3 class="xb-eh">Earlier</h3><ol class="xb-rel">' + news.slice(1).join('') + '</ol>' +
        '<div class="xb-wl"><button type="button" class="link" data-open-drawer="welcome">Read the letter from ScopeDue</button></div></section>' +   /* CONTRACT 144 */
      '<div class="xb-side">' +
        '<section class="card" id="xb-contact" aria-labelledby="xb-h-ct"><div class="card-h ruled"><div><h2 id="xb-h-ct">Contact support</h2><p>Something not working, or a question.</p></div></div>' +
          '<div id="xs-box"></div></section>' +   /* v69: the form and the conversations, drawn by 49-support.js */
        '<section class="card xb-keys" aria-labelledby="xb-h-keys"><div class="card-h ruled"><div><h2 id="xb-h-keys">Keyboard shortcuts</h2></div></div>' +
          '<dl class="cd-dl st-keys">' +
            '<div><dt>Quick find</dt><dd>' + xbKey(['mod', 'K']) + '</dd></div>' +
            '<div><dt>Send, save or apply in a panel</dt><dd>' + xbKey(['mod', '↵']) + '</dd></div>' +
            '<div><dt>Save Profile</dt><dd>' + xbKey(['mod', 'S']) + '</dd></div>' +
            '<div><dt>Close a panel or search</dt><dd>' + xbKey(['Esc']) + '</dd></div>' +
          '</dl></section>' +
      '</div></div>';
    if (box._h !== h) { if (typeof xsKeep === 'function' && XS) xsKeep(); box._h = h; box.innerHTML = h; }
  }
  function xbEnter(o) {
    xbPaint();
    xsEnter();
    try { localStorage.setItem(XB_SEEN, XB_NEWS[0].id); } catch (e) {}
    xbDot();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-xb]'); if (!b) return;
    if (b.getAttribute('data-xb') === 'copy') copyText('ScopeDue\n' + xbDiagText(), function () {
      b.textContent = 'Copied'; clearTimeout(b._t); b._t = setTimeout(function () { b.textContent = 'Copy details'; }, 1600);
      showToast('Details copied. Paste them into your message.');
    });
  });
  /* the footer and About go to Help: What's new, or the support card */
  function xbGo(which) {
    showView('inbox');
    var t = which === 'updates' ? document.getElementById('xb-news') : document.getElementById('xs-subj') || document.getElementById('xs-in'); if (!t) return;
    t.scrollIntoView({ block: which === 'updates' ? 'start' : 'center', behavior: reduced ? 'auto' : 'smooth' });
    t.focus({ preventScroll: true });
  }

  /* ---------- ⌘ is the Mac's key: elsewhere every hint says Ctrl ----------
     The hints are written with ⌘ in the page and in what is drawn later, so new ones are fixed as they appear. */
  function xbCtrl(root) {
    if (XB_MAC || !root || !root.querySelectorAll) return;
    var ks = root.tagName === 'KBD' ? [root] : root.querySelectorAll('kbd');
    for (var i = 0; i < ks.length; i++) { var k = ks[i]; if (k.textContent.indexOf('⌘') >= 0) k.textContent = k.textContent.replace(/⌘\s*/g, 'Ctrl '); }
  }
  function xbCtrlInit() {
    if (XB_MAC) return;
    xbCtrl(document.body);
    if (!window.MutationObserver) return;
    var q = [], on = false;
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) q.push(n); }); });
      if (on || !q.length) return; on = true;
      requestAnimationFrame(function () { var a = q; q = []; on = false; a.forEach(xbCtrl); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Profile: the photo button says what it does ---------- */
  function xbPhotoBtn(n) {
    var b = document.getElementById('pf-photo-btn'); if (!b) return;
    var t = n && n.photo ? 'Change photo' : 'Add photo', last = b.lastChild;
    if (last && last.nodeType === 3) { if (last.nodeValue !== t) last.nodeValue = t; } else b.appendChild(document.createTextNode(t));
  }

  /* ---------- Settings on a phone: the tab you are on is in view, and the row fades at its edges ---------- */
  function xbTabIn(name) {
    var bar = document.getElementById('st-tabs'), t = document.getElementById('st-t-' + name);
    if (!bar || !t || bar.scrollWidth <= bar.clientWidth + 1) return;
    var br = bar.getBoundingClientRect(), tr = t.getBoundingClientRect();
    var left = bar.scrollLeft + (tr.left + tr.width / 2) - (br.left + br.width / 2);
    if (bar.scrollTo) bar.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' }); else bar.scrollLeft = left;
  }
  /* a tab bar wider than the screen fades at the side that has more: Settings and a project's sections */
  function xbFade() {
    ['st-tabs', 'pd-tabs'].forEach(function (id) {
      var bar = document.getElementById(id); if (!bar) return;
      var max = bar.scrollWidth - bar.clientWidth;
      bar.classList.toggle('xb-fl', max > 1 && bar.scrollLeft > 2);
      bar.classList.toggle('xb-fr', max > 1 && bar.scrollLeft < max - 2);
    });
  }

  function xbInit() {
    xbDot(); xbCtrlInit();
    var bar = document.getElementById('st-tabs'), pt = document.getElementById('pd-tabs');
    if (bar) bar.addEventListener('scroll', xbFade, { passive: true });
    if (pt) { pt.addEventListener('scroll', xbFade, { passive: true }); new MutationObserver(function () { requestAnimationFrame(xbFade); }).observe(pt, { childList: true }); }
    window.addEventListener('resize', xbFade);
  }

  if (sdTest()) window.__xb = { news: XB_NEWS, help: SD_HELP, diag: xbDiag, diagText: xbDiagText, support: xbSupportHref, seen: xbSeen };

