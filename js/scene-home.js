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
  function utilityRoom(g,r,bath) {
    // Only the side/front walls are cut away. The rear elevation is drawn
    // separately at its floor baseline, with room above the plumbed fixtures.
    px(g,r.x,r.y,r.w,r.h,bath?'#9aa79e':'#b5ada0');
    for(let y=r.y;y<r.y+r.h;y+=16) {
      px(g,r.x,y,r.w,2,bath?'#84958e':'#a19888');
      for(let x=r.x;x<r.x+r.w;x+=24) px(g,x,y,2,16,bath?'#84958e':'#a19888');
    }
    const end=r.x+r.w;
    px(g,r.x,r.y-12,8,r.h+12,'#b5a18a');
    px(g,r.x,r.y-16,4,r.h+16,'#e8dfc9');
    px(g,end-8,r.y-12,8,r.h+12,'#b5a18a');
    px(g,end-8,r.y-16,4,r.h+16,'#e8dfc9');
  }
  function utilityBackWall(g,r,bath) {
    const top=r.y-r.wallH, gap=r.doorX+r.doorW, end=r.x+r.w;
    [[r.x,r.doorX-r.x],[gap,end-gap]].forEach(a=>{
      px(g,a[0],top,a[1],r.wallH,bath?'#c7c0b4':'#b5a18a');
      px(g,a[0],top-4,a[1],4,'#e8dfc9');
      // A modest tiled splash zone; the upper wall stays bare for future
      // shelves and a mirror. Its bottom is the same floor line as the props.
      const tileH=bath?36:32;
      px(g,a[0],r.y-tileH,a[1],tileH,bath?'#b5ada0':'#c7c0a9');
      for(let y=r.y-tileH;y<r.y;y+=12) px(g,a[0],y,a[1],2,'#a19888');
      for(let x=a[0];x<a[0]+a[1];x+=24) px(g,x,r.y-tileH,2,tileH,'#a19888');
      px(g,a[0],r.y-3,a[1],3,'#825638');
      px(g,a[0],r.y,a[1],4,'rgba(20,12,8,.12)');
    });
    // Open doorway with a full lintel and jamb depth, beside the fixture run.
    px(g,r.doorX,top-4,r.doorW,4,'#e8dfc9');
    px(g,r.doorX,top,r.doorW,8,'#b5a18a');
    px(g,r.doorX,top+8,4,r.wallH-8,'#825638');
    px(g,gap-4,top+8,4,r.wallH-8,'#6e4a33');
    px(g,r.doorX,top+8,r.doorW,4,'#6e4a33');
    px(g,r.doorX,r.y,r.doorW,4,'#c08a58');
  }
  function kitchenDrawables(draws) {
    const k=H.kitchen, c=k.counter, f=k.fridge;
    draws.push({y:c.y,draw:g=>{
      ell(g,c.x+c.w/2,c.y+2,c.w/2+3,6,'rgba(20,12,8,.22)');
      px(g,c.x,c.y-28,c.w,26,'#b5a18a');
      px(g,c.x,c.y-4,c.w,4,'#5a3d28');
      px(g,c.x+3,c.y-26,47,21,'#c7c0a9');
      px(g,c.x+22,c.y-23,10,2,'#825638');
      px(g,c.x+55,c.y-26,48,22,'#64706d');
      px(g,c.x+61,c.y-19,35,12,'#353b40');
      px(g,c.x+64,c.y-17,29,3,'#4c5d61');
      px(g,c.x+61,c.y-24,4,2,'#d9d2c0'); px(g,c.x+91,c.y-24,4,2,'#d9d2c0');
      px(g,c.x-2,c.y-40,c.w+4,12,'#d9d2c0');
      px(g,c.x-2,c.y-28,c.w+4,4,'#a19888');
      // One sink, a two-ring hob and a single unpacked mug.
      px(g,c.x+7,c.y-38,35,9,'#84958e'); px(g,c.x+10,c.y-36,29,5,'#647b83');
      px(g,c.x+22,c.y-47,3,12,'#b8bfc7'); px(g,c.x+22,c.y-49,11,3,'#d3d9de');
      px(g,c.x+31,c.y-47,3,4,'#b8bfc7');
      px(g,c.x+56,c.y-39,43,10,'#3c414d');
      ell(g,c.x+66,c.y-34,6,3,'#84958e'); ell(g,c.x+87,c.y-34,6,3,'#84958e');
      ell(g,c.x+66,c.y-34,3,1,'#3c414d'); ell(g,c.x+87,c.y-34,3,1,'#3c414d');
      px(g,c.x+45,c.y-45,6,7,'#e8dfc9'); px(g,c.x+50,c.y-44,3,4,'#e8dfc9');
      px(g,c.x+5,c.y-27,12,17,'#7a89a5'); px(g,c.x+8,c.y-26,2,14,'#94a1b4');
    }});
    draws.push({y:f.y,draw:g=>{
      ell(g,f.x+15,f.y+2,21,5,'rgba(20,12,8,.22)');
      px(g,f.x,f.y-50,34,48,'#d9d2c0'); px(g,f.x+28,f.y-50,6,48,'#b5ada0');
      px(g,f.x,f.y-62,34,12,'#f5efdf'); px(g,f.x+2,f.y-49,24,10,'#e8dfc9');
      px(g,f.x,f.y-39,28,2,'#a19888');
      px(g,f.x+4,f.y-47,3,6,'#64706d'); px(g,f.x+4,f.y-33,3,11,'#64706d');
      px(g,f.x+3,f.y-2,4,3,'#4a3222'); px(g,f.x+25,f.y-2,4,3,'#4a3222');
    }});
    draws.push({y:k.box.y,draw:g=>{
      box(g,k.box.x,k.box.y,true);
      px(g,k.box.x-7,k.box.y-27,14,3,'#e8dfc9');
      px(g,k.box.x-5,k.box.y-30,10,3,'#d9d2c0');
    }});
  }
  function bathroomDrawables(draws) {
    const b=H.bathroom, s=b.basin, t=b.toilet, sh=b.shower;
    draws.push({y:s.y,draw:g=>{
      ell(g,s.x+10,s.y,17,4,'rgba(20,12,8,.22)');
      px(g,s.x+6,s.y-22,9,22,'#d9d2c0'); px(g,s.x+8,s.y-21,4,20,'#b5ada0');
      px(g,s.x-5,s.y-34,31,12,'#f5efdf'); px(g,s.x-2,s.y-22,25,4,'#d9d2c0');
      ell(g,s.x+10,s.y-28,11,3,'#84958e');
      px(g,s.x+9,s.y-41,3,12,'#b8bfc7'); px(g,s.x+9,s.y-43,8,3,'#d3d9de');
    }});
    draws.push({y:t.y,draw:g=>{
      ell(g,t.x,t.y,17,5,'rgba(20,12,8,.22)');
      // Cistern against the rear wall; the bowl projects forward onto the
      // floor, leaving the whole front of the room free to approach it.
      px(g,t.x-12,t.y-54,24,20,'#d9d2c0'); px(g,t.x-14,t.y-60,28,6,'#f5efdf');
      px(g,t.x+5,t.y-51,5,2,'#b8bfc7');
      px(g,t.x-3,t.y-34,6,13,'#d9d2c0');
      px(g,t.x-7,t.y-17,14,16,'#d9d2c0');
      ell(g,t.x,t.y-15,14,10,'#e8dfc9'); ell(g,t.x,t.y-19,14,8,'#f5efdf');
      ell(g,t.x,t.y-20,9,5,'#84958e'); ell(g,t.x,t.y-19,6,3,'#647b83');
    }});
    draws.push({y:sh.y+sh.h,draw:g=>{
      px(g,sh.x-2,sh.y+sh.h,sh.w+4,4,'rgba(20,12,8,.18)');
      px(g,sh.x,sh.y,sh.w,sh.h,'#e8dfc9');
      px(g,sh.x+4,sh.y+4,sh.w-8,sh.h-10,'#b5ada0');
      px(g,sh.x+6,sh.y+6,sh.w-12,sh.h-14,'#c7c0b4');
      px(g,sh.x+sh.w-15,sh.y+sh.h-19,6,4,'#84958e');
      px(g,sh.x,sh.y+sh.h-5,sh.w,5,'#d9d2c0');
      // Exposed shower pipe and a curtain bunched against the outside wall.
      px(g,sh.x+sh.w-18,sh.y-66,3,52,'#b8bfc7');
      px(g,sh.x+sh.w-29,sh.y-68,14,3,'#d3d9de');
      px(g,sh.x+sh.w-32,sh.y-66,9,4,'#b8bfc7');
      px(g,sh.x+sh.w-23,sh.y-17,12,3,'#647b83');
      px(g,sh.x,sh.y-72,sh.w,3,'#b8bfc7');
      px(g,sh.x+sh.w-3,sh.y-72,3,sh.h+69,'#b8bfc7');
      px(g,sh.x+sh.w-12,sh.y-66,9,sh.h+56,'#7a89a5');
      px(g,sh.x+sh.w-9,sh.y-64,2,sh.h+52,'#94a1b4');
      px(g,sh.x+sh.w-12,sh.y-12,9,3,'#d9d2c0');
    }});
  }
  SCENE.drawHome = function(g,w) {
    px(g,0,0,960,600,'#29242b');
    px(g,128,70,704,H.wallY-70,'#b5a18a');
    px(g,128,70,704,8,'#6e4a33');
    px(g,128,H.wallY,704,H.floorBottom-H.wallY,'#9c6b43');
    for(let y=H.wallY;y<H.floorBottom;y+=20) {
      px(g,128,y,704,2,'#7d5334');
      for(let x=128+(y%40?55:0);x<832;x+=110) {
        px(g,x,y,2,Math.min(20,H.floorBottom-y),'#825638');
        if(y+11<H.floorBottom) px(g,x+12,y+11,36,1,'#a8764a');
      }
    }
    px(g,128,H.wallY-8,704,8,'#6e4a33'); px(g,128,H.floorBottom,704,8,'#4a3222');
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
    utilityRoom(g,H.kitchen,false); utilityRoom(g,H.bathroom,true);
    const draws=[];
    draws.push({y:H.kitchen.y,draw:g=>utilityBackWall(g,H.kitchen,false)});
    draws.push({y:H.bathroom.y,draw:g=>utilityBackWall(g,H.bathroom,true)});
    kitchenDrawables(draws); bathroomDrawables(draws);
    [H.kitchen,H.bathroom].forEach(r=>draws.push({y:r.y+r.h,draw:g=>{
      px(g,r.x,r.y+r.h-8,r.w,8,'#b5a18a');
      px(g,r.x,r.y+r.h-12,r.w,4,'#e8dfc9');
      px(g,r.x,r.y+r.h,r.w,4,'#6e4a33');
    }}));
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
    // Only idle departs on this timer. Explicit sleep uses the café dawn fade.
    const t=w.memory.life.homeTime, fade=w.memory.life.mode === 'game' || w.plannerOpen ? 0 : t<2 ? 1-t/2 : t>88 ? (t-88)/2 : 0;
    if(fade>0) { g.globalAlpha=fade; px(g,0,0,960,600,'#100d14'); g.globalAlpha=1; }
  };
})();
