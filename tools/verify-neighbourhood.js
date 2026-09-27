/* The neighbourhood meets itself: Marcel, one presence across the water and
   in the café; newer faces on a rhythm; fair rotation among due regulars. */
(function(){
  'use strict';
  const frames={},checks=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function tick(w){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
  function until(w,fn,limit,what){for(let t=0;t<(limit||120000);t+=.25){if(fn())return;tick(w);}
    throw Error('neighbourhood timeout '+(what||'')+' day '+w.memory.life.daysCompleted+' hour '+w.hour.toFixed(2));}
  function play(w,pick,stopAt){
    const said=[];
    for(let n=0;w.moment&&n<900;n++){
      if(w.moment.phase!=='talk'){SIM.update(w,.25);continue;}
      const line=SIM.momentLine(w);
      if(w.moment.visible===0&&!w.moment.chosenSpeaking)said.push(line.id);
      w.moment.visible=999;SIM.advanceMoment(w,line.choices?pick:undefined);
      if(stopAt&&said[said.length-1]===stopAt&&!w.moment.chosenSpeaking)break;
    }
    return said;
  }
  function cafe(seed,window){
    const w=__dev.modestWorld({random:SIM.seededRandom(seed)}),l=w.memory.life;
    if(window!==false)l.projects.window={stage:'installed',step:4,time:0};
    l.projects.table={stage:'installed',step:6,time:0};SIM._.installProjects(w);return w;
  }
  const marcel=w=>w.patrons.find(p=>p.regularId==='marcel');

  // No Marcel before his first day or before the window is clear.
  let w=cafe(81,false);
  for(let t=0;t<9*1500;t+=.25){tick(w);check(!marcel(w),'Marcel came before the window was clear');}
  checks.push('no Marcel while the left window is boarded');

  // One presence: he arrives only when he could not be on the ladder, the
  // far-bank figure and its invitation wait while he is inside.
  w=cafe(81);const arrivals=[];let insideDry=false,seen=new Set();
  for(let t=0;t<16*1500&&arrivals.length<4;t+=.25){
    tick(w);const m=marcel(w);if(!m)continue;
    if(!seen.has(m.id)){seen.add(m.id);
      const painting=w.memory.arcs['street-house'].stage===0&&!w.memory.flags['street-house-painted'];
      arrivals.push({day:w.memory.life.daysCompleted,hour:+w.hour.toFixed(2),rain:+w.rain.toFixed(2),daylight:+w.daylight.toFixed(2)});
      check(w.memory.life.daysCompleted>=4&&w.memory.life.daysCompleted%2===0,'off-rhythm visit');
      check(!painting||w.rain>=0.3||w.daylight<=0.45,'Marcel left his ladder to come in');
    }
    if(m.state==='seated'&&w.daylight>0.45&&w.rain<0.3&&!insideDry){
      insideDry=true;check(SCENE.figureInside(w,'street-house'),'far-bank figure still drawn while he is inside');
      frames['ladder-empty']=__dev.shot({x:120,y:60,w:200,h:150,scale:3},{world:w});
    }
    if(m.state==='seated'){
      const rec=w.memory.arcs['street-house'],keep=JSON.stringify(rec);
      rec.pendingBeat='finished';
      const a=CAST.arcs.find(x=>x.id==='street-house').anchor;
      check(!SIM.beatAt(w,a.x,a.y+10)&&rec.pendingBeat,'the painter finished his wall while sitting inside');
      Object.assign(rec,JSON.parse(keep));
    }
  }
  check(arrivals.length>=3,'Marcel rarely visits: '+JSON.stringify(arrivals));
  // Force a clear midday while he sits inside: the ladder stands empty.
  until(w,()=>marcel(w)&&marcel(w).state==='seated',200000,'seated Marcel');
  w.clockOffset+=(13-w.hour)/24*SIM._.DAY_SECONDS;w.rain=w.rainTarget=0;w.storm=false;SIM.update(w,.25);
  check(w.daylight>0.45&&SCENE.figureInside(w,'street-house'),'figure shown while Marcel is inside');
  frames['ladder-empty']=__dev.shot({x:120,y:60,w:200,h:150,scale:3},{world:w});
  checks.push('Marcel from day 4 on even days, never while he could be painting: '+JSON.stringify(arrivals));

  // His introduction on the first visit acknowledges the actual facade.
  for(const done of [false,true]) {
    w=cafe(82+done);if(done){w.memory.arcs['street-house']={stage:1,progress:7,pendingBeat:null};w.memory.flags['street-house-painted']=true;}
    until(w,()=>SIM.introductionAvailable(w,'marcel'),200000,'marcel intro');
    check(w.memory.bonds.marcel.visits===1,'not his first visit');
    SIM.startIntroduction(w,'marcel');until(w,()=>w.moment&&w.moment.phase==='talk',3000);
    const ladder=w.moment.lines.find(l=>l.id==='ladder').text;
    check(done?/a while back/.test(ladder):/I'm the one on the ladder/.test(ladder),'facade state not acknowledged: '+ladder);
    if(!done)frames['marcel-hello']=__dev.shot(null,{world:w});
    play(w,done?1:0,'ask');w=restore(w);
    check(!w.memory.flags['marcel-introduced']&&w.memory.flags['marcel-hello-ask'],'partial Marcel hello');
    until(w,()=>SIM.introductionAvailable(w,'marcel'),200000,'marcel resume');
    SIM.startIntroduction(w,'marcel');play(w,done?1:0);
    check(w.memory.flags['marcel-introduced']&&w.memory.flags[done?'luna-lake-later':'luna-lake-tuesday'],'lake choice');
  }
  checks.push('Marcel\'s hello names the facade as it is; why this side of the lake is saved; resumes after reload');

  // Fair rotation: the regular longest without a visit is admitted first.
  w=cafe(90);w.memory.life.daysCompleted=3;   // past opening day, when only Holger comes
  const d=SIM._.dayIndex(w);
  Object.keys(w.regulars).forEach(id=>{const r=w.regulars[id];r.day=d;r.hour=0;r.lastDay=d-1;});
  w.regulars.kasper.lastDay=d-5;w.patrons.forEach(p=>{p.gone=true;});w.patrons=[];
  const first=SIM._.dueRegular(w);
  check(first&&first.id==='kasper','rotation did not favour the longest absence: '+(first&&first.id));
  checks.push('due regulars rotate: the longest absence comes first');
  // Ida: the librarian comes on her rhythm from the café's first week and
  // asks how the shelf should work; notes appear only if asked for.
  check(SIM._.PATRON_NAMES.feminine.indexOf('Ida')<0,'a random Ida could share the room with the librarian');
  for(const pick of [0,1]) {
    w=cafe(100+pick);
    if(pick){const l=w.memory.life;l.projects.bookshelf={stage:'installed',step:5,time:0};l.projects.books={stage:'installed',step:5,time:0};for(let i=0;i<6;i++)l.shelf.push('box');}
    until(w,()=>SIM.introductionAvailable(w,'ida'),200000,'ida');
    const day=w.memory.life.daysCompleted;
    check(day>=5&&day%3===0,'Ida off her rhythm on day '+day);
    SIM.startIntroduction(w,'ida');until(w,()=>w.moment&&w.moment.phase==='talk',3000);
    const first=SIM.momentLine(w).text;
    check(pick?/I read spines/.test(first):/is there a shelf/.test(first),'Ida ignored the shelf: '+first);
    play(w,pick);
    check(w.memory.flags['ida-introduced']&&w.memory.flags[pick?'ida-exchange-notes':'ida-exchange-loose'],'exchange choice');
    if(pick)frames['ida-notes']=__dev.shot({x:290,y:140,w:70,h:100,scale:5},{world:w});
  }
  checks.push('Ida on her rhythm, her hello follows the actual shelf, loose browsing or a few notes');

  // Elody: her hello on the second visit, Maud on a later one, set down on
  // the counter; ignored she goes home again; given she is placed.
  for(const pick of [0,1]) {
    w=cafe(110+pick);
    until(w,()=>SIM.introductionAvailable(w,'elody'),240000,'elody hello');
    check(w.memory.bonds.elody.visits===2,'Elody introduced on visit '+w.memory.bonds.elody.visits);
    SIM.startIntroduction(w,'elody');play(w,pick);
    check(w.memory.flags[pick?'elody-cutting-home':'elody-cutting-cafe'],'cutting place choice');
    check(!w.patrons.some(p=>p.parcel)&&!w.counterParcel,'Maud on the hello visit');
    until(w,()=>w.counterParcel&&w.counterParcel.kind==='cutting',240000,'Maud on the counter');
    if(!pick) {
      const e=w.patrons.find(p=>p.regularId==='elody');
      frames['maud-arrives']=__dev.shot({x:560,y:200,w:260,h:140,scale:3},{world:w});
      until(w,()=>!w.patrons.includes(e),60000,'ignored visit');
      check(!w.counterParcel&&w.memory.life.projects.cutting.stage==='available','ignored cutting was given');
      until(w,()=>SIM.regularStoryAvailable(w,'elody'),240000,'Maud again');
    } else until(w,()=>SIM.regularStoryAvailable(w,'elody'),6000,'Maud invitation');
    SIM.startRegularStory(w,'elody');play(w,0);
    check(w.memory.flags['elody-maud-done']&&w.memory.life.projects.cutting.stage==='scheduled'&&!w.counterParcel,'Maud not handed over');
    w=restore(w);
    if(!pick) {
      until(w,()=>w.memory.life.projects.cutting.stage==='installed',60000,'Maud placed');
      frames['maud-counter']=__dev.shot({x:620,y:220,w:180,h:80,scale:3},{world:w});
    } else {
      // To the evening and stay home (no bedtime) until she settles on the bed.
      for(let t=0;t<120000&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
      for(let t=0;t<600&&w.memory.life.projects.cutting.stage!=='installed';t+=.25)SIM.update(w,.25);
      check(w.shop.phase==='home'&&w.memory.life.projects.cutting.stage==='installed','Maud not placed upstairs');
      frames['maud-sill']=__dev.shot({x:500,y:110,w:200,h:150,scale:3},{world:w});
    }
    check(!SIM.regularStoryAvailable(w,'elody'),'Maud given twice');
  }
  checks.push("Elody's hello on her second visit; Maud brought later, taken home if ignored, placed on the counter or the sill");
  window.neighbourhoodFrames=frames;return {checks};
})()
