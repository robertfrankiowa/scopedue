// v98: PP-10, what was saved survives a crash (CONTRACT.md 14.2, 49). A real browser profile on disk: a project made through New
// project, then the tab crashed (chrome://crash) and the page opened again; another project, then every process of the browser
// killed (no clean shutdown) and the browser started again on the same profile. Each project is there. No server.
// SD_PLAYWRIGHT: playwright (its launchPersistentContext); SD_ROOT: the release folder; F: the page (scopedue_v68.html or the PWA).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* every process started with this profile, killed at once: what a power cut or a crash of the whole browser leaves behind */
function killProfile(dir) {
  const tag = path.basename(dir);
  if (process.platform === 'win32') cp.execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*" + tag + "*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { stdio: 'ignore' }) ;
  else try { cp.execFileSync('pkill', ['-9', '-f', tag], { stdio: 'ignore' }); } catch (e) {}
}
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-crash-'));
  const open = async () => {
    const ctx = await chromium.launchPersistentContext(dir, { headless: true, args: ['--headless=new'], viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('sd-first')) { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_testrob', email: 'robert@studio.example', via: 'email' })); } } catch (e) {} });
    return ctx;
  };
  const page = async ctx => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(HTTP + F + '?test'); await sleep(1500); return p; };
  const make = async (p, name) => {
    await p.click('.nav-i[data-view="projects"]'); await sleep(250); await p.click('#npj-btn'); await sleep(400);
    await p.fill('#npj-n', name); await p.click('#npj-kinds [data-k="internal"]'); await sleep(150); await p.click('#npj-go'); await sleep(300);
  };
  const saved = p => p.evaluate(async () => { const b = await SDB.exportAll(); return b ? b.ent.filter(e => e.k.indexOf('project:') === 0).map(e => e.d.n) : []; });

  // ================================================================ the tab crashes
  let ctx = await open(), p = await page(ctx);
  await make(p, 'Before the tab crash');
  await sleep(400);   /* a change is written within a tenth of a second (14.2) */
  let crashed = false; p.on('crash', () => { crashed = true; });
  await p.goto('chrome://crash').catch(() => {}); await sleep(800);
  ok(crashed, 'the tab crashed');
  p = await page(ctx);
  ok((await saved(p)).includes('Before the tab crash'), 'opened again: the project is there', await saved(p));

  // ================================================================ the whole browser is killed
  await make(p, 'Before the browser was killed');
  await sleep(400);
  killProfile(dir); await sleep(1500);
  await ctx.close().catch(() => {});
  ctx = await open(); p = await page(ctx);
  const s = await saved(p);
  ok(s.includes('Before the tab crash') && s.includes('Before the browser was killed'), 'started again on the same profile: both projects are there', s);

  ok(!errs.length, 'no page errors', errs);
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  await ctx.close().catch(() => {}); WEB.close && WEB.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); console.error(errs); process.exit(1); });
