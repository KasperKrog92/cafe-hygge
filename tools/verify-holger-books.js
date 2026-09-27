/* Holger's books (first-books Pass 3): the remembered offer, a promise kept
   until there is a shelf, the attended handover with Lunafreya's first
   disclosure, and the gift stocked through the same shelving work as a
   purchased box. Every result saves once and survives reloads. */
(function(){
  'use strict';
  const frames={},checks=[],G=IMPROVEMENTS.projects.holgerBooks;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function holger(w){return w.patrons.find(p=>p.regularId==='holger');}
  function until(w,fn,limit,what){for(let t=0;t<(limit||40000);t+=.25){if(fn())return;SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
    const h=holger(w);throw Error('holger books timeout '+(what||'')+' '+JSON.stringify({day:w.memory.life.daysCompleted,hour:w.hour,shop:w.shop.phase,
      h:h&&[h.state,h.storyChapter,h.parcel],flags:Object.keys(w.memory.flags).filter(k=>/books/.test(k)),job:w.memory.life.projects.holgerBooks}));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function valid(w,id){try{MEMORY.codec.validate(w.memory);}catch(e){throw Error(id+': '+e.message);}}
  function snap(w,id,box){const a=__dev.audit(w);check(!a.length,id+' audit '+a);valid(w,id);frames[id]=__dev.shot(box||null,{world:w});}
  function cafe(o){
    o=o||{};const w=__dev.modestWorld({random:SIM.seededRandom(o.seed||42)}),l=w.memory.life;
    if(o.answer==='neighbours'){delete w.memory.flags['luna-cafe-books'];w.memory.flags['luna-cafe-neighbours']=true;}
    if(o.shelves)['window','table','bookshelf'].forEach(id=>{l.projects[id]={stage:'installed',step:IMPROVEMENTS.projects[id].phaseIds.length,time:0};});
    SIM._.installProjects(w);w.memory.bonds.holger.visits=2;return w;
  }
  // Plays the current moment, choosing `pick` at the first choice; stops
  // after `stopAt` (a node id) when given, leaving the scene unfinished.
  function play(w,pick,stopAt){
    const said=[];
    for(let n=0;w.moment&&n<900;n++){
      if(w.moment.phase!=='talk'){SIM.update(w,.25);continue;}
      const line=SIM.momentLine(w);
      if(w.moment.visible===0&&!w.moment.chosenSpeaking)said.push(line.id||'reply');
      SIM.advanceMoment(w,line.choices?pick:undefined);
      if(stopAt&&said[said.length-1]===stopAt&&!w.moment.chosenSpeaking&&w.moment.visible===0)break;
    }
    return said;
  }
  function lineText(w,id){const l=w.moment.lines.find(x=>x.id===id);return l&&l.text;}

  // The offer waits for a later visit, then recalls her actual answer.
  for(const answer of ['books','neighbours']) {
    let w=cafe({answer});
    check(!SIM.holgerBooksAvailable(w),'offer before a later visit');
    until(w,()=>SIM.holgerBooksAvailable(w),40000,'offer '+answer);
    check(holger(w).storyChapter==='offer','wrong chapter');
    SIM.setMode(w,'idle');check(!SIM.holgerBooksAvailable(w)&&!w.memory.flags['holger-books-promised'],'idle showed or consumed the offer');
    SIM.setMode(w,'game');snap(w,'offer-'+answer);
    check(SIM.startHolgerBooks(w),'offer did not start');
    until(w,()=>w.moment&&w.moment.phase==='talk',2000,'approach');
    const recall=SIM.momentLine(w).text;
    check(answer==='books'?/quiet corner for books/.test(recall):/everyone's names/.test(recall),'offer forgot her answer: '+recall);
    check(/somewhere to put them/.test(lineText(w,'when')),'no-shelf promise missing');
    play(w,0,'offer');w=restore(w);   // leave mid-scene: acknowledged nodes saved
    check(!w.memory.flags['holger-books-promised']&&w.memory.flags['holger-books-offer-offer'],'partial offer not saved');
    until(w,()=>SIM.holgerBooksAvailable(w),40000,'resume offer');
    SIM.startHolgerBooks(w);until(w,()=>w.moment&&w.moment.phase==='talk',2000,'approach 2');
    check(SIM.momentLine(w).choices,'resumed offer did not continue at the choice');
    SIM.advanceMoment(w);SIM.advanceMoment(w,1);w=restore(w);   // reveal, then choose
    check(w.memory.flags['holger-books-keep']&&!w.memory.flags['holger-books-lend'],'choice not committed before its reply');
    until(w,()=>SIM.holgerBooksAvailable(w),40000,'resume after choice');
    SIM.startHolgerBooks(w);const rest=play(w,0);
    check(rest[0]==='reply'&&!rest.includes('choice')&&w.memory.flags['holger-books-promised'],'reply not resumed: '+rest.join(','));
    check(!w.memory.flags['holger-books-lend'],'second choice after reload');
    // A promise without shelves waits: no box comes in until there is a place.
    for(let d=w.memory.life.daysCompleted+2;w.memory.life.daysCompleted<d;)until(w,()=>w.memory.life.daysCompleted>=d||holger(w)&&holger(w).parcel,40000,'waiting days');
    check(!w.patrons.some(p=>p.parcel)&&w.memory.life.projects.holgerBooks.stage==='available','box arrived before shelves');
    checks.push(answer+' answer recalled; leave, reload and choice resume without repeats; promise waits for shelves');
  }

  // With shelves: the next visit brings the box. Ignoring it sends it home.
  let w=cafe({shelves:true,seed:7});
  until(w,()=>SIM.holgerBooksAvailable(w),40000,'offer with shelves');
  SIM.startHolgerBooks(w);until(w,()=>w.moment&&w.moment.phase==='talk',2000);
  check(/next time/.test(lineText(w,'when')),'shelf-ready promise missing');play(w,0);
  check(w.memory.flags['holger-books-lend'],'lend choice');
  check(!w.patrons.some(p=>p.parcel)&&!w.counterParcel,'box on the promising visit');
  until(w,()=>holger(w)&&holger(w).parcel==='books',40000,'box visit');
  const day=w.memory.life.daysCompleted;snap(w,'arrives-with-box',{x:0,y:180,w:832,h:200});
  until(w,()=>w.counterParcel,4000,'box on counter');snap(w,'box-on-counter',{x:560,y:200,w:260,h:140,scale:3});
  until(w,()=>SIM.holgerBooksAvailable(w),4000,'gift invite');
  until(w,()=>!holger(w),20000,'ignored visit ends');
  check(!w.counterParcel&&w.memory.life.projects.holgerBooks.stage==='available'&&!w.memory.flags['holger-books-given'],'ignored box was given');
  until(w,()=>w.memory.life.daysCompleted>day&&holger(w)&&holger(w).parcel==='books',40000,'box returns');
  checks.push('box comes the visit after the promise; ignored, he takes it home and brings it again');

  // The handover: disclosure choice, lasting flags, a scheduled gift on the counter.
  until(w,()=>SIM.holgerBooksAvailable(w),6000,'gift invite 2');
  SIM.startHolgerBooks(w);until(w,()=>w.moment&&w.moment.phase==='talk',2000);
  check(/for anyone who stays a while/i.test(lineText(w,'plates')),'lend bookplate line');
  const said=play(w,1,'readings');snap(w,'handover');
  check(said.includes('shop')&&said.includes('readings'),'disclosure not reached');
  w=restore(w);check(!w.memory.flags['holger-books-given']&&w.memory.life.projects.holgerBooks.stage==='available','half-heard gift delivered');
  until(w,()=>SIM.holgerBooksAvailable(w),40000,'gift resume');
  SIM.startHolgerBooks(w);play(w,1);
  check(w.memory.flags['luna-bookshop-later']&&!w.memory.flags['luna-bookshop-fond'],'disclosure choice');
  check(w.memory.flags['holger-books-given']&&w.memory.life.projects.holgerBooks.stage==='scheduled'&&!w.counterParcel,'gift not received once');
  w=restore(w);check(w.memory.life.projects.holgerBooks.stage==='scheduled','scheduled gift lost on reload');
  snap(w,'gift-waiting',{x:560,y:200,w:260,h:140,scale:3});
  until(w,()=>w.memory.life.projects.holgerBooks.stage==='installed',40000,'gift shelved');
  check(w.memory.life.shelf.filter(s=>s==='holger').length===6,'six of Holger\'s books');
  until(w,()=>!String(w.barista.state).startsWith('project'),2000);snap(w,'holger-shelf',{x:250,y:130,w:200,h:150,scale:3});
  for(let t=0;t<20000&&!w.patrons.some(p=>p.regularId==='holger'&&p.parcel);t+=.25){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
  check(!w.patrons.some(p=>p.parcel)&&SIM.holgerChapter(w)===null,'gift repeated');
  checks.push('handover resumes after reload, saves the disclosure choice once, schedules the box, shelves six books');

  // Purchased books before or after the gift share one shelf of twelve.
  for(const order of ['box-first','gift-first']) {
    const v=cafe({shelves:true,seed:3}),l=v.memory.life;
    const box={stage:'installed',step:5,time:0};
    if(order==='box-first'){l.projects.books=box;for(let i=0;i<6;i++)l.shelf.push('box');l.projects.holgerBooks.stage='scheduled';}
    else {l.projects.holgerBooks=box;for(let i=0;i<6;i++)l.shelf.push('holger');l.projects.books.stage='scheduled';}
    const id=order==='box-first'?'holgerBooks':'books';
    until(v,()=>l.projects[id].stage==='installed',40000,order);
    check(l.shelf.length===12&&SCENE.shelfBooks(v).every(b=>b.x+b.w<=SCENE.L.projects.bookshelf.x+SCENE.L.projects.bookshelf.w),order+' overflow');
    snap(v,order,{x:250,y:130,w:200,h:150,scale:3});
  }
  checks.push('box before and after the gift: twelve books, every spine on its board');

  // Kept books stay his: some days he takes one of his own down.
  const k=cafe({shelves:true,seed:5});k.memory.flags['holger-books-promised']=k.memory.flags['holger-books-given']=k.memory.flags['holger-books-keep']=true;
  k.memory.life.projects.holgerBooks={stage:'installed',step:5,time:0};for(let i=0;i<6;i++)k.memory.life.shelf.push('holger');
  let visits=0,own=false;
  for(let t=0;t<200000&&!own&&visits<12;t+=.25){
    const h=holger(k);SIM.update(k,.25);if(k.shop.phase==='home')SIM.goToSleep(k);
    if(!h&&holger(k))visits++;
    const now=holger(k);if(now&&now.hasShelfBook&&now.shelfSource==='holger')own=true;
  }
  check(own,'kept books never visited in '+visits+' visits');
  checks.push('kept books: Holger borrows his own within '+visits+' visits');

  // An established library makes room at once, without wall stocking.
  const f=__dev.furnishedWorld({random:SIM.seededRandom(9)});
  f.memory.flags['holger-introduced']=f.memory.flags['holger-books-promised']=f.memory.flags['holger-books-lend']=true;
  f.memory.flags['luna-cafe-books']=true;f.memory.bonds.holger={known:true,warmth:1,visits:4,lastDay:-1};
  until(f,()=>SIM.holgerBooksAvailable(f),40000,'library gift');
  SIM.startHolgerBooks(f);until(f,()=>f.moment&&f.moment.phase==='talk',2000);
  check(/big shelf/.test(lineText(f,'place')),'library line');play(f,0);
  check(f.memory.life.projects.holgerBooks.stage==='installed'&&f.memory.life.shelf.length===6&&!SCENE.shelfBooks(f).length,'library gift');
  valid(f,'library');
  checks.push('established library receives the gift at once; nothing drawn on absent wall shelves');
  window.holgerBooksFrames=frames;return {checks};
})()
