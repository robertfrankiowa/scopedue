// api.php 1.20.0 (v114, CONTRACT.md 73): someone taken off a project. An Editor who had joined a project in Drive is emailed once
// (POST /v1/invites/withdraw with left), and their invitation is kept as removed so each of their devices takes the project off
// (GET /v1/invites → removed); adding them again invites them anew. A Viewer of the portal taken off the team (PUT /v1/vprojects
// with gone) is emailed if they had a link; one made an Editor is not; their open page is told (403 removed) on every ask. Schema 16 moves to 17.
// Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8114, db: 'sd_gone_test' });
  const { call, account, mails, lastTo, my, db } = srv;
  const sql = q => String(my([db, '-N', '-e', q])).trim();
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
  const own = await account('Minh', 'minh@example.com'), hung = await account('Hung', 'hung@example.com'), lan = await account('Lan', 'lan@example.com');
  const FID = '1AbCdEfGhIjKlMnOp_q-r', PN = 'Ứng dụng nhắc chăm cây';

  // ---------------------------------------------------------------- an Editor who had joined
  await call(own, 'PUT', '/v1/invites', { fid: FID, email: 'hung@example.com', project: PN, role: 'Editor', name: 'Minh' });
  const inv = (await call(hung, 'GET', '/v1/invites')).j.to_me[0];
  await call(hung, 'POST', '/v1/invites/' + inv.id + '/accept');
  let r = await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'Hung@Example.com', left: true, project: PN });
  let m = lastTo('hung@example.com');
  ok(r.s === 200 && r.j.withdrawn === 1 && r.j.mailed === true, 'the Owner takes Hung off: one row, emailed', r.j);
  ok(m && m.subject === 'Minh stopped sharing ' + PN + ' with you' && m.from === 'Minh via ScopeDue' && m.reply_to === 'minh@example.com', 'the email says who stopped sharing what, and replies go to the Owner', m && [m.subject, m.from, m.reply_to]);
  ok(m && m.body.includes('(minh@example.com) took you off') && m.body.includes('takes the project off your devices') && m.body.includes('still yours') && !m.body.includes('#f='), 'it says what happens to their copy and their files, with no link into the project', m && m.body);
  r = await call(hung, 'GET', '/v1/invites');
  const gone = (r.j.removed || [])[0];
  ok(r.j.removed.length === 1 && gone.fid === FID && gone.project === PN && gone.from === 'Minh' && gone.from_email === 'minh@example.com' && gone.at > 0, 'Hung\'s list names the project he was taken off, and by whom', r.j.removed);
  ok(!r.j.accepted.some(x => x.fid === FID) && !r.j.to_me.some(x => x.fid === FID), 'it is no longer accepted, nor waiting for an answer', r.j);
  ok(!(await call(own, 'GET', '/v1/invites')).j.sent.some(x => x.email === 'hung@example.com'), 'the Owner\'s list no longer has him');
  ok((await call(hung, 'POST', '/v1/invites/' + inv.id + '/accept')).j.accepted !== true || (await call(hung, 'GET', '/v1/invites')).j.removed.length === 1, 'accepting the old invitation does not bring it back');
  let nm = mails().length;
  r = await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com', left: true, project: PN });
  ok(r.s === 200 && r.j.mailed === null && mails().length === nm, 'said again (a second device of the Owner\'s): no second email', r.j);
  await call(own, 'POST', '/v1/invites/withdraw', { fid: FID });
  ok((await call(hung, 'GET', '/v1/invites')).j.removed.length === 1, 'the project leaving Drive afterwards keeps the removal for his devices');
  ok((await call(lan, 'GET', '/v1/invites')).j.removed.length === 0, 'someone else sees none of it');

  // ---------------------------------------------------------------- added again
  r = await call(own, 'PUT', '/v1/invites', { fid: FID, email: 'hung@example.com', project: PN, role: 'Editor' });
  ok(r.s === 201 && r.j.mailed === true && /invited you to/.test(lastTo('hung@example.com').subject), 'added again: a new invitation, emailed', r.j);
  r = await call(hung, 'GET', '/v1/invites');
  ok(r.j.removed.length === 0 && r.j.to_me.some(x => x.fid === FID), 'and his list has the invitation, not the removal', r.j);

  // ---------------------------------------------------------------- what is refused, and who said it
  ok((await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, left: true, project: PN })).s === 422, 'left needs an address');
  ok((await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'minh@example.com', left: true, project: PN })).s === 422, 'the Owner cannot take themself off');
  ok((await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com', left: true })).s === 422, 'left needs the project\'s name');
  r = await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com' });
  ok(r.s === 200 && r.j.withdrawn === 1 && (await call(hung, 'GET', '/v1/invites')).j.removed.length === 0, 'without left (Cancel invite): the invitation just goes, no removal', r.j);
  nm = mails().length;
  r = await call(lan, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com', left: true, project: PN });
  const fake = (await call(hung, 'GET', '/v1/invites')).j.removed[0];
  ok(r.s === 200 && fake && fake.from_email === 'lan@example.com', 'another account can say so too, but its own address goes with it (the app checks it is the Owner\'s)', fake);
  r = await call(null, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com', left: true, project: PN });
  ok(r.s === 401, 'signed out: nothing', r.j);

  // ---------------------------------------------------------------- Viewers of the portal
  const show = { items: [{ id: 'i1', t: 'Export invoices', sec: 'in', st: 'doing' }] };
  const V = (e, nm2) => ({ email: e, name: nm2, lang: 'vi' });
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [V('bao@corp.example', 'Quốc Bảo'), V('cara@corp.example', 'Cara'), V('dan@corp.example', 'Dan')] });
  ok(r.s === 200 && r.j.viewers.length === 3, 'three Viewers on the portal', r.j);
  await call(own, 'POST', '/v1/vprojects/hr/invite', { email: 'bao@corp.example' });
  await call(own, 'POST', '/v1/vprojects/hr/invite', { email: 'cara@corp.example' });
  const tok = e => lastTo(e).body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1], linkB = tok('bao@corp.example');
  const bao = (await call(null, 'POST', '/v1/vsession', { token: linkB })).j.session, cara = (await call(null, 'POST', '/v1/vsession', { token: tok('cara@corp.example') })).j.session;
  ok((await call(bao, 'GET', '/v1/viewer')).s === 200, 'Bảo opens the portal');
  nm = mails().length;
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [V('cara@corp.example', 'Cara'), V('dan@corp.example', 'Dan')], gone: ['bao@corp.example'] });
  await new Promise(res => setTimeout(res, 300));
  m = lastTo('bao@corp.example');
  ok(r.s === 200 && r.j.mailed === 1 && mails().length === nm + 1 && m.subject === 'Minh đã ngừng chia sẻ HR tool với bạn' && /Chào Bảo,/.test(m.body) && m.reply_to === 'minh@example.com', 'Bảo taken off the team: emailed in his language', [r.j, m && m.subject]);
  let b = await call(bao, 'GET', '/v1/viewer');
  ok(b.s === 403 && b.j.error.code === 'removed', 'his open page is told he was taken off', b.j);
  const again = await call(bao, 'GET', '/v1/vpulse'), send = await call(bao, 'POST', '/v1/vsend', { k: 'req', t: 'hello there' });
  ok(again.s === 403 && again.j.error.code === 'removed' && send.s === 403 && send.j.error.code === 'removed', 'every ask of that session is told so (the 5-second pulse first), and nothing is let through', [again.j, send.j]);
  ok((await call(null, 'POST', '/v1/vsession', { token: linkB })).j.error.code === 'link_invalid', 'his link opens nothing');
  nm = mails().length;
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [V('dan@corp.example', 'Dan')] });
  await new Promise(res => setTimeout(res, 300));
  ok(r.j.mailed === 0 && mails().length === nm && (await call(cara, 'GET', '/v1/viewer')).j.error.code === 'removed', 'Cara made an Editor (not in gone): out of the portal, no email', r.j);
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [], gone: ['dan@corp.example'] });
  await new Promise(res => setTimeout(res, 300));
  ok(r.j.mailed === 0 && mails().length === nm && r.j.viewers.length === 0, 'Dan, never sent a link, is not emailed; the last Viewer leaves the list', r.j);
  ok((await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [], gone: 'x' })).s === 422, 'gone is a list of addresses');
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR tool', show, entries: [], viewers: [V('bao@corp.example', 'Quốc Bảo')] });
  ok(r.j.viewers.length === 1 && (await call(bao, 'GET', '/v1/viewer')).s === 401, 'Bảo added again: on the list, but his old session does not come back');

  // ---------------------------------------------------------------- schema 16 → 17
  my([db, '-e', "ALTER TABLE api_invites DROP COLUMN removed_at; UPDATE api_kv SET v = '16' WHERE k = 'schema'"]);
  r = await call(own, 'PUT', '/v1/invites', { fid: FID, email: 'eve@example.com', project: PN, role: 'Editor' });
  ok(r.s === 201 && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21' && sql("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_invites' AND COLUMN_NAME = 'removed_at'") === '1', 'a database at schema 16 gets removed_at on the next request', r.j);
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log(`\n${n - fails}/${n} passed`);
  process.exit(fails ? 1 : 0);
});
