  /* ================================================================== first run */
  /* v69: what the person said they work on at the first run (CONTRACT.md, section 30): 'own' (their own projects) or 'client'.
     Empty for a workspace begun before v69, which keeps everything as it was. With 'own' and no client yet, the client pages
     stay out of the way; the first client brings them back */
  function sdFocus() { try { var v = localStorage.getItem('sd-focus') || ''; return v === 'own' || v === 'client' ? v : ''; } catch (e) { return ''; } }
  function sdSetFocus(v) { try { localStorage.setItem('sd-focus', v); } catch (e) {} sdFocusPaint(); }
  function sdNoClients() { return sdFocus() === 'own' && !CLIENTS.length; }
  function sdFocusPaint() {
    var on = sdNoClients();
    if (on) root.setAttribute('data-noclients', ''); else root.removeAttribute('data-noclients');
    try { if (on) localStorage.setItem('sd-nocl', '1'); else localStorage.removeItem('sd-nocl'); } catch (e) {}
    if (on && (curView === 'clients' || curView === 'actions')) showView('dashboard');
  }
  /* v72: app.scopedue.com, the web app (the build marks its page with meta sd-pwa), works with a ScopeDue account. The first visit on a
     device asks to sign in; the key stays in this browser (sd-sync), so every later visit goes straight in. Signed out, it asks again. */
  function sdPwa() { return !!document.querySelector('meta[name="sd-pwa"]'); }
  /* the brand mark, as the phone top bar draws it (the page carries it once) */
  function xaMark() { var i = document.querySelector('.brand-mk'); return i ? '<img src="' + i.getAttribute('src') + '" alt="">' : ''; }
  function xaNeedIn() { return sdPwa() && !SY.key; }
  /* the sign-in window closed: signed in, the welcome goes on (or the gate goes); not, the gate asks again */
  function xaSyncClosed() {
    var m = document.getElementById('xa-wl'); if (!m || !XA.inWait) return;
    XA.inWait = false; m.hidden = false;
    if (xaNeedIn()) { setTimeout(function () { var b = m.querySelector('#xa-ingo'); if (b) b.focus(); }, 30); return; }
    if (m.xaIn) m.xaIn();
  }
  /* not a first run, and no key on the web app (signed out, or the data came without one): only the sign-in step */
  function xaGate() {
    if (!xaNeedIn() || document.getElementById('xa-wl')) return;
    var m = document.createElement('div'); m.className = 'xa-wl'; m.id = 'xa-wl';
    m.innerHTML = '<div class="xa-wd" role="dialog" aria-modal="true" aria-labelledby="xa-it" aria-describedby="xa-id"><span class="xa-mk" aria-hidden="true">' + xaMark() + '</span>' +
      '<div class="xa-st" id="xa-in" hidden>' +
      '<h2 id="xa-it">Sign in to ScopeDue</h2><p id="xa-id">On the web, ScopeDue works with your ScopeDue account. Sign in once on this device: it remembers you after that.</p>' +
      '<button type="button" class="btn-primary xa-ingo" id="xa-ingo">Sign in</button>' +
      '<p class="xa-later xa-inl">No account yet? Sign up in the same window.</p></div>' +
      '</div>';
    document.body.appendChild(m);
    m.querySelector('#xa-in').hidden = false;
    m.xaIn = function () { m.remove(); };   /* the sign-in said Signed in already */
    m.querySelector('#xa-ingo').addEventListener('click', function (e) { XA.inWait = true; m.hidden = true; openDrawer('sync', e.currentTarget); });
    setTimeout(function () { var b = m.querySelector('#xa-ingo'); if (b) b.focus(); }, 50);
  }
  function xaShould() {
    if (xaFirst()) return false;
    if (sdTest() && !/[?&]welcome\b/.test(location.search)) return false;
    if (!SDBOOT.restored) return true;
    /* saved before, but never past the samples: still a first run */
    var S = XA.sample || {};
    return pfSaved.name === PF_DEF.name && PROJECTS.length > 0 && PROJECTS.every(function (p) { return (S.p || []).indexOf(p.id) > -1; });
  }
  /* v68: on the very first run the welcome asks for the language first, in both languages, before anything else.
     Picking one shows the welcome in it straight away; it is kept only when the person goes on. Settings › General changes it later. */
  function xaWelcome() {
    // First-run onboarding defaults to English regardless of the browser language.
    var I = window.SDI18N, askLang = !!(I && !I.chosen), pick = askLang ? 'en' : (I ? I.lang : 'en');
    var m = document.createElement('div');
    m.className = 'xa-wl'; m.id = 'xa-wl';
    m.innerHTML = '<div class="xa-wd" role="dialog" aria-modal="true" aria-labelledby="' + (askLang ? 'xa-lt' : 'xa-t') + '" aria-describedby="' + (askLang ? 'xa-ld' : 'xa-d') + '">' +
      '<span class="xa-mk" aria-hidden="true">' + xaMark() + '</span>' +
      (askLang ? '<div class="xa-st" id="xa-lang">' +
        '<h2 id="xa-lt">Choose your language</h2><p id="xa-ld">ScopeDue will use it for menus, messages and dates.</p>' +
        '<fieldset class="xa-ch xa-lg" translate="no"><legend class="xa-sr">Language · Ngôn ngữ</legend>' +
        '<label lang="en"><input type="radio" name="lg" value="en"' + (pick === 'en' ? ' checked' : '') + '><span><b>English</b><small>Use ScopeDue in English</small></span><span class="xa-lc" aria-hidden="true">EN</span></label>' +
        '<label lang="vi"><input type="radio" name="lg" value="vi"' + (pick === 'vi' ? ' checked' : '') + '><span><b>Tiếng Việt</b><small>Dùng ScopeDue bằng tiếng Việt</small></span><span class="xa-lc" aria-hidden="true">VI</span></label></fieldset>' +
        '<p class="xa-later">You can change it any time in Settings › General.</p>' +
        '<button type="button" class="btn-primary xa-lgo" id="xa-lgo">Continue</button></div>' : '') +
      /* v72: the web app asks for the ScopeDue account here (xaNeedIn) */
      '<div class="xa-st" id="xa-in" hidden>' +
      '<h2 id="xa-it">Sign in to ScopeDue</h2><p id="xa-id">On the web, ScopeDue works with your ScopeDue account. Sign in once on this device: it remembers you after that.</p>' +
      '<button type="button" class="btn-primary xa-ingo" id="xa-ingo">Sign in</button>' +
      '<p class="xa-later xa-inl">No account yet? Sign up in the same window.</p></div>' +
      '<div class="xa-st" id="xa-you"' + (askLang || xaNeedIn() ? ' hidden' : '') + '>' +
      (askLang ? '<button type="button" class="xa-back" id="xa-back"><svg class="i" aria-hidden="true"><use href="#i-chevl"/></svg><span>Language</span><b translate="no"></b></button>' : '') +
      '<h2 id="xa-t">Welcome to ScopeDue</h2><p id="xa-d">Scope, changes and the work, in one place. It all stays in this browser until you share it.</p>' +
      '<form id="xa-f" novalidate><div class="fld xa-f"><label for="xa-n">Your name</label><input id="xa-n" name="n" maxlength="60" autocomplete="name" placeholder="Robert" aria-describedby="xa-nh" required><small id="xa-nh">The people you share a project with see it.</small></div>' +
      '<fieldset class="xa-ch xa-w"><legend>What are you working on?</legend>' +
      '<label><input type="radio" name="w" value="own" checked><span><b>My own projects</b><small>A product, a side project or internal work. On your own or with a team.</small></span></label>' +
      '<label><input type="radio" name="w" value="client"><span><b>Work for clients</b><small>Scope your clients approve, and changes they agree to pay for.</small></span></label></fieldset>' +
      (XA_SAMPLES ? '<fieldset class="xa-ch" id="xa-sf"><legend>How do you want to begin?</legend>' +
        '<label><input type="radio" name="s" value="empty"><span><b>Start empty</b><small>Your own projects from the first click.</small></span></label>' +
        '<label><input type="radio" name="s" value="sample" checked><span><b>Explore with sample projects</b><small data-own>A product of your own, from the idea to a first release that works. Clear it any time in Settings › Storage & data.</small><small data-cl>A client project from Scope to delivery, and a product of your own. Clear them any time in Settings › Storage & data.</small><small data-cl1 hidden>A client project from Scope to delivery, with what the client did in the portal. Clear it any time in Settings › Storage & data.</small></span></label></fieldset>' : '') +
      '<p class="err" role="alert" id="xa-err"></p><button type="submit" class="btn-primary xa-go">Continue</button></form></div></div>';
    document.body.appendChild(m);
    var inp = m.querySelector('#xa-n'), prev = document.activeElement, wd = m.querySelector('.xa-wd');
    /* v72: on the web app, signing in comes between the language and the rest; the name is the account's */
    var toYou1 = function () {
      m.querySelector('#xa-in').hidden = true; m.querySelector('#xa-you').hidden = false;
      wd.setAttribute('aria-labelledby', 'xa-t'); wd.setAttribute('aria-describedby', 'xa-d');
      if (!inp.value && pfSaved.name && pfSaved.name !== PF_DEF.name && pfSaved.name !== 'ScopeDue user') inp.value = pfSaved.name;
      setTimeout(function () { inp.focus(); }, 30);
    };
    var toIn = function () {
      m.querySelector('#xa-you').hidden = true; m.querySelector('#xa-in').hidden = false;
      wd.setAttribute('aria-labelledby', 'xa-it'); wd.setAttribute('aria-describedby', 'xa-id');
      setTimeout(function () { m.querySelector('#xa-ingo').focus(); }, 30);
    };
    m.xaIn = toYou1;
    m.querySelector('#xa-ingo').addEventListener('click', function (e) { XA.inWait = true; m.hidden = true; openDrawer('sync', e.currentTarget); });
    /* what the person works on is kept on the dialog; the sample's line no longer follows it (v126, 100) */
    wd.setAttribute('data-w', 'own');
    m.querySelector('.xa-w').addEventListener('change', function (e) { if (e.target.name === 'w') { wd.setAttribute('data-w', e.target.value); sfPaint(pick); } });
    /* v111 (67): the sample is offered only in a language that has one. v126 (100): to everyone, whatever they work on, and its line
       says what the language's sample holds: a product, a client project, or both */
    var sf = m.querySelector('#xa-sf'), sfPaint = function (l) {
      if (!sf) return;
      var h = xaSampleHas(l);
      sf.hidden = !h.cl;
      sf.querySelector('small[data-own]').hidden = !(h.own && !h.client);
      sf.querySelector('small[data-cl]').hidden = !(h.own && h.client);
      sf.querySelector('small[data-cl1]').hidden = !(h.client && !h.own);
    };
    sfPaint(pick);
    /* the choice shows at once, without being kept until the person goes on */
    var preview = function (l) { if (I && I.lang !== l) I.set(l, { keep: false }); sfPaint(l); };
    if (askLang) {
      preview(pick);
      m.querySelector('.xa-lg').addEventListener('change', function (e) { if (e.target.name === 'lg') { pick = e.target.value; preview(pick); } });
      var toYou = function () {
        I.set(pick);
        m.querySelector('#xa-back b').textContent = I.langs[pick];
        if (xaNeedIn()) { m.querySelector('#xa-lang').hidden = true; toIn(); return; }
        m.querySelector('#xa-lang').hidden = true; m.querySelector('#xa-you').hidden = false;
        m.querySelector('#xa-back b').textContent = I.langs[pick];
        wd.setAttribute('aria-labelledby', 'xa-t'); wd.setAttribute('aria-describedby', 'xa-d');
        setTimeout(function () { inp.focus(); }, 30);
      };
      m.querySelector('#xa-lgo').addEventListener('click', toYou);
      m.querySelector('#xa-back').addEventListener('click', function () {
        m.querySelector('#xa-you').hidden = true; m.querySelector('#xa-lang').hidden = false;
        wd.setAttribute('aria-labelledby', 'xa-lt'); wd.setAttribute('aria-describedby', 'xa-ld');
        var c = m.querySelector('input[name="lg"]:checked'); if (c) c.focus();
      });
      setTimeout(function () { var c = m.querySelector('input[name="lg"]:checked'); if (c) c.focus(); }, 50);
    } else if (xaNeedIn()) toIn();
    else setTimeout(function () { inp.focus(); }, 50);
    m.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(m.querySelectorAll('input:checked, input[name="n"], button')).filter(function (x) { return !x.closest('[hidden]'); }), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    m.querySelector('#xa-f').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = inp.value.replace(/\s+/g, ' ').trim(), w = m.querySelector('input[name="w"]:checked').value, sc = sf && !sf.hidden ? sf.querySelector('input[name="s"]:checked') : null, s = sc ? sc.value : 'empty';
      if (n.length < 2) { m.querySelector('#xa-err').textContent = 'Your name, so the people you work with know who it is.'; inp.focus(); return; }
      if (I && !I.chosen) I.set(I.lang);
      var pf = pfClone(pfSaved); pf.name = n; pfApplyState(pf, pf); ME.ini = initials(n);
      xaSetFirst(s); sdSetFocus(w);
      m.querySelector('#xa-f .xa-go').disabled = true;
      if (s === 'sample') xaLoadSample(n, w, I ? I.lang : 'en', function (why) { m.querySelector('#xa-f .xa-go').disabled = false; m.querySelector('#xa-err').textContent = why; });
      else if (SDBOOT.restored) xaClearSample(); else xaEmpty(true);
    });
  }
  /* empty, saved, and the page drawn again from what was saved */
  function xaClearAll(lists) { lists.forEach(function (l) { l.splice(0, l.length); }); }
  function xaEmpty(all) {
    if (all) { xaClearAll([PROJECTS, CLIENTS, THREADS, notes, TEAM]); XA.sample = {}; }
    TD.items = TD.items.filter(function (x) { return !x.pid || pdById(x.pid); });
    RECENT = RECENT.filter(function (r) { return pdById(r.id); });
    var go = function () { location.reload(); };
    var s = SDB.save(); if (s && s.then) s.then(go, go); else go();
  }
  /* ---- the sample (CONTRACT.md 36, 67): one workspace per language, made by someone using the app in it, put into the build from
     samples/workspace.<lang>.json. It goes in the way a copy does (SDB.parseBackup, SDB.replaceAll), with its ids, its language (l)
     and what the person works on (w) written down in meta "sample", so Settings › Storage & data can clear it and a change of
     language can swap it. v126 (100): it comes in whole, every sample project of the language, whatever the person works on */
  function xaSampleText(l) { return XA_SAMPLES && typeof XA_SAMPLES[l] === 'string' ? XA_SAMPLES[l] : ''; }
  /* what a language's sample holds: a project of the person's own (own), a client project (client), any project at all (cl) */
  var xaHas = {};
  function xaSampleHas(l) {
    if (xaHas[l]) return xaHas[l];
    var h = { own: false, client: false, cl: false }, b;
    try { b = JSON.parse(xaSampleText(l) || 'null'); } catch (e) { b = null; }
    ((b && b.ent) || []).forEach(function (e) { if (e.k.indexOf('project:') === 0) { h.cl = true; if (e.d.kind === 'client') h.client = true; else h.own = true; } });
    return (xaHas[l] = h);
  }
  /* w (what the person works on) is only written down: v126 (100) no longer leaves the client projects out for My own projects */
  function xaSampleRead(l, w) {
    var b, ids = { p: [], c: [], t: [], n: [], tm: [], l: l, w: w };
    try { b = JSON.parse(xaSampleText(l)); } catch (e) { return null; }
    if (!b || !Array.isArray(b.ent)) return null;
    b.meta = b.meta || {};
    b.meta.team = b.meta.team || [];
    b.meta.sample = ids;
    return b;
  }
  function xaSampleIds(b) {
    var S = b.meta.sample;
    S.p = []; S.c = []; S.t = []; S.n = [];
    b.ent.forEach(function (e) { var l = { project: S.p, client: S.c, thread: S.t, note: S.n }[e.k.split(':')[0]]; if (l) l.push(e.d.id); });
  }
  function xaLoadSample(name, w, l, fail) {
    var b = xaSampleRead(l, w), ok;
    if (!b) return fail('The sample could not be read. Start empty instead.');
    xaSampleIds(b); b.meta.sample.tm = b.meta.team.map(function (m) { return m.e; });
    ok = SDB.parseBackup(JSON.stringify(b));
    if (!ok.ok) return fail(ok.msg);
    try { sessionStorage.setItem('sd-xa-hi', name.split(' ')[0]); } catch (e) {}
    SDB.replaceAll(ok.backup).then(function () { location.reload(); }, function (e) { fail((e && e.message) || 'This browser is not letting ScopeDue save. Start empty instead.'); });
  }
  /* the sample s goes in beside what the workspace b already holds. Ids it shares with the person's own records get a new one, and
     every link to them follows; the person's order comes first, then the sample's; counters only go up */
  function xaMerge(b, s) {
    var have = {}, map = {}, nid = 1, kmap = {};
    b.ent.forEach(function (e) { have[e.k] = 1; if (e.k.indexOf('note:') === 0 && +e.d.id >= nid) nid = +e.d.id + 1; });
    var free = function (k, id) { var x = id, i = 2; while (have[k + ':' + x]) x = id + '-' + i++; have[k + ':' + x] = 1; return x; };
    s.ent.forEach(function (e) { var k = e.k.split(':')[0]; map[e.k] = k === 'note' ? nid++ : free(k, e.d.id); });
    var pid = function (v) { return v && map['project:' + v] != null ? map['project:' + v] : v; };
    s.ent.forEach(function (e) {
      var k = e.k.split(':')[0], d = e.d;
      d.id = map[e.k];
      if (k === 'project' && d.cid && map['client:' + d.cid] != null) d.cid = map['client:' + d.cid];
      if (k === 'client') (d.projects || []).forEach(function (x) { x.pid = pid(x.pid); });
      if (k === 'note' || k === 'thread') d.pid = pid(d.pid);
      kmap[e.k] = k + ':' + d.id; e.k = kmap[e.k];
      b.ent.push(e);
    });
    b.ord = b.ord || {};
    ['project', 'client', 'thread', 'note'].forEach(function (k) {
      var mine = (b.ord[k] || []).slice(), theirs = ((s.ord || {})[k] || []).map(function (x) { return kmap[x]; }).filter(Boolean);
      s.ent.forEach(function (e) { if (e.k.split(':')[0] === k && theirs.indexOf(e.k) < 0) theirs.push(e.k); });
      b.ord[k] = mine.concat(theirs);
    });
    b.meta = b.meta || {};
    var team = b.meta.team || [], tm = [];
    (s.meta.team || []).forEach(function (m) { if (!team.some(function (x) { return x.e === m.e; })) { team.push(m); tm.push(m.e); } });
    b.meta.team = team;
    var c = b.meta.ctr || {}, sc = s.meta.ctr || {};
    ['pdN', 'pdeN', 'prvN'].forEach(function (k) { c[k] = Math.max(+c[k] || 0, +sc[k] || 0); });
    c.nextId = Math.max(+c.nextId || 1, nid);
    b.meta.ctr = c;
    b.meta.sample = s.meta.sample; xaSampleIds({ ent: s.ent, meta: s.meta }); b.meta.sample.tm = tm;
    delete b.sum;
    return b;
  }
  /* v111 (67): each language has its own sample, and no project belongs to two. A workspace that holds one (meta sample with l)
     swaps it when the language changes in Settings: the old one goes as Clear sample data takes it, the new language's comes in
     beside the person's own work, and the page is drawn again. A language with no sample yet leaves none, until it changes back */
  function xaLangSwap(l) {
    var S = XA.sample || {}, w = S.w === 'own' ? 'own' : 'client';
    if (!S.l || S.l === l) return;
    var s = xaSampleRead(l, w);
    xaDropSample();
    XA.sample = { p: [], c: [], t: [], n: [], tm: [], l: l, w: w };
    TD.items = TD.items.filter(function (x) { return !x.pid || pdById(x.pid); });
    RECENT = RECENT.filter(function (r) { return pdById(r.id); });
    try { sessionStorage.setItem('sd-xa-sw', s ? 'in' : 'none'); } catch (e) {}
    var go = function () { location.reload(); };
    var saved = SDB.save();
    Promise.resolve(saved).then(function () {
      if (!s) return go();
      return SDB.exportAll().then(function (b) {
        var ok = b && SDB.parseBackup(JSON.stringify(xaMerge(b, s)));
        if (!ok || !ok.ok) return go();
        return SDB.replaceAll(ok.backup).then(go, go);
      });
    }).then(null, go);
  }
  /* ---- Settings › Storage & data: the samples, and only them ---- */
  function xaLeft() {
    var S = XA.sample || {}, has = function (l, k) { return (l || []).indexOf(k) > -1; };
    return {
      p: PROJECTS.filter(function (p) { return has(S.p, p.id) && !p.x8; }),
      t: THREADS.filter(function (t) { return has(S.t, t.id); }),
      n: notes.filter(function (n) { return has(S.n, n.id); })
    };
  }
  function xaSamplePaint() {
    var c = document.getElementById('xa-sample'); if (!c) return;
    var l = xaLeft(), b = document.getElementById('xa-sb');
    c.hidden = !l.p.length && !l.t.length;
    if (c.hidden) return;
    var parts = [l.p.length ? itemsLbl0(l.p.length, 'project') : '', l.n.length ? itemsLbl0(l.n.length, 'note') : ''].filter(Boolean);
    b.innerHTML = '<p class="sy-p">' + esc(prvList(parts).replace(/^./, function (c) { return c.toUpperCase(); })) + ' are still here. Clearing them leaves your own projects, clients and notes as they are.</p>' +
      (pfSampleHas() ? '<p class="sy-p">Your Profile will also be reset. Only your name is kept.</p>' : '') +
      (XA.arm ? '<div class="sy-acts"><button type="button" class="btn-primary btn-sm ld-crit" data-xa="clear-go">Remove the sample data</button><button type="button" class="btn-ghost btn-sm" data-xa="clear-no">Cancel</button></div>' :
        '<div class="sy-acts"><button type="button" class="btn-ghost btn-sm" data-xa="clear">Clear sample data…</button></div>');
  }
  function itemsLbl0(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function xaClearSample() {
    xaDropSample();
    XA.sample = {};
    pfSampleClear();
    xaEmpty(false);
  }
  /* in memory: everything but the sample (a project shared with a team since stays, with the client and teammates it uses) */
  function xaDropSample() {
    var S = XA.sample || {}, has = function (l, k) { return (l || []).indexOf(k) > -1; };
    var keepP = PROJECTS.filter(function (p) { return !has(S.p, p.id) || p.x8; });
    var used = {}; keepP.forEach(function (p) { if (p.cid) used[p.cid] = 1; (p.team || []).forEach(function (m) { used['@' + m.e] = 1; }); });
    var keepC = CLIENTS.filter(function (c) { return !has(S.c, c.id) || used[c.id]; });
    var keepT = THREADS.filter(function (t) { return !has(S.t, t.id); });
    var keepN = notes.filter(function (n) { return !has(S.n, n.id); });
    var keepM = TEAM.filter(function (m) { return !has(S.tm, m.e) || used['@' + m.e]; });
    [[PROJECTS, keepP], [CLIENTS, keepC], [THREADS, keepT], [notes, keepN], [TEAM, keepM]].forEach(function (x) { x[0].splice.apply(x[0], [0, x[0].length].concat(x[1])); });
  }

  /* ---- an empty workspace says what to do, not that nothing matched ---- */
  function xaListEmpty(view, el) {
    if (!el.hasAttribute('data-orig')) el.setAttribute('data-orig', el.innerHTML);
    el.innerHTML = view.id === 'view-projects' ? '<b>No projects yet</b>A client project keeps the Scope your client approves. A private one is for your own product or internal work. <button type="button" class="link" data-xa="new">Start your first project</button>' :
      '<b>No clients yet</b>Add the people you build for. Each gets a portal to approve Scope and changes. <button type="button" class="link" data-xa="newc">Add your first client</button>';
    el.classList.add('xa-first');
  }
  function xaListMatch(el) { if (el.hasAttribute('data-orig')) { el.innerHTML = el.getAttribute('data-orig'); el.removeAttribute('data-orig'); el.classList.remove('xa-first'); } }
  function xaRecentEmpty() {
    return '<div class="xa-e">' + IC('folder') + '<b>' + (PROJECTS.length ? 'Open a project and it shows here' : 'Your projects show up here') + '</b><span>' + (PROJECTS.length ? 'The ones you worked on last, to pick up where you left off.' : 'Start with the one you are working on now.') + '</span>' + (PROJECTS.length ? '' : '<button type="button" class="btn-ghost btn-sm" data-xa="new">' + IC('plus') + 'New project</button>') + '</div>';
  }
  function xaNotesEmpty() {
    var d = document.getElementById('dash-notes'); if (!d) return;
    if (!notes.length) d.innerHTML = '<div class="xa-e">' + IC('bulb') + '<b>Nothing jotted down</b><span>A thought, a link, a reminder. Move it into a project when it is ready.</span></div>';
  }
  function xaSide() {
    var lab = document.getElementById('side-recent-l'); if (lab) lab.hidden = !recList().length;
    var bd = document.querySelector('.nav-i[data-view="projects"] .badge'); if (bd) bd.hidden = !PROJECTS.length;
  }
  /* v68: people's words, from what is in memory now. Called whenever data may have changed: every change that is saved,
     and right where teammates', clients' and GitHub's data comes in, before it is drawn */
  function sdUTNow() { sdUTSend({ project: PROJECTS, client: CLIENTS, note: notes }, XA.sample || {}, TEAM, TD.items); }
  var sdUTq = false;
  function sdUTSoon() { if (sdUTq) return; sdUTq = true; Promise.resolve().then(function () { sdUTq = false; sdUTNow(); }); }
  function sdUTInit() {
    if (!window.SDI18N) return;
    ['soon', 'save'].forEach(function (k) { var f = SDB[k]; SDB[k] = function () { sdUTSoon(); return f.apply(SDB, arguments); }; });
    SDB.on(sdUTSoon);
    sdUTNow();
  }
  /* the samples, { en: JSON text, vi: JSON text }: written in by build.py from samples/workspace.<lang>.json; null when there are none */
  var XA_SAMPLES = /*SD_SAMPLE*/null;
  /* v120 (CONTRACT 88): a sample is to look at. Its projects read as a Viewer's would (x8Role), its clients take no action, and
     whatever is tried says so. Clear sample data (or a change of language) is the only thing that changes it */
  function sdSample(p) { return !!(p && XA.sample && (XA.sample.p || []).indexOf(p.id) > -1); }
  function sdSampleC(c) { return !!(c && XA.sample && (XA.sample.c || []).indexOf(c.id) > -1); }
  function sdSampleNo() { showToast('This is a sample to look around in. Nothing in it can be changed. Clear it in Settings › Storage & data.'); }
  function xaInit() {
    /* nothing comes with the app; a workspace saved by an older version may still hold its samples, written down then */
    if (!SDBOOT.restored) XA.sample = {};
    else { var sm = SDBOOT.meta('sample', null); XA.sample = sm && typeof sm === 'object' ? sm : (xaFirst() === 'empty' ? {} : XA_SEED); }
    if (!XA.sample.tm && XA.sample.p) XA.sample.tm = TEAM.filter(function (m) { return /@studio\.example$/.test(m.e); }).map(function (m) { return m.e; });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-xa]'); if (!b) return;
      var a = b.getAttribute('data-xa'), room = b.getAttribute('data-room'), kid = b.getAttribute('data-kid');
      e.preventDefault();
      if (a === 'new' || a === 'newc') { var nb = document.getElementById(a === 'new' ? 'npj-btn' : 'cl-new'); if (nb) nb.click(); }
      else if (a === 'give') xaGive(room, kid, b);
      else if (a === 'later') { XA.later[room + kid] = 1; xaPaint(); if (pd.p && curView === 'project') pdRerender(); }
      else if (a === 'ask') xaAskTeam(room, b);
      else if (a === 'clear') { XA.arm = true; xaSamplePaint(); var f = document.querySelector('[data-xa="clear-no"]'); if (f) f.focus(); }
      else if (a === 'clear-no') { XA.arm = false; xaSamplePaint(); }
      else if (a === 'clear-go') { b.disabled = true; xaClearSample(); }
    });
    xaSamplePaint(); xaNotesEmpty(); xaSide(); updateCounts();
    if (xaShould()) xaWelcome(); else xaGate();
    /* the welcome's word, after the page came back with the sample */
    try { var hi = sessionStorage.getItem('sd-xa-hi'); if (hi) { sessionStorage.removeItem('sd-xa-hi'); showToast('Welcome, ' + hi + '. These projects are samples; clear them in Settings › Storage & data.'); } } catch (e) {}
    /* after a change of language swapped the sample */
    try { var sw = sessionStorage.getItem('sd-xa-sw'); if (sw) { sessionStorage.removeItem('sd-xa-sw'); showToast(sw === 'in' ? 'The sample projects are now the ones in this language.' : 'There are no sample projects in this language yet.'); } } catch (e) {}
    if (sdTest()) window.__xa = { sample: function () { return JSON.parse(JSON.stringify(XA.sample)); }, state: function () { return { lost: (X8.lost || []).map(function (r) { return r.id; }), wm: (X8.wm || []).map(function (r) { return r.id; }), asks: xaAsks().map(function (a) { return a.x.kid; }) }; } };
  }

