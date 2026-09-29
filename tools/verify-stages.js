/* Dev stages (js/dev-stages.js): the autoplayer plays a new café through the
   whole shipped story without getting stuck, through the real conversations,
   purchases, work, evenings and beats. Every morning it keeps is an ordinary
   save that opens into a clean café. Skipping to the next morning leaves
   stories and purchases alone. Other answers play through too, and the
   cached playthrough is reused and extended rather than replayed. */
(function(){
  'use strict';
  const checks=[],R=SIM._;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function open(save){return SIM.create({random:SIM.seededRandom(9),memory:MEMORY.createStore({state:JSON.parse(save)})});}
  function audit(w,when){const a=__dev.audit(w);check(!a.length,'audit '+when+': '+a.join('; '));}

  // The whole story, from a new café.
  const t0=performance.now();
  const run=__dev.play({seed:3});
  const ms=Math.round(performance.now()-t0);
  check(!run.stuck,'the playthrough got stuck: '+run.stuck);
  const days=run.days,last=JSON.parse(days[days.length-1].save),f=last.flags,l=last.life;
  check(days[0].day===1&&days[0].save===null&&days.every((d,i)=>d.day===i+1),'mornings are not consecutive café days');
  days.slice(1).forEach(d=>{const r=MEMORY.codec.decode(d.save);check(!r.error&&r.state.life.daysCompleted===d.day-1,'day '+d.day+' is not a clean save: '+r.error);});
  check(f['holger-introduced']&&Object.keys(CAST.introductions).every(id=>f[id+'-introduced']),'somebody was never introduced');
  check(l.room==='full'&&l.projects.piano.stage==='installed','the room never opened, or the piano never came');
  check(Object.keys(l.projects).every(id=>['available','installed'].indexOf(l.projects[id].stage)>=0),'work left unfinished');
  check(l.homeUnpack.boxes===MEMORY.UNPACK_BOXES,'the apartment was never unpacked');
  check(f['home-flourish-done']&&f['saira-together-done']&&f['holger-visit-done']&&f['kasper-paragraph-done'],'the latest story never came');
  check(days[0].events.some(e=>/^Holger/.test(e))&&days[0].events.some(e=>/^bought/.test(e)),'day 1 does not say what happened');
  checks.push('a new café plays through the whole story in '+days.length+' café days ('+ms+' ms): every hello, the full room, the piano, the name, every box unpacked, every morning a clean save');

  // Mornings open into clean cafés that keep running.
  [2,Math.floor(days.length/2),days.length].forEach(n=>{
    const w=open(days[n-1].save);
    check(w.memory.life.daysCompleted===n-1&&w.shop.phase==='open','day '+n+' did not open as its morning');
    audit(w,'day '+n);
    for(let t=0;t<3600;t+=.25)SIM.update(w,.25);
    audit(w,'an hour into day '+n);
  });
  checks.push('mornings open as ordinary saves and run an hour with clean audits');

  // Skipping ahead: the rest of the day and the night, nothing chosen.
  const from=days[4],before=JSON.parse(from.save);
  const skip=__dev.play({state:before,talk:false,buy:false,brisk:false,rich:false,mornings:1,seed:5});
  check(!skip.stuck&&skip.days.length===2,'skipping never reached the next morning');
  const after=JSON.parse(skip.days[1].save);
  check(after.life.daysCompleted===before.life.daysCompleted+1,'skipped more than one night');
  const added=Object.keys(after.flags).filter(k=>!before.flags[k]&&/-(done|introduced)$/.test(k));
  check(!added.length,'skipping played a story: '+added.join(', '));
  check(Object.keys(before.life.projects).every(id=>before.life.projects[id].stage!=='available'||after.life.projects[id].stage==='available'),'skipping bought something');
  check(after.life.homeUnpack.boxes>=Math.min(MEMORY.UNPACK_BOXES,before.life.homeUnpack.boxes+1)&&after.life.savings>=before.life.savings,'the evening did not happen, or the takings vanished');
  checks.push('skipping to the next morning plays no story and buys nothing, but the evening (supper, a box) happens');

  // Other answers play through too.
  const other=__dev.play({choices:'last',mornings:10,seed:4});
  check(!other.stuck&&other.days.length===11,'last answers got stuck: '+other.stuck);
  const firstFlags=JSON.parse(days[10].save).flags,lastFlags=JSON.parse(other.days[10].save).flags;
  check(Object.keys(lastFlags).some(k=>!firstFlags[k]),'last answers chose nothing different');
  checks.push('last answers play ten days through a different story');

  // The playthrough is cached, reused for a nearer day and extended for a later one.
  localStorage.removeItem('cafe-hygge-dev-timeline');
  const partial=__dev.timeline({day:4});
  check(!partial.complete&&partial.days.length===4&&partial.days[3].day===4,'a day-4 playthrough is '+partial.days.length+' days');
  const s0=performance.now();__dev.timeline({day:3});
  check(performance.now()-s0<400,'day 3 was played again');
  const longer=__dev.timeline({day:6});
  check(longer.days.length===6&&longer.days[3].save===partial.days[3].save&&longer.days[3].events.length>0,'the playthrough was not extended from day 4');
  localStorage.removeItem('cafe-hygge-dev-timeline');
  checks.push('the playthrough is cached, reused and extended from its last morning');
  return {checks};
})()
