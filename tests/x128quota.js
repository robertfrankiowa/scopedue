// api.php 1.28.0 (CONTRACT 96): the New project drawer and Settings › Plan & billing with the month's client projects. A real
// api.php (as t_api128) on a fresh database and the stand-in Drive; the account already has 4 of its 5 places this month (3 places until CONTRACT 125).
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the page (scopedue_v68.html, scopedue-extension/app.html,
// subdomains/app/index.html); SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN for the server.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ME = 'robert@studio.example', TOK = 'ya29.rob128';
(async () => {
  process.env.SCOPEDUE_STRIPE_SECRET = 'sk_test_x128';   /* 1.31.1 (133): the rows written below are test mode rows, so the server is in test mode */
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8130, db: 'sd_x128' });
  const key = await srv.account('Robert', ME);
  for (const ref of ['older-one', 'older-two', 'older-three', 'older-four']) await srv.call(key, 'POST', '/v1/quota/claim', { k: 'own', ref });
  const WEB = await require('./serve')(ROOT), D = require('./standin-drive')({ [TOK]: ME });
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
  await ctx.route(/^https:\/\/(www\.googleapis\.com|oauth2\.googleapis\.com)\//, D.route);
  await ctx.addInitScript(([api, k, me]) => { try { if (!sessionStorage.getItem('x128')) { sessionStorage.setItem('x128', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: me, via: 'email' })); } } catch (e) {} }, [srv.api, key, ME]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(WEB.base + F + '?test'); await sleep(1500);
  const seeded = await p.evaluate(async () => {
    const cl = { id: 'nk', name: 'Nha khoa', contact: 'Lê Ngọc Hân', email: 'han@clinic.example', lang: 'en', people: [], status: 'current', portal: 'invited', projects: [], needs: [], act: [], log: [] };
    const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [{ k: 'client:nk', d: cl }], ord: { client: ['client:nk'], project: [] }, meta: {} }));
    if (!r.ok) return r.msg; await SDB.replaceAll(r.backup); return 'ok';
  });
  ok(seeded === 'ok', 'a client, no projects', seeded);
  await p.reload(); await sleep(1500);
  await p.evaluate(([t, e]) => window.__drv.token(t, e), [TOK, ME]);
  const has = id => p.evaluate(id => { try { return !!window.__drv.sync.data(id); } catch (e) { return false; } }, id);
  const qt = () => p.$eval('#npj-qt', e => e.hidden ? '' : e.innerText).catch(() => '');
  const open = async () => { await p.click('#npj-btn'); await sleep(700); await p.click('#npj-kinds [data-k="client"]'); await sleep(300); };
  const make = async name => { await p.fill('#npj-n', name); await p.selectOption('#npj-c', 'nk'); await p.click('#npj-go'); await sleep(1200); };

  await open();
  if (await p.$eval('#npj-gate', e => !e.hidden)) { await p.click('#npj-gate [data-drg="drive"]'); await sleep(900); }
  ok(await p.$eval('#npj-gate', e => e.hidden), 'signed in and Drive connected: no gate');
  await sleep(800);
  let t = await qt();
  ok(/last of the 5 new client projects/.test(t), 'with 4 of 5 used: the drawer says this is the last one this month', t);
  await p.click('#npj-kinds [data-k="private"]'); await sleep(200);
  ok(!(await qt()), 'a private project: nothing about the month');
  await p.click('#npj-kinds [data-k="client"]'); await sleep(300);
  await make('Acme site');
  ok(await has('acme-site'), 'the 5th client project is created');
  let q = (await srv.call(key, 'GET', '/v1/billing')).j.quota;
  ok(q.used === 5 && q.left === 0, 'the server counted it: 5 of 5', q);

  await open(); await sleep(600);
  t = await qt();
  ok(/started or joined 5 new client projects this month/.test(t) && /new month starts on 1 [A-Z][a-z]{2} \d{4}/.test(t), 'none left: the drawer says so before Create, with the day a new month starts', t);
  await make('Beta app');
  ok(!(await has('beta-app')), 'Create makes nothing: the 6th is refused');
  ok(await p.$eval('#drawer-npj', e => e.classList.contains('open') || !e.hidden || getComputedStyle(e).visibility !== 'hidden'), 'the drawer stays open');
  q = (await srv.call(key, 'GET', '/v1/billing')).j.quota;
  ok(q.used === 5, 'and the server took no place', q);
  await p.click('#npj-kinds [data-k="internal"]'); await sleep(200);
  await p.fill('#npj-n', 'Studio notes'); await p.click('#npj-go'); await sleep(1000);
  ok(await has('studio-notes'), 'a private project is still made at once');

  /* Settings › Plan & billing says the month */
  await p.keyboard.press('Escape'); await sleep(300);
  await p.click('.nav-i[data-view="settings"]'); await sleep(300); await p.click('#st-t-plan'); await sleep(1500);
  const plan = await p.$eval('#bl-body', e => e.innerText);
  ok(/This month\s+5 of 5 used/.test(plan) && /Next month starts\s+1 [A-Z][a-z]{2} \d{4}/.test(plan) && /started or joined 5 new client projects this month/.test(plan), 'Plan & billing: 5 of 5 used, when the next month starts, and why nothing new can start', plan);

  /* the paid plan: the drawer has no limit to tell */
  srv.my(['-e', `INSERT INTO api_billing(user_id, customer, sub, status, period_end, updated_at) SELECT id, 'cus_X', 'sub_X', 'active', ${Date.now() + 30 * 864e5}, ${Date.now()} FROM users WHERE email = '${ME}'`, srv.db]);
  await p.evaluate(() => window.__bl.pull()); await sleep(600);
  await open(); await sleep(600);
  ok(!(await qt()), 'paid: nothing about a limit above Create');
  await make('Beta app');
  ok(await has('beta-app'), 'paid: the 6th client project of the month is created');

  /* in Vietnamese: the month's words are all in vi.tsv */
  srv.my(['-e', `UPDATE api_billing SET status = 'canceled'`, srv.db]);
  await p.evaluate(() => { localStorage.setItem('sd.lang', 'vi'); localStorage.setItem('sd.i18ndebug', '1'); }); await p.reload(); await sleep(2500);
  await p.evaluate(([t, e]) => window.__drv.token(t, e), [TOK, ME]);
  await p.click('.nav-i[data-view="settings"]'); await sleep(300); await p.click('#st-t-plan'); await sleep(1500);
  const vi = await p.$eval('#bl-body', e => e.innerText);
  await open(); await sleep(800);
  const vq = await qt();
  const miss = await p.evaluate(() => window.__i18nMiss ? [...window.__i18nMiss.keys()].filter(k => /client project|month|plan|Upgrade|of 5/i.test(k)) : null);
  ok(/Tháng này\s+6 dự án khách hàng mới \(gói miễn phí có 5\)/.test(vi) && /tháng mới bắt đầu vào 1 thg \d+, \d{4}/.test(vi) && /tháng mới bắt đầu vào 1 thg/.test(vq), 'in Vietnamese: Plan & billing (6 this month, more than the free 5) and the drawer, the date too', [vi, vq]);
  ok(Array.isArray(miss) && !miss.length, 'no English left for these texts', miss);

  /* the site's admin account: no limits, nothing to pay (2026-11-09) */
  srv.my(['-e', `UPDATE users SET role = 'admin' WHERE email = '${ME}'`, srv.db]);
  await p.keyboard.press('Escape'); await sleep(300);
  await p.click('.nav-i[data-view="settings"]'); await sleep(300); await p.click('#st-t-plan'); await sleep(1500);
  const adm = await p.$eval('#bl-body', e => e.innerText), admPill = await p.$eval('#bl-pill', e => e.innerText);
  ok(/Tài khoản quản trị/.test(admPill) && /Không giới hạn, không cần trả phí/.test(adm) && !/Nâng cấp/.test(adm), 'admin account: Plan & billing says no limits, nothing to pay, no Upgrade', [admPill, adm]);
  await open(); await sleep(600);
  ok(!(await qt()), 'admin account: nothing about a limit above Create');
  await make('Gamma app');
  ok(await has('gamma-app'), 'admin account: a 5th client project this month is created');

  ok(!errs.length, 'no page errors', errs);
  await b.close(); WEB.close && WEB.close();
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
});
