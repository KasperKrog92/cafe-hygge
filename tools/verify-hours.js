/* Run with agent-browser eval in a disposable ?dev session. Real simulations,
   never art studies. Covers busy closing, perches, repeated days and saves. */
(function () {
  'use strict';
  const original = window.__world;
  let seed = 6137;
  const results = [], failures = [], frames = {};
  function check(ok, message) { if (!ok) failures.push(message); }
  const random = function () { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  try {
    ['empty', 'busy', 'topShelf', 'piano'].forEach(function (scenario) {
      const w = __dev.furnishedWorld({ random: random }); window.__world = w;
      // Remove boot's already-seated cast before adding the scenario's guests.
      // Otherwise the five forced arrivals overfill the seven-person café.
      w.patrons = []; w.queue = []; w.counterCups = []; w.umbrellaStand = [];
      w.seats.forEach(function (s) { s.taken = false; });
      w.tables.forEach(function (t) { t.items = []; });
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
      let closed = false, reopened = false, elapsed = 0;
      const phases = [], audits = [];
      const storyBefore = w.memory.arcs['lunafreya-paintings'].progress;
      for (let i = 0; i < 4800; i++) {
        SIM.update(w, 0.25); elapsed += 0.25;
        const s = w.shop;
        if (s.phase === 'closing') {
          if (s.task && s.task.kind === 'greet') check(w.barista.x >= SCENE.L.baristaExitX,
            scenario + ': goodnight sent Lunafreya out of the counter area');
          if (s.curtains[0] > 0) check(s.curtains[1] === 1,
            scenario + ': closing crossed to the left window before finishing the right');
          if (s.curtains[1] > 0) check(w.barista.x < SCENE.L.baristaExitX,
            scenario + ': final closing round returned to the counter');
          if (s.carryingCat) check(w.barista.x <= SCENE.L.catCorner.noraSpot.x,
            scenario + ': Lunafreya doubled back toward the counter after collecting the cat');
          if (s.task && s.task.kind === 'hearth') check(s.curtains[1] === 1 && s.curtains[0] === 0,
            scenario + ': hearth was not handled between the right and left windows');
        }
        if ((s.phase === 'entering' || s.phase === 'opening') && !s.lights) {
          check(w.barista.x === SCENE.L.doorSpot.x && s.carryingCat,
            scenario + ': Lunafreya left the entrance or put down the cat before switching on the lights');
        }
        if (s.phase === 'opening' && w.barista.x >= SCENE.L.baristaExitX) {
          check(s.lights === 1 && s.curtains.every(function (n) { return n === 0; }) && !s.carryingCat,
            scenario + ': Lunafreya visited the counter before finishing the opening round');
        }
        if (!phases.length || phases[phases.length - 1] !== s.phase) phases.push(s.phase);
        if (s.phase === 'night') {
          closed = true;
          check(!w.patrons.length && !w.queue.length && !w.counterCups.length && !w.umbrellaStand.length, scenario + ': orphaned service at night');
          check(w.tables.every(function (t) { return !t.items.length && !t.candle && !t.cake; }), scenario + ': untidied table');
        }
        if (s.accepting) check(s.stocked && s.curtains.every(function (n) { return n === 0; }), scenario + ': admitted guests before the counter and room were ready');
        if (scenario === 'busy') {
          const key = s.phase === 'closing' && s.carryingCat ? 'carrying' :
            s.phase === 'closing' && s.curtains[0] > 0 && s.curtains[0] < 1 ? 'curtains' :
            s.phase === 'opening' && s.accepting && w.patrons.length ? 'early-guests' : s.phase;
          if (!frames[key]) frames[key] = __dev.shot();
        }
        if (i % 80 === 0) {
          const problems=__dev.audit();
          if(problems.length) problems.push(JSON.stringify({state:w.barista.state,x:w.barista.x,y:w.barista.y,path:w.barista.path}));
          audits.push.apply(audits,problems);
        }
        if (closed && s.phase === 'open') { reopened = true; break; }
      }
      check(reopened, scenario + ': did not reopen');
      check(w.shop.accepting && w.shop.stocked, scenario + ': counter not ready for guests');
      check(JSON.stringify(w.memory.arcs['gerda-scarf']) === arcBefore, scenario + ': pending story changed');
      const progress = w.memory.arcs['lunafreya-paintings'].progress - storyBefore;
      check(Math.abs(progress - elapsed / SIM._.DAY_SECONDS) < 0.00001, scenario + ': skipped hours advanced story');
      check(!audits.length, scenario + ': ' + audits.join('; '));
      check(w.tables.every(function (t) { return !t.cake; }), scenario + ': unexpected table cakes');
      results.push({ scenario: scenario, seconds: elapsed, phases: phases, auditProblems: audits.length });
    });
    // A late queue and dirty table must not wait on each other: queued guests
    // still require clearing before service while the shop is already closing.
    for (const terrace of [false, true]) {
      const w = __dev.furnishedWorld({random:SIM.seededRandom(84)}); window.__world = w;
      w.patrons=[];w.queue=[];w.counterCups=[];w.umbrellaStand=[];
      w.seats.forEach(s=>{s.taken=false;});w.tables.forEach(t=>{t.items=[];});
      w.barista.state='idle';w.barista.orders=[];w.barista.path=[];
      const guest=SIM._.makePatron(w,'Ellen');guest.ownBook=true;guest.wantsBook=false;guest.outdoor=false;
      SIM._.enqueueArrival(w,guest,0,true);
      if(terrace) Object.assign(w.waterfront.tables[0],{owner:null,dirty:true,cleaning:false,cup:'cup'});
      else w.tables[0].items.push({kind:'cup',owner:null,side:-1});
      __dev.hour(21.5);
      let served=false,closed=false;
      for(let i=0;i<4800;i++) {
        SIM.update(w,.25);
        if(guest.state==='seated')served=true;
        if(w.shop.phase==='home')closed=true;
        if(closed && w.shop.phase==='open')break;
      }
      check(served && closed && w.shop.phase==='open',
        (terrace?'terrace':'indoor')+': late queue and clearing deadlocked closing');
      failures.push.apply(failures,__dev.audit(w));
      results.push({lateQueue:true,terrace,served,closed,reopened:w.shop.phase==='open'});
    }
    // Natural clock repeats: no dev time jumps between two full overnight runs.
    const w = __dev.furnishedWorld({ random: random }); window.__world = w; __dev.hour(21.5);
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
  } finally { window.__world = original; }
  if (failures.length) throw new Error(JSON.stringify({ failures: failures, results: results }));
  return { results: results, failures: failures, frames: Object.keys(frames) };
})();
