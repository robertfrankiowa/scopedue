  /* ---------- notifications ---------- */
  var bell = document.getElementById('bell'), notif = document.getElementById('notif');
  var nBadge = document.getElementById('nbadge'), nSeg = document.getElementById('notif-seg');
  var nBody = document.getElementById('n-body'), nReadAll = document.getElementById('n-readall'), nClear = document.getElementById('n-clear');
  var nFilter = 'all', nOpen = false, nPrev = null;
  function nList() { return [].slice.call(notif.querySelectorAll('.n-item')); }
  notif.querySelector('.n-tools').classList.add('st');

  function nUnread() { return notif.querySelectorAll('.n-item[data-unread]').length; }
  function setUnread(it, on) {
    var nk = it.getAttribute('data-nk'); if (nk) NT_READ[nk] = !on;
    if (on) it.setAttribute('data-unread', ''); else it.removeAttribute('data-unread');
    var rb = it.querySelector('.n-read'); if (rb) rb.hidden = !on;
    var sr = it.querySelector('.sr'); if (sr) sr.textContent = on ? 'Unread. ' : '';
  }
  function syncNotif() {
    var u = nUnread();
    if (u > 0) nBadge.textContent = u > 99 ? '99+' : u;
    nBadge.classList.toggle('zero', u === 0);
    if (nPrev !== null && u !== nPrev && u > 0) bump(nBadge);
    nPrev = u;
    bell.setAttribute('aria-label', u ? 'Notifications, ' + u + ' unread' : 'Notifications, no unread');
    tween(document.getElementById('n-unread'), u);
    nReadAll.disabled = u === 0;
    nClear.disabled = !nList().length;
  }
  function refreshNotif() {
    var shown = 0;
    notif.querySelectorAll('.n-group').forEach(function (g) {
      var any = !!g.querySelector('.n-item:not([hidden])'); g.hidden = !any; if (any) shown++;
    });
    document.getElementById('n-empty').hidden = shown !== 0;
  }
  function applyNotif(animate, keep) {
    nList().forEach(function (it) {
      it.hidden = !(nFilter === 'all' || it.hasAttribute('data-unread'));
      it.classList.remove('leaving'); it.style.maxHeight = '';
    });
    refreshNotif();
    if (!keep) nBody.scrollTop = 0;
    if (animate) playN();
  }
  function playN() {
    var i = 0;
    notif.querySelectorAll('.st').forEach(function (n) {
      if (!n.getClientRects().length) return;
      n.style.setProperty('--i', Math.min(i++, 8));
    });
    notif.classList.remove('play'); void notif.offsetWidth; notif.classList.add('play');
  }
  function leave(it, delay) {
    if (reduced) { it.hidden = true; refreshNotif(); return; }
    setTimeout(function () {
      it.style.maxHeight = it.offsetHeight + 'px'; void it.offsetHeight; it.classList.add('leaving');
      setTimeout(function () {
        it.classList.remove('leaving'); it.style.maxHeight = '';
        if (nFilter === 'unread' && !it.hasAttribute('data-unread')) {
          var had = it.contains(document.activeElement);
          it.hidden = true; refreshNotif();
          if (had && nOpen) notif.focus({ preventScroll: true });
        }
      }, 300);
    }, delay || 0);
  }
  function markRead(it) {
    if (!it.hasAttribute('data-unread')) return;
    setUnread(it, false);
    syncNotif();
    if (nFilter === 'unread') leave(it, 140);
  }
  function markAllRead() {
    var list = nList().filter(function (it) { return it.hasAttribute('data-unread'); });
    if (!list.length) return;
    list.forEach(function (it, i) { setUnread(it, false); if (nFilter === 'unread') leave(it, 80 + i * 40); });
    syncNotif();
    showToast(list.length === 1 ? '1 notification marked as read' : list.length + ' notifications marked as read', function () { list.forEach(function (it) { setUnread(it, true); }); dbNotif(); });
  }

  /* v71: Clear all empties the list. A cleared notification is kept as read ('x') and stays away until it changes:
     a deadline a day closer or a new client reply is a new key, so it comes back. Undo puts the list back */
  function clearAll() {
    var list = nList(); if (!list.length) return;
    var was = {};
    list.forEach(function (it) { var k = it.getAttribute('data-nk'); if (k) { was[k] = NT_READ[k]; NT_READ[k] = 'x'; } });
    dbNotif();
    showToast(list.length === 1 ? '1 notification cleared' : list.length + ' notifications cleared', function () {
      Object.keys(was).forEach(function (k) { if (was[k] === undefined) delete NT_READ[k]; else NT_READ[k] = was[k]; });
      dbNotif();
    });
  }

  function placeNotif() {
    var b = bell.getBoundingClientRect(), a = document.querySelector('.top-actions').getBoundingClientRect();
    notif.style.setProperty('--nt', Math.round(b.bottom + 10) + 'px');
    notif.style.setProperty('--nr', Math.max(12, Math.round(root.clientWidth - a.right)) + 'px');
  }
  function openNotif() {
    if (nOpen) return;
    if (openEl) closeDrawer(true);
    nFilter = 'all'; setPressed(nSeg, 'all'); dbNotif(); applyNotif(false);
    placeNotif();
    notif.setAttribute('data-open', ''); bell.setAttribute('aria-expanded', 'true'); nOpen = true;
    moveThumb(nSeg, false);
    playN();
    setTimeout(function () { if (nOpen) notif.focus({ preventScroll: true }); }, 60);
  }
  function closeNotif(silent) {
    if (!nOpen) return;
    nOpen = false;
    notif.removeAttribute('data-open'); bell.setAttribute('aria-expanded', 'false');
    if (!silent) bell.focus({ preventScroll: true });
  }

  bell.addEventListener('click', function () { nOpen ? closeNotif() : openNotif(); });
  nReadAll.addEventListener('click', markAllRead);
  nClear.addEventListener('click', clearAll);
  nSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    nFilter = b.getAttribute('data-f'); setPressed(nSeg, nFilter); applyNotif(true);
  });
  notif.addEventListener('click', function (e) {
    var rb = e.target.closest('.n-read');
    if (rb) {
      var it = rb.closest('.n-item'); markRead(it);
      var m = it.querySelector('.n-main'); if (!it.hidden) m.focus({ preventScroll: true });
      return;
    }
    var main = e.target.closest('.n-main'); if (!main) return;
    var item = main.closest('.n-item'), go = item.getAttribute('data-go');
    if (!go) { markRead(item); return; }
    setUnread(item, false); syncNotif();
    closeNotif(true);
    if (go === 'settings') { stGo(item.getAttribute('data-tab')); return; }
    if (go === 'project') { dbGo(item.getAttribute('data-pid'), item.getAttribute('data-tab'), item.getAttribute('data-f'), item.getAttribute('data-cr'), bell); return; }
    openDrawer(go, bell);
  });
  document.addEventListener('pointerdown', function (e) {
    if (nOpen && !notif.contains(e.target) && !bell.contains(e.target) && !e.target.closest('#toast')) closeNotif(true);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nOpen) { e.preventDefault(); closeNotif(); }
  });
  notif.addEventListener('focusout', function (e) {
    var t = e.relatedTarget;
    if (nOpen && t && !notif.contains(t) && t !== bell) closeNotif(true);
  });
  notif.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var mains = [].slice.call(notif.querySelectorAll('.n-item:not([hidden]) .n-main'));
    if (!mains.length) return;
    var i = mains.indexOf(document.activeElement), next;
    if (e.key === 'ArrowDown') next = i < 0 ? 0 : Math.min(i + 1, mains.length - 1);
    else if (i > 0) next = i - 1; else return;
    e.preventDefault(); mains[next].focus({ preventScroll: false });
  });
  window.addEventListener('resize', function () { if (nOpen) placeNotif(); });
  syncNotif();

