  /* ---------- footer: links, year, theme ---------- */
  document.getElementById('sf-year').textContent = new Date().getFullYear();
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ft]'); if (!a) return;
    e.preventDefault();
    xbGo(a.getAttribute('data-ft'));
  });
  /* the themes are the files in src/css/themes: build.py writes the list here, and the buttons in the footer and in Settings */
  var SD_THEMES = /*SD_THEMES*/[];
  function thIndex(v) { for (var i = 0; i < SD_THEMES.length; i++) if (SD_THEMES[i].id === v) return i; return -1; }
  var thSw = document.getElementById('theme-sw'), thHost = root.hasAttribute('data-sd-theme-boot') ? null : root.getAttribute('data-theme');
  root.removeAttribute('data-sd-theme-boot');
  function thApply(v, persist) {
    if (thIndex(v) < 0) v = 'system';
    if (v !== 'system') root.setAttribute('data-theme', v);
    else if (thHost) root.setAttribute('data-theme', thHost); else root.removeAttribute('data-theme');
    thSw.setAttribute('data-t', v); thSw.style.setProperty('--ti', String(thIndex(v) + 1));
    stPaintLook();
    [].forEach.call(thSw.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === v ? 'true' : 'false'); });
    if (persist) { try { localStorage.setItem('sd-theme', v); } catch (err) {} }
  }
  /* v110: a theme chosen by hand spreads from the button pressed, as a circle (a view transition); at once without one,
     with less motion asked for, or when the look would not change */
  function thSwitch(v, from) {
    var go = function () { thApply(v, true); };
    var before = root.getAttribute('data-theme') || '';
    if (reduced || !document.startViewTransition || document.hidden || v === thSw.getAttribute('data-t')) return go();
    var r = from && from.getBoundingClientRect(), x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2;
    var end = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));
    root.classList.add('th-vt');
    var vt = document.startViewTransition(function () { go(); if ((root.getAttribute('data-theme') || '') === before) root.classList.remove('th-vt'); });
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 620, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('th-vt'); }, function () { root.classList.remove('th-vt'); });
  }
  thSw.addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) thSwitch(b.getAttribute('data-t'), b); });
  /* if the host page changes data-theme later, remember it; an explicit Light/Dark choice still wins */
  if (window.MutationObserver) new MutationObserver(function () {
    var cur = thSw.getAttribute('data-t'), now = root.getAttribute('data-theme');
    if (cur === 'system') { thHost = now; return; }
    if (now === cur) return;
    thHost = now; thApply(cur, false);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  (function () {
    var saved = null; try { saved = localStorage.getItem('sd-theme'); } catch (err) {}
    thSw.classList.add('no-anim'); thApply(saved || 'system', false);
    requestAnimationFrame(function () { requestAnimationFrame(function () { thSw.classList.remove('no-anim'); }); });
  })();


  x6Init(); x7Init(); x8Init(); x9Init(); xaInit(); xbInit(); dbPriority(); mwBadge();
  /* v130 (107): a project opened by the page's address (#pj-…, 42-local-data) was drawn before these knew the samples and your
     initials: draw it again, so a sample's people are not offered the Owner's role menus and Remove */
  if (curView === 'project' && pd.p) pdRerender();
  sdUTInit();
  renderNotes();
  /* the page is drawn from the saved data: show it now, once (the new tab hid it until here, see boot.js) */
  document.documentElement.classList.remove('sd-wait');
  /* everything is drawn: from here on, what is in memory is what is saved, and changes are written */
  SDB.start({
    collect: function () { return { note: notes, client: CLIENTS, thread: THREADS, project: PROJECTS }; },
    meta: function () { return { recent: RECENT, ntread: NT_READ, ntsync: NT_SYNC, team: TEAM, today: TD, review: WR, sample: XA.sample, ctr: { nextId: nextId, pdN: pdN, pdeN: pdeN, prvN: prvN } }; }
  });
  pdFixUndefinedLines();   // v118 (85): after start, so the mended rows are written with the next save
  if (SDB.S.lost) showToast(ldN(SDB.S.lost, 'saved item') + ' could not be read and ' + (SDB.S.lost === 1 ? 'was' : 'were') + ' set aside. Export a copy to keep ' + (SDB.S.lost === 1 ? 'it' : 'them') + '.');
  SDB.ready();
