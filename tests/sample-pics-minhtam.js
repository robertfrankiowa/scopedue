// The four pictures of the Nha khoa Minh Tâm sample (CONTRACT 123), drawn from small HTML pages: what BS. Hân sent from the client
// portal, each showing what her words are about. The sample from the user's manual test (CONTRACT 88) had screenshots of ScopeDue
// itself there, one of them three times. Nothing in them is real: the clinic, its address, phone and site are invented.
//
//   SD_PLAYWRIGHT=<pw.js> node tests/sample-pics-minhtam.js
//
// It writes tests/sample-pics-minhtam/*.jpg (JPEG, as the portal sends a picture), then puts each one in samples/workspace.vi.json
// in place of the old one: its name, type, size, SHA-256 and the small copy the app shows (webp, at most 480px, as vpThumbs makes
// it). None of these is inside a hash (CONTRACT 59), so every record and fingerprint stays as it was. Then run build.py.
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'sample-pics-minhtam');
const SAMPLE = path.join(ROOT, 'samples', 'workspace.vi.json');
const PID = 'project:website-dat-lich-kham-nha-khoa-minh-tam';

// Be Vietnam Pro, the font of the clinic's UI kit (Scope: "UI kit Calm Healthcare: màu, font Be Vietnam Pro")
const F = path.join(ROOT, 'portal-assets', 'fonts');
const face = (w) => ['vietnamese', 'latin-ext', 'latin'].map(s => `@font-face{font-family:BVP;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(F, 'be-vietnam-pro-' + s + '-' + w + '-normal.woff2')).toString('base64')}) format("woff2")}`).join('');
const FONTS = face(400) + face(500) + face(600);
const base = `${FONTS}*{box-sizing:border-box}body{margin:0;font-family:BVP,"Segoe UI",Arial,sans-serif;color:#12312e;background:#fff;-webkit-font-smoothing:antialiased}
  .mk{position:absolute;border:3px solid #e0263f;border-radius:50%;transform:rotate(-4deg)}
  .note{position:absolute;color:#e0263f;font-weight:600;font-size:17px;line-height:22px;transform:rotate(-3deg);text-shadow:0 0 3px #fff,0 0 3px #fff}
  .ring{position:relative}.ring>.mk{inset:-10px -14px}
  .note.flow{position:relative;display:block}
  .logo{display:flex;align-items:center;gap:9px;font-weight:600;font-size:15px;color:#0f5f58}
  .logo i{width:30px;height:30px;border-radius:50%;background:#0f766e;color:#fff;display:grid;place-items:center;font-style:normal;font-size:12px;letter-spacing:.5px}`;
const ring = (html, inline) => `<div class="ring"${inline ? ' style="display:inline-block"' : ''}>${html}<div class="mk"></div></div>`;
const proto = (label) => `<div style="background:#2b2f36;color:#d7dbe0;font-size:12px;padding:7px 14px;display:flex;justify-content:space-between"><span>Prototype v1.0 · ${label}</span><span>Nha khoa Minh Tâm</span></div>`;
const phone = (inner, bar) => `<style>${base}body{background:#e8eeed;padding:18px 0;display:flex;justify-content:center}
  .ph{width:380px;background:#fff;border-radius:30px;border:10px solid #15191d;overflow:hidden;position:relative;box-shadow:0 10px 30px #0003}
  .st{display:flex;justify-content:space-between;font-size:12px;padding:7px 18px;color:#12312e;background:#fff}</style>
  <div class="ph"><div class="st"><span>${bar}</span><span>▂▃▅ 4G · 61%</span></div>${inner}</div>`;
const browser = (url, inner, w) => `<div style="width:${w}px;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px #0002;background:#fff;position:relative">
  <div style="background:#eef1f3;padding:8px 12px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #dde2e5">
  <span style="display:flex;gap:6px"><i style="width:11px;height:11px;border-radius:50%;background:#f26b5e;display:block"></i><i style="width:11px;height:11px;border-radius:50%;background:#f5be4f;display:block"></i><i style="width:11px;height:11px;border-radius:50%;background:#5fc454;display:block"></i></span>
  <span style="flex:1;background:#fff;border-radius:6px;padding:4px 10px;font-size:12.5px;color:#4b5563">${url}</span></div>${inner}</div>`;
