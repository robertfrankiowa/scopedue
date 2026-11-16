  /* 0.10.84 (CONTRACT 137): the test hooks (window.__x…, opened by ?test) exist only where tests run: a page on this computer (file:,
     localhost, 127.0.0.1) or an unpacked extension (Chrome Web Store adds update_url to the manifest it installs). app.scopedue.com and
     the extension from the store never have them, whatever the address says */
  function sdTest() {
    if (!/[?&]test\b/.test(location.search)) return false;
    if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true;
    try { return location.protocol === 'chrome-extension:' && !chrome.runtime.getManifest().update_url; } catch (e) { return false; }
  }
  /* what the saved copy says about counters and read marks; a value of the wrong kind is ignored, never trusted */
  function sdNum(n, d) { var v = SDBOOT.meta(n, null); return typeof v === 'number' && isFinite(v) ? v : d; }
  function sdObj(n) { var v = SDBOOT.meta(n, null); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function sdList(n) { var v = SDBOOT.meta(n, null); return Array.isArray(v) ? v : []; }
  function sdCtr(n, d) { var c = SDBOOT.meta('ctr', null); return c && typeof c[n] === 'number' && isFinite(c[n]) && c[n] >= d ? c[n] : d; }

  /* ---------- v68: what people wrote is never translated ----------
     The language layer (i18n.js) lays Vietnamese over the app's own words. Everything a person wrote is handed to it first, so it
     can leave those words exactly as they are wherever they show up: here, typed on a teammate's device, written by a client in
     the portal, or a pull request's title. Every text in the data counts as someone's words, except the few places where the app
     itself writes a sentence, a date, a status or a role into the data (SD_UT_APP), and codes (ids, enum values). A sample from
     before v111 is the app's own and is translated with the rest; a sample of one language (67: meta sample with l) was written by
     a person in it, so its words are left as they are. */
  var SD_UT_APP = [
    /^client\.(act\[\]|invited|since|ptS|seenT|seenN|status|portal|log\[\]\[\])$/, /^client\.needs\[\]\./, /^client\.projects\[\]\.(chipT|date|phase|sub|m|step)$/,
    /^(project\.)?team\[\]\.(role|seen)$/, /^project\.crs\[\]\.entries\[\]\.(at|rec\..+)$/, /^project\.due\./, /^project\.evd\[\]\.(at|copy\.at)$/,
    /^project\.local\[\]\./, /^project\.log\[\]\.(at|t|\*)$/, /^project\.mentions\[\]\.t$/, /^project\.mev\[\]\.(at|rec\.(via|at))$/,
    /^project\.(nextAt|upd|updT|owner|cur|phase)$/, /^project\.scope\./, /^project\.sc\.items\[\]\.d$/,
    /^project\.sc\.vers\[\]\.(at|appr|by|rec\..+|items\[\]\.d)$/, /^project\.pv\.items\[\]\.(as|by\.ref|ho\[\]\.(from|to)|size)$/,
    /^project\.pv\.base\./, /^project\.pv\.comps\[\]\.price$/, /^project\.pv\.src\[\]\.host$/, /^project\.work\.\*\.as$/, /^project\.x8\.(role|st|msg)$/, /^project\.dv\./, /^thread\./
  ];
  /* v114: a reason the app wrote into an item ruled out with none given (the Scope Gate's, Cut to meet the date), here and in its
     history; matched by its words, so items ruled out before this are translated too. Anything a person typed there stays theirs */
  var SD_UT_WHY = /^(It breaks a principle you wrote down: “[^]*”\.|You already ruled this out: “[^]*|It answers no job and costs [^]* That is how a side feature eats (a release|the work)\.|Cut to meet the date)$/;
  /* a lowercase word with no space is a code (an id, a state), unless it sits where people write */
  var SD_UT_WORDS = { n: 1, name: 1, t: 1, title: 1, text: 1, focus: 1, next: 1, thesis: 1, note: 1, tx: 1, contact: 1, q: 1, why: 1, because: 1, d: 1, sn: 1, stk: 1, ok: 1, ship: 1, sum: 1, pos: 1, txt: 1, x: 1 };
  function sdUTWalk(o, path, key, out) {
    if (typeof o === 'string') {
      if (!o || /^https?:\/\/|^data:|^#[0-9a-f]{3,8}$/i.test(o)) return;
      if (key === 'tx' && (o === 'Approved.' || o === 'Accepted.')) return;   /* written by the server when the client enters the code */
      if (path === 'project.crs[].t' && /^Question about Scope v\d+$/.test(o)) return;   /* the server's title for a client's question (api.php), as the portal reads it */
      /* v128 (104): the server's title for a problem the client thinks is covered (api.php): its words are theirs, "Not covered:" the app's */
      if (path === 'project.crs[].t' && /^Not covered: ./.test(o)) { out.push(o.slice(13)); return; }
      if (/^[a-z0-9_:.#\/@+-]*$/.test(o) && !SD_UT_WORDS[key]) return;
      /* v122 (93): "You" where the app names a person by code (who logged it, who works on it, whom it waits on) is the app's word */
      /* v130 (107): also su, who replaced a decision (38-private-actions); log t0 (read as log[].*) is the line as its teammate wrote it (25-team-sync) */
      if (o === 'You' && /^(au|su|as|to|ref|owner|by|who|from|fr)$/.test(key)) return;
      for (var i = 0; i < SD_UT_APP.length; i++) if (SD_UT_APP[i].test(path)) return;
      if ((path === 'project.pv.items[].why' || path === 'project.pv.items[].lg[].why') && SD_UT_WHY.test(o)) return;
      out.push(o); return;
    }
    if (Array.isArray(o)) { for (var j = 0; j < o.length; j++) sdUTWalk(o[j], path + '[]', key, out); return; }
    if (!o || typeof o !== 'object') return;
    /* a Scope Gate call and a Proof decision are written by the app around the item or the belief they are about */
    var gate = path === 'project.pv.dec[]' && (o.typ === 'scope' || o.typ === 'proof');
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      if (gate && (k === 't' || k === 'opts' || (o.typ === 'scope' && k === 'because'))) continue;
      sdUTWalk(o[k], path + '.' + (/^[a-z]?\d+$/.test(k) ? '*' : k), k, out);
    }
  }
  /* the profile, minus what it says before anyone has filled it in */
  function sdUTProfile(out) {
    var pf = {}; try { pf = JSON.parse(localStorage.getItem('sd-profile') || '{}') || {}; } catch (e) {}
    ['name', 'title', 'biz', 'email', 'phone', 'city', 'bio'].forEach(function (k) { if (typeof pf[k] === 'string' && pf[k] && !(k === 'name' && pf[k] === 'ScopeDue user')) out.push(pf[k]); });
  }
  function sdUTSend(lists, sample, team, today) {
    if (!window.SDI18N || !SDI18N.userText) return;
    var out = [], S = sample && !sample.l ? sample : {}, has = function (l, k) { return (l || []).indexOf(k) > -1; };
    (lists.project || []).forEach(function (p) {
      if (has(S.p, p.id)) return;
      sdUTWalk(p, 'project', '', out);
    });
    (lists.client || []).forEach(function (c) { if (!has(S.c, c.id)) sdUTWalk(c, 'client', '', out); });
    (lists.note || []).forEach(function (n) { if (!has(S.n, n.id)) sdUTWalk(n, 'note', '', out); });
    (team || []).forEach(function (m) { if (m && !has(S.tm, m.e)) sdUTWalk(m, 'team[]', '', out); });
    (today || []).forEach(function (x) { if (x && typeof x.t === 'string' && x.k !== 'need') out.push(x.t); });   /* v114: what needs you is the app's words (Decide what is in Now) */
    sdUTProfile(out);
    SDI18N.userText(out);
  }
  /* before anything is drawn: what this browser kept */
  (function () {
    if (!SDBOOT.restored) { sdUTSend({}, {}, [], []); return; }
    var sm = SDBOOT.meta('sample', null), t = SDBOOT.meta('today', null);
    sdUTSend({ project: SDBOOT.pick('project') || [], client: SDBOOT.pick('client') || [], note: SDBOOT.pick('note') || [] }, sm && typeof sm === 'object' ? sm : {},
      sdList('team'), t && Array.isArray(t.items) ? t.items : []);
  })();
  var app = document.getElementById('app');
  var scrim = document.getElementById('scrim');
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var openEl = null, lastTrigger = null;

  var tweenTok = 0;
  function tween(node, to) {
    var from = parseInt(node.textContent, 10) || 0;
    if (reduced || from === to) { node.textContent = to; return; }
    var tok = ++tweenTok; node._tw = tok;
    var t0 = performance.now(), dur = 360;
    (function f(t) {
      if (node._tw !== tok) return;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(f); else node.textContent = to;
    })(t0);
    setTimeout(function () { if (node._tw === tok) node.textContent = to; }, dur + 80);
  }
  function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }
  /* v68: text that never reaches the page as itself (search, email, clipboard, file names) in the chosen language */
  function sdT(t) { return window.SDI18N ? SDI18N.t(t) : t; }
  function sdTo(l, t) { return window.SDI18N && SDI18N.to ? SDI18N.to(l, t) : t; }
  function fold(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svgUse(id, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg'); s.setAttribute('class', cls || 'i');
    var u = document.createElementNS(ns, 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s;
  }

