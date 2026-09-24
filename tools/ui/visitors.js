/* Keira and Tomas through the real page: each visitor's actual invitation
   button, every acknowledged line restored across a real reload, the
   completed greeting, 16:10 / 16:9 captures, then four exact table-kit
   checkpoints across reloads without a duplicate delivery, and zero audits. */
const { resize, settle } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  async function reload() { await t.reload(); await page.click('#cafe'); }
  await t.init('life-browser-init.js');
  await t.open('/?dev=life-test');
  await resize(t, 1440, 900);
  const lines = {};
  for (const id of ['keira', 'tomas']) {
    await t.eval(() => {
      const w = __dev.modestWorld(); w.memory.life.daysCompleted = 1; w.memory.life.mode = 'game'; w.memory.life.hour = 10;
      w.memory.life.projects.table.stage = 'scheduled'; w.memory.life.projects.window.stage = 'scheduled';
      MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
    });
    await reload();
    const lineCount = await t.eval(id => CAST.visitors[id].hello.length, id);
    lines[id] = lineCount;
    for (let line = 0; line < lineCount; line++) {
      await t.eval(id => {
        const w = __world, waiting = () => SIM.visitorInvites(w).some(a => a.visitorId === id);
        for (let n = 0; n < 6000 && !waiting(); n++) SIM.update(w, .25);
        if (!waiting()) throw Error('missing invitation'); lifeTestFrame(performance.now());
      }, id);
      await page.click('#meet-' + id);
      await t.eval(line => {
        const w = __world; for (let n = 0; n < 2000 && w.moment.phase !== 'talk'; n++) SIM.update(w, .25);
        if (w.moment.index !== line) throw Error('wrong restored cursor ' + w.moment.index + ' ≠ ' + line);
        w.moment.visible = 999; lifeTestFrame(performance.now());
      }, line);
      if (line === 0 || line === 10) {
        await settle(t);
        for (const width of [1440, 1600]) {
          await resize(t, width, 900);
          await t.eval(() => lifeTestFrame(performance.now()));
          await t.shot(id + '-dialogue-' + line + '-' + width);
        }
      }
      await page.click('#conversation-answers button:first-child');
      await t.eval(() => MEMORY.saveNow());
      await reload();
    }
    await t.eval(id => { if (!__world.memory.flags[id + '-introduced']) throw Error('completion missing'); }, id);
  }
  for (const stage of ['scheduled', 'arrived', 'working', 'installed']) {
    await t.eval(stage => {
      const w = __dev.modestWorld(); w.memory.life.daysCompleted = 1; w.memory.life.mode = 'game';
      const p = w.memory.life.projects.table; p.stage = stage;
      p.step = stage === 'installed' ? 6 : stage === 'working' ? 2 : 0; p.time = stage === 'working' ? 4.5 : 0;
      MEMORY.state = JSON.parse(MEMORY.codec.encode(w.memory)); MEMORY.saveNow();
    }, stage);
    await reload();
    const before = await t.eval(() => JSON.stringify(__world.memory.life.projects.table));
    await t.eval(() => { SIM._.commitLife(__world); });
    await reload();
    const after = await t.eval(() => JSON.stringify(__world.memory.life.projects.table));
    if (before !== after) throw Error('Actual reload lost project checkpoint ' + stage + ': ' + before + ' → ' + after);
    await t.eval(stage => {
      SIM.update(__world, .25);
      if (stage !== 'scheduled' && __world.deliveryVisitor) throw Error('duplicate kit');
      if (__dev.audit().length) throw Error('audit');
    }, stage);
  }
  return { lines };
};
