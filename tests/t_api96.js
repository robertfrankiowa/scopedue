// api.php 1.11.0 (v96): the Owner deletes a client project (CONTRACT.md 42.5), over HTTP against a fresh MySQL database in test
// mode. It leaves the studio's list at once and refuses every write; the client is emailed once, with a link that works for the
// 30 days its record is kept; the portal still sends it, marked removed, and refuses every answer on it; another project of the
// same client goes on. 30 days later the record is gone, approvals and events with it, though they refuse DELETE otherwise.
// The clock is moved with X-Test-Now. Needs what t_api70.js needs.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const DAY = 86400000;
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8096, db: 'sd_del96_api' });
  const { call, lastTo, mails, account, my, api, db: DB } = srv;
  const sql = q => my([DB, '-N', '-e', q]).toString().trim();
  const at = ms => fetch(api + '?r=/v1/health', { headers: { 'X-Test-Now': String(ms) } }).then(r => r.json());   /* any request runs the rules */
  try {
    const h = await call(null, 'GET', '/v1/health');
    ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
    const own = await account('Robert', 'robert@example.com');
    await call(own, 'PUT', '/v1/clients/greenhome', { name: 'GreenHome', contact: 'Linh Tran', email: 'linh@greenhome.example' });
    for (const [ref, nm] of [['shop', 'GreenHome online store'], ['test-run', 'Thử Nhờ kiểm tra']]) {
      await call(own, 'PUT', '/v1/projects/' + ref, { client: 'greenhome', name: nm, phase: 2 });
      await call(own, 'POST', '/v1/projects/' + ref + '/versions', { v: 1, terms: { price: 4000, rev: 2 }, items: [{ id: 'a', sec: 'in', t: 'Design' }, { id: 'b', sec: 'in', t: 'Build' }] });
    }
    const L = await srv.link(own, { client: 'greenhome' });
    const sess = (await call(null, 'POST', '/v1/session', { token: L.j.url.split('&k=')[1] })).j.session;
    let r = await call(sess, 'POST', '/v1/code', { kind: 'scope', project: 'test-run', v: 1 });
    const code = lastTo('linh@greenhome.example').body.match(/\b\d{6}\b/)[0];
    r = await call(sess, 'POST', '/v1/approve', { challenge: r.j.challenge, code });
    ok(r.s < 300 && sql('SELECT COUNT(*) FROM api_approvals') === '1', 'Linh approved Scope v1 of the test project', r.j);
    await call(sess, 'POST', '/v1/respond', { action: 'request', project: 'test-run', title: 'Add a gift card', tx: 'Could the store sell gift cards?' });
    const pid = sql("SELECT id FROM api_projects WHERE ref = 'test-run'");

    // ---------------------------------------------------------------- deleted
    let before = mails().length;
    r = await call(own, 'DELETE', '/v1/projects/test-run');
    const t0 = r.j.removed && r.j.removed.at;
    ok(r.s === 200 && r.j.mailed === true && r.j.removed.until - t0 === 30 * DAY, 'DELETE: removed now, kept 30 days, the client emailed', r.j);
    const m = mails().slice(before).filter(x => x.to === 'linh@greenhome.example');
    ok(m.length === 1 && /removed Thử Nhờ kiểm tra from your portal/.test(m[0].subject) && /^Hi Linh,/.test(m[0].body) && /is kept until .+, then deleted/.test(m[0].body) && /Download the record/.test(m[0].body) && /#s=[a-z0-9]+&k=sdl_/.test(m[0].body),
      'Linh is told, with the day it goes and a link to download the record', m.map(x => [x.subject, x.body]));
    const tok = m[0].body.match(/&k=(sdl_[A-Za-z0-9_-]+)/)[1];
    ok(+sql(`SELECT expires_at FROM api_links WHERE created_at >= ${t0} ORDER BY id DESC LIMIT 1`) - t0 >= 30 * DAY - 5000, 'the link works for the 30 days');
    before = mails().length;
    r = await call(own, 'DELETE', '/v1/projects/test-run');
    ok(r.s === 200 && r.j.mailed === false && r.j.removed.at === t0 && mails().length === before, 'asking again changes nothing and sends nothing', r.j);
    ok((await call(own, 'DELETE', '/v1/projects/never-sent')).s === 404, 'a project the server never had: 404');

    // ---------------------------------------------------------------- the studio's side
    const list = (await call(own, 'GET', '/v1/projects')).j.projects.map(p => p.ref);
    ok(list.join() === 'shop', 'it leaves the studio\'s list', list);
    r = await call(own, 'PUT', '/v1/projects/test-run', { client: 'greenhome', name: 'Thử Nhờ kiểm tra', phase: 3 });
    const r2 = await call(own, 'POST', '/v1/projects/test-run/versions', { v: 2, terms: { price: 1, rev: 1 }, items: [{ id: 'a', sec: 'in', t: 'x' }] });
    ok(r.s === 410 && r.j.error.code === 'removed' && r2.s === 410, 'another device of the Owner\'s cannot bring it back or write to it', [r.j, r2.j]);

    // ---------------------------------------------------------------- the client's side
    const s2 = (await call(null, 'POST', '/v1/session', { token: tok })).j.session;
    const pt = (await call(s2, 'GET', '/v1/portal')).j;
    const tp = pt.projects.find(p => p.ref === 'test-run'), sp = pt.projects.find(p => p.ref === 'shop');
    ok(tp && tp.removed && tp.removed.at === t0 && tp.removed.until === t0 + 30 * DAY && tp.vers.length === 1 && tp.vers[0].approval && tp.crs.length === 1 && sp && !sp.removed,
      'the emailed link opens the portal: the project comes marked removed, with its whole record; the other project as before', tp && { removed: tp.removed, vers: tp.vers.length, crs: tp.crs.length });
    r = await call(s2, 'POST', '/v1/respond', { action: 'question', project: 'test-run', tx: 'Why?' });
    const rc = await call(s2, 'POST', '/v1/code', { kind: 'scope', project: 'test-run', v: 1 });
    ok(r.s === 410 && /removed this project from your portal/.test(r.j.error.message) && rc.s === 410, 'no answer, question or approval on it', [r.j, rc.j]);
    ok((await call(s2, 'POST', '/v1/respond', { action: 'question', project: 'shop', tx: 'When does the build start?' })).s < 300, 'the other project takes questions as before');

    // ---------------------------------------------------------------- 30 days later
    await at(t0 + 29 * DAY);
    ok(sql(`SELECT COUNT(*) FROM api_projects WHERE id = ${pid}`) === '1' && sql(`SELECT COUNT(*) FROM api_approvals WHERE project_id = ${pid}`) === '1', '29 days: the record is still there');
    await at(t0 + 30 * DAY + 1000);
    const left = ['versions', 'crs', 'entries', 'approvals', 'mev', 'sent'].map(t => sql(`SELECT COUNT(*) FROM api_${t} WHERE project_id = ${pid}`));
    ok(sql(`SELECT COUNT(*) FROM api_projects WHERE id = ${pid}`) === '0' && left.every(x => x === '0') && sql("SELECT COUNT(*) FROM api_events WHERE data LIKE '%\"project\":\"test-run\"%'") === '0',
      '30 days: the project, its versions, requests, entries, approval and events are gone', left);
    const keep = sql("SELECT COUNT(*) FROM api_versions v JOIN api_projects p ON p.id = v.project_id WHERE p.ref = 'shop'");
    ok(keep === '1' && sql("SELECT COUNT(*) FROM api_events WHERE data LIKE '%\"project\":\"shop\"%'") !== '0', 'the other project keeps everything', keep);
    let refused = ''; try { my([DB, '-e', "DELETE FROM api_versions"]); } catch (e) { refused = String(e.stderr || e.message); }
    ok(/immutable/.test(refused) || sql('SELECT COUNT(*) FROM api_versions') === '1', 'the record still refuses DELETE outside that one way (when the host allows triggers)', refused.slice(0, 120));
    const p2 = (await call(s2, 'GET', '/v1/portal')).j;
    ok(p2 && p2.projects.map(p => p.ref).join() === 'shop', 'the portal no longer has it at all', p2 && p2.projects.map(p => p.ref));
  } catch (e) { console.error(e); fails++; }
  srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})();
