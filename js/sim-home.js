/* Café Hygge — the first evening, and the small journey from PC to pillow. */
(function () {
  'use strict';
  const R=SIM._, H=SCENE.L.home, A=H.story;
  const lane=p=>({x:p.x,y:H.lane});
  // Every route uses apartment anchors, including the bathroom's actual door.
  const tour=SIM.homeTour=[
    {at:H.entry,pose:'gather',duration:3,text:'Home again, little one. Down you go.'},
    {at:A.kitchen,text:'A kitchen of our own. Once I find the plates, we might even have supper here.'},
    {at:A.bathroom,text:'Bathroom. Towels... probably in the box marked books.'},
    {at:H.bedApproach,text:'And a bed. I think that might be my favourite part tonight.'},
    {at:H.bedApproach,pose:'breath',text:'A new city, a new home, and opening a café. All in a few days. No wonder I can barely feel my feet.'},
    {at:A.box,text:'Look at all these boxes. Just one tonight. The rest can wait.'},
    {at:A.box,pose:'kneel',duration:5,text:'Oh. The coat hanger and the curtains. Yes, these will do.'},
    {at:A.hangerWork,pose:'reach',duration:5,text:'Somewhere to hang my coat. One less thing on the floor.'},
    {at:A.box,pose:'gather',duration:3,text:'And these are for the window. A little softer already.'},
    {at:A.ladderTop,via:[lane(A.box),lane(A.window),A.window],pose:'reach',duration:6,text:'There. Now it feels as though someone lives here. Two someones.'},
    {at:H.deskSeat,via:[A.window,lane(A.window),lane(H.deskSeat)],pose:'pc',duration:2},
    {at:H.deskSeat,pose:'pc',text:'I should choose what to do with the café tomorrow. The left window, and another little table.'}
  ];
  const bed=SIM.homeBedtime=[
    {at:A.basin,via:[lane(H.deskSeat),{x:A.bathroom.x,y:H.lane},A.bathroom,A.bathDoor,A.bathLane,A.basinLane],pose:'brushTeeth',duration:8},
    {at:A.window,via:[A.basinLane,A.bathLane,A.bathDoor,A.bathroom,lane(A.bathroom),lane(A.window)],pose:'reach',duration:4},
    {at:H.bedApproach,via:[lane(A.window),lane(H.bedApproach)],pose:'gather',duration:3},
    {at:A.pillow,via:[H.bedSeat],pose:'tucked',duration:5,text:'Goodnight, little one.',whisper:true},
    {at:A.pillow,pose:'tucked',duration:4}
  ];
  function state(w) { return w.memory.life.homeStory; }
  SIM.homeTourActive=w=>w.shop.phase==='home' && state(w).step<tour.length;
  SIM.homeBedtimeActive=w=>w.shop.phase==='home' && state(w).sleepStep>=0;
  SIM.homeSceneActive=w=>SIM.homeTourActive(w) || w.shop.phase==='home' && state(w).sleepStep>=0;
  SIM.homePlanRequired=w=>w.shop.phase==='home' && state(w).firstNight && state(w).step===tour.length && !state(w).planned;
  SIM.finishHomePlan=function(w) {
    const h=state(w),p=w.memory.life.projects;
    if(SIM.homePlanRequired(w) && p.window.stage!=='available' && p.table.stage!=='available') {
      h.planned=true;w.plannerOpen=false;w.memory.life.homeTime=15;
    }
  };
  function route(from,s) {
    if(from.x===s.at.x && from.y===s.at.y)return [from];
    return [from].concat(s.via || [lane(from),lane(s.at)]).concat([s.at]);
  }
  function travel(e,points,time) {
    let left=time*36, distance=0;
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
      if(!len)continue;
      if(left<len) {
        const q=left/len;
        e.x=a.x+(b.x-a.x)*q;e.y=a.y+(b.y-a.y)*q;
        e.facing=b.x<a.x?-1:1;e.heading=b.y<a.y?'up':b.y>a.y?'down':'';
        e.pose='walk';e.walkDistance=distance+left;return false;
      }
      left-=len;distance+=len;
    }
    const end=points[points.length-1];e.x=end.x;e.y=end.y;return true;
  }
  function routeTime(points) { return points.reduce((n,p,i)=>n+(i?Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)/36:0),0); }
  function scene(w) {
    const h=state(w),sleep=h.sleepStep>=0,steps=sleep?bed:tour,index=sleep?h.sleepStep:h.step;
    const s=steps[index];if(!s)return null;
    const from=index?steps[index-1].at:sleep?h.sleepFrom || H.deskSeat:H.entry;
    const points=sleep && index===0?[from].concat(from.x>=H.bed.x?[H.bedApproach,lane(H.bedApproach)]:[lane(from)]).concat(s.via,[s.at]):route(from,s),time=sleep?h.sleepTime:h.time;
    return {h,s,sleep,index,points,time,arrive:routeTime(points)};
  }
  function pose(w) {
    const v=scene(w);if(!v)return;
    const b=w.barista,c=w.cat,q=Math.max(0,v.time-v.arrive);
    b.path=null;b.reading=b.dozing=false;b.pcSit=0;b.holding=null;b.state='idle';
    if(travel(b,v.points,v.time)) {
      b.pose=v.s.pose||'stand';b.stateT=q;b.heading=b.pose==='pc'?'up':'';b.facing=1;
      if(b.pose==='pc')b.pcSit=Math.min(1,q/.7);
      if(b.pose==='brushTeeth')b.facing=-1;
    }
    w.homeAction=q>0?v.s.pose:null;
    w.homeActionTime=q;
    c.path=null;c.surface='floor';c.state='sit';c.heading='';
    // A single cat: she sets it down, then it follows on the same safe route.
    if(!v.sleep && v.index===0) {
      const drop=Math.min(1,v.time/3);
      c.x=b.x+8;c.y=b.y-30+drop*30;c.state='sleep';
    } else {
      const catRoute=!v.sleep && v.index===10?v.points.slice(1):v.points;
      const catPoints=catRoute.map(p=>({x:p.x+18,y:p.y+8}));
      const moving=!travel(c,catPoints,Math.max(0,v.time-.55));
      c.state=moving?'walk':'sit';
      // The cat waits below the ladder, never walks up its rungs.
      if(!v.sleep && (v.index===9 || v.index===10 && v.time<3)) {
        c.x=A.window.x+28;c.y=A.window.y+15;c.state='sit';
      }
      if(v.sleep && v.index>=3) {
        const start={x:H.bedApproach.x+18,y:H.bedApproach.y+8};
        const t=Math.min(1,v.time/3);
        c.x=start.x+(A.catPillow.x-start.x)*t;c.y=start.y+(A.catPillow.y-start.y)*t-Math.sin(t*Math.PI)*18;
        c.state=t<1?'hop':'sleep';
        if(v.index===4) {c.x=A.catPillow.x;c.y=A.catPillow.y;c.state='sleep';}
      }
    }
    c.target={id:'home',x:c.x,y:c.y,kind:'floor'};
  }
  function finishBedtime(w) {
    const h=state(w);
    h.sleepStep=-1;h.sleepTime=0;h.firstNight=false;h.sleepFrom=null;
    w.dialogue=null;w.context.sound.stopDialogue();w.introPaused=false;
    w.homeAction=null;w.homeActionTime=0;R.startMorning(w);
  }
  SIM.skipBedtime=function(w) {
    if(!SIM.homeBedtimeActive(w))return false;
    finishBedtime(w);return true;
  };
  function next(w,v) {
    w.dialogue=null;w.context.sound.stopDialogue();
    if(v.sleep) {v.h.sleepStep++;v.h.sleepTime=0;}
    else {v.h.step++;v.h.time=0;}
    if(v.h.step===tour.length && !v.sleep) {w.plannerOpen=true;w.memory.life.homeTime=15;}
    if(v.h.sleepStep===bed.length) {
      finishBedtime(w);
    } else pose(w);
    R.commitLife(w);
  }
  SIM.advanceHomeDialogue=function(w) {
    if(!SIM.homeSceneActive(w) || w.introPaused || !w.dialogue)return false;
    const d=w.dialogue;
    w.context.sound.stopDialogue();
    if(d.visible<d.text.length)d.visible=d.text.length;
    else {d.finished=true;d.hold=99;}
    return true;
  };
  const oldRestore=R.restoreLife;
  R.restoreLife=function(w) {
    oldRestore(w);
    if(w.shop.phase!=='home')return;
    w.activeCaption=null;w.captionQueue=[];
    if(SIM.homeSceneActive(w))pose(w);
    if(SIM.homePlanRequired(w)) {w.plannerOpen=true;R.homePose(w);}
  };
  const oldEnter=R.enterHome;
  R.enterHome=function(w) {
    oldEnter(w);
    if(SIM.homeTourActive(w)) {w.activeCaption=null;w.captionQueue=[];pose(w);R.commitLife(w);}
  };
  const oldPlan=SIM.plan;
  SIM.plan=function(w,open) {
    if(SIM.homeSceneActive(w))return false;
    if(SIM.homePlanRequired(w)) {w.plannerOpen=true;return true;}
    return oldPlan(w,open);
  };
  SIM.goToSleep=function(w) {
    if(w.shop.phase!=='home' || SIM.homeSceneActive(w) || SIM.homePlanRequired(w) ||
      w.memory.life.mode!=='game' && !state(w).firstNight)return false;
    // Save the start point in the existing checkpoint; first route leads to
    // the clear lane before the bathroom doorway, from any ambient activity.
    state(w).sleepFrom={x:w.barista.x,y:w.barista.y};
    state(w).sleepStep=0;state(w).sleepTime=0;w.plannerOpen=false;w.dialogue=null;w.introPaused=false;
    pose(w);R.commitLife(w);return true;
  };
  const oldHome=R.updateHome;
  R.updateHome=function(w,dt) {
    const h=state(w);
    if(SIM.homeSceneActive(w)) {
      w.activeCaption=null;w.captionQueue=[];
      if(!w.firstEntryReady || w.introHidden || w.introPaused || w.introModal)return;
      if(h.sleepStep>=0)h.sleepTime+=dt;else h.time+=dt;
      w.barista.animT+=dt;w.cat.animT+=dt;pose(w);
      const v=scene(w);if(v.time<v.arrive)return;
      const elapsed=v.time-v.arrive;
      if(v.s.text) {
        if(!w.dialogue)w.dialogue={text:v.s.text,visible:0,clock:0,hold:0,syllable:0};
        const d=w.dialogue;
        const voice=v.s.whisper?Object.assign({},CAST.voices.Lunafreya,{gain:.35,pace:1.3}):CAST.voices.Lunafreya;
        SIM.revealDialogue(w,d,d.text,dt,voice);
        if(d.visible===d.text.length)d.hold+=dt;
        if(!d.finished && d.hold<Math.max(2.8,d.text.length*.045))return;
      }
      if(elapsed>=(v.s.duration||2))next(w,v);
      return;
    }
    if(SIM.homePlanRequired(w)) {w.plannerOpen=true;return;}
    if(h.firstNight) {
      // Both modes wait for the explicit first bedtime. Ordinary later idle
      // evenings retain their automatic rhythm.
      const mode=w.memory.life.mode;w.memory.life.mode='game';
      oldHome(w,dt);w.memory.life.mode=mode;return;
    }
    oldHome(w,dt);
  };
})();
