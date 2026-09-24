/* Supper at home through real reloads: every saved dinner cursor from
   verify-dinner.js survives a page reload without moving Nora, the entry fade
   finishes, and the cooking/eating stages are captured at 16:10 / 16:9 before
   the actual sleep button interrupts supper. */
const fs = require('fs'), path = require('path');
const { resize } = require('./lib/capture.js');

module.exports = async function (t) {
  const page = t.page;
  await t.init('life-browser-init.js');
  await t.open('/?life-test');
  const suite = fs.readFileSync(path.join(__dirname, '..', 'verify-dinner.js'), 'utf8')
    .replace(/^﻿/, '').trim().replace(/;$/, '');
  await t.eval('Promise.resolve(' + suite + ').then(() => true)');
  const saves = await t.eval(() => window.dinnerSaves);
  const results = {};
  for (const name of Object.keys(saves)) {
    const raw = saves[name];
    await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, raw);
    await t.reload();
    results[name] = await t.eval(raw => {
      const expected = JSON.parse(raw), w = __world;
      if (JSON.stringify(w.memory.life.homeDinner) !== JSON.stringify(expected.life.homeDinner)) throw Error('dinner cursor lost');
      const p = expected.life.checkpoint.nora;
      if (Math.hypot(w.barista.x - p.x, w.barista.y - p.y) > .001) throw Error('reload moved her');
      if (__dev.audit(w).length) throw Error('reload audit');
      window.dinnerNow = performance.now(); lifeTestFrame(dinnerNow);
      return { time: w.memory.life.homeDinner.time, pose: w.barista.pose, lit: SCENE.homeKitchenLit(w) };
    }, raw);
    await page.getByRole('button', { name: 'step inside' }).click();
    // life-browser-init.js stubs requestAnimationFrame, so poll on a timer:
    // Playwright's default 'raf' polling would never re-check (and would
    // replace window.lifeTestFrame with its own callback).
    await page.waitForFunction("getComputedStyle(document.getElementById('overlay')).opacity === '0'", null, { polling: 100 });
    await t.eval(() => lifeTestFrame(dinnerNow));
    if (name === '0-supperPrep' || name === '1-supperEat') {
      for (const width of [1440, 1600]) {
        await resize(t, width, 900);
        await t.eval(() => lifeTestFrame(dinnerNow));
        await t.shot(name + '-' + width);
      }
      await page.click('#btn-sleep');
      await t.eval(() => { if (!SIM.homeBedtimeActive(__world)) throw Error('sleep did not interrupt supper'); });
    }
  }
  if (!results['0-supperPrep'] || !results['1-supperEat']) throw Error('dinner fixtures missing: ' + Object.keys(saves));
  return { reloads: results };
};
