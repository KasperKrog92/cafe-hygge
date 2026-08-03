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
    const busY = tb.y + 20;
    const dropX = tb.small ? tb.busVia : busX;
    const route = [
      { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
      { x: dropX, y: L.lane }, { x: dropX, y: busY }
    ];
    if (dropX !== busX) route.push({ x: busX, y: busY });
    return route;
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
})();
