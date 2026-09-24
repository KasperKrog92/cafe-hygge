/* Browser verification runner: evaluates tools/verify-<suite>.js on a fresh
   ?dev page per suite and exports reports and captures to .art-review/<label>/.
   One implementation for local runs (tools/verify-project.ps1) and CI.

   npm ci --prefix tools          once: pinned playwright-core, no browser download
   node tools/run-suites.js [--suite a,b] [--label name] [--jobs n] [--url base]

   Uses the installed Google Chrome (GitHub's Ubuntu runners include it). Each
   suite gets its own browser context, so saves and settings never leak between
   suites. Without --url it serves this checkout itself on a free port. */
'use strict';
const fs = require('fs'), path = require('path');
const serve = require('./serve.js');

function args() {
  const o = { suite: null, label: 'project-check', jobs: 1, url: null, headed: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--suite') o.suite = a[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a[i] === '--label') o.label = a[++i];
    else if (a[i] === '--jobs') o.jobs = Math.max(1, Number(a[++i]) || 1);
    else if (a[i] === '--url') o.url = a[++i].replace(/\/?(\?.*)?$/, '');
    else if (a[i] === '--headed') o.headed = true;
    else throw new Error('Unknown argument: ' + a[i]);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(o.label)) throw new Error('Label must be [a-zA-Z0-9_-]+');
  return o;
}

// The suite list is derived from the files, so a new verify-*.js is always run.
function allSuites() {
  return fs.readdirSync(__dirname).filter(f => /^verify-.+\.js$/.test(f))
    .map(f => f.slice(7, -3)).sort();
}

function writePng(file, dataUrl) {
  fs.writeFileSync(file, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
}

async function runSuite(browser, base, name, out) {
  const started = Date.now();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  try {
    await page.goto(base + '/?dev');
    await page.waitForFunction('!!(window.__dev && window.__world)', null, { timeout: 30000 });
    const code = fs.readFileSync(path.join(__dirname, 'verify-' + name + '.js'), 'utf8')
      .replace(/^﻿/, '').trim().replace(/;$/, '');
    const report = await page.evaluate('(async () => { try { return { ok: true, result: await ' + code +
      ' }; } catch (e) { return { ok: false, error: String(e.stack || e) }; } })()');
    // Suites leave captures on window.<something>Frames; export them all.
    const frames = await page.evaluate(() => {
      const all = {};
      Object.keys(window).filter(k => /Frames$/.test(k) && window[k] && typeof window[k] === 'object')
        .forEach(k => Object.entries(window[k]).forEach(([n, v]) => {
          if (typeof v === 'string' && v.startsWith('data:image/png')) all[n] = v;
        }));
      return all;
    });
    for (const [frame, url] of Object.entries(frames)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(frame)) throw new Error('Unexpected frame name: ' + frame);
      writePng(path.join(out, name + '-' + frame + '.png'), url);
    }
    if (report.ok && report.result && typeof report.result.sheet === 'string')
      writePng(path.join(out, name + '-sheet.png'), report.result.sheet);
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(report, (k, v) =>
      typeof v === 'string' && v.startsWith('data:image/') ? '<png ' + v.length + ' chars>' : v, 2));
    return { suite: name, passed: report.ok && !errors.length, seconds: (Date.now() - started) / 1000,
      error: report.error || null, browserErrors: errors };
  } catch (e) {
    return { suite: name, passed: false, seconds: (Date.now() - started) / 1000,
      error: String(e.stack || e), browserErrors: errors };
  } finally {
    await context.close();
  }
}

async function main() {
  const o = args();
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch (e) { throw new Error('playwright-core is not installed. Run: npm ci --prefix tools'); }
  const suites = o.suite || allSuites();
  const unknown = suites.filter(s => allSuites().indexOf(s) < 0);
  if (unknown.length) throw new Error('Unknown suite(s): ' + unknown.join(', ') + '\nKnown: ' + allSuites().join(', '));
  const out = path.join(serve.ROOT, '.art-review', o.label);
  fs.mkdirSync(out, { recursive: true });

  let server = null, base = o.url;
  if (!base) {
    server = await serve.listen(0);
    base = 'http://localhost:' + server.address().port;
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: !o.headed });
  const reports = [];
  try {
    const queue = suites.slice();
    await Promise.all(Array.from({ length: Math.min(o.jobs, queue.length) }, async () => {
      while (queue.length) {
        const name = queue.shift();
        const r = await runSuite(browser, base, name, out);
        reports.push(r);
        console.log((r.passed ? 'PASS ' : 'FAIL ') + name + ' (' + r.seconds.toFixed(1) + ' s)' +
          (r.passed ? '' : '\n  ' + String(r.error || r.browserErrors.join('\n  ')).split('\n').slice(0, 6).join('\n  ')));
      }
    }));
  } finally {
    await browser.close();
    if (server) server.close();
  }
  reports.sort((a, b) => suites.indexOf(a.suite) - suites.indexOf(b.suite));
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(reports, null, 2));
  const failed = reports.filter(r => !r.passed);
  console.log((failed.length ? failed.length + ' of ' + reports.length + ' suites failed' :
    'All ' + reports.length + ' suites passed') + '. Results: ' + out);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch(e => { console.error(e.message || e); process.exitCode = 1; });
