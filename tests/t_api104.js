// api.php 1.14.0 (v104): the client says they paid (CONTRACT.md 60), over HTTP against a fresh MySQL database in test mode. A line of
// the payment schedule can be reported once it is due, once until the studio answers Not received yet; the report is the client's
// words on the chain and moves nothing: no milestone, no date, no schedule. Needs what t_api70.js needs.
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8097, db: 'sd_pay104_api' });
  const { call, mails, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 14 (paid and nopay were let in by 12)', h.j.version);
    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: 'Bank transfer', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items: [
      { id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 }, { id: 'a', sec: 'in', t: 'Home page', m: 'm1' }] });
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    let r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 0 });
    ok(r.s === 409, 'before the Scope is approved nothing is due: refused', r.j);
    r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });

    // ---------------------------------------------------------------- the share due at start
    let before = mails().length;
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 0, tx: 'Bank transfer, ref 4471, 29 Oct', key: 'k-paid-dep-0001' });
    const e0 = r.j.event;
    ok(r.s === 201 && e0.ty === 'paid' && e0.w === 'c' && e0.m === 'dep' && e0.tx === 'Bank transfer, ref 4471, 29 Oct', 'Linh says she paid the share due at start: a paid event, her words', r.j);
    ok(e0.hx === sha(JSON.stringify(['shop', 'shop|events', 'c', 'paid', 'dep', 1, e0.at, e0.tx, '', ''])), 'on the chain, with the hash of section 19.3');
    const m0 = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m0.length === 1 && /Linh Tran says they paid the share due at start/.test(m0[0].subject) && /does not check payments/.test(m0[0].subject + m0[0].body), 'the studio is emailed, told ScopeDue does not check it', m0.map(x => x.subject));
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 0, tx: 'Bank transfer, ref 4471, 29 Oct', key: 'k-paid-dep-0001' });
    ok(r.s === 201 && r.j.replay === true && sql("SELECT COUNT(*) FROM api_mev WHERE ty = 'paid'") === '1', 'sent again with the same key: the first answer, nothing twice', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 1 });
    ok(r.s === 409 && r.j.error.code === 'already', 'a second report on the same line is refused until the studio answers', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'm1', n: 1 });
    ok(r.s === 409 && /not due yet/.test(r.j.error.message), 'a milestone\'s share is not due before it is accepted', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 1, tx: 'x'.repeat(201) });
    ok(r.s === 409 || r.s === 422, 'more than 200 characters: refused', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'nothing', n: 1 });
    ok(r.s === 409, 'a line that does not exist: refused', r.j);

    // ---------------------------------------------------------------- the studio: Not received yet
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 1, ty: 'nopay', m: 'm1', tx: 'No report here' });
    ok(r.s === 409, 'Not received yet only answers a report', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 1, ty: 'nopay', m: 'dep' });
    ok(r.s === 422, 'Not received yet needs words', r.j);
    before = mails().length;
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 1, ty: 'nopay', m: 'dep', tx: 'Nothing on the account yet, as of this morning' });
    ok(r.s === 201 && r.j.event.ty === 'nopay' && r.j.event.w === 'y', 'Robert answers Not received yet', r.j);
    const m1 = mails().slice(before).filter(x => x.to === 'linh@greenhome.example');
    ok(m1.length === 1 && /has not received the share due at start yet/.test(m1[0].subject) && /Nothing on the account yet/.test(m1[0].body), 'Linh is emailed his words', m1.map(x => [x.subject, x.body.slice(0, 200)]));
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 2, ty: 'nopay', m: 'dep', tx: 'Again' });
    ok(r.s === 409, 'and only once per report', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'dep', n: 2, tx: 'Sent again from another account' });
    ok(r.s === 201, 'Linh can say again that she paid', r.j);

    // ---------------------------------------------------------------- a milestone's share once it is accepted; nothing moves
    await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'deliver', m: 'm1', link: 'https://design.example' });
    await new Promise(res => setTimeout(res, 31000));   // the server waits 30 s between two codes to one address
    r = await call(sess, 'POST', '/v1/code', { kind: 'delivery', project: 'shop', m: 'm1', n: 4 });
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'Design sign-off accepted with the code', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'm1', n: 5 });
    ok(r.s === 201, 'its share can now be reported', r.j);
    const pj = (await call(own, 'GET', '/v1/projects/shop')).j.project;
    ok(pj.ev.filter(e => e.ty === 'paid').length === 3 && pj.ev.filter(e => e.ty === 'nopay').length === 1, 'the record: three reports and one answer');
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 6, ty: 'deliver', m: 'm2', link: 'https://shop.example' });
    ok(r.s === 201, 'the work goes on as before: Handoff can be delivered', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'paid', project: 'shop', m: 'm2', n: 7 });
    ok(r.s === 409, 'Handoff is in review, not accepted: its share is not due', r.j);
  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
