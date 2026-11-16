// v125 (CONTRACT.md 99): a sample never syncs. The Vietnamese sample loaded through the welcome (My own projects) by someone
// signed in to ScopeDue: the product's Team tab shows its Team sync card, naming Hà and Tuấn, with Turn on team sync locked
// (disabled, a lock, a line that says why) and no sync action on it; its menu holds only what looks (no Keep in Google Drive,
// teammate, kind, language or delete); and nothing it does reaches the server's sync routes or Google: no team room, no Viewer
// portal push, no Drive call. A real project's Team sync names people by what they are called (Hà, not Phạm).
// SD_PLAYWRIGHT; F: the app pages (comma-separated; all by default).
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const PJ = 'app-cham-cong-hr', SB = 'quan-ly-doi-xe-giao-hang-sao-bac-logistics', VL = 'venli';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ok   ' : '  FAIL ') + m + (c || x === undefined ? '' : ' :: ' + String(x).slice(0, 500))); if (!c) fails++; };
(async () => {
  const web = await require('./serve')(ROOT);
  const base = web.base.slice(0, -1);
  const b = await pw.chromium.launch();
  for (const F of (process.env.F || 'scopedue_v68.html,scopedue-extension/app.html,subdomains/app/index.html').split(',')) {
    console.log('\n== ' + F);
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    const sync = [];
    await ctx.route(/scopedue\.com|googleapis\.com/, r => {
      const u = r.request().url();
      if (/googleapis\.com\/(drive|upload)|\/v1\/(rooms|rpush|vprojects|dvnudge|invites)/.test(u) && r.request().method() !== 'GET') sync.push(r.request().method() + ' ' + u.replace(/[?&]key=[^&]*/, ''));
      if (/googleapis\.com\/(drive|upload)/.test(u)) sync.push(r.request().method() + ' ' + u.split('?')[0]);
      r.fulfill({ status: 503, body: '' });
    });
    /* the web app signs in before its welcome; the page and the extension sign in after the sample is in, then open again */
    const SIGN = () => { try { localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } catch (e) {} };
    if (/subdomains/.test(F)) await ctx.addInitScript(fn => { try { if (!sessionStorage.getItem('x125')) { sessionStorage.setItem('x125', '1'); eval('(' + fn + ')')(); } } catch (e) {} }, SIGN.toString());
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + '/' + F); await sleep(1500);
    if (await p.isVisible('#xa-lang').catch(() => false)) { await p.check('input[name="lg"][value="vi"]', { force: true }); await p.click('#xa-lgo'); await sleep(1500); }
    await p.fill('#xa-n', 'Kim Lê');
    await p.check('input[name="w"][value="own"]', { force: true }); await p.check('input[name="s"][value="sample"]', { force: true });
    await p.click('#xa-f .xa-go'); await sleep(3500); await p.waitForLoadState(); await sleep(2000);
    if (!/subdomains/.test(F)) { await p.evaluate(SIGN); await p.reload(); await sleep(2500); }
    ok(/kim@studio\.example/.test(await p.$eval('.user', e => e.innerText).catch(() => '')), 'signed in to ScopeDue (team sync could start)');
    const before = await p.evaluate(() => SDB.exportAll().then(x => JSON.stringify(x.ent.filter(e => e.k.indexOf('project:') === 0).map(e => { const d = Object.assign({}, e.d); ['lv', 'lvs', 'upd', 'updT', 'glance', 'local', 'gaps', 'open'].forEach(k => delete d[k]); return d; }))));
    await p.goto(base + '/' + F + '#pj-' + PJ + '-team'); await p.reload(); await sleep(2200);
    ok(await p.getAttribute('#pd-tab-team', 'aria-selected').catch(() => '') === 'true', 'the product opens on Team');
    const card = await p.$eval('#pd-panel .x8-c', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    const lock = await p.$eval('#pd-panel .x8-c .x8-f button', b => ({ dis: b.disabled, pd: b.getAttribute('data-pd'), lock: !!b.querySelector('use[href="#i-lock"]') })).catch(() => null);
    ok(/Hà và Tuấn|Hà and Tuấn/.test(card) && !/Phạm/.test(card), 'Team: the Team sync card is there, with Hà and Tuấn', card.slice(0, 160));
    ok(lock && lock.dis && !lock.pd && lock.lock && /không bao giờ được đồng bộ|never synced/.test(card), 'Turn on team sync is locked, and the card says why', JSON.stringify(lock) + ' ' + card.slice(-120));
    await p.$eval('#pd-panel .x8-c .x8-f button', b => b.click()).catch(() => {}); await sleep(600);
    ok(!(await p.evaluate(() => SDB.exportAll().then(x => /"x8":/.test(JSON.stringify(x))))), 'a click on it does nothing');
    await p.click('#pd-more'); await sleep(300);
    const menu = await p.$$eval('[role="menu"] [data-m]', l => l.filter(x => x.offsetParent).map(x => x.getAttribute('data-m')));
    ok(menu.length && menu.every(m => /^(copy|team|export|back)$/.test(m)), 'the menu holds only what looks', menu.join(','));
    await p.keyboard.press('Escape');
    ok(!(await p.$('[data-pd^="x8:"], [data-pd^="dv:"], [data-pd^="vp:"], [data-m="dv"]')), 'no sync button anywhere on the product');
    for (const t of ['feedback', 'workspace']) { await p.goto(base + '/' + F + '#pj-' + PJ + '-' + t); await p.reload(); await sleep(2000); }
    ok(!(await p.$('[data-pd^="x8:"], [data-pd^="dv:"], [data-pd^="vp:"]')), 'Feedback and Overview: no portal or Drive button either');
    /* v128 (103): the client project with a team (Sao Bắc: Bảo, Nam, Mai Anh, made on Google Drive) has no way to sync either */
    await p.goto(base + '/' + F + '#pj-' + SB + '-team'); await p.reload(); await sleep(2200);
    const sbCard = await p.$eval('#pd-panel .x8-c', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    const sbLock = await p.$eval('#pd-panel .x8-c .x8-f button', b => ({ dis: b.disabled, pd: b.getAttribute('data-pd') })).catch(() => null);
    ok(sbLock && sbLock.dis && !sbLock.pd && /không bao giờ được đồng bộ|never synced/.test(sbCard), 'Sao Bắc, Team: Turn on team sync is locked, the card says why', JSON.stringify(sbLock) + ' ' + sbCard.slice(-160));
    for (const t of ['team', 'workspace', 'change', 'delivery']) {
      await p.goto(base + '/' + F + '#pj-' + SB + '-' + t); await p.reload(); await sleep(1800);
      /* the page, outside the project's menu (a closed menu holds the first draw; it is drawn again as it opens, below) */
      const hits = await p.$$eval('[data-pd^="x8:"], [data-pd^="dv:"], [data-pd^="vp:"], [data-m="dv"], #pd-panel .dv-c', l => l.filter(x => !x.closest('[role="menu"]')).map(x => (x.getAttribute('data-pd') || x.getAttribute('data-m') || x.className) + ' “' + x.textContent.trim().slice(0, 40) + '”'));
      ok(!hits.length, 'Sao Bắc, ' + t + ': no sync or Google Drive button, no Drive card', hits.join(' | '));
    }
    await p.click('#pd-more'); await sleep(300);
    const sbMenu = await p.$$eval('[role="menu"] [data-m]', l => l.filter(x => x.offsetParent).map(x => x.getAttribute('data-m')));
    ok(sbMenu.length && sbMenu.every(m => /^(copy|team|client|back)$/.test(m)), 'Sao Bắc, its menu holds only what looks: copy, team, client page, back', sbMenu.join(','));
    await p.keyboard.press('Escape');
    /* v129 (105): the product with a team (Venli: Bảo, Anh, Trúc, made on Google Drive) has no way to sync either */
    await p.goto(base + '/' + F + '#pj-' + VL + '-team'); await p.reload(); await sleep(2200);
    const vlCard = await p.$eval('#pd-panel .x8-c', e => e.innerText.replace(/s+/g, ' ')).catch(() => '');
    const vlLock = await p.$eval('#pd-panel .x8-c .x8-f button', b => ({ dis: b.disabled, pd: b.getAttribute('data-pd') })).catch(() => null);
    ok(vlLock && vlLock.dis && !vlLock.pd && /không bao giờ được đồng bộ|never synced/.test(vlCard), 'Venli, Team: Turn on team sync is locked, the card says why', JSON.stringify(vlLock) + ' ' + vlCard.slice(-160));
    for (const t of ['team', 'workspace', 'scope', 'market']) {
      await p.goto(base + '/' + F + '#pj-' + VL + '-' + t); await p.reload(); await sleep(1800);
      const hits = await p.$$eval('[data-pd^="x8:"], [data-pd^="dv:"], [data-pd^="vp:"], [data-m="dv"], #pd-panel .dv-c', l => l.filter(x => !x.closest('[role="menu"]')).map(x => (x.getAttribute('data-pd') || x.getAttribute('data-m') || x.className) + ' “' + x.textContent.trim().slice(0, 40) + '”'));
      ok(!hits.length, 'Venli, ' + t + ': no sync or Google Drive button, no Drive card', hits.join(' | '));
    }
    await p.click('#pd-more'); await sleep(300);
    const vlMenu = await p.$$eval('[role="menu"] [data-m]', l => l.filter(x => x.offsetParent).map(x => x.getAttribute('data-m')));
    ok(vlMenu.length && vlMenu.every(m => /^(copy|team|export|back)$/.test(m)), 'Venli, its menu holds only what looks', vlMenu.join(','));
    await p.keyboard.press('Escape');
    await sleep(12000);   /* the portal publishes every 8 s, Drive rounds and the pulse run: none of it may take the sample */
    const after = await p.evaluate(() => SDB.exportAll().then(x => JSON.stringify(x.ent.filter(e => e.k.indexOf('project:') === 0).map(e => { const d = Object.assign({}, e.d); ['lv', 'lvs', 'upd', 'updT', 'glance', 'local', 'gaps', 'open'].forEach(k => delete d[k]); return d; }))));
    ok(!sync.length, 'nothing went to team sync, the Viewer portal or Google Drive', sync.join(' | '));
    ok(before === after && !/"dv":|"x8":/.test(after), 'the sample has no Drive or team sync record, and did not change');
    ok(!errs.length, 'no script error', errs.join(' | '));
    await ctx.close();
  }
  // a real project: team sync names its people by what they are called
  {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } }), p = await ctx.newPage();
    await ctx.route(/scopedue\.com|googleapis\.com/, r => r.fulfill({ status: 503, body: '' }));
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('x125b')) { sessionStorage.setItem('x125b', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } } catch (e) {} });
    await p.goto(base + '/scopedue_v68.html?test'); await sleep(1500);
    await p.click('.nav-i[data-view="projects"]'); await sleep(250); await p.click('#npj-btn'); await sleep(400);
    await p.fill('#npj-n', 'HR'); await p.click('#npj-kinds [data-k="internal"]'); await sleep(150); await p.click('#npj-go'); await sleep(900);
    const id = await p.evaluate(() => { const m = /#pj-(.+)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
    await p.evaluate(id => { window.__drv.sync.add(id, { n: 'Phạm Thu Hà', e: 'ha@x.example', role: 'Editor', c: '#3d5a8f', seen: '' }); window.__drv.sync.add(id, { n: 'Lê Minh Tuấn', e: 'tuan@x.example', role: 'Editor', c: '#8f3d5a', seen: '' }); }, id);
    await sleep(800); await p.evaluate(id => { location.hash = '#pj-' + id + '-team'; }, id); await p.reload(); await sleep(1800);
    const h = await p.$eval('#pd-panel .x8-c', e => e.innerText).catch(() => '');
    ok(/Hà and Tuấn/.test(h) && !/Phạm|Lê and/.test(h), 'a real project’s Team sync: “with Hà and Tuấn”', h.slice(0, 200));
    await ctx.close();
  }
  await b.close(); web.close && web.close();
  console.log(fails ? '\n' + fails + ' failed' : '\nall ok');
  process.exit(fails ? 1 : 0);
})();
