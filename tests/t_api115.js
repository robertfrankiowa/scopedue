// api.php 1.21.0 (CONTRACT.md 76): every email also goes as a letter (HTML) built from its text. The text stays word for word;
// the letter is ScopeDue's for an account holder (the sign-up code) and the studio's for its Viewers (initials, colour, "via ScopeDue",
// replies to the studio). Nothing the studio or a Viewer typed reaches the letter as markup.
// Needs what t_api70.js needs (SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN, SD_DB_USER, SD_SCHEMA_DB).
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8115, db: 'sd_letter_test' });
  const { call, account, lastTo } = srv;
  const h = await call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.32.1', 'health: version 1.32.1', h.j.version);

  // ---------------------------------------------------------------- an account holder: ScopeDue's letter
  const own = await account('Minh', 'minh@example.com');
  let m = srv.mails().reverse().find(x => x.to === 'minh@example.com' && /verification code/.test(x.subject)), code = m.body.match(/\b\d{6}\b/)[0];
  ok(!!own && /^Your ScopeDue verification code is \d{6}\n/.test(m.body), 'the text is as before', m.body);
  ok(typeof m.html === 'string' && m.html.startsWith('<!DOCTYPE html>') && m.html.includes('<html lang="en">'), 'it also goes as a letter, in English', m.html && m.html.slice(0, 80));
  ok(m.html.includes(code.slice(0, 3) + '&#8202;' + code.slice(3)) && m.html.includes('>ScopeDue</span>') && !m.html.includes('via ScopeDue'), 'ScopeDue\'s letter, with the code in its box', code);
  ok(m.html.includes('because of your ScopeDue account') && m.html.includes('#24365a'), 'ScopeDue\'s footer and colour');
  ok(m.html.includes('max-width:680px') && !/class="sd-ink sd-pull"|Thư từ|A letter from|<h2/.test(m.html), '1.32.1: 680 px wide; a code email has no kicker, quote or heading');

  // ---------------------------------------------------------------- a Viewer: the studio's letter, in the Viewer's language
  let r = await call(own, 'PUT', '/v1/studio', { name: 'Minh', biz: 'Lumen <b>Studio</b>', tone: 2, lang: 'vi' });
  ok(r.s === 200, 'the studio names its business and picks a colour', r.j);
  r = await call(own, 'PUT', '/v1/vprojects/hr', { name: 'HR <i>tool</i>', show: { items: [] }, entries: [], viewers: [{ email: 'bao@corp.example', name: 'Quốc Bảo', lang: 'vi' }] });
  ok(r.s === 200, 'a Viewer on the portal', r.j);
  await call(own, 'POST', '/v1/vprojects/hr/invite', { email: 'bao@corp.example' });
  m = lastTo('bao@corp.example');
  const url = m.body.match(/https?:\/\/\S+#k=sdm_[A-Za-z0-9_-]+/)[0];
  ok(/^Chào Bảo,\n/.test(m.body) && m.from === 'Lumen <b>Studio</b> via ScopeDue' && m.reply_to === 'minh@example.com', 'the text and the sender are as before', [m.from, m.body.slice(0, 40)]);
  ok(m.html.includes('<html lang="vi">') && m.html.includes('qua ScopeDue') && m.html.includes('#3f5f5a') && />LB<\/td>/.test(m.html), 'the studio\'s letter: its initials in its colour, in Vietnamese', m.html.length);
  ok(m.html.includes('href="' + url.replace(/&/g, '&amp;') + '"') && m.html.includes('Mở trang&nbsp;&rarr;'), 'the link is the button', url);
  ok(m.html.includes('Trả lời thư này là câu trả lời đến thẳng Lumen &lt;b&gt;Studio&lt;/b&gt;.'), 'replies go to the studio, said in the footer');
  ok(!/<b>Studio<\/b>|<i>tool<\/i>/.test(m.html) && m.html.includes('HR &lt;i&gt;tool&lt;/i&gt;'), 'what the studio typed is text in the letter, never markup');
  ok(!m.html.includes('<script') && !/\son[a-z]+=/i.test(m.html), 'no script and no handler in the letter');
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); fails++; }).finally(() => { if (srv) srv.stop(); console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0); });
