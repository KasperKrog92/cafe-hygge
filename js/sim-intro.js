/* Café Hygge — the first morning, spoken while the room becomes a café. */
(function () {
  'use strict';
  const R=SIM._, L=SCENE.L;
  const lines=SIM.introLines=[
    {step:0,text:'Here we go, little one. Your new second home.'},
    {step:0,text:"I'm glad you didn't see it yesterday while I was cleaning."},
    {step:0,text:'I found a spoon behind the skirting board. Just the one.'},
    {step:2,text:'Your things are tucked in beside me. A sheltered little spot, just for you.'},
    {step:2,text:"Of course, you'll pick somewhere else."},
    {step:4,text:'Coffee, tea, something sweet. I can manage that.'},
    {step:4,text:'I keep thinking I ought to have a longer menu.'},
    {step:4,text:"Let's start with coffee."},
    {step:6,text:'These are for customers.'},
    {step:6,text:"I'm saying that to both of us."},
    {step:8,text:'I used to sit in places like this and imagine having one.'},
    {step:8,text:'Never imagined quite so many screws.'},
    {step:10,text:'Two little tables. Someone could sit here with a book.'},
    {step:10,text:'Stay all afternoon, if they wanted.'},
    {step:10,text:"I'd like that.",hold:5.5},
    {step:11,finale:1,text:"It's a bit frightening, now it's real."},
    {step:11,finale:1,text:"I'm glad you're here.",hold:4.5},
    {step:11,finale:3,text:'NEW CAFE. Very imaginative, I know.'},
    {step:11,finale:3,text:"I haven't found its name yet."},
    {step:11,finale:3,text:"Maybe once there are people here. Once I know what it feels like."},
    {step:11,finale:4,text:'All right.'},
    {step:11,finale:4,text:"Let's open the door."}
  ];
  const finale=SIM.introFinale=[
    {at:L.catCorner.noraSpot,duration:2,pose:'gather'},
    {at:L.catCorner.noraSpot,duration:8,pose:'hug'},
    {at:L.catCorner.noraSpot,duration:3,pose:'gather'},
    {at:L.intro.signPickup,duration:3,pose:'stand'},
    {at:L.intro.breath,duration:7,pose:'breath'},
    {at:L.intro.threshold,duration:2,pose:'unlock'},
    {at:L.intro.threshold,duration:5,pose:'stand'},
    {at:L.intro.threshold,duration:2,pose:'stand'}
  ];
  function current(w) { return lines[w.memory.life.intro.line]; }
  function eligible(w,line) {
    const i=w.memory.life.intro;
    return line && line.step===w.memory.life.firstOpening.step &&
      (line.finale===undefined || line.finale===i.finale && i.time>0);
  }
  function stop(w) { w.context.sound.stopDialogue(); }
  function finishLine(w) {
    w.memory.life.intro.line++; w.dialogue=null; w.dialogueGap=1.2;
    stop(w); R.commitLife(w);
  }
  SIM.introActive=function(w) {
    return w.shop.phase==='settling' && !w.memory.life.intro.skipped && !w.memory.life.intro.complete;
  };
  SIM.advanceIntro=function(w) {
    if(!SIM.introActive(w) || w.introPaused || !w.dialogue)return false;
    const d=w.dialogue;
    stop(w);
    if(d.visible<d.text.length) {d.visible=d.text.length;d.hold=0;}
    else finishLine(w);
    return true;
  };
  SIM.skipIntro=function(w) {
    if(w.shop.phase!=='settling')return;
    w.memory.life.intro.skipped=true;w.dialogue=null;w.introPaused=false;w.introHidden=false;
    stop(w);R.commitLife(w);
  };
  // Temporary dev shortcut: finish the real setup, including tables and sign,
  // synchronously. Stop at opening so Holger still makes the first arrival.
  SIM.skipUnpacking=function(w) {
    if(w.shop.phase!=='settling')return false;
    SIM.skipIntro(w);
    const sound=w.context.sound,hidden=w.introHidden,modal=w.introModal;
    w.context.sound=Object.assign({},sound,{softThump:function(){},doorUnlock:function(){},stopDialogue:function(){}});
    w.firstEntryReady=true;w.introHidden=false;w.introModal=false;
    try {
      for(let n=0;n<8000 && w.shop.phase==='settling';n++)SIM.update(w,.25);
      if(w.shop.phase==='settling')throw new Error('Unpacking did not reach opening');
      R.commitLife(w);
      return true;
    } finally {w.context.sound=sound;w.introHidden=hidden;w.introModal=modal;}
  };
  R.introWaiting=function(w) {
    return SIM.introActive(w) && eligible(w,current(w));
  };
  R.updateIntro=function(w,dt) {
    if(!SIM.introActive(w))return;
    // Migration from a partially assembled v5 café joins the current chore.
    while(current(w) && current(w).step<w.memory.life.firstOpening.step)w.memory.life.intro.line++;
    if(!eligible(w,current(w)))return;
    if(w.dialogueGap>0) {w.dialogueGap-=dt;return;}
    if(!w.dialogue) {
      w.dialogue={text:current(w).text,visible:0,clock:0,hold:0,syllable:0};
      w.activeCaption=null;w.captionQueue=[];
    }
    const d=w.dialogue;
    if(w.context.sound.settings.instantText)d.visible=d.text.length;
    if(d.visible===d.text.length) {
      d.hold+=dt;
      if(d.hold>=Math.max(current(w).hold||2.4,d.text.length*.045))finishLine(w);
      return;
    }
    SIM.revealDialogue(w,d,d.text,dt,CAST.voices.Lunafreya);
  };
  // Shared first-morning and character-dialogue reveal cadence.
  SIM.revealDialogue=function(w,d,text,dt,voice) {
    if(w.context.sound.settings.instantText){d.visible=text.length;return;}
    if(d.visible>=text.length)return;
    d.clock+=dt;let syllable=false;
    while(d.clock>=0 && d.visible<text.length) {
      const ch=text[d.visible++];
      d.clock-=/[.!?]/.test(ch)?.32:/[,;]/.test(ch)?.18:((voice&&voice.pace)||1)/28;
      if(/[a-z]/i.test(ch) && ++d.syllable%3===0)syllable=true;
    }
    if(voice!==false && syllable && /[a-z]/i.test(text[d.visible-1]) && d.visible<text.length)
      w.context.sound.dialogueSyllable(d.syllable,voice);
  };
  R.restoreIntro=function(w) {
    const i=w.memory.life.intro,b=w.barista;
    if(w.memory.life.firstOpening.step!==11)return;
    w.shop.carryingCat=i.finale===1 || i.finale===2;
    b.holding=w.shop.carryingCat?'cat':i.sign==='carried'?'sign':null;
    b.introOutside=i.finale===6;
    w.cat.x=L.catCorner.cushion.x;w.cat.y=L.catCorner.cushion.y;w.cat.target=L.catSpots.find(s=>s.id==='cushion');
    w.cat.state='sleep';w.cat.surface='floor';w.cat.path=null;
  };
  R.updateIntroFinale=function(w,dt) {
    const i=w.memory.life.intro,b=w.barista,s=finale[i.finale];
    if(!s)return true;
    b.animT+=dt;w.cat.animT+=dt;
    if(!b.path)R.makePath(b,s.at.x,s.at.y);
    if(b.path.length) {R.walker(b,dt);return false;}
    b.pose=s.pose;b.heading='';b.facing=i.finale<3 || i.finale===5?1:-1;
    const before=i.time;i.time=Math.min(8,i.time+dt);b.stateT=i.time;
    if(i.finale===0) {
      // The cat is at its cushion all through setup. Hands meet it before lifting.
      const q=Math.min(1,i.time/2);
      w.cat.x=L.catCorner.cushion.x+(b.x+7-L.catCorner.cushion.x)*q;
      w.cat.y=L.catCorner.cushion.y+(b.y-34-L.catCorner.cushion.y)*q;
    }
    if(i.finale===3 && before===0) {i.sign='carried';b.holding='sign';}
    if(i.finale===5) {
      w.door.open=Math.max(0,Math.min(1,i.time-1));
      if(before<1 && i.time>=1)w.context.sound.doorUnlock();
    }
    if(i.finale===6) {b.introOutside=true;w.door.open=1;}
    if(i.finale===7) {b.introOutside=false;w.door.open=1;}
    if(i.finale===4) {
      const speaking=R.introWaiting(w);
      // Keep the saved breath clock at its start until her last line ends.
      // The small positive value also marks arrival for the dialogue gate.
      if(speaking)i.time=.001;
      b.pose=speaking?'stand':'breath';b.stateT=speaking?0:i.time;
    }
    if(i.time<s.duration || R.introWaiting(w))return false;
    if(i.finale===0) {w.shop.carryingCat=true;b.holding='cat';}
    if(i.finale===2) {
      w.shop.carryingCat=false;b.holding=null;
      w.cat.x=L.catCorner.cushion.x;w.cat.y=L.catCorner.cushion.y;w.cat.target=L.catSpots.find(s=>s.id==='cushion');
    }
    if(i.finale===6) {i.sign='outside';b.holding=null;w.context.sound.softThump();}
    i.finale++;i.time=0;b.path=null;b.pose='stand';b.introOutside=false;
    R.commitLife(w);return false;
  };
})();

/* Attended conversations. Durable cursors/choices use the existing boolean
   story flags; no save shape expansion, wall-clock catch-up or expiring beat. */
(function () {
  'use strict';
})();
