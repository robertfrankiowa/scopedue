// v116: deleting a project takes its quick notes with it, and their reminders (CONTRACT.md 42.2, changed 2026-11-03). A private
// project with a note whose reminder is due: Overview shows the reminder; Delete says the note goes with its reminder; once deleted,
// neither Overview nor Notes has it, nor does the save; Undo brings both back; deleted again, a reload still has neither. A note of
// no project stays.
// F = scopedue_v68.html (default), scopedue-extension/app.html or subdomains/app/index.html, served over http. SD_PLAYWRIGHT.
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..')), F = process.env.F || 'scopedue_v68.html';
let fails = 0, n = 0; const errs = [];
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PID = 'trail-run', TXT = 'Ask Thao about testing the trail app', LONE = 'Buy a new notebook';
(async () => {
  const S = await require('./serve')(ROOT);
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/scopedue\.com/, r => r.fulfill({ status: 503, body: '' }));
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('x116')) { sessionStorage.setItem('x116', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'sdk_offline', email: 'robert@studio.example', via: 'email' })); } } catch (e) {} });
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto(S.base + F + '?test'); await sleep(1500);
    const seeded = await A.evaluate(async ([pid, txt, lone]) => {
      const y = new Date(Date.now() - 864e5), iso = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
      const d = { id: pid, n: 'Trail run', m: 'T', kind: 'private', phase: 1, team: [], ctx: [], log: [], mentions: [], upd: 'just now', updT: Date.now() };
      const ent = [{ k: 'project:' + pid, d }, { k: 'note:901', d: { id: 901, text: txt, tags: ['tester'], pid, rem: iso, remT: '09:00', ts: Date.now(), date: 'today' } },
        { k: 'note:902', d: { id: 902, text: lone, tags: [], pid: '', ts: Date.now(), date: 'today' } }];
      const r = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent, ord: { project: ['project:' + pid], note: ['note:901', 'note:902'] }, meta: {} }));
      if (!r.ok) return r.msg + ' ' + (r.where || ''); await SDB.replaceAll(r.backup); return 'ok';
    }, [PID, TXT, LONE]);
    ok(seeded === 'ok', 'Trail run, private, with a note whose reminder is due, and a note of no project', seeded);
    const home = async () => { await A.evaluate(() => { location.hash = ''; }); await A.reload(); await sleep(1500); };
    const page = () => A.evaluate(() => document.body.innerText);
    const saved = () => A.evaluate(async () => { await SDB.save(); const x = await SDB.exportAll(); return { p: x.ent.filter(e => e.k.startsWith('project:')).map(e => e.d.id), notes: x.ent.filter(e => e.k.startsWith('note:')).map(e => e.d) }; });
    const toast = () => A.evaluate(() => ({ t: document.getElementById('toast-msg').textContent, undo: !document.getElementById('toast-undo').hidden }));
    const open = async () => { await A.evaluate(id => { location.hash = '#pj-' + id + '-workspace'; }, PID); await A.reload(); await sleep(1300); await A.waitForSelector('#pd-title', { timeout: 8000 }); };
    const del = async () => { await A.click('#pd-more'); await sleep(200); await A.click('#pd-menu [data-m="del"]'); await sleep(500); await A.fill('#pdel-n', 'Trail run'); await sleep(100); };

    await home();
    let t = await page();
    ok(t.includes(TXT) && /1 reminder is due/i.test(t), 'Overview shows the note and its reminder', t.split('\n').filter(l => /remind|Ask|due/i.test(l)).join(' | '));

    await open(); await del();
    const dr = await A.$eval('#drawer-pdel', e => e.innerText);
    ok(/Your quick note about it is deleted, with its reminder\./.test(dr) && !/stays in Notes/.test(dr), 'the drawer says the note goes, with its reminder', dr.slice(0, 400));
    await A.click('#pdel-go'); await sleep(600);
    let ts = await toast(), sv = await saved();
    ok(ts.t === 'Project deleted · Trail run' && ts.undo, 'deleted, with Undo', ts);
    ok(sv.p.indexOf(PID) < 0 && sv.notes.map(x => x.id).join() === '902', 'saved without the project and its note; the other note kept', sv);
    t = await page();
    ok(!t.includes(TXT) && !/reminders? (is |are )?due/i.test(t) && t.includes(LONE), 'Overview no longer has the note or its reminder', t.slice(0, 300));

    await A.click('#toast-undo'); await sleep(600);
    sv = await saved();
    const back = sv.notes.find(x => x.id === 901);
    ok(sv.p.indexOf(PID) > -1 && back && back.pid === PID && !!back.rem && sv.notes[0].id === 901, 'Undo puts the project back, its note and reminder too, in their place', sv);

    await del(); await A.press('#pdel-n', 'Enter'); await sleep(5600);
    await home();
    sv = await saved(); t = await page();
    ok(sv.p.indexOf(PID) < 0 && !sv.notes.some(x => x.id === 901) && !t.includes(TXT) && !/reminders? (is |are )?due/i.test(t), 'deleted for good: after a reload neither the note nor its reminder is there', [sv, t.slice(0, 200)]);
    ok(!errs.length, 'no page errors', errs);
  } catch (e) { ok(false, 'ran to the end', String(e && e.stack || e)); }
  await b.close(); S.close();
  console.log((fails ? 'FAILED ' + fails : 'ALL PASS') + ' (' + n + ' checks)');
  process.exit(fails ? 1 : 0);
})();
