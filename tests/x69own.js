// v69: own projects first (CONTRACT.md, section 30). The first run asks what you work on; My own projects keeps only the
// private samples and keeps the client pages out of the way until the first client; New project starts on Product.
// No server needed. SD_PLAYWRIGHT: the playwright package; SD_ROOT: the release folder (default: the folder above tests/).
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400))); if (!c) fails++; };
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const b = await chromium.launch(), errs = [];
  const T = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  const pids = p => p.evaluate(() => [...document.querySelectorAll('#pl-list .pl-item')].map(e => e.dataset.id));
  const nav = p => p.evaluate(() => [...document.querySelectorAll('#nav .nav-i')].filter(e => e.offsetParent).map(e => e.getAttribute('data-view')));
  const fresh = async (q, init) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(init || (() => { try { if (!localStorage.getItem('sd.lang')) localStorage.setItem('sd.lang', 'en'); } catch (e) {} }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(HTTP + F + q); await p.waitForTimeout(1500); return p;
  };
  const begin = async (p, w, s) => {
    await p.fill('#xa-n', 'Robert Frank'); await p.check('input[name="w"][value="' + w + '"]'); await p.check('input[name="s"][value="' + s + '"]');
    await p.click('.xa-go'); await p.waitForTimeout(800); await p.waitForLoadState('load'); await p.waitForTimeout(1800);
  };

  // ================================================================ the question
  const A = await fresh('?test&welcome');
  ok(/What are you working on\?/.test(await T(A, '.xa-w legend')), 'the welcome asks what you work on');
  ok(await A.$eval('input[name="w"][value="own"]', e => e.checked) && await A.evaluate(() => document.querySelector('.xa-w input').value === 'own'), 'My own projects comes first and is chosen');
  const line = () => A.evaluate(() => [...document.querySelectorAll('.xa-ch small[data-own], .xa-ch small[data-cl]')].filter(e => e.offsetParent).map(e => e.textContent).join(' | '));
  ok(/^Four private projects/.test(await line()), 'the sample line says four private projects', await line());
  await A.check('input[name="w"][value="client"]');
  ok(/^A small studio with clients/.test(await line()), 'Work for clients: the sample line is the studio', await line());
  ok(/The people you share a project with see it/.test(await T(A, '#xa-nh')), 'the name hint names no clients');
  await A.check('input[name="w"][value="own"]'); await A.click('.xa-go'); await A.waitForTimeout(200);
  ok(/the people you work with/.test(await T(A, '#xa-err')), 'a missing name is asked for in the new words');

  // ================================================================ own + samples
  await begin(A, 'own', 'sample');
  const ap = await pids(A);
  ok(!(await A.$('#xa-wl')) && ap.length === 4, 'My own projects with samples: four projects', ap);
  ok(await A.evaluate(() => [...document.querySelectorAll('#pl-list .pl-item')].every(e => !/Client/.test(e.innerText))) && !ap.includes('greenhome'), 'none of them a client project', ap);
  ok(/These projects are samples/.test(await T(A, '#toast-msg')), 'the welcome word comes after the page is drawn again');
  ok(await A.evaluate(() => document.documentElement.hasAttribute('data-noclients') && localStorage.getItem('sd-focus') === 'own' && localStorage.getItem('sd-nocl') === '1'), 'no client yet: the page knows, and so does boot.js');
  ok(JSON.stringify(await nav(A)) === JSON.stringify(['dashboard', 'projects', 'mywork']), 'the sidebar has no Clients and no Waiting on clients', await nav(A));
  ok(await A.$eval('#kpi-wait', e => !e.offsetParent), 'the Dashboard has no Waiting on clients figure');
  await A.click('.nav-i[data-view="settings"]'); await A.waitForTimeout(200); await A.click('#st-t-storage'); await A.waitForTimeout(300);
  ok(/4 projects/.test(await T(A, '#xa-sb')), 'Settings › Storage & data offers to clear the four', await T(A, '#xa-sb'));
  await A.reload(); await A.waitForTimeout(1500);
  ok(!(await A.$('#xa-wl')) && (await pids(A)).length === 4 && JSON.stringify(await nav(A)) === JSON.stringify(['dashboard', 'projects', 'mywork']), 'after a reload: no welcome, the same four, no client pages');

  // ================================================================ New project, and the first client
  await A.click('.nav-i[data-view="projects"]'); await A.waitForTimeout(200); await A.click('#npj-btn'); await A.waitForTimeout(500);
  const kinds = await A.evaluate(() => [...document.querySelectorAll('#npj-kinds .npj-kind')].map(e => e.dataset.k + (e.getAttribute('aria-checked') === 'true' ? '*' : '')));
  ok(JSON.stringify(kinds) === JSON.stringify(['private*', 'internal', 'client']), 'New project: Product chosen, Client last', kinds);
  await A.click('#npj-kinds [data-k="client"]'); await A.waitForTimeout(150);
  ok(!!(await A.$('#npj-note [data-xa="newc"]')), 'Client with no client yet offers Add a client');
  await A.click('#npj-note [data-xa="newc"]'); await A.waitForTimeout(700);
  ok(await A.evaluate(() => !!document.querySelector('#drawer-client-new.dr-live')), 'which opens New client');
  await A.fill('#cf-name', 'Acme Co'); await A.fill('#cf-contact', 'Jane Doe'); await A.fill('#cf-email', 'jane@acme.example');
  await A.evaluate(() => document.querySelector('#drawer-client-new form').requestSubmit()); await A.waitForTimeout(900);
  ok((await nav(A)).includes('clients') && (await nav(A)).includes('actions') && await A.evaluate(() => !document.documentElement.hasAttribute('data-noclients') && !localStorage.getItem('sd-nocl')), 'the first client brings the client pages back', await nav(A));
  await A.context().close();

  // ================================================================ the other ways in
  const B = await fresh('?test&welcome');
  await begin(B, 'client', 'sample');
  ok((await pids(B)).length === 8 && (await nav(B)).includes('clients'), 'Work for clients with samples: the whole studio, eight projects', await pids(B));
  await B.click('#npj-btn'); await B.waitForTimeout(500);
  ok(await B.evaluate(() => document.querySelector('#npj-kinds .npj-kind').dataset.k === 'client' && document.querySelector('#npj-kinds [data-k="client"]').getAttribute('aria-checked') === 'true'), 'and New project starts on Client, first, as before');
  await B.context().close();

  const C = await fresh('?test&welcome');
  await begin(C, 'own', 'empty');
  ok((await pids(C)).length === 0 && JSON.stringify(await nav(C)) === JSON.stringify(['dashboard', 'projects', 'mywork']), 'My own projects, empty: nothing, and no client pages');
  await C.context().close();

  const D = await fresh('?test', () => { try { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'sample'); } catch (e) {} });
  ok((await pids(D)).length === 8 && (await nav(D)).includes('clients') && (await nav(D)).includes('actions'), 'a workspace from before v69 (no answer kept) is as it was');
  await D.context().close();

  // ================================================================ in Vietnamese
  const V = await fresh('?test&welcome', () => { try { localStorage.setItem('sd.lang', 'vi'); } catch (e) {} });
  const vt = await T(V, '#xa-you');
  ok(/Bạn đang làm gì\?/.test(vt) && /Dự án của riêng tôi/.test(vt) && /Làm cho khách hàng/.test(vt) && /Bốn dự án riêng/.test(vt) && !/My own projects|Work for clients|Four private/.test(vt), 'the welcome in Vietnamese', vt.slice(0, 300));
  await V.context().close();

  ok(!errs.length, 'no page errors', errs);
  await b.close(); WEB.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
