/* Slow spells at the counter (sim-counter.js): on a quiet afternoon Lunafreya
   reads on her stool at the till, does the crossword only after Calandra's
   letter, makes a coffee of her own (the old shop mug when it lives
   downstairs, never in two places at once) and rests her chin in her hand.
   Every habit gives way at once to a guest, a conversation, approved work
   and closing; she carries her book back rather than letting it vanish. */
(function(){
  'use strict';
  const frames={},checks=[],R=SIM._,L=SCENE.L;
  function check(ok,msg){if(!ok)throw Error(msg);}
  function tick(w,s){for(let t=0;t<s;t+=.25)SIM.update(w,.25);}
  const HABIT=['stoolOut','stoolSit','stoolUp','mugFetch','ownPull','ownSip','ownCupAway','lean'];
  function inHabit(w){return HABIT.indexOf(w.barista.state)>=0;}
  // A modest café at a chosen hour whose guests have gone and chores are done.
  function setHour(w,hour){w.clockOffset=0;w.t=((hour-R.START_HOUR+24)%24)/24*R.DAY_SECONDS;w.lastCapT=w.t-10;SIM.update(w,0);R.snapCandles(w);}
  function quietWorld(seed,hour,flags){
    const w=__dev.modestWorld({random:SIM.seededRandom(seed)});
    Object.assign(w.memory.flags,flags||{});
    setHour(w,hour);w.shop.accepting=false;
    for(let n=0;n<4*900;n++){
      // Seated guests finish up now, so the afternoon is still the afternoon.
      w.patrons.forEach(p=>{if(p.state==='seated')p.stay=Math.min(p.stay,0);});
      SIM.update(w,.25);const b=w.barista;
      if(n>40&&!w.patrons.length&&!w.queue.length&&b.state==='idle'&&!b.candlePending&&!b.wateringPending&&!R.needsTableClear(w))return w;
    }
    throw Error('the café never went quiet');
  }
  function force(w,name){const b=w.barista;for(let i=0;i<80&&b.state!=='idle';i++)SIM.update(w,.25);b.forcedTask=name;b.idleT=0;}
  function until(w,f,s,msg){for(let t=0;t<s;t+=.25){if(f())return;SIM.update(w,.25);}if(!f())throw Error(msg);}
  const crop={x:660,y:205,w:110,h:80,scale:4};

  // 1. Left alone, a slow afternoon brings her to the stool with a book.
  let w=quietWorld(3,13),b=w.barista,seen={};
  for(let t=0;t<600&&!(b.state==='stoolSit'&&b.low===1);t+=.25){SIM.update(w,.25);seen[b.state]=1;
    if(b.state==='stoolOut'&&b.path&&b.path.length)check(b.holding==='book','walked to the stool without the book');}
  check(b.state==='stoolSit'&&b.reading&&b.stool&&!b.crossword,'no reading on a quiet afternoon: '+Object.keys(seen));
  check(b.x===L.counterStool.x&&b.y===L.counterStool.y&&b.pose==='sit'&&b.facing===-1,'not seated at the till');
  check(!b.holding,'book both held and open');
  for(let t=0;t<20&&!(b.pageTurn>0);t+=.25)SIM.update(w,.25);
  check(b.pageTurn>0,'she never turns a page');
  frames['stool-read']=__dev.shot(crop,{world:w});
  check(!__dev.audit(w).length,'audit while reading: '+__dev.audit(w).join('; '));
  checks.push('a quiet afternoon: she carries her book to the stool at the till, sits, and turns pages');

  // 2. A guest comes in: she stands before they reach the counter, carries the
  // book back, then serves them.
  w.shop.accepting=true;w.spawnT=.2;
  until(w,()=>w.queue.length,300,'no guest came');
  const queued=w.t;until(w,()=>b.pose!=='sit',2,'still seated after a guest joined the queue');
  check(b.state==='stoolUp'&&b.holding==='book'&&!b.reading,'the book vanished instead of being carried');
  until(w,()=>R.customerAtCounter(w)||b.orders.length,120,'guest never reached the counter');
  check(b.low===0,'still low when the guest reached the counter');
  until(w,()=>b.state==='prepping',60,'never made the guest\'s order');
  check(b.holding!=='book'&&w.t-queued<60,'the book went into service');
  checks.push('a guest joins the queue: she stands at once, carries the book back and serves them');

  // 3. A conversation: the stool gives way to the approach.
  w=quietWorld(4,13);b=w.barista;force(w,'read');
  until(w,()=>b.state==='stoolSit'&&b.low===1,30,'forced read did not sit');
  w.memory.life.mode='game';
  const owner={x:300,y:420,id:-7,seat:null};
  check(SIM.beginMoment(w,[{speaker:'Lunafreya',text:'Hello.'}],owner,function(){}),'a moment could not begin while she read');
  until(w,()=>w.moment.phase!=='waiting',20,'moment waited forever on the stool');
  check(!b.reading&&b.pose!=='sit','still reading in a conversation');
  SIM.leaveMoment(w);until(w,()=>!w.moment,30,'moment never returned');
  checks.push('a conversation begins: she leaves the stool before walking over');

  // 4. Approved work comes first: a pending project blocks every habit.
  w=quietWorld(5,13);b=w.barista;
  const job=w.memory.life.projects.fireplace;job.stage='scheduled';
  for(let t=0;t<240;t+=.25){SIM.update(w,.25);check(!inHabit(w),'a slow-spell habit while work was pending: '+b.state);if(job.stage==='installed')break;}
  checks.push('pending improvement work is never put off for a book or a coffee');

  // 5. Closing: reading at the end of the day hands over to the closing ritual.
  w=quietWorld(6,13);b=w.barista;setHour(w,21.35);force(w,'read');
  until(w,()=>b.state==='stoolSit',30,'no evening reading');
  until(w,()=>w.shop.phase==='home',900,'closing deadlocked on the stool');
  check(!b.reading&&!b.stool&&!b.crossword,'reading carried home as café state');
  checks.push('closing time: she stands, and closing reaches home');

  // 6. The crossword waits for Calandra's letter.
  let crosswords=0,reads=0;
  w=quietWorld(7,12);b=w.barista;
  for(let t=0;t<560;t+=.25){SIM.update(w,.25);check(!b.crossword,'crossword before Calandra\'s letter');}
  for(let seed=7;seed<13&&!(crosswords&&reads);seed++){
    w=quietWorld(seed,12,{'home-calandra-done':true});b=w.barista;
    let was='';
    for(let t=0;t<560;t+=.25){SIM.update(w,.25);
      if(b.state==='stoolSit'&&was!=='stoolSit'){if(b.stoolKind==='crossword')crosswords++;else reads++;}was=b.state;
      if(b.crossword&&b.low===1&&!frames['stool-crossword'])frames['stool-crossword']=__dev.shot(crop,{world:w});}
  }
  check(crosswords>0&&reads>0,'after the letter both book and crossword should appear: '+crosswords+'/'+reads);
  w=quietWorld(13,14,{'home-calandra-done':true});b=w.barista;
  force(w,'crossword');until(w,()=>b.crossword&&b.low===1,40,'forced crossword');
  until(w,()=>b.thinking,20,'never thinks with the pencil at her chin');
  frames['stool-crossword-thinking']=__dev.shot(crop,{world:w});
  checks.push('the crossword appears only after Calandra\'s letter ('+crosswords+' crosswords, '+reads+' books)');

  // 7. A coffee of her own: a plain cup, or the old shop mug from its place.
  w=quietWorld(8,13);b=w.barista;force(w,'coffee');
  let brewed=false;
  until(w,()=>{if(b.state==='ownPull'&&b.pulled&&w.brew.active&&w.brew.stage==='pull')brewed=true;return b.state==='ownSip'&&!(b.path&&b.path.length)&&b.facing===-1;},40,'no coffee');
  check(brewed&&b.holding==='cup'&&!b.mugOut,'plain coffee without a shot or cup');
  until(w,()=>b.armUp>.9,20,'never sips');
  frames['own-coffee-sip']=__dev.shot(crop,{world:w});
  until(w,()=>b.state==='idle',60,'coffee never finished');
  check(!b.holding,'cup kept after coffee');
  w=quietWorld(9,13,{'luna-mug-cafe':true});b=w.barista;force(w,'coffee');
  const spot=L.oldMug.basic.x+2;
  for(let t=0;t<90;t+=.25){SIM.update(w,.25);
    check(!b.mugOut||b.holding==='mug','mug neither on the back bar nor in her hand');
    if(b.state==='ownSip'&&b.armUp>.9&&!frames['old-mug-sip'])frames['old-mug-sip']=__dev.shot(crop,{world:w});
    if(b.state==='idle'&&t>2)break;}
  check(b.state==='idle'&&!b.mugOut&&!b.holding,'the mug did not go back to its place');
  check(frames['old-mug-sip'],'never sipped from the old mug');
  // A guest arriving mid-coffee: the mug goes back to its own place first.
  force(w,'coffee');until(w,()=>b.state==='ownSip'&&!(b.path&&b.path.length),60,'second coffee');
  w.shop.accepting=true;w.spawnT=.2;until(w,()=>w.queue.length,300,'no guest mid-coffee');
  until(w,()=>!b.mugOut,20,'mug never put back when a guest came');
  check(Math.abs(b.x-spot)<=1,'mug set down away from its place: x '+b.x);
  checks.push('her own coffee: shot at the machine, sips at the till; the old mug leaves and returns to its place, even when a guest comes');

  // 8. Chin in hand, until someone needs her.
  w=quietWorld(10,13);b=w.barista;force(w,'lean');
  until(w,()=>b.leaning,20,'never leans');
  frames['chin-in-hand']=__dev.shot(crop,{world:w});
  w.shop.accepting=true;w.spawnT=.2;until(w,()=>w.queue.length,300,'no guest while leaning');
  SIM.update(w,.25);check(!b.leaning&&b.state!=='lean','still leaning with a guest in the queue');
  checks.push('chin in hand, ending as soon as a guest arrives');

  // 9. A long ordinary day: habits happen, captions stay capitalised and sparse,
  // the audit stays clean and nobody waits on a book.
  w=__dev.modestWorld({random:SIM.seededRandom(12)});Object.assign(w.memory.flags,{'home-calandra-done':true,'luna-mug-cafe':true});setHour(w,9);
  const starts={};let prev='',caps=0,last=null;
  for(let t=0;t<1200&&w.shop.phase!=='home';t+=.25){SIM.update(w,.25);b=w.barista;
    if(b.state!==prev&&HABIT.indexOf(b.state)>=0)starts[b.state]=(starts[b.state]||0)+1;prev=b.state;
    if(R.customerAtCounter(w)&&w.queue[0].state==='ordering')check(b.pose!=='sit','a guest ordering while she sat');
    const c=w.activeCaption;if(c&&c!==last){last=c;if(/^Lunafreya (pulls her stool|perches|reads one|folds the|does the|taps|fills|finishes|drinks|pulls a|has a|rests|leans|turns a|marks)/.test(c.text))caps++;
      check(/^[A-Z]/.test(c.text),'lowercase caption: '+c.text);}
    if(t%60===0){const a=__dev.audit(w);check(!a.length,'audit: '+a.join('; '));}}
  check(starts.stoolSit>0,'no reading in a whole day: '+JSON.stringify(starts));
  check(caps<=30,'slow-spell captions too frequent: '+caps);
  checks.push('a whole ordinary day: '+JSON.stringify(starts)+', '+caps+' habit captions');
  window.counterFrames=frames;return {checks};
})()
