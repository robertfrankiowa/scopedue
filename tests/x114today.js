// v114: two fixes from the manual test report (CONTRACT.md 74), in Vietnamese. M4: a project's next step in Today follows the step
// the project has now, so once it changed, Today shows the new one and checking it there marks it done in the project too; Undo puts
// both back. Gate: a reason the app wrote into an item ruled out (It breaks a principle you wrote down: …) reads in Vietnamese, in the
// Never list and in its history, while one a person typed stays as typed; what needs you in Today reads in Vietnamese too.
// No server (scopedue.com answers 503). F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REASON = 'It breaks a principle you wrote down: “Không phải app hẹn hò”.', MINE = 'Không hợp với người dùng hiện tại.';
(async () => {
  const WEB = await require('./serve')(ROOT);
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('x114t')) { sessionStorage.setItem('x114t', '1'); localStorage.setItem('sd.lang', 'vi'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_offline', email: 'robert@studio.example', via: 'email' })); } } catch (e) {} });
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto(WEB.base + F + '?test'); await sleep(2500);
    const mk = (id, nm, next) => ({ id, n: nm, m: nm[0], kind: 'private', phase: 1, team: [], ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now(), next });
    const put = ps => A.evaluate(async ps => { const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: ps.map(d => ({ k: 'project:' + d.id, d })), ord: { project: ps.map(d => 'project:' + d.id) }, meta: {} })); if (!r.ok) return r.msg; await SDB.replaceAll(r.backup); return 'ok'; }, ps);
    ok(await put([mk('dc', 'Đi Cùng', 'Bước cũ'), mk('b', 'Beta', 'Bước B'), mk('g', 'Gamma', 'Bước G')]) === 'ok', 'three private projects, each with a next step');
    await A.reload(); await sleep(2000);
    /* a principle written on Decisions, as a person does */
    await A.evaluate(() => { location.hash = '#pj-dc-decisions'; }); await A.reload(); await sleep(2000);
    await A.fill('#prv-pa', 'Không phải app hẹn hò'); await A.click('#pd-panel form[data-pd-form="prv:princ"] [type="submit"]'); await sleep(800);
    /* the Gate's own reason and a typed one, on two items ruled out, as the app keeps them */
    const added = await A.evaluate(async ([why, mine]) => {
      await SDB.save(); const bk = await SDB.exportAll(), e = bk.ent.find(x => x.k === 'project:dc'), pv = e.d.pv, now = Date.now();
      if (!pv) return 'no pv: ' + Object.keys(e.d).join(',') + ' / ' + bk.ent.map(x => x.k).join(',');
      const pr = (pv.princ || []).find(x => x.t === 'Không phải app hẹn hò'); if (!pr) return 'no principle';
      const item = (id, t, w, viol) => ({ id, sec: 'out', t, why: w, st: 'planned', ts: now, size: 'M', nj: 0, ov: 0, nwhy: '', gate: { ship: 'weak', viol, th: '', v: 'out', ov: 0, ovw: '', ts: now }, rvn: 0, rvd: 0, rs: 0, rsl: 0, rid: '', as: '', stk: '', lg: [{ ts: now, k: 'new', to: 'out', why: w }] });
      pv.items.push(item('i91', 'Vuốt để ghép đôi', why, pr.id), item('i92', 'Chấm điểm ngoại hình', mine, 'none'));
      const r = SDB.parseBackup(JSON.stringify(bk)); if (!r.ok) return r.msg; await SDB.replaceAll(r.backup); return 'ok';
    }, [REASON, MINE]);
    ok(added === 'ok', 'Đi Cùng has Vuốt để ghép đôi ruled out by the Gate (its reason) and Chấm điểm ngoại hình ruled out by hand', added);
    await A.reload(); await sleep(2000);

    // ================================================================ Gate: the app's reason in Vietnamese
    await A.evaluate(() => { location.hash = '#pj-dc-scope'; }); await A.reload(); await sleep(2000);
    const scope = await A.$eval('#pd-panel', e => e.innerText);
    ok(/Nó phá một nguyên tắc bạn đã viết: “Không phải app hẹn hò”\./.test(scope) && !/It breaks a principle/.test(scope), 'Never: the Gate\'s reason for Vuốt để ghép đôi reads in Vietnamese', scope.slice(scope.indexOf('Vuốt') - 50, scope.indexOf('Vuốt') + 200));
    ok(scope.includes(MINE), 'the reason typed for Chấm điểm ngoại hình stays as typed');

    // ================================================================ M4: Today follows the project's next step
    const text = sel => A.$eval(sel, e => e.innerText.split(String.fromCharCode(10)).filter(Boolean).join(' | '));
    await A.evaluate(() => { location.hash = '#dashboard'; }); await A.reload(); await sleep(2000);
    await A.click('#td-body [data-x6="plan"]'); await sleep(600);
    const dr = await text('#td-dbody');
    // CONTRACT 127: Needs you is what Priority attention lists; a small nudge such as Decide what is in Now stays on its project
    ok(!/Quyết định những gì nằm trong Bây giờ|Decide what is in Now/.test(dr) && /Bước G/.test(dr), 'the plan offers the next steps, not the small nudges (CONTRACT 127)', dr.slice(0, 300));
    const pick = async v => { await A.locator('#td-dbody li.td-p:has(input[value="' + v + '"]) label').click(); await sleep(250); };
    for (const v of ['next:dc', 'next:b', 'next:g']) await pick(v);
    await A.click('#td-set'); await sleep(800);
    let td = await text('#td-body');
    ok(/Bước cũ/.test(td) && /Bước B/.test(td) && /Bước G/.test(td) && /Bước tiếp theo/.test(td) && !/Next step/.test(td), 'Today: three next steps, in Vietnamese', td);
    await A.evaluate(() => { location.hash = '#pj-dc-workspace'; }); await A.reload(); await sleep(2000);
    await A.click('#pd-panel [data-pd="edit"][data-f="next"]'); await sleep(300);
    await A.fill('#pd-panel .pd-edit textarea', 'Xác minh quyền báo cáo và chặn người dùng');
    await A.evaluate(() => document.querySelector('#pd-panel .pd-edit textarea').form.requestSubmit()); await sleep(700);
    await A.evaluate(() => { location.hash = '#dashboard'; }); await A.reload(); await sleep(2000);
    td = await text('#td-body');
    ok(/Xác minh quyền báo cáo và chặn người dùng/.test(td) && !/Bước cũ/.test(td), 'Đi Cùng\'s step changed: Today shows the new one', td);
    await A.click('#td-body .td-ck[data-key="next:dc"]'); await sleep(500);
    ok(/Xác minh quyền báo cáo/.test(await A.$eval('#toast-msg', e => e.textContent)), 'checked in Today', await A.$eval('#toast-msg', e => e.textContent));
    const nextOf = async () => { await A.evaluate(() => { location.hash = '#pj-dc-workspace'; }); await sleep(900); return text('#pd-panel [data-fld="next"]').catch(() => ''); };
    let nx = await nextOf();
    ok(/Chưa có bước tiếp theo/.test(nx), 'and the project\'s step is done too', nx);
    await A.evaluate(() => { location.hash = '#dashboard'; }); await sleep(900);
    await A.click('#td-body .td-ck[data-key="next:dc"]'); await sleep(500);
    td = await text('#td-body');
    ok(await A.$eval('#td-body .td-ck[data-key="next:dc"]', e => e.getAttribute('aria-pressed')) === 'false' && /Xác minh quyền báo cáo/.test(td), 'unchecked by hand: open again in Today', td);
    nx = await nextOf();
    ok(/Xác minh quyền báo cáo và chặn người dùng/.test(nx), 'and the step is back on the project', nx);
    await A.evaluate(() => { location.hash = '#dashboard'; }); await sleep(900);
    await A.click('#td-body .td-ck[data-key="next:dc"]'); await sleep(400);
    await A.click('#toast-undo'); await sleep(500);
    ok(await A.$eval('#td-body .td-ck[data-key="next:dc"]', e => e.getAttribute('aria-pressed')) === 'false', 'checked again, then Undo: open in Today');
    nx = await nextOf();
    ok(/Xác minh quyền báo cáo và chặn người dùng/.test(nx), 'and on the project', nx);
    await A.reload(); await sleep(2000);
    await A.evaluate(() => { location.hash = '#dashboard'; }); await sleep(900);
    td = await text('#td-body');
    ok(/Xác minh quyền báo cáo và chặn người dùng/.test(td) && /0\/3|0 \/ 3|0 trên 3|0 of 3/i.test(await A.$eval('#td-sub', e => e.textContent)), 'after a reload Today still has the new step, not done', [td, await A.$eval('#td-sub', e => e.textContent)]);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); } finally { await b.close(); WEB.close(); }
  console.log(`\n${n - fails}/${n} passed`);
  process.exit(fails ? 1 : 0);
})();
