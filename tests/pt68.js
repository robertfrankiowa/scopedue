// v68: the client portal built from src/portal: a small page and its files in portal-assets/, themes from files, and loading only
// what the page will show.
//  - building again changes nothing; the page has no inline script, its files carry ?v=<hash>
//  - a theme added as a file (src/portal/css/themes) applies with ?theme=<id>, before the first frame (built in a copy)
//  - "System" follows the computer (dark), a named theme wins over it, an unknown one is ignored
//  - the studio's theme (studio.theme, api.php) is applied in the live portal and remembered for the next visit
//  - an English browser never reads the Vietnamese dictionary; Vietnamese reads it once, before the page; a studio in Vietnamese
//    gets a first page already in Vietnamese (never drawn in English first), and the next visit reads it up front
// Needs api.php 1.4.1 on :8096 in test mode (srv60), like p68.js. Run from this folder: node pt68.js
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const S = '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/', SRV = S + 'srv60/', API = 'http://127.0.0.1:8096/api.php', OUT = SRV + 'outbox.jsonl';
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
async function call(key, m, p, body) { const r = await fetch(API + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }
const mails = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const PW = 'pt68-pass-123';   // sign-up asks for a password since api.php moved to the site's users table
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email, password: PW, password_confirm: PW });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}
const bg = p => p.evaluate(() => [document.documentElement.getAttribute('data-theme'), getComputedStyle(document.body).backgroundColor]);
/* what the page looked like at its first frame, and at the first frame that shows the portal */
const watch = () => {
  document.addEventListener('DOMContentLoaded', () => { window.__t0 = [document.documentElement.getAttribute('data-theme'), getComputedStyle(document.body).backgroundColor]; });
  const f = () => { const k = document.querySelector('#view .kicker'); if (k && !window.__first) window.__first = [document.documentElement.lang, k.textContent.trim().toLowerCase()]; else requestAnimationFrame(f); };
  requestAnimationFrame(f);
};

