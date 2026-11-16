// v68 / api.php 1.4.1: the client portal and the client emails in Vietnamese. Over HTTP against srv60 on :8096 (test mode).
// The portal's language: the client's own choice, else the studio's (profile.lang), else the browser's. People's words never change.
const fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const S = '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/', SRV = S + 'srv60/', API = 'http://127.0.0.1:8096/api.php', OUT = SRV + 'outbox.jsonl';
const W = __dirname + '/../';
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
async function call(key, m, path, body) { const r = await fetch(API + '?r=' + path, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }
const mails = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const PW = 'p68-pass-123';   // sign-up asks for a password since api.php moved to the site's users table
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email, password: PW, password_confirm: PW });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}
/* a studio with one client and one project, Scope v1 issued; returns a fresh portal link */
async function setup(key, cref, biz, contact, email, pref, pname) {
  ok((await call(key, 'PUT', '/v1/clients/' + cref, { name: biz, contact, email })).s < 300, 'client ' + biz);
  ok((await call(key, 'PUT', '/v1/projects/' + pref, { client: cref, name: pname, phase: 2 })).s < 300, 'project ' + pname);
  const v = await call(key, 'POST', '/v1/projects/' + pref + '/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }, { id: 'b', sec: 'in', t: 'Build' }, { id: 'c', sec: 'out', t: 'Review' }] });
  ok(v.s < 300, 'Scope v1 issued', v.j);
}
async function link(key, cref, pref) {
  const before = mails().length;
  const r = await call(key, 'POST', '/v1/links', { client: cref, project: pref });
  ok(r.s < 300, 'link sent', r.j);
  const m = mails().slice(before).pop();
  return { url: m.body.match(/https?:\/\/\S+#s=\S+/)[0], mail: m };
}
async function open(ctx, url) {
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(() => document.querySelector('h1') && document.querySelector('.kicker'), null, { timeout: 15000 }); await p.waitForTimeout(1200);
  p.errs = errs; return p;
}
const look = p => p.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(), kicker: document.querySelector('.kicker').textContent.trim(), btn: ((document.querySelector('#langBtn .lf') || {}).textContent), body: document.body.innerText, title: document.title, stored: localStorage.getItem('sd.lang') }));

