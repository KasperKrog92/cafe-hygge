(function () {
  'use strict';
  const original = __world, R = SIM._, F = SCENE.L.waterfront;
  const failures = [], frames = {};
  let seed = 725;
  const random = function () { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  function check(ok, msg) { if (!ok && failures.indexOf(msg) < 0) failures.push(msg); }
  try {
    const w = SIM.create({ random: random }); window.__world = w; __dev.hour(12);
    w.patrons = []; w.queue = []; w.counterCups = []; w.umbrellaStand = [];
    w.seats.forEach(function (s) { s.taken = false; });
    w.tables.forEach(function (t) { t.items = []; });
    w.regulars = {}; w.spawnT = 1e8; w.weatherT = 1e8; w.rain = w.rainTarget = 0;
    const p = __dev.spawn({ outdoor: false, wantsBook: true, ownBook: true, laptop: false, pianist: false });
    const q = __dev.spawn({ outdoor: false, wantsBook: true, ownBook: true, laptop: false, pianist: false });
    for (let t = 0; t < 180 && (p.state !== 'seated' || q.state !== 'seated'); t += 0.25) SIM.update(w, 0.25);
    check(p.state === 'seated' && q.state === 'seated', 'normal orders did not reach seating');
    const seats = [p.seat, q.seat];
    p.stay = q.stay = 500; w.waterfront.boats = [];
    const ship = __dev.ship({ x: 180, dir: 1 });
    const passer = __dev.passer({ x: 180, dir: 1, pause: false, umbrella: false });
    const seen = new Set(); let waved = false, watched = false;
    for (let t = 0; t < 110; t += 0.25) {
      SIM.update(w, 0.25);
      [p, q].forEach(function (guest) { seen.add(guest.state); });
      if (passer.shipWaveT > 0) waved = true;
      if (p.state === 'watchingShip' || q.state === 'watchingShip') watched = true;
      if (!frames.ship && (p.shipWave || q.shipWave)) frames.ship = __dev.shot();
      if (t % 10 === 0) failures.push.apply(failures, __dev.audit());
    }
    check(waved && watched, 'missing pavement/window reaction');
    check(seen.has('toShip') && seen.has('backFromShip'), 'incomplete window journey');
    check(p.seat === seats[0] && q.seat === seats[1], 'watchers lost their reserved seats');
    check(!p.shipWave && !q.shipWave, 'wave stuck after returning');
    check(Math.abs(ship.x - (180 + 110 * 2.6)) < 0.01, 'ship not elapsed-time driven');
    // Opposite heading and disposal, without advancing the café clock.
    w.waterfront.boats = []; const reverse = __dev.ship({x: 540, dir: -1});
    frames.reverse = __dev.shot();
    R.updateWaterfront(w, 1); check(Math.abs(reverse.x - 537.4) < 0.01, 'reverse movement failed');
    reverse.x = F.x0 - 79; R.updateWaterfront(w, 1);
    check(w.waterfront.boats.indexOf(reverse) < 0, 'ship was not disposed');
    w.waterfront.boats = []; w.waterfront.shipT = 0; w.daylight = 0;
    R.updateWaterfront(w, 0.25); check(!w.waterfront.boats.some(b => b.ship), 'ship spawned at night');
    w.daylight = 1; w.rain = 0; R.updateWaterfront(w, 0.25);
    check(w.waterfront.boats.some(b => b.ship), 'fair-weather scheduled passage failed');
    // Closing interrupts the watch and still uses ordinary departure cleanup.
    w.waterfront.boats[0].x = 220; w.waterfront.boats[0].watchers = 0;
    p.shipSeen = null; q.shipSeen = null;
    for (let t = 0; t < 80 && p.state !== 'watchingShip' && q.state !== 'watchingShip'; t += 0.25) SIM.update(w, 0.25);
    __dev.hour(21.5);
    for (let t = 0; t < 200; t += 0.25) SIM.update(w, 0.25);
    check(!w.patrons.includes(p) && !w.patrons.includes(q), 'closing left watchers behind');
    failures.push.apply(failures, __dev.audit());
  } finally { window.__world = original; window.shipFrames = frames; }
  if (failures.length) throw new Error(JSON.stringify(failures));
  return { failures, checks: 'normal orders, window round trips, reserved seats, waves, both directions, disposal, scheduling, closing' };
})();
