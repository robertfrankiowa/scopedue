  /* ---------- CONTRACT 120: a sample's portals open, to look at ----------
     A sample never reaches the server (88, 99), so its client and its Viewers have no portal of their own. Its client portal opens
     as the portal's demo of that client, built from the same sample (88, 103: ?demo=<client>). Its Viewer portal opens as the
     Viewer portal's demo of that Viewer (viewer.html?demo=<viewer>): what GET /v1/viewer would answer them, worked out from the
     sample as a push would (vpOut). Nothing goes to the server; both portals stop everything that would send. (Not postMessage
     from here: app. and portal. both send Cross-Origin-Opener-Policy same-origin, which cuts a tab from the one that opened it.) */
  /* the v68 page (a file, or this machine's server): portal.html and viewer.html are built next to it */
  function sdpLocal() { return location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
  function sdpBase(f) { return location.protocol === 'file:' ? f : '/' + f; }
  function sdpClientUrl(c) {
    var b = sdpLocal() ? sdpBase('portal.html') : (typeof SY !== 'undefined' && SY.portal) || 'https://client.scopedue.com/';
    return b + (b.indexOf('?') > -1 ? '&' : '?') + 'demo=' + String(c.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') + (window.SDI18N ? '&lang=' + SDI18N.lang : '');
  }
  function sdpOpenClient(c) { if (c) window.open(sdpClientUrl(c), '_blank', 'noopener'); }
  function sdpMask(e) { e = String(e || ''); var i = e.indexOf('@'); return i < 1 ? e : e[0] + '•••••' + e.slice(i); }
  function sdpStudio() { return (typeof pfSaved !== 'undefined' && pfSaved && (pfSaved.biz || pfSaved.name)) || 'ScopeDue'; }
  /* what the server would answer this Viewer (api.php h_viewer): the entries without who sent them or how others answered, only
     whether they are the Viewer's own, how many voted and the Viewer's own answer */
  function sdpViewerData(p, e) {
    var had = p.vp, o;
    p.vp = { on: true, sh: { rel: 1, items: 1, ships: 1 }, vw: {} };   /* a sample shows all three, as a new portal does */
    try { o = vpOut(p); } finally { p.vp = had; }
    var low = function (l) { return (l || []).map(function (x) { return String(x || '').toLowerCase(); }); };
    var m = fbViewers(p).filter(function (x) { return String(x.e).toLowerCase() === e; })[0] || {};
    var entries = o.entries.map(function (x) {
      var y = Object.assign({}, x), an = {}, vo = low(x.vo);
      Object.keys(x.an || {}).forEach(function (k) { an[String(k).toLowerCase()] = x.an[k]; });
      delete y.fr; delete y.an;
      y.vo = vo.length; y.mine = low(x.fr).indexOf(e) > -1; y.voted = vo.indexOf(e) > -1;
      if (an[e]) y.myv = an[e];
      return y;
    });
    return { studio: { slug: 'sample', name: sdpStudio(), lang: pjLang(p) }, project: { ref: vpRef(p), name: p.n },
      viewer: { name: m.n || 'Viewer', email: sdpMask(e), lang: pjLang(p) }, show: o.show, entries: entries, pending: [], approvals: [], keys: [] };
  }
  /* the demo of each Viewer is made from the sample by tests/viewer-demo-vi.js (sdpViewerData, through __sdp) and built into the
     Viewer portal (build.py viewer_demo): ?demo=<the start of their address>, as the client portal's ?demo=<client> */
  function sdpViewerUrl(e) {
    var b = sdpLocal() ? sdpBase('viewer.html') : 'https://portal.scopedue.com/';
    return b + '?demo=' + String(e || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + (window.SDI18N ? '&lang=' + SDI18N.lang : '');
  }
  function sdpOpenViewer(p, e) {
    e = String(e || '').toLowerCase();
    if (p && fbViewers(p).some(function (x) { return String(x.e).toLowerCase() === e; })) window.open(sdpViewerUrl(e), '_blank', 'noopener');
  }
  if (sdTest()) window.__sdp = { viewer: function (id, e) { return sdpViewerData(pdById(id), String(e || '').toLowerCase()); }, client: function (id) { return sdpClientUrl(byId(id)); }, vurl: sdpViewerUrl };
  /* the Feedback tab of a sample with Viewers: its portal, one button for each Viewer */
  function sdpVpCard(p) {
    if (!p || p.kind !== 'private' || !fbViewers(p).length) return '';
    return '<section class="card pd-card vp-card" aria-labelledby="pd-h-vp"><div class="card-h ruled"><div><span class="pd-eb">portal.scopedue.com</span><h3 id="pd-h-vp">Viewer portal</h3><p>' +
      esc('In a sample, the portal opens as a demo: see what each Viewer sees. Nothing goes to the server.') + '</p></div><div class="h-actions"><span class="chip neutral">Sample</span></div></div><div class="pde-b"><ul class="vp-ppl">' +
      fbViewers(p).map(function (m) {
        var e = String(m.e).toLowerCase();
        return '<li>' + pdAv(m) + '<span class="fb-pn"><b>' + esc(m.n) + '</b><small>Viewer</small></span><button type="button" class="btn-ghost btn-sm" data-pd="vpdemo" data-e="' + esc(e) + '">' + IC('ext') + 'See what ' + esc(sdCallName(m.n) || m.n) + ' sees</button></li>';
      }).join('') + '</ul></div></section>';
  }
