// api.php 1.16.0 (v107): the warranty after acceptance (CONTRACT.md 64), over HTTP against a fresh MySQL database in test mode. A v2
// Scope carries one warranty line (what is covered, the days after the last milestone is accepted); after a milestone is accepted the
// client reports a problem (with pictures); the studio answers Fixed (how, a link) or Not covered (why); the client confirms a fix.
// And a database at schema 13 moves to 14. Needs what t_api70.js needs.
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const V13 = `'deliver','got','pause','resume','close','accept','changes','notmet','flag','sent','end','check','paid','nopay','gave','recv'`;

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8099, db: 'sd_wa106_api' });
  const { call, mails, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const wait30 = () => new Promise(r => setTimeout(r, 31000));   // the server waits 30 s between two codes to one address
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    sql('ALTER TABLE api_mev DROP CONSTRAINT api_mev_ty'); sql(`ALTER TABLE api_mev ADD CONSTRAINT api_mev_ty CHECK (ty IN (${V13}))`); sql("UPDATE api_kv SET v = '13' WHERE k = 'schema'");
    await call(null, 'GET', '/v1/health');
    sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 0, 'c', 'bug', 'm', 1, 'x', 1, '', '', '', 'x', NULL, 1)");
    ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23', 'a database at schema 13 moves on to 15, which takes bug');

    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    const base = [{ id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 }, { id: 'a', sec: 'in', t: 'Home page', ok: 'Three best sellers show', m: 'm1' }];
    const ver = items => call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items: base.concat(items) });
    let r = await ver([{ id: 'w1', sec: 'wa', t: 'Bugs fixed free', d: '0' }]);
    const r2 = await ver([{ id: 'w1', sec: 'wa', t: 'Bugs fixed free', d: '2026-11-01' }]);
    const r3 = await ver([{ id: 'w1', sec: 'wa', t: 'Bugs', d: '30' }, { id: 'w2', sec: 'wa', t: 'More bugs', d: '60' }]);
    ok(r.s === 422 && r2.s === 422 && r3.s === 422, 'refused: 0 days, a date for days, two warranty lines', [r.j, r2.j, r3.j]);
    r = await ver([{ id: 'w1', sec: 'wa', t: 'Bugs in what was delivered are fixed free', d: '30' }]);
    ok(r.s === 201, 'Scope v1 with a 30-day warranty', r.j);
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });

    // ---------------------------------------------------------------- a problem, before and after acceptance
    r = await call(sess, 'POST', '/v1/respond', { action: 'bug', project: 'shop', m: 'm1', n: 0, tx: 'The filter shows bathroom planters' });
    ok(r.s === 409 && /accepted milestone/.test(r.j.error.message), 'before Design sign-off is accepted: refused, and told to use Not as agreed', r.j);
    await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', link: 'https://design.example' });
    await wait30();
    r = await call(sess, 'POST', '/v1/code', { kind: 'delivery', project: 'shop', m: 'm1', n: 1 });
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'Design sign-off accepted', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'bug', project: 'shop', m: 'm1', n: 2, tx: 'x' });
    ok(r.s === 422, 'a problem needs words', r.j);
    let before = mails().length;
    const pic = { name: 'filter.jpg', type: 'image/jpeg', data: crypto.randomBytes(800).toString('base64') };
    r = await call(sess, 'POST', '/v1/respond', { action: 'bug', project: 'shop', m: 'm1', n: 2, tx: 'The kitchen filter shows bathroom planters', files: [pic] });
    const bug = r.j.event;
    ok(r.s === 201 && bug.ty === 'bug' && bug.m === 'm1' && bug.pics.length === 1, 'Linh reports a problem in Design sign-off, with a picture', r.j);
    const ml = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(ml.length === 1 && /Linh Tran reported a problem in Design sign-off/.test(ml[0].subject), 'Robert is emailed', ml.map(x => x.subject));

    // ---------------------------------------------------------------- the studio answers
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'fixed', m: 'm1', k: 'b9' });
    const r4 = await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'fixed', m: 'm2', k: 'b' + bug.i });
    ok(r.s === 422 && r4.s === 422, 'an answer names the problem it answers, and its milestone', [r.j, r4.j]);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'notbug', m: 'm1', k: 'b' + bug.i });
    ok(r.s === 422, 'Not covered needs why', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'fixok', project: 'shop', m: 'm1', k: 'b' + bug.i, n: 3 });
    ok(r.s === 409, 'nothing to confirm before a fix', r.j);
    before = mails().length;
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'fixed', m: 'm1', k: 'b' + bug.i, tx: 'The room filter checks the room tag now', link: 'https://github.com/greenhome/shop/releases/tag/v1.2.1' });
    ok(r.s === 201 && r.j.event.ty === 'fixed' && r.j.event.k === 'b' + bug.i, 'Robert: Fixed, with how and the release', r.j);
    const ml2 = mails().slice(before).filter(x => x.to === 'linh@greenhome.example');
    ok(ml2.length === 1 && /fixed the problem you reported in Design sign-off/.test(ml2[0].subject) && /releases\/tag\/v1\.2\.1/.test(ml2[0].body), 'Linh is emailed, with the release', ml2.map(x => x.subject));
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 4, ty: 'notbug', m: 'm1', k: 'b' + bug.i, tx: 'Changed my mind' });
    ok(r.s === 409, 'once fixed, Not covered is not an answer any more', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'fixok', project: 'shop', m: 'm1', k: 'b' + bug.i, n: 4 });
    ok(r.s === 201 && r.j.event.ty === 'fixok', 'Linh confirms the fix works', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 5, ty: 'fixed', m: 'm1', k: 'b' + bug.i, tx: 'again' });
    ok(r.s === 409, 'a confirmed problem takes no more answers', r.j);
    // a second problem: not covered
    r = await call(sess, 'POST', '/v1/respond', { action: 'bug', project: 'shop', m: 'm1', n: 5, tx: 'Can the filter also sort by price?' });
    const b2 = r.j.event;
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 6, ty: 'notbug', m: 'm1', k: 'b' + b2.i, tx: 'Sorting is new: I will send a quote as a change request' });
    ok(r.s === 201, 'a second problem: Not covered, with why', r.j);
    const pj = (await call(own, 'GET', '/v1/projects/shop')).j.project;
    ok(pj.ev.map(e => e.ty).join() === 'deliver,accept,bug,fixed,fixok,bug,notbug', 'the record', pj.ev.map(e => e.ty));
  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
