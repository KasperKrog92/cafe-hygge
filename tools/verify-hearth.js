/* Gerda's fireplace gate, bare reopening and a separate decorative mantel. */
(function(){
  'use strict';
  const frames={},checks=[];let reloads=0;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function until(w,fn,n){for(let t=0;t<(n||3000);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('hearth timeout '+JSON.stringify({hour:w.hour,shop:w.shop.phase,barista:w.barista.state,jobs:w.memory.life.projects,worker:w.windowWorker}));}
  function quiet(w){w.spawnT=1e8;Object.values(w.regulars).forEach(r=>{r.force=false;r.lastDay=SIM._.dayIndex(w);});}
  function restore(w){SIM._.saveLife(w,0);reloads++;return SIM.create({memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))}),random:SIM.seededRandom(61)});}
  function snap(w,id){check(!__dev.audit(w).length,id+': '+__dev.audit(w));frames[id]=__dev.shot(null,{world:w});}
  function home(w){w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');SIM.setMode(w,'game');check(SIM.plan(w,true),'planner');}
  function next(w,mode){SIM.setMode(w,'game');check(SIM.goToSleep(w),'sleep');until(w,()=>w.shop.phase==='open');SIM.setMode(w,mode);quiet(w);}
  function finish(w,branch){until(w,()=>w.moment.phase==='talk');while(w.moment && w.moment.phase==='talk'){const l=SIM.momentLine(w);w.moment.visible=999;SIM.advanceMoment(w,l.choices?branch:undefined);}until(w,()=>!w.moment);}
  for(const mode of ['idle','game']) {
    let w=__dev.modestWorld();w.memory.life.savings=200;w.memory.life.daysCompleted=2;SIM.setMode(w,mode);
    w.clockOffset+=(9-w.hour)/24*SIM._.DAY_SECONDS;SIM._.updateClock(w,0);quiet(w);
    snap(w,mode+'-boarded');check(SCENE.fireplaceBoards(w)===3 && !SCENE.mantelShelf(w)&&SCENE.hearthWork(w),'fresh hearth not bare/boarded');
    // Even sufficient money in the real evening planner cannot skip the story.
    const gate=restore(w);home(gate);check(!SIM.buyProject(gate,'fireplace')&&!SIM.buyProject(gate,'mantel'),'locked projects purchasable');
    w.memory.life.projects.window={stage:'installed',step:4,time:0};w.regulars.gerda.force=true;SIM._.updateRegulars(w);
    until(w,()=>SIM.gerdaAvailable(w));check(SIM.startGerda(w),'Gerda intro');
    until(w,()=>w.moment.phase==='talk');
    while(SIM.momentLine(w).id!=='hearth'){w.moment.visible=999;SIM.advanceMoment(w);}
    w.moment.visible=999;snap(w,mode+'-gerda-hope');
    check(!w.memory.flags['fireplace-unlocked'],'unacknowledged hope unlocked hearth');
    finish(w,1);check(w.memory.flags['fireplace-unlocked']&&!w.memory.flags['gerda-pillows-accepted'],'pillow deferral blocked hearth');
    home(w);const funds=w.memory.life.savings;
    check(SIM.buyProject(w,'fireplace')&&!SIM.buyProject(w,'fireplace'),'reopening debit');
    check(w.memory.life.savings===funds-30&&!SIM.buyProject(w,'mantel'),'early decor/debit');w=restore(w);next(w,mode);
    for(let step=0;step<4;step++) {
      until(w,()=>w.memory.life.projects.fireplace.step===step && w.memory.life.projects.fireplace.time>=6);
      check(SCENE.hearthWork(w)&&!SCENE.mantelShelf(w),'working fire/shelf too early');
      check(SCENE.fireplaceBoards(w)===(step===0?2:0),'unboarding stages');snap(w,mode+'-reopen-'+step);
      const saved=JSON.stringify(w.memory.life.projects.fireplace);w=restore(w);quiet(w);
      check(JSON.stringify(w.memory.life.projects.fireplace)===saved,'reopening progress lost');
    }
    until(w,()=>w.memory.life.projects.fireplace.stage==='installed');
    check(SCENE.fireplaceBoards(w)===0&&!SCENE.mantelShelf(w)&&!SCENE.hasFurniture(w,'mantel-decor')&&w.fire.level>0,'first upgrade not bare and functional');
    snap(w,mode+'-functional');
    const evening=__dev.study({world:w,hour:20,seats:[]});frames[mode+'-functional-night']=__dev.shot(null,{world:evening});
    home(w);const decorFunds=w.memory.life.savings;
    check(SIM.buyProject(w,'mantel')&&!SIM.buyProject(w,'mantel'),'later mantel purchase');
    check(w.memory.life.savings===decorFunds-40,'mantel debit');w=restore(w);next(w,mode);
    for(let step=0;step<3;step++) {
      until(w,()=>w.memory.life.projects.mantel.step===step && w.memory.life.projects.mantel.time>=3);
      check(w.windowWorker.project==='mantel'&&SCENE.hearthWork(w),'mantel work did not rest the fire');
      check(SCENE.mantelShelf(w)===(step===2)&&!SCENE.hasFurniture(w,'mantel-decor'),'decor construction order');snap(w,mode+'-mantel-'+step);
      const saved=JSON.stringify(w.memory.life.projects.mantel);w=restore(w);quiet(w);
      check(JSON.stringify(w.memory.life.projects.mantel)===saved,'mantel checkpoint lost');
    }
    until(w,()=>w.memory.life.projects.mantel.stage==='installed'&&!w.windowWorker);
    check(SCENE.mantelShelf(w)&&SCENE.hasFurniture(w,'mantel-decor')&&!SCENE.hearthWork(w)&&w.fire.level>0,'finished mantel/fire');
    snap(w,mode+'-decorated');
    frames[mode+'-decorated-night']=__dev.shot(null,{world:__dev.study({world:w,hour:20,seats:[]})});
    checks.push(mode+': story gate despite pillow deferral, paired save/restore, bare working fire, independent later decorated mantel');
  }
  // Existing completed introductions get the two-line addition, never replay choices.
  let old=__dev.modestWorld();old.memory.life.daysCompleted=2;old.memory.life.projects.window={stage:'installed',step:4,time:0};
  old.memory.flags['gerda-introduced']=true;old.memory.flags['gerda-pillows-accepted']=true;quiet(old);
  old.regulars.gerda.force=true;SIM._.updateRegulars(old);until(old,()=>SIM.gerdaAvailable(old));SIM.startGerda(old);
  check(old.moment.memoryPrefix==='gerda-hearth-','old hello replayed');until(old,()=>old.moment.phase==='talk');
  old.moment.visible=999;SIM.advanceMoment(old);old=restore(old);quiet(old);old.regulars.gerda.force=true;SIM._.updateRegulars(old);
  until(old,()=>SIM.gerdaAvailable(old));SIM.startGerda(old);check(old.moment.index===1,'new conversation cursor lost');finish(old,0);
  check(old.memory.flags['fireplace-unlocked'],'old introduction cannot unlock');
  // A worker climbs down before closing and resumes the saved mounting phase.
  let w=__dev.modestWorld();w.memory.life.daysCompleted=2;
  w.memory.life.projects.fireplace={stage:'installed',step:4,time:0};w.memory.life.projects.mantel={stage:'working',step:1,time:4.5};quiet(w);
  until(w,()=>w.windowWorker && w.windowWorker.mantelLift===SCENE.L.projects.mantel.ladderHeight);
  w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;SIM.update(w,.25);
  check(w.windowWorker.state==='descending'&&w.windowWorker.mantelLift>0,'closing skipped descent');
  until(w,()=>w.shop.phase==='home');check(w.memory.life.projects.mantel.step===1,'closing did mantel work');
  w=restore(w);next(w,'game');until(w,()=>w.memory.life.projects.mantel.stage==='installed'&&!w.windowWorker);snap(w,'closing-resumed');
  checks.push('old completed/partial dialogue, safe ladder descent at closing and next-morning resumption');
  window.lifeFrames=frames;return {checks,reloads};
})()
