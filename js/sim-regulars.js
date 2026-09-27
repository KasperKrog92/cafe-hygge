/* Café Hygge — proper introductions for the familiar regulars.
   One data-driven path for every regular with a packet in
   CAST.introductions (Nora, Kasper, Antonia). An introduction is offered
   from its authored visit (never the first), decided as they come through
   the door, and waits (game mode, seated) until the player chooses it. It
   never expires. */
(function () {
  'use strict';
  function due(w, id) {
    const bond = w.memory.bonds[id];
    return !w.memory.flags[id + '-introduced'] && !!bond && (bond.visits || 0) >= CAST.introductions[id].visits;
  }
  SIM.introductionAvailable = function (w, id) {
    if (w.moment || w.shop.phase !== 'open' || w.memory.life.mode !== 'game' || !due(w, id)) return null;
    return w.patrons.find(p => p.regularId === id && !p.outside && p.storyChapter === 'hello' && p.state === 'seated') || null;
  };
  function packet(w, p) {
    const bond = w.memory.bonds[p.regularId];
    return SIM.contextLines(CAST.introductions[p.regularId].lines, {
      familiar: (bond.visits || 0) > 4,
      hearth: SCENE.hasFurniture(w, 'hearth') && !SCENE.hearthWork(w),
      menu: !!p.spec && !!p.drink && p.drink.name === p.spec.drink
    });
  }
  SIM.startIntroduction = function (w, id) {
    const p = SIM.introductionAvailable(w, id);
    if (!p) return false;
    return SIM.beginSavedMoment(w, packet(w, p), p, id + '-hello-', function () {
      w.memory.flags[id + '-introduced'] = true;
      p.storyChapter = null;
      const bond = w.memory.bonds[id];
      bond.warmth = (bond.warmth || 0) + 1;
    });
  };
  Object.keys(CAST.introductions).forEach(function (id) {
    SIM.addInvitation({ key: () => id, actors: w => { const p = SIM.introductionAvailable(w, id); return p ? [p] : []; },
      start: w => SIM.startIntroduction(w, id) });
    SIM.gateRegular(id, { arrive: function (w, p) { if (due(w, id)) p.storyChapter = 'hello'; } });
  });
})();
