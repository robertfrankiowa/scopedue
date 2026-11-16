// The Vietnamese client sample with a team (SAMPLE-SCRIPT-DOI-XE-GIAO-HANG-VI.md): Quản lý đội xe & giao hàng – Sao Bắc Logistics,
// typed into the web app by a script. The Owner (Studio Bắc Nam) and three Editors (Bảo, Nam, Mai Anh) on the web app, Đỗ Lan
// Phương on the client portal, against api.php on a fresh local database (php-server.js) and the stand-in Google Drive
// (standin-drive.js). Nothing reaches scopedue.com or Google; every address is a .test one. At the end the Owner's workspace is
// exported to SD_OUT (default: sample-saobac-copy.json in the OS temp folder); tools/sample_from_copy.py makes the sample of it.
//
//   node tests/sample-saobac-vi.js         SD_UNTIL=<section letter> stops after that section (while working on the script)
//   SD_FROM=<section letter>               starts at that section, from the checkpoint the previous one saved (tests/.live/sbn-ck/)
//   SD_PLAYWRIGHT, SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_SCHEMA_DB as php-server.js; pictures from tests/sample-pics-saobac/
//
// Dates: the server keeps real time, and a missed date can only be flagged once it has passed. So the Scope's dates are set around
// today (T): M1 T-7, M2 T-6, M3 T-5, M4 T-3 (late when the client flags it in J, after CR-003's two days), M5 T+3; what the client
// provides before them.
// tools/sample_from_copy.py spreads the whole story over its 16 weeks afterwards.
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const F = 'subdomains/app/index.html';
const UNTIL = process.env.SD_UNTIL || '', FROM = process.env.SD_FROM || '';
const OUT = process.env.SD_OUT || path.join(os.tmpdir(), 'sample-saobac-copy.json');
const PICS = path.join(__dirname, 'sample-pics-saobac');
const OWNER = 'owner@studiobacnam.test', BAO = 'bao@studiobacnam.test', NAM = 'nam@studiobacnam.test', MAI = 'maianh@studiobacnam.test';
const PHUONG = 'phuong@saobaclogistics.test';
const TOK = { [OWNER]: 'ya29.sbn-owner', [BAO]: 'ya29.sbn-bao', [NAM]: 'ya29.sbn-nam', [MAI]: 'ya29.sbn-mai' };
const NAME = 'Quản lý đội xe & giao hàng – Sao Bắc Logistics';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, steps = 0;
const ok = (c, m, x) => { steps++; console.log((c ? 'ok   ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600))); if (!c) fails++; return c; };
class Stop extends Error {}
const LETTERS = 'BCDEFGHIJKLMNOP';
const go = s => !FROM || LETTERS.indexOf(s) >= LETTERS.indexOf(FROM);   /* SD_FROM=<letter>: start there, from the checkpoint before it */
const CK = path.join(__dirname, '.live', 'sbn-ck'), PROF = path.join(__dirname, '.live', 'sbn-prof');   /* a checkpoint per section passed: database, mail, the stand-in Drive, each browser */
const day = d => { const x = new Date(Date.now() + d * 864e5); return x.toISOString().slice(0, 10); };
const pic = f => path.join(PICS, f);

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8133, db: 'sd_sample_saobac', files: ['api.php', F, 'subdomains/app', 'portal.html', 'portal-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const acc = {}; Object.keys(TOK).forEach(e => { acc[TOK[e]] = e; });
  const DRIVE = require('./standin-drive')(acc);
  const b = await PW.chromium.launch({ headless: process.env.SD_HEADED !== '1' });
  const errs = [];
  let p, C, CU, lastCode = 0;
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
      keys[OWNER] = await S.account('Studio Bắc Nam', OWNER);
      for (const [n, e] of [['Trần Quốc Bảo', BAO], ['Phạm Hoàng Nam', NAM], ['Lê Thị Mai Anh', MAI]]) keys[e] = await S.account(n, e);
      /* a month-old account: the first day's email cap (mail_to) would cut off the client's codes and notices */
      S.my([S.db, '-e', 'UPDATE api_studios SET created_at = created_at - 2592000000']);
    }

    /* ------------------------------------------------------------ a person on the web app: the Owner or an Editor */
    /* each person's own Chrome profile on disk: the project's keys are non-extractable CryptoKeys in IndexedDB, which only a
       profile folder keeps (a storage-state copy loses them, and that device can no longer write to Drive) */
    const device = async (who, name) => {
      const ctx = await PW.chromium.launchPersistentContext(path.join(PROF, who.split('@')[0]), { executablePath: process.env.SD_CHROMIUM || undefined, headless: process.env.SD_HEADED !== '1', viewport: { width: 1440, height: 950 }, acceptDownloads: true });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await ctx.route(/^https:\/\/(www\.googleapis\.com|oauth2\.googleapis\.com)\//, DRIVE.route);
      await ctx.addInitScript(([api, k, em]) => { try { if (!sessionStorage.getItem('sbn')) { sessionStorage.setItem('sbn', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'client'); localStorage.setItem('sd-cur-last', 'VND'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: em, via: 'email' })); } } catch (e) {} }, [S.api, keys[who], who]);
      const pg = ctx.pages()[0] || await ctx.newPage(); pg.on('pageerror', e => { errs.push(name + ': ' + e.message); console.log('PAGEERR ' + name + ': ' + e.message + ' @ ' + String(e.stack || '').split(/\r?\n/).slice(1, 5).map(x => x.trim()).join(' < ')); });
      pg.on('dialog', d => d.accept());
      await pg.goto(S.base + F + '?test'); await sleep(1500);
      const tok = () => pg.evaluate(([t, e]) => { const f = () => window.__drv ? window.__drv.token(t, e) : setTimeout(f, 100); f(); }, [TOK[who], who]).catch(() => {});
      await tok(); pg.on('load', tok);
      await pg.click('.nav-i[data-view="settings"]'); await sleep(300);
      await pg.click('#st-t-drive').catch(() => {}); await sleep(300);
      await pg.click('#dr-body [data-dr="connect"]').catch(() => {}); await sleep(600);
      pg._who = who; pg._tok = tok;
      return pg;
    };
    /* what a person does on a page; the page may be given as a function, for the Owner's page that a checkpoint opens again */
    const P = pg0 => { const pg = () => typeof pg0 === 'function' ? pg0() : pg0; return {
      go: async (sel, ms) => { await pg().click(sel); await sleep(ms == null ? 350 : ms); },
      text: sel => pg().$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => ''),
      drawer: () => pg().$eval('.drawer.dr-live', e => e.id).catch(() => ''),
      dump: async (sel, why) => console.log('---- ' + (why || sel) + '\n' + await pg().$eval(sel, e => e.outerHTML.replace(/\s+/g, ' ').slice(0, 5000)).catch(() => 'no ' + sel)),
      btn: async (within, label, ms) => { await pg().locator(within + ' :is(button,a,[role="tab"])', { hasText: label }).filter({ visible: true }).first().click(); await sleep(ms == null ? 350 : ms); }
    }; };
    fs.rmSync(PROF, { recursive: true, force: true });
    if (ck) fs.cpSync(path.join(ckDir, 'prof'), PROF, { recursive: true });
    p = await device(OWNER, 'owner');
    const U = P(() => p);
    let PID = ck ? ck.PID : ''; p._pid = PID;
    const tab = async (t, pg) => {
      pg = pg || p; const id = pg._pid || PID;
      await pg.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [id, t]); await pg.reload(); await sleep(1600);
      if (!(await pg.$('#pd-tab-' + t))) console.log('no tab ' + t + ' · tabs ' + JSON.stringify(await pg.$$eval('[id^="pd-tab-"]', l => l.map(n => n.id))));
    };
    const panel = () => U.text('#pd-panel');
    const raw = () => p.evaluate(id => window.__sy && window.__sy.raw ? window.__sy.raw(id) : null, PID);
    const edit = async (f, v, pg) => {
      pg = pg || p;
      await pg.click('#pd-panel [data-pd="edit"][data-f="' + f + '"]'); await sleep(400);
      await pg.fill('#pd-ed', v); await pg.click('#pd-panel form[data-pd-form="edit"] [type="submit"]'); await sleep(500);
    };
    const addLink = async (t, u, pg) => {
      pg = pg || p;
      await pg.click('#pd-panel [data-pd="addlink"]'); await sleep(400);
      await pg.fill('#pd-panel form[data-pd-form="addlink"] [name="t"]', t); await pg.fill('#pd-panel form[data-pd-form="addlink"] [name="u"]', u);
      await pg.click('#pd-panel form[data-pd-form="addlink"] [type="submit"]'); await sleep(450);
    };


    // ============================================================ what the story is made of
    const MS = [['Khảo sát và thiết kế được duyệt', -7, 15], ['Web điều hành: danh mục, import, lập chuyến', -6, 20], ['App tài xế Android: POD, offline', -5, 15],
      ['COD, chi phí, báo cáo', -3, 15], ['Pilot 15 xe và nghiệm thu go/no-go', 3, 15]];
    const MN = MS.map(x => x[0]);
    const DLV = [
      ['BRD v1.0: chốt đơn, lập chuyến, giao, COD, đóng chuyến', 'Chị Phương xác nhận đúng một vòng nghiệp vụ đã quan sát tại kho Long Biên', 0, 'Mai Anh'],
      ['Từ điển dữ liệu và mẫu import Excel v1.0 (15 cột)', 'Điều phối và kế toán dùng thử mẫu với 2 file thật, không thiếu cột', 0, 'Mai Anh'],
      ['ERD, hợp đồng API, phân quyền 9 vai trò', 'Mỗi vai trò có bảng xem, tạo, duyệt; tài xế chỉ thấy chuyến của mình', 0, 'Bảo'],
      ['Prototype Figma: web điều hành và app tài xế', 'Khách duyệt 14 màn web và 10 màn app tài xế', 0, 'You'],
      ['Spike GPS: thử API nhà cung cấp, kết luận sơ bộ cổng G-GPS', 'Có biên bản: có API hay không, độ trễ đo trên 1 xe thử', 0, 'You'],
      ['Danh mục xe nhà, xe thuê, tài xế, kho, khách hàng, nhà xe', 'Xe thuê gắn nhà xe; biển số không trùng trong kỳ hiệu lực', 1, 'Bảo'],
      ['Import Excel: map cột, xem trước, lỗi theo dòng, chống trùng', 'Nhập lại cùng file không tạo đơn trùng; chưa xác nhận thì chưa tạo đơn', 1, 'Bảo'],
      ['Lập chuyến: gán xe, tài xế, điểm dừng; kiểm tải, trùng lịch', 'Vượt tải hoặc trùng giờ thì không phát hành được và nêu chuyến xung đột', 1, 'Bảo'],
      ['Cảnh báo giờ cấm, khu vực hạn chế Hà Nội theo loại xe', 'Cảnh báo theo bảng khung giờ cấu hình, có ghi phiên bản quy tắc', 1, 'Bảo'],
      ['Bảng điều hành: chuyến, xe, đơn trễ, sự cố', 'Đơn trễ và chuyến có sự cố hiện trong 1 phút sau khi app gửi', 1, 'Nam'],
      ['Nhật ký thao tác: phân chuyến, trạng thái, COD', 'Xem được ai, lúc nào, trước và sau, lý do', 1, 'Bảo'],
      ['App tài xế: Hôm nay, chuyến, điểm dừng, nhận chuyến', 'Chạy trên 3 máy Android pilot của Sao Bắc, kể cả máy RAM 3 GB', 2, 'Nam'],
      ['Giao xong, giao thất bại, giao một phần, ảnh POD', 'Mỗi lần giao là một bản ghi riêng; ảnh POD đã gửi không sửa được', 2, 'Nam'],
      ['Hàng đợi offline và đồng bộ không trùng', 'Gửi lại cùng sự kiện không tạo COD hay lần giao thứ hai', 2, 'Bảo'],
      ['Báo sự cố, đổi xe giữa chuyến', 'Lịch sử xe A và xe B đều còn, không mất điểm dừng nào', 2, 'Nam'],
      ['Sổ COD: phải thu, thực thu, nộp theo lô, chênh lệch', 'Nộp thiếu tạo case chênh lệch, không tự cân số', 3, 'Bảo'],
      ['Điều chỉnh COD có người duyệt khác người tạo', 'Người không có quyền duyệt bị từ chối và có ghi nhật ký', 3, 'Bảo'],
      ['Chi phí chuyến: loại, chứng từ, duyệt theo hạn mức', 'Chi phí xe thuê tách riêng, không tính vào tài sản công ty', 3, 'Nam'],
      ['Báo cáo đơn, chuyến, xe, tài xế, COD; xuất Excel', 'Tổng trên báo cáo khớp bộ dữ liệu kiểm thử', 3, 'Nam'],
      ['Bộ kịch bản UAT 26 tình huống T-001 đến T-026', 'Mỗi tình huống có kết quả Đạt hoặc Không đạt và người ký', 3, 'Mai Anh'],
      ['Triển khai, sao lưu và thử khôi phục', 'Khôi phục từ bản sao lưu chạy được, dữ liệu đối chiếu khớp', 4, 'Bảo'],
      ['Đào tạo điều phối, kế toán và 15 tài xế pilot', 'Mỗi nhóm tự làm trọn một ngày vận hành không cần studio', 4, 'Mai Anh'],
      ['Pilot 15 xe (9 xe nhà, 6 xe thuê) trong 10 ngày', 'Không COD trùng, không chuyến mất dữ liệu; có báo cáo go/no-go', 4, 'You']];
    const CI = [['Dữ liệu Excel 14 ngày gần nhất: đơn, chuyến, COD (đã ẩn danh)', 1], ['Danh sách 54 xe: loại, tải trọng, khối lượng toàn bộ, nhà hay thuê, GPS', 1],
      ['Một ngày quan sát tại kho Long Biên cùng điều phối và kế toán', 1], ['Bảng khung giờ cấm và giấy phép vào phố của từng xe', 1],
      ['Tài liệu API GPS và quyền truy cập 3 thiết bị thử', -3], ['Danh sách 15 xe, 15 tài xế pilot và máy Android của họ', 2]];
    const ED = [['Trần Quốc Bảo', BAO, 'Bảo'], ['Phạm Hoàng Nam', NAM, 'Nam'], ['Lê Thị Mai Anh', MAI, 'Mai Anh']];
    const M1S = ['Đọc BRD mục 3: đúng một vòng từ chốt đơn đến đóng chuyến như ở kho Long Biên', 'Mở mẫu import: đủ 15 cột, thử dán 20 dòng từ file thật của chị Trang',
      'Figma web: kéo 12 đơn vào một chuyến, thấy tổng tải và cảnh báo vượt tải', 'Figma app: màn Hôm nay và Giao thất bại đọc được khi cầm máy một tay',
      'Đọc biên bản spike GPS: rõ cái gì đã thử, cái gì còn chờ nhà cung cấp'];
    const M2S = ['Nhập file 500 đơn mẫu: tạo đúng 500 đơn, tổng số kiện và COD khớp file', 'Nhập lại cùng file: không tạo thêm đơn, báo 500 dòng trùng',
      'File có 10 dòng thiếu địa chỉ: tải file lỗi, đúng dòng và cột', 'Tạo hai chuyến trùng giờ cho xe 29C-418.xx: chuyến thứ hai không phát hành được',
      'Gán 3,1 tấn hàng cho xe tải 2,5 tấn: bị chặn, nêu số vượt'];
    const M3S = ['Đăng nhập tài xế Lực: chỉ thấy chuyến của mình', 'Giao xong có ảnh POD: đơn, điểm dừng và lần giao khớp nhau',
      'Giao thất bại hai lần cùng một đơn: thấy hai lần giao riêng, có lý do', 'Tắt mạng 30 phút, giao 10 điểm: có mạng lại thấy đúng 10 sự kiện', 'Bấm Gửi lại một sự kiện 5 lần: chỉ một khoản COD'];
    const M4S = ['Tài xế ghi COD 450.000: khoản này không cộng vào cước', 'Nộp lô thiếu 50.000: có case chênh lệch 50.000, không tự xoá',
      'Kế toán viên không có quyền duyệt điều chỉnh COD: bị từ chối', 'Xuất báo cáo COD tháng 10: tổng khớp file kiểm của chị Trang', 'Bảng điều hành: số đơn trễ khớp danh sách đơn trễ'];
    const M5S = ['Tra 412 chuyến pilot: chuyến nào cũng có xe, tài xế, trạng thái', 'Đối soát 10 ngày COD: không có khoản trùng, 3 chênh lệch đều có case',
      'Khôi phục bản sao lưu đêm qua lên máy thử: chạy được, số đơn khớp', 'Thu quyền tài xế giữa ca: yêu cầu mới của tài xế đó bị từ chối', 'Chị Trang đối soát một ngày không cần file Excel phụ'];
    const HO = [['https://gitlab.example.com/foms-saobac', 'Đã thêm chị Phương và anh Quang làm Owner của repository.'], ['https://builds.example.com/driver-1.0.0.apk', 'APK 1.0.0 đã ký, kèm hướng dẫn cài 1 trang.'],
      ['https://docs.example.com/van-hanh-saobac', 'Tài khoản quản trị gửi riêng cho anh Quang; tài liệu vận hành 18 trang.'], ['https://docs.example.com/backup-saobac', 'Bản sao lưu đêm qua và các bước khôi phục đã thử.'],
      ['https://docs.example.com/api-saobac', 'Tài liệu API và hướng dẫn nối nền tảng GPS hiện có.']];

    // ============================================================ helpers
    const addItem = async (sec, t, o) => {
      await p.click('#pd-panel [data-pd="itadd"][data-sec="' + sec + '"]'); await sleep(350);
      const f = '#pd-panel form[data-pd-form="additem"][data-sec="' + sec + '"]';
      if (!(await p.$(f))) { await U.dump('#pd-panel [data-sec="' + sec + '"]', 'no add form for ' + sec); return 'no form'; }
      await p.fill(f + ' [name="t"]', t);
      for (const k of Object.keys(o || {})) {
        if (k === 'm') await p.selectOption(f + ' [name="m"]', { label: o.m }).catch(async e => { await U.dump(f, 'milestone pick'); });
        else await p.fill(f + ' [name="' + k + '"]', String(o[k])).catch(async e => { await U.dump(f, 'field ' + k); });
      }
      const n0 = ((await raw()).sc.items || []).length;
      await p.click(f + ' [type="submit"]'); await sleep(450);
      const n1 = ((await raw()).sc.items || []).length;
      if (await p.$(f)) await p.click(f + ' [data-pd="itcancel"]').catch(() => {});
      return n1 === n0 + 1 ? '' : 'not added: ' + await U.text(f + ' .err');
    };
    const lastMail = (to, re) => S.mails().reverse().find(x => x.to === to && (!re || re.test(x.subject + ' ' + x.body)));
    /* a dialog in the portal: words, a title, pictures, then send */
    const cdlg = async (o) => {
      await sleep(500);
      if (o.ti) await C.fill('#f-ti', o.ti);
      if (o.amt != null) await C.fill('#f-amt', String(o.amt));
      if (o.days != null) await C.fill('#f-days', String(o.days));
      if (o.pos) await C.check('input[name="f-pos"][value="' + o.pos + '"]', { force: true });
      if (o.ref) await C.selectOption('#f-ref', { label: o.ref }).catch(async () => console.log('no ref ' + o.ref));
      if (o.k) await C.check('input[name="f-k"][value="' + o.k + '"]', { force: true });
      if (o.m) await C.selectOption('#f-m', { label: o.m }).catch(() => {});
      if (o.tx) await C.fill('#f-tx', o.tx);
      if (o.pics) { await C.setInputFiles('#f-pics', [].concat(o.pics).map(pic)); await sleep(1500); }
      await C.click('#dform [type="submit"]'); await sleep(2500);
      const left = await C.$eval('#dDlg', d => d.open).catch(() => false);
      if (left) { console.log('dialog still open: ' + await CU.text('#dDlg')); await C.click('#dDlg [data-a="dclose"]').catch(() => {}); }
      return !left;
    };
    const creload = async () => { await C.reload(); await sleep(3000); };
    const code = async (re, after) => { for (let i = 0; i < 40; i++) { const m = S.mails().reverse().find(x => x.to === PHUONG && x.ts > after && /\b\d{6}\b/.test(x.body) && re.test(x.subject + x.body)); if (m) return m.body.match(/\b\d{6}\b/)[0]; await sleep(250); } return null; };
    /* the main button (approve, accept), confirmed with the code emailed to her: one code every 30 seconds, six an hour */
    const withCode = async (sel) => {
      const w = lastCode + 32000 - Date.now(); if (w > 0) await sleep(w);
      /* six codes an hour per client (code_hour): the story's eleven codes span weeks, typed here in half an hour */
      S.my([S.db, '-e', "DELETE FROM api_rate WHERE k LIKE 'code:hour:%'"]);
      const t = Date.now() - 1; lastCode = Date.now();
      await C.click(sel || '#approveBtn'); await sleep(1800);
      const c = await code(/./, t); if (!c) { console.log('   no code'); return false; }
      await C.type('#otpIn', c, { delay: 40 }); await sleep(400);
      if (await C.$eval('#confirmBtn', x => !x.disabled).catch(() => false)) { await C.click('#confirmBtn'); }
      await sleep(3500);
      return true;
    };
    /* the Owner answers both */
    const pull = async (pg) => { pg = pg || p; await pg.reload(); await sleep(3500); };
    const crOpen = async (id) => {
      await tab('change');
      for (let i = 0; i < 12 && !(await p.locator('#pd-panel [data-pd="crsel"]', { hasText: id }).count()); i++) { await sleep(1000); if (i === 5) await tab('change'); }
      const l = p.locator('#pd-panel [data-pd="crsel"]', { hasText: id }).first();
      if (!(await l.count())) { const cl = p.locator('#pd-panel :is(button,a)', { hasText: /^Closed/ }).first(); if (await cl.count()) { await cl.click(); await sleep(400); } }
      await p.locator('#pd-panel [data-pd="crsel"]', { hasText: id }).first().click(); await sleep(600);
    };
    const Q = '#pd-panel form[data-pd-form="send"]';
    const reply = async (id, ty, o) => {
      await crOpen(id);
      if (ty) await p.click(Q + ' [data-f="' + ty + '"]').catch(async () => { await U.dump(Q, 'no reply type ' + ty); }); await sleep(300);
      o = o || {};
      if (o.inc) await p.check(Q + ' [name="inc"]', { force: true }).catch(async () => U.dump(Q, 'included'));
      if (o.hrs != null) { await p.fill(Q + ' [name="hrs"]', String(o.hrs)); await sleep(200); }
      if (o.amt != null) await p.fill(Q + ' [name="amt"]', String(o.amt));
      if (o.days != null) await p.fill(Q + ' [name="days"]', String(o.days));
      if (o.mv) await p.selectOption(Q + ' [name="mv"]', { label: o.mv }).catch(async () => { const opts = await p.$$eval(Q + ' [name="mv"] option', l => l.map(x => x.textContent)); console.log('mv options', opts); });
      if (o.vf) await p.selectOption(Q + ' [name="vf"]', String(o.vf)).catch(() => {});
      if (o.pos) await p.selectOption(Q + ' [name="pos"]', o.pos).catch(() => {});
      if (o.ref) await p.selectOption(Q + ' [name="ref"]', { label: o.ref }).catch(async () => console.log('ref options', await p.$$eval(Q + ' [name="ref"] option', l => l.map(x => x.textContent))));
      await p.fill(Q + ' [name="tx"]', o.tx || '');
      await p.click(Q + ' [type="submit"]'); await sleep(2500);
      const er = await U.text(Q + ' .err'); if (er) console.log('reply ' + id + ' ' + ty + ': ' + er);
      return !er;
    };
    /* the deposit: she says she paid; the studio has not seen it yet; she says again */
    const paidBtn = async (m) => { const s = '[data-a="paid"]' + (m ? '[data-m="' + m + '"]' : ''); await C.locator(s).filter({ visible: true }).first().click(); };
    const sent = async (t, tx, pics) => {
      const row = C.locator('[data-a="sent"]').filter({ visible: true });
      const ids = await C.$$eval('[data-a="sent"]', l => l.map(b => [b.dataset.m, (b.closest('li,tr,.row,div') || b).innerText.slice(0, 120)]));
      const hit = ids.find(x => x[1].indexOf(t.slice(0, 25)) > -1);
      if (!hit) { console.log('no Sent for ' + t + ' · ' + JSON.stringify(ids)); return false; }
      await C.click('[data-a="sent"][data-m="' + hit[0] + '"]'); return cdlg({ tx, pics });
    };
    /* the studio marks each one received (the list redraws after each) */
    const gotSent = async () => {
      const sentIds = ((await raw()).mev || []).filter(e => e.ty === 'sent').map(e => e.m), gotIds = ((await raw()).mev || []).filter(e => e.ty === 'got').map(e => e.m);
      for (const m of sentIds.filter(m => gotIds.indexOf(m) < 0)) { await p.click('#pd-panel [data-pd="dl:got"][data-m="' + m + '"]').catch(async () => console.log('no got for ' + m)); await sleep(1200); }
    };
    const capture = async (title, kind, txt, link) => {
      await tab('evidence');
      await p.locator('#pd-panel [data-pd="evcap"]').filter({ visible: true }).first().click(); await sleep(600);
      await U.go('#cap-mode [data-f="text"]', 300);
      await p.fill('#cap-txt', txt); await p.fill('#cap-t', title);
      await p.selectOption('#cap-kind', kind).catch(async () => console.log('kinds', await p.$$eval('#cap-kind option', l => l.map(x => x.value))));
      if (link) await p.selectOption('#cap-link', link).catch(async () => console.log('links', await p.$$eval('#cap-link option', l => l.map(x => x.value))));
      await U.go('#drawer-cap [type="submit"]', 1500);
      return new RegExp(title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(await panel());
    };
    const member = async (n, e) => {
      await U.go('.nav-i[data-view="settings"]', 500);
      await U.btn('#view-settings', 'Team', 500).catch(() => {});
      await U.go('#tm-add', 600);
      await p.fill('#tm-name', n); await p.fill('#tm-email', e);
      await p.selectOption('#tm-role', 'Editor').catch(() => {});
      await U.go('#tm-go', 700);
    };
    const invite = async (e) => {
      const team = ((await raw()) || {}).team || [];
      if (team.length) { await tab('team'); await U.go('#pd-panel [data-pd="invite"]', 800); }
      else { await tab('workspace'); await U.go('#pd-more', 400); await U.go('[role="menu"] [data-m="invite"]', 800); }
      if (await p.isVisible('#inv-gate button').catch(() => false)) await U.go('#inv-gate button', 2000);
      if (!(await p.$('#inv-list input[value="' + e + '"]'))) { await U.dump('#drawer-invite', 'invite drawer'); if (await U.drawer()) await U.go('.drawer.dr-live [data-close]', 400); return false; }
      await p.check('#inv-list input[value="' + e + '"]', { force: true });
      await p.locator('#inv-list li', { has: p.locator('input[value="' + e + '"]') }).locator('select').selectOption('Editor').catch(() => {});
      await U.go('#inv-go', 2500);
      return (((await raw()) || {}).team || []).some(m => m.e === e && m.role === 'Editor');
    };
    /* rounds of Google Drive sync on each device, as the app does every minute */
    const DEV = { [OWNER]: p };
    const run = async pg => { await pg._tok(); const e = await pg.evaluate(() => window.__drv.sync.run().then(() => '', e => 'ERR ' + (e && e.stack || e))).catch(e => 'EVAL ' + e.message); if (e) console.log('sync on ' + pg._who + ': ' + e.slice(0, 500)); await sleep(200); };
    const round = async () => { await sleep(2500); for (const k of Object.keys(DEV)) await run(DEV[k]); await run(p); };
    const E = {};
    const itemId = async (t, pg) => { const r = pg ? await pg.evaluate(id => window.__sy && window.__sy.raw ? window.__sy.raw(id) : null, pg._pid) : await raw(); const x = ((r || {}).sc || { items: [] }).items.find(y => y.t === t); return x && x.id; };
    const wkRow = async (pg, id) => pg.$eval('#pd-panel li.wk-r[data-it="' + id + '"]', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
    /* the Owner gives a line to someone, on the Team tab */
    const assign = async (t, who) => {
      const id = await itemId(t); const s = '#pd-panel select[data-wk="as"][data-id="' + id + '"]';
      const opts = await p.$$eval(s + ' option', l => l.map(o => [o.value, o.textContent])).catch(() => []);
      const o = opts.find(x => x[1].indexOf(who) > -1 || (who === 'You' && /^You/.test(x[1])));
      if (!o) { console.log('assign ' + t + ' to ' + who + ': options ' + JSON.stringify(opts)); return false; }
      await p.selectOption(s, o[0]); await sleep(500); return true;
    };
    /* a status on someone's device; In review may ask for a handover note */
    const status = async (pg, t, st, note) => {
      const id = await itemId(t, pg === p ? null : pg); const s = '#pd-panel select[data-wk="st"][data-id="' + id + '"]';
      if (!(await pg.$(s))) { console.log('no status for ' + t + ' on ' + pg._who); return false; }
      await pg.selectOption(s, st).catch(async e => console.log('status ' + st + ' on ' + t + ': ' + (await pg.$$eval(s + ' option', l => l.map(o => o.value)))));
      await sleep(600);
      const f = await pg.$('#pd-panel form[data-pd-form="wk:ho"], #pd-panel form[data-pd-form="x7:ho"], #pd-panel li.prv-fw form');
      if (f) { const ta = await f.$('textarea, input[name="r"], input[name="n"], input:not([type="hidden"])'); if (ta) await ta.fill(note || 'Xong phần của em, anh xem giúp.'); await (await f.$('[type="submit"]')).click(); await sleep(600); }
      return true;
    };
    const approveWk = async t => { const id = await itemId(t); await p.click('#pd-panel [data-pd="wk:approve"][data-id="' + id + '"]').catch(async () => console.log('no approve on ' + t + ': ' + await wkRow(p, id))); await sleep(600); };
    const inReview = async (t, pg) => { for (let k = 0; k < 3 && (await st(t)) !== 'review'; k++) { await round(); if ((await st(t)) === 'review') break; await tab('team', pg); await status(pg, t, 'review', 'Xong, anh xem giúp em.'); await round(); await round(); } await tab('team'); return (await st(t)) === 'review'; };
    const sendBack = async (t, why) => {
      const id = await itemId(t); await p.click('#pd-panel [data-pd="wk:back"][data-id="' + id + '"]').catch(async () => console.log('no send back on ' + t)); await sleep(500);
      const f = await p.$('#pd-panel li.prv-fw form'); if (!f) { await U.dump('#pd-panel li.wk-r[data-it="' + id + '"]', 'send back form'); return; }
      const ta = await f.$('textarea, input[name="r"], input:not([type="hidden"])'); await ta.fill(why); await (await f.$('[type="submit"]')).click(); await sleep(600);
    };
    const T_ = DLV.map(x => x[0]);
    const st = async (t, pg) => { const r = pg ? await pg.evaluate(id => window.__sy.raw(id), pg._pid) : await raw(); const id = ((r.sc || {}).items || []).find(x => x.t === t); return id && ((r.work || {})[id.id] || {}).st; };
    /* the Owner delivers M1 with what to check */
    const deliver = async (m, link, note, build, steps) => {
      await tab('delivery');
      await U.go('#pd-panel [data-pd="dl:deliver"][data-m="' + m + '"]', 500);
      await p.fill('#dl-lk', link); await p.fill('#dl-nt', note); await p.fill('#dl-b', build); await p.fill('#dl-st', steps.join('\n'));
      await U.go('#pd-panel form[data-pd-form="dl:deliver"] [type="submit"]', 2500);
      const d = ((await raw()).mev || []).filter(e => e.ty === 'deliver' && e.m === m);
      return d.length ? d[d.length - 1] : null;
    };
    const M = { 1: 'i2', 2: 'i3', 3: 'i4', 4: 'i5', 5: 'i1' };
    /* Phương checks it */
    const checks = async (m, works, issue) => {
      await creload();
      for (const s of works) { await C.click('[data-a="ckok"][data-m="' + m + '"][data-s="' + s + '"]').catch(async () => console.log('no Works ' + m + ' step ' + s)); await sleep(1800); }
      if (issue) { await C.click('[data-a="ckissue"][data-m="' + m + '"][data-s="' + issue[0] + '"]'); await cdlg({ tx: issue[1], pics: issue[2] }); }
    };
    /* a button of hers on one request: in its drawer on the portal */
    const onReq = async (cr, a) => {
      await creload();
      let b = C.locator('[data-a="' + a + '"][data-cid="' + cr + '"]').filter({ visible: true }).first();
      if (!(await b.count())) { await openReq(cr); b = C.locator('#dReq [data-a="' + a + '"]').filter({ visible: true }).first(); }
      if (!(await b.count())) { console.log('no ' + a + ' on ' + cr + ': ' + (await CU.text('#dReq')).slice(0, 400)); return false; }
      await b.click(); await sleep(500); return true;
    };
    const openReq = async cr => {
      await creload();
      const o = C.locator('[data-a="req"][data-cid="' + cr + '"], [data-a="open"][data-key="' + cr + '"]').first();
      if (await o.count()) { await o.click(); await sleep(1000); return true; }
      console.log('no request ' + cr + ' on the portal: ' + JSON.stringify(await C.$$eval('[data-a="req"],[data-a="open"]', l => l.map(b => b.dataset.a + ':' + (b.dataset.cid || b.dataset.key))))); return false;
    };
    const reqApprove = async cr => { if (!(await openReq(cr))) return false; return withCode('[data-a="approve-from"][data-key$=":' + cr + '"]'); };
    const newReq = async (ti, tx, pics) => { await creload(); await C.locator('[data-a="new"]').filter({ visible: true }).first().click(); return cdlg({ ti, tx, pics }); };
    const studioReq = async (t, d, src) => {
      await tab('change');
      await U.go('#pd-panel [data-pd="crnew"]', 600);
      await p.fill('#ncr-t', t); await p.fill('#ncr-d', d);
      await U.go('#ncr-src [data-f="' + src + '"]', 200); await U.go('#ncr-kind [data-f="adds"]', 200);
      await U.go('#ncr-go', 1500);
      return !(await U.drawer());
    };
    const toDraft = async cr => { await crOpen(cr); await U.go('#pd-panel [data-pd="cr2sc"]', 1200).catch(async () => console.log('no Add to Scope draft on ' + cr)); };
    const issue = async (v) => {
      await tab('scope');
      await U.go('#pd-panel [data-pd="issue"]', 700);
      await p.check('#dis-ok', { force: true }); await sleep(200);
      await U.go('#dis-go', 2500);
      return new RegExp('v' + v).test(await U.text('#pd-panel .pd-stamp'));
    };
    const workDone = async (pg, ts, approve) => {
      await tab('team', pg);
      for (const t of ts) { await status(pg, t, 'doing'); await status(pg, t, 'review', 'Xong, anh xem giúp em.'); }
      for (const t of ts) if ((await st(t, pg)) !== 'review') { await tab('team', pg); await status(pg, t, 'review', 'Xong, anh xem giúp em.'); }
      await round(); await round();
      for (let i = 0; i < 4; i++) { let all = true; for (const t of ts) if ((await st(t)) !== 'review' && (await st(t)) !== 'done') all = false; if (all) break; await round(); }
      if (approve) {
        await tab('team');
        for (const t of ts) {
          for (let k = 0; k < 3 && (await st(t)) !== 'review' && (await st(t)) !== 'done'; k++) { await tab('team', pg); await status(pg, t, 'review', 'Xong, anh xem giúp em.'); await round(); await round(); await tab('team'); }
          if ((await st(t)) === 'review') await approveWk(t); else console.log('still ' + (await st(t)) + ' on the Owner: ' + t);
        }
        await round();
      }
    };
    const share = async t => {
      await tab('evidence');
      const it = p.locator('#pd-panel [data-pd="evsel"]', { hasText: t.slice(0, 24) }).first();
      if (await it.count()) { await it.click(); await sleep(500); }
      await U.go('#pd-panel [data-pd="evprep"]', 800).catch(async () => console.log('no Prepare client copy for ' + t));
      await p.check('#prep-ok', { force: true }).catch(() => {}); await sleep(200);
      await U.go('#prep-go', 1500);
      return !(await U.drawer());
    };
    const bug = async (tx, pics) => { await creload(); await C.locator('[data-a="bug"]').filter({ visible: true }).first().click(); return cdlg({ m: MN[4], tx, pics }); };
    const bugs = async () => ((await raw()).mev || []).map((e, i) => Object.assign({ i }, e)).filter(e => e.ty === 'bug');
    const fixed = async (bi, tx, link) => {
      await U.go('#pd-panel [data-pd="dl:fix"][data-b="' + bi + '"]', 500);
      await p.fill('#pd-panel form[data-pd-form="dl:fixed"] [name="tx"]', tx); await p.fill('#pd-panel form[data-pd-form="dl:fixed"] [name="link"]', link);
      await U.go('#pd-panel form[data-pd-form="dl:fixed"] [type="submit"]', 1800);
    };
    /* Phương opens her portal from the invitation in her mail (a link that works again for 14 days) */
    const openPortal = async () => {
      const m0 = lastMail(PHUONG, /portal\.html#/);
      if (!m0) { ok(false, 'Phương has her invitation', S.mails().map(x => x.to + ': ' + x.subject)); return false; }
      const cctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
      await cctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      C = await cctx.newPage(); C.on('pageerror', e => errs.push('portal: ' + e.message)); C.on('dialog', d => d.accept());
      await C.goto(m0.body.match(/https?:\/\/\S+portal\.html#\S+/)[0]); await sleep(3000);
      CU = P(C); return true;
    };
    /* a checkpoint: what a later run needs to start from the next section */
    const save = async s => {
      const d = path.join(CK, s); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'db.sql'), require('child_process').execFileSync(path.join(process.env.SD_MYSQL_BIN || '', 'mysqldump'), ['-h', '127.0.0.1', '-u', process.env.SD_DB_USER || 'root', S.db], { maxBuffer: 1 << 28 }));
      fs.copyFileSync(path.join(S.srv, 'outbox.jsonl'), path.join(d, 'outbox.jsonl'));
      fs.writeFileSync(path.join(d, 'drive.json'), DRIVE.dump());
      fs.writeFileSync(path.join(d, 'vars.json'), JSON.stringify({ PID, keys, editors: Object.keys(E).map(k => [k, E[k]._who, E[k]._pid]) }));
      /* the browsers closed, their profile folders copied, then opened again as they were */
      await p.context().close(); for (const k of Object.keys(E)) await E[k].context().close();
      fs.cpSync(PROF, path.join(d, 'prof'), { recursive: true });
      p = await device(OWNER, 'owner'); p._pid = PID; DEV[OWNER] = p;
      for (const k of Object.keys(E)) { const who = E[k]._who, pid = E[k]._pid; E[k] = await device(who, k); E[k]._pid = pid; DEV[who] = E[k]; }
    };
    const done = async s => { console.log('---- ' + s + ' done'); await save(s); if (UNTIL === s) throw new Stop(s); };
    /* from a checkpoint: the Editors' browsers and Phương's portal, as they were */
    if (ck) {
      for (const [short, e, pid] of ck.editors) {
        const pg = await device(e, short);
        pg._pid = pid; E[short] = pg; DEV[e] = pg;
      }
      if (LETTERS.indexOf(ckPrev) >= LETTERS.indexOf('C')) await openPortal();
    }

    // ============================================================ B. the client, the project, Scope v1
    if (go('B')) {
      /* the Profile: the studio's name leads its mail to the client and the portal */
      await U.go('.user[data-view="profile"]', 600);
      await p.evaluate(() => { for (const [id, v] of [['pf-name', 'Studio Bắc Nam'], ['pf-biz', 'Studio Bắc Nam']]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } document.getElementById('pf').requestSubmit(); }); await sleep(1200);
      ok(/Studio Bắc Nam/.test(await U.text('#view-profile')), 'A2 the studio is Studio Bắc Nam');

      await U.go('.nav-i[data-view="clients"]', 500);
      await U.go('#cl-new', 600);
      await p.fill('#cf-name', 'Sao Bắc Logistics'); await p.fill('#cf-contact', 'Đỗ Lan Phương'); await p.fill('#cf-role', 'Giám đốc vận hành');
      await p.fill('#cf-email', PHUONG);
      await p.fill('#cf-note', 'Anh Khải quyết tiền, chị Phương quyết nghiệp vụ. Gọi chị Trang (kế toán) trước 10h, chiều chị đi ngân hàng.');
      if (await p.getAttribute('#cf-sw', 'aria-checked') !== 'true') await U.go('#cf-sw', 200);
      await U.go('#cf-lang [data-f="vi"]', 200);
      await U.go('#cf-go', 1500);
      ok(/Sao Bắc Logistics/.test(await U.text('#view-clients') + await U.text('#view-client')), 'B1 Sao Bắc Logistics is a client');

      await U.go('.nav-i[data-view="projects"]', 400);
      await U.go('#npj-btn', 600);
      await p.fill('#npj-n', NAME);
      await U.btn('#drawer-npj', 'Client');
      await sleep(300);
      const cid = await p.$eval('#npj-c', s => [...s.options].map(o => o.value).find(v => /sao/.test(v)) || '').catch(() => '');
      if (cid) await p.selectOption('#npj-c', cid);
      await p.selectOption('#npj-cur', 'VND').catch(async () => { await U.dump('#f-npj-cur', 'currency'); });
      await p.fill('#npj-d', day(3)).catch(() => {});
      if (await p.$eval('#npj-go', e => e.disabled)) { await p.click('#npj-gate [data-drg="drive"]').catch(() => {}); await sleep(1200); }
      await U.go('#npj-go', 1600);
      PID = await p.evaluate(() => { const m = /#pj-(.+)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
      ok(!!PID, 'B2 the project: ' + PID, await U.text('#drawer-npj'));
      p._pid = PID;
      ok(((await raw()) || {}).cur === 'VND' || /₫|VND/.test(await panel()), 'B2 in VND');

      await tab('workspace');
      await edit('focus', 'Chốt Phạm vi MVP 12 tuần với chị Phương: P0, cổng G-GPS, pilot 15 xe');
      await edit('next', 'Gửi Phạm vi v1 cho chị Phương duyệt trước buổi kickoff thứ Hai');
      for (const [t, u] of [['SRS v1.1 · Sao Bắc', 'https://docs.example.com/srs-saobac'], ['Figma · FOMS Sao Bắc', 'https://www.figma.com/'],
        ['Repo · foms-saobac', 'https://gitlab.example.com/'], ['Staging', 'https://staging.example.com/']]) await addLink(t, u);
      ok(/Staging/.test(await panel()) && /pilot 15 xe/.test(await panel()), 'B3 focus, next step, four links');

      // ------------------------------------------------------------ the Scope
      await tab('scope');
      /* the milestone the new project starts with (Handoff, on its date) becomes M5 */
      const first = await p.$eval('#pd-panel [data-pd="itedit"]', e => e.getAttribute('data-id')).catch(() => '');
      if (first) {
        await U.go('#pd-panel [data-pd="itedit"][data-id="' + first + '"]', 400);
        const E = '#pd-panel form[data-pd-form="itedit"]';
        await p.fill(E + ' [name="t"]', MS[4][0]); await p.fill(E + ' [name="pay"]', String(MS[4][2]));
        if (await p.$(E + ' [name="d"]')) await p.fill(E + ' [name="d"]', day(MS[4][1]));
        await U.go(E + ' [type="submit"]', 450);
      }
      for (const [t, d, pay] of MS.slice(0, 4)) { const er = await addItem('tl', t, { d: day(d), pay }); ok(!er, 'B4 milestone: ' + t, er); }
      let nd = 0; for (const [t, okw, m] of DLV) { const er = await addItem('in', t, { ok: okw, m: MN[m] }); if (!er) nd++; else ok(false, 'B5 ' + t, er); }
      ok(nd === DLV.length, 'B5 23 deliverables', nd);
      for (const t of ['Kế toán tổng hợp, VAT, hoá đơn điện tử', 'Tính lương tài xế, HRM', 'Tối ưu tuyến nhiều xe tự động (VRP), AI dự báo', 'Xem video camera trực tiếp',
        'Bản đồ số vùng cấm và định tuyến tránh vùng cấm', 'App iOS cho tài xế', 'Cổng tra cứu đơn cho khách hàng doanh nghiệp', 'Phí bản đồ, SMS/OTP, cloud, bản quyền GPS']) {
        const er = await addItem('out', t); if (er) ok(false, 'B6 ' + t, er);
      }
      /* what she sends on time is due tomorrow here: a past due date would count every day since as hers, and move every milestone
         (smState: a thing due before a milestone, sent late, adds its days to it). Only the GPS papers are really late. */
      for (const [t, d] of CI) { const er = await addItem('ci', t, { d: day(d) }); if (er) ok(false, 'B7 ' + t, er); }
      for (const t of ['Mã nguồn web, server, app và quyền quản trị repository', 'Tệp APK đã ký và hướng dẫn cài cho tài xế', 'Tài khoản quản trị hệ thống và tài liệu vận hành',
        'Bản sao lưu database và hướng dẫn khôi phục', 'Tài liệu API và hướng dẫn tích hợp GPS']) {
        const er = await addItem('ho', t, { m: MN[4] }); if (er) ok(false, 'B8 ' + t, er);
      }
      { const er = await addItem('wa', 'Lỗi của web điều hành, app tài xế và server so với các dòng Xong khi', { d: 60 }); if (er) ok(false, 'B9 warranty', er); }
      // the agreement
      await U.go('#pd-panel [data-pd="termsedit"]', 500);
      const T = '#pd-panel form[data-pd-form="terms"]';
      for (const [k, v] of [['price', '390.000.000'], ['dep', '20'], ['pd', '7'], ['rpm', '2'], ['free', '2'], ['rate', '900.000'], ['min', '1'], ['review', '5'], ['silence', '10'], ['dormant', '30'], ['cure', '5'],
        ['meth', 'Chuyển khoản Techcombank, nội dung ghi mã SBL và số mốc']]) await p.fill(T + ' [name="' + k + '"]', v).catch(() => console.log('no terms field ' + k));
      await U.go(T + ' [type="submit"]', 600);
      if (await p.$(T)) ok(false, 'B10 the agreement saved', await U.text(T + ' .err'));
      const sc = (await raw()) || {};
      console.log('scope items', (sc.sc && sc.sc.items || []).length, 'terms', JSON.stringify(sc.sc && sc.sc.terms));
      ok(/390/.test(await panel()), 'B10 the agreement: 390.000.000 ₫, 900.000 ₫ an hour');
      await U.go('#pd-panel [data-pd="issue"]', 700);
      const blocked = await U.text('#dis-chk');
      await p.check('#dis-ok', { force: true }); await sleep(200);
      await U.go('#dis-go', 2500);
      ok(!(await U.drawer()), 'B11 Scope v1 issued', blocked + ' ' + await U.text('#dis-err'));
      await done('B');

    }

    // ============================================================ C. the client: two questions, approval, deposit, what they provide
    if (go('C')) {
      ok(await openPortal(), 'C1 Phương gets the invitation and opens it');
      ok(/Sao Bắc|đội xe/.test(await CU.text('body')), 'C1 the portal opens on the project', (await CU.text('body')).slice(0, 300));
      await C.click('[data-a="ask"]');
      ok(await cdlg({ tx: '6 xe thuê của nhà xe Tuấn Phát có tài xế dùng iPhone. Họ có dùng được app không, hay bắt buộc phải đổi máy Android?' }), 'C1 CR-001 a question');
      await C.click('[data-a="ask"]');
      ok(await cdlg({ tx: 'Nhiều khách trả COD bằng chuyển khoản vào QR cá nhân của tài xế. App có ghi được khoản này không, hay chỉ tiền mặt?', pics: 'qr-chuyen-khoan.png' }), 'C3 CR-002 a question with a picture');

      await pull();
      ok(await reply('CR-001', 'note', { tx: 'Bản đầu chỉ có app Android, App iOS nằm trong Không bao gồm. Nếu cần, bọn em báo giá riêng một bản web cho iPhone, chỉ nhận chuyến và chụp POD.' }), 'C2 the Owner answers CR-001');
      ok(await reply('CR-002', 'note', { tx: 'Có. Tài xế chọn Chuyển khoản và chụp màn hình giao dịch; kế toán đối soát với sao kê khi tài xế nộp lô cuối ca. App không tự đọc sao kê ngân hàng.' }), 'C4 the Owner answers CR-002');

      await creload();
      ok(await withCode() && /đã duyệt|approved/i.test(await CU.text('body')), 'C5 Phương approves Scope v1 with a code', (await CU.text('body')).slice(0, 400));
      await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {}); await sleep(500);
      await creload();
      await paidBtn(); ok(await cdlg({ tx: 'Chuyển khoản Techcombank, nội dung SBL-COC' }), 'C6 Phương says she paid the deposit');
      await pull(); await tab('delivery');
      await U.go('#pd-panel [data-pd="dl:nopay"]', 500).catch(async () => U.dump('#pd-panel', 'no nopay'));
      await p.fill('#pd-panel form[data-pd-form="dl:nopay"] [name="tx"]', 'Chưa thấy tiền về, chị nhờ kế toán gửi giúp em ảnh uỷ nhiệm chi qua Zalo nhé.').catch(() => {});
      await U.go('#pd-panel form[data-pd-form="dl:nopay"] [type="submit"]', 2000).catch(() => {});
      await creload();
      await paidBtn(); ok(await cdlg({ tx: 'Kế toán đã chuyển lại lúc 14h30, nội dung SBL-COC-01' }), 'C6 and again, after the studio said not yet');
      await pull(); await tab('delivery');
      await U.go('#pd-panel [data-pd="dl:paydone"]', 800).catch(async () => U.dump('#pd-panel', 'no paydone'));
      /* what she provides, the first three */
      await creload();
      ok(await sent(CI[0][0], 'Đã gửi 14 file Excel vào thư mục chung của hai bên, đã xoá tên và số điện thoại người nhận.'), 'C7 the 14 days of Excel');
      ok(await sent(CI[1][0], 'Danh sách xe gửi kèm, cột GPS ghi rõ xe nào chưa lắp.'), 'C7 the list of trucks');
      ok(await sent(CI[2][0], 'Thứ Ba anh Mạnh đón các bạn ở kho Long Biên lúc 6h.'), 'C7 a day at the depot');
      await pull(); await tab('delivery');
      await gotSent();
      const left = await p.$$eval('#pd-panel [data-pd^="dl:"]', l => l.map(e => e.getAttribute('data-pd') + ':' + (e.getAttribute('data-m') || '') + ':' + e.textContent.trim().slice(0, 30)));
      ok(((await raw()).mev || []).filter(e => e.ty === 'got').length === 3, 'C7 the studio has received all three', [left, ((await raw()).mev || []).map(e => e.ty + ':' + (e.m || '')), await U.text('#pd-panel .dl-ci, #pd-panel [aria-labelledby*="ci"]')]);
      // evidence: the kickoff
      await tab('evidence');
      ok(await capture('Biên bản kickoff · 6 quyết định', 'doc', 'Pilot có nghiệm thu rồi mới mở rộng. Pilot luồng giao siêu thị, kho Long Biên. Một mẫu Excel chính. GPS chỉ bắt buộc khi qua cổng G-GPS. Android trước. Chị Phương là người duy nhất duyệt thay đổi phạm vi.', 'v1'), 'C8 the kickoff kept as evidence');
      await done('C');

    }

    // ============================================================ D. the team: three Editors, through Google Drive (the stand-in)
    if (go('D')) {
      for (const [n, e] of ED) await member(n, e);
      for (const [n, e] of ED) ok(await invite(e), 'D1 ' + n + ' is on the project as an Editor', (((await raw()) || {}).team || []).map(m => m.n + '/' + m.role));
      await run(p); await run(p);
      const kept = (await p.evaluate(() => window.__drv.sync.state())).kept.filter(x => x.id === PID)[0];
      const fid = kept && kept.dv && kept.dv.fid;
      ok(!!fid, 'D1 the project is kept in (the stand-in) Google Drive', kept);
      for (const [n, e, short] of ED) {
        const pg = await device(e, short);
        await pg.click('.user[data-view="profile"]'); await sleep(500);
        await pg.evaluate(n => { const e = document.getElementById('pf-name'); e.value = n; e.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('pf').requestSubmit(); }, n); await sleep(800);
        const files = Object.values(DRIVE.files).filter(f => f.parents.includes(fid) && !f.trashed && /\.sdteam$/.test(f.name));
        files.forEach(f => DRIVE.pick(e, f.id));
        await pg.evaluate(m => window.__drv.sync.join(m), { fid, files: files.map(f => ({ id: f.id, name: f.name })) });
        DEV[e] = pg; await run(pg); await run(p); await run(pg);
        const k = (await pg.evaluate(() => window.__drv.sync.state())).kept.filter(x => x.n === NAME)[0];
        ok(k && k.dv.role === 'Editor', 'D1 ' + short + ' joins, as an Editor', k && k.dv);
        pg._pid = k && k.id; E[short] = pg;
      }
      await round(); await round();
      await done('D');


    }

    // ============================================================ E. M1: survey and design (weeks 1-2)
    if (go('E')) {
      await tab('team');
      let na = 0; for (const [t, , , who] of DLV) if (await assign(t, who)) na++;
      ok(na === DLV.length, 'D4 the work is given out: Bảo, Nam, Mai Anh, and you', na);
      await round(); await round();
      for (const k of Object.keys(E)) await tab('team', E[k]);
      await status(E['Mai Anh'], T_[0], 'doing');
      await tab('workspace', E['Mai Anh']);
      await edit('next', 'Ngồi cạnh anh Mạnh một ca sáng ở kho Long Biên, bấm giờ từ chốt đơn đến xe xuất bến', E['Mai Anh']);
      await addLink('Ghi chép quan sát kho Long Biên', 'https://docs.example.com/quan-sat-long-bien', E['Mai Anh']);
      await tab('team', E['Mai Anh']);
      await status(E['Mai Anh'], T_[0], 'review', 'BRD vòng 1 đã khớp buổi quan sát ở kho Long Biên.');
      await status(E['Mai Anh'], T_[1], 'review', 'Mẫu 15 cột, đã thử với 2 file của chị Trang.');
      await status(E['Bảo'], T_[2], 'review', 'ERD và bảng quyền 9 vai trò, có cả RENTAL_PARTNER để P1.');
      await round(); await round();
      await tab('team');
      await inReview(T_[0], E['Mai Anh']); await approveWk(T_[0]);
      await inReview(T_[1], E['Mai Anh']); await sendBack(T_[1], 'Thiếu cột service_type và quy tắc khi cod_expected_vnd để trống. Xem mục 8.3 của SRS.');
      await inReview(T_[2], E['Bảo']); await approveWk(T_[2]);
      await round(); await round();
      await tab('team', E['Mai Anh']);
      await status(E['Mai Anh'], T_[1], 'review', 'Đã thêm service_type; COD để trống thì hiểu là 0.');
      await round(); await round();
      await tab('team');
      await inReview(T_[1], E['Mai Anh']); await approveWk(T_[1]);
      for (const t of [T_[3], T_[4]]) await status(p, t, 'done');
      ok((await st(T_[0])) === 'done' && (await st(T_[1])) === 'done' && (await st(T_[4])) === 'done', 'E2-E3 M1 work done, one line sent back once', [await st(T_[0]), await st(T_[1]), await st(T_[2]), await st(T_[4])]);
      await round();

      ok(!!(await deliver(M[1], 'https://www.figma.com/', 'BRD, từ điển dữ liệu, ERD và prototype 24 màn. Spike GPS: nhà cung cấp có API vị trí mới nhất, chưa có lịch sử hành trình.', 'Discovery v1.0', M1S)), 'E4 M1 delivered, five steps to check');
      await checks(M[1], [1, 2, 3, 5], [4, 'Chữ trên màn Hôm nay quá nhỏ, anh Lực đeo kính mới đọc được.']);
      await creload();
      await C.locator('[data-a="changes"]').filter({ visible: true }).first().click();
      ok(await cdlg({ tx: 'Màn Hôm nay bỏ biểu đồ tiến độ. Tài xế chỉ cần điểm giao kế tiếp, số kiện và tiền COD phải thu, chữ to.' }), 'E5 Phương asks for changes (round 1 of 2)');
      await pull();
      ok(!!(await deliver(M[1], 'https://www.figma.com/', 'Màn Hôm nay chỉ còn điểm kế tiếp, số kiện, COD; cỡ chữ 18.', 'Discovery v1.1', M1S)), 'E6 M1 delivered again');
      await checks(M[1], [1, 2, 3, 4, 5]);
      await creload();
      ok(await withCode(), 'E6 Phương accepts M1 with a code', (await CU.text('body')).slice(0, 300));
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await paidBtn(M[1]).catch(async () => paidBtn()); ok(await cdlg({ tx: 'SBL-M1' }), 'E6 and says she paid its share');
      await pull(); await tab('delivery');
      ok(((await raw()).mev || []).some(e => e.ty === 'accept' && e.m === M[1]), 'E6 M1 accepted, on the studio’s side');
      await done('E');


    }

    // ============================================================ F. weeks 3-6: the operations web app, three changes
    if (go('F')) {
      await tab('workspace');
      await edit('focus', 'Web điều hành: import và lập chuyến chạy với file thật của Sao Bắc');
      await edit('next', 'Chạy thử import 14 file Excel chị Phương gửi, đếm dòng lỗi');
      await tab('team', E['Bảo']); await status(E['Bảo'], T_[5], 'doing'); await status(E['Bảo'], T_[6], 'doing');
      await tab('team', E['Nam']); await status(E['Nam'], T_[9], 'doing');
      await tab('workspace', E['Mai Anh']);
      for (const t of ['Quét mã vạch kiện bằng camera điện thoại #P1', 'Geofence quanh kho để tự ghi giờ xe về #P1', 'Nhắc hạn đăng kiểm, bảo hiểm xe qua Zalo #P1']) {
        await E['Mai Anh'].click('#pd-panel [data-pd="x6:ladd"]'); await sleep(350);
        await E['Mai Anh'].fill('#pd-panel form[data-pd-form="x6:later"] [name="t"]', t); await E['Mai Anh'].click('#pd-panel form[data-pd-form="x6:later"] [type="submit"]'); await sleep(450);
      }
      await round(); await round();
      ok(((await raw()).later || (await raw()).park || []).length >= 3 || /Geofence/.test(await panel()), 'F2 Mai Anh parks three ideas', Object.keys(await raw()));
      ok(await newReq('Thêm mẫu import thứ hai cho siêu thị Hải Hà', 'Siêu thị gửi file đơn theo mẫu của họ, mỗi dòng là một kiện, không phải một đơn. Điều phối đang gộp tay mỗi sáng mất 40 phút.', 'file-don-sieu-thi.png'), 'F3 CR-003 from Phương, with the supermarket’s file');
      ok(await studioReq('Xuất bảng đối soát COD theo mẫu của kế toán', 'Chị Trang gọi: cần file theo từng tài xế, từng ngày, cột giống sổ hiện tại để kiểm với sao kê.', 'call'), 'F4 CR-004 from a call with chị Trang');
      ok(await newReq('OTP qua SMS khi giao đơn giá trị cao', 'Đơn điện máy trên 20 triệu cần người nhận đọc mã OTP, không chỉ chụp ảnh.'), 'F5 CR-005 from Phương');
      await pull();
      ok(await reply('CR-003', 'quote', { hrs: 16, days: 3, mv: MN[1], tx: 'Mẫu map thứ hai, gộp nhiều dòng kiện thành một đơn theo mã đơn của siêu thị.' }), 'F6 CR-003 quoted: 16 hours, 14.400.000 ₫, 3 days');
      ok(await reply('CR-004', 'quote', { inc: true, days: 0, tx: 'Thêm mẫu xuất đối soát COD theo cột sổ hiện tại.' }), 'F6 CR-004: an included change');
      ok(await reply('CR-005', 'quote', { hrs: 20, days: 4, mv: MN[2], tx: 'OTP gửi qua nhà cung cấp SMS của Sao Bắc; phí SMS không bao gồm.' }), 'F6 CR-005 quoted: 20 hours, 18.000.000 ₫');
      ok(await onReq('CR-003', 'counter') && await cdlg({ amt: '10.800.000', days: 2, tx: 'Anh Khải duyệt 10,8 triệu, bên em gửi file mẫu chuẩn của siêu thị để đỡ phần dò cột.' }), 'F7 Phương counters CR-003: 10.800.000 ₫, 2 days');
      ok(await reqApprove('CR-004'), 'F7 Phương approves CR-004 with a code');
      ok(await onReq('CR-005', 'decline') && await cdlg({ tx: 'Để sau pilot, xem tỷ lệ khiếu nại đơn giá trị cao trước.' }), 'F7 Phương declines CR-005');
      await pull();
      ok(await reply('CR-003', 'accept', { tx: 'Đồng ý 10,8 triệu, 2 ngày. Bọn em làm luôn trong đợt này.' }), 'F8 the studio accepts her counter');
      await tab('evidence');
      ok(await capture('Zalo · anh Khải chốt 10,8 triệu mẫu import siêu thị', 'chat', 'Anh Khải (Zalo, 9:12): ok 10tr8 cho mẫu siêu thị Hải Hà, làm luôn trong đợt này.', 'CR-003'), 'F8 the Zalo message kept, on CR-003');
      /* what Editors see: the price talk stays with the Owner */
      await tab('team');
      const hid = await p.evaluate(() => {
        document.querySelectorAll('#pd-panel details').forEach(d => { d.open = true; });
        const box = [...document.querySelectorAll('#pd-panel input[data-pd="dv:oo"]')].find(i => /anh Khải chốt/.test(i.closest('label').textContent));
        if (!box) return 'no box: ' + [...document.querySelectorAll('#pd-panel input[data-pd="dv:oo"]')].map(i => i.closest('label').textContent).join(' | ');
        if (box.checked) box.click(); return 'ok';
      });
      await sleep(800);
      ok(hid === 'ok' && (((await raw()).evd || []).find(x => /anh Khải chốt/.test(x.t || x.title || '')) || {}).oo === 1, 'F9 the Zalo message: only you', hid);
      await toDraft('CR-003'); await toDraft('CR-004');
      ok(await issue(2), 'F10 Scope v2 issued, with CR-003 and CR-004');
      await creload();
      ok(await withCode(), 'F10 Phương approves Scope v2', (await CU.text('body')).slice(0, 300));
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      ok(await sent(CI[3][0], 'Anh Mạnh chụp bảng dán ở phòng điều phối, gửi qua Zalo; 11 xe có giấy phép vào phố.'), 'F11 the table of restricted hours');
      await pull(); await tab('delivery'); await gotSent();
      await done('F');

    }

    // ============================================================ G. M2: the operations web app
    if (go('G')) {
      await tab('team', E['Bảo']);
      await status(E['Bảo'], T_[6], 'review', 'Import xong: map cột, xem trước, lỗi theo dòng.');
      await round(); await round();
      await tab('team');
      await inReview(T_[6], E['Bảo']); await sendBack(T_[6], 'Bấm Xem trước đã ghi đơn vào bảng orders. Xong khi ghi: chưa xác nhận thì chưa tạo đơn.');
      await round(); await round();
      await tab('team', E['Bảo']); await status(E['Bảo'], T_[6], 'review', 'Xem trước giờ chỉ đọc file, bấm Xác nhận mới tạo đơn.');
      await round(); await round();
      await inReview(T_[6], E['Bảo']); await approveWk(T_[6]);
      await workDone(E['Bảo'], [T_[5], T_[7], T_[8], T_[10]], true);
      await workDone(E['Nam'], [T_[9]], true);
      await tab('workspace', E['Bảo']); await addLink('Bản build web v0.6 · staging', 'https://staging.example.com/web-0.6', E['Bảo']);
      await round();
      ok(!!(await deliver(M[2], 'https://staging.example.com/', 'Web điều hành bản đầu: danh mục, import Excel, lập chuyến, cảnh báo giờ cấm, bảng điều hành.', 'web v0.6 · staging', M2S)), 'G3 M2 delivered');
      await checks(M[2], [1, 2, 4, 5], [3, 'File lỗi tải về mở bằng Excel bị vỡ chữ: "Thiáº¿u Ä‘á»‹a chá»‰".', 'excel-vo-font.png']);
      await creload();
      await C.locator('[data-a="changes"]').filter({ visible: true }).first().click();
      ok(await cdlg({ tx: 'Màn xem trước cho lọc riêng các dòng trùng. Anh Mạnh muốn xem dòng trùng trước khi bấm xác nhận.' }), 'G4 Phương asks for changes on M2');
      await pull();
      ok(!!(await deliver(M[2], 'https://staging.example.com/', 'File lỗi xuất UTF-8 có BOM, mở thẳng bằng Excel; thêm bộ lọc Trùng, Lỗi, Hợp lệ.', 'web v0.6.1', M2S)), 'G5 M2 delivered again');
      await checks(M[2], [1, 2, 3, 4, 5]);
      await creload();
      ok(await withCode(), 'G5 Phương accepts M2');
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await paidBtn(M[2]).catch(async () => paidBtn()); ok(await cdlg({ tx: 'SBL-M2, kèm 10.800.000 của CR-003' }), 'G5 she says she paid M2 and CR-003');
      await pull();
      ok(((await raw()).mev || []).some(e => e.ty === 'accept' && e.m === M[2]), 'G5 M2 accepted');
      await done('G');

    }

    // ============================================================ H. weeks 7-8: the driver app; a web version for iPhones
    if (go('H')) {
      await tab('workspace');
      await edit('focus', 'App tài xế chạy ổn trên máy yếu và khi mất sóng');
      await edit('next', 'Mượn 3 máy Android của tài xế pilot, cài bản 0.8.0, chạy một tuyến thật cùng anh Lực');
      await workDone(E['Nam'], [T_[11], T_[12], T_[14]], true);
      await workDone(E['Bảo'], [T_[13]], true);
      await tab('workspace', E['Nam']); await addLink('APK driver 0.8.0', 'https://builds.example.com/driver-0.8.0.apk', E['Nam']);
      await round();
      ok(await newReq('Bản web cho tài xế xe thuê dùng iPhone', 'Nhà xe Tuấn Phát không đổi máy. 6 tài xế cần nhận chuyến, giao xong, giao thất bại và chụp POD trên iPhone.'), 'H3 CR-006 from Phương');
      await pull();
      ok(await reply('CR-006', 'quote', { hrs: 24, days: 4, mv: MN[4], tx: 'Bản web cài lên màn hình chính iPhone: nhận chuyến, POD, giao thất bại. Không có offline đầy đủ như Android.' }), 'H4 CR-006 quoted: 24 hours, 21.600.000 ₫, 4 days on M5');
      ok(await reqApprove('CR-006'), 'H4 Phương accepts CR-006 with a code');
      await creload();
      if (await C.locator('[data-a="ask"]').filter({ visible: true }).count()) await C.locator('[data-a="ask"]').filter({ visible: true }).first().click();
      else await C.evaluate(() => { const pid = (document.querySelector('[data-pid]') || {}).dataset.pid; const b = document.createElement('button'); b.type = 'button'; b.dataset.a = 'ask'; b.dataset.pid = pid; b.dataset.on = 'scope'; document.body.appendChild(b); b.click(); b.remove(); });
      ok(await cdlg({ tx: 'Dữ liệu vị trí xe và ảnh POD giữ bao lâu? Anh Quang hỏi để ghi vào quy chế bảo vệ dữ liệu.' }), 'H5 CR-007 a question on data retention');
      await pull();
      ok(await reply('CR-007', 'note', { tx: 'Mặc định: vị trí 90 ngày, ảnh POD 24 tháng, nhật ký thao tác không xoá. Sao Bắc chốt con số sau khi pháp chế xem, đổi được trong Cài đặt.' }), 'H5 the studio answers CR-007');
      await done('H');

    }

    // ============================================================ I. M3: the driver app, not as agreed, then accepted
    if (go('I')) {
      ok(!!(await deliver(M[3], 'https://builds.example.com/driver-0.8.0.apk', 'App tài xế Android: Hôm nay, chuyến, điểm dừng, POD, giao thất bại, hàng đợi offline.', 'driver 0.8.0 (APK)', M3S)), 'I1 M3 delivered');
      await checks(M[3], [1, 2, 3, 4], [5, 'Sóng yếu ở Cầu Giấy, anh Hưng bấm Gửi lại: đơn SB-10234 ghi COD 450.000 hai lần, tổng ca thành 900.000.', 'cod-hai-lan.png']);
      await creload();
      await C.locator('[data-a="notmet"]').filter({ visible: true }).first().click();
      ok(await cdlg({ k: await itemId(T_[13]), tx: 'Xem ảnh ở bước 5.', pics: 'cod-hai-lan.png' }), 'I2 Phương: not as agreed, on the offline line');
      await pull();
      await tab('workspace');
      await U.go('#pd-panel [data-pd="x6:dadd"]', 400);
      await p.fill('#pd-panel form[data-pd-form="x6:dec"] [name="t"]', 'COD trùng: sửa ở server bằng khoá duy nhất (org, actor, client_event_id)');
      await p.fill('#pd-panel form[data-pd-form="x6:dec"] [name="b"]', 'App tạo client_event_id mới mỗi lần Gửi lại. Giữ nguyên mã khi gửi lại; server trả lại kết quả cũ thay vì ghi lần hai.');
      await U.go('#pd-panel form[data-pd-form="x6:dec"] [type="submit"]', 450);
      ok(/khoá duy nhất/.test(await panel()), 'I3 the studio notes how it is fixed');
      /* the line is done and its milestone delivered: the fix shows as Bảo's merge request, then a new build */
      await tab('workspace', E['Bảo']); await addLink('MR · giữ mã sự kiện khi gửi lại', 'https://gitlab.example.com/foms-saobac/merge_requests/41', E['Bảo']);
      await round(); await round();
      ok(!!(await deliver(M[3], 'https://builds.example.com/driver-0.8.1.apk', 'Giữ nguyên mã sự kiện khi gửi lại; server bỏ qua sự kiện đã nhận và trả lại kết quả cũ.', 'driver 0.8.1', M3S)), 'I4 M3 delivered again');
      await checks(M[3], [1, 2, 3, 4, 5]);
      await creload();
      ok(await withCode(), 'I4 Phương accepts M3');
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await paidBtn(M[3]).catch(async () => paidBtn()); ok(await cdlg({ tx: 'SBL-M3' }), 'I4 she says she paid M3');
      await pull();
      ok(((await raw()).mev || []).some(e => e.ty === 'notmet') && ((await raw()).mev || []).some(e => e.ty === 'accept' && e.m === M[3]), 'I4 M3: not as agreed, then accepted');
      await done('I');

    }

    // ============================================================ J. weeks 9-10: the GPS papers late, the GPS gate not passed
    if (go('J')) {
      await creload();
      ok(await (async () => { const pk = C.locator('[data-a="pick"][data-key^="late:"][data-key$=":' + M[4] + '"]').first(); if (await pk.count()) { await pk.click(); await sleep(800); } const b = C.locator('[data-a="flag"][data-m="' + M[4] + '"]').filter({ visible: true }).first(); if (!(await b.count())) { console.log('no flag: ' + JSON.stringify(await C.$$eval('[data-a]', l => [...new Set(l.map(x => x.dataset.a))]))); return false; } await b.click(); return cdlg({ tx: 'Đã quá hạn mốc COD; kế toán cần chạy thử đối soát trước kỳ chốt cuối tháng.' }); })(), 'J2 Phương flags M4 as missed');
      ok(await sent(CI[4][0], 'Anh Quang chuyển email của nhà cung cấp: API chỉ trả vị trí mới nhất, 1 phút một lần; không có API camera. Đã cấp 3 thiết bị thử.'), 'J3 the GPS papers, a day late');
      await pull(); await tab('delivery'); await gotSent();
      /* the vendor's email, kept as evidence from its screenshot (read in the browser, never uploaded) */
      await tab('evidence');
      await p.locator('#pd-panel [data-pd="evcap"]').filter({ visible: true }).first().click(); await sleep(600);
      await p.setInputFiles('#cap-file', pic('email-gps.png')); await sleep(900);
      await p.fill('#cap-t', 'Email nhà cung cấp GPS · API chỉ có vị trí mới nhất');
      await p.selectOption('#cap-kind', 'email').catch(() => {});
      await U.go('#drawer-cap [type="submit"]', 1500);
      ok(/nhà cung cấp GPS/.test(await panel()), 'J3 the GPS vendor’s email kept');
      ok(await studioReq('Cổng G-GPS không đạt: Live Map đổi sang liên kết nền tảng GPS', 'Theo SRS 10.3: bảng điều hành hiện vị trí mới nhất kèm giờ và nhãn Cũ, nút mở nền tảng GPS hiện có; Live Map thời gian thực để P1.', 'meeting'), 'J5 CR-008 from the gate meeting');
      ok(await capture('Biên bản cổng G-GPS · 48 giờ, 3 thiết bị', 'doc', 'Chạy 48 giờ trên staging: xe 29C-418.xx ổn định, độ trễ 70–110 giây; hai xe còn lại mất dữ liệu 6 và 9 giờ. Không đạt điều kiện 3 thiết bị liên tục 48 giờ (SRS 10.3).', 'CR-008'), 'J4 the gate’s minutes, on CR-008');
      ok(await share('Biên bản cổng G-GPS'), 'J4 a copy shared with Phương');
      ok(await reply('CR-008', 'quote', { inc: true, days: 0, tx: 'Đổi Live Map sang vị trí mới nhất có giờ và nhãn Cũ, kèm nút mở nền tảng GPS. Không tính thêm.' }), 'J5 CR-008: the second included change');
      ok(await reqApprove('CR-008'), 'J5 Phương approves CR-008');
      await tab('workspace');
      await U.go('#pd-panel [data-pd="x6:ladd"]', 400);
      await p.fill('#pd-panel form[data-pd-form="x6:later"] [name="t"]', 'Live Map thời gian thực khi nhà cung cấp GPS có API lịch sử #P1');
      await U.go('#pd-panel form[data-pd-form="x6:later"] [type="submit"]', 450);
      await done('J');

    }

    // ============================================================ K. a dispute: the map of restricted zones
    if (go('K')) {
      ok(await newReq('Vẽ vùng cấm xe tải trên bản đồ khi lập chuyến', 'Điều phối cần thấy tuyến nào đi qua vùng cấm giờ cao điểm, không chỉ dòng cảnh báo.', 'bang-gio-cam.png'), 'K1 CR-009 from Phương, with the printed table');
      await pull();
      ok(await reply('CR-009', 'quote', { hrs: 32, days: 6, mv: MN[4], tx: 'Số hoá vùng cấm theo Quyết định 01/2026 và 52/2026, vẽ trên bản đồ, kiểm tuyến đi qua.' }), 'K2 CR-009 quoted: 32 hours, 28.800.000 ₫');
      ok(await onReq('CR-009', 'dispute') && await cdlg({ pos: 'fix', ref: T_[8], tx: 'Phạm vi có cảnh báo khu vực hạn chế. Không có bản đồ thì điều phối không biết khu vực đó ở đâu.' }), 'K3 Phương: a fix owed under the agreement');
      await pull();
      ok(await reply('CR-009', 'dispute', { pos: 'change', ref: 'Not included: Bản đồ số vùng cấm và định tuyến tránh vùng cấm', tx: 'Phạm vi là cảnh báo theo bảng khung giờ và loại xe, đã chạy ở M2. Bản đồ vùng cấm ghi rõ trong Không bao gồm.' }), 'K4 the studio: new work, not included');
      ok(await onReq('CR-009', 'decline') && await cdlg({ tx: 'Đồng ý để sau pilot. Tạm dùng cảnh báo theo bảng giờ, anh Mạnh in bản đồ dán ở phòng điều phối.' }), 'K5 Phương declines: after the pilot');
      await done('K');

    }

    // ============================================================ L. Scope v3, M4 late, the work paused
    if (go('L')) {
      await pull();
      await toDraft('CR-006'); await toDraft('CR-008');
      ok(await issue(3), 'L1 Scope v3 issued, with CR-006 and CR-008');
      await creload();
      ok(await withCode(), 'L1 Phương approves Scope v3');
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await workDone(E['Bảo'], [T_[15], T_[16]], true);
      await workDone(E['Nam'], [T_[17], T_[18]], true);
      await workDone(E['Mai Anh'], [T_[19]], true);
      await tab('workspace', E['Mai Anh']); await addLink('Kết quả UAT 26 tình huống', 'https://docs.example.com/uat-saobac', E['Mai Anh']);
      await round();
      ok(!!(await deliver(M[4], 'https://staging.example.com/', 'Sổ COD, nộp theo lô, chênh lệch, điều chỉnh có duyệt, chi phí chuyến, báo cáo và xuất Excel.', 'web v0.9 · staging', M4S)), 'L3 M4 delivered, after its date');
      await checks(M[4], [1, 2, 3, 4, 5]);
      await creload();
      ok(await withCode(), 'L4 Phương accepts M4');
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await paidBtn(M[4]).catch(async () => paidBtn()); ok(await cdlg({ tx: 'SBL-M4' }), 'L4 she says she paid M4');
      await pull(); await tab('delivery');
      await U.go('#pd-panel [data-pd="dl:pause"]', 600);
      await p.click('#pd-panel form[data-pd-form="dl:pause"] [data-f="other"]').catch(() => {});
      await p.fill('#dl-pw', 'Chờ Sao Bắc chốt danh sách 15 xe, 15 tài xế pilot và máy của họ; chưa có danh sách thì chưa đào tạo được.');
      await U.go('#pd-panel form[data-pd-form="dl:pause"] [type="submit"]', 2000);
      ok(((await raw()).mev || []).some(e => e.ty === 'pause'), 'L5 the work paused');
      await done('L');

    }

    // ============================================================ M. weeks 11-12: the pilot and its acceptance
    if (go('M')) {
      ok(await sent(CI[5][0], '9 xe nhà, 6 xe Tuấn Phát; 12 tài xế Android, 3 tài xế iPhone dùng bản web.'), 'M1 the pilot list');
      await pull(); await tab('delivery'); await gotSent();
      await U.go('#pd-panel [data-pd="dl:resume"]', 2000);
      ok(((await raw()).mev || []).some(e => e.ty === 'resume'), 'M1 the work resumed');
      await tab('workspace');
      await edit('focus', 'Pilot 15 xe, 10 ngày, kho Long Biên');
      await edit('next', 'Họp go/no-go với anh Khải và chị Phương sáng thứ Sáu');
      await workDone(E['Mai Anh'], [T_[21]], true);
      await workDone(E['Bảo'], [T_[20]], true);
      await tab('team'); await status(p, T_[22], 'doing'); await status(p, T_[22], 'done');
      await round();
      ok(!!(await deliver(M[5], 'https://staging.example.com/pilot', 'Pilot 10 ngày, 15 xe, kho Long Biên. Báo cáo go/no-go kèm theo.', 'v1.0 · pilot', M5S)), 'M4 M5 delivered');
      ok(await capture('Biên bản go/no-go · GO có điều kiện', 'doc', 'Pilot 10 ngày: 2.860 đơn, 412 chuyến, giao lần đầu thành công 93,1%. Lập chuyến từ khoảng 45 phút còn 18 phút mỗi ca. GO có điều kiện: Live Map và bản đồ vùng cấm ngoài pilot.', 'v3'), 'M5 the go/no-go minutes');
      ok(await share('Biên bản go/no-go'), 'M5 a copy shared with Phương');
      await checks(M[5], [1, 2, 3, 4, 5]);
      await creload();
      ok(await withCode(), 'M6 Phương accepts M5');
      await creload(); await C.locator('[data-a="contdone"]').filter({ visible: true }).first().click({ timeout: 3000 }).catch(() => {});
      await paidBtn(M[5]).catch(async () => paidBtn()); ok(await cdlg({ tx: 'SBL-M5, kèm 21.600.000 của CR-006' }), 'M6 she says she paid M5 and CR-006');
      await done('M');

    }

    // ============================================================ N. what is handed over
    if (go('N')) {
      await pull(); await tab('delivery');
      /* each line by its own id: Mark handed over stays on a line until the client has it, so "the first one" is always the same */
      const hoIds = (await raw()).sc.items.filter(x => x.sec === 'ho').map(x => x.id);
      for (const [k, [link, tx]] of HO.entries()) {
        await U.go('#pd-panel [data-pd="dl:gave"][data-k="' + hoIds[k] + '"]', 500).catch(async () => console.log('no Mark handed over for ' + hoIds[k]));
        await p.fill('#pd-panel form[data-pd-form="dl:gave"] [name="link"]', link).catch(() => {}); await p.fill('#pd-panel form[data-pd-form="dl:gave"] [name="tx"]', tx).catch(() => {});
        await U.go('#pd-panel form[data-pd-form="dl:gave"] [type="submit"]', 1800);
      }
      ok(((await raw()).mev || []).filter(e => e.ty === 'gave').length === 5, 'N1 five things handed over');
      await creload();
      for (let i = 0; i < 4; i++) { await creload(); const r = C.locator('[data-a="recv"]').filter({ visible: true }).first(); if (!(await r.count())) { console.log('no Received button: ' + JSON.stringify(await C.$$eval('[data-a="recv"]', l => l.map(x => x.dataset.m))) + ' · You receive: ' + await CU.text('.ho-bx') + ' · body: ' + (await CU.text('body')).slice(0, 900)); break; } await r.click(); await sleep(2200); }
      await pull();
      ok(((await raw()).mev || []).filter(e => e.ty === 'recv').length === 4, 'N2 Phương received four; the GPS guide is still to confirm', ((await raw()).mev || []).filter(e => e.ty === 'recv').length);
      await done('N');

    }

    // ============================================================ O. weeks 13-16: the 60-day warranty
    if (go('O')) {
      ok(await bug('Đơn giao lúc 23:40 bị tính vào báo cáo COD của ngày hôm sau, kế toán lệch sổ 3 ngày liền.', 'bao-cao-cod-lech.png'), 'O1 a problem under warranty: the COD report a day off');
      await pull(); await tab('delivery');
      let bs = await bugs();
      await fixed(bs[0].i, 'Báo cáo tính theo giờ Việt Nam, không theo giờ UTC của server.', 'https://staging.example.com/release/1.0.1');
      await creload(); await C.locator('[data-a="fixok"]').filter({ visible: true }).first().click({ timeout: 8000 }).catch(async () => console.log('no fixok')); await sleep(2500);
      ok(await bug('App văng khi chụp ảnh POD trên máy Samsung A05 của anh Lực.', 'app-van-pod.png'), 'O2 a second problem: the app closes on a weak phone');
      await pull();
      await tab('workspace', E['Nam']); await addLink('APK driver 1.0.2', 'https://builds.example.com/driver-1.0.2.apk', E['Nam']); await round();
      await tab('delivery'); bs = await bugs();
      await fixed(bs[1].i, 'Giảm cỡ ảnh trước khi lưu, máy RAM 3 GB không còn văng.', 'https://staging.example.com/release/1.0.2');
      await creload(); await C.locator('[data-a="fixok"]').filter({ visible: true }).first().click({ timeout: 8000 }).catch(async () => console.log('no fixok 2')); await sleep(2500);
      ok(await bug('Muốn có báo cáo lãi lỗ theo từng chuyến để biết tuyến nào lỗ.'), 'O3 a third: a report of profit per trip');
      await pull(); await tab('delivery'); bs = await bugs();
      await U.go('#pd-panel [data-pd="dl:nobug"][data-b="' + bs[2].i + '"]', 500);
      await p.fill('#pd-panel form[data-pd-form="dl:notbug"] [name="tx"]', 'Báo cáo lãi lỗ cần quy tắc phân bổ chi phí, Phạm vi không có (SRS để P1).');
      await U.go('#pd-panel form[data-pd-form="dl:notbug"] [type="submit"]', 1800);
      /* the request it opens is written in the studio's language (104): the app in Tiếng Việt for this step, as Studio Bắc Nam uses it */
      await p.evaluate(() => window.SDI18N && SDI18N.set('vi')); await sleep(800);
      await U.go('#pd-panel [data-pd="dl:bugcr"][data-b="' + bs[2].i + '"]', 900);
      ok(/Không thuộc bảo hành: Báo cáo lãi lỗ/.test(await p.inputValue('#ncr-d').catch(() => '')), 'O3 the request opens with “Không thuộc bảo hành:” and the studio’s answer', await p.inputValue('#ncr-d').catch(() => ''));
      if (await U.drawer() === 'drawer-cr') { await U.go('#ncr-kind [data-f="adds"]', 200); await U.go('#ncr-go', 1500); }
      await p.evaluate(() => window.SDI18N && SDI18N.set('en')); await sleep(800);
      const crs = (await raw()).crs || [];
      ok(crs.length >= 10, 'O3 not covered: CR-010 opened from it', crs.map(c => c.id + ' ' + c.t));
      ok(await reply(crs[crs.length - 1].id, 'quote', { hrs: 40, days: 7, vf: 30, tx: 'Lãi lỗ theo chuyến: doanh thu cước trừ chi phí chuyến và chi phí xe thuê; ghi rõ khoản nào chưa phân bổ.' }), 'O4 CR-010 quoted: 40 hours, 36.000.000 ₫, valid 30 days');
      await done('O');

    }

    // ============================================================ P. the day: focus, waiting on the client, notes, export
    if (go('P')) {
      /* the lines the approved changes added (CR-003, CR-004, CR-006, CR-008): given out and done, as their milestones were */
      const crLines = (await raw()).sc.items.filter(x => x.sec === 'in' && x.cr).map(x => [x.t, x.cr]);
      const crWho = { 'CR-003': 'Bảo', 'CR-004': 'Nam', 'CR-006': 'Nam', 'CR-008': 'Bảo' };
      await tab('team');
      for (const [t, cr] of crLines) await assign(t, { 'Bảo': 'Trần Quốc Bảo', 'Nam': 'Phạm Hoàng Nam' }[crWho[cr] || 'Bảo']);
      await round(); await round();
      for (const who of ['Bảo', 'Nam']) { const ts = crLines.filter(x => (crWho[x[1]] || 'Bảo') === who).map(x => x[0]); if (ts.length) await workDone(E[who], ts, true); }
      ok(crLines.length === 4 && (await Promise.all(crLines.map(x => st(x[0])))).every(s => s === 'done'), 'P the four lines from approved changes are done', crLines.map(x => x[1]));
      await tab('workspace');
      await edit('focus', 'Bảo hành 60 ngày và báo giá giai đoạn 2');
      await edit('next', 'Gọi chị Phương hỏi về báo giá lãi lỗ theo chuyến');
      await U.go('.nav-i[data-view="dashboard"]', 600);
      await U.btn('#view-dashboard', 'View all', 600).catch(() => {});
      for (const [t, pj] of [['Gửi anh Khải đề xuất giai đoạn 2: Live Map, bản đồ vùng cấm, OTP #giaidoan2', NAME], ['Hỏi anh Quang nhà cung cấp GPS có API lịch sử hành trình chưa #gps', NAME],
        ['Tổng hợp 14 góp ý của tài xế pilot cho bản 1.1 #pilot', NAME]]) {
        await p.fill('#note-input', t).catch(() => {});
        if (pj && await p.$('#note-proj option:text-is("' + pj + '")')) await p.selectOption('#note-proj', { label: pj });
        await U.go('#note-save', 400).catch(() => {});
      }
      if (await U.drawer()) await U.go('.drawer.dr-live [data-close]', 400);
      await round(); await round();
      await U.go('.nav-i[data-view="settings"]', 500);
      await U.btn('#view-settings', 'Storage', 600).catch(() => {});
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#view-settings button', { hasText: /^Export$/ }).click()]);
      const out = fs.readFileSync(await dl.path(), 'utf8');
      fs.writeFileSync(OUT, out);
      const bk = JSON.parse(out), pj = bk.ent.find(e => e.k === 'project:' + PID);
      ok(!!pj && pj.d.crs.length >= 10 && pj.d.mev.length > 40, 'P the workspace exported to ' + OUT, pj && [pj.d.crs.length, pj.d.mev.length]);
      await done('P');
    }
  } catch (e) {
    if (!(e instanceof Stop)) { console.error('ERR', String(e && e.stack || e).split('\n').slice(0, 5).join('\n')); fails++; if (p) await p.screenshot({ path: path.join(os.tmpdir(), 'sample-saobac-err.png') }).catch(() => {}); }
  } finally {
    ok(!errs.length, 'no page errors', errs.slice(0, 8));
    console.log('\n' + (steps - fails) + '/' + steps + ' ok');
    await b.close(); S.stop(); process.exit(fails ? 1 : 0);
  }
})();
