/* Run through agent-browser eval on a disposable ?dev tab (art-review.ps1 -Verify).
   Checks the review contract, not a golden image of the current art. */
(function () {
  'use strict';
  const failures = [];
  const live = window.__world, memory = MEMORY.state;
  const before = JSON.stringify({ memory: memory, audio: SND.settings });
  const time = live.t;
  const random = Math.random;
  let first, second;
  try {
    Math.random = function () { throw new Error('Art capture consumed simulation randomness'); };
    first = __dev.review(); second = __dev.review();
  } finally { Math.random = random; }
  Object.keys(first).forEach(function (key) {
    if (first[key] !== second[key]) failures.push('Non-repeatable image: ' + key);
    if (!/^data:image\/png;base64,/.test(first[key])) failures.push('Invalid PNG: ' + key);
  });
  if (live !== window.__world || memory !== MEMORY.state || time !== live.t ||
      before !== JSON.stringify({ memory: MEMORY.state, audio: SND.settings })) {
    failures.push('Review changed live clock, world, memory or audio');
  }
  // Empty furniture, every dining seat, both directions of every upholstered
  // chair, all four window perches, artist and pianist at both times.
  // Fresh production boot has no seats during unpacking. Explicit private
  // worlds keep the furnished and modest occupancy coverage independent of it.
  const layouts = [__dev.modestWorld({random:SIM.seededRandom(42)}),
    __dev.furnishedWorld({random:SIM.seededRandom(42)})];
  let occupancyScenarios = 0, occupiedSeats = 0;
  layouts.forEach(function (base) {
    const groups = [[]];
    for (let i=0;i<base.seats.length;i+=7) groups.push(base.seats.slice(i,i+7).map((s,j)=>i+j));
    [12, 20].forEach(function (hour) {
      groups.forEach(function (seats) {
        const w = __dev.study({ world: base, hour: hour, seats: seats });
        occupancyScenarios++; occupiedSeats += seats.length;
        failures.push.apply(failures, __dev.audit(w));
        __dev.shot(null, { world: w, scale: 1 });
      });
    });
  });
  if (layouts[0].seats.length !== 4 || layouts[1].seats.length < 18)
    failures.push('Occupancy fixtures lost the modest or furnished seat set');
  if (before !== JSON.stringify({ memory: MEMORY.state, audio: SND.settings }) || time !== live.t)
    failures.push('Private occupancy fixtures changed production state');
  // Canvas composition only: warm cache, no PNG encoding or presentation.
  const w = __dev.study({ world: layouts[1], hour: 20 });
  const canvas = document.createElement('canvas'); canvas.width = SCENE.W; canvas.height = SCENE.H;
  const g = canvas.getContext('2d'), durations = [];
  for (let i = 0; i < 120; i++) {
    const start = performance.now(); SCENE.composeFrame(g, w);
    if (i >= 20) durations.push(performance.now() - start);
  }
  durations.sort(function (a, b) { return a - b; });
  const result = { failures: failures, repeatableImages: Object.keys(first).length,
    occupancyScenarios: occupancyScenarios, occupiedSeats: occupiedSeats, liveAudit: __dev.audit(),
    composeMs: { median: durations[50], p95: durations[95] } };
  if (failures.length || result.liveAudit.length) throw new Error(JSON.stringify(result));
  return result;
})()
