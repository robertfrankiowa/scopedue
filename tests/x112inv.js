// v112: invitation emails for Viewers (CONTRACT.md 69), the app against a real api.php on a fresh database. On a private project,
// making someone a Viewer opens the Viewer portal if it is closed and sends their link, once the toast's Undo has passed; an Undo in
// time sends nothing.
// F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html. SD_PLAYWRIGHT, and php-server.js's.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PID = 'hr-tool', BAO = 'quoc.bao@corp.example', LAN = 'lan@corp.example', MAI = 'mai@corp.example';
(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8112, db: 'sd_inv112', files: ['api.php', F].concat(F === 'scopedue_v68.html' ? [] : [path.dirname(F)]) });
  const b = await chromium.launch();
  try {
    const key = await S.account('Robert', 'robert@studio.example');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k]) => { try { if (!sessionStorage.getItem('x112')) { sessionStorage.setItem('x112', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: 'robert@studio.example', via: 'email' })); } } catch (e) {} }, [S.api, key]);
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push('app: ' + e.message));
    await A.goto(S.base + F + '?test'); await sleep(1500);
    const seeded = await A.evaluate(async ([pid, people]) => {
      const d = { id: pid, n: 'HR tool', m: 'H', kind: 'private', phase: 1, team: people.map(([n, e, role], i) => ({ n, e, role, c: ['#3d5a8f', '#5b4a8a', '#2f6b4f'][i], seen: '' })), ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now() };
      const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [{ k: 'project:' + pid, d }], ord: { project: ['project:' + pid] }, meta: {} }));
      if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
    }, [PID, [['Quốc Bảo', BAO, 'Viewer'], ['Lan Anh', LAN, 'Editor'], ['Mai', MAI, 'Editor']]]);
    ok(seeded === 'ok', 'HR tool, private: Quốc Bảo a Viewer, Lan Anh and Mai Editors', seeded);
    const go = async tab => { await A.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [PID, tab]); await A.reload(); await sleep(1500); await A.waitForSelector('#pd-tab-' + tab, { timeout: 8000 }); await A.click('#pd-tab-' + tab); await sleep(400); };
    const toast = () => A.$eval('#toast-msg', e => e.textContent);
    const role = async (i, r) => { await A.selectOption('select[data-pd-role="' + i + '"]', r); await sleep(300); };
    const idx = e => A.evaluate(([id, e]) => window.__x8.out(id).team.findIndex(m => m.e === e), [PID, e]);
    const sent = e => S.mails().filter(m => m.to === e).length;

    // ---------------------------------------------------------------- the portal closed: inviting a Viewer opens it
    const vprojects = () => S.my([S.db, '-N', '-e', 'SELECT COUNT(*) FROM api_vprojects']).toString().trim();
    await go('team');
    await role(await idx(LAN), 'Viewer');
    ok(/^Lan Anh is now a Viewer$/.test(await toast()), 'the toast is the usual one, with Undo', await toast());
    await sleep(2500); ok(sent(LAN) === 0 && vprojects() === '0', 'while Undo is offered nothing goes, nothing of the project is on the server');
    await sleep(6000);
    const l = S.lastTo(LAN);
    ok(vprojects() === '1' && sent(LAN) === 1 && /asks for your view on HR tool/.test(l.subject) && /#k=sdm_/.test(l.body), 'then the portal opens by itself and Lan Anh gets her link', [vprojects(), l && l.subject]);
    ok(sent(BAO) === 0, 'Quốc Bảo, a Viewer from before, is not emailed by it (Invite, in Feedback)', sent(BAO));
    await go('feedback');
    ok(/Open/.test(await A.$eval('.vp-card .chip', e => e.textContent)), 'Feedback shows the portal open');
    const acts = (await A.evaluate(id => window.__x8.out(id).log || [], PID)).map(x => x.t || x.tx || JSON.stringify(x)).join(' | ');
    ok(/You opened the Viewer portal/.test(acts) && /You sent Lan Anh a link to the Viewer portal/.test(acts), 'Activity says the portal opened and the link went', acts.slice(0, 300));

    // ---------------------------------------------------------------- the portal open
    await go('team');
    await role(await idx(MAI), 'Viewer');
    ok(/^Mai is now a Viewer$/.test(await toast()), 'portal open: the toast is the usual one, with Undo', await toast());
    await sleep(2500); ok(sent(MAI) === 0, 'nothing goes while Undo is offered');
    await sleep(6000);
    const m = S.lastTo(MAI);
    ok(sent(MAI) === 1 && /asks for your view on HR tool/.test(m.subject) && /#k=sdm_/.test(m.body), 'then Mai gets her link to the Viewer portal by herself', m && m.subject);
    ok(/^Link sent to Mai$/.test(await toast()), 'and the toast says so', await toast());
    const inv = S.my([S.db, '-N', '-e', "SELECT invited_at IS NOT NULL FROM api_viewers WHERE email = '" + MAI + "'"]).toString().trim();
    ok(inv === '1' && sent(BAO) === 0 && sent(LAN) === 1, 'only Mai: the Viewers already on the project are not emailed again by it', [inv, sent(BAO), sent(LAN)]);

    // ---------------------------------------------------------------- a Viewer's row in Members
    const tok = S.lastTo(LAN).body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1];
    ok((await S.call(null, 'POST', '/v1/vsession', { token: tok })).s === 200, 'Lan Anh opens her link');
    await go('team'); await sleep(9500);
    const row = e => A.evaluate(e => { const li = [...document.querySelectorAll('li.pd-m')].find(x => x.textContent.includes(e)); const s = li && li.querySelector('.pd-m-dv'); return s ? { t: s.firstChild.textContent, ok: s.firstChild.classList.contains('ok'), b: (s.querySelector('button') || {}).textContent || '' } : null; }, e);
    const rl = await row(LAN), rm = await row(MAI), rb = await row(BAO);
    ok(rl && /^Opened the portal \d+ \S+$/.test(rl.t) && rl.ok && rl.b === 'Send the link again', 'Members: Lan Anh opened the portal (green), with Send the link again', rl);
    ok(rm && /^Invited \d+ \S+$/.test(rm.t) && !rm.ok && rm.b === 'Send the link again', 'Members: Mai is invited', rm);
    ok(rb && rb.t === 'Not invited yet' && rb.b === 'Invite', 'Members: Quốc Bảo, a Viewer from before, is not invited yet, with Invite', rb);
    await A.click('li.pd-m [data-pd="vp:inv"][data-e="' + BAO + '"]'); await sleep(1500);
    const rb2 = await row(BAO);
    ok(sent(BAO) === 1 && rb2 && /^Invited /.test(rb2.t), 'Invite from Members sends Quốc Bảo his link, and his row says Invited', [sent(BAO), rb2]);

    await role(await idx(MAI), 'Editor'); await sleep(500);
    await role(await idx(MAI), 'Viewer');
    await sleep(8000);
    ok(sent(MAI) === 1, 'made a Viewer again after being invited: no second email (Send the link again is in Feedback)', sent(MAI));

    await role(await idx(BAO), 'Editor'); await sleep(500); const before = sent(BAO);
    await role(await idx(BAO), 'Viewer');
    await A.click('#toast-undo'); await sleep(8000);
    ok(sent(BAO) === before && await A.evaluate(([id, e]) => window.__x8.out(id).team.find(m => m.e === e).role, [PID, BAO]) === 'Editor', 'Undo in time: Quốc Bảo stays an Editor and gets nothing', sent(BAO));
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); } finally { await b.close(); S.stop(); }
  console.log(`\n${n - fails}/${n} passed`);
  process.exit(fails ? 1 : 0);
})();
