/* ───── v68: the portal's look ─────
   Which theme the page wears, first that applies:
   1. ?theme=<theme>[.<palette>] in the address: a preview (never remembered);
   2. the client's own choice (the Appearance menu in the header), kept in this browser: localStorage['sd-portal-own'],
      "auto" for Automatic;
   3. the theme the studio set for the project on screen (project.theme; on Home, the first project's);
   4. the studio's theme (studio.theme, from before themes were set per project);
   5. Automatic: light, or dark when the computer is.
   A theme is a file in src/portal/css/themes; "<theme>.<palette>" is one of its colour palettes. */
var THEMES = /*SD_THEMES*/[], PALETTES = /*SD_PALETTES*/{}, THEME_CARDS = /*SD_THEME_CARDS*/[], THEME_STUDIO = '';
/* "<theme>" or "<theme>.<palette>": [theme, palette], each '' when this page has no such file or block */
function themeOf(t) {
  var p = String(t || '').split('.'), id = THEMES.indexOf(p[0]) > -1 ? p[0] : '';
  return [id, id && p[1] && (PALETTES[id] || []).indexOf(p[1]) > -1 ? p[1] : ''];
}
function themeStr(tp) { return tp[0] ? tp[0] + (tp[1] ? '.' + tp[1] : '') : ''; }
function themeQuery() { var q = /[?&]theme=([a-z][a-z0-9-]{0,30}(?:\.[a-z][a-z0-9-]{0,30})?)(?![\w.-])/.exec(location.search); return q && themeOf(q[1])[0] ? q[1] : ''; }
function themeOwn() { var v = lsGet('sd-portal-own'); return v === 'auto' ? 'auto' : themeStr(themeOf(v)); }
/* what the studio chose for what is on screen */
function themeStudio() {
  var c = CLIENTS && S.cid ? cl() : null, id = S.route && S.route.k === 'p' ? S.route.id : c && c.projects[0], p = id && P[id];
  return themeStr(themeOf(p && p.theme || THEME_STUDIO));
}
function applyTheme() {
  var q = themeQuery(), own = themeOwn(), st = themeStudio(), tp = themeOf(q ? q : own === 'auto' ? '' : own ? own : st);
  if (LIVEON && !q) liveHint('theme', st);   // boot.js wears it from the first frame next time (the client's own choice it reads itself)
  if (tp[0]) root.setAttribute('data-theme', tp[0]); else root.removeAttribute('data-theme');
  if (tp[1]) root.setAttribute('data-palette', tp[1]); else root.removeAttribute('data-palette');
  var d = $('#thmDot'); if (d) d.setAttribute('data-own', own ? '1' : '0');
}
/* a theme's name, with its palette's ('Ivory · Navy'), as HTML: each name its own text, so each is said in the client's language */
function themeLabel(v) {
  var tp = themeOf(v), t = THEME_CARDS.filter(function (x) { return x.id === tp[0]; })[0];
  if (!t) return '<span>Automatic</span>';
  var pl = tp[1] && (t.pal || []).filter(function (x) { return x.id === tp[1]; })[0];
  return '<span>' + esc(t.name) + '</span>' + (pl ? ' · <span>' + esc(pl.name) + '</span>' : '');
}

/* ── the Appearance menu: follow the studio, or the client's own theme and tone ── */
function tmMini(v, cls) {
  var st = '--p:' + v.page + ';--t:' + v.top + ';--k:' + v.ink + ';--m:' + v.muted + ';--l:' + v.line + ';--am:' + v.amber + ';--sh:' + (v.sh || 'linear-gradient(165deg,' + v.pa + ',' + v.pb + ')') + ';--cr:' + v.cream + ';--f:' + v.font + ';--w:' + v.dw;
  return '<span class="tm-m' + (cls ? ' ' + cls : '') + '" style="' + esc(st) + '" aria-hidden="true"><i class="tm-bar"></i><span class="tm-aa" translate="no">Aa</span><i class="tm-ln"></i><i class="tm-ln s"></i><i class="tm-pn"><i></i></i></span>';
}
function paintThemeMenu() {
  var m = $('#tmenu'); if (!m || !THEME_CARDS.length) return;
  var own = themeOwn(), cur = own === 'auto' ? '' : own, tp = themeOf(cur), sn = studioName();
  var light = THEME_CARDS[0], dark = THEME_CARDS.filter(function (t) { return t.dark; })[0] || light;
  var rows = [{ id: '', name: 'Automatic', pic: tmMini(light.v) + tmMini(dark.v, 'tm-split') }].concat(THEME_CARDS.map(function (t) {
    var pl = tp[0] === t.id && tp[1] && (t.pal || []).filter(function (x) { return x.id === tp[1]; })[0];
    return { id: t.id, name: t.name, pic: tmMini(pl ? pl.v : t.v) };
  }));
  var sel = !own ? null : own === 'auto' ? '' : tp[0];
  var h = '<div class="tm-h"><h3>Appearance</h3><span>Saved in this browser only.</span></div>' +
    '<button type="button" class="tm-follow" data-a="tm" data-v="" role="radio" aria-checked="' + (!own) + '"><span class="tm-r" aria-hidden="true"></span><span><b>As ' + esc(sn) + ' set it</b><small>' + themeLabel(themeStudio()) + '</small></span></button>' +
    '<div class="tm-grid" role="radiogroup" aria-label="Appearance">' + rows.map(function (r) {
      var on = sel === r.id;
      return '<button type="button" class="tm-o" data-a="tm" data-v="' + (r.id || 'auto') + '" role="radio" aria-checked="' + on + '"><span class="tm-pic">' + r.pic + '</span><span class="tm-n">' + esc(r.name) + '</span></button>';
    }).join('') + '</div>';
  var t = sel ? THEME_CARDS.filter(function (x) { return x.id === sel; })[0] : null;
  if (t && t.pal && t.pal.length) {
    h += '<div class="tm-tones"><p>Color tone</p><div class="tm-sws" role="radiogroup" aria-label="Color tone">' + [{ id: '', name: t.pal0 || 'Studio color', v: t.v }].concat(t.pal).map(function (q) {
      var on = (tp[1] || '') === q.id;
      return '<button type="button" class="tm-s" data-a="tm" data-v="' + t.id + (q.id ? '.' + q.id : '') + '" role="radio" aria-checked="' + on + '"><span class="tm-dot" style="' + esc('--p:' + q.v.page + ';--a:' + q.v.acc) + '" aria-hidden="true"><i></i></span><span>' + esc(q.name) + '</span></button>';
    }).join('') + '</div></div>';
  }
  m.innerHTML = h;
}
/* v: '' follows the studio; "auto"; "<theme>" (keeps its palette when it is the same theme); "<theme>.<palette>" */
function pickTheme(v) {
  var own = themeOwn(), cur = themeOf(own === 'auto' ? '' : own);
  if (v && v !== 'auto' && v.indexOf('.') < 0 && cur[0] === v) v = themeStr(cur);
  if (v) lsSet('sd-portal-own', v); else { try { localStorage.removeItem('sd-portal-own'); } catch (e) { } }
  applyTheme(); paintThemeMenu();
  var f = $('#tmenu [aria-checked="true"].tm-s') || $('#tmenu [aria-checked="true"].tm-o') || $('#tmenu [aria-checked="true"]'); if (f) f.focus({ preventScroll: true });
}
