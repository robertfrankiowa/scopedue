// The private hostnames built by build.py into subdomains/: client.scopedue.com (the client portal), portal.scopedue.com (the Viewer portal) and app.scopedue.com (the
// app as a PWA). Each says noindex, nofollow (header, robots.txt, and the page itself), redirects to https, and the PWA has its
// manifest and service worker. SD_PLAYWRIGHT: the playwright package; SD_ROOT: the release folder.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');

const root = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const read = (...p) => fs.readFileSync(path.join(root, 'subdomains', ...p), 'utf8');

(async () => {
  for (const [name, host] of [['client', 'client.scopedue.com'], ['portal', 'portal.scopedue.com'], ['app', 'app.scopedue.com']]) {
    const ht = read(name, '.htaccess');
    ok(/X-Robots-Tag "noindex, nofollow"/.test(ht) && /Options -Indexes/.test(ht), name + ': the server says noindex, nofollow and lists no folders');
    ok(ht.includes('https://' + host + '%{REQUEST_URI}'), name + ': plain http goes to https://' + host);
    ok(read(name, 'robots.txt') === 'User-agent: *\nDisallow: /\n', name + ': robots.txt keeps every crawler out');
  }
  ok(/<meta name="sd-api" content="https:\/\/scopedue\.com\/api\/api\.php">/.test(read('client', 'index.html')), 'client: the portal asks the API on scopedue.com');
  ok(fs.existsSync(path.join(root, 'subdomains', 'client', 'portal-assets', 'portal.js')), 'client: the portal\'s assets are beside it');
  ok(read('app', 'manifest.webmanifest').includes('"display": "standalone"'), 'app: the manifest is standalone');
  ok(read('app', 'sw.js').includes("self.addEventListener('fetch'"), 'app: a service worker');
  const vp = read('portal', 'index.html');
  ok(/Viewer portal · ScopeDue/.test(vp) && /<meta name="sd-api" content="https:\/\/scopedue\.com\/api\/api\.php">/.test(vp) && /noindex, nofollow/.test(vp), 'portal: the Viewer portal (CONTRACT 32.6), asking the API on scopedue.com, noindex');
  ok(['viewer-assets/viewer.js', 'viewer-assets/viewer.css', 'join-assets/join.css', 'join-assets/fonts/newsreader-latin-opsz-normal.woff2'].every(f => fs.existsSync(path.join(root, 'subdomains', 'portal', f))), 'portal: its scripts, styles and fonts are beside it');

  const WEB = await require('./serve')(path.join(root, 'subdomains', 'app'));
  const b = await chromium.launch(), page = await b.newPage();
  await page.goto(WEB.base + 'index.html', { waitUntil: 'load' });
  const pwa = await page.evaluate(() => ({ manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'), robots: document.querySelector('meta[name="robots"]')?.content }));
  ok(pwa.manifest === 'manifest.webmanifest', 'app: the page links its manifest');
  ok(pwa.robots === 'noindex, nofollow', 'app: the page itself says noindex, nofollow');
  await b.close(); WEB.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
