// For testing the client portal by hand (tests/PORTAL-KICH-BAN-TEST.md): a fresh local api.php on :8096 in test mode, a studio
// with three clients in different states, their portal links printed, then every email the server writes (codes, links, notes)
// printed as it arrives. Ctrl+C stops the server. Run from the release folder: node tests/portal-local.js
// Paths default to Laragon on this machine; set SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN to change them. The database is sd_portal_local
// (dropped and made again each run), with the site's users + admin_notifications structure copied from the local `scopedue` DB.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync, spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const PHP = process.env.SD_PHP || 'C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe';
const EXT = process.env.SD_PHP_EXT || path.dirname(PHP) + '/ext';
const BIN = process.env.SD_MYSQL_BIN || 'C:/laragon/bin/mysql/mariadb-11.8.3-winx64/bin/';
const DB = 'sd_portal_local', PORT = 8096, API = 'http://127.0.0.1:' + PORT + '/api.php';
const SRV = path.join(os.tmpdir(), 'scopedue-portal-local'), OUT = path.join(SRV, 'outbox.jsonl');
const DAY = 86400000, d = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

const mails = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
async function call(key, m, p, body) {
  const r = await fetch(API + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (r.status >= 300) throw new Error(m + ' ' + p + ' → ' + r.status + ' ' + JSON.stringify(j));
  return j;
}
/* api.php 1.31.4 (CONTRACT 136): a portal link is only emailed, never handed to the studio: send it, read it from the outbox */
async function mailLink(key, body) {
  const n0 = mails().length;
  await call(key, 'POST', '/v1/links', Object.assign({}, body, { send: true }));
  const m = mails().slice(n0).reverse().find(x => /&k=sdl_/.test(x.body));
  return m.body.match(/https?:\/\/\S+#s=[a-z0-9]+&k=sdl_[A-Za-z0-9_-]+/)[0];
}
const codeFor = email => mails().reverse().find(x => x.to === email).body.match(/\b\d{6}\b/)[0];
const RULES = { dep: 20, pd: 7, rpm: 2, free: 1, rate: 50, min: 1, review: 3, silence: 5, dormant: 30, cure: 5, own: 1, meth: 'Chuyển khoản', doc: '' };

function startServer() {
  fs.rmSync(SRV, { recursive: true, force: true }); fs.mkdirSync(SRV, { recursive: true });
  require('./deploy')(ROOT, SRV); fs.writeFileSync(OUT, '');
  const my = (args, input) => execFileSync(BIN + 'mysql', ['-h', '127.0.0.1', '-u', 'root'].concat(args), { input });
  my(['-e', 'DROP DATABASE IF EXISTS ' + DB + '; CREATE DATABASE ' + DB + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci']);
  my([DB], execFileSync(BIN + 'mysqldump', ['-h', '127.0.0.1', '-u', 'root', '--no-data', '--skip-comments', 'scopedue', 'users', 'admin_notifications']));
  const env = Object.assign({}, process.env, { SCOPEDUE_TEST: '1', SCOPEDUE_MAIL: 'file', SCOPEDUE_OUTBOX: OUT, SCOPEDUE_DB_HOST: '127.0.0.1', SCOPEDUE_DB_NAME: DB, SCOPEDUE_DB_USER: 'root' });
  return spawn(PHP, ['-d', 'extension_dir=' + EXT, '-d', 'extension=pdo_mysql', '-d', 'extension=openssl', '-d', 'extension=mbstring', '-S', '127.0.0.1:' + PORT, '-t', SRV], { env, stdio: 'ignore', windowsHide: true });
}

async function seed() {
  const PW = 'portal-local-123', email = 'studio@example.com';
  const r = await call(null, 'POST', '/v1/studios', { name: 'Robert Studio', email, password: PW, password_confirm: PW });
  const key = (await call(null, 'POST', '/v1/studios/verify', { challenge: r.challenge, code: codeFor(email) })).key;
  await call(key, 'PUT', '/v1/studio', { lang: 'vi', biz: 'Robert Studio', title: 'Thiết kế web', city: 'Hà Nội', bio: 'Thiết kế website cho doanh nghiệp nhỏ.' });
  const scope = (pref, items) => call(key, 'POST', '/v1/projects/' + pref + '/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: RULES }, items });
  const plan = [
    { id: 'm1', sec: 'tl', t: 'Bản thiết kế', d: d(5), pay: 40 }, { id: 'm2', sec: 'tl', t: 'Bàn giao', d: d(20), pay: 40 },
    { id: 'a', sec: 'in', t: 'Trang chủ', ok: 'Hiển thị đúng trên điện thoại', m: 'm1' }, { id: 'b', sec: 'in', t: 'Trang sản phẩm', m: 'm2' },
    { id: 'c', sec: 'out', t: 'Viết nội dung' }, { id: 'ci1', sec: 'ci', t: 'Logo và ảnh sản phẩm', d: d(2) }];

  // A: a Scope waiting for approval (kịch bản phần 2)
  await call(key, 'PUT', '/v1/clients/anphat', { name: 'Công ty An Phát', contact: 'Minh', email: 'minh@anphat.example', lang: 'vi' });
  await call(key, 'PUT', '/v1/projects/web', { client: 'anphat', name: 'Website mới', phase: 2 });
  await scope('web', plan);

  // B: Scope approved, a quote waiting, a question answered, the first milestone delivered (kịch bản phần 3, 4)
  await call(key, 'PUT', '/v1/clients/bloom', { name: 'Bloom Café', contact: 'Lan', email: 'lan@bloom.example', lang: 'vi' });
  await call(key, 'PUT', '/v1/projects/brand', { client: 'bloom', name: 'Nhận diện thương hiệu', phase: 3 });
  await scope('brand', plan);
  await call(key, 'PUT', '/v1/projects/menu', { client: 'bloom', name: 'Menu in', phase: 1 });
  await scope('menu', [{ id: 'm1', sec: 'tl', t: 'Bản in', d: d(10), pay: 80 }, { id: 'a', sec: 'in', t: 'Menu 2 mặt', m: 'm1' }]);
  const link0 = (await mailLink(key, { client: 'bloom' }));
  const sess = (await call(null, 'POST', '/v1/session', { token: link0.split('&k=')[1] })).session;
  const c = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'brand', v: 1 });
  await call(sess, 'POST', '/v1/approve', { challenge: c.challenge, code: codeFor('lan@bloom.example') });
  await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'brand', title: 'Thêm bộ icon', tx: 'Mình cần thêm 10 icon cho mạng xã hội.' });
  await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'brand', tx: 'Font chữ có dùng được cho in ấn không?' });
  await call(key, 'POST', '/v1/projects/brand/requests/CR-001/entries', { n: 1, ty: 'quote', tx: '10 icon theo phong cách logo.', amt: 300, days: 3, vu: Date.now() + 7 * DAY });
  await call(key, 'POST', '/v1/projects/brand/requests/CR-002/entries', { n: 1, ty: 'note', tx: 'Có, font có giấy phép in ấn.' });
  await call(key, 'POST', '/v1/projects/brand/events', { n: 0, ty: 'deliver', m: 'm1', tx: 'Bản thiết kế đầu tiên đây ạ.', link: 'https://example.com/ban-thiet-ke' });
  await call(sess, 'DELETE', '/v1/session');

  // C: a client in English (kịch bản phần 5)
  await call(key, 'PUT', '/v1/clients/acme', { name: 'Acme Ltd', contact: 'Tom', email: 'tom@acme.example', lang: 'en' });
  await call(key, 'PUT', '/v1/projects/site', { client: 'acme', name: 'Online store', phase: 2 });
  await scope('site', plan);

  const links = {};
  for (const [cref, pref] of [['anphat', 'web'], ['bloom', 'brand'], ['acme', 'site']]) links[cref] = (await mailLink(key, { client: cref, project: pref }));
  return links;
}

