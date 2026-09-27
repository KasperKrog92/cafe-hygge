/* Café Hygge — Saira's score, once it is pinned up behind the counter. On a
   quiet spell Lunafreya sometimes steps over to it and hums the eight bars
   under her breath, rests and all, at most once a café day; anybody who
   needs her ends it at once. Saira herself (her tapping, hello and scenes)
   is data in CAST and rides the shared regular-story path (sim-regulars). */
(function () {
  'use strict';
  const R = SIM._, L = SCENE.L, SND = R.sound;
  const HUM = 5.5;   // the eight bars, and a breath after
  function scoreUp(w) { return SCENE.hasFurniture(w, 'saira-score') && !w.memory.flags['saira-score-home']; }
  function start(w, b) {
    if (!scoreUp(w)) return false;
    b.humDay = w.memory.life.daysCompleted;
    b.state = 'hum'; b.stateT = 0; b.humming = false;
    b.path = [{ x: L.projects.score.work.x, y: L.projects.score.work.y }];
    return true;
  }
  function back(b) {
    b.humming = false; b.state = 'humBack'; b.stateT = 0; b.heading = '';
    b.path = [{ x: L.baristaHome.x, y: L.baristaHome.y }];
  }
  function update(w, b, dt) {
    if (b.state === 'humBack') { if (R.walker(b, dt)) R.counterBackToIdle(b); return; }
    if (!R.counterQuiet(w)) { back(b); return; }
    if (!b.humming) {
      if (!R.walker(b, dt)) { b.stateT = 0; return; }
      b.humming = true; b.stateT = 0; b.pose = 'stand'; b.heading = 'up';
      SND.lunaHumRoom();
      if (R.random() < 0.5) R.caption(w, R.pickCaption(w, [
        { text: 'Lunafreya hums Saira’s eight bars under her breath, rests and all.', flags: ['saira-room-quiet'] },
        { text: 'Lunafreya hums Saira’s tune under her breath. It stops, and she smiles.', flags: ['saira-room-tune'] }
      ], { actor: b }), { actor: b, holdState: true });
      return;
    }
    b.heading = 'up';
    if (b.stateT >= HUM) back(b);
  }
  R.counterHabits.push({
    id: 'hum', states: ['hum', 'humBack'],
    offer: function (w, b) {
      if (!scoreUp(w) || b.humDay === w.memory.life.daysCompleted || !R.counterQuiet(w) ||
          R.counterChores(w) || R.random() >= 0.08) return false;
      return start(w, b);
    },
    start: start,
    update: update
  });
})();
