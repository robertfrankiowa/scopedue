// v115: taking someone off with two devices of the Owner's (CONTRACT.md 78). An Editor is taken off on one device; the Owner's
// other device, shut meanwhile, opens later with the old team: it must not share the folder with them again. And what ScopeDue
// makes in Drive has writersCanShare off, so an Editor cannot share the team's folder on with another account; a project kept
// before v115 gets it once. Both devices of the Owner's end on one key generation and both open the file, also when they turned the
// key at the same moment (CONTRACT.md 79), and the key is never wrapped for someone taken off. The stand-in Drive, no server
// (scopedue.com answers 503).
// F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html. SD_PLAYWRIGHT: playwright.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROB = 'robert@studio.example', LAN = 'lan.anh@studio.example', BAO = 'quoc.bao@studio.example';
const TOK = { [ROB]: 'ya29.rob', [LAN]: 'ya29.lan', [BAO]: 'ya29.bao' };
(async () => {
  const WEB = await require('./serve')(ROOT), HTTP = WEB.base;
  const acc = {}; Object.keys(TOK).forEach(e => { acc[TOK[e]] = e; });
  const D = require('./standin-drive')(acc);
  const b = await chromium.launch(), errs = [], sent = [];
  const device = async (who, name) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/^https:\/\/scopedue\.com\//, r => r.fulfill({ status: 503, body: '{}', headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    await ctx.route(/^https:\/\/(www\.googleapis\.com|oauth2\.googleapis\.com)\//, r => { const q = r.request(); if (q.method() !== 'GET') sent.push({ who: name, m: q.method(), u: q.url(), b: q.postData() || '' }); return D.route(r); });
    await ctx.addInitScript(w => { try { if (!localStorage.getItem('sd-first')) { localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_test' + w.split('@')[0].replace(/\W/g, ''), email: w, via: 'email' })); } } catch (e) {} }, who);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto(HTTP + F + '?test'); await sleep(1200);
    await p.evaluate(([t, e]) => window.__drv.token(t, e), [TOK[who], who]);
    await p.click('.nav-i[data-view="settings"]'); await sleep(200); await p.click('#st-t-drive'); await sleep(200);
    await p.click('#dr-body [data-dr="connect"]'); await sleep(500);
    p._who = who; return p;
  };
  const tok = p => p.evaluate(([t, e]) => window.__drv.token(t, e), [TOK[p._who], p._who]);
  const run = async p => { await tok(p); return p.evaluate(() => window.__drv.sync.run()); };
  const kept = async (p, name) => ((await p.evaluate(() => window.__drv.sync.state())).kept.filter(x => x.n === name)[0]) || null;
  const go = async (p, id, tab) => { await p.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + (t || 'workspace'); }, [id, tab]); await p.reload(); await sleep(1200); await tok(p); };
  const joinAs = async (p, who, fid) => { const files = Object.values(D.files).filter(f => f.parents.includes(fid) && !f.trashed); files.forEach(f => D.pick(who, f.id)); await p.evaluate(m => window.__drv.sync.join(m), { fid, files: files.map(f => ({ id: f.id, name: f.name })) }); };
  const lanOn = fid => D.files[fid].perms.filter(p => p.email === LAN).map(p => p.role);
  const noShare = b => { try { return JSON.parse(b).writersCanShare === false; } catch (e) { const m = b.match(/\{[^]*?"writersCanShare":false[^]*?\}/); return !!m; } };
  try {
    // ================================================================ the Owner, a project kept in Drive, Lan Anh an Editor
    const A = await device(ROB, 'owner');
    ok(await A.evaluate(async lan => {
      const d = { id: 'hr', n: 'HR tool', m: 'H', kind: 'private', phase: 1, team: [{ n: 'Lan Anh', e: lan, role: 'Editor', c: '#3d5a8f', seen: '' }, { n: 'Quốc Bảo', e: 'quoc.bao@studio.example', role: 'Editor', c: '#5b4a8a', seen: '' }], ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now() };
      const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [{ k: 'project:hr', d }], ord: { project: ['project:hr'] }, meta: {} }));
      if (!r.ok) return false; await SDB.replaceAll(r.backup); return true;
    }, LAN), 'HR tool, private, Lan Anh and Quốc Bảo its Editors');
    await A.reload(); await sleep(1500); await tok(A);
    await A.evaluate(() => window.__drv.sync.keep('hr')); await sleep(300); await run(A); await run(A);
    const d1 = (await kept(A, 'HR tool')).dv, fid = d1.fid;
    ok(lanOn(fid).join() === 'writer', 'kept in Drive: the Team folder is shared with Lan Anh', lanOn(fid));
    const made = sent.filter(s => s.m === 'POST' && /\/files\?/.test(s.u) && /HR tool|owner\.sdteam|"m-/.test(s.b));
    const team = made.filter(s => /"name":"Team · HR tool"/.test(s.b))[0], owner = made.filter(s => /owner\.sdteam/.test(s.b))[0];
    ok(team && noShare(team.b) && owner && noShare(owner.b), 'the Team folder and the Owner\'s file are made with writersCanShare off', made.map(s => s.b.slice(0, 160)));
    ok(made.length >= 3 && made.every(s => noShare(s.b)), 'and so is every folder and file ScopeDue made for it (Lan Anh\'s file too)', made.map(s => s.b.slice(0, 120)));
    ok(d1.nws === 1 && sent.some(s => s.m === 'PATCH' && s.u.includes('/files/' + fid + '?') && noShare(s.b)), 'the Owner\'s round also sets it on the Team folder, as for a project kept before v115', d1.nws);
    const patches = () => sent.filter(s => s.m === 'PATCH' && /"writersCanShare":false/.test(s.b) && !/"name"/.test(s.b)).length, pn = patches();
    await run(A); await run(A);
    ok(patches() === pn, 'and only once');

    // ================================================================ the Owner's second device, then Lan Anh joins
    const A2 = await device(ROB, 'owner2');
    const found = await A2.evaluate(() => window.__drv.sync.scan());
    await A2.evaluate(pid => window.__drv.sync.open(pid), found[0].pid); await sleep(200); await run(A2);
    await run(A); await run(A2); await run(A2);
    ok(!!(await kept(A2, 'HR tool')), 'the Owner\'s second device has the project too');
    const L = await device(LAN, 'lan'), Q = await device(BAO, 'bao');
    await joinAs(L, LAN, fid); await joinAs(Q, BAO, fid); await run(L); await run(Q); await run(A); await run(L); await run(Q); await run(A2);
    ok(!!(await kept(L, 'HR tool')) && !!(await kept(Q, 'HR tool')), 'Lan Anh and Quốc Bảo joined');
    const slotOf = e => D.byName('owner.sdteam').length && Object.values(D.files).filter(f => f.parents.includes(fid) && /^m-/.test(f.name) && JSON.parse(f.content).who === e)[0];
    const kidsOf = e => (JSON.parse(slotOf(e).content).devs || []).map(x => x.kid), ownerNow = () => JSON.parse(D.byName('owner.sdteam').filter(f => !f.trashed)[0].content);
    const lanKids = kidsOf(LAN), baoKids = kidsOf(BAO);
    const lines = async (P, e) => (await P.evaluate(() => window.__drv.sync.data('hr').log.map(l => l.t))).filter(t => t === 'You stopped sharing HR tool with ' + e).length;

    // ================================================================ taken off on the first device while the second is shut
    await go(A, 'hr', 'team');
    await A.click('#pd-panel [data-pd="rm"][aria-label="Remove Lan Anh from this project"]'); await sleep(200);
    await run(A); await sleep(10500); await run(A); await run(A);
    ok(!lanOn(fid).length, 'taken off on the first device: her access to the folder is gone', lanOn(fid));
    ok((await A2.evaluate(() => window.__drv.sync.data('hr').team.map(m => m.e))).includes(LAN), 'the second device, shut meanwhile, still has the old team');
    const reshare = () => sent.filter(s => s.who === 'owner2' && s.m === 'POST' && s.u.includes('/files/' + fid + '/permissions') && s.b.includes(LAN));
    await run(A2);
    ok(!lanOn(fid).length && !reshare().length, 'it opens: its first round does not share the folder with her again (it has not read the new team yet)', [lanOn(fid), reshare().length]);
    ok(!(await A2.evaluate(() => window.__drv.sync.data('hr').team.map(m => m.e))).includes(LAN), 'that round reads the Owner\'s file: Lan Anh is off its team too');
    await run(A2); await sleep(10500); await run(A2); await run(A2);
    const d2 = (await kept(A2, 'HR tool')).dv;
    ok(!lanOn(fid).length && !reshare().length && !(d2.slots || {})[LAN], 'its next rounds neither: her access stays gone, and its own list drops her file', [lanOn(fid), Object.keys(d2.slots || {})]);
    await run(A); await run(A2); await run(A); await run(A2);
    const st = async P => { const k = (await kept(P, 'HR tool')).dv; return [k.gen, k.st, k.msg]; };
    let of = ownerNow(), s1 = await st(A), s2 = await st(A2);
    ok(of.gen >= 2 && s1[0] === of.gen && s2[0] === of.gen && s1[1] === 'ok' && s2[1] === 'ok', 'both of the Owner\'s devices end on the generation in the file, and both open it (CONTRACT 79)', [of.gen, s1, s2]);
    ok(!Object.keys(of.wrapped).some(k => lanKids.includes(k)) && Object.keys(of.wrapped).some(k => baoKids.includes(k)), 'the key in the file is wrapped for Quốc Bảo\'s device, not for Lan Anh\'s', Object.keys(of.wrapped).length);
    ok(await lines(A, LAN) === 1 && await lines(A2, LAN) === 1, 'Activity says she was taken off once, on both devices', [await lines(A, LAN), await lines(A2, LAN)]);
    await run(Q); await run(Q); const sq = (await kept(Q, 'HR tool')).dv;
    ok(sq.gen === ownerNow().gen && sq.st === 'ok', 'Quốc Bảo, who stays, takes the new key and carries on', [sq.gen, sq.st, sq.msg]);
    const v0 = D.byName('owner.sdteam').filter(f => !f.trashed)[0].version; await run(A); await run(A2); await run(A);
    ok(D.byName('owner.sdteam').filter(f => !f.trashed)[0].version === v0, 'and they stop writing the file over each other', [v0, D.byName('owner.sdteam').filter(f => !f.trashed)[0].version]);

    // ================================================================ both devices turn the key at the same moment
    await go(A, 'hr', 'team');
    await A.click('#pd-panel [data-pd="rm"][aria-label="Remove Quốc Bảo from this project"]'); await sleep(200);
    await run(A); await run(A2); await run(A2);
    ok(!(await A2.evaluate(() => window.__drv.sync.data('hr').team.map(m => m.e))).includes(BAO), 'Quốc Bảo taken off on the first device; the second, open this time, reads it at once');
    await sleep(10500);
    await Promise.all([run(A), run(A2)]);
    for (let i = 0; i < 3; i++) { await run(A); await run(A2); }
    of = ownerNow(); s1 = await st(A); s2 = await st(A2);
    ok(!D.files[fid].perms.some(p => p.email === BAO), 'his access to the folder is gone', D.files[fid].perms);
    ok(s1[0] === of.gen && s2[0] === of.gen && s1[1] === 'ok' && s2[1] === 'ok', 'both devices turned the key at once; they end on the one key the file holds, and both open it', [of.gen, s1, s2]);
    ok(!Object.keys(of.wrapped).some(k => lanKids.includes(k) || baoKids.includes(k)), 'the key in the file is wrapped for neither of the people taken off', Object.keys(of.wrapped).length);
    ok(await lines(A, BAO) === 1 && await lines(A2, BAO) === 1, 'Activity says he was taken off once', [await lines(A, BAO), await lines(A2, BAO)]);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); } finally { await b.close(); WEB.close(); }
  console.log(`\n${n - fails}/${n} passed`);
  process.exit(fails ? 1 : 0);
})();
