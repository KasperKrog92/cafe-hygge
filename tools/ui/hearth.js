/* The hearth through the real page: Gerda's saved addition, the actual unlock,
   30-coin reopening and 40-coin mantel purchases with retained balances, the
   sleep button, seven exact work reloads, 16:10 / 16:9 captures and zero audits. */
const { resize, settle } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function reload() { await t.reload(); await page.click('#cafe'); }
  async function capture(name) {
    await settle(t);
    for (const width of [1440, 1600]) {
      await resize(t, width, 900);
      await t.eval(() => lifeTestFrame(performance.now()));
      await t.shot(name + '-' + width);
    }
  }
  async function talk() {
    await t.eval(() => {
      const w = __world; w.spawnT = 1e8;
      Object.values(w.regulars).forEach(r => { r.lastDay = SIM._.dayIndex(w); r.force = false; });
      w.regulars.gerda.force = true; SIM._.updateRegulars(w);
      for (let n = 0; n < 2400 && !SIM.gerdaAvailable(w); n++) SIM.update(w, .25);
      if (!SIM.gerdaAvailable(w)) throw Error('missing Gerda'); lifeTestFrame(performance.now());
    });
    await page.click('#meet-gerda');
    await t.eval(() => {
      const w = __world; for (let n = 0; n < 2400 && w.moment.phase !== 'talk'; n++) SIM.update(w, .25);
      w.moment.visible = 999; lifeTestFrame(performance.now());
    });
  }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(() => {
    const w = __dev.modestWorld(); w.memory.life.daysCompleted = 2; w.memory.life.mode = 'game'; w.memory.life.hour = 9;
    w.memory.life.savings = 200; w.memory.life.projects.window = { stage: 'installed', step: 4, time: 0 };
    w.memory.flags['gerda-introduced'] = true;
    MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
  });
  await reload();
  await capture('boarded');
  await talk();
  await t.eval(() => { if (__world.moment.memoryPrefix !== 'gerda-hearth-') throw Error('old intro not recognized'); });
  await capture('gerda-hope');
  await page.click('#conversation-answers button:first-child');
  await t.eval(() => MEMORY.saveNow());
  await reload();
  await talk();
  await t.eval(() => { if (__world.moment.index !== 1 || __world.memory.flags['fireplace-unlocked']) throw Error('hearth cursor/unlock'); });
  await page.click('#conversation-answers button:first-child');
  await t.eval(() => {
    const w = __world; for (let n = 0; n < 2400 && w.moment; n++) SIM.update(w, .25);
    if (!w.memory.flags['fireplace-unlocked']) throw Error('no unlock');
  });
  const balances = {};
  for (const id of ['fireplace', 'mantel']) {
    await t.eval(() => {
      const w = __world; w.clockOffset += (21.5 - w.hour) / 24 * SIM._.DAY_SECONDS;
      for (let n = 0; n < 6000 && w.shop.phase !== 'home'; n++) SIM.update(w, .25);
      if (w.shop.phase !== 'home') throw Error('no evening'); SIM.plan(w, true); lifeTestFrame(performance.now());
    });
    if (id === 'fireplace') {
      await t.eval(() => {
        if (!document.getElementById('buy-mantel').hidden || document.getElementById('buy-fireplace').hidden) throw Error('purchase order UI');
      });
    }
    await capture(id + '-plan');
    const expected = (await t.eval(() => __world.memory.life.savings)) - (id === 'fireplace' ? 30 : 40);
    await page.click('#buy-' + id);
    await t.eval(o => {
      if (__world.memory.life.projects[o.id].stage !== 'purchased' || __world.memory.life.savings !== o.expected) throw Error('purchase');
      MEMORY.saveNow();
    }, { id, expected });
    await reload();
    await t.eval(expected => {
      if (__world.memory.life.savings !== expected) throw Error('balance lost'); lifeTestFrame(performance.now());
    }, expected);
    balances[id] = expected;
    await page.click('#btn-sleep');
    await t.eval(() => {
      const w = __world; for (let n = 0; n < 6000 && w.shop.phase !== 'open'; n++) SIM.update(w, .25);
      if (w.shop.phase !== 'open') throw Error('no morning'); w.spawnT = 1e8;
    });
    const steps = id === 'fireplace' ? 4 : 3;
    for (let step = 0; step < steps; step++) {
      await t.eval(o => {
        const w = __world, job = () => w.memory.life.projects[o.id]; w.spawnT = 1e8;
        for (let n = 0; n < 6000 && !(job().step === o.step && job().time >= 6); n++) SIM.update(w, .25);
        if (job().step !== o.step) throw Error('missed work'); SIM._.commitLife(w); lifeTestFrame(performance.now());
      }, { id, step });
      if (step === 1) await capture(id + '-work');
      const before = await t.eval(id => JSON.stringify(__world.memory.life.projects[id]), id);
      await reload();
      const after = await t.eval(id => JSON.stringify(__world.memory.life.projects[id]), id);
      if (before !== after) throw Error('Actual reload lost ' + id + '/' + step + ': ' + before + ' → ' + after);
    }
    await t.eval(id => {
      const w = __world; w.spawnT = 1e8;
      for (let n = 0; n < 6000 && (w.memory.life.projects[id].stage !== 'installed' || w.windowWorker); n++) SIM.update(w, .25);
      if (w.memory.life.projects[id].stage !== 'installed' || __dev.audit().length) throw Error('completion/audit');
      lifeTestFrame(performance.now());
    }, id);
    if (id === 'fireplace') {
      await t.eval(() => {
        if (SCENE.mantelShelf(__world) || SCENE.fireplaceBoards(__world) || SCENE.hearthWork(__world)) throw Error('bare working fire');
      });
    } else {
      await t.eval(() => { if (!SCENE.hasFurniture(__world, 'mantel-decor')) throw Error('missing later decoration'); });
    }
    await capture(id + '-installed');
  }
  return { balances };
};
