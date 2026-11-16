/* ───────── Portal: live mode ─────────
   Talks to api.php (CONTRACT.md, section 11). The demo (file:// or ?demo) never runs this code.
   How a client gets in: the link in the email carries #s=STUDIO&k=TOKEN. The token is traded for a 12-hour session
   and removed from the address bar at once, by boot.js before the first frame (it waits in this tab, SD_LINK and sessionStorage
   sd-link, until the server has answered). The session lives in sessionStorage, so closing the tab ends it.
   Nothing the server sends is trusted blindly: this browser recomputes every fingerprint and entry hash. */
var LIVEON = false;
var LIVE = { slug: '', session: '', exp: 0, name: '', loading: false, sig: '', link: null, timer: 0, verified: false };
function linkOk(l) { return !!(l && /^[a-z0-9]{6,20}$/.test(String(l.slug)) && /^sdl_[\w-]+$/.test(String(l.token))); }
var BOOT = (function () {
  var m = /^#s=([a-z0-9]{6,20})&k=(sdl_[\w-]+)$/.exec(location.hash), sv = null, lk = window.SD_LINK;
  if (m) return { mode: 'live', link: { slug: m[1], token: m[2] } };   // a page without boot.js
  if (!linkOk(lk)) { try { lk = JSON.parse(sessionStorage.getItem('sd-link') || 'null'); } catch (e) { lk = null; } }
  if (linkOk(lk)) return { mode: 'live', link: { slug: String(lk.slug), token: String(lk.token) } };
  try { sv = JSON.parse(sessionStorage.getItem('sd-live') || 'null'); } catch (e) { sv = null; }
  if (sv && sv.session && sv.exp > Date.now()) return { mode: 'live', saved: sv };
  if (location.protocol === 'file:' || /[?&]demo\b/.test(location.search)) return { mode: 'demo' };
  return { mode: 'wall', slug: lsGet('sd-slug') };
})();
/* a photo is an image in the page itself, never an address or anything that could close the style it sits in */
function photoUrl(u) { u = String(u || ''); return /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/]+=*$/.test(u) ? u : ''; }
/* a link from data opens a web page, never script */
function webUrl(u) { u = String(u == null ? '' : u).trim(); return /^https?:\/\//i.test(u) ? u : '#'; }
function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

