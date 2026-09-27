/* Café Hygge — evening moments at home (CAST.homeStories). One is offered
   per evening in game mode, over Lunafreya wherever she is, chosen as the
   evening begins; it waits, never expires, and plays in place while the
   evening's routine holds (SIM.beginHomeMoment). */
(function () {
  'use strict';
  // In order of precedence: something the day brought back to mind comes
  // before the post.
  const READY = {
    mug: w => !!(w.memory.flags['luna-bookshop-fond'] || w.memory.flags['luna-bookshop-later']),
    calandra: w => w.memory.life.daysCompleted >= 3
  };
  function done(w, id) { return !!w.memory.flags['home-' + id + '-done']; }
  function tonight(w) {
    const day = w.memory.life.daysCompleted;
    if (w.eveningStoryDay !== day) {
      w.eveningStoryDay = day;
      w.eveningStory = Object.keys(READY).find(id => !done(w, id) && READY[id](w)) || null;
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
    return SIM.beginHomeMoment(w, SIM.contextLines(CAST.homeStories[id].lines, { later: !!f['luna-bookshop-later'] }),
      'home-' + id + '-', function () { f['home-' + id + '-done'] = true; });
  };
  SIM.addInvitation({ key: () => 'evening', actors: w => SIM.eveningStory(w) ? [w.barista] : [],
    start: w => SIM.startEveningStory(w),
    icon: w => CAST.homeStories[SIM.eveningStory(w)].icon,
    label: w => CAST.homeStories[SIM.eveningStory(w)].label });
})();

/* A keepsake chosen for home comes upstairs with her and is laid out when
   she first settles on the bed that evening (saved, once). */
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
      R.caption(w, 'Gerda’s blanket goes over the foot of the bed.', {place:'home'});
      R.commitLife(w);
    });
  };
})();
