// v69: Help › Contact support, end to end in the extension, against a local support.php + MariaDB.
// Needs: SUP_URL (default http://127.0.0.1:8099/api.php; support.php beside it), SUP_KEY (a verified studio's sdk_ key), and the
// mariadb CLI on SUP_SOCK for the admin side. Run from this folder: node sup69.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const S = os.tmpdir() + '/sd-sup69/'; fs.mkdirSync(S, { recursive: true });
const EXT = process.env.EXT || path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'), 'scopedue-extension');
const URL0 = process.env.SUP_URL || 'http://127.0.0.1:8099/api.php', KEY = process.env.SUP_KEY || 'sdk_aliceAAAAAAAAAAAAAAAAAAAAAA';
const SQL = q => cp.execFileSync('mariadb', ['--default-character-set=utf8mb4', '-S', process.env.SUP_SOCK || '/tmp/mdb.sock', '-uroot', 'scopedue', '-N', '-e', q]).toString().trim();
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + String(x).slice(0, 300))); if (!c) fails++; };
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
(async () => {
  fs.rmSync(S + 'prof', { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(S + 'prof', { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--headless=new'] });
  const errs = [];
  // api.php itself is not under test: it answers "unavailable", so the portal sync stays quiet and the sign-in stays valid
  await ctx.route(/\/api\.php\?/, r => r.fulfill({ status: 503, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' }, body: '{"error":{"code":"x","message":"x"}}' }));
  let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  const id = sw.url().split('/')[2];
  for (let i = 0; i < 20; i++) { const f = ctx.pages().find(pg => /\/app\.html$/.test(pg.url())); if (f) { await f.close(); break; } await new Promise(r => setTimeout(r, 200)); }
  const app = await ctx.newPage(); app.on('pageerror', e => errs.push(e.message));
  await app.goto('chrome-extension://' + id + '/app.html?test'); await app.waitForTimeout(1500);
  // CONTRACT 144: the letter is read already, so the envelope counts only the team's answers here
  await app.evaluate(() => { try { localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-welcome', 'r'); } catch (e) {} });
  await app.reload(); await app.waitForTimeout(1500);
  const help = async () => { await app.click('.nav-i[data-view="dashboard"]').catch(() => {}); await app.waitForTimeout(200); await app.click('.nav-i[data-view="inbox"]'); await app.waitForTimeout(900); };

  // ---- signed out: no form, only a way to sign in
  await help();
  ok(await app.isVisible('#xs-in') && !(await app.$('#xs-new')), 'signed out: Contact support offers sign-in and no form', await T(app, '#xs-box'));
  ok(!(await app.$('#xb-contact a[href^="mailto:"]')), 'signed out: no email link in Contact support');
  await app.click('#xs-in'); await app.waitForTimeout(500);
  ok(await app.evaluate(() => { const d = document.getElementById('drawer-sync'); return !!d && d.classList.contains('open'); }) || await app.isVisible('#drawer-sync'), 'the button opens the sign-in panel');
  await app.keyboard.press('Escape'); await app.waitForTimeout(400);

  // ---- signed in
  await app.evaluate(([u, k]) => localStorage.setItem('sd-sync', JSON.stringify({ url: u, key: k, slug: 's_alice', email: 'a@x.com', via: 'email' })), [URL0, KEY]);
  await app.reload(); await app.waitForTimeout(1500); await help();
  ok(await app.isVisible('#xs-new'), 'signed in: the form is shown', await T(app, '#xs-box'));
  ok(/No messages yet/.test(await T(app, '#xs-list')), 'no conversations yet', await T(app, '#xs-list'));
  await app.click('#xs-send'); await app.waitForTimeout(300);
  ok(/Add a subject/.test(await T(app, '#e-xs-subj')) && /Write your message first/.test(await T(app, '#e-xs-body')), 'an empty form says what is missing');
  const before = +SQL("SELECT COUNT(*) FROM feedback_messages WHERE ext_slug='s_alice'");
  await app.selectOption('#xs-topic', 'bug');
  await app.fill('#xs-subj', 'Export fails'); await app.fill('#xs-body', 'When I export, nothing happens.\nSecond line.');
  await app.click('#xs-send'); await app.waitForTimeout(1500);
  ok(+SQL("SELECT COUNT(*) FROM feedback_messages WHERE ext_slug='s_alice'") === before + 1, 'the message is stored on the server');
  const row = SQL("SELECT topic, subject, source, ui_lang FROM feedback_messages WHERE ext_slug='s_alice' ORDER BY id DESC LIMIT 1").split('\t');
  ok(row.join('|') === 'bug|Export fails|extension|en', 'with its topic, subject and source', row);
  ok(SQL("SELECT body FROM feedback_messages WHERE ext_slug='s_alice' ORDER BY id DESC LIMIT 1") === 'When I export, nothing happens.\\nSecond line.', 'only what the person wrote, no details about the browser');
  ok(!(await app.$('#xs-new details')) && !(await app.$('#xs-new [data-xb="copy"]')), 'the form shows no details and no Copy details');
  ok(await app.$eval('#xs-subj', e => e.value) === '' && await app.$eval('#xs-body', e => e.value) === '', 'the form is cleared after sending');
  ok(/Export fails/.test(await T(app, '#xs-list')) && /Sent/.test(await T(app, '#xs-list')), 'the conversation shows in the list', await T(app, '#xs-list'));
  const tid = SQL("SELECT id FROM feedback_messages WHERE ext_slug='s_alice' ORDER BY id DESC LIMIT 1");

  // ---- a feature idea is a kind of message, not a card of its own
  ok(!(await app.$('#xb-idea')) && await app.$eval('#xs-topic', e => [...e.options].some(o => o.value === 'feature' && /Suggest a feature/.test(o.textContent))), 'Suggest a feature is a kind of message');
  await app.selectOption('#xs-topic', 'feature');
  ok(/trying to do/.test(await app.$eval('#xs-body', e => e.placeholder)), 'and asks what you were trying to do');
  await app.fill('#xs-subj', 'Dark mode'); await app.fill('#xs-body', 'Please add it.'); await app.click('#xs-send'); await app.waitForTimeout(1500);
  ok(SQL("SELECT topic, subject FROM feedback_messages WHERE ext_slug='s_alice' ORDER BY id DESC LIMIT 1") === 'feedback\tDark mode' && SQL("SELECT body FROM feedback_messages WHERE ext_slug='s_alice' ORDER BY id DESC LIMIT 1") === 'Please add it.', 'it is stored as feedback, with only what was written');
  ok(await app.$eval('#xs-topic', e => e.value) === 'feedback', 'the kind goes back to Feedback after sending');

  // ---- typing survives a refresh of the list
  await app.fill('#xs-subj', 'half written'); await app.evaluate(() => window.__xs.load(true)); await app.waitForTimeout(800);
  ok(await app.$eval('#xs-subj', e => e.value) === 'half written', 'what is being typed stays when the list refreshes');
  await app.fill('#xs-subj', '');

  // ---- the team answers (as the admin Messages page does)
  SQL(`INSERT INTO feedback_replies(feedback_id,sender_role,sender_user_id,sender_name,body,emailed) VALUES(${tid},'admin',1,'Staff Name','Send message\nWe fixed it.',1); UPDATE feedback_messages SET last_reply_at=NOW(), user_unread=1 WHERE id=${tid}`);
  await app.click('.nav-i[data-view="dashboard"]'); await app.waitForTimeout(300);
  await app.evaluate(() => window.__xs.check(true)); await app.waitForTimeout(800);
  ok(await app.isVisible('#xs-badge') && await T(app, '#xs-badge') === '1', 'the envelope in the header shows 1 new answer', await T(app, '#xs-badge'));
  ok(await app.$eval('#xs-badge', e => !!e.closest('.top-actions')) && !(await app.$('.nav-i[data-view="inbox"] .badge:not([hidden]):not(#ib-badge)')), 'the number sits beside the bell, not on Help');
  await app.click('#xs-mail'); await app.waitForTimeout(1500);
  ok(await app.evaluate(() => document.querySelector('.app').getAttribute('data-v')) === 'inbox', 'the envelope opens Help');
  const th = `[data-xs-th="${tid}"]`;
  ok(await app.$eval(th, e => e.open), 'the answered conversation opens by itself');
  ok(/ScopeDue team/.test(await T(app, th)) && /We fixed it/.test(await T(app, th)) && !/Staff Name/.test(await T(app, th)), 'the answer shows as the ScopeDue team, without the staff name');
  await app.waitForTimeout(800);
  ok(SQL(`SELECT user_unread FROM feedback_messages WHERE id=${tid}`) === '0', 'opening it marks the answer seen on the server');
  ok(!(await app.isVisible('#xs-badge')), 'and the badge goes');

  // ---- the person answers back
  await app.fill(`[data-xs-reply="${tid}"] textarea`, 'Thanks, works now.');
  await app.click(`[data-xs-reply="${tid}"] button[type="submit"]`); await app.waitForTimeout(1500);
  ok(SQL(`SELECT sender_role, body FROM feedback_replies WHERE feedback_id=${tid} ORDER BY id DESC LIMIT 1`) === 'user\tThanks, works now.', 'a reply is stored as the user’s');
  ok(SQL(`SELECT is_read FROM feedback_messages WHERE id=${tid}`) === '0', 'and the thread is unread for the admin again');
  ok(/Thanks, works now/.test(await T(app, th)), 'the reply shows in the conversation');

  // ---- deleting a conversation: two clicks, gone here, kept for the team
  const did = SQL("SELECT id FROM feedback_messages WHERE ext_slug='s_alice' AND subject='Dark mode' ORDER BY id DESC LIMIT 1");
  await app.$eval(`[data-xs-th="${did}"]`, e => { e.open = true; }); await app.waitForTimeout(200);
  await app.click(`[data-xs-del="${did}"]`); await app.waitForTimeout(300);
  ok(await app.isVisible(`[data-xs-th="${did}"]`) && /Click again/.test(await T(app, `[data-xs-del="${did}"]`)), 'the first click only asks to click again');
  await app.click(`[data-xs-del="${did}"]`); await app.waitForTimeout(1200);
  ok(!(await app.$(`[data-xs-th="${did}"]`)) && await app.isVisible(th), 'the second click removes that conversation, the others stay');
  ok(SQL(`SELECT user_deleted_at IS NOT NULL FROM feedback_messages WHERE id=${did}`) === '1', 'the team keeps its copy, marked deleted');
  await app.evaluate(() => window.__xs.load(true)); await app.waitForTimeout(800);
  ok(!(await app.$(`[data-xs-th="${did}"]`)), 'and it does not come back when the list reloads');

  // ---- in Vietnamese: the app's words change, people's words do not
  await app.evaluate(() => localStorage.setItem('sd.lang', 'vi')); await app.reload(); await app.waitForTimeout(1800); await help(); await app.waitForTimeout(800);
  ok(await T(app, '#xs-send') === 'Gửi tin nhắn' && /Các cuộc trò chuyện của bạn/.test(await T(app, '#xb-contact')), 'the form is in Vietnamese', await T(app, '#xs-send'));
  ok(await app.$eval(th, e => { e.open = true; return true; }) && /Send message/.test(await T(app, th + ' .xs-m.team .xs-txt')), 'the team’s words are left as written', await T(app, th + ' .xs-m.team .xs-txt'));
  ok(/Đội ngũ ScopeDue/.test(await T(app, th)), 'the labels around them are in Vietnamese');

  // ---- signed out by the server: the form goes away
  await app.evaluate(() => localStorage.setItem('sd-sync', JSON.stringify({ url: 'http://127.0.0.1:8099/api.php', key: 'sdk_nopeNOPEnopeNOPEnopeNOPE', slug: 's_x', email: 'x@x.com', via: 'email' })));
  await app.evaluate(() => localStorage.setItem('sd.lang', 'en')); await app.reload(); await app.waitForTimeout(1500); await help(); await app.waitForTimeout(1000);
  ok(await app.isVisible('#xs-in') && !(await app.$('#xs-new')), 'a key the server refuses: sign in again, no form', await T(app, '#xs-box'));

  ok(!errs.length, 'no page errors', errs.join(' | '));
  await ctx.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
