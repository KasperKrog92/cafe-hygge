/* Gerda: window gate, attended choices, next-morning work and patient thanks. */
(function(){
  'use strict';
  const frames={},checks=[];let reloads=0;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function until(w,fn,n){for(let t=0;t<(n||2400);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('Gerda timeout '+JSON.stringify({hour:w.hour,phase:w.shop.phase,job:w.memory.life.projects.windowSeat,b:w.barista.state,p:w.patrons.map(p=>[p.name,p.state,p.x,p.y,p.walkBlocked]),flags:w.memory.flags}));}
  function restore(w){SIM._.saveLife(w,0);reloads++;return SIM.create({random:SIM.seededRandom(43),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id){check(!__dev.audit(w).length,id+' audit '+__dev.audit(w));frames[id]=__dev.shot(null,{world:w});}
  function quiet(w){w.spawnT=1e8;Object.values(w.regulars).forEach(r=>{r.lastDay=SIM._.dayIndex(w);r.force=false;});}
  function summon(w){quiet(w);w.regulars.gerda.force=true;SIM._.updateRegulars(w);check(w.patrons.some(p=>p.regularId==='gerda'),'Gerda did not enter');until(w,()=>SIM.gerdaAvailable(w),600);}
  function finish(w,choice){until(w,()=>w.moment.phase==='talk');while(w.moment && w.moment.phase==='talk'){const l=SIM.momentLine(w);w.moment.visible=l.text.length;check(SIM.advanceMoment(w,l.choices?choice:undefined),'advance failed');}until(w,()=>!w.moment);}
  function opened(mode){const w=__dev.modestWorld({random:SIM.seededRandom(43)});SIM.setMode(w,mode);w.memory.life.daysCompleted=2;w.clockOffset+=(9-w.hour)/24*SIM._.DAY_SECONDS;SIM._.updateClock(w,0);quiet(w);return w;}
  function repair(w){w.memory.life.projects.window={stage:'scheduled',step:0,time:0};until(w,()=>w.memory.life.projects.window.stage==='installed'&&!w.windowWorker);}

  for(const mode of ['idle','game']) {
    let w=opened(mode);
    w.regulars.gerda.force=true;SIM._.updateRegulars(w);
    check(!w.patrons.some(p=>p.regularId==='gerda'),'Gerda entered before repair');
    w.memory.life.projects.window={stage:'working',step:3,time:17.75};
    SIM._.updateRegulars(w);check(!w.patrons.some(p=>p.regularId==='gerda'),'partial glass allowed entry');
    until(w,()=>w.memory.life.projects.window.stage==='installed'&&!w.windowWorker);
    summon(w);snap(w,mode+'-introduction');
    check(SIM.startGerda(w),'hello invitation');until(w,()=>w.moment.phase==='talk');
    const held=w.hour;w.momentHidden=true;tick(w,120);check(w.hour===held && w.moment.index===0,'hidden conversation advanced');w.momentHidden=false;
    // Every acknowledged node survives a private save/restore and real return.
    while(w.moment && w.moment.phase==='talk') {
      const m=w.moment,l=SIM.momentLine(w);m.visible=l.text.length;
      if(l.choices)snap(w,mode+'-offer-choice');
      SIM.advanceMoment(w,l.choices?0:undefined);
      if(w.memory.flags['gerda-introduced'])break;
      const expected=SIM.momentLine(w).text;
      w=restore(w);summon(w);check(SIM.startGerda(w),'reload hello');until(w,()=>w.moment.phase==='talk');
      // Selection saves before the reply; its spoken player line is transient.
      const current=SIM.momentLine(w);
      check(current.text===expected || current.text===CAST.gerdaWindow.hello.find(l=>l.choices).choices[0].reply,'reload cursor/choice changed');
    }
    until(w,()=>!w.moment);
    check(w.memory.flags['gerda-pillows-accepted'],'accepted gift did not unlock');
    check(w.memory.life.projects.windowSeat.stage==='available'&&!SIM.buyProject(w,'windowSeat'),'offer auto-purchased');
    w.memory.life.savings=150;
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    SIM.setMode(w,'game');check(SIM.plan(w,true)&&SIM.buyProject(w,'windowSeat'),'planner purchase');
    const balance=w.memory.life.savings;check(!SIM.buyProject(w,'windowSeat'),'duplicate debit');
    w=restore(w);check(w.memory.life.savings===balance && w.memory.life.projects.windowSeat.stage==='purchased','purchase reload');
    check(SIM.goToSleep(w),'sleep');until(w,()=>w.shop.phase==='open');SIM.setMode(w,mode);quiet(w);
    w.regulars.gerda.force=true;SIM._.updateRegulars(w);check(!w.patrons.some(p=>p.regularId==='gerda'),'Gerda arrived before table');
    for(let step=0;step<4;step++) {
      until(w,()=>w.memory.life.projects.windowSeat.step===step && w.memory.life.projects.windowSeat.time>=3);
      snap(w,mode+'-table-'+step);const saved=JSON.stringify(w.memory.life.projects.windowSeat);
      w=restore(w);quiet(w);check(JSON.stringify(w.memory.life.projects.windowSeat)===saved,'table work replayed');
    }
    until(w,()=>w.memory.life.projects.windowSeat.stage==='installed');
    check(w.tables.filter(t=>t.tall).length===1 && !w.seats.some(s=>s.window),'seats usable without pillows/right table appeared');
    quiet(w);SIM._.updateRegulars(w);until(w,()=>w.patrons.some(p=>p.carryingPillows && p.x>105));snap(w,mode+'-carrying');
    until(w,()=>w.memory.flags['gerda-pillow-left']);snap(w,mode+'-first-pillow');
    w=restore(w);quiet(w);check(w.memory.flags['gerda-pillow-left']&&!w.memory.flags['gerda-pillow-right'],'first pillow reload');
    SIM._.updateRegulars(w);check(w.patrons.find(p=>p.regularId==='gerda').carryingPillows===1,'duplicate gift after reload');
    until(w,()=>w.memory.flags['gerda-pillow-right']);
    check(w.seats.filter(s=>s.window).length===2,'two left perches missing');
    until(w,()=>SIM.gerdaAvailable(w));tick(w,2);snap(w,mode+'-knitting');
    check(!w.memory.flags['gerda-window-thanked'],'thank-you fired itself');
    check(SIM.startGerda(w),'thanks invitation');until(w,()=>w.moment.phase==='talk');
    for(let n=0;n<6;n++){w.moment.visible=SIM.momentLine(w).text.length;SIM.advanceMoment(w);}
    w.moment.visible=SIM.momentLine(w).text.length;snap(w,mode+'-thanks');
    const line=SIM.momentLine(w).text;w=restore(w);summon(w);check(SIM.startGerda(w),'thanks reload');until(w,()=>w.moment.phase==='talk');
    check(SIM.momentLine(w).text===line,'thank-you cursor lost');finish(w,0);
    check(w.memory.flags['gerda-window-thanked']&&!SIM.startGerda(w),'thanks repeated');snap(w,mode+'-complete');
    const night=structuredClone(w);night.hour=20;night.pal=SCENE.dayPalette(20);night.daylight=night.pal.daylight;
    frames[mode+'-night']=__dev.shot(null,{world:night});
    const empty=structuredClone(w);empty.patrons=[];empty.tables.forEach(t=>t.items=[]);
    frames[mode+'-empty-window']=__dev.shot('window0',{world:empty,scale:3});
    const seats=w.seats.length;SIM._.installProjects(w);SIM._.installProjects(w);check(w.seats.length===seats,'duplicate installed seats');
    checks.push(mode+': repair gate, every hello cursor, chosen answer, planner debit, next day, four job checkpoints, two pillows, tea/seating and thanks');
  }
  let later=opened('game');repair(later);summon(later);SIM.startGerda(later);finish(later,1);
  check(later.memory.flags['gerda-introduced']&&!later.memory.flags['gerda-pillows-accepted']&&!SIM.gerdaAvailable(later),'not yet did not stay warm/quiet');
  later=restore(later);summon(later);SIM.startGerda(later);finish(later,1);
  later=restore(later);summon(later);SIM.startGerda(later);finish(later,0);
  check(later.memory.flags['gerda-pillows-accepted'],'offer could not be reconsidered twice');
  // Leaving during gift work preserves the placed half and lets closing finish.
  let closing=opened('game');repair(closing);closing.memory.flags['gerda-pillows-accepted']=true;
  closing.memory.life.projects.windowSeat={stage:'installed',step:4,time:0};SIM._.installProjects(closing);
  quiet(closing);SIM._.updateRegulars(closing);until(closing,()=>closing.memory.flags['gerda-pillow-left']);
  closing.clockOffset+=(21.5-closing.hour)/24*SIM._.DAY_SECONDS;until(closing,()=>closing.shop.phase==='home');
  check(closing.memory.flags['gerda-pillow-left']&&!closing.memory.flags['gerda-pillow-right'],'closing completed unseen second placement');
  closing=restore(closing);SIM.setMode(closing,'game');check(SIM.goToSleep(closing),'gift closing sleep');until(closing,()=>closing.shop.phase==='open');
  until(closing,()=>closing.memory.flags['gerda-pillow-right']);snap(closing,'closing-resumed');
  checks.push('repeatable not-yet, closing mid-gift, next-day resumption, idempotent seats');
  window.lifeFrames=frames;return {checks,reloads};
})()