(async () => {
  require('./deploy')(W, SRV);
  execSync('bash ' + SRV + 'restart.sh test', { stdio: 'ignore' });
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.5.0' && JSON.stringify(h.j.lang) === '["en","vi"]', 'health: 1.5.0, and the languages it writes emails in', h.j);

  // ---- the studio says its language
  const vi = await account('Maya Chen', 'maya@studio.example');
  let r = await call(vi, 'GET', '/v1/studio');
  ok(r.j.studio.lang === '', 'a studio that has not said its language: lang is empty', r.j.studio);
  ok((await call(vi, 'PUT', '/v1/studio', { lang: 'fr' })).s === 422, 'only en or vi');
  r = await call(vi, 'PUT', '/v1/studio', { lang: 'vi', name: 'Maya Chen' });
  ok(r.s === 200 && r.j.studio.lang === 'vi', 'PUT /v1/studio {lang: "vi"}', r.j);

  // ---- people's words that are also app words: a project called "Design", a client business called "Review"
  await setup(vi, 'review-co', 'Review', 'Mai Võ', 'mai@review.example', 'design', 'Design');
  const L1 = await link(vi, 'review-co', 'design');
  ok(/đã chia sẻ Design với bạn/.test(L1.mail.subject) && /^Chào Mai,/.test(L1.mail.body) && /ngày/.test(L1.mail.body), 'the link email is in Vietnamese, with the project name as written', L1.mail.subject);

  const b = await chromium.launch({ headless: true });
  let ctx = await b.newContext({ locale: 'en-US' });
  let p = await open(ctx, L1.url), s = await look(p);
  ok(s.lang === 'vi' && s.kicker.toLowerCase() === 'cổng khách hàng', 'an English browser opens the portal in the studio’s language', { lang: s.lang, kicker: s.kicker });
  ok(s.h1 === 'Design' && /cho Review\b/.test(s.body), 'the project “Design” and the business “Review” stay as written', { h1: s.h1 });
  ok(!/Thiết kế/.test(s.h1) && !/cho Rà soát/.test(s.body), 'never “Thiết kế” or “Rà soát” for them');
  const st = await p.evaluate(() => [...document.querySelectorAll('.steps .t, [class*=step] .t')].map(x => x.textContent.trim()));
  ok(st.length === 0 || (st.includes('Thiết kế') && st.includes('Xây dựng') && !st.includes('Design')), 'the stage names are the portal’s own words: translated even next to a deliverable called “Design”', st);
  ok(s.btn === 'English' && s.stored === null, 'the switch offers English; nothing is kept until the client chooses', { btn: s.btn, stored: s.stored });
  ok(/^Design · Cổng khách hàng · /.test(s.title), 'the tab title too', s.title);
  ok(p.errs.length === 0, 'no errors', p.errs);
  // the scope, with items named like app labels
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-a="scope"]')].find(x => x.offsetParent); b && b.click(); }); await p.waitForTimeout(900);
  const sc = await p.evaluate(() => document.body.innerText);
  ok(/\bDesign\b/.test(sc) && /\bBuild\b/.test(sc), 'Scope items “Design” and “Build” are shown as written', sc.slice(0, 300));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---- the client chooses English; it sticks over the studio's language
  await p.click('#langBtn'); await p.waitForTimeout(600);
  s = await look(p);
  ok(s.lang === 'en' && s.kicker.toLowerCase() === 'client portal' && s.btn === 'Tiếng Việt' && s.stored === 'en', 'the client switches to English, and it is kept', { lang: s.lang, kicker: s.kicker, btn: s.btn, stored: s.stored });
  ok(s.h1 === 'Design', 'the page is drawn again, names unchanged');
  await p.close();
  const L2 = await link(vi, 'review-co', 'design');
  p = await open(ctx, L2.url); s = await look(p);
  ok(s.lang === 'en', 'the next link opens in English: the client’s choice wins', s.lang);
  await p.click('#langBtn'); await p.waitForTimeout(600); s = await look(p);
  ok(s.lang === 'vi' && s.stored === 'vi' && s.h1 === 'Design', 'and back to Vietnamese');
  await p.close(); await ctx.close();

  // ---- emails about the work, in Vietnamese
  const sess = (await call(null, 'POST', '/v1/session', { token: L2.url.split('&k=')[1] })).j.session;
  let before = mails().length;
  r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'design', v: 1 });
  let m = mails().slice(before).pop();
  ok(r.s === 201 && m && m.subject === 'Mã duyệt ScopeDue của bạn' && /Bạn đang duyệt Phạm vi v1 cho Design/.test(m.body), 'the approval code email', m && m.subject);
  const code = m.body.match(/\b\d{6}\b/)[0];
  before = mails().length;
  r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code });
  m = mails().slice(before).find(x => x.to === 'maya@studio.example');
  ok(r.s < 300 && m && /Mai Võ đã duyệt Phạm vi v1 \(Design\)/.test(m.subject) && /Dự án: Design/.test(m.body) && /Mở ScopeDue để xem\./.test(m.body), 'the studio hears it in Vietnamese too', m && [m.subject, m.body]);
  before = mails().length;
  r = await call(vi, 'POST', '/v1/projects/design/versions', { v: 2, terms: { price: 4500, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }, { id: 'b', sec: 'in', t: 'Build' }, { id: 'c', sec: 'out', t: 'Review' }] });
  m = mails().slice(before).find(x => x.to === 'mai@review.example');
  ok(r.s < 300 && m && m.subject === 'Phạm vi v2 của Design đã sẵn sàng' && /Maya Chen đã gửi Phạm vi v2 của Design\./.test(m.body) && /Mở cổng của bạn:/.test(m.body), 'a new Scope: the client email', m && [m.subject]);

  // ---- a studio that never said: the browser decides; a studio in English: English
  const none = await account('Lan Anh', 'lan@studio.example');
  await setup(none, 'acme', 'Acme', 'Tom Lee', 'tom@acme.example', 'site', 'Site');
  const L3 = await link(none, 'acme', 'site');
  ok(/shared Site with you/.test(L3.mail.subject) && /^Hi Tom,/.test(L3.mail.body), 'no language said: emails stay in English', L3.mail.subject);
  ctx = await b.newContext({ locale: 'vi-VN' });
  p = await open(ctx, L3.url); s = await look(p);
  ok(s.lang === 'vi' && s.stored === null, 'a Vietnamese browser: the portal in Vietnamese, nothing kept', { lang: s.lang, stored: s.stored });
  await p.close(); await ctx.close();
  await call(none, 'PUT', '/v1/studio', { lang: 'en' });
  ctx = await b.newContext({ locale: 'vi-VN' });
  p = await open(ctx, (await link(none, 'acme', 'site')).url); s = await look(p);
  ok(s.lang === 'en', 'the studio says English: English, even in a Vietnamese browser', s.lang);
  await p.close(); await ctx.close();
  await b.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
