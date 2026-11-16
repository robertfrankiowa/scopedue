// v68: each client has a portal and email language. Set when the client is created (starting on the language ScopeDue is in),
// changed later on the client page, sent to the server with the client; the server writes that client's emails in it and the
// portal opens in it. A server that does not know "lang" yet gets the client without it. The reminder you send is in it too.
// Needs api.php 1.4.1 on :8096 in test mode (srv60), like x63.js. Run from this folder: node x68c.js
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const S = '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/', SRV = S + 'srv60/', API = 'http://127.0.0.1:8096/api.php', OUT = SRV + 'outbox.jsonl';
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
async function call(key, m, p, body) { const r = await fetch(API + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }
const mails = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const PW = 'x68c-pass-123';   // sign-up asks for a password since api.php moved to the site's users table
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email, password: PW, password_confirm: PW });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}
const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const pressed = (p, s) => p.$eval(s + ' button[aria-pressed="true"]', b => b.getAttribute('data-f')).catch(() => '');

(async () => {
  require('./deploy')(ROOT, SRV);
  execSync('bash ' + SRV + 'restart.sh test', { stdio: 'ignore' });
  const key = await account('Robert Frank', 'robert@example.com');
  ok(!!key, 'a studio on the server');

  // ---- the server: a client's language
  await call(key, 'PUT', '/v1/studio', { lang: 'vi' });
  ok((await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example', lang: 'de' })).s === 422, 'a client language is en or vi');
  let r = await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example', lang: 'en' });
  ok(r.s === 201 && r.j.client.lang === 'en', 'PUT /v1/clients {lang: "en"}', r.j);
  let before = mails().length; await call(key, 'POST', '/v1/links', { client: 'acme' });
  let m = mails().slice(before).pop();
  ok(m && /^Hi Tom,/.test(m.body) && /shared your client portal/.test(m.subject), 'a studio in Vietnamese, a client in English: the email is in English', m && m.subject);
  r = await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example' });
  ok(r.j.client.lang === 'en', 'sending the client again without "lang" keeps it');
  r = await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example', lang: '' });
  before = mails().length; await call(key, 'POST', '/v1/links', { client: 'acme' }); m = mails().slice(before).pop();
  ok(r.j.client.lang === '' && /^Chào Tom,/.test(m.body), '"" goes back to the studio’s language', m.subject);
  await call(key, 'PUT', '/v1/studio', { lang: 'en' });

  // ---- the app
  const WEB = await require('./serve')(ROOT);
  const b = await chromium.launch(); const errs = [];
  const app = async (lang, route) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, x => x.abort());
    if (route) await ctx.route(/api\.php/, route);
    await ctx.addInitScript(([url, key, lang]) => {
      if (!localStorage.getItem('sd-sync')) localStorage.setItem('sd-sync', JSON.stringify({ url, key, slug: '', email: 'robert@example.com', via: 'email' }));
      if (!localStorage.getItem('sd-profile')) localStorage.setItem('sd-profile', JSON.stringify({ name: 'Robert Frank' }));
      if (!localStorage.getItem('sd.lang')) localStorage.setItem('sd.lang', lang);
    }, [API, key, lang]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(WEB.base + 'scopedue_v68.html?test&dev'); await p.waitForTimeout(1800);
    return p;
  };
  const newClient = async (p, name, contact, email, lang) => {
    await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(250);
    await p.click('#cl-new'); await p.waitForTimeout(450);
    const first = await pressed(p, '#cf-lang');
    await p.fill('#cf-name', name); await p.fill('#cf-contact', contact); await p.fill('#cf-email', email);
    if (lang) await p.click('#cf-lang [data-f="' + lang + '"]');
    await p.click('#cf-go'); await p.waitForTimeout(800);
    return first;
  };
  const openClient = async (p, name) => {
    await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(250);
    await p.evaluate(nm => { const r = [...document.querySelectorAll('#view-clients .pl-item')].find(x => x.textContent.includes(nm)); r && r.click(); }, name);
    await p.waitForTimeout(600);
  };

  // in English: the form starts on English; choose Tiếng Việt for a client called "Design"
  let p = await app('en');
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(250); await p.click('#cl-new'); await p.waitForTimeout(450);
  ok(await T(p, '#cf-lang-l') === 'Portal and email language', 'the new-client form asks for the portal and email language');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  const first = await newClient(p, 'Design', 'Phát Nguyễn', 'phat@design.example', 'vi');
  ok(first === 'en', 'it starts on the language ScopeDue is in (English)', first);
  await openClient(p, 'Design');
  ok(await pressed(p, '#cd-lang') === 'vi', 'the client page shows Tiếng Việt for this client');
  await p.evaluate(() => { const b = document.querySelector('#view-client [data-cd="copy"]'); b && b.click(); }); await p.waitForTimeout(2500);
  before = mails().length; r = await call(key, 'POST', '/v1/links', { client: 'design' }); m = mails().slice(before).pop();
  ok(r.s < 300 && m && /^Chào Phát,/.test(m.body) && /đã chia sẻ cổng khách hàng với bạn/.test(m.subject), 'the client went to the server with its language: the email is in Vietnamese, though the studio is in English', [r.s, m && m.subject]);
  // the portal opens in it, in an English browser
  const pc = await b.newContext({ locale: 'en-US' }); const pp = await pc.newPage();
  await pp.goto(m.body.match(/https?:\/\/\S+#s=\S+/)[0]); await pp.waitForFunction(() => document.querySelector('.kicker'), null, { timeout: 15000 }); await pp.waitForTimeout(1500);
  ok(await pp.evaluate(() => document.documentElement.lang) === 'vi' && /cổng khách hàng/i.test(await T(pp, '.kicker')), 'the portal opens in Vietnamese');
  await pc.close();
  // change it on the client page: the server hears it at once
  await p.click('#cd-lang [data-f="en"]'); await p.waitForTimeout(2000);
  ok(await pressed(p, '#cd-lang') === 'en' && /will read the portal and emails in English/.test(await T(p, '.toast, #toast')), 'switched to English on the client page, and said so', await T(p, '.toast, #toast'));
  before = mails().length; await call(key, 'POST', '/v1/links', { client: 'design' }); m = mails().slice(before).pop();
  ok(m && /^Hi Phát,/.test(m.body), 'the next email is in English', m && m.subject);
  // the reminder you write to a client is in the client's language
  ok(await p.evaluate(() => [SDI18N.to('vi', 'Thank you!'), SDI18N.to('en', 'Thank you!'), SDI18N.lang]).then(x => x[0] !== 'Thank you!' && x[1] === 'Thank you!' && x[2] === 'en'), 'in English, text for a Vietnamese client is in Vietnamese (SDI18N.to)');
  ok(await p.evaluate(() => SDI18N.to('vi', 'Design')) === 'Design', 'and people’s words stay as written in it');
  await p.context().close();

  // in Vietnamese: the form starts on Tiếng Việt
  p = await app('vi');
  await p.click('.nav-i[data-view="clients"]'); await p.waitForTimeout(250); await p.click('#cl-new'); await p.waitForTimeout(450);   // a closed drawer is translated when it opens
  ok(await T(p, '#cf-lang-l') === 'Ngôn ngữ cổng và email', 'the field in Vietnamese');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  ok(await newClient(p, 'Lotus', 'Mai Võ', 'mai@lotus.example') === 'vi', 'it starts on Tiếng Việt when ScopeDue is in Vietnamese');
  await openClient(p, 'Lotus');
  ok(await pressed(p, '#cd-lang') === 'vi' && await T(p, '#cd-lang') === 'EnglishTiếng Việt', 'the language names are never translated');
  await p.context().close();

  // a server older than 1.4.1: "lang" refused, the client goes without it
  const seen = [];
  p = await app('en', async (route, req) => {
    if (req.method() === 'PUT' && /r=\/v1\/clients\//.test(req.url())) {
      const body = JSON.parse(req.postData() || '{}'); seen.push(Object.keys(body).includes('lang'));
      if ('lang' in body) return route.fulfill({ status: 422, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { code: 'invalid', message: 'Unknown field "lang"' } }) });
    }
    return route.continue();
  });
  await newClient(p, 'Oldserver', 'Kim Lan', 'kim@old.example', 'vi');
  await openClient(p, 'Oldserver');
  await p.evaluate(() => { const b = document.querySelector('#view-client [data-cd="copy"]'); b && b.click(); }); await p.waitForTimeout(2500);
  ok(seen.length >= 2 && seen[0] === true && seen[1] === false && /Portal link copied/.test(await T(p, '.toast, #toast')), 'refused once with "lang", then sent without it, and the link works', [seen, await T(p, '.toast, #toast')]);
  await p.context().close();

  ok(errs.length === 0, 'no page errors', errs);
  await b.close(); WEB.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
