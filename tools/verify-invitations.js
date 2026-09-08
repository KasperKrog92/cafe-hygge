// Real activities finish before a meeting; the surrounding room stays alive.
(function(){
  const R=SIM._,L=SCENE.L,original=window.__world,frames={};
  function check(ok,msg){if(!ok)throw Error(msg);}
  function until(w,fn){for(let n=0;n<2400;n++){if(fn())return;SIM.update(w,.25);}throw Error('timeout '+w.barista.state+' '+(w.moment&&w.moment.phase));}
  function tick(w,seconds){for(let t=0;t<seconds;t+=.25)SIM.update(w,.25);}
  function invite(w,owner){check(SIM.beginMoment(w,[{speaker:'Lunafreya',text:'There. Now I have a little time to sit with you.'}],owner,function(){}),'invitation rejected');}
  function finish(w){SIM.leaveMoment(w);until(w,()=>!w.moment);}
  function fresh(){const w=__dev.furnishedWorld({random:SIM.seededRandom(41)});w.spawnT=1e9;w.barista.idleT=999;return w;}
  function guest(w,name){const p=R.makePatron(w,name);p.wantsBook=false;p.ownBook=true;p.outdoor=false;R.enqueueArrival(w,p,0,true);return p;}
  try {
    const w=fresh(),b=w.barista,owner=w.patrons.find(p=>p.state==='seated');
    const customer=guest(w,'Signe');
    until(w,()=>b.state==='prepping');
    const state=b.state,path=b.path,step=b.stepIdx;
    invite(w,owner);check(w.moment.phase==='waiting'&&b.state===state&&b.path===path&&b.stepIdx===step,'drink interrupted on click');
    check(!SIM.beginMoment(w,[],owner,function(){}),'duplicate accepted');
    check(!SIM.advanceMoment(w),'spoke before finishing work');
    frames.waiting=__dev.shot(null,{world:w});
    until(w,()=>w.moment.phase==='approach'||w.moment.phase==='talk');
    check(b.orders.every(o=>o.patron!==customer)&&!b.holding,'approached with unfinished drink');
    until(w,()=>w.moment.phase==='talk');
    const queued=guest(w,'Mikkel'),hour=w.hour,spawn=w.spawnT,ownerStay=owner.stay;
    const departing=w.patrons.find(p=>p!==owner&&p!==customer&&p.state==='seated');
    check(departing,'departure fixture missing');departing.stay=0;departing.sipPhase=0;
    w.moment.visible=999;frames.talking=__dev.shot(null,{world:w});
    w.momentHidden=true;const visible=w.moment.visible;
    tick(w,120);
    check(queued.state==='queueing'&&(!queued.path||!queued.path.length),'new guest did not reach counter');
    check(departing.gone,'background guest could not leave');
    check(customer.state!=='waitDrink'&&customer.state!=='pickup','ready drink was not collected');
    check(owner.stay===ownerStay&&!owner.gone,'invited speaker left');
    check(w.hour===hour&&w.spawnT===spawn&&w.shop.phase==='open','new obligations started');
    check(w.moment.visible===visible,'hidden dialogue advanced');w.momentHidden=false;
    frames.background=__dev.shot(null,{world:w});
    finish(w);until(w,()=>queued.state==='seated');
    check(!__dev.audit(w).length,'post-service audit');

    for(const task of ['water','candles','fire','chalk','piano']) {
      const q=fresh();window.__world=q;__dev.noraDo(task);SIM.update(q,.25);
      if(task==='piano')q.barista.pianoDur=2;
      const at=q.barista.state;invite(q,q.patrons.find(p=>p.state==='seated'));
      check(q.moment.phase==='waiting'&&q.barista.state===at,'chore interrupted '+task);
      until(q,()=>q.moment.phase==='talk');check(q.barista.state==='idle'&&!q.barista.holding,'unfinished chore '+task);
      finish(q);check(!__dev.audit(q).length,'chore audit '+task);
    }
    const q=fresh(),project=q.memory.life.projects.table;
    project.stage='working';project.step=0;project.time=1;
    Object.assign(q.barista,{state:'projectWork',project:'table',projectSession:1,x:L.projects.table.work.x,y:L.projects.table.work.y,path:null});
    invite(q,q.patrons.find(p=>p.state==='seated'));until(q,()=>q.moment.phase==='talk');
    check(project.time===3&&project.step===0,'project did not finish just its current hand action');finish(q);
    const c=fresh();Object.assign(c.barista,{state:'polish',stateT:.5,holding:'cup'});
    invite(c,c.patrons[0]);SIM.leaveMoment(c);
    check(!c.moment&&c.barista.state==='polish'&&c.barista.stateT===.5&&c.barista.holding==='cup','cancelled queue changed activity');
    window.introFrames=frames;
    return {passed:true,checks:'drink completion; queued cancellation; five chores; project boundary; background pickup, queue and departure; hidden speech; speaker reservation; resumed service; audit'};
  } finally {window.__world=original;}
})()
