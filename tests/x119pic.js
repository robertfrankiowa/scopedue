// v119 (CONTRACT.md 89): a Viewer who says a request to check does not work can add pictures to that answer, on the portal, as on
// Tell them; the two keep their own pictures. The app and portal.scopedue.com against a real api.php on a fresh database: an internal
// project with one Viewer and an item in Now with Done when lines; Ask to check; the Viewer's portal: It works has no place for
// pictures, It does not work has one, a picture added there and one left in Tell them; the answer goes with its picture only; in the
// app the Fail test result has it, and Open a bug carries it to the bug.
// F: the app's page (scopedue_v68.html, or subdomains/app/index.html). SD_PLAYWRIGHT, and the php-server.js settings.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HA = 'thu.ha@hr.example';
// a 2×2 PNG, red
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANBQEBd8XbVQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8119, db: 'sd_pic119', files: ['api.php', F, 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const b = await chromium.launch(), errs = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x119pic-')), p1 = path.join(dir, 'loi-o-gop.png'), p2 = path.join(dir, 'gop-y.png');
  fs.writeFileSync(p1, PNG); fs.writeFileSync(p2, PNG);
  try {
    const key = await S.account('Robert', 'robert@studio.example');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k]) => { try { if (!sessionStorage.getItem('x119')) { sessionStorage.setItem('x119', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: 'robert@studio.example', via: 'email' })); } } catch (e) {} }, [S.api, key]);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push('app: ' + e.message));
    await A.goto(S.base + F + '?test'); await sleep(1200);
    const sleepy = ms => sleep(ms);
    await A.click('.nav-i[data-view="projects"]'); await sleepy(250); await A.click('#npj-btn'); await sleepy(400);
    await A.fill('#npj-n', 'HR Companion'); await A.click('#npj-kinds [data-k="internal"]'); await sleepy(150); await A.click('#npj-go'); await sleepy(900);
    const PID = await A.evaluate(() => { const m = /#pj-([^-].*?)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
    // an item in Now, through the Gate
    await A.evaluate(id => { location.hash = '#pj-' + id + '-scope'; }, PID); await sleepy(600);
    await A.click('#pd-panel [data-pd="prv:gate"][data-m="add"]'); await sleepy(500);
    await A.fill('#gate-t', 'Nhập nhân viên từ Excel');
    await A.check('#gate input[name="ship"][value="need"]', { force: true }); await A.check('#gate input[name="size"][value="M"]', { force: true });
    const viol = await A.$('#gate input[name="viol"][value="none"]'); if (viol) await viol.check({ force: true });
    await sleepy(300); await A.click('#gate-go'); await sleepy(700);
    // Hà as a Viewer (the stand-in for Add people, which needs Google Drive)
    const added = await A.evaluate(([id, ha]) => window.__drv && window.__drv.sync && window.__drv.sync.add(id, { n: 'Phạm Thu Hà', e: ha, role: 'Viewer', c: '#3d5a8f', seen: '' }), [PID, HA]);
    ok(!!PID && added, 'an internal project with an item in Now and Hà as a Viewer', { PID, added });
    await sleep(1200); await A.evaluate(id => { location.hash = '#pj-' + id + '-feedback'; }, PID); await A.reload(); await sleep(1500);
    await A.waitForSelector('#pd-tab-feedback', { timeout: 8000 }); await A.click('#pd-tab-feedback'); await sleep(400);
    if (await A.$('[data-pd="vp:open"]')) { await A.click('[data-pd="vp:open"]'); await sleep(1200); }
    const out = async () => (await A.evaluate(id => window.__x8.out(id), PID)).fb || [];
    await A.click('[data-pd="fb:chk"]'); await sleep(300);
    await A.fill('#fb-ku', 'https://staging.example.com/import'); await A.click('.fb-chkf button[type="submit"]'); await sleep(500);
    const ck = (await out()).find(e => e.k === 'chk');
    ok(ck && ck.st === 'open' && ck.fr[0] === HA, 'Ask to check: a request to Hà about the item', ck);

    // ---------------------------------------------------------------- the portal
    await A.click('[data-pd="vp:inv"][data-e="' + HA + '"]'); await sleep(1200);
    const mail = S.lastTo(HA), link = mail && (mail.body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/) || [])[0];
    ok(!!link, 'Hà gets her link', mail && mail.body.slice(0, 200));
    const vc = await b.newContext({ viewport: { width: 1280, height: 900 } }), V = await vc.newPage();
    V.on('pageerror', e => errs.push('portal: ' + e.message));
    const sent = []; V.on('request', r => { if (/v1\/vsend/.test(r.url()) && r.method() === 'POST') sent.push(JSON.parse(r.postData() || '{}')); });
    await V.goto(link); await sleep(1800);
    ok(!!(await V.$('.vw-turn [data-ck="fail"]')), 'her Your turn has the request, with It does not work');
    // a picture left in Tell them, which must stay there
    await V.setInputFiles('#vw-f input[name="pics"]', p2); await sleep(800);
    ok((await V.$$('#vw-pics .vw-pic')).length === 1, 'a picture waits in Tell them');
    await V.click('.vw-turn [data-ck="pass"]'); await sleep(300);
    ok(!(await V.$('.vw-ask .vw-drop')), 'It works asks for no pictures');
    await V.click('.vw-ask [data-cancel]'); await sleep(300);
    await V.click('.vw-turn [data-ck="fail"]'); await sleep(300);
    const box = await V.$('.vw-ask #vw-adrop');
    ok(!!box && /Add pictures/.test(await V.$eval('.vw-ask', e => e.innerText)), 'It does not work has its own place for pictures', box && await V.$eval('.vw-ask', e => e.innerText));
    await V.setInputFiles('.vw-ask input[name="apics"]', p1); await sleep(800);
    ok((await V.$$('#vw-apics .vw-pic')).length === 1 && (await V.$$('#vw-pics .vw-pic')).length === 1, 'one picture there, and Tell them still has its own', { a: (await V.$$('#vw-apics .vw-pic')).length, t: (await V.$$('#vw-pics .vw-pic')).length });
    // × takes it out, and it can be added again
    await V.click('#vw-apics [data-unpic="0"]'); await sleep(200);
    ok((await V.$$('#vw-apics .vw-pic')).length === 0 && (await V.$$('#vw-pics .vw-pic')).length === 1, '× takes out only that one');
    await V.setInputFiles('.vw-ask input[name="apics"]', p1); await sleep(800);
    await V.fill('.vw-ask textarea', 'Bước 2: file có ô gộp thì báo lỗi dòng 1.'); await V.click('.vw-ask button[type="submit"]'); await sleep(1800);
    const ans = sent.find(x => x.k === 'test');
    const pics = ans && (ans.files ? ans.files.length : ans.enc ? 'sealed' : 0);
    ok(ans && ans.on === ck.id && ans.res === 'fail' && (pics === 1 || pics === 'sealed'), 'the answer goes with its picture', ans && { on: ans.on, res: ans.res, files: ans.files && ans.files.length, enc: !!ans.enc, f: ans.enc && ans.enc.f });
    ok((await V.$$('#vw-pics .vw-pic')).length === 1, 'and the picture in Tell them is still there, not sent');

    // ---------------------------------------------------------------- the app
    await A.evaluate(() => window.__vp.pull()); await sleep(1500);
    let fb = await out(); const t = fb.find(e => e.k === 'test' && e.res === 'fail');
    ok(t && (t.pics || []).length === 1 && /^data:image\//.test(t.pics[0].d), 'in the app: the Fail test result has the picture', t && { pics: (t.pics || []).length });
    await A.click('.fb-r[data-id="' + t.id + '"]'); await sleep(400);
    await A.click('[data-pd="fb:tobug"][data-id="' + t.id + '"]'); await sleep(600);
    fb = await out(); const bug = fb.find(e => e.k === 'bug');
    ok(bug && (bug.pics || []).length === 1 && bug.pics[0].d === t.pics[0].d, 'Open a bug carries the picture to the bug', bug && { pics: (bug.pics || []).length });
    ok(!!(await A.$('.fb-d .fb-pics img')), 'and the bug shows it');
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { console.error('ERR', String(e.message).split(String.fromCharCode(10))[0]); console.error('tabs/errs', errs); fails++; }
  finally { await b.close(); S.stop && S.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
