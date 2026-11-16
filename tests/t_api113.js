// api.php 1.20.0 (v113): the pulse (CONTRACT.md 72), over HTTP against a fresh MySQL database in test mode. One number for each
// account, Viewer portal and client, that goes up when something changed for it: a Viewer's feedback, a client's reply, the studio's
// writes to the client portal, an invitation, a teammate's save to Drive (POST /v1/pulse). It says nothing else.
// Needs PHP 8.1+ with pdo_mysql and a MySQL / MariaDB server: SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB (as t_api70).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8113, db: 'sd_pulse_test' });
  const { call, account, lastTo, my, db } = srv;
  const sql = q => my([db, '-N', '-e', q]).toString().trim();
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    const own = await account('Robert', 'robert@example.com'), lan = await account('Lan Anh', 'lan@studio.example');
    const pulse = async k => (await call(k, 'GET', '/v1/pulse')).j.n;
    ok((await call(null, 'GET', '/v1/pulse')).s === 401, 'the pulse needs a key');
    let r = await call(own, 'GET', '/v1/pulse');
    ok(r.s === 200 && r.j.n === 0 && Object.keys(r.j).join() === 'n', 'a new account starts at 0, and the answer is the number alone', r.j);

    // ---------------------------------------------------------------- the Viewer portal
    const show = { rel: { name: 'v1', date: '2026-11-30', ship: 'Invoices' }, items: [{ id: 'i1', t: 'Export invoices', sec: 'in', st: 'doing' }], ships: [] };
    const entries = [{ id: 'f1', k: 'req', fr: ['bao@corp.example'], names: 'Bảo', t: 'Show the tax code', st: 'park', vo: [], ts: 1, cm: [] }];
    const vput = e => call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show, entries: e, viewers: [{ email: 'bao@corp.example', name: 'Quốc Bảo' }] });
    await vput(entries);
    await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'bao@corp.example' });
    const bao = (await call(null, 'POST', '/v1/vsession', { token: lastTo('bao@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1] })).j.session;
    const vp = async () => (await call(bao, 'GET', '/v1/vpulse')).j.n;
    const v0 = await vp(), a0 = await pulse(own);
    ok((await call(bao, 'GET', '/v1/viewer')).j.pulse === v0, 'the Viewer portal\'s load carries the number it covers');
    ok(typeof v0 === 'number' && (await call(own, 'GET', '/v1/vpulse')).s === 401, 'the Viewer has their portal\'s number; a studio key is not a Viewer session', v0);
    await vput(entries);
    ok(await vp() === v0, 'the Owner publishing the same again does not move the Viewer\'s');
    await vput(entries.concat([{ id: 'f2', k: 'bug', fr: ['bao@corp.example'], names: 'Bảo', t: 'PDF cuts a line', st: 'new', vo: [], ts: 2, cm: [] }]));
    const v1 = await vp();
    ok(v1 === v0 + 1, 'something new to show moves it', [v0, v1]);
    r = await call(bao, 'POST', '/v1/vsend', { k: 'req', t: 'Export to Excel too', key: 'k1' });
    const a1 = await pulse(own), v2 = await vp();
    ok(r.s === 201 && a1 === a0 + 1 && v2 === v1 + 1, 'the Viewer sends feedback: the Owner\'s number moves, and the portal\'s', [r.s, a0, a1, v1, v2]);
    ok(await pulse(lan) === 0, 'nobody else\'s');
    const items = (await call(own, 'GET', '/v1/vinbox/sealed')).j.items;
    ok(await pulse(own) === a1 && await vp() === v2, 'reading the inbox moves nothing');
    await call(own, 'POST', '/v1/vinbox/ack', { ids: items.map(x => x.id) });
    ok(await vp() === v2 + 1 && await pulse(own) === a1, 'taking it moves the portal\'s (it reached the Owner)');

    // ---------------------------------------------------------------- the client portal
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const L = await srv.link(own, { client: 'greenhome' });
    const linh = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    const cp = async () => (await call(linh, 'GET', '/v1/cpulse')).j.n;
    const c0 = await cp();
    ok(typeof c0 === 'number' && (await call(bao, 'GET', '/v1/cpulse')).s === 401, 'the client has their number; a Viewer session is not a client one', c0);
    ok((await call(linh, 'GET', '/v1/portal')).j.pulse === c0, 'the client portal\'s load carries the number it covers');
    r = await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }] });
    const c1 = await cp();
    ok(r.s === 201 && c1 === c0 + 1, 'the studio issues Scope v1: the client\'s number moves', [r.s, c0, c1]);
    r = await call(linh, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    r = await call(linh, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300 && await cp() === c1, 'Linh approves it: her own number does not move', r.j);
    const a2 = await pulse(own);
    r = await call(linh, 'POST', '/v1/respond', { action: 'request', project: 'shop', title: 'Gift cards', tx: 'Could the store sell gift cards?' });
    ok(r.s < 300 && await pulse(own) > a2, 'the client asks for a change: the studio\'s moves', [r.s, a2]);
    const c2 = await cp();
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 1, ty: 'note', tx: 'Which amounts?' });
    ok(r.s === 201 && await cp() === c2 + 1, 'the studio answers it: the client\'s moves', [r.s, r.j]);

    // ---------------------------------------------------------------- invitations and Drive
    const l0 = await pulse(lan);
    r = await call(own, 'PUT', '/v1/invites', { fid: 'folder123', email: 'lan@studio.example', project: 'HR tool', role: 'Editor' });
    const l1 = await pulse(lan);
    ok(r.s === 201 && l1 === l0 + 1, 'an invitation moves the invited person\'s number', [r.s, l0, l1]);
    const id = (await call(lan, 'GET', '/v1/invites')).j.to_me[0].id, a3 = await pulse(own);
    await call(lan, 'POST', '/v1/invites/' + id + '/accept');
    ok(await pulse(own) === a3 + 1, 'accepting it moves the Owner\'s');
    const a4 = await pulse(own), l2 = await pulse(lan);
    r = await call(lan, 'POST', '/v1/pulse', { to: ['robert@example.com', 'LAN@studio.example', 'nobody@nowhere.example'] });
    ok(r.s === 200 && JSON.stringify(r.j) === '{"ok":true}' && await pulse(own) === a4 + 1 && await pulse(lan) === l2 + 1, 'a save to Drive moves the people named (an address without an account is skipped, the answer the same)', [r.j, a4, l2]);
    ok((await call(lan, 'POST', '/v1/pulse', { to: 'robert@example.com' })).s === 422 && (await call(lan, 'POST', '/v1/pulse', { to: ['not an email'] })).s === 422 && (await call(lan, 'POST', '/v1/pulse', { to: [], x: 1 })).s === 422, 'POST /v1/pulse takes a list of addresses, nothing else');
    ok((await call(null, 'POST', '/v1/pulse', { to: ['robert@example.com'] })).s === 401, 'only an account moves it');
    ok(sql('SELECT COUNT(*) FROM api_pulse WHERE k NOT REGEXP \'^[avc][0-9]+$\'') === '0', 'the table holds only counters, keyed a/v/c and an id');
  } catch (e) { ok(false, 'threw', String(e && e.stack || e)); }
  finally { srv.stop(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + (n - fails) + '/' + n);
  process.exit(fails ? 1 : 0);
})();
