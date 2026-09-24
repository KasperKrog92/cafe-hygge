/* Development static server for this checkout: no caching, IPv4 + IPv6.
   node tools/serve.js [port]    (PORT env also works; default 8137)
   Also used by tools/run-suites.js. The shipped café needs no server. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8' };

function createServer() {
  return http.createServer(function (req, res) {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch (e) { res.writeHead(400); res.end(); return; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, function (err, body) {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
      // Never serve stale scripts to a dev tab or a verification browser.
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store' });
      res.end(body);
    });
  });
}

// Node binds the unspecified address dual-stack, so both localhost and
// 127.0.0.1 reach it (Python's http.server.test bound IPv6 only on Windows).
function listen(port) {
  return new Promise(function (resolve, reject) {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, function () { resolve(server); });
  });
}

module.exports = { createServer: createServer, listen: listen, ROOT: ROOT };

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 8137);
  listen(port).then(function () {
    console.log('Café Hygge dev server: http://localhost:' + port + '/?dev');
  }, function (e) { console.error(e.message); process.exit(1); });
}
