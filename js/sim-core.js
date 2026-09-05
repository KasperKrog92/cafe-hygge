/* Café Hygge — the simulation: patrons, barista, cat, weather, time */
(function () {
  'use strict';

  const SIM = (window.SIM = {});
  const L = SCENE.L;
  const LB = L.library;

  const DAY_SECONDS = 1440;          // one full day passes in 24 real minutes
  const DAY_MS = 86400000;           // a real calendar day — the ruler for bond continuity
  const START_HOUR = 8.4;
  const WIPE_RAIN = 0.3;             // above this, arrivals wipe wet shoes on the mat

  /* Pick the name style before appearance so strongly gender-coded details do
     not contradict it. Everything else stays independent and varied. */
  const PATRON_NAMES = {
    feminine: ['Freja', 'Astrid', 'Ida', 'Clara', 'Sofie', 'Maja', 'Ellen', 'Alma'],
    masculine: ['Søren', 'Mikkel', 'Emil', 'Anton', 'Johan', 'Viggo', 'Oskar', 'Karl']
  };
  const SKINS = ['#e8b48a', '#d99c6b', '#b57a4a', '#8a5a3a', '#f0c49a'];
  const HAIRS = ['#2a1a12', '#4a2f1c', '#8a5a2a', '#c9a04a', '#a5763f', '#5a5a5a', '#d9d2c0', '#8f4a35'];
  const TOPS = ['#a94f3f', '#4a7a5a', '#7a89a5', '#c9a04a', '#8a6a9a', '#6b7a55', '#b5654a', '#5a7a8a', '#9c4848'];
  const PANTS = ['#3d4a5c', '#4a3222', '#5a5a5a', '#6e4a33', '#2c3038'];
  const UMBRELLAS = ['#a94f3f', '#4a7a5a', '#3d4a5c', '#c9a04a'];

  const DRINKS = [
    { name: 'cappuccino',      icon: 'coffee',    prep: 'coffee_milk', kind: 'cup',    w: 3 },
    { name: 'cinnamon latte',  icon: 'coffee',    prep: 'coffee_milk', kind: 'cup',    w: 2.5 },
    { name: 'flat white',      icon: 'coffee',    prep: 'coffee_milk', kind: 'cup',    w: 2 },
    { name: 'espresso',        icon: 'coffee',    prep: 'coffee',      kind: 'cup',    w: 1.2 },
    { name: 'chamomile tea',   icon: 'tea',       prep: 'tea',         kind: 'teacup', w: 1.6 },
    { name: 'hot chocolate',   icon: 'cocoa',     prep: 'milk',        kind: 'cup',    w: 1.6 },
    { name: 'matcha latte',    icon: 'matcha',    prep: 'matcha_hot',  kind: 'matcha', w: 1.8 },
    { name: 'iced matcha',     icon: 'icedmatcha', prep: 'matcha_iced', kind: 'glass',  w: 1.4 },
    { name: 'cardamom bun',    icon: 'bun',       prep: 'food',        kind: 'plate',  w: 1.2 },
    { name: 'butter croissant', icon: 'croissant', prep: 'food',       kind: 'plate',  w: 1 }
  ];

  /* Seat-preference predicates keyed by a roster spec's `seat` string. The
     dev audit checks every regular's seat key resolves here. Wiring these into
     freeSeat for regular seating is Phase 1 — today Holger's firesideLeft is
     still matched by the inline check in sim-patrons.js. */
  const SEAT_PREFS = {
    firesideLeft:  function (s) { return s.armchair && s.facing === 1; },
    firesideRight: function (s) { return s.armchair && s.facing === -1; },
    windowPerch:   function (s) { return !!s.window; },
    nook:          function (s) { return !!s.nook; },
    artistStool:   function (s) { return !!s.artist; },
    diningTable:   function (s) { return !s.armchair && !s.nook && !s.window && !s.piano && !s.artist && s.table >= 0; }
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function withArticle(name) { return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  /* A regular's own line from a spec pool, or a generic fallback when that
     regular has no bespoke pool for the moment. Keeps the continuity captions
     (settle, patient-look, openers) data-driven with a graceful default. */
  function specLine(spec, key, fallback) {
    const pool = spec && spec.lines && spec.lines[key];
    return (pool && pool.length) ? pick(pool) : fallback;
  }
  function nameStyleFor(name) {
    if (PATRON_NAMES.feminine.indexOf(name) >= 0) return 'feminine';
    if (PATRON_NAMES.masculine.indexOf(name) >= 0) return 'masculine';
    return 'custom';   // every regular carries its own nameStyle via its spec
  }
  function holdingFor(kind) { return kind === 'plate' ? 'plate' : kind === 'glass' ? 'glass' : 'cup'; }
  function pickDrink() {
    let total = 0;
    DRINKS.forEach(function (d) { total += d.w; });
    let r = Math.random() * total;
    for (const d of DRINKS) { r -= d.w; if (r <= 0) return d; }
    return DRINKS[0];
  }

  let nextId = 1;

  /* ---------- world ---------- */

  SIM.create = function () {
    const world = {
      t: 0,
      hour: START_HOUR,
      pal: SCENE.dayPalette(START_HOUR),
      daylight: 1,
      rain: 0.55, rainTarget: 0.55, weatherT: rnd(120, 300),
      storm: false, flash: 0, thunderT: rnd(25, 75), thunderIn: 0,
      passersby: [], passerT: rnd(4, 12),
      lastWholeHour: Math.floor(START_HOUR), clockHour: START_HOUR,
      kettle: { day: 0, hour: rnd(19, 21.5), firedDay: -1 },
      door: { open: 0, target: 0, jiggle: 0 },
      patrons: [],
      queue: [],
      counterCups: [],
      umbrellaStand: [],
      catBowls: { food: 1, water: 1 },
      particles: [],
      tables: L.tables.map(function (tb) {
        return { x: tb.x, y: tb.y, tag: tb.tag, items: [], candle: 0, candleTarget: 0 };
      })
        .concat(LB.sideTables.map(function (st) {
          return { x: st.x, y: st.y, tag: 'in the reading nook', small: true,
            busVia: st.busVia, items: [], candle: 0, candleTarget: 0 };
        }))
        .concat(L.winTables.map(function (wt) {
          // y = tabletop (items/steam), base = floor line; reach keeps both
          // sitters' cups on the slim top
          return { x: wt.x, y: wt.y, base: wt.base, tag: 'in the window',
            tall: true, reach: 12, items: [], candle: 0, candleTarget: 0 };
        }))
        .concat([{
          x: L.artist.table.saucer.x, y: L.artist.table.saucer.y, base: L.artist.table.base,
          tag: 'at the easel', artist: true, busVia: L.artist.table.busVia, reach: 0,
          items: [], candle: 0, candleTarget: 0
        }, {
          x: L.piano.saucer.x, y: L.piano.saucer.y, base: L.piano.baseline,
          tag: 'at the piano', piano: true, busVia: L.piano.via, reach: 0,
          items: [], candle: 0, candleTarget: 0
        }]),
      seats: [],
      barista: makeBarista(),
      cat: makeCat(),
      brew: { active: false, stage: '', progress: 0 },
      captionQueue: [],
      captionScript: [],       // a story beat's caption run (priority over ambient)
      activeCaption: null,
      lastCapT: -10,
      memory: null,            // the MEMORY save, bound by reconcileNarrative at boot
      spawnT: rnd(4, 9),
      regulars: buildRegulars(),
      sleeper: null,
      pianoNextT: 0,
      noraPianoNextT: rnd(600, 1200),
      wasLampOn: false,
      steamAcc: 0,
      wateredDay: -1,
      candles: { mantel: 0, mantelTarget: 0, wasDark: false, forceRound: false },
      // The hearth as a slow, living thing: a log burns down to embers over
      // minutes (never fully out), then — after a patient grace — Nora or a
      // fireside regular lays a fresh one and it climbs again. `level` is the
      // live burn 0..1 (read by art, glow, and crackle audio); `target` is
      // what it eases toward (a log sets it to 1). See updateFire / addLog.
      fire: { level: 0.85, target: 0.85, wantsLog: false, claimed: false, graceT: 0 }
    };

    // seats: two stools per table + the fireside armchairs + the nook chairs
    // (each nook chair pairs with its own side table for the sitter's drink);
    // small side tables and tall window tables seat no one themselves
    world.tables.forEach(function (tb, ti) {
      if (tb.small || tb.tall || tb.piano || tb.artist) return;
      [-1, 1].forEach(function (side) {
        world.seats.push({
          x: tb.x + side * L.stoolDX, y: tb.y + L.stoolDY + 4,
          facing: -side, table: ti, side: side, armchair: false, taken: false
        });
      });
    });
    L.armchairs.forEach(function (a) {
      world.seats.push({ x: a.x + 6 * a.dir, y: a.y, facing: a.dir, table: -1, side: 0, armchair: true, taken: false });
    });
    LB.chairs.forEach(function (c, i) {
      world.seats.push({
        x: c.x + 6 * c.dir, y: c.y, facing: c.dir,
        table: L.tables.length + i, side: 0, armchair: false, nook: true, taken: false
      });
    });
    // window perches: two per window, sharing that window's tall table
    L.winSeats.forEach(function (s) {
      world.seats.push({
        x: s.x, y: s.y, facing: -s.side,
        perchX: s.perchX, perchY: s.perchY, via: s.via,
        table: L.tables.length + LB.sideTables.length + s.win,
        side: s.side, armchair: false, window: true, taken: false
      });
    });
    // Append: boot-seeded regulars intentionally keep their historical seat
    // indices (10 and 12).
    world.seats.push({
      x: L.artist.stool.x, y: L.artist.stool.y, facing: L.artist.stool.facing,
      via: L.artist.stool.via,
      table: world.tables.length - 2, side: 0, armchair: false,
      artist: true, taken: false
    });
    world.seats.push({
      x: L.piano.bench.x, y: L.piano.bench.y, facing: -1,
      via: L.piano.via,
      table: world.tables.length - 1, side: 0, armchair: false,
      piano: true, taken: false
    });

    // a few patrons are already settled in
    // (seat 10 = the first nook chair, 12 = the first window perch)
    seedPatron(world, 1);
    seedPatron(world, 10);
    seedPatron(world, 12);

    // the street is never quite empty at boot
    spawnPasser(world, { x: rnd(STREET.x0 + 40, STREET.x1 - 40) });

    // bind persistent memory and reconcile the save before the first frame
    reconcileNarrative(world);

    // and one familiar face already by the fire, so the café opens onto someone
    // you recognise. His schedule is marked done-for-today inside seedRegular so
    // updateRegulars never brings a second Holger the same café day.
    const holger = CAST.regulars.find(function (r) { return r.id === 'holger'; });
    if (holger) seedRegular(world, holger);

    return world;
  };

  function seedPatron(world, seatIdx) {
    const p = makePatron();
    const seat = world.seats[seatIdx];
    p.laptop = !p.wantsBook && Math.random() < 0.16;
    seat.taken = true;
    p.seat = seat;
    p.x = seat.x; p.y = seat.y;
    if (seat.window) { p.x = seat.perchX; p.y = seat.perchY; }
    p.facing = seat.facing;
    p.pose = 'sit';
    p.state = 'seated';
    p.stay = rnd(60, 160);
    if (seat.table >= 0) {
      world.tables[seat.table].items.push({ side: seat.side, kind: p.drink.kind, owner: p.id,
        hot: p.drink.kind === 'glass' ? 0 : 30, hidden: false });
      p.laptopActive = p.laptop && !seat.nook && !seat.window;
      if (p.laptopActive) {
        world.tables[seat.table].items.push({ side: seat.side, kind: 'laptop', owner: p.id, open: true, hot: 0, hidden: false });
      }
    }
    if (seat.armchair || seat.nook) {
      p.reading = true;
      p.hasShelfBook = !!seat.nook;   // the nook regular borrowed theirs
    }
    world.patrons.push(p);
  }

  /* Seed a roster regular already in their usual seat at boot (Phase 3). Builds
     via makeRegular so the fixed look/drink/traits are exact, drops them into a
     free preferred seat exactly as a walk-in would end up, and marks today's
     schedule done so updateRegulars never spawns a second copy the same café
     day. Set-dressing only: no arrival caption, no bond bump — recognition
     accrues on the arrivals the reader is present to see (updateRegulars). */
  function seedRegular(world, spec, seat) {
    const pref = SEAT_PREFS[spec.seat];
    seat = seat || world.seats.find(function (s) { return !s.taken && pref && pref(s); });
    if (!seat) return null;                 // usual seat busy at boot → skip gracefully
    const p = makeRegular(world, spec);
    p.umbrella = null;                      // already inside; no phantom umbrella
    seat.taken = true;
    p.seat = seat;
    p.usualSeat = true;
    p.x = seat.x; p.y = seat.y;
    if (seat.window) { p.x = seat.perchX; p.y = seat.perchY; }
    p.facing = seat.facing;
    p.pose = 'sit';
    p.state = 'seated';
    p.stay = rnd(spec.stay[0], spec.stay[1]);
    if (seat.table >= 0) {
      world.tables[seat.table].items.push({ side: seat.side, kind: p.drink.kind, owner: p.id,
        hot: p.drink.kind === 'glass' ? 0 : 30, hidden: false });
      p.laptopActive = p.laptop && !seat.armchair && !seat.nook && !seat.window && !seat.piano && !seat.artist;
      if (p.laptopActive) {
        world.tables[seat.table].items.push({ side: seat.side, kind: 'laptop', owner: p.id, open: true, hot: 0, hidden: false });
      }
    }
    if (seat.armchair || seat.nook) {
      p.reading = true;
      p.hasShelfBook = !!seat.nook;
    }
    world.patrons.push(p);
    const r = world.regulars[spec.id];
    if (r) r.lastDay = dayIndex(world);     // done for today: no double arrival
    return p;
  }

  function makePatron(requestedName) {
    const drink = pickDrink();
    const wantsBook = Math.random() < 0.35;
    const pianist = !wantsBook && Math.random() < 0.1;
    const nameStyle = requestedName ? nameStyleFor(requestedName) : (Math.random() < 0.5 ? 'feminine' : 'masculine');
    return {
      id: nextId++,
      kind: 'patron',
      name: requestedName || pick(PATRON_NAMES[nameStyle]),
      nameStyle: nameStyle,
      colors: {
        skin: pick(SKINS), hair: pick(HAIRS), top: pick(TOPS), pants: pick(PANTS),
        scarf: Math.random() < 0.4 ? pick(TOPS) : null,
        longHair: Math.random() < 0.4,
        hairStyle: (Math.random() * 4) | 0,   // 0 classic, 1 side-part, 2 curly, 3 bun
        beard: nameStyle === 'masculine' && Math.random() < 0.3
      },
      drink: drink,
      wantsBook: wantsBook,
      ownBook: Math.random() < 0.45,     // readers: brought one vs. borrowing
      hasShelfBook: false,
      browseDur: 0, afterBook: '', resumeReading: false,
      chatty: Math.random() < 0.55,
      murmurPitch: rnd(125, 235),
      x: L.doorSpot.x, y: L.doorSpot.y,
      facing: 1, heading: '', pose: 'stand', animT: rnd(0, 5),
      speed: rnd(46, 60),
      path: null, state: 'idle', stateT: 0,
      holding: null, armUp: 0, reading: false,
      seat: null, stay: 0,
      sipT: rnd(4, 10), sipPhase: 0, sipPlayed: false, matchaSipCaptioned: false,
      pageT: rnd(6, 16), chatT: rnd(8, 20), chatReply: 0,
      umbrella: null, umbrellaParked: false, shakeDropT: 0, shakeDrops: 0,
      wipeDropT: 0, wipeDrops: 0, wipePlayed: false,
      laptop: false, laptopActive: false, laptopPacked: false,
      typing: false, typingT: rnd(6, 14), typingRemain: 0, keyT: 0,
      pianist: pianist, playing: false, pianoBursts: 0,
      pianoPlayT: 0, pianoRestT: 0, pianoSipPaused: false,
      partner: null, coupleStay: 0, coupleBus: null, coupleLeaveAt: 0,
      orderCaptioned: false, pairCaptioned: false,
      dozing: false, dozeT: rnd(50, 120), dozeRemain: 0, zzzT: rnd(7, 14),
      isRegular: false, regularId: null, usualSeat: false, regularSeatNoted: false,
      knitting: false, knitT: rnd(1.5, 4), knitProgress: 0, knitColor: null,
      artist: false, painting: false, paintMixing: false,
      paintT: rnd(5, 12), paintRemain: 0, brushT: 0, sketching: false,
      firePlaced: false,
      gazeT: rnd(15, 40), gazeDur: 0, gazeFacing: 0,
      lapCat: false, catLeaveT: 0,
      bubble: null, queueIdx: -1, waitIdx: -1, doorCloseT: 0
    };
  }

  function makeBarista() {
    return {
      kind: 'barista', name: 'Nora',
      colors: { skin: '#e8b48a', hair: '#4a2f1c', top: '#5a7a8a', pants: '#3d4a5c', apron: true, longHair: true, scarf: null, hairStyle: 1 },
      x: L.baristaHome.x, y: L.baristaHome.y,
      facing: -1, heading: '', pose: 'stand', animT: 0,
      speed: 60, path: null,
      state: 'idle', stateT: 0, idleT: rnd(4, 9), emptyT: 0,
      holding: null, armUp: 0, reading: false, playing: false,
      orders: [], steps: null, stepIdx: 0, busTarget: null,
      chalkT: rnd(600, 1200), chalkPlayed: 0,
      wateringPending: false, candlePending: false, forcedTask: ''
    };
  }

  function makeCat() {
    return {
      kind: 'cat', state: 'sleep', stateT: rnd(20, 50), animT: 0,
      x: 390, y: 294, facing: -1, path: null, speed: 32,
      surface: 'floor', target: L.catSpots[0], intent: '',
      hopFrom: null, hopTo: null, hopT: 0, hopDur: 0, hopQueue: null,
      hungerT: rnd(420, 720), thirstT: rnd(500, 800), retryNeedT: 0,
      counterT: rnd(1200, 2400), ascentT: rnd(900, 1600), moteT: rnd(180, 420),
      gazeT: rnd(15, 40), gazeDur: 0, gazeFacing: 0,
      lapPatron: null, sniffedPass: false, foodComaT: 0,
      doorGlanceT: 0, doorFacing: 0, forced: '',
      scarf: null,                       // set for good once Gerda's scarf arc completes
      bubble: null, purrT: rnd(6, 15), spotName: 'fire rug'
    };
  }

  /* ---------- captions ---------- */

  function caption(world, text) {
    if (world.captionQueue.length < 2) world.captionQueue.push(text);
  }

  /* A story beat's caption run (docs/narrative.md §2). Unlike ambient captions
     — soft, capped at 2, first-come — these are the few deliberate lines a
     chosen beat plays, so they queue in order on a separate track that drains
     ahead of ambience and is never dropped by the 2-line cap. Still paced by
     the shared limiter, so a beat reads as an unhurried run, not a dump. */
  function captionRun(world, lines) {
    if (!lines || !lines.length) return;
    lines.forEach(function (line) { world.captionScript.push(line); });
  }

  function updateCaptions(world, dt) {
    if (world.activeCaption && world.t - world.activeCaption.born > 4.4) world.activeCaption = null;
    if (!world.activeCaption && world.t - world.lastCapT > 6) {
      // a beat run takes precedence over ambient chatter, then the queue
      if (world.captionScript.length) {
        world.activeCaption = { text: world.captionScript.shift(), born: world.t };
        world.lastCapT = world.t;
      } else if (world.captionQueue.length) {
        world.activeCaption = { text: world.captionQueue.shift(), born: world.t };
        world.lastCapT = world.t;
      }
    }
  }

  /* ---------- movement ---------- */

  // Feet-space obstacles, with room for shoulders and a small floor margin.
  // Even low tables block shortcuts: depth sorting alone isn't a walkable gap.
  const walkBoxes = L.occluders.map(function (o) {
    return { x0: o.x0, x1: o.x1, y0: o.top, y1: o.baseline };
  }).concat(L.footprints).map(function (b) {
    return { x0: b.x0 - 10, x1: b.x1 + 10, y0: b.y0 - 2, y1: b.y1 + 2 };
  });

  function insideWalkBox(p, b) {
    return p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;
  }

  // Exact slab intersection, including diagonal paths (no sampling gaps).
  function walkHits(a, z, b) {
    let lo = 0, hi = 1;
    for (const axis of ['x', 'y']) {
      const d = z[axis] - a[axis];
      if (Math.abs(d) < 0.000001) {
        if (a[axis] <= b[axis + '0'] || a[axis] >= b[axis + '1']) return false;
      } else {
        const t0 = (b[axis + '0'] - a[axis]) / d;
        const t1 = (b[axis + '1'] - a[axis]) / d;
        lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
        if (lo >= hi) return false;
      }
    }
    return hi > 0 && lo < 1;
  }

  function walkClear(a, b, boxes) {
    return !boxes.some(function (box) { return walkHits(a, b, box); });
  }

  const walkCorners = [];
  walkBoxes.forEach(function (b) {
    [b.x0 - 1, b.x1 + 1].forEach(function (x) {
      [b.y0 - 1, b.y1 + 1].forEach(function (y) {
        const p = { x: x, y: y };
        if (x >= 22 && x <= L.W - 22 && y >= L.wallY && y <= 566 &&
            !walkBoxes.some(function (box) { return insideWalkBox(p, box); })) walkCorners.push(p);
      });
    });
  });

  function makePath(e, tx, ty) {
    const start = { x: e.x, y: e.y }, end = { x: tx, y: ty };
    // Sitting/standing up is allowed through one's own furniture. All other
    // furniture stays solid. Authored counter work uses separate staff paths.
    const boxes = walkBoxes.filter(function (b) {
      return !insideWalkBox(start, b) && !insideWalkBox(end, b);
    });
    if (walkClear(start, end, boxes)) { e.path = [end]; return; }
    const nodes = [start, end].concat(walkCorners);
    const costs = nodes.map(function () { return Infinity; }), prev = [], done = [];
    costs[0] = 0;
    for (let n = 0; n < nodes.length; n++) {
      let at = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (!done[i] && (at < 0 || costs[i] < costs[at])) at = i;
      }
      if (at < 0 || !isFinite(costs[at]) || at === 1) break;
      done[at] = true;
      for (let j = 1; j < nodes.length; j++) {
        if (done[j]) continue;
        const cost = costs[at] + Math.hypot(nodes[j].x - nodes[at].x, nodes[j].y - nodes[at].y);
        if (cost < costs[j] && walkClear(nodes[at], nodes[j], boxes)) {
          costs[j] = cost; prev[j] = at;
        }
      }
    }
    const path = [];
    if (isFinite(costs[1])) {
      for (let i = 1; i !== 0; i = prev[i]) path.unshift({ x: nodes[i].x, y: nodes[i].y });
    }
    // Invalid dev destinations must never cause a straight walk through a wall.
    e.path = path;
  }

  function smoothPath(e) {
    // Keep authored interaction approaches, but omit aisle detours wherever
    // the entire shortcut is clear. Never exempt endpoint furniture here.
    let from = e;
    for (let i = 0; i < e.path.length; i++) {
      for (let j = e.path.length - 1; j > i; j--) {
        if (walkClear(from, e.path[j], walkBoxes)) { e.path.splice(i, j - i); break; }
      }
      from = e.path[i];
    }
  }

  function walker(e, dt) {
    if (e.path && e._walkPath !== e.path) { smoothPath(e); e._walkPath = e.path; }
    // Spend the whole movement budget across corners; tiny remaining legs
    // must not teleport or insert a frame-rate-dependent pause.
    let budget = Math.max(0, e.speed * dt);
    while (e.path && e.path.length) {
      const target = e.path[0];
      const dx = target.x - e.x, dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.0001) { e.path.shift(); continue; }
      if (budget <= 0) break;
      const step = Math.min(budget, dist);
      e.x += dx / dist * step; e.y += dy / dist * step;
      e.walkDistance = (e.walkDistance || 0) + step;
      budget -= step;
      if (Math.abs(dx) > 0.6) { e.facing = dx > 0 ? 1 : -1; e.heading = ''; }
      else if (dy > 24) e.heading = 'down';
      else if (dy < -24) e.heading = 'up';
      e.pose = 'walk';
      if (step < dist) return false;
      e.x = target.x; e.y = target.y; e.path.shift();
    }
    if (!e.path || !e.path.length) {
      e.pose = e.pose === 'sit' ? 'sit' : 'stand'; e.heading = ''; return true;
    }
    return false;
  }

  /* ---------- door ---------- */

  function ringDoor(world) {
    world.door.target = 1;
    world.door.jiggle = 1;
    SND.doorBell();
    const cat = world.cat;
    if (cat && cat.surface === 'floor' && cat.state !== 'sleep' && cat.state !== 'hop') {
      cat.doorGlanceT = 2;
      cat.doorFacing = cat.facing;
      cat.facing = L.doorSpot.x < cat.x ? -1 : 1;
    }
    if (world.sleeper && world.sleeper.dozing && Math.random() < 0.25) {
      const p = world.sleeper;
      p.dozing = false;
      p.reading = true;
      p.resumeReading = false;
      p.dozeT = rnd(70, 140);
      world.sleeper = null;
      if (Math.random() < 0.5) caption(world, p.name + ' blinks awake and finds the line again.');
    }
  }

  function updateDoor(world, dt) {
    const d = world.door;
    let near = false;
    world.patrons.forEach(function (p) {
      if (Math.hypot(p.x - L.doorSpot.x, p.y - L.doorSpot.y) < 44 &&
          (p.state === 'enter' || p.state === 'enterDelay' || p.state === 'wipeFeet' ||
           p.state === 'shake' || p.state === 'parkUmbrella' ||
           p.state === 'collectUmbrella' || p.state === 'exit')) near = true;
    });
    d.target = near ? 1 : 0;
    d.open += (d.target - d.open) * Math.min(1, dt * 5);
    if (d.jiggle > 0) d.jiggle = Math.max(0, d.jiggle - dt * 0.8);
  }

  /* ---------- weather & time ---------- */

  function updateWeather(world, dt) {
    world.weatherT -= dt;
    if (world.weatherT <= 0) {
      world.weatherT = rnd(150, 420);
      const r = Math.random();
      const next = r < 0.34 ? 0 : r < 0.68 ? 0.4 : r < 0.92 ? 0.8 : 1;
      const enabled = SND.settings.rain !== false;
      const wasStorm = world.storm;
      world.storm = enabled && next === 1;
      if (enabled) {
        if (world.storm && !wasStorm) caption(world, 'the sky darkens; a storm settles over the street.');
        else if (next > 0.5 && world.rainTarget < 0.2) caption(world, 'Rain begins to patter against the window.');
        else if (next < 0.1 && world.rainTarget > 0.3) caption(world, 'The rain lets up outside.');
        else if (next > 0.2 && next < 0.5 && world.rainTarget > 0.6) caption(world, 'The rain softens to a drizzle.');
      }
      // A storm rolled while weather was disabled comes back as ordinary
      // heavy rain if the owner restores the toggle before the next re-roll.
      world.rainTarget = !enabled && next === 1 ? 0.8 : next;
      if (world.storm && !wasStorm) world.thunderT = rnd(25, 75);
    }

    const enabled = SND.settings.rain !== false;
    if (!enabled) {
      world.storm = false;
      world.rainTarget = Math.min(0.8, world.rainTarget);
      world.thunderT = 0; world.thunderIn = 0; world.flash = 0;
    } else {
      world.flash = Math.max(0, world.flash - dt * 4);
    }

    const effTarget = enabled ? world.rainTarget : 0;
    world.rain += (effTarget - world.rain) * Math.min(1, dt * 0.18);

    // Lightning and thunder share the sim clock: the cool flash arrives first,
    // then distance is heard as a one-to-four-second delay before the rumble.
    if (world.storm && world.rain > 0.6) {
      if (world.thunderIn > 0) {
        world.thunderIn -= dt;
        if (world.thunderIn <= 0) {
          world.thunderIn = 0;
          SND.thunder();
        }
      } else {
        world.thunderT -= dt;
        if (world.thunderT <= 0) {
          world.flash = 1;
          world.thunderIn = rnd(1, 4);
          world.thunderT = rnd(25, 75);
        }
      }
    } else if (!world.storm) {
      world.thunderIn = 0;
    }
  }

  /* ---------- passers-by (the street beyond the glass) ---------- */

  /* Silhouettes crossing the panes in master-canvas x: the wall between the
     windows hides the middle of the walk, so a figure leaves one pane and
     reappears in the other a few seconds later. Scenery, not characters —
     they never come in — but dt-driven here so hidden tabs keep the street
     alive. Drawn by drawPassersby in scene-bg.js, clipped inside the glass. */
  const STREET = { x0: 96, x1: 628 };

  function makePasser(world, dir, x, opts) {
    opts = opts || {};
    const hurried = world.rain > 0.55 && Math.random() < 0.8;
    const p = {
      x: x, dir: dir,
      speed: rnd(30, 44) * (hurried ? rnd(1.25, 1.5) : 1),
      h: Math.round(rnd(38, 46)),
      animT: rnd(0, 5),
      hurried: hurried, pausing: false,
      umbrella: null, mate: null,
      pauseX: 0, pauseT: 0, glanced: false
    };
    const wantsUmbrella = 'umbrella' in opts
      ? !!opts.umbrella
      : world.rain > 0.15 && Math.random() < 0.45 + world.rain * 0.5;
    if (wantsUmbrella) p.umbrella = { color: pick(UMBRELLAS) };
    // fair-weather strollers sometimes slow mid-pane for a look at the room —
    // only at a pane still ahead of them, so no one stops behind the wall
    if ('pause' in opts ? opts.pause : !hurried && Math.random() < 0.14) {
      const ahead = [L.win, L.win2].filter(function (win) {
        return dir > 0 ? x < win.x : x > win.x + win.w;
      });
      if (ahead.length) {
        const win = pick(ahead);
        p.pauseX = win.x + rnd(20, win.w - 20);
        p.pauseT = rnd(1.4, 2.8);
      }
    }
    return p;
  }

  function spawnPasser(world, opts) {
    opts = opts || {};
    const dir = opts.dir || (Math.random() < 0.5 ? 1 : -1);
    const x = 'x' in opts ? opts.x : dir > 0 ? STREET.x0 : STREET.x1;
    const p = makePasser(world, dir, x, opts);
    if ('pair' in opts ? opts.pair : Math.random() < 0.18) {
      p.mate = { dx: -dir * Math.round(rnd(10, 13)), h: Math.max(35, p.h - Math.round(rnd(2, 6))) };
    }
    world.passersby.push(p);
    return p;
  }

  function passerGap(world) {
    if (world.hour >= 22.5 || world.hour < 6) return rnd(55, 140);   // the odd night owl
    const gap = rnd(9, 20) + (1 - world.daylight) * rnd(6, 20);
    return world.storm ? gap * 2 : gap;
  }

  function updatePassersby(world, dt) {
    world.passerT -= dt;
    if (world.passerT <= 0) {
      world.passerT = passerGap(world);
      if (world.passersby.length < 4) spawnPasser(world);
    }
    for (let i = world.passersby.length - 1; i >= 0; i--) {
      const p = world.passersby[i];
      p.animT += dt;
      p.pausing = p.pauseT > 0 && (p.dir > 0 ? p.x >= p.pauseX : p.x <= p.pauseX);
      if (p.pausing) {
        p.pauseT -= dt;
        if (!p.glanced) {
          p.glanced = true;
          if (Math.random() < 0.18) caption(world, 'someone slows on the pavement outside, peeking in.');
        }
      } else {
        p.x += p.dir * p.speed * dt;
      }
      if (p.x < STREET.x0 - 30 || p.x > STREET.x1 + 30) world.passersby.splice(i, 1);
    }
  }

  function updateClock(world, dt) {
    world.hour = (START_HOUR + (world.t / DAY_SECONDS) * 24) % 24;
    world.pal = SCENE.dayPalette(world.hour);
    world.daylight = world.pal.daylight;
    const lampOn = world.pal.lamp > 0.5;
    if (lampOn && !world.wasLampOn) caption(world, 'The streetlamps flicker on, one by one.');
    if (!lampOn && world.wasLampOn) caption(world, 'Morning light spills across the floorboards.');
    world.wasLampOn = lampOn;

    const whole = Math.floor(world.hour);
    const advance = (world.hour - world.clockHour + 24) % 24;
    const jumped = dt <= 0 || advance > 1.5;
    if (!jumped && whole !== world.lastWholeHour) {
      if (whole === 12) {
        SND.churchBells();
        if (Math.random() < 0.5) caption(world, 'noon — the church bells, from across the street.');
      } else if ([9, 15, 18, 21].indexOf(whole) >= 0) {
        SND.mantelChime();
      }
    }
    world.lastWholeHour = whole;
    world.clockHour = world.hour;

    const day = dayIndex(world);
    if (world.kettle.day !== day) {
      world.kettle.day = day;
      world.kettle.hour = rnd(19, 21.5);
      world.kettle.firedDay = -1;
    }
    if (jumped) {
      // Clock jumps show their destination without replaying a missed evening.
      if (world.hour >= world.kettle.hour) world.kettle.firedDay = day;
    } else if (world.kettle.firedDay !== day && world.hour >= world.kettle.hour) {
      world.kettle.firedDay = day;
      SND.kettleWhistle();
      if (Math.random() < 0.6) caption(world, 'a kettle sings, somewhere in the back.');
    }
  }

  function dayIndex(world) {
    return Math.floor((START_HOUR + world.t / DAY_SECONDS * 24) / 24);
  }

  function candleTables(world) {
    return world.tables.filter(function (tb) { return !tb.tall && !tb.piano && !tb.artist; });
  }

  function snapCandles(world) {
    const dark = world.daylight < 0.5;
    const value = dark ? 1 : 0;
    candleTables(world).forEach(function (tb) {
      tb.candle = value;
      tb.candleTarget = value;
    });
    world.candles.mantel = value;
    world.candles.mantelTarget = value;
    world.candles.wasDark = dark;
    world.candles.forceRound = false;
    world.barista.candlePending = false;
  }

  function updateCandles(world, dt) {
    const c = world.candles;
    const dark = world.daylight < 0.5;
    const tables = candleTables(world);

    if (dark && !c.wasDark) {
      world.barista.candlePending = tables.some(function (tb) { return tb.candle < 0.95; }) || c.mantel < 0.95;
    } else if (!dark && c.wasDark) {
      world.barista.candlePending = false;
      c.forceRound = false;
      if (Math.random() < 0.35) caption(world, 'Morning light; the candles get to rest.');
    }

    if (!dark && !c.forceRound) {
      tables.forEach(function (tb) { tb.candleTarget = 0; });
      c.mantelTarget = 0;
    }

    const rise = dt / 2;
    const fall = dt / 60;
    tables.forEach(function (tb) {
      const step = tb.candleTarget > tb.candle ? rise : fall;
      if (tb.candle < tb.candleTarget) tb.candle = Math.min(tb.candleTarget, tb.candle + step);
      else if (tb.candle > tb.candleTarget) tb.candle = Math.max(tb.candleTarget, tb.candle - step);
    });
    const mantelStep = c.mantelTarget > c.mantel ? rise : fall;
    if (c.mantel < c.mantelTarget) c.mantel = Math.min(c.mantelTarget, c.mantel + mantelStep);
    else if (c.mantel > c.mantelTarget) c.mantel = Math.max(c.mantelTarget, c.mantel - mantelStep);

    if (dark && (tables.some(function (tb) { return tb.candleTarget < 1; }) || c.mantelTarget < 1)) {
      world.barista.candlePending = true;
    }
    c.wasDark = dark;
  }

  /* ---------- the hearth ---------- */

  const FIRE_EMBER = 0.16;    // the coals never die below this — always a glow
  const FIRE_LOW = 0.34;      // under this the hearth wants a fresh log — eventually
  const FIRE_BURN = 0.0038;   // target decay/s: a full log settles to embers in ~3 min
  const FIRE_EASE = 0.55;     // level eases toward target/s (a fresh log catches over ~2 s)

  /* The fire lives on its own slow clock (docs/world.md): the burn eases toward
     a target that decays as the log spends itself, bottoming out at a warm
     ember floor rather than going dark. Once it has sat low a patient random
     grace, `wantsLog` goes up — the signal Nora's idle care and a fireside
     regular both watch. It is fine for the fire to rest at embers a while
     first; nothing here nags. */
  function updateFire(world, dt) {
    const f = world.fire;
    if (!f) return;
    f.target = Math.max(FIRE_EMBER, f.target - dt * FIRE_BURN);
    f.level += (f.target - f.level) * Math.min(1, dt * FIRE_EASE);
    if (f.level < FIRE_LOW && !f.wantsLog && !f.claimed) {
      if (f.graceT <= 0) f.graceT = rnd(20, 110);
      else {
        f.graceT -= dt;
        if (f.graceT <= 0) f.wantsLog = true;
      }
    } else if (f.level >= FIRE_LOW) {
      f.graceT = 0;   // it climbed back up — reset the patience clock
    }
  }

  /* A fresh log lands: the burn target jumps to full so the fire climbs over a
     couple of seconds, a shower of sparks flies as it catches, and the soft
     whoomph plays. Shared by Nora's fire-tending and Holger's (sim-characters /
     sim-patrons), so who lays the log never changes what it does. */
  function addLog(world) {
    const f = world.fire;
    if (!f) return;
    f.target = 1;
    f.level = Math.min(1, f.level + 0.15);   // a small immediate catch, then the climb
    f.wantsLog = false;
    f.claimed = false;
    f.graceT = 0;
    for (let i = 0; i < 12; i++) {
      world.particles.push({
        type: 'spark',
        x: L.fire.boxX + 6 + Math.random() * (L.fire.boxW - 12),
        y: L.fire.boxBot - (10 + Math.random() * 16),
        vy: -(30 + Math.random() * 40), age: 0, life: rnd(0.35, 0.8), seed: 0
      });
    }
    if (window.SND) SND.fireCatch();
  }

  /* ---------- spawning ---------- */

  function spawnCap(world) {
    if (world.hour >= 23 || world.hour < 6) return 2;
    return world.daylight > 0.3 ? 7 : 4;
  }

  function applyArrivalTraits(world, p) {
    const night = world.hour >= 21 || world.hour < 7;
    if (!p.wantsBook && !p.pianist && Math.random() < (night ? 0.06 : 0.16)) p.laptop = true;
    if (world.rain > 0.4 && Math.random() < 0.75) {
      p.umbrella = { color: pick(UMBRELLAS) };
    }
    return p;
  }

  function enqueueArrival(world, p, delay, ring) {
    p.queueIdx = world.queue.length;
    world.queue.push(p);
    world.patrons.push(p);
    p.doorCloseT = ring ? 1.1 : (delay ? delay + 1.1 : 0);
    if (delay) {
      p.state = 'enterDelay';
      p.stateT = -delay;
    } else if (world.rain > WIPE_RAIN) {
      p.state = 'wipeFeet';   // wet arrivals scuff off on the mat first
      p.stateT = 0;
    } else if (p.umbrella) {
      p.state = 'shake';
      p.stateT = 0;
    } else {
      p.state = 'enter';
      const slot = queueSlot(p.queueIdx);
      makePath(p, slot.x, slot.y);
    }
    if (ring) ringDoor(world);
    return p;
  }

  function spawnCouple(world, opts) {
    opts = opts || {};
    const a = makePatron(), b = makePatron();
    applyArrivalTraits(world, a); applyArrivalTraits(world, b);
    a.partner = b; b.partner = a;
    a.pianist = false; b.pianist = false;
    a.chatty = true; b.chatty = true;
    a.chatT = rnd(12, 26); b.chatT = rnd(12, 26);
    ['wantsBook', 'ownBook'].forEach(function (k) {
      if (k in opts) { a[k] = !!opts[k]; b[k] = !!opts[k]; }
    });
    if (opts.drink) {
      const drink = DRINKS.find(function (d) { return d.name === opts.drink; });
      if (drink) { a.drink = drink; b.drink = drink; }
    }
    if (Math.random() < 0.5) b.colors.scarf = a.colors.scarf || pick(TOPS);
    if ('laptop' in opts) { a.laptop = !!opts.laptop; b.laptop = !!opts.laptop; }
    if ('umbrella' in opts && opts.umbrella) a.umbrella = { color: typeof opts.umbrella === 'string' ? opts.umbrella : pick(UMBRELLAS) };
    if (world.rain > 0.4) {
      a.umbrella = { color: (a.umbrella && a.umbrella.color) || pick(UMBRELLAS) };
      b.umbrella = null;
    }
    enqueueArrival(world, a, 0, true);
    enqueueArrival(world, b, rnd(1.2, 1.8), false);
    a.doorCloseT = 0;   // the trailing partner owns the pair's single close
    caption(world, world.rain > 0.4
      ? 'Two come in together out of the rain, under one umbrella.'
      : 'Two come in together, shoulder to shoulder.');
    return [a, b];
  }

  /* One schedule slot per roster row, keyed by id. Each carries the last day
     that regular arrived, the day its arrival `hour` was rolled for, that
     rolled hour (fresh in the spec's window each café day), and a dev force
     flag. Built from CAST at world creation. */
  function buildRegulars() {
    const map = {};
    CAST.regulars.forEach(function (spec) {
      map[spec.id] = { lastDay: -1, day: 0, hour: rnd(spec.arrival.from, spec.arrival.to), force: false };
    });
    return map;
  }

  /* Build a regular from its roster spec: start from a plain patron (for the
     name + all the default fields), then stamp the fixed look, drink, traits,
     voice, and spec tag over it. Holger's row reproduces his old hardcoded
     values byte-for-byte. */
  function makeRegular(world, spec) {
    const p = makePatron(spec.name);
    p.nameStyle = spec.nameStyle;
    p.colors = Object.assign({}, spec.colors);
    const drink = DRINKS.find(function (d) { return d.name === spec.drink; });
    if (drink) p.drink = drink;
    p.wantsBook = !!spec.traits.wantsBook;
    p.ownBook = !!spec.traits.ownBook;
    p.chatty = !!spec.traits.chatty;
    p.laptop = !!spec.traits.laptop;
    p.pianist = !!spec.traits.pianist;
    p.artist = !!spec.traits.artist;
    p.murmurPitch = spec.murmurPitch;
    p.speed = spec.speed;
    p.isRegular = true;
    p.regularId = spec.id;
    // stash the spec so schedule, seat preference, line lookup, and continuity
    // can reach this regular's row directly
    p.spec = spec;
    if (world.rain > 0.4 && spec.umbrella) p.umbrella = { color: spec.umbrella };
    return p;
  }

  function arrivalLine(spec) {
    return spec.lines && spec.lines.arrival && spec.lines.arrival.length
      ? pick(spec.lines.arrival)
      : spec.name + ' steps inside.';
  }

  /* The real calendar day (UTC) — the ruler continuity is measured against,
     the same clock arc progress uses (docs/narrative.md §3). */
  function realDay() {
    return Math.floor((window.MEMORY ? MEMORY.now() : Date.now()) / DAY_MS);
  }

  /* Nora's memory of a regular, deepened just by her being present when they
     arrive (docs/narrative.md §5). Bumps the persisted bond visit-count and
     records the real day, then reports whether Nora already knew this face — the
     signal a recognition-flavoured opener needs, without any line depending on a
     previous one. The saved `lastDay` leaves room for later day-gap nuance
     ("same as yesterday"). Bonds live in the MEMORY save; a fresh café simply
     starts knowing no one. */
  function noteRegularVisit(world, spec) {
    const mem = world.memory;
    if (!mem || !mem.bonds) return { returning: false };
    let b = mem.bonds[spec.id];
    if (!b || typeof b !== 'object') { b = { known: false, warmth: 0, visits: 0, lastDay: -1 }; mem.bonds[spec.id] = b; }
    if (typeof b.visits !== 'number') b.visits = 0;
    const returning = b.visits > 0;
    b.visits += 1;
    b.known = true;
    b.lastDay = realDay();
    if (window.MEMORY) MEMORY.save();
    return { returning: returning };
  }

  /* The opener when a regular arrives: weather first (a wet arrival reads on
     the coat, not the calendar), then recognition for a face Nora already
     knows, else the plain arrival line. Every branch stands alone. */
  function regularArrivalLine(world, spec, info) {
    const lines = spec.lines || {};
    if (world.rain > 0.4 && lines.arrivalRain && lines.arrivalRain.length) return pick(lines.arrivalRain);
    if (info.returning && lines.arrivalReturn && lines.arrivalReturn.length && Math.random() < 0.6) {
      return pick(lines.arrivalReturn);
    }
    return arrivalLine(spec);
  }

  function updateRegulars(world) {
    const day = dayIndex(world);
    CAST.regulars.forEach(function (spec) {
      const r = world.regulars[spec.id];
      if (!r) return;
      if (day !== r.day) { r.day = day; r.hour = rnd(spec.arrival.from, spec.arrival.to); }
      // one visit at a time per regular; never two of the same face
      if (world.patrons.some(function (p) { return p.regularId === spec.id; })) return;
      const due = r.force || (r.lastDay !== day && world.hour >= r.hour && world.hour < 23);
      if (!due || world.patrons.length >= spawnCap(world)) return;   // force holds until the room has room
      const p = makeRegular(world, spec);
      enqueueArrival(world, p, 0, true);
      r.lastDay = day; r.force = false;
      const info = noteRegularVisit(world, spec);
      caption(world, regularArrivalLine(world, spec, info));
    });
  }

  function updateSpawning(world, dt) {
    updateRegulars(world);
    world.spawnT -= dt;
    if (world.spawnT > 0) return;
    world.spawnT = rnd(1, 1.4) * (26 + (1 - world.daylight) * 55);
    if (world.patrons.length >= spawnCap(world)) return;
    if (world.patrons.length + 2 <= spawnCap(world) && Math.random() < 0.22) {
      spawnCouple(world);
      return;
    }
    const p = applyArrivalTraits(world, makePatron());
    enqueueArrival(world, p, 0, true);
    const lines = world.rain > 0.4
      ? [p.name + ' ducks in out of the rain.', p.name + ' slips in from the wet street.']
      : [p.name + ' pushes the door open.', p.name + ' steps inside.', p.name + ' wanders in.'];
    caption(world, pick(lines));
  }

  function queueSlot(i) {
    return { x: L.orderSpot.x - i * 34, y: L.orderSpot.y + i * 30 };
  }

  /* waiting cluster drifts down-LEFT: rightward it walks into the
     bookshelf's occluder span around the 5th waiter (__dev.audit caught it) */
  function waitSpot(n) {
    return { x: 780 - n * 14, y: 350 + n * 16 };
  }

  /* ---------- particles ---------- */

  function spawnSteam(world, x, y) {
    world.particles.push({
      type: 'steam', x: x, y: y,
      vy: -(12 + Math.random() * 10), age: 0, life: rnd(0.9, 1.6), seed: Math.random() * 7
    });
  }

  function updateParticles(world, dt) {
    // steam from anything hot
    world.hotAcc = (world.hotAcc || 0) + dt;
    if (world.hotAcc >= 0.4) {
      world.hotAcc -= 0.4;
      world.counterCups.forEach(function (c) {
        if (c.kind !== 'plate' && c.kind !== 'glass') spawnSteam(world, c.x + 5, c.y - 4);   // pastries and iced drinks don't steam
      });
      world.tables.forEach(function (tb) {
        tb.items.forEach(function (it) {
          if (it.hot > 0 && !it.hidden && it.kind !== 'plate' && Math.random() < 0.8) {
            spawnSteam(world, tb.x + it.side * (tb.reach || 24), tb.y - 16);
          }
        });
      });
      world.patrons.forEach(function (p) {
        if (p.armUp > 0.7 && p.drink.kind !== 'glass') spawnSteam(world, p.x + p.facing * 8, p.y - 38);
      });
    }
    world.tables.forEach(function (tb) {
      tb.items.forEach(function (it) { if (it.hot > 0) it.hot -= dt; });
    });
    // fire sparks — a blaze throws more and higher; embers only spit now and then
    const fireLvl = world.fire ? world.fire.level : 1;
    if (Math.random() < dt * (0.3 + fireLvl * 2.2)) {
      world.particles.push({
        type: 'spark',
        x: L.fire.boxX + 8 + Math.random() * (L.fire.boxW - 16),
        y: L.fire.boxBot - (6 + fireLvl * 14),
        vy: -(14 + fireLvl * 24 + Math.random() * 16), age: 0, life: rnd(0.25, 0.6), seed: 0
      });
    }
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.age += dt;
      if (p.vx) p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) world.particles.splice(i, 1);
    }
  }

  /* ---------- narrative: café-day arc progression ---------- */

  function arcDefs() { return (window.CAST && Array.isArray(CAST.arcs)) ? CAST.arcs : []; }

  function arcRecord(mem, id) {
    let rec = mem.arcs[id];
    if (!rec || typeof rec !== 'object') { rec = { stage: 0, progress: 0, pendingBeat: null }; mem.arcs[id] = rec; }
    return rec;
  }

  // an arc's total beat count (default 1); stage === stages means done
  function arcStages(arc) { return arc.stages || 1; }

  // the café-day threshold for a stage: `rows` is one number, or an array
  // carrying one entry per stage
  function arcRows(arc, stage) {
    return Array.isArray(arc.rows) ? arc.rows[Math.min(stage, arc.rows.length - 1)] : arc.rows;
  }

  // Multi-stage arcs may carry one caption run and lasting flag per stage.
  // Single-stage definitions keep their historical flat arrays/strings.
  function arcBeat(arc, stage) {
    return Array.isArray(arc.beat[0]) ? arc.beat[Math.min(stage, arc.beat.length - 1)] : arc.beat;
  }

  function arcFlag(arc, stage) {
    return Array.isArray(arc.flag) ? arc.flag[Math.min(stage, arc.flag.length - 1)] : arc.flag;
  }

  /* Advance every active arc by `days` café days (fractional welcome) and set
     `pendingBeat` on any that reach their stage threshold. The ONE growth
     path: updateNarrative feeds it dt while the café runs, __dev.age feeds it
     whole days. An arc is active while its stage is short of its last and no
     beat is already waiting — a ready beat stops growth until it is chosen
     (the invitation-waits rule, docs/narrative.md §1). */
  function advanceArcs(world, days) {
    const out = { moved: false, readied: false };
    const mem = world.memory;
    if (!mem || !(days > 0)) return out;
    const regularIds = {};
    CAST.regulars.forEach(function (r) { regularIds[r.id] = true; });

    arcDefs().forEach(function (arc) {
      if (!arc.anchor && !regularIds[arc.owner]) return;   // drift: names a regular that no longer exists
      const rec = arcRecord(mem, arc.id);
      if (rec.stage >= arcStages(arc) || rec.pendingBeat) return;
      const rows = arcRows(arc, rec.stage);
      rec.progress = Math.min(rows, rec.progress + days);
      out.moved = true;
      if (rec.progress >= rows) { rec.pendingBeat = 'finished'; out.readied = true; }
    });
    return out;
  }

  /* The narrative tick: arcs ride the café's own day (24 real minutes,
     DAY_SECONDS) while the café runs — dt-driven SIM.update code, so the
     hidden-tab interval keeps a backgrounded café progressing too. A closed
     café simply holds still: nothing accrues, nothing is missed, and any
     raised invitation keeps waiting (docs/narrative.md §3). Saves are
     quantized to the café hour (~once a real minute) plus every readied beat,
     so localStorage stays quiet; at worst a hard close drops a sliver of a
     row, never a beat. */
  let narrSaveT = 0;
  function updateNarrative(world, dt) {
    const res = advanceArcs(world, dt / DAY_SECONDS);
    if (!res.moved) return;
    narrSaveT += dt;
    if (res.readied || narrSaveT >= DAY_SECONDS / 24) {
      narrSaveT = 0;
      if (window.MEMORY) MEMORY.save();
    }
  }

  /* Bind the MEMORY save to the world and reconcile it against the current
     definitions. Arcs ride the café's own clock (docs/narrative.md §3), so
     boot adds no elapsed time — a closed café simply holds still. This pass
     clamps drift (an arc naming a vanished regular is skipped, a stage or
     progress past its definition is pulled back), raises any invitation a
     threshold-touching save is owed, and re-applies a completed arc's lasting
     mark (the cat wearing the scarf) for a returning reader. */
  function reconcileNarrative(world) {
    const mem = (window.MEMORY && MEMORY.state) ||
      { version: 1, lastSeen: Date.now(), arcs: {}, bonds: {}, flags: {} };
    world.memory = mem;
    const regularIds = {};
    CAST.regulars.forEach(function (r) { regularIds[r.id] = true; });

    arcDefs().forEach(function (arc) {
      if (!arc.anchor && !regularIds[arc.owner]) return;   // drift: names a regular that no longer exists
      const rec = arcRecord(mem, arc.id);
      // clamp a save that drifted from the current definition
      if (typeof rec.stage !== 'number' || rec.stage < 0) rec.stage = 0;
      if (rec.stage > arcStages(arc)) rec.stage = arcStages(arc);
      if (typeof rec.progress !== 'number' || rec.progress < 0) rec.progress = 0;
      const rows = arcRows(arc, Math.min(rec.stage, arcStages(arc) - 1));
      if (rec.progress > rows) rec.progress = rows;
      // a save already at its threshold is owed its (patient) invitation
      if (rec.stage < arcStages(arc) && !rec.pendingBeat && rec.progress >= rows) {
        rec.pendingBeat = 'finished';
      }
      // realise a completed arc's lasting mark (a returning reader's café)
      if (arcFlag(arc, 0) === 'cat-wore-scarf' && mem.flags[arcFlag(arc, 0)]) world.cat.scarf = arc.scarfColor;
    });

    if (window.MEMORY) { MEMORY.stamp(); MEMORY.save(); MEMORY.requestPersist(); }
    return mem;
  }

  /* Private simulation contract shared by the sim siblings. The dev harness
     consumes a documented subset after every sibling has loaded. */
  SIM._ = {
    L: L, LB: LB,
    DAY_SECONDS: DAY_SECONDS, START_HOUR: START_HOUR, WIPE_RAIN: WIPE_RAIN, DRINKS: DRINKS,
    PATRON_NAMES: PATRON_NAMES, SEAT_PREFS: SEAT_PREFS,
    DAY_MS: DAY_MS,
    rnd: rnd, withArticle: withArticle, pick: pick, holdingFor: holdingFor, specLine: specLine,
    makePatron: makePatron, caption: caption, captionRun: captionRun, updateCaptions: updateCaptions,
    arcDefs: arcDefs, reconcileNarrative: reconcileNarrative,
    arcStages: arcStages, arcRows: arcRows, arcBeat: arcBeat, arcFlag: arcFlag,
    advanceArcs: advanceArcs, updateNarrative: updateNarrative,
    applyArrivalTraits: applyArrivalTraits, enqueueArrival: enqueueArrival,
    spawnCouple: spawnCouple, updateRegulars: updateRegulars,
    makePath: makePath, walker: walker,
    ringDoor: ringDoor, updateDoor: updateDoor,
    updateWeather: updateWeather, updateClock: updateClock,
    updatePassersby: updatePassersby, spawnPasser: spawnPasser,
    dayIndex: dayIndex, candleTables: candleTables,
    snapCandles: snapCandles, updateCandles: updateCandles,
    updateFire: updateFire, addLog: addLog,
    updateSpawning: updateSpawning, queueSlot: queueSlot, waitSpot: waitSpot,
    spawnSteam: spawnSteam, updateParticles: updateParticles
  };
})();
