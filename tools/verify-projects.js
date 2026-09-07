/* Real service, interruptions, queued work, overnight carry and saved phases. */
(function () {
  'use strict';
  const frames={}, saves={}, results=[];
  function check(ok,msg) { if(!ok) throw Error(msg); }
  function tick(w,n) { for(let t=0;t<n;t+=.25) SIM.update(w,.25); }
  function until(w,fn,limit) {
    for(let t=0;t<(limit||2400);t+=.25) { if(fn()) return; SIM.update(w,.25); }
    throw Error('project timeout '+w.shop.phase+' '+w.barista.state+' '+JSON.stringify(w.memory.life.projects));
  }
  function hour(w,h) { w.clockOffset+=(h-w.hour)/24*SIM._.DAY_SECONDS; SIM.update(w,0); }
  function snap(w,name) { frames[name]=__dev.shot(null,{world:w}); saves[name]=MEMORY.codec.encode(w.memory); }
  function audit(w) { const a=__dev.audit(w); check(!a.length,a.join('; ')); }
  function home(w) { SIM.setMode(w,'game');hour(w,21.5);until(w,()=>w.shop.phase==='home');SIM.plan(w,true); }
  function restore(w) { return __dev.furnishedWorld({memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))}),random:SIM.seededRandom(84)}); }
  for(const id of ['table','fireplace']) {
    let w=__dev.furnishedWorld({random:SIM.seededRandom(id==='table'?84:42)});
    w.memory.life.savings=180;
    home(w); const funds=w.memory.life.savings;
    check(SIM.buyProject(w,id),'purchase rejected');
    check(!SIM.buyProject(w,id)&&!SIM.buyPlant(w),'same evening charged twice');
    check(w.memory.life.savings===funds-SIM.projects[id].price,'wrong debit');
    snap(w,id+'-purchased');
    tick(w,200);check(w.shop.phase==='home','game did not wait');
    SIM.goToSleep(w);snap(w,id+'-scheduled');
    until(w,()=>w.memory.life.projects[id].stage==='arrived');snap(w,id+'-arrived');
    until(w,()=>w.barista.state==='projectWork');tick(w,.5);
    snap(w,id+'-working');audit(w);
    const p=w.memory.life.projects[id], before=p.step*18+p.time;
    const state=w.barista.state, path=w.barista.path, fundsBeforeMode=w.memory.life.savings;
    SIM.setMode(w,'idle');SIM.setMode(w,'game');
    check(p.step*18+p.time===before && w.barista.state===state && w.barista.path===path &&
      w.memory.life.savings===fundsBeforeMode,'mode changed active work');
    // A real entrant arrives while Lunafreya is working, then orders and sits.
    const guest=SIM._.makePatron(w,'Signe');guest.wantsBook=false;guest.ownBook=true;guest.outdoor=false;
    SIM._.enqueueArrival(w,guest,0,true);
    let queuedAt=null,homeAt=null,progressAtQueue=null;
    until(w,()=>{
      if(w.queue.length && queuedAt===null) { queuedAt=w.t;progressAtQueue=p.step*18+p.time; }
      if(queuedAt!==null && w.barista.state==='projectHome' && homeAt===null) homeAt=w.t;
      return guest.state==='seated';
    },240);
    check(queuedAt!==null,'guest never queued');
    check(homeAt!==null && homeAt-queuedAt<=3.5,'order did not safely interrupt');
    check(p.step*18+p.time>=before,'work lost during order');
    results.push({id,interruptSeconds:homeAt-queuedAt,progressAtQueue});
    until(w,()=>w.barista.state==='projectWork' && p.stage==='working');
    tick(w,.5); const partial=p.step*18+p.time;
    hour(w,21.5);until(w,()=>w.shop.phase==='closing');snap(w,id+'-closing');
    until(w,()=>w.shop.phase==='home');
    check(p.step*18+p.time>=partial && p.step*18+p.time<=partial+3,'closing did extra work');
    snap(w,id+'-home');
    const held=JSON.stringify(p);tick(w,300);check(JSON.stringify(p)===held,'home advanced project');
    w=restore(w);check(JSON.stringify(w.memory.life.projects[id])===held,'reload lost partial job');
    SIM.setMode(w,'idle');until(w,()=>w.shop.phase==='dawn');snap(w,id+'-morning');
    let last='';
    until(w,()=>{
      const p=w.memory.life.projects[id], key=p.stage+'-'+p.step;
      if(key!==last && p.stage==='working' && w.barista.state==='projectWork') {
        last=key;snap(w,id+'-step-'+p.step);
      }
      return p.stage==='installed';
    },4500);
    until(w,()=>w.barista.state==='idle',120);snap(w,id+'-installed');audit(w);
    const tables=w.tables.length,seats=w.seats.length;
    for(let i=0;i<4;i++) { w=restore(w);SIM.setMode(w,'game');SIM.setMode(w,'idle');
      check(w.tables.length===tables && w.seats.length===seats,'duplicate installation'); }
    tick(w,3600);check(w.memory.life.projects[id].stage==='installed','unattended lost installation');
    check(w.tables.length===tables && w.seats.length===seats,'unattended duplicated installation');audit(w);
  }
  // Both purchased projects can coexist: one per evening, old work is retained.
  const w=__dev.furnishedWorld({random:SIM.seededRandom(16)});w.memory.life.savings=180;home(w);
  check(SIM.buyProject(w,'table'),'queue table');SIM.goToSleep(w);until(w,()=>w.barista.state==='projectWork');
  home(w);check(SIM.buyProject(w,'fireplace'),'queue fireplace');
  const funds=w.memory.life.savings;
  SIM.setMode(w,'idle');until(w,()=>Object.values(w.memory.life.projects).every(p=>p.stage==='installed'),7000);
  check(w.memory.life.savings>=funds,'queued work charged again');
  check(w.tables.filter(t=>t.project==='table').length===1&&w.seats.filter(s=>s.project==='table').length===2,'installed seat set');
  audit(w);snap(w,'both-installed');
  // Prove actual ordinary service can occupy a newly enabled seat.
  const guest=SIM._.makePatron(w,'Mikkel');guest.wantsBook=false;guest.ownBook=true;guest.outdoor=false;
  w.seats.filter(s=>s.project!=='table').forEach(s=>{s.taken=true;});
  SIM._.enqueueArrival(w,guest,0,true);until(w,()=>{
    w.seats.filter(s=>s.project!=='table').forEach(s=>{s.taken=true;});
    return guest.state==='seated';
  },240);
  check(guest.seat.project==='table','new table never usable');snap(w,'new-seat-in-use');
  window.projectFrames=frames;window.projectSaves=saves;
  return {passed:true,results,reloadFixtures:Object.keys(saves)};
})()
