  /* ================================================================== quick notes: a date, a project, a reminder, a link */
  function x6ParseDay(s) {
    var m = /^(\d{1,2}) ([A-Z][a-z]{2})/.exec(s || ''), mi, y, t; if (!m) return 0;
    mi = X6_MON.indexOf(m[2]); if (mi < 0) return 0;
    y = new Date().getFullYear(); t = new Date(y, mi, +m[1]).getTime();
    if (t - Date.now() > 200 * X6_DAY) t = new Date(y - 1, mi, +m[1]).getTime();
    return t;
  }
  function x6NotesInit() {
    notes.forEach(function (n) {
      if (!n.ts) n.ts = x6ParseDay(n.date) || Date.now();
      if (n.rem && !/^\d{4}-\d\d-\d\d$/.test(n.rem)) { var r = x6ParseDay(n.rem); n.rem = r ? x6Iso(r) : null; }
      if (n.pid == null) n.pid = '';
      if (n.u == null) n.u = '';
    });
  }
  function x6NoteDate(n) { var d = new Date(n.ts || Date.now()); return d.getDate() + ' ' + X6_MON[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function x6NoteDue(n) { return !!n.rem && x6RemAt(n) <= Date.now(); }   /* v73: from the moment it goes off (20-reminders) */
  function x6NoteTags(raw) {
    var tags = [], text = String(raw || '').replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, function (m, sp, t) { t = t.toLowerCase(); if (tags.indexOf(t) < 0) tags.push(t); return sp; }).replace(/[ \t]+\n/g, '\n').trim();
    return { text: text || String(raw || '').trim(), tags: tags };
  }
  function x6NoteNew(o) {
    var n = { id: nextId++, text: o.text, tags: o.tags || [], date: x6NoteDate({ ts: Date.now() }), ts: Date.now(), rem: o.rem || null, pid: o.pid || '', u: o.u || '' };
    notes.unshift(n); return n;
  }
  var X6N = { ed: 0, mv: 0, pid: '' };
  /* v73: Quick notes opened from a project: the project is chosen for a new note, and its notes come first (the filter named after it) */
  function x6NotesOpen() {
    X6N.ed = 0; X6N.mv = 0;
    var p = curView === 'project' && pd.p && PROJECTS.indexOf(pd.p) > -1 ? pd.p : null;
    X6N.pid = p ? p.id : '';
    document.getElementById('note-proj').innerHTML = x6ProjOpts(X6N.pid, 'No project');
    if (p && nf !== '__rem') nf = '__pj';
    renderSeg(); renderList();
  }
  /* the notes on a project's saved tabs, files and links that this person can see, newest first */
  function x6ItemNotes(p) {
    var out = [], add = function (k, list, kind) {
      (list || []).forEach(function (x, i) {
        if (!x || !dvShOpen(x)) return;
        (x.n || []).forEach(function (n) { out.push({ key: k + i, kind: kind, title: x.t || pdHost(x.u), t: n.t, ts: n.ts || 0, by: n.by || '' }); });
      });
    };
    add('t', p.stabs, 'tab'); add('f', p.files, 'file'); add('l', p.ctx, 'link');
    return out.sort(function (a, b) { return b.ts - a.ts; });
  }
  function x6ItemNoteEl(p, m) {
    var a = document.createElement('article'), lbl = { tab: 'Saved tab', file: 'File', link: 'Link' }[m.kind];
    a.className = 'dnote st dn-item';
    a.innerHTML = '<div class="dn-on">' + IC({ tab: 'copy', file: 'doc', link: 'link' }[m.kind]) + '<span>' + esc(lbl) + '</span><b translate="no">' + esc(m.title) + '</b></div>' +
      '<div class="txt">' + esc(m.t) + '</div><span class="nmeta">' + (m.by && m.by !== dvShMe() ? '<span class="nproj">' + esc(x8NameOf(p, m.by)) + '</span>' : '') + '<span>' + esc(x6NoteDate({ ts: m.ts })) + '</span></span>' +
      (m.kind !== 'tab' || x6Ext() ? '<div class="dn-acts"><button type="button" class="link" data-inote="' + m.key + '">Show in the project</button></div>' : '');
    return a;
  }
  /* to the note's own place: the project's Overview, its list open, its notes open */
  function x6ItemNoteGo(key) {
    var p = pdById(X6N.pid); if (!p) return;
    closeDrawer();
    if (!(curView === 'project' && pd.p === p && pd.tab === 'workspace')) openProject(p.id, 'workspace');
    pd.x6ntp = p.id; pd.x6nt = key; pd.x6au = null;
    if (key.charAt(0) === 't') pd.x6tl = true; else if (key.charAt(0) === 'f') pd.x6fl = true;
    pdRerender();
    setTimeout(function () { var n = pdPanel.querySelector('#x6-nt'); if (n) { n.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); var t = n.querySelector('textarea'); if (t) t.focus({ preventScroll: true }); } }, 60);
  }
  function x6NoteEl(n, enter) {
    var a = document.createElement('article');
    a.className = 'dnote' + (enter ? ' enter' : ' st') + (X6N.ed === n.id ? ' editing' : '');
    a.setAttribute('data-nid', n.id);
    if (X6N.ed === n.id) { a.innerHTML = x6NoteForm(n); return a; }
    a.appendChild(el('div', 'txt', n.text)); a.appendChild(metaOf(n));
    var bar = document.createElement('div'); bar.className = 'dn-acts';
    bar.innerHTML = '<button type="button" class="link" data-nact="edit">Edit</button><button type="button" class="link" data-nact="use" aria-expanded="' + (X6N.mv === n.id) + '">Use in a project</button>' +
      (x6NoteDue(n) ? '<button type="button" class="link" data-nact="remdone">Clear reminder</button>' : '');
    a.appendChild(bar);
    if (X6N.mv === n.id) { var mv = document.createElement('div'); mv.className = 'dn-use'; mv.innerHTML = x6UseForm(n); a.appendChild(mv); }
    var x = el('button', 'dnote-x'); x.type = 'button'; x.setAttribute('aria-label', 'Delete note'); x.setAttribute('data-del', n.id); x.appendChild(svgUse('i-x'));
    a.appendChild(x);
    return a;
  }
  function x6NoteForm(n) {
    var raw = n.text + (n.tags.length ? ' ' + n.tags.map(function (t) { return '#' + t; }).join(' ') : '');
    return '<form class="dn-f" data-nform="edit" novalidate><label class="sr-only" for="dn-t-' + n.id + '">Note</label><textarea id="dn-t-' + n.id + '" name="t" rows="3" maxlength="2000">' + esc(raw) + '</textarea>' +
      '<div class="dn-row"><label class="dn-fl"><span>Project</span><span class="pd-sel"><select name="pid">' + x6ProjOpts(n.pid, 'No project') + '</select>' + IC('chev') + '</span></label>' +
      '<span class="dn-fl sm">' + x6RemHTML(n) + '</span></div>' +
      '<label class="dn-fl"><span>Link <em>Optional</em></span><input name="u" value="' + esc(n.u || '') + '" placeholder="https://…" inputmode="url" autocomplete="off"></label>' +
      '<span class="err" role="alert"></span><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-nact="cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save note</button></div></form>';
  }
  var X6_USE = [['later', 'Later', 'Not in scope yet. Decide it later, on purpose.'], ['next', 'Next step', 'The one thing that moves the project now.'], ['dec', 'Decision', 'Write down what was decided, and why.'], ['keep', 'Keep as a note', 'Linked to the project, still in Quick notes.']];
  function x6UseForm(n) {
    return '<form class="dn-f" data-nform="use" novalidate><fieldset class="x6-opts"><legend>Turn it into</legend>' + X6_USE.map(function (o, i) {
      return '<label class="x6-opt"><input type="radio" name="k" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>';
    }).join('') + '</fieldset><label class="dn-fl"><span>Project</span><span class="pd-sel"><select name="pid">' + x6ProjOpts(n.pid, 'Choose a project') + '</select>' + IC('chev') + '</span></label>' +
      '<span class="err" role="alert"></span><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-nact="close">Cancel</button><button type="submit" class="btn-primary btn-sm">Move</button></div></form>';
  }
  function x6NoteById(id) { return notes.filter(function (n) { return n.id === id; })[0]; }
  function x6NoteErr(f, msg, fld) { var e = f.querySelector('.err'); e.textContent = msg; f.setAttribute('data-err', ''); if (fld) f.elements[fld].focus(); }
  function x6NoteSubmit(f) {
    var art = f.closest('[data-nid]'), n = x6NoteById(+art.getAttribute('data-nid')); if (!n) return;
    if (f.getAttribute('data-nform') === 'edit') {
      var tt = x6NoteTags(f.elements.t.value), u = x6Url(f.elements.u.value);
      if (!tt.text) return x6NoteErr(f, 'Write something first.', 't');
      if (u === null) return x6NoteErr(f, 'Enter a full link, like https://example.com/page.', 'u');
      var rr = x6RemRead(f.querySelector('[data-rm]')); if (rr.err) return x6NoteErr(f, rr.err, 'remN');
      var old = JSON.stringify(n);
      n.text = tt.text; n.tags = tt.tags; n.pid = f.elements.pid.value; n.u = u || '';
      if (rr.rem !== (n.rem || null) || (rr.rem && (rr.remT !== (n.remT || '09:00') || rr.remB !== (+n.remB || 0)))) x6RemSet(n, rr);
      X6N.ed = 0; renderNotes(n.id); tdRender(); dbNotif();
      showToast('Note saved', function () { var o = JSON.parse(old), k; ['remT', 'remB', 'remS', 'remA'].forEach(function (q) { delete n[q]; }); for (k in o) n[k] = o[k]; renderNotes(); tdRender(); dbNotif(); });
      return;
    }
    var k = (f.querySelector('input[name="k"]:checked') || {}).value, pid = f.elements.pid.value, p = pdById(pid);
    if (!p) return x6NoteErr(f, 'Choose the project it belongs to.', 'pid');
    X6N.mv = 0;
    if (k === 'keep') { var was = n.pid; n.pid = p.id; renderNotes(n.id); showToast('Linked to ' + p.n, function () { n.pid = was; renderNotes(); }); return; }
    if (k === 'dec') { n.pid = p.id; renderNotes(); closeDrawer(); x6DecFrom(p, n.text); return; }
    var idx = notes.indexOf(n), r = cxApply({ kind: k, pid: p.id, t: n.text, u: n.u });
    if (idx > -1) notes.splice(idx, 1);
    renderNotes(); tdRender();
    showToast(r.msg, function () { r.undo(); notes.splice(Math.min(idx, notes.length), 0, n); renderNotes(n.id); tdRender(); });
  }
  function x6NoteAct(b) {
    var art = b.closest('[data-nid]'), n = art && x6NoteById(+art.getAttribute('data-nid')), a = b.getAttribute('data-nact'); if (!n) return;
    if (a === 'edit') { X6N.ed = n.id; X6N.mv = 0; renderList(); var t = dlist.querySelector('[data-nid="' + n.id + '"] textarea'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
    else if (a === 'cancel') { X6N.ed = 0; renderList(); }
    else if (a === 'use') { X6N.mv = X6N.mv === n.id ? 0 : n.id; X6N.ed = 0; renderList(); var s = dlist.querySelector('[data-nid="' + n.id + '"] .dn-use input'); if (s) s.focus(); }
    else if (a === 'close') { X6N.mv = 0; renderList(); }
    else if (a === 'remdone') { var back = x6RemClear(n); renderNotes(); tdRender(); dbNotif(); showToast('Reminder cleared', function () { back(); renderNotes(); tdRender(); dbNotif(); }); }
  }
  /* a note's decision is written where the project keeps its decisions */
  function x6DecFrom(p, t) {
    if (p.kind === 'private') { openProject(p.id, 'decisions'); pd.pv.preset = { t: x6Cut(t, 90), o: [], typ: 'product', ev: [] }; openDrawer('ndec'); return; }
    pd.x6dec = { t: x6Cut(t, 160) }; openProject(p.id, 'workspace');
    setTimeout(function () { var i = pdPanel.querySelector('.x6-decf textarea[name="b"]'); if (i) { i.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); i.focus({ preventScroll: true }); } }, 120);
  }

  /* ================================================================== Today: up to three things */
  var TD = (function () { var t = SDBOOT.meta('today', null); return t && typeof t === 'object' && Array.isArray(t.items) ? { d: String(t.d || ''), items: t.items.filter(function (x) { return x && typeof x.t === 'string'; }).slice(0, 3), hist: Array.isArray(t.hist) ? t.hist.slice(-28) : [] } : { d: '', items: [], hist: [] }; })();
  var TD_MAX = 3;
  function tdIs(key) { return TD.d === x6Iso() && TD.items.some(function (x) { return x.key === key; }); }
  /* a day that ended is kept as a count (how many were planned, how many were done) for the weekly review */
  function tdClose() {
    if (!TD.d || TD.d === x6Iso() || TD.closed === TD.d) return;
    if (!TD.hist.some(function (h) { return h.d === TD.d; })) TD.hist.push({ d: TD.d, n: TD.items.length, done: TD.items.filter(function (x) { return x.done; }).length });
    TD.hist = TD.hist.slice(-28); TD.closed = TD.d;
  }
  /* v114: a next step not done yet is the project's next step as it is now. It was kept as the words picked, so once the project's
     step changed, Today showed the old one, Add to Today did nothing (it was there already), and checking it left the project's step
     open. One done keeps the words it was done with */
  function tdFollow() {
    var ch = false;
    TD.items.forEach(function (x) { var p = x.k === 'next' && !x.done && x.pid ? pdById(x.pid) : null; if (p && p.next && p.next !== x.t) { x.t = p.next; ch = true; } });
    return ch;
  }
  function tdSrc(x) { return { next: 'Next step', unit: 'Your work', need: 'Needs you', note: 'Reminder', free: 'Your own' }[x.k] || ''; }
  function tdItemHTML(x) {
    var p = x.pid && pdById(x.pid);
    return '<li class="td-i' + (x.done ? ' done' : '') + '"><button type="button" class="td-ck" data-x6="tdck" data-key="' + esc(x.key) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Not done: ' : 'Done: ') + x.t) + '">' + IC('tick') + '</button>' +
      '<div class="td-t"><b>' + esc(x.t) + '</b><small>' + esc([p ? p.n : '', tdSrc(x)].filter(Boolean).join(' · ')) + '</small></div>' +
      ((p || x.k === 'note') && !x.done ? '<button type="button" class="td-go" data-x6="tdgo" data-key="' + esc(x.key) + '" aria-label="Open ' + esc(x.t) + '">' + IC('arrow') + '</button>' : '<span></span>') + '</li>';
  }
  function tdRender() {
    var box = document.getElementById('td-body'); if (!box) return;
    tdClose(); tdFollow();
    var today = TD.d === x6Iso(), left = TD.items.filter(function (x) { return !x.done; }), due = notes.filter(function (n) { return x6NoteDue(n) && !tdIs('note:' + n.id); }), h, calm = false;
    var sub = document.getElementById('td-sub'), dot = document.querySelector('#td-review .td-dot');
    if (dot) dot.hidden = !wrDue();
    if (today && TD.items.length) {
      var d = TD.items.length - left.length;
      sub.textContent = !left.length ? 'All done. Anything else can wait for tomorrow.' : d + ' of ' + TD.items.length + ' done';
      h = '<ol class="td-l">' + TD.items.map(tdItemHTML).join('') + '</ol>';
    } else if (!today && left.length && TD.d) {
      sub.textContent = 'Up to three things that matter most.';
      h = '<div class="td-empty"><span class="td-sun" aria-hidden="true">' + IC('clock') + '</span><div><b>' + left.length + ' left from ' + esc(x6Rel(TD.d)) + '</b><p>' + esc(left.map(function (x) { return '“' + x6Cut(x.t, 48) + '”'; }).join(', ')) + '</p></div>' +
        '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-x6="tdfresh">Start fresh</button><button type="button" class="btn-primary btn-sm" data-x6="tdcarry">Carry over</button></div></div>';
    } else {
      sub.textContent = 'Up to three things that matter most.';
      /* v126: nothing planned yet is one row, not a card head over a row that says the same: the head is hidden (.td.is-calm) and
         the weekly review moves into the row */
      calm = true;
      h = '<div class="td-empty"><span class="td-sun" aria-hidden="true">' + IC('sun') + '</span><div><b>What matters today?</b><p>Pick up to three from your next steps, your work and what needs you. Fewer is fine.</p></div>' +
        '<div class="f-acts"><button type="button" class="link td-wr" data-x6="review">Weekly review' + (wrDue() ? '<i class="td-dot" aria-label="due"></i>' : '') + '</button><button type="button" class="btn-ghost btn-sm" data-x6="plan">Plan today</button></div></div>';
    }
    var sec = document.getElementById('dash-td'); if (sec) sec.classList.toggle('is-calm', calm);
    if (due.length) h += '<button type="button" class="td-rem" data-x6="remopen">' + IC('bell') + '<span>' + (due.length === 1 ? '1 reminder is due: “' + esc(x6Cut(due[0].text, 60)) + '”' : due.length + ' reminders are due') + '</span>' + IC('chev') + '</button>';
    box.innerHTML = h;
    var pb = document.getElementById('td-plan'); if (pb) { pb.textContent = 'Change'; pb.hidden = !(today && TD.items.length); }
  }
  function tdFind(key) { return TD.items.filter(function (x) { return x.key === key; })[0]; }
  /* doing it: a piece of work is marked done, a next step is completed, a reminder is cleared */
  /* v112 (70): what checking an item did, so unchecking it by hand undoes that too (this page only; after a reload it unchecks the item) */
  var TD_UNDO = {};
  function tdCheck(key) {
    tdFollow();
    var x = tdFind(key); if (!x) return;
    if (x.done) { var back = TD_UNDO[key]; delete TD_UNDO[key]; x.done = 0; x.dts = 0; if (back) back(); tdRender(); mwBadge(); if (curView === 'mywork') mwRender(); return; }
    var p = x.pid && pdById(x.pid), undo = null, msg = 'Done: ' + x6Cut(x.t, 50);
    if (x.k === 'unit' && p) {
      var u = wkUnit(p, x.ref);
      if (u && u.st !== 'done') {
        var rv8 = x8Role(p) !== 'Owner', snap = snapOf(p); wkSet(p, u.id, rv8 ? { st: 'review', stk: '', wc: null, sn: u.sn || u.t } : { st: 'done', stk: '', wc: null });
        var un = prvNote(p, 'You set “' + prvT(u.t, 40) + '” to ' + (rv8 ? 'review' : 'done')); wkAfter(p); if (rv8) msg = 'Sent for review: ' + x6Cut(x.t, 50);
        undo = function () { snapBack(p, snap); un(); wkAfter(p); undone(p); };
      }
    } else if (x.k === 'next' && p && p.next === x.t) undo = x6NextDone(p);
    else if (x.k === 'note') { var n = x6NoteById(+x.ref); if (n && n.rem) { var back = x6RemClear(n); renderNotes(); dbNotif(); undo = function () { back(); renderNotes(); dbNotif(); }; } }
    x.done = 1; x.dts = Date.now(); tdRender(); mwBadge();
    if (curView === 'mywork') mwRender();
    if (undo) TD_UNDO[key] = undo;
    showToast(TD.items.every(function (y) { return y.done; }) ? (TD.items.length === TD_MAX ? 'That’s all three. Well done.' : 'That’s all for today. Well done.') : msg, function () { delete TD_UNDO[key]; x.done = 0; x.dts = 0; if (undo) undo(); tdRender(); mwBadge(); });
  }
  function tdGo(key, b) {
    var x = tdFind(key); if (!x) return;
    if (x.k === 'note') { openDrawer('notes', b); return; }
    var p = x.pid && pdById(x.pid); if (!p) return;
    if (x.k === 'unit') openProject(p.id, p.kind === 'client' && p.team.length ? 'team' : 'scope', b);
    else if (x.k === 'need') { openProject(p.id, x.tab || 'workspace', b, x.cr || null); if (x.f) pdGo(x.tab || 'workspace', x.f, x.cr || null); }
    else openProject(p.id, 'workspace', b);
  }
  /* what can be picked: the next step of each project, your open work, what needs you, reminders that are due.
     v127 (CONTRACT 127): Needs you is what Priority attention lists (dbHard), so the two never disagree; the smaller nudges stay on each
     project, and a next step nobody touched for a week says so on its own row. Each row says how urgent it is (tone, lbl); the most
     urgent few lead as Suggested for today and are not listed a second time below */
  var TD_CAP = 3;
  function tdCands() {
    var out = [], nx = [], wk = [], nd = [], rm = [], today = x6Iso();
    x6Order().forEach(function (p) {
      if (!p.next || !x6Live(p)) return;
      var stale = x6NextAge(p) >= 7 * X6_DAY;
      nx.push({ key: 'next:' + p.id, k: 'next', pid: p.id, ref: p.id, t: p.next, tone: stale ? 'warn' : '', lbl: stale ? 'Unchanged for ' + x6Days(Math.floor(x6NextAge(p) / X6_DAY)) : '', rank: stale ? 5 : 6 });
    });
    mwCollect().gs.forEach(function (g) {
      g.open.forEach(function (u) {
        var st = wkShow(u), over = !!u.due && u.due < today, now = u.due === today;
        wk.push({ key: 'unit:' + g.p.id + ':' + u.id, k: 'unit', pid: g.p.id, ref: u.id, t: u.t, due: u.due || '', doing: u.st === 'doing',
          tone: over ? 'crit' : now || st === 'stuck' ? 'warn' : '', lbl: over ? 'Past its date' : now ? 'Due today' : u.due ? 'Due ' + x6Rel(u.due) : st === 'todo' ? '' : WK_NM[st],
          rank: over ? 1 : now ? 2 : u.st === 'doing' ? 4 : 9 });
      });
    });
    wk.sort(function (a, b) { var da = a.due || '9999', db = b.due || '9999'; return da < db ? -1 : da > db ? 1 : (a.doing ? 0 : 1) - (b.doing ? 0 : 1); });
    var seen = {};
    dbItems().filter(dbHard).forEach(function (it) {
      var n = it.n, k = 'need:' + it.p.id + ':' + n.t + (n.cr || ''); if (seen[k]) return; seen[k] = 1;
      /* the Change's code once: as a tag, or not at all when the title has it; and none on a row about several ("about 4 items"), where one code would name only the first */
      var tag = n.cr && n.t.indexOf(n.cr) < 0 && !/ \d+ items$/.test(n.t) ? n.cr : '';
      nd.push({ key: k, k: 'need', pid: it.p.id, ref: '', t: n.t + (tag ? ' · ' + tag : ''), dt: n.t, tag: tag, tab: n.tab || 'workspace', f: n.f || '', cr: n.cr || '',
        tone: n.chip === 'crit' ? 'crit' : n.chip === 'warn' ? 'warn' : '', lbl: n.chipT || 'Action needed', rank: n.chip === 'crit' ? 0 : n.date ? 2 : n.chip === 'warn' ? 3 : 7 });
    });
    notes.forEach(function (n) { if (x6NoteDue(n)) rm.push({ key: 'note:' + n.id, k: 'note', pid: n.pid || '', ref: String(n.id), t: x6Cut(n.text, 90), tone: 'warn', lbl: 'Reminder' + (n.rem < x6Iso() ? ' since ' + x6Lbl(n.rem) : ' for today') }); });
    /* Suggested for today: what is overdue, due or in hand first, then the next steps of the projects you opened last */
    var sug = nd.concat(wk, nx).filter(function (x) { return x.rank < 6; }).sort(function (a, b) { return a.rank - b.rank; }).slice(0, TD_MAX);
    nx.forEach(function (x) { if (sug.length < TD_MAX && sug.indexOf(x) < 0) sug.push(x); });
    var rest = function (l) { return l.filter(function (x) { return sug.indexOf(x) < 0; }); };
    if (sug.length) out.push({ g: 'Suggested for today', id: 'sug', items: sug });
    if (rm.length) out.push({ g: 'Reminders', id: 'rem', items: rm });
    [['Next steps', 'next', nx, 'No project has a next step yet.'], ['Your work', 'work', wk, 'Nothing is assigned to you.'], ['Needs you', 'needs', nd, 'Nothing needs you.']].forEach(function (d) {
      var l = rest(d[2]); if (d[2].length && !l.length) return;   /* all of it is in Suggested */
      out.push({ g: d[0], id: d[1], items: l, e: d[3], cap: TD_CAP, byProject: d[1] === 'work' });
    });
    return out;
  }
  var TDP = { sel: [], extra: [], open: {} };
  function tdOnOpen() {
    tdFollow();
    var mine = TD.d === x6Iso() ? TD.items : [];
    TDP.sel = mine.map(function (x) { return x.key; }); TDP.extra = mine.filter(function (x) { return x.k === 'free'; }).map(function (x) { return x; }); TDP.open = {};
    tdPaint();
    return '.td-p input';
  }
  function tdMark(p) { return '<span class="pj-av' + (p.kind === 'client' ? '' : ' priv') + '" aria-hidden="true">' + esc(p.m) + '</span>'; }
  /* the line under a row: the project by its short name with its mark, then how urgent it is; inside a project's own block, only the latter */
  function tdSubHTML(x, inProject) {
    var p = !inProject && x.pid ? pdById(x.pid) : null, h = '';
    if (p) h += '<span class="td-pn">' + tdMark(p) + '<span>' + esc(sideName(p)) + '</span></span>';
    else if (!inProject && x.k === 'free') h += '<span class="td-pn">No project</span>';
    if (x.lbl) h += '<span class="td-st' + (x.tone ? ' ' + x.tone : '') + '">' + esc(x.lbl) + '</span>';
    return h ? '<small>' + h + '</small>' : '';
  }
  /* a picked row shows its place in the day (1, 2, 3) in its box */
  function tdPick(x, inProject) {
    var i = TDP.sel.indexOf(x.key), on = i > -1, full = TDP.sel.length >= TD_MAX && !on;
    return '<li class="td-p st' + (on ? ' on' : '') + '"><label><input type="checkbox" value="' + esc(x.key) + '"' + (on ? ' checked' : '') + (full ? ' disabled' : '') + '><span class="td-pb" aria-hidden="true">' + (on ? i + 1 : '') + '</span>' +
      '<span class="td-pt"><b>' + (x.tag ? '<span class="td-cr">' + esc(x.tag) + '</span>' : '') + esc(x.dt || x.t) + '</b>' + tdSubHTML(x, inProject) + '</span></label></li>';
  }
  /* Your work, by project: the project's name once over its rows */
  function tdByProject(list) {
    var order = [], by = {};
    list.forEach(function (x) { if (!by[x.pid]) { by[x.pid] = []; order.push(x.pid); } by[x.pid].push(x); });
    return order.map(function (id) {
      var p = pdById(id); if (!p) return '';
      return '<div class="td-pj"><div class="td-pjh">' + tdMark(p) + '<span>' + esc(sideName(p)) + '</span></div><ul>' + by[id].map(function (x) { return tdPick(x, true); }).join('') + '</ul></div>';
    }).join('');
  }
  function tdPaint() {
    var body = document.getElementById('td-dbody'), groups = tdCands(), h = '';
    var at = document.getElementById('td-at'), ap = document.getElementById('td-ap'), keep = at ? { t: at.value, p: ap.value } : null;
    if (TDP.extra.length) groups.unshift({ g: 'Your own', id: 'own', items: TDP.extra.map(function (x) { return { key: x.key, k: 'free', t: x.t, pid: x.pid && pdById(x.pid) ? x.pid : '' }; }) });
    /* v127: your own first, as one line; it was the last thing in a long list */
    h += '<form class="td-add st" id="td-add" novalidate><div class="td-ar"><label class="sr-only" for="td-at">Something else for today</label><span class="td-in">' + IC('plus') + '<input id="td-at" maxlength="120" placeholder="Add something of your own" autocomplete="off"></span>' +
      '<span class="pd-sel"><select id="td-ap" aria-label="Project">' + x6ProjOpts('', 'No project') + '</select>' + IC('chev') + '</span><button type="submit" class="btn-ghost btn-sm">Add</button></div></form>';
    groups.forEach(function (g) {
      var all = g.items, show = all;
      if (g.cap && !TDP.open[g.id] && all.length > g.cap) show = all.filter(function (x, i) { return i < g.cap || TDP.sel.indexOf(x.key) > -1; });
      var more = all.length - show.length;
      h += '<section class="td-g' + (g.id === 'sug' ? ' td-sug' : '') + '" data-g="' + g.id + '"><h3>' + esc(g.g) + '</h3>' +
        (all.length ? (g.byProject ? tdByProject(show) : '<ul>' + show.map(function (x) { return tdPick(x); }).join('') + '</ul>') + (more > 0 ? '<button type="button" class="td-more" data-x6="tdmore" data-g="' + g.id + '">Show ' + more + ' more</button>' : '') : '<p class="td-none">' + esc(g.e || '') + '</p>') + '</section>';
    });
    body.innerHTML = h;
    if (keep) { document.getElementById('td-at').value = keep.t; document.getElementById('td-ap').value = keep.p; }
    tdTray();
  }
  /* the foot: three places for the day, filled in the order they were picked */
  function tdTray() {
    var n = TDP.sel.length, all = tdAllCands(), tray = document.getElementById('td-tray'), h = '';
    for (var i = 0; i < TD_MAX; i++) {
      var k = TDP.sel[i], x = k ? all[k] || tdFind(k) : null;
      h += '<li' + (x ? ' class="on"' : '') + '><span class="n">' + (i + 1) + '</span>' + (x ? '<span class="t">' + esc(x.dt || x.t) + '</span>' : '') + '</li>';
    }
    if (tray) { tray.innerHTML = h; tray.hidden = !n; }   /* nothing picked: one quiet line, not three empty places */
    var hint = document.getElementById('td-hint'); if (hint) hint.hidden = !!n;
    document.getElementById('td-dcount').textContent = n + ' of ' + TD_MAX + ' picked' + (n >= TD_MAX ? ' · uncheck one to swap' : '');
    var set = document.getElementById('td-set'); if (set) set.disabled = !n && !(TD.d === x6Iso() && TD.items.length);
  }
  /* Show more: that group in full, and the first row it adds gets the focus */
  function tdMore(id) {
    TDP.open[id] = 1;
    var body = document.getElementById('td-dbody'), y = body.scrollTop; tdPaint(); body.scrollTop = y;
    var r = body.querySelectorAll('[data-g="' + id + '"] li.td-p input')[TD_CAP]; if (r) r.focus({ preventScroll: true });
  }
  function tdAllCands() { var m = {}; tdCands().forEach(function (g) { g.items.forEach(function (x) { m[x.key] = x; }); }); TDP.extra.forEach(function (x) { m[x.key] = x; }); return m; }
  function tdSet() {
    var all = tdAllCands(), old = JSON.stringify(TD), items = [];
    TDP.sel.forEach(function (k) {
      var x = all[k] || tdFind(k); if (!x) return;
      var was = TD.d === x6Iso() ? tdFind(k) : null;
      items.push({ key: x.key, k: x.k, pid: x.pid || '', ref: x.ref || '', t: x.t, tab: x.tab || '', f: x.f || '', cr: x.cr || '', done: was ? was.done : 0, dts: was ? was.dts : 0 });
    });
    tdClose(); TD.d = x6Iso(); TD.items = items.slice(0, TD_MAX);
    closeDrawer(); tdRender();
    showToast(items.length ? 'Today is set. Start with “' + x6Cut(items[0].t, 40) + '”.' : 'Today is clear.', function () { var o = JSON.parse(old); TD.d = o.d; TD.items = o.items; TD.hist = o.hist; tdRender(); });
  }
  function tdCarry(fresh) {
    var old = JSON.stringify(TD);
    tdClose(); TD.d = x6Iso(); TD.items = fresh ? [] : TD.items.filter(function (x) { return !x.done; }).slice(0, TD_MAX);
    tdRender();
    if (fresh) { showToast('A fresh day', function () { var o = JSON.parse(old); TD.d = o.d; TD.items = o.items; tdRender(); }); openDrawer('today'); }
    else showToast(TD.items.length + (TD.items.length === 1 ? ' thing carried' : ' things carried') + ' over to today', function () { var o = JSON.parse(old); TD.d = o.d; TD.items = o.items; tdRender(); });
  }

