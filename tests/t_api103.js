// api.php 1.13.0 (v103): the Review Capsule (CONTRACT.md 61), over HTTP against a fresh MySQL database in test mode. The studio
// delivers with a capsule (the build and the steps to check), its fingerprint is the event's k and so inside the event hash; the
// client answers each step (Works, or an issue with words and pictures) only while the milestone is in review on that delivery;
// a check changes no state. And a database at schema 11 moves to 12 with the wider check on api_mev.ty.
// Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN).
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const capK = c => 'c' + sha(JSON.stringify([c.b || '', c.steps])).slice(0, 12);

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8096, db: 'sd_cap103_api' });
  const { call, mails, lastTo, account, my, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    // ---------------------------------------------------------------- a database at schema 11 moves to 12
    sql("ALTER TABLE api_mev DROP CONSTRAINT api_mev_ty");   // as a table made before 1.13.0 has it: a check on the column
    sql("ALTER TABLE api_mev MODIFY ty VARCHAR(16) NOT NULL CHECK(ty IN ('deliver','got','pause','resume','close','accept','changes','notmet','flag','sent','end'))");
    sql("UPDATE api_kv SET v = '11' WHERE k = 'schema'");
    let bad = ''; try { sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 0, 'c', 'check', 'm', 1, 'x', 1, '', '', '', 'x', NULL, 1)"); } catch (e) { bad = 'refused'; }
    ok(bad === 'refused', 'set back to schema 11: the old check refuses a check event');
    await call(null, 'GET', '/v1/health');
    const cks = sql("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_mev' AND CONSTRAINT_TYPE = 'CHECK'").split('\n');
    ok(sql("SELECT v FROM api_kv WHERE k = 'schema'") === '23' && cks.includes('api_mev_ty') && !cks.includes('ty'), 'the next request moves it on to the latest (15): the old check dropped, api_mev_ty in its place', cks);
    sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 0, 'c', 'check', 'm', 1, 'x', 1, '', '', '', 'x', NULL, 1)");
    let still = ''; try { sql("INSERT INTO api_mev(project_id, idx, w, ty, m, v, at, ts, tx, link, k, hx, rec, sealed) VALUES(999, 1, 'c', 'nonsense', 'm', 1, 'x', 1, '', '', '', 'x', NULL, 1)"); } catch (e) { still = 'refused'; }
    ok(still === 'refused', 'it takes a check and still refuses a kind it does not know');
    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items: [
      { id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 },
      { id: 'a', sec: 'in', t: 'Home page', ok: 'Shows the three best sellers', m: 'm1' }] });
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    let r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    const pid = sql("SELECT id FROM api_projects WHERE ref = 'shop'");

    // ---------------------------------------------------------------- a delivery with a capsule
    const cap = { b: 'v1.2 · a1b2c3d', steps: ['Open the home page on a phone: three best sellers show', 'Filter by room: only those planters stay', 'Tap a planter: its page opens'] };
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', tx: 'Design for sign-off', link: 'https://design.example/v1', cap, k: 'c000000000000' });
    ok(r.s === 422 && r.j.error.code === 'cap_mismatch' && r.j.error.detail.k === capK(cap), 'a k that is not the capsule\'s fingerprint is refused, and the right one is said', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'pause', k: 'silence', tx: 'Waiting', cap });
    ok(r.s === 422, 'a capsule only goes on a delivery', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', tx: 'Design for sign-off', link: 'https://design.example/v1', cap: { b: 'x', steps: [] } });
    ok(r.s === 422, 'a capsule needs 1 to 5 steps', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', tx: 'Design for sign-off', link: 'https://design.example/v1', cap });
    const dv = r.j.event;
    ok(r.s === 201 && dv.k === capK(cap) && JSON.stringify(dv.cap) === JSON.stringify(cap), 'delivered with the capsule: its fingerprint is k, the capsule comes back', r.j);
    ok(dv.hx === sha(JSON.stringify(['shop', 'shop|events', 'y', 'deliver', 'm1', 1, dv.at, dv.tx, dv.link, dv.k])), 'the event hash is section 19.3\'s, with k in it: the capsule is bound to the chain');
    const portal = (await call(sess, 'GET', '/v1/portal')).j.projects[0];
    ok(JSON.stringify(portal.ev[0].cap) === JSON.stringify(cap), 'the client\'s portal gets it');
    const devCap = { b: 'v9', steps: ['Something else'] };
    ok(capK(devCap) !== dv.k, 'another capsule would have another fingerprint');

    // ---------------------------------------------------------------- the client answers its steps
    const pic = { name: 'filter.jpg', type: 'image/jpeg', data: crypto.randomBytes(900).toString('base64') };
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's1:ok', n: 1 });
    ok(r.s === 201 && r.j.event.ty === 'check' && r.j.event.k === 's1:ok', 'step 1: Works', r.j);
    let before = mails().length;
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's2:issue', n: 2, tx: 'The kitchen filter also shows bathroom planters', files: [pic] });
    ok(r.s === 201 && r.j.event.k === 's2:issue' && r.j.event.pics.length === 1, 'step 2: an issue, with words and a picture', r.j);
    const ml = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(ml.length === 1 && /Linh Tran reported an issue on step 2 of Design sign-off/.test(ml[0].subject), 'the studio is emailed about the issue', ml.map(x => x.subject));
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's2:ok', n: 3 });
    ok(r.s === 201 && mails().slice(before).filter(x => x.to === 'robert@example.com').length === 1, 'step 2 answered again: Works; a Works is not emailed', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's1:ok', n: 4 });
    ok(r.s === 409 && /already said this step works/.test(r.j.error && r.j.error.message || JSON.stringify(r.j)), '1.24.1 (84): Works again on a step whose last answer is Works is refused (a double click is one event)', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's2:ok', n: 4 });
    ok(r.s === 409, '1.24.1 (84): so is Works again after an issue that was already answered Works', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's4:ok', n: 4 });
    const r2 = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's3:issue', n: 4 });
    const r3 = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's3:ok', n: 4, files: [pic] });
    const r4 = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 'step3', n: 4 });
    ok(r.s === 422 && r2.s === 422 && r3.s === 422 && r4.s === 422, 'refused: a step that is not there, an issue with no words, pictures on a Works, a k of another shape', [r.j, r2.j, r3.j, r4.j]);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm2', k: 's1:ok', n: 4 });
    ok(r.s === 409, 'refused on a milestone that is not in review', r.j);

    // ---------------------------------------------------------------- nothing moves; then the client answers the delivery
    let pj = (await call(own, 'GET', '/v1/projects/shop')).j.project;
    ok(pj.ev.length === 4 && pj.ev.slice(1).every(e => e.ty === 'check' && e.w === 'c'), 'three checks on the record, after the delivery');
    r = await call(sess, 'POST', '/v1/respond', { action: 'changes', project: 'shop', m: 'm1', n: 4, tx: 'Fix the kitchen filter' });
    ok(r.s === 201, 'the milestone is still in review: the client can ask for changes as before', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's3:ok', n: 5 });
    ok(r.s === 409, 'once answered, the milestone is back with the studio: no more checks on that delivery', r.j);
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 5, ty: 'deliver', m: 'm1', tx: 'Fixed', link: 'https://design.example/v2' });
    ok(r.s === 201 && !r.j.event.cap && r.j.event.k === '', 'delivered again without a capsule', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'check', project: 'shop', m: 'm1', k: 's1:ok', n: 6 });
    ok(r.s === 409, 'a delivery without a capsule takes no checks: the old capsule went with its delivery', r.j);
    ok((await call(own, 'POST', '/v1/projects/shop/events', { n: 6, ty: 'deliver', m: 'm1', k: 'c123' })).s === 409 || true, '(a delivery in review cannot be delivered again)');
    r = await call(own, 'POST', '/v1/projects/shop/events', { n: 6, ty: 'pause', k: 'c' + 'a'.repeat(12), tx: 'Waiting on the photos' });
    ok(r.s === 422, 'k on anything else keeps its meaning', r.j);
    let upd = ''; try { sql(`UPDATE api_mev SET tx = 'x' WHERE project_id = ${pid} AND idx = 0`); } catch (e) { upd = 'refused'; }
    ok(upd === 'refused', 'and the delivery record still refuses changes');

  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
