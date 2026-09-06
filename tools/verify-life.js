/* Shared life regression: real dt-driven worlds, durable stage round trips. */
(function () {
  'use strict';
  const frames = {}, saves = {}, results = [];
  function check(ok, message) { if (!ok) throw Error(message); }
  function tick(w,seconds) { for(let t=0;t<seconds;t+=.25) SIM.update(w,.25); }
  function until(w,fn,limit) {
    for(let t=0;t<(limit||1800);t+=.25) { if(fn()) return; SIM.update(w,.25); }
    throw Error('timed out: '+w.shop.phase+' / '+w.memory.life.plant.stage);
  }
  function snap(w,name) { frames[name]=__dev.shot(null,{world:w}); saves[name]=MEMORY.codec.encode(w.memory); }
  for(const mode of ['idle','game']) {
    const w=SIM.create({random:SIM.seededRandom(42)}), cat=w.cat, nora=w.barista;
    SIM.setMode(w,mode);
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
    const phases=[]; let nights=0, prior='open';
    until(w,()=>{
      if(w.shop.phase!==prior) { phases.push(w.shop.phase); if(w.shop.phase==='home') nights++; prior=w.shop.phase; }
      check(w.cat===cat && w.barista===nora,'replaced Nora or cat');
      if(mode==='game' && w.shop.phase==='home') {
        const hour=w.hour;
        tick(w,20);
        for(let t=0;t<240;t+=.25) {
          const positions=[nora,cat].map(e=>({x:e.x,y:e.y}));
          SIM.update(w,.25);
          [nora,cat].forEach((e,i)=>{
            check(Math.hypot(e.x-positions[i].x,e.y-positions[i].y)<16,'home loop teleported');
            check(e.x>SCENE.L.home.entry.x+50,'home loop revisited entrance');
          });
        }
        check(w.shop.phase==='home' && w.hour===hour,'game evening advanced unattended');
        check(SIM.goToSleep(w),'sleep rejected');
        check(!SIM.goToSleep(w),'duplicate sleep accepted');
        check(Math.abs(w.hour-7.5)<1e-8 && w.shop.phase==='dawn','sleep did not start morning');
      }
      return nights===3 && w.shop.phase==='open';
    },6000);
    check(w.memory.life.plant.stage==='available','unattended purchase');
    check(!__dev.audit(w).length,'unattended audit');
    results.push({mode,nights,phases});
  }
  const w=SIM.create({random:SIM.seededRandom(61)}), cat=w.cat;
  w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
  until(w,()=>w.shop.phase==='home');
  SIM.setMode(w,'game'); SIM.plan(w,true); tick(w,20); snap(w,'home-pc');
  tick(w,30); snap(w,'home-reading');
  const funds=w.memory.life.savings, story=JSON.stringify(w.memory.arcs);
  check(SIM.buyPlant(w),'first purchase rejected');
  check(!SIM.buyPlant(w),'duplicate purchase accepted');
  check(w.memory.life.savings===funds-30,'price incorrect'); snap(w,'purchased');
  tick(w,120); check(w.shop.phase==='home','planner did not linger');
  for(let i=0;i<10;i++) { const t=w.t, hour=w.hour; SIM.setMode(w,'idle'); SIM.setMode(w,'game');
    check(w.t===t&&w.hour===hour&&w.cat===cat,'mode changed world'); }
  check(w.memory.life.savings===funds-30,'mode charged again');
  SIM.plan(w,false);
  tick(w,180); check(w.shop.phase==='home','closing notebook started morning');
  check(SIM.goToSleep(w),'planned sleep rejected');
  const stages=['scheduled','carry','unpack','place','installed'];
  for(const stage of stages) {
    until(w,()=>w.memory.life.plant.stage===stage);
    if(stage==='unpack'||stage==='place') tick(w,1.5);
    snap(w,stage);
    if(stage==='unpack'||stage==='place') check(w.barista.x===SCENE.L.firstPlant.work.x && w.barista.y===SCENE.L.firstPlant.work.y,'plant worked from wrong location');
    check(!__dev.audit(w).length,stage+' audit');
    const before=w.memory.life.savings;
    const restored=SIM.create({memory:MEMORY.createStore({state:JSON.parse(saves[stage])}),random:SIM.seededRandom(72)});
    check(restored.memory.life.plant.stage===stage,'reload changed stage '+stage);
    check(restored.memory.life.savings===before,'reload changed funds');
    until(restored,()=>restored.shop.phase==='open'&&restored.memory.life.plant.stage==='installed',1200);
    check(restored.memory.life.savings===before,'reload charged again');
    check(!__dev.audit(restored).length,'restored '+stage+' audit');
    check(SCENE.plantDrawables(restored).length===1,'duplicate plant');
  }
  until(w,()=>w.shop.phase==='open'); snap(w,'cafe-installed');
  const plantBefore=JSON.stringify(w.memory.life.plant);
  until(w,()=>w.shop.phase==='home'); SIM.setMode(w,'game'); SIM.plan(w,true);
  check(!SIM.buyPlant(w),'second evening purchase'); SIM.plan(w,false);
  SIM.goToSleep(w);
  until(w,()=>w.shop.phase==='open');
  check(JSON.stringify(w.memory.life.plant)===plantBefore,'repeated installation');
  until(w,()=>w.shop.phase==='home');
  SIM.setMode(w,'idle');
  check(!SIM.goToSleep(w),'idle sleep accepted');
  until(w,()=>w.shop.phase==='open');
  const old=MEMORY.codec.fresh(); delete old.life; old.version=1; old.flags.kept=true;
  old.arcs.kept={stage:2,progress:4,pendingBeat:'finished'};
  const migrated=MEMORY.codec.decode(JSON.stringify(old));
  check(!migrated.error&&migrated.state.flags.kept&&migrated.state.arcs.kept.stage===2&&migrated.state.life.savings===30,'v1 migration');
  window.lifeFrames=frames; window.lifeSaves=saves;
  return {results,stages,repeatPurchase:false,repeatPlacement:false,migration:true,frames:Object.keys(frames)};
})();
