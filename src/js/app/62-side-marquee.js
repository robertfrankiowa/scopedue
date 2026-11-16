  /* ---------- the sidebar's long lines ----------
     A project name, the storage line or the account cut short by the sidebar's width slides left while the pointer rests on its
     row (or the row has focus), at one reading speed, and comes back when it leaves. Only lines that are cut move. text-indent
     moves the words without new markup, so the language layer never sees a change. It slides under reduced motion too (the
     user's ruling: it moves only when asked for, once, slowly); 49-motion.css lets --sm-d through. */
  var smSide = document.getElementById('side'), SM_SEL = '.lbl, .pname, .sync-txt, .user-txt b, .user-txt small', SM_PXS = 36, SM_WAIT = 400;
  function smLines(row) { return [].slice.call(row.querySelectorAll(SM_SEL)); }
  function smGo(el) {
    var d = el.scrollWidth - el.clientWidth; if (d < 2) return;
    clearTimeout(el.smT);
    el.smT = setTimeout(function () {   /* the "…" stays until the words start to move */
      el.classList.add('sm-on');
      el.style.setProperty('--sm-d', Math.max(.6, d / SM_PXS).toFixed(2) + 's');
      el.style.transition = 'text-indent var(--sm-d) linear';
      el.style.textIndent = -d + 'px';
    }, SM_WAIT);
  }
  function smBack(el) {
    clearTimeout(el.smT);
    if (!el.classList.contains('sm-on')) return;
    var done = function () { if (!el.style.textIndent) { el.classList.remove('sm-on'); el.style.transition = ''; } };
    el.style.setProperty('--sm-d', '.35s');
    el.style.transition = 'text-indent var(--sm-d) var(--ease-out)';
    el.style.textIndent = '';
    el.addEventListener('transitionend', function f() { el.removeEventListener('transitionend', f); done(); });
  }
  function smRow(e) {
    var row = e.target.closest('.nav-i, .sync, .user');
    return row && !(e.relatedTarget && row.contains(e.relatedTarget)) && !app.classList.contains('collapsed') ? row : null;
  }
  ['mouseover', 'focusin'].forEach(function (t) { smSide.addEventListener(t, function (e) { var r = smRow(e); if (r) smLines(r).forEach(smGo); }); });
  ['mouseout', 'focusout'].forEach(function (t) { smSide.addEventListener(t, function (e) { var r = smRow(e); if (r) smLines(r).forEach(smBack); }); });
