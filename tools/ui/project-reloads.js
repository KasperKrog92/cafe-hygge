/* Improvement jobs across actual page reloads: every saved fixture from
   verify-projects.js, verify-c0.js and verify-first-opening.js reloads with
   its layout, jobs and balance intact, then resumes to completion without a
   second charge or duplicated seating; plus genuine planner clicks (and a
   duplicate click) for the table and the fireplace. */
const fs = require('fs'), path = require('path');

function suite(name) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'verify-' + name + '.js'), 'utf8')
    .replace(/^﻿/, '').trim().replace(/;$/, '');
  return 'Promise.resolve(' + code + ').then(() => true)';
}

module.exports = async function (t) {
  const page = t.page;
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(suite('projects'));
  await t.eval(suite('c0'));
  await t.eval(suite('first-opening'));
  const saves = await t.eval(() => Object.assign({}, window.projectSaves, window.c0Saves, window.firstSaves));
  const fixtures = {};
  for (const name of Object.keys(saves)) {
    const raw = saves[name];
    await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, raw);
    await t.reload();
    await t.eval(raw => {
      const old = JSON.parse(raw).life, l = __world.memory.life;
      if (JSON.stringify(l.projects) !== JSON.stringify(old.projects) || JSON.stringify(l.furniture) !== JSON.stringify(old.furniture) ||
          JSON.stringify(l.plant) !== JSON.stringify(old.plant) || l.savings !== old.savings) throw Error('reload changed layout, jobs or balance');
    }, raw);
    fixtures[name] = await t.eval(() => {
      const w = __world, l = w.memory.life, initial = JSON.parse(JSON.stringify(l.projects));
      const before = l.savings, plant = l.plant.stage, layout = JSON.stringify(l.furniture), settling = l.firstOpening.step < 12;
      SIM.setMode(w, 'idle'); SIM.setMode(w, 'game'); SIM.setMode(w, 'idle');
      if (l.savings !== before) throw Error('mode charged');
      let funds = l.savings;
      for (let i = 0; i < 28000; i++) {
        SIM.update(w, .25);
        if (l.savings < funds) throw Error('charged while resuming'); funds = l.savings;
        if (l.firstOpening.step === 12 && (plant === 'available' || l.plant.stage === 'installed') &&
            Object.keys(initial).every(id => initial[id].stage === 'available' || l.projects[id].stage === 'installed')) break;
      }
      Object.keys(initial).forEach(id => {
        if (initial[id].stage === 'available' ? l.projects[id].stage !== 'available' : l.projects[id].stage !== 'installed')
          throw Error('resumption failed ' + id);
      });
      if (plant !== 'available' && l.plant.stage !== 'installed') throw Error('plant did not resume');
      if (!settling && JSON.stringify(l.furniture) !== layout) throw Error('room changed on resume');
      if (l.firstOpening.step !== 12) throw Error('first opening did not resume');
      if (settling && (w.tables.length !== 2 || w.seats.length !== 4)) throw Error('first opening duplicated seating');
      const installed = l.projects.table.stage === 'installed';
      if (w.tables.filter(t => t.project === 'table').length !== (installed ? 1 : 0) ||
          w.seats.filter(s => s.project === 'table').length !== (installed ? 2 : 0)) throw Error('duplicate table or seats');
      MEMORY.codec.validate(w.memory);
      const a = __dev.audit(); if (a.length) throw Error(a.join(';'));
      return { before, after: funds, projects: l.projects };
    });
  }
  if (!saves['table-purchased']) throw Error('missing table-purchased fixture: ' + Object.keys(saves).join(','));
  // Genuine planner clicks for each new choice, using the same waiting evening.
  for (const id of ['table', 'fireplace']) {
    await t.eval(raw => {
      const s = JSON.parse(raw); s.life.projects.table = { stage: 'available', step: 0, time: 0 };
      s.life.plannedTonight = false; s.life.savings = 180; MEMORY.state = s; MEMORY.saveNow();
    }, saves['table-purchased']);
    await t.reload();
    await t.eval(() => { document.getElementById('enter').click(); lifeTestFrame(performance.now()); });
    await page.getByRole('button', { name: 'evening plan' }).click();
    await t.eval(() => lifeTestFrame(performance.now()));
    if (id === 'fireplace') {
      const box = await page.locator('#planner').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 300);
    }
    await t.shot('planner-' + id);
    await page.click('#buy-' + id);
    await t.eval(id => {
      const w = __world, l = w.memory.life;
      if (l.projects[id].stage !== 'purchased' || l.savings !== 180 - SIM.projects[id].price)
        throw Error('UI purchase ' + JSON.stringify({ life: l, phase: w.shop.phase, planner: w.plannerOpen }));
      document.getElementById('buy-' + id).click();
      if (l.savings !== 180 - SIM.projects[id].price) throw Error('duplicate UI charge');
    }, id);
    await page.keyboard.press('Escape');
  }
  return { fixtures: Object.keys(fixtures), results: fixtures };
};
