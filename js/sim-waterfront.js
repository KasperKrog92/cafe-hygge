/* Café Hygge — waterfront life and the terrace's real café journeys. */
(function () {
  'use strict';
  const R = window.SIM._, L = R.L, F = L.waterfront, rnd = R.rnd;

  const SND = R.sound;

  R.createWaterfront = function () {
    return { boats: [], birds: [], planes: [], shipT: rnd(360, 720), boatT: rnd(12, 40), birdT: rnd(8, 28), planeT: rnd(200, 420),
      tables: F.tables.map(function () { return { owner: null, cup: null, dirty: false, cleaning: false }; }) };
  };

  R.spawnWaterfront = function (world, kind, opts) {
    opts = opts || {};
    const dir = opts.dir || (R.random() < 0.5 ? 1 : -1);
    const item = { x: opts.x == null ? (dir > 0 ? F.x0 - 35 : F.x1 + 35) : opts.x,
      dir: dir, age: 0 };
    if (kind === 'ship') {
      if (world.waterfront.boats.length >= 2 || world.waterfront.boats.some(function (b) { return b.ship; })) return null;
      item.ship = true; item.sail = true; item.watchers = 0;
      item.x = opts.x == null ? (dir > 0 ? F.x0 - 65 : F.x1 + 65) : opts.x;
      item.y = F.waterY + 14; item.speed = 2.6;
      world.waterfront.boats.push(item);
    } else if (kind === 'boat') {
      item.sail = opts.sail == null ? R.random() < 0.4 : !!opts.sail;
      item.y = F.waterY + (item.sail ? 14 : 20);
      item.speed = rnd(3, 5); world.waterfront.boats.push(item);
    } else if (kind === 'birds') {
      item.y = F.skyY + rnd(14, 27); item.count = Math.floor(rnd(2, 4));
      item.speed = rnd(10, 15); world.waterfront.birds.push(item);
    } else if (kind === 'plane') {
      item.y = F.skyY + 10; item.speed = rnd(3, 4); world.waterfront.planes.push(item);
    }
    return item;
  };

  R.visibleShip = function (world) {
    return world.waterfront.boats.find(function (b) { return b.ship && b.x > F.x0 + 25 && b.x < F.x1 - 25; });
  };

  R.updateWaterfront = function (world, dt) {
    const wf = world.waterfront;
    wf.shipT -= dt;
    if (wf.shipT <= 0 && world.daylight > 0.4 && world.rain < 0.35 && wf.boats.length < 2) {
      R.spawnWaterfront(world, 'ship'); wf.shipT = rnd(720, 1440);
    }
    const ship = R.visibleShip(world);
    if (ship && !ship.announced) {
      ship.announced = true;
      R.caption(world, 'a wooden sailing ship glides across the lake, its sails full of afternoon light.');
    }
    wf.boatT -= dt; wf.birdT -= dt; wf.planeT -= dt;
    if (wf.boatT <= 0) {
      wf.boatT = rnd(100, 190);
      if (world.daylight > 0.25 && world.rain < 0.55 && wf.boats.length < 2) R.spawnWaterfront(world, 'boat');
    }
    if (wf.birdT <= 0) {
      wf.birdT = rnd(45, 100);
      if (world.daylight > 0.4 && world.rain < 0.5 && !wf.birds.length) R.spawnWaterfront(world, 'birds');
    }
    if (wf.planeT <= 0) {
      wf.planeT = rnd(420, 720);
      if (world.daylight > 0.5 && world.rain < 0.25 && !wf.planes.length) R.spawnWaterfront(world, 'plane');
    }
    ['boats', 'birds', 'planes'].forEach(function (key) {
      wf[key].forEach(function (p) { p.age += dt; p.x += p.dir * p.speed * dt; });
      wf[key] = wf[key].filter(function (p) { return p.x > F.x0 - 80 && p.x < F.x1 + 80; });
    });
  };

  function terraceWeather(world) {
    return world.shop.phase === 'open' && world.shop.accepting && world.hour >= 8 && world.hour < 20.5 && world.rain < 0.3;
  }
  R.reserveTerrace = function (world, p) {
    // Regulars keep their authored seats and stories. Borrowed books, paired
    // visits and parked umbrellas keep their existing indoor journeys.
    if (!SCENE.hasFurniture(world,'terrace') || !terraceWeather(world) || p.isRegular || p.partner || p.laptop || p.pianist ||
        p.umbrellaParked || p.hasShelfBook || (p.wantsBook && !p.ownBook) || p.seat || p.outdoor === false) return false;
    if (p.outdoor !== true && R.random() >= 0.4) return false;
    const index = world.waterfront.tables.findIndex(function (t) { return t.owner === null && !t.dirty && !t.cleaning; });
    if (index < 0) return false;
    world.waterfront.tables[index].owner = p.id;
    p.terraceTable = index;
    p.state = 'terraceDoor'; p.stateT = 0;
    R.makePath(p, L.doorSpot.x, L.doorSpot.y);
    return true;
  };

  // Only the outdoor projection moves here. The indoor entity stays at the
  // threshold, with no floor path; the two spaces can never confuse the
  // furniture planner. Exterior art reads this same entity at half scale.
  function outsideStep(p, target, dt) {
    const distance = target - p.exteriorX, step = Math.min(Math.abs(distance), 30 * dt);
    p.facing = distance >= 0 ? 1 : -1;
    p.pose = 'walk'; p.heading = '';
    p.exteriorX += Math.sign(distance) * step;
    p.walkDistance = (p.walkDistance || 0) + step * F.scale;
    return Math.abs(distance) <= step;
  }

  function departTerrace(world, p, returnInside) {
    const tb = world.waterfront.tables[p.terraceTable];
    tb.owner = null; tb.dirty = !!tb.cup;
    p.reading = false; p.armUp = 0; p.holding = null;
    if (returnInside) {
      p.holding = R.holdingFor(tb.cup || p.drink.kind);
      tb.cup = null; tb.dirty = false;
    }
    p.state = returnInside ? 'terraceReturn' : 'terraceLeave'; p.stateT = 0;
    p.terraceExit = R.random() < 0.5 ? F.x0 - 32 : F.x1 + 32;
  }

  R.updateTerracePatron = function (world, p, dt) {
    if (p.state.indexOf('terrace') !== 0) return false;
    const tb = world.waterfront.tables[p.terraceTable], a = F.tables[p.terraceTable];
    if (p.state === 'terraceDoor') {
      if (R.walker(p, dt)) {
        // Weather may have changed while the order was being collected.
        if (!terraceWeather(world)) {
          tb.owner = null; p.terraceTable = null;
          R.seatAfterTerrace(world, p); return true;
        }
        p.outside = true; p.exteriorX = F.entranceX; p.path = null;
        p.state = 'terraceWalk'; p.stateT = 0; R.ringDoor(world);
      }
    } else if (p.state === 'terraceWalk') {
      if (outsideStep(p, a.x - 16, dt)) {
        p.state = 'terraceSit'; p.stateT = 0; p.pose = 'sit'; p.facing = 1;
        p.holding = null; p.reading = !!p.ownBook;
        p.terraceStay = rnd(100, 240); p.terraceSip = rnd(8, 18); p.terraceWeatherT = 0; p.terracePage = rnd(15, 30);
        tb.cup = p.drink.kind;
        if (R.random() < 0.4) R.caption(world, p.name + ' takes a little time by the water.');
      }
    } else if (p.state === 'terraceSit') {
      p.terraceStay -= dt; p.terraceSip -= dt;
      p.terracePage -= dt;
      if (p.reading && p.terracePage <= 0) { p.pageTurn = 0.8; p.terracePage = rnd(15, 30); }
      p.armUp = p.terraceSip < 0 ? Math.sin(Math.min(1, -p.terraceSip / 2.5) * Math.PI) : 0;
      if (p.terraceSip < -2.5) { p.terraceSip = rnd(12, 25); p.armUp = 0; }
      if (world.rain > 0.4) p.terraceWeatherT += dt;
      else p.terraceWeatherT = 0;
      const closing = world.shop.lastCall || world.shop.phase !== 'open';
      if (closing || p.terraceStay <= 0 || p.terraceWeatherT > 10) {
        // A shower brings the reader back to shelter with the same identity.
        departTerrace(world, p, !closing && p.terraceWeatherT > 10);
      }
    } else if (p.state === 'terraceReturn') {
      if (outsideStep(p, F.entranceX, dt)) {
        p.outside = false; p.x = L.doorSpot.x; p.y = L.doorSpot.y;
        p.terraceTable = null; R.ringDoor(world); R.seatAfterTerrace(world, p);
      }
    } else if (p.state === 'terraceLeave') {
      if (outsideStep(p, p.terraceExit, dt)) { p.gone = true; p.outside = false; p.terraceTable = null; }
    }
    if (p.bubble && world.t >= p.bubble.until) p.bubble = null;
    return true;
  };

  R.startTerraceClear = function (world, b) {
    const index = world.waterfront.tables.findIndex(function (tb) { return tb.dirty && tb.owner === null && !tb.cleaning; });
    if (index < 0 || b.state !== 'idle' || b.orders.length || world.queue.length) return false;
    world.waterfront.tables[index].cleaning = true;
    b.terraceTable = index; b.state = 'terraceOut'; b.stateT = 0; b.pose = 'stand'; b.holding = null;
    R.makePath(b, L.doorSpot.x, L.doorSpot.y);
    return true;
  };

  R.updateTerraceBarista = function (world, b, dt) {
    if (b.state.indexOf('terrace') !== 0) return false;
    const a = F.tables[b.terraceTable], tb = world.waterfront.tables[b.terraceTable];
    if (b.state === 'terraceOut') {
      if (R.walker(b, dt)) {
        b.outside = true; b.exteriorX = F.entranceX; b.path = null;
        b.state = 'terraceApproach'; b.stateT = 0; R.ringDoor(world);
      }
    } else if (b.state === 'terraceApproach') {
      if (outsideStep(b, a.x + 17, dt)) {
        b.state = 'terraceClear'; b.stateT = 0; b.pose = 'wipe'; b.facing = -1; b.holding = 'cloth';
      }
    } else if (b.state === 'terraceClear') {
      if (b.stateT > 1 && tb.cup) { tb.cup = null; SND.clink(0.4, 0.02); }
      if (b.stateT > 2.8) {
        tb.dirty = false; tb.cleaning = false;
        b.holding = 'stack'; b.state = 'terraceBack'; b.stateT = 0; b.pose = 'stand';
        if (R.random() < 0.3) R.caption(world, 'Nora gathers the cups outside; the water carries the last of the light.');
      }
    } else if (b.state === 'terraceBack') {
      if (outsideStep(b, F.entranceX, dt)) {
        b.outside = false; b.x = L.doorSpot.x; b.y = L.doorSpot.y;
        b.state = 'terraceHome'; b.stateT = 0; R.ringDoor(world);
        R.makePath(b, L.baristaHome.x, L.baristaHome.y);
      }
    } else if (b.state === 'terraceHome') {
      if (R.walker(b, dt)) {
        b.holding = null; b.terraceTable = null; b.state = 'idle'; b.idleT = 3; b.pose = 'stand';
        SND.clink(0.4, 0.02);
      }
    }
    return true;
  };

  // World-first public/debug entry points also select the private services.
  R.spawnWaterfront = R.bindWorld(R.spawnWaterfront);
  R.visibleShip = R.bindWorld(R.visibleShip);
  R.updateWaterfront = R.bindWorld(R.updateWaterfront);
  R.reserveTerrace = R.bindWorld(R.reserveTerrace);
  R.updateTerracePatron = R.bindWorld(R.updateTerracePatron);
  R.startTerraceClear = R.bindWorld(R.startTerraceClear);
  R.updateTerraceBarista = R.bindWorld(R.updateTerraceBarista);
})();
