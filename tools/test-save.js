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
  for (const file of ['improvements', 'audio', 'scene-core', 'scene-waterfront', 'scene-bg', 'scene-furniture', 'scene-people', 'scene-fx', 'characters-roster', 'memory', 'sim-core', 'sim-waterfront', 'sim-patrons', 'sim-shop', 'sim-characters', 'sim-life', 'sim-intro', 'sim-moments', 'sim-gerda', 'sim-visitors', 'sim-home']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), ctx, { filename: file + '.js' });
  }
  return { ctx, data, events, timers, writes: () => writes, prompts: () => prompts,
    run(code) { return vm.runInContext(code, ctx); } };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async function () {
  await test('named conversation progress survives insertion/reordering without repeating acknowledgements or effects', () => {
    const b=boot();b.run(`
      const packets=[CAST.holgerIntroduction,...Object.values(CAST.visitors).map(v=>v.hello),...Object.values(CAST.gerdaWindow)];
      for(const lines of packets) {
        if(lines.some(l=>!l.id)||new Set(lines.map(l=>l.id)).size!==lines.length)throw Error('missing or duplicate authored node ID');
      }
      const packet=CAST.holgerIntroduction.slice();
      const w=SIM.create({random:SIM.seededRandom(42)});SIM.skipUnpacking(w);
      for(let n=0;n<1000&&!SIM.holgerAvailable(w);n++)SIM.update(w,.1);
      for(let n=0;n<6;n++)w.memory.flags['holger-introduction-node-'+packet[n].id]=true;
      w.memory.flags['luna-beginning-new-start']=true;
      const warmth=w.memory.bonds.holger.warmth;
      CAST.holgerIntroduction=[{id:'test-inserted',speaker:'Holger',text:'Test insertion.'},...packet.slice(0,6).reverse(),...packet.slice(6)];
      if(!SIM.startHolger(w)||w.moment.lines[w.moment.index].id!=='test-inserted')throw Error('new node not offered');
      w.moment.visible=999;SIM.advanceMoment(w);
      if(w.moment.lines[w.moment.index].id!=='beginning'||SIM.momentLine(w).text!==packet[6].choices[1].reply)throw Error('acknowledged nodes replayed');
      const saved=w.context.memory.exportText();
      const restored=SIM.create({memory:MEMORY.createStore({state:MEMORY.prepareImport(saved)})});
      if(!SIM.startHolger(restored)||restored.moment.lines[restored.moment.index].id!=='beginning')throw Error('named reload failed');
      for(let n=0;n<200&&restored.moment;n++) {
        if(restored.moment.phase!=='talk'){SIM.update(restored,.25);continue;}
        restored.moment.visible=999;SIM.advanceMoment(restored,SIM.momentLine(restored).choices?0:undefined);
      }
      if(restored.moment||!restored.memory.flags['holger-introduced']||restored.memory.bonds.holger.warmth!==warmth+1)throw Error('completion effects failed');
      if(SIM.startHolger(restored)||restored.memory.bonds.holger.warmth!==warmth+1)throw Error('completion repeated');
      if(!restored.memory.flags['luna-beginning-new-start']||restored.memory.flags['luna-beginning-belonging'])throw Error('choice changed');
      // Variations bind to IDs too, even if their nodes move.
      const other=SIM.create({random:SIM.seededRandom(42)});SIM.skipUnpacking(other);
      for(let n=0;n<1000&&!SIM.holgerAvailable(other);n++)SIM.update(other,.1);
      other.memory.bonds.holger.visits=2;CAST.holgerIntroduction=packet.slice().reverse();
      if(!SIM.startHolger(other)||!other.moment.lines.find(l=>l.id==='sign').text.includes('properly said hello'))throw Error('variation follows position');
      CAST.holgerIntroduction=packet;
    `);
  });
  await test('save transfer validates before replacement and preserves pending writes on failure', () => {
    const b=boot();
    b.run(`
      const original=MEMORY.state;
      original.life.savings=173;original.flags['holger-intro-complete']=true;
      original.life.projects.table={stage:'working',step:2,time:4.5};
      original.arcs.test={stage:1,progress:2,pendingBeat:'finished'};
      original.bonds.holger={known:true,warmth:3,visits:2};
      MEMORY.saveNow();MEMORY.save();
      const exported=MEMORY.exportText(), bytes=localStorage.getItem('cafe-hygge-save');
      const dest=MEMORY.createStore();dest.importText(exported);
      if(dest.exportText()!==exported)throw Error('round trip changed progress');
      for(const raw of ['', 'null', '{}', '{', JSON.stringify({...original,version:999}),
        JSON.stringify({...original,life:{...original.life,savings:-1}}), ' '.repeat(1048577)]) {
        let rejected=false;try{MEMORY.importText(raw)}catch(e){rejected=true}
        if(!rejected||MEMORY.state!==original||localStorage.getItem('cafe-hygge-save')!==bytes)
          throw Error('invalid import replaced current cafe');
      }
      if(MEMORY.prepareImport('\\uFEFF'+exported).life.savings!==173)throw Error('BOM failed');
      const set=localStorage.setItem;localStorage.setItem=()=>{throw Error('blocked')};
      let failed=false;try{MEMORY.importText(exported)}catch(e){failed=true}
      localStorage.setItem=set;
      if(!failed||MEMORY.state!==original||!MEMORY.status.writeError)throw Error('blocked import lost state');
      MEMORY.readOnly=true;failed=false;try{MEMORY.importText(exported)}catch(e){failed=true}
      MEMORY.readOnly=false;if(!failed)throw Error('read-only import succeeded');
    `);
    assert.equal(b.timers.size,1,'failure should retain pending save');
    b.run(`MEMORY.importText(MEMORY.exportText());`);
    assert.equal(b.timers.size,0,'successful import cancels pending save');
    assert.equal(b.run('MEMORY.status.writeError'),null);
  });
  await test('popularity time validates and partial service time survives encoding', () => {
    const b=boot();b.run(`
      for(const n of [-1,11701,NaN,Infinity,undefined]) {
        const s=MEMORY.codec.fresh();s.life.openSeconds=n;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('invalid popularity accepted');
      }
      const s=MEMORY.codec.fresh();s.life.openSeconds=417.25;
      const kept=MEMORY.codec.decode(MEMORY.codec.encode(s)).state;
      if(kept.life.openSeconds!==417.25)throw Error('partial time lost');
      const w=SIM.create({memory:MEMORY.createStore({state:kept})});
      if(w.memory.life.openSeconds!==417.25)throw Error('boot added offline time');
    `);
  });
  await test('development saves: any other version opens a fresh café instead of migrating', () => {
    const b=boot();b.run(`
      for(const v of [1,7,13,MEMORY.VERSION-1,MEMORY.VERSION+1]) {
        const s=MEMORY.codec.fresh();s.version=v;s.flags.kept=true;s.life.savings=147;
        const r=MEMORY.codec.decode(JSON.stringify(s));
        if(!r.error||r.state.flags.kept||r.state.life.savings!==90)throw Error('version '+v+' was not reset');
        let rejected=false;try{MEMORY.prepareImport(JSON.stringify(s))}catch(e){rejected=true}
        if(!rejected)throw Error('import accepted version '+v);
      }
    `);
  });
  await test('new cafes use game mode; saved idle choices survive reload and reset returns to game', () => {
    const b=boot();
    assert.equal(b.run('MEMORY.state.life.mode'), 'game');
    b.run("MEMORY.state.life.mode='idle';MEMORY.saveNow();");
    const restored=boot(b.data.get('cafe-hygge-save'));
    assert.equal(restored.run('MEMORY.state.life.mode'), 'idle');
    restored.run('MEMORY.reset();');
    assert.equal(restored.run('MEMORY.state.life.mode'), 'game');
  });
  await test('dinner, mantel, window-seat and shelf checkpoints validate against the live catalogue', () => {
    const b=boot();b.run(`
      const w=SIM.create({random:SIM.seededRandom(42)});
      w.shop.phase='home';w.memory.life.homeStory=MEMORY.freshHomeStory(true);
      w.memory.life.homeTime=50;SIM._.saveLife(w,0);
      w.memory.life.homeDinner={time:180,done:false};SIM.update(w,.25);
      if(!w.memory.life.homeDinner.done)throw Error('completed timer did not settle');
      MEMORY.codec.validate(w.memory);
      for(const time of [-1,181,NaN]) {
        const s=MEMORY.codec.fresh();s.life.homeDinner.time=time;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('bad dinner timer');
      }
      for(const time of [0,12.25,80]) {
        const s=MEMORY.codec.fresh();s.life.homeDinner={time,done:false};
        if(MEMORY.codec.decode(MEMORY.codec.encode(s)).state.life.homeDinner.time!==time)throw Error('lost dinner time');
      }
      const mantel=MEMORY.codec.fresh();mantel.life.projects.mantel={stage:'installed',step:2,time:0};
      if(!MEMORY.codec.decode(JSON.stringify(mantel)).error)throw Error('early mantel accepted');
      for(const change of [p=>p.time=12,p=>p.step=4,p=>p.stage='installed']) {
        const s=MEMORY.codec.fresh();s.life.projects.windowSeat={stage:'working',step:1,time:5.5};change(s.life.projects.windowSeat);
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('invalid window job accepted');
      }
      for(const step of [0,1,2,3,4]) {
        const s=MEMORY.codec.fresh();s.life.projects.bookshelf={stage:'working',step,time:11.75};
        if(MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('valid shelf work');
        s.life.projects.bookshelf.time=12;
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('invalid shelf work accepted');
      }
    `);
  });
  await test('improvement purchases and work checkpoints retain their contract', () => {
    const b=boot();
    b.run(`
      const ids=['window','table','plant','fireplace'], prices={window:30,table:60,plant:30,fireplace:30};
      for(const first of ids)for(const second of ids) {
        const w=SIM.create({});w.shop.phase='home';w.memory.life.homeStory=MEMORY.freshHomeStory(true);w.memory.life.mode='game';w.memory.life.savings=200;w.memory.flags['fireplace-unlocked']=true;SIM.plan(w,true);
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
          if(result.error||JSON.stringify(result.state)!==JSON.stringify(s))throw Error('checkpoint '+id+'/'+step);
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
  await test('café days, room size, furniture, projects and life fields reject invalid values', () => {
    const b=boot();
    b.run(`
      for(const mutate of [s=>s.life.daysCompleted=-1,s=>s.life.daysCompleted=.5,
        s=>s.life.projects.window.time=18,s=>s.life.projects.window={stage:'installed',step:3,time:0},
        s=>s.life.room='huge',s=>s.life.furniture=null,s=>s.life.furniture=[],s=>s.life.furniture={},
        s=>s.life.furniture={'table-window':true},s=>s.life.savings=-1,s=>s.life.savings=.5,s=>s.life.mode='new',
        s=>s.life.homeTime=91,s=>s.life.hour=24,s=>s.life.plant.stage='other',s=>s.life.plant.time=NaN,
        s=>s.life.checkpoint={}]) {
        var state=MEMORY.codec.fresh();mutate(state);
        if(!MEMORY.codec.decode(JSON.stringify(state)).error)throw Error('invalid life accepted: '+mutate);
      }
      for(const change of [p=>p.time=-1,p=>p.time=18,p=>p.step=1.5,p=>p.step=7,p=>p.stage='other',p=>p.stage='installed',p=>p.step=1]) {
        var s=MEMORY.codec.fresh();change(s.life.projects.table);
        if(!MEMORY.codec.decode(JSON.stringify(s)).error)throw Error('bad project accepted');
      }
      var s=MEMORY.codec.fresh();s.life.projects.table={stage:'working',step:4,time:1.25};
      var r=MEMORY.codec.decode(MEMORY.codec.encode(s));
      if(r.error||r.state.life.projects.table.time!==1.25)throw Error('partial work lost');
    `);
  });
  await test('a new café starts small, sets up two tables and keeps furniture on expansion', () => {
    const b=boot();
    b.run(`var fresh=MEMORY.codec.fresh(),small=SIM.create({memory:MEMORY.createStore({state:fresh})});
      if(small.tables.length||small.seats.length||small.shop.phase!=='settling')throw Error('first arrival skipped');
      for(let i=0;i<4000&&small.shop.phase==='settling';i++)SIM.update(small,.25);
      if(small.tables.length!==2||small.seats.length!==4||small.fire.level!==0||small.shop.phase!=='open')throw Error('first setup failed');
      if(SCENE.room(small).w!==832||SCENE.room(small).floorBottom!==496)throw Error('starting room is full size');
      small.memory.life.room='full';
      if(SCENE.room(small).w!==960||small.tables.length!==2)throw Error('expansion changes furniture');
      var state=MEMORY.codec.fresh();state.life.furniture=MEMORY.furnishings(true);state.life.room='full';state.life.firstOpening={step:12,time:0};
      var full=SIM.create({memory:MEMORY.createStore({state})});
      if(full.seats.length!==18||Object.values(full.memory.life.furniture).some(v=>!v))throw Error('furnished café seats');`);
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
        for(let i=0;i<6500&&r.shop.phase!=='open';i++) {
          if(r.shop.phase==='home')SIM.goToSleep(r);
          SIM.update(r,.25);
        }
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
  await test('round trip preserves story, bond, flag and extra data', () => {
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
