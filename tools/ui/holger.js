/* Holger beyond the first click (tools/ui/first-hello.js covers that): the
   first choice at desktop sizes, a chosen-but-unacknowledged reply surviving
   an actual reload at the counter, and in an established café the real
   invitation accepted mid-drink: it waits for the drink, then talks while
   the queue keeps moving behind the conversation, and Escape leaves. */
const { resize } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  // The conversation camera eases by real elapsed time (performance.now in
  // render), so these frames are spaced in real time.
  async function settleCamera(frames) {
    for (let i = 0; i < frames; i++) {
      await page.waitForTimeout(100);
      await t.eval(() => lifeTestFrame(uiNow += 100));
    }
  }
  await t.init('life-browser-init.js');
  await t.open('/?life-test');
  await page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(() => {
    const w = __world; SIM.skipIntro(w); for (let n = 0; n < 8000 && w.shop.phase === 'settling'; n++) SIM.update(w, .25);
    for (let n = 0; n < 1000 && !SIM.holgerAvailable(w); n++) SIM.update(w, .1);
    window.uiNow = performance.now(); lifeTestFrame(uiNow);
    if (!SIM.holgerAvailable(w)) throw Error('Holger never waited at the counter');
  });
  await page.click('#meet-holger');
  await t.eval(() => {
    const w = __world;
    for (let n = 0; n < 3000 && w.moment.index < 6; n++) { if (w.moment.phase === 'talk') SIM.advanceMoment(w); else SIM.update(w, .05); }
    if (w.moment.index !== 6) throw Error('choice not reached'); lifeTestFrame(uiNow += 2000);
  });
  await resize(t, 1440, 900);
  await settleCamera(10);
  await t.shot('choice');
  await resize(t, 1600, 900);
  await t.eval(() => lifeTestFrame(uiNow += 100));
  await t.shot('choice-wide');
  await page.click('#conversation-answers button:first-child');
  // Reload at a chosen-but-unacknowledged reply.
  await t.eval(() => {
    if (!__world.memory.flags[CAST.holgerIntroduction[6].choices[0].flag]) throw Error('choice not recorded');
    MEMORY.saveNow();
  });
  await t.reload();
  await page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(() => {
    const w = __world; window.uiNow = performance.now(); lifeTestFrame(uiNow);
    document.getElementById('meet-holger').click();
    if (w.patrons[0].state !== 'ordering' || w.moment.phase !== 'talk') throw Error('mandatory hello did not return to counter');
    SIM.advanceMoment(w); lifeTestFrame(uiNow += 50);
  });
  await settleCamera(8);
  await t.shot('counter-reload');
  const reload = await t.eval(() => {
    const w = __world;
    if (SIM.momentLine(w).text !== CAST.holgerIntroduction[6].choices[0].reply) throw Error('real reload lost reply');
    if (!w.memory.flags['holger-introduction-node-why-cafe']) throw Error('saved node flag lost');
    for (let n = 0; n < 3000 && w.moment; n++) {
      if (w.moment.phase === 'talk') SIM.advanceMoment(w, SIM.momentLine(w).choices ? 1 : undefined); else SIM.update(w, .1);
    }
    lifeTestFrame(uiNow += 30);
    if (w.moment || !w.memory.flags['holger-introduced']) throw Error('introduction did not finish');
    const problems = __dev.audit(); if (problems.length) throw Error(JSON.stringify(problems));
    return { reload: true, audit: problems };
  });
  // An established café: accept the real invitation during a real drink.
  await t.eval(() => { Object.assign(__world.memory, __dev.furnishedWorld().memory); MEMORY.saveNow(); });
  await t.reload();
  await page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(() => {
    const w = __world; w.spawnT = 1e9; w.barista.idleT = 999;
    const p = SIM._.makePatron(w, 'Signe'); p.wantsBook = false; p.ownBook = true; p.outdoor = false;
    SIM._.enqueueArrival(w, p, 0, true); window.invitationCustomer = p;
    for (let n = 0; n < 2400 && w.barista.state !== 'prepping'; n++) SIM.update(w, .05);
    if (w.barista.state !== 'prepping') throw Error('no active drink');
    window.uiNow = performance.now(); lifeTestFrame(uiNow);
    if (!SIM.holgerAvailable(w)) throw Error('no seated invitation');
  });
  await page.click('#meet-holger');
  await t.eval(() => {
    if (!__world.moment || __world.moment.phase !== 'waiting' || __world.barista.state !== 'prepping') throw Error('click interrupted drink');
    lifeTestFrame(uiNow);
  });
  await t.shot('finishing-drink');
  const queued = await t.eval(() => {
    const w = __world;
    for (let n = 0; n < 2400 && w.moment.phase !== 'talk'; n++) SIM.update(w, .05);
    if (w.moment.phase !== 'talk' || w.barista.orders.some(o => o.patron === invitationCustomer) || w.barista.holding)
      throw Error('approach before drink completion');
    const p = SIM._.makePatron(w, 'Mikkel'); p.wantsBook = false; p.outdoor = false; SIM._.enqueueArrival(w, p, 0, true);
    w.moment.visible = 999;
    for (let n = 0; n < 240; n++) SIM.update(w, .25);
    if (p.state !== 'queueing' || p.path && p.path.length) throw Error('background queue did not move');
    window.uiNow = performance.now(); for (let n = 0; n < 20; n++) lifeTestFrame(uiNow += 50);
    return { queued: p.state, phase: w.moment.phase };
  });
  await t.shot('conversation-background');
  await page.keyboard.press('Escape');
  await t.eval(() => {
    for (let n = 0; n < 2400 && __world.moment; n++) SIM.update(__world, .05);
    if (__world.moment) throw Error('Escape did not leave the conversation');
    if (__dev.audit().length) throw Error('final audit');
  });
  return { reload, queued };
};
