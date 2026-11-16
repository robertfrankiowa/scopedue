// api.php 1.5.1 (v72): what Editors see on team sync (CONTRACT.md 29.20), over HTTP against a fresh MySQL database in test mode.
// A version of the Owner's may carry blob.o (the whole project under the Owner's own key, wrapped for the Owner's devices): the
// server checks its shape, keeps it, and gives it to the Owner alone. An Editor's version may not carry it.
// Needs PHP 8.1+ with pdo_mysql and a MySQL / MariaDB server: SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB (as t_api70).
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pub = () => { const k = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' }); return { kty: 'EC', crv: 'P-256', x: k.x, y: k.y }; };
const wrapped = () => ({ e: pub(), iv: b64u(crypto.randomBytes(12)), ct: b64u(crypto.randomBytes(48)) });
const blob = (g, o) => Object.assign({ g, iv: b64u(crypto.randomBytes(12)), ct: b64u(crypto.randomBytes(300)) }, o ? { o } : {});

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8098, db: 'sd_see_test' });
  const { call, account } = srv;
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.11.0', 'health: version 1.11.0', h.j.version);
  const own = await account('Robert', 'robert@example.com'), lan = await account('Lan Anh', 'lan.anh@studio.example');
  const kO = crypto.randomBytes(8).toString('hex'), kO2 = crypto.randomBytes(8).toString('hex'), kL = crypto.randomBytes(8).toString('hex');
  await call(own, 'PUT', '/v1/devkey', { kid: kO, pub: pub() }); await call(own, 'PUT', '/v1/devkey', { kid: kO2, pub: pub() }); await call(lan, 'PUT', '/v1/devkey', { kid: kL, pub: pub() });
  const room = b64u(crypto.randomBytes(16));
  let r = await call(own, 'POST', '/v1/rooms', { id: room, name: 'Robert', wrapped: { [kO]: wrapped() }, members: [{ email: 'lan.anh@studio.example', name: 'Lan Anh', role: 'Editor' }] });
  ok(r.s === 201, 'a room with the Owner and an Editor', r.j);
  await call(lan, 'GET', '/v1/rooms');
  await call(own, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kL]: wrapped() } });

  const o = { iv: b64u(crypto.randomBytes(12)), ct: b64u(crypto.randomBytes(600)), w: { [kO]: wrapped(), [kO2]: wrapped() } };
  r = await call(own, 'PUT', '/v1/rooms/' + room, { base: 0, blob: blob(1, o) });
  ok(r.s === 200 && r.j.ver === 1, 'the Owner writes a version with o beside it', r.j);
  r = await call(own, 'GET', '/v1/rooms/' + room);
  const vo = r.j.versions[0];
  ok(vo.blob.o && vo.blob.o.ct === o.ct && Object.keys(vo.blob.o.w).sort().join() === [kO, kO2].sort().join(), 'the Owner gets it back whole', vo.blob.o && Object.keys(vo.blob.o));
  r = await call(lan, 'GET', '/v1/rooms/' + room);
  ok(r.s === 200 && r.j.versions.length === 1 && !('o' in r.j.versions[0].blob) && r.j.versions[0].blob.ct === vo.blob.ct, 'the Editor gets the same version without o', r.j.versions[0].blob && Object.keys(r.j.versions[0].blob));
  ok((await call(lan, 'PUT', '/v1/rooms/' + room, { base: 1, blob: blob(1, o) })).s === 422, 'an Editor\'s version may not carry o');
  ok((await call(lan, 'PUT', '/v1/rooms/' + room, { base: 1, blob: blob(1) })).s === 200, 'their version without it is taken');
  ok((await call(own, 'PUT', '/v1/rooms/' + room, { base: 2, blob: blob(1, { iv: o.iv, ct: o.ct }) })).s === 422, 'o must wrap the key for at least one device');
  ok((await call(own, 'PUT', '/v1/rooms/' + room, { base: 2, blob: blob(1, Object.assign({}, o, { x: 1 })) })).s === 422, 'o takes iv, ct and w only');
  ok((await call(own, 'PUT', '/v1/rooms/' + room, { base: 2, blob: blob(1, { iv: o.iv, ct: o.ct, w: { 'not a kid': wrapped() } }) })).s === 422, 'w is keyed by device ids');
  r = await call(own, 'POST', '/v1/rooms/' + room + '/rotate', { remove: [], gen: 2, wrapped: { [kO]: wrapped(), [kL]: wrapped() }, base: 2, blob: blob(2, o) });
  ok(r.s === 200, 'a rotation may carry o too', r.j);
  r = await call(lan, 'GET', '/v1/rooms/' + room);
  ok(r.j.versions.every(v => !('o' in v.blob)), 'and the Editor still never sees it');
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
