// Security: every text the studio or the client can write, filled with markup that runs script if it is ever put into the page
// as HTML, then the live portal clicked through (every button, every drawer, every dialog) in English and in Vietnamese.
// Nothing may run and no element may be injected. v101: on php-server.js (a fresh api.php and database), SD_PLAYWRIGHT and its settings.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let S, API, call, mails;
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };
const PW = 'xss68-pass-123';   // sign-up asks for a password since api.php moved to the site's users table
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email, password: PW, password_confirm: PW });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}
// markup that runs if it is parsed as HTML, in an attribute with either quote, or in a URL
let N = 0; const X = (s) => s + ' "><img src=x data-xss onerror="window.__xss=(window.__xss||[]).concat(' + (++N) + ')">\'><svg data-xss onload="window.__xss=(window.__xss||[]).concat(' + N + ')"></svg>';
const sh = t => X(t).slice(0, 230);

(async () => {
  S = await require('./php-server')({ root: ROOT, port: 8096, db: 'sd_xss68', files: ['api.php', 'portal.html', 'portal-assets'] });
  API = S.api; mails = S.mails;
  call = async (key, m, p, body) => S.call(key, m, p, body);
  const key = await account('Maya', 'maya@studio.example');
  let r = await call(key, 'PUT', '/v1/studio', { name: X('Maya').slice(0, 80), biz: X('Biz').slice(0, 80), title: X('Ti').slice(0, 100), city: X('C').slice(0, 80), bio: X('Bio'), phone: '+1 "><b>', se: true, sp: true, sl: true });
  ok(r.s === 200, 'studio profile full of markup is stored as text', r.j);
  ok((await call(key, 'PUT', '/v1/clients/acme', { name: X('Acme').slice(0, 100), contact: X('Tom').slice(0, 100), email: 'tom@acme.example', role: X('R').slice(0, 80) })).s < 300, 'client with markup');
  ok((await call(key, 'PUT', '/v1/projects/site', { client: 'acme', name: X('Site').slice(0, 100), shared: [{ title: X('Copy').slice(0, 120), kind: X('k').slice(0, 30), date: '1 Oct', fp: 'abcd·ef01·2345' }] })).s < 300, 'project and shared copy with markup');
  const rules = { dep: 20, pd: 7, rpm: 2, free: 1, rate: 50, min: 1, review: 3, silence: 5, dormant: 30, cure: 5, own: 1, meth: X('m').slice(0, 80), doc: 'https://doc.example/\'onmouseover=\'window.__xss=1' };
  const d = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  r = await call(key, 'POST', '/v1/projects/site/versions', { v: 1, terms: { price: 5000, rev: null, fv: 2, r: rules }, items: [
    { id: 'm1', sec: 'tl', t: sh('Milestone'), d: d(5), pay: 40 }, { id: 'm2', sec: 'tl', t: sh('Second'), d: d(20), pay: 40 },
    { id: 'a', sec: 'in', t: sh('Deliverable'), ok: X('Done').slice(0, 160), m: 'm1' }, { id: 'b', sec: 'in', t: sh('Other'), m: 'm2' },
    { id: 'c', sec: 'out', t: sh('Out') }, { id: 'ci1', sec: 'ci', t: sh('Photos'), d: d(2) }] });
  ok(r.s === 201, 'Scope v1 (milestones, deliverables, what the client provides) with markup', r.j);

  // the client: a session, approve v1, write everywhere it can
  const link = (await S.link(key, { client: 'acme' })).j.url;
  const sess = (await call(null, 'POST', '/v1/session', { token: link.split('&k=')[1] })).j.session;
  let c = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'site', v: 1 });
  let code = mails().reverse().find(m => m.to === 'tom@acme.example').body.match(/\b\d{6}\b/)[0];
  ok((await call(sess, 'POST', '/v1/approve', { challenge: c.j.challenge, code })).s === 200, 'the client approves v1');
  ok((await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'site', title: X('Req').slice(0, 80), tx: X('Please') })).s === 201, 'a change request with markup');
  ok((await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'site', tx: X('Q') })).s === 201, 'a question with markup');
  ok((await call(key, 'POST', '/v1/projects/site/requests/CR-001/entries', { n: 1, ty: 'quote', tx: X('Quote'), amt: 300, days: 2, vu: Date.now() + 7 * 86400000 })).s === 201, 'a quote with markup');
  ok((await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'site', cr: 'CR-001', on: 1, tx: 'See the picture', files: [{ name: X('pic').slice(0, 80), type: 'image/jpeg', data: Buffer.from('a picture').toString('base64') }] })).s === 201, 'v102 (59): a picture whose name is markup');
  ok((await call(key, 'POST', '/v1/projects/site/requests/CR-002/entries', { n: 1, ty: 'note', tx: X('Answer') })).s === 201, 'an answer with markup');
  ok((await call(key, 'POST', '/v1/projects/site/events', { n: 0, ty: 'deliver', m: 'm1', tx: X('Here'), link: 'https://x.example/\'onmouseover=\'window.__xss=1' })).s < 300, 'a delivery with markup and a quote in its link');
  ok((await call(sess, 'POST', '/v1/respond', { action: 'changes', project: 'site', m: 'm1', n: 1, tx: X('Fix') })).s === 201, 'changes asked with markup');
  // v123: the words as a person types them, with no marker: they must be on the page as text, tags and all
  const RAW = '<b>đậm</b><img src=x onerror=alert(1)>';
  ok((await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'site', tx: 'Hỏi ' + RAW })).s === 201, 'v123: a question in the client’s own markup');

  const b = await chromium.launch();
  for (const lang of ['en', 'vi']) {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, locale: lang === 'vi' ? 'vi-VN' : 'en-US' });
    await ctx.addInitScript(l => { try { localStorage.setItem('sd.lang', l); } catch (e) {} }, lang);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', dlg => { errs.push('dialog ' + dlg.message()); dlg.dismiss(); });
    const l2 = (await S.link(key, { client: 'acme' })).j.url;
    await p.goto(l2); await p.waitForTimeout(3500);
    const check = async where => {
      const x = await p.evaluate(() => ({ ran: window.__xss || [], el: document.querySelectorAll('[data-xss]').length, href: [...document.querySelectorAll('a[href]')].filter(a => /^\s*javascript:/i.test(a.getAttribute('href'))).length }));
      if (x.ran.length || x.el || x.href) ok(false, 'nothing injected: ' + where, x);
    };
    await p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<img src=x data-xss onerror="window.__xss=[0]">')); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelectorAll('[data-xss]').length === 1), 'the check catches markup that does get in (' + lang + ')');
    ok(await p.evaluate(() => !(window.__xss || []).length), 'and even then its handler does not run: the portal’s CSP blocks it (' + lang + ')');
    await p.evaluate(() => { window.__xss = []; document.querySelectorAll('[data-xss]').forEach(e => e.remove()); });
    ok(/Site/.test(await p.evaluate(() => document.body.innerText)), 'the portal shows the project (' + lang + ')');
    await check('first view');
    const seen = new Set();
    for (let round = 0; round < 3; round++) {
      const acts = await p.$$eval('[data-a]', l => l.filter(x => x.offsetParent && !x.disabled).map((x, i) => x.getAttribute('data-a') + '|' + i));
      for (const a of acts) {
        const [name] = a.split('|'); if (['signout', 'lang', 'dreset', 'approve', 'confirm'].includes(name) || seen.has(a)) continue; seen.add(a);
        await p.evaluate(a => { const [n, i] = a.split('|'); const el = [...document.querySelectorAll('[data-a]')].filter(x => x.offsetParent && !x.disabled)[+i]; if (el && el.getAttribute('data-a') === n) el.click(); }, a);
        await p.waitForTimeout(350); await check(lang + ' ' + a);
        await p.mouse.move(200 + (round * 37) % 600, 300); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      }
    }
    // hover every link, in case one carries an attribute of its own
    for (const a of await p.$$('a')) { await a.hover().catch(() => {}); }
    await check(lang + ' after hovering links');
    ok(true, 'portal in ' + lang + ': ' + seen.size + ' buttons clicked, nothing ran, nothing injected');
    // v123: the question is shown as written (opened where it is), and no <b>đậm</b> or <img src=x> was made of it
    await p.goto(l2); await p.waitForTimeout(3000);
    let raw = false;
    for (const a of await p.$$eval('[data-a]', l => l.filter(x => x.offsetParent && !x.disabled).map((x, i) => x.getAttribute('data-a') + '|' + i))) {
      const [nm] = a.split('|'); if (['signout', 'lang', 'dreset', 'approve', 'confirm'].includes(nm)) continue;
      const t = await p.evaluate(() => ({ t: document.body.innerText, b: [...document.querySelectorAll('b,strong')].filter(e => e.textContent === 'đậm').length, img: document.querySelectorAll('img[src="x"]').length }));
      if (t.b || t.img) ok(false, 'v123: nothing made of the raw words (' + lang + ' ' + a + ')', t);
      if (t.t.includes('Hỏi <b>đậm</b><img src=x onerror=alert(1)>')) { raw = true; break; }
      await p.evaluate(a => { const [n, i] = a.split('|'); const el = [...document.querySelectorAll('[data-a]')].filter(x => x.offsetParent && !x.disabled)[+i]; if (el && el.getAttribute('data-a') === n) el.click(); }, a);
      await p.waitForTimeout(300);
    }
    if (!raw) raw = (await p.evaluate(() => document.body.innerText)).includes('Hỏi <b>đậm</b><img src=x onerror=alert(1)>');
    ok(raw, 'v123: the client’s question is shown as written, tags and all (' + lang + ')');
    ok(!errs.length, 'no page errors (' + lang + ')', errs);
    await ctx.close();
  }
  await b.close(); S.stop();
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
