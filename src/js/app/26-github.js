  /* ───────── v64: GitHub. A pull request or an issue is linked to a piece of work, and its state moves the work: opened, the work is
     Doing; merged (or the issue closed as done), it goes for review, or is Done when it is your own. Nothing is typed twice.
     Public repositories need nothing. A token for private ones stays in this browser (CONTRACT.md, section 23) ───────── */
  var X9_API = 'https://api.github.com', X9_LS = 'sd-gh', X9_MAX = 5;
  var X9 = { tok: '', login: '', left: -1, reset: 0, busy: false, msg: '', last: 0, timer: 0, said: [] };
  (function () { try { var o = JSON.parse(localStorage.getItem(X9_LS) || 'null'); if (o && typeof o.tok === 'string') { X9.tok = o.tok; X9.login = String(o.login || ''); } } catch (e) {} })();
  function x9Store() { try { if (X9.tok) localStorage.setItem(X9_LS, JSON.stringify({ tok: X9.tok, login: X9.login })); else localStorage.removeItem(X9_LS); } catch (e) {} }
  var X9_NM = { open: 'Open', draft: 'Draft', merged: 'Merged', closed: 'Closed', done: 'Closed', dropped: 'Not planned', gone: 'Not found' };
  var X9_FINAL = { merged: 1, closed: 1, done: 1, dropped: 1 };

  /* github.com/o/r/pull/12, github.com/o/r/issues/12, or o/r#12 */
  function x9Parse(s) {
    s = String(s || '').trim();
    var m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(pull|pulls|issues)\/(\d+)/i);
    if (m) return { o: m[1], r: m[2], k: /^pull/i.test(m[3]) ? 'pull' : 'issue', n: +m[4] };
    m = s.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
    if (m) return { o: m[1], r: m[2], k: '', n: +m[3] };
    return null;
  }
  function x9Key(e) { return (e.o + '/' + e.r + '#' + e.n).toLowerCase(); }
  function x9Url(e) { return 'https://github.com/' + e.o + '/' + e.r + '/' + (e.k === 'pull' ? 'pull' : 'issues') + '/' + e.n; }
  function x9Short(e) { return (e.k === 'pull' ? 'PR ' : 'Issue ') + '#' + e.n; }
  function x9Rec(p, id) { return p.kind === 'private' ? prvById(p.pv.items, id) : (p.work || {})[id]; }
  function x9RecW(p, id) { if (p.kind === 'private') return prvById(p.pv.items, id); var w = p.work || (p.work = {}); return w[id] || (w[id] = { as: '', st: 'todo', stk: '' }); }
  /* a GitHub page title, without the parts GitHub adds */
  function x9Title(t) {
    t = String(t || '').replace(/\s+·\s+GitHub$/, '');
    var m = t.match(/^(.*?) by [\w-]+ · Pull Request #\d+/) || t.match(/^(.*?) · (?:Issue|Pull Request) #\d+/);
    return (m ? m[1] : t).trim().slice(0, 140);
  }
  /* can this device write to this piece of work? The Owner can; an Editor only to their own or free work; a Viewer never */
  function x9Can(p, u) { var r = x8Role(p); return r === 'Owner' || (r === 'Editor' && (!u.as || u.as === 'You')); }

  /* ---- reading GitHub ---- */
  async function x9Get(path, tok) {
    var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, t = tok === undefined ? X9.tok : tok;
    if (t) h.Authorization = 'Bearer ' + t;
    var r;
    try { r = await fetch(X9_API + path, { headers: h, cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer' }); }
    catch (e) { return { s: 0, j: null }; }
    var left = r.headers.get('x-ratelimit-remaining'), reset = r.headers.get('x-ratelimit-reset');
    if (left !== null) { X9.left = +left; X9.reset = (+reset || 0) * 1000; }
    var j = null; try { j = await r.json(); } catch (e) {}
    return { s: r.status, j: j };
  }
  function x9Limited() { return X9.left === 0 && X9.reset > Date.now(); }
  function x9Checks(runs) {
    if (!runs || !runs.length) return '';
    if (runs.some(function (c) { return /^(failure|timed_out|cancelled|action_required|startup_failure)$/.test(c.conclusion || ''); })) return 'fail';
    if (runs.some(function (c) { return c.status !== 'completed'; })) return 'pending';
    return 'pass';
  }
  /* one link, read fresh. Answers the new fields, or { err } */
  async function x9Fetch(e) {
    var base = '/repos/' + encodeURIComponent(e.o) + '/' + encodeURIComponent(e.r), r, j, out = {};
    if (e.k !== 'pull') {
      r = await x9Get(base + '/issues/' + e.n);
      if (r.s !== 200) return { err: r.s };
      j = r.j;
      if (!j.pull_request) return { k: 'issue', t: j.title || '', by: (j.user || {}).login || '', st: j.state === 'open' ? 'open' : j.state_reason === 'not_planned' ? 'dropped' : 'done', ck: '', mg: 0 };
      out.k = 'pull';
    }
    r = await x9Get(base + '/pulls/' + e.n);
    if (r.s !== 200) return { err: r.s };
    j = r.j;
    out.k = 'pull'; out.t = j.title || ''; out.by = (j.user || {}).login || '';
    out.st = j.merged_at ? 'merged' : j.state === 'closed' ? 'closed' : j.draft ? 'draft' : 'open';
    out.mg = j.merged_at ? Date.parse(j.merged_at) || Date.now() : 0;
    out.ck = '';
    /* v69: a merged pull request keeps its checks too: they are part of what verifies the work (CONTRACT.md, section 31) */
    if (out.st === 'open' || out.st === 'draft' || out.st === 'merged') {
      var sha = (j.head || {}).sha;
      if (sha) { var c = await x9Get(base + '/commits/' + sha + '/check-runs?per_page=100'); if (c.s === 200 && c.j) out.ck = x9Checks(c.j.check_runs); }
    }
    return out;
  }

  /* ---- the work follows the link ---- */
  /* only on a change of state, so moving the work by hand afterwards is never fought */
  function x9Move(p, u, e) {
    if (e.ap === e.st || !x9Can(p, u)) { e.ap = e.st; return ''; }
    e.ap = e.st;
    var ti = prvT(u.t, 40), show = wkShow(u), sh = x9Short(e);
    if ((e.st === 'open' || e.st === 'draft') && show === 'todo') {
      wkSet(p, u.id, { st: 'doing', sn: u.sn || u.t });
      pdNote(p, sh + ' was opened, so “' + ti + '” is now Doing');
      return '“' + ti + '” is Doing: ' + sh + ' is open';
    }
    if ((e.st === 'merged' || e.st === 'done') && u.st !== 'done' && show !== 'review') {
      var others = (x9Rec(p, u.id).gh || []).some(function (x) { return x !== e && (x.st === 'open' || x.st === 'draft'); });
      if (others) return '';
      var own = x8Role(p) === 'Owner' && (!p.team.length || !u.as || u.as === 'You');
      wkSet(p, u.id, own ? { st: 'done', stk: '', wc: null, sn: u.sn || u.t } : { st: 'review', stk: '', wc: null, sn: u.sn || u.t });
      pdNote(p, sh + (e.st === 'merged' ? ' was merged' : ' was closed') + ', so “' + ti + '” ' + (own ? 'is done' : 'went for review'));
      /* v69: merged is Done, not Verified; what is still open shows beside the work and in Needs (section 31) */
      return '“' + ti + '” ' + (own ? 'is done' : 'is in review') + ': ' + sh + (e.st === 'merged' ? ' was merged' : ' was closed');
    }
    return '';
  }
  /* every linked piece of work this device may refresh */
  function x9All() {
    var out = [];
    PROJECTS.forEach(function (p) {
      if (p.x8 && x8Role(p) === 'Viewer') return;
      wkUnits(p).forEach(function (u) { var r = x9Rec(p, u.id); if (r && r.gh && r.gh.length && x9Can(p, u)) r.gh.forEach(function (e) { out.push({ p: p, u: u, e: e }); }); });
    });
    return out;
  }
  async function x9Round(force, only) {
    if (x9Limited()) return;
    if (X9.busy) { if (only) X9.pend = (X9.pend || []).concat(only); return; }   // a link made during a check is read right after it
    X9.busy = true; X9.said = [];
    var now = Date.now(), age = X9.tok ? 5 * 60000 : 15 * 60000, n = 0, touched = [];
    var l = only ? only : x9All().filter(function (x) { return force || !x.e.ts || ((!X9_FINAL[x.e.st] || x.e.ck === 'pending') && now - x.e.ts > age); });
    try {
      for (var i = 0; i < l.length && n < 15; i++) {
        var x = l[i], f = await x9Fetch(x.e); n++;
        if (f.err) {
          if (f.err === 403 || f.err === 429) { if (x9Limited() || f.err === 429) { X9.msg = 'limit'; break; } }
          if (f.err === 401) { X9.msg = 'token'; break; }
          if (f.err === 404) { x.e.st = 'gone'; x.e.ts = Date.now(); touched.push(x.p); }
          continue;
        }
        var was = x9S(x.e);
        Object.keys(f).forEach(function (k) { x.e[k] = f[k]; }); x.e.ts = Date.now();
        var m = x9Move(x.p, wkUnit(x.p, x.u.id) || x.u, x.e); if (m) X9.said.push(m);
        if (m || was !== x9S(x.e)) touched.push(x.p);
      }
      if (X9.msg === 'limit' && !x9Limited()) X9.msg = '';
    } finally { X9.busy = false; X9.last = Date.now(); }
    if (X9.pend && X9.pend.length) { var nx = X9.pend; X9.pend = null; setTimeout(function () { x9Round(true, nx); }, 0); }
    var seen = []; sdUTNow();
    touched.forEach(function (p) { if (seen.indexOf(p) > -1) return; seen.push(p); wkAfter(p); pdTouch(p); });
    if (seen.length) x9Paint();
    if (X9.said.length && !pendingUndo) showToast(X9.said.length === 1 ? X9.said[0] : 'GitHub moved ' + X9.said.length + ' items');
    if (curView === 'settings') x9StPaint();
  }
  function x9S(e) { return [e.st, e.ck, e.t, e.k, e.by].join('|'); }
  function x9Paint() {
    if (pd.p && curView === 'project' && !syTyping()) pdRerender();
    dbPriority(); mwBadge(); dbNotif(); tdRender();
    if (curView === 'mywork') mwRender();
  }

  /* ---- on the rows ---- */
  function x9Chip(e, mini) {
    var st = e.st || 'new', ck = e.ck === 'fail' ? ' · Checks failing' : e.ck === 'pending' && !mini ? ' · Checks running' : '';
    var lbl = e.st ? X9_NM[e.st] : 'Checking…', tip = e.o + '/' + e.r + '#' + e.n + (e.t ? ': ' + e.t : '') + (e.by ? ' · by @' + e.by : '') + (e.st === 'gone' ? '. GitHub did not show it. A private repository needs a token in Settings › GitHub.' : '');
    return '<a class="x9-c ' + st + (e.ck ? ' ck-' + e.ck : '') + '" href="' + esc(x9Url(e)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(tip) + '">' + IC(e.k === 'pull' ? 'pr' : 'issue') + '<span>#' + e.n + '</span><em>' + esc(lbl + ck) + '</em></a>';
  }
  function x9Chips(p, u) { var r = x9Rec(p, u.id); return r && r.gh ? r.gh.map(function (e) { return x9Chip(e); }).join('') : ''; }
  function x9Mini(p, id) { var r = x9Rec(p, id); return r && r.gh && r.gh.length ? '<span class="x9-mini">' + r.gh.map(function (e) { return x9Chip(e, true); }).join('') + '</span>' : ''; }
  function x9AddBtn(p, u, mwr) {
    if (!x9Can(p, u) || u.st === 'done') return '';
    var r = x9Rec(p, u.id), has = r && r.gh && r.gh.length;
    return '<button type="button" class="x9-add' + (has ? ' has' : '') + '" ' + (mwr ? 'data-mw="x9add" data-pj="' + esc(p.id) + '"' : 'data-pd="x9:add"') + ' data-id="' + esc(u.id) + '" aria-label="' + (has ? 'Change the GitHub links of ' : 'Link a pull request or issue to ') + esc(u.t) + '" title="Link a pull request or issue">' + IC('pr') + '</button>';
  }
  function x9FormHTML(p, u, mwr, q) {
    var r = x9Rec(p, u.id), l = (r && r.gh) || [], pj = mwr ? ' data-pj="' + esc(p.id) + '"' : '';
    var fa = mwr ? 'data-mw-form="gh"' : 'data-pd-form="wk:gh"', cancel = mwr ? 'data-mw="cancel" data-pj="' + esc(p.id) + '"' : 'data-pd="wk:cancel"';
    var h = '<li class="prv-fw"><form class="prv-f wk-sf x9-f" ' + fa + pj + ' data-id="' + esc(u.id) + '" novalidate><p class="x7-fh">' + IC('pr') + '<span>GitHub for “' + esc(prvT(u.t, 60)) + '”. Its state moves this item for you.</span></p>';
    if (l.length) h += '<ul class="x9-fl">' + l.map(function (e, i) { return '<li>' + x9Chip(e) + '<span class="x9-ft">' + esc(e.t || e.o + '/' + e.r) + '</span><button type="button" class="icon-sm xs" ' + (mwr ? 'data-mw="x9rm" data-pj="' + esc(p.id) + '"' : 'data-pd="x9:rm"') + ' data-id="' + esc(u.id) + '" data-i="' + i + '" aria-label="Unlink ' + esc(x9Short(e)) + '">' + IC('x') + '</button></li>'; }).join('') + '</ul>';
    if (l.length < X9_MAX) h += '<label class="sr-only" for="x9-u">Pull request or issue</label><input id="x9-u" name="u" maxlength="300" placeholder="Paste a pull request or issue link, or owner/repo#12" autocomplete="off" inputmode="url">';
    h += '<p class="x9-hint">Opened: Doing. Merged: ' + (x8Role(p) === 'Owner' && (!p.team.length || !u.as || u.as === 'You') ? 'Done' : 'In review') + '. Closed without merging: it says so, and nothing moves.</p>';
    return h + '<div class="f-acts"><button type="button" class="btn-ghost btn-sm" ' + cancel + '>' + (l.length >= X9_MAX ? 'Close' : 'Cancel') + '</button>' + (l.length < X9_MAX ? '<button type="submit" class="btn-primary btn-sm">Link</button>' : '') + '</div>' + prvErrSpan() + '</form></li>';
  }
  /* link one: written at once, read from GitHub right after */
  function x9Link(p, id, raw, title) {
    var u = wkUnit(p, id), r = u ? x9RecW(p, id) : null, e = x9Parse(raw);
    if (!u || !r) return { err: 'That item is gone.' };
    if (!e) return { err: 'Paste a GitHub pull request or issue link, like github.com/owner/repo/pull/12.' };
    r.gh = r.gh || [];
    var dup = r.gh.filter(function (x) { return x9Key(x) === x9Key(e); })[0];
    if (dup) return { err: '', dup: true, e: dup };
    if (r.gh.length >= X9_MAX) return { err: 'Five links is the most an item can have.' };
    if (!e.k) e.k = 'issue';
    e.at = Date.now(); e.ts = 0; e.st = ''; e.ck = ''; e.t = title ? x9Title(title) : ''; e.ap = '';
    r.gh.push(e);
    pdNote(p, 'You linked ' + e.o + '/' + e.r + '#' + e.n + ' to “' + prvT(u.t, 40) + '”');
    pdTouch(p);
    var one = { p: p, u: u, e: e };
    setTimeout(function () { x9Round(true, [one]); }, 30);
    return { err: '', e: e };
  }
  function x9Submit(f, h, p, u) {
    var q = h.q(), v = f.elements.u ? f.elements.u.value : '';
    if (!String(v).trim()) { q.sk = null; q.sf = ''; return h.re(h.sel(p, u.id) + ' .x9-add'); }
    var r = x9Link(p, u.id, v);
    if (r.err) return prvErr(f, 'u', r.err);
    q.sk = null; q.sf = '';
    wkAfter(p); h.re(h.sel(p, u.id) + ' .x9-add');
    showToast(r.dup ? x9Short(r.e) + ' is already linked' : 'Linked ' + r.e.o + '/' + r.e.r + '#' + r.e.n + '. Reading it from GitHub…');
  }
  function x9Unlink(p, id, i, h) {
    var r = x9Rec(p, id), u = wkUnit(p, id); if (!r || !r.gh || !r.gh[i] || !u) return;
    var e = r.gh[i];
    wkApply(p, function () { r.gh.splice(i, 1); }, 'You unlinked ' + e.o + '/' + e.r + '#' + e.n + ' from “' + prvT(u.t, 40) + '”', x9Short(e) + ' unlinked', h.sel(p, id) + ' .x9-add', id, h);
  }
  function x9Open(p, id, h) {
    var u = wkUnit(p, id); if (!u) return;
    if (!x9Can(p, u)) { x8No(p); return; }
    var q = h.q(); q.sk = h.key(p, id); q.sf = 'gh'; h.re('#x9-u');
  }

  /* ---- Needs and the bell: only what someone has to act on ---- */
  function x9Needs(p) {
    var out = [], cl = [], fl = [];
    wkUnits(p).forEach(function (u) {
      if (u.st === 'done' || !x9Can(p, u)) return;
      var r = x9Rec(p, u.id); (r && r.gh || []).forEach(function (e) { if (e.st === 'closed') cl.push({ u: u, e: e }); else if (e.ck === 'fail' && (e.st === 'open' || e.st === 'draft')) fl.push({ u: u, e: e }); });
    });
    var tab = p.team.length ? 'team' : p.kind === 'private' ? 'scope' : 'team';
    if (cl.length) out.push({ t: cl.length === 1 ? 'A pull request was closed without merging' : cl.length + ' pull requests were closed without merging', p: '“' + prvT(cl[0].u.t, 40) + '”: ' + cl[0].e.o + '/' + cl[0].e.r + '#' + cl[0].e.n + '. Reopen it, link another, or change the item.', chip: 'warn', chipT: 'PR closed', tab: tab, f: p.team.length ? 'wk' : '' });
    if (fl.length) out.push({ t: fl.length === 1 ? 'Checks failing on a pull request' : 'Checks failing on ' + fl.length + ' pull requests', p: '“' + prvT(fl[0].u.t, 40) + '”: ' + fl[0].e.o + '/' + fl[0].e.r + '#' + fl[0].e.n + '.', chip: 'crit', chipT: 'Checks', tab: tab, f: p.team.length ? 'wk' : '' });
    return out;
  }
  function x9Notes(out) {
    PROJECTS.forEach(function (p) {
      if (p.x8 && p.x8.wait) return;
      var go = { pid: p.id, tab: p.team.length ? 'team' : p.kind === 'private' ? 'scope' : 'team', f: p.team.length ? 'wk' : '', cr: '' }, nm = dbName(p);
      wkUnits(p).forEach(function (u) {
        if (!(u.as === 'You' || !p.team.length || x8Role(p) === 'Owner' && u.st === 'review')) return;
        var r = x9Rec(p, u.id); (r && r.gh || []).forEach(function (e) {
          var id = p.id + ':' + u.id + ':' + x9Key(e);
          if (e.st === 'merged' && e.mg && Date.now() - e.mg < 14 * X6_DAY) out.push({ key: 'x9m:' + id, tone: '', title: 'Pull request merged', text: x9Short(e) + ' for “' + prvT(u.t, 50) + '”' + (u.st === 'review' ? '. It is in review.' : '.'), meta: nm, ts: e.mg, go: go });
          if (e.ck === 'fail' && (e.st === 'open' || e.st === 'draft') && u.st !== 'done') out.push({ key: 'x9f:' + id + ':' + Math.floor((e.ts || 0) / 36e5), tone: 'crit', title: 'Checks failing', text: x9Short(e) + ' for “' + prvT(u.t, 50) + '”.', meta: nm, ts: e.ts || Date.now(), go: go });
          if (e.st === 'closed' && u.st !== 'done') out.push({ key: 'x9c:' + id, tone: 'warn', title: 'Closed without merging', text: x9Short(e) + ' for “' + prvT(u.t, 50) + '”.', meta: nm, ts: e.ts || Date.now(), go: go });
        });
      });
    });
  }

  /* ---- Settings › GitHub ---- */
  function x9StPaint() {
    var b = document.getElementById('gh-body'), pill = document.getElementById('gh-pill'), dot = document.getElementById('st-pd-github'); if (!b) return;
    var n = 0; PROJECTS.forEach(function (p) { wkUnits(p).forEach(function (u) { var r = x9Rec(p, u.id); n += r && r.gh ? r.gh.length : 0; }); });
    pill.innerHTML = X9.tok ? '<i class="pd ok"></i>@' + esc(X9.login || 'connected') : '<i class="pd off"></i>Public repositories';
    if (dot) dot.className = 'pd ' + (X9.tok ? 'ok' : 'off') + ' st-pd';
    var lim = x9Limited() ? '<p class="x9-warn">' + IC('clock') + '<span>GitHub’s limit for this hour is used up. Links update again at ' + esc(new Date(X9.reset).toTimeString().slice(0, 5)) + '.' + (X9.tok ? '' : ' A token raises the limit from 60 to 5,000 an hour.') + '</span></p>' : X9.msg === 'token' ? '<p class="x9-warn crit">' + IC('x') + '<span>GitHub no longer accepts the token. Add a new one.</span></p>' : '';
    var links = n ? n + (n === 1 ? ' link' : ' links') + ' across your projects' + (X9.last ? ' · checked ' + esc(x8Ago(X9.last)) : '') : 'None yet. Link one from a piece of work in Team or My work.';
    var h = '<p class="sy-p">Link a pull request or an issue to a piece of work: on the work’s row, or from its GitHub page with the extension. Opened, the work is Doing. Merged, it goes for review, or is Done when it is your own.</p>';
    h += '<dl class="cd-dl">' + (X9.tok ? '<div><dt>Account</dt><dd>@' + esc(X9.login) + '</dd></div>' : '') + '<div><dt>Links</dt><dd>' + links + '</dd></div><div><dt>Repositories</dt><dd>' + (X9.tok ? 'Public, and the private ones @' + esc(X9.login) + ' can see' : 'Public only') + '</dd></div>' + (X9.left > -1 ? '<div><dt>This hour</dt><dd>' + X9.left.toLocaleString('en-US') + ' requests left</dd></div>' : '') + '</dl>' + lim;
    if (X9.tok) h += '<p class="sy-p">The token stays in this browser. It is never synced to your team, never exported, never sent to your server.</p><div class="sy-acts">' + (n ? '<button type="button" class="btn-ghost btn-sm" id="gh-now">Check links now</button>' : '') + '<button type="button" class="btn-ghost btn-sm" id="gh-rm">Remove token</button></div>';
    else h += '<form class="x9-tok" id="gh-f" novalidate><label for="gh-t"><b>Private repositories</b><small>Add a fine-grained personal access token with read-only access to Pull requests, Issues and Checks. It stays in this browser: never synced to your team, never exported, never sent to your server.</small></label><div class="x9-tr"><input id="gh-t" name="t" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" aria-describedby="gh-err"><button type="submit" class="btn-primary btn-sm">Connect</button></div><p class="err" role="alert" id="gh-err"></p></form>' + (n ? '<div class="sy-acts"><button type="button" class="btn-ghost btn-sm" id="gh-now">Check links now</button></div>' : '');
    b.innerHTML = h;
  }
  async function x9Connect(tok) {
    var e = document.getElementById('gh-err'), btn = document.querySelector('#gh-f [type="submit"]');
    tok = String(tok || '').trim();
    if (!/^(github_pat_|ghp_|gho_|ghu_)[\w]{20,}$/.test(tok)) { if (e) e.textContent = 'That does not look like a GitHub token. It starts with github_pat_ or ghp_.'; return; }
    if (btn) btn.disabled = true;
    var r = await x9Get('/user', tok);
    if (btn) btn.disabled = false;
    if (r.s !== 200 || !r.j || !r.j.login) { if (e) e.textContent = r.s === 401 ? 'GitHub did not accept that token.' : r.s === 0 ? 'Could not reach GitHub.' : 'GitHub answered ' + r.s + '. Try again.'; return; }
    X9.tok = tok; X9.login = r.j.login; X9.msg = ''; x9Store(); x9StPaint();
    showToast('Connected to GitHub as @' + X9.login);
    x9Round(true);
  }
  function x9StInit() {
    var b = document.getElementById('gh-body'); if (!b) return;
    b.addEventListener('submit', function (ev) { if (ev.target.id !== 'gh-f') return; ev.preventDefault(); x9Connect(ev.target.elements.t.value); });
    b.addEventListener('click', function (ev) {
      var t = ev.target.closest('button'); if (!t) return;
      if (t.id === 'gh-rm') { X9.tok = ''; X9.login = ''; X9.left = -1; x9Store(); x9StPaint(); showToast('GitHub token removed from this browser'); }
      else if (t.id === 'gh-now') { t.disabled = true; x9Round(true).then(function () { x9StPaint(); if (!X9.said.length) showToast('Links checked'); }); }
    });
    b.addEventListener('input', function () { var e = document.getElementById('gh-err'); if (e) e.textContent = ''; });
  }

  /* ---- the extension: open work it can attach a GitHub page to, and the attaching ---- */
  function x9Pub(p) {
    return wkUnits(p).filter(function (u) { return u.st !== 'done' && x9Can(p, u); }).sort(function (a, b) { return (b.as === 'You') - (a.as === 'You'); }).slice(0, 40).map(function (u) { return { id: u.id, t: prvT(u.t, 80), mine: u.as === 'You' || !p.team.length }; });
  }
  function x9Cx(c, p) {
    var u = wkUnit(p, c.ref);
    if (!u) return cxApply({ kind: 'link', pid: p.id, t: c.title, u: c.u, title: c.title });
    if (!x9Can(p, u)) return { msg: 'Only ' + x8Own1(p) + ' can link that item. Saved nothing.' };
    var r = x9Link(p, u.id, c.u, c.title);
    if (r.err) return { msg: r.err };
    if (r.dup) return { msg: x9Short(r.e) + ' was already linked to “' + prvT(u.t, 40) + '”' };
    wkAfter(p); x9Paint();
    var e = r.e;
    return { msg: 'Linked ' + x9Short(e) + ' to “' + prvT(u.t, 40) + '”', undo: function () { var rr = x9Rec(p, u.id), i = rr && rr.gh ? rr.gh.indexOf(e) : -1; if (i > -1) rr.gh.splice(i, 1); wkAfter(p); x9Paint(); } };
  }

  function x9Init() {
    x9StInit(); x9StPaint();
    setTimeout(function () { x9Round(false); }, 2500);
    setInterval(function () { if (document.visibilityState === 'visible') x9Round(false); }, 5 * 60000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') x9Round(false); });
    if (sdTest()) window.__x9 = { round: function (f) { return x9Round(f !== false); }, state: function () { return { tok: !!X9.tok, login: X9.login, left: X9.left, msg: X9.msg }; }, link: function (pid, id, s, t) { var p = pdById(pid); var r = x9Link(p, id, s, t); x9Paint(); return r.err || ''; }, parse: x9Parse };
  }

