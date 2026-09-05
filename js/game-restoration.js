/* The opening's physical work. Render-only: elapsed work owns every gesture. */
(function () {
  'use strict';
  function clamp(n) { return Math.max(0,Math.min(1,n)); }
  function ease(n) { n=clamp(n);return n*n*(3-2*n); }
  function phase(work) {
    if(!work||!work.task.phases)return null;
    var start=0,phases=work.task.phases;
    for(var i=0;i<phases.length;i++){
      var p=phases[i];
      if(work.elapsed<start+p.seconds||i===phases.length-1)return {data:p,index:i,elapsed:work.elapsed-start,progress:clamp((work.elapsed-start)/p.seconds)};
      start+=p.seconds;
    }
  }
  function progress(id,done,work) { return done.indexOf(id)>=0?1:work&&work.task.id===id?clamp(work.elapsed/work.task.duration):0; }
  function draw(g,player,work,ambient) {
    var ph=phase(work);if(!ph)return SCENE.drawPerson(g,player);
    if(work.moving)return SCENE.drawPerson(g,player);
    var kind=ph.data.kind,still=work.paused||work.reflecting||kind==='rest';
    var t=ph.elapsed,cycle=(t%5.6)/5.6;
    // Press, travel, lift, return, settle. The return never scrubs backwards.
    var stroke=cycle<0.16?0:cycle<0.64?ease((cycle-0.16)/0.48):1-ease((cycle-0.76)/0.24);
    if(still)stroke=0;
    var low=['kneel','sort','gather','pan'].indexOf(kind)>=0;
    var wash=['wipe','polish','wash','scrape','patch','unfasten'].indexOf(kind)>=0;
    var f=wash||kind==='rinse'||work.task.id==='window'?-1:1;
    var x=Math.round(player.x),y=Math.round(player.y),bend=low?17:kind==='rinse'?7:0;
    if(kind==='polish'){
      // A two-step stool gives her hands a real approach to the upper pane.
      var lift=42*ease(t/3)*(1-ease((t-15)/3));
      g.fillStyle='#70513b';g.fillRect(x-16,y-39,4,39);g.fillRect(x+11,y-39,4,39);
      g.fillStyle='#aa8962';g.fillRect(x-18,y-42,35,5);g.fillRect(x-18,y-22,35,4);
      y-=Math.round(lift);
    }
    if(ph.index===0&&low)bend=Math.round(17*ease(t/2.8));
    if(kind==='rest'&&work.task.id==='debris')bend=Math.round(17*(1-ease(t/3.5)));
    if(work.reflecting&&work.task.id==='window')bend=0;
    var lean=still?0:Math.round(stroke*(low?4:2))*f;
    var breath=Math.sin(ambient*1.1)>0.6?1:0;
    function r(a,b,w,h,c){g.fillStyle=c;g.fillRect(Math.round(a),Math.round(b),w,h);}
    function limb(ax,ay,bx,by,width,color){var n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));for(var j=0;j<=n;j+=2)r(ax+(bx-ax)*j/Math.max(1,n)-width/2,ay+(by-ay)*j/Math.max(1,n),width,3,color);}
    r(x-16,y+1,34,3,'#28252b55');
    if(bend>10){r(x-13,y-12,12,12,'#514355');r(x-13,y-4,23,5,'#514355');r(x+5,y-10,13,9,'#635365');r(x-16,y,13,3,'#3a2a1c');r(x+13,y-3,8,4,'#3a2a1c');}
    else {r(x-10,y-17,8,17,'#514355');r(x+3,y-17,7,17,'#514355');r(x-10,y-3,10,3,'#3a2a1c');r(x+3,y-3,11,3,'#3a2a1c');}
    var bodyY=y-40+bend;
    r(x-10+lean,bodyY,20,24-bend/3|0,'#788b77');r(x-10+lean,bodyY+3,3,17,'#63745f');
    r(x-6+lean,bodyY+5,13,17-bend/4|0,'#ddd0b4');r(x-2+lean,bodyY,6,5,'#ddd0b4');r(x-5+lean,bodyY+15,11,2,'#c0b498');
    r(x+2+lean,bodyY+10,3,2,'#a79c82');
    // Reuse Lunafreya's actual head and bun; only her working body is new.
    g.save();g.beginPath();g.rect(x-24+lean,y-80+bend,48,39);g.clip();
    SCENE.drawPerson(g,{x:x+lean,y:y+bend,pose:'stand',facing:f,heading:null,animT:ambient,colors:player.colors});g.restore();
    var handX=x+f*(low?19:15)+lean,handY=bodyY+18;
    if(!still&&wash){handX=x-20-Math.round(stroke*9);handY=y-54+Math.round(stroke*(kind==='polish'?-16:12));}
    else if(!still&&low){handX=x+18+Math.round(stroke*10);handY=y-7-Math.round((1-stroke)*11);}
    else if(!still&&kind==='sweep'){handX=x+10+stroke*12;handY=y-29+stroke*3;}
    else if(!still&&kind==='rinse'){handX=x-19;handY=y-20+Math.round(stroke*5);}
    var elbowX=x+f*13+lean,elbowY=bodyY+12;
    limb(x+f*7+lean,bodyY+4,elbowX,elbowY,5,'#687d67');limb(elbowX,elbowY,handX,handY,4,'#788b77');r(handX-2,handY,5,4,'#e4b68c');
    if(!still&&kind==='rinse'){
      limb(x-f*7+lean,bodyY+5,handX+7,handY,4,'#687d67');r(handX+5,handY,5,4,'#e4b68c');
    }else if(!still&&kind==='sweep'){
      limb(x-f*7+lean,bodyY+5,handX-4,handY-12,4,'#687d67');r(handX-6,handY-12,5,4,'#e4b68c');
    }else {limb(x-f*7+lean,bodyY+5,x-f*11,bodyY+20,4,'#687d67');r(x-f*11-2,bodyY+20,4,4,'#e4b68c');}
    if(kind==='sweep'&&!still){
      var bx=x+20+stroke*23,by=y-1;
      limb(handX-4,handY-14,bx,by-4,3,'#c7ae7b');r(bx-9,by-5,19,6,'#b49a65');
      for(var k=0;k<6;k++)r(bx-8+k*3,by-2,1,5,'#80634c');
      if(cycle>0.16&&cycle<0.64)for(k=0;k<5;k++)r(bx+10+k*4,by-2-(k%3),2,1,'#a6947280');
    }else if(kind==='pan'&&!still){r(x+22,y-3,23,3,'#82918a');limb(handX,handY,x+29,y-4,3,'#c7ae7b');r(x+24,y-6,12,4,'#b49a65');}
    else if(kind==='gather'&&!still){r(handX-1,handY+3,9,5,'#a79c82');}
    else if(kind==='sort'||work.reflecting&&work.task.id==='debris'){
      r(handX-5,handY+2,12,8,'#d5c6a5');r(handX-3,handY+4,6,1,'#977b54');r(handX-1,handY+6,4,1,'#977b54');
    }else if(wash&&!still){
      if(kind==='scrape'||kind==='patch'||kind==='unfasten'){r(handX-6,handY-4,8,5,'#a6aaa0');r(handX-1,handY,3,7,'#aa8962');}
      else {r(handX-6,handY-2,10,7,'#ddd0b4');r(handX-6,handY+4,3,4,'#c0b498');}
    }else if(kind==='rinse'&&!still){r(handX-3,handY+2,11,5,'#c0b498');for(k=0;k<3;k++)r(handX+k*3,handY+9+(t*9+k*3)%8,1,2,'#afbbb3');}
    else if(work.task.id==='window'){r(handX-3,handY+3+breath,8,8,'#c0b498');}
  }
  function traces(g,done,work,time,L) {
    function r(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);}
    var d=progress('debris',done,work),s=progress('sweep',done,work),w=progress('window',done,work),a=L.workProps;
    if(d>0&&done.indexOf('table')<0){r(a.sack.x,a.sack.y-20,23,21,'#806b4e');r(a.sack.x+3,a.sack.y-16,17,16,'#977f59');r(a.sack.x+7,a.sack.y-18,2,15,'#ac9367');r(a.sack.x-1,a.sack.y-22,25,4,'#5d503d');}
    if(d>30/54){r(a.paper.x,a.paper.y,19,10,'#d5c6a5');r(a.paper.x+2,a.paper.y+2,6,6,'#977b54');r(a.paper.x+3,a.paper.y+3,4,4,'#d5c6a5');r(a.paper.x+11,a.paper.y+3,5,1,'#977b54');r(a.paper.x+10,a.paper.y+6,6,1,'#977b54');}
    // A footprint polished by years, visible through the lifted dust.
    if(s>0){g.globalAlpha=Math.min(0.38,s);r(a.wear.x,a.wear.y,39,5,'#c0aa84');r(a.wear.x+4,a.wear.y-2,29,9,'#c0aa84');r(a.wear.x+8,a.wear.y+2,22,1,'#80634c');g.globalAlpha=1;}
    if(work&&(work.task.id==='window'||work.task.id==='walls')){
      var bx=work.task.id==='window'?a.bucket.x:a.plaster.x,by=work.task.id==='window'?a.bucket.y:a.plaster.y;
      r(bx-11,by+1,25,3,'#28252b44');r(bx-9,by-14,19,15,'#71807b');r(bx-7,by-11,3,10,'#94a099');r(bx-11,by-17,23,4,'#a6aaa0');r(bx-8,by-16,17,2,'#526264');r(bx-10,by-22,2,7,'#a6aaa0');r(bx+10,by-22,2,7,'#a6aaa0');r(bx-8,by-24,18,2,'#a6aaa0');
    }
    if(w>0.2){g.fillStyle='#c5d5cc';g.globalAlpha=w*0.13;g.beginPath();g.moveTo(296,281);g.lineTo(422,281);g.lineTo(534,477);g.lineTo(341,477);g.fill();g.globalAlpha=1;
      for(var i=0;i<12;i++)r(319+(i*37)%143+Math.sin(time*0.15+i)*3,307+(i*17+time*2)%117,1,1,'#d8d8bc55');}
  }
  window.FLEUR_WORK={phase:phase,progress:progress,draw:draw,traces:traces};
}());
