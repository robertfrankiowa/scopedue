// api.php 1.17.0 (v108): Disputed (CONTRACT.md 65), over HTTP against a fresh MySQL database in test mode. Either side writes a
// dispute entry on a change request (what it thinks it is, the Scope line it points at, why; the client may add pictures); the request
// is disputed until an accept or a decline; an approved request takes none; a warranty problem answered Not covered opens a disputed
// request once. And a database at schema 14 moves to 15. Needs what t_api70.js needs.
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const E14 = `'request','question','quote','counter','accept','decline','note'`;

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8097, db: 'sd_ds107_api' });
  const { call, mails, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const wait30 = () => new Promise(r => setTimeout(r, 31000));   // the server waits 30 s between two codes to one address
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    // ---------------------------------------------------------------- a database at schema 14 moves to 15
    sql('ALTER TABLE api_entries DROP CONSTRAINT api_entries_ty'); sql(`ALTER TABLE api_entries ADD CONSTRAINT api_entries_ty CHECK (ty IN (${E14}))`); sql("UPDATE api_kv SET v = '14' WHERE k = 'schema'");
    const ins = "INSERT INTO api_entries(project_id, cr_id, idx, w, ty, at, ts, tx, hx, sealed) VALUES(999, 'CR-001', 0, 'c', 'dispute', 'x', 1, 'x', 'x', 1)";
    let refused = ''; try { sql(ins); } catch (e) { refused = 'yes'; }
    ok(refused === 'yes', 'at schema 14 the check refuses dispute');
    await call(null, 'GET', '/v1/health');
    sql(ins);
    ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23', 'the next request moves it to 15, which takes dispute');

    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    const items = [{ id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 },
      { id: 'a', sec: 'in', t: 'Product filter', ok: 'Filters by room and by size', m: 'm1' }, { id: 'x', sec: 'out', t: 'Sorting by price' }, { id: 'w1', sec: 'wa', t: 'Bugs in what was delivered are fixed free', d: '30' }];
    let r = await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items });
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });

    // ---------------------------------------------------------------- on a change request
    r = await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'shop', title: 'Filter by colour', tx: 'Please add a colour filter' });
    ok(r.s === 201, 'Linh asks for a colour filter (CR-001)', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 1, ty: 'quote', amt: 300, days: 2, tx: 'A colour filter is new work' });
    ok(r.s === 201, 'Robert quotes it', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 1, tx: 'x', pos: 'fix' });
    const r2 = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 1, tx: 'The filter was promised', pos: 'maybe' });
    const r3 = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 1, tx: 'The filter was promised', pos: 'fix', ref: 'nope' });
    const r4 = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 1, tx: 'The filter was promised', pos: 'fix', ref: 'm1' });
    ok(r.s === 422 && r2.s === 422 && r3.s === 422 && r4.s === 422, 'refused: no why, a position that is not one, a line that is not in the approved Scope, a milestone', [r.j, r2.j, r3.j, r4.j].map(x => x.error && x.error.message));
    let before = mails().length;
    const pic = { name: 'filter.jpg', type: 'image/jpeg', data: crypto.randomBytes(800).toString('base64') };
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 1, tx: 'The product filter was promised; colour is part of filtering', pos: 'fix', ref: 'a', files: [pic] });
    ok(r.s === 201 && r.j.entry.ty === 'dispute' && r.j.entry.pos === 'fix' && r.j.entry.ref === 'a' && r.j.entry.pics.length === 1, 'Linh disagrees: a fix owed, on the Product filter line, with a picture', r.j);
    ok(r.j.cr.state === 'me', 'it is Robert\'s turn', r.j.cr);
    const m1 = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m1.length === 1 && /disagrees on CR-001/.test(m1[0].subject), 'Robert is told', m1.map(x => x.subject));
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 3, ty: 'dispute', tx: 'Room and size were the filters agreed', pos: 'change', amt: 0 });
    ok(r.s === 422, 'a studio dispute carries no price', r.j);
    before = mails().length;
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 3, ty: 'dispute', tx: 'Room and size were the filters agreed. Colour is new.', pos: 'change', ref: 'a' });
    ok(r.s === 201 && r.j.entry.pos === 'change' && r.j.entry.ref === 'a' && r.j.cr.state === 'client', 'Robert says where he stands: new work, on the same line', r.j);
    const m2 = mails().slice(before).filter(x => x.to === 'linh@greenhome.example');
    ok(m2.length === 1 && /Robert disagrees on CR-001/.test(m2[0].subject) && /new or different work/.test(m2[0].body), 'Linh is emailed, with his view', m2.map(x => x.subject + ' / ' + x.body.slice(0, 200)));
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 4, ty: 'note', tx: 'x', pos: 'fix' });
    ok(r.s === 422, 'pos only on a dispute', r.j);
    const crs = (await call(own, 'GET', '/v1/projects/shop')).j.project.crs, c1 = crs.find(c => c.id === 'CR-001');
    ok(c1 && c1.entries.map(e => e.ty).join() === 'request,quote,dispute,dispute' && c1.entries[2].pos === 'fix' && c1.entries[3].ref === 'a', 'the studio pulls both positions', c1 && c1.entries.map(e => [e.ty, e.pos, e.ref]));
    const pt = (await call(sess, 'GET', '/v1/portal')).j.projects[0], pc1 = pt.crs.find(c => c.id === 'CR-001');
    ok(pc1 && pc1.entries[3].pos === 'change' && pc1.entries[2].pics.length === 1, 'and so does the portal', pc1 && pc1.entries.map(e => [e.ty, e.pos]));
    // it ends with a decline (or an accepted quote); an approved request takes no dispute
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 4, ty: 'quote', amt: 0, days: 0, tx: 'Fine: no extra cost' });
    await wait30();
    r = await call(sess, 'POST', '/v1/code', { kind: 'quote', project: 'shop', cr: 'CR-001', on: 4 });
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'Robert offers it at no extra cost and Linh accepts', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-001', on: 5, tx: 'Again', pos: 'fix' });
    const r5 = await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 6, ty: 'dispute', tx: 'Again', pos: 'fix' });
    ok(r.s === 409 && r5.s === 409, 'an approved request is settled: no dispute from either side', [r.j, r5.j]);

    // ---------------------------------------------------------------- from a warranty problem answered Not covered
    await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', link: 'https://design.example' });
    await wait30();
    r = await call(sess, 'POST', '/v1/code', { kind: 'delivery', project: 'shop', m: 'm1', n: 1 });
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    r = await call(sess, 'POST', '/v1/respond', { action: 'bug', project: 'shop', m: 'm1', n: 2, tx: 'The size filter misses XL planters' });
    const bug = r.j.event;
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', bug: bug.i, tx: 'It is a bug' });
    ok(r.s === 409, 'an open problem cannot be disputed: it is not answered yet', r.j);
    await call(own, 'POST', '/v1/projects/shop/events', { n: 3, ty: 'notbug', m: 'm1', k: 'b' + bug.i, tx: 'XL was never in the size list' });
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', bug: 0, tx: 'It is a bug' });
    ok(r.s === 409, 'only a problem, not any event', r.j);
    before = mails().length;
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', bug: bug.i, tx: 'Filters by size was promised, and XL is a size', ref: 'a' });
    ok(r.s === 201 && r.j.cr && /^CR-002$/.test(r.j.cr.id) && r.j.entry.ty === 'dispute' && r.j.entry.pos === 'fix' && r.j.entry.bug === bug.i && r.j.entry.ref === 'a', 'I think it is covered: CR-002 opens, disputed, naming the problem', r.j);
    const t2 = sql("SELECT title FROM api_crs WHERE id = 'CR-002'");
    ok(/^Not covered: The size filter misses XL planters$/.test(t2), 'its title says where it came from', t2);
    ok(mails().slice(before).some(x => x.to === 'robert@example.com' && /disagrees on CR-002/.test(x.subject)), 'Robert is told');
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', bug: bug.i, tx: 'Again' });
    ok(r.s === 409, 'once only per problem', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/requests/CR-002/entries', { n: 1, ty: 'decline', tx: 'XL stays out. Sorry.' });
    ok(r.s === 201 && r.j.cr.state === 'declined', 'Robert declines: it ends', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'dispute', project: 'shop', cr: 'CR-002', on: 1, tx: 'I still think so', pos: 'fix' });
    ok(r.s === 201 && r.j.cr.state === 'me', 'after a decline the client can still say so: it reopens, as any writing there does', r.j);
  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
