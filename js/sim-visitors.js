/* Café Hygge — two working neighbours. Jobs and greetings have separate lives. */
(function () {
  'use strict';
  const R=SIM._, L=SCENE.L;
  R.makeVisitor=function(w,id) {
    const d=CAST.visitors[id],a=R.makePatron(w,d.name);
    Object.assign(a,{kind:'visitor',visitorId:id,nameStyle:d.nameStyle,colors:Object.assign({},d.colors),
      speed:34,pose:'stand',holding:null,bubble:null,state:'arriving',path:null});
    w.visitorDays=w.visitorDays||{};w.visitorDays[id]=w.memory.life.daysCompleted;
    return a;
  };
  SIM.visitorActors=function(w) {return [w.windowWorker,w.deliveryVisitor,w.shelfVisitor].concat(w.expansionCrew||[],w.patrons.filter(a=>a.social)).filter(Boolean);};
  SIM.visitorInvites=function(w) {
    if(w.moment || w.shop.phase!=='open' || w.memory.life.mode!=='game')return [];
    // (Tomas's daughter, on his crew, has no hello of her own yet.)
    return SIM.visitorActors(w).filter(a=>!a.quiet && (a.social ? a.state==='seated' && !a.outside :
      a.state!=='leaving' && a.state!=='descending' && !a.mantelLift) && (!a.path || !a.path.length) &&
      !w.memory.flags[a.visitorId+'-introduced']);
  };
  SIM.startVisitor=function(w,id) {
    const a=SIM.visitorInvites(w).find(a=>a.visitorId===id);if(!a)return false;
    const lines=CAST.visitors[id].hello.map(line=>Object.assign({},line));
    if(a.project==='mantel') {
      lines.find(line=>line.id==='name').text="I'm Tomas. I've brought the mantel shelf. Shall we give those candles somewhere to stand?";
      lines.find(line=>line.id==='precise').text="A shelf needs to look as though it's always belonged there. That's the part I like.";
    }
    if(a.social || a.shelfDelivery) {
      if(a.social)lines.find(line=>line.id==='name').text=CAST.visitors[id].later;
      else lines.find(line=>line.id==='name').text="The little shelves are here. I'm Keira. Is this a good place to set them down?";
      if(id==='keira') {
        lines.find(line=>line.id==='place').text="I'm Lunafreya. It's good to have a moment to say hello.";
        lines.find(line=>line.id==='practical').text="I spend so much time bringing things through doors, I forget I can just walk in.";
      } else {
        lines.find(line=>line.id==='view').text="I'm Lunafreya. It's good to see you with a moment to spare.";
        lines.find(line=>line.id==='welcome').text="You're welcome. I can stop for a moment. No tools today.";
        lines.find(line=>line.id==='return').text="I can do that. A cupboard report, with my coffee.";
      }
    }
    return SIM.beginSavedMoment(w,lines,a,id+'-hello-',function(){w.memory.flags[id+'-introduced']=true;});
  };
  function exit(w,a,dt) {
    if(a.shelfDelivery && a.shelfLift>0) {
      a.state='descending';a.pose='stand';
      a.shelfLift=Math.max(0,a.shelfLift-dt*12);return false;
    }
    if(a.state!=='leaving'){a.state='leaving';a.pose='stand';R.makePath(a,L.doorSpot.x,L.doorSpot.y);}
    return R.walker(a,dt);
  }
  function updateShelf(w,dt) {
    const p=w.memory.life.projects.bookshelf,d=IMPROVEMENTS.projects.bookshelf,
      site=L.projects.bookshelf.work,open=w.shop.phase==='open';
    let a=w.shelfVisitor;
    if(w.moment && (!a || w.moment.owner===a)){if(a)a.animT+=dt;return;}
    if(!a && open && ['scheduled','arrived','working'].indexOf(p.stage)>=0 &&
        !SIM.visitorActors(w).some(v=>v.visitorId==='keira') &&
        w.memory.life.projects.table.stage!=='scheduled') {
      a=w.shelfVisitor=R.makeVisitor(w,'keira');a.shelfDelivery=true;
      a.shelfParcel=p.stage==='scheduled';
      R.makePath(a,site.x,site.y);R.ringDoor(w);
      R.caption(w,p.stage==='scheduled'?(w.memory.flags['keira-introduced']?
        'Keira returns with a small bundle of shelves.':'Keira brings a little shelf kit and her folding steps.'):
        'Keira is back to finish the little wall shelves.');
    }
    if(!a)return;
    a.animT+=dt;
    if(!open || p.stage==='installed' || a.state==='leaving') {
      if(exit(w,a,dt)){w.shelfVisitor=null;R.ringDoor(w);}return;
    }
    if(a.path && a.path.length){R.walker(a,dt);return;}
    if(Math.hypot(a.x-site.x,a.y-site.y)>1){R.makePath(a,site.x,site.y);return;}
    if(p.stage==='scheduled') {p.stage='arrived';a.shelfParcel=false;R.commitLife(w);return;}
    a.state='working';a.pose=p.step===0||p.step===4?'kneel':'reach';a.heading='up';a.facing=1;
    const lift=p.step===3?L.projects.bookshelf.stoolHeight:0,current=a.shelfLift||0;
    if(current!==lift) {
      a.shelfLift=current<lift?Math.min(lift,current+dt*12):Math.max(lift,current-dt*12);
      return; // climbing is transient; reload repeats it before saved hand work
    }
    p.stage='working';const before=p.time;
    p.time=Math.min(d.duration,p.time+dt);a.stateT=p.time;
    if(p.time>=d.duration) {
      p.time=0;p.step++;
      if(p.step===d.phases.length){p.stage='installed';R.caption(w,'three little shelves, waiting for their first books.');}
      R.commitLife(w);
    } else if(Math.floor(before/3)!==Math.floor(p.time/3))R.commitLife(w);
  }
  // Keira's trolley deliveries (improvements with delivery 'keira'), one at a
  // time: the table kit, and the reading chair wrapped in blankets. Each has
  // its own drop site; she kneels to set it down, then leaves.
  const TROLLEY={
    table:{site:()=>L.projects.table.work,first:'Keira brings the table kit in on a little trolley.',
      again:'Keira is back, steering a table kit through the door.',down:'the kit is set down, ready for a quiet moment.'},
    readingChair:{site:()=>L.projects.readingChair.drop,first:'Keira wheels in something large, wrapped in blankets.',
      again:'Keira is back, wheeling in something large and wrapped in blankets.',down:'a wing chair, still in its blankets, waits by the fire.'}
  };
  R.updateVisitors=function(w,dt) {
    const open=w.shop.phase==='open';
    let a=w.deliveryVisitor;
    const id=a?a.delivers:Object.keys(TROLLEY).find(k=>w.memory.life.projects[k].stage==='scheduled');
    const p=id&&w.memory.life.projects[id],site=id&&TROLLEY[id].site();
    // A scheduled kit has not crossed the handoff boundary. Arrived/working
    // saves (including old carried kits) already own it and never redeliver.
    // Give the paired first visits separate space: Tomas finishes and leaves
    // before Keira arrives. Saved repair progress owns the spacing, so reload
    // cannot bunch the arrivals or restart a timer. Neither hello is required.
    const repair=w.memory.life.projects.window;
    if(id && !w.moment && !a && !w.shelfVisitor && !w.patrons.some(v=>v.visitorId==='keira') && open && p.stage==='scheduled' && !w.windowWorker &&
        ['purchased','scheduled','arrived','working'].indexOf(repair.stage)<0) {
      a=w.deliveryVisitor=R.makeVisitor(w,'keira');a.trolley=true;a.delivers=id;
      R.makePath(a,site.x,site.y);
      R.ringDoor(w);R.caption(w,w.memory.flags['keira-introduced']?TROLLEY[id].again:TROLLEY[id].first);
    }
    if(a && (!w.moment || w.moment.owner!==a)) {
      a.animT+=dt;
      if(!open || a.state==='leaving') {
        if(exit(w,a,dt)){w.deliveryVisitor=null;R.ringDoor(w);}
      } else if(a.path && a.path.length)R.walker(a,dt);
      else {
        if(Math.hypot(a.x-site.x,a.y-site.y)>1) {
          R.makePath(a,site.x,site.y);return;
        }
        a.state='handoff';a.pose='kneel';a.stateT=(a.stateT||0)+dt;
        if(p.stage==='scheduled' && a.stateT>=3) {
          p.stage='arrived';a.trolleyEmpty=true;R.commitLife(w);
          R.caption(w,TROLLEY[id].down);
        }
        if(a.stateT>=18)exit(w,a,0);
      }
    }
    updateShelf(w,dt);
    // A promised photograph is taken once the conversation has ended: part
    // of the chosen moment, so it uses the story caption queue.
    w.patrons.forEach(function(a){
      if(!a.photoPending || w.moment)return;
      a.photoPending=false;
      R.captionRun(w,['Keira turns in her chair and takes one quiet photograph of the room.']);
      R.sound.cameraClick();
    });
  };
  // Called by the shared seat-aware arrival timer. Off duty, the neighbours
  // belong to the ordinary customer lifecycle, including service and closing.
  // The neighbour who would drop in off duty now, or null (no side effects).
  R.socialVisitorDue=function(w) {
    const day=w.memory.life.daysCompleted;
    w.visitorDays=w.visitorDays||{};
    if(w.moment || w.shop.phase!=='open' || day<1)return null;
    return ['keira','tomas'].find(function(id,n) {
      const job=w.memory.life.projects[id==='keira'?'table':'window'];
      if(id==='keira' && ['purchased','scheduled','arrived','working'].indexOf(w.memory.life.projects.bookshelf.stage)>=0)return false;
      if(id==='tomas' && ['purchased','scheduled','arrived','working'].indexOf(w.memory.life.projects.mantel.stage)>=0)return false;
      return !(w.hour<10+n || w.hour>=19 || w.visitorDays[id]===day ||
        ['purchased','scheduled','arrived','working'].indexOf(job.stage)>=0 ||
        SIM.visitorActors(w).some(a=>a.visitorId===id));
    }) || null;
  };
  R.arriveSocialVisitor=function(w) {
    const id=R.socialVisitorDue(w);
    if(!id)return false;
    {
      const guest=R.makeVisitor(w,id);guest.social=true;guest.kind='patron';
      guest.pianist=false;guest.wantsBook=false;guest.ownBook=false;
      guest.drink=R.DRINKS.find(d=>d.name==='espresso');
      // A later story is decided at the door, so it never follows the hello
      // on the same visit.
      const due=storyDue(w,id);
      guest.storyChapter=due?due.id:null;
      R.enqueueArrival(w,guest,0,true);
      // The latest remembered story colours their arrival.
      const v=CAST.visitors[id],after=[].concat(v.returningAfter||[]).filter(x=>x.flags.every(f=>w.memory.flags[f])).pop();
      R.caption(w,!w.memory.flags[id+'-introduced']?v.arrival:after?after.text:v.returning);
      return true;
    }
  };
  SIM.addInvitation({ key:a=>a.visitorId, actors:w=>SIM.visitorInvites(w),
    start:(w,a)=>SIM.startVisitor(w,a.visitorId) });
  // Their next story (CAST.visitorStories, in order): Keira's second cup,
  // asking again, her photographs; Tomas's cupboard report, his bread, a
  // frame. One at a time, decided at the door, off duty and seated, game mode.
  function storyDue(w,id) {
    const f=w.memory.flags;
    return [].concat(CAST.visitorStories[id]||[]).find(s=>!f[id+'-'+s.id+'-done'] &&
      s.after.every(x=>f[x]) && !(s.unless||[]).some(x=>f[x])) || null;
  }
  SIM.visitorStoryInvites=function(w) {
    if(w.moment || w.shop.phase!=='open' || w.memory.life.mode!=='game')return [];
    return w.patrons.filter(a=>{
      const s=a.social && a.storyChapter && storyDue(w,a.visitorId);
      return s && s.id===a.storyChapter && a.state==='seated' && !a.outside;
    });
  };
  SIM.startVisitorStory=function(w,id) {
    const a=SIM.visitorStoryInvites(w).find(a=>a.visitorId===id);if(!a)return false;
    const s=storyDue(w,id),books=SCENE.shelfBooks(w).length>0;
    const lines=SIM.contextLines(s.lines,SIM.flagContext(w,s.lines,{books:books,shelves:!books && SCENE.hasFurniture(w,'wall-shelves'),
      boarded:!SCENE.windowOpen(w,L.win)}));
    return SIM.beginSavedMoment(w,lines,a,id+'-'+s.id+'-',function(){
      const f=w.memory.flags;
      f[id+'-'+s.id+'-done']=true;a.storyChapter=null;
      if(s.photo && f['keira-photo-yes'])a.photoPending=true;
      // A handed-over keepsake waits on the counter to be placed (or goes
      // upstairs with her that evening).
      if(s.gift) {
        const job=w.memory.life.projects[s.gift];
        if(job.stage==='available')job.stage='scheduled';
        R.commitLife(w);
      }
    });
  };
  SIM.addInvitation({ key:a=>a.visitorId, actors:w=>SIM.visitorStoryInvites(w),
    start:(w,a)=>SIM.startVisitorStory(w,a.visitorId) });
})();
