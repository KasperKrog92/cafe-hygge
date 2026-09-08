/* The wall-backed cat home: real care, feeding, old checkpoints and art. */
(function () {
  'use strict';
  const L=SCENE.L,R=SIM._,frames={},checks=[];window.firstFrames=frames;
  function check(ok,msg) { if(!ok)throw Error(msg); }
  function tick(w,until,label,seconds) {
    for(let i=0;i<(seconds||180)*4;i++) {
      if(until())return;
      SIM.update(w,.25);
    }
    check(until(),label);
  }
  function quiet(w) {
    w.spawnT=1e9;w.patrons=[];w.queue=[];w.counterCups=[];w.umbrellaStand=[];
    w.tables.forEach(t=>{t.items=[];});
    w.seats.forEach(s=>{s.taken=false;});w.barista.orders=[];
    w.barista.state='idle';w.barista.path=null;w.barista.idleT=0;
    w.barista.wateringPending=false;
  }
  function shot(w,name) {
    frames[name]=__dev.shot({x:550,y:180,w:200,h:140,scale:4},{world:w});
  }
  function restore(w,edit) {
    R.saveLife(w,0);
    const save=JSON.parse(MEMORY.codec.encode(w.memory));
    if(edit)edit(save);
    return SIM.create({memory:MEMORY.createStore({state:save}),random:SIM.seededRandom(92)});
  }
  for(const full of [false,true]) {
    const w=full?__dev.furnishedWorld({}):__dev.modestWorld({});quiet(w);
    w.hour=12;w.clockOffset=(12-8.4)/24*1440;
    const tag=full?'furnished':'modest';
    check(!L.plants.some(p=>p.x===612),'removed decorative plant still exists');
    check(L.firstPlant.x===250,'purchased plant moved');
    const art=__dev.study({world:w});
    Object.assign(art.cat,{x:L.catCorner.cushion.x,y:L.catCorner.cushion.y,surface:'floor',state:'sleep',facing:1});
    shot(art,tag+'-sleep');
    frames[tag+'-room']=__dev.shot(null,{world:art});
    for(const pose of ['sit','loaf','knead']) { art.cat.state=pose;shot(art,tag+'-'+pose); }
    if(full) { art.shop.curtains=[1,1];shot(art,'closed-drapes'); }
    check(__dev.audit(w).length===0,tag+' initial audit: '+__dev.audit(w).join('; '));
    w.catBowls.food=w.catBowls.water=0;
    tick(w,()=>w.barista.state==='refill',tag+' refill did not arrive');
    check(w.barista.x===L.catCorner.noraSpot.x && w.barista.y===L.catCorner.noraSpot.y,'refill used old corner');
    SIM.update(w,.5);shot(w,tag+'-refill');
    tick(w,()=>w.catBowls.food===1&&w.catBowls.water===1,tag+' refill failed');
    tick(w,()=>w.barista.state==='idle',tag+' refill did not return');
    for(const kind of ['eat','drink']) {
      w.cat.hungerT=kind==='eat'?0:1e9;w.cat.thirstT=kind==='drink'?0:1e9;
      w.cat.state='sit';w.cat.stateT=0;w.cat.surface='floor';w.cat.path=null;
      w.cat.x=L.catSpots[2].x;w.cat.y=L.catSpots[2].y;w.cat.target=L.catSpots[2];
      tick(w,()=>w.cat.state===kind,tag+' '+kind+' did not arrive');
      const at=kind==='eat'?L.catCorner.eatSpot:L.catCorner.drinkSpot;
      check(w.cat.x===at.x&&w.cat.y===at.y,kind+' missed its bowl');shot(w,tag+'-'+kind);
      const before=w.catBowls[kind==='eat'?'food':'water'];
      tick(w,()=>w.catBowls[kind==='eat'?'food':'water']<before,kind+' did not consume');
    }
    // A v9 checkpoint can still contain the previous entrance-side route.
    for(const kind of ['putCat','bowls','cat'])for(const returning of [false,true]) {
      w.shop.phase=kind==='cat'?'closing':'opening';w.shop.step=1;
      w.shop.carryingCat=kind==='putCat'&&!returning || kind==='cat'&&returning;
      w.shop.task={kind,time:1,returning,route:R.refillRoute(),called:true};
      const r=restore(w,s=>{
        s.life.checkpoint.nora.x=127;s.life.checkpoint.nora.y=298;
        s.life.checkpoint.nora.path=[{x:127,y:298}];
        s.life.checkpoint.shop.task.route=[{x:616,y:286},{x:616,y:368},{x:127,y:368},{x:127,y:298}];
      });
      check(r.shop.task.time===1 && r.shop.task.returning===returning,'checkpoint replayed task');
      check(r.shop.task.route.slice(-1)[0].x===L.catCorner.noraSpot.x,'stale task route');
      const end=r.barista.path.slice(-1)[0],dest=returning?L.baristaHome:L.catCorner.noraSpot;
      check(end&&end.x===dest.x&&end.y===dest.y,'stale loaded destination');
      for(let n=0;n<1200&&r.barista.path&&r.barista.path.length;n++)SIM.withWorld(r,()=>R.walker(r.barista,.25));
      check(r.barista.x===dest.x&&r.barista.y===dest.y,'loaded route blocked');
    }
    checks.push(tag+' care, both bowls, six legacy routes');
  }
  const intro=SIM.create({random:SIM.seededRandom(81)});intro.firstEntryReady=true;
  tick(intro,()=>intro.memory.life.firstOpening.step===0&&intro.memory.life.firstOpening.time>=2,'first placement absent',120);
  shot(intro,'first-placement');
  const firstReload=restore(intro,s=>{s.life.checkpoint.nora.x=127;s.life.checkpoint.nora.y=298;});
  check(firstReload.barista.x===L.catCorner.noraSpot.x && firstReload.memory.life.firstOpening.time===intro.memory.life.firstOpening.time,'first placement lost progress');
  SIM.skipIntro(firstReload);tick(firstReload,()=>firstReload.shop.phase==='open','old first placement stuck',300);
  check(firstReload.cat.target.id==='cushion','placed cat retained obsolete departure anchor');
  tick(intro,()=>intro.memory.life.firstOpening.step===11&&intro.memory.life.intro.finale===1&&intro.memory.life.intro.time>=1,'intro hug absent',600);
  shot(intro,'intro-hug');frames['intro-room']=__dev.shot(null,{world:intro});
  const old=restore(intro,s=>{s.life.checkpoint.nora.x=127;s.life.checkpoint.nora.y=298;});
  check(old.barista.x===L.catCorner.noraSpot.x&&old.barista.y===L.catCorner.noraSpot.y,'old hug did not move');
  check(old.memory.life.intro.time===intro.memory.life.intro.time&&old.shop.carryingCat,'old hug lost progress/cat');
  SIM.skipIntro(old);tick(old,()=>old.memory.life.intro.finale===2&&old.memory.life.intro.time>=1.5,'lowering absent',60);
  shot(old,'intro-lowering');
  tick(old,()=>old.shop.phase==='open','restored hug stuck',180);
  check(old.memory.life.intro.sign==='outside','sign lost');
  check(old.cat.target.id==='cushion','hug retained obsolete departure anchor');
  window.firstFrames=frames;
  return {passed:true,checks,legacySchema:MEMORY.VERSION};
})()
