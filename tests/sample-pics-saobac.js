// The eight made-up screenshots of the Sao Bắc Logistics sample (SAMPLE-SCRIPT-DOI-XE-GIAO-HANG-VI.md, A4): each drawn from a small
// HTML page and saved as a PNG in tests/sample-pics-saobac/. Nothing in them is real: names, plates, phone numbers, accounts, the
// GPS company and the QR code are invented. tests/sample-saobac-vi.js sends them from the client portal.
//
//   SD_PLAYWRIGHT=<pw.js> node tests/sample-pics-saobac.js
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'sample-pics-saobac');

const base = 'body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#1f2933;background:#fff}';
const xl = (title, cols, rows, extra) => `<style>${base}
  .bar{background:#1d6f42;color:#fff;padding:8px 14px;font-size:14px}.rib{background:#f3f3f3;border-bottom:1px solid #d6d6d6;padding:6px 14px;font-size:12px;color:#444}
  table{border-collapse:collapse;font-size:12.5px;margin:0}td,th{border:1px solid #d4d4d4;padding:4px 8px;white-space:nowrap}
  th{background:#eef1f4;font-weight:600}.n{background:#eef1f4;color:#666;text-align:center;width:28px}.bad{background:#fde2e1}${extra || ''}</style>
  <div class="bar">${title}</div><div class="rib">Trang đầu &nbsp; Chèn &nbsp; Bố trí trang &nbsp; Công thức &nbsp; Dữ liệu &nbsp; Xem lại</div>
  <table><tr><th class="n"></th>${cols.map(c => '<th>' + c + '</th>').join('')}</tr>
  ${rows.map((r, i) => '<tr><td class="n">' + (i + 1) + '</td>' + r.map(c => '<td' + (String(c).startsWith('!') ? ' class="bad"' : '') + '>' + String(c).replace(/^!/, '') + '</td>').join('') + '</tr>').join('')}</table>`;
const phone = inner => `<style>${base}body{background:#e9edf1;display:flex;justify-content:center;padding:18px 0}
  .ph{width:340px;background:#fff;border-radius:26px;border:10px solid #1b1f24;overflow:hidden;box-shadow:0 8px 24px #0003}
  .st{display:flex;justify-content:space-between;font-size:11px;padding:6px 14px;background:#0f5b4c;color:#fff}
  .hd{background:#0f5b4c;color:#fff;padding:10px 14px 14px;font-size:16px;font-weight:600}.sub{font-size:12px;font-weight:400;opacity:.85}
  .row{display:flex;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #eee;font-size:14px}.row small{display:block;color:#6b7280;font-size:11.5px}
  .tot{padding:12px 14px;font-size:15px;font-weight:700;display:flex;justify-content:space-between;background:#fff7ed;color:#9a3412}
  .warn{margin:10px 14px;padding:9px 11px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12.5px;color:#991b1b}</style>
  <div class="ph"><div class="st"><span>14:52</span><span>▂▃▅ 4G · 23%</span></div>${inner}</div>`;

