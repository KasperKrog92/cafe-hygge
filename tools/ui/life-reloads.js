/* The plant's life across actual page reloads (fixtures from verify-life.js):
   every stage resumes without a second charge or a duplicate plant; the real
   planner, a duplicate click, Escape, the idle/game mode controls and the
   sleep button; the saved morning; and a second tab that waits read-only,
   then takes over when the first tab leaves. */
const fs = require('fs'), path = require('path');

module.exports = async function (t) {
  const page = t.page;
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  const suite = fs.readFileSync(path.join(__dirname, '..', 'verify-life.js'), 'utf8')
    .replace(/^﻿/, '').trim().replace(/;$/, '');
  await t.eval('Promise.resolve(' + suite + ').then(() => true)');
  const saves = await t.eval(() => window.lifeSaves);
  const stages = {};
  for (const stage of ['home-reading', 'purchased', 'scheduled', 'carry', 'unpack', 'place', 'installed']) {
    if (!saves[stage]) throw Error('missing life fixture ' + stage);
    await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, saves[stage]);
    await t.reload();
    stages[stage] = await t.eval(() => {
      const w = __world, l = w.memory.life, stage = l.plant.stage, funds = l.savings, phase = w.shop.phase;
      MEMORY.codec.validate(w.memory);
      const a = __dev.audit(); if (a.length) throw Error(a.join(';'));
      if (phase === 'home') {
        for (let i = 0; i < 1200; i++) SIM.update(w, .25);
        if (w.shop.phase !== 'home') throw Error('reload lost evening wait');
        if (stage !== 'available' && !SIM.goToSleep(w)) throw Error('reload sleep failed');
      }
      if (stage !== 'available') {
        for (let i = 0; i < 6000 && !(w.shop.phase === 'open' && l.plant.stage === 'installed'); i++) SIM.update(w, .25);
        if (l.plant.stage !== 'installed' || w.shop.phase !== 'open') throw Error('not installed after reload');
        if (l.savings !== funds) throw Error('charged again');
        if (SCENE.plantDrawables(w).length !== 1) throw Error('duplicate plant');
      }
      return { stage, phase, funds, installed: l.plant.stage === 'installed' };
    });
  }
  await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, saves['home-reading']);
  await t.reload();
  await t.eval(() => { document.getElementById('enter').click(); lifeTestFrame(performance.now()); });
  await page.getByRole('button', { name: 'evening plan' }).click();
  await t.eval(() => lifeTestFrame(performance.now()));
  await t.shot('evening-planner');
  await page.getByRole('button', { name: 'A plant by the window, 30 coins' }).click();
  await t.eval(() => {
    const s = __world.memory.life.savings; document.getElementById('buy-plant').click();
    if (s !== __world.memory.life.savings) throw Error('double charge'); lifeTestFrame(performance.now());
  });
  await page.keyboard.press('Escape');
  await t.eval(() => {
    if (__world.plannerOpen) throw Error('planner stuck');
    SIM.setMode(__world, 'idle'); lifeTestFrame(performance.now());
    if (!document.getElementById('btn-plan').hidden) throw Error('idle controls');
  });
  await t.eval(() => {
    SIM.setMode(__world, 'game'); for (let i = 0; i < 1200; i++) SIM.update(__world, .25);
    if (__world.shop.phase !== 'home') throw Error('closed notebook advanced day'); lifeTestFrame(performance.now());
  });
  await page.mouse.move(700, 700);
  await t.shot('go-to-sleep');
  await page.getByRole('button', { name: 'go to sleep' }).click();
  await t.eval(() => {
    const w = __world;
    if (w.shop.phase !== 'home' || w.memory.life.homeStory.sleepStep < 0) throw Error('sleep did not begin bedtime');
    for (let n = 0; n < 1200 && w.shop.phase === 'home'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'dawn' || Math.abs(w.hour - 7.5) > 1e-8) throw Error('bedtime did not reach morning');
    lifeTestFrame(performance.now());
    if (!document.getElementById('btn-sleep').hidden) throw Error('sleep visible in cafe');
  });
  await t.reload();
  await t.eval(() => {
    if (__world.shop.phase !== 'dawn') throw Error('sleep not persisted');
    SIM.update(__world, 2); if (__world.shop.phase !== 'entering') throw Error('morning entrance missing');
  });
  // A second tab waits read-only behind the first tab's lock, then takes over.
  const second = await page.context().newPage();
  const secondErrors = [];
  second.on('pageerror', e => secondErrors.push(String(e.stack || e)));
  await second.goto(new URL('/?life-test', page.url()).href);
  await second.waitForFunction(() => document.getElementById('enter').disabled, null, { timeout: 5000, polling: 100 });
  await second.evaluate(() => {
    if (window.__world) throw Error('second writer');
    MEMORY.state.life.savings = 777; MEMORY.saveNow();
    if (JSON.parse(localStorage.getItem('cafe-hygge-save')).life.savings === 777) throw Error('waiting tab overwrote active save');
  });
  await page.goto('about:blank');
  await second.waitForFunction('!!window.__world', null, { timeout: 30000, polling: 100 });
  await second.evaluate(() => { if (__world.memory.life.plant.stage !== 'scheduled') throw Error('takeover lost scheduled purchase'); });
  if (secondErrors.length) throw Error('Second tab errors: ' + secondErrors.join('\n'));
  return { stages };
};
