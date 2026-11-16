// api.php 1.29.0 (CONTRACT 97): an account's days of use for /admin/users/. One row per account and UTC day: the apps it came from
// (the Origin header), the country Cloudflare names (CF-IPCountry), how many minutes it was seen; never an IP. A real api.php on a
// fresh database, as t_api70. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0, srv = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

(async () => {
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port: 8131, db: 'sd_api129' });
  const sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  const get = (key, headers) => fetch(srv.api + '?r=/v1/billing', { headers: Object.assign({ Authorization: 'Bearer ' + key }, headers || {}) }).then(r => r.status);
  const h = await srv.call(null, 'GET', '/v1/health');
  ok(h.j.version === '1.30.0' && sql("SELECT v FROM api_kv WHERE k = 'schema'") === '21', 'health: version 1.30.0, schema 21', h.j.version);
  const a = await srv.account('Robert', 'robert@example.com'), id = sql("SELECT id FROM users WHERE email = 'robert@example.com'");
  const today = new Date().toISOString().slice(0, 10), row = () => sql(`SELECT CONCAT_WS('|', day, country, ext, pwa, web, hits) FROM api_activity WHERE user_id = ${id}`);
  const back = () => srv.my(['-e', `UPDATE users SET last_seen_at = NOW() - INTERVAL 2 MINUTE WHERE id = ${id}`, srv.db]);

  back();
  ok(await get(a, { Origin: 'chrome-extension://ibbcacdfhodipmkffnbjjkhphedmpknp', 'CF-IPCountry': 'VN' }) === 200, 'a request from the extension, Cloudflare says VN');
  ok(row() === `${today}|VN|1|0|0|1`, 'today: Vietnam, the extension, seen once', row());
  ok(await get(a, { Origin: 'chrome-extension://ibbcacdfhodipmkffnbjjkhphedmpknp', 'CF-IPCountry': 'VN' }) === 200 && row().endsWith('|1'), 'again within the minute: not counted again (as last_seen_at)', row());
  back();
  await get(a, { Origin: 'https://app.scopedue.com', 'CF-IPCountry': 'us' });
  ok(row() === `${today}|US|1|1|0|2`, 'from the web app a minute later, in the US: both apps, the latest country, 2 minutes', row());
  back();
  await get(a, { Origin: 'https://app.scopedue.com' });
  ok(row() === `${today}|US|1|1|0|3`, 'no country from Cloudflare: the one known stays', row());
  back();
  await get(a, { Origin: 'https://evil.example', 'CF-IPCountry': '<script>' });
  ok(row() === `${today}|US|1|1|0|4`, 'another origin and a country that is not two letters: counted, nothing else changes', row());
  back();
  await get(a, { 'CF-IPCountry': 'T1' });
  ok(row().split('|')[1] === 'T1', 'Tor is kept as T1', row());
  ok(sql("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_activity' AND COLUMN_NAME LIKE '%ip%'") === '0', 'the table has no column for an IP');
  ok(sql('SELECT COUNT(*) FROM api_activity') === '1', 'one row for the account and the day');
  ok(await get('sdk_not_a_key', { 'CF-IPCountry': 'VN' }) === 401 && sql('SELECT COUNT(*) FROM api_activity') === '1', 'a request without a valid key writes nothing');
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
