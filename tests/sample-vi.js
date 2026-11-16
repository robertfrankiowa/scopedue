// The Vietnamese private sample (SAMPLE-SCRIPT-APP-CHAM-CONG-HR-VI.md), an Internal project since CONTRACT 108: Chuỗi cà phê Hạt
// Sương makes its own HR app. Typed into the web app by a script: the Owner (its tech lead) on the web
// app, Phạm Thu Hà (and Lê Minh Tuấn) on the Viewer portal, against api.php on a fresh local database (php-server.js) and the
// stand-in Google Drive (standin-drive.js). Nothing reaches scopedue.com or Google. At the end the workspace is exported to
// SD_OUT (default: sample-vi-copy.json in the OS temp folder); tools/sample_from_copy.py turns it into the sample.
//
//   node tests/sample-vi.js            SD_UNTIL=<section letter> stops after that section (while working on the script)
//   SD_PLAYWRIGHT, SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_SCHEMA_DB as php-server.js; SD_PICS: the folder of the four screenshots
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const F = 'subdomains/app/index.html';
const UNTIL = process.env.SD_UNTIL || '';
const OUT = process.env.SD_OUT || path.join(os.tmpdir(), 'sample-vi-copy.json');
const PICS = process.env.SD_PICS || path.join(__dirname, 'sample-pics');
const OWNER = 'robert@appchamcong.test', HA = 'thu.ha@hatsuong.test', TUAN = 'minh.tuan@hatsuong.test';
const NAME = 'App chấm công HR';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, steps = 0;
const ok = (c, m, x) => { steps++; console.log((c ? 'ok   ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 500))); if (!c) fails++; return c; };
class Stop extends Error {}
const done = s => { console.log('---- ' + s + ' done'); if (UNTIL === s) throw new Stop(s); };

(async () => {
  const S = await require('./php-server')({ root: ROOT, port: 8131, db: 'sd_sample_vi', files: ['api.php', F, 'subdomains/app', 'viewer.html', 'viewer-assets', 'join-assets/join.css', 'join-assets/fonts'] });
  const DRIVE = require('./standin-drive')({ 'ya29.sample-owner': OWNER });
  const b = await PW.chromium.launch({ headless: process.env.SD_HEADED !== '1' });
  const errs = [];
  let A, p;
  try {
    const key = await S.account('Robert', OWNER);
    /* api.php lets an account send only 20 emails on its first day (mail_to). The story is weeks of a studio's work, typed in a few
       minutes: the test account is made a month old, so the Viewers' notices and codes are not cut off by a new account's cap */
    S.my([S.db, '-e', 'UPDATE api_studios SET created_at = created_at - 2592000000']);
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/^https:\/\/(www\.googleapis\.com|oauth2\.googleapis\.com)\//, DRIVE.route);
    await ctx.addInitScript(([api, k, em]) => { try { if (!sessionStorage.getItem('svi')) { sessionStorage.setItem('svi', '1'); localStorage.setItem('sd.lang', 'en'); localStorage.setItem('sd-first', 'empty'); localStorage.setItem('sd-focus', 'own'); localStorage.setItem('sd-sync', JSON.stringify({ url: api, key: k, email: em, via: 'email' })); } } catch (e) {} }, [S.api, key, OWNER]);
    p = await ctx.newPage(); p.on('pageerror', e => errs.push('app: ' + e.message));
    p.on('dialog', d => d.accept());
    await p.goto(S.base + F + '?test'); await sleep(1500);
    await p.evaluate(([t, e]) => window.__drv.token(t, e), ['ya29.sample-owner', OWNER]);
    /* the stand-in Google's token lives in the page: every load of it gets it again */
    p.on('load', () => { p.evaluate(([t, e]) => { const f = () => window.__drv ? window.__drv.token(t, e) : setTimeout(f, 100); f(); }, ['ya29.sample-owner', OWNER]).catch(() => {}); });
    A = { p, S };

    /* ------------------------------------------------------------ helpers: a person on the page */
    const go = async (sel, ms) => { await p.click(sel); await sleep(ms == null ? 350 : ms); };
    const text = sel => p.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
    const panel = () => text('#pd-panel');
    const drawer = () => p.$eval('.drawer.dr-live', e => e.id).catch(() => '');
    const dump = async (sel, why) => console.log('---- ' + (why || sel) + '\n' + await p.$eval(sel, e => e.outerHTML.replace(/\s+/g, ' ').slice(0, 4000)).catch(() => 'no ' + sel));
    const btn = async (within, label, ms) => { await p.locator(within + ' :is(button,a,[role="tab"])', { hasText: label }).filter({ visible: true }).first().click(); await sleep(ms == null ? 350 : ms); };
    /* a tab that appeared since the project was drawn (Feedback once there is a Viewer) is there after the page is opened again */
    const tab = async t => {
      const onProject = await p.evaluate(id => location.hash.indexOf('#pj-' + id + '-') === 0, PID);
      if (!onProject || !(await p.$('#pd-tab-' + t))) { await p.evaluate(([id, t]) => { location.hash = '#pj-' + id + '-' + t; }, [PID, t]); await p.reload(); await sleep(1800); }
      if (!(await p.$('#pd-tab-' + t))) {
        console.log('no tab ' + t + ' · tabs ' + JSON.stringify(await p.$$eval('[id^="pd-tab-"]', l => l.map(n => n.id))) + ' · url ' + p.url() + ' · team ' + JSON.stringify(((await out()).team || []).map(m => m.n + '/' + m.role)) + ' · toast ' + await text('#toast-msg'));
        await p.screenshot({ path: path.join(os.tmpdir(), 'sample-vi-notab.png') });
      }
      await go('#pd-tab-' + t, 800);
    };
    let PID = '';
    const out = async () => (await p.evaluate(id => window.__x8.out(id), PID)) || {};
    const edit = async (f, v) => {
      await go('#pd-panel [data-pd="edit"][data-f="' + f + '"]', 400);
      await p.fill('#pd-ed', v); await go('#pd-panel form[data-pd-form="edit"] [type="submit"]', 500);
    };

    // ============================================================ B. Tuần 1 · the project and its Overview
    await p.click('.nav-i[data-view="projects"]'); await sleep(300); await go('#npj-btn', 500);
    await p.fill('#npj-n', NAME); await go('#npj-kinds [data-k="internal"]', 200); await go('#npj-l [data-f="vi"]', 200);
    await go('#npj-go', 1200);
    PID = await p.evaluate(() => { const m = /#pj-(.+)-[a-z]+$/.exec(location.hash); return m ? m[1] : ''; });
    ok(!!PID, 'B1 the project: ' + PID);
    ok((await out()).mode === 'internal' && !(await p.$('#pd-tab-market')), 'B1 an Internal project: no Validate tab', (await out()).mode);
    await edit('thesis', 'Hạt Sương có 14 cửa hàng, 182 nhân viên; HR vẫn gửi phiếu lương, thông báo bằng Excel và Zalo. App nội bộ làm phần gửi, nhắc, tổng hợp.');
    await edit('focus', 'Tìm hiểu phòng Nhân sự mất bao nhiêu thời gian mỗi tháng cho việc gửi phiếu lương và nhắc người chưa phản hồi');
    await edit('next', 'Phỏng vấn chị Hà, 3 cửa hàng trưởng và khảo sát nhanh nhân viên trong 2 tuần tới');
    ok(/Excel và Zalo/.test(await panel()), 'B2-B4 thesis, focus, next step');
    for (const [t, u] of [['Blueprint HR App v1', 'https://drive.google.com/'], ['Bảng ghi phỏng vấn nội bộ', 'https://docs.google.com/'], ['Figma · App chấm công HR', 'https://www.figma.com/']]) {
      const add = p.locator('#pd-panel :is(button,a)', { hasText: /Add a link|Add link/ }).filter({ visible: true }).first();
      if (await add.count()) { await add.click(); await sleep(300); }
      const f = p.locator('#pd-panel form:has(input[type="url"]), #pd-panel form:has(input[placeholder^="https"])').filter({ visible: true }).first();
      await f.locator('input:not([type="url"]):not([placeholder^="https"])').first().fill(t);
      await f.locator('input[type="url"], input[placeholder^="https"]').first().fill(u);
      await f.locator('[type="submit"]').first().click(); await sleep(400);
    }
    ok(/Bảng ghi phỏng vấn nội bộ/.test(await panel()), 'B5 three working links');
    done('B');

    // ============================================================ C. Tuần 1–2 · Decisions: sources and open questions (an Internal project has no Validate)
    await tab('decisions');
    const source = async (t, u, x, i) => {
      await go('#pd-panel [data-pd="prv:srcadd"]', 500);
      await p.fill('#msrc-t', t); if (u) await p.fill('#msrc-u', u); await p.fill('#msrc-x', x); if (i) await p.fill('#msrc-i', i);
      await sleep(400); await go('#drawer-msrc [type="submit"]', 700);
      const left = await drawer(); if (left) { await dump('#drawer-msrc', 'source drawer still open'); await go('.drawer.dr-live [data-close]', 300); }
      return !left;
    };
    const SRC = [
      ['Phỏng vấn · chị Hà, Trưởng phòng Nhân sự', '', 'Cuối tháng chị ngồi tách bảng lương ra 182 file PDF, đặt mật khẩu là ngày sinh rồi gửi mail từng bạn. Mất gần trọn một ngày. Nhiều bạn ở cửa hàng không có email nên phải in ra gửi cửa hàng trưởng. Thông báo thì gửi vào nhóm Zalo, thả tim không có nghĩa là đã đọc.', 'Tốn công nhất là gửi, nhắc và hỏi lại, không phải tính lương. Số liệu đã có sẵn trong Excel.'],
      ['Phỏng vấn · 3 cửa hàng trưởng: Phan Xích Long, Lê Văn Sỹ, Trần Duy Hưng', '', 'Mỗi lần HR đổi lịch hay chính sách, cửa hàng trưởng nhắn lại từng bạn rồi báo HR ai đã đọc. Sổ chấm công giấy chụp gửi Zalo cuối ngày. Ca tối hay quên ra ca, sáng hôm sau mới sửa sổ.', 'Cửa hàng trưởng đang làm người đưa tin giữa HR và nhân viên. Xác nhận đã đọc và nhắc tự động bớt việc cho họ nhiều nhất.'],
      ['Khảo sát nhanh nhân viên · 121 trên 182 bạn trả lời', '', 'Gửi qua nhóm Zalo các cửa hàng. 109 bạn có smartphone riêng, 12 bạn dùng chung hoặc không có. 64 bạn không dùng email công ty. Hầu hết muốn xem phiếu lương trên điện thoại.', 'Không dựa vào email. Kích hoạt tài khoản phải qua số điện thoại; vài bạn cần cách vào ca không cần điện thoại riêng.'],
      ['Blueprint HR App v1 (nội bộ)', 'https://drive.google.com/', '30 việc thủ công của HR, chia P0/P1/P2. Bảy việc nên làm trước: nhắc người chưa phản hồi, thu đăng ký và tổng hợp theo phòng ban, phát phiếu lương từ file đã tính, thông báo có xác nhận, sửa thiếu công, thu tài liệu còn thiếu, đăng ký sự kiện.', 'Danh sách và mức ưu tiên là giả thuyết. Dùng để chọn câu hỏi khi phỏng vấn trong chuỗi.'],
      ['Bộ luật Lao động 2019, Điều 95', 'https://thuvienphapluat.vn/', 'Mỗi lần trả lương, người sử dụng lao động phải thông báo bảng kê trả lương cho người lao động, ghi rõ tiền lương, tiền làm thêm giờ, các khoản bị khấu trừ.', 'Gửi phiếu lương là nghĩa vụ hằng tháng của Hạt Sương, không phải việc làm thêm cho đẹp.'],
      ['Luật Bảo vệ dữ liệu cá nhân (hiệu lực 01/01/2026)', 'https://thuvienphapluat.vn/', 'Dữ liệu cá nhân của nhân viên, trong đó có thông tin lương và vị trí, phải được xử lý đúng mục đích đã thông báo và được bảo vệ.', 'Chỉ thu đúng dữ liệu cần dùng. Hỏi luật sư của công ty trước khi dùng dữ liệu lương thật.'],
      ['MISA AMIS HRM · Bảng giá', 'https://amis.misa.vn/bang-gia-bo-giai-phap-hrm/', 'Gói STANDARD 3.150.000 VNĐ/tháng; gói PROFESSIONAL 4.500.000 VNĐ/tháng. Phí thanh toán cả năm, gói 12 tháng/năm. Mua thêm từng gói 10 người dùng. Gồm AMIS Chấm công, Tiền lương, Thông tin nhân sự, Thuế TNCN, BHXH. Dùng thử miễn phí 15 ngày.', 'Mua HRM trọn gói là đổi cả quy trình nhân sự và kế toán đang dùng; Hạt Sương chỉ cần đỡ khâu gửi và nhắc.'],
      ['Tanca trên App Store', 'https://apps.apple.com/us/app/tanca/id1370259842', 'Time tracking, payroll, HR management. Chấm công bằng GPS, nhận diện khuôn mặt hoặc QR; xếp ca nhiều địa điểm; tính lương có thưởng, khấu trừ, làm thêm, BHXH; gửi và duyệt đơn nghỉ, công tác, tăng ca. Gói 10 nhân viên 11,99 USD/tháng.', 'Chấm công nhiều cửa hàng mua được. Mô tả không nhắc tới phiếu lương cho nhân viên hay xác nhận đã đọc thông báo.']];
    let nsrc = 0; for (const s of SRC) if (await source(...s)) nsrc++;
    ok(nsrc === SRC.length, 'C1 eight sources, on Decisions', nsrc);
    const qAdd = async t => { const Q = '#pd-panel form[data-pd-form="prv:asm"][data-k="q"]'; await p.fill(Q + ' input', t); await go(Q + ' [type="submit"]', 450); };
    const qDrop = async t => {
      const q = ((((await out()).pv || {}).asm || {}).q || []).find(x => x.t.indexOf(t) === 0);
      if (q) { await tab('decisions'); await go('#pd-panel [data-pd="prv:asmrm"][data-k="q"][data-id="' + q.id + '"]', 500); }
      return !!q && !((((await out()).pv || {}).asm || {}).q || []).some(x => x.id === q.id);
    };
    const Q = { mail: 'Nhân viên không dùng email thì kích hoạt tài khoản bằng cách nào?', acc: 'Có cần nối với phần mềm kế toán đang tính lương không?',
      fix: 'Ai được duyệt sửa công: cửa hàng trưởng hay phòng Nhân sự?', two: 'Bạn làm 2 cửa hàng trong một ngày thì bảng công ghi thế nào?' };
    for (const t of [Q.mail, Q.acc, Q.fix, Q.two]) await qAdd(t);
    ok((((await out()).pv.asm || {}).q || []).length === 4, 'C2 four open questions', ((await out()).pv.asm || {}).q);
    done('C');

    // ============================================================ D. Tuần 2 · the phase, by hand (an Internal project has no test to move it)
    const phase = async n => {
      await p.locator('[data-pdh="phase"]').filter({ visible: true }).first().click(); await sleep(300);
      await p.locator('[data-ph="' + n + '"]').filter({ visible: true }).first().click(); await sleep(600);
      return (await out()).phase;
    };
    ok(await phase(2) === 2, 'D1 phase: Bản nháp');
    await tab('workspace');
    await edit('focus', 'Chốt phạm vi v1: thông báo cần xác nhận, nhắc tự động và phát phiếu lương');
    await edit('next', 'Xin chị Hà 3 file Excel thật đã ẩn danh: danh sách nhân viên, bảng lương, bảng công');
    done('D');

    // ============================================================ E. Tuần 3 · principles and decisions
    await tab('decisions');
    for (const t of ['Excel-first: luôn có nhập, xem trước, kiểm lỗi và xuất lại Excel', 'Không tính lương, thuế, BHXH: chỉ phân phối số HR đã chốt', 'Mỗi nhân viên chỉ xem được phiếu lương của chính mình',
      'Phiếu đã phát không sửa ngầm: sai thì phát bản đính chính', 'Nhắc đúng người chưa làm, có giới hạn, không spam', 'GPS chỉ đọc lúc bấm vào ca, ra ca; không theo dõi nền', 'Không lưu ảnh hay mẫu khuôn mặt nhân viên trên server']) {
      await p.fill('#prv-pa', t); await go('#pd-panel form[data-pd-form="prv:princ"] [type="submit"]', 400);
    }
    ok(/mẫu khuôn mặt/.test(await panel()), 'E1 seven principles');
    A.decide = async (title, type, opts, pick, why, nots, srcs, revisit) => {
      await go('#pd-panel [data-pd="prv:dnew"]', 600);
      await p.fill('#ndec-t', title); await p.selectOption('#ndec-ty', type); await p.fill('#ndec-o', opts.join('\n'));
      await go('#ndec-go', 800);
      const R = '#pd-panel form[data-pd-form="prv:record"]';
      await p.check(R + ' input[name="c"][value="' + pick + '"]', { force: true });
      await p.fill('#prv-rb', why);
      for (const [i, t] of Object.entries(nots)) await p.fill('#prv-rn' + i, t).catch(() => {});
      for (const s of srcs || []) await p.check(R + ' input[name="ev"][value="' + s + '"]', { force: true }).catch(() => {});
      if (revisit) await p.fill('#prv-rv', revisit);
      await go(R + ' [type="submit"]', 700);
      return /Decided/.test(await panel());
    };
    ok(await A.decide('Tự làm hay mua phần mềm HRM', 'product', ['Tự làm app nội bộ, giữ Excel và phần mềm kế toán', 'Mua MISA AMIS HRM trọn gói', 'Mua Tanca cho chấm công, giữ Zalo cho thông báo'], 0,
      'Hạt Sương đã có Excel lương và phần mềm kế toán; chỉ thiếu khâu gửi, nhắc, xác nhận. Phòng Công nghệ có Minh làm PHP, làm được v1 trong 6 tuần.',
      { 1: 'Phải đổi cả quy trình nhân sự và trả phí cả năm cho phần chưa cần.', 2: 'Chấm công tốt, nhưng không có phiếu lương hay xác nhận đã đọc; lại thêm một app cho nhân viên.' }, [1, 7, 8], 'App nội bộ chưa chạy ổn sau 3 tháng'), 'E2a make it ourselves');
    ok(await A.decide('PWA hay app native cho nhân viên', 'tech', ['PWA trước', 'Flutter ngay', 'React Native ngay'], 0,
      'Nhân viên không phải cài app, làm nhanh; đủ cho xác nhận thông báo và xem phiếu lương.',
      { 1: 'Làm native quá sớm, chậm v1, tốn công duy trì hai nền tảng.', 2: 'Cũng là đầu tư native trước khi biết luồng nào dùng thật.' }, [3], 'Thông báo đẩy trên iPhone không tới được nhân viên'), 'E2b PWA');
    ok(await A.decide('Chấm công trong bản đầu?', 'product', ['Có, ngay trong v1', 'Sau thông báo và phiếu lương'], 1,
      'Blueprint đặt chấm công sau phần gửi, nhắc; v1 cần chạy ổn phần gửi, nhắc, phiếu lương trước.',
      { 0: 'Chấm công kéo theo GPS, ca qua đêm, sửa công; v1 sẽ chậm gấp đôi.' }, [4], 'Phòng Nhân sự nói chấm công là việc cần nhất'), 'E2c attendance later');
    ok(await A.decide('Mẫu phiếu lương', 'product', ['Theo đúng cột của file Excel', 'Vài mẫu cố định đã duyệt'], 0,
      'Bảng lương của Hạt Sương đổi cột mỗi khi có phụ cấp mới; ép về mẫu cố định là bắt HR sửa file mỗi kỳ.',
      { 1: 'Gọn hơn cho phòng Công nghệ nhưng trái nguyên tắc Excel-first.' }, [1], 'HR phải sửa mapping mỗi kỳ lương'), 'E2d payslip template');
    ok(await A.decide('Kích hoạt tài khoản cho nhân viên không có email', 'product', ['OTP qua SMS về số trong file nhân viên', 'Mã kích hoạt in ra, cửa hàng trưởng phát tay', 'Tin nhắn Zalo'], 0,
      'File nhân viên đã có số điện thoại; 64 bạn không dùng email công ty. Nhân viên tự kích hoạt, không qua cửa hàng trưởng.',
      { 1: 'Dễ thất lạc, cửa hàng trưởng có thể kích hoạt hộ.', 2: 'Cần tài khoản doanh nghiệp đã xác thực và mẫu tin được duyệt; để sau.' }, [3], 'Chi phí SMS vượt ngân sách hoặc tin bị chặn'), 'E2e activation');
    ok(await qDrop(Q.mail), 'E2e its open question answered, taken off');
    ok(await A.decide('Đưa v1 vào dùng', 'product', ['Cửa hàng Phan Xích Long trước, rồi cả chuỗi', 'Cả 14 cửa hàng cùng lúc'], 0,
      'Một cửa hàng 20 bạn đủ thấy lỗi trước kỳ lương; cửa hàng trưởng Phan Xích Long sẵn lòng thử.',
      { 1: 'Lỗi ở kỳ lương đầu sẽ tới 182 bạn cùng lúc.' }, [2], 'Cửa hàng thử gặp lỗi không sửa được trong một tuần'), 'E2f one store first');
    done('E');

    // ============================================================ F. Tuần 3–4 · the release v1 and its Scope
    const item = async t => ((await out()).pv.items || []).find(x => x.t === t);
    const princ = async t => (((await out()).pv.princ || []).find(x => x.t.indexOf(t) === 0) || {}).id;
    A.gate = async (t, why, job, ship, size, viol) => {
      if (t !== null) { await go('#pd-panel [data-pd="prv:gate"]', 600); await p.fill('#gate-t', t); }
      if (why) await p.fill('#gate-w', why).catch(() => {});
      if (job) await p.check('#gate input[name="job"][value="' + job + '"]', { force: true });
      await p.check('#gate input[name="ship"][value="' + ship + '"]', { force: true });
      await p.check('#gate input[name="size"][value="' + size + '"]', { force: true });
      if (await p.$('#gate input[name="viol"]')) await p.check('#gate input[name="viol"][value="' + (viol || 'none') + '"]', { force: true });
      await sleep(400);
      const said = (await text('#drawer-gate .dr-body')).slice(-260);
      if (await p.$eval('#gate-go', x => x.disabled)) { await go('#drawer-gate [data-close]', 300); return 'disabled: ' + said; }
      await go('#gate-go', 900);
      if (await drawer() === 'drawer-gate') { const h = await text('#drawer-gate'); await go('#drawer-gate [data-close]', 300); return 'still open: ' + h.slice(-300); }
      return said;
    };
    A.dod = async (t, lines) => {
      const x = await item(t); if (!x) return ok(false, 'no item ' + t);
      await go('#pd-panel [data-pd="wk:dod"][data-id="' + x.id + '"]', 400);
      await p.fill('#pd-panel form[data-pd-form="wk:dod"] textarea', lines.join('\n')); await go('#pd-panel form[data-pd-form="wk:dod"] [type="submit"]', 500);
    };
    await tab('scope');
    await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
    await p.fill('#prv-rn', 'v1 Pilot').catch(() => {});
    await p.fill('#prv-rs', 'Hạt Sương gửi thông báo cần xác nhận và phát phiếu lương cho 182 nhân viên; không ai xem được phiếu của người khác');
    await p.fill('#prv-rd', new Date(Date.now() + 42 * 864e5).toISOString().slice(0, 10)); await p.fill('#prv-rc2', '25');
    await go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
    ok(/182 nhân viên/.test(await panel()) && /v1 Pilot/.test(await panel()), 'F1 release v1 Pilot, six weeks, 25 days', (await panel()).slice(0, 300));
    const pGps = await princ('GPS chỉ đọc');
    const V1 = [
      ['Nhập nhân viên từ Excel: map cột, xem trước, báo lỗi', 'Không nhập được file thật thì không làm được gì khác.', '', 'need', 'M', '', /^Now|Bây giờ/],
      ['Gửi thông báo cần xác nhận đến đúng phòng ban, cửa hàng', 'Chị Hà gửi thông báo qua Zalo mỗi tuần mà không biết ai đã đọc.', '', 'need', 'M', '', /Now/],
      ['Nhắc tự động người chưa xác nhận, dừng ngay khi họ xong', '', '', 'need', 'S', '', /Now/],
      ['Phát phiếu lương từ file Excel: kiểm lỗi, duyệt rồi mới phát', '', '', 'need', 'L', '', /Now/],
      ['Nhân viên xem phiếu lương của mình và hỏi lại về kỳ lương', '', '', 'need', 'M', '', /Now/],
      ['Xuất Excel danh sách đã xác nhận và chưa xác nhận', '', '', 'need', 'S', '', /Now/],
      ['Biểu mẫu đăng ký sự kiện, khảo sát size đồng phục', '', '', 'weak', 'M', '', /Next/],
      ['Theo dõi vị trí nhân viên suốt ca làm', '', '', 'fine', 'M', pGps, /Never/]];
    for (const [t, why, j, sh, sz, vi, want] of V1) {
      const g = await A.gate(t, why, j, sh, sz, vi);
      const x = await item(t);
      ok(x && want.test({ in: 'Now', next: 'Next', out: 'Never' }[x.sec] || x.sec), 'F2 Gate: ' + t + ' → ' + (x ? x.sec : 'missing'), g);
    }
    ok(/18 (of|\/) 25/.test(await panel()), 'F2 Now holds 18 of 25 days', ((await panel()).match(/[^.]{0,30}25 days[^.]{0,20}/) || [''])[0]);
    for (const t of ['FAQ chính sách cho nhân viên #faq', 'QR điểm danh lớp đào tạo #sukien', 'Nhắc hợp đồng sắp hết hạn #hoso', 'Lấy giờ công từ máy chấm công vân tay cũ #chamcong', 'Bảng xếp hạng nhân viên chăm chỉ #gamification']) {
      await p.fill('#prv-qa', t); await go('#pd-panel form[data-pd-form="prv:padd"] [type="submit"]', 450);
    }
    ok(((await out()).pv.park || []).length === 5, 'F4 five ideas parked');
    const never = async (t, w) => {
      await go('#pd-panel [data-pd="prv:sadd"]', 500);
      await p.fill('#prv-t-new-out', t); await p.fill('#prv-w-new-out', w);
      await go('#pd-panel form[data-pd-form="prv:item"][data-sec="out"] [type="submit"]', 500);
    };
    await never('Tự tính lương, thuế TNCN, BHXH', 'Trái nguyên tắc: chỉ phân phối số HR đã chốt trong Excel.');
    await never('Thay phần mềm kế toán đang tính lương', 'App đi cạnh Excel và phần mềm kế toán đang dùng, không thay chúng.');
    await go('#pd-panel [data-pd="prv:gate"]', 600); await p.fill('#gate-t', 'tu tinh luong thue TNCN'); await sleep(500);
    ok(/Never|Không làm/.test(await text('#drawer-gate')), 'F7 the Gate sees it is in Never already', (await text('#drawer-gate')).slice(0, 200));
    await go('#drawer-gate [data-close]', 300);
    await go('#pd-panel [data-pd="prv:base"]', 700);
    ok(((await out()).pv.bls || []).length === 1, 'F8 the baseline');
    ok(await phase(3) === 3, 'F8 phase: Xây dựng');
    const parked = async (t, act) => { await p.locator('#pd-panel li', { hasText: t }).locator('[data-pd="' + act + '"]').first().click(); await sleep(600); };
    await parked('Bảng xếp hạng nhân viên', 'prv:idrp');
    await p.fill('#pd-panel form[data-pd-form="prv:drop"] [name="w"]', 'Xếp hạng nhân viên biến app thành công cụ giám sát; HR không cần.');
    await go('#pd-panel form[data-pd-form="prv:drop"] [type="submit"]', 600);
    ok(/công cụ giám sát/.test(await panel()), 'F9 an idea ruled out');
    done('F');

    // ============================================================ G. Tuần 4 · the team: Hà as a Viewer
    A.member = async (n, e, role) => {
      await p.click('.nav-i[data-view="settings"]'); await sleep(500);
      await btn('#view-settings', 'Team', 500).catch(() => {});
      await go('#tm-add', 600);
      await p.fill('#tm-name', n); await p.fill('#tm-email', e);
      if (role) await p.selectOption('#tm-role', role).catch(() => {});
      await go('#tm-go', 700);
    };
    A.invite = async (e, role) => {
      /* the first person comes in from the project's menu (Add teammate); after that, from Team (Add people) */
      if (((await out()).team || []).length) { await tab('team'); await go('#pd-panel [data-pd="invite"]', 700); }
      else {
        await p.evaluate(id => { location.hash = '#pj-' + id + '-workspace'; }, PID); await sleep(800);
        await go('#pd-more', 400); await go('[role="menu"] [data-m="invite"]', 700);
      }
      if (await p.isVisible('#inv-gate button').catch(() => false)) { await go('#inv-gate button', 1500); }
      if (!(await p.$('#inv-list input[value="' + e + '"]'))) { await dump('#drawer-invite', 'invite drawer'); if (await drawer()) await go('.drawer.dr-live [data-close]', 400); return false; }
      await p.check('#inv-list input[value="' + e + '"]', { force: true });
      await p.locator('#inv-list li', { has: p.locator('input[value="' + e + '"]') }).locator('select').selectOption(role).catch(() => {});
      await go('#inv-go', 1500);
      return ((await out()).team || []).some(m => m.e === e);
    };
    await A.member('Phạm Thu Hà', HA, 'Viewer');
    ok(await A.invite(HA, 'Viewer'), 'G2 Hà is on the project as a Viewer');
    await sleep(7000);
    console.log('tabs ' + JSON.stringify(await p.$$eval('[id^="pd-tab-"]', l => l.map(n => n.id))) + ' url ' + p.url(), 'team', JSON.stringify((await out()).team), 'toast', await text('#toast-msg'));
    await tab('feedback');
    if (await p.$('#pd-panel [data-pd="vp:open"]')) { await go('#pd-panel [data-pd="vp:open"]', 1500); }
    let m = S.mails().reverse().find(x => x.to === HA && /#k=sdm_/.test(x.body));
    if (!m && await p.$('#pd-panel [data-pd="vp:inv"][data-e="' + HA + '"]')) { await go('#pd-panel [data-pd="vp:inv"][data-e="' + HA + '"]', 1500); m = S.mails().reverse().find(x => x.to === HA && /#k=sdm_/.test(x.body)); }
    ok(!!m, 'G2 Hà gets her link by email', S.mails().map(x => x.to + ': ' + x.subject));
    A.portal = async (link, w) => {
      const c = await b.newContext({ viewport: w ? { width: 390, height: 844 } : { width: 1280, height: 900 }, locale: 'vi-VN' });
      await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      const V = await c.newPage(); V.on('pageerror', e => errs.push('portal: ' + e.message));
      for (let i = 0; i < 4; i++) { await V.goto(link, { waitUntil: 'commit' }).catch(() => {}); if (await V.waitForSelector('#vw-f', { timeout: 8000 }).then(() => true, () => false)) break; }
      await sleep(600); return V;
    };
    A.V = m ? await A.portal(m.body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/)[0]) : null;
    ok(A.V && /App chấm công HR/.test(await A.V.$eval('#vw-t', e => e.textContent).catch(() => '')), 'G2 Hà opens her portal');
    await tab('team');
    await A.dod('Nhập nhân viên từ Excel: map cột, xem trước, báo lỗi', ['Thử file có dòng tiêu đề ở dòng 3 và ô gộp', 'Mã 0012 vẫn là 0012 sau khi nhập', 'Hiện số dòng lỗi và dòng trùng', 'Chưa bấm xác nhận thì chưa ghi gì vào danh sách']);
    await A.dod('Phát phiếu lương từ file Excel: kiểm lỗi, duyệt rồi mới phát', ['Còn lỗi mã nhân viên thì không phát được', 'Chưa được duyệt thì không phát được', 'Thông báo đẩy không hiện số tiền', 'Nhân viên A mở link phiếu của B thì bị chặn']);
    await A.dod('Nhắc tự động người chưa xác nhận, dừng ngay khi họ xong', ['Chỉ nhắc người chưa xác nhận', 'Xác nhận xong thì không nhận nhắc nữa', 'Mỗi người tối đa một nhắc mỗi lần chạy']);
    ok(((await item('Nhập nhân viên từ Excel: map cột, xem trước, báo lỗi')) || {}).dod.length === 4, 'F3 done-when lines on three items');
    done('G');

    // ============================================================ helpers for the work and the portal
    const push = async () => { await p.evaluate(id => window.__vp.push(id), PID); await sleep(1300); };
    const pull = async () => { await p.evaluate(() => window.__vp.pull()); await sleep(1500); };
    const fbs = async () => (await out()).fb || [];
    const fbFind = async (k, t) => (await fbs()).find(e => e.k === k && (e.t || '').indexOf(t) === 0);
    const vreload = async V => { for (let i = 0; i < 4; i++) { await V.reload({ waitUntil: 'commit' }).catch(() => {}); if (await V.waitForSelector('#vw-f', { timeout: 8000 }).then(() => true, () => false)) break; } await sleep(700); };
    const pic = f => path.join(PICS, f);
    const status = async (t, v) => {
      const x = await item(t); if (!x) return ok(false, 'no item ' + t);
      await tab('team');
      const s = '#pd-panel select[data-wk="st"][data-id="' + x.id + '"]';
      if (!(await p.$(s))) { await btn('#pd-panel', 'Unassigned', 400).catch(() => {}); }
      await p.selectOption(s, v); await sleep(500);
    };
    const tick = async (t, n) => {
      const x = await item(t); await tab('team');
      /* the list is drawn again after each tick: a locator finds the box again each time (an element handle goes stale) */
      const L = p.locator('#pd-panel input[data-wk="dod"][data-id="' + x.id + '"]');
      for (let i = 0; i < n && i < await L.count(); i++) {
        for (let tries = 0; tries < 3; tries++) { try { if (!(await L.nth(i).isChecked())) await L.nth(i).check({ force: true }); break; } catch (e) { await sleep(400); } }
        await sleep(450);
      }
    };
    const fbOpen = async id => { await tab('feedback'); await p.click('.fb-r[data-id="' + id + '"]').catch(() => {}); await sleep(350); };
    const fbAct = async (id, act, words, extra) => {
      await fbOpen(id);
      await p.click('[data-pd="fb:' + act + '"][data-id="' + id + '"]'); await sleep(400);
      if (words != null) await p.fill('#fb-aw', words);
      if (extra) await extra();
      if (words != null || extra) { await p.click('.fb-ask button[type="submit"]'); await sleep(500); }
    };
    /* the Owner records what someone said (Record feedback) */
    const record = async (k, fr, t, ab, via, res) => {
      await tab('feedback');
      await go('#pd-panel [data-pd="fb:new"]', 400);
      await p.check('.fb-f input[name="fbk"][value="' + k + '"]', { force: true });
      for (const e of [].concat(fr)) await p.check('.fb-f input[name="fr"][value="' + e + '"]', { force: true }).catch(() => {});
      await p.fill('#fb-t', t);
      if (res) await p.check('.fb-f input[name="res"][value="' + res + '"]', { force: true }).catch(() => {});
      if (ab) await p.selectOption('#fb-ab', ab).catch(() => {});
      if (via) await p.selectOption('#fb-via', via).catch(() => {});
      await go('.fb-f button[type="submit"]', 600);
      return fbFind(k, t.slice(0, 30));
    };
    /* Hà (or Tuấn) sends something from the portal */
    const send = async (V, k, t, abLabel, pics, res) => {
      await V.check('#vw-f input[name="k"][value="' + k + '"]', { force: true }).catch(async () => V.$eval('#vw-f input[name="k"][value="' + k + '"]', i => i.closest('label').click()));
      await sleep(250);
      await V.fill('#vw-f textarea[name="t"]', t);
      if (res) await V.check('#vw-f input[name="res"][value="' + res + '"]', { force: true }).catch(() => {});
      if (abLabel) { const v = await V.$$eval('#vw-f select[name="ab"] option', (l, a) => (l.find(o => o.textContent.indexOf(a) > -1) || {}).value, abLabel); if (v) await V.selectOption('#vw-f select[name="ab"]', v); }
      if (pics) await V.setInputFiles('#vw-f input[name="pics"]', [].concat(pics).map(pic)), await sleep(800);
      await V.click('#vw-f button[type="submit"]'); await sleep(1500);
      await pull();
    };
    /* a Viewer answers on the portal: approve or not, with the code emailed to them */
    const answerCode = async (V, who, id, yes, words) => {
      await vreload(V);
      await V.click('[data-ap="' + (yes ? 'yes' : 'nope') + '"][data-on="' + id + '"]'); await sleep(300);
      /* the code is the one in the email that comes after this answer, not an older one */
      const codes = () => S.mails().filter(x => x.to === who && /\b\d{6}\b/.test(x.body));
      /* api.php gives one Viewer a code at most once every 30 seconds and six an hour (issue_code): each answer waits out the 30
         seconds first, and asks once */
      const since = Date.now() - (A.lastCode || 0); if (since < 31000) await sleep(31000 - since);
      const n0 = codes().length;
      await V.fill('.vw-ask textarea[name="t"]', words); await V.click('.vw-ask button[type="submit"]'); A.lastCode = Date.now(); await sleep(1500);
      if (!(await V.isVisible('.vw-code').catch(() => false))) { await pull(); return V.$eval('#vw-msg', e => e.textContent).catch(() => ''); }
      let c = null; for (let i = 0; i < 80 && !c; i++) { const l = codes(); if (l.length > n0) c = l[l.length - 1].body.match(/\b\d{6}\b/)[0]; else await sleep(300); }
      await V.fill('.vw-code', c || ''); await V.click('.vw-ask button[type="submit"]'); await sleep(1800);
      await pull();
      return V.$eval('#vw-msg', e => e.textContent).catch(() => '');
    };
    /* the Owner asks Viewers to check an item or the release */
    const askCheck = async (ab, steps, url, note) => {
      await tab('feedback');
      await go('#pd-panel [data-pd="fb:chk"]', 400);
      await p.selectOption('#fb-kab', ab); await sleep(200);
      if (steps) await p.fill('#fb-ks', steps.join('\n'));
      if (url) await p.fill('#fb-ku', url);
      if (note) await p.fill('#fb-kt', note);
      await go('.fb-chkf button[type="submit"]', 600);
      await push();
    };
    /* the Owner records a check of their own on a done item */
    const check = async (t, how, pass, saw) => {
      const x = await item(t); await tab('scope');   /* done work in Now is checked on Scope */
      await go('#pd-panel [data-pd="wk:cp"][data-id="' + x.id + '"]', 400);
      const Fm = '#pd-panel form[data-pd-form="wk:cp"]';
      await p.fill(Fm + ' [name="m"]', how);
      const rs = Fm + ' input[name="r"][value="' + (pass ? 'pass' : 'fail') + '"]';
      await p.locator(Fm + ' label.prv-opt', { has: p.locator(rs) }).click().catch(() => {}); await sleep(200);
      if (!(await p.isChecked(rs).catch(() => false))) await p.$eval(rs, el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
      if (!(await p.inputValue(Fm + ' [name="m"]').catch(() => ''))) await p.fill(Fm + ' [name="m"]', how);
      if (saw) await p.fill(Fm + ' [name="n"]', saw);
      await go(Fm + ' [type="submit"]', 600);
      return ((await item(t)).cp || []).length;
    };
    /* an idea in the Parking Lot goes through the Gate into Now */
    const promote = async (t0, t, job, ship, size, why) => {
      await tab('scope');
      await p.locator('#pd-panel li', { hasText: t0 }).locator('[data-pd="prv:gate"]').first().click(); await sleep(700);
      if (t) await p.fill('#gate-t', t);
      return A.gate(null, why, job, ship, size, 'none');
    };
    const ITEM = {
      imp: 'Nhập nhân viên từ Excel: map cột, xem trước, báo lỗi', ann: 'Gửi thông báo cần xác nhận đến đúng phòng ban, cửa hàng', rem: 'Nhắc tự động người chưa xác nhận, dừng ngay khi họ xong',
      pay: 'Phát phiếu lương từ file Excel: kiểm lỗi, duyệt rồi mới phát', see: 'Nhân viên xem phiếu lương của mình và hỏi lại về kỳ lương', xls: 'Xuất Excel danh sách đã xác nhận và chưa xác nhận',
      pk: 'Xác thực lại bằng vân tay, Face ID khi mở phiếu lương', urg: 'Thông báo khẩn: ghim đầu trang, nhắc lại sau 2 giờ' };
    const ab = async k => 'i:' + (await item(ITEM[k])).id;

    // ============================================================ H/I. Tuần 4–8 · building v1, and what Hà says
    const V = A.V;
    await status(ITEM.imp, 'doing'); await status(ITEM.ann, 'doing');
    ok(((await item(ITEM.imp)) || {}).st === 'doing', 'H1 two items being done');
    // I1–I3: Hà is asked to check the import; it fails at step 2, with a screenshot; the Owner opens a bug from it
    await askCheck(await ab('imp'), ['Mở Nhập nhân viên, chọn file danh sách của phòng', 'Chọn sheet "DS NV T11", dòng tiêu đề ở dòng 3', 'Kiểm tra mã 0012 vẫn là 0012', 'Xem số dòng lỗi và dòng trùng'], 'https://staging.example.com/nhap-nhan-vien', 'Chị dùng file thật của phòng, đã xoá cột lương và số tài khoản giúp em.');
    await vreload(V);
    ok(/DS NV T11/.test(await V.$eval('#vw-main', e => e.innerText).catch(() => '')), 'I1 Hà sees the request to check, with its steps');
    await V.click('.vw-turn [data-ck="fail"]').catch(async () => V.click('[data-ck="fail"]')); await sleep(300);
    await V.fill('.vw-ask textarea', 'Bước 2: file có ô gộp ở dòng tiêu đề thì báo lỗi dòng 1, không chỉ ra ô nào.');
    if (await V.$('.vw-ask input[type="file"]')) { await V.setInputFiles('.vw-ask input[type="file"]', pic('import-dong-1.png')); await sleep(800); }
    await V.click('.vw-ask button[type="submit"]'); await sleep(1800);
    await pull();
    const t1 = (await fbs()).find(e => e.k === 'test' && /ô gộp/.test(e.t || ''));
    ok(t1 && t1.res === 'fail', 'I2 Hà: it does not work, with a screenshot', t1 && { res: t1.res, pics: (t1.pics || []).length });
    if (t1) { await fbOpen(t1.id); await p.click('[data-pd="fb:tobug"][data-id="' + t1.id + '"]').catch(() => {}); await sleep(600); }
    ok((await fbs()).some(e => e.k === 'bug' && /ô gộp/.test(e.t || '')), 'I3 a bug opened from her test');
    // I4: her request for a second check before a payslip opens; the passkey decision; through the Gate into Now (drift)
    await send(V, 'req', 'Nhiều bạn để điện thoại ở quầy pha chế. Mở phiếu lương phải xác thực lại, không thì ai cầm máy cũng xem được.');
    const rq1 = await fbFind('req', 'Nhiều bạn để điện thoại');
    ok(!!rq1, 'I4 Hà’s request reaches the app');
    if (rq1) { await fbOpen(rq1.id); await p.click('[data-pd="fb:park"][data-id="' + rq1.id + '"]'); await sleep(600); }
    await tab('decisions');
    await source('WebAuthn / passkey (W3C)', 'https://www.w3.org/TR/webauthn-2/', 'Mở khoá bằng Face ID hoặc vân tay ngay trên điện thoại; server chỉ nhận chữ ký, không nhận ảnh khuôn mặt hay vân tay.', 'Xác thực lại trước khi mở phiếu lương được mà không phải lưu dữ liệu sinh trắc học.');
    await tab('decisions');
    ok(await A.decide('Cách xác thực lại khi mở phiếu lương', 'tech', ['Passkey: vân tay, Face ID của điện thoại', 'Nhận diện khuôn mặt trên server', 'Nhập lại mã PIN 6 số'], 0,
      'Thiết bị tự xác thực, server không giữ dữ liệu sinh trắc học.', { 1: 'Phải lưu mẫu khuôn mặt, trái nguyên tắc.', 2: 'Dễ lộ khi nhập ở quầy đông người; giữ làm cách dự phòng.' }, [9], ''), 'I4 the passkey decision');
    let g = await promote('Nhiều bạn để điện thoại', ITEM.pk, '', 'need', 'M', 'Chị Hà: nhân viên để điện thoại ở quầy, ai cầm máy cũng mở được phiếu.');
    ok(((await item(ITEM.pk)) || {}).sec === 'in', 'I4 the passkey item in Now, after the baseline', g);
    // I5: the bug with a screenshot; a comment for her; fixed; still not; fixed; it works
    await send(V, 'bug', 'Cột MSNV định dạng số nên 0012 thành 12, 37 bạn báo "mã không tồn tại".', 'Nhập nhân viên', 'excel-msnv.png');
    const bg = await fbFind('bug', 'Cột MSNV');
    ok(bg && (bg.pics || []).length === 1, 'I5 Hà’s bug with a screenshot', bg && { pics: (bg.pics || []).length, ab: bg.ab });
    if (bg) {
      await fbOpen(bg.id); await p.click('[data-pd="fb:cm"][data-id="' + bg.id + '"]').catch(() => {}); await sleep(300);
      if (await p.$('#fb-aw')) { await p.fill('#fb-aw', 'Chị gửi file gốc qua Zalo rồi, đã xoá cột lương và số tài khoản.'); await p.selectOption('#fb-cv', 'chat').catch(() => {}); await go('.fb-ask button[type="submit"]', 500); }
      await fbAct(bg.id, 'fixed'); await push(); await vreload(V);
      await V.click('.vw-turn [data-nf="' + bg.id + '"]').catch(() => {}); await sleep(300);
      await V.fill('.vw-ask textarea', 'Mã 00012 năm số vẫn mất số 0 ở đầu.').catch(() => {}); await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1500);
      await pull(); await fbAct(bg.id, 'fixed'); await push(); await vreload(V);
      await V.click('.vw-turn [data-cf="' + bg.id + '"]').catch(() => {}); await sleep(300);
      await V.fill('.vw-ask textarea', 'Đã chạy được, 00012 giữ nguyên.').catch(() => {}); await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1500);
      await pull();
      const b2 = (await fbs()).find(e => e.id === bg.id);
      ok(b2 && b2.cf, 'I5 fixed, still not, fixed again, then it works', b2 && { st: b2.st, cf: !!b2.cf });
    }
    // I6: the payslip template, approved on the portal with a code
    const ap1 = await record('appr', HA, 'Duyệt mẫu phiếu lương: lương cơ bản, phụ cấp, làm thêm giờ, khấu trừ BHXH, thuế TNCN, thực nhận.', await ab('pay'), 'email');
    await push();
    const m6 = ap1 ? await answerCode(V, HA, ap1.id, true, 'Thêm dòng "Số ngày công" giúp chị, nhân viên hay hỏi nhất.') : '';
    ok(/recorded|ghi nhận|đã duyệt/i.test(m6) || ((await fbs()).find(e => ap1 && e.id === ap1.id) || {}).st === 'ok', 'I6 Hà approves the payslip template with her code', m6);
    // I7: the storm: an urgent notice, through the Gate (drift)
    await send(V, 'req', 'Hôm có bão, chuỗi phải báo gấp cho ca chiều nghỉ. Cần thông báo khẩn ghim đầu trang và nhắc lại sau 2 giờ nếu chưa xác nhận.');
    const rq2 = await fbFind('req', 'Hôm có bão');
    if (rq2) { await fbOpen(rq2.id); await p.click('[data-pd="fb:park"][data-id="' + rq2.id + '"]'); await sleep(600); }
    g = await promote('Hôm có bão', ITEM.urg, '', 'need', 'S', 'Hôm bão vừa rồi chị Hà gọi điện cho 14 cửa hàng trưởng.');
    ok(((await item(ITEM.urg)) || {}).sec === 'in', 'I7 the urgent notice in Now (drift)', g);
    // I8, I9: what she said on the phone and in a meeting, recorded by the Owner
    const rq3 = await record('req', HA, 'Cho app tự tính thuế TNCN luôn, đỡ phải làm trong Excel.', '', 'phone');
    if (rq3) await fbAct(rq3.id, 'no', 'Đã có trong Không làm: app chỉ gửi số chị đã chốt. Thuế vẫn tính ở Excel hoặc phần mềm kế toán.');
    const bg3 = await record('bug', HA, 'Nhân viên đã nghỉ việc vẫn nằm trong danh sách nhắc.', await ab('rem'), 'meeting');
    if (bg3) await fbAct(bg3.id, 'nb', 'Trong file chị gửi, 3 bạn này vẫn ghi "Đang làm". Sửa trạng thái trong file rồi nhập lại là hết.');
    ok(((await fbs()).find(e => rq3 && e.id === rq3.id) || {}).st === 'no' && ((await fbs()).find(e => bg3 && e.id === bg3.id) || {}).st === 'notbug', 'I8 I9 a request declined, a bug that is not one');
    // I10: the activation SMS, not approved
    const ap2 = await record('appr', HA, 'Duyệt tin SMS kích hoạt: "Ma kich hoat App cham cong HR cua ban la 123456".', 'r:cur', 'email');
    await push();
    const m10 = ap2 ? await answerCode(V, HA, ap2.id, false, 'Tin cần có tên Hạt Sương ở đầu, không thì các bạn tưởng tin lừa đảo.') : '';
    ok(((await fbs()).find(e => ap2 && e.id === ap2.id) || {}).st === 'nope' || /recorded|ghi nhận/i.test(m10), 'I10 Hà does not approve the SMS', m10);
    done('I1');

    // H4–H8: the work goes on
    await status(ITEM.imp, 'done'); await status(ITEM.ann, 'done'); await status(ITEM.rem, 'doing'); await status(ITEM.rem, 'done');
    await tab('workspace'); await edit('focus', ITEM.pay); await edit('next', 'Chạy thử phát phiếu kỳ này với file đã ẩn danh của chị Hà, chưa gửi cho nhân viên');
    await status(ITEM.pay, 'doing'); await status(ITEM.pay, 'done'); await status(ITEM.see, 'doing'); await status(ITEM.see, 'done');
    await status(ITEM.pk, 'doing'); await status(ITEM.pk, 'done'); await status(ITEM.urg, 'doing'); await status(ITEM.urg, 'done'); await status(ITEM.xls, 'doing');
    await tick(ITEM.imp, 4); await tick(ITEM.pay, 4); await tick(ITEM.rem, 2);
    ok(((await item(ITEM.pay)) || {}).st === 'done' && ((await item(ITEM.xls)) || {}).st === 'doing', 'H4-H8 all but the Excel export done');
    // I11: her own test result; I12: she asks for attendance
    await send(V, 'test', 'Nhận nhắc lúc 9h sáng hôm trước hạn; xác nhận xong thì không nhận nhắc nữa.', 'Nhắc tự động', null, 'pass');
    ok((await fbs()).some(e => e.k === 'test' && /9h sáng/.test(e.t || '')), 'I11 her test result: it works');
    await send(V, 'req', 'Cho nhân viên chấm công trên app luôn. 6 cửa hàng của chị vẫn dùng sổ giấy, cuối tháng chị gõ lại.');
    const rq4 = await fbFind('req', 'Cho nhân viên chấm công');
    if (rq4) { await fbOpen(rq4.id); await p.click('[data-pd="fb:park"][data-id="' + rq4.id + '"]'); await sleep(600); }
    ok(((await out()).pv.park || []).some(x => /chấm công trên app/.test(x.t)), 'I12 attendance waits in the Parking Lot');
    // I13: Tuấn joins as a second Viewer, wants it too, and says why
    await A.member('Lê Minh Tuấn', TUAN, 'Viewer');
    ok(await A.invite(TUAN, 'Viewer'), 'I13 Tuấn on the project as a Viewer');
    await sleep(7000); await tab('feedback');
    let mt = S.mails().reverse().find(x => x.to === TUAN && /#k=sdm_/.test(x.body));
    if (!mt && await p.$('#pd-panel [data-pd="vp:inv"][data-e="' + TUAN + '"]')) { await go('#pd-panel [data-pd="vp:inv"][data-e="' + TUAN + '"]', 1500); mt = S.mails().reverse().find(x => x.to === TUAN && /#k=sdm_/.test(x.body)); }
    A.T = mt ? await A.portal(mt.body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/)[0], true) : null;
    if (A.T && rq4) {
      await A.T.click('[data-vote="' + rq4.id + '"]').catch(() => {}); await sleep(1200);
      const cm = A.T.locator('.vw-card, li', { hasText: 'Cho nhân viên chấm công' }).locator(':is(button,a)', { hasText: /Bình luận|Comment|Viết/ }).first();
      if (await cm.count()) { await cm.click(); await sleep(300); await A.T.fill('.vw-ask textarea', 'Ở TP.HCM ca tối hay quên ra ca, sáng hôm sau cửa hàng trưởng mới sửa sổ.'); await A.T.click('.vw-ask button[type="submit"]'); await sleep(1500); }
      await pull();
    }
    ok(!!A.T, 'I13 Tuấn opens his portal');
    // I14: the whole release, checked
    await askCheck('r:cur', null, 'https://staging.example.com', 'Chị thử với vài bạn ở một cửa hàng giúp em.');
    await vreload(V);
    await V.click('.vw-turn [data-ck="pass"]').catch(async () => V.click('[data-ck="pass"]').catch(() => {})); await sleep(300);
    await V.fill('.vw-ask textarea', 'Chị thử với 20 bạn ở cửa hàng Phan Xích Long, mọi người tự mở được phiếu.').catch(() => {});
    await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1600); await pull();
    ok((await fbs()).some(e => e.k === 'test' && /Phan Xích Long/.test(e.t || '')), 'I14 the release checked: it works');
    done('I');

    // ============================================================ J. Tuần 8 · checks before the release
    ok(await phase(4) === 4, 'J phase: Rà soát');
    ok(await check(ITEM.imp, 'Nhập file 182 dòng của Hạt Sương; mã 0012 và 00012 giữ nguyên', true) > 0, 'J1');
    ok(await check(ITEM.pay, 'Phát thử cho 20 bạn; dùng link phiếu của người khác thì bị chặn', true) > 0, 'J2');
    ok(await check(ITEM.rem, 'Nhắc lúc 9:00 cho người vừa xác nhận', false, 'Người vừa xác nhận lúc 8:59 vẫn nhận nhắc lúc 9:00.') > 0, 'J3 a check that fails');
    await tick(ITEM.rem, 3);
    ok(await check(ITEM.rem, 'Xác nhận sát giờ nhắc, chạy 50 lần; không ai bị nhắc sau khi đã xác nhận', true) > 1, 'J4 checked again');
    ok(await check(ITEM.pk, 'Thử trên Android và iPhone của nhân viên; không xác thực thì không mở được phiếu', true) > 0, 'J5');
    done('J');

    // ============================================================ K. Tuần 9 · ship v1
    await tab('scope');
    await go('#pd-panel [data-pd="prv:ship"]', 600);
    const SH = '#pd-panel form[data-pd-form="prv:ship"]';
    await p.check(SH + ' input[name="met"][value="mostly"]', { force: true });
    await p.fill('#prv-sm', 'Thông báo cần xác nhận, nhắc tự động và phiếu lương đã chạy ở 14 cửa hàng. Xuất Excel chuyển sang v2.');
    await p.fill('#prv-sn', 'v2').catch(() => {});
    await go(SH + ' [type="submit"]', 900);
    const sh = (await out()).pv.ships || [];
    ok(sh.length === 1 && ((await item(ITEM.xls)) || {}).sec === 'next', 'K1 v1 Pilot shipped, mostly; the Excel export waits in Next', sh.map(s => [s.name, s.met]));
    ok(await phase(5) === 5, 'K1 phase: Đang dùng');
    await tab('workspace');
    await edit('focus', 'Theo dõi kỳ lương đầu tiên phòng Nhân sự tự phát, ghi lại mọi chỗ HR phải hỏi phòng Công nghệ');
    await edit('next', 'Ngồi cạnh chị Hà trong buổi phát phiếu lương đầu tiên, bấm giờ từng bước');
    done('K');

    // ============================================================ L. Tuần 9–12 · after v1
    await send(V, 'bug', 'Cửa hàng Lê Văn Sỹ: hai bạn dùng chung một điện thoại, xác nhận thông báo bị ghi cho người đăng nhập trước.', 'v1', 'dien-thoai-chung.png');
    ok(!!(await fbFind('bug', 'Cửa hàng Lê Văn Sỹ')), 'L1 Hà reports a problem in the release, with a screenshot');
    await tab('decisions');
    ok(await source('Kỳ lương đầu tiên trên app · đo cùng chị Hà', '', 'Phiếu lương kỳ đầu: 182 phiếu trong 1 giờ 40 phút, không phiếu nào sai người. Thông báo lịch nghỉ lễ: 176 trên 182 bạn xác nhận sau 2 lần nhắc. Thông báo đổi giờ mở cửa: chị Hà tự làm từ đầu đến cuối.', 'Phần gửi, nhắc, phiếu lương chạy được mà không cần phòng Công nghệ đỡ. Làm tiếp chấm công được.'), 'L2 the first pay run, as a source [10]');
    A.replace = async (title, opts, pick, why, nots, srcs, revisit) => {
      await tab('decisions');
      const d = ((await out()).pv.dec || []).find(x => x.t === title && x.st === 'decided');
      await go('#pd-panel [data-pd="prv:dsel"][data-id="' + d.id + '"]', 400);
      await go('#pd-panel [data-pd="prv:drep"][data-id="' + d.id + '"]', 600);
      await p.fill('#ndec-t', title); await p.fill('#ndec-o', opts.join('\n'));
      await go('#ndec-go', 800);
      const R = '#pd-panel form[data-pd-form="prv:record"]';
      await p.check(R + ' input[name="c"][value="' + pick + '"]', { force: true });
      await p.fill('#prv-rb', why);
      for (const [i, t] of Object.entries(nots || {})) await p.fill('#prv-rn' + i, t).catch(() => {});
      for (const s of srcs || []) await p.check(R + ' input[name="ev"][value="' + s + '"]', { force: true }).catch(() => {});
      if (revisit) await p.fill('#prv-rv', revisit);
      await go(R + ' [type="submit"]', 700);
      const all = (await out()).pv.dec || [];
      return all.some(x => x.id === d.id && x.st === 'superseded');
    };
    ok(await A.replace('Chấm công trong bản đầu?', ['Có, ngay v2: chỉ vào ca, ra ca và bảng công', 'Để sau biểu mẫu và khảo sát'], 0,
      'Chị Hà và anh Tuấn: 6 trên 14 cửa hàng vẫn chấm công bằng sổ giấy; HR gõ lại mỗi cuối tháng.', { 1: 'Biểu mẫu chờ được; chấm công là việc hằng ngày.' }, [1, 2, 10], 'Hạt Sương chọn mua app chấm công riêng'), 'L4 the attendance decision replaced');
    await tab('scope');
    await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
    await p.fill('#prv-rs', 'Nhân viên 6 cửa hàng còn dùng sổ giấy vào ca, ra ca trên app; HR xuất bảng công tháng ra Excel không gõ lại');
    await p.fill('#prv-rd', new Date(Date.now() + 42 * 864e5).toISOString().slice(0, 10)); await p.fill('#prv-rc2', '25');
    await go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
    ok(/sổ giấy vào ca/.test(((await out()).pv.rel || {}).ship || ''), 'L5 release v2 planned');
    await tab('workspace');
    await edit('thesis', 'Hạt Sương vẫn gửi phiếu lương, thông báo, chấm công bằng Excel, Zalo, sổ giấy. App nội bộ làm phần gửi, nhắc, tổng hợp; HR giữ Excel.');
    await edit('focus', 'Chấm công vào ca, ra ca cho 6 cửa hàng còn dùng sổ giấy');
    await edit('next', 'Đo thời gian chị Hà làm bảng công tay ở cửa hàng Lê Văn Sỹ trong một tuần');
    ok(((await out()).pv.th || []).length === 2, 'L6 L7 the thesis said again; focus and next step');
    done('L');

    // ============================================================ M. Tuần 12 · decisions for attendance
    await tab('decisions');
    ok(await A.decide('Chống chấm công hộ', 'tech', ['Passkey trên điện thoại riêng của nhân viên', 'Chụp ảnh selfie lúc vào ca', 'Nhận diện khuôn mặt trên server'], 0,
      'Nhân viên đã quen passkey khi mở phiếu lương. Thiết bị tự xác thực, server không giữ ảnh hay mẫu khuôn mặt.',
      { 1: 'Phải lưu ảnh nhân viên mỗi ngày; nhiều bạn ngại, và trái nguyên tắc không lưu ảnh khuôn mặt.', 2: 'Trái nguyên tắc không lưu mẫu khuôn mặt trên server.' }, [9], 'Cửa hàng trưởng báo vẫn có người chấm công hộ'), 'M1');
    ok(await A.decide('Bán kính chấm công', 'tech', ['Theo từng cửa hàng, mặc định 100 m', 'Một bán kính chung 300 m cho cả chuỗi', 'Wi-Fi cửa hàng thay cho GPS'], 0,
      'Cửa hàng trong hẻm và cửa hàng trong trung tâm thương mại khác nhau nhiều; 300 m thì đứng quán bên cạnh cũng chấm được.',
      { 1: 'Quá rộng ở phố đông, hai cửa hàng gần nhau sẽ lẫn.', 2: 'Router mỗi cửa hàng một kiểu, đổi nhà mạng là hỏng; để làm cách dự phòng.' }, [2, 4], 'Hơn 5% lượt vào ca bị báo ngoài vùng'), 'M2');
    ok(await A.decide('Nhân viên không có điện thoại riêng', 'product', ['Máy tính bảng chung ở quầy, mỗi người một mã PIN', 'Cửa hàng trưởng chấm hộ, ghi lý do'], 0,
      'Khảo sát: 12 bạn dùng chung hoặc không có smartphone. Mã PIN riêng vẫn biết ai vào ca; cửa hàng trưởng không phải chấm hộ.',
      { 1: 'Thành sổ giấy trên app; không biết giờ thật.' }, [3], 'Có người dùng mã PIN của người khác'), 'M3');
    done('M');

    // ============================================================ N. Tuần 12–13 · the Scope of v2
    await tab('scope');
    for (const [t, why, j, sh, sz] of [['Khai báo cửa hàng: toạ độ, bán kính, giờ mở cửa', '', '', 'need', 'S']]) await A.gate(t, why, j, sh, sz);
    let gv = await promote('Cho nhân viên chấm công', 'Vào ca, ra ca có GPS và bảng công cho nhân viên', '', 'need', 'L', '6 trên 14 cửa hàng vẫn chấm công bằng sổ giấy; chị Hà gõ lại mỗi cuối tháng.');
    for (const [t, why, j, sh, sz] of [['Gửi yêu cầu sửa công, cửa hàng trưởng duyệt', '', '', 'need', 'M'], ['Xuất bảng công tháng ra Excel theo mã nhân viên', '', '', 'need', 'M'],
      ['Máy tính bảng chung ở quầy, vào ca bằng mã PIN', '', '', 'need', 'M'], ['Nhập lịch ca từ Excel, báo ca mới cho đúng người', '', '', 'weak', 'M']]) await A.gate(t, why, j, sh, sz);
    const xl = await item(ITEM.xls);
    if (xl) { await go('#pd-panel [data-pd="prv:pull"][data-id="' + xl.id + '"]', 700); await A.gate(null, '', '', 'need', 'S'); }
    const now2 = ((await out()).pv.items || []).filter(x => x.sec === 'in').map(x => x.t);
    ok(now2.length === 6 && now2.includes(ITEM.xls), 'N1 six items in Now for v2', now2);
    await never('Chấm công bằng nhận diện khuôn mặt', 'Trái nguyên tắc: không lưu ảnh hay mẫu khuôn mặt nhân viên trên server.');
    for (const t of ['Đổi ca giữa hai nhân viên, cửa hàng trưởng duyệt #ca', 'Báo cửa hàng trưởng khi có người quên ra ca #chamcong']) { await p.fill('#prv-qa', t); await go('#pd-panel form[data-pd-form="prv:padd"] [type="submit"]', 450); }
    await go('#pd-panel [data-pd="prv:base"]', 700);
    ok(((await out()).pv.bls || []).length === 2, 'N5 the baseline of v2');
    ok(await qDrop(Q.fix), 'N1 the open question on who approves a fix, answered by the Scope');
    await tab('team');
    await A.dod('Vào ca, ra ca có GPS và bảng công cho nhân viên', ['Chỉ đọc vị trí lúc bấm, không đọc khi app chạy nền', 'Xin quyền vị trí "Khi dùng app", không xin "Luôn luôn"', 'Ngoài bán kính thì báo rõ khoảng cách', 'Mất mạng thì ghi "Chưa được xác nhận", không báo thành công', 'Bấm hai lần chỉ ghi một lần vào ca']);
    await A.dod('Gửi yêu cầu sửa công, cửa hàng trưởng duyệt', ['Nhân viên chọn ngày, giờ, lý do', 'Chỉ cửa hàng trưởng của cửa hàng đó duyệt được', 'Giờ gốc vẫn giữ, bản sửa ghi ai duyệt']);
    await A.dod('Xuất bảng công tháng ra Excel theo mã nhân viên', ['Mã nhân viên giữ số 0 ở đầu', 'Có cột giờ vào, giờ ra, số giờ, ghi chú sửa công', 'Mở bằng Excel không lỗi tiếng Việt']);
    await A.dod('Máy tính bảng chung ở quầy, vào ca bằng mã PIN', ['Mỗi người một mã PIN 6 số', 'Sai PIN 5 lần thì khoá, cửa hàng trưởng mở lại', 'Không lưu ảnh người vào ca']);
    await tab('workspace');
    await edit('focus', 'Vào ca, ra ca có GPS và bảng công cho nhân viên');
    await edit('next', 'Cùng anh Tuấn thử vào ca ở 3 kiểu cửa hàng TP.HCM: trong hẻm, mặt phố, trong trung tâm thương mại');
    done('N');

    // ============================================================ O. Tuần 13–16 · building v2, and what Hà says
    const T2 = { st: 'Khai báo cửa hàng: toạ độ, bán kính, giờ mở cửa', io: 'Vào ca, ra ca có GPS và bảng công cho nhân viên', fx: 'Gửi yêu cầu sửa công, cửa hàng trưởng duyệt',
      ex: 'Xuất bảng công tháng ra Excel theo mã nhân viên', tb: 'Máy tính bảng chung ở quầy, vào ca bằng mã PIN', gps: 'GPS yếu: vào ca kèm lý do, cửa hàng trưởng duyệt', ng: 'Ca qua đêm: ra ca sau 0 giờ vẫn tính vào ca hôm trước' };
    await status(T2.st, 'doing'); await status(T2.st, 'done'); await status(T2.io, 'doing');
    await askCheck('i:' + (await item(T2.io)).id, ['Đứng trong cửa hàng, mở app, bấm Vào ca', 'Cho phép vị trí "Khi dùng app"', 'Thấy "Đã vào ca lúc …" sau khi máy chủ nhận', 'Khoá máy, làm việc 1 giờ, rồi bấm Ra ca'], 'https://staging.example.com/cham-cong', 'Chị thử giúp em ở cả cửa hàng Trần Duy Hưng, chỗ trong trung tâm thương mại.');
    await vreload(V);
    await V.click('.vw-turn [data-ck="fail"]').catch(async () => V.click('[data-ck="fail"]').catch(() => {})); await sleep(300);
    await V.fill('.vw-ask textarea', 'Cửa hàng Trần Duy Hưng nằm ở tầng hầm trung tâm thương mại: GPS lệch hơn 200 m, 11 trên 12 bạn bị báo "ngoài vùng chấm công".').catch(() => {});
    if (await V.$('.vw-ask input[type="file"]')) { await V.setInputFiles('.vw-ask input[type="file"]', pic('gps-tang-ham.png')); await sleep(800); }
    await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1800); await pull();
    const t3 = (await fbs()).find(e => e.k === 'test' && /tầng hầm/.test(e.t || ''));
    if (t3) { await fbOpen(t3.id); await p.click('[data-pd="fb:tobug"][data-id="' + t3.id + '"]').catch(() => {}); await sleep(600); }
    const bgps = (await fbs()).find(e => e.k === 'bug' && /tầng hầm/.test(e.t || ''));
    ok(t3 && t3.res === 'fail' && bgps, 'O3 Hà: out of the zone in the basement store; a bug from it');
    ok(await A.replace('Bán kính chấm công', ['Theo từng cửa hàng; GPS yếu thì gửi kèm lý do, cửa hàng trưởng duyệt', 'Mở rộng bán kính cho cửa hàng trong trung tâm thương mại'], 0,
      'Cửa hàng tầng hầm không bao giờ có GPS chuẩn. Không được bắt nhân viên chạy ra cửa mới chấm công được.', { 1: 'Rộng ra thì đứng ngoài trung tâm cũng chấm được.' }, [1], ''), 'O4 the radius decision replaced');
    await tab('scope'); await A.gate(T2.gps, 'Bảy cửa hàng của Hạt Sương nằm trong trung tâm thương mại.', '', 'need', 'S');
    await status(T2.io, 'done');
    await send(V, 'bug', 'Ca đóng cửa 22:00–01:00: ra ca sau 0 giờ bị tính sang ngày mới, bảng công thành hai ca lẻ.', 'Vào ca, ra ca');
    const bng = await fbFind('bug', 'Ca đóng cửa');
    await tab('scope'); await A.gate(T2.ng, '5 cửa hàng của Hạt Sương mở đến 1 giờ sáng cuối tuần.', '', 'need', 'M');
    ok(((await item(T2.gps)) || {}).sec === 'in' && ((await item(T2.ng)) || {}).sec === 'in', 'O4 O6 two items added after the baseline of v2');
    await status(T2.gps, 'doing'); await status(T2.gps, 'done'); await status(T2.ng, 'doing'); await status(T2.ng, 'done');
    for (const bb of [bgps, bng].filter(Boolean)) await fbAct(bb.id, 'fixed');
    await push(); await vreload(V);
    for (const bb of [bgps, bng].filter(Boolean)) {
      await V.click('.vw-turn [data-cf="' + bb.id + '"]').catch(() => {}); await sleep(300);
      await V.fill('.vw-ask textarea', bb === bgps ? 'Cửa hàng Trần Duy Hưng vào ca kèm lý do, cửa hàng trưởng duyệt trong 5 phút.' : 'Ca tối thứ Bảy ghi đúng một ca 3 giờ.').catch(() => {});
      await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1500);
    }
    await pull();
    const rq5 = await record('req', HA, 'Anh giám đốc muốn bật định vị suốt ca để biết bạn nào rời cửa hàng giữa giờ.', '', 'phone');
    if (rq5) await fbAct(rq5.id, 'no', 'Đã có trong Không làm: app chỉ đọc vị trí lúc bấm vào ca, ra ca. Theo dõi cả ca trái nguyên tắc của dự án và cần nhân viên đồng ý.');
    const bg5 = await record('bug', HA, 'Bảng công không tự trừ 30 phút nghỉ giữa ca.', 'i:' + (await item(T2.ex)).id, 'meeting');
    if (bg5) await fbAct(bg5.id, 'nb', 'App ghi giờ thật lúc vào, lúc ra. Trừ giờ nghỉ vẫn làm trong Excel như hiện nay, vì app không tính công, tính lương.');
    const ap3 = await record('appr', HA, 'Duyệt mẫu bảng công xuất Excel: Mã NV, Họ tên, Cửa hàng, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú sửa công.', 'i:' + (await item(T2.ex)).id, 'email');
    await push();
    const m9 = ap3 ? await answerCode(V, HA, ap3.id, true, 'Thêm cột "Người duyệt sửa công" giúp chị, kế toán hay hỏi.') : '';
    ok(((await fbs()).find(e => ap3 && e.id === ap3.id) || {}).st === 'yes', 'O9 Hà approves the timesheet layout with her code', m9);
    await status(T2.fx, 'doing'); await status(T2.fx, 'done');
    await send(V, 'test', 'Bạn Linh quên ra ca, gửi sửa công lúc 23 giờ; cửa hàng trưởng duyệt sáng hôm sau, bảng công ghi rõ ai duyệt.', 'Gửi yêu cầu sửa công', null, 'pass');
    if (A.T) { await send(A.T, 'req', 'Bạn part-time làm 2 cửa hàng trong một ngày: sáng Phan Xích Long, chiều Lê Văn Sỹ. App cần tính đúng cả hai ca.', 'Vào ca, ra ca'); }
    await status(T2.ex, 'doing'); await status(T2.ex, 'done'); await status(T2.tb, 'doing'); await status(T2.tb, 'done'); await status(ITEM.xls, 'done');
    await tick(T2.io, 5); await tick(T2.fx, 3); await tick(T2.ex, 3); await tick(T2.tb, 1);
    const open2 = ((await out()).pv.items || []).filter(x => x.sec === 'in' && x.st !== 'done').map(x => x.t);
    ok(!open2.length, 'O12 everything in Now is done', open2);
    ok(await qDrop(Q.two), 'O11 the open question on two stores a day, answered');
    done('O');

    // ============================================================ P. Tuần 16 · checks of v2
    ok(await check(T2.io, 'Vào ca rồi khoá máy 2 giờ; nhật ký chỉ có 2 lần đọc vị trí, lúc vào và lúc ra ca', true) > 0, 'P1');
    ok(await check(T2.io, 'Tắt mạng rồi bấm Vào ca: app ghi "Chưa được xác nhận"; có mạng lại thì giờ vào là giờ máy chủ', true) > 1, 'P2');
    ok(await check(T2.tb, 'Nhập sai PIN 5 lần trên máy tính bảng ở quầy', false, 'Nhập sai PIN 5 lần vẫn thử tiếp được, không bị khoá.') > 0, 'P3 a check that fails');
    await tick(T2.tb, 3);
    ok(await check(T2.tb, 'Sai PIN 5 lần thì khoá 15 phút; cửa hàng trưởng mở lại được', true) > 1, 'P4');
    ok(await check(T2.ex, 'Xuất bảng công 14 cửa hàng; mã 0012 giữ nguyên, mở bằng Excel không lỗi tiếng Việt', true) > 0, 'P5');
    ok(await check(T2.ng, 'Vào 22:00, ra 01:10: một ca 3 giờ 10 phút của ngày hôm trước', true) > 0, 'P6');
    await askCheck('r:cur', null, 'https://staging.example.com', 'Chị cho cả 14 cửa hàng dùng thử một tuần giúp em.');
    await vreload(V);
    await V.click('.vw-turn [data-ck="pass"]').catch(async () => V.click('[data-ck="pass"]').catch(() => {})); await sleep(300);
    await V.fill('.vw-ask textarea', 'Cả 14 cửa hàng chấm công trên app một tuần, không cửa hàng nào phải dùng lại sổ.').catch(() => {});
    await V.click('.vw-ask button[type="submit"]').catch(() => {}); await sleep(1600); await pull();
    ok((await fbs()).some(e => e.k === 'test' && /14 cửa hàng chấm công/.test(e.t || '')), 'P7 the release checked: it works');
    done('P');

    // ============================================================ Q. Tuần 17 · ship v2
    await tab('scope');
    await go('#pd-panel [data-pd="prv:ship"]', 600);
    await p.check(SH + ' input[name="met"][value="yes"]', { force: true }).catch(() => {});
    await p.fill('#prv-sm', 'Nhân viên 14 cửa hàng vào ca, ra ca trên app; bảng công tháng xuất ra Excel, không còn gõ lại từ sổ giấy.');
    await p.fill('#prv-sn', 'v3').catch(() => {});
    await go(SH + ' [type="submit"]', 900);
    ok(((await out()).pv.ships || []).length === 2, 'Q1 v2 shipped', ((await out()).pv.ships || []).map(s => [s.name, s.met]));
    await tab('decisions');
    await source('Đo bảng công · trước và sau v2', '', 'Trước: chị Hà mất khoảng 2 ngày mỗi tháng gõ lại 6 sổ chấm công. Tháng đầu có v2: xuất bảng công trong 10 phút; 23 yêu cầu sửa công, 21 được cửa hàng trưởng duyệt trong ngày.', 'Chấm công là phần cửa hàng dùng hằng ngày; phần gửi, nhắc là phần HR cần nhất. Cả hai ở chung một app là đúng.');
    await qAdd('Tiệc cuối năm đăng ký theo cửa hàng hay theo từng người?');
    ok((((await out()).pv.asm || {}).q || []).length === 2, 'Q2 two questions still open', ((await out()).pv.asm || {}).q);
    ok(((await out()).pv.src || []).length === 11, 'Q2 eleven sources', ((await out()).pv.src || []).length);
    await tab('scope');
    await p.locator('#pd-panel [data-pd="prv:rel"]').filter({ visible: true }).first().click(); await sleep(500);
    await p.fill('#prv-rs', 'HR gửi biểu mẫu đăng ký tiệc cuối năm và khảo sát size đồng phục, có bảng tổng hợp theo cửa hàng');
    await p.fill('#prv-rd', new Date(Date.now() + 35 * 864e5).toISOString().slice(0, 10)); await p.fill('#prv-rc2', '20');
    await go('#pd-panel form[data-pd-form="prv:rel"] [type="submit"]', 600);
    await tab('workspace');
    await edit('focus', 'Biểu mẫu đăng ký và khảo sát cho v3, bắt đầu từ tiệc cuối năm của Hạt Sương');
    await edit('next', 'Hỏi chị Hà danh sách sự kiện và khảo sát chuỗi làm trong năm');
    ok(/tiệc cuối năm/.test(((await out()).pv.rel || {}).ship || ''), 'Q3 Q4 v3 planned; focus and next step');
    done('Q');

    // ============================================================ S. Tuần 18–19 · v3 starts: verified, and verified before a change (CONTRACT 113)
    const V3 = { form: 'Biểu mẫu đăng ký sự kiện, khảo sát size đồng phục', sum: 'Bảng tổng hợp đăng ký theo cửa hàng, xuất Excel', rem: 'Nhắc người chưa đăng ký 2 ngày trước hạn' };
    await tab('scope');
    const fm = await item(V3.form);
    if (fm && fm.sec === 'next') { await go('#pd-panel [data-pd="prv:pull"][data-id="' + fm.id + '"]', 700); await A.gate(null, 'Tiệc cuối năm chốt danh sách trước 10/12; chị Hà đang gom đăng ký qua 14 nhóm Zalo.', '', 'need', 'M'); }
    for (const [t, sz] of [[V3.sum, 'S'], [V3.rem, 'S']]) await A.gate(t, '', '', 'need', sz);
    const now3 = ((await out()).pv.items || []).filter(x => x.sec === 'in').map(x => x.t);
    ok(now3.length === 3 && [V3.form, V3.sum, V3.rem].every(t => now3.includes(t)), 'S1 three items in Now for v3', now3);
    await go('#pd-panel [data-pd="prv:base"]', 700);
    ok(((await out()).pv.bls || []).length === 3, 'S1 the baseline of v3');
    await tab('team');
    await A.dod(V3.form, ['Mỗi cửa hàng chỉ thấy danh sách của mình', 'Hạn đăng ký hiện ngay đầu biểu mẫu', 'Đăng ký sau hạn bị chặn']);
    await A.dod(V3.sum, ['Một dòng cho mỗi cửa hàng: số người đã đăng ký, số người chưa', 'Mở bằng Excel không lỗi tiếng Việt']);
    for (const t of [V3.form, V3.sum]) { await status(t, 'doing'); await tick(t, 3); await status(t, 'done'); }
    await status(V3.rem, 'doing');
    ok(await check(V3.form, 'Chị Hà và 2 cửa hàng trưởng thử đăng ký tiệc; cửa hàng Lê Văn Sỹ không thấy người của cửa hàng khác', true) > 0, 'S2 the form checked: it works');
    ok(await check(V3.sum, 'Xuất bảng tổng hợp 14 cửa hàng, mở bằng Excel trên máy chị Hà', true) > 0, 'S3 the summary checked: it works');
    /* after the check, Hà changes what done means for the form: a late sign-up goes to the store manager instead of being refused */
    await tab('team');
    await p.locator('#pd-panel [data-pd="wk:dn"][aria-expanded="false"]').first().click().catch(() => {}); await sleep(400);   /* done work is folded under "Show n done" */
    await A.dod(V3.form, ['Mỗi cửa hàng chỉ thấy danh sách của mình', 'Hạn đăng ký hiện ngay đầu biểu mẫu', 'Đăng ký sau hạn cần cửa hàng trưởng duyệt']);
    await tick(V3.form, 3);
    const chips = await p.evaluate(ids => ids.map(id => { const r = document.querySelector('#pd-panel [data-id="' + id + '"]'); const row = r && r.closest('li, tr, .wk-r'); const c = row && row.querySelector('.wk-ver'); return c ? c.className : ''; }), [(await item(V3.form)).id, (await item(V3.sum)).id]);
    ok(/\bstale\b/.test(chips[0]) && /\bok\b/.test(chips[1]), 'S4 the form reads Check again, the summary Verified', chips);
    await tab('workspace');
    await edit('focus', 'Biểu mẫu đăng ký tiệc cuối năm: kiểm lại với chị Hà sau khi đổi cách xử lý đăng ký trễ');
    await edit('next', 'Thử lại biểu mẫu với cửa hàng Lê Văn Sỹ: đăng ký sau hạn phải chờ cửa hàng trưởng duyệt');
    done('S');

    // ============================================================ R. the day: quick notes and Today
    await p.click('.nav-i[data-view="dashboard"]'); await sleep(600);
    await btn('#view-dashboard', 'View all', 600).catch(() => {});
    for (const [t, pj] of [['Hỏi chị Hà lịch chốt lương kỳ này #luong', NAME], ['Hỏi kế toán cột nào cần thêm vào bảng công xuất Excel #bangcong', NAME], ['Hỏi anh Tuấn cửa hàng nào hay quên ra ca nhất tháng này #chamcong', NAME]]) {
      await p.fill('#note-input', t);
      if (await p.$('#note-proj')) await p.selectOption('#note-proj', { label: pj }).catch(() => {});
      await go('#note-save', 400);
    }
    if (await drawer()) await go('.drawer.dr-live [data-close]', 400);
    ok((await p.evaluate(() => SDB.exportAll().then(b => b.ent.filter(e => e.k.indexOf('note:') === 0).length))) === 3, 'R1-R3 three quick notes');
    done('R');
  } catch (e) {
    if (!(e instanceof Stop)) { console.error('ERR', String(e && e.stack || e).split('\n').slice(0, 4).join('\n')); fails++; if (p) await p.screenshot({ path: path.join(os.tmpdir(), 'sample-vi-err.png') }).catch(() => {}); }
  } finally {
    if (p && process.env.SD_SHOT) await p.screenshot({ path: process.env.SD_SHOT, fullPage: true }).catch(() => {});
    if (p) { const x = await p.evaluate(() => SDB.exportAll().then(b => JSON.stringify(b))).catch(() => ''); if (x) fs.writeFileSync(OUT, x); console.log('state written to', OUT); }
    console.log(errs.length ? 'page errors: ' + errs.slice(0, 5).join(' | ') : 'no page errors');
    await b.close(); S.stop && S.stop();
    console.log('\n' + (steps - fails) + '/' + steps + ' ok');
    process.exit(fails ? 1 : 0);
  }
})();
