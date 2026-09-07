/* Second-day working neighbours: full nights, independent invitations and legacy kits. */
(function(){
  'use strict';
  const frames={},results=[];
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function until(w,fn,limit){for(let t=0;t<(limit||1800);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('visitor timeout '+JSON.stringify({phase:w.shop.phase,jobs:w.memory.life.projects,actors:SIM.visitorActors(w).map(a=>[a.visitorId,a.state,a.x,a.y,a.walkBlocked])}));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(17),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id){check(!__dev.audit(w).length,'audit '+id+': '+__dev.audit(w));frames[id]=__dev.shot(null,{world:w});}
  function talk(w,id){until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId===id));check(SIM.startVisitor(w,id),'start '+id);until(w,()=>w.moment.phase==='talk');check(w.barista.y<=SCENE.L.rooms[w.memory.life.room].floorBottom,'conversation outside room');w.moment.visible=999;snap(w,id+'-hello');}
  function finish(w){until(w,()=>{if(w.moment&&w.moment.phase==='talk'){w.moment.visible=999;SIM.advanceMoment(w);}return !w.moment;});}
  for(const mode of ['idle','game']) {
    let w=__dev.modestWorld({homeIntro:true,random:SIM.seededRandom(17)});SIM.setMode(w,mode);
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    until(w,()=>SIM.homePlanRequired(w));const funds=w.memory.life.savings;
    check(SIM.buyProject(w,'window')&&SIM.buyProject(w,'table'),'paired first purchases');
    check(w.memory.life.savings===funds-90,'prices');tick(w,100);check(w.shop.phase==='home','first bedtime wait');
    check(SIM.goToSleep(w),'sleep');until(w,()=>w.shop.phase==='open');
    until(w,()=>w.deliveryVisitor && w.windowWorker);snap(w,mode+'-overlap');
    check(new Set(SIM.visitorActors(w).map(a=>a.visitorId)).size===2,'duplicate actor');
    until(w,()=>w.deliveryVisitor.state==='handoff');
    check(Math.hypot(w.deliveryVisitor.x-SCENE.L.projects.table.work.x,w.deliveryVisitor.y-SCENE.L.projects.table.work.y)<1,'handoff away from site');
    check(w.memory.life.projects.table.stage==='scheduled','kit handed off while walking');snap(w,mode+'-trolley');
    if(mode==='game') {
      talk(w,'keira');const before=JSON.stringify(w.memory.life.projects),hour=w.hour;
      tick(w,60);check(JSON.stringify(w.memory.life.projects)===before&&w.hour===hour,'attended obligations moved');
      SIM.advanceMoment(w);check(w.memory.flags['keira-hello-name'],'stable node missing');
      SIM.leaveMoment(w);until(w,()=>!w.moment);
      w=restore(w);until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId==='keira'));
      check(SIM.startVisitor(w,'keira')&&w.moment.index===1,'cursor not resumed');finish(w);
      talk(w,'tomas');finish(w);check(w.memory.flags['tomas-introduced']&&w.memory.flags['keira-introduced'],'greetings not complete');
    } else check(!SIM.visitorInvites(w).length,'idle invitations visible');
    until(w,()=>w.memory.life.projects.table.stage==='arrived');
    const kit=JSON.stringify(w.memory.life.projects.table);w=restore(w);
    check(JSON.stringify(w.memory.life.projects.table)===kit,'handoff lost');tick(w,.25);check(!w.deliveryVisitor,'duplicate delivery after reload');
    until(w,()=>w.memory.life.projects.table.stage==='installed'&&w.memory.life.projects.window.stage==='installed');
    check(w.seats.length===6,'furniture quantity');snap(w,mode+'-installed');
    check(mode==='game'||(!w.memory.flags['keira-introduced']&&!w.memory.flags['tomas-introduced']),'ignored greeting completed');
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    check(!SIM.visitorActors(w).length,'visitors block closing');
    if(mode==='game')SIM.goToSleep(w);until(w,()=>w.shop.phase==='open');
    check(w.seats.length===6&&w.memory.life.projects.table.stage==='installed','next morning repeated work');
    SIM.setMode(w,'game');
    if(mode==='idle'){talk(w,'keira');finish(w);talk(w,'tomas');finish(w);}
    snap(w,mode+'-next-morning');results.push({mode,days:w.memory.life.daysCompleted,seats:w.seats.length});
  }
  for(const stage of ['arrived','working','installed']) {
    let w=__dev.modestWorld();const p=w.memory.life.projects.table;p.stage=stage;p.step=stage==='installed'?6:stage==='working'?2:0;p.time=stage==='working'?4.5:0;
    const raw=JSON.stringify(p),funds=w.memory.life.savings;w=restore(w);
    check(JSON.stringify(w.memory.life.projects.table)===raw&&w.memory.life.savings===funds,'legacy checkpoint changed');
    tick(w,1);check(!w.deliveryVisitor,'legacy kit redelivered');
  }
  // Close before and after handoff: durable ownership, never waiting for a hello.
  for(const delivered of [false,true]) {
    const w=__dev.modestWorld();w.memory.life.projects.table.stage='scheduled';w.memory.life.projects.window.stage='scheduled';
    until(w,()=>delivered?w.memory.life.projects.table.stage==='arrived':!!w.deliveryVisitor);
    const stage=w.memory.life.projects.table.stage;
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    check(!SIM.visitorActors(w).length&&w.memory.life.projects.table.stage===stage,'closing changed handoff');
    SIM.setMode(w,'game');SIM.goToSleep(w);until(w,()=>w.memory.life.projects.table.stage==='installed');snap(w,'resumed-'+delivered);
  }
  window.lifeFrames=frames;return {results,checks:['first evening','overlap','attended and ignored','saved nodes','handoff reload','legacy progress','closing before and after handoff','later no-purchase hello','next morning','zero audits']};
})()
