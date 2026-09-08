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
    return draws.concat(projectDrawables(w), firstOpeningDrawables(w));
  };
  function firstOpeningDrawables(w) {
    const f=w.memory.life.firstOpening,L=SCENE.L,b=w.barista,draws=[];
    if(f.step>=12)return draws;
    const step=SIM.firstOpeningSteps[f.step];
    // The belongings arrive together at the threshold. Kits disappear from
    // this stack only when Lunafreya has collected them, never before entry.
    draws.push({y:L.basic.staging.y,draw:g=>{
      const count=Math.max(0,5-Math.floor((f.step+1)/2));
      for(let i=0;i<count;i++)box(g,L.basic.staging.x+14+(i%2)*25,L.basic.staging.y-Math.floor(i/2)*22,false);
    }});
    if(b.holding==='parcel')draws.push({y:b.y+.1,draw:g=>box(g,Math.round(b.x)+12,Math.round(b.y)-23,false)});
    if(step.table!==undefined&&b.path&&!b.path.length) {
      const a=L.tables[step.table],n=Math.min(5,Math.floor(f.time/3));
      draws.push({y:a.y+32,draw:g=>{
        const x=a.x,y=a.y;
        if(n<2) {box(g,x-14,y+22,true);px(g,x-22,y+30,44,4,'#96704c');ell(g,x+9,y+9,23,7,'#8a6142');}
        else {
          px(g,x-5,y,10,27,'#5a3d28');px(g,x-16,y+26,32,5,'#4a3222');
          ell(g,x,y,32,12,'#8a6142');ell(g,x,y-3,27,9,'#96704c');
        }
        [-1,1].forEach((side,i)=>{
          const sx=x+side*L.stoolDX;
          if(n<3+i) {px(g,sx-10,y+16,20,4,'#96704c');px(g,sx-8,y+23,16,3,'#6e4c30');}
          else {px(g,sx-9,y+8,5,14,'#4a3222');px(g,sx+4,y+8,5,14,'#4a3222');ell(g,sx,y+8,13,6,'#94684a');
            if(side<0){px(g,sx-16,y-28,6,38,'#5a3d28');px(g,sx-17,y-30,8,4,'#7d5334');}}
        });
        px(g,x+18,y+29,10,2,'#b8bfc7');px(g,x+26,y+28,5,4,'#a8764a');
      }});
    } else if(step.install && !step.table && b.path && !b.path.length && step.install!=='cat-corner') {
      draws.push({y:b.y+.1,draw:g=>box(g,Math.round(b.x)-18,Math.round(b.y)+3,true)});
    }
    return draws;
  }
  function projectDrawables(w) {
    const draws=[], b=w.barista, jobs=w.memory.life.projects, anchors=SCENE.L.projects;
    Object.keys(jobs).forEach(function(id) {
      const p=jobs[id], a=anchors[id];
      if (p.stage==='available'||p.stage==='purchased') return;
      const carried=b.project===id && b.holding==='parcel';
      if (carried) draws.push({y:b.y+.1,draw:g=>box(g,Math.round(b.x)+12,Math.round(b.y)-22,false)});
      if (id==='windowSeat') {
        if(p.stage==='scheduled'||p.stage==='installed')return;
        const t=SCENE.L.winTables[0];
        draws.push({y:t.base,draw:g=>{
          if(p.stage==='arrived'||p.step===0) {if(!carried)box(g,t.x,t.base-3,p.stage==='working');return;}
          px(g,t.x-9,t.base-8,18,4,'#4a3222');px(g,t.x-6,t.base-4,12,4,'#4a3222');
          px(g,t.x-3,t.y+2,6,t.base-t.y-8,'#5a3d28');px(g,t.x-3,t.y+2,2,t.base-t.y-8,'#6e4c30');
          if(p.step>=2) {ell(g,t.x,t.y+1,18,6,'#6e4c30');ell(g,t.x,t.y-2,18,6,'#8a6142');ell(g,t.x,t.y-3,14,4,'#96704c');}
          else {px(g,t.x+9,t.base-21,5,18,'#8a6142');px(g,t.x+9,t.base-23,4,2,'#b08a64');}
          px(g,t.x+10,t.base-5,8,3,'#7a89a5');
        }});
      } else if (id==='bookshelf') {
        if(p.stage==='scheduled'||p.stage==='installed'||w.memory.life.furniture.bookshelf)return;
        const k=a.kit;
        draws.push({y:k.y,draw:g=>{
          ell(g,k.x,k.y,13,3,'rgba(20,12,8,.18)');
          px(g,k.x-k.w/2,k.y-k.h,k.w,k.h,'#a77e51');
          px(g,k.x-k.w/2,k.y-k.h,k.w,3,'#c9a477');
          if(p.stage==='arrived'||p.step===0)px(g,k.x-1,k.y-k.h,3,k.h,'#dfbd89');
          else {
            const remaining=Math.max(0,4-p.step);
            for(let n=0;n<remaining;n++)px(g,k.x-8,k.y-k.h-2-n*3,16,2,'#96704c');
            px(g,k.x-8,k.y-5,9,2,'#b8bfc7');px(g,k.x-8,k.y-5,3,3,'#6e4a33');
          }
        }});
      } else if (id==='table') {
        if(p.stage==='installed') return; // normal furniture renderer + real seats
        draws.push({y:a.y+32,draw:g=>{
          const x=a.x,y=a.y;
          if(p.stage==='scheduled') return;
          if(p.stage==='arrived' && !carried) { box(g,x,y+20,false); return; }
          if(p.stage!=='working') return;
          // The reserved site casts nothing. The carton has its own shadow;
          // the table's broad shadow belongs to its assembled pedestal/top.
          if(p.step>=2) ell(g,x,y+28,34,8,'rgba(20,12,8,.18)');
          // Parts stay within the final set's reserved floor area.
          if(p.step<2) {
            box(g,x-16,y+22,true);
            px(g,x-25,y+27,49,5,'#96704c'); px(g,x-21,y+35,40,4,'#6e4c30');
            ell(g,x+10,y+10,23,7,'#8a6142');
          } else {
            px(g,x-5,y,10,27,'#5a3d28'); px(g,x-16,y+26,32,5,'#4a3222');
            ell(g,x,y,32,12,'#8a6142'); ell(g,x,y-3,27,9,'#96704c');
            px(g,x-18,y-10,30,2,'#b08a64');
          }
          [-1,1].forEach(side=>{
            const sx=x+side*SCENE.L.stoolDX;
            if(p.step<3) { px(g,sx-9,y+18,20,4,'#96704c'); px(g,sx-7,y+24,16,3,'#6e4c30'); }
            else {
              px(g,sx-9,y+8,5,14,'#4a3222'); px(g,sx+4,y+8,5,14,'#4a3222');
              ell(g,sx,y+8,13,6,'#94684a');
              if(side<0) { px(g,sx-16,y-28,6,38,'#5a3d28'); px(g,sx-17,y-30,8,4,'#7d5334'); }
            }
          });
          // Folded cloth and screwdriver, set down whenever service calls.
          px(g,x+17,y+23,10,4,'#7a89a5'); px(g,x+17,y+29,9,2,'#b8bfc7'); px(g,x+25,y+28,5,4,'#a8764a');
        }});
      } else if (id==='fireplace') {
        if(p.stage==='scheduled'||p.stage==='installed')return;
        draws.push({y:a.y+3,draw:g=>{
          const x=a.x,y=a.y;
          // Removed boards and a small brush wait beside the work, then leave.
          if(p.stage==='working') {
            const n=p.step;
            const boards=n>0?3:3-SCENE.fireplaceBoards(w);
            for(let i=0;i<boards;i++)px(g,x-22,y-5-i*3,35,2,'#8a6d49');
            for(let i=0;i<8-n*2;i++) px(g,x-19+i*5,y-17+(i%2)*3,4,2,'#62574b');
            px(g,x+23,y-5,13,13,'#69756b'); px(g,x+24,y-7,11,3,'#a9afa0');
            px(g,x+25,y-14,2,9,'#96704c'); px(g,x+22,y-15,8,3,'#c9b28a');
          }
        }});
      }
    });
    return draws;
  }
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
  function mealPlate(g,x,y,portions) {
    ell(g,x,y+1,11,4,'#b5ada0');ell(g,x,y,11,3,'#f5efdf');
    for(let i=0;i<portions;i++) {
      px(g,x-7+i*8,y-4,7,4,'#936747');
      px(g,x-6+i*8,y-5,6,3,'#d5b581');
      px(g,x-5+i*8,y-5,5,2,'#e8d5b0');
    }
  }
  // Occupancy drives the light, including an interrupted trip back out.
  SCENE.homeKitchenLit=function(w) {
    const b=w.barista,k=H.kitchen;
    return w.shop.phase==='home' && b.x>k.x && b.x<k.x+k.w && b.y>=k.y;
  };
  function kitchenDrawables(draws,w) {
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
      if(w.barista.pose==='supperPrep')mealPlate(g,k.plate.x,k.plate.y,w.homeMeal.progress>.4?2:1);
      if(w.barista.pose==='supperWash') {
        mealPlate(g,c.x+25,c.y-34,0);
        px(g,c.x+32,c.y-43,2,9,'#9cbbb5');
      }
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
      // Plumbing and gathered curtain hug the left bathroom wall.
      px(g,sh.x+10,sh.y-66,3,52,'#b8bfc7');
      px(g,sh.x+10,sh.y-68,17,3,'#d3d9de');
      px(g,sh.x+22,sh.y-66,9,4,'#b8bfc7');
      px(g,sh.x+7,sh.y-17,12,3,'#647b83');
      px(g,sh.x,sh.y-72,sh.w,3,'#b8bfc7');
      px(g,sh.x,sh.y-72,3,sh.h+69,'#b8bfc7');
      px(g,sh.x+3,sh.y-66,9,sh.h+56,'#7a89a5');
      px(g,sh.x+5,sh.y-64,2,sh.h+52,'#94a1b4');
      px(g,sh.x+3,sh.y-12,9,3,'#d9d2c0');
    }});
  }
  function homeCurtains(w) {
    const s=w.memory.life.homeStory;
    const hung=s.step>=10 || s.step===9 && w.homeAction==='reach';
    const hanging=s.step===9?Math.min(1,w.homeActionTime/6):1;
    const closed=s.sleepStep>1?1:s.sleepStep===1?Math.min(1,(w.homeActionTime||0)/4):0;
    return hung?Math.round((16+closed*(H.window.w/2-10))*hanging):0;
  }
  const homeLight={key:null,canvas:null};
  function lightPool(g,x,y,rx,ry,color,alpha) {
    g.save();g.translate(x,y);g.scale(rx,ry);
    const glow=g.createRadialGradient(0,0,0,0,0,1);
    glow.addColorStop(0,'rgba('+color+','+alpha+')');
    glow.addColorStop(.32,'rgba('+color+','+(alpha*.65)+')');
    glow.addColorStop(1,'rgba('+color+',0)');
    g.fillStyle=glow;g.fillRect(-1,-1,2,2);g.restore();
  }
  function homeLighting(g,w) {
    const win=H.window, curtain=homeCurtains(w), lamps=H.lamps;
    // Quantized weather and curtain pixels keep the light map cached while
    // people move. It contains illumination only: never captured furniture.
    const moon=(1-Math.min(1,w.rain)*.65), weather=Math.round(moon*20)/20;
    const kitchenLit=SCENE.homeKitchenLit(w);
    const key=[curtain,weather,kitchenLit].join(':');
    if(homeLight.key!==key) {
      if(!homeLight.canvas) {homeLight.canvas=document.createElement('canvas');homeLight.canvas.width=960;homeLight.canvas.height=600;}
      const m=homeLight.canvas.getContext('2d');
      m.fillStyle='#ffffff';m.fillRect(0,0,960,600);
      m.fillStyle='#454b65';m.fillRect(128,70,704,H.floorBottom+8-70);
      m.save();
      // The rear utility walls block the living-room lamps. Their unlit
      // fixtures retain just enough cool ambient light to read as silhouettes.
      m.beginPath();m.rect(128,70,704,H.kitchen.y-H.kitchen.wallH-70);
      m.rect(H.bathroom.x+H.bathroom.w,H.kitchen.y-H.kitchen.wallH,
        832-H.bathroom.x-H.bathroom.w,H.floorBottom+8-H.kitchen.y+H.kitchen.wallH);m.clip();
      m.globalCompositeOperation='screen';
      Object.keys(lamps).forEach(id=>{
        const a=lamps[id];
        lightPool(m,a.x,a.y,112,108,'255,201,132',.94);
        lightPool(m,a.x,a.base+12,id==='desk'?77:100,48,'255,190,112',.36);
      });
      // Screen light reaches the keyboard and the face of its seated reader.
      lightPool(m,H.desk.x,H.desk.y-49,54,59,'155,211,228',.6);
      const opening=Math.max(0,win.w-Math.max(0,curtain-5)*2)/win.w;
      lightPool(m,win.x+win.w/2,win.y+win.h-6,110,122,'153,180,229',.48*opening*weather);
      // Four foreshortened panes fall down-left from the moon. The mullions
      // stay dark; the same curtain edge narrows the source and its projection.
      const inset=Math.max(0,curtain-5), left=win.x+inset,right=win.x+win.w-inset;
      const floor=H.wallY+4;
      for(let row=0;row<2;row++) {
        const near=floor+row*39,far=near+35;
        [[left,win.x+62],[win.x+66,right]].forEach(span=>{
          const x0=Math.max(left,span[0]),x1=Math.min(right,span[1]);
          if(x1<=x0)return;
          const offset=row*22;
          const wash=m.createLinearGradient(0,floor,0,floor+78);
          wash.addColorStop(0,'rgba(146,177,224,'+(.3*weather)+')');
          wash.addColorStop(1,'rgba(146,177,224,'+(.08*weather)+')');
          m.fillStyle=wash;m.beginPath();m.moveTo(x0-offset,near);m.lineTo(x1-offset,near);
          m.lineTo(x1-offset-20,far);m.lineTo(x0-offset-20,far);m.closePath();m.fill();
        });
      }
      m.restore();
      if(kitchenLit) {
        const k=H.kitchen;
        m.save();m.beginPath();m.rect(k.x,k.y-k.wallH,k.w,k.h+k.wallH);m.clip();
        m.fillStyle='#eee0be';m.fillRect(k.x,k.y-k.wallH,k.w,k.h+k.wallH);
        m.globalCompositeOperation='screen';
        lightPool(m,k.light.x,k.light.y+58,160,150,'255,201,132',.55);
        m.restore();
      }
      // Exterior and luminous shade/screen surfaces keep their own brightness.
      const gap=Math.max(0,curtain-5);
      m.fillStyle='#ffffff';m.fillRect(win.x+gap,win.y,Math.max(0,win.w-gap*2),win.h);
      Object.keys(lamps).forEach(id=>{const a=lamps[id];m.fillRect(a.x-12,a.y-4,25,12);});
      m.fillStyle='#e1f2ff';m.fillRect(H.desk.x-18,H.desk.y-62,34,19);
      homeLight.key=key;
    }
    g.save();g.globalCompositeOperation='multiply';g.drawImage(homeLight.canvas,0,0);g.restore();
    g.save();g.globalCompositeOperation='screen';
    Object.keys(lamps).forEach(id=>{const a=lamps[id];lightPool(g,a.x,a.y+3,30,24,'255,201,132',.13);});
    lightPool(g,H.desk.x,H.desk.y-52,26,20,'155,211,228',.1);
    g.restore();
  }
  SCENE.drawHome = function(g,w) {
    const story=w.memory.life.homeStory,A=H.story;
    const sleeping=story.sleepStep>=3 && w.barista.pose==='tucked';
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
    if(story.step>=10 || story.step===9 && w.homeAction==='reach') {
      px(g,win.x-15,win.y-10,win.w+30,3,'#5a3d28');
      const width=homeCurtains(w);
      [win.x-5,win.x+win.w+5-width].forEach(x=>{
        px(g,x,win.y-6,width,win.h+18,'#7f8d80');
        for(let k=3;k<width;k+=7) {px(g,x+k,win.y-4,2,win.h+14,'#a2aa91');px(g,x+k+2,win.y,2,win.h+14,'#69796f');}
        px(g,x,win.y+win.h+10,width,3,'#69796f');
      });
    }
    utilityRoom(g,H.kitchen,false); utilityRoom(g,H.bathroom,true);
    const draws=[];
    draws.push({y:H.kitchen.y,draw:g=>utilityBackWall(g,H.kitchen,false)});
    draws.push({y:H.kitchen.y+.1,draw:g=>{
      const a=H.kitchen.light,on=SCENE.homeKitchenLit(w);
      px(g,a.x-12,a.y-4,24,10,'#825638');
      px(g,a.x-10,a.y-3,20,7,on?'#f5dfae':'#b5ada0');
      px(g,a.x-8,a.y+4,16,2,on?'#e8d5b0':'#84958e');
    }});
    draws.push({y:H.bathroom.y,draw:g=>utilityBackWall(g,H.bathroom,true)});
    kitchenDrawables(draws,w); bathroomDrawables(draws);
    [H.kitchen,H.bathroom].forEach(r=>draws.push({y:r.y+r.h,draw:g=>{
      px(g,r.x,r.y+r.h-8,r.w,8,'#b5a18a');
      px(g,r.x,r.y+r.h-12,r.w,4,'#e8dfc9');
      px(g,r.x,r.y+r.h,r.w,4,'#6e4a33');
    }}));
    H.boxes.forEach((b,i)=>draws.push({y:b.y,draw:g=>box(g,b.x,b.y,i===4 && story.step>=6)}));
    if(story.step>=8 || story.step===7 && w.homeAction==='reach')draws.push({y:A.hanger.y,draw:g=>{
      const x=A.hanger.x,y=A.hanger.y, q=story.step===7?Math.min(1,w.homeActionTime/5):1;
      ell(g,x,y+2,17,4,'rgba(20,12,8,.22)');
      px(g,x-17,y-2,34,4,'#5a3d28');px(g,x-2,y-71*q,4,71*q,'#825638');
      if(q>.5) {px(g,x-17,y-65,34,4,'#a8764a');px(g,x-18,y-70,4,8,'#c08a58');px(g,x+14,y-70,4,8,'#c08a58');}
      if(story.step>=8) {px(g,x+5,y-60,13,35,'#647b83');px(g,x+3,y-57,4,22,'#4c5d61');px(g,x+9,y-58,2,30,'#84958e');}
    }});
    if(story.step===9 || story.step===10 && w.barista.y<A.window.y)draws.push({y:A.window.y+1,draw:g=>{
      const x=A.window.x,y=A.window.y;
      px(g,x-12,y-102,4,102,'#a8764a');px(g,x+9,y-102,4,102,'#825638');
      for(let k=0;k<5;k++)px(g,x-12,y-102+k*22,25,4,'#c08a58');
      px(g,x-15,y-104,31,4,'#d5b581');
    }});
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
      px(g,x-3,y-40,5,6,'#3d4a5c'); px(g,x-10,y-35,19,3,'#3d4a5c');
      px(g,x-17,y-32,33,5,'#b8bfc7'); px(g,x-15,y-31,29,2,'#64706d');
      for(let k=0;k<7;k++) px(g,x-14+k*4,y-31,2,1,'#d3d9de');
      px(g,x+21,y-32,5,5,'#b8bfc7');
      if(w.barista.pose==='supperEat')mealPlate(g,x-32,y-32,w.homeMeal.progress<.4?2:w.homeMeal.progress<.8?1:0);
      const a=H.lamps.desk;
      px(g,a.x-2,a.y+3,3,a.base-a.y-3,'#4a3222');
      px(g,a.x-9,a.base-2,18,3,'#825638');
      px(g,a.x-11,a.y-4,21,9,'#e8d5b0');px(g,a.x-13,a.y+4,25,3,'#f5dfae');
    }});
    draws.push({y:H.deskSeat.y-.2,draw:g=>{
      const x=H.deskSeat.x,y=H.deskSeat.y;
      ell(g,x,y+2,19,5,'rgba(20,12,8,.22)');
      px(g,x-2,y-20,4,18,'#64706d');
      px(g,x-15,y-3,30,3,'#3c414d'); px(g,x-2,y-3,4,7,'#64706d');
      px(g,x-17,y-2,5,5,'#2c3038'); px(g,x+12,y-2,5,5,'#2c3038');
      px(g,x-2,y+2,5,4,'#2c3038');
      px(g,x-15,y-27,30,7,'#647b83'); px(g,x-13,y-28,26,3,'#84958e');
      px(g,x-15,y-22,30,3,'#3d4a5c');
    }});
    // The near backrest is a separate depth layer in front of the sitter.
    draws.push({y:H.deskSeat.y+.2,draw:g=>{
      const x=H.deskSeat.x,y=H.deskSeat.y;
      px(g,x-11,y-33,3,13,'#3c414d'); px(g,x+8,y-33,3,13,'#3c414d');
      px(g,x-15,y-42,30,16,'#3d4a5c');
      px(g,x-13,y-44,26,18,'#647b83'); px(g,x-11,y-43,22,2,'#84958e');
      px(g,x-12,y-29,24,3,'#4c5d61');
    }});
    draws.push({y:H.bed.y+H.bed.h,draw:g=>{
      const b=H.bed, x=b.x, y=b.y, width=b.w;
      ell(g,x+width/2,y+b.h-1,width/2+4,8,'rgba(20,12,8,.22)');
      // Headboard sits at the rear floor line, frame tight to the right wall.
      px(g,x-4,y-38,width+8,43,'#5a3d28');
      px(g,x-1,y-35,width+2,34,'#a8764a');
      px(g,x+3,y-31,width-6,25,'#936747');
      px(g,x+7,y-28,width-14,2,'#a8764a');
      px(g,x-4,y-39,width+8,4,'#c08a58');
      // Low timber rails, legs and a visibly thick, rounded mattress edge.
      px(g,x,y+4,width,b.h-6,'#825638');
      px(g,x+3,y+b.h-2,6,8,'#4a3222'); px(g,x+width-9,y+b.h-2,6,8,'#4a3222');
      px(g,x+2,y-5,width-4,b.h-12,'#d9d2c0');
      px(g,x+5,y-8,width-10,b.h-15,'#f5efdf');
      px(g,x+2,y+b.h-24,width-4,12,'#b5ada0');
      px(g,x+4,y+b.h-24,width-8,3,'#e8dfc9');
      // Two soft pillows at the head, duvet running across the whole bed.
      [x+10,x+width/2+4].forEach(p=>{
        px(g,p,y-1,46,18,'#b5ada0'); px(g,p+1,y-3,44,17,'#e8dfc9');
        px(g,p+4,y-5,38,16,'#f5efdf'); px(g,p+6,y+9,34,2,'#d9d2c0');
      });
      px(g,x+4,y+19,width-8,b.h-30,'#7a89a5');
      px(g,x+5,y+17,width-10,10,'#94a1b4');
      px(g,x+8,y+19,width-16,3,'#b8bfc7');
      px(g,x+4,y+b.h-24,width-8,10,'#697892');
      px(g,x+10,y+30,2,28,'#94a1b4'); px(g,x+14,y+48,2,15,'#697892');
      px(g,x+width-15,y+32,3,31,'#697892');
      px(g,x+30,y+57,26,2,'#8492aa');
      px(g,x,y+b.h-12,width,7,'#6e4a33'); px(g,x+2,y+b.h-12,width-4,2,'#a8764a');
      if(!w.barista.reading) { px(g,x+24,y+32,15,10,'#a94f3f'); px(g,x+26,y+34,11,2,'#e8dfc9'); }
    }});
    // Sort the bedside lamp at its own foot, behind the bedside approach.
    draws.push({y:H.lamps.bedside.base,draw:g=>{
      const a=H.lamps.bedside;
      ell(g,a.x,a.base+2,13,3,'rgba(20,12,8,.22)');
      px(g,a.x-2,a.y+7,4,a.base-a.y-7,'#4a3222');
      ell(g,a.x,a.base,11,3,'#6e4a33');
      px(g,a.x-10,a.y-4,21,3,'#d5b581');px(g,a.x-13,a.y-1,27,9,'#e8d5b0');
      px(g,a.x-13,a.y+7,27,3,'#f5dfae');
    }});
    draws.push({y:sleeping || w.barista.pose==='sit' ? H.bed.y+H.bed.h+.1 : w.barista.y,draw:g=>{
      const b=Object.assign({},w.barista,{colors:Object.assign({},w.barista.colors,{apron:false}),bookColor:'#a94f3f'});
      if(sleeping)SCENE.drawBedSleeper(g,b);else SCENE.drawPerson(g,b);
      if(w.homeMeal && w.homeMeal.carrying) {
        const x=Math.round(b.x),y=Math.round(b.y),side=b.facing;
        px(g,x+side*13-3,y-32,6,9,b.colors.top);
        px(g,x+side*17-4,y-26,8,4,b.colors.skin);
        mealPlate(g,x+side*20,y-28,w.homeMeal.stage===1?2:0);
      }
      if(story.step===7 && b.pose==='walk') {px(g,b.x-15,b.y-28,30,3,'#a8764a');px(g,b.x+8,b.y-39,3,28,'#825638');}
      if((story.step===8 || story.step===9) && b.pose==='walk') {px(g,b.x-7,b.y-30,18,13,'#7f8d80');px(g,b.x-4,b.y-27,12,2,'#a2aa91');}
    }});
    draws.push({y:story.sleepStep>=3?H.bed.y+H.bed.h+.2:w.cat.y,draw:g=>SCENE.drawCat(g,w.cat)});
    draws.sort((a,b)=>a.y-b.y); draws.forEach(d=>d.draw(g));
    homeLighting(g,w);
    SCENE.drawCaption(g,w);
    SCENE.drawIntroDialogue(g,w);
    // Only idle departs on this timer. Explicit sleep uses the café dawn fade.
    const t=w.memory.life.homeTime, fade=story.firstNight || story.sleepStep>=0 || w.memory.life.mode === 'game' || w.plannerOpen ? 0 : t<2 ? 1-t/2 : t>88 ? (t-88)/2 : 0;
    if(story.sleepStep===4) {g.globalAlpha=Math.min(1,Math.max(0,(story.sleepTime-1)/3));px(g,0,0,960,600,'#100d14');g.globalAlpha=1;}
    if(fade>0) { g.globalAlpha=fade; px(g,0,0,960,600,'#100d14'); g.globalAlpha=1; }
  };
})();
