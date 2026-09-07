/* Café Hygge — one shared life and patient, interruptible projects. */
(function () {
  'use strict';
  const R = SIM._, L = SCENE.L, H = L.home;
  const PLANT = { price: 30, destination: 'cafe', delivery: 'carry', phases: ['scheduled','carry','unpack','place','installed'] };
  SIM.plantProject = PLANT;
  const PROJECTS = SIM.projects = {
    table: { price: 60, destination: 'cafe', delivery: 'carry', title: 'table and chairs',
      phases: ['unpack the kit','lay out the legs','fit the tabletop','assemble the chairs','wipe the wood','position the set'], duration: 18 },
    fireplace: { price: 30, destination: 'cafe', delivery: 'carry', title: 'clean the fireplace',
      phases: ['brush the cooled hearth','gather the ash','wipe the stone','polish the hearth'], duration: 18 }
  };
  function busy(w) { return w.barista.orders.length || w.queue.length || w.shop.phase !== 'open'; }
  function pending(w) {
    // Finish the job already laid out before opening another kit.
    for (const stage of ['working','arrived','scheduled']) {
      const id=Object.keys(PROJECTS).find(id => w.memory.life.projects[id].stage === stage);
      if(id) return id;
    }
    return null;
  }
  R.installProjects = function (w) {
    if (w.memory.life.projects.table.stage !== 'installed' || w.tables.some(t => t.project === 'table')) return;
    const t = L.projects.table, index = w.tables.length;
    w.tables.push({ x:t.x, y:t.y, tag:t.tag, project:'table', furniture:'project-table', items:[], candle:0, candleTarget:0 });
    [-1,1].forEach(side => w.seats.push({x:t.x+side*L.stoolDX,y:t.y+L.stoolDY+4,
      facing:-side,table:index,side:side,armchair:false,taken:false,project:'table',furniture:'project-table'}));
  };
  SIM.buyProject = function (w, id) {
    const l = w.memory.life, d = PROJECTS[id], p = l.projects[id];
    if (!d || !p || !w.plannerOpen || w.shop.phase !== 'home' || l.mode !== 'game' ||
        l.plannedTonight || p.stage !== 'available' || l.savings < d.price) return false;
    l.savings -= d.price; p.stage = 'purchased'; l.plannedTonight = true;
    commit(w); return true;
  };
  function projectHome(w) {
    const b = w.barista;
    b.state = 'projectHome'; b.pose = 'stand'; b.holding = null;
    b.path = [L.baristaHome];
  }
  // Only a three-second hand action is atomic. Travel can turn back at once;
  // completed strokes/fastenings and the current partial stroke live in memory.
  R.updateProject = function (w, dt) {
    const b = w.barista;
    w.projectRest = Math.max(0,(w.projectRest || 0)-dt);
    if (b.state === 'projectHome') {
      if (R.walker(b,dt)) { b.state = 'idle'; b.project = null; w.projectRest = 18; }
      return true;
    }
    if (b.state !== 'projectOut' && b.state !== 'projectWork') return false;
    const id = b.project, p = w.memory.life.projects[id], d = PROJECTS[id];
    if (b.state === 'projectOut') {
      // A carried kit is set down at its reserved site before returning;
      // it must never pop across the room when an order arrives mid-carry.
      if (busy(w) && b.holding !== 'parcel') { projectHome(w); return true; }
      if (!R.walker(b,dt)) return true;
      if (p.stage === 'scheduled') {
        p.stage = 'arrived'; b.holding = 'parcel'; b.path = [L.projects[id].work];
        commit(w); return true;
      }
      p.stage = 'working'; b.holding = null; b.state = 'projectWork'; b.projectSession = 0; commit(w);
    }
    b.pose = id === 'fireplace' ? 'kneel' : 'wipe'; b.heading = 'up'; b.facing = -1;
    const before = p.time;
    // If a stroke ended on the previous frame, an arriving order wins now.
    if (busy(w) && before % 3 < 1e-8) { projectHome(w); return true; }
    p.time = Math.min(d.duration,p.time+dt); b.stateT = p.time;
    b.projectSession += dt;
    const boundary = Math.floor(p.time/3) > Math.floor(before/3);
    if (p.time >= d.duration) {
      p.time = 0; p.step++;
      if (p.step === d.phases.length) {
        p.stage = 'installed'; R.installProjects(w);
        R.caption(w,id === 'table' ? 'another little place to settle, whenever you like.' : 'the hearth is clean; a small fire can glow again.');
        if (id === 'fireplace') R.addLog(w);
      }
      commit(w);
    } else if (boundary) commit(w);
    if (p.stage === 'installed' || (boundary && (busy(w) || b.projectSession >= 9))) projectHome(w);
    return true;
  };
  R.startProject = function (w) {
    const id = pending(w), b = w.barista;
    if (!id || busy(w) || w.projectRest > 0) return false;
    const p = w.memory.life.projects[id];
    b.project = id; b.state = 'projectOut'; b.pose = 'stand'; b.holding = null;
    b.path = [p.stage === 'scheduled' ? L.projects.pickup : L.projects[id].work];
    return true;
  };
  function commit(w) { saveLife(w, 0); w.context.memory.saveNow(); }
  // First arrival is ordinary visible work, held before service. Every step
  // and partial hand action is saved; existing lives migrate past this once.
  const B=L.basic;
  const FIRST = SIM.firstOpeningSteps = [
    {at:L.catCorner.noraSpot,duration:3,pose:'reach',install:'cat-corner',carry:'cat'},
    {at:B.staging,duration:1,pose:'kneel',pickup:true},
    {at:L.umbrellaSpot,duration:3,pose:'kneel',install:'entrance',carry:'parcel'},
    {at:B.staging,duration:1,pose:'kneel',pickup:true},
    {at:{x:B.machine.x+14,y:L.backBar.workY},duration:6,pose:'reach',install:'counter-equipment',carry:'parcel'},
    {at:B.staging,duration:1,pose:'kneel',pickup:true},
    {at:B.pastry,duration:3,pose:'reach',install:'cake-stand',carry:'parcel'},
    {at:B.staging,duration:1,pose:'kneel',pickup:true},
    {at:B.tableWork[0],duration:18,pose:'kneel',install:'table-window',carry:'parcel',table:0},
    {at:B.staging,duration:1,pose:'kneel',pickup:true},
    {at:B.tableWork[1],duration:18,pose:'kneel',install:'table-hearth',carry:'parcel',table:1},
    {at:L.baristaHome,duration:2,pose:'stand'}
  ];
  function installFirstTable(w,index) {
    const t=L.tables[index];
    if(w.tables.some(tb=>tb.furniture===t.furniture))return;
    const ti=w.tables.length;
    w.tables.push({x:t.x,y:t.y,tag:t.tag,furniture:t.furniture,items:[],candle:0,candleTarget:0});
    [-1,1].forEach(side=>w.seats.push({x:t.x+side*L.stoolDX,y:t.y+L.stoolDY+4,facing:-side,
      table:ti,side,armchair:false,taken:false,furniture:t.furniture}));
  }
  R.updateFirstOpening = function(w,dt) {
    const f=w.memory.life.firstOpening,b=w.barista,step=FIRST[f.step];
    if(!step)return;
    b.animT+=dt;w.cat.animT+=dt;
    if(!b.path) { R.makePath(b,step.at.x,step.at.y);b.holding=step.carry||null; }
    if(b.path.length) { R.walker(b,dt);return; }
    b.holding=step.carry==='cat'?'cat':null;b.pose=step.pose;b.heading=step.install==='counter-equipment'?'up':'';b.facing=1;
    const before=f.time;f.time=Math.min(step.duration,f.time+dt);b.stateT=f.time;
    if(Math.floor(before/3)!==Math.floor(f.time/3))commit(w);
    if(f.time<step.duration)return;
    if(step.install)w.memory.life.furniture[step.install]=true;
    if(step.table!==undefined)installFirstTable(w,step.table);
    if(step.install==='cat-corner') {
      w.shop.carryingCat=false;w.cat.x=L.catCorner.cushion.x;w.cat.y=L.catCorner.cushion.y;
      w.cat.state='sleep';w.cat.surface='floor';w.cat.path=null;
    }
    if(step.install==='cake-stand')w.shop.stocked=true;
    if(step.install)R.sound.softThump();
    f.step++;f.time=0;b.path=null;b.pose='stand';b.holding=null;
    if(f.step===FIRST.length) {
      w.shop.phase='open';w.shop.accepting=true;w.shop.carryingCat=false;b.state='idle';b.idleT=2;
      w.spawnT=2;R.caption(w,'two little tables, fresh coffee. the door is open.');
    }
    commit(w);
  };
  function saveLife(w, dt) {
    const l = w.memory.life, b = w.barista;
    l.hour = w.hour;
    l.checkpoint = w.shop.phase === 'open' ? null : {
      shop: JSON.parse(JSON.stringify(w.shop)),
      nora: { x: b.x, y: b.y, path: b.path ? b.path.map(p => ({x:p.x,y:p.y})) : null,
        state: b.state === 'shop' ? 'shop' : 'idle', pose: b.pose, heading: b.heading,
        facing: b.facing, holding: b.holding }
    };
    // A closing reload returns the transient worker safely to the counter;
    // only the durable job is restored, never a stale tool/path ownership.
    if (l.checkpoint && b.state.indexOf('project') === 0) {
      Object.assign(l.checkpoint.nora,{x:L.baristaHome.x,y:L.baristaHome.y,path:null,state:'idle',pose:'stand',holding:null});
    }
    const key = w.shop.phase + ':' + l.plant.stage;
    w.lifeSaveT = (w.lifeSaveT || 0) + dt;
    if (w.lifeSaveKey !== key || w.lifeSaveT >= 10) {
      w.lifeSaveKey = key; w.lifeSaveT = 0; w.context.memory.saveNow();
    }
  }
  R.saveLife = saveLife;
  R.restoreLife = function (w) {
    const l = w.memory.life, c = l.checkpoint;
    R.installProjects(w);
    if (SCENE.hearthWork(w)) { w.fire.level = w.fire.target = 0; w.fire.wantsLog = false; }
    w.clockOffset = (l.hour - w.hour) / 24 * R.DAY_SECONDS;
    R.updateClock(w, 0);
    w.firstEntryReady=true;
    if(l.firstOpening.step<FIRST.length&&!c) {
      w.shop.phase='settling';w.shop.accepting=false;w.shop.stocked=false;w.shop.carryingCat=l.firstOpening.step===0;
      w.barista.x=L.doorSpot.x;w.barista.y=L.doorSpot.y;w.barista.path=null;w.barista.state='shop';
      w.barista.holding=w.shop.carryingCat?'cat':null;
    }
    if (!c) return;
    Object.assign(w.shop, JSON.parse(JSON.stringify(c.shop)));
    Object.assign(w.barista, JSON.parse(JSON.stringify(c.nora)));
    // Transient guests/orders are not saves. Resume rituals with a clear room;
    // a partially brewed cup cannot turn into another paid sale on reload.
    w.patrons = []; w.queue = []; w.counterCups = []; w.umbrellaStand = [];
    w.seats.forEach(s => { s.taken = false; });
    w.tables.forEach(t => { t.items = []; t.candle = t.candleTarget = 0; });
    if (w.shop.phase === 'home') homePose(w);
    else if (w.shop.carryingCat) { w.cat.state = 'sleep'; w.cat.path = null; }
    if (w.shop.task && w.shop.task.kind === 'cat') w.shop.task.called = false;
  };
  SIM.setMode = function (w, mode) {
    if (mode !== 'idle' && mode !== 'game') return false;
    w.memory.life.mode = mode;
    if (mode === 'idle') w.plannerOpen = false;
    commit(w); return true;
  };
  SIM.plan = function (w, open) {
    w.plannerOpen = !!open && w.shop.phase === 'home' && w.memory.life.mode === 'game';
    return w.plannerOpen;
  };
  SIM.goToSleep = function (w) {
    if (w.shop.phase !== 'home' || w.memory.life.mode !== 'game') return false;
    startMorning(w);
    return true;
  };
  SIM.buyPlant = function (w) {
    const l = w.memory.life;
    if (!w.plannerOpen || w.shop.phase !== 'home' || l.mode !== 'game' ||
        l.plannedTonight || l.plant.stage !== 'available' || l.savings < PLANT.price) return false;
    l.savings -= PLANT.price; l.plant.stage = 'purchased'; l.plant.time = 0;
    l.plannedTonight = true;
    commit(w); return true;
  };
  R.enterHome = function (w) {
    w.shop.phase = 'home'; w.shop.elapsed = 0; w.shop.fade = 0;
    w.shop.carryingCat = false; w.memory.life.homeTime = 0;
    w.memory.life.plannedTonight = false;
    w.barista.path = null; w.barista.holding = null; w.barista.state = 'idle';
    w.cat.path = null; w.cat.surface = 'floor'; w.cat.lapPatron = null;
    w.cat.hopQueue = null; w.cat.hopFrom = w.cat.hopTo = null;
    w.activeCaption = null; w.captionQueue = [];
    R.sound.pianoStop();
    homePose(w); R.caption(w, 'home, with a book and a familiar little shadow.'); commit(w);
  };
  // Authored home routes all join the clear lane below desk/boxes/bed. They
  // never invoke the café's furniture planner in this separate room.
  function track(e, t, points) {
    let a = points[0], b = a;
    for (let i = 1; i < points.length; i++) { b = points[i]; if (t < b[0]) break; a = b; }
    const q = a === b ? 0 : Math.min(1, Math.max(0,(t-a[0])/(b[0]-a[0])));
    const moving = a[1].x !== b[1].x || a[1].y !== b[1].y;
    e.x = a[1].x + (b[1].x-a[1].x)*q; e.y = a[1].y + (b[1].y-a[1].y)*q;
    e.facing = b[1].x < a[1].x ? -1 : 1;
    e.heading = b[1].y < a[1].y ? 'up' : b[1].y > a[1].y ? 'down' : '';
    e.pose = moving ? 'walk' : 'stand'; e.walkDistance = t * 36;
    return moving;
  }
  function lane(p) { return {x:p.x,y:H.lane}; }
  function homePose(w) {
    const t = w.memory.life.homeTime, b = w.barista, cat = w.cat;
    track(b,t,[[0,H.entry],[3,H.bag],[7,H.bag],[9,lane(H.bag)], [13,lane(H.deskSeat)],
      [15,H.deskSeat],[33,H.deskSeat],[35,lane(H.deskSeat)],[41,lane(H.bedApproach)], [43,H.bedApproach],
      [45,H.bedSeat],[78,H.bedSeat],[80,H.bedApproach],[82,lane(H.bedApproach)],[88,lane(H.deskSeat)],[90,H.deskSeat]]);
    b.reading = t >= 45 && t < 64; b.dozing = t >= 64 && t < 78;
    b.holding = null; b.state = 'idle';
    b.pcSit = 0;
    if (t >= 15 && t < 33) {
      b.pose = 'pc'; b.heading = 'up'; b.facing = 1;
      b.pcSit = Math.min(1,(t-15)/.7,(33-t)/.7);
    }
    if (t >= 45 && t < 78) { b.pose = 'sit'; b.heading = ''; b.facing = -1; }
    const stops=H.catStops;
    const moving=track(cat,t,[[0,H.entry],[5,stops[0]],[16,stops[0]], [18,lane(stops[0])],
      [29,lane(stops[1])],[31,stops[1]],[42,stops[1]], [44,lane(stops[1])],
      [52,lane(stops[2])],[54,stops[2]],[79,stops[2]],[81,lane(stops[2])],[88,lane(stops[0])],[90,stops[0]]]);
    cat.state = moving ? 'walk' : t >= 54 && t < 79 ? 'sleep' : 'sit';
    cat.surface = 'floor'; cat.target = {id:'home',x:cat.x,y:cat.y,kind:'floor'};
  }
  R.updateHome = function (w, dt) {
    const l = w.memory.life;
    w.barista.animT += dt; w.cat.animT += dt;
    // Arrival happens once. The indoor return joins the desk/box poses at 15s,
    // so waiting evenings repeat continuously without revisiting the entrance.
    const next = l.homeTime + dt;
    l.homeTime = l.mode === 'game' && next >= 90 ? 15 + (next - 90) % 75 : Math.min(90, next);
    homePose(w);
    if (l.homeTime === 45 && w.barista.reading) R.sound.pageTurn();
    if (l.homeTime < 90 || l.mode === 'game') return;
    startMorning(w);
  };
  function startMorning(w) {
    const l = w.memory.life;
    w.plannerOpen = false;
    w.barista.reading = w.barista.dozing = false;
    w.barista.pose = 'stand'; w.barista.holding = 'cat'; w.barista.path = null;
    w.cat.state = 'sleep'; w.cat.path = null;
    w.shop.phase = 'dawn'; w.shop.elapsed = 0; w.shop.fade = 1; w.shop.carryingCat = true;
    w.barista.x = L.doorSpot.x; w.barista.y = L.doorSpot.y;
    if (l.plant.stage === 'purchased') l.plant.stage = 'scheduled';
    Object.keys(PROJECTS).forEach(id => { if (l.projects[id].stage === 'purchased') l.projects[id].stage = 'scheduled'; });
    w.clockOffset += ((7.5-w.hour+24)%24)/24*R.DAY_SECONDS;
    R.updateClock(w,0); commit(w);
  }
  R.workPlant = function (w, dt) {
    const p = w.memory.life.plant, b = w.barista;
    if (p.stage === 'available' || p.stage === 'installed') return true;
    b.animT += dt;
    if (b.path && b.path.length) { R.walker(b,dt); return false; }
    b.state = 'shop';
    if (p.stage === 'scheduled' || p.stage === 'purchased') {
      p.stage = 'carry'; p.time = 0; b.holding = 'parcel';
      b.path = [L.firstPlant.work]; commit(w); return false;
    }
    if (p.stage === 'carry') {
      p.stage = 'unpack'; p.time = 0; b.holding = null; commit(w);
    }
    b.pose = 'reach'; b.heading = ''; b.facing = 1;
    p.time = Math.min(8,p.time+dt); b.stateT = p.time;
    if (p.stage === 'unpack' && p.time >= 4) {
      p.stage = 'place'; p.time = 0; R.sound.swish(); commit(w);
    } else if (p.stage === 'place' && p.time >= 4) {
      p.stage = 'installed'; p.time = 0; b.pose = 'stand'; b.holding = null;
      R.caption(w,'a little green by the window.'); commit(w); return true;
    }
    return false;
  };
})();
