  /* ---------- data on this device: the Settings card, the notice, and what gets saved ---------- */
  var ldBody = document.getElementById('ld-body'), ldPill = document.getElementById('ld-pill'), ldSub = document.getElementById('ld-sub'), ldFile = document.getElementById('ld-file');
  var ldBar = document.getElementById('ldb-bar'), ldMsg = document.getElementById('ldb-msg'), ldAct = document.getElementById('ldb-act');
  var ldImp = null, ldErase = false, ldBarAct = '', ldLockF = '', ldLocked = null;
  function ldN(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function ldKb(b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
  function ldCopyAt() { var t = 0; try { t = +localStorage.getItem('sd-exported') || 0; } catch (e) {} return t; }
  function ldCopyWhen() { var t = ldCopyAt(); return t ? pdAgo(t) : 'Never'; }
  /* a reminder to export: the work here has changed and gone LD_COPY_DAYS without a copy. Before the first copy the clock starts the first
     time this browser was seen saving (sd-copy-since), so a new workspace is not nagged on day one */
  var LD_COPY_DAYS = 7;
  var LD_SUMBAD = 'That copy was changed after ScopeDue made it: its checksum does not match. Nothing was changed.';   /* v98 (47) */
  function ldCopySince() {
    var t = ldCopyAt(); if (t) return t;
    try { t = +localStorage.getItem('sd-copy-since') || 0; if (!t) { t = Date.now(); localStorage.setItem('sd-copy-since', String(t)); } } catch (e) { t = Date.now(); }
    return t;
  }
  function ldCopyDue() {
    var s = SDB.S, since, d;
    if (s.mode !== 'idb' || s.why || !s.saved) return 0;
    since = ldCopySince(); if (s.saved <= since) return 0;
    d = Math.floor((Date.now() - since) / 864e5);
    return d >= LD_COPY_DAYS ? d : 0;
  }
  function ldCopyNote(out) {
    var d = ldCopyDue(); if (!d) return false;
    out.push({ key: 'sys:copy:' + Math.floor(d / LD_COPY_DAYS), tone: 'warn', title: ldCopyAt() ? 'Your last copy is ' + d + ' days old' : 'No copy of your work yet',
      text: 'Everything here lives in this browser. Clearing site data or removing the extension erases it. Export a copy in Settings › Storage & data.', meta: 'Workspace', ts: dayStart(), go: { view: 'settings', tab: 'storage' } });
    return true;
  }
  /* an encrypted copy: the same backup, sealed with a passphrase (PBKDF2-SHA-256, then AES-GCM 256). Nothing about the passphrase is kept */
  var LD_ITER = 600000, LD_AAD = 'scopedue-backup-locked-v1';
  function ldB64(u) { var s = '', i; for (i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }
  function ldUnB64(s) { var b = atob(s), u = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function ldKey(pass, salt, iter) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function ldLock(text, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return ldKey(pass, salt, LD_ITER).then(function (k) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(LD_AAD) }, k, new TextEncoder().encode(text));
    }).then(function (ct) {
      return JSON.stringify({ app: 'scopedue', kind: 'backup-locked', v: 1, at: Date.now(), kdf: { name: 'PBKDF2', hash: 'SHA-256', iter: LD_ITER, salt: ldB64(salt) }, iv: ldB64(iv), ct: ldB64(new Uint8Array(ct)) });
    });
  }
  function ldIsLocked(text) { return /^\s*\{\s*"app"\s*:\s*"scopedue"\s*,\s*"kind"\s*:\s*"backup-locked"/.test(text.slice(0, 200)); }
  /* resolves with the backup's text, or rejects with a sentence for the person */
  function ldUnlock(o, pass) {
    var k = o && o.kdf, iter = k && +k.iter, salt, iv, ct, bad = 'That encrypted copy is damaged. Nothing was changed.';
    if (!o || o.v !== 1 || !k || k.name !== 'PBKDF2' || k.hash !== 'SHA-256' || !(iter >= 100000 && iter <= 10000000) || typeof k.salt !== 'string' || typeof o.iv !== 'string' || typeof o.ct !== 'string') return Promise.reject(new Error(bad));
    try { salt = ldUnB64(k.salt); iv = ldUnB64(o.iv); ct = ldUnB64(o.ct); } catch (e) { return Promise.reject(new Error(bad)); }
    return ldKey(pass, salt, iter).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(LD_AAD) }, key, ct);
    }).then(function (pt) { return new TextDecoder().decode(pt); }, function () { throw new Error('That passphrase does not open this copy.'); });
  }
  function ldWhen() { var s = SDB.S; return !s.saved ? 'Not yet' : Date.now() - s.saved < 90000 ? 'Just now' : pdAgo(s.saved); }
  function ldCounts(c) { return ldN(c.project, 'project') + ' · ' + ldN(c.client, 'client') + ' · ' + ldN(c.note, 'note'); }
  /* what the notice bar says, if anything: [words, button, what the button does] */
  function ldNotice() {
    var s = SDB.S;
    if (s.why === 'safe') return ['ScopeDue could not open the data saved on this device, so this is a blank copy and nothing you do here is saved. What is saved is untouched.', 'Export saved data', 'export'];
    if (s.why === 'newer') return ['This data was saved by a newer ScopeDue. Update the extension to open it. Nothing is saved from this tab.', 'Export saved data', 'export'];
    if (s.stale) return ['Another ScopeDue tab saved changes. Reload this tab to see them. What you change here is not saved.', 'Reload', 'reload'];
    if (s.mode !== 'idb') return ['This browser is not letting ScopeDue save, so what you do here is lost when the tab closes.', 'Export a copy', 'export'];
    if (s.fail === 'quota') return ['The browser has no room left, so your latest changes are not saved. Export a copy, then free some space.', 'Export a copy', 'export'];
    if (s.fail) return ['Could not save to this browser. ScopeDue keeps trying.', '', ''];
    return null;
  }
  function ldPaintBar() {
    var n = ldNotice();
    ldBar.hidden = !n;
    if (!n) return;
    ldMsg.textContent = n[0]; ldAct.textContent = n[1]; ldAct.hidden = !n[1]; ldBarAct = n[2];
  }
  /* the line at the foot of the sidebar says where the data is; it says so only while that is true */
  function ldChip(bad) {
    var c = document.getElementById('ld-chip'), t = c && c.querySelector('.sync-txt');
    if (!c) return;
    /* projects kept in Google Drive are on this device too: the line says both, so it never seems to contradict their Drive card */
    var dn = bad ? 0 : PROJECTS.filter(function (p) { return p.dv; }).length, ok = dn ? 'On this device and in Drive' : 'Saved on this device';
    t.textContent = bad || ok; c.title = bad ? 'Browser workspace · ' + bad.toLowerCase() : dn ? 'Browser workspace · ' + (dn === 1 ? '1 project is' : dn + ' projects are') + ' also kept in Google Drive' : 'Browser workspace · saved in this browser'; c.setAttribute('data-tip', bad || ok);
    if (bad) c.setAttribute('data-bad', ''); else c.removeAttribute('data-bad');
  }
  function ldPaint() {
    var s = SDB.S, i = SDB.info(), h = '', pt, sub, live = s.mode === 'idb' && !s.why, btns, lost = s.lostN;
    if (s.why === 'safe') { pt = ['off', 'Not opened']; sub = 'This tab could not open what is saved here.'; }
    else if (s.why === 'newer') { pt = ['off', 'Read only']; sub = 'Saved by a newer ScopeDue.'; }
    else if (s.stale) { pt = ['inv', 'Behind']; sub = 'Another tab saved newer changes.'; }
    else if (s.mode !== 'idb') { pt = ['off', 'Not saving']; sub = 'This browser is not letting ScopeDue save.'; }
    else if (s.fail) { pt = ['off', 'Not saved']; sub = 'The last change could not be saved.'; }
    else { pt = ['ok', 'Saved']; sub = 'Projects, clients and notes stay in this browser.'; }
    if (live || s.stale || (s.mode === 'idb' && s.fail)) {
      h = '<dl class="cd-dl">' +   // what is saved, how much and when are in the Storage card above
        '<div><dt>Last copy</dt><dd' + (ldCopyDue() ? ' class="sy-bad"' : '') + '>' + esc(ldCopyWhen() + (ldCopyDue() ? ' · time for a new one' : '')) + '</dd></div>' +
        (lost ? '<div><dt>Set aside</dt><dd class="sy-bad">' + esc(ldN(lost, 'item') + ' could not be read. ' + (lost === 1 ? 'It is' : 'They are') + ' kept and included when you export.') + '</dd></div>' : '') + '</dl>';
    } else {
      h = '<p class="sy-p">' + esc(s.why === 'safe' ? 'The page stopped while it was reading what is saved here, twice in a row. Nothing was changed or deleted. Export it to keep a copy, or erase it to start empty.' :
        s.why === 'newer' ? 'Update the extension to open this data. Nothing was changed.' :
        'ScopeDue could not open the browser’s storage here (a private window, blocked site data or a full disk can do this). Export a copy before you close the tab.') + '</p>';
    }
    if (ldLockF === 'export') {
      h += '<div class="ld-lock"><p class="sy-p">Choose a passphrase for this copy. Without it the copy cannot be opened, and ScopeDue cannot recover it.</p>' +
        '<label class="ld-lf"><span>Passphrase</span><input id="ld-pw" type="password" autocomplete="new-password" spellcheck="false" aria-describedby="ld-pw-err"></label>' +
        '<label class="ld-lf"><span>Repeat it</span><input id="ld-pw2" type="password" autocomplete="new-password" spellcheck="false" aria-describedby="ld-pw-err"></label>' +
        '<p class="err" id="ld-pw-err" role="alert"></p><div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-ld="lock-go">Export encrypted</button><button type="button" class="btn-ghost btn-sm" data-ld="cancel">Cancel</button></div></div>';
    } else if (ldLockF === 'import') {
      h += '<div class="ld-lock"><p class="sy-p">This copy is encrypted. Enter its passphrase to open it. Nothing is replaced until you confirm.</p>' +
        '<label class="ld-lf"><span>Passphrase</span><input id="ld-pw" type="password" autocomplete="current-password" spellcheck="false" aria-describedby="ld-pw-err"></label>' +
        '<p class="err" id="ld-pw-err" role="alert"></p><div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-ld="unlock-go">Open the copy</button><button type="button" class="btn-ghost btn-sm" data-ld="cancel">Cancel</button></div></div>';
    } else if (ldImp) {
      h += '<p class="sy-p">Replace what is saved on this device with the copy from ' + esc(ldImp.at ? dayLbl(ldImp.at) : 'an unknown date') + ': ' + esc(ldCounts(ldImp.counts)) + '? What is saved now is removed. This cannot be undone.</p>' +
        (ldImp.sum === 'ok' ? '<p class="sy-p">Its checksum matches: it is exactly as ScopeDue made it.</p>' : '<p class="sy-p">This copy has no checksum (made before ScopeDue checked them), so it cannot show it is unchanged.</p>') +   /* v98 (47) */
        (ldImp.links ? '<p class="sy-p sy-bad">' + esc(ldImp.links + (ldImp.links === 1 ? ' link in this copy points' : ' links in this copy point') + ' at something that is not in it, for example: ' + ldImp.link1 + '. It is restored as it is; what it points at will show as missing.') + '</p>' : '') +
        '<div class="sy-acts"><button type="button" class="btn-primary btn-sm" data-ld="import-go">Replace</button><button type="button" class="btn-ghost btn-sm" data-ld="cancel">Cancel</button></div>';
    } else if (ldErase) {
      h += '<p class="sy-p">This removes every project, client and note saved on this device, your profile and your portal sign-in from this browser, and signs you out of your server. The server keeps what clients already saw. Export a copy first if you may need it.</p>' +
        '<div class="sy-acts"><button type="button" class="btn-primary btn-sm ld-crit" data-ld="erase-go">Erase everything</button><button type="button" class="btn-ghost btn-sm" data-ld="cancel">Cancel</button></div>';
    } else {
      btns = '<button type="button" class="btn-ghost btn-sm" data-ld="export">' + (live || s.stale ? 'Export' : 'Export saved data') + '</button>' +
        (window.crypto && crypto.subtle ? '<button type="button" class="btn-ghost btn-sm" data-ld="lock">Export encrypted…</button>' : '') +
        (s.db && s.why !== 'newer' ? '<button type="button" class="btn-ghost btn-sm" data-ld="import">Import</button>' : '') +
        '<button type="button" class="btn-ghost btn-sm" data-ld="erase">Erase…</button>';
      h += (live ? '<p class="sy-p">Kept in this browser only. Clearing site data or removing the extension erases it, so export a copy now and then. A copy holds projects, clients and notes, not your profile or settings. Anyone with a plain copy can read it; an encrypted one needs your passphrase.</p>' : '') + '<div class="sy-acts">' + btns + '</div>';
    }
    ldPill.innerHTML = '<i class="pd ' + pt[0] + '"></i>' + pt[1]; ldSub.textContent = sub;
    ldChip(pt[0] === 'ok' ? '' : s.stale ? 'Behind another tab' : s.why === 'newer' ? 'Read only' : s.why === 'safe' ? 'Not opened' : s.mode !== 'idb' ? 'Not saving' : 'Not saved');
    /* while a passphrase form is open, a repaint (the 30-second clock) must not wipe what is being typed */
    if (ldBody._h !== h && !(ldLockF && ldBody._lf === ldLockF)) { ldBody._h = h; ldBody._lf = ldLockF; ldBody.innerHTML = h; }
  }
  function ldExport(btn, pass) {
    if (btn) syBusy(btn, true, pass ? 'Encrypting…' : 'Preparing…');
    SDB.exportAll().then(function (b) {
      if (!b) return null;
      var txt = JSON.stringify(b, null, 1);
      return pass ? ldLock(txt, pass) : txt;
    }).then(function (txt) {
      var a, d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
      if (btn) syBusy(btn, false);
      if (!txt) { showToast('There is nothing to export yet.'); return; }
      a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      a.download = 'scopedue-copy-' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + (pass ? '.locked' : '') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      try { localStorage.setItem('sd-exported', String(Date.now())); } catch (e) {}
      if (pass) { ldLockF = ''; showToast('Encrypted copy saved to your downloads. Keep the passphrase somewhere safe.'); } else showToast('Copy saved to your downloads');
      ldPaint(); dbNotif();
    }, function () { if (btn) syBusy(btn, false); showToast('Could not make a copy. Try again.'); });
  }
  function ldForget() { try { Object.keys(localStorage).filter(function (k) { return /^sd-/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  ldBody.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ld]'), a, f;
    if (!b) return;
    a = b.getAttribute('data-ld');
    if (a === 'export') ldExport(b);
    else if (a === 'lock') { ldLockF = 'export'; ldImp = null; ldErase = false; ldLocked = null; ldPaint(); f = ldBody.querySelector('#ld-pw'); if (f) f.focus(); }
    else if (a === 'lock-go') {
      var p1 = ldBody.querySelector('#ld-pw').value, p2 = ldBody.querySelector('#ld-pw2').value, er = ldBody.querySelector('#ld-pw-err');
      if (p1.length < 10) { er.textContent = 'Use at least 10 characters. A few words work well.'; ldBody.querySelector('#ld-pw').focus(); return; }
      if (p1 !== p2) { er.textContent = 'The two passphrases are not the same.'; ldBody.querySelector('#ld-pw2').focus(); return; }
      er.textContent = ''; ldExport(b, p1);
    }
    else if (a === 'unlock-go') {
      var pw = ldBody.querySelector('#ld-pw'), er2 = ldBody.querySelector('#ld-pw-err');
      if (!pw.value) { er2.textContent = 'Enter the passphrase.'; pw.focus(); return; }
      syBusy(b, true, 'Opening…');
      ldUnlock(ldLocked, pw.value).then(function (t) {
        var r = SDB.parseBackup(t);
        if (!r.ok) { syBusy(b, false); er2.textContent = r.msg; return; }
        return SDB.checkSum(r.backup).then(function (cs) {
        syBusy(b, false);
        if (cs === 'bad') { er2.textContent = LD_SUMBAD; return; }
        r.sum = cs; ldLockF = ''; ldLocked = null; ldImp = r; ldPaint();
        var g = ldBody.querySelector('[data-ld="import-go"]'); if (g) { g.scrollIntoView({ block: 'nearest' }); g.focus({ preventScroll: true }); }
        });
      }, function (x) { syBusy(b, false); er2.textContent = x.message; pw.select(); });
    }
    else if (a === 'import') ldFile.click();
    else if (a === 'cancel') { ldImp = null; ldErase = false; ldLockF = ''; ldLocked = null; ldPaint(); }
    else if (a === 'erase') { ldErase = true; ldImp = null; ldLockF = ''; ldLocked = null; ldPaint(); f = ldBody.querySelector('[data-ld="cancel"]'); if (f) f.focus({ preventScroll: true }); }
    else if (a === 'erase-go') { syBusy(b, true, 'Erasing…'); syEndKey(2500).then(function () { return SDB.reset(); }).then(function () { ldForget(); location.reload(); }, function () { syBusy(b, false); showToast('The browser would not erase it. Try again.'); }); }
    else if (a === 'import-go') { syBusy(b, true, 'Restoring…'); SDB.replaceAll(ldImp.backup).then(function () { location.reload(); }, function (x) { syBusy(b, false); showToast(x && x.message ? x.message : 'Could not restore the copy.'); }); }
  });
  ldFile.addEventListener('change', function () {
    var f = ldFile.files && ldFile.files[0];
    ldFile.value = '';
    if (!f) return;
    if (f.size > 40 * 1048576) { showToast('That file is too large to be a ScopeDue copy.'); return; }
    new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = rej; r.readAsText(f); }).then(function (t) {
      if (ldIsLocked(t)) {
        try { ldLocked = JSON.parse(t); } catch (e) { showToast('That encrypted copy is damaged. Nothing was changed.'); return; }
        ldLockF = 'import'; ldImp = null; ldErase = false; ldPaint();
        var pi = ldBody.querySelector('#ld-pw'); if (pi) { pi.scrollIntoView({ block: 'nearest' }); pi.focus({ preventScroll: true }); }
        return;
      }
      var r = SDB.parseBackup(t);
      if (!r.ok) { showToast(r.msg); return; }
      return SDB.checkSum(r.backup).then(function (cs) {
        if (cs === 'bad') { showToast(LD_SUMBAD); return; }
        r.sum = cs; ldImp = r; ldErase = false; ldLockF = ''; ldPaint();
        var g = ldBody.querySelector('[data-ld="import-go"]'); if (g) g.scrollIntoView({ block: 'nearest' });
      });
    }, function () { showToast('Could not read that file.'); });
  });
  /* Enter in a passphrase field presses the form's button */
  ldBody.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.closest('.ld-lock input')) return;
    var g = ldBody.querySelector('[data-ld="lock-go"], [data-ld="unlock-go"]'); if (g && !g.disabled) { e.preventDefault(); g.click(); }
  });
  ldAct.addEventListener('click', function () { if (ldBarAct === 'reload') location.reload(); else if (ldBarAct === 'export') ldExport(ldAct); });
  SDB.on(function () { ldPaint(); ldPaintBar(); });
  ldPaint(); ldPaintBar();
  setInterval(ldPaint, 30000);
  /* a change is written a moment after the person stops; the timer behind it covers changes nobody clicked for (a client's reply arriving) */
  ['click', 'input', 'change', 'keyup'].forEach(function (t) { document.addEventListener(t, function () { SDB.soon(120); }, true); });

  pdInitAll();
  mwBadge(); caBadge(); dbWaiting(); dbPriority();
  recSeed(); dbRecent(); dbToday(); ntSeed(); dayKey = dayKeyNow(); dayReady = true;
  pdFromHash();

