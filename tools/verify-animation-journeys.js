/* Real simulation scenarios, isolated worlds; use a disposable browser (audio off). */
(function(){
 const failures=[], results=[];
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;const g=canvas.getContext('2d');
 function fresh(empty){
  const w=SIM.create();w.spawnT=1e9;
  Object.values(w.regulars).forEach(r=>{r.hour=99;});
  if(empty){w.patrons=[];w.seats.forEach(s=>s.taken=false);w.tables.forEach(t=>t.items=[]);}
  return w;
 }
 function run(w,name,seconds,entity,done){
  const seen=new Set();let finished=false;
  for(let i=0;i<seconds*20;i++){
   SIM.update(w,.05);seen.add(entity.state);
   if(w.brew.active)seen.add(w.brew.stage);
   if(i%4===0)SCENE.composeFrame(g,w);
   if(done(seen)){finished=true;break;}
  }
  if(!finished) failures.push(name+' did not complete');
  const audit=__dev.audit(w);if(audit.length) failures.push(name+': '+audit.join(', '));
  results.push({name,states:Array.from(seen),finished,audit});
 }
 for(const action of ['stretch','chalk','water','candles','fire','piano']){
  const w=fresh(true),b=w.barista;b.forcedTask=action;b.idleT=0;
  if(action==='candles')w.candles.forceRound=true;
  run(w,'Nora '+action,240,b,seen=>seen.size>1&&b.state==='idle');
 }
 for(const action of ['eat','window','bookshelf','counter','topShelf','piano','lap','mote','knead']){
  const w=fresh(false),cat=w.cat;cat.forced=action;
  run(w,'cat '+action,150,cat,seen=>seen.size>1&&['sleep','sit','perch','loaf','lap','groom','eat'].includes(cat.state)&&cat.state!=='walk');
 }
 for(const prep of ['coffee_milk','coffee','tea','milk','matcha_hot','matcha_iced','food']){
  const w=fresh(true),p=SIM._.makePatron('Test');p.drink=SIM._.DRINKS.find(d=>d.prep===prep);p.wantsBook=false;p.ownBook=false;p.laptop=false;
  SIM._.enqueueArrival(w,p,0,true);
  run(w,'order '+prep,150,p,()=>p.state==='seated');
 }
 if(failures.length)throw Error(JSON.stringify({failures,results}));
 return {failures,results};
})()
