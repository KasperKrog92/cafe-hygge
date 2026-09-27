/* Birgit, the baker: breakfast in somebody else's place. She keeps her
   rhythm from the café's second week and orders the café's bun; her hello
   comes on her second visit (being served; no shop talk, or a nine
   o'clock); then closing habits (Lunafreya's chairs, or everybody else's
   last job, recalling the old shop mug where it lives); then tastes, a paper
   bag set on the counter as she orders (taken home again if ignored, eaten
   when the scene is done); then the handwritten recipe card, by the cake
   stand or on the kitchen wall upstairs. No oven is needed. One story per
   visit, hidden in idle mode, resumed after a reload. */
(function(){
  'use strict';
  const frames=window.birgitFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function world(seed,flags){
    const w=__dev.furnishedWorld({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=11;w.memory.life.openSeconds=11*780;
    Object.assign(w.memory.flags,{'home-calandra-done':true},flags);
    w.memory.bonds.birgit={known:true,warmth:1,visits:4,lastDay:-1};
    setHour(w,9.5);return w;
  }
  const birgit=w=>w.patrons.find(p=>p.regularId==='birgit');
  function leave(w){
    for(let i=0;i<4*400;i++){const here=birgit(w);if(!here)break;if(here.state==='seated')here.stay=Math.min(here.stay,0);SIM.update(w,.25);}
    check(!birgit(w),'Birgit never left');
  }
  function arrive(w,expect){
    leave(w);w.regulars.birgit.force=true;w.spawnT=0;
    let p=null;for(let i=0;i<4*900;i++){p=birgit(w);if(p&&p.state==='seated')break;SIM.update(w,.25);}
    check(p&&p.state==='seated','Birgit never sat down');
    check((p.storyChapter||null)===expect,'Birgit brought '+p.storyChapter+' instead of '+expect);
    return p;
  }
  function begin(w){
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,'birgit'),'idle mode showed her story');SIM.setMode(w,'game');
    check(SIM.invitations(w).some(i=>i.key==='birgit'),'no invitation for Birgit');
    check(SIM.startRegularStory(w,'birgit'),'her story would not start');
    for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    check(w.moment.phase==='talk','Lunafreya never reached Birgit');
  }
  function talk(w,choice,stop){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const line=SIM.momentLine(w);if(stop&&stop(line))return;
      w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
    for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  }
  const text=(w,id)=>w.moment.lines.find(l=>l.id===id).text;
  function musing(flag){return CAST.regulars.find(r=>r.id==='birgit').lines.musing.some(m=>m.flags&&m.flags.indexOf(flag)>=0);}

  // Her rhythm from the second week; the hello waits for her second visit.
  let w=__dev.modestWorld({random:SIM.seededRandom(150)});
  w.memory.life.projects.window={stage:'installed',step:4,time:0};w.memory.life.projects.table={stage:'installed',step:6,time:0};R.installProjects(w);
  const visits=[];
  for(let t=0;t<400000&&!SIM.introductionAvailable(w,'birgit');t+=.25){
    SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
    const p=birgit(w);if(!p||visits.indexOf(p.id)>=0)continue;
    visits.push(p.id);const day=w.memory.life.daysCompleted;
    check(day>=8&&(day+1)%3===0,'Birgit off her rhythm on day '+day);
    check(w.hour>=9.3&&w.hour<12,'Birgit came for breakfast at '+w.hour.toFixed(2));
    if(visits.length===1)check(p.storyChapter!=='hello','Birgit introduced herself on her first visit');
  }
  check(SIM.introductionAvailable(w,'birgit'),'no hello');
  check(w.memory.bonds.birgit.visits===2,'Birgit introduced on visit '+w.memory.bonds.birgit.visits);
  check(birgit(w).drink.name==='cardamom bun','Birgit did not order the bun');
  SIM.setMode(w,'idle');check(!SIM.introductionAvailable(w,'birgit'),'idle mode showed her hello');SIM.setMode(w,'game');
  check(SIM.startIntroduction(w,'birgit'),'her hello would not start');
  for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
  talk(w,1);
  check(w.memory.flags['birgit-introduced']&&w.memory.flags['birgit-no-shop'],'hello answer not saved');
  check(!SIM.regularStoryAvailable(w,'birgit'),'her next scene followed on the same visit');
  check(musing('birgit-served')&&musing('birgit-no-shop'),'her musings do not remember the answer');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('Birgit comes for breakfast on her rhythm from day 8, orders the café\'s bun, and says hello on her second visit');

  // Closing habits: no shop talk remembered; the old mug recalled where it lives; a reload resumes.
  w=world(160,{'birgit-introduced':true,'birgit-no-shop':true,'luna-mug-cafe':true});
  arrive(w,'closing');begin(w);
  check(/No shop talk/.test(text(w,'ask')),'the closing question forgot "no shop talk"');
  check(/old shop mug\. Standing up/.test(text(w,'mine')),'the closing scene forgot the mug downstairs');
  talk(w,1,line=>line.id==='own');
  w=restore(w);setHour(w,9.5);
  check(w.memory.flags['luna-closing-others']&&!w.memory.flags['birgit-closing-done'],'partial scene not saved');
  arrive(w,'closing');begin(w);
  check(SIM.momentLine(w).id==='own','resumed at '+SIM.momentLine(w).id);
  talk(w,1);
  check(w.memory.flags['birgit-closing-done'],'closing not finished');
  checks.push('closing habits: the ugliest bun standing at the window; everybody else\'s last job; the mug remembered; a reload resumes at "own"');

  // Tastes: the bag waits on the counter while she orders; ignored, it goes home with her.
  let p=arrive(w,'tastes');
  check(w.counterParcel&&w.counterParcel.owner===p.id&&w.counterParcel.kind==='tastes','no bag on the counter');
  frames['bag-on-counter']=__dev.shot({x:620,y:230,w:120,h:70,scale:4},{world:w});
  leave(w);check(!w.counterParcel,'the bag stayed behind when she left');
  p=arrive(w,'tastes');begin(w);
  check(/everybody else's last job/.test(text(w,'you')),'tastes forgot the old shop');
  talk(w,1);
  check(w.memory.flags['luna-taste-cardamom']&&w.memory.flags['birgit-tastes-done']&&!w.counterParcel,'tastes not finished, or the bag was left');
  check(!SIM.regularStoryAvailable(w,'birgit'),'the recipe came on the same visit');
  checks.push('tastes: the paper bag waits on the counter (taken home if ignored), and what Lunafreya likes for herself is kept');

  // The recipe card, by the cake stand; its title follows her taste.
  arrive(w,'recipe');begin(w);
  check(/Cardamom buns for Lunafreya/.test(text(w,'title')),'the card forgot her taste');
  talk(w,0);
  check(w.memory.flags['birgit-recipe-cafe']&&w.memory.life.projects.recipe.stage==='scheduled','the card was not handed over');
  for(let t=0;t<600&&w.memory.life.projects.recipe.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(SCENE.hasFurniture(w,'birgit-recipe'),'the card was never placed');
  frames['recipe-by-cake-stand']=__dev.shot({x:740,y:230,w:100,h:70,scale:4},{world:w});
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  check(musing('birgit-recipe-done'),'no musing remembers the recipe');
  checks.push('the recipe card ("Cardamom buns for Lunafreya"), tucked by the cake stand for the day there is an oven');

  // Upstairs instead: the kitchen wall.
  w=world(170,{'birgit-introduced':true,'birgit-served':true,'birgit-closing-done':true,'luna-closing-chairs':true,'birgit-tastes-done':true,'luna-taste-orange':true});
  arrive(w,'recipe');begin(w);
  check(/Orange buns for Lunafreya/.test(text(w,'title')),'the card forgot the orange');
  talk(w,1);
  check(w.memory.flags['birgit-recipe-home'],'home answer not saved');
  for(let t=0;t<120;t+=.25){SIM.update(w,.25);check(w.barista.project!=='recipe','the card was placed downstairs');}
  w.memory.life.homeUnpack.boxes=7;
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  for(let t=0;t<600&&w.memory.life.projects.recipe.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(w.memory.life.projects.recipe.stage==='installed','the card never went up at home');
  frames['recipe-kitchen-wall']=__dev.shot({x:130,y:350,w:130,h:80,scale:4},{world:w});
  checks.push('taken upstairs, the recipe card goes up on the kitchen wall');
  return {checks};
})()
