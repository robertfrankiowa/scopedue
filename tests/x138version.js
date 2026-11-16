// 1.0.0 (CONTRACT 138): one version, set in build.py (VERSION), in the extension and in the web app. The unpacked extension keeps
// the ID the join page and Google sign-in know; Settings › About and the support details say the version in both, and the
// web app's service worker names its cache after it. The Store zip has no "key"; the first one carries key.pem.
// SD_PLAYWRIGHT (a playwright whose chromium.launch / launchPersistentContext know their browser), SD_ROOT = the release folder.
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright'), { chromium } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), EXT = path.join(ROOT, 'scopedue-extension');
const V = (fs.readFileSync(path.join(ROOT, 'build.py'), 'utf8').match(/^VERSION = '([\d.]+)'/m) || [])[1];
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x))); if (!c) fails++; };
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const prep = ctx => ctx.addInitScript(() => { try { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); } catch (e) {} });
async function about(p) {
  await p.click('[data-view="settings"]'); await p.click('#st-t-about'); await p.waitForTimeout(300);
  return T(p, '#st-ver');
}
(async () => {
  ok(V === '1.0.0', 'build.py says 1.0.0', V);
  ok(JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version === V, 'manifest.json carries it');
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'sd138-'));
  const ctx = await chromium.launchPersistentContext(prof, { headless: true, args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--headless=new'] });
  try {
    await prep(ctx);
    let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
    const id = sw.url().split('/')[2];
    ok(id === 'ibbcacdfhodipmkffnbjjkhphedmpknp', 'the unpacked extension keeps the ID join.js and Google sign-in know', id);
    const app = await ctx.newPage(), errs = []; app.on('pageerror', e => errs.push(e.message));
    await app.goto('chrome-extension://' + id + '/app.html?test'); await app.waitForTimeout(2000);
    ok((await app.evaluate(() => chrome.runtime.getManifest().version)) === V, 'Chrome reads the version from the manifest');
    ok((await about(app)) === V, 'extension: Settings › About says ' + V, await T(app, '#st-ver'));
    const d = await app.evaluate(() => window.__xb.diag()[0]);
    ok(d[0] === 'Version' && d[1] === V + ' · extension', 'extension: the support details say the version and the extension', d);
    const top = await app.evaluate(() => window.__xb.news[0]);
    ok(top.id === 'n100' && top.t === 'ScopeDue 1.0', 'What’s new starts with ScopeDue 1.0', top.id);
    ok(!errs.length, 'extension: no page errors', errs);
  } catch (e) { ok(false, 'extension crashed: ' + (e && e.stack || e)); }
  finally { await ctx.close(); }

  const S = await require('./serve')(path.join(ROOT, 'subdomains', 'app'));
  const b = await chromium.launch();
  try {
    const c2 = await b.newContext(); await prep(c2);
    // the web app asks for a ScopeDue account first (sd-pwa): a stored offline key stands in for one, as in x137hooks
    await c2.addInitScript(() => { try { localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_none', slug: 'none', email: 'a@b.example', via: 'email' })); } catch (e) {} });
    await c2.route(/fonts\.(googleapis|gstatic)\.com|scopedue\.com/, r => r.abort());
    const p = await c2.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(S.base + 'index.html?test'); await p.waitForTimeout(2000);
    ok((await about(p)) === V, 'web app: Settings › About says ' + V, await T(p, '#st-ver'));
    const d = await p.evaluate(() => window.__xb.diag()[0]);
    ok(d[0] === 'Version' && d[1] === V + ' · web', 'web app: the support details say the version and the web', d);
    const swt = fs.readFileSync(path.join(ROOT, 'subdomains', 'app', 'sw.js'), 'utf8');
    ok(swt.includes("const CACHE = 'scopedue-pwa-" + V + '-'), 'web app: the service worker cache is named after the version');
    ok(!errs.length, 'web app: no page errors', errs);
  } catch (e) { ok(false, 'web app crashed: ' + (e && e.stack || e)); }
  finally { await b.close(); S.close(); }

  const zip = path.join(ROOT, 'releases', 'scopedue-extension-' + V + '.zip');
  if (fs.existsSync(zip)) {
    const buf = fs.readFileSync(zip).toString('latin1');
    ok(!buf.includes('key.pem'), 'the release zip has no key.pem');
  }
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})();