(async () => {
  // ---- the build
  const outs = ['portal.html', 'portal-assets/boot.js', 'portal-assets/i18n.js', 'portal-assets/i18n-vi.js', 'portal-assets/portal.css', 'portal-assets/portal.js'];
  const before = outs.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  execSync('python3 build.py', { cwd: ROOT, stdio: 'ignore' });
  ok(outs.every((f, i) => fs.readFileSync(path.join(ROOT, f), 'utf8') === before[i]), 'building again changes nothing');
  const page = before[0];
  ok(!/<script>/.test(page) && !/<style>/.test(page) && (page.match(/portal-assets\/[\w.-]+\?v=[0-9a-f]{10}/g) || []).length === 4, 'portal.html has no script or style of its own: four files, each with ?v=<hash>');
  ok(page.length < 12000, 'and is small (' + page.length + ' bytes)');

  // ---- a new theme is one file (in a copy of the release)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-ptheme-'));
  for (const d of ['src', 'i18n', 'scopedue-extension']) execSync('cp -r ' + JSON.stringify(path.join(ROOT, d)) + ' ' + JSON.stringify(tmp + '/'));
  fs.copyFileSync(path.join(ROOT, 'build.py'), path.join(tmp, 'build.py'));
  const tpl = fs.readFileSync(path.join(tmp, 'src/portal/css/themes/_template.css'), 'utf8');
  fs.writeFileSync(path.join(tmp, 'src/portal/css/themes/example.css'), tpl.slice(tpl.indexOf('/* theme: example')));
  execSync('python3 build.py', { cwd: tmp, stdio: 'ignore' });
  const b = await chromium.launch();
  const W = await require('./serve')(tmp);
  const page1 = async (q, scheme, locale) => {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: scheme || 'light', locale: locale || 'en-US' });
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const got = []; ctx.on('request', r => got.push(r.url().split('/').pop().split('?')[0]));
    await ctx.addInitScript(watch);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/Content.Security|Refused/.test(m.text())) errs.push(m.text()); });
    await p.goto(W.base + 'portal.html?demo&proto' + (q || ''));   // v120 (88): the prototype's projects, whose rows these checks look at await p.waitForTimeout(1500); p.got = got; p.errs = errs; return p;
  };
  let p = await page1('&theme=example');
  ok(JSON.stringify(await p.evaluate(() => window.__t0)) === '["example","rgb(246, 242, 234)"]', '?theme=example: its colours from the first frame', await p.evaluate(() => window.__t0));
  ok(p.errs.length === 0, 'no errors, nothing refused by the CSP', p.errs);
  await p.context().close();
  p = await page1('&theme=nope');
  ok(JSON.stringify(await bg(p)) === '[null,"rgb(252, 251, 249)"]', 'an unknown theme is ignored');
  await p.context().close();
  // a theme's palette: "ivory.navy"
  p = await page1('&theme=ivory.navy');
  ok(JSON.stringify(await p.evaluate(() => window.__t0)) === '["ivory","rgb(245, 247, 250)"]' && await p.evaluate(() => document.documentElement.getAttribute('data-palette')) === 'navy', '?theme=ivory.navy: Ivory in its Navy palette, from the first frame', await p.evaluate(() => window.__t0));
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.nrow .gob')).backgroundColor) === 'rgb(28, 55, 106)', 'its buttons in the palette’s navy');
  await p.context().close();
  p = await page1('&theme=ivory.nope');
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'ivory' && !document.documentElement.hasAttribute('data-palette') && getComputedStyle(document.body).backgroundColor === 'rgb(247, 245, 240)'), 'an unknown palette: the theme in the studio’s own colour');
  await p.context().close();
  p = await page1('', 'dark');
  ok(JSON.stringify(await bg(p)) === '[null,"rgb(15, 19, 16)"]', 'System on a computer in dark mode: dark.css', await bg(p));
  await p.context().close();
  p = await page1('&theme=light', 'dark');
  ok(JSON.stringify(await bg(p)) === '["light","rgb(252, 251, 249)"]', 'a named theme wins over the computer’s dark mode', await bg(p));
  await p.context().close();
  p = await page1('&theme=ivory');
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'ivory' && getComputedStyle(document.body).backgroundColor === 'rgb(247, 245, 240)' && /Source Serif 4/.test(getComputedStyle(document.body).fontFamily) && document.fonts.check('400 20px "Source Serif 4"')), 'Ivory: its paper and its serif, from portal-assets/fonts');
  ok(await p.evaluate(() => /Inter/.test(getComputedStyle(document.querySelector('.kicker')).fontFamily) && getComputedStyle(document.querySelector('.kicker')).textTransform === 'uppercase'), 'and its labels in tracked sans capitals');
  ok(p.errs.length === 0, 'no errors, nothing refused by the CSP (Ivory)', p.errs);
  await p.context().close();
  // ---- the dictionary: only for Vietnamese
  p = await page1('', 'light', 'en-US');
  ok(!p.got.includes('i18n-vi.js') && await p.evaluate(() => document.documentElement.lang) === 'en', 'an English browser never reads the Vietnamese dictionary', p.got.filter(x => /i18n/.test(x)));
  await p.context().close();
  p = await page1('', 'light', 'vi-VN');
  const order = await p.evaluate(() => [...document.scripts].map(s => s.src.split('/').pop().split('?')[0]));
  ok(JSON.stringify(order) === '["boot.js","i18n-vi.js","i18n.js","portal.js"]' && p.got.filter(x => x === 'i18n-vi.js').length === 1, 'a Vietnamese browser reads it once, before the page', order);
  ok(JSON.stringify(await p.evaluate(() => window.__first)) === '["vi","cổng khách hàng"]', 'and the first frame is in Vietnamese', await p.evaluate(() => window.__first));
  await p.click('#langBtn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.documentElement.lang) === 'en' && /Client portal/i.test(await p.$eval('#view .kicker', e => e.textContent)), 'the header button still switches');
  await p.context().close();
  W.close(); fs.rmSync(tmp, { recursive: true, force: true });

  // ---- live: the studio's theme and language, from the server
  require('./deploy')(ROOT, SRV);
  execSync('bash ' + SRV + 'restart.sh test', { stdio: 'ignore' });
  const key = await account('Lan Studio', 'lan@studio.example');
  ok((await call(key, 'PUT', '/v1/studio', { theme: 'Bad theme' })).s === 422 && (await call(key, 'PUT', '/v1/studio', { theme: 'ivory.' })).s === 422 && (await call(key, 'PUT', '/v1/studio', { theme: 'ivory.navy' })).s === 200, 'studio.theme is a theme id, or "<theme>.<palette>"');
  let r = await call(key, 'PUT', '/v1/studio', { theme: 'dark', lang: 'vi' });
  ok(r.s === 200 && r.j.studio.theme === 'dark', 'PUT /v1/studio {theme: "dark"}', r.j);
  await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example' });
  const linkTo = async () => { const k = mails().length; await call(key, 'POST', '/v1/links', { client: 'acme' }); return mails().slice(k).pop().body.match(/https?:\/\/\S+#s=\S+/)[0]; };
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: 'light', locale: 'en-US' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, x => x.abort());
  const got = []; ctx.on('request', x => got.push(x.url().split('/').pop().split('?')[0]));
  await ctx.addInitScript(watch);
  p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(await linkTo()); await p.waitForFunction(() => document.querySelector('#view .kicker'), null, { timeout: 15000 }); await p.waitForTimeout(1000);
  ok(JSON.stringify(await bg(p)) === '["dark","rgb(15, 19, 16)"]', 'the live portal uses the studio’s theme', await bg(p));
  ok(JSON.stringify(await p.evaluate(() => window.__first)) === '["vi","cổng khách hàng"]' && got.filter(x => x === 'i18n-vi.js').length === 1, 'an English browser, a studio in Vietnamese: the dictionary is read once and the first page is already in Vietnamese', [await p.evaluate(() => window.__first), got.filter(x => /i18n/.test(x))]);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('sd-portal'))).then(h => h.theme === 'dark' && h.lang === 'vi' && Object.keys(h).length === 2), 'remembered for the next visit: the theme and the language, nothing else');
  got.length = 0;
  await p.reload(); await p.waitForFunction(() => document.querySelector('#view .kicker'), null, { timeout: 15000 }); await p.waitForTimeout(800);
  ok(JSON.stringify(await p.evaluate(() => window.__t0)) === '["dark","rgb(15, 19, 16)"]', 'the next visit is dark from the first frame', await p.evaluate(() => window.__t0));
  ok(JSON.stringify(await p.evaluate(() => [...document.scripts].map(s => s.src.split('/').pop().split('?')[0]))) === '["boot.js","i18n-vi.js","i18n.js","portal.js"]', 'and reads the dictionary up front');
  await call(key, 'PUT', '/v1/studio', { theme: '' });
  await p.reload(); await p.waitForFunction(() => document.querySelector('#view .kicker'), null, { timeout: 15000 }); await p.waitForTimeout(800);
  ok(JSON.stringify(await bg(p)) === '[null,"rgb(252, 251, 249)"]', 'the studio goes back to System: the portal follows', await bg(p));
  ok(errs.length === 0, 'no page errors', errs);
  await ctx.close();

  // ---- the portal: each project has its own theme, and the client can choose their own
  ok((await call(key, 'PUT', '/v1/projects/p-one', { client: 'acme', name: 'One', theme: 'Bad' })).s === 422, 'project.theme is validated like studio.theme');
  r = await call(key, 'PUT', '/v1/projects/p-one', { client: 'acme', name: 'One', theme: 'ivory.terracotta' });
  ok(r.s < 300 && r.j.project.theme === 'ivory.terracotta', 'PUT /v1/projects {theme: "ivory.terracotta"}', r.j);
  await call(key, 'PUT', '/v1/projects/p-two', { client: 'acme', name: 'Two', theme: 'light.porcelain' });
  r = await call(key, 'PUT', '/v1/projects/p-one', { client: 'acme', name: 'One' });
  ok(r.j.project.theme === 'ivory.terracotta', 'sending the project again without "theme" keeps it');
  const pc = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await pc.route(/fonts\.(googleapis|gstatic)\.com/, x => x.abort());
  await pc.addInitScript(watch);
  const cp = await pc.newPage(); const cerr = []; cp.on('pageerror', e => cerr.push(e.message));
  await cp.goto(await linkTo()); await cp.waitForFunction(() => document.querySelector('#view .kicker'), null, { timeout: 15000 }); await cp.waitForTimeout(1200);
  const look = () => cp.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-palette'), getComputedStyle(document.body).backgroundColor]);
  ok(JSON.stringify(await look()) === '["ivory","terracotta","rgb(248, 239, 233)"]', 'Home wears the first project’s theme', await look());
  await cp.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Two/.test(x.textContent)); c && c.click(); }); await cp.waitForTimeout(900);
  ok(JSON.stringify(await look()) === '["light","porcelain","rgb(243, 244, 246)"]', 'another project, its own theme (Light › Porcelain)', await look());
  // the client's own choice
  await cp.click('#thmBtn'); await cp.waitForTimeout(300);
  ok(await cp.evaluate(() => !document.getElementById('tmenu').hidden && document.querySelector('#tmenu .tm-follow').getAttribute('aria-checked') === 'true' && /Porcelain|Sứ trắng/.test(document.querySelector('#tmenu .tm-follow small').textContent)), 'the Appearance menu (in the client’s language): following the studio, which set Light · Porcelain here');
  const tms = await cp.$$eval('#tmenu .tm-o', l => l.map(x => x.getAttribute('data-v') + ':' + x.querySelector('.tm-n').textContent.trim()));
  ok(JSON.stringify(tms) === '["auto:Tự động","light:Sáng","dark:Tối","ivory:Ngà"]', 'and every theme to choose from', tms);
  await cp.click('#tmenu [data-v="ivory"]'); await cp.waitForTimeout(200);
  const tns = await cp.$$eval('#tmenu .tm-s', l => l.map(x => x.getAttribute('data-v')));
  ok(tns.length === 7 && tns[0] === 'ivory' && tns.includes('ivory.navy'), 'a theme with tones shows them', tns);
  await cp.click('#tmenu [data-v="ivory.navy"]'); await cp.waitForTimeout(300);
  ok(JSON.stringify(await look()) === '["ivory","navy","rgb(245, 247, 250)"]' && await cp.evaluate(() => localStorage.getItem('sd-portal-own')) === 'ivory.navy', 'the client chose Ivory · Navy: it applies at once and is kept in this browser', await look());
  await cp.keyboard.press('Escape'); await cp.waitForTimeout(200);
  await cp.evaluate(() => { const c = document.querySelector('.brand'); c && c.click(); }); await cp.waitForTimeout(800);
  ok(JSON.stringify(await look()) === '["ivory","navy","rgb(245, 247, 250)"]', 'their choice wins over every project’s theme');
  await cp.reload(); await cp.waitForFunction(() => document.querySelector('#view .kicker'), null, { timeout: 15000 }); await cp.waitForTimeout(600);
  ok(JSON.stringify(await cp.evaluate(() => window.__t0)) === '["ivory","rgb(245, 247, 250)"]', 'and is worn from the first frame on the next visit', await cp.evaluate(() => window.__t0));
  await cp.click('#thmBtn'); await cp.waitForTimeout(200); await cp.click('#tmenu .tm-follow'); await cp.waitForTimeout(300);
  ok(await cp.evaluate(() => localStorage.getItem('sd-portal-own')) === null && (await look())[1] === 'terracotta', '“As the studio set it” gives the choice back to the studio');
  await cp.click('#tmenu [data-v="auto"]'); await cp.waitForTimeout(300);
  ok(await cp.evaluate(() => localStorage.getItem('sd-portal-own')) === 'auto' && (await look())[0] === null, 'Automatic is a choice of its own (light, or dark on a dark computer)');
  ok(cerr.length === 0, 'no page errors in the portal', cerr);
  await pc.close();

  // ---- the app: the theme is chosen when the project is made, and changed on its page
  const WEB = await require('./serve')(ROOT);
  const ac = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ac.route(/fonts\.(googleapis|gstatic)\.com/, x => x.abort());
  await ac.addInitScript(([url, key]) => {
    if (!localStorage.getItem('sd-sync')) localStorage.setItem('sd-sync', JSON.stringify({ url, key, slug: '', email: 'lan@studio.example', via: 'email' }));
    if (!localStorage.getItem('sd-profile')) localStorage.setItem('sd-profile', JSON.stringify({ name: 'Lan Studio', tone: 2 }));
    localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'sample');
  }, [API, key]);
  const a = await ac.newPage(); a.errs = []; a.on('pageerror', e => a.errs.push(e.message));
  await a.goto(WEB.base + 'scopedue_v68.html?test&dev'); await a.waitForTimeout(1800);
  ok(!(await a.$('#pf-pt')), 'Profile no longer sets the portal theme');
  await a.click('[data-open-drawer="npj"]'); await a.waitForTimeout(600);
  const opts = await a.$$eval('#npj-pt .pt-o', l => l.map(x => x.getAttribute('data-pt') + ':' + x.querySelector('b').textContent + ':' + x.getAttribute('aria-checked')));
  ok(JSON.stringify(opts) === '[":Automatic:true","light:Light:false","dark:Dark:false","ivory:Ivory:false"]' && !(await a.$eval('#f-npj-pt', x => x.hidden)), 'New project (a client project) asks for the portal theme, Automatic to start', opts);
  ok(await a.$eval('#npj-pt', e => getComputedStyle(e).getPropertyValue('--tone').trim()) === '#3f5f5a', 'its pictures are in the studio’s colour');
  await a.focus('#npj-pt .pt-o[aria-checked="true"]'); await a.keyboard.press('ArrowLeft'); await a.waitForTimeout(150);
  ok(await a.$eval('#npj-pt .pt-o[aria-checked="true"]', x => x.getAttribute('data-pt') === 'ivory' && x === document.activeElement), 'the arrow keys move the choice (a radio group)');
  await a.click('#npj-pt [data-pt="light"]'); await a.waitForTimeout(150);
  const lp = await a.$$eval('#npj-pt .pt-sw', l => l.map(x => x.getAttribute('data-pal') + ':' + x.textContent.trim()));
  ok(JSON.stringify(lp) === '[":Light","porcelain:Porcelain","sand:Sand","mist:Mist","plum:Plum","midnight:Midnight"]', 'Light has six tones: its own first, then Porcelain and four more', lp);
  await a.click('#npj-pt [data-pt="ivory"]'); await a.waitForTimeout(150); await a.click('#npj-pt .pt-sw[data-pal="navy"]'); await a.waitForTimeout(150);
  ok(await a.$eval('#npj-pt [data-pt="ivory"] .pt-m', x => getComputedStyle(x).backgroundColor) === 'rgb(245, 247, 250)', 'the Ivory picture takes the tone’s paper');
  await a.click('.npj-kind[data-k="private"]'); await a.waitForTimeout(100);
  ok(await a.$eval('#f-npj-pt', x => x.hidden), 'a private project has no portal, so no theme');
  await a.click('.npj-kind[data-k="client"]'); await a.fill('#npj-n', 'Harbor House'); await a.selectOption('#npj-c', { index: 1 }); await a.click('#npj-go'); await a.waitForTimeout(1500);
  ok(await a.evaluate(() => window.__sy.raw('harbor-house').ptheme) === 'ivory.navy' && (await a.evaluate(() => window.__sy.body('harbor-house'))).theme === 'ivory.navy', 'the project keeps it, and sends it to the server with the project');
  ok(/Ivory · Navy/.test(await a.$eval('.pdc-th b', x => x.textContent)), 'its page shows it in the client card');
  await a.click('.pdc-th [data-pd="ptheme"]'); await a.waitForTimeout(700);
  ok(await a.$eval('#ptd-pick .pt-sw[data-pal="navy"]', x => x.getAttribute('aria-checked')) === 'true', 'Change opens it on the project’s theme');
  const see = await a.$eval('#ptd-see', x => x.hidden ? '' : x.href);
  ok(/^http:\/\/127\.0\.0\.1:8096\/portal\.html\?demo&theme=ivory\.navy&lang=en$/.test(see), '“See it in the portal demo” opens the server’s portal in it', see);
  await a.click('#ptd-pick [data-pt="light"]'); await a.click('#ptd-pick .pt-sw[data-pal="porcelain"]'); await a.click('#ptd-go'); await a.waitForTimeout(700);
  ok(await a.evaluate(() => window.__sy.raw('harbor-house').ptheme) === 'light.porcelain' && /Light · Porcelain/.test(await a.$eval('.pdc-th b', x => x.textContent)), 'saved: Light · Porcelain on the project and its card');
  await a.click('[data-open-drawer="npj"]'); await a.waitForTimeout(600);
  ok(await a.$eval('#npj-pt .pt-sw[data-pal="porcelain"]', x => x.getAttribute('aria-checked')) === 'true', 'the next new project starts on the theme chosen last');
  await a.keyboard.press('Escape');
  ok(a.errs.length === 0, 'no page errors in the app', a.errs);
  await ac.close(); WEB.close();

  await b.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
