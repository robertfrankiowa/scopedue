// v121 (CONTRACT.md 91): the Owner and an Editor of a project kept in Google Drive hear of each other as team sync's people did:
// the bell has the work notes (assigned to you, waiting for your review, sent back, approved) on a Drive project too, and after a write
// to Drive what this person did that is someone else's to act on goes to POST /v1/dvnudge, with the folder, the address, the kind and
// the project's name. Only what this person did: the Owner gives work, sends it back, approves it; the one who has it sends it for
// review or says they wait on someone. The first write only takes note. Viewers' feedback taken by the Owner's device is told to the
// Editors. The bell also has what Viewers sent. The server is stood in for (its answers are recorded). No Drive is used.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the page (scopedue_v68.html, scopedue-extension/app.html, or the PWA).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROB = 'robert@studio.example', TUAN = 'tuan@hr.example', HA = 'thu.ha@hr.example', FID = '1AbCdEfGhIjKlMnOp_q-r';
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const sent = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/^https:\/\/scopedue\.com\//, r => {
    const u = r.request().url();
    if (/dvnudge/.test(u) && r.request().method() === 'POST') { sent.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, body: '{"sent":true}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }); }
    return r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  });
  await ctx.addInitScript(([em]) => { try { if (!localStorage.getItem('sd-first')) { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_testrob', email: em, via: 'email' })); } } catch (e) {} }, [ROB]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(HTTP + F + '?test'); await sleep(1500);
  await p.click('.nav-i[data-view="projects"]'); await sleep(250); await p.click('#npj-btn'); await sleep(400);
  await p.fill('#npj-n', 'HR Companion'); await p.click('#npj-kinds [data-k="internal"]'); await sleep(150); await p.click('#npj-go'); await sleep(900);
  const ID = await p.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
  await p.evaluate(id => { location.hash = '#pj-' + id + '-scope'; }, ID); await sleep(600);
  await p.click('#pd-panel [data-pd="prv:gate"][data-m="add"]'); await sleep(500);
  await p.fill('#gate-t', 'Nhập nhân viên từ Excel');
  await p.check('#gate input[name="ship"][value="need"]', { force: true }); await p.check('#gate input[name="size"][value="M"]', { force: true });
  const viol = await p.$('#gate input[name="viol"][value="none"]'); if (viol) await viol.check({ force: true });
  await sleep(300); await p.click('#gate-go'); await sleep(700);
  const H = (fn, ...a) => p.evaluate(([fn, a]) => window.__drv.sync[fn](...a), [fn, a]);
  await H('add', ID, { n: 'Lê Minh Tuấn', e: TUAN, role: 'Editor', c: '#3d5a8f', seen: '' });
  await H('dvset', ID, { fid: FID, owner: ROB, pid: 'pX', st: 'ok' });
  const IID = (await H('items', ID))[0].id;
  ok(!!ID && !!IID, 'an internal project in Drive, with Tuấn as an Editor and an item in Now', { ID, IID });
  const D = { fid: FID, owner: ROB };
  const step = async (f, role, me) => { if (f) await H('wk', ID, IID, f); sent.length = 0; snap = await H('nudge', ID, D, snap, role, me); await sleep(300); return sent.slice(); };
  let snap = null, s;
  s = await step(null, 'Owner'); ok(s.length === 0 && snap && snap[IID], 'the first write takes note and sends nothing', s);
  s = await step({ as: 'Lê Minh Tuấn', st: 'todo' }, 'Owner');
  ok(s.length === 1 && s[0].to === TUAN && s[0].kind === 'assigned' && s[0].fid === FID && s[0].project === 'HR Companion', 'the Owner gives Tuấn the work: Tuấn is told, with the folder and the project', s);
  s = await step(null, 'Owner'); ok(s.length === 0, 'nothing again with nothing changed', s);
  s = await step({ rb: { ts: Date.now(), why: 'Thiếu cột chi nhánh' } }, 'Owner'); ok(s.length === 1 && s[0].kind === 'back' && s[0].to === TUAN, 'sent back to Tuấn', s);
  s = await step({ ap: { ts: Date.now() }, st: 'done' }, 'Owner'); ok(s.length === 1 && s[0].kind === 'approved' && s[0].to === TUAN, 'approved: Tuấn is told', s);
  // the Editor's side: the same project as Tuấn's device would hold it
  await H('wk', ID, IID, { ap: null, rb: null, st: 'doing', as: 'You' }); snap = await H('nudge', ID, D, null, 'Editor', TUAN);
  s = await step({ st: 'review' }, 'Editor', TUAN); ok(s.length === 1 && s[0].kind === 'review' && s[0].to === ROB, 'Tuấn sends it for review: the Owner is told', s);
  s = await step({ st: 'doing', stk: 'Chờ file mẫu', by: { k: 'p', ref: ROB } }, 'Editor', TUAN); ok(s.length === 1 && s[0].kind === 'waiting' && s[0].to === ROB, 'Tuấn says he waits on the Owner: the Owner is told', s);
  s = await step({ ap: { ts: Date.now() } }, 'Editor', TUAN); ok(s.length === 0, 'what only the Owner does is never sent from an Editor’s device', s);
  s = await step({ as: 'Lê Minh Tuấn', stk: null, by: null }, 'Owner', ROB); ok(s.every(x => x.to !== ROB), 'never to oneself', s);
  // Viewers' feedback taken by the Owner's device: the Editors are told
  sent.length = 0; await H('tell', ID); await sleep(300);
  ok(sent.length === 1 && sent[0].kind === 'feedback' && sent[0].to === TUAN, 'Viewers sent feedback: Tuấn is told', sent);
  // the bell: the work notes on a Drive project (here the Owner: waiting for review)
  await H('wk', ID, IID, { as: 'Lê Minh Tuấn', st: 'review', ap: null, rb: null, stk: null, by: null });
  await p.evaluate(() => { document.getElementById('bell').click(); }); await sleep(500);
  const bell = await p.$$eval('#notif .n-item', a => a.map(x => x.getAttribute('data-nk') + ' | ' + x.innerText.replace(/\s+/g, ' ')));
  ok(bell.some(x => /^x8rv:/.test(x) && /Waiting for your review/.test(x)), 'the Owner’s bell: Waiting for your review, on a project kept in Drive', bell);
  ok(!errs.length, 'no page errors', errs);
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  await b.close(); WEB.close && WEB.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); console.error(errs); process.exit(1); });