(async () => {
  const php = startServer();
  const stop = () => { try { php.kill(); } catch (e) {} process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  let up = false;
  for (let i = 0; i < 50 && !up; i++) { try { up = (await fetch(API + '?r=/v1/health')).ok; } catch (e) {} if (!up) await new Promise(r => setTimeout(r, 200)); }
  if (!up) { console.error('api.php did not start on :' + PORT + ' (is another server using the port?)'); stop(); }
  const links = await seed();
  console.log('\nServer: ' + API + '   (Ctrl+C để dừng)\n');
  console.log('A · An Phát (Phạm vi chờ duyệt, tiếng Việt):\n  ' + links.anphat + '\n');
  console.log('B · Bloom Café (đã duyệt, có báo giá, câu hỏi, bàn giao chờ xem, 2 dự án):\n  ' + links.bloom + '\n');
  console.log('C · Acme (khách tiếng Anh):\n  ' + links.acme + '\n');
  console.log('Portal mẫu không cần server: http://127.0.0.1:' + PORT + '/portal.html?demo\n');
  console.log('Email server gửi sẽ hiện bên dưới (mã 6 số, link mới, thông báo cho studio):\n');
  let seen = mails().length;
  setInterval(() => {
    const all = mails();
    for (const m of all.slice(seen)) {
      const code = (m.body.match(/\b\d{6}\b/) || [])[0], url = (m.body.match(/https?:\/\/\S+#s=\S+/) || [])[0];
      console.log(new Date().toLocaleTimeString() + '  → ' + m.to + '  "' + m.subject + '"' + (code ? '\n    MÃ: ' + code : '') + (url ? '\n    LINK: ' + url : ''));
    }
    seen = all.length;
  }, 700);
})().catch(e => { console.error(e); process.exit(1); });
