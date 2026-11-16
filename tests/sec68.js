// Security checks added by the v68 audit. Needs api.php on :8096 in test mode (srv60). Run from this folder: node sec68.js
//  - guessing sign-in codes from one address is cut off
//  - a client's email address changed by the studio: the old address is told, old links and sessions stop working
//  - the portal runs only its own script files (CSP script-src 'self', nothing inline) and hides itself inside another site's frame
//  - what the language layer remembers of typed text: only words the dictionary could change; never codes, messages or addresses
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const S = '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/', SRV = S + 'srv60/', API = 'http://127.0.0.1:8096/api.php', OUT = SRV + 'outbox.jsonl';
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
async function call(key, m, p, body) { const r = await fetch(API + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }
const mails = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const PW = 'sec68-pass-123';   // sign-up asks for a password since api.php moved to the site's users table
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email, password: PW, password_confirm: PW });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}

(async () => {
  require('./deploy')(ROOT, SRV);
  execSync('bash ' + SRV + 'restart.sh test', { stdio: 'ignore' });
  const key = await account('Maya', 'maya@studio.example');

  // ---- code guessing from one address
  const st = []; for (let i = 0; i < 32; i++) st.push((await call(null, 'POST', '/v1/studios/verify', { challenge: 'aaaaaaaaaaaaaaaaaaaaaaaa', code: '000000' })).s);
  ok(st.slice(0, 29).every(s => s === 422) && st.slice(29).every(s => s === 429), 'sign-in code checks from one address stop at 30 an hour (one was the sign-up)', st.slice(27));

  // ---- a client's address changes
  await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'tom@acme.example', lang: 'vi' });
  const link = (await call(key, 'POST', '/v1/links', { client: 'acme' })).j.url;
  const sess = (await call(null, 'POST', '/v1/session', { token: link.split('&k=')[1] })).j.session;
  ok((await call(sess, 'GET', '/v1/portal')).s === 200, 'the client is in the portal');
  let before = mails().length;
  ok((await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Tom Lee', email: 'other@evil.example', lang: 'vi' })).s === 200, 'the studio changes the client’s address');
  const m = mails().slice(before).find(x => x.to === 'tom@acme.example');
  ok(m && /đã thay đổi/.test(m.subject) && /o•••••@evil\.example/.test(m.body) && !/other@evil/.test(m.body), 'the old address is told, in the client’s language, with the new one masked', m && [m.subject, m.body.slice(0, 200)]);
  ok((await call(sess, 'GET', '/v1/portal')).s === 401, 'the session made for the old address ends');
  ok((await call(null, 'POST', '/v1/session', { token: link.split('&k=')[1] })).s === 401, 'and the link sent to it no longer opens the portal');
  before = mails().length;
  await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme Ltd', contact: 'Tom Lee', email: 'other@evil.example', lang: 'vi' });
  ok(!mails().slice(before).length, 'other edits send nothing');
  const ev = (await call(key, 'GET', '/v1/pull&after=0')).j;
  ok(ev && JSON.stringify(ev).includes('client_email'), 'the change is in the studio’s event log', ev && Object.keys(ev));

  // ---- the portal: its own scripts only, and never framed
  const b = await chromium.launch();
  const p = await b.newPage(); const csp = []; p.on('console', x => { if (/Content.Security.Policy|Refused/i.test(x.text())) csp.push(x.text()); });
  await p.goto('http://127.0.0.1:8096/portal.html?demo'); await p.waitForTimeout(2500);
  const meta = await p.$eval('meta[http-equiv="Content-Security-Policy"]', e => e.content).catch(() => '');
  ok((meta.split('script-src')[1] || '').split(';')[0].trim() === "'self'" && /default-src 'none'/.test(meta) && /form-action 'none'/.test(meta), 'the portal has a CSP: its own files only, no script in the page', meta.slice(0, 120));
  ok(await p.evaluate(() => [...document.scripts].every(s => s.src && !s.textContent.trim())), 'and the page has no inline script at all');
  ok(!csp.length && /\S/.test(await p.$eval('h1', e => e.textContent)), 'and runs under it', csp.slice(0, 2));
  await p.evaluate(() => { const i = document.createElement('img'); i.src = 'x:'; i.setAttribute('onerror', 'window.__h = 1'); document.body.appendChild(i); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !window.__h), 'an event handler put into the page does not run');
  await p.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inj = 1'; document.body.appendChild(s); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !window.__inj), 'a script put into the page does not run');
  const f = await b.newPage(); await f.setContent('<iframe src="http://127.0.0.1:8096/portal.html?demo" width="900" height="600"></iframe>'); await f.waitForTimeout(2500);
  ok(await f.frames()[1].evaluate(() => getComputedStyle(document.documentElement).display) === 'none', 'inside another site’s frame the portal shows nothing');

  // ---- what typed text is remembered
  const WEB = await require('./serve')(ROOT);
  const a = await b.newPage();
  await a.goto(WEB.base + 'scopedue_v68.html?test&lang=en'); await a.waitForTimeout(1500);
  await a.evaluate(() => {
    const f = document.createElement('form'); f.innerHTML = '<input id="t1"><input id="t2"><input id="t3" type="email"><input id="t4" autocomplete="one-time-code"><textarea id="t5"></textarea>'; document.body.appendChild(f);
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    set('t1', 'Design'); set('t2', 'ghp_aB3dE6gH9jK2mN5pQ8sT1vW4yZ7'); set('t3', 'someone@private.example'); set('t4', '482913'); set('t5', 'Can we move the call to Friday? My budget is tight.');
  });
  await a.waitForTimeout(300);
  const kept = await a.evaluate(() => JSON.parse(localStorage.getItem('sd.i18n.typed') || '[]'));
  ok(kept.includes('Design'), 'a typed word the dictionary could change is remembered, so it stays as written', kept);
  ok(!kept.some(x => /ghp_|private\.example|482913|budget/.test(x)), 'a token, an address, a code and a message are not', kept);
  ok(await a.evaluate(() => SDI18N.isUser('Can we move the call to Friday? My budget is tight.')), 'they still count as people’s words while the page is open');
  // what an earlier build kept is cleaned up on the next load
  await a.evaluate(() => localStorage.setItem('sd.i18n.typed', JSON.stringify(['Design', 'my secret message', '123456', 'a@b.example'])));
  await a.reload(); await a.waitForTimeout(1500);
  ok(JSON.stringify(await a.evaluate(() => JSON.parse(localStorage.getItem('sd.i18n.typed') || '[]'))) === '["Design"]', 'older kept text is pruned to what matters');
  await b.close(); WEB.close();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
