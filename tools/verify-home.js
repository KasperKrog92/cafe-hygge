/* First apartment tutorial and bedtime: actual dt journeys and save round trips. */
(function () {
  'use strict';
  const frames={},results=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function until(w,fn,limit){for(let t=0;t<(limit||500);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('home timeout '+JSON.stringify(w.memory.life.homeStory));}
  function restore(w){SIM._.saveLife(w,0);const raw=MEMORY.codec.encode(w.memory);return SIM.create({random:SIM.seededRandom(17),memory:MEMORY.createStore({state:JSON.parse(raw)})});}
  function snap(w,id){check(!__dev.audit(w).length,'home audit '+id);frames[id]=__dev.shot(null,{world:w});}
  for(const mode of ['idle','game']) {
    let w=__dev.modestWorld({homeIntro:true,random:SIM.seededRandom(17)});
    SIM.setMode(w,mode);w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
    until(w,()=>w.shop.phase==='home');
    check(w.memory.life.homeStory.step===0,'missed first arrival');
    check(!SIM.goToSleep(w) && !SIM.skipBedtime(w) && !SIM.plan(w,true),'tutorial can be bypassed');
    if(mode==='game')snap(w,'arrival');
    const hour=w.hour;
    for(const key of ['introHidden','introPaused','introModal']) {
      w[key]=true;const before=JSON.stringify(w.memory.life.homeStory);tick(w,10);
      check(JSON.stringify(w.memory.life.homeStory)===before,'unattended scene advanced '+key);w[key]=false;
    }
    for(let step=0;step<SIM.homeTour.length;step++) {
      until(w,()=>w.memory.life.homeStory.step===step && w.homeActionTime>1);
      const b={x:w.barista.x,y:w.barista.y};
      w=restore(w);check(Math.hypot(w.barista.x-b.x,w.barista.y-b.y)<.001,'tour reload moved her '+step);
      if(mode==='game') {
        tick(w,.25);if(w.dialogue)w.dialogue.visible=w.dialogue.text.length;
        snap(w,'tour-'+step);
      }
      until(w,()=>w.memory.life.homeStory.step>step);
    }
    check(SIM.homePlanRequired(w) && w.plannerOpen,'planner did not open');
    check(w.hour===hour,'home clock advanced');
    const funds=w.memory.life.savings;
    check(!SIM.buyPlant(w) && !SIM.buyProject(w,'fireplace'),'other first-night purchases allowed');
    check(!SIM.goToSleep(w) && !SIM.skipBedtime(w),'unplanned sleep accepted');
    tick(w,300);check(SIM.homePlanRequired(w),'required choices expired');
    const choices=mode==='idle'?['table','window']:['window','table'];
    check(SIM.buyProject(w,choices[0]),'first choice failed');
    check(!SIM.buyProject(w,choices[0]),'duplicate charge');
    w=restore(w);check(SIM.homePlanRequired(w) && !SIM.goToSleep(w),'one choice bypassed second');
    check(SIM.buyProject(w,choices[1]),'second choice failed');
    check(w.memory.life.savings===funds-90,'price total changed');
    check(w.memory.life.homeStory.planned && !w.plannerOpen,'planner did not finish');
    w=restore(w);tick(w,300);
    check(w.shop.phase==='home','first evening left without sleep');
    if(mode==='game')snap(w,'unpacked-evening');
    check(!SIM.skipBedtime(w),'skip started sleep without bedtime choice');
    check(SIM.goToSleep(w) && !SIM.goToSleep(w),'sleep request not idempotent');
    for(let step=0;step<SIM.homeBedtime.length;step++) {
      until(w,()=>w.memory.life.homeStory.sleepStep===step && w.homeActionTime>.75);
      const before={x:w.barista.x,y:w.barista.y};w=restore(w);
      check(Math.hypot(w.barista.x-before.x,w.barista.y-before.y)<.001,'bedtime reload moved her '+step);
      const skipped=restore(w),fundsBefore=skipped.memory.life.savings;
      skipped.introPaused=true;
      skipped.dialogue={text:'Goodnight, little one.',visible:4};
      check(SIM.skipBedtime(skipped) && !SIM.skipBedtime(skipped),'skip not idempotent '+step);
      check(skipped.shop.phase==='dawn' && Math.abs(skipped.hour-7.5)<1e-8,'skip did not reach dawn '+step);
      check(!skipped.introPaused && !skipped.dialogue && !skipped.homeAction,'skip left scene active '+step);
      const resumed=restore(skipped),h=resumed.memory.life.homeStory;
      check(resumed.shop.phase==='dawn' && h.sleepStep===-1 && !h.firstNight && !h.sleepFrom,'skip reload replayed bedtime '+step);
      check(resumed.memory.life.savings===fundsBefore && resumed.memory.life.projects.table.stage==='scheduled' && resumed.memory.life.projects.window.stage==='scheduled','skip lost purchases '+step);
      check(!__dev.audit(resumed).length,'skip dawn audit '+step);
      if(mode==='game'){tick(w,.25);if(w.dialogue)w.dialogue.visible=w.dialogue.text.length;snap(w,'bedtime-'+step);}
      until(w,()=>w.memory.life.homeStory.sleepStep!==step);
    }
    check(w.shop.phase==='dawn' && Math.abs(w.hour-7.5)<1e-8,'bedtime never reached morning');
    check(w.memory.life.projects.table.stage==='scheduled' && w.memory.life.projects.window.stage==='scheduled','purchases not scheduled');
    check(!w.memory.life.homeStory.firstNight,'first night repeats');
    check(!__dev.audit(w).length,'post-home audit');
    results.push({mode,tourReloads:12,bedtimeReloads:5,savings:w.memory.life.savings});
  }
  // Starting bedtime from the reading seat must leave the bed at its side,
  // then use the clear lane instead of cutting through the mattress corner.
  const reader=__dev.modestWorld();SIM.withWorld(reader,()=>SIM._.enterHome(reader));
  SIM.setMode(reader,'game');reader.memory.life.homeDinner.done=true;reader.memory.life.homeTime=50;SIM.update(reader,0);
  check(SIM.goToSleep(reader),'bedside sleep rejected');
  for(let n=0;n<180 && reader.memory.life.homeStory.sleepStep===0;n++) {
    SIM.update(reader,.25);const b=reader.barista,H=SCENE.L.home;
    if(b.y>H.bedSeat.y+.1 && b.y<H.lane)check(b.x<H.bed.x,'bedtime cut the mattress');
  }
  check(SIM.skipBedtime(reader) && reader.shop.phase==='dawn','later game bedtime skip failed');
  // v7 saves with a previous evening retain purchases, funds, and history.
  for(const visited of [false,true]) {
    const old=MEMORY.codec.fresh();old.version=7;delete old.life.homeStory;
    old.life.daysCompleted=visited?3:0;old.life.savings=visited?2:90;old.flags.kept=true;
    const r=MEMORY.codec.decode(JSON.stringify(old));
    check(!r.error && r.state.flags.kept && r.state.life.savings===old.life.savings,'migration lost history');
    check(r.state.life.homeStory.step===(visited?12:0),'migration replayed an established evening');
  }
  const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=1200;
  const g=sheet.getContext('2d');g.fillStyle='#29242b';g.fillRect(0,0,sheet.width,sheet.height);
  const picks=['tour-1','tour-6','tour-9','tour-11','bedtime-0','bedtime-1','bedtime-3','unpacked-evening','arrival'];
  return Promise.all(picks.map((id,i)=>new Promise(resolve=>{const im=new Image();im.onload=()=>{g.drawImage(im,(i%3)*480,Math.floor(i/3)*400,480,300);g.fillStyle='#e8dfc9';g.font='18px Georgia';g.fillText(id,(i%3)*480+15,Math.floor(i/3)*400+325);resolve();};im.src=frames[id];}))).then(()=>({results,frames,sheet:sheet.toDataURL()}));
})();
