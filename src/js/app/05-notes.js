  /* ---------- notes ---------- */
  var notes = SDBOOT.pick('note') || [];
  var nextId = Math.max(sdCtr('nextId', 1), notes.reduce(function (m, n) { return Math.max(m, n.id + 1); }, 0)), nf = 'all', pendingUndo = null, toastTimer = null;
  var dash = document.getElementById('dash-notes');
  var dlist = document.getElementById('dnotes');
  var nseg = document.getElementById('notes-seg');
  var notesDrawer = document.getElementById('drawer-notes');
  var input = document.getElementById('note-input');
  var saveBtn = document.getElementById('note-save');

  function metaOf(n) {
    var m = el('span', 'nmeta'), p = n.pid ? pdById(n.pid) : null;
    if (p) { var pn = el('span', 'nproj', sideName(p)); pn.title = p.n; m.appendChild(pn); }   /* v126: the short name the sidebar uses */
    n.tags.forEach(function (t) { m.appendChild(el('span', 'hash', '#' + t)); });
    if (n.u) { var a = el('span', 'nurl'); a.appendChild(svgUse('i-link')); a.appendChild(document.createTextNode(pdHost(n.u))); m.appendChild(a); }
    if (n.rem) { var r = el('span', 'rem' + (x6NoteDue(n) ? ' due' : '')); r.appendChild(svgUse('i-bell')); (x6NoteDue(n) && n.rem < x6Iso() ? ['Since ' + x6Lbl(n.rem)] : x6RemLbl(n)).forEach(function (t, i) { if (i) r.appendChild(document.createTextNode(' ')); r.appendChild(el('span', '', t)); }); m.appendChild(r); }
    m.appendChild(el('span', '', x6NoteDate(n)));
    return m;
  }
  function visible() {
    return notes.filter(function (n) {
      if (nf === 'all') return true;
      if (nf === '__rem') return !!n.rem;
      if (nf === '__pj') return !!nPid() && n.pid === nPid();
      return n.tags.indexOf(nf) > -1;
    });
  }
  /* the project Quick notes was opened from (20-quick-notes-today sets X6N up after the first paint) */
  function nPid() { return X6N ? X6N.pid : ''; }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }

  function renderDash(animate, popId) {
    dash.textContent = '';
    notes.slice(0, 3).forEach(function (n, i) {
      var b = el('button', 'note' + (animate ? ' load-in' : '') + (n.id === popId ? ' pop' : '')); b.type = 'button'; b.setAttribute('data-open-drawer', 'notes');
      if (animate) b.style.setProperty('--i', i);
      b.appendChild(el('span', 'txt', n.text)); b.appendChild(metaOf(n));
      dash.appendChild(b);
    });
    if (!notes.length) xaNotesEmpty();
    var cnt = document.getElementById('notes-count'), label = Math.min(3, notes.length) + ' of ' + notes.length;
    if (cnt.textContent !== label) cnt.textContent = label;
    /* v126: one link that says how many there are ("View all 9"), only when the card does not show them all */
    var all = document.getElementById('notes-all'), allT = document.getElementById('notes-all-t');
    if (all && allT) { all.hidden = notes.length <= 3; allT.textContent = 'View all ' + notes.length; }
  }
  function renderSeg() {
    var tags = {}; var rem = 0;
    notes.forEach(function (n) { n.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); if (n.rem) rem++; });
    var defs = [['all', 'All', notes.length]], pj = nPid() ? pdById(nPid()) : null;
    /* v73: opened from a project, that project comes first: its quick notes and the notes on its tabs, files and links */
    if (pj) defs.unshift(['__pj', pj.n, notes.filter(function (n) { return n.pid === pj.id; }).length + x6ItemNotes(pj).length]);
    Object.keys(tags).forEach(function (t) { defs.push([t, '#' + t, tags[t]]); });
    if (rem) defs.push(['__rem', 'Reminders', rem]);
    if (!defs.some(function (d) { return d[0] === nf; })) nf = 'all';
    nseg.textContent = '';
    defs.forEach(function (d) {
      var b = el('button'); b.type = 'button'; b.setAttribute('data-f', d[0]); b.setAttribute('aria-pressed', d[0] === nf ? 'true' : 'false');
      b.appendChild(document.createTextNode(d[1] + ' ')); b.appendChild(el('span', 'n', String(d[2]))); nseg.appendChild(b);
    });
    moveThumb(nseg, false);
  }
  function renderList(enterId) {
    dlist.textContent = '';
    var v = visible(), pj = nf === '__pj' && nPid() ? pdById(nPid()) : null, items = pj ? x6ItemNotes(pj) : [];
    if (!v.length && !items.length) {
      var e = el('div', 'dr-empty'); e.appendChild(el('b', '', 'No notes here')); e.appendChild(document.createTextNode('Write one above, or pick another filter.')); dlist.appendChild(e);
    }
    if (pj) v.map(function (n) { return { ts: n.ts || 0, n: n }; }).concat(items.map(function (m) { return { ts: m.ts || 0, m: m }; }))
      .sort(function (a, b) { return b.ts - a.ts; }).forEach(function (r) { dlist.appendChild(r.n ? x6NoteEl(r.n, r.n.id === enterId) : x6ItemNoteEl(pj, r.m)); });
    else v.forEach(function (n) { dlist.appendChild(x6NoteEl(n, n.id === enterId)); });
    document.getElementById('notes-foot').textContent = pj ? 'Showing ' + plural(v.length + items.length) + ' on ' + pj.n : 'Showing ' + plural(v.length) + (nf === 'all' ? '' : ' of ' + notes.length);
    document.getElementById('dn-sub').textContent = plural(notes.length) + ', newest first.';
  }
  function renderNotes(enterId) { renderDash(false, enterId); renderSeg(); renderList(enterId); x6RemSync(); }

  nseg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    nf = b.getAttribute('data-f'); setPressed(nseg, nf); renderList();
    if (openEl === notesDrawer) playStagger(notesDrawer);
  });
  dlist.addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var art = b.closest('.dnote'); if (art.dataset.busy) return;
    var id = +b.getAttribute('data-del');
    var idx = notes.findIndex(function (n) { return n.id === id; });
    if (idx < 0) return;
    art.dataset.busy = '1';
    art.style.maxHeight = art.offsetHeight + 'px'; void art.offsetHeight;
    art.classList.add('leaving');
    var gone = notes[idx];
    setTimeout(function () {
      var k = notes.findIndex(function (n) { return n.id === id; });
      if (k > -1) notes.splice(k, 1);
      renderNotes(); tdRender(); showToast('Note deleted', function () { notes.splice(idx, 0, gone); renderNotes(gone.id); tdRender(); });
    }, reduced ? 0 : 260);
  });
