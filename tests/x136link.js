// api.php 1.31.4 (CONTRACT 136): a portal link is only emailed to the client. In the app, every Copy portal link is Email portal
// link: the client page's button and its link row, the project's client card; the approval panel has Email link only. Pressing it
// emails the client (read back from the outbox), says so, and logs it; the studio's clipboard never gets a link. A real api.php on
// a fresh database (php-server.js), the English sample's Maple Ridge Dental project on the portal.
// SD_PLAYWRIGHT; F= the single file, the extension's app.html or the PWA (subdomains/app/index.html); SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROB = 'robert@studio.example', PID = 'website-booking-maple-ridge-dental', CID = 'maple-ridge-dental', SARAH = 'sarah@mapleridgedental.example';
(async () => {
  const dir = path.dirname(F), files = ['api.php', 'samples'].concat(dir === '.' ? [F] : [dir]);
  const S = await require('./php-server')({ root: ROOT, port: 8137, db: 'sd_link136', files });
  const b = await chromium.launch();
  const sql = q => S.my([S.db, '-N', '-e', q]).toString().trim();
  try {
    const key = await S.account('Robert', ROB), slug = sql('SELECT slug FROM api_studios LIMIT 1');
    await S.call(key, 'PUT', '/v1/clients/' + CID, { name: 'Maple Ridge Dental', contact: 'Sarah Chen', email: SARAH });
    ok((await S.call(key, 'PUT', '/v1/projects/' + PID, { client: CID, name: 'Website & booking' })).s === 201, 'the project is on the portal');

    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k, sl, w]) => { try { if (!sessionStorage.getItem('x136')) { sessionStorage.setItem('x136', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, slug: sl, email: w, via: 'email' })); } } catch (e) {} }, [S.api, key, slug, ROB]);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto(S.base + F + '?test'); await sleep(1500);
    const seeded = await A.evaluate(async ([pid, cid, sl, mail]) => {
      const w = await (await fetch('/samples/workspace.en.json')).json();
      const pe = w.ent.filter(e => e.k === 'project:' + pid)[0], ce = w.ent.filter(e => e.k === 'client:' + cid)[0];
      pe.d.sy = { on: true, slug: sl }; ce.d.email = mail;
      w.ent = [pe, ce]; w.ord = { project: ['project:' + pid], client: ['client:' + cid] }; w.meta = {};
      const r = SDB.parseBackup(JSON.stringify(w)); if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
    }, [PID, CID, slug, SARAH]);
    ok(seeded === 'ok', 'the app has the project, on the portal', seeded);
    await A.reload(); await sleep(1800);
    await A.evaluate(() => navigator.clipboard.writeText('nothing yet')).catch(() => {});

    /* the client page */
    await A.evaluate(id => window.__sy.open(id), CID); await sleep(900);
    const top = await A.$eval('.cd-acts [data-cd="copy"]', e => e.textContent.trim()).catch(() => '');
    const row = await A.$eval('.cd-dl .lk', e => e.textContent.trim()).catch(() => '');
    const aria = await A.$eval('.cd-dl [data-cd="copy"]', e => e.getAttribute('aria-label')).catch(() => '');
    ok(top === 'Email portal link' && row === 'Private link, emailed only to them' && aria === 'Email portal link', 'the client page says Email portal link, and the link row says it is only emailed', [top, row, aria]);
    ok(!(await A.$$eval('button', bs => bs.some(b => /Copy portal link|Copy link$/.test(b.textContent.trim())))), 'no button offers to copy a portal link');
    const m0 = S.mails().length;
    await A.click('.cd-acts [data-cd="copy"]'); await sleep(1800);
    const sent = S.mails().slice(m0);
    ok(sent.length === 1 && sent[0].to === SARAH && /#s=[a-z0-9]+&k=sdl_/.test(sent[0].body), 'pressing it emails the link to Sarah', sent.map(m => m.to));
    const toast = await A.$eval('#toast, .toast', e => e.textContent).catch(() => '');
    ok(/Link emailed to Sarah/.test(toast), 'and says so', toast);
    const clip = await A.evaluate(() => navigator.clipboard.readText()).catch(() => 'nothing yet');
    ok(!/sdl_/.test(clip), 'nothing with a token reached the clipboard', clip);

    /* the project's client card */
    await A.evaluate(id => { location.hash = '#pj-' + id + '-workspace'; }, PID); await A.reload(); await sleep(1800);
    const card = await A.$('#pd-panel [data-pd="clcopy"]');
    const cardTxt = await A.$eval('#pd-panel .pdc-link', e => e.innerText.trim()).catch(() => '');
    ok(!!card && (await card.getAttribute('aria-label')) === 'Email portal link' && /emailed only to them/.test(cardTxt), 'the project\'s client card: Email portal link', [cardTxt, card && await card.getAttribute('aria-label')]);
    const m1 = S.mails().length;
    if (card) { await card.click(); await sleep(1800); }
    ok(S.mails().slice(m1).filter(m => m.to === SARAH).length === 1, 'it emails Sarah too');
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'crashed: ' + (e && e.stack || e)); }
  finally { await b.close(); S.stop(); console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0); }
})();
