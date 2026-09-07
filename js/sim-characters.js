/* Café Hygge — barista, cat, and simulation orchestration */
(function () {
  'use strict';

  const SIM = window.SIM;
  const R = SIM._;
  const SND = R.sound;
  const L = R.L;
  const rnd = R.rnd, withArticle = R.withArticle, pick = R.pick, holdingFor = R.holdingFor;
  const caption = R.caption, captionRun = R.captionRun, walker = R.walker, spawnSteam = R.spawnSteam;
  const CAST = window.CAST;
  const updateClock = R.updateClock, updateWeather = R.updateWeather;
  const updatePassersby = R.updatePassersby;
  const updateCandles = R.updateCandles, dayIndex = R.dayIndex;
  const updateFire = R.updateFire, addLog = R.addLog;
  const updateDoor = R.updateDoor, updateSpawning = R.updateSpawning;
  const updatePatron = R.updatePatron, updateParticles = R.updateParticles;
  const updateCaptions = R.updateCaptions;
  const updateNarrative = R.updateNarrative;
  const arcStages = R.arcStages, arcBeat = R.arcBeat, arcFlag = R.arcFlag;

  /* ---------- barista ---------- */

  // steps worked at the espresso machine (back wall, above her standing line);
  // she faces away from the room for these. Everything else — the matcha bar
  // and the pastry case — sits on the front counter and she faces the room.
  const MACHINE_STAGES = ['grind', 'tamp', 'pull', 'steam', 'kettle'];

  const PREP_STEPS = {
    coffee_milk: [
      { x: L.machine.x + 8, act: 'grind', dur: 1.5 },
      { x: L.machine.x + 8, act: 'tamp', dur: 0.55 },
      { x: L.machine.x + 22, act: 'pull', dur: 2.4 },
      { x: L.machine.x + 50, act: 'steam', dur: 1.8 }
    ],
    coffee: [
      { x: L.machine.x + 8, act: 'grind', dur: 1.5 },
      { x: L.machine.x + 8, act: 'tamp', dur: 0.55 },
      { x: L.machine.x + 22, act: 'pull', dur: 2.4 }
    ],
    tea: [{ x: L.machine.x + 44, act: 'kettle', dur: 2.0 }],
    milk: [{ x: L.machine.x + 50, act: 'steam', dur: 1.8 }],
    matcha_hot: [
      { x: L.matchaBar.x, act: 'scoop', dur: 0.8 },
      { x: L.machine.x + 44, act: 'kettle', dur: 1.4 },
      { x: L.matchaBar.x, act: 'whisk', dur: 2.2 },
      { x: L.machine.x + 50, act: 'steam', dur: 1.8 }
    ],
    matcha_iced: [
      { x: L.matchaBar.x, act: 'scoop', dur: 0.8 },
      { x: L.machine.x + 44, act: 'kettle', dur: 1.0 },
      { x: L.matchaBar.x, act: 'whisk', dur: 2.2 },
      { x: L.matchaBar.x, act: 'ice', dur: 1.0 }
    ],
    food: [{ x: 858, act: 'fetch', dur: 1.4 }]
  };

  function prepTarget(step) {
    return { x: step.x, y: MACHINE_STAGES.indexOf(step.act) >= 0 ? L.backBar.workY : L.baristaHome.y };
  }

  function startStep(world, b) {
    const s = b.steps[b.stepIdx];
    b.stateT = 0;
    switch (s.act) {
      case 'grind': SND.grinder(s.dur); break;
      case 'tamp': SND.tamp(); break;
      case 'pull': SND.espresso(s.dur); break;
      case 'steam': SND.steamWand(s.dur); break;
      case 'kettle': SND.kettlePour(s.dur); break;
      case 'scoop': SND.clink(0.4, 0.02); break;
      case 'whisk':
        SND.whisk(s.dur);
        if (R.random() < 0.3) caption(world, 'the bamboo whisk patters — a pale green foam comes up.');
        break;
      case 'ice':
        SND.iceRattle();
        if (R.random() < 0.25) caption(world, 'ice sings against the glass.');
        break;
      case 'fetch': break;
    }
  }

  // Queue membership starts at the door; service starts at the front slot.
  R.customerAtCounter = function (world) {
    const p = world.queue[0];
    if (!p) return false;
    if (p.state === 'ordering') return true;
    const slot = R.queueSlot(0);
    return p.state === 'queueing' && (!p.path || !p.path.length) &&
      Math.hypot(p.x - slot.x, p.y - slot.y) <= 2;
  };
  R.needsTableClear = function (world) {
    return world.tables.some(t => t.items.some(i => i.owner === null)) ||
      world.waterfront.tables.some(t => t.dirty && t.owner === null && !t.cleaning);
  };

  function updateBarista(world, b, dt) {
    b.animT += dt;
    b.stateT += dt;
    b.chalkT -= dt;
    if (!world.patrons.length && !world.queue.length && !b.orders.length) b.emptyT += dt;
    else b.emptyT = 0;
    if (world.hour >= 9 && world.hour < 16 && world.wateredDay !== dayIndex(world)) {
      b.wateringPending = true;
    }
    world.brew.active = false;

    if (R.updateProject(world, dt)) return;
    if (R.updateTerraceBarista(world, b, dt)) return;

    switch (b.state) {
      case 'idle': {
        // Queued service keeps the same clearing priority during closing.
        // Otherwise guests wait for dirty tables while the closing ritual
        // waits for those guests, leaving nobody able to clear the tables.
        if ((world.shop.phase === 'open' || (world.shop.phase === 'closing' &&
            (world.queue.length || b.orders.length))) && startTableClear(world, b)) break;
        // start an order?
        if (b.orders.length) {
          const order = b.orders[0];
          b.steps = PREP_STEPS[order.drink.prep].slice();
          if(!SCENE.hasFurniture(world,'full-counter')) b.steps=b.steps.map(function(s) {
            const x=s.act==='fetch'?L.basic.pastry.x:s.act==='kettle'?L.basic.kettle.x:
              s.act==='grind'||s.act==='tamp'?L.basic.grinder.x+8:s.act==='steam'?L.basic.machine.x+30:L.basic.machine.x+14;
            return Object.assign({},s,{x:x});
          });
          b.stepIdx = -1;
          b.state = 'prepWalk';
          b.path = [prepTarget(b.steps[0])];
          break;
        }
        // Wait only once the front customer has reached the counter.
        if (R.customerAtCounter(world)) break;
        if (R.startProject(world)) break;
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
            b.holding = holdingFor(b.orders[0].drink.kind);
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
        // where she stands tells us which way she faces: the espresso machine
        // is on the back wall, above her standing line, so those steps show her
        // back (apron ties and all); the matcha bar and pastry case sit on the
        // front counter, so she faces the room to work them
        b.heading = MACHINE_STAGES.indexOf(s.act) >= 0 ? 'up' : 'down';
        world.brew.active = true;
        world.brew.stage = s.act;
        world.brew.progress = Math.min(1, b.stateT / s.dur);
        if (s.act === 'pull' || s.act === 'steam' || s.act === 'kettle') {
          world.steamAcc += dt;
          while (world.steamAcc >= 0.12) {
            world.steamAcc -= 0.12;
            spawnSteam(world, L.machine.x + 16 + R.random() * 28, L.machine.y + 16);
          }
        } else if (s.act === 'whisk') {
          world.steamAcc += dt;
          while (world.steamAcc >= 0.25) {
            world.steamAcc -= 0.25;
            spawnSteam(world, L.matchaBar.x, L.matchaBar.y - 9);
          }
        }
        if (b.stateT >= s.dur) {
          if (s.act === 'fetch') SND.clink(0.5, 0.04);
          b.stepIdx++;
          if (b.stepIdx >= b.steps.length) {
            b.state = 'serveWalk';
            b.holding = holdingFor(b.orders[0].drink.kind);
            b.path = [{ x: L.serveSpot.x - 8, y: L.baristaHome.y }];
          } else {
            b.state = 'prepWalk';
            b.path = [prepTarget(b.steps[b.stepIdx])];
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
          if (R.random() < 0.6) caption(world, 'Lunafreya sets ' + withArticle(order.drink.name) + ' on the counter.');
          b.state = 'idle';
          b.idleT = rnd(4, 9);
        }
        break;
      }
      case 'wipe': {
        if (b.path && b.path.length) { walker(b, dt); b.stateT = 0; break; }
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
        if (b.path && b.path.length) { walker(b, dt); b.stateT = 0; break; }
        if (b.stateT > 1.5) {
          SND.clink(0.5, 0.035);
          b.state = 'idle';
        }
        break;
      }
      case 'stretch': {
        b.pose = 'stretch';
        b.holding = null;
        if (b.stateT >= 2.2) {
          b.pose = 'stand';
          b.state = 'idle';
          b.emptyT = 0;
          b.idleT = rnd(8, 16);
        }
        break;
      }
      case 'pianoOut': {
        if (walker(b, dt)) {
          if (world.patrons.length || world.queue.length || b.orders.length) {
            b.state = 'pianoHome'; b.stateT = 0; b.pose = 'stand';
            b.path = pianoHomeRoute();
          } else {
            b.state = 'pianoPlaying'; b.stateT = 0; b.pose = 'sit';
            b.facing = -1; b.playing = true; SND.pianoStart('nora');
          }
        }
        break;
      }
      case 'pianoPlaying': {
        b.pose = 'sit'; b.facing = -1; b.playing = true;
        if (world.patrons.length || world.queue.length || b.orders.length || b.stateT >= b.pianoDur || world.shop.phase === 'closing') {
          b.playing = false; SND.pianoStop();
          b.pose = 'stand'; b.state = 'pianoHome'; b.stateT = 0;
          b.path = pianoHomeRoute();
        }
        break;
      }
      case 'pianoHome': {
        b.playing = false; b.pose = 'stand';
        if (walker(b, dt)) {
          b.state = 'idle'; b.idleT = rnd(5, 10); b.emptyT = 0;
        }
        break;
      }
      case 'chalkWalk': {
        if (walker(b, dt)) {
          b.state = 'chalk'; b.stateT = 0; b.chalkPlayed = 0;
          b.pose = 'reach'; b.facing = 1;
        }
        break;
      }
      case 'chalk': {
        b.pose = 'reach';
        const ticks = [0.35, 1.2, 2.15];
        if (b.chalkPlayed < ticks.length && b.stateT >= ticks[b.chalkPlayed]) {
          b.chalkPlayed++;
          if (b.chalkPlayed < 3 || R.random() < 0.65) SND.chalkTick();
        }
        if (b.stateT >= 3) {
          const doodle = nextMenuDoodle(world);
          SCENE.setMenuDoodle(doodle);
          b.chalkT = rnd(600, 1200);
          b.pose = 'stand'; b.state = 'chalkHome';
          b.path = [{ x: b.x, y: L.baristaHome.y }, { x: L.baristaHome.x, y: L.baristaHome.y }];
          if (R.random() < 0.3) caption(world, chalkCaption(doodle));
        }
        break;
      }
      case 'chalkHome': {
        if (walker(b, dt)) { b.state = 'idle'; b.idleT = rnd(7, 14); }
        break;
      }
      case 'waterOut': {
        b.holding = 'can';
        if (walker(b, dt)) {
          b.state = 'water'; b.stateT = 0; b.waterPlayed = false; b.waterDrops = 0;
          b.facing = WATER_STOPS[b.waterStop].facing;
        }
        break;
      }
      case 'water': {
        b.holding = 'can'; b.pouring = true;
        if (!b.waterPlayed && b.stateT >= 0.2) {
          b.waterPlayed = true; SND.waterPour(1.2);
        }
        if (b.waterDrops < 4 && b.stateT >= 0.35 + b.waterDrops * 0.28) {
          b.waterDrops++;
          world.particles.push({ type: 'drop', x: b.x + b.facing * 21, y: b.y - 38,
            vx: b.facing * rnd(3, 7), vy: rnd(14, 22), age: 0, life: rnd(0.45, 0.7), seed: 0 });
        }
        if (b.stateT >= 1.6) {
          b.pouring = false;
          const stops = waterStops(world), nextStop = stops[stops.indexOf(b.waterStop) + 1];
          if (nextStop !== undefined) {
            if (b.orders.length || R.customerAtCounter(world)) {
              b.waterNext = nextStop;
              b.state = 'waterHome'; b.stateT = 0;
              b.path = waterHomeRoute(b.waterStop);
            } else {
              b.waterStop = nextStop;
              b.state = 'waterOut'; b.stateT = 0;
              b.path = waterFromHome(b.waterStop);
            }
          } else {
            world.wateredDay = dayIndex(world);
            b.wateringPending = false;
            b.waterNext = 0;
            b.state = 'waterHome'; b.stateT = 0;
            b.path = waterHomeRoute(b.waterStop);
          }
        }
        break;
      }
      case 'waterHome': {
        b.holding = 'can'; b.pouring = false;
        if (walker(b, dt)) {
          b.holding = null; b.state = 'idle'; b.idleT = rnd(7, 14);
        }
        break;
      }
      case 'candleOut': {
        b.holding = 'taper';
        if (walker(b, dt)) {
          b.state = 'candleLight'; b.stateT = 0; b.candlePlayed = false;
          b.pose = 'reach';
        }
        break;
      }
      case 'candleLight': {
        b.holding = 'taper'; b.pose = 'reach';
        if (!b.matchStruck && b.stateT >= 0.15) {
          b.matchStruck = true; b.taperLit = true; SND.matchStrike();
        }
        if (!b.candlePlayed && b.stateT >= 0.65) {
          b.candlePlayed = true;
          lightCandleStop(world, b.candleStop);
          SND.candlePop();
        }
        if (b.stateT >= 1.1) {
          const next = nextCandleStop(world);
          const busy = b.orders.length || R.customerAtCounter(world);
          if (busy || !next) {
            if (!next) {
              b.candlePending = false;
              world.candles.forceRound = false;
            }
            b.state = 'candleHome'; b.stateT = 0; b.pose = 'stand';
            b.candleParking = !!(busy && next);
            b.path = candleHomeRoute(world, b.candleStop);
          } else {
            const from = b.candleStop;
            b.candleStop = next;
            b.state = 'candleOut'; b.stateT = 0; b.pose = 'stand';
            b.path = candleLeg(world, from, next);
          }
        }
        break;
      }
      case 'candleHome': {
        b.holding = 'taper'; b.pose = 'stand';
        if (walker(b, dt)) {
          b.holding = null; b.taperLit = false; b.state = 'idle'; b.idleT = b.candleParking ? 0 : rnd(7, 14);
          if (!b.candleParking) { b.matchStruck = false; b.candleCaptioned = false; }
          b.candleParking = false;
        }
        break;
      }
      case 'fireOut': {
        if (walker(b, dt)) {
          b.state = 'fireTend'; b.stateT = 0; b.firePlaced = false;
          b.holding = 'log'; b.pose = 'stand'; b.facing = 1;
        }
        break;
      }
      case 'fireTend': {
        b.facing = 1;
        if (b.stateT < 0.5) { b.holding = 'log'; b.pose = 'stand'; }
        else {
          if (!b.firePlaced) {
            b.firePlaced = true; b.holding = null; b.pose = 'reach';
            addLog(world);
            if (R.random() < 0.6) caption(world, pick([
              'Lunafreya lays a fresh log on the fire; it catches and climbs.',
              'Lunafreya feeds the fire a new log — the flames wake up.'
            ]));
          }
          if (b.stateT >= 1.2) {
            b.pose = 'stand'; b.state = 'fireHome'; b.stateT = 0;
            b.path = fireHomeRoute();
          }
        }
        break;
      }
      case 'fireHome': {
        if (walker(b, dt)) { b.holding = null; b.state = 'idle'; b.idleT = rnd(7, 14); }
        break;
      }
      case 'busOut': {
        if (walker(b, dt)) {
          b.state = 'busCollect'; b.stateT = 0;
        }
        break;
      }
      case 'busCollect': {
        // one visit clears the whole table: each abandoned piece gets its
        // own clink a beat apart, then the stack travels home together
        const t = b.busTarget;
        if (b.stateT > (t.nextPickT || 1.3)) {
          const tb = world.tables[t.table];
          const it = tb.items.find(function (i) { return i.owner === null; });
          if (it) {
            tb.items.splice(tb.items.indexOf(it), 1);
            t.item = it; t.count = (t.count || 0) + 1;
            b.holding = t.count > 1 ? 'stack' : holdingFor(it.kind);
            SND.clink(0.6, 0.04);
            t.nextPickT = b.stateT + 0.55;
          } else {
            SND.swish();
            if (t.count > 1 && R.random() < 0.3) caption(world, 'Lunafreya gathers the empties in one practiced armful.');
            b.state = 'busHome';
            // back behind the counter: the outbound route reversed, then home
            b.path = busRoute(world, t.table).slice(0, -1).reverse();
            b.path.push({ x: L.baristaHome.x, y: L.baristaHome.y });
          }
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
          if (R.random() < 0.5) caption(world, 'Lunafreya tops up the cat\'s bowl.');
          if (world.cat.waitingBowl && R.random() < 0.25) caption(world, 'The cat supervises the refill closely.');
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
          caption(world, 'Lunafreya shoos the cat off the counter — house rules.');
          leavePerch(world, world.cat);
        }
        if (b.stateT > 1.5) { b.shooed = false; b.state = 'idle'; b.idleT = rnd(5, 10); }
        break;
      }
    }

    // at the till she faces the room — and, across the counter, whoever
    // steps up to order (they turn heading-up, she stays heading-down)
    if (b.state === 'idle' && (!b.path || !b.path.length)) {
      b.facing = -1;
      b.heading = 'down';
    }
  }

  /* Lunafreya's route from behind the counter to a table's bus spot, every leg
     axis-aligned. Big tables: drop from the lane at the bus spot itself.
     Side tables: drop through the table's declared clear column (L busVia —
     between the wing chairs and reading lamps), then step across in front.
     Shared with __dev.audit(), which walks these segments against the
     occluder and footprint boxes. */
  function busRoute(world, ti) {
    const tb = world.tables[ti];
    const busX = tb.piano ? L.piano.bench.x : tb.x + (tb.small ? -28 : 24);
    // tall window tables live on the wall; Lunafreya stands at their floor line
    const busY = tb.piano ? L.piano.bench.y : (tb.tall || tb.artist) ? tb.base + 2 : tb.y + (tb.fireside ? 34 : 20);
    const dropX = (tb.piano || tb.small || tb.artist) ? tb.busVia : busX;
    const route = [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: dropX, y: L.lane }, { x: dropX, y: busY }
    ];
    if (dropX !== busX) route.push({ x: busX, y: busY });
    return route;
  }

  function pianoRoute() {
    return [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: L.piano.via, y: L.lane }, { x: L.piano.via, y: L.piano.bench.y },
      { x: L.piano.bench.x, y: L.piano.bench.y }
    ];
  }

  function pianoHomeRoute() {
    return [
      { x: L.piano.via, y: L.piano.bench.y }, { x: L.piano.via, y: L.lane },
      { x: L.baristaExitX, y: L.lane }, { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaHome.x, y: L.baristaHome.y }
    ];
  }

  function refillRoute() {
    return [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: L.catCorner.noraSpot.x, y: L.lane },
      { x: L.catCorner.noraSpot.x, y: L.catCorner.noraSpot.y }
    ];
  }

  /* Lunafreya's out-and-back to the hearth to lay a log: slip out at baristaExitX,
     along the lane, up the fire's clear column (the same one the mantel candle
     uses). Both legs axis-aligned; fireRoute() stitches them into the full
     circuit __dev.audit() walks. */
  function fireTendRoute() {
    return [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: L.fire.stand.x, y: L.lane }, { x: L.fire.stand.x, y: L.fire.stand.y }
    ];
  }

  function fireHomeRoute() {
    return [
      { x: L.fire.stand.x, y: L.lane },
      { x: L.baristaExitX, y: L.lane }, { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaHome.x, y: L.baristaHome.y }
    ];
  }

  function fireRoute() {
    return [{ x: L.baristaHome.x, y: L.baristaHome.y }]
      .concat(fireTendRoute()).concat(fireHomeRoute());
  }

  const WATER_STOPS = L.noraCare.water.concat([Object.assign({facing:1},L.firstPlant.work)]);
  function waterStops(world) {
    return (SCENE.hasFurniture(world,'full-counter')?[0]:[]).concat(SCENE.hasFurniture(world,'plants') ? [1,2] : [])
      .concat(SCENE.hasFurniture(world,'first-plant') ? [3] : []);
  }

  function waterRoute(stop) {
    const all = [
      { x: L.baristaHome.x, y: L.baristaHome.y },
      { x: WATER_STOPS[0].x, y: WATER_STOPS[0].y },
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: WATER_STOPS[1].x, y: WATER_STOPS[1].y },
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaExitX, y: L.lane },
      { x: L.noraCare.plantVia.x, y: L.lane },
      { x: L.noraCare.plantVia.x, y: L.noraCare.plantVia.y },
      { x: WATER_STOPS[2].x, y: WATER_STOPS[2].y }
    ];
    return all.slice(0, [2, 4, 9][Math.max(0, Math.min(2, stop | 0))]);
  }

  function waterFromHome(stop) {
    if (stop === 3) return [L.firstPlant.work];
    if (stop === 0) return [{ x: WATER_STOPS[0].x, y: WATER_STOPS[0].y }];
    if (stop === 1) return [
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: WATER_STOPS[1].x, y: WATER_STOPS[1].y }
    ];
    return [
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaExitX, y: L.lane },
      { x: L.noraCare.plantVia.x, y: L.lane },
      { x: L.noraCare.plantVia.x, y: L.noraCare.plantVia.y },
      { x: WATER_STOPS[2].x, y: WATER_STOPS[2].y }
    ];
  }

  function waterHomeRoute(stop) {
    if (stop === 3) return [L.baristaHome];
    if (stop === 0) return [{ x: L.baristaHome.x, y: L.baristaHome.y }];
    if (stop === 1) return [
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaHome.x, y: L.baristaHome.y }
    ];
    return [
      { x: L.noraCare.plantVia.x, y: L.noraCare.plantVia.y },
      { x: L.noraCare.plantVia.x, y: L.lane },
      { x: L.baristaExitX, y: L.lane },
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaHome.x, y: L.baristaHome.y }
    ];
  }

  function candleTableIndices(world) {
    return world.tables.map(function (tb, i) { return { tb: tb, i: i }; })
      .filter(function (v) { return !v.tb.tall && !v.tb.piano && !v.tb.artist; })
      .sort(function (a, b) { return a.tb.x - b.tb.x; })
      .map(function (v) { return v.i; });
  }

  function nextCandleStop(world) {
    const indices = candleTableIndices(world);
    for (let i = 0; i < indices.length; i++) {
      if (world.tables[indices[i]].candleTarget < 1) return { table: indices[i] };
    }
    return SCENE.hasFurniture(world,'mantel-decor') && world.candles.mantelTarget < 1 ? { mantel: true } : null;
  }

  function candleApproach(world, stop, fromHome) {
    if (stop.mantel) {
      const route = [
        { x: L.noraCare.mantel.x, y: L.lane },
        { x: L.noraCare.mantel.x, y: L.noraCare.mantel.y }
      ];
      return fromHome ? [
        { x: L.baristaExitX, y: L.baristaHome.y },
        { x: L.baristaExitX, y: L.lane }
      ].concat(route) : route;
    }
    const route = busRoute(world, stop.table);
    return fromHome ? route : route.slice(2);
  }

  function candleBackToLane(world, stop) {
    if (stop.mantel) return [{ x: L.noraCare.mantel.x, y: L.lane }];
    return busRoute(world, stop.table).slice(2).reverse().slice(1);
  }

  function candleLeg(world, from, to) {
    if (!from) return candleApproach(world, to, true);
    return candleBackToLane(world, from).concat(candleApproach(world, to, false));
  }

  function candleHomeRoute(world, from) {
    return candleBackToLane(world, from).concat([
      { x: L.baristaExitX, y: L.lane },
      { x: L.baristaExitX, y: L.baristaHome.y },
      { x: L.baristaHome.x, y: L.baristaHome.y }
    ]);
  }

  function candleRoute(world) {
    const stops = candleTableIndices(world).map(function (i) { return { table: i }; });
    if(SCENE.hasFurniture(world,'mantel-decor')) stops.push({ mantel: true });
    if(!stops.length)return [L.baristaHome];
    const route = [{ x: L.baristaHome.x, y: L.baristaHome.y }];
    let from = null;
    stops.forEach(function (stop) {
      Array.prototype.push.apply(route, candleLeg(world, from, stop));
      from = stop;
    });
    Array.prototype.push.apply(route, candleHomeRoute(world, from));
    return route;
  }

  function lightCandleStop(world, stop) {
    if (stop.mantel) world.candles.mantelTarget = 1;
    else world.tables[stop.table].candleTarget = 1;
  }

  function nextMenuDoodle(world) {
    const current = SCENE.getMenuDoodle();
    const choices = world.rain > 0.3 ? [0, 1, 2, 3, 4, 4, 4, 5] : [0, 1, 2, 3, 4, 5];
    let next = current;
    while (next === current) next = pick(choices);
    return next;
  }

  function chalkCaption(doodle) {
    if (doodle === 1) return 'Lunafreya chalks a little cat beside the prices.';
    if (doodle === 2) return 'Today the board gets a steaming cup.';
    if (doodle === 3) return 'A small chalk sprig curls beside the prices.';
    if (doodle === 4) return 'Rain on the glass; an umbrella on the board.';
    if (doodle === 5) return 'A little bamboo whisk appears beside the prices.';
    return 'Lunafreya touches up the chalk heart.';
  }

  function startStretch(world, b) {
    b.state = 'stretch'; b.stateT = 0; b.pose = 'stretch';
    if (R.random() < 0.3) caption(world, pick([
      'The café is empty; Lunafreya stretches, unhurried.',
      'Lunafreya stretches — the cat pretends it wasn\'t watching.'
    ]));
  }

  function startChalk(b) {
    b.state = 'chalkWalk'; b.stateT = 0;
    b.path = [{ x: L.noraCare.chalk.x, y: L.baristaHome.y },
      { x: L.noraCare.chalk.x, y: L.noraCare.chalk.y }];
  }

  function startWater(world, b) {
    const stops=waterStops(world);
    if(!stops.length) { b.wateringPending=false;world.wateredDay=dayIndex(world);return; }
    b.state = 'waterOut'; b.stateT = 0; b.waterStop = b.waterNext || stops[0]; b.holding = 'can';
    b.path = waterFromHome(b.waterStop);
    if (!b.waterNext && R.random() < 0.4) caption(world, pick([
      'Lunafreya makes the rounds with the watering can.',
      'The plants get their morning drink.'
    ]));
  }

  function startCandleRound(world, b) {
    const stop = nextCandleStop(world);
    if (!stop) { b.candlePending = false; world.candles.forceRound = false; return; }
    b.candleStop = stop; b.state = 'candleOut'; b.stateT = 0;
    b.holding = 'taper'; b.taperLit = !!b.matchStruck;
    b.path = candleLeg(world, null, stop);
    if (!b.candleCaptioned) {
      b.candleCaptioned = true;
      if (R.random() < 0.6) caption(world, pick([
        'Lunafreya goes round with a lit taper; the tables glow one by one.',
        'Dusk. Lunafreya lights the candles.'
      ]));
    }
  }

  function startFireTend(world, b) {
    if (SCENE.hearthWork(world)) return;
    world.fire.claimed = true;
    b.state = 'fireOut'; b.stateT = 0; b.holding = null; b.pose = 'stand';
    b.path = fireTendRoute();
    if (R.random() < 0.4) caption(world, 'Lunafreya crosses to feed the fire.');
  }

  function startPiano(world, b) {
    if (!SCENE.hasFurniture(world,'piano')) return;
    b.state = 'pianoOut'; b.stateT = 0; b.pose = 'stand'; b.playing = false;
    b.pianoDur = rnd(60, 120); b.path = pianoRoute();
    world.noraPianoNextT = world.t + rnd(600, 1200);
    if (R.random() < 0.7) caption(world, 'The café is empty; Lunafreya plays a little.');
  }

  function startTableClear(world, b) {
    // any abandoned cups to collect?
    for (let ti = 0; ti < world.tables.length; ti++) {
      const it = world.tables[ti].items.find(function (i) { return i.owner === null; });
      if (it) {
        b.busTarget = { table: ti, item: it };
        b.state = 'busOut'; b.stateT = 0;
        b.path = busRoute(world, ti);
        if (R.random() < 0.5) caption(world, 'Lunafreya slips out to clear a table.');
        return true;
      }
    }
    return R.startTerraceClear(world, b);
  }

  function startIdleTask(world, b) {
    if (world.shop && world.shop.phase !== 'open') return;
    if (b.forcedTask) {
      const forced = b.forcedTask; b.forcedTask = '';
      if (forced === 'stretch') startStretch(world, b);
      else if (forced === 'chalk' && SCENE.hasFurniture(world,'wall-menu')) startChalk(b);
      else if (forced === 'water') startWater(world, b);
      else if (forced === 'candles') startCandleRound(world, b);
      else if (forced === 'fire') startFireTend(world, b);
      else if (forced === 'piano') startPiano(world, b);
      return;
    }
    if (startTableClear(world, b)) return;
    // Bowl care comes immediately after clearing tables: never urgent, but
    // Lunafreya notices before she invents another counter-polishing task.
    const refillKinds = [];
    if (world.catBowls.food < 0.34) refillKinds.push('food');
    if (world.catBowls.water < 0.2) refillKinds.push('water');
    if (refillKinds.length) {
      b.refillKinds = refillKinds;
      b.state = 'refillOut'; b.stateT = 0;
      b.path = refillRoute();
      return;
    }
    if (b.candlePending) { startCandleRound(world, b); return; }
    if (b.wateringPending) { startWater(world, b); return; }
    // Feed the fire when it has burned low and no one else is already on it
    // (a fireside regular gets first refusal — see sim-patrons). Never urgent.
    if (world.fire.wantsLog && !world.fire.claimed) { startFireTend(world, b); return; }
    if (!world.patrons.length && world.daylight < 0.35 && b.emptyT > 30 &&
        world.t >= world.noraPianoNextT && R.random() < 0.25) {
      startPiano(world, b); return;
    }
    if (b.emptyT > 20 && R.random() < 0.3) { startStretch(world, b); return; }
    if (SCENE.hasFurniture(world,'wall-menu') && b.chalkT <= 0 && R.random() < 0.35) { startChalk(b); return; }
    const r = R.random();
    if (r < 0.35) {
      b.state = 'wipe'; b.stateT = 0; b.swishes = 0;
      b.path = [{ x: rnd(660, 780), y: L.baristaHome.y }];
      if (R.random() < 0.2) caption(world, 'Lunafreya wipes down the counter.');
    } else if (r < 0.57) {
      b.state = 'polish'; b.stateT = 0; b.heading = '';   // profile keeps the cup readable
      if (R.random() < 0.25) caption(world, 'Lunafreya polishes a cup until it gleams.');
    } else if (r < 0.75) {
      b.state = 'restock'; b.stateT = 0;
      b.path = [SCENE.hasFurniture(world,'full-counter')?L.shop.pastry:L.basic.pastry];
      if (R.random() < 0.25) caption(world, 'Lunafreya tidies the pastry case.');
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
  const PIANO_SPOT = { id: 'piano', name: 'the piano lid', kind: 'perch',
    surface: CP.piano.surface, stand: CP.piano.stand, anchor: CP.piano.anchor };

  // Only pairs that fail the cat-journey audit take the little shared clear
  // corridor. Every other pair keeps the house-precedent straight cat line.
  const CAT_VIA_PAIRS = { 'eat>bookshelfStand': true, 'bookshelfStand>eat': true };
  [
    'fire>bigRug', 'fire>armchair', 'fire>nookRug', 'fire>cushion', 'fire>window1Stand',
    'fire>window2Stand', 'fire>counterStand', 'fire>topShelfStand', 'fire>eat',
    'windowFloor>bigRug', 'windowFloor>nookRug', 'windowFloor>window2Stand', 'windowFloor>bookshelfStand',
    'bigRug>fire', 'bigRug>windowFloor', 'bigRug>window1Stand', 'bigRug>window2Stand', 'bigRug>bookshelfStand',
    'bigRug>counterStand', 'bigRug>topShelfStand', 'armchair>fire', 'armchair>nookRug',
    'armchair>window2Stand', 'nookRug>fire', 'nookRug>windowFloor', 'nookRug>armchair',
    'nookRug>cushion', 'nookRug>window1Stand', 'nookRug>window2Stand', 'nookRug>counterStand',
    'nookRug>eat', 'cushion>fire', 'cushion>nookRug', 'cushion>window2Stand',
    'cushion>counterStand', 'cushion>topShelfStand', 'window1Stand>fire', 'window1Stand>bigRug', 'window1Stand>nookRug',
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
  ['fire', 'windowFloor', 'bigRug', 'armchair', 'nookRug', 'cushion',
    'window1Stand', 'window2Stand', 'bookshelfStand', 'bookshelfEscape',
    'counterStand', 'topShelfStand', 'eat'].forEach(function (id) {
    CAT_VIA_PAIRS[id + '>pianoStand'] = true;
    CAT_VIA_PAIRS['pianoStand>' + id] = true;
    CAT_VIA_PAIRS[id + '>pianoDismount'] = true;
    CAT_VIA_PAIRS['pianoDismount>' + id] = true;
  });
  CAT_VIA_PAIRS['pianoStand>pianoDismount'] = true;
  CAT_VIA_PAIRS['pianoDismount>pianoStand'] = true;

  const CAT_APPROACH = L.catRoutes;

  function routeId(id) {
    if (/^lapStand/.test(id)) return 'lapStand';
    return id === 'window1' ? 'window1Stand' : id === 'window2' ? 'window2Stand'
      : id === 'bookshelf' ? 'bookshelfStand' : id === 'counter' ? 'counterStand'
      : id === 'topShelf' ? 'topShelfStand' : id === 'piano' ? 'pianoStand' : id;
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

  function pianoFree(world) {
    const bench = world.seats.find(function (s) { return s.piano; });
    return (!bench || !bench.taken) && !SND.pianoActive();
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
    if (spot.id === 'piano') {
      return pianoFree(world) ? 0.9 * ((world.hour >= 18 || world.hour < 6) ? 1.5 : 1) : 0;
    }
    return 1;
  }

  function pickCatSpot(world, cat) {
    const all = CAT_SPOTS.concat(WINDOW_SPOTS).concat([BOOK_SPOT, PIANO_SPOT]).filter(function (s) {
      if (!SCENE.catSpotAvailable(world,s.id)) return false;
      if (cat.target && routeId(s.id) === routeId(cat.target.id)) return false;
      return spotWeight(world, cat, s) > 0;
    });
    let total = 0;
    all.forEach(function (s) { total += spotWeight(world, cat, s); });
    let r = R.random() * total;
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
    if (kneadable && R.random() < 0.3) {
      cat.state = 'knead'; cat.stateT = rnd(2.5, 4); cat.kneadPlayed = false;
      return;
    }
    const r = R.random();
    cat.state = r < 0.5 ? 'sleep' : r < 0.8 ? 'loaf' : 'sit';
    cat.stateT = cat.state === 'sleep' ? restTime(world, 40, 100) : restTime(world, 10, 25);
    if (cat.state === 'sleep' && cat.target && cat.target.id === 'fire' && R.random() < 0.5) {
      caption(world, 'The cat curls up in the warmth of the fire.');
    }
  }

  function beginHop(cat, step) {
    const dist = Math.hypot(step.x - cat.x, step.y - cat.y);
    cat.hopFrom = { x: cat.x, y: cat.y };
    cat.hopTo = step;
    cat.hopT = 0;
    cat.hopDur = 0.22 + Math.max(0.35, Math.min(0.55, 0.35 + dist / 500));
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
      cat.state = R.random() < 0.3 ? 'sleep' : 'perch';
      cat.stateT = rnd(60, 180); cat.facing = -1;
      if (R.random() < 0.4) {
        caption(world, world.rain > 0.3 ? 'The cat watches the rain wander down the glass.'
          : world.daylight < 0.3 ? 'The cat and the streetlamp keep watch together.'
          : 'The cat watches the street drift by.');
      }
    } else if (after.intent === 'bookshelf') {
      cat.state = R.random() < 0.45 ? 'sleep' : 'sit'; cat.stateT = rnd(60, 180); cat.facing = -1;
      if (R.random() < 0.5) caption(world, 'The cat surveys the café from the bookshelf. All is well.');
    } else if (after.intent === 'counter') {
      cat.intent = 'counterPad';
      cat.state = 'walk';
      cat.path = [{ x: Math.round(rnd(CP.counter.padX0, CP.counter.padX1)), y: CP.counter.anchor.y }];
      cat.facing = -1;
    } else if (after.intent === 'topShelf') {
      cat.state = R.random() < 0.5 ? 'loaf' : 'sit'; cat.stateT = rnd(60, 180); cat.facing = -1;
      if (R.random() < 0.45) caption(world, 'Lunafreya pretends not to see the cat on the shelf.');
    } else if (after.intent === 'piano') {
      const r = R.random();
      cat.state = r < 0.55 ? 'loaf' : r < 0.8 ? 'sit' : 'sleep';
      cat.stateT = rnd(60, 180); cat.facing = 1;
    } else if (after.intent === 'lap') {
      // A reader may get up during the short hop. Land, then step down;
      // never bind a lap to a patron who has already released their seat.
      if (!after.patron.seat || after.patron.state !== 'seated') { leavePerch(world,cat); return; }
      cat.state = 'lap'; cat.stateT = 9999; cat.facing = after.patron.facing;
      cat.lapPatron = after.patron; after.patron.lapCat = true;
    } else {
      cat.surface = 'floor'; cat.state = 'sit'; cat.stateT = 1;
      cat.target = after.floorTarget || { id: 'landing', x: cat.x, y: cat.y, kind: 'floor' };
    }
  }

  function updateHop(world, cat, dt) {
    cat.hopT += dt;
    const q = Math.max(0, Math.min(1, (cat.hopT - 0.1) / (cat.hopDur - 0.22)));
    const dx = cat.hopTo.x - cat.hopFrom.x, dy = cat.hopTo.y - cat.hopFrom.y;
    const arc = Math.hypot(dx, dy) * 0.4 * 4 * q * (1 - q);
    cat.x = cat.hopFrom.x + dx * q;
    cat.y = cat.hopFrom.y + dy * q - arc;
    if (Math.abs(dx) > 1) cat.facing = dx > 0 ? 1 : -1;
    if (cat.hopT < cat.hopDur) return;
    const step = cat.hopTo;
    cat.x = step.x; cat.y = step.y;
    if (step.surface) cat.surface = step.surface;
    if (step.land) SND.softThump();
    if (cat.hopPurpose === 'piano' && step.surface === 'pianoKeys') {
      SND.pianoPlinks();
      if (R.random() < 0.5) caption(world, 'The cat pads up the keys and claims the piano lid.');
    }
    if (cat.hopPurpose === 'topShelf' && cat.ascentMayAbort && step.surface === 'counter' && world.barista.state === 'idle') {
      cat.hopQueue = null; cat.hopAfter = null; cat.hopPurpose = ''; cat.state = 'sit';
      cat.ascentMayAbort = false;
      SND.swish();
      caption(world, 'Lunafreya catches the cat halfway up. Not today.');
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
      if (R.random() < 0.7) caption(world, 'The cat sits by the empty bowl, radiating patience.');
      if (R.random() < 0.35) SND.meow();
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
      cat.ascentMayAbort = R.random() < 0.3;
      beginHopQueue(cat, [
        { x: CP.topShelf.counter.x, y: CP.topShelf.counter.y, surface: 'counter' },
        { x: CP.topShelf.machine.x, y: CP.topShelf.machine.y, surface: 'machine' },
        { x: CP.topShelf.anchor.x, y: CP.topShelf.anchor.y, surface: 'backShelf' }
      ], { intent: 'topShelf' });
      return;
    }
    if (cat.intent === 'piano') {
      beginHopQueue(cat, [
        { x: L.piano.keysStep.x, y: L.piano.keysStep.y, surface: 'pianoKeys' },
        { x: CP.piano.anchor.x, y: CP.piano.anchor.y, surface: 'pianoTop' }
      ], { intent: 'piano' });
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
    } else if (cat.surface === 'pianoTop' || cat.surface === 'pianoKeys') {
      steps = [{ x: L.piano.dismount.x, y: L.piano.dismount.y, surface: 'floor', land: true }];
      floorTarget = { id: 'pianoDismount', x: L.piano.dismount.x, y: L.piano.dismount.y,
        kind: 'floor', approach: L.catRoutes.pianoDismount };
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
      vx: cat.facing * 2, vy: -1.5, age: 0, life: cat.pounceDur, seed: R.random() * 5 });
    caption(world, R.random() < 0.5 ? 'The cat does battle with a dust mote.' : 'The dust mote wins this round.');
  }

  function startNextJourney(world, cat) {
    if (SCENE.catSpotAvailable(world,'topShelf') && quietCafe(world) && cat.ascentT <= 0) {
      cat.ascentT = rnd(900, 1600);
      startTravel(cat, { id: 'topShelf', stand: CP.topShelf.stand, kind: 'perch' }, 'topShelf');
      return;
    }
    if (SCENE.catSpotAvailable(world,'counter') && quietCafe(world) && cat.counterT <= 0) {
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
    if (lap && R.random() < 0.15) { startLap(cat, lap); return; }
    const spot = pickCatSpot(world, cat);
    startTravel(cat, spot, spot.kind === 'perch' ? spot.id : 'floor');
    if (R.random() < 0.6) caption(world, 'The cat pads over to ' +
      (spot.id==='fire'&&!SCENE.hasFurniture(world,'rugs')?'the quiet spot by the hearth':spot.name) + '.');
    if (R.random() < 0.15) SND.meow();
  }

  function forceCat(world, cat, action) {
    if (!SCENE.catSpotAvailable(world,action)) return;
    if (action === 'eat') { cat.hungerT = 0; startNeed(cat, 'eat'); }
    else if (action === 'window') startTravel(cat, WINDOW_SPOTS[0], 'window1');
    else if (action === 'bookshelf') startTravel(cat, BOOK_SPOT, 'bookshelf');
    else if (action === 'counter') startTravel(cat, { id: 'counter', stand: CP.counter.stand, kind: 'perch' }, 'counter');
    else if (action === 'topShelf') startTravel(cat, { id: 'topShelf', stand: CP.topShelf.stand, kind: 'perch' }, 'topShelf');
    else if (action === 'piano') startTravel(cat, PIANO_SPOT, 'piano');
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
          if (R.random() < 0.8) { startNeed(cat, 'drink'); return; }
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
      if (R.random() < dt * 0.06) cat.bubble = { icon: 'zzz', until: world.t + 2.6 };
    }
    if (cat.state === 'knead' && !cat.kneadPlayed) {
      cat.kneadPlayed = true;
      SND.purr(2.4);
      if (R.random() < 0.3) caption(world, 'The cat kneads the rug into shape.');
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
        const r = R.random();
        if (r < 0.3) { cat.state = 'groom'; cat.stateT = rnd(3, 6); }
        else if (r < 0.5) { cat.state = 'sleep'; cat.stateT = restTime(world, 35, 90); }
        else { cat.state = 'stretch'; cat.stateT = 1.6; }
        break;
      }
      case 'groom':
        cat.state = R.random() < 0.5 ? 'sit' : 'sleep';
        cat.stateT = cat.state === 'sleep' ? restTime(world, 35, 90) : restTime(world, 4, 9);
        break;
      case 'stretch': startNextJourney(world, cat); break;
      case 'loaf':
        cat.state = R.random() < 0.6 ? 'sleep' : 'sit';
        cat.stateT = cat.state === 'sleep' ? restTime(world, 35, 90) : restTime(world, 5, 12);
        break;
      case 'knead':
        cat.state = 'sleep'; cat.stateT = restTime(world, 40, 100);
        break;
      default: cat.state = 'sit'; cat.stateT = 4;
    }
  }

  /* ---------- narrative: the invitation + trigger loop ---------- */

  /* Which present, seated arc-owners currently carry a pending invitation, as
     { patronId: glyph }. Shared by the renderer (which bubble to draw) and the
     tap hit-test (what a click can consume). Seated-only so a yarn-ball never
     bobs along on someone walking in. */
  function pendingInvites(world) {
    const out = {};
    if (!world.memory) return out;
    ((CAST && CAST.arcs) || []).forEach(function (arc) {
      const rec = world.memory.arcs[arc.id];
      if (!rec || !rec.pendingBeat) return;
      const owner = world.patrons.find(function (p) {
        return p.regularId === arc.owner && p.state === 'seated';
      });
      if (owner) out[owner.id] = arc.glyph;
    });
    return out;
  }

  /* A café-owned arc pins its invitation to a fixed spot in the room instead
     of a person (`anchor: {x, y}` on the definition — the bubble's top edge
     sits at the anchor). Same bubble art, same patience: it waits across
     sessions until tapped. Returned in drawBubble's coordinate convention
     (which draws 100 px above the y it is given). */
  function anchoredInvites(world) {
    const out = [];
    if (!world.memory) return out;
    ((CAST && CAST.arcs) || []).forEach(function (arc) {
      if (!arc.anchor) return;
      const rec = world.memory.arcs[arc.id];
      if (rec && rec.pendingBeat) out.push({ x: arc.anchor.x, y: arc.anchor.y + 100, icon: arc.glyph });
    });
    return out;
  }

  /* bonds are Lunafreya's memory of a person, deepened only by being present for a
     shared moment (narrative.md §5). A played beat warms the owner's bond. */
  function bumpBond(world, id) {
    const b = world.memory.bonds;
    if (!b[id]) b[id] = { known: true, warmth: 0 };
    b[id].known = true;
    b[id].warmth = (b[id].warmth || 0) + 1;
  }

  /* Play a ready beat: a caption run carries the moment, a heart blooms over
     its owner (a café-owned, anchored arc has none), the arc steps to its next
     stage — or completes — and sets its lasting flag, and — for the scarf —
     the cat wears it from now on. Reuses the caption pipeline and the bubble
     system: almost no new runtime muscle (narrative.md §7). */
  function playBeat(world, arc, owner, attended) {
    const rec = world.memory.arcs[arc.id];
    if (!rec || !rec.pendingBeat) return;
    const playedStage = rec.stage;
    const lastingFlag = arcFlag(arc, playedStage);
    let lines = arcBeat(arc, playedStage).slice();
    if (arc.presenceBeat) {
      const pb = arc.presenceBeat;
      const table = pb.window == null ? -1 : world.tables.findIndex(t => t.tall && t.x === L.winTables[pb.window].x);
      const witness = world.patrons.find(function (p) {
        return p.regularId === pb.owner && p.state === 'seated' &&
          (pb.window == null || (p.seat && p.seat.window && p.seat.table === table));
      });
      if (witness && pb.lines && pb.lines.length) {
        lines.splice(Math.max(0, lines.length - 1), 0, pick(pb.lines));
      }
    }
    if (!attended) {
      SIM.beginMoment(world, lines.map(text => ({speaker:'a quiet moment',text:text})), owner,
        function () { SIM.withWorld(world, function () { playBeat(world, arc, owner, true); }); });
      return;
    }
    if (owner) owner.bubble = { icon: 'heart', until: world.t + 3.4 };
    if (lastingFlag === 'cat-wore-scarf') {
      world.cat.scarf = arc.scarfColor;
      world.cat.bubble = { icon: 'heart', until: world.t + 3.4 };
      SND.purr(3);
    }
    rec.pendingBeat = null;
    rec.stage = Math.min(arcStages(arc), rec.stage + 1);
    if (rec.stage < arcStages(arc)) rec.progress = 0;   // the next stage starts fresh
    world.memory.flags[lastingFlag] = true;
    if (arc.owner) bumpBond(world, arc.owner);
    world.context.memory.save();
  }

  /* The general tap hit-test the single canvas click handler grows
     (narrative.md §2): did a click land on a waiting invitation? A forgiving
     box covers the seated owner and the bubble above them, so a soft tap in the
     neighbourhood counts. Returns the arc it played, or null; main.js calls
     this before petCat so an invitation wins the click. */
  SIM.beatAt = function (world, x, y) {
    if (world.shop && (world.shop.away || world.shop.fade > 0)) return null;
    if (!world.memory) return null;
    const arcs = (CAST && CAST.arcs) || [];
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const rec = world.memory.arcs[arc.id];
      if (!rec || !rec.pendingBeat) continue;
      if (arc.anchor) {
        // a fixed invitation: a forgiving box around the drawn bubble
        const a = arc.anchor;
        if (x > a.x - 26 && x < a.x + 26 && y > a.y - 6 && y < a.y + 46) {
          playBeat(world, arc, null);
          return arc;
        }
        continue;
      }
      const owner = world.patrons.find(function (p) {
        return p.regularId === arc.owner && p.state === 'seated';
      });
      if (!owner) continue;
      const ay = owner.pose === 'sit' ? owner.y + 6 : owner.y;
      if (x > owner.x - 26 && x < owner.x + 26 && y > ay - 108 && y < owner.y + 8) {
        playBeat(world, arc, owner);
        return arc;
      }
    }
    return null;
  };

  SIM.petCat = function (world) {
    if (world.shop && (world.shop.away || world.shop.carryingCat)) return;
    const cat = world.cat;
    if (cat.state === 'walk' || cat.state === 'hop' || cat.state === 'pounce') return;
    cat.bubble = { icon: 'heart', until: world.t + 2.2 };
    if (cat.state === 'sleep' && cat.surface !== 'lap') { cat.state = 'sit'; cat.stateT = rnd(6, 12); }
    if (R.random() < 0.4) SND.meow(); else SND.purr(2);
    caption(world, 'The cat purrs happily.');
  };

  SIM.dislodgeCat = function (world, patron) {
    if (!world || world.cat.lapPatron !== patron) return;
    patron.lapCat = false;
    world.cat.lapPatron = null;
    if (R.random() < 0.4) caption(world, 'The cat is gently returned to the floor.');
    leavePerch(world, world.cat);
  };

  /* ---------- main update ---------- */

  const shop = R.createShopLifecycle({
    busRoute: busRoute, fireTendRoute: fireTendRoute,
    refillRoute: refillRoute, leavePerch: leavePerch
  });

  SIM.update = function (world, dt) {
    if (world.moment) {
      // Hold all obligations and deadlines; only ambient animation breathes.
      SIM.updateMoment(world,dt);
      [world.barista, world.cat].concat(world.patrons,SIM.visitorActors(world)).forEach(p => {p.animT += dt;});
      updateParticles(world, dt);
      return;
    }
    if(world.shop.phase==='settling') {
      if(!world.firstEntryReady || world.introPaused || world.introHidden || world.introModal)return;
      world.t+=dt;world.clockOffset-=dt;
      R.updateFirstOpening(world,dt);updateCaptions(world,dt);R.saveLife(world,dt);return;
    }
    // One mandatory first hello teaches the invitation. Waiting costs no café
    // time, sales or closing deadline, including when the tab is unattended.
    if(SIM.holgerRequired(world) && SIM.holgerAvailable(world)) {
      [world.barista,world.cat].concat(world.patrons).forEach(p=>{p.animT+=dt;});
      updateParticles(world,dt);updateCaptions(world,dt);R.saveLife(world,dt);return;
    }
    shop.beforeClock(world, dt);
    world.t += dt;
    updateClock(world, dt);
    updateNarrative(world, dt);
    if (world.shop.phase === 'home') {
      R.updateHome(world, dt); updateCaptions(world, dt); R.saveLife(world, dt); return;
    }
    if (!world.shop || world.shop.phase === 'open') updateCandles(world, dt);
    updateFire(world, dt);
    updateWeather(world, dt);
    updatePassersby(world, dt);
    R.updateWaterfront(world, dt);
    updateDoor(world, dt);
    const shopBusy = shop.update(world, dt);
    if (world.shop.phase === 'home') { R.saveLife(world, dt); return; }
    updateSpawning(world, dt);
    R.updateWindowWorker(world,dt);
    R.updateVisitors(world,dt);
    if (!shopBusy) updateBarista(world, world.barista, dt);
    world.patrons.forEach(function (p) { updatePatron(world, p, dt); });
    world.patrons = world.patrons.filter(function (p) { return !p.gone; });
    if (!world.shop.carryingCat) {
      if (world.cat.state === 'shopWalk') {
        world.cat.animT += dt; walker(world.cat, dt);
      } else updateCat(world, world.cat, dt);
    }
    updateParticles(world, dt);
    updateCaptions(world, dt);
    R.saveLife(world, dt);
  };

  /* ---------- what to draw ---------- */

  SIM.entityDrawables = function (world) {
    const draws = [];
    SIM.visitorActors(world).forEach(function(a) {
      draws.push({y:a.y,draw:function(g) {
        SCENE.drawPerson(g,world.moment ? Object.assign({},a,{pose:'stand',path:null}) : a);
        const x=Math.round(a.x),y=Math.round(a.y);
        if(a.visitorId==='tomas' && !a.social) {
          g.fillStyle='#6b4a30';g.fillRect(x+13,y-11,15,10);
          g.fillStyle='#b18d62';g.fillRect(x+17,y-14,7,3);
        }
        if(a.trolley) {
          // Narrow upright hand trolley, inside the walker's shoulder clearance.
          g.fillStyle='#4b5260';g.fillRect(x-9,y-30,2,28);g.fillRect(x+8,y-30,2,28);
          g.fillRect(x-9,y-31,19,2);g.fillRect(x-10,y-5,21,3);
          g.fillStyle='#302c2a';g.fillRect(x-11,y-3,5,5);g.fillRect(x+7,y-3,5,5);
          if(!a.trolleyEmpty) {
            g.fillStyle='#a77e51';g.fillRect(x-8,y-25,17,20);
            g.fillStyle='#c9a477';g.fillRect(x-8,y-25,17,4);
            g.fillStyle='#dfbd89';g.fillRect(x-1,y-25,3,20);
          }
        }
      }});
    });
    const bubbles = [];
    SIM.visitorInvites(world).forEach(a=>bubbles.push({x:a.x,y:a.y,icon:'dots'}));
    // A pending beat raises a soft, persistent invitation over its seated owner
    // (docs/narrative.md §2) — it waits across sessions and never expires. It
    // takes the owner's bubble slot so it never fights their ambient chatter.
    const invited = world.memory.life.mode === 'game' ? pendingInvites(world) : {};
    const holger=SIM.holgerAvailable(world);if(holger)invited[holger.id]='dots';
    world.patrons.forEach(function (p) {
      if (p.outside) return;
      draws.push({ y: p.y, draw: function (g) { SCENE.drawPerson(g, world.moment ?
        Object.assign({},p,{pose:p.pose==='sit'?'sit':'stand',path:null,bubble:null},
          world.moment.phase==='talk' && world.moment.owner===p ? {heading:'',facing:world.barista.x>p.x?1:-1} : {}) : p); } });
      if (invited[p.id]) bubbles.push({ x: p.x, y: p.pose === 'sit' ? p.y + 6 : p.y, icon: invited[p.id],
        alpha:p===holger && SIM.holgerRequired(world) && !world.memory.flags['holger-invitation-opened'] && !world.reducedMotion
          ? .45+.55*(.5+.5*Math.cos(p.animT*Math.PI)) : 1 });
      else if (p.bubble) bubbles.push({ x: p.x, y: p.pose === 'sit' ? p.y + 6 : p.y, icon: p.bubble.icon });
    });
    const b = world.barista;
    if (!b.introOutside && !b.outside && (!world.shop || !world.shop.away)) draws.push({ y: b.y, draw: function (g) {
      SCENE.drawPerson(g, world.moment && world.moment.phase==='talk' ? Object.assign({},b,{pose:'stand',path:null}) : b);
      if (world.shop && world.shop.carryingCat) {
        const lift=b.pose==='hug'?6+Math.round(Math.sin(Math.min(1,b.stateT/3)*Math.PI/2)*3)
          : b.pose==='gather'?Math.round(9*(1-Math.min(1,b.stateT/3))):0;
        SCENE.drawCat(g, Object.assign({}, world.cat, { x: b.x + b.facing * 7, y: b.y - 28-lift,
          state: 'sleep', surface: 'arms', carried: true, facing: b.facing }));
        SCENE._.px(g, Math.round(b.x) - 6, Math.round(b.y) - 30-lift, 5, 3, b.colors.skin);
        SCENE._.px(g, Math.round(b.x) + 9, Math.round(b.y) - 30-lift, 5, 3, b.colors.skin);
      }
    } });
    const cat = world.cat;
    if (!world.shop || !world.shop.carryingCat) {
      draws.push({ y: cat.y, draw: function (g) { SCENE.drawCat(g, cat); } });
      if (cat.bubble) bubbles.push({ x: cat.x, y: cat.y + 34, icon: cat.bubble.icon });
    }
    (world.memory.life.mode === 'game' ? anchoredInvites(world) : []).forEach(function (b) { bubbles.push(b); });
    return { draws: draws, bubbles: world.moment ? [] : bubbles };
  };

  R.updateBarista = updateBarista;
  R.shopRoute = shop.route;
  R.updateCat = updateCat;
  R.busRoute = busRoute;
  R.pianoRoute = pianoRoute;
  R.refillRoute = refillRoute;
  R.waterRoute = waterRoute;
  R.candleRoute = candleRoute;
  R.fireRoute = fireRoute;
  R.catRoute = catRoute;
  R.catSpots = CAT_SPOTS;
  R.catPerches = WINDOW_SPOTS.concat([BOOK_SPOT, PIANO_SPOT]);

  // World-first public/debug entry points also select the private services.
  R.updateBarista = R.bindWorld(R.updateBarista);
  R.updateCat = R.bindWorld(R.updateCat);
  R.busRoute = R.bindWorld(R.busRoute);
  R.candleRoute = R.bindWorld(R.candleRoute);
  SIM.beatAt = R.bindWorld(SIM.beatAt);
  SIM.petCat = R.bindWorld(SIM.petCat);
  SIM.dislodgeCat = R.bindWorld(SIM.dislodgeCat);
  SIM.update = R.bindWorld(SIM.update);
  SIM.entityDrawables = R.bindWorld(SIM.entityDrawables);
})();
