  /* ---------- undo: one slot, one shape ----------
     showToast(msg, undo) shows a toast. Given an undo function it also offers Undo, and the button runs it once.
     A change to a whole model restores from a snapshot (snapOf / snapBack); a change to one item puts back only what it touched. */
  function hideToast() { document.getElementById('toast').removeAttribute('data-open'); clearTimeout(toastTimer); pendingUndo = null; }
  function showToast(msg, undo) {
    var t = document.getElementById('toast');
    pendingUndo = undo || null;
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-undo').hidden = !pendingUndo;
    if (t.hasAttribute('data-open')) { t.removeAttribute('data-open'); void t.offsetWidth; }
    t.setAttribute('data-open', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  document.getElementById('toast-undo').addEventListener('click', function () {
    var undo = pendingUndo; if (!undo) return;
    hideToast(); undo();
  });

  function syncSave() { saveBtn.disabled = !input.value.trim(); }
  input.addEventListener('input', syncSave);
  function saveNote() {
    var raw = input.value.trim(); if (!raw) return;
    var tags = [];
    var text = raw.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, function (m, sp, t) {
      t = t.toLowerCase(); if (tags.indexOf(t) < 0) tags.push(t); return sp;
    }).replace(/[ \t]+\n/g, '\n').trim();
    if (!text) text = raw;
    var now = new Date(), d = now.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()];
    var np = document.getElementById('note-proj'), nw = document.getElementById('note-remw'), rr = x6RemRead(nw);
    if (rr.err) { showToast(rr.err); return; }
    var n = { id: nextId++, text: text, tags: tags, date: d, ts: Date.now(), rem: null, pid: np.value, u: '' }; x6RemSet(n, rr);
    notes.unshift(n); nf = X6N.pid && n.pid === X6N.pid ? '__pj' : 'all';   /* v73: opened from a project, its notes stay in view */
    input.value = ''; np.value = X6N.pid || ''; nw.innerHTML = x6RemHTML(null); syncSave();
    renderNotes(n.id); tdRender();
    document.getElementById('notes-body').scrollTop = 0;
    input.focus();
  }
  document.getElementById('composer').addEventListener('submit', function (e) { e.preventDefault(); saveNote(); });
  input.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveNote(); }
  });

  /* ---------- page-level motion ---------- */
  var topbar = document.querySelector('.topbar');
  function onScroll() { topbar.classList.toggle('scrolled', window.scrollY > 4); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();



  /* ---------- sidebar: spotlight, collapse, tooltips, mobile menu ---------- */
  (function () {
    var side = document.getElementById('side'), nav = document.getElementById('nav');
    var hov = nav.querySelector('.nav-hover'), tip = document.getElementById('tip');
    var toggle = document.getElementById('side-toggle'), menuBtn = document.getElementById('menu-btn');
    var wide = window.matchMedia('(min-width: 901px)');

    /* the sidebar is there from the first frame: no stagger, it plays on every new tab */
    side.querySelectorAll('.side-in').forEach(function (n) { n.classList.remove('side-in'); });

    /* hover spotlight that glides between items */
    function moveHover(a) {
      if (a.getAttribute('aria-current') === 'page') { hov.style.opacity = 0; return; }
      var first = hov.style.opacity !== '1';
      if (first) hov.classList.add('no-anim');
      hov.style.height = a.offsetHeight + 'px';
      hov.style.transform = 'translateY(' + a.offsetTop + 'px)';
      if (first) { void hov.offsetHeight; hov.classList.remove('no-anim'); }
      hov.style.opacity = 1;
    }
    nav.addEventListener('mouseover', function (e) { var a = e.target.closest('.nav-i'); if (a && nav.contains(a)) moveHover(a); });
    nav.addEventListener('focusin', function (e) { var a = e.target.closest('.nav-i'); if (a) moveHover(a); });
    nav.addEventListener('mouseleave', function () { hov.style.opacity = 0; });
    nav.addEventListener('focusout', function () { hov.style.opacity = 0; });

    /* tooltips when collapsed */
    function showTip(t) {
      if (!wide.matches || !app.classList.contains('collapsed')) return;
      var text = t.getAttribute('data-tip'); if (!text) return;
      tip.textContent = text;
      var r = t.getBoundingClientRect();
      tip.style.left = (r.right + 12) + 'px';
      tip.style.top = (r.top + r.height / 2 - tip.offsetHeight / 2) + 'px';
      tip.setAttribute('data-open', '');
    }
    function hideTip() { tip.removeAttribute('data-open'); }
    side.addEventListener('mouseover', function (e) { var t = e.target.closest('[data-tip]'); if (t) showTip(t); });
    side.addEventListener('mouseout', function (e) { if (e.target.closest('[data-tip]')) hideTip(); });
    side.addEventListener('focusin', function (e) { var t = e.target.closest('[data-tip]'); if (t) showTip(t); });
    side.addEventListener('focusout', hideTip);

    /* collapse to a rail */
    function setCollapsed(c, persist) {
      app.classList.toggle('collapsed', c);
      toggle.setAttribute('aria-expanded', c ? 'false' : 'true');
      toggle.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar');
      hideTip(); hov.style.opacity = 0;
      if (persist) { try { localStorage.setItem('sd-side', c ? '1' : '0'); } catch (e) {} }
    }
    var stored = null; try { stored = localStorage.getItem('sd-side'); } catch (e) {}
    if (stored === '1') { app.classList.add('no-trans'); setCollapsed(true, false); requestAnimationFrame(function () { requestAnimationFrame(function () { app.classList.remove('no-trans'); }); }); }
    toggle.addEventListener('click', function () { setCollapsed(!app.classList.contains('collapsed'), true); });

    /* mobile menu (sidebar as a left drawer) */
    function openMenu() {
      if (openEl) closeDrawer(true);
      side.setAttribute('data-open', ''); scrim.setAttribute('data-open', ''); root.classList.add('locked');
      menuBtn.setAttribute('aria-expanded', 'true');
      setTimeout(function () { var f = side.querySelector('.nav-i'); if (f) f.focus({ preventScroll: true }); }, 90);
    }
    function closeMenu(silent) {
      if (!side.hasAttribute('data-open')) return;
      side.removeAttribute('data-open'); scrim.removeAttribute('data-open'); root.classList.remove('locked');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (!silent) menuBtn.focus({ preventScroll: true });
    }
    menuBtn.addEventListener('click', function () { side.hasAttribute('data-open') ? closeMenu() : openMenu(); });
    scrim.addEventListener('click', function () { closeMenu(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    side.addEventListener('click', function (e) { if (e.target.closest('.nav-i, .user') && !wide.matches) closeMenu(true); });
    wide.addEventListener && wide.addEventListener('change', function () { closeMenu(true); });
  })();

