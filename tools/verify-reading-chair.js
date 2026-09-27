/* The reading chair by the fire (C2): offered only once the wall shelves are
   up and never where the fireside pair already stands; one charge; Keira
   brings it wrapped in blankets on her trolley the next morning and leaves;
   Lunafreya unwraps it, turns it to the fire and sets its lamp between
   customers, each phase surviving a reload and closing, never redelivered.
   Installed, the left fireside chair and its side table join the room:
   Holger takes his usual seat and reads, the cat has its spot beside it, the
   worksite is released, and the little lamp glows in the evening. */
(function(){
  'use strict';
  const frames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function job(w){return w.memory.life.projects.readingChair;}
  function until(w,fn,limit){for(let t=0;t<(limit||2400);t+=.25){if(fn())return;SIM.update(w,.25);}
    throw Error('chair timeout '+JSON.stringify({phase:w.shop.phase,hour:w.hour,job:job(w),b:w.barista.state,keira:w.deliveryVisitor&&w.deliveryVisitor.state}));}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id,crop){const a=__dev.audit(w);check(!a.length,id+' audit: '+a.join('; '));frames[id]=__dev.shot(crop||{x:220,y:190,w:220,h:170,scale:3},{world:w});}
  function toHome(w){w.clockOffset+=(21.5-w.hour)/24*R.DAY_SECONDS;until(w,()=>w.shop.phase==='home');}
  function shelves(w){w.memory.life.projects.bookshelf={stage:'installed',step:5,time:0};}

  // Offer: needs the little shelves; never in a room with the fireside pair.
  let w=__dev.modestWorld({random:SIM.seededRandom(42)});SIM.setMode(w,'game');w.memory.life.savings=200;
  toHome(w);SIM.plan(w,true);
  check(!SIM.buyProject(w,'readingChair'),'bought without shelves');
  shelves(w);R.installProjects(w);
  check(IMPROVEMENTS.offered(w,'readingChair'),'not offered with shelves');
  check(SIM.buyProject(w,'readingChair'),'reading chair purchase');
  const balance=w.memory.life.savings;
  check(!SIM.buyProject(w,'readingChair'),'charged twice');w=restore(w);
  check(w.memory.life.savings===balance&&job(w).stage==='purchased','purchase lost on reload');
  const furnished=__dev.furnishedWorld();
  check(!IMPROVEMENTS.offered(furnished,'readingChair')&&SCENE.hasFurniture(furnished,'fireside-left'),'offered beside the fireside pair');
  check(!SCENE.readingLamp(furnished,furnished.tables.find(t=>t.furniture==='fireside-left')),'the fireside pair grew a lamp');
  checks.push('offered once the little shelves are up, charged once, never beside the fireside pair');

  // Delivery the next morning, then each phase across a reload.
  SIM.setMode(w,'game');check(SIM.goToSleep(w),'bedtime');until(w,()=>w.shop.phase==='open');
  until(w,()=>w.deliveryVisitor&&w.deliveryVisitor.delivers==='readingChair'&&w.deliveryVisitor.path&&w.deliveryVisitor.path.length&&w.deliveryVisitor.x>120);
  snap(w,'delivery',{x:40,y:190,w:400,h:190,scale:2});
  until(w,()=>job(w).stage==='arrived');
  check(SCENE.hasFurniture(w,'chair-worksite')&&!SCENE.hasFurniture(w,'fireside-left'),'bundle does not hold its place');
  snap(w,'wrapped');
  until(w,()=>!w.deliveryVisitor);
  for(let step=0;step<3;step++) {
    until(w,()=>job(w).stage==='working'&&job(w).step===step&&job(w).time>=3);
    if(step===1)snap(w,'unwrapped');
    const saved=JSON.stringify(job(w));w=restore(w);
    check(JSON.stringify(job(w))===saved,'phase '+step+' lost on reload');
    for(let t=0;t<30;t+=.25){SIM.update(w,.25);check(!w.deliveryVisitor,'the chair was redelivered');}
  }
  until(w,()=>job(w).stage==='installed');
  check(SCENE.hasFurniture(w,'fireside-left')&&!SCENE.hasFurniture(w,'chair-worksite'),'worksite not released');
  check(w.seats.filter(s=>s.armchair).length===1&&w.tables.filter(t=>t.fireside).length===1,'not one chair and one side table');
  check(SCENE.catSpotAvailable(w,'armchair'),'no cat spot beside the chair');
  snap(w,'installed');
  checks.push('Keira brings it wrapped, Lunafreya unwraps it in three phases, each surviving a reload; never redelivered');

  // Holger's usual seat; a reader; the lamp at dusk.
  // Whoever sits there (Holger included) finishes their visit first.
  const chair=w.seats.find(s=>s.armchair),arriving=['enterDelay','wipeFeet','shake','parkUmbrella','enter','queueing','ordering','waitDrink','pickup'];
  w.spawnT=1e9;
  for(let i=0;i<4*600;i++){
    const h=w.patrons.find(p=>p.regularId==='holger'),sitter=w.patrons.find(p=>p.seat===chair);
    // and its cup cleared, and nobody still looking for a seat
    if(!h&&!chair.taken&&!w.tables[chair.table].items.some(it=>it.owner===null)&&!w.queue.length&&
      !w.patrons.some(p=>arriving.indexOf(p.state)>=0))break;
    [h,sitter].forEach(p=>{if(p&&p.state==='seated')p.stay=Math.min(p.stay,0);});
    SIM.update(w,.25);
  }
  check(!chair.taken,'the reading chair never came free');
  // Holger comes straight through the door; nobody else arrives meanwhile.
  w.clockOffset+=(9.2-w.hour)/24*R.DAY_SECONDS;SIM.update(w,0);
  w.regulars.holger.force=true;R.updateRegulars(w);w.spawnT=1e9;
  let holger=null;until(w,()=>(holger=w.patrons.find(p=>p.regularId==='holger'&&p.state==='seated'&&p.low===1)),1600);
  check(holger.seat.armchair&&holger.reading,'Holger did not take the reading chair: '+JSON.stringify({seat:holger.seat,
    reading:holger.reading,chairTaken:chair.taken,sitter:(w.patrons.find(p=>p.seat===chair)||{}).name,cups:w.tables[chair.table].items}));
  snap(w,'holger-reading');
  w.clockOffset+=(20.5-w.hour)/24*R.DAY_SECONDS;for(let t=0;t<20;t+=.25)SIM.update(w,.25);
  check(SCENE.readingLamp(w,w.tables.find(t=>t.furniture==='fireside-left')),'no lamp on the side table');
  snap(w,'evening-lamp');
  checks.push('Holger takes his usual seat and reads by the fire; the little lamp glows in the evening');

  // Closing mid-unwrapping keeps the bundle's progress for another day.
  w=__dev.modestWorld({random:SIM.seededRandom(7)});shelves(w);job(w).stage='scheduled';
  until(w,()=>job(w).stage==='working'&&job(w).step===1);
  toHome(w);check(!SIM.visitorActors(w).length,'Keira kept closing waiting');
  const kept=job(w).step;w=restore(w);SIM.setMode(w,'game');SIM.goToSleep(w);until(w,()=>w.shop.phase==='open');
  check(job(w).step===kept&&job(w).stage==='working','closing lost the chair\'s progress');
  until(w,()=>job(w).stage==='installed');
  check(!__dev.audit(w).length,'audit after resume: '+__dev.audit(w).join('; '));
  checks.push('closing mid-job keeps its phase; the next morning finishes it');
  window.chairFrames=frames;return {checks};
})()
