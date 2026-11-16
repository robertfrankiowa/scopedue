  /* ---------- project detail ---------- */
  /* a private project is either a product you build for a market, or internal work. Only a product has Market */
  var PD_ORDER = {
    client: ['workspace', 'scope', 'delivery', 'change', 'evidence', 'history', 'team'],
    product: ['workspace', 'market', 'scope', 'decisions', 'feedback', 'history', 'team'],
    internal: ['workspace', 'scope', 'decisions', 'feedback', 'history', 'team']   /* v119 (87): no Validate; its open questions and sources are on Decisions */
  };
  /* tabs that used to exist. An old link, or a Needs row that names one, lands where that content lives now */
  var PD_ALIAS = { client: 'workspace', parking: 'scope' };
  function pdTabKey(k) { return PD_ALIAS[k] || k; }
  var PD_LABEL = { workspace: 'Overview', client: 'Overview', scope: 'Scope', delivery: 'Delivery', change: 'Changes', evidence: 'Evidence', history: 'Activity', team: 'Team', market: 'Validate', parking: 'Scope', decisions: 'Decisions', feedback: 'Feedback' };
  var PD_DESC = {
    'client.workspace': 'Your focus, what needs you, and where things stand with the client.',
    'client.scope': 'What is included, issued as a trusted version for the client to approve.',   // v116: one line each
    'client.delivery': 'Each milestone as agreed, and the clocks the agreement runs.',
    'client.change': 'Each request against the trusted version, kept exactly as sent.',
    'client.evidence': 'What the client said or sent, sealed. Originals stay private until you share a copy.',
    'client.history': 'Everything that happened on this project, newest first.',
    'client.team': 'Who is doing what, how far along it is, and who can open this project.',
    'private.workspace': 'Why this project exists, your focus and next step, and what needs you.',
    'private.market': 'Find out whether this is worth building: what already exists, who covers it, and what real people do when you test it.',
    'internal.decisions': 'Your principles and the reasoning behind important choices, what you still need to find out, and the sources you rely on. Scope calls from the Gate are recorded here.',
    'norel.scope': 'Park ideas, then decide what you work on now, what can wait, and what you will never build.',
    'private.scope': 'Park ideas, then decide what ships in this release, what waits for the next one, and what you will never build.',
    'private.decisions': 'Keep your principles and the reasoning behind important choices. Scope calls from the Gate are recorded here.',
    'private.feedback': 'What the people who will use it asked for, reported, tested and approved. You record it in their name.',
    'private.history': 'How this project evolved, newest first. A number beside a mark on the chart counts the events it holds.',
    'private.team': 'Who is doing what, how far along it is, and who can open this project.'
  };
  /* v97 (44): an internal project's own words where it has them */
  function pdDesc(p, tab) {
    if (p.kind === 'private' && tab === 'scope' && !prvRelOn(p)) return PD_DESC['norel.scope'];   /* v97 (43): no release planned */
    return (p.kind === 'private' && pdMode(p) === 'internal' && PD_DESC['internal.' + tab]) || PD_DESC[p.kind + '.' + tab];
  }
  var PD_PHASES = ['Scoping', 'Design', 'Build', 'Review', 'Handoff'];
  /* the five steps depend on what the project is: client work ends in a handoff, a product in growth, internal work in use */
  var PD_PHASE_SET = { client: PD_PHASES, product: ['Idea', 'Validate', 'Build', 'Launch', 'Grow'], internal: ['Plan', 'Draft', 'Build', 'Review', 'In use'] };
  /* a product's phase follows its stage; client and internal work move their phase by hand */
  function pdPhaseN(p) { if (agV2(p)) return agPhaseN(p); return pdMode(p) === 'product' && p.pv ? pfPhaseN(p) : Math.max(1, Math.min(5, p.phase || 1)); }
  function pdPhase(p) { if (agV2(p)) return agPhaseT(p); if (p.pv && p.pv.stop) return 'Stopped'; var set = PD_PHASE_SET[pdMode(p)] || PD_PHASES; return set[pdPhaseN(p) - 1]; }
  var PD_NEED_TAB = { 'Project deadline approaching': 'scope', 'Project deadline passed': 'scope', 'Respond to change request question': 'change', 'Respond to change request': 'change', 'Review change request response': 'change', 'Review current focus': 'workspace', 'Assign next step': 'team' };
  var ME = { n: 'You', ini: 'SU', c: '#24365a', role: 'Owner' };
  var PD_COLORS = ['#4b6a9f', '#3d5a8f', '#2f4a7a', '#566f9c'];
  var PD_DRIVE = 'https://drive.google.com/';

  var PROJECTS = SDBOOT.pick('project') || [];
  PROJECTS.forEach(function (p) { p.due = p.dueAt ? dueInfo(p.dueAt) : null; });
  PROJECTS.forEach(function (p) { p.team.forEach(function (m) { m.fresh = false; }); });
  function pdById(id) { return PROJECTS.filter(function (p) { return p.id === id; })[0]; }
  function pdName(id) { var p = pdById(id); return p ? p.n : ''; }
  /* A record from before modes existed says nothing: a project that has market work, or was started with a market check, is a product */
  function pdMode(p) {
    if (p.kind === 'client') return 'client';
    if (p.mode === 'product' || p.mode === 'internal') return p.mode;
    var pv = p.pv; return pv && (pv.mk || pv.jobs.length || pv.comps.length || pv.src.length) ? 'product' : 'internal';
  }
  /* v119 (87): where a project's sources are: Validate for a product, Decisions for internal work */
  function prvSrcTab(p) { return pdMode(p) === 'internal' ? 'decisions' : 'market'; }
  /* jobs only count where Market is shown. Internal work is never asked which job it answers */
  function prvJobs(p) { return pdMode(p) === 'product' ? p.pv.jobs : []; }
  var PD_MODE_NM = { client: 'Client project', product: 'Product', internal: 'Internal project' };
  function pdSub(p) { return PD_MODE_NM[pdMode(p)] + ' · ' + (p.team.length ? 'Team' : 'Solo'); }
  function pdVisible(p) { var eh = (p.dv || p.x8) && x8Role(p) !== 'Owner' ? p.eh || {} : {}; return PD_ORDER[pdMode(p)].filter(function (k) { return (k !== 'team' || p.team.length > 0) && (k !== 'delivery' || agV2(p)) && (k !== 'feedback' || fbShow(p)) && !eh[k]; }); }   /* v72: a tab the Owner keeps from Editors */
  function pdPeople(p) { return [ME].concat(p.team); }
  function pdAv(m, extra) { return '<span class="av' + (m === ME ? ' me' : '') + (extra ? ' ' + extra : '') + '" style="--c:' + m.c + '" title="' + esc(m.n) + '">' + esc(m.ini || initials(m.n)) + '</span>'; }
  function pdTicks(n) { var t = ''; for (var i = 1; i <= 5; i++) t += '<i' + (i <= n ? ' class="on"' : '') + '></i>'; return '<span class="ticks" aria-hidden="true">' + t + '</span>'; }
  /* ---------- shell ---------- */
  var pdBar = document.getElementById('pd-bar'), pdTabs = document.getElementById('pd-tabs'), pdInd = document.getElementById('pd-ind');
  var pdPanel = document.getElementById('pd-panel'), pdLine = document.getElementById('pd-line'), pdLive = document.getElementById('pd-live');
  var pdMenu = document.getElementById('pd-menu'), pdMore = document.getElementById('pd-more'), pdHead = document.getElementById('pd-head');
  var pd = { p: null, tab: 'workspace', back: null, edit: null, adding: false, scroll: {}, stuck: false, ie: null, as: null, view: null, cr: null, crf: 'open', sim: false, just: '', ev: null, evf: 'all', evn: 8, evr: null, prep: null, clf: 'all', hf: 'all', hn: 12, pv: null, wk: null };

  var pdLineK = '';
  function pdLineHTML(p, fresh) {
    var md = pdMode(p), c = p.kind === 'client' ? byId(p.cid) || {} : null, ph = esc(pdPhase(p)), n = pdPhaseN(p), pv = p.pv, set = PD_PHASE_SET[md] || PD_PHASES;
    var kind = c ? '<button type="button" class="kind client pd-cl" data-pdh="client" title="Open the client page">' + IC('share') + '<span>' + esc(c.name || 'Client') + '</span></button>' :
      '<span class="kind private" title="Private. Only visible inside your workspace">' + IC('lock') + (md === 'product' ? 'Product' : 'Internal') + '</span>';
    var team = '<span class="pd-pill' + (fresh ? ' is-new' : '') + '">' + IC('users') + (p.team.length ? 'Team · ' + (p.team.length + 1) : 'Solo') + '</span>';
    var inner = pdTicks(n) + '<span>' + ph + '</span>';   /* the ticks show n of 5; the label says it to screen readers */
    var phase = agV2(p) ? agPhaseHTML(p) : md === 'product' || (pv && pv.stop) || x8Role(p) !== 'Owner' ? '<span class="pd-phase" role="img" aria-label="Phase ' + n + ' of 5: ' + ph + '">' + inner + '</span>' :
      '<span class="pd-phw"><button type="button" class="pd-phase pd-phb" data-pdh="phase" aria-haspopup="menu" aria-expanded="false" aria-label="Phase ' + n + ' of 5: ' + ph + '. Change the phase">' + inner + IC('chev') + '</button><div class="pd-menu pd-phm" role="menu" aria-label="Phase">' +
      set.map(function (l, i) { return '<button type="button" role="menuitemradio" aria-checked="' + (i + 1 === n) + '" data-ph="' + (i + 1) + '"><span class="pd-phn">' + (i + 1) + '</span>' + esc(l) + '</button>'; }).join('') + '</div></span>';
    var due = !p.due ? '' : '<span class="pd-due">' + (p.due.chip ? '<span class="chip ' + p.due.chip + '">' + esc(p.due.t) + '</span>' : 'Due') + ' ' + esc(p.due.d) + '</span>';
    var flag = pv && pv.stop ? '<span class="chip neutral">Stopped</span>' : md === 'product' && pv && pv.anyway && !pv.go ? '<span class="chip warn" title="Building started without a Go decision">Built without proof</span>' : '';
    return kind + team + x8Chip(p) + phase + due + flag;
  }
  function pdMenuHTML(p) {
    var h = '<button type="button" role="menuitem" data-m="copy">' + IC('link') + 'Copy link to project</button>' +
      /* v137 (114): Copy for AI as a file an assistant reads by itself */
      '<button type="button" role="menuitem" data-m="claude">' + IC('doc') + 'Save as CLAUDE.md</button><button type="button" role="menuitem" data-m="agents">' + IC('doc') + 'Save as AGENTS.md</button>';
    /* v125 (99): a sample's menu holds only what looks: no Drive, no teammate, no kind, language or delete, whatever the moment
       the menu was drawn (the sample's ids may come in after the first draw) */
    if (sdSample(p)) {
      if (p.team.length) h += '<button type="button" role="menuitem" data-m="team">' + IC('users') + 'Manage team</button>';
      if (p.kind === 'client') h += '<button type="button" role="menuitem" data-m="client">' + IC('ext') + 'Open client page</button>';
      else if (pdMode(p) === 'product') h += '<button type="button" role="menuitem" data-m="export">' + IC('copy') + 'Export market data</button>';
      return h + '<hr role="separator"><button type="button" role="menuitem" data-m="back">' + IC('chevl') + 'Back to ' + esc(pd.back ? pd.back.label : 'Projects') + '</button>';
    }
    h += p.team.length || x8Role(p) !== 'Owner' ? '<button type="button" role="menuitem" data-m="team">' + IC('users') + 'Manage team</button>' : '<button type="button" role="menuitem" data-m="invite">' + IC('plus') + 'Add teammate</button>';
    if (p.kind === 'client') h += '<button type="button" role="menuitem" data-m="client">' + IC('ext') + 'Open client page</button>';
    else if (x8Role(p) === 'Owner') {
      var md = pdMode(p);
      h += '<button type="button" role="menuitem" data-m="mode">' + IC('swap') + (md === 'product' ? 'Make it an internal project' : 'Make it a product') + '</button>';
      h += '<button type="button" role="menuitem" data-m="lang">' + IC('chat') + (pjLang(p) === 'vi' ? 'Project language: Tiếng Việt → English' : 'Project language: English → Tiếng Việt') + '</button>';   /* v74 */
      if (md === 'product') h += '<button type="button" role="menuitem" data-m="export">' + IC('copy') + 'Export market data</button>';
    }
    if (dvCan(p) && !p.dv) h += '<button type="button" role="menuitem" data-m="dv">' + IC('folder') + 'Keep in Google Drive</button>';   /* v69, 29.16; v88: client projects too */
    if (pdelCan(p)) h += '<hr role="separator"><button type="button" role="menuitem" class="pd-mdel" data-m="del">' + IC('x') + 'Delete project…</button>';   /* v96 (42): the Owner of a private or client project */
    return h + '<hr role="separator"><button type="button" role="menuitem" data-m="back">' + IC('chevl') + 'Back to ' + esc(pd.back ? pd.back.label : 'Projects') + '</button>';
  }
  function pdRenderShell(p) {
    var mk = document.getElementById('pd-mark'); mk.textContent = p.m; mk.className = 'pj-av pd-mark' + (p.kind === 'private' ? ' priv' : '');
    document.getElementById('pd-title').textContent = p.n;
    document.getElementById('pd-crumb').textContent = p.n;
    document.getElementById('pd-back-t').textContent = pd.back ? pd.back.label : 'Projects';
    var cm = document.getElementById('pd-cond-m'); cm.textContent = p.m; cm.className = 'pj-av' + (p.kind === 'private' ? ' priv' : '');
    document.getElementById('pd-cond-n').textContent = p.n;
    pdLine.innerHTML = pdLineK = pdLineHTML(p);
    pdMenu.innerHTML = pdMenuHTML(p);
  }
  /* One rule for every tab: the number is how many Needs rows lead there, coloured by the most urgent one. Nothing waits, no mark */
  function pdBadgeMap(p) {
    var m = {};
    pdNeeds(p).forEach(function (x) {
      var k = pdTabKey(x.tab || 'workspace'), e = m[k] || (m[k] = { n: 0, s: 0 });
      e.n++; e.s = Math.max(e.s, x.chip === 'crit' ? 2 : x.chip === 'warn' ? 1 : 0);
    });
    return m;
  }
  function pdBadge(p, tab, m) {
    if (tab === 'workspace') return '';
    if (tab === 'feedback') return fbBadge(p);   /* v70: what Viewers said that waits for an answer (32) */
    var e = (m || pdBadgeMap(p))[tab]; if (!e) return '';
    return '<span class="pd-b' + (e.s === 2 ? ' crit' : e.s === 1 ? ' w' : '') + '" aria-hidden="true">' + e.n + '</span><span class="sr-only">, ' + e.n + ' waiting on you</span>';
  }
  function pdTabBtn(p, key, i, m) {
    return '<button type="button" role="tab" class="pd-tab" id="pd-tab-' + key + '" data-tab="' + key + '" aria-selected="false" aria-controls="pd-panel" tabindex="-1" aria-keyshortcuts="' + (i + 1) + '"><span class="pd-tl" data-label="' + PD_LABEL[key] + '">' + PD_LABEL[key] + '</span><span class="pd-bd">' + pdBadge(p, key, m) + '</span></button>';
  }
  function pdRenderTabs(p) {
    [].forEach.call(pdTabs.querySelectorAll('.pd-tab'), function (b) { b.remove(); });
    var m = pdBadgeMap(p);
    pdVisible(p).forEach(function (k, i) { pdTabs.appendChild(htmlEl(pdTabBtn(p, k, i, m))); });
  }
  function pdRefreshBadges(p) {
    mwBadge(); caBadge(); dbWaiting(); dbPriority(); dbNotif();
    var rc = p.kind === 'client' && byId(p.cid); if (rc) refreshRow(rc);
    if (p !== pd.p) return;
    var lh = pdLineHTML(p);
    if (lh !== pdLineK && !pdLine.querySelector('.pd-phm[data-open]')) { pdLine.innerHTML = pdLineK = lh; pdMenu.innerHTML = pdMenuHTML(p); }
    if (!!pdTabs.querySelector('#pd-tab-delivery') !== (pdVisible(p).indexOf('delivery') > -1)) {   /* the agreement came or went: the Delivery tab follows it */
      pdRenderTabs(p);
      if (pdVisible(p).indexOf(pd.tab) < 0) setTimeout(function () { if (pd.p === p) pdSelect('scope', { force: true }); }, 0);
      else { var sb = pdTabs.querySelector('#pd-tab-' + pd.tab); if (sb) { sb.setAttribute('aria-selected', 'true'); sb.tabIndex = 0; } }
    }
    var m = pdBadgeMap(p);
    [].forEach.call(pdTabs.querySelectorAll('.pd-tab'), function (b) { b.querySelector('.pd-bd').innerHTML = pdBadge(p, b.getAttribute('data-tab'), m); });
    pdMoveInd(false);
  }
  function pdSyncTeamTab(p) {
    var cur = pdTabs.querySelector('#pd-tab-team:not(.is-gone)'), want = p.team.length > 0;
    if (want && !cur) {
      var b = htmlEl(pdTabBtn(p, 'team', pdVisible(p).length - 1));
      if (!reduced) { b.classList.add('is-new'); setTimeout(function () { b.classList.remove('is-new'); }, 620); }
      pdTabs.appendChild(b);
    } else if (!want && cur) {
      if (reduced) cur.remove();
      else { cur.classList.add('is-gone'); setTimeout(function () { cur.remove(); pdMoveInd(false); }, 340); }
    } else if (cur) cur.querySelector('.pd-bd').innerHTML = pdBadge(p, 'team');
  }
  function pdMoveInd(animate) {
    var b = pdTabs.querySelector('.pd-tab[aria-selected="true"]'); if (!b) return;
    if (!animate) pdInd.classList.add('no-anim');
    pdInd.style.width = b.offsetWidth + 'px';
    pdInd.style.transform = 'translateX(' + b.offsetLeft + 'px)';
    if (!animate) { void pdInd.offsetWidth; pdInd.classList.remove('no-anim'); }
  }
  function pdReveal(b, smooth) {
    var c = pdTabs; if (c.scrollWidth <= c.clientWidth + 1) return;
    var l = b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2;
    c.scrollTo({ left: Math.max(0, l), behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }
  function pdTbh() { var tb = document.querySelector('.topbar'); return tb ? tb.getBoundingClientRect().height : 69; }
  function pdMeasure() { app.style.setProperty('--tbh', pdTbh() + 'px'); }
  function pdUpdateStuck() {
    if (curView !== 'project') return;
    var s = pdBar.getBoundingClientRect().top <= pdTbh() + 0.5 && window.scrollY > 0;
    if (s !== pd.stuck) { pd.stuck = s; pdBar.classList.toggle('stuck', s); }
  }
  var pdTick = false;
  window.addEventListener('scroll', function () {
    if (curView !== 'project' || pdTick) return;
    pdTick = true; requestAnimationFrame(function () { pdTick = false; pdUpdateStuck(); });
  }, { passive: true });
  window.addEventListener('resize', function () { if (curView === 'project') { pdMeasure(); pdMoveInd(false); pdUpdateStuck(); pdSegs(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (curView === 'project') { pdMoveInd(false); pdSegs(); } });

  /* ---------- hash (internal; deep links survive reloads only when the host keeps the fragment) ---------- */
  function pdSetHash() { try { var h = '#pj-' + pd.p.id + '-' + pd.tab; if (location.hash !== h) history.replaceState(null, '', h); } catch (e) {} }
  function pdClearHash() { try { if (/^#pj-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  function pdFromHash() {
    var m = /^#pj-([a-z0-9-]+?)(?:-(workspace|client|scope|delivery|change|evidence|history|team|market|parking|decisions|feedback))?$/.exec(location.hash || '');
    if (m && pdById(m[1])) { openProject(m[1], m[2] || 'workspace'); return true; }
    return false;
  }
  window.addEventListener('hashchange', function () { if (!pdFromHash() && curView === 'project') pdGoBack(); });

  /* ---------- open / leave ---------- */
  var PD_VIEW_LABEL = { dashboard: 'Dashboard', projects: 'Projects', mywork: 'My work', actions: 'Waiting on clients', clients: 'Clients', inbox: 'Help', profile: 'Profile', settings: 'Settings' };
  function pdMakeBack() {
    if (curView === 'client' && cdCur) return { view: 'client', label: cdCur.name, id: cdCur.id, y: window.scrollY };
    if (PD_VIEW_LABEL[curView]) return { view: curView, label: PD_VIEW_LABEL[curView], y: window.scrollY };
    return { view: 'projects', label: 'Projects', y: 0 };
  }
  function pdGoBack() {
    var b = pd.back || { view: 'projects', y: 0 };
    if (b.view === 'client' && b.id) { var keep = savedY; openClient(b.id); savedY = keep; }
    else showView(b.view, { scroll: b.y });
  }
  function openProject(id, tab, trigger, cr) {
    var p = pdById(id); if (!p) return;
    if (curView !== 'project') pd.back = pdMakeBack();
    if (pd.p !== p) { pd.scroll = {}; pd.cr = null; pd.crf = 'open'; pd.sim = false; pd.ev = null; pd.evf = 'all'; pd.evn = 8; pd.evr = null; pd.clf = 'all'; pd.hf = 'all'; pd.hn = 12; pd.nall = false; pd.pv = prvUi(); pd.wk = wkUi(); }
    if (pd.p !== p) svOpen(p);   /* v99 (50): this device's visit to the project */
    pd.p = p; pd.edit = null; pd.adding = false; pd.ie = null; pd.as = null; pd.view = null; prvReset(); pd.stuck = false; pdBar.classList.remove('stuck');
    if (cr && p.crs) { var oc = pdCr(p, cr); if (oc) { pd.cr = oc.id; pd.crf = pdCrOpen(oc) ? 'open' : 'closed'; } }
    tab = pdTabKey(tab); if (tab === 'market') tab = prvSrcTab(p);   /* v119 (87): an old link to an internal project's Validate */
    var keys = pdVisible(p), t = keys.indexOf(tab) > -1 ? tab : 'workspace';
    pd.tab = t; recTouch(p, t);
    pdFp(p);
    pdRenderShell(p);
    showView('project', { force: true });
    pdRenderTabs(p);
    pdSelect(t, { init: true });
    var h = document.getElementById('pd-title'); if (h) h.focus({ preventScroll: true });
  }
  function pdEnter() {
    pdMeasure();
    pdSyncSide();
    requestAnimationFrame(function () { pdMoveInd(false); pdUpdateStuck(); });
  }
  function pdLeave() {
    if (!pdMenu) return;
    pdClearHash(); pdMenuClose(true);
    [].forEach.call(document.querySelectorAll('.proj-link[aria-current]'), function (a) { a.removeAttribute('aria-current'); });
  }
  function pdSyncSide() {
    var link = pd.p && document.querySelector('.proj-link[data-pj="' + pd.p.id + '"]');
    [].forEach.call(document.querySelectorAll('.proj-link[aria-current]'), function (a) { a.removeAttribute('aria-current'); });
    if (link) {
      [].forEach.call(document.querySelectorAll('.nav-i[data-view][aria-current]'), function (a) { a.removeAttribute('aria-current'); });
      link.setAttribute('aria-current', 'page');
    }
  }

  /* ---------- select a tab ---------- */
  function pdBarY() { return pdHead.getBoundingClientRect().bottom + window.scrollY + 18 - pdTbh(); }
  function pdSelect(key, o) {
    o = o || {};
    var p = pd.p; if (!p) return;
    key = pdTabKey(key);
    if (key === 'market') key = prvSrcTab(p);   /* v119 (87): an old link to an internal project's Validate */
    if (pdVisible(p).indexOf(key) < 0) key = 'workspace';
    if (!o.init) pd.scroll[p.id + '|' + pd.tab] = window.scrollY;
    var same = key === pd.tab && !o.init && !o.force;
    pd.tab = key; recTab(p, key);
    if (!same) { pd.edit = null; pd.adding = false; pd.ie = null; pd.as = null; pd.view = null; pd.dl = null; prvReset(); if (pd.wk) pd.wk.sk = null; }
    var sel = null;
    [].forEach.call(pdTabs.querySelectorAll('.pd-tab'), function (b) {
      var on = b.getAttribute('data-tab') === key;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (on) sel = b;
    });
    pdMoveInd(!o.init && !same);
    if (sel) pdReveal(sel, !o.init);
    pdRenderPanel({ animate: !same || o.init });
    if (!same && !o.init) {
      var saved = pd.scroll[p.id + '|' + key];
      if (saved != null) window.scrollTo(0, saved);
      else { var y0 = pdBarY(); if (window.scrollY > y0) window.scrollTo(0, Math.max(0, y0)); }
    }
    pdUpdateStuck();
    pdSetHash();
    if (!o.init && !same) { pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = PD_LABEL[key] + ' tab. ' + pdDesc(p, key); }, 40); }
  }
  function pdRenderPanel(o) {
    o = o || {};
    var p = pd.p, k = pd.tab, build = PD_BUILD[p.kind + '.' + k], at = p.id + '|' + k, was = pdPanel._at === at ? pdOpenState() : null, n;
    if (was) for (n in was) was[n] = was[n].open;
    pdPanel.innerHTML = build(p, k); pdPanel._at = at;
    if (was) { var now = pdOpenState(); for (n in now) if (n in was && now[n].open !== was[n]) now[n].open = was[n]; }
    pdPanel.setAttribute('aria-labelledby', 'pd-tab-' + k);
    var head = pdPanel.querySelector('.pd-ph'); if (head) head.style.setProperty('--pi', 0);
    [].forEach.call(pdPanel.querySelectorAll('.pd-col'), function (col) {
      [].forEach.call(col.children, function (c, j) { c.style.setProperty('--pi', Math.min(j + 1, 4)); });
    });
    pdPanel.classList.remove('pd-in');
    if (o.animate && !reduced) { void pdPanel.offsetWidth; pdPanel.classList.add('pd-in'); }
    pdFp(p);
    pdSegs(); [].forEach.call(pdPanel.querySelectorAll('.pd-compose'), pdSyncCompose);
    if (p.kind === 'client' && k === 'change') { var sc2 = pdSelCr(p); if (sc2) pdChain(p, sc2); }
    if (pd.ie || pd.as) { var fi = pdPanel.querySelector('.pd-itf input[name="t"]'); if (fi) { fi.focus({ preventScroll: true }); if (pd.ie) fi.setSelectionRange(fi.value.length, fi.value.length); } }
    if (pd.edit) {
      var ta = pdPanel.querySelector('.pd-edit textarea');
      if (ta) { ta.value = pd.edit === 'next' && !p.next ? '' : (p[pd.edit] || ''); ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }
    if (pd.adding) { var ti = pdPanel.querySelector('.pd-add input'); if (ti) ti.focus({ preventScroll: true }); }
  }
  /* a redraw of the same tab keeps each <details> as the person left it: syncing redraws the tab (every 30 s in Drive), so does choosing the tab already open */
  function pdOpenState() {
    var m = {}, n = {};
    [].forEach.call(pdPanel.querySelectorAll('details'), function (d) { var c = d.className; n[c] = (n[c] || 0) + 1; m[c + '#' + n[c]] = d; });
    return m;
  }
  function pdRerender(focusSel) {
    pdRenderPanel({ animate: false });
    if (focusSel) { var f = pdPanel.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- panel builders ---------- */
  /* v122 (93): the tab's name and what it is for were said again under the tabs, on every tab. They stay for screen readers; the
     page shows only the tab's action, at the right */
  function pdHeadHTML(p, tab, cta) {
    return '<div class="pd-ph' + (cta ? '' : ' bare') + '"><div class="sr-only"><h2>' + esc(PD_LABEL[tab]) + '</h2><p>' + esc(pdDesc(p, tab)) + '</p></div>' + (cta || '') + '</div>';
  }
  function pdEditBtn(f, label) { return '<button type="button" class="icon-sm xs" data-pd="edit" data-f="' + f + '" aria-label="Edit ' + label + '">' + IC('edit') + '</button>'; }
  function pdEditor(f, label, ph, max) {
    return '<form class="pd-edit" data-pd-form="edit" data-f="' + f + '" novalidate><label class="pd-k" for="pd-ed"><span>' + label + '</span></label>' +
      /* v122 (93): the field takes more than its limit, so a pasted sentence is never cut without a word: it counts once you are
         near, and Save says it is too long (it used to stop at maxlength, and a thesis was kept cut mid-word) */
      '<textarea id="pd-ed" rows="2" maxlength="' + max * 4 + '" data-max="' + max + '" aria-describedby="pd-ed-n" placeholder="' + esc(ph) + '"></textarea>' +
      '<span class="err" role="alert"></span>' +
      '<div class="pd-s-acts"><span class="prv-asn" id="pd-ed-n" hidden></span><span class="pd-hint">Enter to save · Esc to cancel</span><button type="button" class="btn-ghost btn-sm" data-pd="cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div></form>';
  }
  function pdThesisCard(p) {
    var inner = pd.edit === 'thesis' ? pdEditor('thesis', 'Thesis', 'Why does this project exist, in one sentence?', 160) :
      !p.thesis ? '<div class="pd-k"><span>Thesis</span></div><p class="pd-big mute">No thesis yet</p><p class="pd-sub">One sentence on why this project exists. The Scope Gate asks whether each item serves it.</p><div class="pd-s-acts"><button type="button" class="btn-primary btn-sm" data-pd="edit" data-f="thesis">Write the thesis</button></div>' :
      '<div class="pd-k"><span>Thesis</span>' + pdEditBtn('thesis', 'thesis') + '</div><p class="pd-big">' + esc(p.thesis) + '</p><p class="pd-sub">One sentence on why this project exists. Changes are recorded in Activity.</p>';
    return '<section class="card pd-thesis" aria-label="Thesis"><div class="pd-now-s" data-fld="thesis">' + inner + '</div></section>';
  }
  /* a product's Bet: why it exists, and why someone would switch to it */
  function pdBetCard(p) {
    var w = p.pv.wedge, th = pdThesisCard(p);
    var wl = '<div class="pd-now-s pq-bw"><div class="pd-k"><span>Why someone switches</span><button type="button" class="icon-sm xs" data-pd="goto" data-tab="market" data-f="wedge" aria-label="Edit the wedge in Validate" title="Edit in Validate">' + IC('edit') + '</button></div>' +
      (w.t ? '<p class="pd-big sm">' + esc(w.t) + '</p>' : '<p class="pd-big sm mute">No wedge yet</p><p class="pd-sub">One sentence: what you do that the others do not.</p>') + '</div>';
    return th.replace('aria-label="Thesis"', 'aria-label="Bet"').replace('<span>Thesis</span>', '<span>Bet · why it exists</span>').replace(/<\/section>$/, wl + '</section>');
  }
  function pdNowCard(p) {
    var focus = pd.edit === 'focus' ? pdEditor('focus', 'Current focus', 'What are you concentrating on right now?', 200) + x6FocusSug(p) :
      !p.focus ? '<div class="pd-k"><span>Current focus</span></div><p class="pd-big sm mute">No current focus yet</p><div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-pd="edit" data-f="focus">Set focus</button></div>' :
      '<div class="pd-k"><span>Current focus</span>' + pdEditBtn('focus', 'current focus') + '</div><p class="pd-big sm">' + esc(p.focus) + '</p>' + x6FocusMeta(p);
    var next;
    if (pd.edit === 'next') next = pdEditor('next', 'Next step', 'What is the next step?', 200) + x6NextSug(p);
    else if (p.next) next = '<div class="pd-k"><span>Next step</span></div><p class="pd-big">' + esc(p.next) + '</p><p class="pd-sub">' + x6NextMeta(p) + '</p>' +
      '<div class="pd-s-acts"><button type="button" class="btn-ghost btn-sm" data-pd="edit" data-f="next">Edit</button>' + (tdIs('next:' + p.id) ? '<span class="chip quiet x6-int">' + IC('sun') + 'In Today</span>' : '<button type="button" class="btn-ghost btn-sm" data-pd="x6:today">' + IC('sun') + 'Add to Today</button>') + '<button type="button" class="btn-primary btn-sm" data-pd="done">' + IC('tick') + 'Mark done</button></div>';
    else next = '<div class="pd-k"><span>Next step</span></div><p class="pd-big mute">No next step yet</p><p class="pd-sub">Pick the one thing that moves this project forward.</p>' + x6NextPick(p) + '<div class="pd-s-acts">' + x6NextPickBtn(p) + '<button type="button" class="btn-ghost btn-sm" data-pd="edit" data-f="next">Set next step</button></div>';   /* v122 (93): Continue work is the card's one solid button */
    return '<section class="card pd-now" aria-label="Focus and next step"><div class="pd-now-s" data-fld="focus">' + focus + '</div><div class="pd-now-s" data-fld="next">' + next + '</div>' + x6CwHTML(p) + '</section>';   /* v100: Continue work (53) */
  }
  var PD_NEED_CAP = 3;
  function pdNeedsCard(p) {
    var rank = function (x) { return x.chip === 'crit' ? 0 : x.chip === 'warn' ? 1 : 2; };
    /* v122 (93): no next step is said by the card above it, so it is not said here again; with nothing else, no card */
    var n = pdNeeds(p).filter(function (x) { return x.t !== 'No next step'; }).map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return rank(a.x) - rank(b.x) || a.i - b.i; }).map(function (o) { return o.x; });
    if (!n.length) return '';
    var h = '<section class="card pd-card" aria-labelledby="pd-h-needs"><div class="card-h ruled"><div><h3 id="pd-h-needs">Needs you</h3><p>' + (n.length ? itemsLbl(n.length) + ' across this project, most urgent first.' : 'Nothing is waiting on you.') + '</p></div><div class="h-actions">' + (n.length ? '<span class="count">' + n.length + '</span>' : '') + '</div></div>';
    if (!n.length) return h + '<div class="cd-empty">' + IC('tick') + 'You are clear. New requests and drafts will show up here.</div></section>';
    var all = pd.nall || n.length <= PD_NEED_CAP + 1;
    h += '<ul class="rows">';
    n.slice(0, all ? n.length : PD_NEED_CAP).forEach(function (x) {
      h += '<li><a href="#" class="row' + (x.chip === 'crit' ? ' is-crit' : '') + '" data-pd="goto" data-tab="' + x.tab + '"' + (x.f ? ' data-f="' + x.f + '"' : '') + (x.cr ? ' data-cr="' + x.cr + '"' : '') + '><span class="sd' + (x.chip ? ' ' + x.chip : '') + '" aria-hidden="true"></span><span><h4>' + esc(x.t) + '<span class="tag">' + esc(PD_LABEL[pdTabKey(x.tab)]) + '</span></h4><p>' + esc(x.p) + '</p></span><span class="meta">' +
        (x.chip ? '<span class="chip ' + x.chip + '">' + esc(x.chipT) + '</span>' + (x.date ? '<span class="date">' + esc(x.date) + '</span>' : '') : '') + '</span>' + IC('chev') + '</a></li>';
    });
    h += '</ul>';
    if (n.length > PD_NEED_CAP + 1) h += '<div class="pd-needs-more"><button type="button" class="link" data-pd="needsall" aria-expanded="' + !!pd.nall + '">' + (pd.nall ? 'Show fewer' : 'Show ' + (n.length - PD_NEED_CAP) + ' more') + '</button></div>';
    return h + '</section>';
  }
  var PD_CTX_IC = { design: 'image', doc: 'doc', folder: 'folder', link: 'link' };
  function pdHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function pdCtxCard(p) {
    var h = '<section class="card pd-card" aria-labelledby="pd-h-ctx"><div class="card-h ruled"><div><h3 id="pd-h-ctx">Working context</h3><p>Links and files stay in your own Drive.</p></div><div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="addlink">' + IC('plus') + 'Add link</button></div></div>';
    if (pd.adding) h += '<form class="pd-add" data-pd-form="addlink" novalidate><input name="t" placeholder="Name (optional)" maxlength="60" aria-label="Link name" autocomplete="off"><input name="u" placeholder="https://…" maxlength="300" aria-label="Link address" inputmode="url" autocomplete="off"><div class="f-acts"><button type="button" class="btn-ghost btn-sm" data-pd="cancel">Cancel</button><button type="submit" class="btn-primary btn-sm">Add</button></div><span class="err" role="alert">Enter a full link, like https://drive.google.com/…</span></form>';
    if (!p.ctx.length) return h + '<div class="cd-empty">Nothing linked yet. Add the files and tools this project lives in.</div></section>';
    h += '<div class="pd-res">';
    p.ctx.forEach(function (x) {
      h += '<a class="pd-tile' + (x.fresh ? ' fresh' : '') + '" href="' + esc(sdHref(x.u)) + '" target="_blank" rel="noopener noreferrer"><span class="pd-tile-i">' + IC(PD_CTX_IC[x.k] || 'link') + '</span><span class="pd-tile-t"><b>' + esc(x.t) + '</b><small>' + esc(pdHost(x.u)) + '</small></span>' + IC('ext') + '</a>';
    });
    p.ctx.forEach(function (x) { x.fresh = false; });
    return h + '</div></section>';
  }
  function pdProtCard(p) {
    var c = byId(p.cid) || {}, l = pdLatest(p), g = given(c) || 'The client', state = !l ? 'none' : l.appr ? 'ok' : 'wait';
    var chip = state === 'ok' ? '<span class="chip ok">Protected</span>' : state === 'wait' ? '<span class="chip">Awaiting ' + esc(g) + '</span>' : '<span class="chip warn">Not issued</span>';
    var h = '<section class="card pd-card" aria-labelledby="pd-h-prot"><div class="card-h ruled"><div><h3 id="pd-h-prot">Protection</h3><p>How much of the work is on the record.</p></div><div class="h-actions">' + chip + '</div></div><div class="pd-prot">';
    if (state === 'none') {
      h += '<div class="pd-prow"><span class="pd-seal off" aria-hidden="true"></span><div><b>No trusted baseline yet</b><small>' + (p.sc.items.length ? 'Scope v1 is a local draft' : 'Scope v1 is not drafted yet') + '</small></div></div><p class="pd-note">' + (p.sc.items.length ? 'Until you issue it, nothing the client sees is protected. Issue Scope v1 to create the first baseline.' : 'Draft what is included first. Issuing it creates the first baseline the client can approve.') + '</p><button type="button" class="btn-ghost btn-sm" data-pd="goto" data-tab="scope">Open Scope</button>';
      return h + '</div></section>';
    }
    h += '<div class="pd-prow"><span class="pd-seal' + (state === 'wait' ? ' wait' : '') + '" aria-hidden="true">' + IC(state === 'wait' ? 'clock' : 'tick') + '</span><div><b>Scope v' + l.v + (state === 'ok' ? ' · trusted' : '') + '</b><small>Issued ' + esc(l.at) + (state === 'ok' ? ' · approved by ' + esc(l.appr.split(' · ')[0]) : '') + '</small></div></div>';
    if (state === 'wait') h += '<p class="pd-note">' + (c.portal === 'active' ? esc(g) + ' has not approved this version yet. Nothing is protected until then.' : esc(g) + ' has not opened the portal yet, so nobody has approved this version.') + '</p>';
    var adds = p.crs.filter(function (cr) { return cr.adds && pdCrState(cr) !== 'declined'; }), fold = adds.filter(function (cr) { return pdCrVer(p, cr) > 0; }).length;
    var sh = p.evd.filter(function (x) { return x.copy; }).length;
    h += '</div><div class="pdc-bars">' +
      pdcBar('Changes on the record', adds.length ? fold + ' of ' + adds.length : 'None yet', adds.length ? Math.round(fold / adds.length * 100) : 0, adds.length ? 'Change requests that add work and now sit inside a trusted version.' : 'Change requests that add work are counted here.', adds.length && fold === adds.length, !adds.length) +
      pdcBar('Evidence with a client copy', p.evd.length ? sh + ' of ' + p.evd.length : 'None yet', p.evd.length ? Math.round(sh / p.evd.length * 100) : 0, 'What ' + (given(c) || 'the client') + ' can see a copy of. Originals stay private.', false, !p.evd.length) + '</div>';
    if (state === 'ok') h += '<div class="pd-prot-f"><p class="pd-note">' + (p.outside ? p.outside + (p.outside === 1 ? ' request sits' : ' requests sit') + ' outside the baseline.' : 'Nothing sits outside the baseline.') + '</p>' + (p.outside ? '<button type="button" class="btn-ghost btn-sm" data-pd="goto" data-tab="change">Open Changes</button>' : '') + '</div>';
    return h + '</section>';
  }
  /* v68: this project's portal theme, with a swatch of its paper and accent */
  function pdcTheme(p) {
    var x = ptSplit(p.ptheme || ''), v = x[1] ? x[1].v : x[0] ? x[0].v : null;
    var sw = v ? '--p:' + v.page + ';--a:' + v.acc : '--p:' + PF_PT[0].v.page + ';--a:' + PF_PT[0].v.acc;
    var name = x[0] ? '<span>' + esc(x[0].name) + '</span>' + (x[1] ? ' · <span>' + esc(x[1].name) + '</span>' : '') : '<span>Automatic</span>';
    return '<div class="pdc-th"><span class="pt-dotw' + (x[0] ? '' : ' auto') + '" style="' + esc(sw + ';--tone:' + ptTone()) + '" aria-hidden="true"><i></i></span><div><small>Portal theme</small><b>' + name + '</b></div><button type="button" class="btn-ghost btn-sm" data-pd="ptheme" data-sd-app>Change</button></div>';
  }
  function pdClientCard(p) {
    var c = byId(p.cid) || {}, g = given(c) || 'the client', pt = PORTAL[c.portal] || PORTAL.draft, chip = '<span class="chip' + (pt[0] === 'ok' ? ' ok' : pt[0] === 'off' ? ' neutral' : '') + '">' + pt[1] + '</span>';
    var ppl = [{ n: c.contact || 'Client', r: c.role || 'Contact' }].concat((c.people || []).map(function (x) { return { n: x.n, r: x.r || '' }; }));
    var note = c.portal === 'active' ? 'Share it only with people at ' + c.name + '.' : c.portal === 'invited' ? 'Invited ' + c.invited + '. ' + g + ' has not opened it yet.' : c.portal === 'closed' ? 'The portal is closed, so this link no longer works.' : g + ' is not invited yet. Invite them from the client page.';
    var meta = [c.ptS || '', c.since ? 'Client since ' + c.since : ''].filter(Boolean).join(' · ');
    return '<section class="card pd-card pd-clc" aria-labelledby="pd-h-rel"><div class="card-h ruled"><div><h3 id="pd-h-rel">' + esc(c.name || 'Client') + '</h3><p>' + esc(meta || 'Who you work with on this project.') + '</p></div><div class="h-actions">' + chip + '</div></div>' +
      '<ul class="pdc-ppl" aria-label="People at ' + esc(c.name || 'the client') + '">' + ppl.map(function (x) { return '<li><span class="pa" aria-hidden="true">' + esc(initials(x.n)) + '</span><div><b>' + esc(x.n) + '</b><small>' + esc(x.r) + '</small></div></li>'; }).join('') + '</ul>' +
      pdcTheme(p) +
      /* CONTRACT 120: a sample has no link; its portal opens as the portal's demo of this client */
      (sdSample(p) ? '<div class="pdc-link is-priv"><span class="pdc-lk">' + IC('lock') + '<span>A sample has no link. Its portal opens as a demo.</span></span><button type="button" class="btn-ghost btn-sm" data-pd="sdportal">' + IC('ext') + 'Open the portal</button></div>' :
      (SY.key || syOnPortal(c) ? '<div class="pdc-link is-priv"><span class="pdc-lk">' + IC('lock') + '<span>Private link, emailed only to them</span></span><button type="button" class="icon-sm xs" data-pd="clcopy" aria-label="Email portal link">' + IC('mail') + '</button></div>' : '<div class="pdc-link"><span class="pd-fp">' + esc(portalUrl(c)) + '</span><button type="button" class="icon-sm xs" data-pd="clcopy" aria-label="Copy portal link">' + IC('copy') + '</button></div>') + '<p class="pd-note pdc-link-n">' + esc(note) + '</p>') + cpWaitNote(p) +
      '<div class="pdc-acts"><button type="button" class="btn-ghost btn-sm" data-pd="preview">' + IC('monitor') + '<span>Preview what ' + esc(g) + ' sees</span></button><button type="button" class="link pdc-open" data-pd="client">Open client page ' + IC('ext') + '</button></div></section>';
  }
  var PD_DRIFT = [['Not started', ''], ['Low', ''], ['Moderate', 'warn'], ['High', 'crit']];
  function pdGlanceCard(p) {
    var g = p.glance, d = g.dl ? [g.dl, ''] : (PD_DRIFT[g.drift] || PD_DRIFT[0]), cls = d[1], pv = p.pv, nm = pv ? pv.rel.name : 'v1', dr = pv ? prvDrift(p) : null;
    var gauge = ''; for (var i = 0; i < 3; i++) gauge += '<i' + (i < g.drift ? ' class="on"' : '') + '></i>';
    var nowSub = g.cap ? '<small' + (g.over ? ' class="over"' : '') + '>' + g.days + ' / ' + g.cap + ' days' + (g.over ? ' · over' : '') + '</small>' : (g.un ? '<small>' + g.un + ' without a size</small>' : '');
    var rv = pv ? pv.park.filter(prvRevisit).length : 0, on = !pv || prvRelOn(p);   /* v97 (43): without a release, no release name and no drift */
    return '<section class="card pd-card" aria-labelledby="pd-h-gl"><div class="card-h ruled"><div><h3 id="pd-h-gl">Scope at a glance</h3><p>' + (on ? 'What ' + esc(nm) + ' ships, what waits, and what you will never build.' : 'What is in Now, what waits, and what you will never build.') + '</p></div></div>' +
      '<div class="pd-gl"><button type="button" data-pd="goto" data-tab="scope"><span>Now' + nowSub + '</span><b>' + g.inn + '</b></button><button type="button" data-pd="goto" data-tab="scope"><span>Next' + (pv && on ? '<small>Waiting for ' + esc(prvNextName(p)) + '</small>' : '') + '</span><b>' + g.next + '</b></button><button type="button" data-pd="goto" data-tab="scope"><span>Never</span><b>' + g.out + '</b></button><button type="button" data-pd="goto" data-tab="parking"><span>Parking Lot' + (g.parked ? '<small' + (rv ? ' class="over"' : '') + '>' + (rv ? rv + ' to revisit' : 'Undecided') + '</small>' : '') + '</span><b>' + g.parked + '</b></button></div>' +
      (on ? '<div class="pd-drift"><div><span>Drift since baseline</span><span class="chip' + (cls ? ' ' + cls : '') + '">' + d[0] + '</span></div><div class="pd-gauge ' + cls + '" role="img" aria-label="Drift: ' + d[0] + '">' + gauge + '</div></div>' : '') +
      (dr && pv.base && dr.n ? '<p class="pd-note pd-gl-n">' + esc(prvDriftText(dr)) + '</p>' : '') + '</section>';
  }
  /* How long ago, in the words the lists use */
  function pdAgo(t) {
    var m = Math.max(0, Math.round((Date.now() - t) / 6e4)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return m + 'm ago';
    if (h < 24) return h + 'h ago';
    return pdDayLabel(t) === 'Yesterday' ? 'Yesterday' : d < 14 ? d + 'd ago' : pdDayLabel(t);
  }
  /* The newest three lines, read from the same events as the History tab, so the two can never disagree */
  /* While "Since your last visit" is on the page it lists what is new, so this card starts where that one ends: the same
     line is never shown twice on one page (what svEvents counts as new is left out here) */
  function pdRecentFeed(p) {
    var cut = pd.svOff !== p.id && svEvents(p).length ? p.lvs : 0;
    if (p.kind !== 'client') return prvEvents(p).filter(function (e) { return !cut || !p.pv || e.ts <= cut; }).slice(0, 3).map(function (e) {
      return { key: e.ln + '|' + e.t + '|' + e.ts, k: 'you', t: e.t, fresh: Date.now() - e.ts < 70000, time: pdAgo(e.ts) };
    });
    return pdEvents(p).filter(function (e) { return !cut || !((e.k === 'clock' || e.k === 'date') && e.t > cut); }).slice(0, 3).map(function (e) {
      return { key: e.who + '|' + e.text + '|' + e.s, k: e.who, t: e.text, fresh: Date.now() - e.t < 70000, time: e.k === 'now' ? 'Just now' : e.k === 'rel' ? e.s : e.k === 'yd' ? 'Yesterday' : pdAgo(e.t) };
    });
  }
  var pdRecentSeen = {};
  function pdRecentCard(p) {
    var seen = pdRecentSeen[p.id] || {}, now = {}, feed = pdRecentFeed(p), since = pd.svOff !== p.id && svEvents(p).length;
    if (!feed.length && since) return '';   // all of it is in Since your last visit
    var h = '<section class="card pd-card" aria-labelledby="pd-h-rec"><div class="card-h ruled"><div><h3 id="pd-h-rec">' + (since ? 'Before your last visit' : 'Recent') + '</h3><p>Activity has the rest.</p></div></div><ol class="tl">';
    feed.forEach(function (e) {
      now[e.key] = 1;
      h += '<li' + (e.fresh && !seen[e.key] ? ' class="fresh"' : '') + '><span class="tdot ' + (e.k === 'client' ? 'client' : '') + '"></span><div class="tx">' + esc(e.t) + '</div><time>' + esc(e.time) + '</time></li>';
    });
    pdRecentSeen[p.id] = now;
    return h + '</ol><div class="pd-recent-f"><button type="button" class="link" data-pd="goto" data-tab="history">Open Activity ' + IC('arrow') + '</button></div></section>';
  }
  function pdWorkspaceHTML(p) {
    var left = [], right = [];
    if (p.kind === 'private') left.push(pdMode(p) === 'product' ? pdBetCard(p) : pdThesisCard(p));
    left.push(pdNowCard(p), pdNeedsCard(p), x6CtxCard(p));
    var svh = svCard(p); if (svh) left.unshift(svh);   /* v99: since your last visit (50) */
    var cfh = cfCard(p); if (cfh) left.unshift(cfh);   /* v96: changes that crossed, first (41) */
    if (p.kind === 'client') right.push(pdClientCard(p), agV2(p) ? agProtCard(p) : pdProtCard(p), x6LaterCard(p), x6DecCard(p), dvCard(p)); else right.push(pdGlanceCard(p), dvCard(p));   /* v88: Drive card on client projects too */
    right.push(pdRecentCard(p));
    return pdHeadHTML(p, 'workspace') + (p.kind === 'private' ? pfStrip(p) + dvHello(p) : dvHello(p)) + '<div class="pd-cols"><div class="pd-col">' + left.join('') + '</div><div class="pd-col">' + right.join('') + '</div></div>';
  }

  /* team */
  var PD_PERMS = {
    client: [['See everything in the project', 1, 1, 1], ['Take free work, update and hand over own work', 1, 1, 0], ['Next step, links, Later and decisions', 1, 1, 0], ['Edit and issue Scope', 1, 0, 0], ['Talk to the client, answer changes', 1, 0, 0], ['Assign work, approve it, send it back', 1, 0, 0], ['Manage members', 1, 0, 0]],
    'private': [['Open the project', 1, 1, 0], ['Take free work, update and hand over own work', 1, 1, 0], ['Next step, links and parked ideas', 1, 1, 0], ['Record what Viewers say in Feedback', 1, 1, 0], ['Edit Scope and decisions', 1, 0, 0], ['Assign work, approve it, send it back', 1, 0, 0], ['Manage members', 1, 0, 0], ['See what you share and send feedback, in the Viewer portal', 0, 0, 1]]
  };
  /* the role as people read it: Owner is the project's owner, never the business's */
  function pdRoleName(r) { return r === 'Owner' ? 'Project owner' : r; }
  function pdMemberRow(m, i) {
    if (pd.p && (x8Role(pd.p) !== 'Owner' || m.role === 'Owner')) return x8MemberRow(m);
    var role = '<span class="pd-sel"><select data-pd-role="' + i + '" aria-label="Role for ' + esc(m.n) + '">' + fbRoleOpts(pd.p, m.role) + '</select>' + IC('chev') + '</span>';   /* v92: Editor only on a client project */
    return '<li class="pd-m' + (m.fresh ? ' fresh' : '') + '">' + pdAv(m) + '<div class="pd-m-t"><b>' + esc(m.n) + '</b><small>' + esc(m.e) + '</small>' + dvMemLine(pd.p, m) + vpMemLine(pd.p, m) + '</div><div class="pd-m-r">' + role + '</div>' +
      '<button type="button" class="icon-sm xs" data-pd="rm" data-i="' + i + '" aria-label="Remove ' + esc(m.n) + ' from this project">' + IC('x') + '</button></li>';
  }
