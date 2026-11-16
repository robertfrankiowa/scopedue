// v118 (CONTRACT 85): client log rows written before 84 as "undefinedCR-001" (a studio dispute or question) get their words back
// once, when the app opens, and the mended rows are saved. The newest such row matches the newest studio dispute or question on
// that request; a request with neither says "You wrote on". Other rows are left alone.
// F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html. SD_PLAYWRIGHT.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const S = await require('./serve')(ROOT);
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('x118')) { sessionStorage.setItem('x118', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_test118', email: 'robert@studio.example', via: 'email' })); } } catch (e) {} });
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto(S.base + F + '?test'); await sleep(1500);
    const t = Date.now() - 864e5;
    const seeded = await A.evaluate(async t => {
      const ent = (k, d) => ({ k: k + ':' + d.id, d });
      const cl = { id: 'nk', name: 'Nha khoa', contact: 'Lê Ngọc Hân', email: 'han@clinic.example', lang: 'en', people: [], status: 'current', portal: 'invited', projects: [], needs: [], act: [],
        log: [['you', 'undefinedCR-002', 'Change request', '1h ago'], ['you', 'undefinedCR-001', 'Change request', '2h ago'], ['client', 'Hân replied on CR-001', 'Change request', '3h ago'],
          ['you', 'undefinedCR-001', 'Change request', '4h ago'], ['you', 'You sent a quote on CR-001', 'Change request', '5h ago']] };
      const pj = { id: 'site', n: 'Website', m: 'W', kind: 'private', cid: 'nk', phase: 1, team: [], ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now(),
        crs: [{ id: 'CR-001', t: 'Reminders', base: 1, adds: true, touches: 1, cmp: null, entries: [
          { w: 'c', ty: 'request', at: 'x', ts: t, tx: 'Remind by Zalo' }, { w: 'y', ty: 'quote', at: 'x', ts: t + 1e3, tx: 'Zalo ZNS', amt: 400, days: 5 },
          { w: 'y', ty: 'dispute', at: 'x', ts: t + 2e3, tx: 'SMS/Zalo is out of scope', pos: 'change' }, { w: 'c', ty: 'note', at: 'x', ts: t + 3e3, tx: 'OK' },
          { w: 'y', ty: 'question', at: 'x', ts: t + 4e3, tx: 'Which OA?' }] },
          { id: 'CR-002', t: 'Print list', base: 1, adds: true, touches: 1, cmp: null, entries: [{ w: 'c', ty: 'request', at: 'x', ts: t, tx: 'Print' }, { w: 'y', ty: 'note', at: 'x', ts: t + 1e3, tx: 'Later' }] }] };
      const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [ent('client', cl), ent('project', pj)], ord: { client: ['client:nk'], project: ['project:site'] }, meta: {} }));
      if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
    }, t);
    ok(seeded === 'ok', 'a client log with three "undefinedCR-…" rows, as written before 84', seeded);
    await A.reload(); await sleep(2500);
    const lines = async () => (await A.evaluate(async () => (await SDB.exportAll()).ent.find(e => e.k === 'client:nk').d.log.map(r => r[1])));
    let got = await lines();
    const want = ['You wrote on CR-002', 'You asked a question on CR-001', 'Hân replied on CR-001', 'You disagreed on CR-001', 'You sent a quote on CR-001'];
    ok(JSON.stringify(got) === JSON.stringify(want), 'opened: the newest row on CR-001 is the question, the older the dispute; CR-002 (neither) says wrote on; others untouched', got);
    const page = await A.evaluate(() => document.body.innerText);
    ok(!/undefinedCR/.test(page), 'no "undefinedCR" anywhere on the page');
    await sleep(2500);   // a save tick (1.5 s)
    /* read what is stored from a page of the same origin that does not run the app (it would mend the rows again) */
    const B = await ctx.newPage(); await B.goto(S.base + 'tests/serve.js');
    got = await B.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('scopedue'); r.onerror = () => rej('open'); r.onsuccess = () => { const g = r.result.transaction('ent').objectStore('ent').get('client:nk'); g.onsuccess = () => { const v = g.result; const d = v && (typeof v.d === 'string' ? JSON.parse(v.d) : v.d); res(d ? d.log.map(x => x[1]) : v); }; g.onerror = () => rej('get'); }; }));
    ok(JSON.stringify(got) === JSON.stringify(want), 'saved: IndexedDB holds the mended rows', got);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'the run went through', e.stack || String(e)); }
  await b.close(); S.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})();
