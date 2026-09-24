/* Save export and import through the real settings dialog: the downloaded
   file, an invalid file rejected, cancel (Escape) with safe focus, blocked
   storage leaving the café intact, the real replacement and reload, audio
   preferences preserved, and the audit. */
module.exports = async function (t) {
  const page = t.page;
  const confirmationShown = () => page.waitForFunction("!document.querySelector('#import-confirmation').hidden");
  const upload = (name, text) => page.setInputFiles('#save-file', { name: name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await t.open('/?dev');
  await t.viewport(1280, 900);
  await t.eval(() => {
    __world.paused = true;
    MEMORY.state.life.savings = 173; MEMORY.state.flags.transferTest = true;
    MEMORY.state.life.projects.table = { stage: 'working', step: 2, time: 4.5 };
    MEMORY.state.bonds.holger = { known: true, warmth: 3, visits: 2 };
    MEMORY.save(); SND.settings.cafeVolume = .36; SND.save();
    document.querySelector('#btn-settings').click();
  });
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-save')]);
  if (!/^cafe-hygge-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename())) throw Error('download name ' + download.suggestedFilename());
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = Buffer.concat(chunks).toString('utf8');
  const saved = JSON.parse(backup);
  if (saved.life.savings !== 173 || saved.life.projects.table.time !== 4.5) throw Error('Download lost progress');
  await t.shot('settings');
  await t.eval(() => { MEMORY.state.life.savings = 222; MEMORY.state.flags.transferTest = false; MEMORY.saveNow(); });
  await upload('invalid.json', '{"version":999}');
  await page.waitForFunction("document.querySelector('#save-status').textContent.includes('could not be opened')");
  await t.eval(() => {
    if (MEMORY.state.life.savings !== 222 || !document.querySelector('#import-confirmation').hidden) throw Error('invalid import changed cafe');
  });
  await upload('backup.json', backup);
  await confirmationShown();
  await t.eval(() => { if (document.activeElement.id !== 'cancel-import') throw Error('unsafe focus'); });
  await t.shot('confirmation');
  await page.keyboard.press('Escape');
  await t.eval(() => {
    if (!document.querySelector('#settings').open || MEMORY.state.life.savings !== 222 || document.activeElement.id !== 'import-save')
      throw Error('cancel failed');
  });
  await upload('backup.json', backup);
  await confirmationShown();
  await t.eval(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw Error('blocked'); };
    try { document.querySelector('#confirm-import').click(); }
    finally { Storage.prototype.setItem = originalSet; }
    if (document.querySelector('#import-error').hidden || MEMORY.state.life.savings !== 222 ||
        JSON.parse(localStorage.getItem('cafe-hygge-save')).life.savings !== 222) throw Error('failed import replaced cafe');
    MEMORY.save();
  });
  await Promise.all([page.waitForURL(url => !url.search), page.click('#confirm-import')]);
  await page.waitForFunction('!!window.__world && !location.search');
  await t.eval(() => {
    if (MEMORY.state.life.savings !== 173 || !MEMORY.state.flags.transferTest || MEMORY.state.life.projects.table.time !== 4.5 ||
        MEMORY.state.bonds.holger.warmth !== 3) throw Error('import lost history');
    if (SND.settings.cafeVolume !== .36) throw Error('import changed audio');
    if (!document.querySelector('.overlay-card .sub').textContent.includes('welcome back')) throw Error('missing success');
  });
  await t.open('/?dev');
  await t.eval(() => {
    if (MEMORY.state.life.savings !== 173 || !MEMORY.state.flags.transferTest) throw Error('old cafe overwrote import');
    const a = __dev.audit(); if (a.length) throw Error(a.join(';'));
  });
  // A compact desktop window still reaches the confirmation's actions.
  await t.viewport(1280, 720);
  await t.eval(() => { document.querySelector('#btn-settings').click(); });
  await upload('backup.json', backup);
  await confirmationShown();
  await page.click('#cancel-import');
  await t.eval(() => { if (!document.querySelector('#import-confirmation').hidden) throw Error('compact cancel failed'); });
  return { download: download.suggestedFilename(), bytes: backup.length };
};
