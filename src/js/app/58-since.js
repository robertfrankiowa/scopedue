  /* ---------- v99: since your last visit (CONTRACT.md 50) ----------
     Functions only: the project page calls these. Each device keeps, on the project and never sent (X8_SKIP), when it last opened it
     (p.lv) and where the visit before that ended (p.lvs, the mark this visit compares with). Opening it again within half an hour is
     the same visit, so a reload keeps the list. What changed since is read from Activity's events (prvEvents, and from v102 a client
     project's pdEvents): nothing new is stored */
  function svGap() { return 30 * 60e3; }
  function svOpen(p) {
    if (!p) return;
    var now = Date.now();
    if (!p.lv) { p.lvs = 0; p.lv = now; return; }   // the first visit on this device: nothing to compare with
    if (now - p.lv > svGap()) p.lvs = p.lv;
    p.lv = now;
  }
  /* the events since the mark, newest first; the lanes the person switched off in Activity are left in: this is about what changed */
  function svEvents(p) {
    if (!p || !p.lvs) return [];
    /* v102: a client project's Activity, with what it links to as the lane. Only events with their own time: the old "3h ago" strings
       are counted from a fixed anchor and would always look new */
    if (p.kind === 'client') return pdEvents(p).filter(function (e) { return (e.k === 'clock' || e.k === 'date') && e.t > p.lvs; }).map(function (e) {
      return { ts: e.t, t: e.text, ln: e.link ? e.link.l : e.agr ? 'Agreement' : 'Note', who: e.who };
    });
    if (!p.pv) return [];
    return prvEvents(p).filter(function (e) { return e.ts > p.lvs; });
  }
  function svCard(p) {
    if (pd.svOff === p.id) return '';
    var ev = svEvents(p); if (!ev.length) return '';
    var lanes = {}; if (p.kind === 'client') ev.forEach(function (e) { lanes[e.ln] = e.ln; }); else prvLanes(p).forEach(function (l) { lanes[l[0]] = l[1]; });
    var cut = ev.length > 6 && pd.svAll !== p.id, shown = cut ? ev.slice(0, 5) : ev;
    var h = '<section class="card pd-card sv-card" id="sv-card" aria-labelledby="pd-h-sv"><div class="card-h ruled"><div><h3 id="pd-h-sv">Since your last visit</h3><p>' +
      esc((ev.length === 1 ? '1 change' : ev.length + ' changes') + ' since ' + prvDate(p.lvs) + (pdAgo(p.lvs) !== prvDate(p.lvs) ? ' (' + pdAgo(p.lvs) + ')' : '') + '.') + '</p></div>' +
      '<div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="sv:off">Got it</button></div></div><ol class="tl sv-l">';
    /* lines in a row about the same thing sit under one label (five lines on CR-005 name it once); the client's dot is filled, as in Recent */
    var prev = null;
    shown.forEach(function (e) {
      var ln = lanes[e.ln] || '', head = !!ln && ln !== prev; prev = ln;
      h += '<li' + (head ? ' class="sv-h"' : '') + '><span class="tdot' + (e.who === 'client' ? ' client' : '') + '" aria-hidden="true"></span><div class="tx">' + (head ? '<span class="sv-ln">' + esc(ln) + '</span>' : '') + esc(e.t) + '</div><time>' + esc(pdAgo(e.ts)) + '</time></li>';
    });
    h += '</ol><div class="pd-recent-f">' + (cut ? '<button type="button" class="link" data-pd="sv:all">Show all ' + ev.length + '</button>' : '') + '<button type="button" class="link" data-pd="goto" data-tab="history">Open Activity ' + IC('arrow') + '</button></div></section>';
    return h;
  }
  function svAct(act) {
    var p = pd.p; if (!p) return;
    if (act === 'off') { pd.svOff = p.id; pdRerender(); }
    else if (act === 'all') { pd.svAll = p.id; pdRerender('#sv-card'); }
  }
  if (sdTest()) window.__sv = { mark: function (id, lvs, lv) { var p = pdById(id); if (p) { p.lvs = lvs; p.lv = lv == null ? lvs : lv; } }, get: function (id) { var p = pdById(id); return p ? { lv: p.lv, lvs: p.lvs, n: svEvents(p).length } : null; } };
