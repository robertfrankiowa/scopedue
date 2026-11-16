  /* ---------- priority filter ---------- */
  var prioDrawer = document.getElementById('drawer-prio');
  var prioSeg = document.getElementById('prio-seg');
  var prioBody = document.getElementById('prio-body');
  var prioF = 'all';
  function setPrioFilter(f, silent) {
    prioF = f;
    setPressed(prioSeg, f);
    prioApply();
    prioBody.scrollTop = 0;
    if (!silent) playStagger(prioDrawer);
  }
  function prioApply() {
    var f = prioF, shown = 0;
    prioBody.querySelectorAll('li[data-kind]').forEach(function (li) {
      var show = f === 'all' || li.getAttribute('data-kind') === f;
      li.hidden = !show; if (show) shown++;
    });
    prioBody.querySelectorAll('.group').forEach(function (g) {
      var all = g.querySelectorAll('li').length, vis = g.querySelectorAll('li:not([hidden])').length, n = g.querySelector('.g-n');
      g.hidden = !vis;
      if (n) n.textContent = vis < all ? vis + ' of ' + all + ' items' : all + (all === 1 ? ' item' : ' items');
    });
    /* v130: the foot says how many show only while a filter hides some, as one text ("Showing 4 of 4 items" had "of" untranslated) */
    var total = prioBody.querySelectorAll('li[data-kind]').length;
    document.getElementById('prio-foot').hidden = shown === total;
    document.getElementById('prio-count').textContent = 'Showing ' + shown + ' of ' + total + (total === 1 ? ' item' : ' items');
    document.getElementById('prio-empty').hidden = shown !== 0;
  }
  prioSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (b) setPrioFilter(b.getAttribute('data-f'));
  });

  /* ---------- projects filter + search ---------- */
  var projDrawer = document.getElementById('drawer-projects');
  var projSeg = document.getElementById('proj-seg');
  var projQ = document.getElementById('proj-q');
  var pf = 'all';
  function applyProj() {
    var q = fold(projQ.value.trim()), shown = 0;
    projDrawer.querySelectorAll('.pj-d').forEach(function (it) {
      var ok = (pf === 'all' || it.getAttribute('data-kind') === pf) && (!q || fold(it.getAttribute('data-name')).indexOf(q) > -1);
      it.hidden = !ok; if (ok) shown++;
    });
    projCount(shown, !!q);
    document.getElementById('proj-empty').hidden = shown !== 0;
    document.getElementById('proj-body').scrollTop = 0;
    playStagger(projDrawer);
  }
  projSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    pf = b.getAttribute('data-f'); setPressed(projSeg, pf); applyProj();
  });
  projQ.addEventListener('input', applyProj);
  /* v129: the foot says how many show only while a filter or a search hides some; it said "Showing 4 of 4" and the order the line
     under the title already gives */
  function projCount(shown, q) {
    var total = projDrawer.querySelectorAll('.pj-d').length, foot = document.getElementById('proj-foot');
    if (shown == null) shown = projDrawer.querySelectorAll('.pj-d:not([hidden])').length;
    foot.hidden = shown === total && !q;
    document.getElementById('proj-count').textContent = 'Showing ' + shown + ' of ' + total + (total === 1 ? ' project' : ' projects');
  }

  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
