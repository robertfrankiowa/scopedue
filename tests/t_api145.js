// api.php 1.32.0 (CONTRACT 145): the first time an account signs in to ScopeDue it is welcomed by email with the letter the app
// shows in its envelope, in the app's language (lang), else Vietnamese for a Vietnamese time zone. Once per account: a new address
// confirmed by its code, a Google sign-up, a website account's first sign-in here. A real api.php on a fresh database (as t_api136),
// with a stand-in for Google's keys. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path'), http = require('http'), crypto = require('crypto'), { execFileSync } = require('child_process');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const PW = 'a-long-pass-70', GCID = '123-test.apps.googleusercontent.com', JWKS_PORT = 8246;
let fails = 0, n = 0, srv = null, jwks = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

/* a stand-in for Google: our own key, published as a JWKS on localhost (api.php fetches http only from localhost) */
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = Object.assign(publicKey.export({ format: 'jwk' }), { kid: 'k145', alg: 'RS256', use: 'sig' });
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function idToken(c) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', kid: 'k145', typ: 'JWT' }));
  const body = b64u(JSON.stringify(Object.assign({ iss: 'https://accounts.google.com', aud: GCID, iat: now, exp: now + 600, email_verified: true }, c)));
  return head + '.' + body + '.' + b64u(crypto.sign('sha256', Buffer.from(head + '.' + body), privateKey));
}

