// v122 (CONTRACT 92): the app's publish to the Viewer portal names the bug on a test result that opened one (bid), and only then:
// not when the bug is gone, not on a pass with none, never on the bug itself. On the single file, the extension's app.html and the
// web app, the server stood in for. SD_PLAYWRIGHT.
const path = require('path'); const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const { chromium } = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright'); const serve = require('./serve');
(async () => { const S = await serve(ROOT); const b = await chromium.launch(); let bad = 0;
  for (const F of ['scopedue_v68.html', 'scopedue-extension/app.html', 'subdomains/app/index.html']) {
    const ctx = await b.newContext(); await ctx.route(/scopedue\.com|fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 503, body: '' }));
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('v')) { sessionStorage.setItem('v', 1); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://scopedue.com/api/api.php', key: 'k', email: 'r@x.example', via: 'email' })); } } catch (e) {} });
    const P = await ctx.newPage(); const errs = []; P.on('pageerror', e => errs.push(e.message));
    await P.goto(S.base + F + '?test'); await P.waitForTimeout(1500);
    const r = await P.evaluate(async () => {
      if (!window.__vp || !window.SDB) return 'no hooks';
      const V = 'lan@corp.example', d = { id: 'hr', n: 'HR tool', m: 'H', kind: 'private', phase: 1, team: [{ n: 'Lan Anh', e: V, role: 'Viewer', c: '#3d5a8f', seen: '' }], ctx: [], log: [], mentions: [], upd: 'now', updT: Date.now(),
        fb: [{ id: 'b1', k: 'bug', fr: [V], ts: 2, t: 'Merged cells', st: 'open', by: '' }, { id: 't1', k: 'test', fr: [V], ts: 1, t: 'Merged cells', res: 'fail', bid: 'b1', by: '' }, { id: 't2', k: 'test', fr: [V], ts: 3, t: 'Step 4', res: 'fail', bid: 'gone', by: '' }, { id: 't3', k: 'test', fr: [V], ts: 4, t: 'Ok', res: 'pass', by: '' }] };
      const x = SDB.parseBackup(JSON.stringify({ app: 'scopedue', kind: 'backup', schema: 1, at: Date.now(), ent: [{ k: 'project:hr', d }], ord: { project: ['project:hr'] }, meta: {} }));
      if (!x.ok) return x.msg; await SDB.replaceAll(x.backup); location.reload(); return 'reload';
    });
    await P.waitForTimeout(1800);
    const o = await P.evaluate(() => { try { const es = window.__vp.out('hr').entries, by = id => es.find(e => e.id === id) || {}; return [by('t1').bid, by('t2').bid, by('t3').bid, by('b1').bid, by('t1').st]; } catch (e) { return 'err ' + e.message; } });
    const good = Array.isArray(o) && o[0] === 'b1' && o[1] === undefined && o[2] === undefined && o[3] === undefined;
    if (!good) bad++;
    console.log((good ? 'PASS ' : 'FAIL ') + F + ' ' + r + ' ' + JSON.stringify(o) + (errs.length ? ' errs ' + errs.slice(0, 2) : ''));
    await ctx.close();
  }
  await b.close(); S.close(); process.exit(bad ? 1 : 0); })();
