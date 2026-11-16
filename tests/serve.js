// A tiny static server for the release folder. Headless Chromium can drop a page's localStorage writes when a file:// page
// reloads (about 1 in 7 in a fresh context, with no app code involved); over http it does not. Tests that reload after a
// first run load the app from here.
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
module.exports = root => new Promise(res => {
  const s = http.createServer((q, r) => {
    const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  s.listen(0, '127.0.0.1', () => res({ base: 'http://127.0.0.1:' + s.address().port + '/', close: () => s.close() }));
});
