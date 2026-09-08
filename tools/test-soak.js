/* Optional long simulation audit: node tools/test-soak.js [hours per scenario] [modest:42|modest:84|furnished:42|furnished:84].
   Uses shipped scripts and private worlds; no browser, audio or real storage.
   This establishes simulated continuity, not background-browser or memory-leak certification. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const hours = Number(process.argv[2] || 6);
assert(Number.isFinite(hours) && hours >= 1 && hours <= 48, 'Choose 1–48 hours per scenario');
const sandbox = {
  console: Object.assign({}, console, {log(...args) {
    if (!String(args[0]).startsWith('[dev]')) console.log(...args);
  }}),
  structuredClone, URLSearchParams, location: {search: ''},
  saveBytes(value) { return Buffer.byteLength(value, 'utf8'); },
  navigator: {}, document: {hidden: false, addEventListener() {}}, addEventListener() {},
  setTimeout() { throw Error('Private soak scheduled a browser timer'); }, clearTimeout() {},
  localStorage: {getItem() { return null; }, setItem() { throw Error('Private soak wrote storage'); }}
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)) {
  if (match[1] === 'js/main.js') continue; // No DOM/clock drivers in a private simulation.
  vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, {filename: match[1]});
}
sandbox.soakHours = hours;
sandbox.soakScenario = process.argv[3] || 'all';
assert(['all','modest:42','modest:84','furnished:42','furnished:84'].includes(sandbox.soakScenario), 'Unknown scenario');
const result = vm.runInContext(`(() => {
  const reports = [];
  for (const full of [false, true]) for (const seed of [42, 84]) {
    if (soakScenario !== 'all' && soakScenario !== (full?'furnished':'modest')+':'+seed) continue;
    const w = (full ? __dev.furnishedWorld : __dev.modestWorld)({random: SIM.seededRandom(seed)});
    // This unattended run needs automatic nights; new cafes default to game
    // mode, where waiting for the player's bedtime choice is intentional.
    SIM.setMode(w,'idle');
    const startDays = w.memory.life.daysCompleted, startFunds = w.memory.life.savings;
    const startStage = Object.fromEntries(Object.entries(w.memory.arcs).map(([id,a]) => [id,a.stage]));
    const report = {layout:full?'furnished':'modest',seed,hours:soakHours,samples:0,
      maxPatrons:0,maxParticles:0,maxSaveBytes:0,purchases:[],failures:[]};
    let phase = w.shop.phase, phaseSince = w.t, stalled = false;
    const addFailure = message => { if (!report.failures.includes(message) && report.failures.length < 20) report.failures.push(message); };
    for (let i = 0; i < soakHours*3600*4; i++) {
      // Leave the second half for booked work to finish. Buying at the last
      // evening would mistake legitimate unfinished work for a stalled job.
      if (seed === 84 && i < soakHours*3600*2 && w.shop.phase === 'home' && !w.memory.life.plannedTonight) {
        SIM.setMode(w,'game'); SIM.plan(w,true);
        const next = ['window','table','plant','fireplace'].find(id =>
          (id==='plant'?w.memory.life.plant:w.memory.life.projects[id]).stage === 'available');
        if (next && (next==='plant'?SIM.buyPlant(w):SIM.buyProject(w,next))) report.purchases.push(next);
        SIM.setMode(w,'idle');
      }
      SIM.update(w,.25);
      if (phase !== w.shop.phase) { phase = w.shop.phase; phaseSince = w.t; }
      if (w.t-phaseSince > 1800) {
        addFailure('shop stayed in '+phase+' for over 30 simulated minutes'); stalled=true;
        const actor = a => ({name:a.name,state:a.state,x:a.x,y:a.y,path:a.path,walkBlocked:a.walkBlocked,surface:a.surface});
        report.stalledState = {shop:w.shop,barista:actor(w.barista),cat:actor(w.cat),
          patrons:w.patrons.map(actor),orders:w.barista.orders.length,queue:w.queue.map(actor),terrace:w.waterfront.tables};
        break;
      }
      report.maxPatrons = Math.max(report.maxPatrons,w.patrons.length);
      report.maxParticles = Math.max(report.maxParticles,w.particles.length);
      if (i % 240 === 0) {
        report.samples++;
        __dev.audit(w).forEach(addFailure);
        report.maxSaveBytes = Math.max(report.maxSaveBytes, saveBytes(MEMORY.codec.encode(w.memory)));
        if (w.patrons.length>7 || w.captionQueue.length>2) addFailure('unbounded patron/caption population');
        for (const [id,a] of Object.entries(w.memory.arcs))
          if (a.stage !== startStage[id]) addFailure('unattended narrative payoff: '+id);
      }
    }
    report.completedDays = w.memory.life.daysCompleted-startDays;
    report.netCoins = w.memory.life.savings-startFunds;
    report.finalSaveBytes = saveBytes(MEMORY.codec.encode(w.memory));
    report.jobs = Object.fromEntries(Object.entries(w.memory.life.projects).map(([id,p]) => [id,p.stage]));
    if (!stalled && report.completedDays < soakHours) addFailure('too few complete café days');
    report.purchases.forEach(id => {
      if ((id==='plant'?w.memory.life.plant:w.memory.life.projects[id]).stage !== 'installed') addFailure('purchased job never installed: '+id);
    });
    reports.push(report); console.log(JSON.stringify(report));
  }
  return reports;
})()`, context);
assert(result.every(r => !r.failures.length), 'Soak found failures; inspect the scenario reports above');
console.log('PASS '+result.length+' scenarios / '+hours*result.length+' simulated hours');
