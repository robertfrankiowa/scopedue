  /* ---------- project: evidence, client, history: actions ---------- */
  var PDE_MAX = 104857600;
  function pdeFpv(el, st, hex, msg) {
    el.className = 'pde-fpv st' + (st === 'err' ? ' err' : '');
    if (st === 'ok') el.innerHTML = '<span class="pd-eb">Fingerprint</span><span class="pd-fp" title="SHA-256 ' + esc(pdGroup(hex, hex.length)) + '">' + esc(pdeFpShow(hex)) + '</span><small>' + esc(msg) + '</small>';
    else el.innerHTML = '<span class="pd-eb">Fingerprint</span><span class="pd-fp pend">' + PD_DOTS + '</span><small' + (st === 'err' ? ' role="alert"' : '') + '>' + esc(msg) + '</small>';
  }

  /* capture */
  var capForm = document.getElementById('cap'), capMode = document.getElementById('cap-mode'), capFile = document.getElementById('cap-file'), capDrop = document.getElementById('cap-drop');
  var capTxt = document.getElementById('cap-txt'), capT = document.getElementById('cap-t'), capKind = document.getElementById('cap-kind'), capLink = document.getElementById('cap-link');
  var capFpv = document.getElementById('cap-fpv'), capGo = document.getElementById('cap-go'), capCnt = document.getElementById('cap-cnt');
  var cap = { mode: 'file', file: null, hex: '', gen: 0, touched: false, tm: 0 };
  var CAP_IDLE = { file: 'Choose a file. Its SHA-256 appears here.', text: 'Paste some text. Its SHA-256 appears here.' };
  function capSwap() {
    document.getElementById('f-cap-file').hidden = cap.mode !== 'file';
    document.getElementById('f-cap-txt').hidden = cap.mode !== 'text';
  }
  function capDropReset() {
    capDrop.classList.remove('has', 'drag');
    document.getElementById('cap-fn').textContent = 'Choose a file';
    document.getElementById('cap-fs').textContent = 'Or drop it here. It is read in this browser and never uploaded.';
  }
  function capOnOpen() {
    var p = pd.p, l = pdLatest(p), opts = '<option value="">Nothing in particular</option>';
    cap.mode = 'file'; cap.file = null; cap.hex = ''; cap.touched = false; cap.gen++; clearTimeout(cap.tm);
    capForm.reset(); setPressed(capMode, 'file'); capSwap(); capFile.value = ''; capDropReset();
    if (l) opts += '<option value="v' + l.v + '">Scope v' + l.v + ' · current</option>';
    pdCrList(p).forEach(function (cr) { opts += '<option value="' + cr.id + '">' + esc(cr.id + ' · ' + (cr.t.length > 32 ? cr.t.slice(0, 31) + '…' : cr.t)) + '</option>'; });
    capLink.innerHTML = opts; capKind.value = 'doc';
    ['f-cap-file', 'f-cap-t'].forEach(function (id) { document.getElementById(id).removeAttribute('data-err'); });
    capCnt.textContent = '0 / 20000';
    pdeFpv(capFpv, 'idle', '', CAP_IDLE.file); capGo.disabled = true;
    return '#cap-file';
  }
  function capHash() {
    var gen = ++cap.gen; cap.hex = ''; capGo.disabled = true; clearTimeout(cap.tm);
    function ready(hex) { if (gen !== cap.gen) return; cap.hex = hex; pdeFpv(capFpv, 'ok', hex, 'SHA-256 of the exact ' + (cap.mode === 'file' ? 'bytes of this file' : 'text') + '. Change one character and it changes.'); capGo.disabled = false; }
    function fail() { if (gen === cap.gen) pdeFpv(capFpv, 'err', '', 'This browser could not compute the fingerprint here.'); }
    if (cap.mode === 'file') {
      if (!cap.file) return pdeFpv(capFpv, 'idle', '', CAP_IDLE.file);
      if (cap.file.size > PDE_MAX) return pdeFpv(capFpv, 'err', '', 'This file is over 100 MB. Pick a smaller one, or capture a screenshot of it.');
      pdeFpv(capFpv, 'busy', '', 'Computing SHA-256…'); pdeShaFile(cap.file, ready, fail);
    } else {
      if (!capTxt.value.trim()) return pdeFpv(capFpv, 'idle', '', CAP_IDLE.text);
      pdeFpv(capFpv, 'busy', '', 'Computing SHA-256…'); pdeShaText(capTxt.value, ready, fail);
    }
  }
  capMode.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    cap.mode = b.getAttribute('data-f'); setPressed(capMode, cap.mode); capSwap(); capHash();
    if (cap.mode === 'text') capTxt.focus({ preventScroll: true });
  });
  capFile.addEventListener('change', function () {
    var f = capFile.files && capFile.files[0]; cap.file = f || null;
    document.getElementById('f-cap-file').removeAttribute('data-err');
    capDrop.classList.toggle('has', !!f); capDrop.classList.remove('drag');
    document.getElementById('cap-fn').textContent = f ? f.name : 'Choose a file';
    document.getElementById('cap-fs').textContent = f ? pdeSize(f.size) + ' · read in this browser only' : 'Or drop it here. It is read in this browser and never uploaded.';
    if (f) { if (!cap.touched) capT.value = f.name.replace(/\.[^.]+$/, '').slice(0, 80); capKind.value = pdeGuess(f); document.getElementById('f-cap-t').removeAttribute('data-err'); }
    capHash();
  });
  ['dragenter', 'dragover'].forEach(function (n) { capDrop.addEventListener(n, function () { capDrop.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (n) { capDrop.addEventListener(n, function () { capDrop.classList.remove('drag'); }); });
  capTxt.addEventListener('input', function () {
    capCnt.textContent = capTxt.value.length + ' / 20000'; cap.gen++; cap.hex = ''; capGo.disabled = true;
    pdeFpv(capFpv, capTxt.value.trim() ? 'busy' : 'idle', '', capTxt.value.trim() ? 'Computing SHA-256…' : CAP_IDLE.text);
    clearTimeout(cap.tm); cap.tm = setTimeout(capHash, 220);
  });
  capT.addEventListener('input', function () { cap.touched = true; document.getElementById('f-cap-t').removeAttribute('data-err'); });
  function capSubmit() {
    if (capGo.disabled || !cap.hex) return;
    var p = pd.p, t = capT.value.replace(/\s+/g, ' ').trim(), isFile = cap.mode === 'file';
    if (t.length < 2) { document.getElementById('e-cap-t').textContent = 'Give it a short title so you can find it later.'; document.getElementById('f-cap-t').setAttribute('data-err', ''); capT.focus(); return; }
    var it = { id: 'e' + (++pdeN), title: t, kind: capKind.value, at: today(), ts: Date.now(), ref: capLink.value, fp: cap.hex, name: isFile ? cap.file.name : '', size: isFile ? cap.file.size : 0, txt: isFile ? '' : capTxt.value, sample: false, copy: null };
    p.evd.unshift(it);
    var undoNote = pdeNote(p, 'You captured “' + t + '”', null);
    pd.ev = it.id; pd.evf = 'all'; closeDrawer(true);
    pdAfterEvidence(p);
    if (pd.tab !== 'evidence') pdSelect('evidence'); else pdRerender();
    var row = pdPanel.querySelector('.pd-cr.ev[aria-current="true"]'); if (row) row.focus({ preventScroll: true });
    var undo = function () { var i = p.evd.indexOf(it); if (i > -1) p.evd.splice(i, 1); undoNote(); pdAfterEvidence(p); undone(p, 'evidence'); };
    pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = 'Captured. Fingerprint ' + pdeFpShow(it.fp) + '.'; }, 40);
    showToast('Captured. ScopeDue keeps only the fingerprint.', undo);
  }
  capForm.addEventListener('submit', function (e) { e.preventDefault(); capSubmit(); });
  capForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); capSubmit(); } });

  /* prepare a client copy */
  var prepForm = document.getElementById('prep'), prepT = document.getElementById('prep-t'), prepTxt = document.getElementById('prep-txt'), prepFile = document.getElementById('prep-file'), prepDrop = document.getElementById('prep-drop');
  var prepFpv = document.getElementById('prep-fpv'), prepPv = document.getElementById('prep-pv'), prepOk = document.getElementById('prep-ok'), prepGo = document.getElementById('prep-go'), prepCnt = document.getElementById('prep-cnt');
  var prep = { it: null, mode: 'text', file: null, hex: '', gen: 0, tm: 0 };
  function prepWho() { var c = byId(pd.p.cid) || {}; return given(c) || 'the client'; }
  function prepRender() {
    var it = prep.it, g = prepWho(), k = PDE_KIND[it.kind] || PDE_KIND.doc, t = prepT.value.replace(/\s+/g, ' ').trim() || it.title, ref = pdeRefLabel(it.ref);
    if (prep.mode === 'text') { var n = pdeHidden(it.txt, prepTxt.value); prepCnt.textContent = n ? n + (n === 1 ? ' line' : ' lines') + ' removed or changed' : 'Same as the original'; }
    prepPv.innerHTML = '<span class="pde-ic" aria-hidden="true">' + IC(k[1]) + '</span><div><b>' + esc(t) + '</b><small>' + esc(k[0]) + ' · Shared ' + esc(today()) + (ref ? ' · ' + esc(ref) : '') + '</small><span class="pd-fp' + (prep.hex ? '' : ' pend') + '">' + (prep.hex ? esc(pdeFpShow(prep.hex)) : PD_DOTS) + '</span><small>Copy of the original ' + esc(pdGroup(it.fp.slice(0, 8), 8)) + '. ' + esc(g) + ' never sees the original.</small></div>';
    prepGo.disabled = !(prep.hex && prepOk.checked);
  }
  function prepHash() {
    var gen = ++prep.gen; prep.hex = ''; clearTimeout(prep.tm);
    function ready(hex) { if (gen !== prep.gen) return; prep.hex = hex; pdeFpv(prepFpv, 'ok', hex, 'Fingerprint of the copy. It is stored with the copy and points back to the original.'); prepRender(); }
    function fail() { if (gen === prep.gen) { pdeFpv(prepFpv, 'err', '', 'This browser could not compute the fingerprint here.'); prepRender(); } }
    var idle = prep.mode === 'text' ? 'Write the copy. Its SHA-256 appears here.' : 'Choose the file to share. Its SHA-256 appears here.';
    if (prep.mode === 'text') {
      if (!prepTxt.value.trim()) { pdeFpv(prepFpv, 'idle', '', idle); return prepRender(); }
      pdeFpv(prepFpv, 'busy', '', 'Computing SHA-256…'); prepRender(); pdeShaText(prepTxt.value, ready, fail);
    } else {
      if (!prep.file) { pdeFpv(prepFpv, 'idle', '', idle); return prepRender(); }
      if (prep.file.size > PDE_MAX) { pdeFpv(prepFpv, 'err', '', 'This file is over 100 MB. Pick a smaller one.'); return prepRender(); }
      pdeFpv(prepFpv, 'busy', '', 'Computing SHA-256…'); prepRender(); pdeShaFile(prep.file, ready, fail);
    }
  }
  function prepOnOpen() {
    var p = pd.p, it = pdeById(p, pd.prep), g = prepWho(), c = byId(p.cid) || {}, k;
    if (!it) return null;
    prep.it = it; prep.file = null; prep.hex = ''; prep.gen++; clearTimeout(prep.tm);
    k = PDE_KIND[it.kind] || PDE_KIND.doc; prep.mode = it.txt ? 'text' : 'file';
    prepForm.reset();
    document.getElementById('prep-title').textContent = it.copy ? 'Replace client copy' : 'Prepare client copy';
    document.getElementById('prep-sub').textContent = 'Choose exactly what ' + g + ' can see. The original stays private.';
    document.getElementById('prep-oi').innerHTML = IC(k[1]);
    document.getElementById('prep-on').textContent = it.title;
    document.getElementById('prep-os').textContent = k[0] + ' · ' + it.at + ' · ' + pdGroup(it.fp.slice(0, 8), 8);
    prepT.value = (it.copy && it.copy.title) || it.title;
    document.getElementById('f-prep-txt').hidden = prep.mode !== 'text';
    document.getElementById('f-prep-file').hidden = prep.mode !== 'file';
    if (prep.mode === 'text') prepTxt.value = it.copy && it.copy.txt ? it.copy.txt : it.txt;
    prepFile.value = ''; prepDrop.classList.remove('has', 'drag');
    document.getElementById('prep-fn').textContent = 'Choose the file to share';
    document.getElementById('prep-fs').textContent = 'Pick the version ' + g + ' should receive, for example a cropped screenshot. It is read in this browser and never uploaded.';
    document.getElementById('prep-pvh').textContent = 'What ' + g + ' will see';
    document.getElementById('prep-okt').textContent = 'I checked the copy. ' + g + ' will see exactly this, and the original stays private.';
    prepGo.textContent = it.copy ? 'Replace copy' : 'Share with ' + g; prepGo.disabled = true; prepOk.checked = false;
    document.getElementById('prep-hint').textContent = c.portal === 'active' ? g + ' sees it in the portal.' : c.portal === 'invited' ? g + ' sees it once they open the portal.' : c.portal === 'closed' ? 'The portal is closed, so ' + g + ' cannot open it.' : g + ' is not invited to the portal yet.';
    document.getElementById('f-prep-t').removeAttribute('data-err');
    prepHash();
    return prep.mode === 'text' ? '#prep-txt' : '#prep-file';
  }
  prepTxt.addEventListener('input', function () {
    prep.gen++; prep.hex = ''; prepGo.disabled = true; prepRender();
    pdeFpv(prepFpv, prepTxt.value.trim() ? 'busy' : 'idle', '', prepTxt.value.trim() ? 'Computing SHA-256…' : 'Write the copy. Its SHA-256 appears here.');
    clearTimeout(prep.tm); prep.tm = setTimeout(prepHash, 220);
  });
  prepT.addEventListener('input', function () { document.getElementById('f-prep-t').removeAttribute('data-err'); if (prep.it) prepRender(); });
  prepFile.addEventListener('change', function () {
    var f = prepFile.files && prepFile.files[0]; prep.file = f || null;
    prepDrop.classList.toggle('has', !!f); prepDrop.classList.remove('drag');
    document.getElementById('prep-fn').textContent = f ? f.name : 'Choose the file to share';
    document.getElementById('prep-fs').textContent = f ? pdeSize(f.size) + ' · read in this browser only' : 'Pick the version ' + prepWho() + ' should receive. It is read in this browser and never uploaded.';
    prepHash();
  });
  ['dragenter', 'dragover'].forEach(function (n) { prepDrop.addEventListener(n, function () { prepDrop.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (n) { prepDrop.addEventListener(n, function () { prepDrop.classList.remove('drag'); }); });
  prepOk.addEventListener('change', function () { prepGo.disabled = !(prep.hex && prepOk.checked); });
  function prepSubmit() {
    if (prepGo.disabled || !prep.it) return;
    var p = pd.p, it = prep.it, cl = byId(p.cid) || {}, g = prepWho(), t = prepT.value.replace(/\s+/g, ' ').trim(), text = prep.mode === 'text';
    if (!t) { document.getElementById('e-prep-t').textContent = 'Give the copy a title.'; document.getElementById('f-prep-t').setAttribute('data-err', ''); prepT.focus(); return; }
    var old = it.copy;
    it.copy = { at: today(), ts: Date.now(), fp: prep.hex, txt: text ? prepTxt.value : '', name: !text && prep.file ? prep.file.name : '', hidden: text ? pdeHidden(it.txt, prepTxt.value) : 0, title: t };
    var undoNote = pdeNote(p, (old ? 'You replaced the copy of “' : 'You shared a copy of “') + it.title + '” with ' + g, cl);
    pd.ev = it.id; closeDrawer(true);
    pdAfterEvidence(p); pdRerender('.pd-cr.ev[aria-current="true"]');
    var undo = function () { it.copy = old; undoNote(); pdAfterEvidence(p); if (pd.p === p) pd.ev = it.id; undone(p, 'evidence'); };
    pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = 'Client copy shared with ' + g + '. Copy fingerprint ' + pdeFpShow(it.copy.fp) + '.'; }, 40);
    showToast('Client copy shared with ' + g, undo);
  }
  prepForm.addEventListener('submit', function (e) { e.preventDefault(); prepSubmit(); });
  prepForm.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); prepSubmit(); } });

  function pdeUnshare(id) {
    var p = pd.p, it = pdeById(p, id), cl = byId(p.cid) || {}, g = given(cl) || 'the client'; if (!it || !it.copy) return;
    var old = it.copy; it.copy = null;
    var undoNote = pdeNote(p, 'You stopped sharing “' + it.title + '” with ' + g, cl, true);
    pdAfterEvidence(p); pdRerender('[data-pd="evprep"]');
    var undo = function () { it.copy = old; undoNote(); pdAfterEvidence(p); if (pd.p === p) pd.ev = it.id; undone(p, 'evidence'); };
    showToast(g + ' can no longer see the copy', undo);
  }
  function pdePaintRes(say) {
    var el = pdPanel.querySelector('.pde-res'), r = pd.evr; if (!el || !r || pd.ev !== r.id) return;
    el.hidden = false; el.className = 'pde-res' + (r.busy ? ' busy' : r.err ? ' bad' : r.ok ? ' ok' : ' bad'); el.innerHTML = pdeResHTML(r);
    if (say) { pdLive.textContent = ''; setTimeout(function () { pdLive.textContent = el.textContent; }, 40); }
  }
  function pdeVerify(f) {
    var p = pd.p, it = p && pdeById(p, pd.ev); if (!f || !it) return;
    pd.evr = { id: it.id, busy: true }; pdePaintRes();
    pdeShaFile(f, function (hex) { pd.evr = { id: it.id, ok: hex === it.fp, name: f.name, sample: it.sample }; pdePaintRes(true); }, function () { pd.evr = { id: it.id, err: true }; pdePaintRes(true); });
  }
  function pdeCheckText() {
    var p = pd.p, it = p && pdeById(p, pd.ev); if (!it || !it.txt) return;
    pd.evr = { id: it.id, busy: true }; pdePaintRes();
    pdeShaText(it.txt, function (hex) { pd.evr = { id: it.id, ok: hex === it.fp, text: true, name: 'Stored text' }; pdePaintRes(true); }, function () { pd.evr = { id: it.id, err: true }; pdePaintRes(true); });
  }

  /* preview: what the client sees */
  function pvwOnOpen() {
    var p = pd.p, c = byId(p.cid) || {}, g = given(c) || 'the client', l = pdLatest(p), b = '';
    document.getElementById('pvw-title').textContent = 'What ' + g + ' sees';
    document.getElementById('pvw-sub').textContent = 'Read only. ' + g + '’s portal for ' + p.n + ', as it is right now.';
    var waits = pdcWaits(p, g);
    b += '<div class="pvw-sec st"><h3 class="sec">Waiting on clients</h3>' + (waits.length ? '<ul class="pvw-l">' + waits.map(function (w) { return '<li><span><span class="id">' + esc(w.k === 'sc' ? 'Approve' : w.id) + '</span>' + esc(w.k === 'sc' ? 'Scope v' + w.v : w.t) + '</span><span class="m">' + esc(w.sub) + '</span></li>'; }).join('') + '</ul>' : '<p class="pvw-e">Nothing for ' + esc(g) + ' to do right now.</p>') + '</div>';
    if (l) {
      var cnt = function (s) { return l.items.filter(function (x) { return x.sec === s; }).length; }, ins = l.items.filter(function (x) { return x.sec === 'in'; });
      b += '<div class="pvw-sec st"><h3 class="sec">Scope</h3><div class="pvw-seal"><span class="pd-seal' + (l.appr ? '' : ' wait') + '" aria-hidden="true">' + IC(l.appr ? 'tick' : 'clock') + '</span><div><b>Scope v' + l.v + ' · ' + (l.appr ? 'approved' : 'waiting for ' + esc(g) + ' to approve') + '</b><small>Issued ' + esc(l.at) + (l.appr ? ' · ' + esc(l.appr) : '') + '</small></div></div>' + pdFpChip(p, l) +
        '<ul class="pvw-l">' + ins.slice(0, 6).map(function (x) { return '<li><span>' + esc(x.t) + '</span></li>'; }).join('') + (ins.length > 6 ? '<li><span>and ' + (ins.length - 6) + ' more deliverables</span></li>' : '') + '</ul><p class="pde-small">' + cnt('out') + (cnt('out') === 1 ? ' exclusion' : ' exclusions') + ' · ' + cnt('tl') + (cnt('tl') === 1 ? ' milestone' : ' milestones') + '</p></div>';
    } else b += '<div class="pvw-sec st"><h3 class="sec">Scope</h3><p class="pvw-e">Nothing shared yet. ' + esc(g) + ' sees no Scope until you issue it.</p></div>';
    var CV = { me: ['neutral', 'With the studio'], client: ['warn', 'Needs your reply'], approved: ['ok', 'Approved'], declined: ['neutral', 'Declined'] }, tt = pdTotals(p);
    if (l) b += '<div class="pvw-sec st"><h3 class="sec">Terms</h3><ul class="pvw-l"><li><span>Contract value</span><span class="m">' + (tt.price == null ? 'Not set' : esc(pdMoney(tt.price, p.cur))) + '</span></li>' + (smV2(l) ? '<li><span>Revisions</span><span class="m">' + pdTermsOf(l).r.rpm + ' per milestone</span></li>' : '<li><span>Revision rounds</span><span class="m">' + (tt.rev == null ? (p.rev.used ? p.rev.used + ' used' : 'Not set') : p.rev.used + ' of ' + tt.rev + ' used') + '</span></li>') + '<li><span>Expected delivery</span><span class="m">' + (tt.delivery == null ? 'No dated milestone' : esc(dayLbl(tt.newDelivery != null ? tt.newDelivery : tt.delivery))) + '</span></li>' + ((tt.pend.amt || tt.pend.days) && tt.total != null ? '<li><span>New total</span><span class="m">' + esc(pdMoney(tt.total, p.cur)) + '</span></li>' : '') + '</ul></div>';
    var crs = pdCrList(p);
    b += '<div class="pvw-sec st"><h3 class="sec">Requests</h3>' + (crs.length ? '<ul class="pvw-l">' + crs.map(function (cr) { var v = CV[pdCrState(cr)], xp = pdExpired(cr); return '<li><span><span class="id">' + cr.id + '</span>' + esc(cr.t) + '</span>' + (pdCrState(cr) === 'client' && pdValidBit(cr) && !xp ? '<span class="m">' + esc(pdValidBit(cr).slice(3)) + '</span>' : '') + '<span class="chip ' + (xp ? 'warn' : v[0]) + '">' + (xp ? 'Quote expired' : v[1]) + '</span></li>'; }).join('') + '</ul>' : '<p class="pvw-e">No requests yet.</p>') + '</div>';
    var sh = p.evd.filter(function (x) { return x.copy; });
    b += '<div class="pvw-sec st"><h3 class="sec">Shared copies</h3>' + (sh.length ? '<ul class="pvw-l">' + sh.slice(0, 6).map(function (x) { return '<li><span>' + esc(x.copy.title || x.title) + '</span><span class="m">' + esc((PDE_KIND[x.kind] || PDE_KIND.doc)[0]) + ' · ' + esc(x.copy.at) + '</span></li>'; }).join('') + (sh.length > 6 ? '<li><span>and ' + (sh.length - 6) + ' more copies</span></li>' : '') + '</ul>' : '<p class="pvw-e">You have not shared a copy yet.</p>') + '</div>';
    b += '<div class="pvw-sec st"><h3 class="sec">Not visible to ' + esc(g) + '</h3><div class="pvw-no">' + ['Scope drafts', 'Team', 'Evidence originals', 'Private notes'].map(function (t) { return '<span class="pd-tag">' + IC('lock') + t + '</span>'; }).join('') + '</div></div>';
    document.getElementById('pvw-body').innerHTML = b;
    pdFp(p);
    return null;
  }