(async () => {
  jwks = http.createServer((q, s) => { s.writeHead(200, { 'content-type': 'application/json' }); s.end(JSON.stringify({ keys: [jwk] })); }).listen(JWKS_PORT, '127.0.0.1');
  process.env.SCOPEDUE_GOOGLE_CLIENT_ID = GCID; process.env.SCOPEDUE_GOOGLE_JWKS = 'http://127.0.0.1:' + JWKS_PORT + '/certs';
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8145, db: 'sd_api145' });
  const { call, mails } = srv, sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  const to = e => mails().filter(m => m.to === e);
  const welcomes = e => to(e).filter(m => /AI (writes the code|viết code)/.test(m.subject));
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1' && h.j.google === true, 'health: version 1.32.1, Google on (the stand-in)', h.j);

  /* sign up with an email code, the app in Vietnamese */
  async function signup(name, email, extra) {
    const r = await call(null, 'POST', '/v1/studios', Object.assign({ name, email, password: PW, password_confirm: PW }, extra));
    if (r.s !== 202) return r;
    const code = to(email).reverse()[0].body.match(/\b\d{6}\b/)[0];
    return call(null, 'POST', '/v1/studios/verify', { challenge: r.j.challenge, code });
  }
  let r = await signup('Nguyễn Quốc Bảo', 'bao@studio.example', { lang: 'vi', tz: 'UTC' });
  ok(r.s === 200 && /^sdk_/.test(r.j.key), 'sign-up with lang vi: signed in', r);
  let w = welcomes('bao@studio.example');
  ok(w.length === 1 && w[0].subject === 'AI viết code. Phần còn lại là của bạn.' && w[0].from === 'ScopeDue', 'one welcome, in Vietnamese, from ScopeDue', w.map(m => [m.subject, m.from]));
  const vb = w[0].body, vh = w[0].html;
  ok(/^Chào Bảo,\n/.test(vb), 'greets the given name of a Vietnamese name', vb.slice(0, 40));
  ok(['Dự án riêng', 'Dự án nội bộ', 'Dự án khách hàng', 'Miễn phí 5 dự án mới mỗi tháng', '2,90 USD', 'Chúc bạn làm ra được điều mình đang ấp ủ.'].every(s => vb.includes(s)), 'the letter whole: three kinds, 5 a month, 2,90 USD, the closing');
  ok(!/mã nguồn mở|open source/i.test(vb), 'no word about open source');
  ok(/<h2[^>]*>Dự án riêng<\/h2>/.test(vh) && /<h2[^>]*>Dự án nội bộ<\/h2>/.test(vh) && /<h2[^>]*>Dự án khách hàng<\/h2>/.test(vh), 'the HTML letter names each kind as a heading');
  /* 1.32.1 (CONTRACT 146): the letter as stationery */
  ok(vh.includes('max-width:680px') && />Thư từ ScopeDue<\/p>/.test(vh) && />01<\/p><h2/.test(vh) && />03<\/p><h2/.test(vh), '680 px wide, a kicker, the kinds numbered 01 to 03');
  ok(/sd-pull[^>]*>&ldquo;AI có thể viết code thay bạn\./.test(vh) && /italic[^>]*>Điều gì đáng làm\?<\/td>/.test(vh) && /italic 400 28px[^>]*>ScopeDue<\/p>/.test(vh), 'the pull quote, the three questions as quotes, the signature');
  ok(vb.includes('– Điều gì đáng làm?') && vb.includes('\n\nScopeDue\n'), 'the text itself is unchanged');
  ok(/href="https:\/\/app\.scopedue\.com\/"[^>]*>Mở ScopeDue/.test(vh) && /lang="vi"/.test(vh) && /tài khoản ScopeDue của bạn/.test(vh), 'a button to the app, the footer in Vietnamese');
  r = await call(null, 'POST', '/v1/studios/login', { email: 'bao@studio.example', password: PW, lang: 'vi' });
  ok(r.s === 200 && welcomes('bao@studio.example').length === 1, 'signing in again sends no second welcome', r.s);

  /* no lang (an app from before 1.32.0): the time zone decides */
  r = await signup('Lan', 'lan@studio.example', { tz: 'Asia/Ho_Chi_Minh' });
  ok(r.s === 200 && welcomes('lan@studio.example').length === 1 && welcomes('lan@studio.example')[0].subject.startsWith('AI viết'), 'no lang, a Vietnamese time zone: in Vietnamese', r.s);
  r = await signup('Ann Lee', 'ann@studio.example', { tz: 'Europe/London' });
  w = welcomes('ann@studio.example');
  ok(r.s === 200 && w.length === 1 && w[0].subject === 'AI writes the code. The rest is yours.', 'no lang, another time zone: in English', w.map(m => m.subject));
  const eb = w[0].body, eh = w[0].html;
  ok(/^Hi Ann,\n/.test(eb) && eb.includes('– What is worth building?') && eb.includes('Free for 5 new projects a month.') && eb.includes('USD 2.90 a month'), 'English: greets Ann, the three questions, 5 a month, USD 2.90', eb.slice(0, 60));
  ok(/<h2[^>]*>Private projects<\/h2>/.test(eh) && /<h2[^>]*>Client projects<\/h2>/.test(eh) && /Open ScopeDue/.test(eh) && /lang="en"/.test(eh), 'English letter: headings and the button');
  r = await signup('Tom', 'tom@studio.example', { lang: 'fr', tz: 'Asia/Ho_Chi_Minh' });
  ok(r.s === 200 && welcomes('tom@studio.example')[0].subject.startsWith('AI viết'), 'a language it does not know is ignored, not refused', r.s);
  r = await signup('Kim', 'kim@studio.example', { lang: 'en', tz: 'Asia/Ho_Chi_Minh' });
  ok(r.s === 200 && welcomes('kim@studio.example')[0].subject.startsWith('AI writes'), 'the app\'s language wins over the time zone');

  /* a website account signs in to ScopeDue for the first time */
  const hash = execFileSync(process.env.SD_PHP || 'php', ['-r', 'echo password_hash($argv[1], PASSWORD_BCRYPT);', PW]).toString().trim();
  sql(`INSERT INTO users(name, email, password_hash, auth_provider, email_verified_at) VALUES('Minh Tran', 'minh@site.example', '${hash}', 'password', NOW())`);
  r = await call(null, 'POST', '/v1/studios/login', { email: 'minh@site.example', password: PW, lang: 'en' });
  ok(r.s === 200 && welcomes('minh@site.example').length === 1 && welcomes('minh@site.example')[0].body.startsWith('Hi Minh,'), 'a website account: welcomed on its first sign-in here', [r.s, to('minh@site.example').map(m => m.subject)]);
  r = await call(null, 'POST', '/v1/studios/login', { email: 'minh@site.example', password: PW });
  ok(r.s === 200 && welcomes('minh@site.example').length === 1, 'and not on the next (an old app without lang is still let in)', r.s);
  r = await call(null, 'POST', '/v1/studios/login', { email: 'minh@site.example', password: 'wrong-password-1' });
  ok(r.s === 401 && welcomes('minh@site.example').length === 1, 'a wrong password sends nothing', r.s);

  /* Google (6 sign-ups an hour from one address: the ones above used them up) */
  sql("DELETE FROM api_rate WHERE k LIKE 'reg:ip:%'");
  async function google(claims, extra) {
    const st = await call(null, 'POST', '/v1/studios/google/start', {});
    if (st.s !== 200) return st;
    return call(null, 'POST', '/v1/studios/google', Object.assign({ id_token: idToken(Object.assign({ nonce: st.j.nonce }, claims)), nonce: st.j.nonce }, extra));
  }
  r = await google({ sub: 'g-1001', email: 'hoa@gmail.com', name: 'Phạm Thị Hoa' }, { lang: 'vi', tz: 'Asia/Ho_Chi_Minh' });
  w = welcomes('hoa@gmail.com');
  ok(r.s === 200 && r.j.returning === false && w.length === 1 && w[0].body.startsWith('Chào Hoa,'), 'Google sign-up: welcomed in Vietnamese, by her given name', [r.s, r.j, w.length]);
  r = await google({ sub: 'g-1001', email: 'hoa@gmail.com', name: 'Phạm Thị Hoa' }, { lang: 'vi' });
  ok(r.s === 200 && r.j.returning === true && welcomes('hoa@gmail.com').length === 1, 'Google again: no second welcome', r.j);
  r = await google({ sub: 'g-1002', email: 'ann@studio.example', name: 'Ann Lee' }, { lang: 'en' });
  ok(r.s === 200 && welcomes('ann@studio.example').length === 1, 'an account made by email, then Google: still one welcome', r.s);
  r = await google({ sub: 'g-1003', email: 'x@gmail.com' }, {});
  ok(r.s === 200 && welcomes('x@gmail.com').length === 1 && /^Hi there,\n/.test(welcomes('x@gmail.com')[0].body), 'Google with no name and no lang: in English, "Hi there" (a one-letter name is no name)', welcomes('x@gmail.com').map(m => m.body.slice(0, 20)));

  /* the sign-up code mail looks as before: no headings leak into other mail */
  ok(!/<h2/.test(to('ann@studio.example').find(m => /verification code/.test(m.subject)).html), 'the code email has no headings');
  ok(sql("SELECT COUNT(*) FROM api_studios") === '8', 'eight accounts signed in, each made once', sql("SELECT COUNT(*) FROM api_studios"));
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); fails++; }).finally(() => {
  if (srv) srv.stop(); if (jwks) jwks.close();
  console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
});
