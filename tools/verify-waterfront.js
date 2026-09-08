/* Real order → terrace → departure → Lunafreya cleanup; rain and overnight checks.
   Run in one disposable ?dev session, export waterfrontFrames before closing. */
(function () {
  'use strict';
  const original = window.__world, L = SCENE.L, R = SIM._;
  const failures = [], results = [], frames = {};
  let seed = 6092026, audits = 0;
  const random = function () { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  function check(ok, text) { if (!ok && failures.indexOf(text) < 0) failures.push(text); }
  function fresh(hour) {
    const w = __dev.furnishedWorld({ random: random }); window.__world = w; SIM.setMode(w,'idle');
    w.patrons = []; w.queue = []; w.counterCups = []; w.umbrellaStand = [];
    w.seats.forEach(function (s) { s.taken = false; }); w.tables.forEach(function (t) { t.items = []; });
    w.regulars = {}; w.spawnT = 1e8; w.weatherT = 1e8; w.rain = w.rainTarget = 0; w.storm = false;
    __dev.hour(hour || 10);
    return w;
  }
  function run(w, until, limit, inspect) {
    let elapsed = 0;
    while (elapsed < limit && !until()) {
      SIM.update(w, 0.25); elapsed += 0.25;
      if (inspect) inspect();
      if (elapsed % 60 === 0) { failures.push.apply(failures, __dev.audit()); audits++; }
    }
    return until();
  }
  function guest() { return __dev.spawn({ outdoor: true, wantsBook: true, ownBook: true, drink: 'cappuccino', laptop: false, pianist: false }); }
  function shot(w, name) { frames[name] = __dev.shot(null, { world: w, scale: 1 }); }
  try {
    let w = fresh(10), p = guest(), q = guest();
    const seen = {}, nora = {};
    check(run(w, function () { return p.state === 'terraceSit' && q.state === 'terraceSit'; }, 170, function () {
      seen[p.state] = true; seen[q.state] = true;
      if (w.brew.active) seen[w.brew.stage] = true;
    }), 'two guests did not finish their orders and sit outside');
    ['ordering', 'grind', 'pull', 'steam', 'pickup', 'terraceDoor', 'terraceWalk'].forEach(function (s) {
      check(seen[s], 'missing normal order/terrace state ' + s);
    });
    check(p.terraceTable !== q.terraceTable, 'guests reserved the same outdoor table');
    check(!p.seat && !q.seat, 'outdoor guests also reserved indoor seats');
    __dev.boat({ x: 185, dir: 1, sail: true }); __dev.birds({ x: 244, dir: 1 });
    w.memory.arcs['street-house'].progress = 3.5;
    shot(w, 'terrace-day');
    p.terraceStay = 0; q.terraceStay = 0;
    check(run(w, function () { return !w.patrons.length && w.waterfront.tables.every(function (t) { return !t.dirty && !t.cleaning; }) && w.barista.state === 'idle'; }, 260, function () {
      nora[w.barista.state] = true;
      if (w.barista.state === 'terraceClear' && !frames['nora-clears']) shot(w, 'nora-clears');
      if (w.barista.outside) check(SIM.entityDrawables(w).draws.length === 1 + SIM.visitorActors(w).length + w.patrons.filter(function (p) { return !p.outside; }).length, 'Lunafreya duplicated indoors while outside');
    }), 'Lunafreya did not clear both departed guests and return home');
    ['terraceOut', 'terraceApproach', 'terraceClear', 'terraceBack', 'terraceHome'].forEach(function (s) { check(nora[s], 'Lunafreya missed ' + s); });
    check(w.waterfront.tables.every(function (t) { return t.owner === null && !t.cup; }), 'outdoor cup/reservation leaked');
    results.push('two complete coffee orders, distinct terrace seats, departures, two Lunafreya cleanup journeys');

    w = fresh(14); p = guest();
    check(run(w, function () { return p.state === 'terraceSit'; }, 140), 'rain setup failed');
    w.rain = w.rainTarget = 0.8;
    check(run(w, function () { return p.state === 'seated'; }, 140), 'shower did not bring same patron indoors');
    check(!p.outside && p.seat && p.seat.taken, 'rain return seat inconsistent');
    check(w.waterfront.tables.every(function (t) { return t.owner === null && !t.cup; }), 'rain return left duplicate cup');
    shot(w, 'rain-shelter');
    results.push('shower returns reader and drink indoors');

    w = fresh(14); p = guest();
    check(run(w, function () { return p.state === 'terraceDoor'; }, 100), 'reservation weather setup failed');
    w.rain = w.rainTarget = 0.8;
    check(run(w, function () { return p.state === 'seated'; }, 100), 'weather change before door did not cancel outdoor reservation');
    check(w.waterfront.tables.every(function (t) { return t.owner === null; }), 'cancelled reservation leaked');
    results.push('rain before exit cancels reservation without losing guest');

    w = fresh(18); p = guest();
    check(run(w, function () { return p.state === 'terraceSit'; }, 140), 'closing setup failed');
    __dev.arc('street-house', { ready: true });
    const pending = JSON.stringify(w.memory.arcs['street-house']);
    __dev.hour(21.5); shot(w, 'terrace-evening');
    let night = false;
    check(run(w, function () { return night && w.shop.phase === 'open'; }, 1400, function () {
      if (w.shop.away) {
        night = true;
        check(!w.patrons.length && !w.barista.outside, 'Lunafreya closed before terrace guests left');
        check(w.waterfront.tables.every(function (t) { return !t.dirty && !t.cup && !t.cleaning && t.owner === null; }), 'closed with dirty terrace');
      }
    }), 'outdoor evening did not complete closing and reopening');
    check(JSON.stringify(w.memory.arcs['street-house']) === pending, 'closing consumed the painter invitation');
    results.push('outdoor last guest and cleanup complete before closing; next morning and pending story preserved');

    w = fresh(10);
    w.waterfront.boatT = w.waterfront.birdT = w.waterfront.planeT = 1e8;
    const boat = __dev.boat({ x: 295, dir: 1, sail: false });
    const x = boat.x; R.updateWaterfront(w, 10);
    check(Math.abs(boat.x - x - boat.speed * 10) < 0.0001, 'boat is not elapsed-time driven');
    const before = boat.x; __dev.hour(16);
    check(boat.x === before, 'clock jump teleported the boat');
    R.updateWaterfront(w, 1000);
    check(!w.waterfront.boats.length, 'departed boat leaked');
    const morning = SCENE.sunPosition(9), evening = SCENE.sunPosition(18);
    check(morning.x < evening.x, 'sun does not cross left to right');
    const am = SCENE.windowLight({ hour: 9, daylight: 1, rain: 0 }, L.win);
    const pm = SCENE.windowLight({ hour: 18, daylight: 1, rain: 0 }, L.win);
    check(am.shift > pm.shift, 'window light does not follow sun direction');
    check(SCENE.windowLight({ hour: 22, daylight: 0, rain: 0 }, L.win).strength === 0, 'sunbeam at night');
    results.push('dt movement, clock-jump continuity, entity disposal and shared sun/beam geometry');

    [9, 17.5, 21].forEach(function (h) {
      const study = __dev.study({ hour: h, rain: 0, seats: [] });
      study.waterfront.boats = [{ x: 251, y: L.waterfront.waterY + 14, dir: 1, sail: true, speed: 4, age: 3 }];
      study.memory.arcs['street-house'].progress = 3.5;
      shot(study, 'waterfront-' + h);
    });
    // Repeated complete days with normal admissions exercise spontaneous
    // choices, delayed Lunafreya availability, weather and the shared spawn cap.
    w = fresh(10); w.spawnT = 1; w.regulars = __dev.furnishedWorld({ random: random }).regulars; w.weatherT = 20;
    run(w, function () { return false; }, 3000);
    results.push('50-minute simulation soak with ordinary arrivals and weather');
  } finally { window.__world = original; }
  window.waterfrontFrames = frames;
  const result = { failures: Array.from(new Set(failures)), results: results, audits: audits, frames: Object.keys(frames) };
  if (result.failures.length) throw new Error(JSON.stringify(result));
  return result;
})();


