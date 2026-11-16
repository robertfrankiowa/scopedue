  /* ---------- Help › Contact support (prefix xs): messages to the ScopeDue team, and their answers ----------
     Only someone signed in can write: the message goes with the same key the portal uses (SY.key) to support.php beside api.php,
     which keeps it in the website's database. The team answers on the admin Messages page; the answer comes back here and by email.
     What the person and the team write is their own words: it is shown inside translate="no" and never put in another language.
     The card is drawn by xbPaint (29) into #xs-box. Typing survives a repaint: the form's values are kept in XS.draft. */
  var XS = { st: 'idle', threads: [], unread: 0, msg: '', at: 0, busy: false, draft: { topic: 'feedback', subj: '', body: '' }, reply: {}, open: {}, gen: -1 };
  /* v70: a minute, not five. The side panel stays visible for hours and never fires visibilitychange, so with a 5-minute
     poll behind a 2-minute cache an answer from the team could sit unseen for minutes and the envelope looked broken.
     /v1/unread is one indexed COUNT, and every open tab shares the cache, so this stays about one call a minute */
  var XS_LS = 'sd-xs', XS_EVERY = 60000, XS_FRESH = 45000;
  /* only what the person wrote is sent, nothing about their browser or setup. support.php files a topic it does not know
     (today 'feature') as 'feedback' */
  var XS_TOPICS = [['feedback', 'Feedback'], ['feature', 'Suggest a feature'], ['bug', 'Something is broken'], ['account', 'Help with my account'], ['other', 'Something else']];
  function xsOn() { return syHasSession(); }
  /* support.php sits next to the api.php the key belongs to */
  function xsBase() { return String(SY.url || '').replace(/api\.php$/i, 'support.php'); }
  function xsCall(method, path, body) { return syCall(method, path, body, { base: xsBase() }); }
  function xsErr(r) {
    if (!r.net && (r.status === 404 || r.status === 405) && syErr(r).code !== 'not_found') return 'Messages are not available on this server yet.';
    if (r.status === 429 || r.status === 422) return syErr(r).message || 'Check your message and try again.';
    return syMsg(r);
  }

  /* ---------- CONTRACT 144: the letter a new install finds in the envelope (prefix wl) ----------
     It is part of the app, not a message from the server: it is there before any sign-in and nothing is fetched for it.
     localStorage['sd-welcome']: nothing = not read yet (it counts on the envelope), 'r' = read, 'c' = read and cleared from the
     popup. It is read once its panel opens (drawers/welcome.html), from the popup or from Help, where it stays.
     A browser that cannot keep the mark shows no badge, so the letter never comes back as new on every tab. */
  var WL_LS = 'sd-welcome', WL_T = 'AI writes the code. The rest is yours.';
  function wlGet() { try { return localStorage.getItem(WL_LS) || ''; } catch (e) { return 'c'; } }
  function wlSet(v) { try { if (v) localStorage.setItem(WL_LS, v); else localStorage.removeItem(WL_LS); } catch (e) {} }
  function wlUnread() { return !wlGet(); }
  function wlShown() { return wlGet() !== 'c'; }
  function wlOnOpen() {
    if (wlUnread()) wlSet('r');
    xsBadge(); if (typeof xsPopPaint === 'function') xsPopPaint();
  }
  function wlItem() {
    var un = wlUnread();
    return '<li class="n-item st"' + (un ? ' data-unread' : '') + ' data-xs-wl>' +
      '<button type="button" class="n-main"><span class="n-dot" aria-hidden="true"></span><span class="n-txt">' +
      '<span class="n-title"><span class="sr">' + (un ? 'Unread. ' : '') + '</span><span>' + esc(sdT(WL_T)) + '</span></span>' +
      '<span class="n-text"><b class="xs-who" translate="no">ScopeDue:</b> ' + esc(sdT('Welcome. Why ScopeDue exists, and the three kinds of projects you will work on.')) + '</span></span>' +
      '<span class="n-time"></span></button></li>';
  }

  /* the badge on the envelope in the header (beside the bell): answers not opened yet.
     Shared by every open tab through localStorage, so a dozen new tabs ask the server once */
  function xsSave() { try { localStorage.setItem(XS_LS, JSON.stringify({ at: XS.at, unread: XS.unread, slug: SY.slug })); } catch (e) {} }
  function xsCached() { try { var o = JSON.parse(localStorage.getItem(XS_LS) || 'null'); return o && o.slug === SY.slug ? o : null; } catch (e) { return null; } }
  function xsBadge() {
    var b = document.getElementById('xs-badge'), btn = document.getElementById('xs-mail'); if (!b) return;
    var n = (xsOn() ? XS.unread : 0) + (wlUnread() ? 1 : 0);   /* CONTRACT 144: the letter counts until it is read */
    /* v71: a new answer arriving by the poll bumps the badge, and the open popup fetches the list again */
    var had = +b.getAttribute('data-n') || 0; b.setAttribute('data-n', n);
    if (n > had && had && typeof bump === 'function') bump(b);
    if (n > had && typeof xsPopOpen !== 'undefined' && xsPopOpen) xsPopFetch();
    b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
    if (btn) btn.setAttribute('aria-label', n ? 'Messages from ScopeDue support, ' + n + ' new' : 'Messages from ScopeDue support');
  }
  function xsCheck(force) {
    if (!xsOn()) { XS.unread = 0; xsBadge(); return Promise.resolve(); }
    var c = xsCached();
    if (!force && c && Date.now() - c.at < XS_FRESH) { XS.unread = c.unread | 0; xsBadge(); return Promise.resolve(); }
    return xsCall('GET', '/v1/unread').then(function (r) {
      if (!syOk(r)) return;
      XS.unread = Math.max(0, r.data.unread | 0); XS.at = Date.now(); xsSave(); xsBadge();
    });
  }

  /* the conversations, when Help is open */
  function xsLoad(quiet) {
    if (!xsOn()) return Promise.resolve();
    if (!quiet || XS.st !== 'ok') { XS.st = 'load'; xsPaint(); }
    var gen = SY.gen;
    return xsCall('GET', '/v1/threads').then(function (r) {
      if (gen !== SY.gen) return;
      if (!syOk(r)) { XS.st = 'err'; XS.msg = xsErr(r); xsPaint(); return; }
      XS.threads = Array.isArray(r.data.threads) ? r.data.threads : []; XS.unread = r.data.unread | 0; XS.at = Date.now(); XS.st = 'ok'; XS.gen = SY.gen;
      if (!XS.focus) XS.threads.forEach(function (t) { if (t.unread) XS.open[t.id] = true; });   /* v71: picked from the popup, only that one is open */
      xsSave(); xsPaint(); xsBadge(); xsShowThread(); XS.focus = 0; xsSeen();
    });
  }
  /* an answer is seen once it is on screen in an open conversation */
  function xsSeen() {
    if (curView !== 'inbox' || document.visibilityState === 'hidden') return;
    var ids = XS.threads.filter(function (t) { return t.unread && XS.open[t.id]; }).map(function (t) { return t.id; });
    if (!ids.length) return;
    xsCall('POST', '/v1/threads/read', { ids: ids }).then(function (r) {
      if (!syOk(r)) return;
      XS.unread = Math.max(0, XS.unread - (r.data.marked | 0)); XS.at = Date.now(); xsSave(); xsBadge();
    });
  }

  /* ---------- drawing ---------- */
  function xsTopics(cur) { return XS_TOPICS.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === cur ? ' selected' : '') + '>' + esc(t[1]) + '</option>'; }).join(''); }
  function xsTxt(s) { return '<div class="xs-txt" translate="no">' + esc(s) + '</div>'; }
  function xsThread(t) {
    var open = !!XS.open[t.id], d = XS.reply[t.id] || '';
    var msgs = [{ from: 'you', body: t.body, at: t.at }].concat(t.replies || []).map(function (m) {
      var team = m.from === 'team';
      return '<li class="xs-m' + (team ? ' team' : '') + '"><div class="xs-mh"><b>' + (team ? 'ScopeDue team' : 'You') + '</b><span>' + esc(syStampMs(m.at)) + '</span></div>' + xsTxt(m.body) + '</li>';
    }).join('');
    var last = (t.replies || []).slice(-1)[0], state = t.unread ? '<span class="chip">New reply</span>' : last && last.from === 'team' ? '<span class="chip neutral">Answered</span>' : '<span class="chip neutral">Sent</span>';
    return '<li><details class="xs-th" data-xs-th="' + t.id + '"' + (open ? ' open' : '') + '><summary><span class="xs-sj" translate="no">' + esc(t.subject) + '</span>' + state + '<span class="xs-when">' + esc(syAgo(t.last_at)) + '</span></summary>' +
      '<ol class="xs-ms">' + msgs + '</ol>' +
      '<form class="xs-rf" data-xs-reply="' + t.id + '" novalidate><div class="fld"><label class="sr" for="xs-r-' + t.id + '">Your reply</label><textarea id="xs-r-' + t.id + '" rows="3" maxlength="8000" placeholder="Write a reply">' + esc(d) + '</textarea><span class="err" role="alert"></span></div>' +
      '<div class="sy-acts"><button type="submit" class="btn-primary btn-sm">Send reply</button><button type="button" class="btn-ghost btn-sm xs-del" data-xs-del="' + t.id + '">Delete conversation</button></div></form></details></li>';
  }
  function xsList() {
    if (XS.st === 'load' && !XS.threads.length) return '<p class="xs-note">Loading your conversations…</p>';
    if (XS.st === 'err') return '<p class="xs-note sy-bad">' + esc(XS.msg) + '</p><div class="sy-acts"><button type="button" class="btn-ghost btn-sm" data-xs="again">Try again</button></div>';
    if (!XS.threads.length) return '<p class="xs-note">No messages yet. What you send shows up here, with our answers.</p>';
    return '<ol class="xs-list">' + XS.threads.map(xsThread).join('') + '</ol>';
  }
  function xsHint(t) { return t === 'feature' ? 'What you were trying to do, and what would help' : 'What happened, and what you expected'; }
  function xsForm() {
    var d = XS.draft;
    return '<form class="xs-new" id="xs-new" novalidate>' +
      '<div class="fld"><label for="xs-topic">Kind of message</label><select id="xs-topic">' + xsTopics(d.topic) + '</select></div>' +
      '<div class="fld"><label for="xs-subj">Subject</label><input id="xs-subj" maxlength="200" autocomplete="off" placeholder="A few words about it" value="' + esc(d.subj) + '"><span class="err" id="e-xs-subj" role="alert"></span></div>' +
      '<div class="fld"><label for="xs-body">Message</label><textarea id="xs-body" rows="5" maxlength="8000" placeholder="' + xsHint(d.topic) + '">' + esc(d.body) + '</textarea><span class="err" id="e-xs-body" role="alert"></span></div>' +
      '<div class="sy-acts"><button type="submit" class="btn-primary btn-sm" id="xs-send">Send message</button></div></form>';
  }
  function xsHTML() {
    if (!SY.key) return '<p class="sy-p xb-lead">Sign in to send us a message. Our answers come back here, and by email.</p>' +
      '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" id="xs-in" data-open-drawer="sync" data-focus="#sy-google">Sign in to send a message</button></div>';
    if (!xsOn()) return '<p class="sy-p xb-lead">Your sign-in has ended. Sign in again to send a message or read our answers.</p>' +
      '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" id="xs-in" data-open-drawer="sync" data-focus="#sy-google">Sign in again</button></div>';
    return '<p class="sy-p xb-lead">Write to the ScopeDue team. Our answers come back here, and by email to the address you signed in with.</p>' + xsForm() +
      '<h3 class="xb-eh xs-h">Your conversations</h3><div id="xs-list">' + xsList() + '</div>';
  }
  /* keep what is being typed, then draw */
  function xsKeep() {
    var t = document.getElementById('xs-topic'), s = document.getElementById('xs-subj'), b = document.getElementById('xs-body');
    if (t) XS.draft.topic = t.value; if (s) XS.draft.subj = s.value; if (b) XS.draft.body = b.value;
    document.querySelectorAll('[data-xs-reply] textarea').forEach(function (a) { XS.reply[a.closest('[data-xs-reply]').getAttribute('data-xs-reply')] = a.value; });
  }
  function xsMount() {
    var box = document.getElementById('xs-box'); if (!box || !XS) return;
    var foc = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
    xsKeep();
    var h = xsHTML();
    if (box._h !== h) { box._h = h; box.innerHTML = h; if (window.SDI18N && SDI18N.reveal) SDI18N.reveal(box); }
    if (foc && document.getElementById(foc)) document.getElementById(foc).focus({ preventScroll: true });
  }
  /* only the list changes when the conversations come back, so the form being typed is never touched */
  function xsPaint() {
    var l = document.getElementById('xs-list');
    if (!l) { xsMount(); return; }
    xsKeep();
    var h = xsList();
    if (l._h !== h) { l._h = h; l.innerHTML = h; if (window.SDI18N && SDI18N.reveal) SDI18N.reveal(l); }
  }
  /* the sign-in changed (41's syPaint): the card follows */
  function xsAuth() {
    if (!XS) return;
    if (!xsOn()) { XS.threads = []; XS.st = 'idle'; XS.unread = 0; XS.open = {}; XS.reply = {}; XS.gen = -1; }
    xsBadge();
    if (curView !== 'inbox') return;
    xsMount();
    if (xsOn() && XS.gen !== SY.gen) xsLoad();
  }
  function xsEnter() { if (!XS) return; xsMount(); xsShowThread(); if (xsOn()) xsLoad(XS.gen === SY.gen); }

  /* ---------- sending ---------- */
  function xsSetErr(fld, msg) { if (!fld) return; var e = fld.querySelector('.err'); if (e) e.textContent = msg; if (msg) fld.setAttribute('data-err', ''); else fld.removeAttribute('data-err'); }
  function xsFieldErr(id, msg) { var f = document.getElementById(id); if (!f) return; f.setAttribute('aria-invalid', msg ? 'true' : 'false'); xsSetErr(f.closest('.fld'), msg); if (msg) f.focus(); }
  function xsSend() {
    if (XS.busy) return;
    if (!xsOn()) { openDrawer('sync', null, '#sy-google'); return; }
    xsKeep();
    var d = XS.draft, subj = d.subj.trim(), body = d.body.trim(), btn = document.getElementById('xs-send');
    xsFieldErr('xs-subj', ''); xsFieldErr('xs-body', '');
    if (!body) { xsFieldErr('xs-body', 'Write your message first.'); }
    if (!subj) { xsFieldErr('xs-subj', 'Add a subject.'); }
    if (!subj || !body) return;
    XS.busy = true; if (btn) syBusy(btn, true, 'Sending…');
    xsCall('POST', '/v1/threads', { topic: d.topic, subject: subj, body: body, lang: window.SDI18N ? SDI18N.lang : 'en' }).then(function (r) {
      XS.busy = false; if (btn && btn.isConnected) syBusy(btn, false);
      if (!syOk(r)) { showToast(xsErr(r)); return; }
      XS.draft = { topic: 'feedback', subj: '', body: '' };
      var s = document.getElementById('xs-subj'), b = document.getElementById('xs-body'), t = document.getElementById('xs-topic');
      if (s) s.value = ''; if (b) b.value = ''; if (t) t.value = 'feedback';
      if (r.data && r.data.id) XS.open[r.data.id] = true;
      showToast('Message sent. Our answer comes back here, and by email.');
      xsLoad(true);
    });
  }
  function xsReply(f) {
    var id = f.getAttribute('data-xs-reply'), a = f.querySelector('textarea'), fld = a.closest('.fld'), btn = f.querySelector('button[type="submit"]');
    if (f._busy) return;
    var body = a.value.trim();
    xsSetErr(fld, body ? '' : 'Write your reply first.');
    if (!body) { a.focus(); return; }
    f._busy = true; syBusy(btn, true, 'Sending…');
    xsCall('POST', '/v1/threads/reply', { id: +id, body: body }).then(function (r) {
      f._busy = false; if (btn.isConnected) syBusy(btn, false);
      if (!syOk(r)) { xsSetErr(fld, xsErr(r)); return; }
      a.value = ''; XS.reply[id] = ''; XS.open[id] = true;
      showToast('Reply sent');
      xsLoad(true);
    });
  }

  /* v61: delete takes two clicks, like Stop syncing. It hides the conversation here; the ScopeDue team keeps its copy */
  function xsDisarm(b) { clearTimeout(b._t); b.removeAttribute('data-arm'); b.textContent = sdT('Delete conversation'); }
  function xsDelete(b) {
    if (b._busy) return;
    if (!b.hasAttribute('data-arm')) {
      b.setAttribute('data-arm', ''); b.textContent = sdT('Delete? Click again');
      clearTimeout(b._t); b._t = setTimeout(function () { xsDisarm(b); }, 4000);
      return;
    }
    clearTimeout(b._t); b._busy = true;
    var id = +b.getAttribute('data-xs-del');
    syBusy(b, true, 'Deleting…');
    xsCall('POST', '/v1/threads/delete', { id: id }).then(function (r) {
      b._busy = false;
      if (!syOk(r) && !(r.status === 404 && syErr(r).code === 'not_found')) {   /* not_found: already gone, so done; no_route: an older server */ if (b.isConnected) { syBusy(b, false); xsDisarm(b); } showToast(xsErr(r)); return; }
      var t = XS.threads.filter(function (x) { return x.id === id; })[0];
      if (t && t.unread) { XS.unread = Math.max(0, XS.unread - 1); xsSave(); xsBadge(); }
      XS.threads = XS.threads.filter(function (x) { return x.id !== id; });
      delete XS.open[id]; delete XS.reply[id];
      xsPaint();
      showToast('Conversation deleted');
    });
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'xs-new') { e.preventDefault(); xsSend(); }
    else if (f.hasAttribute && f.hasAttribute('data-xs-reply')) { e.preventDefault(); xsReply(f); }
  });
  /* ⌘↵ sends, as in every panel */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
    var f = e.target.closest && e.target.closest('#xs-new, [data-xs-reply]'); if (!f) return;
    e.preventDefault(); if (f.id === 'xs-new') xsSend(); else xsReply(f);
  });
  /* a feature idea asks a different question than a problem */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'xs-topic') return;
    var b = document.getElementById('xs-body'); if (b) b.placeholder = typeof sdT === 'function' ? sdT(xsHint(e.target.value)) : xsHint(e.target.value);
  });
  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-xs-del]'); if (d) { e.preventDefault(); xsDelete(d); return; }
    var b = e.target.closest('[data-xs]'); if (b && b.getAttribute('data-xs') === 'again') xsLoad();
  });
  /* ---------- v71: the envelope's popup, like the bell's ----------
     The envelope no longer leaves the page: it opens a list of the latest conversations, fetched in place (/v1/threads),
     newest first, each with its last message. Clicking one opens Help with that conversation open and in view. */
  var xsMailBtn = document.getElementById('xs-mail'), xsPop = document.getElementById('xs-pop'), xsPopBody = document.getElementById('xs-pop-body');
  var xsPopOpen = false, XS_POP_MAX = 8, XS_CLR = 'sd-xs-clr';
  /* v71: Clear empties the popup on this device. It hides each conversation as it is now (id -> last_at) and marks its answers
     read; nothing is deleted, every conversation stays in Help, and a new message brings it back to the popup */
  function xsCleared() { try { var o = JSON.parse(localStorage.getItem(XS_CLR) || 'null'); return o && o.slug === SY.slug && o.ids ? o.ids : {}; } catch (e) { return {}; } }
  function xsSetCleared(ids) { try { localStorage.setItem(XS_CLR, JSON.stringify({ slug: SY.slug, ids: ids })); } catch (e) {} }
  function xsPopList() { var c = xsCleared(); return XS.threads.filter(function (t) { return !(t.id in c) || c[t.id] !== t.last_at; }); }
  function xsPopClear() {
    var list = xsOn() ? xsPopList() : [], wl = wlShown() ? wlGet() || 'u' : '';   /* CONTRACT 144: the letter leaves the popup too, and stays in Help */
    if (!list.length && !wl) return;
    var was = xsCleared(), ids = {}, k;
    for (k in was) ids[k] = was[k];
    list.forEach(function (t) { ids[t.id] = t.last_at; });
    if (list.length) xsSetCleared(ids);
    if (wl) wlSet('c');
    xsBadge(); xsPopPaint();
    var un = list.filter(function (t) { return t.unread; }).map(function (t) { return t.id; });
    if (un.length) xsCall('POST', '/v1/threads/read', { ids: un }).then(function (r) {
      if (!syOk(r)) return;
      list.forEach(function (t) { t.unread = 0; });
      XS.unread = Math.max(0, XS.unread - (r.data.marked | 0)); XS.at = Date.now(); xsSave(); xsBadge();
      if (curView === 'inbox') xsPaint();
    });
    var nc = list.length + (wl ? 1 : 0);
    showToast(nc === 1 ? '1 message cleared' : nc + ' messages cleared', function () { if (list.length) xsSetCleared(was); if (wl) wlSet(wl === 'u' ? '' : wl); xsBadge(); xsPopPaint(); });
  }
  function xsLast(t) {
    var r = (t.replies || []).slice(-1)[0];
    return r ? { who: r.from === 'team' ? 'ScopeDue team' : 'You', body: r.body } : { who: 'You', body: t.body };
  }
  function xsPopItem(t) {
    var l = xsLast(t), un = !!t.unread;
    return '<li class="n-item st"' + (un ? ' data-unread' : '') + ' data-xs-go="' + t.id + '">' +
      '<button type="button" class="n-main"><span class="n-dot" aria-hidden="true"></span><span class="n-txt">' +
      '<span class="n-title"><span class="sr">' + (un ? 'Unread. ' : '') + '</span><span translate="no">' + esc(t.subject) + '</span></span>' +
      '<span class="n-text"><b class="xs-who">' + esc(sdT(l.who)) + ':</b> <span translate="no">' + esc(l.body) + '</span></span></span>' +
      '<span class="n-time">' + esc(syAgo(t.last_at)) + '</span></button></li>';
  }
  function xsPopHTML() {
    /* CONTRACT 144: the letter leads the popup, signed in or not, until it is cleared */
    var wl = wlShown() ? wlItem() : '', wlOl = wl ? '<ol class="n-list xs-wl-l">' + wl + '</ol>' : '';
    if (!SY.key || !xsOn()) return wlOl + '<p class="xs-note xs-pop-n">' + esc(sdT(SY.key ? 'Your sign-in has ended. Sign in again to send a message or read our answers.' : 'Sign in to send us a message. Our answers come back here, and by email.')) + '</p>' +
      '<div class="sy-acts xs-pop-n"><button type="button" class="btn-primary btn-sm" data-xs-pop="signin">' + esc(sdT(SY.key ? 'Sign in again' : 'Sign in to send a message')) + '</button></div>';
    if (XS.st === 'load' && !XS.threads.length) return wlOl + '<p class="xs-note xs-pop-n">' + esc(sdT('Loading your conversations…')) + '</p>';
    if (XS.st === 'err' && !XS.threads.length) return wlOl + '<p class="xs-note xs-pop-n sy-bad">' + esc(sdT(XS.msg)) + '</p><div class="sy-acts xs-pop-n"><button type="button" class="btn-ghost btn-sm" data-xs-pop="again">' + esc(sdT('Try again')) + '</button></div>';
    if (!XS.threads.length) return wlOl || '<p class="xs-note xs-pop-n">' + esc(sdT('No messages yet. What you send shows up here, with our answers.')) + '</p>';
    var list = xsPopList();
    if (!list.length) return wlOl || '<div class="dr-empty xs-pop-n"><b>' + esc(sdT('You’re all caught up')) + '</b>' + esc(sdT('New answers from the ScopeDue team show up here. All your conversations are in Help.')) + '</div>';
    list = list.slice().sort(function (a, b) { return (b.last_at || 0) - (a.last_at || 0); }).slice(0, XS_POP_MAX);
    return '<ol class="n-list">' + wl + list.map(xsPopItem).join('') + '</ol>';
  }
  function xsPopPaint() {
    if (!xsPopBody) return;
    var h = xsPopHTML(), clr = document.getElementById('xs-pop-clear');
    if (clr) clr.disabled = !wlShown() && (!xsOn() || !xsPopList().length);
    if (xsPopBody._h === h) return;
    var foc = document.activeElement && xsPopBody.contains(document.activeElement) ? document.activeElement.closest('[data-xs-go]') : null;
    var fid = foc && foc.getAttribute('data-xs-go');
    xsPopBody._h = h; xsPopBody.innerHTML = h;
    if (fid) { var b = xsPopBody.querySelector('[data-xs-go="' + fid + '"] .n-main'); if (b) b.focus({ preventScroll: true }); }
  }
  function xsPopPlace() {
    var b = xsMailBtn.getBoundingClientRect(), a = document.querySelector('.top-actions').getBoundingClientRect();
    xsPop.style.setProperty('--nt', Math.round(b.bottom + 10) + 'px');
    xsPop.style.setProperty('--nr', Math.max(12, Math.round(root.clientWidth - a.right)) + 'px');
  }
  /* fetch the conversations without leaving the page; what is already known shows at once */
  function xsPopFetch() {
    if (!xsOn()) { xsPopPaint(); return Promise.resolve(); }
    if (XS.st !== 'ok') XS.st = 'load';
    xsPopPaint();
    var gen = SY.gen;
    return xsCall('GET', '/v1/threads').then(function (r) {
      if (gen !== SY.gen) return;
      if (!syOk(r)) { if (!XS.threads.length) { XS.st = 'err'; XS.msg = xsErr(r); } xsPopPaint(); return; }
      XS.threads = Array.isArray(r.data.threads) ? r.data.threads : []; XS.unread = r.data.unread | 0; XS.at = Date.now(); XS.st = 'ok'; XS.gen = SY.gen;
      xsSave(); xsBadge(); xsPopPaint();
      if (curView === 'inbox') xsPaint();
    });
  }
  function xsPopShow() {
    if (xsPopOpen || !xsPop) return;
    if (openEl) closeDrawer(true);
    closeNotif(true);
    xsPopPlace(); xsPopPaint();
    xsPop.setAttribute('data-open', ''); xsMailBtn.setAttribute('aria-expanded', 'true'); xsPopOpen = true;
    xsPop.classList.remove('play'); void xsPop.offsetWidth; xsPop.classList.add('play');
    setTimeout(function () { if (xsPopOpen) xsPop.focus({ preventScroll: true }); }, 60);
    xsPopFetch();
  }
  function xsPopClose(silent) {
    if (!xsPopOpen) return;
    xsPopOpen = false;
    xsPop.removeAttribute('data-open'); xsMailBtn.setAttribute('aria-expanded', 'false');
    if (!silent) xsMailBtn.focus({ preventScroll: true });
  }
  /* open Help with one conversation open and in view; it is marked read once it is on screen (xsSeen) */
  function xsGoThread(id) {
    xsPopClose(true);
    XS.open = {}; XS.open[id] = true; XS.focus = id;
    if (curView === 'inbox') { xsPaint(); xsShowThread(); } else showView('inbox');   /* Help draws the list, then xsLoad brings it into view */
    xsSeen();
  }
  /* the conversation picked in the popup: open, in view and focused, once it is drawn */
  function xsShowThread() {
    var id = XS.focus; if (!id) return;
    var d = document.querySelector('[data-xs-th="' + id + '"]'); if (!d) return;
    d.open = true;
    var s = d.querySelector('summary'); if (s) s.focus({ preventScroll: true });
    d.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  function xsGoHelp(focusForm) {
    xsPopClose(true);
    showView('inbox');
    var t = focusForm ? document.getElementById('xs-subj') || document.getElementById('xs-in') : document.getElementById('xs-list') || document.getElementById('xs-in');
    if (t) { t.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); if (focusForm) t.focus({ preventScroll: true }); }
  }
  if (xsMailBtn && xsPop) {
    xsMailBtn.addEventListener('click', function () { xsPopOpen ? xsPopClose() : xsPopShow(); });
    if (bell) bell.addEventListener('click', function () { xsPopClose(true); });
    document.getElementById('xs-pop-all').addEventListener('click', function () { xsGoHelp(false); });
    document.getElementById('xs-pop-new').addEventListener('click', function () { xsGoHelp(true); });
    document.getElementById('xs-pop-clear').addEventListener('click', xsPopClear);
    xsPop.addEventListener('click', function (e) {
      var a = e.target.closest('[data-xs-pop]');
      if (a) {
        if (a.getAttribute('data-xs-pop') === 'again') xsPopFetch();
        else { xsPopClose(true); openDrawer('sync', xsMailBtn, '#sy-google'); }
        return;
      }
      if (e.target.closest('[data-xs-wl]')) { xsPopClose(true); openDrawer('welcome', xsMailBtn); return; }   /* CONTRACT 144 */
      var it = e.target.closest('[data-xs-go]'); if (it) xsGoThread(+it.getAttribute('data-xs-go'));
    });
    document.addEventListener('pointerdown', function (e) {
      if (xsPopOpen && !xsPop.contains(e.target) && !xsMailBtn.contains(e.target) && !e.target.closest('#toast')) xsPopClose(true);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && xsPopOpen) { e.preventDefault(); xsPopClose(); }
    });
    xsPop.addEventListener('focusout', function (e) {
      var t = e.relatedTarget;
      if (xsPopOpen && t && !xsPop.contains(t) && t !== xsMailBtn) xsPopClose(true);
    });
    xsPop.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var mains = [].slice.call(xsPop.querySelectorAll('.n-item .n-main'));
      if (!mains.length) return;
      var i = mains.indexOf(document.activeElement), next;
      if (e.key === 'ArrowDown') next = i < 0 ? 0 : Math.min(i + 1, mains.length - 1);
      else if (i > 0) next = i - 1; else return;
      e.preventDefault(); mains[next].focus();
    });
    window.addEventListener('resize', function () { if (xsPopOpen) xsPopPlace(); });
  }
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d.matches || !d.matches('[data-xs-th]')) return;
    var id = d.getAttribute('data-xs-th');
    if (d.open) { XS.open[id] = true; xsSeen(); } else delete XS.open[id];
  }, true);
  /* coming back to a tab, or clicking into the side panel, asks the server itself: the shared cache may predate the answer */
  var xsBack = 0;
  function xsReturn() {
    if (document.visibilityState !== 'visible' || !xsOn() || Date.now() - xsBack < 5000) return;
    xsBack = Date.now();
    if (curView === 'inbox') xsLoad(true); else xsCheck(true);
  }
  document.addEventListener('visibilitychange', xsReturn);
  window.addEventListener('focus', xsReturn);
  /* another tab (or the side panel) learned a new count: show it here too, without a call */
  window.addEventListener('storage', function (e) {
    if (e.key === WL_LS) { xsBadge(); xsPopPaint(); return; }
    if (e.key !== XS_LS || !xsOn()) return;
    var c = xsCached(); if (!c || c.at < XS.at) return;
    XS.unread = c.unread | 0; XS.at = c.at; xsBadge();
  });

  function xsInit() {
    xsBadge();
    if (xsOn()) xsCheck(false);
    /* in Help the list itself refreshes, so a new answer appears where the person is reading */
    setInterval(function () { if (document.visibilityState !== 'visible' || !xsOn() || xsPopOpen) return; if (curView === 'inbox') xsLoad(true); else xsCheck(false); }, XS_EVERY);
    /* v71: while the envelope popup is open its list is fetched every 15 seconds, so a new answer appears without reloading */
    setInterval(function () { if (xsPopOpen && document.visibilityState === 'visible' && xsOn()) xsPopFetch(); }, 15000);
    if (curView === 'inbox') xsEnter();
  }
  xsInit();

  if (sdTest()) window.__xs = { state: XS, base: xsBase, check: xsCheck, load: xsLoad, letter: wlGet };
