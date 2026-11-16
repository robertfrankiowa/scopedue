  /* ================================================================== capture: one way in, from the app or from any web page */
  var CX_KIND = { note: 'Note', link: 'Link', later: 'Later', next: 'Next step' };
  /* c: { kind, pid, t (text), u (address), title }. Returns { msg, undo } */
  function cxApply(c) {
    var p = c.pid ? pdById(c.pid) : null, u = c.u ? (x6Url(c.u) || '') : '', t = String(c.t || '').replace(/[ \t]+/g, ' ').trim() || String(c.title || '').trim() || u, k = c.kind;
    if (k === 'gh' && p && c.ref && x9Parse(c.u)) return x9Cx(c, p);
    if (k === 'tabs' && p) return cxTabs(c, p);
    if (!p || k === 'note' || !CX_KIND[k]) {
      var tt = x6NoteTags(t), n = x6NoteNew({ text: x6Cut(tt.text, 2000), tags: tt.tags, pid: p ? p.id : '', u: u });
      renderNotes(n.id); if (p && pd.p === p && curView === 'project') pdRerender();
      return { msg: p ? 'Saved as a note on ' + p.n : 'Saved to Quick notes', undo: function () { var i = notes.indexOf(n); if (i > -1) notes.splice(i, 1); renderNotes(); if (p && pd.p === p) pdRerender(); } };
    }
    var rec, extra = null, oldUpd = p.upd, oldT = p.updT;
    if (k === 'link') {
      if (!u) return cxApply({ kind: 'note', pid: p.id, t: t });
      var item = { k: 'link', t: x6Cut(c.title || t || pdHost(u), 60), u: u, fresh: true };
      p.ctx.unshift(item); rec = pdNote(p, 'You saved a link: ' + prvT(item.t, 40));
      extra = function () { var i = p.ctx.indexOf(item); if (i > -1) p.ctx.splice(i, 1); };
    } else if (k === 'later') {
      if (p.kind === 'private') {
        var snap = prvSnap(p), idea = prvIdea(x6Cut(t, 140), '', '', 0); idea.ts = Date.now(); idea.lg[0].ts = idea.ts; if (u) idea.u = u;
        p.pv.park.unshift(idea);
        var un = prvNote(p, 'You parked an idea', snap); prvAfter(p);
        dbRecent(); tdRender();
        return { msg: 'Parked in ' + p.n + '. It is not in Now until it passes the Gate.', undo: function () { snapBack(p, snap); un(); prvAfter(p); undone(p); } };
      }
      var x = { id: x6Id('l'), t: x6Cut(t, 140), u: u, ts: Date.now(), st: 'open', cr: '' };
      (p.later = p.later || []).unshift(x); rec = pdNote(p, 'You put “' + prvT(x.t, 40) + '” in Later');
      extra = function () { var i = p.later.indexOf(x); if (i > -1) p.later.splice(i, 1); };
    } else if (k === 'next') {
      var old = { next: p.next, nextAt: p.nextAt, nextU: p.nextU || '', nextTs: p.nextTs || 0 };
      p.next = x6Cut(t, 200); p.nextAt = 'just now'; p.nextU = ''; p.nextTs = Date.now();
      rec = pdNote(p, 'You set the next step: ' + prvT(p.next, 50));
      extra = function () { var q; for (q in old) p[q] = old[q]; };
    }
    pdTouch(p); x6After(p);
    return { msg: 'Saved to ' + p.n + ' · ' + CX_KIND[k], undo: function () { extra(); pdUnnote(p, rec); p.upd = oldUpd; p.updT = oldT; x6After(p); undone(p); } };
  }
  /* v112 (71): the open tabs the side panel ticked, added to the project's saved tabs as yours, Only me. An address already there
     is skipped; nothing already saved is replaced (unlike Save open tabs, which renews your Only me tabs) */
  function cxTabs(c, p) {
    var cur = x6Stabs(p), old = x8Clone(cur), who = dvShMe(), now = Date.now(), have = {};
    cur.forEach(function (x) { if (dvShOpen(x) && x.u) have[x.u.split('#')[0]] = 1; });
    var add = (Array.isArray(c.l) ? c.l : []).map(function (x) { return { t: String((x && x.t) || '').trim(), u: x && x6Url(x.u) }; })
      .filter(function (x) { if (!x.u || !/^https?:/i.test(x.u) || have[x.u.split('#')[0]]) return false; return (have[x.u.split('#')[0]] = 1); })
      .slice(0, 40).map(function (x) { return { id: x6Id('s'), t: (x.t || pdHost(x.u)).slice(0, 120), u: x.u, ts: now, by: who, aud: 'me' }; });
    if (!add.length) return { msg: 'Those tabs were already saved in ' + p.n };
    p.stabs = cur.concat(add);
    var note = pdNote(p, 'You saved ' + add.length + (add.length === 1 ? ' tab' : ' tabs')); pdTouch(p); x6After(p);
    if (pd.p === p && curView === 'project') pdRerender();
    return { msg: add.length + (add.length === 1 ? ' tab saved' : ' tabs saved') + ' to ' + p.n, undo: function () { p.stabs = old; pdUnnote(p, note); x6After(p); undone(p, 'workspace'); } };
  }
  /* the in-app capture drawer */
  var cxForm = null, CXS = { k: 'note' };
  function cxOnOpen() {
    cxForm = document.getElementById('cx-f');
    cxForm.reset(); cxForm.removeAttribute('data-err');
    var cur = curView === 'project' && pd.p ? pd.p.id : '';
    document.getElementById('cx-p').innerHTML = x6ProjOpts(cur, 'No project · Quick notes');
    CXS.k = cur ? 'later' : 'note'; cxPaint();
    return '#cx-t';
  }
  function cxPaint() {
    [].forEach.call(document.querySelectorAll('#cx-k input'), function (r) { r.checked = r.value === CXS.k; });
    var pid = document.getElementById('cx-p').value, hint = document.getElementById('cx-h');
    hint.textContent = !pid ? 'Without a project it goes to Quick notes.' : CXS.k === 'link' ? 'Added to the project’s Working context.' : CXS.k === 'later' ? (pdById(pid) && pdById(pid).kind === 'private' ? 'Parked. It reaches Now only through the Scope Gate.' : 'Kept in Later. Nothing is promised to the client.') : CXS.k === 'next' ? 'Replaces the project’s next step.' : 'A note linked to the project.';
  }
  function cxSubmit() {
    var t = document.getElementById('cx-t').value.trim(), uRaw = document.getElementById('cx-u').value, u = x6Url(uRaw), pid = document.getElementById('cx-p').value, k = CXS.k, e = document.getElementById('cx-e');
    var bad = function (m, id) { e.textContent = m; cxForm.setAttribute('data-err', ''); document.getElementById(id).focus(); };
    if (u === null) return bad('Enter a full link, like https://example.com/page, or leave it empty.', 'cx-u');
    if (!t && !u) return bad('Write something, or paste a link.', 'cx-t');
    if ((k === 'later' || k === 'next' || k === 'link') && !pid) return bad('Choose the project it belongs to.', 'cx-p');
    if (k === 'link' && !u) return bad('A link needs an address.', 'cx-u');
    var r = cxApply({ kind: k, pid: pid, t: t, u: u || '', title: k === 'link' ? t : '' });
    closeDrawer(); showToast(r.msg, r.undo);
  }
  /* from the extension: the side panel leaves captures in chrome.storage; the app files them, once, in whichever tab is open */
  function cxExt() { try { return typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id); } catch (e) { return false; } }
  /* A capture leaves the queue only once this tab has written it to the saved data. A tab in the background has no save tick
     (store.js), so it is saved here, at once: before, the queue was emptied while the capture lived in memory only, and it was
     lost when another tab saved first. If the save does not go through (this tab is behind, or the browser is full) the capture
     stays queued for another tab, or for this one when saving works again; cxDone keeps it from being filed here twice */
  var cxBusy = false, cxDone = {}, cxLeft = false;
  function cxIngest() {
    if (!cxExt() || cxBusy || !SDB.S || SDB.S.stale) return;
    var run = function () {
      return new Promise(function (res) {
        chrome.storage.local.get('sdInbox', function (r) {
          var l = (r && r.sdInbox) || [], msgs = [], ids = {};
          l.forEach(function (c) { if (!c || !c.id) return; ids[c.id] = 1; if (cxDone[c.id]) return; cxDone[c.id] = 1; try { msgs.push(cxApply(c).msg); } catch (e) { msgs.push('Saved from the web'); } });
          if (!l.length) return res();
          if (msgs.length) showToast(msgs.length === 1 ? msgs[0] : msgs.length + ' things saved from the web');
          Promise.resolve(SDB.save()).then(function () {
            var s = SDB.S;
            if (s.mode === 'idb' && (s.stale || s.fail)) { cxLeft = true; return res(); }
            cxLeft = false;
            chrome.storage.local.get('sdInbox', function (r2) { chrome.storage.local.set({ sdInbox: ((r2 && r2.sdInbox) || []).filter(function (c) { return !c || !ids[c.id]; }) }, function () { res(); }); });
          }, function () { cxLeft = true; res(); });
        });
      });
    };
    cxBusy = true;
    var p = navigator.locks && navigator.locks.request ? navigator.locks.request('sd-inbox', run) : run();
    p.then(function () { cxBusy = false; }, function () { cxBusy = false; });
  }
  var cxLast = '';
  function cxPublish() {
    if (!cxExt()) return;
    var l = x6Order().filter(x6Live).map(function (p) { var o = { id: p.id, n: p.n, m: p.m, k: p.kind, mode: pdMode(p), w: x8Role(p) === 'Viewer' ? [] : x9Pub(p), tu: x6Stabs(p).filter(function (x) { return dvShOpen(x) && x.u; }).map(function (x) { return x.u; }).slice(0, 80) };   /* v112 (71): tu, the saved tabs, so the panel leaves them unticked */ if (typeof XA !== 'undefined' && XA && XA.sample && (XA.sample.p || []).indexOf(p.id) > -1) o.s = 1; return o; }), j = JSON.stringify(l);   // s: a sample project, translated in the side panel too (v68)
    if (j === cxLast) return; cxLast = j;
    try { chrome.storage.local.set({ sdProjects: l }); } catch (e) {}
  }

  /* ================================================================== the weekly review */
  var WR = (function () { var w = SDBOOT.meta('review', null); return w && typeof w === 'object' ? { last: +w.last || 0, first: +w.first || Date.now() } : { last: 0, first: Date.now() }; })();
  function wrDue() { return Date.now() - (WR.last || WR.first) >= 7 * X6_DAY || (!WR.last && new Date().getDay() === 5 && PROJECTS.some(x6Live)); }
  /* v128 (CONTRACT 128): a row is the whole button; the project by its short name with its mark, what to do said on hover, an arrow */
  function wrRow(p, sub, x6, label, extra) {
    return '<li class="wr-r st"><button type="button" class="wr-go" data-x6="' + x6 + '" data-pid="' + esc(p.id) + '" title="' + esc(p.n) + '">' + tdMark(p) +
      '<span class="grow"><b>' + esc(sideName(p)) + '</b><small>' + sub + '</small>' + (extra || '') + '</span><span class="wr-act">' + esc(label) + '</span>' + IC('chev') + '</button></li>';
  }
  function wrSec(title, n, body, empty) { return '<section class="wr-s"><h3>' + title + (n === null ? '' : ' <span>' + n + '</span>') + '</h3>' + (body || '<p class="td-none">' + empty + '</p>') + '</section>'; }
  var WR_DONE = /“.*” to done$| approved “/;   /* what a log line says when a piece of work was finished */
  function wrOnOpen() {
    var now = Date.now(), wk = now - 7 * X6_DAY, live = PROJECTS.filter(x6Live), h = '', td = x6Iso();
    /* the week: what was planned for Today and finished, where the activity was, and how much work was done */
    var days = TD.hist.filter(function (d) { return x6Ts(d.d) >= wk; }), plan = 0, did = 0;
    days.forEach(function (d) { plan += d.n; did += d.done; });
    if (TD.d === x6Iso()) { plan += TD.items.length; did += TD.items.filter(function (x) { return x.done; }).length; }
    var done = 0, act = live.map(function (p) {
      var l = (p.log || []).filter(function (e) { return e.ts && e.ts >= wk; });
      l.forEach(function (e) { if (WR_DONE.test(e.t || '')) done++; });
      return { p: p, n: l.length };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
    var fig = function (n, of, lbl, zero) { return '<div' + (zero ? ' class="is-zero"' : '') + '><b>' + n + (of !== null ? '<span>/' + of + '</span>' : '') + '</b><small>' + lbl + '</small></div>'; };
    var max = act.length ? act[0].n : 1;
    h += wrSec('Your week', null, '<div class="wr-k">' +
      (plan ? fig(did, plan, 'Today items done', !did) : '<div class="is-zero is-empty"><small>No days planned</small></div>') +   /* no number to show: the words alone */
      fig(act.length, null, act.length === 1 ? 'Project moved' : 'Projects moved', !act.length) +
      fig(done, null, done === 1 ? 'Piece of work done' : 'Pieces of work done', !done) + '</div>' +
      (act.length ? '<ul class="wr-l">' + act.slice(0, 4).map(function (x) {
        return wrRow(x.p, esc(x.n + (x.n === 1 ? ' change' : ' changes') + ' this week'), 'wropen', 'Open', '<span class="wr-bar" aria-hidden="true"><i style="width:' + Math.max(6, Math.round(x.n / max * 100)) + '%"></i></span>');
      }).join('') + '</ul>' : '<p class="td-none">Nothing was logged this week.</p>'), '');
    /* what is coming, before what can wait: a deadline in five days matters more than ideas in the Parking Lot */
    var soon = [], end = x6Iso(now + 7 * X6_DAY);
    live.forEach(function (p) {
      if (p.dueAt) { var di = x6Iso(p.dueAt); if (di >= td && di <= end) soon.push({ d: di, t: 'Project deadline', p: p }); }
      if (p.kind === 'client' && agV2(p)) agM(p).ms.forEach(function (m) { if (m.st !== 'accepted' && m.eff >= td && m.eff <= end) soon.push({ d: m.eff, t: m.t + ' is due', p: p }); });
    });
    notes.forEach(function (n) { if (n.rem && n.rem > td && n.rem <= end) soon.push({ d: n.rem, t: 'Reminder: ' + x6Cut(n.text, 50), p: pdById(n.pid) }); });
    soon.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    h += wrSec('Coming up in 7 days', soon.length, soon.length ? '<ul class="wr-l">' + soon.map(function (s) {
      var k = Math.round((x6Ts(s.d) - x6Ts(td)) / X6_DAY), rel = k <= 0 ? 'Today' : k === 1 ? 'Tomorrow' : 'In ' + k + ' days', hot = k <= 2;
      var inner = '<span class="wr-d">' + esc(x6Lbl(s.d, true)) + '</span><span class="grow"><b>' + esc(s.t) + '</b><small>' + (s.p ? '<span class="td-pn">' + tdMark(s.p) + '<span>' + esc(sideName(s.p)) + '</span></span>' : '<span>Quick notes</span>') + '<span class="td-st' + (hot ? ' warn' : '') + '">' + rel + '</span></small></span>';
      return '<li class="wr-r st">' + (s.p ? '<button type="button" class="wr-go" data-x6="wropen" data-pid="' + esc(s.p.id) + '" title="' + esc(s.p.n) + '">' + inner + '<span class="wr-act">Open</span>' + IC('chev') + '</button>' : '<div class="wr-go">' + inner + '</div>') + '</li>';
    }).join('') + '</ul>' : '', 'Nothing is due in the next 7 days.');
    /* Needs a look: a project gone quiet and a next step gone old were two lists that named the same projects; one row each now */
    var look = live.map(function (p) {
      var q = now - x6Upd(p) >= 7 * X6_DAY, st = !p.next || x6NextAge(p) >= 7 * X6_DAY;
      return q || st ? { p: p, q: q, st: st, age: now - x6Upd(p) } : null;
    }).filter(Boolean).sort(function (a, b) { return b.age - a.age; });
    h += wrSec('Needs a look', look.length, look.length ? '<ul class="wr-l">' + look.map(function (x) {
      var p = x.p, parts = [];
      if (x.q) parts.push('<span>Quiet for ' + x6Days(Math.round(x.age / X6_DAY)) + '</span>');
      if (!p.next) parts.push('<span class="td-st warn">No next step</span>');
      else if (x.st) { var na = Math.floor(x6NextAge(p) / X6_DAY); parts.push('<span class="td-st' + (na >= 14 ? ' warn' : '') + '">Next step set ' + x6Days(na) + ' ago</span>'); }   /* amber from two weeks: a warning that is everywhere says nothing */
      var q = p.next ? '<span class="wr-q">“' + esc(x6Cut(p.next, 80)) + '”</span>' : '';
      return wrRow(p, parts.join(''), x.st ? 'wrnext' : 'wropen', !p.next ? 'Set one' : x.st ? 'Check it' : 'Open', q);
    }).join('') + '</ul>' : '', 'Every project moved this week, each with a fresh next step.');
    var ideas = live.map(function (p) {
      var n = p.kind === 'private' && p.pv ? p.pv.park.filter(function (x) { return x.st === 'parked'; }).length : (p.later || []).filter(function (x) { return x.st === 'open'; }).length;
      return { p: p, n: n };
    }).filter(function (x) { return x.n; });
    h += wrSec('Waiting for a decision', ideas.reduce(function (s, x) { return s + x.n; }, 0), ideas.length ? '<ul class="wr-l">' + ideas.map(function (x) {
      return wrRow(x.p, esc(x.n + (x.p.kind === 'private' ? (x.n === 1 ? ' idea in the Parking Lot' : ' ideas in the Parking Lot') : (x.n === 1 ? ' item in Later' : ' items in Later'))), 'wrideas', 'Decide');
    }).join('') + '</ul>' : '', 'Nothing is parked.');
    document.getElementById('wr-body').innerHTML = h;
    document.getElementById('wr-last').textContent = WR.last ? 'Last review ' + x6Rel(x6Iso(WR.last)) : 'Your first review';
    return '#wr-done';
  }
  function wrDone() {
    var was = WR.last, nx = new Date(Date.now() + 7 * X6_DAY); WR.last = Date.now(); closeDrawer(); tdRender();
    /* v128: when the next one is, by its day ("Friday, 21 November") */
    showToast('Review done. Next one on ' + WDAY[nx.getDay()] + ', ' + nx.getDate() + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][nx.getMonth()] + '.', function () { WR.last = was; tdRender(); });
  }

  /* ================================================================== quick find: everything that has a name */
  function x6Qf() {
    var work = [], ideas = [], decs = [], links = [], nts = [];
    PROJECTS.forEach(function (p) {
      wkUnits(p).forEach(function (u) { work.push({ t: u.t, s: p.n + ' · ' + WK_NM[wkShow(u)], ic: 'check', x: p.n, go: function () { openProject(p.id, p.kind === 'client' && p.team.length ? 'team' : 'scope', qfIn); } }); });
      if (p.pv) {
        p.pv.park.forEach(function (k) { if (k.st === 'parked') ideas.push({ t: k.t, s: p.n + ' · Parking Lot', ic: 'bulb', x: p.n + ' ' + (k.tag || ''), go: function () { openProject(p.id, 'scope', qfIn); } }); });
        (p.pv.dec || []).forEach(function (d) { decs.push({ t: d.t, s: p.n + ' · ' + (d.st === 'decided' ? 'Decided' : d.st === 'superseded' ? 'Replaced' : 'Open'), ic: 'pin', x: p.n + ' ' + (d.because || ''), go: function () { openProject(p.id, 'decisions', qfIn); pdGo('decisions', 'dec:' + d.id); } }); });
      }
      (p.later || []).forEach(function (x) { if (x.st === 'open') ideas.push({ t: x.t, s: p.n + ' · Later', ic: 'bulb', x: p.n, go: function () { openProject(p.id, 'workspace', qfIn); } }); });
      (p.cdec || []).forEach(function (d) { decs.push({ t: d.t, s: p.n + ' · Decided', ic: 'pin', x: p.n + ' ' + d.because, go: function () { openProject(p.id, 'workspace', qfIn); } }); });
      (p.ctx || []).forEach(function (x) { links.push({ t: x.t, s: pdHost(x.u) + ' · ' + p.n, ic: 'link', x: x.u + ' ' + p.n, go: function () { window.open(x.u, '_blank', 'noopener'); } }); });
    });
    notes.forEach(function (n) { var p = pdById(n.pid); nts.push({ t: x6Cut(n.text, 80), s: 'Note' + (p ? ' · ' + p.n : '') + ' · ' + x6NoteDate(n), ic: 'doc', x: n.text + ' ' + n.tags.join(' ') + ' ' + (n.u || ''), go: function () { openDrawer('notes', qfIn); } }); });
    return { work: work, ideas: ideas, decs: decs, links: links, notes: nts };
  }
  function x6QfActs() {
    return [
      { t: 'Capture…', s: 'A note, a link, an idea for later, or a next step', ic: 'plus', k: 'save clip add note idea later park link quick', go: function (tr) { openDrawer('grab', tr); } },
      { t: 'Plan today', s: TD.d === x6Iso() && TD.items.length ? TD.items.filter(function (x) { return x.done; }).length + ' of ' + TD.items.length + ' done' : 'Pick up to three things', ic: 'sun', k: 'today focus top three priorities day', go: function (tr) { showView('dashboard'); openDrawer('today', tr); } },
      { t: 'Weekly review', s: WR.last ? 'Last done ' + x6Rel(x6Iso(WR.last)) : 'Look back, then plan the week', ic: 'clock', k: 'week review look back stale quiet forgotten', go: function (tr) { openDrawer('review', tr); } },
      { t: 'New note', s: 'Write it down in Quick notes', ic: 'edit', k: 'quick note write jot', go: function (tr) { openDrawer('notes', tr, 'textarea'); } }
    ];
  }

