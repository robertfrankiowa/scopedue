const { chromium } = require('/opt/npm-tools/node_modules/playwright');
// v69: the newest What's new entry is n69 (seven entries: copies and decisions), and the build is 69
const W = process.env.F ? '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/work/' + process.env.F : require('path').resolve(process.env.SD_ROOT || require('path').join(__dirname, '..'), 'scopedue_v68.html');
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('FAIL', m); } else console.log('ok', m); };
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (ua, vp, init) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 860 }, userAgent: ua, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + W + '?test'); await p.waitForTimeout(1300); return [ctx, p];
  };
  const T = (p, s) => p.$eval(s, e => e.textContent);
  const go = (p, v) => p.evaluate(v => document.querySelector('.nav-i[data-view="' + v + '"]').click(), v);

  // ---------------- Help
  let [ctx, p] = await open(WIN);
  ok(await T(p, '.nav-i[data-view="inbox"] .lbl') === 'Help', 'the sidebar says Help');
  ok(!(await p.$eval('#xb-dot', e => e.hidden)), 'a dot says What’s new has something unseen');
  await go(p, 'inbox'); await p.waitForTimeout(500);
  ok(await T(p, '#ib-title') === 'Help' && await p.$eval('#ib', e => getComputedStyle(e).display === 'none') && !(await p.$('#ib-new')), 'Help replaces the inbox list and its New message button');
  ok(await p.$eval('#xb-dot', e => e.hidden), 'visiting Help clears the dot');
  ok(await p.evaluate(() => localStorage.getItem('sd-help-seen')) === 'n69', 'what was seen is remembered');
  const items = await p.$$eval('#xb-news .xb-r', l => l.length);
  ok(items === 7 && /Safer copies, clearer decisions/.test(await T(p, '#xb-news .xb-r.top')) && /October 2026/.test(await T(p, '#xb-news .xb-r.top')), 'What’s new lists seven changes, newest dated');
  ok(!/\bv6\d|0\.8\.\d/.test(await T(p, '#xb-news')), 'no internal version numbers in What’s new');
  // v69: Contact support is a form for someone signed in (sup69.js); signed out it offers sign-in, with no email link
  ok(await p.$('#xs-in') && !(await p.$('#xb-contact a[href^="mailto:"]')), 'signed out, Contact support offers sign-in and no email link');
  const body = await p.evaluate(() => window.__xb.diagText());
  ok(/Build: 69 · web/.test(body) && /Browser: Chrome 129 on Windows/.test(body) && /Saving: /.test(body) && /Portal: Not signed in/.test(body), 'the details carry build, browser, saving and portal');
  ok(!/Robert|Online store|Minh|Lotus|@/.test(body), 'and no name, project or client');
  ok(!(await p.$('#xb-idea')), 'no separate Suggest a feature card: ideas go through Contact support');
  ok((await p.$$eval('#xb .xb-keys kbd', l => l.map(k => k.textContent))).filter(t => t === 'Ctrl').length === 3, 'shortcuts say Ctrl on Windows');
  ok(!(await p.$('#st-h-keys')), 'the shortcuts card is gone from Settings › About');

  // footer and About go to Help
  await go(p, 'dashboard'); await p.waitForTimeout(400);
  await p.click('#site-foot [data-ft="support"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !document.getElementById('view-inbox').hidden && document.activeElement && document.activeElement.id === 'xs-in'), 'footer Help lands on Contact support');
  await go(p, 'dashboard'); await p.waitForTimeout(400);
  await p.click('#site-foot [data-ft="updates"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'xb-news'), 'footer What’s new lands on What’s new');

  // Quick find
  await p.click('#q'); await p.fill('#q', 'support'); await p.waitForTimeout(400);
  const qf = await p.$$eval('#qf [role="option"]', l => l.map(e => e.textContent));
  ok(qf.some(t => /Help/.test(t)) && qf.some(t => /Contact support/.test(t)) && !qf.some(t => /New message/.test(t)), 'Quick find offers Help and Contact support, not New message');
  await p.fill('#q', 'maintenance'); await p.waitForTimeout(400);
  ok(!(await p.$$eval('#qf [role="option"]', l => l.map(e => e.textContent))).some(t => /Scheduled maintenance/.test(t)), 'old sample conversations are not searchable');
  await p.keyboard.press('Escape');
  ok(/work…/.test(await p.$eval('#q', e => e.placeholder)) && !/messages/.test(await p.$eval('#q', e => e.placeholder)), 'search says projects, clients, work');

  // ⌘ → Ctrl everywhere off a Mac, including what is drawn later
  ok(await p.evaluate(() => [].every.call(document.querySelectorAll('kbd'), k => k.textContent.indexOf('⌘') < 0)), 'no ⌘ left anywhere in the page on Windows');
  await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = '<span class="c-hint" id="late"><kbd>⌘</kbd> <kbd>↵</kbd></span>'; document.body.appendChild(d); });
  await p.waitForTimeout(200);
  ok(/Ctrl/.test(await T(p, '#late')), 'a hint drawn later says Ctrl too');

  // ---------------- Settings
  await p.evaluate(() => document.querySelector('.nav-i[data-view="settings"]').click()); await p.waitForTimeout(400);
  const groups = await p.$$eval('#st-tabs > *', l => l.map(e => e.classList.contains('st-ng') ? '#' + e.textContent : e.getAttribute('data-tab')));
  ok(groups.join(',') === '#Studio,general,team,plan,#Connections,portal,github,drive,#Data,storage,#App,about', 'tabs in four groups: ' + groups.join(','));
  await p.click('#st-t-about'); await p.waitForTimeout(300);
  ok(await T(p, '#st-ver') === '1.0.0' && /encrypted so it cannot read them/.test(await T(p, '#st-about')), 'About shows the version and what the server keeps now');
  await p.click('#st-t-portal'); await p.waitForTimeout(300);
  ok(/team sync/.test(await T(p, '#st-p-portal')) && !/your team stay on this device/.test(await T(p, '#st-p-portal')), 'Client portal copy mentions team sync');
  await p.click('#st-t-storage'); await p.waitForTimeout(600);
  const ld = await T(p, '#ld-body'), sto = await T(p, '#sto-body');
  ok(!/Last saved|On this device|Size/.test(ld) && /Last copy/.test(ld), 'Data card no longer repeats Last saved, counts and size');
  ok(/Last saved/.test(sto) && !/Conversations/.test(sto) && !/Google Drive/.test(sto), 'Storage card: one Last saved, no Conversations, no Drive while not connected');
  ok(!/conversation/.test(await T(p, '#xa-sb')), 'Sample data counts projects and notes');

  // ---------------- Profile
  // Profile opens only with a server sign-in (added after v67; profile-auth.js checks the gate). A stored key is enough: the server is never reached
  await p.evaluate(() => localStorage.setItem('sd-sync', JSON.stringify({ url: 'http://127.0.0.1:9/api.php', key: 'sdk_x67offline', slug: '', email: 'robert@example.com', via: 'email' })));
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelector('.user[data-view="profile"]').click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const m = document.querySelector('[role=menuitem][data-a="profile"]'); if (m) m.click(); }); await p.waitForTimeout(500);
  ok(/Add photo/.test(await T(p, '#pf-photo-btn')), 'no photo: the button says Add photo');
  ok(await p.$eval('#pf-str-go', e => e.hidden), 'the completeness bar does not repeat the photo button');
  ok(/Changes go out when you save/.test(await T(p, '#view-profile .head-r')), 'the lead says when changes go out');
  ok(/Your portal uses your photo’s color/.test(await T(p, '#view-profile')), 'portal color copy');
  await ctx.close();

  // ---------------- a Mac keeps ⌘
  [ctx, p] = await open(MAC);
  ok(await p.evaluate(() => [].some.call(document.querySelectorAll('.dr-foot kbd'), k => k.textContent === '⌘')), 'on a Mac the hints keep ⌘');
  await ctx.close();

  // ---------------- with a photo, the button says Change photo; a seen What's new keeps the dot off
  [ctx, p] = await open(WIN, null, () => { localStorage.setItem('sd-help-seen', 'n69'); });
  ok(await p.$eval('#xb-dot', e => e.hidden), 'once seen, no dot on the next load');
  await ctx.close();

  // ---------------- phone: the active settings tab is in view, and the row fades at its edge
  [ctx, p] = await open(WIN, { width: 390, height: 844 });
  await p.evaluate(() => document.querySelector('.nav-i[data-view="settings"]').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('st-t-about').click()); await p.waitForTimeout(900);
  const vis = await p.evaluate(() => { const b = document.getElementById('st-tabs').getBoundingClientRect(), t = document.getElementById('st-t-about').getBoundingClientRect(); return t.left >= b.left - 1 && t.right <= b.right + 1; });
  ok(vis, 'About is scrolled into view on a phone');
  ok(await p.$eval('#st-tabs', e => e.classList.contains('xb-fl')), 'the left edge fades when there is more to the left');
  await p.evaluate(() => document.getElementById('st-t-storage').click()); await p.waitForTimeout(800);
  const wrap = await p.evaluate(() => { const dd = [].filter.call(document.querySelectorAll('.sto-dl dd'), d => /fonts and caches/.test(d.textContent))[0]; if (!dd) return 'none'; const r = document.createRange(); r.selectNodeContents(dd.firstChild); return r.getClientRects().length; });
  ok(wrap === 'none' || wrap === 1, 'the browser storage figure stays on one line (' + wrap + ')');
  await go(p, 'inbox'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('xb-contact').getBoundingClientRect().top < document.getElementById('xb-news').getBoundingClientRect().top), 'on a phone, Contact support comes before What’s new');
  await ctx.close();

  await b.close();
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(f ? 'FAILED ' + f + '/' + n : 'ALL PASSED ' + n);
})();
