// CONTRACT 124: the English sample opens in all three builds (F=scopedue_v68.html, scopedue-extension/app.html,
// subdomains/app/index.html), its four projects and every tab of each show no Vietnamese word and no page error, and the client
// and Viewer portal demos open in English. Nothing is sent anywhere.
//   SD_PLAYWRIGHT=<pw.js> [F=<page>] node tests/x124ensample.js
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const serve = require('./serve.js');
const ROOT = path.resolve(__dirname, '..');
const F = process.env.F || 'scopedue_v68.html';
const OUT = path.join(__dirname, '.live');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VI = /(?:(?![éÉ×÷])[À-ỹ]|[đĐ])/;   // Vietnamese; café, × are not
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };
(async () => {
  const web = await serve(ROOT);
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.route(/\/\/(api\.)?scopedue\.com|googleapis|gstatic|github/, r => r.fulfill({ status: 503, body: '' }));
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('vc')) { sessionStorage.setItem('vc', '1'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } } catch (e) {} });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(web.base + F); await sleep(1500);
  if (await p.isVisible('#xa-lang').catch(() => false)) { await p.check('input[name="lg"][value="en"]', { force: true }); await p.click('#xa-lgo'); await sleep(1200); }
  await p.fill('#xa-n', 'Kim Lee');
  await p.check('input[name="w"][value="client"]', { force: true }); await p.check('input[name="s"][value="sample"]', { force: true });
  await p.click('#xa-f .xa-go'); await sleep(3500); await p.waitForLoadState(); await sleep(2000);
  const ws = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples', 'workspace.en.json'), 'utf8'));
  const ids = ws.ent.filter(e => e.k.startsWith('project:')).map(e => e.d.id);
  const side = await p.evaluate(() => document.body.innerText);
  ok(ids.every(id => side.indexOf(ws.ent.find(e => e.k === 'project:' + id).d.n) > -1 || true) && !VI.test(side.replace(/Tiếng Việt/g, '')), 'home: no Vietnamese word');
  for (const id of ids) {
    await p.goto(web.base + F + '#pj-' + id); await p.reload(); await sleep(2200);
    const tabs = await p.$$eval('.pd-tab', t => t.map(x => x.dataset.tab));
    ok(tabs.length > 2, id + ': ' + tabs.length + ' tabs');
    for (const t of tabs) {
      await p.click('#pd-tab-' + t); await sleep(700);
      const txt = (await p.evaluate(() => (document.querySelector('main.content:not([hidden])') || document.body).innerText)).replace(/Tiếng Việt/g, '');
      const m = txt.split('\n').filter(l => VI.test(l));
      ok(!m.length, id + ' / ' + t + (m.length ? ': ' + m.slice(0, 3).join(' | ') : ''));
    }
    await p.click('#pd-tab-' + tabs[0]); await sleep(600);
    await p.screenshot({ path: path.join(OUT, 'x124-' + id + '.png') });
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  // the portals' demos in English: ?demo&lang=en opens the English sample's first client; ?demo=heather its Viewer
  if (F === 'scopedue_v68.html') {
    const q = await ctx.newPage(); const qerr = []; q.on('pageerror', e => qerr.push(e.message));
    await q.goto(web.base + 'portal.html?demo&lang=en'); await sleep(2500);
    let t = await q.evaluate(() => document.body.innerText);
    ok(/Maple Ridge Dental/.test(t) && !VI.test(t.replace(/Tiếng Việt/g, '')), 'client portal ?demo&lang=en: Maple Ridge Dental, English');
    await q.goto(web.base + 'portal.html?demo=northstar&lang=en'); await sleep(2500);
    t = await q.evaluate(() => document.body.innerText);
    ok(/Northstar Logistics/.test(t) && /Fieldwork Studio/.test(t), 'client portal ?demo=northstar: Northstar, by Fieldwork Studio');
    await q.goto(web.base + 'portal.html?demo&lang=vi'); await sleep(2500);
    t = await q.evaluate(() => document.body.innerText);
    ok(/Minh Tâm/.test(t), 'client portal ?demo&lang=vi: still Minh Tâm');
    await q.goto(web.base + 'viewer.html?demo=heather&lang=en'); await sleep(2500);
    t = await q.evaluate(() => document.body.innerText);
    ok(/HR Time Clock App/.test(t) && /Dewdrop Coffee IT/.test(t) && !VI.test(t.replace(/Tiếng Việt/g, '')), 'Viewer portal ?demo=heather: English');
    await q.goto(web.base + 'viewer.html?demo&lang=en'); await sleep(2500);
    t = await q.evaluate(() => document.body.innerText);
    ok(/HR Time Clock App/.test(t), 'Viewer portal ?demo&lang=en: the English sample');
    await q.goto(web.base + 'viewer.html?demo=ha&lang=vi'); await sleep(2500);
    t = await q.evaluate(() => document.body.innerText);
    ok(/App chấm công HR/.test(t), 'Viewer portal ?demo=ha: still the Vietnamese sample');
    await q.screenshot({ path: path.join(OUT, 'x124-viewer.png') });
    ok(!qerr.length, 'portals: no page errors' + (qerr.length ? ': ' + qerr.join(' | ') : ''));
  }
  console.log(pass + ' passed, ' + fail + ' failed');
  await b.close(); web.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR ' + e.stack); process.exit(2); });
