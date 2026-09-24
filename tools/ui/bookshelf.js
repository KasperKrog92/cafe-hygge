/* Keira's bookshelf: an actual planner purchase, a retained balance across a
   reload, then eight exact job phases each surviving two real reloads, with
   16:10 / 16:9 captures of the work and the installed shelf. */
const { resize } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function reload() { await t.reload(); await page.click('#cafe'); }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(() => {
    const w = __dev.modestWorld(); SIM.setMode(w, 'game'); w.memory.life.savings = 150;
    w.clockOffset += (21.5 - w.hour) / 24 * SIM._.DAY_SECONDS;
    for (let n = 0; n < 10000 && w.shop.phase !== 'home'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'home') throw Error('no home'); SIM._.saveLife(w, 0);
    MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
  });
  await reload();
  const expected = (await t.eval(() => __world.memory.life.savings)) - 40;
  await t.eval(() => { SIM.plan(__world, true); lifeTestFrame(performance.now()); });
  await page.click('#buy-bookshelf');
  const check = expected => {
    if (__world.memory.life.projects.bookshelf.stage !== 'purchased' || __world.memory.life.savings !== expected)
      throw Error('purchase ' + JSON.stringify(__world.memory.life.projects.bookshelf) + ' ' + __world.memory.life.savings);
    MEMORY.saveNow();
  };
  await t.eval(check, expected);
  await reload();
  await t.eval(check, expected);
  const phases = ['scheduled', 'arrived', 'working-0', 'working-1', 'working-2', 'working-3', 'working-4', 'installed'];
  for (const phase of phases) {
    const stage = phase.split('-')[0];
    const step = stage === 'installed' ? 5 : stage === 'working' ? Number(phase.split('-')[1]) : 0;
    const time = stage === 'working' ? 4.5 : 0;
    await t.eval(o => {
      const w = __dev.modestWorld(); w.memory.life.daysCompleted = 2; w.memory.life.mode = 'game';
      w.memory.life.projects.bookshelf = { stage: o.stage, step: o.step, time: o.time };
      w.memory.flags['keira-introduced'] = true;
      MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
    }, { stage, step, time });
    await reload();
    const before = await t.eval(() => JSON.stringify(__world.memory.life.projects.bookshelf));
    await t.eval(() => { SIM._.commitLife(__world); });
    await reload();
    const after = await t.eval(() => JSON.stringify(__world.memory.life.projects.bookshelf));
    if (before !== after) throw Error('Actual reload lost ' + phase + ': ' + before + ' → ' + after);
    await t.eval(stage => {
      SIM.update(__world, .25);
      if (stage !== 'scheduled' && __world.shelfVisitor && __world.shelfVisitor.shelfParcel) throw Error('duplicate shelf');
      const a = __dev.audit(); if (a.length) throw Error('audit ' + a.join(';'));
    }, stage);
    if (stage === 'working') {
      await t.eval(() => {
        for (let n = 0; n < 5000 && (!__world.shelfVisitor || __world.shelfVisitor.state !== 'working'); n++) SIM.update(__world, .25);
        lifeTestFrame(performance.now());
      });
    }
    if (stage === 'installed' || phase === 'working-1') {
      for (const width of [1440, 1600]) {
        await resize(t, width, 900);
        await t.eval(() => lifeTestFrame(performance.now()));
        await t.shot(phase + '-' + width);
      }
    }
  }
  return { expected, phases };
};
