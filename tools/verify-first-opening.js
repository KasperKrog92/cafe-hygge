/* First entry, visible assembly, exact saves and the first ordinary sale. */
(function () {
  'use strict';
  const w=SIM.create({random:SIM.seededRandom(73)}),frames={},saves={},seen={},traces=[];
  const startingSavings=w.memory.life.savings;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function snap(name) {
    const a=__dev.audit(w);check(!a.length,a.join(';'));
    saves[name]=MEMORY.codec.encode(w.memory);frames[name]=__dev.shot(null,{world:w});
  }
  w.firstEntryReady=false;
  const frozen=JSON.stringify(w.memory),x=w.barista.x,y=w.barista.y;
  for(let i=0;i<240;i++)SIM.update(w,.25);
  check(JSON.stringify(w.memory)===frozen&&w.barista.x===x&&w.barista.y===y,'setup ran before entry');
  check(w.shop.carryingCat&&w.barista.holding==='cat'&&!w.tables.length&&!w.patrons.length,'arrival not empty with cat');
  snap('first-arrival');w.firstEntryReady=true;
  for(let n=0;n<5000&&w.shop.phase==='settling';n++) {
    const f=w.memory.life.firstOpening,step=SIM.firstOpeningSteps[f.step];
    if(!seen[f.step]) {seen[f.step]=true;traces.push({step:f.step,target:step.at});snap('first-step-'+f.step+'-travel');}
    if(f.time>0&&!seen[f.step+'-work']) {seen[f.step+'-work']=true;snap('first-step-'+f.step+'-work');}
    if(step.table!==undefined&&f.time>=9&&!seen[f.step+'-half']) {seen[f.step+'-half']=true;snap('first-step-'+f.step+'-half');}
    check(!w.shop.accepting&&!w.patrons.length&&!w.queue.length,'customer before setup finished');
    check(w.memory.life.savings===startingSavings,'setup cost money');
    check(w.seats.length===w.tables.length*2,'unusable assembled seating');
    SIM.update(w,.25);
  }
  check(w.shop.phase==='open'&&w.memory.life.firstOpening.step===12,'first opening did not finish');
  check(w.tables.length===2&&w.seats.length===4,'two table sets not assembled');snap('first-open');
  for(const key of ['full-counter','rugs','drapes','open-windows','wall-menu','mantel-decor','piano','studio','bookshelf'])
    check(!SCENE.hasFurniture(w,key),'first room contains '+key);
  check(SCENE.hasFurniture(w,'counter-equipment')&&SCENE.hasFurniture(w,'cake-stand')&&SCENE.hasFurniture(w,'entrance'),'equipment not set up');
  __dev.greetHolger(w);
  for(let n=0;n<2400&&w.memory.life.savings===startingSavings;n++)SIM.update(w,.25);
  check(w.memory.life.savings>startingSavings,'first cafe never served');
  check(w.patrons.every(p=>!/^matcha|iced matcha/.test(p.drink.name)),'matcha in initial menu');snap('first-sale');
  w.clockOffset+=(20-w.hour)/24*SIM._.DAY_SECONDS;SIM.update(w,0);SIM._.snapCandles(w);snap('first-night');
  window.firstFrames=frames;window.firstSaves=saves;
  return {passed:true,steps:traces,fixtures:Object.keys(saves),firstSales:w.memory.life.savings-startingSavings};
})()
