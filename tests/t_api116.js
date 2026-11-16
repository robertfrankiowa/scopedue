// api.php 1.22.0 (CONTRACT.md 80), 1.22.1 (81): what a studio emails its clients has no cap per address. A client gets a 13th, 14th, 15th email
// in a day (the cap was 12, and a busy day kept the approval code from them); the studio's own daily cap still holds (20 on its
// first day).
// Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8116, db: 'sd_mailcap_test' });
  const { call, account, mails } = srv;
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1', 'health: version 1.32.1', h.j.version);

  const own = await account('Robert', 'robert@studio.example');
  let r = await call(own, 'PUT', '/v1/clients/minhtam', { name: 'Nha khoa Minh Tâm', contact: 'BS. Lê Ngọc Hân', email: 'han@minhtam.example' });
  ok((r.s === 200 || r.s === 201) && r.j.client.email === 'han@minhtam.example', 'a client with an email', [r.s, r.j]);
  const to = () => mails().filter(m => m.to === 'han@minhtam.example').length;

  // ---------------------------------------------------------------- 1.31.4 (CONTRACT 136): portal links, 5 a day to one address
  const got = [];
  for (let i = 0; i < 5; i++) { r = await call(own, 'POST', '/v1/links', { client: 'minhtam' }); got.push(r.s); }
  ok(got.every(s => s === 201) && to() === 5, 'five links emailed to the same client', [got, to()]);
  r = await call(own, 'POST', '/v1/links', { client: 'minhtam' });
  ok(r.s === 429 && /already went to this address 5 times today/.test(r.j.error.message) && to() === 5, 'the 6th link to that address the same day is refused', [r.s, r.j, to()]);
  ok(!('url' in (got.length ? (await call(own, 'POST', '/v1/links', { client: 'minhtam' })).j : {})), 'no answer ever carries the link itself');
  // 1.22.1 (CONTRACT 81): the greeting is the name they go by, not the title in front (it was "Hi BS.,")
  const b0 = String(mails().filter(m => m.to === 'han@minhtam.example')[0].body || '');
  ok(/^(Hi|Chào) Hân,/.test(b0), 'the email greets BS. Lê Ngọc Hân as Hân', b0.slice(0, 40));

  // ---------------------------------------------------------------- the studio's own cap still holds: 20 a day in its first week (135)
  for (const [ref, email] of [['a2', 'a2@clients.example'], ['a3', 'a3@clients.example'], ['a4', 'a4@clients.example'], ['a5', 'a5@clients.example']]) {
    await call(own, 'PUT', '/v1/clients/' + ref, { name: ref, contact: 'Someone', email });
    for (let i = 0; i < 5; i++) r = await call(own, 'POST', '/v1/links', { client: ref });
  }
  const all = mails().filter(m => /portal/.test(m.subject)).length;
  ok(r.s === 429 && /daily email limit/.test(r.j.error.message), 'the studio reaches its 20 for the day across clients, then is refused as the studio', [r.s, r.j, all]);
  // ScopeDue's own mail to an address keeps client_mail_day; sign-up's tighter limits (6 an hour per IP, one code per 30 s) are
  // reached long before it, so it is not driven here
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); fails++; }).finally(() => { if (srv) srv.stop(); console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0); });
