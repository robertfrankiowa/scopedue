// v113: the pulse end to end (CONTRACT.md 72): the app (Owner), the Viewer portal and the client portal against a real api.php on a
// fresh database. Each page asks for one number every 5 seconds and loads only when it moved, so what one side sends shows on the
// other within seconds, not at the next minute. F = scopedue_v68.html (default), scopedue-extension/app.html or
// subdomains/app/index.html. SD_PLAYWRIGHT, and php-server.js's.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PID = 'hr-tool', BAO = 'quoc.bao@corp.example';
const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return Date.now() - t0; await sleep(250); } return -1; };
(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8113, db: 'sd_pulse113', files: ['api.php', F, 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts', 'portal.html', 'portal-assets'].concat(F === 'scopedue_v68.html' ? [] : [path.dirname(F)]) });
  const b = await chromium.launch();
  try {
    const key = await S.account('Robert', 'robert@studio.example');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k]) => { try { if (!sessionStorage.getItem('x113')) { sessionStorage.setItem('x113', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: 'robert@studio.example', via: 'email' })); } } catch (e) {} }, [S.api, key]);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push('app: ' + e.message));
    const asks = []; A.on('request', r => { if (/[?&]r=\/v1\/pulse\b/.test(r.url()) && r.method() === 'GET') asks.push(Date.now()); });
    await A.goto(S.base + F + '?test'); await sleep(1500);
    const seeded = await A.evaluate(async ([pid, bao]) => {
      const d = { id: pid, n: 'HR tool', m: 'H', kind: 'private', phase: 1, team: [{ n: 'Quốc Bảo', e: bao, role: 'Viewer', c: '#3d5a8f', seen: '' }], ctx: [], log: [], mentions: [] };
      const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [{ k: 'project:' + pid, d }], ord: { project: ['project:' + pid] }, meta: {} }));
      if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
    }, [PID, BAO]);
    ok(seeded === 'ok', 'HR tool, private, with Quốc Bảo as a Viewer', seeded);
    const go = async tab => { await A.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [PID, tab]); await A.reload(); await sleep(1500); await A.waitForSelector('#pd-tab-' + tab, { timeout: 8000 }); await A.click('#pd-tab-' + tab); await sleep(400); };
    await go('feedback');
    await A.click('[data-pd="vp:open"]'); await sleep(1200);
    await A.click('[data-pd="vp:inv"][data-e="' + BAO + '"]'); await sleep(1200);
    const inv = S.lastTo(BAO);
    ok(inv && /viewer\.html#k=sdm_/.test(inv.body), 'the portal is open and Quốc Bảo has his link', inv && inv.subject);

    // ---------------------------------------------------------------- the app asks every 5 seconds, on any tab
    await go('workspace');
    const a0 = asks.length; await sleep(11000);
    const k = asks.length - a0;
    ok(k >= 2 && k <= 3, 'on Workspace (not Feedback) the app asks for the pulse about every 5 seconds', k);

    // ---------------------------------------------------------------- the Viewer portal
    const vctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
    const V = await vctx.newPage(); V.on('pageerror', e => errs.push('viewer: ' + e.message));
    const vload = [], vpulse = []; V.on('request', r => { const u = r.url(); if (/r=\/v1\/viewer\b/.test(u)) vload.push(Date.now()); if (/r=\/v1\/vpulse\b/.test(u)) vpulse.push(Date.now()); });
    await V.goto(inv.body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/)[0]); await sleep(1800);
    await V.check('#vw-f input[name="k"][value="req"]');
    await V.fill('#vw-f textarea[name="t"]', 'Export the report to Excel too');
    await V.click('#vw-f button[type="submit"]'); await sleep(300);
    const sent = Date.now(), l0 = vload.length;
    const got = await until(async () => ((await A.evaluate(id => window.__x8.out(id), PID)).fb || []).some(e => /Excel/.test(e.t || '')), 15000);
    ok(got >= 0 && got <= 9000, 'the Owner, on Workspace, has it within seconds (was: the next minute)', got);
    /* the Owner took it and published it again: the Viewer's page loads on its own, without waiting for its minute */
    const back = await until(async () => vload.length > l0 && /Export the report to Excel too/.test(await V.$eval('#vw-main', e => e.innerText)) && !/on its way/i.test(await V.$eval('#vw-main', e => e.innerText)), 20000);
    ok(back >= 0 && Date.now() - sent < 22000, 'the Viewer\'s portal shows it reached the Owner within seconds', [back, vload.length - l0, (await V.$eval('#vw-main', e => e.innerText)).slice(0, 900), S.my([S.db, '-N', '-e', 'SELECT entries FROM api_vprojects']).toString().slice(0, 400)]);
    const vp0 = vpulse.length, vl0 = vload.length; await sleep(11000);
    ok(vpulse.length - vp0 >= 2 && vload.length === vl0, 'the portal asks for its number every 5 seconds and loads nothing while it stays the same', [vpulse.length - vp0, vload.length - vl0]);

    // ---------------------------------------------------------------- the client portal
    await S.call(key, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await S.call(key, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    await S.call(key, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }] });
    const L = await S.link(key, { client: 'greenhome' });
    const cctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const C = await cctx.newPage(); C.on('pageerror', e => errs.push('client: ' + e.message));
    const cload = [], cpulse = []; C.on('request', r => { const u = r.url(); if (/r=\/v1\/portal\b/.test(u)) cload.push(Date.now()); if (/r=\/v1\/cpulse\b/.test(u)) cpulse.push(Date.now()); });
    await C.goto(S.base + 'portal.html' + L.j.url.slice(L.j.url.indexOf('#'))); await sleep(2500);
    ok(/GreenHome online store/.test(await C.evaluate(() => document.body.innerText)), 'Linh\'s portal opens on her project', (await C.evaluate(() => document.body.innerText)).slice(0, 200));
    await sleep(6000);
    const c0 = cload.length;
    ok(cpulse.length >= 1, 'it asks for its number', cpulse.length);
    await S.call(key, 'POST', '/v1/projects/shop/versions', { v: 2, terms: { price: 4500, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }, { id: 'b', sec: 'in', t: 'Gift cards' }] });
    const cg = await until(async () => cload.length > c0, 12000);
    ok(cg >= 0 && cg <= 7000, 'Robert issues Scope v2: her portal loads it within seconds (was: the next minute)', cg);
    ok(errs.length === 0, 'no script error', errs);
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); }
  finally { await b.close(); S.stop(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + (n - fails) + '/' + n);
  process.exit(fails ? 1 : 0);
})();
