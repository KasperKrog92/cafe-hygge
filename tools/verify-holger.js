// Private deterministic conversation regressions, evaluated in the browser.
(function(){
  function check(ok,message){if(!ok)throw Error(message);}
  for(let branch=0;branch<2;branch++){
    const w=SIM.create({random:SIM.seededRandom(42)});
    SIM.skipIntro(w);
    for(let n=0;n<8000&&w.shop.phase==='settling';n++)SIM.update(w,.25);
    SIM.update(w,.25);
    check(w.patrons.length===1&&w.patrons[0].regularId==='holger','first customer');
    for(let n=0;n<1000&&!SIM.holgerAvailable(w);n++)SIM.update(w,.1);
    check(SIM.startHolger(w),'introduction available');
    const before={hour:w.hour,t:w.t,spawn:w.spawnT,patrons:w.patrons.map(p=>[p.state,p.stateT,p.x,p.y]),save:JSON.stringify(w.memory)};
    for(let n=0;n<1200;n++)SIM.update(w,.25);
    check(w.hour===before.hour&&w.t===before.t&&w.spawnT===before.spawn,'clock and arrivals held');
    check(JSON.stringify(w.patrons.map(p=>[p.state,p.stateT,p.x,p.y]))===JSON.stringify(before.patrons),'guest obligations held');
    check(JSON.stringify(w.memory)===before.save,'no unattended progression');
    while(w.moment.index<6)SIM.advanceMoment(w);
    check(!SIM.advanceMoment(w),'choice cannot advance itself');
    SIM.advanceMoment(w,branch);
    const saved=MEMORY.codec.encode(w.memory);
    SIM.leaveMoment(w);SIM.update(w,1);check(w.t>before.t,'cafe resumes');
    const restored=SIM.create({memory:MEMORY.createStore({state:MEMORY.codec.decode(saved).state})});
    check(SIM.startHolger(restored),'reload invitation');
    check(SIM.momentLine(restored).text===CAST.holgerIntroduction[6].choices[branch].reply,'chosen reply survives reload');
    while(restored.moment)SIM.advanceMoment(restored,SIM.momentLine(restored).choices?branch:undefined);
    check(restored.memory.flags['holger-introduced']&&!SIM.startHolger(restored),'completion happens once');
    check(restored.memory.flags[CAST.holgerIntroduction[10].choices[branch].flag],'second choice saved');
  }
  const w=__dev.furnishedWorld(),arc=CAST.arcs.find(a=>a.anchor);
  w.memory.arcs[arc.id]={stage:0,progress:arc.rows,pendingBeat:'finished'};
  SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);
  check(w.moment&&w.memory.arcs[arc.id].stage===0,'arc waits for attended ending');
  SIM.leaveMoment(w);
  check(w.memory.arcs[arc.id].pendingBeat==='finished','unfinished payoff preserved');
  SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);
  while(w.moment)SIM.advanceMoment(w);
  check(w.memory.arcs[arc.id].stage===1&&w.memory.flags[arc.flag],'arc commits at ending');
  return {passed:true,checks:'first arrival; both branches; five-minute hold; private save reload; resume; one-time completion; deferred existing arc payoff'};
})()
