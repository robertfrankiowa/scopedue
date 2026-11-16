// v68: what people write is never translated. In Vietnamese, a project called "Design", a client "Online store" with a contact
// "Owner", a note "Done", a profile name "Review" all read exactly as typed, everywhere, while typing, after a reload, after a
// switch of language, and in a workspace that was filled in before the language existed. The samples are still translated.
// Run from this folder: node x68u.js   (SD_ROOT = the release folder)
// v69: the first run asks what you work on (x69own.js); these checks are about the sample studio, so they answer Work for clients.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let PAGE = 'file://' + path.join(ROOT, 'scopedue_v68.html');   // served over http below (serve.js says why)
let n = 0, f = 0; const ok = (c, m, x) => { n++; if (!c) { f++; console.log('FAIL ' + m + (x === undefined ? '' : ' :: ' + String(JSON.stringify(x)).slice(0, 400))); } else console.log('PASS ' + m); };
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
// what the dictionary would make of these words, if they were the app's
// (a label of the app that reads exactly like these words stays in English too: the person's word wins)
// A word only counts once the person has typed it: before “Handoff” is typed, “Bàn giao” is the app's own phase label on a sample project
// (GreenHome reaches its Handoff phase by date), and translating it then is right
let WRONG = /^(Thiết kế|Cửa hàng online|Chủ doanh nghiệp|Nhà sáng lập|Xong|Rà soát)$/;
const body = p => p.evaluate(() => { const o = []; const w = document.createTreeWalker(document.body, 4); let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t) o.push(t); } document.querySelectorAll('[aria-label],[title]').forEach(e => { o.push((e.getAttribute('aria-label') || '').trim(), (e.getAttribute('title') || '').trim()); }); return o; });
const bad = l => l.filter(t => WRONG.test(t));
(async () => {
  const SRV = await require('./serve')(ROOT); PAGE = SRV.base + 'scopedue_v68.html';
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  // a workspace begun in English (as before v68, where nobody chose a language: here English is set, so the welcome skips the step)
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sd.lang')) localStorage.setItem('sd.lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE + '?test&welcome'); await p.waitForTimeout(1300);
  await p.fill('#xa-n', 'Review'); await p.check('input[name="w"][value="client"]'); await p.click('#xa-f .xa-go'); await p.waitForTimeout(2500);
  await p.click('#npj-btn'); await p.waitForTimeout(400);
  await p.fill('#npj-n', 'Design');
  const kinds = await p.$$eval('#npj-kinds [data-k]', l => l.map(i => i.getAttribute('data-k')));
  await p.click('#npj-kinds [data-k="internal"]');
  await p.click('#npj-go'); await p.waitForTimeout(700);
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(200);
  await p.click('#cl-new'); await p.waitForTimeout(400);
  await p.fill('#cf-name', 'Online store'); await p.fill('#cf-contact', 'Owner'); await p.fill('#cf-role', 'Founder');
  if (await p.$eval('#cf-sw', e => e.getAttribute('aria-checked') === 'true' || e.checked === true).catch(() => false)) await p.click('#cf-sw');
  await p.click('#cf-go'); await p.waitForTimeout(700);
  await p.click('.nav-i[data-view="dashboard"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-open-drawer="notes"]')].find(x => x.offsetParent); if (b) b.click(); }); await p.waitForTimeout(400);
  await p.fill('#note-input', 'Done'); await p.click('#note-save'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok((await body(p)).includes('Design') && (await body(p)).some(t => /Online store/.test(t)), 'an English workspace with a project, a client and a note');
  // nothing typed so far is remembered as typed: what protects it now is the saved data alone
  await p.evaluate(() => localStorage.removeItem('sd.i18n.typed'));

  // ---------------------------------------------------------------- switching to Vietnamese
  await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(300);
  await p.click('#st-lang [data-f="vi"]'); await p.waitForTimeout(400);
  ok(await T(p, '#st-title') === 'Cài đặt', 'the app is in Vietnamese');
  ok(await T(p, '.user b') === 'Review', 'the profile name reads as typed (not “Rà soát”)');
  const navRec = await p.$$eval('#nav .pname', l => l.map(e => e.textContent.trim()));
  ok(navRec.includes('Design'), 'the recent project in the sidebar reads “Design”', navRec);
  await p.click('.nav-i[data-view="projects"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('#view-projects .pl-row', l => l.some(e => /Design/.test(e.textContent))), 'the project list says “Design”', await p.$$eval('#view-projects .pl-row', l => l.map(e => e.textContent.trim().slice(0, 80))));
  await p.click('#view-projects .pl-row'); await p.waitForTimeout(500);
  ok(await T(p, 'main:not([hidden]) h1') === 'Design', 'the project page is titled “Design”', await T(p, 'main:not([hidden]) h1'));
  ok(!bad(await body(p)).length, 'nothing on the project page turned the words into Vietnamese', bad(await body(p)));
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('#view-clients .pl-row', l => l.some(e => /Online store/.test(e.textContent) && /Owner/.test(e.textContent))), 'the client reads “Online store”, contact “Owner”');
  await p.click('#view-clients .pl-row'); await p.waitForTimeout(400);
  ok(!bad(await body(p)).length, 'the client page keeps “Online store”, “Owner” and “Founder”', bad(await body(p)));
  await p.click('.nav-i[data-view="dashboard"]'); await p.waitForTimeout(400);
  ok(!bad(await body(p)).length, 'the Dashboard keeps every word as typed', bad(await body(p)));
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-open-drawer="notes"]')].find(x => x.offsetParent); if (b) b.click(); }); await p.waitForTimeout(400);
  ok(await p.$$eval('#dnotes .txt', l => l.some(e => e.textContent.trim() === 'Done')), 'the note reads “Done” (not “Xong”)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // quick find
  await p.click('#q'); await p.fill('#q', 'design'); await p.waitForTimeout(250);
  ok(await p.$$eval('#qf-body .qf-i b', l => l.some(e => e.textContent === 'Design')), 'quick find shows “Design”', await p.$$eval('#qf-body .qf-i b', l => l.map(e => e.textContent)));
  await p.keyboard.press('Escape');

  // ---------------------------------------------------------------- typing: the words are the person's from the first key
  await p.click('#npj-btn'); await p.waitForTimeout(400);
  await p.type('#npj-n', 'Handoff', { delay: 20 }); await p.waitForTimeout(150);
  WRONG = /^(Thiết kế|Cửa hàng online|Chủ doanh nghiệp|Nhà sáng lập|Xong|Rà soát|Bàn giao)$/;   // typed now: from here the person's word wins
  await p.click('#npj-kinds [data-k="internal"]');
  const pv = await p.$eval('#npj-drawer, #drawer-npj', e => e.innerText).catch(() => '');
  ok(/Handoff/.test(pv) && !/Bàn giao/.test(pv), 'a name being typed shows as typed in the preview', pv.slice(0, 200));
  await p.click('#npj-go'); await p.waitForTimeout(700);
  ok(await T(p, 'main:not([hidden]) h1') === 'Handoff', 'and after it is created', [await T(p, 'main:not([hidden]) h1'), await p.$$eval('#drawer-npj [data-err], #drawer-npj .err, #drawer-npj [role=alert]', l => l.map(e => e.textContent + '|' + e.getAttribute('data-err')).join(' ; ')), kinds]);
  ok(/Handoff/.test(await T(p, '#toast-msg')) && !/Bàn giao/.test(await T(p, '#toast-msg')), 'the toast names it as typed', await T(p, '#toast-msg'));

  // ---------------------------------------------------------------- after a reload, and back and forth
  await p.reload(); await p.waitForTimeout(1500);
  ok(!bad(await body(p)).length && await T(p, '.user b') === 'Review', 'after a reload, still as typed');
  await p.click('.nav-i[data-view="settings"]'); await p.waitForTimeout(300);
  await p.click('#st-lang [data-f="en"]'); await p.waitForTimeout(300); await p.click('#st-lang [data-f="vi"]'); await p.waitForTimeout(300);
  await p.click('.nav-i[data-view="dashboard"]'); await p.waitForTimeout(300);
  ok(!bad(await body(p)).length, 'after English and back, still as typed');
  // a label that is not someone's word is still translated
  ok(await T(p, '.nav-i[data-view="dashboard"] .lbl') === 'Trang chủ' && await T(p, '#view-dashboard h1') === 'Trang chủ', 'the app’s own words are still in Vietnamese');
  await ctx.close();

  // ---------------------------------------------------------------- the runtime on its own
  const q = await b.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto(PAGE + '?test&lang=vi'); await q.waitForTimeout(1200);
  const r = await q.evaluate(async () => {
    const out = {};
    out.before = SDI18N.t('Design');
    const s = document.createElement('span'); s.textContent = 'Design'; document.body.appendChild(s); await new Promise(r => setTimeout(r, 30));
    out.shown = s.textContent;
    // a teammate's item called "Design" arrives in the data: what is on the page goes back to their word before the next paint
    SDI18N.userText(['Design']); await Promise.resolve(); await Promise.resolve();
    out.after = s.textContent; out.t = SDI18N.t('Design');
    out.inSentence = SDI18N.t('You created Design');
    out.cut = SDI18N.t('Ask Phát which payment provider they already use before quo…');
    SDI18N.userText(['Design', 'Ask Phát which payment provider they already use before quoting checkout.']); await Promise.resolve();
    out.cut2 = SDI18N.t('Ask Phát which payment provider they already use before quo…');
    SDI18N.userText([]); await Promise.resolve(); await Promise.resolve();
    out.back = s.textContent;
    return out;
  });
  ok(r.before === 'Thiết kế' && r.shown === 'Thiết kế', 'the label “Design” is translated while nobody wrote it', r);
  ok(r.after === 'Design' && r.t === 'Design', 'once someone wrote “Design”, it shows as written, at once', r);
  ok(r.inSentence === 'Bạn đã tạo Design', 'inside a sentence too', r.inSentence);
  ok(/^Hỏi Phát/.test(r.cut) && /^Ask Phát/.test(r.cut2), 'a cut-short text is left alone when it is the start of someone’s words', [r.cut, r.cut2]);
  ok(r.back === 'Thiết kế', 'and when nobody has written it any more, the label is translated again');

  // ---------------------------------------------------------------- the side panel: project names and the page's own title
  const os = require('os'), fs = require('fs'), EXT = path.join(ROOT, 'scopedue-extension'), P = path.join(os.tmpdir(), 'sd-x68u-prof');
  fs.rmSync(P, { recursive: true, force: true });
  const X = await chromium.launchPersistentContext(P, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--headless=new'] });
  let sw = X.serviceWorkers()[0]; if (!sw) sw = await X.waitForEvent('serviceworker', { timeout: 10000 });
  const id = sw.url().split('/')[2];
  for (let i = 0; i < 30 && !X.pages().some(pg => /app\.html$/.test(pg.url())); i++) await new Promise(r => setTimeout(r, 200));
  for (const pg of X.pages()) if (/app\.html$/.test(pg.url())) await pg.close();   // the tab the install opens would list its own samples
  await new Promise(r => setTimeout(r, 300));
  await sw.evaluate(() => chrome.storage.local.set({ sdLang: 'vi', sdProjects: [{ id: 'p1', n: 'Design', k: 'private', w: [{ id: 'i1', t: 'Review', mine: true }] }] }));
  const cap = await X.newPage(); cap.on('pageerror', e => errs.push('panel: ' + e.message));
  await cap.goto('chrome-extension://' + id + '/capture.html'); await cap.evaluate(() => localStorage.setItem('sd.lang', 'vi')); await cap.reload(); await cap.waitForTimeout(700);
  ok(await T(cap, 'h1') === 'Lưu vào ScopeDue', 'the side panel is in Vietnamese');
  ok(await cap.$$eval('#p option', l => l.some(o => o.textContent === 'Design')) && !(await cap.$$eval('#p option', l => l.some(o => o.textContent === 'Thiết kế'))), 'it lists the project “Design” as written', await cap.$$eval('#p option', l => l.map(o => o.textContent)));
  await cap.evaluate(() => window.__cx.setPage({ u: 'https://example.com/settings', title: 'Settings', sel: 'Done', from: 'sd-sel' })); await cap.waitForTimeout(200);
  ok(await T(cap, '#src-t') === 'Settings' && await T(cap, '#sel') === 'Done', 'a page called “Settings” and the words selected on it stay as they are');
  await X.close();

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(f ? f + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(f ? 1 : 0);
})();
