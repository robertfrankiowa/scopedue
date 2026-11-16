  /* ---------- v73: reminders on Quick notes: a day, a time, and how long before ----------
     A note's reminder is n.rem (the day, YYYY-MM-DD), n.remT (HH:MM, 09:00 when none was given: notes from before v73) and n.remB
     (minutes before, 0 = at the time). It goes off at x6RemAt(n); Snooze moves that to n.remS. n.remA is when it was last shown here.
     In the extension the reminders are handed to the background (chrome.storage.local sdRems, one chrome.alarms alarm each), which
     opens a small ScopeDue window in the middle of the screen whatever tab is in front (reminder.html); what is pressed there comes
     back as sdRemAct. Without the extension (the web app) the page shows the same thing over itself, while it is open. */
  var X6_REMB = [['0', 'At the time'], ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before'], ['c', 'Custom…']];
  var X6_REMU = [['1', 'minutes'], ['60', 'hours'], ['1440', 'days']];
  function x6RemEv(n) { var t = x6Ts(n.rem); if (!t) return 0; var m = /^(\d\d):(\d\d)$/.exec(n.remT || '') || [0, '09', '00']; return t + (+m[1]) * 36e5 + (+m[2]) * 6e4; }
  function x6RemAt(n) { if (!n || !n.rem) return 0; if (n.remS) return n.remS; return x6RemEv(n) - (+n.remB || 0) * 6e4; }
  function x6RemB(b) {
    b = +b || 0; if (!b) return '';
    if (b % 1440 === 0) return b === 1440 ? '1 day before' : b / 1440 + ' days before';
    if (b % 60 === 0) return b === 60 ? '1 hour before' : b / 60 + ' hours before';
    return b === 1 ? '1 minute before' : b + ' minutes before';
  }
  function x6Hm(ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  /* "Today", "14:30", "30 minutes before": kept apart, so each is translated on its own */
  function x6RemLbl(n) {
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    if (n.remS) return ['Snoozed to', x6Rel(x6Iso(n.remS)), x6Hm(n.remS)];
    return [cap(x6Rel(n.rem)), n.remT || '09:00'].concat(n.remB ? ['·', x6RemB(n.remB)] : []);
  }
  /* the fields: a day, then a time and how long before once there is a day */
  function x6RemHTML(n) {
    n = n || {}; var b = +n.remB || 0, std = X6_REMB.some(function (o) { return o[0] === String(b); }), u = b && b % 1440 === 0 ? 1440 : b && b % 60 === 0 ? 60 : 1;
    return '<span class="rm" data-rm>' +
      '<label class="rm-l"><span>Remind me</span><input type="date" class="rm-d" name="rem" value="' + esc(n.rem || '') + '" aria-label="Remind me on"></label>' +
      '<input type="time" class="rm-t" name="remT" value="' + esc(n.remT || (n.rem ? '09:00' : '')) + '" aria-label="At"' + (n.rem ? '' : ' hidden') + '>' +
      '<span class="pd-sel rm-bs"' + (n.rem ? '' : ' hidden') + '><select class="rm-b" name="remB" aria-label="When to remind">' + X6_REMB.map(function (o) { return '<option value="' + o[0] + '"' + ((std ? String(b) === o[0] : o[0] === 'c') ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span>' +
      '<span class="rm-c"' + (n.rem && !std ? '' : ' hidden') + '><input type="number" class="rm-n" name="remN" min="1" max="999" value="' + (std ? 15 : b / u) + '" aria-label="How many"><span class="pd-sel"><select class="rm-u" name="remU" aria-label="Minutes, hours or days">' + X6_REMU.map(function (o) { return '<option value="' + o[0] + '"' + (!std && String(u) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + IC('chev') + '</span><span>before</span></span></span>';
  }
  /* shows the time and the before choice once a day is set, and the custom amount when Custom is chosen */
  function x6RemInput(e) {
    var w = e.target.closest('[data-rm]'); if (!w) return;
    var d = w.querySelector('.rm-d'), t = w.querySelector('.rm-t'), b = w.querySelector('.rm-b'), on = !!d.value;
    if (e.target === d && on && !t.value) t.value = '09:00';
    t.hidden = !on; w.querySelector('.rm-bs').hidden = !on; w.querySelector('.rm-c').hidden = !on || b.value !== 'c';
  }
  /* what the fields say: { rem, remT, remB } (rem null: no reminder), or { err } */
  function x6RemRead(w) {
    var d = w.querySelector('.rm-d').value; if (!d) return { rem: null, remT: '', remB: 0 };
    var t = w.querySelector('.rm-t').value || '09:00', bv = w.querySelector('.rm-b').value, b = +bv || 0;
    if (bv === 'c') { var k = Math.round(+w.querySelector('.rm-n').value); if (!(k >= 1 && k <= 999)) return { err: 'How long before? A number from 1 to 999.' }; b = Math.min(k * (+w.querySelector('.rm-u').value || 1), 60 * 24 * 60); }
    return { rem: d, remT: /^\d\d:\d\d$/.test(t) ? t : '09:00', remB: b };
  }
  function x6RemSet(n, r) { n.rem = r.rem; if (r.rem) { n.remT = r.remT; n.remB = r.remB; } else { delete n.remT; delete n.remB; } delete n.remS; delete n.remA; }
  /* no reminder any more (Done, Clear reminder); the function puts it back */
  function x6RemClear(n) { var o = { rem: n.rem, remT: n.remT, remB: n.remB, remS: n.remS, remA: n.remA }; n.rem = null; delete n.remT; delete n.remB; delete n.remS; delete n.remA; return function () { Object.keys(o).forEach(function (k) { if (o[k] === undefined) delete n[k]; else n[k] = o[k]; }); }; }

  /* ---- the extension: the reminders handed to the background ---- */
  function x6RemExt() { try { return typeof chrome !== 'undefined' && !!(chrome.alarms && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id); } catch (e) { return false; } }
  var x6RemQ = 0;
  function x6RemSync() { clearTimeout(x6RemQ); x6RemQ = setTimeout(x6RemSyncNow, 300); }
  function x6RemSyncNow() {
    if (!x6RemExt()) return;
    chrome.storage.local.get('sdRems', function (o) {
      var was = (o && o.sdRems) || {}, m = {}, now = Date.now();
      notes.forEach(function (n) {
        if (!n.rem) return;
        var at = x6RemAt(n), p = n.pid ? pdById(n.pid) : null, w = was[n.id];
        m[n.id] = { t: String(n.text).slice(0, 400), p: p ? p.n : '', at: at, ev: x6RemEv(n), b: +n.remB || 0, shown: w && w.at === at ? !!w.shown : at <= now - 6e4 && !!n.remA };
      });
      chrome.storage.local.set({ sdRems: m });
      chrome.alarms.getAll(function (all) {
        (all || []).forEach(function (a) { if (/^rem:/.test(a.name)) { var id = a.name.split(':')[1]; if (!m[id] || m[id].at !== a.scheduledTime) chrome.alarms.clear(a.name); } });
        Object.keys(m).forEach(function (id) {
          if (m[id].at > now && !(all || []).some(function (a) { return a.name === 'rem:' + id && a.scheduledTime === m[id].at; })) chrome.alarms.create('rem:' + id, { when: m[id].at });
        });
      });
    });
  }
  /* what was pressed in the reminder window: done, snooze, open */
  function x6RemActs(boot) {
    if (!x6RemExt()) return;
    chrome.storage.local.get('sdRemAct', function (o) {
      var l = (o && o.sdRemAct) || []; if (!l.length) { x6RemSync(); return; }
      var ch = false, open = false;
      l.forEach(function (a) {
        var n = x6NoteById(+a.id); if (!n) return;
        if (a.a === 'done' && n.rem) { x6RemClear(n); ch = true; }
        else if (a.a === 'snooze' && n.rem && a.at > Date.now()) { n.remS = a.at; delete n.remA; ch = true; }
        else if (a.a === 'open' && boot && Date.now() - (a.ts || 0) < 6e4) open = true;
        if (a.a === 'shown') { n.remA = a.ts || Date.now(); ch = true; }
      });
      chrome.storage.local.set({ sdRemAct: [] });
      if (ch) { renderNotes(); tdRender(); dbNotif(); try { SDB.save(); } catch (e) {} }
      if (open) openDrawer('notes');
      x6RemSync();
    });
  }

  /* ---- the web app: the same, over the page itself, while it is open ---- */
  var X6RO = null;
  function x6RemDue() { var now = Date.now(); return notes.filter(function (n) { var at = x6RemAt(n); return n.rem && at && at <= now && !(n.remA && n.remA >= at); }); }
  function x6RemTick() {
    if (x6RemExt() || X6RO) return;
    var due = x6RemDue(); if (!due.length) return;
    var now = Date.now(); due.forEach(function (n) { n.remA = now; });
    try { SDB.save(); } catch (e) {}
    x6RemShow(due.map(function (n) { return n.id; }));
  }
  function x6RemCard(n) {
    var p = n.pid ? pdById(n.pid) : null, ev = x6RemEv(n);
    return '<li data-rid="' + n.id + '"><p>' + esc(n.text) + '</p><div class="rm-m">' + (p ? '<b>' + esc(p.n) + '</b>' : '') + '<span>' + IC('bell') + '<span>' + esc(x6Rel(x6Iso(ev)).charAt(0).toUpperCase() + x6Rel(x6Iso(ev)).slice(1)) + '</span> <span>' + x6Hm(ev) + '</span></span></div>' +
      '<div class="rm-a"><button type="button" class="btn-primary btn-sm" data-ra="done">Done</button><span class="pd-sel"><select data-ra="snooze" aria-label="Remind me again"><option value="">Remind me again…</option><option value="10">In 10 minutes</option><option value="60">In 1 hour</option><option value="tom">Tomorrow 9:00</option></select>' + IC('chev') + '</span><button type="button" class="btn-ghost btn-sm" data-ra="open">Open the note</button></div></li>';
  }
  function x6RemShow(ids) {
    var list = ids.map(function (id) { return x6NoteById(id); }).filter(Boolean); if (!list.length) return;
    X6RO = document.createElement('div'); X6RO.className = 'rm-ov';
    X6RO.innerHTML = '<div class="rm-box" role="alertdialog" aria-modal="true" aria-labelledby="rm-h"><div class="rm-hd"><span class="rm-ic">' + IC('bell') + '</span><h2 id="rm-h">' + (list.length === 1 ? 'Reminder' : list.length + ' reminders') + '</h2><button type="button" class="dr-x" data-ra="close" aria-label="Close">' + IC('x') + '</button></div><ul>' + list.map(x6RemCard).join('') + '</ul></div>';
    document.body.appendChild(X6RO);
    if (window.SDI18N && SDI18N.reveal) SDI18N.reveal(X6RO);
    X6RO.addEventListener('click', x6RemOvAct); X6RO.addEventListener('change', x6RemOvAct);
    X6RO.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); x6RemOvClose(); } });
    var f = X6RO.querySelector('[data-ra="done"]'); if (f) f.focus();
  }
  function x6RemOvClose() { if (X6RO) { X6RO.remove(); X6RO = null; } }
  function x6RemOvAct(e) {
    var b = e.target.closest('[data-ra]'); if (!b) return;
    var a = b.getAttribute('data-ra'); if (a === 'snooze' && e.type !== 'change') return; if (a !== 'snooze' && e.type === 'change') return;
    if (a === 'close') { x6RemOvClose(); return; }
    var li = b.closest('[data-rid]'), n = li && x6NoteById(+li.getAttribute('data-rid')); if (!n) return;
    if (a === 'done') { x6RemClear(n); }
    else if (a === 'snooze') { if (!b.value) return; var t = b.value === 'tom' ? x6Ts(x6Iso(Date.now() + 864e5)) + 9 * 36e5 : Date.now() + (+b.value) * 6e4; n.remS = t; delete n.remA; }
    else if (a === 'open') { x6RemOvClose(); openDrawer('notes'); return; }
    li.remove(); renderNotes(); tdRender(); dbNotif(); try { SDB.save(); } catch (er) {}
    if (!X6RO.querySelector('[data-rid]')) x6RemOvClose(); else { var nx = X6RO.querySelector('[data-ra="done"]'); if (nx) nx.focus(); }
  }
  function x6RemInit() {
    document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('[data-rm]')) x6RemInput(e); });
    document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('[data-rm]')) x6RemInput(e); });
    if (x6RemExt()) {
      x6RemActs(true);   /* then hands the reminders over (x6RemSync), never before what was pressed is in */
      chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.sdRemAct && (ch.sdRemAct.newValue || []).length) x6RemActs(false); });
    } else {
      setInterval(x6RemTick, 15000); setTimeout(x6RemTick, 2500);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) x6RemTick(); });
    }
  }
