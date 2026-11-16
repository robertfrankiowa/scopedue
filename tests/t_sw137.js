// Extension 0.10.84 (CONTRACT 137): which pages may message the extension. sw.js runs here with a stand-in chrome.*: its
// onMessageExternal listener is called as Chrome would, with the sender's url, and its answer and what it kept are read back.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x))); if (!c) fails++; };

const store = {}, listeners = {};
const ev = k => ({ addListener: f => { listeners[k] = f; } });
const chrome = {
  storage: { local: { get: (k, cb) => cb({ [k]: store[k] }), set: (o, cb) => { Object.assign(store, o); cb && cb(); }, remove: () => {} }, session: { set: () => {} }, onChanged: ev('changed') },
  runtime: { onInstalled: ev('installed'), onStartup: ev('startup'), onMessageExternal: ev('external'), getManifest: () => ({ version: 'x' }), getURL: p => 'chrome-extension://id/' + p, lastError: null },
  contextMenus: { removeAll: cb => cb && cb(), create: () => {}, onClicked: ev('menu') },
  action: { setTitle: () => Promise.resolve() }, sidePanel: { setPanelBehavior: () => Promise.resolve(), open: () => Promise.resolve() },
  tabs: { create: () => Promise.resolve() }, alarms: { onAlarm: ev('alarm') }, windows: { getLastFocused: () => {}, create: () => Promise.resolve() },
};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'scopedue-extension/sw.js'), 'utf8'), { chrome, self: {}, URL, console });
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scopedue-extension/manifest.json'), 'utf8'));
ok(JSON.stringify(manifest.externally_connectable.matches) === '["https://scopedue.com/api/join.html*"]', 'the manifest lets only the join page connect (no localhost, not the whole site)', manifest.externally_connectable);

const send = (url, msg) => new Promise(res => { const r = listeners.external(msg, url === null ? {} : { url, origin: url ? new URL(url).origin : undefined }, res); if (r !== true) {} });
(async () => {
  const join = { type: 'sd-join', fid: 'folder1234', files: [{ id: 'file123456', name: 'owner.sdteam' }] };
  let r = await send('https://scopedue.com/api/join.html#f=folder1234', join);
  ok(r.ok === true && store.sdJoin && store.sdJoin.fid === 'folder1234', 'the join page hands a folder over', [r, store.sdJoin]);
  delete store.sdJoin;
  for (const [url, why] of [['https://scopedue.com/blog/post.html', 'another page of the website'], ['https://scopedue.com/api/paid.html', 'the paid page'],
    ['http://localhost:8765/join.html', 'localhost:8765 (any program on the computer)'], ['https://evil.example/api/join.html', 'another site'], ['https://scopedue.com.evil.example/api/join.html', 'a look-alike host'], [null, 'no url at all']]) {
    r = await send(url, join);
    ok(r.ok === false && !store.sdJoin, 'refused: ' + why, r);
  }
  store.sdAcct = 'anne@example.com';
  r = await send('https://scopedue.com/', { type: 'sd-who', email: 'anne@example.com' });
  ok(r.ok === false, 'the home page cannot ask whose account is signed in (sd-who)', r);
  r = await send('https://scopedue.com/api/join.html', { type: 'sd-who', email: 'anne@example.com' });
  ok(r.ok === true && r.same === true, 'the join page still can', r);
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
})();
