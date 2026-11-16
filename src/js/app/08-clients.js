  /* ---------- clients: data ---------- */
  var PORTAL = { active: ['ok', 'Active'], invited: ['inv', 'Invited'], closed: ['off', 'Closed'], draft: ['off', 'Not invited'] };
  var CLIENTS = SDBOOT.pick('client') || [];
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* v68 audit: a link made from data (a saved page, a teammate's project, a backup) opens only a web page or an email, never script */
  function sdHref(u) { u = String(u == null ? '' : u).trim(); return /^(https?:\/\/|mailto:)/i.test(u) ? u : '#'; }
  function byId(id) { return CLIENTS.filter(function (c) { return c.id === id; })[0]; }
  function given(c) { return sdCallName((c && c.contact) || ''); }   /* v88: a client not on this device yet has no contact */
  /* the name to call someone by, as the portal and the emails do (api.php given_name): a title in front is not a name (BS. Lê Ngọc
     Hân, Dr. Ann Lee, Chị Hân), a Vietnamese name ends with it (Lê Ngọc Hân: Hân), others start with it. Vietnamese is told by
     letters only Vietnamese has, or a common family name written without its marks (Nguyen Van An). The lists are inside: this
     can run before the file has */
  function sdCallName(n) {
    var w = String(n || '').trim().split(/\s+/).filter(Boolean);
    while (w.length > 1 && (/^(bs|bsck|bscki|bsckii|ts|ths|pgs|gs|ks|ls|ds|dr|mr|mrs|ms|mx|miss|prof|sir|anh|chị|chi|ông|ong|bà|cô|chú|em)\.?$/i.test(w[0]) || /^[A-Za-zÀ-ỹ]{1,5}\.$/.test(w[0]))) w.shift();
    if (w.length < 2) return w[0] || '';
    var fam = ['nguyen', 'nguyễn', 'tran', 'trần', 'le', 'lê', 'pham', 'phạm', 'hoang', 'hoàng', 'huynh', 'huỳnh', 'phan', 'vu', 'vũ', 'vo', 'võ', 'dang', 'đặng', 'bui', 'bùi', 'do', 'đỗ', 'ho', 'hồ', 'ngo', 'ngô', 'duong', 'dương', 'ly', 'lý', 'doan', 'đoàn', 'trinh', 'trịnh', 'dinh', 'đinh', 'truong', 'trương', 'luong', 'lương', 'quach', 'quách', 'lam', 'lâm', 'dao', 'đào', 'luu', 'lưu', 'cao'], isFam = function (x) { return fam.indexOf(x.toLowerCase()) > -1; };
    if (isFam(w[w.length - 1]) && !isFam(w[0])) return w[0];   // the given name written first (Phát Nguyễn)
    return /[ăđơưĩũạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(w.join(' ')) || isFam(w[0]) ? w[w.length - 1] : w[0];
  }
  /* v116: a title in front is not part of the name (BS. Lê Ngọc Hân is LH, not BL); a Vietnamese name takes its family name and the
     name the person goes by, which is its last word (as sdCallName) */
  function initials(n) {
    var p = String(n || '').trim().split(/\s+/).filter(Boolean); if (!p.length) return '';
    while (p.length > 1 && (/^(bs|bsck|bscki|bsckii|ts|ths|pgs|gs|ks|ls|ds|dr|mr|mrs|ms|mx|miss|prof|sir|anh|chị|chi|ông|ong|bà|cô|chú|em)\.?$/i.test(p[0]) || /^[A-Za-zÀ-ỹ]{1,5}\.$/.test(p[0]))) p.shift();
    if (p.length > 2 && sdCallName(p.join(' ')) === p[p.length - 1]) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return ((p[0] || '')[0] + (p.length > 1 ? p[1][0] : '')).toUpperCase();
  }
  function slug(n) { return fold(n).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client'; }
  function itemsLbl(n) { return n + (n === 1 ? ' item' : ' items'); }

  var clList = document.getElementById('cl-list');
  function rowAttrs(li, c) {
    li.setAttribute('data-id', c.id); li.setAttribute('data-status', c.status); li.setAttribute('data-portal', c.portal);
    li.setAttribute('data-name', [c.name, c.contact, c.email].concat(c.projects.map(function (p) { return p.n; })).join(' '));
  }
  /* Everything waiting on you for this client: what the client record holds, plus what each active project needs from you.
     The project's own Needs card counts the same lines, so the two pages cannot disagree */
  function clNeeds(c) {
    var act = c.projects.filter(function (x) { return !x.done; }), out = c.needs.slice();
    act.forEach(function (x) {
      var p = PROJECTS ? pdById(x.pid) : null; if (!p || p.kind !== 'client' || !p.sc) return;   /* the projects are set up after the Clients are first drawn */
      pdLocalNeeds(p).forEach(function (n) { out.push({ t: n.t, p: n.p, chip: n.chip, chipT: n.chipT, date: n.date, pj: act.length > 1 ? p.id : '', pjid: p.id, tab: n.tab, cr: n.cr, f: n.f }); });
    });
    return out;
  }
  function rowHTML(c) {
    var act = c.projects.filter(function (p) { return !p.done; }), done = c.projects.length - act.length;
    var proj;
    if (act.length) {
      proj = '<div class="c-proj pp" role="img" aria-label="' + act.length + (act.length === 1 ? ' project: ' : ' projects: ') + esc(act.map(function (p) { return p.n; }).join(', ')) + '"><span class="pjs">' +
        act.map(function (p) { return '<span class="pjm" title="' + esc(p.n) + '">' + esc(p.m) + '</span>'; }).join('') + '</span><span class="pp-t">' + act.length + (act.length === 1 ? ' project' : ' projects') + '</span></div>';
    } else proj = '<div class="c-proj pp"><span class="pp-t muted">' + (done ? done + ' completed' : 'No projects yet') + '</span></div>';
    var nd = clNeeds(c), ch = nd.filter(function (x) { return x.chip; })[0], n = nd.length, need;
    if (!n) need = '<span class="need-clear"><svg class="i" aria-hidden="true"><use href="#i-tick"/></svg>All clear</span>';
    else need = ch ? '<span class="chip ' + ch.chip + '">' + esc(ch.chipT) + '</span><span class="dt">' + itemsLbl(n) + '</span>' : '<span>' + itemsLbl(n) + '</span>';
    var pt = PORTAL[c.portal];
    return '<a href="#" class="pl-row"><div class="c-name"><span class="pj-av' + (c.status === 'past' ? ' priv' : '') + '" aria-hidden="true">' + esc(c.ini) + '</span><div class="pl-tx"><h3>' + esc(c.name) + '</h3><small>' + esc(c.contact) + (c.role ? ' · ' + esc(c.role) : '') + '</small></div></div>' +
      '<div class="pl-meta">' + proj +
      '<div class="c-portal pt"><span class="pt-l"><i class="pd ' + pt[0] + '"></i>' + pt[1] + '</span><span class="pt-s">' + esc(c.ptS) + '</span></div>' +
      '<div class="c-need due">' + need + '</div>' +
      '<div class="c-act act"><span>' + esc(c.act[0]) + '</span><small>' + esc(c.act[1]) + '</small></div></div>' +
      '<svg class="i chev" aria-hidden="true"><use href="#i-chev"/></svg></a>';
  }
  function rowEl(c) { var li = document.createElement('li'); li.className = 'pl-item'; rowAttrs(li, c); li.innerHTML = rowHTML(c); return li; }
  function refreshRow(c) {
    var li = clList.querySelector('[data-id="' + c.id + '"]'); if (!li) return;
    rowAttrs(li, c); li.innerHTML = rowHTML(c);
  }
  CLIENTS.forEach(function (c) { clList.appendChild(rowEl(c)); });

  function updateCounts() {
    var cur = 0, past = 0, p = { active: 0, invited: 0, closed: 0, draft: 0 };
    CLIENTS.forEach(function (c) { if (c.status === 'past') past++; else cur++; p[c.portal]++; });
    var st = document.getElementById('cl-status'), po = document.getElementById('cl-portal');
    function set(seg, key, n) {
      var b = seg.querySelector('[data-f="' + key + '"]'); if (!b) return;
      var sp = b.querySelector('.n'); if (sp) tween(sp, n);
      if (key === 'draft') b.hidden = n === 0;
    }
    set(st, 'all', CLIENTS.length); set(st, 'current', cur); set(st, 'past', past);
    set(po, 'active', p.active); set(po, 'invited', p.invited); set(po, 'closed', p.closed); set(po, 'draft', p.draft);
    moveThumb(st, false); moveThumb(po, false);
    sdFocusPaint();
  }

  /* ---------- views + list pages (projects, clients) ---------- */
  var viewEls = { inbox: document.getElementById('view-inbox'), dashboard: document.getElementById('view-dashboard'), projects: document.getElementById('view-projects'), clients: document.getElementById('view-clients'), client: document.getElementById('view-client'), profile: document.getElementById('view-profile'), project: document.getElementById('view-project'), mywork: document.getElementById('view-mywork'), actions: document.getElementById('view-actions'), settings: document.getElementById('view-settings') };
  var curView = 'dashboard';

  function initList(view) {
    var card = view.querySelector('.pl'), wrap = view.querySelector('.pl-wrap');
    var hov = wrap.querySelector('.pl-hover');
    var items = [];
    function collect() { items = [].slice.call(view.querySelectorAll('.pl-item')); }
    collect();
    var segsL = [].slice.call(view.querySelectorAll('.pl-tools .seg'));
    var qEl = view.querySelector('.pl-search input'), emptyEl = view.querySelector('.pl-empty'), clearEl = view.querySelector('.pl-clear');
    var state = {};
    segsL.forEach(function (sg) { state[sg.getAttribute('data-key')] = sg.getAttribute('data-def'); });

    function play() {
      var i = 0;
      items.forEach(function (it) { if (!it.hidden) it.style.setProperty('--i', i++); });
      card.classList.remove('play'); void card.offsetWidth; card.classList.add('play');
    }
    function apply(replay) {
      var q = fold(qEl.value.trim()), shown = 0;
      items.forEach(function (it) {
        var ok = segsL.every(function (sg) {
          var k = sg.getAttribute('data-key');
          return state[k] === sg.getAttribute('data-def') || it.getAttribute('data-' + k) === state[k];
        }) && (!q || fold(it.getAttribute('data-name')).indexOf(q) > -1);
        it.hidden = !ok; if (ok) shown++;
      });
      emptyEl.hidden = shown !== 0;
      if (!items.length) xaListEmpty(view, emptyEl); else xaListMatch(emptyEl);
      hov.style.opacity = 0;
      if (replay) play();
    }
    segsL.forEach(function (sg) {
      sg.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-f]'); if (!btn) return;
        state[sg.getAttribute('data-key')] = btn.getAttribute('data-f');
        setPressed(sg, btn.getAttribute('data-f')); apply(true);
      });
    });
    qEl.addEventListener('input', function () { apply(false); });
    qEl.addEventListener('keydown', function (e) { if (e.key === 'Escape' && qEl.value) { e.preventDefault(); qEl.value = ''; apply(false); } });
    function reset(replay) {
      segsL.forEach(function (sg) { state[sg.getAttribute('data-key')] = sg.getAttribute('data-def'); setPressed(sg, sg.getAttribute('data-def')); });
      qEl.value = ''; apply(replay);
    }
    clearEl.addEventListener('click', function () { reset(true); });

    /* hover highlight glides between rows */
    function glideTo(a) {
      var li = a.closest('.pl-item'); if (!li) return;
      var first = hov.style.opacity !== '1';
      if (first) hov.classList.add('no-anim');
      hov.style.height = li.offsetHeight + 'px';
      hov.style.transform = 'translateY(' + li.offsetTop + 'px)';
      if (first) { void hov.offsetHeight; hov.classList.remove('no-anim'); }
      hov.style.opacity = 1;
    }
    wrap.addEventListener('mouseover', function (e) { var a = e.target.closest('.pl-row'); if (a) glideTo(a); });
    wrap.addEventListener('focusin', function (e) { var a = e.target.closest('.pl-row'); if (a) glideTo(a); });
    wrap.addEventListener('mouseleave', function () { hov.style.opacity = 0; });
    wrap.addEventListener('focusout', function () { hov.style.opacity = 0; });

    return {
      enter: function () { collect(); segsL.forEach(function (sg) { moveThumb(sg, false); }); apply(true); },
      reset: reset,
      refresh: function () { collect(); apply(false); },
      stop: function () { card.classList.remove('play'); }
    };
  }
  var lists = { projects: initList(viewEls.projects), clients: initList(viewEls.clients) };

  /* ---------- client detail ---------- */
  var cdHost = viewEls.client, cdCur = null, savedY = 0;
  var IC = function (id) { return '<svg class="i" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  function portalUrl(c) { return 'scopedue.app/p/' + c.id; }

  function statsHTML(c) {
    var nd = clNeeds(c), n = nd.length, ch = nd.filter(function (x) { return x.chip; })[0];
    /* a need with a date says it; one from a project's own checks (a chase, a stale check) has only its chip */
    var s1 = !n ? 'All clear' : !ch ? 'No deadlines' : ch.chipT === 'Due today' ? '1 due today' : ch.chipT === 'Overdue' ? '1 overdue' : ch.date ? 'Due ' + ch.date : ch.chipT;
    var act = c.projects.filter(function (p) { return !p.done; }), dn = c.projects.length - act.length, p2;
    if (act.length) p2 = [act.length, act.length === 1 ? 'Active project' : 'Active projects', act.length === 1 ? act[0].phase + ' · ' + act[0].step + ' of 5' : 'Next due ' + act[0].date, ''];
    else if (dn) p2 = [dn, dn === 1 ? 'Completed project' : 'Completed projects', 'Last delivered ' + c.projects[0].date, ''];
    else p2 = [0, 'Projects', 'None yet', ' mute'];
    var p3;
    if (c.portal === 'active') p3 = [c.seenN, 'Last seen', 'In the client portal', ''];
    else if (c.portal === 'invited') p3 = ['—', 'Last seen', 'Invite not opened yet', ' mute'];
    else if (c.portal === 'draft') p3 = ['—', 'Portal', 'Not invited yet', ' mute'];
    else p3 = [c.seenN, 'Portal closed', c.seenT, ' mute'];
    return '<div class="cd-stats">' +
      '<div class="cd-stat"><span class="n' + (ch && ch.chip === 'crit' ? ' hot' : n ? '' : ' mute') + '">' + n + '</span><span><b>Needs you</b><small>' + s1 + '</small></span></div>' +
      '<div class="cd-stat"><span class="n' + p2[3] + '">' + p2[0] + '</span><span><b>' + p2[1] + '</b><small>' + esc(p2[2]) + '</small></span></div>' +
      '<div class="cd-stat"><span class="n' + p3[3] + '">' + esc(p3[0]) + '</span><span><b>' + p3[1] + '</b><small>' + esc(p3[2]) + '</small></span></div></div>';
  }
  function heroHTML(c) {
    var pt = PORTAL[c.portal];
    return '<section class="card cd-hero cd-dyn" aria-label="Client summary"><div class="cd-top"><span class="pj-av' + (c.status === 'past' ? ' priv' : '') + '" aria-hidden="true">' + esc(c.ini) + '</span>' +
      '<div class="cd-id"><h1 id="cd-title" tabindex="-1">' + esc(c.name) + '</h1><div class="cd-sub"><span>' + esc(c.contact) + (c.role ? ' · ' + esc(c.role) : '') + '</span><span><span class="pt-l"><i class="pd ' + pt[0] + '"></i>' + pt[1] + '</span></span><span>Client since ' + esc(c.since) + '</span></div></div>' +
      '<div class="cd-acts">' + (sdSampleC(c) ? '<button type="button" class="btn-ghost" data-cd="demo">' + IC('ext') + 'Open the portal</button>' : '<button type="button" class="btn-ghost" data-cd="copy">' + IC('mail') + 'Email portal link</button>') + '</div></div>' + statsHTML(c) + '</section>';   /* CONTRACT 120 */
  }
  function nextOf(c) {
    var nd = clNeeds(c), f = given(c), n = nd.length, ch = nd.filter(function (x) { return x.chip; })[0], crit = ch && ch.chip === 'crit';
    if (c.portal === 'closed') return ['Closed engagement', 'Reopen the portal if there is new work', 'The portal has been closed since ' + c.seenT + '. Reopening sends ' + f + ' a fresh invite.', 'Reopen portal', 'reopen'];
    if (c.portal === 'draft') return ['Set up', 'Invite ' + f + ' to the portal', 'They get a link to approve changes and follow progress. Nothing is shared until you send it.', 'Send invite', 'invite'];
    if (crit) return ['Do this first', 'Start with the deadline due today', itemsLbl(n) + ' waiting on you. ' + f + ' was last in the portal ' + c.seenT + '.', 'Review ' + itemsLbl(n), 'review'];
    if (c.portal === 'invited' && c.invited === today()) return ['Waiting on ' + f, 'The invite was sent today', f + ' has not opened it yet. Follow up in a day or two, or email the link again.', 'Email portal link', 'copy'];
    if (c.portal === 'invited') return ['Follow up', 'Resend the invite to ' + f, f + ' has not opened the invite sent ' + c.invited + '.' + (n ? ' ' + itemsLbl(n) + ' on your side can wait until they are in.' : ''), 'Resend invite', 'resend'];
    if (ch) return ['Coming up', ch.date ? 'Review the deadline before ' + ch.date : ch.t, itemsLbl(n) + ' waiting on you. ' + f + ' last opened the portal ' + c.seenT.toLowerCase() + '.', 'Review ' + itemsLbl(n), 'review'];
    if (n) return ['Waiting on you', 'Work through ' + itemsLbl(n), 'None of them has a deadline yet.', 'Review ' + itemsLbl(n), 'review'];
    return ['All clear', 'Nothing is waiting on either side', 'A short note now keeps the thread warm with ' + f + '. Email them the portal link with it.', 'Email portal link', 'copy'];
  }
  function nextHTML(c) {
    var x = nextOf(c);
    return '<section class="card cd-next cd-dyn" aria-label="Suggested next step"><span class="cd-next-i" aria-hidden="true">' + IC('arrow') + '</span><div class="cd-next-t"><div class="k">' + x[0] + '</div><h2>' + esc(x[1]) + '</h2><p>' + esc(x[2]) + '</p></div><button type="button" class="btn-primary" data-cd="' + x[4] + '">' + x[3] + '</button></section>';
  }
  function needsHTML(c) {
    var nd = clNeeds(c), n = nd.length, act = c.projects.filter(function (x) { return !x.done; });
    var h = '<section class="card" id="cd-needs" aria-labelledby="cd-h-needs"><div class="card-h ruled"><div><h2 id="cd-h-needs">Needs your attention</h2><p>' + (n ? 'Most urgent first.' : 'Nothing waiting on you.') + '</p></div><div class="h-actions"><span class="count">' + n + '</span></div></div>';
    if (!n) return h + '<div class="cd-empty">' + IC('tick') + 'All clear for now.</div></section>';
    h += '<ul class="rows">';
    nd.forEach(function (x) {
      var pj = x.pjid || x.pj || (act.length === 1 ? act[0].pid : ''), tab = x.tab || PD_NEED_TAB[x.t] || 'client', f = x.f || (x.t === 'Review current focus' ? 'focus' : x.t === 'Assign next step' ? 'owner' : '');
      h += '<li><a href="#pj-' + pj + '-' + tab + '" class="row' + (x.chip === 'crit' ? ' is-crit' : '') + '" data-need-pj="' + esc(pj) + '" data-need-tab="' + tab + '"' + (x.cr ? ' data-need-cr="' + x.cr + '"' : '') + (f ? ' data-need-f="' + f + '"' : '') + '><span class="sd' + (x.chip ? ' ' + x.chip : '') + '" aria-hidden="true"></span><span><h3>' + esc(x.t) + (x.pj ? '<span class="tag">' + esc(pdName(x.pj)) + '</span>' : '') + '</h3><p>' + esc(x.p) + '</p></span><span class="meta">' +
        (x.chip ? '<span class="chip ' + x.chip + '">' + esc(x.chipT) + '</span>' + (x.date ? '<span class="date">' + esc(x.date) + '</span>' : '') : '<span class="chip quiet">Action needed</span>') + '</span>' + IC('chev') + '</a></li>';
    });
    return h + '</ul></section>';
  }
  function projectsHTML(c) {
    var act = c.projects.filter(function (p) { return !p.done; }).length, dn = c.projects.length - act;
    var sub = !c.projects.length ? 'Nothing shared yet.' : [act ? act + ' active' : '', dn ? dn + ' completed' : ''].filter(Boolean).join(' · ');
    var h = '<section class="card cd-pjs" aria-labelledby="cd-h-pj"><div class="card-h ruled"><div><h2 id="cd-h-pj">Projects</h2><p>' + sub + '</p></div><div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-open-drawer="npj" data-focus="#npj-n">' + IC('plus') + 'New project</button><span class="count">' + c.projects.length + '</span></div></div>';
    if (!c.projects.length) return h + '<div class="cd-empty">No projects yet. Share one with ' + esc(given(c)) + ' to start.</div></section>';
    c.projects.forEach(function (p) {
      var step = p.done ? 5 : p.step, ticks = '';
      for (var i = 1; i <= 5; i++) ticks += '<i' + (i <= step ? ' class="on"' : '') + '></i>';
      var pj = p.done ? null : pdById(p.pid), tg = pj ? 'a' : 'article';
      h += '<' + tg + ' class="cd-pj"' + (pj ? ' href="#pj-' + pj.id + '" data-pj="' + pj.id + '"' : '') + '><span class="pj-av' + (p.done ? ' priv' : '') + '" aria-hidden="true">' + (p.done ? IC('tick') : esc(p.m)) + '</span><div><h3>' + esc(p.n) + '</h3><div class="sub">' + esc(pj ? pdSub(pj) : p.sub) + '</div></div>' +
        '<div class="ph" role="img" aria-label="Phase ' + step + ' of 5: ' + (p.done ? 'Handoff' : esc(p.phase)) + '"><span class="ticks">' + ticks + '</span><span class="ph-t">' + (p.done ? 'Handoff' : esc(p.phase)) + '<em>' + step + ' of 5</em></span></div>' +
        '<div class="due">' + (p.done ? '<span class="chip ok">Delivered</span>' : p.chip ? '<span class="chip ' + p.chip + '">' + esc(p.chipT) + '</span>' : '') + '<span class="dt">' + esc(p.date) + '</span></div></' + tg + '>';
    });
    return h + '</section>';
  }
  function logHTML(c, fresh) {
    var h = '<section class="card" aria-labelledby="cd-h-log"><div class="card-h ruled"><div><h2 id="cd-h-log">Activity</h2><p>Newest first.</p></div><div class="h-actions"><span class="lg"><i class="tdot client"></i>Client<i class="tdot"></i>You</span></div></div><ol class="tl">';
    c.log.forEach(function (e, i) {
      h += '<li' + (fresh && i === 0 ? ' class="fresh"' : '') + '><span class="tdot ' + (e[0] === 'client' ? 'client' : '') + '"></span><div class="tx">' + esc(e[1]) + (e[2] ? '<small>' + esc(e[2]) + '</small>' : '') + '</div><time>' + esc(e[3]) + '</time></li>';
    });
    return h + '</ol></section>';
  }
  function portalHTML(c) {
    var pt = PORTAL[c.portal], f = esc(given(c)), can;
    if (c.portal === 'closed') can = '<ul class="cd-can"><li class="off">The portal is closed. Reopen it to share new work.</li></ul>';
    else can = '<ul class="cd-can"><li class="lb">What ' + f + ' can do</li><li>' + IC('tick') + 'Approve the Scope and accept quotes</li><li>' + IC('tick') + 'Accept deliveries or ask for changes</li><li>' + IC('tick') + 'Flag a missed date</li></ul>';
    return '<section class="card" aria-labelledby="cd-h-portal"><div class="card-h ruled"><div><h2 id="cd-h-portal">Client portal</h2></div><div class="h-actions"><span class="pt-l"><i class="pd ' + pt[0] + '"></i>' + pt[1] + '</span></div></div>' +
      '<dl class="cd-dl"><div><dt>Link</dt><dd>' + (sdSampleC(c) ? '<span class="lk">A sample has no link. Its portal opens as a demo.</span><button type="button" class="icon-sm xs" data-cd="demo" aria-label="Open the portal">' + IC('ext') + '</button>' :   /* CONTRACT 120 */
        '<span class="lk">' + esc(SY.key || syOnPortal(c) ? 'Private link, emailed only to them' : portalUrl(c)) + '</span><button type="button" class="icon-sm xs" data-cd="copy" aria-label="Email portal link">' + IC('mail') + '</button>') + '</dd></div>' +
      '<div><dt>Invited</dt><dd>' + esc(c.invited) + '</dd></div><div><dt>Last seen</dt><dd>' + esc(c.portal === 'closed' ? c.seenT : c.seenT) + '</dd></div>' + syPortalRows(c) +
      '<div class="cd-lang"><dt id="cd-lang-l">Language</dt><dd>' + '<div class="seg" data-cdl id="cd-lang" role="group" aria-labelledby="cd-lang-l" translate="no"><button type="button" data-f="en" aria-pressed="' + (clLang(c) === 'en') + '" lang="en">English</button><button type="button" data-f="vi" aria-pressed="' + (clLang(c) === 'vi') + '" lang="vi">Tiếng Việt</button></div>' + '</dd></div></dl>' + can + '</section>';
  }
  function peopleHTML(c) {
    var list = [{ n: c.contact, r: c.role, e: c.email, p: 1 }].concat(c.people);
    var h = '<section class="card" aria-labelledby="cd-h-ppl"><div class="card-h ruled"><div><h2 id="cd-h-ppl">Contacts</h2></div><div class="h-actions"><span class="count">' + list.length + '</span></div></div><ul class="ppl">';
    list.forEach(function (p) {
      h += '<li><span class="pa" aria-hidden="true">' + esc(initials(p.n)) + '</span><div class="px"><b>' + esc(p.n) + (p.p ? '<span class="tag">Primary</span>' : '') + '</b><small>' + (p.r ? esc(p.r) + ' · ' : '') + (p.e ? esc(p.e) : 'No email yet') + '</small></div>' +
        (p.e ? '<button type="button" class="icon-sm xs" data-cd="mail" data-v="' + esc(p.e) + '" aria-label="Copy email for ' + esc(p.n) + '">' + IC('copy') + '</button>' : '') + '</li>' + (p.p && !p.e && SY.key ? '<li class="sy-mail-li">' + syMailHTML(c) + '</li>' : '');
    });
    return h + '</ul></section>';
  }
  function noteHTML(c) {
    return '<section class="card" aria-labelledby="cd-h-note"><div class="card-h ruled"><div><h2 id="cd-h-note">Private notes</h2></div><div class="h-actions"><span class="lock-tag">' + IC('lock') + 'Only you</span></div></div>' +
      (c.note ? '<p class="cd-note">' + esc(c.note) + '</p>' : '<p class="cd-note empty">Nothing here yet.</p>') + '</section>';
  }
  function htmlEl(str) { var t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstChild; }
  function renderClient(c, o) {
    o = o || {};
    cdCur = c;
    cdHost.classList.toggle('still', !!o.still);
    [].slice.call(cdHost.querySelectorAll('.cd-dyn')).forEach(function (n) { n.remove(); });
    document.getElementById('cd-crumb').textContent = c.name;
    var grid = '<div class="cd-grid cd-dyn"><div class="cd-col">' + needsHTML(c) + projectsHTML(c) + logHTML(c, o.fresh) + '</div><div class="cd-col">' + portalHTML(c) + peopleHTML(c) + noteHTML(c) + '</div></div>';
    [heroHTML(c), nextHTML(c), grid].forEach(function (s) { cdHost.appendChild(htmlEl(s)); });
    cdHost.querySelectorAll('.cd-dyn .seg').forEach(function (sg) { moveThumb(sg, false); });
  }
  function openClient(id, trigger) {
    var c = byId(id); if (!c) return;
    savedY = window.scrollY;
    renderClient(c);
    showView('client', { force: true });
    cdHost.querySelectorAll('.cd-dyn .seg').forEach(function (sg) { moveThumb(sg, false); });
    var h = document.getElementById('cd-title'); if (h) h.focus({ preventScroll: true });
  }

  function today() { var d = new Date(); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function copyText(t, ok) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); ok();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
  }
  function flashCopied(b) {
    if (!b.classList.contains('icon-sm')) return;
    var u = b.querySelector('use'); b.classList.add('done'); u.setAttribute('href', '#i-tick');
    clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('done'); u.setAttribute('href', '#i-copy'); }, 1400);
  }
  function doAct(c, a, sent) {
    if (!sent && syIntercept(c, a)) return;
    var f = given(c), msg;
    if (a === 'review') {
      var card = document.getElementById('cd-needs'), r = card && card.querySelector('.row'); if (!r) return;
      card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      r.classList.remove('cd-flash'); void r.offsetWidth; r.classList.add('cd-flash');
      setTimeout(function () { r.classList.remove('cd-flash'); }, 1800);
      r.focus({ preventScroll: true });
      return;
    }
    if (a === 'resend') { c.invited = today(); c.ptS = 'Invite resent just now'; c.act = ['Just now', 'Invite resent']; c.log.unshift(['you', 'You resent the portal invite to ' + f, '', 'Just now', null, Date.now()]); msg = 'Invite resent to ' + f; }
    else if (a === 'invite' || a === 'reopen') {
      c.status = 'current'; c.portal = 'invited'; c.ptS = 'Not opened yet'; c.seenN = '—'; c.seenT = 'Not opened yet'; c.invited = today();
      c.act = ['Just now', a === 'invite' ? 'Invite sent' : 'Portal reopened'];
      c.log.unshift(['you', a === 'invite' ? 'You sent the portal invite to ' + f : 'You reopened the portal for ' + c.name, '', 'Just now', null, Date.now()]);
      msg = a === 'invite' ? 'Invite sent to ' + f : 'Portal reopened for ' + c.name;
    }
    else if (a === 'checkin') { c.act = ['Just now', 'Check-in sent']; c.log.unshift(['you', 'You sent a check-in to ' + f, '', 'Just now', null, Date.now()]); msg = 'Check-in sent to ' + f; }
    else return;
    refreshRow(c); updateCounts(); lists.clients.refresh();
    if (curView === 'client' && cdCur === c) {
      renderClient(c, { still: true, fresh: true });
      var nb = cdHost.querySelector('.cd-next .btn-primary'); if (nb) nb.focus({ preventScroll: true });
    }
    showToast(msg);
  }
  cdHost.addEventListener('click', function (e) {
    var lb = e.target.closest('[data-cdl] button[data-f]');
    if (lb && cdCur && sdSampleC(cdCur)) { e.preventDefault(); sdSampleNo(); return; }   // v120 (88)
    if (lb && cdCur) {
      var l = lb.getAttribute('data-f'); if (l === clLang(cdCur)) return;
      cdCur.lang = l; setPressed(lb.parentNode, l);
      cdCur.log.unshift(['you', 'You set the portal and email language for ' + cdCur.name + ' to ' + (l === 'vi' ? 'Tiếng Việt' : 'English'), '', 'Just now', null, Date.now()]);
      /* already on the server: tell it now (a client not sent yet takes the language with it the first time) */
      if (SY.key && cdCur.sy && cdCur.sy.slug === SY.slug) { var cc = cdCur; syQ(function () { return syEnsureClient(cc); }); }
      showToast((given(cdCur) || cdCur.name) + ' will read the portal and emails in ' + (l === 'vi' ? 'Tiếng Việt' : 'English'));
      return;
    }
    var b = e.target.closest('[data-cd]'); if (!b || !cdCur) return;
    e.preventDefault();
    var a = b.getAttribute('data-cd');
    if (a === 'demo') { sdpOpenClient(cdCur); return; }   /* CONTRACT 120: a sample client's portal, as the portal's demo */
    if (a === 'copy' && sdSampleC(cdCur)) { sdSampleNo(); return; }   // v120 (88): a portal link is made on the server; a sample has none
    if (a === 'copy' || a === 'mail') {
      if (a === 'copy') { syMailLink(cdCur, b); return; }   /* api.php 1.31.4 (136): emailed, never copied */
      copyText(a === 'copy' ? 'https://' + portalUrl(cdCur) : b.getAttribute('data-v'), function () { flashCopied(b); showToast(a === 'copy' ? 'Portal link copied' : 'Email copied'); });
      return;
    }
    if (a !== 'review' && sdSampleC(cdCur)) { sdSampleNo(); return; }   // v120 (88): a sample client is to look at
    doAct(cdCur, a);
  });
  clList.addEventListener('click', function (e) {
    var li = e.target.closest('.pl-item'); if (!li) return;
    e.preventDefault(); openClient(li.getAttribute('data-id'));
  });
  function removeClient(id) {
    var i = CLIENTS.findIndex(function (c) { return c.id === id; }); if (i < 0) return;
    var li = clList.querySelector('[data-id="' + id + '"]'); CLIENTS.splice(i, 1);
    updateCounts();
    if (li) { li.classList.remove('enter', 'fresh'); li.classList.add('gone'); setTimeout(function () { li.remove(); lists.clients.refresh(); }, reduced ? 0 : 260); }
  }

  /* ---------- new client drawer ---------- */
  var cfOnOpen = function () {};
  function appLang() { return window.SDI18N && SDI18N.lang === 'vi' ? 'vi' : 'en'; }
  /* the language a client reads: set for them, else the one ScopeDue is in (which is what the server uses for them too) */
  function clLang(c) { return c && (c.lang === 'en' || c.lang === 'vi') ? c.lang : appLang(); }
  /* v74: a private project's language, set when it is made (or from its menu), else the one ScopeDue is in */
  function pjLang(p) { return p && (p.lang === 'en' || p.lang === 'vi') ? p.lang : appLang(); }
  (function () {
    var form = document.getElementById('cf'), nm = document.getElementById('cf-name'), ct = document.getElementById('cf-contact'), rl = document.getElementById('cf-role');
    var em = document.getElementById('cf-email'), nt = document.getElementById('cf-note'), sw = document.getElementById('cf-sw');
    var prev = document.getElementById('cf-prev'), av = document.getElementById('cf-av'), pn = document.getElementById('cf-pn'), ps = document.getElementById('cf-ps'), opt = document.getElementById('cf-email-opt');
    /* v68: the language this client reads the portal and its emails in. Starts on the language ScopeDue is in */
    var lg = document.getElementById('cf-lang'), lgSet = false;
    function lgVal() { var b = lg.querySelector('button[aria-pressed="true"]'); return b ? b.getAttribute('data-f') : 'en'; }
    lg.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; lgSet = true; setPressed(lg, b.getAttribute('data-f')); });
    cfOnOpen = function () { if (!lgSet) { lg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === appLang() ? 'true' : 'false'); }); } };
    function inviteOn() { return sw.getAttribute('aria-checked') === 'true'; }
    function firstChar(t) { var m = t.match(/[\p{L}\p{N}]/u); return m ? m[0].toUpperCase() : '?'; }
    function preview() {
      var n = nm.value.trim(), c = ct.value.trim(), r = rl.value.trim();
      prev.classList.toggle('empty', !n);
      pn.textContent = n || 'Client name';
      var ini = n ? firstChar(n) : '?';
      if (av.textContent !== ini) { av.textContent = ini; if (!reduced) { av.classList.add('tick'); setTimeout(function () { av.classList.remove('tick'); }, 180); } }
      ps.textContent = c ? c + (r ? ' · ' + r : '') : 'Appears here as you type';
    }
    function setErr(id, msg) {
      var f = document.getElementById(id), i = f.querySelector('input');
      if (msg) { f.setAttribute('data-err', ''); f.querySelector('.err').textContent = msg; i.setAttribute('aria-invalid', 'true'); }
      else { f.removeAttribute('data-err'); f.querySelector('.err').textContent = ''; i.removeAttribute('aria-invalid'); }
    }
    [nm, ct, em].forEach(function (i) { i.addEventListener('input', function () { var f = i.closest('.fld'); if (f.hasAttribute('data-err')) setErr(f.id, ''); }); });
    [nm, ct, rl].forEach(function (i) { i.addEventListener('input', preview); });
    sw.addEventListener('click', function () {
      var on = !inviteOn(); sw.setAttribute('aria-checked', on ? 'true' : 'false');
      opt.textContent = on ? 'Needed for the invite' : 'Optional';
      if (!on && !em.value.trim()) setErr('f-email', '');
    });
    function validate() {
      var n = nm.value.trim(), c = ct.value.trim(), e = em.value.trim();
      var en = !n ? 'Enter the client or company name.' : CLIENTS.some(function (x) { return fold(x.name) === fold(n); }) ? 'You already have a client with this name.' : '';
      var ec = !c ? 'Enter who you will be working with.' : '';
      var ee = (!e && inviteOn()) ? 'Add an email to send the invite, or turn the invite off.' : (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) ? 'That email address does not look right.' : '';
      setErr('f-name', en); setErr('f-contact', ec); setErr('f-email', ee);
      var first = en ? nm : ec ? ct : ee ? em : null;
      if (first) { first.focus(); return false; }
      return true;
    }
    function reset() {
      form.reset(); sw.setAttribute('aria-checked', 'true'); opt.textContent = 'Needed for the invite'; lgSet = false;
      ['f-name', 'f-contact', 'f-email'].forEach(function (id) { setErr(id, ''); }); preview();
    }
    function create() {
      if (!validate()) return;
      var n = nm.value.trim(), inv = inviteOn(), d = new Date(), id = slug(n).slice(0, 48).replace(/-+$/, '') || 'client', base = id, k = 2;
      while (byId(id)) id = base + '-' + (k++);
      var who = ct.value.trim(), f = who.split(/\s+/)[0];
      var c = { id: id, name: n, ini: firstChar(n), contact: who, role: rl.value.trim(), email: em.value.trim(), lang: lgVal(), people: [], status: 'current', portal: inv ? 'invited' : 'draft',
        ptS: inv ? 'Not opened yet' : 'Invite not sent', seenN: '—', seenT: inv ? 'Not opened yet' : 'Not invited yet', invited: inv ? today() : 'Not yet', since: MON[d.getMonth()] + ' ' + d.getFullYear(),
        act: ['Just now', inv ? 'Invite sent' : 'Client added'], projects: [], needs: [], note: nt.value.trim(),
        log: (inv ? [['you', 'You sent the portal invite to ' + f, '', 'Just now']] : []).concat([['you', 'You added ' + n + ' as a client', '', 'Just now']]) };
      CLIENTS.unshift(c);
      lists.clients.stop();
      var li = rowEl(c); li.classList.add('enter', 'fresh'); clList.insertBefore(li, clList.firstChild);
      lists.clients.reset(false);
      closeDrawer();
      updateCounts();
      li.scrollIntoView({ block: 'nearest' });
      setTimeout(reset, 520);
      showToast('Client created · ' + n, function () { removeClient(id); });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); create(); });
    form.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); create(); } });
    preview();
  })();

  function showView(name, opts) {
    opts = opts || {};
    if (!viewEls[name]) return;
    if (name === 'profile' && !syHasSession()) { syRequireProfileSignIn(); return; }
    if (name === curView && !opts.force) return;
    closeNotif(true); if (openEl) closeDrawer(true);
    curView = name;
    app.setAttribute('data-v', name);
    Object.keys(viewEls).forEach(function (k) { viewEls[k].hidden = (k !== name); });
    if (window.SDI18N && SDI18N.reveal) SDI18N.reveal(viewEls[name]);   /* v68: a page is put in the language when it is first shown */
    syncThumbs(viewEls[name]);
    var navName = name === 'client' ? 'clients' : name === 'project' ? 'projects' : name;
    document.querySelectorAll('.nav-i[data-view], .user[data-view]').forEach(function (a) {
      if (a.getAttribute('data-view') === navName) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var h = document.querySelector('#nav .nav-hover'); if (h) h.style.opacity = 0;
    if (name === 'mywork') mwEnter();
    if (name === 'actions') caEnter();
    if (name === 'dashboard') { dayTick(); dbRecent(); dvJnPaint(); }
    window.scrollTo(0, opts.scroll || 0);
    if (lists[name]) lists[name].enter();
    if (name === 'inbox') xbEnter();
    if (name === 'profile') pfEnter();
    if (name === 'settings') stEnter();
    if (name === 'project') pdEnter(); else pdLeave();
  }
  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]'); if (!v) return;
    e.preventDefault();
    var target = v.getAttribute('data-view');
    if (curView === 'client' && target === 'clients' && v.closest('.crumb')) {
      var id = cdCur && cdCur.id;
      showView('clients', { scroll: savedY });
      var row = id && clList.querySelector('[data-id="' + id + '"] .pl-row'); if (row) row.focus({ preventScroll: true });
    } else showView(target);
  });

