/* Assemble the GitHub Pages artifact: only the shipped files, with every local
   script/style URL in index.html stamped ?v=<content hash>. Nobody bumps
   cache tags by hand; a changed file always gets a new URL past the CDN cache.
   node tools/build-site.js [outDir=_site] */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
const SHIP = ['index.html', 'style.css', 'CNAME', 'js', 'assets'];

function copy(rel) {
  const from = path.join(ROOT, rel), to = path.join(OUT, rel);
  if (fs.statSync(from).isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(name => copy(path.join(rel, name)));
  } else fs.copyFileSync(from, to);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
SHIP.forEach(copy);

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let stamped = 0;
html = html.replace(/(<(?:script|link)\b[^>]*?\s(?:src|href)=")([^"?#:]+)(?:\?[^"]*)?(")/g,
  function (whole, open, rel, close) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) throw new Error('index.html references a missing file: ' + rel);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
    stamped++;
    return open + rel + '?v=' + hash + close;
  });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('Built ' + path.relative(ROOT, OUT) + ': ' + stamped + ' cache-stamped references.');
