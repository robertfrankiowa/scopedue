/* ───── clicks ───── */
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-a]');
  if (!b) { if (!ev.target.closest('#acctMenu,#whoBtn,#notif,#bellBtn,#tmenu,#thmBtn')) closeMenus(); if (!ev.target.closest('#dock')) $('#dock').classList.remove('open'); return; }
  var a = b.dataset.a, pid = b.dataset.pid, cid = b.dataset.cid, key = b.dataset.key;
  if (demoRo(a)) { ev.preventDefault(); toast(DEMO_RO_MSG); return; }   // v120 (88): the sample is to look at
  switch (a) {
    case 'close': closeD(b.closest('dialog')); break;
    case 'dclose': closeDlg(); break;
    case 'landing': landing(); nav(S.route); break;
    case 'home': nav({ k: 'home' }); break;
    case 'project': nav({ k: 'p', id: pid }); break;
    case 'open': nav({ k: 'p', id: pid }, { sel: key }); break;
    case 'pick': S.sel = key; render('soft'); break;
    case 'approve': startApprove(); break;
    case 'approve-from': beginApprove(key); break;
    case 'vback': leaveVerify(true); break;
    case 'resend': sendCode(true); break;
    case 'confirm': submitCode(); break;
    case 'mailx': hideMail(); break;
    case 'mailfill':
      if (!V.inVerify || V.locked || V.busy) break;
      var inp = $('#otpIn'); inp.value = ''; paintCells(); inp.focus({ preventScroll: true });
      var i = 0, iv = setInterval(function () { inp.value = V.code.slice(0, ++i); inp.dispatchEvent(new Event('input', { bubbles: true })); if (i >= 6) clearInterval(iv); }, RM.matches ? 0 : 120); break;
    case 'scope': openScope(pid || S.route.id, b.dataset.v ? +b.dataset.v : undefined); break;
    case 'sv': scopeDrawer(P[pid], +b.dataset.v); break;
    case 'req': if (b.closest('dialog#dScope')) closeD($('#dScope')); openReq(pid, cid); break;
    case 'crf': S.crf = b.dataset.f; reqDrawer(P[S.dr.reqP], null); break;
    case 'ckok': msCheckOk(pid, b.dataset.m, +b.dataset.s); break;   // v103 (61)
    case 'recv': msRecv(pid, b.dataset.m); break;   // v106 (63)
    case 'dispute': openDlg('dispute', { pid: pid, cid: cid }); break;   // v108 (65)
    case 'bugdispute': openDlg('dispute', { pid: pid, bug: +b.dataset.b }); break;
    case 'bug': msDlg('bug', { pid: pid }); break;   // v107 (64)
    case 'fixok': msFixOk(pid, b.dataset.m, +b.dataset.b); break;
    case 'ckissue': msDlg('check', { pid: pid, m: b.dataset.m, s: +b.dataset.s }); break;
    case 'unpic': if (DL && DL.pics) { DL.pics.splice(+b.dataset.i, 1); picPaint(); syncDlg(); } break;   // v102 (59)
    case 'cpl': {   /* v102 (58): a link to one of your entries, to keep or to send */
      var q = key.split('|'), cp = P[q[0]], cc = cp && pdCr(cp, q[1]), ce = cc && cc.entries[+q[2]]; if (!ce || !ce.hx) break;
      var shown = function () { S.cpl = key; reqDrawer(cp, cc.id); setTimeout(function () { if (S.cpl === key) { S.cpl = ''; if (S.dr.req === cc.id) reqDrawer(cp, cc.id); } }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(enLink(cp.id, ce.hx)).then(shown, shown); else shown();
      break;
    }
    case 'copies': openCopies(pid); break;
    case 'cpopen': toast('This is a sample copy. Opening files arrives with the data layer.'); break;
    case 'hist': openHist(pid || S.route.id); closeMenus(); break;
    case 'about': openAbout(false); break;
    case 'help': openAbout(true); closeMenus(); break;
    case 'lang': if (window.SDI18N) SDI18N.set(SDI18N.lang === 'vi' ? 'en' : 'vi'); closeMenus(); break;   // the client's own choice, kept in this browser
    case 'ask': openDlg('ask', { pid: pid || S.route.id, cid: cid, on: b.dataset.on }); break;
    case 'counter': openDlg('counter', { pid: pid, cid: cid }); break;
    case 'decline': openDlg('decline', { pid: pid, cid: cid }); break;
    case 'note': openDlg('note', { pid: pid, cid: cid }); break;
    case 'newquote': openDlg('newquote', { pid: pid, cid: cid }); break;
    case 'new': openDlg('new', { pid: pid || S.route.id }); break;
    case 'notif': goEvent(b.dataset.k); break;
    case 'evgo': var e2 = clientEvents(client(S.cid)).filter(function (x) { return x.k === b.dataset.k; })[0]; if (e2) { closeD($('#dHist')); if (e2.go.a === 'scope') openScope(e2.go.pid, e2.go.v); else if (e2.go.a === 'ms') { if (S.route.k !== 'p' || S.route.id !== e2.go.pid) { S.route = { k: 'p', id: e2.go.pid }; render('nav'); } setTimeout(msGo, 350); } else openReq(e2.go.pid, e2.go.cid); } break;
    case 'changes': case 'notmet': case 'flag': case 'sent': case 'endp': case 'paid': msDlg(a, { pid: pid || S.route.id, m: b.dataset.m }); break;
    case 'record': printRecord(pid || S.route.id); closeMenus(); break;
    case 'dd': studioDeliver(); break;
    case 'markall': notifs().forEach(function (e) { S.read[e.k] = true; }); if (LIVEON) liveReadSave(); paintHeader(); paintNotif(); break;
    case 'receipt': printReceipt(b.dataset.r); break;
    case 'contdone': S.done = null; render('soft'); break;
    case 'signout': liveSignOut(); break;
    case 'wretry': liveRetry(); break;
    case 'menu-acct': toggleMenu('acct'); break;
    case 'menu-theme': toggleMenu('theme'); break;
    case 'tm': pickTheme(b.dataset.v || ''); break;   // the client's own look (the Appearance menu)
    case 'menu-bell': toggleMenu('bell'); break;
    /* prototype dock */
    case 'dock': $('#dock').classList.toggle('open'); $('#dockB').setAttribute('aria-expanded', String($('#dock').classList.contains('open'))); break;
    case 'as': S.cid = b.dataset.cid; S.last = {}; closeAllD(); landing(); try { history.replaceState(null, '', hashFor(S.route)); } catch (e) { } S.done = null; S.sel = null; render('nav'); window.scrollTo(0, 0); break;
    case 'dq': studioQuote(); break;
    case 'df': studioFold(); break;
    case 'dff': OFFSET += 8 * DAY_MS; S.done = null; render('soft'); toast('Eight days later. Quotes and review windows shorter than that have ended.'); refreshDrawers(); break;
    case 'dreset': resetProto(); break;
  }
});
$('#view').addEventListener('pointermove', function (e) {
  if (!FINE.matches || RM.matches) return; var pn = e.target.closest('.dec-r'); if (!pn) return;
  var r = pn.getBoundingClientRect(); pn.style.setProperty('--mx', (e.clientX - r.left) + 'px'); pn.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
document.addEventListener('submit', function (e) { if (e.target.id === 'dform') { e.preventDefault(); if (demoRo('dform')) { closeDlg(); toast(DEMO_RO_MSG); return; } if (!$('#dgo').disabled) submitDlg(); } });
document.addEventListener('input', function (e) {
  if (e.target.closest('#dform')) syncDlg();
  if (e.target.id === 'otpIn') { var i = e.target; i.value = i.value.replace(/\D/g, '').slice(0, 6); paintCells(); if (i.value.length === 6) { $('#otp').dataset.state = ''; setTimeout(submitCode, wait(380)); } }
});
document.addEventListener('focusin', function (e) { if (e.target.id === 'otpIn') { paintCells(); var i = e.target, l = i.value.length; try { i.setSelectionRange(l, l); } catch (x) { } } });
document.addEventListener('focusout', function (e) { if (e.target.id === 'otpIn') paintCells(); });
document.addEventListener('pointerdown', function (e) { if (e.target.closest('#otp') && !V.locked) setTimeout(function () { var i = $('#otpIn'); if (i) i.focus({ preventScroll: true }); }, 0); });
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (V.inVerify && !$('dialog[open]')) { e.stopPropagation(); leaveVerify(true); return; }
  if (!$('#tmenu').hidden) { closeMenus(); $('#thmBtn').focus(); return; }
  if (!$('#acctMenu').hidden || $('#notif').classList.contains('open')) { closeMenus(); $('#whoBtn').focus(); }
  if ($('#dock').classList.contains('open')) $('#dock').classList.remove('open');
});
window.addEventListener('hashchange', function () {
  var m = /^#\/p\/([\w-]+)(?:\/e\/([0-9A-Fa-f]{6}))?$/.exec(location.hash), c = cl();
  if (m && m[2] && c.projects.indexOf(m[1]) > -1) { if (!(S.route.k === 'p' && S.route.id === m[1])) { S.route = { k: 'p', id: m[1] }; S.done = null; S.sel = null; render('nav'); } if (!enGo(m[1], m[2])) try { history.replaceState(null, '', '#/p/' + m[1]); } catch (e) { } }
  else if (m && c.projects.indexOf(m[1]) > -1 && !(S.route.k === 'p' && S.route.id === m[1])) { S.route = { k: 'p', id: m[1] }; S.done = null; S.sel = null; render('nav'); }
  else if (location.hash === '#/' && (c.projects.length > 1 || (c.gone || []).length) && S.route.k !== 'home') { S.route = { k: 'home' }; render('nav'); }
});

