/* Café Hygge — the sparse first apartment and the first café plant. */
(function () {
  'use strict';
  const R = SCENE._, H = SCENE.L.home, P = SCENE.L.firstPlant;
  const px = R.px, ell = R.ell;
  function box(g,x,y,open) {
    ell(g,x,y+2,18,5,'rgba(20,12,8,.22)');
    px(g,x-14,y-19,28,19,'#a8764a'); px(g,x+8,y-19,6,19,'#825638');
    px(g,x-14,y-24,28,5,'#c08a58'); px(g,x-2,y-24,4,24,'#d5b581');
    px(g,x-9,y-12,6,2,'#6e4a33');
    if(open) { px(g,x-19,y-26,12,4,'#c08a58'); px(g,x+6,y-26,14,4,'#c08a58'); px(g,x-7,y-22,13,4,'#5a3d28'); }
  }
  SCENE.drawFirstPlant = function(g,x,y) {
    px(g,x-7,y-13,14,11,'#b5654a'); px(g,x-5,y-3,10,3,'#8f4a35');
    px(g,x-9,y-16,18,4,'#d39a70'); px(g,x-5,y-12,3,7,'#c98f73');
    px(g,x-1,y-39,2,24,'#4a7a5a');
    [[-9,-32,9,5], [1,-38,10,5], [-12,-23,12,5], [2,-27,10,5]].forEach((a,i) => {
      px(g,x+a[0],y+a[1],a[2],a[3],i%2?'#6b9a5f':'#4a7a5a');
      px(g,x+a[0]+2,y+a[1]-2,a[2]-3,3,'#5a8a52');
    });
  };
  SCENE.plantDrawables = function(w) {
    const p=w.memory.life.plant, b=w.barista, draws=[];
    if(p.stage==='installed') draws.push({y:P.y,draw:g=>{
      ell(g,P.x,P.y,11,2,'rgba(20,12,8,.22)'); SCENE.drawFirstPlant(g,P.x,P.y);
    }});
    if(w.shop.phase==='home') return draws;
    if(p.stage==='scheduled') draws.push({y:P.pickup.y,draw:g=>box(g,P.pickup.x+18,P.pickup.y,false)});
    if(p.stage==='carry') draws.push({y:b.y+.1,draw:g=>{
      box(g,Math.round(b.x)+12,Math.round(b.y)-23,false);
      px(g,Math.round(b.x)+1,Math.round(b.y)-28,6,4,b.colors.skin);
      px(g,Math.round(b.x)+21,Math.round(b.y)-28,5,4,b.colors.skin);
    }});
    if(p.stage==='unpack'||p.stage==='place') draws.push({y:b.y+.1,draw:g=>{
      const x=Math.round(b.x), y=Math.round(b.y);
      box(g,x,y,p.time>1 || p.stage==='place');
      if(p.stage==='place') {
        const q=Math.min(1,p.time/4), lift=Math.sin(q*Math.PI)*18;
        SCENE.drawFirstPlant(g,Math.round(x+(P.x-x)*q),Math.round(y-18+(P.y-y+18)*q-lift));
      }
      px(g,x-9,y-29-Math.round(Math.sin(p.time*4)*3),6,4,b.colors.skin);
    }});
    return draws;
  };
  SCENE.drawHome = function(g,w) {
    px(g,0,0,960,600,'#29242b');
    px(g,128,70,704,H.wallY-70,'#b5a18a');
    px(g,128,70,704,8,'#6e4a33');
    px(g,128,H.wallY,704,260,'#9c6b43');
    for(let y=H.wallY;y<526;y+=20) {
      px(g,128,y,704,2,'#7d5334');
      for(let x=128+(y%40?55:0);x<832;x+=110) {
        px(g,x,y,2,20,'#825638'); px(g,x+12,y+11,36,1,'#a8764a');
      }
    }
    px(g,128,H.wallY-8,704,8,'#6e4a33'); px(g,128,526,704,8,'#4a3222');
    // Quiet architecture frames an intentionally unfilled room.
    const d=H.door, win=H.window;
    px(g,d.x-5,d.y-5,d.w+10,d.h+5,'#6e4a33'); px(g,d.x,d.y,d.w,d.h,'#825638');
    px(g,d.x+7,d.y+9,d.w-14,55,'#936747'); px(g,d.x+7,d.y+72,d.w-14,23,'#936747');
    px(g,d.x+d.w-12,d.y+60,5,3,'#d5b581');
    px(g,win.x-7,win.y-7,win.w+14,win.h+14,'#6e4a33');
    px(g,win.x,win.y,win.w,win.h,'#353b54');
    px(g,win.x+86,win.y+17,12,12,'#d8d5ba'); px(g,win.x+90,win.y+15,10,10,'#353b54');
    g.save(); g.beginPath(); g.rect(win.x,win.y,win.w,win.h); g.clip();
    for(let x=0;x<win.w;x+=24) {
      const roof=win.y+75-(x%3)*8;
      px(g,win.x+x,roof,22,win.y+win.h-roof,'#292d40');
      px(g,win.x+x+7,roof+12,4,5,'#c9a04a');
    }
    if(w.rain>.1) for(let i=0;i<18;i++) {
      const x=win.x+((i*37)%124), y=win.y+((i*19+w.t*36)%106);
      px(g,Math.round(x),Math.round(y),1,5,'#6b7b91');
    }
    g.restore();
    px(g,win.x+62,win.y,4,win.h,'#6e4a33'); px(g,win.x,win.y+57,win.w,4,'#6e4a33');
    px(g,win.x-10,win.y+win.h,win.w+20,7,'#c08a58');
    ell(g,420,347,115,33,'rgba(232,176,74,.09)');
    const draws=[];
    H.boxes.forEach((b,i)=>draws.push({y:b.y,draw:g=>box(g,b.x,b.y,i===4)}));
    draws.push({y:H.bag.y,draw:g=>{
      ell(g,H.bag.x,H.bag.y+1,15,4,'rgba(20,12,8,.22)');
      px(g,H.bag.x-12,H.bag.y-25,24,25,'#8f4a35'); px(g,H.bag.x-7,H.bag.y-30,14,4,'#4a3222');
      px(g,H.bag.x-7,H.bag.y-29,3,4,'#4a3222'); px(g,H.bag.x+4,H.bag.y-29,3,4,'#4a3222');
      px(g,H.bag.x-5,H.bag.y-23,3,21,'#c08a58');
    }});
    draws.push({y:H.desk.y,draw:g=>{
      const x=H.desk.x,y=H.desk.y;
      ell(g,x,y+2,50,9,'rgba(20,12,8,.22)');
      px(g,x-42,y-26,6,26,'#5a3d28'); px(g,x+37,y-26,6,26,'#5a3d28');
      px(g,x-47,y-38,94,12,'#c08a58'); px(g,x-47,y-26,94,5,'#825638');
      px(g,x-21,y-65,40,26,'#2c3038'); px(g,x-18,y-62,34,19,'#647b83');
      px(g,x-13,y-58,20,2,'#c7d0c2'); px(g,x-13,y-53,13,2,'#9cbbb5');
      px(g,x-3,y-40,5,6,'#3d4a5c'); px(g,x-17,y-33,33,3,'#3d4a5c');
      px(g,x+32,y-62,3,24,'#4a3222'); px(g,x+23,y-69,21,9,'#e8d5b0');
      px(g,x+21,y-61,25,3,'#c9a04a');
    }});
    draws.push({y:H.deskSeat.y,draw:g=>{
      const x=H.deskSeat.x,y=H.deskSeat.y;
      ell(g,x,y+2,18,5,'rgba(20,12,8,.22)');
      px(g,x-13,y-18,4,18,'#5a3d28'); px(g,x+9,y-18,4,18,'#5a3d28');
      px(g,x-15,y-22,30,6,'#a8764a'); px(g,x+11,y-45,4,24,'#6e4a33');
      px(g,x-14,y-45,29,5,'#a8764a');
    }});
    draws.push({y:H.bed.y,draw:g=>{
      const b=H.bed;
      ell(g,b.x+b.w/2,b.y+b.h-4,b.w/2+6,12,'rgba(20,12,8,.22)');
      px(g,b.x-4,b.y-38,b.w+8,91,'#6e4a33'); px(g,b.x,b.y-32,b.w,22,'#a8764a');
      px(g,b.x,b.y-10,b.w,b.h,'#b5ada0'); px(g,b.x,b.y-10,b.w,28,'#e8dfc9');
      px(g,b.x+8,b.y-6,35,17,'#f5efdf');
      px(g,b.x+48,b.y+1,76,b.h-11,'#7a89a5'); px(g,b.x+48,b.y+1,76,6,'#94a1b4');
      px(g,b.x+58,b.y+15,3,40,'#697892'); px(g,b.x+106,b.y+18,3,37,'#697892');
      px(g,b.x,b.y+b.h-10,b.w,10,'#5a3d28');
      px(g,b.x+5,b.y+b.h,6,8,'#4a3222'); px(g,b.x+b.w-11,b.y+b.h,6,8,'#4a3222');
      if(!w.barista.reading) { px(g,b.x+22,b.y+27,15,10,'#a94f3f'); px(g,b.x+24,b.y+29,11,2,'#e8dfc9'); }
      px(g,b.x-22,b.y-5,4,38,'#4a3222'); px(g,b.x-33,b.y-16,27,12,'#e8d5b0');
    }});
    draws.push({y:w.barista.y,draw:g=>{
      const b=Object.assign({},w.barista,{colors:Object.assign({},w.barista.colors,{apron:false}),bookColor:'#a94f3f'});
      SCENE.drawPerson(g,b);
    }});
    draws.push({y:w.cat.y,draw:g=>SCENE.drawCat(g,w.cat)});
    draws.sort((a,b)=>a.y-b.y); draws.forEach(d=>d.draw(g));
    const glow=g.createRadialGradient(646,301,5,646,301,135);
    glow.addColorStop(0,'rgba(255,201,119,.16)'); glow.addColorStop(1,'rgba(255,201,119,0)');
    g.fillStyle=glow;g.fillRect(510,165,280,280);
    SCENE.drawCaption(g,w);
    const t=w.memory.life.homeTime, fade=w.plannerOpen ? 0 : t<2 ? 1-t/2 : t>88 ? (t-88)/2 : 0;
    if(fade>0) { g.globalAlpha=fade; px(g,0,0,960,600,'#100d14'); g.globalAlpha=1; }
  };
})();
