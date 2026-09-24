/* The settings dialog through real clicks: sliders and mute saved across a
   reload, sound defaults independent of weather, the start-over confirmation
   (safe focus, Escape, cancel), a storage failure keeping the café, the real
   fresh restart keeping audio preferences and unrelated storage, and a
   compact desktop window still reaching the destructive action. */
module.exports = async function (t) {
  const page = t.page;
  await t.open('/?dev');
  await t.viewport(1280, 900);
  await t.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.click('#cafe');
  await page.click('#btn-settings');
  await t.eval(() => {
    if (!document.querySelector('#settings').open) throw Error('settings closed');
    if (document.activeElement.id !== 'close-settings') throw Error('opening focus');
    const s = document.querySelector('#setting-music'); s.focus(); s.value = 27; s.dispatchEvent(new Event('input', { bubbles: true }));
    if (SND.settings.musicVolume !== .27) throw Error('slider did not apply');
    if (JSON.parse(localStorage.getItem('cafe-hygge-audio')).musicVolume !== .27) throw Error('mix not saved');
    document.querySelector('#setting-mute').click();
    if (!SND.settings.muted) throw Error('mute not set');
  });
  await t.open('/?dev');
  await page.click('#cafe');
  await page.click('#btn-settings');
  await t.eval(() => { if (SND.settings.musicVolume !== .27 || !SND.settings.muted) throw Error('preferences lost on reload'); });
  await page.click('#reset-sound');
  await t.eval(() => { if (SND.settings.musicVolume !== 1 || SND.settings.volume !== .7 || SND.settings.muted) throw Error('defaults failed'); });
  await page.click('#setting-weather');
  await t.eval(() => {
    const rain = document.querySelector('#setting-rain'); rain.value = 45; rain.dispatchEvent(new Event('input'));
    if (SND.settings.rain || SND.settings.rainVolume !== .45) throw Error('rain volume changed weather');
  });
  await page.click('#reset-sound');
  await t.eval(() => { if (SND.settings.rain || SND.settings.rainVolume !== 1) throw Error('sound defaults changed weather'); });
  await page.click('#setting-weather');
  await t.shot('settings');
  await page.click('#start-over');
  await t.eval(() => { if (document.activeElement.id !== 'cancel-reset') throw Error('safe confirmation focus'); });
  await t.shot('confirmation');
  await page.keyboard.press('Escape');
  await t.eval(() => {
    if (!document.querySelector('#settings').open || !document.querySelector('#reset-confirmation').hidden) throw Error('escape should cancel reset');
  });
  await page.keyboard.press('Escape');
  await t.eval(() => {
    if (document.querySelector('#settings').open || document.activeElement.id !== 'btn-settings') throw Error('close focus');
  });
  // Seed only this disposable browser, including a pending save timer.
  await t.eval(() => {
    MEMORY.state.life.savings = 123; MEMORY.state.life.plant.stage = 'installed'; MEMORY.state.flags.settingsTest = true; MEMORY.save();
    SND.settings.cafeVolume = .36; SND.save(); localStorage.setItem('unrelated-settings-test', 'keep');
    document.querySelector('#btn-settings').click(); document.querySelector('#start-over').click(); document.querySelector('#cancel-reset').click();
    if (MEMORY.state.life.savings !== 123) throw Error('cancel erased progress');
    document.querySelector('#start-over').click();
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function () { throw Error('storage unavailable'); };
    try { document.querySelector('#confirm-reset').click(); }
    finally { Storage.prototype.removeItem = originalRemove; }
    if (document.querySelector('#reset-error').hidden || MEMORY.state.life.savings !== 123) throw Error('failed reset lost live save');
  });
  await Promise.all([page.waitForURL(url => !url.search), page.click('#confirm-reset')]);
  await page.waitForFunction('!!window.__world && !location.search');
  await t.eval(() => {
    if (MEMORY.state.life.savings !== 90 || MEMORY.state.life.plant.stage !== 'available' || MEMORY.state.flags.settingsTest) throw Error('old progress survived');
    if (SND.settings.cafeVolume !== .36) throw Error('reset erased audio preferences');
    if (localStorage.getItem('unrelated-settings-test') !== 'keep') throw Error('unrelated storage erased');
    if (document.querySelector('#overlay').classList.contains('gone')) throw Error('fresh entry missing');
  });
  await page.click('#enter');
  await t.eval(() => { if (!SND.ready()) throw Error('fresh audio unavailable'); });
  await t.open('/?dev');
  await t.eval(() => {
    if (MEMORY.state.life.savings !== 90 || MEMORY.state.flags.settingsTest) throw Error('stale save returned');
    const problems = __dev.audit(); if (problems.length) throw Error(problems.join(';'));
  });
  // A compact desktop window still scrolls to the destructive action.
  await t.viewport(1280, 720);
  await page.click('#cafe');
  await page.click('#btn-settings');
  await page.click('#start-over');
  await page.click('#cancel-reset');
  await t.eval(() => { if (!document.querySelector('#reset-confirmation').hidden) throw Error('compact cancel failed'); });
  return { checks: ['sliders', 'mute', 'reload', 'defaults', 'weather', 'confirmation', 'storage failure', 'fresh restart', 'audit', 'compact window'] };
};
