  /* ───────── v65: before people use it for real. An owner who lost every device with a project's key gets it back from the team,
     checked by safety code (CONTRACT.md, section 24). The first run asks your name and whether to start empty; sample data can be
     cleared later without touching your own ───────── */
  var XA = { sample: {}, asked: {}, later: {}, fps: {}, busy: false };
  var XA_SEED = { p: ['minh-phat-website', 'greenhome', 'online-store', 'booking-app', 'brand-toolkit', 'personal-identity', 'document-hub', 'contract-templates'], c: ['minh-phat', 'greenhome', 'lotus-wellness', 'sen-coffee', 'hoa-mai', 'tre-viet'], t: ['s1', 'u1', 't1', 'u2', 'f1', 'p1', 'f2', 's2', 'u3', 'f3'], n: [1, 2, 3, 4], tm: [] };
  try { XA.asked = JSON.parse(localStorage.getItem('sd-x8ask') || '{}') || {}; } catch (e) { XA.asked = {}; }
  function xaFirst() { try { return localStorage.getItem('sd-first') || ''; } catch (e) { return ''; } }
  function xaSetFirst(v) { try { localStorage.setItem('sd-first', v); } catch (e) {} }

  /* ================================================================== the key, when the owner has no device that holds it */
  /* called by a sync round for a room this device has no key for */
  function xaNoKey(rm, p) {
    if (rm.role === 'Owner') X8.lost.push(rm);
    else if (!p) X8.wm.push(rm);
  }
  /* a member's device that holds the key: the owner's new device is asking */
  function xaAsks() {
    var out = [];
    X8.list.forEach(function (rm) {
      if (rm.role === 'Owner' || !rm.rescue || !rm.rescue.length || !(X8.keys[rm.id] || {})[rm.gen]) return;
      var p = x8ByRoom(rm.id), own = (rm.members.filter(function (m) { return m.role === 'Owner'; })[0] || {});
      rm.rescue.forEach(function (x) { if (!XA.later[rm.id + x.kid]) out.push({ rm: rm, p: p, x: x, oname: own.name || own.email || 'The owner', o1: (own.name || own.email || 'The owner').split(' ')[0] }); });
    });
    return out;
  }
  async function xaFpOf(pub) { var k = pub.x + '.' + pub.y; if (!XA.fps[k]) XA.fps[k] = await x8Fp(pub); return XA.fps[k]; }
  function xaAskHTML(p) {
    var a = xaAsks().filter(function (x) { return x.p === p; })[0]; if (!a) return '';
    return '<div class="x8-why warn xa-ask">' + IC('shield') + '<div><p><b>' + esc(a.o1) + ' asks for the key on a new device.</b> Check the safety code with ' + esc(a.o1) + ' first, by phone or in person, not by email: <span class="x8-fp xa-fp" data-fp="' + esc(a.x.pub.x + '.' + a.x.pub.y) + '">····</span></p>' +
      '<div class="xa-acts"><button type="button" class="btn-primary btn-sm" data-xa="give" data-room="' + esc(a.rm.id) + '" data-kid="' + esc(a.x.kid) + '">The codes match. Hand it over</button><button type="button" class="btn-ghost btn-sm" data-xa="later" data-room="' + esc(a.rm.id) + '" data-kid="' + esc(a.x.kid) + '">Not now</button></div></div></div>';
  }
  async function xaGive(room, kid, b) {
    var rm = X8.list.filter(function (r) { return r.id === room; })[0], x = rm && (rm.rescue || []).filter(function (y) { return y.kid === kid; })[0], K = rm && (X8.keys[room] || {})[rm.gen];
    if (!x || !K) { showToast('That request is gone. Sync and try again.'); return; }
    if (b) b.disabled = true;
    var w = {}; w[kid] = await x8Wrap(K, x.pub, room + '|' + rm.gen + '|' + kid);
    var r = await x8Ask('POST', '/v1/rooms/' + room + '/keys', { gen: rm.gen, wrapped: w });
    if (b) b.disabled = false;
    if (!syOk(r)) { showToast(syMsg(r)); return; }
    rm.rescue = rm.rescue.filter(function (y) { return y.kid !== kid; });
    var p = x8ByRoom(room); if (p) pdNote(p, 'You handed the project key to ' + ((p.x8 && p.x8.oname) || 'the owner') + '’s new device');
    xaPaint(); showToast('Key handed over. It opens on the new device at its next sync.');
    x8Sync(true);
  }
  async function xaAskTeam(room, b) {
    var d = await x8EnsureDev(); if (b) b.disabled = true;
    var r = await x8Ask('POST', '/v1/rooms/' + room + '/rescue', { kid: d.kid });
    if (b) b.disabled = false;
    if (!syOk(r)) { showToast(syMsg(r)); return; }
    if (r.data.has) { x8Sync(false); return; }
    XA.asked[room] = Date.now(); try { localStorage.setItem('sd-x8ask', JSON.stringify(XA.asked)); } catch (e) {}
    xaPaint(); showToast(r.data.told ? 'Asked. Your team got an email; whoever answers checks your safety code first.' : 'Asked. Whoever opens ScopeDue first checks your safety code, then hands it over.');
  }
  /* the dashboard says it, because the project itself is not on this device yet */
  async function xaPaint() {
    var el = document.getElementById('xa-ban'); if (!el) return;
    var h = '', lost = (X8.lost || []), wm = (X8.wm || []), asks = xaAsks();
    var who = function (rm) { return rm.members.filter(function (m) { return m.email !== x8Me(); }).map(function (m) { return (m.name || m.email).split(' ')[0]; }); };
    if (lost.length) {
      await x8Dev();
      var rm = lost[0], asked = XA.asked[rm.id], ppl = who(rm);
      h += '<div class="xa-b">' + IC('lock') + '<div class="grow"><b>' + (lost.length === 1 ? 'A project you share' : lost.length + ' projects you share') + ' cannot open on this device yet</b>' +
        '<p>' + (asked ? 'Asked ' + esc(x8Ago(asked)) + '. Tell ' + esc(prvList(ppl) || 'your team') + ' this device’s safety code, by phone or in person: <span class="x8-fp">' + IC('shield') + esc(X8.devFp || '') + '</span>. It opens here once one of them hands it over.' :
          'This device has no key for it. Another device of yours that has it hands it over by itself. If none is left, ask ' + esc(prvList(ppl) || 'your team') + ': one of them checks this device’s safety code with you, then hands the key over.') + '</p></div>' +
        (asked ? '' : '<button type="button" class="btn-primary btn-sm" data-xa="ask" data-room="' + esc(rm.id) + '">Ask the team</button>') + '</div>';
    }
    if (wm.length) {
      var w0 = wm[0], o = (w0.members.filter(function (m) { return m.role === 'Owner'; })[0] || {}), on = (o.name || o.email || 'The owner').split(' ')[0];
      h += '<div class="xa-b soft">' + IC('users') + '<div class="grow"><b>' + esc(on) + ' shared ' + (wm.length === 1 ? 'a project' : wm.length + ' projects') + ' with you</b><p>' + (wm.length === 1 ? 'It arrives' : 'They arrive') + ' here once ' + esc(on) + '’s ScopeDue hands this device its key. Nothing to do.</p></div></div>';
    }
    for (var i = 0; i < asks.length; i++) {
      var a = asks[i], fp = await xaFpOf(a.x.pub);
      h += '<div class="xa-b warn">' + IC('shield') + '<div class="grow"><b>' + esc(a.o1) + ' asks for the key to ' + esc(a.p ? a.p.n : 'a shared project') + ' on a new device</b><p>Check the safety code with ' + esc(a.o1) + ' first, by phone or in person, not by email: <span class="x8-fp">' + IC('shield') + esc(fp) + '</span></p></div>' +
        '<span class="xa-acts"><button type="button" class="btn-primary btn-sm" data-xa="give" data-room="' + esc(a.rm.id) + '" data-kid="' + esc(a.x.kid) + '">The codes match. Hand it over</button><button type="button" class="btn-ghost btn-sm" data-xa="later" data-room="' + esc(a.rm.id) + '" data-kid="' + esc(a.x.kid) + '">Not now</button></span></div>';
    }
    el.innerHTML = h; el.hidden = !h;
  }
  function xaNotes(out) {
    xaAsks().forEach(function (a) { if (a.p) out.push({ key: 'xar:' + a.rm.id + ':' + a.x.kid, tone: 'warn', title: a.o1 + ' asks for the project key', text: 'On a new device. Check the safety code before you hand it over.', meta: dbName(a.p), ts: a.x.ts || Date.now(), go: { pid: a.p.id, tab: 'team', f: '', cr: '' } }); });
  }

