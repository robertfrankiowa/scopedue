// 0.10.84 (CONTRACT 137): the app's test hooks (window.__sy, __bl, __drv, …, opened by ?test) exist only on a page of this computer
// or an unpacked extension. The page is served on 127.0.0.1 and, through Chrome's host rules, under a name that is not this
// computer's (app.example-host.test, as app.scopedue.com would be): with ?test, the first has them, the second has none.
// SD_PLAYWRIGHT; F= the single file or the PWA (subdomains/app/index.html); SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN (php-server.js serves it).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'subdomains/app/index.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x))); if (!c) fails++; };
const HOOKS = ['__sy', '__bl', '__drv', '__x8', '__xa', '__ti', '__cp', '__pl', '__fb', '__vp'];
(async () => {
  const dir = path.dirname(F), S = await require('./php-server')({ root: ROOT, port: 8138, db: 'sd_hooks137', files: ['api.php'].concat(dir === '.' ? [F] : [dir]) });
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP app.example-host.test 127.0.0.1'] });
  try {
    const ctx = await b.newContext();
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|scopedue\.com/, r => r.abort());
    await ctx.addInitScript(api => { try { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: 'sdk_none', slug: 'none', email: 'a@b.example', via: 'email' })); } catch (e) {} }, S.api);
    const seen = async url => { const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(1500); const h = await p.evaluate(hs => hs.filter(k => typeof window[k] !== 'undefined'), HOOKS); await p.close(); return h; };
    const local = await seen(S.base + F + '?test');
    ok(local.length >= 5, 'on 127.0.0.1 with ?test, the tests have their hooks', local);
    const other = await seen('http://app.example-host.test:8138/' + F + '?test');
    ok(other.length === 0, 'under another name with ?test, no hook at all', other);
    const plain = await seen(S.base + F);
    ok(plain.length === 0, 'on 127.0.0.1 without ?test, none either', plain);
  } catch (e) { ok(false, 'crashed: ' + (e && e.stack || e)); }
  finally { await b.close(); S.stop(); console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0); }
})();
