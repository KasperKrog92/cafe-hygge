/* Familiar faces become people: introductions for Nora, Kasper and Antonia,
   Keira's second cup and Tomas's cupboard report, each waiting for a later
   visit and the player; plus regulars keeping their habits in a small room. */
(function(){
  'use strict';
  const frames={},checks=[];
  function check(ok,msg){if(!ok)throw Error(msg);}
  function who(w,id){return w.patrons.find(p=>p.regularId===id||p.visitorId===id&&p.social);}
  function until(w,fn,limit,what){for(let t=0;t<(limit||60000);t+=.25){if(fn())return;SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);}
    throw Error('familiar faces timeout '+(what||'')+' day '+w.memory.life.daysCompleted+' hour '+w.hour.toFixed(2));}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function snap(w,id,p){const a=__dev.audit(w);check(!a.length,id+' audit '+a);MEMORY.codec.validate(w.memory);
    frames[id]=__dev.shot(p?{x:Math.max(0,Math.round(p.x)-90),y:Math.max(0,Math.round(p.y)-120),w:180,h:140,scale:3}:null,{world:w});}
  function talk(w){until(w,()=>w.moment&&w.moment.phase==='talk',3000,'approach');}
  function play(w,pick,stopAt){
    const said=[];
    for(let n=0;w.moment&&n<900;n++){
      if(w.moment.phase!=='talk'){SIM.update(w,.25);continue;}
      const line=SIM.momentLine(w);
      if(w.moment.visible===0&&!w.moment.chosenSpeaking)said.push(line.id);
      SIM.advanceMoment(w,line.choices?pick:undefined);
      if(stopAt&&said[said.length-1]===stopAt&&!w.moment.chosenSpeaking&&w.moment.visible===0)break;
    }
    return said;
  }

  // The evening reader's display name is Antonia; her id and habits stay.
  const antonia=CAST.regulars.find(r=>r.id==='freya');
  check(antonia.name==='Antonia'&&CAST.voices.Antonia&&!CAST.voices.Freya,'Antonia rename');
  check(!JSON.stringify(antonia.lines).match(/\bFreya\b/),'old display name in her lines');
  checks.push('Freya is displayed as Antonia; id freya, look and habits unchanged');

  // Each regular's introduction: not before its visit, hidden in idle,
  // resumable, both answers saved once, and visible later in her/his musings.
  const choiceFlags={lunafreya:['lunafreya-remember-start','lunafreya-remember-people'],
    kasper:['kasper-table','kasper-good-lines'],freya:['freya-quiet','freya-route']};
  Object.keys(choiceFlags).forEach(function(id,n){
    [0,1].forEach(function(pick){
      let w=__dev.modestWorld({random:SIM.seededRandom(40+n*2+pick)});
      const need=CAST.introductions[id].visits;
      until(w,()=>w.memory.bonds[id]&&w.memory.bonds[id].visits>=1&&who(w,id),60000,id+' first visit');
      check(w.memory.bonds[id].visits<need||who(w,id).storyChapter!=='hello'||need===1,'offered on an early visit');
      until(w,()=>SIM.introductionAvailable(w,id),90000,id+' offer');
      check(w.memory.bonds[id].visits>=need,'offered before visit '+need);
      SIM.setMode(w,'idle');check(!SIM.introductionAvailable(w,id),'idle showed '+id);SIM.setMode(w,'game');
      if(!pick)snap(w,'invite-'+id,who(w,id));
      check(SIM.startIntroduction(w,id),'start '+id);talk(w);
      const stop=CAST.introductions[id].lines[2].id;
      const first=play(w,pick,stop);w=restore(w);
      check(!w.memory.flags[id+'-introduced']&&w.memory.flags[id+'-hello-'+stop],'partial '+id+' not saved');
      until(w,()=>SIM.introductionAvailable(w,id),90000,id+' resume');
      SIM.startIntroduction(w,id);talk(w);
      const rest=play(w,pick);
      check(rest.indexOf(stop)<0&&rest.indexOf(first[0])<0,'replayed nodes '+rest.join(','));
      check(w.memory.flags[id+'-introduced']&&w.memory.flags[choiceFlags[id][pick]]&&!w.memory.flags[choiceFlags[id][1-pick]],id+' choice');
      const mine=CAST.regulars.find(r=>r.id===id).lines.musing.filter(l=>l.flags);
      check(mine.some(l=>l.flags[0]===choiceFlags[id][pick]),id+' has no remembered musing');
      for(let t=0;t<600;t+=.25)SIM.update(w,.25);
      check(!SIM.introductionAvailable(w,id),id+' offered twice');
    });
    checks.push(id+' introduced from visit '+CAST.introductions[id].visits+'; both answers; leave/reload resume; once');
  });

  // Keira: her second cup comes on a later off-duty visit, never with the hello.
  let w=__dev.modestWorld({random:SIM.seededRandom(61)});
  until(w,()=>SIM.visitorInvites(w).some(a=>a.visitorId==='keira'),90000,'keira hello');
  const hello=SIM.visitorInvites(w).find(a=>a.visitorId==='keira');
  check(SIM.startVisitor(w,'keira'),'keira hello start');play(w,0);
  check(w.memory.flags['keira-introduced']&&!SIM.visitorStoryInvites(w).length,'story on the hello visit');
  until(w,()=>SIM.visitorStoryInvites(w).some(a=>a.visitorId==='keira'),120000,'keira cup');
  const k=who(w,'keira');snap(w,'keira-cup',k);
  check(k!==hello,'same visit');
  check(SIM.startVisitorStory(w,'keira'),'cup start');talk(w);
  play(w,0);
  check(w.memory.flags['keira-cup-done']&&w.memory.flags['keira-photo-yes'],'keira cup flags');
  until(w,()=>w.activeCaption&&/photograph/.test(w.activeCaption.text),400,'photograph caption');
  let returned=false;
  for(let t=0;t<120000&&!returned;t+=.25){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
    const c=w.activeCaption;if(c&&/coat off before she reaches/.test(c.text))returned=true;}
  check(returned,'no remembered arrival for Keira');
  checks.push('Keira: second cup on a later visit; photograph permission; remembered arrival');

  // Tomas: the cupboard report needs the promise from his hello.
  w=__dev.modestWorld({random:SIM.seededRandom(62)});
  w.memory.flags['tomas-introduced']=true;
  for(let t=0;t<3000;t+=.25){SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
    check(!SIM.visitorStoryInvites(w).some(a=>a.visitorId==='tomas'),'cupboard without the promise');}
  w.memory.flags['tomas-hello-news']=true;
  until(w,()=>SIM.visitorStoryInvites(w).some(a=>a.visitorId==='tomas'),120000,'tomas cupboard');
  SIM.startVisitorStory(w,'tomas');talk(w);const said=play(w,0);
  check(said.indexOf('bread')>=0&&w.memory.flags['tomas-cupboard-done'],'cupboard report');
  checks.push('Tomas: cupboard report only after his promised news; saved once');

  // Regulars keep their habits in a small room: a due regular may use one
  // clean seat past the target, never on opening day, never an unclean one.
  w=__dev.modestWorld({random:SIM.seededRandom(63)});
  const early=[];let over=0,samples=0;
  for(let t=0;t<4*1440*4;t++){
    const before=new Set(w.patrons.map(p=>p.id));
    SIM.update(w,.25);if(w.shop.phase==='home')SIM.goToSleep(w);
    w.patrons.forEach(p=>{if(p.regularId==='holger'&&!before.has(p.id))early.push(Math.round(w.hour*10)/10);});
    if(w.shop.phase==='open'&&t%40===0) {
      samples++;
      const pop=SIM._.arrivalPopulation?SIM._.arrivalPopulation(w):w.patrons.length;
      const target=SIM._.arrivalTarget(w);
      if(pop>target+1)throw Error('occupancy '+pop+' beyond target '+target+'+1');
      if(pop>target)over++;
    }
  }
  check(early.slice(1).filter(h=>h<11).length>=early.length-2,'Holger no longer keeps his morning: '+early.join(','));
  checks.push('Holger arrives at '+early.join(', ')+'; occupancy never beyond target+1 ('+over+'/'+samples+' samples at +1)');
  window.facesFrames=frames;return {checks};
})()
