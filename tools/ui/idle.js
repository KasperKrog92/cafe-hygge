/* Startup choice, a full ambient session across two day/night cycles, and
   isolation from a saved game and its tab lock (including a cancelled wait). */
module.exports = async function (t) {
  const page = t.page;
  await page.goto(t.base + '/');
  await t.shot('startup');
  await page.getByRole('button', {name:'Enjoy an idle café', exact:false}).click();
  await page.waitForFunction('!!window.__world');
  await t.eval(() => {
    if (!__world.ambient || !SND.ready() || !MEMORY.readOnly) throw Error('idle entry');
    if (localStorage.getItem('cafe-hygge-save')) throw Error('fresh idle created a save');
  });
  await page.reload();
  await page.waitForSelector('#enter-idle');
  const saved = await t.eval(() => {
    if (window.__world || localStorage.getItem('cafe-hygge-save')) throw Error('idle reload saved or auto-entered');
    const s = MEMORY.codec.fresh(); s.life.savings = 237; s.flags.idleIsolation = true;
    const raw = MEMORY.codec.encode(s); localStorage.setItem('cafe-hygge-save', raw);
    localStorage.setItem('cafe-hygge-audio', '{"volume":0.31}');
    window.idleWrites = [];
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { idleWrites.push(key); return set.call(this, key, value); };
    return raw;
  });
  await page.click('#enter-idle');
  await page.waitForFunction('!!window.__world');
  const cycles = await t.eval(() => {
    const w = __world, arcs = JSON.stringify(w.memory.arcs), flags = JSON.stringify(w.memory.flags);
    if (w.memory === MEMORY.state || w.context.memory === MEMORY || w.memory.flags.idleIsolation) throw Error('borrowed saved game');
    if (w.memory.life.room !== 'full' || w.seats.length < 18 || w.patrons.length < 3 ||
        !SCENE.windowOpen(w,SCENE.L.win) || !SCENE.fullCounter(w) || !SCENE.canBrowse(w)) throw Error('incomplete idle café');
    if (SIM.setMode(w,'game') || SIM.beginMoment(w,[],w.patrons[0],function(){})) throw Error('idle became a story');
    const oldSound = w.context.sound, sound = {settings:SND.settings};
    Object.keys(SND).forEach(k => { if (typeof SND[k] === 'function') sound[k] = function(){}; });
    w.context.sound = sound; // don't play two days of one-shots in one frame
    const guests = new Set(), hours = new Set();
    try {
      for (let n = 0; n < 2 * SIM._.DAY_SECONDS * 4; n++) {
        SIM.update(w,.25);
        if (n % 60) continue;
        hours.add(Math.floor(w.hour)); w.patrons.forEach(p => guests.add(p.id));
        if (w.shop.phase !== 'open' || !w.shop.accepting || w.moment || w.dialogue ||
            SIM.invitations(w).length || w.counterParcel || w.patrons.some(p => p.storyChapter)) throw Error('story or closing in idle');
        const a = __dev.audit(); if (a.length) throw Error('idle audit: ' + a.join('; '));
      }
    } finally { w.context.sound = oldSound; }
    if (JSON.stringify(w.memory.arcs) !== arcs || JSON.stringify(w.memory.flags) !== flags) throw Error('idle story advanced');
    if (hours.size !== 24 || guests.size < 15) throw Error('idle activity stopped');
    return {hours:hours.size, guests:guests.size, audit:__dev.audit()};
  });
  await t.shot('cafe');
  await page.mouse.move(20,20);
  await page.click('#btn-settings');
  if (await page.locator('.save-settings').isVisible() || await page.locator('.game-setting').isVisible()) throw Error('game settings in idle');
  await page.locator('#setting-volume').fill('12');
  await page.click('#reset-sound');
  await t.eval(raw => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    if (localStorage.getItem('cafe-hygge-save') !== raw || localStorage.getItem('cafe-hygge-audio') !== '{"volume":0.31}' || idleWrites.length)
      throw Error('idle wrote storage');
  }, saved);
  const game = await page.context().newPage();
  const errors = [];
  game.on('pageerror', e => errors.push(String(e)));
  await game.goto(t.base + '/');
  await game.click('#enter');
  await game.waitForFunction('!!window.__world');
  await game.evaluate(() => {
    if (__world.ambient || __world.memory.life.savings !== 237 || !__world.memory.flags.idleIsolation) throw Error('game did not resume');
    __world.introPaused = true;
    MEMORY.saveNow();
  });
  // Leave idle, choose an already-owned game, then choose idle while waiting.
  await page.click('#choose-mode');
  await page.waitForSelector('#enter');
  await page.click('#enter');
  await page.waitForFunction('document.getElementById("enter").disabled');
  await page.click('#enter-idle');
  await page.waitForFunction('!!window.__world && __world.ambient');
  await game.close();
  // A fresh game tab must acquire immediately: the cancelled waiter owns no lock.
  const resumed = await page.context().newPage();
  resumed.on('pageerror', e => errors.push(String(e)));
  await resumed.goto(t.base + '/'); await resumed.click('#enter');
  await resumed.waitForFunction('!!window.__world', null, {timeout:5000});
  await resumed.evaluate(() => { if (__world.ambient || !__world.memory.flags.idleIsolation) throw Error('lost game after idle wait'); });
  await resumed.close();
  if (errors.length) throw Error(errors.join('\n'));
  return {cycles:cycles, checks:['fresh idle saves nothing','saved game preserved','audio session only','parallel game','cancelled game wait','reload chooser']};
};
