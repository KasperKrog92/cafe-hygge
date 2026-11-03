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

  return {checks};
})()
