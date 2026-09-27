/* Books for the little wall shelves: a separate evening purchase, the real
   morning carry, interruptible stocking with exact save boundaries, visible
   fill, browsing that starts with the first handful and real borrowing. */
(function(){
  'use strict';
  const frames={},checks=[],B=IMPROVEMENTS.projects.books;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function job(w){return w.memory.life.projects.books;}
  function until(w,fn,limit,what){for(let t=0;t<(limit||2400);t+=.25){if(fn())return;SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
    throw Error('books timeout '+(what||'')+' '+JSON.stringify({shop:w.shop.phase,hour:w.hour,job:job(w),shelf:w.memory.life.shelf,b:w.barista.state}));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function valid(w,id){try{MEMORY.codec.validate(w.memory);}catch(e){throw Error(id+': '+e.message);}}
  function snap(w,id){const a=__dev.audit(w);check(!a.length,id+' audit '+a);valid(w,id);
    frames[id]=__dev.shot({x:250,y:130,w:200,h:150,scale:3},{world:w});}
  function shelved(w){return SCENE.shelfBooks(w).filter(b=>!b.pending).length;}
  function withShelves(o){
    const w=__dev.modestWorld(Object.assign({random:SIM.seededRandom(42)},o||{}));
    const l=w.memory.life;
    ['window','table','bookshelf'].forEach(id=>{l.projects[id]={stage:'installed',step:IMPROVEMENTS.projects[id].phaseIds.length,time:0};});
    SIM._.installProjects(w);return w;
  }
  function toHome(w){w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
    for(let t=0;t<3000&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);check(w.shop.phase==='home','no home');}

  // The planner offers books only for installed wall shelves.
  let w=__dev.modestWorld({random:SIM.seededRandom(42)});SIM.setMode(w,'game');w.memory.life.savings=200;toHome(w);SIM.plan(w,true);
  check(!IMPROVEMENTS.offered(w,'books') && !SIM.buyProject(w,'books'),'books offered without shelves');
  w=withShelves();SIM.setMode(w,'game');w.memory.life.savings=200;toHome(w);SIM.plan(w,true);
  check(IMPROVEMENTS.offered(w,'books'),'books not offered with installed shelves');
  const before=w.memory.life.savings;
  check(SIM.buyProject(w,'books')&&w.memory.life.savings===before-B.price,'book purchase charge');
  check(!SIM.buyProject(w,'books')&&w.memory.life.savings===before-B.price,'duplicate book charge');
  w=restore(w);check(job(w).stage==='purchased'&&w.memory.life.savings===before-B.price,'purchase reload');
  SIM.plan(w,false);check(SIM.goToSleep(w),'bedtime');until(w,()=>w.shop.phase==='open',3000,'morning');
  check(job(w).stage==='scheduled','box not scheduled next morning');
  check(!SCENE.canBrowse(w)&&shelved(w)===0,'empty shelves browsable');
  checks.push('offered only for installed shelves; one charge across a reload; scheduled next morning');

  // Carry, open, then every stocking phase across a real save boundary.
  until(w,()=>w.barista.holding==='parcel'&&job(w).stage==='arrived',3000,'carry');snap(w,'carry');
  let counts=[];
  for(let step=0;step<B.phases.length;step++) {
    until(w,()=>job(w).step===step&&job(w).stage==='working'&&job(w).time>=3,4000,'step '+step);
    const saved=JSON.stringify([job(w),w.memory.life.shelf]);
    w=restore(w);check(JSON.stringify([job(w),w.memory.life.shelf])===saved,'partial stocking reload '+step);
    check(w.memory.life.shelf.length===IMPROVEMENTS.stocked(B,step),'shelf and step disagree at '+step);
    until(w,()=>w.barista.state==='projectWork',4000,'resume '+step);
    snap(w,'step-'+step);counts.push(shelved(w));
  }
  until(w,()=>job(w).stage==='installed',4000,'installed');
  check(w.memory.life.shelf.length===6 && w.memory.life.shelf.every(s=>s==='box'),'six purchased books');
  check(!SCENE.hasFurniture(w,'book-worksite'),'box reservation not released');
  for(let i=1;i<counts.length;i++)check(counts[i]>=counts[i-1],'shelf emptied during stocking');
  snap(w,'stocked');
  checks.push('carry, open, three handfuls and fold, each surviving a reload; box released: '+counts.join(','));

  // Orders win at a stroke boundary; the placed books stay placed.
  w=withShelves({random:SIM.seededRandom(7)});job(w).stage='arrived';
  until(w,()=>job(w).stage==='working'&&job(w).step===1&&w.barista.state==='projectWork',4000,'shelving');
  const p=SIM._.makePatron(w,'Test');SIM._.enqueueArrival(w,p,0,true);
  until(w,()=>w.barista.state!=='projectWork',400,'interrupted');
  check(job(w).time%3<1e-6||job(w).time===0,'interrupted mid-stroke');
  until(w,()=>job(w).stage==='installed',6000,'finish after service');
  checks.push('a customer interrupts shelving at a stroke boundary and the job finishes later');

  // Closing mid-job holds the box; the next day finishes it.
  w=withShelves({random:SIM.seededRandom(11)});job(w).stage='arrived';
  until(w,()=>job(w).step===2&&job(w).stage==='working',4000,'second handful');
  const held=w.memory.life.shelf.length;toHome(w);w=restore(w);
  check(w.memory.life.shelf.length===held&&SCENE.hasFurniture(w,'book-worksite'),'closing lost the box');
  SIM.setMode(w,'game');SIM.goToSleep(w);until(w,()=>job(w).stage==='installed',8000,'next-day finish');
  checks.push('closing with an open box keeps its books and resumes next day');

  // Browsing waits for real books, then a real guest borrows and returns one.
  w=withShelves({random:SIM.seededRandom(3)});job(w).stage='arrived';
  until(w,()=>w.memory.life.shelf.length>=2,4000,'first handful');
  until(w,()=>!String(w.barista.state).startsWith('project'),600,'back to service');
  check(SCENE.canBrowse(w),'first handful not browsable');
  const reader=SIM._.makePatron(w,'Reader');reader.wantsBook=true;reader.ownBook=false;reader.laptop=false;
  SIM._.enqueueArrival(w,reader,0,true);
  until(w,()=>reader.state==='browse'&&!(reader.path&&reader.path.length)&&reader.stateT>1,3000,'browse');snap(w,'browsing');
  until(w,()=>reader.hasShelfBook&&reader.state==='toSeat',600,'borrow');
  const slot=reader.shelfSlot;
  check(slot!=null&&SCENE.shelfBooks(w)[slot].loaned,'borrowed book still drawn');
  until(w,()=>reader.state==='seated',600,'seat');snap(w,'reading');
  reader.stay=0;until(w,()=>reader.state==='returnBook'||reader.gone,1200,'return trip');
  until(w,()=>!reader.hasShelfBook||reader.gone,600,'returned');
  check(!SCENE.shelfBooks(w)[slot].loaned,'returned book missing');
  checks.push('browsing starts with the first handful; a guest borrows slot '+slot+', reads and slides it back');

  // An established library keeps its own shelf and never offers the box.
  const furnished=__dev.furnishedWorld();
  check(SCENE.canBrowse(furnished)&&!SCENE.hasFurniture(furnished,'wall-shelves')&&!IMPROVEMENTS.offered(furnished,'books'),'established library changed');
  check(SCENE.browseSpot(furnished).x===SCENE.L.library.browseSpot.x,'library browse spot moved');
  // The codec refuses a shelf that disagrees with its stocking project.
  const bad=JSON.parse(MEMORY.codec.encode(w.memory));bad.life.shelf.push('box');
  let refused=false;try{MEMORY.codec.validate(bad);}catch(e){refused=true;}
  check(refused,'codec accepted an extra book');
  checks.push('established library unchanged; codec refuses a mismatched shelf');
  window.booksFrames=frames;return {checks};
})()
