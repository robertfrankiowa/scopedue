// api.php 1.3.0 team rooms, over HTTP against srv60 on :8096 (test mode). Shapes only: the server never sees a key.
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
  const v = await call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code });
  return v.j.key;
}
(async () => {
  execSync('bash ' + S + 'srv60/restart.sh test', { stdio: 'ignore' });
  const own = await account('Robert', 'robert@example.com'), lan = await account('Lan Anh', 'lan.anh@studio.example'), bao = await account('Quoc Bao', 'quoc.bao@studio.example');
  ok(!!own && !!lan && !!bao, 'three accounts');
  const kO = crypto.randomBytes(8).toString('hex'), kL = crypto.randomBytes(8).toString('hex'), kB = crypto.randomBytes(8).toString('hex');
  ok((await call(own, 'PUT', '/v1/devkey', { kid: kO, pub: pub() })).s === 201, 'a device publishes its public key');
  ok((await call(own, 'PUT', '/v1/devkey', { kid: kO, pub: { kty: 'RSA' } })).s === 422, 'only P-256 keys');
  ok((await call(lan, 'PUT', '/v1/devkey', { kid: kO, pub: pub() })).s === 409, 'a key id belongs to one account');
  await call(lan, 'PUT', '/v1/devkey', { kid: kL, pub: pub() }); await call(bao, 'PUT', '/v1/devkey', { kid: kB, pub: pub() });
  const room = b64u(crypto.randomBytes(16));
  let r = await call(own, 'POST', '/v1/rooms', { id: room, wrapped: { [kL]: wrapped() }, members: [] });
  ok(r.s === 422, 'the owner can only wrap the key for their own devices');
  r = await call(own, 'POST', '/v1/rooms', { id: room, name: 'Robert', wrapped: { [kO]: wrapped() }, members: [{ email: 'lan.anh@studio.example', name: 'Lan Anh', role: 'Editor' }, { email: 'quoc.bao@studio.example', name: 'Quốc Bảo', role: 'Viewer' }] });
  ok(r.s === 201 && r.j.room.role === 'Owner' && r.j.room.members.length === 3 && r.j.room.keys.length === 1, 'a room with the owner, an Editor and a Viewer', r.j);
  ok(mails().some(m => m.to === 'lan.anh@studio.example' && /added you to a project/.test(m.subject) && !/[A-Za-z0-9_-]{40,}/.test(m.body)), 'invitations carry no key and no project data');
  ok(JSON.stringify((r.j.room.need || []).map(x => x.kid).sort()) === JSON.stringify([kL, kB].sort()) && r.j.room.members.filter(m => m.role !== 'Owner').every(m => !m.joined), 'people who already have an account can get the key at once, though they have not opened it yet');
  r = await call(lan, 'GET', '/v1/rooms');
  ok(r.s === 200 && r.j.rooms.length === 1 && r.j.rooms[0].role === 'Editor' && r.j.rooms[0].keys.length === 0, 'Lan Anh sees the room, without a key yet');
  await call(bao, 'GET', '/v1/rooms');
  r = await call(own, 'GET', '/v1/rooms');
  const need = r.j.rooms[0].need.map(x => x.kid).sort();
  ok(JSON.stringify(need) === JSON.stringify([kL, kB].sort()), 'the owner sees which devices wait for the key');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kB]: wrapped() } })).s === 403, 'only the owner hands out keys');
  ok((await call(own, 'POST', '/v1/rooms/' + room + '/keys', { gen: 1, wrapped: { [kL]: wrapped(), [kB]: wrapped() } })).s === 200, 'the owner wraps the key for each device');
  r = await call(lan, 'GET', '/v1/rooms/' + room);
  ok(r.j.room.keys.length === 1 && r.j.room.keys[0].kid === kL && r.j.versions.length === 0, 'each device gets only its own wrapped key');
  // writes
  ok((await call(own, 'PUT', '/v1/rooms/' + room, { base: 0, blob: blob(1) })).j.ver === 1, 'the first snapshot is version 1');
  ok((await call(lan, 'PUT', '/v1/rooms/' + room, { base: 0, blob: blob(1) })).s === 409, 'a write on an old version is refused');
  r = await call(lan, 'PUT', '/v1/rooms/' + room, { base: 1, blob: blob(1) });
  ok(r.j.ver === 2, 'an Editor writes on top of the latest');
  ok((await call(bao, 'PUT', '/v1/rooms/' + room, { base: 2, blob: blob(1) })).s === 403, 'a Viewer cannot write');
  ok((await call(lan, 'PUT', '/v1/rooms/' + room, { base: 2, blob: blob(2) })).s === 409, 'a snapshot under the wrong key generation is refused');
  r = await call(bao, 'GET', '/v1/rooms/' + room + '&since=0');
  ok(r.j.versions.length === 2 && r.j.versions[1].by === 'lan.anh@studio.example' && r.j.versions[1].role === 'Editor', 'versions say who wrote them, and in which role');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/members', { email: 'x@studio.example', role: 'Editor' })).s === 403, 'only the owner adds people');
  // nudges
  r = await call(lan, 'POST', '/v1/rooms/' + room + '/nudge', { to: 'robert@example.com', kind: 'review' });
  const nm = mails().reverse().find(m => m.to === 'robert@example.com');
  ok(r.j.sent === true && /asked you to review something/.test(nm.subject) && /not in this email/.test(nm.body), 'a nudge says something waits, not what');
  ok((await call(lan, 'POST', '/v1/rooms/' + room + '/nudge', { to: 'robert@example.com', kind: 'review' })).j.later === true, 'at most one an hour');
  // removing a member rotates the key
  ok((await call(own, 'POST', '/v1/rooms/' + room + '/rotate', { remove: ['quoc.bao@studio.example'], gen: 2, wrapped: { [kO]: wrapped(), [kB]: wrapped() }, base: 2, blob: blob(2) })).s === 422, 'the new key cannot go to someone who is leaving');
  r = await call(own, 'POST', '/v1/rooms/' + room + '/rotate', { remove: ['quoc.bao@studio.example'], gen: 2, wrapped: { [kO]: wrapped(), [kL]: wrapped() }, base: 2, blob: blob(2) });
  ok(r.s === 200 && r.j.gen === 2 && r.j.ver === 3, 'removing someone rotates the key and writes the project again');
  ok((await call(bao, 'GET', '/v1/rooms/' + room)).s === 404 && (await call(bao, 'GET', '/v1/rooms')).j.rooms.length === 0, 'the person removed loses the room');
  r = await call(lan, 'GET', '/v1/rooms/' + room + '&since=0');
  ok(r.j.versions.length === 1 && r.j.room.gen === 2 && r.j.room.keys.every(k => k.gen === 2), 'old versions and old keys are gone');
  ok((await call(own, 'DELETE', '/v1/rooms/' + room)).s === 200 && (await call(lan, 'GET', '/v1/rooms')).j.rooms.length === 0, 'stopping removes everything from the server');
  ok((await call(null, 'GET', '/v1/health')).j.version === '1.4.1', 'version 1.4.1');
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED ' + n);
})().catch(e => { console.error(e); process.exit(1); });
