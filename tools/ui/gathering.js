/* A reading afternoon through the real page: Ida's labelled invitation
   button, the wide conversation camera with each reader's own bubble, a real
   reload in the middle that keeps what was read, Ida bringing the afternoon
   back and the scene resuming at the next line, and no invitation once it
   is done. */
const { settle } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  const reveal = '#conversation-answers button:first-child';
  async function reload() { await t.reload(); await page.click('#cafe'); }
  // Ida's next visit, in the afternoon: fast-forward until her readers settle.
  async function bringIda() {
    return t.eval(() => {
      const w = __world;
      for (let n = 0; n < 2400 && w.shop.phase !== 'open'; n++) __dev.ff(1);
      __dev.hour(14.5); __dev.regular('ida');
      for (let n = 0; n < 900 && !SIM.gatheringReady(w); n++) __dev.ff(1);
      if (!SIM.gatheringReady(w)) throw Error('the afternoon never became ready');
      lifeTestFrame(performance.now());
      const b = document.getElementById('meet-gathering');
      if (!b || b.hidden) throw Error('no reading-afternoon button');
      return b.getAttribute('aria-label');
    });
  }
  async function begin() {
    await page.click('#meet-gathering');
    await t.eval(() => {
      if (!__world.moment || !__world.moment.wide) throw Error('the afternoon did not open in a wide shot');
      for (let n = 0; n < 400 && __world.moment.phase !== 'talk'; n++) { SIM.update(__world, .05); }
      __world.moment.visible = 999; lifeTestFrame(performance.now());
    });
  }
  async function next() {
    const state = await t.eval(() => {
      const m = __world.moment; if (m) m.visible = 999; lifeTestFrame(performance.now());
      const panel = document.getElementById('conversation');
      return m ? { phase: m.phase, index: m.index, hidden: !!__world.momentHidden, modal: !!__world.introModal,
        panel: panel && panel.hidden, id: SIM.momentLine(__world) && SIM.momentLine(__world).id } : null;
    });
    if (state && (state.phase !== 'talk' || state.panel)) throw Error('conversation not showing: ' + JSON.stringify(state));
    if (state) await page.click(reveal);
  }

  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await t.eval(() => {
    const w = __dev.furnishedWorld(); SIM.setMode(w, 'game');
    w.memory.life.daysCompleted = 7; w.memory.life.openSeconds = 7 * 780;
    Object.assign(w.memory.flags, { 'ida-introduced': true, 'ida-reading-done': true, 'reading-sentence': true,
      'holger-introduced': true, 'kasper-introduced': true, 'freya-introduced': true });
    ['holger', 'kasper', 'freya', 'ida'].forEach(id => { w.memory.bonds[id] = { known: true, warmth: 1, visits: 6, lastDay: -1 }; });
    SIM._.saveLife(w, 0); MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
  });
  await reload();
  const label = await bringIda();
  if (label !== 'Begin the reading afternoon') throw Error('unexpected label ' + label);
  await begin();
  // Four lines, each attached to whoever says it.
  const speakers = [];
  for (let i = 0; i < 4; i++) {
    speakers.push(await t.eval(() => {
      const line = SIM.momentLine(__world), r = SCENE.dialogueLayout(document.createElement('canvas').getContext('2d'), __world);
      const who = r.data.speaker, named = who === __world.barista ? 'Lunafreya' : who.name;
      if (named !== line.speaker) throw Error('bubble for ' + line.speaker + ' drawn over ' + named);
      return line.speaker;
    }));
    if (i === 2) { await settle(t); await t.shot('afternoon-wide'); }
    await next();
  }
  const heard = await t.eval(() => {
    const f = __world.memory.flags;
    if (f['gathering-reading-done'] || !f['gathering-reading-welcome']) throw Error('partial afternoon not saved');
    MEMORY.saveNow();
    return SIM.momentLine(__world).id;
  });
  await reload();
  await t.eval(() => {
    lifeTestFrame(performance.now());
    const b = document.getElementById('meet-gathering');
    if (b && !b.hidden) throw Error('the afternoon waited without Ida after a reload');
    if (!__world.memory.flags['gathering-reading-welcome']) throw Error('read lines lost on reload');
  });
  await bringIda();
  await begin();
  const resumed = await t.eval(() => SIM.momentLine(__world).id);
  if (resumed !== heard) throw Error('resumed at ' + resumed + ', expected ' + heard);
  for (let i = 0; i < 40 && await t.eval(() => !!__world.moment && __world.moment.phase === 'talk'); i++) await next();
  await t.eval(() => {
    for (let n = 0; n < 400 && __world.moment; n++) SIM.update(__world, .05);
    const f = __world.memory.flags, m = __world.moment;
    if (!f['gathering-reading-done'] || !f['reading-afternoon-ida'] || m) throw Error('the afternoon did not finish: ' +
      JSON.stringify({ done: !!f['gathering-reading-done'], ida: !!f['reading-afternoon-ida'],
        moment: m && { phase: m.phase, index: m.index, of: m.lines.length, hidden: !!__world.momentHidden } }));
    MEMORY.saveNow();
  });
  await reload();
  await t.eval(() => {
    for (let n = 0; n < 60; n++) __dev.ff(1);
    lifeTestFrame(performance.now());
    const b = document.getElementById('meet-gathering');
    if (b && !b.hidden) throw Error('the afternoon offered again');
  });
  return { label, speakers, resumed };
};
