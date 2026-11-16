// A throw-away api.php server for the tests: a fresh MySQL / MariaDB database, the files it needs in a temporary folder, PHP's
// own web server on a port, mail written to an outbox file. Needs PHP 8.1+ with pdo_mysql and a database server.
// SD_PHP (php), SD_PHP_EXT (an extension_dir to load pdo_mysql, openssl and mbstring from), SD_MYSQL_BIN (the folder of mysql and
// mysqldump), SD_DB_USER (root), SD_SCHEMA_DB (a database with the site's users and admin_notifications tables, to copy).
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync, spawn } = require('child_process');
module.exports = async function start(o) {
  o = o || {};
  const ROOT = o.root, PORT = o.port || 8097, DB = o.db || 'sd_viewer_test', USER = process.env.SD_DB_USER || 'root';
  const PHP = process.env.SD_PHP || 'php', EXT = process.env.SD_PHP_EXT || '', BIN = process.env.SD_MYSQL_BIN || '';
  const my = (args, input) => execFileSync(path.join(BIN, 'mysql'), ['-h', '127.0.0.1', '-u', USER].concat(args), { input });
  /* keep: the database as it is (a server started again on the same data, t_api127 for 133) */
  if (!o.keep) {
    my(['-e', 'DROP DATABASE IF EXISTS ' + DB + '; CREATE DATABASE ' + DB + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci']);
    my([DB], execFileSync(path.join(BIN, 'mysqldump'), ['-h', '127.0.0.1', '-u', USER, '--no-data', '--skip-comments', process.env.SD_SCHEMA_DB || 'scopedue', 'users', 'admin_notifications']));
  }
  const SRV = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-php-')), OUT = path.join(SRV, 'outbox.jsonl');
  (o.files || ['api.php']).forEach(rel => {
    const src = path.join(ROOT, rel), dst = path.join(SRV, rel);
    if (fs.statSync(src).isDirectory()) fs.cpSync(src, dst, { recursive: true }); else { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
  });
  fs.writeFileSync(OUT, '');
  const env = Object.assign({}, process.env, { SCOPEDUE_TEST: '1', SCOPEDUE_MAIL: 'file', SCOPEDUE_OUTBOX: OUT, SCOPEDUE_DB_HOST: '127.0.0.1', SCOPEDUE_DB_NAME: DB, SCOPEDUE_DB_USER: USER });
  const args = (EXT ? ['-d', 'extension_dir=' + EXT, '-d', 'extension=pdo_mysql', '-d', 'extension=openssl', '-d', 'extension=mbstring'] : []).concat(['-S', '127.0.0.1:' + PORT, '-t', SRV]);
  const php = spawn(PHP, args, { env, stdio: 'ignore', windowsHide: true });
  const base = 'http://127.0.0.1:' + PORT + '/', api = base + 'api.php';
  for (let i = 0; i < 60; i++) { try { const r = await fetch(api + '?r=/v1/health'); if (r.ok) break; } catch (e) {} await new Promise(r => setTimeout(r, 200)); }
  async function call(key, m, p, body) {
    const r = await fetch(api + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { j = t; }
    return { s: r.status, j };
  }
  const mails = () => fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const lastTo = to => mails().reverse().find(m => m.to === to);
  async function account(name, email) {
    const r = await call(null, 'POST', '/v1/studios', { name, email, password: 'a-long-pass-70', password_confirm: 'a-long-pass-70' });
    if (!lastTo(email)) throw new Error('sign-up: ' + JSON.stringify(r));
    const code = lastTo(email).body.match(/\b\d{6}\b/)[0];
    return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
  }
  /* api.php 1.31.4 (CONTRACT 136): a portal link is only emailed, never handed to the studio. This sends it and reads it back from the
     outbox, as the client opens it from their inbox; the answer is the same { s, j } with j.url added */
  async function link(key, body) {
    const n0 = mails().length;
    const r = await call(key, 'POST', '/v1/links', Object.assign({}, body, { send: true }));
    const m = mails().slice(n0).reverse().find(x => /#s=[a-z0-9]+&k=sdl_/.test(x.body));
    if (r.s < 300 && m) r.j.url = m.body.match(/https?:\/\/\S+#s=[a-z0-9]+&k=sdl_[A-Za-z0-9_-]+/)[0];
    return r;
  }
  return { base, api, srv: SRV, db: DB, my, call, mails, lastTo, account, link, stop: () => { try { php.kill(); } catch (e) {} } };
};
