// The startup idle café opens onto a room already in use: near its occupancy
// target at any boot hour, regulars only once their hour has come, guests
// part-way through ordinary stays, and nobody arriving twice the same day.
(function(){
  const original=window.__world, R=SIM._, create=SIM.create;
  function check(ok,msg){if(!ok)throw Error(msg);}
  // The same boot ?idle&hour= gives: the clock is set inside SIM.create.
  function boot(hour,seed){
    SIM.create=function(){
      const w=create.apply(this,arguments);
      w.clockOffset=0; w.t=((hour-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;
      SIM.update(w,0); R.snapCandles(w); return w;
    };
    try { return SIM.createIdle({random:SIM.seededRandom(seed)}); }
    finally { SIM.create=create; }
  }
  const here=(w,id)=>w.patrons.find(p=>p.regularId===id);
  try {
    const seen={leaving:0,fresh:0,counter:0,steam:0};
    [3,9,12,16,20].forEach(function(hour){
      for(let seed=1;seed<=6;seed++){
        const w=boot(hour,seed), tag=' at '+hour+':00 (seed '+seed+')';
        window.__world=w;
        const target=R.arrivalTarget(w), pop=R.arrivalPopulation(w);
        check(Math.abs(w.hour-hour)<.01,'boot hour lost'+tag);
        check(pop>=target-3 && pop<target,'room not near its target: '+pop+'/'+target+tag);
        check(w.queue.length<=1,'a queue at boot'+tag);
        check(!__dev.audit(w).length,'boot audit: '+__dev.audit(w).join('; ')+tag);
        const seated=w.patrons.filter(p=>p.state==='seated');
        check(seated.length===w.patrons.length-w.queue.length,'a guest neither seated nor at the counter'+tag);
        seated.forEach(function(p){
          check(p.seat && p.seat.taken && p.pose==='sit' && p.stay>0,p.name+' badly seated'+tag);
          check(!p.seat.piano && (!p.seat.artist || p.regularId==='lunafreya'),p.name+' on an activity seat'+tag);
          check(seated.every(q=>q===p || q.seat!==p.seat),'two guests on one seat'+tag);
        });
        // schedules: nobody before their hour, each in the usual place, once
        CAST.regulars.forEach(function(spec){
          const p=here(w,spec.id), r=w.regulars[spec.id];
          if(!p){ check(hour>=spec.arrival.from || r.lastDay!==R.dayIndex(w),spec.id+' marked done before arriving'+tag); return; }
          check(hour>=spec.arrival.from,spec.id+' seated before their hour'+tag);
          check(R.SEAT_PREFS[spec.seat](p.seat),spec.id+' not in the usual seat'+tag);
          check(r.lastDay===R.dayIndex(w),spec.id+' could arrive twice'+tag);
        });
        if(hour===9) check(!w.patrons.some(p=>p.regularId),'a regular in before the first habit'+tag);
        if(hour===12) check(here(w,'holger') && here(w,'gerda') && here(w,'lunafreya') && !here(w,'freya') && !here(w,'kasper'),'wrong faces at noon'+tag);
        if(hour===20) check(here(w,'freya') && here(w,'kasper'),'evening faces missing'+tag);
        const walkIns=seated.filter(p=>!p.regularId);
        seen.leaving+=walkIns.filter(p=>p.stay<=70).length?1:0;
        seen.fresh+=walkIns.filter(p=>p.stay>700).length?1:0;
        seen.counter+=w.queue.length;
        seen.steam+=w.tables.some(t=>t.items.some(it=>it.hot>0))?1:0;
        const stays=walkIns.map(p=>Math.round(p.stay/60));
        check(new Set(stays).size>=Math.min(4,stays.length),'stays not varied'+tag);
        // the first two minutes: no rush at the door, nobody stuck, no double regular
        const ids=new Set(w.patrons.map(p=>p.id)); let maxQ=0, minPop=pop;
        for(let n=0;n<480;n++){
          SIM.update(w,.25); maxQ=Math.max(maxQ,w.queue.length); minPop=Math.min(minPop,R.arrivalPopulation(w));
          if(n<16) check(w.patrons.every(p=>ids.has(p.id)),'the door opened in the first breaths'+tag);
        }
        check(maxQ<=3 && minPop>=target-5,'boot room did not hold: queue '+maxQ+', low '+minPop+tag);
        CAST.regulars.forEach(spec=>check(w.patrons.filter(p=>p.regularId===spec.id).length<=1,'two of '+spec.id+tag));
        check(!__dev.audit(w).length,'audit after two minutes: '+__dev.audit(w).join('; ')+tag);
      }
    });
    check(seen.leaving>=20 && seen.fresh>=20 && seen.steam>=20,'boot rooms lack leavers, fresh arrivals or a steaming cup');
    check(seen.counter>0 && seen.counter<30,'the counter guest is never or always there');
    // The saved game's own boot is untouched: three strangers and Holger.
    const g=__dev.furnishedWorld({random:SIM.seededRandom(5)});
    check(g.patrons.length===4 && g.patrons.filter(p=>p.regularId==='holger').length===1,'game boot seeding changed');
    return {passed:true,checks:'idle boots near target at 3/9/12/16/20; regulars only after their hour, in their seats, once a day; '+
      'varied stays with leavers and fresh cups; at most one at the counter; no door rush; audits clean; game boot unchanged'};
  } finally {SIM.create=create;window.__world=original;}
})()
