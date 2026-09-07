/* Modest/furnished layout, real autonomous service and all three improvements. */
(function () {
  'use strict';
  const frames={},saves={},results=[],L=SCENE.L;
  function check(ok,message) { if(!ok) throw Error(message); }
  function audit(w) { const errors=__dev.audit(w);check(!errors.length,errors.join('; ')); }
  function until(w,done,limit) {
    for(let t=0;t<(limit||3000);t+=.25) {
      if(done())return;
      if(w.c0Quiet) {
        w.spawnT=1e9;
        Object.values(w.regulars).forEach(r=>{r.day=SIM._.dayIndex(w);r.hour=23;r.force=false;});
      }
      SIM.update(w,.25);
    }
    throw Error('C0 timeout: '+w.shop.phase+'/'+w.barista.state);
  }
  function hour(w,h) { w.clockOffset+=(h-w.hour)/24*SIM._.DAY_SECONDS;SIM.update(w,0); }
  function snapshot(w,name) { audit(w);saves[name]=MEMORY.codec.encode(w.memory);frames[name]=__dev.shot(null,{world:w}); }
  function home(w) { SIM.setMode(w,'game');hour(w,21.5);until(w,()=>w.shop.phase==='home');SIM.plan(w,true); }
  function shape(w) {
    const installed=w.memory.life.projects.table.stage==='installed';
    check(w.tables.length===(installed?3:2)&&w.seats.length===(installed?6:4),'wrong small-room capacity');
    check(w.tables.every(t=>SCENE.hasFurniture(w,t.furniture)),'absent table');
    check(w.seats.every(s=>SCENE.hasFurniture(w,s.furniture)),'absent seat');
    check(!w.patrons.some(p=>p.hasShelfBook||p.outside||['browse','fetchBook','toEasel'].includes(p.state)),'absent activity');
    check(SCENE.catSpotAvailable(w,(w.cat.target||{}).id||''),'absent cat destination');
    check(!w.barista.state.startsWith('piano'),'Nora seeks missing piano');
  }
  // Exercise all installed subsets, including interleaved private worlds;
  // no shared navigation/background cache may leak the other room's layout.
  for(let mask=0;mask<8;mask++) {
    const state=MEMORY.codec.fresh();
    if(mask&1)state.life.plant.stage='installed';
    if(mask&2)state.life.projects.table={stage:'installed',step:6,time:0};
    if(mask&4)state.life.projects.fireplace={stage:'installed',step:4,time:0};
    const w=__dev.modestWorld({memory:MEMORY.createStore({state}),random:SIM.seededRandom(90+mask)});
    const full=__dev.furnishedWorld({random:SIM.seededRandom(90+mask)});
    for(let n=0;n<4800;n++) {
      SIM.update(w,.25);SIM.update(full,.25);
      if(n%240===0) { shape(w);audit(w); }
    }
    shape(w);audit(w);audit(full);
    check(w.memory.life.savings>30,'no ordinary sales');
    results.push({mask,sales:w.memory.life.savings-30,seats:w.seats.length});
    if(mask===0||mask===7) {
      hour(w,12);snapshot(w,'c0-'+mask+'-day');
      hour(w,20);SIM._.snapCandles(w);snapshot(w,'c0-'+mask+'-night');
    }
  }
  // Choose, interrupt, close, reload and resume each project in the small room.
  // Disable unrelated arrivals only for the controlled interruption trace.
  for(const id of ['plant','table','fireplace']) {
    let w=__dev.modestWorld({random:SIM.seededRandom(143)});w.memory.life.savings=180;
    home(w);const before=w.memory.life.savings;
    check(id==='plant'?SIM.buyPlant(w):SIM.buyProject(w,id),'C0 purchase failed');
    check(!SIM.buyPlant(w)&&!SIM.buyProject(w,'table')&&!SIM.buyProject(w,'fireplace'),'duplicate purchase');
    check(w.memory.life.savings===before-(id==='table'?60:30),'wrong price');
    snapshot(w,'c0-'+id+'-purchased');SIM.goToSleep(w);snapshot(w,'c0-'+id+'-scheduled');
    const job=()=>id==='plant'?w.memory.life.plant:w.memory.life.projects[id];
    if(id!=='plant') {
      w.c0Quiet=true;
      until(w,()=>w.barista.state==='projectWork');
      SIM.update(w,.5);snapshot(w,'c0-'+id+'-working');
      const progress=JSON.stringify(job()),funds=w.memory.life.savings;
      SIM.setMode(w,'idle');SIM.setMode(w,'game');
      check(JSON.stringify(job())===progress&&w.memory.life.savings===funds,'mode changed work');
      const guest=SIM._.makePatron(w,'Signe');guest.wantsBook=false;guest.ownBook=true;guest.outdoor=false;
      SIM._.enqueueArrival(w,guest,0,true);
      let queued=null,returned=null;
      until(w,()=>{
        if(w.queue.length&&queued===null)queued=w.t;
        if(queued!==null&&w.barista.state==='projectHome'&&returned===null)returned=w.t;
        return guest.state==='seated';
      },240);
      check(returned!==null&&returned-queued<=3.5,'work did not yield to service');
      check(w.memory.life.savings===funds+1,'served cup credited incorrectly');
      until(w,()=>w.barista.state==='projectWork');SIM.update(w,.5);
      home(w);snapshot(w,'c0-'+id+'-partial-home');
      const raw=MEMORY.codec.encode(w.memory),saved=JSON.stringify(job());
      w=__dev.modestWorld({memory:MEMORY.createStore({state:JSON.parse(raw)}),random:SIM.seededRandom(144)});
      check(JSON.stringify(job())===saved,'partial work lost on restore');
      SIM.goToSleep(w);SIM.setMode(w,'idle');
    }
    until(w,()=>job().stage==='installed',6500);
    until(w,()=>w.shop.phase==='open'&&w.barista.state==='idle',600);
    shape(w);snapshot(w,'c0-'+id+'-installed');
    check(id!=='fireplace'||w.fire.level>0,'clean hearth stayed cold');
  }
  window.c0Frames=frames;window.c0Saves=saves;
  return {passed:true,layouts:results,reloadFixtures:Object.keys(saves)};
})()
