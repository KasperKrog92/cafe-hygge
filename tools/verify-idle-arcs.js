// The startup idle café advances the ambient arcs, plays a tapped beat, and
// keeps its own save — while every game story stays out of it.
(function(){
  const original=window.__world;
  const DAY=SIM._.DAY_SECONDS;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function until(w,fn){for(let n=0;n<4800;n++){if(fn())return;SIM.update(w,.25);}throw Error('timeout '+w.barista.state);}
  function slot(){
    const s={raw:null,writes:0};
    s.adapter={getItem:function(){return s.raw;},
      setItem:function(key,value){s.raw=value;s.writes++;},
      removeItem:function(){s.raw=null;}};
    return s;
  }
  function idle(s,seed){
    return SIM.createIdle({store:s?MEMORY.createStore({storage:s.adapter}):undefined,
      random:SIM.seededRandom(seed||7)});
  }
  try {
    // --- arcs advance on the idle café's own clock; dormant ones wait ---
    const s=slot(), w=idle(s);
    window.__world=w;
    w.context.memory.saveNow();
    check(s.writes>0,'boot did not save the idle café');
    const ambient=['gerda-scarf','lunafreya-paintings','street-house'];
    for(let t=0;t<240;t+=.25)SIM.update(w,.25);
    ambient.forEach(id=>check(w.memory.arcs[id].progress>0,'arc held still in idle: '+id));
    check(w.memory.arcs['gerda-blanket'].progress===0 && w.memory.arcs['gerda-own'].progress===0,
      'a conversation-started arc moved without its moment');
    // --- game stories stay out ---
    check(SIM.invitations(w).length===0,'attended hellos offered in idle');
    check(!SIM.beginMoment(w,[{speaker:'x',text:'x'}],w.patrons[0],function(){}),'plain conversation accepted in idle');
    check(!SIM.setMode(w,'game'),'idle became a game');
    check(w.shop.phase==='open','idle café closed');

    // --- a readied scarf waits, then plays on a tap ---
    __dev.age(6);
    const rec=w.memory.arcs['gerda-scarf'];
    check(rec.pendingBeat==='finished','scarf not ready after six days');
    for(let t=0;t<120;t+=.25)SIM.update(w,.25);
    check(rec.pendingBeat==='finished' && !w.moment,'ready beat fired without a tap');
    __dev.regular('gerda');
    until(w,()=>{const g=w.patrons.find(p=>p.regularId==='gerda');return g&&g.state==='seated';});
    const gerda=w.patrons.find(p=>p.regularId==='gerda');
    check(SIM.beatAt(w,gerda.x,gerda.y),'tap missed the waiting scarf beat');
    check(w.moment,'idle beat opened no moment');
    until(w,()=>{
      if(w.moment&&w.moment.phase==='talk'){w.moment.visible=999;SIM.advanceMoment(w);}
      return !w.moment;
    });
    check(w.memory.flags['cat-wore-scarf'] && w.cat.scarf,'scarf beat left no lasting mark');
    check(rec.stage===1 && w.memory.bonds.gerda && w.memory.bonds.gerda.warmth>0,'beat did not warm the bond');
    check(!__dev.audit(w).length,'post-beat audit');

    // --- an anchored beat (the street painter) plays from its fixed spot ---
    __dev.age(2);
    check(w.memory.arcs['street-house'].pendingBeat==='finished','facade not ready');
    const anchor=CAST.arcs.find(a=>a.id==='street-house').anchor;
    check(SIM.beatAt(w,anchor.x,anchor.y+20),'tap missed the painter beat');
    until(w,()=>{
      if(w.moment&&w.moment.phase==='talk'){w.moment.visible=999;SIM.advanceMoment(w);}
      return !w.moment;
    });
    check(w.memory.flags['street-house-painted'],'painter beat left no lasting mark');

    // --- the idle save carries to the next session; no store means unsaved ---
    w.context.memory.saveNow();
    const again=idle(s,11);
    check(again.cat.scarf && again.memory.arcs['gerda-scarf'].stage===1 &&
      again.memory.flags['street-house-painted'],'idle save did not carry across sessions');
    const fresh=idle(null,13);
    check(!fresh.cat.scarf && fresh.memory.arcs['gerda-scarf'].progress===0,'unsaved idle session not fresh');

    // --- quiet play (game mode) still hides beats; ambient never did invitations ---
    const q=__dev.furnishedWorld({random:SIM.seededRandom(21)});
    q.memory.life.mode='idle';
    q.memory.arcs['gerda-scarf']={stage:0,progress:5,pendingBeat:'finished'};
    const qg=q.patrons.find(p=>p.state==='seated');
    check(!SIM.beatAt(q,qg?qg.x:480,qg?qg.y:400),'quiet play played a beat');

    return {passed:true,checks:'ambient arcs advance; dormant arcs wait; no hellos/moments/mode switch; '+
      'readied beat waits for the tap; scarf and painter beats play and persist; fresh session stays unsaved; quiet play unchanged'};
  } finally {window.__world=original;}
})()
