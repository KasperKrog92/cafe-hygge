/* First opening, seat-aware admission, paired purchases and repair checkpoints. */
(function () {
  'use strict';
  const results=[],frames={};
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function until(w,fn,n){for(let t=0;t<(n||1800);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('timeout '+w.shop.phase);}
  function restore(w){return SIM.create({memory:MEMORY.createStore({state:MEMORY.codec.decode(MEMORY.codec.encode(w.memory)).state}),random:SIM.seededRandom(72)});}
  for(const seed of [1,42,84,107,351]) {
    const w=SIM.create({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');SIM.skipUnpacking(w);
    check(Math.abs(w.hour-17.5)<.001,'first opening must start at 17:30');
    check(w.patrons.length===0 && w.seats.length===4,'opening seating');
    const started=w.t,startedClock=w.t+w.clockOffset, seen=new Set(),arrivals=[];let peak=0;
    until(w,()=>!!SIM.holgerAvailable(w));
    const waiting=w.patrons[0],heldHour=w.hour,heldTime=w.t;
    tick(w,600);
    check(waiting.state==='ordering' && w.hour===heldHour && w.t===heldTime &&
      w.patrons.length===1 && !w.barista.orders.length,'mandatory greeting did not hold');
    const held=restore(w);
    check(held.patrons.length===1 && held.patrons[0].state==='ordering' &&
      !!SIM.holgerAvailable(held),'counter greeting not restored');
    __dev.greetHolger(w);
    until(w,()=>{
      peak=Math.max(peak,w.patrons.length);
      w.patrons.forEach(p=>{if(!seen.has(p.id)){seen.add(p.id);arrivals.push({at:w.t-started,name:p.name});}});
      check(w.patrons.length<=2,'new café overfilled');
      return w.shop.phase==='closing';
    },245);
    const serviceTime=w.t+w.clockOffset-startedClock;
    check(serviceTime>=239 && serviceTime<=241,'opening day length');
    check(arrivals[0].name==='Holger','neighbour was not first');
    for(let i=1;i<arrivals.length;i++)check(arrivals[i].at-arrivals[i-1].at>=89.5,'arrivals bunched');
    until(w,()=>w.shop.phase==='home');
    check(w.memory.life.daysCompleted===1,'completed day missing');
    check(w.memory.life.savings>=SIM.projects.window.price+SIM.projects.table.price,'first evening cannot fund both');
    const saved=restore(w);tick(saved,100);check(saved.memory.life.daysCompleted===1,'home reload counted day twice');
    results.push({seed,peak,arrivals,savings:w.memory.life.savings});
  }
  for(const first of ['window','table']) {
    let w=SIM.create({random:SIM.seededRandom(42)});
    SIM.setMode(w,'game');SIM.skipUnpacking(w);__dev.greetHolger(w);until(w,()=>w.shop.phase==='home');until(w,()=>SIM.homePlanRequired(w));SIM.plan(w,true);
    const before=w.memory.life.savings,second=first==='window'?'table':'window';
    check(SIM.buyProject(w,first),'first purchase failed');
    w=restore(w);SIM.plan(w,true);
    check(SIM.buyProject(w,second),'second purchase after reload failed');
    check(!SIM.buyProject(w,first)&&!SIM.buyPlant(w),'duplicate or extra purchase');
    check(w.memory.life.savings===before-90,'incorrect debit');
    SIM.goToSleep(w);
    until(w,()=>w.memory.life.projects.window.stage==='working');
    check(w.hour<12,'ordinary morning did not resume');
    check(w.seats.length===4,'table seats enabled before assembly');
    frames['worker-'+first]=__dev.shot(null,{world:w});
    for(let step=0;step<4;step++) {
      until(w,()=>w.memory.life.projects.window.step===step && w.memory.life.projects.window.time>=4);
      const p=JSON.stringify(w.memory.life.projects.window),funds=w.memory.life.savings;
      w=restore(w);
      check(JSON.stringify(w.memory.life.projects.window)===p && w.memory.life.savings===funds,'repair checkpoint lost');
    }
    until(w,()=>w.memory.life.projects.window.stage==='installed' && w.memory.life.projects.table.stage==='installed');
    until(w,()=>!w.windowWorker);
    check(w.seats.length===6,'new table not usable');
    check(SCENE.windowOpen(w,SCENE.L.win) && !SCENE.windowOpen(w,SCENE.L.win2),'repair affected wrong window');
    check(SCENE.windowLight(w,SCENE.L.win2).strength===0,'boarded right window leaks sunlight');
    check(__dev.audit(w).length===0,'completed café audit');
    frames['finished-'+first]=__dev.shot(null,{world:w});
    w=restore(w);check(w.seats.length===6 && SCENE.windowOpen(w,SCENE.L.win),'installed reload');
  }
  // A mature café still needs actual seating, including guests waiting to sit.
  let repair=__dev.modestWorld();SIM.setMode(repair,'game');until(repair,()=>repair.shop.phase==='home');
  SIM.plan(repair,true);check(SIM.buyProject(repair,'window'),'overnight repair purchase');SIM.goToSleep(repair);
  until(repair,()=>repair.memory.life.projects.window.stage==='working' && repair.memory.life.projects.window.time>=4);
  const partial=JSON.stringify(repair.memory.life.projects.window);
  repair.clockOffset+=(21.5-repair.hour)/24*SIM._.DAY_SECONDS;SIM.update(repair,0);
  until(repair,()=>repair.shop.phase==='home');
  check(JSON.stringify(repair.memory.life.projects.window)===partial && !repair.windowWorker,'worker did not stop for closing');
  repair=restore(repair);SIM.goToSleep(repair);
  until(repair,()=>repair.memory.life.projects.window.stage==='installed');
  check(SCENE.windowOpen(repair,SCENE.L.win),'overnight repair never resumed');
  // Older small saves may be home without ever having taken the introduction.
  const oldHome=MEMORY.codec.decode(MEMORY.codec.encode(repair.memory)).state;
  oldHome.flags={};oldHome.life.hour=22;
  let returning=SIM.create({memory:MEMORY.createStore({state:oldHome})});
  SIM.withWorld(returning,()=>SIM._.enterHome(returning));returning=restore(returning);SIM.setMode(returning,'game');SIM.goToSleep(returning);
  const visits=returning.memory.bonds.holger.visits;
  until(returning,()=>!!SIM.holgerAvailable(returning));
  check(returning.memory.bonds.holger.visits===visits && returning.patrons[0].state==='ordering','unfinished older greeting lost or counted twice');
  const crowded=__dev.modestWorld();crowded.memory.life.daysCompleted=12;
  const existing=crowded.patrons.length;
  crowded.seats.forEach(s=>{s.taken=true;});crowded.memory.bonds.holger={visits:1};
  for(let i=0;i<100;i++){crowded.spawnT=0;SIM._.updateSpawning(crowded,.25);}
  check(crowded.patrons.length===existing,'full room admitted waiting guests');
  window.lifeFrames=frames;
  return {results,checks:['short opening','spaced arrivals','seat cap','paired purchases','repair reloads','six usable seats','left-only light','audit']};
})();
