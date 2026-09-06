/* Café Hygge — one shared life, one optional plant. */
(function () {
  'use strict';
  const R = SIM._, L = SCENE.L, H = L.home;
  const PLANT = { price: 30, destination: 'cafe', delivery: 'carry', phases: ['scheduled','carry','unpack','place','installed'] };
  SIM.plantProject = PLANT;
  function commit(w) { saveLife(w, 0); w.context.memory.saveNow(); }
  function saveLife(w, dt) {
    const l = w.memory.life, b = w.barista;
    l.hour = w.hour;
    l.checkpoint = w.shop.phase === 'open' ? null : {
      shop: JSON.parse(JSON.stringify(w.shop)),
      nora: { x: b.x, y: b.y, path: b.path ? b.path.map(p => ({x:p.x,y:p.y})) : null,
        state: b.state === 'shop' ? 'shop' : 'idle', pose: b.pose, heading: b.heading,
        facing: b.facing, holding: b.holding }
    };
    const key = w.shop.phase + ':' + l.plant.stage;
    w.lifeSaveT = (w.lifeSaveT || 0) + dt;
    if (w.lifeSaveKey !== key || w.lifeSaveT >= 10) {
      w.lifeSaveKey = key; w.lifeSaveT = 0; w.context.memory.saveNow();
    }
  }
  R.saveLife = saveLife;
  R.restoreLife = function (w) {
    const l = w.memory.life, c = l.checkpoint;
    w.clockOffset = (l.hour - w.hour) / 24 * R.DAY_SECONDS;
    R.updateClock(w, 0);
    if (!c) return;
    Object.assign(w.shop, JSON.parse(JSON.stringify(c.shop)));
    Object.assign(w.barista, JSON.parse(JSON.stringify(c.nora)));
    // Transient guests/orders are not saves. Resume rituals with a clear room;
    // a partially brewed cup cannot turn into another paid sale on reload.
    w.patrons = []; w.queue = []; w.counterCups = []; w.umbrellaStand = [];
    w.seats.forEach(s => { s.taken = false; });
    w.tables.forEach(t => { t.items = []; t.candle = t.candleTarget = 0; });
    if (w.shop.phase === 'home') homePose(w);
    else if (w.shop.carryingCat) { w.cat.state = 'sleep'; w.cat.path = null; }
    if (w.shop.task && w.shop.task.kind === 'cat') w.shop.task.called = false;
  };
  SIM.setMode = function (w, mode) {
    if (mode !== 'idle' && mode !== 'game') return false;
    w.memory.life.mode = mode;
    if (mode === 'idle') w.plannerOpen = false;
    commit(w); return true;
  };
  SIM.plan = function (w, open) {
    w.plannerOpen = !!open && w.shop.phase === 'home' && w.memory.life.mode === 'game';
    return w.plannerOpen;
  };
  SIM.goToSleep = function (w) {
    if (w.shop.phase !== 'home' || w.memory.life.mode !== 'game') return false;
    startMorning(w);
    return true;
  };
  SIM.buyPlant = function (w) {
    const l = w.memory.life;
    if (!w.plannerOpen || w.shop.phase !== 'home' || l.mode !== 'game' ||
        l.plant.stage !== 'available' || l.savings < PLANT.price) return false;
    l.savings -= PLANT.price; l.plant.stage = 'purchased'; l.plant.time = 0;
    commit(w); return true;
  };
  R.enterHome = function (w) {
    w.shop.phase = 'home'; w.shop.elapsed = 0; w.shop.fade = 0;
    w.shop.carryingCat = false; w.memory.life.homeTime = 0;
    w.barista.path = null; w.barista.holding = null; w.barista.state = 'idle';
    w.cat.path = null; w.cat.surface = 'floor'; w.cat.lapPatron = null;
    w.cat.hopQueue = null; w.cat.hopFrom = w.cat.hopTo = null;
    w.activeCaption = null; w.captionQueue = [];
    R.sound.pianoStop();
    homePose(w); R.caption(w, 'home, with a book and a familiar little shadow.'); commit(w);
  };
  // Authored home routes all join the clear lane below desk/boxes/bed. They
  // never invoke the café's furniture planner in this separate room.
  function track(e, t, points) {
    let a = points[0], b = a;
    for (let i = 1; i < points.length; i++) { b = points[i]; if (t < b[0]) break; a = b; }
    const q = a === b ? 0 : Math.min(1, Math.max(0,(t-a[0])/(b[0]-a[0])));
    const moving = a[1].x !== b[1].x || a[1].y !== b[1].y;
    e.x = a[1].x + (b[1].x-a[1].x)*q; e.y = a[1].y + (b[1].y-a[1].y)*q;
    e.facing = b[1].x < a[1].x ? -1 : 1;
    e.heading = b[1].y < a[1].y ? 'up' : b[1].y > a[1].y ? 'down' : '';
    e.pose = moving ? 'walk' : 'stand'; e.walkDistance = t * 36;
    return moving;
  }
  function lane(p) { return {x:p.x,y:H.lane}; }
  function homePose(w) {
    const t = w.memory.life.homeTime, b = w.barista, cat = w.cat;
    track(b,t,[[0,H.entry],[3,H.bag],[7,H.bag],[9,lane(H.bag)], [13,lane(H.deskSeat)],
      [15,H.deskSeat],[33,H.deskSeat],[35,lane(H.deskSeat)],[41,lane(H.bedApproach)], [43,H.bedApproach],
      [45,H.bedSeat],[78,H.bedSeat],[80,H.bedApproach],[82,lane(H.bedApproach)],[88,lane(H.deskSeat)],[90,H.deskSeat]]);
    b.reading = t >= 45 && t < 64; b.dozing = t >= 64 && t < 78;
    b.holding = null; b.state = 'idle';
    b.pcSit = 0;
    if (t >= 15 && t < 33) {
      b.pose = 'pc'; b.heading = 'up'; b.facing = 1;
      b.pcSit = Math.min(1,(t-15)/.7,(33-t)/.7);
    }
    if (t >= 45 && t < 78) { b.pose = 'sit'; b.heading = ''; b.facing = -1; }
    const stops=H.catStops;
    const moving=track(cat,t,[[0,H.entry],[5,stops[0]],[16,stops[0]], [18,lane(stops[0])],
      [29,lane(stops[1])],[31,stops[1]],[42,stops[1]], [44,lane(stops[1])],
      [52,lane(stops[2])],[54,stops[2]],[79,stops[2]],[81,lane(stops[2])],[88,lane(stops[0])],[90,stops[0]]]);
    cat.state = moving ? 'walk' : t >= 54 && t < 79 ? 'sleep' : 'sit';
    cat.surface = 'floor'; cat.target = {id:'home',x:cat.x,y:cat.y,kind:'floor'};
  }
  R.updateHome = function (w, dt) {
    const l = w.memory.life;
    w.barista.animT += dt; w.cat.animT += dt;
    // Arrival happens once. The indoor return joins the desk/box poses at 15s,
    // so waiting evenings repeat continuously without revisiting the entrance.
    const next = l.homeTime + dt;
    l.homeTime = l.mode === 'game' && next >= 90 ? 15 + (next - 90) % 75 : Math.min(90, next);
    homePose(w);
    if (l.homeTime === 45 && w.barista.reading) R.sound.pageTurn();
    if (l.homeTime < 90 || l.mode === 'game') return;
    startMorning(w);
  };
  function startMorning(w) {
    const l = w.memory.life;
    w.plannerOpen = false;
    w.barista.reading = w.barista.dozing = false;
    w.barista.pose = 'stand'; w.barista.holding = 'cat'; w.barista.path = null;
    w.cat.state = 'sleep'; w.cat.path = null;
    w.shop.phase = 'dawn'; w.shop.elapsed = 0; w.shop.fade = 1; w.shop.carryingCat = true;
    w.barista.x = L.doorSpot.x; w.barista.y = L.doorSpot.y;
    if (l.plant.stage === 'purchased') l.plant.stage = 'scheduled';
    w.clockOffset += ((7.5-w.hour+24)%24)/24*R.DAY_SECONDS;
    R.updateClock(w,0); commit(w);
  }
  R.workPlant = function (w, dt) {
    const p = w.memory.life.plant, b = w.barista;
    if (p.stage === 'available' || p.stage === 'installed') return true;
    b.animT += dt;
    if (b.path && b.path.length) { R.walker(b,dt); return false; }
    b.state = 'shop';
    if (p.stage === 'scheduled' || p.stage === 'purchased') {
      p.stage = 'carry'; p.time = 0; b.holding = 'parcel';
      b.path = [L.firstPlant.work]; commit(w); return false;
    }
    if (p.stage === 'carry') {
      p.stage = 'unpack'; p.time = 0; b.holding = null; commit(w);
    }
    b.pose = 'reach'; b.heading = ''; b.facing = 1;
    p.time = Math.min(8,p.time+dt); b.stateT = p.time;
    if (p.stage === 'unpack' && p.time >= 4) {
      p.stage = 'place'; p.time = 0; R.sound.swish(); commit(w);
    } else if (p.stage === 'place' && p.time >= 4) {
      p.stage = 'installed'; p.time = 0; b.pose = 'stand'; b.holding = null;
      R.caption(w,'a little green by the window.'); commit(w); return true;
    }
    return false;
  };
})();
