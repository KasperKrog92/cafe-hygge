/* Old friends and a finished chapter. Holger's shipmate Aksel comes in with
   him when there is a table for two (after the walk is told, if Holger
   suggested a walk): they order, sit together, and the scene waits until
   both are sitting; Aksel tells everything like the shipping forecast and
   asks for this place's. With no table for two Holger comes alone and the
   scene waits. Afterwards Aksel sometimes comes along and they talk.
   Kasper finishes chapter seven, asks whether he may keep her way of looking
   at the door, and has her read its last paragraph, which leans the way she
   said endings should. Idle mode hides them; one scene per visit. */
(function(){
  'use strict';
  const checks=[],frames=window.friendsFrames={},R=SIM._;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function world(seed,flags,hour){
    const w=__dev.furnishedWorld({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=12;w.memory.life.openSeconds=12*780;
    Object.assign(w.memory.flags,flags);
    ['holger','kasper'].forEach(id=>{w.memory.bonds[id]={known:true,warmth:2,visits:8,lastDay:-1};});
    setHour(w,hour);return w;
  }
  const who=(w,id)=>w.patrons.find(p=>p.regularId===id);
  function leave(w,id){
    for(let i=0;i<4*400;i++){const here=who(w,id);if(!here)break;if(here.state==='seated')here.stay=Math.min(here.stay,0);
      if(here.partner&&here.partner.state==='seated')here.partner.stay=Math.min(here.partner.stay,0);SIM.update(w,.25);}
    check(!who(w,id),id+' never left');
    for(let i=0;i<4*60&&w.patrons.some(p=>p.companionId);i++)SIM.update(w,.25);
  }
  function arrive(w,id,expect){
    leave(w,id);w.regulars[id].force=true;w.spawnT=0;
    let p=null;for(let i=0;i<4*900;i++){p=who(w,id);if(p&&p.state==='seated'&&(!p.partner||p.partner.state==='seated'))break;SIM.update(w,.25);}
    check(p&&p.state==='seated',id+' never sat down');
    check((p.storyChapter||null)===expect,id+' brought '+p.storyChapter+' instead of '+expect);
    return p;
  }
  function begin(w,id){
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,id),'idle mode showed '+id+'\'s story');SIM.setMode(w,'game');
    check(SIM.startRegularStory(w,id),id+'\'s story would not start');
    for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    check(w.moment.phase==='talk','Lunafreya never reached '+id);
  }
  function talk(w,choice){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const line=SIM.momentLine(w);w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
    for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  }
  const text=(w,id)=>w.moment.lines.find(l=>l.id===id).text;
  const AKSEL={'holger-introduced':true,'holger-books-promised':true,'holger-books-given':true,'holger-fire-done':true,'holger-fire-his':true,'holger-aksel-done':true};

  // Here, then: Aksel comes in with him.
  let w=world(500,Object.assign({'holger-aksel-cafe':true},AKSEL),9);
  let h=arrive(w,'holger','visit');
  const a=h.partner;
  check(a&&a.companionId==='aksel'&&a.name==='Aksel'&&a.partner===h&&a.state==='seated'&&a.seat.table===h.seat.table,'Aksel did not sit down with Holger');
  frames['holger-and-aksel']=__dev.shot({x:Math.round(h.x)-90,y:Math.round(h.y)-90,w:180,h:120,scale:3},{world:w});
  begin(w,'holger');
  check(/Fire, his/.test(text(w,'report'))&&/shipping forecast/.test(text(w,'hello')),'Aksel forgot the fire, or the forecast');
  let spoke=false;
  for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
    const line=SIM.momentLine(w);
    if(line.speaker==='Aksel'&&SCENE.dialogueLayout){spoke=true;}
    w.moment.visible=999;
    if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,1);else SIM.advanceMoment(w);
  }
  for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  check(spoke&&w.memory.flags['holger-visit-done']&&w.memory.flags['aksel-forecast-changeable'],'the visit was not saved');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  // Afterwards he sometimes comes along; they talk.
  let along=0;
  for(let n=0;n<16;n++){setHour(w,9);h=arrive(w,'holger',null);if(h.partner&&h.partner.companionId==='aksel')along++;}
  check(along>=1&&along<16,'Aksel came along '+along+' of 16 times');
  check(CAST.regulars.find(r=>r.id==='holger').lines.overheard.some(l=>l.flags&&l.flags.indexOf('holger-visit-done')>=0),'no talk between them');
  checks.push('"Ask him here": Aksel comes in with Holger, they sit together, the forecast (recalling the fire); afterwards he comes along sometimes ('+along+' of 16)');

  // A walk first, told on a later visit; then the visit.
  w=world(510,Object.assign({'holger-aksel-walk':true},AKSEL),9);
  arrive(w,'holger','walked');begin(w,'holger');
  check(/lighthouse/.test(text(w,'walked')),'no walk');
  talk(w,0);check(w.memory.flags['holger-walked-done'],'walk not saved');
  setHour(w,9);h=arrive(w,'holger','visit');
  check(h.partner&&h.partner.companionId==='aksel','Aksel did not come after the walk');
  checks.push('"A walk": Holger tells of the walk first (nobody had to be interesting), then brings Aksel');

  // No table for two: Holger comes alone and the scene waits.
  w=world(520,Object.assign({'holger-aksel-cafe':true},AKSEL),9);
  w.seats.forEach(s=>{if(!s.armchair)s.taken=true;});
  leave(w,'holger');w.regulars.holger.force=true;w.spawnT=0;
  let lone=null;for(let i=0;i<4*300&&!(lone&&lone.state==='seated');i++){lone=who(w,'holger');SIM.update(w,.25);}
  check(lone&&!lone.partner&&!lone.storyChapter&&!w.patrons.some(p=>p.companionId),'Aksel came with nowhere to sit');
  checks.push('with no table for two, Holger comes alone and the visit waits');

  // Kasper's paragraph: the open ending, and a door of her own.
  w=world(530,{'kasper-introduced':true,'kasper-good-lines':true,'kasper-endings-done':true,'kasper-ending-open':true},13.5);
  arrive(w,'kasper','paragraph');begin(w,'kasper');
  check(/Three good lines/.test(text(w,'finished'))&&/one chair down/.test(text(w,'paragraph')),'the paragraph forgot the open ending');
  talk(w,1);
  check(w.memory.flags['kasper-borrow-no']&&w.memory.flags['kasper-paragraph-done'],'paragraph not saved');
  w=world(531,{'kasper-introduced':true,'kasper-endings-done':true,'kasper-ending-quiet':true},13.5);
  arrive(w,'kasper','paragraph');begin(w,'kasper');
  check(/turned the chairs up/.test(text(w,'paragraph')),'the paragraph forgot the quiet ending');
  talk(w,0);check(w.memory.flags['kasper-borrow-yes'],'keep answer not saved');
  checks.push('Kasper asks before keeping her way of looking at the door, and his last paragraph leans quiet or open as she said');
  return {checks};
})()
