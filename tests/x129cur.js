/* CONTRACT 101: a project's currency. Node only, no browser: the shared money code (src/js/money.js), the time zone guess
   (src/js/app/16a-currency-guess.js) and the amount parser (pdParseNum, src/js/app/16-project-model.js), run as the build has
   them in the extension's app.js, so what is checked is what ships.
   usage, from the release folder:  node tests/x129cur.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'scopedue-extension', 'app.js'), 'utf8');
const portal = fs.readFileSync(path.join(root, 'portal-assets', 'portal.js'), 'utf8');
let bad = 0, n = 0;
function ok(c, m) { n++; if (c) console.log('ok   ' + m); else { bad++; console.log('FAIL ' + m); } }
function cut(src, from, to) { const i = src.indexOf(from), j = src.indexOf(to, i); if (i < 0 || j < 0) throw new Error('not found: ' + from); return src.slice(i, j); }

const money = cut(app, "  /* ---------- CONTRACT 101: money in a project's own currency", '  function sdCurOptions(');
const opts = cut(app, '  function sdCurOptions(', '\n  }\n') + '\n  }\n';
const guess = cut(app, "  /* ---------- CONTRACT 101: a new client project's first currency", '\n  }\n') + '\n  }\n';
const parse = cut(app, '  var PD_NUM = ', '\n  /* ---------- v60 shared model');
ok(portal.indexOf(money) > -1, 'the portal runs the same money code as the app');

function ctx(lang, tz, langs) {
  const c = { window: { SDI18N: { lang } }, navigator: { languages: langs || ['en-US'], language: (langs || ['en-US'])[0] }, Intl: Object.assign({}, Intl, { DateTimeFormat: function () { return { resolvedOptions: () => ({ timeZone: tz }) }; } }) };
  c.Intl.NumberFormat = Intl.NumberFormat; c.Intl.DisplayNames = Intl.DisplayNames; c.Intl.Locale = Intl.Locale;
  c.SDI18N = c.window.SDI18N;
  vm.createContext(c); vm.runInContext(money + opts + guess + parse, c); return c;
}
const en = ctx('en', 'America/New_York'), vi = ctx('vi', 'Asia/Ho_Chi_Minh');
const nb = s => s.replace(/[  ]/g, ' ');
ok(en.sdMoney(4800, 'USD') === '$4,800', 'USD in English: ' + en.sdMoney(4800, 'USD'));
ok(nb(vi.sdMoney(55000000, 'VND')) === '55.000.000 ₫', 'VND in Tiếng Việt: ' + vi.sdMoney(55000000, 'VND'));
ok(en.sdMoney(1200, 'EUR') === '€1,200', 'EUR in English: ' + en.sdMoney(1200, 'EUR'));
ok(en.sdMoney(1200, 'JPY') === '¥1,200', 'JPY in English: ' + en.sdMoney(1200, 'JPY'));
ok(en.sdMoney(1200, 'KWD').indexOf('.') < 0, 'a three-decimal currency still shows a whole amount: ' + en.sdMoney(1200, 'KWD'));
ok(en.sdMoney(5, 'bad') === '$5', 'a code that is not one falls back to USD');
ok(en.sdMoney(5, 'XCG').indexOf('5') > -1, 'a code the browser may not know still shows: ' + en.sdMoney(5, 'XCG'));
ok(vi.sdCurName('VND') !== 'VND' && en.sdCurName('USD') === 'US Dollar', 'names: ' + vi.sdCurName('VND') + ' / ' + en.sdCurName('USD'));
ok(en.SD_CURS.length > 140 && en.SD_CURS.indexOf('VND') > -1 && en.SD_CURS.indexOf('EUR') > -1 && en.SD_CURS.indexOf('BGN') < 0, 'currencies in the picker: ' + en.SD_CURS.length + ' (Bulgaria is in the euro)');
const o = en.sdCurOptions('VND');
ok(/<option value="VND" selected>VND · /.test(o) && (o.match(/<option/g) || []).length === en.SD_CURS.length, 'the picker lists every currency, the project\'s chosen');
ok(/value="ABC" selected/.test(en.sdCurOptions('ABC')), 'a project\'s code that is not in the list is kept in the picker');

// the guess: the device's time zone, its old names, then the language's region, then USD
const tz = [['Asia/Ho_Chi_Minh', 'VND'], ['Asia/Saigon', 'VND'], ['Europe/Berlin', 'EUR'], ['Europe/Sofia', 'EUR'], ['America/New_York', 'USD'], ['Asia/Calcutta', 'INR'],
  ['Asia/Tokyo', 'JPY'], ['Europe/London', 'GBP'], ['Australia/Sydney', 'AUD'], ['America/Argentina/Buenos_Aires', 'ARS'], ['Asia/Bangkok', 'THB'], ['America/Toronto', 'CAD']];
tz.forEach(([z, c]) => { const g = ctx('en', z).sdCurGuess(); ok(g === c, z + ' -> ' + g); });
ok(ctx('en', 'UTC', ['vi-VN']).sdCurGuess() === 'VND', 'UTC with a vi-VN browser -> VND');
ok(ctx('en', 'UTC', ['vi']).sdCurGuess() === 'VND', 'UTC with a "vi" browser (no region) -> VND');
ok(ctx('en', 'Etc/UTC', ['de-DE']).sdCurGuess() === 'EUR', 'Etc/UTC with de-DE -> EUR');
ok(ctx('en', '', []).sdCurGuess() === 'USD', 'nothing to go by -> USD');

// amounts as people type them
const P = (v) => { const r = en.pdParseNum(v, 'amt'); return r.err ? 'err' : r.n; };
[['1,200', 1200], ['1200', 1200], ['$1,200', 1200], ['1,200 USD', 1200], ['12.000.000', 12000000], ['12.000.000 ₫', 12000000], ['₫12,000,000', 12000000],
 ['1 200 000', 1200000], ['1 200', 1200], ['1.200', 1200], ['1200,00', 1200], ['1,200.00', 1200], ['', null], ['0', 0],
 ['12.50', 'err'], ['12,50', 'err'], ['1.200,50', 'err'], ['-5', 'err'], ['abc', 'err'], ['1,20,000', 120000], ['12,34,56,789', 123456789], ['1.200,000', 1200], ['1,2000', 'err'],
 ['1000000000000', 1e12], ['1000000000001', 'err']].forEach(([v, want]) => { const got = P(v); ok(got === want, JSON.stringify(v) + ' -> ' + got); });
ok(en.pdParseNum('3 days', 'days').n === 3 && en.pdParseNum('400', 'days').err, 'days unchanged');

console.log((bad ? 'FAILED ' + bad : 'all ok') + ' (' + n + ' checks)');
process.exit(bad ? 1 : 0);
