  /* ---------- project: evidence, client, history (prefixes pde, pdc, pdh) ---------- */
  var PDE_KIND = { email: ['Email', 'mail'], shot: ['Screenshot', 'image'], chat: ['Chat', 'chat'], build: ['Build', 'folder'], doc: ['Document', 'doc'], text: ['Note', 'edit'] };
  var pdeN = sdCtr('pdeN', 0);
  function pdeSeedFp(s) {
    var h1 = 2166136261, h2 = 5381, h3 = 0x9747b28c, i, c, out = '';
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) ^ c) >>> 0; h3 = Math.imul(h3 ^ c, 0x5bd1e995); h3 = (h3 ^ (h3 >>> 15)) >>> 0; }
    [h1, h2, h3].forEach(function (h) { out += ('00000000' + h.toString(16)).slice(-8); });
    return out;
  }
  function pdeById(p, id) { return (p.evd || []).filter(function (x) { return x.id === id; })[0]; }
  function pdeSize(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; }
  function pdeHex(buf) { return [].map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function pdeShaBuf(buf, ok, fail) {
    try { if (window.crypto && crypto.subtle) crypto.subtle.digest('SHA-256', buf).then(function (h) { ok(pdeHex(h)); }, fail); else fail(); } catch (e) { fail(); }
  }
  function pdeShaText(t, ok, fail) { try { pdeShaBuf(new TextEncoder().encode(t), ok, fail); } catch (e) { fail(); } }
  function pdeShaFile(f, ok, fail) {
    try {
      if (f.arrayBuffer) f.arrayBuffer().then(function (b) { pdeShaBuf(b, ok, fail); }, fail);
      else { var r = new FileReader(); r.onload = function () { pdeShaBuf(r.result, ok, fail); }; r.onerror = fail; r.readAsArrayBuffer(f); }
    } catch (e) { fail(); }
  }
  function pdeFpShow(hex) { return pdGroup(hex.slice(0, 24), 24); }
  function pdeRefLabel(ref) { return !ref ? '' : /^v\d+$/.test(ref) ? 'Scope ' + ref : ref; }
  function pdeGuess(f) {
    var n = (f.name || '').toLowerCase(), t = f.type || '';
    if (/^image\//.test(t) || /\.(png|jpe?g|gif|webp|heic)$/.test(n)) return 'shot';
    if (/\.(eml|msg|mbox)$/.test(n)) return 'email';
    if (/\.(zip|apk|ipa|dmg|exe|tar|gz|7z)$/.test(n)) return 'build';
    return 'doc';
  }
  function pdeHidden(orig, copy) {
    var keep = {}, n = 0;
    copy.split(/\r?\n/).forEach(function (l) { var k = l.trim(); if (k) keep[k] = (keep[k] || 0) + 1; });
    orig.split(/\r?\n/).forEach(function (l) { var k = l.trim(); if (!k) return; if (keep[k]) keep[k]--; else n++; });
    return n;
  }
  function pdAfterEvidence(p) { p.ev = p.evd.length; pdRefreshBadges(p); }
  /* An evidence action: touch the project and, for the client page, write the client log. Returns an undo.
     History derives a capture or a copy from the evidence itself, so only a withdrawal (keep) needs a note of its own */
  function pdeNote(p, text, cl, keep) {
    var rec = keep ? pdNote(p, text) : null, row = null, oldUpd = p.upd, oldT = p.updT, i;
    pdTouch(p);
    if (cl && cl.log) { pdLogClient(cl, 'you', text, 'Evidence'); row = cl.log[0]; row[4] = p.id; }
    pdRender();
    return function () {
      if (rec) pdUnnote(p, rec);
      if (row && cl) { i = cl.log.indexOf(row); if (i > -1) cl.log.splice(i, 1); refreshRow(cl); }
      p.upd = oldUpd; p.updT = oldT; pdRender();
    };
  }

  /* ---------- evidence tab ---------- */
  function pdeRow(it, sel) {
    var k = PDE_KIND[it.kind] || PDE_KIND.doc;
    var l2 = '<span class="kd">' + k[0] + '</span>' + (it.copy ? '<span class="chip">Client copy</span>' : '<span class="pde-pvl">' + IC('lock') + '<span>Private</span></span>');
    return '<li><button type="button" class="pd-cr ev" data-pd="evsel" data-ev="' + it.id + '"' + (sel ? ' aria-current="true"' : '') + '><span class="pde-ic" aria-hidden="true">' + IC(k[1]) + '</span><span class="tx"><b>' + esc(it.title) + '</b><span class="l2">' + l2 + '</span></span><time>' + esc(it.at) + '</time></button></li>';
  }
  function pdeRefBtn(ref) { return ref ? '<button type="button" class="pd-crl" data-pd="evgoto" data-ref="' + esc(ref) + '">' + esc(pdeRefLabel(ref)) + '</button>' : ''; }
  function pdeResHTML(r) {
    if (!r) return '';
    if (r.busy) return 'Computing SHA-256…';
    if (r.err) return IC('x') + '<span><b>Could not read it.</b> This browser could not hash that file.</span>';
    if (r.ok) return IC('tick') + '<span><b>Matches.</b> ' + (r.text ? 'The stored text still produces this fingerprint.' : '“' + esc(r.name) + '” is byte for byte the file you captured.') + '</span>';
    return IC('x') + '<span><b>Does not match.</b> “' + esc(r.name) + '” is not the file that was captured' + (r.sample ? '. This is a sample item, so no real file stands behind its fingerprint.' : '. It may have been edited or replaced.') + '</span>';
  }
  /* v116: what was said or sent comes first; the fingerprint is a small seal under it, with its check beside it. A shared copy sits
     next to the original, and a copy identical to the original says so (its SHA-256 is then the same, as it must be) */
  function pdeDetail(p, it, g) {
    var k = PDE_KIND[it.kind] || PDE_KIND.doc, shared = !!it.copy, isText = !!it.txt, res = pd.evr && pd.evr.id === it.id ? pd.evr : null, cp = it.copy;
    var src = it.sample ? 'Sample item. No real file stands behind this fingerprint. Capture a file of your own to see a real SHA-256.' :
      isText ? 'SHA-256 of the exact text. The text stays on this device.' : 'SHA-256 of the exact bytes. ScopeDue does not keep the file.';
    var what = isText ? 'Pasted text · ' + it.txt.length + (it.txt.length === 1 ? ' character' : ' characters') : it.name ? it.name + ' · ' + pdeSize(it.size) : '';
    var h = '<section class="card pd-card pd-cr-d pde-d" aria-labelledby="pd-h-ev"><div class="card-h ruled"><div><span class="pd-eb">' + esc(k[0]) + ' · ' + esc(it.at) + '</span><h3 id="pd-h-ev" tabindex="-1">' + esc(it.title) + '</h3>' + (it.ref ? '<p><span class="pde-lk">Linked to</span>' + pdeRefBtn(it.ref) + '</p>' : '') + '</div></div><div class="pde-b">';
    /* the words, or the file */
    var same = shared && cp.fp === it.fp, side = shared && isText && cp.txt && !same;
    if (isText && !side) h += '<figure class="pde-q"><blockquote>' + esc(it.txt) + '</blockquote><figcaption>' + IC(shared ? 'users' : 'lock') + '<span>' + esc(shared ? (same ? g + ' sees it as it is' : 'The original. ' + g + ' sees a copy') : 'Private: only you can read it') + '</span></figcaption></figure>';
    else if (side) h += '<div class="pde-two"><figure class="pde-q"><figcaption>' + IC('lock') + '<span>' + esc('The original · only you') + '</span></figcaption><blockquote>' + esc(it.txt) + '</blockquote></figure><figure class="pde-q cp"><figcaption>' + IC('users') + '<span>' + esc('As ' + g + ' sees it') + '</span></figcaption><blockquote>' + esc(cp.txt) + '</blockquote>' + (cp.hidden ? '<small>' + esc(cp.hidden + (cp.hidden === 1 ? ' line removed or changed' : ' lines removed or changed')) + '</small>' : '') + '</figure></div>';
    else if (what) h += '<div class="pde-file"><span class="pde-ic" aria-hidden="true">' + IC(k[1]) + '</span><div><b>' + esc(it.name || it.title) + '</b><small>' + esc(k[0] + ' · ' + pdeSize(it.size || 0)) + '</small></div></div>';
    /* the seal: fingerprint, copy, check, and the answer of the check */
    h += '<div class="pde-seal"><span class="pde-sl" aria-hidden="true">' + IC('shield') + '</span><div class="pde-sb"><div class="pde-fprow"><span class="pd-fp" title="' + esc('SHA-256 ' + pdGroup(it.fp, it.fp.length)) + '">' + esc(pdeFpShow(it.fp)) + '</span><button type="button" class="icon-sm xs" data-pd="evfpcopy" data-fp="' + it.fp + '" aria-label="Copy the original fingerprint">' + IC('copy') + '</button>' +
      '<button type="button" class="btn-ghost btn-sm" data-pd="' + (isText ? 'evcheck' : 'evverify') + '">' + (isText ? 'Check integrity' : 'Verify original') + '</button></div><small title="' + esc(src) + '">' + esc(isText ? what + ' · sealed with SHA-256' : 'Sealed with SHA-256. Pick the file again to check it; nothing is uploaded.') + '</small>' +
      '<div class="pde-res' + (res ? (res.busy ? ' busy' : res.ok ? ' ok' : ' bad') : '') + '" role="status"' + (res ? '' : ' hidden') + '>' + pdeResHTML(res) + '</div>' + (isText ? '' : '<input type="file" id="pde-vf" hidden tabindex="-1" aria-hidden="true">') + '</div></div>';
    /* who sees it */
    if (!shared) {
      h += '<div class="pde-vis"><span class="pde-ic sm" aria-hidden="true">' + IC('lock') + '</span><div><b>Private original</b><small>' + esc(g + ' cannot see it.') + '</small></div><div class="pde-acts"><button type="button" class="btn-primary btn-sm" data-pd="evprep">' + IC('share') + '<span>Prepare client copy</span></button></div></div>';
    } else {
      h += '<div class="pde-vis"><span class="pd-seal sm" aria-hidden="true">' + IC('tick') + '</span><div><b>Client copy shared ' + esc(cp.at) + '</b><small>' + esc(same ? 'Shared as it is, so it has the original’s fingerprint.' : g + ' sees the copy, never the original.') + '</small>' +
        (same ? '' : '<span class="pde-cfp"><span class="pd-fp" title="' + esc('SHA-256 ' + pdGroup(cp.fp, cp.fp.length)) + '">' + esc(pdeFpShow(cp.fp)) + '</span><button type="button" class="icon-sm xs" data-pd="evfpcopy" data-fp="' + cp.fp + '" aria-label="Copy the client copy fingerprint">' + IC('copy') + '</button></span>') + (cp.name ? '<small>' + esc('File: ' + cp.name) + '</small>' : '') + '</div>' +
        '<div class="pde-acts"><button type="button" class="btn-ghost btn-sm" data-pd="evprep">Replace copy</button><button type="button" class="btn-ghost btn-sm" data-pd="evunshare">Stop sharing</button></div></div>';
    }
    return h + '</div></section>';
  }
  function pdEvidenceHTML(p) {
    var c = byId(p.cid) || {}, g = given(c) || 'the client';
    var cta = '<button type="button" class="btn-primary" data-pd="evcap">' + IC('plus') + '<span>Capture</span></button>';
    var head = pdHeadHTML(p, 'evidence', cta), all = p.evd;
    if (!all.length) return head + '<div class="card pd-void"><span class="pd-void-i">' + IC('shield') + '</span><h3>Nothing captured yet</h3><p>Capture an email, a chat, a screenshot or a build. ScopeDue keeps its SHA-256 fingerprint and details. The original stays with you, and ' + esc(g) + ' only sees a copy you choose to share.</p><button type="button" class="btn-primary" data-pd="evcap">' + IC('plus') + '<span>Capture evidence</span></button></div>';
    var nSh = all.filter(function (x) { return x.copy; }).length, nPr = all.length - nSh;
    var list = all.filter(function (x) { return pd.evf === 'all' || (pd.evf === 'shared' ? !!x.copy : !x.copy); });
    var sel = list.filter(function (x) { return x.id === pd.ev; })[0] || list[0] || null;
    pd.ev = sel ? sel.id : null;
    var shown = Math.max(pd.evn, sel ? list.indexOf(sel) + 1 : 0); if (list.length - shown <= 2) shown = list.length;
    var vis = list.slice(0, shown);
    var seg = '<div class="seg" role="group" aria-label="Filter evidence" data-seg="evf"><button type="button" data-f="all" aria-pressed="' + (pd.evf === 'all') + '">All <span class="n">' + all.length + '</span></button><button type="button" data-f="private" aria-pressed="' + (pd.evf === 'private') + '">Private <span class="n">' + nPr + '</span></button><button type="button" data-f="shared" aria-pressed="' + (pd.evf === 'shared') + '">Client copy <span class="n">' + nSh + '</span></button></div>';
    /* v116: the count is said once; the filter shows once there are enough items to filter; that originals stay private is in the page's line */
    var left = '<section class="card pd-card" aria-labelledby="pd-h-evl"><div class="card-h ruled"><div><h3 id="pd-h-evl">Captured</h3><p>' + esc((all.length === 1 ? '1 item' : all.length + ' items') + ' · ' + (nSh ? nSh + ' with a client copy' : 'no client copy yet')) + '</p></div></div>' +
      (all.length >= 5 || pd.evf !== 'all' ? '<div class="pd-crs-seg">' + seg + '</div>' : '') +
      (vis.length ? '<ul class="pd-crs">' + vis.map(function (x) { return pdeRow(x, x === sel); }).join('') + '</ul>' : '<p class="pd-crs-e">Nothing matches this filter.</p>') +
      (list.length > shown ? '<div class="pde-more"><button type="button" class="btn-ghost btn-sm" data-pd="evmore">Show ' + (list.length - shown <= 10 ? list.length - shown : 8) + ' more</button></div>' : '') + '</section>';
    var right = sel ? pdeDetail(p, sel, g) : '<section class="card pd-card"><p class="pd-crs-e">Select an item to see its fingerprint.</p></section>';
    return head + '<div class="pd-cols pd-ms"><div class="pd-col">' + left + '</div><div class="pd-col">' + right + '</div></div>';
  }

  /* ---------- what the client still owes (the preview), and a labelled bar ---------- */
  function pdcWaits(p, g) {
    return caItems(p).filter(function (x) { return x.k !== 'wk' && x.k !== 'pay'; }).map(function (x) {
      return x.k === 'sc' ? { k: 'sc', v: x.v, lead: 'Client Action', t: x.name, s: 'client', sub: 'Issued ' + x.atS, time: '', chip: null }
        : { k: 'cr', id: x.id, lead: x.id, t: x.name, s: 'client', sub: (x.ty === 'quote' ? 'Quote sent ' : 'Your reply was sent ') + x.atS, time: '', chip: null };
    });
  }
  function pdcBar(label, val, w, hint, ok, mute) {
    return '<div class="pdc-bar"><div><span>' + esc(label) + '</span><b' + (mute ? ' class="mute"' : '') + '>' + esc(val) + '</b></div><div class="pdc-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + w + '" aria-label="' + esc(label + ': ' + val) + '"><i' + (ok ? ' class="ok"' : '') + ' style="--w:' + w + '%"></i></div><small>' + esc(hint) + '</small></div>';
  }
  /* ---------- history tab: derived, never stored twice ---------- */
  var PD_ANCHOR = Date.now();
  function pdParseWhen(s) {
    s = String(s || '');
    var now = Date.now(), m;
    if (s === 'Just now') return { t: now, k: 'now' };
    if ((m = /^(\d+)(m|h|d|w|mo) ago$/.exec(s))) return { t: PD_ANCHOR - (+m[1]) * { m: 6e4, h: 36e5, d: 864e5, w: 6048e5, mo: 2592e6 }[m[2]], k: 'rel' };
    if (s === 'Yesterday') return { t: PD_ANCHOR - 864e5, k: 'yd' };
    if ((m = /^(\d+) ([A-Z][a-z]{2})(?: · (\d\d):(\d\d))?$/.exec(s))) {
      var mo = MON.indexOf(m[2]); if (mo < 0) return null;
      var y = new Date().getFullYear(), hh = m[3] ? +m[3] : 12, mm = m[4] ? +m[4] : 0, d = new Date(y, mo, +m[1], hh, mm);
      if (d.getTime() > now + 864e5) d = new Date(y - 1, mo, +m[1], hh, mm);
      return { t: d.getTime(), k: m[3] ? 'clock' : 'date' };
    }
    return null;
  }
  function pdDayLabel(t) {
    var d = new Date(t), n = new Date(), ds = d.toDateString();
    if (ds === n.toDateString()) return 'Today';
    if (ds === new Date(n.getTime() - 864e5).toDateString()) return 'Yesterday';
    return d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function pdClock(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  var PD_CRV = { dispute: ' disagreed on ', question: ' asked a question on ', quote: ' sent a quote on ', counter: ' sent a counter offer on ', accept: ' accepted ', decline: ' declined ', note: ' replied on ' };
  function pdEvents(p) {
    var cl = byId(p.cid) || {}, g = given(cl) || 'The client', out = [];
    /* v116: lv says how much an event weighs: ok, crit, warn (it changes where things stand), minor (a step that works, the portal opened) */
    function add(when, ts, who, text, agr, link, sub, by, lv) {
      var w = ts ? { t: ts, k: 'clock' } : pdParseWhen(when); if (!w) return;
      out.push({ t: w.t, k: w.k, s: when, who: who, by: by || '', text: text, agr: agr, link: link || null, sub: sub || '', lv: lv || '', i: out.length });
    }
    p.sc.vers.forEach(function (v) {
      var lk = { tab: 'scope', v: v.v, l: 'Scope v' + v.v };
      add(v.at, v.ts, 'you', 'You issued Scope v' + v.v, true, lk);
      if (v.appr) add(v.appr.split(' · ')[1] || v.at, v.apts, 'client', g + ' approved Scope v' + v.v, true, lk);
    });
    p.crs.forEach(function (c) {
      c.entries.forEach(function (e) {
        var me = e.w === 'y', text = e.ty === 'request' ? (me ? 'You logged ' + c.id + ' · ' + c.t : g + ' opened ' + c.id + ' · ' + c.t) : (me ? 'You' : g) + PD_CRV[e.ty] + c.id;
        add(e.at, e.ts, me ? 'you' : 'client', text, e.ty === 'quote' || e.ty === 'counter' || e.ty === 'accept' || e.ty === 'decline', { tab: 'change', cr: c.id, l: 'Change · ' + c.id }, '', '', { accept: 'ok', decline: 'crit', dispute: 'warn', counter: 'warn' }[e.ty] || '');
      });
    });
    /* every source is added oldest first, so a tie in time goes to the later event */
    p.evd.slice().reverse().forEach(function (it) {
      var lk = { tab: 'evidence', ev: it.id, l: 'Evidence' };
      if (!it.sample) add(it.at, it.ts, 'you', 'You captured “' + it.title + '”', false, lk);
      if (it.copy) add(it.copy.at, it.copy.ts, 'you', 'You shared a copy of “' + it.title + '” with ' + g, false, lk);
    });
    if (p.kind === 'client' && agV2(p)) agEvents(p, add);
    (p.log || []).slice().reverse().forEach(function (e) { add(e.at, e.ts, e.w, e.t, false, null, '', e.by); });
    (cl.log || []).slice().reverse().forEach(function (r) {
      if (r[4] && r[4] !== p.id) return;
      if (/^(Change request|Trusted version|Evidence|Delivery)/.test(r[2] || '')) return;
      add(r[3], r[5] || 0, r[0] === 'client' ? 'client' : 'you', pdhName(r[1], cl), false, null, r[2], '', 'minor');   // v116: r[5] is when, on rows written since
    });
    out.sort(function (a, b) { return b.t - a.t || b.i - a.i; });
    return out;
  }
  /* v116: rows written before names were read right (CONTRACT 81) can say a title for a name ("BS. opened the portal"): show the name */
  function pdhName(t, cl) {
    var w0 = String((cl && cl.contact) || '').trim().split(/\s+/)[0], g = given(cl || {});
    if (!w0 || !g || w0 === g || !/\.$/.test(w0)) return t;
    var q = w0.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(t).replace(new RegExp('^' + q + '(?= [a-z])'), g).replace(new RegExp('(\\s)' + q + '(?=$|[,;:!?]|\\s+[a-z])', 'g'), '$1' + g);
  }
  function pdhLink(e) { return e.link ? e.link.tab + '|' + (e.link.cr || '') + '|' + (e.link.ev || '') + '|' + (e.link.v != null ? e.link.v : '') : ''; }
  function pdhEvent(p, e, cl, cont, sameLk) {
    var av = e.who === 'client' ? pdAv({ n: cl.contact || 'Client', c: '#5c6f94' }) : pdAv(e.by ? pdPeople(p).filter(function (m) { return m.n === e.by; })[0] || ME : ME);
    /* one way to tell the time: the clock. A row kept only as "14h ago" shows about when, and says so */
    var tm = e.k === 'now' ? 'Just now' : e.k === 'clock' ? pdClock(e.t) : e.k === 'rel' ? '≈ ' + pdClock(e.t) : '';
    var lk = e.link && !sameLk ? '<button type="button" class="pd-crl" data-pd="hgo" data-tab="' + e.link.tab + '"' + (e.link.cr ? ' data-cr="' + e.link.cr + '"' : '') + (e.link.v != null ? ' data-v="' + e.link.v + '"' : '') + (e.link.ev ? ' data-ev="' + e.link.ev + '"' : '') + ' aria-label="Open ' + esc(e.link.l) + '">' + esc(e.link.l) + '</button>' : '';
    var sub = e.sub ? '<small>' + esc(e.sub) + '</small>' : '', ag = e.agr ? '<span class="pdh-ag" title="Part of the agreement record">' + IC('shield') + '<span class="sr-only">Agreement record</span></span>' : '';
    return '<li class="pdh-e' + (e.lv ? ' ' + e.lv : '') + (cont ? ' cont' : '') + '">' + av + '<div class="pdh-t"><i class="pdh-dot" aria-hidden="true"></i>' + esc(e.text) + sub + '</div><div class="pdh-r">' + ag + lk + '<time' + (e.k === 'rel' ? ' title="' + esc(e.s) + '"' : '') + '>' + esc(tm) + '</time></div></li>';
  }
  /* v116: who (All, the client, you) and, apart from it, only what is on the agreement record. Rows in a row by the same side on the
     same thing fold under the newest (what changes where things stand never folds); the avatar and the link show once per run */
  function pdHistoryHTML(p) {
    var cl = byId(p.cid) || {}, g = given(cl) || 'the client', all = pdEvents(p);
    if (pd.hf === 'agr') { pd.hf = 'all'; pd.ha = true; }
    var who = function (e, f) { return f === 'all' || e.who === f; }, agr = function (e) { return !pd.ha || e.agr; };
    var cnt = function (f) { return all.filter(function (e) { return who(e, f) && agr(e); }).length; };
    var list = all.filter(function (e) { return who(e, pd.hf) && agr(e); });
    var seg = '<div class="seg" role="group" aria-label="Filter activity" data-seg="hf">' + [['all', 'All'], ['client', g], ['you', 'You']].map(function (x) { return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (pd.hf === x[0]) + '">' + esc(x[1]) + ' <span class="n">' + cnt(x[0]) + '</span></button>'; }).join('') + '</div>' +
      '<button type="button" class="pdh-agr" data-pd="hagr" aria-pressed="' + !!pd.ha + '">' + IC('shield') + '<span>Agreement record only</span></button>';
    var shown = list.slice(0, list.length - pd.hn <= 2 ? list.length : pd.hn), body = '', day = '', open = false, prev = null, run = [];
    var strong = function (e) { return e.lv === 'ok' || e.lv === 'crit' || e.lv === 'warn'; };
    function flush() {
      if (!run.length) return;
      var head = run[0], rest = run.slice(1);
      body += pdhEvent(p, head, cl, run.cont, run.same);
      if (rest.length) body += '<li class="pdh-g"><details><summary>' + esc(rest.length === 1 ? '1 more like this' : rest.length + ' more like this') + '</summary><ul class="pdh-l">' + rest.map(function (e) { return pdhEvent(p, e, cl, true, true); }).join('') + '</ul></details></li>';
      run = [];
    }
    shown.forEach(function (e) {
      var d = pdDayLabel(e.t);
      if (d !== day) { flush(); if (open) body += '</ul>'; body += '<h4 class="pd-eb pdh-day">' + esc(d) + (d === 'Today' || d === 'Yesterday' ? '<span>' + esc(smIsoLbl(smIsoLocal(e.t), true)) + '</span>' : '') + '</h4><ul class="pdh-l">'; day = d; open = true; prev = null; }
      var same = prev && prev.who === e.who && pdhLink(prev) === pdhLink(e) && pdhLink(e) !== '';
      if (run.length && same && !strong(e) && !strong(run[0]) && Math.abs(run[run.length - 1].t - e.t) < 3 * 36e5) run.push(e);
      else { flush(); run = [e]; run.cont = !!(prev && prev.who === e.who); run.same = !!same; }
      prev = e;
    });
    flush();
    if (open) body += '</ul>';
    if (!list.length) body = '<p class="pd-crs-e">' + (pd.hf === 'all' && !pd.ha ? 'Nothing has happened on this project yet.' : 'Nothing matches this filter.') + '</p>';
    var more = list.length > shown.length ? '<div class="pdh-more"><button type="button" class="btn-ghost btn-sm" data-pd="hmore">Show earlier · ' + (list.length - shown.length) + ' more</button></div>' : '';
    /* today in one line: how much happened, and how much of it changed where things stand */
    var td = all.filter(function (e) { return pdDayLabel(e.t) === 'Today'; }), tk = td.filter(strong).length;
    var line = td.length ? (td.length === 1 ? 'Today: 1 event' : 'Today: ' + td.length + ' events') + (tk ? (tk === 1 ? ', 1 that changes where things stand.' : ', ' + tk + ' that change where things stand.') : '.') : 'Between you and ' + g + '.';
    var main = '<section class="card pd-card" aria-labelledby="pd-h-act"><div class="card-h ruled"><div><h3 id="pd-h-act">All events</h3><p>' + esc(line) + '</p></div><div class="h-actions"><button type="button" class="btn-ghost btn-sm" data-pd="dl:record">' + IC('doc') + '<span>Project record</span></button></div></div><div class="pd-crs-seg pdh-fl">' + seg + '</div>' + body + more + '</section>';
    return pdHeadHTML(p, 'history') + '<div class="pd-col pdh-col">' + main + '</div>';
  }
