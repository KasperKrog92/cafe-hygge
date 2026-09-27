/* Café Hygge — Holger after his first hello: a box of books with a history.
   Two saved scenes (CAST.holgerBooks). The offer recalls what Lunafreya first
   told him; the handover is where she first mentions her old bookshop work.
   What he has to share is decided as he comes through the door, so neither
   scene can happen on the visit that made it possible. */
(function () {
  'use strict';
  const R = SIM._;
  function shelfReady(w) { return SCENE.hasFurniture(w,'wall-shelves') || SCENE.hasFurniture(w,'bookshelf'); }
  // offer: from his third visit, after the introduction. gift: once promised
  // and there is somewhere to put them (a later visit than the promise).
  function chapter(w) {
    const f = w.memory.flags, bond = w.memory.bonds.holger;
    if (!f['holger-introduced']) return null;
    if (!f['holger-books-promised']) return bond && (bond.visits || 0) >= 3 ? 'offer' : null;
    if (!f['holger-books-given'] && shelfReady(w)) return 'gift';
    return null;
  }
  SIM.holgerChapter = chapter;
  SIM.holgerBooksAvailable = function (w) {
    if (w.moment || w.shop.phase !== 'open' || w.memory.life.mode !== 'game') return null;
    const now = chapter(w);
    const p = w.patrons.find(q => q.regularId === 'holger' && !q.outside && q.storyChapter && q.storyChapter === now);
    if (!p || (p.state !== 'ordering' && p.state !== 'seated')) return null;
    // The handover needs the box actually set down on the counter.
    if (now === 'gift' && !(w.counterParcel && w.counterParcel.owner === p.id)) return null;
    return p;
  };
  // Context variants are data (line.alt); the first true condition wins.
  function packet(w, part) {
    const f = w.memory.flags;
    return SIM.contextLines(CAST.holgerBooks[part], { neighbours: !!f['luna-cafe-neighbours'] && !f['luna-cafe-books'],
      'no-shelf': !shelfReady(w), keep: !!f['holger-books-keep'], library: SCENE.hasFurniture(w,'bookshelf') });
  }
  // The accepted box becomes Lunafreya's: a scheduled gift on the counter,
  // shelved later as ordinary work. An established library makes room at once.
  function receive(w) {
    const job = w.memory.life.projects.holgerBooks, d = IMPROVEMENTS.projects.holgerBooks;
    w.counterParcel = null;
    if (job.stage !== 'available') return;
    if (SCENE.hasFurniture(w,'bookshelf')) {
      job.stage = 'installed'; job.step = d.phases.length; job.time = 0;
      for (let n = 0; n < IMPROVEMENTS.stocked(d, d.phases.length); n++) w.memory.life.shelf.push(d.bookSource);
    } else job.stage = 'scheduled';
    R.commitLife(w);
  }
  SIM.startHolgerBooks = function (w) {
    const p = SIM.holgerBooksAvailable(w);
    if (!p) return false;
    const part = p.storyChapter, f = w.memory.flags;
    return SIM.beginSavedMoment(w, packet(w, part), p, 'holger-books-' + part + '-', function () {
      const bond = w.memory.bonds.holger || (w.memory.bonds.holger = { known: true, warmth: 0 });
      bond.warmth = (bond.warmth || 0) + 1;
      p.storyChapter = null;
      if (part === 'offer') { f['holger-books-promised'] = true; return; }
      f['holger-books-given'] = true;
      receive(w);
    });
  };
  SIM.addInvitation({ key: () => 'holger', actors: w => { const h = SIM.holgerBooksAvailable(w); return h ? [h] : []; },
    start: w => SIM.startHolgerBooks(w) });
  /* Aksel, Holger's shipmate of nineteen years, comes in with him when there
     is a table for two: a named companion on the ordinary pair path (they
     order, sit together, talk and leave together). His first visit is
     Holger's `visit` scene; afterwards he sometimes comes along. */
  SIM.companions = SIM.companions || {};
  function tableForTwo(w) {
    return w.tables.some(function (tb, ti) {
      if (tb.small || tb.tall || tb.piano || tb.artist) return false;
      return w.seats.filter(function (s) {
        return s.table === ti && !s.taken && !tb.items.some(function (it) { return it.owner === null && it.side === s.side; });
      }).length >= 2;
    });
  }
  SIM.companions.aksel = function (w, holger) {
    if (holger.partner || !tableForTwo(w)) return false;
    const d = CAST.aksel, a = R.makePatron(w, d.name);
    a.colors = Object.assign({}, d.colors); a.nameStyle = 'masculine'; a.companionId = 'aksel';
    const drink = R.DRINKS.find(function (x) { return x.name === d.drink; });
    if (drink) a.drink = drink;
    a.wantsBook = false; a.ownBook = false; a.chatty = true; a.laptop = false; a.pianist = false;
    a.chatT = R.rnd(8, 16); a.umbrella = null;
    a.partner = holger; holger.partner = a;
    // With a friend at the table he talks rather than reads.
    holger.chatty = true; holger.wantsBook = false; holger.ownBook = false; holger.chatT = R.rnd(12, 20);
    R.enqueueArrival(w, a, R.rnd(1.2, 1.8), false);
    holger.doorCloseT = 0;
    return true;
  };
  SIM.gateRegular('holger', {
    arrive: function (w, p) {
      p.storyChapter = chapter(w);
      if (p.storyChapter === 'gift') p.parcel = 'books';
      // Kept books are still his: some days he visits them instead of
      // bringing his own.
      const f = w.memory.flags;
      if (f['holger-books-keep'] && f['holger-books-given'] && SCENE.canBrowse(w) && R.random() < 0.4) {
        p.ownBook = false; p.prefersSource = 'holger';
      }
    },
    arrivalLine: function (w) {
      const h = w.patrons.find(p => p.regularId === 'holger' && !p.seat);
      if (h && h.partner && h.partner.companionId === 'aksel')
        return w.memory.flags['holger-visit-done'] ? CAST.akselArrival.again : CAST.akselArrival.first;
      return w.patrons.some(p => p.regularId === 'holger' && p.parcel === 'books') ?
        'Holger comes in with a small box held carefully under one arm.' : null;
    }
  });
})();
