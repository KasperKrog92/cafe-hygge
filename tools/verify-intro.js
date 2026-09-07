/* Real first-morning choreography, line boundaries and save restoration. */
(async function () {
  'use strict';
  function check(ok,msg){if(!ok)throw Error(msg);}
  const w=SIM.create({random:SIM.seededRandom(812)}),frames={},seen=new Set(),reloads=[];
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d');
  let stopCount=0,syllables=0;
  w.context.sound.stopDialogue=()=>stopCount++;
  w.context.sound.dialogueSyllable=()=>syllables++;
  function snap(key) {frames[key]=__dev.shot(null,{world:w});}
  function reload(key) {
    SIM._.saveLife(w,0);
    const state=MEMORY.codec.decode(MEMORY.codec.encode(w.memory));
    check(!state.error,'save rejected '+key);
    const r=SIM.create({memory:MEMORY.createStore({state:state.state})});
    check(r.memory.life.intro.line===w.memory.life.intro.line,'completed line replayed '+key);
    check(r.memory.life.firstOpening.time===w.memory.life.firstOpening.time,'assembly progress lost '+key);
    check(r.memory.life.intro.finale===w.memory.life.intro.finale,'finale replayed '+key);
    SIM.skipIntro(r);
    for(let n=0;n<5000&&r.shop.phase==='settling';n++)SIM.update(r,.25);
    check(r.shop.phase==='open' && r.tables.length===2 && r.memory.life.intro.sign==='outside','reload failed '+key);
    check(!r.shop.carryingCat && !r.barista.introOutside,'cat or owner stranded '+key);
    check(!__dev.audit(r).length,'reload audit '+key);reloads.push(key);
  }
  for(let n=0;n<16000 && w.shop.phase==='settling';n++) {
    SIM.update(w,.05);
    check(!w.shop.accepting || w.memory.life.intro.sign==='outside','opened without sign');
    if(w.dialogue && w.dialogue.visible>8) {
      const key='line-'+w.memory.life.intro.line;
      const box=SCENE.dialogueLayout(g,w);
      check(box.rows.length<=3 && box.x>=16 && box.x+box.w<=SCENE.room(w).w-16 && box.y>=44,'bubble outside crop');
      if(!seen.has(key)) {
        seen.add(key);reload(key);
        if(key==='line-0'||key==='line-16'||key==='line-18')snap(key);
      }
    }
    const i=w.memory.life.intro;
    if(w.memory.life.firstOpening.step===11 && i.time>=1.5) {
      const key='finale-'+i.finale;
      if(!seen.has(key)) {seen.add(key);snap(key);reload(key);}
    }
    if(w.barista.pose==='breath' && w.barista.stateT>=3 && !seen.has('silent-breath')) {
      seen.add('silent-breath');check(!w.dialogue,'breath was not silent');snap('silent-breath');
    }
    if(w.dialogue && i.line===16 && w.dialogue.visible===w.dialogue.text.length && !seen.has('hug')) {
      seen.add('hug');snap('hug');
    }
  }
  check(w.shop.phase==='open','intro never ended');check(syllables>20,'no speaking rhythm');
  check(seen.has('silent-breath'),'missed emotional pause');
  check(w.memory.life.intro.line===SIM.introLines.length,'missed dialogue');snap('open');
  const p=SIM.create({random:SIM.seededRandom(2)});
  for(let n=0;n<12;n++)SIM.update(p,.05);
  check(p.dialogue.visible>0 && p.dialogue.visible<p.dialogue.text.length,'no gradual reveal');
  const v=p.dialogue.visible,px=p.barista.x;
  p.introPaused=true;SIM.update(p,30);
  check(p.dialogue.visible===v && p.barista.x===px,'pause advanced intro');
  p.introPaused=false;p.introHidden=true;SIM.update(p,30);
  check(p.dialogue.visible===v && p.barista.x===px,'hidden advanced intro');p.introHidden=false;
  const line=p.memory.life.intro.line;SIM.advanceIntro(p);
  check(p.dialogue.visible===p.dialogue.text.length && p.memory.life.intro.line===line,'reveal skipped a line');
  SIM.advanceIntro(p);check(p.memory.life.intro.line===line+1,'next did not advance');
  p.context.sound.settings.instantText=true;
  for(let n=0;n<35;n++)SIM.update(p,.05);
  check(p.dialogue.visible===p.dialogue.text.length,'instant text still types');
  SIM.skipIntro(p);check(!p.dialogue && !p.introPaused && p.tables.length===0,'skip installed furniture');
  for(let n=0;n<3000&&p.shop.phase==='settling';n++)SIM.update(p,.25);
  check(p.shop.phase==='open' && p.memory.life.intro.sign==='outside','skip did not finish real work');
  const old=JSON.parse(JSON.stringify(w.memory));old.version=5;delete old.life.intro;
  const migrated=MEMORY.codec.decode(JSON.stringify(old));
  check(!migrated.error && migrated.state.life.intro.complete,'old café replays intro');
  const sheet=document.createElement('canvas');sheet.width=832;sheet.height=516*3;
  const sg=sheet.getContext('2d');
  for(const [n,key] of ['hug','silent-breath','finale-6'].entries()) {
    const im=new Image();im.src=frames[key];await im.decode();sg.drawImage(im,0,n*516);
  }
  window.introFrames=frames;
  return {passed:true,reloads:reloads.length,lines:SIM.introLines.length,syllables:syllables,stops:stopCount,sheet:sheet.toDataURL()};
})()
