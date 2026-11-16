// v119 (CONTRACT.md 87): an internal project has no Validate tab. Its open questions and sources are on Decisions, where the
// decisions that answer them point at them. A new internal project through New project: its tabs, Decisions with Open questions and
// Sources, a question and a source added there, Activity's lane named Sources and its link back to Decisions, an old link to its
// Validate landing on Decisions, Editors kept from them when Decisions is hidden, Make it a product and back, a product unchanged,
// Vietnamese. No server, no sample.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the page (scopedue_v68.html, scopedue-extension/app.html, or the PWA).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
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
  const text = sel => p.$eval(sel, e => e.innerText).catch(() => '');
  const tabs = () => p.$$eval('#pd-tabs .pd-tab', a => a.map(x => x.getAttribute('data-tab')));
  const cur = () => p.$eval('#pd-tabs .pd-tab[aria-selected="true"]', e => e.getAttribute('data-tab')).catch(() => '');
  const open = async (id, tab) => { await p.evaluate(([i, t]) => { location.hash = '#pj-' + i + '-' + t; }, [id, tab]); await sleep(600); };
  const make = async (name, kind) => {
    await p.click('.nav-i[data-view="projects"]'); await sleep(250); await p.click('#npj-btn'); await sleep(400);
    await p.fill('#npj-n', name); await p.click('#npj-kinds [data-k="' + kind + '"]'); await sleep(150); await p.click('#npj-go'); await sleep(900);
    return p.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
  };
  const menu = async m => { await p.click('#pd-more'); await sleep(250); await p.click('#pd-menu [data-m="' + m + '"]'); await sleep(600); };

  // ================================================================ a new internal project: no Validate
  const IID = await make('HR Companion', 'internal');
  ok(!!IID, 'New project makes an internal project', IID);
  ok((await tabs()).join() === 'workspace,scope,decisions,history', 'Internal: Overview, Scope, Decisions, Activity; no Validate', await tabs());

  // ================================================================ Decisions holds the open questions and the sources
  await open(IID, 'decisions');
  const de = await text('#pd-panel');
  ok(/what you still need to find out, and the sources you rely on/.test(de) && /Open questions/.test(de) && /Sources/.test(de) && /Principles/i.test(de), 'Decisions: its description, Principles, Open questions and Sources', de.slice(0, 900));
  ok(!(await p.$('#pd-panel [data-pd="prv:jnew"]')) && !/Channels|Competitors|Gap check|research/i.test(de), 'nothing of a product’s market', de);
  await p.fill('#prv-a-q', 'PWA first, or a native app for the pilot?'); await p.press('#prv-a-q', 'Enter'); await sleep(500);
  ok(/PWA first, or a native app for the pilot\?/.test(await text('#pd-panel')) && (await cur()) === 'decisions', 'an open question is added, on Decisions');
  await p.click('#pd-panel [data-pd="prv:srcadd"]'); await sleep(500);
  await p.fill('#msrc-t', 'Interview · head of HR'); await p.fill('#msrc-u', 'https://example.com/interview'); await p.fill('#msrc-x', 'A day a month goes on splitting and sending payslips.'); await sleep(700);
  await p.click('#msrc-go'); await sleep(800);
  const de2 = await text('#pd-panel');
  ok((await cur()) === 'decisions' && /Interview · head of HR/.test(de2) && /\[1\]/.test(de2), 'Add source saves it as [1] and stays on Decisions', de2.slice(0, 900));

  // ================================================================ Activity
  await open(IID, 'history');
  const act = await text('#pd-panel');
  ok(/You added source \[1\] · Interview · head of HR/.test(act) && /You added an open question: PWA first, or a native app for the pilot\?/.test(act), 'Activity lists the source and the question', act.slice(0, 900));
  const lanes = await p.$$eval('#pd-panel .prv-evo, #pd-panel [data-lane], #pd-panel .prv-ln', a => a.map(x => x.innerText).join(' | '));
  ok(/Sources/.test(act) && !/\bMarket\b/.test(act), 'its lane is called Sources, not Market', lanes || act.slice(0, 600));
  const go = await p.$('#pd-panel [data-pd="prv:hgo"][data-n="1"]');
  ok(!!go && (await go.getAttribute('data-tab')) === 'decisions', 'the source’s line links to Decisions', go && await go.getAttribute('data-tab'));
  if (go) { await go.click(); await sleep(700); }
  ok((await cur()) === 'decisions' && !!(await p.$('#pd-panel .prv-src[data-n="1"]')), 'and opens Decisions with the source', await cur());

  // ================================================================ an old link to its Validate
  await open(IID, 'workspace'); await open(IID, 'market');
  ok((await cur()) === 'decisions', 'a link to the internal project’s Validate opens Decisions', await cur());

  // ================================================================ Editors: hiding Decisions hides the questions and the sources
  const v0 = await p.evaluate(id => window.__drv && window.__drv.sync && window.__drv.sync.view ? window.__drv.sync.view(id, null) : null, IID);
  const v1 = await p.evaluate(id => window.__drv.sync.view(id, { decisions: 1 }), IID);
  ok(!!v0 && v0.pv.src.length === 1 && v0.pv.asm.q.length === 1, 'Editors get the questions and sources with Decisions shown', v0 && { src: v0.pv.src.length, q: v0.pv.asm.q });
  ok(!!v1 && v1.pv.src.length === 0 && !(v1.pv.asm.q || []).length && !(v1.pv.dec || []).length, 'and neither with Decisions hidden', v1 && { src: v1.pv.src.length, q: v1.pv.asm.q });

  // ================================================================ Make it a product and back
  await menu('mode');
  ok((await tabs())[1] === 'market', 'Make it a product: Validate comes back second', await tabs());
  await open(IID, 'decisions');
  ok(!/Open questions/.test(await text('#pd-panel')), 'and Decisions has no Open questions then');
  await menu('mode');
  await open(IID, 'decisions');
  const de3 = await text('#pd-panel');
  ok(!(await tabs()).includes('market') && /PWA first, or a native app for the pilot\?/.test(de3) && /Interview · head of HR/.test(de3), 'back to internal: no Validate, the question and source still there', await tabs());

  // ================================================================ a product is unchanged
  const PID = await make('Plant swap app', 'private');
  ok((await tabs())[1] === 'market', 'a new product keeps Validate second', await tabs());
  await open(PID, 'market');
  ok(!!(await p.$('#pd-panel [data-pd="prv:jnew"]')), 'its Validate is the product one (Add job)');
  await open(PID, 'decisions');
  ok(!/Open questions/.test(await text('#pd-panel')), 'its Decisions has no Open questions');
  const pv = await p.evaluate(id => window.__drv.sync.view(id, { decisions: 1 }), PID);
  ok(!!pv && Array.isArray(pv.pv.src), 'a product’s sources are not tied to Decisions for Editors', pv && pv.pv.src);

  // ================================================================ Vietnamese
  await p.evaluate(() => localStorage.setItem('sd.lang', 'vi')); await p.reload(); await sleep(1500);
  await open(IID, 'decisions');
  const vv = await text('#pd-panel');
  ok(/Câu hỏi còn mở/.test(vv) && /những gì bạn còn phải tìm hiểu, và các nguồn bạn dựa vào/.test(vv) && /Nguồn/.test(vv), 'Decisions in Vietnamese', vv.slice(0, 700));
  await open(IID, 'history');
  ok(/Nguồn/.test(await text('#pd-panel')) && !/Thị trường/.test(await text('#pd-panel')), 'the lane in Vietnamese: Nguồn', (await text('#pd-panel')).slice(0, 500));

  ok(!errs.length, 'no page errors', errs);
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  await b.close(); WEB.close && WEB.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); console.error(errs); process.exit(1); });
