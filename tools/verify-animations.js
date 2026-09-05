/* Evaluate in a disposable ?dev browser. Rendering fixtures are never ticked. */
(function () {
  'use strict';
  const failures = [];
  function check(ok, msg) { if (!ok) failures.push(msg); }
  // Travel must agree at 60Hz and at the hidden-tab maximum dt, even at corners.
  function travel(dt) {
    const e = {x:0,y:0,speed:40,path:[{x:3,y:0},{x:3,y:40},{x:100,y:40}],pose:'stand'};
    for(let t=0;t<1-1e-8;t+=dt) SIM._.walker(e,dt);
    return e;
  }
  const fine=travel(1/60), coarse=travel(.25);
  check(Math.hypot(fine.x-coarse.x,fine.y-coarse.y)<1e-6,'Movement depends on frame step');
  check(Math.abs(coarse.walkDistance-40)<1e-6,'Movement budget lost at a corner');
  const before=JSON.stringify(__world), save=JSON.stringify(MEMORY.state);
  const sheet=document.createElement('canvas'); sheet.width=960; sheet.height=840;
  const g=sheet.getContext('2d'); g.imageSmoothingEnabled=false;
  g.fillStyle='#c9b28a';g.fillRect(0,0,sheet.width,sheet.height);
  const rows=['walk right','walk left','walk toward','page turn','sip','knitting','cat jump left','cat groom'];
  const base=__dev.study({seats:[0]}).patrons[0];
  rows.forEach(function(label,row){
    g.fillStyle='#3a2a1c';g.font='14px monospace';g.fillText(label,12,row*105+20);
    const frames=new Set();
    for(let i=0;i<6;i++){
      const c=document.createElement('canvas');c.width=70;c.height=75;const cg=c.getContext('2d');
      const p=Object.assign({},base,{x:35,y:70,animT:.3+i*.13,reading:false,holding:null,pose:row<3?'walk':'sit',walkDistance:i*4,facing:row===1?-1:1,heading:row===2?'down':''});
      if(row===3){p.reading=true;p.pageTurn=.8-i*.15;}
      if(row===4){p.holding='cup';p.armUp=[0,.3,.8,1,.7,0][i];}
      if(row===5){p.knitting=true;p.knitProgress=.4;}
      if(row<6) SCENE.drawPerson(cg,p);
      else SCENE.drawCat(cg,{x:35,y:55,animT:i*.2,state:row===6?'hop':'groom',facing:-1,hopT:i*.14,hopDur:.75,surface:'floor'});
      frames.add(c.toDataURL());
      g.drawImage(c,180+i*128,row*105+25,70,75);
    }
    check(frames.size>1,label+' has no visible motion');
  });
  check(before===JSON.stringify(__world)&&save===JSON.stringify(MEMORY.state),'Animation gallery mutated live world/save');
  // Each changed motion must have distinct frames, and still be deterministic.
  check(__dev.audit().length===0,'Live audit');
  if(failures.length) throw Error(failures.join('; '));
  return {failures:failures,movement:{fine:[fine.x,fine.y],coarse:[coarse.x,coarse.y]},sheet:sheet.toDataURL()};
})()
