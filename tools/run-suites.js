/* Browser verification runner, used locally (tools/verify-project.ps1) and in CI.
   Two kinds of check, each in a fresh browser context so saves and settings
   never leak between them:
     <name>      tools/verify-<name>.js, evaluated on a ?dev page (sim/render)
     ui:<name>   tools/ui/<name>.js, a page-level flow with real clicks,
                 reloads and viewports: module.exports = async t => report
   Reports and captures go to .art-review/<label>/.

   npm ci --prefix tools          once: pinned playwright-core, no browser download
   node tools/run-suites.js [--suite a,ui:b] [--label name] [--jobs n] [--url base]

   Uses the installed Google Chrome (GitHub's Ubuntu runners include it).
   Without --url it serves this checkout itself on a free port. */
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

// Both lists are derived from the files, so a new check is always run.
function allSuites() {
  const inPage = fs.readdirSync(__dirname).filter(f => /^verify-.+\.js$/.test(f)).map(f => f.slice(7, -3));
  const ui = fs.existsSync(path.join(__dirname, 'ui')) ?
    fs.readdirSync(path.join(__dirname, 'ui')).filter(f => /\.js$/.test(f)).map(f => 'ui:' + f.slice(0, -3)) : [];
  return inPage.sort().concat(ui.sort());
}

function writePng(file, dataUrl) {
  fs.writeFileSync(file, Buffer.from(String(dataUrl).split(',')[1], 'base64'));
}
function fileName(name) { return name.replace(':', '-'); }

async function exportFrames(page, name, out) {
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
    writePng(path.join(out, fileName(name) + '-' + frame + '.png'), url);
  }
}

async function runInPage(page, base, name, out) {
  await page.goto(base + '/?dev');
  await page.waitForFunction('!!(window.__dev && window.__world)', null, { timeout: 30000 });
  const code = fs.readFileSync(path.join(__dirname, 'verify-' + name + '.js'), 'utf8')
    .replace(/^﻿/, '').trim().replace(/;$/, '');
  const report = await page.evaluate('(async () => { try { return { ok: true, result: await ' + code +
    ' }; } catch (e) { return { ok: false, error: String(e.stack || e) }; } })()');
  await exportFrames(page, name, out);
  if (report.ok && report.result && typeof report.result.sheet === 'string')
    writePng(path.join(out, name + '-sheet.png'), report.result.sheet);
  return report;
}

async function runUi(page, base, name, out) {
  const flow = require(path.join(__dirname, 'ui', name.slice(3) + '.js'));
  const t = {
    page: page,
    // A script that runs before every page load in this flow (e.g. tools/life-browser-init.js).
    init: function (file) { return page.context().addInitScript({ path: path.join(__dirname, file) }); },
    // Open a page of this checkout and wait for the world (path may carry a query).
    // Poll on a timer: ?life-test pages stub requestAnimationFrame, which
    // Playwright's default frame-based polling would wait on forever.
    open: async function (p) {
      await page.goto(base + (p || '/'));
      await page.waitForFunction('!!window.__world', null, { timeout: 30000, polling: 100 });
    },
    reload: async function () {
      await page.reload();
      await page.waitForFunction('!!window.__world', null, { timeout: 30000, polling: 100 });
    },
    eval: function (fn, arg) { return page.evaluate(fn, arg); },
    // Resize, then wait for the page's own resize handler (main.js refits and
    // clears the canvas there); a frame drawn before it would be wiped.
    viewport: async function (w, h) {
      const changing = await page.evaluate(size => {
        if (innerWidth === size[0] && innerHeight === size[1]) return false;
        window.__runnerResized = new Promise(resolve => addEventListener('resize', resolve, { once: true }));
        return true;
      }, [w, h]);
      await page.setViewportSize({ width: w, height: h });
      if (changing) await page.evaluate(() => Promise.race([window.__runnerResized,
        new Promise((resolve, reject) => setTimeout(() => reject(Error('resize event never arrived')), 5000))]));
    },
    shot: function (label) { return page.screenshot({ path: path.join(out, fileName(name) + '-' + label + '.png') }); }
  };
  try {
    return { ok: true, result: await flow(t) };
  } catch (e) {
    try { await t.shot('failure'); } catch (ignored) { /* page may be gone */ }
    return { ok: false, error: String(e.stack || e) };
  }
}

async function runSuite(browser, base, name, out) {
  const started = Date.now();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  try {
    const report = name.startsWith('ui:') ? await runUi(page, base, name, out) : await runInPage(page, base, name, out);
    fs.writeFileSync(path.join(out, fileName(name) + '.json'), JSON.stringify(report, (k, v) =>
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
  const known = allSuites(), suites = o.suite || known;
  const unknown = suites.filter(s => known.indexOf(s) < 0);
  if (unknown.length) throw new Error('Unknown suite(s): ' + unknown.join(', ') + '\nKnown: ' + known.join(', '));
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
  console.log((failed.length ? failed.length + ' of ' + reports.length + ' checks failed' :
    'All ' + reports.length + ' checks passed') + '. Results: ' + out);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch(e => { console.error(e.message || e); process.exitCode = 1; });
