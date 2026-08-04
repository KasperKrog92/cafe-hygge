/* Café Hygge — the simulation: patrons, barista, cat, weather, time */
(function () {
  'use strict';

  const SIM = (window.SIM = {});
  const L = SCENE.L;
  const LB = L.library;

  const DAY_SECONDS = 1440;          // one full day passes in 24 real minutes
  const START_HOUR = 8.4;

  const NAMES = ['Freja', 'Søren', 'Astrid', 'Mikkel', 'Ida', 'Emil', 'Clara', 'Anton', 'Sofie', 'Johan', 'Maja', 'Viggo', 'Ellen', 'Oskar', 'Alma', 'Karl'];
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
    { name: 'cardamom bun',    icon: 'bun',       prep: 'food',        kind: 'plate',  w: 1.2 },
    { name: 'butter croissant', icon: 'croissant', prep: 'food',       kind: 'plate',  w: 1 }
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function withArticle(name) { return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
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
        })),
      seats: [],
      barista: makeBarista(),
      cat: makeCat(),
      brew: { active: false, stage: '' },
      captionQueue: [],
      activeCaption: null,
      lastCapT: -10,
      spawnT: rnd(4, 9),
      regular: { lastDay: -1, day: 0, hour: rnd(9, 9 + 2 / 3), force: false },
      sleeper: null,
      wasLampOn: false,
      steamAcc: 0,
      wateredDay: -1,
      candles: { mantel: 0, mantelTarget: 0, wasDark: false, forceRound: false }
    };

    // seats: two stools per table + the fireside armchairs + the nook chairs
    // (each nook chair pairs with its own side table for the sitter's drink);
    // small side tables and tall window tables seat no one themselves
    world.tables.forEach(function (tb, ti) {
      if (tb.small || tb.tall) return;
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

    // a few regulars are already settled in
    // (seat 10 = the first nook chair, 12 = the first window perch)
    seedPatron(world, 1);
    seedPatron(world, 4);
    seedPatron(world, 10);
    seedPatron(world, 12);

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
      world.tables[seat.table].items.push({ side: seat.side, kind: p.drink.kind, owner: p.id, hot: 30, hidden: false });
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

  function makePatron() {
    const drink = pickDrink();
    return {
      id: nextId++,
      kind: 'patron',
      name: pick(NAMES),
      colors: {
        skin: pick(SKINS), hair: pick(HAIRS), top: pick(TOPS), pants: pick(PANTS),
        scarf: Math.random() < 0.4 ? pick(TOPS) : null,
        longHair: Math.random() < 0.4,
        hairStyle: (Math.random() * 4) | 0,   // 0 classic, 1 side-part, 2 curly, 3 bun
        beard: Math.random() < 0.15
      },
      drink: drink,
      wantsBook: Math.random() < 0.35,
      ownBook: Math.random() < 0.45,     // readers: brought one vs. borrowing
      hasShelfBook: false,
      browseDur: 0, afterBook: '', resumeReading: false,
      chatty: Math.random() < 0.55,
      murmurPitch: rnd(125, 235),
      x: L.doorSpot.x, y: L.doorSpot.y,
      facing: 1, pose: 'stand', animT: rnd(0, 5),
      speed: rnd(46, 60),
      path: null, state: 'idle', stateT: 0,
      holding: null, armUp: 0, reading: false,
      seat: null, stay: 0,
      sipT: rnd(4, 10), sipPhase: 0, sipPlayed: false,
      pageT: rnd(6, 16), chatT: rnd(8, 20), chatReply: 0,
      umbrella: null, umbrellaParked: false, shakeDropT: 0, shakeDrops: 0,
      laptop: false, laptopActive: false, laptopPacked: false,
      typing: false, typingT: rnd(6, 14), typingRemain: 0, keyT: 0,
      partner: null, coupleStay: 0, coupleBus: null, coupleLeaveAt: 0,
      orderCaptioned: false, pairCaptioned: false,
      dozing: false, dozeT: rnd(50, 120), dozeRemain: 0, zzzT: rnd(7, 14),
      isRegular: false, usualSeat: false, regularSeatNoted: false,
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
      facing: -1, pose: 'stand', animT: 0,
      speed: 60, path: null,
      state: 'idle', stateT: 0, idleT: rnd(4, 9), emptyT: 0,
      holding: null, armUp: 0, reading: false,
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
      bubble: null, purrT: rnd(6, 15), spotName: 'fire rug'
    };
  }

  /* ---------- captions ---------- */

  function caption(world, text) {
    if (world.captionQueue.length < 2) world.captionQueue.push(text);
  }

  function updateCaptions(world, dt) {
    if (world.activeCaption && world.t - world.activeCaption.born > 4.4) world.activeCaption = null;
    if (!world.activeCaption && world.captionQueue.length && world.t - world.lastCapT > 6) {
      world.activeCaption = { text: world.captionQueue.shift(), born: world.t };
      world.lastCapT = world.t;
    }
  }

  /* ---------- movement ---------- */

  function makePath(e, tx, ty) {
    const path = [];
    if (Math.abs(e.y - L.lane) > 4 || Math.abs(ty - L.lane) > 4) {
      path.push({ x: e.x, y: L.lane });
      path.push({ x: tx, y: L.lane });
    }
    path.push({ x: tx, y: ty });
    e.path = path;
  }

  function walker(e, dt) {
    if (!e.path || !e.path.length) { e.pose = e.pose === 'sit' ? 'sit' : 'stand'; return true; }
    const tgt = e.path[0];
    const dx = tgt.x - e.x, dy = tgt.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3.2) {
      e.x = tgt.x; e.y = tgt.y;
      e.path.shift();
      if (!e.path.length) { e.pose = 'stand'; return true; }
      return false;
    }
    const step = e.speed * dt;
    e.x += (dx / dist) * Math.min(step, dist);
    e.y += (dy / dist) * Math.min(step, dist);
    if (Math.abs(dx) > 0.6) e.facing = dx > 0 ? 1 : -1;
    e.pose = 'walk';
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
          (p.state === 'enter' || p.state === 'enterDelay' || p.state === 'shake' ||
           p.state === 'parkUmbrella' || p.state === 'collectUmbrella' || p.state === 'exit')) near = true;
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
      const next = r < 0.34 ? 0 : r < 0.68 ? 0.4 : 0.8;
      if (next > 0.5 && world.rainTarget < 0.2) caption(world, 'Rain begins to patter against the window.');
      else if (next < 0.1 && world.rainTarget > 0.3) caption(world, 'The rain lets up outside.');
      else if (next > 0.2 && next < 0.5 && world.rainTarget > 0.6) caption(world, 'The rain softens to a drizzle.');
      world.rainTarget = next;
    }
    const effTarget = (SND.settings.rain === false) ? 0 : world.rainTarget;
    world.rain += (effTarget - world.rain) * Math.min(1, dt * 0.18);
  }

  function updateClock(world, dt) {
    world.hour = (START_HOUR + (world.t / DAY_SECONDS) * 24) % 24;
    world.pal = SCENE.dayPalette(world.hour);
    world.daylight = world.pal.daylight;
    const lampOn = world.pal.lamp > 0.5;
    if (lampOn && !world.wasLampOn) caption(world, 'The streetlamps flicker on, one by one.');
    if (!lampOn && world.wasLampOn) caption(world, 'Morning light spills across the floorboards.');
    world.wasLampOn = lampOn;
  }

  function dayIndex(world) {
    return Math.floor((START_HOUR + world.t / DAY_SECONDS * 24) / 24);
  }

  function candleTables(world) {
    return world.tables.filter(function (tb) { return !tb.tall; });
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

  /* ---------- spawning ---------- */

  function spawnCap(world) {
    if (world.hour >= 23 || world.hour < 6) return 2;
    return world.daylight > 0.3 ? 7 : 4;
  }

  function applyArrivalTraits(world, p) {
    const night = world.hour >= 21 || world.hour < 7;
    if (!p.wantsBook && Math.random() < (night ? 0.06 : 0.16)) p.laptop = true;
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

  function makeRegular(world) {
    const p = makePatron();
    p.name = 'Holger';
    p.colors = {
      skin: '#d99c6b', hair: '#d9d2c0', top: '#4a7a5a', pants: '#4a3222',
      scarf: '#a94f3f', longHair: false, hairStyle: 1, beard: true
    };
    p.drink = DRINKS.find(function (d) { return d.name === 'espresso'; });
    p.wantsBook = true; p.ownBook = true; p.chatty = false;
    p.murmurPitch = 130; p.speed = 46; p.isRegular = true; p.laptop = false;
    if (world.rain > 0.4) p.umbrella = { color: '#3d4a5c' };
    return p;
  }

  function updateRegular(world) {
    const r = world.regular;
    const day = dayIndex(world);
    if (day !== r.day) { r.day = day; r.hour = rnd(9, 9 + 2 / 3); }
    if (world.patrons.some(function (p) { return p.isRegular; })) return;
    const due = r.force || (r.lastDay !== day && world.hour >= r.hour && world.hour < 23);
    if (!due || world.patrons.length >= spawnCap(world)) return;
    const p = makeRegular(world);
    enqueueArrival(world, p, 0, true);
    r.lastDay = day; r.force = false;
    caption(world, 'Holger steps in, as steady as the clock.');
    return p;
  }

  function updateSpawning(world, dt) {
    updateRegular(world);
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
    if (world.hotAcc > 0.4) {
      world.hotAcc = 0;
      world.counterCups.forEach(function (c) {
        if (c.kind !== 'plate') spawnSteam(world, c.x + 5, c.y - 4);   // pastries don't steam
      });
      world.tables.forEach(function (tb) {
        tb.items.forEach(function (it) {
          if (it.hot > 0 && !it.hidden && it.kind !== 'plate' && Math.random() < 0.8) {
            spawnSteam(world, tb.x + it.side * (tb.reach || 24), tb.y - 16);
          }
        });
      });
      world.patrons.forEach(function (p) {
        if (p.armUp > 0.7) spawnSteam(world, p.x + p.facing * 8, p.y - 52);
      });
    }
    world.tables.forEach(function (tb) {
      tb.items.forEach(function (it) { if (it.hot > 0) it.hot -= dt; });
    });
    // fire sparks
    if (Math.random() < dt * 2.2) {
      world.particles.push({
        type: 'spark',
        x: L.fire.boxX + 8 + Math.random() * (L.fire.boxW - 16),
        y: L.fire.boxBot - 20,
        vy: -(24 + Math.random() * 20), age: 0, life: rnd(0.25, 0.6), seed: 0
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

  /* Private simulation contract shared by the sim siblings. The dev harness
     consumes a documented subset after every sibling has loaded. */
  SIM._ = {
    L: L, LB: LB,
    DAY_SECONDS: DAY_SECONDS, START_HOUR: START_HOUR, DRINKS: DRINKS,
    rnd: rnd, withArticle: withArticle, pick: pick,
    makePatron: makePatron, caption: caption, updateCaptions: updateCaptions,
    applyArrivalTraits: applyArrivalTraits, enqueueArrival: enqueueArrival,
    spawnCouple: spawnCouple, updateRegular: updateRegular,
    makePath: makePath, walker: walker,
    ringDoor: ringDoor, updateDoor: updateDoor,
    updateWeather: updateWeather, updateClock: updateClock,
    dayIndex: dayIndex, candleTables: candleTables,
    snapCandles: snapCandles, updateCandles: updateCandles,
    updateSpawning: updateSpawning, queueSlot: queueSlot, waitSpot: waitSpot,
    spawnSteam: spawnSteam, updateParticles: updateParticles
  };
})();
