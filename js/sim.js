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
      particles: [],
      tables: L.tables.map(function (tb) { return { x: tb.x, y: tb.y, tag: tb.tag, items: [] }; })
        .concat(LB.sideTables.map(function (st) {
          return { x: st.x, y: st.y, tag: 'in the reading nook', small: true, items: [] };
        })),
      seats: [],
      barista: makeBarista(),
      cat: makeCat(),
      brew: { active: false, stage: '' },
      captionQueue: [],
      activeCaption: null,
      lastCapT: -10,
      spawnT: rnd(4, 9),
      wasLampOn: false,
      steamAcc: 0
    };

    // seats: two stools per table + the fireside armchairs + the nook chairs
    // (each nook chair pairs with its own side table for the sitter's drink)
    world.tables.forEach(function (tb, ti) {
      if (tb.small) return;
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

    // a few regulars are already settled in (seat 10 = the first nook chair)
    seedPatron(world, 1);
    seedPatron(world, 4);
    seedPatron(world, 10);

    return world;
  };

  function seedPatron(world, seatIdx) {
    const p = makePatron();
    const seat = world.seats[seatIdx];
    seat.taken = true;
    p.seat = seat;
    p.x = seat.x; p.y = seat.y;
    p.facing = seat.facing;
    p.pose = 'sit';
    p.state = 'seated';
    p.stay = rnd(60, 160);
    if (seat.table >= 0) {
      world.tables[seat.table].items.push({ side: seat.side, kind: p.drink.kind, owner: p.id, hot: 30, hidden: false });
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
      bubble: null, queueIdx: -1, doorCloseT: 0
    };
  }

  function makeBarista() {
    return {
      kind: 'barista', name: 'Nora',
      colors: { skin: '#e8b48a', hair: '#4a2f1c', top: '#5a7a8a', pants: '#3d4a5c', apron: true, longHair: true, scarf: null, hairStyle: 1 },
      x: L.baristaHome.x, y: L.baristaHome.y,
      facing: -1, pose: 'stand', animT: 0,
      speed: 60, path: null,
      state: 'idle', stateT: 0, idleT: rnd(4, 9),
      holding: null, armUp: 0, reading: false,
      orders: [], steps: null, stepIdx: 0, busTarget: null
    };
  }

  function makeCat() {
    return {
      kind: 'cat', state: 'sleep', stateT: rnd(20, 50), animT: 0,
      x: 390, y: 294, facing: -1, path: null, speed: 32,
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
  }

  function updateDoor(world, dt) {
    const d = world.door;
    let near = false;
    world.patrons.forEach(function (p) {
      if (Math.hypot(p.x - L.doorSpot.x, p.y - L.doorSpot.y) < 44 &&
          (p.state === 'enter' || p.state === 'exit')) near = true;
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

  /* ---------- spawning ---------- */

  function spawnCap(world) {
    if (world.hour >= 23 || world.hour < 6) return 2;
    return world.daylight > 0.3 ? 7 : 4;
  }

  function updateSpawning(world, dt) {
    world.spawnT -= dt;
    if (world.spawnT > 0) return;
    world.spawnT = rnd(1, 1.4) * (26 + (1 - world.daylight) * 55);
    if (world.patrons.length >= spawnCap(world)) return;
    const p = makePatron();
    p.state = 'enter';
    p.doorCloseT = 1.1;
    world.patrons.push(p);
    ringDoor(world);
    const lines = world.rain > 0.4
      ? [p.name + ' ducks in out of the rain.', p.name + ' shakes off the rain at the door.']
      : [p.name + ' pushes the door open.', p.name + ' steps inside.', p.name + ' wanders in.'];
    caption(world, pick(lines));
    // join the queue
    p.queueIdx = world.queue.length;
    world.queue.push(p);
    const slot = queueSlot(p.queueIdx);
    makePath(p, slot.x, slot.y);
  }

  function queueSlot(i) {
    return { x: L.orderSpot.x - i * 34, y: L.orderSpot.y + i * 30 };
  }

  /* waiting cluster drifts down-LEFT: rightward it walks into the
     bookshelf's occluder span around the 5th waiter (__dev.audit caught it) */
  function waitSpot(n) {
    return { x: 780 - n * 14, y: 350 + n * 16 };
  }

  /* ---------- patron behaviour ---------- */

  function freeSeat(world, patron) {
    const free = world.seats.filter(function (s) { return !s.taken; });
    if (!free.length) return null;
    if (patron.wantsBook || patron.hasShelfBook) {
      const nook = free.filter(function (s) { return s.nook; });
      if (patron.hasShelfBook && nook.length) return pick(nook);   // settle near the shelf
      const reading = free.filter(function (s) { return s.nook || s.armchair; });
      if (reading.length) return pick(reading);
    }
    // prefer sitting opposite someone chatty, sometimes
    return pick(free);
  }

  function updatePatron(world, p, dt) {
    p.animT += dt;
    p.stateT += dt;
    if (p.doorCloseT > 0) {
      p.doorCloseT -= dt;
      if (p.doorCloseT <= 0) SND.doorClose();
    }

    switch (p.state) {
      case 'enter': {
        if (walker(p, dt)) { p.state = 'queueing'; }
        break;
      }
      case 'queueing': {
        walker(p, dt);
        const slot = queueSlot(p.queueIdx);
        if (Math.hypot(p.x - slot.x, p.y - slot.y) > 2 && (!p.path || !p.path.length)) {
          makePath(p, slot.x, slot.y);
        }
        if (p.queueIdx === 0 && (!p.path || !p.path.length) && world.barista.state === 'idle' && !world.barista.orders.length) {
          p.state = 'ordering'; p.stateT = 0;
          p.facing = 1;
          p.bubble = { icon: p.drink.icon, until: world.t + 1.9 };
          caption(world, p.name + ' orders ' + withArticle(p.drink.name) + '.');
        }
        break;
      }
      case 'ordering': {
        if (p.stateT > 2.0) {
          world.barista.orders.push({ patron: p, drink: p.drink });
          // leave the queue
          world.queue.shift();
          world.queue.forEach(function (q, i) {
            q.queueIdx = i;
            const slot = queueSlot(i);
            makePath(q, slot.x, slot.y);
          });
          p.queueIdx = -1;
          p.state = 'waitDrink'; p.stateT = 0;
          const n = world.patrons.filter(function (q) { return q.state === 'waitDrink'; }).length;
          const ws = waitSpot(n);
          makePath(p, ws.x, ws.y);
        }
        break;
      }
      case 'waitDrink': {
        walker(p, dt);
        const cup = world.counterCups.find(function (c) { return c.owner === p.id; });
        if (cup && (!p.path || !p.path.length)) {
          p.state = 'pickup'; p.stateT = 0;
          makePath(p, L.pickupSpot.x, L.pickupSpot.y);
        }
        break;
      }
      case 'pickup': {
        if (walker(p, dt)) {
          const idx = world.counterCups.findIndex(function (c) { return c.owner === p.id; });
          if (idx >= 0) world.counterCups.splice(idx, 1);
          p.holding = p.drink.kind === 'plate' ? 'plate' : 'cup';
          SND.clink(0.9, 0.05);
          if (p.wantsBook && !p.ownBook) {
            // a borrower: browse the shelf before settling anywhere
            p.state = 'browse'; p.stateT = 0;
            p.browseDur = rnd(2.5, 5.5);
            makePath(p, LB.browseSpot.x, LB.browseSpot.y);
            if (Math.random() < 0.5) caption(world, p.name + ' drifts over to the bookshelf.');
            break;
          }
          const seat = freeSeat(world, p);
          if (!seat) {
            caption(world, p.name + ' takes it to go.');
            leaveCafe(world, p);
          } else {
            seat.taken = true;
            p.seat = seat;
            p.state = 'toSeat'; p.stateT = 0;
            makePath(p, seat.x, seat.y);
          }
        }
        break;
      }
      case 'browse': {
        // standing at the shelf, scanning spines (stateT only runs on arrival)
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > p.browseDur) {
          p.hasShelfBook = true;
          SND.pageTurn();
          if (Math.random() < 0.6) caption(world, p.name + pick([' picks out a well-worn book.', ' finds a book with a promising spine.']));
          const seat = freeSeat(world, p);
          if (!seat) {
            p.hasShelfBook = false;
            caption(world, p.name + ' takes it to go.');
            leaveCafe(world, p);
          } else {
            seat.taken = true;
            p.seat = seat;
            p.state = 'toSeat'; p.stateT = 0;
            makePath(p, seat.x, seat.y);
          }
        }
        break;
      }
      case 'fetchBook': {
        // slipped away from their seat (still theirs) to borrow a book
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > p.browseDur) {
          p.hasShelfBook = true;
          p.holding = 'book';
          SND.pageTurn();
          if (Math.random() < 0.5) caption(world, p.name + pick([' picks out a well-worn book.', ' finds a book with a promising spine.']));
          p.state = 'backToSeat'; p.stateT = 0;
          makePath(p, p.seat.x, p.seat.y);
        }
        break;
      }
      case 'backToSeat': {
        if (walker(p, dt)) {
          p.pose = 'sit';
          p.facing = p.seat.facing;
          p.holding = null;
          p.reading = true;
          p.state = 'seated'; p.stateT = 0;
        }
        break;
      }
      case 'returnBook': {
        // a moment at the shelf to slide the book home, then on their way
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > 1.1) {
          p.hasShelfBook = false;
          SND.pageTurn();
          if (Math.random() < 0.4) caption(world, p.name + ' slips the book back onto the shelf.');
          if (p.afterBook === 'return') {
            p.state = 'return'; p.stateT = 0;
            makePath(p, 792, L.pickupSpot.y);
          } else {
            leaveCafe(world, p);
          }
        }
        break;
      }
      case 'toSeat': {
        if (walker(p, dt)) {
          p.pose = 'sit';
          p.facing = p.seat.facing;
          p.state = 'seated'; p.stateT = 0;
          p.stay = rnd(100, 260);
          if (p.seat.table >= 0) {
            world.tables[p.seat.table].items.push({ side: p.seat.side, kind: p.drink.kind, owner: p.id, hot: 45, hidden: false });
            p.holding = null;
            SND.cupDown();
          }
          if (p.seat.armchair) {
            p.reading = true;
            caption(world, p.name + ' sinks into the armchair by the fire.');
          } else if (p.seat.nook) {
            if (p.wantsBook || p.hasShelfBook) p.reading = true;
            if (Math.random() < 0.7) caption(world, p.name + (p.reading ? ' curls up in the reading nook.' : ' settles into the reading nook.'));
          } else if (p.wantsBook) {
            p.reading = true;
            if (Math.random() < 0.5) caption(world, p.name + ' settles in with a book.');
          } else if (world.tables[p.seat.table] && world.tables[p.seat.table].tag && Math.random() < 0.6) {
            caption(world, p.name + ' finds a seat ' + world.tables[p.seat.table].tag + '.');
          }
        }
        break;
      }
      case 'seated': {
        updateSeated(world, p, dt);
        break;
      }
      case 'return': {
        if (walker(p, dt)) {
          SND.clink(0.7, 0.04);
          p.holding = null;
          if (Math.random() < 0.5) caption(world, p.name + ' returns the cup — tak!');
          leaveCafe(world, p);
        }
        break;
      }
      case 'exit': {
        if (walker(p, dt)) p.gone = true;
        if (Math.hypot(p.x - L.doorSpot.x, p.y - L.doorSpot.y) < 40 && !p.rangBell) {
          p.rangBell = true;
          ringDoor(world);
        }
        break;
      }
    }

    if (p.bubble && world.t > p.bubble.until) p.bubble = null;
  }

  function updateSeated(world, p, dt) {
    p.stay -= dt;

    const item = p.seat.table >= 0
      ? world.tables[p.seat.table].items.find(function (it) { return it.owner === p.id; })
      : null;

    // sipping
    if (p.sipPhase > 0) {
      p.sipPhase -= dt;
      const tp = 1.3 - p.sipPhase;
      p.armUp = tp < 0.4 ? tp / 0.4 : tp < 0.9 ? 1 : Math.max(0, (1.3 - tp) / 0.4);
      if (tp > 0.45 && !p.sipPlayed) { p.sipPlayed = true; SND.sip(); }
      if (p.sipPhase <= 0) {
        p.armUp = 0;
        if (item) { item.hidden = false; p.holding = null; SND.cupDown(); }
        else if (p.seat.armchair) { p.holding = null; }
        if (p.resumeReading) { p.reading = true; p.resumeReading = false; }
      }
    } else {
      p.sipT -= dt;
      if (p.sipT <= 0 && p.drink.kind !== 'plate') {
        p.sipT = rnd(9, 22);
        p.sipPhase = 1.3;
        p.sipPlayed = false;
        if (item) { item.hidden = true; p.holding = 'cup'; }
        else if (p.seat.armchair) { p.holding = 'cup'; }
        if (p.reading) { p.reading = false; p.resumeReading = true; }   // book down for the sip
      }
    }

    // reading
    if (p.reading) {
      p.pageT -= dt;
      if (p.pageT <= 0) {
        p.pageT = rnd(12, 26);
        SND.pageTurn();
        if (Math.random() < 0.12) caption(world, p.name + ' turns a page.');
      }
    }

    // chatting with a table-mate
    if (p.chatty && p.seat.table >= 0) {
      p.chatT -= dt;
      if (p.chatT <= 0) {
        p.chatT = rnd(16, 34);
        const mate = world.patrons.find(function (q) {
          return q !== p && q.state === 'seated' && q.seat.table === p.seat.table;
        });
        if (mate) {
          p.bubble = { icon: 'dots', until: world.t + 1.6 };
          SND.murmur(p.murmurPitch);
          mate.chatReply = rnd(1.2, 2);
          if (Math.random() < 0.15) caption(world, 'Soft murmurs drift from the table ' + (world.tables[p.seat.table].tag || 'in the corner') + '.');
        }
      }
    }
    if (p.chatReply > 0) {
      p.chatReply -= dt;
      if (p.chatReply <= 0) {
        p.bubble = { icon: 'dots', until: world.t + 1.4 };
        SND.murmur(p.murmurPitch);
      }
    }

    // now and then the bookshelf calls (drink stays on the table, seat stays theirs)
    if (!p.reading && !p.holding && p.sipPhase <= 0 && p.stay > 55 && p.seat.table >= 0 &&
        Math.random() < dt * 0.01) {
      p.pose = 'stand';
      p.state = 'fetchBook'; p.stateT = 0;
      p.browseDur = rnd(2.5, 4.5);
      makePath(p, LB.browseSpot.x, LB.browseSpot.y);
      if (Math.random() < 0.5) caption(world, p.name + ' wanders over to the bookshelf.');
      return;
    }

    // time to go
    if (p.stay <= 0 && p.sipPhase <= 0) {
      p.pose = 'stand';
      p.reading = false;
      p.armUp = 0;
      p.seat.taken = false;
      let bussing = false;
      if (item) {
        bussing = Math.random() < 0.4;
        if (bussing) {
          const list = world.tables[p.seat.table].items;
          list.splice(list.indexOf(item), 1);
          p.holding = item.kind === 'plate' ? 'plate' : 'cup';
        } else {
          item.owner = null;   // left behind for Nora to collect
        }
      }
      p.seat = null;
      if (p.hasShelfBook) {
        // the borrowed book goes home first
        p.afterBook = bussing ? 'return' : 'exit';
        p.state = 'returnBook'; p.stateT = 0;
        makePath(p, LB.browseSpot.x, LB.browseSpot.y);
        return;
      }
      if (bussing) {
        p.state = 'return'; p.stateT = 0;
        makePath(p, 792, L.pickupSpot.y);
        return;
      }
      leaveCafe(world, p);
    }
  }

  function leaveCafe(world, p) {
    p.state = 'exit'; p.stateT = 0;
    p.rangBell = false;
    makePath(p, L.doorSpot.x, L.doorSpot.y);
    if (Math.random() < 0.35) caption(world, p.name + ' heads back out into the ' + (world.rain > 0.4 ? 'rain' : (world.daylight < 0.3 ? 'night' : 'afternoon')) + '.');
  }

  /* ---------- barista ---------- */

  const PREP_STEPS = {
    coffee_milk: [
      { x: 664, act: 'grind', dur: 1.5 },
      { x: 664, act: 'tamp', dur: 0.55 },
      { x: 678, act: 'pull', dur: 2.4 },
      { x: 706, act: 'steam', dur: 1.8 }
    ],
    coffee: [
      { x: 664, act: 'grind', dur: 1.5 },
      { x: 664, act: 'tamp', dur: 0.55 },
      { x: 678, act: 'pull', dur: 2.4 }
    ],
    tea: [{ x: 700, act: 'kettle', dur: 2.0 }],
    milk: [{ x: 706, act: 'steam', dur: 1.8 }],
    food: [{ x: 858, act: 'fetch', dur: 1.4 }]
  };

  function startStep(world, b) {
    const s = b.steps[b.stepIdx];
    b.stateT = 0;
    switch (s.act) {
      case 'grind': SND.grinder(s.dur); break;
      case 'tamp': SND.tamp(); break;
      case 'pull': SND.espresso(s.dur); break;
      case 'steam': SND.steamWand(s.dur); break;
      case 'kettle': SND.kettlePour(s.dur); break;
      case 'fetch': break;
    }
  }

  function updateBarista(world, b, dt) {
    b.animT += dt;
    b.stateT += dt;
    world.brew.active = false;

    switch (b.state) {
      case 'idle': {
        // start an order?
        if (b.orders.length) {
          const order = b.orders[0];
          b.steps = PREP_STEPS[order.drink.prep].slice();
          b.stepIdx = -1;
          b.state = 'prepWalk';
          b.path = [{ x: b.steps[0].x, y: L.baristaHome.y }];
          break;
        }
        // stay ready at the till if anyone is queueing
        if (world.queue.length) break;
        // otherwise, potter about
        b.idleT -= dt;
        if (b.idleT <= 0) {
          b.idleT = rnd(6, 15);
          startIdleTask(world, b);
        }
        break;
      }
      case 'prepWalk': {
        if (walker(b, dt)) {
          b.stepIdx++;
          if (b.stepIdx >= b.steps.length) {
            // walk to the pass and serve
            b.state = 'serveWalk';
            b.holding = b.orders[0].drink.kind === 'plate' ? 'plate' : 'cup';
            b.path = [{ x: L.serveSpot.x - 8, y: L.baristaHome.y }];
          } else {
            b.state = 'prepping';
            startStep(world, b);
          }
        }
        break;
      }
      case 'prepping': {
        const s = b.steps[b.stepIdx];
        world.brew.active = true;
        world.brew.stage = s.act;
        if (s.act === 'pull' || s.act === 'steam' || s.act === 'kettle') {
          world.steamAcc += dt;
          if (world.steamAcc > 0.12) {
            world.steamAcc = 0;
            spawnSteam(world, L.machine.x + 16 + Math.random() * 28, L.machine.y + 16);
          }
        }
        if (b.stateT >= s.dur) {
          if (s.act === 'fetch') SND.clink(0.5, 0.04);
          b.stepIdx++;
          if (b.stepIdx >= b.steps.length) {
            b.state = 'serveWalk';
            b.holding = b.orders[0].drink.kind === 'plate' ? 'plate' : 'cup';
            b.path = [{ x: L.serveSpot.x - 8, y: L.baristaHome.y }];
          } else {
            b.state = 'prepWalk';
            b.path = [{ x: b.steps[b.stepIdx].x, y: L.baristaHome.y }];
            b.stepIdx--;
          }
        }
        break;
      }
      case 'serveWalk': {
        if (walker(b, dt)) {
          const order = b.orders.shift();
          world.counterCups.push({ x: L.serveSpot.x, y: L.serveSpot.y, kind: order.drink.kind, owner: order.patron.id });
          b.holding = null;
          SND.cupDown();
          SND.ding();
          if (Math.random() < 0.6) caption(world, 'Nora sets ' + withArticle(order.drink.name) + ' on the counter.');
          b.state = 'idle';
          b.idleT = rnd(4, 9);
        }
        break;
      }
      case 'wipe': {
        if (b.path && b.path.length) { walker(b, dt); break; }
        if (b.stateT < 2.7) {
          b.holding = 'cloth';
          if (!b.swishes) b.swishes = 0;
          if (b.stateT > b.swishes * 0.9) { b.swishes++; SND.swish(); }
        } else {
          b.holding = null; b.swishes = 0;
          b.state = 'idle';
        }
        break;
      }
      case 'polish': {
        if (b.stateT < 2.5) { b.holding = 'cup'; }
        else { b.holding = null; b.state = 'idle'; }
        break;
      }
      case 'restock': {
        if (b.path && b.path.length) { walker(b, dt); break; }
        if (b.stateT > 1.5) {
          SND.clink(0.5, 0.035);
          b.state = 'idle';
        }
        break;
      }
      case 'busOut': {
        if (walker(b, dt)) {
          b.state = 'busCollect'; b.stateT = 0;
        }
        break;
      }
      case 'busCollect': {
        if (b.stateT > 1.3) {
          const tb = world.tables[b.busTarget.table];
          const idx = tb.items.indexOf(b.busTarget.item);
          if (idx >= 0) tb.items.splice(idx, 1);
          b.holding = b.busTarget.item.kind === 'plate' ? 'plate' : 'cup';
          SND.clink(0.6, 0.04);
          SND.swish();
          b.state = 'busHome';
          // back behind the counter
          b.path = [
            { x: b.x, y: L.lane }, { x: L.baristaExitX, y: L.lane },
            { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaHome.x, y: L.baristaHome.y }
          ];
        }
        break;
      }
      case 'busHome': {
        if (walker(b, dt)) {
          b.holding = null;
          SND.clink(0.5, 0.03);
          b.state = 'idle';
        }
        break;
      }
    }

    // face customers at the till when taking an order
    if (b.state === 'idle' && (!b.path || !b.path.length)) {
      const front = world.queue[0];
      b.facing = front && front.state === 'ordering' ? (front.x > b.x ? 1 : -1) : -1;
    }
  }

  function startIdleTask(world, b) {
    // any abandoned cups to collect?
    for (let ti = 0; ti < world.tables.length; ti++) {
      const it = world.tables[ti].items.find(function (i) { return i.owner === null; });
      if (it) {
        b.busTarget = { table: ti, item: it };
        b.state = 'busOut'; b.stateT = 0;
        const tb = world.tables[ti];
        // side tables are approached from the left, clear of the bookshelf
        const busX = tb.x + (tb.small ? -28 : 24);
        b.path = [
          { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
          { x: tb.x, y: L.lane }, { x: busX, y: tb.y + 20 }
        ];
        if (Math.random() < 0.5) caption(world, 'Nora slips out to clear a table.');
        return;
      }
    }
    const r = Math.random();
    if (r < 0.4) {
      b.state = 'wipe'; b.stateT = 0; b.swishes = 0;
      b.path = [{ x: rnd(660, 780), y: L.baristaHome.y }];
      if (Math.random() < 0.2) caption(world, 'Nora wipes down the counter.');
    } else if (r < 0.65) {
      b.state = 'polish'; b.stateT = 0;
      if (Math.random() < 0.25) caption(world, 'Nora polishes a cup until it gleams.');
    } else if (r < 0.85) {
      b.state = 'restock'; b.stateT = 0;
      b.path = [{ x: 858, y: L.baristaHome.y }];
      if (Math.random() < 0.25) caption(world, 'Nora tidies the pastry case.');
    }
    // otherwise just stand a while, watching the room
  }

  /* ---------- cat ---------- */

  const CAT_SPOTS = [
    { x: 390, y: 294, name: 'the fireplace rug' },
    { x: 168, y: 378, name: 'the spot by the window' },
    { x: 340, y: 468, name: 'the big rug' },
    { x: 252, y: 312, name: 'the armchair\'s side' },
    { x: 768, y: 550, name: 'the reading nook rug' }
  ];

  function updateCat(world, cat, dt) {
    cat.animT += dt;
    cat.stateT -= dt;

    if (cat.state === 'walk') {
      if (walker(cat, dt)) {
        const r = Math.random();
        cat.state = r < 0.5 ? 'sleep' : r < 0.8 ? 'loaf' : 'sit';
        cat.stateT = cat.state === 'sleep' ? rnd(40, 100) : rnd(10, 25);
        if (cat.state === 'sleep' && cat.target && cat.target.name === 'the fireplace rug' && Math.random() < 0.5) {
          caption(world, 'The cat curls up in the warmth of the fire.');
        }
      }
      if (cat.bubble && world.t > cat.bubble.until) cat.bubble = null;
      return;
    }

    if (cat.state === 'sleep') {
      cat.purrT -= dt;
      if (cat.purrT <= 0) {
        cat.purrT = rnd(10, 25);
        SND.purr(rnd(1.8, 3));
      }
      if (Math.random() < dt * 0.06) cat.bubble = { icon: 'zzz', until: world.t + 2.6 };
    }

    if (cat.bubble && world.t > cat.bubble.until) cat.bubble = null;
    if (cat.stateT > 0) return;

    switch (cat.state) {
      case 'sleep':
        cat.state = 'sit'; cat.stateT = rnd(5, 12);
        break;
      case 'sit': {
        const r = Math.random();
        if (r < 0.3) { cat.state = 'groom'; cat.stateT = rnd(3, 6); }
        else if (r < 0.5) { cat.state = 'sleep'; cat.stateT = rnd(35, 90); }
        else {
          cat.state = 'stretch'; cat.stateT = 1.6;
        }
        break;
      }
      case 'groom':
        cat.state = Math.random() < 0.5 ? 'sit' : 'sleep';
        cat.stateT = cat.state === 'sleep' ? rnd(35, 90) : rnd(4, 9);
        break;
      case 'stretch': {
        const spot = pick(CAT_SPOTS.filter(function (s) { return Math.hypot(s.x - cat.x, s.y - cat.y) > 24; }));
        cat.state = 'walk';
        cat.target = spot;
        cat.path = [{ x: spot.x, y: spot.y }];
        if (Math.random() < 0.6) caption(world, 'The cat pads over to ' + spot.name + '.');
        if (Math.random() < 0.15) SND.meow();
        break;
      }
      case 'loaf':
        cat.state = Math.random() < 0.6 ? 'sleep' : 'sit';
        cat.stateT = cat.state === 'sleep' ? rnd(35, 90) : rnd(5, 12);
        break;
    }
  }

  SIM.petCat = function (world) {
    const cat = world.cat;
    if (cat.state === 'walk') return;
    cat.bubble = { icon: 'heart', until: world.t + 2.2 };
    if (cat.state === 'sleep') { cat.state = 'sit'; cat.stateT = rnd(6, 12); }
    if (Math.random() < 0.4) SND.meow(); else SND.purr(2);
    caption(world, 'The cat purrs happily.');
  };

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
      world.counterCups.forEach(function (c) { spawnSteam(world, c.x + 5, c.y - 4); });
      world.tables.forEach(function (tb) {
        tb.items.forEach(function (it) {
          if (it.hot > 0 && !it.hidden && it.kind !== 'plate' && Math.random() < 0.8) {
            spawnSteam(world, tb.x + it.side * 24, tb.y - 16);
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
      p.y += p.vy * dt;
      if (p.age >= p.life) world.particles.splice(i, 1);
    }
  }

  /* ---------- main update ---------- */

  SIM.update = function (world, dt) {
    world.t += dt;
    updateClock(world, dt);
    updateWeather(world, dt);
    updateDoor(world, dt);
    updateSpawning(world, dt);
    updateBarista(world, world.barista, dt);
    world.patrons.forEach(function (p) { updatePatron(world, p, dt); });
    world.patrons = world.patrons.filter(function (p) { return !p.gone; });
    updateCat(world, world.cat, dt);
    updateParticles(world, dt);
    updateCaptions(world, dt);
  };

  /* ---------- what to draw ---------- */

  SIM.entityDrawables = function (world) {
    const draws = [];
    const bubbles = [];
    world.patrons.forEach(function (p) {
      draws.push({ y: p.y, draw: function (g) { SCENE.drawPerson(g, p); } });
      if (p.bubble) bubbles.push({ x: p.x, y: p.pose === 'sit' ? p.y + 6 : p.y, icon: p.bubble.icon });
    });
    const b = world.barista;
    draws.push({ y: b.y, draw: function (g) { SCENE.drawPerson(g, b); } });
    const cat = world.cat;
    draws.push({ y: cat.y, draw: function (g) { SCENE.drawCat(g, cat); } });
    if (cat.bubble) bubbles.push({ x: cat.x, y: cat.y + 34, icon: cat.bubble.icon });
    return { draws: draws, bubbles: bubbles };
  };

  /* ---------- debug contract ----------
     Internals exposed for js/dev.js (the ?dev harness) only. Not part of the
     app: nothing in scene/main/audio may reach in here, and the harness must
     keep working against exactly this bundle. */
  SIM._ = {
    makePath: makePath, freeSeat: freeSeat, caption: caption,
    makePatron: makePatron, ringDoor: ringDoor,
    queueSlot: queueSlot, waitSpot: waitSpot, DRINKS: DRINKS,
    START_HOUR: START_HOUR, DAY_SECONDS: DAY_SECONDS
  };
})();
