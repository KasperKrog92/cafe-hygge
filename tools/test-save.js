/* Deterministic, dependency-free save and simulation regressions. Run with Node. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
function boot(raw) {
  const data = new Map(raw === undefined ? [] : [['cafe-hygge-save', raw]]);
  const events = {}, timers = new Map();
  let timerId = 0, writes = 0, prompts = 0;
  const sandbox = { console, structuredClone,
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    localStorage: {
      getItem(key) { return data.has(key) ? data.get(key) : null; },
      setItem(key, value) { writes++; data.set(key, value); },
      removeItem(key) { data.delete(key); }
    },
    navigator: { storage: { persist() { prompts++; return Promise.resolve(true); } } },
    addEventListener(name, fn) { events[name] = fn; },
    document: { hidden: false, addEventListener(name, fn) { events[name] = fn; } }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const file of ['improvements', 'audio', 'scene-core', 'scene-waterfront', 'scene-bg', 'scene-furniture', 'scene-people', 'scene-fx', 'characters-roster', 'memory', 'sim-core', 'sim-waterfront', 'sim-patrons', 'sim-shop', 'sim-characters', 'sim-life', 'sim-intro', 'sim-visitors', 'sim-home']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), ctx, { filename: file + '.js' });
  }
  return { ctx, data, events, timers, writes: () => writes, prompts: () => prompts,
    run(code) { return vm.runInContext(code, ctx); } };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async function () {
  await test('v9 shelf migration preserves old contents and rejects invalid unpacking', () => {
    const b=boot();b.run(`
      for(const furnished of [false,true]) {
        const old=MEMORY.codec.fresh();old.version=8;delete old.life.projects.bookshelf;
        old.life.furniture.bookshelf=furnished;old.life.savings=137;old.flags['keira-hello-name']=true;
        const result=MEMORY.codec.decode(JSON.stringify(old));
        if(result.error||result.state.version!==9||result.state.life.savings!==137||!result.state.flags['keira-hello-name'])throw Error('v8 lost history');
        if(result.state.life.projects.bookshelf.stage!==(furnished?'installed':'available')||result.state.life.furniture.bookshelf!==furnished)throw Error('library ownership migration');
      }
      for(const step of [0,1,2,3,4]) {
        const s=MEMORY.codec.fresh();s.life.projects.bookshelf={stage:'working',step,time:11.75};
        if(MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('valid shelf work');
        s.life.projects.bookshelf.time=12;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('invalid shelf work accepted');
      }
      const bad=MEMORY.codec.fresh();bad.version=8;delete bad.life.projects.bookshelf;bad.life.projects.window.time=99;
      if(!MEMORY.codec.decode(JSON.stringify(bad)).error)throw Error('invalid historical window accepted');
    `);
  });
  await test('existing improvement purchases and v7 checkpoints retain their contract', () => {
    const b=boot();
    b.run(`
      const ids=['window','table','plant','fireplace'], prices={window:30,table:60,plant:30,fireplace:30};
      for(const first of ids)for(const second of ids) {
        const w=SIM.create({});w.shop.phase='home';w.memory.life.homeStory=MEMORY.freshHomeStory(true);w.memory.life.mode='game';w.memory.life.savings=200;SIM.plan(w,true);
        const buy=id=>id==='plant'?SIM.buyPlant(w):SIM.buyProject(w,id);
        if(!buy(first))throw Error('first purchase '+first);
        const pair=first==='window'&&second==='table'||first==='table'&&second==='window';
        if(buy(second)!==pair)throw Error('evening pair '+first+'/'+second);
        if(w.memory.life.savings!==200-prices[first]-(pair?prices[second]:0))throw Error('debit changed');
        const restored=SIM.create({memory:MEMORY.createStore({state:JSON.parse(MEMORY.codec.encode(w.memory))})});
        if(restored.memory.life.savings!==w.memory.life.savings)throw Error('reload debit');
      }
      // Literal shipped limits deliberately do not derive expectations from the catalogue.
      for(const [id,steps] of [['table',6],['fireplace',4],['window',4]]) {
        for(let step=0;step<steps;step++) {
          const s=MEMORY.codec.fresh();s.life.projects[id]={stage:'working',step,time:17.75};
          const result=MEMORY.codec.decode(JSON.stringify(s));
          if(result.error||JSON.stringify(result.state)!==JSON.stringify(s))throw Error('v7 checkpoint '+id+'/'+step);
        }
        const s=MEMORY.codec.fresh();s.life.projects[id]={stage:'installed',step:steps,time:0};
        if(MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('installed checkpoint '+id);
        s.life.projects[id].step--;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('early installation accepted '+id);
      }
      for(const mode of ['idle','game'])for(const phase of ['open','home'])for(const planner of [false,true]) {
        const w=SIM.create({});w.memory.life.homeStory=MEMORY.freshHomeStory(true);w.memory.life.mode=mode;w.shop.phase=phase;w.plannerOpen=planner;
        if(SIM.buyPlant(w)!==(mode==='game'&&phase==='home'&&planner))throw Error('purchase context');
      }
    `);
  });
  await test('v7 adds café days and left-window work without replaying established lives', () => {
    const b=boot();
    b.run(`for(const finished of [false,true]) {
      var old=MEMORY.codec.fresh();old.version=6;delete old.life.daysCompleted;delete old.life.projects.window;
      old.life.savings=37;old.flags.kept=true;old.bonds.holger={visits:1};
      old.life.projects.table={stage:'working',step:2,time:1.25};
      if(finished){old.life.firstOpening={step:12,time:0};old.life.furniture['table-window']=old.life.furniture['table-hearth']=true;}
      var result=MEMORY.codec.decode(JSON.stringify(old));
      if(result.error||!result.state.flags.kept||result.state.bonds.holger.visits!==1)throw Error('v6 history');
      if(result.state.life.savings!==(finished?37:90)||result.state.life.daysCompleted!==(finished?1:0))throw Error('v6 opening funds/days');
      if(result.state.life.projects.table.time!==1.25||result.state.life.projects.window.stage!=='available')throw Error('v6 jobs');
      old.life.furniture=MEMORY.furnishings(true);old.life.firstOpening={step:12,time:0};
      result=MEMORY.codec.decode(JSON.stringify(old));
      if(result.error||result.state.life.projects.window.stage!=='installed'||result.state.life.daysCompleted!==7||result.state.life.savings!==37)throw Error('existing windows');
    }
    for(const mutate of [s=>s.life.daysCompleted=-1,s=>s.life.daysCompleted=.5,
      s=>s.life.projects.window.time=18,s=>s.life.projects.window={stage:'installed',step:3,time:0}]) {
      var state=MEMORY.codec.fresh();mutate(state);
      if(!MEMORY.codec.decode(JSON.stringify(state)).error)throw Error('invalid v7 accepted');
    }`);
  });
  await test('v5 starts small and preserves every furnished v3 job/history record', () => {
    const b=boot();
    b.run(`var fresh=MEMORY.codec.fresh(),small=SIM.create({memory:MEMORY.createStore({state:fresh})});
      if(small.tables.length||small.seats.length||small.shop.phase!=='settling')throw Error('first arrival skipped');
      for(let i=0;i<4000&&small.shop.phase==='settling';i++)SIM.update(small,.25);
      if(small.tables.length!==2||small.seats.length!==4||small.fire.level!==0||small.shop.phase!=='open')throw Error('first setup failed');
      if(SCENE.room(small).w!==832||SCENE.room(small).floorBottom!==496)throw Error('starting room is full size');
      for(const fullCounter of [false,true]) {
        var v4=MEMORY.codec.fresh();v4.version=4;delete v4.life.room;v4.life.furniture['full-counter']=fullCounter;
        var migrated=MEMORY.codec.decode(JSON.stringify(v4));
        if(migrated.error||migrated.state.life.room!==(fullCounter?'full':'small'))throw Error('v4 room migration');
      }
      small.memory.life.room='full';
      if(SCENE.room(small).w!==960||small.tables.length!==2)throw Error('expansion changes furniture');
      small.memory.life.room='small';
      for(const stage of ['available','purchased','scheduled','arrived','working','installed']) {
        var old=MEMORY.codec.fresh();old.version=3;delete old.life.furniture;
        old.life.savings=173;old.flags.kept=true;old.bonds.gerda={visits:9};
        old.arcs['gerda-scarf']={stage:0,progress:2,pendingBeat:'finished'};
        old.life.projects.table={stage,step:stage==='installed'?6:stage==='working'?3:0,time:stage==='working'?1.25:0};
        var before=JSON.stringify(old),next=MEMORY.codec.decode(before);
        if(next.error||JSON.stringify(old)!==before||next.state.version!==MEMORY.VERSION)throw Error('migration failed');
        if(['table','fireplace'].some(id=>JSON.stringify(next.state.life.projects[id])!==JSON.stringify(old.life.projects[id]))||next.state.life.savings!==173||
           JSON.stringify(next.state.arcs)!==JSON.stringify(old.arcs)||!next.state.flags.kept||next.state.bonds.gerda.visits!==9)throw Error('history lost');
        var full=SIM.create({memory:MEMORY.createStore({state:next.state})});
        if(full.seats.length!==(stage==='installed'?20:18)||Object.values(full.memory.life.furniture).some(v=>!v))throw Error('furniture stripped');
      }
      for(const value of [null,[],{}, {'table-window':true}]) {
        var s=MEMORY.codec.fresh();s.life.furniture=value;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('invalid furniture accepted');
      }`);
  });
  await test('v2 migration retains the apartment and plant; v3 jobs reject invalid progress', () => {
    const b=boot();
    b.run(`var old=MEMORY.codec.fresh();old.version=2;delete old.life.projects;delete old.life.plannedTonight;
      old.life.savings=83;old.life.plant={stage:'place',time:2.5};old.flags.kept=true;
      var next=MEMORY.codec.decode(JSON.stringify(old));
      if(next.error||next.state.version!==MEMORY.VERSION||next.state.life.savings!==83||next.state.life.plant.time!==2.5||!next.state.flags.kept)throw Error('v2 lost life');
      for(const change of [p=>p.time=-1,p=>p.time=18,p=>p.step=1.5,p=>p.step=7,p=>p.stage='other',p=>p.stage='installed',p=>p.step=1]) {
        var s=MEMORY.codec.fresh();change(s.life.projects.table);
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('bad project accepted');
      }
      var s=MEMORY.codec.fresh();s.life.projects.table={stage:'working',step:4,time:1.25};
      var r=MEMORY.codec.decode(MEMORY.codec.encode(s));
      if(r.error||r.state.life.projects.table.time!==1.25)throw Error('partial work lost');`);
  });
  await test('v1 migration retains history and rejects malformed life data', () => {
    const b = boot();
    b.run(`var s=MEMORY.codec.fresh();delete s.life;s.version=1;
      s.flags.kept=true;s.bonds.gerda={known:true,visits:7};
      s.arcs.kept={stage:2,progress:8,pendingBeat:'finished'};
      var out=MEMORY.codec.decode(JSON.stringify(s));
      if(out.error||!out.state.flags.kept||out.state.bonds.gerda.visits!==7||out.state.arcs.kept.stage!==2||out.state.life.savings!==30)throw Error('v1 migration');
      for(const change of [l=>l.savings=-1,l=>l.savings=.5,l=>l.mode='new',l=>l.homeTime=91,l=>l.hour=24,l=>l.plant.stage='other',l=>l.plant.time=NaN,l=>l.checkpoint={}]) {
        var x=MEMORY.codec.fresh();change(x.life);
        if(!MEMORY.codec.decode(JSON.stringify(x)).error)throw Error('invalid life accepted');
      }`);
  });
  await test('every shop boundary restores, and work/purchase never repeats', () => {
    const b=boot();
    b.run(`var w=SIM.create({random:SIM.seededRandom(84)}), captured={};
      w.memory.flags['holger-introduced']=true;w.memory.life.homeStory=MEMORY.freshHomeStory(true);
      w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
      for(let i=0;i<6500;i++) {
        SIM.update(w,.25);
        if(w.shop.phase!=='open'&&!captured[w.shop.phase])captured[w.shop.phase]=MEMORY.codec.encode(w.memory);
        if(w.shop.phase==='home'&&w.memory.life.plant.stage==='available') {
          SIM.setMode(w,'game');SIM.plan(w,true);if(!SIM.buyPlant(w)||SIM.buyPlant(w))throw Error('purchase');SIM.plan(w,false);SIM.goToSleep(w);
        }
        if(w.shop.phase==='open'&&w.memory.life.plant.stage==='installed')break;
      }
      for(const phase of ['closing','leaving','night','home','dawn','entering','opening']) {
        if(!captured[phase])throw Error('missing '+phase);
        var r=SIM.create({memory:MEMORY.createStore({state:JSON.parse(captured[phase])})});
        if(r.shop.phase!==phase)throw Error('phase reset');
        var funds=r.memory.life.savings;
        for(let i=0;i<6500&&r.shop.phase!=='open';i++)SIM.update(r,.25);
        if(r.shop.phase!=='open'||r.memory.life.savings!==funds)throw Error('reload '+phase);
      }
      if(w.memory.life.plant.stage!=='installed')throw Error('plant not installed');`);
  });
  await test('borrowed covers keep their colors when books return out of order', () => {
    const b = boot();
    b.run(`var state=MEMORY.codec.fresh();state.life.furniture=MEMORY.furnishings(true);state.life.room="full";state.life.firstOpening={step:12,time:0};
      var w = SIM.create({random:SIM.seededRandom(42),memory:MEMORY.createStore({state})});
      w.patrons = [];
      var readers = [{}, {}, {}];
      readers.forEach(function(p) { SIM._.borrowBook(w, p); w.patrons.push(p); });
      var colors = readers.map(function(p) { return p.bookColor; });
      if (new Set(colors).size !== 3) throw Error('Loan colors repeat before shelf is empty');
      readers[0].hasShelfBook = false;
      var next = {}; SIM._.borrowBook(w, next);
      if (next.bookColor !== colors[0]) throw Error('Returned book was not available');
      if (readers[1].bookColor !== colors[1] || readers[2].bookColor !== colors[2])
        throw Error('Remaining books changed color');`);
  });
  await test('v1 round trip preserves story, bond, flag and extra data', () => {
    const b = boot();
    b.run(`var s = MEMORY.codec.fresh(); s.lastSeen = 123;
      s.arcs.story = {stage: 1, progress: 2.5, pendingBeat: 'finished'};
      s.bonds.gerda = {known:true, warmth:2, visits:3, lastDay:100};
      s.flags.kept = true; s.extra = {note:'keep'};
      var raw = MEMORY.codec.encode(s);
      if (MEMORY.codec.encode(MEMORY.codec.decode(raw).state) !== raw) throw Error('round trip');`);
  });
  await test('malformed roots, versions, records and finite integer fields fall back', () => {
    const b = boot();
    b.run(`var bad = ['{', '[]', 'null', 'true', '{}', '"save"', ''];
      [99, 0, -1, 1.5, null, '1', NaN, Infinity].forEach(v => {var s=MEMORY.codec.fresh();s.version=v;bad.push(JSON.stringify(s));});
      ['arcs','bonds','flags'].forEach(k => {var s=MEMORY.codec.fresh();s[k]=[];bad.push(JSON.stringify(s));});
      for (const k of ['arcs','bonds']) {var s=MEMORY.codec.fresh();s[k].bad=[];bad.push(JSON.stringify(s));}
      for (const stage of [-1, 0.5, '1', null]) {var s=MEMORY.codec.fresh();s.arcs.bad={stage,progress:0,pendingBeat:null};bad.push(JSON.stringify(s));}
      for (const raw of bad) {var out=MEMORY.codec.decode(raw);if(!out.error || JSON.stringify(out.state)!==JSON.stringify(MEMORY.codec.fresh()))throw Error(raw);}
      for(const value of [NaN,Infinity,-Infinity]) {
        for(const key of ['stage','progress']) {var s=MEMORY.codec.fresh();s.arcs.bad={stage:0,progress:0,pendingBeat:null};s.arcs.bad[key]=value;
          var threw=false;try {MEMORY.codec.encode(s);}catch(e){threw=true;}if(!threw)throw Error(key+' '+value);}
      }
      for(const lastSeen of [null,-1,'now']){var s=MEMORY.codec.fresh();s.lastSeen=lastSeen;if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('lastSeen');}
      var s=MEMORY.codec.fresh();s.flags.bad=[];if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('flag');
      s=MEMORY.codec.fresh();s.bonds.bad={visits:0.1};if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('visits');
      if(MEMORY.codec.decode(null).error)throw Error('missing save');`);
  });
  await test('migration ladder runs every explicit step and rejects gaps or wrong versions', () => {
    const b = boot();
    b.run(`var original=MEMORY.codec.fresh();original.version=1;original.flags.kept=true;var before=JSON.stringify(original),seen=[];
      var c=MEMORY.createCodec(3,{
        1:s=>{seen.push(1);s.version=2;s.extra='preserved';return s;},
        2:s=>{seen.push(2);s.version=3;return s;}
      });
      var result=c.migrate(original);
      if(result.version!==3||!result.flags.kept||result.extra!=='preserved'||seen.join()!=='1,2'||JSON.stringify(original)!==before)throw Error('migration');
      for(const steps of [{},{1:s=>{s.version=2;return s;}},{1:s=>s},{1:s=>{s.version=3;return s;}},{1:s=>[]}]) {
        if(!MEMORY.createCodec(3,steps).decode(before).error)throw Error('accepted broken ladder');
      }`);
  });
  await test('blocked reads/writes, invalid encoding and persistence failures are observable and nonfatal', async () => {
    const b = boot();
    b.run(`var store=MEMORY.createStore({storage:{getItem(){throw Error('read blocked');},setItem(){throw Error('write blocked');},removeItem(){throw Error('remove blocked');}},persist(){return Promise.reject(Error('persist rejected'));}});
      if(!store.status.loadError)throw Error('read diagnostic');store.saveNow();if(!store.status.writeError)throw Error('write diagnostic');store.reset();if(!store.status.writeError)throw Error('reset diagnostic');store.requestPersist();
      var sync=MEMORY.createStore({persist(){throw Error('sync');}});sync.requestPersist();if(!sync.status.persistError)throw Error('sync diagnostic');`);
    await Promise.resolve(); await Promise.resolve();
    assert.equal(b.run('store.status.persistError'), 'persist rejected');
    b.run(`MEMORY.state.arcs.bad={stage:NaN,progress:0,pendingBeat:null};MEMORY.saveNow();if(!MEMORY.status.writeError)throw Error('encode diagnostic');`);
    assert.equal(b.writes(), 0);
  });
  await test('pagehide and hidden flush a pending beat immediately; reset cancels old timers', () => {
    const b = boot();
    b.run(`MEMORY.state.flags.immediate=true;MEMORY.save();MEMORY.save();`);
    assert.equal(b.timers.size, 1); assert.equal(b.writes(), 0);
    b.events.pagehide();
    assert.equal(b.timers.size, 0); assert.equal(JSON.parse(b.data.get('cafe-hygge-save')).flags.immediate, true);
    b.run(`MEMORY.state.flags.hidden=true;MEMORY.save();document.hidden=true;`);
    b.events.visibilitychange();
    assert.equal(JSON.parse(b.data.get('cafe-hygge-save')).flags.hidden, true);
    b.run('MEMORY.save(); MEMORY.reset();');
    assert.equal(b.timers.size, 0); assert.equal(b.data.has('cafe-hygge-save'), false);
  });
  await test('pending invitations and completed scarf/gallery marks survive real storage reload', () => {
    const b = boot();
    b.run(`var w=SIM.create();var scarf=CAST.arcs.find(a=>a.id==='gerda-scarf');
      w.memory.arcs[scarf.id]={stage:1,progress:scarf.rows,pendingBeat:null};w.memory.flags[scarf.flag]=true;
      var gallery=CAST.arcs.find(a=>a.id==='lunafreya-paintings');
      w.memory.arcs[gallery.id]={stage:2,progress:12,pendingBeat:null};gallery.flag.forEach(f=>w.memory.flags[f]=true);
      var pending=CAST.arcs.find(a=>a.anchor);w.memory.arcs[pending.id]={stage:0,progress:pending.rows,pendingBeat:'finished'};
      MEMORY.save();`);
    b.events.pagehide();
    const reloaded = boot(b.data.get('cafe-hygge-save'));
    reloaded.run(`var w=SIM.create();
      if(!w.cat.scarf||w.memory.arcs['lunafreya-paintings'].stage!==2)throw Error('completed marks');
      var arc=CAST.arcs.find(a=>a.anchor),rec=w.memory.arcs[arc.id];
      if(rec.pendingBeat!=='finished'||rec.stage!==0)throw Error('pending boot');
      SIM.update(w,.25);if(rec.stage!==0||rec.pendingBeat!=='finished')throw Error('autoplay');
      SIM.skipIntro(w);for(let n=0;n<8000&&w.shop.phase==='settling';n++)SIM.update(w,.25);
      SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);for(let n=0;n<1000&&w.moment;n++){if(w.moment.phase==='talk')SIM.advanceMoment(w);else SIM.update(w,.25);}if(rec.stage!==1||!w.memory.flags[arc.flag])throw Error('tap');`);
    reloaded.events.pagehide();
    const completed = boot(reloaded.data.get('cafe-hygge-save'));
    completed.run(`var w=SIM.create(),arc=CAST.arcs.find(a=>a.anchor);if(w.memory.arcs[arc.id].pendingBeat!==null||w.memory.arcs[arc.id].stage!==1)throw Error('completed reload');`);
  });
  await test('production defaults persist; interleaved private worlds touch no live state, audio, timers or random source', () => {
    const b = boot();
    b.run(`var live=SIM.create();window.__world=live;MEMORY.saveNow();
      function snapshot(w) {var seen=new Map();return JSON.stringify(w,function(k,v){if(v&&typeof v==='object'){if(seen.has(v))return {ref:seen.get(v)};seen.set(v,seen.size);}return v;});}
      var originalRandom=Math.random;Math.random=()=>{throw Error('global random used');};
      Object.keys(SND).forEach(k=>{if(typeof SND[k]==='function')SND[k]=()=>{throw Error('live sound used: '+k);};});
      var liveBefore=JSON.stringify(live),saveBefore=JSON.stringify(MEMORY.state),audioBefore=JSON.stringify(SND.settings);
      var a=SIM.create({random:SIM.seededRandom(42)}),firstBefore=JSON.stringify(a),second=SIM.create({random:SIM.seededRandom(42)});
      if(a.memory===second.memory||a.memory===live.memory||a.memory.lastSeen!==0)throw Error('shared save/stamp');
      for(var i=0;i<320;i++)SIM.update(second,.25);
      if(JSON.stringify(a)!==firstBefore)throw Error('first changed');
      for(var i=0;i<320;i++)SIM.update(a,.25);
      if(snapshot(a)!==snapshot(second))throw Error('seeded repeatability');
      if(JSON.stringify(live)!==liveBefore||JSON.stringify(MEMORY.state)!==saveBefore||JSON.stringify(SND.settings)!==audioBefore)throw Error('live changed');
      if(structuredClone(a).context)throw Error('art clone services');
      var threw=false;try{SIM.withWorld(a,()=>{throw Error('scope test');});}catch(e){threw=true;}
      if(!threw)throw Error('exception swallowed');
      var restored=false;try{SIM._.random();}catch(e){restored=e.message==='global random used';}if(!restored)throw Error('context not restored');
      Math.random=originalRandom;`);
    assert.equal(b.writes(), 1); assert.equal(b.prompts(), 1); assert.equal(b.timers.size, 0);
  });
  await test('world save cadence and cat departure are independent of the global world', () => {
    const b = boot();
    b.run(`var writesA=0,writesB=0,storeA=MEMORY.createStore(),storeB=MEMORY.createStore();
      storeA.save=()=>writesA++;storeB.save=()=>writesB++;
      storeA.state.life.furniture=MEMORY.furnishings(true);storeA.state.life.room="full";storeA.state.life.firstOpening={step:12,time:0};
      storeB.state.life.furniture=MEMORY.furnishings(true);storeB.state.life.room="full";storeB.state.life.firstOpening={step:12,time:0};
      var a=SIM.create({memory:storeA}),b=SIM.create({memory:storeB});writesA=writesB=0;
      SIM._.updateNarrative(a,59);SIM._.updateNarrative(b,1);
      if(writesA||writesB)throw Error('shared cadence');SIM._.updateNarrative(a,1);
      if(writesA!==1||writesB!==0)throw Error('cadence');
      window.__world=a;var before=JSON.stringify(a);var p=b.patrons[0];b.cat.lapPatron=p;b.cat.surface='lap';b.cat.lapStand={x:p.x+30,y:p.y};p.lapCat=true;
      SIM.dislodgeCat(b,p);if(p.lapCat||b.cat.lapPatron||JSON.stringify(a)!==before)throw Error('global cat');
      var invalid=b.memory.arcs['gerda-scarf'];invalid.stage=Infinity;invalid.progress=NaN;invalid.pendingBeat=[];
      SIM._.reconcileNarrative(b);if(invalid.stage!==0||invalid.progress!==0||invalid.pendingBeat!==null)throw Error('reconcile');`);
  });
  console.log(passed + ' save/isolation regression groups passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
