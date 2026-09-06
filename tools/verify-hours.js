/* Run with agent-browser eval in a disposable ?dev session. Real simulations,
   never art studies. Covers busy closing, perches, repeated days and saves. */
(function () {
  'use strict';
  const original = window.__world, random = Math.random;
  let seed = 6137;
  const results = [], failures = [], frames = {};
  function check(ok, message) { if (!ok) failures.push(message); }
  Math.random = function () { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  try {
    ['empty', 'busy', 'topShelf', 'piano'].forEach(function (scenario) {
      const w = SIM.create(); window.__world = w;
      if (scenario === 'busy') {
        __dev.spawn({ couple: true, umbrella: true, ownBook: true });
        __dev.spawn({ laptop: true, umbrella: true });
        __dev.spawn({ wantsBook: true, ownBook: false });
        __dev.spawn({ pianist: true });
        __dev.ff(100); __dev.doze(); __dev.catDo('lap'); __dev.ff(15);
      } else if (scenario !== 'empty') { __dev.catDo(scenario); __dev.ff(30); }
      // A pending invitation must survive every automatic transition.
      __dev.arc('gerda-scarf', { ready: true });
      const arcBefore = JSON.stringify(w.memory.arcs['gerda-scarf']);
      __dev.hour(21.5);
      let closed = false, reopened = false, early = false, elapsed = 0;
      const phases = [], audits = [];
      const storyBefore = w.memory.arcs['lunafreya-paintings'].progress;
      for (let i = 0; i < 4800; i++) {
        SIM.update(w, 0.25); elapsed += 0.25;
        const s = w.shop;
        if (!phases.length || phases[phases.length - 1] !== s.phase) phases.push(s.phase);
        if (s.phase === 'night') {
          closed = true;
          check(!w.patrons.length && !w.queue.length && !w.counterCups.length && !w.umbrellaStand.length, scenario + ': orphaned service at night');
          check(w.tables.every(function (t) { return !t.items.length && !t.candle && !t.cake; }), scenario + ': untidied table');
        }
        if (s.phase === 'opening' && w.patrons.length) early = true;
        if (scenario === 'busy') {
          const key = s.phase === 'closing' && s.carryingCat ? 'carrying' :
            s.phase === 'closing' && s.curtains[0] > 0 && s.curtains[0] < 1 ? 'curtains' :
            s.phase === 'opening' && s.accepting && w.patrons.length ? 'early-guests' : s.phase;
          if (!frames[key]) frames[key] = __dev.shot();
        }
        if (i % 80 === 0) audits.push.apply(audits, __dev.audit());
        if (closed && s.phase === 'open') { reopened = true; break; }
      }
      check(reopened, scenario + ': did not reopen');
      check(early, scenario + ': no guests during opening');
      check(JSON.stringify(w.memory.arcs['gerda-scarf']) === arcBefore, scenario + ': pending story changed');
      const progress = w.memory.arcs['lunafreya-paintings'].progress - storyBefore;
      check(Math.abs(progress - elapsed / SIM._.DAY_SECONDS) < 0.00001, scenario + ': skipped hours advanced story');
      check(!audits.length, scenario + ': ' + audits.join('; '));
      check(w.tables.slice(0, SCENE.L.tables.length).every(function (t) { return t.cake; }), scenario + ': missing morning cakes');
      results.push({ scenario: scenario, seconds: elapsed, phases: phases, earlyGuests: early, auditProblems: audits.length });
    });
    // Natural clock repeats: no dev time jumps between two full overnight runs.
    const w = SIM.create(); window.__world = w; __dev.hour(21.5);
    let nights = 0, previous = 'open';
    for (let i = 0; i < 16000; i++) {
      SIM.update(w, 0.25);
      if (w.shop.phase === 'night' && previous !== 'night') nights++;
      previous = w.shop.phase;
      if (nights === 2 && w.shop.phase === 'open') break;
    }
    check(nights === 2 && w.shop.phase === 'open', 'natural clock did not complete two nights');
    failures.push.apply(failures, __dev.audit());
    results.push({ naturalNights: nights, hour: w.hour, phase: w.shop.phase });
    window.hoursFrames = frames;
  } finally { Math.random = random; window.__world = original; }
  if (failures.length) throw new Error(JSON.stringify({ failures: failures, results: results }));
  return { results: results, failures: failures, frames: Object.keys(frames) };
})();
