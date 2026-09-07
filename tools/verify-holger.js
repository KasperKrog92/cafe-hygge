// Conversation travel, speech, decisions and persistence in private worlds.
(function(){
  function check(ok,message){if(!ok)throw Error(message);}
  function travel(w){for(let n=0;n<4000&&w.moment&&w.moment.phase!=='talk';n++)SIM.update(w,.05);check(!w.moment||w.moment.phase==='talk','travel did not finish');}
  function next(w,choice){travel(w);if(!w.moment)return;const line=SIM.momentLine(w);if(w.moment.visible<line.text.length)SIM.advanceMoment(w);SIM.advanceMoment(w,choice);}
  function finish(w,branch){for(let n=0;n<150&&w.moment;n++){travel(w);if(w.moment)next(w,SIM.momentLine(w).choices?branch:undefined);}travel(w);check(!w.moment,'conversation stuck');}
  for(let branch=0;branch<2;branch++){
    const w=SIM.create({random:SIM.seededRandom(42)});SIM.skipUnpacking(w);SIM.update(w,.25);
    check(w.patrons.length===1&&w.patrons[0].regularId==='holger','first customer');
    for(let n=0;n<1000&&!SIM.holgerAvailable(w);n++)SIM.update(w,.1);
    let voices=[];w.context.sound.dialogueSyllable=(n,v)=>voices.push(v);
    check(SIM.startHolger(w),'introduction available');check(w.moment.phase==='talk','counter should begin in place');
    SIM.update(w,.1);check(w.moment.visible>0&&w.moment.visible<SIM.momentLine(w).text.length,'gradual text');
    w.momentHidden=true;const visible=w.moment.visible;SIM.update(w,5);check(w.moment.visible===visible,'hidden speech advanced');w.momentHidden=false;
    for(let n=0;n<30;n++)SIM.update(w,.1);check(voices.some(v=>v===CAST.voices.Holger),'Holger voice missing');
    const before={hour:w.hour,t:w.t,spawn:w.spawnT,patrons:w.patrons.map(p=>[p.state,p.stateT,p.x,p.y]),save:JSON.stringify(w.memory)};
    for(let n=0;n<1200;n++)SIM.update(w,.25);
    check(w.hour===before.hour&&w.t===before.t&&w.spawnT===before.spawn,'clock and arrivals held');
    check(JSON.stringify(w.patrons.map(p=>[p.state,p.stateT,p.x,p.y]))===JSON.stringify(before.patrons),'guest obligations held');
    check(JSON.stringify(w.memory)===before.save,'unattended progression');
    next(w);for(let n=0;n<30;n++)SIM.update(w,.1);check(voices.some(v=>v===CAST.voices.Lunafreya),'Lunafreya voice missing');
    while(w.moment.index<6)next(w);
    SIM.advanceMoment(w);check(!SIM.advanceMoment(w),'choice cannot advance itself');next(w,branch);
    check(SIM.momentLine(w).speaker==='Lunafreya','chosen answer not spoken');next(w);
    const saved=MEMORY.codec.encode(w.memory);SIM.leaveMoment(w);travel(w);SIM.update(w,1);check(w.t>before.t,'cafe resumes');
    const restored=SIM.create({memory:MEMORY.createStore({state:MEMORY.codec.decode(saved).state})});
    const start={x:restored.barista.x,y:restored.barista.y};
    check(SIM.startHolger(restored),'reload invitation');check(restored.moment.phase==='approach','seated guest needs approach');
    check(!SIM.advanceMoment(restored),'dialogue before arrival');
    SIM.update(restored,.25);check(Math.hypot(restored.barista.x-start.x,restored.barista.y-start.y)>0,'no walking');
    restored.momentHidden=true;const heldX=restored.barista.x,heldY=restored.barista.y;SIM.update(restored,5);
    check(restored.barista.x===heldX&&restored.barista.y===heldY,'hidden approach moved');restored.momentHidden=false;
    SIM.leaveMoment(restored);travel(restored);check(restored.barista.x===start.x&&restored.barista.y===start.y,'cancelled approach did not return');
    check(SIM.startHolger(restored),'cancel lost invitation');
    travel(restored);check(Math.hypot(restored.barista.x-restored.moment.owner.x,restored.barista.y-restored.moment.owner.y)<85,'stopped too far away');
    check(SIM.momentLine(restored).text===CAST.holgerIntroduction[6].choices[branch].reply,'chosen reply lost');
    finish(restored,branch);check(restored.memory.flags['holger-introduced']&&!SIM.startHolger(restored),'completion repeats');
    check(restored.barista.x===start.x&&restored.barista.y===start.y,'staff duty did not resume at original spot');
    check(!__dev.audit(restored).length,'audit after conversation');
  }
  const w=__dev.furnishedWorld(),arc=CAST.arcs.find(a=>a.anchor);w.memory.arcs[arc.id]={stage:0,progress:arc.rows,pendingBeat:'finished'};
  SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);check(w.moment&&w.memory.arcs[arc.id].stage===0,'arc awarded early');
  SIM.leaveMoment(w);travel(w);check(w.memory.arcs[arc.id].pendingBeat==='finished','unfinished payoff lost');
  SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);finish(w,0);check(w.memory.arcs[arc.id].stage===1,'arc ending missing');
  return {passed:true,checks:'first arrival; close conversation; actual approach/return; gradual text; distinct voices; hidden hold; both choices; reload; deferred payoff'};
})()
