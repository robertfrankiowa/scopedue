// v68: treat the whole sample studio as someone's own work, then look everywhere in Vietnamese (every view, tab, project,
// client, drawer and quick find) for any of those words shown translated. Run from this folder: node x68t.js (SD_ROOT = the release).
// Two Vietnamese texts are the app's own and happen to equal the translation of a sample word; they are listed in SAME.
// v69: the first run asks what you work on (x69own.js); these checks are about the sample studio, so they answer Work for clients.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const PAGE = 'file://' + path.join(path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), 'scopedue_v68.html');
// “Ví dụ: Khảo sát giá của các studio” is the placeholder of Add source; “Phê duyệt” is the heading Approval; “Bàn giao” is the tab
// Delivery (the sample's milestone Handoff reads the same in Vietnamese)
const SAME = new Set(['Khảo sát giá của các studio', 'Phê duyệt', 'Bàn giao']);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sd.lang')) localStorage.setItem('sd.lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE + '?test&welcome'); await p.waitForTimeout(1300);
  await p.fill('#xa-n', 'Robert Frank'); await p.check('input[name="s"][value="sample"]'); await p.check('input[name="w"][value="client"]'); await p.click('#xa-f .xa-go'); await p.waitForTimeout(2500);
  // the samples become this person's own work
  await p.evaluate(() => new Promise(r => { const q = indexedDB.open('scopedue'); q.onsuccess = () => { const t = q.result.transaction('meta', 'readwrite'); t.objectStore('meta').put({ k: 'sample', s: '{}' }); t.oncomplete = r; }; }));
  await p.evaluate(() => { localStorage.setItem('sd.lang', 'vi'); localStorage.setItem('sd-first', 'empty'); });
  await p.reload(); await p.waitForTimeout(1800);
  const data = await p.evaluate(async () => {
    const x = await SDB.exportAll(); const o = typeof x === 'string' ? JSON.parse(x) : x; const out = [];
    (function walk(v) { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(o.ent || o);
    return [...new Set(out)].map(s => [s, SDI18N.isUser(s)]);
  });
  // what each of those would read like if it were the app's
  const c = await b.newPage(); await c.goto(PAGE + '?test&lang=vi'); await c.waitForTimeout(1200);
  const tr = await c.evaluate(l => l.map(s => SDI18N.t(s)), data.map(d => d[0]));
  const user = [], app = [];
  data.forEach((d, i) => { if (tr[i] !== d[0]) (d[1] ? user : app).push([d[0], tr[i]]); });
  console.log('user words that would translate:', user.length, '· app texts in the data that translate:', app.length);
  const bad = new Map(user.map(x => [x[1].replace(/\s+/g, ' ').trim(), x[0]]));
  // look everywhere
  const found = new Map();
  async function look(where) {
    const t = await p.evaluate(() => { const o = []; const w = document.createTreeWalker(document.body, 4); let n; while ((n = w.nextNode())) { const v = n.nodeValue.replace(/\s+/g, ' ').trim(); if (v) o.push(v); } document.querySelectorAll('[aria-label],[title],[placeholder],[data-tip]').forEach(e => ['aria-label', 'title', 'placeholder', 'data-tip'].forEach(a => { const v = e.getAttribute(a); if (v) o.push(v.replace(/\s+/g, ' ').trim()); })); return o; });
    t.forEach(v => { if (bad.has(v) && !found.has(v)) found.set(v, where + ' ← ' + bad.get(v)); for (const [k, src] of bad) if (k.length > 25 && v !== k && v.includes(k) && !found.has(k)) found.set(k, where + ' (inside) ← ' + src); });
  }
  await look('dashboard');
  const views = await p.$$eval('.nav-i[data-view]', l => l.map(a => a.getAttribute('data-view')));
  for (const v of views) { await p.click(`.nav-i[data-view="${v}"]`).catch(() => {}); await p.waitForTimeout(300); await look(v); const tabs = await p.$$('main:not([hidden]) [role=tab]'); for (let i = 0; i < tabs.length; i++) { await tabs[i].click().catch(() => {}); await p.waitForTimeout(200); await look(v + ':tab' + i); } }
  await p.click('.nav-i[data-view="projects"]'); await p.waitForTimeout(250);
  const nrow = (await p.$$('#view-projects .pl-row')).length;
  for (let i = 0; i < nrow; i++) {
    await p.click('.nav-i[data-view="projects"]'); await p.waitForTimeout(200); const rs = await p.$$('#view-projects .pl-row'); await rs[i].click(); await p.waitForTimeout(400); await look('project' + i);
    const tn = (await p.$$('main:not([hidden]) [role=tab]')).length;
    for (let j = 0; j < tn; j++) { const t = await p.$$('main:not([hidden]) [role=tab]'); await t[j].click().catch(() => {}); await p.waitForTimeout(300); await look('project' + i + ':tab' + j);
      // open what a row opens
      const det = await p.$$('main:not([hidden]) details:not([open]) > summary'); for (const d of det.slice(0, 6)) { await d.click().catch(() => {}); } if (det.length) { await p.waitForTimeout(150); await look('project' + i + ':tab' + j + ':details'); } }
  }
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(250);
  const ncl = (await p.$$('#view-clients .pl-row')).length;
  for (let i = 0; i < ncl; i++) { await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(200); const c2 = await p.$$('#view-clients .pl-row'); await c2[i].click(); await p.waitForTimeout(350); await look('client' + i); }
  await p.click('.nav-i[data-view="dashboard"]'); await p.waitForTimeout(250);
  const drawers = await p.$$eval('[data-open-drawer]', l => [...new Set(l.map(a => a.getAttribute('data-open-drawer')))]);
  for (const d of drawers) { const okk = await p.evaluate(dn => { const x = [...document.querySelectorAll(`[data-open-drawer="${dn}"]`)].find(y => y.offsetParent); if (x) { x.click(); return true; } return false; }, d); if (!okk) continue; await p.waitForTimeout(350); await look('drawer:' + d); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  await p.click('#q'); for (const q of ['a', 'e', 'o', 'pro', 'st']) { await p.fill('#q', q); await p.waitForTimeout(200); await look('quickfind:' + q); } await p.keyboard.press('Escape');
  SAME.forEach(k => found.delete(k));
  console.log('translated people’s words on screen:', found.size); for (const [k, v] of found) console.log('  FAIL ' + k + '   [' + v + ']');
  if (errs.length) console.log('FAIL page errors', errs);
  await b.close();
  const f = found.size + (errs.length ? 1 : 0);
  console.log(f ? f + ' FAILED' : 'ALL PASSED (' + user.length + ' of their words checked)');
  process.exit(f ? 1 : 0);
})();
