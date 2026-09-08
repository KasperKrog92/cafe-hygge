/* Second-day working neighbours: full nights, independent invitations and legacy kits. */
(function(){
  'use strict';
  const frames={},results=[];
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function until(w,fn,limit){for(let t=0;t<(limit||1800);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('visitor timeout '+JSON.stringify({phase:w.shop.phase,jobs:w.memory.life.projects,actors:SIM.visitorActors(w).map(a=>[a.visitorId,a.state,a.x,a.y,a.walkBlocked])}));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(17),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id){check(!__dev.audit(w).length,'audit '+id+': '+__dev.audit(w));frames[id]=__dev.shot(null,{world:w});}
  function talk(w,id){until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId===id));check(SIM.startVisitor(w,id),'start '+id);until(w,()=>w.moment.phase==='talk');check(w.barista.y<=SCENE.L.rooms[w.memory.life.room].floorBottom,'conversation outside room');const voices=[],sound=w.context.sound.dialogueSyllable;
    w.context.sound.dialogueSyllable=(n,v)=>voices.push(v);
    for(let n=0;n<10;n++)SIM.update(w,.1);
    check(voices.length>0&&voices.every(v=>v===CAST.voices[SIM.momentLine(w).speaker]),id+' dialogue sound missing');
    const count=voices.length;w.momentHidden=true;tick(w,1);w.momentHidden=false;
    check(voices.length===count,id+' speech continued while hidden');
    w.context.sound.dialogueSyllable=sound;w.moment.visible=999;snap(w,id+'-hello');}
  function finish(w){until(w,()=>{if(w.moment&&w.moment.phase==='talk'){w.moment.visible=999;SIM.advanceMoment(w);}return !w.moment;});}
  for(const mode of ['idle','game']) {
    let w=__dev.modestWorld({homeIntro:true,random:SIM.seededRandom(17)});SIM.setMode(w,mode);
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    until(w,()=>SIM.homePlanRequired(w));const funds=w.memory.life.savings;
    check(SIM.buyProject(w,'window')&&SIM.buyProject(w,'table'),'paired first purchases');
    check(w.memory.life.savings===funds-90,'prices');tick(w,100);check(w.shop.phase==='home','first bedtime wait');
    check(SIM.goToSleep(w),'sleep');until(w,()=>w.shop.phase==='open');
    until(w,()=>!!w.windowWorker);const repairArrival=w.t+w.clockOffset;
    check(!w.deliveryVisitor,'first arrivals bunched');snap(w,mode+'-window-first');
    if(mode==='game') {
      talk(w,'tomas');const before=JSON.stringify(w.memory.life.projects.window),hour=w.hour;
      tick(w,60);check(JSON.stringify(w.memory.life.projects.window)===before&&w.hour===hour&&!w.deliveryVisitor,'repair meeting rushed');
      finish(w);
    }
    until(w,()=>{
      check(!w.deliveryVisitor||(!w.windowWorker&&w.memory.life.projects.window.stage==='installed'),'delivery interrupted window visit');
      return !!w.deliveryVisitor;
    });
    const arrivalGap=w.t+w.clockOffset-repairArrival;
    check(arrivalGap>=72,'visits not spaced by active cafe time');snap(w,mode+'-table-later');
    until(w,()=>w.deliveryVisitor.state==='handoff');
    check(Math.hypot(w.deliveryVisitor.x-SCENE.L.projects.table.work.x,w.deliveryVisitor.y-SCENE.L.projects.table.work.y)<1,'handoff away from site');
    check(w.memory.life.projects.table.stage==='scheduled','kit handed off while walking');snap(w,mode+'-trolley');
    if(mode==='game') {
      talk(w,'keira');const before=JSON.stringify(w.memory.life.projects.table),hour=w.hour;
      tick(w,60);check(JSON.stringify(w.memory.life.projects.table)===before&&w.hour===hour,'speaker work and day clock moved');
      SIM.advanceMoment(w);check(w.memory.flags['keira-hello-name'],'stable node missing');
      SIM.leaveMoment(w);until(w,()=>!w.moment);
      w=restore(w);until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId==='keira'));
      check(SIM.startVisitor(w,'keira')&&w.moment.index===1,'cursor not resumed');finish(w);
      check(w.memory.flags['tomas-introduced']&&w.memory.flags['keira-introduced'],'greetings not complete');
    } else check(!SIM.visitorInvites(w).length,'idle invitations visible');
    until(w,()=>['arrived','working','installed'].indexOf(w.memory.life.projects.table.stage)>=0);
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
    snap(w,mode+'-next-morning');results.push({mode,arrivalGap,days:w.memory.life.daysCompleted,seats:w.seats.length});
  }
  // Reload a partially repaired paired booking: retain spacing and progress.
  let paired=__dev.modestWorld();paired.memory.life.projects.table.stage='scheduled';
  Object.assign(paired.memory.life.projects.window,{stage:'working',step:1,time:7});
  paired=restore(paired);tick(paired,.25);
  check(paired.windowWorker&&!paired.deliveryVisitor&&paired.memory.life.projects.window.step===1,'reload bypassed spacing or replayed repair');
  until(paired,()=>!!paired.deliveryVisitor);
  check(!paired.windowWorker&&paired.memory.life.projects.window.stage==='installed','reload bunched paired jobs');
  // Previously delivered kits can still assemble alongside an unfinished repair.
  const overlap=__dev.modestWorld();SIM.setMode(overlap,'idle');Object.assign(overlap.memory.life.projects.table,{stage:'working',step:1,time:5});
  overlap.memory.life.projects.window.stage='scheduled';
  until(overlap,()=>overlap.memory.life.projects.table.stage==='installed'&&overlap.memory.life.projects.window.stage==='installed');
  check(!overlap.deliveryVisitor,'owned kit redelivered during repair');snap(overlap,'legacy-overlap');
  // Old completed hellos remain complete; appending story nodes never reopens them.
  const known=__dev.modestWorld();known.memory.life.daysCompleted=1;SIM.setMode(known,'game');
  known.clockOffset+=(11.5-known.hour)/24*SIM._.DAY_SECONDS;
  for(const id of ['keira','tomas'])known.memory.flags[id+'-introduced']=true;
  const knownSeen=new Set();
  until(known,()=>{
    known.patrons.filter(p=>p.social).forEach(p=>knownSeen.add(p.visitorId));
    check(!SIM.visitorInvites(known).length,'completed greeting reopened during return');
    return knownSeen.size===2;
  });
  check(!SIM.visitorInvites(known).length,'expanded scenes reopened completed greetings');
  // Returning neighbours take the complete customer journey before inviting.
  for(const mode of ['idle','game']) {
    let w=__dev.modestWorld({random:SIM.seededRandom(17)});SIM.setMode(w,mode);
    w.memory.life.daysCompleted=2;
    w.clockOffset+=(11.5-w.hour)/24*SIM._.DAY_SECONDS;
    const seen={keira:new Set(),tomas:new Set()},guests={};
    until(w,()=>{
      w.patrons.filter(p=>p.social).forEach(p=>{
        guests[p.visitorId]=p;seen[p.visitorId].add(p.state);
        if(p.state!=='seated')check(!SIM.visitorInvites(w).includes(p),'invitation before seating');
      });
      return ['keira','tomas'].every(id=>guests[id]&&guests[id].state==='seated');
    });
    for(const id of ['keira','tomas']) {
      const p=guests[id];
      for(const state of ['enter','queueing','ordering','waitDrink','pickup','toSeat','seated'])
        check(seen[id].has(state),id+' skipped '+state);
      check(p.seat&&p.seat.taken&&p.pose==='sit',id+' not seated');
      check(w.tables[p.seat.table].items.some(it=>it.owner===p.id),id+' missing served cup');
      check(SIM.visitorInvites(w).includes(p)===(mode==='game'),id+' invitation mode');
    }
    check(SIM.entityDrawables(w).draws.length===w.patrons.length+2,'returning visitor drawn twice');
    snap(w,mode+'-off-duty-seated');
    if(mode==='game') {
      talk(w,'keira');const p=guests.keira,stay=p.stay;
      tick(w,20);check(p.state==='seated'&&p.stay===stay,'seated speaker left during hello');
      SIM.advanceMoment(w);SIM.leaveMoment(w);until(w,()=>!w.moment);
      check(w.memory.flags['keira-hello-name']&&!w.memory.flags['keira-introduced'],'partial hello lost');
      w=restore(w);talk(w,'keira');check(w.moment.index===1,'off-duty reload lost cursor');finish(w);
      talk(w,'tomas');finish(w);
    }
    // No hello is required to leave, and ordinary cleanup releases seats.
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
    until(w,()=>w.shop.phase==='home');
    check(!w.patrons.length&&!SIM.visitorActors(w).length&&!w.seats.some(s=>s.taken),'off-duty closing stranded customers');
    if(mode==='idle')check(!w.memory.flags['keira-introduced']&&!w.memory.flags['tomas-introduced'],'unattended hello consumed');
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
  window.lifeFrames=frames;return {results,checks:['first evening','spaced visits in both modes','spacing after reload','legacy overlapping work','attended and ignored','saved nodes','completed legacy greetings','handoff reload','legacy progress','closing before and after handoff','later no-purchase hello','next morning','zero audits']};
})()
