/* Room framing at a 1440×810 window: the small café survives a reload at its
   own crop, the expanded room and the apartment use the full framing. */
module.exports = async function (t) {
  await t.init('life-browser-init.js');
  await t.viewport(1440, 810);
  await t.open('/?dev=life-test');
  await t.eval(() => {
    for (let i = 0; i < 5000 && __world.shop.phase === 'settling'; i++) SIM.update(__world, .25);
    __dev.greetHolger(__world); __world.activeCaption = null; lifeTestFrame(performance.now());
    const a = __dev.audit(); if (a.length) throw Error(a.join(';'));
    if (cafe.width !== 1664 || cafe.height !== 936) throw Error('small viewport ' + cafe.width + '×' + cafe.height);
    MEMORY.saveNow();
  });
  await t.reload();
  await t.eval(() => {
    if (__world.memory.life.room !== 'small') throw Error('room lost on reload');
    __world.patrons = []; __world.seats.forEach(s => { s.taken = false; }); lifeTestFrame(performance.now());
  });
  await t.shot('viewport-small');
  await t.eval(() => {
    __world.memory.life.room = 'full'; lifeTestFrame(performance.now());
    if (cafe.width !== 1920 || cafe.height !== 1080) throw Error('expanded viewport ' + cafe.width + '×' + cafe.height);
  });
  await t.shot('viewport-expanded');
  await t.eval(() => {
    __world.memory.life.room = 'small'; __dev.greetHolger(__world);
    if (!__dev.home()) throw Error('closing did not reach home'); lifeTestFrame(performance.now());
    if (cafe.width !== 1920 || cafe.height !== 1080) throw Error('home crop ' + cafe.width + '×' + cafe.height);
  });
  return { checks: ['small room reload', 'expanded framing', 'apartment framing'] };
};
