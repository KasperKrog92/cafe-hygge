/* Café Hygge — barista, cat, and simulation orchestration */
(function () {
  'use strict';

  const SIM = window.SIM;
  const R = SIM._;
  const L = R.L;
  const rnd = R.rnd, withArticle = R.withArticle, pick = R.pick;
  const caption = R.caption, walker = R.walker, spawnSteam = R.spawnSteam;
  const updateClock = R.updateClock, updateWeather = R.updateWeather;
  const updateDoor = R.updateDoor, updateSpawning = R.updateSpawning;
  const updatePatron = R.updatePatron, updateParticles = R.updateParticles;
  const updateCaptions = R.updateCaptions;

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
          // back behind the counter: the outbound route reversed, then home
          b.path = busRoute(world, b.busTarget.table).slice(0, -1).reverse();
          b.path.push({ x: L.baristaHome.x, y: L.baristaHome.y });
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
      case 'refillOut': {
        if (walker(b, dt)) {
          b.state = 'refill'; b.stateT = 0; b.refillPlayed = false;
          b.holding = b.refillKinds.indexOf('water') >= 0 ? 'cup' : null;
        }
        break;
      }
      case 'refill': {
        if (!b.refillPlayed && b.stateT > 0.3) {
          b.refillPlayed = true;
          if (b.refillKinds.indexOf('food') >= 0) SND.kibblePour(0.9);
          if (b.refillKinds.indexOf('water') >= 0) SND.kettlePour(0.75);
        }
        if (b.stateT > 1.6) {
          b.refillKinds.forEach(function (kind) { world.catBowls[kind] = 1; });
          b.holding = null;
          if (Math.random() < 0.5) caption(world, 'Nora tops up the cat\'s bowl.');
          if (world.cat.waitingBowl && Math.random() < 0.25) caption(world, 'The cat supervises the refill closely.');
          b.state = 'refillHome'; b.stateT = 0;
          b.path = refillRoute().slice(0, -1).reverse();
          b.path.push({ x: L.baristaHome.x, y: L.baristaHome.y });
        }
        break;
      }
      case 'refillHome': {
        if (walker(b, dt)) { b.state = 'idle'; b.idleT = rnd(5, 10); }
        break;
      }
      case 'shooCat': {
        if (b.path && b.path.length) {
          if (walker(b, dt)) b.stateT = 0;
          break;
        }
        if (!b.shooed && b.stateT > 0.8) {
          b.shooed = true;
          SND.swish();
          caption(world, 'Nora shoos the cat off the counter — house rules.');
          leavePerch(world, world.cat);
        }
        if (b.stateT > 1.5) { b.shooed = false; b.state = 'idle'; b.idleT = rnd(5, 10); }
        break;
      }
    }

    // face customers at the till when taking an order
    if (b.state === 'idle' && (!b.path || !b.path.length)) {
      const front = world.queue[0];
      b.facing = front && front.state === 'ordering' ? (front.x > b.x ? 1 : -1) : -1;
    }
  }

  /* Nora's route from behind the counter to a table's bus spot, every leg
     axis-aligned. Big tables: drop from the lane at the bus spot itself.
     Side tables: drop through the table's declared clear column (L busVia —
     between the wing chairs and reading lamps), then step across in front.
     Shared with __dev.audit(), which walks these segments against the
     occluder and footprint boxes. */
  function busRoute(world, ti) {
    const tb = world.tables[ti];
    const busX = tb.x + (tb.small ? -28 : 24);
    // tall window tables live on the wall; Nora stands at their floor line
    const busY = tb.tall ? tb.base + 2 : tb.y + 20;
    const dropX = tb.small ? tb.busVia : busX;
    const route = [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: dropX, y: L.lane }, { x: dropX, y: busY }
    ];
    if (dropX !== busX) route.push({ x: busX, y: busY });
    return route;
  }

  function refillRoute() {
    return [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: L.catCorner.noraSpot.x, y: L.lane },
      { x: L.catCorner.noraSpot.x, y: L.catCorner.noraSpot.y }
    ];
  }

  function startIdleTask(world, b) {
    // any abandoned cups to collect?
    for (let ti = 0; ti < world.tables.length; ti++) {
      const it = world.tables[ti].items.find(function (i) { return i.owner === null; });
      if (it) {
        b.busTarget = { table: ti, item: it };
        b.state = 'busOut'; b.stateT = 0;
        b.path = busRoute(world, ti);
        if (Math.random() < 0.5) caption(world, 'Nora slips out to clear a table.');
        return;
      }
    }
    // Bowl care comes immediately after clearing tables: never urgent, but
    // Nora notices before she invents another counter-polishing task.
    const refillKinds = [];
    if (world.catBowls.food < 0.34) refillKinds.push('food');
    if (world.catBowls.water < 0.2) refillKinds.push('water');
    if (refillKinds.length) {
      b.refillKinds = refillKinds;
      b.state = 'refillOut'; b.stateT = 0;
      b.path = refillRoute();
      return;
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

  const CAT_SPOTS = L.catSpots;
  const CP = L.catPerches;
  const WINDOW_SPOTS = CP.windows.map(function (p, i) {
    return { id: p.id, name: i ? 'the second window sill' : 'the middle window sill', kind: 'perch',
      surface: p.surface, stand: p.stand, anchor: p.anchor };
  });
  const BOOK_SPOT = { id: 'bookshelf', name: 'the top of the bookshelf', kind: 'perch',
    surface: CP.bookshelf.surface, stand: CP.bookshelf.stand, anchor: CP.bookshelf.anchor };

  // Only pairs that fail the cat-journey audit take the little shared clear
  // corridor. Every other pair keeps the house-precedent straight cat line.
  const CAT_VIA_PAIRS = {};
  [
    'fire>bigRug', 'fire>armchair', 'fire>nookRug', 'fire>cushion', 'fire>window1Stand',
    'fire>window2Stand', 'fire>counterStand', 'fire>topShelfStand', 'fire>eat',
    'windowFloor>bigRug', 'windowFloor>nookRug', 'windowFloor>window2Stand', 'windowFloor>bookshelfStand',
    'bigRug>fire', 'bigRug>windowFloor', 'bigRug>window2Stand', 'bigRug>bookshelfStand',
    'bigRug>counterStand', 'bigRug>topShelfStand', 'armchair>fire', 'armchair>nookRug',
    'armchair>window2Stand', 'nookRug>fire', 'nookRug>windowFloor', 'nookRug>armchair',
    'nookRug>cushion', 'nookRug>window1Stand', 'nookRug>window2Stand', 'nookRug>counterStand',
    'nookRug>eat', 'cushion>fire', 'cushion>nookRug', 'cushion>window2Stand',
    'cushion>counterStand', 'cushion>topShelfStand', 'window1Stand>fire', 'window1Stand>nookRug',
    'window1Stand>window2Stand', 'window1Stand>bookshelfStand', 'window1Stand>counterStand',
    'window1Stand>topShelfStand', 'window2Stand>fire', 'window2Stand>windowFloor',
    'window2Stand>bigRug', 'window2Stand>armchair', 'window2Stand>nookRug', 'window2Stand>cushion',
    'window2Stand>window1Stand', 'window2Stand>counterStand', 'window2Stand>topShelfStand',
    'bookshelfStand>windowFloor', 'bookshelfStand>bigRug', 'bookshelfStand>window1Stand',
    'bookshelfStand>counterStand', 'counterStand>fire', 'counterStand>bigRug',
    'counterStand>nookRug', 'counterStand>cushion', 'counterStand>window1Stand',
    'counterStand>window2Stand', 'counterStand>bookshelfStand', 'counterStand>eat',
    'topShelfStand>fire', 'topShelfStand>bigRug', 'topShelfStand>cushion',
    'topShelfStand>window1Stand', 'topShelfStand>window2Stand', 'topShelfStand>eat',
    'eat>fire', 'eat>nookRug', 'eat>counterStand', 'eat>topShelfStand'
  ].forEach(function (key) { CAT_VIA_PAIRS[key] = true; });
  ['fire', 'windowFloor', 'bigRug', 'armchair', 'nookRug', 'cushion',
    'window1Stand', 'window2Stand', 'bookshelfStand', 'counterStand',
    'topShelfStand', 'eat'].forEach(function (id) {
    CAT_VIA_PAIRS[id + '>bookshelfEscape'] = true;
    CAT_VIA_PAIRS['bookshelfEscape>' + id] = true;
  });

  const CAT_APPROACH = L.catRoutes;

  function routeId(id) {
    if (/^lapStand/.test(id)) return 'lapStand';
    return id === 'window1' ? 'window1Stand' : id === 'window2' ? 'window2Stand'
      : id === 'bookshelf' ? 'bookshelfStand' : id === 'counter' ? 'counterStand'
      : id === 'topShelf' ? 'topShelfStand' : id;
  }

  function catRoute(from, to) {
    const fromId = routeId((from && from.id) || 'free'), toId = routeId(to.id || 'free');
    const key = fromId + '>' + toId;
    let via = to.via || [];
    if (CAT_VIA_PAIRS[key] || fromId === 'lapStand' || toId === 'lapStand') {
      const out = (from && from.approach) || CAT_APPROACH[fromId] || [];
      const into = (to.approach || CAT_APPROACH[toId] || []).slice().reverse();
      via = out.concat(into);
    }
    return via.map(function (p) { return { x: p.x, y: p.y }; }).concat([{ x: to.x, y: to.y }]);
  }

  function quietCafe(world) {
    return !world.queue.length && !world.barista.orders.length && !world.brew.active;
  }

  function nookChairTwoFree(world) {
    const nook = world.seats.filter(function (s) { return s.nook; });
    return !nook[1] || !nook[1].taken;
  }

  function spotWeight(world, cat, spot) {
    if (spot.id === 'fire') return (world.hour >= 18 || world.hour < 6) ? 3.2 : 1.4;
    if (spot.id === 'windowFloor') return 1.1;
    if (spot.id === 'bigRug') return 1.2;
    if (spot.id === 'armchair') return 0.8;
    if (spot.id === 'nookRug') return (world.hour >= 23 || world.hour < 6) ? 2.1 : 1.1;
    if (spot.id === 'cushion') return 2.2 + (cat.foodComaT > 0 ? 4 : 0);
    if (/^window/.test(spot.id)) {
      return 0.65 * (world.rain > 0.3 ? 2.5 : 1) * (world.daylight < 0.3 ? 2 : 1);
    }
    if (spot.id === 'bookshelf') return nookChairTwoFree(world) ? 0.45 : 0;
    return 1;
  }

  function pickCatSpot(world, cat) {
    const all = CAT_SPOTS.concat(WINDOW_SPOTS).concat([BOOK_SPOT]).filter(function (s) {
      if (cat.target && routeId(s.id) === routeId(cat.target.id)) return false;
      return spotWeight(world, cat, s) > 0;
    });
    let total = 0;
    all.forEach(function (s) { total += spotWeight(world, cat, s); });
    let r = Math.random() * total;
    for (const s of all) {
      r -= spotWeight(world, cat, s);
      if (r <= 0) return s;
    }
    return CAT_SPOTS[0];
  }

  function restTime(world, a, b) {
    const nightProwl = world.hour >= 23 || world.hour < 6;
    return rnd(a, b) * (nightProwl ? 0.65 : 1);
  }

  function settleOnFloor(world, cat) {
    const kneadable = cat.target && ['fire', 'bigRug', 'nookRug', 'cushion'].indexOf(cat.target.id) >= 0;
    if (kneadable && Math.random() < 0.3) {
      cat.state = 'knead'; cat.stateT = rnd(2.5, 4); cat.kneadPlayed = false;
      return;
    }
    const r = Math.random();
    cat.state = r < 0.5 ? 'sleep' : r < 0.8 ? 'loaf' : 'sit';
    cat.stateT = cat.state === 'sleep' ? restTime(world, 40, 100) : restTime(world, 10, 25);
    if (cat.state === 'sleep' && cat.target && cat.target.id === 'fire' && Math.random() < 0.5) {
      caption(world, 'The cat curls up in the warmth of the fire.');
    }
  }

  function beginHop(cat, step) {
    const dist = Math.hypot(step.x - cat.x, step.y - cat.y);
    cat.hopFrom = { x: cat.x, y: cat.y };
    cat.hopTo = step;
    cat.hopT = 0;
    cat.hopDur = Math.max(0.35, Math.min(0.55, 0.35 + dist / 500));
    cat.state = 'hop';
  }

  function beginHopQueue(cat, steps, after) {
    cat.hopQueue = steps.slice();
    cat.hopAfter = after;
    cat.hopPurpose = after.intent;
    beginHop(cat, cat.hopQueue.shift());
  }

  function finishHopQueue(world, cat) {
    const after = cat.hopAfter || { intent: 'down' };
    cat.hopQueue = null; cat.hopAfter = null; cat.hopPurpose = '';
    if (after.intent === 'window') {
      cat.state = Math.random() < 0.3 ? 'sleep' : 'perch';
      cat.stateT = rnd(60, 180); cat.facing = -1;
      if (Math.random() < 0.4) {
        caption(world, world.rain > 0.3 ? 'The cat watches the rain wander down the glass.'
          : world.daylight < 0.3 ? 'The cat and the streetlamp keep watch together.'
          : 'The cat watches the street drift by.');
      }
    } else if (after.intent === 'bookshelf') {
      cat.state = Math.random() < 0.45 ? 'sleep' : 'sit'; cat.stateT = rnd(60, 180); cat.facing = -1;
      if (Math.random() < 0.5) caption(world, 'The cat surveys the café from the bookshelf. All is well.');
    } else if (after.intent === 'counter') {
      cat.intent = 'counterPad';
      cat.state = 'walk';
      cat.path = [{ x: Math.round(rnd(CP.counter.padX0, CP.counter.padX1)), y: CP.counter.anchor.y }];
      cat.facing = -1;
    } else if (after.intent === 'topShelf') {
      cat.state = Math.random() < 0.5 ? 'loaf' : 'sit'; cat.stateT = rnd(60, 180); cat.facing = -1;
      if (Math.random() < 0.45) caption(world, 'Nora pretends not to see the cat on the shelf.');
    } else if (after.intent === 'lap') {
      cat.state = 'lap'; cat.stateT = 9999; cat.facing = after.patron.facing;
      cat.lapPatron = after.patron; after.patron.lapCat = true;
    } else {
      cat.surface = 'floor'; cat.state = 'sit'; cat.stateT = 1;
      cat.target = after.floorTarget || { id: 'landing', x: cat.x, y: cat.y, kind: 'floor' };
    }
  }

  function updateHop(world, cat, dt) {
    cat.hopT += dt;
    const q = Math.min(1, cat.hopT / cat.hopDur);
    const dx = cat.hopTo.x - cat.hopFrom.x, dy = cat.hopTo.y - cat.hopFrom.y;
    const arc = Math.hypot(dx, dy) * 0.4 * 4 * q * (1 - q);
    cat.x = cat.hopFrom.x + dx * q;
    cat.y = cat.hopFrom.y + dy * q - arc;
    if (Math.abs(dx) > 1) cat.facing = dx > 0 ? 1 : -1;
    if (q < 1) return;
    const step = cat.hopTo;
    cat.x = step.x; cat.y = step.y;
    if (step.surface) cat.surface = step.surface;
    if (step.land) SND.softThump();
    if (cat.hopPurpose === 'topShelf' && cat.ascentMayAbort && step.surface === 'counter' && world.barista.state === 'idle') {
      cat.hopQueue = null; cat.hopAfter = null; cat.hopPurpose = ''; cat.state = 'sit';
      cat.ascentMayAbort = false;
      SND.swish();
      caption(world, 'Nora catches the cat halfway up. Not today.');
      leavePerch(world, cat);
      return;
    }
    if (cat.hopQueue && cat.hopQueue.length) beginHop(cat, cat.hopQueue.shift());
    else finishHopQueue(world, cat);
  }

  function startTravel(cat, spot, intent) {
    const dest = spot.stand || spot;
    const from = cat.target || { id: 'free' };
    cat.intent = intent || (spot.kind === 'perch' ? spot.id : 'floor');
    cat.target = spot;
    cat.state = 'walk';
    cat.path = catRoute(from, { id: spot.id, x: dest.x, y: dest.y, via: spot.via, approach: spot.approach });
  }

  function startEating(world, cat, kind) {
    const empty = kind === 'eat' ? world.catBowls.food < 0.34 : world.catBowls.water < 0.2;
    if (empty) {
      cat.state = 'sit'; cat.stateT = rnd(60, 120); cat.waitingBowl = kind; cat.facing = 1;
      cat.retryNeedT = cat.stateT;
      if (Math.random() < 0.7) caption(world, 'The cat sits by the empty bowl, radiating patience.');
      if (Math.random() < 0.35) SND.meow();
      return;
    }
    cat.waitingBowl = '';
    cat.state = kind; cat.stateT = kind === 'eat' ? rnd(6, 10) : rnd(3, 5);
    cat.needSoundT = 0; cat.facing = -1;
  }

  function startNeed(cat, kind) {
    startTravel(cat, { id: 'eat', x: L.catCorner.eatSpot.x, y: L.catCorner.eatSpot.y,
      name: 'the cat bowls', kind: 'floor' }, kind);
  }

  function arriveFromWalk(world, cat) {
    if (cat.intent === 'counterPad') {
      cat.sniffedPass = world.counterCups.length > 0;
      cat.counterAfterSniff = cat.sniffedPass;
      cat.state = cat.sniffedPass ? 'sit' : 'loaf';
      cat.stateT = cat.sniffedPass ? 1 : 240;
      cat.noticeT = rnd(3, 8); cat.facing = -1;
      return;
    }
    if (cat.intent === 'eat' || cat.intent === 'drink') {
      cat.surface = 'floor'; startEating(world, cat, cat.intent); return;
    }
    if (cat.intent === 'window1' || cat.intent === 'window2') {
      beginHopQueue(cat, [{ x: cat.target.anchor.x, y: cat.target.anchor.y, surface: 'sill' }], { intent: 'window' });
      return;
    }
    if (cat.intent === 'bookshelf') {
      beginHopQueue(cat, [
        { x: CP.bookshelf.chairBack.x, y: CP.bookshelf.chairBack.y },
        { x: CP.bookshelf.anchor.x, y: CP.bookshelf.anchor.y, surface: 'shelfTop' }
      ], { intent: 'bookshelf' });
      return;
    }
    if (cat.intent === 'counter') {
      beginHopQueue(cat, [{ x: CP.counter.anchor.x, y: CP.counter.anchor.y, surface: 'counter' }], { intent: 'counter' });
      return;
    }
    if (cat.intent === 'topShelf') {
      cat.ascentMayAbort = Math.random() < 0.3;
      beginHopQueue(cat, [
        { x: CP.topShelf.counter.x, y: CP.topShelf.counter.y, surface: 'counter' },
        { x: CP.topShelf.machine.x, y: CP.topShelf.machine.y, surface: 'machine' },
        { x: CP.topShelf.anchor.x, y: CP.topShelf.anchor.y, surface: 'backShelf' }
      ], { intent: 'topShelf' });
      return;
    }
    if (cat.intent === 'lap') {
      beginHopQueue(cat, [{ x: cat.lapAnchor.x, y: cat.lapAnchor.y, surface: 'lap' }],
        { intent: 'lap', patron: cat.lapCandidate });
      return;
    }
    if (cat.intent === 'mote') { startPounce(world, cat); return; }
    cat.surface = 'floor';
    settleOnFloor(world, cat);
  }

  function leavePerch(world, cat) {
    if (cat.state === 'hop') return;
    let steps = [], floorTarget;
    if (cat.surface === 'sill') {
      steps = [{ x: cat.target.stand.x, y: cat.target.stand.y, surface: 'floor', land: true }];
      floorTarget = { id: cat.target.id + 'Stand', x: cat.target.stand.x, y: cat.target.stand.y, kind: 'floor' };
    } else if (cat.surface === 'shelfTop') {
      if (nookChairTwoFree(world)) {
        steps = [{ x: CP.bookshelf.chairBack.x, y: CP.bookshelf.chairBack.y },
          { x: CP.bookshelf.stand.x, y: CP.bookshelf.stand.y, surface: 'floor', land: true }];
        floorTarget = { id: 'bookshelfStand', x: CP.bookshelf.stand.x, y: CP.bookshelf.stand.y, kind: 'floor' };
      } else {
        steps = [{ x: CP.bookshelf.escape.x, y: CP.bookshelf.escape.y, surface: 'floor', land: true }];
        floorTarget = { id: 'bookshelfEscape', x: CP.bookshelf.escape.x, y: CP.bookshelf.escape.y, kind: 'floor' };
      }
    } else if (cat.surface === 'counter') {
      steps = [{ x: CP.counter.stand.x, y: CP.counter.stand.y, surface: 'floor', land: true }];
      floorTarget = { id: 'counterStand', x: CP.counter.stand.x, y: CP.counter.stand.y, kind: 'floor' };
    } else if (cat.surface === 'backShelf' || cat.surface === 'machine') {
      steps = [
        { x: CP.topShelf.machine.x, y: CP.topShelf.machine.y, surface: 'machine' },
        { x: CP.topShelf.counter.x, y: CP.topShelf.counter.y, surface: 'counter' },
        { x: CP.topShelf.stand.x, y: CP.topShelf.stand.y, surface: 'floor', land: true }
      ];
      floorTarget = { id: 'topShelfStand', x: CP.topShelf.stand.x, y: CP.topShelf.stand.y, kind: 'floor' };
    } else if (cat.surface === 'lap') {
      steps = [{ x: cat.lapStand.x, y: cat.lapStand.y, surface: 'floor', land: true }];
      floorTarget = { id: 'lapStand', x: cat.lapStand.x, y: cat.lapStand.y, kind: 'floor',
        approach: [{ x: cat.lapStand.x, y: L.lane }] };
    }
    if (steps.length) beginHopQueue(cat, steps, { intent: 'down', floorTarget: floorTarget });
  }

  function findLapPatron(world) {
    return world.patrons.find(function (p) {
      return p.state === 'seated' && p.reading && (p.seat.armchair || p.seat.nook) && !p.lapCat;
    });
  }

  function startLap(cat, patron) {
    const seat = patron.seat;
    cat.lapCandidate = patron;
    cat.lapStand = { x: seat.x + seat.facing * 38, y: seat.y + 16 };
    cat.lapAnchor = { x: seat.x + seat.facing * 6, y: seat.y + 2 };
    startTravel(cat, { id: 'lapStand', x: cat.lapStand.x, y: cat.lapStand.y, kind: 'floor',
      approach: [{ x: cat.lapStand.x, y: L.lane }] }, 'lap');
  }

  function startPounce(world, cat) {
    cat.state = 'pounce'; cat.pounceDur = rnd(3, 6); cat.stateT = cat.pounceDur;
    cat.pounceBase = { x: cat.x, y: cat.y };
    world.particles.push({ type: 'mote', x: cat.x + cat.facing * 16, y: cat.y - 20,
      vx: cat.facing * 2, vy: -1.5, age: 0, life: cat.pounceDur, seed: Math.random() * 5 });
    caption(world, Math.random() < 0.5 ? 'The cat does battle with a dust mote.' : 'The dust mote wins this round.');
  }

  function startNextJourney(world, cat) {
    if (quietCafe(world) && cat.ascentT <= 0) {
      cat.ascentT = rnd(900, 1600);
      startTravel(cat, { id: 'topShelf', stand: CP.topShelf.stand, kind: 'perch' }, 'topShelf');
      return;
    }
    if (quietCafe(world) && cat.counterT <= 0) {
      cat.counterT = rnd(1200, 2400);
      startTravel(cat, { id: 'counter', stand: CP.counter.stand, kind: 'perch' }, 'counter');
      return;
    }
    const nearSunbeam = (Math.abs(cat.x - (L.win.x + L.win.w / 2)) < 120 ||
      Math.abs(cat.x - (L.win2.x + L.win2.w / 2)) < 120) && cat.y < 430;
    if (cat.moteT <= 0 && world.daylight > 0.6 && nearSunbeam) {
      cat.moteT = rnd(180, 420); startPounce(world, cat); return;
    }
    const lap = findLapPatron(world);
    if (lap && Math.random() < 0.15) { startLap(cat, lap); return; }
    const spot = pickCatSpot(world, cat);
    startTravel(cat, spot, spot.kind === 'perch' ? spot.id : 'floor');
    if (Math.random() < 0.6) caption(world, 'The cat pads over to ' + spot.name + '.');
    if (Math.random() < 0.15) SND.meow();
  }

  function forceCat(world, cat, action) {
    if (action === 'eat') { cat.hungerT = 0; startNeed(cat, 'eat'); }
    else if (action === 'window') startTravel(cat, WINDOW_SPOTS[0], 'window1');
    else if (action === 'bookshelf') startTravel(cat, BOOK_SPOT, 'bookshelf');
    else if (action === 'counter') startTravel(cat, { id: 'counter', stand: CP.counter.stand, kind: 'perch' }, 'counter');
    else if (action === 'topShelf') startTravel(cat, { id: 'topShelf', stand: CP.topShelf.stand, kind: 'perch' }, 'topShelf');
    else if (action === 'lap') {
      const p = findLapPatron(world);
      if (p) startLap(cat, p); else { cat.state = 'sit'; cat.stateT = 2; }
    } else if (action === 'mote') startPounce(world, cat);
    else if (action === 'knead') { cat.state = 'knead'; cat.stateT = rnd(2.5, 4); cat.kneadPlayed = false; }
  }

  function updateCatGaze(world, cat, dt) {
    if (cat.surface === 'floor' || cat.surface === 'lap' || cat.state === 'sleep') return;
    if (cat.gazeDur > 0) {
      cat.gazeDur -= dt;
      if (cat.gazeDur <= 0) { cat.gazeFacing = 0; cat.gazeT = rnd(15, 40); }
      return;
    }
    cat.gazeT -= dt;
    if (cat.gazeT <= 0) {
      const walkers = world.patrons.filter(function (p) { return p.pose === 'walk'; });
      if (walkers.length) {
        walkers.sort(function (a, b) { return Math.abs(a.x - cat.x) - Math.abs(b.x - cat.x); });
        cat.gazeFacing = walkers[0].x >= cat.x ? 1 : -1;
        cat.gazeDur = rnd(2, 4);
      } else cat.gazeT = rnd(8, 16);
    }
  }

  function updateCat(world, cat, dt) {
    cat.animT += dt;
    cat.stateT -= dt;
    cat.hungerT -= dt; cat.thirstT -= dt;
    cat.counterT -= dt; cat.ascentT -= dt; cat.moteT -= dt;
    cat.retryNeedT = Math.max(0, cat.retryNeedT - dt);
    cat.foodComaT = Math.max(0, cat.foodComaT - dt);

    if (cat.doorGlanceT > 0) {
      cat.doorGlanceT -= dt;
      if (cat.doorGlanceT <= 0) cat.facing = cat.doorFacing;
    }
    if (cat.bubble && world.t > cat.bubble.until) cat.bubble = null;

    if (cat.forced) {
      const forced = cat.forced; cat.forced = '';
      forceCat(world, cat, forced);
    }

    if (cat.state === 'hop') { updateHop(world, cat, dt); return; }
    if (cat.state === 'walk') { if (walker(cat, dt)) arriveFromWalk(world, cat); return; }

    if (cat.state === 'eat' || cat.state === 'drink') {
      cat.needSoundT -= dt;
      if (cat.needSoundT <= 0) {
        cat.needSoundT = cat.state === 'eat' ? rnd(1.1, 1.7) : rnd(0.22, 0.32);
        if (cat.state === 'eat') SND.crunch(); else SND.lapWater();
      }
      if (cat.stateT <= 0) {
        if (cat.state === 'eat') {
          world.catBowls.food = Math.max(0, world.catBowls.food - 0.34);
          cat.hungerT = rnd(420, 720); cat.foodComaT = 150;
          if (Math.random() < 0.8) { startNeed(cat, 'drink'); return; }
        } else {
          world.catBowls.water = Math.max(0, world.catBowls.water - 0.2);
          cat.thirstT = rnd(500, 800);
        }
        cat.state = 'sit'; cat.stateT = rnd(3, 8);
      }
      return;
    }

    if (cat.state === 'pounce') {
      const progress = Math.max(0, Math.min(1, 1 - cat.stateT / cat.pounceDur));
      cat.x = cat.pounceBase.x + Math.sin(progress * Math.PI * 3) * 10;
      cat.y = cat.pounceBase.y - Math.abs(Math.sin(progress * Math.PI * 3)) * 8;
      if (cat.stateT <= 0) {
        cat.x = cat.pounceBase.x; cat.y = cat.pounceBase.y;
        cat.state = 'groom'; cat.stateT = rnd(3, 5);
      }
      return;
    }

    if (cat.state === 'sleep' || cat.state === 'lap') {
      cat.purrT -= dt;
      if (cat.purrT <= 0) {
        cat.purrT = cat.state === 'lap' ? rnd(7, 16) : rnd(10, 25);
        SND.purr(rnd(1.8, 3));
      }
      if (Math.random() < dt * 0.06) cat.bubble = { icon: 'zzz', until: world.t + 2.6 };
    }
    if (cat.state === 'knead' && !cat.kneadPlayed) {
      cat.kneadPlayed = true;
      SND.purr(2.4);
      if (Math.random() < 0.3) caption(world, 'The cat kneads the rug into shape.');
    }

    updateCatGaze(world, cat, dt);

    if (cat.surface === 'counter') {
      if (cat.counterAfterSniff && cat.stateT <= 0) {
        cat.counterAfterSniff = false; cat.state = 'loaf'; cat.stateT = 240;
      }
      cat.noticeT -= dt;
      if (cat.noticeT <= 0 && world.barista.state === 'idle' && quietCafe(world)) {
        world.barista.state = 'shooCat'; world.barista.stateT = 0; world.barista.shooed = false;
        world.barista.path = [{ x: cat.x, y: L.baristaHome.y }];
      }
    }

    if (cat.waitingBowl) {
      const refilled = cat.waitingBowl === 'eat' ? world.catBowls.food >= 0.34 : world.catBowls.water >= 0.2;
      if (refilled) { startEating(world, cat, cat.waitingBowl); return; }
    }

    const interruptible = ['sleep', 'sit', 'groom', 'stretch', 'loaf'].indexOf(cat.state) >= 0;
    if (cat.surface === 'floor' && interruptible && !cat.waitingBowl && cat.retryNeedT <= 0) {
      if (cat.hungerT <= 0) { startNeed(cat, 'eat'); return; }
      if (cat.thirstT <= 0) { startNeed(cat, 'drink'); return; }
    }

    if (cat.state === 'lap') return;
    if (cat.stateT > 0) return;

    if (cat.surface !== 'floor') { leavePerch(world, cat); return; }

    switch (cat.state) {
      case 'sleep': cat.state = 'sit'; cat.stateT = restTime(world, 5, 12); break;
      case 'sit': {
        const r = Math.random();
        if (r < 0.3) { cat.state = 'groom'; cat.stateT = rnd(3, 6); }
        else if (r < 0.5) { cat.state = 'sleep'; cat.stateT = restTime(world, 35, 90); }
        else { cat.state = 'stretch'; cat.stateT = 1.6; }
        break;
      }
      case 'groom':
        cat.state = Math.random() < 0.5 ? 'sit' : 'sleep';
        cat.stateT = cat.state === 'sleep' ? restTime(world, 35, 90) : restTime(world, 4, 9);
        break;
      case 'stretch': startNextJourney(world, cat); break;
      case 'loaf':
        cat.state = Math.random() < 0.6 ? 'sleep' : 'sit';
        cat.stateT = cat.state === 'sleep' ? restTime(world, 35, 90) : restTime(world, 5, 12);
        break;
      case 'knead':
        cat.state = 'sleep'; cat.stateT = restTime(world, 40, 100);
        break;
      default: cat.state = 'sit'; cat.stateT = 4;
    }
  }

  SIM.petCat = function (world) {
    const cat = world.cat;
    if (cat.state === 'walk' || cat.state === 'hop' || cat.state === 'pounce') return;
    cat.bubble = { icon: 'heart', until: world.t + 2.2 };
    if (cat.state === 'sleep' && cat.surface !== 'lap') { cat.state = 'sit'; cat.stateT = rnd(6, 12); }
    if (Math.random() < 0.4) SND.meow(); else SND.purr(2);
    caption(world, 'The cat purrs happily.');
  };

  SIM.dislodgeCat = function (patron) {
    const world = window.__world;
    if (!world || world.cat.lapPatron !== patron) return;
    patron.lapCat = false;
    world.cat.lapPatron = null;
    if (Math.random() < 0.4) caption(world, 'The cat is gently returned to the floor.');
    leavePerch(world, world.cat);
  };

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

  R.updateBarista = updateBarista;
  R.updateCat = updateCat;
  R.busRoute = busRoute;
  R.refillRoute = refillRoute;
  R.catRoute = catRoute;
  R.catSpots = CAT_SPOTS;
  R.catPerches = WINDOW_SPOTS.concat([BOOK_SPOT]);
})();
