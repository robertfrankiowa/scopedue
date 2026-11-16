/* ───────── Portal v2: drawers, dialogs, flows ───────── */
var view = $('#view'), toastEl = $('#toast');
S.crf = 'open'; S.dr = {};
function toast(msg) { $('#toastTxt').textContent = msg; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 4600); }
function openD(d) { if (d.open) return; d.classList.remove('closing'); if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
function closeD(d, after) {
  if (!d || !d.open) { if (after) after(); return; }
  var fin = function () { d.classList.remove('closing'); if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); if (after) after(); };
  if (RM.matches) return fin();
  d.classList.add('closing'); setTimeout(fin, 300);
}
function closeAllD() { $$('dialog[open]').forEach(function (d) { closeD(d); }); }
$$('dialog').forEach(function (d) {
  d.addEventListener('cancel', function (e) { e.preventDefault(); closeD(d); });
  d.addEventListener('click', function (e) { if (e.target !== d) return; var r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeD(d); });
});
function dHead(icon, title, sub) { return '<div class="dr-h"><span class="dr-ic">' + IC(icon, 22) + '</span><div class="dr-tt"><h3 class="dr-t">' + title + '</h3><p class="dr-sub">' + (sub || '') + '</p></div><button type="button" class="dr-x" data-a="close" aria-label="Close">' + IC('x', 18, 1.8) + '</button></div>'; }
function fill(d, html, keepScroll) {
  var b = $('.dr-body', d), y = b ? b.scrollTop : 0;
  d.innerHTML = '<div class="dr-in">' + html + '</div>';
  if (keepScroll) { b = $('.dr-body', d); if (b) b.scrollTop = y; }
}

