// v93: the Viewer portal keeps what a Viewer is doing (CONTRACT.md 32.6.5), against a real api.php 1.9.1 on a fresh database. The
// minute's check repaints only what changed, and a repaint gives back the words being typed, the choices made and the caret; once
// the session ends nothing repaints the page, so the email for a new link stays as typed; an expired link opened in a browser that
// never opened the portal still offers a new link; a Vietnamese name is greeted by its given name, on the page and in the email; a
// picture chosen can be taken out again, and what was see-through in it turns white, not black. SD_PLAYWRIGHT, and php-server.js's.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BAO = 'bao@corp.example', REF = 'hr-tool';
/* a 2×2 PNG, red and fully see-through */
function png() {
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(2, 0); ih.writeUInt32BE(2, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.from([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8093, db: 'sd_vw93', files: ['api.php', 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const b = await chromium.launch(), errs = [];
  try {
    const key = await S.account('Robert', 'robert@studio.example');
    const entries = [{ id: 'f1', k: 'req', fr: ['lan@corp.example'], names: 'Lan', t: 'Show the tax code', st: 'park', ts: 1 }];
    const pub = (e, lg) => S.call(key, 'PUT', '/v1/vprojects/' + REF, { name: 'HR tool', show: { items: [{ id: 'i1', t: 'Export invoices', sec: 'in', st: 'doing' }] }, entries: e,
      viewers: [{ email: BAO, name: 'Nguyễn Quốc Bảo', lang: lg || 'en' }, { email: 'lan@corp.example', name: 'Lan Anh', lang: lg || 'en' }] });
    ok((await pub(entries)).s === 200, 'the studio publishes HR tool with two Viewers');
    const inv = await S.call(key, 'POST', '/v1/vprojects/' + REF + '/invite', { email: BAO });
    ok(inv.s === 201 && /^Hi Bảo,/.test(S.lastTo(BAO).body), 'the invitation greets Nguyễn Quốc Bảo as Bảo', S.lastTo(BAO).body.slice(0, 40));

    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    /* the minute's check, every 1.5 s */
    await ctx.addInitScript(() => { const si = window.setInterval; window.setInterval = (f, ms) => si(f, ms === 60000 ? 1500 : ms); });
    const V = await ctx.newPage(); V.on('pageerror', e => errs.push(e.message));
    await V.goto(inv.j.url); await sleep(1500);
    ok(/^Hi Bảo\. /.test(await V.$eval('#vw-d', e => e.textContent)), 'the portal greets him as Bảo', await V.$eval('#vw-d', e => e.textContent));

    // ---------------------------------------------------------------- the minute's check
    await V.evaluate(() => { window.__card = document.querySelector('#vw-body section'); });
    await sleep(3500);
    ok(await V.evaluate(() => window.__card === document.querySelector('#vw-body section')), 'nothing changed: the minute\'s check does not repaint the page');
    await V.click('#vw-f input[value="test"]'); await V.click('#vw-f input[name="res"][value="fail"]');
    await V.selectOption('#vw-f select[name="ab"]', 'i1');
    await V.click('#vw-f textarea[name="t"]'); await V.keyboard.type('Export stops at page 3 when');
    await V.evaluate(() => { const t = document.querySelector('#vw-f textarea'); t.setSelectionRange(7, 7); });
    ok((await pub(entries.concat([{ id: 'f2', k: 'bug', fr: ['lan@corp.example'], names: 'Lan', t: 'Totals are off by one', st: 'open', ts: 2 }]))).s === 200, 'meanwhile the studio publishes a new entry');
    await sleep(3500);
    const st = await V.evaluate(() => { const f = document.getElementById('vw-f'), a = document.activeElement; return { painted: window.__card !== document.querySelector('#vw-body section'), t: f.elements.t.value, k: f.querySelector('input[name="k"]:checked').value,
      res: (f.querySelector('input[name="res"]:checked') || {}).value, ab: f.elements.ab.value, focus: a === f.elements.t, caret: a.selectionStart, f2: /Totals are off by one/.test(document.body.innerText) }; });
    ok(st.painted && st.f2, 'something changed: the page shows the new entry', st);
    ok(st.t === 'Export stops at page 3 when' && st.k === 'test' && st.res === 'fail' && st.ab === 'i1', 'what he was writing is still there: the words, the kind, the result, what it is about', st);
    ok(st.focus && st.caret === 7, 'and he keeps typing where he was: the focus and the caret stay', st);
    /* v94: no language switch on the page; it speaks the project's language, given with each Viewer */
    ok(!(await V.$('.jn-lang, [data-lang]')), 'the page has no language switch');
    ok((await pub(entries.concat([{ id: 'f2', k: 'bug', fr: ['lan@corp.example'], names: 'Lan', t: 'Totals are off by one', st: 'open', ts: 2 }]), 'vi')).s === 200, 'the Owner sets the project to Vietnamese');
    await sleep(3500);
    const vi = await V.evaluate(() => ({ lang: document.documentElement.lang, eye: document.getElementById('vw-eye').textContent, t: document.querySelector('#vw-f textarea').value, last: JSON.parse(localStorage.getItem('sd-vw-last') || '{}').lang }));
    ok(vi.lang === 'vi' && vi.eye === 'Cổng Người xem' && vi.last === 'vi', 'at the minute\'s check the portal speaks Vietnamese, and this browser remembers it', vi);
    ok(vi.t === 'Export stops at page 3 when', 'and what he was writing is still there', vi);

    // ---------------------------------------------------------------- a comment being written
    await V.click('button[data-cm="f2"]'); await V.fill('.vw-ask textarea', 'Same here on Firefox');
    await V.click('button[data-cancel]'); await V.click('button[data-cm="f2"]');
    ok(await V.$eval('.vw-ask textarea', e => e.value) === '', 'a comment cancelled starts empty the next time');
    await V.fill('.vw-ask textarea', 'Same here on Firefox');
    ok((await pub(entries.concat([{ id: 'f2', k: 'bug', fr: ['lan@corp.example'], names: 'Lan', t: 'Totals are off by one', st: 'open', ts: 2 }]), 'en')).s === 200, 'the Owner sets the project back to English');
    await sleep(3500);
    ok(await V.evaluate(() => document.documentElement.lang) === 'vi' && await V.$eval('.vw-ask textarea', e => e.value) === 'Same here on Firefox', 'while a comment is being written the minute\'s check leaves the page alone');
    await V.click('.vw-ask button[data-cancel]'); await sleep(3500);
    ok(await V.evaluate(() => document.documentElement.lang) === 'en', 'once it is put away, the next check brings English');

    // ---------------------------------------------------------------- pictures
    const pic = { name: 'clear.png', mimeType: 'image/png', buffer: png() };
    await V.setInputFiles('#vw-f input[name="pics"]', [pic, Object.assign({}, pic, { name: 'two.png' })]); await sleep(800);
    ok(await V.$$eval('#vw-pics .vw-pic', a => a.length) === 2, 'two pictures chosen');
    const px = await V.evaluate(() => new Promise(r => { const p = window.SD_VIEWER_TEST.state().pics[0], i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = 2; c.height = 2; const g = c.getContext('2d'); g.drawImage(i, 0, 0); r([].slice.call(g.getImageData(0, 0, 1, 1).data)); }; i.src = 'data:image/jpeg;base64,' + p.data; }));
    ok(px[0] > 240 && px[1] > 240 && px[2] > 240, 'what was see-through in a picture is white in what is sent, not black', px);
    await V.click('#vw-pics button[data-unpic="0"]');
    ok(await V.$$eval('#vw-pics .vw-pic', a => a.length) === 1 && (await V.evaluate(() => window.SD_VIEWER_TEST.state().pics.length)) === 1, 'the × takes one picture out before it goes');

    // ---------------------------------------------------------------- sending clears what was kept
    await V.click('#vw-f button[type="submit"]'); await sleep(1500);
    const sent = Number(S.my([S.db, '-N', '-e', "SELECT COUNT(*) FROM api_vsent WHERE k = 'test'"]).toString().trim()), files = Number(S.my([S.db, '-N', '-e', 'SELECT COUNT(*) FROM api_vfiles']).toString().trim());
    ok(sent === 1 && files === 1, 'the test result goes with the one picture left', { sent, files });
    ok(await V.$eval('#vw-f textarea[name="t"]', e => e.value) === '' && !(await V.$('#vw-f input[name="res"]:checked')) && await V.$eval('#vw-f select[name="ab"]', e => e.value) === '' && (await V.$$('#vw-pics .vw-pic')).length === 0, 'once sent, the form starts empty');

    // ---------------------------------------------------------------- the session ends while the page is open
    S.my([S.db, '-e', 'DELETE FROM api_vsessions']);
    await sleep(2500);
    ok(!!(await V.$('#vw-lf')), 'the session ends: the page offers a new link');
    await V.fill('#vw-lf input[name="email"]', BAO); await sleep(4000);
    ok(await V.$eval('#vw-lf input[name="email"]', e => e.value) === BAO, 'nothing repaints it now: the email stays as typed');

    // ---------------------------------------------------------------- an expired link, in a browser that never opened the portal
    const inv2 = await S.call(key, 'POST', '/v1/vprojects/' + REF + '/invite', { email: BAO, send: false });
    const tok = inv2.j.url.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1];
    S.my([S.db, '-e', "UPDATE api_vlinks SET expires_at = 1 WHERE token_hash = '" + crypto.createHash('sha256').update(tok).digest('hex') + "'"]);
    const c2 = await b.newContext(), W = await c2.newPage(); W.on('pageerror', e => errs.push(e.message));
    await W.goto(inv2.j.url); await sleep(1500);
    ok(/expired/.test(await W.$eval('#vw-body', e => e.innerText)) && !!(await W.$('#vw-lf')), 'an expired link in a new browser says so and offers a new link');
    const before = S.mails().length;
    await W.fill('#vw-lf input[name="email"]', BAO); await W.click('#vw-lf button[type="submit"]'); await sleep(1500);
    const m = S.mails().slice(before).find(x => x.to === BAO);
    ok(/a new link is on its way/.test(await W.$eval('#vw-body', e => e.innerText)) && m && /^Your link to HR tool/.test(m.subject) && /#k=sdm_/.test(m.body), 'he asks: a new link reaches his email', m && m.subject);
    const c3 = await b.newContext(), X = await c3.newPage();
    await X.goto(S.base + 'viewer.html#k=sdm_notarealtoken'); await sleep(1200);
    ok(!(await X.$('#vw-lf')), 'a link that never was offers nothing');

    ok(!errs.length, 'no page errors', errs);
  } finally { await b.close(); S.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
