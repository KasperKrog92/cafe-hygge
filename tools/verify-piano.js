/* The piano, in the room the expansion opened. Offered only once the room is
   open (never where the fuller room already has one); Saira mentions the
   church hall's old upright before it is bought. Keira and Tomas wheel it in
   on a dolly, wrapped in blankets, and tip it into the corner; Lunafreya
   unwraps it, wipes it down and lifts the lid, and it joins the room with its
   bench and lamp. At the piano Saira tunes it (it arrives a little out of
   tune), plays her eight bars on it for the first time and asks which way
   they should go on; on a later visit, four hands or one listener. After
   that Lunafreya sometimes plays the tune on a quiet night. */
(function(){
  'use strict';
  const frames=window.pianoFrames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function spy(){
    const s={settings:{rain:true},calls:[]},heard=['pianoTuning','sairaPiano','sairaDuet','pianoStart'];
    Object.keys(SND).forEach(k=>{if(typeof SND[k]==='function')s[k]=heard.indexOf(k)<0?function(){}:function(){s.calls.push(k);};});
    s.pianoActive=()=>false;return s;
  }
  const SAIRA={'saira-introduced':true,'saira-room-quiet':true,'saira-listen-done':true,'saira-listen-sit':true,'saira-score-done':true,'saira-score-cafe':true};
  // A small café whose room has been opened, a fortnight in.
  function world(seed,flags,sound){
    const w=__dev.modestWorld({random:SIM.seededRandom(seed),sound:sound}),l=w.memory.life;
    l.projects.window={stage:'installed',step:4,time:0};l.projects.table={stage:'installed',step:6,time:0};
    l.projects.expansion={stage:'installed',step:6,time:0};l.room='full';R.installProjects(w);
    l.daysCompleted=14;l.openSeconds=14*780;l.savings=300;SIM.setMode(w,'game');
    Object.assign(w.memory.flags,{'home-calandra-done':true},flags);
    w.memory.bonds.saira={known:true,warmth:1,visits:6,lastDay:-1};
    setHour(w,11);return w;
  }
  const saira=w=>w.patrons.find(p=>p.regularId==='saira');
  function leave(w){
    for(let i=0;i<4*400;i++){const here=saira(w);if(!here)break;if(here.state==='seated')here.stay=Math.min(here.stay,0);SIM.update(w,.25);}
    check(!saira(w),'Saira never left');
  }
  function arrive(w,expect){
    leave(w);w.regulars.saira.force=true;w.spawnT=0;
    let p=null;for(let i=0;i<4*900;i++){p=saira(w);if(p&&p.state==='seated'&&p.low===1)break;SIM.update(w,.25);}
    check(p&&p.state==='seated','Saira never sat down');
    check((p.storyChapter||null)===expect,'Saira brought '+p.storyChapter+' instead of '+expect);
    return p;
  }
  function begin(w){
    SIM.setMode(w,'idle');check(!SIM.regularStoryAvailable(w,'saira'),'idle mode showed her story');SIM.setMode(w,'game');
    check(SIM.startRegularStory(w,'saira'),'her story would not start');
    for(let i=0;i<480&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    check(w.moment.phase==='talk','Lunafreya never reached Saira');
  }
  function talk(w,choice,heard){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const s=w.context.sound,before=s.calls?s.calls.length:0;
      SIM.update(w,.05);if(!w.moment)break;
      const line=SIM.momentLine(w);
      if(heard&&s.calls&&line===w.moment.lines[w.moment.index])(heard[line.id]=heard[line.id]||[]).push(...s.calls.slice(before));
      w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
    for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  }
  const text=(w,id)=>w.moment.lines.find(l=>l.id===id).text;

  // Offered only once the room is open, never where a piano already stands.
  const small=__dev.modestWorld({random:SIM.seededRandom(400)});
  check(!IMPROVEMENTS.offered(small,'piano'),'offered in the small room');
  check(!IMPROVEMENTS.offered(__dev.furnishedWorld({random:SIM.seededRandom(401)}),'piano'),'offered beside the fuller room\'s piano');
  // Saira mentions the church hall's old upright before one is bought.
  let w=world(410,SAIRA);
  arrive(w,'upright');begin(w);
  check(/church hall/.test(text(w,'further')),'no church hall upright');
  talk(w,0);check(w.memory.flags['saira-upright-done'],'upright scene not finished');
  checks.push('offered only once the room is open; Saira mentions the church hall\'s old upright ("out of tune in a friendly way")');

  // Bought on an evening; Keira and Tomas wheel it in; Lunafreya unwraps it.
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  SIM.plan(w,true);
  check(IMPROVEMENTS.offered(w,'piano'),'not offered in the opened room');
  const funds=w.memory.life.savings;
  check(SIM.buyProject(w,'piano')&&w.memory.life.savings===funds-120,'purchase or charge wrong');
  SIM.goToSleep(w);for(let t=0;t<2000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);
  const job=w.memory.life.projects.piano;let both=false;
  for(let t=0;t<900&&job.stage==='scheduled';t+=.25){
    SIM.update(w,.25);
    const k=w.deliveryVisitor,h=w.deliveryHelper;
    if(k&&h&&!both&&k.path&&k.path.length&&k.y>380){both=true;frames['dolly']=__dev.shot({x:Math.round(k.x)-70,y:Math.round(k.y)-80,w:140,h:100,scale:3},{world:w});}
  }
  check(both&&job.stage==='arrived','Keira and Tomas never brought it in together');
  check(w.deliveryHelper.quiet&&w.deliveryHelper.visitorId==='tomas'&&!SIM.visitorInvites(w).some(a=>a===w.deliveryHelper),'Tomas offered a hello while carrying a piano');
  frames['bundle-in-corner']=__dev.shot({x:0,y:420,w:160,h:140,scale:3},{world:w});
  for(let t=0;t<300&&(w.deliveryVisitor||w.deliveryHelper);t+=.25)SIM.update(w,.25);
  check(!w.deliveryVisitor&&!w.deliveryHelper,'the movers never left');
  let unwrapped=false;
  for(let t=0;t<900&&job.stage!=='installed';t+=.25){
    SIM.update(w,.25);
    if(job.stage==='working'&&job.step===1&&!unwrapped){unwrapped=true;frames['unwrapped']=__dev.shot({x:0,y:420,w:160,h:140,scale:3},{world:w});check(!__dev.audit(w).length,'audit while unwrapping: '+__dev.audit(w).join('; '));}
  }
  check(job.stage==='installed'&&SCENE.hasFurniture(w,'piano'),'the piano was never unwrapped');
  check(w.tables.some(t=>t.piano)&&w.seats.some(s=>s.piano),'no lid or bench joined the room');
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  frames['piano-in-the-corner']=__dev.shot({x:0,y:420,w:160,h:140,scale:3},{world:w});
  checks.push('120 coins; Keira and Tomas wheel it in on a dolly and tip it into the corner; Lunafreya unwraps it, wipes it and lifts the lid; lid and bench join the room');

  // At the piano: tuning, her eight bars, which way they go on.
  let sound=spy();w=world(420,Object.assign({'saira-upright-done':true},SAIRA),sound);
  w.memory.life.projects.piano={stage:'installed',step:3,time:0};R.installProjects(w);
  let p=arrive(w,'tuning');
  check(p.seat.piano,'Saira did not sit at the piano for her scene');
  for(let t=0;t<20;t+=.25){SIM.update(w,.25);check(!p.playing,'Saira played before her scene');}
  frames['saira-at-the-piano']=__dev.shot({x:0,y:420,w:160,h:140,scale:3},{world:w});
  begin(w);
  check(/church hall/.test(text(w,'got')),'the tuning forgot the church hall');
  const heard={};talk(w,1,heard);
  check((heard.tuning||[]).indexOf('pianoTuning')>=0&&(heard.play||[]).indexOf('sairaPiano')>=0,'no tuning or no tune: '+JSON.stringify(heard));
  check(w.memory.flags['piano-tuned']&&w.memory.flags['saira-tune-gentle']&&w.memory.flags['saira-tuning-done'],'tuning not saved');
  let played=false;for(let t=0;t<60&&!played;t+=.25){SIM.update(w,.25);played=p.playing;}
  check(played,'she did not play a little afterwards');
  checks.push('Saira sits at the piano and waits; she tunes it, plays her eight bars on it for the first time, and they go on gently (or brightly); then she plays a little');

  // Four hands, on a later visit, and the tune stays in the room.
  leave(w);setHour(w,11);p=arrive(w,'together');
  if(!p.seat.piano){leave(w);setHour(w,11);p=arrive(w,'together');}
  check(p.seat.piano,'Saira could not reach the piano');
  begin(w);
  check(/down, gently/.test(text(w,'rest')),'the rest of it forgot "gently"');
  const heard2={};talk(w,0,heard2);
  check((heard2.duet||[]).indexOf('sairaDuet')>=0&&w.memory.flags['saira-together-play'],'no duet');
  leave(w);
  // A quiet evening (another café with the tune in it): Lunafreya at the
  // piano, sometimes with Saira's tune first.
  sound=spy();w=world(430,Object.assign({'saira-tuning-done':true,'saira-tune-gentle':true,'saira-together-done':true,'saira-together-play':true,'piano-tuned':true},SAIRA),sound);
  w.memory.life.projects.piano={stage:'installed',step:3,time:0};R.installProjects(w);
  setHour(w,20);w.shop.accepting=false;
  let tune=false;const b=w.barista,tries=[];
  for(let n=0;n<12&&!tune;n++){
    for(let t=0;t<600&&(w.patrons.length||w.queue.length||b.state!=='idle');t+=.25){w.patrons.forEach(q=>{if(q.state==='seated')q.stay=Math.min(q.stay,0);});SIM.update(w,.25);}
    const before=sound.calls.length;b.forcedTask='piano';b.idleT=0;
    for(let t=0;t<60&&b.state!=='pianoPlaying';t+=.25)SIM.update(w,.25);
    tune=sound.calls.slice(before).indexOf('sairaDuet')>=0;tries.push(b.state+':'+w.patrons.length+':'+sound.calls.slice(before).join('/'));
    for(let t=0;t<12;t+=.25)SIM.update(w,.25);
    if(tune)check(sound.calls.slice(before).indexOf('pianoStart')>=0,'her own playing never followed the tune');
    b.pianoDur=0;for(let t=0;t<60&&b.state!=='idle';t+=.25)SIM.update(w,.25);
    setHour(w,20);
  }
  check(tune,'Lunafreya never played Saira\'s tune: '+tries.join(' | '));
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('four hands (her four low notes under the tune), and afterwards Lunafreya sometimes plays it at the piano on a quiet night before her own playing');
  return {checks};
})()
