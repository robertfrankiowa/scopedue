// The Vietnamese product sample with a team (SAMPLE-SCRIPT-VENLI-VI.md): Venli, a private product project of an Owner and three
// Editors (Bảo, Anh, Trúc), typed into the web app by a script, against api.php on a fresh local database (php-server.js) and the
// stand-in Google Drive (standin-drive.js). Nothing reaches scopedue.com or Google; every address is @venli.test. At the end the
// Owner's workspace is exported to SD_OUT (default: sample-venli-copy.json in the OS temp folder); tools/sample_from_copy.py makes
// the sample of it.
//
//   node tests/sample-venli-vi.js          SD_UNTIL=<section letter> stops after that section
//   SD_FROM=<section letter>               starts at that section, from the checkpoint the previous one saved (tests/.live/vli-ck/)
//   SD_PLAYWRIGHT, SD_CHROMIUM, SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_SCHEMA_DB as php-server.js (run: tests/.live/vli.sh)
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const F = 'subdomains/app/index.html';
const UNTIL = process.env.SD_UNTIL || '', FROM = process.env.SD_FROM || '';
const OUT = process.env.SD_OUT || path.join(os.tmpdir(), 'sample-venli-copy.json');
const OWNER = 'ban@venli.test', BAO = 'bao@venli.test', ANH = 'anh@venli.test', TRUC = 'truc@venli.test';
const TOK = { [OWNER]: 'ya29.vli-owner', [BAO]: 'ya29.vli-bao', [ANH]: 'ya29.vli-anh', [TRUC]: 'ya29.vli-truc' };
const NAME = 'Venli';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, steps = 0;
const ok = (c, m, x) => { steps++; console.log((c ? 'ok   ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; return c; };
class Stop extends Error {}
const LETTERS = 'BCDEFGHJKLMNOPRQ';   /* I is typed within H; R (CONTRACT 116) is typed before Q, the last day */
const go = s => !FROM || LETTERS.indexOf(s) >= LETTERS.indexOf(FROM);
const CK = path.join(__dirname, '.live', 'vli-ck'), PROF = path.join(__dirname, '.live', 'vli-prof');
const day = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const wk = n => day((n - 6) * 7);   /* "tuần n" of the story, typed in week 6 */

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8134, db: 'sd_sample_venli', files: ['api.php', F, 'subdomains/app', 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const acc = {}; Object.keys(TOK).forEach(e => { acc[TOK[e]] = e; });
  const DRIVE = require('./standin-drive')(acc);
  const errs = [];
  let p;
  try {
    let keys = {};
    const ckPrev = FROM ? LETTERS[LETTERS.indexOf(FROM) - 1] : '', ckDir = ckPrev ? path.join(CK, ckPrev) : '';
    const ck = ckDir ? JSON.parse(fs.readFileSync(path.join(ckDir, 'vars.json'), 'utf8')) : null;
    if (ck) {
      S.my([S.db], fs.readFileSync(path.join(ckDir, 'db.sql')));
      fs.copyFileSync(path.join(ckDir, 'outbox.jsonl'), path.join(S.srv, 'outbox.jsonl'));
      DRIVE.load(fs.readFileSync(path.join(ckDir, 'drive.json'), 'utf8'));
      keys = ck.keys;
      console.log('---- from ' + FROM + ': the checkpoint after ' + ckPrev);
    } else {
      keys[OWNER] = await S.account('Robert', OWNER);
      for (const [n, e] of [['Trần Quốc Bảo', BAO], ['Lê Ngọc Anh', ANH], ['Võ Thanh Trúc', TRUC]]) keys[e] = await S.account(n, e);
      S.my([S.db, '-e', 'UPDATE api_studios SET created_at = created_at - 2592000000']);
    }

    /* ------------------------------------------------------------ a person on the web app, in a Chrome profile of their own */
    const device = async (who, name) => {
      const ctx = await PW.chromium.launchPersistentContext(path.join(PROF, who.split('@')[0]), { executablePath: process.env.SD_CHROMIUM || undefined, headless: process.env.SD_HEADED !== '1', viewport: { width: 1440, height: 950 }, acceptDownloads: true });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await ctx.route(/^https:\/\/(www\.googleapis\.com|oauth2\.googleapis\.com)\//, DRIVE.route);
      await ctx.addInitScript(([api, k, em]) => { try { if (!sessionStorage.getItem('vli')) { sessionStorage.setItem('vli', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: em, via: 'email' })); } } catch (e) {} }, [S.api, keys[who], who]);
      const pg = ctx.pages()[0] || await ctx.newPage(); pg.on('pageerror', e => { errs.push(name + ': ' + e.message); console.log('PAGEERR ' + name + ': ' + e.message + ' @ ' + String(e.stack || '').split(/\r?\n/).slice(1, 5).map(x => x.trim()).join(' < ')); });
      pg.on('dialog', d => d.accept());
      await pg.goto(S.base + F + '?test'); await sleep(1500);
      const tok = () => pg.evaluate(([t, e]) => { const f = () => window.__drv ? window.__drv.token(t, e) : setTimeout(f, 100); f(); }, [TOK[who], who]).catch(() => {});
      await tok(); pg.on('load', tok);
      await pg.click('.nav-i[data-view="settings"]').catch(() => {}); await sleep(300);
      await pg.click('#st-t-drive').catch(() => {}); await sleep(300);
      await pg.click('#dr-body [data-dr="connect"]').catch(() => {}); await sleep(600);
      pg._who = who; pg._tok = tok;
      return pg;
    };
    const P = pg0 => { const pg = () => typeof pg0 === 'function' ? pg0() : pg0; return {
      go: async (sel, ms) => { await pg().click(sel); await sleep(ms == null ? 350 : ms); },
      text: sel => pg().$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => ''),
      drawer: () => pg().$eval('.drawer.dr-live', e => e.id).catch(() => ''),
      dump: async (sel, why) => console.log('---- ' + (why || sel) + '\n' + await pg().$eval(sel, e => e.outerHTML.replace(/\s+/g, ' ').slice(0, 4000)).catch(() => 'no ' + sel)),
      btn: async (within, label, ms) => { await pg().locator(within + ' :is(button,a,[role="tab"])', { hasText: label }).filter({ visible: true }).first().click(); await sleep(ms == null ? 350 : ms); }
    }; };
    for (let i = 0; ; i++) { try { fs.rmSync(PROF, { recursive: true, force: true }); break; } catch (e) { if (i > 20) throw e; await sleep(1500); } }   /* the last run's Chrome may still hold it */
    if (ck) fs.cpSync(path.join(ckDir, 'prof'), PROF, { recursive: true });
    p = await device(OWNER, 'owner');
    const U = P(() => p);
    let PID = ck ? ck.PID : ''; p._pid = PID;
    const tab = async (t, pg) => {
      pg = pg || p; const id = pg._pid || PID;
      await pg.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [id, t]); await pg.reload(); await sleep(1600);
      if (!(await pg.$('#pd-tab-' + t))) console.log('no tab ' + t + ' on ' + pg._who + ' · tabs ' + JSON.stringify(await pg.$$eval('[id^="pd-tab-"]', l => l.map(n => n.id))));
    };
    const panel = pg => P(pg || p).text('#pd-panel');
    const out = pg => (pg || p).evaluate(id => (window.__x8 && window.__x8.out && window.__x8.out(id)) || (window.__sy && window.__sy.raw && window.__sy.raw(id)) || null, (pg || p)._pid || PID).then(x => x || {});
    const edit = async (f, v, pg) => {
      pg = pg || p;
      await pg.click('#pd-panel [data-pd="edit"][data-f="' + f + '"]'); await sleep(400);
      await pg.fill('#pd-ed', v); await pg.click('#pd-panel form[data-pd-form="edit"] [type="submit"]'); await sleep(500);
    };
    const addLink = async (t, u, pg) => {
      pg = pg || p;
      const add = pg.locator('#pd-panel :is(button,a)', { hasText: /Add a link|Add link/ }).filter({ visible: true }).first();
      if (await add.count()) { await add.click(); await sleep(300); } else { await pg.click('#pd-panel [data-pd="addlink"]').catch(() => {}); await sleep(300); }
      const f = pg.locator('#pd-panel form:has(input[type="url"]), #pd-panel form:has(input[placeholder^="https"]), #pd-panel form[data-pd-form="addlink"]').filter({ visible: true }).first();
      await f.locator('input:not([type="url"]):not([placeholder^="https"])').first().fill(t);
      await f.locator('input[type="url"], input[placeholder^="https"], [name="u"]').first().fill(u);
      await f.locator('[type="submit"]').first().click(); await sleep(400);
    };

    // ============================================================ what the story is made of
    const IT = {
      dk: 'Đăng ký bằng số điện thoại, OTP, xác nhận từ 18 tuổi', gan: 'Trang Gần bạn: Bây giờ, Tối nay, Ngày mai, Cuối tuần; lọc 1, 3, 5 km',
      tao: 'Tạo kèo theo mẫu: cà phê, boardgame, chạy bộ, cầu lông, cowork', tg: 'Tham gia kèo, tự vào danh sách chờ khi đủ người',
      chat: 'Chat nhóm chỉ mở cho người đã tham gia kèo', nhac: 'Nhắc xác nhận trước giờ gặp, nhả chỗ nếu không xác nhận', ci: 'Check-in tại chỗ hẹn bằng vị trí',
      ph: 'Phản hồi sau kèo 3 chạm: có đến, thấy an toàn, muốn đi lại', hs: 'Hồ sơ tin cậy: số kèo đã đi, đã mở, tỷ lệ có mặt',
      bc: 'Báo cáo và chặn, có lý do riêng cho rủ hẹn hò, gạ gẫm', bd: 'Bản đồ kèo quanh bạn', ds: 'Xem danh sách người ở gần bạn', nr: 'Nhắn riêng cho người chưa cùng kèo',
      nu: 'Kèo chỉ dành cho nữ, host duyệt người vào',
      lap: 'Kèo lặp hằng tuần, mỗi buổi có xác nhận và danh sách chờ riêng', dh: 'Đồng host: thêm một người cùng quản lý kèo',
      ml: 'Mở lại kèo với nhóm vừa đi, chừa ít nhất 2 chỗ cho người mới', ut: 'Ưu tiên kèo còn chỗ cho người mới trong mục Gần bạn',
      toi: 'Sửa: mục Tối nay sau 0 giờ vẫn hiện kèo đã xong', ev: 'Biến concert, workshop thành kèo đi cùng', hd: 'Host đánh dấu ai đã đến, vị trí chỉ là gợi ý',
      bo: 'Bỏ một buổi của kèo lặp, báo người đã xác nhận' };

    // ============================================================ helpers: the Validate tab, tests, decisions, the Gate
    const source = async (t, u, x, i, pg) => {
      pg = pg || p; const PU = P(pg);
      await PU.go('#pd-panel [data-pd="prv:srcadd"]', 500);
      await pg.fill('#msrc-t', t); if (u) await pg.fill('#msrc-u', u); await pg.fill('#msrc-x', x); if (i) await pg.fill('#msrc-i', i);
      await sleep(300); await PU.go('#drawer-msrc [type="submit"]', 700);
      const left = await PU.drawer(); if (left) { await PU.dump('#drawer-msrc', 'source drawer still open'); await PU.go('.drawer.dr-live [data-close]', 300); }
      return !left;
    };
    const job = async t => { await U.go('#pd-panel [data-pd="prv:jnew"]', 400); await p.fill('#prv-jt-new', t); await U.go('#pd-panel form[data-pd-form="prv:job"] [type="submit"]', 500); };
    const comp = async (n, pos, price, str, weak, src, diy) => {
      await U.go('#pd-panel [data-pd="prv:knew"]', 400);
      const Fm = '#pd-panel form[data-pd-form="prv:comp"]';
      await p.fill(Fm + ' [name="n"]', n); await p.fill(Fm + ' [name="pos"]', pos); await p.selectOption(Fm + ' [name="price"]', price);
      if (diy) await p.check(Fm + ' [name="sub"]');
      await p.fill(Fm + ' [name="str"]', str); await p.fill(Fm + ' [name="weak"]', weak);
      for (const k of src) await p.check(Fm + ' [name="s"][value="' + k + '"]').catch(() => {});
      await U.go(Fm + ' [type="submit"]', 600);
    };
    const rate = async (j, ev, levels) => {
      if (!(await p.$('#pd-panel .prv-gm-j.open[data-j="' + j + '"]'))) await U.go('#pd-panel button.prv-jb[data-id="' + j + '"]', 500);
      const E = '#pd-panel form[data-pd-form="prv:ev"][data-id="' + j + '"]';
      for (const [k, x, src] of ev) { await p.selectOption(E + ' [name="k"]', k); await p.fill(E + ' [name="x"]', x); await p.selectOption(E + ' [name="s"]', String(src)); await U.go(E + ' [type="submit"]', 500); }
      const D = '#pd-panel form[data-pd-form="prv:jdet"][data-id="' + j + '"]';
      /* levels are in the order the rivals were typed; the form lists them by name, newest first: set each by its rival's name */
      const RIV = ['Venlig', 'Meetup', 'Bumble For Friends', 'Nhóm Facebook tìm bạn chơi', 'Nhóm Zalo bạn bè', 'Câu lạc bộ sở thích'];
      const miss = await p.evaluate(([D, RIV, levels]) => {
        const f = document.querySelector(D), bad = [];
        RIV.forEach((n, i) => {
          const li = [...f.querySelectorAll('ul.prv-cvl > li')].find(l => l.querySelector('.prv-cvl-n').firstChild.textContent.trim() === n);
          const r = li && li.querySelector('input[type="radio"][value="' + levels[i] + '"]');
          if (!r) { bad.push(n); return; }
          r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
        });
        return bad;
      }, [D, RIV, levels]);
      if (miss.length) console.log('levels: no row for ' + miss.join(', '));
      await U.go(D + ' [type="submit"]', 600);
    };
    const decide = async (title, type, opts, pick, why, nots, srcs, revisit) => {
      await tab('decisions');
      await U.go('#pd-panel [data-pd="prv:dnew"]', 600);
      await p.fill('#ndec-t', title); await p.selectOption('#ndec-ty', type); await p.fill('#ndec-o', opts.join('\n'));
      await U.go('#ndec-go', 800);
      const R = '#pd-panel form[data-pd-form="prv:record"]';
      await p.check(R + ' input[name="c"][value="' + pick + '"]', { force: true });
      await p.fill('#prv-rb', why);
      for (const [i, t] of Object.entries(nots)) await p.fill('#prv-rn' + i, t).catch(() => {});
      for (const s of srcs || []) await p.check(R + ' input[name="ev"][value="' + s + '"]', { force: true }).catch(() => {});
      if (revisit) await p.fill('#prv-rv', revisit);
      await U.go(R + ' [type="submit"]', 700);
      return ((await out()).pv.dec || []).some(d => d.t === title && d.st === 'decided');
    };
    const replace = async (title, opts, pick, why, nots, srcs, revisit) => {
      await tab('decisions');
      const d = ((await out()).pv.dec || []).find(x => x.t === title && x.st === 'decided');
      if (!d) return false;
      await U.go('#pd-panel [data-pd="prv:dsel"][data-id="' + d.id + '"]', 400);
      await U.go('#pd-panel [data-pd="prv:drep"][data-id="' + d.id + '"]', 600);
      await p.fill('#ndec-t', title); await p.fill('#ndec-o', opts.join('\n'));
      await U.go('#ndec-go', 800);
      const R = '#pd-panel form[data-pd-form="prv:record"]';
      await p.check(R + ' input[name="c"][value="' + pick + '"]', { force: true });
      await p.fill('#prv-rb', why);
      for (const [i, t] of Object.entries(nots || {})) await p.fill('#prv-rn' + i, t).catch(() => {});
      for (const s of srcs || []) await p.check(R + ' input[name="ev"][value="' + s + '"]', { force: true }).catch(() => {});
      if (revisit) await p.fill('#prv-rv', revisit);
      await U.go(R + ' [type="submit"]', 700);
      return ((await out()).pv.dec || []).some(x => x.id === d.id && x.st === 'superseded');
    };
    const item = async (t, pg) => ((await out(pg)).pv.items || []).find(x => x.t === t);
    const princ = async t => (((await out()).pv.princ || []).find(x => x.t.indexOf(t) === 0) || {}).id;
    /* the Scope Gate: a new line, or (t null) what is open in it already */
    const gate = async (t, why, jb, ship, size, viol) => {
      if (t !== null) { await U.go('#pd-panel [data-pd="prv:gate"]', 600); await p.fill('#gate-t', t); }
      if (why) await p.fill('#gate-w', why).catch(() => {});
      if (jb) await p.check('#gate input[name="job"][value="' + jb + '"]', { force: true }).catch(() => {});
      await p.check('#gate input[name="ship"][value="' + ship + '"]', { force: true });
      await p.check('#gate input[name="size"][value="' + size + '"]', { force: true });
      if (await p.$('#gate input[name="viol"]')) await p.check('#gate input[name="viol"][value="' + (viol || 'none') + '"]', { force: true });
      await sleep(400);
      const said = (await U.text('#drawer-gate .dr-body')).slice(-260);
      if (await p.$eval('#gate-go', x => x.disabled)) { await U.go('#drawer-gate [data-close]', 300); return 'disabled: ' + said; }
      await U.go('#gate-go', 900);
      if (await U.drawer() === 'drawer-gate') { const h = await U.text('#drawer-gate'); await U.go('#drawer-gate [data-close]', 300); return 'still open: ' + h.slice(-300); }
      return said;
    };
    /* a parked idea through the Gate into Now, under a title of its own */
    const promote = async (t0, t, jb, ship, size, why) => {
      await tab('scope');
      await p.locator('#pd-panel li', { hasText: t0 }).locator('[data-pd="prv:gate"]').first().click(); await sleep(700);
      if (t) await p.fill('#gate-t', t);
      return gate(null, why, jb, ship, size, 'none');
    };
    /* a line in Next back to Now, through the Gate */
    const pull = async (t, t2, jb, size) => {
      await tab('scope');
      const x = await item(t); if (!x) return 'no ' + t;
      await U.go('#pd-panel [data-pd="prv:pull"][data-id="' + x.id + '"]', 700);
      const said = await gate(null, '', jb, 'need', size);
      /* the Gate keeps the line's title: a new name is given on Scope (Edit), once it is in Now */
      if (t2 && (await item(t)) && !(await item(t2))) {
        await tab('scope');
        await U.go('#pd-panel [data-pd="prv:sedit"][data-id="' + x.id + '"]', 500);
        const Fm = '#pd-panel form[data-pd-form="prv:item"][data-id="' + x.id + '"]';
        await p.fill(Fm + ' input[name="t"]', t2); await U.go(Fm + ' [type="submit"]', 600);
      }
      return said;
    };
    const never = async (t, w) => {
      await U.go('#pd-panel [data-pd="prv:sadd"]', 500);
      await p.fill('#prv-t-new-out', t); await p.fill('#prv-w-new-out', w);
      await U.go('#pd-panel form[data-pd-form="prv:item"][data-sec="out"] [type="submit"]', 500);
    };
    const park = async (t, pg) => {
      pg = pg || p;
      await pg.fill('#prv-qa', t); await pg.click('#pd-panel form[data-pd-form="prv:padd"] [type="submit"]'); await sleep(450);
    };
    /* the Gate asked about a line already in Never: it says so; then cancelled */
    const dupe = async (t, pg) => {
      pg = pg || p;
      await tab('scope', pg);
      await pg.click('#pd-panel [data-pd="prv:gate"]').catch(() => {}); await sleep(600);
      if (!(await pg.$('#gate-t'))) return 'no gate here';
      await pg.fill('#gate-t', t); await sleep(600);
      const said = await P(pg).text('#drawer-gate');
      await pg.click('#drawer-gate [data-close]').catch(() => {}); await sleep(300);
      return said;
    };
    const dod = async (t, lines, pg) => {
      pg = pg || p;
      const x = await item(t, pg); if (!x) return ok(false, 'no item ' + t);
      await tab('team', pg);
      await pg.click('#pd-panel [data-pd="wk:dod"][data-id="' + x.id + '"]').catch(() => {}); await sleep(400);
      if (!(await pg.$('#pd-panel form[data-pd-form="wk:dod"] textarea'))) return ok(false, 'no done-when form for ' + t + ' on ' + pg._who);
      await pg.fill('#pd-panel form[data-pd-form="wk:dod"] textarea', lines.join('\n')); await pg.click('#pd-panel form[data-pd-form="wk:dod"] [type="submit"]'); await sleep(500);
    };
    /* a check on a line: how it was checked, and what was seen when it does not work */
    const check = async (t, how, pass, saw, pg) => {
      pg = pg || p;
      const x = await item(t, pg); if (!x) { ok(false, 'no item ' + t); return false; }
      for (const tb of ['scope', 'team']) {
        await tab(tb, pg);
        if (await pg.$('#pd-panel [data-pd="wk:cp"][data-id="' + x.id + '"]')) break;
      }
      if (!(await pg.$('#pd-panel [data-pd="wk:cp"][data-id="' + x.id + '"]'))) { console.log('no check button for ' + t + ' on ' + pg._who); return false; }
      await pg.click('#pd-panel [data-pd="wk:cp"][data-id="' + x.id + '"]'); await sleep(400);
      const Fm = '#pd-panel form[data-pd-form="wk:cp"]';
      await pg.fill(Fm + ' [name="m"]', how);
      const rs = Fm + ' input[name="r"][value="' + (pass ? 'pass' : 'fail') + '"]';
      await pg.locator(Fm + ' label.prv-opt', { has: pg.locator(rs) }).click().catch(() => {}); await sleep(200);
      if (!(await pg.isChecked(rs).catch(() => false))) await pg.$eval(rs, el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
      if (!(await pg.inputValue(Fm + ' [name="m"]').catch(() => ''))) await pg.fill(Fm + ' [name="m"]', how);
      if (saw) await pg.fill(Fm + ' [name="n"]', saw);
      await pg.click(Fm + ' [type="submit"]'); await sleep(600);
      const n = ((await item(t, pg)) || {}).cp || [];
      return n.length > 0;
    };
    const tick = async (t, n) => {
      const x = await item(t); await tab('team');
      const boxes = await p.$$('#pd-panel input[data-wk="dod"][data-id="' + x.id + '"]');
      for (let i = 0; i < boxes.length && i < n; i++) if (!(await boxes[i].isChecked())) { await boxes[i].check({ force: true }); await sleep(350); }
    };

    // ============================================================ helpers: the team on Google Drive (the stand-in)
    const E = {}, DEV = { [OWNER]: p };
    const run = async pg => { await pg._tok(); const e = await pg.evaluate(() => window.__drv.sync.run().then(() => '', e => 'ERR ' + (e && e.stack || e))).catch(e => 'EVAL ' + e.message); if (e) console.log('sync on ' + pg._who + ': ' + e.slice(0, 400)); await sleep(200); };
    const round = async () => { await sleep(2500); for (const k of Object.keys(DEV)) await run(DEV[k]); await run(p); };
    const st = async (t, pg) => ((await item(t, pg)) || {}).st;
    const unit = async (t, pg) => { const x = await item(t, pg); return x ? x.id : ''; };
    /* the Owner gives a line to someone */
    const assign = async (t, who, pg) => {
      pg = pg || p;
      const id = await unit(t, pg), s = '#pd-panel select[data-wk="as"][data-id="' + id + '"]';
      const opts = await pg.$$eval(s + ' option', l => l.map(o => [o.value, o.textContent])).catch(() => []);
      const o = opts.find(x => (who === 'You' ? /^You/.test(x[1]) : x[1].indexOf(who) > -1));
      if (!o) { console.log('assign ' + t + ' to ' + who + ': ' + JSON.stringify(opts)); return false; }
      await pg.selectOption(s, o[0]); await sleep(600);
      return true;
    };
    const due = async (t, d, pg) => {
      pg = pg || p;
      const id = await unit(t, pg), s = '#pd-panel input[data-wk="due"][data-id="' + id + '"]';
      if (!(await pg.$(s))) { console.log('no date on ' + t); return; }
      await pg.$eval(s, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, d); await sleep(500);
    };
    const status = async (pg, t, v) => {
      const id = await unit(t, pg), s = '#pd-panel select[data-wk="st"][data-id="' + id + '"]';
      if (!(await pg.$(s))) { await tab('team', pg); }
      if (!(await pg.$(s))) { console.log('no status for ' + t + ' on ' + pg._who); return false; }
      await pg.selectOption(s, v).catch(async () => console.log('status ' + v + ' on ' + t + ': ' + JSON.stringify(await pg.$$eval(s + ' option', l => l.map(o => o.value)))));
      await sleep(700);
      return true;
    };
    /* Stuck, waiting on a person */
    const stuck = async (pg, t, why, on) => {
      await tab('team', pg); await status(pg, t, 'stuck');
      const Fm = '#pd-panel form[data-pd-form="wk:stuck"]';
      if (!(await pg.$(Fm))) { await P(pg).dump('#pd-panel li.wk-r[data-it="' + await unit(t, pg) + '"]', 'stuck form'); return false; }
      await pg.fill(Fm + ' [name="r"]', why);
      const v = await pg.$$eval(Fm + ' select[name="by"] option', (l, on) => (l.find(o => o.textContent.indexOf(on) > -1) || {}).value, on).catch(() => '');
      if (v) await pg.selectOption(Fm + ' select[name="by"]', v);
      await pg.click(Fm + ' [type="submit"]'); await sleep(600);
      return true;
    };
    /* a handover: the line goes to someone else, with what to do next, what is done, where things are */
    const handover = async (pg, t, to, done, next, where) => {
      await tab('team', pg);
      if (!(await assign(t, to, pg))) return false;
      const Fm = '#pd-panel form[data-pd-form="wk:ho"]';
      if (!(await pg.$(Fm))) { await P(pg).dump('#pd-panel li.wk-r[data-it="' + await unit(t, pg) + '"]', 'handover form'); return false; }
      await pg.fill(Fm + ' [name="next"]', next); await pg.fill(Fm + ' [name="done"]', done); await pg.fill(Fm + ' [name="where"]', where);
      await pg.click(Fm + ' [type="submit"]'); await sleep(600);
      return true;
    };
    const approve = async t => { await tab('team'); const id = await unit(t); await p.click('#pd-panel [data-pd="wk:approve"][data-id="' + id + '"]').catch(async () => console.log('no approve on ' + t + ': ' + await P(p).text('#pd-panel li.wk-r[data-it="' + id + '"]'))); await sleep(700); };
    const sendBack = async (t, why) => {
      await tab('team'); const id = await unit(t);
      await p.click('#pd-panel [data-pd="wk:back"][data-id="' + id + '"]').catch(() => console.log('no send back on ' + t)); await sleep(500);
      const f = await p.$('#pd-panel form[data-pd-form="wk:back"]') || await p.$('#pd-panel li.prv-fw form');
      if (!f) return;
      await (await f.$('input[name="r"], textarea, input:not([type="hidden"])')).fill(why); await (await f.$('[type="submit"]')).click(); await sleep(600);
    };
    /* the Owner waits for a line to reach In review, asking again on the Editor's device if it did not */
    const inReview = async (t, pg) => { for (let k = 0; k < 3 && (await st(t)) !== 'review'; k++) { await round(); if ((await st(t)) === 'review') break; await tab('team', pg); await status(pg, t, 'review'); await round(); await round(); } return (await st(t)) === 'review'; };
    /* an Editor takes a line to In review; the Owner approves it */
    const review = async (pg, t) => {
      await tab('team', pg);
      if ((await st(t, pg)) !== 'doing') await status(pg, t, 'doing');
      await status(pg, t, 'review');
      await round(); await round();
      if (await inReview(t, pg)) await approve(t); else console.log('still ' + (await st(t)) + ' on the Owner: ' + t);
      await round();
      return (await st(t)) === 'done';
    };
    const doneByOwner = async t => { await tab('team'); if ((await st(t)) !== 'doing') await status(p, t, 'doing'); await status(p, t, 'done'); return (await st(t)) === 'done'; };

    // ============================================================ checkpoints
    const save = async s => {
      const d = path.join(CK, s); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'db.sql'), require('child_process').execFileSync(path.join(process.env.SD_MYSQL_BIN || '', 'mysqldump'), ['-h', '127.0.0.1', '-u', process.env.SD_DB_USER || 'root', S.db], { maxBuffer: 1 << 28 }));
      fs.copyFileSync(path.join(S.srv, 'outbox.jsonl'), path.join(d, 'outbox.jsonl'));
      fs.writeFileSync(path.join(d, 'drive.json'), DRIVE.dump());
      fs.writeFileSync(path.join(d, 'vars.json'), JSON.stringify({ PID, keys, editors: Object.keys(E).map(k => [k, E[k]._who, E[k]._pid]) }));
      await p.context().close(); for (const k of Object.keys(E)) await E[k].context().close();
      fs.cpSync(PROF, path.join(d, 'prof'), { recursive: true });
      p = await device(OWNER, 'owner'); p._pid = PID; DEV[OWNER] = p;
      for (const k of Object.keys(E)) { const who = E[k]._who, pid = E[k]._pid; E[k] = await device(who, k); E[k]._pid = pid; DEV[who] = E[k]; }
    };
    const done = async s => { console.log('---- ' + s + ' done'); await save(s); if (UNTIL === s) throw new Stop(s); };
    if (ck) for (const [short, e, pid] of ck.editors) { const pg = await device(e, short); pg._pid = pid; E[short] = pg; DEV[e] = pg; }
    /* SD_PROBE=<title part>: what each device holds for the lines whose title has it, then stop (nothing typed) */
    if (process.env.SD_PROBE) {
      for (const [n, pg] of [['owner', p]].concat(Object.entries(E))) { const o = await out(pg); console.log('PROBE ' + n + ' ' + JSON.stringify((o.pv && o.pv.items || []).filter(x => x.t.indexOf(process.env.SD_PROBE) > -1 || process.env.SD_PROBE === '*').map(x => ({ id: x.id, t: x.t.slice(0, 30), sec: x.sec, st: x.st, as: x.as, stk: x.stk, ho: x.ho, by: x.by, rv: x.rv, ts: x.ts, u: x.u })))); }
      for (const [n, pg] of Object.entries(E)) console.log('PROBE ' + n + ' role ' + JSON.stringify(await pg.evaluate(id => { const k = window.__drv.sync.state().kept.find(x => x.id === id); return k && k.dv; }, pg._pid)));
      throw new Stop('probe');
    }

    // ============================================================ B. week 1 · the project and its Overview
    if (go('B')) {
      await U.go('.nav-i[data-view="projects"]', 400); await U.go('#npj-btn', 500);
      await p.fill('#npj-n', NAME); await U.go('#npj-kinds [data-k="private"]', 200); await U.go('#npj-l [data-f="vi"]', 200);
      await U.go('#npj-go', 1200);
      PID = await p.evaluate(() => { const m = /#pj-(.+)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; }); p._pid = PID;
      ok(!!PID, 'B1 the project: ' + PID);
      await edit('thesis', 'Người trẻ ở TP.HCM muốn có thêm bạn nhưng ngại làm quen. App giúp họ tìm bạn mới cùng sở thích ở gần mình.');
      await edit('focus', 'Tìm hiểu người 22–35 tuổi ở TP.HCM làm gì khi muốn đi chơi, chơi thể thao mà bạn bè không đi được');
      await edit('next', 'Phỏng vấn 8 người mới chuyển đến, làm từ xa hoặc đang tìm bạn chơi thể thao trong 2 tuần tới');
      for (const [t, u] of [['Blueprint Venli v1.0', 'https://docs.example.com/venli-blueprint'], ['Bảng theo dõi kèo concierge', 'https://sheets.example.com/venli-concierge'], ['Figma · Venli', 'https://www.figma.com/']]) await addLink(t, u);
      ok(/ngại làm quen/.test(await panel()) && /Figma · Venli/.test(await panel()), 'B2-B5 thesis, focus, next step, three links');
      await done('B');
    }

    // ============================================================ C. weeks 1-2 · Validate
    if (go('C')) {
      await tab('market');
      const SRC = [
        ['Blueprint Venli Vietnam v1.0 (nội bộ, 03/11/2026)', 'https://docs.example.com/venli-blueprint', 'Ý tưởng, MVP và kế hoạch ra mắt cho app giúp người Việt tìm người đi cùng một hoạt động ngoài đời. Đơn vị sản phẩm là "kèo" 3–6 người có giờ, chỗ, số chỗ. Không swipe, không nhắn riêng người lạ. Pilot theo cụm quận ở TP.HCM.', 'Mọi con số trong blueprint là giả thuyết và ngưỡng đề xuất, chưa phải kết quả. Việc đầu tiên là thử xem người ta có thật sự đi gặp người lạ quanh một hoạt động không.'],
        ['Venlig trên App Store', 'https://apps.apple.com/ca/app/venlig/id6747340001', '"Real-life meetups. Your way.": tìm hoặc tạo hoạt động với người ở gần, từ cà phê, đi bộ, concert đến tập luyện. Các bản gần đây thêm bản đồ, "People near you", chat nhóm và nhắn riêng, báo cáo, chặn; sự kiện công khai chỉ ở Copenhagen. Miễn phí; tiếng Anh, tiếng Đan Mạch.', 'Activity-first đã có người làm ở nước ngoài, và tên Venli rất gần Venlig. Không nên mang "People near you" về sớm: dễ trượt sang xem hồ sơ như app hẹn hò.'],
        ['Nghiên cứu cô đơn ở người Việt 16–30 tuổi (blueprint dẫn)', '', 'Theo blueprint, chưa mở được bài gốc: khảo sát 996 người ở Hà Nội, Phú Thọ, Đà Nẵng, TP.HCM: 56,6% thuộc nhóm cô đơn cao theo ngưỡng của nghiên cứu. Có bạn bè hỗ trợ đi kèm mức cô đơn thấp hơn. Không phải mẫu đại diện toàn quốc.', 'Nhu cầu kết nối có thật, nhưng không quảng cáo bằng chữ "cô đơn". Người ta tải app để đi chơi, không phải để thừa nhận mình cô đơn.'],
        ['Meetup · Hồ Chí Minh', 'https://www.meetup.com/find/vn--ho-chi-minh-city/', 'Nhóm đông nhất: Saigon Language & Culture Meetup 7.486 thành viên, Mundo Lingo Saigon 2.637. Có sự kiện boardgame, câu lạc bộ sách, chạy bộ và trao đổi ngôn ngữ do nhiều nhóm tổ chức.', 'Người ở TP.HCM đã chịu gặp người lạ quanh một hoạt động. Meetup mạnh ở sự kiện lên lịch sẵn, yếu ở "tối nay tôi muốn làm X".'],
        ['Bumble For Friends · trang giới thiệu', 'https://bff.bumble.com/', 'Trang giới thiệu BFF: dành cho người mới chuyển tới thành phố hoặc muốn mở rộng vòng bạn bè, gặp người hợp "vibe" của mình. Trang không nêu danh sách nước có app.', 'Đối thủ quốc tế gần nhất nói về gặp người hợp mình, không nói về một hoạt động có giờ, có chỗ.'],
        ['Phỏng vấn · Khoa, 27 tuổi, mới từ Đà Nẵng vào làm marketing', '', 'Vào Sài Gòn 4 tháng, đồng nghiệp đều đã có nhóm riêng. Muốn đi boardgame cuối tuần thì đăng bài nhóm Facebook, chờ comment, inbox, hai ngày mới chốt được 3 người. Lần trước tới nơi chỉ có 1 người.', 'Tắc ở khâu chốt người và biết ai đến thật, không phải ở khâu tìm hoạt động.'],
        ['Phỏng vấn · Hân, 26 tuổi, nhân viên ngân hàng', '', 'Muốn đi xem phim, đi workshop vẽ nhưng ngại đi riêng với người lạ. Từng thử app tìm bạn, vài ngày sau toàn tin nhắn rủ đi cà phê riêng. Chỉ đi nếu nhóm từ 3 người, ở quán đông, có nữ trong nhóm.', 'An toàn và chống hẹn hò phải nằm trong luồng sản phẩm: nhóm nhỏ mặc định, nơi công cộng, kèo chỉ dành cho nữ.'],
        ['Phỏng vấn · Duy, 25 tuổi, mới chơi pickleball', '', 'Nhóm cầu lông cũ đã lập gia đình, ít ai rảnh. Vào 3 nhóm Facebook tìm người chơi pickleball, lần nào cũng phải hỏi trình độ và chia tiền sân 280K qua inbox. Hai lần bị bỏ kèo sát giờ, phải trả cả tiền sân.', 'Kèo thể thao phải ghi trình độ và tiền sân ngay trên kèo. Người bỏ kèo sát giờ làm người khác mất tiền thật.'],
        ['Phỏng vấn · Mai, 31 tuổi, lập trình viên làm từ xa', '', 'Làm ở nhà cả tuần, có ngày không nói chuyện với ai. Muốn ra quán ngồi làm cùng vài người chiều thứ 7, không cần nói nhiều. Không muốn vào một cộng đồng phải sinh hoạt đều.', 'Có kèo cần yên tĩnh. Kèo phải ghi rõ vibe: nói chuyện, vận động hay tập trung.'],
        ['Quan sát · 3 nhóm Facebook tìm bạn chơi thể thao ở TP.HCM, 2 tuần', '', 'Đếm 214 bài rủ cầu lông, pickleball, chạy bộ. 61% bài kết thúc bằng "ib", không ghi giờ hoặc địa điểm cụ thể. Chỉ 18% bài có người comment chốt đi trong 24 giờ.', 'Nhu cầu có, nhưng bài đăng thiếu giờ, chỗ, số chỗ nên khó chốt. Mẫu kèo có sẵn các ô đó giải quyết đúng chỗ tắc.'],
        ['Nghị định 147/2024/NĐ-CP · xác thực tài khoản', 'https://thuvienphapluat.vn/', 'Theo blueprint: tài khoản mạng xã hội phải được xác thực bằng số điện thoại di động tại Việt Nam. Chưa mở được toàn văn để kiểm điều khoản.', 'Đăng ký bằng số điện thoại và OTP vừa là điều kiện pháp lý, vừa giảm tài khoản ảo.'],
        ['Luật Bảo vệ dữ liệu cá nhân (hiệu lực 01/01/2026)', 'https://thuvienphapluat.vn/', 'Theo blueprint: vị trí là dữ liệu cá nhân, chỉ xử lý đúng mục đích đã thông báo và được người dùng đồng ý. Chưa mở được toàn văn để kiểm.', 'Mặc định chỉ dùng vị trí gần đúng; vị trí chính xác chỉ đọc khi người dùng mở bản đồ hoặc check-in.']];
      let ns = 0; for (const s of SRC) if (await source(...s)) ns++;
      ok(ns === SRC.length, 'C1 twelve sources', ns);
      for (const t of ['Tìm người đi cùng một hoạt động trong hôm nay hoặc cuối tuần, gần nơi mình ở', 'Biết trước ai sẽ đi, bao nhiêu người, và mọi người có đến thật không',
        'Gặp người lạ trong nhóm nhỏ, ở nơi công cộng, không bị hiểu là hẹn hò', 'Mở một kèo nhanh mà không phải đăng bài, đọc comment, inbox từng người']) await job(t);
      ok(((await out()).pv.jobs || []).length === 4, 'C2 four jobs', ((await out()).pv.jobs || []).length);
      await comp('Venlig', 'Gặp ngoài đời theo hoạt động, với người ở gần', 'Free', 'Sản phẩm đã chạy thật: tìm hoặc tạo hoạt động gần mình, bản đồ, chat nhóm cho mỗi buổi gặp, báo cáo và chặn.', 'Chỉ có tiếng Anh, tiếng Đan Mạch; sự kiện công khai chỉ ở Copenhagen. Có "People near you" và nhắn riêng, dễ trượt sang xem hồ sơ.', [2]);
      await comp('Meetup', 'Cộng đồng và sự kiện lên lịch sẵn', '$', 'Nhóm lớn ở TP.HCM đã có thành viên: Saigon Language & Culture 7.486, Mundo Lingo 2.637; có cả sự kiện boardgame, chạy bộ.', 'Phải tìm và vào một nhóm trước. Mạnh ở sự kiện đã lên lịch, yếu ở kèo nhỏ trong ngày.', [4]);
      await comp('Bumble For Friends', 'Tìm bạn qua hồ sơ và match', '$', 'Thương hiệu lớn, nói thẳng với người mới chuyển tới thành phố muốn có thêm bạn.', 'Trang giới thiệu nói về gặp người hợp mình, không nhắc tới một hoạt động có giờ, có chỗ.', [5]);
      await comp('Nhóm Facebook tìm bạn chơi', 'Tự làm: đăng bài, chờ comment, inbox', 'Free', 'Đông người, miễn phí, ai cũng dùng.', 'Bài thiếu giờ, chỗ; chốt người qua inbox; không biết ai sẽ đến thật.', [6, 10], true);
      await comp('Nhóm Zalo bạn bè', 'Tự làm: rủ trong nhóm đã quen', 'Free', 'Người quen, tin nhau, chốt nhanh.', 'Phải có nhóm từ trước; lịch và sở thích của nhóm hay không trùng.', [6, 8], true);
      await comp('Câu lạc bộ sở thích', 'Tự làm: tham gia một cộng đồng cố định', '$', 'Sinh hoạt đều, có người dẫn, trình độ rõ.', 'Mỗi CLB một môn, phải đi đều; không giúp khi tối nay muốn làm việc khác.', [9], true);
      ok(((await out()).pv.comps || []).length === 6, 'C3 six rivals', ((await out()).pv.comps || []).map(c => c.n));
      const jids = await p.$$eval('#pd-panel button.prv-jb', l => l.map(b => b.getAttribute('data-id')));
      // Venlig, Meetup, Bumble, Facebook, Zalo, CLB
      await rate(jids[0], [['workaround', 'Đăng bài nhóm Facebook, inbox hai ngày mới chốt được 3 người đi boardgame', 6], ['mention', 'Muốn ngồi làm cùng vài người chiều thứ 7 nhưng không biết tìm ở đâu', 9]], ['full', 'partial', 'partial', 'partial', 'partial', 'none']);
      await rate(jids[1], [['paid', 'Hai lần bị bỏ kèo pickleball sát giờ, phải trả cả tiền sân 280K', 8], ['complaint', 'Hẹn 3 người, tới nơi chỉ có 1 người', 6]], ['partial', 'partial', 'none', 'none', 'partial', 'partial']);
      await rate(jids[2], [['complaint', 'Dùng app tìm bạn vài ngày thì toàn tin nhắn rủ đi cà phê riêng', 7], ['mention', '56,6% người trẻ trong khảo sát thuộc nhóm cô đơn cao; có bạn bè hỗ trợ thì đỡ hơn', 3]], ['partial', 'partial', 'none', 'none', 'full', 'full']);
      await rate(jids[3], [['workaround', '61% bài rủ chơi thể thao kết thúc bằng "ib", không ghi giờ hay địa điểm', 10]], ['full', 'none', 'none', 'partial', 'partial', 'none']);
      await U.go('#pd-panel [data-pd="prv:wedit"]', 400);
      await p.fill('#prv-wt', 'Kèo 3–6 người gần bạn, có sẵn giờ, chỗ, số chỗ và ai sẽ đến; không quẹt hồ sơ, không nhắn riêng người lạ');
      await p.selectOption('#prv-wj', jids[1]).catch(() => {});
      await U.go('#pd-panel form[data-pd-form="prv:wedge"] [type="submit"]', 500);
      for (const [k, t] of [['win', 'Kèo trong hôm nay, cách nhà dưới 3 km, chốt người không cần inbox'], ['weak', 'Chưa có người dùng; mở app thấy trống là người ta xoá app'],
        ['risk', 'Một vụ quấy rối trong kèo là mất lòng tin của người dùng nữ'], ['risk', 'Trượt thành app hẹn hò nếu hồ sơ và ảnh lấn át kèo'], ['risk', 'Tên Venli gần với Venlig; có thể phải đổi tên trước khi lên App Store']]) {
        await p.fill('#pd-panel form[data-pd-form="prv:asm"][data-k="' + k + '"] input', t); await U.go('#pd-panel form[data-pd-form="prv:asm"][data-k="' + k + '"] [type="submit"]', 400);
      }
      ok(/không nhắn riêng người lạ/.test(await panel()) && /Venlig; có thể phải đổi tên/.test(await panel()), 'C4 C5 evidence and levels, the wedge, three risks');
      await done('C');
    }

    // ============================================================ D. weeks 1-5 · two tests
    if (go('D')) {
      await tab('market');
      const newTest = async (q, m, ch, aud, n, okN, kill, due0) => {
        if (!(await p.$('#pq-q'))) await U.go('#pd-panel [data-pd="pf:new"]', 500);
        const PF = '#pd-panel form[data-pd-form="pf:new"]';
        await p.fill('#pq-q', q);
        await p.check(PF + ' input[name="pfm"][value="' + m + '"]', { force: true }); await sleep(300);
        if (ch) await p.fill('#pq-ch', ch).catch(() => {});
        if (aud && await p.$('#pq-who')) await p.fill('#pq-who', aud).catch(() => {});
        if (n != null && await p.$('#pq-n')) await p.fill('#pq-n', String(n));
        if (due0 && await p.$('#pq-due')) await p.fill('#pq-due', due0);
        await p.fill('#pq-ok', String(okN)); await p.fill('#pq-kill', String(kill));
        await U.go(PF + ' [type="submit"]', 800);
        if (await p.$(PF)) { console.log('test form still open: ' + await U.text(PF + ' .err')); await U.dump(PF, 'test form'); }
      };
      await newTest('Người 22–35 tuổi ở TP.HCM muốn có thêm bạn mới và sẽ dùng một app để tìm bạn', 'talk', 'Nhóm Facebook khu vực và người quen giới thiệu', 'Người 22–35 tuổi mới chuyển đến, làm từ xa, chơi thể thao', 8, 5, 2);
      const talk = async (who, rec, pay, note) => {
        await U.go('#pd-panel [data-pd="pf:log"]', 500);
        const L = '#pd-panel form[data-pd-form="pf:log"]';
        await p.fill('#pq-who', who); if (rec) await p.check(L + ' [name="rec"]', { force: true }); if (pay) await p.check(L + ' [name="pay"]', { force: true });
        await p.fill('#pq-ln2', note); await U.go(L + ' [type="submit"]', 600);
      };
      for (const r of [['Khoa, mới từ Đà Nẵng vào', 1, 1, 'Hai ngày inbox mới chốt kèo boardgame; không muốn "tìm bạn", muốn có người đi cùng'], ['Hân, nhân viên ngân hàng', 1, 0, 'Muốn đi workshop, xem phim; bỏ app tìm bạn vì toàn tin rủ đi riêng'],
        ['Duy, mới chơi pickleball', 1, 1, 'Vào 3 nhóm Facebook tìm người chơi; hai lần bị bỏ kèo, mất tiền sân'], ['Mai, làm từ xa', 1, 0, 'Muốn ngồi làm cùng ai đó chiều thứ 7; chưa thử cách nào'],
        ['Linh, bạn bè có con nhỏ', 0, 0, 'Không thấy thiếu bạn; chỉ muốn có người chạy cùng sáng chủ nhật'], ['Phúc, từng dùng app hẹn hò', 0, 1, 'Năm ngoái trả gói app hẹn hò "để tìm bạn", bị hiểu là hẹn hò, bỏ sau 1 tháng'],
        ['Thư, sinh viên năm cuối', 0, 0, 'Đã có nhóm bạn đại học; nghe "app tìm bạn" thấy ngại'], ['Nam, mới chuyển về Thảo Điền', 1, 1, 'Đi Meetup trao đổi ngôn ngữ 3 tuần liền; muốn kèo nhỏ hơn, gần nhà hơn']]) await talk(...r);
      ok(/3 strong interviews|3 of 8|3 trên 8/.test(await panel()), 'D1 eight interviews, three strong', (await panel()).slice(0, 300));
      const decideTest = async (o, why) => {
        await U.go('#pd-panel [data-pd="pf:dec"]', 500);
        await p.check('#pd-panel form[data-pd-form="pf:dec"] input[name="o"][value="' + o + '"]', { force: true });
        await p.fill('#pq-why', why);
        await U.go('#pd-panel form[data-pd-form="pf:dec"] [type="submit"]', 900);
      };
      await decideTest('narrow', '3 trên 8 đạt, và không ai muốn nói mình "tìm bạn". Cả 3 đều thiếu người đi cùng một việc cụ thể: boardgame, pickleball, trao đổi ngôn ngữ. Đổi cược sang kèo theo hoạt động.');
      ok(((await out()).pv.tests || []).some(t => t.dec === 'narrow'), 'D2 narrowed', ((await out()).pv.tests || []).map(t => t.dec));
      await tab('workspace');
      await edit('thesis', 'Ai muốn đi cà phê, chạy bộ, cầu lông mà thiếu người thì mở app thấy ngay kèo nhỏ gần mình hôm nay. Không quẹt, không nhắn riêng người lạ.');
      await tab('market');
      await newTest('Người ở Bình Thạnh, Phú Nhuận sẽ đến một kèo 3–6 người do người lạ mở, khi kèo ghi rõ giờ, chỗ, số chỗ', 'signup', 'Trang đăng ký, nhóm Zalo concierge, CLB chạy bộ Nhiêu Lộc', 'Người 20–35 tuổi sống hoặc làm ở Bình Thạnh, Phú Nhuận', null, 30, 10, day(21));
      const signup = async (n, what, from) => {
        await U.go('#pd-panel [data-pd="pf:log"]', 500);
        const L = '#pd-panel form[data-pd-form="pf:log"]';
        await p.fill('#pq-ln', String(n)); await p.fill('#pq-ln2', what + ' · ' + from);
        await U.go(L + ' [type="submit"]', 600);
        if (await p.$(L)) { console.log('log form still open: ' + await U.text(L + ' .err')); await U.dump(L, 'log form'); }
      };
      for (const r of [[12, 'Đến kèo cà phê, boardgame tuần đầu', 'Nhóm Facebook Bình Thạnh'], [9, 'Chạy 5:30 sáng dọc kênh Nhiêu Lộc, 3 kèo', 'CLB Nhiêu Lộc Runners'],
        [11, 'Cầu lông, pickleball tối thứ 3, thứ 5 ở sân Hoa Sứ', 'Trang đăng ký'], [7, 'Ngồi làm cùng chiều thứ 7 ở quán cà phê', 'Nhóm người làm từ xa']]) await signup(...r);
      ok(/39/.test(await panel()), 'D3 thirty-nine strangers came', (await panel()).slice(0, 300));
      ok(await source('Kết quả concierge · 3 tuần ở Bình Thạnh, Phú Nhuận', 'https://sheets.example.com/venli-concierge', '34 kèo, 118 lượt tham gia, 39 người khác nhau đến ít nhất một kèo. Tham gia → xác nhận 71%; xác nhận → có mặt 76%. 14 trên 39 người đi kèo thứ hai trong 14 ngày. Một báo cáo rủ hẹn hò trong nhóm Zalo.', 'Người lạ chịu gặp nhau quanh một việc cụ thể. Lỡ kèo nhiều nhất ở kèo trước 7 giờ sáng và kèo mở trước hơn 3 ngày.'), 'D3 source [13]');
      await decideTest('go', '39 người lạ đến ít nhất một kèo trong 3 tuần, vượt ngưỡng 30. 14 người đi kèo thứ hai trong 14 ngày. Có mặt sau xác nhận 76%, thấp nhất ở kèo trước 7 giờ sáng.');
      ok(((await out()).pv.tests || []).some(t => t.dec === 'go'), 'D4 go');
      await tab('workspace');
      await edit('focus', 'Chốt phạm vi v1: tìm, mở, tham gia, xác nhận kèo ở Bình Thạnh, Phú Nhuận, với 5 loại kèo của concierge');
      await edit('next', 'Mời chị Trúc vào nhóm lo host; cùng chị chọn 10 host concierge mở kèo tuần đầu');
      await done('D');
    }

    // ============================================================ E. week 5 · principles and decisions
    if (go('E')) {
      await tab('decisions');
      for (const t of ['Kèo là trung tâm; hồ sơ chỉ để tạo tin cậy', 'Nhóm 3–6 người là mặc định; không có luồng hẹn 1:1', 'Không nhắn riêng người lạ; chỉ chat nhóm sau khi tham gia kèo',
        'Không chấm sao con người; tin cậy đến từ việc có đến hay không', 'Gặp ở nơi công cộng là mặc định', 'Thời gian đến lúc gặp nhau quan trọng hơn thời gian ở trong app', 'Không thu tiền những gì cần để một kèo diễn ra']) {
        await p.fill('#prv-pa', t); await U.go('#pd-panel form[data-pd-form="prv:princ"] [type="submit"]', 400);
      }
      ok(((await out()).pv.princ || []).length === 7, 'E1 seven principles');
      ok(await decide('Cụm pilot đầu tiên', 'market', ['Bình Thạnh + Phú Nhuận', 'Quận 1 + Quận 3', 'Toàn TP.HCM'], 0, 'Concierge đã chạy ở đây: 39 người, 2 sân, 2 quán boardgame và CLB Nhiêu Lộc. Hai quận liền nhau, đi lại dưới 3 km.',
        { 1: 'Nhiều quán nhưng người ở xa đến làm; tối và cuối tuần thưa.', 2: 'Kèo bị rải mỏng, mở app thấy trống.' }, [1, 13], 'Sau 4 tuần cụm có dưới 12 kèo hiện mỗi ngày'), 'E2a');
      ok(await decide('Gọi đơn vị sản phẩm là gì', 'product', ['Kèo', 'Hoạt động', 'Sự kiện'], 0, 'Người 20–35 vẫn nói "lên kèo", "chốt kèo", "bỏ kèo". Chữ này nhẹ hơn sự kiện và nói luôn việc có hẹn, có giờ.',
        { 1: 'Đúng nhưng nhạt, không nói việc đã hẹn.', 2: 'Nghe trang trọng, giống Meetup.' }, [1, 10], 'Người dùng nhầm "kèo" với cá độ hoặc thấy chữ này quá teen'), 'E2b');
      ok(await decide('Nền tảng cho v1', 'tech', ['Flutter cho iOS và Android', 'PWA trước', 'Native từng nền tảng'], 0, 'Nhắc xác nhận là lõi của app và cần thông báo đẩy chắc chắn. Một mã nguồn cho cả hai nền tảng, Bảo làm một mình được.',
        { 1: 'Thông báo đẩy trên iPhone chỉ chạy khi đã thêm vào màn hình chính.', 2: 'Hai mã nguồn, chậm gấp đôi với một lập trình viên.' }, [], 'Bản đồ hoặc thông báo đẩy trên Flutter không đạt trên máy Android cấu hình thấp'), 'E2c');
      ok(await decide('Cách đăng ký', 'tech', ['Số điện thoại + OTP', 'Email', 'Đăng nhập Google, Apple'], 0, 'Tài khoản mạng xã hội cần xác thực bằng số điện thoại Việt Nam. Một số một tài khoản cũng làm tỷ lệ có mặt có nghĩa.',
        { 1: 'Tạo tài khoản ảo quá dễ.', 2: 'Không thay được xác thực số điện thoại; có thể thêm sau.' }, [11], ''), 'E2d');
      ok(await decide('Khi nào nhắc xác nhận', 'product', ['3 giờ trước giờ gặp', '24 giờ trước', 'Không nhắc, chỉ giữ chỗ'], 0, 'Đủ gần để người ta biết mình có đi được không, còn đủ thời gian cho danh sách chờ vào thay.',
        { 1: 'Quá xa, xác nhận rồi vẫn bỏ.', 2: 'Concierge cho thấy không nhắc thì có mặt dưới 60%.' }, [1, 13], 'Một loại kèo có tỷ lệ có mặt dưới 70%'), 'E2e');
      ok(await decide('Cách check-in', 'product', ['Tự check-in khi ở trong 150 m quanh chỗ hẹn', 'Host đánh dấu ai đã đến', 'Quét mã QR của host'], 0, 'Không bắt host làm thêm việc; người tham gia tự bấm khi tới.',
        { 1: 'Thêm việc cho host, nhất là kèo đông.', 2: 'Phải mở app cùng lúc, lúng túng ngay lúc gặp.' }, [12], 'Hơn 10% lượt check-in bị báo "chưa tới nơi"'), 'E2f');
      ok(await decide('Tên sản phẩm', 'market', ['Venli', 'Đi Cùng', 'Kèo Nhỏ'], 0, 'Ngắn, đọc được cả tiếng Việt lẫn tiếng Anh. Host và người đi concierge đã quen gọi "kèo Venli" suốt 3 tuần.',
        { 1: 'Nói đúng việc app làm nhưng khó làm thương hiệu, khó tìm trên App Store.', 2: 'Gần chữ cá độ.' }, [1, 2], 'Kiểm tra nhãn hiệu hoặc App Store báo trùng với Venlig'), 'E2g');
      await done('E');
    }

    // ============================================================ F. weeks 5-6 · the Scope of v1
    if (go('F')) {
      await tab('scope');
      await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
      await p.fill('#prv-rn', 'v1 MVP').catch(() => {});
      await p.fill('#prv-rs', 'Người ở Bình Thạnh, Phú Nhuận tự tìm, mở, tham gia và xác nhận kèo trên app; không cần nhóm mình chốt người qua Zalo');
      await p.fill('#prv-rd', day(42)); await p.fill('#prv-rc2', '30');
      await U.go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
      ok(/v1 MVP/.test(await panel()), 'F1 release v1 MVP');
      const pKeo = await princ('Kèo là trung tâm'), pNhan = await princ('Không nhắn riêng');
      const V1 = [[IT.dk, '', 'j3', 'need', 'S'], [IT.gan, '', 'j1', 'need', 'M'], [IT.tao, 'Concierge: 61% bài Facebook không có giờ, chỗ; mẫu kèo bắt điền đủ.', 'j4', 'need', 'M'],
        [IT.tg, 'Hẹn 3 người, tới nơi 1 người: danh sách chờ giữ kèo không đổ.', 'j2', 'need', 'M'], [IT.chat, '', 'j3', 'need', 'S'], [IT.nhac, '', 'j2', 'need', 'M'], [IT.ci, '', 'j2', 'need', 'M'],
        [IT.ph, '', 'j2', 'need', 'S'], [IT.hs, '', 'j2', 'need', 'S'], [IT.bc, 'Concierge có một báo cáo rủ hẹn hò ngay tuần đầu.', 'j3', 'need', 'S'], [IT.bd, '', 'j1', 'weak', 'M'],
        [IT.ds, '', 'j1', 'fine', 'M', pKeo], [IT.nr, '', 'j4', 'fine', 'S', pNhan]];
      for (const [t, why, j, sh, sz, vi] of V1) { const g = await gate(t, why, j, sh, sz, vi); const x = await item(t); if (!x) ok(false, 'F2 Gate: ' + t, g); }
      const secs = ((await out()).pv.items || []).reduce((m, x) => { m[x.sec] = (m[x.sec] || 0) + 1; return m; }, {});
      ok(secs.in === 10 && secs.next === 1 && secs.out === 2, 'F2 ten in Now, one in Next, two in Never', secs);
      await tab('scope');
      for (const t of ['Gợi ý mở lại kèo tương tự tuần sau #host', 'Biến concert, workshop thành kèo đi cùng #sukien', 'Trang cho quán cà phê, sân cầu lông #venue', 'Ước giờ đi đường thay cho số km #bando', 'Ảnh đại diện lớn trên thẻ kèo #hoso']) await park(t);
      await never('Quẹt hồ sơ để chọn người đi cùng', 'Quẹt là cách của app hẹn hò; người ta chọn kèo, không chọn người.');
      await never('Chấm sao 1–5 cho người tham gia', 'Chấm sao người thật dễ thành bêu xấu và trả đũa; tỷ lệ có mặt là đủ.');
      await never('Ghép người bằng AI', 'Xếp theo giờ, khoảng cách, chỗ trống và độ tin cậy host là đủ khi chưa có dữ liệu thật.');
      ok(/Never|Không làm/.test(await dupe('nhan rieng nguoi la')), 'F8 the Gate sees it is in Never already');
      await tab('scope');
      await U.go('#pd-panel [data-pd="prv:base"]', 700);
      ok(((await out()).pv.bls || []).length === 1, 'F9 the baseline');
      await p.locator('#pd-panel li', { hasText: 'Ảnh đại diện lớn' }).locator('[data-pd="prv:idrp"]').first().click().catch(() => {}); await sleep(500);
      await p.fill('#pd-panel form[data-pd-form="prv:drop"] [name="w"]', 'Ảnh lấn át kèo là bước đầu thành app hẹn hò; thẻ kèo chỉ hiện ảnh nhỏ.').catch(() => {});
      await U.go('#pd-panel form[data-pd-form="prv:drop"] [type="submit"]', 600).catch(() => {});
      ok(((await out()).pv.park || []).length >= 4, 'F4 F10 ideas parked, one ruled out');
      await done('F');
    }

    // ============================================================ G. week 6 · the team: Bảo, Anh, Trúc as Editors
    if (go('G')) {
      const member = async (n, e) => {
        await U.go('.nav-i[data-view="settings"]', 500);
        await U.btn('#view-settings', 'Team', 500).catch(() => {});
        await U.go('#tm-add', 600);
        await p.fill('#tm-name', n); await p.fill('#tm-email', e);
        await p.selectOption('#tm-role', 'Editor').catch(() => {});
        await U.go('#tm-go', 700);
      };
      const invite = async e => {
        const team = (await out()).team || [];
        if (team.length) { await tab('team'); await U.go('#pd-panel [data-pd="invite"]', 800); }
        else { await tab('workspace'); await U.go('#pd-more', 400); await U.go('[role="menu"] [data-m="invite"]', 800); }
        if (await p.isVisible('#inv-gate button').catch(() => false)) await U.go('#inv-gate button', 2000);
        if (!(await p.$('#inv-list input[value="' + e + '"]'))) { await U.dump('#drawer-invite', 'invite drawer'); if (await U.drawer()) await U.go('.drawer.dr-live [data-close]', 400); return false; }
        await p.check('#inv-list input[value="' + e + '"]', { force: true });
        await p.locator('#inv-list li', { has: p.locator('input[value="' + e + '"]') }).locator('select').selectOption('Editor').catch(() => {});
        await U.go('#inv-go', 2500);
        return ((await out()).team || []).some(m => m.e === e);
      };
      const ED = [['Trần Quốc Bảo', BAO, 'Bảo'], ['Lê Ngọc Anh', ANH, 'Anh'], ['Võ Thanh Trúc', TRUC, 'Trúc']];
      for (const [n, e] of ED) await member(n, e);
      for (const [n, e] of ED) ok(await invite(e), 'G2 ' + n + ' is on the project as an Editor', ((await out()).team || []).map(m => m.n + '/' + m.role));
      const tm = (await out()).team || [];
      ok(tm.length === 3 && tm.every(m => m.role === 'Editor'), 'G2 four people only: the Owner and three Editors, no Viewer', tm.map(m => m.n + '/' + m.role));
      await run(p); await run(p);
      const kept =(await p.evaluate(() => window.__drv.sync.state())).kept.filter(x => x.id === PID)[0];
      const fid = kept && kept.dv && kept.dv.fid;
      ok(!!fid, 'G3 kept in (the stand-in) Google Drive');
      for (const [n, e, short] of ED) {
        const pg = await device(e, short);
        await pg.click('.user[data-view="profile"]').catch(() => {}); await sleep(500);
        await pg.evaluate(n => { const e = document.getElementById('pf-name'); if (!e) return; e.value = n; e.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('pf').requestSubmit(); }, n); await sleep(800);
        const files = Object.values(DRIVE.files).filter(f => f.parents.includes(fid) && !f.trashed && /\.sdteam$/.test(f.name));
        files.forEach(f => DRIVE.pick(e, f.id));
        await pg.evaluate(m => window.__drv.sync.join(m), { fid, files: files.map(f => ({ id: f.id, name: f.name })) });
        DEV[e] = pg; await run(pg); await run(p); await run(pg);
        const k = (await pg.evaluate(() => window.__drv.sync.state())).kept.filter(x => x.n === NAME)[0];
        ok(k && k.dv.role === 'Editor', 'G3 ' + short + ' joins, as an Editor', k && k.dv);
        pg._pid = k && k.id; E[short] = pg;
      }
      await round(); await round();
      /* F3: what done means for five lines, written once the Team tab is there */
      await dod(IT.tao, ['Tạo kèo cà phê trong 60 giây', 'Cầu lông hỏi trình độ và tiền sân; cowork hỏi yên tĩnh hay nói chuyện', 'Nhóm mặc định 4, ít nhất 3, nhiều nhất 8']);
      await dod(IT.tg, ['Hai người bấm cùng lúc vào chỗ cuối thì một người vào, người kia vào danh sách chờ', 'Có người rời kèo thì người đầu danh sách chờ được báo, có 30 phút để nhận', 'Kèo đủ người vẫn hiện, ghi "Còn 0 chỗ"']);
      await dod(IT.nhac, ['Nhắc 3 giờ trước giờ gặp', 'Không xác nhận trước 1 giờ thì nhả chỗ', 'Thông báo không hiện tên người khác trong kèo']);
      await dod(IT.hs, ['Tỷ lệ có mặt chỉ hiện sau 5 lần xác nhận', 'Không có chấm sao', 'Báo cáo an toàn không hiện công khai']);
      await dod(IT.bc, ['Có lý do riêng "Rủ hẹn hò, gạ gẫm"', 'Chặn xong thì không thấy kèo của nhau', 'Người bị báo cáo không biết ai báo', 'Quy tắc cộng đồng hiện trước lần tham gia đầu']);
      await tab('team');
      const G4 = [[IT.dk, 'Trần Quốc Bảo', 7], [IT.gan, 'Trần Quốc Bảo', 9], [IT.tg, 'Trần Quốc Bảo', 8], [IT.nhac, 'Trần Quốc Bảo', 9], [IT.ci, 'Trần Quốc Bảo', 10],
        [IT.tao, 'Lê Ngọc Anh', 7], [IT.bc, 'Lê Ngọc Anh', 8], [IT.hs, 'Lê Ngọc Anh', 9], [IT.ph, 'Lê Ngọc Anh', 10], [IT.chat, 'You', 8]];
      let na = 0; for (const [t, who] of G4) if (await assign(t, who)) na++;
      for (const [t, , w] of G4) await due(t, wk(w));
      await round(); await round();
      const items = (await out()).pv.items.filter(x => x.sec === 'in');
      ok(na === 10 && items.filter(x => x.due).length >= 9, 'G4 ten lines given out, each with its date', [na, items.map(x => (x.as || '-') + ' ' + (x.due || ''))]);
      await done('G');
    }

    // ============================================================ H + I. weeks 6-11 · building v1; Trúc tries it with the hosts
    if (go('H')) {
      /* A check is recorded on a line that is done, by the Owner or by the person it is given to. What Trúc finds with the hosts
         while a line is still being built reaches its maker as the Owner's "send back"; once it is done, its maker records the check. */
      const B = E['Bảo'], A = E['Anh'], T = E['Trúc'];
      await tab('team', B); await status(B, IT.dk, 'doing'); await status(B, IT.tg, 'doing');
      await tab('team', A); await status(A, IT.tao, 'doing');
      await round(); await round();
      ok(await review(B, IT.dk), 'H2 Bảo’s sign-up: In review, approved');
      // I2 H3: Trúc tries the running template with a host; the Owner sends the templates back; Anh fixes them; I1 the check
      await tab('team', A); await status(A, IT.tao, 'review'); await round(); await round();
      await inReview(IT.tao, A);
      await sendBack(IT.tao, 'Trúc thử với host CLB Nhiêu Lộc: mẫu Chạy bộ không có ô cự ly và pace. Host ghi vào ghi chú, có bạn tới chạy 10 km tưởng là 5 km.');
      await round(); await round();
      ok((await st(IT.tao, A)) !== 'review', 'I2 H3 the templates sent back to Anh', await st(IT.tao, A));
      ok(await review(A, IT.tao), 'H3 the templates approved');
      ok(await check(IT.tao, 'Trúc cùng 10 host thử lại: kèo cà phê tạo trong 52 giây; mẫu Chạy bộ đã có cự ly và pace.', true, '', A), 'I1 the templates checked');
      ok(await doneByOwner(IT.chat), 'H3 the Owner’s group chat done');
      // I3: what the hosts said (the Owner keeps the sources); Trúc's ideas; women-only through the Gate; its decision
      await tab('market');
      ok(await source('Góp ý của 10 host chạy thử · tuần 7–10', '', 'Host nữ xin kèo chỉ dành cho nữ cho kèo tối. Host cầu lông xin nhắn riêng người xin vào để hỏi trình độ. Hai host xin chấm sao người tham gia để lọc người hay bỏ. Hồ sơ người mới không hiện tỷ lệ có mặt, host tưởng lỗi. CLB chạy phải tạo lại kèo mỗi tuần.', 'Kèo chỉ dành cho nữ là điều kiện để nữ đi kèo tối. Nhắn riêng và chấm sao đã có trong Không làm. Tỷ lệ có mặt ẩn với người mới là cố ý. Kèo lặp để v2.'), 'I3 source [14]');
      await tab('scope', T); await park('Kèo chỉ dành cho nữ, host duyệt người vào #antoan', T); await park('Kèo lặp hằng tuần cho CLB #host', T);
      await round(); await round();
      const gNu = await promote('Kèo chỉ dành cho nữ', IT.nu, 'j3', 'need', 'S', 'Host nữ: các bạn nữ chỉ đi kèo tối khi cả nhóm là nữ.');
      ok(((await item(IT.nu)) || {}).sec === 'in', 'I3 women-only kèo in Now (drift), from Trúc’s idea', gNu);
      await tab('team'); await assign(IT.nu, 'Lê Ngọc Anh'); await due(IT.nu, wk(10));
      ok(await decide('Ai được vào kèo chỉ dành cho nữ', 'product', ['Tự khai trong hồ sơ, host duyệt người vào', 'Xác minh bằng ảnh CCCD', 'Chỉ tự khai'], 0, 'Host CLB đã quen duyệt người vào nhóm. Chưa cần giữ giấy tờ tuỳ thân của người dùng.',
        { 1: 'Giữ ảnh giấy tờ là rủi ro dữ liệu lớn khi app còn nhỏ.', 2: 'Ai cũng chọn được, kèo mất nghĩa.' }, [7, 12, 14], ''), 'I3 the women-only decision');
      // I4 H5: two people on the last place: sent back; then done; I8 the check
      await round(); await round();
      await tab('team', B); await status(B, IT.tg, 'review'); await round(); await round();
      await inReview(IT.tg, B);
      await sendBack(IT.tg, 'Trúc thử với host cầu lông ở sân Hoa Sứ: kèo còn 1 chỗ, hai bạn bấm cùng lúc đều vào được, nhóm thành 7 trên 6.');
      await round(); await round();
      ok(await review(B, IT.tg), 'I4 H5 joining sent back once, then approved');
      ok(await check(IT.tg, 'Trúc thử lại với host: kèo đủ 6, một bạn rời kèo; người đầu danh sách chờ nhận báo và vào được sau 2 phút.', true, '', B), 'I8 joining checked');
      // I5 H6: the community rules; the report line approved
      await dod(IT.bc, ['Quy tắc 7 điều: nơi công cộng, đúng giờ, báo trước nếu không đi, không rủ hẹn hò, không bán hàng, tôn trọng người mới, host không thu thêm tiền'], A);
      await round(); await round();
      ok(await review(A, IT.bc), 'H6 report and block approved, with the seven rules');
      // H4: Bảo is stuck, waiting on Anh's words; she writes them; he goes on
      await tab('team', B); await status(B, IT.nhac, 'doing');
      ok(await stuck(B, IT.nhac, 'Chưa có chữ cho tin nhắc và tin nhả chỗ; cần Anh viết trước.', 'Lê Ngọc Anh'), 'H4 Bảo: stuck, waiting on Anh');
      await round(); await round();
      ok(!!((await item(IT.nhac)) || {}).stk, 'H4 the Owner sees it stuck', await item(IT.nhac));
      await dod(IT.nhac, ['Tin nhắc: "Kèo của bạn bắt đầu lúc …. Bấm Xác nhận để giữ chỗ."', 'Tin nhả chỗ: "Bạn chưa xác nhận nên chỗ đã nhường cho người chờ."'], B);   /* Anh wrote the words; the line is Bảo's, so he adds them */
      await round(); await round();
      await tab('team', B); await status(B, IT.nhac, 'doing'); await round();
      // H7: focus on the reminder
      await tab('workspace');
      await edit('focus', IT.nhac); await edit('next', 'Cho 10 host concierge chạy thử app hai tuần, chưa mở cho người ngoài');
      // I6: the reminder at 2:30 in the morning: sent back; the decision replaced; a line added
      await tab('team', B); await status(B, IT.nhac, 'review'); await round(); await round();
      await inReview(IT.nhac, B);
      await sendBack(IT.nhac, 'Trúc chạy thử với CLB Nhiêu Lộc: kèo 5:30 sáng thứ 3, app nhắc xác nhận lúc 2:30 sáng. 4 bạn đang ngủ, bị nhả chỗ lúc 4:30.');
      await round(); await round();
      ok(await replace('Khi nào nhắc xác nhận', ['3 giờ trước; kèo trước 10:00 nhắc lúc 21:00 hôm trước', '24 giờ trước cho mọi kèo'], 0,
        'Không ai xác nhận lúc 2 giờ sáng, mà concierge cũng cho thấy kèo sáng sớm lỡ nhiều nhất. Không nhắc từ 22:00 đến 7:00; chưa xác nhận đến 22:30 thì nhả chỗ cho danh sách chờ.', { 1: 'Quá xa, xác nhận rồi vẫn bỏ.' }, [13], ''), 'I6 the reminder decision replaced');
      await dod(IT.nhac, ['Không gửi nhắc từ 22:00 đến 7:00']);
      // I7: Trúc asks the Gate twice: both already in Never
      const d1 = await dupe('Host nhắn riêng người xin vào kèo', T), d2 = await dupe('Cham sao nguoi tham gia', T);
      ok(/Never|Không làm|already|đã/i.test(d1 + d2) || /no gate/.test(d1), 'I7 the Gate tells Trúc both are ruled out already', [d1.slice(0, 120), d2.slice(0, 120)]);
      // H8: Anh hands over the after-kèo feedback to Trúc
      await round();
      await tab('team', A); await status(A, IT.ph, 'doing'); await round();
      ok(await handover(A, IT.ph, 'Võ Thanh Trúc', 'Màn 3 chạm và chữ cho từng chạm', 'Thử với host xem người tham gia có bấm sau kèo không', 'Figma · Venli, trang Sau kèo'), 'H8 Anh hands over the after-kèo feedback to Trúc');
      await round(); await round();
      await tab('team', T); await status(T, IT.ph, 'doing'); await round();
      // H9: the rest of v1; I9 the reminder checked
      ok(await review(B, IT.nhac), 'H9 the reminder approved');
      ok(await check(IT.nhac, 'Trúc thử lại với CLB: kèo 5:30 thứ 5 nhắc lúc 21:00 thứ 4, không có tin nào sau 22:00; 6 trên 6 bạn xác nhận.', true, '', B), 'I9 the reminder checked');
      ok(await review(B, IT.gan), 'H9 Near you approved');
      await tab('team', B); await status(B, IT.ci, 'doing'); await round();
      ok(await review(A, IT.hs), 'H9 the trust profile approved');
      ok(await review(A, IT.nu), 'H9 women-only approved');
      ok(await review(T, IT.ph), 'H9 Trúc’s after-kèo feedback approved');
      // I10: check-in fails in a third-floor café: Bảo is stuck on it, waiting on the Owner's call
      ok(await stuck(B, IT.ci, 'Trúc thử ở Xí Ngầu, tầng 3 trong hẻm Phan Xích Long: 4 trên 5 bạn bị báo "chưa tới nơi" dù đang ngồi trong quán. Cần chốt lại cách check-in.', 'Robert'), 'I10 check-in stuck: "not there yet" on the third floor');
      await round(); await round();
      // H10: done-when ticked
      await tick(IT.tao, 3); await tick(IT.tg, 3); await tick(IT.hs, 3); await tick(IT.bc, 5); await tick(IT.nhac, 6);
      const v1 = (await out()).pv.items.filter(x => x.sec === 'in'), left = v1.filter(x => x.st !== 'done').map(x => x.t);
      ok(left.length === 1 && left[0] === IT.ci, 'H10 all of v1 done but check-in', left);
      await done('H');
    }

    // ============================================================ J. week 11 · checks before the release (each by the line's maker)
    if (go('J')) {
      const B = E['Bảo'], A = E['Anh'], T = E['Trúc'];
      ok(await check(IT.tg, '20 máy bấm cùng lúc vào chỗ cuối: 1 người vào, 19 người vào danh sách chờ', true, '', B), 'J1');
      ok(await check(IT.nhac, 'Kèo 6:00 sáng: nhắc lúc 21:00 hôm trước; không có nhắc nào từ 22:00 đến 7:00', true, '', B), 'J2');
      ok(await check(IT.gan, 'Đứng trong 6 quán tầng cao trong hẻm ở hai quận, mở Gần bạn và lọc 1 km', false, 'Ở 4 trên 6 quán, vị trí lệch hơn 150 m: kèo ngay trong quán bị xếp sau kèo cách 1 km. Cùng lỗi với check-in; chưa có cách sửa trong v1.', B), 'J3 a check that fails');
      ok(await check(IT.bc, 'Chặn người kia thì không thấy kèo của nhau; người bị báo cáo không biết ai báo', true, '', A), 'J4');
      ok(await check(IT.nu, 'Người tự khai nam không thấy nút tham gia; host duyệt từng người lần đầu vào kèo', true, '', A), 'J5');
      ok(await check(IT.ph, '10 host, 64 lượt gặp: 51 lượt bấm phản hồi trong 2 giờ sau kèo', true, '', T), 'J6');
      await round(); await round();
      ok((((await item(IT.gan)) || {}).cp || []).length && (((await item(IT.ph)) || {}).cp || []).length, 'J the Owner has the checks');
      await done('J');
    }

    // ============================================================ K. week 12 · ship v1
    if (go('K')) {
      await tab('scope');
      await U.go('#pd-panel [data-pd="prv:ship"]', 600);
      const SH = '#pd-panel form[data-pd-form="prv:ship"]';
      await p.check(SH + ' input[name="met"][value="mostly"]', { force: true });
      await p.fill('#prv-sm', 'Tìm, mở, tham gia, xác nhận kèo, chat nhóm và báo cáo đã chạy ở Bình Thạnh, Phú Nhuận. Check-in chuyển sang v2.');
      await p.fill('#prv-sn', 'v2').catch(() => {});
      await U.go(SH + ' [type="submit"]', 900);
      ok(((await out()).pv.ships || []).length === 1 && ((await item(IT.ci)) || {}).sec === 'next', 'K1 v1 MVP shipped, mostly; check-in in Next', ((await out()).pv.ships || []).map(s => [s.name, s.met]));
      await tab('workspace');
      await edit('focus', 'Theo dõi tháng đầu: bao nhiêu người đi kèo thứ hai trong 30 ngày mà không cần nhóm mình mở kèo');
      await edit('next', 'Mỗi tối Trúc gọi 3 người vừa bỏ kèo, hỏi vì khoảng cách, giờ giấc hay ngại');
      await done('K');
    }

    // ============================================================ L. weeks 12-16 · after v1
    if (go('L')) {
      const T = E['Trúc'];
      await tab('workspace');
      await U.btn('#pd-panel', 'Set a launch check', 500);
      const LC = '#pd-panel form[data-pd-form="pf:new"][data-k="launch"]';
      await p.fill('#pq-q', 'Người đã đi một kèo tự đi kèo thứ hai trong 30 ngày, do người dùng khác mở');
      await p.fill('#pq-ch', 'Người đi kèo đầu ở Bình Thạnh, Phú Nhuận'); await p.fill('#pq-ok', '3'); await p.fill('#pq-kill', '1');
      await U.go(LC + ' [type="submit"]', 800);
      for (const note of ['Tháng đầu: 412 người đi ít nhất một kèo; 158 người (38%) đi kèo thứ hai trong 30 ngày', 'Xác nhận → có mặt 83%, sau khi đổi giờ nhắc kèo sáng sớm', 'Tuần 4: 61% kèo do người dùng tự mở; nhóm mình chỉ mở 9 kèo']) {
        await U.go('#pd-panel [data-pd="pf:log"]', 500);
        await p.fill('#pq-ln', '1'); await p.fill('#pq-ln2', note);
        await U.go('#pd-panel form[data-pd-form="pf:log"] [type="submit"]', 600);
      }
      await U.go('#pd-panel [data-pd="pf:dec"]', 500);
      await p.check('#pd-panel form[data-pd-form="pf:dec"] input[name="o"][value="grow"]', { force: true });
      await p.fill('#pq-why', '38% đi kèo thứ hai trong 30 ngày, trên mức 35% của blueprint. Có mặt sau xác nhận 83%. Người dùng tự mở 61% kèo.');
      await U.go('#pd-panel form[data-pd-form="pf:dec"] [type="submit"]', 800);
      const lt = ((await out()).pv.tests || []).find(t => t.kind === 'launch');
      ok(lt && lt.dec === 'grow', 'L1 L2 the launch check: keep going', lt && lt.dec);
      const l3 = await check(IT.gan, 'Trúc mở app lúc 0:30, xem mục Tối nay', false, 'Mở mục Tối nay lúc 0:30 vẫn thấy kèo 19:00 đã xong; người dùng bấm vào tưởng còn.', E['Bảo']);
      if (!l3) console.log('NOTE L3: no check on a shipped line; the bug is said by its v2 line (M1)');
      await round();
      ok(await replace('Cách check-in', ['Host đánh dấu ai đã đến; vị trí chỉ là gợi ý', 'Nới bán kính lên 300 m'], 0,
        'Quán trong hẻm, tầng cao, GPS lệch hơn 150 m. Host luôn có mặt và biết ai đến. Vị trí chỉ gợi ý cho host, không tự kết luận ai vắng.', { 1: 'Rộng ra thì đứng quán bên cạnh cũng check-in được.' }, [12], ''), 'L4 the check-in decision replaced');
      ok(await decide('Gói trả phí đầu tiên', 'market', ['Host Pro cho CLB và host mở kèo đều', 'Plus cho người tham gia', 'Trả tiền để kèo lên đầu'], 0,
        'CLB như Nhiêu Lộc Runners mở 8 kèo mỗi tháng và cần kèo lặp, đồng host. Người tham gia phải dùng miễn phí thì mọi kèo mới đủ người.',
        { 1: 'Thu tiền người tham gia khi kèo còn thưa là tự bóp thanh khoản.', 2: 'Phá xếp hạng theo giờ, khoảng cách; để sau khi có tài khoản cho quán.' }, [1], 'Dưới 10 host trả Host Pro sau 2 tháng mở bán'), 'L5 the first paid plan');
      await tab('workspace');
      await edit('thesis', 'Ai ở Bình Thạnh, Phú Nhuận muốn đi mà thiếu người thì mở app thấy kèo nhỏ gần mình hôm nay, và người ta đến thật. Không quẹt, không nhắn riêng.');
      await tab('scope');
      await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
      await p.fill('#prv-rs', 'Host mở kèo lặp hằng tuần có đồng host; người vừa đi xong mở lại kèo cùng nhóm bằng một chạm; host đánh dấu ai đã đến');
      await p.fill('#prv-rd', day(42)); await p.fill('#prv-rc2', '20');
      await U.go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
      ok(/kèo lặp hằng tuần có đồng host/.test(((await out()).pv.rel || {}).ship || ''), 'L7 release v2 planned');
      await tab('workspace');
      await edit('focus', 'Giúp host mở kèo đều mỗi tuần mà không phải tạo lại từ đầu');
      await edit('next', 'Trúc ngồi với 4 host mở nhiều kèo nhất, xem họ tạo kèo mỗi tuần thế nào');
      ok(((await out()).pv.th || []).length >= 3, 'L6 L8 the thesis said a third time; focus and next step');
      await done('L');
    }

    // ============================================================ M. week 16 · the Scope of v2
    if (go('M')) {
      await tab('scope');
      let g = await promote('Kèo lặp hằng tuần', IT.lap, 'j4', 'need', 'M', 'CLB Nhiêu Lộc tạo lại 2 kèo giống hệt mỗi tuần; host đều đặn là nguồn kèo chính.');
      for (const [t, why, j, sh, sz] of [[IT.dh, '', 'j4', 'need', 'S'], [IT.ml, 'Tuần 3 sau ra mắt: 5 host mở nhiều nhất chiếm 40% lượt vào, phần lớn là người quen cũ.', 'j1', 'need', 'M'],
        [IT.ut, '', 'j1', 'need', 'S'], [IT.toi, 'Trúc: mở mục Tối nay lúc 0:30 vẫn thấy kèo 19:00 đã xong.', 'j1', 'need', 'S']]) await tab('scope'), await gate(t, why, j, sh, sz);
      g = await promote('Biến concert, workshop', IT.ev, 'j1', 'weak', 'M', '');
      ok(((await item(IT.ev)) || {}).sec === 'next', 'M1 concerts and workshops wait in Next', g);
      const pc = await pull(IT.ci, IT.hd, 'j2', 'M'); const pb = await pull(IT.bd, null, 'j1', 'M');
      const now2 = ((await out()).pv.items || []).filter(x => x.sec === 'in' && x.st !== 'done').map(x => x.t);
      ok(now2.length === 7 && now2.includes(IT.hd) && now2.includes(IT.bd), 'M1 seven lines in Now for v2', [now2, pc, pb]);
      await dod(IT.lap, ['Mỗi buổi có xác nhận và danh sách chờ riêng', 'Sửa giờ một buổi không đổi các buổi khác', 'Host dừng chuỗi thì người đã xác nhận buổi tới được báo']);
      await dod(IT.ml, ['Chỉ mời người đã đến buổi vừa rồi', 'Luôn chừa ít nhất 2 chỗ công khai', 'Người được mời có 24 giờ để nhận']);
      await dod(IT.hd, ['Host đánh dấu trong 2 giờ sau giờ gặp', 'Vị trí chỉ hiện "có vẻ đã tới"', 'Người bị đánh dấu vắng được báo và báo lại được']);
      await dod(IT.bd, ['Chỉ hiện khu vực của kèo; địa chỉ chính xác hiện sau khi tham gia', 'Không hiện vị trí của người dùng nào']);
      await tab('scope');
      await never('Kèo trả tiền để lên đầu danh sách', 'Để sau khi có tài khoản riêng cho quán; không trộn quảng cáo vào kèo của người dùng.');
      for (const t of ['Mở cụm Quận 1, Quận 3 #cum', 'Tài khoản cho CLB, có nhiều host #clb']) await park(t);
      await U.go('#pd-panel [data-pd="prv:base"]', 700);
      ok(((await out()).pv.bls || []).length === 2, 'M5 the baseline of v2');
      await tab('team');
      const M6 = [[IT.lap, 'Trần Quốc Bảo', 18], [IT.hd, 'Trần Quốc Bảo', 19], [IT.toi, 'Trần Quốc Bảo', 17], [IT.ml, 'Lê Ngọc Anh', 18], [IT.bd, 'Lê Ngọc Anh', 19], [IT.ut, 'Võ Thanh Trúc', 19], [IT.dh, 'You', 17]];
      for (const [t, who] of M6) await assign(t, who);
      for (const [t, , w] of M6) await due(t, day((w - 16) * 7));
      await tab('workspace');
      await edit('focus', IT.lap); await edit('next', 'Chuyển 2 kèo chạy của CLB Nhiêu Lộc sang kèo lặp ngay tuần đầu');
      await round(); await round();
      await done('M');
    }

    // ============================================================ N. weeks 16-20 · building v2
    if (go('N')) {
      const B = E['Bảo'], A = E['Anh'], T = E['Trúc'];
      await tab('team', B); await status(B, IT.lap, 'doing'); await status(B, IT.toi, 'doing');
      await tab('team', A); await status(A, IT.ml, 'doing');
      ok(await doneByOwner(IT.dh), 'N1 the Owner’s co-host done');
      await round(); await round();
      ok(await review(B, IT.toi), 'N2 the Tonight fix approved');
      await tab('team', B); await status(B, IT.lap, 'review'); await round(); await round();
      await inReview(IT.lap, B);
      await sendBack(IT.lap, 'Trúc thử với CLB Nhiêu Lộc: kèo chạy lặp thứ 3, thứ 5 lúc 5:30; đổi giờ buổi thứ 5 tuần sau thành 6:00 thì cả chuỗi đổi theo, 9 bạn đã xác nhận các buổi khác nhận tin đổi giờ.');
      await round(); await round();
      ok(await review(B, IT.lap), 'N3 recurring kèo sent back once, then approved');
      // N4: what hosts and cafés said; skipping one session through the Gate
      await tab('market');
      ok(await source('Góp ý của host và quán · tuần 16–18', '', 'CLB nghỉ Tết hai tuần, muốn bỏ một buổi mà không dừng chuỗi. Xí Ngầu muốn trả tiền để kèo ở quán luôn lên đầu. Một host muốn mở kèo chạy dài 10 người. Hai host mở kèo cà phê tại nhà riêng.', 'Bỏ một buổi là việc cần ngay. Kèo trả tiền và kèo đông người để dành cho tài khoản quán, CLB sau này. Kèo ở nhà riêng cần một quyết định.'), 'N4 source [15]');
      await tab('scope', T); await park('Bỏ một buổi của kèo lặp, báo người đã xác nhận #host', T);
      await round(); await round();
      const gBo = await promote('Bỏ một buổi', IT.bo, 'j2', 'need', 'S', 'CLB nghỉ Tết hai tuần, không muốn dừng cả chuỗi.');
      ok(((await item(IT.bo)) || {}).sec === 'in', 'N4 skipping a session in Now (drift)', gBo);
      await tab('team'); await assign(IT.bo, 'Trần Quốc Bảo');
      const d5 = await dupe('Quan tra tien de keo len dau', T);
      ok(/Never|Không làm|already|đã/i.test(d5) || /no gate/.test(d5), 'N5 the Gate tells Trúc paid placement is ruled out', d5.slice(0, 120));
      // N6: the map shows a host's house number; the decision on kèo at home
      await round(); await round();
      await tab('team', A); await status(A, IT.bd, 'doing'); await round();
      await status(A, IT.bd, 'review'); await round(); await round(); await inReview(IT.bd, A);
      await sendBack(IT.bd, 'Mở bản đồ bằng tài khoản chưa tham gia kèo nào: kèo cà phê tại nhà một host hiện đúng số nhà, người chưa tham gia cũng thấy.');
      ok((await st(IT.bd)) !== 'review', 'N6 the map sent back: it shows a house number', await st(IT.bd));
      await round(); await round();
      ok(await decide('Kèo ở nhà riêng', 'product', ['Chưa cho mở kèo ở nhà riêng', 'Cho mở, địa chỉ hiện sau khi host duyệt', 'Cho mở như kèo thường'], 0,
        'Nơi công cộng là nguyên tắc. Một sự cố ở nhà riêng là mất lòng tin cả app, nhất là với người dùng nữ.',
        { 1: 'Vẫn đưa người lạ vào nhà; host không biết hết ai sẽ đến.', 2: 'Trái nguyên tắc nơi công cộng.' }, [1, 7, 15], 'Có tài khoản CLB đã xác minh muốn tổ chức ở nhà'), 'N6 the decision: no kèo at home yet');
      await dod(IT.bd, ['Không mở được kèo có địa chỉ là nhà riêng'], A);
      // N7: Bảo hands over host check-in to Anh, and takes skipping a session
      await round(); await round();
      await tab('team', B); await status(B, IT.hd, 'doing'); await round();
      ok(await handover(B, IT.hd, 'Lê Ngọc Anh', 'Máy chủ ghi ai đến, ai vắng; vị trí gợi ý', 'Màn host đánh dấu và tin báo vắng', 'Nhánh host-checkin, Figma trang Sau kèo'), 'N7 Bảo hands host check-in to Anh');
      await round(); await round();
      await tab('team', B); await status(B, IT.bo, 'doing');
      await tab('team', A); await status(A, IT.hd, 'doing'); await round();
      await dod(IT.hd, ['Tin: "Host ghi bạn chưa đến kèo hôm qua. Nếu bạn đã đến, bấm để báo lại."'], A);
      await round(); await round();
      ok(await review(A, IT.hd), 'N8 host check-in approved');
      ok(await review(T, IT.ut), 'N9 Trúc’s “room for newcomers” approved');
      ok(await review(A, IT.ml), 'N9 reopen kèo approved');
      ok(await review(A, IT.bd), 'N9 the map approved');
      ok(await review(B, IT.bo), 'N9 skipping a session approved');
      await tick(IT.lap, 2); await tick(IT.ml, 3); await tick(IT.hd, 4); await tick(IT.bd, 3);
      const open2 = ((await out()).pv.items || []).filter(x => x.sec === 'in' && x.st !== 'done').map(x => x.t);
      ok(!open2.length, 'N10 everything in Now is done', open2);
      await done('N');
    }

    // ============================================================ O. week 20 · checks of v2
    if (go('O')) {
      const B = E['Bảo'], A = E['Anh'], T = E['Trúc'];
      ok(await check(IT.lap, 'Trúc đổi giờ một buổi: 3 buổi khác giữ nguyên, chỉ người của buổi đó nhận tin', true, '', B), 'O1');
      ok(await check(IT.bo, 'Trúc bỏ buổi 13/2 của kèo chạy lặp, 3 bạn đã xác nhận', false, 'Bỏ buổi 13/2, 3 bạn đã xác nhận không nhận được báo.', B), 'O2 a check that fails');
      ok(await check(IT.bo, 'Bỏ buổi 13/2: cả 3 bạn nhận báo trong 1 phút, chỗ của buổi 15/2 giữ nguyên', true, '', B), 'O3 checked again');
      ok(await check(IT.hd, 'Host đánh dấu 1 vắng; bạn đó báo lại, tỷ lệ có mặt chưa đổi cho tới khi host xem', true, '', A), 'O4');
      ok(await check(IT.bd, 'Người chưa tham gia chỉ thấy khu vực; sau khi tham gia mới thấy địa chỉ', true, '', A), 'O5');
      ok(await check(IT.ml, 'Trúc thử sau buổi chạy: mở lại cho 4 bạn đã đến; 2 chỗ còn lại có người mới vào trong 3 giờ', true, '', A), 'O6');
      await round(); await round();
      await done('O');
    }

    // ============================================================ P. week 21 · ship v2
    if (go('P')) {
      await tab('scope');
      await U.go('#pd-panel [data-pd="prv:ship"]', 600);
      const SH = '#pd-panel form[data-pd-form="prv:ship"]';
      await p.check(SH + ' input[name="met"][value="yes"]', { force: true }).catch(() => {});
      await p.fill('#prv-sm', 'Kèo lặp, đồng host, mở lại kèo với nhóm vừa đi, host đánh dấu ai đến và bản đồ khu vực đã chạy ở hai quận pilot.');
      await p.fill('#prv-sn', 'v3').catch(() => {});
      await U.go(SH + ' [type="submit"]', 900);
      ok(((await out()).pv.ships || []).length === 2, 'P1 v2 shipped', ((await out()).pv.ships || []).map(s => [s.name, s.met]));
      await tab('market');
      ok(await source('Đo sau v2 · 6 tuần ở Bình Thạnh, Phú Nhuận', '', 'Kèo hiện mỗi ngày trong cụm từ 9 lên 23. 58% kèo mới là kèo lặp hoặc mở lại. Người mới chiếm 31% lượt vào nhờ 2 chỗ chừa sẵn. 2,1 báo cáo trên 1.000 lượt gặp, không có sự cố an toàn nghiêm trọng.', 'Cụm đã tự có kèo mỗi ngày mà không cần nhóm mình mở, vượt ngưỡng 12–20 kèo của blueprint. Đủ điều kiện mở cụm thứ hai.'), 'P2 source [16]');
      await tab('scope');
      await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
      await p.fill('#prv-rs', 'Mở cụm Quận 1, Quận 3 theo cách đã làm ở Bình Thạnh; CLB và quán có tài khoản riêng, kèo của quán có nhãn rõ');
      await p.fill('#prv-rd', day(42)); await p.fill('#prv-rc2', '25');
      await U.go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
      await tab('workspace');
      await edit('focus', 'Mở cụm Quận 1, Quận 3 với 10 host đầu tiên, dùng lại cách seed kèo ở Bình Thạnh');
      await edit('next', 'Trúc liên hệ 3 CLB chạy bộ, cầu lông ở Quận 1, Quận 3');
      ok(/Quận 1, Quận 3/.test(((await out()).pv.rel || {}).ship || ''), 'P3 P4 v3 planned; focus and next step');
      await done('P');
    }

    // ============================================================ R. weeks 22-24 · after v2: where people come from, and growth checks (CONTRACT 116)
    if (go('R')) {
      await tab('market');
      for (const [n, w] of [
        ['CLB chạy bộ Nhiêu Lộc', 'Chạy chung sáng chủ nhật; kèo chạy đầu tiên ở Bình Thạnh đến từ đây'],
        ['Nhóm Zalo concierge Bình Thạnh', 'Người đi kèo đầu tiên; Trúc trả lời từng người'],
        ['Nhóm Facebook khu vực Phú Nhuận', 'Nơi người ta rủ cà phê, boardgame cuối tuần'],
        ['Quán boardgame Xí Ngầu', 'Quán đầu tiên hỏi có tài khoản riêng cho kèo của quán không']]) {
        await U.go('#pd-panel [data-pd="prv:chadd"]', 400);
        await p.fill('#prv-chn', n); await p.fill('#prv-chw', w);
        await U.go('#pd-panel form[data-pd-form="prv:chan"] [type="submit"]', 500);
      }
      ok(((await out()).pv.channels || []).length === 4, 'R1 four channels', ((await out()).pv.channels || []).map(c => c.n));
      const gStart = async (q, m, ch, okN, kill) => {
        await U.go('#pd-panel [data-pd="pf:grow"]', 600);
        const GF = '#pd-panel form[data-pd-form="pf:new"][data-k="grow"]';
        await p.fill('#pq-q', q);
        await p.check(GF + ' input[name="pfm"][value="' + m + '"]', { force: true }); await sleep(250);
        await p.fill('#pq-ch', ch); await p.fill('#pq-ok', String(okN)); await p.fill('#pq-kill', String(kill));
        await U.go(GF + ' [type="submit"]', 800);
        return ((await out()).pv.tests || []).filter(t => t.kind === 'grow' && t.st === 'run').pop();
      };
      const gLog = async (nn, note) => {
        await U.go('#pd-panel [data-pd="pf:log"]', 500);
        await p.fill('#pq-ln', String(nn)); await p.fill('#pq-ln2', note);
        await U.go('#pd-panel form[data-pd-form="pf:log"] [type="submit"]', 600);
      };
      const g1 = await gStart('Mỗi sáng chủ nhật một kèo chạy 5 km với CLB Nhiêu Lộc giữ được ít nhất 12 người quay lại trong 4 tuần', 'back', 'CLB chạy bộ Nhiêu Lộc', 12, 4);
      ok(g1 && g1.m === 'back', 'R2 a growth check: who came back from the running club', g1 && [g1.kind, g1.m, g1.ok, g1.kill]);
      for (const [nn, note] of [[5, 'Tuần 1–2: 5 người đi lại kèo thứ hai'], [4, 'Tuần 3: thêm 4 người, 2 người rủ thêm bạn'], [5, 'Tuần 4: thêm 5 người, 3 người tự mở kèo chạy riêng']]) await gLog(nn, note);
      await U.go('#pd-panel [data-pd="pf:dec"]', 500);
      await p.check('#pd-panel form[data-pd-form="pf:dec"] input[name="o"][value="keep"]', { force: true });
      await p.fill('#pq-why', '14 người quay lại trong 4 tuần, trên mức 12. Kèo chạy của CLB giữ người tốt nhất; làm tiếp mỗi chủ nhật và mở thêm ở Quận 3.');
      await U.go('#pd-panel form[data-pd-form="pf:dec"] [type="submit"]', 800);
      const g1d = ((await out()).pv.tests || []).find(t => t.id === g1.id);
      ok(g1d && g1d.dec === 'keep' && !(await out()).pv.stop, 'R3 decided: keep doing it; the product goes on', g1d && g1d.dec);
      const g2 = await gStart('Mỗi tuần 2 bài trong nhóm Facebook Phú Nhuận mang về ít nhất 40 người đăng ký trong 30 ngày', 'signup', 'Nhóm Facebook khu vực Phú Nhuận', 40, 15);
      /* the results come in over days of the story: time between the pins runs as the typing does, so the script waits between them */
      for (const [nn, note] of [[9, 'Bài kèo boardgame tối thứ sáu'], [7, 'Bài kèo cà phê sáng chủ nhật']]) { await sleep(45000); await gLog(nn, note); }
      await sleep(30000);
      const g2r = ((await out()).pv.tests || []).find(t => t.id === (g2 && g2.id));
      ok(g2r && g2r.st === 'run' && g2r.log.length === 2, 'R4 a second growth check, still running: 16 of 40 sign-ups', g2r && [g2r.st, g2r.log.length]);
      await round(); await round();
      await done('R');
    }

    // ============================================================ Q. the last day: quick notes, Today, the export
    if (go('Q')) {
      await U.go('.nav-i[data-view="dashboard"]', 600);
      await U.btn('#view-dashboard', 'View all', 600).catch(() => {});
      for (const t of ['Gửi Trúc bảng giá Host Pro bản nháp để hỏi 4 host #hostpro', 'Hỏi Xí Ngầu có muốn thử tài khoản quán ở v3 không #venue', 'Kiểm tra nhãn hiệu "Venli" trước khi lên App Store #ten']) {
        await p.fill('#note-input', t).catch(() => {});
        if (await p.$('#note-proj')) await p.selectOption('#note-proj', { label: NAME }).catch(() => {});
        await U.go('#note-save', 400).catch(() => {});
      }
      if (await U.drawer()) await U.go('.drawer.dr-live [data-close]', 400);
      await round(); await round();
      await U.go('.nav-i[data-view="settings"]', 500);
      await U.btn('#view-settings', 'Storage', 600).catch(() => {});
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#view-settings button', { hasText: /^Export$/ }).click()]);
      const x = fs.readFileSync(await dl.path(), 'utf8');
      fs.writeFileSync(OUT, x);
      const bk = JSON.parse(x), pj = bk.ent.find(e => e.k === 'project:' + PID);
      ok(!!pj && (pj.d.team || []).length === 3 && (pj.d.pv.ships || []).length === 2, 'Q the workspace exported to ' + OUT, pj && [(pj.d.team || []).length, (pj.d.pv.ships || []).length]);
      await done('Q');
    }
  } catch (e) {
    if (!(e instanceof Stop)) { console.error('ERR', String(e && e.stack || e).split('\n').slice(0, 5).join('\n')); fails++; if (p) await p.screenshot({ path: path.join(os.tmpdir(), 'sample-venli-err.png') }).catch(() => {}); }
  } finally {
    setTimeout(() => process.exit(fails ? 1 : 0), 30000);   /* an Editor's Chrome left open must not keep the run alive */
    ok(!errs.length, 'no page errors', errs.slice(0, 8));
    console.log('\n' + (steps - fails) + '/' + steps + ' ok');
    try { if (p) await p.context().close(); } catch (e) {}
    S.stop(); process.exit(fails ? 1 : 0);
  }
})();
