// api.php 1.30.0 (CONTRACT 101): a client project's own currency, over HTTP against a fresh MySQL database in test mode. The studio
// sends it with the project (cur, USD when not said); it is kept once a Scope was issued; the portal gets it with the project; the
// client's quote email writes the amount in it; amounts go up to a million million, the change rate to a thousand million.
// Needs PHP 8.1+ with pdo_mysql and a MySQL / MariaDB server: SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB (as t_api70).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8130, db: 'sd_cur_test' });
  const { call, account, lastTo, my, db } = srv;
  const sql = q => my([db, '-N', '-e', q]).toString().trim();
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    const own = await account('Robert', 'robert@example.com');
    // the client speaks Vietnamese: the quote email is in it
    await call(own, 'PUT', '/v1/clients/minhtam', { name: 'Nha khoa Minh Tâm', contact: 'BS. Lê Ngọc Hân', email: 'han@minhtam.example', lang: 'vi' });
    let r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website', phase: 1 });
    ok(r.s === 201 && r.j.project.cur === 'USD' && sql("SELECT cur FROM api_projects WHERE ref = 'web'") === 'USD', 'a project sent without a currency is in USD', r.j);
    r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website', cur: 'vnd' });
    ok(r.s === 422 && /"cur"/.test(r.j.error.message), 'a currency that is not three capital letters is refused, naming "cur"', r.j);
    r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website', cur: 'EUR' });
    ok(r.s === 200 && r.j.project.cur === 'EUR', 'before any Scope the studio can change it', r.j);
    r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website' });
    ok(r.j.project.cur === 'EUR', 'sent again without it, it stays', r.j);
    r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website', cur: 'VND' });
    ok(r.j.project.cur === 'VND', 'and to VND', r.j);

    // a contract value and a change rate a dollar ceiling would have refused
    const R = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 500000, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    r = await call(own, 'POST', '/v1/projects/web/versions', { v: 1, terms: { price: 55000000, rev: null, fv: 2, r: R }, items: [{ id: 'm1', sec: 'tl', t: 'Handoff', d: '2026-12-20', ok: '', m: '', pay: 70 }, { id: 'a', sec: 'in', t: 'Home page', ok: 'It loads', m: 'm1' }] });
    ok(r.s === 201, 'Scope v1 at 55.000.000 ₫ with 500.000 ₫ an hour', r.j);
    r = await call(own, 'POST', '/v1/projects/web/versions', { v: 2, terms: { price: 1000000000001, rev: null, fv: 2, r: R }, items: [{ id: 'm1', sec: 'tl', t: 'Handoff', d: '2026-12-20', ok: '', m: '', pay: 70 }] });
    ok(r.s === 422 && /terms.price/.test(r.j.error.message), 'over a million million is refused', r.j);
    r = await call(own, 'POST', '/v1/projects/web/versions', { v: 2, terms: { price: 1, rev: null, fv: 2, r: Object.assign({}, R, { rate: 1000000001 }) }, items: [{ id: 'm1', sec: 'tl', t: 'Handoff', d: '2026-12-20', ok: '', m: '', pay: 70 }] });
    ok(r.s === 422 && /rate/.test(r.j.error.message), 'a change rate over a thousand million is refused', r.j);

    r = await call(own, 'PUT', '/v1/projects/web', { client: 'minhtam', name: 'Website', cur: 'USD' });
    ok(r.s === 200 && r.j.project.cur === 'VND' && sql("SELECT cur FROM api_projects WHERE ref = 'web'") === 'VND', 'once a Scope was issued, a change is kept out: it stays VND (no error, so an old device does not stop the sync)', r.j);

    // the portal
    const L = await srv.link(own, { client: 'minhtam' });
    const han = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    r = await call(han, 'GET', '/v1/portal');
    const pj = r.j.projects && r.j.projects.find(p => p.ref === 'web');
    ok(r.s === 200 && pj && pj.cur === 'VND' && pj.vers[0].terms.price === 55000000, 'the portal gets the project with its currency', pj && { cur: pj.cur, price: pj.vers[0].terms.price });

    // a quote, emailed in the client's language and the project's currency
    r = await call(han, 'POST', '/v1/code', { kind: 'scope', project: 'web', v: 1 });
    r = await call(han, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('han@minhtam.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'web: the client approved Scope v1', r.j);
    r = await call(han, 'POST', '/v1/respond', { action: 'request', project: 'web', title: 'Booking reminders', tx: 'A reminder by SMS the day before', key: 'k-cur-request-01' });
    ok(r.s === 201, 'Hân asks for a change', r.j);
    r = await call(own, 'POST', '/v1/projects/web/requests/CR-001/entries', { n: 1, ty: 'quote', tx: 'SMS reminders', amt: 7500000, days: 3 });
    ok(r.s === 201 && r.j.entry.amt === 7500000, 'the studio quotes 7.500.000 ₫ (over the old 1,000,000 ceiling)', r.j);
    const m = lastTo('han@minhtam.example');
    ok(m && /\+7\.500\.000 ₫/.test(m.body) && !/\$/.test(m.body), 'the email says +7.500.000 ₫, no dollar sign', m && m.body);
    r = await call(han, 'POST', '/v1/respond', { action: 'counter', project: 'web', cr: 'CR-001', on: 1, amt: 1000000000001, days: 3, tx: 'Too much' });
    ok(r.s === 422 && /amt/.test(r.j.error.message), 'a counter over a million million is refused', r.j);
    r = await call(han, 'POST', '/v1/respond', { action: 'counter', project: 'web', cr: 'CR-001', on: 1, amt: 6000000, days: 3, tx: 'Could it be 6 million?' });
    ok(r.s === 201 && r.j.entry.amt === 6000000, 'Hân counters at 6.000.000 ₫', r.j);

    // an English client in USD reads it as before
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example', lang: 'en' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'Shop', cur: 'USD' });
    await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }] });
    const L2 = await srv.link(own, { client: 'greenhome' });
    const linh = (await call(null, 'POST', '/v1/session', { token: L2.j.url.split('&k=')[1] })).j.session;
    r = await call(linh, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    r = await call(linh, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'shop: the client approved Scope v1', r.j);
    await call(linh, 'POST', '/v1/respond', { action: 'request', project: 'shop', title: 'Gift cards', tx: 'Gift cards too', key: 'k-cur-request-02' });
    await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 1, ty: 'quote', tx: 'Gift cards', amt: 1200, days: 2 });
    const m2 = lastTo('linh@greenhome.example');
    ok(m2 && /\+\$1,200/.test(m2.body), 'in English and USD: +$1,200', m2 && m2.body);
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { if (srv) await srv.stop(); }
  console.log(fails ? `${fails} of ${n} FAILED` : `all ${n} passed`);
  process.exit(fails ? 1 : 0);
})();
