  /* ---------- v105: finding what a project holds (CONTRACT.md 62, spec CP-24) ----------
     Quick find (Ctrl K) already finds projects, work, notes, ideas, decisions and links. These groups add what a client project's
     record holds: the Scope's lines (deliverables, exclusions, what the client provides, milestones and their Done when lines), the
     change requests with every entry's words and code (#XXXXXX, 58), the delivery record (notes, links, a capsule's build and
     steps, 61) and the evidence. Only what is on this device is searched, so each person finds what their copy holds (an Editor's
     copy is the part Drive gives them, 29). Nothing is stored for it: the lists are read when someone types */
  var PF_SEC = { 'in': 'Deliverable', out: 'Not included', ci: 'Client provides', tl: 'Milestone' };
  function pfQf() {
    var scope = [], changes = [], delivery = [], evidence = [];
    PROJECTS.forEach(function (p) {
      if (p.kind !== 'client') return;
      var g = given(byId(p.cid) || {}) || 'The client';
      ((p.sc || {}).items || []).forEach(function (x) {
        if (x.rm || !PF_SEC[x.sec]) return;
        var sec = x.sec === 'ci' ? g + ' provides' : PF_SEC[x.sec];
        scope.push({ t: x.t, s: p.n + ' · ' + sec + (x.d && (x.sec === 'tl' || x.sec === 'ci') ? ' · ' + smIsoLbl(x.d) : ''), ic: 'doc', x: p.n + ' ' + sec + ' ' + (x.ok || '') + ' ' + (x.d || ''), go: function () { openProject(p.id, 'scope', qfIn); } });
      });
      (p.crs || []).forEach(function (c) {
        var st = pdCrState(c), words = c.entries.map(function (e) { return (e.tx || '') + ' ' + (e.hx ? pdCode(e.hx) + ' ' + pdCode(e.hx).slice(1) : ''); }).join(' ');
        changes.push({ t: c.id + ' · ' + c.t, s: p.n + ' · ' + (PD_ST[st] || ['', ''])[1], ic: 'swap', x: p.n + ' ' + words, go: function () { openProject(p.id, 'change', qfIn, c.id); } });
      });
      if ((p.mev || []).length) {
        var M = agM(p), names = { studio: 'You', client: g };
        p.mev.forEach(function (e) {
          var t = smEvText(e, M, names); if (!t) return;
          var more = [e.tx, e.link, e.cap ? (e.cap.b || '') + ' ' + (e.cap.steps || []).join(' ') : ''].filter(Boolean).join(' ');
          delivery.push({ t: t, s: p.n + ' · Delivery' + (e.ts ? ' · ' + prvDate(e.ts) : ''), ic: 'send', x: p.n + ' ' + more, go: function () { openProject(p.id, 'delivery', qfIn); } });
        });
      }
      (p.evd || []).forEach(function (it) {
        evidence.push({ t: it.title, s: p.n + ' · Evidence' + (it.copy ? ' · shared with ' + g : ''), ic: 'shield', x: p.n + ' ' + (it.kind || '') + ' ' + (it.ref || '') + ' ' + (it.copy ? it.copy.title || '' : '') + ' ' + (it.fp || ''),
          go: function () { openProject(p.id, 'evidence', qfIn); pd.ev = it.id; pdRerender(); } });
      });
    });
    return { scope: scope, changes: changes, delivery: delivery, evidence: evidence };
  }
