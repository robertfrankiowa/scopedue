/* ───────── Portal v2: data, model, events ───────── */
var root = document.documentElement;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var RM = window.matchMedia('(prefers-reduced-motion: reduce)'), FINE = window.matchMedia('(hover:hover) and (pointer:fine)');
var OFFSET = 0;                                   /* the prototype dock can move the clock forward */
function now() { return Date.now() + OFFSET; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* CONTRACT 101: in the open project's currency (src/js/money.js); a project's own when it is given */
function pCur() { var p = S.route && S.route.k !== 'home' && P[S.route.id]; return sdCur(p && p.cur); }
function money(n, cur) { return sdMoney(n, cur || pCur()); }
function plural(n, w, pl) { return n + ' ' + (n === 1 ? w : (pl || w + 's')); }
function dayw(n) { return n + (n === 1 ? ' day' : ' days'); }
function mask(e) { var i = String(e).indexOf('@'); return i < 1 ? e : e.charAt(0) + '•••••' + e.slice(i); }
function ini(name) { var w = String(name || '').normalize('NFC').trim().split(/\s+/).filter(Boolean); if (!w.length) return '?';
  while (w.length > 1 && /^[A-Za-zÀ-ỹ]{1,5}\.$/.test(w[0])) w.shift();   /* v116: a title in front (BS., Dr.) is not part of the name */
  var a = Array.from(w[0]); return (w.length > 1 ? a[0] + Array.from(w[w.length - 1])[0] : a.slice(0, 2).join('')).toLocaleUpperCase(); }
function today() { var d = new Date(); return d.getDate() + ' ' + MON[d.getMonth()]; }
function clock(d) { d = d || new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function stamp() { return today() + ' · ' + clock(); }
var IC_P = {
  bell: '<path d="M6.2 16.5V11a5.8 5.8 0 0 1 11.6 0v5.5l1.4 1.7H4.8z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9 12.5h6M9 16h6"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  folder: '<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  shield: '<path d="M12 3.5l7 2.8v5.4c0 4.2-2.9 7.3-7 8.8-4.1-1.5-7-4.6-7-8.8V6.3z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  chevd: '<path d="M5 9l7 7 7-7"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l5-4.5 3.5 3 2.5-2 3 3"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6"/>',
  list: '<path d="M8 6.5h11M8 12h11M8 17.5h11"/><circle cx="4.5" cy="6.5" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="17.5" r=".8"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/>'
};
function IC(n, s, w) { s = s || 20; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.5) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC_P[n] + '</svg>'; }

