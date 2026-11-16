// v114: someone taken off a project (CONTRACT.md 73), the app against a real api.php on a fresh database.
// The Owner's device: a Viewer of the portal taken off (Undo first, then for real) stays let in while Undo is offered, then the
// server takes them off and emails them, and their open page is told; the last Viewer leaving is pushed too. An Editor's removal
// (`left`) waits on the device while the server cannot be reached. The removed person's device: the project the Owner's account
// says they were taken off goes, with its keys and record, and the bell says so; one said by another account stays.
// F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html. SD_PLAYWRIGHT, and php-server.js's.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROB = 'robert@studio.example', BAO = 'quoc.bao@corp.example', LAN = 'lan@corp.example', MAI = 'mai@corp.example';
const PID = 'hr-tool', FID = '1AbCdEfGhIjKlMnOp_q-r', FID2 = '1ZyXwVuTsRqPoNmLk_j-i', FID3 = '1CoPyOfRoBeRtS_p-q', FID4 = '1LaNsOwNpRoJeC_s-t', FID5 = '1AnOtHeRcOpY_u-v';
(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8114, db: 'sd_gone114', files: ['api.php', F, 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'].concat(F === 'scopedue_v68.html' ? [] : [path.dirname(F)]) });
  const b = await chromium.launch();
  const page = async (key, email, tag) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(([api, k, e, t]) => { try { if (!sessionStorage.getItem(t)) { sessionStorage.setItem(t, '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: e, via: 'email' })); } } catch (x) {} }, [S.api, key, email, tag]);
    const p = await ctx.newPage(); p.on('pageerror', x => errs.push(tag + ': ' + x.message + ' @ ' + String(x.stack).split('\n').slice(1, 4).join(' / '))); p._ctx = ctx;
    await p.goto(S.base + F + '?test'); await sleep(1500);
    return p;
  };
  const seed = (p, projects, clients) => p.evaluate(async ([ps, cs]) => {
    const ent = ps.map(d => ({ k: 'project:' + d.id, d })).concat((cs || []).map(c => ({ k: 'client:' + c.id, d: c })));
    const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent, ord: { project: ps.map(d => 'project:' + d.id) }, meta: {} }));
    if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
  }, [projects, clients]);
  const proj = (id, name, people, extra) => Object.assign({ id, n: name, m: name[0], kind: 'private', phase: 1, team: people.map(([nm, e, role], i) => ({ n: nm, e, role, c: ['#3d5a8f', '#5b4a8a', '#2f6b4f'][i % 3], seen: '' })), ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now() }, extra || {});
  try {
    const rob = await S.account('Robert', ROB), lan = await S.account('Lan', LAN), mai = await S.account('Mai', MAI);
    const sent = e => S.mails().filter(m => m.to === e).length;

    // ================================================================ the Owner: a Viewer of the portal taken off
    const A = await page(rob, ROB, 'own');
    ok(await seed(A, [proj(PID, 'HR tool', [['Quốc Bảo', BAO, 'Viewer'], ['Lan Anh', LAN, 'Editor']])]) === 'ok', 'HR tool, private: Quốc Bảo its only Viewer, Lan Anh an Editor');
    const go = async tab => { await A.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [PID, tab]); await A.reload(); await sleep(1500); await A.waitForSelector('#pd-tab-' + tab, { timeout: 8000 }); await A.click('#pd-tab-' + tab); await sleep(400); };
    await go('team');
    await A.click('li.pd-m [data-pd="vp:inv"][data-e="' + BAO + '"]'); await sleep(1500);
    ok(sent(BAO) === 1, 'Quốc Bảo is sent his link (the portal opens)', sent(BAO));
    const bao = (await S.call(null, 'POST', '/v1/vsession', { token: S.lastTo(BAO).body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] })).j.session;
    ok((await S.call(bao, 'GET', '/v1/viewer')).s === 200, 'and opens it');
    const vctx = await b.newContext({ viewport: { width: 390, height: 844 } }), V = await vctx.newPage();
    await vctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    V.on('pageerror', x => errs.push('portal: ' + x.message));
    await V.goto(S.lastTo(BAO).body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/)[0]); await sleep(1800);
    const vt = () => V.$eval('#vw-t', e => e.textContent);
    ok(/HR tool/.test(await vt()), 'his portal page is open, on a phone', await vt());
    const rmBao = () => A.click('#pd-panel [data-pd="rm"][aria-label="Remove Quốc Bảo from this project"]');
    await rmBao(); await sleep(300); await A.click('#toast-undo'); await sleep(16000);
    ok((await S.call(bao, 'GET', '/v1/viewer')).s === 200 && sent(BAO) === 1, 'removed, then Undo: he is still let in, and gets no email');
    await go('team'); await rmBao(); await sleep(2500);
    ok((await S.call(bao, 'GET', '/v1/viewer')).s === 200, 'removed: while Undo is offered he is still let in');
    await sleep(15000);
    const gone = await S.call(bao, 'GET', '/v1/viewer'), m = S.lastTo(BAO);
    ok(gone.s === 403 && gone.j.error.code === 'removed', 'then, though he was the last Viewer, the server takes him off and his page is told', gone.j);
    await sleep(6000);
    const vb = await V.$eval('#vw-body', e => e.innerText);
    ok(await vt() === 'No longer shared with you' && /You can no longer see this project/.test(vb) && !(await V.$('#vw-lf')), 'his open page says the team stopped sharing it, shows nothing of it, and offers no new link', [await vt(), vb.slice(0, 200)]);
    ok(await V.evaluate(() => !localStorage.getItem('sd-vw-last') && !sessionStorage.length), 'and the browser keeps nothing that leads back to it');
    await V.reload(); await sleep(1500);
    ok(!/HR tool/.test(await V.$eval('body', e => e.innerText)), 'a reload shows nothing of it either');
    ok(sent(BAO) === 2 && /^(Robert|robert@studio\.example) stopped sharing HR tool with you$/.test(m.subject), 'and he is emailed', m && m.subject);
    await sleep(9000);
    ok(sent(BAO) === 2, 'once');

    // ================================================================ an Editor's removal waits while the server cannot be reached
    const WD = u => decodeURIComponent(String(u)).includes('/v1/invites/withdraw');
    const lan0 = sent(LAN);   /* her sign-up code */
    await A.route(WD, r => r.abort());
    await A.evaluate(([f, e]) => window.__ti.withdraw(f, e, 'HR tool'), [FID, LAN]); await sleep(1500);
    const rows = () => S.my([S.db, '-N', '-e', "SELECT COUNT(*) FROM api_invites WHERE removed_at IS NOT NULL AND email = '" + LAN + "'"]).toString().trim();
    ok(rows() === '0' && sent(LAN) === lan0, 'offline: nothing reaches the server', [rows(), sent(LAN) - lan0]);
    await A.unroute(WD);
    await A.evaluate(() => window.__ti.pull()); await sleep(1500);
    const ml = S.lastTo(LAN);
    ok(rows() === '1' && sent(LAN) === lan0 + 1 && /^(Robert|robert@studio\.example) stopped sharing HR tool with you$/.test(ml.subject), 'back online: it goes at the next look, and Lan Anh is emailed', [rows(), ml && ml.subject]);
    await A.evaluate(() => window.__ti.pull()); await sleep(1000);
    ok(sent(LAN) === lan0 + 1, 'and not again');
    await S.call(mai, 'POST', '/v1/invites/withdraw', { fid: FID2, email: LAN, left: true, project: 'Planter' });

    // ================================================================ the removed person's device
    const L = await page(lan, LAN, 'lan');
    const dv = (fid, pid) => ({ fid, oid: 'of-' + pid, pid, gen: 1, owner: ROB, oname: 'Robert', role: 'Editor', mine: 'm-' + pid, slots: {}, last: Date.now(), st: 'ok', msg: '', name: '' });
    /* v115 (75): an Owner's dv (no role). Robert's own copies on her device (a backup brought in, or the device used by him before),
       and Garden, hers in Drive, whose folder Robert's account names too */
    const own = (fid, pid, owner, slots) => ({ fid, oid: 'of-' + pid, pid, gen: 1, owner, last: Date.now(), st: 'ok', msg: '', name: '', slots });
    await S.call(rob, 'POST', '/v1/invites/withdraw', { fid: FID3, email: LAN, left: true, project: 'Roadmap' });
    await S.call(rob, 'POST', '/v1/invites/withdraw', { fid: FID4, email: LAN, left: true, project: 'Garden' });
    const sl = await seed(L, [proj('dv-hr', 'HR tool', [['Robert', ROB, 'Owner'], ['Lan Anh', LAN, 'Editor']], { dv: dv(FID, 'p1') }), proj('dv-pl', 'Planter', [['Robert', ROB, 'Owner'], ['Lan Anh', LAN, 'Editor']], { dv: dv(FID2, 'p2') }), proj('mine', 'My own', []),
      proj('cp-rm', 'Roadmap', [['Lan Anh', LAN, 'Editor'], ['Quốc Bảo', BAO, 'Editor']], { dv: own(FID3, 'p3', ROB, { [LAN]: 'm-p3', [BAO]: 'b-p3' }) }),
      proj('cp-br', 'Brochure', [['Lan Anh', LAN, 'Editor'], ['Quốc Bảo', BAO, 'Editor']], { dv: own(FID5, 'p5', ROB, { [LAN]: 'm-p5', [BAO]: 'b-p5' }) }),
      proj('own-gd', 'Garden', [['Quốc Bảo', BAO, 'Editor']], { dv: own(FID4, 'p4', LAN, { [BAO]: 'b-p4' }) })]);
    ok(sl === 'ok', 'Lan Anh\'s device: HR tool and Planter shared with her by Robert, a project of her own, Robert\'s own copies of Roadmap and Brochure, and Garden, hers in Drive', sl);
    const puts = []; L.on('request', q => { if (q.method() === 'PUT' && decodeURIComponent(q.url()).includes('/v1/invites')) puts.push(q.postData()); });
    await L.reload(); await sleep(2500);
    ok((await L.evaluate(() => window.__drv.sync.state().kept.map(p => p.id))).sort().join() === 'cp-br,cp-rm,dv-hr,dv-pl,own-gd', 'all five are here before her app looks');
    await L.evaluate(() => window.__ti.pull()); await sleep(2500);
    const ids = await L.evaluate(() => window.__drv.sync.state().kept.map(p => p.id));
    const names = await L.evaluate(() => [...document.querySelectorAll('.proj-link')].map(a => a.textContent).join(' | '));
    ok(!ids.includes('dv-hr') && !/HR tool/.test(names), 'HR tool, which Robert\'s account says she was taken off, is gone from her device', [ids, names]);
    ok(ids.includes('dv-pl'), 'Planter stays: the removal came from another account than its Owner\'s, and Drive cannot be asked', ids);
    ok(!ids.includes('cp-rm') && !/Roadmap/.test(names), 'Roadmap, Robert\'s own copy of the project his account took her off, is gone too', [ids, names]);
    ok(ids.includes('own-gd') && ids.includes('cp-br'), 'Garden, her own, stays though Robert\'s account named its folder; Brochure, which nobody took her off, stays', ids);
    const robs = puts.filter(b => b.includes(FID3) || b.includes(FID5)), hers = puts.filter(b => b.includes(FID4));
    ok(!robs.length && hers.length, 'her device invites nobody to Robert\'s projects in her name (to Garden, hers, it does)', puts);
    ok(/(Robert|robert@studio\.example) stopped sharing HR tool with you\. It is no longer on this device\./.test(await L.$eval('#toast-msg', e => e.textContent)), 'the toast says so', await L.$eval('#toast-msg', e => e.textContent));
    await L.click('#bell'); await sleep(500);
    const bell = await L.$eval('#notif', e => e.textContent);
    ok(/(Robert|robert@studio\.example) stopped sharing HR tool with you/.test(bell) && /no longer on your devices/.test(bell), 'the bell says who stopped sharing it', bell.slice(0, 300));
    await L.reload(); await sleep(2500);
    const after = await L.evaluate(() => window.__drv.sync.state().kept.map(p => p.id));
    ok(!after.includes('dv-hr') && !after.includes('cp-rm'), 'and neither comes back after a reload', after);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); } finally { await b.close(); S.stop(); }
  console.log(`\n${n - fails}/${n} passed`);
  process.exit(fails ? 1 : 0);
})();
