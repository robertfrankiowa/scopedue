// v68: source in src/, themes from files, and loading only what is shown (the extension's new tab, served over http).
//  - the build reproduces its outputs from src/ (running it again changes nothing)
//  - a theme added as a file appears in Settings and the footer, in both languages, and applies (built in a copy of the release)
//  - the saved theme is on <html> before the app's first frame
//  - English never reads the Vietnamese dictionary; Vietnamese reads it once, before the app; switching loads it then
//  - closed drawers are not laid out; a drawer and a hidden page are in the language when they are shown
// Run from this folder: node ui68.js
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');

(async () => {
  // ---- the build is a pure function of src/
  const outs = ['scopedue_v68.html', 'scopedue-extension/app.html', 'scopedue-extension/app.js', 'scopedue-extension/app.css', 'scopedue-extension/i18n.js', 'scopedue-extension/i18n-vi.js', 'scopedue-extension/boot.js'];
  const before = outs.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  execSync('python3 build.py', { cwd: ROOT, stdio: 'ignore' });
  ok(outs.every((f, i) => fs.readFileSync(path.join(ROOT, f), 'utf8') === before[i]), 'building again changes nothing: the outputs are exactly what src/ makes');

  // ---- a new theme is one file (in a copy of the release, so the real one is untouched)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-theme-'));
  for (const d of ['src', 'i18n', 'scopedue-extension']) execSync('cp -r ' + JSON.stringify(path.join(ROOT, d)) + ' ' + JSON.stringify(tmp + '/'));
  fs.copyFileSync(path.join(ROOT, 'build.py'), path.join(tmp, 'build.py'));
  const tpl = fs.readFileSync(path.join(tmp, 'src/css/themes/_template.css'), 'utf8');
  fs.writeFileSync(path.join(tmp, 'src/css/themes/example.css'), tpl.slice(tpl.indexOf('/* theme: example')));
  execSync('python3 build.py', { cwd: tmp, stdio: 'ignore' });
  const b = await chromium.launch();
  {
    const W = await require('./serve')(path.join(tmp, 'scopedue-extension'));
    const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
    await p.goto(W.base + 'app.html?test&lang=vi'); await p.waitForTimeout(1500);
    await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(400);
    ok(JSON.stringify(await p.$$eval('#st-theme button', l => l.map(b => b.getAttribute('data-f') + ':' + b.textContent.trim()))) === '["system:Hệ thống","light:Sáng","dark:Tối","example:Ví dụ"]', 'a theme file appears in Settings, named in Vietnamese from its header', await p.$$eval('#st-theme button', l => l.map(b => b.textContent.trim())));
    ok((await p.$$('#theme-sw button')).length === 4, 'and in the footer switch');
    await p.click('#st-theme [data-f="example"]'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'example' && getComputedStyle(document.body).backgroundColor === 'rgb(244, 239, 230)' && localStorage.getItem('sd-theme') === 'example'), 'choosing it applies its colours and keeps the choice');
    await p.reload(); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'example', 'and it is still chosen after a reload');
    await p.close(); W.close();
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  const W = await require('./serve')(path.join(ROOT, 'scopedue-extension'));
  const open = async (init, url) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const got = []; ctx.on('request', r => got.push(r.url().split('/').pop()));
    await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.got = got; const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
    await p.goto(W.base + (url || 'app.html?test')); await p.waitForTimeout(1500); return p;
  };
  // ---- the theme before the first frame
  let p = await open(() => { localStorage.setItem('sd-theme', 'dark'); localStorage.setItem('sd.lang', 'en'); document.addEventListener('DOMContentLoaded', () => { window.__t0 = [document.documentElement.getAttribute('data-theme'), getComputedStyle(document.body).backgroundColor]; }); });
  ok(JSON.stringify(await p.evaluate(() => window.__t0)) === '["dark","rgb(14, 21, 35)"]', 'a saved dark theme is on the page before the app runs: no white flash', await p.evaluate(() => window.__t0));
  await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(400); await p.click('#st-theme [data-f="system"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.documentElement.hasAttribute('data-theme')), 'System afterwards really means System (the early theme is not taken for the host page’s)');
  await p.context().close();

  // ---- English: no dictionary; closed drawers out of the layout
  p = await open(() => { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'sample'); });
  ok(!p.got.includes('i18n-vi.js'), 'in English the Vietnamese dictionary is never read', p.got.filter(x => /i18n/.test(x)));
  ok(await p.evaluate(() => [...document.querySelectorAll('.drawer')].every(d => getComputedStyle(d).display === 'none')), 'closed drawers are not laid out');
  await p.click('[data-open-drawer="notes"]').catch(() => {}); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const d = document.getElementById('drawer-notes'); return getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().right <= innerWidth + 1; }), 'an opened drawer is laid out and slides into view');
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('drawer-notes')).display === 'none'), 'and leaves the layout when its slide has ended');
  // switching to Vietnamese fetches the dictionary once, then everything is in Vietnamese
  await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(300); await p.click('#st-lang [data-f="vi"]'); await p.waitForTimeout(800);
  ok(p.got.filter(x => x === 'i18n-vi.js').length === 1 && await T(p, '#st-title') === 'Cài đặt', 'switching to Vietnamese reads the dictionary once and the page follows', p.got.filter(x => /i18n/.test(x)));
  await p.click('[data-open-drawer="notes"]').catch(() => {}); await p.click('.nav-i[data-view="dashboard"]').catch(() => {}); await p.waitForTimeout(300);
  ok(p.errs.length === 0, 'no page errors (English)', p.errs);
  await p.context().close();

  // ---- Vietnamese from the start: the dictionary before the app; hidden parts in Vietnamese when shown
  p = await open(() => { localStorage.setItem('sd.lang', 'vi'); localStorage.setItem('sd-first', 'sample'); });
  const order = await p.evaluate(() => [...document.scripts].map(x => x.src.split('/').pop()));
  ok(JSON.stringify(order) === '["boot.js","i18n-vi.js","i18n.js","app.js"]' && p.got.filter(x => x === 'i18n-vi.js').length === 1, 'in Vietnamese the dictionary runs before the language layer and the app, read once', order);
  ok(await T(p, '#view-dashboard h1, #view-dashboard .head h1') !== '' && !/Dashboard/.test(await T(p, '.nav-i[data-view="dashboard"]')), 'the first page is in Vietnamese');
  const hiddenBefore = await T(p, '#drawer-client-new .dr-h h2');
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(300); await p.click('#cl-new'); await p.waitForTimeout(500);
  ok(hiddenBefore === 'New client' && await T(p, '#drawer-client-new .dr-h h2') === 'Khách hàng mới', 'a closed drawer is left in English until it opens, then it is in Vietnamese before it shows', [hiddenBefore, await T(p, '#drawer-client-new .dr-h h2')]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(400);
  ok(await T(p, '#st-title') === 'Cài đặt' && /Giao diện/.test(await T(p, '#view-settings')), 'a hidden page is in Vietnamese when it is shown');
  await p.click('.user[data-view="profile"]').catch(() => {}); await p.waitForTimeout(300); await p.click('#acct button[data-a="profile"]').catch(() => {}); await p.waitForTimeout(500);
  ok(await T(p, '#pf-title') === 'Hồ sơ' && (await T(p, '#pf-hname')) !== '', 'the Profile page is drawn when opened', await T(p, '#pf-title'));
  ok(p.errs.length === 0, 'no page errors (Vietnamese)', p.errs);
  await p.context().close();

  // ---- the side panel in Vietnamese: a small dictionary of its own, and it never drops words the app keeps
  p = await open(() => { localStorage.setItem('sd.lang', 'vi'); if (!localStorage.getItem('sd.i18n.typed')) localStorage.setItem('sd.i18n.typed', JSON.stringify(['Design'])); }, 'capture.html');
  const ps = await p.evaluate(() => [...document.scripts].map(x => x.src.split('/').pop()));
  ok(JSON.stringify(ps.slice(0, 3)) === '["boot.js","i18n-vi-panel.js","i18n.js"]' && !p.got.includes('i18n-vi.js'), 'the side panel reads only its own small dictionary', ps);
  ok(/Lưu vào ScopeDue/.test(await p.evaluate(() => document.title)), 'and is in Vietnamese');
  await p.evaluate(() => { const t = document.createElement('textarea'); document.body.appendChild(t); t.value = 'Ghi chú riêng'; t.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(300);
  ok(JSON.parse(await p.evaluate(() => localStorage.getItem('sd.i18n.typed'))).includes('Design'), 'a word the app keeps is still kept after typing in the side panel');
  await p.context().close();

  await b.close(); W.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
