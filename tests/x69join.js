// v69: the join page (CONTRACT.md 29.17). Google's sign-in and Picker scripts are answered with stand-ins, and the extension is
// stood in for by window.chrome.runtime, so every branch of the page runs without Google: no extension, the Picker closed with
// nothing picked (the help), the Owner's file missing, a good pick handed to the extension, a later pick (add=1), Vietnamese.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Google's two scripts, stood in for: a token on request, and a Picker that answers what window.__pick says */
const GSI = `window.google = window.google || {}; google.accounts = { oauth2: {
  initTokenClient: function (o) { return { requestAccessToken: function () { setTimeout(function () { o.callback({ access_token: 'ya29.stand-in', scope: o.scope }); }, 10); } }; },
  hasGrantedAllScopes: function () { return true; } } };`;
const GAPI = `window.gapi = { load: function (n, cb) { setTimeout(cb, 10); } };
window.google = window.google || {};
google.picker = { ViewId: { DOCS: 'docs' }, DocsViewMode: { LIST: 'list' }, Feature: { MULTISELECT_ENABLED: 'm' }, Action: { PICKED: 'picked', CANCEL: 'cancel' },
  DocsView: function () { var v = this; ['setParent', 'setFileIds', 'setIncludeFolders', 'setMode'].forEach(function (k) { v[k] = function (x) { if (k === 'setParent') window.__parent = x; if (k === 'setFileIds') window.__ids = x; return v; }; }); },
  PickerBuilder: function () { var b = this, cb; ['setAppId', 'setDeveloperKey', 'setOAuthToken', 'setOrigin', 'enableFeature', 'addView', 'setTitle'].forEach(function (k) { b[k] = function () { return b; }; });
    b.setCallback = function (f) { cb = f; return b; }; b.build = function () { return { setVisible: function () { window.__opened = (window.__opened || 0) + 1; setTimeout(function () { cb(window.__pick || { action: 'cancel' }); }, 10); } }; }; } };`;
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const b = await chromium.launch(), errs = [];
  const open = async (hash, o) => {
    o = o || {};
    const ctx = await b.newContext({ viewport: { width: 900, height: 900 }, locale: o.lang === 'vi' ? 'vi-VN' : 'en-US' });
    await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GSI }));
    await ctx.route(/apis\.google\.com\/js\/api\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GAPI }));
    /* v78: Drive's about says who signed in (o.g.email, changeable mid-test); without o.g Google refuses (401) and the page goes on as before */
    await ctx.route(/www\.googleapis\.com\/drive\/v3\/about/, r => r.fulfill(o.g ? { status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ user: { emailAddress: o.g.email } }) } : { status: 401, headers: { 'access-control-allow-origin': '*' }, body: '' }));
    await ctx.route(/join-assets\/config\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: "window.SD_JOIN_CFG = { apiKey: 'AIza-stand-in' };" }));
    /* the extension: o.acct is ScopeDue's account there (sd-who answers as sw.js does); o.oldExt does not know sd-who */
    if (!o.noExt) await ctx.addInitScript(([xl, acct, old]) => { window.__sent = []; window.chrome = { runtime: { lastError: null, sendMessage: function (ext, msg, cb) { window.__sent.push({ ext: ext, msg: msg }); setTimeout(function () {
      if (msg.type === 'sd-who') { var e = String(msg.email || '').toLowerCase(); cb(old ? { ok: false } : { ok: true, signedIn: !!acct, same: !!acct && acct === e, hint: acct ? acct.replace(/^([^@]{1,2})[^@]*@/, '$1…@') : '' }); return; }
      cb(msg.type === 'sd-ping' ? { ok: true, v: '0.8.8', lang: xl } : { ok: true }); }, 5); } } }; }, [o.extLang || '', o.acct || '', !!o.oldExt]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(HTTP + 'join.html' + hash); await sleep(400);
    return p;
  };
  const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');

  // ================================================================ no extension
  let p = await open('#f=folder1234567', { noExt: true });
  ok(/not installed in this browser yet/.test(await T(p, '#jn-s1p')) && await p.isVisible('#jn-retry') && await p.$eval('#jn-in', e => e.disabled), 'no extension: it says how to get it, offers Check again, and keeps sign-in off');
  await p.context().close();

  // ================================================================ the Picker closed with nothing picked
  p = await open('#f=folder1234567');
  ok(/ScopeDue is installed \(0\.8\.8\)\./.test(await T(p, '#jn-s1p')) && !(await p.$eval('#jn-in', e => e.disabled)), 'the extension answers: step 1 done, sign-in on');
  await p.click('#jn-in'); await sleep(100);
  ok(await p.$eval('#jn-s2', e => e.classList.contains('done')) && !(await p.$eval('#jn-pick', e => e.disabled)), 'signed in: Pick the files is on');
  ok(await p.evaluate(() => window.__opened) === 1 && await p.evaluate(() => window.__parent) === 'folder1234567', 'v76: signed in, the Picker opens by itself on the shared folder');
  await p.click('#jn-pick'); await sleep(100);
  ok(await p.evaluate(() => window.__opened) === 2, 'Pick the files opens it again');
  ok(!(await p.$eval('#jn-help', e => e.hidden)) && /No files to pick\?/.test(await T(p, '#jn-ht')) && (await p.$$('#jn-hl li')).length === 3, 'closed with nothing picked: the help says what to try, three things');
  ok(await p.$eval('#jn-open', e => e.href) === 'https://drive.google.com/drive/folders/folder1234567', 'and links the folder in Google Drive, to look there');
  ok(!(await p.evaluate(() => window.__sent.some(s => s.msg.type === 'sd-join'))), 'nothing is sent to the extension');
  await p.evaluate(() => { window.__pick = { action: 'picked', docs: [{ id: 'aaaaaaaaaaaa', name: 'm-1234abcd.sdteam' }] }; });
  await p.click('#jn-again'); await sleep(100);
  ok(await p.evaluate(() => window.__opened) === 3 && /owner\.sdteam\) was not selected/.test(await T(p, '#jn-msg')) && await p.$eval('#jn-help', e => e.hidden), 'Open the Picker again: picking without the Owner\'s file says to pick every file');
  await p.evaluate(() => { window.__pick = { action: 'picked', docs: [{ id: 'bbbbbbbbbbbb', name: 'owner.sdteam' }, { id: 'aaaaaaaaaaaa', name: 'm-1234abcd.sdteam' }] }; });
  await p.click('#jn-pick'); await sleep(100);
  const sent = await p.evaluate(() => window.__sent.filter(s => s.msg.type === 'sd-join'));
  ok(sent.length === 1 && sent[0].ext === 'ibbcacdfhodipmkffnbjjkhphedmpknp' && sent[0].msg.fid === 'folder1234567' && sent[0].msg.files.length === 2, 'a good pick goes to the extension, to its fixed ID, with the folder and the files', sent);
  ok(await p.$eval('#jn-s3', e => e.classList.contains('done')) && /ScopeDue opened in a new tab/.test(await T(p, '#jn-msg')), 'and the page says ScopeDue opened');
  await p.context().close();

  // ================================================================ a later pick, and a missing folder
  p = await open('#f=folder1234567&add=1');
  ok(/Add a teammate’s file/.test(await T(p, '#jn-t')), 'add=1: the page is about adding a teammate\'s file');
  await p.click('#jn-in'); await sleep(100);
  await p.evaluate(() => { window.__pick = { action: 'picked', docs: [{ id: 'cccccccccccc', name: 'm-99999999.sdteam' }] }; });
  await p.click('#jn-pick'); await sleep(100);
  ok(await p.evaluate(() => window.__sent.some(s => s.msg.type === 'sd-join' && s.msg.files.length === 1)) && /next sync/.test(await T(p, '#jn-msg')), 'and a single file is enough there');
  await p.context().close();
  p = await open('');
  ok(/missing the project’s folder/.test(await T(p, '#jn-msg')), 'without #f= it says the link is incomplete');
  await p.context().close();

  // ================================================================ v78: which Google account, and the wrong one
  const g = { email: 'other@gmail.com' };
  p = await open('#f=folder1234567', { g, acct: 'hung@studio.example' });
  await p.click('#jn-in'); await sleep(150);
  ok(/Signed in to Google as other@gmail\.com\. ScopeDue in this browser uses hu…@studio\.example: sign in to Google with that account\./.test(await T(p, '#jn-s2p')) && /not the one the project was shared with/.test(await T(p, '#jn-msg')), 'v78: another Google account than ScopeDue’s: step 2 names it and the hint, and says so', await T(p, '#jn-s2p'));
  ok(!(await p.$eval('#jn-s2', e => e.classList.contains('done'))) && await p.$eval('#jn-pick', e => e.disabled) && !(await p.evaluate(() => window.__opened)), 'v78: and the Picker stays shut, Pick the files off');
  ok(/Use another account/.test(await T(p, '#jn-in')) && !(await p.$eval('#jn-in', e => e.disabled)) && !(await p.evaluate(() => JSON.stringify(window.__sent)).then(t => /hung@studio/.test(t))), 'v78: Use another account is on; the page never learns ScopeDue’s address');
  g.email = 'Hung@Studio.example';
  await p.click('#jn-in'); await sleep(150);
  ok(/^Signed in to Google as hung@studio\.example\.$/.test(await T(p, '#jn-s2p')) && await p.$eval('#jn-s2', e => e.classList.contains('done')) && await p.evaluate(() => window.__opened) === 1 && !(await T(p, '#jn-msg')), 'v78: the right account: step 2 done, the Picker opens by itself, the warning goes');
  await p.click('.jn-lang [data-lang="vi"]'); await sleep(50);
  ok(/^Đã đăng nhập Google bằng hung@studio\.example\.$/.test(await T(p, '#jn-s2p')) && /Dùng tài khoản khác/.test(await T(p, '#jn-in')), 'v78: in Vietnamese too');
  await p.context().close();
  p = await open('#f=folder1234567', { g: { email: 'other@gmail.com' }, acct: 'hung@studio.example', oldExt: true });
  await p.click('#jn-in'); await sleep(150);
  ok(/Signed in to Google as other@gmail\.com\.$/.test(await T(p, '#jn-s2p')) && await p.evaluate(() => window.__opened) === 1, 'v78: an extension that cannot tell (older, or ScopeDue signed out): the account is named and the page goes on');
  await p.context().close();

  // ================================================================ v80: the files by id, when the link names them
  p = await open('#f=folder1234567&ids=aaaaaaaaaaaa,bbbbbbbbbbbb,not%20an%20id');
  await p.click('#jn-in'); await sleep(150);
  ok(await p.evaluate(() => window.__ids) === 'aaaaaaaaaaaa,bbbbbbbbbbbb' && !(await p.evaluate(() => window.__parent)), 'v80: &ids= opens the Picker on those files (malformed ids dropped), not on the folder', await p.evaluate(() => [window.__ids, window.__parent]));
  await p.evaluate(() => { window.__pick = { action: 'picked', docs: [{ id: 'bbbbbbbbbbbb', name: 'owner.sdteam' }, { id: 'aaaaaaaaaaaa', name: 'm-1234abcd.sdteam' }] }; });
  await p.click('#jn-pick'); await sleep(100);
  ok(await p.evaluate(() => window.__sent.some(s => s.msg.type === 'sd-join' && s.msg.fid === 'folder1234567' && s.msg.files.length === 2)), 'v80: and the pick goes to the extension with the folder, as before');
  await p.context().close();

  // ================================================================ in Vietnamese
  p = await open('#f=folder1234567', { lang: 'vi' });
  await p.click('#jn-in'); await sleep(100); await p.click('#jn-pick'); await sleep(100);
  ok(/Tham gia dự án được chia sẻ/.test(await T(p, '#jn-t')) && /Không có file để chọn\?/.test(await T(p, '#jn-ht')) && /Mở lại Picker/.test(await T(p, '#jn-again')) && await p.evaluate(() => document.documentElement.lang) === 'vi', 'the page and its help in Vietnamese');
  await p.context().close();

  // ================================================================ the language follows ScopeDue, and the EN | VI switch
  p = await open('#f=folder1234567', { extLang: 'vi' });
  ok(/Tham gia dự án được chia sẻ/.test(await T(p, '#jn-t')) && /Đã có ScopeDue \(0\.8\.8\)/.test(await T(p, '#jn-s1p')) && await p.$eval('.jn-lang [data-lang="vi"]', e => e.getAttribute('aria-pressed')) === 'true', 'an English browser, ScopeDue in Vietnamese: the page follows ScopeDue');
  await p.click('#jn-in'); await sleep(100); await p.click('#jn-pick'); await sleep(100);
  await p.evaluate(() => { window.__pick = { action: 'picked', docs: [{ id: 'aaaaaaaaaaaa', name: 'm-1234abcd.sdteam' }] }; });
  await p.click('#jn-again'); await sleep(100);
  ok(/Chưa chọn file của Owner/.test(await T(p, '#jn-msg')), 'its messages are in Vietnamese too');
  await p.click('.jn-lang [data-lang="en"]'); await sleep(50);
  ok(/Join a shared project/.test(await T(p, '#jn-t')) && /owner\.sdteam\) was not selected/.test(await T(p, '#jn-msg')) && /ScopeDue is installed/.test(await T(p, '#jn-s1p')) && await p.evaluate(() => document.documentElement.lang) === 'en', 'EN switches every text in place, the message and step 1 included');
  await p.reload(); await sleep(400);
  ok(/Join a shared project/.test(await T(p, '#jn-t')), 'a language picked on the page is kept, over ScopeDue\'s');
  await p.context().close();

  ok(!errs.length, 'no page errors', errs);
  await b.close(); WEB.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
