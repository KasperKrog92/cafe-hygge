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
  for (const file of ['audio', 'scene-core', 'scene-waterfront', 'scene-bg', 'scene-furniture', 'scene-people', 'scene-fx', 'characters-roster', 'memory', 'sim-core', 'sim-waterfront', 'sim-patrons', 'sim-shop', 'sim-characters']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), ctx, { filename: file + '.js' });
  }
  return { ctx, data, events, timers, writes: () => writes, prompts: () => prompts,
    run(code) { return vm.runInContext(code, ctx); } };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async function () {
  await test('borrowed covers keep their colors when books return out of order', () => {
    const b = boot();
    b.run(`var w = SIM.create({random:SIM.seededRandom(42)});
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
    b.run(`var original=MEMORY.codec.fresh();original.flags.kept=true;var before=JSON.stringify(original),seen=[];
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
      SIM.beatAt(w,arc.anchor.x,arc.anchor.y+10);if(rec.stage!==1||!w.memory.flags[arc.flag])throw Error('tap');`);
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
