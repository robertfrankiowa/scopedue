// api.php 1.31.4 (CONTRACT 136): a portal link is only ever emailed to the client (never handed to the studio, who could answer as
// the client), at most 5 a day to one address; mail goes only to a domain that takes mail. A real api.php on a fresh database (as
// t_api70), in test mode, where no DNS is asked and .invalid is the domain that takes no mail. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const PW = 'a-long-pass-70';
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8136, db: 'sd_api136' });
  const { call, mails } = srv, sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1', 'health: version 1.32.1', h.j.version);
  const own = await srv.account('Robert', 'robert@studio.example');
  await call(own, 'PUT', '/v1/clients/acme', { name: 'Acme', contact: 'Ann Lee', email: 'ann@acme.example' });
  await call(own, 'PUT', '/v1/projects/site', { client: 'acme', name: 'Online store' });

  /* ---------------------------------------------------------------- the studio never holds the link */
  const links0 = sql('SELECT COUNT(*) FROM api_links');
  let r = await call(own, 'POST', '/v1/links', { client: 'acme', send: false });
  ok(r.s === 422 && r.j.error.code === 'email_only' && sql('SELECT COUNT(*) FROM api_links') === links0, 'send:false (the old Copy link) is refused, no link made', r);
  const m0 = mails().length;
  r = await call(own, 'POST', '/v1/links', { client: 'acme', project: 'site' });
  const got = mails().slice(m0);
  ok(r.s === 201 && r.j.sent === true && r.j.expires_at > Date.now() && !('url' in r.j) && !JSON.stringify(r.j).includes('sdl_'), 'Email link: sent, and the answer carries no link and no token', r);
  ok(got.length === 1 && got[0].to === 'ann@acme.example' && /#s=[a-z0-9]+&k=sdl_/.test(got[0].body), 'the link is in the client\'s inbox', got.map(m => m.to));
  ok((await call(own, 'POST', '/v1/links', { client: 'acme' })).s === 201, 'a link without a project goes the same way');

  /* ---------------------------------------------------------------- 5 a day to one address */
  for (let i = 0; i < 3; i++) await call(own, 'POST', '/v1/links', { client: 'acme' });
  ok(mails().filter(m => m.to === 'ann@acme.example').length === 5, 'five links reached the client');
  const lk = sql('SELECT COUNT(*) FROM api_links');
  r = await call(own, 'POST', '/v1/links', { client: 'acme' });
  ok(r.s === 429 && /already went to this address 5 times today/.test(r.j.error.message) && sql('SELECT COUNT(*) FROM api_links') === lk, 'the 6th the same day is refused before a link is made', r);
  await call(own, 'PUT', '/v1/clients/bloom', { name: 'Bloom', contact: 'Lan', email: 'lan@bloom.example' });
  ok((await call(own, 'POST', '/v1/links', { client: 'bloom' })).s === 201, 'another client still gets theirs (the limit is per address)');

  /* ---------------------------------------------------------------- no mail to a domain that takes none */
  r = await call(own, 'PUT', '/v1/clients/ghost', { name: 'Ghost', contact: 'Gus', email: 'gus@nowhere.invalid' });
  ok(r.s === 201 || r.s === 200, 'a client with such an address can still be written down', r);
  const lk2 = sql('SELECT COUNT(*) FROM api_links'), mm = mails().length;
  r = await call(own, 'POST', '/v1/links', { client: 'ghost' });
  ok(r.s === 422 && r.j.error.code === 'mail_undeliverable' && /nowhere\.invalid/.test(r.j.error.message) && sql('SELECT COUNT(*) FROM api_links') === lk2 && mails().length === mm,
    'Email link to it: refused, nothing made, nothing sent', r);
  r = await call(null, 'POST', '/v1/studios', { name: 'Nobody', email: 'nobody@nowhere.invalid', password: PW, password_confirm: PW });
  ok(r.s === 422 && r.j.error.code === 'mail_undeliverable' && sql("SELECT COUNT(*) FROM api_codes WHERE status = 'open' AND target LIKE '%nowhere.invalid%'") === '0', 'a sign-up to such an address: refused before a code is made', r);
  r = await call(own, 'PUT', '/v1/invites', { fid: 'folderXYZ1', email: 'ed@nowhere.invalid', project: 'Site', role: 'Editor', kind: 'private' });
  ok((r.s === 201 || r.s === 200) && r.j.mailed === false, 'an invitation to such an address is kept (the bell has it) but no mail goes', r);
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
