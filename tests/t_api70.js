// api.php 1.5.0 (v70): the Viewer portal (CONTRACT.md 32.6), over HTTP against a fresh MySQL database in test mode.
// The studio publishes a showcase and its Viewers; a Viewer gets a link of their own, signs in, sees only what was chosen,
// sends each kind (pictures too), answers an approval with an emailed code; the studio takes what was sent. Who may do what:
// a Viewer cannot read another project or act as a client, a Viewer taken off the list is out, a retry is not a second entry.
// Needs PHP 8.1+ with pdo_mysql and a MySQL / MariaDB server. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN (folder of mysql/mysqldump),
// SD_DB_USER, SD_SCHEMA_DB (a database with the site's users and admin_notifications tables, to copy their structure).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null, call, lastTo, mails, account, my, DB;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
async function viewerSession(email) {
  const k = lastTo(email).body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1];
  return (await call(null, 'POST', '/v1/vsession', { token: k })).j.session;
}
const PIC = Buffer.from('a small picture standing in for a JPEG').toString('base64');

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8097, db: 'sd_viewer_test' });
  ({ call, lastTo, mails, account, my, db: DB } = srv);
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0' && /viewer\.html$/.test(h.j.viewer), 'health: version 1.30.0 and where the Viewer portal is', h.j);
  const own = await account('Robert', 'robert@example.com'), other = await account('Mai', 'mai@example.com');

  // ---------------------------------------------------------------- the studio publishes what Viewers see
  const show = { rel: { name: 'v1', date: '2026-11-30', ship: 'Invoices can be exported' }, items: [{ id: 'i1', t: 'Export invoices to PDF', sec: 'in', st: 'doing' }], ships: [], secret: 'never kept' };
  const entries = [
    { id: 'f1', k: 'req', fr: ['lan@corp.example'], names: 'Lan', t: 'Show the tax code', st: 'park', vo: ['lan@corp.example'], ts: 1, cm: [] },
    { id: 'f2', k: 'bug', fr: ['bao@corp.example'], names: 'Bảo', t: 'PDF cuts the last line', st: 'fixed', vo: [], ts: 2, cm: [{ names: 'Bảo', t: 'Also on Safari', ts: 3 }] },
    { id: 'f3', k: 'appr', fr: ['lan@corp.example'], names: 'Lan', t: 'Is v1 good to release?', ab: 'Release v1', st: 'wait', vo: [], ts: 4, cm: [] }];
  const put = await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show, entries, viewers: [{ email: 'lan@corp.example', name: 'Lan Anh', lang: 'vi' }, { email: 'bao@corp.example', name: 'Quốc Bảo' }] });
  ok(put.s === 200 && put.j.viewers.length === 2 && put.j.viewers.every(v => v.invited_at === null), 'the studio publishes the showcase and two Viewers', put);
  ok((await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show, entries, viewers: [{ email: 'not an email', name: 'X' }] })).s === 422, 'a Viewer needs a real email');
  ok((await call(null, 'PUT', '/v1/vprojects/hr-tool', { name: 'x' })).s === 401, 'only a studio key publishes');
  ok((await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'nobody@corp.example' })).s === 404, 'only a Viewer on the list can be invited');

  // ---------------------------------------------------------------- a link of their own, in their language
  const inv = await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'lan@corp.example' });
  const m1 = lastTo('lan@corp.example');
  ok(inv.s === 201 && inv.j.sent && /viewer\.html#k=sdm_/.test(inv.j.url) && /muốn nghe ý kiến của bạn về HR tool/.test(m1.subject) && /Chào Lan,/.test(m1.body), 'Invite: a link to the Viewer portal, emailed in the Viewer\'s language', m1 && m1.subject);
  const lan = await viewerSession('lan@corp.example');
  ok(/^sdw_/.test(lan), 'the link opens a Viewer session (its own kind)');
  ok((await call(null, 'POST', '/v1/vsession', { token: 'sdm_nope' })).s === 401 && (await call(null, 'POST', '/v1/session', { token: lastTo('lan@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] })).s === 401, 'a wrong link opens nothing, and a Viewer link is not a client link');
  /* 1.9.1: an expired link names its portal (so a browser that never opened it can ask for a new link there); a wrong one names nothing */
  const lk = lastTo('lan@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1], lh = require('crypto').createHash('sha256').update(lk).digest('hex');
  my([DB, '-e', "UPDATE api_vlinks SET expires_at = 1 WHERE token_hash = '" + lh + "'"]);
  const ex = await call(null, 'POST', '/v1/vsession', { token: lk }), bad = await call(null, 'POST', '/v1/vsession', { token: 'sdm_nope' });
  ok(ex.s === 401 && ex.j.error.code === 'link_invalid' && ex.j.error.detail && ex.j.error.detail.project === 'hr-tool' && /^[a-z0-9]{6,20}$/.test(ex.j.error.detail.studio) && !bad.j.error.detail, 'an expired link names its portal for a new link; a wrong one names nothing', [ex.j, bad.j]);
  my([DB, '-e', "UPDATE api_vlinks SET expires_at = " + (Date.now() + 86400000) + " WHERE token_hash = '" + lh + "'"]);

  // ---------------------------------------------------------------- what Lan sees
  const v1 = await call(lan, 'GET', '/v1/viewer');
  const e1 = v1.j.entries.find(e => e.id === 'f1'), e2 = v1.j.entries.find(e => e.id === 'f2');
  ok(v1.s === 200 && v1.j.project.name === 'HR tool' && v1.j.show.rel.name === 'v1' && !('secret' in v1.j.show) && v1.j.viewer.email === 'l•••••@corp.example', 'the showcase as chosen, nothing else kept; their own address masked', v1.j.show);
  ok(e1.mine && e1.voted && e1.vo === 1 && !e2.mine && !('fr' in e1) && e2.names === 'Bảo', 'entries: who said it by name only (no other Viewer\'s email), which are theirs, votes counted');
  ok((await call(lan, 'GET', '/v1/portal')).s === 401 && (await call(lan, 'POST', '/v1/respond', { action: 'note' })).s === 401 && (await call(lan, 'GET', '/v1/projects')).s === 401, 'a Viewer session cannot act as a client or a studio');

  // ---------------------------------------------------------------- sending
  let r = await call(lan, 'POST', '/v1/vsend', { k: 'bug', t: 'The total is wrong when a line is deleted', files: [{ name: 'shot.jpg', type: 'image/jpeg', data: PIC }], key: 'k1' });
  ok(r.s === 201, 'a bug with a picture', r);
  r = await call(lan, 'POST', '/v1/vsend', { k: 'bug', t: 'The total is wrong when a line is deleted', files: [{ name: 'shot.jpg', type: 'image/jpeg', data: PIC }], key: 'k1' });
  ok(r.s === 200 && r.j.again, 'the same key again: the same entry, not a second one');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'bug', t: 'x', files: [{ name: 'a.exe', type: 'application/x-msdownload', data: PIC }] })).s === 422, 'only pictures (and words of two letters or more)');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'cf', on: 'f1' })).s === 409 && (await call(lan, 'POST', '/v1/vsend', { k: 'cf', on: 'f2', t: 'Works now' })).s === 201, 'Confirm it works only once it is fixed or built');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'vote', on: 'f2' })).s === 422 && (await call(lan, 'POST', '/v1/vsend', { k: 'vote', on: 'f1' })).s === 201, 'a vote only on a request');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'test', t: 'Export works', res: 'pass', ab: 'i1' })).s === 201 && (await call(lan, 'POST', '/v1/vsend', { k: 'cmt', on: 'f9', t: 'hi there' })).s === 404, 'a test result; a comment needs an entry that exists');
  const pend = (await call(lan, 'GET', '/v1/viewer')).j.pending;
  ok(pend.length === 4 && pend[0].k === 'bug' && pend[0].files === 1, 'what they sent shows as on its way until the app takes it', pend);
  /* 1.26.0 (CONTRACT 90): the studio is told of each thing, by what it is, never of a vote */
  const told = mails().filter(m => m.to === 'robert@example.com' && /^Lan Anh /.test(m.subject)).map(m => m.subject);
  ok(told.some(t => /Lan Anh reported a problem on HR tool/.test(t)) && told.some(t => /Lan Anh confirmed it works on HR tool/.test(t)) && told.some(t => /Lan Anh tested it on HR tool: it works/.test(t)) && !told.some(t => /vote/i.test(t)), 'the studio is told of each thing by what it is, not of a vote', told);

  // ---------------------------------------------------------------- an approval, with a code to their own email
  ok((await call(lan, 'POST', '/v1/vcode', { on: 'f1' })).s === 409, 'only what they are asked to approve');
  const bao = await (async () => { await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'bao@corp.example' }); return viewerSession('bao@corp.example'); })();
  ok((await call(bao, 'POST', '/v1/vcode', { on: 'f3' })).s === 409, 'someone else cannot answer for Lan');
  const cd = await call(lan, 'POST', '/v1/vcode', { on: 'f3' });
  const code = lastTo('lan@corp.example').body.match(/\b\d{6}\b/)[0];
  ok(cd.s === 201 && /^l•/.test(cd.j.to), 'a code goes to the Viewer\'s email', cd);
  ok((await call(lan, 'POST', '/v1/vapprove', { challenge: cd.j.challenge, code: '000000', v: 'yes' })).s === 422, 'a wrong code does nothing');
  r = await call(lan, 'POST', '/v1/vapprove', { challenge: cd.j.challenge, code, v: 'yes', t: 'Fine to release' });
  ok(r.s === 201 && (await call(lan, 'GET', '/v1/viewer')).j.approvals.some(a => a.on === 'f3' && a.v === 'yes'), 'the right code: the answer is kept', r);
  ok((await call(lan, 'POST', '/v1/vcode', { on: 'f3' })).s === 409, 'and cannot be given twice');
  /* 1.9.2: an approval asked of two; the app says who has answered (an); each Viewer is told only their own, and one whose answer
     the dev recorded cannot answer again on the portal */
  await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show, viewers: [{ email: 'lan@corp.example', name: 'Lan Anh', lang: 'vi' }, { email: 'bao@corp.example', name: 'Quốc Bảo' }],
    entries: entries.concat([{ id: 'f9', k: 'appr', fr: ['lan@corp.example', 'bao@corp.example'], names: 'Lan, Bảo', t: 'Is the export good?', st: 'wait', an: { 'Bao@corp.example': 'nope', 'x@y.example': 'maybe' }, ts: 9 }]) });
  const f9b = (await call(bao, 'GET', '/v1/viewer')).j.entries.find(e => e.id === 'f9'), f9l = (await call(lan, 'GET', '/v1/viewer')).j.entries.find(e => e.id === 'f9');
  ok(f9b.myv === 'nope' && !('myv' in f9l) && !('an' in f9b) && !('an' in f9l) && !JSON.stringify(f9l).includes('bao@'), 'each Viewer is told their own answer only, never who else answered', [f9b, f9l]);
  const twice = await call(bao, 'POST', '/v1/vcode', { on: 'f9' });
  ok(twice.s === 409 && twice.j.error.code === 'already', 'an answer the dev recorded for Bảo: he cannot answer again on the portal', twice.j);

  // ---------------------------------------------------------------- the studio takes it
  ok((await call(other, 'GET', '/v1/vinbox')).j.items.length === 0, 'another studio sees none of it');
  const box = (await call(own, 'GET', '/v1/vinbox')).j.items;
  const bug = box.find(x => x.k === 'bug'), ap = box.find(x => x.k === 'appr');
  ok(box.length === 5 && bug.project === 'hr-tool' && bug.from === 'lan@corp.example' && bug.files[0].data === PIC && ap.v === 'yes' && ap.code === true, 'the inbox: each entry with who, the project, pictures, and the coded approval', box.map(x => x.k));
  ok((await call(other, 'POST', '/v1/vinbox/ack', { ids: box.map(x => x.id) })).j.taken === 0, 'another studio cannot take them');
  ok((await call(own, 'POST', '/v1/vinbox/ack', { ids: box.map(x => x.id) })).j.taken === 5 && (await call(own, 'GET', '/v1/vinbox')).j.items.length === 0 && (await call(lan, 'GET', '/v1/viewer')).j.pending.length === 0, 'taken: gone from the server, pictures too');

  // ---------------------------------------------------------------- v90 (32.7): sealed for the Owner's devices
  const jwk = async () => { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']); const j = await crypto.subtle.exportKey('jwk', k.publicKey); return { kty: 'EC', crv: 'P-256', x: j.x, y: j.y }; };
  const d1 = { kid: '0123456789abcdef', pub: await jwk() }, d2 = { kid: 'fedcba9876543210', pub: await jwk() };
  const base = { name: 'HR tool', show, entries, viewers: [{ email: 'lan@corp.example', name: 'Lan Anh', lang: 'vi' }, { email: 'bao@corp.example', name: 'Quốc Bảo' }] };
  ok((await call(own, 'PUT', '/v1/vprojects/hr-tool', Object.assign({}, base, { keys: [{ kid: 'xyz', pub: d1.pub }] }))).s === 422 && (await call(own, 'PUT', '/v1/vprojects/hr-tool', Object.assign({}, base, { keys: [{ kid: d1.kid, pub: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' } }] }))).s === 422, 'v90: a device key that is not one is refused');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'req', t: 'Still in the clear', key: 'kclear1' })).s === 201, 'before the Owner’s app gives a key, words go as before');
  await call(own, 'PUT', '/v1/vprojects/hr-tool', Object.assign({}, base, { keys: [d1] })); await call(own, 'PUT', '/v1/vprojects/hr-tool', Object.assign({}, base, { keys: [d2] }));
  const vk = (await call(lan, 'GET', '/v1/viewer')).j.keys;
  ok(vk.map(k => k.kid).join() === d2.kid + ',' + d1.kid && vk.every(k => Object.keys(k).join() === 'kid,pub' && k.pub.x), 'each device of the Owner’s adds its key; the portal gets them, the newest first, public keys only', vk);
  const r409 = await call(lan, 'POST', '/v1/vsend', { k: 'req', t: 'Words in the clear', key: 'kclear2' });
  ok(r409.s === 409 && r409.j.error.code === 'keys_changed', 'then words in the clear are refused (an old page reloads and seals)', r409.j);
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'vote', on: 'f1' })).s === 201, 'a vote has no words: it still goes as it is');
  const w = { kid: d1.kid, e: d2.pub, iv: 'AAAAAAAAAAAAAAAA', ct: 'B'.repeat(64) };
  const enc = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'C'.repeat(200), keys: [w, Object.assign({}, w, { kid: d2.kid })] };
  const sealedPic = Buffer.alloc(80, 7).toString('base64');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'bug', enc, key: 'ks1', t: 'also here' })).s === 422 && (await call(lan, 'POST', '/v1/vsend', { k: 'bug', enc })).s === 422 && (await call(lan, 'POST', '/v1/vsend', { k: 'vote', on: 'f1', enc, key: 'ks2' })).s === 422,
    'sealed: no words beside it, a key of its own, and never a vote');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'bug', enc: Object.assign({}, enc, { keys: [Object.assign({}, w, { kid: 'aaaaaaaaaaaaaaaa' })] }), key: 'ks3' })).s === 409, 'sealed for a device the portal was not given: refused');
  ok((await call(lan, 'POST', '/v1/vsend', { k: 'bug', enc, key: 'ks4', files: [{ name: 'x.jpg', type: 'image/jpeg', data: PIC }] })).s === 422, 'a sealed entry’s pictures are sealed too');
  const sb = await call(lan, 'POST', '/v1/vsend', { k: 'bug', enc, key: 'ks5', files: [{ name: 'my-screen.jpg', type: 'sd/sealed', data: sealedPic }] });
  ok(sb.s === 201, 'a sealed bug with a sealed picture is taken', sb.j);
  const spend = (await call(lan, 'GET', '/v1/viewer')).j.pending.filter(x => x.key === 'ks5')[0];
  ok(spend && spend.sealed === true && !('t' in spend) && spend.files === 1, 'the portal gets it back as on its way, sealed, without words', spend);
  ok(!(await call(own, 'GET', '/v1/vinbox')).j.items.some(x => x.enc), 'an app from before 1.8.0 (/v1/vinbox) is not given sealed entries');
  const it = (await call(own, 'GET', '/v1/vinbox/sealed')).j.items.filter(x => x.key === 'ks5')[0];
  ok(it && it.enc.keys.length === 2 && it.enc.ct === enc.ct && !('t' in it) && it.files[0].type === 'sd/sealed' && it.files[0].name === 'picture' && it.files[0].data === sealedPic, 'the inbox hands the Owner’s app the sealed entry as it came, with its key; no name kept for the picture', it);
  const row = my([DB, '-N', '-e', "SELECT CONCAT(v.body, ' ', f.name) FROM api_vsent v JOIN api_vfiles f ON f.sent_id = v.id WHERE v.ukey = 'ks5'"]).toString();
  ok(!/my-screen/.test(row) && /"enc"/.test(row), 'the database holds only the sealed part', row.slice(0, 200));
  const many = []; for (let i = 0; i < 11; i++) many.push({ kid: (i.toString(16) + 'a').padStart(16, '0'), pub: d1.pub });
  for (const k of many) await call(own, 'PUT', '/v1/vprojects/hr-tool', Object.assign({}, base, { keys: [k] }));
  ok((await call(lan, 'GET', '/v1/viewer')).j.keys.length === 10, 'at most 10 device keys, the most recent');
  await call(own, 'POST', '/v1/vinbox/ack', { ids: (await call(own, 'GET', '/v1/vinbox/sealed')).j.items.map(x => x.id) });

  // ---------------------------------------------------------------- a lost link, and a Viewer taken off the list
  ok((await call(null, 'POST', '/v1/vlogin', { studio: 'whatever1', project: 'hr-tool', email: 'x@y.example' })).s === 202, 'asking for a new link answers the same whether or not the address is known');
  const before = mails().length;
  await call(null, 'POST', '/v1/vlogin', { studio: (await call(own, 'GET', '/v1/studio')).j.studio.slug, project: 'hr-tool', email: 'bao@corp.example' });
  await new Promise(r => setTimeout(r, 300));
  ok(mails().length === before + 1 && /Your link to HR tool/.test(lastTo('bao@corp.example').subject), 'a Viewer on the list gets a new link');
  await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show, entries, viewers: [{ email: 'lan@corp.example', name: 'Lan Anh', lang: 'vi' }] });
  ok([401, 403].includes((await call(bao, 'GET', '/v1/viewer')).s) && [401, 403].includes((await call(bao, 'POST', '/v1/vsend', { k: 'req', t: 'hello there' })).s), 'taken off the list: out at once');
  ok((await call(own, 'DELETE', '/v1/vprojects/hr-tool')).s === 200 && (await call(lan, 'GET', '/v1/viewer')).s === 401, 'the studio closes the portal for the project: every session goes');
  const kept = my([DB, '-N', '-e', 'SELECT COUNT(*) FROM api_vapprovals']).toString().trim();
  ok(kept === '1', 'approvals stay on record', kept);
  let refused = false; try { my([DB, '-e', "UPDATE api_vapprovals SET v = 'nope'"]); } catch (e) { refused = true; }
  ok(refused, 'and cannot be changed');
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
