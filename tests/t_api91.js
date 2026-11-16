// api.php 1.9.0 (v91): how long the server keeps what it holds for someone else (CONTRACT.md 39), over HTTP against a fresh MySQL
// database in test mode. The clock is moved with X-Test-Now. What Viewers sent and the Owner's app has not taken: reminders after 7
// and 23 days, deleted after 30 with a mark the Viewer sees, the mark gone 60 days later; approvals are kept. A team sync room
// nobody read or wrote for 180 days goes; one in use stays. Needs what t_api70.js needs.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8096, db: 'sd_keep_test' });
  const { call, lastTo, mails, account, my, api, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const at = (ms) => fetch(api + '?r=/v1/health', { headers: { 'X-Test-Now': String(ms) } }).then(r => r.json());   /* any request runs the rules */
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0', 'health: version 1.30.0', h.j.version);
  const own = await account('Robert', 'robert@example.com');
  await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show: {}, entries: [{ id: 'f1', k: 'req', fr: [], names: '', t: 'x', st: 'park', vo: [], ts: 1, cm: [] }], viewers: [{ email: 'lan@corp.example', name: 'Lan Anh' }] });
  await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'lan@corp.example' });
  const lan = (await call(null, 'POST', '/v1/vsession', { token: lastTo('lan@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] })).j.session;
  const PIC = Buffer.from('a picture standing in for a JPEG').toString('base64');
  await call(lan, 'POST', '/v1/vsend', { k: 'bug', t: 'The export cuts the last line', key: 'kb1', files: [{ name: 'cut.jpg', type: 'image/jpeg', data: PIC }] });
  await call(lan, 'POST', '/v1/vsend', { k: 'req', t: 'Please add a dark mode', key: 'kr1' });
  await call(lan, 'POST', '/v1/vsend', { k: 'vote', on: 'f1' });
  my([DB, '-e', `INSERT INTO api_vsent(vproject_id, viewer_id, k, body, ukey, at) SELECT vproject_id, viewer_id, 'appr', '{"on":"f9","v":"yes","t":"ok","code":true}', NULL, at FROM api_vsent WHERE ukey = 'kb1'`]);
  const t0 = +sql("SELECT at FROM api_vsent WHERE ukey = 'kb1'");
  ok(sql('SELECT COUNT(*) FROM api_vsent') === '4' && sql('SELECT COUNT(*) FROM api_vfiles') === '1', 'a bug with a picture, a request, a vote and an approval wait on the server');

  // ---------------------------------------------------------------- 7 days: the first reminder
  let before = mails().length;
  await at(t0 + 6 * DAY);
  ok(mails().length === before, 'six days: nothing yet');
  await at(t0 + 7 * DAY + 1000);
  let m = mails().slice(before).filter(x => x.to === 'robert@example.com');
  ok(m.length === 1 && /Feedback on HR tool is waiting for you/.test(m[0].subject) && /^2 entries Viewers sent on HR tool have waited a week/.test(m[0].body) && /not be in Google Drive/.test(m[0].body) && /keeps them 30 days/.test(m[0].body),
    'a week: one email to the Owner, counting the two with words (not the vote), saying why and how long', m.map(x => [x.subject, x.body.slice(0, 220)]));
  before = mails().length; await at(t0 + 8 * DAY);
  ok(mails().length === before, 'only once');

  // ---------------------------------------------------------------- 23 days: the last reminder, with the date
  await at(t0 + 23 * DAY + 1000);
  m = mails().slice(before).filter(x => x.to === 'robert@example.com');
  ok(m.length === 1 && /Feedback on HR tool is deleted /.test(m[0].subject) && /are still waiting/.test(m[0].body) && /The server deletes them on /.test(m[0].body), 'a week before: the Owner is told the day they go', m.map(x => [x.subject, x.body.slice(0, 220)]));
  ok(sql('SELECT COUNT(*) FROM api_vfiles') === '1' && (await call(own, 'GET', '/v1/vinbox')).j.items.length === 4, 'until then everything is still there for the Owner’s app to take');

  // ---------------------------------------------------------------- 30 days: deleted, a mark left for the Viewer
  before = mails().length; await at(t0 + 30 * DAY + 1000);
  m = mails().slice(before).filter(x => x.to === 'robert@example.com');
  ok(m.length === 1 && /was deleted after 30 days/.test(m[0].subject) && /^2 entries Viewers sent on HR tool waited 30 days and were deleted/.test(m[0].body), 'thirty days: deleted, and the Owner is told', m.map(x => [x.subject, x.body.slice(0, 200)]));
  const bodies = sql("SELECT GROUP_CONCAT(CONCAT(k, ':', body) ORDER BY id SEPARATOR ' | ') FROM api_vsent");
  ok(sql('SELECT COUNT(*) FROM api_vfiles') === '0' && !/export cuts|dark mode/.test(bodies) && /appr:\{"on":"f9"/.test(bodies), 'no words and no picture left; the approval is kept (it is the record)', bodies);
  const box = (await call(own, 'GET', '/v1/vinbox/sealed')).j.items;
  ok(box.length === 1 && box[0].k === 'appr', 'the Owner’s app is given only the approval now', box.map(x => x.k));
  const pend = (await call(lan, 'GET', '/v1/viewer')).j.pending;
  const pb = pend.find(x => x.key === 'kb1'), pr = pend.find(x => x.key === 'kr1');
  ok(pb && pb.gone > 0 && !('t' in pb) && pb.files === 0 && pr && pr.gone > 0, 'the Viewer’s portal sees that they did not reach the Owner, without their words', pend);
  before = mails().length; await at(t0 + 31 * DAY);
  ok(mails().length === before, 'and no more email about them');

  // ---------------------------------------------------------------- 60 days later the marks go
  await at(t0 + 90 * DAY + 2000);
  ok(sql("SELECT COUNT(*) FROM api_vsent WHERE body LIKE '{\"gone\":%'") === '0' && sql('SELECT COUNT(*) FROM api_vsent') === '1', '60 days after: the marks are gone too; the approval stays');

  // ---------------------------------------------------------------- team sync rooms nobody uses
  const now = Date.now();
  my([DB, '-e', `INSERT INTO api_rooms(id, owner_id, gen, ver, updated_at, seen_at, created_at) VALUES('roomidleaaaaaaaaaaaa', 1, 1, 3, ${now - 400 * DAY}, ${now - 200 * DAY}, ${now - 400 * DAY}), ('roomreadbbbbbbbbbbbb', 1, 1, 3, ${now - 400 * DAY}, ${now - 20 * DAY}, ${now - 400 * DAY}), ('roomwritecccccccccccc', 1, 1, 3, ${now - 10 * DAY}, NULL, ${now - 400 * DAY})`]);
  my([DB, '-e', `INSERT INTO api_room_versions(room_id, ver, \`blob\`, by_id, by_role, ts) VALUES('roomidleaaaaaaaaaaaa', 3, 'x', 1, 'Owner', 1), ('roomreadbbbbbbbbbbbb', 3, 'x', 1, 'Owner', 1)`]);
  my([DB, '-e', `INSERT INTO api_room_keys(room_id, gen, kid, wrapped) VALUES('roomidleaaaaaaaaaaaa', 1, '0123456789abcdef', 'w')`]);
  await at(now);
  ok(sql('SELECT GROUP_CONCAT(id ORDER BY id) FROM api_rooms') === 'roomreadbbbbbbbbbbbb,roomwritecccccccccccc',
    'a room nobody read or wrote for 180 days goes; one read 20 days ago or written 10 days ago stays', sql('SELECT GROUP_CONCAT(id ORDER BY id) FROM api_rooms'));
  ok(sql("SELECT COUNT(*) FROM api_room_versions WHERE room_id = 'roomidleaaaaaaaaaaaa'") === '0' && sql("SELECT COUNT(*) FROM api_room_keys WHERE room_id = 'roomidleaaaaaaaaaaaa'") === '0' && sql("SELECT COUNT(*) FROM api_room_versions WHERE room_id = 'roomreadbbbbbbbbbbbb'") === '1',
    'with its versions and keys; the others keep theirs');
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
