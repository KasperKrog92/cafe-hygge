/* The first evening at home through the real page: entry audio, dialogue
   pause and settings hold, the required desktop planner (focus, no bypass),
   a real window + table selection across a reload, the explicit sleep button,
   then every bedtime stage reloaded, captured, paused and skipped. */
const { resize } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  const enter = () => page.getByRole('button', { name: 'step inside' }).click();
  await t.init('life-browser-init.js');
  await t.open('/?life-test');
  await enter();
  await t.eval(async () => {
    if (!SND.ready()) throw Error('audio did not initialize');
    const w = __world; SIM.skipUnpacking(w); __dev.greetHolger(w);
    w.clockOffset += (21.5 - w.hour) / 24 * SIM._.DAY_SECONDS;
    for (let i = 0; i < 5000 && w.shop.phase !== 'home'; i++) SIM.update(w, .25);
    if (w.shop.phase !== 'home') throw Error('home never arrived');
    window.homeNow = performance.now(); SIM.update(w, .25); lifeTestFrame(homeNow);
    if (document.getElementById('intro-controls').hidden || !document.getElementById('intro-skip').hidden ||
        !document.getElementById('skip-bedtime').hidden) throw Error('home controls');
    document.getElementById('intro-pause').click();
    const before = JSON.stringify(w.memory.life.homeStory); SIM.update(w, 10);
    if (JSON.stringify(w.memory.life.homeStory) !== before) throw Error('pause failed');
    document.getElementById('intro-pause').click();
    document.getElementById('btn-settings').click(); SIM.update(w, 10);
    if (JSON.stringify(w.memory.life.homeStory) !== before) throw Error('settings hold failed');
    document.getElementById('close-settings').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    for (let i = 0; i < 5000 && !SIM.homePlanRequired(w); i++) SIM.update(w, .25);
    lifeTestFrame(homeNow);
    if (!document.getElementById('planner').open || !document.getElementById('buy-plant').hidden ||
        !document.getElementById('buy-fireplace').hidden) throw Error('planner choices');
    if (document.activeElement.id !== 'buy-window') throw Error('planner focus');
    const cancel = new Event('cancel', { cancelable: true }); document.getElementById('planner').dispatchEvent(cancel);
    if (!cancel.defaultPrevented || SIM.goToSleep(w)) throw Error('planner bypass');
  });
  // Let the dialog's opening transition finish before the capture.
  await page.waitForTimeout(1100);
  for (const width of [1440, 1600]) {
    await resize(t, width, 900);
    await t.eval(() => lifeTestFrame(homeNow));
    await t.shot('planner-' + width);
  }
  await page.click('#buy-window');
  await t.eval(() => { if (!document.getElementById('planner').open) throw Error('one click closed plan'); MEMORY.saveNow(); });
  await t.reload();
  await enter();
  await t.eval(() => {
    window.homeNow = performance.now(); lifeTestFrame(homeNow);
    if (!document.getElementById('planner').open || !document.getElementById('buy-window').disabled ||
        document.activeElement.id !== 'buy-table') throw Error('partial planner reload');
  });
  await page.click('#buy-table');
  await t.eval(() => {
    const w = __world;
    if (document.getElementById('planner').open || !w.memory.life.homeStory.planned) throw Error('pair did not finish');
    for (let i = 0; i < 2400; i++) SIM.update(w, .25);
    if (w.shop.phase !== 'home') throw Error('first idle evening left');
    lifeTestFrame(homeNow);
  });
  await page.click('#btn-sleep');
  await t.eval(() => { if (document.getElementById('skip-bedtime').hidden) throw Error('skip unavailable after sleep click'); });
  const saves = await t.eval(() => {
    const saves = {}, w = __world;
    for (let i = 0; i < 4000 && w.shop.phase === 'home'; i++) {
      SIM.update(w, .25); const h = w.memory.life.homeStory;
      if (h.sleepStep >= 0 && w.homeActionTime > 1 && !saves[h.sleepStep]) { SIM._.saveLife(w, 0); saves[h.sleepStep] = MEMORY.codec.encode(w.memory); }
    }
    if (w.shop.phase !== 'dawn') throw Error('bedtime did not finish'); return saves;
  });
  const stages = Object.keys(saves);
  if (stages.length < 5) throw Error('expected five bedtime stages, saw ' + stages.join(','));
  for (const stage of stages) {
    await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, saves[stage]);
    await t.open('/?life-test');
    await t.eval(() => {
      const before = JSON.stringify(__world.memory.life.homeStory); SIM.update(__world, 10);
      if (before !== JSON.stringify(__world.memory.life.homeStory)) throw Error('scene ran under entry overlay');
    });
    await enter();
    await page.waitForFunction("getComputedStyle(document.getElementById('overlay')).opacity === '0'", null, { polling: 100 });
    await t.eval(stage => {
      if (__world.memory.life.homeStory.sleepStep !== stage) throw Error('bedtime cursor lost');
      SIM.update(__world, .01); if (__world.dialogue) __world.dialogue.visible = __world.dialogue.text.length;
      window.homeNow = performance.now(); lifeTestFrame(homeNow);
    }, Number(stage));
    await t.shot('bedtime-' + stage);
    await page.click('#intro-pause');
    await page.click('#skip-bedtime');
    await t.eval(() => {
      const w = __world, h = w.memory.life.homeStory;
      if (w.shop.phase !== 'dawn' || h.sleepStep !== -1 || h.firstNight || w.introPaused || w.dialogue) throw Error('skip left bedtime active');
      if (w.memory.life.projects.window.stage !== 'scheduled' || w.memory.life.projects.table.stage !== 'scheduled') throw Error('skip lost purchases');
      if (!document.getElementById('skip-bedtime').hidden || document.activeElement.id !== 'cafe') throw Error('skip UI did not close');
      const saved = MEMORY.codec.decode(localStorage.getItem('cafe-hygge-save')).state;
      if (saved.life.homeStory.sleepStep !== -1 || saved.life.checkpoint.shop.phase !== 'dawn') throw Error('skip not persisted');
      if (__dev.audit(w).length) throw Error('skip audit failed');
    });
  }
  await t.reload();
  await t.eval(() => { if (__world.shop.phase !== 'dawn' || SIM.homeSceneActive(__world)) throw Error('reload replayed skipped bedtime'); });
  return { bedtimeStages: stages };
};
