// The pictures of the English sample (CONTRACT 124), drawn again for it from small HTML pages: the same moments as the Vietnamese
// pictures (tests/sample-pics-minhtam.js, tests/sample-pics-saobac.js, tests/sample-pics/), with American people, places, money
// and wording. Nothing in them is real: the businesses, addresses, phone numbers (555-01xx), plates and accounts are invented.
//
//   SD_PLAYWRIGHT=<pw.js> node tests/sample-pics-en.js
//
// It writes tests/sample-pics-en/<name> (JPEG where the record says image/jpeg, PNG for the Viewer portal's pictures) and
// tests/sample-pics-en/pics.json: each picture's type, size, SHA-256 and the small copy the app shows (webp, at most 480px, as
// vpThumbs makes it). tools/sample_en.py make puts them in samples/workspace.en.json in place of the Vietnamese ones (by name).
// None of these is inside a hash (CONTRACT 59). Then run build.py.
const PW = require(process.env.SD_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const OUT = path.join(__dirname, 'sample-pics-en');

// ---- Maple Ridge Dental (Lumen Studio's prototype), as Dr. Whitfield sent it from the client portal
const base = `*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#12312e;background:#fff;-webkit-font-smoothing:antialiased}
  .mk{position:absolute;border:3px solid #e0263f;border-radius:50%;transform:rotate(-4deg)}
  .note{position:absolute;color:#e0263f;font-weight:600;font-size:17px;line-height:22px;transform:rotate(-3deg);text-shadow:0 0 3px #fff,0 0 3px #fff;font-family:"Segoe Print","Comic Sans MS",cursive}
  .ring{position:relative}.ring>.mk{inset:-10px -14px}
  .note.flow{position:relative;display:block}
  .logo{display:flex;align-items:center;gap:9px;font-weight:600;font-size:15px;color:#0f5f58}
  .logo i{width:30px;height:30px;border-radius:50%;background:#0f766e;color:#fff;display:grid;place-items:center;font-style:normal;font-size:12px;letter-spacing:.5px}`;
const ring = (html, inline) => `<div class="ring"${inline ? ' style="display:inline-block"' : ''}>${html}<div class="mk"></div></div>`;
const proto = (label) => `<div style="background:#2b2f36;color:#d7dbe0;font-size:12px;padding:7px 14px;display:flex;justify-content:space-between"><span>Prototype v1.0 · ${label}</span><span>Maple Ridge Dental</span></div>`;
const phone = (inner, bar) => `<style>${base}body{background:#e8eeed;padding:18px 0;display:flex;justify-content:center}
  .ph{width:380px;background:#fff;border-radius:30px;border:10px solid #15191d;overflow:hidden;position:relative;box-shadow:0 10px 30px #0003}
  .st{display:flex;justify-content:space-between;font-size:12px;padding:7px 18px;color:#12312e;background:#fff}</style>
  <div class="ph"><div class="st"><span>${bar}</span><span>▂▃▅ 5G · 61%</span></div>${inner}</div>`;
const browser = (url, inner, w) => `<div style="width:${w}px;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px #0002;background:#fff;position:relative">
  <div style="background:#eef1f3;padding:8px 12px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #dde2e5">
  <span style="display:flex;gap:6px"><i style="width:11px;height:11px;border-radius:50%;background:#f26b5e;display:block"></i><i style="width:11px;height:11px;border-radius:50%;background:#f5be4f;display:block"></i><i style="width:11px;height:11px;border-radius:50%;background:#5fc454;display:block"></i></span>
  <span style="flex:1;background:#fff;border-radius:6px;padding:4px 10px;font-size:12.5px;color:#4b5563">${url}</span></div>${inner}</div>`;
const field = (l, v, opt) => `<div style="margin:0 0 14px"><div style="font-size:13px;font-weight:500;margin:0 0 6px">${l}${opt ? ' <span style="color:#7a8d8a;font-weight:400">(optional)</span>' : ' <span style="color:#c2410c">*</span>'}</div><div style="border:1px solid #c9dad7;border-radius:10px;padding:11px 12px;font-size:14px;color:${v ? '#12312e' : '#93a5a2'}">${v || '&nbsp;'}</div></div>`;
const hero = `<div style="font-size:12.5px;color:#0f766e;font-weight:500;letter-spacing:.3px">FAMILY DENTISTRY · SOUTH AUSTIN</div>`;

// ---- Northstar Logistics (Fieldwork Studio's apps), as Laura sent them
const fb = 'body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#1f2933;background:#fff}';
const xl = (title, cols, rows, foot) => `<style>${fb}
  .bar{background:#1d6f42;color:#fff;padding:8px 14px;font-size:14px}.rib{background:#f3f3f3;border-bottom:1px solid #d6d6d6;padding:6px 14px;font-size:12px;color:#444}
  table{border-collapse:collapse;font-size:12.5px;margin:0}td,th{border:1px solid #d4d4d4;padding:4px 8px;white-space:nowrap}
  th{background:#eef1f4;font-weight:600}.n{background:#eef1f4;color:#666;text-align:center;width:28px}.bad{background:#fde2e1}
  .foot{margin:12px 14px;padding:9px 12px;background:#fff1f2;border-left:4px solid #dc2626;font-size:12.5px;color:#7f1d1d}</style>
  <div class="bar">${title}</div><div class="rib">Home &nbsp; Insert &nbsp; Page Layout &nbsp; Formulas &nbsp; Data &nbsp; Review &nbsp; View</div>
  <table><tr><th class="n"></th>${cols.map(c => '<th>' + c + '</th>').join('')}</tr>
  ${rows.map((r, i) => '<tr><td class="n">' + (i + 1) + '</td>' + r.map(c => '<td' + (String(c).startsWith('!') ? ' class="bad"' : '') + '>' + String(c).replace(/^!/, '') + '</td>').join('') + '</tr>').join('')}</table>${foot ? '<div class="foot">' + foot + '</div>' : ''}`;
const nphone = (inner, bar) => `<style>${fb}body{background:#e9edf1;display:flex;justify-content:center;padding:18px 0}
  .ph{width:340px;background:#fff;border-radius:26px;border:10px solid #1b1f24;overflow:hidden;box-shadow:0 8px 24px #0003}
  .st{display:flex;justify-content:space-between;font-size:11px;padding:6px 14px;background:#1e3a5f;color:#fff}
  .hd{background:#1e3a5f;color:#fff;padding:10px 14px 14px;font-size:16px;font-weight:600}.sub{font-size:12px;font-weight:400;opacity:.85}
  .row{display:flex;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #eee;font-size:14px}.row small{display:block;color:#6b7280;font-size:11.5px}
  .tot{padding:12px 14px;font-size:15px;font-weight:700;display:flex;justify-content:space-between;background:#fff7ed;color:#9a3412}
  .warn{margin:10px 14px;padding:9px 11px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12.5px;color:#991b1b}</style>
  <div class="ph"><div class="st"><span>${bar || '2:52'}</span><span>▂▃▅ LTE · 23%</span></div>${inner}</div>`;

// ---- Dewdrop Coffee & Tea's time clock, as Heather sent them from the Viewer portal
const dphone = (inner, bar, sig) => `<style>${fb}body{background:#fff;display:flex;justify-content:center;padding:14px 0;font-family:Georgia,"Times New Roman",serif}
  .ph{width:330px;height:600px;background:#fff;border-radius:26px;border:4px solid #2a2a2a;overflow:hidden;position:relative}
  .st{display:flex;justify-content:space-between;font-size:11px;padding:8px 18px;color:#555}
  h2{font-size:19px;margin:10px 18px 14px}.cd{margin:0 14px;border:1px solid #e6e6e6;border-radius:12px;padding:12px;box-shadow:0 1px 4px #0001}</style>
  <div class="ph"><div class="st"><span>${bar}</span><span>${sig}</span></div>${inner}</div>`;

const PICS = [
  { // CR-001, 3 Nov 20:03: does the booking form ask about medical conditions?
    name: '2026-11-03_200122.jpg', type: 'image/jpeg', w: 420, h: 745,
    html: phone(proto('Book · Step 2/4') + `<div style="padding:16px 18px 18px;position:relative">
      <div class="logo"><i>MR</i>Maple Ridge Dental</div>
      <div style="display:flex;gap:6px;margin:16px 0 6px">${[1, 2, 3, 4].map(n => `<span style="flex:1;height:5px;border-radius:3px;background:${n <= 2 ? '#0f766e' : '#d6e5e2'}"></span>`).join('')}</div>
      <div style="font-size:12.5px;color:#5f7471">Step 2 of 4 · Patient details</div>
      <h2 style="font-size:21px;line-height:28px;margin:6px 0 14px;font-weight:600">Who's coming in?</h2>
      <div style="display:flex;gap:8px;margin:0 0 16px"><span style="flex:1;text-align:center;padding:9px;border-radius:10px;background:#0f766e;color:#fff;font-size:13.5px">It's me</span><span style="flex:1;text-align:center;padding:9px;border-radius:10px;border:1px solid #c9dad7;font-size:13.5px">Booking for someone else</span></div>
      ${ring(field('Full name', 'Jessica Lane') + field('Mobile phone', '(512) 555-0134') + field('Email', '', true))}
      <div style="font-size:12.5px;color:#5f7471;line-height:18px;margin:14px 0 10px">We only use your phone number to confirm your appointment.</div>
      <div class="note flow" style="margin:6px 0 20px">Does this step ask about medical conditions? We don't want to ask about health right at the start.</div>
      <div style="display:flex;gap:10px"><span style="padding:12px 16px;border-radius:12px;border:1px solid #c9dad7;font-size:14px">Back</span><span style="flex:1;text-align:center;padding:12px;border-radius:12px;background:#0f766e;color:#fff;font-size:14px;font-weight:500">Continue</span></div>
    </div>`, '8:01')
  },
  { // CR-003, 3 Nov 20:13: a floating "Text us" button
    name: '2026-11-03_201148.jpg', type: 'image/jpeg', w: 420, h: 880,
    html: phone(proto('Home · mobile') + `<div style="position:relative;height:760px;background:linear-gradient(180deg,#eef8f6 0,#fff 62%)">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px"><div class="logo"><i>MR</i>Maple Ridge Dental</div><span style="font-size:22px;color:#0f5f58">☰</span></div>
      <div style="padding:18px 18px 0">${hero}
      <h1 style="font-size:27px;line-height:35px;margin:8px 0 10px;font-weight:600">Healthy smiles, gentle care</h1>
      <p style="font-size:14.5px;line-height:22px;color:#4a605d;margin:0 0 18px">Checkups, braces, implants. Book in a minute, and our front desk calls to confirm.</p>
      <div style="display:flex;flex-direction:column;gap:10px"><span style="text-align:center;padding:13px;border-radius:12px;background:#0f766e;color:#fff;font-size:15px;font-weight:500">Book a visit</span><span style="text-align:center;padding:13px;border-radius:12px;border:1.5px solid #0f766e;color:#0f766e;font-size:15px;font-weight:500">Call us · (512) 555-0187</span></div></div>
      <div style="margin:22px 18px 0;border-radius:16px;height:150px;background:linear-gradient(135deg,#cfe9e4,#e9f5f2);display:grid;place-items:center;color:#5f8a84;font-size:13px">Office photo (waiting on real photos)</div>
      <div style="display:flex;gap:10px;margin:16px 18px 0">${['Checkups', 'Braces', 'Implants'].map(t => `<span style="flex:1;font-size:12.5px;padding:10px 8px;border-radius:10px;background:#f2f7f6;text-align:center">${t}</span>`).join('')}</div>
      <div style="position:absolute;right:16px;bottom:22px;width:58px;height:58px;border-radius:50%;border:2.5px dashed #e0263f;display:grid;place-items:center;color:#e0263f;font-weight:600;font-size:12px;background:#fff8;text-align:center;line-height:14px">Text<br>us</div>
      <div class="mk" style="right:2px;bottom:8px;width:88px;height:88px"></div>
      <div class="note" style="right:112px;bottom:26px;width:220px;text-align:right">Add a floating Text us button here, tap it and it opens a text to the office</div>
    </div>`, '8:11')
  },
  { // Milestone UX/UI design, step 3 (Tab through the form): the Book button is hard to read
    name: '2026-11-03_194916.jpg', type: 'image/jpeg', w: 1100, h: 640,
    html: `<style>${base}body{background:#dfe6e5;padding:22px}</style>` + browser('Prototype v1.0 · Home · desktop 1280', `${proto('Home · desktop')}
      <div style="position:relative;background:linear-gradient(180deg,#eef8f6,#fff);height:510px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 34px;border-bottom:1px solid #e3eeec"><div class="logo"><i>MR</i>Maple Ridge Dental</div>
      <div style="display:flex;gap:26px;font-size:14px;color:#3f5653">${['Services', 'Our Dentists', 'Pricing', 'Patient Resources', 'Contact'].map(t => `<span>${t}</span>`).join('')}</div>
      ${ring('<span style="display:inline-block;padding:10px 18px;border-radius:10px;background:#a9e0d7;color:#fff;font-size:14px;font-weight:500;outline:1.5px solid #c8ece6;outline-offset:2px">Book a visit</span>', true)}</div>
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:40px;padding:50px 34px 0">
      <div>${hero}
      <h1 style="font-size:40px;line-height:50px;margin:10px 0 14px;font-weight:600">Healthy smiles,<br>gentle care</h1>
      <p style="font-size:16px;line-height:25px;color:#4a605d;margin:0 0 24px;max-width:440px">Checkups, braces, implants. Book in a minute, and our front desk calls to confirm.</p>
      <div style="display:flex;gap:22px;align-items:center">${ring('<span style="display:inline-block;padding:14px 22px;border-radius:12px;background:#a9e0d7;color:#fff;font-size:15.5px;font-weight:500;outline:1.5px solid #c8ece6;outline-offset:3px">Book a visit</span>', true)}<span style="padding:14px 22px;border-radius:12px;border:1.5px solid #0f766e;color:#0f766e;font-size:15.5px;font-weight:500">Call us</span></div>
      <div class="note flow" style="margin:26px 0 0;width:440px">Tab to the Book button: white text on light teal, you can barely read it</div></div>
      <div style="border-radius:20px;height:300px;background:linear-gradient(135deg,#cfe9e4,#e9f5f2);display:grid;place-items:center;color:#5f8a84;font-size:14px">Dentist photo (waiting on real photos)</div></div>
      <div class="note" style="right:34px;top:76px">same with the top button</div>
      </div>`, 1056)
  },
  { // Milestone Public website + CMS, step 2: Saturday hours changed in the CMS, the Contact page did not follow
    name: '2026-11-04_094802.jpg', type: 'image/jpeg', w: 1280, h: 640,
    html: `<style>${base}body{background:#dfe6e5;padding:22px;display:flex;gap:20px;align-items:flex-start}
      .row{display:grid;grid-template-columns:150px 1fr 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1f0;font-size:13.5px}
      .in{border:1px solid #cfd8d6;border-radius:8px;padding:7px 10px;font-size:13.5px}
      .hr{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e6efed;font-size:15px}</style>` +
      browser('staging.mapleridgedental.example/admin/office-hours', `<div style="display:flex;height:540px">
      <div style="width:150px;background:#0f3e3a;color:#cfe6e2;font-size:13px;padding:16px 14px;line-height:30px"><div style="color:#fff;font-weight:600;margin-bottom:8px">Admin</div>Appointments<br>Services<br>Dentists<br><b style="color:#fff">Office hours</b><br>Contact<br>Posts</div>
      <div style="flex:1;padding:20px 22px;position:relative"><h3 style="margin:0 0 4px;font-size:18px;font-weight:600">Office hours</h3><div style="font-size:12.5px;color:#5f7471;margin-bottom:12px">Shown on the Contact page and in the footer</div>
      <div class="row" style="color:#5f7471;font-size:12px"><span>Day</span><span>Opens</span><span>Closes</span></div>
      ${[['Monday – Friday', '8:00 AM', '7:00 PM'], ['Saturday', '8:00 AM', '12:00 PM'], ['Sunday', 'Closed', '']].map(r => { const h = `<div class="row"><span>${r[0]}</span><span class="in">${r[1]}</span><span class="in"${r[0] === 'Saturday' ? ' style="border-color:#0f766e;background:#f0faf8"' : ''}>${r[2] || '&nbsp;'}</span></div>`; return r[0] === 'Saturday' ? ring(h) : h; }).join('')}
      <div style="display:flex;gap:10px;align-items:center;margin-top:16px"><span style="padding:9px 16px;border-radius:8px;background:#0f766e;color:#fff;font-size:13.5px">Save</span><span style="font-size:12.5px;color:#15803d">✓ Saved at 9:46 AM</span></div>
      <div class="note flow" style="margin:26px 0 0">Changed Saturday to 8–12 and hit Save</div></div></div>`, 600) +
      browser('staging.mapleridgedental.example/contact', `<div style="padding:22px 26px;height:540px;position:relative;background:linear-gradient(180deg,#eef8f6,#fff 40%)">
      <div class="logo" style="margin-bottom:18px"><i>MR</i>Maple Ridge Dental</div>
      <h2 style="font-size:26px;margin:0 0 6px;font-weight:600">Contact us</h2><div style="font-size:14px;color:#4a605d;line-height:22px;margin-bottom:16px">4100 Maple Ridge Dr, Suite 120, Austin, TX 78704<br>(512) 555-0187 · hello@mapleridgedental.example</div>
      <div style="font-weight:600;font-size:15px;margin:0 0 4px">Office hours</div>
      <div class="hr"><span>Monday – Friday</span><span>8:00 AM – 7:00 PM</span></div>
      ${ring('<div class="hr"><span>Saturday</span><span>8:00 AM – 5:00 PM</span></div>')}
      <div class="hr"><span>Sunday</span><span>Closed</span></div>
      <div class="note flow" style="margin:18px 0 0;text-align:right">Reloaded and Contact still says 8–5</div>
      <div style="margin-top:16px;border-radius:12px;height:110px;background:#e6efed;display:grid;place-items:center;color:#7a8d8a;font-size:13px">Map</div></div>`, 620)
  },

  { // CR-002: COD paid by app transfer to the driver's own account
    name: 'zelle-payment.jpg', type: 'image/jpeg', w: 420, h: 470,
    html: `<style>${fb}body{display:flex;justify-content:center;padding:20px;background:#f4f6f8}
      .c{width:360px;background:#fff;border-radius:14px;padding:22px 20px;text-align:center;box-shadow:0 2px 10px #0002}
      .ok{width:58px;height:58px;border-radius:50%;background:#16a34a;color:#fff;font-size:30px;display:grid;place-items:center;margin:4px auto 12px}
      h3{margin:0;font-size:18px}.amt{font-size:34px;font-weight:700;margin:10px 0 4px}p{margin:5px 0;font-size:13px;color:#374151}
      .ln{display:flex;justify-content:space-between;border-top:1px solid #eee;padding:9px 2px;font-size:13px;text-align:left}</style>
      <div class="c"><div style="font-size:12px;color:#6b7280;margin-bottom:10px">Sample Bank · Send money</div><div class="ok">✓</div><h3>Payment sent</h3>
      <div class="amt">$185.00</div><p>to <b>LUIS M. (SAMPLE)</b> · (614) 555-0119</p>
      <div style="margin-top:14px"><div class="ln"><span>Memo</span><b>NS-10229 delivery</b></div><div class="ln"><span>Sent</span><b>Nov 8 · 9:16 AM</b></div><div class="ln"><span>From</span><b>Checking ••0000</b></div></div>
      <p style="color:#6b7280;margin-top:12px">Illustration only, not a real account. The customer paid the driver's personal account at the door.</p></div>`
  },
  { // CR-003: Harvest Market's order file, one row per package
    name: 'grocery-order-file.jpg', type: 'image/jpeg', w: 980, h: 340,
    html: xl('HarvestMarket_Orders_Nov.xlsx - Excel',
      ['Store order #', 'Package #', 'Receiving store', 'Address', 'Window', 'Lb', 'COD'],
      [['HM-88213', 'HM-88213-01', 'Harvest Market Clintonville', '18 Sample St, Columbus, OH', '6:00–9:00 AM', '93.7', '0'],
       ['HM-88213', 'HM-88213-02', 'Harvest Market Clintonville', '18 Sample St, Columbus, OH', '6:00–9:00 AM', '83.8', '0'],
       ['HM-88213', 'HM-88213-03', 'Harvest Market Clintonville', '18 Sample St, Columbus, OH', '6:00–9:00 AM', '88.4', '0'],
       ['HM-88214', 'HM-88214-01', 'Harvest Market Grandview', '5 Example Ave, Grandview, OH', '1:00–3:00 PM', '121.3', '0'],
       ['HM-88214', 'HM-88214-02', 'Harvest Market Grandview', '5 Example Ave, Grandview, OH', '1:00–3:00 PM', '112.9', '0'],
       ['HM-88215', 'HM-88215-01', 'Harvest Market Dublin', '90 Sample Rd, Dublin, OH', '9:00–11:00 PM', '138.2', '0'],
       ['', '', '', '', '', '', ''], ['One row per package · 3 orders = 6 rows', '', '', '', '', '', '']])
  },
  { // CR-009: the restricted hours chart taped up in dispatch
    name: 'restricted-hours.jpg', type: 'image/jpeg', w: 800, h: 360,
    html: `<style>${fb}body{background:#efe9dc;padding:22px}
      .p{background:#fffdf7;padding:18px 22px;box-shadow:0 3px 12px #0003;transform:rotate(-1.2deg);font-family:"Times New Roman",serif}
      h2{text-align:center;margin:0 0 4px;font-size:19px}h4{text-align:center;margin:0 0 12px;font-weight:400;font-size:13px}
      table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #333;padding:6px 8px}th{background:#eee}
      .pen{color:#1d4ed8;font-family:"Segoe Print","Comic Sans MS",cursive;font-size:13px}</style><div class="p">
      <h2>TRUCK RESTRICTED HOURS · DISPATCH</h2><h4>Northstar Logistics internal copy (illustration) · posted at the Groveport warehouse</h4>
      <table><tr><th>Truck class</th><th>Area</th><th>No driving</th><th>Notes</th></tr>
      <tr><td>Up to 10,000 lb GVWR</td><td>Downtown loop</td><td>7–9 AM · 4–6 PM</td><td>Permit holders follow their permit</td></tr>
      <tr><td>10,001 to 26,000 lb</td><td>Short North, German Village</td><td>6 AM–9 PM</td><td class="pen">11 trucks have downtown permits</td></tr>
      <tr><td>Over 26,000 lb</td><td>Residential streets</td><td>No through trips</td><td>Nights only</td></tr>
      <tr><td colspan="4" class="pen">→ Check against the city's new truck route map before releasing routes! (Mike)</td></tr></table></div>`
  },
  { // Milestone Dispatch web app, step 3: the error file opens garbled in Excel
    name: 'excel-garbled.jpg', type: 'image/jpeg', w: 900, h: 300,
    html: xl('import-errors-NSL-1108.csv - Excel',
      ['Row', 'Column', 'Error', 'Value'],
      [['12', 'delivery_address', '!MissingÂ addressÂ â€“Â row 12', ''], ['27', 'delivery_address', '!MissingÂ addressÂ â€“Â row 27', ''],
       ['31', 'delivery_phone', '!InvalidÂ phoneÂ numberÂ â€“Â (614)Â 55x', '(614) 55x'], ['44', 'delivery_address', '!MissingÂ addressÂ â€“Â row 44', ''],
       ['58', 'package_count', '!MustÂ beÂ aÂ wholeÂ numberÂ â‰¥Â 1', '0'], ['61', 'delivery_address', '!MissingÂ addressÂ â€“Â row 61', '']])
  },
  { // Milestone Android driver app, step 5: one order's COD logged twice after a Resend
    name: 'cod-twice.jpg', type: 'image/jpeg', w: 420, h: 470,
    html: nphone(`<div class="hd">COD · morning shift · 11/8<div class="sub">Driver: Hank Miller (sample) · Truck #418</div></div>
      <div class="row"><span>NS-10229<small>12 Sample Ave, Short North · 9:14 AM</small></span><b>$120.00</b></div>
      <div class="row"><span>NS-10234<small>7 Example St, Short North · 10:02 AM</small></span><b>$185.00</b></div>
      <div class="row" style="background:#fff1f2"><span>NS-10234<small>7 Example St, Short North · 10:02 AM · Resent</small></span><b>$185.00</b></div>
      <div class="row"><span>NS-10240<small>3 Sample Ct, Short North · 10:41 AM</small></span><b>$65.00</b></div>
      <div class="tot"><span>COD to turn in</span><span>$555.00</span></div>
      <div class="warn">⚠ Weak signal at 10:02 AM. Resend tapped once.</div>`, '10:52')
  },
  { // warranty bug: deliveries at 11:40 PM land in the next day's COD report
    name: 'cod-report-off.jpg', type: 'image/jpeg', w: 940, h: 330,
    html: xl('COD_Report_Daily_11-09.xlsx - Excel',
      ['Report date', 'Order #', 'Driver', 'Delivered (app)', 'COD', 'Accounting ledger'],
      [['11/09', 'NS-11802', 'Luis (sample)', '11/09 5:20 PM', '$95.00', '11/09'],
       ['11/09', 'NS-11807', 'Luis (sample)', '11/09 7:05 PM', '$180.00', '11/09'],
       ['!11/10', 'NS-11811', 'Hank (sample)', '!11/09 11:40 PM', '$230.00', '!11/09'],
       ['!11/10', 'NS-11812', 'Hank (sample)', '!11/09 11:55 PM', '$65.00', '!11/09'],
       ['11/10', 'NS-11830', 'Luis (sample)', '11/10 8:12 AM', '$110.00', '11/10'],
       ['', '', '', 'Total for 11/09', '$275.00', '!Ledger: $570.00']])
  },
  { // warranty bug: the app crashes taking a POD photo on a 3 GB phone
    name: 'pod-crash.jpg', type: 'image/jpeg', w: 420, h: 600,
    html: nphone(`<div class="hd">Delivery · NS-12044<div class="sub">Stop 6/14 · 21 Sample Ave, Hilltop</div></div>
      <div style="height:250px;background:#2d3748;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:13px">Camera · take POD photo</div>
      <div style="position:relative;margin:-150px 22px 0;background:#fff;border-radius:12px;padding:16px;box-shadow:0 6px 20px #0005">
      <b style="font-size:15px">Northstar Driver keeps stopping</b><p style="font-size:13px;color:#4b5563;margin:8px 0 14px">The app has stopped again.</p>
      <div style="font-size:13.5px;line-height:2.1;color:#1e3a5f"><div>ⓘ App info</div><div>✕ Close app</div></div></div>
      <div style="height:140px"></div><div class="warn">Galaxy A05 (sample) · 3 GB RAM</div>`, '2:52')
  },

  { // Heather's bug from the Viewer portal: the lower-level mall store is "outside the clock-in area"
    name: 'gps-lower-level.png', type: 'image/png', w: 360, h: 630,
    html: dphone(`<h2>Today</h2><div class="cd"><div style="font-size:13px;color:#444">Morning shift · 8:00 AM – 2:00 PM · Westside Mall (LL)</div>
      <div style="position:relative;height:120px;margin:12px 0;border-radius:8px;background:repeating-linear-gradient(135deg,#eef0f3 0 10px,#e3e6ea 10px 20px)">
      <div style="position:absolute;left:58px;top:24px;width:66px;height:66px;border-radius:50%;border:2px dashed #3b5bdb"></div><div style="position:absolute;right:30px;top:16px;width:12px;height:12px;border-radius:50%;background:#e03131"></div></div>
      <div style="background:#fff1f1;color:#9b1c1c;font-size:13px;padding:9px 10px;border-radius:8px;margin-bottom:12px"><b>Outside the clock-in area</b><br>712 ft from the store · GPS accuracy ±590 ft</div>
      <div style="background:#9aa1ab;color:#fff;text-align:center;padding:11px;border-radius:10px;font-size:15px;font-weight:600">Clock in</div></div>`, '7:58', 'LTE ▮▯▯')
  },
  { // Heather's bug: two people share one phone, the confirm goes to whoever signed in first
    name: 'shared-phone.png', type: 'image/png', w: 360, h: 630,
    html: dphone(`<h2>Announcements</h2><div class="cd"><div style="font-size:11.5px;letter-spacing:.5px;color:#b45309;font-weight:700">NEEDS A CONFIRM</div>
      <div style="font-size:16px;font-weight:700;margin:4px 0 6px">Closing early today for the storm</div>
      <div style="font-size:13px;color:#444;line-height:18px">The afternoon shift is off from 5 PM. Store managers lock up by 5:30 PM.</div>
      <div style="background:#ecfdf3;color:#166534;font-size:13px;padding:9px 10px;border-radius:8px;margin-top:12px">✓ Confirmed · <b>Ana Lopez</b> · 2:31 PM</div></div>
      <div style="font-size:12.5px;color:#555;margin:14px 18px 8px">Signed in: <b>Ana Lopez</b> (ID 0012)</div>
      <div style="font-size:12.5px;color:#333;margin:0 14px;background:#f3f4f6;padding:9px 10px;border-radius:8px">Holding the phone now: Marcus Hill (0013)</div>`, '2:32', '5G ▮▮▮')
  },
  { // Heather's bug: the Employee ID column is a number, so 0012 became 12
    name: 'excel-employee-id.png', type: 'image/png', w: 760, h: 420,
    html: `<style>${fb}body{font-family:Georgia,"Times New Roman",serif}.bar{background:#1d6f42;color:#fff;padding:8px 14px;font-size:14px}.fx{padding:6px 14px;font-size:13px;border-bottom:1px solid #ddd}
      table{border-collapse:collapse;font-size:13px;width:100%}td,th{border:1px solid #d9d9d9;padding:6px 10px}th{background:#f2f2f2;font-weight:400;color:#555}.n{width:28px;text-align:center;color:#666;background:#f2f2f2}
      .r{text-align:right;background:#fff7ed;color:#b45309}.foot{margin:16px 14px;padding:10px 12px;background:#fff1f2;border-left:4px solid #dc2626;font-size:13px;color:#7f1d1d}</style>
      <div class="bar">Staff_Dewdrop_Nov.xlsx · Excel</div><div class="fx"><b>fx</b> &nbsp;12</div>
      <table><tr><th class="n"></th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr>
      <tr><td class="n">2</td><td><b>Employee ID</b></td><td><b>Name</b></td><td><b>Store</b></td><td><b>Job title</b></td><td><b>Status</b></td></tr>
      ${[['12', 'Ana Lopez', 'Echo Park', 'Barista'], ['13', 'Marcus Hill', 'Echo Park', 'Cashier'], ['27', 'Priya Shah', 'Silver Lake', 'Barista'], ['31', 'Kevin Tran', 'Westside Mall', 'Server'], ['108', 'Dana Brooks', 'Westside Mall', 'Shift lead']].map((r, i) => `<tr><td class="n">${i + 3}</td><td class="r">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>Active</td></tr>`).join('')}
      <tr><td class="n">8</td><td>0145</td><td>Sam Ortiz</td><td>Highland Park</td><td>Barista</td><td>Active</td></tr></table>
      <div class="foot">Import result: <b>37 rows with errors</b> · "ID not found": 12, 13, 27, 31, 108… (Employee ID column formatted as Number)</div>`
  },
  { // Heather's bug: a merged title row makes the import fail on row 1
    name: 'import-row-1.png', type: 'image/png', w: 760, h: 380,
    html: `<style>${fb}body{font-family:Georgia,"Times New Roman",serif;background:#f7f7f8}.bar{background:#22262e;color:#fff;padding:10px 16px;font-size:14px}
      .c{margin:12px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px}table{border-collapse:collapse;font-size:12.5px}td{border:1px solid #d9d9d9;padding:6px 12px}
      .b{display:inline-block;padding:8px 14px;border-radius:8px;font-size:13px;margin-right:8px}</style>
      <div class="bar">HR Time Clock App · Import employees</div><div style="margin:12px 16px 0;font-size:13px;color:#555">Step 2 of 4 · Pick the sheet and the header row</div>
      <div class="c"><div style="font-size:13.5px;margin-bottom:10px"><b>Sheet: Staff Nov</b> &nbsp;·&nbsp; Header row: <b>3</b></div>
      <div style="background:#fff1f1;color:#9b1c1c;padding:10px 12px;border-radius:8px;font-size:14px;margin-bottom:12px"><b>Can't read the file.</b> Error on row 1.</div>
      <table><tr><td colspan="4" style="background:#f3f4f6"><b>STAFF LIST · NOVEMBER</b> <span style="color:#777">(merged A1:D1)</span></td></tr>
      <tr><td colspan="4">Dewdrop Coffee &amp; Tea · Human Resources</td></tr><tr><td><b>Employee ID</b></td><td><b>Name</b></td><td><b>Store</b></td><td><b>Job title</b></td></tr></table>
      <div style="margin-top:14px"><span class="b" style="background:#e5e7eb">Back</span><span class="b" style="background:#c7cbd1;color:#fff">Continue</span></div></div>`
  }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await PW.chromium.launch();
  const out = {};
  for (const pic of PICS) {
    const p = await b.newPage({ viewport: { width: pic.w, height: pic.h }, deviceScaleFactor: 1 });
    await p.setContent('<!doctype html><meta charset="utf-8">' + pic.html);
    await p.evaluate(() => document.fonts.ready);
    const jpg = pic.type === 'image/png';
    const buf = await p.screenshot(jpg ? { type: 'png' } : { type: 'jpeg', quality: 86 });
    fs.writeFileSync(path.join(OUT, pic.name), buf);
    // the app's small copy, as vpThumbs makes it (54-viewer-portal): at most 480px, webp 0.7, jpeg 0.6 when that is over 60000
    const d = await p.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let u = c.toDataURL('image/webp', 0.7); if (u.length > 60000) u = c.toDataURL('image/jpeg', 0.6); return u;
    }, 'data:' + pic.type + ';base64,' + buf.toString('base64'));
    out[pic.name] = { type: pic.type, size: buf.length, sha: crypto.createHash('sha256').update(buf).digest('hex'), d };
    console.log(pic.name + ': ' + buf.length + ' bytes, small copy ' + d.length + ' chars');
    await p.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'pics.json'), JSON.stringify(out, null, 1) + '\n');
  console.log('wrote ' + PICS.length + ' pictures; now py tools/sample_en.py make, then build.py');
})().catch(e => { console.log('ERROR ' + e.stack); process.exit(2); });
