/* Gifts from the neighbours: Keira asks once more about the photograph and
   takes it; on a later visit brings two prints (an early delivery morning
   and now), placed by the till as ordinary work or taken upstairs beside
   the harbour print; a second "not yet" ends her asking. Tomas's loaf
   becomes that night's supper (noticed once), and once the photographs are
   up he brings a frame from a board off the left window, fitted wherever
   they are. Gerda knits a scarf in her own colour, shows it in her own scene
   and wears it from then on. One story per visit; reloads keep everything. */
(function(){
  'use strict';
  const frames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function setHour(w,h){w.clockOffset=0;w.t=((h-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function restore(w){R.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function world(seed,flags){
    const w=__dev.furnishedWorld({random:SIM.seededRandom(seed)});
    SIM.setMode(w,'game');w.memory.life.daysCompleted=9;w.memory.life.openSeconds=9*780;
    Object.assign(w.memory.flags,flags);setHour(w,12);return w;
  }
  const KEIRA={'keira-introduced':true,'keira-hello-permission':true,'keira-cup-done':true};
  const TOMAS={'tomas-introduced':true,'tomas-hello-news':true,'tomas-cupboard-done':true};
  // An off-duty visit: whoever is here finishes, then they drop in again.
  function visit(w,id,expect){
    for(let i=0;i<4*400;i++){
      const here=w.patrons.find(p=>p.visitorId===id);if(!here)break;
      if(here.state==='seated')here.stay=Math.min(here.stay,0);
      SIM.update(w,.25);
    }
    check(!w.patrons.some(p=>p.visitorId===id),id+' never left');
    setHour(w,12.5);w.visitorDays={};if(id==='tomas')w.visitorDays.keira=w.memory.life.daysCompleted;
    let a=null;
    for(let i=0;i<4*900&&!a;i++){
      if(!w.patrons.some(p=>p.visitorId===id))R.arriveSocialVisitor(w);
      SIM.update(w,.25);
      a=w.patrons.find(p=>p.visitorId===id&&p.state==='seated');
    }
    check(a,id+' never sat down off duty');
    if(expect===null){for(let t=0;t<10;t+=.25)SIM.update(w,.25);check(!SIM.visitorStoryInvites(w).length,id+' offered a story that should wait');return a;}
    check(a.storyChapter===expect,id+' brought '+a.storyChapter+' instead of '+expect);
    SIM.setMode(w,'idle');check(!SIM.visitorStoryInvites(w).length,'idle mode showed '+id+'\'s story');SIM.setMode(w,'game');
    check(SIM.startVisitorStory(w,id),id+'\'s story would not start');
    for(let i=0;i<200&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    return a;
  }
  function talk(w,choice){
    for(let n=0;n<60&&w.moment&&w.moment.phase==='talk';n++){
      const line=SIM.momentLine(w);w.moment.visible=999;
      if(line.choices&&!line.choices.some(c=>w.memory.flags[c.flag]))SIM.advanceMoment(w,choice);else SIM.advanceMoment(w);
    }
    for(let t=0;t<30&&w.moment;t+=.25)SIM.update(w,.25);
  }
  function placed(w,id,msg){
    for(let t=0;t<600&&w.memory.life.projects[id].stage!=='installed';t+=.25)SIM.update(w,.25);
    check(w.memory.life.projects[id].stage==='installed',msg);
  }
  const crop={x:690,y:160,w:130,h:80,scale:4};

  // Keira: asked once more, a photograph taken, two prints brought and pinned by the till.
  let w=world(3,Object.assign({'keira-photo-later':true},KEIRA));
  const keira=visit(w,'keira','ask');talk(w,0);
  check(w.memory.flags['keira-photo-yes']&&w.memory.flags['keira-ask-done'],'the second asking did not save yes');
  let clicked=false;
  for(let t=0;t<12;t+=.25){SIM.update(w,.25);if(w.activeCaption&&/one quiet photograph/.test(w.activeCaption.text))clicked=true;}
  check(clicked&&!keira.photoPending,'no photograph was taken');
  check(!SIM.visitorStoryInvites(w).length,'the prints came on the same visit');
  visit(w,'keira','print');
  check(/first table/.test(w.moment.lines.find(l=>l.id==='two').text),'the prints forgot the first table');
  talk(w,0);
  check(w.memory.flags['keira-print-cafe']&&w.memory.life.projects.photo.stage!=='available','the prints were not handed over');
  frames['prints-on-counter']=__dev.shot({x:620,y:230,w:120,h:70,scale:4},{world:w});
  placed(w,'photo','the photographs were never pinned up');
  check(SCENE.hasFurniture(w,'keira-photo'),'pinned photographs are not in the room');
  frames['prints-by-the-till']=__dev.shot(crop,{world:w});
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  visit(w,'keira',null);
  checks.push('Keira asks once more, takes the photograph, and on a later visit brings two prints pinned up by the till');

  // Tomas: the loaf (supper that night, noticed once), then a frame from the window board.
  Object.assign(w.memory.flags,TOMAS);
  visit(w,'tomas','bread');talk(w,1);
  check(w.memory.flags['tomas-bread-done']&&w.memory.flags['tomas-bread-crust'],'bread answer not saved');
  w=restore(w);setHour(w,21.45);
  let seen=0;
  function watch(){const c=w.activeCaption;if(c&&/Tomas’s bread/.test(c.text)&&c.__seen!==1){c.__seen=1;seen++;}}
  for(let t=0;t<900&&w.shop.phase!=='home';t+=.25){SIM.update(w,.25);watch();}
  for(let t=0;t<200;t+=.25){SIM.update(w,.25);watch();}
  if(!seen)throw Error('no bread supper: '+JSON.stringify({flag:!!w.memory.flags['home-bread-eaten'],phase:w.shop.phase,
    meal:w.homeMeal,dinner:w.memory.life.homeDinner,day:w.memory.life.daysCompleted}));
  check(seen===1&&w.memory.flags['home-bread-eaten'],'the loaf was not supper (seen '+seen+')');
  SIM.goToSleep(w);for(let t=0;t<2000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);
  visit(w,'tomas','frame');
  check(/by the till/.test(SIM.momentLine(w).text),'the frame forgot where the photographs are');
  talk(w,0);
  placed(w,'frame','the frame was never fitted');
  frames['framed-by-the-till']=__dev.shot(crop,{world:w});
  check(!__dev.audit(w).length,'audit: '+__dev.audit(w).join('; '));
  checks.push('Tomas brings the loaf (that night\'s supper, noticed once) and a frame from the window board, fitted by the till');

  // Upstairs: the prints and the frame go home beside the harbour print.
  w=world(4,Object.assign({'keira-photo-yes':true},KEIRA,TOMAS,{'tomas-bread-done':true}));
  w.memory.life.homeUnpack.boxes=1;
  visit(w,'keira','print');talk(w,1);
  check(w.memory.flags['keira-print-home'],'home answer not saved');
  for(let t=0;t<120;t+=.25){SIM.update(w,.25);check(w.barista.project!=='photo','the prints were pinned downstairs');}
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  for(let t=0;t<600&&w.memory.life.projects.photo.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(w.memory.life.projects.photo.stage==='installed','the prints never went up at home');
  SIM.goToSleep(w);for(let t=0;t<2000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);
  visit(w,'tomas','frame');
  check(/above your desk/.test(SIM.momentLine(w).text),'the frame forgot the photographs are upstairs');
  talk(w,0);
  setHour(w,21.45);for(let t=0;t<900&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);
  for(let t=0;t<600&&w.memory.life.projects.frame.stage!=='installed';t+=.25)SIM.update(w,.25);
  check(w.memory.life.projects.frame.stage==='installed','the frame never went up at home');
  frames['framed-above-the-desk']=__dev.shot({x:400,y:160,w:110,h:70,scale:4},{world:w});
  checks.push('taken upstairs, the prints go beside the harbour print, and Tomas\'s frame follows them');

  // A second "not yet" ends Keira's asking kindly.
  w=world(5,Object.assign({'keira-photo-later':true},KEIRA));
  visit(w,'keira','ask');talk(w,1);
  check(w.memory.flags['keira-photo-someday']&&!w.memory.flags['keira-photo-yes'],'someday not saved');
  visit(w,'keira',null);
  check(w.memory.life.projects.photo.stage==='available','prints without a photograph');
  checks.push('a second "not yet": Keira stops asking, and no photograph appears');

  // Gerda's own colour: asked, knitted, shown, worn.
  w=world(6,{'gerda-introduced':true,'gerda-pillows-accepted':true,'gerda-pillow-left':true,'gerda-pillow-right':true,
    'gerda-window-thanked':true,'gerda-blanket-asked':true,'gerda-blanket-given':true,'fireplace-unlocked':true});
  w.memory.arcs['gerda-scarf']={stage:1,progress:5,pendingBeat:null};w.memory.arcs['gerda-blanket']={stage:1,progress:6,pendingBeat:null};
  function gerdaIn(chapter){
    for(let i=0;i<4*400;i++){const g=w.patrons.find(p=>p.regularId==='gerda');if(!g)break;if(g.state==='seated')g.stay=Math.min(g.stay,0);SIM.update(w,.25);}
    setHour(w,10.2);w.regulars.gerda.force=true;w.spawnT=0;
    let g=null;for(let i=0;i<4*900&&!(g=SIM.gerdaAvailable(w));i++)SIM.update(w,.25);
    check(g,'Gerda brought nothing');
    if(chapter)check(g.storyChapter===chapter||chapter==='colourShow','Gerda brought '+g.storyChapter);
    check(SIM.startGerda(w),'Gerda\'s scene would not start');
    for(let i=0;i<200&&w.moment.phase!=='talk';i++)SIM.update(w,.25);
    return g;
  }
  gerdaIn('colour');
  check(/custard/.test(w.moment.lines.find(l=>l.id==='erik').text),'wrong scene');
  talk(w,1);
  check(w.memory.flags['gerda-colour-asked']&&w.memory.flags['gerda-colour-both'],'colour not asked');
  let g=w.patrons.find(p=>p.regularId==='gerda');
  for(let t=0;t<60&&!g.knitting;t+=.25)SIM.update(w,.25);
  check(g.knitting&&g.knitColor==='#d9a33c'&&g.knitPattern==='stripe','she is not knitting yellow with a stripe');
  frames['gerda-knitting-yellow']=__dev.shot(g.name,{world:w,scale:4});
  R.advanceArcs(w,4);
  check(w.memory.arcs['gerda-own'].pendingBeat,'the scarf never finished');
  g=gerdaIn('colourShow');talk(w,1);
  check(w.memory.flags['gerda-colour-worn']&&g.colors.scarf==='#d9a33c'&&g.colors.scarfStripe==='#a94f3f','she did not put it on');
  w=restore(w);
  for(let i=0;i<4*400;i++){SIM.update(w,.25);}
  setHour(w,10.2);w.regulars.gerda.force=true;w.spawnT=0;
  for(let i=0;i<4*900&&!(g=w.patrons.find(p=>p.regularId==='gerda'));i++)SIM.update(w,.25);
  check(g&&g.colors.scarf==='#d9a33c','the scarf did not come back after a reload');
  check(!SIM.gerdaAvailable(w),'Gerda offered another scene');
  frames['gerda-in-yellow']=__dev.shot(g.name,{world:w,scale:4});
  checks.push('Gerda knits a yellow scarf with one stripe of Erik\'s rust, shows it, and wears it from then on');
  window.giftFrames=frames;return {checks};
})()
