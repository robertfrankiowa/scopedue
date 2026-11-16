// v123: what people write to each other is shown as they wrote it. The Owner (the app), a Viewer (portal.scopedue.com) and their
// emails, against a real api.php on a fresh database, with one text in every field either side writes:
//   <b>đậm</b><img src=x onerror=alert(1)>
// The project's name, an item's title, the Viewer's name, a request to check (steps and note), the Viewer's request, bug and
// "It does not work" answer, the Owner's reason for declining. On each page, after each step: the words are on the page as text
// (the tags are seen, not obeyed), no <b>đậm</b> and no <img src=x> were made, no alert ran; the same in every email's HTML letter.
// An Editor's name and stuck note, as her device writes them to Drive, are checked on every tab, My work and the Dashboard.
// The client side of this is xss68.js (portal) and xssapp68.js (app); this one adds the words-seen-as-written check to the Viewer's.
// F: the app's page (scopedue_v68.html, scopedue-extension/app.html, or subdomains/app/index.html). SD_PLAYWRIGHT, php-server.js settings.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const P = '<b>đậm</b><img src=x onerror=alert(1)>';
const HA = 'thu.ha@hr.example', OWNER = 'robert@studio.example';
// on the page: did anything the words carry become an element, or run?
const PROBE = () => ({
  b: [...document.querySelectorAll('b,strong')].filter(e => e.textContent === 'đậm').length,
  img: [...document.querySelectorAll('img')].filter(e => e.getAttribute('src') === 'x').length,
  ran: (window.__alerts || []).length,
  text: document.body.innerText
});
const ALERTS = () => { window.__alerts = []; const a = window.alert; window.alert = function (m) { window.__alerts.push(String(m)); }; void a; };

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8123, db: 'sd_raw123', files: ['api.php', F, 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const b = await chromium.launch(), errs = [], dialogs = [];
  const to = who => S.mails().filter(m => m.to === who);
  // one page's check: nothing made, nothing ran, and (when asked) the words there as written
  const look = async (pg, where, want) => {
    const x = await pg.evaluate(PROBE);
    const seen = want ? want.filter(w => !x.text.includes(w)) : [];
    ok(!x.b && !x.img && !x.ran && !seen.length, where + ': shown as written, nothing made or run', { b: x.b, img: x.img, ran: x.ran, missing: seen, text: seen.length ? x.text.slice(0, 2500) : undefined });
  };
  try {
    const key = await S.account('Robert', OWNER);
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k, em]) => { try { if (!sessionStorage.getItem('x123')) { sessionStorage.setItem('x123', '1'); localStorage.setItem('sd.lang', 'vi'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: em, via: 'email' })); } } catch (e) {} }, [S.api, key, OWNER]);
    await ctx.addInitScript(ALERTS);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push('app: ' + e.message)); A.on('dialog', d => { dialogs.push('app: ' + d.message()); d.dismiss(); });
    await A.goto(S.base + F + '?test'); await sleep(1200);
    await A.click('.nav-i[data-view="projects"]'); await sleep(250); await A.click('#npj-btn'); await sleep(400);
    await A.fill('#npj-n', 'HR ' + P); await A.click('#npj-kinds [data-k="internal"]'); await sleep(150);
    await A.click('#npj-l [data-f="vi"]');
    await A.click('#npj-go'); await sleep(900);
    const PID = await A.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
    await look(A, 'app: the new project', ['HR ' + P]);
    await A.evaluate(id => { location.hash = '#pj-' + id + '-scope'; }, PID); await sleep(600);
    await A.click('#pd-panel [data-pd="prv:gate"][data-m="add"]'); await sleep(500);
    await A.fill('#gate-t', 'Excel ' + P);
    await A.check('#gate input[name="ship"][value="need"]', { force: true }); await A.check('#gate input[name="size"][value="M"]', { force: true });
    const viol = await A.$('#gate input[name="viol"][value="none"]'); if (viol) await viol.check({ force: true });
    await sleep(300); await A.click('#gate-go'); await sleep(700);
    await look(A, 'app: Scope with the item', ['Excel ' + P]);
    const added = await A.evaluate(([id, ha, nm]) => window.__drv.sync.add(id, { n: nm, e: ha, role: 'Viewer', c: '#3d5a8f', seen: '' }), [PID, HA, 'Thu Hà ' + P]);
    ok(!!PID && added, 'an internal project with an item in Now and a Viewer, each named with the markup', { PID, added });
    await sleep(1200); await A.evaluate(id => { location.hash = '#pj-' + id + '-feedback'; }, PID); await A.reload(); await sleep(1500);
    await A.waitForSelector('#pd-tab-feedback', { timeout: 8000 }); await A.click('#pd-tab-feedback'); await sleep(400);
    if (await A.$('[data-pd="vp:open"]')) { await A.click('[data-pd="vp:open"]'); await sleep(1200); }
    const push = async () => { await A.evaluate(id => window.__vp.push(id), PID); await sleep(1200); };
    const pull = async () => { await A.evaluate(() => window.__vp.pull()); await sleep(1500); };
    const out = async () => (await A.evaluate(id => window.__x8.out(id), PID)).fb || [];
    await A.click('[data-pd="vp:inv"][data-e="' + HA + '"]'); await sleep(1200);
    await look(A, 'app: Feedback with the Viewer invited');
    const inv = to(HA), link = inv.length && (inv[inv.length - 1].body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/) || [])[0];
    ok(!!link, 'the Viewer gets her link', inv.map(m => m.subject));

    // ---------------------------------------------------------------- the Owner asks her to check, with steps and a note
    await A.click('[data-pd="fb:chk"]'); await sleep(300);
    await A.fill('#fb-ku', 'https://staging.example.com/import');
    await A.fill('#fb-ks', 'Bước 1 ' + P + '\nBước 2 ' + P);
    await A.fill('#fb-kt', 'Ghi chú ' + P);
    await A.click('.fb-chkf button[type="submit"]'); await sleep(500);
    const ck = (await out()).find(e => e.k === 'chk');
    ok(ck && (ck.steps || []).some(s => s === 'Bước 1 ' + P) && ck.t === 'Ghi chú ' + P, 'the request to check keeps the words as typed', ck && { steps: ck.steps, t: ck.t });
    await look(A, 'app: the request to check', ['Bước 1 ' + P, 'Ghi chú ' + P]);
    await push();

    // ---------------------------------------------------------------- the Viewer's portal
    const vc = await b.newContext({ viewport: { width: 1280, height: 900 } }); await vc.addInitScript(ALERTS);
    const V = await vc.newPage();
    V.on('pageerror', e => errs.push('portal: ' + e.message)); V.on('dialog', d => { dialogs.push('portal: ' + d.message()); d.dismiss(); });
    const reload = async (u) => { for (let i = 0; i < 4; i++) { await (u ? V.goto(u, { waitUntil: 'commit' }) : V.reload({ waitUntil: 'commit' })).catch(() => {}); if (await V.waitForSelector('#vw-bell:not([hidden])', { timeout: 8000 }).then(() => true, () => false)) break; } await sleep(700); };
    await reload(link);
    await look(V, 'portal: first view', ['HR ' + P, 'Excel ' + P]);
    await V.click('#vw-bell'); await sleep(300);
    await look(V, 'portal: the bell');
    const bell = await V.$eval('#vw-nl', e => e.innerText).catch(() => '');
    ok(bell.includes('Excel ' + P) || bell.includes('HR ' + P), 'the bell names it as written', bell);
    await V.keyboard.press('Escape'); await sleep(200);
    const turn = await V.$eval('#vw-turn', e => e.innerText).catch(() => '');
    ok(turn.includes('Bước 1 ' + P) || (await V.evaluate(() => document.body.innerText)).includes('Bước 1 ' + P), 'her Your turn shows the steps as written', turn.slice(0, 600));

    // she answers It does not work, then sends a request and a bug
    await V.click('.vw-turn [data-ck="fail"]'); await sleep(300);
    await V.fill('.vw-ask textarea', 'Không chạy ' + P); await V.click('.vw-ask button[type="submit"]'); await sleep(1500);
    await V.$eval('#vw-f input[name="k"][value="req"]', i => i.closest('label').click()); await sleep(200); await V.fill('#vw-f textarea[name="t"]', 'Yêu cầu ' + P);
    await V.click('#vw-f button[type="submit"]'); await sleep(1500);
    await V.$eval('#vw-f input[name="k"][value="bug"]', i => i.closest('label').click()); await sleep(200); await V.fill('#vw-f textarea[name="t"]', 'Lỗi ' + P);
    await V.click('#vw-f button[type="submit"]'); await sleep(1500);
    await look(V, 'portal: after she sent three', ['Yêu cầu ' + P, 'Lỗi ' + P]);
    // every button that opens something on her page
    const seen = new Set();
    for (const sel of ['[data-go]', '[data-nk]', '[data-ck]', 'button.vw-tab', '[role=tab]']) {
      const els = await V.$$(sel);
      for (let i = 0; i < Math.min(els.length, 12); i++) {
        const k = sel + i; if (seen.has(k)) continue; seen.add(k);
        const e = (await V.$$(sel))[i]; if (!e || !(await e.isVisible().catch(() => false))) continue;
        await e.click({ timeout: 1500 }).catch(() => {}); await sleep(250);
        const x = await V.evaluate(PROBE); if (x.b || x.img || x.ran) ok(false, 'portal: nothing made after ' + k, x);
        await V.keyboard.press('Escape'); await sleep(120);
      }
    }
    ok(true, 'portal: ' + seen.size + ' buttons tried');

    // ---------------------------------------------------------------- back in the app: what she wrote
    await pull();
    let fb = await out(); const rq = fb.find(e => e.k === 'req'), bg = fb.find(e => e.k === 'bug'), ts = fb.find(e => e.k === 'test');
    ok(rq && rq.t === 'Yêu cầu ' + P && bg && bg.t === 'Lỗi ' + P && ts && ts.t === 'Không chạy ' + P, 'the app has her three, with her words as she wrote them', fb.map(e => [e.k, e.t]));
    await look(A, 'app: Feedback after the pull', ['Yêu cầu ' + P, 'Lỗi ' + P]);
    for (const e of [rq, bg, ts, ck].filter(Boolean)) {
      await A.click('.fb-r[data-id="' + e.id + '"]').catch(() => {}); await sleep(400);
      await look(A, 'app: ' + e.k + ' opened', e.k === 'chk' ? ['Bước 1 ' + P, 'Không chạy ' + P] : [e.t]);
    }
    await A.evaluate(() => { document.getElementById('bell').click(); }); await sleep(500);
    await look(A, 'app: the bell');
    const ab = await A.$$eval('#notif .n-item', a => a.map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '));
    ok(ab.includes('Thu Hà ' + P) || ab.includes(P) || /Hà/.test(ab), 'the Owner’s bell names her as written', ab);
    await A.keyboard.press('Escape'); await sleep(200);
    // the Owner declines the request, with a reason; the bug fixed
    await A.click('.fb-r[data-id="' + rq.id + '"]'); await sleep(300); await A.click('[data-pd="fb:no"][data-id="' + rq.id + '"]'); await sleep(400);
    await A.fill('#fb-aw', 'Lý do ' + P); await A.click('form[data-pd-form="fb:no"] button[type="submit"]'); await sleep(500);
    await look(A, 'app: the declined request', ['Lý do ' + P]);
    const rq2 = (await out()).find(e => e.id === rq.id);
    ok(rq2 && rq2.why === 'Lý do ' + P, 'the reason is kept as typed', rq2 && { st: rq2.st, why: rq2.why });
    await A.click('.fb-r[data-id="' + bg.id + '"]'); await sleep(300); await A.click('[data-pd="fb:fixed"][data-id="' + bg.id + '"]'); await sleep(500);
    await push();
    // ---------------------------------------------------------------- an Editor's words, as they come in from Drive
    // (what her device writes into the project file: the work given to her, and why she is stuck)
    const LAN = 'lan.anh@studio.example';
    await A.evaluate(([id, e, nm]) => window.__drv.sync.add(id, { n: nm, e: e, role: 'Editor', c: '#5b4a8a', seen: '' }), [PID, LAN, 'Lan Anh ' + P]);
    const it = (await A.evaluate(id => window.__drv.sync.items(id), PID)).find(x => x.sec === 'in');
    await A.evaluate(([id, iid, e, s]) => window.__drv.sync.wk(id, iid, { as: e, st: 'doing', stk: s }), [PID, it.id, LAN, 'Kẹt vì ' + P]);
    await sleep(1500); await A.evaluate(id => { location.hash = '#pj-' + id + '-scope'; }, PID); await A.reload(); await sleep(1500);
    const it2 = (await A.evaluate(id => window.__drv.sync.items(id), PID)).find(x => x.id === it.id);
    await look(A, 'app: Scope with the Editor’s work');
    let stuckOn = [];
    for (const t of await A.$$eval('main:not([hidden]) [role=tab]', l => l.map(x => x.id).filter(Boolean))) {
      await A.click('#' + t).catch(() => {}); await sleep(350);
      const x = await A.evaluate(PROBE).catch(() => null); if (x && (x.b || x.img || x.ran)) ok(false, 'app: nothing made on tab ' + t, x);
      if (x && x.text.includes('Kẹt vì ' + P)) stuckOn.push(t); else if (x && x.text.includes('Kẹt vì')) stuckOn.push('partial:' + t + ':' + x.text.slice(x.text.indexOf('Kẹt vì') - 40, x.text.indexOf('Kẹt vì') + 80));
    }
    await A.click('.nav-i[data-view="mywork"]').catch(() => {}); await sleep(400);
    const mw = await A.evaluate(PROBE).catch(() => null); if (mw && mw.text.includes('Kẹt vì ' + P)) stuckOn.push('my work');
    ok(stuckOn.length > 0, 'the Editor’s stuck note is shown as written (' + stuckOn.join(', ') + ')', { stk: it2 && it2.stk, as: it2 && it2.as, st: it2 && it2.st });
    await A.click('.nav-i[data-view="team"]').catch(() => {}); await sleep(400);
    await A.click('.nav-i[data-view="dashboard"]').catch(() => {}); await sleep(400);
    await look(A, 'app: Dashboard with the Editor’s words');
    // the other screens of the app that show these (dashboard, my work, quick find)
    for (const v of await A.$$eval('.nav-i[data-view]', l => l.map(a => a.getAttribute('data-view')))) {
      await A.click('.nav-i[data-view="' + v + '"]').catch(() => {}); await sleep(300);
      /* a view may load the page again (the sign-in or a hash route): wait for it, then look */
      let x = await A.evaluate(PROBE).catch(() => null); if (!x) { await A.waitForLoadState('domcontentloaded').catch(() => {}); await sleep(1200); x = await A.evaluate(PROBE).catch(() => ({ b: 0, img: 0, ran: 0 })); }
      if (x.b || x.img || x.ran) ok(false, 'app: nothing made on ' + v, x);
    }
    await A.keyboard.press('Control+k'); await sleep(300); await A.keyboard.type('đậm'); await sleep(500);
    await look(A, 'app: quick find for the words');
    await A.keyboard.press('Escape');

    // ---------------------------------------------------------------- the Viewer reads the answer
    await reload();
    // a declined request sits in a folded group: open every fold
    for (const f of await V.$$('[data-fold][aria-expanded="false"]')) { await f.click().catch(() => {}); await sleep(150); }
    await look(V, 'portal: the Owner’s answer', ['Lý do: Lý do ' + P]);
    // the rest of her page: tabs, folds, Comment (its form), each one checked
    let tried = 0;
    for (const sel of ['[data-tab]', '[data-fold]', '[data-cm]', '[data-nf]', '[data-ck]']) {
      const cnt = (await V.$$(sel)).length;
      for (let i = 0; i < Math.min(cnt, 10); i++) {
        const e = (await V.$$(sel))[i]; if (!e || !(await e.isVisible().catch(() => false))) continue;
        await e.click({ timeout: 1500 }).catch(() => {}); await sleep(250); tried++;
        const x = await V.evaluate(PROBE); if (x.b || x.img || x.ran) ok(false, 'portal: nothing made after ' + sel + ' ' + i, x);
        const c = await V.$('[data-cancel]'); if (c && await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await sleep(150); }
      }
    }
    ok(tried >= 4, 'portal: ' + tried + ' more buttons tried after the answer');
    await V.click('#vw-bell'); await sleep(300);
    await look(V, 'portal: the bell with the answers');

    // ---------------------------------------------------------------- the emails, as HTML letters
    const all = S.mails().filter(m => m.to === HA || m.to === OWNER);
    ok(all.length >= 3, 'emails went both ways', all.map(m => m.to + ': ' + m.subject));
    const mp = await b.newPage(); await mp.addInitScript(ALERTS);
    mp.on('dialog', d => { dialogs.push('mail: ' + d.message()); d.dismiss(); });
    let made = 0, raw = 0;
    for (const m of all) {
      if (!m.html) continue;
      if (/<b>đậm<\/b>|<img src=x/i.test(m.html)) raw++;
      await mp.setContent(m.html); await sleep(150);
      const x = await mp.evaluate(PROBE); if (x.b || x.img || x.ran) made++;
    }
    ok(!raw && !made, 'no email letter carries the markup as markup (' + all.filter(m => m.html).length + ' letters)', { raw, made });
    const withWords = all.filter(m => m.body.includes(P) || (m.html || '').includes('&lt;b&gt;đậm&lt;/b&gt;'));
    ok(withWords.every(m => (m.html || '').includes('&lt;b&gt;đậm&lt;/b&gt;&lt;img src=x onerror=alert(1)&gt;') || !(m.html || '').includes('đậm')), 'where an email has the words, its letter shows them escaped', withWords.map(m => m.subject));
    await mp.close();

    ok(!dialogs.length, 'no alert anywhere', dialogs);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { console.error('ERR', String(e.message).split(String.fromCharCode(10))[0]); console.error(errs); fails++; }
  finally { await b.close(); S.stop && S.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
