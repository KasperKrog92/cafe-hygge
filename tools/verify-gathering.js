/* A reading afternoon: Ida's proposal (both rules; idle hides it), her next
   visit booking the afternoon, the readers she knows coming in before anyone
   else with books of their own, the invitation waiting (never playing itself;
   idle shows nothing), the scene in a wide shot voiced by whoever is there,
   a reload mid-scene resuming on her next visit, an afternoon never begun
   going home at closing and coming back, a small room that fits only a few,
   and the afternoon's traces afterwards. */
(function(){
  'use strict';
  const frames={},checks=[],R=SIM._,G=CAST.gathering;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function until(w,f,s,msg){for(let t=0;t<s;t+=.25){if(f())return;SIM.update(w,.25);}if(!f())throw Error(msg);}
  function audit(w,where){const a=__dev.audit(w);check(!a.length,where+': '+a.join('; '));}
  const MET={'ida-introduced':true,'holger-introduced':true,'kasper-introduced':true,'freya-introduced':true};
  function world(kind,seed,flags){
    const w=(kind==='modest'?__dev.modestWorld:__dev.furnishedWorld)({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=7;w.memory.life.openSeconds=7*780;
    Object.assign(w.memory.flags,MET,flags||{});
    ['holger','kasper','freya','ida','gerda'].forEach(id=>{w.memory.bonds[id]={known:true,warmth:1,visits:6,lastDay:-1};});
    setHour(w,14.5);return w;
  }
  function callIda(w){w.regulars.ida.force=true;w.spawnT=0;}
  function talk(w,choice,max){
    for(let n=0;n<(max||80)&&w.moment;n++){
      if(w.moment.phase!=='talk'){SIM.update(w,.25);continue;}
      const line=SIM.momentLine(w);w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
  }
  function readers(w){return w.patrons.filter(p=>p.gathering&&!p.outside);}

  // 1. Ida proposes it on a later visit; both rules; idle hides it; nothing booked yet.
  ['reading-quiet','reading-sentence'].forEach(function(rule,choice){
    const w=world('furnished',3+choice,{'ida-reading-done':false});delete w.memory.flags['ida-reading-done'];
    callIda(w);
    until(w,()=>SIM.regularStoryAvailable(w,'ida'),300,'Ida never offered the reading afternoon');
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,'ida'),'idle mode showed Ida\'s proposal');SIM.setMode(w,'game');
    check(SIM.invitations(w).some(i=>i.key==='ida'),'no invitation for Ida\'s proposal');
    check(SIM.startRegularStory(w,'ida'),'proposal would not start');
    talk(w,choice);
    check(w.memory.flags['ida-reading-done']&&w.memory.flags[rule],'proposal did not save '+rule);
    for(let t=0;t<60;t+=.25)SIM.update(w,.25);
    check(!w.gathering,'the afternoon was booked on the same visit as the proposal');
  });
  checks.push('Ida proposes a reading afternoon on a later visit (idle hides it); either rule is saved; nothing is booked the same day');

  // 2. Her next visit brings it: the readers she knows come in first, each with
  // their own book (Kasper without his laptop), and the afternoon waits.
  let w=world('furnished',21,{'ida-reading-done':true,'reading-sentence':true,'gerda-introduced':true});
  callIda(w);
  until(w,()=>!!w.gathering,300,'Ida\'s visit did not bring the afternoon');
  const g=w.gathering;
  check(JSON.stringify(g.guests)===JSON.stringify(['holger','gerda','kasper']),'unexpected readers '+g.guests);
  const before=w.patrons.map(p=>p.id),order=[];
  until(w,()=>{w.patrons.forEach(p=>{if(before.indexOf(p.id)<0&&order.indexOf(p)<0)order.push(p);});return !!SIM.gatheringReady(w);},600,'the afternoon never became ready');
  const called=order.filter(p=>p.regularId&&g.guests.indexOf(p.regularId)>=0);
  check(order.slice(0,called.length).every(p=>p.gathering),'someone else came in before the invited readers: '+order.map(p=>p.name));
  readers(w).forEach(function(p){
    check(p.reading&&p.bookColor===G.books[p.regularId]&&!p.laptopActive&&!p.knitting,p.name+' is not reading their own book');
  });
  const kasper=readers(w).find(p=>p.regularId==='kasper');
  check(kasper&&!w.tables.some(tb=>tb.items.some(it=>it.owner===kasper.id&&it.kind==='laptop')),'Kasper brought the laptop');
  const host=SIM.gatheringReady(w);
  check(host.regularId==='ida'&&SIM.invitations(w).some(i=>i.key==='gathering'&&i.icon==='book'&&i.label==='Begin the reading afternoon'),'no labelled invitation over Ida');
  audit(w,'booked afternoon');
  checks.push('Ida\'s next visit brings it: '+readers(w).map(p=>p.name).join(', ')+' read their own books; invited readers come in first');

  // 3. It waits and never plays itself; idle mode shows nothing.
  for(let t=0;t<200;t+=.25){SIM.update(w,.25);check(!w.moment&&!w.memory.flags['gathering-reading-done'],'the afternoon played itself');}
  check(SIM.gatheringReady(w),'the invitation expired while waiting');
  SIM.setMode(w,'idle');check(!SIM.invitations(w).some(i=>i.key==='gathering'),'idle mode showed the afternoon');SIM.setMode(w,'game');
  checks.push('ready when you want to begin: it waits, never plays itself, and idle shows nothing');

  // 4. The scene: a wide shot, voiced only by those who are there, then the
  // traces it leaves.
  const there=readers(w).map(p=>p.regularId).sort();
  check(SIM.startGathering(w)&&w.moment.wide,'the afternoon did not begin in a wide shot');
  const names=readers(w).map(p=>p.name).concat(['Lunafreya']);
  w.moment.lines.forEach(function(l){
    check(names.indexOf(l.speaker)>=0,'a line for someone not there: '+l.id+' '+l.speaker);
    check(!l.variant||l.variant==='sentence','quiet-rule line under the sentence rule: '+l.id);
  });
  check(w.moment.lines.some(l=>l.id==='s-gerda')&&!w.moment.lines.some(l=>l.id==='antonia'),'lines do not follow who came');
  until(w,()=>w.moment.phase==='talk',30,'Lunafreya never reached Ida');
  for(let n=0;n<40&&SIM.momentLine(w).id!=='hush';n++){w.moment.visible=999;SIM.advanceMoment(w);}
  frames['gathering-hush']=__dev.shot(null,{world:w});
  talk(w,0);
  const f=w.memory.flags;
  check(f['gathering-reading-done']&&there.every(id=>f['reading-afternoon-'+id]),'the afternoon left no memory of who was there');
  check(!w.gathering&&!R.expectedGuests(w),'the afternoon kept holding seats');
  until(w,()=>!readers(w).some(p=>p.state==='seated'),400,'the readers never went home');
  audit(w,'after the afternoon');
  check(!SIM.invitations(w).some(i=>i.key==='gathering'),'the afternoon offered again');
  const holger=CAST.regulars.find(r=>r.id==='holger');
  check(holger.lines.musing.some(m=>m.flags&&m.flags[0]==='reading-afternoon-holger'),'no afterwards musing for Holger');
  checks.push('the scene: a wide shot voiced by '+there.join(', ')+' with one sentence each; everyone goes home in their own time; later musings remember it');

  // 5. A reload in the middle resumes on Ida's next visit at the next line.
  w=world('furnished',31,{'ida-reading-done':true,'reading-quiet':true});
  callIda(w);until(w,()=>SIM.gatheringReady(w),600,'second afternoon not ready');
  SIM.startGathering(w);until(w,()=>w.moment.phase==='talk',30,'no approach');
  for(let n=0;n<4;n++){w.moment.visible=999;SIM.advanceMoment(w);}
  const next=SIM.momentLine(w).id;
  check(!w.moment.lines.some(l=>l.variant==='sentence')&&w.moment.lines.some(l=>l.id==='proud'),'quiet rule lines wrong');
  w=restore(w);
  check(!w.memory.flags['gathering-reading-done']&&w.memory.flags['gathering-reading-welcome'],'partial afternoon not saved');
  check(!w.gathering&&!SIM.gatheringReady(w),'the afternoon survived a reload without Ida');
  setHour(w,21.45);until(w,()=>w.shop.phase==='home',900,'no evening after the reload');
  SIM.goToSleep(w);until(w,()=>w.shop.phase==='open',2000,'no morning after the reload');
  setHour(w,14.5);callIda(w);until(w,()=>SIM.gatheringReady(w),600,'Ida did not bring the afternoon back');
  SIM.startGathering(w);
  check(SIM.momentLine(w).id===next,'resumed at '+SIM.momentLine(w).id+' instead of '+next);
  talk(w,0);check(w.memory.flags['gathering-reading-done'],'resumed afternoon did not finish');
  checks.push('a reload mid-afternoon keeps its lines; Ida brings it back and it resumes at "'+next+'"');

  // 6. Never begun: closing sends everyone home; Ida brings it another day.
  w=world('furnished',41,{'ida-reading-done':true,'reading-quiet':true});
  callIda(w);until(w,()=>SIM.gatheringReady(w),600,'third afternoon not ready');
  setHour(w,21.45);
  until(w,()=>w.shop.phase==='home',900,'closing deadlocked on the afternoon');
  check(!w.memory.flags['gathering-reading-done'],'an unbegun afternoon counted as done');
  check(!R.expectedGuests(w),'seats still held after closing');
  SIM.goToSleep(w);until(w,()=>w.shop.phase==='open',2000,'no next morning');
  setHour(w,14.5);callIda(w);
  until(w,()=>w.gathering&&w.gathering.day===w.memory.life.daysCompleted,300,'the afternoon did not come back');
  checks.push('an afternoon never begun goes home at closing and Ida brings it back another day');

  // 7. A small room: a two-table café fits Ida and whoever can find a seat;
  // walk-ins never take a seat an invited reader could use.
  w=world('modest',51,{'ida-reading-done':true,'reading-sentence':true});
  callIda(w);until(w,()=>!!w.gathering,300,'modest booking');
  const known=w.patrons.map(p=>p.id),late=[];
  until(w,()=>{
    w.patrons.forEach(function(p){if(known.indexOf(p.id)<0){known.push(p.id);late.push(p);}});
    return !!SIM.gatheringReady(w);},900,'the small afternoon never became ready');
  const firstOther=late.findIndex(p=>!p.gathering);
  check(firstOther<0||late.slice(firstOther).every(p=>!p.gathering)||!late.length,'someone else came in ahead of an invited reader: '+late.map(p=>p.name));
  check(readers(w).filter(p=>p.state==='seated').length>=2,'fewer than two readers');
  audit(w,'small afternoon');
  checks.push('a small room: '+readers(w).map(p=>p.name).join(', ')+' fit; invited readers came in ahead of anyone else');
  window.gatheringFrames=frames;return {checks};
})()
