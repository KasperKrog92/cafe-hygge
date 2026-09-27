/* Second visits: Holger's fire story (a working hearth or a cold one) and,
   only on a later visit, his shipmate; Kasper's question about endings
   (recalling the reading afternoon); Nora asking to paint Lunafreya (three
   answers, recalling what a painting should remember); Antonia's bench, its
   evening memory at home, and one kind second asking. Each is decided at the
   door, one per visit, hidden in idle mode, waits, saves both answers and
   resumes after a reload; their musings remember the answers. */
(function(){
  'use strict';
  const checks=[],R=SIM._;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function world(kind,seed,flags,hour){
    const w=(kind==='modest'?__dev.modestWorld:__dev.furnishedWorld)({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=8;w.memory.life.openSeconds=8*780;
    Object.assign(w.memory.flags,flags);
    ['holger','kasper','freya','lunafreya'].forEach(id=>{w.memory.bonds[id]={known:true,warmth:1,visits:6,lastDay:-1};});
    setHour(w,hour);return w;
  }
  // A fresh arrival: whoever is here finishes their visit, then comes back in.
  function arrive(w,id,expect){
    for(let i=0;i<4*400;i++){
      const here=w.patrons.find(p=>p.regularId===id);if(!here)break;
      if(here.state==='seated')here.stay=Math.min(here.stay,0);
      SIM.update(w,.25);
    }
    check(!w.patrons.some(p=>p.regularId===id),id+' never left');
    w.regulars[id].force=true;w.spawnT=0;
    // A small room may be full: they come in when a seat frees.
    let p=null;for(let i=0;i<4*900&&!(p=SIM.regularStoryAvailable(w,id));i++)SIM.update(w,.25);
    if(expect===false){check(!p,id+' offered a story that should wait');return null;}
    check(p,id+' offered nothing');
    check(p.storyChapter===expect,id+' offered '+p.storyChapter+' instead of '+expect);
    return p;
  }
  function begin(w,id){
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,id),'idle mode showed '+id+'\'s story');SIM.setMode(w,'game');
    check(SIM.invitations(w).some(i=>i.key===id),'no invitation for '+id);
    check(SIM.startRegularStory(w,id),id+'\'s story would not start');
    for(let i=0;i<120&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    check(w.moment.phase==='talk','Lunafreya never reached '+id);
  }
  function talk(w,choice,stop){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const line=SIM.momentLine(w);if(stop&&stop(line))return;
      w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
  }
  function musing(id,flag){return CAST.regulars.find(r=>r.id===id).lines.musing.some(m=>m.flags&&m.flags.indexOf(flag)>=0);}
  const books={'holger-introduced':true,'holger-books-promised':true,'holger-books-given':true};

  // Holger: the fire story, by a working hearth or a cold one; the shipmate
  // only on a later visit.
  [['furnished',"Your fire's drawing well."],['modest',"I keep looking at that fireplace."]].forEach(function(v,i){
    const w=world(v[0],10+i,books,9);arrive(w,'holger','fire');begin(w,'holger');
    check(SIM.momentLine(w).text.indexOf(v[1])===0,'fire story opened with '+SIM.momentLine(w).text);
    talk(w,i);
    check(w.memory.flags['holger-fire-done']&&w.memory.flags[i?'holger-fire-told':'holger-fire-his'],'fire answer not saved');
    for(let t=0;t<30;t+=.25)SIM.update(w,.25);
    check(!SIM.regularStoryAvailable(w,'holger'),'the shipmate followed on the same visit');
    arrive(w,'holger','aksel');begin(w,'holger');talk(w,i);
    check(w.memory.flags['holger-aksel-done']&&w.memory.flags[i?'holger-aksel-walk':'holger-aksel-cafe'],'shipmate answer not saved');
    arrive(w,'holger',false);
    check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  });
  check(musing('holger','holger-fire-his')&&musing('holger','holger-aksel-walk'),'Holger\'s musings do not remember');
  checks.push('Holger: the fire story by a working or a cold hearth, then Aksel on a later visit; both answers kept; nothing more after');

  // Kasper: endings, recalling the reading afternoon; a reload mid-scene resumes.
  let w=world('furnished',20,{'kasper-introduced':true,'kasper-good-lines':true,'reading-afternoon-kasper':true},13.5);
  arrive(w,'kasper','endings');begin(w,'kasper');
  check(/reading afternoon/.test(SIM.momentLine(w).text),'Kasper forgot the reading afternoon');
  talk(w,1,line=>line.id==='lean');
  const lean=SIM.momentLine(w).id;
  w=restore(w);
  check(w.memory.flags['kasper-endings-two']&&!w.memory.flags['kasper-endings-done'],'partial scene not saved');
  setHour(w,13.5);
  arrive(w,'kasper','endings');begin(w,'kasper');
  check(SIM.momentLine(w).id===lean,'resumed at '+SIM.momentLine(w).id+' instead of '+lean);
  talk(w,1,line=>line.id==='still');
  check(/three good lines/.test(SIM.momentLine(w).text),'Kasper forgot his three good lines');
  talk(w,1);
  check(w.memory.flags['kasper-ending-open']&&w.memory.flags['kasper-endings-done'],'ending answer not saved');
  check(musing('kasper','kasper-ending-quiet')&&musing('kasper','kasper-ending-open'),'Kasper\'s musings do not remember');
  checks.push('Kasper asks about endings (recalling the reading afternoon and his three good lines); a reload resumes at "'+lean+'"');

  // Nora: three answers, recalling what a painting should remember.
  ['lunafreya-portrait-cafe','lunafreya-portrait-home','lunafreya-portrait-no'].forEach(function(flag,i){
    const w=world('furnished',30+i,{'lunafreya-introduced':true,'lunafreya-remember-people':true},11);
    arrive(w,'lunafreya','portrait');begin(w,'lunafreya');
    talk(w,i,line=>line.id==='ask');
    check(/somebody in it/.test(SIM.momentLine(w).text),'Nora forgot "somebody in it"');
    talk(w,i);
    check(w.memory.flags[flag]&&w.memory.flags['lunafreya-portrait-done'],'Nora\'s answer not saved: '+flag);
    check(musing('lunafreya',flag),'no musing remembers '+flag);
  });
  checks.push('Nora asks to paint Lunafreya properly; the café, upstairs or "stay the hands" are each kept');

  // Antonia: yes → the bench remembered at home that night, before the post.
  w=world('furnished',40,{'freya-introduced':true,'freya-route':true},18.5);
  arrive(w,'freya','bench');begin(w,'freya');
  check(/favourite stretch/.test(SIM.momentLine(w).text),'Antonia forgot the route');
  talk(w,0);
  check(w.memory.flags['freya-bench-yes'],'yes not saved');
  arrive(w,'freya',false);
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  check(w.shop.phase==='home','no evening');
  w.memory.life.daysCompleted=Math.max(w.memory.life.daysCompleted,3);
  for(let t=0;t<200&&SIM.eveningStory(w)!=='bench';t+=.25)SIM.update(w,.25);
  check(SIM.eveningStory(w)==='bench','the bench was not remembered that evening');
  check(SIM.invitations(w).some(i=>i.label==="Remember Antonia's bench"&&i.icon==='bench'),'no labelled bench invitation');
  check(SIM.startEveningStory(w),'bench memory would not open');
  check(/lantern/.test(SIM.momentLine(w).id==='bus'?SIM.momentLine(w).text:w.moment.lines.find(l=>l.id==='bus').text),'the bench memory forgot the lantern');
  talk(w,0);
  check(w.memory.flags['home-bench-done'],'bench memory not finished');
  checks.push('Antonia shows Lunafreya her bench; it is remembered at home that night ("like driving a lantern")');

  // Not tonight: asked once more on a later visit; a second "not yet" ends it kindly.
  w=world('furnished',41,{'freya-introduced':true},18.5);
  arrive(w,'freya','bench');begin(w,'freya');talk(w,1);
  check(w.memory.flags['freya-bench-later']&&!w.memory.flags['freya-bench-yes'],'later not saved');
  setHour(w,17);arrive(w,'freya','again');begin(w,'freya');talk(w,1);
  check(w.memory.flags['freya-bench-someday']&&!w.memory.flags['freya-bench-yes'],'someday not saved');
  setHour(w,17);arrive(w,'freya',false);
  w.shop.phase='home';w.eveningStoryDay=-1;
  check(SIM.eveningStory(w)!=='bench','a bench memory without an outing');
  checks.push('another night: Antonia asks once more, and a second "not yet" is answered kindly and never repeated');
  return {checks};
})()
