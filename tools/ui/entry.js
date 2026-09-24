/* The normal (non-dev) entry: setup waits behind the splash, the real
   'step inside' click starts audio, then one cappuccino order runs in real
   time (the point of this check) through steam, payment and a seated guest.
   Ends with a night audit and capture. */
module.exports = async function (t) {
  await t.open('/');
  await t.eval(() => {
    const w = __world;
    if (w.firstEntryReady || w.memory.life.firstOpening.step !== 0) throw Error('setup started behind splash');
    const before = JSON.stringify(w.memory); SIM.update(w, 60);
    if (before !== JSON.stringify(w.memory)) throw Error('splash advanced setup');
  });
  await t.page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(() => {
    if (!SND.ready()) throw Error('audio not initialized');
    if (!__world.firstEntryReady) throw Error('entry did not release setup');
    for (let i = 0; i < 5000 && __world.shop.phase === 'settling'; i++) SIM.update(__world, .25);
    if (__world.shop.phase !== 'open' || __world.tables.length !== 2) throw Error('first setup failed');
    __dev.greetHolger(__world);
    __world.spawnT = 999;
    __dev.spawn({ drink: 'cappuccino', wantsBook: false, ownBook: true });
    const p = __world.patrons[__world.patrons.length - 1], w = __world;
    window.entrySmoke = { states: [], brew: [], start: performance.now(), funds: w.memory.life.savings, done: false };
    const timer = setInterval(() => {
      const s = entrySmoke;
      if (!s.states.includes(p.state)) s.states.push(p.state);
      const step = w.barista.steps && w.barista.steps[w.barista.stepIdx];
      if (w.barista.state === 'prepping' && step && !s.brew.includes(step.act)) s.brew.push(step.act);
      if (p.state === 'seated' || p.state === 'terraceSeated') {
        s.done = true; s.seconds = (performance.now() - s.start) / 1000;
        s.earned = w.memory.life.savings - s.funds; clearInterval(timer);
      }
    }, 100);
  });
  // Real time: the page's own animation loop serves the order (up to two minutes).
  await t.page.waitForFunction('window.entrySmoke.done', null, { timeout: 120000, polling: 500 });
  const result = await t.eval(() => window.entrySmoke);
  if (result.earned < 1 || result.brew.indexOf('steam') < 0)
    throw Error('Order did not complete with earnings and steam: ' + JSON.stringify(result));
  await t.eval(() => { __dev.hour(20); const a = __dev.audit(); if (a.length) throw Error(a.join(';')); });
  await t.eval(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await t.shot('night');
  return { order: result };
};
