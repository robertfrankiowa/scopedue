  /* ---------- sliding thumb for segmented controls ---------- */
  function thumbOf(seg) {
    var t = seg.querySelector('.seg-thumb');
    if (!t) { t = el('span', 'seg-thumb'); t.setAttribute('aria-hidden', 'true'); seg.insertBefore(t, seg.firstChild); }
    return t;
  }
  function moveThumb(seg, animate) {
    var b = seg.querySelector('button[aria-pressed="true"]'); if (!b) return;
    var t = thumbOf(seg);
    if (!animate) t.classList.add('no-anim');
    thumbAt(t, b.offsetWidth, b.offsetHeight, b.offsetLeft, b.offsetTop);
    if (!animate) { void t.offsetWidth; t.classList.remove('no-anim'); }
    /* a slider wider than its room scrolls: keep the chosen one in view */
    if (seg.scrollWidth > seg.clientWidth + 1 && (b.offsetLeft < seg.scrollLeft || b.offsetLeft + b.offsetWidth > seg.scrollLeft + seg.clientWidth)) seg.scrollLeft = b.offsetLeft - 3;
  }
  /* the thumb sits on the chosen button; a slider that wraps onto a second row moves it down as well */
  function thumbAt(t, w, h, x, y) { t.style.width = w + 'px'; t.style.height = h + 'px'; t.style.transform = 'translate(' + x + 'px, ' + (y - 3) + 'px)'; }
  function setPressed(seg, key) {
    seg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === key ? 'true' : 'false'); });
    moveThumb(seg, true);
  }
  /* v68: every slider on screen in two passes, measure then move, so the page is laid out once, not once per slider.
     A slider in a closed drawer or a hidden page is placed when it is shown (openDrawer, showView) */
  function syncThumbs(scope) {
    var m = [];
    [].forEach.call((scope && scope.querySelectorAll ? scope : document).querySelectorAll('.seg'), function (s) {
      var b = s.querySelector('button[aria-pressed="true"]'); if (b && s.getClientRects().length) m.push([s, b.offsetWidth, b.offsetLeft, b.offsetHeight, b.offsetTop]);
    });
    m.forEach(function (x) { var t = thumbOf(x[0]); t.classList.add('no-anim'); thumbAt(t, x[1], x[3], x[2], x[4]); });
    if (m.length) { void document.body.offsetWidth; m.forEach(function (x) { thumbOf(x[0]).classList.remove('no-anim'); }); }
  }
  syncThumbs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncThumbs(); });
  window.addEventListener('resize', function () { syncThumbs(); });
  /* v68: words change length with the language; the sliders follow */
  if (window.SDI18N) SDI18N.onChange(function () { requestAnimationFrame(function () { syncThumbs(); window.dispatchEvent(new Event('resize')); }); });

  /* ---------- staggered entrance inside drawers ---------- */
  document.querySelectorAll('.drawer .dr-h > div:first-child, .drawer .dr-tools, .drawer li[data-kind], .drawer .pj-d, .drawer .composer, .drawer .pcard, .drawer .sec, .drawer .metric, .drawer .pexplain').forEach(function (n) { n.classList.add('st'); });
  function playStagger(d) {
    var i = 0;
    d.querySelectorAll('.st').forEach(function (n) {
      if (!n.getClientRects().length) return;
      n.style.setProperty('--i', Math.min(i++, 14));
    });
    d.classList.remove('play'); void d.offsetWidth; d.classList.add('play');
  }

  /* ---------- drawer open / close ---------- */
  function openDrawer(name, trigger, focusSel) {
    if (name === 'photo' && !syHasSession()) { syRequireProfileSignIn(); return; }
    var d = document.getElementById('drawer-' + name);
    if (!d) return;
    if (!d.classList.contains('dr-live')) { d.classList.add('dr-live'); if (window.SDI18N && SDI18N.reveal) SDI18N.reveal(d); void d.offsetWidth; }   /* laid out (and put in the language) off screen first, so it still slides in */
    clearTimeout(d._sdOff);   /* v68: a closed drawer is not laid out at all (.drawer:not(.dr-live)); its open hooks below measure it */
    if (name === 'compose') focusSel = cmOnOpen();
    if (name === 'photo') focusSel = pfpOnOpen();
    if (name === 'invite') focusSel = invOnOpen();
    if (name === 'issue') focusSel = isOnOpen();
    if (name === 'remind') focusSel = rmOnOpen();
    if (name === 'cr') focusSel = crOnOpen();
    if (name === 'cap') focusSel = capOnOpen();
    if (name === 'prep') focusSel = prepOnOpen();
    if (name === 'preview') focusSel = pvwOnOpen();
    if (name === 'msrc') focusSel = msOnOpen();
    if (name === 'ndec') focusSel = ndecOnOpen();
    if (name === 'gate') focusSel = gateOnOpen();
    if (name === 'versions') focusSel = vxOnOpen();
    if (name === 'npj') focusSel = npjOnOpen();
    if (name === 'ptheme') focusSel = ptdOnOpen();
    if (name === 'client-new') cfOnOpen();
    if (name === 'mexp') focusSel = mexpOnOpen();
    if (name === 'pdel') focusSel = pdelOnOpen();   /* v96 (42) */
    if (name === 'mai') focusSel = maiOnOpen();
    if (name === 'sync') focusSel = syOnOpen();
    if (name === 'today') focusSel = tdOnOpen();
    if (name === 'review') focusSel = wrOnOpen();
    if (name === 'grab') focusSel = cxOnOpen();
    if (name === 'notes') x6NotesOpen();
    if (name === 'welcome') wlOnOpen();   /* CONTRACT 144 (49) */
    if (openEl && openEl !== d) closeDrawer(true);
    closeNotif(true);
    lastTrigger = trigger || document.activeElement;
    openEl = d;
    d.setAttribute('data-open', '');
    scrim.setAttribute('data-open', '');
    app.inert = true;
    root.classList.add('locked');
    d.querySelectorAll('.seg').forEach(function (sg) { moveThumb(sg, false); });
    playStagger(d);
    var f = (focusSel && d.querySelector(focusSel)) || d.querySelector('.dr-x');
    setTimeout(function () { if (f) f.focus({ preventScroll: true }); }, 90);
  }
  function closeDrawer(silent) {
    if (!openEl) return;
    var d = openEl;
    if (d.id === 'drawer-sync') { syEl.password.value = ''; syEl.confirm.value = ''; }
    d.removeAttribute('data-open');
    scrim.removeAttribute('data-open');
    app.inert = false;
    root.classList.remove('locked');
    d._sdOff = setTimeout(function () { if (!d.hasAttribute('data-open')) { d.classList.remove('play'); d.classList.remove('dr-live'); } }, 520);
    if (!silent && lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
    openEl = null;
    if (d.id === 'drawer-sync') xaSyncClosed();   /* v72: the web app's sign-in step goes on from here */
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
    var t = e.target.closest('[data-open-drawer]');
    if (t) {
      e.preventDefault();
      var name = t.getAttribute('data-open-drawer');
      if (name === 'prio') setPrioFilter(t.getAttribute('data-filter') || 'all', true);
      var fs = t.getAttribute('data-focus');
      openDrawer(name, t, fs === 'composer' ? '#note-input' : (fs && fs.charAt(0) === '#' ? fs : null));
      return;
    }
    if (e.target.closest('[data-close]')) closeDrawer();
  });
  scrim.addEventListener('click', function () { closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openEl) { e.preventDefault(); closeDrawer(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !openEl) {
      e.preventDefault(); qfShortcut();
    }
  });

