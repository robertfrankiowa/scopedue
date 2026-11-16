// v120 (CONTRACT.md 88, 98, 100, 103): the Vietnamese sample: the user's manual client test (Nha khoa Minh Tâm), a client project with a team
// (Sao Bắc Logistics, typed in by tests/sample-saobac-vi.js), an Internal project of one's
// own (App chấm công HR, typed in by tests/sample-vi.js, CONTRACT 108), loaded through the welcome in Tiếng Việt. Whatever the person
// works on, the sample is offered whole, with a line that says what it holds (a client project and a product); it is loaded here
// from My own projects, and both projects come in. Then: the records are in, meta sample says vi, nothing of a real account (no
// real email, no Drive file) is in the workspace, every tab of each project draws with nothing broken, the client is on Clients.
// Each change request chain and the delivery events' chain is checked against its hashes. Then the client portal's demo (both
// builds of the portal, each in Tiếng Việt and English): the same project as its client saw it, the portal's own words in the
// language, what people wrote the same in both, no prototype project or dock, Automatic look, no picture bytes or real address;
// ?proto still shows the prototype. No server.
// SD_PLAYWRIGHT: playwright; SD_ROOT: the release folder; F: the app pages, PORTAL: the portal pages (comma-separated; all by default).
const pw = require(process.env.SD_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const path = require('path'), crypto = require('crypto'), fs = require('fs');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m, x) => { console.log((c ? '  ok   ' : '  FAIL ') + m + (c || x === undefined ? '' : ' :: ' + String(x).slice(0, 500))); if (!c) fails++; };
(async () => {
  const web = await require('./serve')(ROOT);
  const base = web.base.slice(0, -1);
  // the sample's chains, as the app works them out (16-project-model pdHxRaw, smEvRaw)
  const sha = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
  const bk = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples', 'workspace.vi.json'), 'utf8'));
  const sp = bk.ent.find(e => e.k.indexOf('project:') === 0 && e.d.kind === 'client').d;
  const PP = 'app-cham-cong-hr';
  // v128 (103): a second client project, with a team: Sao Bắc Logistics, typed in by tests/sample-saobac-vi.js
  const SB = 'quan-ly-doi-xe-giao-hang-sao-bac-logistics', SBC = 'sao-bac-logistics';
  const sb = (bk.ent.find(e => e.k === 'project:' + SB) || {}).d;
  ok(!!sb && sb.kind === 'client' && sb.cur === 'VND' && sb.team.length === 3 && sb.sc.vers.length === 3, 'the sample holds Sao Bắc: a client project in VND, three Editors, Scope v3', sb && [sb.kind, sb.cur, sb.team.length]);
  // v129 (105): a product with a team: Venli, an Owner and three Editors, no Viewer, typed in by tests/sample-venli-vi.js
  const VL = 'venli', vl = (bk.ent.find(e => e.k === 'project:' + VL) || {}).d;
  ok(!!vl && vl.kind === 'private' && vl.team.length === 3 && vl.team.every(m => m.role === 'Editor') && !('dv' in vl), 'the sample holds Venli: a private project, three Editors, no Viewer, not on Drive', vl && vl.team.map(m => m.n + '/' + m.role));
  ok(vl && vl.pv.ships.length === 2 && vl.pv.tests.map(t => t.dec).join() === 'narrow,go,grow,keep,' && vl.pv.items.filter(x => x.sec === 'in').every(x => x.st === 'done'), 'Venli: two releases shipped, its tests narrowed, went, kept going; Now all done', vl && [vl.pv.ships.length, vl.pv.tests.map(t => t.dec)]);
  /* v137 (116): after Grow, four channels and two growth checks: who came back from the running club (kept), sign-ups from a Facebook group (running) */
  const vg = vl ? vl.pv.tests.filter(t => t.kind === 'grow') : [];
  ok(vl && (vl.pv.channels || []).length === 4 && vg.length === 2 && vg[0].m === 'back' && vg[0].dec === 'keep' && vg[1].m === 'signup' && vg[1].st === 'run' && !vl.pv.stop, 'Venli: four channels, a growth check kept, one running', vl && [(vl.pv.channels || []).length, vg.map(t => [t.m, t.st, t.dec])]);
  /* v137 (113): App chấm công HR's v3 has begun: one item verified, one verified before its Done when changed, one in progress */
  const hr = (bk.ent.find(e => e.k === 'project:app-cham-cong-hr') || {}).d, hin = hr ? hr.pv.items.filter(x => x.sec === 'in') : [];
  const lastCp = x => (x.cp || []).slice(-1)[0], lines = x => (x.dod || []).map(c => c.t).sort().join('|'), was = x => ((lastCp(x) || {}).dod || []).map(t => t.replace(/^[✓○] /, '')).sort().join('|');
  ok(hin.length === 3 && hin.filter(x => x.st === 'done' && (lastCp(x) || {}).r === 'pass').length === 2 && hin.some(x => x.st === 'done' && lines(x) !== was(x)) && hin.some(x => x.st === 'doing') && (hr.pv.bls || []).length === 3, 'App chấm công HR: v3 begun, two checked, one of them before its Done when changed, one in progress', hin.map(x => [x.t.slice(0, 30), x.st, (lastCp(x) || {}).r, lines(x) === was(x)]));
  ok(vl && vl.team.map(m => m.e).sort().join() === 'anh@venli.example,bao@venli.example,truc@venli.example', 'Venli: the Editors’ addresses are made up (.example)', vl && vl.team.map(m => m.e));
  const SM_KEYS = ['dep', 'pd', 'rpm', 'free', 'rate', 'min', 'review', 'silence', 'dormant', 'cure', 'own', 'meth', 'doc'];
  const fpRaw = (ref, v) => { const t = v.terms || {}; return JSON.stringify([ref, v.v, v.items.map(x => [x.sec, x.t, x.d, x.cr, x.ok || '', x.m || '', x.pay == null ? null : x.pay]), t.price == null ? null : t.price, t.rev == null ? null : t.rev, SM_KEYS.map(k => { const v = t.r ? t.r[k] : null; return k === 'meth' || k === 'doc' ? String(v == null ? '' : v) : (v == null ? 0 : +v); }), 2]); };
  const grp = h => [0, 4, 8].map(i => h.slice(i, i + 4)).join('·');
  for (const pj of [sp, sb].filter(Boolean)) {
    let bad = 0, n = 0;
    pj.crs.forEach(c => { let prev = pj.id + '|' + c.id + '|v' + c.base; c.entries.forEach(e => { n++; if (sha([c.id, prev, e.w, e.ty, e.at, e.tx, e.amt == null ? '' : e.amt, e.days == null ? '' : e.days, e.vu || ''].join('|')) !== e.hx) bad++; prev = e.hx; }); });
    let prevE = pj.id + '|events';
    (pj.mev || []).forEach(e => { n++; if (sha(JSON.stringify([pj.id, prevE, e.w, e.ty, e.m || '', e.v || 0, e.at, e.tx || '', e.link || '', e.k || ''])) !== e.hx) bad++; prevE = e.hx; });
    ok(n > 50 && !bad, pj.n + ': every chain is intact (' + n + ' entries)', bad + ' do not match');
    const fpBad = pj.sc.vers.filter(v => v.terms && v.terms.fv === 2 && grp(sha(fpRaw(pj.id, v))) !== v.fp).map(v => 'v' + v.v);
    const recBad = pj.sc.vers.filter(v => v.rec && v.rec.fp && v.rec.fp !== v.fp).map(v => 'v' + v.v);
    ok(!fpBad.length && !recBad.length, pj.n + ': each Scope version’s fingerprint, and its approval, fit its items', [fpBad, recBad]);
  }
  // adding a sample changes none of what was there: each earlier record, byte for byte (the start of its SHA-256)
  const KEEP = { 'client:nha-khoa-minh-tam': '2b47606cfe7550a7', 'project:website-dat-lich-kham-nha-khoa-minh-tam': '0332217897d905ca', 
    /* v137 (118): Venli gained channels and growth checks (its notes are 13-15 now), App chấm công HR began v3 (its notes 16-18) */
    'project:app-cham-cong-hr': '579feba342934382', 'note:16': '421a6d12288306ba', 'note:17': 'a1919ad5d7c42346', 'note:18': 'e085ec24112d785c',
    'project:venli': '20a3bd8d8b1a6932', 'note:13': '5628c006e1348881', 'note:14': '7270f8c20fed12dd', 'note:15': 'fd6c2e0f0255da66',
    'client:sao-bac-logistics': '25cb847c8b74f7aa', 'note:4': 'abb334ebd571dae1', 'note:5': 'b0dd110e7c3bd9a5', 'note:6': '23e59351b99e3862', 'project:quan-ly-doi-xe-giao-hang-sao-bac-logistics': '65170710dfd644e8' };
  const moved = Object.keys(KEEP).filter(k => { const e = bk.ent.find(x => x.k === k); return !e || sha(JSON.stringify(e)).slice(0, 16) !== KEEP[k]; });
  ok(!moved.length, 'Minh Tâm, App chấm công HR, Sao Bắc, Venli and their notes are as they were, byte for byte (108: App chấm công HR again)', moved);
  /* v130 (108): a source's ip is what the person took from it, in words; sample_from_copy.py once took it for an address */
  const ipSrc = bk.ent.filter(e => e.d.pv).flatMap(e => (e.d.pv.src || []).filter(x => typeof x.ip === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(x.ip)).map(x => e.k + ' [' + x.n + ']'));
  ok(!ipSrc.length, 'every source of the sample keeps what was taken from it, in words', ipSrc);
  ok(!/@(?![\w-]+\.example(?![\w.-]))[\w-]+\.\w|(drive|docs)\.google\.com\/[^"\s]|"dv":|"sy":/.test(JSON.stringify(bk)), 'the sample file: no real address, no Drive file, no portal link');
  ok(bk.ent.some(e => e.k === 'project:' + PP && e.d.kind === 'private' && e.d.mode === 'internal' && !(e.d.pv.comps || []).length && !(e.d.pv.tests || []).length), 'the sample holds an Internal project of one’s own too (108: App chấm công HR, no rivals, no tests)');
  const b = await pw.chromium.launch();
  for (const F of (process.env.F || 'scopedue_v68.html,scopedue-extension/app.html,subdomains/app/index.html').split(',')) {
    console.log('\n== ' + F);
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
    const pwa = /subdomains/.test(F);
    await ctx.route(/scopedue\.com/, r => r.fulfill({ status: 503, body: '' }));
    if (pwa) await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('vc')) { sessionStorage.setItem('vc', '1'); localStorage.setItem('sd-sync', JSON.stringify({ url: 'https://api.scopedue.com/api.php', key: 'sdk_test', email: 'kim@studio.example', via: 'email' })); } } catch (e) {} });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + '/' + F); await sleep(1500);
    const txt = async s => (await p.$eval(s, n => n.innerText).catch(() => ''));
    if (await p.isVisible('#xa-lang').catch(() => false)) { await p.check('input[name="lg"][value="vi"]', { force: true }); await p.click('#xa-lgo'); await sleep(1500); }
    await p.fill('#xa-n', 'Kim Lê');
    await p.check('input[name="w"][value="client"]', { force: true }); await sleep(200);
    const wl = await txt('#xa-sf');
    ok(await p.isVisible('#xa-sf') && /mẫu/i.test(wl), 'work for clients: the sample is offered', wl);
    ok(/khách hàng/.test(wl) && /sản phẩm của riêng bạn/.test(wl), 'its line says what it holds: a client project and a product', wl);
    await p.check('input[name="w"][value="own"]', { force: true }); await sleep(200);
    const wo = await txt('#xa-sf');
    ok(await p.isVisible('#xa-sf') && wo === wl, 'my own projects: the same sample, with the same line', wo);
    await p.check('input[name="s"][value="sample"]', { force: true });
    await p.click('#xa-f .xa-go'); await sleep(3500); await p.waitForLoadState(); await sleep(2500);
    ok(!(await p.isVisible('#xa-wl').catch(() => false)), 'into the app');
    /* the sidebar shows four recent projects, so the whole sample is there; Continue your work keeps three */
    const side = await p.$$eval('#nav .proj-link', a => a.map(x => x.getAttribute('data-pj')));
    ok(side.length === 4 && [PP, VL, SB, 'website-dat-lich-kham-nha-khoa-minh-tam'].every(id => side.includes(id)), 'the sidebar shows all four sample projects', side);
    ok((await p.$$('#dash-recent .proj')).length === 3, 'Continue your work shows three', (await p.$$('#dash-recent .proj')).length);
    /* a due chase names the item in quotes, cut short: the line still reads in Vietnamese */
    const prio = await txt('#dash-prio');
    ok(/Nhắc Hân về “CR-004/.test(prio) && !/Chase /.test(prio), 'Needs attention: “Chase Hân about “…”” reads as “Nhắc Hân về “…””', (prio.match(/.{0,20}(Chase|Nhắc).{0,50}/) || [prio.slice(0, 200)])[0]);
    const meta = await p.evaluate(() => SDB.exportAll().then(b => ({ ent: b.ent.map(e => e.k), sample: b.meta.sample, s: JSON.stringify(b) })));
    ok(meta.ent.includes('client:nha-khoa-minh-tam') && meta.ent.includes('project:website-dat-lich-kham-nha-khoa-minh-tam') && meta.ent.includes('project:' + PP), 'from My own projects too: the client, its project and the product are in', meta.ent);
    ok(meta.sample && meta.sample.l === 'vi' && meta.sample.w === 'own', 'meta sample l=vi w=own', JSON.stringify(meta.sample));
    ok(!/@(gmail|googlemail|yahoo|outlook|hotmail|icloud)\.com|hatsuong\.test|appchamcong.test|venli.test|(drive|docs)\.google\.com\/[^"\s]|"dv":/.test(meta.s), 'no real email, no Drive file in the workspace');
    const pj = 'website-dat-lich-kham-nha-khoa-minh-tam';
    for (const tab of ['change', 'scope', 'delivery', 'evidence', 'history', 'workspace']) {
      /* a project opens from its address on a page load; a hash change alone does not route */
      await p.goto(base + '/' + F + '#pj-' + pj + '-' + tab); await p.reload(); await sleep(2200);
      ok(await p.getAttribute('#pd-tab-' + tab, 'aria-selected').catch(() => '') === 'true', tab + ': the project opens on it');
      const t = await txt('#pd-panel');
      ok(t.length > 50 && !/does not match|không khớp|bị hỏng|broken/i.test(t), tab + ': shows, nothing broken', t.slice(0, 300));
      if (tab === 'scope') ok(/v2/.test(t), 'scope: v2', t.slice(0, 300));
      if (tab === 'change') { await p.locator('#pd-panel :is(button,a,[role="tab"])', { hasText: /^(Đã đóng|Closed)/ }).first().click().catch(() => {}); await sleep(500); }
      if (tab === 'change') ok(/Không thuộc bảo hành: Muốn có báo cáo số lịch/.test(await txt('#pd-panel')) && !/Not covered:/.test(await txt('#pd-panel')), 'change: the server’s “Not covered:” title reads in Vietnamese, its words as written (104)', ((await txt('#pd-panel')).match(/.{0,40}(Not covered|thuộc bảo hành).{0,40}/) || [''])[0]);
    }
    ok(meta.ent.includes('client:' + SBC) && meta.ent.includes('project:' + SB), 'Sao Bắc and its client are in too');
    /* v130 (107): in a sample you are its Owner (Chủ dự án), and it stays to look at: no role menu or Remove on its people, even when
       the page loads straight into the tab */
    const youOwner = async (nm) => {
      const r = await p.evaluate(() => ({ nm: ((document.querySelector('.pd-mem li .pd-m-t b') || {}).textContent || '').trim(), me: ((document.querySelector('.pd-mem li .pd-m-r') || {}).textContent || '').trim(), ed: document.querySelectorAll('.pd-mem [data-pd-role], .pd-mem [data-pd="rm"]').length }));
      ok(r.nm === 'Bạn', nm + ', team: your row says Bạn, not You', r.nm);
      ok(/^(Chủ dự án|Project owner)$/.test(r.me), nm + ', team: You are its Owner', r.me);
      ok(!r.ed, nm + ', team: no role menu or Remove on its people', r.ed);
    };
    for (const tab of ['change', 'scope', 'delivery', 'evidence', 'history', 'team', 'workspace']) {
      await p.goto(base + '/' + F + '#pj-' + SB + '-' + tab); await p.reload(); await sleep(2200);
      ok(await p.getAttribute('#pd-tab-' + tab, 'aria-selected').catch(() => '') === 'true', 'Sao Bắc, ' + tab + ': opens on it');
      const t = await txt('#pd-panel');
      ok(t.length > 50 && !/does not match|không khớp|bị hỏng|broken/i.test(t), 'Sao Bắc, ' + tab + ': shows, nothing broken', t.slice(0, 300));
      if (tab === 'team') await youOwner('Sao Bắc');
      if (tab === 'scope') ok(/v3/.test(t) && /390/.test(t), 'Sao Bắc, scope: v3, 390.000.000 ₫', t.slice(0, 300));
      if (tab === 'team') ok(/Trần Quốc Bảo/.test(t) && /Phạm Hoàng Nam/.test(t) && /Lê Thị Mai Anh/.test(t), 'Sao Bắc, team: the three Editors', t.slice(0, 300));
    }
    /* v130 (108): App chấm công HR is an Internal project: no Validate tab; its sources and open questions are on Decisions; its phase, set by hand, is In use */
    await p.goto(base + '/' + F + '#pj-' + PP + '-workspace'); await p.reload(); await sleep(2200);
    ok(!(await p.$('#pd-tab-market')) && /Nội bộ|Internal/.test(await txt('.pd-head, #view-project header, main')), 'the internal project: an Internal project, no Validate tab');
    ok(/Đang dùng|In use/.test(await p.$eval('.pd-phase', e => e.getAttribute('aria-label') + ' ' + e.textContent).catch(() => '')), 'the internal project: in use, phase 5 of 5', await p.$eval('.pd-phase', e => e.getAttribute('aria-label')).catch(() => ''));
    for (const tab of ['scope', 'decisions', 'feedback', 'history', 'team', 'workspace']) {
      await p.goto(base + '/' + F + '#pj-' + PP + '-' + tab); await p.reload(); await sleep(2200);
      ok(await p.getAttribute('#pd-tab-' + tab, 'aria-selected').catch(() => '') === 'true', 'the internal project, ' + tab + ': opens on it');
      const t = await txt('#pd-panel');
      ok(t.length > 50 && !/does not match|không khớp|bị hỏng|broken/i.test(t), 'the internal project, ' + tab + ': shows, nothing broken', t.slice(0, 300));
      if (tab === 'team') await youOwner('the internal project');
      if (tab === 'decisions') ok(/Câu hỏi còn mở|Open questions/.test(t) && /phần mềm kế toán/.test(t) && (/Đo bảng công/.test(t) || /(Hiện tất cả|Show all) 11/.test(t)), 'the internal project, decisions: open questions and sources at its foot (the eleven sources may be folded)', t.slice(-300));
      if (tab === 'scope') {   /* v137 (113): v3 begun; the form reads Check again, the summary Verified */
        const ch = await p.$$eval('#pd-panel .wk-ver', els => els.map(e => [e.className, e.textContent.trim(), e.title]));
        ok(ch.some(c => /\bstale\b/.test(c[0]) && /^(Cần kiểm lại|Check again)$/.test(c[1]) && /tiêu chí xong thay đổi|done-when lines changed/.test(c[2])) && ch.some(c => /\bok\b/.test(c[0])), 'the internal project, scope: one item reads Check again, one Verified', ch);
      }
    }
    ok(meta.ent.includes('project:' + VL), 'Venli is in too');
    for (const tab of ['market', 'scope', 'decisions', 'history', 'team', 'workspace']) {
      await p.goto(base + '/' + F + '#pj-' + VL + '-' + tab); await p.reload(); await sleep(2200);
      ok(await p.getAttribute('#pd-tab-' + tab, 'aria-selected').catch(() => '') === 'true', 'Venli, ' + tab + ': opens on it');
      const t = await txt('#pd-panel');
      ok(t.length > 50 && !/does not match|không khớp|bị hỏng|broken/i.test(t), 'Venli, ' + tab + ': shows, nothing broken', t.slice(0, 300));
      if (tab === 'team') await youOwner('Venli');
      if (tab === 'team') ok(/Trần Quốc Bảo/.test(t) && /Lê Ngọc Anh/.test(t) && /Võ Thanh Trúc/.test(t) && (t.match(/^(Người chỉnh sửa|Editor)$/gm) || []).length === 3, 'Venli, team: the three Editors, each an Editor (the role list offers Viewer; no one is one)', t.slice(0, 300));
      if (tab === 'scope') ok(/Quận 1, Quận 3/.test(t), 'Venli, scope: the third release planned (Quận 1, Quận 3)', t.slice(0, 300));
      if (tab === 'market') ok(/Kiểm tra tăng trưởng|Growth check/.test(t) && /CLB chạy bộ Nhiêu Lộc/.test(t) && /Nhóm Facebook khu vực Phú Nhuận/.test(t), 'Venli, market: the growth check running, the channels listed', t.slice(0, 400));   // v137 (116)
    }
    await p.goto(base + '/' + F + '#clients'); await sleep(1500);
    const cl = await txt('main');
    ok(/Nha khoa Minh Tâm/.test(cl) && /Sao Bắc Logistics/.test(cl), 'clients list has Nha khoa Minh Tâm and Sao Bắc Logistics', cl.slice(0, 300));
    await p.goto(base + '/' + F + '#pj-' + pj + '-overview'); await sleep(1500);
    ok(!errs.length, 'no script error', errs.join(' | '));
    await ctx.close();
  }
  // the client portal's demo: the same project, as its client saw it, in either language; only the portal's own words change
  const PG = process.env.PORTAL || 'portal.html,subdomains/client/index.html';
  const pjs = fs.readFileSync(path.join(ROOT, 'portal-assets', 'portal.js'), 'utf8');
  ok(/nha-khoa-minh-tam/.test(pjs) && !/@(gmail|googlemail|yahoo|outlook|hotmail|icloud)\.com|drive\.google|han@nhakhoa/.test(pjs) && /h•••••@nhakhoaminhtam\.example/.test(pjs), 'portal.js carries the demo, with the client’s address masked as the server masks it, and nothing of Drive');
  const demo = pjs.slice(pjs.indexOf('var DEMO'), pjs.indexOf('STUDIO0 = STUDIO'));
  ok(demo.length > 1000 && !/data:image|"d":"data/.test(demo) && /"sha":"[0-9a-f]{64}"/.test(demo), 'no picture bytes in the demo (the record lists them by name and fingerprint)');
  const mine = [sp.n].concat(sp.crs.map(c => c.t.replace(/^Not covered: /, '')).filter(t => !/^Question about Scope v\d+$/.test(t)), sp.sc.vers[sp.sc.vers.length - 1].items.filter(x => x.sec === 'tl').map(x => x.t));
  for (const G of PG.split(',')) {
    const words = {};
    for (const lang of ['vi', 'en']) {
      console.log('\n== ' + G + ' ?demo&lang=' + lang);
      const ctx = await b.newContext({ viewport: { width: 1300, height: 1000 }, colorScheme: 'dark' }), p = await ctx.newPage(), errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(base + '/' + G + '?demo=nhakhoa&lang=' + lang); await sleep(3000);   // 124: ?demo&lang=en alone opens the English sample
      const t = await p.innerText('body');
      ok(/Website & đặt lịch khám – Nha khoa Minh Tâm/.test(t) && /BS\. Lê Ngọc Hân/.test(t) && /Thiết kế UX\/UI được duyệt/.test(t), 'the sample’s project, client and milestones, as written', t.slice(0, 300));
      ok(lang === 'vi' ? /CỔNG KHÁCH HÀNG|Cổng khách hàng/i.test(t) && /Đã chấp nhận/.test(t) : /CLIENT PORTAL/i.test(t) && /Accepted/.test(t), 'the portal’s own words in ' + lang);
      ok(!/Lotus|Minh Phát|GreenHome|Online store/.test(t), 'none of the prototype’s projects');
      ok(await p.isHidden('#dock'), 'no prototype dock');
      ok(await p.evaluate(() => !document.documentElement.hasAttribute('data-theme')) && await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(15, 19, 16)', 'Automatic: dark on a dark computer');
      words[lang] = mine.filter(x => t.includes(x));
      if (lang === 'vi') ok(!/Not covered:/.test(t), 'no “Not covered:” left in English on the Vietnamese page (104)', (t.match(/.{0,30}Not covered:.{0,30}/) || [''])[0]);
      // only to look at: the note says so, and what a client does is stopped with a word
      const bar = await p.isVisible('#demoRo') ? await p.innerText('#demoRo') : '';
      ok(lang === 'vi' ? /MẪU|Mẫu/.test(bar) && /Duyệt, trả lời/.test(bar) : /SAMPLE|Sample/.test(bar) && /Approving, replying/.test(bar), 'the note: a sample, to look at', bar);
      const say = lang === 'vi' ? /Đây là bản mẫu để xem/ : /This is a sample to look around in/;
      for (const a of ['approve', 'ask', 'decline']) {
        const n = await p.$$('[data-a="' + a + '"]'); if (!n.length) { ok(false, 'a ' + a + ' button to try'); continue; }
        await p.evaluate(() => { const t = document.querySelector('#toastTxt'); if (t) t.textContent = ''; });
        await n[0].click({ force: true }); await sleep(500);
        const open = await p.evaluate(() => !!document.querySelector('dialog[open]') || (typeof V !== 'undefined' && !!V.inVerify));
        ok(!open && say.test(await p.$eval('#toastTxt', e => e.textContent).catch(() => '')), a + ': nothing opens, the toast says it is a sample');
      }
      // a request's thread, opened
      await p.click('text=' + (lang === 'vi' ? 'Đọc toàn bộ trao đổi' : 'Read the full thread')).catch(() => {}); await sleep(800);
      const dr = await p.innerText('body');
      ok(/In danh sách lịch hẹn theo ngày cho lễ tân/.test(dr), 'the request’s thread opens, its words as written');
      ok(!errs.length, 'no script error', errs.join(' | '));
      await ctx.close();
    }
    ok(words.vi.length >= 4 && JSON.stringify(words.vi) === JSON.stringify(words.en), 'what people wrote reads the same in both languages (' + words.vi.length + ' texts)', [words.vi, words.en]);
    const ctx = await b.newContext(), p = await ctx.newPage();
    await p.goto(base + '/' + G + '?demo&proto&lang=en'); await sleep(2500);
    ok(/Lotus Wellness|Online store|Minh Phát/.test(await p.innerText('body')) && await p.isVisible('#dock'), '?proto: the prototype’s projects and its dock, for the portal’s own tests');
    ok(!(await p.isVisible('#demoRo')), '?proto: no sample note');
    await p.click('[data-a="open"]').catch(() => {}); await sleep(900);   // the prototype's client has two projects: Home first
    await p.click('[data-a="ask"]', { force: true }).catch(() => {}); await sleep(600);
    ok(await p.evaluate(() => !!document.querySelector('dialog[open]')), '?proto: Ask a question still opens its dialog');
    await ctx.close();
    // v128 (103): ?demo=saobac opens the second demo, from Studio Bắc Nam; ?demo stays on Minh Tâm (checked above)
    const sbWords = {};
    for (const lang of ['vi', 'en']) {
      console.log('\n== ' + G + ' ?demo=saobac&lang=' + lang);
      const c2 = await b.newContext({ viewport: { width: 1300, height: 1000 } }), q = await c2.newPage(), errs = [];
      q.on('pageerror', e => errs.push(e.message));
      await q.goto(base + '/' + G + '?demo=saobac&lang=' + lang); await sleep(3000);
      const t = await q.innerText('body');
      ok(/Quản lý đội xe & giao hàng – Sao Bắc Logistics/.test(t) && /Đỗ Lan Phương/.test(t) && /Pilot 15 xe và nghiệm thu go\/no-go/.test(t) && !/Nha khoa Minh Tâm/.test(t), 'Sao Bắc’s project, client and milestones, as written; not Minh Tâm', t.slice(0, 300));
      ok(/Studio Bắc Nam/.test(t) && !/Lumen Studio|Maya Chen/.test(t), 'from Studio Bắc Nam, not the portal’s sample studio', t.slice(0, 200));
      ok(!/Đã hết hạn|has expired|Expired/i.test(t), 'CR-010’s quote, waiting on Phương, has not expired');
      ok(lang === 'vi' ? /CỔNG KHÁCH HÀNG|Cổng khách hàng/i.test(t) && /Đã chấp nhận/.test(t) : /CLIENT PORTAL/i.test(t) && /Accepted/.test(t), 'the portal’s own words in ' + lang);
      ok(!/Lotus|Minh Phát|GreenHome|Online store/.test(t) && await q.isHidden('#dock'), 'none of the prototype’s projects, no dock');
      const bar = await q.isVisible('#demoRo') ? await q.innerText('#demoRo') : '';
      ok(bar.length > 10, 'the note: a sample, to look at', bar);
      const say = lang === 'vi' ? /Đây là bản mẫu để xem/ : /This is a sample to look around in/;
      let tried = 0;
      for (const a of ['approve', 'ask', 'new', 'bug', 'decline', 'note']) {
        const n = await q.$$('[data-a="' + a + '"]'); if (!n.length) continue;
        await q.evaluate(() => { const t = document.querySelector('#toastTxt'); if (t) t.textContent = ''; });
        await n[0].click({ force: true }); await sleep(500); tried++;
        const open = await q.evaluate(() => !!document.querySelector('dialog[open]') || (typeof V !== 'undefined' && !!V.inVerify));
        ok(!open && say.test(await q.$eval('#toastTxt', e => e.textContent).catch(() => '')), 'Sao Bắc, ' + a + ': nothing opens, the toast says it is a sample');
      }
      ok(tried >= 2, 'Sao Bắc: at least two things a client does were tried (' + tried + ')');
      sbWords[lang] = [sb.n].concat(sb.crs.map(c => c.t).filter(x => !/^Question about Scope v\d+$/.test(x))).filter(x => t.includes(x));
      ok(!errs.length, 'no script error', errs.join(' | '));
      await c2.close();
    }
    ok(sbWords.vi.length >= 1 && JSON.stringify(sbWords.vi) === JSON.stringify(sbWords.en), 'Sao Bắc: what people wrote reads the same in both languages', [sbWords.vi, sbWords.en]);
  }
  ok(/p•••••@saobaclogistics\.example/.test(pjs) && !/saobaclogistics\.test|studiobacnam\.test/.test(pjs), 'portal.js: Sao Bắc’s demo with the client’s address masked, no .test address');
  await b.close(); web.close && web.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
