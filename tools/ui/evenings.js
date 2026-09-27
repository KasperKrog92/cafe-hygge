/* An evening moment through the real page: the labelled home invitation
   button, reveal/continue and choice buttons, a real reload mid-letter that
   resumes at the next line, bed and planner held while it plays, and the
   letter left on the desk. */
const { resize, settle } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function reload() { await t.reload(); await page.click('#cafe'); }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(() => {
    const w = __dev.modestWorld(); SIM.setMode(w, 'game'); w.memory.life.daysCompleted = 2;
    w.clockOffset += (21.5 - w.hour) / 24 * SIM._.DAY_SECONDS;
    for (let n = 0; n < 12000 && w.shop.phase !== 'home'; n++) SIM.update(w, .25);
    if (w.shop.phase !== 'home' || w.memory.life.daysCompleted !== 3) throw Error('no third evening');
    SIM._.saveLife(w, 0); MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
  });
  await reload();
  const label = await t.eval(() => {
    lifeTestFrame(performance.now());
    const b = document.getElementById('meet-evening');
    if (!b || b.hidden) throw Error('no evening invitation button');
    return b.getAttribute('aria-label');
  });
  if (!/Calandra/.test(label)) throw Error('unexpected label ' + label);
  await page.click('#meet-evening');
  const reveal = '#conversation-answers button:first-child';
  await t.eval(() => {
    if (!__world.moment || !__world.moment.home) throw Error('letter did not open');
    if (SIM.goToSleep(__world) || SIM.plan(__world, true)) throw Error('bed or planner over the letter');
    lifeTestFrame(performance.now());
  });
  for (let i = 0; i < 4; i++) { await page.click(reveal); await page.click(reveal); }
  await t.eval(() => { MEMORY.saveNow(); });
  await reload();
  const resumed = await t.eval(() => {
    lifeTestFrame(performance.now());
    if (!__world.memory.flags['home-calandra-crossword'] || __world.memory.flags['home-calandra-done'])
      throw Error('partial letter not saved');
    if (!SIM.startEveningStory(__world)) throw Error('letter did not wait');
    return SIM.momentLine(__world).id;
  });
  if (resumed !== 'clue') throw Error('resumed at ' + resumed);
  await t.eval(() => { __world.moment.visible = 999; SIM.advanceMoment(__world); __world.moment.visible = 999; lifeTestFrame(performance.now()); });
  await page.click('#conversation-answers button:first-child');
  for (let i = 0; i < 6 && await t.eval(() => !!__world.moment); i++) {
    await t.eval(() => { if (__world.moment) __world.moment.visible = 999; lifeTestFrame(performance.now()); });
    if (await t.eval(() => !!__world.moment)) await page.click(reveal);
  }
  await t.eval(() => {
    const f = __world.memory.flags;
    if (!f['home-calandra-done'] || !f['calandra-told-people'] || __world.moment) throw Error('letter not finished');
    MEMORY.saveNow();
  });
  await reload();
  await t.eval(() => {
    lifeTestFrame(performance.now());
    const b = document.getElementById('meet-evening');   // created only when something waits
    if (b && !b.hidden) throw Error('letter offered again');
  });
  await settle(t);
  for (const width of [1440, 1600]) {
    await resize(t, width, 900);
    await t.eval(() => lifeTestFrame(performance.now()));
    await t.shot('letter-done-' + width);
  }
  return { label, resumed };
};
