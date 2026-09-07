/* Café Hygge — opening and closing lifecycle */
(function () {
  'use strict';

  const R = window.SIM._;
  const L = R.L, SND = R.sound;
  const caption = R.caption, walker = R.walker;
  const addLog = R.addLog;

  // Construct once with the existing character helpers; keep all mutable state
  // on the supplied world. No character implementation is exported for this.
  // beforeClock runs before time advances. update runs after outdoor life/door,
  // before spawning/service, and returns true only while rituals own Lunafreya.
  // route is the existing world-first dev/audit route contract.
  R.createShopLifecycle = function (characters) {
    const busRoute = characters.busRoute, fireTendRoute = characters.fireTendRoute;
    const refillRoute = characters.refillRoute, leavePerch = characters.leavePerch;

    // Shop rituals own Lunafreya only for one out-and-back chore at a time. Service
    // retains priority between chores, so an early visitor can already order.
    function shopPath(from, to) {
      const walker = { x: from.x, y: from.y, kind: from.kind };
      R.makePath(walker, to.x, to.y);
      return walker.path;
    }

    function shopRoute(world, kind, index) {
      if (kind === 'plant') return shopPath(world.barista, L.firstPlant.pickup);
      if (kind === 'table') return busRoute(world, index);
      if (kind === 'curtain') {
        const ti = world.tables.findIndex(t => t.tall && t.x === L.winTables[index].x);
        return ti >= 0 ? busRoute(world,ti) : shopPath(world.barista,L.catPerches.windows[index].stand);
      }
      if (kind === 'hearth') return fireTendRoute();
      if (kind === 'bowls' || kind === 'cat' || kind === 'putCat') return refillRoute();
      if (kind === 'stock') return [SCENE.hasFurniture(world,'full-counter')?L.shop.pastry:L.basic.pastry];
      if (kind === 'lights') return [
        { x: L.baristaExitX, y: L.baristaHome.y }, { x: L.baristaExitX, y: L.lane },
        { x: L.entryApproach.x, y: L.lane }, L.entryApproach, L.shop.switchSpot
      ];
      return [{ x: L.baristaHome.x, y: L.baristaHome.y }];
    }

    function shopTasks(world, opening) {
      if (opening) return [{ kind: 'lights' }, { kind: 'putCat' }, { kind: 'bowls' }]
        .concat(world.shop.plantMorning ? [{ kind: 'plant' }] : [])
        .concat([{ kind: 'curtain', index: 0 }, { kind: 'hearth' }, { kind: 'curtain', index: 1 },
          { kind: 'stock' }, { kind: 'welcome' }]).filter(t => (t.kind !== 'hearth' || !SCENE.hearthWork(world)) && (t.kind !== 'curtain' || SCENE.hasFurniture(world,'drapes')));
      // One floor circuit from the counter: reading nook, lower dining tables,
      // piano/artist corner, then the upper tables/windows from left to right.
      // Keep table identity in world.tables; only the visit order changes.
      const dining = world.tables.filter(function (tb) { return !tb.small && !tb.tall && !tb.piano && !tb.artist; });
      const middleY = (Math.min.apply(null, dining.map(function (tb) { return tb.y; })) +
        Math.max.apply(null, dining.map(function (tb) { return tb.y; }))) / 2;
      function zone(tb) {
        if (tb.small) return 0;
        if (!tb.tall && !tb.piano && !tb.artist && tb.y > middleY) return 1;
        if (tb.piano) return 2;
        if (tb.artist) return 3;
        return 4;
      }
      const tables = world.tables.map(function (tb, i) { return { kind: 'table', index: i, zone: zone(tb), x: tb.x }; });
      tables.sort(function (a, b) { return a.zone - b.zone || (a.zone < 2 ? b.x - a.x : a.x - b.x); });
      return [{ kind: 'greet' }, { kind: 'wipe' }, { kind: 'wait' }]
        .concat(tables)
        .concat([{ kind: 'stock' }, { kind: 'curtain', index: 1 }, { kind: 'hearth' },
          { kind: 'curtain', index: 0 }, { kind: 'cat' }, { kind: 'lights' }]).filter(t => (t.kind !== 'hearth' || !SCENE.hearthWork(world)) && (t.kind !== 'curtain' || SCENE.hasFurniture(world,'drapes')));
    }

    function updateShop(world, dt) {
      const s = world.shop, b = world.barista, cat = world.cat;
      if (!s) return false;
      if (s.phase === 'open') {
        if (dt <= 0 || (world.hour < 21.5 && world.hour >= 6)) return false;
        s.phase = 'closing'; s.accepting = false; s.elapsed = 0; s.step = 0;
        s.lastCall = false;
        caption(world, 'the last cups of the evening; Lunafreya begins to tidy.');
      }
      s.elapsed += dt;
      if (s.phase === 'night') {
        s.fade = Math.min(1, s.elapsed / 2);
        if (s.elapsed >= 3) {
          R.enterHome(world); return true;
        }
        return true;
      }
      if (s.phase === 'home') return true;
      if (s.phase === 'dawn') {
        s.fade = Math.max(0, 1 - s.elapsed / 2);
        if (s.elapsed >= 2) {
          s.phase = 'entering'; s.elapsed = 0; s.away = false;
          s.plantMorning = ['available','installed'].indexOf(world.memory.life.plant.stage) < 0;
          b.x = L.doorSpot.x; b.y = L.doorSpot.y; b.pose = 'stand';
          // The switch is beside the threshold: use the clear entrance column
          // before joining any of the café's floor routes.
          b.path = [L.shop.switchSpot];
          R.ringDoor(world);
          caption(world, 'a new morning; Lunafreya brings the cat in from the quiet street.');
        }
        return true;
      }
      if (s.phase === 'entering') {
        b.animT += dt;
        if (walker(b, dt)) {
          b.holding = 'cat'; b.state = 'shop';
          s.phase = 'opening'; s.step = 0;
          // Start working where she is. The ordinary chore continuation will
          // take her to the cat corner, then across the room toward the counter.
          s.task = { kind: 'lights', time: 0, route: shopRoute(world, 'lights') };
        }
        return true;
      }
      if (s.task) {
        const task = s.task;
        if (task.kind === 'plant' && !task.returning) {
          if (!R.workPlant(world, dt)) return true;
          s.step++;
          const next = shopTasks(world, true)[s.step], route = shopRoute(world,next.kind,next.index);
          s.task = {kind:next.kind,index:next.index,time:0,route:route};
          b.path = shopPath(b,route[route.length-1]); return true;
        }
        b.animT += dt;
        if (b.path && b.path.length) { walker(b, dt); return true; }
        if (task.returning) {
          s.task = null; b.state = 'idle'; b.pose = 'stand'; b.holding = s.carryingCat ? 'cat' : null;
          if (task.kind !== 'home') s.step++;
          return true;
        }
        b.pose = task.kind === 'wipe' || task.kind === 'table' ? 'wipe' : 'reach';
        b.heading = 'up';
        if (task.kind === 'greet') { b.pose = 'stand'; b.heading = 'down'; }
        if (task.kind === 'cat' && !s.carryingCat) {
          b.pose = 'stand';
          if (cat.surface !== 'floor' || cat.state === 'hop') {
            leavePerch(world, cat); return true;
          }
          if (!task.called) {
            task.called = true; cat.state = 'shopWalk';
            cat.path = shopPath(cat, b); SND.meow();
          }
          if (cat.path && cat.path.length) return true;
          s.carryingCat = true; b.holding = 'cat'; SND.purr(2);
          caption(world, 'one sleepy cat, tucked into Lunafreya’s arms.');
        }
        task.time += dt;
        b.stateT = task.time;
        const progress = Math.min(1, task.time / 2.5), opening = s.phase === 'opening';
        if (task.kind === 'curtain') s.curtains[task.index] = opening ? 1 - progress : progress;
        if (task.time < 2.5) return true;
        if (task.kind === 'table') {
          const tb = world.tables[task.index];
          tb.items = tb.items.filter(function (it) { return it.owner !== null; });
          tb.candle = tb.candleTarget = 0; SND.swish();
        } else if (task.kind === 'putCat') {
          s.carryingCat = false; cat.x = b.x; cat.y = b.y;
          cat.surface = 'floor'; cat.state = 'sit'; cat.stateT = 2; cat.path = null;
          cat.target = { id: 'free', x: cat.x, y: cat.y, kind: 'floor' };
          b.holding = null;
        }
        else if (task.kind === 'stock') { s.stocked = opening; SND.clink(0.5, 0.025); }
        else if (task.kind === 'lights') s.lights = opening ? 1 : 0;
        else if (task.kind === 'hearth') {
          world.candles.mantel = world.candles.mantelTarget = 0;
          if (opening) addLog(world);
          else { world.fire.target = 0.16; world.fire.wantsLog = false; }
        } else if (task.kind === 'bowls') { world.catBowls.food = world.catBowls.water = 1; SND.kibblePour(0.9); }
        else if (task.kind === 'greet') {
          s.lastCall = true;
          if (world.patrons.length) caption(world, 'Lunafreya wishes everyone a good night — time for the last sip.');
        } else if (task.kind === 'wipe') SND.swish();
        task.returning = true; b.pose = 'stand'; b.heading = null;
        b.path = task.route.slice(0, -1).reverse().concat([L.baristaHome]);
        // With the cat in her arms, switch off by the door and leave directly.
        if (task.kind === 'lights' && !opening) {
          s.step++; s.task = null;
          b.path = shopPath(b, L.doorSpot); R.ringDoor(world);
          s.phase = 'leaving';
        } else {
          const next = shopTasks(world, opening)[s.step + 1];
          if (next && ['wait', 'welcome'].indexOf(next.kind) < 0 && !b.orders.length && !world.queue.length) {
            const route = shopRoute(world, next.kind, next.index);
            let common = 0;
            while (common < task.route.length && common < route.length &&
                task.route[common].x === route[common].x && task.route[common].y === route[common].y) common++;
            // Retrace only to the shared aisle junction, then continue the round.
            b.path = common ? task.route.slice(common - 1, -1).reverse().concat(route.slice(common))
              : task.route.slice(0, -1).reverse().concat([L.baristaHome], route);
            if (['stock', 'wipe'].indexOf(task.kind) < 0 && ['stock', 'wipe'].indexOf(next.kind) < 0) {
              const direct = shopPath(b, route[route.length - 1]);
              if (direct.length) b.path = direct;
            }
            s.step++;
            s.task = { kind: next.kind, index: next.index, time: 0, route: route };
            b.holding = s.carryingCat ? 'cat' : ['table', 'wipe'].indexOf(next.kind) >= 0 ? 'cloth' : null;
          }
        }
        return true;
      }
      if (s.phase === 'leaving') {
        b.animT += dt;
        if (walker(b, dt)) { s.away = true; s.phase = 'night'; s.elapsed = 0; b.path = null; }
        return true;
      }
      const tasks = shopTasks(world, s.phase === 'opening'), next = tasks[s.step];
      if (!next) { s.phase = 'open'; s.accepting = true; b.state = 'idle'; b.idleT = 6; return false; }
      if (next.kind === 'wait') {
        const terraceDirty = world.waterfront.tables.some(function (tb) { return tb.dirty || tb.cleaning; });
        if (terraceDirty) { R.startTerraceClear(world, b); return false; }
        if (!world.patrons.length && !b.orders.length && !world.queue.length && b.state === 'idle') s.step++;
        return false;
      }
      if (next.kind === 'welcome') {
        s.accepting = true; world.spawnT = 1; s.step++;
        caption(world, SCENE.hasFurniture(world,'drapes') ? 'fresh cakes, open curtains — the first guests are welcome.' : 'fresh coffee and a little cake — the first guests are welcome.');
        return false;
      }
      if (b.state !== 'idle' || b.orders.length || world.queue.length) return false;
      s.task = { kind: next.kind, index: next.index, time: 0, route: shopRoute(world, next.kind, next.index) };
      b.state = 'shop'; b.path = s.task.route.slice(); b.pose = 'stand';
      b.holding = s.carryingCat ? 'cat' : ['table', 'wipe'].indexOf(next.kind) >= 0 ? 'cloth' : null;
      return true;
    }

    function beforeClock(world, dt) {
      // Let the last evening linger while Lunafreya finishes; a long cleanup must
      // never turn into a morning shift before the overnight fade has played.
      if (world.shop && world.shop.phase === 'home') world.clockOffset -= dt;
      if (world.shop && world.shop.phase === 'closing' && (world.hour >= 22.5 || world.hour < 6)) world.clockOffset -= dt;
    }

    return {
      beforeClock: R.bindWorld(beforeClock),
      update: R.bindWorld(updateShop),
      route: R.bindWorld(shopRoute)
    };
  };
})();
