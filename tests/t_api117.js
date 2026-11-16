// api.php 1.23.0 (CONTRACT.md 82): who a request waits on after the studio writes. A studio's note on a request that adds work
// leaves it with the studio (a quote is still owed: "I'll quote after milestone 2" asks nothing of the client); a studio's question
// puts it to the client, and the client is emailed; a note on a question-only request is the answer, the client's turn as before;
// a client can withdraw (decline) its own request while it is with the studio.
// Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8117, db: 'sd_crturn_test' });
  const { call, account, mails } = srv;
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0', 'health: version 1.30.0', h.j.version);
  const pf = await fetch('http://127.0.0.1:8117/api.php?r=/v1/cfiles', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
  ok(pf.status === 204 && pf.headers.get('access-control-allow-origin') === '*' && pf.headers.get('access-control-max-age') === '7200', '1.26.0 (86): a preflight is 204, open, and cached 2 hours', [pf.status, pf.headers.get('access-control-max-age')]);

  const own = await account('Robert', 'robert@studio.example');
  await call(own, 'PUT', '/v1/clients/minhtam', { name: 'Nha khoa Minh Tâm', contact: 'BS. Lê Ngọc Hân', email: 'han@minhtam.example' });
  await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website & booking', phase: 2 });
  let r = await call(own, 'POST', '/v1/projects/web/versions', { v: 1, terms: { price: 2200, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Home page' }] });
  ok(r.s === 201, 'Scope v1', r.j);
  const ent = (cr, b) => call(own, 'POST', '/v1/projects/web/requests/' + cr + '/entries', b);
  const L = await srv.link(own, { client: 'minhtam' });
  const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
  const crOf = async id => ((await call(sess, 'GET', '/v1/portal')).j.projects[0].crs || []).filter(c => c.id === id)[0];

  // ---------------------------------------------------------------- a request that adds work, then the studio's note
  r = await ent('CR-001', { n: 0, ty: 'request', tx: 'Print the day’s appointments for the front desk', title: 'Print the day list', adds: true, via: 'call' });
  ok(r.s === 201 && r.j.cr.state === 'me', 'the studio logs a request from a call: it is with the studio', r.j);
  r = await ent('CR-001', { n: 1, ty: 'note', tx: 'We will quote this after milestone 2' });
  ok(r.s === 201 && r.j.cr.state === 'me', 'a note on a request that adds work leaves it with the studio (a quote is owed)', r.j);
  const before = mails().filter(m => m.to === 'han@minhtam.example').length;

  // ---------------------------------------------------------------- the studio's question puts it to the client
  r = await ent('CR-001', { n: 2, ty: 'question', tx: 'Should the list show the patient’s phone number?' });
  ok(r.s === 201 && r.j.cr.state === 'client', 'a question puts it to the client', r.j);
  const qm = mails().filter(m => m.to === 'han@minhtam.example').slice(before);
  ok(qm.length === 1 && /question|câu hỏi/i.test(qm[0].subject) && /phone number/.test(qm[0].body), 'the client is emailed the question', qm.map(m => m.subject));
  r = await ent('CR-001', { n: 3, ty: 'question', tx: '' });
  ok(r.s === 422, 'a question needs words', r.j);

  // ---------------------------------------------------------------- the client answers; the studio notes; the client withdraws
  let c = await crOf('CR-001');
  r = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'web', cr: 'CR-001', on: c.entries.length - 1, tx: 'Yes, with the phone number' });
  ok(r.s === 201 && r.j.cr.state === 'me', 'the client answers: with the studio', r.j);
  r = await ent('CR-001', { n: 4, ty: 'note', tx: 'Thanks, noted' });
  ok(r.s === 201 && r.j.cr.state === 'me', 'another note: still with the studio', r.j);
  c = await crOf('CR-001');
  r = await call(sess, 'POST', '/v1/respond', { action: 'decline', project: 'web', cr: 'CR-001', on: c.entries.length - 1, tx: '' });
  ok(r.s === 201 && r.j.cr.state === 'declined', 'the client withdraws its request while it is with the studio', r.j);

  // ---------------------------------------------------------------- a question-only request: the studio's note is the answer
  r = await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'web', v: 1, tx: 'Is the booking page in the Scope?' });
  const q = r.j.cr && r.j.cr.id;
  ok(r.s === 201 && r.j.cr.state === 'me' && r.j.cr.adds === false, 'a question on the Scope opens a question-only request, with the studio', r.j);
  c = await crOf(q);
  r = await ent(q, { n: c.entries.length, ty: 'note', tx: 'Yes, it is deliverable 4' });
  ok(r.s === 201 && r.j.cr.state === 'client', 'the studio’s answer on a question-only request is the client’s turn, as before', r.j);
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); fails++; }).finally(() => { if (srv) srv.stop(); console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0); });
