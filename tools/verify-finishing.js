/* Finishing the room: the improvements that bring the saved café up to the
   room the idle café has always shown. Each is offered at the right moment
   and never in a room that already has it, charged once, carried out by the
   right person in saved phases that survive closing and reload, and its
   result joins the room with nothing left at the work site. */
(function(){
  'use strict';
  const frames=window.finishingFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function until(w,fn,why,limit){for(let t=0;t<(limit||4000);t+=.25){if(fn())return;SIM.update(w,.25);}
    throw Error('timeout: '+why+' '+JSON.stringify({phase:w.shop.phase,hour:w.hour,b:w.barista.state}));}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function audit(w,id){const a=__dev.audit(w);check(!a.length,id+' audit: '+a.join('; '));}
  function snap(w,id,crop){audit(w,id);frames[id]=__dev.shot(crop||null,{world:w});}
  function toHome(w){w.clockOffset+=(21.5-w.hour)/24*R.DAY_SECONDS;until(w,()=>w.shop.phase==='home','closing');}
  function done(l,id){const d=IMPROVEMENTS.all[id];l.projects[id]={stage:'installed',step:d.phaseIds.length,time:0};}
  function fresh(ids){
    const w=__dev.modestWorld({random:SIM.seededRandom(42)});SIM.setMode(w,'game');w.memory.life.savings=500;
    (ids||[]).forEach(id=>done(w.memory.life,id));R.installProjects(w);return w;
  }
  // Buy one improvement in the evening and sleep through to the morning.
  function buyAndWake(w,id){
    toHome(w);SIM.plan(w,true);
    check(SIM.buyProject(w,id),id+' purchase');
    const balance=w.memory.life.savings;
    check(!SIM.buyProject(w,id),id+' charged twice');
    w=restore(w);SIM.setMode(w,'game');
    check(w.memory.life.savings===balance&&w.memory.life.projects[id].stage==='purchased',id+' purchase lost on reload');
    check(SIM.goToSleep(w),'bedtime');until(w,()=>w.shop.phase==='open','morning');
    return w;
  }
  // Every phase of a job survives a reload at its partial point.
  function eachPhaseReloads(w,id){
    const n=IMPROVEMENTS.all[id].phaseIds.length;
    for(let step=w.memory.life.projects[id].step;step<n;step++){
      until(w,()=>{const p=w.memory.life.projects[id];return p.step===step&&p.stage==='working'&&p.time>=7;},id+' phase '+step);
      const keep=JSON.stringify(w.memory.life.projects[id]);
      w=restore(w);
      check(JSON.stringify(w.memory.life.projects[id])===keep,id+' phase '+step+' lost on reload');
    }
    until(w,()=>w.memory.life.projects[id].stage==='installed',id+' finish');
    return w;
  }

  /* ---------- the right window ---------- */
  let w=fresh();
  toHome(w);SIM.plan(w,true);
  check(!IMPROVEMENTS.offered(w,'window2'),'right window offered before the left is repaired');
  check(!SCENE.windowOpen(w,L.win2),'right window open before any repair');
  w=fresh(['window']);
  check(IMPROVEMENTS.offered(w,'window2'),'right window not offered after the left');
  check(!IMPROVEMENTS.offered(w,'drapes'),'curtains offered with one window still boarded');
  const furnished=__dev.furnishedWorld();
  check(!IMPROVEMENTS.offered(furnished,'window2')&&!IMPROVEMENTS.offered(furnished,'drapes'),'offered in a room that already has them');
  check(SCENE.windowOpen(furnished,L.win2)&&SCENE.curtainStage(furnished,1)===2,'the furnished room lost its windows or curtains');
  const corner=JSON.stringify(L.catCorner);
  w=buyAndWake(w,'window2');
  until(w,()=>w.windowWorker&&w.windowWorker.project==='window2','Tomas comes');
  check(!SIM.visitorActors(w).some(a=>a.visitorId==='tomas'&&a!==w.windowWorker),'two Tomases');
  until(w,()=>w.memory.life.projects.window2.stage==='working'&&w.memory.life.projects.window2.step===2,'boards off');
  snap(w,'right-window-working',{x:420,y:40,w:240,h:260,scale:2});
  w=eachPhaseReloads(w,'window2');
  check(SCENE.windowOpen(w,L.win2)&&SCENE.windowOpen(w,L.win),'right window did not open');
  check(JSON.stringify(L.catCorner)===corner&&SCENE.hasFurniture(w,'cat-corner'),'the cat corner moved');
  until(w,()=>!w.windowWorker,'Tomas leaves');
  snap(w,'right-window-done');
  checks.push('right window: offered after the left, charged once, Tomas works four saved phases, the cat corner stays');

  /* ---------- the cat's sills ---------- */
  check(SCENE.catSpotAvailable(w,'window1')&&SCENE.catSpotAvailable(w,'window2'),'the sills are not open to the cat');
  const boarded=fresh();
  check(!SCENE.catSpotAvailable(boarded,'window1')&&!SCENE.catSpotAvailable(boarded,'window2'),'the cat sits on a boarded sill');
  checks.push('the cat has the sill of a repaired window only');

  /* ---------- the curtains ---------- */
  check(IMPROVEMENTS.offered(w,'drapes'),'curtains not offered with both windows open');
  w=buyAndWake(w,'drapes');
  check(SCENE.curtainStage(w,0)===0&&SCENE.curtainStage(w,1)===0,'curtains before anyone hung them');
  until(w,()=>{const a=w.windowWorker;return a&&a.project==='drapes'&&a.state==='working'&&a.mantelLift===L.projects.drapes.ladderHeight&&w.memory.life.projects.drapes.time>=7;},'up the ladder');
  check(SCENE.curtainStage(w,0)===1&&SCENE.curtainStage(w,1)===0,'the first rail goes up first');
  snap(w,'curtains-rail',{x:100,y:30,w:300,h:240,scale:2});
  until(w,()=>SCENE.curtainStage(w,0)===2,'left curtains');
  snap(w,'curtains-left',{x:100,y:30,w:300,h:240,scale:2});
  w=eachPhaseReloads(w,'drapes');
  check(SCENE.curtainStage(w,0)===2&&SCENE.curtainStage(w,1)===2&&SCENE.hasFurniture(w,'drapes'),'curtains not hung');
  until(w,()=>!w.windowWorker,'Tomas leaves');
  // Lunafreya draws them at closing and opens them in the morning.
  w.clockOffset+=(21.5-w.hour)/24*R.DAY_SECONDS;
  until(w,()=>w.shop.curtains[0]===1&&w.shop.curtains[1]===1,'drawn at closing');
  snap(w,'curtains-drawn');
  until(w,()=>w.shop.phase==='home','home');
  check(SIM.goToSleep(w),'bedtime');until(w,()=>w.shop.phase==='open','morning');
  check(w.shop.curtains[0]===0&&w.shop.curtains[1]===0,'curtains not opened in the morning');
  snap(w,'curtains-morning');
  checks.push('curtains: only with both windows open, rail then cloth, drawn at closing and opened in the morning');

  /* ---------- closing mid-job ---------- */
  w=fresh(['window']);
  w=buyAndWake(w,'window2');
  until(w,()=>w.memory.life.projects.window2.stage==='working','work begins');
  toHome(w);
  check(!w.windowWorker,'Tomas stayed for the night');
  check(w.memory.life.projects.window2.stage==='working','the job was lost at closing');
  check(SIM.goToSleep(w),'bedtime');
  until(w,()=>w.memory.life.projects.window2.stage==='installed','resumes next morning');
  checks.push('a job left at closing resumes the next morning');

  /* ---------- the front tables ---------- */
  function opened(ids){
    const o=fresh(ids);const l=o.memory.life;done(l,'expansion');l.room='full';R.installProjects(o);return o;
  }
  const room={x:0,y:36,w:960,h:540,scale:1};
  w=fresh(['window']);
  ['tableLeft','tableRight','rugs'].forEach(id=>check(!IMPROVEMENTS.offered(w,id),id+' offered in the small room'));
  ['tableLeft','tableRight','rugs'].forEach(id=>check(!IMPROVEMENTS.offered(furnished,id),id+' offered in a furnished room'));
  w=opened(['window']);
  [['tableLeft',2],['tableRight',3]].forEach(function(pair){
    const id=pair[0],T=L.tables[pair[1]],tables=w.tables.length,seats=w.seats.length;
    check(IMPROVEMENTS.offered(w,id),id+' not offered in the opened room');
    w=buyAndWake(w,id);
    until(w,()=>w.deliveryVisitor&&w.deliveryVisitor.delivers===id,id+': Keira comes');
    until(w,()=>w.memory.life.projects[id].stage==='arrived',id+': kit set down');
    check(w.tables.length===tables&&w.seats.length===seats,id+': usable before it is built');
    until(w,()=>w.memory.life.projects[id].step===3,id+': half built');
    snap(w,id+'-assembly',room);
    w=eachPhaseReloads(w,id);
    check(w.tables.filter(t=>t.furniture===T.furniture).length===1&&w.seats.filter(s=>s.furniture===T.furniture).length===2,id+': table or seats missing or doubled');
    const again=restore(w);
    check(again.tables.filter(t=>t.furniture===T.furniture).length===1&&again.seats.filter(s=>s.furniture===T.furniture).length===2,id+': doubled on reload');
    audit(w,id+' installed');
  });
  checks.push('front tables: only in the opened room, Keira delivers, assembly saves each phase, two seats each after the last, once');

  /* ---------- the rugs ---------- */
  check(IMPROVEMENTS.offered(w,'rugs'),'rugs not offered in the opened room');
  check(SCENE.rugStage(w)===0&&!SCENE.catSpotAvailable(w,'bigRug'),'a rug before it was bought');
  w=buyAndWake(w,'rugs');
  until(w,()=>w.memory.life.projects.rugs.stage==='arrived','rugs set down');
  snap(w,'rugs-delivered',room);
  until(w,()=>{const p=w.memory.life.projects.rugs;return p.stage==='working'&&p.step===0&&p.time>=6;},'hearth rug unrolling');
  snap(w,'rugs-hearth',room);
  until(w,()=>{const p=w.memory.life.projects.rugs;return p.step===1&&p.time>=6;},'big rug unrolling');
  check(SCENE.rugStage(w)===1,'the hearth rug should be flat while the big one unrolls');
  snap(w,'rugs-big',room);
  w=eachPhaseReloads(w,'rugs');
  check(SCENE.rugStage(w)===2&&SCENE.catSpotAvailable(w,'bigRug'),'rugs not down');
  until(w,()=>w.barista.state!=='projectHome','she goes back to the counter');
  snap(w,'rugs-done',room);
  checks.push('rugs: rolled by the hearth, unrolled one at a time from where they lie, then the cat has the big one');

  /* ---------- the chalkboard ---------- */
  ['menuBoard','crockery','secondChair'].forEach(id=>check(!IMPROVEMENTS.offered(furnished,id),id+' offered in a furnished room'));
  check(!IMPROVEMENTS.offered(fresh(['window']),'menuBoard'),'chalkboard offered behind the partition');
  check(IMPROVEMENTS.offered(w,'menuBoard'),'chalkboard not offered in the opened room');
  w=buyAndWake(w,'menuBoard');
  until(w,()=>w.memory.life.projects.menuBoard.stage==='arrived','board set down');
  snap(w,'board-delivered',room);
  until(w,()=>{const p=w.memory.life.projects.menuBoard;return p.stage==='working'&&p.step===1&&p.time>=3;},'board hung');
  snap(w,'board-blank',room);
  w=eachPhaseReloads(w,'menuBoard');
  check(SCENE.hasFurniture(w,'wall-menu'),'no board');
  // She can go and doodle on it from the short counter, and come back.
  w.barista.forcedTask='chalk';
  until(w,()=>w.barista.state==='chalkWalk','walks to the board',1200);
  for(let t=0;t<60;t+=.25){SIM.update(w,.25);audit(w,'chalk walk');}
  snap(w,'board-done',room);
  checks.push('chalkboard: past the partition only, leaning then blank then chalked, and she can reach it to doodle');

  /* ---------- the crockery shelves ---------- */
  check(IMPROVEMENTS.offered(w,'crockery'),'shelves not offered in the opened room');
  w=buyAndWake(w,'crockery');
  until(w,()=>{const p=w.memory.life.projects.crockery;return p.stage==='working'&&p.step===1&&p.time>=9&&w.windowWorker&&w.windowWorker.mantelLift===L.projects.crockery.ladderHeight;},'upper shelf up');
  snap(w,'shelves-bare',{x:600,y:60,w:300,h:260,scale:2});
  w=eachPhaseReloads(w,'crockery');
  check(SCENE.hasFurniture(w,'back-shelves')&&!SCENE.fullCounter(w),'shelves changed the menu or never came');
  until(w,()=>!w.windowWorker,'Tomas leaves');
  snap(w,'shelves-done',{x:600,y:60,w:300,h:260,scale:2});
  checks.push('crockery shelves: Tomas fits two boards then sets them out; the menu stays what the counter serves');

  /* ---------- the second chair ---------- */
  done(w.memory.life,'bookshelf');done(w.memory.life,'readingChair');R.installProjects(w);
  check(IMPROVEMENTS.offered(w,'secondChair'),'second chair not offered after the first');
  const chairs=w.seats.filter(s=>s.armchair).length;
  w=buyAndWake(w,'secondChair');
  until(w,()=>w.memory.life.projects.secondChair.stage==='arrived','chair set down');
  check(w.seats.filter(s=>s.armchair).length===chairs,'a seat before it is unwrapped');
  snap(w,'chair-wrapped',{x:240,y:190,w:300,h:170,scale:2});
  w=eachPhaseReloads(w,'secondChair');
  check(w.seats.filter(s=>s.armchair).length===chairs+1&&w.tables.filter(t=>t.furniture==='fireside').length===1,'second chair seat or table');
  const reread=restore(w);
  check(reread.tables.filter(t=>t.furniture==='fireside').length===1&&reread.seats.filter(s=>s.furniture==='fireside').length===1,'doubled on reload');
  snap(w,'chair-done',{x:240,y:190,w:300,h:170,scale:2});
  checks.push('second chair: after the first, wrapped then unwrapped, one seat and side table, once');

  return {checks};
})()
