/* Saved popularity and history survive an actual page reload with no
   artificial offline time; a save from an older version opens a fresh café
   (development phase: no migrations). */
module.exports = async function (t) {
  await t.open('/?dev');
  await t.page.waitForFunction('!!window.__dev');
  await t.eval(() => {
    const s = MEMORY.codec.fresh(); s.life.openSeconds = 417.25; s.life.savings = 71; s.flags.kept = true;
    MEMORY.state = s; MEMORY.saveNow();
  });
  await t.reload();
  const kept = await t.eval(() => {
    const s = __world.memory;
    if (s.life.openSeconds !== 417.25 || s.life.savings !== 71 || !s.flags.kept) throw Error('Reload lost saved popularity/history');
    return { version: s.version, openSeconds: s.life.openSeconds, savings: s.life.savings };
  });
  // An older save is not migrated: the café opens fresh rather than half-reading it.
  await t.eval(() => {
    const s = MEMORY.codec.fresh(); s.version = MEMORY.VERSION - 1; s.life.savings = 71; s.flags.kept = true;
    localStorage.setItem('cafe-hygge-save', JSON.stringify(s)); MEMORY.readOnly = true;
  });
  await t.reload();
  const older = await t.eval(() => {
    const s = __world.memory;
    if (s.version !== MEMORY.VERSION || s.flags.kept || s.life.savings === 71 || !MEMORY.status.loadError)
      throw Error('older save did not open a fresh café');
    const a = __dev.audit(); if (a.length) throw Error(a.join(';'));
    return { version: s.version, loadError: MEMORY.status.loadError, savings: s.life.savings };
  });
  return { kept: kept, older: older };
};
