// v120 (CONTRACT.md 88): a sample is to look at. The Vietnamese sample is loaded through the welcome, then on every screen that shows
// it (Overview, Projects, My work, Waiting on clients, Clients, the client's page, each tab of the project) every button, link, select
// and checkbox is tried in turn, and every form a click opens is sent. After each try the sample's records must be as they were
// (what only says where the person looked, such as the last visit, is left out). A try that tells the person it is a sample is
// counted. Then Clear sample data still clears it. No server.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the page (scopedue_v68.html by default; any of the three builds).
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 900))); if (!c) fails++; };
/* v128 (103): both client projects of the sample: Nha khoa Minh Tâm, and Sao Bắc Logistics with its team */
const PJS = ['website-dat-lich-kham-nha-khoa-minh-tam', 'quan-ly-doi-xe-giao-hang-sao-bac-logistics', 'venli'], CLS = ['nha-khoa-minh-tam', 'sao-bac-logistics'];
/* where the person looked, not what the sample says */
const VIEW = { lv: 1, lvs: 1, upd: 1, updT: 1, nextAt: 1, seenN: 1, seenT: 1, ptS: 1, act: 1, mevq: 1, mevBusy: 1, q: 1, busy: 1, ok: 1, cmp: 1, seenTs: 1,
  glance: 1, local: 1, gaps: 1, open: 1 };   /* v128 (103): what the Overview works out for a product on each look, as x125samplesync leaves out */
