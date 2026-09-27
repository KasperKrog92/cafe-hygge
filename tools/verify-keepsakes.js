/* Things worth taking upstairs: evening moments at home (Calandra's first
   letter, the old shop mug) and Gerda's blanket from its question to its
   place, downstairs or upstairs. Every step saves once and survives reload. */
(function(){
  'use strict';
  const frames={},checks=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function valid(w,id){try{MEMORY.codec.validate(w.memory);}catch(e){throw Error(id+': '+e.message);}}
  function snap(w,id,box){if(w.shop.phase!=='home'){const a=__dev.audit(w);check(!a.length,id+' audit '+a);}valid(w,id);
    frames[id]=__dev.shot(box||null,{world:w});}
  function run(w,fn,limit,what,stayHome){for(let t=0;t<(limit||60000);t+=.25){if(fn())return;SIM.update(w,.25);
    if(w.shop.phase==='home'&&!stayHome)SIM.goToSleep(w);}
    throw Error('keepsakes timeout '+(what||'')+' day '+w.memory.life.daysCompleted+' '+w.shop.phase);}
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
  function home(w){run(w,()=>w.shop.phase==='home',60000,'home',true);}

  // Calandra's letter: from the third evening, game mode, over Lunafreya.
  let w=__dev.modestWorld({random:SIM.seededRandom(51)});
  home(w);check(w.memory.life.daysCompleted===1&&!SIM.eveningStory(w),'letter on the first ordinary evening');
  SIM.goToSleep(w);run(w,()=>w.shop.phase==='open');home(w);
  check(w.memory.life.daysCompleted===2&&!SIM.eveningStory(w),'letter too early');
  SIM.goToSleep(w);run(w,()=>w.shop.phase==='open');home(w);
  check(SIM.eveningStory(w)==='calandra','no letter on the third evening');
  const inv=SIM.invitations(w).find(i=>i.key==='evening');
  check(inv&&inv.actor===w.barista&&inv.icon==='letter'&&/Calandra/.test(inv.label),'letter invitation');
  SIM.setMode(w,'idle');check(!SIM.eveningStory(w),'idle shows the letter');SIM.setMode(w,'game');
  run(w,()=>w.barista.pose==='pc',4000,'desk',true);snap(w,'letter-waiting',{x:250,y:150,w:260,h:180,scale:3});
  check(SIM.startEveningStory(w),'letter start');
  const held=w.memory.life.homeTime;
  for(let t=0;t<20;t+=.25)SIM.update(w,.25);
  check(w.memory.life.homeTime===held&&w.moment,'evening routine ran during the letter');
  check(!SIM.goToSleep(w)&&!SIM.plan(w,true),'bed or planner opened over the letter');
  frames['letter-reading']=__dev.shot(null,{world:w});
  play(w,1,'crossword');w=restore(w);
  check(w.memory.flags['home-calandra-crossword']&&!w.memory.flags['home-calandra-done'],'partial letter not saved');
  check(SIM.eveningStory(w)==='calandra'&&SIM.startEveningStory(w),'letter did not wait across reload');
  const rest=play(w,1);
  check(rest[0]==='clue'&&w.memory.flags['calandra-told-place']&&!w.memory.flags['calandra-told-people']&&w.memory.flags['home-calandra-done'],'letter resume/choice '+rest);
  check(!SIM.eveningStory(w),'second story the same evening');
  snap(w,'letter-on-desk',{x:300,y:220,w:140,h:100,scale:4});
  checks.push('Calandra\'s letter on the third evening; holds the evening; resumes after reload; choice saved; letter left on the desk');

  // The old mug follows Holger's handover, and remembers where it went.
  for(const pick of [0,1]) {
    w=__dev.modestWorld({random:SIM.seededRandom(52+pick)});
    w.memory.flags[pick?'luna-bookshop-later':'luna-bookshop-fond']=true;
    home(w);check(SIM.eveningStory(w)==='mug','mug not first after the disclosure');
    check(SIM.startEveningStory(w),'mug start');
    const line=w.moment.lines.find(l=>l.id==='holger').text;
    check(pick?/another day/.test(line):/loved a lot of it/.test(line),'mug forgot her answer to Holger');
    play(w,pick);
    check(w.memory.flags[pick?'luna-mug-cafe':'luna-mug-home']&&!w.memory.flags[pick?'luna-mug-home':'luna-mug-cafe'],'mug choice');
    if(pick) {
      SIM.goToSleep(w);run(w,()=>w.shop.phase==='open');snap(w,'mug-downstairs',{x:640,y:180,w:120,h:70,scale:4});
      let seen=false;
      for(let t=0;t<40000&&!seen;t+=.25){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
        if(w.activeCaption&&/old mug/.test(w.activeCaption.text))seen=true;}
      check(seen,'the mug never kept its closing habit');
    } else snap(w,'mug-on-desk',{x:300,y:220,w:140,h:100,scale:4});
  }
  checks.push('the old mug after Holger\'s handover remembers her answer; desk or café, with its closing habit');

  // Gerda's blanket: asked on a later visit once the scarf is given.
  function gerdaCafe(seed){
    const v=__dev.modestWorld({random:SIM.seededRandom(seed)}),f=v.memory.flags;
    v.memory.life.projects.window={stage:'installed',step:4,time:0};
    f['gerda-introduced']=f['fireplace-unlocked']=f['gerda-pillows-accepted']=true;
    return v;
  }
  w=gerdaCafe(60);
  const days=w.memory.life.daysCompleted;
  for(let t=0;t<2*1440;t+=.25){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
  check(w.memory.arcs['gerda-blanket'].progress===0,'blanket knitted before she asked');
  check(!w.patrons.some(p=>p.regularId==='gerda'&&p.storyChapter==='blanket'),'asked before the scarf was given');
  w.memory.arcs['gerda-scarf']={stage:1,progress:5,pendingBeat:null};w.memory.flags['cat-wore-scarf']=true;w.cat.scarf='#a94f3f';
  const present=w.patrons.find(p=>p.regularId==='gerda');
  if(present)check(!SIM.gerdaAvailable(w)||SIM.gerdaAvailable(w)!==present||present.storyChapter!=='blanket','asked on the visit that made it possible');
  run(w,()=>SIM.gerdaAvailable(w)&&SIM.gerdaAvailable(w).storyChapter==='blanket',120000,'blanket question');
  snap(w,'blanket-question');
  SIM.startGerda(w);play(w,1,'pattern');w=restore(w);
  check(!w.memory.flags['gerda-blanket-asked']&&w.memory.flags['gerda-blanket-pattern'],'partial question');
  run(w,()=>SIM.gerdaAvailable(w)&&SIM.gerdaAvailable(w).storyChapter==='blanket',120000,'question again');
  SIM.startGerda(w);play(w,1);
  check(w.memory.flags['gerda-blanket-asked']&&w.memory.flags['gerda-blanket-stars']&&!w.memory.flags['gerda-blanket-reeds'],'pattern choice');
  run(w,()=>w.patrons.some(p=>p.regularId==='gerda'&&p.knitting&&p.knitPattern==='stars'&&p.knitColor==='#3d4a5c'),200000,'knitting stars');
  const knitter=w.patrons.find(p=>p.regularId==='gerda');
  frames['blanket-knitting']=__dev.shot({x:Math.round(knitter.x)-40,y:Math.round(knitter.y)-70,w:80,h:80,scale:4},{world:w});
  run(w,()=>w.memory.arcs['gerda-blanket'].pendingBeat==='finished',400000,'knitting done');
  check(!SIM.beatAt(w,-100,-100)&&w.memory.arcs['gerda-blanket'].pendingBeat,'blanket payoff fired as a caption beat');
  run(w,()=>SIM.gerdaAvailable(w),200000,'gift visit');
  SIM.startGerda(w);
  check(/two hundred and twelve/i.test(w.moment.lines.find(l=>l.id==='count').text),'gift forgot the stars');
  play(w,0);
  check(w.memory.flags['gerda-blanket-given']&&w.memory.flags['gerda-blanket-cafe']&&w.memory.arcs['gerda-blanket'].stage===1&&
    !w.memory.arcs['gerda-blanket'].pendingBeat&&w.memory.life.projects.blanket.stage==='scheduled','gift result');
  w=restore(w);check(w.memory.life.projects.blanket.stage==='scheduled','gift lost on reload');
  snap(w,'blanket-on-counter',{x:600,y:220,w:120,h:70,scale:4});
  run(w,()=>w.memory.life.projects.blanket.stage==='installed',40000,'drape');
  snap(w,'blanket-on-chair',{x:320,y:370,w:120,h:100,scale:4});
  // A detached render copy with the room emptied shows the draped chair.
  const view=structuredClone(w);view.patrons=[];view.umbrellaStand=[];view.seats.forEach(s=>{s.taken=false;});
  frames['blanket-chair-empty']=__dev.shot({x:320,y:370,w:120,h:100,scale:4},{world:view});
  check(SIM.gerdaAvailable(w)===null||SIM.gerdaAvailable(w).storyChapter!=='blanket','blanket asked twice');
  checks.push('blanket: not before the scarf or the question; asked on a later visit; stars knitted and counted; café drape as ordinary work');

  // Chosen for home: it waits on the counter, then goes up and onto the bed.
  w=gerdaCafe(61);const f=w.memory.flags;
  w.memory.arcs['gerda-scarf']={stage:1,progress:5,pendingBeat:null};f['cat-wore-scarf']=true;
  f['gerda-blanket-asked']=f['gerda-blanket-reeds']=true;w.memory.arcs['gerda-blanket']={stage:0,progress:6,pendingBeat:'finished'};
  run(w,()=>SIM.gerdaAvailable(w)&&!w.moment,200000,'home gift visit');
  SIM.startGerda(w);play(w,1);
  check(f['gerda-blanket-home']&&w.memory.life.projects.blanket.stage==='scheduled','home choice');
  for(let t=0;t<600;t+=.25){SIM.update(w,.25);check(w.barista.project!=='blanket','carried a home keepsake to the chair');}
  run(w,()=>w.shop.phase==='home',60000,'evening',true);
  frames['blanket-on-bag']=__dev.shot({x:200,y:240,w:120,h:90,scale:4},{world:w});
  w=restore(w);
  run(w,()=>w.memory.life.projects.blanket.stage==='installed',6000,'onto the bed',true);
  snap(w,'blanket-on-bed',{x:680,y:220,w:170,h:150,scale:3});
  checks.push('blanket for home: waits on the counter, comes up with her, lies on the bed after a reload');
  window.keepsakeFrames=frames;return {checks};
})()
