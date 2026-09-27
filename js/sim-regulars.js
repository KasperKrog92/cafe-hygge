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
  function packet(w, p) { return packetOf(w, p, CAST.introductions[p.regularId].lines); }
  function packetOf(w, p, lines) {
    const bond = w.memory.bonds[p.regularId];
    return SIM.contextLines(lines, SIM.flagContext(w, lines, {
      familiar: (bond.visits || 0) > 4,
      hearth: SCENE.hasFurniture(w, 'hearth') && !SCENE.hearthWork(w),
      menu: !!p.spec && !!p.drink && p.drink.name === p.spec.drink,
      rain: w.rain > 0.3,
      facadeDone: !!w.memory.flags['street-house-painted'],
      noShelf: !SCENE.hasFurniture(w, 'wall-shelves') && !SCENE.hasFurniture(w, 'bookshelf'),
      noPlant: !SCENE.hasFurniture(w, 'first-plant') && !SCENE.hasFurniture(w, 'plants')
    }));
  }
  // An `alt` key `flag:<name>` holds when that saved flag is set, so a line
  // can recall any earlier answer without a new named condition.
  SIM.flagContext = function (w, lines, when) {
    lines.forEach(function (l) {
      Object.keys(l.alt || {}).forEach(function (k) { if (k.indexOf('flag:') === 0) when[k] = !!w.memory.flags[k.slice(5)]; });
    });
    return when;
  };
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
  // Later saved scenes (CAST.regularStories), one at a time and in order,
  // each decided at the door. A story that brings a parcel waits until it is
  // set down on the counter; one that gives a keepsake schedules it.
  function nextStory(w, id) {
    const f = w.memory.flags;
    return ((CAST.regularStories || {})[id] || []).find(function (s) {
      return !f[id + '-' + s.id + '-done'] && s.after.every(function (x) { return f[x]; }) &&
        !(s.unless || []).some(function (x) { return f[x]; }) &&
        (!s.afterAny || s.afterAny.some(function (x) { return f[x]; })) &&
        (s.requires || []).every(function (id) { return SCENE.hasFurniture(w, id); }) &&
        (!s.beforeBuying || w.memory.life.projects[s.beforeBuying].stage === 'available');
    }) || null;
  }
  SIM.regularStoryAvailable = function (w, id) {
    if (w.moment || w.shop.phase !== 'open' || w.memory.life.mode !== 'game') return null;
    const s = nextStory(w, id);
    const p = s && w.patrons.find(q => q.regularId === id && !q.outside && q.storyChapter === s.id && q.state === 'seated');
    if (!p || s.parcel && !(w.counterParcel && w.counterParcel.owner === p.id)) return null;
    // A scene at the piano waits for a visit when she is sitting at it; one
    // with a companion, until they are both sitting down together.
    if (s.seat === 'piano' && !p.seat.piano) return null;
    if (s.companion && !(p.partner && p.partner.companionId === s.companion && p.partner.state === 'seated')) return null;
    return p;
  };
  SIM.startRegularStory = function (w, id) {
    const p = SIM.regularStoryAvailable(w, id);
    if (!p) return false;
    const s = nextStory(w, id);
    return SIM.beginSavedMoment(w, packetOf(w, p, s.lines), p, id + '-' + s.id + '-', function () {
      w.memory.flags[id + '-' + s.id + '-done'] = true;
      (s.sets || []).forEach(function (x) { w.memory.flags[x] = true; });
      p.storyChapter = null;
      const bond = w.memory.bonds[id];
      bond.warmth = (bond.warmth || 0) + 1;
      // Having played it together, she plays a little more before she goes.
      if (s.seat === 'piano') { p.pianoBursts = 2; p.pianoRestT = 3; p.preferPiano = false; }
      // What they set on the counter has been handed over (or shared and eaten).
      if (s.parcel) w.counterParcel = null;
      if (s.gift) {
        w.counterParcel = null;
        const job = w.memory.life.projects[s.gift];
        if (job.stage === 'available') job.stage = 'scheduled';
        SIM._.commitLife(w);
      }
    });
  };
  Object.keys(CAST.regularStories || {}).forEach(function (id) {
    SIM.addInvitation({ key: () => id, actors: w => { const p = SIM.regularStoryAvailable(w, id); return p ? [p] : []; },
      start: w => SIM.startRegularStory(w, id) });
    SIM.gateRegular(id, { arrive: function (w, p) {
      if (p.storyChapter) return;
      const s = nextStory(w, id);
      // A companion comes through the door with them only when there is a
      // table for two; otherwise the scene waits for another visit.
      if (s && s.companion && !(SIM.companions[s.companion] && SIM.companions[s.companion](w, p))) return;
      if (s) { p.storyChapter = s.id; if (s.parcel) p.parcel = s.parcel; if (s.seat === 'piano') p.preferPiano = true; }
    } });
  });
  // A companion who has visited once comes along again on every third visit
  // (when there is a table for two).
  SIM.gateRegular('holger', { arrive: function (w, p) {
    const bond = w.memory.bonds.holger;
    if (!p.storyChapter && !p.partner && w.memory.flags['holger-visit-done'] && bond && bond.visits % 3 === 0 && SIM.companions.aksel) SIM.companions.aksel(w, p);
  } });
  Object.keys(CAST.introductions).forEach(function (id) {
    SIM.addInvitation({ key: () => id, actors: w => { const p = SIM.introductionAvailable(w, id); return p ? [p] : []; },
      start: w => SIM.startIntroduction(w, id) });
    SIM.gateRegular(id, { arrive: function (w, p) { if (due(w, id)) p.storyChapter = 'hello'; } });
  });
})();
