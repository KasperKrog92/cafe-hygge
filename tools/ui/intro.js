/* The opening dialogue through the real page: accessible transcript, pause,
   reveal, hidden-tab and settings holds, text/voice settings, every finale
   stage surviving an actual reload, 16:10 / 16:9 captures, and the real
   'skip unpacking' button persisting across a reload. */
const { resize } = require('./lib/capture.js');
module.exports = async function (t) {
  const page = t.page;
  await t.init('life-browser-init.js');
  await t.open('/?life-test');
  await page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(async () => {
    window.uiNow = performance.now();
    const w = __world; SIM.update(w, .25); lifeTestFrame(uiNow);
    if (!SND.ready() || !w.dialogue || document.getElementById('intro-controls').hidden) throw Error('intro UI absent');
    if (!document.getElementById('intro-transcript').textContent.includes(w.dialogue.text)) throw Error('accessible line missing');
    document.getElementById('intro-pause').click();
    const before = JSON.stringify(w.memory), visible = w.dialogue.visible;
    SIM.update(w, 10); if (JSON.stringify(w.memory) !== before || w.dialogue.visible !== visible) throw Error('UI pause did not hold');
    document.getElementById('intro-pause').click();
    document.getElementById('intro-next').click();
    if (w.dialogue.visible !== w.dialogue.text.length) throw Error('UI reveal failed');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    SIM.update(w, 10); if (JSON.stringify(w.memory) !== before) throw Error('hidden intro advanced');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
    document.getElementById('btn-settings').click();
    SIM.update(w, 10); if (JSON.stringify(w.memory) !== before) throw Error('settings advanced dialogue');
    const instant = document.getElementById('setting-instant'); instant.checked = true; instant.dispatchEvent(new Event('change'));
    const volume = document.getElementById('setting-dialogue'); volume.value = 0; volume.dispatchEvent(new Event('input'));
    if (!SND.settings.instantText || SND.settings.dialogueVolume !== 0) throw Error('dialogue settings failed');
    instant.checked = false; instant.dispatchEvent(new Event('change')); volume.value = 70; volume.dispatchEvent(new Event('input'));
    document.getElementById('close-settings').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    window.introUISaves = {};
    for (let n = 0; n < 16000 && w.shop.phase === 'settling'; n++) {
      SIM.update(w, .05); const i = w.memory.life.intro;
      if (w.memory.life.firstOpening.step === 11 && i.time >= 1 && !introUISaves[i.finale]) {
        SIM._.saveLife(w, 0); introUISaves[i.finale] = MEMORY.codec.encode(w.memory);
      }
    }
    if (w.shop.phase !== 'open') throw Error('live intro did not complete');
  });
  const saves = await t.eval(() => window.introUISaves);
  const stages = Object.keys(saves);
  if (!saves['1']) throw Error('finale stage 1 was never saved: ' + stages.join(','));
  for (const stage of stages) {
    await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, saves[stage]);
    await t.reload();
    await t.eval(raw => {
      const before = JSON.parse(raw).life, after = __world.memory.life;
      if (JSON.stringify(before.intro) !== JSON.stringify(after.intro) || before.firstOpening.time !== after.firstOpening.time)
        throw Error('reload lost intro');
    }, saves[stage]);
    await t.eval(() => {
      const w = __world; w.firstEntryReady = true;
      SIM.skipIntro(w);
      for (let n = 0; n < 5000 && w.shop.phase === 'settling'; n++) SIM.update(w, .25);
      if (w.shop.phase !== 'open' || w.memory.life.intro.sign !== 'outside' || w.tables.length !== 2 || __dev.audit().length)
        throw Error('reloaded finale failed');
    });
  }
  await t.eval(raw => { MEMORY.state = MEMORY.codec.decode(raw).state; MEMORY.saveNow(); }, saves['1']);
  await t.open('/?dev=life-test');
  await t.eval(() => { SIM.update(__world, .05); SIM.advanceIntro(__world); window.uiNow = performance.now(); lifeTestFrame(uiNow); });
  for (const width of [1440, 1600]) {
    await resize(t, width, 900);
    await t.eval(() => lifeTestFrame(uiNow));
    await t.shot('intro-' + width);
  }
  await page.click('#intro-unpack');
  await t.eval(() => {
    const w = __world; lifeTestFrame(uiNow);
    if (w.shop.phase !== 'open' || w.tables.length !== 2 || w.memory.life.intro.sign !== 'outside' || __dev.audit().length)
      throw Error('skip unpacking failed');
    MEMORY.saveNow();
  });
  await t.reload();
  await t.eval(() => {
    if (__world.shop.phase !== 'open' || !__world.memory.life.intro.complete) throw Error('skip did not persist');
    SIM.update(__world, .25); if (__world.patrons[0].regularId !== 'holger') throw Error('first customer changed');
  });
  return { reloads: stages.length, stages };
};
