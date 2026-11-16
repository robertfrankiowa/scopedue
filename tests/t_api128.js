// api.php 1.28.0 (CONTRACT 96): a free account starts or joins at most 5 new client projects a calendar month (3 until 1.30.2, CONTRACT 125) (UTC), as Owner or
// Editor; the paid plan (95) has none. A real api.php on a fresh database (as t_api70), the clock moved with X-Test-Now, the paid plan
// written straight into api_billing (t_api127 covers how Stripe puts it there). SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  process.env.SCOPEDUE_STRIPE_SECRET = 'sk_test_128';   /* 1.31.1 (133): the paid row written below is a test mode row, so the server is in test mode */
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8129, db: 'sd_api128' });
  const { call } = srv, sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  /* the clock: 20 Nov 2026 12:00 UTC, then 1 Dec 00:00 UTC */
  const NOV = Date.UTC(2026, 10, 20, 12), DEC = Date.UTC(2026, 11, 1, 0, 0, 0), LAST = DEC - 1;
  async function at(t, key, m, p, body) {
    const r = await fetch(srv.api + '?r=' + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Test-Now': String(t) }, key ? { Authorization: 'Bearer ' + key } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { s: r.status, j };
  }
  const claim = (t, key, k, ref) => at(t, key, 'POST', '/v1/quota/claim', { k, ref });
  const quota = async (t, key) => (await at(t, key, 'GET', '/v1/billing')).j.quota;

  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23', 'health: version 1.32.1, schema 23', h.j.version);
  const a = await srv.account('Robert', 'robert@example.com'), b = await srv.account('Lan', 'lan@example.com');
  const aid = sql("SELECT id FROM users WHERE email = 'robert@example.com'");

  let q = await quota(NOV, a);
  ok(q && q.month === '2026-11' && q.used === 0 && q.limit === 5 && q.left === 5 && q.resets === DEC, 'a new account: 0 of 5 this month, the next month starts 1 Dec 00:00 UTC', q);

  /* five places, then none */
  let r = await claim(NOV, a, 'own', 'acme-site');
  ok(r.s === 201 && r.j.quota.used === 1 && r.j.quota.left === 4, 'Owner: a new client project takes a place', r);
  r = await claim(NOV, a, 'own', 'acme-site');
  ok(r.s === 200 && r.j.again === true && r.j.quota.used === 1, 'the same project asked again is the same place', r);
  ok((await claim(NOV, a, 'drive', 'folderAAA111')).s === 201, 'Editor of a project in Drive: a place');
  ok((await claim(NOV, a, 'room', 'room_ABCDEFGHIJKLMNOP')).s === 201, 'Editor through team sync: a place');
  ok((await claim(NOV, a, 'own', 'fourth-one')).s === 201 && (await claim(NOV, a, 'own', 'fifth-one')).s === 201, 'the 4th and 5th: places too');
  r = await claim(NOV, a, 'own', 'sixth-one');
  ok(r.s === 402 && r.j.error.code === 'quota_full' && r.j.error.detail.quota.used === 5 && r.j.error.detail.quota.left === 0, 'the 6th new client project of the month is refused (402 quota_full)', r);
  ok((await claim(NOV, a, 'own', 'acme-site')).s === 200, 'a project that already has its place still has it');
  ok((await quota(NOV, b)).used === 0, 'another account has its own 5');
  ok(sql("SELECT GROUP_CONCAT(pkey ORDER BY id) FROM api_cquota WHERE user_id = " + aid) === 'own:acme-site,drive:folderAAA111,room:room_ABCDEFGHIJKLMNOP,own:fourth-one,own:fifth-one', 'the server keeps only the ids, not what the projects are');

  /* what it takes */
  for (const [body, why] of [[{ k: 'own', ref: 'Not An Id' }, 'a ref that is not a project id'], [{ k: 'drive', ref: 'x' }, 'a folder id too short'], [{ k: 'room', ref: 'short' }, 'a room id too short'], [{ k: 'other', ref: 'abc' }, 'another kind'], [{ k: 'own', ref: 'acme', more: 1 }, 'another field']])
    ok((await at(NOV, a, 'POST', '/v1/quota/claim', body)).s === 422, 'refused: ' + why);
  ok((await at(NOV, null, 'POST', '/v1/quota/claim', { k: 'own', ref: 'acme' })).s === 401, 'without a key: 401');

  /* the month turns at 00:00 UTC */
  ok((await claim(LAST, a, 'own', 'late-one')).s === 402, '30 Nov 23:59:59.999 UTC: still November, still full');
  q = await quota(DEC, a);
  ok(q.month === '2026-12' && q.used === 0 && q.left === 5 && q.resets === Date.UTC(2027, 0, 1), '1 Dec 00:00 UTC: a new month, 5 places again', q);
  r = await claim(DEC, a, 'own', 'acme-site');
  ok(r.s === 201 && r.j.quota.used === 1, 'a project made here again under last month\'s id takes a new place (the app asks only when one is made)', r);
  r = await claim(DEC, a, 'drive', 'folderAAA111');
  ok(r.s === 200 && r.j.again === true && r.j.quota.used === 1, 'a project joined last month, opening on another device this month: the place it had, no new one', r);
  r = await claim(DEC, a, 'room', 'room_ABCDEFGHIJKLMNOP');
  ok(r.s === 200 && r.j.quota.used === 1, 'the same for a team sync room', r);

  /* the paid plan: no limit, still counted */
  srv.my(['-e', `INSERT INTO api_billing(user_id, customer, sub, status, period_end, updated_at) VALUES(${aid}, 'cus_X', 'sub_X', 'active', ${DEC + 40 * DAY}, ${DEC})`, srv.db]);
  for (let i = 0; i < 4; i++) ok((await claim(DEC + 1000, a, 'own', 'paid-' + i)).s === 201, 'paid plan: new client project ' + (i + 2) + ' this month');
  q = await quota(DEC + 1000, a);
  ok(q.used === 5 && q.limit === null && q.left === null, 'paid plan: 5 counted, no limit', q);
  ok(sql("SELECT SUM(paid) FROM api_cquota WHERE user_id = " + aid + " AND month = '2026-12'") === '4', 'each row says whether it was taken on the paid plan');
  srv.my(['-e', `UPDATE api_billing SET status = 'canceled' WHERE user_id = ${aid}`, srv.db]);
  ok((await claim(DEC + 2000, a, 'own', 'after-cancel')).s === 402, 'back on Free with 5 this month: no new one until next month');

  /* invitations carry the kind; the Owner hears when the Editor has no place left */
  const lanId = sql("SELECT id FROM users WHERE email = 'lan@example.com'");
  for (const f of ['fA00001', 'fA00002', 'fA00003', 'fA00004', 'fA00005']) await claim(DEC, b, 'drive', f);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0001', email: 'lan@example.com', project: 'Acme site', role: 'Editor', kind: 'client' });
  ok((r.s === 201 || r.s === 200) && r.j.invite.kind === 'client' && r.j.full === true, 'inviting an Editor who has no place left to a client project: full', r);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0002', email: 'lan@example.com', project: 'Notes', role: 'Editor', kind: 'private' });
  ok(r.j.full === false && r.j.invite.kind === 'private', 'a private project: never full', r);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fA00001', email: 'lan@example.com', project: 'Old one', role: 'Editor', kind: 'client' });
  ok(r.j.full === false, 'a client project they already have a place for: not full', r);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0003', email: 'nobody@example.com', project: 'Acme site', role: 'Editor', kind: 'client' });
  ok(r.j.full === false, 'someone without an account yet: not full', r);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0004', email: 'lan@example.com', project: 'Acme site', role: 'Editor' });
  ok(r.j.invite.kind === '' && r.j.full === false, 'an app before 1.28.0 sends no kind: kept empty, never full', r);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0004', email: 'lan@example.com', project: 'Acme site', role: 'Editor', kind: 'client' });
  ok(r.j.invite.kind === 'client', 'sent again with the kind: kept', r);
  ok((await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0005', email: 'lan@example.com', project: 'X', role: 'Editor', kind: 'other' })).s === 422, 'a kind it does not know is refused');
  const mine = (await at(DEC, b, 'GET', '/v1/invites')).j.to_me, inv = mine.find(x => x.fid === 'fNew0001');
  ok(inv && inv.kind === 'client', 'the invited person sees the kind in the bell', mine);
  ok(lanId && sql("SELECT kind FROM api_invites WHERE fid = 'fNew0002'") === 'private', 'api_invites.kind is kept');

  /* 1.31.0 (CONTRACT 132): the server holds the line itself. An app that never asks (changed, a backup put back, the API called
     straight) still gets no 6th client project on the portal, and no 6th client project as an Editor through the bell */
  const c = await srv.account('Minh', 'minh@example.com'), cid = sql("SELECT id FROM users WHERE email = 'minh@example.com'");
  await at(NOV, c, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Ann Lee', email: 'ann@acme.example' });
  for (let i = 1; i <= 5; i++) {
    r = await at(NOV, c, 'PUT', '/v1/projects/p' + i, { client: 'acme', name: 'Project ' + i });
    ok(r.s === 201, 'no claim first: client project ' + i + ' reaches the portal and takes its place', r);
  }
  q = await quota(NOV, c);
  ok(q.used === 5 && q.left === 0 && sql("SELECT GROUP_CONCAT(pkey ORDER BY id) FROM api_cquota WHERE user_id = " + cid) === 'own:p1,own:p2,own:p3,own:p4,own:p5', 'the five places are the projects\' own ids', q);
  r = await at(NOV, c, 'PUT', '/v1/projects/p6', { client: 'acme', name: 'Project 6' });
  ok(r.s === 402 && r.j.error.code === 'quota_full' && r.j.error.detail.quota.left === 0, 'the 6th client project is refused on the portal (402 quota_full)', r);
  ok(sql("SELECT COUNT(*) FROM api_projects WHERE studio_id = " + cid) === '5' && sql("SELECT COUNT(*) FROM api_cquota WHERE user_id = " + cid) === '5', 'nothing of the 6th is made, no place counted');
  r = await at(NOV, c, 'PUT', '/v1/projects/p3', { client: 'acme', name: 'Project 3, renamed', phase: 2 });
  ok(r.s === 200 && r.j.project.name === 'Project 3, renamed', 'a project already on the portal is still updated when the month is full', r);
  for (const p of ['/v1/links', '/v1/projects/p6/versions']) {
    r = await at(NOV, c, 'POST', p, p === '/v1/links' ? { client: 'acme', project: 'p6' } : { v: 1, terms: { price: 1, rev: 1 }, items: [{ id: 'a', sec: 'in', t: 'x' }] });
    ok(r.s === 404, 'the refused project does not exist for ' + p, r);
  }
  /* the place the app took when it was made is the same place */
  const d = await srv.account('Thu', 'thu@example.com'), did = sql("SELECT id FROM users WHERE email = 'thu@example.com'");
  await at(NOV, d, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Ann Lee', email: 'ann@acme.example' });
  ok((await claim(NOV, d, 'own', 'made-here')).s === 201, 'the app takes a place when the project is made');
  r = await at(NOV, d, 'PUT', '/v1/projects/made-here', { client: 'acme', name: 'Made here' });
  ok(r.s === 201 && (await quota(NOV, d)).used === 1, 'reaching the portal then takes no second place', r);
  /* made on the last minute of a month, on the portal the next morning: the place it took; later than 7 days: a new one */
  ok((await claim(LAST, d, 'own', 'late-one')).s === 201, 'made on 30 Nov 23:59 UTC');
  r = await at(DEC + 8 * 3600000, d, 'PUT', '/v1/projects/late-one', { client: 'acme', name: 'Late one' });
  ok(r.s === 201 && (await quota(DEC + 8 * 3600000, d)).used === 0, 'on the portal on 1 Dec: November\'s place, December untouched', r);
  ok((await claim(NOV, d, 'own', 'old-one')).s === 201, 'made on 20 Nov, kept off the portal');
  r = await at(DEC + 8 * 3600000, d, 'PUT', '/v1/projects/old-one', { client: 'acme', name: 'Old one' });
  ok(r.s === 201 && (await quota(DEC + 8 * 3600000, d)).used === 1 && sql("SELECT COUNT(*) FROM api_cquota WHERE user_id = " + did + " AND pkey = 'own:old-one'") === '2', 'on the portal 11 days later, in December: a December place', r);

  /* Accept on a client project's invitation, as an Editor: Lan has used her 5 in December */
  const inv0 = (await at(DEC, b, 'GET', '/v1/invites')).j.to_me, iv = f => inv0.find(x => x.fid === f);
  r = await at(DEC, b, 'POST', '/v1/invites/' + iv('fNew0001').id + '/accept');
  ok(r.s === 402 && r.j.error.code === 'quota_full', 'Editor with no place left: Accept on a client project is refused (402)', r);
  ok(sql("SELECT accepted_at IS NULL FROM api_invites WHERE fid = 'fNew0001'") === '1' && sql("SELECT COUNT(*) FROM api_cquota WHERE pkey = 'drive:fNew0001'") === '0', 'the invitation stays open, no place counted');
  r = await at(DEC, b, 'POST', '/v1/invites/' + iv('fA00001').id + '/accept');
  ok(r.s === 200 && r.j.accepted === true, 'a client project she already has a place for: accepted', r);
  r = await at(DEC, b, 'POST', '/v1/invites/' + iv('fNew0002').id + '/accept');
  ok(r.s === 200, 'a private project: accepted, no place', r);
  await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fView0001', email: 'lan@example.com', project: 'Acme site', role: 'Viewer', kind: 'client' });
  const vw = (await at(DEC, b, 'GET', '/v1/invites')).j.to_me.find(x => x.fid === 'fView0001');
  r = await at(DEC, b, 'POST', '/v1/invites/' + vw.id + '/accept');
  ok(r.s === 200 && sql("SELECT COUNT(*) FROM api_cquota WHERE pkey = 'drive:fView0001'") === '0', 'a Viewer of a client project: accepted, no place', r);
  const JAN = Date.UTC(2027, 0, 2);
  r = await at(JAN, b, 'POST', '/v1/invites/' + iv('fNew0001').id + '/accept');
  ok(r.s === 200 && sql("SELECT month FROM api_cquota WHERE pkey = 'drive:fNew0001'") === '2027-01', 'in January she has places again: accepted, a January place', r);
  ok((await claim(JAN, b, 'drive', 'fNew0001')).s === 200, 'the app\'s own ask when it opens is that same place');

  /* the site's admin account (users.role 'admin') is never limited and never asked to pay (2026-11-09) */
  const ad = await srv.account('Site admin', 'admin@example.com');
  srv.my(['-e', "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'", srv.db]);
  for (let i = 1; i <= 5; i++) ok((await claim(DEC, ad, 'own', 'admin-' + i)).s === 201, 'admin account: new client project ' + i + ' this month');
  ok((await claim(DEC, ad, 'drive', 'fAdmin001')).s === 201, 'admin account: joining one as an Editor too');
  const ab = (await at(DEC, ad, 'GET', '/v1/billing')).j;
  ok(ab.plan.name === 'admin' && ab.plan.buy === false && ab.quota.used === 6 && ab.quota.limit === null && ab.quota.left === null, 'admin account: plan admin, nothing to buy, 6 counted with no limit', ab);
  r = await at(DEC, ad, 'POST', '/v1/billing/checkout', {});
  ok(r.s === 409 && r.j.error.code === 'admin', 'admin account: Upgrade is refused, there is nothing to pay', r);
  for (const f of ['fA00002', 'fA00003']) await claim(DEC, ad, 'drive', f);
  r = await at(DEC, a, 'PUT', '/v1/invites', { fid: 'fNew0009', email: 'admin@example.com', project: 'Acme site', role: 'Editor', kind: 'client' });
  ok(r.j.full === false, 'inviting the admin account to a client project: never full', r);
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
