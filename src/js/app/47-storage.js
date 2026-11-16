  /* ---------- storage ----------
     Your data is counted from what is on screen, record by record, the same way it is saved. The browser's own figures come from
     navigator.storage; they include everything this page keeps (fonts, caches), so they are always a little more than your data. */
  var sto = { est: null, persisted: null, tok: 0 };
  function stoBytes(a) { try { return JSON.stringify(a, SDB.strip).length; } catch (e) { return 0; } }
  function stoParts() {
    return [['Projects', PROJECTS.length, stoBytes(PROJECTS), 'project'], ['Clients', CLIENTS.length, stoBytes(CLIENTS), 'client'], ['Notes', notes.length, stoBytes(notes), 'note'], ['Team', TEAM.length, stoBytes(TEAM), 'person']];
  }
  function stoPaint() {
    var body = pfId('sto-body'), parts, total, h = '', est = sto.est, s = SDB.S, rm = drRoom(), bar = '', leg = '', live = s.mode === 'idb' && !s.why;
    if (!body) return;
    parts = stoParts(); total = parts.reduce(function (n, x) { return n + x[2]; }, 0) || 1;
    parts.forEach(function (x, i) {
      var pc = x[2] / total * 100;
      bar += '<i class="k' + i + '" style="width:' + pc.toFixed(2) + '%"></i>';
      leg += '<li><i class="k' + i + '"></i><span>' + x[0] + '</span><small>' + x[1] + ' ' + (x[1] === 1 ? x[3] : x[3] === 'person' ? 'people' : x[3] + 's') + '</small><b>' + drSize(x[2]) + '</b></li>';
    });
    h += '<div class="sto-sec"><div class="sto-h"><b>On this device</b><span>' + (live ? 'Saved in this browser' : 'Not being saved') + '</span></div>' +
      '<div class="sto-fig"><span class="sto-n">' + drSize(total) + '</span><span class="sto-of">your data' + (est && est.quota ? ' · the browser allows up to ' + drSize(est.quota) : '') + '</span></div>' +
      '<div class="sto-seg" role="img" aria-label="' + esc(parts.map(function (x) { return x[0] + ' ' + drSize(x[2]); }).join(', ')) + '">' + bar + '</div><ul class="sto-leg">' + leg + '</ul>' +
      '<dl class="cd-dl sto-dl">' + (est && est.usage != null ? '<div><dt>Browser storage in use</dt><dd>' + esc(drSize(est.usage)) + '<small>fonts and caches included</small></dd></div>' : '') +
      '<div><dt>Last saved</dt><dd>' + esc(ldWhen()) + '</dd></div>' +
      (sto.persisted === true ? '<div><dt>Cleanup</dt><dd>Protected from automatic cleanup</dd></div>' : sto.persisted === false ? '<div><dt>Cleanup</dt><dd>The browser may clear it when the disk is low <button type="button" class="link" data-sto="persist">Keep my data</button></dd></div>' : '') + '</dl></div>';
    /* Drive appears here once it is connected; connecting it is the Google Drive tab's job */
    if (DR.st === 'on') h += '<div class="sto-sec"><div class="sto-h"><b>Google Drive</b><span>' + esc(DR.email) + '</span></div>';
    if (DR.st === 'on' && rm) {
      h += '<div class="sto-fig"><span class="sto-n">' + drSize(rm.used) + '</span><span class="sto-of">' + (rm.limit ? 'of ' + drSize(rm.limit) + ' used · ' + drSize(Math.max(0, rm.limit - rm.used)) + ' free' : 'used · your account has no limit') + '</span></div>' +
        (rm.limit ? drBar(rm.used, rm.limit, drSize(rm.used) + ' of ' + drSize(rm.limit) + ' used') : '') +
        '<p class="sto-p">This is the whole Google account, not only what ScopeDue puts there.' + (DR.msg ? ' ' + esc(DR.msg) : '') + '</p>';
    } else if (DR.st === 'on') h += '<p class="sto-p">Checking your Drive…</p>';
    if (DR.st === 'on') h += '</div>';
    if (body._h !== h) { body._h = h; body.innerHTML = h; }
  }
  function stoEnter() {
    var tok = ++sto.tok, jobs = [];
    stoPaint();
    if (navigator.storage && navigator.storage.estimate) jobs.push(navigator.storage.estimate().then(function (e) { sto.est = e; }, function () { sto.est = null; }));
    if (navigator.storage && navigator.storage.persisted) jobs.push(navigator.storage.persisted().then(function (v) { sto.persisted = v; }, function () { sto.persisted = null; }));
    Promise.all(jobs).then(function () { if (tok === sto.tok) stoPaint(); });
    if (DR.st === 'on' && !DR.proto && !DR.busy && Date.now() - DR.at > 60000) drRefresh(false);
  }
  pfId('sto-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sto]'), a;
    if (!b) return;
    a = b.getAttribute('data-sto');
    if (a === 'drive') stTab('drive', true);
    else if (a === 'persist') {
      try {
        navigator.storage.persist().then(function (ok) {
          sto.persisted = !!ok; stoPaint();
          showToast(ok ? 'Your browser will keep ScopeDue data' : 'The browser did not agree. Export a copy to be safe.');
        }, function () { showToast('The browser did not agree. Export a copy to be safe.'); });
      } catch (x) { showToast('This browser cannot do that.'); }
    }
  });
  pfId('sto-refresh').addEventListener('click', function () { sto.est = null; stoEnter(); });
  /* the numbers move with the work: while the tab is open, say them again when the data has been saved */
  SDB.on(function () { if (stCur === 'storage' && curView === 'settings') { stoPaint(); ldPaint(); } });

