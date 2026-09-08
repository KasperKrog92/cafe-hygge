/* Empty shelf: real lifecycle, save boundaries, independent greetings and old libraries. */
(function(){
  'use strict';
  const frames={},checks=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function until(w,fn,limit){for(let t=0;t<(limit||2200);t+=.25){if(fn())return;SIM.update(w,.25);}throw Error('shelf timeout '+JSON.stringify({shop:w.shop,job:w.memory.life.projects.bookshelf,actor:w.shelfVisitor&&[w.shelfVisitor.x,w.shelfVisitor.y,w.shelfVisitor.state,w.shelfVisitor.walkBlocked]}));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id){const a=__dev.audit(w);check(!a.length,id+' audit '+a);frames[id]=__dev.shot(null,{world:w});}
  for(const mode of ['game','idle']) {
    let w=__dev.modestWorld({random:SIM.seededRandom(42)});
    SIM.setMode(w,'game');w.memory.life.savings=150;
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    check(SIM.plan(w,true)&&SIM.buyProject(w,'bookshelf'),'ordinary shelf purchase');
    const balance=w.memory.life.savings;
    check(!SIM.buyProject(w,'bookshelf'),'duplicate charge');w=restore(w);
    check(w.memory.life.savings===balance && w.memory.life.projects.bookshelf.stage==='purchased','purchase reload');
    check(SIM.goToSleep(w),'bedtime');until(w,()=>w.shop.phase==='open');SIM.setMode(w,mode);
    until(w,()=>w.shelfVisitor && w.shelfVisitor.path && w.shelfVisitor.path.length && w.shelfVisitor.x>110);
    snap(w,mode+'-delivery');
    until(w,()=>w.memory.life.projects.bookshelf.stage==='arrived');snap(w,mode+'-wrapped');
    for(let step=0;step<5;step++) {
      until(w,()=>w.memory.life.projects.bookshelf.step===step && w.memory.life.projects.bookshelf.time>=3);
      const saved=JSON.stringify(w.memory.life.projects.bookshelf);w=restore(w);
      check(JSON.stringify(w.memory.life.projects.bookshelf)===saved,'partial unpack reload');
      until(w,()=>w.shelfVisitor);
      check(!w.shelfVisitor.shelfParcel,'shelf redelivered');
      until(w,()=>w.shelfVisitor && w.shelfVisitor.state==='working' && (step!==3||w.shelfVisitor.shelfLift===SCENE.L.projects.bookshelf.stoolHeight));snap(w,mode+'-step-'+step);
    }
    until(w,()=>w.memory.life.projects.bookshelf.stage==='installed' && !w.shelfVisitor);
    check(!w.memory.flags['keira-introduced'],'ignored greeting completed');
    check(!SCENE.hasFurniture(w,'bookshelf'),'empty shelf enabled browsing');snap(w,mode+'-empty');
    for(let t=0;t<300;t+=.25){SIM.update(w,.25);check(!w.patrons.some(p=>p.hasShelfBook),'borrowed from empty shelf');}
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    SIM.setMode(w,'game');SIM.goToSleep(w);until(w,()=>w.shop.phase==='open');
    check(w.memory.life.projects.bookshelf.stage==='installed','shelf lost next morning');snap(w,mode+'-next-morning');
    checks.push(mode+' purchase, partial reloads, empty browsing, service/home/reopening');
  }
  for(const phase of ['scheduled','arrived','working','upper']) {
    let w=__dev.modestWorld();w.memory.life.projects.bookshelf.stage='scheduled';
    until(w,()=>phase==='scheduled'?!!w.shelfVisitor:phase==='upper'?
      w.shelfVisitor && w.shelfVisitor.shelfLift===SCENE.L.projects.bookshelf.stoolHeight:
      w.memory.life.projects.bookshelf.stage===phase);
    if(phase==='upper') {
      const a=w.shelfVisitor;
      w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;SIM.update(w,.25);
      check(a.shelfLift>0 && a.shelfLift<SCENE.L.projects.bookshelf.stoolHeight,'closing skipped the steps');
      snap(w,'upper-closing');
    }
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;until(w,()=>w.shop.phase==='home');
    check(!SIM.visitorActors(w).length,'visitor blocks closing');w=restore(w);
    SIM.setMode(w,'game');SIM.goToSleep(w);until(w,()=>w.memory.life.projects.bookshelf.stage==='installed');snap(w,'resume-'+phase);
  }
  const old=__dev.furnishedWorld();old.memory.version=8;delete old.memory.life.projects.bookshelf;
  const migrated=MEMORY.codec.migrate(old.memory);
  check(migrated.life.projects.bookshelf.stage==='installed' && migrated.life.furniture.bookshelf,'old library lost');
  const legacy=SIM.create({memory:MEMORY.createStore({state:migrated})});
  check(SCENE.hasFurniture(legacy,'bookshelf')&&!SCENE.hasFurniture(legacy,'shelf-worksite'),'old library duplicated');
  let w=__dev.modestWorld();w.memory.life.projects.bookshelf.stage='scheduled';w.memory.flags['keira-hello-name']=true;SIM.setMode(w,'game');
  until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId==='keira'));
  check(SIM.startVisitor(w,'keira')&&w.moment.index===1,'pending greeting not resumed');
  SIM.leaveMoment(w);until(w,()=>!w.moment);until(w,()=>w.memory.life.projects.bookshelf.stage==='installed');
  checks.push('closing before/during unpacking, v8 library migration, pending greeting');
  // The actual future-use envelope, not only a route audit: frames, drapes,
  // sill, mantel/corbel and future 20-pixel book spines stay clear.
  const s=SCENE.L.projects.bookshelf,win=SCENE.L.win,fire=SCENE.L.fire;
  check(s.x>=win.x+win.w+16 && s.x+s.w+1<=fire.x-4,'window/hearth horizontal envelope');
  check(s.rows[0]-20>=152 && s.rows[2]+9<=fire.boxBot,'mantel and hearth vertical envelope');
  const future=__dev.furnishedWorld({random:SIM.seededRandom(84)});
  future.memory.life.furniture.bookshelf=false;
  future.memory.life.projects.bookshelf={stage:'scheduled',step:0,time:0};
  until(future,()=>future.shelfVisitor && future.shelfVisitor.state==='working');snap(future,'future-installation');
  until(future,()=>future.memory.life.projects.bookshelf.stage==='installed'&&!future.shelfVisitor);
  check(!SCENE.activeGeometry(future,SCENE.L.footprints).some(b=>b.furniture==='shelf-worksite'),'kit reservation not released');
  snap(future,'future-open-windows');
  // Clone this real future world for a renderer-only closed-curtain comparison.
  const closed=structuredClone(future);closed.shop.curtains=[1,1];
  frames['future-closed-drapes']=__dev.shot(null,{world:closed});
  checks.push('future window/sill/drape/mantel book envelope, fireside installation access, released worksite');
  window.lifeFrames=frames;return {checks};
})()
