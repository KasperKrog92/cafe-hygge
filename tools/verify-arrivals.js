/* Occupancy through real service, plus admission and popularity boundaries. */
(function () {
  'use strict';
  const R=SIM._,results=[],frames={};
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,n){for(let t=0;t<n;t+=.25)SIM.update(w,.25);}
  function cafe(seats,days,seed) {
    const w=seats==='full' ? __dev.furnishedWorld({random:SIM.seededRandom(seed)}) :
      __dev.modestWorld({random:SIM.seededRandom(seed)});
    const s=JSON.parse(MEMORY.codec.encode(w.memory));
    s.life.daysCompleted=Math.max(1,Math.floor(days));s.life.openSeconds=days*780;
    s.life.hour=8.5;s.life.checkpoint=null;
    if(seats>=6)s.life.projects.table={stage:'installed',step:6,time:0};
    if(seats>=8){s.life.projects.window={stage:'installed',step:4,time:0};
      s.life.projects.windowSeat={stage:'installed',step:4,time:0};s.flags['gerda-pillow-right']=true;
      s.flags['gerda-pillow-left']=true;s.flags['gerda-pillows-accepted']=true;}
    return SIM.create({memory:MEMORY.createStore({state:s}),random:SIM.seededRandom(seed)});
  }
  for(const seed of [42,84])for(const seats of [4,6,8,'full'])for(const days of [0,5,15]) {
    if(seed===84 && days!==15)continue;
    const w=cafe(seats,days,seed),capacity=w.seats.filter(s=>!s.artist&&!s.piano).length;
    check(seats==='full'||capacity===seats,'wrong capacity fixture '+seats+': '+capacity);
    const target=R.arrivalTarget(w);
    let sum=0,seatedSum=0,samples=0,peak=0,waitingPeak=0;
    for(let t=0;t<720;t+=.25) {
      SIM.update(w,.25);
      peak=Math.max(peak,w.patrons.length);
      waitingPeak=Math.max(waitingPeak,w.patrons.filter(p=>!p.seat&&p.terraceTable==null&&!p.gone&&
        ['returnBook','return','collectUmbrella','exit'].indexOf(p.state)<0).length);
      if(t>=240 && t%5===0) {
        sum+=w.patrons.filter(p=>p.terraceTable==null&&!p.gone&&!(p.seat&&(p.seat.artist||p.seat.piano))).length;
        seatedSum+=w.seats.filter(s=>s.taken&&!s.artist&&!s.piano).length;samples++;
      }
      if(t%60===0)check(!__dev.audit(w).length,'occupancy audit '+seats+'/'+days+': '+__dev.audit(w).join(', '));
    }
    const report={capacity,days,seed,target,peak,waitingPeak,average:sum/samples/capacity,seated:seatedSum/samples/capacity};
    results.push(report);
    check(waitingPeak<=3,'unbounded waiting queue '+JSON.stringify(report));
    check(target===Math.round(capacity*(days===0?.5:days===5?.75:.95)),'wrong fullness target');
    check(report.average>=target/capacity-.12,'cafe stayed below target '+JSON.stringify(report));
    if(days===15)check(report.seated>=.87,'popular cafe lacked settled readers '+JSON.stringify(report));
    frames['occupancy-'+seats+'-'+days+'-'+seed]=__dev.shot(null,{world:w});
  }
  const w=cafe(8,15,84),before=w.memory.life.openSeconds;
  tick(w,2);check(w.memory.life.openSeconds===before,'mature popularity must saturate');
  w.memory.life.openSeconds=123.5;
  tick(w,2);check(w.memory.life.openSeconds===125.5,'open time did not accrue');
  const save=MEMORY.codec.encode(w.memory);
  const restored=SIM.create({memory:MEMORY.createStore({state:MEMORY.codec.decode(save).state})});
  check(restored.memory.life.openSeconds===125.5,'reload added/lost popularity');
  restored.shop.accepting=false;restored.shop.phase='home';restored.memory.life.homeStory=MEMORY.freshHomeStory(true);
  tick(restored,20);check(restored.memory.life.openSeconds===125.5,'home gained popularity');
  const blocked=cafe(8,15,84);blocked.patrons=[];
  blocked.seats.forEach(s=>{s.taken=true;});
  for(let i=0;i<20;i++){blocked.spawnT=0;R.updateSpawning(blocked,.25);}
  check(!blocked.patrons.length,'occupied seats admitted guests');
  blocked.seats.forEach(s=>{s.taken=false;blocked.tables[s.table].items.push({owner:null,side:s.side,kind:'cup'});});
  for(let i=0;i<20;i++){blocked.spawnT=0;R.updateSpawning(blocked,.25);}
  check(!blocked.patrons.length,'dirty seats admitted guests');
  blocked.tables.forEach(t=>{t.items=[];});
  blocked.spawnT=0;R.updateSpawning(blocked,.25);
  check(blocked.patrons.length>0,'cleaned seats did not release admission');
  const daytime=R.arrivalTarget(blocked);blocked.daylight=0;
  check(R.arrivalTarget(blocked)===daytime&&daytime===8,'evening target dropped');
  window.lifeFrames=frames;
  return {results,checks:['real service occupancy','bounded queue','installed capacity','dirty seats','saved open time','no offline/home growth','evening target','audit']};
})();
