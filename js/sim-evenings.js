/* Café Hygge — evening moments at home (CAST.homeStories). One is offered
   per evening in game mode, over Lunafreya wherever she is, chosen as the
   evening begins; it waits, never expires, and plays in place while the
   evening's routine holds (SIM.beginHomeMoment). */
(function () {
  'use strict';
  // In order of precedence: something the day brought back to mind comes
  // before the post. A story may instead name its `after` flags in CAST.
  const READY = {
    mug: w => !!(w.memory.flags['luna-bookshop-fond'] || w.memory.flags['luna-bookshop-later']),
    calandra: w => w.memory.life.daysCompleted >= 3
  };
  const ORDER = ['mug', 'bench', 'calandra'];
  function ready(w, id) {
    return READY[id] ? READY[id](w) : (CAST.homeStories[id].after || []).every(f => w.memory.flags[f]);
  }
  function done(w, id) { return !!w.memory.flags['home-' + id + '-done']; }
  function tonight(w) {
    const day = w.memory.life.daysCompleted;
    if (w.eveningStoryDay !== day) {
      w.eveningStoryDay = day;
      const ids = ORDER.concat(Object.keys(CAST.homeStories).filter(id => ORDER.indexOf(id) < 0));
      w.eveningStory = ids.find(id => CAST.homeStories[id] && !done(w, id) && ready(w, id)) || null;
    }
    return w.eveningStory && !done(w, w.eveningStory) ? w.eveningStory : null;
  }
  SIM.eveningStory = function (w) {
    const l = w.memory.life;
    if (w.shop.phase !== 'home' || w.moment || w.plannerOpen || l.mode !== 'game' || l.homeStory.firstNight ||
        SIM.homeSceneActive(w) || SIM.homePlanRequired(w)) return null;
    return tonight(w);
  };
  SIM.startEveningStory = function (w) {
    const id = SIM.eveningStory(w);
    if (!id) return false;
    const f = w.memory.flags;
    const lines = CAST.homeStories[id].lines;
    return SIM.beginHomeMoment(w, SIM.contextLines(lines, SIM.flagContext(w, lines, { later: !!f['luna-bookshop-later'] })),
      'home-' + id + '-', function () { f['home-' + id + '-done'] = true; });
  };
  SIM.addInvitation({ key: () => 'evening', actors: w => SIM.eveningStory(w) ? [w.barista] : [],
    start: w => SIM.startEveningStory(w),
    icon: w => CAST.homeStories[SIM.eveningStory(w)].icon,
    label: w => CAST.homeStories[SIM.eveningStory(w)].label });
})();

/* A keepsake chosen for home comes upstairs with her and is put in its place
   when she first settles on the bed that evening (saved, once). */
(function () {
  'use strict';
  const R = SIM._, before = R.updateHome;
  R.updateHome = function (w, dt) {
    before(w, dt);
    const l = w.memory.life;
    if (w.shop.phase !== 'home' || l.homeStory.firstNight || SIM.homeSceneActive(w) || l.homeTime < 45) return;
    Object.keys(IMPROVEMENTS.projects).forEach(function (id) {
      const d = IMPROVEMENTS.projects[id], p = l.projects[id];
      if (!d.homeFlag || !w.memory.flags[d.homeFlag] || p.stage !== 'scheduled') return;
      p.stage = 'installed'; p.step = d.phases.length; p.time = 0;
      R.caption(w, d.homeLine, {place:'home'});
      R.commitLife(w);
    });
  };
})();

/* Tomas's loaf becomes supper the night he brings it: noticed once, when she
   sits down to eat (the supper's second stage). Part of the chosen moment's
   consequence, like Keira's promised photograph, so it uses the story
   caption track and is never crowded out. */
(function () {
  'use strict';
  const R = SIM._, before = R.updateHome;
  R.updateHome = function (w, dt) {
    before(w, dt);
    const f = w.memory.flags, m = w.homeMeal;
    if (!m || m.stage !== 1 || !(m.progress > 0) || !f['tomas-bread-done'] || f['home-bread-eaten']) return;
    f['home-bread-eaten'] = true;
    R.captionRun(w, [CAST.breadSupper[f['tomas-bread-good'] ? 'tomas-bread-good' : 'tomas-bread-crust']]);
    w.context.memory.save();
  };
})();
