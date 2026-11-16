// v72: the web app (app.scopedue.com, subdomains/app) asks to sign in on the first visit of a device, then remembers it
// (CONTRACT.md 33). api.php runs in test mode against a fresh MySQL database (php-server.js, as t_api70); the app's requests to
// https://scopedue.com/api/api.php are passed to it. The extension's page (scopedue_v68.html) does not ask.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_SCHEMA_DB as t_api70.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null, WEB = null, b = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'lan.anh@studio.example', PASS = 'a-long-pass-70';

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8099, db: 'sd_pwa_test' });
  const r0 = await srv.call(null, 'POST', '/v1/studios', { name: 'Lan Anh', email: EMAIL, password: PASS, password_confirm: PASS });
  const code = srv.lastTo(EMAIL).body.match(/\b\d{6}\b/)[0];
  ok((await srv.call(null, 'POST', '/v1/studios/verify', { challenge: r0.j.challenge, code })).s === 200, 'an account with a password on the server');
  WEB = await require('./serve')(ROOT);
  b = await chromium.launch();
  const errs = [];
  const ctxFor = async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    /* the app talks to scopedue.com's api.php: here it is the test server */
    await ctx.route(/^https:\/\/scopedue\.com\/api\/api\.php/, async r => {
      const q = r.request(), u = new URL(q.url());
      const res = await fetch(srv.api + u.search, { method: q.method(), headers: q.headers(), body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postData() });
      r.fulfill({ status: res.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: await res.text() });
    });
    return ctx;
  };
  const open = async (ctx, page) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(WEB.base + page); await sleep(1500); return p; };
  const vis = (p, s) => p.$eval(s, e => !e.closest('[hidden]') && e.offsetParent !== null).catch(() => false);

  // ================================================================ the web app, first visit on this device
  const ctx = await ctxFor();
  const A = await open(ctx, 'subdomains/app/index.html');
  ok(await vis(A, '#xa-lang'), 'the first visit starts with the language');
  await A.click('#xa-lgo'); await sleep(300);
  ok(await vis(A, '#xa-in') && !(await vis(A, '#xa-you')), 'then asks to sign in, before the name and the samples');
  ok(/Sign in to ScopeDue/.test(await A.$eval('#xa-in', e => e.innerText)), 'Sign in to ScopeDue, and why');
  await A.click('#xa-ingo'); await sleep(500);
  ok(await A.$eval('#drawer-sync', e => e.hasAttribute('data-open')) && await A.$eval('#xa-wl', e => e.hidden), 'Sign in opens the sign-in window; the welcome steps aside');
  await A.click('#drawer-sync [data-close]'); await sleep(400);
  ok(await vis(A, '#xa-in') && !(await A.$eval('#xa-wl', e => e.hidden)), 'closing it without signing in comes back to Sign in: there is no way past it');
  await A.click('#xa-ingo'); await sleep(500);
  await A.click('#sy-email-toggle'); await sleep(200);
  await A.fill('#sy-email', EMAIL); await A.fill('#sy-password', PASS);
  await A.click('#sy-send'); await sleep(2500);
  ok(await vis(A, '#xa-you') && !(await vis(A, '#xa-in')), 'signed in: the welcome goes on with the name and the samples');
  ok((await A.$eval('#xa-n', e => e.value)) === 'Lan Anh', 'the name is the account\'s', await A.$eval('#xa-n', e => e.value));
  await A.click('#xa-f input[name="s"][value="empty"]'); await A.click('#xa-f .xa-go'); await sleep(2500);
  ok(!(await A.$('#xa-wl')), 'into the app');
  const kept = await A.evaluate(() => { try { return JSON.parse(localStorage.getItem('sd-sync') || 'null'); } catch (e) { return null; } });
  ok(kept && /^sdk_/.test(kept.key) && kept.email === EMAIL, 'the sign-in is kept in this browser', kept && kept.email);

  // ================================================================ later visits
  await A.reload(); await sleep(1800);
  ok(!(await A.$('#xa-wl')), 'the next visit goes straight in: no language, no sign-in');
  await A.goto(WEB.base + 'subdomains/app/index.html'); await sleep(1800);
  ok(!(await A.$('#xa-wl')), 'and the one after');

  // ================================================================ signed out: asked again, only to sign in
  await A.evaluate(() => { localStorage.removeItem('sd-sync'); }); await A.reload(); await sleep(1800);
  ok(await vis(A, '#xa-in') && !(await A.$('#xa-lang')) && !(await A.$('#xa-you')), 'without a sign-in, a later visit only asks to sign in again');
  await A.click('#xa-ingo'); await sleep(500); await A.click('#sy-email-toggle').catch(() => {}); await sleep(200);
  await A.fill('#sy-email', EMAIL); await A.fill('#sy-password', PASS); await A.click('#sy-send'); await sleep(2500);
  ok(!(await A.$('#xa-wl')), 'signed in again: straight back to the app');
  await ctx.close();

  // ================================================================ the extension's page does not ask
  const ctx2 = await ctxFor();
  const E = await open(ctx2, 'scopedue_v68.html?welcome');
  await E.click('#xa-lgo'); await sleep(300);
  ok(await vis(E, '#xa-you') && !(await vis(E, '#xa-in')), 'the extension keeps its welcome as it was: no sign-in step');
  await ctx2.close();

  ok(!errs.length, 'no page errors', errs);
})().catch(e => { console.error(e); fails++; }).finally(async () => {
  if (b) await b.close(); if (WEB) WEB.close(); if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
