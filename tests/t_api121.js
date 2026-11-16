// api.php 1.26.0 (v121, CONTRACT 91): POST /v1/dvnudge, the email that tells someone in a project kept in Drive what a teammate did
// that is theirs to act on, as team sync's nudge did. The server checks both share the project by its invitations: the Owner and an
// accepted Editor not taken off, or two such Editors. Over HTTP against a fresh MySQL database in test mode.
// Needs PHP 8.1+ with pdo_mysql and a MySQL / MariaDB server: SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB (as t_api70).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8121, db: 'sd_dvnudge_test' });
  const { call, account, mails } = srv;
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0', 'health: version 1.30.0', h.j.version);
  const own = await account('Minh', 'minh@example.com'), hung = await account('Hung', 'hung@example.com'), mai = await account('Mai', 'mai@example.com'), out = await account('Lan', 'lan@example.com');
  const FID = '1AbCdEfGhIjKlMnOp_q-r', FID2 = '1ZyXwVuTsRqPoNmLk_j-i';
  const invite = async (to, fid) => (await call(own, 'PUT', '/v1/invites', { fid: fid || FID, email: to, project: 'HR Companion', role: 'Editor', name: 'Minh' })).j.invite;
  const accept = async (who, fid) => { const r = await call(who, 'GET', '/v1/invites'); const i = (r.j.to_me || []).find(x => x.fid === (fid || FID)); return i ? (await call(who, 'POST', '/v1/invites/' + i.id + '/accept', {})).s : 0; };
  await invite('hung@example.com'); await invite('mai@example.com');
  ok(await accept(hung) === 200, 'Hung accepts the invitation');
  const to = e => mails().filter(m => m.to === e);
  const nud = (who, b) => call(who, 'POST', '/v1/dvnudge', Object.assign({ project: 'HR Companion' }, b));

  // the Owner to an Editor
  let r = await nud(own, { fid: FID, to: 'hung@example.com', kind: 'assigned' });
  let m = to('hung@example.com').pop();
  ok(r.s === 200 && r.j.sent === true && m && /Minh gave you work on HR Companion/.test(m.subject) && /encrypted on your devices/.test(m.body), 'the Owner gives Hung work: Hung is emailed who and the project, not the work', [r.j, m && m.subject]);
  r = await nud(own, { fid: FID, to: 'hung@example.com', kind: 'assigned' });
  ok(r.j.sent === false && r.j.later === true, 'once an hour per person, project and kind', r.j);
  r = await nud(own, { fid: FID, to: 'hung@example.com', kind: 'approved' });
  ok(r.j.sent === true && /Minh approved your work on HR Companion/.test(to('hung@example.com').pop().subject), 'another kind goes', r.j);
  // an Editor to the Owner
  r = await nud(hung, { fid: FID, to: 'minh@example.com', kind: 'review' });
  ok(r.j.sent === true && /Hung asked you to review something on HR Companion/.test(to('minh@example.com').pop().subject), 'Hung asks the Owner for a review', r.j);
  // who may not
  ok((await nud(hung, { fid: FID, to: 'mai@example.com', kind: 'handover' })).s === 422, 'not to someone who has not accepted');
  ok(await accept(mai) === 200 && (await nud(hung, { fid: FID, to: 'mai@example.com', kind: 'handover' })).j.sent === true, 'once Mai accepted, Hung can hand work over to her');
  ok((await nud(out, { fid: FID, to: 'minh@example.com', kind: 'review' })).s === 404, 'someone outside the project cannot');
  ok((await nud(own, { fid: FID, to: 'lan@example.com', kind: 'assigned' })).s === 422, 'nor to someone outside it');
  ok((await nud(own, { fid: FID2, to: 'hung@example.com', kind: 'assigned' })).s === 404, 'nor for another folder');
  ok((await nud(hung, { fid: FID, to: 'mai@example.com', kind: 'feedback' })).s === 403, 'only the Owner says Viewers sent feedback');
  r = await nud(own, { fid: FID, to: 'mai@example.com', kind: 'feedback' });
  ok(r.j.sent === true && /Viewers sent feedback on HR Companion/.test(to('mai@example.com').pop().subject), 'the Owner tells an Editor Viewers sent feedback', to('mai@example.com').map(m => m.subject));
  ok((await nud(own, { fid: FID, to: 'hung@example.com', kind: 'nonsense' })).s === 422 && (await nud(own, { fid: 'bad id!', to: 'hung@example.com', kind: 'assigned' })).s === 422 && (await nud(own, { fid: FID, to: 'minh@example.com', kind: 'assigned' })).s === 422, 'kind, folder and recipient are checked; not to oneself');
  // email notices off
  await call(hung, 'PUT', '/v1/studio', { notify: false });
  r = await nud(own, { fid: FID, to: 'hung@example.com', kind: 'back' });
  ok(r.s === 200 && r.j.sent === false, 'not to someone whose email notices are off', r.j);
  await call(hung, 'PUT', '/v1/studio', { notify: true });
  // taken off
  await call(own, 'POST', '/v1/invites/withdraw', { fid: FID, email: 'hung@example.com', left: true, project: 'HR Companion', name: 'Minh' });
  ok((await nud(own, { fid: FID, to: 'hung@example.com', kind: 'waiting' })).s === 422 && (await nud(hung, { fid: FID, to: 'minh@example.com', kind: 'waiting' })).s === 404, 'once taken off, neither way');
  ok(!mails().some(m => /HR Companion/.test(m.body) && /Excel|0001/.test(m.body)), 'no email carries any work');
  console.log('\n' + (fails ? 'FAILED ' + fails + ' of ' + n : 'ALL PASSED ' + n + '/' + n));
  srv.stop && srv.stop(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv && srv.stop && srv.stop(); process.exit(1); });
