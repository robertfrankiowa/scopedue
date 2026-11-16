// api.php 1.4.0+: an owner's new device asks the team for the project key; /v1/health limits. Over HTTP against srv60 on :8096 (test mode).
const fs = require('fs'), { execSync } = require('child_process'), crypto = require('crypto');
const S = '/tmp/claude-0/-home-claude/67ee1d36-3853-5987-b134-13d69b65c161/scratchpad/', API = 'http://127.0.0.1:8096/api.php', OUT = S + 'srv60/outbox.jsonl';
let fails = 0, n = 0; const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 300))); if (!c) fails++; };
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pub = () => { const k = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' }); return { kty: 'EC', crv: 'P-256', x: k.x, y: k.y }; };
const wrapped = () => ({ e: pub(), iv: b64u(crypto.randomBytes(12)), ct: b64u(crypto.randomBytes(48)) });
const blob = g => ({ g, iv: b64u(crypto.randomBytes(12)), ct: b64u(crypto.randomBytes(300)) });
async function call(key, m, path, body) { const r = await fetch(API + '?r=' + path, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }
const mails = () => fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
async function account(name, email) {
  const r = await call(null, 'POST', '/v1/studios', { name, email });
  const code = mails().reverse().find(m => m.to === email).body.match(/\b\d{6}\b/)[0];
  return (await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code })).j.key;
}
(async () => {
  execSync('bash ' + S + 'srv60/restart.sh test', { stdio: 'ignore' });
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.6.0' && h.j.limits && h.j.limits.body > 0 && typeof h.j.limits.team === 'boolean', 'health says the version and the largest request this host takes', h.j);
  const own = await account('Robert', 'robert@example.com'), lan = await account('Lan Anh', 'lan.anh@studio.example'), bao = await account('Quoc Bao', 'quoc.bao@studio.example');
  const kO = crypto.randomBytes(8).toString('hex'), kO2 = crypto.randomBytes(8).toString('hex'), kL = crypto.randomBytes(8).toString('hex'), kB = crypto.randomBytes(8).toString('hex'), kX = crypto.randomBytes(8).toString('hex');
  for (const [k, kid] of [[own, kO], [lan, kL], [bao, kB], [lan, kX]]) await call(k, 'PUT', '/v1/devkey', { kid, pub: pub() });
  const room = b64u(crypto.randomBytes(16));
  await call(own, 'POST', '/v1/rooms', { id: room, name: 'Robert', wrapped: { [kO]: wrapped() }, members: [{ email: 'lan.anh@studio.example', name: 'Lan Anh', role: 'Editor' }, { email: 'quoc.bao@studio.example', name: 'Quốc Bảo', role: 'Viewer' }] });
  await call(lan, 'GET', '/v1/rooms'); await call(bao, 'GET', '/v1/rooms');
  ok((await call(own, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kL]: wrapped() } })).s === 200, 'Lan’s device has the key; Quốc Bảo’s does not yet');
  await call(own, 'PUT', '/v1/rooms/' + room, { base: 0, blob: blob(1) });
  // the owner's only device is gone; a new one signs in
  await call(own, 'PUT', '/v1/devkey', { kid: kO2, pub: pub() });
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kO2]: wrapped() } })).s === 403, 'a member cannot hand the key to a device nobody asked for');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/rescue', { kid: kL })).s === 403, 'only the owner asks');
  ok((await call(own, 'POST', '/v1/rooms/' + room + '/rescue', { kid: kL })).s === 422, 'and only for their own device');
  const before = mails().length;
  let r = await call(own, 'POST', '/v1/rooms/' + room + '/rescue', { kid: kO2 });
  ok(r.s === 200 && r.j.asked === true, 'the owner’s new device asks the team for the key');
  const ms = mails().slice(before);
  ok(ms.some(m => m.to === 'lan.anh@studio.example' && /needs a project key/.test(m.subject) && /safety code/.test(m.body) && !/[A-Za-z0-9_-]{40,}/.test(m.body)), 'members hear about it by email, with no key in it', ms.map(m => m.subject));
  r = await call(lan, 'GET', '/v1/rooms/' + room);
  ok(r.j.room.rescue.length === 1 && r.j.room.rescue[0].kid === kO2 && r.j.room.rescue[0].pub.crv === 'P-256', 'members see which device asks, with its public key for the safety code');
  ok((await call(bao, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kO2]: wrapped() } })).s === 403, 'a member whose devices do not hold the key cannot answer');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kO2]: wrapped(), [kX]: wrapped() } })).s === 403, 'nor hand it to anyone else on the way');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/keys', { gen: 2, wrapped: { [kO2]: wrapped() } })).s === 409, 'only for the current key');
  r = await call(lan, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kO2]: wrapped() } });
  ok(r.s === 200, 'Lan hands the key to Robert’s new device');
  r = await call(own, 'GET', '/v1/rooms/' + room);
  ok(r.j.room.keys.some(k => k.kid === kO2) && r.j.room.rescue.length === 0, 'the new device has its key, and the request is gone');
  ok((await call(own, 'POST', '/v1/rooms/' + room + '/rescue', { kid: kO2 })).j.has === true, 'asking again with a key is a no-op');
  // a pending request is cleared by a rotation and by deleting the room
  const kO3 = crypto.randomBytes(8).toString('hex'); await call(own, 'PUT', '/v1/devkey', { kid: kO3, pub: pub() });
  await call(own, 'POST', '/v1/rooms/' + room + '/rescue', { kid: kO3 });
  await call(own, 'POST', '/v1/rooms/' + room + '/rotate', { remove: ['quoc.bao@studio.example'], gen: 2, wrapped: { [kO2]: wrapped(), [kL]: wrapped() }, base: 1, blob: blob(2) });
  ok((await call(lan, 'GET', '/v1/rooms/' + room)).j.room.rescue.length === 0, 'a new key clears old requests');
  ok((await call(own, 'DELETE', '/v1/rooms/' + room)).s === 200, 'the room deletes with its requests');
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
})().catch(e => { console.error(e); process.exit(1); });
