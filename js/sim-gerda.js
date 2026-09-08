/* Café Hygge — Gerda finds a warm place beside the water. */
(function () {
  'use strict';
  const R=SIM._,L=SCENE.L;
  SIM.gerdaDeliveryDue=function(w) {
    return !!w.memory.flags['gerda-pillows-accepted'] && !w.memory.flags['gerda-pillow-right'] &&
      w.memory.life.projects.windowSeat.stage==='installed';
  };
  SIM.gerdaMayVisit=function(w) {
    if(!SCENE.windowOpen(w,L.win))return false;
    return ['purchased','scheduled','arrived','working'].indexOf(w.memory.life.projects.windowSeat.stage)<0;
  };
  function chapter(w) {
    const f=w.memory.flags;
    if(f['gerda-window-legacy'])return !f['fireplace-unlocked'] && !SCENE.hasFurniture(w,'hearth') ? 'hearth' : null;
    if(!f['gerda-introduced'])return 'hello';
    if(!f['fireplace-unlocked'] && !SCENE.hasFurniture(w,'hearth'))return 'hearth';
    if(!f['gerda-pillows-accepted'])return 'offer';
    if(f['gerda-pillow-right'] && !f['gerda-window-thanked'])return 'thanks';
    return null;
  }
  SIM.gerdaAvailable=function(w) {
    const part=chapter(w);
    if(w.moment || w.shop.phase!=='open' || !part || !SCENE.windowOpen(w,L.win))return null;
    return w.patrons.find(p=>p.regularId==='gerda' && !p.outside && !p.gerdaDeferred &&
      (part==='thanks' ? p.state==='seated' && p.seat.window && R.SEAT_PREFS.leftWindowPerch(p.seat) :
        p.state==='ordering' || p.state==='seated')) || null;
  };
  SIM.startGerda=function(w) {
    const p=SIM.gerdaAvailable(w),part=chapter(w);if(!p)return false;
    const lines=CAST.gerdaWindow[part].map(line=>Object.assign({},line));
    if(part==='hello' && SCENE.hasFurniture(w,'hearth')) {
      lines.find(l=>l.id==='hearth').text="And you have a working fireplace. A little fire on a cold afternoon is something to look forward to.";
      lines.find(l=>l.id==='hearth-reply').text="I'm glad it's ready. A warm window and a little fire. That sounds like a good afternoon.";
    }
    if(part==='hello' && w.memory.bonds.gerda && (w.memory.bonds.gerda.visits||0)>1)
      lines[0].text="I've been meaning to say a proper hello. I'm Gerda. That clear window caught my eye today.";
    const prefix='gerda-'+part+'-',f=w.memory.flags;
    let index=0;while(index<lines.length && f[prefix+lines[index].id])index++;
    if(index===lines.length)return false;
    if(!SIM.beginMoment(w,lines,p,function() {
      if(part==='hello'||part==='hearth')f['fireplace-unlocked']=true;
      if(part==='thanks')f['gerda-window-thanked']=true;
      else if(part==='hearth')return;
      else {
        if(part==='hello')f['gerda-introduced']=true;
        if(f['gerda-'+part+'-yes'])f['gerda-pillows-accepted']=true;
        else {
          p.gerdaDeferred=true;
          if(part==='offer') {
            lines.forEach(line=>delete f[prefix+line.id]);
            delete f['gerda-offer-later'];
          }
        }
      }
    }))return false;
    w.moment.index=index;w.moment.memoryPrefix=prefix;return true;
  };
  // Accepted gift placement is ordinary work. Each pillow saves separately;
  // reload repeats only the unfinished hand action, never a completed placement.
  SIM.prepareGerdaArrival=function(w,p,ring) {
    if(p.regularId!=='gerda' || !SIM.gerdaDeliveryDue(w))return false;
    p.umbrella=null;p.state='gerdaPillows';p.stateT=0;p.pillowTime=0;
    p.pillowSide=w.memory.flags['gerda-pillow-left']?1:0;
    p.carryingPillows=2-p.pillowSide;
    w.patrons.push(p);
    const site=L.winSeats[p.pillowSide];R.makePath(p,site.x,site.y);
    if(ring)R.ringDoor(w);
    p.doorCloseT=1.1;
    R.caption(w,'Gerda comes through the door with her knitted pillows.');
    return true;
  };
  SIM.updateGerdaPillows=function(w,p,dt) {
    if(p.state!=='gerdaPillows')return false;
    if(w.shop.phase!=='open') {
      p.state='exit';p.stateT=0;p.pose='stand';p.rangBell=false;
      R.makePath(p,L.doorSpot.x,L.doorSpot.y);return true;
    }
    if(p.path && p.path.length){R.walker(p,dt);return true;}
    const site=L.winSeats[p.pillowSide];
    if(Math.hypot(p.x-site.x,p.y-site.y)>1){R.makePath(p,site.x,site.y);return true;}
    p.pose='reach';p.heading='up';p.facing=p.pillowSide===0?-1:1;
    p.pillowTime+=dt;
    if(p.pillowTime<3)return true;
    w.memory.flags[p.pillowSide===0?'gerda-pillow-left':'gerda-pillow-right']=true;
    p.pillowSide++;p.carryingPillows--;p.pillowTime=0;p.pose='stand';
    R.installProjects(w);R.commitLife(w);R.sound.softThump();
    if(p.pillowSide<2) {
      const next=L.winSeats[p.pillowSide];R.makePath(p,next.x,next.y);
    } else {
      // Keep her first place while she orders tea through ordinary service.
      const seat=w.seats.find(s=>R.SEAT_PREFS.leftWindowPerch(s) && !s.taken);
      if(seat){seat.taken=true;p.seat=seat;p.usualSeat=true;}
      p.queueIdx=w.queue.length;w.queue.push(p);p.state='enter';p.stateT=0;
      const slot=R.queueSlot(p.queueIdx);R.makePath(p,slot.x,slot.y);
      R.caption(w,'two soft pillows on the sill; Gerda goes to order her tea.');
    }
    return true;
  };
})();
