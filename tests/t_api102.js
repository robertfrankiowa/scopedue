// api.php 1.12.0 (v102): pictures from the client (CONTRACT.md 59), over HTTP against a fresh MySQL database in test mode. A client
// adds pictures to a request, a question, a note, I'd like changes and Not as agreed, nowhere else; the record lists each one with
// the SHA-256 of what arrived, outside the entry and event hashes; the studio takes the bytes (GET /v1/cfiles) and lets the server
// delete them (POST /v1/cfiles/ack); what is never taken is deleted after 30 days with two reminders, the list kept. The clock is
// moved with X-Test-Now. Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN).
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let seed = 0;
const pic = (bytes, type, name) => { const b = crypto.randomBytes(bytes || 2000); seed++; return { f: { name: name || 'shot-' + seed + '.jpg', type: type || 'image/jpeg', data: b.toString('base64') }, sha: sha(b), size: b.length }; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8096, db: 'sd_cpic102_api' });
  const { call, mails, lastTo, account, my, api, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const at = ms => fetch(api + '?r=/v1/health', { headers: { 'X-Test-Now': String(ms) } }).then(r => r.json());   /* any request runs the rules */
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    const own = await account('Robert', 'robert@example.com'), other = await account('Mallory', 'mallory@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    await call(own, 'PUT', '/v1/projects/shop', { client: 'greenhome', name: 'GreenHome online store', phase: 2 });
    const rules = { dep: 30, pd: 7, rpm: 2, free: 2, rate: 0, min: 1, review: 5, silence: 10, dormant: 30, cure: 10, own: 1, meth: '', doc: '' };
    const d = k => new Date(Date.now() + k * DAY).toISOString().slice(0, 10);
    let r = await call(own, 'POST', '/v1/projects/shop/versions', { v: 1, terms: { price: 4000, rev: null, fv: 2, r: rules }, items: [
      { id: 'm1', sec: 'tl', t: 'Design sign-off', d: d(10), pay: 30 }, { id: 'm2', sec: 'tl', t: 'Handoff', d: d(30), pay: 40 },
      { id: 'a', sec: 'in', t: 'Home page', ok: 'The home page shows the three best sellers', m: 'm1' }, { id: 'b', sec: 'in', t: 'Checkout', m: 'm2' }] });
    ok(r.s === 201, 'Scope v1 with two milestones', r.j);
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'shop', v: 1 });
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code: lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0] });
    ok(r.s < 300, 'Linh approved Scope v1', r.j);
    const pid = sql("SELECT id FROM api_projects WHERE ref = 'shop'");

    // ---------------------------------------------------------------- a request with one picture, a note with six
    const p1 = pic(3000);
    r = await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'shop', title: 'Gift cards', tx: 'Like this one, from another shop', files: [p1.f], key: 'k-request-0001' });
    const e1 = r.j.entry;
    ok(r.s === 201 && e1.pics && e1.pics.length === 1 && e1.pics[0].sha === p1.sha && e1.pics[0].size === p1.size && e1.pics[0].n === p1.f.name && e1.pics[0].type === 'image/jpeg' && e1.pics[0].st === 'held',
      'a request with a picture: the record lists it with the SHA-256 of what arrived, held', e1 && e1.pics);
    const prev1 = 'shop|CR-001|v1', hx1 = sha(['CR-001', prev1, 'c', 'request', e1.at, e1.tx, '', '', ''].join('|'));
    ok(e1.hx === hx1, 'the entry hash is the one of section 11.4: pictures are not in it', [e1.hx, hx1]);
    r = await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'shop', title: 'Gift cards', tx: 'Like this one, from another shop', files: [p1.f], key: 'k-request-0001' });
    ok(r.s === 201 && r.j.replay === true && sql(`SELECT COUNT(*) FROM api_cfiles WHERE project_id = ${pid}`) === '1' && sql(`SELECT COUNT(*) FROM api_crs WHERE project_id = ${pid}`) === '1', 'sent again with the same key: the first answer, nothing stored twice', r.j);
    const six = [1, 2, 3, 4, 5, 6].map(() => pic(1500, 'image/png', 'screen.png'));
    r = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'shop', cr: 'CR-001', on: 0, tx: 'And these', files: six.map(x => x.f) });
    ok(r.s === 201 && r.j.entry.pics.length === 6 && r.j.entry.pics.every((x, i) => x.sha === six[i].sha && x.type === 'image/png'), 'a note with six pictures, in order', r.j.entry && r.j.entry.pics);
    r = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'shop', cr: 'CR-001', on: 1, tx: 'One more', files: [1, 2, 3, 4, 5, 6, 7].map(() => pic(100).f) });
    ok(r.s === 422 && /up to 6 pictures/.test(r.j.error.message), 'a seventh picture is refused, and nothing is written', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'shop', cr: 'CR-001', on: 1, tx: 'A file', files: [pic(100, 'application/pdf', 'x.pdf').f] });
    const r2 = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'shop', cr: 'CR-001', on: 1, tx: 'Big', files: [pic(460000).f] });
    const r3 = await call(sess, 'POST', '/v1/respond', { action: 'note', project: 'shop', cr: 'CR-001', on: 1, tx: 'Not base64', files: [{ name: 'a.jpg', type: 'image/jpeg', data: 'not base64!' }] });
    ok(r.s === 422 && r2.s === 422 && r3.s === 422 && sql(`SELECT COUNT(*) FROM api_entries WHERE project_id = ${pid} AND cr_id = 'CR-001'`) === '2', 'a PDF, a picture over 600 KB and one that is not base64 are refused', [r.j, r2.j, r3.j]);
    r = await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'shop', tx: 'Is this the font?', files: [pic(800).f] });
    ok(r.s === 201 && r.j.entry.pics.length === 1, 'a question on the Scope with a picture', r.j);

    // ---------------------------------------------------------------- where pictures are not taken
    await call(own, 'POST', '/v1/projects/shop/requests/CR-001/entries', { n: 2, ty: 'quote', tx: 'Gift cards', amt: 300, days: 2, vu: Date.now() + 7 * DAY });
    r = await call(sess, 'POST', '/v1/respond', { action: 'decline', project: 'shop', cr: 'CR-001', on: 2, tx: 'No', files: [pic(100).f] });
    const rc = await call(sess, 'POST', '/v1/respond', { action: 'counter', project: 'shop', cr: 'CR-001', on: 2, amt: 200, days: 2, files: [pic(100).f] });
    ok(r.s === 422 && rc.s === 422 && /Pictures can be added to/.test(r.j.error.message) && sql(`SELECT COUNT(*) FROM api_entries WHERE project_id = ${pid} AND cr_id = 'CR-001'`) === '3', 'not on a decline or a counter offer', [r.j, rc.j]);
    r = await call(sess, 'POST', '/v1/code', { kind: 'quote', project: 'shop', cr: 'CR-001', on: 2, files: [pic(100).f] });
    ok(r.s === 422, 'not on an approval', r.j);

    // ---------------------------------------------------------------- on the delivery record
    ok((await call(own, 'POST', '/v1/projects/shop/events', { n: 0, ty: 'deliver', m: 'm1', tx: 'Here is the design', link: 'https://design.example/v1' })).s < 300, 'Robert delivers Design sign-off');
    const pc = [pic(1200), pic(1300)];
    r = await call(sess, 'POST', '/v1/respond', { action: 'changes', project: 'shop', m: 'm1', n: 1, tx: 'Bigger buttons, see the pictures', files: pc.map(x => x.f) });
    const ev1 = r.j.event;
    ok(r.s === 201 && ev1.pics.length === 2 && ev1.pics.every((x, i) => x.sha === pc[i].sha && x.st === 'held'), 'I\'d like changes with two pictures: listed on the event', r.j);
    const evRaw = JSON.stringify(['shop', sql(`SELECT hx FROM api_mev WHERE project_id = ${pid} AND idx = 0`), 'c', 'changes', 'm1', 1, ev1.at, ev1.tx, '', '']);
    ok(ev1.hx === sha(evRaw), 'the event hash is the one of section 19.3: pictures are not in it', [ev1.hx, sha(evRaw)]);
    ok((await call(own, 'POST', '/v1/projects/shop/events', { n: 2, ty: 'deliver', m: 'm1', tx: 'Again', link: 'https://design.example/v2' })).s < 300, 'delivered again');
    const pn = pic(900);
    r = await call(sess, 'POST', '/v1/respond', { action: 'notmet', project: 'shop', m: 'm1', n: 3, k: 'a', tx: 'Only two best sellers', files: [pn.f] });
    ok(r.s === 201 && r.j.event.pics.length === 1 && r.j.event.pics[0].sha === pn.sha, 'Not as agreed with a picture', r.j);
    r = await call(sess, 'POST', '/v1/respond', { action: 'flag', project: 'shop', m: 'm2', n: 4, files: [pic(100).f] });
    ok(r.s === 422, 'not on Flag as missed', r.j);

    // ---------------------------------------------------------------- the studio sees the list, takes the bytes, lets go
    const pj = (await call(own, 'GET', '/v1/projects/shop')).j.project;
    ok(pj.crs[0].entries[0].pics[0].sha === p1.sha && pj.ev[1].pics.length === 2, 'the studio\'s read of the project lists the pictures on entries and events');
    const pl = (await call(own, 'GET', '/v1/pull')).j.events;
    ok(pl.some(e => e.type === 'entry' && e.entry && e.entry.pics && e.entry.pics.length === 6) && pl.some(e => e.type === 'mev' && e.ev && e.ev.pics && e.ev.pics.length === 2), 'pull carries them too');
    let cf = (await call(own, 'GET', '/v1/cfiles')).j;
    ok(cf.files.length === 11 && cf.more === false && cf.files[0].cr === 'CR-001' && cf.files[0].idx === 0 && cf.files[0].pos === 0 && sha(Buffer.from(cf.files[0].data, 'base64')) === p1.sha && cf.files.some(f => f.ev === 1 && f.pos === 1),
      'GET /v1/cfiles: the 11 held pictures, oldest first, twelve at a time, each with where it belongs and its bytes', cf.files.map(f => [f.cr, f.idx, f.ev, f.pos]));
    ok((await call(other, 'GET', '/v1/cfiles')).j.files.length === 0, 'another studio sees none of them');
    r = await call(other, 'POST', '/v1/cfiles/ack', { ids: cf.files.map(f => f.id) });
    ok(r.j.taken === 0, 'nor can it let them go', r.j);
    r = await call(own, 'POST', '/v1/cfiles/ack', { ids: cf.files.slice(0, 7).map(f => f.id) });
    ok(r.j.taken === 7 && sql(`SELECT COUNT(*) FROM api_cfiles WHERE project_id = ${pid} AND data IS NULL AND taken_at IS NOT NULL`) === '7', 'ack: their bytes go, a row stays to say they were taken', r.j);
    const pt = (await call(sess, 'GET', '/v1/portal')).j.projects[0];
    ok(pt.crs[0].entries[0].pics[0].st === 'taken' && pt.crs[0].entries[1].pics.slice(0, 6).every(x => x.st === 'taken') && pt.ev[1].pics.every(x => x.st === 'held'), 'the portal shows each picture taken or still held', pt.crs[0].entries[1].pics.map(x => x.st));
    cf = (await call(own, 'GET', '/v1/cfiles&project=shop')).j;
    ok(cf.files.length === 4, 'what is left is still held for the app', cf.files.length);

    // ---------------------------------------------------------------- a deleted project lets go of what it holds
    await call(own, 'PUT', '/v1/projects/second', { client: 'greenhome', name: 'Phase 2', phase: 1 });
    await call(own, 'POST', '/v1/projects/second/versions', { v: 1, terms: { price: 1000, rev: 1 }, items: [{ id: 'a', sec: 'in', t: 'More' }] });
    r = await call(sess, 'POST', '/v1/respond', { action: 'question', project: 'second', tx: 'This logo?', files: [pic(500).f] });
    const pid2 = sql("SELECT id FROM api_projects WHERE ref = 'second'");
    ok(r.s === 201 && sql(`SELECT COUNT(*) FROM api_cfiles WHERE project_id = ${pid2} AND data IS NOT NULL`) === '1', 'a picture on a second project', r.j);
    await call(own, 'DELETE', '/v1/projects/second');
    ok(sql(`SELECT COUNT(*) FROM api_cfiles WHERE project_id = ${pid2} AND data IS NOT NULL`) === '0' && !(await call(own, 'GET', '/v1/cfiles')).j.files.some(f => f.project === 'second'), 'the Owner deletes the project: its pictures go at once');
    // ---------------------------------------------------------------- never taken: 7 and 23 days, then 30
    const t0 = Date.now(); let before = mails().length;
    await at(t0 + 6 * DAY);
    ok(mails().length === before, '6 days: nothing');
    await at(t0 + 7 * DAY + 60000);
    let m = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m.length === 1 && /Pictures from the client on GreenHome online store are waiting for you/.test(m[0].subject) && /4 pictures/.test(m[0].body) && /keeps them 30 days/.test(m[0].body), '7 days: one email to the Owner with the count', m.map(x => [x.subject, x.body]));
    before = mails().length; await at(t0 + 8 * DAY);
    ok(mails().length === before, 'not again the next day');
    await at(t0 + 23 * DAY + 60000);
    m = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m.length === 1 && /are deleted/.test(m[0].subject), '23 days: the email with the day they go', m.map(x => x.subject));
    before = mails().length; await at(t0 + 30 * DAY + 60000);
    m = mails().slice(before).filter(x => x.to === 'robert@example.com');
    ok(m.length === 1 && /were deleted after 30 days/.test(m[0].subject) && /still names each one/.test(m[0].body) && sql(`SELECT COUNT(*) FROM api_cfiles WHERE project_id = ${pid} AND data IS NOT NULL`) === '0', '30 days: the bytes are deleted, the Owner told once', m.map(x => x.subject));
    const pt2 = (await call(sess, 'GET', '/v1/portal')).j.projects[0];
    ok(pt2.ev[1].pics.length === 2 && pt2.ev[1].pics.every(x => x.st === 'gone' && x.sha) && pt2.crs[0].entries[0].pics[0].st === 'taken', 'the record still lists them with their fingerprints, gone; what was taken stays taken');
    ok((await call(own, 'GET', '/v1/cfiles')).j.files.length === 0, 'nothing left for the app');

  } catch (e) { console.error(e); fails++; }
  finally { srv && srv.stop(); }
  console.log('\n' + (n - fails) + '/' + n + ' passed');
  process.exit(fails ? 1 : 0);
})();
