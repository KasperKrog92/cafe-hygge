/* Café Hygge — attended conversations, shared by neighbours and story arcs. */
(function () {
  'use strict';
  const prefix='holger-introduction-line-';
  SIM.holgerRequired=function(w) {
    return w.memory.life.firstOpening.step===12 && !w.memory.life.furniture['full-counter'] &&
      !w.memory.flags['holger-introduced'];
  };
  SIM.holgerAvailable=function(w) {
    if(w.moment || w.shop.phase!=='open' || w.memory.flags['holger-introduced'])return null;
    return w.patrons.find(p => p.regularId==='holger' && !p.outside &&
      (p.state==='ordering' || p.state==='seated')) || null;
  };
  SIM.beginMoment=function(w,lines,owner,finish) {
    if(w.moment || w.shop.phase!=='open')return false;
    w.moment={lines:lines,index:0,owner:owner,finish:finish,phase:'waiting',visible:0,clock:0,syllable:0};
    if(w.barista.state==='idle' && !startApproach(w)){w.moment=null;return false;}
    w.activeCaption=null; w.captionQueue=[];
    return true;
  };
  function startApproach(w) {
    const m=w.moment,owner=m.owner;
    const b=w.barista,saved={x:b.x,y:b.y,path:b.path,pose:b.pose,heading:b.heading,facing:b.facing};
    let route=null;
    if(owner && Math.hypot(owner.x-b.x,owner.y-b.y)>85) {
      SIM.withWorld(w,function(){
        const candidates=[];
        if(owner.seat && owner.seat.table>=0)candidates.push(SIM._.busRoute(w,owner.seat.table).slice(-1)[0]);
        [[-48,0],[48,0],[-72,0],[72,0],[0,48],[-48,-48],[48,-48],[0,-48]].forEach(d=>candidates.push({x:owner.x+d[0],y:owner.y+d[1]}));
        for(let n=0;n<candidates.length;n++) {
          const probe=Object.assign({},b),at=candidates[n];
          const room=SCENE.L.rooms[w.memory.life.room];
          if(at.x<22 || at.x>room.w-22 || at.y<SCENE.L.wallY || at.y>room.floorBottom)continue;
          if(w.patrons.concat(SIM.visitorActors(w)).some(p=>!p.outside && Math.hypot(p.x-at.x,p.y-at.y)<28))continue;
          SIM._.makePath(probe,at.x,at.y);
          if(probe.path && probe.path.length){route=probe.path;break;}
        }
      });
      if(!route)return false;
    }
    m.saved=saved;m.phase=route?'approach':'talk';
    if(route)b.path=route;
    else {b.pose='stand';b.heading='';if(owner)b.facing=owner.x>b.x?1:-1;}
    return true;
  }
  SIM.startHolger=function(w) {
    const owner=SIM.holgerAvailable(w);
    if(!owner)return false;
    const lines=CAST.holgerIntroduction.map(line => Object.assign({},line));
    if(w.memory.bonds.holger && (w.memory.bonds.holger.visits||0)>1) {
      lines[0].text="We've shared this room a few times now. I don't think we've properly said hello.";
      lines[1].text="We haven't, have we? I'm glad you've come back.";
      lines[3].text="Lunafreya. It's lovely to meet you properly.";
      lines[14].text="But listen to me, keeping you talking. I'm very glad you've opened, Lunafreya.";
    }
    if(owner.state==='seated')lines[4].text="It's good to have somewhere nearby for an espresso. And a little company.";
    let index=0;
    while(index<lines.length && w.memory.flags[prefix+index])index++;
    index=Math.min(index,lines.length-1);
    if(!SIM.beginMoment(w,lines,owner,function() {
      w.memory.flags['holger-introduced']=true;
      const b=w.memory.bonds.holger || (w.memory.bonds.holger={known:true,warmth:0});
      b.warmth=(b.warmth||0)+1;
    }))return false;
    w.moment.index=index; w.moment.holger=true;
    w.memory.flags['holger-invitation-opened']=true;w.context.memory.saveNow();
    return true;
  };
  SIM.momentLine=function(w) {
    const m=w.moment;
    if(!m)return null;
    const line=m.lines[m.index];
    if(!line)return null;
    if(line.choices) {
      const chosen=line.choices.find(c => w.memory.flags[c.flag]);
      if(chosen)return m.chosenSpeaking?{speaker:'Lunafreya',text:chosen.text}:{speaker:line.replySpeaker || 'Holger',text:chosen.reply};
    }
    return line;
  };
  SIM.advanceMoment=function(w,choice) {
    const m=w.moment;
    if(!m || m.phase!=='talk' || w.introModal || w.momentHidden)return false;
    const line=SIM.momentLine(w);
    w.context.sound.stopDialogue();
    if(m.visible<line.text.length){m.visible=line.text.length;return true;}
    if(line.choices) {
      if(!Number.isInteger(choice) || !line.choices[choice])return false;
      w.memory.flags[line.choices[choice].flag]=true;
      m.chosenSpeaking=true;
    } else if(m.chosenSpeaking) {
      m.chosenSpeaking=false;
    } else {
      if(m.holger)w.memory.flags[prefix+m.index]=true;
      if(m.visitor)w.memory.flags[m.visitor+'-hello-'+m.lines[m.index].id]=true;
      if(m.memoryPrefix)w.memory.flags[m.memoryPrefix+m.lines[m.index].id]=true;
      m.index++;
      if(m.index===m.lines.length) {m.finish();SIM.leaveMoment(w);}
    }
    m.visible=0;m.clock=0;m.syllable=0;
    w.context.memory.save();
    if(m.visitor || m.holger || m.memoryPrefix)w.context.memory.saveNow();
    return true;
  };
  SIM.leaveMoment=function(w) {
    const m=w.moment;if(!m || m.phase==='return')return;
    w.context.sound.stopDialogue();
    const b=w.barista;
    if(m.phase==='waiting'){w.moment=null;return;}
    if(Math.hypot(b.x-m.saved.x,b.y-m.saved.y)<1) {Object.assign(b,m.saved);w.moment=null;return;}
    m.phase='return';
    SIM.withWorld(w,function(){SIM._.makePath(b,m.saved.x,m.saved.y);});
  };
  SIM.updateMoment=function(w,dt) {
    const m=w.moment,b=w.barista;
    if(w.momentHidden || w.introModal){w.context.sound.stopDialogue();return;}
    if(m.phase==='waiting') {
      if(b.state!=='idle')SIM._.updateBarista(w,b,dt);
      if(b.state==='idle' && !startApproach(w))SIM.leaveMoment(w);
      return;
    }
    if(m.phase!=='talk') {
      if(SIM._.walker(b,dt)) {
        if(m.phase==='return'){Object.assign(b,m.saved);w.moment=null;return;}
        m.phase='talk';b.pose='stand';b.heading='';b.facing=m.owner.x>b.x?1:-1;
      }
      return;
    }
    const line=SIM.momentLine(w);
    SIM.revealDialogue(w,m,line.text,dt,CAST.voices[line.speaker]||false);
  };
})();
