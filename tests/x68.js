// v68: the language. A first run asks for it before anything else; Settings changes it; the page, the extension's menus,
// the side panel, quick find, the reminder and the support email follow it. English stays exactly as it was.
// Run from this folder: node x68.js   (SD_ROOT = the release folder, by default the one above this one)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const PAGE = 'file://' + path.join(ROOT, 'scopedue_v68.html'), EXT = path.join(ROOT, 'scopedue-extension');
let n = 0, f = 0; const ok = (c, m, x) => { n++; if (!c) { f++; console.log('FAIL ' + m + (x === undefined ? '' : ' :: ' + String(JSON.stringify(x)).slice(0, 300))); } else console.log('PASS ' + m); };
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const fresh = async (q, locale) => {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: locale || 'en-US' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE + q); await p.waitForTimeout(1300); return p;
  };

  // ------------------------------------------------------------ a first run, in an English browser
  let A = await fresh('?test&welcome');
  ok(await A.isVisible('#xa-lang') && !(await A.isVisible('#xa-you')), 'a first run starts with the language, before the name');
  ok(await T(A, '#xa-lt') === 'Choose your language', 'asked in English in an English browser');
  ok(await A.$eval('input[name="lg"]:checked', e => e.value) === 'en', 'English is picked for an English browser');
  ok(await A.$eval('label[lang="vi"]', e => /Tiếng Việt/.test(e.textContent) && /Dùng ScopeDue bằng tiếng Việt/.test(e.textContent)), 'each language is offered in its own words');
  await A.click('label[lang="vi"]'); await A.waitForTimeout(150);
  ok(await T(A, '#xa-lt') === 'Chọn ngôn ngữ' && await T(A, '#xa-lgo') === 'Tiếp tục', 'picking Tiếng Việt shows the step in Vietnamese at once');
  ok(await A.evaluate(() => localStorage.getItem('sd.lang')) === null, '…without keeping it before Continue');
  ok(await A.evaluate(() => document.documentElement.lang) === 'vi', 'the page says lang="vi"');
  ok(await T(A, 'label[lang="en"] small') === 'Use ScopeDue in English', 'the other choice stays in its own language');
  await A.click('#xa-lgo'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => localStorage.getItem('sd.lang')) === 'vi', 'Continue keeps it');
  ok(await A.isVisible('#xa-you') && await T(A, '#xa-t') === 'Chào mừng đến với ScopeDue', 'the welcome goes on in Vietnamese');
  ok(await A.evaluate(() => document.activeElement && document.activeElement.id === 'xa-n'), 'at your name');
  ok(/Ngôn ngữ\s*Tiếng Việt/.test(await T(A, '#xa-back')), 'the language you chose is shown, with a way back');
  await A.click('#xa-back'); await A.waitForTimeout(100);
  ok(await A.isVisible('#xa-lang') && await A.$eval('input[name="lg"]:checked', e => e.value) === 'vi', 'back goes to the language, still on Tiếng Việt');
  await A.click('#xa-lgo'); await A.waitForTimeout(100);
  await A.click('#xa-f .xa-go'); await A.waitForTimeout(150);
  ok(await T(A, '#xa-err') === 'Nhập tên của bạn, để những người cùng làm biết là ai.', 'a missing name is asked for in Vietnamese');
  await A.fill('#xa-n', 'Robert Frank'); await A.check('input[name="s"][value="sample"]'); await A.check('input[name="w"][value="client"]'); await A.click('#xa-f .xa-go'); await A.waitForTimeout(500);
  ok(!(await A.$('#xa-wl')), 'the welcome closes');
  ok(/^Chào Robert\. Đây là các dự án mẫu/.test(await T(A, '#toast-msg')), 'and says hello in Vietnamese', await T(A, '#toast-msg'));
  ok(await T(A, '.nav-i[data-view="dashboard"] .lbl') === 'Trang chủ' && await T(A, '.nav-i[data-view="clients"] .lbl') === 'Khách hàng', 'the sidebar is in Vietnamese');
  ok(await T(A, '#view-dashboard h1') === 'Trang chủ', 'so is the Dashboard');
  ok(await T(A, '.user b') === 'Robert Frank', 'your name is shown as you typed it');
  ok(/^(Thứ (Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ Nhật), \d{1,2} thg \d{1,2}$/.test(await T(A, '#dash-today')), 'dates read the Vietnamese way', await T(A, '#dash-today'));
  ok(await A.evaluate(() => document.title) !== 'ScopeDue Dashboard', 'the tab title too', await A.evaluate(() => document.title));
  await A.reload(); await A.waitForTimeout(1300);
  ok(!(await A.$('#xa-wl')) && await T(A, '#view-dashboard h1') === 'Trang chủ', 'after a reload it stays in Vietnamese, and the welcome does not come back');

  // ------------------------------------------------------------ Settings › General › Appearance
  await A.click('.nav-i[data-view="settings"]'); await A.waitForTimeout(300);
  ok(await T(A, '#st-lg-l') === 'Ngôn ngữ' && await A.$eval('#st-lang [data-f="vi"]', e => e.getAttribute('aria-pressed')) === 'true', 'Settings shows the language, on Tiếng Việt');
  ok(await A.$eval('#st-lang', e => e.getAttribute('translate')) === 'no' && await T(A, '#st-lang [data-f="en"]') === 'English', 'the choices keep their own names');
  await A.click('#st-lang [data-f="en"]'); await A.waitForTimeout(300);
  ok(await T(A, '#st-title') === 'Settings' && await T(A, '.nav-i[data-view="dashboard"] .lbl') === 'Dashboard', 'English: the page changes in place, no reload');
  ok(await A.evaluate(() => localStorage.getItem('sd.lang')) === 'en' && await A.evaluate(() => document.documentElement.lang) === 'en', 'and keeps English');
  ok(await T(A, '#toast-msg') === 'ScopeDue is in English now', 'and says so');
  ok(await A.$eval('#st-lang [data-f="en"]', e => e.getAttribute('aria-pressed')) === 'true', 'the control follows');
  await A.click('#st-lang [data-f="vi"]'); await A.waitForTimeout(300);
  ok(await T(A, '#st-title') === 'Cài đặt' && await T(A, '#toast-msg') === 'Đã chuyển sang tiếng Việt', 'and back to Vietnamese');

  // ------------------------------------------------------------ quick find, in Vietnamese, with or without accents
  await A.click('#q'); await A.fill('#q', 'cai dat'); await A.waitForTimeout(250);
  ok(/Cài đặt/.test(await T(A, '#qf-body .qf-i')), 'quick find: “cai dat” finds Cài đặt', await T(A, '#qf-body .qf-i'));
  await A.fill('#q', 'khách hàng'); await A.waitForTimeout(250);
  ok(await A.$$eval('#qf-body .qf-i b', l => l.some(e => /Khách hàng/.test(e.textContent))), 'and “khách hàng” finds Khách hàng');
  await A.fill('#q', 'settings'); await A.waitForTimeout(250);
  ok(/Cài đặt/.test(await T(A, '#qf-body .qf-i')), 'the English word still works');
  await A.keyboard.press('Escape');

  // ------------------------------------------------------------ Help: the details say which language; the support email asks in it
  await A.click('.nav-i[data-view="inbox"]'); await A.waitForTimeout(300);
  const diag = await A.evaluate(() => window.__xb ? window.__xb.diag() : null);
  ok(diag && diag.some(r => r[0] === 'Language' && r[1] === 'Tiếng Việt'), 'Help’s details include the language', diag);
  // v69: Contact support is a form for someone signed in (sup69.js tests it end to end); signed out, it asks to sign in, in Vietnamese
  const xs = await T(A, '#xs-box');
  ok(/Đăng nhập để gửi tin nhắn cho chúng tôi/.test(xs) && /Đăng nhập để gửi tin nhắn$/.test(xs), 'Contact support asks to sign in, in Vietnamese', xs);

  // ------------------------------------------------------------ the reminder to a client is written in Vietnamese, and stays editable
  await A.click('.nav-i[data-view="actions"]'); await A.waitForTimeout(400);
  const rb = await A.$('[data-ca="remind"]');
  if (rb) {
    await rb.click(); await A.waitForTimeout(400);
    const msg = await A.$eval('#rm-t', e => e.value);
    ok(/^Chào /.test(msg) && /Cảm ơn bạn!$/.test(msg.trim()) && !/Thank you|still waiting on you/.test(msg), 'the reminder is drafted in Vietnamese', msg.slice(0, 160));
    await A.keyboard.press('Escape');
  } else ok(false, 'a client to remind');

  // ------------------------------------------------------------ nothing typed by a person is changed
  const kept = await A.evaluate(() => { const i = document.createElement('input'); i.value = 'Done'; i.placeholder = 'Done'; const t = document.createElement('textarea'); t.textContent = 'Done'; const s = document.createElement('span'); s.setAttribute('translate', 'no'); s.textContent = 'Done'; document.body.append(i, t, s); return new Promise(r => setTimeout(() => { r([i.value, i.placeholder, t.value, s.textContent]); i.remove(); t.remove(); s.remove(); }, 50)); });
  ok(kept[0] === 'Done' && kept[1] === 'Xong' && kept[2] === 'Done' && kept[3] === 'Done', 'what people type stays as it is; labels change', kept);
  await A.context().close();

  // ------------------------------------------------------------ a Vietnamese browser also defaults to English
  const V = await fresh('?test&welcome', 'vi-VN');
  ok(await V.$eval('input[name="lg"]:checked', e => e.value) === 'en' && await T(V, '#xa-lt') === 'Choose your language', 'a Vietnamese browser starts in English');
  await V.click('label[lang="vi"]'); await V.waitForTimeout(100);
  ok(await T(V, '#xa-lt') === 'Chọn ngôn ngữ', 'and can still pick Tiếng Việt');
  await V.context().close();

  // ------------------------------------------------------------ someone who used ScopeDue before v68 is not asked, and stays in English
  const O = await fresh('?test&welcome');
  await O.click('#xa-lgo'); await O.fill('#xa-n', 'Robert Frank'); await O.check('input[name="w"][value="client"]'); await O.click('#xa-f .xa-go'); await O.waitForTimeout(400);
  await O.evaluate(() => localStorage.removeItem('sd.lang')); await O.reload(); await O.waitForTimeout(1300);
  ok(!(await O.$('#xa-wl')) && await T(O, '#view-dashboard h1') === 'Dashboard', 'an existing workspace with no language chosen: no question, English');
  await O.context().close();

  // ------------------------------------------------------------ English is untouched
  const E = await fresh('?test');
  ok(await E.evaluate(() => document.documentElement.lang) === 'en' && await T(E, '#view-dashboard h1') === 'Dashboard', '?test with no language: English, as before');
  ok(await E.evaluate(() => SDI18N.lang === 'en' && SDI18N.t('Dashboard') === 'Dashboard'), 'and nothing is looked up');
  await E.context().close();

  // ------------------------------------------------------------ coverage: what a Vietnamese Dashboard, Projects and a project still show in English
  const C = await fresh('?test&lang=vi&i18ndebug');
  for (const v of ['dashboard', 'projects', 'mywork', 'clients', 'actions', 'inbox', 'settings', 'profile']) { await C.click('.nav-i[data-view="' + v + '"]').catch(() => {}); await C.waitForTimeout(250); }
  await C.click('.nav-i[data-view="projects"]'); await C.waitForTimeout(200); await C.click('#view-projects .pl-row'); await C.waitForTimeout(400);
  const miss = await C.evaluate(() => [...window.__i18nMiss.keys()].filter(k => !/^(#|https?:|[\w.-]+@|[\w.-]+\.(com|app|example)|SHA-256 |github_pat|Drive · \/)/.test(k)));
  const ALLOW = /^(ScopeDue|Studio|GitHub|Google Drive|Email|Chat|JSON|Web application|English|Español|Français|Deutsch|Português|\d+ · web|Lan Anh|Minh Thư|Phát Nguyễn|Ngọc Anh|Mai Võ|Khoa Đặng|Lan Hương|Minh Phát Furniture|GreenHome|E-commerce GreenHome|Lotus Wellness|Sen Coffee Roasters|Hoa Mai Studio|Website portfolio Hoa Mai|Brasília · São Paulo|Dubai|Bangkok|Singapore|Tokyo|Sydney|Auckland|USD|Job)$/;
  const left = miss.filter(k => !ALLOW.test(k));
  ok(left.length === 0, 'nothing left in English on the main pages, apart from names', left);
  await C.context().close();

  // ------------------------------------------------------------ the extension: install, menus, side panel
  const P = path.join(os.tmpdir(), 'sd-x68-prof'); fs.rmSync(P, { recursive: true, force: true });
  const X = await chromium.launchPersistentContext(P, { channel: 'chromium', headless: true, locale: 'en-US', args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--headless=new'] });
  let sw = X.serviceWorkers()[0]; if (!sw) sw = await X.waitForEvent('serviceworker', { timeout: 10000 });
  const id = sw.url().split('/')[2];
  let tab = null; for (let i = 0; i < 30 && !tab; i++) { tab = X.pages().find(pg => /\/app\.html$/.test(pg.url())); if (!tab) await new Promise(r => setTimeout(r, 200)); }
  ok(!!tab, 'installing the extension opens ScopeDue');
  tab.on('pageerror', e => errs.push('ext: ' + e.message));
  await tab.waitForSelector('#xa-lang', { timeout: 6000 }).catch(() => {});
  ok(await tab.isVisible('#xa-lang'), 'at the language step');
  const man = await tab.evaluate(() => chrome.runtime.getManifest());
  ok(man.version === '0.9.6' && man.default_locale === 'en', 'manifest 0.9.6, with English as the default locale');
  ok(await sw.evaluate(() => chrome.action.getTitle({})) === 'Save to ScopeDue', 'the toolbar button is in English before a choice');
  await tab.click('label[lang="vi"]'); await tab.click('#xa-lgo'); await tab.waitForTimeout(500);
  ok((await sw.evaluate(() => chrome.storage.local.get('sdLang'))).sdLang === 'vi', 'the choice reaches the extension');
  ok(await sw.evaluate(() => chrome.action.getTitle({})) === 'Lưu vào ScopeDue', 'the toolbar button and the right-click menu follow it');
  const cap = await X.newPage(); cap.on('pageerror', e => errs.push('panel: ' + e.message));
  await cap.goto('chrome-extension://' + id + '/capture.html'); await cap.waitForTimeout(700);
  ok(await T(cap, 'h1') === 'Lưu vào ScopeDue' && await T(cap, '#go') === 'Lưu' && await cap.evaluate(() => document.documentElement.lang) === 'vi', 'the side panel is in Vietnamese');
  ok(/Ghi chú/.test(await T(cap, '#kinds')) && /Để sau/.test(await T(cap, '#kinds')), 'with its choices');
  await tab.evaluate(() => SDI18N.set('en')); await cap.waitForTimeout(500);
  ok(await T(cap, 'h1') === 'Save to ScopeDue', 'switching in the app switches an open side panel too');
  ok(await sw.evaluate(() => chrome.action.getTitle({})) === 'Save to ScopeDue', 'and the menus');
  await X.close();

  ok(!errs.length, 'no page errors', errs);
  await b.close();
  console.log(f ? f + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(f ? 1 : 0);
})();
