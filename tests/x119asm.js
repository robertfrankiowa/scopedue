// v119 (CONTRACT.md 89): a line of Open questions (and of a product's wedge and risks) longer than 90 characters is said, not cut.
// The field used to stop at 90 (maxlength), so a pasted question was saved cut short without a word. Now it takes the whole paste,
// counts once you are near 90, and Add refuses a longer one with the count, keeping what was typed. An internal project through New
// project; English, then Vietnamese. No server.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the page (scopedue_v68.html, scopedue-extension/app.html, or the PWA).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sd-first')) { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_testrob', email: 'robert@studio.example', via: 'email' })); } } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(HTTP + F + '?test'); await sleep(1500);
  await p.click('.nav-i[data-view="projects"]'); await sleep(250); await p.click('#npj-btn'); await sleep(400);
  await p.fill('#npj-n', 'HR Companion'); await p.click('#npj-kinds [data-k="internal"]'); await sleep(150); await p.click('#npj-go'); await sleep(900);
  const ID = await p.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
  const open = async () => { await p.evaluate(i => { location.hash = '#pj-' + i + '-decisions'; }, ID); await sleep(600); };
  const qs = () => p.$$eval('#pd-panel .prv-asl li span', a => a.map(x => x.textContent));
  const count = () => p.$eval('#prv-a-q-n', e => ({ hidden: e.hidden, t: e.textContent, over: e.classList.contains('over') }));
  const err = () => p.$eval('#prv-a-q', i => i.closest('form').querySelector('.err').textContent).catch(() => '');
  await open();

  const LONG = 'Does finance need the payroll export as Excel, as CSV, or both, and who signs off on the format before the pilot?';
  ok(LONG.length > 90, 'a question of ' + LONG.length + ' characters');
  await p.click('#prv-a-q'); await p.keyboard.insertText('Short one');
  ok((await count()).hidden, 'no count while far from 90');
  await p.fill('#prv-a-q', ''); await p.click('#prv-a-q'); await p.keyboard.insertText(LONG);
  ok((await p.inputValue('#prv-a-q')) === LONG, 'the whole paste is kept in the field (it was cut at 90)', await p.inputValue('#prv-a-q'));
  let c = await count();
  ok(!c.hidden && c.t === LONG.length + ' / 90' && c.over, 'the count shows ' + LONG.length + ' / 90, marked over', c);
  await p.press('#prv-a-q', 'Enter'); await sleep(400);
  ok(/At most 90 characters: this one has \d+\. Make it shorter\./.test(await err()) && !(await qs()).length, 'Add refuses it with the count, and nothing is added', { err: await err(), qs: await qs() });
  ok((await p.inputValue('#prv-a-q')) === LONG, 'what was typed stays to be shortened');
  const FIT = LONG.slice(0, 88) + '?';
  await p.fill('#prv-a-q', FIT); c = await count();
  ok(!c.hidden && !c.over && c.t === '89 / 90', 'near 90 the count shows, not marked', c);
  await p.press('#prv-a-q', 'Enter'); await sleep(500);
  ok((await qs()).includes(FIT), 'a question of 89 characters is added whole', await qs());
  ok((await count()).hidden, 'and the count goes with the emptied field');

  // Vietnamese
  await p.evaluate(() => localStorage.setItem('sd.lang', 'vi')); await p.reload(); await sleep(1500); await open();
  await p.click('#prv-a-q'); await p.keyboard.insertText('Câu hỏi rất dài để thử giới hạn chín mươi ký tự của ô câu hỏi còn mở trong tab Quyết định của dự án nội bộ HR');
  await p.press('#prv-a-q', 'Enter'); await sleep(400);
  ok(/Tối đa 90 ký tự: câu này có \d+ ký tự\. Hãy viết ngắn hơn\./.test(await err()), 'in Vietnamese', await err());

  ok(!errs.length, 'no page errors', errs);
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  await b.close(); WEB.close && WEB.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); console.error(errs); process.exit(1); });
