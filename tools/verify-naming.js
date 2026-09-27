/* A name people already use. Elody says things flourish in here (the room
   she means, or Maud upstairs); only once Birgit's recipe ("everything good
   starts with flour") and Elody's words are both said does an evening at
   home put them together: Café Flourish. Marcel, who painted the
   fishmonger's sign, paints the new one (a flourish under the name, or plain)
   and sets it out by the door; Lunafreya brings the old NEW CAFE sign in
   from beside it and slides it under the counter by her stool (a reload
   mid-carry resumes). Then people use the name: arrivals, the chalk menu,
   Saira's score, and Calandra's next letter, addressed to Café Flourish. */
(function(){
  'use strict';
  const frames=window.namingFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  const BASE={'home-calandra-done':true,'street-house-painted':true,'marcel-introduced':true,
    'elody-introduced':true,'elody-cutting-cafe':true,'elody-maud-done':true};
  function world(seed,flags,kind){
    const w=(kind==='modest'?__dev.modestWorld:__dev.furnishedWorld)({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=14;w.memory.life.openSeconds=14*780;
    Object.assign(w.memory.flags,BASE,flags);
    // Marcel's facade is finished, so he is free to come in by day.
    const facade=w.memory.arcs['street-house'];if(facade){facade.stage=Math.max(facade.stage,1);facade.pendingBeat=null;}
    ['elody','marcel'].forEach(id=>{w.memory.bonds[id]={known:true,warmth:1,visits:5,lastDay:-1};});
    setHour(w,13);return w;
  }
  const who=(w,id)=>w.patrons.find(p=>p.regularId===id);
  function leave(w,id){
    for(let i=0;i<4*400;i++){const here=who(w,id);if(!here)break;if(here.state==='seated')here.stay=Math.min(here.stay,0);SIM.update(w,.25);}
    check(!who(w,id),id+' never left');
  }
  function arrive(w,id,expect){
    leave(w,id);w.regulars[id].force=true;w.spawnT=0;
    let p=null;for(let i=0;i<4*900;i++){p=who(w,id);if(p&&p.state==='seated')break;SIM.update(w,.25);}
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
  function evening(w){
    setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
    check(w.shop.phase==='home','no evening');
  }
  function morning(w){SIM.goToSleep(w);for(let t=0;t<2000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);check(w.shop.phase==='open','no morning');}
  function tonight(w){for(let t=0;t<200&&!SIM.eveningStory(w);t+=.25)SIM.update(w,.25);return SIM.eveningStory(w);}

  // Elody: things flourish in here (her room, Gerda's yellow), or upstairs with Maud.
  let w=world(200,{'gerda-colour-worn':true});
  arrive(w,'elody','grow');begin(w,'elody');
  check(/Things flourish in here/.test(text(w,'leaves'))&&/Gerda in that yellow/.test(text(w,'people')),'Elody\'s words forgot the room');
  talk(w,0);
  check(w.memory.flags['elody-grow-done']&&w.memory.flags['elody-grow-talk'],'grow answer not saved');
  // Without Birgit's recipe the evening does not put it together yet.
  evening(w);check(tonight(w)!=='name','the name came before Birgit\'s flour');
  w=world(201,{'elody-cutting-cafe':false,'elody-cutting-home':true});
  arrive(w,'elody','grow');begin(w,'elody');
  check(/windowsill/.test(text(w,'leaves')),'Elody forgot Maud upstairs');
  talk(w,1);check(w.memory.flags['elody-grow-alone'],'second grow answer not saved');
  checks.push('Elody says things flourish in here (the room, Gerda\'s yellow) or around Lunafreya (Maud upstairs); both answers kept; no name yet without the flour');

  // The evening she puts it together, recalling Saira's untitled score and Marcel.
  w=world(210,{'elody-grow-done':true,'birgit-recipe-done':true,'saira-score-done':true});
  evening(w);
  check(tonight(w)==='name','no naming evening');
  check(SIM.invitations(w).some(i=>i.icon==='letter'&&i.label==='Think about what the café is called'),'no labelled naming invitation');
  check(SIM.startEveningStory(w),'the naming evening would not open');
  check(/Saira left her score without a title/.test(text(w,'asked')),'the evening forgot Saira\'s score');
  check(/Marcel paints signs/.test(text(w,'painter')),'the evening forgot Marcel');
  check(/Café Flourish/.test(text(w,'name')),'the evening never found the name');
  talk(w,0);check(w.memory.flags['home-name-done'],'naming evening not finished');
  morning(w);
  checks.push('one evening puts it together: flour, flourish, nobody just getting by: Café Flourish');

  // Marcel paints it: with a flourish; then he sets it out by the door.
  setHour(w,13);
  arrive(w,'marcel','sign');begin(w,'marcel');
  check(/fishmonger/.test(text(w,'fishmonger')),'Marcel forgot the fishmonger');
  talk(w,0);check(w.memory.flags['sign-curl']&&w.memory.flags['marcel-sign-done'],'sign answer not saved');
  check(!SIM.regularStoryAvailable(w,'marcel'),'the sign came on the same visit');
  arrive(w,'marcel','signboard');begin(w,'marcel');
  check(/one stroke/.test(text(w,'curl')),'the signboard forgot the flourish');
  talk(w,0);
  const job=w.memory.life.projects.cafeSign;
  check(job.stage==='scheduled'&&!SCENE.hasFurniture(w,'cafe-sign'),'the sign was not handed over, or named the café at once');
  w.door.holdT=5;for(let t=0;t<2;t+=.25)SIM.update(w,.25);
  frames['both-signs-outside']=__dev.shot({x:20,y:120,w:70,h:120,scale:4},{world:w});
  // She brings the old sign in (the door opening as she takes it) and
  // slides it under the counter beside her stool.
  const b=w.barista;let opened=false,held=false,stowed=false;
  setHour(w,13);for(let t=0;t<900&&job.stage!=='arrived';t+=.25)SIM.update(w,.25);
  check(job.stage==='arrived','she never went for the old sign: '+b.state+' '+w.shop.phase+' '+w.hour.toFixed(2));
  for(let t=0;t<3;t+=.25){SIM.update(w,.25);if(w.door.open>.5)opened=true;if(b.holding==='sign')held=true;}
  check(opened&&held,'the door stayed shut, or she did not take the sign ('+opened+','+held+')');
  frames['carrying-old-sign']=__dev.shot({x:Math.round(b.x)-50,y:Math.round(b.y)-80,w:100,h:100,scale:4},{world:w});
  // A reload mid-carry: the old sign is back on the doorstep until she takes it again.
  w=restore(w);setHour(w,13);
  const job2=w.memory.life.projects.cafeSign,b2=w.barista;
  check(job2.stage==='arrived','reload lost the carry');
  for(let t=0;t<900&&job2.stage!=='installed';t+=.25){
    SIM.update(w,.25);
    if(job2.stage==='working'&&!stowed&&job2.time>1){stowed=true;frames['stowing-old-sign']=__dev.shot({x:670,y:220,w:110,h:90,scale:4},{world:w});}
  }
  check(stowed&&job2.stage==='installed'&&w.memory.flags['cafe-named']&&SCENE.hasFurniture(w,'cafe-sign'),'the signs were never swapped');
  for(let t=0;t<10;t+=.25)SIM.update(w,.25);
  check(b2.holding!=='sign','she kept holding the old sign');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  w.door.holdT=5;for(let t=0;t<2;t+=.25)SIM.update(w,.25);
  frames['flourish-through-the-door']=__dev.shot({x:20,y:120,w:70,h:120,scale:4},{world:w});
  frames['menu-flourish']=__dev.shot({x:800,y:100,w:140,h:130,scale:3},{world:w});
  checks.push('Marcel paints it with a flourish and sets it out; Lunafreya opens the door, takes the old sign in and slides it under the counter by her stool (a reload mid-carry resumes)');

  // People use the name.
  const named=CAST.regulars.filter(r=>['arrivalReturn','musing'].some(k=>(r.lines[k]||[]).some(l=>l.flags&&l.flags.indexOf('cafe-named')>=0))).map(r=>r.id);
  check(named.length>=8,'too few neighbours use the name: '+named.join(','));
  check([].concat(CAST.visitors.keira.returningAfter).some(a=>a.flags.indexOf('cafe-named')>=0),'Keira never sees the sign');
  const saira=SIM.contextLines(CAST.regularStories.saira.find(s=>s.id==='score').lines,SIM.flagContext(w,CAST.regularStories.saira.find(s=>s.id==='score').lines,{}));
  check(/called Flourish/.test(saira.find(l=>l.id==='blank').text),'Saira\'s score still waits for a name');
  checks.push('afterwards the neighbours use the name ('+named.join(', ')+', and Keira photographs the sign); Saira\'s score takes it');

  // Calandra's next letter, addressed to Café Flourish, that evening.
  evening(w);
  check(tonight(w)==='flourish','no letter addressed to the café');
  check(SIM.startEveningStory(w),'the letter would not open');
  check(/addressed to Café Flourish/.test(text(w,'envelope')),'the letter lost its address');
  talk(w,0);check(w.memory.flags['home-flourish-done'],'letter not finished');
  checks.push('Calandra\'s next letter is addressed to Café Flourish; she will visit when Lunafreya says');

  // Plain letters, in the small room: the sign without its curl.
  w=world(220,{'home-name-done':true,'sign-plain':true,'marcel-sign-done':true},'modest');
  w.memory.life.projects.window={stage:'installed',step:4,time:0};
  arrive(w,'marcel','signboard');begin(w,'marcel');
  check(/Plain and honest/.test(text(w,'look'))&&/single curl/.test(text(w,'curl')),'the plain sign was remembered wrong');
  talk(w,0);
  check(w.memory.life.intro.sign==='outside','the first sign in the small room was not outside');
  w.door.holdT=5;for(let t=0;t<1.5;t+=.25)SIM.update(w,.25);
  frames['both-signs-small-room']=__dev.shot({x:20,y:120,w:70,h:120,scale:4},{world:w});
  for(let t=0;t<900&&w.memory.life.projects.cafeSign.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(SCENE.hasFurniture(w,'cafe-sign'),'no plain sign');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  w.door.holdT=5;for(let t=0;t<2;t+=.25)SIM.update(w,.25);
  frames['plain-sign-through-the-door']=__dev.shot({x:20,y:120,w:70,h:120,scale:4},{world:w});
  checks.push('plain letters, in the small room');
  return {checks};
})()
