// v73: Quick notes reminders in the extension. A note set to go off in a minute: the background opens the reminder window by itself
// (over whatever is in front), Done there clears the reminder in ScopeDue. EXT: the extension folder; SD_PLAYWRIGHT: playwright;
// SD_CHROME: a Chromium that loads extensions (the headless shell does not).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const EXT = process.env.EXT || path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'), 'scopedue-extension');
const PROF = path.join(os.tmpdir(), 'sd-x73rem');
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(PROF, { recursive: true, force: true });
  const o = { headless: true, args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--headless=new'] };
  if (process.env.SD_CHROME) o.executablePath = process.env.SD_CHROME; else o.channel = 'chromium';
  const ctx = await chromium.launchPersistentContext(PROF, o), errs = [];
  await ctx.addInitScript(() => { try { if (location.protocol === 'chrome-extension:' && !localStorage.getItem('sd-first')) { localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd.lang', 'en'); } } catch (e) {} });
  let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  const id = sw.url().split('/')[2];
  await sleep(1500); for (const pg of ctx.pages()) if (/app\.html/.test(pg.url())) await pg.close();
  const app = await ctx.newPage(); app.on('pageerror', e => errs.push('app: ' + e.message));
  await app.goto('chrome-extension://' + id + '/app.html'); await sleep(2000);
  ok((await app.evaluate(() => chrome.runtime.getManifest().permissions)).includes('alarms'), 'the extension may set alarms');

  // ---------------------------------------------------------------- a note that goes off at the next minute
  await app.click('[data-open-drawer="notes"]'); await sleep(500);
  const at = await app.evaluate(() => {
    const t = new Date(Date.now() + 61000), p = x => String(x).padStart(2, '0'), w = document.getElementById('note-remw'), d = w.querySelector('.rm-d');
    d.value = t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); d.dispatchEvent(new Event('input', { bubbles: true }));
    w.querySelector('.rm-t').value = p(t.getHours()) + ':' + p(t.getMinutes());
    const i = document.getElementById('note-input'); i.value = 'Call the client about quote v2'; i.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('composer').requestSubmit();
    t.setSeconds(0, 0); return t.getTime();
  });
  await sleep(800);
  const rems = await sw.evaluate(() => new Promise(r => chrome.storage.local.get('sdRems', o => r(o.sdRems || {}))));
  const al = await sw.evaluate(() => new Promise(r => chrome.alarms.getAll(r)));
  const r1 = Object.values(rems)[0] || {};
  ok(r1.t === 'Call the client about quote v2' && r1.at === at && !r1.shown, 'the reminder is handed to the background, at its minute', rems);
  ok(al.some(a => /^rem:/.test(a.name) && a.scheduledTime === at), 'with an alarm for it', al);
  ok(/Today \d\d:\d\d/.test(await app.$eval('#dnotes .dnote .nmeta', e => e.textContent)), 'the note says when: Today and the time', await app.$eval('#dnotes .dnote .nmeta', e => e.textContent));

  // ---------------------------------------------------------------- it goes off with another site in front
  const other = await ctx.newPage(); await other.goto('data:text/html,<title>Somewhere else</title><h1>Another site</h1>'); await other.bringToFront();
  const win = await ctx.waitForEvent('page', { predicate: pg => /reminder\.html/.test(pg.url()), timeout: 150000 }).catch(() => null);
  ok(!!win, 'when it is time, the reminder window opens by itself (the other site still in front of ScopeDue)');
  if (win) {
    win.on('pageerror', e => errs.push('reminder: ' + e.message));
    await win.waitForSelector('#rw-list li', { timeout: 5000 }).catch(() => {});
    const txt = await win.$eval('.rw', e => e.innerText).catch(() => '');
    ok(/Reminder/.test(txt) && /Call the client about quote v2/.test(txt) && /Today \d\d:\d\d/.test(txt) && /Done/.test(txt) && /Open the note/.test(txt), 'it shows the note, when, and Done / Remind me again / Open the note', txt);
    ok(Date.now() - at < 90000, 'within the minute it was set for (' + Math.round((Date.now() - at) / 1000) + ' s after)');
    const closed = win.waitForEvent('close', { timeout: 5000 }).then(() => true).catch(() => false);
    await win.click('.rw-done');
    ok(await closed, 'Done closes the window');
    await sleep(800);
    const meta = await app.$eval('#dnotes .dnote .nmeta', e => e.textContent).catch(() => '');
    ok(!/Today \d\d:\d\d/.test(meta), 'and ScopeDue clears the reminder on the note (it was open, in the background)', meta);
    const left = await sw.evaluate(() => new Promise(r => chrome.storage.local.get(['sdRems', 'sdRemAct'], r)));
    ok(!Object.keys(left.sdRems || {}).length && !(left.sdRemAct || []).length, 'nothing is left to go off, and nothing waits to be applied', left);
  }
  ok(!errs.length, 'no page errors', errs);
  await ctx.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
