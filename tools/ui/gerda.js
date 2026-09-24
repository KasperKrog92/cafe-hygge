/* Gerda's window seat through the real page: invitation, choice and planner
   clicks, the chosen reply surviving a reload, four exact assembly reloads,
   the first pillow surviving a reload, the thank-you cursor, 16:10 / 16:9
   captures and zero audits. */
const { resize, settle } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function reload() { await t.reload(); await page.click('#cafe'); }
  async function invite() {
    await t.eval(() => {
      const w = __world; w.spawnT = 1e8;
      Object.values(w.regulars).forEach(r => { r.lastDay = SIM._.dayIndex(w); r.force = false; });
      w.regulars.gerda.force = true; SIM._.updateRegulars(w);
      for (let n = 0; n < 2400 && !SIM.gerdaAvailable(w); n++) SIM.update(w, .25);
      if (!SIM.gerdaAvailable(w)) throw Error('missing invitation'); lifeTestFrame(performance.now());
    });
    await page.click('#meet-gerda');
    await t.eval(() => {
      for (let n = 0; n < 2000 && __world.moment.phase !== 'talk'; n++) SIM.update(__world, .25);
      if (__world.moment.phase !== 'talk') throw Error('no conversation');
    });
  }
  async function capture(name) {
    await settle(t);
    for (const width of [1440, 1600]) {
      await resize(t, width, 900);
      await t.eval(() => lifeTestFrame(performance.now()));
      await t.shot(name + '-' + width);
    }
  }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(() => {
    const w = __dev.modestWorld(); w.memory.life.daysCompleted = 2; w.memory.life.mode = 'game'; w.memory.life.hour = 9;
    w.memory.life.projects.window = { stage: 'installed', step: 4, time: 0 };
    MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
  });
  await reload();
  await invite();
  await t.eval(() => {
    const w = __world;
    while (!SIM.momentLine(w).choices) { w.moment.visible = 999; SIM.advanceMoment(w); }
    w.moment.visible = 999; lifeTestFrame(performance.now());
  });
  await capture('pillow-offer');
  await page.click('#conversation-answers button:first-child');
  await t.eval(() => {
    if (!__world.memory.flags['gerda-hello-yes'] || __world.memory.flags['gerda-pillows-accepted']) throw Error('choice/unlock boundary');
    MEMORY.saveNow();
  });
  await reload();
  await invite();
  await t.eval(() => {
    const line = SIM.momentLine(__world);
    if (line.speaker !== 'Gerda' || line.text !== CAST.gerdaWindow.hello.find(l => l.choices).choices[0].reply) throw Error('chosen reply lost');
    __world.moment.visible = 999; lifeTestFrame(performance.now());
  });
  await page.click('#conversation-answers button:first-child');
  await t.eval(() => { __world.moment.visible = 999; lifeTestFrame(performance.now()); });
  await page.click('#conversation-answers button:first-child');
  await t.eval(() => {
    const w = __world; for (let n = 0; n < 2000 && w.moment; n++) SIM.update(w, .25);
    if (!w.memory.flags['gerda-pillows-accepted']) throw Error('no unlock'); w.memory.life.savings = 150;
    w.clockOffset += (21.5 - w.hour) / 24 * SIM._.DAY_SECONDS;
    for (let n = 0; n < 6000 && w.shop.phase !== 'home'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'home') throw Error('no evening'); SIM.plan(w, true); lifeTestFrame(performance.now());
  });
  await capture('planner');
  await page.click('#buy-windowSeat');
  const balance = await t.eval(() => {
    if (__world.memory.life.projects.windowSeat.stage !== 'purchased') throw Error('no purchase');
    MEMORY.saveNow(); return __world.memory.life.savings;
  });
  await reload();
  await t.eval(balance => {
    if (__world.memory.life.savings !== balance || __world.memory.life.projects.windowSeat.stage !== 'purchased') throw Error('purchase reload');
    lifeTestFrame(performance.now());
  }, balance);
  await page.click('#btn-sleep');
  await t.eval(() => {
    const w = __world; for (let n = 0; n < 6000 && w.shop.phase !== 'open'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'open') throw Error('no next morning'); w.spawnT = 1e8;
  });
  for (let step = 0; step < 4; step++) {
    await t.eval(step => {
      const w = __world, job = () => w.memory.life.projects.windowSeat; w.spawnT = 1e8;
      for (let n = 0; n < 6000 && !(job().step === step && job().time >= 3); n++) SIM.update(w, .25);
      if (job().step !== step) throw Error('missed work'); SIM._.commitLife(w);
    }, step);
    const before = await t.eval(() => JSON.stringify(__world.memory.life.projects.windowSeat));
    await reload();
    const after = await t.eval(() => JSON.stringify(__world.memory.life.projects.windowSeat));
    if (before !== after) throw Error('Actual reload lost seat work: ' + before + ' → ' + after);
  }
  await t.eval(() => {
    const w = __world; w.spawnT = 1e8;
    for (let n = 0; n < 6000 && w.memory.life.projects.windowSeat.stage !== 'installed'; n++) SIM.update(w, .25);
    Object.values(w.regulars).forEach(r => { r.lastDay = SIM._.dayIndex(w); r.force = false; }); SIM._.updateRegulars(w);
    for (let n = 0; n < 2000 && !w.memory.flags['gerda-pillow-left']; n++) SIM.update(w, .25);
    if (!w.memory.flags['gerda-pillow-left'] || w.memory.flags['gerda-pillow-right']) throw Error('first placement boundary');
    MEMORY.saveNow();
  });
  await reload();
  await t.eval(() => { if (!__world.memory.flags['gerda-pillow-left'] || __world.memory.flags['gerda-pillow-right']) throw Error('gift reload'); });
  await invite();
  await t.eval(() => {
    const w = __world; for (let n = 0; n < 6; n++) { w.moment.visible = 999; SIM.advanceMoment(w); }
    w.moment.visible = 999; lifeTestFrame(performance.now());
  });
  await capture('warm-window');
  await t.eval(() => MEMORY.saveNow());
  await reload();
  await invite();
  await t.eval(() => {
    const w = __world; if (w.moment.index !== 6) throw Error('thanks cursor');
    while (w.moment.phase === 'talk') { w.moment.visible = 999; SIM.advanceMoment(w); }
    for (let n = 0; n < 2000 && w.moment; n++) SIM.update(w, .25);
    if (!w.memory.flags['gerda-window-thanked'] || __dev.audit().length) throw Error('completion/audit');
  });
  return { balance };
};