const field = (l, v, opt) => `<div style="margin:0 0 14px"><div style="font-size:13px;font-weight:500;margin:0 0 6px">${l}${opt ? ' <span style="color:#7a8d8a;font-weight:400">(tuỳ chọn)</span>' : ' <span style="color:#c2410c">*</span>'}</div><div style="border:1px solid #c9dad7;border-radius:10px;padding:11px 12px;font-size:14px;color:${v ? '#12312e' : '#93a5a2'}">${v || '&nbsp;'}</div></div>`;

const PICS = [
  { // CR-001, 3 Nov 20:03: "Form đặt lịch có bắt khách ghi bệnh nền không? …"
    on: { cr: 'CR-001', i: 0 }, name: '2026-11-03_200122.jpg', w: 420, h: 745,
    html: phone(proto('Đặt lịch · Bước 2/4') + `<div style="padding:16px 18px 18px;position:relative">
      <div class="logo"><i>MT</i>Nha khoa Minh Tâm</div>
      <div style="display:flex;gap:6px;margin:16px 0 6px">${[1, 2, 3, 4].map(n => `<span style="flex:1;height:5px;border-radius:3px;background:${n <= 2 ? '#0f766e' : '#d6e5e2'}"></span>`).join('')}</div>
      <div style="font-size:12.5px;color:#5f7471">Bước 2/4 · Thông tin người khám</div>
      <h2 style="font-size:21px;line-height:28px;margin:6px 0 14px;font-weight:600">Ai sẽ đến khám?</h2>
      <div style="display:flex;gap:8px;margin:0 0 16px"><span style="flex:1;text-align:center;padding:9px;border-radius:10px;background:#0f766e;color:#fff;font-size:13.5px">Tôi đi khám</span><span style="flex:1;text-align:center;padding:9px;border-radius:10px;border:1px solid #c9dad7;font-size:13.5px">Đặt hộ người thân</span></div>
      ${ring(field('Họ và tên', 'Nguyễn Thị Lan') + field('Số điện thoại', '0900 000 000') + field('Email', '', true))}
      <div style="font-size:12.5px;color:#5f7471;line-height:18px;margin:14px 0 10px">Chúng tôi chỉ dùng số điện thoại để xác nhận lịch hẹn.</div>
      <div class="note flow" style="margin:6px 0 20px">Bước này có hỏi bệnh nền không? Phòng khám không muốn hỏi chuyện sức khoẻ ngay ở bước đầu.</div>
      <div style="display:flex;gap:10px"><span style="padding:12px 16px;border-radius:12px;border:1px solid #c9dad7;font-size:14px">Quay lại</span><span style="flex:1;text-align:center;padding:12px;border-radius:12px;background:#0f766e;color:#fff;font-size:14px;font-weight:500">Tiếp tục</span></div>
    </div>`, '20:01')
  },
  { // CR-003, 3 Nov 20:13: "Nút Chat Zalo nổi ở góc phải: chỉ là nút mở Zalo OA của phòng khám, không gửi tin tự động."
    on: { cr: 'CR-003', i: 0 }, name: '2026-11-03_201148.jpg', w: 420, h: 880,
    html: phone(proto('Trang chủ · mobile') + `<div style="position:relative;height:760px;background:linear-gradient(180deg,#eef8f6 0,#fff 62%)">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px"><div class="logo"><i>MT</i>Nha khoa Minh Tâm</div><span style="font-size:22px;color:#0f5f58">☰</span></div>
      <div style="padding:18px 18px 0"><div style="font-size:12.5px;color:#0f766e;font-weight:500;letter-spacing:.3px">NHA KHOA GIA ĐÌNH · THẢO ĐIỀN</div>
      <h1 style="font-size:27px;line-height:35px;margin:8px 0 10px;font-weight:600">Nụ cười khoẻ, khám nhẹ nhàng</h1>
      <p style="font-size:14.5px;line-height:22px;color:#4a605d;margin:0 0 18px">Khám tổng quát, niềng răng, trồng implant. Đặt lịch trong 1 phút, lễ tân gọi xác nhận.</p>
      <div style="display:flex;flex-direction:column;gap:10px"><span style="text-align:center;padding:13px;border-radius:12px;background:#0f766e;color:#fff;font-size:15px;font-weight:500">Đặt lịch khám</span><span style="text-align:center;padding:13px;border-radius:12px;border:1.5px solid #0f766e;color:#0f766e;font-size:15px;font-weight:500">Gọi tư vấn · 028 3700 0000</span></div></div>
      <div style="margin:22px 18px 0;border-radius:16px;height:150px;background:linear-gradient(135deg,#cfe9e4,#e9f5f2);display:grid;place-items:center;color:#5f8a84;font-size:13px">Ảnh phòng khám (chờ ảnh thật)</div>
      <div style="display:flex;gap:10px;margin:16px 18px 0">${['Khám tổng quát', 'Niềng răng', 'Implant'].map(t => `<span style="flex:1;font-size:12.5px;padding:10px 8px;border-radius:10px;background:#f2f7f6;text-align:center">${t}</span>`).join('')}</div>
      <div style="position:absolute;right:16px;bottom:22px;width:58px;height:58px;border-radius:50%;border:2.5px dashed #e0263f;display:grid;place-items:center;color:#e0263f;font-weight:600;font-size:13px;background:#fff8">Zalo</div>
      <div class="mk" style="right:2px;bottom:8px;width:88px;height:88px"></div>
      <div class="note" style="right:112px;bottom:26px;width:220px;text-align:right">Thêm nút Chat Zalo nổi ở đây, bấm là mở Zalo OA của phòng khám</div>
    </div>`, '20:11')
  },
  { // Milestone Thiết kế UX/UI, check step 3 ("Thử Tab qua form: luôn thấy ô đang chọn"), 3 Nov 19:50: "Nút Đặt lịch chữ trắng trên nền xanh nhạt, khó đọc khi Tab tới."
    on: { m: 'i5', k: 's3:issue' }, name: '2026-11-03_194916.jpg', w: 1100, h: 640,
    html: `<style>${base}body{background:#dfe6e5;padding:22px}</style>` + browser('Prototype v1.0 · Trang chủ · desktop 1280', `${proto('Trang chủ · desktop')}
      <div style="position:relative;background:linear-gradient(180deg,#eef8f6,#fff);height:510px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 34px;border-bottom:1px solid #e3eeec"><div class="logo"><i>MT</i>Nha khoa Minh Tâm</div>
      <div style="display:flex;gap:26px;font-size:14px;color:#3f5653">${['Dịch vụ', 'Bác sĩ', 'Bảng giá', 'Kiến thức', 'Liên hệ'].map(t => `<span>${t}</span>`).join('')}</div>
      ${ring('<span style="display:inline-block;padding:10px 18px;border-radius:10px;background:#a9e0d7;color:#fff;font-size:14px;font-weight:500;outline:1.5px solid #c8ece6;outline-offset:2px">Đặt lịch khám</span>', true)}</div>
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:40px;padding:50px 34px 0">
      <div><div style="font-size:13px;color:#0f766e;font-weight:500;letter-spacing:.4px">NHA KHOA GIA ĐÌNH · THẢO ĐIỀN</div>
      <h1 style="font-size:40px;line-height:50px;margin:10px 0 14px;font-weight:600">Nụ cười khoẻ,<br>khám nhẹ nhàng</h1>
      <p style="font-size:16px;line-height:25px;color:#4a605d;margin:0 0 24px;max-width:440px">Khám tổng quát, niềng răng, trồng implant. Đặt lịch trong 1 phút, lễ tân gọi xác nhận.</p>
      <div style="display:flex;gap:22px;align-items:center">${ring('<span style="display:inline-block;padding:14px 22px;border-radius:12px;background:#a9e0d7;color:#fff;font-size:15.5px;font-weight:500;outline:1.5px solid #c8ece6;outline-offset:3px">Đặt lịch khám</span>', true)}<span style="padding:14px 22px;border-radius:12px;border:1.5px solid #0f766e;color:#0f766e;font-size:15.5px;font-weight:500">Gọi tư vấn</span></div>
      <div class="note flow" style="margin:26px 0 0;width:420px">Tab tới nút Đặt lịch: chữ trắng trên nền xanh nhạt, gần như không đọc được</div></div>
      <div style="border-radius:20px;height:300px;background:linear-gradient(135deg,#cfe9e4,#e9f5f2);display:grid;place-items:center;color:#5f8a84;font-size:14px">Ảnh bác sĩ (chờ ảnh thật)</div></div>
      <div class="note" style="right:34px;top:76px">nút trên cùng cũng vậy</div>
      </div>`, 1056)
  },
  { // Milestone Website công khai + CMS, check step 2 ("Trong CMS đổi giờ làm thứ Bảy: trang Liên hệ đổi theo"), 4 Nov 09:49: "Đổi giờ thứ Bảy thành 8h–12h nhưng trang Liên hệ vẫn 8h–17h."
    on: { m: 'i6', k: 's2:issue' }, name: '2026-11-04_094802.jpg', w: 1280, h: 640,
    html: `<style>${base}body{background:#dfe6e5;padding:22px;display:flex;gap:20px;align-items:flex-start}
      .row{display:grid;grid-template-columns:140px 1fr 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f0;font-size:13.5px}
      .in{border:1px solid #cfd8d6;border-radius:8px;padding:7px 10px;font-size:13.5px}
      .hr{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e6efed;font-size:15px}</style>` +
      browser('staging.nhakhoaminhtam.example/admin/gio-lam-viec', `<div style="display:flex;height:540px">
      <div style="width:150px;background:#0f3e3a;color:#cfe6e2;font-size:13px;padding:16px 14px;line-height:30px"><div style="color:#fff;font-weight:600;margin-bottom:8px">Quản trị</div>Lịch hẹn<br>Dịch vụ<br>Bác sĩ<br><b style="color:#fff">Giờ làm việc</b><br>Liên hệ<br>Bài viết</div>
      <div style="flex:1;padding:20px 22px;position:relative"><h3 style="margin:0 0 4px;font-size:18px;font-weight:600">Giờ làm việc</h3><div style="font-size:12.5px;color:#5f7471;margin-bottom:12px">Hiển thị trên trang Liên hệ và chân trang</div>
      <div class="row" style="color:#5f7471;font-size:12px"><span>Ngày</span><span>Mở cửa</span><span>Đóng cửa</span></div>
      ${[['Thứ Hai – Thứ Sáu', '08:00', '19:00'], ['Thứ Bảy', '08:00', '12:00'], ['Chủ nhật', 'Nghỉ', '']].map(r => { const h = `<div class="row"><span>${r[0]}</span><span class="in">${r[1]}</span><span class="in"${r[0] === 'Thứ Bảy' ? ' style="border-color:#0f766e;background:#f0faf8"' : ''}>${r[2] || '&nbsp;'}</span></div>`; return r[0] === 'Thứ Bảy' ? ring(h) : h; }).join('')}
      <div style="display:flex;gap:10px;align-items:center;margin-top:16px"><span style="padding:9px 16px;border-radius:8px;background:#0f766e;color:#fff;font-size:13.5px">Lưu</span><span style="font-size:12.5px;color:#15803d">✓ Đã lưu lúc 09:46</span></div>
      <div class="note flow" style="margin:26px 0 0">Đã sửa thứ Bảy thành 8h–12h và bấm Lưu</div></div></div>`, 600) +
      browser('staging.nhakhoaminhtam.example/lien-he', `<div style="padding:22px 26px;height:540px;position:relative;background:linear-gradient(180deg,#eef8f6,#fff 40%)">
      <div class="logo" style="margin-bottom:18px"><i>MT</i>Nha khoa Minh Tâm</div>
      <h2 style="font-size:26px;margin:0 0 6px;font-weight:600">Liên hệ</h2><div style="font-size:14px;color:#4a605d;line-height:22px;margin-bottom:16px">18 Đường số 9, Thảo Điền, TP. Thủ Đức<br>028 3700 0000 · lichhen@nhakhoaminhtam.example</div>
      <div style="font-weight:600;font-size:15px;margin:0 0 4px">Giờ làm việc</div>
      <div class="hr"><span>Thứ Hai – Thứ Sáu</span><span>8:00 – 19:00</span></div>
      ${ring('<div class="hr"><span>Thứ Bảy</span><span>8:00 – 17:00</span></div>')}
      <div class="hr"><span>Chủ nhật</span><span>Nghỉ</span></div>
      <div class="note flow" style="margin:18px 0 0;text-align:right">Tải lại rồi mà trang Liên hệ vẫn 8h–17h</div>
      <div style="margin-top:16px;border-radius:12px;height:110px;background:#e6efed;display:grid;place-items:center;color:#7a8d8a;font-size:13px">Bản đồ</div></div>`, 620)
  }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await PW.chromium.launch();
  const done = [];
  for (const pic of PICS) {
    const p = await b.newPage({ viewport: { width: pic.w, height: pic.h }, deviceScaleFactor: 1 });
    await p.setContent('<!doctype html><meta charset="utf-8">' + pic.html);
    await p.evaluate(() => document.fonts.ready);
    const jpg = await p.screenshot({ type: 'jpeg', quality: 86, fullPage: false });
    fs.writeFileSync(path.join(OUT, pic.name), jpg);
    // the app's small copy, as vpThumbs makes it (54-viewer-portal): at most 480px, webp 0.7, jpeg 0.6 when that is over 60000
    const d = await p.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let u = c.toDataURL('image/webp', 0.7); if (u.length > 60000) u = c.toDataURL('image/jpeg', 0.6); return u;
    }, 'data:image/jpeg;base64,' + jpg.toString('base64'));
    done.push({ on: pic.on, pic: { n: pic.name, type: 'image/jpeg', size: jpg.length, sha: crypto.createHash('sha256').update(jpg).digest('hex'), d } });
    console.log(pic.name + ': ' + jpg.length + ' bytes, small copy ' + d.length + ' chars');
    await p.close();
  }
  await b.close();
  // into the sample: the same place, the same fields, the same order of keys
  const t = fs.readFileSync(SAMPLE, 'utf8'), ws = JSON.parse(t);
  if (JSON.stringify(ws, null, 1) + '\n' !== t) throw new Error('samples/workspace.vi.json is not written as this script writes it');
  const pj = ws.ent.find(e => e.k === PID).d;
  for (const { on, pic } of done) {
    let list;
    if (on.cr) list = pj.crs.find(c => c.id === on.cr).entries[on.i].pics;
    else list = pj.mev.find(e => e.m === on.m && e.k === on.k && (e.pics || []).length).pics;
    if (!list || list.length !== 1) throw new Error('no single picture at ' + JSON.stringify(on));
    const old = list[0];
    list[0] = Object.fromEntries(Object.keys(old).map(k => [k, k in pic ? pic[k] : old[k]]));
  }
  fs.writeFileSync(SAMPLE, JSON.stringify(ws, null, 1) + '\n');
  console.log('wrote ' + done.length + ' pictures into samples/workspace.vi.json; now run build.py');
})().catch(e => { console.log('ERROR ' + e.stack); process.exit(2); });