(async () => {
  const web = await require('./serve')(ROOT), base = web.base.slice(0, -1);
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  await ctx.route(/scopedue\.com|googleapis|gstatic|github/, r => r.fulfill({ status: 503, body: '' }));
  if (/subdomains/.test(F)) await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('vc')) { sessionStorage.setItem('vc', '1'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } } catch (e) {} });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  p.on('dialog', d => d.dismiss().catch(() => {}));
  p.on('popup', w => w.close().catch(() => {}));
  await p.goto(base + '/' + F); await sleep(1500);
  if (await p.isVisible('#xa-lang').catch(() => false)) { await p.check('input[name="lg"][value="vi"]', { force: true }); await p.click('#xa-lgo'); await sleep(1200); }
  await p.fill('#xa-n', 'Kim Lê');
  await p.check('input[name="w"][value="client"]', { force: true }); await p.check('input[name="s"][value="sample"]', { force: true });
  await p.click('#xa-f .xa-go'); await sleep(3500); await p.waitForLoadState(); await sleep(2500);
  const snap = full => p.evaluate(([V, full]) => SDB.exportAll().then(b => {
    const clean = o => JSON.stringify(o, (k, v) => V[k] ? undefined : v);
    /* v129 (106): four projects make the whole copy large: each record comes back as a short hash and its length, and in full
       only when it changed (sent back over and over, the copies ran the page out of memory) */
    const h = x => { let a = 2166136261, z = 5381; for (let i = 0; i < x.length; i++) { const c = x.charCodeAt(i); a = Math.imul(a ^ c, 16777619); z = (Math.imul(z, 33) + c) | 0; } return (a >>> 0).toString(36) + '.' + (z >>> 0).toString(36) + '.' + x.length; };
    const m = {}; b.ent.forEach(e => { if (/^(project|client):/.test(e.k)) { const c = clean(e.d); m[e.k] = full ? c : h(c); } }); return m;
  }), [VIEW, full]);
  const diff = (a, z) => Object.keys(Object.assign({}, a, z)).filter(k => a[k] !== z[k]).map(k => {
    const x = a[k] || '', y = z[k] || ''; let i = 0; while (i < x.length && x[i] === y[i]) i++;
    return k + ' @' + i + ': ' + x.slice(Math.max(0, i - 60), i + 60) + ' => ' + y.slice(Math.max(0, i - 60), i + 60);
  });
  const toast = () => p.evaluate(() => { const t = document.querySelector('#toast-msg'); return t ? t.textContent : ''; }).catch(() => '');
  const SAY = /bản mẫu|dữ liệu mẫu|This is a sample/i;
  // where the sample shows
  const side = v => async () => { await p.click('.side [data-view="' + v + '"]').catch(() => {}); };
  const pages = [
    ['Overview', '#view-dashboard', side('dashboard')],
    ['Projects', '#view-projects', side('projects')],
    ['My work', '#view-mywork', side('mywork')],
    ['Waiting on clients', '#view-actions', side('actions')],
    ['Clients', '#view-clients', side('clients')],
    ...CLS.map(CL => ['The client ' + CL, '#view-client', async () => { await side('clients')(); await sleep(400); await p.click('#view-clients [data-id="' + CL + '"]').catch(() => {}); }])
  ];
  /* a project opens from its address on a page load (a hash change alone does not route); its tabs are then clicked */
  const toProject = (PJ, t) => async () => {
    if (!(await p.isVisible('#pd-tab-' + t).catch(() => false)) || !(await p.evaluate(id => location.hash.indexOf('#pj-' + id + '-') === 0, PJ))) { await p.goto(base + '/' + F + '#pj-' + PJ + '-' + t); await p.reload(); await sleep(2500); }
    await p.click('#pd-tab-' + t).catch(() => {});
  };
  /* SD_RO_PJ=<id,...>: only these projects' tabs (and no other screen, unless main is named): the whole sample on one page ran it
     out of memory (four projects, 106), so it is tried in parts */
  const ONLY = (process.env.SD_RO_PJ || '').split(',').filter(Boolean);
  if (ONLY.length && !ONLY.includes('main')) pages.length = 0;   /* 'main': the other screens too */
  for (const PJ of PJS) {
    if (ONLY.length && !ONLY.includes(PJ)) continue;
    await toProject(PJ, 'scope')();
    const tabs = await p.$$eval('#pd-tabs [data-tab]', l => [...new Set(l.map(x => x.getAttribute('data-tab')))]).catch(() => []);
    ok(tabs.length >= 4, PJ + ': the project has its tabs', tabs);
    tabs.forEach(t => pages.push([PJ.slice(0, 18) + ' › ' + t, '#view-project', toProject(PJ, t)]));
  }
  // a first look at every screen: what changes only by looking is not counted
  for (const [, , go] of pages) { await go(); await sleep(900); }
  let s0 = await snap();
  ok(Object.keys(s0).length === 6, 'the sample: two clients, their two projects, and two products (105: Venli)', Object.keys(s0));
  const MAIN = '#app main, main.content, .content, [role="main"]';
  let tried = 0, said = 0;
  const leaks = [];
  const CTL = ' :is(button, a[href], select, input[type="checkbox"], input[type="radio"], [role="button"], [data-pd], [data-cd])';
  /* v129 (106): a fresh page for each screen, and every 100 tries: thousands of tries on one page ran it out of memory */
  const fresh = async () => { await p.goto(base + '/' + F).catch(() => {}); await sleep(1800); };
  for (const [name, root, go] of pages) {
    await fresh(); await go(); await sleep(900);
    const count = await p.$$eval(root + CTL, l => l.length).catch(() => 0);
    for (let i = 0; i < count; i++) {
      if (i && i % 100 === 0) await fresh();
      await p.keyboard.press('Escape').catch(() => {}); await p.keyboard.press('Escape').catch(() => {});
      await go(); await sleep(450);
      const el = (await p.$$(root + CTL))[i];
      if (!el || !(await el.isVisible().catch(() => false))) continue;
      const what = await el.evaluate(e => (e.getAttribute('data-pd') || e.getAttribute('data-cd') || e.getAttribute('data-a') || e.tagName.toLowerCase()) + ' “' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50) + '”').catch(() => '?');
      const href = await el.getAttribute('href').catch(() => null);
      if (href && /^https?:/.test(href)) continue;   // a link out of the app
      /* v131 (109): in My work a sample's status is the one thing that changes (the circle and the status menu) */
      if (name === 'My work' && await el.evaluate(e => e.matches('.mw-ck, select[data-wk="st"]')).catch(() => false)) continue;
      await p.evaluate(() => { const t = document.querySelector('#toast-msg'); if (t) t.textContent = ''; });
      tried++;
      const tag = await el.evaluate(e => e.tagName).catch(() => '');
      try {
        if (tag === 'SELECT') { const vs = await el.$$eval('option', o => o.map(x => x.value)); const cur = await el.inputValue(); const v = vs.find(x => x !== cur); if (v != null) await el.selectOption(v, { timeout: 1500 }); }
        else await el.click({ timeout: 1500 });
      } catch (e) { continue; }
      await sleep(350);
      // what the click opened: fill what asks for words, and send it
      const forms = await p.$$('form:visible');
      for (const f of forms.slice(0, 3)) {
        for (const inp of await f.$$('textarea:visible, input[type="text"]:visible, input:not([type]):visible')) await inp.fill('thử 123').catch(() => {});
        for (const inp of await f.$$('input[type="number"]:visible')) await inp.fill('5').catch(() => {});
        const go2 = await f.$('button[type="submit"]:visible, .btn-primary:visible');
        if (go2) { await go2.click({ timeout: 1200 }).catch(() => {}); await sleep(300); }
      }
      const prim = await p.$$('dialog[open] .btn-primary, .drawer[aria-hidden="false"] .btn-primary, [role="dialog"]:not([hidden]) .btn-primary');
      for (const x of prim.slice(0, 2)) { await x.click({ timeout: 1200 }).catch(() => {}); await sleep(250); }
      if (SAY.test(await toast())) said++;
      let d = diff(s0, await snap());
      if (d.length) { const all = await snap(true); d = d.map(x => x.split(' @')[0]).map(k => k + ' now: ' + String(all[k] || '(gone)').slice(0, 300)); leaks.push(name + ' · ' + what + ' :: ' + d.join(' | ')); console.log('   LEAK ' + name + ' · ' + what + '\n     ' + d.join('\n     ').slice(0, 600)); s0 = await snap(); }   // counted once: the rest goes on from here
    }
    console.log('   ' + name + ': ' + count + ' controls');
  }
  ok(tried > 150, 'controls tried on every screen: ' + tried + ' (' + said + ' said it is a sample)');
  ok(!leaks.length, 'nothing tried changed the sample', leaks);
  ok(said > 10, 'what was refused said it is a sample');
  ok(!errs.length, 'no script error', errs.slice(0, 5));
  // Clear sample data still takes it
  await p.click('.side [data-view="settings"]').catch(() => {}); await sleep(600);
  await p.click('#view-settings >> text=/Lưu trữ|Storage/').catch(() => {}); await sleep(600);
  await p.click('#xa-sample [data-xa="clear"]').catch(() => {}); await sleep(400);
  await p.click('#xa-sample [data-xa="clear-go"]').catch(() => {}); await sleep(3000); await p.waitForLoadState(); await sleep(1500);
  ok(!Object.keys(await snap()).length, 'Clear sample data still clears it');
  await b.close(); web.close();
  console.log('\n' + (n - fails) + '/' + n + (fails ? ' — FAILED' : ' — all passed')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
