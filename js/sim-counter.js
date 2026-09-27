/* Café Hygge — Lunafreya's slow spells at the counter. When nobody needs her
   (no queue, orders, cups waiting, tables to clear or approved work) she
   sometimes pulls her stool out at the till and reads a book of her own, or
   does the crossword once Calandra's letter has reminded her of it; makes
   herself a small coffee (in the old shop mug, if it came downstairs); or
   rests her chin in her hand and watches the room. Each habit is offered
   after the day's chores (SIM._.counterHabits, sim-characters.js), runs on
   the café's own clock and ends as soon as somebody needs her: she marks her
   page, stands and turns back to the room. Nothing here is saved. */
(function () {
  'use strict';
  const R = SIM._, L = SCENE.L, SND = R.sound;
  const rnd = R.rnd, walker = R.walker;
  const BOOK = '#5a7a8a';   // her own paperback, slate blue
  function caption(w, line, o) { return R.caption(w, line, Object.assign({ actor: w.barista }, o)); }
  function captionFrom(w, pool, o) {
    const line = R.pickCaption(w, pool, { actor: w.barista });
    if (line) caption(w, line, o);
  }

  // Nobody needs her: service, clearing and approved work all come first.
  function quiet(w) {
    const b = w.barista;
    return w.shop.phase === 'open' && !w.moment && !b.orders.length && !w.queue.length &&
      !w.counterCups.length && !R.customerAtCounter(w) && !R.needsTableClear(w) && !R.projectPending(w);
  }
  // Small chores she gets up for: the fire, the candles, watering, the bowls.
  function choresWaiting(w) {
    const b = w.barista;
    return b.candlePending || b.wateringPending || (w.fire.wantsLog && !w.fire.claimed) ||
      w.catBowls.food < 0.34 || w.catBowls.water < 0.2;
  }
  function backToIdle(b) {
    b.state = 'idle'; b.stateT = 0; b.pose = 'stand'; b.heading = ''; b.idleT = rnd(5, 10);
  }
  const home = () => ({ x: L.baristaHome.x, y: L.baristaHome.y });
  // Later habits (sim-saira.js) share the same idea of a quiet spell.
  R.counterQuiet = quiet; R.counterChores = choresWaiting; R.counterBackToIdle = backToIdle;

  /* ---------- the stool: a book, or the crossword ---------- */

  const READ_START = [
    'Lunafreya pulls her stool out from under the counter and opens a book.',
    'Lunafreya perches behind the counter with a book, one ear on the door.',
    { text: 'Lunafreya reads one of her own books, down from the windowsill upstairs.',
      when: w => w.memory.life.homeUnpack.boxes >= 3 },
    { text: 'Lunafreya pulls her stool out, glances at the old sign underneath, and opens a book.',
      flags: ['cafe-named'] }
  ];
  const CROSSWORD_START = [
    'Lunafreya folds the newspaper to the crossword and finds a pencil.',
    'Lunafreya does the crossword at the counter. Nobody argues with her about it.'
  ];
  const CROSSWORD_THINK = [
    'Lunafreya taps the pencil against her chin: seven letters, something about the sea.',
    'Lunafreya fills in a clue, thinks better of it, and fills it in again.',
    'Lunafreya finishes a whole clue by herself, for once.'
  ];
  function startStool(w, b, kind) {
    b.state = 'stoolOut'; b.stateT = 0; b.stoolKind = kind;
    b.holding = kind === 'crossword' ? 'paper' : 'book'; b.bookColor = BOOK;
    b.path = [{ x: L.counterStool.x, y: L.counterStool.y }];
    return true;
  }
  function leaveStool(w, b, called) {
    const paper = b.stoolKind === 'crossword';
    b.reading = b.crossword = b.thinking = b.stool = false; b.pageTurn = 0;
    b.holding = paper ? 'paper' : 'book';           // carried back, tucked under the counter
    b.state = 'stoolUp'; b.stateT = 0;
    b.path = [home()];
    b.stoolNextT = w.t + rnd(45, 110);
    if (called && R.random() < 0.3) caption(w, paper ? 'Lunafreya folds the crossword away and stands, ready at the till.'
      : 'Lunafreya marks her page and stands, ready at the till.');
  }
  function updateStool(w, b, dt) {
    if (b.state === 'stoolOut') {
      if (!quiet(w)) { b.holding = null; backToIdle(b); return; }
      if (!walker(b, dt)) return;
      b.state = 'stoolSit'; b.stateT = 0; b.pose = 'sit'; b.facing = -1; b.heading = '';
      b.stool = true; b.placeItem = 'book';           // opened once seated (settlePosture)
      if (b.stoolKind === 'crossword') b.crossword = true; else b.reading = true;
      b.stoolDur = rnd(45, 110); b.pageT = rnd(7, 13); b.thinkT = rnd(3, 6);
      if (R.random() < 0.4) captionFrom(w, b.crossword ? CROSSWORD_START : READ_START, { holdState: true });
      return;
    }
    if (b.state === 'stoolSit') {
      b.pose = 'sit'; b.facing = -1; b.heading = '';
      b.pageTurn = Math.max(0, (b.pageTurn || 0) - dt);
      const called = !quiet(w) || choresWaiting(w);
      if (called || b.stateT >= b.stoolDur) { leaveStool(w, b, called); return; }
      if (b.low < 1) return;
      if (b.reading && (b.pageT -= dt) <= 0) {
        b.pageT = rnd(9, 18); b.pageTurn = 0.8; SND.pageTurn();
        if (R.random() < 0.08) caption(w, 'Lunafreya turns a page and glances at the door, out of habit.', { holdState: true });
      }
      if (b.crossword && (b.thinkT -= dt) <= 0) {
        b.thinking = !b.thinking; b.thinkT = b.thinking ? rnd(1.2, 2) : rnd(3, 7);
        if (b.thinking && R.random() < 0.15) captionFrom(w, CROSSWORD_THINK, { holdState: true });
      }
      return;
    }
    if (b.state === 'stoolUp' && walker(b, dt)) { b.holding = null; backToIdle(b); }
  }
  R.counterHabits.push({
    id: 'read', states: ['stoolOut', 'stoolSit', 'stoolUp'],
    offer: function (w, b) {
      if (!quiet(w) || choresWaiting(w) || w.t < (b.stoolNextT || 0) || R.random() >= 0.45) return false;
      return startStool(w, b, w.memory.flags['home-calandra-done'] && R.random() < 0.35 ? 'crossword' : 'read');
    },
    start: (w, b) => startStool(w, b, 'read'),
    update: updateStool
  });
  // The crossword shares the stool's states; this entry only lets the dev
  // harness ask for it by name.
  R.counterHabits.push({ id: 'crossword', states: [], offer: () => false,
    start: (w, b) => startStool(w, b, 'crossword'), update: function () {} });

  /* ---------- a coffee of her own ---------- */

  function mugSpot(w) {
    return { x: (SCENE.fullCounter(w) ? L.oldMug.full : L.oldMug.basic).x + 2, y: L.backBar.workY };
  }
  function pullSpot(w) {
    return { x: SCENE.fullCounter(w) ? L.machine.x + 22 : L.basic.machine.x + 14, y: L.backBar.workY };
  }
  const PULL = 2.2;
  function startCoffee(w, b) {
    if (!SCENE.hasFurniture(w, 'counter-equipment')) return false;
    b.cupNextT = w.t + rnd(300, 600);
    b.ownMug = !!w.memory.flags['luna-mug-cafe'];
    b.stateT = 0; b.pulled = false;
    if (b.ownMug) { b.state = 'mugFetch'; b.path = [mugSpot(w)]; }
    else { b.state = 'ownPull'; b.path = [pullSpot(w)]; }
    return true;
  }
  function putAway(w, b) {
    b.armUp = 0; b.stateT = 0; b.state = 'ownCupAway';
    b.path = b.ownMug ? [mugSpot(w)] : null;
    b.heading = 'up';
  }
  function updateCoffee(w, b, dt) {
    if (b.state === 'mugFetch') {
      if (!quiet(w) && !b.mugOut) { backToIdle(b); return; }
      if (!walker(b, dt)) { b.stateT = 0; return; }
      b.heading = 'up';
      if (b.stateT >= 0.5 && !b.mugOut) { b.mugOut = true; b.holding = 'mug'; SND.clink(0.8, 0.02); }
      if (b.stateT >= 0.8) { b.state = 'ownPull'; b.stateT = 0; b.path = [pullSpot(w)]; }
      return;
    }
    if (b.state === 'ownPull') {
      if (!b.pulled) {
        if (!quiet(w)) { if (b.mugOut) putAway(w, b); else backToIdle(b); return; }
        if (!walker(b, dt)) { b.stateT = 0; return; }
        const s = pullSpot(w);
        b.heading = 'up'; b.pulled = true; b.stateT = 0;
        b.steps = [{ x: s.x, act: 'pull', dur: PULL }]; b.stepIdx = 0;
        SND.espresso(PULL);
      }
      // The shot is a short atomic action; an arriving guest waits for it.
      b.heading = 'up';
      w.brew.active = true; w.brew.stage = 'pull'; w.brew.progress = Math.min(1, b.stateT / PULL);
      w.steamAcc += dt;
      while (w.steamAcc >= 0.16) {
        w.steamAcc -= 0.16;
        R.spawnSteam(w, L.machine.x + 16 + R.random() * 28, L.machine.y + 16);
      }
      if (b.stateT >= PULL) {
        b.pulled = false; b.steps = null;
        b.holding = b.ownMug ? 'mug' : 'cup'; SND.clink(0.6, 0.02);
        b.state = 'ownSip'; b.stateT = 0; b.sipT = rnd(1.5, 3); b.sipDur = rnd(18, 32); b.sipping = 0;
        b.sipNoted = false; b.path = [home()];
      }
      return;
    }
    if (b.state === 'ownSip') {
      if (!quiet(w)) { putAway(w, b); return; }
      if (b.path && b.path.length) { walker(b, dt); b.stateT = 0; return; }
      b.pose = 'stand'; b.heading = ''; b.facing = -1;
      if (!b.sipNoted && (b.sipNoted = true) && R.random() < 0.4) captionFrom(w, b.ownMug ? [
        { text: 'Lunafreya drinks a coffee from the old shop mug, standing up, out of habit.' },
        { text: 'Lunafreya drinks from the old shop mug and counts the chairs without meaning to.' }
      ] : [
        'Lunafreya pulls a small coffee for herself and drinks it while it is hot.',
        'Lunafreya has a coffee of her own at the counter, for once while it is hot.'
      ], { holdState: true });
      // A sip: lift (0.4 s), hold at the lips, lower; eased like a guest's.
      if (b.sipping > 0) {
        b.sipping += dt;
        const tp = b.sipping;
        let up = tp < 0.4 ? tp / 0.4 : tp < 0.9 ? 1 : Math.max(0, (1.3 - tp) / 0.4);
        b.armUp = up * up * (3 - 2 * up);
        if (tp >= 1.3) { b.sipping = 0; b.armUp = 0; }
      } else if ((b.sipT -= dt) <= 0) {
        b.sipping = 0.0001; b.sipT = rnd(4, 7); SND.sip();
      }
      if (b.stateT >= b.sipDur && !b.sipping) putAway(w, b);
      return;
    }
    if (b.state === 'ownCupAway') {
      // Set down on the back bar behind her (the mug in its own place), then
      // back to the till.
      if (b.path && b.path.length) { walker(b, dt); b.stateT = 0; return; }
      if (b.holding) {
        b.heading = 'up';
        if (b.stateT >= 0.4) { b.holding = null; b.mugOut = false; b.stateT = 0; SND.clink(0.7, 0.025); }
        return;
      }
      if (Math.hypot(b.x - L.baristaHome.x, b.y - L.baristaHome.y) > 1) { b.path = [home()]; return; }
      backToIdle(b);
    }
  }
  R.counterHabits.push({
    id: 'coffee', states: ['mugFetch', 'ownPull', 'ownSip', 'ownCupAway'],
    offer: function (w, b) {
      if (!quiet(w) || w.t < (b.cupNextT || 120) || R.random() >= 0.15) return false;
      return startCoffee(w, b);
    },
    start: startCoffee,
    update: updateCoffee
  });

  /* ---------- chin in hand ---------- */

  function startLean(w, b) {
    b.state = 'lean'; b.stateT = 0; b.leanDur = rnd(8, 16); b.leaning = false;
    b.path = Math.hypot(b.x - L.baristaHome.x, b.y - L.baristaHome.y) > 1 ? [home()] : null;
    return true;
  }
  function updateLean(w, b, dt) {
    if (!quiet(w)) { b.leaning = false; backToIdle(b); return; }
    if (b.path && b.path.length) { walker(b, dt); b.stateT = 0; return; }
    b.pose = 'stand'; b.heading = ''; b.facing = -1;
    if (!b.leaning) {
      b.leaning = true;
      if (R.random() < 0.35) captionFrom(w, [
        { text: 'Lunafreya rests her chin in her hand and listens to the rain.', requires: ['rain'] },
        { text: 'Lunafreya leans on the counter, chin in hand, and watches the fire for a while.', requires: ['fire'] },
        'Lunafreya leans on the counter, chin in hand, watching the room.'
      ], { holdState: true });
    }
    if (b.stateT >= b.leanDur) { b.leaning = false; backToIdle(b); }
  }
  R.counterHabits.push({
    id: 'lean', states: ['lean'],
    offer: function (w, b) {
      if (!quiet(w) || R.random() >= 0.12) return false;
      return startLean(w, b);
    },
    start: startLean,
    update: updateLean
  });
})();
