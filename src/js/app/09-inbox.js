  /* ---------- support inbox: data ---------- */
  var PEOPLE = {}, GROUPS = {};
  /* a team thread saved with a group or a person this page does not know still draws */
  function ibGroup(k) { return GROUPS[k] || { name: 'Team', mark: 'T', members: [] }; }
  function ibColor(n) { return PEOPLE[n] || '#3d5a8f'; }
  var ADMIN = 'ScopeDue Support';
  var THREADS = SDBOOT.pick('thread') || [];
  var ibOrd = 10, ibTicket = 1042, ibN = 100;
  function ibById(id) { return THREADS.filter(function (t) { return t.id === id; })[0]; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nowAt() { var d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function lastText(t) {
    if (t.kind === 'update') return t.art.paras[0];
    for (var i = t.msgs.length - 1; i >= 0; i--) if (!t.msgs[i].sys) return (t.msgs[i].w === 'me' ? 'You: ' : '') + t.msgs[i].t;
    return '';
  }
  function chipOf(t) {
    if (t.kind === 'support') return { waiting: ['warn', 'Waiting on you'], open: ['', 'Awaiting reply'], resolved: ['ok', 'Resolved'] }[t.status];
    if (t.kind === 'feedback') return [['neutral', 'Under review'], ['', 'Planned'], ['', 'Building'], ['ok', 'Shipped']][t.fstep];
    if (t.kind === 'update') return ['neutral', { release: 'Release', poll: 'Poll', notice: 'Notice' }[t.utype]];
    return null;
  }
  function chipHTML(c) { return c ? '<span class="chip' + (c[0] ? ' ' + c[0] : '') + '">' + c[1] + '</span>' : ''; }
  function metaOf2(t) {
    if (t.kind === 'support') return t.tid;
    if (t.kind === 'feedback') return '<span class="vt">' + t.votes + '</span> ' + (t.votes === 1 ? 'vote' : 'votes');
    if (t.kind === 'update') return 'Sent to all users';
    if (t.group) return 'Team · ' + (ibGroup(t.group).members.length + 1) + ' people';
    return t.project || 'Direct message';
  }
  function avHTML(t) {
    if (t.kind === 'support') return '<span class="ib-av sup" aria-hidden="true">' + IC('logo') + '</span>';
    if (t.kind === 'feedback') return '<span class="ib-av fb" aria-hidden="true">' + IC('bulb') + '</span>';
    if (t.kind === 'update') return '<span class="ib-av upd" aria-hidden="true">' + IC('megaphone') + '</span>';
    if (t.group) return '<span class="ib-av grp" aria-hidden="true">' + esc(ibGroup(t.group).mark) + '</span>';
    return '<span class="ib-av dm" aria-hidden="true" style="--c:' + ibColor(t.dm) + '">' + esc(initials(t.dm)) + '</span>';
  }
  function searchText(t) {
    var x = [t.title].concat(t.msgs.map(function (m) { return m.t || ''; }));
    if (t.art) x = x.concat(t.art.paras);
    return fold(x.join(' '));
  }

  /* ---------- support inbox: render ---------- */
  var ibEl = document.getElementById('ib'), ibList = document.getElementById('ib-list'), ibConv = document.getElementById('ib-conv');
  var ibSeg = document.getElementById('ib-seg'), ibQ = document.getElementById('ib-q'), ibEmpty = document.getElementById('ib-empty');
  var ibSub = document.getElementById('ib-sub'), ibReadAll = document.getElementById('ib-readall'), ibBadge = document.getElementById('ib-badge'), ibScroll = document.getElementById('ib-scroll');
  var ibSel = null, ibFilter = 'all', ibPrev = null, ibDwell = 0;
  var mobileMQ = window.matchMedia('(max-width: 900px)');

  function ibCount(kind) { return THREADS.filter(function (t) { return t.unread && (!kind || t.kind === kind); }).length; }
  function ibSync() {
    var u = ibCount();
    ibSub.textContent = u ? u + ' unread' : 'All caught up';
    ibReadAll.disabled = !u;
    if (u) ibBadge.textContent = u;
    ibBadge.hidden = !u;
    if (ibPrev !== null && u !== ibPrev && u > 0 && !reduced) bump(ibBadge);
    ibPrev = u;
    ['support', 'feedback', 'team', 'update'].forEach(function (k) {
      var b = ibSeg.querySelector('[data-f="' + k + '"]'); if (!b) return;
      if (ibCount(k)) b.setAttribute('data-dot', ''); else b.removeAttribute('data-dot');
    });
  }
  function ibMatches(t) {
    if (ibFilter !== 'all' && t.kind !== ibFilter) return false;
    var q = fold(ibQ.value.trim()); return !q || searchText(t).indexOf(q) > -1;
  }
  function rowHTML2(t, i) {
    return '<li data-id="' + t.id + '" style="--i:' + Math.min(i, 12) + '"><button type="button" class="ib-row" data-id="' + t.id + '">' + avHTML(t) +
      '<span class="ib-tx"><span class="ib-top"><span class="tt"><span class="sr"></span>' + esc(t.title) + '</span><time>' + esc(t.time) + '</time></span>' +
      '<span class="ib-pv">' + esc(lastText(t)) + '</span><span class="ib-meta">' + chipHTML(chipOf(t)) + '<span>' + metaOf2(t) + '</span></span></span></button></li>';
  }
  function ibMarkRows() {
    ibList.querySelectorAll('.ib-row').forEach(function (b) {
      var t = ibById(b.getAttribute('data-id')); if (!t) return;
      if (t.unread) b.setAttribute('data-unread', ''); else b.removeAttribute('data-unread');
      b.querySelector('.sr').textContent = t.unread ? 'Unread. ' : '';
      if (b.getAttribute('data-id') === ibSel) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }
  function ibRenderList(o) {
    o = o || {};
    var items = THREADS.slice().sort(function (a, b) { return b.ord - a.ord; }).filter(ibMatches);
    ibList.innerHTML = items.map(rowHTML2).join('');
    ibEmpty.hidden = items.length > 0;
    ibEmpty.innerHTML = THREADS.length ? '<b>No messages here</b>Try another filter or search term.' : '<b>No messages yet</b>Ask the ScopeDue team anything, or share an idea. Messages from teammates land here too.';
    if (o.enter && !reduced) { var li = ibList.querySelector('[data-id="' + o.enter + '"]'); if (li) li.classList.add('enter'); }
    ibList.classList.remove('play');
    if (o.play && !reduced) { void ibList.offsetWidth; ibList.classList.add('play'); }
    ibMarkRows();
  }

  function trkHTML(t) {
    var L = ['Under review', 'Planned', 'Building', 'Shipped'];
    return '<div class="ib-trk" role="img" aria-label="Status: ' + L[t.fstep] + '">' + L.map(function (l, i) {
      return '<div class="' + (i <= t.fstep ? 'on' : '') + (i === t.fstep ? ' cur' : '') + '" style="--t:' + i + '"><i></i><span>' + l + '</span></div>';
    }).join('') + '</div>';
  }
  function headHTML(t) {
    var c = chipHTML(chipOf(t)), sub = '', acts = '';
    if (t.kind === 'support') {
      sub = c + '<span>' + t.tid + '</span><span>Opened ' + esc(t.since) + '</span>';
      acts = t.status === 'resolved' ? '<button type="button" class="btn-ghost btn-sm" data-ib="reopen">Reopen</button>' : '<button type="button" class="btn-ghost btn-sm" data-ib="resolve">' + IC('tick') + 'Mark resolved</button>';
    } else if (t.kind === 'feedback') {
      sub = c + '<span>Opened ' + esc(t.since) + '</span>';
      acts = '<button type="button" class="btn-ghost btn-sm" data-ib="vote" aria-pressed="' + t.voted + '">' + IC('up') + (t.voted ? 'Voted' : 'Upvote') + ' <span class="votes">' + t.votes + '</span></button>';
    } else if (t.kind === 'update') {
      sub = c + '<span>Sent to all users</span><span>' + esc(t.since) + '</span>';
    } else {
      var names = t.group ? ibGroup(t.group).members : [t.dm];
      sub = '<span class="ib-ppl"><span class="avs">' + names.map(function (n) { return '<span class="av" style="--c:' + ibColor(n) + '">' + esc(initials(n)) + '</span>'; }).join('') + '</span>' + esc(names.join(', ')) + (t.group ? ' and you' : '') + '</span>' + (t.project && !t.group ? '<span class="chip neutral">' + esc(t.project) + '</span>' : '');
    }
    acts += '<button type="button" class="icon-sm" data-ib="unread" aria-label="Mark as unread" title="Mark as unread">' + IC('mail') + '</button>';
    return '<div class="ib-ch"><div class="ib-ch-l"><button type="button" class="icon-btn ib-back" data-ib="back" aria-label="Back to inbox">' + IC('chevl') + '</button><div><h2>' + esc(t.title) + '</h2><div class="ib-sub">' + sub + '</div></div></div><div class="ib-acts">' + acts + '</div></div>' + (t.kind === 'feedback' ? trkHTML(t) : '');
  }
  function pollTotal(p) { return p.opts.reduce(function (a, o) { return a + o.n; }, 0); }
  function pollFoot(p) {
    var done = p.voted > -1;
    return '<span>' + (done ? pollTotal(p) + ' votes. Thanks, yours is counted.' : 'Results appear after you vote.') + '</span>' + (done ? '<button type="button" class="link" data-ib="poll-fb">Add details as feedback ' + IC('arrow') + '</button>' : '');
  }
  function pollHTML(t) {
    var p = t.poll, tot = pollTotal(p), done = p.voted > -1;
    var h = '<div class="poll' + (done ? ' done' : '') + '" id="poll" role="radiogroup" aria-labelledby="poll-q"><div class="poll-q" id="poll-q">' + esc(p.q) + '</div>';
    p.opts.forEach(function (o, i) {
      var pc = Math.round(o.n / tot * 100);
      h += '<button type="button" class="poll-o" role="radio" aria-checked="' + (p.voted === i) + '" data-poll="' + i + '"><i class="bar" style="width:' + (done ? pc : 0) + '%"></i><span>' + IC('tick') + esc(o.t) + '</span><span class="pct">' + pc + '%</span></button>';
    });
    return h + '<div class="poll-f" id="poll-f">' + pollFoot(p) + '</div></div>';
  }
  function pollPaint(t) {
    var p = t.poll, tot = pollTotal(p), el = document.getElementById('poll'); if (!el) return;
    p.opts.forEach(function (o, i) {
      var b = el.querySelector('[data-poll="' + i + '"]'), pc = Math.round(o.n / tot * 100);
      b.setAttribute('aria-checked', p.voted === i ? 'true' : 'false');
      b.querySelector('.bar').style.width = (p.voted > -1 ? pc : 0) + '%';
      b.querySelector('.pct').textContent = pc + '%';
    });
    el.classList.toggle('done', p.voted > -1);
    document.getElementById('poll-f').innerHTML = pollFoot(p);
  }
  function articleHTML(t) {
    var a = t.art, h = '<article class="ib-art"><div class="kick">' + esc(a.kick) + '</div><h3>' + esc(t.title) + '</h3><div class="by">' + esc(a.by) + '</div>';
    a.paras.forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
    if (a.items && a.items.length) h += '<ul>' + a.items.map(function (it) { return '<li><b>' + esc(it[0]) + '</b><span>' + esc(it[1]) + '</span></li>'; }).join('') + '</ul>';
    if (t.poll) h += pollHTML(t);
    return h + '</article>';
  }
  function msgsHTML(t) {
    if (t.kind === 'update') return articleHTML(t);
    var h = '', last = '';
    t.msgs.forEach(function (m) {
      if (m.sys) { h += '<div class="sys">' + esc(m.sys) + '</div>'; return; }
      if (m.d !== last) { h += '<div class="day">' + esc(m.d) + '</div>'; last = m.d; }
      var me = m.w === 'me', name = m.w === 'admin' ? ADMIN : m.w;
      h += '<div class="msg' + (me ? ' me' : '') + (m.isNew ? ' enter new' : '') + '">' + (me ? '' : '<div class="who"><b>' + esc(name) + '</b>' + (m.w === 'admin' ? '<span class="chip neutral">ScopeDue</span>' : '') + '</div>') + '<div class="b">' + esc(m.t) + '</div><div class="at">' + esc(m.at) + '</div></div>';
    });
    return h;
  }
  function phOf(t) {
    if (t.kind === 'support') return t.status === 'resolved' ? 'Reply to reopen this conversation' : 'Write a reply';
    if (t.kind === 'feedback') return 'Add more detail or a use case';
    return 'Message ' + (t.group ? 'the team' : t.dm);
  }
  function composerHTML(t) {
    if (t.kind === 'update') return '<div class="ib-foot">' + IC('megaphone') + 'Announcements come from the ScopeDue team and go to all users.</div>';
    var hint = t.kind === 'support' ? 'Usually answered within one business day' : t.kind === 'feedback' ? 'The team reads every reply' : 'Saved on this device';
    return '<form class="ib-cm" id="ib-form"><div class="ib-box"><textarea id="ib-text" rows="1" placeholder="' + phOf(t) + '" aria-label="Write a message"></textarea><div class="c-bar"><span class="c-hint">' + hint + ' · <kbd>⌘</kbd> <kbd>↵</kbd></span><button type="submit" class="btn-primary btn-sm" disabled>' + IC('send') + 'Send</button></div></div></form>';
  }
  function ibToBottom(smooth) {
    var m = document.getElementById('ib-msgs'); if (!m) return;
    if (smooth && !reduced) m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }); else m.scrollTop = m.scrollHeight;
  }
  function ibOpen(id, o) {
    o = o || {};
    var t = ibById(id); if (!t) return;
    ibSel = id;
    clearTimeout(ibDwell);
    if (t.unread) {
      if (o.dwell) ibDwell = setTimeout(function () { if (ibSel === id && t.unread) { t.unread = false; ibMarkRows(); ibSync(); } }, 1400);
      else t.unread = false;
    }
    ibConv.innerHTML = '<div id="ib-head">' + headHTML(t) + '</div><div class="ib-msgs' + (t.kind === 'update' ? ' art' : '') + '" id="ib-msgs">' + msgsHTML(t) + '</div><div id="ib-cmw">' + composerHTML(t) + '</div>';
    var msgs = document.getElementById('ib-msgs');
    if (!reduced) { var k = 0; [].slice.call(msgs.querySelectorAll(t.kind === 'update' ? '.ib-art > *' : ':scope > *')).slice(-9).forEach(function (n) { n.style.setProperty('--i', k++); }); msgs.classList.add('play'); }
    if (t.kind === 'update') msgs.scrollTop = 0; else ibToBottom(false);
    ibMarkRows(); ibSync();
    if (o.show || mobileMQ.matches && !o.dwell) ibEl.setAttribute('data-pane', 'thread');
  }
  function ibEnter() {
    ibRenderList({ play: true });
    moveThumb(ibSeg, false);
    ibEl.setAttribute('data-pane', 'list');
    if (!ibSel || !ibById(ibSel)) {
      var sorted = THREADS.slice().sort(function (a, b) { return b.ord - a.ord; });
      var first = sorted.filter(function (t) { return t.unread; })[0] || sorted[0];
      if (first && !mobileMQ.matches) ibOpen(first.id, { dwell: true });
    } else ibMarkRows();
    ibSync();
  }
  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', function () { if (!mobileMQ.matches && !viewEls.inbox.hidden && !ibSel) ibEnter(); });
  function ibRefresh(t, o) {
    o = o || {};
    if (ibSel === t.id) {
      document.getElementById('ib-head').innerHTML = headHTML(t);
      var msgs = document.getElementById('ib-msgs'); msgs.classList.remove('play');
      msgs.innerHTML = msgsHTML(t);
      t.msgs.forEach(function (m) { m.isNew = false; });
      var ta = document.getElementById('ib-text'); if (ta) ta.placeholder = phOf(t);
      ibToBottom(!!o.smooth);
    }
    ibRenderList({ enter: o.enter });
    ibSync();
  }

  /* ---------- support inbox: events ---------- */
  ibSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    ibFilter = b.getAttribute('data-f'); setPressed(ibSeg, ibFilter); ibRenderList({ play: true }); ibScroll.scrollTop = 0;
  });
  ibQ.addEventListener('input', function () { ibRenderList(); });
  ibQ.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ibQ.value) { e.preventDefault(); e.stopPropagation(); ibQ.value = ''; ibRenderList(); } });
  ibList.addEventListener('click', function (e) { var b = e.target.closest('.ib-row'); if (b) ibOpen(b.getAttribute('data-id'), { show: true }); });
  ibList.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var rows = [].slice.call(ibList.querySelectorAll('.ib-row')), i = rows.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  ibReadAll.addEventListener('click', function () {
    var prev = THREADS.filter(function (t) { return t.unread; }); if (!prev.length) return;
    prev.forEach(function (t) { t.unread = false; }); ibMarkRows(); ibSync();
    var undo = function () { prev.forEach(function (t) { t.unread = true; }); ibMarkRows(); ibSync(); };
    showToast(prev.length === 1 ? '1 conversation marked as read' : prev.length + ' conversations marked as read', undo);
  });
  function pollVote(t, i) {
    var p = t.poll; if (p.voted === i) return;
    if (p.voted > -1) p.opts[p.voted].n--;
    p.opts[i].n++; p.voted = i; pollPaint(t);
  }
  ibConv.addEventListener('click', function (e) {
    var t = ibById(ibSel); if (!t) return;
    var po = e.target.closest('[data-poll]'); if (po) { pollVote(t, +po.getAttribute('data-poll')); return; }
    var a = e.target.closest('[data-ib]'); if (!a) return;
    var act = a.getAttribute('data-ib');
    if (act === 'back') { ibEl.setAttribute('data-pane', 'list'); var cur = ibList.querySelector('.ib-row[aria-current]'); if (cur) cur.focus({ preventScroll: true }); }
    else if (act === 'unread') {
      t.unread = true; clearTimeout(ibDwell); ibMarkRows(); ibSync();
      if (mobileMQ.matches) ibEl.setAttribute('data-pane', 'list'); else showToast('Marked as unread');
    }
    else if (act === 'resolve' || act === 'reopen') {
      var prevS = t.status, sm = { sys: act === 'resolve' ? 'Marked as resolved · ' + today() : 'Conversation reopened' };
      t.status = act === 'resolve' ? 'resolved' : 'open'; t.msgs.push(sm); ibRefresh(t, { smooth: true });
      var undo = function () { t.status = prevS; var k = t.msgs.indexOf(sm); if (k > -1) t.msgs.splice(k, 1); ibRefresh(t); };
      showToast(act === 'resolve' ? 'Conversation resolved' : 'Conversation reopened', undo);
    }
    else if (act === 'vote') {
      t.voted = !t.voted; t.votes += t.voted ? 1 : -1; ibRefresh(t);
      var vs = document.querySelector('#ib-head .votes'); if (vs && !reduced) bump(vs);
    }
    else if (act === 'poll-fb') { cmPre = { type: 'feedback', title: 'Re: ' + t.poll.q }; openDrawer('compose', a); }
  });
  ibConv.addEventListener('input', function (e) {
    var ta = e.target.closest('#ib-text'); if (!ta) return;
    ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
    ta.closest('form').querySelector('button[type="submit"]').disabled = !ta.value.trim();
  });
  ibConv.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.id === 'ib-text') { e.preventDefault(); ibSend(); }
  });
  ibConv.addEventListener('submit', function (e) { e.preventDefault(); ibSend(); });
  function ibSend() {
    var t = ibById(ibSel), ta = document.getElementById('ib-text'); if (!t || !ta) return;
    var v = ta.value.trim(); if (!v) return;
    var m = { w: 'me', t: v, d: 'Today', at: nowAt(), isNew: true };
    if (t.kind === 'support') {
      if (t.status === 'resolved') { t.msgs.push({ sys: 'Conversation reopened' }); t.status = 'open'; }
      else if (t.status === 'waiting') t.status = 'open';
    }
    t.msgs.push(m); t.ord = ++ibOrd; t.time = 'Now'; t.unread = false;
    ta.value = ''; ta.style.height = ''; ta.closest('form').querySelector('button[type="submit"]').disabled = true;
    ibRefresh(t, { smooth: true, enter: t.id });
    ta.focus({ preventScroll: true });
  }

  /* ---------- support inbox: new message drawer ---------- */
  var cmSeg = document.getElementById('cm-seg'), cmForm = document.getElementById('cm'), cmTitle = document.getElementById('cm-title'), cmBody = document.getElementById('cm-body');
  var cmTo = document.getElementById('cm-to'), cmSw = document.getElementById('cm-sw'), cmType = 'support', cmPre = null;
  var CM = {
    support: { tl: 'Subject', tp: 'What do you need help with?', bl: 'Message', bp: 'Describe what happened and what you expected', hint: 'The ScopeDue team usually replies within one business day.' },
    feedback: { tl: 'Title', tp: 'Summarize your idea or the problem', bl: 'Details', bp: 'Why would this help your work?', hint: 'We read every one. You can follow its status here and see how many others want it.' },
    team: { bl: 'Message', bp: 'Write to your teammates', hint: 'Saved on this device. Team messages are not sent to anyone yet.' }
  };
  cmTo.innerHTML = '<optgroup label="Project teams">' + Object.keys(GROUPS).map(function (k) { return '<option value="' + k + '">' + esc(GROUPS[k].name) + ' · ' + (GROUPS[k].members.length + 1) + ' people</option>'; }).join('') + '</optgroup><optgroup label="People">' + Object.keys(PEOPLE).map(function (n) { return '<option value="p:' + esc(n) + '">' + esc(n) + '</option>'; }).join('') + '</optgroup>';
  function fieldErr(id, msg) {
    var f = document.getElementById(id), i = f.querySelector('input,textarea');
    if (msg) { f.setAttribute('data-err', ''); f.querySelector('.err').textContent = msg; i.setAttribute('aria-invalid', 'true'); }
    else { f.removeAttribute('data-err'); f.querySelector('.err').textContent = ''; i.removeAttribute('aria-invalid'); }
  }
  function cmSet(type) {
    cmType = type; setPressed(cmSeg, type);
    var c = CM[type];
    document.getElementById('cm-hint').textContent = c.hint;
    document.getElementById('f-to').hidden = type !== 'team';
    document.getElementById('f-cmt').hidden = type === 'team';
    document.getElementById('cm-diag').hidden = type !== 'support';
    if (type !== 'team') { document.getElementById('cm-title-l').innerHTML = c.tl + ' <span class="opt">Required</span>'; cmTitle.placeholder = c.tp; }
    document.getElementById('cm-body-l').innerHTML = c.bl + ' <span class="opt">Required</span>'; cmBody.placeholder = c.bp;
    fieldErr('f-cmt', ''); fieldErr('f-cmb', '');
  }
  function cmOnOpen() {
    var pre = cmPre; cmPre = null;
    var type = pre ? pre.type : (cmTitle.value || cmBody.value) ? cmType : ibFilter === 'team' ? 'team' : ibFilter === 'feedback' ? 'feedback' : 'support';
    cmSet(type);
    if (pre) { cmTitle.value = pre.title || ''; cmBody.value = pre.body || ''; }
    if (type === 'team' && ibSel) { var t = ibById(ibSel); if (t && t.kind === 'team') cmTo.value = t.group || 'p:' + t.dm; }
    return type === 'team' || (pre && pre.title) ? '#cm-body' : '#cm-title';
  }
  cmSeg.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (b) cmSet(b.getAttribute('data-f')); });
  cmSw.addEventListener('click', function () { cmSw.setAttribute('aria-checked', cmSw.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); });
  [cmTitle, cmBody].forEach(function (i) { i.addEventListener('input', function () { var f = i.closest('.fld'); if (f.hasAttribute('data-err')) fieldErr(f.id, ''); }); });
  function cmCreate() {
    var title = cmTitle.value.trim(), body = cmBody.value.trim();
    var et = (cmType !== 'team' && !title) ? (cmType === 'support' ? 'Add a subject so the team can find this quickly.' : 'Give your idea a short title.') : '';
    var eb = !body ? 'Write a message first.' : '';
    fieldErr('f-cmt', et); fieldErr('f-cmb', eb);
    if (et || eb) { (et ? cmTitle : cmBody).focus(); return; }
    if (cmType === 'team' && !cmTo.value) { fieldErr('f-cmb', 'No one to write to yet. Add people to a project first.'); cmBody.focus(); return; }
    var m = { w: 'me', t: body, d: 'Today', at: nowAt() }, th, undo, added = false;
    if (cmType === 'support') th = { id: 't' + (++ibN), kind: 'support', title: title, status: 'open', tid: '#' + (++ibTicket), since: 'Today', ord: ++ibOrd, time: 'Now', unread: false, msgs: [m, { sys: 'Ticket opened' + (cmSw.getAttribute('aria-checked') === 'true' ? ' · diagnostics attached' : '') }] };
    else if (cmType === 'feedback') th = { id: 't' + (++ibN), kind: 'feedback', title: title, fstep: 0, votes: 1, voted: true, since: 'Today', ord: ++ibOrd, time: 'Now', unread: false, msgs: [m] };
    else {
      var key = cmTo.value, person = key.indexOf('p:') === 0 ? key.slice(2) : null;
      th = THREADS.filter(function (t) { return t.kind === 'team' && (person ? t.dm === person : t.group === key); })[0];
      if (th) { th.msgs.push(m); th.ord = ++ibOrd; th.time = 'Now'; th.unread = false; }
      else { th = { id: 't' + (++ibN), kind: 'team', title: person || ibGroup(key).name, since: 'Today', ord: ++ibOrd, time: 'Now', unread: false, msgs: [m] }; if (person) th.dm = person; else th.group = key; added = true; }
    }
    if (cmType !== 'team' || added) { THREADS.push(th); added = true; }
    undo = function () {
      if (added) { THREADS.splice(THREADS.indexOf(th), 1); if (ibSel === th.id) { ibSel = null; ibConv.innerHTML = ''; } }
      else { var k = th.msgs.indexOf(m); if (k > -1) th.msgs.splice(k, 1); }
      ibRenderList(); if (!ibSel && !mobileMQ.matches) ibEnter(); else if (ibSel) ibRefresh(ibById(ibSel)); ibSync();
    };
    cmTitle.value = ''; cmBody.value = ''; fieldErr('f-cmt', ''); fieldErr('f-cmb', '');
    ibFilter = 'all'; setPressed(ibSeg, 'all'); ibQ.value = '';
    ibRenderList({ enter: th.id }); ibOpen(th.id, { show: true });
    closeDrawer();
    showToast(cmType === 'feedback' ? 'Feedback sent' : 'Message sent', undo);
  }
  cmForm.addEventListener('submit', function (e) { e.preventDefault(); cmCreate(); });
  cmForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); cmCreate(); } });
  ibSync();

