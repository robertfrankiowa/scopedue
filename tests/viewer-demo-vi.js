// CONTRACT 120: makes samples/viewer-demo.vi.json, the Viewer portal's demo, from the Vietnamese sample, by the app itself: for each
// Viewer of each sample project that has some, what GET /v1/viewer would answer them (64-sample-portals sdpViewerData, as a push
// would send it: vpOut). Run it again whenever samples/workspace.vi.json changes, then build.py. Nothing is sent anywhere.
// SD_PLAYWRIGHT=<playwright> node tests/viewer-demo-vi.js
// SD_LANG=en makes samples/viewer-demo.en.json from the English sample the same way (CONTRACT 124).
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const serve = require('./serve.js');
const ROOT = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LG = process.env.SD_LANG === 'en' ? 'en' : 'vi';
(async () => {
  const web = await serve(ROOT);
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.route(/\/\/(api\.)?scopedue\.com|googleapis|gstatic|github/, r => r.fulfill({ status: 503, body: '' }));
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('vc')) { sessionStorage.setItem('vc', '1'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } } catch (e) {} });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(web.base + 'scopedue_v68.html'); await sleep(1500);
  if (await p.isVisible('#xa-lang').catch(() => false)) { await p.check('input[name="lg"][value="' + LG + '"]', { force: true }); await p.click('#xa-lgo'); await sleep(1200); }
  await p.fill('#xa-n', 'Kim Lê');
  await p.check('input[name="w"][value="client"]', { force: true }); await p.check('input[name="s"][value="sample"]', { force: true });
  await p.click('#xa-f .xa-go'); await sleep(3500); await p.waitForLoadState(); await sleep(2500);
  // ?test (which gives __sdp) skips the welcome, so the sample is chosen first, then the page opens again with it
  await p.goto(web.base + 'scopedue_v68.html?test'); await sleep(3500);
  // the sample's projects, as the sample file lists them
  const ws = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples', 'workspace.' + LG + '.json'), 'utf8'));
  const pjs = ws.ent.filter(e => e.k.startsWith('project:') && e.d.kind === 'private' && (e.d.team || []).some(m => m.role === 'Viewer' && m.e));
  const out = { order: [], v: {} };
  for (const e of pjs) {
    for (const m of e.d.team.filter(m => m.role === 'Viewer' && m.e)) {
      const key = String(m.e).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (out.v[key]) throw new Error('two Viewers start their address with ' + key);
      const d = await p.evaluate(([id, em]) => window.__sdp.viewer(id, em), [e.d.id, m.e]);
      if (!d || !d.entries) throw new Error('no demo for ' + m.e);
      out.order.push(key); out.v[key] = d;
      console.log(key + ': ' + e.d.id + ', ' + d.entries.length + ' entries, ' + d.entries.filter(x => x.mine).length + ' of them theirs');
    }
  }
  if (errs.length) throw new Error('page errors: ' + errs.join(' | '));
  if (!out.order.length) throw new Error('no sample project has a Viewer');
  fs.writeFileSync(path.join(ROOT, 'samples', 'viewer-demo.' + LG + '.json'), JSON.stringify(out, null, 1) + '\n');
  console.log('wrote samples/viewer-demo.' + LG + '.json (' + out.order.join(', ') + ')');
  await b.close(); web.close(); process.exit(0);
})().catch(e => { console.log('ERROR ' + e.stack); process.exit(2); });
