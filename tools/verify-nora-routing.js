/* Run with agent-browser eval in one disposable ?dev session.
   Exercises actual walker output, including interrupted chores and service. */
(function () {
  'use strict';
  const L = SCENE.L, R = SIM._, original = window.__world;
  const failures = [], results = [], frames = {};
  let seed = 8137, routes = 0, samples = 0;
  function check(ok, message) { if (!ok && failures.indexOf(message) < 0) failures.push(message); }
  function inside(p, b) { return p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1; }
  // Independent solid-footprint oracle. Low service tables share projected
  // floor space with their interaction; chairs, lamps and plants never do.
  const solids = L.footprints.filter(function (b) { return !b.passable; }).concat(
    L.occluders.map(function (b) { return { name: b.name, x0: b.x0, x1: b.x1,
      y0: b.name === 'counter' ? L.baristaHome.y + 1 : b.top, y1: b.baseline }; }));
  function inspect(p, from, to, label) {
    samples++;
    solids.forEach(function (box) {
      if (box.seat && (inside(from, box) || inside(to, box))) return;
      check(!(p.x > box.x0 - 9 && p.x < box.x1 + 9 && p.y > box.y0 && p.y < box.y1), label + ': crossed ' + box.name);
    });
    check(p.x >= 22 && p.x <= L.W - 22 && p.y >= L.wallY && p.y <= 566, label + ': outside floor');
  }
  const random = function () { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  try {
    const w = SIM.create({ random: random }); window.__world = w;
    const targets = [L.baristaHome, L.doorSpot, L.shop.switchSpot, L.shop.pastry,
      L.noraCare.chalk, L.fire.stand, L.noraCare.mantel, L.catCorner.noraSpot]
      .concat(L.noraCare.water, w.tables.map(function (t, i) { return R.busRoute(w, i).slice(-1)[0]; }),
        [8, 22, 44, 50].map(function (dx) { return { x: L.machine.x + dx, y: L.backBar.workY }; }));
    targets.forEach(function (from, i) {
      targets.forEach(function (to, j) {
        const e = { kind: 'barista', x: from.x, y: from.y, speed: 42,
          // Deliberately obsolete waypoints: Nora must plan from her actual
          // position, not revisit home or follow an obstructed old leg.
          path: [L.baristaHome, to] };
        const label = 'route ' + i + ' → ' + j;
        let arrived = false;
        for (let tick = 0; tick < 1800; tick++) {
          arrived = R.walker(e, 0.05);
          inspect(e, from, to, label);
          if (arrived || e.walkBlocked) break;
        }
        check(arrived && e.x === to.x && e.y === to.y, label + ': unreachable');
        routes++;
      });
    });
    const blocked = { kind: 'barista', x: L.baristaHome.x, y: L.baristaHome.y,
      speed: 42, path: [{ x: L.plants[0].x, y: L.plants[0].y }] };
    check(!R.walker(blocked, 0.25) && blocked.walkBlocked && blocked.path.length === 1,
      'unreachable chore was reported as arrival');
    blocked.path = [L.shop.pastry];
    R.walker(blocked, 0.25);
    check(!blocked.walkBlocked, 'replacement route remained blocked');

    ['water', 'candles', 'fire', 'chalk', 'piano', 'bus', 'bowls'].forEach(function (task) {
      const world = SIM.create({ random: random }); window.__world = world;
      world.patrons = []; world.queue = []; world.counterCups = [];
      world.seats.forEach(function (s) { s.taken = false; });
      world.tables.forEach(function (t) { t.items = []; });
      world.spawnT = 1e9;
      const b = world.barista;
      b.orders = []; b.state = 'idle'; b.path = null; b.idleT = 0;
      if (task === 'bus') world.tables[4].items.push({ owner: null, kind: 'coffee' });
      else if (task === 'bowls') { world.catBowls.food = 0; world.catBowls.water = 0; }
      else __dev.noraDo(task);
      const states = [];
      let finished = false, mantelVisited = false;
      for (let tick = 0; tick < 1600; tick++) {
        // Keep this an isolated chore; end piano after reaching its bench.
        world.spawnT = 1e9;
        const previous = { x: b.x, y: b.y };
        SIM.update(world, 0.25);
        if (b.pose === 'walk') inspect(b, previous, (b.path && b.path[b.path.length - 1]) || b, task);
        if (!states.length || states[states.length - 1] !== b.state) states.push(b.state);
        check(!b.walkBlocked, task + ': blocked in ' + b.state);
        if (task === 'piano' && b.state === 'pianoPlaying') b.pianoDur = 0;
        if (task === 'candles' && b.state === 'candleLight' && b.candleStop.mantel) mantelVisited = true;
        if (task === 'bus' && b.state === 'busOut' && b.y > 480 && !frames.nook) frames.nook = __dev.shot();
        if (tick > 1 && b.state === 'idle') { finished = true; break; }
      }
      check(finished, task + ': did not finish');
      if (task === 'water') check(world.wateredDay === R.dayIndex(world), 'watering did not reach every plant');
      if (task === 'bus') check(!world.tables[4].items.length, 'nook cups not collected');
      if (task === 'bowls') check(world.catBowls.food > 0.9 && world.catBowls.water > 0.9, 'bowls not filled');
      if (task === 'candles') check(mantelVisited, 'candle round skipped mantel');
      failures.push.apply(failures, __dev.audit());
      results.push({ task: task, states: states });
    });
    window.noraFrames = frames;
  } finally { window.__world = original; }
  const report = { routes: routes, samples: samples, chores: results, failures: failures };
  if (failures.length) throw new Error(JSON.stringify(report));
  return report;
})();
