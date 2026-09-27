/* Unpacking the apartment (H1): one moving box an evening after supper, in
   both modes; its belongings appear in place; reload resumes the same box;
   bedtime can interrupt without an obligation; seven evenings empty the room. */
(function(){
  'use strict';
  const frames={},checks=[],U=SIM.unpackBoxes;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function restore(w){SIM._.saveLife(w,0);return SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});}
  function valid(w,id){try{MEMORY.codec.validate(w.memory);}catch(e){throw Error(id+': '+e.message);}}
  function toHome(w){for(let t=0;t<60000&&w.shop.phase!=='home';t+=.25)SIM.update(w,.25);check(w.shop.phase==='home','no evening');}
  function toMorning(w){if(w.memory.life.mode==='game')SIM.goToSleep(w);for(let t=0;t<60000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);check(w.shop.phase==='open','no morning');}
  function box(w){return w.memory.life.homeUnpack;}
  check(U.length===MEMORY.UNPACK_BOXES,'box list and save disagree');

  // The first evening is the tutorial: no unpacking.
  let w=__dev.modestWorld({homeIntro:true,random:SIM.seededRandom(5)});
  toHome(w);
  for(let t=0;t<400;t+=.25){SIM.update(w,.25);check(!w.homeUnpacking,'unpacking during the first evening');}
  checks.push('no unpacking on the first evening');

  // An ordinary game evening: supper, then one box, then the desk again.
  w=__dev.modestWorld({random:SIM.seededRandom(6)});toHome(w);
  check(!SIM.homeUnpackActive(w),'unpacking before supper');
  let seen={};
  for(let t=0;t<600&&!box(w).tonight;t+=.25){
    SIM.update(w,.25);const u=w.homeUnpacking;
    if(u&&!seen[u.phase]){seen[u.phase]=1;check(w.memory.life.homeDinner.done,'unpacking before supper finished');
      frames['first-'+u.phase]=__dev.shot({x:200,y:150,w:560,h:320,scale:2},{world:w});}
  }
  check(box(w).boxes===1&&box(w).tonight&&Object.keys(seen).join()==='lift,open,fold,place,return','first box '+JSON.stringify(seen));
  check(SCENE.homeUnpacked(w,U[0].item),'the first box brought nothing');
  for(let t=0;t<300;t+=.25){SIM.update(w,.25);check(!w.homeUnpacking,'a second box the same evening');}
  valid(w,'first box');
  checks.push('supper, then one box through lift/open/fold/place/return, then the evening continues');

  // Reload in the middle of a box resumes it exactly, without duplication.
  toMorning(w);toHome(w);
  for(let t=0;t<600&&!(w.homeUnpacking&&w.homeUnpacking.phase==='open'&&w.homeUnpacking.progress>.3);t+=.25)SIM.update(w,.25);
  const mid=JSON.stringify(box(w)),which=w.homeUnpacking.box.box;
  w=restore(w);
  check(JSON.stringify(box(w))===mid&&w.homeUnpacking&&w.homeUnpacking.box.box===which,'reload lost tonight\'s box');
  for(let t=0;t<600&&!box(w).tonight;t+=.25)SIM.update(w,.25);
  check(box(w).boxes===2,'reload duplicated or skipped a box');
  checks.push('reload mid-box resumes the same box and finishes it once');

  // Bedtime interrupts; tomorrow the box starts again, nothing is lost.
  toMorning(w);toHome(w);
  for(let t=0;t<600&&!(w.homeUnpacking&&w.homeUnpacking.phase==='open');t+=.25)SIM.update(w,.25);
  check(SIM.goToSleep(w),'bed refused during unpacking');
  for(let t=0;t<60000&&w.shop.phase!=='open';t+=.25)SIM.update(w,.25);
  check(box(w).boxes===2&&box(w).time===0,'an interrupted box counted or kept stale time');
  checks.push('go to sleep mid-box: no obligation, the box waits for another evening');

  // Idle evenings unpack too and still end on their own.
  SIM.setMode(w,'idle');toHome(w);
  for(let t=0;t<600&&w.shop.phase==='home';t+=.25)SIM.update(w,.25);
  check(w.shop.phase!=='home'&&box(w).boxes===3,'idle evening did not unpack and end');
  checks.push('idle evenings unpack a box and still end on their own');

  // Seven evenings: every box gone, every belonging in place.
  SIM.setMode(w,'game');
  for(let n=0;n<8&&box(w).boxes<U.length;n++){toHome(w);for(let t=0;t<600&&!box(w).tonight;t+=.25)SIM.update(w,.25);if(box(w).boxes<U.length)toMorning(w);}
  check(box(w).boxes===U.length&&U.every(x=>SCENE.homeUnpacked(w,x.item)),'not all unpacked');
  for(let t=0;t<200;t+=.25)SIM.update(w,.25);
  valid(w,'all unpacked');frames['all-unpacked']=__dev.shot(null,{world:w});
  checks.push('seven evenings empty every box: '+U.map(x=>x.item).join(', '));
  window.unpackFrames=frames;return {checks};
})()