const PICS = {
  'qr-chuyen-khoan.png': [420, 455, `<style>${base}body{display:flex;justify-content:center;padding:20px;background:#f4f6f8}
    .c{width:360px;background:#fff;border-radius:14px;padding:18px;text-align:center;box-shadow:0 2px 10px #0002}
    .q{display:grid;grid-template-columns:repeat(25,10px);gap:0;margin:14px auto;width:250px}.q i{width:10px;height:10px;display:block}
    h3{margin:0;color:#c2410c;font-size:17px}p{margin:4px 0;font-size:13px;color:#374151}</style>
    <div class="c"><h3>Ngân hàng Mẫu · QR nhận tiền</h3><div class="q" id="q"></div>
    <p><b>NGUYEN VAN LUC (MẪU)</b></p><p>STK 0000 1111 2222 · Ảnh minh hoạ, không phải tài khoản thật</p>
    <p style="color:#6b7280">Tài xế cho khách quét khi giao hàng COD</p></div>
    <script>let s=7;const r=()=>(s=(s*9301+49297)%233280)/233280;const q=document.getElementById('q');
    for(let y=0;y<25;y++)for(let x=0;x<25;x++){const f=(x<7&&y<7)||(x>17&&y<7)||(x<7&&y>17);
    const ring=f&&((x%18===0||x%18===6||y%18===0||y%18===6)||(x%18>1&&x%18<5&&y%18>1&&y%18<5));
    const on=f?ring:r()>.52;const i=document.createElement('i');i.style.background=on?'#111':'#fff';q.appendChild(i);}</script>`],

  'file-don-sieu-thi.png': [900, 330, xl('DonHang_SieuThiHaiHa_T11.xlsx - Excel',
    ['Mã ĐH ST', 'Mã kiện', 'Cửa hàng nhận', 'Địa chỉ', 'Khung giờ', 'Kg', 'COD'],
    [['HH-88213', 'HH-88213-01', 'Hải Hà Cầu Giấy', 'Số 18 phố Mẫu, Cầu Giấy', '06:00-09:00', '42,5', '0'],
     ['HH-88213', 'HH-88213-02', 'Hải Hà Cầu Giấy', 'Số 18 phố Mẫu, Cầu Giấy', '06:00-09:00', '38,0', '0'],
     ['HH-88213', 'HH-88213-03', 'Hải Hà Cầu Giấy', 'Số 18 phố Mẫu, Cầu Giấy', '06:00-09:00', '40,1', '0'],
     ['HH-88214', 'HH-88214-01', 'Hải Hà Long Biên', 'Số 5 ngõ Mẫu, Long Biên', '13:00-15:00', '55,0', '0'],
     ['HH-88214', 'HH-88214-02', 'Hải Hà Long Biên', 'Số 5 ngõ Mẫu, Long Biên', '13:00-15:00', '51,2', '0'],
     ['HH-88215', 'HH-88215-01', 'Hải Hà Hà Đông', 'Số 90 đường Mẫu, Hà Đông', '21:00-23:00', '62,7', '0'],
     ['', '', '', '', '', '', ''], ['Mỗi dòng là một kiện · 3 đơn = 6 dòng', '', '', '', '', '', '']])],

  'bang-gio-cam.png': [760, 340, `<style>${base}body{background:#efe9dc;padding:22px}
    .p{background:#fffdf7;padding:18px 22px;box-shadow:0 3px 12px #0003;transform:rotate(-1.2deg);font-family:"Times New Roman",serif}
    h2{text-align:center;margin:0 0 4px;font-size:19px}h4{text-align:center;margin:0 0 12px;font-weight:400;font-size:13px}
    table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #333;padding:6px 8px}th{background:#eee}
    .pen{color:#1d4ed8;font-family:"Segoe Print","Comic Sans MS",cursive;font-size:13px}</style><div class="p">
    <h2>BẢNG KHUNG GIỜ HẠN CHẾ XE TẢI · PHÒNG ĐIỀU PHỐI</h2><h4>Bản nội bộ Sao Bắc Logistics (minh hoạ) · dán tại kho Long Biên</h4>
    <table><tr><th>Nhóm xe</th><th>Khu vực</th><th>Giờ không được chạy</th><th>Ghi chú</th></tr>
    <tr><td>Khối lượng toàn bộ đến 1,25 tấn</td><td>Trong vành đai 1</td><td>06:00–09:00 · 16:30–20:00</td><td>Có giấy phép thì theo giấy phép</td></tr>
    <tr><td>Trên 1,25 đến 3,5 tấn</td><td>Trong vành đai 2</td><td>06:00–21:00</td><td class="pen">11 xe có GP vào phố</td></tr>
    <tr><td>Trên 3,5 tấn</td><td>Trong vành đai 3</td><td>06:00–22:00</td><td>Chỉ chạy đêm</td></tr>
    <tr><td colspan="4" class="pen">→ Kiểm lại theo QĐ mới trước khi phát chuyến! (anh Mạnh)</td></tr></table></div>`],

  'excel-vo-font.png': [900, 300, xl('loi-import-SBL-1108.csv - Excel',
    ['DÃ²ng', 'Cá»™t', 'Lá»—i', 'GiÃ¡ trá»‹'],
    [['12', 'delivery_address', '!Thiáº¿u Ä‘á»‹a chá»‰', ''], ['27', 'delivery_address', '!Thiáº¿u Ä‘á»‹a chá»‰', ''],
     ['31', 'delivery_phone', '!Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡', '09x8'], ['44', 'delivery_address', '!Thiáº¿u Ä‘á»‹a chá»‰', ''],
     ['58', 'package_count', '!Pháº£i lÃ  sá»‘ nguyÃªn dÆ°Æ¡ng', '0'], ['61', 'delivery_address', '!Thiáº¿u Ä‘á»‹a chá»‰', '']])],

  'cod-hai-lan.png': [420, 470, phone(`<div class="hd">COD ca sáng · 08/11<div class="sub">Tài xế: Trần Văn Hưng (mẫu) · 29C-418.xx</div></div>
    <div class="row"><span>SB-10229<small>Ngõ Mẫu 12, Cầu Giấy · 09:14</small></span><b>320.000</b></div>
    <div class="row"><span>SB-10234<small>Phố Mẫu 7, Cầu Giấy · 10:02</small></span><b>450.000</b></div>
    <div class="row" style="background:#fff1f2"><span>SB-10234<small>Phố Mẫu 7, Cầu Giấy · 10:02 · Gửi lại</small></span><b>450.000</b></div>
    <div class="row"><span>SB-10240<small>Ngõ Mẫu 3, Cầu Giấy · 10:41</small></span><b>130.000</b></div>
    <div class="tot"><span>Tổng COD phải nộp</span><span>1.350.000</span></div>
    <div class="warn">⚠ Sóng yếu lúc 10:02. Đã bấm Gửi lại 1 lần.</div>`)],

  'email-gps.png': [860, 470, `<style>${base}body{background:#f1f3f4;padding:16px}
    .m{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px #0002;font-size:13.5px;line-height:1.55}
    .s{font-size:18px;margin:0 0 10px}.f{color:#5f6368;font-size:12.5px;margin-bottom:14px}</style><div class="m">
    <p class="s">RE: Tài liệu API cho Sao Bắc Logistics (3 thiết bị thử)</p>
    <div class="f"><b>Bộ phận kỹ thuật · Định Vị Mẫu (công ty hư cấu)</b> &lt;kythuat@dinhvimau.example&gt; · tới anh Quang, chị Phương</div>
    <p>Chào anh Quang,</p>
    <p>Bên em gửi tài liệu API v2 đính kèm. API trả <b>vị trí mới nhất</b> của từng xe, tối đa <b>1 lần/phút</b> cho mỗi thiết bị.
    Hiện chưa có API lịch sử hành trình; dự kiến quý sau. <b>Camera chưa mở API</b>, chỉ xem trên phần mềm của bên em.</p>
    <p>Đã cấp quyền cho 3 thiết bị thử: 29C-418.xx, 29H-102.xx, 30L-655.xx. Tài khoản thử hết hạn sau 30 ngày.</p>
    <p>Trân trọng,<br>Bộ phận kỹ thuật</p><p style="color:#5f6368">📎 API_v2_tai_lieu.pdf</p></div>`],

  'bao-cao-cod-lech.png': [900, 330, xl('BaoCao_COD_Ngay_09-11.xlsx - Excel',
    ['Ngày báo cáo', 'Mã đơn', 'Tài xế', 'Giờ giao (app)', 'COD', 'Sổ kế toán'],
    [['09/11', 'SB-11802', 'Lực (mẫu)', '09/11 17:20', '250.000', '09/11'],
     ['09/11', 'SB-11807', 'Lực (mẫu)', '09/11 19:05', '480.000', '09/11'],
     ['!10/11', 'SB-11811', 'Hưng (mẫu)', '!09/11 23:40', '610.000', '!09/11'],
     ['!10/11', 'SB-11812', 'Hưng (mẫu)', '!09/11 23:55', '175.000', '!09/11'],
     ['10/11', 'SB-11830', 'Lực (mẫu)', '10/11 08:12', '300.000', '10/11'],
     ['', '', '', 'Tổng ngày 09/11', '730.000', '!Sổ: 1.515.000']])],

  'app-van-pod.png': [420, 600, phone(`<div class="hd">Giao hàng · SB-12044<div class="sub">Điểm 6/14 · Ngõ Mẫu 21, Hoàng Mai</div></div>
    <div style="height:250px;background:#2d3748;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:13px">Camera · chụp ảnh POD</div>
    <div style="position:relative;margin:-150px 22px 0;background:#fff;border-radius:12px;padding:16px;box-shadow:0 6px 20px #0005">
    <b style="font-size:15px">Sao Bắc Tài xế đã dừng</b><p style="font-size:13px;color:#4b5563;margin:8px 0 14px">Ứng dụng liên tục dừng.</p>
    <div style="font-size:13.5px;line-height:2.1;color:#0f5b4c"><div>ⓘ Thông tin ứng dụng</div><div>✕ Đóng ứng dụng</div></div></div>
    <div style="height:140px"></div><div class="warn">Samsung A05 (mẫu) · RAM 3 GB</div>`)],
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await PW.chromium.launch();
  for (const [name, [w, h, html]] of Object.entries(PICS)) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent('<!doctype html><meta charset="utf-8">' + html);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, name) });
    await p.close();
    console.log('ok   ' + name + ' ' + fs.statSync(path.join(OUT, name)).size + ' bytes');
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
