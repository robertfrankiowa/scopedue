// api.php 1.10.1 and 1.10.2 (v95, CONTRACT 40.7): schema 8 widens the Viewer tables' time columns. On scopedue.com the Viewer tables were made
// before 1.5.0 with narrower columns (CREATE TABLE IF NOT EXISTS kept them), a time in milliseconds was cut to the column's largest
// value, and every link had expired when it was made. Here a fresh database is given INT time columns and schema 7, as there; the
// next request widens them, and a Viewer's link then opens. Needs what t_api70.js needs.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8098, db: 'sd_wide95' });
  const { call, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const types = () => sql("SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME, '=', DATA_TYPE) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('api_vlinks', 'api_vsessions', 'api_viewers') AND COLUMN_NAME IN ('expires_at', 'created_at', 'last_used', 'invited_at', 'seen_at') ORDER BY 1").split('\n');
  ok((await call(null, 'GET', '/v1/health')).j.version === '1.30.0', 'health: version 1.30.0');
  // the tables as scopedue.com has them: narrower time columns, schema 7
  my([DB, '-e', "ALTER TABLE api_vlinks MODIFY expires_at INT NOT NULL, MODIFY created_at INT NOT NULL, MODIFY last_used INT NULL; ALTER TABLE api_vsessions MODIFY expires_at INT NOT NULL, MODIFY created_at INT NOT NULL; ALTER TABLE api_viewers MODIFY invited_at INT NULL, MODIFY seen_at INT NULL; UPDATE api_kv SET v = '7' WHERE k = 'schema'"]);
  ok(types().filter(t => /=int$/.test(t)).length === 7, 'the Viewer tables start with INT time columns and schema 7', types());
  await call(null, 'GET', '/v1/health');
  ok(types().every(t => /=bigint$/.test(t)) && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'the next request widens every one to BIGINT', types());
  ok(sql("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_vlinks' AND COLUMN_NAME = 'last_used'") === 'YES' && sql("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_vlinks' AND COLUMN_NAME = 'expires_at'") === 'NO', 'each keeps whether it may be empty');
  // a link made now opens, and its session reads the portal
  const own = await account('Robert', 'robert@example.com');
  await call(own, 'PUT', '/v1/vprojects/try-check', { name: 'Try check', show: {}, entries: [], viewers: [{ email: 'hung@corp.example', name: 'Hung' }] });
  const inv = await call(own, 'POST', '/v1/vprojects/try-check/invite', { email: 'hung@corp.example' });
  const exp = +sql('SELECT expires_at FROM api_vlinks ORDER BY id DESC LIMIT 1');
  ok(inv.s === 201 && exp > Date.now() + 13 * 86400000, 'a new link keeps its 14 days', { s: inv.s, exp });
  const ses = await call(null, 'POST', '/v1/vsession', { token: lastTo('hung@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] });
  ok(ses.s === 200 && ses.j.session, 'and it opens', ses.j);
  const v = await call(ses.j.session, 'GET', '/v1/viewer');
  ok(v.s === 200 && v.j.project.ref === 'try-check', 'its session reads the portal', v.s);
  // already wide: nothing to do, nothing breaks
  my([DB, '-e', "UPDATE api_kv SET v = '7' WHERE k = 'schema'"]);
  ok((await call(null, 'GET', '/v1/health')).s === 200 && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'run again on wide columns, it changes nothing');
  // ---------------------------------------------------------------- 1.10.2, schema 9: times the driver cut to 32 bits
  // On scopedue.com pdo_mysql sent PARAM_INT as 32 bits: a link made at 1793200016893 was kept as -2096635007. Here the rows are cut
  // by hand, as they are there, schema set back to 8; the next request gives every one its time back, a record that refuses UPDATE too
  const cut = v => Number(BigInt.asIntN(32, BigInt(v)));
  const t0 = Date.now(), link = +sql('SELECT expires_at FROM api_vlinks ORDER BY id DESC LIMIT 1'), made = +sql('SELECT created_at FROM api_vlinks ORDER BY id DESC LIMIT 1');
  my([DB, '-e', `UPDATE api_vlinks SET expires_at = ${cut(link)}, created_at = ${cut(made)}; UPDATE api_viewers SET invited_at = ${cut(t0 - 3600000)};
    INSERT INTO api_approvals(project_id, kind, v, fp, by_name, email, via, at, ip) VALUES(1, 'scope', 1, 'f', 'Ann', 'ann@x.example', 'code', ${cut(t0 - 12 * 86400000)}, '1.2.3.4');
    INSERT INTO api_rooms(id, owner_id, gen, ver, updated_at, seen_at, created_at) VALUES('${'r'.repeat(20)}', 1, 1, 1, ${cut(t0 - 86400000)}, NULL, ${cut(t0 - 13 * 86400000)});
    UPDATE api_kv SET v = '8' WHERE k = 'schema'`]);
  ok(+sql('SELECT expires_at FROM api_vlinks ORDER BY id DESC LIMIT 1') < 0 || +sql('SELECT expires_at FROM api_vlinks ORDER BY id DESC LIMIT 1') < 2 ** 31, 'times cut to 32 bits, as on scopedue.com');
  await call(null, 'GET', '/v1/health');
  const near = (a, b) => Math.abs(a - b) < 5000;
  const got = { link: +sql('SELECT expires_at FROM api_vlinks ORDER BY id DESC LIMIT 1'), made: +sql('SELECT created_at FROM api_vlinks ORDER BY id DESC LIMIT 1'), inv: +sql('SELECT invited_at FROM api_viewers ORDER BY id DESC LIMIT 1'),
    appr: +sql("SELECT at FROM api_approvals WHERE by_name = 'Ann'"), room: +sql("SELECT created_at FROM api_rooms WHERE id = '" + 'r'.repeat(20) + "'"), seen: sql("SELECT IFNULL(seen_at, 'null') FROM api_rooms WHERE id = '" + 'r'.repeat(20) + "'") };
  ok(got.link === link && got.made === made, 'a link 14 days ahead and its making are given back exactly', { got, link, made });
  ok(near(got.inv, t0 - 3600000) && near(got.appr, t0 - 12 * 86400000) && near(got.room, t0 - 13 * 86400000) && got.seen === 'null', 'an hour ago, 12 and 13 days ago too, an approval record included; an empty time stays empty', got);
  ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'schema 14 (it goes on to the latest)');
  let refused = false; try { my([DB, '-e', "UPDATE api_approvals SET at = 1 WHERE by_name = 'Ann'"]); } catch (e) { refused = true; }
  ok(refused, 'and the approval record refuses UPDATE again afterwards');
  const ses2 = await call(null, 'POST', '/v1/vsession', { token: lastTo('hung@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] });
  ok(ses2.s === 200, 'the link opens again', ses2.j);
  srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); if (srv) srv.stop(); process.exit(1); });
