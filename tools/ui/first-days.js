/* The first days through the real page: Holger's mandatory, blinking
   invitation holds the tutorial still across a reload; the actual dialogue,
   planner and sleep buttons drive the paired window + table purchase; four
   exact repair reloads; the installed result survives a reload and is
   captured at 16:10 / 16:9. */
const { resize } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function click(selector) {
    try { await page.click(selector, { timeout: 10000 }); }
    catch (e) {
      const state = await t.eval(() => ({ phase: __world.shop.phase, mode: __world.memory.life.mode,
        controls: document.getElementById('controls').outerHTML, active: document.activeElement.id }));
      throw Error('Click failed: ' + selector + '\n' + JSON.stringify(state) + '\n' + e.message);
    }
  }
  // Dev URLs still need the first real click to enable audio and the control
  // bar. A raw click at the canvas centre: after the first-evening reload the
  // required planner is already a modal, so the click lands on its backdrop.
  async function reload() {
    await t.reload();
    const box = await page.locator('#cafe').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (!(await t.eval(() => SND.ready()))) throw Error('first click did not enter the café');
  }
  async function frame() {
    await t.eval(() => {
      window.uiNow = performance.now(); lifeTestFrame(uiNow);
      if (__world.shop.phase === 'home') document.getElementById('btn-settings').focus();
    });
  }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await resize(t, 1440, 900);
  await t.eval(() => {
    const w = __world; SIM.skipUnpacking(w);
    for (let n = 0; n < 2000 && !SIM.holgerAvailable(w); n++) SIM.update(w, .25);
    if (!SIM.holgerAvailable(w)) throw Error('no invitation');
    const p = w.patrons[0], time = w.t, hour = w.hour;
    p.animT = 0; const bright = SIM.entityDrawables(w).bubbles.find(b => b.icon === 'dots').alpha;
    SIM.update(w, 1); const dim = SIM.entityDrawables(w).bubbles.find(b => b.icon === 'dots').alpha;
    if (bright - dim < .5) throw Error('invitation not blinking');
    for (let n = 0; n < 2400; n++) SIM.update(w, .25);
    if (w.t !== time || w.hour !== hour || p.state !== 'ordering' || w.patrons.length !== 1) throw Error('unattended tutorial escaped');
    w.reducedMotion = true;
    if (SIM.entityDrawables(w).bubbles.find(b => b.icon === 'dots').alpha !== 1) throw Error('reduced motion');
    MEMORY.saveNow();
  });
  await reload();
  await frame();
  await t.eval(() => { if (__world.patrons[0].state !== 'ordering' || !SIM.holgerRequired(__world)) throw Error('greeting reload'); });
  await t.shot('holger-waiting');
  await click('#meet-holger');
  await t.eval(() => { if (!__world.moment || !__world.memory.flags['holger-invitation-opened']) throw Error('invitation click'); });
  await click('#conversation-later');
  await t.eval(() => {
    if (SIM.entityDrawables(__world).bubbles.find(b => b.icon === 'dots').alpha !== 1) throw Error('blink continued after click');
  });
  await click('#meet-holger');
  // Every line and both choices are advanced through the actual dialogue buttons.
  for (let n = 0; n < 100; n++) {
    if (!(await t.eval(() => !!__world.moment))) break;
    await t.eval(() => { if (__world.moment.phase === 'talk') SIM.advanceMoment(__world); lifeTestFrame(uiNow += 10); });
    if (!(await t.eval(() => !!__world.moment))) break;
    await click('#conversation-answers button:first-child');
  }
  await t.eval(() => {
    const w = __world; if (SIM.holgerRequired(w) || w.moment) throw Error('dialogue unfinished');
    SIM.setMode(w, 'game'); for (let n = 0; n < 6000 && w.shop.phase !== 'home'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'home' || w.memory.life.savings < 90) throw Error('first evening funds');
    // The first evening's apartment tour ends at the PC, where the planner
    // opens by itself (tools/ui/home.js covers the tour and planner in detail).
    for (let n = 0; n < 5000 && !SIM.homePlanRequired(w); n++) SIM.update(w, .25);
    if (!SIM.homePlanRequired(w)) throw Error('first evening planner never required');
    window.firstFunds = w.memory.life.savings; MEMORY.saveNow(); lifeTestFrame(uiNow += 10);
    if (!document.getElementById('planner').open) throw Error('required planner did not open');
  });
  const funds = await t.eval(() => __world.memory.life.savings);
  // The conversation camera eases back out by real elapsed time.
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(100); await frame(); }
  await t.shot('first-evening');
  await click('#buy-window');
  await t.eval(() => { if (document.getElementById('buy-table').disabled) throw Error('table locked after window'); MEMORY.saveNow(); });
  await reload();
  await frame();
  await t.eval(() => { if (!document.getElementById('planner').open) throw Error('required planner lost on reload'); });
  await click('#buy-table');
  await t.eval(funds => {
    const p = __world.memory.life.projects;
    if (__world.memory.life.savings !== funds - 90 || p.window.stage !== 'purchased' || p.table.stage !== 'purchased') throw Error('paired debit');
    // The completed pair closes the required planner by itself.
    if (document.getElementById('planner').open || !__world.memory.life.homeStory.planned) throw Error('pair did not close the planner');
  }, funds);
  await frame();
  await click('#btn-sleep');
  const reloads = [];
  for (let step = 0; step <= 3; step++) {
    const before = await t.eval(step => {
      const w = __world, p = w.memory.life.projects.window;
      for (let n = 0; n < 6000 && !(p.stage === 'working' && p.step === step && p.time >= 4); n++) SIM.update(w, .25);
      if (p.stage !== 'working' || p.step !== step) throw Error('repair stage ' + JSON.stringify(p));
      MEMORY.saveNow(); return { project: JSON.stringify(p), savings: w.memory.life.savings };
    }, step);
    await reload();
    const after = await t.eval(() => ({ project: JSON.stringify(__world.memory.life.projects.window), savings: __world.memory.life.savings }));
    if (before.project !== after.project || before.savings !== after.savings)
      throw Error('Repair reload changed progress or funds: ' + JSON.stringify([before, after]));
    reloads.push(after);
  }
  await t.eval(() => {
    const w = __world;
    for (let n = 0; n < 6500 && !(w.memory.life.projects.window.stage === 'installed' &&
      w.memory.life.projects.table.stage === 'installed' && !w.windowWorker); n++) SIM.update(w, .25);
    if (w.seats.length !== 6 || !SCENE.windowOpen(w, SCENE.L.win) || SCENE.windowOpen(w, SCENE.L.win2)) throw Error('installed result');
    if (__dev.audit().length) throw Error('final audit'); MEMORY.saveNow();
  });
  await reload();
  await t.eval(() => {
    if (__world.seats.length !== 6 || !SCENE.windowOpen(__world, SCENE.L.win) || SIM.holgerRequired(__world)) throw Error('installed reload');
  });
  for (const width of [1440, 1600]) {
    await resize(t, width, 900);
    await frame();
    await t.shot('improved-' + width);
  }
  return { funds, reloads };
};
