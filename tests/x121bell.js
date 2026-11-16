// v121 (CONTRACT.md 90): the Viewer portal's bell, and emails between the Owner and a Viewer, as between a studio and its client. The
// app and portal.scopedue.com against a real api.php 1.25.0 on a fresh database: an internal project with Hà as a Viewer and an item in
// Now. The portal has a bell with nothing unread. The Owner asks Hà to check: Hà is emailed (in Vietnamese, the project's language),
// with a link, and her bell has it unread. Hà sends a request and reports a bug: the Owner is emailed for each, by what it is, and the
// words are not in the email. The Owner puts the request in the Parking Lot and marks the bug fixed: Hà hears both in one email, and
// her bell has them. The same publish again emails nothing more. Mark all read empties the badge, and a click on a note goes to it.
// F: the app's page (scopedue_v68.html, or subdomains/app/index.html). SD_PLAYWRIGHT, and the php-server.js settings.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HA = 'thu.ha@hr.example', OWNER = 'robert@studio.example';

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8121, db: 'sd_bell121', files: ['api.php', F, 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const b = await chromium.launch(), errs = [];
  const to = who => S.mails().filter(m => m.to === who);
  try {
    const key = await S.account('Robert', OWNER);
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k, em]) => { try { if (!sessionStorage.getItem('x121')) { sessionStorage.setItem('x121', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: em, via: 'email' })); } } catch (e) {} }, [S.api, key, OWNER]);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push('app: ' + e.message));
    await A.goto(S.base + F + '?test'); await sleep(1200);
    await A.click('.nav-i[data-view="projects"]'); await sleep(250); await A.click('#npj-btn'); await sleep(400);
    await A.fill('#npj-n', 'HR Companion'); await A.click('#npj-kinds [data-k="internal"]'); await sleep(150);
    await A.click('#npj-l [data-f="vi"]');
    await A.click('#npj-go'); await sleep(900);
    const PID = await A.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
    await A.evaluate(id => { location.hash = '#pj-' + id + '-scope'; }, PID); await sleep(600);
    await A.click('#pd-panel [data-pd="prv:gate"][data-m="add"]'); await sleep(500);
    await A.fill('#gate-t', 'Nhập nhân viên từ Excel');
    await A.check('#gate input[name="ship"][value="need"]', { force: true }); await A.check('#gate input[name="size"][value="M"]', { force: true });
    const viol = await A.$('#gate input[name="viol"][value="none"]'); if (viol) await viol.check({ force: true });
    await sleep(300); await A.click('#gate-go'); await sleep(700);
    const added = await A.evaluate(([id, ha]) => window.__drv.sync.add(id, { n: 'Phạm Thu Hà', e: ha, role: 'Viewer', c: '#3d5a8f', seen: '' }), [PID, HA]);
    ok(!!PID && added, 'an internal project with an item in Now and Hà as a Viewer', { PID, added });
    await sleep(1200); await A.evaluate(id => { location.hash = '#pj-' + id + '-feedback'; }, PID); await A.reload(); await sleep(1500);
    await A.waitForSelector('#pd-tab-feedback', { timeout: 8000 }); await A.click('#pd-tab-feedback'); await sleep(400);
    if (await A.$('[data-pd="vp:open"]')) { await A.click('[data-pd="vp:open"]'); await sleep(1200); }
    const push = async () => { await A.evaluate(id => window.__vp.push(id), PID); await sleep(1200); };
    const pull = async () => { await A.evaluate(() => window.__vp.pull()); await sleep(1500); };
    const out = async () => (await A.evaluate(id => window.__x8.out(id), PID)).fb || [];
    await A.click('[data-pd="vp:inv"][data-e="' + HA + '"]'); await sleep(1200);
    const inv = to(HA), link = inv.length && (inv[inv.length - 1].body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/) || [])[0];
    ok(inv.length === 1 && !!link, 'Hà gets one email: her invitation', inv.map(m => m.subject));

    // ---------------------------------------------------------------- the portal's bell, nothing yet
    const vc = await b.newContext({ viewport: { width: 1280, height: 900 } }), V = await vc.newPage();
    V.on('pageerror', e => errs.push('portal: ' + e.message));
    for (let i = 0; i < 4; i++) { await V.goto(link, { waitUntil: 'commit' }).catch(() => {}); if (await V.waitForSelector('#vw-bell:not([hidden])', { timeout: 8000 }).then(() => true, () => false)) break; } await sleep(500);
    const badge = () => V.$eval('#vw-bdg', e => e.getAttribute('data-n')).catch(() => 'none');
    /* php -S on Windows sometimes holds a request behind an idle keep-alive socket for half a minute: a reload that has not painted in
       8 s is tried again (the page itself is not what waits) */
    const reload = async () => { for (let i = 0; i < 4; i++) { await V.reload({ waitUntil: 'commit' }).catch(() => {}); if (await V.waitForSelector('#vw-bell:not([hidden])', { timeout: 8000 }).then(() => true, () => false)) break; } await sleep(500); };
    ok(await V.$eval('#vw-bell', e => !e.hidden) && (await badge()) === '0', 'the portal has a bell, with nothing unread', await badge());
    await V.click('#vw-bell'); await sleep(200);
    ok(await V.$eval('#vw-notif', e => !e.hidden) && /Không có gì mới|All caught up/.test(await V.$eval('#vw-notif', e => e.innerText)), 'it opens on nothing new', await V.$eval('#vw-notif', e => e.innerText));
    await V.keyboard.press('Escape'); await sleep(200);
    ok(await V.$eval('#vw-notif', e => e.hidden), 'Esc closes it');

    // ---------------------------------------------------------------- the Owner asks Hà to check: Hà is emailed, and her bell has it
    await A.click('[data-pd="fb:chk"]'); await sleep(300);
    await A.fill('#fb-ku', 'https://staging.example.com/import'); await A.click('.fb-chkf button[type="submit"]'); await sleep(500);
    await push();
    let hm = to(HA);
    ok(hm.length === 2 && /nhờ bạn kiểm tra|asks you to check/.test(hm[1].subject) && /#k=sdm_/.test(hm[1].body) && /Nhập nhân viên từ Excel/.test(hm[1].body), 'asked to check: Hà is emailed, with what and a link', hm.slice(1).map(m => [m.subject, m.body.slice(0, 300)]));
    await push();
    ok(to(HA).length === 2, 'publishing the same again emails nothing more');
    await reload();
    ok((await badge()) === '1', 'her bell has 1 unread', await badge());
    await V.click('#vw-bell'); await sleep(200);
    const nt = await V.$eval('#vw-nl', e => e.innerText);
    ok(/Mời bạn kiểm tra|Please check/.test(nt) && /Nhập nhân viên từ Excel/.test(nt), 'the note says what to check', nt);

    // ---------------------------------------------------------------- Hà sends: the Owner is emailed for each, without her words
    const before = to(OWNER).length;
    await V.keyboard.press('Escape');
    await V.$eval('#vw-f input[name="k"][value="req"]', i => i.closest('label').click()); await sleep(200); await V.fill('#vw-f textarea[name="t"]', 'Lọc người chưa xác nhận theo chi nhánh');
    await V.click('#vw-f button[type="submit"]'); await sleep(1500);
    await V.$eval('#vw-f input[name="k"][value="bug"]', i => i.closest('label').click()); await sleep(200); await V.fill('#vw-f textarea[name="t"]', 'Mã 0001 thành 1 khi nhập');
    await V.click('#vw-f button[type="submit"]'); await sleep(1500);
    const om = to(OWNER).slice(before);
    ok(om.length === 2 && /sent a request|đã gửi một yêu cầu/.test(om[0].subject) && /reported a problem|đã báo lỗi/.test(om[1].subject), 'the Owner gets one email for each, by what it is', om.map(m => m.subject));
    ok(om.every(m => !/Lọc người|0001/.test(m.body)), 'and her words are not in them');

    // ---------------------------------------------------------------- the Owner moves both on: Hà hears both in one email
    await pull();
    let fb = await out(); const rq = fb.find(e => e.k === 'req'), bg = fb.find(e => e.k === 'bug');
    ok(rq && bg, 'both are in the app', fb.map(e => e.k));
    /* v121 (91): the Owner's bell has them too */
    await A.evaluate(() => { document.getElementById('bell').click(); }); await sleep(500);
    const ab = await A.$$eval('#notif .n-item', a => a.map(x => x.getAttribute('data-nk') + ' | ' + x.innerText.replace(/\s+/g, ' ')));
    ok(ab.some(x => /^fbv:/.test(x) && /Hà sent a request/.test(x)) && ab.some(x => /^fbv:/.test(x) && /Hà reported a problem/.test(x)), 'the Owner’s bell: Hà sent a request, Hà reported a problem', ab);
    await A.keyboard.press('Escape'); await sleep(200);
    await A.click('.fb-r[data-id="' + rq.id + '"]'); await sleep(300); await A.click('[data-pd="fb:park"][data-id="' + rq.id + '"]'); await sleep(500);
    await A.click('.fb-r[data-id="' + bg.id + '"]'); await sleep(300); await A.click('[data-pd="fb:fixed"][data-id="' + bg.id + '"]'); await sleep(500);
    await push();
    hm = to(HA).slice(2);
    const all = hm.map(m => m.subject + ' ' + m.body).join(' ');
    ok(hm.length >= 1 && hm.length <= 2 && /Đã ghi nhận|Noted/.test(all) && /Đã sửa, mời bạn kiểm tra|Fixed, please check/.test(all) && (hm.length === 2 || /2 cập nhật|2 updates/.test(hm[0].subject)), 'Hà hears both, noted and fixed to check (one email per publish)', hm.map(m => m.subject));
    ok(hm.every(m => !/ScopeDue user/.test(m.body)), 'in the Owner’s name, never the account’s placeholder', hm.map(m => m.body.slice(0, 120)));
    await push();
    ok(to(HA).length === 2 + hm.length, 'and nothing again on the next publish');
    await reload();
    ok((await badge()) === '3', 'her bell has 3 unread now', await badge());
    // a click on a note goes where it is
    await V.click('#vw-bell'); await sleep(200);
    const fix = await V.$('#vw-nl [data-nk^="s|"][data-nk$="|fixed"]');
    ok(!!fix, 'the fixed bug is a note', await V.$eval('#vw-nl', e => e.innerText));
    if (fix) { await fix.click(); await sleep(400); }
    ok((await badge()) === '2' && await V.$eval('#vw-notif', e => e.hidden), 'clicking it reads it and closes the bell', await badge());
    await V.click('#vw-bell'); await sleep(200); await V.click('#vw-nmark'); await sleep(200);
    ok((await badge()) === '0', 'Mark all read empties the badge');
    await reload();
    ok((await badge()) === '0', 'and stays read after a reload');
    // it still does not work, then fixed again: Hà hears it again
    const n0 = to(HA).length;
    const nfb = await V.$('.vw-turn [data-nf]');
    ok(!!nfb, 'the fixed bug waits in her Your turn', !nfb && await V.$eval('#vw-turn', e => e.innerText).catch(() => 'no turn'));
    if (nfb) { await nfb.click(); await sleep(300); await V.fill('.vw-ask textarea', 'Mã 00012 vẫn mất số 0'); await V.click('.vw-ask button[type="submit"]'); await sleep(1500); }
    await pull(); await push();
    const bug2 = (await out()).find(e => e.k === 'bug');
    await A.click('.fb-r[data-id="' + bug2.id + '"]'); await sleep(300); await A.click('[data-pd="fb:fixed"][data-id="' + bug2.id + '"]'); await sleep(500);
    await push();
    const again = to(HA).slice(n0);
    ok(again.length === 1 && /Đã sửa, mời bạn kiểm tra|Fixed, please check/.test(again[0].subject), 'fixed again after she said it still did not work: she hears it again, once', again.map(m => m.subject));
    await reload();
    ok((await badge()) === '1', 'and her bell has it unread again', await badge());
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { console.error('ERR', String(e.message).split(String.fromCharCode(10))[0]); fails++; }
  finally { await b.close(); S.stop && S.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
