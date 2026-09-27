/* The room expansion: a 150-coin evening choice, offered only while the café
   is small. The next morning Tomas and his daughter come in after opening and
   the view pulls back to the whole room: the partition and the dusty strips
   beyond it. They lay dust sheets, take the right run down and then the
   front, carry the boards out through the propped door, patch the floor and
   lift the sheets, over about two café days. Guests keep to the small room
   and the crew keeps to real routes; closing sends them home and a reload
   resumes the saved phase. Finished, the room is full and open to everyone,
   with no new furniture or seats. */
(function(){
  'use strict';
  const frames=window.expansionFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function audit(w,when){const a=__dev.audit(w);check(!a.length,'audit '+when+': '+a.join('; '));}
  const full={x:0,y:0,w:960,h:600,scale:1};

  // Not for a room that is already full.
  const furnished=__dev.furnishedWorld({random:SIM.seededRandom(301)});
  check(!IMPROVEMENTS.offered(furnished,'expansion'),'offered to a full room');

  // A small café a week in, with savings, on an evening at home.
  let w=__dev.modestWorld({random:SIM.seededRandom(300)});
  const life=w.memory.life;
  life.projects.window={stage:'installed',step:4,time:0};life.projects.table={stage:'installed',step:6,time:0};R.installProjects(w);
  life.daysCompleted=6;life.openSeconds=6*780;life.savings=200;SIM.setMode(w,'game');
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  check(w.shop.phase==='home','no evening');
  SIM.plan(w,true);
  check(IMPROVEMENTS.offered(w,'expansion')&&IMPROVEMENTS.all.expansion.price===150,'not offered for 150 in the small room');
  const funds=life.savings;
  check(SIM.buyProject(w,'expansion'),'purchase rejected: '+JSON.stringify({funds,plan:life.plannedTonight,mode:life.mode,phase:w.shop.phase}));
  check(life.savings===funds-150,'charged '+(funds-life.savings));
  check(!SIM.buyProject(w,'expansion'),'charged twice');
  const tables=w.tables.length,seats=w.seats.length;
  SIM.goToSleep(w);
  // Morning: the job is waiting, the view still small, until they arrive.
  for(let t=0;t<2000&&(w.shop.phase==='home'||life.projects.expansion.stage!=='scheduled');t+=.25)SIM.update(w,.25);
  check(life.projects.expansion.stage==='scheduled'&&w.shop.phase!=='home'&&SCENE.presentation(w)===L.rooms.small,'the view pulled back before anybody came');
  checks.push('offered only to the small room, 150 coins charged once; the view stays small until the crew comes');

  // The crew comes in after opening; the view pulls back.
  for(let t=0;t<1200&&!w.expansionCrew;t+=.25)SIM.update(w,.25);
  check(w.expansionCrew&&life.projects.expansion.stage!=='scheduled','the crew never came');
  check(SCENE.presentation(w)===L.rooms.full&&SCENE.room(w)===L.rooms.small,'the view did not pull back, or the floor opened early');
  check(!SIM.visitorInvites(w).some(a=>a.quiet),'Tomas\'s daughter offered a hello she does not have');
  for(let t=0;t<20;t+=.25)SIM.update(w,.25);
  frames['crew-arrives']=__dev.shot(full,{world:w});
  const startDay=life.daysCompleted,shots={};let propped=false,closed=false,reloaded=false,audits=0;
  for(let t=0;t<30000&&w.memory.life.projects.expansion.stage!=='installed';t+=.25){
    SIM.update(w,.25);
    const p=w.memory.life.projects.expansion;
    if(w.shop.phase==='home'){
      if(!closed){closed=true;check(!w.expansionCrew&&p.stage==='working'&&p.step<6,'closing did not send the crew home mid-job');
        // A reload keeps the saved phase.
        const keep=JSON.stringify(p);w=restore(w);check(JSON.stringify(w.memory.life.projects.expansion)===keep,'reload lost the phase');
        reloaded=true;SIM.setMode(w,'game');
        check(SCENE.presentation(w)===L.rooms.full,'the view closed in again');
      }
      SIM.goToSleep(w);continue;
    }
    if(w.door.propped&&w.door.open>.9)propped=true;
    const key=p.stage==='working'?p.step:-1;
    if(key>=0&&!shots[key]&&p.time>60&&w.expansionCrew){shots[key]=1;frames['phase-'+key+'-'+IMPROVEMENTS.all.expansion.phaseIds[key]]=__dev.shot(full,{world:w});}
    w.patrons.forEach(q=>{if(!q.outside)check(q.x<=832&&q.y<=516,'a guest wandered behind the partition: '+q.name+' at '+Math.round(q.x)+','+Math.round(q.y));});
    (w.expansionCrew||[]).forEach(a=>check(a.x<=832&&a.y<=516,'the crew worked outside the room: '+a.name+' at '+Math.round(a.x)+','+Math.round(a.y)));
    if(Math.floor(t)%60===0&&t%1===0&&w.shop.phase==='open'){audit(w,'during '+(IMPROVEMENTS.all.expansion.phaseIds[p.step]||p.stage));audits++;}
  }
  const p=w.memory.life.projects.expansion;
  check(p.stage==='installed'&&w.memory.life.room==='full','the partition never came down');
  check(closed&&reloaded&&propped,'the job never crossed a closing and a reload, or the door was never propped');
  check(w.memory.life.daysCompleted-startDay<=2,'it took '+(w.memory.life.daysCompleted-startDay)+' café days');
  check(Object.keys(shots).length===6,'missing phases: '+Object.keys(shots));
  checks.push('Tomas and his daughter lay sheets, take the right and front runs down, carry the boards out through the propped door, patch and sweep, over two café days; closing sends them home, a reload keeps the phase ('+audits+' audits)');

  // Finished: the whole room, nothing new in it.
  for(let t=0;t<120&&w.expansionCrew;t+=.25)SIM.update(w,.25);
  check(!w.expansionCrew,'the crew never left');
  check(SCENE.room(w)===L.rooms.full&&SCENE.presentation(w)===L.rooms.full,'the room did not open');
  const w2=restore(w);
  check(w2.tables.length===tables&&w2.seats.length===seats,'the expansion granted furniture');
  const reach=SIM.withWorld(w2,()=>{const probe={x:L.entryApproach.x,y:L.entryApproach.y,kind:'patron',speed:50};R.makePath(probe,900,540);return !!(probe.path&&probe.path.length);});
  check(reach,'the new floor cannot be reached');
  audit(w,'after');
  frames['room-opened']=__dev.shot(full,{world:w});
  check(!IMPROVEMENTS.offered(w2,'expansion')||w2.memory.life.projects.expansion.stage==='installed','offered again');
  checks.push('the room is full after a reload: the new floor is reachable and no table or seat was added');
  return {checks};
})()
