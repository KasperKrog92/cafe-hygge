/* Saira, before any piano. She keeps her rhythm from the café's first week;
   she taps a rhythm on the table edge and stops when somebody nearby is
   reading; her hello comes on her second visit, never the first, and asks
   what the room should sound like. On a later visit she hums eight bars of
   her own (the tune and the cat sound as their lines begin) while Lunafreya
   sits down badly or keeps the cloth; that evening the receipts wait until
   morning. Then the handwritten score: pinned up behind the counter, where
   Lunafreya sometimes hums it on a quiet spell, or above the bed upstairs.
   One story per visit, hidden in idle mode, resumed after a reload. */
(function(){
  'use strict';
  const frames=window.sairaFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function spy(){
    const s={settings:{rain:true},calls:[]},heard=['fingerTap','sairaHum','lunaHum','lunaHumRoom','meow'];
    Object.keys(SND).forEach(k=>{if(typeof SND[k]==='function')s[k]=heard.indexOf(k)<0?function(){}:function(){s.calls.push(k);};});
    s.pianoActive=()=>false;return s;
  }
  function restore(w,sound){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),sound:sound,memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function world(seed,flags,sound){
    const w=__dev.furnishedWorld({random:SIM.seededRandom(seed),sound:sound});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=10;w.memory.life.openSeconds=10*780;
    Object.assign(w.memory.flags,flags);
    w.memory.bonds.saira={known:true,warmth:1,visits:4,lastDay:-1};
    w.memory.flags['home-calandra-done']=true;
    setHour(w,11);return w;
  }
  const saira=w=>w.patrons.find(p=>p.regularId==='saira');
  function leave(w){
    for(let i=0;i<4*400;i++){
      const here=saira(w);if(!here)break;
      if(here.state==='seated')here.stay=Math.min(here.stay,0);
      SIM.update(w,.25);
    }
    check(!saira(w),'Saira never left');
  }
  // A fresh arrival: if she is here she finishes her visit, then comes back in.
  function arrive(w,expect){
    leave(w);w.regulars.saira.force=true;w.spawnT=0;
    let p=null;for(let i=0;i<4*900;i++){p=saira(w);if(p&&p.state==='seated')break;SIM.update(w,.25);}
    check(p&&p.state==='seated','Saira never sat down');
    check((p.storyChapter||null)===expect,'Saira brought '+p.storyChapter+' instead of '+expect);
    return p;
  }
  function begin(w){
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,'saira'),'idle mode showed her story');SIM.setMode(w,'game');
    check(SIM.invitations(w).some(i=>i.key==='saira'),'no invitation for Saira');
    check(SIM.startRegularStory(w,'saira'),'her story would not start');
    for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    check(w.moment.phase==='talk','Lunafreya never reached Saira');
  }
  // Plays lines, noting which sound each line started with.
  function talk(w,choice,stop,heard){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const s=w.context.sound,before=s.calls?s.calls.length:0;
      SIM.update(w,.05);
      if(!w.moment)break;
      const line=SIM.momentLine(w);
      if(heard&&s.calls&&line===w.moment.lines[w.moment.index])(heard[line.id]=heard[line.id]||[]).push(...s.calls.slice(before));
      if(stop&&stop(line))return;
      w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
    for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  }
  function musing(flag){return CAST.regulars.find(r=>r.id==='saira').lines.musing.some(m=>m.flags&&m.flags.indexOf(flag)>=0);}
  function evening(w){
    setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
    check(w.shop.phase==='home','no evening');
  }
  function morning(w){SIM.goToSleep(w);for(let t=0;t<2000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);check(w.shop.phase==='open','no morning');}

  // Her rhythm from the café's first week; the hello waits for her second visit.
  let sound=spy(),w=__dev.modestWorld({random:SIM.seededRandom(120),sound:sound});
  w.memory.life.projects.window={stage:'installed',step:4,time:0};w.memory.life.projects.table={stage:'installed',step:6,time:0};R.installProjects(w);
  const visits=[],bouts=[],taps=()=>sound.calls.filter(k=>k==='fingerTap').length;let lifted=false,bout=null;
  for(let t=0;t<300000&&!SIM.introductionAvailable(w,'saira');t+=.25){
    SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
    const p=saira(w);
    if(p&&p.tapping&&!bout)bout={t:t,reader:!!p.tapReader,taps:taps()};
    if(bout&&!(p&&p.tapping)){bout.len=t-bout.t;bout.taps=taps()-bout.taps;bouts.push(bout);bout=null;}
    if(!p)continue;
    if(visits.indexOf(p.id)<0){
      visits.push(p.id);const day=w.memory.life.daysCompleted;
      check(day>=7&&(day+2)%3===0,'Saira off her rhythm on day '+day);
      if(visits.length===1)check(p.storyChapter!=='hello','Saira introduced herself on her first visit');
    }
    if(p.tapping){if(p.tapLift===2&&!lifted){lifted=true;frames['tapping']=__dev.shot({x:Math.round(p.x)-40,y:Math.round(p.y)-70,w:80,h:80,scale:4},{world:w});}}
  }
  check(SIM.introductionAvailable(w,'saira'),'no hello');
  check(w.memory.bonds.saira.visits===2,'Saira introduced on visit '+w.memory.bonds.saira.visits);
  check(lifted&&bouts.some(b=>!b.reader&&b.len>=2.5&&b.taps>=3),'Saira never tapped a whole phrase: '+JSON.stringify(bouts));
  check(bouts.every(b=>!b.reader||b.len<2),'Saira tapped on through somebody\'s chapter: '+JSON.stringify(bouts));
  SIM.setMode(w,'idle');check(!SIM.introductionAvailable(w,'saira'),'idle mode showed her hello');SIM.setMode(w,'game');
  check(SIM.startIntroduction(w,'saira'),'her hello would not start');
  for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
  const ten=w.moment.lines.find(l=>l.id==='ten').text,drink=saira(w).drink.name;
  check(drink==='hot chocolate'?/hot chocolate/.test(ten):/sugar/.test(ten)&&!/hot chocolate/.test(ten),'the dentist line claims the wrong drink ('+drink+'): '+ten);
  talk(w,0);
  check(w.memory.flags['saira-introduced']&&w.memory.flags['saira-room-quiet'],'hello answer not saved');
  check(!SIM.regularStoryAvailable(w,'saira'),'her next scene followed on the same visit');
  check(musing('saira-room-quiet')&&musing('saira-room-tune'),'her musings do not remember the answer');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('Saira comes on her rhythm from day 7, taps whole phrases at her table (softly, stopping for readers), and says hello on her second visit (the dentist line follows the actual drink)');

  // Tapping stops for a reader nearby: in the small room a reader comes in
  // and takes the free seat nearest her (the others are held for a moment,
  // so the fixture does not depend on a random seat).
  w=__dev.modestWorld({random:SIM.seededRandom(130)});SIM.setMode(w,'game');
  w.memory.life.daysCompleted=10;w.memory.life.openSeconds=10*780;
  w.memory.life.projects.table={stage:'installed',step:6,time:0};R.installProjects(w);
  Object.assign(w.memory.flags,{'saira-introduced':true,'saira-room-quiet':true});
  w.memory.bonds.saira={known:true,warmth:1,visits:4,lastDay:-1};setHour(w,11);
  let p=arrive(w,'listen');p.storyChapter=null;p.stay=9999;setHour(w,12);
  // Her table-mate's seat: whoever sits there finishes; every free seat is
  // held while the reader orders, and that one is let go as her drink comes.
  const near=w.seats.find(s=>s!==p.seat&&s.table>=0&&Math.hypot(s.x-p.x,s.y-p.y)<170);
  check(near,'no seat near Saira');
  const held=[],hold=all=>w.seats.forEach(s=>{if(!s.taken&&(all||s!==near)){s.taken=true;held.push(s);}});
  for(let t=0;t<300&&near.taken&&held.indexOf(near)<0;t+=.25){
    w.patrons.forEach(q=>{if(q.seat===near&&q.state==='seated')q.stay=Math.min(q.stay,0);});SIM.update(w,.25);hold(true);
  }
  check(held.indexOf(near)>=0,'her table-mate never left');
  const reader=R.makePatron(w,null);reader.wantsBook=true;reader.ownBook=true;reader.chatty=false;reader.laptop=false;
  R.enqueueArrival(w,reader,0,true);
  for(let t=0;t<600&&!(reader.state==='seated'&&reader.reading);t+=.25){
    if(near.taken&&!w.patrons.some(q=>q.seat===near)&&reader.state==='waitDrink'){near.taken=false;held.splice(held.indexOf(near),1);}
    SIM.update(w,.25);hold(reader.state!=='waitDrink'&&reader.state!=='pickup');
  }
  held.forEach(s=>{if(!w.patrons.some(q=>q.seat===s))s.taken=false;});
  check(reader.state==='seated'&&reader.reading&&reader.seat===near,'the reader never sat down near Saira');
  let stops=0,shortest=99;
  for(let bout=0;bout<12&&!stops;bout++){
    p.tapT=0;p.stay=Math.max(p.stay,200);reader.stay=Math.max(reader.stay,200);
    for(let t=0;t<2&&!p.tapping;t+=.05)SIM.update(w,.05);
    if(!p.tapping)continue;
    let len=0;for(;len<8&&p.tapping;len+=.05)SIM.update(w,.05);
    shortest=Math.min(shortest,len);
    for(let t=0;t<3;t+=.05){SIM.update(w,.05);if([w.activeCaption].concat(w.captionQueue||[]).some(c=>c&&c.text&&/reading/.test(c.text)))stops++;}
  }
  check(shortest<2,'Saira tapped on through a reader\'s chapter ('+shortest.toFixed(2)+' s)');
  check(stops>0,'no caption noticed her stopping for a reader');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('she stops tapping within a bar when somebody nearby is reading, and a caption notices');

  sound=spy();w=world(130,{'saira-introduced':true,'saira-room-quiet':true},sound);
  // Eight bars of her own: the tune and the cat sound as their lines begin;
  // a reload mid-scene resumes at the next line.
  p=arrive(w,'listen');begin(w);
  check(/very quietly/.test(w.moment.lines.find(l=>l.id==='ask').text),'she forgot the quiet should be the loudest thing');
  const heard={};talk(w,1,line=>line.id==='there',heard);
  check((heard.eight||[]).filter(k=>k==='sairaHum').length===1,'the eight bars were not hummed: '+JSON.stringify(heard));
  check(sound.calls.filter(k=>k==='sairaHum').length===1,'the tune played more than once');
  w=restore(w,sound);setHour(w,11);
  check(w.memory.flags['saira-listen-eight']&&w.memory.flags['saira-listen-cloth']&&!w.memory.flags['saira-listen-done'],'partial scene not saved');
  w.memory.bonds.saira.visits=Math.max(w.memory.bonds.saira.visits,4);
  arrive(w,'listen');begin(w);
  check(SIM.momentLine(w).id==='there','resumed at '+SIM.momentLine(w).id);
  talk(w,1,null,heard);
  check((heard.cat||[]).indexOf('meow')>=0,'the cat never chose a key');
  check(w.memory.flags['saira-listen-done'],'listen scene not finished');
  check(!SIM.regularStoryAvailable(w,'saira'),'the score came on the same visit');
  checks.push('she hums eight bars of her own (the tune plays once, as its line begins; the cat chooses a key); a reload resumes at "there"');

  // That evening the receipts wait until morning (the cloth answer recalled).
  evening(w);
  for(let t=0;t<200&&SIM.eveningStory(w)!=='rest';t+=.25)SIM.update(w,.25);
  check(SIM.eveningStory(w)==='rest','no evening moment after listening');
  check(SIM.invitations(w).some(i=>i.icon==='note'&&i.label==='Leave the receipts until morning'),'no labelled evening invitation');
  check(SIM.startEveningStory(w),'the evening moment would not open');
  check(/cup of tea/.test(w.moment.lines.find(l=>l.id==='badly').text),'the evening forgot the cloth');
  const home={};talk(w,0,null,home);
  check((home.tune||[]).indexOf('lunaHum')>=0,'Lunafreya did not hum at home');
  check(w.memory.flags['home-rest-done'],'evening moment not finished');
  morning(w);

  // The score, pinned up behind the counter, where she hums it now and then.
  setHour(w,11);p=arrive(w,'score');begin(w);
  check(/most bars/.test(w.moment.lines.find(l=>l.id==='rests').text),'the score forgot the quiet');
  check(/bring the cloth/.test(w.moment.lines.find(l=>l.id==='next').text),'the score forgot the cloth');
  talk(w,0);
  check(w.memory.flags['saira-score-cafe']&&w.memory.life.projects.score.stage==='scheduled','the score was not handed over');
  frames['score-on-counter']=__dev.shot({x:620,y:230,w:120,h:70,scale:4},{world:w});
  for(let t=0;t<600&&w.memory.life.projects.score.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(SCENE.hasFurniture(w,'saira-score'),'the score was never pinned up');
  frames['score-behind-counter']=__dev.shot({x:700,y:160,w:130,h:80,scale:4},{world:w});
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  leave(w);
  const b=w.barista,hums=sound.calls.filter(k=>k==='lunaHumRoom').length;let forced=false,hummed=false,faced=false;
  for(let t=0;t<900&&!hummed;t+=.25){
    if(!forced&&b.state==='idle'&&R.counterQuiet(w)&&!R.counterChores(w)){b.forcedTask='hum';b.idleT=0;forced=true;}
    SIM.update(w,.25);
    if(b.state==='hum'&&b.humming){hummed=true;faced=b.heading==='up'&&Math.hypot(b.x-L.projects.score.work.x,b.y-L.projects.score.work.y)<2;}
    if(forced&&b.state==='idle'&&!hummed)forced=false;
  }
  check(hummed&&faced,'Lunafreya never hummed at the score');
  check(sound.calls.filter(k=>k==='lunaHumRoom').length===hums+1,'the hum was silent');
  frames['humming']=__dev.shot({x:720,y:200,w:120,h:110,scale:4},{world:w});
  for(let t=0;t<30&&b.state!=='idle';t+=.25)SIM.update(w,.25);
  check(b.state==='idle'&&Math.hypot(b.x-L.baristaHome.x,b.y-L.baristaHome.y)<2,'she did not go back to the till');
  const today=w.memory.life.daysCompleted;b.forcedTask=null;
  for(let t=0;t<600;t+=.25){SIM.update(w,.25);check(b.state!=='hum'||w.memory.life.daysCompleted!==today,'she hummed twice in one day');}
  check(musing('saira-score-cafe')&&musing('saira-listen-done'),'her musings forgot the score');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('the score is handed over, pinned up behind the counter, and Lunafreya hums it there on a quiet spell (once a day)');

  // Upstairs instead: above the bed, and never hummed at the counter.
  sound=spy();w=world(140,{'saira-introduced':true,'saira-room-tune':true,'saira-listen-done':true,'saira-listen-sit':true,'home-rest-done':true},sound);
  arrive(w,'score');begin(w);
  check(/It was hard/.test(w.moment.lines.find(l=>l.id==='rests').text),'the score forgot "something small"');
  check(/sitting down/.test(w.moment.lines.find(l=>l.id==='next').text),'the score forgot she sat down');
  talk(w,1);
  check(w.memory.flags['saira-score-home'],'home answer not saved');
  for(let t=0;t<120;t+=.25){SIM.update(w,.25);check(w.barista.project!=='score','the score was pinned up downstairs');}
  check(!R.counterHabits.find(h=>h.id==='hum').offer(w,w.barista),'hummed at a score that went upstairs');
  w.memory.life.homeUnpack.boxes=7;evening(w);
  for(let t=0;t<600&&w.memory.life.projects.score.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(w.memory.life.projects.score.stage==='installed','the score never went up at home');
  frames['score-above-bed']=__dev.shot({x:720,y:150,w:130,h:90,scale:4},{world:w});
  w=restore(w);check(w.memory.life.projects.score.stage==='installed'&&w.memory.flags['saira-score-home'],'the score did not survive a reload');
  checks.push('taken upstairs, the score is pinned above the bed (and kept after a reload); she never hums at the counter for it');
  return {checks};
})()
