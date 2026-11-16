  /* ================================================================== start */
  function x6Init() {
    x6NotesInit(); tdRender();
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x6]'); if (!b) return;
      var a = b.getAttribute('data-x6'), pid = b.getAttribute('data-pid');
      e.preventDefault();
      if (a === 'plan') openDrawer('today', b);
      else if (a === 'review') openDrawer('review', b);
      else if (a === 'tdck') tdCheck(b.getAttribute('data-key'));
      else if (a === 'tdgo') tdGo(b.getAttribute('data-key'), b);
      else if (a === 'tdmore') tdMore(b.getAttribute('data-g'));
      else if (a === 'tdcarry') tdCarry(false);
      else if (a === 'tdfresh') tdCarry(true);
      else if (a === 'remopen') { nf = '__rem'; openDrawer('notes', b); renderNotes(); }
      else if (a === 'wropen') { closeDrawer(); openProject(pid, 'workspace'); }
      else if (a === 'wrnext') { closeDrawer(); openProject(pid, 'workspace'); pdEditStart('next'); }
      else if (a === 'wrideas') { var wp = pdById(pid); closeDrawer(); if (wp && wp.kind === 'private') { openProject(pid, 'scope'); pdGo('scope', 'tri'); } else { openProject(pid, 'workspace'); var lc = document.getElementById('x6-later'); if (lc) lc.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } }
      else if (a === 'wrdone') wrDone();
    });
    document.getElementById('td-dbody').addEventListener('change', function (e) {
      var c = e.target; if (c.type !== 'checkbox') return;
      var i = TDP.sel.indexOf(c.value);
      if (c.checked && i < 0 && TDP.sel.length < TD_MAX) TDP.sel.push(c.value); else if (!c.checked && i > -1) TDP.sel.splice(i, 1);
      var y = document.getElementById('td-dbody').scrollTop; tdPaint(); document.getElementById('td-dbody').scrollTop = y;
      var again = document.querySelector('#td-dbody input[value="' + CSS.escape(c.value) + '"]'); if (again) again.focus({ preventScroll: true });
    });
    document.getElementById('td-dbody').addEventListener('submit', function (e) {
      e.preventDefault(); var t = document.getElementById('td-at'), v = t.value.replace(/\s+/g, ' ').trim(); if (v.length < 2) { t.focus(); return; }
      var x = { key: 'free:' + x6Id(''), k: 'free', pid: document.getElementById('td-ap').value, ref: '', t: x6Cut(v, 120) };
      TDP.extra.push(x); if (TDP.sel.length < TD_MAX) TDP.sel.push(x.key);
      tdPaint(); document.getElementById('td-at').focus();
    });
    document.getElementById('td-set').addEventListener('click', tdSet);
    document.getElementById('drawer-today').addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); tdSet(); } });
    document.getElementById('cx-f').addEventListener('submit', function (e) { e.preventDefault(); cxSubmit(); });
    document.getElementById('cx-f').addEventListener('change', function (e) { if (e.target.name === 'cx-k') CXS.k = e.target.value; cxForm.removeAttribute('data-err'); cxPaint(); });
    document.getElementById('drawer-grab').addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); cxSubmit(); } });
    dlist.addEventListener('click', function (e) { var b = e.target.closest('[data-nact]'); if (b) { e.preventDefault(); x6NoteAct(b); return; } var g = e.target.closest('[data-inote]'); if (g) { e.preventDefault(); x6ItemNoteGo(g.getAttribute('data-inote')); } });
    dlist.addEventListener('submit', function (e) { var f = e.target.closest('[data-nform]'); if (!f) return; e.preventDefault(); x6NoteSubmit(f); });
    dlist.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (X6N.ed || X6N.mv)) { e.stopPropagation(); X6N.ed = 0; X6N.mv = 0; renderList(); } if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { var f = e.target.closest('[data-nform]'); if (f) { e.preventDefault(); x6NoteSubmit(f); } } });
    document.getElementById('note-proj').innerHTML = x6ProjOpts('', 'No project');
    document.getElementById('note-remw').innerHTML = x6RemHTML(null); x6RemInit();   /* v73: a day, a time, how long before */
    setInterval(function () { cxPublish(); if (TD.d && TD.d !== x6Iso()) tdRender(); }, 4000);
    if (sdTest()) window.__x6 = { td: function () { return JSON.parse(JSON.stringify(TD)); }, wr: function () { return JSON.parse(JSON.stringify(WR)); }, notes: function () { return JSON.parse(JSON.stringify(notes)); }, apply: function (c) { return cxApply(c).msg; }, raw: function (id) { var p = pdById(id); return p ? JSON.parse(JSON.stringify(p, function (k, v) { return k === 'q' || k === 'mevq' ? undefined : v; })) : null; }, ingest: cxIngest, publish: function () { cxLast = ''; cxPublish(); } };
    if (cxExt()) {
      cxPublish();
      try { chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.sdInbox && ch.sdInbox.newValue && ch.sdInbox.newValue.length) cxIngest(); }); } catch (e) {}
      setTimeout(cxIngest, 300);
      SDB.on(function (s) { if (cxLeft && !cxBusy && !s.stale && !s.fail) cxIngest(); });   /* saving works again: what stayed queued leaves it */
    }
  }

