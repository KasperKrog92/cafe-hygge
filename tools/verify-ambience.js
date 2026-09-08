/* Real narration events across progression, plus queue lifetime and isolation. */
(function () {
  'use strict';
  const R=SIM._, L=SCENE.L, checks=[], frames={};
  function check(ok,label) { if(!ok)throw Error(label); }
  function clear(w) { w.activeCaption=null;w.captionQueue=[];w.captionScript=[];w.captionRecent=[];w.lastCapT=w.t-10; }
  function say(w,line,options) { clear(w);const accepted=R.caption(w,line,options);R.updateCaptions(w,0);return accepted; }
  function modest() { const w=__dev.modestWorld();clear(w);return w; }
  function fire(w,stage,step) { w.memory.life.projects.fireplace={stage:stage,step:step||0,time:0};w.fire.level=w.fire.target=0.8; }
  const heat={text:'the cat curls up in the warmth of the fire.',requires:['fire']};
  for(const mode of ['game','idle']) {
    const w=modest();SIM.setMode(w,mode);
    for(const stage of ['available','purchased','scheduled','arrived','working']) {
      for(const step of stage==='working'?[0,1,2,3]:[0]) {
        fire(w,stage,step);check(!say(w,heat),mode+' premature fire '+stage+'/'+step);
      }
    }
    fire(w,'installed',4);check(say(w,heat),'installed bare fire silenced');
    check(w.activeCaption.text[0]==='T','capitalized fire');
    check(!say(w,{text:'the mantel clock ticks.',requires:['mantel-decor']}),'bare hearth invented mantel');
    w.windowWorker={project:'mantel'};check(!say(w,heat),'mantel work did not rest narration');w.windowWorker=null;
    w.fire.level=0;check(!say(w,heat),'cold hearth called warm');
    w.memory.life.projects.mantel={stage:'installed',step:3,time:0};
    check(say(w,{text:'a little candlelight on the mantel.',requires:['mantel-decor']}),'installed mantel silenced');
  }
  checks.push('Both modes: unopened, bought, delivered, every reopening phase, bare fire, cold fire, mantel work and installed decoration');

  let w=modest();
  check(!say(w,{text:'the lake glimmers.',requires:['view']}),'boarded view');
  w.memory.life.projects.window={stage:'working',step:3,time:5};
  check(!say(w,{text:'the lake glimmers.',requires:['view']}),'unfinished repair view');
  w.memory.life.projects.window={stage:'installed',step:4,time:0};
  check(say(w,{text:'the lake glimmers.',requires:['view']}),'left view unavailable');
  const p=R.makePatron(w,'Test reader');w.patrons.push(p);p.state='seated';
  p.seat={window:true,x:L.win2.x};
  check(!say(w,{text:'a reader watches the street.',requires:['windowSeat']},{actor:p}),'right boarded window treated as left');
  p.seat.x=L.win.x;check(say(w,{text:'a reader watches the street.',requires:['windowSeat']},{actor:p}),'left seat view');
  w.memory.life.furniture.drapes=true;w.shop.curtains[0]=1;
  check(!say(w,{text:'the lake glimmers.',requires:['view']}),'closed curtains ignored');
  for(const stage of ['purchased','working','installed']) {
    w.memory.life.projects.bookshelf={stage:stage,step:stage==='installed'?5:0,time:0};
    check(!say(w,{text:'a reader browses the books.',requires:['bookshelf']}),'empty shelf made books '+stage);
  }
  const full=__dev.furnishedWorld();check(say(full,{text:'a reader browses the books.',requires:['bookshelf']}),'legacy books unavailable');
  checks.push('Exact repaired window, closed curtains, empty installed shelves and retained legacy books');

  w=modest();
  const cat=w.cat;
  check(say(w,'  “tak,” someone murmurs.'),'quoted caption admission');
  check(w.activeCaption.text==='“Tak,” someone murmurs.','first letter after punctuation');
  check(say(w,'æbler on the counter.'),'accented caption');check(w.activeCaption.text[0]==='Æ','accent capitalization');
  clear(w);check(R.caption(w,'a quiet room.'),'enqueue');check(!R.caption(w,'A quiet room.'),'duplicate queued');
  R.updateCaptions(w,0);check(!R.caption(w,'A quiet room.'),'duplicate active');
  w.t+=7;R.updateCaptions(w,0);check(!R.caption(w,'a quiet room.'),'repeat cooldown');
  w.t+=54;check(R.caption(w,'a quiet room.'),'cooldown never released');
  clear(w);R.caption(w,'a recent event.');w.t+=9;R.updateCaptions(w,0);check(!w.activeCaption,'stale event replay');
  clear(w);R.caption(w,'the cat is sitting.',{actor:cat,holdState:true});cat.state='walk';R.updateCaptions(w,0);check(!w.activeCaption,'queued action outlived state');
  cat.state='sleep';say(w,'the cat is sleeping.',{actor:cat,holdState:true});cat.state='sit';R.updateCaptions(w,0);check(!w.activeCaption,'visible action outlived state');
  fire(w,'installed',4);say(w,heat);w.windowWorker={project:'mantel'};R.updateCaptions(w,0);check(!w.activeCaption,'visible warmth survived work');w.windowWorker=null;
  say(w,'the cat settles.',{actor:cat,when:scene => !scene.shop.carryingCat});
  check(structuredClone(w).activeCaption.text==='The cat settles.','live predicates leaked into art data');
  check(!__dev.study({world:w,seats:[]}).activeCaption,'study retained live captions');
  clear(w);R.caption(w,'an order is ready.');w.shop.phase='home';R.updateCaptions(w,0);check(!w.activeCaption,'café queue entered apartment');
  check(!R.caption(w,'a kettle in the café.'),'home accepted café event');
  check(say(w,'home at last.',{place:'home'}),'home narration missing');
  w.shop.phase='open';R.updateCaptions(w,0);check(!w.activeCaption,'home line entered café');
  clear(w);R.caption(w,'an old morning.');w.memory.life.daysCompleted++;R.updateCaptions(w,0);check(!w.activeCaption,'prior day replay');
  clear(w);R.caption(w,'ordinary ambience.');R.captionRun(w,['a chosen first line.','a chosen second line.']);
  R.updateCaptions(w,0);check(w.activeCaption.text==='A chosen first line.','story priority/case');
  w.t+=7;R.updateCaptions(w,0);check(w.activeCaption.text==='A chosen second line.','story run was dropped');
  w.t+=7;R.updateCaptions(w,0);check(!w.activeCaption,'ambient backlog replayed after story');
  w.moment={phase:'talk'};check(!R.caption(w,'background chatter.'),'conversation chatter admitted');w.moment=null;
  checks.push('Capitalization, deduplication, bounded lifetime, action invalidation, place/day transitions and preserved attended story priority');

  w=modest();const kasper=R.makePatron(w,'Kasper');kasper.regularId='kasper';kasper.state='seated';kasper.seat=w.seats[0];w.patrons.push(kasper);
  const pool=CAST.regulars.find(s=>s.id==='kasper').lines.musing;
  check(!R.pickCaption(w,pool,{actor:kasper}),'writer mused about a closed laptop');
  kasper.laptopActive=true;
  for(let i=0;i<15;i++){const line=R.pickCaption(w,pool,{actor:kasper});check(line && !/matcha|yesterday/.test(line.text),'invented drink/history');}
  const freya=CAST.regulars.find(s=>s.id==='freya');kasper.laptopActive=false;kasper.reading=true;
  check(!R.captionAllowed(w,freya.lines.musing[0],{actor:kasper}),'ordinary chair called armchair');
  check(!R.captionAllowed(w,freya.lines.musing[3],{actor:kasper}),'fire musing before fire');
  const back={text:'a familiar story.',minVisits:3,flags:['holger-introduced']};kasper.regularId='holger';
  w.memory.bonds.holger.visits=2;check(!say(w,back,{actor:kasper}),'premature familiarity');
  w.memory.bonds.holger.visits=3;check(say(w,back,{actor:kasper}),'earned familiarity silenced');
  delete w.memory.flags['holger-introduced'];check(!say(w,back,{actor:kasper}),'unattended introduction assumed');
  checks.push('Character pools follow actual reading, chair, laptop, fire, visits and acknowledged introductions');

  // Exercise the real cat arrival/settling event, rather than only its rule.
  for(const warm of [false,true]) {
    w=modest();if(warm)fire(w,'installed',4);
    w.spawnT=1e8;w.barista.idleT=1e8;w.barista.wateringPending=false;w.barista.candlePending=false;
    let found=false;
    for(let i=0;i<100&&!found;i++) {
      clear(w);Object.assign(w.cat,{state:'walk',intent:'floor',path:[],target:L.catSpots[0],x:L.catSpots[0].x,y:L.catSpots[0].y,surface:'floor'});
      SIM.update(w,.25);
      found=!!w.activeCaption && /cat curls up/.test(w.activeCaption.text);
    }
    check(found,'real cat rest event not observed');
    check(/warmth of the fire/.test(w.activeCaption.text)===warm,'real cat sleep contradicts fireplace');
    w.t+=0.6;R.updateCaptions(w,0);
    check(!__dev.audit(w).length,'cat capture audit: '+__dev.audit(w));
    frames[warm?'bare-fire-caption':'boarded-caption']=__dev.shot(null,{world:w});
  }
  // Long real runs check every displayed ambient line against its live facts.
  let displayed=0;
  for(const furnished of [false,true]) {
    w=furnished?__dev.furnishedWorld():modest();
    for(let i=0;i<2400;i++) {
      SIM.update(w,.25);
      const c=w.activeCaption;
      if(c&&c.ambient) {
        check(R.captionAllowed(w,c.ambient.rule),'soak displayed an ineligible caption: '+c.text);
        check(c.text[0]===c.text[0].toUpperCase(),'soak lowercase caption');displayed++;
      }
      check(w.captionQueue.length<=2,'unbounded queue');
    }
    check(!__dev.audit(w).length,'soak audit: '+__dev.audit(w));
  }
  check(displayed>0,'soak narration was entirely silent');
  checks.push('Real cold/warm cat events, inspected render fixtures and two ten-minute simulation runs');
  window.lifeFrames=frames;return {checks,displayed};
})()
