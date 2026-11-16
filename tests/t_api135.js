// api.php 1.31.3 (CONTRACT 135): a password sign-in locked per account after 10 wrong tries in an hour; a free account's first 7
// days at 20 emails a day; one account per mailbox (a +tag, Gmail's dots, googlemail.com). A real api.php on a fresh database (as
// t_api70), the clock moved with X-Test-Now. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const HOUR = 3600000, DAY = 24 * HOUR, PW = 'a-long-pass-70';
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  process.env.SCOPEDUE_STRIPE_SECRET = 'sk_test_135';   /* the paid row below is a test mode row (133) */
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8135, db: 'sd_api135' });
  const sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  async function at(t, key, m, p, body, ip) {
    const r = await fetch(srv.api + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Test-Now': String(t) }, key ? { Authorization: 'Bearer ' + key } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { s: r.status, j };
  }
  const T0 = Date.now();
  const h = await srv.call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23', 'health: version 1.32.1, schema 23', h.j.version);

  /* ---------------------------------------------------------------- 1 · wrong passwords, per account */
  await srv.account('Robert', 'robert@example.com');
  const login = (t, email, password) => at(t, null, 'POST', '/v1/studios/login', { email, password });
  let r;
  for (let i = 1; i <= 10; i++) { r = await login(T0, 'robert@example.com', 'wrong-pass-' + i); if (r.s !== 401) break; }
  ok(r.s === 401, 'ten wrong passwords: each one 401', r);
  r = await login(T0, 'robert@example.com', 'wrong-pass-11');
  ok(r.s === 429 && r.j.error.code === 'login_locked' && r.j.error.detail.retry_after_ms > 0, 'the 11th in the hour: locked (429 login_locked)', r);
  r = await login(T0, 'robert@example.com', PW);
  ok(r.s === 429, 'the right password is locked out too until the hour is over', r);
  r = await login(T0 + HOUR + 1000, 'robert@example.com', PW);
  ok(r.s === 200 && /^sdk_/.test(r.j.key), 'an hour later the right password signs in', r);
  for (let i = 1; i <= 10; i++) await login(T0 + HOUR + 2000, 'nobody@example.com', 'wrong-pass-' + i);
  r = await login(T0 + HOUR + 2000, 'nobody@example.com', 'wrong-pass-11');
  ok(r.s === 429 && r.j.error.code === 'login_locked', 'an address with no account is counted the same way (the answer says nothing of who has one)', r);

  /* ---------------------------------------------------------------- 2 · a free account's first week */
  const a = await srv.account('Minh', 'minh@example.com'), aid = sql("SELECT id FROM users WHERE email = 'minh@example.com'");
  const made = +sql('SELECT created_at FROM api_studios WHERE user_id = ' + aid);
  /* five clients, so 1.31.4's 5 links a day to one address (136) is never what refuses here */
  const CL = [0, 1, 2, 3, 4].map(i => 'c' + i);
  for (const c of CL) await at(made, a, 'PUT', '/v1/clients/' + c, { name: c, contact: 'Someone', email: c + '@clients.example' });
  let k0 = 0; const link = t => at(t, a, 'POST', '/v1/links', { client: CL[k0++ % 5], send: true });
  async function send(t, k) { let last; for (let i = 0; i < k; i++) { last = await link(t + i); if (last.s !== 201) return { i, last }; } return { i: k, last }; }
  let s3 = await send(made + 3 * DAY, 20);
  ok(s3.i === 20, 'day 3: 20 emails go', s3);
  r = await link(made + 3 * DAY + 100);
  ok(r.s === 429 && /daily email limit/.test(r.j.error.message), 'day 3: the 21st is refused (before 1.31.3 only the first day had 20)', r);
  let s8 = await send(made + 8 * DAY, 21);
  ok(s8.i === 21, 'day 8, past the first week: 21 and more go (100 a day)', s8);
  const p = await srv.account('Thu', 'thu@example.com'), pid = sql("SELECT id FROM users WHERE email = 'thu@example.com'");
  const pmade = +sql('SELECT created_at FROM api_studios WHERE user_id = ' + pid);
  srv.my(['-e', `INSERT INTO api_billing(user_id, customer, sub, status, period_end, updated_at) VALUES(${pid}, 'cus_P', 'sub_P', 'active', ${pmade + 40 * DAY}, ${pmade})`, srv.db]);
  for (const c of CL) await at(pmade, p, 'PUT', '/v1/clients/' + c, { name: c, contact: 'Someone', email: c + '@clients.example' });
  let sp = 0; for (let i = 0; i < 21; i++) if ((await at(pmade + DAY + i, p, 'POST', '/v1/links', { client: CL[i % 5], send: true })).s === 201) sp++;
  ok(sp === 21, 'a paid account in its first week: its full day at once', sp);

  /* ---------------------------------------------------------------- 3 · one account per mailbox */
  /* every request here comes from one address: its 6 sign-ups an hour are given back before each one */
  const fresh = () => srv.my(['-e', "DELETE FROM api_rate WHERE k LIKE 'reg:ip:%'", srv.db]);
  const reg = (email, t) => { fresh(); return at(t || Date.now(), null, 'POST', '/v1/studios', { name: 'Someone', email, password: PW, password_confirm: PW }); };
  const acct = (nm, e) => { fresh(); return srv.account(nm, e); };
  await acct('Anne', 'anne.lee@gmail.com');
  ok(sql("SELECT canon FROM api_canon c JOIN users u ON u.id = c.user_id WHERE u.email = 'anne.lee@gmail.com'") === 'annelee@gmail.com', 'a new account writes its mailbox (Gmail without dots)');
  for (const [e, why] of [['annelee+promo@gmail.com', 'a +tag and no dots'], ['Anne.Lee@googlemail.com', 'googlemail.com, in capitals'], ['a.n.n.e.l.e.e@gmail.com', 'other dots']]) {
    r = await reg(e);
    ok(r.s === 409 && r.j.error.code === 'account_exists', 'refused, the same Gmail mailbox: ' + why, r);
  }
  await acct('Bob', 'bob@example.com');
  r = await reg('bob+work@example.com');
  ok(r.s === 409 && r.j.error.code === 'account_exists', 'refused: a +tag on any domain', r);
  const mails0 = srv.mails().length;
  r = await reg('b.o.b@example.com');
  ok(r.s === 202 && srv.mails().length === mails0 + 1, 'dots elsewhere than Gmail are another mailbox: a code goes', r);
  ok(srv.mails().filter(m => /bob\+work@example\.com/.test(m.to)).length === 0, 'nothing was mailed to a refused address');
  /* a code asked before the other spelling got its account: refused when the code is entered */
  r = await reg('c.arl@gmail.com');
  const code = srv.lastTo('c.arl@gmail.com').body.match(/\b\d{6}\b/)[0];
  await acct('Carl', 'carl@gmail.com');
  const v = await at(Date.now(), null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code });
  ok(v.s === 409 && v.j.error.code === 'account_exists' && sql("SELECT COUNT(*) FROM users WHERE email = 'c.arl@gmail.com'") === '0', 'a code entered after the mailbox got an account elsewhere: refused, nothing made', v);
  /* a deleted account's mailbox is free again */
  srv.my(['-e', "SET @sd_event_maintenance = 1; DELETE FROM users WHERE email = 'bob@example.com'", srv.db]);
  r = await reg('bob+new@example.com');
  ok(r.s === 202, 'once that account is deleted, its mailbox can sign up again', r);

  /* the move to schema 23 writes the mailbox of every account there already is */
  srv.stop();
  srv.my(['-e', "DROP TABLE api_canon; UPDATE api_kv SET v = '22' WHERE k = 'schema'; INSERT INTO users(name, email, password_hash, auth_provider, email_verified_at) VALUES('Old', 'old.timer@gmail.com', 'x', 'password', NOW())", srv.db]);
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8135, db: 'sd_api135', keep: true });
  await srv.call(null, 'GET', '/v1/health');
  ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23' && sql("SELECT COUNT(*) FROM api_canon") === sql('SELECT COUNT(*) FROM users'), 'schema 22 to 23: one row per account there was', [sql('SELECT COUNT(*) FROM api_canon'), sql('SELECT COUNT(*) FROM users')]);
  r = await reg('oldtimer@gmail.com');
  ok(r.s === 409, 'an account from before 1.31.3 holds its mailbox too', r);
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
