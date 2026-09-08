/* Supper uses real private evenings, exact reloads and interruptible routes. */
(function () {
  'use strict';
  const H=SCENE.L.home,frames=window.lifeFrames={},saves=window.dinnerSaves={},results=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function home(mode) {
    const w=__dev.modestWorld();SIM.setMode(w,mode);
    w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
    for(let t=0;t<800 && w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
    check(w.shop.phase==='home','never arrived home');return w;
  }
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),
    memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id){check(!__dev.audit(w).length,'audit '+id+JSON.stringify(__dev.audit(w)));frames[id]=__dev.shot(null,{world:w});SIM._.saveLife(w,0);saves[id]=MEMORY.codec.encode(w.memory);}
  for(const mode of ['game','idle']) {
    let w=home(mode);
    tick(w,15);snap(w,'before-'+mode);
    const savings=w.memory.life.savings,seen=new Set();let reloads=0;
    for(let t=0;t<150 && !w.memory.life.homeDinner.done;t+=.25) {
      const before={x:w.barista.x,y:w.barista.y};SIM.update(w,.25);
      const b=w.barista,m=w.homeMeal;
      check(Math.hypot(b.x-before.x,b.y-before.y)<=9.01,'dinner teleported');
      check(w.shop.phase==='home','idle left before supper finished');
      check(b.y>=H.lane || b.x===H.deskSeat.x,'crossed living-room furniture');
      if(b.y>H.lane && b.y<H.kitchen.y)check(b.x===H.kitchen.door.x,'crossed kitchen wall');
      if(!m)continue;
      const key=m.stage+'-'+b.pose;
      if(seen.has(key) || b.pose==='walk' && b.y<H.kitchen.y)continue;
      seen.add(key);
      const dinner=JSON.stringify(w.memory.life.homeDinner),lit=SCENE.homeKitchenLit(w);
      const r=restore(w);reloads++;
      check(JSON.stringify(r.memory.life.homeDinner)===dinner,'lost dinner checkpoint');
      check(Math.hypot(r.barista.x-b.x,r.barista.y-b.y)<.001,'reload moved her');
      check(SCENE.homeKitchenLit(r)===lit,'reload changed light');
      if(mode==='game') {
        snap(w,key);
        check(SIM.goToSleep(r),'dinner blocked bedtime');
        let previous={x:r.barista.x,y:r.barista.y};
        for(let k=0;k<180 && r.memory.life.homeStory.sleepStep===0;k++) {
          SIM.update(r,.25);const p=r.barista;
          check(Math.hypot(p.x-previous.x,p.y-previous.y)<=9.01,'sleep teleported from dinner');
          if(p.x<H.kitchen.x+H.kitchen.w && p.y>H.lane && p.y<H.kitchen.y)
            check(p.x===H.kitchen.door.x,'sleep crossed kitchen wall');
          previous={x:p.x,y:p.y};
        }
        check(!SCENE.homeKitchenLit(r),'kitchen remained lit after exit');
        check(SIM.skipBedtime(r),'skip bedtime after dinner');
      }
      w=restore(w);
    }
    check(w.memory.life.homeDinner.done && seen.has('0-supperPrep') && seen.has('1-supperEat') && seen.has('2-supperWash'),'incomplete supper');
    check(!SCENE.homeKitchenLit(w),'empty kitchen lit');
    check(w.memory.life.savings===savings,'supper cost money');
    if(mode==='game') {
      tick(w,240);check(w.shop.phase==='home' && w.memory.life.homeDinner.done && !w.homeMeal,'dinner repeated');
      check(SIM.goToSleep(w) && SIM.skipBedtime(w),'later bedtime failed');
    } else {tick(w,80);check(w.shop.phase!=='home','idle did not resume automatic night');}
    SIM.withWorld(w,()=>SIM._.enterHome(w));
    check(!w.memory.life.homeDinner.done && w.memory.life.homeDinner.time===0,'next evening did not reset');
    results.push({mode,reloads,stages:[...seen]});
  }
  // Hidden and planner-open ordinary meals keep moving, with no attendance hold.
  const w=home('game');
  tick(w,15);w.introHidden=true;SIM.plan(w,true);tick(w,30);
  check(w.memory.life.homeDinner.time>=29,'background/planner stopped dinner');
  check(!__dev.audit(w).length,'final audit');
  return {results};
})();
