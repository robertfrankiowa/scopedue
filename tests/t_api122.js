// api.php 1.26.1 (CONTRACT 92): a published test result may name the bug opened from it (bid), so the Viewer portal shows the two as
// one. Kept only on a test result and only as a short id; the Viewer's page gets it. A real api.php on a fresh database, as t_api70.
// SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8122, db: 'sd_api122' });
  const { call, lastTo, account } = srv;
  ok((await call(null, 'GET', '/v1/health')).j.version === '1.30.0', 'health: version 1.30.0');
  const own = await account('Robert', 'robert@example.com');
  const entries = [
    { id: 'b1', k: 'bug', fr: ['lan@corp.example'], names: 'Lan', t: 'Merged cells fail on row 1', st: 'open', vo: [], ts: 2, cm: [] },
    { id: 't1', k: 'test', fr: ['lan@corp.example'], names: 'Lan', t: 'Merged cells fail on row 1', st: 'failbug', res: 'fail', bid: 'b1', vo: [], ts: 1, cm: [] },
    { id: 't2', k: 'test', fr: ['lan@corp.example'], names: 'Lan', t: 'Step 4', st: 'fail', res: 'fail', bid: 'not an id!', vo: [], ts: 3, cm: [] },
    { id: 'r1', k: 'req', fr: ['lan@corp.example'], names: 'Lan', t: 'A request', st: 'open', bid: 'b1', vo: [], ts: 4, cm: [] }];
  const put = await call(own, 'PUT', '/v1/vprojects/hr-tool', { name: 'HR tool', show: {}, entries, viewers: [{ email: 'lan@corp.example', name: 'Lan Anh' }] });
  ok(put.s === 200, 'the studio publishes a bug and the test result that opened it', put);
  await call(own, 'POST', '/v1/vprojects/hr-tool/invite', { email: 'lan@corp.example' });
  const k = lastTo('lan@corp.example').body.match(/#k=(sdm_[A-Za-z0-9_-]+)/)[1];
  const lan = (await call(null, 'POST', '/v1/vsession', { token: k })).j.session;
  const es = (await call(lan, 'GET', '/v1/viewer')).j.entries, by = id => es.find(e => e.id === id) || {};
  ok(by('t1').bid === 'b1', 'the Viewer\'s page has the bug\'s id on the test result', by('t1'));
  ok(!('bid' in by('t2')), 'an id that is not one is dropped', by('t2'));
  ok(!('bid' in by('r1')) && !('bid' in by('b1')), 'only a test result carries it', [by('r1'), by('b1')]);
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
