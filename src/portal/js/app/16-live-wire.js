/* ───── the wire ───── */
function apiUrl(path) {
  var meta = document.querySelector('meta[name="sd-api"]'), base = new URL((meta && meta.content) || 'api.php', location.href).href;
  return /\.php$/i.test(base) ? base + '?r=' + path : base.replace(/\/$/, '') + path;
}
/* Always answers with {status, data, net}. A dead network is status 0, never an exception. */
function apiCall(method, path, body) {
  var h = { 'Accept': 'application/json' }, ac = window.AbortController ? new AbortController() : null, to = 0;
  if (body) h['Content-Type'] = 'application/json';
  if (LIVE.session) { h['Authorization'] = 'Bearer ' + LIVE.session; h['X-SD-Key'] = LIVE.session; }   // the second one is for hosts that drop Authorization
  if (ac) to = setTimeout(function () { ac.abort(); }, method === 'GET' ? 20000 : 45000);   // a write may wait on the server's mail
  return fetch(apiUrl(path), { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac ? ac.signal : undefined }).then(function (r) {
    return r.text().then(function (t) { clearTimeout(to); var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { } return { status: r.status, data: j && typeof j === 'object' ? j : {}, net: false }; });
  }).catch(function () { clearTimeout(to); return { status: 0, data: {}, net: true }; });   // a dropped connection while reading the answer is a dead network too
}
/* a random key for one intent to write: the same key again is the same write, never a second one */
function liveKey() {
  var a = new Uint8Array(16), i, o = '';
  try { crypto.getRandomValues(a); } catch (e) { for (i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); }
  for (i = 0; i < 16; i++) o += ('0' + a[i].toString(16)).slice(-2);
  return 'k-' + o;
}
function errCode(r) { return r && r.data && r.data.error ? r.data.error.code : ''; }
function errDetail(r) { return r && r.data && r.data.error && r.data.error.detail ? r.data.error.detail : {}; }
function errText(r) { return r && r.data && r.data.error ? r.data.error.message : ''; }

