  /* ---------- keeping the lists in step ---------- */
  function pdPeopleHTML(p) {
    var all = pdPeople(p), names = all.map(function (m) { return m === ME ? 'ScopeDue user' : m.n; });
    return '<div class="c-pp pp" role="img" aria-label="' + (p.team.length ? 'Team of ' + all.length + ': ' + esc(names.join(', ')) : 'Solo project: ScopeDue user') + '"><span class="avs">' +
      all.slice(0, 3).map(function (m) { return '<span class="av' + (m === ME ? ' me' : '') + '" style="--c:' + m.c + '">' + esc(m.ini || initials(m.n)) + '</span>'; }).join('') + '</span><span class="pp-t">' + (p.team.length ? all.length + ' people' : 'Solo') + '</span></div>';
  }
  /* ---------- the projects list and the projects in motion drawer are drawn from PROJECTS ----------
     Nothing here is kept in step by hand. Whatever changes a project calls pdRender(), and both are rebuilt from the data.
     The Dashboard cards are rebuilt each time the Dashboard opens, and the Client pages read the project when they draw. */
  var PD_AGE = { m: 1, h: 60, d: 1440, w: 10080, mo: 43200 };
  function pdAge(p) {
    if (p.updT) return Math.max(0, Math.round((Date.now() - p.updT) / 6e4));
    var s = String(p.upd || ''), m = /^(\d+)\s*(mo|[mhdw])/.exec(s);
    return m ? +m[1] * PD_AGE[m[2]] : /^yesterday/i.test(s) ? 1440 : 0;
  }
  function pdTouch(p) { p.upd = 'just now'; p.updT = Date.now(); if (p.sy && p.sy.on) syMetaSoon(); }
  /* One line for an action that no other record shows: focus, next step, owner, invites, a withdrawn copy.
     It lives in p.log. History reads it (a Workspace lane in a private project), and Recent is History's newest three */
  function pdNote(p, text) {
    var e = { w: 'you', t: text, ts: Date.now() };
    p.log.unshift(e);
    return e;
  }
  function pdUnnote(p, e) { var i = e ? p.log.indexOf(e) : -1; if (i > -1) p.log.splice(i, 1); }
  function pdByRecent() {
    return PROJECTS.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return pdAge(a.p) - pdAge(b.p) || (b.p.updT || 0) - (a.p.updT || 0) || a.i - b.i; }).map(function (x) { return x.p; });
  }
  function pdRowEl(p) {
    var li = document.createElement('li'), ph = esc(pdPhase(p)), md = pdMode(p), pn = pdPhaseN(p);
    li.className = 'pl-item'; li.setAttribute('data-type', md);   /* v129: client, product or internal, as the Type column says */ li.setAttribute('data-size', p.team.length ? 'team' : 'solo'); li.setAttribute('data-name', p.n); li.setAttribute('data-id', p.id);
    var kind = p.kind === 'client' ? '<span class="kind client" title="Shared with a client">' + IC('share') + 'Client</span>' : '<span class="kind private" title="Private. Only visible inside your workspace">' + IC('lock') + (md === 'product' ? 'Product' : 'Internal') + '</span>';
    li.innerHTML = '<a href="#pj-' + p.id + '" class="pl-row"><div class="c-name"><span class="pj-av' + (p.kind === 'private' ? ' priv' : '') + '" aria-hidden="true">' + esc(p.m) + '</span><div class="pl-tx"><h3>' + esc(p.n) + '</h3><small>Updated ' + esc(p.upd) + '</small></div></div>' +
      '<div class="pl-meta"><div class="c-kind">' + kind + '</div>' + pdPeopleHTML(p) +
      '<div class="c-ph ph" role="img" aria-label="Phase ' + pn + ' of 5: ' + ph + '">' + pdTicks(pn) + '<span class="ph-t">' + ph + '<em>' + pn + ' of 5</em></span></div>' + dueHTML(p) + '</div>' +
      '<svg class="i chev" aria-hidden="true"><use href="#i-chev"/></svg></a>';
    return li;
  }
  function pdDrawerEl(p) {
    var a = document.createElement('article');
    /* v129 (CONTRACT 129): the kind is the one the project's page names (Client, Product, Internal); when it was last touched comes from
       updT, the time the order is made from (p.upd is a label written once and went stale: Venli said 3 weeks while placed above 1 week);
       the whole row resumes, a next step two weeks old has the amber dot */
    var old = !!p.next && x6NextAge(p) >= 14 * X6_DAY;
    a.className = 'pj-d st'; a.setAttribute('data-kind', pdMode(p)); a.setAttribute('data-name', p.n); a.setAttribute('data-pj', p.id);
    a.innerHTML = '<span class="pj-av' + (p.kind === 'client' ? '' : ' priv') + '" aria-hidden="true">' + esc(p.m) + '</span><div class="pj-dt"><h3>' + esc(p.n) + '</h3><div class="sub"><span>' + esc(pdSub(p)) + '</span><span class="ago">' + esc(p.updT ? recAgo(p.updT) : p.upd || '') + '</span></div>' +
      '<dl class="fn"><div><dt>Current focus</dt><dd>' + esc(p.focus ? pdDot(p.focus) : 'No current focus yet.') + '</dd></div><div><dt>Next step</dt><dd' + (old ? ' class="old"' : '') + '>' + esc(pdDot(p.next || 'No next step yet')) + '</dd></div></dl></div>' +
      '<button type="button" class="resume" data-pj="' + esc(p.id) + '"><span class="rl">Resume</span><svg class="i"><use href="#i-arrow"/></svg></button>';
    return a;
  }
  /* rebuild every node in order, keeping what the page remembers about it: hidden by a filter, a passing animation class, its stagger index */
  function pdSwap(box, sel, key, order, make, before, freshCls, fresh) {
    var old = {}, i;
    [].forEach.call(box.querySelectorAll(sel), function (n) { old[n.getAttribute(key)] = n; n.parentNode.removeChild(n); });
    order.forEach(function (p) {
      var el = make(p), o = old[p.id];
      if (o) { el.className = o.className; el.hidden = o.hidden; if (o.getAttribute('style')) el.setAttribute('style', o.getAttribute('style')); }
      else if (p === fresh) el.className = freshCls;
      box.insertBefore(el, before);
    });
  }
  function pdRender(fresh) {
    pdSwap(document.getElementById('pl-list'), '.pl-item', 'data-id', PROJECTS, pdRowEl, null, 'pl-item enter fresh', fresh);
    pdSwap(document.getElementById('proj-body'), '.pj-d', 'data-pj', pdByRecent(), pdDrawerEl, document.getElementById('proj-empty'), 'pj-d npj-new', fresh);
    lists.projects.refresh(); npjCounts();
  }
  function pdDot(t) { return /[.!?…]$/.test(t) ? t : t + '.'; }

  /* ---------- editing (focus, next step, thesis) ---------- */
  var PD_FLD = { focus: 'current focus', next: 'next step', thesis: 'thesis' };
  function pdLog(p, f, before, after) {
    /* the thesis keeps one history, p.pv.th. Focus and next step have no record of their own, so they are noted */
    if (f === 'thesis' && p.pv) p.pv.th.push({ ts: Date.now(), before: before, after: after });
    var note = f === 'thesis' && p.pv ? null : pdNote(p, 'You updated the ' + PD_FLD[f]);
    pdTouch(p); pdRender();
    return note;
  }
  function pdEditStart(f) { pd.edit = f; pd.adding = false; pdRerender(); }
  function pdCancel() {
    var f = pd.edit; pd.edit = null; pd.adding = false;
    pdRerender(f ? '[data-pd="edit"][data-f="' + f + '"]' : '[data-pd="addlink"]');
  }
  function pdSave(f, val) {
    var p = pd.p; val = val.replace(/\s+/g, ' ').trim();
    var fm = pdPanel.querySelector('.pd-edit'), ta0 = fm && fm.querySelector('textarea'), max = ta0 ? +ta0.getAttribute('data-max') || 0 : 0;
    if (!val && f !== 'next') { if (fm) { fm.querySelector('.err').textContent = ''; fm.setAttribute('data-err', ''); ta0.focus(); } return; }
    /* v122 (93): too long is said, with the count, and nothing is cut */
    if (fm && max && val.length > max) { fm.querySelector('.err').textContent = 'At most ' + max + ' characters: this one has ' + val.length + '. Make it shorter.'; fm.setAttribute('data-err', ''); ta0.focus(); return; }
    var old = p[f], oldAt = p.nextAt, oldUpd = p.upd, oldT = p.updT, oldU = p.nextU || '', oldTs = p.nextTs || 0, oldFu = p.focusU || '';
    var fu0 = f === 'focus' && pd.x6fu && wkUnit(p, pd.x6fu), fuNew = fu0 && fu0.t === val ? fu0.id : '';   /* v100 (52) */
    if (val === old && (f !== 'focus' || fuNew === oldFu)) { pd.x6nu = null; pd.x6fu = null; pdCancel(); return; }
    p[f] = val;
    if (f === 'next') { var nu = pd.x6nu && wkUnit(p, pd.x6nu); p.nextAt = 'just now'; p.nextTs = val ? Date.now() : 0; p.nextU = nu && nu.t === val ? nu.id : ''; pd.x6nu = null; }
    if (f === 'focus') { if (fuNew) p.focusU = fuNew; else delete p.focusU; pd.x6fu = null; }
    var note = pdLog(p, f, old, val);
    pd.edit = null; pdRerender('[data-pd="edit"][data-f="' + f + '"]');
    var undo = function () { p[f] = old; if (f === 'next') { p.nextAt = oldAt; p.nextU = oldU; p.nextTs = oldTs; } if (f === 'focus') { if (oldFu) p.focusU = oldFu; else delete p.focusU; } pdUnnote(p, note); if (f === 'thesis' && p.pv) p.pv.th.pop(); p.upd = oldUpd; p.updT = oldT; pdRender(); undone(p, 'workspace'); };
    showToast(PD_FLD[f].charAt(0).toUpperCase() + PD_FLD[f].slice(1) + ' updated', undo);
  }
  function pdDone() {
    var p = pd.p; if (!p.next) return;
    var u = x6NextUnit(p), back = x6NextDone(p);
    pdRender(); pd.edit = 'next'; pdRerender();
    showToast(u ? 'Next step done, and “' + prvT(u.t, 30) + '” with it. What is next?' : 'Next step marked done. What is next?', function () { back(); pd.edit = null; pdRender(); undone(p, 'workspace'); });
  }
  function pdAddLink(form) {
    var p = pd.p, t = form.elements.t.value.trim(), u = form.elements.u.value.trim(), url = null;
    if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); if (/^https?:$/.test(x.protocol) && x.hostname.indexOf('.') > 0) url = x.href; } catch (e) {}
    if (!url) { form.setAttribute('data-err', ''); form.elements.u.focus(); return; }
    var item = { k: 'link', t: t || pdHost(url), u: url, fresh: true };
    p.ctx.unshift(item); pd.adding = false; pdRerender();
    var undo = function () { var i = p.ctx.indexOf(item); if (i > -1) p.ctx.splice(i, 1); undone(p, 'workspace'); };
    showToast('Link added', undo);
  }

  /* ---------- team changes ---------- */
  function pdAfterTeam(p, goTeam) {
    if (p !== pd.p) { pdRender(); pdRefreshBadges(p); return; }   /* changed from Settings › Team: a project that is not open */
    pdLine.innerHTML = pdLineHTML(p, true); pdLineK = pdLineHTML(p);
    pdMenu.innerHTML = pdMenuHTML(p);
    pdSyncTeamTab(p); pdRefreshBadges(p); pdRender();
    if (!p.team.length && pd.tab === 'team') pdSelect('workspace', { force: true });
    else if (goTeam) pdSelect('team');
    else if (pd.tab === 'team') pdRerender();
    else if (pd.tab === 'workspace') pdRerender();
  }
  function pdRemove(i) {
    var p = pd.p, m = p.team[i]; if (!m) return;
    var back = wkRelease(p, m.e);
    p.team.splice(i, 1);
    var wasOwner = p.owner === m.n; if (wasOwner) p.owner = 'You';
    pdAfterTeam(p); wkAfter(p);
    var undo = function () { p.team.splice(i, 0, m); if (wasOwner) p.owner = m.n; back.undo(); pdAfterTeam(p, p.team.length === 1); wkAfter(p); };
    showToast('Removed ' + m.n + ' from this project' + (back.n ? '. ' + itemsLbl(back.n) + (back.n === 1 ? ' is' : ' are') + ' unassigned' : ''), undo);
  }
  function pdRole(i, role) {
    var p = pd.p, m = p.team[i]; if (!m || m.role === role) return;
    if (!fbRoleOk(p, role)) { fbNoVwSay(); pdRerender(); return; }
    var old = m.role, back = role === 'Viewer' ? wkRelease(p, m.e) : { n: 0, undo: function () {} }; m.role = role; wkAfter(p);
    var undo = function () { m.role = old; back.undo(); wkAfter(p); undone(p, 'team'); };
    showToast(m.n + ' is now ' + (role === 'Editor' ? 'an Editor' : 'a Viewer') + (back.n ? '. ' + itemsLbl(back.n) + (back.n === 1 ? ' is' : ' are') + ' unassigned' : '') + (role === 'Viewer' ? vpAdded(p, [m]) : ''), undo);   /* v112 (69): a Viewer's link */
  }
  function pdOwner(name) {
    var p = pd.p; if (p.owner === name) return;
    var old = p.owner; p.owner = name;
    var note = pdNote(p, name === 'You' ? 'You took the next step' : 'You assigned the next step to ' + name);
    var undo = function () { p.owner = old; pdUnnote(p, note); undone(p, 'team'); };
    showToast(name === 'You' ? 'You own the next step' : 'Next step assigned to ' + name, undo);
  }

  /* ---------- menu ---------- */
  function pdMenuOpen() {
    if (pd.p) pdMenu.innerHTML = pdMenuHTML(pd.p);   /* v125 (99): drawn as it opens, so a sample's menu is a sample's even if the page drew it first */
    pdMenu.setAttribute('data-open', ''); pdMore.setAttribute('aria-expanded', 'true');
    var f = pdMenu.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  /* switching what a private project is hides or shows Market. Nothing is deleted, and Undo puts it back */
  function pdAfterMode(p, tab) {
    if (pd.p !== p || curView !== 'project') return;
    var keys = pdVisible(p), t = tab && keys.indexOf(tab) > -1 ? tab : keys.indexOf(pd.tab) > -1 ? pd.tab : 'workspace';
    pdRenderShell(p); pdRenderTabs(p); pdSelect(t, { force: true }); pdRefreshBadges(p);
  }
  function pdSetMode(p, md) {
    var old = p.mode, tab = pd.tab, upd = p.upd, updT = p.updT;
    p.mode = md;
    var note = pdNote(p, md === 'product' ? 'You made this project a product' : 'You made this an internal project');
    pdTouch(p); prvDerive(p); pdRender(); pdAfterMode(p);
    showToast(md === 'product' ? 'Now a product. Validate is back.' : 'Now an internal project. Validate is hidden, nothing is deleted.', function () {
      if (old === undefined) delete p.mode; else p.mode = old;
      pdUnnote(p, note); p.upd = upd; p.updT = updT; prvDerive(p); pdRender(); pdAfterMode(p, tab);
    });
  }
  /* v74: the language of a private project. AI research reads it, and (v94) the Viewer portal and its emails; nothing written in the project changes */
  function pdSetLang(p, l) {
    var old = p.lang, upd = p.upd, updT = p.updT, nm = l === 'vi' ? 'Tiếng Việt' : 'English';
    p.lang = l;
    var note = pdNote(p, 'You set the project language to ' + nm);
    pdTouch(p); pdRender(); pdMenu.innerHTML = pdMenuHTML(p);
    showToast('Project language: ' + nm + '. AI research and the Viewer portal use it.', function () {
      if (old === undefined) delete p.lang; else p.lang = old;
      pdUnnote(p, note); p.upd = upd; p.updT = updT; pdRender(); if (pd.p === p) pdMenu.innerHTML = pdMenuHTML(p);
    });
  }
  function pdMenuClose(silent) {
    if (!pdMenu.hasAttribute('data-open')) return;
    pdMenu.removeAttribute('data-open'); pdMore.setAttribute('aria-expanded', 'false');
    if (!silent) pdMore.focus({ preventScroll: true });
  }
  pdMore.addEventListener('click', function () { pdMenu.hasAttribute('data-open') ? pdMenuClose() : pdMenuOpen(); });
  pdMenu.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-m]'); if (!b) return;
    var p = pd.p, a = b.getAttribute('data-m');
    pdMenuClose(a === 'invite' || a === 'del' ? true : false);
    if ((a === 'invite' || a === 'mode' || a === 'lang' || a === 'del') && p && x8Role(p) !== 'Owner') { x8No(p); return; }
    if (p && sdSample(p) && !/^(copy|claude|agents|team|client|export|back)$/.test(a)) { sdSampleNo(); return; }   /* v125 (99): Keep in Google Drive too */
    if (a === 'claude' || a === 'agents') x6Save(p, a === 'claude' ? 'CLAUDE.md' : 'AGENTS.md');   /* v137 (114) */
    else if (a === 'copy') {
      var url = ''; try { url = location.href.split('#')[0] + '#pj-' + p.id + '-' + pd.tab; } catch (er) {}
      copyText(url, function () { showToast('Link copied'); });
    } else if (a === 'invite') openDrawer('invite', pdMore);
    else if (a === 'team') pdSelect('team');
    else if (a === 'client') openClient(p.cid);
    else if (a === 'mode') pdSetMode(p, pdMode(p) === 'product' ? 'internal' : 'product');
    else if (a === 'lang') pdSetLang(p, pjLang(p) === 'vi' ? 'en' : 'vi');
    else if (a === 'export') openDrawer('mexp', pdMore);
    else if (a === 'dv') dvKeep(p);
    else if (a === 'del') pdelOpen(p, pdMore);
    else if (a === 'back') pdGoBack();
  });
  pdMenu.addEventListener('keydown', function (e) {
    var items = [].slice.call(pdMenu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pdMenuClose(); }
    else if (e.key === 'Tab') pdMenuClose(true);
  });
  document.addEventListener('click', function (e) { if (pdMenu.hasAttribute('data-open') && !e.target.closest('.pd-acts')) pdMenuClose(true); });

  /* ---------- events ---------- */
  document.getElementById('pd-back').addEventListener('click', function (e) { e.preventDefault(); pdGoBack(); });
  pdLine.addEventListener('click', function (e) {
    if (e.target.closest('[data-pdh="client"]') && pd.p && pd.p.cid) { openClient(pd.p.cid); return; }
    var pb = e.target.closest('[data-pdh="phase"]');
    if (pb) { var m = pdLine.querySelector('.pd-phm'), open = !m.hasAttribute('data-open'); pdPhClose(); if (open) { m.setAttribute('data-open', ''); pb.setAttribute('aria-expanded', 'true'); (m.querySelector('[aria-checked="true"]') || m.querySelector('button')).focus(); } return; }
    var ph = e.target.closest('[data-ph]'); if (ph && pd.p && x8Role(pd.p) === 'Owner') pdSetPhase(pd.p, +ph.getAttribute('data-ph'));
  });
  pdLine.addEventListener('keydown', function (e) {
    var m = pdLine.querySelector('.pd-phm[data-open]'); if (!m) return;
    var bs = [].slice.call(m.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pdPhClose(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
    else if (e.key === 'Tab') pdPhClose();
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pd-phw')) pdPhClose(); });
  function pdPhClose(focus) {
    var m = pdLine.querySelector('.pd-phm[data-open]'); if (!m) return;
    m.removeAttribute('data-open'); var b = pdLine.querySelector('[data-pdh="phase"]'); if (b) { b.setAttribute('aria-expanded', 'false'); if (focus) b.focus(); }
  }
  /* client and internal work move their phase by hand. A client project tells its client page and the portal */
  function pdSetPhase(p, n) {
    pdPhClose(true);
    if (!n || n === p.phase) return;
    var old = p.phase, upd = p.upd, updT = p.updT, set = PD_PHASE_SET[pdMode(p)] || PD_PHASES, c = p.kind === 'client' && byId(p.cid);
    var sync = function (v) { if (c) { c.projects.forEach(function (x) { if (x.pid === p.id) { x.step = v; x.phase = PD_PHASES[v - 1]; } }); refreshRow(c); } };
    p.phase = n; sync(n);
    var note = pdNote(p, 'You moved the project to ' + set[n - 1]);
    pdTouch(p); pdRender(); if (pd.p === p) { pdRenderShell(p); var b = pdLine.querySelector('[data-pdh="phase"]'); if (b) b.focus(); }
    showToast('Phase: ' + set[n - 1], function () { p.phase = old; sync(old); pdUnnote(p, note); p.upd = upd; p.updT = updT; pdRender(); if (pd.p === p) pdRenderShell(p); });
  }
  pdTabs.addEventListener('click', function (e) { var b = e.target.closest('.pd-tab'); if (b) pdSelect(b.getAttribute('data-tab')); });
  pdTabs.addEventListener('keydown', function (e) {
    var b = e.target.closest('.pd-tab'); if (!b) return;
    var list = [].slice.call(pdTabs.querySelectorAll('.pd-tab:not(.is-gone)')), i = list.indexOf(b), n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = list.length - 1;
    else return;
    e.preventDefault(); list[n].focus({ preventScroll: true }); pdSelect(list[n].getAttribute('data-tab'));
  });
  document.addEventListener('keydown', function (e) {
    if (curView !== 'project' || openEl || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || !pd.p) return;
    var t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (pdMenu.hasAttribute('data-open')) return;
    var n = parseInt(e.key, 10), keys = pdVisible(pd.p);
    if (n >= 1 && n <= 9 && keys[n - 1]) { e.preventDefault(); pdSelect(keys[n - 1]); }
  });
