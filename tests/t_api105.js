// api.php 1.15.0 (v106): the handoff checklist (CONTRACT.md 63), over HTTP against a fresh MySQL database in test mode. A v2 Scope
// lists what is handed over (sec ho, with a milestone); the studio marks each handed over (gave, with words and a link), the client
// says they received it (recv); nothing is locked or held back; and a database at schema 12 moves to 13.
// Needs what t_api70.js needs.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const V12 = `'deliver','got','pause','resume','close','accept','changes','notmet','flag','sent','end','check','paid','nopay'`;

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8098, db: 'sd_ho105_api' });
  const { call, mails, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    // ---------------------------------------------------------------- a database at schema 12 moves to 13
    sql('ALTER TABLE api_mev DROP CONSTRAINT api_mev_ty'); sql(`ALTER TABLE api_mev ADD CONSTRAINT api_mev_ty CHECK (ty IN (${V12}))`); sql("UPDATE api_kv SET v = '12' WHERE k = 'schema'");
    let refused = ''; try { sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 0, 'y', 'gave', 'h', 1, 'x', 1, '', '', '', 'x', NULL, 1)"); } catch (e) { refused = 'yes'; }
    ok(refused === 'yes', 'at schema 12 the check refuses gave');
    await call(null, 'GET', '/v1/health');
    sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 0, 'y', 'gave', 'h', 1, 'x', 1, '', '', '', 'x', NULL, 1)");
    ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23', 'the next request moves it on to the latest (15), which takes gave and recv');

    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    const base = [{ id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 }, { id: 'a', sec: 'in', t: 'Home page', m: 'm1' }];
    const ver = items => call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items: base.concat(items) });

    // ---------------------------------------------------------------- the Scope: what is handed over
    let r = await ver([{ id: 'h1', sec: 'ho', t: 'Domain', d: d(3) }]);
    const r2 = await ver([{ id: 'h1', sec: 'ho', t: 'Domain', m: 'nope' }]);
    const r3 = await ver([{ id: 'h1', sec: 'ho', t: 'Domain', ok: 'It resolves' }]);
    const r4 = await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Home page' }, { id: 'h1', sec: 'ho', t: 'Domain' }] });
    ok(r.s === 422 && r2.s === 422 && r3.s === 422 && r4.s === 422, 'refused: a date on it, a milestone that is not one, a Done when line, and a Scope without the agreement', [r.j, r2.j, r3.j, r4.j]);
    r = await ver([{ id: 'h1', sec: 'ho', t: 'Source code in a GitHub repository', m: 'm1' }, { id: 'h2', sec: 'ho', t: 'Domain and hosting' }]);
    ok(r.s === 201, 'Scope v1 lists two things handed over, one with Design sign-off, one with the last milestone', r.j);
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    const pt = (await call(sess, 'GET', '/v1/portal')).j.projects[0];
    ok(pt.vers[0].items.filter(x => x.sec === 'ho').map(x => x.t + '/' + x.m).join() === 'Source code in a GitHub repository/m1,Domain and hosting/', 'the client\'s portal gets the lines', pt.vers[0].items);

    // ---------------------------------------------------------------- handed over, received
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'gave', m: 'a', tx: 'x' });
    ok(r.s === 409, 'only a line the Scope hands over', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'gave', m: 'h1', link: 'not a link' });
    ok(r.s === 422, 'a link must be a link', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'recv', project: 'shop', m: 'h1', n: 0 });
    ok(r.s === 409 && /not been handed over/.test(r.j.error.message), 'the client cannot receive what was not handed over', r.j);
    let before = mails().length;
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'gave', m: 'h1', tx: 'Ownership of the repository moved to Linh', link: 'https://github.com/greenhome/shop' });
    ok(r.s === 201 && r.j.event.ty === 'gave' && r.j.event.link === 'https://github.com/greenhome/shop', 'Robert hands over the source code before Design sign-off is accepted: nothing stops him', r.j);
    const m1 = mails().slice(before).filter(x => x.to === 'linh@greenhome.example');
    ok(m1.length === 1 && /Robert handed over Source code in a GitHub repository/.test(m1[0].subject) && /github\.com\/greenhome\/shop/.test(m1[0].body), 'Linh is emailed, with the words and the link', m1.map(x => x.subject));
    before = mails().length;
    r = await call(sess, 'POST', '/v1/respond', { action: 'recv', project: 'shop', m: 'h1', n: 1, tx: 'Got the invite, accepted' });
    ok(r.s === 201 && r.j.event.ty === 'recv' && r.j.event.w === 'c', 'Linh says she received it', r.j);
    const m2 = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m2.length === 1 && /Linh Tran received Source code in a GitHub repository/.test(m2[0].subject), 'Robert is told', m2.map(x => x.subject));
    r = await call(sess, 'POST', '/v1/respond', { action: 'recv', project: 'shop', m: 'h1', n: 2 });
    const r5 = await call(own, 'POST', '/v1/projects/shop/events', { n: 2, ty: 'gave', m: 'h1', tx: 'again' });
    ok(r.s === 409 && r5.s === 409, 'once received, neither side writes on it again', [r.j, r5.j]);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 2, ty: 'gave', m: 'h2', tx: 'DNS moved' });
    const r6 = await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'gave', m: 'h2', tx: 'DNS moved, and the hosting login sent' });
    ok(r.s === 201 && r6.s === 201, 'handed over again before it is received: allowed, the record keeps both', [r.j, r6.j]);
    const pj = (await call(own, 'GET', '/v1/projects/shop')).j.project;
    ok(pj.ev.map(e => e.ty).join() === 'gave,recv,gave,gave', 'the record', pj.ev.map(e => e.ty));
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 4, ty: 'deliver', m: 'm1', link: 'https://design.example' });
    ok(r.s === 201, 'the delivery record goes on as before', r.j);
  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
