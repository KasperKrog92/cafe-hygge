/* Café Hygge — a reading afternoon (ensemble release 4's shared gathering).
   Ida proposes it (CAST.regularStories.ida, `reading`); on a later visit, in
   game mode and before evening, she brings it with her: up to three readers
   Lunafreya knows are called in along ordinary arrivals (Holger, Gerda,
   Kasper, Antonia, in that order), each reads a book of their own, and they
   stay into the evening. Once Ida and her readers have settled, the afternoon
   waits over Ida, "ready when you want to begin", and never plays itself. The
   scene is an attended saved moment in a wide shot, voiced by whoever is
   there; it resumes from its last acknowledged line after a reload (on Ida's
   next visit). If it is never begun, everyone goes home at closing and Ida
   brings it again another day. Afterwards everyone reads a little longer and
   leaves in their own time; the afternoon shows in later musings. */
(function () {
  'use strict';
  const R = SIM._, G = CAST.gathering;
  const MET = { holger: 'holger-introduced', gerda: 'gerda-introduced', kasper: 'kasper-introduced', freya: 'freya-introduced' };
  function planned(w) { const f = w.memory.flags; return !!f['ida-reading-done'] && !f['gathering-reading-done']; }
  function today(w) { const g = w.gathering; return g && g.day === w.memory.life.daysCompleted ? g : null; }
  // A reader for the afternoon: their own book, no laptop, no chatter, and
  // time to stay into the evening (closing still sends everyone home).
  function reader(w, p, id) {
    p.gathering = true; p.wantsBook = true; p.ownBook = true; p.laptop = false; p.chatty = false;
    p.bookColor = G.books[id]; p.minStay = 420;
    if (p.state === 'seated' && p.seat && !p.seat.piano && !p.seat.artist) {
      // Already here: the laptop closes and a book comes out.
      if (p.laptopActive) {
        const tb = w.tables[p.seat.table];
        if (tb) tb.items = tb.items.filter(function (it) { return !(it.owner === p.id && it.kind === 'laptop'); });
        p.laptopActive = false; p.typing = false;
      }
      p.reading = true; p.pageTurn = 0.8; p.stay = Math.max(p.stay, p.minStay);
    }
  }

  SIM.gateRegular('ida', { arrive: function (w, p) {
    if (!planned(w) || w.memory.life.mode !== 'game' || w.shop.phase !== 'open' || w.hour >= 18.5 || p.storyChapter) return;
    const guests = G.readers.filter(function (id) { return w.memory.flags[MET[id]]; }).slice(0, 3);
    if (!guests.length) return;
    p.gatheringHost = true; reader(w, p, 'ida');
    const day = w.memory.life.daysCompleted;
    w.gathering = { day: day, host: p.id, guests: guests, since: null };
    // Readers not already here are due today, whatever their usual hour, and
    // come before other arrivals (SIM._.expectedGuests holds seats for them).
    w.expectedGuests = { day: day, ids: [] };
    guests.forEach(function (id) {
      const here = w.patrons.find(function (q) { return q.regularId === id && !q.outside; });
      if (here) reader(w, here, id); else w.expectedGuests.ids.push(id);
    });
  } });
  function expected(w, id) {
    const e = w.expectedGuests;
    return !!today(w) && planned(w) && !!e && e.day === w.memory.life.daysCompleted && e.ids.indexOf(id) >= 0;
  }
  G.readers.forEach(function (id) {
    SIM.gateRegular(id, {
      due: w => expected(w, id),
      arrive: function (w, p) {
        const g = today(w);
        if (!g || !planned(w) || g.guests.indexOf(id) < 0) return;
        reader(w, p, id);
        if (w.expectedGuests) w.expectedGuests.ids = w.expectedGuests.ids.filter(function (x) { return x !== id; });
      }
    });
  });

  function readers(w) {
    return w.patrons.filter(function (p) { return p.gathering && !p.outside && p.state === 'seated' && p.low === 1; });
  }
  // Ready once Ida and her readers are settled; a reader who cannot come
  // (their own gate keeps them away) is not waited for beyond a while.
  SIM.gatheringReady = function (w) {
    const g = today(w);
    if (!g || w.moment || w.shop.phase !== 'open' || w.memory.life.mode !== 'game' || !planned(w)) return null;
    const seated = readers(w), host = seated.find(function (p) { return p.gatheringHost; });
    if (!host) return null;
    if (g.since == null) g.since = w.t;
    const all = seated.length >= 1 + g.guests.length, some = seated.length >= 2 && w.t - g.since > 150;
    return all || some ? host : null;
  };
  function lines(w) {
    const f = w.memory.flags, here = {};
    readers(w).forEach(function (p) { here[p.regularId] = true; });
    const rule = f['reading-sentence'] ? 'sentence' : 'quiet';
    return SIM.contextLines(G.reading.filter(function (l) {
      return (!l.who || here[l.who]) && (!l.variant || l.variant === rule);
    }), { sentence: rule === 'sentence', bosun: !!f['holger-books-given'] });
  }
  SIM.startGathering = function (w) {
    const host = SIM.gatheringReady(w);
    if (!host) return false;
    const there = readers(w);
    if (!SIM.beginSavedMoment(w, lines(w), host, 'gathering-reading-', function () {
      const f = w.memory.flags;
      f['gathering-reading-done'] = true;
      there.forEach(function (p) {
        f['reading-afternoon-' + p.regularId] = true;
        const bond = w.memory.bonds[p.regularId];
        if (bond) bond.warmth = (bond.warmth || 0) + 1;
        // A little more reading, then home in their own time.
        p.minStay = 0; p.stay = Math.min(p.stay, R.rnd(60, 180));
      });
      w.gathering = null; w.expectedGuests = null;
    })) return false;
    w.moment.wide = true;   // the whole room: everyone who came is in the picture
    return true;
  };
  SIM.addInvitation({ key: () => 'gathering', actors: function (w) { const h = SIM.gatheringReady(w); return h ? [h] : []; },
    start: w => SIM.startGathering(w), icon: () => 'book', label: () => 'Begin the reading afternoon' });
})();
