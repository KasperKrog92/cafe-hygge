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
  SIM.visitorActors=function(w) {return [w.windowWorker,w.deliveryVisitor,w.shelfVisitor].concat(w.patrons.filter(a=>a.social)).filter(Boolean);};
  SIM.visitorInvites=function(w) {
    if(w.moment || w.shop.phase!=='open' || w.memory.life.mode!=='game')return [];
    return SIM.visitorActors(w).filter(a=>(a.social ? a.state==='seated' && !a.outside :
      a.state!=='leaving' && a.state!=='descending' && !a.mantelLift) && (!a.path || !a.path.length) &&
      !w.memory.flags[a.visitorId+'-introduced']);
  };
  SIM.startVisitor=function(w,id) {
    const a=SIM.visitorInvites(w).find(a=>a.visitorId===id);if(!a)return false;
    const lines=CAST.visitors[id].hello.map(line=>Object.assign({},line));
    if(a.project==='mantel') {
      lines[0].text="I'm Tomas. I've brought the mantel shelf. Shall we give those candles somewhere to stand?";
      lines[2].text="A shelf needs to look as though it's always belonged there. That's the part I like.";
    }
    if(a.social || a.shelfDelivery) {
      if(a.social)lines[0].text=CAST.visitors[id].later;
      else lines[0].text="The little shelves are here. I'm Keira. Is this a good place to set them down?";
      if(id==='keira') {
        lines[1].text="I'm Lunafreya. It's good to have a moment to say hello.";
        lines[2].text="I spend so much time bringing things through doors, I forget I can just walk in.";
      } else {
        lines[1].text="I'm Lunafreya. It's good to see you with a moment to spare.";
        lines[4].text="You're welcome. I can stop for a moment. No tools today.";
        lines.find(line=>line.id==='return').text="I can do that. A cupboard report, with my coffee.";
      }
    }
    let index=0;while(index<lines.length && w.memory.flags[id+'-hello-'+lines[index].id])index++;
    if(index===lines.length)return false;
    if(!SIM.beginMoment(w,lines,a,function(){w.memory.flags[id+'-introduced']=true;}))return false;
    w.moment.visitor=id;w.moment.index=index;return true;
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
  R.updateVisitors=function(w,dt) {
    const p=w.memory.life.projects.table,open=w.shop.phase==='open';
    let a=w.deliveryVisitor;
    // A scheduled kit has not crossed the handoff boundary. Arrived/working
    // saves (including old carried kits) already own it and never redeliver.
    // Give the paired first visits separate space: Tomas finishes and leaves
    // before Keira arrives. Saved repair progress owns the spacing, so reload
    // cannot bunch the arrivals or restart a timer. Neither hello is required.
    const repair=w.memory.life.projects.window;
    if(!w.moment && !a && !w.shelfVisitor && !w.patrons.some(v=>v.visitorId==='keira') && open && p.stage==='scheduled' && !w.windowWorker &&
        ['purchased','scheduled','arrived','working'].indexOf(repair.stage)<0) {
      a=w.deliveryVisitor=R.makeVisitor(w,'keira');a.trolley=true;
      R.makePath(a,L.projects.table.work.x,L.projects.table.work.y);
      R.ringDoor(w);R.caption(w,w.memory.flags['keira-introduced']?
        'Keira is back, steering a table kit through the door.':'Keira brings the table kit in on a little trolley.');
    }
    if(a && (!w.moment || w.moment.owner!==a)) {
      a.animT+=dt;
      if(!open || a.state==='leaving') {
        if(exit(w,a,dt)){w.deliveryVisitor=null;R.ringDoor(w);}
      } else if(a.path && a.path.length)R.walker(a,dt);
      else {
        if(Math.hypot(a.x-L.projects.table.work.x,a.y-L.projects.table.work.y)>1) {
          R.makePath(a,L.projects.table.work.x,L.projects.table.work.y);return;
        }
        a.state='handoff';a.pose='kneel';a.stateT=(a.stateT||0)+dt;
        if(p.stage==='scheduled' && a.stateT>=3) {
          p.stage='arrived';a.trolleyEmpty=true;R.commitLife(w);
          R.caption(w,'the kit is set down, ready for a quiet moment.');
        }
        if(a.stateT>=18)exit(w,a,0);
      }
    }
    updateShelf(w,dt);
  };
  // Called by the shared seat-aware arrival timer. Off duty, the neighbours
  // belong to the ordinary customer lifecycle, including service and closing.
  R.arriveSocialVisitor=function(w) {
    const day=w.memory.life.daysCompleted;
    w.visitorDays=w.visitorDays||{};
    if(w.moment || w.shop.phase!=='open' || day<1)return false;
    return ['keira','tomas'].some(function(id,n) {
      const job=w.memory.life.projects[id==='keira'?'table':'window'];
      if(id==='keira' && ['purchased','scheduled','arrived','working'].indexOf(w.memory.life.projects.bookshelf.stage)>=0)return;
      if(id==='tomas' && ['purchased','scheduled','arrived','working'].indexOf(w.memory.life.projects.mantel.stage)>=0)return;
      if(w.hour<10+n || w.hour>=19 || w.visitorDays[id]===day ||
        ['purchased','scheduled','arrived','working'].indexOf(job.stage)>=0 ||
        SIM.visitorActors(w).some(a=>a.visitorId===id))return;
      const guest=R.makeVisitor(w,id);guest.social=true;guest.kind='patron';
      guest.pianist=false;guest.wantsBook=false;guest.ownBook=false;
      guest.drink=R.DRINKS.find(d=>d.name==='espresso');
      R.enqueueArrival(w,guest,0,true);
      R.caption(w,w.memory.flags[id+'-introduced']?CAST.visitors[id].returning:CAST.visitors[id].arrival);
      return true;
    });
  };
})();
