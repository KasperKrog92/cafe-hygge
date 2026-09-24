/* Art review capture (docs/art-workflow.md): the __dev.review() images and a
   live + day/night fixture audit, saved to .art-review/<label>/.

   node tools/art-review.js [--label review] [--verify] [--url base] [--headed]

   Serves this checkout on a free port (unless --url), opens a fresh ?dev page
   in the installed Chrome, captures, then exits; nothing is left running.
   --verify also runs tools/verify-art.js (repeatability, side effects,
   occupancy scenarios, frame timing) into verification.json. */
'use strict';
const fs = require('fs'), path = require('path');
const serve = require('./serve.js');

function args() {
  const o = { label: 'review', verify: false, url: null, headed: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--label') o.label = a[++i];
    else if (a[i] === '--verify') o.verify = true;
    else if (a[i] === '--url') o.url = a[++i].replace(/\/?(\?.*)?$/, '');
    else if (a[i] === '--headed') o.headed = true;
    else throw new Error('Unknown argument: ' + a[i]);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(String(o.label))) throw new Error('Label must be [a-zA-Z0-9_-]+');
  return o;
}

function writePng(file, dataUrl) {
  fs.writeFileSync(file, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
}

async function main() {
  const o = args();
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch (e) { throw new Error('playwright-core is not installed. Run: npm ci --prefix tools'); }
  const out = path.join(serve.ROOT, '.art-review', o.label);
  fs.mkdirSync(out, { recursive: true });

  let server = null, base = o.url;
  if (!base) {
    server = await serve.listen(0);
    base = 'http://localhost:' + server.address().port;
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: !o.headed });
  try {
    // A fresh context: no cached scripts, saves or settings from other tabs.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.stack || e)));
    await page.goto(base + '/?dev');
    await page.waitForFunction('!!(window.__dev && window.__dev.review && window.__world)', null, { timeout: 30000 });
    const result = await page.evaluate(() => {
      for (let i = 0; i < 5000 && __world.shop.phase === 'settling'; i++) SIM.update(__world, .25);
      const problems = __dev.audit().concat(__dev.audit(__dev.study()), __dev.audit(__dev.study({ hour: 20 })));
      const memory = JSON.stringify(MEMORY.state), time = __world.t;
      const shots = __dev.review();
      if (memory !== JSON.stringify(MEMORY.state) || time !== __world.t)
        throw new Error('Art review changed live simulation or memory');
      return { problems, shots };
    });
    for (const [name, dataUrl] of Object.entries(result.shots)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) throw new Error('Unexpected shot name: ' + name);
      writePng(path.join(out, name + '.png'), dataUrl);
    }
    fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(result.problems, null, 2));
    if (result.problems.length) throw new Error(result.problems.join('\n'));
    if (o.verify) {
      const code = fs.readFileSync(path.join(__dirname, 'verify-art.js'), 'utf8')
        .replace(/^﻿/, '').trim().replace(/;$/, '');
      const verification = await page.evaluate(code);
      const text = JSON.stringify(verification, null, 2);
      fs.writeFileSync(path.join(out, 'verification.json'), text);
      console.log(text);
    }
    if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'));
    console.log('Saved ' + Object.keys(result.shots).join(', ') + ' to ' + out + '; audit: 0 problems.');
  } finally {
    await browser.close();
    if (server) server.close();
  }
}

main().catch(e => { console.error(e.message || e); process.exitCode = 1; });
